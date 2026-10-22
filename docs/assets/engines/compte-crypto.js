/*
 * Moteur : chiffrement des comptes en ligne, sur l'appareil (WebCrypto). Code de récupération (128 bits, alphabet
 * Crockford, 2 caractères de contrôle), clé du compte (AES-GCM 256) enveloppée par une clé dérivée du code (HKDF-SHA-256),
 * coffre chiffré (JSON compressé, AES-GCM, données associées : compte et version). Spécification :
 * documentation/23-serveur-et-connexion.md, § 3. Testé par tests/unit/compte-crypto.test.mjs (WebCrypto de Node).
 * Le serveur ne reçoit que la clé enveloppée et le coffre chiffré : sans le code ni un appareil connecté, il ne peut
 * rien lire.
 */
(function (root, factory) {
  var api = factory(root.crypto);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).compteCrypto = api;
})(typeof self !== "undefined" ? self : globalThis, function (webcrypto) {
  "use strict";

  var subtle = webcrypto && webcrypto.subtle;
  var ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";   // Crockford : sans I, L, O, U
  var WRAP_INFO = "of-compte-wrap-v1", VAULT_TAG = "of-vault-v1";
  var enc = new TextEncoder(), dec = new TextDecoder();

  function CodeError(code) { var e = new Error(code); e.code = code; return e; }

  // ----- base64url ----------------------------------------------------------------------------------------------

  function toB64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromB64(text) {
    var s = atob(String(text).replace(/-/g, "+").replace(/_/g, "/"));
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  var random = function (n) { return webcrypto.getRandomValues(new Uint8Array(n)); };

  // ----- Code de récupération ----------------------------------------------------------------------------------

  /** 16 octets → 26 caractères (130 bits, les 2 premiers nuls). */
  function encode128(bytes) {
    var bits = "00";
    for (var i = 0; i < bytes.length; i++) bits += ("0000000" + bytes[i].toString(2)).slice(-8);
    var out = "";
    for (var j = 0; j < bits.length; j += 5) out += ALPHABET[parseInt(bits.slice(j, j + 5), 2)];
    return out;
  }
  function decode128(text) {
    var bits = "";
    for (var i = 0; i < text.length; i++) bits += ("0000" + ALPHABET.indexOf(text[i]).toString(2)).slice(-5);
    if (bits.slice(0, 2) !== "00") throw CodeError("character");
    var out = new Uint8Array(16);
    for (var j = 0; j < 16; j++) out[j] = parseInt(bits.slice(2 + j * 8, 10 + j * 8), 2);
    return out;
  }
  /** Contrôle : 10 premiers bits de SHA-256 des 16 octets, en 2 caractères (détecte une faute de frappe). */
  function checksum(bytes) {
    return subtle.digest("SHA-256", bytes).then(function (h) {
      var d = new Uint8Array(h), n = (d[0] << 2) | (d[1] >> 6);
      return ALPHABET[n >> 5] + ALPHABET[n & 31];
    });
  }
  var group = function (text) { return text.match(/.{1,4}/g).join("-"); };

  /** Texte d'un code (16 octets) : 7 groupes de 4 caractères (« 0A1B-… »), contrôle compris. */
  function formatRecoveryCode(bytes) {
    return checksum(bytes).then(function (check) { return group(encode128(bytes) + check); });
  }

  /** Nouveau code : { bytes, text }. */
  function newRecoveryCode() {
    var bytes = random(16);
    return formatRecoveryCode(bytes).then(function (text) { return { bytes: bytes, text: text }; });
  }

  /**
   * Lit un code saisi (espaces, tirets et casse ignorés ; O lu 0, I et L lus 1). Renvoie les 16 octets, ou une
   * erreur dont le code est « length », « character » ou « checksum ».
   */
  function parseRecoveryCode(input) {
    var text = String(input || "").toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
    if (text.length !== 28) return Promise.reject(CodeError("length"));
    if (!/^[0-9A-HJKMNP-TV-Z]+$/.test(text)) return Promise.reject(CodeError("character"));
    var bytes;
    try { bytes = decode128(text.slice(0, 26)); } catch (e) { return Promise.reject(e); }
    return checksum(bytes).then(function (check) {
      if (check !== text.slice(26)) throw CodeError("checksum");
      return bytes;
    });
  }

  // ----- Clé du compte et enveloppe ----------------------------------------------------------------------------

  function wrappingKey(codeBytes, salt) {
    return subtle.importKey("raw", codeBytes, "HKDF", false, ["deriveKey"]).then(function (base) {
      return subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: salt, info: enc.encode(WRAP_INFO) }, base,
        { name: "AES-GCM", length: 256 }, false, ["wrapKey", "unwrapKey"]);
    });
  }

  /**
   * Premier appareil : crée la clé du compte et l'enveloppe avec le code. Renvoie { key (non exportable, à garder sur
   * l'appareil), keys (à envoyer au serveur : { kdf, salt, wrapped: { iv, data } }) }.
   */
  function createAccountKey(codeBytes) {
    var salt = random(16), iv = random(12), raw;
    return subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]).then(function (key) {
      return Promise.all([wrappingKey(codeBytes, salt), subtle.exportKey("raw", key)]).then(function (r) {
        raw = new Uint8Array(r[1]);
        return Promise.all([subtle.wrapKey("raw", key, r[0], { name: "AES-GCM", iv: iv }),
          subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])]);
      });
    }).then(function (r) {
      raw.fill(0);
      return { key: r[1], keys: { kdf: "hkdf-sha256", salt: toB64(salt), wrapped: { iv: toB64(iv), data: toB64(new Uint8Array(r[0])) } } };
    });
  }

  /** Nouvel appareil : ouvre l'enveloppe reçue du serveur avec le code ; erreur « wrong_code » si le code ne va pas. */
  function openAccountKey(codeBytes, keys) {
    return wrappingKey(codeBytes, fromB64(keys.salt)).then(function (wk) {
      return subtle.unwrapKey("raw", fromB64(keys.wrapped.data), wk, { name: "AES-GCM", iv: fromB64(keys.wrapped.iv) },
        { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    }).catch(function () { throw CodeError("wrong_code"); });
  }

  // Changer de code de récupération : la clé gardée sur l'appareil n'est pas exportable, donc pas de nouvelle
  // enveloppe pour elle ; il faudra une nouvelle clé et un coffre rechiffré (fonction prévue plus tard).

  // ----- Coffre ------------------------------------------------------------------------------------------------

  function pipe(bytes, stream) {
    return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  var aad = function (accountId, version) { return enc.encode(VAULT_TAG + "|" + accountId + "|" + version); };

  /** Chiffre l'Espace pour la version qui sera écrite : { iv, data } (base64url). */
  function encryptVault(key, data, accountId, version) {
    var json = enc.encode(JSON.stringify(data)), iv = random(12);
    var packed = typeof CompressionStream === "function"
      ? pipe(json, new CompressionStream("gzip")).then(function (z) { return concat([1], z); })
      : Promise.resolve(concat([0], json));
    return packed.then(function (plain) {
      return subtle.encrypt({ name: "AES-GCM", iv: iv, additionalData: aad(accountId, version) }, key, plain);
    }).then(function (c) { return { iv: toB64(iv), data: toB64(new Uint8Array(c)) }; });
  }

  /** Déchiffre un coffre { iv, data, version } ; erreur « vault » s'il a été modifié, ou chiffré pour un autre compte ou une autre version. */
  function decryptVault(key, vault, accountId) {
    return subtle.decrypt({ name: "AES-GCM", iv: fromB64(vault.iv), additionalData: aad(accountId, vault.version) }, key, fromB64(vault.data))
      .catch(function () { throw CodeError("vault"); })
      .then(function (p) {
        var plain = new Uint8Array(p), body = plain.subarray(1);
        if (plain[0] === 0) return body;
        if (plain[0] === 1 && typeof DecompressionStream === "function") return pipe(body, new DecompressionStream("gzip"));
        throw CodeError("vault");
      })
      .then(function (json) { return JSON.parse(dec.decode(json)); });
  }

  function concat(head, bytes) {
    var out = new Uint8Array(head.length + bytes.length);
    out.set(head, 0); out.set(bytes, head.length);
    return out;
  }

  return { newRecoveryCode: newRecoveryCode, formatRecoveryCode: formatRecoveryCode, parseRecoveryCode: parseRecoveryCode, createAccountKey: createAccountKey,
           openAccountKey: openAccountKey, encryptVault: encryptVault, decryptVault: decryptVault, toB64: toB64, fromB64: fromB64,
           ALPHABET: ALPHABET };
});
