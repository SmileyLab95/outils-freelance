/*
 * Comptes en ligne : appels à l'API et synchronisation chiffrée de l'Espace (documentation/23-serveur-et-connexion.md,
 * § 3). Le coffre est déchiffré et fusionné sur l'appareil (engines/compte-crypto.js, engines/espace-sync.js) ; le
 * serveur ne voit jamais le contenu. L'état du compte de l'appareil (identifiant, clé non exportable, dernière version
 * synchronisée et son contenu) est gardé par EspaceStore (IndexedDB).
 */
(function () {
  "use strict";
  var OFE = window.OFE, S = window.EspaceStore;
  if (!OFE || !OFE.compteCrypto || !OFE.espaceSync || !S) return;
  var C = OFE.compteCrypto, SYNC = OFE.espaceSync;
  var API = window.OF_API || "/api/v1", META = "compte";

  function Failure(code, extra) { var e = new Error(code); e.code = code; e.extra = extra || {}; return e; }

  /** Appel de l'API : { status, body } ; erreur « network » si le serveur ne répond pas. */
  function api(method, path, body, headers) {
    var h = Object.assign({ "X-OF-Request": "1" }, body !== undefined ? { "Content-Type": "application/json" } : {}, headers || {});
    return fetch(API + path, { method: method, credentials: "include", headers: method === "GET" ? {} : h,
      body: body !== undefined ? JSON.stringify(body) : undefined })
      .catch(function () { throw Failure("network"); })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
          return { status: res.status, body: data };
        });
      });
  }
  /** Appel qui doit réussir (2xx) : sinon erreur portant le code renvoyé par le serveur. */
  function call(method, path, body, headers) {
    return api(method, path, body, headers).then(function (r) {
      if (r.status >= 200 && r.status < 300) return r.body;
      throw Failure(r.status === 401 ? "unauthorized" : (r.body && r.body.error) || "server", r.body || {});
    });
  }

  var state = function () { return S.getMeta(META); };
  var saveState = function (st) { return S.setMeta(META, st); };
  var forget = function () { return S.deleteMeta(META); };

  // Ce qui est partagé entre appareils : tout sauf les réglages de l'appareil et la date d'enregistrement locale.
  function shared(data) {
    var out = Object.assign({}, data);
    delete out.settings; delete out.savedAt;
    return out;
  }

  /** Premier appareil : clé du compte créée et enveloppée par le code, envoyée au serveur, puis première synchronisation. */
  function setup(me, codeBytes) {
    return C.createAccountKey(codeBytes).then(function (created) {
      return call("PUT", "/keys", created.keys, { "If-Match": "0" }).then(function () {
        return saveState({ accountId: me.id, email: me.email, key: created.key, base: null, baseVersion: 0, lastSync: null, conflicts: [] });
      });
    }).then(sync);
  }

  /** Nouvel appareil : enveloppe reçue du serveur, ouverte avec le code ; puis synchronisation. */
  function unlock(me, codeBytes) {
    return call("GET", "/keys").then(function (keys) {
      return C.openAccountKey(codeBytes, keys);
    }).then(function (key) {
      return saveState({ accountId: me.id, email: me.email, key: key, base: null, baseVersion: 0, lastSync: null, conflicts: [] });
    }).then(sync);
  }

  var running = null;
  /**
   * Synchronise l'Espace de l'appareil avec le coffre : lit la version du serveur, déchiffre et fusionne si elle a
   * changé, réécrit si le résultat diffère, en précisant la version lue (un autre appareil a écrit entre-temps :
   * nouvel essai, trois au plus). Renvoie { version, pushed, conflicts }.
   */
  function sync() {
    if (running) return running;
    running = state().then(function (st) {
      if (!st || !st.key) throw Failure("no_key");
      return attempt(st, 0);
    });
    running.then(clear, clear);
    return running;
  }
  function clear() { running = null; }

  function attempt(st, n) {
    if (n >= 3) return Promise.reject(Failure("busy"));
    return Promise.all([api("GET", "/vault"), S.load()]).then(function (r) {
      var res = r[0], local = r[1];
      if (res.status === 401) throw Failure("unauthorized");
      if (res.status !== 200 && res.status !== 404) throw Failure((res.body && res.body.error) || "server");
      var remote = res.status === 200 ? res.body : null;
      if (remote && remote.version < st.baseVersion) throw Failure("rollback");   // le serveur renverrait une version plus ancienne
      var remoteData = !remote ? null : remote.version === st.baseVersion ? Promise.resolve(st.base)
        : C.decryptVault(st.key, remote, st.accountId);
      return Promise.resolve(remoteData).then(function (remoteData) {
        var merged = SYNC.merge(st.base, local, remoteData, { uid: S.uid });
        var version = remote ? remote.version : 0;
        var next = shared(merged.data);
        var changed = !remote || SYNC.canonical(next) !== SYNC.canonical(shared(SYNC.migrate(remoteData)));
        var push = changed
          ? C.encryptVault(st.key, next, st.accountId, version + 1).then(function (vault) {
              return api("PUT", "/vault", vault, { "If-Match": String(version) });
            })
          : Promise.resolve({ status: 200, body: { version: version } });
        return push.then(function (put) {
          if (put.status === 409) return attempt(st, n + 1);
          if (put.status === 401) throw Failure("unauthorized");
          if (put.status !== 200) throw Failure((put.body && put.body.error) || "server");
          var done = { version: put.body.version, pushed: changed, conflicts: merged.conflicts };
          var after = Object.assign({}, st, { base: next, baseVersion: done.version, lastSync: new Date().toISOString(), conflicts: merged.conflicts });
          // État du compte d'abord (ce qui est sur le serveur), puis l'Espace fusionné (réglages de l'appareil gardés),
          // sauf si l'Espace a été modifié pendant la synchronisation : nouvelle fusion depuis ce qui vient d'être envoyé.
          return saveState(after).then(function () { return S.load(); }).then(function (now) {
            if (now.savedAt !== local.savedAt) return attempt(after, n + 1);
            return S.save(merged.data, "sync").then(function () { return done; });
          });
        });
      });
    });
  }

  // ----- Clés d'accès (WebAuthn) : conversions entre l'API (base64url) et le navigateur (ArrayBuffer) -------------

  var bytes = function (b64) { return C.fromB64(b64).buffer; };
  var text = function (buf) { return C.toB64(new Uint8Array(buf)); };
  var passkeysSupported = function () { return !!(window.PublicKeyCredential && navigator.credentials); };

  function addPasskey(name) {
    return call("POST", "/passkeys/options").then(function (o) {
      return navigator.credentials.create({ publicKey: {
        challenge: bytes(o.challenge), rp: o.rp, user: { id: bytes(o.user.id), name: o.user.name, displayName: o.user.displayName },
        pubKeyCredParams: o.pubKeyCredParams, timeout: o.timeout, attestation: o.attestation,
        authenticatorSelection: o.authenticatorSelection,
        excludeCredentials: o.excludeCredentials.map(function (c) { return { type: c.type, id: bytes(c.id) }; })
      } });
    }).catch(function (e) { throw e && e.code ? e : Failure("passkey_cancelled"); }).then(function (cred) {
      return call("POST", "/passkeys", { name: name, credential: { id: cred.id, rawId: text(cred.rawId), type: cred.type,
        response: { clientDataJSON: text(cred.response.clientDataJSON), attestationObject: text(cred.response.attestationObject) } } });
    });
  }

  function signInWithPasskey() {
    return call("POST", "/auth/passkey/options").then(function (o) {
      return navigator.credentials.get({ publicKey: { challenge: bytes(o.challenge), rpId: o.rpId, timeout: o.timeout,
        userVerification: o.userVerification, allowCredentials: [] } });
    }).catch(function (e) { throw e && e.code ? e : Failure("passkey_cancelled"); }).then(function (cred) {
      return call("POST", "/auth/passkey", { credential: { id: cred.id, rawId: text(cred.rawId), type: cred.type, response: {
        clientDataJSON: text(cred.response.clientDataJSON), authenticatorData: text(cred.response.authenticatorData),
        signature: text(cred.response.signature), userHandle: cred.response.userHandle ? text(cred.response.userHandle) : null } } });
    });
  }

  window.OFCompte = { api: api, call: call, state: state, forget: forget, setup: setup, unlock: unlock, sync: sync,
                      addPasskey: addPasskey, signInWithPasskey: signInWithPasskey, passkeysSupported: passkeysSupported };
})();
