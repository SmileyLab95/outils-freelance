/*
 * Page « Mon compte » (documentation/23-serveur-et-connexion.md, § 5) : connexion par lien ou clé d'accès, code de
 * récupération et chiffrement sur le premier appareil, ouverture sur un nouvel appareil, synchronisation de l'Espace,
 * appareils connectés, clés d'accès, export et suppression. Appels au serveur et chiffrement : tools/compte-sync.js.
 * Compte nouveau : écran Bienvenue (lettre d'information, case non cochée), puis premiers pas dans « Votre compte »
 * (documentation/34-inscription-compte-gratuit.md).
 */
(function () {
  "use strict";
  var OF = window.OF, A = window.OFCompte, C = window.OFE && window.OFE.compteCrypto, FS = window.OFE && window.OFE.firstSteps;
  var RULES = window.OF_RULES || {};
  var card = document.querySelector(".account-card");
  if (!card || !A || !C || !FS) return;
  var $ = function (id) { return document.getElementById(id); };
  var SCREENS = ["s-loading", "s-signin", "s-sent", "s-welcome", "s-setup", "s-unlock", "s-account"];
  var me = null, code = null;

  var ERRORS = {
    network: "Le serveur ne répond pas. Vérifiez votre connexion et réessayez.",
    invalid: "Cette adresse email ne semble pas valide.",
    rate_limited: "Trop de demandes en peu de temps : réessayez dans quelques minutes.",
    invalid_link: "Ce lien n'est plus valable : il a déjà servi ou il a plus de 15 minutes. Demandez-en un nouveau.",
    unauthorized: "Votre session a expiré : reconnectez-vous.",
    length: "Le code de récupération compte 28 caractères : vérifiez-le.",
    character: "Ce code contient un caractère inattendu : vérifiez-le.",
    checksum: "Ce code contient une faute de frappe : vérifiez chaque caractère.",
    wrong_code: "Ce code ne correspond pas à votre compte.",
    passkey_cancelled: "Clé d'accès annulée ou indisponible sur cet appareil.",
    conflict: "Cette clé d'accès est déjà enregistrée, ou vous en avez déjà 20.",
    reauth: "Pour supprimer votre compte, reconnectez-vous d'abord : la connexion doit dater de moins de 15 minutes.",
    no_key: "Saisissez votre code de récupération pour ouvrir votre Espace sur cet appareil.",
    busy: "Un autre appareil synchronise en même temps : réessayez dans un instant.",
    rollback: "Le serveur a renvoyé une version plus ancienne de votre Espace : synchronisation arrêtée par sécurité.",
    vault: "Votre Espace sauvegardé n'a pas pu être déchiffré : il a peut-être été modifié. Synchronisation arrêtée par sécurité.",
    "schema-newer": "Votre Espace a été enregistré par une version plus récente du site : rechargez la page.",
    storage: "Votre navigateur ne permet pas de garder la clé de chiffrement sur cet appareil (navigation privée ?) : la synchronisation n'y est pas disponible.",
    server: "Une erreur est survenue. Réessayez dans un instant."
  };

  // ----- Affichage ----------------------------------------------------------------------------------------------

  function show(id, focus) {
    SCREENS.forEach(function (s) { $(s).hidden = s !== id; });
    var h = $(id).querySelector("h2");
    if (h && focus !== false) h.focus();
  }
  function message(text, kind) {
    var m = $("c-msg");
    m.hidden = !text;
    m.className = "notice" + (kind ? " " + kind : "");
    m.textContent = text || "";
  }
  function fail(e) {
    var code = (e && e.code) || "server";
    if (code === "unauthorized") { me = null; show("s-signin"); }
    if (code === "no_key") show("s-unlock");
    message(ERRORS[code] || ERRORS.server, "warn");
  }
  /** Bouton occupé pendant une action ; le rétablit à la fin, réussite ou échec. */
  function busy(button, promise) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    var done = function () { button.disabled = false; button.removeAttribute("aria-busy"); };
    return promise.then(function (v) { done(); return v; }, function (e) { done(); throw e; });
  }
  var when = function (ms) { return new Date(ms).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }); };
  /** Appareil décrit à partir de son navigateur (indication seulement). */
  function device(ua) {
    ua = String(ua || "");
    var browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
    var os = /iPhone|iPad/.test(ua) ? "iPhone ou iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
    return browser + (os ? " sur " + os : "");
  }
  function li(label, detail, button) {
    var item = document.createElement("li"), text = document.createElement("span");
    text.textContent = label;
    var small = document.createElement("span");
    small.className = "muted";
    small.textContent = detail;
    text.appendChild(small);
    item.appendChild(text);
    if (button) item.appendChild(button);
    return item;
  }
  function smallButton(label, aria, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-ghost";
    b.textContent = label;
    b.setAttribute("aria-label", aria);
    b.addEventListener("click", function () { onClick(b); });
    return b;
  }

  // ----- Parcours -----------------------------------------------------------------------------------------------

  function start() {
    var token = /[#&]token=([A-Za-z0-9_-]+)/.exec(location.hash);
    if ($("passkey-signin") && A.passkeysSupported()) $("passkey-signin").hidden = false;
    if (token) {
      // Le jeton ne reste ni dans l'adresse ni dans l'historique.
      history.replaceState(null, "", location.pathname + location.search);
      return A.call("POST", "/auth/verify", { token: token[1] }).then(function (r) {
        if (r.created) { me = r.account; message(""); show("s-welcome"); return; }
        message("Vous êtes connecté.", "ok");
        return enter(r.account);
      }, function (e) { show("s-signin"); fail(e); });
    }
    return A.call("GET", "/me").then(enter, function (e) {
      show("s-signin", false);
      if (e.code !== "unauthorized") fail(e);
    });
  }

  function enter(account) {
    me = account;
    if (!account.keysVersion) { show("s-setup"); return; }
    return A.state().then(function (st) {
      if (st && st.key && st.accountId === account.id) return openAccount(true);
      show("s-unlock");
    }, function () { show("s-unlock"); message(ERRORS.storage, "warn"); });
  }

  function openAccount(syncNow) {
    $("acc-email").textContent = me.email;
    $("acc-newsletter").checked = !!(me.prefs && me.prefs.newsletter && me.prefs.newsletter.value);
    show("s-account");
    refreshLists();
    return A.state().then(renderSync).then(function () { if (syncNow) return runSync(); });
  }

  /** Premiers pas, d'après l'Espace de l'appareil et les clés d'accès du compte (OFE.firstSteps). */
  function renderSteps() {
    return window.EspaceStore.load().then(function (data) {
      var r = FS.steps({ profile: data.profile, documents: data.documents, passkeys: A.passkeysSupported() ? me.passkeys : null,
                         microActivities: RULES.micro_activities });
      var all = ["profile", "mentions", "document", "passkey"];
      all.forEach(function (id) {
        var step = r.steps.filter(function (x) { return x.id === id; })[0], item = $("step-" + id);
        item.hidden = !step;
        item.classList.toggle("is-done", !!(step && step.done));
      });
      card.querySelectorAll("#acc-steps-tools [data-tool]").forEach(function (t) { t.hidden = r.tools.indexOf(t.getAttribute("data-tool")) < 0; });
      $("acc-steps-count").textContent = r.complete ? "Tout est prêt : " + r.total + " étapes sur " + r.total + "."
        : r.done + (r.done > 1 ? " étapes faites" : " étape faite") + " sur " + r.total + ".";
      $("acc-steps").hidden = false;
    }, function () { $("acc-steps").hidden = true; });
  }

  /** Conflit nommé par l'élément concerné (« Studio Nova : fiche modifiée… »), d'après l'Espace de l'appareil. */
  function describe(conflict, data) {
    var find = function (list, id) { return (list || []).filter(function (x) { return x.id === id; })[0]; };
    // Encaissement : nommé par son document (docId) ; document : par son numéro (un brouillon n'en a pas encore).
    var name = conflict.kind === "client" ? (find(data.clients, conflict.id) || {}).name
      : conflict.kind === "document" ? (find(data.documents, conflict.id) || {}).number
      : conflict.kind === "payment" ? (find(data.documents, conflict.docId) || {}).number : "";
    var text = conflict.message;
    return name ? name + " : " + text.charAt(0).toLowerCase() + text.slice(1) : text;
  }

  function renderSync(st, error) {
    if (me) renderSteps();   // l'Espace a pu changer (synchronisation, autre appareil)
    return window.EspaceStore.load().then(function (data) { draw(st, error, data); }, function () { draw(st, error, null); });
  }
  function draw(st, error, data) {
    var status = $("sync-status"), list = $("sync-conflicts");
    var conflicts = (st && st.conflicts) || [];
    status.className = "notice " + (error || conflicts.length ? "warn" : "ok");
    status.textContent = error ? error
      : st && st.lastSync ? "Espace synchronisé le " + when(Date.parse(st.lastSync)) + "." + (conflicts.length ? " À vérifier :" : "")
      : "Pas encore synchronisé.";
    list.textContent = "";
    conflicts.forEach(function (c) { var item = document.createElement("li"); item.textContent = data ? describe(c, data) : c.message; list.appendChild(item); });
    list.hidden = !conflicts.length || !!error;
  }

  function runSync() {
    $("sync-status").className = "notice";
    $("sync-status").textContent = "Synchronisation en cours…";
    return busy($("b-sync"), A.sync()).then(function () { return A.state().then(renderSync); }, function (e) {
      if (e.code === "unauthorized" || e.code === "no_key") return fail(e);
      return A.state().then(function (st) { renderSync(st, ERRORS[e.code] || ERRORS.server); });
    });
  }

  function refreshLists() {
    A.call("GET", "/sessions").then(function (r) {
      var ul = $("acc-sessions");
      ul.textContent = "";
      r.sessions.forEach(function (s) {
        var label = device(s.userAgent) + (s.current ? " (cet appareil)" : "");
        var detail = (s.method === "passkey" ? "Clé d'accès" : "Lien par email") + " · connecté le " + when(s.createdAt) + " · dernière activité le " + when(s.lastSeen);
        ul.appendChild(li(label, detail, s.current ? null : smallButton("Déconnecter", "Déconnecter " + label, function (b) {
          busy(b, A.call("DELETE", "/sessions/" + s.id)).then(refreshLists, fail);
        })));
      });
    }, fail);
    A.call("GET", "/passkeys").then(function (r) {
      var ul = $("acc-passkeys");
      ul.textContent = "";
      if (me && me.passkeys !== r.passkeys.length) { me.passkeys = r.passkeys.length; renderSteps(); }
      if (!r.passkeys.length) ul.appendChild(li("Aucune clé d'accès", "", null));
      r.passkeys.forEach(function (p) {
        ul.appendChild(li(p.name, "Ajoutée le " + when(p.createdAt) + (p.lastUsed ? " · utilisée le " + when(p.lastUsed) : ""),
          smallButton("Supprimer", "Supprimer la clé d'accès " + p.name, function (b) {
            busy(b, A.call("DELETE", "/passkeys/" + encodeURIComponent(p.id))).then(function () { message("Clé d'accès supprimée.", "ok"); refreshLists(); }, fail);
          })));
      });
      $("b-add-passkey").hidden = !A.passkeysSupported();
    }, fail);
  }

  // ----- Connexion ----------------------------------------------------------------------------------------------

  $("f-signin").addEventListener("submit", function () {
    var email = $("c-email").value.trim();
    if (!email || !$("c-email").checkValidity()) { $("c-email").setAttribute("aria-invalid", "true"); message(ERRORS.invalid, "warn"); return; }
    $("c-email").removeAttribute("aria-invalid");
    busy($("b-link"), A.call("POST", "/auth/link", { email: email, lang: "fr" })).then(function () {
      message("");
      $("sent-email").textContent = email;
      show("s-sent");
    }, fail);
  });
  $("b-other-email").addEventListener("click", function () { show("s-signin"); $("c-email").focus(); });
  $("b-passkey").addEventListener("click", function () {
    busy($("b-passkey"), A.signInWithPasskey()).then(function (r) { message("Vous êtes connecté.", "ok"); return enter(r.account); }, fail);
  });

  // ----- Compte nouveau : Bienvenue -----------------------------------------------------------------------------

  /** Enregistre le choix de la lettre d'information (daté par le serveur, avec la version du texte affiché). */
  function saveNewsletter(box) {
    return A.call("PUT", "/me/prefs", { newsletter: { value: box.checked, wording: box.getAttribute("data-wording") } })
      .then(function (r) { me.prefs = r.prefs; return r; });
  }
  $("f-welcome").addEventListener("submit", function () {
    var box = $("c-newsletter");
    // Case non cochée : rien à enregistrer, le compte n'a aucune lettre d'information par défaut.
    var done = box.checked ? busy($("b-welcome"), saveNewsletter(box)) : Promise.resolve();
    done.then(function () { message(box.checked ? "Inscription à la lettre d'information enregistrée." : "", "ok"); return enter(me); }, fail);
  });

  // ----- Premier appareil : code de récupération ----------------------------------------------------------------

  $("b-new-code").addEventListener("click", function () {
    busy($("b-new-code"), C.newRecoveryCode()).then(function (c) {
      code = c;
      $("code-text").textContent = c.text;
      $("setup-code").hidden = false;
      $("b-new-code").hidden = true;
      $("code-text").setAttribute("tabindex", "-1");
      $("code-text").focus();
    });
  });
  $("b-copy-code").addEventListener("click", function () { if (code) OF.copy(code.text, $("b-copy-code")); });
  $("b-save-code").addEventListener("click", function () {
    if (!code) return;
    OF.download("Code de récupération de votre Espace entrepreneur\n\n" + code.text +
      "\n\nGardez ce code en lieu sûr. Il permet d'ouvrir votre Espace chiffré sur un nouvel appareil ; sans lui, vos données sauvegardées ne peuvent pas être récupérées.\n",
      "code-de-recuperation.txt", "text/plain");
  });
  $("b-print-code").addEventListener("click", function () {
    if (!code) return;
    var w = window.open("", "_blank");
    if (!w) return;
    w.document.title = "Code de récupération";
    var h = w.document.createElement("h1"), p = w.document.createElement("p"), note = w.document.createElement("p");
    h.textContent = "Code de récupération de votre Espace entrepreneur";
    p.textContent = code.text;
    p.style.cssText = "font:700 20pt monospace;letter-spacing:.06em";
    note.textContent = "Gardez ce code en lieu sûr : sans lui, vos données sauvegardées ne peuvent pas être récupérées sur un nouvel appareil.";
    [h, p, note].forEach(function (el) { w.document.body.appendChild(el); });
    w.print();
  });
  $("f-confirm").addEventListener("submit", function () {
    if (!code) return;
    var last = code.text.replace(/-/g, "").slice(-4);
    var typed = $("c-confirm").value.trim().toUpperCase();
    if (typed !== last) { $("c-confirm").setAttribute("aria-invalid", "true"); message("Les 4 derniers caractères ne correspondent pas : vérifiez le code noté.", "warn"); return; }
    $("c-confirm").removeAttribute("aria-invalid");
    if (!$("c-kept").checked) { message("Cochez la case pour confirmer que vous avez rangé le code.", "warn"); return; }
    busy($("b-activate"), A.setup(me, code.bytes)).then(function () {
      code = null;
      me.keysVersion = 1;
      message("Sauvegarde chiffrée activée : votre Espace est enregistré.", "ok");
      return openAccount(false);
    }, fail);
  });

  // ----- Nouvel appareil ----------------------------------------------------------------------------------------

  $("f-unlock").addEventListener("submit", function () {
    var input = $("c-code");
    busy($("b-unlock"), C.parseRecoveryCode(input.value).then(function (bytes) { return A.unlock(me, bytes); })).then(function () {
      input.value = "";
      input.removeAttribute("aria-invalid");
      message("Votre Espace est ouvert sur cet appareil.", "ok");
      return openAccount(false);
    }, function (e) {
      if (["length", "character", "checksum", "wrong_code"].indexOf(e.code) > -1) input.setAttribute("aria-invalid", "true");
      fail(e);
    });
  });

  // ----- Compte -------------------------------------------------------------------------------------------------

  $("b-sync").addEventListener("click", runSync);
  $("b-step-passkey").addEventListener("click", function () { $("b-add-passkey").click(); });
  $("acc-newsletter").addEventListener("change", function () {
    var box = $("acc-newsletter");
    box.disabled = true;
    saveNewsletter(box).then(function () {
      box.disabled = false;
      message(box.checked ? "Inscription à la lettre d'information enregistrée." : "Désinscription enregistrée : vous ne recevrez plus la lettre d'information.", "ok");
    }, function (e) { box.disabled = false; box.checked = !box.checked; fail(e); });
  });
  $("b-add-passkey").addEventListener("click", function () {
    busy($("b-add-passkey"), A.addPasskey(device(navigator.userAgent))).then(function () {
      message("Clé d'accès ajoutée : vous pourrez vous connecter sans email.", "ok");
      refreshLists();
    }, fail);
  });
  $("b-export").addEventListener("click", function () {
    busy($("b-export"), A.call("GET", "/export")).then(function (data) {
      OF.download(JSON.stringify(data, null, 2), "compte-export.json", "application/json");
    }, fail);
  });
  $("b-logout").addEventListener("click", function () {
    busy($("b-logout"), A.call("POST", "/auth/logout")).then(function () { return A.forget(); }).then(function () {
      me = null;
      show("s-signin");
      message("Vous êtes déconnecté de cet appareil. Votre Espace reste disponible sur cet appareil, sans synchronisation.", "ok");
    }, fail);
  });
  $("b-delete").addEventListener("click", function () {
    if (!$("c-delete-ok").checked) { message("Cochez la case pour confirmer la suppression.", "warn"); return; }
    busy($("b-delete"), A.call("DELETE", "/account")).then(function () { return A.forget(); }).then(function () {
      me = null;
      $("c-delete-ok").checked = false;
      show("s-signin");
      message("Votre compte est supprimé. Votre Espace reste disponible sur cet appareil.", "ok");
    }, fail);
  });

  // Lien de connexion collé dans un onglet déjà ouvert sur cette page : seule la partie « # » change.
  window.addEventListener("hashchange", function () { if (/[#&]token=/.test(location.hash)) start(); });
  start();
})();
