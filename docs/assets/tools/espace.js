/*
 * Espace entrepreneur (France, version locale) : application d'une page.
 * Spécification : documentation/09-specification-espace.md. Calculs : OFE.espaceFR et OFE.invoiceFR.
 * Stockage : window.EspaceStore (IndexedDB). Écrans : #/ (tableau de bord), #/documents, #/documents/<id>,
 * #/clients, #/clients/<id>, #/recettes, #/echeances, #/reglages, #/importer (document venu du générateur public).
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES, S = window.EspaceStore;
  var app = document.getElementById("espace-app");
  if (!app || !OFE || !OFE.espaceFR || !R || !S) return;
  var E = OFE.espaceFR, INV = OFE.invoiceFR;
  var $ = function (id) { return document.getElementById(id); };
  var view = $("espace-view"), statusEl = $("espace-status");
  var calEl = $("calendar-data");
  var CAL = calEl ? JSON.parse(calEl.textContent).events : [];
  var forced = /[?&]today=(\d{4}-\d{2}-\d{2})/.exec(window.location.search);
  var TODAY = forced ? forced[1] : OF.today();
  var YEAR = TODAY.slice(0, 4);
  var FMT = { eur: OF.eur, num: OF.fmt, date: OF.frDate };
  var data = S.empty();
  var currentRoute = "";

  // ----- Libellés ----------------------------------------------------------------

  var ACTIVITIES = [
    ["liberal_bnc", "Profession libérale (BNC)"], ["cipav", "Profession libérale relevant de la CIPAV"],
    ["services_bic", "Prestations de services commerciales (BIC)"], ["artisan", "Activité artisanale (BIC)"],
    ["vente", "Vente de marchandises (BIC)"], ["real", "Je ne suis pas en micro-entreprise"]];
  var VAT_REGIMES = [["franchise", "Franchise en base (pas de TVA)"], ["simplified", "Régime réel simplifié de TVA"], ["normal", "Régime réel normal de TVA"]];
  var TYPES = { facture: "Facture", devis: "Devis", avoir: "Avoir" };
  var STATES = {
    draft: ["Brouillon", "st-draft"], unpaid: ["À encaisser", "st-unpaid"], overdue: ["En retard", "st-overdue"],
    partial: ["Payée en partie", "st-partial"], paid: ["Payée", "st-paid"], sent: ["Envoyé", "st-unpaid"],
    accepted: ["Accepté", "st-paid"], refused: ["Refusé", "st-draft"], invoiced: ["Facturé", "st-paid"],
    issued: ["Émis", "st-unpaid"], refunded: ["Remboursé", "st-paid"], cancelled: ["Annulée par avoir", "st-draft"],
    imputed: ["Imputé sur la facture", "st-paid"], refund: ["À rembourser", "st-overdue"]
  };
  var NEW_TITLES = { facture: "Nouvelle facture", devis: "Nouveau devis", avoir: "Nouvel avoir" };
  var TERMS = [[0, "À réception"], [15, "15 jours"], [30, "30 jours"], [45, "45 jours"], [60, "60 jours"]];
  /** Délais proposés, avec le délai du document s'il n'est pas dans la liste (document repris du générateur). */
  function termsFor(value) {
    var n = parseInt(value, 10);
    if (!(n >= 0) || TERMS.some(function (t) { return t[0] === n; })) return TERMS;
    return TERMS.concat([[n, n + " jours"]]).sort(function (a, b) { return a[0] - b[0]; });
  }

  // ----- Outils ------------------------------------------------------------------

  function esc(text) {
    return String(text == null ? "" : text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  var money = function (n) { return OF.eur(n); };
  var day = function (iso) { return iso ? OF.frDate(iso) : "–"; };
  var longDay = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  function options(list, selected) {
    return list.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(selected) ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    }).join("");
  }
  function announce(msg, error) {
    statusEl.textContent = msg;
    statusEl.className = "espace-status" + (error ? " is-error" : "") + (msg ? " is-visible" : "");
    clearTimeout(announce.t);
    if (msg && !error) announce.t = setTimeout(function () { statusEl.className = "espace-status"; }, 3500);
  }
  function persist(msg) {
    return S.save(data).then(function () { if (msg) announce(msg); }, function () {
      announce("L'enregistrement a échoué : votre navigateur refuse le stockage. Exportez une sauvegarde depuis les réglages.", true);
    });
  }
  var now = function () { return new Date().toISOString(); };
  function client(id) { return data.clients.filter(function (c) { return c.id === id; })[0] || null; }
  function doc(id) { return data.documents.filter(function (d) { return d.id === id; })[0] || null; }
  function profile() { return data.profile || {}; }
  function isMicro() { return !!R.micro_activities[profile().activity]; }

  /** Émetteur et client affichés : figés à l'émission, sinon le profil et la fiche client actuels. */
  function parties(d) {
    if (d.snapshot) return d.snapshot;
    var p = profile(), c = client(d.clientId) || {};
    return { me: meFromProfile(p), client: clientForDoc(c) };
  }
  function meFromProfile(p) {
    return { name: p.name, status: p.status, address: p.address, siret: p.siret, vat: p.vat, email: p.email,
             phone: p.phone, iban: p.iban, bic: p.bic, logo: p.logo, endpoint: p.endpoint || "" };
  }
  function clientForDoc(c) {
    return { name: c.name, address: c.address, id: c.siren, vat: c.vat, delivery: c.delivery, pro: !!c.pro, email: c.email,
             place: c.place || "fr", country: c.place && c.place !== "fr" ? c.country || "" : "", endpoint: c.endpoint || "" };
  }
  function docForRender(d) {
    var p = parties(d);
    return Object.assign({}, d, { me: p.me, client: p.client });
  }
  function stateBadge(d) {
    var st = STATES[E.state(d, TODAY, data.documents)] || STATES.draft;
    return '<span class="st ' + st[1] + '">' + esc(st[0]) + "</span>";
  }
  function docLabel(d) { return TYPES[d.type] + " " + (d.number || "(brouillon)"); }

  // ----- Routeur -------------------------------------------------------------------

  function route() {
    var h = (location.hash || "#/").slice(1);
    var q = h.indexOf("?");
    var path = q > -1 ? h.slice(0, q) : h;
    var params = {};
    if (q > -1) h.slice(q + 1).split("&").forEach(function (kv) { var p = kv.split("="); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); });
    var parts = path.split("/").filter(Boolean);
    return { name: parts[0] || "tableau", id: parts[1] || null, params: params, key: h };
  }

  function render(keepFocus) {
    var r = route();
    var name = data.profile ? r.name : (r.name === "reglages" ? "reglages" : "accueil");
    app.querySelectorAll("[data-route]").forEach(function (a) {
      var active = a.getAttribute("data-route") === name || (name === "accueil" && a.getAttribute("data-route") === "tableau");
      if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    app.classList.toggle("is-onboarding", !data.profile);
    // Navigation mobile (défilante) : garder l'onglet actif visible.
    var nav = app.querySelector(".espace-nav"), current = nav && nav.querySelector('[aria-current="page"]');
    if (current && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
    var views = { accueil: viewWelcome, tableau: viewDashboard, documents: r.id ? viewDocument : viewDocuments,
                  clients: r.id ? viewClientForm : viewClients, recettes: viewLedger, echeances: viewDeadlines, reglages: viewSettings,
                  importer: viewImport };
    (views[name] || viewDashboard)(r);
    if (!keepFocus && r.key !== currentRoute) {
      var h = view.querySelector("h2");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      if (currentRoute) window.scrollTo({ top: app.getBoundingClientRect().top + window.scrollY - 80, behavior: "auto" });
    }
    currentRoute = r.key;
  }

  // ----- Premier lancement -----------------------------------------------------------

  function viewWelcome() {
    var fromGenerator = OF.load("facture", null);
    view.innerHTML =
      '<div class="espace-welcome"><h2>Bienvenue dans votre espace</h2>' +
      (pendingImport() ? '<p class="notice">Le document préparé dans le générateur sera repris en brouillon dès que votre profil sera créé.</p>' : "") +
      "<p>Clients, devis, factures, encaissements, livre des recettes et déclarations Urssaf : tout au même endroit. " +
      "Vos données restent <strong>sur cet appareil</strong> : rien n'est envoyé sur un serveur.</p>" +
      "<p>Commencez par décrire votre entreprise : 2 minutes, modifiable à tout moment.</p></div>" +
      profileForm(fromGenerator ? generatorProfile(fromGenerator) : { activity: "liberal_bnc", vatRegime: "franchise", periodicity: "quarterly" }, true) +
      '<div class="card espace-card espace-noprint"><h3>Vous avez déjà des données ?</h3>' +
      (fromGenerator ? "<p>Vos coordonnées enregistrées dans le générateur de facture ont été reprises dans le formulaire ci-dessus.</p>" : "") +
      '<p>Restaurez une sauvegarde de l\'Espace (fichier .json) :</p>' + importControl() + "</div>";
    bindProfileForm(true);
    bindImport();
  }

  /** Coordonnées déjà saisies dans le générateur de facture public (même navigateur). */
  function generatorProfile(f) {
    return { name: f.meName, status: f.meStatus, address: f.meAddress, siret: f.meSiret, vat: f.meVat, email: f.meEmail,
             phone: f.mePhone, iban: f.meIban, bic: f.meBic, activity: "liberal_bnc",
             vatRegime: f.franchise === false ? "simplified" : "franchise", periodicity: "quarterly",
             penalty: f.penalty, logo: OF.load("facture-logo", "") };
  }

  // ----- Document venu du générateur public (#/importer) ---------------------------------------------

  var IMPORT_KEY = "espace-import", IMPORT_TTL = 24 * 3600 * 1000;
  /** Document déposé par le bouton « Continuer dans mon Espace » du générateur (même navigateur, moins de 24 h). */
  function pendingImport() {
    var p = OF.load(IMPORT_KEY, null);
    var age = p && Date.now() - Date.parse(p.savedAt);
    if (!p || !p.doc || typeof p.doc !== "object" || !(age >= 0 && age < IMPORT_TTL)) {
      if (p) OF.save(IMPORT_KEY, null);
      return null;
    }
    return p.doc;
  }
  var PATCH_LABELS = { status: "statut", address: "adresse", siret: "SIRET", vat: "n° de TVA", email: "email", phone: "téléphone",
                       iban: "IBAN", bic: "BIC", logo: "logo" };

  function viewImport() {
    var g = pendingImport();
    if (!g) {
      view.innerHTML = '<div class="espace-head"><h2>Reprendre un document du générateur</h2></div>' +
        '<div class="card espace-card"><p>Aucun document à reprendre. Préparez votre facture ou votre devis dans le ' +
        '<a href="../generateur-facture/">générateur de facture</a>, puis cliquez sur « Continuer dans mon Espace ».</p>' +
        '<p class="small"><a href="#/">Retour au tableau de bord</a></p></div>';
      return;
    }
    var res = E.fromGenerator(g, profile(), data.clients, data.documents, { doc: S.uid(), client: S.uid() }, TODAY, now());
    var d = res.doc, cont = res.continuation;
    var label = d.type === "devis" ? "ce devis" : "cette facture";
    var patch = Object.keys(res.profilePatch);
    var p = profile();
    var preview = Object.assign({}, d, { me: meFromProfile(Object.assign({}, p, res.profilePatch)), client: clientForDoc(res.client || {}) });
    view.innerHTML = '<div class="espace-head"><h2>Reprendre le document du générateur</h2></div>' +
      '<div class="tool-layout wide-left espace-editor"><div class="espace-side espace-noprint"><section class="card espace-card">' +
      '<ul class="result-list">' +
      "<li><span>Document</span><b>" + TYPES[d.type] + " (brouillon)</b></li>" +
      "<li><span>Client</span><b>" + (res.client ? esc(res.client.name) + ' <span class="small muted">(' + (res.newClient ? "nouvelle fiche" : "fiche existante") + ")</span>" : "à choisir") + "</b></li>" +
      "<li><span>Lignes</span><b>" + d.lines.filter(function (l) { return String(l.desc).trim(); }).length + "</b></li>" +
      "<li><span>Total</span><b>" + esc(money(E.total(d))) + "</b></li></ul>" +
      '<p class="notice">Le document devient un brouillon de l\'Espace : relisez-le, puis émettez-le ; il reçoit alors son numéro. ' +
      "<strong>S'il a déjà été envoyé à votre client depuis le générateur, ne l'émettez pas une seconde fois</strong> : une même vente ne se facture qu'une fois.</p>" +
      (cont ? '<label class="check"><input type="checkbox" id="imp-continue" checked><span>Continuer la numérotation du générateur : ' + label +
        " recevra le n° <b class=\"nowrap\">" + esc(cont.number) + "</b> à son émission, " + (d.type === "devis" ? "le suivant" : "la suivante") +
        ' le n° <span class="nowrap">' + esc(cont.prefix + cont.year + "-" + String(cont.last + 2).padStart(3, "0")) + "</span>" +
        ".</span></label>" : "") +
      (patch.length ? '<p class="small muted">Votre profil sera complété avec les informations du générateur : ' + esc(patch.map(function (k) { return PATCH_LABELS[k] || k; }).join(", ")) + ".</p>" : "") +
      (res.paid ? '<p class="small muted">Acompte déjà versé indiqué dans le générateur (' + esc(money(res.paid)) + ") : enregistrez-le comme encaissement une fois la facture émise.</p>" : "") +
      (res.vatDiffers ? '<p class="small muted">La TVA suit votre profil (' + (d.vat.franchise ? "franchise en base" : "TVA à " + OF.fmt(d.vat.rate) + " %") +
        '), et non le réglage du générateur. Vous pouvez modifier votre régime dans les <a href="#/reglages">réglages</a>.</p>' : "") +
      '<div class="espace-actions"><button type="button" class="btn btn-primary" id="imp-ok">Créer le brouillon</button>' +
      '<button type="button" class="btn btn-ghost" id="imp-cancel">Ne pas reprendre</button></div></section></div>' +
      '<div class="results"><div class="paper-wrap"><article class="paper" aria-label="Aperçu du document">' + INV.render(preview, R, FMT) + "</article></div></div></div>";

    $("imp-ok").addEventListener("click", function () {
      this.disabled = true;
      var np = Object.assign({}, profile(), res.profilePatch);
      if (cont && $("imp-continue").checked) {
        np.prefixes = Object.assign({}, E.DEFAULT_PREFIXES, np.prefixes || {});
        np.prefixes[d.type] = cont.prefix;
        np.numbering = Object.assign({}, np.numbering || {});
        np.numbering[d.type] = { year: cont.year, last: cont.last };
      }
      data.profile = np;
      if (res.newClient) data.clients.push(res.client);
      data.documents.push(d);
      OF.save(IMPORT_KEY, null);
      persist("Brouillon créé à partir du générateur.").then(function () { location.hash = "#/documents/" + d.id; });
    });
    $("imp-cancel").addEventListener("click", function () {
      OF.save(IMPORT_KEY, null);
      announce("Le document du générateur n'a pas été repris.");
      location.hash = "#/";
    });
  }

  // ----- Profil (accueil et réglages) ------------------------------------------------

  function field(name, label, value, opts) {
    opts = opts || {};
    var id = "ep-" + name;
    var ctrl;
    if (opts.options) ctrl = '<select id="' + id + '" name="' + name + '">' + options(opts.options, value) + "</select>";
    else if (opts.textarea) ctrl = '<textarea id="' + id + '" name="' + name + '" rows="2" placeholder="' + esc(opts.placeholder || "") + '">' + esc(value || "") + "</textarea>";
    else ctrl = '<input id="' + id + '" name="' + name + '" type="' + (opts.type || "text") + '"' + (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : "") +
      ' value="' + esc(value == null ? "" : value) + '" placeholder="' + esc(opts.placeholder || "") + '"' + (opts.required ? " required" : "") +
      (opts.disabled ? " disabled" : "") + (opts.hint ? ' aria-describedby="' + id + '-hint"' : "") + ">";
    return '<div class="field' + (opts.half ? "" : " full") + '"><label for="' + id + '">' + esc(label) + "</label>" + ctrl +
      (opts.hint ? '<span class="hint" id="' + id + '-hint">' + opts.hint + "</span>" : "") + "</div>";
  }

  // ----- Numérotation : préfixes et reprise d'une séquence commencée ailleurs ------------------------

  var NUM_TYPES = [
    { type: "facture", plural: "factures", last: "Dernier n° de facture" },
    { type: "devis", plural: "devis", last: "Dernier n° de devis" },
    { type: "avoir", plural: "avoirs", last: "Dernier n° d'avoir" }];
  // Caractères admis dans un numéro de facture électronique : lettres, chiffres, + - _ / (règle BR-FR-02) ; pas de chiffres
  // dans le préfixe, pour lire sans ambiguïté l'année et le rang.
  var PREFIX_RE = /^[A-Za-z_\-\/]{0,12}$/;
  function prefixOf(p, type) { return p.prefixes && p.prefixes[type] != null ? p.prefixes[type] : E.DEFAULT_PREFIXES[type]; }
  function lastUsed(p, type) { var n = p.numbering && p.numbering[type]; return n && String(n.year) === YEAR ? n.last : ""; }
  /** Série de l'année commencée dans l'Espace : son préfixe et sa suite sont fixés jusqu'à la fin de l'année. */
  function startedPrefix(type) { return E.seriesPrefix(data.documents, type, YEAR); }
  /** Rang saisi (« 7 », ou « 2026-007 » / « F2026-007 » de l'année) : nombre, null si vide, false si illisible. */
  function parseLast(value) {
    var v = String(value || "").trim();
    if (!v) return null;
    if (/^\d{1,6}$/.test(v)) return +v;
    var m = /^[A-Za-z_\-\/]*(\d{4})-(\d{1,6})$/.exec(v);
    return m && m[1] === YEAR ? +m[2] : false;
  }

  function numberingFields(p) {
    return '<div class="full fields"><h4 class="full">Numérotation</h4>' +
      '<p class="full small muted">Vous avez déjà émis des documents en ' + YEAR + " avec un autre outil ? Indiquez le dernier numéro utilisé : " +
      "l'Espace continuera la même séquence, qui doit rester continue.</p>" +
      NUM_TYPES.map(function (t) {
        var started = startedPrefix(t.type);
        return field("prefix_" + t.type, "Préfixe des " + t.plural, prefixOf(p, t.type), { half: true, placeholder: "Aucun",
            hint: started != null && started !== prefixOf(p, t.type)
              ? "La série " + YEAR + " garde le préfixe « " + esc(started || "aucun") + " » ; celui-ci s'appliquera aux séries suivantes." : "" }) +
          field("last_" + t.type, t.last + " utilisé en " + YEAR, lastUsed(p, t.type), { half: true, inputmode: "numeric", disabled: started != null,
            placeholder: "Aucun (ex. : 7)", hint: (started != null ? "Série " + YEAR + " commencée dans l'Espace. " : "") +
              'Prochain numéro : <b id="next-' + t.type + '">' + esc(E.nextNumber(data.documents, t.type, YEAR, p.prefixes, p.numbering)) + "</b>" });
      }).join("") + "</div>";
  }
  /** Aperçu du prochain numéro pendant la saisie des réglages. */
  function bindNumbering(form, p) {
    var started = {};
    NUM_TYPES.forEach(function (t) { started[t.type] = startedPrefix(t.type) != null; });
    form.addEventListener("input", function (e) {
      var t = /^(prefix|last)_(\w+)$/.exec(e.target.name || "");
      if (!t) return;
      var type = t[2], pre = form.elements["prefix_" + type].value.trim();
      var last = started[type] ? lastUsed(p, type) : parseLast(form.elements["last_" + type].value);
      var pref = {}, num = {};
      pref[type] = pre;
      num[type] = { year: YEAR, last: last || 0 };
      $("next-" + type).textContent = PREFIX_RE.test(pre) && last !== false ? E.nextNumber(data.documents, type, YEAR, pref, num) : "–";
    });
  }
  /** Lit et contrôle les réglages de numérotation ; renvoie { prefixes, numbering } ou { error }. */
  function readNumbering(form, p) {
    var prefixes = {}, numbering = Object.assign({}, p.numbering || {}), error = "";
    NUM_TYPES.forEach(function (t) {
      var k = t.type, pre = form.elements["prefix_" + k].value.trim();
      if (!PREFIX_RE.test(pre)) error = error || "Préfixe des " + t.plural + " : lettres, tirets (- ou _) ou barres obliques seulement, 12 caractères au plus.";
      prefixes[k] = pre;
      if (startedPrefix(k) != null) return; // suite fixée par les documents émis
      var last = parseLast(form.elements["last_" + k].value);
      if (last === false) error = error || t.last + " : indiquez le rang du dernier numéro utilisé (par exemple 7 pour " + pre + YEAR + "-007).";
      else if (last === null) { if (numbering[k] && String(numbering[k].year) === YEAR) delete numbering[k]; }
      else numbering[k] = { year: YEAR, last: last };
    });
    if (!error && (prefixes.facture === prefixes.devis || prefixes.facture === prefixes.avoir || prefixes.devis === prefixes.avoir)) {
      error = "Les préfixes des factures, des devis et des avoirs doivent être différents.";
    }
    return error ? { error: error } : { prefixes: prefixes, numbering: numbering };
  }

  function profileForm(p, first) {
    var micro = !!R.micro_activities[p.activity];
    return '<form class="card espace-card" id="profile-form" novalidate>' +
      "<h3>Votre entreprise</h3><div class=\"fields\">" +
      field("name", "Nom ou raison sociale", p.name, { placeholder: "Camille Martin EI", required: true, hint: "Entrepreneur individuel : faites suivre votre nom de « EI »." }) +
      field("activity", "Activité", p.activity, { options: ACTIVITIES }) +
      field("vatRegime", "TVA", p.vatRegime, { options: VAT_REGIMES, half: true }) +
      field("vatRate", "Taux de TVA habituel", p.vatRate || 20, { options: [[20, "20 %"], [10, "10 %"], [5.5, "5,5 %"], [2.1, "2,1 %"]], half: true }) +
      '<div class="micro-only full fields"' + (micro ? "" : " hidden") + ">" +
      field("periodicity", "Déclaration Urssaf", p.periodicity, { options: [["quarterly", "Trimestrielle"], ["monthly", "Mensuelle"]], half: true }) +
      field("startDate", "Début d'activité", p.startDate, { type: "date", half: true }) +
      field("acre", "ACRE", p.acre || 0, { options: [[0, "Non"], [50, "Oui, réduction de 50 %"], [25, "Oui, réduction de 25 %"]], half: true }) +
      field("vl", "Versement libératoire de l'impôt", p.vl ? "1" : "0", { options: [["0", "Non"], ["1", "Oui"]], half: true }) +
      "</div>" +
      (first ? "" :
        field("status", "Statut affiché sur les factures", p.status, { placeholder: "Entrepreneur individuel (micro-entreprise)" }) +
        field("address", "Adresse", p.address, { textarea: true, placeholder: "12 rue de la République\n69002 Lyon" }) +
        field("siret", "SIRET", p.siret, { half: true, placeholder: "123 456 789 00012" }) +
        field("vat", "N° de TVA intracommunautaire", p.vat, { half: true }) +
        field("endpoint", "Adresse de facturation électronique (facultatif)", p.endpoint, { placeholder: "Votre SIREN par défaut",
          hint: "Pour la facture électronique : par défaut votre SIREN. Indiquez celle de l'annuaire si votre plateforme vous en a attribué une autre (SIREN suivi d'un suffixe)." }) +
        field("email", "Email", p.email, { type: "email", half: true }) +
        field("phone", "Téléphone", p.phone, { type: "tel", half: true }) +
        field("iban", "IBAN", p.iban, { half: true }) +
        field("bic", "BIC", p.bic, { half: true }) +
        field("terms", "Délai de paiement par défaut", p.terms == null ? 30 : p.terms, { options: TERMS, half: true }) +
        field("penalty", "Taux des pénalités de retard", p.penalty || "trois fois le taux d'intérêt légal", { half: true }) +
        numberingFields(p)) +
      "</div>" +
      '<p class="form-error" id="profile-error" role="alert" hidden></p>' +
      '<div class="espace-actions"><button type="submit" class="btn btn-primary">' + (first ? "Créer mon espace" : "Enregistrer") + "</button></div></form>";
  }

  function bindProfileForm(first) {
    var form = $("profile-form");
    var toggle = function () {
      form.querySelector(".micro-only").hidden = !R.micro_activities[form.elements.activity.value];
      form.elements.vatRate.closest(".field").hidden = form.elements.vatRegime.value === "franchise";
    };
    form.elements.activity.addEventListener("change", toggle);
    form.elements.vatRegime.addEventListener("change", toggle);
    toggle();
    if (!first) bindNumbering(form, data.profile || {});
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements, p = Object.assign({}, data.profile || {}, first ? generatorExtras() : {});
      p.name = f.name.value.trim();
      if (!p.name) { showError("profile-error", "Indiquez le nom de votre entreprise."); f.name.focus(); return; }
      ["activity", "vatRegime", "periodicity", "startDate"].forEach(function (k) { p[k] = f[k].value; });
      p.vatRate = Number(f.vatRate.value);
      p.acre = Number(f.acre.value);
      p.vl = f.vl.value === "1";
      if (!first) {
        ["status", "address", "siret", "vat", "email", "phone", "iban", "bic", "penalty", "endpoint"].forEach(function (k) { p[k] = f[k].value.trim(); });
        var endpointError = checkEndpoint(p.endpoint, p.siret, "votre SIREN");
        if (endpointError) { showError("profile-error", endpointError); f.endpoint.focus(); return; }
        p.terms = Number(f.terms.value);
        var numbering = readNumbering(form, p);
        if (numbering.error) { showError("profile-error", numbering.error); return; }
        p.prefixes = numbering.prefixes;
        p.numbering = numbering.numbering;
      }
      showError("profile-error", "");
      data.profile = p;
      persist(first ? "Votre espace est prêt." : "Profil enregistré.").then(function () {
        if (first) { S.persist(); location.hash = pendingImport() ? "#/importer" : "#/"; render(); }
        else render(true);
      });
    });
  }
  /** Coordonnées du générateur reprises sans être affichées dans le formulaire du premier lancement. */
  function generatorExtras() {
    var f = OF.load("facture", null);
    if (!f) return { terms: 30 };
    var g = generatorProfile(f);
    delete g.name; delete g.activity; delete g.vatRegime; delete g.periodicity;
    g.terms = 30;
    return g;
  }
  function showError(id, msg) { var el = $(id); el.textContent = msg; el.hidden = !msg; }

  var regionNames = typeof Intl !== "undefined" && Intl.DisplayNames ? new Intl.DisplayNames(["fr"], { type: "region" }) : null;
  /** Pays proposés selon le lieu du client, triés par nom ; le premier choix invite à choisir. */
  function countryOptions(place) {
    return [["", "Choisir le pays…"]].concat(E.countries(place === "eu" ? "eu" : "world").map(function (code) {
      return [code, regionNames ? regionNames.of(code) : code];
    }).sort(function (a, b) { return a[1].localeCompare(b[1], "fr"); }));
  }
  /**
   * Adresse de facturation électronique (annuaire) : vide (le SIREN est utilisé), ou le SIREN suivi éventuellement d'un
   * suffixe ; lettres, chiffres, - _ . seulement (règles BR-FR-21 et BR-FR-23 de la norme XP Z12-012).
   */
  function checkEndpoint(value, sirenOrSiret, whose) {
    if (!value) return "";
    var siren = String(sirenOrSiret || "").replace(/\s+/g, "").slice(0, 9);
    if (!/^[A-Za-z0-9_.-]{9,100}$/.test(value)) return "Adresse de facturation électronique : lettres, chiffres, - _ . seulement, sans espace.";
    if (/^\d{9}$/.test(siren) && value.indexOf(siren) !== 0) return "L'adresse de facturation électronique doit commencer par " + whose + " (" + siren + ").";
    return "";
  }

  // ----- Tableau de bord -------------------------------------------------------------

  function viewDashboard() {
    var p = profile();
    var invoices = data.documents.filter(function (d) { return d.type === "facture" && d.status !== "draft"; });
    var open = invoices.filter(function (d) { return ["unpaid", "overdue", "partial"].indexOf(E.state(d, TODAY, data.documents)) > -1; });
    var late = open.filter(function (d) { return E.state(d, TODAY, data.documents) === "overdue"; });
    var openSum = open.reduce(function (s, d) { return s + E.balance(d, data.documents); }, 0);
    var quotes = data.documents.filter(function (d) { return d.type === "devis" && d.status === "sent"; });
    var year = E.cashed(data.documents, YEAR + "-01-01", YEAR + "-12-31");
    var decl = E.nextDeclaration(data.documents, p, R, CAL, TODAY);
    var th = E.thresholds(data.documents, p, R, YEAR);

    var html = '<div class="espace-head"><h2>' + esc(p.name || "Tableau de bord") + "</h2>" +
      '<div class="espace-quick espace-noprint"><a class="btn btn-primary btn-sm" href="#/documents/nouveau?type=facture">+ Facture</a>' +
      '<a class="btn btn-ghost btn-sm" href="#/documents/nouveau?type=devis">+ Devis</a>' +
      '<a class="btn btn-ghost btn-sm" href="#/clients/nouveau">+ Client</a></div></div>';
    html += profileReminder() + backupReminder();
    html += '<div class="kpis">' +
      kpi("Encaissé en " + YEAR, money(year), countText(E.ledger(data.documents, YEAR + "-01-01", YEAR + "-12-31").filter(function (x) { return x.amount > 0; }).length, "encaissement", "encaissements")) +
      kpi("À encaisser", money(openSum), open.length ? countText(open.length, "facture", "factures") + (late.length ? ", dont " + late.length + " en retard" : "") : "Aucune facture en attente", late.length ? "is-warn" : "") +
      (decl ? kpi("Déclaration Urssaf : " + decl.period.label, money(decl.revenue),
        "À déclarer avant le " + longDay(decl.due) + " · cotisations estimées " + money(decl.total) + (decl.open ? " (période en cours)" : ""), "is-brand")
        : kpi("Devis en attente", String(quotes.length), quotes.length ? money(quotes.reduce(function (s, d) { return s + E.total(d); }, 0)) + " au total" : "Aucun devis envoyé en attente")) +
      "</div>";

    if (isMicro()) html += gauges(th);
    html += '<div class="espace-cols"><section class="card espace-card"><h3>Prochaines échéances</h3>' + deadlinesList(4) +
      '<p class="small"><a href="#/echeances">Toutes les échéances →</a></p></section>' +
      '<section class="card espace-card"><h3>Derniers documents</h3>' + docTable(recentDocs(5), true) +
      '<p class="small"><a href="#/documents">Tous les documents →</a></p></section></div>';
    if (decl) {
      html += '<p class="small muted espace-note">Estimation : chiffre d\'affaires encaissé de la période × ' +
        OF.fmt(Math.round((decl.rates.social + decl.rates.cfp) * 1000) / 10) + " %" + (decl.rates.acre ? " (ACRE)" : "") +
        (decl.rates.vl ? " + versement libératoire " + OF.fmt(Math.round(decl.rates.vl * 1000) / 10) + " %" : "") +
        '. Déclarez et payez sur <a href="https://www.autoentrepreneur.urssaf.fr/" rel="noopener">autoentrepreneur.urssaf.fr</a>.</p>';
    }
    view.innerHTML = html;
  }

  function kpi(label, value, sub, cls) {
    return '<div class="kpi card ' + (cls || "") + '"><span class="kpi-label">' + esc(label) + '</span><b class="kpi-value">' + esc(value) +
      '</b><span class="kpi-sub">' + esc(sub) + "</span></div>";
  }
  function countText(n, one, many) { return n + " " + (n > 1 ? many : one); }

  function gauge(label, value, max, note) {
    var pct = max > 0 ? Math.min(100, value / max * 100) : 0;
    var cls = pct >= 100 ? "over" : pct >= 80 ? "near" : "";
    return '<div class="gauge"><div class="gauge-head"><span>' + esc(label) + "</span><b>" + esc(money(value)) + " / " + esc(money(max)) +
      '</b></div><div class="progress" role="progressbar" aria-label="' + esc(label) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      Math.round(pct) + '"><div class="' + cls + '" style="width:' + pct.toFixed(1) + '%"></div></div>' +
      (note ? '<p class="small muted" style="margin: 6px 0 0;">' + esc(note) + "</p>" : "") + "</div>";
  }
  function gauges(th) {
    var html = '<div class="card gauges">' + gauge("Plafond de la micro-entreprise (" + YEAR + ")", th.revenue, th.ceiling,
      th.revenue > th.ceiling ? "Plafond dépassé : au-delà de deux années de dépassement, vous sortez de la micro-entreprise." : "");
    if (th.vat) {
      html += gauge("Seuil de la franchise de TVA", th.revenue, th.vat.base,
        th.revenue > th.vat.major ? "Seuil majoré dépassé : la TVA est due dès le jour du dépassement." :
        th.revenue > th.vat.base ? "Seuil dépassé : la TVA sera due à partir du 1er janvier prochain (seuil majoré : " + money(th.vat.major) + ")." : "");
    }
    return html + "</div>";
  }

  /** Mentions obligatoires de l'émetteur manquantes dans le profil. */
  function profileReminder() {
    var p = profile(), missing = [];
    if (!String(p.address || "").trim()) missing.push("adresse");
    if (!String(p.siret || "").trim()) missing.push("SIRET");
    if (!missing.length) return "";
    return '<p class="notice warn espace-noprint">Complétez votre profil (' + missing.join(", ") +
      ') : ces mentions sont obligatoires sur vos factures. <a href="#/reglages">Ouvrir les réglages</a></p>';
  }

  function backupReminder() {
    var issued = data.documents.some(function (d) { return d.status !== "draft"; });
    var last = data.settings.lastExport;
    var old = !last || (Date.parse(TODAY) - Date.parse(last.slice(0, 10))) / 864e5 > 30;
    if (!issued || !old) return "";
    return '<p class="notice warn espace-noprint">Vos données ne sont enregistrées que sur cet appareil. ' +
      (last ? "Dernière sauvegarde : " + day(last.slice(0, 10)) + ". " : "Vous n'avez encore jamais fait de sauvegarde. ") +
      '<a href="#/reglages">Exporter une sauvegarde</a></p>';
  }

  // ----- Échéances ---------------------------------------------------------------------

  function matchingEvents() {
    var p = profile();
    var values = { periodicity: p.periodicity, vat: p.vatRegime, created: p.startDate && p.startDate.slice(0, 4) === YEAR ? "on" : "off" };
    return CAL.filter(function (e) {
      if (e.date < TODAY) return false;
      if (!isMicro() && e.tag === "Urssaf") return false;
      var w = e.when || {};
      return Object.keys(w).every(function (k) { return values[k] === undefined || w[k].indexOf(values[k]) > -1; });
    });
  }
  function deadlinesList(limit) {
    var list = matchingEvents().slice(0, limit || 999);
    if (!list.length) return '<p class="muted">Aucune échéance à venir.</p>';
    return '<ul class="espace-deadlines">' + list.map(function (e) {
      var n = OF.daysBetween(TODAY, e.date);
      return '<li><span class="dl-date">' + esc(OF.date(e.date, { day: "numeric", month: "short" })) + '</span><span class="dl-body"><b>' +
        esc(e.title) + '</b><span class="small muted">' + (n === 0 ? "aujourd'hui" : n === 1 ? "demain" : "dans " + n + " jours") +
        (e.est ? " · date estimée" : "") + "</span></span></li>";
    }).join("") + "</ul>";
  }
  function viewDeadlines() {
    view.innerHTML = '<div class="espace-head"><h2>Échéances</h2></div>' +
      '<section class="card espace-card"><p class="muted">Échéances des 12 prochains mois selon votre profil (déclaration ' +
      (profile().periodicity === "monthly" ? "mensuelle" : "trimestrielle") + ", " + esc((VAT_REGIMES.filter(function (v) { return v[0] === profile().vatRegime; })[0] || ["", ""])[1].toLowerCase()) + ").</p>" +
      deadlinesList(40) + '<p class="small"><a href="../calendrier-fiscal-auto-entrepreneur/">Calendrier fiscal complet et export vers votre agenda →</a></p></section>';
  }

  // ----- Liste des documents ---------------------------------------------------------------

  function recentDocs(n) {
    return data.documents.slice().sort(function (a, b) { return (b.updatedAt || "") < (a.updatedAt || "") ? -1 : 1; }).slice(0, n);
  }
  function docTable(list, compact) {
    if (!list.length) return '<p class="muted">Aucun document pour l\'instant. <a href="#/documents/nouveau?type=facture">Créer une facture</a></p>';
    return '<ul class="doc-list">' + list.map(function (d) {
      var c = parties(d).client || {};
      return '<li><a href="#/documents/' + esc(d.id) + '"><span class="dl-main"><b>' + esc(docLabel(d)) + "</b>" +
        '<span class="small muted">' + esc(c.name || "Sans client") + " · " + day(d.date) + "</span></span>" +
        '<span class="dl-side"><b>' + esc(money(d.type === "avoir" ? -E.total(d) : E.total(d))) + "</b>" + stateBadge(d) + "</span></a></li>";
    }).join("") + "</ul>";
  }

  var FILTERS = [["tous", "Tous"], ["facture", "Factures"], ["devis", "Devis"], ["avoir", "Avoirs"], ["draft", "Brouillons"], ["open", "À encaisser"]];
  function viewDocuments(r) {
    var filter = r.params.filtre || "tous", search = (r.params.q || "").toLowerCase();
    var list = data.documents.filter(function (d) {
      var st = E.state(d, TODAY, data.documents);
      if (filter === "draft" && st !== "draft") return false;
      if (filter === "open" && ["unpaid", "overdue", "partial"].indexOf(st) < 0) return false;
      if (TYPES[filter] && d.type !== filter) return false;
      if (search) {
        var c = parties(d).client || {};
        var hay = [d.number, c.name, (d.lines || []).map(function (l) { return l.desc; }).join(" ")].join(" ").toLowerCase();
        if (hay.indexOf(search) < 0) return false;
      }
      return true;
    }).sort(function (a, b) { return a.date === b.date ? ((b.number || "~") > (a.number || "~") ? 1 : -1) : (a.date < b.date ? 1 : -1); });
    view.innerHTML = '<div class="espace-head"><h2>Documents</h2><div class="espace-quick espace-noprint">' +
      '<a class="btn btn-primary btn-sm" href="#/documents/nouveau?type=facture">+ Facture</a>' +
      '<a class="btn btn-ghost btn-sm" href="#/documents/nouveau?type=devis">+ Devis</a></div></div>' +
      '<div class="card espace-card"><div class="espace-filters" role="group" aria-label="Filtrer les documents">' +
      FILTERS.map(function (f) { return '<a class="tab" href="#/documents?filtre=' + f[0] + '"' + (f[0] === filter ? ' aria-current="true"' : "") + ">" + esc(f[1]) + "</a>"; }).join("") +
      '</div><div class="field"><label for="doc-search">Rechercher</label><input id="doc-search" type="search" value="' + esc(r.params.q || "") +
      '" placeholder="Numéro, client, prestation…"></div>' + docTable(list) + "</div>";
    var input = $("doc-search");
    input.addEventListener("input", function () {
      clearTimeout(input.t);
      input.t = setTimeout(function () {
        history.replaceState(null, "", "#/documents?filtre=" + filter + (input.value ? "&q=" + encodeURIComponent(input.value) : ""));
        var pos = input.selectionStart;
        render(true);
        var again = $("doc-search"); again.focus(); again.setSelectionRange(pos, pos);
      }, 200);
    });
  }

  // ----- Document : création, édition, émission ------------------------------------------------

  var draftInMemory = null;
  var editing = null;      // brouillon affiché dans l'éditeur
  var pendingSave = null;  // enregistrement différé du brouillon (vidé avant de changer d'écran)

  function newDraft(type, clientId) {
    var p = profile(), c = client(clientId);
    return { id: S.uid(), type: TYPES[type] ? type : "facture", status: "draft", date: TODAY, serviceDate: TODAY,
             terms: p.terms == null ? 30 : p.terms, validity: 30, depositPct: type === "devis" ? 30 : 0, nature: "services",
             clientId: c ? c.id : "", lines: [{ desc: "", qty: 1, price: NaN }],
             vat: vatFor(c), penalty: p.penalty || "", notes: "", payments: [], createdAt: now(), updatedAt: now() };
  }
  /** TVA d'un document : régime du profil et lieu du client professionnel. */
  function vatFor(c) {
    var p = profile();
    return { franchise: p.vatRegime === "franchise", rate: p.vatRate || 20, place: c && c.pro ? c.place || "fr" : "fr", debits: false };
  }

  function viewDocument(r) {
    var d;
    if (r.id === "nouveau") {
      if (!draftInMemory || draftInMemory.routeKey !== r.key) {
        draftInMemory = newDraft(r.params.type, r.params.client);
        draftInMemory.routeKey = r.key;
      }
      d = draftInMemory;
    } else {
      d = doc(r.id);
      if (!d) { view.innerHTML = '<div class="espace-head"><h2>Document introuvable</h2></div><p><a href="#/documents">Retour aux documents</a></p>'; return; }
    }
    if (d.status === "draft") renderDraft(d); else renderIssued(d);
  }

  function linesHTML(d) {
    return d.lines.map(function (l, i) {
      return '<div class="line-row" data-line="' + i + '">' +
        '<div class="field line-desc"><label for="ln-desc-' + i + '">Désignation</label><input type="text" id="ln-desc-' + i + '" data-k="desc" value="' + esc(l.desc) + '"></div>' +
        '<div class="field line-qty"><label for="ln-qty-' + i + '">Qté</label><input type="text" id="ln-qty-' + i + '" data-k="qty" inputmode="decimal" value="' + (isFinite(INV.amount(l.qty)) ? esc(OF.fmt(l.qty)) : "") + '"></div>' +
        '<div class="field line-price"><label for="ln-price-' + i + '">Prix unitaire HT</label><div class="input-suffix"><input type="text" id="ln-price-' + i + '" data-k="price" inputmode="decimal" value="' + (isFinite(INV.amount(l.price)) ? esc(String(l.price).replace(".", ",")) : "") + '"><span>€</span></div></div>' +
        '<button type="button" class="line-remove" data-remove="' + i + '" aria-label="Supprimer la ligne ' + (i + 1) + '" title="Supprimer">✕</button></div>';
    }).join("");
  }

  function renderDraft(d) {
    var clients = data.clients.filter(function (c) { return !c.archived || c.id === d.clientId; });
    var html = '<div class="espace-head"><h2>' + esc(doc(d.id) ? TYPES[d.type] + " (brouillon)" : NEW_TITLES[d.type]) +
      "</h2>" + stateBadge(d) + "</div>" + profileReminder() +
      '<div class="tool-layout wide-left espace-editor"><form class="card form-card espace-noprint" id="doc-form" novalidate>' +
      '<div class="fields">' +
      '<div class="field full"><label for="d-client">Client</label><select id="d-client" name="clientId"><option value="">Choisir un client…</option>' +
      options(clients.map(function (c) { return [c.id, c.name]; }), d.clientId) + "</select>" +
      '<span class="hint"><a href="#/clients/nouveau?retour=' + esc(d.id) + '">Nouveau client</a></span></div>' +
      '<div class="field"><label for="d-date">Date</label><input type="date" id="d-date" name="date" value="' + esc(d.date) + '"></div>' +
      (d.type === "facture" ? '<div class="field"><label for="d-service">Date de la prestation</label><input type="date" id="d-service" name="serviceDate" value="' + esc(d.serviceDate || "") + '"></div>' +
        '<div class="field"><label for="d-terms">Délai de paiement</label><select id="d-terms" name="terms">' + options(termsFor(d.terms), d.terms) + "</select></div>" : "") +
      (d.type === "devis" ? '<div class="field"><label for="d-validity">Validité (jours)</label><input type="text" id="d-validity" name="validity" inputmode="numeric" value="' + esc(d.validity) + '"></div>' +
        '<div class="field"><label for="d-deposit">Acompte à la signature (%)</label><input type="text" id="d-deposit" name="depositPct" inputmode="decimal" value="' + esc(d.depositPct) + '"></div>' : "") +
      '<div class="field"><label for="d-nature">Nature de l\'opération</label><select id="d-nature" name="nature">' +
      options([["services", "Prestation de services"], ["biens", "Livraison de biens"], ["mixte", "Biens et services"]], d.nature) + "</select></div>" +
      (d.vat.franchise || d.vat.place !== "fr" ? "" : '<div class="field"><label for="d-rate">Taux de TVA</label><select id="d-rate" name="rate">' +
        options([[20, "20 %"], [10, "10 %"], [5.5, "5,5 %"], [2.1, "2,1 %"]], d.vat.rate) + "</select></div>") +
      "</div><h3>Lignes</h3><div id=\"d-lines\">" + linesHTML(d) + "</div>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="d-add-line">+ Ajouter une ligne</button>' +
      '<div class="fields" style="margin-top:14px;"><div class="field full"><label for="d-notes">Note en bas du document (facultatif)</label>' +
      '<textarea id="d-notes" name="notes" rows="2">' + esc(d.notes) + "</textarea></div></div>" +
      '<p class="small muted" id="d-vat-note">' + vatNote(d) + "</p>" +
      '<p class="form-error" id="doc-error" role="alert" hidden></p>' +
      '<div class="espace-actions"><button type="button" class="btn btn-primary" id="d-issue">' + (d.type === "devis" ? "Émettre le devis" : d.type === "avoir" ? "Émettre l'avoir" : "Émettre la facture") + "</button>" +
      '<button type="button" class="btn btn-ghost" id="d-print">Aperçu PDF</button>' +
      '<button type="button" class="btn btn-ghost" id="d-delete">Supprimer le brouillon</button></div>' +
      '<p class="small muted">Le brouillon est enregistré automatiquement. Une fois émis, le document reçoit son numéro et ne peut plus être modifié.</p>' +
      "</form>" + paper(d) + "</div>";
    view.innerHTML = html;
    bindDraft(d);
  }

  function vatNote(d) {
    if (d.vat.place === "eu") return "Client professionnel de l'UE : pas de TVA, mention d'autoliquidation ajoutée.";
    if (d.vat.place === "world") return "Client professionnel hors de l'UE : pas de TVA française.";
    if (d.vat.franchise) return "Franchise en base : la mention « TVA non applicable » est ajoutée automatiquement.";
    return "";
  }

  function paper(d) {
    return '<div class="results"><div class="paper-wrap"><article class="paper" id="d-preview" aria-label="Aperçu du document">' +
      INV.render(docForRender(d), R, FMT) + "</article></div></div>";
  }

  function bindDraft(d) {
    var form = $("doc-form");
    var refresh = function () { $("d-preview").innerHTML = INV.render(docForRender(d), R, FMT); };
    editing = d;
    // Enregistrement du brouillon ; en quittant l'écran (navigating), sans toucher à l'adresse affichée.
    var commit = function (navigating) {
      clearTimeout(bindDraft.t);
      pendingSave = null;
      d.updatedAt = now();
      if (!doc(d.id)) {
        delete d.routeKey;
        data.documents.push(d);
        draftInMemory = null;
        if (!navigating) {
          history.replaceState(null, "", "#/documents/" + d.id);
          currentRoute = route().key;
        }
      }
      persist(navigating ? "" : "Brouillon enregistré.");
    };
    var saveDraft = function () {
      clearTimeout(bindDraft.t);
      pendingSave = function () { commit(true); };
      bindDraft.t = setTimeout(function () { commit(false); }, 400);
    };
    form.addEventListener("input", function (e) {
      var t = e.target;
      var row = t.closest("[data-line]");
      if (row) {
        var l = d.lines[+row.getAttribute("data-line")], k = t.getAttribute("data-k");
        l[k] = k === "desc" ? t.value : OF.num(t.value);
      } else if (t.name === "rate") d.vat.rate = Number(t.value);
      else if (t.name === "depositPct" || t.name === "validity" || t.name === "terms") d[t.name] = Number(OF.num(t.value)) || 0;
      else if (t.name) d[t.name] = t.value;
      refresh();
      saveDraft();
    });
    form.addEventListener("change", function (e) {
      if (e.target.name === "clientId") {
        d.vat = Object.assign(vatFor(client(d.clientId)), { rate: d.vat.rate });
        $("d-vat-note").textContent = vatNote(d);
        renderDraft(d);
        $("d-client").focus();
      }
    });
    $("d-add-line").addEventListener("click", function () {
      d.lines.push({ desc: "", qty: 1, price: NaN });
      $("d-lines").innerHTML = linesHTML(d);
      $("ln-desc-" + (d.lines.length - 1)).focus();
      refresh(); saveDraft();
    });
    $("d-lines").addEventListener("click", function (e) {
      var b = e.target.closest("[data-remove]");
      if (!b) return;
      d.lines.splice(+b.getAttribute("data-remove"), 1);
      if (!d.lines.length) d.lines.push({ desc: "", qty: 1, price: NaN });
      $("d-lines").innerHTML = linesHTML(d);
      refresh(); saveDraft();
    });
    $("d-print").addEventListener("click", function () { printDoc(d); });
    $("d-delete").addEventListener("click", function () {
      if (!confirm("Supprimer ce brouillon ?")) return;
      clearTimeout(bindDraft.t);
      pendingSave = null;
      draftInMemory = null;
      if (!doc(d.id)) { location.hash = "#/documents"; return; }
      data.documents = data.documents.filter(function (x) { return x.id !== d.id; });
      if (d.quoteId && doc(d.quoteId) && doc(d.quoteId).invoiceId === d.id) delete doc(d.quoteId).invoiceId;
      persist("Brouillon supprimé.").then(function () { location.hash = "#/documents"; });
    });
    $("d-issue").addEventListener("click", function () {
      var c = client(d.clientId);
      var res = E.issue(data.documents, d, meFromProfile(profile()), c ? clientForDoc(c) : null, profile().prefixes, now(), profile().numbering);
      if (res.errors.length) { showError("doc-error", res.errors.join(" ")); return; }
      if (!confirm("Émettre " + (d.type === "facture" ? "la facture" : d.type === "devis" ? "le devis" : "l'avoir") + " n° " +
        res.doc.number + " ? Il ne pourra plus être modifié.")) return;
      clearTimeout(bindDraft.t);
      pendingSave = null;
      var issued = res.doc;
      delete issued.routeKey;
      data.documents = data.documents.filter(function (x) { return x.id !== d.id; }).concat([issued]);
      if (issued.quoteId && doc(issued.quoteId)) doc(issued.quoteId).invoiceId = issued.id;
      draftInMemory = null;
      persist(TYPES[d.type] + " " + issued.number + " émis" + (d.type === "facture" ? "e" : "") + ".").then(function () {
        location.hash = "#/documents/" + issued.id;
        render();
      });
    });
  }

  function printDoc(d) {
    var title = document.title;
    document.title = docLabel(d);
    document.body.classList.add("print-paper");
    window.print();
    document.body.classList.remove("print-paper");
    document.title = title;
  }

  // ----- Document émis : encaissements, avoir, devis ------------------------------------------------

  function renderIssued(d) {
    var st = E.state(d, TODAY, data.documents);
    var c = parties(d).client || {};
    var tot = E.total(d), paid = E.paidAmount(d), bal = E.balance(d, data.documents);
    var credit = d.type === "facture" ? E.credited(data.documents, d) : 0;
    var html = '<div class="espace-head"><h2>' + esc(docLabel(d)) + "</h2>" + stateBadge(d) + "</div>" +
      '<div class="tool-layout wide-left espace-editor"><div class="espace-side espace-noprint">' +
      '<section class="card espace-card"><ul class="result-list">' +
      "<li><span>Client</span><b>" + esc(c.name || "–") + "</b></li>" +
      "<li><span>Date</span><b>" + day(d.date) + "</b></li>" +
      (d.type === "facture" ? "<li><span>Échéance</span><b>" + day(E.dueDate(d)) + "</b></li>" : "") +
      "<li><span>Montant</span><b>" + esc(money(tot)) + "</b></li>" +
      (d.type === "facture" ? "<li><span>Encaissé</span><b>" + esc(money(paid)) + "</b></li>" +
        (credit > 0 ? "<li><span>Avoirs</span><b>− " + esc(money(credit)) + "</b></li>" : "") +
        "<li><span><strong>Reste à encaisser</strong></span><b>" + esc(money(Math.max(0, bal))) + "</b></li>" : "") +
      (d.type === "avoir" ? "<li><span>Remboursé</span><b>" + esc(money(paid)) + "</b></li>" +
        "<li><span><strong>Reste à rembourser</strong></span><b>" + esc(money(bal)) + "</b></li>" : "") +
      "</ul></section>" +
      '<div class="espace-actions"><button type="button" class="btn btn-primary" id="d-print">Télécharger en PDF</button>' +
      '<button type="button" class="btn btn-ghost" id="d-duplicate">Dupliquer</button>' +
      (d.type === "facture" && credit < tot - 0.005 ? '<button type="button" class="btn btn-ghost" id="d-credit">Créer un avoir</button>' : "") +
      (d.type === "devis" && !d.invoiceId ? '<button type="button" class="btn btn-ghost" id="d-convert">Transformer en facture</button>' : "") +
      "</div>";
    if (st !== "cancelled") html += sendCard(d);
    if ((d.type === "facture" || d.type === "avoir") && (parties(d).client || {}).pro) html += facturxCard(d);
    if (d.type === "devis") {
      html += '<section class="card espace-card"><h3>Réponse du client</h3><div class="espace-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-quote="accepted"' + (d.status === "accepted" ? ' aria-pressed="true"' : "") + ">Accepté</button>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-quote="refused"' + (d.status === "refused" ? ' aria-pressed="true"' : "") + ">Refusé</button>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-quote="sent"' + (d.status === "sent" ? ' aria-pressed="true"' : "") + ">En attente</button></div>" +
        (d.invoiceId && doc(d.invoiceId) ? '<p class="small">Facturé : <a href="#/documents/' + esc(d.invoiceId) + '">' + esc(docLabel(doc(d.invoiceId))) + "</a></p>" : "") + "</section>";
    } else if (d.type === "facture" || bal > 0.005 || paid > 0) {
      html += paymentsCard(d, bal);
    } else {
      html += '<section class="card espace-card"><p class="small muted">Cet avoir est déduit de la facture d\'origine : rien à rembourser au client.</p></section>';
    }
    if (d.type === "facture" && (st === "overdue" || st === "unpaid" || st === "partial")) {
      html += '<section class="card espace-card"><h3>Relancer le client</h3><p class="small muted">' +
        (st === "overdue" ? "Échéance dépassée de " + OF.daysBetween(E.dueDate(d), TODAY) + " jour(s)." : "Échéance le " + day(E.dueDate(d)) + ".") +
        '</p><div class="espace-actions"><a class="btn btn-ghost btn-sm" id="d-remind" href="' + esc(mailto(d, "reminder")) + '">Écrire l\'email de relance</a>' +
        '<a class="btn btn-ghost btn-sm" href="../relance-facture-impayee/">Modèles de relance</a></div></section>';
    }
    if (d.origin && d.originId) html += '<p class="small">Avoir de la facture <a href="#/documents/' + esc(d.originId) + '">' + esc(d.origin.number) + "</a>.</p>";
    if (d.quoteId && doc(d.quoteId)) html += '<p class="small">Issue du devis <a href="#/documents/' + esc(d.quoteId) + '">' + esc(doc(d.quoteId).number) + "</a>.</p>";
    html += "</div>" + paper(d) + "</div>";
    view.innerHTML = html;
    bindIssued(d);
  }

  function paymentsCard(d, bal) {
    var refund = d.type === "avoir";
    var rows = (d.payments || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var html = '<section class="card espace-card"><h3>' + (refund ? "Remboursements" : "Encaissements") + "</h3>";
    html += rows.length ? '<ul class="pay-list">' + rows.map(function (p) {
      return "<li><span>" + day(p.date) + " · " + esc(E.METHODS[p.method] || p.method) + (p.note ? " · " + esc(p.note) : "") + "</span><b>" + esc(money(p.amount)) +
        '</b><button type="button" class="line-remove" data-pay-remove="' + esc(p.id) + '" aria-label="Supprimer ce paiement" title="Supprimer">✕</button></li>';
    }).join("") + "</ul>" : '<p class="muted small">Aucun ' + (refund ? "remboursement" : "encaissement") + " enregistré.</p>";
    if (bal > 0.005) {
      html += '<form id="pay-form" class="fields" novalidate>' +
        '<div class="field"><label for="pay-date">Date</label><input type="date" id="pay-date" value="' + TODAY + '"></div>' +
        '<div class="field"><label for="pay-amount">Montant</label><div class="input-suffix"><input type="text" id="pay-amount" inputmode="decimal" value="' + esc(String(bal).replace(".", ",")) + '"><span>€</span></div></div>' +
        '<div class="field"><label for="pay-method">Moyen de paiement</label><select id="pay-method">' + options(Object.keys(E.METHODS).map(function (k) { return [k, E.METHODS[k]]; }), "virement") + "</select></div>" +
        '<div class="field"><label for="pay-note">Note (facultatif)</label><input type="text" id="pay-note" placeholder="Référence du virement…"></div>' +
        '<p class="form-error full" id="pay-error" role="alert" hidden></p>' +
        '<div class="full"><button type="submit" class="btn btn-primary btn-sm">' + (refund ? "Enregistrer le remboursement" : "Enregistrer l'encaissement") + "</button></div></form>";
    }
    return html + "</section>";
  }

  /** Envoi au client : le PDF à joindre, puis l'email prérempli (c'est la messagerie de l'utilisateur qui l'envoie). */
  function sendCard(d) {
    var to = recipient(d);
    return '<section class="card espace-card"><h3>Envoyer au client</h3>' +
      '<ol class="send-steps small"><li>Téléchargez le PDF.</li><li>Écrivez l\'email prérempli et joignez-y le PDF : ' +
      "un lien vers votre messagerie ne peut pas joindre de fichier.</li></ol>" +
      '<div class="espace-actions"><a class="btn btn-ghost btn-sm" id="d-send" href="' + esc(mailto(d, "send")) + '">Écrire l\'email</a></div>' +
      (to ? '<p class="small muted">À : ' + esc(to) + "</p>"
        : '<p class="small muted">Pas d\'email dans la fiche du client' +
          (client(d.clientId) ? ' : <a href="#/clients/' + esc(d.clientId) + '">l\'ajouter</a> pour le préremplir' : "") + ".</p>") +
      "</section>";
  }
  // ----- Facture électronique (Factur-X) : documentation/10-etude-factur-x.md --------------------------------------

  function facturxCard(d) {
    var avoir = d.type === "avoir";
    return '<section class="card espace-card"><h3>' + (avoir ? "Avoir" : "Facture") + " électronique (Factur-X)</h3>" +
      '<p class="small muted">Un seul fichier PDF/A-3 : le document lisible et ses données structurées (profil EN 16931, règles ' +
      "françaises), à déposer sur votre plateforme agréée ou à transmettre à votre client professionnel.</p>" +
      '<div class="espace-actions"><button type="button" class="btn btn-ghost btn-sm" id="d-facturx">Télécharger ' + (avoir ? "l'avoir" : "la facture") +
      ' électronique</button><button type="button" class="btn btn-ghost btn-sm" id="d-facturx-xml">Données seules (XML)</button></div>' +
      '<div class="small fx-status" id="fx-status" role="status" aria-live="polite"></div></section>';
  }

  /** Scripts déclarés dans #lazy-scripts (moteur PDF) : téléchargés en parallèle, exécutés dans l'ordre, une seule fois. */
  var lazy = null;
  function loadLazy() {
    if (lazy) return lazy;
    var el = $("lazy-scripts"), urls = el ? JSON.parse(el.textContent) : {};
    lazy = Promise.all(Object.keys(urls).map(function (name) {
      return new Promise(function (resolve, reject) {
        var tag = document.createElement("script");
        tag.src = urls[name];
        tag.async = false;
        tag.onload = resolve;
        tag.onerror = function () { tag.remove(); reject(new Error(name)); };
        document.head.appendChild(tag);
      });
    }));
    lazy.catch(function () { lazy = null; });
    return lazy;
  }

  /**
   * Document à exporter : coordonnées figées à l'émission, complétées quand elles manquent par les identifiants actuels
   * du profil et de la fiche client (SIRET, SIREN, pays, email, adresses électroniques, adresse avec code postal et ville).
   * Les montants, les lignes et les noms ne changent jamais.
   */
  function exportDoc(d, FX) {
    var snap = d.snapshot || {}, me = Object.assign({}, snap.me), cl = Object.assign({}, snap.client);
    var p = profile(), c = client(d.clientId) || {}, done = [];
    var fill = function (target, key, value, label) {
      if (!String(target[key] || "").trim() && String(value || "").trim()) { target[key] = value; done.push(label); }
    };
    fill(me, "siret", p.siret, "votre SIRET");
    fill(me, "endpoint", p.endpoint, "votre adresse de facturation électronique");
    if (!FX.address(me).postcode && FX.address({ address: p.address }).postcode) { me.address = p.address; done.push("votre adresse"); }
    // Lieu du client : celui retenu pour la TVA du document, figé avec lui.
    var place = (d.vat && d.vat.place) || cl.place || "fr";
    if (!cl.place) cl.place = place;
    fill(cl, "id", c.siren, "le SIREN du client");
    fill(cl, "country", place !== "fr" ? c.country : "", "le pays du client");
    fill(cl, "email", c.email, "l'email du client");
    fill(cl, "endpoint", c.endpoint, "l'adresse de facturation électronique du client");
    if (place === "fr" && !FX.address(cl).city && FX.address({ address: c.address }).city) { cl.address = c.address; done.push("l'adresse du client"); }
    return { doc: Object.assign({}, d, { snapshot: { me: me, client: cl } }), completed: done };
  }

  /** Logo (image enregistrée dans le profil) converti en JPEG sur fond blanc, ou null. */
  function logoJPEG(src) {
    if (!src) return Promise.resolve(null);
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        if (!img.naturalWidth || !img.naturalHeight) { resolve(null); return; }
        var scale = Math.min(1, 480 / img.naturalWidth, 240 / img.naturalHeight);
        var w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ jpeg: OFE.pdfa.base64(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]), width: w, height: h });
      };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function exportFacturX(d, xmlOnly, button) {
    var status = $("fx-status");
    button.disabled = true;
    status.textContent = "Préparation du fichier…";
    var loaded = false;
    loadLazy().then(function () {
      loaded = true;
      var FX = OFE.facturxFR, ex = exportDoc(d, FX), problems = FX.check(ex.doc);
      var base = String(d.number).replace(/[^A-Za-z0-9_-]/g, "-") + "-factur-x";
      var completed = ex.completed.length ? " Complété depuis vos fiches : " + ex.completed.join(", ") + "." : "";
      if (problems.length) {
        status.innerHTML = '<p class="form-error">Pour produire un fichier conforme :</p><ul>' +
          problems.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul><p><a href="#/reglages">Compléter mon profil</a>' +
          (client(d.clientId) ? ' · <a href="#/clients/' + esc(d.clientId) + '">Compléter la fiche client</a>' : "") + "</p>";
        return;
      }
      if (xmlOnly) {
        OF.download(FX.xml(ex.doc, data.documents, R, FMT), base + ".xml", "application/xml");
        status.textContent = "Données Factur-X (" + d.number + ") téléchargées." + completed;
        return;
      }
      return logoJPEG(ex.doc.snapshot.me.logo).then(function (logo) {
        var out = OFE.facturxPDF.build(ex.doc, data.documents, R, FMT, { fonts: OFE.pdfFonts, icc: OFE.pdfSRGB, logo: logo, now: new Date().toISOString() });
        OF.download(out.bytes, base + ".pdf", "application/pdf");
        status.textContent = docLabel(d) + " téléchargé" + (d.type === "facture" ? "e" : "") + " au format Factur-X (PDF/A-3 et données structurées)." + completed +
          (out.missing.length ? " Caractères absents de la police, remplacés par la lettre sans accent ou par « ? » : " + out.missing.join(" ") + "." : "");
      });
    }).catch(function (error) {
      if (window.console) console.error(error);
      status.textContent = loaded ? "Le fichier n'a pas pu être produit (" + (error && error.message || "erreur inconnue") + "). Signalez-nous le problème si cela se reproduit."
        : "Le module de facture électronique n'a pas pu être chargé : vérifiez votre connexion, puis réessayez.";
    }).then(function () { button.disabled = false; });
  }

  /** Destinataire : email de la fiche client actuelle, sinon celui figé à l'émission. */
  function recipient(d) {
    var c = client(d.clientId);
    return (c && c.email) || (parties(d).client || {}).email || "";
  }
  /** Lien mailto: (RFC 6068 : textes encodés, retours à la ligne en CRLF). */
  function mailto(d, kind) {
    var m = E.email(kind, d, data.documents, profile(), TODAY, FMT);
    var enc = function (text) { return encodeURIComponent(text.replace(/\r?\n/g, "\r\n")); };
    return "mailto:" + encodeURIComponent(recipient(d)).replace(/%40/g, "@") + "?subject=" + enc(m.subject) + "&body=" + enc(m.body);
  }

  function bindIssued(d) {
    $("d-print").addEventListener("click", function () { printDoc(d); });
    if ($("d-facturx")) {
      $("d-facturx").addEventListener("click", function () { exportFacturX(d, false, this); });
      $("d-facturx-xml").addEventListener("click", function () { exportFacturX(d, true, this); });
    }
    $("d-duplicate").addEventListener("click", function () {
      this.disabled = true;
      var copy = E.duplicate(d, TODAY, S.uid());
      copy.createdAt = copy.updatedAt = now();
      data.documents.push(copy);
      persist("Copie créée en brouillon.").then(function () { location.hash = "#/documents/" + copy.id; });
    });
    if ($("d-credit")) $("d-credit").addEventListener("click", function () {
      this.disabled = true;
      var credit = E.creditFromInvoice(d, TODAY, S.uid());
      credit.createdAt = credit.updatedAt = now();
      data.documents.push(credit);
      persist("Avoir créé en brouillon : ajustez les lignes si l'avoir est partiel.").then(function () { location.hash = "#/documents/" + credit.id; });
    });
    if ($("d-convert")) $("d-convert").addEventListener("click", function () {
      this.disabled = true;
      var inv = E.invoiceFromQuote(d, TODAY, S.uid());
      inv.createdAt = inv.updatedAt = now();
      d.status = d.status === "refused" ? "accepted" : d.status === "sent" ? "accepted" : d.status;
      d.invoiceId = inv.id;
      data.documents.push(inv);
      persist("Facture créée en brouillon à partir du devis.").then(function () { location.hash = "#/documents/" + inv.id; });
    });
    view.querySelectorAll("[data-quote]").forEach(function (b) {
      b.addEventListener("click", function () {
        d.status = b.getAttribute("data-quote");
        d.updatedAt = now();
        persist("Devis : " + STATES[d.status][0].toLowerCase() + ".").then(function () { render(true); });
      });
    });
    view.querySelectorAll("[data-pay-remove]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Supprimer ce paiement ? Il disparaîtra aussi du livre des recettes.")) return;
        d.payments = d.payments.filter(function (p) { return p.id !== b.getAttribute("data-pay-remove"); });
        d.updatedAt = now();
        persist("Paiement supprimé.").then(function () { render(true); });
      });
    });
    var form = $("pay-form");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pay = { id: S.uid(), date: $("pay-date").value, amount: Math.round((OF.num($("pay-amount").value) || 0) * 100) / 100,
                  method: $("pay-method").value, note: $("pay-note").value.trim() };
      var errors = E.checkPayment(d, pay, data.documents);
      if (errors.length) { showError("pay-error", errors.join(" ")); return; }
      d.payments = (d.payments || []).concat([pay]);
      d.updatedAt = now();
      persist((d.type === "avoir" ? "Remboursement" : "Encaissement") + " de " + money(pay.amount) + " enregistré.").then(function () { render(true); });
    });
  }

  // ----- Clients --------------------------------------------------------------------------------

  function viewClients(r) {
    var showArchived = r.params.archives === "1";
    var list = data.clients.filter(function (c) { return showArchived || !c.archived; })
      .sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || ""), "fr"); });
    var html = '<div class="espace-head"><h2>Clients</h2><div class="espace-quick espace-noprint"><a class="btn btn-primary btn-sm" href="#/clients/nouveau">+ Client</a></div></div>';
    if (!list.length) {
      html += '<div class="card espace-card"><p class="muted">Pas encore de client. Créez votre premier client pour lui faire un devis ou une facture.</p>' +
        '<a class="btn btn-primary btn-sm" href="#/clients/nouveau">Créer un client</a></div>';
    } else {
      html += '<div class="card espace-card"><ul class="doc-list">' + list.map(function (c) {
        var t = E.clientTotals(data.documents, c.id);
        return '<li><a href="#/clients/' + esc(c.id) + '"><span class="dl-main"><b>' + esc(c.name) + (c.archived ? " (archivé)" : "") + '</b><span class="small muted">' +
          esc([c.pro ? "Professionnel" : "Particulier", c.email].filter(Boolean).join(" · ")) + '</span></span><span class="dl-side"><b>' + esc(money(t.cashed)) +
          '</b><span class="small muted">' + (t.due > 0 ? "reste " + esc(money(t.due)) : "encaissé") + "</span></span></a></li>";
      }).join("") + "</ul>" +
        '<p class="small"><a href="#/clients' + (showArchived ? "" : "?archives=1") + '">' + (showArchived ? "Masquer les clients archivés" : "Afficher les clients archivés") + "</a></p></div>";
    }
    view.innerHTML = html;
  }

  function viewClientForm(r) {
    var isNew = r.id === "nouveau";
    var c = isNew ? { id: S.uid(), name: "", pro: true, place: "fr" } : client(r.id);
    if (!c) { view.innerHTML = '<div class="espace-head"><h2>Client introuvable</h2></div><p><a href="#/clients">Retour aux clients</a></p>'; return; }
    var back = r.params.retour;
    var docs = isNew ? [] : data.documents.filter(function (d) { return d.clientId === c.id; });
    view.innerHTML = '<div class="espace-head"><h2>' + (isNew ? "Nouveau client" : esc(c.name)) + "</h2></div>" +
      '<form class="card espace-card" id="client-form" novalidate><div class="fields">' +
      field("name", "Nom ou raison sociale", c.name, { required: true, placeholder: "Studio Nova" }) +
      field("pro", "Type de client", c.pro ? "1" : "0", { options: [["1", "Professionnel (entreprise, association…)"], ["0", "Particulier"]], half: true }) +
      field("place", "Pays du client", c.place || "fr", { options: [["fr", "France"], ["eu", "Autre pays de l'Union européenne"], ["world", "Hors de l'Union européenne"]], half: true }) +
      '<div class="full fields" id="client-country"' + (c.place && c.place !== "fr" ? "" : " hidden") + ">" +
      field("country", "Pays", c.country || "", { options: countryOptions(c.place), half: true }) + "</div>" +
      field("address", "Adresse", c.address, { textarea: true }) +
      field("siren", "SIREN", c.siren, { half: true, placeholder: "812 345 678", hint: "Obligatoire sur les factures aux entreprises avec la facturation électronique." }) +
      field("vat", "N° de TVA intracommunautaire", c.vat, { half: true }) +
      field("email", "Email", c.email, { type: "email", half: true }) +
      field("endpoint", "Adresse de facturation électronique (facultatif)", c.endpoint, { half: true, placeholder: "Son SIREN par défaut",
        hint: "Client en France : par défaut son SIREN ; indiquez celle qu'il vous a communiquée s'il en a plusieurs. Client à l'étranger : l'email où il reçoit ses factures (par défaut, son email)." }) +
      field("delivery", "Adresse de livraison (si différente)", c.delivery, { textarea: true }) +
      field("notes", "Notes internes", c.notes, { textarea: true }) +
      '</div><p class="form-error" id="client-error" role="alert" hidden></p><div class="espace-actions">' +
      '<button type="submit" class="btn btn-primary">' + (isNew ? "Créer le client" : "Enregistrer") + "</button>" +
      (isNew ? "" : '<a class="btn btn-ghost" href="#/documents/nouveau?type=facture&client=' + esc(c.id) + '">Nouvelle facture</a>' +
        '<button type="button" class="btn btn-ghost" id="client-archive">' + (c.archived ? "Réactiver" : "Archiver") + "</button>") +
      "</div></form>" + (docs.length ? '<section class="card espace-card"><h3>Documents de ce client</h3>' + docTable(docs) + "</section>" : "");
    var form = $("client-form");
    form.elements.place.addEventListener("change", function () {
      var place = form.elements.place.value;
      $("client-country").hidden = place === "fr";
      if (place !== "fr") form.elements.country.innerHTML = options(countryOptions(place), form.elements.country.value);
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      if (!f.name.value.trim()) { showError("client-error", "Indiquez le nom du client."); f.name.focus(); return; }
      ["name", "address", "siren", "vat", "email", "delivery", "notes", "endpoint"].forEach(function (k) { c[k] = f[k].value.trim(); });
      c.pro = f.pro.value === "1";
      c.place = f.place.value;
      c.country = c.place === "fr" ? "" : f.country.value;
      var endpointError = c.place === "fr" ? checkEndpoint(c.endpoint, c.siren, "le SIREN du client")
        : c.endpoint && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.endpoint) ? "Client à l'étranger : son adresse de facturation électronique est une adresse email." : "";
      if (endpointError) { showError("client-error", endpointError); f.endpoint.focus(); return; }
      c.updatedAt = now();
      if (isNew) { c.createdAt = c.updatedAt; data.clients.push(c); }
      // Les brouillons de ce client suivent ses nouvelles coordonnées (TVA selon le pays) ; les documents émis restent figés.
      data.documents.forEach(function (d) { if (d.clientId === c.id && d.status === "draft") d.vat = Object.assign(vatFor(c), { rate: d.vat.rate }); });
      if (back && draftInMemory && draftInMemory.id === back) { draftInMemory.clientId = c.id; draftInMemory.vat = vatFor(c); }
      var target = back && doc(back) ? doc(back) : null;
      if (target) { target.clientId = c.id; target.vat = Object.assign(vatFor(c), { rate: target.vat.rate }); }
      persist(isNew ? "Client créé." : "Client enregistré.").then(function () {
        if (!back) location.hash = "#/clients";
        else if (target) location.hash = "#/documents/" + back;
        else if (draftInMemory && draftInMemory.routeKey) location.hash = "#" + draftInMemory.routeKey;
        else location.hash = "#/documents";
      });
    });
    if ($("client-archive")) $("client-archive").addEventListener("click", function () {
      c.archived = !c.archived;
      c.updatedAt = now();
      persist(c.archived ? "Client archivé." : "Client réactivé.").then(function () { location.hash = "#/clients"; });
    });
  }

  // ----- Livre des recettes -------------------------------------------------------------------------

  function viewLedger(r) {
    var years = {};
    years[YEAR] = true;
    data.documents.forEach(function (d) { (d.payments || []).forEach(function (p) { years[p.date.slice(0, 4)] = true; }); });
    var year = r.params.annee && years[r.params.annee] ? r.params.annee : YEAR;
    var rows = E.ledger(data.documents, year + "-01-01", year + "-12-31");
    var sum = rows.reduce(function (s, x) { return s + x.amount; }, 0);
    view.innerHTML = '<div class="espace-head"><h2>Livre des recettes ' + esc(year) + '</h2><div class="espace-quick espace-noprint">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="ledger-csv"' + (rows.length ? "" : " disabled") + ">Exporter (CSV)</button>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="ledger-print"' + (rows.length ? "" : " disabled") + ">Imprimer</button></div></div>" +
      '<div class="card espace-card"><div class="espace-filters espace-noprint" role="group" aria-label="Année">' +
      Object.keys(years).sort().reverse().map(function (y) { return '<a class="tab" href="#/recettes?annee=' + y + '"' + (y === year ? ' aria-current="true"' : "") + ">" + y + "</a>"; }).join("") + "</div>" +
      (rows.length ? '<table class="ledger"><thead><tr><th>Date</th><th>Client</th><th>Nature</th><th>Moyen</th><th>Référence</th><th class="num">Montant</th></tr></thead><tbody>' +
        rows.map(function (x) {
          return '<tr><td class="c-date">' + day(x.date) + '</td><td class="c-client">' + esc(x.client) + '</td><td class="c-nature">' + esc(x.nature) +
            '</td><td class="c-method">' + esc(x.method) + '</td><td class="c-ref"><a href="#/documents/' + esc(x.docId) + '">' + esc(x.ref) +
            '</a></td><td class="num">' + esc(money(x.amount)) + "</td></tr>";
        }).join("") + '</tbody><tfoot><tr><td colspan="5">Total encaissé en ' + esc(year) + '</td><td class="num">' + esc(money(sum)) + "</td></tr></tfoot></table>"
        : '<p class="muted">Aucun encaissement en ' + esc(year) + ". Les encaissements enregistrés sur vos factures apparaissent ici automatiquement.</p>") +
      '<p class="small muted">Tenu par date d\'encaissement : date, client, nature, montant, moyen de paiement et référence de la facture. ' +
      "Conservez-le avec vos factures pendant " + R.conservation_pieces.commerce_annees + " ans.</p></div>";
    if (!rows.length) return;
    $("ledger-csv").addEventListener("click", function () {
      OF.download("﻿" + E.ledgerCSV(rows), "livre-des-recettes-" + year + ".csv", "text/csv;charset=utf-8");
    });
    $("ledger-print").addEventListener("click", function () {
      document.body.classList.add("print-ledger");
      window.print();
      document.body.classList.remove("print-ledger");
    });
  }

  // ----- Réglages et sauvegarde -------------------------------------------------------------------------

  function importControl() {
    return '<div class="field"><label for="import-file">Fichier de sauvegarde</label><input type="file" id="import-file" accept="application/json,.json"></div>' +
      '<p class="form-error" id="import-error" role="alert" hidden></p>';
  }
  function bindImport() {
    $("import-file").addEventListener("change", function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var incoming;
        try { incoming = JSON.parse(reader.result); } catch (e) { showError("import-error", "Ce fichier n'est pas lisible."); return; }
        var problem = S.validate(incoming);
        if (problem) { showError("import-error", problem); return; }
        var n = incoming.documents.length, k = incoming.clients.length;
        if (!confirm("Remplacer les données de cet appareil par cette sauvegarde (" + countText(n, "document", "documents") + ", " + countText(k, "client", "clients") + ") ?")) return;
        data = S.normalise(incoming);
        persist("Sauvegarde restaurée.").then(function () { location.hash = "#/"; render(); });
      };
      reader.readAsText(file);
    });
  }

  function viewSettings() {
    var last = data.settings.lastExport;
    view.innerHTML = '<div class="espace-head"><h2>Réglages</h2></div>' +
      (data.profile ? profileForm(profile(), false) : '<p class="notice">Créez d\'abord votre profil depuis l\'<a href="#/">accueil de l\'espace</a>.</p>') +
      '<section class="card espace-card"><h3>Sauvegarde</h3>' +
      "<p>Vos données sont enregistrées dans ce navigateur, sur cet appareil" + (S.mode() === "local" ? " (stockage local)" : "") +
      ". Exportez régulièrement une sauvegarde : elle permet aussi de changer d'appareil.</p>" +
      '<p class="small muted">Dernière sauvegarde : ' + (last ? day(last.slice(0, 10)) : "jamais") + ".</p>" +
      '<div class="espace-actions"><button type="button" class="btn btn-primary btn-sm" id="export-btn">Exporter une sauvegarde</button></div>' +
      "<h4>Restaurer une sauvegarde</h4>" + importControl() +
      '<h4>Effacer</h4><p class="small muted">Supprime toutes les données de l\'Espace sur cet appareil. Exportez d\'abord une sauvegarde.</p>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="wipe-btn">Tout effacer</button></section>';
    if (data.profile) bindProfileForm(false);
    bindImport();
    $("export-btn").addEventListener("click", function () {
      data.settings.lastExport = now();
      persist("Sauvegarde exportée.").then(function () {
        OF.download(JSON.stringify(data, null, 1), "espace-entrepreneur-" + TODAY + ".json", "application/json");
        render(true);
      });
    });
    $("wipe-btn").addEventListener("click", function () {
      if (!confirm("Effacer toutes les données de l'Espace sur cet appareil ? Cette action est définitive.")) return;
      data = S.empty();
      persist("Données effacées.").then(function () { location.hash = "#/"; render(); });
    });
  }

  // ----- Démarrage -----------------------------------------------------------------------------------

  window.addEventListener("hashchange", function () {
    if (pendingSave) pendingSave();
    editing = null;
    render();
  });
  // Modification enregistrée dans un autre onglet, ou reçue par la synchronisation des comptes : reprendre les données,
  // en gardant le brouillon en cours d'édition ici.
  function reload() {
    S.load().then(function (fresh) {
      if (editing) {
        var kept = false;
        fresh.documents = fresh.documents.map(function (x) { if (x.id === editing.id) { kept = true; return editing; } return x; });
        if (!kept && doc(editing.id)) fresh.documents.push(editing);
      }
      data = fresh;
      var active = document.activeElement;
      if (!(active && view.contains(active) && /INPUT|TEXTAREA|SELECT/.test(active.tagName))) render(true);
    });
  }
  S.onChange(reload);
  window.addEventListener("of-espace-saved", function (e) { if (e.detail && e.detail.origin === "sync") reload(); });
  S.load().then(function (loaded) {
    data = loaded;
    app.removeAttribute("data-loading");
    render(true);
  });
})();
