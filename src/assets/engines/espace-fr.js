/*
 * Moteur : Espace entrepreneur (France). Fonctions pures sur les données de l'Espace (voir documentation/09).
 * Numérotation et émission, statuts, encaissements, livre des recettes, déclaration Urssaf, plafonds ; dépenses,
 * temps passé, prospects et trésorerie (documentation/36 à 39).
 * Les montants des documents viennent du moteur de facture commun (OFE.invoiceFR).
 */
(function (root, factory) {
  // Textes du moteur (documentation/60, § 3.1 et § 3.2, D88) : dictionnaire de la langue de la section, chargé avant le
  // moteur dans la page (textes communs et textes de la France) ; dans Node (tests, scripts), les deux fichiers français.
  var dicts = root.OF_ESPACE_TEXTS || { fr: Object.assign({}, require("../tools/espace-texts-fr.js").OF_ESPACE_TEXTS.fr,
    require("../tools/espace-fr-texts-fr.js").OF_ESPACE_TEXTS.fr) };
  var locale = (root.OF && root.OF.locale) || "fr";
  var texts = Object.assign({}, dicts.fr, dicts[locale.slice(0, 2)], dicts[locale]);
  var core = root.OFE && root.OFE.espaceCore ? root.OFE.espaceCore : require("./espace-core.js");
  var api = factory(root.OFE ? root.OFE.invoiceFR : require("./invoice-fr.js"), texts, core);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).espaceFR = api;
})(typeof self !== "undefined" ? self : this, function (INV, TX, CORE) {
  "use strict";
  /** Texte de la clé, avec les valeurs { nom: valeur } à la place des « {nom} » (même règle que tools/espace.js). */
  function L(key, vars) {
    var text = TX[key];
    if (text === undefined) { if (typeof console !== "undefined") console.error("Espace : texte manquant « " + key + " »"); return key; }
    return vars ? text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : text;
  }
  // Parties communes à tous les pays (engines/espace-core.js, documentation/60, § 3.1), reprises sous leur nom.
  var country = {};   // réglages du pays (préfixes, moyens de paiement), remplis plus bas et lus par le cœur à l'appel
  var C = CORE(INV, L, country);
  var cashed = C.cashed, period = C.period, cashHistory = C.cashHistory;   // communs (documentation/60, § 3.3)
  var EVERY = C.EVERY, CHARGE_LABELS = C.CHARGE_LABELS, isIn = C.isIn, addMonths = C.addMonths, monthStart = C.monthStart, monthEnd = C.monthEnd, chargeDates = C.chargeDates, chargeErrors = C.chargeErrors, expectedReceipts = C.expectedReceipts, balanceCurve = C.balanceCurve, safeAmount = C.safeAmount, daysBetween = C.daysBetween, avg = C.avg, paymentStats = C.paymentStats, AGING = C.AGING, aging = C.aging, monthlyCharges = C.monthlyCharges, runway = C.runway, quotesToInvoice = C.quotesToInvoice, FLOW_KINDS = C.FLOW_KINDS, forecastCSV = C.forecastCSV;
  var series = C.series, seriesPrefix = C.seriesPrefix, nextNumber = C.nextNumber, continuation = C.continuation, checkIssue = C.checkIssue, issue = C.issue, state = C.state, checkPayment = C.checkPayment, clientTotals = C.clientTotals, COPY_FIELDS = C.COPY_FIELDS, copyFrom = C.copyFrom, invoiceFromQuote = C.invoiceFromQuote, creditFromInvoice = C.creditFromInvoice, duplicate = C.duplicate;
  var nameKey = C.nameKey, listText = C.listText, labels = C.labels, round2 = C.round2, lastDay = C.lastDay, iso = C.iso, total = C.total, payments = C.payments,
      paidAmount = C.paidAmount, credited = C.credited, balance = C.balance, dueDate = C.dueDate, order = C.order, TIME_MAX = C.TIME_MAX,
      NBSP = C.NBSP, dec = C.dec, dayText = C.dayText, amountText = C.amountText, hasRate = C.hasRate, byDate = C.byDate, parseDuration = C.parseDuration,
      durationLabel = C.durationLabel, ISO_DAY = C.ISO_DAY, timerCheck = C.timerCheck, timerElapsed = C.timerElapsed, timerStart = C.timerStart,
      timerPause = C.timerPause, timerResume = C.timerResume, timerStop = C.timerStop, timerClock = C.timerClock, timerDuration = C.timerDuration,
      timeErrors = C.timeErrors, checkTime = C.checkTime, timeState = C.timeState, lastRate = C.lastRate, timeInvoiceLines = C.timeInvoiceLines,
      linesAmount = C.linesAmount, timeInvoice = C.timeInvoice, timeSummary = C.timeSummary, unbilledByClient = C.unbilledByClient,
      timeCSV = C.timeCSV, STAGE_LABELS = C.STAGE_LABELS, STAGE_RANK = C.STAGE_RANK, OPEN_STAGES = C.OPEN_STAGES, has = C.has, isDay = C.isDay,
      blank = C.blank, prospectErrors = C.prospectErrors, exchangeErrors = C.exchangeErrors, prospectQuotes = C.prospectQuotes,
      minStage = C.minStage, prospectStage = C.prospectStage, prospectClosedAt = C.prospectClosedAt, prospectValue = C.prospectValue,
      pipeline = C.pipeline, followUps = C.followUps, lastContactFrom = C.lastContactFrom, addYears = C.addYears, retentionDue = C.retentionDue,
      optoutKeys = C.optoutKeys, prospectsCSV = C.prospectsCSV;

  /** Catégories facultatives des dépenses (documentation/55, § 3) : liste fermée ; une dépense sans catégorie est « non classée ». */
  var EXPENSE_CATEGORIES = labels("eng.expenseCategory.", ["logiciels", "materiel", "deplacements", "locaux", "telecom", "formation",
    "soustraitance", "marchandises", "assurances", "banque", "autres"]);
  var METHODS = labels("eng.method.", ["virement", "carte", "cheque", "especes", "prelevement", "autre"]);
  var DEFAULT_PREFIXES = { facture: "F", devis: "D", avoir: "A" };
  country.prefixes = DEFAULT_PREFIXES;
  // Formats de la France pour les exports et les messages : 18/10/2026, 1,5, 1234,50 ; montant avec sa devise dans les
  // messages : 1234,50 € (documentation/60, § 3.1, lot 2c ; § 3.2, lot 3c).
  country.fmt = { day: function (d) { return d.split("-").reverse().join("/"); }, dec: function (n) { return String(n).replace(".", ","); },
                  amount: function (n) { return n.toFixed(2).replace(".", ","); },
                  money: function (n) { return n.toFixed(2).replace(".", ",") + " €"; } };
  country.methods = METHODS;
  country.locale = "fr";
  country.flowKinds = C.labels("eng.fr.flow.", ["urssaf", "vat"]);   // natures des flux d'impôt de la prévision (export)
  // Livre des encaissements et total des dépenses d'une période, lus par le cœur (encaissé, historique ; § 3.3).
  country.receipts = function (documents, from, to) { return ledger(documents, from, to); };
  country.expenseTotal = function (expenses, from, to) { return expenseRows(expenses, from, to).total; };
  // Codes pays ISO 3166-1 alpha-2 (249) et États membres de l'Union européenne (27) ; noms affichés par Intl.DisplayNames.
  var COUNTRIES = ("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
    "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE " +
    "GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP " +
    "KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF " +
    "NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO " +
    "SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW").split(" ");
  var EU_COUNTRIES = "AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK".split(" ");
  /** Pays proposés pour un client de l'UE (hors France) ou hors de l'UE. */
  function countries(place) {
    return COUNTRIES.filter(function (c) { return place === "eu" ? c !== "FR" && EU_COUNTRIES.indexOf(c) > -1 : EU_COUNTRIES.indexOf(c) < 0; });
  }


  // ----- Livre des recettes et encaissements ---------------------------------

  function nature(doc) {
    var line = (doc.lines || []).filter(function (l) { return String(l.desc || "").trim(); })[0];
    var n = line ? String(line.desc).trim() : INV.NATURES[doc.nature] || INV.NATURES.services;
    var more = (doc.lines || []).filter(function (l) { return String(l.desc || "").trim(); }).length - 1;
    return more > 0 ? n + " (+ " + more + ")" : n;
  }

  // ----- Activité mixte (documentation/53-activite-mixte.md) ----------------------------------------------

  /** Activités d'un profil en activité mixte : la vente et une activité de services ; null sinon. */
  function mixedActivities(profile, rules) {
    var a = profile && profile.activity, b = profile && profile.activity2, list = rules && rules.micro_activities;
    if (!list || !a || !b || a === b || !has(list, a) || !has(list, b)) return null;
    if (a === "vente") return { vente: a, services: b };
    if (b === "vente") return { vente: b, services: a };
    return null;
  }

  /**
   * Part HT des ventes d'un document : 1 (biens), 0 (services), part des lignes « biens » dans le total HT d'un document
   * mixte (une ligne sans nature compte avec les prestations, au taux de cotisations le plus élevé).
   */
  function goodsShare(doc) {
    if (doc.nature === "biens") return 1;
    if (doc.nature !== "mixte") return 0;
    var t = INV.compute(doc);
    return t.ht > 0 ? Math.min(1, t.split.goods / t.ht) : 0;
  }

  /** Part des ventes d'un montant encaissé ou remboursé (arrondie au centime ; le reste va aux prestations). */
  function goodsPart(doc, amount) { return round2(amount * goodsShare(doc)); }

  /**
   * Encaissements (factures) et remboursements (avoirs, en négatif), par date, entre deux dates incluses. Profil en
   * activité mixte (profile et rules donnés) : chaque ligne porte aussi sa part de ventes (goods) et de prestations.
   */
  function ledger(documents, from, to, profile, rules) {
    var rows = [], split = !!mixedActivities(profile, rules);
    documents.forEach(function (doc) {
      if (doc.status === "draft" || (doc.type !== "facture" && doc.type !== "avoir")) return;
      var who = (doc.snapshot && doc.snapshot.client && doc.snapshot.client.name) || "";
      payments(doc).forEach(function (p) {
        if ((from && p.date < from) || (to && p.date > to)) return;
        var row = { date: p.date, client: who, nature: nature(doc), method: METHODS[p.method] || p.method,
                    amount: doc.type === "avoir" ? -round2(Number(p.amount)) : round2(Number(p.amount)),
                    ref: doc.number, docId: doc.id, note: p.note || "" };
        if (split) { row.goods = goodsPart(doc, row.amount); row.services = round2(row.amount - row.goods); }
        rows.push(row);
      });
    });
    return rows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ref < b.ref ? -1 : 1); });
  }

  /**
   * Totaux du livre des recettes à la fin de chaque trimestre de l'année (BOFiP, BOI-BIC-DECLA-30-30, § 30 : le livre
   * est totalisé à la fin du trimestre et de l'année). Trimestres commencés à la date du jour, sauf ceux finis avant le
   * début d'activité ; un trimestre qui a des encaissements est toujours compté. open : trimestre en cours.
   */
  function ledgerQuarters(rows, year, today, startDate) {
    var out = [];
    for (var n = 1; n <= 4; n++) {
      var p = period(year + "-T" + n);
      var list = (rows || []).filter(function (r) { return r.date >= p.start && r.date <= p.end; });
      var started = today >= p.start && !(startDate && startDate > p.end);
      if (!list.length && !started) continue;
      var q = { key: p.key, label: p.label, start: p.start, end: p.end, count: list.length, open: today >= p.start && today <= p.end,
                total: round2(list.reduce(function (s, r) { return s + r.amount; }, 0)) };
      if ((rows || []).some(function (r) { return r.goods !== undefined; })) {
        q.goods = round2(list.reduce(function (s, r) { return s + (r.goods || 0); }, 0));
        q.services = round2(q.total - q.goods);
      }
      out.push(q);
    }
    return out;
  }

  // ----- Déclaration Urssaf -----------------------------------------------------

  /** Fin de l'ACRE : dernier jour du 3e trimestre civil qui suit celui du début d'activité. */
  function acreEnd(startDate) {
    var m = /^(\d{4})-(\d{2})-\d{2}$/.exec(startDate || "");
    if (!m) return "";
    var y = +m[1], qIndex = Math.floor((+m[2] - 1) / 3) + 3; // 3 trimestres après celui du début
    y += Math.floor(qIndex / 4);
    var endMonth = (qIndex % 4) * 3 + 3;
    return iso(y, endMonth, lastDay(y, endMonth));
  }

  /**
   * Taux de cotisations d'une période (ACRE si la période se termine avant la fin de l'ACRE), pour l'activité du profil
   * ou pour l'activité donnée. Activité mixte : formation professionnelle au plus élevé des taux des deux activités
   * (aucune règle publiée pour l'activité mixte : lecture la plus prudente, documentation/53).
   */
  function rates(profile, rules, periodEnd, activity) {
    var a = rules.micro_activities[activity || profile.activity];
    if (!a) return null;
    var acre = Number(profile.acre) || 0;
    var inAcre = acre && periodEnd <= acreEnd(profile.startDate);
    var m = mixedActivities(profile, rules);
    var cfp = m ? Math.max(rules.micro_activities[m.vente].cfp, rules.micro_activities[m.services].cfp) : a.cfp;
    return { social: inAcre ? a["acre_" + acre] : a.cotisations, cfp: cfp, vl: profile.vl ? a.versement_liberatoire : 0, acre: !!inAcre };
  }

  /** Chiffre d'affaires encaissé d'une période, par activité du profil : [{ activity, kind, revenue }]. */
  function revenueParts(documents, profile, rules, from, to) {
    var m = mixedActivities(profile, rules);
    if (!m) return [{ activity: profile.activity, kind: "", revenue: cashed(documents, from, to) }];
    var rows = ledger(documents, from, to, profile, rules);
    var goods = round2(rows.reduce(function (s, r) { return s + r.goods; }, 0));
    var services = round2(rows.reduce(function (s, r) { return s + r.services; }, 0));
    return [{ activity: m.vente, kind: "biens", revenue: goods }, { activity: m.services, kind: "services", revenue: services }];
  }

  /** Cotisations (et versement libératoire) d'un chiffre d'affaires réparti par activité, au taux de chaque activité. */
  function partsDue(parts, profile, rules, periodEnd) {
    return parts.map(function (x) {
      var r = rates(profile, rules, periodEnd, x.activity);
      var social = round2(x.revenue * (r.social + r.cfp)), vl = round2(x.revenue * r.vl);
      return { activity: x.activity, kind: x.kind, revenue: x.revenue, rates: r, social: social, vl: vl, total: round2(social + vl) };
    });
  }

  /**
   * Prochaine déclaration Urssaf à faire : la première échéance du calendrier (à partir d'aujourd'hui) pour la
   * périodicité du profil, avec le chiffre d'affaires encaissé de la période et les cotisations estimées.
   */
  function nextDeclaration(documents, profile, rules, events, today) {
    if (!rules.micro_activities[profile.activity]) return null;
    var periodicity = profile.periodicity === "monthly" ? "monthly" : "quarterly";
    var ev = (events || []).filter(function (e) {
      return e.period && e.date >= today && e.when && e.when.periodicity && e.when.periodicity.indexOf(periodicity) > -1;
    }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
    if (!ev) return null;
    var p = period(ev.period);
    var parts = partsDue(revenueParts(documents, profile, rules, p.start, p.end), profile, rules, p.end);
    var sum = function (k) { return round2(parts.reduce(function (s, x) { return s + x[k]; }, 0)); };
    var social = sum("social"), vl = sum("vl");
    return { period: p, due: ev.date, revenue: sum("revenue"), rates: rates(profile, rules, p.end), social: social, vl: vl, total: round2(social + vl),
             open: today <= p.end, parts: parts, mixed: parts.length > 1 };
  }

  /**
   * Plafond de la micro-entreprise et seuil de la franchise de TVA, sur l'année civile. Activité mixte : plafond global
   * de la vente, plafond des services sur la part des prestations ; franchise de TVA : chiffre d'affaires global au
   * seuil de la vente et part des prestations au seuil des services (BOFiP, BOI-TVA-DECLA-40-10-10, § 160) ; seuils
   * majorés de l'année en cours non donnés pour l'activité mixte (règle non lue, documentation/53).
   */
  function thresholds(documents, profile, rules, year) {
    var a = rules.micro_activities[profile.activity];
    var revenue = cashed(documents, year + "-01-01", year + "-12-31");
    if (!a) return { revenue: revenue };
    var m = mixedActivities(profile, rules);
    if (m) {
      var parts = revenueParts(documents, profile, rules, year + "-01-01", year + "-12-31");
      return { revenue: revenue, ceiling: rules.micro_activities[m.vente].plafond_ca, mixed: true,
               goods: parts[0].revenue, services: { revenue: parts[1].revenue, ceiling: rules.micro_activities[m.services].plafond_ca },
               vat: profile.vatRegime === "franchise" ? { mixed: true, base: rules.micro_activities[m.vente].tva_seuil,
                 servicesBase: rules.micro_activities[m.services].tva_seuil } : null };
    }
    return { revenue: revenue, ceiling: a.plafond_ca, vat: profile.vatRegime === "franchise" ? { base: a.tva_seuil, major: a.tva_seuil_majore } : null };
  }

  // ----- Emails : envoi d'un document, relance d'une facture ---------------------------------

  /**
   * Objet et texte d'un email sur un document émis. kind : "send" (envoi du document) ou "reminder" (relance d'une
   * facture). fmt = { eur, date }. Un lien mailto: ne joint pas de fichier : l'utilisateur joint le PDF téléchargé.
   */
  function email(kind, doc, documents, profile, today, fmt) {
    profile = profile || {};
    var amountText = INV.compute(doc).noVat ? fmt.eur(total(doc)) : L("eng.mail.ttc", { amount: fmt.eur(total(doc)) });
    var bal = balance(doc, documents);
    var due = dueDate(doc);
    var iban = profile.iban ? (profile.bic ? L("eng.mail.ibanBic", { iban: profile.iban, bic: profile.bic, number: doc.number })
      : L("eng.mail.iban", { iban: profile.iban, number: doc.number })) : "";
    var parts = [], subject;
    if (kind === "reminder") {
      var late = due < today;
      subject = late ? L("eng.mail.subjectLate", { number: doc.number }) : L("eng.mail.subjectDue", { number: doc.number, due: fmt.date(due) });
      var R1 = { number: doc.number, date: fmt.date(doc.date), due: fmt.date(due), amount: fmt.eur(bal) };
      parts.push(late ? L("eng.mail.reminderLate", R1) : L("eng.mail.reminderSoon", R1));
      if (iban) parts.push(iban);
      parts.push(L("eng.mail.questions"));
    } else if (doc.type === "facture") {
      var st = state(doc, today, documents), credits = documents ? credited(documents, doc) : 0;
      var payable = (parseInt(doc.terms, 10) || 0) > 0 ? L("eng.mail.payableBy", { date: fmt.date(due) }) : L("eng.mail.payableNow");
      var first = L("eng.mail.invoice", { number: doc.number, date: fmt.date(doc.date), amount: amountText });
      if (st === "cancelled") first += L("eng.mail.cancelled");
      else if (bal <= 0.005) first += L("eng.mail.paid");
      else if (bal < total(doc) - 0.005) {
        var nCredits = (documents || []).filter(function (d) { return d.type === "avoir" && d.status !== "draft" && d.originId === doc.id; }).length;
        var already = paidAmount(doc) > 0
          ? (credits > 0 ? L("eng.mail.already.paymentsCredits") : L("eng.mail.already.payments"))
          : (nCredits > 1 ? L("eng.mail.already.credits") : L("eng.mail.already.credit"));
        first += L("eng.mail.remaining", { already: already, amount: fmt.eur(bal), payable: payable });
      } else first += L("eng.mail.payable", { payable: payable });
      parts.push(first);
      if (bal > 0.005 && iban) parts.push(iban);
      parts.push(L("eng.mail.questions"));
    } else if (doc.type === "devis") {
      var pct = Math.min(100, Math.max(0, Number(doc.depositPct) || 0));
      var until = INV.addDays(doc.date, Math.max(1, parseInt(doc.validity, 10) || 30));
      parts.push(L("eng.mail.quote", { number: doc.number, date: fmt.date(doc.date), amount: amountText, until: fmt.date(until) }) +
        (pct > 0 ? L("eng.mail.deposit", { pct: country.fmt.dec(pct), amount: fmt.eur(round2(total(doc) * pct / 100)) }) : ""));
      parts.push(L("eng.mail.accept", { mention: INV.QUOTE_ACCEPTANCE }));
      parts.push(L("eng.mail.discuss"));
    } else {
      var origin = doc.originId ? (documents || []).filter(function (d) { return d.id === doc.originId; })[0] : null;
      var ref = origin ? L("eng.mail.ref", { number: origin.number, date: fmt.date(origin.date) }) : doc.origin && doc.origin.number ? doc.origin.number : "";
      parts.push(ref ? L("eng.mail.creditFor", { number: doc.number, date: fmt.date(doc.date), amount: amountText, ref: ref })
        : L("eng.mail.credit", { number: doc.number, date: fmt.date(doc.date), amount: amountText }));
      var sa = state(doc, today, documents);
      if (sa === "refund") parts.push(L("eng.mail.refundSoon", { amount: fmt.eur(bal) }));
      else if (sa === "refunded") {
        var lastPay = payments(doc).map(function (p) { return p.date; }).sort().pop();
        parts.push(L("eng.mail.refunded", { amount: fmt.eur(paidAmount(doc)), date: fmt.date(lastPay) }));
      } else if (origin) {
        var left = balance(origin, documents);
        parts.push(left > 0.005 ? L("eng.mail.deducted", { amount: fmt.eur(left) })
          : state(origin, today, documents) === "cancelled" ? L("eng.mail.deductedCancelled") : L("eng.mail.deductedPaid"));
      }
      parts.push(L("eng.mail.questions"));
    }
    if (kind !== "reminder") subject = TYPE_NAMES[doc.type] + " " + doc.number + (profile.name ? " – " + profile.name : "");
    return { subject: subject, body: L("eng.mail.hello") + "\n\n" + parts.join("\n\n") + "\n\n" + L("eng.mail.regards") + "\n" + (profile.name || "") };
  }
  var TYPE_NAMES = labels("eng.type.", ["facture", "devis", "avoir"]);

  // ----- Reprise d'un document du générateur public ------------------------------------------

  var PROFILE_FIELDS = ["status", "address", "siret", "vat", "email", "phone", "iban", "bic", "logo"];
  var isISO = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || ""); };
  var str = function (v) { return String(v == null ? "" : v).trim(); };

  /**
   * Brouillon de l'Espace à partir du document du générateur public (objet construit par tools/facture.js).
   * Client : fiche existante du même nom (jamais modifiée), sinon nouvelle fiche. Profil : seuls ses champs vides sont
   * complétés. La TVA suit le profil et la fiche client, comme pour tout brouillon de l'Espace.
   * Renvoie { doc, client, newClient, profilePatch, paid, vatDiffers, continuation } ; rien n'est modifié ici.
   * ids = { doc, client } ; today = date du jour ; now = date-heure ISO.
   */
  function fromGenerator(g, profile, clients, documents, ids, today, now) {
    g = g || {};
    profile = profile || {};
    var gc = g.client || {}, gv = g.vat || {}, gme = g.me || {};
    var type = g.type === "devis" ? "devis" : "facture";
    var name = str(gc.name).replace(/\s+/g, " ");
    var same = (clients || []).filter(function (c) { return name && nameKey(c.name) === nameKey(name); })
      .sort(function (a, b) { return (a.archived ? 1 : 0) - (b.archived ? 1 : 0); });
    var existing = same[0] || null;
    var client = existing || (name ? { id: ids.client, name: name, address: str(gc.address), siren: str(gc.id), vat: str(gc.vat), email: "",
      pro: gc.pro !== false, place: ["fr", "eu", "world"].indexOf(gv.place) > -1 ? gv.place : "fr", delivery: str(gc.delivery), notes: "",
      archived: false, createdAt: now, updatedAt: now } : null);

    var franchise = profile.vatRegime ? profile.vatRegime === "franchise" : !!gv.franchise;
    var place = client && client.pro ? client.place || "fr" : "fr";
    var rate = Number(gv.rate) > 0 ? Number(gv.rate) : profile.vatRate || 20;
    var amount = function (v) { var n = INV.amount(v); return isFinite(n) ? n : NaN; };
    var lines = (g.lines || []).map(function (l) {
      var out = { desc: String((l && l.desc) || ""), qty: amount(l && l.qty), price: amount(l && l.price) };
      if (l && has(INV.LINE_KINDS, l.kind)) out.kind = l.kind; // vente ou service (document mixte, documentation/53)
      return out;
    }).filter(function (l) { return l.desc.trim() || isFinite(l.price); });
    if (!lines.length) lines = [{ desc: "", qty: 1, price: NaN }];
    var date = isISO(g.date) ? g.date : today;
    var terms = parseInt(g.terms, 10);
    var deposit = Number(g.depositPct);

    var doc = { id: ids.doc, type: type, status: "draft", date: date, serviceDate: type === "facture" && isISO(g.serviceDate) ? g.serviceDate : date,
      terms: terms >= 0 ? terms : profile.terms == null ? 30 : profile.terms,
      validity: parseInt(g.validity, 10) > 0 ? parseInt(g.validity, 10) : 30,
      depositPct: type === "devis" ? (isFinite(deposit) ? Math.min(100, Math.max(0, deposit)) : 30) : 0,
      nature: INV.NATURES[g.nature] ? g.nature : "services", clientId: client ? client.id : "", lines: lines,
      vat: { franchise: franchise, rate: franchise ? profile.vatRate || 20 : rate, place: place, debits: !franchise && place === "fr" && !!gv.debits },
      penalty: str(g.penalty) || profile.penalty || "", notes: String(g.notes || ""), payments: [], createdAt: now, updatedAt: now };

    var patch = {};
    PROFILE_FIELDS.forEach(function (k) { if (!str(profile[k]) && str(gme[k])) patch[k] = k === "logo" ? gme[k] : str(gme[k]); });

    // Seulement pour l'année en cours : le préfixe repris vaut pour les séries suivantes.
    var cont = date.slice(0, 4) === String(today).slice(0, 4) ? continuation(documents || [], type, g.number, date.slice(0, 4)) : null;
    if (cont) {
      var prefixes = profile.prefixes || {}, set = profile.numbering && profile.numbering[type];
      var taken = ["facture", "devis", "avoir"].some(function (t) {
        return t !== type && (prefixes[t] != null ? prefixes[t] : DEFAULT_PREFIXES[t]) === cont.prefix;
      });
      if (taken || (set && String(set.year) === cont.year && (parseInt(set.last, 10) || 0) > cont.last)) cont = null;
    }
    var paid = Number(g.paid);
    return { doc: doc, client: client, newClient: !existing && !!client, profilePatch: patch, paid: paid > 0 ? round2(paid) : 0,
             vatDiffers: !!profile.vatRegime && !!gv.franchise !== franchise, continuation: cont };
  }

  /** Livre des recettes au format CSV (séparateur « ; », virgule décimale, pour Excel en français). */
  // ----- Dépenses et registre des achats (documentation/36-depenses-et-registre-des-achats.md) ------------

  /** Le registre des achats est obligatoire pour l'activité du profil (règle registre_achats). */
  function purchasesRequired(profile, rule, rules) {
    if (!profile || !rule) return false;
    var list = rule.activities || [], m = rules ? mixedActivities(profile, rules) : null;
    return list.indexOf(profile.activity) > -1 || !!(m && list.indexOf(m.vente) > -1);
  }

  /**
   * Dépenses de la période, dans l'ordre chronologique (date, puis création) : { rows, total, cash } ; cash : total
   * réglé en espèces, à distinguer dans le registre des achats.
   */
  function expenseRows(expenses, from, to) {
    var rows = (expenses || []).filter(function (e) { return e && e.date && (!from || e.date >= from) && (!to || e.date <= to); })
      .map(function (e) {
        return { id: e.id, date: e.date, supplier: e.supplier || "", label: e.label || "", method: METHODS[e.method] || e.method || "",
                 cash: e.method === "especes", ref: e.ref || "", amount: round2(Number(e.amount) || 0), createdAt: e.createdAt || "",
                 category: EXPENSE_CATEGORIES[e.category] || "" };
      })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : (a.id < b.id ? -1 : 1)); });
    var sum = function (list) { return round2(list.reduce(function (s, r) { return s + r.amount; }, 0)); };
    return { rows: rows, total: sum(rows), cash: sum(rows.filter(function (r) { return r.cash; })) };
  }

  /** Contrôle d'une dépense saisie : messages d'erreur (vide si elle est valable). */
  function checkExpense(e) {
    var errors = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) errors.push(L("eng.exp.date"));
    if (!String(e.supplier || "").trim()) errors.push(L("eng.exp.supplier"));
    if (!(isFinite(e.amount) && Number(e.amount) > 0)) errors.push(L("eng.exp.amount"));
    if (!METHODS[e.method]) errors.push(L("eng.pay.method"));
    return errors;
  }

  function expensesCSV(rows) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    // Catégorie (documentation/55) en dernière colonne : les colonnes du registre des achats restent à leur place.
    var lines = [L("eng.csv.expenses")];
    rows.forEach(function (r) {
      lines.push([dayText(r.date), q(r.supplier), q(r.label), amountText(r.amount), q(r.method), q(r.ref), q(r.category)].join(";"));
    });
    return lines.join("\r\n");
  }

  // ----- Immobilisations et amortissements (documentation/57-immobilisations.md) --------------------------------

  var ASSET_CATEGORIES = labels("eng.assetCategory.", ["materiel", "bureau", "logiciel", "transport", "autre"]);
  var ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  function utcDay(d) { var p = d.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  /** Date AAAA-MM-JJ qui existe (pas de 31 avril). */
  function validDay(d) { return ISO_DATE.test(d || "") && new Date(utcDay(d)).toISOString().slice(0, 10) === d; }
  /** Nombre de jours de a à b, les deux compris. */
  function daysIncl(a, b) { return Math.round((utcDay(b) - utcDay(a)) / 86400000) + 1; }
  function yearDays(y) { return daysIncl(y + "-01-01", y + "-12-31"); }
  /** Début de l'amortissement : jour de la mise en service, à défaut jour de l'acquisition. */
  function assetStart(a) { return a.inServiceOn || a.acquiredOn; }
  var filled = function (v) { return v !== null && v !== undefined && v !== ""; };

  /** Erreurs de saisie d'un bien, avec le champ concerné. */
  function assetErrors(a, rules) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!String(a.label || "").trim()) add("label", L("eng.asset.label"));
    if (!ASSET_CATEGORIES[a.category]) add("category", L("eng.asset.category"));
    if (!validDay(a.acquiredOn)) add("acquiredOn", L("eng.asset.acquired"));
    if (filled(a.inServiceOn) && !validDay(a.inServiceOn)) add("inServiceOn", L("eng.asset.inServiceInvalid"));
    else if (filled(a.inServiceOn) && validDay(a.acquiredOn) && a.inServiceOn < a.acquiredOn) add("inServiceOn", L("eng.asset.inServiceBefore"));
    if (!(filled(a.cost) && isFinite(a.cost) && Number(a.cost) > 0)) add("cost", L("eng.asset.cost"));
    if (!(filled(a.years) && Number.isInteger(Number(a.years)) && Number(a.years) >= 1 && Number(a.years) <= 50)) add("years", L("eng.asset.years"));
    if (!(filled(a.proShare) && isFinite(a.proShare) && Number(a.proShare) >= 1 && Number(a.proShare) <= 100)) add("proShare", L("eng.asset.proShare"));
    if (filled(a.soldOn)) {
      if (!validDay(a.soldOn)) add("soldOn", L("eng.asset.soldInvalid"));
      else if (validDay(assetStart(a) || "") && a.soldOn < assetStart(a)) add("soldOn", L("eng.asset.soldBefore"));
      if (!(filled(a.salePrice) && isFinite(a.salePrice) && Number(a.salePrice) >= 0)) add("salePrice", L("eng.asset.salePrice"));
    } else if (filled(a.salePrice)) add("soldOn", L("eng.asset.soldOn"));
    // Voiture particulière acquise depuis 2021 : données de la carte grise nécessaires au plafond (documentation/57 § 8).
    var P = rules && rules.plafond_amortissement_vp;
    if (P && a.category === "transport" && a.vp === true && validDay(a.acquiredOn) && a.acquiredOn >= P.acquired_from) {
      if (!validDay(a.firstRegOn)) add("firstRegOn", L("eng.asset.firstReg"));
      if (!(filled(a.co2) && Number.isInteger(Number(a.co2)) && Number(a.co2) >= 0 && Number(a.co2) <= 999)) add("co2", L("eng.asset.co2"));
    }
    return errors;
  }
  function checkAsset(a, rules) { return assetErrors(a, rules).map(function (e) { return e.message; }); }

  /**
   * Plafond de l'amortissement déductible d'une voiture particulière (CGI, art. 39, 4 ; BOI-BIC-AMT-20-40-50 ; notices
   * 2032 et 2142 de 2026), règle plafond_amortissement_vp. null : pas un véhicule. status : « not_vp » (pas une voiture
   * particulière : pas de plafond), « before » (acquise avant 2021 : barème non repris), « missing » (carte grise
   * incomplète), « under » (prix au plus égal au plafond), « capped » (part déductible = annuité × plafond ÷ prix).
   */
  function vehicleCap(a, rules) {
    if (!a || a.category !== "transport") return null;
    if (a.vp !== true) return { status: "not_vp" };
    var P = rules && rules.plafond_amortissement_vp;
    if (!P || !validDay(a.acquiredOn) || a.acquiredOn < P.acquired_from) return { status: "before" };
    if (!validDay(a.firstRegOn) || !filled(a.co2) || !isFinite(a.co2)) return { status: "missing" };
    var wltp = a.firstRegOn >= P.wltp_from, co2 = Number(a.co2), cap = null;
    (wltp ? P.wltp : P.nedc).some(function (band) {
      var inBand = band.below !== undefined ? co2 < band.below : band.up_to !== undefined ? co2 <= band.up_to : true;
      if (inBand) cap = band.cap;
      return inBand;
    });
    var cost = Number(a.cost);
    return { status: cost > cap ? "capped" : "under", cap: cap, ratio: cost > cap ? cap / cost : 1, wltp: wltp, co2: co2 };
  }

  /**
   * Plan d'amortissement linéaire (BOI-BIC-AMT-20-10) : une ligne par année civile, du jour de la mise en service
   * (compris) ; première année au prorata des jours (jours exacts / jours de l'année) ; cumul arrondi au centime, total =
   * prix de revient ; bien cédé : année de cession au prorata jusqu'au jour de la cession (compris), puis plan arrêté.
   * Ligne : { year, days (null pour une année entière), yearDays, amount, cumulative, net, deductible }.
   */
  function assetPlan(a, rules) {
    var start = assetStart(a), cost = round2(Number(a.cost)), years = Number(a.years);
    var share = (filled(a.proShare) ? Number(a.proShare) : 100) / 100, sold = filled(a.soldOn) ? a.soldOn : null;
    // Voiture plafonnée : part déductible = annuité × plafond ÷ prix ; en partie privée (combinaison non lue), acquise avant
    // 2021 (barème non repris) ou carte grise incomplète : part à établir (null).
    var vc = rules ? vehicleCap(a, rules) : null, capped = !!vc && vc.status === "capped";
    var unknown = !!vc && (vc.status === "missing" || vc.status === "before");
    var deductibleOf = function (amount) {
      if (unknown || (capped && share < 1)) return null;
      return round2(amount * (capped ? vc.ratio : share));
    };
    var first = +start.slice(0, 4), y = first, rows = [], fraction = 0, cum = 0;
    while (cum < cost && rows.length < years + 2) {
      var from = y === first ? start : y + "-01-01";
      var to = sold && +sold.slice(0, 4) === y ? sold : y + "-12-31";
      if (sold && sold < from) break;
      var days = daysIncl(from, to), full = yearDays(y);
      fraction = Math.min(years, fraction + days / full);
      var next = round2(cost * fraction / years);  // fraction plafonnée à la durée : le dernier cumul vaut le prix de revient
      var amount = round2(next - cum);
      cum = next;
      rows.push({ year: y, days: days === full ? null : days, yearDays: full, amount: amount, cumulative: cum, net: round2(cost - cum),
                  deductible: deductibleOf(amount) });
      if (sold && +sold.slice(0, 4) === y) break;
      y++;
    }
    return rows;
  }

  /**
   * Plus-value ou moins-value de cession (documentation/57 § 9 ; BOI-BNC-BASE-30-20 et BOI-BNC-BASE-30-30-10, règle
   * plus_values_professionnelles). null : pas de cession. Résultat = prix de cession (net des frais) − valeur nette au
   * jour de la cession (amortissements linéaires sans limitation, même pour une voiture plafonnée) ; véhicule en partie
   * privé : résultat × part professionnelle. Répartition : moins-value à court terme ; plus-value d'un bien détenu depuis
   * moins de deux ans à court terme ; sinon à court terme jusqu'aux amortissements déduits, à long terme au-delà.
   * split « unknown » (montants à établir) : bien autre qu'un véhicule affecté en partie (« partial »), voiture plafonnée
   * ou dont la part déductible est à établir (« vehicle_cap »).
   */
  function assetDisposal(a, rules) {
    if (!a || !validDay(a.soldOn) || !filled(a.salePrice) || !isFinite(a.salePrice)) return null;
    var plan = assetPlan(a, rules), cumulative = plan.length ? plan[plan.length - 1].cumulative : 0;
    var net = round2(Number(a.cost) - cumulative), gross = round2(Number(a.salePrice) - net);
    var share = (filled(a.proShare) ? Number(a.proShare) : 100) / 100, vehicle = a.category === "transport";
    var held = a.soldOn >= addYears(a.acquiredOn, rules.plus_values_professionnelles.holding_years);   // addYears : section Prospects (29 février → 28)
    var vc = vehicleCap(a, rules), reason = null;
    if (share < 1 && !vehicle) reason = "partial";
    else if (vc && vc.status !== "not_vp" && vc.status !== "under") reason = "vehicle_cap";
    var result = vehicle ? round2(gross * share) : gross, shortTerm = null, longTerm = null;
    if (!reason) {
      // Détenu depuis deux ans au moins : court terme jusqu'aux amortissements déduits (une moins-value y reste en entier).
      if (!held) { shortTerm = result; longTerm = 0; }
      else { shortTerm = Math.min(result, round2(cumulative * share)); longTerm = round2(result - shortTerm); }
    }
    return { net: net, gross: gross, result: result, heldTwoYears: held, shortTerm: shortTerm, longTerm: longTerm,
             split: reason ? "unknown" : "ok", reason: reason };
  }

  /** Registre d'une année : biens présents dans l'année (acquis au plus tard cette année, non cédés avant), annuités, totaux. */
  function assetsYear(assets, year, rules) {
    var Y = String(year), rows = [];
    (assets || []).forEach(function (a) {
      if (!a || !validDay(a.acquiredOn) || a.acquiredOn.slice(0, 4) > Y || (filled(a.soldOn) && a.soldOn.slice(0, 4) < Y)) return;
      var plan = assetPlan(a, rules), row = plan.filter(function (r) { return String(r.year) === Y; })[0] || null;
      var done = plan.filter(function (r) { return String(r.year) <= Y; });
      var cumulative = done.length ? done[done.length - 1].cumulative : 0;
      var sold = !!(filled(a.soldOn) && a.soldOn.slice(0, 4) === Y);
      rows.push({ asset: a, row: row, amount: row ? row.amount : 0, deductible: row ? row.deductible : 0, cumulative: cumulative,
                  net: round2(Number(a.cost) - cumulative), sold: sold, disposal: sold && rules ? assetDisposal(a, rules) : null });
    });
    rows.sort(function (x, y) {
      var a = assetStart(x.asset), b = assetStart(y.asset);
      return a < b ? -1 : a > b ? 1 : String(x.asset.label).localeCompare(String(y.asset.label), "fr");
    });
    var sum = function (k, list) { return round2((list || rows).reduce(function (s, r) { return s + (r[k] || 0); }, 0)); };
    return { rows: rows, amount: sum("amount"), deductible: sum("deductible"), net: sum("net", rows.filter(function (r) { return !r.sold; })),
             count: rows.length, pending: rows.filter(function (r) { return r.deductible === null; }).length,
             disposals: disposalsOf(rows) };
  }
  /** Cessions de l'année : solde à court terme, plus-values à long terme, cessions à établir (dont en plus-value). */
  function disposalsOf(rows) {
    var list = rows.filter(function (r) { return r.disposal; }), known = list.filter(function (r) { return r.disposal.split === "ok"; });
    var sum = function (k) { return round2(known.reduce(function (s, r) { return s + r.disposal[k]; }, 0)); };
    return { count: list.length, shortTerm: sum("shortTerm"), longTerm: sum("longTerm"), pending: list.length - known.length,
             pendingGains: list.filter(function (r) { return r.disposal.split !== "ok" && r.disposal.result > 0; }).length };
  }

  /**
   * Recettes encaissées hors taxes d'une année (BOI-BIC-PVMV-40-10-10-20, §§ 230 et 500) : encaissements des factures moins
   * remboursements des avoirs, part de TVA retirée ; count : nombre d'encaissements (0 : année inconnue de l'Espace).
   */
  function receiptsHT(documents, year) {
    var Y = String(year), total = 0, count = 0;
    (documents || []).forEach(function (doc) {
      if (doc.status === "draft" || (doc.type !== "facture" && doc.type !== "avoir")) return;
      var net = 1 - vatPart(doc), sign = doc.type === "avoir" ? -1 : 1;
      payments(doc).forEach(function (p) {
        if (String(p.date).slice(0, 4) !== Y) return;
        total += sign * Number(p.amount) * net;
        count++;
      });
    });
    return { year: +Y, amount: round2(total), count: count };
  }
  /** Taux d'exonération d'une catégorie (article 151 septies, II) : 1 jusqu'au seuil, dégressif ensuite, 0 au-delà ; à 0,01 % près. */
  function rate151(c, receipts) {
    if (receipts <= c.full_up_to) return 1;
    if (receipts >= c.partial_below) return 0;
    return Math.round((c.partial_below - receipts) / c.divisor * 10000) / 10000;
  }
  /**
   * Condition des cinq ans d'activité (article 151 septies, documentation/57 § 11) : remplie pour l'année si les cinq ans
   * sont atteints au plus tard le 1er janvier suivant (activité exercée jusqu'au 31 décembre) ; unknown sans date lisible.
   */
  function fiveYears(startDate, year, rules) {
    if (!validDay(startDate)) return { status: "unknown", reachedOn: null };
    var reached = addYears(startDate, rules.plus_values_exoneration_151_septies.activity_years);
    return { status: reached <= (Number(year) + 1) + "-01-01" ? "met" : "not_met", reachedOn: reached };
  }
  /**
   * Exonération de l'article 151 septies estimée pour un BNC (documentation/57 § 10 et 11) : moyenne des encaissements HT
   * des deux années précédentes, taux, montants exonérés de la plus-value nette à court terme et à long terme de l'année.
   * kind null (montants null) : une des deux années n'a aucun encaissement enregistré, estimation à établir ; condition
   * des cinq ans non remplie (date de début d'activité connue) : kind "none", reason "activity", montants nuls.
   */
  function exemption151(documents, year, disposals, rules, startDate) {
    var X = rules.plus_values_exoneration_151_septies, Y = Number(year);
    var receipts = [receiptsHT(documents, Y - 2), receiptsHT(documents, Y - 1)];
    var st = Math.max(0, (disposals && disposals.shortTerm) || 0), lt = Math.max(0, (disposals && disposals.longTerm) || 0);
    var out = { years: [Y - 2, Y - 1], receipts: receipts, average: null, rate: null, kind: null, shortTerm: null, longTerm: null,
                base: { shortTerm: st, longTerm: lt }, activity: fiveYears(startDate, Y, rules), reason: null };
    if (out.activity.status === "not_met") {
      out.kind = "none"; out.reason = "activity"; out.rate = 0; out.shortTerm = 0; out.longTerm = 0;
      return out;
    }
    if (!receipts[0].count || !receipts[1].count) return out;
    out.average = round2((receipts[0].amount + receipts[1].amount) / 2);
    var C = X.services_bnc;
    out.kind = out.average <= C.full_up_to ? "full" : out.average < C.partial_below ? "partial" : "none";   // selon le seuil, pas le taux arrondi
    out.rate = rate151(C, out.average);
    out.shortTerm = round2(st * out.rate);
    out.longTerm = round2(lt * out.rate);
    return out;
  }

  /**
   * Messages d'un bien : « deductible » (500 € HT ou moins, catégorie admise : déduction possible en charge,
   * immobilisation_seuil_charges) ; « vehicle » (plafonds d'amortissement des véhicules non calculés) ; « partial »
   * (bien affecté en partie : mention au registre, part déductible seule).
   */
  function assetHints(a, rules) {
    var S = rules.immobilisation_seuil_charges, hints = [];
    if (S.categories.indexOf(a.category) > -1 && Number(a.cost) > 0 && Number(a.cost) <= S.amount) hints.push("deductible");
    if (a.category === "transport") hints.push("vehicle");
    if (filled(a.proShare) && Number(a.proShare) < 100) hints.push("partial");
    return hints;
  }

  /** Registre de l'année au format CSV (séparateur « ; », montants avec la virgule). */
  function assetsCSV(year) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var eur = function (n) { return filled(n) ? amountText(n) : ""; };
    var lines = [L("eng.csv.assets")];
    year.rows.forEach(function (r) {
      var a = r.asset;
      lines.push([q(a.label), q(ASSET_CATEGORIES[a.category]), dayText(a.acquiredOn), dayText(assetStart(a)), eur(a.cost), String(a.years),
        country.fmt.dec(filled(a.proShare) ? a.proShare : 100), eur(r.amount), eur(r.cumulative), eur(r.net), eur(r.deductible),
        filled(a.soldOn) ? dayText(a.soldOn) : "", filled(a.soldOn) ? eur(a.salePrice) : "",
        r.disposal ? eur(r.disposal.shortTerm) : "", r.disposal ? eur(r.disposal.longTerm) : ""].join(";"));
    });
    return lines.join("\r\n");
  }

  // ----- Trésorerie (documentation/39-tresorerie.md) ----------------------------------------------------------

  /** Part de TVA d'un montant encaissé sur ce document (TVA / TTC) ; 0 en franchise ou sans TVA française. */
  function vatPart(doc) {
    var c = INV.compute(doc);
    return c.ttc > 0 ? c.vat / c.ttc : 0;
  }
  /** TVA exigible à l'encaissement (prestations de services sans option pour les débits), sinon à la date de la facture. */
  var onCash = function (doc) { return doc.nature === "services" && !(doc.vat && doc.vat.debits); };

  /** TVA collectée exigible entre from et to : encaissements des services, factures de biens, mixtes ou au débit ; avoirs déduits. */
  function vatExigible(documents, from, to) {
    var sum = 0;
    (documents || []).forEach(function (d) {
      if (!d || d.status === "draft" || (d.type !== "facture" && d.type !== "avoir")) return;
      var sign = d.type === "avoir" ? -1 : 1;
      if (onCash(d)) {
        var part = vatPart(d);
        payments(d).forEach(function (p) { if (p.date >= from && p.date <= to) sum += sign * Number(p.amount) * part; });
      } else if (d.date >= from && d.date <= to) {
        sum += sign * INV.compute(d).vat;
      }
    });
    return round2(sum);
  }

  /** Déclarations Urssaf du profil (périodicité), avec leur période, dans l'ordre des dates limites. */
  function declarations(profile, events) {
    var periodicity = profile.periodicity === "monthly" ? "monthly" : "quarterly";
    return (events || []).filter(function (e) {
      return e.period && e.when && e.when.periodicity && e.when.periodicity.indexOf(periodicity) > -1;
    }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (e) { return { due: e.date, period: period(e.period) }; });
  }
  /** Taux total d'une période (cotisations, formation professionnelle, versement libératoire) ; null hors micro-entreprise. */
  function totalRate(profile, rules, end) {
    var r = rates(profile, rules, end);
    return r ? r.social + r.cfp + r.vl : null;
  }
  var vatEvents = function (events, regime) {
    return (events || []).filter(function (e) { return e.when && e.when.vat && e.when.vat.indexOf(regime) > -1; });
  };
  /** Acomptes du réel simplifié : juillet 55 %, décembre 40 % de la TVA due l'année précédente ; aucun sous 1 000 €. */
  var ADVANCES = { "07": 0.55, "12": 0.40 };
  var advanceAmount = function (month, vatLastYear) {
    return has(ADVANCES, month) && Number(vatLastYear) >= 1000 ? round2(Number(vatLastYear) * ADVANCES[month]) : 0;
  };

  /**
   * Déjà dû à la date du jour : cotisations sur l'encaissé des périodes dont la date limite n'est pas passée ; TVA
   * exigible non encore déclarée (réel normal) ou depuis le 1er janvier moins les acomptes échus (réel simplifié).
   */
  function owed(input) {
    var p = input.profile || {}, today = input.today, docs = input.documents || [];
    var urssaf = { total: 0, periods: [], computed: false };
    if (totalRate(p, input.rules, today) !== null) {
      urssaf.computed = true;
      declarations(p, input.events).forEach(function (d) {
        if (d.due < today || d.period.start > today) return;
        var parts = revenueParts(docs, p, input.rules, d.period.start, d.period.end);
        var cash = round2(parts.reduce(function (s, x) { return s + x.revenue; }, 0));
        var amount = round2(partsDue(parts, p, input.rules, d.period.end).reduce(function (s, x) { return s + x.total; }, 0));
        urssaf.periods.push({ period: d.period, due: d.due, cashed: cash, amount: amount });
        urssaf.total = round2(urssaf.total + amount);
      });
    }
    var vat = { total: 0, regime: p.vatRegime || "franchise", advances: 0, advancesUnknown: false, previousYearDue: null };
    if (p.vatRegime === "normal") {
      // Mois dont la déclaration (CA3, le mois suivant) n'est pas encore passée : le mois en cours et peut-être le précédent.
      var prev = addMonths(monthStart(today), -1);
      var ca3 = vatEvents(input.events, "normal").filter(function (e) { return e.date.slice(0, 7) === today.slice(0, 7); })[0];
      var from = ca3 && ca3.date < today ? monthStart(today) : prev;
      vat.total = vatExigible(docs, from, today);
    } else if (p.vatRegime === "simplified") {
      var year = today.slice(0, 4), collected = vatExigible(docs, year + "-01-01", today);
      if (blank(p.vatLastYear) || !isFinite(Number(p.vatLastYear))) vat.advancesUnknown = true;
      else {
        Object.keys(ADVANCES).forEach(function (m) {
          if (today > monthEnd(year + "-" + m + "-01")) vat.advances = round2(vat.advances + advanceAmount(m, p.vatLastYear));
        });
      }
      vat.total = round2(Math.max(0, collected - vat.advances));
      // Solde de l'année précédente, payé avec la déclaration annuelle (CA12) de mai : signalé, non estimé.
      var ca12 = vatEvents(input.events, "simplified").filter(function (e) { return /CA12/.test(e.title || "") && e.date.slice(0, 4) === year; })[0];
      var ca12Date = ca12 ? ca12.date : year + "-05-01";
      vat.previousYearDue = today <= ca12Date ? ca12Date : null;
    }
    return { urssaf: urssaf, vat: vat, total: round2(urssaf.total + vat.total) };
  }

  /**
   * Prévision (partie générale : cœur commun, forecastWith) avec les flux d'impôt de la France : cotisations aux dates
   * limites des déclarations, TVA du mois (réel normal) ou acomptes (réel simplifié) aux dates du calendrier.
   */
  function forecast(input) {
    var p = input.profile || {}, today = input.today, docs = input.documents || [];
    return C.forecastWith(input, function (base) {
      var receipts = base.receipts, plannedRevenue = base.plannedRevenue, until = base.until, items = [];
      var mainActivity = p.activity;
      // Cotisations : encaissé de la période + encaissements attendus dans la période, à la date limite.
      if (totalRate(p, input.rules, today) !== null) {
        declarations(p, input.events).forEach(function (d) {
          if (d.due < today || d.due > until) return;
          var inPeriod = receipts.filter(function (r) { return r.date >= d.period.start && r.date <= d.period.end; });
          var parts = revenueParts(docs, p, input.rules, d.period.start, d.period.end).map(function (x) {
            // Encaissements attendus ajoutés à chaque activité (facture mixte : au prorata de ses lignes, comme un encaissement réel).
            var add = inPeriod.reduce(function (s, r) {
              var g = goodsPart(r.doc, r.amount);
              return s + (x.kind === "biens" ? g : x.kind === "services" ? r.amount - g : r.amount);
            }, 0);
            return { activity: x.activity, kind: x.kind, revenue: round2(x.revenue + add) };
          });
          // Chiffre d'affaires prévu : rattaché à l'activité principale du profil.
          var planned = plannedRevenue.filter(function (r) { return r.date >= d.period.start && r.date <= d.period.end; })
            .reduce(function (s, r) { return s + r.amount; }, 0);
          if (planned && parts.length) {
            var target = parts.filter(function (x) { return x.activity === mainActivity; })[0] || parts[0];
            target.revenue = round2(target.revenue + planned);
          }
          var amount = round2(partsDue(parts, p, input.rules, d.period.end).reduce(function (s, x) { return s + x.total; }, 0));
          if (amount) items.push({ date: d.due, kind: "urssaf", amount: -amount, label: d.period.key.indexOf("T") > -1 ? L("eng.forecast.urssafQuarter", { period: d.period.label })
            : L("eng.forecast.urssafMonth", { period: d.period.label }) });
        });
      }
      // TVA : réel normal, TVA du mois (exigible + attendue à l'encaissement) au calendrier du mois suivant ; réel simplifié, acomptes.
      if (p.vatRegime === "normal") {
        vatEvents(input.events, "normal").forEach(function (e) {
          if (e.date < today || e.date > until) return;
          var m = addMonths(monthStart(e.date), -1), end = monthEnd(m);
          var expected = receipts.filter(function (r) { return r.date >= m && r.date <= end && onCash(r.doc); })
            .reduce(function (s, r) { return s + r.amount * vatPart(r.doc); }, 0); // un remboursement d'avoir est déjà négatif
          var rate = Number(p.vatRate) > 0 ? Number(p.vatRate) : 20;
          expected += plannedRevenue.filter(function (r) { return r.date >= m && r.date <= end; })
            .reduce(function (s, r) { return s + r.amount * rate / (100 + rate); }, 0); // montant prévu TTC
          var amount = round2(vatExigible(docs, m, end) + expected);
          if (amount > 0) items.push({ date: e.date, kind: "vat", amount: -amount, label: e.title.replace(/^Déclaration de /, "") });
        });
      } else if (p.vatRegime === "simplified" && !blank(p.vatLastYear)) {
        vatEvents(input.events, "simplified").forEach(function (e) {
          if (e.date < today || e.date > until) return;
          var amount = advanceAmount(e.date.slice(5, 7), p.vatLastYear); // 0 hors juillet et décembre (déclaration CA12 de mai)
          if (amount) items.push({ date: e.date, kind: "vat", amount: -amount, label: e.title });
        });
      }
      return items;
    });
  }

  /**
   * Point mort : chiffre d'affaires à encaisser chaque mois pour couvrir les charges mensuelles et les cotisations
   * (taux total de l'activité principale : cotisations, formation professionnelle, versement libératoire) ; null hors
   * micro-entreprise ou sans charges.
   */
  function breakEven(monthly, profile, rules, today) {
    var r = totalRate(profile || {}, rules, today);
    if (r === null || !(monthly > 0) || r >= 1) return null;
    return Math.ceil(monthly / (1 - r));
  }
  function ledgerCSV(rows) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    // Activité mixte : ventes et prestations dans deux colonnes (BOFiP, BOI-BIC-DECLA-30-30, § 30).
    var split = rows.some(function (r) { return r.goods !== undefined; });
    var lines = [split ? L("eng.csv.ledgerMixed") : L("eng.csv.ledger")];
    rows.forEach(function (r) {
      lines.push([dayText(r.date), q(r.client), q(r.nature)].concat(split ? [amountText(r.goods), amountText(r.services)] : [])
        .concat([amountText(r.amount), q(r.method), q(r.ref)]).join(";"));
    });
    return lines.join("\r\n");
  }

  return { compare: C.compare, text: L, METHODS: METHODS, EXPENSE_CATEGORIES: EXPENSE_CATEGORIES, DEFAULT_PREFIXES: DEFAULT_PREFIXES, PROFILE_FIELDS: PROFILE_FIELDS, COUNTRIES: COUNTRIES,
           EU_COUNTRIES: EU_COUNTRIES, countries: countries,
           total: total, payments: payments, paidAmount: paidAmount, credited: credited, balance: balance, dueDate: dueDate,
           series: series, seriesPrefix: seriesPrefix, nextNumber: nextNumber, continuation: continuation,
           checkIssue: checkIssue, issue: issue, state: state, email: email, fromGenerator: fromGenerator,
           checkPayment: checkPayment, ledger: ledger, ledgerQuarters: ledgerQuarters, cashed: cashed, period: period, acreEnd: acreEnd, rates: rates,
           mixedActivities: mixedActivities, goodsShare: goodsShare, revenueParts: revenueParts,
           nextDeclaration: nextDeclaration, thresholds: thresholds, clientTotals: clientTotals,
           invoiceFromQuote: invoiceFromQuote, creditFromInvoice: creditFromInvoice, duplicate: duplicate, ledgerCSV: ledgerCSV,
           purchasesRequired: purchasesRequired, expenseRows: expenseRows, checkExpense: checkExpense, expensesCSV: expensesCSV,
           parseDuration: parseDuration, durationLabel: durationLabel, checkTime: checkTime, timeErrors: timeErrors, timeState: timeState, lastRate: lastRate,
           timeInvoiceLines: timeInvoiceLines, timeInvoice: timeInvoice, timeSummary: timeSummary, unbilledByClient: unbilledByClient,
           ASSET_CATEGORIES: ASSET_CATEGORIES, assetErrors: assetErrors, checkAsset: checkAsset, assetStart: assetStart, assetPlan: assetPlan,
           assetsYear: assetsYear, assetHints: assetHints, assetsCSV: assetsCSV, vehicleCap: vehicleCap, assetDisposal: assetDisposal, receiptsHT: receiptsHT, exemption151: exemption151, fiveYears: fiveYears,
           timeCSV: timeCSV, timerCheck: timerCheck, timerElapsed: timerElapsed, timerStart: timerStart, timerPause: timerPause,
           timerResume: timerResume, timerStop: timerStop, timerClock: timerClock, timerDuration: timerDuration,
           STAGE_LABELS: STAGE_LABELS, OPEN_STAGES: OPEN_STAGES, prospectErrors: prospectErrors, exchangeErrors: exchangeErrors, prospectQuotes: prospectQuotes,
           minStage: minStage, prospectStage: prospectStage, prospectClosedAt: prospectClosedAt, prospectValue: prospectValue, pipeline: pipeline, followUps: followUps,
           lastContactFrom: lastContactFrom, addYears: addYears, retentionDue: retentionDue, optoutKeys: optoutKeys, prospectsCSV: prospectsCSV,
           CHARGE_LABELS: CHARGE_LABELS, chargeDates: chargeDates, chargeErrors: chargeErrors, expectedReceipts: expectedReceipts, vatPart: vatPart,
           vatExigible: vatExigible, owed: owed, forecast: forecast, balanceCurve: balanceCurve, safeAmount: safeAmount, paymentStats: paymentStats,
           addMonths: addMonths, aging: aging, cashHistory: cashHistory, monthlyCharges: monthlyCharges, runway: runway, quotesToInvoice: quotesToInvoice, breakEven: breakEven,
           FLOW_KINDS: FLOW_KINDS, forecastCSV: forecastCSV };
});
