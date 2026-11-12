/*
 * Espace entrepreneur (France, version locale) : application d'une page.
 * Spécification : documentation/09-specification-espace.md. Calculs : OFE.espaceFR et OFE.invoiceFR.
 * Stockage : window.EspaceStore (IndexedDB). Écrans : #/ (tableau de bord), #/documents, #/documents/<id>,
 * #/clients, #/clients/<id>, #/recettes, #/depenses, #/depenses/<id> (documentation/36-depenses-et-registre-des-achats.md),
 * #/temps, #/temps/<id>, #/temps/facturer?client=<id> (documentation/37-temps-passe.md),
 * #/prospects, #/prospects/<id> (documentation/38-prospects.md), #/tresorerie, #/tresorerie/<id> (documentation/39-tresorerie.md),
 * #/echeances, #/reglages, #/importer (document venu du générateur public).
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES, S = window.EspaceStore;
  var app = document.getElementById("espace-app");
  if (!app || !OFE || !OFE.espaceFR || !R || !S) return;
  var E = OFE.espaceFR, INV = OFE.invoiceFR, ST = OFE.espaceStats;
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
  /** Seconde activité possible (activité mixte, documentation/53) : la vente avec une activité de services. */
  function activity2Options(activity) {
    var none = [["", "Aucune"]];
    if (activity === "vente") return none.concat(ACTIVITIES.filter(function (a) { return a[0] !== "vente" && a[0] !== "real"; }));
    if (R.micro_activities[activity]) return none.concat(ACTIVITIES.filter(function (a) { return a[0] === "vente"; }));
    return none;
  }
  /** Profil en activité mixte (ventes et prestations suivies séparément). */
  function isMixed() { return !!E.mixedActivities(profile(), R); }
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
    drawCharts = null; // chaque vue qui a des graphiques fournit sa fonction de dessin (redessin au changement de taille)
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
                  clients: r.id ? viewClientForm : viewClients, recettes: viewLedger, depenses: r.id ? viewExpenseForm : viewExpenses,
                  temps: r.id === "facturer" ? viewTimeInvoice : r.id ? viewTimeForm : viewTime,
                  prospects: r.id ? viewProspectForm : viewProspects,
                  tresorerie: r.id ? viewChargeForm : viewTreasury,
                  echeances: viewDeadlines, reglages: viewSettings,
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
      "<p>Clients, devis, factures, encaissements, temps passé, livre des recettes, dépenses et déclarations Urssaf : tout au même endroit. " +
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
      (opts.list ? ' list="' + opts.list + '"' : "") +
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
      field("activity2", "Seconde activité (activité mixte)", p.activity2 || "", { options: activity2Options(p.activity),
        hint: "Vente de marchandises et prestations de services : plafonds, cotisations et livre des recettes suivis par activité." }) +
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
      var second = form.elements.activity2, keep = second.value;
      second.innerHTML = options(activity2Options(form.elements.activity.value), keep);
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
      p.activity2 = E.mixedActivities({ activity: p.activity, activity2: f.activity2.value }, R) ? f.activity2.value : "";
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
    html += profileReminder() + purchasesReminder() + timeReminder() + prospectsReminder() + treasuryReminder() + backupReminder();
    // Indicateurs et graphiques (documentation/55-indicateurs-espace.md, § 2) : comparaison avec l'an dernier à la même date.
    var td = ST.toDate(data.documents, TODAY), prevYear = String(+YEAR - 1);
    var versus = function (x, what) {
      return x.change === null ? (x.prev ? "" : what + " : rien d'encaissé") : (x.change >= 0 ? "+" : "−") + OF.fmt(Math.abs(x.change)) + " % par rapport à " + what;
    };
    html += '<div class="kpis kpis-4">' +
      kpi("Encaissé en " + YEAR, money(year), [countText(E.ledger(data.documents, YEAR + "-01-01", YEAR + "-12-31").filter(function (x) { return x.amount > 0; }).length,
        "encaissement", "encaissements"), versus(td.year, prevYear + " à la même date")].filter(Boolean).join(" · ")) +
      kpi("Encaissé ce mois-ci", money(td.month.now), versus(td.month, "l'an dernier à la même date") || "l'an dernier à la même date : " + money(td.month.prev)) +
      kpi("À encaisser", money(openSum), open.length ? countText(open.length, "facture", "factures") + (late.length ? ", dont " + late.length + " en retard" : "") : "Aucune facture en attente", late.length ? "is-warn" : "") +
      (decl ? kpi("Déclaration Urssaf : " + decl.period.label, money(decl.revenue),
        "À déclarer avant le " + longDay(decl.due) + " · cotisations estimées " + money(decl.total) + (decl.open ? " (période en cours)" : ""), "is-brand")
        : kpi("Devis en attente", String(quotes.length), quotes.length ? money(quotes.reduce(function (s, d) { return s + E.total(d); }, 0)) + " au total" : "Aucun devis envoyé en attente")) +
      "</div>";

    if (isMicro()) html += gauges(th);
    var series = ST.monthly(data.documents, TODAY, 12), top = ST.topClients(data.documents, ST.since12(TODAY), TODAY, 5);
    html += '<div class="espace-cols tr-charts"><section class="card espace-card"><div class="card-head"><h3>Encaissements par mois</h3>' +
      '<span class="small muted">12 derniers mois, comparés au même mois un an plus tôt.</span></div><div class="chart" data-chart="monthly"></div>' +
      OF.charts.legend([{ cls: "is-cur", label: "12 derniers mois" }, { cls: "is-prev", label: "Un an plus tôt" }]) +
      OF.charts.table("Encaissements par mois", ["Mois", "Encaissé", "Un an plus tôt"], series.map(function (m) {
        return [m.label + (m.current ? " (en cours)" : ""), money(m.amount), money(m.prev)];
      })) + "</section>" + topClientsCard(top) + "</div>";
    html += '<div class="espace-cols">' + treasuryCard() + '<section class="card espace-card"><h3>Prochaines échéances</h3>' + deadlinesList(4) +
      '<p class="small"><a href="#/echeances">Toutes les échéances →</a></p></section></div>' +
      '<section class="card espace-card"><h3>Derniers documents</h3>' + docTable(recentDocs(5), true) +
      '<p class="small"><a href="#/documents">Tous les documents →</a></p></section>';
    if (decl) {
      var pct = function (r) { return OF.fmt(Math.round(r * 1000) / 10) + " %"; };
      html += '<p class="small muted espace-note">' + (decl.mixed
        // Activité mixte : chaque part au taux de son activité ; formation professionnelle au plus élevé des deux taux.
        ? "Estimation : ventes " + esc(money(decl.parts[0].revenue)) + " × " + pct(decl.parts[0].rates.social + decl.parts[0].rates.cfp) +
          " et prestations " + esc(money(decl.parts[1].revenue)) + " × " + pct(decl.parts[1].rates.social + decl.parts[1].rates.cfp) +
          (decl.rates.acre ? " (ACRE)" : "") +
          (decl.rates.vl ? " + versement libératoire " + pct(decl.parts[0].rates.vl) + " et " + pct(decl.parts[1].rates.vl) : "") +
          " ; formation professionnelle au taux le plus élevé de vos deux activités"
        : "Estimation : chiffre d'affaires encaissé de la période × " + pct(decl.rates.social + decl.rates.cfp) + (decl.rates.acre ? " (ACRE)" : "") +
          (decl.rates.vl ? " + versement libératoire " + pct(decl.rates.vl) : "")) +
        '. Déclarez et payez sur <a href="https://www.autoentrepreneur.urssaf.fr/" rel="noopener">autoentrepreneur.urssaf.fr</a>.</p>';
    }
    view.innerHTML = html;
    drawCharts = function () {
      var el = view.querySelector('[data-chart="monthly"]');
      if (!el) return;
      el.innerHTML = OF.charts.bars({ width: Math.floor(el.getBoundingClientRect().width) || 600,
        groups: series.map(function (m) { return { key: m.key, label: m.label, values: [m.amount, m.prev], future: false }; }),
        series: [{ name: "12 derniers mois", cls: "is-cur" }, { name: "Un an plus tôt", cls: "is-prev" }],
        title: "Encaissements par mois", desc: "12 derniers mois : " + money(series.reduce(function (s, m) { return s + m.amount; }, 0)) +
          " ; même période un an plus tôt : " + money(series.reduce(function (s, m) { return s + m.prev; }, 0)) + "." });
    };
    drawCharts();
  }

  /** Principaux clients sur 12 mois (encaissements nets) : barres, part et reste ; constat de dépendance au premier client. */
  function topClientsCard(top, onClientsPage) {
    var pct = function (x) { return OF.fmt(Math.round(x * 100)) + " %"; };
    var max = top.rows.length ? top.rows[0].amount : 0;
    var row = function (name, href, amount, share) {
      return '<li><span class="bl-name">' + (href ? '<a href="' + href + '">' + esc(name) + "</a>" : esc(name)) + '</span><span class="bl-bar" aria-hidden="true"><span style="width:' +
        (max > 0 ? Math.max(1, amount / max * 100).toFixed(1) : 0) + '%"></span></span><b class="bl-amount">' + esc(money(amount)) + '</b><span class="bl-share">' + pct(share) + "</span></li>";
    };
    return '<section class="card espace-card"><div class="card-head"><h3>Principaux clients</h3><span class="small muted">Encaissements des 12 derniers mois : ' +
      esc(money(top.total)) + ".</span></div>" + (top.rows.length ? '<ul class="bar-list">' + top.rows.map(function (r) {
        return row(r.name, r.clientId !== "?" && client(r.clientId) ? "#/clients/" + encodeURIComponent(r.clientId) : "", r.amount, r.share);
      }).join("") + (top.others.count ? row("Autres clients (" + top.others.count + ")", "", top.others.amount, top.others.share) : "") + "</ul>" +
      (top.rows[0].share >= 0.5 ? '<p class="small muted">Votre premier client représente ' + pct(top.rows[0].share) + " de vos encaissements des 12 derniers mois.</p>" : "") :
      '<p class="small muted">Aucun encaissement sur les 12 derniers mois.</p>') + (onClientsPage ? "" : '<p class="small"><a href="#/clients">Tous les clients →</a></p>') + "</section>";
  }

  /** Résumé de la trésorerie : disponible, point bas sur 6 mois, versement possible (documentation/39, § 7). */
  function treasuryCard() {
    if (!hasCash()) {
      return '<section class="card espace-card"><h3>Trésorerie</h3><p class="small muted">Indiquez le solde de votre compte professionnel pour savoir ce qui est ' +
        'vraiment disponible, jusqu\'où il descendra et combien vous pouvez vous verser.</p><p class="small"><a href="#/tresorerie">Ouvrir la trésorerie →</a></p></section>';
    }
    var o = E.owed(treasuryInput()), f = E.forecast(treasuryInput()), c = E.balanceCurve(f), limit = threshold();
    var line = function (label, value, cls) { return "<li><span>" + esc(label) + '</span><b class="' + (cls || "") + '">' + esc(value) + "</b></li>"; };
    return '<section class="card espace-card"><h3>Trésorerie</h3><ul class="tr-summary">' +
      line("Disponible", money(f.start - o.total), f.start - o.total < 0 ? "is-bad" : "") +
      line("Point bas prévu (6 mois)", money(c.low.balance) + (c.low.date === TODAY ? "" : " le " + day(c.low.date)), c.low.balance < limit ? "is-bad" : "") +
      line("Versement possible", money(E.safeAmount(c, limit))) + "</ul>" +
      '<p class="small"><a href="#/tresorerie">Voir la trésorerie →</a></p></section>';
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
    if (th.services) {
      html += gauge("Part des prestations de services (" + YEAR + ")", th.services.revenue, th.services.ceiling,
        th.services.revenue > th.services.ceiling ? "Plafond des prestations dépassé : au-delà de deux années de dépassement, vous sortez de la micro-entreprise." : "");
    }
    if (th.vat && th.vat.mixed) {
      // Activité mixte (BOFiP, BOI-TVA-DECLA-40-10-10, § 160) : deux seuils ; seuils majorés de l'année en cours non
      // précisés pour l'activité mixte (BOI-TVA-DECLA-40-10-10 et 40-10-20 lus le 10/11/2026) : non affirmés (documentation/53).
      var over = th.revenue > th.vat.base || th.services.revenue > th.vat.servicesBase;
      html += gauge("Franchise de TVA : chiffre d'affaires global", th.revenue, th.vat.base, "") +
        gauge("Franchise de TVA : prestations de services", th.services.revenue, th.vat.servicesBase,
          over ? "Seuil dépassé : la TVA sera due au plus tard à partir du 1er janvier prochain, et dès le jour du dépassement si un seuil majoré est franchi." : "");
      html += '<p class="small muted" style="margin: 6px 0 0;">Activité mixte : la franchise demande que ni le chiffre d\'affaires global ni la part des prestations ne dépasse son seuil. ' +
        'Les seuils majorés de l\'année en cours ne sont pas précisés pour l\'activité mixte par la doctrine fiscale (BOFiP) : votre service des impôts des entreprises peut vous répondre.</p>';
    } else if (th.vat) {
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

  /** Vente de marchandises : registre des achats obligatoire (règle registre_achats) ; rappel tant que rien n'est saisi. */
  function purchasesReminder() {
    if (!E.purchasesRequired(profile(), R.registre_achats, R)) return "";
    if (E.expenseRows(data.expenses, YEAR + "-01-01", YEAR + "-12-31").rows.length) return "";
    return '<p class="notice espace-noprint">Vente de marchandises : tenez votre <b>registre des achats</b>, obligatoire avec le livre des recettes. ' +
      '<a href="#/depenses">Saisir vos achats</a></p>';
  }

  /** Temps à facturer (documentation/37-temps-passe.md) : montant et nombre de clients. */
  function timeReminder() {
    var due = E.unbilledByClient(data.timeEntries, data.documents);
    if (!due.length) return "";
    var sum = due.reduce(function (s, c) { return s + c.amount; }, 0), missing = due.some(function (c) { return c.missingRate; });
    return '<p class="notice espace-noprint">Temps à facturer : ' + (sum > 0 ? "<b>" + esc(money(sum)) + "</b>" + (missing ? " et du temps sans taux" : "") : "du temps sans taux") +
      ", pour " + countText(due.length, "client", "clients") + '. <a href="#/temps">Facturer le temps passé</a></p>';
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
  function inDays(n) { return n === 0 ? "aujourd'hui" : n === 1 ? "demain" : "dans " + n + " jours"; }
  function deadlinesList(limit) {
    var list = matchingEvents().slice(0, limit || 999);
    if (!list.length) return '<p class="muted">Aucune échéance à venir.</p>';
    return '<ul class="espace-deadlines">' + list.map(function (e) {
      var n = OF.daysBetween(TODAY, e.date);
      return '<li><span class="dl-date">' + esc(OF.date(e.date, { day: "numeric", month: "short" })) + '</span><span class="dl-body"><b>' +
        esc(e.title) + '</b><span class="small muted">' + inDays(n) +
        (e.est ? " · date estimée" : "") + "</span></span></li>";
    }).join("") + "</ul>";
  }
  // Catégorie d'une échéance pour la frise et la liste : forme et couleur (documentation/55, § 5.5).
  var DEADLINE_CLASSES = { Urssaf: ["is-dl-urssaf", "Urssaf"], TVA: ["is-dl-vat", "TVA"], CFE: ["is-dl-tax", "Impôts (CFE, impôt)"], "Impôt": ["is-dl-tax", "Impôts (CFE, impôt)"] };
  var deadlineClass = function (e) { return (DEADLINE_CLASSES[e.tag] || ["is-dl-info", "Information, option"])[0]; };

  function viewDeadlines() {
    var p = profile();
    // 90 jours tiennent toujours dans 5 mois commencés : la trésorerie fournit les montants estimés aux mêmes dates.
    var f = E.forecast(treasuryInput({ months: 5 })), dl = ST.deadlines(matchingEvents(), f.items, TODAY, 90);
    var vatNote = p.vatRegime === "franchise" ? "franchise en base : pas de TVA à reverser" :
      p.vatRegime === "simplified" && (p.vatLastYear === undefined || p.vatLastYear === null || p.vatLastYear === "") ? "indiquez la TVA de l'an dernier dans la trésorerie" : "";
    var amountText = function (e) { return e.amount === null ? "" : money(e.amount); };
    var tags = {};
    dl.soon.forEach(function (e) { var c = DEADLINE_CLASSES[e.tag] || ["is-dl-info", "Information, option"]; tags[c[0]] = c[1]; });
    view.innerHTML = '<div class="espace-head"><h2>Échéances</h2></div>' +
      '<div class="kpis kpis-4">' +
      kpi("Prochaine échéance", dl.next ? inDays(dl.next.days) : "–", dl.next ? dl.next.title + " · " + day(dl.next.date) + (dl.next.est ? " (date estimée)" : "") : "aucune échéance à venir") +
      kpi("Dans les 90 jours", String(dl.soon.length), "jusqu'au " + day(dl.end)) +
      kpi("Cotisations estimées", isMicro() ? money(dl.urssaf) : "–", isMicro() ? "à payer dans les 90 jours" : "estimées pour la micro-entreprise seulement") +
      kpi("TVA estimée", vatNote ? "–" : money(dl.vat), vatNote || "à reverser dans les 90 jours") + "</div>" +
      '<p class="small muted">Montants estimés comme dans la <a href="#/tresorerie">trésorerie</a> : sur vos encaissements, les factures en attente et le ' +
      "chiffre d'affaires prévu. Ils ne remplacent pas vos déclarations.</p>" +
      '<section class="card espace-card espace-noprint"><div class="card-head"><h3>Les 90 prochains jours</h3><span class="small muted">Hauteur : montant estimé ; ' +
      "repères sous l'axe : échéances sans montant.</span></div>" +
      (dl.soon.length ? '<div class="chart" data-chart="deadlines"></div>' +
        OF.charts.legend(Object.keys(tags).map(function (k) { return { cls: k, label: tags[k] }; })) +
        OF.charts.table("Échéances des 90 prochains jours", ["Date", "Échéance", "Montant estimé"], dl.soon.map(function (e) { return [day(e.date), e.title, amountText(e) || "–"]; }))
        : '<p class="muted">Aucune échéance dans les 90 prochains jours.</p>') + "</section>" +
      '<section class="card espace-card"><h3>Toutes les échéances</h3><p class="muted">Échéances des 12 prochains mois selon votre profil (déclaration ' +
      (p.periodicity === "monthly" ? "mensuelle" : "trimestrielle") + ", " + ({ franchise: "franchise en base de TVA", simplified: "réel simplifié de TVA", normal: "réel normal de TVA" }[p.vatRegime] ||
        "régime de TVA non précisé") + ").</p>" +
      (dl.events.length ? '<ul class="espace-deadlines">' + dl.events.slice(0, 40).map(function (e) {
        return '<li><span class="dl-date">' + esc(OF.date(e.date, { day: "numeric", month: "short" })) + '</span><span class="dl-body"><b>' + esc(e.title) +
          '</b><span class="small muted">' + inDays(e.days) + (e.est ? " · date estimée" : "") + "</span></span>" +
          (e.amount !== null ? '<span class="dl-amount"><b>' + esc(money(e.amount)) + '</b><span class="small muted">estimé</span></span>' : "") + "</li>";
      }).join("") + "</ul>" : '<p class="muted">Aucune échéance à venir.</p>') +
      '<p class="small"><a href="../calendrier-fiscal-auto-entrepreneur/">Calendrier fiscal complet et export vers votre agenda →</a></p></section>';
    drawCharts = function () {
      var el = view.querySelector('[data-chart="deadlines"]');
      if (!el) return;
      var plain = dl.soon.filter(function (e) { return e.amount === null; }).length, priced = dl.soon.length - plain;
      el.innerHTML = OF.charts.timeline({ width: Math.floor(el.getBoundingClientRect().width) || 600, from: TODAY, to: dl.end,
        events: dl.soon.map(function (e) { return { date: e.date, amount: e.amount, cls: deadlineClass(e) }; }), title: "Échéances des 90 prochains jours",
        desc: countText(dl.soon.length, "échéance", "échéances") + " jusqu'au " + day(dl.end) + (priced ? ", dont " + priced + " avec un montant estimé (" +
          money(dl.urssaf + dl.vat) + " au total)" : "") + "." });
    };
    drawCharts();
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
    // Adresse de l'onglet : filtre, recherche et période gardés ensemble (documentation/55, § 8).
    var url = function (over) {
      var o = Object.assign({ filtre: filter, q: r.params.q || "", periode: r.params.periode || "" }, over);
      var parts = [["filtre", o.filtre !== "tous" ? o.filtre : ""], ["q", o.q], ["periode", ST.PERIODS.indexOf(o.periode) > -1 && o.periode !== "annee" ? o.periode : ""]]
        .filter(function (x) { return x[1]; }).map(function (x) { return x[0] + "=" + encodeURIComponent(x[1]); });
      return "#/documents" + (parts.length ? "?" + parts.join("&") : "");
    };
    view.innerHTML = '<div class="espace-head"><h2>Documents</h2><div class="espace-quick espace-noprint">' +
      '<a class="btn btn-primary btn-sm" href="#/documents/nouveau?type=facture">+ Facture</a>' +
      '<a class="btn btn-ghost btn-sm" href="#/documents/nouveau?type=devis">+ Devis</a></div></div>' + documentsOverview(r, url) +
      '<div class="card espace-card"><div class="espace-filters" role="group" aria-label="Filtrer les documents">' +
      FILTERS.map(function (f) { return '<a class="tab" href="' + url({ filtre: f[0] }) + '"' + (f[0] === filter ? ' aria-current="true"' : "") + ">" + esc(f[1]) + "</a>"; }).join("") +
      '</div><div class="field"><label for="doc-search">Rechercher</label><input id="doc-search" type="search" value="' + esc(r.params.q || "") +
      '" placeholder="Numéro, client, prestation…"></div>' + docTable(list) + "</div>";
    drawCharts = function () { drawInvoicedChart("invoiced", documentsMonths(ST.period(r.params.periode, TODAY))); };
    drawCharts();
    var input = $("doc-search");
    input.addEventListener("input", function () {
      clearTimeout(input.t);
      input.t = setTimeout(function () {
        history.replaceState(null, "", url({ q: input.value }));
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
        if (draftInMemory.type === "devis" && prospect(r.params.piste)) draftInMemory.prospectId = r.params.piste;
        draftInMemory.routeKey = r.key;
      }
      d = draftInMemory;
    } else {
      d = doc(r.id);
      if (!d) { view.innerHTML = '<div class="espace-head"><h2>Document introuvable</h2></div><p><a href="#/documents">Retour aux documents</a></p>'; return; }
    }
    if (d.status === "draft") renderDraft(d); else renderIssued(d);
  }

  var LINE_UNITS = [["", "Aucune"], ["hour", "Heure"], ["day", "Jour"]];
  var LINE_KINDS = [["", "À préciser"], ["biens", "Vente"], ["services", "Service"]];
  function linesHTML(d) {
    var mixed = d.nature === "mixte";
    return d.lines.map(function (l, i) {
      return '<div class="line-row has-unit' + (mixed ? " has-kind" : "") + '" data-line="' + i + '">' +
        (mixed ? '<div class="field line-kind"><label for="ln-kind-' + i + '">Nature</label><select id="ln-kind-' + i + '" data-k="kind">' +
          options(LINE_KINDS, l.kind || "") + "</select></div>" : "") +
        '<div class="field line-desc"><label for="ln-desc-' + i + '">Désignation</label><input type="text" id="ln-desc-' + i + '" data-k="desc" value="' + esc(l.desc) + '"></div>' +
        '<div class="field line-qty"><label for="ln-qty-' + i + '">Qté</label><input type="text" id="ln-qty-' + i + '" data-k="qty" inputmode="decimal" value="' + (isFinite(INV.amount(l.qty)) ? esc(OF.fmt(l.qty)) : "") + '"></div>' +
        '<div class="field line-unit"><label for="ln-unit-' + i + '">Unité</label><select id="ln-unit-' + i + '" data-k="unit">' + options(LINE_UNITS, l.unit || "") + "</select></div>" +
        '<div class="field line-price"><label for="ln-price-' + i + '">Prix unitaire HT</label><div class="input-suffix"><input type="text" id="ln-price-' + i + '" data-k="price" inputmode="decimal" value="' + (isFinite(INV.amount(l.price)) ? esc(String(l.price).replace(".", ",")) : "") + '"><span>€</span></div></div>' +
        '<button type="button" class="line-remove" data-remove="' + i + '" aria-label="Supprimer la ligne ' + (i + 1) + '" title="Supprimer">✕</button></div>';
    }).join("");
  }

  function renderDraft(d) {
    var clients = data.clients.filter(function (c) { return !c.archived || c.id === d.clientId; });
    var html = '<div class="espace-head"><h2>' + esc(doc(d.id) ? TYPES[d.type] + " (brouillon)" : NEW_TITLES[d.type]) +
      "</h2>" + stateBadge(d) + "</div>" + profileReminder() +
      (d.prospectId && prospect(d.prospectId) ? '<p class="small muted espace-noprint">Devis pour la piste <a href="#/prospects/' + esc(d.prospectId) + '">' +
        esc(prospect(d.prospectId).name) + "</a> : son étape suivra ce devis.</p>" : "") +
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
        if (k === "unit" || k === "kind") { if (t.value) l[k] = t.value; else delete l[k]; } else l[k] = k === "desc" ? t.value : OF.num(t.value);
      } else if (t.name === "rate") d.vat.rate = Number(t.value);
      else if (t.name === "nature") { d.nature = t.value; $("d-lines").innerHTML = linesHTML(d); }
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
      var res = E.issue(data.documents, d, meFromProfile(profile()), c ? clientForDoc(c) : null, profile().prefixes, now(), profile().numbering,
        { lineKinds: isMixed() });
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
      if (d.status === "accepted" && !d.decidedAt) d.decidedAt = TODAY;
      d.invoiceId = inv.id;
      data.documents.push(inv);
      persist("Facture créée en brouillon à partir du devis.").then(function () { location.hash = "#/documents/" + inv.id; });
    });
    view.querySelectorAll("[data-quote]").forEach(function (b) {
      b.addEventListener("click", function () {
        var before = d.status;
        d.status = b.getAttribute("data-quote");
        // Date de décision (documentation/55, § 7) : posée quand le devis devient accepté ou refusé (un second clic ne la change
        // pas ; un devis décidé avant ce suivi reste sans date), retirée si le devis est remis en attente.
        if (d.status === "sent") delete d.decidedAt; else if (d.status !== before) d.decidedAt = TODAY;
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

  // ----- Indicateurs des documents et des clients (documentation/55-indicateurs-espace.md, § 2) ----------------

  var pct = function (x) { return OF.fmt(Math.round(x * 100)) + " %"; };
  /** Barres « facturé (HT) et encaissé » par mois dans le conteneur data-chart="name". */
  function drawInvoicedChart(name, months, who) {
    var el = view.querySelector('[data-chart="' + name + '"]');
    if (!el) return;
    el.innerHTML = OF.charts.bars({ width: Math.floor(el.getBoundingClientRect().width) || 600,
      groups: months.map(function (m) { return { key: m.key, label: m.label, values: [m.invoiced, m.cashed], future: false }; }),
      series: [{ name: "Facturé (HT)", cls: "is-cur" }, { name: "Encaissé", cls: "is-in" }],
      title: "Facturé et encaissé par mois" + (who ? " : " + who : ""),
      desc: "12 derniers mois : facturé " + money(months.reduce(function (s, m) { return s + m.invoiced; }, 0)) + " HT, encaissé " +
        money(months.reduce(function (s, m) { return s + m.cashed; }, 0)) + "." });
  }
  function invoicedCard(name, months, intro) {
    return '<section class="card espace-card"><div class="card-head"><h3>Facturé et encaissé par mois</h3><span class="small muted">' + esc(intro) + "</span></div>" +
      '<div class="chart" data-chart="' + name + '"></div>' + OF.charts.legend([{ cls: "is-cur", label: "Facturé (HT, à la date de la facture)" }, { cls: "is-in", label: "Encaissé" }]) +
      OF.charts.table("Facturé et encaissé par mois", ["Mois", "Facturé (HT)", "Encaissé"], months.map(function (m) {
        return [m.label + (m.current ? " (en cours)" : ""), money(m.invoiced), money(m.cashed)];
      })) + "</section>";
  }
  // Période de l'onglet Documents (documentation/55, § 8) : boutons, et mois du graphique selon la période.
  var PERIOD_LABELS = { mois: "Mois", trimestre: "Trimestre", annee: "Année", "12m": "12 mois", precedente: "Année précédente" };
  function documentsMonths(p) {
    var end = p.key === "precedente" ? p.to : TODAY, n = p.key === "annee" ? +TODAY.slice(5, 7) : 12;
    return ST.invoicedMonthly(data.documents, end, n).map(function (m) { return Object.assign({}, m, { current: m.key === TODAY.slice(0, 7) }); });
  }
  function documentsOverview(r, url) {
    if (!data.documents.some(function (d) { return d.status !== "draft"; })) return "";
    var ds = ST.documents(data.documents, TODAY, r.params.periode), q = ds.quotes, p = ds.period;
    var plural = function (n, one) { return n + " " + one + (n > 1 ? "s" : ""); };
    return '<div class="tr-tools espace-noprint"><div class="seg" role="group" aria-label="Période des indicateurs">' + ST.PERIODS.map(function (k) {
        return '<a class="tab" href="' + url({ periode: k }) + '"' + (k === p.key ? ' aria-current="true"' : "") + ">" + PERIOD_LABELS[k] + "</a>";
      }).join("") + '</div><span class="small muted">Du ' + day(p.from) + " au " + day(p.to) + ".</span></div>" +
      '<div class="kpis kpis-4">' +
      kpi("Facturé " + p.label + " (HT)", money(ds.invoiced), [countText(ds.count, "facture", "factures"), ds.average !== null ? "moyenne " + money(ds.average) : "",
        ds.creditCount ? countText(ds.creditCount, "avoir", "avoirs") + " (" + money(ds.credits) + ")" : ""].filter(Boolean).join(" · ")) +
      kpi("Encaissé " + p.label, money(ds.cashed), "paiements reçus, remboursements déduits") +
      kpi("Devis en attente (HT)", money(q.pendingAmount), q.pending ? countText(q.pending, "devis encore valable", "devis encore valables") + " aujourd'hui" : "aucun devis en attente") +
      kpi("Taux de signature des devis", q.rate === null ? "–" : pct(q.rate), q.rate === null ? "aucun devis émis " + p.label + " n'est tranché" :
        plural(q.signed, "signé") + ", " + plural(q.refused, "refusé") + ", " + plural(q.expired, "expiré") + " (devis émis " + p.label + ")") +
      "</div>" + invoicedCard("invoiced", documentsMonths(p), p.key === "annee" || p.key === "precedente" ? "Année " + p.from.slice(0, 4) + "." : "12 derniers mois.");
  }

  function viewClients(r) {
    var showArchived = r.params.archives === "1";
    var list = data.clients.filter(function (c) { return showArchived || !c.archived; })
      .sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || ""), "fr"); });
    var html = '<div class="espace-head"><h2>Clients</h2><div class="espace-quick espace-noprint"><a class="btn btn-primary btn-sm" href="#/clients/nouveau">+ Client</a></div></div>';
    if (!list.length) {
      html += '<div class="card espace-card"><p class="muted">Pas encore de client. Créez votre premier client pour lui faire un devis ou une facture.</p>' +
        '<a class="btn btn-primary btn-sm" href="#/clients/nouveau">Créer un client</a></div>';
    } else {
      var cs = ST.clients(data.documents, TODAY);
      if (cs.active) {
        html += '<div class="kpis kpis-4">' +
          kpi("Clients actifs", String(cs.active), "au moins un encaissement sur 12 mois") +
          kpi("Nouveaux clients en " + YEAR, String(cs.newThisYear), "première facture émise cette année") +
          kpi("Encaissé moyen par client", money(cs.average), "clients actifs, 12 derniers mois") +
          kpi("Part du premier client", pct(cs.top1), "trois premiers : " + pct(cs.top3) + " des encaissements", cs.top1 >= 0.5 ? "is-warn" : "") + "</div>" +
          topClientsCard(ST.topClients(data.documents, ST.since12(TODAY), TODAY, 10), true);
      }
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
    // Client créé depuis une piste (documentation/38-prospects.md) : fiche préremplie, piste liée à l'enregistrement.
    var lead = isNew ? prospect(r.params.piste) : null;
    if (lead) {
      Object.assign(c, { name: lead.name, pro: lead.pro !== false, email: lead.email || "",
        notes: [lead.contact ? "Interlocuteur : " + lead.contact : "", lead.phone ? "Téléphone : " + lead.phone : ""].filter(Boolean).join("\n") });
    }
    var docs = isNew ? [] : data.documents.filter(function (d) { return d.clientId === c.id; });
    var issuedDocs = docs.some(function (d) { return d.status !== "draft" && d.type === "facture"; });
    var cd = issuedDocs ? ST.clientDetail(data.documents, c.id, TODAY) : null, cm = issuedDocs ? ST.invoicedMonthly(data.documents, TODAY, 12, c.id) : null;
    view.innerHTML = '<div class="espace-head"><h2>' + (isNew ? "Nouveau client" : esc(c.name)) + "</h2></div>" +
      (cd ? '<div class="kpis kpis-4">' +
        kpi("Facturé (HT)", money(cd.invoiced), "depuis la première facture" + (cd.lastInvoice ? " · dernière le " + day(cd.lastInvoice) : "")) +
        kpi("Encaissé sur 12 mois", money(cd.cashed12), "remboursements d'avoirs déduits") +
        kpi("Reste à encaisser", money(cd.due), cd.late ? "dont " + money(cd.late) + " en retard" : "aucune facture en retard", cd.late ? "is-warn" : "") +
        kpi("Délai moyen de paiement", cd.paidCount ? OF.fmt(cd.avgDays) + " j" : "–", cd.paidCount ? "retard moyen " + OF.fmt(cd.avgLate) + " j · " +
          countText(cd.paidCount, "facture payée", "factures payées") : "pas encore de facture payée") + "</div>" +
        invoicedCard("client-invoiced", cm, "12 derniers mois, pour ce client.") : "") +
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
    if (cm) {
      drawCharts = function () { drawInvoicedChart("client-invoiced", cm, c.name); };
      drawCharts();
    }
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
      if (lead) { lead.clientId = c.id; lead.updatedAt = c.updatedAt; }
      persist(isNew ? "Client créé." : "Client enregistré.").then(function () {
        if (lead) location.hash = r.params.devis === "1" ? "#/documents/nouveau?type=devis&client=" + c.id + "&piste=" + lead.id : "#/prospects/" + lead.id;
        else if (!back) location.hash = "#/clients";
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
    var rows = E.ledger(data.documents, year + "-01-01", year + "-12-31", profile(), R);
    var sum = rows.reduce(function (s, x) { return s + x.amount; }, 0);
    // Activité mixte : ventes et prestations distinctes (BOFiP, BOI-BIC-DECLA-30-30, § 30).
    var mixed = isMixed();
    var parts = function (x) {
      return mixed ? '<td class="num c-part" data-label="Ventes">' + esc(money(x.goods)) + '</td><td class="num c-part" data-label="Prestations">' +
        esc(money(x.services)) + "</td>" : "";
    };
    var goodsSum = rows.reduce(function (s, x) { return s + (x.goods || 0); }, 0);
    view.innerHTML = '<div class="espace-head"><h2>Livre des recettes ' + esc(year) + '</h2><div class="espace-quick espace-noprint">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="ledger-csv"' + (rows.length ? "" : " disabled") + ">Exporter (CSV)</button>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="ledger-print"' + (rows.length ? "" : " disabled") + ">Imprimer</button></div></div>" +
      receiptsOverview(year) +
      '<div class="card espace-card"><div class="espace-filters espace-noprint" role="group" aria-label="Année">' +
      Object.keys(years).sort().reverse().map(function (y) { return '<a class="tab" href="#/recettes?annee=' + y + '"' + (y === year ? ' aria-current="true"' : "") + ">" + y + "</a>"; }).join("") + "</div>" +
      (rows.length ? '<table class="ledger"><thead><tr><th>Date</th><th>Client</th><th>Nature</th><th>Moyen</th><th>Référence</th>' +
        (mixed ? '<th class="num">Ventes</th><th class="num">Prestations</th>' : "") + '<th class="num">Montant</th></tr></thead><tbody>' +
        E.ledgerQuarters(rows, year, TODAY, profile().startDate).map(function (q) {
          return rows.filter(function (x) { return x.date >= q.start && x.date <= q.end; }).map(function (x) {
            return '<tr><td class="c-date">' + day(x.date) + '</td><td class="c-client">' + esc(x.client) + '</td><td class="c-nature">' + esc(x.nature) +
              '</td><td class="c-method">' + esc(x.method) + '</td><td class="c-ref"><a href="#/documents/' + esc(x.docId) + '">' + esc(x.ref) +
              '</a></td>' + parts(x) + '<td class="num">' + esc(money(x.amount)) + "</td></tr>";
          }).join("") + '<tr class="ledger-subtotal"><td colspan="5">Total du ' + esc(q.label) + (q.open ? " (en cours)" : "") + "</td>" + parts(q) +
            '<td class="num">' + esc(money(q.total)) + "</td></tr>";
        }).join("") + '</tbody><tfoot><tr><td colspan="5">Total encaissé en ' + esc(year) + "</td>" +
          parts({ goods: Math.round(goodsSum * 100) / 100, services: Math.round((sum - goodsSum) * 100) / 100 }) +
          '<td class="num">' + esc(money(sum)) + "</td></tr></tfoot></table>"
        : '<p class="muted">Aucun encaissement en ' + esc(year) + ". Les encaissements enregistrés sur vos factures apparaissent ici automatiquement.</p>") +
      '<p class="small muted">Tenu par date d\'encaissement : date, client, nature, montant, moyen de paiement et référence de la facture ; totalisé à la fin de chaque trimestre et de l\'année. ' +
      (mixed ? "Activité mixte : ventes et prestations sont distinguées ; l'encaissement d'une facture mixte est réparti au prorata de ses lignes hors taxes. " : "") +
      "Conservez-le avec vos factures pendant " + R.conservation_pieces.commerce_annees + " ans.</p></div>";
    drawCharts = function () {
      var el = view.querySelector('[data-chart="receipts"]');
      if (!el) return;
      var rc = ST.receipts(data.documents, year, TODAY), refs = [];
      if (isMicro() && year === YEAR) {
        var th = E.thresholds(data.documents, profile(), R, year);
        refs.push({ value: th.ceiling, label: "Plafond de la micro-entreprise", cls: "is-ceiling" });
        if (th.vat) refs.push({ value: th.vat.base, label: "Seuil de la franchise de TVA", cls: "is-vat" });
      }
      el.innerHTML = OF.charts.balance({ width: Math.floor(el.getBoundingClientRect().width) || 600, from: year + "-01-01", to: year + "-12-31", refs: refs,
        series: [{ name: "Encaissé", points: rc.points, cls: "is-main", end: rc.end }], title: "Encaissements cumulés en " + year,
        desc: "Total " + money(rc.total) + (refs.length ? " ; " + refs.map(function (r) { return r.label + " : " + money(r.value); }).join(" ; ") : "") + "." });
    };
    drawCharts();
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

  /** Liste en barres horizontales : [{ name, href, amount, share }] (parts de 0 à 1). */
  function barList(items, fmt) {
    var max = items.reduce(function (m, x) { return Math.max(m, x.amount); }, 0);
    return '<ul class="bar-list">' + items.map(function (x) {
      return '<li><span class="bl-name">' + (x.href ? '<a href="' + x.href + '">' + esc(x.name) + "</a>" : esc(x.name)) + '</span><span class="bl-bar" aria-hidden="true"><span style="width:' +
        (max > 0 ? Math.max(1, x.amount / max * 100).toFixed(1) : 0) + '%"></span></span><b class="bl-amount">' + esc((fmt || money)(x.amount)) + '</b><span class="bl-share">' + pct(x.share) + "</span></li>";
    }).join("") + "</ul>";
  }

  /** Livre des recettes : encaissé, trimestre, moyenne, projection et cumul face au plafond (documentation/55, § 2). */
  function receiptsOverview(year) {
    var rc = ST.receipts(data.documents, year, TODAY);
    if (!rc.total && year !== YEAR) return "";
    var th = isMicro() && year === YEAR ? E.thresholds(data.documents, profile(), R, year) : null;
    return '<div class="espace-noprint"><div class="kpis kpis-4">' +
      kpi("Encaissé en " + year, money(rc.total), countText(rc.points.length - 1, "jour d'encaissement", "jours d'encaissement")) +
      (rc.quarter !== null ? kpi("Encaissé au " + rc.quarterLabel, money(rc.quarter), "depuis le début du trimestre") : kpi("Moyenne par trimestre", money(Math.round(rc.total / 4 * 100) / 100), "année entière")) +
      kpi("Moyenne mensuelle", rc.average === null ? "–" : money(rc.average), year === YEAR ? "mois écoulés de l'année" : "sur 12 mois") +
      (rc.projection !== null ? kpi("Projection de fin d'année", money(rc.projection), "au rythme des jours écoulés : une estimation, pas une prévision" +
        (th && rc.projection > th.ceiling ? " · au-delà du plafond" : ""), th && rc.projection > th.ceiling ? "is-warn" : "")
        : kpi("Encaissements", String(rc.points.length - 1), "jours avec au moins un encaissement")) + "</div>" +
      '<section class="card espace-card"><div class="card-head"><h3>Encaissements cumulés</h3><span class="small muted">Depuis le 1er janvier' +
      (th ? ", face au plafond de la micro-entreprise" + (th.vat ? " et au seuil de la franchise de TVA" : "") : "") + ".</span></div>" +
      '<div class="chart" data-chart="receipts"></div>' + OF.charts.legend([{ cls: "is-main", label: "Encaissé (cumul)" }].concat(th ? [{ cls: "is-ceiling", label: "Plafond (" + money(th.ceiling) + ")" }] : [])
        .concat(th && th.vat ? [{ cls: "is-vat", label: "Seuil de TVA (" + money(th.vat.base) + ")" }] : [])) + "</section></div>";
  }

  /**
   * Indicateurs des dépenses : année passée entière, ou période choisie de l'année en cours (documentation/55, § 2 et
   * § 9) ; libellé, bornes, mois de la moyenne et du graphique.
   */
  function expensesFigures(year, key) {
    if (year === YEAR) {
      var x = ST.expensesPeriod(data.expenses, data.documents, TODAY, key, profile(), R);
      return Object.assign(x, { label: x.period.label, from: x.period.from, to: x.period.to,
        averageHint: { trimestre: "mois commencés du trimestre", annee: "mois écoulés de l'année", "12m": "sur 12 mois" }[x.period.key],
        chartIntro: x.period.key === "annee" ? "Année " + YEAR + "." : "12 derniers mois.",
        chartTitle: x.period.key === "annee" ? "Dépenses par mois en " + YEAR : "Dépenses des 12 derniers mois" });
    }
    return Object.assign(ST.expenses(data.expenses, data.documents, year, TODAY, profile(), R), { period: null, label: "en " + year,
      from: year + "-01-01", to: year + "-12-31", averageHint: "sur 12 mois", perExpense: null, chartIntro: "Année " + year + ".", chartTitle: "Dépenses par mois en " + year });
  }
  var EXPENSE_PERIOD_LABELS = { mois: "Mois", trimestre: "Trimestre", annee: "Année", "12m": "12 mois" };

  /** Dépenses : période, indicateurs, graphique par mois, catégories et fournisseurs (documentation/55, § 2 et § 9). */
  function expensesOverview(year, key) {
    if (!data.expenses.some(function (e) { return e.date <= TODAY; })) return "";
    var xs = expensesFigures(year, key), top = xs.byCategory[0];
    var tools = '<div class="tr-tools espace-noprint">' + (xs.period ? '<div class="seg" role="group" aria-label="Période des indicateurs">' +
      ST.EXPENSE_PERIODS.map(function (k) {
        return '<a class="tab" href="#/depenses' + (k === "annee" ? "" : "?periode=" + k) + '"' + (k === xs.period.key ? ' aria-current="true"' : "") + ">" + EXPENSE_PERIOD_LABELS[k] + "</a>";
      }).join("") + "</div>" : "") + '<span class="small muted">Du ' + day(xs.from) + " au " + day(xs.to) + ".</span></div>";
    return '<div class="espace-noprint">' + tools + '<div class="kpis kpis-4">' +
      kpi("Dépenses " + xs.label, money(xs.total), xs.count ? countText(xs.count, "dépense", "dépenses") : "aucune dépense sur la période") +
      kpi("Premier poste", top ? money(top.amount) : "–", top ? top.name + " · " + pct(top.share) : "aucune dépense sur la période") +
      (xs.period && xs.period.key === "mois"
        ? kpi("Dépense moyenne", xs.perExpense === null ? "–" : money(xs.perExpense), xs.count ? "total ÷ nombre de dépenses" : "aucune dépense sur la période")
        : kpi("Moyenne mensuelle", xs.average === null ? "–" : money(xs.average), xs.averageHint)) +
      kpi("Part des encaissements", xs.ratio === null ? "–" : pct(xs.ratio), (xs.ratio === null ? "aucun encaissement sur la période" :
        "dépenses ÷ encaissements " + xs.label) + (xs.abatement !== null ? " · abattement forfaitaire de votre activité : " + pct(xs.abatement) : "")) + "</div>" +
      '<div class="espace-cols tr-charts"><section class="card espace-card"><div class="card-head"><h3>Dépenses par mois</h3><span class="small muted">' + esc(xs.chartIntro) + "</span></div>" +
      '<div class="chart" data-chart="expenses"></div>' + OF.charts.table("Dépenses par mois", ["Mois", "Dépenses"], xs.byMonth.map(function (m) { return [m.label, money(m.amount)]; })) +
      '</section><section class="card espace-card"><h3>Par catégorie</h3>' + barList(xs.byCategory) + "<h4>Principaux fournisseurs</h4>" + barList(xs.suppliers) +
      (xs.abatement !== null ? '<p class="small muted">En micro-entreprise, l\'impôt est calculé après un abattement forfaitaire de ' + pct(xs.abatement) +
        ' pour votre activité, quelles que soient vos dépenses. Pour comparer avec un régime où les charges réelles sont déduites : <a href="/fr/comparateur-statuts/">comparateur de statuts</a>.</p>' : "") +
      "</section></div></div>";
  }

  // ----- Dépenses et registre des achats ----------------------------------------------------------------

  function expense(id) { return data.expenses.filter(function (e) { return e.id === id; })[0] || null; }

  function viewExpenses(r) {
    var required = E.purchasesRequired(profile(), R.registre_achats, R);
    var years = {};
    years[YEAR] = true;
    data.expenses.forEach(function (e) { years[e.date.slice(0, 4)] = true; });
    var year = r.params.annee && years[r.params.annee] ? r.params.annee : YEAR;
    var res = E.expenseRows(data.expenses, year + "-01-01", year + "-12-31");
    var noun = required ? "achat" : "dépense";
    view.innerHTML = '<div class="espace-head"><h2>' + (required ? "Registre des achats " : "Dépenses ") + esc(year) + '</h2><div class="espace-quick espace-noprint">' +
      '<a class="btn btn-primary btn-sm" href="#/depenses/nouvelle">+ ' + (required ? "Achat" : "Dépense") + "</a>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="expenses-csv"' + (res.rows.length ? "" : " disabled") + ">Exporter (CSV)</button>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="expenses-print"' + (res.rows.length ? "" : " disabled") + ">Imprimer</button></div></div>" +
      expensesOverview(year, r.params.periode) +
      '<div class="card espace-card"><div class="espace-filters espace-noprint" role="group" aria-label="Année">' +
      Object.keys(years).sort().reverse().map(function (y) { return '<a class="tab" href="#/depenses?annee=' + y + '"' + (y === year ? ' aria-current="true"' : "") + ">" + y + "</a>"; }).join("") + "</div>" +
      (res.rows.length ? '<table class="ledger"><thead><tr><th>Date</th><th>Fournisseur</th><th>Nature</th><th>Moyen</th><th>Pièce</th><th class="num">Montant</th></tr></thead><tbody>' +
        res.rows.map(function (x) {
          return '<tr><td class="c-date">' + day(x.date) + '</td><td class="c-client"><a href="#/depenses/' + esc(x.id) + '">' + esc(x.supplier) + "</a></td><td>" +
            esc(x.label) + '</td><td class="c-method">' + esc(x.method) + '</td><td class="c-ref">' + esc(x.ref) + '</td><td class="num">' + esc(money(x.amount)) + "</td></tr>";
        }).join("") + '</tbody><tfoot><tr><td colspan="5">Total des ' + noun + "s en " + esc(year) + '</td><td class="num">' + esc(money(res.total)) + "</td></tr>" +
        '<tr><td colspan="5">Dont réglé en espèces</td><td class="num">' + esc(money(res.cash)) + "</td></tr></tfoot></table>"
        : '<p class="muted">Aucun' + (required ? " achat" : "e dépense") + " en " + esc(year) + '. <a href="#/depenses/nouvelle">' + (required ? "Saisir un achat" : "Saisir une dépense") + "</a></p>") +
      (required
        ? '<p class="small muted">Vente de marchandises ou fourniture de logement : ce registre des achats, récapitulé par année, est obligatoire avec le livre des recettes ; il se tient dans l\'ordre chronologique, en distinguant les règlements en espèces, avec la référence de chaque facture d\'achat.</p>'
        : '<p class="small muted">Prestataire de services : ce suivi est facultatif. Le registre des achats n\'est obligatoire que pour la vente de marchandises ou la fourniture de logement.</p>') +
      (isMicro() ? '<p class="small muted">En micro-entreprise, les dépenses ne se déduisent pas du chiffre d\'affaires déclaré : l\'abattement forfaitaire en tient lieu.</p>' : "") +
      '<p class="small muted">Conservez les factures d\'achat pendant ' + R.conservation_pieces.commerce_annees + " ans.</p></div>";
    drawCharts = function () {
      var el = view.querySelector('[data-chart="expenses"]');
      if (!el) return;
      var xs = expensesFigures(year, r.params.periode);
      el.innerHTML = OF.charts.bars({ width: Math.floor(el.getBoundingClientRect().width) || 600,
        groups: xs.byMonth.map(function (m) { return { key: m.key, label: m.label, values: [m.amount], future: false }; }),
        series: [{ name: "Dépenses", cls: "is-out" }], title: xs.chartTitle,
        desc: "Total " + money(xs.byMonth.reduce(function (s, m) { return Math.round((s + m.amount) * 100) / 100; }, 0)) + "." });
    };
    drawCharts();
    if (!res.rows.length) return;
    $("expenses-csv").addEventListener("click", function () {
      OF.download("\ufeff" + E.expensesCSV(res.rows), (required ? "registre-des-achats-" : "depenses-") + year + ".csv", "text/csv;charset=utf-8");
    });
    $("expenses-print").addEventListener("click", function () {
      document.body.classList.add("print-ledger");
      window.print();
      document.body.classList.remove("print-ledger");
    });
  }

  function viewExpenseForm(r) {
    var isNew = r.id === "nouvelle";
    var x = isNew ? { date: TODAY, method: "carte" } : expense(r.id);
    if (!x) { view.innerHTML = '<div class="espace-head"><h2>Dépense introuvable</h2></div><p><a href="#/depenses">Retour aux dépenses</a></p>'; return; }
    var methods = Object.keys(E.METHODS).map(function (k) { return [k, E.METHODS[k]]; });
    var required = E.purchasesRequired(profile(), R.registre_achats, R);
    view.innerHTML = '<div class="espace-head"><h2>' + (isNew ? (required ? "Nouvel achat" : "Nouvelle dépense") : esc(x.supplier)) + "</h2></div>" +
      '<form class="card espace-card" id="expense-form" novalidate><div class="fields">' +
      field("date", "Date", x.date, { type: "date", half: true, required: true }) +
      field("amount", "Montant payé", x.amount == null ? "" : Number(x.amount).toFixed(2).replace(".", ","), { half: true, required: true, inputmode: "decimal", placeholder: "24,90",
        hint: "Toutes taxes comprises, en euros." }) +
      field("supplier", "Fournisseur", x.supplier, { required: true, placeholder: "Papeterie du centre" }) +
      field("label", "Nature de l'achat", x.label, { placeholder: "Ramettes de papier, marchandises…" }) +
      field("method", "Moyen de paiement", x.method, { options: methods, half: true }) +
      field("ref", "Référence de la pièce", x.ref, { half: true, placeholder: "N° de la facture du fournisseur" }) +
      field("category", "Catégorie (facultatif)", x.category || "", { half: true, options: [["", "Non classée"]].concat(Object.keys(E.EXPENSE_CATEGORIES).map(function (k) {
        return [k, E.EXPENSE_CATEGORIES[k]]; })), hint: "Pour suivre où part votre argent." }) +
      '</div><p class="form-error" id="expense-error" role="alert" hidden></p><div class="espace-actions">' +
      '<button type="submit" class="btn btn-primary">Enregistrer</button><a class="btn btn-ghost" href="#/depenses?annee=' + esc(String(x.date).slice(0, 4)) + '">Annuler</a>' +
      (isNew ? "" : '<button type="button" class="btn btn-ghost" id="expense-delete">Supprimer</button>') + "</div></form>";
    var form = $("expense-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      var next = { date: f.date.value, supplier: f.supplier.value.trim(), label: f.label.value.trim(), method: f.method.value,
                   ref: f.ref.value.trim(), amount: OF.num(f.amount.value), category: E.EXPENSE_CATEGORIES[f.category.value] ? f.category.value : "" };
      var errors = E.checkExpense(next);
      f.supplier.setAttribute("aria-invalid", String(!next.supplier));
      f.amount.setAttribute("aria-invalid", String(!(next.amount > 0)));
      if (errors.length) { showError("expense-error", errors.join(" ")); (next.supplier ? (next.amount > 0 ? f.date : f.amount) : f.supplier).focus(); return; }
      showError("expense-error", "");
      next.amount = Math.round(next.amount * 100) / 100;
      var target = isNew ? { id: S.uid(), createdAt: now() } : x;
      Object.assign(target, next, { updatedAt: now() });
      if (isNew) data.expenses.push(target);
      persist(isNew ? "Dépense enregistrée." : "Dépense modifiée.").then(function () { location.hash = "#/depenses?annee=" + next.date.slice(0, 4); });
    });
    if (!isNew) $("expense-delete").addEventListener("click", function () {
      if (!confirm("Supprimer cette dépense ?")) return;
      data.expenses = data.expenses.filter(function (e) { return e.id !== x.id; });
      persist("Dépense supprimée.").then(function () { location.hash = "#/depenses?annee=" + x.date.slice(0, 4); });
    });
  }

  // ----- Temps passé (documentation/37-temps-passe.md) --------------------------------------------------------

  var TIME_STATES = { internal: ["Non facturable", "st-draft"], unbilled: ["À facturer", "st-unpaid"],
                      draft: ["Dans un brouillon", "st-partial"], invoiced: ["Facturé", "st-paid"] };
  var TIME_UNITS = [["hour", "Heures"], ["day", "Jours"]];
  var timeDefaults = null;  // saisie rapide : date, client, unité et taux de la dernière saisie (« Facturable » revient coché)
  function timeEntry(id) { return data.timeEntries.filter(function (t) { return t.id === id; })[0] || null; }
  function clientName(id) { var c = client(id); return c ? c.name : id ? "Client inconnu" : ""; }
  function timeBadge(state) { var st = TIME_STATES[state]; return '<span class="st ' + st[1] + '">' + esc(st[0]) + "</span>"; }
  /** « 12 h 30 et 1,5 jour » ; « 0 h » si rien. */
  function durations(hours, days) {
    var parts = [];
    if (hours) parts.push(E.durationLabel(hours, "hour"));
    if (days) parts.push(E.durationLabel(days, "day"));
    return parts.join(" et ") || "0 h";
  }
  var rateText = function (n) { return n === null || n === undefined || !isFinite(n) ? "" : String(Math.round(n * 100) / 100).replace(".", ","); };
  function monthShift(key, n) {
    var m = +key.slice(5, 7) - 1 + n, y = +key.slice(0, 4) + Math.floor(m / 12);
    return y + "-" + String(((m % 12) + 12) % 12 + 1).padStart(2, "0");
  }
  var monthLabel = function (key) { return OF.date(key + "-01", { month: "long", year: "numeric" }); };

  /** Champs d'un temps (saisie rapide et modification). */
  function timeFields(x) {
    var clients = data.clients.filter(function (c) { return !c.archived || c.id === x.clientId; })
      .sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || ""), "fr"); })
      .map(function (c) { return [c.id, c.name]; });
    var perDay = x.unit === "day";
    return field("date", "Date", x.date, { type: "date", half: true, required: true }) +
      field("clientId", "Client", x.clientId || "", { options: [["", "Aucun (temps interne)"]].concat(clients), half: true }) +
      field("task", "Tâche", x.task, { required: true, placeholder: "Maquettes de la page d'accueil", hint: "Elle devient la désignation de la ligne de facture." }) +
      field("duration", "Durée", durationInput(x.quantity, x.unit), { half: true, required: true, placeholder: perDay ? "1" : "1h30",
        hint: '<span id="ep-duration-help">' + (perDay ? "En jours : 1 ou 0,5." : "Par exemple 1,5 ou 1h30 ou 45 min.") + "</span>" }) +
      field("unit", "Unité", x.unit || "hour", { options: TIME_UNITS, half: true }) +
      field("rate", perDay ? "Taux journalier HT" : "Taux horaire HT", rateText(x.rate), { half: true, inputmode: "decimal", placeholder: perDay ? "450" : "60",
        hint: "En euros, facultatif : prérempli par le dernier taux de ce client." }) +
      '<div class="field time-billable"><label class="check"><input type="checkbox" id="ep-billable" name="billable"' + (x.billable === false ? "" : " checked") +
      "><span>Facturable</span></label></div>";
  }
  function readTime(form) {
    var f = form.elements, rate = f.rate.value.trim();
    return { date: f.date.value, clientId: f.clientId.value, task: f.task.value.trim(), unit: f.unit.value,
             quantity: E.parseDuration(f.duration.value, f.unit.value), rate: rate ? OF.num(rate) : null, billable: f.billable.checked };
  }
  /** Erreurs affichées et champs signalés ; renvoie vrai si la saisie est valide. */
  function showTimeErrors(form, next, errorId) {
    var errors = E.timeErrors(next), bad = {};
    errors.forEach(function (e) { bad[e.field] = true; });
    ["date", "clientId", "task", "duration", "unit", "rate"].forEach(function (k) { form.elements[k].setAttribute("aria-invalid", String(!!bad[k])); });
    showError(errorId, errors.map(function (e) { return e.message; }).join(" "));
    if (errors.length) form.elements[errors[0].field].focus();
    return !errors.length;
  }
  /** Durée dans le champ de modification : « 1h10 » plutôt que 1,17 ; jours en décimal. */
  function durationInput(q, unit) {
    if (q === null || q === undefined || !isFinite(q)) return "";
    if (unit === "day") return rateText(q);
    var min = Math.round(q * 60);
    return Math.floor(min / 60) + (min % 60 ? "h" + String(min % 60).padStart(2, "0") : "");
  }
  /**
   * Libellés, aide et taux qui suivent l'unité et le client. keepRate : taux d'un temps existant, gardé ; sinon (saisie
   * rapide) le taux est prérempli par le dernier taux du client et de l'unité, tant que l'utilisateur n'en a pas tapé un.
   */
  function bindTimeForm(form, exceptId, keepRate) {
    var f = form.elements, typed = !!keepRate;
    f.rate.addEventListener("input", function () { typed = !!f.rate.value.trim(); });
    var sync = function () {
      var perDay = f.unit.value === "day";
      form.querySelector('label[for="ep-rate"]').textContent = perDay ? "Taux journalier HT" : "Taux horaire HT";
      f.rate.placeholder = perDay ? "450" : "60";
      f.duration.placeholder = perDay ? "1" : "1h30";
      $("ep-duration-help").textContent = perDay ? "En jours : 1 ou 0,5." : "Par exemple 1,5 ou 1h30 ou 45 min.";
      if (!typed) {
        var others = data.timeEntries.filter(function (t) { return t.id !== exceptId; });
        f.rate.value = rateText(E.lastRate(others, f.clientId.value, f.unit.value));
      }
    };
    f.unit.addEventListener("change", sync);
    f.clientId.addEventListener("change", sync);
    return sync;
  }

  function viewTime(r) {
    var month = /^\d{4}-(0[1-9]|1[0-2])$/.test(r.params.mois || "") ? r.params.mois : TODAY.slice(0, 7);
    var s = E.timeSummary(data.timeEntries, data.documents, month + "-01", month + "-31");
    var due = E.unbilledByClient(data.timeEntries, data.documents)
      .sort(function (a, b) { return String(clientName(a.clientId)).localeCompare(String(clientName(b.clientId)), "fr"); });
    var x = Object.assign({ date: TODAY, clientId: "", unit: "hour", rate: null, billable: true }, timeDefaults);
    if (x.clientId && !client(x.clientId)) x.clientId = "";
    var prev = monthShift(month, -1), next = monthShift(month, 1);
    // Indicateurs (documentation/55, § 2) : semaine et mois en cours, dans l'unité suivie (heures, sinon jours).
    var ts = ST.time(data.timeEntries, data.documents, TODAY, 8), unitLabel = function (q) { return q || ts.unit === "day" ? E.durationLabel(q, ts.unit) : "0 h"; };
    var otherUnit = data.timeEntries.some(function (t) { return t.date && t.date.slice(0, 7) === TODAY.slice(0, 7) && t.unit !== ts.unit; });
    view.innerHTML = '<div class="espace-head"><h2>Temps passé</h2><div class="espace-quick espace-noprint">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="time-csv"' + (s.rows.length ? "" : " disabled") + ">Exporter le mois (CSV)</button>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="time-print"' + (s.rows.length ? "" : " disabled") + ">Imprimer</button></div></div>" +
      (data.timeEntries.length ? '<div class="kpis kpis-4 espace-noprint">' +
        kpi("Cette semaine", unitLabel(ts.week), "semaine " + ST.isoWeek(TODAY) + ", temps interne compris") +
        kpi("Part facturable", ts.share === null ? "–" : pct(ts.share), "temps du mois en cours : " + unitLabel(ts.month)) +
        kpi("À facturer", money(ts.unbilled), "temps facturable pas encore facturé") +
        kpi(ts.unit === "day" ? "Taux journalier moyen" : "Taux horaire moyen", ts.rate === null ? "–" : money(ts.rate) + (ts.unit === "day" ? " / jour" : " / h"),
          ts.rate === null ? "aucun temps facturable avec un taux ce mois-ci" : "temps facturables du mois, pondéré par la durée") + "</div>" +
        (otherUnit ? '<p class="small muted espace-noprint">Indicateurs et graphiques calculés sur les temps en ' + (ts.unit === "day" ? "jours" : "heures") +
          " ; les temps saisis en " + (ts.unit === "day" ? "heures" : "jours") + " figurent dans le détail du mois.</p>" : "") : "") +
      '<form class="card espace-card espace-noprint" id="time-form" novalidate><h3>Saisir du temps</h3><div class="fields">' + timeFields(x) + "</div>" +
      '<p class="form-error" id="time-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-primary">Ajouter</button></div></form>' +
      (due.length ? '<section class="card espace-card espace-noprint"><h3>À facturer</h3><ul class="time-due">' + due.map(function (c) {
        return "<li><span class=\"dl-main\"><b>" + esc(clientName(c.clientId)) + '</b><span class="small muted">' + esc(durations(c.hours, c.days)) + " · " +
          esc(countText(c.entries.length, "saisie", "saisies")) + "</span></span>" +
          '<span class="dl-side"><b>' + esc(c.amount || !c.missingRate ? money(c.amount) : "Taux à préciser") + "</b>" + (c.missingRate ? '<span class="small muted">' + esc(countText(c.missingRate, "temps sans taux", "temps sans taux")) + "</span>" : "") + "</span>" +
          '<a class="btn btn-primary btn-sm" href="#/temps/facturer?client=' + esc(c.clientId) + '" aria-label="Facturer le temps de ' + esc(clientName(c.clientId)) + '">Facturer</a></li>';
      }).join("") + "</ul></section>" : "") +
      (data.timeEntries.length ? '<div class="espace-cols tr-charts espace-noprint"><section class="card espace-card"><div class="card-head"><h3>Temps par semaine</h3><span class="small muted">8 dernières semaines, en ' +
        (ts.unit === "day" ? "jours" : "heures") + '.</span></div><div class="chart" data-chart="weeks"></div>' +
        OF.charts.legend([{ cls: "is-cur", label: "Facturable" }, { cls: "is-prev", label: "Interne" }]) +
        OF.charts.table("Temps par semaine", ["Semaine", "Facturable", "Interne"], ts.weeks.map(function (w) { return [w.label + " (lundi " + day(w.key) + ")", unitLabel(w.billable), unitLabel(w.internal)]; })) +
        '</section><section class="card espace-card"><div class="card-head"><h3>Par client</h3><span class="small muted">Mois en cours.</span></div>' +
        (ts.byClient.length ? barList(ts.byClient.map(function (c) { return { name: c.clientId ? clientName(c.clientId) : "Temps interne", amount: c.quantity, share: c.share }; }), unitLabel) :
          '<p class="small muted">Aucun temps saisi ce mois-ci.</p>') + "</section></div>" : "") +
      '<section class="card espace-card"><div class="time-month"><a class="btn btn-ghost btn-sm espace-noprint" href="#/temps?mois=' + prev + '" aria-label="Mois précédent : ' + esc(monthLabel(prev)) + '">←</a>' +
      "<h3>" + esc(monthLabel(month)) + '</h3><a class="btn btn-ghost btn-sm espace-noprint" href="#/temps?mois=' + next + '" aria-label="Mois suivant : ' + esc(monthLabel(next)) + '">→</a></div>' +
      '<ul class="time-totals"><li><span>Temps du mois</span><b>' + esc(durations(s.hours, s.days)) + "</b></li><li><span>Facturable</span><b>" +
      esc(durations(s.billable.hours, s.billable.days)) + "</b></li><li><span>Montant facturable</span><b>" + esc(money(s.billable.amount)) + "</b>" +
      (s.billable.missingRate ? '<span class="small muted">hors ' + esc(countText(s.billable.missingRate, "temps sans taux", "temps sans taux")) + "</span>" : "") + "</li></ul>" +
      (s.rows.length ? '<table class="ledger time-table"><thead><tr><th>Date</th><th>Client</th><th>Tâche</th><th>Durée</th><th>État</th><th class="num">Montant</th></tr></thead><tbody>' +
        s.rows.map(function (t) {
          return '<tr><td class="c-date">' + day(t.date) + '</td><td class="c-client">' + esc(clientName(t.clientId) || "Temps interne") +
            '</td><td class="c-nature"><a href="#/temps/' + esc(t.id) + '">' + esc(t.task) + '</a></td><td class="c-method">' + esc(E.durationLabel(t.quantity, t.unit)) +
            '</td><td class="c-ref">' + timeBadge(t.state) + '</td><td class="num">' + (t.amount === null ? "–" : esc(money(t.amount))) + "</td></tr>";
        }).join("") + "</tbody></table>"
        : '<p class="muted">Aucun temps saisi en ' + esc(monthLabel(month)) + ".</p>") +
      '<p class="small muted">Notez aussi le temps que vous ne facturez pas (prospection, administratif) : décochez « Facturable ». ' +
      "Ce suivi est facultatif : ce n'est pas un registre obligatoire.</p></section>";
    drawCharts = function () {
      var el = view.querySelector('[data-chart="weeks"]');
      if (!el) return;
      el.innerHTML = OF.charts.bars({ width: Math.floor(el.getBoundingClientRect().width) || 600,
        groups: ts.weeks.map(function (w) { return { key: w.key, short: w.label, values: [w.billable, w.internal], future: false }; }),
        series: [{ name: "Facturable", cls: "is-cur" }, { name: "Interne", cls: "is-prev" }], title: "Temps par semaine",
        desc: "8 dernières semaines : " + unitLabel(ts.weeks.reduce(function (s, w) { return s + w.billable; }, 0)) + " facturables, " +
          unitLabel(ts.weeks.reduce(function (s, w) { return s + w.internal; }, 0)) + " internes." });
    };
    drawCharts();
    var form = $("time-form");
    bindTimeForm(form, null, false)();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var t = readTime(form);
      if (!showTimeErrors(form, t, "time-error")) return;
      if (t.rate !== null) t.rate = Math.round(t.rate * 100) / 100;
      Object.assign(t, { id: S.uid(), createdAt: now(), updatedAt: now() });
      data.timeEntries.push(t);
      timeDefaults = { date: t.date, clientId: t.clientId, unit: t.unit, rate: t.rate };
      persist("Temps ajouté : " + E.durationLabel(t.quantity, t.unit) + (t.clientId ? " pour " + clientName(t.clientId) : "") + ".").then(function () {
        history.replaceState(null, "", "#/temps?mois=" + t.date.slice(0, 7));
        currentRoute = route().key;
        render(true);
        $("ep-task").focus();
      });
    });
    if (!s.rows.length) return;
    $("time-csv").addEventListener("click", function () {
      OF.download("﻿" + E.timeCSV(s.rows, clientName), "temps-passe-" + month + ".csv", "text/csv;charset=utf-8");
    });
    $("time-print").addEventListener("click", function () {
      document.body.classList.add("print-ledger");
      window.print();
      document.body.classList.remove("print-ledger");
    });
  }

  function viewTimeForm(r) {
    var x = timeEntry(r.id);
    if (!x) { view.innerHTML = '<div class="espace-head"><h2>Temps introuvable</h2></div><p><a href="#/temps">Retour au temps passé</a></p>'; return; }
    var state = E.timeState(x, data.documents), d = x.invoiceId ? doc(x.invoiceId) : null;
    var back = "#/temps?mois=" + x.date.slice(0, 7);
    var head = '<div class="espace-head"><h2>' + esc(x.task) + "</h2>" + timeBadge(state) + "</div>";
    if (state === "invoiced") {
      view.innerHTML = head + '<div class="card espace-card"><p class="notice">Ce temps est repris dans la <a href="#/documents/' + esc(d.id) + '">facture ' + esc(d.number) +
        "</a>, émise : il ne peut plus être modifié ni supprimé.</p><dl class=\"time-facts\"><dt>Date</dt><dd>" + day(x.date) + "</dd><dt>Client</dt><dd>" +
        esc(clientName(x.clientId)) + "</dd><dt>Durée</dt><dd>" + esc(E.durationLabel(x.quantity, x.unit)) + "</dd><dt>Taux HT</dt><dd>" +
        (x.rate === null || x.rate === undefined ? "–" : esc(money(x.rate) + (x.unit === "day" ? " par jour" : " par heure"))) + '</dd></dl><div class="espace-actions"><a class="btn btn-ghost" href="' + back + '">Retour au temps passé</a></div></div>';
      return;
    }
    view.innerHTML = head + (state === "draft" ? '<div class="notice espace-noprint"><p>Ce temps est repris dans le <a href="#/documents/' + esc(d.id) +
      '">brouillon de facture</a> : si vous le modifiez, la ligne du brouillon ne change pas.</p><button type="button" class="btn btn-ghost btn-sm" id="time-unlink">Retirer du brouillon</button></div>' : "") +
      '<form class="card espace-card" id="time-form" novalidate><div class="fields">' + timeFields(x) + "</div>" +
      '<p class="form-error" id="time-error" role="alert" hidden></p><div class="espace-actions">' +
      '<button type="submit" class="btn btn-primary">Enregistrer</button><a class="btn btn-ghost" href="' + back + '">Annuler</a>' +
      '<button type="button" class="btn btn-ghost" id="time-delete">Supprimer</button></div></form>';
    var form = $("time-form");
    bindTimeForm(form, x.id, true);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var t = readTime(form);
      if (!showTimeErrors(form, t, "time-error")) return;
      if (t.rate !== null) t.rate = Math.round(t.rate * 100) / 100;
      Object.assign(x, t, { updatedAt: now() });
      persist("Temps modifié.").then(function () { location.hash = "#/temps?mois=" + x.date.slice(0, 7); });
    });
    $("time-delete").addEventListener("click", function () {
      if (!confirm(state === "draft" ? "Supprimer ce temps ? Sa ligne reste dans le brouillon de facture : supprimez-la aussi." : "Supprimer ce temps ?")) return;
      data.timeEntries = data.timeEntries.filter(function (t) { return t.id !== x.id; });
      persist("Temps supprimé.").then(function () { location.hash = back; });
    });
    if ($("time-unlink")) $("time-unlink").addEventListener("click", function () {
      delete x.invoiceId;
      x.updatedAt = now();
      persist("Temps retiré du brouillon : supprimez aussi sa ligne dans le brouillon de facture.").then(function () { render(true); });
    });
  }

  function viewTimeInvoice(r) {
    var c = client(r.params.client);
    var due = c && E.unbilledByClient(data.timeEntries, data.documents).filter(function (x) { return x.clientId === c.id; })[0];
    if (!due) {
      view.innerHTML = '<div class="espace-head"><h2>Facturer le temps</h2></div><div class="card espace-card"><p class="muted">Aucun temps à facturer' +
        (c ? " pour " + esc(c.name) : "") + '.</p><p><a href="#/temps">Retour au temps passé</a></p></div>';
      return;
    }
    view.innerHTML = '<div class="espace-head"><h2>Facturer le temps : ' + esc(c.name) + "</h2></div>" +
      '<form class="card espace-card" id="ti-form" novalidate><fieldset class="time-pick"><legend>Temps à reprendre</legend>' +
      due.entries.map(function (t) {
        return '<label class="check"><input type="checkbox" name="entry" value="' + esc(t.id) + '" checked><span>' + day(t.date) + " · " + esc(t.task) + " · " +
          esc(E.durationLabel(t.quantity, t.unit)) + (t.rate === null || t.rate === undefined ? " · sans taux" : " · " + esc(money(t.rate)) + (t.unit === "day" ? " / jour" : " / heure")) + "</span></label>";
      }).join("") + '</fieldset><fieldset class="time-pick"><legend>Lignes de la facture</legend>' +
      '<label class="check"><input type="radio" name="mode" value="task" checked><span>Une ligne par tâche (temps regroupés, avec la période)</span></label>' +
      '<label class="check"><input type="radio" name="mode" value="entry"><span>Une ligne par saisie (avec sa date)</span></label></fieldset>' +
      '<h3>Aperçu des lignes</h3><div id="ti-preview" aria-live="polite"></div>' +
      '<p class="form-error" id="ti-error" role="alert" hidden></p><div class="espace-actions">' +
      '<button type="submit" class="btn btn-primary">Créer la facture en brouillon</button><a class="btn btn-ghost" href="#/temps">Annuler</a></div>' +
      '<p class="small muted">La facture est créée en brouillon : relisez-la, complétez les prix manquants, puis émettez-la comme d\'habitude.</p></form>';
    var form = $("ti-form");
    var picked = function () {
      var ids = Array.prototype.filter.call(form.querySelectorAll('[name="entry"]'), function (i) { return i.checked; }).map(function (i) { return i.value; });
      return due.entries.filter(function (t) { return ids.indexOf(t.id) > -1; });
    };
    var mode = function () { return form.querySelector('[name="mode"]:checked').value; };
    var preview = function () {
      var res = E.timeInvoice(picked(), mode());
      var ht = INV.compute({ lines: res.lines }).ht, missing = res.lines.filter(function (l) { return !isFinite(l.price); }).length;
      $("ti-preview").innerHTML = res.lines.length ? '<table class="ledger"><thead><tr><th>Désignation</th><th>Quantité × prix unitaire HT</th><th class="num">Total HT</th></tr></thead><tbody>' +
        res.lines.map(function (l) {
          var qty = OF.fmt(l.qty) + INV.UNITS[l.unit];
          return '<tr><td class="c-nature">' + esc(l.desc) + '</td><td class="c-method">' + esc(isFinite(l.price) ? qty + " × " + money(l.price) : qty + " · prix à saisir") +
            '</td><td class="num">' + (isFinite(l.price) ? esc(money(Math.round(l.qty * l.price * 100) / 100)) : "à saisir") + "</td></tr>";
        }).join("") + '</tbody><tfoot><tr><td colspan="2">Total HT' + (missing ? " (hors lignes sans prix)" : "") + '</td><td class="num">' + esc(money(ht)) + "</td></tr></tfoot></table>" +
        (missing ? '<p class="small muted">' + esc(countText(missing, "ligne", "lignes")) + " sans prix : à saisir dans le brouillon avant d'émettre la facture.</p>" : "")
        : '<p class="muted">Cochez au moins un temps.</p>';
    };
    form.addEventListener("change", preview);
    preview();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var list = picked();
      if (!list.length) { showError("ti-error", "Cochez au moins un temps à reprendre."); return; }
      var res = E.timeInvoice(list, mode());
      var d = newDraft("facture", c.id);
      d.lines = res.lines;
      d.serviceDate = res.serviceDate;
      data.documents.push(d);
      list.forEach(function (t) { t.invoiceId = d.id; t.updatedAt = now(); });
      persist("Facture créée en brouillon à partir de " + countText(list.length, "temps", "temps") + " : relisez-la, puis émettez-la.").then(function () {
        location.hash = "#/documents/" + d.id;
      });
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

  // ----- Prospects (documentation/38-prospects.md) -------------------------------------------------------------

  var STAGE_CLASSES = { new: "st-draft", talks: "st-unpaid", quote: "st-partial", won: "st-paid", lost: "st-draft" };
  var SOURCES = ["Recommandation", "Réseau", "Site web", "Réseaux sociaux", "Salon ou évènement", "Plateforme de freelances", "Prospection directe"];
  var CNIL = {
    email: "https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel",
    phone: "https://www.cnil.fr/fr/prospection-commerciale-par-telephone-hors-automate-dappel-quelles-sont-les-regles",
    optout: "https://www.cnil.fr/fr/comment-utiliser-une-liste-repoussoir-pour-respecter-lopposition-la-prospection"
  };
  function prospect(id) { return data.prospects.filter(function (p) { return p.id === id; })[0] || null; }
  function stageBadge(s) { return '<span class="st ' + STAGE_CLASSES[s] + '">' + esc(E.STAGE_LABELS[s]) + "</span>"; }
  var byNextDate = function (a, b) {
    var x = a.nextDate || "9999", y = b.nextDate || "9999";
    return x < y ? -1 : x > y ? 1 : String(a.name || "").localeCompare(String(b.name || ""), "fr");
  };

  /** Empreintes SHA-256 des clés de la liste d'opposition ("e:", "t:" ou "n:" suivi de l'empreinte en hexadécimal). */
  function optoutHashes(p) {
    if (!window.crypto || !crypto.subtle || !window.TextEncoder) return Promise.reject(new Error("crypto"));
    return Promise.all(E.optoutKeys(p).map(function (key) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)).then(function (buf) {
        return key.slice(0, 2) + Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      });
    }));
  }
  /** Oppositions dont une empreinte correspond : [{ optout, kinds }] (kinds : "e", "t", "n"). */
  function optoutMatches(hashes) {
    return data.optouts.map(function (o) {
      var kinds = (o.hashes || []).filter(function (h) { return hashes.indexOf(h) > -1; }).map(function (h) { return h.charAt(0); });
      return kinds.length ? { optout: o, kinds: kinds } : null;
    }).filter(Boolean);
  }

  /** Rappels du tableau de bord : relances dues et durée de conservation atteinte. */
  function prospectsReminder() {
    var due = E.followUps(data.prospects, data.documents, TODAY);
    var old = E.retentionDue(data.prospects, data.documents, TODAY, R.prospects_conservation.annees);
    return (due.length ? '<p class="notice espace-noprint">' + (due.length > 1 ? "Prospects à relancer : <b>" + due.length + "</b>" : "Un prospect à relancer : <b>" + esc(due[0].name) + "</b>") +
        (due[0].nextDate < TODAY ? " (relance prévue depuis le " + day(due[0].nextDate) + ")" : "") + '. <a href="#/prospects">Voir les relances</a></p>' : "") +
      (old.length ? '<p class="notice warn espace-noprint">' + esc(countText(old.length, "prospect", "prospects")) + " sans contact de leur part depuis " +
        R.prospects_conservation.annees + ' ans : demandez-leur s\'ils souhaitent continuer à recevoir vos messages, sinon supprimez leur fiche. <a href="#/prospects">Voir la liste</a></p>' : "");
  }

  /** Règles de la CNIL, en bref, selon le type de prospect (pro : vrai, faux, ou indéfini pour les deux). */
  function prospectRules(pro) {
    var t = R.prospection_telephone;
    var both = pro === undefined;
    var items = [];
    if (both || pro) items.push("<li><b>Professionnel</b> : par email ou par téléphone, si le message est en rapport avec son métier ; il doit être informé et pouvoir s'y opposer simplement et gratuitement.</li>");
    if (both || !pro) {
      items.push("<li><b>Particulier</b> : par email, seulement avec son accord préalable (case non cochée d'avance ; des conditions générales acceptées ne suffisent pas).</li>");
      items.push("<li><b>Particulier, par téléphone</b> (depuis le " + esc(longDay(t.depuis)) + ") : seulement avec son accord préalable, valable " +
        "un an au plus, sauf appel en rapport avec un contrat en cours ; du lundi au vendredi, de 10 h à 13 h et de 14 h à 20 h. Un particulier qui demande à être rappelé l'est dans les 5 jours ouvrables, sur ce qu'il a demandé.</li>");
    }
    items.push("<li>Chaque message dit qui vous êtes et permet de refuser les suivants par un moyen simple. Un refus n'a pas à être justifié et vaut pour la suite : utilisez « Ne plus contacter ».</li>");
    items.push("<li>Les données d'un prospect se gardent " + R.prospects_conservation.annees + " ans au plus après leur collecte ou après son dernier contact avec vous ; ensuite, demandez-lui s'il souhaite continuer à recevoir vos messages, sinon supprimez sa fiche.</li>");
    return '<ul class="small prospect-rules">' + items.join("") + '</ul><p class="small muted">Règles générales de la CNIL : ' +
      '<a href="' + CNIL.email + '" rel="noopener">prospection par email</a>, <a href="' + CNIL.phone + '" rel="noopener">par téléphone</a>, ' +
      '<a href="' + CNIL.optout + '" rel="noopener">respect de l\'opposition</a>. Pour écrire : <a href="/fr/modeles-emails-freelance/">modèles d\'emails</a>.</p>';
  }

  function prospectItem(p) {
    var v = E.prospectValue(p, data.documents);
    return '<li><a href="#/prospects/' + esc(p.id) + '"><span class="dl-main"><b>' + esc(p.name) + '</b><span class="small muted">' +
      esc([p.contact, p.nextDate ? "relance le " + day(p.nextDate) : ""].filter(Boolean).join(" · ") || (p.pro === false ? "Particulier" : "Professionnel")) +
      '</span></span><span class="dl-side"><b>' + (v === null ? "–" : esc(money(v))) + "</b></span></a></li>";
  }

  function viewProspects() {
    var docs = data.documents, list = data.prospects.slice().sort(byNextDate);
    var pipe = E.pipeline(list, docs), due = E.followUps(list, docs, TODAY);
    var old = E.retentionDue(list, docs, TODAY, R.prospects_conservation.annees);
    var groups = {};
    Object.keys(E.STAGE_LABELS).forEach(function (s) { groups[s] = []; });
    list.forEach(function (p) { groups[E.prospectStage(p, docs)].push(p); });
    var html = '<div class="espace-head"><h2>Prospects</h2><div class="espace-quick espace-noprint">' +
      '<a class="btn btn-primary btn-sm" href="#/prospects/nouveau">+ Prospect</a>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="prospects-csv"' + (list.length ? "" : " disabled") + ">Exporter (CSV)</button></div></div>";
    if (!list.length) {
      html += '<div class="card espace-card"><p class="muted">Pas encore de prospect. Notez vos pistes commerciales pour savoir qui relancer et quand, ' +
        "puis transformez une piste gagnée en client et en devis sans rien recopier.</p>" +
        '<a class="btn btn-primary btn-sm" href="#/prospects/nouveau">Ajouter un prospect</a></div>';
    } else {
      // Indicateurs (documentation/55, § 2) : carnet ouvert, relances, conversion des pistes closes, valeur moyenne d'une piste gagnée.
      var ps = ST.prospects(list, docs, TODAY);
      html += '<div class="kpis kpis-4">' +
        kpi("Pistes ouvertes", String(pipe.open.count), "valeur estimée : " + money(pipe.open.value)) +
        kpi("À relancer", String(due.length), ps.late ? "dont " + ps.late + " en retard" : due.length ? "aujourd'hui" : "aucune relance due") +
        (ps.closed12 ? kpi("Taux de conversion", pct(ps.conversion12), "12 derniers mois : " + countText(ps.closed12, "piste close", "pistes closes")) :
          kpi("Taux de conversion", ps.conversion === null ? "–" : pct(ps.conversion), ps.closed ? "toutes les pistes closes (" + ps.closed + ")" : "aucune piste close")) +
        kpi("Valeur moyenne gagnée", ps.wonAverage === null ? "–" : money(ps.wonAverage), ps.wonAverage === null ? "aucune piste gagnée" : "par piste gagnée") + "</div>";
      html += '<section class="card espace-card">' +
        (due.length ? '<h3>À relancer</h3><ul class="doc-list">' + due.map(function (p) {
          return '<li><a href="#/prospects/' + esc(p.id) + '"><span class="dl-main"><b>' + esc(p.name) + '</b><span class="small muted">' +
            esc(p.nextAction || "Relance prévue") + '</span></span><span class="dl-side"><b>' + day(p.nextDate) + "</b>" +
            (p.nextDate < TODAY ? '<span class="st st-overdue">En retard</span>' : '<span class="st st-unpaid">Aujourd\'hui</span>') + "</span></a></li>";
        }).join("") + "</ul>" : '<p class="small muted">Aucune relance prévue aujourd\'hui.</p>') + "</section>";
      // Entonnoir (documentation/55, § 2) : nombre de pistes et valeur par étape.
      var top = Math.max.apply(null, ps.stages.map(function (x) { return x.count; }));
      html += '<section class="card espace-card espace-noprint"><div class="card-head"><h3>Entonnoir</h3><span class="small muted">Pistes par étape et leur valeur.</span></div>' +
        '<ul class="bar-list funnel">' + ps.stages.map(function (x) {
          return '<li><span class="bl-name">' + esc(x.label) + '</span><span class="bl-bar" aria-hidden="true"><span class="' + (x.key === "lost" ? "is-lost" : x.key === "won" ? "is-won" : "") +
            '" style="width:' + (top > 0 ? Math.max(x.count ? 2 : 0, x.count / top * 100).toFixed(1) : 0) + '%"></span></span><b class="bl-amount">' + esc(countText(x.count, "piste", "pistes")) +
            '</b><span class="bl-share">' + esc(money(x.value)) + "</span></li>";
        }).join("") + "</ul></section>";
      var closedShown = ps.months.reduce(function (s, m) { return s + m.won + m.lost; }, 0);
      if (closedShown) {
        html += '<section class="card espace-card espace-noprint"><div class="card-head"><h3>Pistes gagnées et perdues</h3><span class="small muted">12 derniers mois, ' +
          "à la date de clôture.</span></div>" + '<div class="chart" data-chart="closed"></div>' +
          OF.charts.legend([{ cls: "is-in", label: "Gagnées" }, { cls: "is-prev", label: "Perdues" }]) +
          OF.charts.table("Pistes gagnées et perdues par mois", ["Mois", "Gagnées", "Perdues"], ps.months.map(function (m) { return [monthLabel(m.key), String(m.won), String(m.lost)]; })) +
          (ps.undated ? '<p class="small muted">' + esc(countText(ps.undated, "piste close avant le suivi des dates n'y figure pas", "pistes closes avant le suivi des dates n'y figurent pas")) + ".</p>" : "") +
          "</section>";
      }
      html += '<div class="pipeline">' + E.OPEN_STAGES.map(function (s) {
        return '<section class="card espace-card" aria-labelledby="stage-' + s + '"><div class="pipeline-head"><h3 id="stage-' + s + '">' + esc(E.STAGE_LABELS[s]) +
          '</h3><span class="small muted">' + esc(countText(pipe[s].count, "piste", "pistes")) + " · " + esc(money(pipe[s].value)) + "</span></div>" +
          (groups[s].length ? '<ul class="doc-list">' + groups[s].map(prospectItem).join("") + "</ul>" : '<p class="small muted">Aucune piste.</p>') + "</section>";
      }).join("") + "</div>";
      html += ["won", "lost"].map(function (s) {
        return groups[s].length ? '<details class="card details-card"><summary><span><b>' + esc(s === "won" ? "Gagnés" : "Perdus") + "</b> · " +
          esc(countText(pipe[s].count, "piste", "pistes")) + (s === "won" ? " · " + esc(money(pipe[s].value)) : "") + '</span></summary><ul class="doc-list">' +
          groups[s].map(prospectItem).join("") + "</ul></details>" : "";
      }).join("");
    }
    if (old.length) {
      html += '<section class="card espace-card" id="prospects-retention"><h3>Conservation des données</h3><p class="small">Ces prospects ne vous ont pas contacté depuis ' +
        R.prospects_conservation.annees + " ans (ou depuis la création de leur fiche) : demandez-leur s'ils souhaitent continuer à recevoir vos messages ; " +
        "sans réponse positive et explicite, supprimez leur fiche (référentiel de la CNIL).</p><ul class=\"time-due\">" + old.map(function (x) {
          return '<li><span class="dl-main"><a href="#/prospects/' + esc(x.prospect.id) + '"><b>' + esc(x.prospect.name) + '</b></a><span class="small muted">' +
            (E.lastContactFrom(x.prospect) ? "Dernier contact de sa part : " : "Fiche créée le ") + day(x.since) + "</span></span>" +
            '<button type="button" class="btn btn-ghost btn-sm" data-forget="' + esc(x.prospect.id) + '" aria-label="Supprimer la fiche de ' + esc(x.prospect.name) + '">Supprimer</button></li>';
        }).join("") + "</ul></section>";
    }
    html += '<section class="card espace-card"><h3>Liste d\'opposition</h3><p class="small">' +
      (data.optouts.length ? esc(countText(data.optouts.length, "personne a", "personnes ont")) + " demandé à ne plus être sollicitée" + (data.optouts.length > 1 ? "s" : "") + ". "
        : "Personne n'a encore demandé à ne plus être sollicité. ") +
      "Quand un prospect le demande, « Ne plus contacter » supprime sa fiche et ne garde qu'une empreinte de son email, de son téléphone et de son nom, " +
      "qui ne permet pas de les retrouver mais vous avertit si vous l'ajoutez de nouveau. La CNIL recommande de garder ces informations au moins " +
      R.prospects_opposition.conservation_min_annees + " ans.</p></section>" +
      '<section class="card espace-card"><h3>Prospecter dans les règles</h3>' + prospectRules() + "</section>";
    view.innerHTML = html;
    drawCharts = function () {
      var el = view.querySelector('[data-chart="closed"]');
      if (!el) return;
      el.innerHTML = OF.charts.bars({ width: Math.floor(el.getBoundingClientRect().width) || 600, height: 190, // des nombres de pistes : un graphique bas suffit
        groups: ps.months.map(function (m) { return { key: m.key, values: [m.won, m.lost], future: false }; }),
        series: [{ name: "Gagnées", cls: "is-in" }, { name: "Perdues", cls: "is-prev" }], title: "Pistes gagnées et perdues par mois",
        desc: "12 derniers mois : " + countText(ps.months.reduce(function (s, m) { return s + m.won; }, 0), "piste gagnée", "pistes gagnées") + ", " +
          countText(ps.months.reduce(function (s, m) { return s + m.lost; }, 0), "piste perdue", "pistes perdues") + "." });
    };
    drawCharts();
    view.querySelectorAll("[data-forget]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = prospect(b.getAttribute("data-forget"));
        if (!p || !confirm("Supprimer la fiche « " + p.name + " » et ses échanges ?")) return;
        data.prospects = data.prospects.filter(function (x) { return x.id !== p.id; });
        persist("Fiche « " + p.name + " » supprimée.").then(function () { render(true); });
      });
    });
    if (!list.length) return;
    $("prospects-csv").addEventListener("click", function () {
      OF.download("﻿" + E.prospectsCSV(list, docs), "prospects-" + TODAY + ".csv", "text/csv;charset=utf-8");
    });
  }

  function viewProspectForm(r) {
    var isNew = r.id === "nouveau";
    var p = isNew ? { id: S.uid(), name: "", contact: "", email: "", phone: "", pro: true, source: "", stage: "new", value: null, nextDate: "", nextAction: "",
                      notes: "", clientId: "", exchanges: [] } : prospect(r.id);
    if (!p) { view.innerHTML = '<div class="espace-head"><h2>Prospect introuvable</h2></div><p><a href="#/prospects">Retour aux prospects</a></p>'; return; }
    var docs = data.documents, stage = E.prospectStage(p, docs), min = E.minStage(p, docs), rank = E.OPEN_STAGES.concat(["won"]);
    var stageOptions = Object.keys(E.STAGE_LABELS).map(function (s) {
      var locked = s !== "lost" && rank.indexOf(s) < rank.indexOf(min);
      return '<option value="' + s + '"' + (s === stage ? " selected" : "") + (locked ? " disabled" : "") + ">" + esc(E.STAGE_LABELS[s]) + "</option>";
    }).join("");
    var c = p.clientId ? client(p.clientId) : null, quotes = E.prospectQuotes(p, docs), last = E.lastContactFrom(p);
    var html = '<div class="espace-head"><h2>' + (isNew ? "Nouveau prospect" : esc(p.name)) + "</h2>" + (isNew ? "" : stageBadge(stage)) + "</div>" +
      '<form class="card espace-card" id="prospect-form" novalidate><div class="fields">' +
      field("name", "Nom", p.name, { required: true, placeholder: "Atelier Lumen", hint: "Entreprise ou personne." }) +
      field("contact", "Interlocuteur", p.contact, { half: true, placeholder: "Inès Moreau" }) +
      field("pro", "Type", p.pro === false ? "0" : "1", { options: [["1", "Professionnel"], ["0", "Particulier"]], half: true }) +
      field("email", "Email", p.email, { type: "email", half: true }) +
      field("phone", "Téléphone", p.phone, { type: "tel", half: true }) +
      field("source", "Origine", p.source, { half: true, list: "prospect-sources", placeholder: "Recommandation" }) +
      '<datalist id="prospect-sources">' + SOURCES.map(function (s) { return '<option value="' + esc(s) + '">'; }).join("") + "</datalist>" +
      '<div class="field"><label for="ep-stage">Étape</label><select id="ep-stage" name="stage"' + (min !== "new" ? ' aria-describedby="ep-stage-hint"' : "") + ">" + stageOptions + "</select>" +
      (min !== "new" ? '<span class="hint" id="ep-stage-hint">' + esc(min === "talks" ? "Au moins « En discussion » : un échange est noté." :
        min === "quote" ? "Au moins « Devis envoyé » : un devis a été émis." : "« Gagné » : le devis a été accepté.") + "</span>" : "") + "</div>" +
      field("value", "Valeur estimée HT", p.value === null || p.value === undefined ? "" : rateText(p.value), { half: true, inputmode: "decimal", placeholder: "1 500",
        hint: "En euros, facultatif. Le montant du devis la remplace dès qu'il est émis." }) +
      field("nextDate", "Prochaine relance", p.nextDate, { type: "date", half: true }) +
      field("nextAction", "Action prévue", p.nextAction, { half: true, placeholder: "Rappeler pour le devis" }) +
      field("notes", "Notes", p.notes, { textarea: true }) +
      '</div><div id="prospect-optout" class="notice warn" role="alert" hidden></div><p class="form-error" id="prospect-error" role="alert" hidden></p>' +
      '<div class="espace-actions"><button type="submit" class="btn btn-primary">' + (isNew ? "Créer le prospect" : "Enregistrer") + "</button>" +
      '<a class="btn btn-ghost" href="#/prospects">Annuler</a></div></form>';
    if (!isNew) {
      html += '<section class="card espace-card"><h3>Échanges</h3><p class="small muted" id="prospect-last">' + (last ? "Dernier contact de sa part : " + day(last) + "."
          : "Aucun contact de sa part noté.") + (stage === "won" ? "" : " La durée de conservation de ses données (" + R.prospects_conservation.annees + " ans) part de " +
          (last ? "cette date" : "la création de la fiche, le " + day(String(p.createdAt || "").slice(0, 10))) + ".") + "</p>" +
        ((p.exchanges || []).length ? '<ul class="time-due exchanges">' + p.exchanges.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).map(function (x) {
          return '<li><span class="dl-main"><b>' + day(x.date) + " · " + (x.from === "them" ? "De sa part" : "De ma part") + '</b><span class="small">' + esc(x.text) + "</span></span>" +
            '<button type="button" class="btn btn-ghost btn-sm" data-exchange="' + esc(x.id) + '" aria-label="Supprimer l\'échange du ' + day(x.date) + '">Supprimer</button></li>';
        }).join("") + "</ul>" : "") +
        '<form id="exchange-form" class="espace-noprint" novalidate><div class="fields">' +
        field("xdate", "Date", TODAY, { type: "date", half: true }) +
        field("xfrom", "Qui a pris contact ?", "me", { options: [["me", "Moi"], ["them", "Le prospect"]], half: true,
          hint: "« Le prospect » : il vous a appelé, écrit, demandé un document… (une simple ouverture d'email ne compte pas)." }) +
        field("xtext", "Résumé", "", { placeholder: "Appel : intéressé, devis à envoyer avant vendredi" }) +
        '</div><p class="form-error" id="exchange-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-ghost">Noter l\'échange</button></div></form></section>' +
        '<section class="card espace-card"><h3>Client et devis</h3>' +
        (c ? '<p>Client : <a href="#/clients/' + esc(c.id) + '">' + esc(c.name) + "</a></p>"
          : '<p class="small muted">Créez le client à partir de cette fiche, ou liez la piste à un client existant.</p><div class="espace-actions">' +
            '<a class="btn btn-ghost" href="#/clients/nouveau?piste=' + esc(p.id) + '">Créer le client</a></div>' +
            (data.clients.some(function (x) { return !x.archived; }) ? '<div class="fields link-client"><div class="field"><label for="pr-client">Client existant</label><select id="pr-client">' +
              options([["", "Choisir un client…"]].concat(data.clients.filter(function (x) { return !x.archived; })
                .sort(function (a, b) { return String(a.name).localeCompare(String(b.name), "fr"); }).map(function (x) { return [x.id, x.name]; })), "") +
              '</select></div><div class="field"><button type="button" class="btn btn-ghost" id="pr-link">Lier ce client</button></div></div>' : "")) +
        '<div class="espace-actions"><a class="btn btn-primary" href="' + (c ? "#/documents/nouveau?type=devis&client=" + esc(c.id) + "&piste=" + esc(p.id)
          : "#/clients/nouveau?piste=" + esc(p.id) + "&devis=1") + '">Faire un devis</a></div>' +
        (quotes.length ? docTable(quotes) : "") + "</section>" +
        '<section class="card espace-card"><h3>Règles pour ' + (p.pro === false ? "un particulier" : "un professionnel") + "</h3>" + prospectRules(p.pro !== false) +
        '<div class="espace-actions">' + (p.email ? '<a class="btn btn-ghost" href="mailto:' + esc(encodeURIComponent(p.email).replace(/%40/g, "@")) + '">Écrire</a>' : "") +
        '<button type="button" class="btn btn-ghost" id="prospect-optout-btn">Ne plus contacter</button>' +
        '<button type="button" class="btn btn-ghost" id="prospect-delete">Supprimer</button></div><p class="form-error" id="prospect-action-error" role="alert" hidden></p></section>';
    }
    view.innerHTML = html;
    bindProspectForm(p, isNew);
    if (!isNew) bindProspectSheet(p);
  }

  function bindProspectForm(p, isNew) {
    var form = $("prospect-form"), f = form.elements, notice = $("prospect-optout"), confirmed = false;
    var identity = function (x) { return E.optoutKeys(x).join("|"); };
    form.addEventListener("input", function () { confirmed = false; notice.hidden = true; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = f.value.value.trim();
      var next = { name: f.name.value.trim(), contact: f.contact.value.trim(), pro: f.pro.value === "1", email: f.email.value.trim(), phone: f.phone.value.trim(),
                   source: f.source.value.trim(), stage: f.stage.value, value: value ? OF.num(value) : null, nextDate: f.nextDate.value,
                   nextAction: f.nextAction.value.trim(), notes: f.notes.value.trim() };
      var errors = E.prospectErrors(next), bad = {};
      errors.forEach(function (x) { bad[x.field] = true; });
      ["name", "email", "value", "nextDate", "stage"].forEach(function (k) { f[k].setAttribute("aria-invalid", String(!!bad[k])); });
      showError("prospect-error", errors.map(function (x) { return x.message; }).join(" "));
      if (errors.length) { f[errors[0].field].focus(); return; }
      if (next.value !== null) next.value = Math.round(next.value * 100) / 100;
      var save = function () {
        // Date de clôture (documentation/55, § 7) : posée quand la piste passe à « Gagné » ou « Perdu », gardée si l'étape ne
        // change pas (une piste close avant ce suivi reste sans date), retirée si elle est rouverte.
        var closing = next.stage === "won" || next.stage === "lost";
        if (closing && (isNew || p.stage !== next.stage)) next.closedAt = TODAY;
        Object.assign(p, next, { updatedAt: now() });
        if (!closing) delete p.closedAt;
        if (isNew) { p.createdAt = p.updatedAt; data.prospects.push(p); }
        persist(isNew ? "Prospect créé." : "Prospect enregistré.").then(function () { location.hash = isNew ? "#/prospects/" + p.id : "#/prospects"; });
      };
      // Liste d'opposition : vérifiée à la création et quand le nom, l'email ou le téléphone changent.
      if (confirmed || !data.optouts.length || (!isNew && identity(next) === identity(p))) { save(); return; }
      optoutHashes(next).then(function (hashes) {
        var matches = optoutMatches(hashes);
        if (!matches.length) { save(); return; }
        var direct = matches.filter(function (m) { return m.kinds.some(function (k) { return k !== "n"; }); });
        var since = matches.map(function (m) { return m.optout.date; }).sort()[0];
        notice.innerHTML = "<p>" + (direct.length ? "Cette personne a demandé le " + day(since) + " à ne plus être sollicitée (même " +
            (direct[0].kinds.indexOf("e") > -1 ? "email" : "téléphone") + " dans votre liste d'opposition). Ne la prospectez pas ; si c'est elle qui vous recontacte, vous pouvez lui répondre."
          : "Un prospect du même nom figure dans votre liste d'opposition (depuis le " + day(since) + ") : vérifiez qu'il ne s'agit pas de la même personne.") + "</p>" +
          '<div class="espace-actions"><button type="button" class="btn btn-ghost btn-sm" id="optout-save">Enregistrer quand même</button>' +
          (direct.length ? '<button type="button" class="btn btn-ghost btn-sm" id="optout-remove">Elle a de nouveau donné son accord : retirer de la liste</button>' : "") + "</div>";
        notice.hidden = false;
        $("optout-save").focus();
        $("optout-save").addEventListener("click", function () { confirmed = true; save(); });
        if ($("optout-remove")) $("optout-remove").addEventListener("click", function () {
          var gone = direct.map(function (m) { return m.optout.id; });
          data.optouts = data.optouts.filter(function (o) { return gone.indexOf(o.id) < 0; });
          confirmed = true;
          save();
        });
      }, function () {
        showError("prospect-error", "Votre navigateur ne permet pas de vérifier la liste d'opposition : mettez-le à jour.");
      });
    });
  }

  function bindProspectSheet(p) {
    var xf = $("exchange-form").elements;
    $("exchange-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var x = { date: xf.xdate.value, from: xf.xfrom.value, text: xf.xtext.value.trim() };
      var errors = E.exchangeErrors(x, TODAY), names = { date: "xdate", from: "xfrom", text: "xtext" }, bad = {};
      errors.forEach(function (err) { bad[err.field] = true; });
      ["date", "from", "text"].forEach(function (k) { xf[names[k]].setAttribute("aria-invalid", String(!!bad[k])); });
      showError("exchange-error", errors.map(function (err) { return err.message; }).join(" "));
      if (errors.length) { xf[names[errors[0].field]].focus(); return; }
      x.id = S.uid();
      x.createdAt = x.updatedAt = p.updatedAt = now();
      p.exchanges = (p.exchanges || []).concat([x]);
      persist("Échange noté.").then(function () { render(true); $("ep-xtext").focus(); });
    });
    view.querySelectorAll("[data-exchange]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Supprimer cet échange ?")) return;
        p.exchanges = p.exchanges.filter(function (x) { return x.id !== b.getAttribute("data-exchange"); });
        p.updatedAt = now();
        persist("Échange supprimé.").then(function () { render(true); $("ep-xtext").focus(); });
      });
    });
    if ($("pr-link")) $("pr-link").addEventListener("click", function () {
      var id = $("pr-client").value;
      if (!id) { $("pr-client").focus(); return; }
      p.clientId = id;
      p.updatedAt = now();
      persist("Piste liée au client " + clientName(id) + ".").then(function () { render(true); });
    });
    $("prospect-delete").addEventListener("click", function () {
      if (!confirm("Supprimer la fiche « " + p.name + " » et ses échanges ?")) return;
      data.prospects = data.prospects.filter(function (x) { return x.id !== p.id; });
      persist("Fiche « " + p.name + " » supprimée.").then(function () { location.hash = "#/prospects"; });
    });
    $("prospect-optout-btn").addEventListener("click", function () {
      if (!confirm("« " + p.name + " » ne souhaite plus être sollicité : la fiche et ses échanges sont supprimés. L'Espace garde seulement une empreinte de son email, " +
        "de son téléphone et de son nom, qui ne permet pas de les retrouver, pour vous avertir si vous l'ajoutez de nouveau. Continuer ?")) return;
      optoutHashes(p).then(function (hashes) {
        var stamp = now();
        data.optouts.push({ id: S.uid(), date: TODAY, hashes: hashes, createdAt: stamp, updatedAt: stamp });
        data.prospects = data.prospects.filter(function (x) { return x.id !== p.id; });
        persist("Opposition enregistrée : la fiche « " + p.name + " » est supprimée.").then(function () { location.hash = "#/prospects"; });
      }, function () {
        showError("prospect-action-error", "Votre navigateur ne permet pas de calculer les empreintes de la liste d'opposition : mettez-le à jour.");
      });
    });
  }

  // ----- Trésorerie (documentation/39-tresorerie.md ; version 2, § 7) ----------------------------------------------

  var CHARGE_EVERY = [["month", "Chaque mois"], ["quarter", "Chaque trimestre"], ["year", "Chaque année"], ["once", "Une seule fois"]];
  var CHARGE_FLOW = [["out", "Sortie (charge, achat, rémunération)"], ["in", "Entrée (hors factures émises)"]];
  var HORIZONS = [3, 6, 12];
  function treasuryInput(over) {
    return Object.assign({ documents: data.documents, charges: data.charges, profile: profile(), rules: R, events: CAL, today: TODAY, months: 6 }, over || {});
  }
  var signed = function (n) { return (n < 0 ? "−" : "+") + OF.eur(Math.abs(n)).replace(/^-/, ""); };
  var hasCash = function () { var c = profile().cashBalance; return c !== undefined && c !== null && c !== "" && isFinite(Number(c)); };
  var threshold = function () { return Math.max(0, Number(profile().cashThreshold) || 0); };
  function charge(id) { return data.charges.filter(function (c) { return c.id === id; })[0] || null; }
  /** Premier jour où le solde prévu passe sous le seuil (ou sous zéro) : { date, balance } ou null. */
  function firstBelow(curve, limit) {
    return curve ? curve.points.filter(function (pt) { return pt.balance < limit; })[0] || null : null;
  }

  /** Rappel du tableau de bord : le solde prévu passe sous zéro ou sous le seuil de sécurité dans les 6 mois. */
  function treasuryReminder() {
    if (!hasCash()) return "";
    var curve = E.balanceCurve(E.forecast(treasuryInput())), limit = threshold(), below = firstBelow(curve, limit);
    if (!below) return "";
    var under = firstBelow(curve, 0);
    return '<p class="notice warn espace-noprint">Prévision de trésorerie : votre compte passerait ' +
      (under ? "sous zéro le <b>" + day(under.date) + "</b>" : "sous votre seuil de sécurité (" + esc(money(limit)) + ") le <b>" + day(below.date) + "</b>") +
      '. <a href="#/tresorerie">Voir la trésorerie</a></p>';
  }

  function chargeFields(c) {
    var flow = c.flow === "in" ? "in" : "out";
    return field("label", "Libellé", c.label, { required: true, placeholder: flow === "in" ? "Mission en cours" : "Logiciel de comptabilité" }) +
      field("flow", "Sens", flow, { options: CHARGE_FLOW, half: true }) +
      field("amount", "Montant", rateText(c.amount), { half: true, inputmode: "decimal", placeholder: "30", hint: "En euros, ce qui sort du compte ou y entre." }) +
      field("every", "Fréquence", c.every || "month", { options: CHARGE_EVERY, half: true }) +
      field("start", c.every === "once" ? "Date" : "Prochaine échéance", c.start || "", { type: "date", half: true }) +
      field("end", "Dernière échéance (facultatif)", c.end || "", { type: "date", half: true, hint: "Pour un mouvement régulier qui s'arrête." }) +
      '<div class="field full charge-revenue"' + (flow === "in" ? "" : " hidden") + '><label class="check"><input type="checkbox" id="ep-revenue" name="revenue"' +
      (c.revenue ? " checked" : "") + "><span>C'est du chiffre d'affaires à venir : estimer les cotisations" +
      (profile().vatRegime && profile().vatRegime !== "franchise" ? " et la TVA" : "") + " dessus</span></label></div>";
  }
  function readCharge(form) {
    var f = form.elements, amount = f.amount.value.trim(), flow = f.flow.value === "in" ? "in" : "out";
    return { label: f.label.value.trim(), amount: amount ? OF.num(amount) : NaN, every: f.every.value, start: f.start.value,
             end: f.every.value === "once" ? "" : f.end.value, flow: flow, revenue: flow === "in" && !!(f.revenue && f.revenue.checked) };
  }
  function showChargeErrors(form, c, errorId) {
    var errors = E.chargeErrors(c), bad = {};
    errors.forEach(function (e) { bad[e.field] = true; });
    ["label", "amount", "every", "start", "end", "flow"].forEach(function (k) { form.elements[k].setAttribute("aria-invalid", String(!!bad[k])); });
    showError(errorId, errors.map(function (e) { return e.message; }).join(" "));
    if (errors.length) form.elements[errors[0].field].focus();
    return !errors.length;
  }
  /** Le formulaire s'adapte : case « chiffre d'affaires » pour une entrée, libellé de date et dernière échéance pour un mouvement ponctuel. */
  function bindChargeForm(form) {
    var sync = function () {
      var f = form.elements, once = f.every.value === "once";
      form.querySelector(".charge-revenue").hidden = f.flow.value !== "in";
      form.querySelector('label[for="ep-start"]').textContent = once ? "Date" : "Prochaine échéance";
      f.end.closest(".field").hidden = once;
    };
    form.elements.flow.addEventListener("change", sync);
    form.elements.every.addEventListener("change", sync);
    sync();
  }

  /** Tuile d'indicateur de la trésorerie : value et sub sont déjà du HTML échappé (liens, montants). */
  function tile(label, value, sub, cls) {
    return '<div class="card kpi' + (cls ? " " + cls : "") + '"><span class="kpi-label">' + esc(label) + '</span><b class="kpi-value">' + value + "</b>" +
      (sub ? '<span class="kpi-sub">' + sub + "</span>" : "") + "</div>";
  }
  var lateText = function (n) { return n === 1 ? "1 jour de retard" : n + " jours de retard"; };
  var KIND_LABELS = { receipt: "Facture attendue", refund: "Remboursement", urssaf: "Urssaf", vat: "TVA", charge: "Charge", planned: "Entrée prévue" };
  var AGING_CLS = { notDue: "is-ok", d30: "is-near", d60: "is-warn", d90: "is-hot", more: "is-bad" };
  var drawCharts = null;

  function viewTreasury(r) {
    var p = profile(), params = r.params || {};
    var months = HORIZONS.indexOf(+params.horizon) > -1 ? +params.horizon : 6, scenario = params.scenario === "prudent" ? "prudent" : "prevu";
    var other = scenario === "prudent" ? "prevu" : "prudent";
    var o = E.owed(treasuryInput()), f = E.forecast(treasuryInput({ months: months, scenario: scenario }));
    var g = E.forecast(treasuryInput({ months: months, scenario: other }));
    var curve = E.balanceCurve(f), altCurve = E.balanceCurve(g), limit = threshold();
    var hasBalance = f.start !== null, stale = hasBalance && p.cashDate && (Date.parse(TODAY) - Date.parse(p.cashDate)) / 864e5 > 7;
    var available = hasBalance ? Math.round((f.start - o.total) * 100) / 100 : null, safe = E.safeAmount(curve, limit);
    var stats = E.paymentStats(data.documents, ST.since12(TODAY), TODAY), ag = E.aging(data.documents, TODAY);
    var monthly = E.monthlyCharges(data.charges, TODAY), run = E.runway(available, monthly), be = E.breakEven(monthly, p, R, TODAY);
    var thisMonth = TODAY.slice(0, 8) + "01";
    var hist12 = E.cashHistory(data.documents, data.expenses, E.addMonths(thisMonth, -12), new Date(Date.parse(thisMonth) - 864e5).toISOString().slice(0, 10));
    // Encaissé moyen : seulement les mois depuis le début d'activité (une activité récente n'est pas diluée sur 12 mois).
    var startKey = String(p.startDate || "").slice(0, 7), active = hist12.filter(function (m) { return !startKey || m.key >= startKey; });
    var avgIn = active.length ? Math.round(active.reduce(function (s, m) { return s + m.in; }, 0) / active.length) : 0;
    var past = hist12.slice(-6), quotes = E.quotesToInvoice(data.documents);
    var url = function (h, s) { return "#/tresorerie?horizon=" + h + "&scenario=" + s; };

    // Ce qui est déjà dû (v1).
    var owedLines = o.urssaf.periods.filter(function (x) { return x.amount > 0; }).map(function (x) {
      return "<li>Cotisations " + (x.period.key.indexOf("T") > -1 ? "du " : "de ") + esc(x.period.label) + " (sur " + esc(money(x.cashed)) + " encaissés, à payer au plus tard le " +
        day(x.due) + ") : <b>" + esc(money(x.amount)) + "</b></li>";
    });
    if (p.vatRegime === "normal" && o.vat.total > 0) owedLines.push("<li>TVA collectée pas encore déclarée : <b>" + esc(money(o.vat.total)) + "</b></li>");
    if (p.vatRegime === "simplified") {
      owedLines.push("<li>TVA collectée depuis le 1er janvier" + (o.vat.advances ? ", acomptes déjà versés déduits (" + esc(money(o.vat.advances)) + ")" : "") +
        " : <b>" + esc(money(o.vat.total)) + "</b></li>");
    }
    var notes = [];
    if (o.vat.advancesUnknown) notes.push("Indiquez la TVA due au titre de l'année précédente pour déduire les acomptes de juillet et de décembre.");
    if (o.vat.previousYearDue) notes.push("Le solde de la TVA de " + (+TODAY.slice(0, 4) - 1) + ", payé avec la déclaration annuelle (CA12) au plus tard le " + day(o.vat.previousYearDue) + ", n'est pas compté.");
    if (!o.urssaf.computed) notes.push("Hors micro-entreprise, les cotisations sociales ne sont pas estimées ici.");

    var lowBad = curve && curve.low.balance < limit, below = firstBelow(curve, limit);
    var kpis = '<div class="kpis kpis-4">' +
      tile("Solde du compte", hasBalance ? esc(money(f.start)) : "–", hasBalance ? "au " + day(p.cashDate || TODAY) + (stale ? " · à mettre à jour" : "") :
        '<a href="#tr-settings">Indiquer le solde</a>', stale ? "is-warn" : "") +
      tile("Disponible", available === null ? "–" : esc(money(available)), "après " + esc(money(o.total)) + " déjà dus (estimés)", available !== null && available < 0 ? "is-bad" : "is-brand") +
      tile("Point bas prévu", curve ? esc(money(curve.low.balance)) : "–", curve ? (curve.low.date === TODAY ? "aujourd'hui" : "le " + day(curve.low.date)) +
        (lowBad ? (curve.low.balance < 0 ? " · sous zéro" : " · sous votre seuil") : "") : "avec le solde du compte", lowBad ? "is-bad" : "") +
      tile("Versement possible", safe === null ? "–" : esc(money(safe)), safe === null ? "avec le solde du compte" :
        "sans passer sous " + (limit ? "votre seuil (" + esc(money(limit)) + ")" : "zéro") + " d'ici " + esc(E.period(f.until.slice(0, 7)).label)) +
      tile("À encaisser", esc(money(ag.total)), ag.late ? "dont " + esc(money(ag.late)) + " en retard (" + ag.lateCount + " facture" + (ag.lateCount > 1 ? "s" : "") + ")" : "aucune facture en retard",
        ag.late ? "is-warn" : "") +
      tile("Délai moyen de paiement", stats.count ? esc(OF.fmt(stats.avgDays)) + " j" : "–", stats.count ? "retard moyen " + esc(OF.fmt(stats.avgLate)) + " j · " +
        Math.round(stats.onTime * 100) + " % payées à l'heure (12 mois)" : "pas encore de facture payée") +
      tile("Autonomie", run === null ? "–" : esc(OF.fmt(run)) + " mois", run === null ? (monthly ? "avec le solde du compte" : '<a href="#tr-charges">Notez vos charges</a>') :
        "disponible ÷ " + esc(money(monthly)) + " de charges par mois", run !== null && run < 2 ? "is-warn" : "") +
      tile("Point mort", be === null ? "–" : esc(money(be)), be === null ? "chiffre d'affaires mensuel nécessaire (micro-entreprise, charges notées)" :
        "à encaisser par mois · encaissé moyen : " + esc(money(avgIn)) + (active.length ? " (" + active.length + " mois)" : ""), be !== null && avgIn < be ? "is-warn" : "") + "</div>";

    var tools = '<div class="tr-tools espace-noprint"><div class="seg" role="group" aria-label="Horizon de la prévision">' + HORIZONS.map(function (h) {
        return '<a class="tab" href="' + url(h, scenario) + '"' + (h === months ? ' aria-current="true"' : "") + ">" + h + " mois</a>";
      }).join("") + '</div><div class="seg" role="group" aria-label="Scénario">' +
      '<a class="tab" href="' + url(months, "prevu") + '"' + (scenario === "prevu" ? ' aria-current="true"' : "") + ">Prévu</a>" +
      '<a class="tab" href="' + url(months, "prudent") + '"' + (scenario === "prudent" ? ' aria-current="true"' : "") + ">Prudent</a></div>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="tr-csv">Exporter la prévision (CSV)</button></div>';

    var scenarioNote = scenario === "prudent" ? "Scénario prudent : factures déjà en retard non comptées, autres factures attendues avec le retard moyen de chaque client." :
      "Scénario prévu : chaque facture attendue à son échéance ; les factures en retard, aujourd'hui.";
    var balanceCard = '<section class="card espace-card"><div class="card-head"><h3>Solde prévu</h3><span class="small muted">' + esc(scenarioNote) + "</span></div>" +
      (below ? '<p class="notice warn">Votre compte passerait ' + (below.balance < 0 ? "sous zéro" : "sous votre seuil de sécurité") + " le <b>" + day(below.date) +
        "</b> : relancez les factures en retard, décalez une dépense ou prévoyez une réserve.</p>" : "") +
      (curve ? '<div class="chart" data-chart="balance"></div>' + OF.charts.legend([{ cls: "is-main", label: scenario === "prudent" ? "Prudent" : "Prévu" },
          { cls: "is-alt", label: scenario === "prudent" ? "Prévu" : "Prudent" }].concat(limit ? [{ cls: "is-threshold", label: "Seuil de sécurité (" + money(limit) + ")" }] : [])) +
        OF.charts.table("Solde prévu en fin de mois", ["Mois", "Solde en fin de mois", scenario === "prudent" ? "Prévu" : "Prudent"], f.months.map(function (m, i) {
          return [m.label, money(m.balance), money(g.months[i].balance)];
        })) : '<p class="muted">Indiquez le solde de votre compte (<a href="#tr-settings">réglages de la trésorerie</a>) pour voir la courbe du solde.</p>') + "</section>";

    var groups = past.map(function (m) { return { key: m.key, label: m.label, values: [m.in, m.out], future: false }; }).concat(f.months.map(function (m) {
      return { key: m.key, label: m.label, values: [m.in, m.out], future: true };
    }));
    var flowCard = '<section class="card espace-card"><div class="card-head"><h3>Entrées et sorties par mois</h3><span class="small muted">6 derniers mois : encaissements et dépenses saisies ; ensuite, la prévision.</span></div>' +
      '<div class="chart" data-chart="flows"></div>' + OF.charts.legend([{ cls: "is-in", label: "Entrées" }, { cls: "is-out", label: "Sorties" }, { cls: "is-future", label: "Prévu (hachuré)" }]) +
      OF.charts.table("Entrées et sorties par mois", ["Mois", "Entrées", "Sorties", "Écart"], groups.map(function (gr) {
        return [gr.label + (gr.future ? " (prévu)" : ""), money(gr.values[0]), money(gr.values[1]), signed(gr.values[0] - gr.values[1])];
      })) + "</section>";

    var owedCard = '<section class="card espace-card"><h3>Déjà dû (estimé)</h3>' +
      (owedLines.length ? '<ul class="small treasury-owed">' + owedLines.join("") + "</ul>" : '<p class="small muted">Rien n\'est dû pour l\'instant sur vos encaissements.</p>') +
      (notes.length ? '<p class="small muted">' + notes.map(esc).join(" ") + "</p>" : "") + "</section>";

    var agingCard = '<section class="card espace-card"><div class="card-head"><h3>Créances clients</h3><span class="small muted">' + esc(money(ag.total)) + " à encaisser</span></div>" +
      (ag.total ? '<div class="chart" data-chart="aging"></div>' + '<ul class="ch-legend ch-legend-values">' + ag.buckets.map(function (b) {
          return '<li><span class="ch-key ' + AGING_CLS[b.key] + '" aria-hidden="true"></span>' + esc(b.label) + " : <b>" + esc(money(b.amount)) + "</b>" + (b.count ? " (" + b.count + ")" : "") + "</li>";
        }).join("") + "</ul>" +
        (ag.items.filter(function (x) { return x.lateDays > 0; }).length ? '<h4>Factures en retard</h4><ul class="time-due">' + ag.items.filter(function (x) { return x.lateDays > 0; }).slice(0, 8).map(function (x) {
          var who = (x.doc.snapshot && x.doc.snapshot.client && x.doc.snapshot.client.name) || "";
          return '<li><span class="dl-main"><a href="#/documents/' + esc(x.doc.id) + '"><b>' + esc(x.doc.number) + "</b></a>" + '<span class="small muted">' + esc(who) +
            " · échéance le " + day(x.due) + " · " + lateText(x.lateDays) + '</span></span><span class="dl-side"><b>' + esc(money(x.amount)) +
            '</b><a class="small" href="#/documents/' + esc(x.doc.id) + '">Relancer</a></span></li>';
        }).join("") + '</ul><p class="small muted">Entre professionnels, des pénalités de retard sont dues de plein droit : <a href="/fr/penalites-de-retard/">calculer les pénalités</a>.</p>' : "") :
        '<p class="small muted">Aucune facture en attente de paiement.</p>') +
      (quotes.count ? '<p class="small">Devis acceptés à facturer : <b>' + esc(money(quotes.amount)) + "</b> (" + quotes.count + " devis), non comptés dans la prévision. " +
        '<a href="#/documents?filtre=devis">Voir les devis</a></p>' : "") + "</section>";

    var soon = f.items.filter(function (x) { return x.date <= INV.addDays(TODAY, 30); });
    var upcomingCard = '<section class="card espace-card"><h3>Prochains mouvements (30 jours)</h3>' + (soon.length ? '<ul class="treasury-upcoming">' + soon.map(function (x) {
        return '<li><span class="c-date">' + day(x.date) + '</span><span class="tr-label">' + esc(x.label) + '<span class="tr-kind">' + esc(KIND_LABELS[x.kind] || "") +
          (x.late ? " · en retard" : "") + (x.delay ? " · décalée de " + x.delay + " j" : "") + '</span></span><b class="num' + (x.amount < 0 ? " is-out" : " is-in") + '">' + esc(signed(x.amount)) + "</b></li>";
      }).join("") + "</ul>" : '<p class="small muted">Aucun mouvement prévu dans les 30 jours.</p>') + "</section>";

    var monthsCard = '<section class="card espace-card"><h3>Détail mois par mois</h3>' +
      '<table class="ledger treasury-table"><thead><tr><th>Mois</th><th class="num">Entrées</th><th class="num">Sorties</th><th class="num">Solde en fin de mois</th></tr></thead><tbody>' +
      f.months.map(function (m) {
        return '<tr' + (m.balance !== null && m.balance < 0 ? ' class="is-negative"' : "") + '><td class="c-date">' + esc(m.label) + '</td><td class="num" data-label="Entrées">' + esc(money(m.in)) +
          '</td><td class="num" data-label="Sorties">' + esc(money(m.out)) + '</td><td class="num" data-label="Solde en fin de mois">' + (m.balance === null ? "–" : esc(money(m.balance))) + "</td></tr>";
      }).join("") + "</tbody></table>" +
      f.months.filter(function (m) { return m.items.length; }).map(function (m) {
        return '<details class="treasury-month"><summary>Détail de ' + esc(m.label) + "</summary><ul>" + m.items.map(function (x) {
          return '<li><span class="c-date">' + day(x.date) + "</span><span>" + esc(x.label) + (x.late ? " · en retard" : "") + '</span><b class="num">' + esc(signed(x.amount)) + "</b></li>";
        }).join("") + "</ul></details>";
      }).join("") +
      (f.calendarShort ? '<p class="small muted">Le calendrier fiscal ne couvre pas encore toute la période : les dernières échéances fiscales peuvent manquer.</p>' : "") + "</section>";

    var chargesCard = '<section class="card espace-card" id="tr-charges"><h3>Mouvements prévus</h3>' +
      '<p class="small muted">Charges régulières (loyer, logiciels, assurance, votre rémunération), dépenses ou rentrées ponctuelles, chiffre d\'affaires attendu hors factures émises.</p>' +
      (data.charges.length ? '<ul class="time-due charges-list">' + data.charges.slice().sort(function (a, b) { return String(a.label).localeCompare(String(b.label), "fr"); }).map(function (c) {
        var next = E.chargeDates(c, TODAY, "9999-12-31")[0], isInFlow = c.flow === "in";
        return '<li><span class="dl-main"><a href="#/tresorerie/' + esc(c.id) + '"><b>' + esc(c.label) + '</b></a><span class="small muted">' + (isInFlow ? "Entrée" + (c.revenue ? " (chiffre d'affaires)" : "") : "Sortie") +
          " · " + esc(E.CHARGE_LABELS[c.every] || "") + (next ? (c.every === "once" ? " · le " : " · prochaine le ") + day(next) : " · terminée") +
          '</span></span><span class="dl-side"><b class="' + (isInFlow ? "is-in" : "is-out") + '">' + esc(signed(isInFlow ? Number(c.amount) : -Number(c.amount))) + "</b></span></li>";
      }).join("") + "</ul>" : '<p class="small muted">Rien de prévu pour l\'instant.</p>') +
      '<form id="charge-form" class="espace-noprint" novalidate><h4>Ajouter un mouvement prévu</h4><div class="fields">' + chargeFields({ every: "month", start: TODAY, flow: "out" }) + "</div>" +
      '<p class="form-error" id="charge-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-ghost">Ajouter</button></div></form></section>';

    var settingsCard = '<form class="card espace-card espace-noprint" id="cash-form" novalidate><h3 id="tr-settings" tabindex="-1">Réglages de la trésorerie</h3><div class="fields">' +
      field("cashBalance", "Solde du compte professionnel", hasBalance ? rateText(f.start) : "", { half: true, inputmode: "decimal", placeholder: "4 250",
        hint: "En euros, tel qu'affiché par votre banque." }) +
      field("cashDate", "À la date du", p.cashDate || TODAY, { type: "date", half: true }) +
      field("cashThreshold", "Seuil de sécurité (facultatif)", rateText(p.cashThreshold), { half: true, inputmode: "decimal", placeholder: "0",
        hint: "Le solde sous lequel vous ne voulez pas descendre : la courbe le montre et l'Espace vous prévient avant." }) +
      (p.vatRegime === "simplified" ? field("vatLastYear", "TVA due au titre de l'année précédente", rateText(p.vatLastYear), { half: true, inputmode: "decimal",
        hint: "Montant de la déclaration annuelle (CA12) : il fixe les acomptes de juillet (55 %) et de décembre (40 %). Moins de 1 000 € : pas d'acompte." }) : "") +
      '</div><p class="form-error" id="cash-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-primary">Enregistrer</button></div>' +
      (stale ? '<p class="notice warn">Solde saisi le ' + day(p.cashDate) + " : mettez-le à jour pour une prévision juste.</p>" : "") + "</form>";

    var assumptions = '<section class="card espace-card"><h3>Hypothèses</h3><ul class="small prospect-rules">' +
      "<li>Montants estimés à partir de vos factures, encaissements, dépenses et mouvements prévus ; " + esc(scenarioNote.charAt(0).toLowerCase() + scenarioNote.slice(1)) + "</li>" +
      (o.urssaf.computed ? "<li>Cotisations : chiffre d'affaires encaissé de chaque période (et chiffre d'affaires prévu) × taux de votre activité (" +
        (p.vl ? "formation professionnelle et versement libératoire compris" : "formation professionnelle comprise") + "), à la date limite de la déclaration.</li>" : "") +
      (p.vatRegime && p.vatRegime !== "franchise" ? "<li>TVA : due à l'encaissement pour les prestations de services, à la facture pour les ventes de biens (ou avec l'option pour les débits) ; " +
        "à sa date pour une facture mixte (biens et services) ; comptée <b>avant déduction</b> de la TVA de vos achats, donc un maximum.</li>" : "") +
      "<li>Point mort : charges mensuelles (trimestrielles ÷ 3, annuelles ÷ 12) divisées par la part qui vous reste après cotisations ; autonomie : disponible divisé par ces charges.</li>" +
      "<li>Délai de paiement : factures payées en entier dans les 12 derniers mois, de la date de la facture au dernier paiement ; un paiement en avance compte 0 jour de retard.</li>" +
      "<li>L'impôt sur le revenu (hors versement libératoire) n'est pas compté : voyez <a href=\"/fr/combien-mettre-de-cote-auto-entrepreneur/\">combien mettre de côté</a>.</li></ul></section>";

    view.innerHTML = '<div class="espace-head"><h2>Trésorerie</h2>' + tools + "</div>" + kpis +
      '<div class="espace-cols tr-charts">' + balanceCard + flowCard + "</div>" +
      '<div class="espace-cols">' + agingCard + '<div class="tr-stack">' + upcomingCard + owedCard + "</div></div>" +
      monthsCard + '<div class="espace-cols">' + chargesCard + settingsCard + "</div>" + assumptions;

    drawCharts = function () {
      var box = function (name) { return view.querySelector('[data-chart="' + name + '"]'); };
      var width = function (el) { return Math.floor(el.getBoundingClientRect().width) || 600; };
      var el = box("balance");
      if (el && curve) {
        el.innerHTML = OF.charts.balance({ width: width(el), from: TODAY, to: f.until, threshold: limit, low: curve.low,
          series: [{ name: "main", points: curve.points, cls: "is-main" }, { name: "alt", points: altCurve ? altCurve.points : [], cls: "is-alt" }],
          title: "Solde prévu jusqu'à fin " + E.period(f.until.slice(0, 7)).label,
          desc: "Point bas " + money(curve.low.balance) + " le " + day(curve.low.date) + " ; solde final " + money(curve.end) + "." });
      }
      el = box("flows");
      if (el) {
        el.innerHTML = OF.charts.bars({ width: width(el), groups: groups, series: [{ name: "Entrées", cls: "is-in" }, { name: "Sorties", cls: "is-out" }],
          title: "Entrées et sorties par mois", desc: "Six derniers mois réels puis " + months + " mois prévus." });
      }
      el = box("aging");
      if (el) {
        el.innerHTML = OF.charts.stack({ width: width(el), parts: ag.buckets.map(function (b) { return { label: b.label, value: b.amount, cls: AGING_CLS[b.key] }; }),
          title: "Créances par ancienneté", desc: ag.buckets.map(function (b) { return b.label + " : " + money(b.amount); }).join(" ; ") + "." });
      }
    };
    drawCharts();

    $("tr-csv").addEventListener("click", function () {
      OF.download("﻿" + E.forecastCSV(f), "prevision-tresorerie-" + TODAY + ".csv", "text/csv;charset=utf-8");
    });
    var cash = $("cash-form");
    cash.addEventListener("submit", function (e) {
      e.preventDefault();
      var f2 = cash.elements, raw = f2.cashBalance.value.trim(), bal = raw ? OF.num(raw) : null, date = f2.cashDate.value;
      var vatRaw = f2.vatLastYear ? f2.vatLastYear.value.trim() : "", vatLast = vatRaw ? OF.num(vatRaw) : null;
      var thRaw = f2.cashThreshold.value.trim(), th = thRaw ? OF.num(thRaw) : null;
      var error = raw && !isFinite(bal) ? ["cashBalance", "Le solde doit être un montant en euros (il peut être négatif)."]
        : !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > TODAY ? ["cashDate", "Indiquez la date du solde : aujourd'hui ou avant."]
        : thRaw && !(isFinite(th) && th >= 0) ? ["cashThreshold", "Le seuil de sécurité doit être un montant positif, en euros."]
        : vatRaw && !(isFinite(vatLast) && vatLast >= 0) ? ["vatLastYear", "La TVA de l'année précédente doit être un montant positif."] : null;
      ["cashBalance", "cashDate", "cashThreshold", "vatLastYear"].forEach(function (k) { if (f2[k]) f2[k].setAttribute("aria-invalid", String(!!error && error[0] === k)); });
      showError("cash-error", error ? error[1] : "");
      if (error) { f2[error[0]].focus(); return; }
      var pr = data.profile;
      pr.cashBalance = bal === null ? null : Math.round(bal * 100) / 100;
      pr.cashDate = date;
      pr.cashThreshold = th === null ? null : Math.round(th * 100) / 100;
      if (f2.vatLastYear) pr.vatLastYear = vatLast === null ? null : Math.round(vatLast * 100) / 100;
      pr.updatedAt = now();
      persist("Réglages de la trésorerie enregistrés.").then(function () { render(true); });
    });
    var form = $("charge-form");
    bindChargeForm(form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = readCharge(form);
      if (!showChargeErrors(form, c, "charge-error")) return;
      c.amount = Math.round(c.amount * 100) / 100;
      Object.assign(c, { id: S.uid(), createdAt: now(), updatedAt: now() });
      data.charges.push(c);
      persist((c.flow === "in" ? "Entrée prévue ajoutée : " : "Mouvement ajouté : ") + c.label + ".").then(function () { render(true); $("ep-label").focus(); });
    });
  }
  // Graphiques redessinés à la largeur de leur conteneur quand la fenêtre change de taille.
  var resizeTimer = null, lastWidth = window.innerWidth;
  window.addEventListener("resize", function () {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (drawCharts) drawCharts(); }, 150);
  });

  function viewChargeForm(r) {
    var c = charge(r.id);
    if (!c) { view.innerHTML = '<div class="espace-head"><h2>Mouvement introuvable</h2></div><p><a href="#/tresorerie">Retour à la trésorerie</a></p>'; return; }
    view.innerHTML = '<div class="espace-head"><h2>' + esc(c.label) + '</h2></div><form class="card espace-card" id="charge-form" novalidate><div class="fields">' + chargeFields(c) + "</div>" +
      '<p class="form-error" id="charge-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-primary">Enregistrer</button>' +
      '<a class="btn btn-ghost" href="#/tresorerie">Annuler</a><button type="button" class="btn btn-ghost" id="charge-delete">Supprimer</button></div></form>';
    var form = $("charge-form");
    bindChargeForm(form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var next = readCharge(form);
      if (!showChargeErrors(form, next, "charge-error")) return;
      next.amount = Math.round(next.amount * 100) / 100;
      Object.assign(c, next, { updatedAt: now() });
      persist("Mouvement enregistré.").then(function () { location.hash = "#/tresorerie"; });
    });
    $("charge-delete").addEventListener("click", function () {
      if (!confirm("Supprimer « " + c.label + " » ?")) return;
      data.charges = data.charges.filter(function (x) { return x.id !== c.id; });
      persist("Mouvement supprimé.").then(function () { location.hash = "#/tresorerie"; });
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
