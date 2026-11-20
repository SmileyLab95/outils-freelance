/*
 * Espace entrepreneur (France, version locale) : application d'une page.
 * Spécification : documentation/09-specification-espace.md. Calculs : moteurs déclarés par le module du pays de la
 * section (OFE.espaceUI.<pays>.engines : en France, OFE.espaceFR et OFE.invoiceFR ; documentation/60, § 3.3).
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
  // Textes de la langue de la section (tools/espace-texts-<langue>.js ; documentation/60, § 3, étape 1) : la langue
  // (« fr »), puis sa variante régionale (« fr-CA ») qui ne redéfinit que ce qui change.
  var TEXTS = window.OF_ESPACE_TEXTS || {};
  var TX = Object.assign({}, TEXTS[OF.locale.slice(0, 2)], TEXTS[OF.locale]);
  // Module d'écrans du pays de la section et ses moteurs (documentation/60, § 3.2 et § 3.3, D90 et D92).
  var MOD = OFE && OFE.espaceUI ? OFE.espaceUI[OF.section] : null;
  var ENG = MOD && MOD.engines ? MOD.engines(TX, OF) : null;
  if (!app || !ENG || !ENG.engine || !R || !S) return;
  var E = ENG.engine, INV = ENG.invoice, ST = OFE.espaceStats.create(E, INV);
  /** Texte (« libellé ») de la clé, avec les valeurs { nom: valeur } à la place des « {nom} ». Une clé absente est
   *  une erreur. Nommé L : plusieurs fonctions de ce fichier ont une variable locale t. */
  function L(key, vars) {
    var text = TX[key];
    if (text === undefined) { console.error("Espace : texte manquant « " + key + " »"); return key; }
    return vars ? text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : text;
  }
  var $ = function (id) { return document.getElementById(id); };
  var view = $("espace-view"), statusEl = $("espace-status");
  var calEl = $("calendar-data");
  var CAL = calEl ? JSON.parse(calEl.textContent).events : [];
  var forced = /[?&]today=(\d{4}-\d{2}-\d{2})/.exec(window.location.search);
  var TODAY = forced ? forced[1] : OF.today();
  var YEAR = TODAY.slice(0, 4);
  // Formats de la section pour les moteurs (rendu des documents, Factur-X, courriel), donnés par le module du pays.
  var FMT = ENG.fmt;
  /** Séparateur décimal de la section (« , » en français, « . » en anglais), pour préremplir les champs de saisie. */
  var DEC = OF.fmt(1.5).charAt(1);
  /** Symbole de la devise de la section (« € », « $ », « £ »), à côté des champs de montant. */
  var CUR = OF.money(0).replace(/[\d\s.,\u00a0\u202f-]/g, "");
  /** Pourcentage au format de la langue : « 12,5 % » en français. */
  var percent = function (n) { return L("fmt.percent", { n: OF.fmt(n) }); };
  var data = S.empty();
  var currentRoute = "";

  // ----- Libellés ----------------------------------------------------------------

  /** Profil en activité mixte (ventes et prestations suivies séparément). */
  function isMixed() { return !!E.mixedActivities(profile(), R); }
  var TYPES = { facture: L("type.facture"), devis: L("type.devis"), avoir: L("type.avoir") };
  var STATE_CLASSES = {
    draft: "st-draft", unpaid: "st-unpaid", overdue: "st-overdue", partial: "st-partial", paid: "st-paid", sent: "st-unpaid",
    accepted: "st-paid", refused: "st-draft", invoiced: "st-paid", issued: "st-unpaid", refunded: "st-paid", cancelled: "st-draft",
    imputed: "st-paid", refund: "st-overdue"
  };
  var STATES = {};
  Object.keys(STATE_CLASSES).forEach(function (k) { STATES[k] = [L("state." + k), STATE_CLASSES[k]]; });
  var NEW_TITLES = { facture: L("new.facture"), devis: L("new.devis"), avoir: L("new.avoir") };
  var TERMS = [[0, L("terms.receipt")]].concat([15, 30, 45, 60].map(function (n) { return [n, L("terms.days", { n: n })]; }));
  /** Délais proposés, avec le délai du document s'il n'est pas dans la liste (document repris du générateur). */
  function termsFor(value) {
    var n = parseInt(value, 10);
    if (!(n >= 0) || TERMS.some(function (t) { return t[0] === n; })) return TERMS;
    return TERMS.concat([[n, L("terms.days", { n: n })]]).sort(function (a, b) { return a[0] - b[0]; });
  }

  // ----- Outils ------------------------------------------------------------------

  function esc(text) {
    return String(text == null ? "" : text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  // Montants et dates au format de la section.
  var money = function (n) { return OF.money(n); };
  var day = function (iso) { return iso ? OF.date(iso) : "–"; };
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
      announce(L("store.failed"), true);
    });
  }
  var now = function () { return new Date().toISOString(); };
  function client(id) { return data.clients.filter(function (c) { return c.id === id; })[0] || null; }
  function doc(id) { return data.documents.filter(function (d) { return d.id === id; })[0] || null; }
  function profile() { return data.profile || {}; }
  function isMicro() { return !!(R.micro_activities && R.micro_activities[profile().activity]); }   // France seulement

  /** Émetteur et client affichés : figés à l'émission, sinon le profil et la fiche client actuels. */
  function parties(d) {
    if (d.snapshot) return d.snapshot;
    var p = profile(), c = client(d.clientId) || {};
    return { me: meFromProfile(p), client: clientForDoc(c) };
  }
  /** Coordonnées de l'émetteur et du client passées à l'aperçu et à l'émission, selon le pays (module de la section). */
  function meFromProfile(p) { return ENG.parties.me(p); }
  function clientForDoc(c) { return ENG.parties.client(c); }
  function docForRender(d) {
    var p = parties(d);
    return Object.assign({}, d, { me: p.me, client: p.client });
  }
  function stateBadge(d) {
    var st = STATES[E.state(d, TODAY, data.documents)] || STATES.draft;
    return '<span class="st ' + st[1] + '">' + esc(st[0]) + "</span>";
  }
  function docLabel(d) { return TYPES[d.type] + " " + (d.number || L("doc.draftMark")); }

  // ----- Routeur -------------------------------------------------------------------

  /**
   * Adresses dans la langue de la section (documentation/60, § 3.4, D96) : table du pays (UI.aliases, adresse du pays →
   * nom interne), appliquée au nom de l'écran et à l'identifiant. Sans table (France), rien ne change.
   */
  var aliasOut = null;
  function aliasesOf() {
    var into = (UI && UI.aliases) || {};
    if (!UI) return { into: into, out: {} };
    if (!aliasOut) { aliasOut = {}; Object.keys(into).forEach(function (k) { aliasOut[into[k]] = k; }); }
    return { into: into, out: aliasOut };
  }
  function route() {
    var h = (location.hash || "#/").slice(1);
    var q = h.indexOf("?");
    var path = q > -1 ? h.slice(0, q) : h;
    var params = {};
    if (q > -1) h.slice(q + 1).split("&").forEach(function (kv) { var p = kv.split("="); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); });
    var parts = path.split("/").filter(Boolean), A = aliasesOf();
    // Adresse interne (liens du code commun) réécrite dans la langue du pays, sans nouvelle entrée d'historique.
    var shown = parts.map(function (p, i) { return i < 2 && A.out[p] ? A.out[p] : p; });
    if (shown.join("/") !== parts.join("/")) {
      h = "/" + shown.join("/") + (q > -1 ? h.slice(q) : "");
      history.replaceState(null, "", "#" + h);
    }
    var inner = shown.map(function (p, i) { return i < 2 && A.into[p] ? A.into[p] : p; });
    return { name: inner[0] || "tableau", id: inner[1] || null, params: params, key: h };
  }

  function render(keepFocus) {
    drawCharts = null; // chaque vue qui a des graphiques fournit sa fonction de dessin (redessin au changement de taille)
    if (chronoTick) { clearInterval(chronoTick); chronoTick = null; }
    var r = route();
    var name = data.profile ? r.name : (r.name === "reglages" ? "reglages" : "accueil");
    app.querySelectorAll("[data-route]").forEach(function (a) {
      var tab = (UI.tabs && UI.tabs[name]) || name;   // écran rangé sous un onglet (France : immobilisations sous « Dépenses »)
      var active = a.getAttribute("data-route") === tab || (name === "accueil" && a.getAttribute("data-route") === "tableau");
      if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    app.classList.toggle("is-onboarding", !data.profile);
    // Navigation mobile (défilante) : garder l'onglet actif visible.
    var nav = app.querySelector(".espace-nav"), current = nav && nav.querySelector('[aria-current="page"]');
    if (current && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2;
    var views = { accueil: viewWelcome, tableau: viewDashboard, documents: r.id ? viewDocument : viewDocuments,
                  clients: r.id ? viewClientForm : viewClients,
                  temps: r.id === "facturer" ? viewTimeInvoice : r.id ? viewTimeForm : viewTime,
                  prospects: r.id ? viewProspectForm : viewProspects,
                  tresorerie: r.id ? viewChargeForm : viewTreasury,
                  echeances: viewDeadlines, reglages: viewSettings,
                  importer: viewImport };
    Object.keys(UI.routes || {}).forEach(function (k) { views[k] = UI.routes[k]; });
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
    var fromGenerator = UI.generator ? UI.generator.saved() : null;   // générateur public de la section (même navigateur)
    view.innerHTML =
      '<div class="espace-welcome"><h2>' + L("welcome.title") + "</h2>" +
      (pendingImport() ? '<p class="notice">' + L("welcome.importPending") + "</p>" : "") +
      "<p>" + L("welcome.introHtml") + "</p>" +
      "<p>" + L("welcome.start") + "</p></div>" +
      profileForm(fromGenerator ? UI.generator.profile(fromGenerator) : (UI.profile ? UI.profile.defaults() : {}), true) +
      '<div class="card espace-card espace-noprint"><h3>' + L("welcome.dataTitle") + "</h3>" +
      (fromGenerator ? "<p>" + L("welcome.fromGenerator") + "</p>" : "") +
      "<p>" + L("welcome.restore") + "</p>" + importControl() + "</div>";
    bindProfileForm(true);
    bindImport();
  }

  // ----- Document venu du générateur public (#/importer) ---------------------------------------------

  // Dépôt du générateur public de la section : « espace-import » en France (inchangé), « espace-import:<section> »
  // ailleurs ; l'Espace d'une section ignore le dépôt d'une autre (documentation/60, § 3.3, D92).
  var IMPORT_KEY = "espace-import" + (OF.section === "fr" ? "" : ":" + OF.section), IMPORT_TTL = 24 * 3600 * 1000;
  /** Document déposé par le bouton « Continuer dans mon Espace » du générateur (même navigateur, moins de 24 h). */
  function pendingImport() {
    if (!E.fromGenerator) return null;   // pays sans reprise du générateur (États-Unis, version 1)
    var p = OF.load(IMPORT_KEY, null);
    var age = p && Date.now() - Date.parse(p.savedAt);
    if (!p || !p.doc || typeof p.doc !== "object" || !(age >= 0 && age < IMPORT_TTL)) {
      if (p) OF.save(IMPORT_KEY, null);
      return null;
    }
    return p.doc;
  }

  function viewImport() {
    var g = pendingImport();
    if (!g) {
      view.innerHTML = '<div class="espace-head"><h2>' + L("import.noneTitle") + "</h2></div>" +
        '<div class="card espace-card"><p>' + L("import.noneHtml") + "</p>" +
        '<p class="small"><a href="#/">' + L("common.backToDashboard") + "</a></p></div>";
      return;
    }
    var res = E.fromGenerator(g, profile(), data.clients, data.documents, { doc: S.uid(), client: S.uid() }, TODAY, now());
    var d = res.doc, cont = res.continuation;
    var label = d.type === "devis" ? L("import.thisQuote") : L("import.thisInvoice");
    var patch = Object.keys(res.profilePatch);
    var p = profile();
    var preview = Object.assign({}, d, { me: meFromProfile(Object.assign({}, p, res.profilePatch)), client: clientForDoc(res.client || {}) });
    view.innerHTML = '<div class="espace-head"><h2>' + L("import.title") + "</h2></div>" +
      '<div class="tool-layout wide-left espace-editor"><div class="espace-side espace-noprint"><section class="card espace-card">' +
      '<ul class="result-list">' +
      "<li><span>" + L("import.document") + "</span><b>" + L("doc.draftTitle", { type: TYPES[d.type] }) + "</b></li>" +
      "<li><span>" + L("import.client") + "</span><b>" + (res.client ? esc(res.client.name) + ' <span class="small muted">(' + (res.newClient ? L("import.newRecord") : L("import.existingRecord")) + ")</span>" : L("import.toChoose")) + "</b></li>" +
      "<li><span>" + L("import.lines") + "</span><b>" + d.lines.filter(function (l) { return String(l.desc).trim(); }).length + "</b></li>" +
      "<li><span>" + L("import.total") + "</span><b>" + esc(money(E.total(d))) + "</b></li></ul>" +
      '<p class="notice">' + L("import.noticeHtml") + "</p>" +
      (cont ? '<label class="check"><input type="checkbox" id="imp-continue" checked><span>' + L("import.continueHtml", { label: label,
        number: esc(cont.number), next: d.type === "devis" ? L("import.nextQuote") : L("import.nextInvoice"),
        after: esc(cont.prefix + cont.year + "-" + String(cont.last + 2).padStart(3, "0")) }) + "</span></label>" : "") +
      (patch.length ? '<p class="small muted">' + L("import.patch", { fields: esc(patch.map(function (k) { return (UI.generator && UI.generator.patchLabels[k]) || k; }).join(", ")) }) + "</p>" : "") +
      (res.paid ? '<p class="small muted">' + L("import.paid", { amount: esc(money(res.paid)) }) + "</p>" : "") +
      (UI.generator ? UI.generator.notes(res) : "") +
      '<div class="espace-actions"><button type="button" class="btn btn-primary" id="imp-ok">' + L("import.create") + "</button>" +
      '<button type="button" class="btn btn-ghost" id="imp-cancel">' + L("import.cancel") + "</button></div></section></div>" +
      '<div class="results"><div class="paper-wrap"><article class="paper" aria-label="' + L("doc.preview") + '">' + INV.render(preview, R, FMT) + "</article></div></div></div>";

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
      persist(L("import.created")).then(function () { location.hash = "#/documents/" + d.id; });
    });
    $("imp-cancel").addEventListener("click", function () {
      OF.save(IMPORT_KEY, null);
      announce(L("import.cancelled"));
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

  var NUM_TYPES = ["facture", "devis", "avoir"].map(function (type) {
    return { type: type, plural: L("num.plural." + type), last: L("num.last." + type) };
  });
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
    return '<div class="full fields"><h4 class="full">' + L("num.title") + "</h4>" +
      '<p class="full small muted">' + L("num.intro", { year: YEAR }) + "</p>" +
      NUM_TYPES.map(function (t) {
        var started = startedPrefix(t.type);
        return field("prefix_" + t.type, L("num.prefix", { plural: t.plural }), prefixOf(p, t.type), { half: true, placeholder: L("num.none"),
            hint: started != null && started !== prefixOf(p, t.type)
              ? L("num.keptPrefix", { year: YEAR, prefix: esc(started || L("num.noneLower")) }) : "" }) +
          field("last_" + t.type, L("num.lastUsed", { last: t.last, year: YEAR }), lastUsed(p, t.type), { half: true, inputmode: "numeric", disabled: started != null,
            placeholder: L("num.lastPlaceholder"), hint: (started != null ? L("num.started", { year: YEAR }) + " " : "") +
              L("num.next") + ' <b id="next-' + t.type + '">' + esc(E.nextNumber(data.documents, t.type, YEAR, p.prefixes, p.numbering)) + "</b>" });
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
      if (!PREFIX_RE.test(pre)) error = error || L("num.errPrefix", { plural: t.plural });
      prefixes[k] = pre;
      if (startedPrefix(k) != null) return; // suite fixée par les documents émis
      var last = parseLast(form.elements["last_" + k].value);
      if (last === false) error = error || L("num.errLast", { last: t.last, example: pre + YEAR + "-007" });
      else if (last === null) { if (numbering[k] && String(numbering[k].year) === YEAR) delete numbering[k]; }
      else numbering[k] = { year: YEAR, last: last };
    });
    if (!error && (prefixes.facture === prefixes.devis || prefixes.facture === prefixes.avoir || prefixes.devis === prefixes.avoir)) {
      error = L("num.errSame");
    }
    return error ? { error: error } : { prefixes: prefixes, numbering: numbering };
  }

  /**
   * Formulaire du profil : nom et numérotation communs ; les autres champs (activité, taxes, coordonnées, délai de
   * paiement) viennent du module du pays (crochet profile, documentation/60, § 3.2).
   */
  function profileForm(p, first) {
    return '<form class="card espace-card" id="profile-form" novalidate>' +
      "<h3>" + L("profile.title") + "</h3><div class=\"fields\">" +
      field("name", L("profile.name"), p.name, { placeholder: L("profile.namePlaceholder"), required: true, hint: L("profile.nameHint") }) +
      (UI.profile ? UI.profile.fields(p, first) : "") +
      (first ? "" : numberingFields(p)) +
      "</div>" +
      '<p class="form-error" id="profile-error" role="alert" hidden></p>' +
      '<div class="espace-actions"><button type="submit" class="btn btn-primary">' + (first ? L("profile.create") : L("common.save")) + "</button></div></form>";
  }

  function bindProfileForm(first) {
    var form = $("profile-form");
    if (UI.profile) UI.profile.bind(form);
    if (!first) bindNumbering(form, data.profile || {});
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements, p = Object.assign({}, data.profile || {}, first && UI.generator ? UI.generator.extras() : {});
      p.name = f.name.value.trim();
      if (!p.name) { showError("profile-error", L("profile.errName")); f.name.focus(); return; }
      var problem = UI.profile ? UI.profile.read(form, p, first) : null;
      if (problem) { showError("profile-error", problem.message); if (problem.field) f[problem.field].focus(); return; }
      if (!first) {
        var numbering = readNumbering(form, p);
        if (numbering.error) { showError("profile-error", numbering.error); return; }
        p.prefixes = numbering.prefixes;
        p.numbering = numbering.numbering;
      }
      showError("profile-error", "");
      data.profile = p;
      persist(first ? L("profile.ready") : L("profile.saved")).then(function () {
        if (first) { S.persist(); location.hash = pendingImport() ? "#/importer" : "#/"; render(); }
        else render(true);
      });
    });
  }
  function showError(id, msg) { var el = $(id); el.textContent = msg; el.hidden = !msg; }

  // ----- Tableau de bord -------------------------------------------------------------

  function viewDashboard() {
    var p = profile();
    var invoices = data.documents.filter(function (d) { return d.type === "facture" && d.status !== "draft"; });
    var open = invoices.filter(function (d) { return ["unpaid", "overdue", "partial"].indexOf(E.state(d, TODAY, data.documents)) > -1; });
    var late = open.filter(function (d) { return E.state(d, TODAY, data.documents) === "overdue"; });
    var openSum = open.reduce(function (s, d) { return s + E.balance(d, data.documents); }, 0);
    var quotes = data.documents.filter(function (d) { return d.type === "devis" && d.status === "sent"; });
    // Encaissé de l'exercice : année civile, ou année fiscale du pays (Royaume-Uni : 6 avril–5 avril).
    var fy = ST.fiscalYear(TODAY), year = E.cashed(data.documents, fy.start, fy.end);
    // Parties du pays (module d'écrans, documentation/60, § 3.2) : rappels, 4e indicateur, jauges, note.
    var dash = UI.dashboard ? UI.dashboard() : {};

    var html = '<div class="espace-head"><h2>' + esc(p.name || L("dash.title")) + "</h2>" +
      '<div class="espace-quick espace-noprint"><a class="btn btn-primary btn-sm" href="#/documents/nouveau?type=facture">' + L("quick.invoice") + "</a>" +
      '<a class="btn btn-ghost btn-sm" href="#/documents/nouveau?type=devis">' + L("quick.quote") + "</a>" +
      '<a class="btn btn-ghost btn-sm" href="#/clients/nouveau">' + L("quick.client") + "</a></div></div>";
    html += profileReminder() + (dash.reminders || "") + chronoReminder() + timeReminder() + prospectsReminder() + treasuryReminder() + backupReminder();
    // Indicateurs et graphiques (documentation/55-indicateurs-espace.md, § 2) : comparaison avec l'an dernier à la même date.
    var td = ST.toDate(data.documents, TODAY), prevYear = ST.fiscalYear(ST.lastYear(TODAY)).label;
    var versus = function (x, what) {
      return x.change === null ? (x.prev ? "" : L("dash.nothingThen", { what: what })) : L("dash.change", { sign: x.change >= 0 ? "+" : "−", pct: OF.fmt(Math.abs(x.change)), what: what });
    };
    html += '<div class="kpis kpis-4">' +
      kpi(L("dash.cashedYear", { year: fy.label }), money(year), [countText(E.ledger(data.documents, fy.start, fy.end).filter(function (x) { return x.amount > 0; }).length,
        L("count.receipt.one"), L("count.receipt.many")), versus(td.year, L("dash.sameDateYear", { year: prevYear }))].filter(Boolean).join(" · ")) +
      kpi(L("dash.cashedMonth"), money(td.month.now), versus(td.month, L("dash.lastYearSameDate")) || L("dash.lastYearSameDateAmount", { amount: money(td.month.prev) })) +
      kpi(L("dash.toCollect"), money(openSum), open.length ? countText(open.length, L("count.invoice.one"), L("count.invoice.many")) + (late.length ? L("dash.ofWhichLate", { n: late.length }) : "") : L("dash.noOpenInvoice"), late.length ? "is-warn" : "") +
      (dash.kpi || kpi(L("dash.pendingQuotes"), String(quotes.length), quotes.length ? L("dash.quotesTotal", { amount: money(quotes.reduce(function (s, d) { return s + E.total(d); }, 0)) }) : L("dash.noPendingQuote"))) +
      "</div>";

    html += dash.afterKpis || "";
    var series = ST.monthly(data.documents, TODAY, 12), top = ST.topClients(data.documents, ST.since12(TODAY), TODAY, 5);
    html += '<div class="espace-cols tr-charts"><section class="card espace-card"><div class="card-head"><h3>' + L("dash.monthlyTitle") + "</h3>" +
      '<span class="small muted">' + L("dash.monthlyIntro") + '</span></div><div class="chart" data-chart="monthly"></div>' +
      OF.charts.legend([{ cls: "is-cur", label: L("chart.last12") }, { cls: "is-prev", label: L("chart.yearEarlier") }]) +
      OF.charts.table(L("dash.monthlyTitle"), [L("chart.month"), L("chart.cashed"), L("chart.yearEarlier")], series.map(function (m) {
        return [m.label + (m.current ? L("chart.current") : ""), money(m.amount), money(m.prev)];
      })) + "</section>" + topClientsCard(top) + "</div>";
    html += '<div class="espace-cols">' + treasuryCard() + '<section class="card espace-card"><h3>' + L("dash.nextDeadlines") + "</h3>" + deadlinesList(4) +
      '<p class="small"><a href="#/echeances">' + L("dash.allDeadlines") + "</a></p></section></div>" +
      '<section class="card espace-card"><h3>' + L("dash.recentDocs") + "</h3>" + docTable(recentDocs(5), true) +
      '<p class="small"><a href="#/documents">' + L("dash.allDocs") + "</a></p></section>";
    html += dash.note || "";
    view.innerHTML = html;
    drawCharts = function () {
      var el = view.querySelector('[data-chart="monthly"]');
      if (!el) return;
      el.innerHTML = OF.charts.bars({ width: Math.floor(el.getBoundingClientRect().width) || 600,
        groups: series.map(function (m) { return { key: m.key, label: m.label, values: [m.amount, m.prev], future: false }; }),
        series: [{ name: L("chart.last12"), cls: "is-cur" }, { name: L("chart.yearEarlier"), cls: "is-prev" }],
        title: L("dash.monthlyTitle"), desc: L("dash.monthlyDesc", { now: money(series.reduce(function (s, m) { return s + m.amount; }, 0)),
          prev: money(series.reduce(function (s, m) { return s + m.prev; }, 0)) }) });
    };
    drawCharts();
  }

  /** Principaux clients sur 12 mois (encaissements nets) : barres, part et reste ; constat de dépendance au premier client. */
  function topClientsCard(top, onClientsPage) {
    var pct = function (x) { return percent(Math.round(x * 100)); };
    var max = top.rows.length ? top.rows[0].amount : 0;
    var row = function (name, href, amount, share) {
      return '<li><span class="bl-name">' + (href ? '<a href="' + href + '">' + esc(name) + "</a>" : esc(name)) + '</span><span class="bl-bar" aria-hidden="true"><span style="width:' +
        (max > 0 ? Math.max(1, amount / max * 100).toFixed(1) : 0) + '%"></span></span><b class="bl-amount">' + esc(money(amount)) + '</b><span class="bl-share">' + pct(share) + "</span></li>";
    };
    return '<section class="card espace-card"><div class="card-head"><h3>' + L("top.title") + '</h3><span class="small muted">' + L("top.total", { amount: esc(money(top.total)) }) +
      "</span></div>" + (top.rows.length ? '<ul class="bar-list">' + top.rows.map(function (r) {
        return row(r.name, r.clientId !== "?" && client(r.clientId) ? "#/clients/" + encodeURIComponent(r.clientId) : "", r.amount, r.share);
      }).join("") + (top.others.count ? row(L("top.others", { n: top.others.count }), "", top.others.amount, top.others.share) : "") + "</ul>" +
      (top.rows[0].share >= 0.5 ? '<p class="small muted">' + L("top.dependence", { pct: pct(top.rows[0].share) }) + "</p>" : "") :
      '<p class="small muted">' + L("top.none") + "</p>") + (onClientsPage ? "" : '<p class="small"><a href="#/clients">' + L("top.all") + "</a></p>") + "</section>";
  }

  /** Résumé de la trésorerie : disponible, point bas sur 6 mois, versement possible (documentation/39, § 7). */
  function treasuryCard() {
    if (!hasCash()) {
      return '<section class="card espace-card"><h3>' + L("cash.title") + '</h3><p class="small muted">' + L("cash.empty") +
        '</p><p class="small"><a href="#/tresorerie">' + L("cash.open") + "</a></p></section>";
    }
    var o = E.owed(treasuryInput()), f = E.forecast(treasuryInput()), c = E.balanceCurve(f), limit = threshold();
    var line = function (label, value, cls) { return "<li><span>" + esc(label) + '</span><b class="' + (cls || "") + '">' + esc(value) + "</b></li>"; };
    return '<section class="card espace-card"><h3>' + L("cash.title") + '</h3><ul class="tr-summary">' +
      line(L("cash.available"), money(f.start - o.total), f.start - o.total < 0 ? "is-bad" : "") +
      line(L("cash.low6"), money(c.low.balance) + (c.low.date === TODAY ? "" : L("cash.onDate", { date: day(c.low.date) })), c.low.balance < limit ? "is-bad" : "") +
      line(L("cash.safe"), money(E.safeAmount(c, limit))) + "</ul>" +
      '<p class="small"><a href="#/tresorerie">' + L("cash.see") + "</a></p></section>";
  }

  function kpi(label, value, sub, cls) {
    return '<div class="kpi card ' + (cls || "") + '"><span class="kpi-label">' + esc(label) + '</span><b class="kpi-value">' + esc(value) +
      '</b><span class="kpi-sub">' + esc(sub) + "</span></div>";
  }
  // Nombre et nom au singulier ou au pluriel selon la langue de la section (français : 0 et 1 au singulier ; anglais :
  // 1 seulement).
  var plural = typeof Intl !== "undefined" && Intl.PluralRules ? new Intl.PluralRules(OF.locale) : null;
  function countText(n, one, many) { return n + " " + ((plural ? plural.select(n) === "one" : n <= 1) ? one : many); }

  /** Mentions obligatoires de l'émetteur manquantes dans le profil. */
  function profileReminder() {
    var missing = UI.profile ? UI.profile.missing(profile()) : [];
    if (!missing.length) return "";
    return '<p class="notice warn espace-noprint">' + L("remind.profileHtml", { missing: missing.join(", ") }) + "</p>";
  }

  /** Chronomètre en marche, en pause ou arrêté avec une durée à saisir (documentation/37-temps-passe.md, § 8). */
  function chronoReminder() {
    var x = chronoLoad();
    if (!x) return "";
    var label = E.durationLabel(E.timerDuration(x, Date.now(), todayNow()).minutes / 60, "hour");
    return '<p class="notice espace-noprint">' + (x.stopped ? L("remind.chronoStoppedHtml", { label: esc(label) }) :
      (x.start === null ? L("remind.chronoPausedHtml", { label: esc(label) }) : L("remind.chronoRunningHtml", { label: esc(label) }))) + " " +
      '<a href="#/temps">' + (x.stopped ? L("remind.chronoEnter") : L("remind.chronoSee")) + "</a></p>";
  }

  /** Temps à facturer (documentation/37-temps-passe.md) : montant et nombre de clients. */
  function timeReminder() {
    var due = E.unbilledByClient(data.timeEntries, data.documents);
    if (!due.length) return "";
    var sum = due.reduce(function (s, c) { return s + c.amount; }, 0), missing = due.some(function (c) { return c.missingRate; });
    return '<p class="notice espace-noprint">' + L("remind.timeHtml", { what: sum > 0 ? "<b>" + esc(money(sum)) + "</b>" + (missing ? L("remind.timeAndNoRate") : "") : L("remind.timeNoRate"),
      clients: countText(due.length, L("count.client.one"), L("count.client.many")) }) + ' <a href="#/temps">' + L("remind.timeBill") + "</a></p>";
  }

  function backupReminder() {
    var issued = data.documents.some(function (d) { return d.status !== "draft"; });
    var last = data.settings.lastExport;
    var old = !last || (Date.parse(TODAY) - Date.parse(last.slice(0, 10))) / 864e5 > 30;
    if (!issued || !old) return "";
    return '<p class="notice warn espace-noprint">' + L("remind.backup") + " " +
      (last ? L("remind.backupLast", { date: day(last.slice(0, 10)) }) : L("remind.backupNever")) + " " +
      '<a href="#/reglages">' + L("remind.backupExport") + "</a></p>";
  }

  // ----- Échéances ---------------------------------------------------------------------

  /** Échéances à venir du calendrier de la section, retenues selon le profil (conditions « when » et crochet du pays). */
  function matchingEvents() {
    var values = UI.deadlines ? UI.deadlines.values() : {};
    return CAL.filter(function (e) {
      if (e.date < TODAY) return false;
      if (UI.deadlines && UI.deadlines.hidden && UI.deadlines.hidden(e)) return false;
      var w = e.when || {};
      return Object.keys(w).every(function (k) { return values[k] === undefined || w[k].indexOf(values[k]) > -1; });
    });
  }
  function inDays(n) { return n === 0 ? L("days.today") : n === 1 ? L("days.tomorrow") : L("days.in", { n: n }); }
  function deadlinesList(limit) {
    var list = matchingEvents().slice(0, limit || 999);
    if (!list.length) return '<p class="muted">' + L("dl.none") + "</p>";
    return '<ul class="espace-deadlines">' + list.map(function (e) {
      var n = OF.daysBetween(TODAY, e.date);
      return '<li><span class="dl-date">' + esc(OF.date(e.date, { day: "numeric", month: "short" })) + '</span><span class="dl-body"><b>' +
        esc(e.title) + '</b><span class="small muted">' + inDays(n) +
        (e.est ? L("dl.estimatedDate") : "") + "</span></span></li>";
    }).join("") + "</ul>";
  }
  // Catégorie d'une échéance pour la frise et la liste : forme et couleur (documentation/55, § 5.5), selon le pays.
  var deadlineCategory = function (e) { return (UI.deadlines && UI.deadlines.classes[e.tag]) || ["is-dl-info", L("dl.tag.info")]; };
  var deadlineClass = function (e) { return deadlineCategory(e)[0]; };

  function viewDeadlines() {
    // 90 jours tiennent toujours dans 5 mois commencés : la trésorerie fournit les montants estimés aux mêmes dates.
    var f = E.forecast(treasuryInput({ months: 5 })), dl = ST.deadlines(matchingEvents(), f.items, TODAY, 90, UI.deadlines && UI.deadlines.kinds);
    // Parties du pays : 3e et 4e indicateurs, montant estimé total, introduction de la liste, lien vers le calendrier.
    var country = UI.deadlines ? UI.deadlines.summary(dl) : { kpis: "", priced: 0, intro: "", link: "" };
    var amountText = function (e) { return e.amount === null ? "" : money(e.amount); };
    var tags = {};
    dl.soon.forEach(function (e) { var c = deadlineCategory(e); tags[c[0]] = c[1]; });
    view.innerHTML = '<div class="espace-head"><h2>' + L("dl.title") + "</h2></div>" +
      '<div class="kpis kpis-4">' +
      kpi(L("dl.next"), dl.next ? inDays(dl.next.days) : "–", dl.next ? dl.next.title + " · " + day(dl.next.date) + (dl.next.est ? L("dl.estimated") : "") : L("dl.noneLower")) +
      kpi(L("dl.within90"), String(dl.soon.length), L("dl.until", { date: day(dl.end) })) +
      country.kpis + "</div>" +
      '<p class="small muted">' + L("dl.estimatesHtml") + "</p>" +
      '<section class="card espace-card espace-noprint"><div class="card-head"><h3>' + L("dl.next90") + '</h3><span class="small muted">' + L("dl.chartHelp") + "</span></div>" +
      (dl.soon.length ? '<div class="chart" data-chart="deadlines"></div>' +
        OF.charts.legend(Object.keys(tags).map(function (k) { return { cls: k, label: tags[k] }; })) +
        OF.charts.table(L("dl.next90Title"), [L("dl.colDate"), L("dl.colDeadline"), L("dl.colAmount")], dl.soon.map(function (e) { return [day(e.date), e.title, amountText(e) || "–"]; }))
        : '<p class="muted">' + L("dl.none90") + "</p>") + "</section>" +
      '<section class="card espace-card"><h3>' + L("dl.all") + "</h3>" + (country.intro ? '<p class="muted">' + country.intro + "</p>" : "") +
      (dl.events.length ? '<ul class="espace-deadlines">' + dl.events.slice(0, 40).map(function (e) {
        return '<li><span class="dl-date">' + esc(OF.date(e.date, { day: "numeric", month: "short" })) + '</span><span class="dl-body"><b>' + esc(e.title) +
          '</b><span class="small muted">' + inDays(e.days) + (e.est ? L("dl.estimatedDate") : "") + "</span></span>" +
          (e.amount !== null ? '<span class="dl-amount"><b>' + esc(money(e.amount)) + '</b><span class="small muted">' + L("dl.estimatedShort") + "</span></span>" : "") + "</li>";
      }).join("") + "</ul>" : '<p class="muted">' + L("dl.none") + "</p>") +
      (country.link ? '<p class="small">' + country.link + "</p>" : "") + "</section>";
    drawCharts = function () {
      var el = view.querySelector('[data-chart="deadlines"]');
      if (!el) return;
      var plain = dl.soon.filter(function (e) { return e.amount === null; }).length, priced = dl.soon.length - plain;
      el.innerHTML = OF.charts.timeline({ width: Math.floor(el.getBoundingClientRect().width) || 600, from: TODAY, to: dl.end,
        events: dl.soon.map(function (e) { return { date: e.date, amount: e.amount, cls: deadlineClass(e) }; }), title: L("dl.next90Title"),
        desc: L("dl.chartDesc", { count: countText(dl.soon.length, L("count.deadline.one"), L("count.deadline.many")), date: day(dl.end),
          priced: priced ? L("dl.chartPriced", { n: priced, amount: money(country.priced) }) : "" }) });
    };
    drawCharts();
  }

  // ----- Liste des documents ---------------------------------------------------------------

  function recentDocs(n) {
    return data.documents.slice().sort(function (a, b) { return (b.updatedAt || "") < (a.updatedAt || "") ? -1 : 1; }).slice(0, n);
  }
  function docTable(list, compact) {
    if (!list.length) return '<p class="muted">' + L("docs.emptyHtml") + "</p>";
    return '<ul class="doc-list">' + list.map(function (d) {
      var c = parties(d).client || {};
      return '<li><a href="#/documents/' + esc(d.id) + '"><span class="dl-main"><b>' + esc(docLabel(d)) + "</b>" +
        '<span class="small muted">' + esc(c.name || L("docs.noClient")) + " · " + day(d.date) + "</span></span>" +
        '<span class="dl-side"><b>' + esc(money(d.type === "avoir" ? -E.total(d) : E.total(d))) + "</b>" + stateBadge(d) + "</span></a></li>";
    }).join("") + "</ul>";
  }

  var FILTERS = ["tous", "facture", "devis", "avoir", "draft", "open"].map(function (k) { return [k, L("filter." + k)]; });
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
    view.innerHTML = '<div class="espace-head"><h2>' + L("docs.title") + '</h2><div class="espace-quick espace-noprint">' +
      '<a class="btn btn-primary btn-sm" href="#/documents/nouveau?type=facture">' + L("quick.invoice") + "</a>" +
      '<a class="btn btn-ghost btn-sm" href="#/documents/nouveau?type=devis">' + L("quick.quote") + "</a></div></div>" + documentsOverview(r, url) +
      '<div class="card espace-card"><div class="espace-filters" role="group" aria-label="' + L("docs.filterLabel") + '">' +
      FILTERS.map(function (f) { return '<a class="tab" href="' + url({ filtre: f[0] }) + '"' + (f[0] === filter ? ' aria-current="true"' : "") + ">" + esc(f[1]) + "</a>"; }).join("") +
      '</div><div class="field"><label for="doc-search">' + L("docs.search") + '</label><input id="doc-search" type="search" value="' + esc(r.params.q || "") +
      '" placeholder="' + L("docs.searchPlaceholder") + '"></div>' + docTable(list) + "</div>";
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
    return Object.assign({ id: S.uid(), type: TYPES[type] ? type : "facture", status: "draft", date: TODAY, serviceDate: TODAY,
             terms: p.terms == null ? 30 : p.terms, validity: 30, depositPct: type === "devis" ? 30 : 0,
             clientId: c ? c.id : "", lines: [{ desc: "", qty: 1, price: NaN }],
             penalty: p.penalty || "", notes: "", payments: [], createdAt: now(), updatedAt: now() },
             UI.doc ? UI.doc.draft(c) : {});   // champs du pays : nature et TVA en France
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
      if (!d) { view.innerHTML = '<div class="espace-head"><h2>' + L("doc.notFound") + '</h2></div><p><a href="#/documents">' + L("doc.backToDocs") + "</a></p>"; return; }
    }
    if (d.status === "draft") renderDraft(d); else renderIssued(d);
  }

  var LINE_UNITS = [["", L("line.unit.none")], ["hour", L("line.unit.hour")], ["day", L("line.unit.day")]];
  function linesHTML(d) {
    return d.lines.map(function (l, i) {
      // Colonne propre au pays avant la désignation (France : biens ou services d'une facture mixte).
      var kind = UI.doc ? UI.doc.kindCell(d, l, i) : "";
      return '<div class="line-row has-unit' + (kind ? " has-kind" : "") + '" data-line="' + i + '">' + kind +
        '<div class="field line-desc"><label for="ln-desc-' + i + '">' + L("line.desc") + '</label><input type="text" id="ln-desc-' + i + '" data-k="desc" value="' + esc(l.desc) + '"></div>' +
        '<div class="field line-qty"><label for="ln-qty-' + i + '">' + L("line.qty") + '</label><input type="text" id="ln-qty-' + i + '" data-k="qty" inputmode="decimal" value="' + (isFinite(INV.amount(l.qty)) ? esc(OF.fmt(l.qty)) : "") + '"></div>' +
        '<div class="field line-unit"><label for="ln-unit-' + i + '">' + L("line.unit") + '</label><select id="ln-unit-' + i + '" data-k="unit">' + options(LINE_UNITS, l.unit || "") + "</select></div>" +
        '<div class="field line-price"><label for="ln-price-' + i + '">' + L("line.price") + '</label><div class="input-suffix"><input type="text" id="ln-price-' + i + '" data-k="price" inputmode="decimal" value="' + (isFinite(INV.amount(l.price)) ? esc(String(l.price).replace(".", DEC)) : "") + '"><span>' + CUR + "</span></div></div>" +
        '<button type="button" class="line-remove" data-remove="' + i + '" aria-label="' + L("line.removeN", { n: i + 1 }) + '" title="' + L("line.remove") + '">✕</button></div>';
    }).join("");
  }

  function renderDraft(d) {
    var clients = data.clients.filter(function (c) { return !c.archived || c.id === d.clientId; });
    var html = '<div class="espace-head"><h2>' + esc(doc(d.id) ? L("doc.draftTitle", { type: TYPES[d.type] }) : NEW_TITLES[d.type]) +
      "</h2>" + stateBadge(d) + "</div>" + profileReminder() +
      (d.prospectId && prospect(d.prospectId) ? '<p class="small muted espace-noprint">' + L("draft.forLeadHtml", { href: "#/prospects/" + esc(d.prospectId),
        name: esc(prospect(d.prospectId).name) }) + "</p>" : "") +
      '<div class="tool-layout wide-left espace-editor"><form class="card form-card espace-noprint" id="doc-form" novalidate>' +
      '<div class="fields">' +
      '<div class="field full"><label for="d-client">' + L("draft.client") + '</label><select id="d-client" name="clientId"><option value="">' + L("draft.chooseClient") + "</option>" +
      options(clients.map(function (c) { return [c.id, c.name]; }), d.clientId) + "</select>" +
      '<span class="hint"><a href="#/clients/nouveau?retour=' + esc(d.id) + '">' + L("draft.newClient") + "</a></span></div>" +
      '<div class="field"><label for="d-date">' + L("draft.date") + '</label><input type="date" id="d-date" name="date" value="' + esc(d.date) + '"></div>' +
      (d.type === "facture" ? (UI.doc && UI.doc.serviceDate === false ? "" : '<div class="field"><label for="d-service">' + L("draft.serviceDate") +
        '</label><input type="date" id="d-service" name="serviceDate" value="' + esc(d.serviceDate || "") + '"></div>') +
        '<div class="field"><label for="d-terms">' + L("draft.terms") + '</label><select id="d-terms" name="terms">' + options(termsFor(d.terms), d.terms) + "</select></div>" : "") +
      (d.type === "devis" ? '<div class="field"><label for="d-validity">' + L("draft.validity") + '</label><input type="text" id="d-validity" name="validity" inputmode="numeric" value="' + esc(d.validity) + '"></div>' +
        '<div class="field"><label for="d-deposit">' + L("draft.deposit") + '</label><input type="text" id="d-deposit" name="depositPct" inputmode="decimal" value="' + esc(d.depositPct) + '"></div>' : "") +
      (UI.doc ? UI.doc.fields(d) : "") +
      "</div><h3>" + L("draft.lines") + "</h3><div id=\"d-lines\">" + linesHTML(d) + "</div>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="d-add-line">' + L("draft.addLine") + "</button>" +
      '<div class="fields" style="margin-top:14px;"><div class="field full"><label for="d-notes">' + L("draft.notes") + "</label>" +
      '<textarea id="d-notes" name="notes" rows="2">' + esc(d.notes) + "</textarea></div></div>" +
      '<p class="small muted" id="d-vat-note">' + (UI.doc ? UI.doc.note(d) : "") + "</p>" +
      '<p class="form-error" id="doc-error" role="alert" hidden></p>' +
      '<div class="espace-actions"><button type="button" class="btn btn-primary" id="d-issue">' + (d.type === "devis" ? L("draft.issueQuote") : d.type === "avoir" ? L("draft.issueCredit") : L("draft.issueInvoice")) + "</button>" +
      '<button type="button" class="btn btn-ghost" id="d-print">' + L("draft.preview") + "</button>" +
      '<button type="button" class="btn btn-ghost" id="d-delete">' + L("draft.delete") + "</button></div>" +
      '<p class="small muted">' + L("draft.autosave") + "</p>" +
      "</form>" + paper(d) + "</div>";
    view.innerHTML = html;
    bindDraft(d);
  }

  function paper(d) {
    return '<div class="results"><div class="paper-wrap"><article class="paper" id="d-preview" aria-label="' + L("doc.preview") + '">' +
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
      persist(navigating ? "" : L("draft.saved"));
    };
    var saveDraft = function () {
      clearTimeout(bindDraft.t);
      pendingSave = function () { commit(true); };
      bindDraft.t = setTimeout(function () { commit(false); }, 400);
    };
    form.addEventListener("input", function (e) {
      var t = e.target, handled;
      var row = t.closest("[data-line]");
      if (row) {
        var l = d.lines[+row.getAttribute("data-line")], k = t.getAttribute("data-k");
        if (k === "unit" || k === "kind") { if (t.value) l[k] = t.value; else delete l[k]; } else l[k] = k === "desc" ? t.value : OF.num(t.value);
      } else if (UI.doc && (handled = UI.doc.input(d, t))) { if (handled === "lines") $("d-lines").innerHTML = linesHTML(d); }
      else if (t.name === "depositPct" || t.name === "validity" || t.name === "terms") d[t.name] = Number(OF.num(t.value)) || 0;
      else if (t.name) d[t.name] = t.value;
      refresh();
      saveDraft();
    });
    form.addEventListener("change", function (e) {
      if (e.target.name === "clientId") {
        if (UI.doc) UI.doc.retax(d, client(d.clientId));
        $("d-vat-note").textContent = UI.doc ? UI.doc.note(d) : "";
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
      if (!confirm(L("draft.confirmDelete"))) return;
      clearTimeout(bindDraft.t);
      pendingSave = null;
      draftInMemory = null;
      if (!doc(d.id)) { location.hash = "#/documents"; return; }
      data.documents = data.documents.filter(function (x) { return x.id !== d.id; });
      if (d.quoteId && doc(d.quoteId) && doc(d.quoteId).invoiceId === d.id) delete doc(d.quoteId).invoiceId;
      persist(L("draft.deleted")).then(function () { location.hash = "#/documents"; });
    });
    $("d-issue").addEventListener("click", function () {
      var c = client(d.clientId);
      var res = E.issue(data.documents, d, meFromProfile(profile()), c ? clientForDoc(c) : null, profile().prefixes, now(), profile().numbering,
        UI.doc ? UI.doc.issueOptions() : {});
      if (res.errors.length) { showError("doc-error", res.errors.join(" ")); return; }
      if (!confirm(L("draft.confirmIssue", { what: d.type === "facture" ? L("draft.theInvoice") : d.type === "devis" ? L("draft.theQuote") : L("draft.theCredit"),
        number: res.doc.number }))) return;
      clearTimeout(bindDraft.t);
      pendingSave = null;
      var issued = res.doc;
      delete issued.routeKey;
      data.documents = data.documents.filter(function (x) { return x.id !== d.id; }).concat([issued]);
      if (issued.quoteId && doc(issued.quoteId)) doc(issued.quoteId).invoiceId = issued.id;
      draftInMemory = null;
      persist(d.type === "facture" ? L("draft.issuedF", { type: TYPES[d.type], number: issued.number }) : L("draft.issuedM", { type: TYPES[d.type], number: issued.number })).then(function () {
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
      "<li><span>" + L("issued.client") + "</span><b>" + esc(c.name || "–") + "</b></li>" +
      "<li><span>" + L("issued.date") + "</span><b>" + day(d.date) + "</b></li>" +
      (d.type === "facture" ? "<li><span>" + L("issued.due") + "</span><b>" + day(E.dueDate(d)) + "</b></li>" : "") +
      "<li><span>" + L("issued.amount") + "</span><b>" + esc(money(tot)) + "</b></li>" +
      (d.type === "facture" ? "<li><span>" + L("issued.cashed") + "</span><b>" + esc(money(paid)) + "</b></li>" +
        (credit > 0 ? "<li><span>" + L("issued.credits") + "</span><b>− " + esc(money(credit)) + "</b></li>" : "") +
        "<li><span><strong>" + L("issued.balance") + "</strong></span><b>" + esc(money(Math.max(0, bal))) + "</b></li>" : "") +
      (d.type === "avoir" ? "<li><span>" + L("issued.refunded") + "</span><b>" + esc(money(paid)) + "</b></li>" +
        "<li><span><strong>" + L("issued.toRefund") + "</strong></span><b>" + esc(money(bal)) + "</b></li>" : "") +
      "</ul></section>" +
      '<div class="espace-actions"><button type="button" class="btn btn-primary" id="d-print">' + L("issued.download") + "</button>" +
      '<button type="button" class="btn btn-ghost" id="d-duplicate">' + L("issued.duplicate") + "</button>" +
      (d.type === "facture" && credit < tot - 0.005 ? '<button type="button" class="btn btn-ghost" id="d-credit">' + L("issued.createCredit") + "</button>" : "") +
      (d.type === "devis" && !d.invoiceId ? '<button type="button" class="btn btn-ghost" id="d-convert">' + L("issued.convert") + "</button>" : "") +
      "</div>";
    if (st !== "cancelled") html += sendCard(d);
    if (UI.issued) html += UI.issued.cards(d);   // cartes du pays (France : facture électronique Factur-X)
    if (d.type === "devis") {
      html += '<section class="card espace-card"><h3>' + L("quote.answer") + '</h3><div class="espace-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm" data-quote="accepted"' + (d.status === "accepted" ? ' aria-pressed="true"' : "") + ">" + L("state.accepted") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-quote="refused"' + (d.status === "refused" ? ' aria-pressed="true"' : "") + ">" + L("state.refused") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-quote="sent"' + (d.status === "sent" ? ' aria-pressed="true"' : "") + ">" + L("quote.pending") + "</button></div>" +
        (d.invoiceId && doc(d.invoiceId) ? '<p class="small">' + L("quote.invoiced") + ' <a href="#/documents/' + esc(d.invoiceId) + '">' + esc(docLabel(doc(d.invoiceId))) + "</a></p>" : "") + "</section>";
    } else if (d.type === "facture" || bal > 0.005 || paid > 0) {
      html += paymentsCard(d, bal);
    } else {
      html += '<section class="card espace-card"><p class="small muted">' + L("credit.deducted") + "</p></section>";
    }
    if (d.type === "facture" && (st === "overdue" || st === "unpaid" || st === "partial")) {
      html += '<section class="card espace-card"><h3>' + L("remind.title") + '</h3><p class="small muted">' +
        (st === "overdue" ? L("remind.overdue", { n: OF.daysBetween(E.dueDate(d), TODAY) }) : L("remind.dueOn", { date: day(E.dueDate(d)) })) +
        '</p><div class="espace-actions"><a class="btn btn-ghost btn-sm" id="d-remind" href="' + esc(mailto(d, "reminder")) + '">' + L("remind.write") + "</a>" +
        '<a class="btn btn-ghost btn-sm" href="' + L("remind.templatesHref") + '">' + L("remind.templates") + "</a></div></section>";
    }
    if (d.origin && d.originId) html += '<p class="small">' + L("credit.ofInvoiceHtml", { href: "#/documents/" + esc(d.originId), number: esc(d.origin.number) }) + "</p>";
    if (d.quoteId && doc(d.quoteId)) html += '<p class="small">' + L("invoice.fromQuoteHtml", { href: "#/documents/" + esc(d.quoteId), number: esc(doc(d.quoteId).number) }) + "</p>";
    html += "</div>" + paper(d) + "</div>";
    view.innerHTML = html;
    bindIssued(d);
  }

  function paymentsCard(d, bal) {
    var refund = d.type === "avoir";
    var rows = (d.payments || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var html = '<section class="card espace-card"><h3>' + (refund ? L("pay.refunds") : L("pay.receipts")) + "</h3>";
    html += rows.length ? '<ul class="pay-list">' + rows.map(function (p) {
      return "<li><span>" + day(p.date) + " · " + esc(E.METHODS[p.method] || p.method) + (p.note ? " · " + esc(p.note) : "") + "</span><b>" + esc(money(p.amount)) +
        '</b><button type="button" class="line-remove" data-pay-remove="' + esc(p.id) + '" aria-label="' + L("pay.remove") + '" title="' + L("line.remove") + '">✕</button></li>';
    }).join("") + "</ul>" : '<p class="muted small">' + (refund ? L("pay.noRefund") : L("pay.noReceipt")) + "</p>";
    if (bal > 0.005) {
      html += '<form id="pay-form" class="fields" novalidate>' +
        '<div class="field"><label for="pay-date">' + L("pay.date") + '</label><input type="date" id="pay-date" value="' + TODAY + '"></div>' +
        '<div class="field"><label for="pay-amount">' + L("pay.amount") + '</label><div class="input-suffix"><input type="text" id="pay-amount" inputmode="decimal" value="' + esc(String(bal).replace(".", DEC)) + '"><span>' + CUR + "</span></div></div>" +
        '<div class="field"><label for="pay-method">' + L("pay.method") + '</label><select id="pay-method">' + options(Object.keys(E.METHODS).map(function (k) { return [k, E.METHODS[k]]; }), "virement") + "</select></div>" +
        '<div class="field"><label for="pay-note">' + L("pay.note") + '</label><input type="text" id="pay-note" placeholder="' + L("pay.notePlaceholder") + '"></div>' +
        '<p class="form-error full" id="pay-error" role="alert" hidden></p>' +
        '<div class="full"><button type="submit" class="btn btn-primary btn-sm">' + (refund ? L("pay.saveRefund") : L("pay.saveReceipt")) + "</button></div></form>";
    }
    return html + "</section>";
  }

  /** Envoi au client : le PDF à joindre, puis l'email prérempli (c'est la messagerie de l'utilisateur qui l'envoie). */
  function sendCard(d) {
    var to = recipient(d);
    return '<section class="card espace-card"><h3>' + L("send.title") + "</h3>" +
      '<ol class="send-steps small"><li>' + L("send.step1") + "</li><li>" + L("send.step2") + "</li></ol>" +
      '<div class="espace-actions"><a class="btn btn-ghost btn-sm" id="d-send" href="' + esc(mailto(d, "send")) + '">' + L("send.write") + "</a></div>" +
      (to ? '<p class="small muted">' + L("send.to", { to: esc(to) }) + "</p>"
        : '<p class="small muted">' + (client(d.clientId) ? L("send.noEmailAddHtml", { href: "#/clients/" + esc(d.clientId) }) : L("send.noEmail")) + "</p>") +
      "</section>";
  }

  // ----- Scripts différés (moteur PDF de la facture électronique, chargé à la demande) ----------------------------

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
    if (UI.issued) UI.issued.bind(d);
    $("d-duplicate").addEventListener("click", function () {
      this.disabled = true;
      var copy = E.duplicate(d, TODAY, S.uid());
      copy.createdAt = copy.updatedAt = now();
      data.documents.push(copy);
      persist(L("issued.copied")).then(function () { location.hash = "#/documents/" + copy.id; });
    });
    if ($("d-credit")) $("d-credit").addEventListener("click", function () {
      this.disabled = true;
      var credit = E.creditFromInvoice(d, TODAY, S.uid());
      credit.createdAt = credit.updatedAt = now();
      data.documents.push(credit);
      persist(L("issued.creditCreated")).then(function () { location.hash = "#/documents/" + credit.id; });
    });
    if ($("d-convert")) $("d-convert").addEventListener("click", function () {
      this.disabled = true;
      var inv = E.invoiceFromQuote(d, TODAY, S.uid());
      inv.createdAt = inv.updatedAt = now();
      d.status = d.status === "refused" ? "accepted" : d.status === "sent" ? "accepted" : d.status;
      if (d.status === "accepted" && !d.decidedAt) d.decidedAt = TODAY;
      d.invoiceId = inv.id;
      data.documents.push(inv);
      persist(L("issued.converted")).then(function () { location.hash = "#/documents/" + inv.id; });
    });
    view.querySelectorAll("[data-quote]").forEach(function (b) {
      b.addEventListener("click", function () {
        var before = d.status;
        d.status = b.getAttribute("data-quote");
        // Date de décision (documentation/55, § 7) : posée quand le devis devient accepté ou refusé (un second clic ne la change
        // pas ; un devis décidé avant ce suivi reste sans date), retirée si le devis est remis en attente.
        if (d.status === "sent") delete d.decidedAt; else if (d.status !== before) d.decidedAt = TODAY;
        d.updatedAt = now();
        persist(L("quote.statusSaved", { state: STATES[d.status][0].toLowerCase() })).then(function () { render(true); });
      });
    });
    view.querySelectorAll("[data-pay-remove]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm(L("pay.confirmRemove"))) return;
        d.payments = d.payments.filter(function (p) { return p.id !== b.getAttribute("data-pay-remove"); });
        d.updatedAt = now();
        persist(L("pay.removed")).then(function () { render(true); });
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
      persist(d.type === "avoir" ? L("pay.refundSaved", { amount: money(pay.amount) }) : L("pay.receiptSaved", { amount: money(pay.amount) })).then(function () { render(true); });
    });
  }

  // ----- Clients --------------------------------------------------------------------------------

  // ----- Indicateurs des documents et des clients (documentation/55-indicateurs-espace.md, § 2) ----------------

  var pct = function (x) { return percent(Math.round(x * 100)); };
  /** Barres « facturé (HT) et encaissé » par mois dans le conteneur data-chart="name". */
  function drawInvoicedChart(name, months, who) {
    var el = view.querySelector('[data-chart="' + name + '"]');
    if (!el) return;
    el.innerHTML = OF.charts.bars({ width: Math.floor(el.getBoundingClientRect().width) || 600,
      groups: months.map(function (m) { return { key: m.key, label: m.label, values: [m.invoiced, m.cashed], future: false }; }),
      series: [{ name: L("chart.invoicedHT"), cls: "is-cur" }, { name: L("chart.cashed"), cls: "is-in" }],
      title: L("chart.invoicedTitle") + (who ? L("common.colon") + who : ""),
      desc: L("chart.invoicedDesc", { invoiced: money(months.reduce(function (s, m) { return s + m.invoiced; }, 0)),
        cashed: money(months.reduce(function (s, m) { return s + m.cashed; }, 0)) }) });
  }
  function invoicedCard(name, months, intro) {
    return '<section class="card espace-card"><div class="card-head"><h3>' + L("chart.invoicedTitle") + '</h3><span class="small muted">' + esc(intro) + "</span></div>" +
      '<div class="chart" data-chart="' + name + '"></div>' + OF.charts.legend([{ cls: "is-cur", label: L("chart.invoicedLegend") }, { cls: "is-in", label: L("chart.cashed") }]) +
      OF.charts.table(L("chart.invoicedTitle"), [L("chart.month"), L("chart.invoicedHT"), L("chart.cashed")], months.map(function (m) {
        return [m.label + (m.current ? L("chart.current") : ""), money(m.invoiced), money(m.cashed)];
      })) + "</section>";
  }
  // Période de l'onglet Documents (documentation/55, § 8) : boutons, et mois du graphique selon la période.
  var PERIOD_LABELS = { mois: L("period.mois"), trimestre: L("period.trimestre"), annee: L("period.annee"), "12m": L("period.12m"), precedente: L("period.precedente") };
  function documentsMonths(p) {
    var end = p.key === "precedente" ? p.to : TODAY, n = p.key === "annee" ? +TODAY.slice(5, 7) : 12;
    return ST.invoicedMonthly(data.documents, end, n).map(function (m) { return Object.assign({}, m, { current: m.key === TODAY.slice(0, 7) }); });
  }
  function documentsOverview(r, url) {
    if (!data.documents.some(function (d) { return d.status !== "draft"; })) return "";
    var ds = ST.documents(data.documents, TODAY, r.params.periode), q = ds.quotes, p = ds.period;
    return '<div class="tr-tools espace-noprint"><div class="seg" role="group" aria-label="' + L("period.label") + '">' + ST.PERIODS.map(function (k) {
        return '<a class="tab" href="' + url({ periode: k }) + '"' + (k === p.key ? ' aria-current="true"' : "") + ">" + PERIOD_LABELS[k] + "</a>";
      }).join("") + '</div><span class="small muted">' + L("period.range", { from: day(p.from), to: day(p.to) }) + "</span></div>" +
      '<div class="kpis kpis-4">' +
      kpi(L("docs.kpiInvoiced", { period: p.label }), money(ds.invoiced), [countText(ds.count, L("count.invoice.one"), L("count.invoice.many")),
        ds.average !== null ? L("docs.average", { amount: money(ds.average) }) : "",
        ds.creditCount ? countText(ds.creditCount, L("count.credit.one"), L("count.credit.many")) + " (" + money(ds.credits) + ")" : ""].filter(Boolean).join(" · ")) +
      kpi(L("docs.kpiCashed", { period: p.label }), money(ds.cashed), L("docs.kpiCashedSub")) +
      kpi(L("docs.kpiPending"), money(q.pendingAmount), q.pending ? countText(q.pending, L("count.validQuote.one"), L("count.validQuote.many")) + L("docs.today") : L("docs.noPending")) +
      kpi(L("docs.kpiRate"), q.rate === null ? "–" : pct(q.rate), q.rate === null ? L("docs.noDecided", { period: p.label }) :
        L("docs.rateSub", { signed: countText(q.signed, L("count.signed.one"), L("count.signed.many")), refused: countText(q.refused, L("count.refused.one"), L("count.refused.many")),
          expired: countText(q.expired, L("count.expired.one"), L("count.expired.many")), period: p.label })) +
      "</div>" + invoicedCard("invoiced", documentsMonths(p), p.key === "annee" || p.key === "precedente" ? L("docs.yearIntro", { year: p.from.slice(0, 4) }) : L("docs.last12Intro"));
  }

  function viewClients(r) {
    var showArchived = r.params.archives === "1";
    var list = data.clients.filter(function (c) { return showArchived || !c.archived; })
      .sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || ""), OF.locale); });
    var html = '<div class="espace-head"><h2>' + L("clients.title") + '</h2><div class="espace-quick espace-noprint"><a class="btn btn-primary btn-sm" href="#/clients/nouveau">' + L("quick.client") + "</a></div></div>";
    if (!list.length) {
      html += '<div class="card espace-card"><p class="muted">' + L("clients.empty") + "</p>" +
        '<a class="btn btn-primary btn-sm" href="#/clients/nouveau">' + L("clients.create") + "</a></div>";
    } else {
      var cs = ST.clients(data.documents, TODAY);
      if (cs.active) {
        html += '<div class="kpis kpis-4">' +
          kpi(L("clients.active"), String(cs.active), L("clients.activeSub")) +
          kpi(L("clients.new", { year: YEAR }), String(cs.newThisYear), L("clients.newSub")) +
          kpi(L("clients.average"), money(cs.average), L("clients.averageSub")) +
          kpi(L("clients.top1"), pct(cs.top1), L("clients.top3", { pct: pct(cs.top3) }), cs.top1 >= 0.5 ? "is-warn" : "") + "</div>" +
          topClientsCard(ST.topClients(data.documents, ST.since12(TODAY), TODAY, 10), true);
      }
      html += '<div class="card espace-card"><ul class="doc-list">' + list.map(function (c) {
        var t = E.clientTotals(data.documents, c.id);
        return '<li><a href="#/clients/' + esc(c.id) + '"><span class="dl-main"><b>' + esc(c.name) + (c.archived ? L("clients.archivedMark") : "") + '</b><span class="small muted">' +
          esc([c.pro ? L("clients.pro") : L("clients.private"), c.email].filter(Boolean).join(" · ")) + '</span></span><span class="dl-side"><b>' + esc(money(t.cashed)) +
          '</b><span class="small muted">' + (t.due > 0 ? L("clients.remaining", { amount: esc(money(t.due)) }) : L("clients.cashed")) + "</span></span></a></li>";
      }).join("") + "</ul>" +
        '<p class="small"><a href="#/clients' + (showArchived ? "" : "?archives=1") + '">' + (showArchived ? L("clients.hideArchived") : L("clients.showArchived")) + "</a></p></div>";
    }
    view.innerHTML = html;
  }

  function viewClientForm(r) {
    var isNew = r.id === "nouveau";
    var c = isNew ? Object.assign({ id: S.uid(), name: "", pro: true }, UI.client ? UI.client.defaults() : {}) : client(r.id);
    if (!c) { view.innerHTML = '<div class="espace-head"><h2>' + L("client.notFound") + '</h2></div><p><a href="#/clients">' + L("client.back") + "</a></p>"; return; }
    var back = r.params.retour;
    // Client créé depuis une piste (documentation/38-prospects.md) : fiche préremplie, piste liée à l'enregistrement.
    var lead = isNew ? prospect(r.params.piste) : null;
    if (lead) {
      Object.assign(c, { name: lead.name, pro: lead.pro !== false, email: lead.email || "",
        notes: [lead.contact ? L("client.fromLeadContact", { contact: lead.contact }) : "", lead.phone ? L("client.fromLeadPhone", { phone: lead.phone }) : ""].filter(Boolean).join("\n") });
    }
    var docs = isNew ? [] : data.documents.filter(function (d) { return d.clientId === c.id; });
    var issuedDocs = docs.some(function (d) { return d.status !== "draft" && d.type === "facture"; });
    var cd = issuedDocs ? ST.clientDetail(data.documents, c.id, TODAY) : null, cm = issuedDocs ? ST.invoicedMonthly(data.documents, TODAY, 12, c.id) : null;
    view.innerHTML = '<div class="espace-head"><h2>' + (isNew ? L("client.newTitle") : esc(c.name)) + "</h2></div>" +
      (cd ? '<div class="kpis kpis-4">' +
        kpi(L("chart.invoicedHT"), money(cd.invoiced), L("client.sinceFirst") + (cd.lastInvoice ? L("client.lastOn", { date: day(cd.lastInvoice) }) : "")) +
        kpi(L("client.cashed12"), money(cd.cashed12), L("client.cashed12Sub")) +
        kpi(L("issued.balance"), money(cd.due), cd.late ? L("client.ofWhichLate", { amount: money(cd.late) }) : L("client.noLate"), cd.late ? "is-warn" : "") +
        kpi(L("client.avgDelay"), cd.paidCount ? L("client.days", { n: OF.fmt(cd.avgDays) }) : "–", cd.paidCount ? L("client.avgLate", { n: OF.fmt(cd.avgLate) }) + " · " +
          countText(cd.paidCount, L("count.paidInvoice.one"), L("count.paidInvoice.many")) : L("client.noPaid")) + "</div>" +
        invoicedCard("client-invoiced", cm, L("client.chartIntro")) : "") +
      '<form class="card espace-card" id="client-form" novalidate><div class="fields">' +
      field("name", L("profile.name"), c.name, { required: true, placeholder: L("client.namePlaceholder") }) +
      field("pro", L("client.type"), c.pro ? "1" : "0", { options: [["1", L("client.typePro")], ["0", L("clients.private")]], half: true }) +
      (UI.client ? UI.client.fields(c) : "") +
      field("notes", L("client.notes"), c.notes, { textarea: true }) +
      '</div><p class="form-error" id="client-error" role="alert" hidden></p><div class="espace-actions">' +
      '<button type="submit" class="btn btn-primary">' + (isNew ? L("client.create") : L("common.save")) + "</button>" +
      (isNew ? "" : '<a class="btn btn-ghost" href="#/documents/nouveau?type=facture&client=' + esc(c.id) + '">' + L("new.facture") + "</a>" +
        '<button type="button" class="btn btn-ghost" id="client-archive">' + (c.archived ? L("client.reactivate") : L("client.archive")) + "</button>") +
      "</div></form>" + (docs.length ? '<section class="card espace-card"><h3>' + L("client.docs") + "</h3>" + docTable(docs) + "</section>" : "");
    if (cm) {
      drawCharts = function () { drawInvoicedChart("client-invoiced", cm, c.name); };
      drawCharts();
    }
    var form = $("client-form");
    if (UI.client) UI.client.bind(form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = form.elements;
      if (!f.name.value.trim()) { showError("client-error", L("client.errName")); f.name.focus(); return; }
      ["name", "notes"].forEach(function (k) { c[k] = f[k].value.trim(); });
      c.pro = f.pro.value === "1";
      var problem = UI.client ? UI.client.read(form, c) : null;
      if (problem) { showError("client-error", problem.message); if (problem.field) f[problem.field].focus(); return; }
      c.updatedAt = now();
      if (isNew) { c.createdAt = c.updatedAt; data.clients.push(c); }
      // Les brouillons de ce client suivent ses nouvelles coordonnées (en France : TVA selon le pays, taux choisi gardé) ;
      // les documents émis restent figés.
      var retax = function (d) { if (UI.doc) UI.doc.retax(d, c); };
      data.documents.forEach(function (d) { if (d.clientId === c.id && d.status === "draft") retax(d); });
      if (back && draftInMemory && draftInMemory.id === back) { draftInMemory.clientId = c.id; retax(draftInMemory); }
      var target = back && doc(back) ? doc(back) : null;
      if (target) { target.clientId = c.id; retax(target); }
      if (lead) { lead.clientId = c.id; lead.updatedAt = c.updatedAt; }
      persist(isNew ? L("client.created") : L("client.saved")).then(function () {
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
      persist(c.archived ? L("client.archived") : L("client.reactivated")).then(function () { location.hash = "#/clients"; });
    });
  }

  // ----- Listes en barres -------------------------------------------------------------------------------

  /** Liste en barres horizontales : [{ name, href, amount, share }] (parts de 0 à 1). */
  function barList(items, fmt) {
    var max = items.reduce(function (m, x) { return Math.max(m, x.amount); }, 0);
    return '<ul class="bar-list">' + items.map(function (x) {
      return '<li><span class="bl-name">' + (x.href ? '<a href="' + x.href + '">' + esc(x.name) + "</a>" : esc(x.name)) + '</span><span class="bl-bar" aria-hidden="true"><span style="width:' +
        (max > 0 ? Math.max(1, x.amount / max * 100).toFixed(1) : 0) + '%"></span></span><b class="bl-amount">' + esc((fmt || money)(x.amount)) + '</b><span class="bl-share">' + pct(x.share) + "</span></li>";
    }).join("") + "</ul>";
  }

  // ----- Immobilisations et amortissements (documentation/57-immobilisations.md) ------------------------------------

  var amountText = function (n) { return n === null || n === undefined || n === "" || !isFinite(n) ? "" : Number(n).toFixed(2).replace(".", DEC); };

  // ----- Temps passé (documentation/37-temps-passe.md) --------------------------------------------------------

  var TIME_STATES = { internal: [L("time.state.internal"), "st-draft"], unbilled: [L("time.state.unbilled"), "st-unpaid"],
                      draft: [L("time.state.draft"), "st-partial"], invoiced: [L("state.invoiced"), "st-paid"] };
  var TIME_UNITS = [["hour", L("time.unit.hours")], ["day", L("time.unit.days")]];
  var timeDefaults = null;  // saisie rapide : date, client, unité et taux de la dernière saisie (« Facturable » revient coché)

  // Chronomètre (documentation/37-temps-passe.md, § 8) : état sur l'appareil, hors sauvegarde et synchronisation.
  var CHRONO_KEY = "espace-chrono", chronoTick = null;
  var todayNow = function () { return forced ? TODAY : OF.today(); };
  function chronoLoad() { return E.timerCheck(OF.load(CHRONO_KEY, null)); }
  function chronoSave(x) { OF.save(CHRONO_KEY, x || null); }
  /** Carte du chronomètre (contenu de #chrono) selon l'état : arrêté, en marche, en pause, durée à saisir. */
  function chronoCard(x, nowMs) {
    var head = '<h3 id="chrono-title">' + L("chrono.title") + "</h3>";
    var btn = function (id, label, primary) { return '<button type="button" class="btn ' + (primary ? "btn-primary" : "btn-ghost") + ' btn-sm" id="' + id + '">' + label + "</button>"; };
    if (!x) {
      return head + '<p class="small muted">' + L("chrono.intro") + "</p>" +
        '<div class="espace-actions">' + btn("chrono-start", L("chrono.start"), true) + "</div>";
    }
    var d = E.timerDuration(x, nowMs, todayNow()), started = L("chrono.startedOn", { date: esc(longDay(x.day)) });
    if (x.stopped) {
      return head + "<p>" + L("chrono.stoppedHtml", { duration: esc(E.durationLabel(d.minutes / 60, "hour")), started: started }) + "</p>" +
        (d.over24 ? '<p class="notice warn">' + L("chrono.over24") + "</p>" :
          d.crossesDay ? '<p class="notice">' + L("chrono.midnight") + "</p>" : "") +
        '<div class="espace-actions">' + btn("chrono-resume", L("chrono.resume"), false) + btn("chrono-clear", L("chrono.clear"), false) + "</div>";
    }
    var running = x.start !== null;
    return head + '<p class="chrono-clock" role="timer" id="chrono-clock" aria-label="' + L("chrono.measured") + '">' + esc(E.timerClock(E.timerElapsed(x, nowMs))) + "</p>" +
      '<p class="small muted">' + (running ? L("chrono.running") : L("chrono.paused")) + ", " + started + ".</p>" +
      '<div class="espace-actions">' + (running ? btn("chrono-pause", L("chrono.pause"), false) : btn("chrono-resume", L("chrono.resume"), true)) + btn("chrono-stop", L("chrono.stop"), running) + "</div>";
  }
  /** Reporte la durée d'un chronomètre arrêté dans la saisie rapide : unité « Heures », durée, jour du démarrage. */
  function chronoFill(form, x, sync) {
    var f = form.elements, d = E.timerDuration(x, Date.now(), todayNow());
    if (f.unit.value !== "hour") { f.unit.value = "hour"; sync(); }
    f.duration.value = d.input;
    f.date.value = d.date;
  }
  /** Dessine la carte et branche ses boutons ; l'état est relu du stockage à chaque clic (autre onglet ouvert). */
  function drawChrono(form, sync) {
    var box = $("chrono");
    if (!box) return;
    if (chronoTick) { clearInterval(chronoTick); chronoTick = null; }
    var x = chronoLoad();
    box.innerHTML = chronoCard(x, Date.now());
    if (x && x.start !== null) {
      chronoTick = setInterval(function () {
        var el = $("chrono-clock");
        if (!el) { clearInterval(chronoTick); chronoTick = null; return; }
        el.textContent = E.timerClock(E.timerElapsed(x, Date.now()));
      }, 1000);
    }
    var act = function (id, change, msg, after) {
      var b = $(id);
      if (!b) return;
      b.addEventListener("click", function () {
        var cur = chronoLoad(), next = change(cur, Date.now());
        if (next === undefined) { drawChrono(form, sync); return; }  // état changé ailleurs : on redessine
        chronoSave(next);
        drawChrono(form, sync);
        announce(msg);
        if (after) after(next);
        var first = $("chrono").querySelector("button");
        if (!after && first) first.focus();
      });
    };
    act("chrono-start", function (cur, t) { return cur ? undefined : E.timerStart(t, todayNow()); }, L("chrono.msg.started"));
    act("chrono-pause", function (cur, t) { return cur && cur.start !== null ? E.timerPause(cur, t) : undefined; }, L("chrono.msg.paused"));
    act("chrono-resume", function (cur, t) { return cur && cur.start === null ? E.timerResume(cur, t) : undefined; }, L("chrono.msg.resumed"));
    act("chrono-stop", function (cur, t) { return cur && !cur.stopped ? E.timerStop(cur, t) : undefined; }, L("chrono.msg.stopped"),
      function (next) { chronoFill(form, next, sync); $("ep-task").focus(); });
    act("chrono-clear", function (cur) { return cur ? null : undefined; }, L("chrono.msg.cleared"));
  }
  function timeEntry(id) { return data.timeEntries.filter(function (t) { return t.id === id; })[0] || null; }
  function clientName(id) { var c = client(id); return c ? c.name : id ? L("time.unknownClient") : ""; }
  function timeBadge(state) { var st = TIME_STATES[state]; return '<span class="st ' + st[1] + '">' + esc(st[0]) + "</span>"; }
  /** « 12 h 30 et 1,5 jour » ; « 0 h » si rien. */
  function durations(hours, days) {
    var parts = [];
    if (hours) parts.push(E.durationLabel(hours, "hour"));
    if (days) parts.push(E.durationLabel(days, "day"));
    return parts.join(L("time.and")) || L("time.zero");
  }
  var rateText = function (n) { return n === null || n === undefined || !isFinite(n) ? "" : String(Math.round(n * 100) / 100).replace(".", DEC); };
  function monthShift(key, n) {
    var m = +key.slice(5, 7) - 1 + n, y = +key.slice(0, 4) + Math.floor(m / 12);
    return y + "-" + String(((m % 12) + 12) % 12 + 1).padStart(2, "0");
  }
  var monthLabel = function (key) { return OF.date(key + "-01", { month: "long", year: "numeric" }); };

  /** Champs d'un temps (saisie rapide et modification). */
  function timeFields(x) {
    var clients = data.clients.filter(function (c) { return !c.archived || c.id === x.clientId; })
      .sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || ""), OF.locale); })
      .map(function (c) { return [c.id, c.name]; });
    var perDay = x.unit === "day";
    return field("date", L("ledger.col.date"), x.date, { type: "date", half: true, required: true }) +
      field("clientId", L("draft.client"), x.clientId || "", { options: [["", L("time.noClient")]].concat(clients), half: true }) +
      field("task", L("time.task"), x.task, { required: true, placeholder: L("time.taskPlaceholder"), hint: L("time.taskHint") }) +
      field("duration", L("time.duration"), durationInput(x.quantity, x.unit), { half: true, required: true, placeholder: perDay ? "1" : "1h30",
        hint: '<span id="ep-duration-help">' + (perDay ? L("time.helpDays") : L("time.helpHours")) + "</span>" }) +
      field("unit", L("line.unit"), x.unit || "hour", { options: TIME_UNITS, half: true }) +
      field("rate", perDay ? L("time.rateDay") : L("time.rateHour"), rateText(x.rate), { half: true, inputmode: "decimal", placeholder: perDay ? "450" : "60",
        hint: L("time.rateHint") }) +
      '<div class="field time-billable"><label class="check"><input type="checkbox" id="ep-billable" name="billable"' + (x.billable === false ? "" : " checked") +
      "><span>" + L("time.billable") + "</span></label></div>";
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
      form.querySelector('label[for="ep-rate"]').textContent = perDay ? L("time.rateDay") : L("time.rateHour");
      f.rate.placeholder = perDay ? "450" : "60";
      f.duration.placeholder = perDay ? "1" : "1h30";
      $("ep-duration-help").textContent = perDay ? L("time.helpDays") : L("time.helpHours");
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
      .sort(function (a, b) { return String(clientName(a.clientId)).localeCompare(String(clientName(b.clientId)), OF.locale); });
    var x = Object.assign({ date: TODAY, clientId: "", unit: "hour", rate: null, billable: true }, timeDefaults);
    if (x.clientId && !client(x.clientId)) x.clientId = "";
    var prev = monthShift(month, -1), next = monthShift(month, 1);
    // Indicateurs (documentation/55, § 2) : semaine et mois en cours, dans l'unité suivie (heures, sinon jours).
    var ts = ST.time(data.timeEntries, data.documents, TODAY, 8), unitLabel = function (q) { return q || ts.unit === "day" ? E.durationLabel(q, ts.unit) : L("time.zero"); };
    var otherUnit = data.timeEntries.some(function (t) { return t.date && t.date.slice(0, 7) === TODAY.slice(0, 7) && t.unit !== ts.unit; });
    view.innerHTML = '<div class="espace-head"><h2>' + L("time.title") + '</h2><div class="espace-quick espace-noprint">' +
      '<button type="button" class="btn btn-ghost btn-sm" id="time-csv"' + (s.rows.length ? "" : " disabled") + ">" + L("time.exportMonth") + "</button>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="time-print"' + (s.rows.length ? "" : " disabled") + ">" + L("common.print") + "</button></div></div>" +
      (data.timeEntries.length ? '<div class="kpis kpis-4 espace-noprint">' +
        kpi(L("time.thisWeek"), unitLabel(ts.week), L("time.weekSub", { week: ST.isoWeek(TODAY) })) +
        kpi(L("time.billableShare"), ts.share === null ? "–" : pct(ts.share), L("time.monthSub", { total: unitLabel(ts.month) })) +
        kpi(L("time.toBill"), money(ts.unbilled), L("time.toBillSub")) +
        kpi(ts.unit === "day" ? L("time.avgDay") : L("time.avgHour"), ts.rate === null ? "–" : money(ts.rate) + (ts.unit === "day" ? L("time.perDay") : L("time.perHour")),
          ts.rate === null ? L("time.noRate") : L("time.avgSub")) + "</div>" +
        (otherUnit ? '<p class="small muted espace-noprint">' + L("time.otherUnit", { unit: ts.unit === "day" ? L("time.unitDays") : L("time.unitHours"),
          other: ts.unit === "day" ? L("time.unitHours") : L("time.unitDays") }) + "</p>" : "") : "") +
      '<section class="card espace-card espace-noprint chrono" id="chrono" aria-labelledby="chrono-title"></section>' +
      '<form class="card espace-card espace-noprint" id="time-form" novalidate><h3>' + L("time.enter") + '</h3><div class="fields">' + timeFields(x) + "</div>" +
      '<p class="form-error" id="time-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-primary">' + L("time.add") + "</button></div></form>" +
      (due.length ? '<section class="card espace-card espace-noprint"><h3>' + L("time.toBill") + '</h3><ul class="time-due">' + due.map(function (c) {
        return "<li><span class=\"dl-main\"><b>" + esc(clientName(c.clientId)) + '</b><span class="small muted">' + esc(durations(c.hours, c.days)) + " · " +
          esc(countText(c.entries.length, L("count.entry.one"), L("count.entry.many"))) + "</span></span>" +
          '<span class="dl-side"><b>' + esc(c.amount || !c.missingRate ? money(c.amount) : L("time.rateTbd")) + "</b>" + (c.missingRate ? '<span class="small muted">' + esc(countText(c.missingRate, L("count.noRate.one"), L("count.noRate.many"))) + "</span>" : "") + "</span>" +
          '<a class="btn btn-primary btn-sm" href="#/temps/facturer?client=' + esc(c.clientId) + '" aria-label="' + L("time.billFor", { name: esc(clientName(c.clientId)) }) + '">' + L("time.bill") + "</a></li>";
      }).join("") + "</ul></section>" : "") +
      (data.timeEntries.length ? '<div class="espace-cols tr-charts espace-noprint"><section class="card espace-card"><div class="card-head"><h3>' + L("time.weekly") + '</h3><span class="small muted">' +
        L("time.weeklyIntro", { unit: ts.unit === "day" ? L("time.unitDays") : L("time.unitHours") }) + '</span></div><div class="chart" data-chart="weeks"></div>' +
        OF.charts.legend([{ cls: "is-cur", label: L("time.billable") }, { cls: "is-prev", label: L("time.internal") }]) +
        OF.charts.table(L("time.weekly"), [L("time.week"), L("time.billable"), L("time.internal")], ts.weeks.map(function (w) { return [L("time.weekRow", { label: w.label, date: day(w.key) }), unitLabel(w.billable), unitLabel(w.internal)]; })) +
        '</section><section class="card espace-card"><div class="card-head"><h3>' + L("time.byClient") + '</h3><span class="small muted">' + L("time.currentMonth") + "</span></div>" +
        (ts.byClient.length ? barList(ts.byClient.map(function (c) { return { name: c.clientId ? clientName(c.clientId) : L("time.internalTime"), amount: c.quantity, share: c.share }; }), unitLabel) :
          '<p class="small muted">' + L("time.noneThisMonth") + "</p>") + "</section></div>" : "") +
      '<section class="card espace-card"><div class="time-month"><a class="btn btn-ghost btn-sm espace-noprint" href="#/temps?mois=' + prev + '" aria-label="' + L("time.prevMonth", { month: esc(monthLabel(prev)) }) + '">←</a>' +
      "<h3>" + esc(monthLabel(month)) + '</h3><a class="btn btn-ghost btn-sm espace-noprint" href="#/temps?mois=' + next + '" aria-label="' + L("time.nextMonth", { month: esc(monthLabel(next)) }) + '">→</a></div>' +
      '<ul class="time-totals"><li><span>' + L("time.monthTotal") + "</span><b>" + esc(durations(s.hours, s.days)) + "</b></li><li><span>" + L("time.billable") + "</span><b>" +
      esc(durations(s.billable.hours, s.billable.days)) + "</b></li><li><span>" + L("time.billableAmount") + "</span><b>" + esc(money(s.billable.amount)) + "</b>" +
      (s.billable.missingRate ? '<span class="small muted">' + L("time.excluding", { what: esc(countText(s.billable.missingRate, L("count.noRate.one"), L("count.noRate.many"))) }) + "</span>" : "") + "</li></ul>" +
      (s.rows.length ? "<table class=\"ledger time-table\"><thead><tr><th>" + L("ledger.col.date") + "</th><th>" + L("ledger.col.client") + "</th><th>" + L("time.task") +
        "</th><th>" + L("time.duration") + "</th><th>" + L("time.state") + '</th><th class="num">' + L("ledger.col.amount") + "</th></tr></thead><tbody>" +
        s.rows.map(function (t) {
          return '<tr><td class="c-date">' + day(t.date) + '</td><td class="c-client">' + esc(clientName(t.clientId) || L("time.internalTime")) +
            '</td><td class="c-nature"><a href="#/temps/' + esc(t.id) + '">' + esc(t.task) + '</a></td><td class="c-method">' + esc(E.durationLabel(t.quantity, t.unit)) +
            '</td><td class="c-ref">' + timeBadge(t.state) + '</td><td class="num">' + (t.amount === null ? "–" : esc(money(t.amount))) + "</td></tr>";
        }).join("") + "</tbody></table>"
        : '<p class="muted">' + L("time.noneIn", { month: esc(monthLabel(month)) }) + "</p>") +
      '<p class="small muted">' + L("time.note") + "</p></section>";
    drawCharts = function () {
      var el = view.querySelector('[data-chart="weeks"]');
      if (!el) return;
      el.innerHTML = OF.charts.bars({ width: Math.floor(el.getBoundingClientRect().width) || 600,
        groups: ts.weeks.map(function (w) { return { key: w.key, short: w.label, values: [w.billable, w.internal], future: false }; }),
        series: [{ name: L("time.billable"), cls: "is-cur" }, { name: L("time.internal"), cls: "is-prev" }], title: L("time.weekly"),
        desc: L("time.weeklyDesc", { billable: unitLabel(ts.weeks.reduce(function (s, w) { return s + w.billable; }, 0)),
          internal: unitLabel(ts.weeks.reduce(function (s, w) { return s + w.internal; }, 0)) }) });
    };
    drawCharts();
    var form = $("time-form"), sync = bindTimeForm(form, null, false);
    sync();
    var chrono = chronoLoad();
    if (chrono && chrono.stopped) chronoFill(form, chrono, sync);
    drawChrono(form, sync);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var t = readTime(form);
      if (!showTimeErrors(form, t, "time-error")) return;
      var stopped = chronoLoad();
      if (stopped && stopped.stopped) chronoSave(null);  // durée du chronomètre saisie : il est effacé
      if (t.rate !== null) t.rate = Math.round(t.rate * 100) / 100;
      Object.assign(t, { id: S.uid(), createdAt: now(), updatedAt: now() });
      data.timeEntries.push(t);
      timeDefaults = { date: t.date, clientId: t.clientId, unit: t.unit, rate: t.rate };
      persist(t.clientId ? L("time.addedFor", { duration: E.durationLabel(t.quantity, t.unit), name: clientName(t.clientId) }) : L("time.added", { duration: E.durationLabel(t.quantity, t.unit) })).then(function () {
        history.replaceState(null, "", "#/temps?mois=" + t.date.slice(0, 7));
        currentRoute = route().key;
        render(true);
        $("ep-task").focus();
      });
    });
    if (!s.rows.length) return;
    $("time-csv").addEventListener("click", function () {
      OF.download("﻿" + E.timeCSV(s.rows, clientName), L("time.file", { month: month }), "text/csv;charset=utf-8");
    });
    $("time-print").addEventListener("click", function () {
      document.body.classList.add("print-ledger");
      window.print();
      document.body.classList.remove("print-ledger");
    });
  }

  function viewTimeForm(r) {
    var x = timeEntry(r.id);
    if (!x) { view.innerHTML = '<div class="espace-head"><h2>' + L("time.notFound") + '</h2></div><p><a href="#/temps">' + L("time.back") + "</a></p>"; return; }
    var state = E.timeState(x, data.documents), d = x.invoiceId ? doc(x.invoiceId) : null;
    var back = "#/temps?mois=" + x.date.slice(0, 7);
    var head = '<div class="espace-head"><h2>' + esc(x.task) + "</h2>" + timeBadge(state) + "</div>";
    if (state === "invoiced") {
      view.innerHTML = head + '<div class="card espace-card"><p class="notice">' + L("time.invoicedHtml", { href: "#/documents/" + esc(d.id), number: esc(d.number) }) +
        "</p><dl class=\"time-facts\"><dt>" + L("ledger.col.date") + "</dt><dd>" + day(x.date) + "</dd><dt>" + L("ledger.col.client") + "</dt><dd>" +
        esc(clientName(x.clientId)) + "</dd><dt>" + L("time.duration") + "</dt><dd>" + esc(E.durationLabel(x.quantity, x.unit)) + "</dd><dt>" + L("time.rateHT") + "</dt><dd>" +
        (x.rate === null || x.rate === undefined ? "–" : esc(money(x.rate) + (x.unit === "day" ? L("time.perDayLong") : L("time.perHourLong")))) + '</dd></dl><div class="espace-actions"><a class="btn btn-ghost" href="' + back + '">' + L("time.back") + "</a></div></div>";
      return;
    }
    view.innerHTML = head + (state === "draft" ? '<div class="notice espace-noprint"><p>' + L("time.inDraftHtml", { href: "#/documents/" + esc(d.id) }) +
      '</p><button type="button" class="btn btn-ghost btn-sm" id="time-unlink">' + L("time.unlink") + "</button></div>" : "") +
      '<form class="card espace-card" id="time-form" novalidate><div class="fields">' + timeFields(x) + "</div>" +
      '<p class="form-error" id="time-error" role="alert" hidden></p><div class="espace-actions">' +
      '<button type="submit" class="btn btn-primary">' + L("common.save") + '</button><a class="btn btn-ghost" href="' + back + '">' + L("common.cancel") + "</a>" +
      '<button type="button" class="btn btn-ghost" id="time-delete">' + L("line.remove") + "</button></div></form>";
    var form = $("time-form");
    bindTimeForm(form, x.id, true);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var t = readTime(form);
      if (!showTimeErrors(form, t, "time-error")) return;
      if (t.rate !== null) t.rate = Math.round(t.rate * 100) / 100;
      Object.assign(x, t, { updatedAt: now() });
      persist(L("time.updated")).then(function () { location.hash = "#/temps?mois=" + x.date.slice(0, 7); });
    });
    $("time-delete").addEventListener("click", function () {
      if (!confirm(state === "draft" ? L("time.confirmDeleteDraft") : L("time.confirmDelete"))) return;
      data.timeEntries = data.timeEntries.filter(function (t) { return t.id !== x.id; });
      persist(L("time.deleted")).then(function () { location.hash = back; });
    });
    if ($("time-unlink")) $("time-unlink").addEventListener("click", function () {
      delete x.invoiceId;
      x.updatedAt = now();
      persist(L("time.unlinked")).then(function () { render(true); });
    });
  }

  function viewTimeInvoice(r) {
    var c = client(r.params.client);
    var due = c && E.unbilledByClient(data.timeEntries, data.documents).filter(function (x) { return x.clientId === c.id; })[0];
    if (!due) {
      view.innerHTML = '<div class="espace-head"><h2>' + L("ti.title") + '</h2></div><div class="card espace-card"><p class="muted">' +
        (c ? L("ti.noneFor", { name: esc(c.name) }) : L("ti.none")) + '</p><p><a href="#/temps">' + L("time.back") + "</a></p></div>";
      return;
    }
    view.innerHTML = '<div class="espace-head"><h2>' + L("ti.titleFor", { name: esc(c.name) }) + "</h2></div>" +
      '<form class="card espace-card" id="ti-form" novalidate><fieldset class="time-pick"><legend>' + L("ti.entries") + "</legend>" +
      due.entries.map(function (t) {
        return '<label class="check"><input type="checkbox" name="entry" value="' + esc(t.id) + '" checked><span>' + day(t.date) + " · " + esc(t.task) + " · " +
          esc(E.durationLabel(t.quantity, t.unit)) + (t.rate === null || t.rate === undefined ? L("ti.noRate") : " · " + esc(money(t.rate)) + (t.unit === "day" ? L("time.perDay") : L("ti.perHour"))) + "</span></label>";
      }).join("") + '</fieldset><fieldset class="time-pick"><legend>' + L("ti.lines") + "</legend>" +
      '<label class="check"><input type="radio" name="mode" value="task" checked><span>' + L("ti.modeTask") + "</span></label>" +
      '<label class="check"><input type="radio" name="mode" value="entry"><span>' + L("ti.modeEntry") + "</span></label></fieldset>" +
      "<h3>" + L("ti.preview") + '</h3><div id="ti-preview" aria-live="polite"></div>' +
      '<p class="form-error" id="ti-error" role="alert" hidden></p><div class="espace-actions">' +
      '<button type="submit" class="btn btn-primary">' + L("ti.create") + '</button><a class="btn btn-ghost" href="#/temps">' + L("common.cancel") + "</a></div>" +
      '<p class="small muted">' + L("ti.note") + "</p></form>";
    var form = $("ti-form");
    var picked = function () {
      var ids = Array.prototype.filter.call(form.querySelectorAll('[name="entry"]'), function (i) { return i.checked; }).map(function (i) { return i.value; });
      return due.entries.filter(function (t) { return ids.indexOf(t.id) > -1; });
    };
    var mode = function () { return form.querySelector('[name="mode"]:checked').value; };
    var preview = function () {
      var res = E.timeInvoice(picked(), mode());
      var ht = INV.compute({ lines: res.lines }).ht, missing = res.lines.filter(function (l) { return !isFinite(l.price); }).length;
      $("ti-preview").innerHTML = res.lines.length ? "<table class=\"ledger\"><thead><tr><th>" + L("line.desc") + "</th><th>" + L("ti.qtyPrice") + '</th><th class="num">' + L("ti.totalHT") + "</th></tr></thead><tbody>" +
        res.lines.map(function (l) {
          var qty = OF.fmt(l.qty) + INV.UNITS[l.unit];
          return '<tr><td class="c-nature">' + esc(l.desc) + '</td><td class="c-method">' + esc(isFinite(l.price) ? qty + " × " + money(l.price) : qty + L("ti.priceToEnter")) +
            '</td><td class="num">' + (isFinite(l.price) ? esc(money(Math.round(l.qty * l.price * 100) / 100)) : L("ti.toEnter")) + "</td></tr>";
        }).join("") + '</tbody><tfoot><tr><td colspan="2">' + L("ti.totalHT") + (missing ? L("ti.excludingNoPrice") : "") + '</td><td class="num">' + esc(money(ht)) + "</td></tr></tfoot></table>" +
        (missing ? '<p class="small muted">' + L("ti.missing", { lines: esc(countText(missing, L("count.line.one"), L("count.line.many"))) }) + "</p>" : "")
        : '<p class="muted">' + L("ti.pickOne") + "</p>";
    };
    form.addEventListener("change", preview);
    preview();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var list = picked();
      if (!list.length) { showError("ti-error", L("ti.errPick")); return; }
      var res = E.timeInvoice(list, mode());
      var d = newDraft("facture", c.id);
      d.lines = res.lines;
      d.serviceDate = res.serviceDate;
      data.documents.push(d);
      list.forEach(function (t) { t.invoiceId = d.id; t.updatedAt = now(); });
      persist(L("ti.created", { what: countText(list.length, L("count.time.one"), L("count.time.many")) })).then(function () {
        location.hash = "#/documents/" + d.id;
      });
    });
  }

  // ----- Réglages et sauvegarde -------------------------------------------------------------------------

  function importControl() {
    return '<div class="field"><label for="import-file">' + L("backup.file") + '</label><input type="file" id="import-file" accept="application/json,.json"></div>' +
      '<p class="form-error" id="import-error" role="alert" hidden></p>';
  }
  /** Problèmes d'une sauvegarde importée, par code de S.validate (tools/espace-store.js). */
  var BACKUP_PROBLEMS = { notBackup: L("backup.problem.notBackup"), version: L("backup.problem.version"), incomplete: L("backup.problem.incomplete"),
                         profile: L("backup.problem.profile"), unreadable: L("backup.problem.unreadable") };
  function bindImport() {
    $("import-file").addEventListener("change", function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var incoming;
        try { incoming = JSON.parse(reader.result); } catch (e) { showError("import-error", L("backup.unreadable")); return; }
        var problem = S.validate(incoming);
        if (problem) { showError("import-error", BACKUP_PROBLEMS[problem] || problem); return; }
        var n = incoming.documents.length, k = incoming.clients.length;
        if (!confirm(L("backup.confirmReplace", { docs: countText(n, L("count.document.one"), L("count.document.many")), clients: countText(k, L("count.client.one"), L("count.client.many")) }))) return;
        data = S.normalise(incoming);
        persist(L("backup.restored")).then(function () { location.hash = "#/"; render(); });
      };
      reader.readAsText(file);
    });
  }

  // ----- Prospects (documentation/38-prospects.md) -------------------------------------------------------------

  var STAGE_CLASSES = { new: "st-draft", talks: "st-unpaid", quote: "st-partial", won: "st-paid", lost: "st-draft" };
  var SOURCES = L("pros.sources").split("|");
  function prospect(id) { return data.prospects.filter(function (p) { return p.id === id; })[0] || null; }
  function stageBadge(s) { return '<span class="st ' + STAGE_CLASSES[s] + '">' + esc(E.STAGE_LABELS[s]) + "</span>"; }
  var byNextDate = function (a, b) {
    var x = a.nextDate || "9999", y = b.nextDate || "9999";
    return x < y ? -1 : x > y ? 1 : String(a.name || "").localeCompare(String(b.name || ""), OF.locale);
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

  /** Durée de conservation des données d'un prospect, en années, selon le pays ; null si le pays n'en fixe pas. */
  function retentionYears() { return UI.prospects ? UI.prospects.retentionYears() : null; }

  /** Rappels du tableau de bord : relances dues et durée de conservation atteinte. */
  function prospectsReminder() {
    var due = E.followUps(data.prospects, data.documents, TODAY);
    var keep = retentionYears(), old = keep ? E.retentionDue(data.prospects, data.documents, TODAY, keep) : [];
    return (due.length ? '<p class="notice espace-noprint">' + (due.length > 1 ? L("pros.remind.manyHtml", { n: due.length }) : L("pros.remind.oneHtml", { name: esc(due[0].name) })) +
        (due[0].nextDate < TODAY ? L("pros.remind.since", { date: day(due[0].nextDate) }) : "") + '. <a href="#/prospects">' + L("pros.remind.see") + "</a></p>" : "") +
      (old.length ? '<p class="notice warn espace-noprint">' + L("pros.remind.old", { what: esc(countText(old.length, L("count.prospect.one"), L("count.prospect.many"))),
        years: keep }) + ' <a href="#/prospects">' + L("pros.remind.seeList") + "</a></p>" : "");
  }

  function prospectItem(p) {
    var v = E.prospectValue(p, data.documents);
    return '<li><a href="#/prospects/' + esc(p.id) + '"><span class="dl-main"><b>' + esc(p.name) + '</b><span class="small muted">' +
      esc([p.contact, p.nextDate ? L("pros.nextOn", { date: day(p.nextDate) }) : ""].filter(Boolean).join(" · ") || (p.pro === false ? L("pros.person") : L("pros.pro"))) +
      '</span></span><span class="dl-side"><b>' + (v === null ? "–" : esc(money(v))) + "</b></span></a></li>";
  }

  function viewProspects() {
    var docs = data.documents, list = data.prospects.slice().sort(byNextDate);
    var pipe = E.pipeline(list, docs), due = E.followUps(list, docs, TODAY);
    var keep = retentionYears(), old = keep ? E.retentionDue(list, docs, TODAY, keep) : [];
    var groups = {};
    Object.keys(E.STAGE_LABELS).forEach(function (s) { groups[s] = []; });
    list.forEach(function (p) { groups[E.prospectStage(p, docs)].push(p); });
    var html = '<div class="espace-head"><h2>' + L("pros.title") + '</h2><div class="espace-quick espace-noprint">' +
      '<a class="btn btn-primary btn-sm" href="#/prospects/nouveau">' + L("pros.new") + "</a>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="prospects-csv"' + (list.length ? "" : " disabled") + ">" + L("common.exportCsv") + "</button></div></div>";
    if (!list.length) {
      html += '<div class="card espace-card"><p class="muted">' + L("pros.empty") + "</p>" +
        '<a class="btn btn-primary btn-sm" href="#/prospects/nouveau">' + L("pros.add") + "</a></div>";
    } else {
      // Indicateurs (documentation/55, § 2) : carnet ouvert, relances, conversion des pistes closes, valeur moyenne d'une piste gagnée.
      var ps = ST.prospects(list, docs, TODAY);
      html += '<div class="kpis kpis-4">' +
        kpi(L("pros.kpi.open"), String(pipe.open.count), L("pros.kpi.openSub", { amount: money(pipe.open.value) })) +
        kpi(L("pros.kpi.due"), String(due.length), ps.late ? L("pros.kpi.dueLate", { n: ps.late }) : due.length ? L("pros.kpi.dueToday") : L("pros.kpi.dueNone")) +
        (ps.closed12 ? kpi(L("pros.kpi.conversion"), pct(ps.conversion12), L("pros.kpi.conversion12", { what: countText(ps.closed12, L("count.closedLead.one"), L("count.closedLead.many")) })) :
          kpi(L("pros.kpi.conversion"), ps.conversion === null ? "–" : pct(ps.conversion), ps.closed ? L("pros.kpi.conversionAll", { n: ps.closed }) : L("pros.kpi.conversionNone"))) +
        kpi(L("pros.kpi.wonAverage"), ps.wonAverage === null ? "–" : money(ps.wonAverage), ps.wonAverage === null ? L("pros.kpi.wonNone") : L("pros.kpi.wonPer")) + "</div>";
      html += '<section class="card espace-card">' +
        (due.length ? "<h3>" + L("pros.kpi.due") + '</h3><ul class="doc-list">' + due.map(function (p) {
          return '<li><a href="#/prospects/' + esc(p.id) + '"><span class="dl-main"><b>' + esc(p.name) + '</b><span class="small muted">' +
            esc(p.nextAction || L("pros.duePlanned")) + '</span></span><span class="dl-side"><b>' + day(p.nextDate) + "</b>" +
            (p.nextDate < TODAY ? '<span class="st st-overdue">' + L("pros.late") + "</span>" : '<span class="st st-unpaid">' + L("pros.today") + "</span>") + "</span></a></li>";
        }).join("") + "</ul>" : '<p class="small muted">' + L("pros.noneToday") + "</p>") + "</section>";
      // Entonnoir (documentation/55, § 2) : nombre de pistes et valeur par étape.
      var top = Math.max.apply(null, ps.stages.map(function (x) { return x.count; }));
      html += '<section class="card espace-card espace-noprint"><div class="card-head"><h3>' + L("pros.funnel") + '</h3><span class="small muted">' + L("pros.funnelIntro") + "</span></div>" +
        '<ul class="bar-list funnel">' + ps.stages.map(function (x) {
          return '<li><span class="bl-name">' + esc(x.label) + '</span><span class="bl-bar" aria-hidden="true"><span class="' + (x.key === "lost" ? "is-lost" : x.key === "won" ? "is-won" : "") +
            '" style="width:' + (top > 0 ? Math.max(x.count ? 2 : 0, x.count / top * 100).toFixed(1) : 0) + '%"></span></span><b class="bl-amount">' + esc(countText(x.count, L("count.lead.one"), L("count.lead.many"))) +
            '</b><span class="bl-share">' + esc(money(x.value)) + "</span></li>";
        }).join("") + "</ul></section>";
      var closedShown = ps.months.reduce(function (s, m) { return s + m.won + m.lost; }, 0);
      if (closedShown) {
        html += '<section class="card espace-card espace-noprint"><div class="card-head"><h3>' + L("pros.closed") + '</h3><span class="small muted">' + L("pros.closedIntro") +
          "</span></div>" + '<div class="chart" data-chart="closed"></div>' +
          OF.charts.legend([{ cls: "is-in", label: L("pros.won") }, { cls: "is-prev", label: L("pros.lost") }]) +
          OF.charts.table(L("pros.closedTitle"), [L("pros.month"), L("pros.won"), L("pros.lost")], ps.months.map(function (m) { return [monthLabel(m.key), String(m.won), String(m.lost)]; })) +
          (ps.undated ? '<p class="small muted">' + esc(countText(ps.undated, L("count.undated.one"), L("count.undated.many"))) + ".</p>" : "") +
          "</section>";
      }
      html += '<div class="pipeline">' + E.OPEN_STAGES.map(function (s) {
        return '<section class="card espace-card" aria-labelledby="stage-' + s + '"><div class="pipeline-head"><h3 id="stage-' + s + '">' + esc(E.STAGE_LABELS[s]) +
          '</h3><span class="small muted">' + esc(countText(pipe[s].count, L("count.lead.one"), L("count.lead.many"))) + " · " + esc(money(pipe[s].value)) + "</span></div>" +
          (groups[s].length ? '<ul class="doc-list">' + groups[s].map(prospectItem).join("") + "</ul>" : '<p class="small muted">' + L("pros.noLead") + "</p>") + "</section>";
      }).join("") + "</div>";
      html += ["won", "lost"].map(function (s) {
        return groups[s].length ? '<details class="card details-card"><summary><span><b>' + esc(s === "won" ? L("pros.wonGroup") : L("pros.lostGroup")) + "</b> · " +
          esc(countText(pipe[s].count, L("count.lead.one"), L("count.lead.many"))) + (s === "won" ? " · " + esc(money(pipe[s].value)) : "") + '</span></summary><ul class="doc-list">' +
          groups[s].map(prospectItem).join("") + "</ul></details>" : "";
      }).join("");
    }
    if (old.length) {
      html += '<section class="card espace-card" id="prospects-retention"><h3>' + L("pros.retention") + '</h3><p class="small">' +
        UI.prospects.retentionNote(keep) + "</p><ul class=\"time-due\">" + old.map(function (x) {
          return '<li><span class="dl-main"><a href="#/prospects/' + esc(x.prospect.id) + '"><b>' + esc(x.prospect.name) + '</b></a><span class="small muted">' +
            (E.lastContactFrom(x.prospect) ? L("pros.lastContact", { date: day(x.since) }) : L("pros.createdOn", { date: day(x.since) })) + "</span></span>" +
            '<button type="button" class="btn btn-ghost btn-sm" data-forget="' + esc(x.prospect.id) + '" aria-label="' + L("pros.forgetLabel", { name: esc(x.prospect.name) }) + '">' + L("line.remove") + "</button></li>";
        }).join("") + "</ul></section>";
    }
    html += '<section class="card espace-card"><h3>' + L("pros.optoutList") + '</h3><p class="small">' +
      (data.optouts.length ? (data.optouts.length > 1 ? L("pros.optoutCount.many", { n: data.optouts.length }) : L("pros.optoutCount.one", { n: data.optouts.length })) + " "
        : L("pros.optoutNone") + " ") +
      (UI.prospects ? UI.prospects.optoutNote() : "") + "</p></section>" +
      (UI.prospects ? '<section class="card espace-card"><h3>' + L("pros.rulesTitle") + "</h3>" + UI.prospects.rules() + "</section>" : "");
    view.innerHTML = html;
    drawCharts = function () {
      var el = view.querySelector('[data-chart="closed"]');
      if (!el) return;
      el.innerHTML = OF.charts.bars({ width: Math.floor(el.getBoundingClientRect().width) || 600, height: 190, // des nombres de pistes : un graphique bas suffit
        groups: ps.months.map(function (m) { return { key: m.key, values: [m.won, m.lost], future: false }; }),
        series: [{ name: L("pros.won"), cls: "is-in" }, { name: L("pros.lost"), cls: "is-prev" }], title: L("pros.closedTitle"),
        desc: L("pros.closedDesc", { won: countText(ps.months.reduce(function (s, m) { return s + m.won; }, 0), L("count.wonLead.one"), L("count.wonLead.many")),
          lost: countText(ps.months.reduce(function (s, m) { return s + m.lost; }, 0), L("count.lostLead.one"), L("count.lostLead.many")) }) });
    };
    drawCharts();
    view.querySelectorAll("[data-forget]").forEach(function (b) {
      b.addEventListener("click", function () {
        var p = prospect(b.getAttribute("data-forget"));
        if (!p || !confirm(L("pros.confirmDelete", { name: p.name }))) return;
        data.prospects = data.prospects.filter(function (x) { return x.id !== p.id; });
        persist(L("pros.deleted", { name: p.name })).then(function () { render(true); });
      });
    });
    if (!list.length) return;
    $("prospects-csv").addEventListener("click", function () {
      OF.download("﻿" + E.prospectsCSV(list, docs), L("pros.file", { date: TODAY }), "text/csv;charset=utf-8");
    });
  }

  function viewProspectForm(r) {
    var isNew = r.id === "nouveau";
    var p = isNew ? { id: S.uid(), name: "", contact: "", email: "", phone: "", pro: true, source: "", stage: "new", value: null, nextDate: "", nextAction: "",
                      notes: "", clientId: "", exchanges: [] } : prospect(r.id);
    if (!p) { view.innerHTML = '<div class="espace-head"><h2>' + L("pros.notFound") + '</h2></div><p><a href="#/prospects">' + L("pros.back") + "</a></p>"; return; }
    var docs = data.documents, stage = E.prospectStage(p, docs), min = E.minStage(p, docs), rank = E.OPEN_STAGES.concat(["won"]);
    var stageOptions = Object.keys(E.STAGE_LABELS).map(function (s) {
      var locked = s !== "lost" && rank.indexOf(s) < rank.indexOf(min);
      return '<option value="' + s + '"' + (s === stage ? " selected" : "") + (locked ? " disabled" : "") + ">" + esc(E.STAGE_LABELS[s]) + "</option>";
    }).join("");
    var c = p.clientId ? client(p.clientId) : null, quotes = E.prospectQuotes(p, docs), last = E.lastContactFrom(p);
    var html = '<div class="espace-head"><h2>' + (isNew ? L("pros.newTitle") : esc(p.name)) + "</h2>" + (isNew ? "" : stageBadge(stage)) + "</div>" +
      '<form class="card espace-card" id="prospect-form" novalidate><div class="fields">' +
      field("name", L("pros.f.name"), p.name, { required: true, placeholder: L("pros.f.namePlaceholder"), hint: L("pros.f.nameHint") }) +
      field("contact", L("pros.f.contact"), p.contact, { half: true, placeholder: L("pros.f.contactPlaceholder") }) +
      field("pro", L("pros.f.type"), p.pro === false ? "0" : "1", { options: [["1", L("pros.pro")], ["0", L("pros.person")]], half: true }) +
      field("email", L("profile.email"), p.email, { type: "email", half: true }) +
      field("phone", L("profile.phone"), p.phone, { type: "tel", half: true }) +
      field("source", L("pros.f.source"), p.source, { half: true, list: "prospect-sources", placeholder: SOURCES[0] }) +
      '<datalist id="prospect-sources">' + SOURCES.map(function (s) { return '<option value="' + esc(s) + '">'; }).join("") + "</datalist>" +
      '<div class="field"><label for="ep-stage">' + L("pros.f.stage") + '</label><select id="ep-stage" name="stage"' + (min !== "new" ? ' aria-describedby="ep-stage-hint"' : "") + ">" + stageOptions + "</select>" +
      (min !== "new" ? '<span class="hint" id="ep-stage-hint">' + esc(min === "talks" ? L("pros.f.minTalks") :
        min === "quote" ? L("pros.f.minQuote") : L("pros.f.minWon")) + "</span>" : "") + "</div>" +
      field("value", L("pros.f.value"), p.value === null || p.value === undefined ? "" : rateText(p.value), { half: true, inputmode: "decimal", placeholder: L("pros.f.valuePlaceholder"),
        hint: L("pros.f.valueHint") }) +
      field("nextDate", L("pros.f.nextDate"), p.nextDate, { type: "date", half: true }) +
      field("nextAction", L("pros.f.nextAction"), p.nextAction, { half: true, placeholder: L("pros.f.nextActionPlaceholder") }) +
      field("notes", L("pros.f.notes"), p.notes, { textarea: true }) +
      '</div><div id="prospect-optout" class="notice warn" role="alert" hidden></div><p class="form-error" id="prospect-error" role="alert" hidden></p>' +
      '<div class="espace-actions"><button type="submit" class="btn btn-primary">' + (isNew ? L("pros.create") : L("common.save")) + "</button>" +
      '<a class="btn btn-ghost" href="#/prospects">' + L("common.cancel") + "</a></div></form>";
    if (!isNew) {
      html += '<section class="card espace-card"><h3>' + L("pros.x.title") + '</h3><p class="small muted" id="prospect-last">' + (last ? L("pros.x.last", { date: day(last) })
          : L("pros.x.noLast")) + (stage === "won" || !retentionYears() ? "" : L("pros.x.retention", { years: retentionYears(),
          from: last ? L("pros.x.fromLast") : L("pros.x.fromCreation", { date: day(String(p.createdAt || "").slice(0, 10)) }) })) + "</p>" +
        ((p.exchanges || []).length ? '<ul class="time-due exchanges">' + p.exchanges.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).map(function (x) {
          return '<li><span class="dl-main"><b>' + day(x.date) + " · " + (x.from === "them" ? L("pros.x.fromThem") : L("pros.x.fromMe")) + '</b><span class="small">' + esc(x.text) + "</span></span>" +
            '<button type="button" class="btn btn-ghost btn-sm" data-exchange="' + esc(x.id) + '" aria-label="' + L("pros.x.removeLabel", { date: day(x.date) }) + '">' + L("line.remove") + "</button></li>";
        }).join("") + "</ul>" : "") +
        '<form id="exchange-form" class="espace-noprint" novalidate><div class="fields">' +
        field("xdate", L("ledger.col.date"), TODAY, { type: "date", half: true }) +
        field("xfrom", L("pros.x.who"), "me", { options: [["me", L("pros.x.me")], ["them", L("pros.x.them")]], half: true,
          hint: L("pros.x.whoHint") }) +
        field("xtext", L("pros.x.summary"), "", { placeholder: L("pros.x.summaryPlaceholder") }) +
        '</div><p class="form-error" id="exchange-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-ghost">' + L("pros.x.add") + "</button></div></form></section>" +
        '<section class="card espace-card"><h3>' + L("pros.c.title") + "</h3>" +
        (c ? "<p>" + L("pros.c.clientHtml", { href: "#/clients/" + esc(c.id), name: esc(c.name) }) + "</p>"
          : '<p class="small muted">' + L("pros.c.intro") + '</p><div class="espace-actions">' +
            '<a class="btn btn-ghost" href="#/clients/nouveau?piste=' + esc(p.id) + '">' + L("pros.c.create") + "</a></div>" +
            (data.clients.some(function (x) { return !x.archived; }) ? '<div class="fields link-client"><div class="field"><label for="pr-client">' + L("pros.c.existing") + '</label><select id="pr-client">' +
              options([["", L("pros.c.choose")]].concat(data.clients.filter(function (x) { return !x.archived; })
                .sort(function (a, b) { return String(a.name).localeCompare(String(b.name), OF.locale); }).map(function (x) { return [x.id, x.name]; })), "") +
              '</select></div><div class="field"><button type="button" class="btn btn-ghost" id="pr-link">' + L("pros.c.link") + "</button></div></div>" : "")) +
        '<div class="espace-actions"><a class="btn btn-primary" href="' + (c ? "#/documents/nouveau?type=devis&client=" + esc(c.id) + "&piste=" + esc(p.id)
          : "#/clients/nouveau?piste=" + esc(p.id) + "&devis=1") + '">' + L("pros.c.quote") + "</a></div>" +
        (quotes.length ? docTable(quotes) : "") + "</section>" +
        '<section class="card espace-card"><h3>' + (p.pro === false ? L("pros.rulesForPerson") : L("pros.rulesForPro")) + "</h3>" + (UI.prospects ? UI.prospects.rules(p.pro !== false) : "") +
        '<div class="espace-actions">' + (p.email ? '<a class="btn btn-ghost" href="mailto:' + esc(encodeURIComponent(p.email).replace(/%40/g, "@")) + '">' + L("pros.write") + "</a>" : "") +
        '<button type="button" class="btn btn-ghost" id="prospect-optout-btn">' + L("pros.optout") + "</button>" +
        '<button type="button" class="btn btn-ghost" id="prospect-delete">' + L("line.remove") + '</button></div><p class="form-error" id="prospect-action-error" role="alert" hidden></p></section>';
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
        persist(isNew ? L("pros.created") : L("pros.saved")).then(function () { location.hash = isNew ? "#/prospects/" + p.id : "#/prospects"; });
      };
      // Liste d'opposition : vérifiée à la création et quand le nom, l'email ou le téléphone changent.
      if (confirmed || !data.optouts.length || (!isNew && identity(next) === identity(p))) { save(); return; }
      optoutHashes(next).then(function (hashes) {
        var matches = optoutMatches(hashes);
        if (!matches.length) { save(); return; }
        var direct = matches.filter(function (m) { return m.kinds.some(function (k) { return k !== "n"; }); });
        var since = matches.map(function (m) { return m.optout.date; }).sort()[0];
        notice.innerHTML = "<p>" + (direct.length ? (direct[0].kinds.indexOf("e") > -1 ? L("pros.oo.sameEmail", { date: day(since) }) : L("pros.oo.samePhone", { date: day(since) }))
          : L("pros.oo.sameName", { date: day(since) })) + "</p>" +
          '<div class="espace-actions"><button type="button" class="btn btn-ghost btn-sm" id="optout-save">' + L("pros.oo.saveAnyway") + "</button>" +
          (direct.length ? '<button type="button" class="btn btn-ghost btn-sm" id="optout-remove">' + L("pros.oo.remove") + "</button>" : "") + "</div>";
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
        showError("prospect-error", L("pros.oo.noCrypto"));
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
      persist(L("pros.x.added")).then(function () { render(true); $("ep-xtext").focus(); });
    });
    view.querySelectorAll("[data-exchange]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm(L("pros.x.confirmDelete"))) return;
        p.exchanges = p.exchanges.filter(function (x) { return x.id !== b.getAttribute("data-exchange"); });
        p.updatedAt = now();
        persist(L("pros.x.deleted")).then(function () { render(true); $("ep-xtext").focus(); });
      });
    });
    if ($("pr-link")) $("pr-link").addEventListener("click", function () {
      var id = $("pr-client").value;
      if (!id) { $("pr-client").focus(); return; }
      p.clientId = id;
      p.updatedAt = now();
      persist(L("pros.c.linked", { name: clientName(id) })).then(function () { render(true); });
    });
    $("prospect-delete").addEventListener("click", function () {
      if (!confirm(L("pros.confirmDelete", { name: p.name }))) return;
      data.prospects = data.prospects.filter(function (x) { return x.id !== p.id; });
      persist(L("pros.deleted", { name: p.name })).then(function () { location.hash = "#/prospects"; });
    });
    $("prospect-optout-btn").addEventListener("click", function () {
      if (!confirm(L("pros.oo.confirm", { name: p.name }))) return;
      optoutHashes(p).then(function (hashes) {
        var stamp = now();
        data.optouts.push({ id: S.uid(), date: TODAY, hashes: hashes, createdAt: stamp, updatedAt: stamp });
        data.prospects = data.prospects.filter(function (x) { return x.id !== p.id; });
        persist(L("pros.oo.saved", { name: p.name })).then(function () { location.hash = "#/prospects"; });
      }, function () {
        showError("prospect-action-error", L("pros.oo.noCryptoHash"));
      });
    });
  }

  // ----- Trésorerie (documentation/39-tresorerie.md ; version 2, § 7) ----------------------------------------------

  var CHARGE_EVERY = [["month", L("tr.every.month")], ["quarter", L("tr.every.quarter")], ["year", L("tr.every.year")], ["once", L("tr.every.once")]];
  var CHARGE_FLOW = [["out", L("tr.flow.out")], ["in", L("tr.flow.in")]];
  var HORIZONS = [3, 6, 12];
  function treasuryInput(over) {
    return Object.assign({ documents: data.documents, charges: data.charges, expenses: data.expenses, profile: profile(), rules: R, events: CAL,
                           today: TODAY, months: 6 }, over || {});
  }
  var signed = function (n) { return (n < 0 ? "−" : "+") + OF.money(Math.abs(n)).replace(/^-/, ""); };
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
    return '<p class="notice warn espace-noprint">' +
      (under ? L("tr.remind.zeroHtml", { date: day(under.date) }) : L("tr.remind.thresholdHtml", { amount: esc(money(limit)), date: day(below.date) })) +
      '. <a href="#/tresorerie">' + L("tr.remind.see") + "</a></p>";
  }

  function chargeFields(c) {
    var flow = c.flow === "in" ? "in" : "out";
    return field("label", L("tr.c.label"), c.label, { required: true, placeholder: flow === "in" ? L("tr.c.labelInPlaceholder") : L("tr.c.labelOutPlaceholder") }) +
      field("flow", L("tr.c.flow"), flow, { options: CHARGE_FLOW, half: true }) +
      field("amount", L("ledger.col.amount"), rateText(c.amount), { half: true, inputmode: "decimal", placeholder: L("tr.c.amountPlaceholder"), hint: L("tr.c.amountHint") }) +
      field("every", L("tr.c.every"), c.every || "month", { options: CHARGE_EVERY, half: true }) +
      field("start", c.every === "once" ? L("tr.c.date") : L("tr.c.next"), c.start || "", { type: "date", half: true }) +
      field("end", L("tr.c.end"), c.end || "", { type: "date", half: true, hint: L("tr.c.endHint") }) +
      (UI.treasury && UI.treasury.revenueLabel ? '<div class="field full charge-revenue"' + (flow === "in" ? "" : " hidden") + '><label class="check"><input type="checkbox" id="ep-revenue" name="revenue"' +
        (c.revenue ? " checked" : "") + "><span>" + UI.treasury.revenueLabel() + "</span></label></div>" : "");
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
      var revenue = form.querySelector(".charge-revenue");
      if (revenue) revenue.hidden = f.flow.value !== "in";
      form.querySelector('label[for="ep-start"]').textContent = once ? L("tr.c.date") : L("tr.c.next");
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
  var lateText = function (n) { return n === 1 ? L("tr.late.one") : L("tr.late.many", { n: n }); };
  var KIND_LABELS = { receipt: L("tr.kind.receipt"), refund: L("tr.kind.refund"), charge: L("tr.kind.charge"), planned: L("tr.kind.planned") };
  /** Libellé d'un flux prévu : communs, ou du pays (France : Urssaf, TVA). */
  var kindLabel = function (k) { return KIND_LABELS[k] || (UI.treasury && UI.treasury.kinds[k]) || ""; };
  var AGING_CLS = { notDue: "is-ok", d30: "is-near", d60: "is-warn", d90: "is-hot", more: "is-bad" };
  var drawCharts = null;

  function viewTreasury(r) {
    var p = profile(), params = r.params || {}, TS = UI.treasury && UI.treasury.settings;   // réglages propres au pays (facultatifs)
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
    var due = UI.treasury ? UI.treasury.owed(o) : { lines: [], notes: [] }, owedLines = due.lines, notes = due.notes;

    var lowBad = curve && curve.low.balance < limit, below = firstBelow(curve, limit);
    var kpis = '<div class="kpis kpis-4">' +
      tile(L("tr.kpi.balance"), hasBalance ? esc(money(f.start)) : "–", hasBalance ? L("tr.kpi.balanceAt", { date: day(p.cashDate || TODAY) }) + (stale ? L("tr.kpi.stale") : "") :
        '<a href="#tr-settings">' + L("tr.kpi.setBalance") + "</a>", stale ? "is-warn" : "") +
      tile(L("tr.kpi.available"), available === null ? "–" : esc(money(available)), L("tr.kpi.availableSub", { amount: esc(money(o.total)) }), available !== null && available < 0 ? "is-bad" : "is-brand") +
      tile(L("tr.kpi.low"), curve ? esc(money(curve.low.balance)) : "–", curve ? (curve.low.date === TODAY ? L("tr.kpi.today") : L("tr.kpi.on", { date: day(curve.low.date) })) +
        (lowBad ? (curve.low.balance < 0 ? L("tr.kpi.belowZero") : L("tr.kpi.belowThreshold")) : "") : L("tr.kpi.needBalance"), lowBad ? "is-bad" : "") +
      tile(L("tr.kpi.safe"), safe === null ? "–" : esc(money(safe)), safe === null ? L("tr.kpi.needBalance") :
        L("tr.kpi.safeSub", { floor: limit ? L("tr.kpi.yourThreshold", { amount: esc(money(limit)) }) : L("tr.kpi.zero"), until: esc(E.period(f.until.slice(0, 7)).label) })) +
      tile(L("tr.kpi.receivable"), esc(money(ag.total)), ag.late ? L("tr.kpi.receivableLate", { amount: esc(money(ag.late)), what: countText(ag.lateCount, L("count.invoice.one"), L("count.invoice.many")) })
        : L("tr.kpi.noneLate"), ag.late ? "is-warn" : "") +
      tile(L("tr.kpi.delay"), stats.count ? L("tr.kpi.days", { n: esc(OF.fmt(stats.avgDays)) }) : "–", stats.count ? L("tr.kpi.delaySub", { late: esc(OF.fmt(stats.avgLate)),
        pct: Math.round(stats.onTime * 100) }) : L("tr.kpi.noPaid")) +
      tile(L("tr.kpi.runway"), run === null ? "–" : L("tr.kpi.months", { n: esc(OF.fmt(run)) }), run === null ? (monthly ? L("tr.kpi.needBalance") : '<a href="#tr-charges">' + L("tr.kpi.noteCharges") + "</a>") :
        L("tr.kpi.runwaySub", { amount: esc(money(monthly)) }), run !== null && run < 2 ? "is-warn" : "") +
      tile(L("tr.kpi.breakEven"), be === null ? "–" : esc(money(be)), be === null ? (UI.treasury ? UI.treasury.breakEvenNone() : "") :
        L("tr.kpi.breakEvenSub", { amount: esc(money(avgIn)) }) + (active.length ? L("tr.kpi.overMonths", { n: active.length }) : ""), be !== null && avgIn < be ? "is-warn" : "") + "</div>";

    var tools = '<div class="tr-tools espace-noprint"><div class="seg" role="group" aria-label="' + L("tr.horizon") + '">' + HORIZONS.map(function (h) {
        return '<a class="tab" href="' + url(h, scenario) + '"' + (h === months ? ' aria-current="true"' : "") + ">" + L("tr.kpi.months", { n: h }) + "</a>";
      }).join("") + '</div><div class="seg" role="group" aria-label="' + L("tr.scenario") + '">' +
      '<a class="tab" href="' + url(months, "prevu") + '"' + (scenario === "prevu" ? ' aria-current="true"' : "") + ">" + L("tr.planned") + "</a>" +
      '<a class="tab" href="' + url(months, "prudent") + '"' + (scenario === "prudent" ? ' aria-current="true"' : "") + ">" + L("tr.prudent") + "</a></div>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="tr-csv">' + L("tr.exportCsv") + "</button></div>";

    var scenarioNote = scenario === "prudent" ? L("tr.scenarioPrudent") : L("tr.scenarioPlanned");
    var balanceCard = '<section class="card espace-card"><div class="card-head"><h3>' + L("tr.balance.title") + '</h3><span class="small muted">' + esc(scenarioNote) + "</span></div>" +
      (below ? '<p class="notice warn">' + (below.balance < 0 ? L("tr.balance.belowZeroHtml", { date: day(below.date) }) : L("tr.balance.belowThresholdHtml", { date: day(below.date) })) + "</p>" : "") +
      (curve ? '<div class="chart" data-chart="balance"></div>' + OF.charts.legend([{ cls: "is-main", label: scenario === "prudent" ? L("tr.prudent") : L("tr.planned") },
          { cls: "is-alt", label: scenario === "prudent" ? L("tr.planned") : L("tr.prudent") }].concat(limit ? [{ cls: "is-threshold", label: L("tr.thresholdLabel", { amount: money(limit) }) }] : [])) +
        OF.charts.table(L("tr.balance.tableTitle"), [L("common.month"), L("tr.endBalance"), scenario === "prudent" ? L("tr.planned") : L("tr.prudent")], f.months.map(function (m, i) {
          return [m.label, money(m.balance), money(g.months[i].balance)];
        })) : '<p class="muted">' + L("tr.balance.needHtml") + "</p>") + "</section>";

    var groups = past.map(function (m) { return { key: m.key, label: m.label, values: [m.in, m.out], future: false }; }).concat(f.months.map(function (m) {
      return { key: m.key, label: m.label, values: [m.in, m.out], future: true };
    }));
    var flowCard = '<section class="card espace-card"><div class="card-head"><h3>' + L("tr.flows.title") + '</h3><span class="small muted">' + L("tr.flows.intro") + "</span></div>" +
      '<div class="chart" data-chart="flows"></div>' + OF.charts.legend([{ cls: "is-in", label: L("tr.in") }, { cls: "is-out", label: L("tr.out") }, { cls: "is-future", label: L("tr.futureHatched") }]) +
      OF.charts.table(L("tr.flows.title"), [L("common.month"), L("tr.in"), L("tr.out"), L("tr.gap")], groups.map(function (gr) {
        return [gr.label + (gr.future ? L("tr.plannedSuffix") : ""), money(gr.values[0]), money(gr.values[1]), signed(gr.values[0] - gr.values[1])];
      })) + "</section>";

    var owedCard = '<section class="card espace-card"><h3>' + L("tr.owed.title") + "</h3>" +
      (owedLines.length ? '<ul class="small treasury-owed">' + owedLines.join("") + "</ul>" : '<p class="small muted">' + L("tr.owed.none") + "</p>") +
      (notes.length ? '<p class="small muted">' + notes.map(esc).join(" ") + "</p>" : "") + "</section>";

    var agingCard = '<section class="card espace-card"><div class="card-head"><h3>' + L("tr.aging.title") + '</h3><span class="small muted">' + L("tr.aging.total", { amount: esc(money(ag.total)) }) + "</span></div>" +
      (ag.total ? '<div class="chart" data-chart="aging"></div>' + '<ul class="ch-legend ch-legend-values">' + ag.buckets.map(function (b) {
          return '<li><span class="ch-key ' + AGING_CLS[b.key] + '" aria-hidden="true"></span>' + esc(b.label) + L("common.colon") + "<b>" + esc(money(b.amount)) + "</b>" + (b.count ? " (" + b.count + ")" : "") + "</li>";
        }).join("") + "</ul>" +
        (ag.items.filter(function (x) { return x.lateDays > 0; }).length ? "<h4>" + L("tr.aging.late") + '</h4><ul class="time-due">' + ag.items.filter(function (x) { return x.lateDays > 0; }).slice(0, 8).map(function (x) {
          var who = (x.doc.snapshot && x.doc.snapshot.client && x.doc.snapshot.client.name) || "";
          return '<li><span class="dl-main"><a href="#/documents/' + esc(x.doc.id) + '"><b>' + esc(x.doc.number) + "</b></a>" + '<span class="small muted">' + esc(who) +
            L("tr.aging.due", { date: day(x.due) }) + " · " + lateText(x.lateDays) + '</span></span><span class="dl-side"><b>' + esc(money(x.amount)) +
            '</b><a class="small" href="#/documents/' + esc(x.doc.id) + '">' + L("tr.aging.remind") + "</a></span></li>";
        }).join("") + "</ul>" + (UI.treasury ? '<p class="small muted">' + UI.treasury.agingNote() + "</p>" : "") : "") :
        '<p class="small muted">' + L("tr.aging.none") + "</p>") +
      (quotes.count ? '<p class="small">' + L("tr.aging.quotesHtml", { amount: esc(money(quotes.amount)), n: quotes.count }) + " " +
        '<a href="#/documents?filtre=devis">' + L("tr.aging.seeQuotes") + "</a></p>" : "") + "</section>";

    var soon = f.items.filter(function (x) { return x.date <= INV.addDays(TODAY, 30); });
    var upcomingCard = '<section class="card espace-card"><h3>' + L("tr.soon.title") + "</h3>" + (soon.length ? '<ul class="treasury-upcoming">' + soon.map(function (x) {
        return '<li><span class="c-date">' + day(x.date) + '</span><span class="tr-label">' + esc(x.label) + '<span class="tr-kind">' + esc(kindLabel(x.kind)) +
          (x.late ? L("tr.lateSuffix") : "") + (x.delay ? L("tr.soon.delayed", { n: x.delay }) : "") + '</span></span><b class="num' + (x.amount < 0 ? " is-out" : " is-in") + '">' + esc(signed(x.amount)) + "</b></li>";
      }).join("") + "</ul>" : '<p class="small muted">' + L("tr.soon.none") + "</p>") + "</section>";

    var monthsCard = '<section class="card espace-card"><h3>' + L("tr.months.title") + "</h3>" +
      '<table class="ledger treasury-table"><thead><tr><th>' + L("common.month") + '</th><th class="num">' + L("tr.in") + '</th><th class="num">' + L("tr.out") +
      '</th><th class="num">' + L("tr.endBalance") + "</th></tr></thead><tbody>" +
      f.months.map(function (m) {
        return '<tr' + (m.balance !== null && m.balance < 0 ? ' class="is-negative"' : "") + '><td class="c-date">' + esc(m.label) + '</td><td class="num" data-label="' + L("tr.in") + '">' + esc(money(m.in)) +
          '</td><td class="num" data-label="' + L("tr.out") + '">' + esc(money(m.out)) + '</td><td class="num" data-label="' + L("tr.endBalance") + '">' + (m.balance === null ? "–" : esc(money(m.balance))) + "</td></tr>";
      }).join("") + "</tbody></table>" +
      f.months.filter(function (m) { return m.items.length; }).map(function (m) {
        return '<details class="treasury-month"><summary>' + L("tr.months.detail", { month: esc(m.label) }) + "</summary><ul>" + m.items.map(function (x) {
          return '<li><span class="c-date">' + day(x.date) + "</span><span>" + esc(x.label) + (x.late ? L("tr.lateSuffix") : "") + '</span><b class="num">' + esc(signed(x.amount)) + "</b></li>";
        }).join("") + "</ul></details>";
      }).join("") +
      (f.calendarShort ? '<p class="small muted">' + L("tr.months.calendarShort") + "</p>" : "") + "</section>";

    var chargesCard = '<section class="card espace-card" id="tr-charges"><h3>' + L("tr.charges.title") + "</h3>" +
      '<p class="small muted">' + L("tr.charges.intro") + "</p>" +
      (data.charges.length ? '<ul class="time-due charges-list">' + data.charges.slice().sort(function (a, b) { return String(a.label).localeCompare(String(b.label), OF.locale); }).map(function (c) {
        var next = E.chargeDates(c, TODAY, "9999-12-31")[0], isInFlow = c.flow === "in";
        return '<li><span class="dl-main"><a href="#/tresorerie/' + esc(c.id) + '"><b>' + esc(c.label) + '</b></a><span class="small muted">' + (isInFlow ? (c.revenue ? L("tr.charges.inRevenue") : L("tr.charges.in")) : L("tr.charges.out")) +
          " · " + esc(E.CHARGE_LABELS[c.every] || "") + (next ? (c.every === "once" ? L("tr.charges.on", { date: day(next) }) : L("tr.charges.nextOn", { date: day(next) })) : L("tr.charges.ended")) +
          '</span></span><span class="dl-side"><b class="' + (isInFlow ? "is-in" : "is-out") + '">' + esc(signed(isInFlow ? Number(c.amount) : -Number(c.amount))) + "</b></span></li>";
      }).join("") + "</ul>" : '<p class="small muted">' + L("tr.charges.none") + "</p>") +
      '<form id="charge-form" class="espace-noprint" novalidate><h4>' + L("tr.charges.add") + '</h4><div class="fields">' + chargeFields({ every: "month", start: TODAY, flow: "out" }) + "</div>" +
      '<p class="form-error" id="charge-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-ghost">' + L("tr.charges.addButton") + "</button></div></form></section>";

    var settingsCard = '<form class="card espace-card espace-noprint" id="cash-form" novalidate><h3 id="tr-settings" tabindex="-1">' + L("tr.s.title") + '</h3><div class="fields">' +
      field("cashBalance", L("tr.s.balance"), hasBalance ? rateText(f.start) : "", { half: true, inputmode: "decimal", placeholder: L("tr.s.balancePlaceholder"),
        hint: L("tr.s.balanceHint") }) +
      field("cashDate", L("tr.s.date"), p.cashDate || TODAY, { type: "date", half: true }) +
      field("cashThreshold", L("tr.s.threshold"), rateText(p.cashThreshold), { half: true, inputmode: "decimal", placeholder: "0",
        hint: L("tr.s.thresholdHint") }) +
      (TS ? TS.fields(p) : "") +
      '</div><p class="form-error" id="cash-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-primary">' + L("common.save") + "</button></div>" +
      (stale ? '<p class="notice warn">' + L("tr.s.stale", { date: day(p.cashDate) }) + "</p>" : "") + "</form>";

    var hyp = UI.treasury ? UI.treasury.assumptions(o, f) : { main: "", last: "" };
    var assumptions = '<section class="card espace-card"><h3>' + L("tr.a.title") + '</h3><ul class="small prospect-rules">' +
      "<li>" + L("tr.a.basis") + esc(scenarioNote.charAt(0).toLowerCase() + scenarioNote.slice(1)) + "</li>" +
      hyp.main + "<li>" + L("tr.a.delay") + "</li>" + hyp.last + "</ul></section>";

    view.innerHTML = '<div class="espace-head"><h2>' + L("tr.title") + "</h2>" + tools + "</div>" + kpis +
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
          title: L("tr.chart.balanceTitle", { month: E.period(f.until.slice(0, 7)).label }),
          desc: L("tr.chart.balanceDesc", { low: money(curve.low.balance), date: day(curve.low.date), end: money(curve.end) }) });
      }
      el = box("flows");
      if (el) {
        el.innerHTML = OF.charts.bars({ width: width(el), groups: groups, series: [{ name: L("tr.in"), cls: "is-in" }, { name: L("tr.out"), cls: "is-out" }],
          title: L("tr.flows.title"), desc: L("tr.chart.flowsDesc", { n: months }) });
      }
      el = box("aging");
      if (el) {
        el.innerHTML = OF.charts.stack({ width: width(el), parts: ag.buckets.map(function (b) { return { label: b.label, value: b.amount, cls: AGING_CLS[b.key] }; }),
          title: L("tr.chart.agingTitle"), desc: ag.buckets.map(function (b) { return L("tr.chart.agingPart", { label: b.label, amount: money(b.amount) }); }).join(L("tr.chart.sep")) + "." });
      }
    };
    drawCharts();

    $("tr-csv").addEventListener("click", function () {
      OF.download("﻿" + E.forecastCSV(f), L("tr.file", { date: TODAY }), "text/csv;charset=utf-8");
    });
    var cash = $("cash-form");
    cash.addEventListener("submit", function (e) {
      e.preventDefault();
      var f2 = cash.elements, raw = f2.cashBalance.value.trim(), bal = raw ? OF.num(raw) : null, date = f2.cashDate.value;
      var thRaw = f2.cashThreshold.value.trim(), th = thRaw ? OF.num(thRaw) : null;
      var error = raw && !isFinite(bal) ? ["cashBalance", L("tr.s.errBalance")]
        : !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > TODAY ? ["cashDate", L("tr.s.errDate")]
        : thRaw && !(isFinite(th) && th >= 0) ? ["cashThreshold", L("tr.s.errThreshold")]
        : TS ? TS.check(f2) : null;
      ["cashBalance", "cashDate", "cashThreshold"].concat(TS ? TS.names : []).forEach(function (k) {
        if (f2[k]) f2[k].setAttribute("aria-invalid", String(!!error && error[0] === k));
      });
      showError("cash-error", error ? error[1] : "");
      if (error) { f2[error[0]].focus(); return; }
      var pr = data.profile;
      pr.cashBalance = bal === null ? null : Math.round(bal * 100) / 100;
      pr.cashDate = date;
      pr.cashThreshold = th === null ? null : Math.round(th * 100) / 100;
      if (TS) TS.save(f2, pr);
      pr.updatedAt = now();
      persist(L("tr.s.saved")).then(function () { render(true); });
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
      persist(c.flow === "in" ? L("tr.charges.addedIn", { label: c.label }) : L("tr.charges.added", { label: c.label })).then(function () { render(true); $("ep-label").focus(); });
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
    if (!c) { view.innerHTML = '<div class="espace-head"><h2>' + L("tr.charges.notFound") + '</h2></div><p><a href="#/tresorerie">' + L("tr.back") + "</a></p>"; return; }
    view.innerHTML = '<div class="espace-head"><h2>' + esc(c.label) + '</h2></div><form class="card espace-card" id="charge-form" novalidate><div class="fields">' + chargeFields(c) + "</div>" +
      '<p class="form-error" id="charge-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-primary">' + L("common.save") + "</button>" +
      '<a class="btn btn-ghost" href="#/tresorerie">' + L("common.cancel") + '</a><button type="button" class="btn btn-ghost" id="charge-delete">' + L("line.remove") + "</button></div></form>";
    var form = $("charge-form");
    bindChargeForm(form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var next = readCharge(form);
      if (!showChargeErrors(form, next, "charge-error")) return;
      next.amount = Math.round(next.amount * 100) / 100;
      Object.assign(c, next, { updatedAt: now() });
      persist(L("tr.charges.saved")).then(function () { location.hash = "#/tresorerie"; });
    });
    $("charge-delete").addEventListener("click", function () {
      if (!confirm(L("tr.charges.confirmDelete", { label: c.label }))) return;
      data.charges = data.charges.filter(function (x) { return x.id !== c.id; });
      persist(L("tr.charges.deleted")).then(function () { location.hash = "#/tresorerie"; });
    });
  }

  function viewSettings() {
    var last = data.settings.lastExport;
    view.innerHTML = '<div class="espace-head"><h2>' + L("set.title") + "</h2></div>" +
      (data.profile ? profileForm(profile(), false) : '<p class="notice">' + L("set.noProfileHtml") + "</p>") +
      '<section class="card espace-card"><h3>' + L("set.backup") + "</h3>" +
      "<p>" + (S.mode() === "local" ? L("set.storedLocal") : L("set.stored")) + "</p>" +
      '<p class="small muted">' + L("set.lastBackup", { date: last ? day(last.slice(0, 10)) : L("set.never") }) + "</p>" +
      '<div class="espace-actions"><button type="button" class="btn btn-primary btn-sm" id="export-btn">' + L("set.export") + "</button></div>" +
      "<h4>" + L("set.restore") + "</h4>" + importControl() +
      "<h4>" + L("set.wipe") + '</h4><p class="small muted">' + L("set.wipeIntro") + "</p>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="wipe-btn">' + L("set.wipeButton") + "</button></section>";
    if (data.profile) bindProfileForm(false);
    bindImport();
    $("export-btn").addEventListener("click", function () {
      data.settings.lastExport = now();
      persist(L("set.exported")).then(function () {
        OF.download(JSON.stringify(data, null, 1), L("set.file", { date: TODAY }), "application/json");
        render(true);
      });
    });
    $("wipe-btn").addEventListener("click", function () {
      if (!confirm(L("set.confirmWipe"))) return;
      data = S.empty();
      persist(L("set.wiped")).then(function () { location.hash = "#/"; render(); });
    });
  }

  // ----- Module d'écrans du pays (documentation/60, § 3.2, D90) ------------------------------------------------
  // Ce que l'Espace prête au module de la section (tools/espace-<pays>-ui.js) ; les données par une fonction, car l'objet
  // data est remplacé à chaque chargement.
  var ctx = { $: $, CAL: CAL, longDay: longDay, L: L, esc: esc, money: money, day: day, percent: percent, DEC: DEC,
              field: field, options: options, kpi: kpi, countText: countText, showError: showError, persist: persist,
              now: now, isMicro: isMicro, profile: profile, view: view, amountText: amountText, E: E, R: R, S: S,
              OF: OF, TODAY: TODAY, YEAR: YEAR, TERMS: TERMS, isMixed: isMixed, ST: ST, barList: barList, pct: pct,
              charts: function (fn) { drawCharts = fn; fn(); }, FMT: FMT, client: client, parties: parties,
              docLabel: docLabel, loadLazy: loadLazy, rateText: rateText, render: function (keepFocus) { render(keepFocus); },
              data: function () { return data; } };
  var UI = MOD(ctx);

  // ----- Démarrage -----------------------------------------------------------------------------------

  // Lien vers une partie de l'écran (« #tr-settings », sans « / ») : défilement et focus sur la cible, sans changer
  // d'écran (sinon le routeur lirait « tr-settings » comme un écran inconnu et afficherait le tableau de bord).
  view.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null, href = a ? a.getAttribute("href") : "";
    if (!a || href.length < 2 || href.charAt(1) === "/") return;
    var target = document.getElementById(href.slice(1));
    if (!target || !view.contains(target)) return;
    e.preventDefault();
    if (!/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName) && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.scrollIntoView({ block: "start" });
    target.focus({ preventScroll: true });
  });
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
