/*
 * Moteur : cœur commun de l'Espace entrepreneur, tous pays (documentation/60-espace-etats-unis.md, § 3.1, décision D88).
 * Fonctions pures sur les données de l'Espace, sans règle propre à un pays : montants et soldes des documents,
 * numérotation et émission, statuts, totaux par client, transformations (devis vers facture, avoir, doublon),
 * temps passé (documentation/37), prospects (documentation/38) et parties communes de la trésorerie (documentation/39 :
 * mouvements prévus, encaissements attendus, courbe du solde, délais de paiement, créances, autonomie). C'est une fabrique : chaque moteur de pays
 * (engines/espace-fr.js…) l'appelle avec son moteur de facture (INV) et la fonction L des textes de la langue de la
 * section, et un objet de réglages du pays lu au moment des appels (country.prefixes : préfixes par défaut des
 * numéros ; country.methods : moyens de paiement) ; il en reprend les fonctions sous leur nom. Testé par les tests
 * du moteur français.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.OFE = root.OFE || {}).espaceCore = factory;
})(typeof self !== "undefined" ? self : this, function (INV, L, country) {
  "use strict";

  /** « 1, 2 et 3 » : liste de numéros dans la langue de la section. */
  function listText(items) { return items.length > 1 ? items.slice(0, -1).join(", ") + L("eng.listAnd") + items[items.length - 1] : String(items[0]); }

  /** Libellés traduits des clés : { clé: L(préfixe + clé) } (l'ordre des clés est celui de la liste). */
  var labels = function (prefix, keys) { var o = {}; keys.forEach(function (k) { o[k] = L(prefix + k); }); return o; };

  /** Clé de comparaison d'un nom (espaces réduits, minuscules). */
  var nameKey = function (s) { return String(s || "").trim().replace(/\s+/g, " ").toLowerCase(); };
  var round2 = function (n) { return Math.round(n * 100) / 100; };
  /** Ordre alphabétique de la langue du pays (country.locale : « fr » en France, « en-US » aux États-Unis). */
  var compare = function (a, b) { return String(a || "").localeCompare(String(b || ""), country.locale); };
  /** Séparateur des exports CSV du pays (« ; » en France, convention des tableurs français ; « , » aux États-Unis). */
  var csvSep = function () { return country.csvSep || ";"; };
  /** En-tête d'un export : le texte (colonnes séparées par « ; ») recomposé avec le séparateur du pays. */
  var csvHeader = function (key) { return L(key).split(";").join(csvSep()); };

  function lastDay(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
  function iso(y, m, d) { return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }

  // ----- Montants ------------------------------------------------------------

  function total(doc) { return round2(INV.compute(doc).ttc); }
  /** Encaissements en vigueur : ceux marqués supprimés (deletedAt, schéma 2 synchronisé) ne comptent plus. */
  function payments(doc) { return (doc.payments || []).filter(function (p) { return p && !p.deletedAt; }); }
  function paidAmount(doc) {
    return round2(payments(doc).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0));
  }
  /** Total des avoirs émis sur une facture. */
  function credited(documents, invoice) {
    return round2((documents || []).reduce(function (s, d) {
      return d.type === "avoir" && d.status !== "draft" && d.originId === invoice.id ? s + total(d) : s;
    }, 0));
  }

  /**
   * Reste dû. Facture : total − encaissements − avoirs imputés. Avoir lié à une facture : la part de l'avoir à
   * rembourser parce que la facture avait déjà été payée au-delà de son nouveau montant, moins les remboursements faits.
   * Avoir sans facture d'origine : son montant moins les remboursements. Sans la liste des documents, total − encaissements.
   */
  function balance(doc, documents) {
    if (doc.type === "facture") return round2(total(doc) - paidAmount(doc) - (documents ? credited(documents, doc) : 0));
    if (doc.type === "avoir" && documents && doc.originId) {
      var origin = documents.filter(function (d) { return d.id === doc.originId; })[0];
      if (origin) {
        // Trop-perçu sur la facture, réparti entre ses avoirs dans l'ordre d'émission.
        var left = Math.max(0, paidAmount(origin) - (total(origin) - credited(documents, origin)));
        var avoirs = documents.filter(function (d) { return d.type === "avoir" && d.status !== "draft" && d.originId === origin.id; })
          .sort(function (a, b) { return order(a) < order(b) ? -1 : 1; });
        for (var i = 0; i < avoirs.length; i++) {
          var share = Math.min(total(avoirs[i]), left);
          if (avoirs[i].id === doc.id) return round2(Math.max(0, share - paidAmount(doc)));
          left -= share;
        }
        return 0;
      }
    }
    return round2(total(doc) - paidAmount(doc));
  }
  function dueDate(doc) { return INV.addDays(doc.date, Math.max(0, parseInt(doc.terms, 10) || 0)); }


  /** Clé d'ordre d'émission : date du document, puis date d'émission, puis rang du numéro. */
  function order(d) {
    var rank = /(\d+)$/.exec(d.number || "");
    return (d.date || "") + "|" + (d.issuedAt || "") + "|" + (rank ? String(+rank[1]).padStart(9, "0") : "");
  }

  // ----- Numérotation et émission --------------------------------------------


  /** Documents émis d'une série (type et année), du plus récent au plus ancien. */
  function series(documents, type, year) {
    return documents.filter(function (d) {
      return d.type === type && d.status !== "draft" && d.number && String(d.date).slice(0, 4) === String(year);
    }).sort(function (a, b) { return order(a) < order(b) ? 1 : -1; });
  }

  /** Préfixe d'une série commencée (celui de son dernier document émis), ou null si la série est vide. */
  function seriesPrefix(documents, type, year) {
    var last = series(documents, type, year)[0];
    if (!last) return null;
    var at = last.number.lastIndexOf(String(year) + "-");
    return at > -1 ? last.number.slice(0, at) : null;
  }

  /**
   * Prochain numéro de la série : F2026-001, F2026-002… (rang le plus élevé + 1). Une série commencée garde son
   * préfixe jusqu'à la fin de l'année ; le préfixe des réglages s'applique aux nouvelles séries. numbering
   * (facultatif) : { facture: { year, last } … }, dernier rang utilisé hors de l'Espace pour continuer une séquence.
   */
  function nextNumber(documents, type, year, prefixes, numbering) {
    var started = seriesPrefix(documents, type, year);
    var prefix = (started != null ? started : prefixes && prefixes[type] != null ? prefixes[type] : country.prefixes[type]) + year + "-";
    var external = numbering && numbering[type];
    var max = external && String(external.year) === String(year) ? Math.max(0, parseInt(external.last, 10) || 0) : 0;
    documents.forEach(function (d) {
      if (d.type !== type || !d.number || d.number.indexOf(prefix) !== 0) return;
      var n = parseInt(d.number.slice(prefix.length), 10);
      if (n > max) max = n;
    });
    return prefix + String(max + 1).padStart(3, "0");
  }

  /**
   * Numérotation du générateur public à continuer dans l'Espace : son numéro a la forme <préfixe><année>-<rang>,
   * l'année est celle du document et aucun document de ce type n'est encore émis cette année dans l'Espace.
   * Renvoie { prefix, year, last, number } (number : celui que recevra le document) ou null.
   */
  function continuation(documents, type, number, year) {
    var m = /^([A-Za-z_\-\/]{0,12}?)(\d{4})-(\d{1,6})$/.exec(String(number || "").trim());
    if (!m || m[2] !== String(year) || +m[3] < 1 || String(+m[3]).padStart(3, "0") !== m[3]) return null;
    if (series(documents, type, year).length) return null;
    return { prefix: m[1], year: m[2], last: +m[3] - 1, number: m[1] + m[2] + "-" + m[3] };
  }

  /** Contrôles avant émission ; renvoie la liste des erreurs (vide si le document peut être émis). */
  function checkIssue(documents, doc, client, opts) {
    var errors = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.date || "")) errors.push(L("eng.issue.date"));
    if (!client || !String(client.name || "").trim()) errors.push(L("eng.issue.client"));
    // Ligne commencée (désignation ou prix saisi, comme dans l'aperçu) : désignation, quantité et prix obligatoires.
    var started = [], incomplete = [];
    (doc.lines || []).forEach(function (l, i) {
      if (!(String(l.desc || "").trim() || isFinite(INV.amount(l.price)))) return;
      started.push(i + 1);
      if (!(String(l.desc || "").trim() && isFinite(INV.amount(l.price)) && isFinite(INV.amount(l.qty)))) incomplete.push(i + 1);
    });
    if (!started.length) errors.push(L("eng.issue.noLine"));
    else if (incomplete.length) {
      errors.push(incomplete.length > 1 ? L("eng.issue.incompleteMany", { lines: listText(incomplete) }) : L("eng.issue.incompleteOne", { line: incomplete[0] }));
    } else if (total(doc) <= 0) errors.push(L("eng.issue.positive"));
    else if (opts && opts.lineKinds && doc.nature === "mixte") {
      // Activité mixte : ventes et prestations distinctes sur la facture (BOFiP, BOI-BIC-DECLA-30-30, § 30).
      var unknown = started.filter(function (n) { return !has(INV.LINE_KINDS, doc.lines[n - 1].kind); });
      if (unknown.length) {
        errors.push(unknown.length > 1 ? L("eng.issue.kindMany", { lines: listText(unknown) }) : L("eng.issue.kindOne", { line: unknown[0] }));
      }
    }
    else if (doc.type === "avoir" && doc.originId) {
      var origin = documents.filter(function (d) { return d.id === doc.originId; })[0];
      if (origin && total(doc) > total(origin) - credited(documents, origin) + 0.005) {
        errors.push(L("eng.issue.creditOver", { number: origin.number,
          amount: moneyText(total(origin) - credited(documents, origin)) }));
      }
    }
    var last = series(documents, doc.type, String(doc.date).slice(0, 4))[0];
    if (last && doc.date < last.date) {
      errors.push(L("eng.issue.chronology", { number: last.number, date: dayText(last.date) }));
    }
    return errors;
  }

  /** Émission : numéro, statut, coordonnées figées. Renvoie un nouveau document (l'original n'est pas modifié). */
  function issue(documents, doc, me, client, prefixes, now, numbering, opts) {
    var errors = checkIssue(documents, doc, client, opts);
    if (errors.length) return { errors: errors };
    var issued = JSON.parse(JSON.stringify(doc));
    issued.number = nextNumber(documents, doc.type, String(doc.date).slice(0, 4), prefixes, numbering);
    issued.status = doc.type === "devis" ? "sent" : "issued";
    issued.snapshot = { me: JSON.parse(JSON.stringify(me || {})), client: JSON.parse(JSON.stringify(client)) };
    issued.issuedAt = now;
    issued.updatedAt = now;
    return { doc: issued, errors: [] };
  }

  // ----- Statuts ---------------------------------------------------------------

  /**
   * Statut affiché. Facture : draft, unpaid, overdue, partial, paid, cancelled (annulée par avoir).
   * Devis : draft, sent, accepted, refused, invoiced. Avoir : draft, imputed (déduit d'une facture non payée),
   * refund (à rembourser), refunded.
   */
  function state(doc, today, documents) {
    if (doc.status === "draft") return "draft";
    if (doc.type === "devis") return doc.invoiceId ? "invoiced" : doc.status;
    var paid = paidAmount(doc), bal = balance(doc, documents);
    if (doc.type === "avoir") {
      if (bal > 0.005) return "refund";
      return paid > 0 ? "refunded" : "imputed";
    }
    var credit = documents ? credited(documents, doc) : 0;
    if (bal <= 0.005) return paid > 0.005 || credit < total(doc) - 0.005 ? "paid" : "cancelled";
    if (paid > 0 || credit > 0) return dueDate(doc) < today ? "overdue" : "partial";
    return dueDate(doc) < today ? "overdue" : "unpaid";
  }

  /** Contrôle d'un encaissement (ou d'un remboursement pour un avoir). */
  function checkPayment(doc, payment, documents) {
    var errors = [];
    var amount = Number(payment.amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.date || "")) errors.push(L("eng.pay.date"));
    if (!isFinite(amount) || amount <= 0) errors.push(L("eng.pay.positive"));
    else if (amount > balance(doc, documents) + 0.005) errors.push(doc.type === "avoir" ? L("eng.pay.overRefund") : L("eng.pay.overReceipt"));
    if (!country.methods[payment.method]) errors.push(L("eng.pay.method"));
    return errors;
  }

  /** Synthèse par client : encaissé et reste à encaisser. */
  function clientTotals(documents, clientId) {
    var cash = 0, due = 0;
    documents.forEach(function (d) {
      if (d.clientId !== clientId || d.status === "draft") return;
      if (d.type === "facture") { cash += paidAmount(d); due += Math.max(0, balance(d, documents)); }
      if (d.type === "avoir") cash -= paidAmount(d);
    });
    return { cashed: round2(cash), due: round2(due) };
  }

  // ----- Transformations ------------------------------------------------------

  var COPY_FIELDS = ["clientId", "lines", "vat", "nature", "terms", "penalty", "notes"];
  function copyFrom(source, fields) {
    var out = {};
    fields.forEach(function (k) { if (source[k] !== undefined) out[k] = JSON.parse(JSON.stringify(source[k])); });
    return out;
  }

  /** Facture brouillon à partir d'un devis. */
  function invoiceFromQuote(quote, today, id) {
    return Object.assign(copyFrom(quote, COPY_FIELDS), { id: id, type: "facture", status: "draft", date: today, serviceDate: today,
      quoteId: quote.id, payments: [] });
  }

  /** Avoir brouillon à partir d'une facture émise (mêmes lignes, référence de la facture). */
  function creditFromInvoice(invoice, today, id) {
    return Object.assign(copyFrom(invoice, COPY_FIELDS), { id: id, type: "avoir", status: "draft", date: today,
      originId: invoice.id, origin: { number: invoice.number, date: invoice.date }, payments: [] });
  }

  /** Copie modifiable d'un document (nouveau brouillon daté d'aujourd'hui). */
  function duplicate(doc, today, id) {
    // Avoir : la facture d'origine ; devis : la piste (documentation/38-prospects.md), pour qu'un devis revu la suive.
    var extra = doc.type === "avoir" ? ["originId", "origin"] : doc.type === "devis" ? ["prospectId"] : [];
    return Object.assign(copyFrom(doc, COPY_FIELDS.concat(["validity", "depositPct"], extra)), { id: id, type: doc.type, status: "draft",
      date: today, serviceDate: today, payments: [] });
  }

  // ----- Temps passé (documentation/37-temps-passe.md) -------------------------------------------------------

  var TIME_MAX = { hour: 24, day: 1 };
  var NBSP = "\u00a0";
  // Formats des exports et des messages (documentation/60, § 3.1, lot 2c) : ceux de la section, fournis par le pays
  // (country.fmt) et lus au moment des appels. dec : nombre (« 1,5 ») ; dayText : date ; amountText : montant à deux
  // décimales, sans séparateur de milliers ni devise (exports CSV).
  var dec = function (n) { return country.fmt.dec(round2(n)); };
  var dayText = function (d) { return d ? country.fmt.day(String(d)) : ""; };
  var amountText = function (n) { return country.fmt.amount(Number(n)); };
  var moneyText = function (n) { return country.fmt.money(Number(n)); };   // montant avec sa devise, dans un message
  var hasRate = function (t) { return t.rate !== null && t.rate !== undefined && t.rate !== "" && isFinite(Number(t.rate)); };
  var byDate = function (a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || "") < (b.createdAt || "") ? -1 : (a.createdAt || "") > (b.createdAt || "") ? 1 : (a.id < b.id ? -1 : 1);
  };

  /** Durée saisie en heures (1,5 ; 1h30 ; 1 h 30 ; 1:30 ; 45 min) ou en jours (1 ; 0,5) ; NaN si illisible. */
  function parseDuration(text, unit) {
    var s = String(text == null ? "" : text).trim().toLowerCase().replace(/\s+/g, " "), m;
    var decimal = function (v) { return round2(Number(v.replace(",", "."))); };
    if (unit === "day") return (m = /^(\d+(?:[.,]\d+)?) ?(?:j|jours?)?$/.exec(s)) ? decimal(m[1]) : NaN;
    if (unit !== "hour") return NaN;
    if ((m = /^(\d+(?:[.,]\d+)?) ?(?:h|heures?)?$/.exec(s))) return decimal(m[1]);
    if ((m = /^(\d+) ?h ?(?:(\d{1,2}) ?(?:min|mn)?)?$/.exec(s)) || (m = /^(\d+):(\d{2})$/.exec(s))) {
      var min = m[2] ? +m[2] : 0;
      return min < 60 ? round2(+m[1] + min / 60) : NaN;
    }
    if ((m = /^(\d+) ?(?:min|mn)$/.exec(s))) return round2(+m[1] / 60);
    return NaN;
  }

  /** Durée lisible : « 1 h 05 », « 45 min », « 3 h » ; « 0,5 jour », « 2 jours ». */
  function durationLabel(quantity, unit) {
    var q = Number(quantity);
    if (!isFinite(q)) return "";
    if (unit === "day") return q >= 2 ? L("eng.duration.days", { n: dec(q) }) : L("eng.duration.day", { n: dec(q) });
    var min = Math.round(q * 60), h = Math.floor(min / 60), rest = min % 60;
    if (!h) return L("eng.duration.minutes", { n: rest });
    return rest ? L("eng.duration.hoursMinutes", { h: h, m: String(rest).padStart(2, "0") }) : L("eng.duration.hours", { h: h });
  }

  /*
   * Chronomètre (documentation/37-temps-passe.md, § 8) : état { start, elapsed, day, stopped } sur l'appareil ;
   * start : instant du démarrage ou de la reprise (ms, null en pause ou à l'arrêt) ; elapsed : temps cumulé avant ;
   * day : jour du premier démarrage ; stopped : arrêté, durée à saisir.
   */
  var ISO_DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  /** État relu du stockage : null s'il est illisible. */
  function timerCheck(x) {
    if (!x || typeof x !== "object" || !ISO_DAY.test(x.day || "")) return null;
    var elapsed = Number(x.elapsed), start = x.start === null || x.start === undefined ? null : Number(x.start);
    if (!isFinite(elapsed) || elapsed < 0 || (start !== null && !isFinite(start))) return null;
    if (x.stopped && start !== null) return null;
    return { start: start, elapsed: elapsed, day: x.day, stopped: !!x.stopped };
  }
  /** Temps mesuré (ms) ; une horloge reculée ne le rend jamais négatif. */
  function timerElapsed(x, nowMs) {
    if (!x) return 0;
    return Math.max(0, x.elapsed + (x.start === null ? 0 : Math.max(0, nowMs - x.start)));
  }
  function timerStart(nowMs, day) { return { start: nowMs, elapsed: 0, day: day, stopped: false }; }
  function timerPause(x, nowMs) { return { start: null, elapsed: timerElapsed(x, nowMs), day: x.day, stopped: false }; }
  function timerResume(x, nowMs) { return { start: nowMs, elapsed: timerElapsed(x, nowMs), day: x.day, stopped: false }; }
  function timerStop(x, nowMs) { return { start: null, elapsed: timerElapsed(x, nowMs), day: x.day, stopped: true }; }
  /** Affichage du temps écoulé : « 1:05:09 », « 0:00:42 ». */
  function timerClock(ms) {
    var s = Math.floor(Math.max(0, ms) / 1000);
    return Math.floor(s / 3600) + ":" + String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  /**
   * Durée à reporter dans la saisie : minutes arrondies (au moins 1), texte « 1h05 » (lu par parseDuration), jour du
   * démarrage, passage de minuit (today différent du jour du démarrage) et dépassement de 24 heures.
   */
  function timerDuration(x, nowMs, today) {
    var minutes = Math.max(1, Math.round(timerElapsed(x, nowMs) / 60000));
    return { minutes: minutes, input: Math.floor(minutes / 60) + "h" + String(minutes % 60).padStart(2, "0"), date: x.day,
             crossesDay: !!today && today !== x.day, over24: minutes > 24 * 60 };
  }

  /** Erreurs de saisie d'un temps, avec le champ concerné : date, task, unit, duration, clientId, rate. */
  function timeErrors(t) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date || "")) add("date", L("eng.time.date"));
    if (!String(t.task || "").trim()) add("task", L("eng.time.task"));
    var q = Number(t.quantity);
    if (!Object.prototype.hasOwnProperty.call(TIME_MAX, t.unit)) add("unit", L("eng.time.unit"));
    else if (!(isFinite(q) && q > 0)) add("duration", t.unit === "day" ? L("eng.time.durationDays") : L("eng.time.durationHours"));
    else if (q > TIME_MAX[t.unit]) add("duration", t.unit === "day" ? L("eng.time.maxDay") : L("eng.time.maxHours"));
    if (t.billable !== false && !t.clientId) add("clientId", L("eng.time.client"));
    if (t.rate !== null && t.rate !== undefined && t.rate !== "" && !(isFinite(Number(t.rate)) && Number(t.rate) >= 0)) add("rate", L("eng.time.rate"));
    return errors;
  }
  function checkTime(t) { return timeErrors(t).map(function (e) { return e.message; }); }

  /** État calculé d'un temps : internal (non facturable), unbilled (à facturer), draft (dans un brouillon), invoiced. */
  function timeState(t, documents) {
    if (t.billable === false) return "internal";
    var d = t.invoiceId ? (documents || []).filter(function (x) { return x && x.id === t.invoiceId; })[0] : null;
    if (!d) return "unbilled";
    return d.status === "draft" ? "draft" : "invoiced";
  }

  /** Dernier taux saisi pour ce client et cette unité (date, puis ordre de saisie), ou null. */
  function lastRate(entries, clientId, unit) {
    var list = (entries || []).filter(function (t) { return t && clientId && t.clientId === clientId && t.unit === unit && hasRate(t); }).sort(byDate);
    return list.length ? Number(list[list.length - 1].rate) : null;
  }

  /** Lignes de facture : une par tâche (tâche, unité et taux identiques regroupés, avec la période) ou une par saisie. */
  function timeInvoiceLines(entries, mode) {
    var list = (entries || []).filter(Boolean).slice().sort(byDate);
    var price = function (t) { return hasRate(t) ? Number(t.rate) : NaN; };
    if (mode === "entry") {
      return list.map(function (t) { return { desc: String(t.task || "").trim() + " — " + dayText(t.date), qty: round2(t.quantity), unit: t.unit, price: price(t) }; });
    }
    var groups = [], index = {};
    list.forEach(function (t) {
      var key = nameKey(t.task) + "|" + t.unit + "|" + (hasRate(t) ? Number(t.rate) : "");
      if (!index[key]) { index[key] = { task: String(t.task || "").trim(), unit: t.unit, price: price(t), qty: 0, first: t.date, last: t.date }; groups.push(index[key]); }
      var g = index[key];
      g.qty += Number(t.quantity) || 0;
      g.last = t.date;
    });
    return groups.map(function (g) {
      return { desc: g.task + " — " + (g.first === g.last ? dayText(g.first) : L("eng.time.span", { from: dayText(g.first), to: dayText(g.last) })),
               qty: round2(g.qty), unit: g.unit, price: g.price };
    });
  }

  /** Montant HT d'une liste de lignes (comme le moteur de facture : chaque ligne arrondie au centime). */
  var linesAmount = function (lines) {
    return round2(lines.reduce(function (s, l) { return s + (isFinite(l.price) ? round2(l.qty * l.price) : 0); }, 0));
  };

  /** Brouillon de facture à partir de temps : lignes et date de la prestation (dernière saisie reprise). */
  function timeInvoice(entries, mode) {
    var dates = (entries || []).filter(Boolean).map(function (t) { return t.date; }).sort();
    return { lines: timeInvoiceLines(entries, mode), serviceDate: dates[dates.length - 1] || "" };
  }

  /** Temps d'une période (le plus récent en haut) et totaux : heures, jours, part facturable, montant facturable. */
  function timeSummary(entries, documents, from, to) {
    var rows = (entries || []).filter(function (t) { return t && t.date && (!from || t.date >= from) && (!to || t.date <= to); })
      .sort(byDate).reverse().map(function (t) {
        return { id: t.id, date: t.date, clientId: t.clientId || "", task: t.task || "", unit: t.unit, quantity: round2(t.quantity),
                 rate: hasRate(t) ? Number(t.rate) : null, amount: hasRate(t) && t.billable !== false ? round2(t.quantity * t.rate) : null,
                 billable: t.billable !== false, state: timeState(t, documents) };
      });
    var sum = function (list, unit) { return round2(list.reduce(function (s, r) { return s + (r.unit === unit ? r.quantity : 0); }, 0)); };
    var billable = rows.filter(function (r) { return r.billable; });
    return { rows: rows, hours: sum(rows, "hour"), days: sum(rows, "day"),
             billable: { hours: sum(billable, "hour"), days: sum(billable, "day"),
                         amount: round2(billable.reduce(function (s, r) { return s + (r.amount || 0); }, 0)),
                         missingRate: billable.filter(function (r) { return r.rate === null; }).length } };
  }

  /** Temps à facturer, par client : saisies (les plus anciennes d'abord), heures, jours, montant de la facture par tâche. */
  function unbilledByClient(entries, documents) {
    var out = [], index = {};
    (entries || []).filter(function (t) { return t && t.clientId && timeState(t, documents) === "unbilled"; }).sort(byDate).forEach(function (t) {
      if (!index[t.clientId]) { index[t.clientId] = { clientId: t.clientId, entries: [] }; out.push(index[t.clientId]); }
      index[t.clientId].entries.push(t);
    });
    return out.map(function (c) {
      var s = timeSummary(c.entries, documents);
      return { clientId: c.clientId, entries: c.entries, hours: s.hours, days: s.days,
               amount: linesAmount(timeInvoiceLines(c.entries, "task")), missingRate: s.billable.missingRate };
    });
  }

  function timeCSV(rows, clientName) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var lines = [csvHeader("eng.csv.time")];
    rows.forEach(function (r) {
      lines.push([dayText(r.date), q(clientName(r.clientId)), q(r.task), dec(r.quantity), r.unit === "day" ? L("eng.csv.day") : L("eng.csv.hour"),
                  r.rate === null ? "" : amountText(r.rate), r.amount === null ? "" : amountText(r.amount),
                  r.billable ? L("eng.csv.yes") : L("eng.csv.no")].join(csvSep()));
    });
    return lines.join("\r\n");
  }

  // ----- Prospects (documentation/38-prospects.md) ------------------------------------------------------------

  var STAGE_LABELS = labels("eng.stage.", ["new", "talks", "quote", "won", "lost"]);
  var STAGE_RANK = { new: 0, talks: 1, quote: 2, won: 3 };
  var OPEN_STAGES = ["new", "talks", "quote"];
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var isDay = function (d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
    return !!m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= lastDay(+m[1], +m[2]);
  };
  var blank = function (v) { return v === null || v === undefined || v === ""; };

  /** Erreurs de saisie d'une fiche, avec le champ concerné : name, email, value, nextDate, stage. */
  function prospectErrors(p) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!String(p.name || "").trim()) add("name", L("eng.prospect.name"));
    if (String(p.email || "").trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(p.email).trim())) add("email", L("eng.prospect.email"));
    if (!blank(p.value) && !(isFinite(Number(p.value)) && Number(p.value) >= 0)) add("value", L("eng.prospect.value"));
    if (!blank(p.nextDate) && !isDay(p.nextDate)) add("nextDate", L("eng.prospect.nextDate"));
    if (!has(STAGE_LABELS, p.stage)) add("stage", L("eng.prospect.stage"));
    return errors;
  }

  /** Erreurs d'un échange noté : date (aujourd'hui au plus), sens (me ou them), résumé. */
  function exchangeErrors(x, today) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!isDay(x.date)) add("date", L("eng.exchange.date"));
    else if (x.date > today) add("date", L("eng.exchange.future"));
    if (x.from !== "me" && x.from !== "them") add("from", L("eng.exchange.from"));
    if (!String(x.text || "").trim()) add("text", L("eng.exchange.text"));
    return errors;
  }

  /** Devis faits depuis une piste (brouillons compris), les plus anciens d'abord. */
  function prospectQuotes(p, documents) {
    return (documents || []).filter(function (d) { return d && d.type === "devis" && d.prospectId && d.prospectId === p.id; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.issuedAt || "") < String(b.issuedAt || "") ? -1 : 1; });
  }

  /** Étape que les devis et les échanges imposent, sans tenir compte du choix de l'utilisateur. */
  function minStage(p, documents) {
    var quotes = prospectQuotes(p, documents).filter(function (d) { return d.status !== "draft"; });
    if (quotes.some(function (d) { return d.status === "accepted" || d.invoiceId; })) return "won";
    if (quotes.length) return "quote";
    return (p.exchanges || []).some(function (x) { return x && !x.deletedAt; }) ? "talks" : "new";
  }

  /** Étape affichée : « Perdu » choisi reste ; sinon la plus avancée du choix et de minStage (« Gagné » choisi l'est déjà). */
  function prospectStage(p, documents) {
    if (p.stage === "lost") return "lost";
    var auto = minStage(p, documents), chosen = has(STAGE_RANK, p.stage) ? p.stage : "new";
    return STAGE_RANK[auto] > STAGE_RANK[chosen] ? auto : chosen;
  }

  /**
   * Date de clôture d'une piste (documentation/55, § 7) : « Perdu » : closedAt ; « Gagné » : la plus ancienne de closedAt
   * (si « Gagné » a été choisi), des dates de décision de ses devis acceptés ou facturés et, pour un devis facturé sans
   * date de décision, de la date de la facture ; piste ouverte ou aucune date connue : null.
   */
  function prospectClosedAt(p, documents) {
    var stage = prospectStage(p, documents);
    if (stage === "lost") return isDay(p.closedAt) ? p.closedAt : null;
    if (stage !== "won") return null;
    var dates = [];
    if (p.stage === "won" && isDay(p.closedAt)) dates.push(p.closedAt);
    prospectQuotes(p, documents).forEach(function (q) {
      if (q.status === "draft" || !(q.status === "accepted" || q.invoiceId)) return;
      if (isDay(q.decidedAt)) { dates.push(q.decidedAt); return; }
      var inv = q.invoiceId ? (documents || []).filter(function (d) { return d && d.id === q.invoiceId; })[0] : null;
      if (inv && isDay(inv.date)) dates.push(inv.date);
    });
    return dates.length ? dates.sort()[0] : null;
  }

  /** Valeur : montant HT du dernier devis émis, sinon le montant estimé (ou null). */
  function prospectValue(p, documents) {
    var quotes = prospectQuotes(p, documents).filter(function (d) { return d.status !== "draft"; });
    if (quotes.length) return INV.compute(quotes[quotes.length - 1]).ht; // déjà arrondi au centime
    return blank(p.value) || !isFinite(Number(p.value)) ? null : round2(Number(p.value));
  }

  /** Nombre et valeur des pistes par étape, et des pistes ouvertes. */
  function pipeline(prospects, documents) {
    var out = { open: { count: 0, value: 0 } };
    Object.keys(STAGE_LABELS).forEach(function (k) { out[k] = { count: 0, value: 0 }; });
    (prospects || []).forEach(function (p) {
      var s = prospectStage(p, documents), v = prospectValue(p, documents) || 0;
      out[s].count++;
      out[s].value = round2(out[s].value + v);
      if (OPEN_STAGES.indexOf(s) > -1) { out.open.count++; out.open.value = round2(out.open.value + v); }
    });
    return out;
  }

  /** Pistes ouvertes dont la relance est due (aujourd'hui ou avant), la plus ancienne d'abord, puis par nom. */
  function followUps(prospects, documents, today) {
    return (prospects || []).filter(function (p) {
      return p.nextDate && p.nextDate <= today && OPEN_STAGES.indexOf(prospectStage(p, documents)) > -1;
    }).sort(function (a, b) {
      return a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : compare(a.name, b.name);
    });
  }

  /** Date du dernier échange de sa part (le plus récent), ou "". */
  function lastContactFrom(p) {
    return (p.exchanges || []).reduce(function (last, x) {
      return x && !x.deletedAt && x.from === "them" && isDay(x.date) && x.date > last ? x.date : last;
    }, "");
  }

  /** Même jour n années plus tard ; un 29 février donne le 28 février d'une année non bissextile. */
  function addYears(date, n) {
    var y = +date.slice(0, 4) + n, m = +date.slice(5, 7), d = Math.min(+date.slice(8, 10), lastDay(y, m));
    return iso(y, m, d);
  }

  /**
   * Pistes non gagnées dont la durée de conservation est atteinte (CNIL : years ans après la collecte ou le dernier
   * contact émanant du prospect) : { prospect, since, due }.
   */
  function retentionDue(prospects, documents, today, years) {
    var out = [];
    (prospects || []).forEach(function (p) {
      if (prospectStage(p, documents) === "won") return;
      var since = lastContactFrom(p) || String(p.createdAt || "").slice(0, 10);
      if (!isDay(since)) return;
      var due = addYears(since, years);
      if (due <= today) out.push({ prospect: p, since: since, due: due });
    });
    return out;
  }

  /** Textes normalisés à hacher pour la liste d'opposition : "e:" email, "t:" téléphone, "n:" nom. */
  function optoutKeys(p) {
    var keys = [], email = String(p.email || "").trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+$/.test(email)) keys.push("e:" + email);
    var raw = String(p.phone || "").trim(), digits = raw.replace(/\(0\)/g, "").replace(/\D/g, ""), phone = "";
    if (digits.length >= 6) {
      var intl = raw.charAt(0) === "+" ? digits : digits.slice(0, 2) === "00" ? digits.slice(2) : null;
      phone = intl === null ? digits : intl.slice(0, 2) === "33" ? "0" + intl.slice(2) : "+" + intl;
      keys.push("t:" + phone);
    }
    var name = String(p.name || "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
    if (name) keys.push("n:" + name);
    return keys;
  }

  function prospectsCSV(prospects, documents) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var lines = [csvHeader("eng.csv.prospects")];
    (prospects || []).forEach(function (p) {
      var v = prospectValue(p, documents);
      lines.push([q(p.name), q(p.contact), p.pro === false ? L("eng.prospect.person") : L("eng.prospect.pro"), q(p.email), q(p.phone), q(p.source),
                  STAGE_LABELS[prospectStage(p, documents)], v === null ? "" : amountText(v), dayText(p.nextDate), q(p.nextAction),
                  dayText(lastContactFrom(p)), dayText(String(p.createdAt || "").slice(0, 10))].join(csvSep()));
    });
    return lines.join("\r\n");
  }


  // ----- Trésorerie : parties communes (documentation/39-tresorerie.md) ; les impôts et cotisations sont au pays ----

  var EVERY = { month: 1, quarter: 3, year: 12 };

  var CHARGE_LABELS = labels("eng.every.", ["month", "quarter", "year", "once"]);

  /** Sens d'un mouvement prévu : sortie (charge) par défaut, entrée si flow vaut "in" (documentation/39, § 7). */
  var isIn = function (c) { return !!c && c.flow === "in"; };

  /** Même jour n mois plus tard ; un jour qui n'existe pas devient le dernier jour du mois. */
  function addMonths(date, n) {
    var m = +date.slice(5, 7) - 1 + n, y = +date.slice(0, 4) + Math.floor(m / 12);
    m = ((m % 12) + 12) % 12 + 1;
    return iso(y, m, Math.min(+date.slice(8, 10), lastDay(y, m)));
  }

  var monthStart = function (d) { return d.slice(0, 8) + "01"; };

  var monthEnd = function (d) { return iso(+d.slice(0, 4), +d.slice(5, 7), lastDay(+d.slice(0, 4), +d.slice(5, 7))); };

  /** Échéances d'une charge régulière comprises entre from et to (bornes comprises). */
  function chargeDates(c, from, to) {
    if (c.every === "once") return isDay(c.start) && c.start >= from && c.start <= to ? [c.start] : [];
    var step = has(EVERY, c.every) ? EVERY[c.every] : 0, out = [];
    if (!step || !isDay(c.start)) return out;
    // Saute directement près de from (charge ancienne) sans dériver : chaque date part de la première échéance.
    var skip = Math.max(0, Math.floor(((+from.slice(0, 4) - +c.start.slice(0, 4)) * 12 + (+from.slice(5, 7) - +c.start.slice(5, 7))) / step) - 1);
    for (var i = skip; ; i++) {
      var d = addMonths(c.start, i * step);
      if (d > to || (c.end && d > c.end)) break;
      if (d >= from) out.push(d);
    }
    return out;
  }

  /** Erreurs de saisie d'une charge régulière : label, amount, every, start, end. */
  function chargeErrors(c) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!String(c.label || "").trim()) add("label", L("eng.charge.label"));
    if (!(isFinite(Number(c.amount)) && Number(c.amount) > 0)) add("amount", L("eng.charge.amount"));
    if (!has(EVERY, c.every) && c.every !== "once") add("every", L("eng.charge.every"));
    if (!blank(c.flow) && c.flow !== "in" && c.flow !== "out") add("flow", L("eng.charge.flow"));
    if (!isDay(c.start)) add("start", c.every === "once" ? L("eng.charge.dateOnce") : L("eng.charge.dateNext"));
    else if (c.every !== "once" && !blank(c.end) && (!isDay(c.end) || c.end < c.start)) add("end", L("eng.charge.end"));
    return errors;
  }

  /** Factures émises non soldées, à leur échéance (en retard : aujourd'hui) ; avoirs à rembourser (sortie aujourd'hui). */
  function expectedReceipts(documents, today) {
    var out = [];
    (documents || []).forEach(function (d) {
      if (!d || d.status === "draft" || (d.type !== "facture" && d.type !== "avoir")) return;
      var st = state(d, today, documents);
      if (d.type === "facture" && (st === "unpaid" || st === "overdue" || st === "partial")) {
        var due = dueDate(d);
        out.push({ doc: d, amount: balance(d, documents), date: due < today ? today : due, late: due < today });
      } else if (d.type === "avoir" && st === "refund") {
        out.push({ doc: d, amount: -balance(d, documents), date: today, late: false });
      }
    });
    return out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : order(a.doc) < order(b.doc) ? -1 : 1; });
  }

  /**
   * Courbe du solde prévu : aujourd'hui (solde saisi), puis le solde de fin de chaque jour qui a un mouvement ;
   * point bas (le premier s'il y en a plusieurs) et solde final. null sans solde saisi.
   */
  function balanceCurve(f) {
    if (!f || f.start === null || f.start === undefined) return null;
    var bal = f.start, points = [{ date: f.today, balance: bal }];
    f.items.forEach(function (x, i) {
      bal = round2(bal + x.amount);
      var next = f.items[i + 1];
      if (!next || next.date !== x.date) points.push({ date: x.date, balance: bal });
    });
    var low = points.reduce(function (m, pt) { return pt.balance < m.balance ? pt : m; }, points[0]);
    return { points: points, low: low, end: bal };
  }

  /** Ce qui peut sortir aujourd'hui sans que le solde prévu passe sous le seuil : point bas − seuil, au moins 0. */
  function safeAmount(curve, threshold) {
    if (!curve) return null;
    return Math.max(0, round2(curve.low.balance - Math.max(0, Number(threshold) || 0)));
  }

  var daysBetween = function (a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); };

  var avg = function (list) { return list.length ? Math.round(list.reduce(function (s, v) { return s + v; }, 0) / list.length * 10) / 10 : null; };

  /**
   * Délais de paiement des factures soldées par un paiement entre from et to (date du dernier paiement) : délai moyen
   * depuis la date de la facture, retard moyen après l'échéance (un paiement en avance compte 0), part payée à l'heure ;
   * même calcul par client. Factures annulées par avoir exclues.
   */
  function paymentStats(documents, from, to) {
    var all = [], byClient = {};
    (documents || []).forEach(function (d) {
      if (!d || d.type !== "facture" || d.status === "draft" || state(d, to, documents) !== "paid") return;
      var last = payments(d).map(function (p) { return p.date; }).sort().pop();
      if (!last || last < from || last > to) return;
      var row = { days: Math.max(0, daysBetween(d.date, last)), late: Math.max(0, daysBetween(dueDate(d), last)) };
      all.push(row);
      (byClient[d.clientId] = byClient[d.clientId] || []).push(row);
    });
    var summary = function (rows) {
      return { count: rows.length, avgDays: avg(rows.map(function (r) { return r.days; })), avgLate: avg(rows.map(function (r) { return r.late; })),
               onTime: rows.length ? Math.round(rows.filter(function (r) { return r.late === 0; }).length / rows.length * 100) / 100 : null };
    };
    var out = summary(all);
    out.byClient = {};
    Object.keys(byClient).forEach(function (k) { out.byClient[k] = summary(byClient[k]); });
    return out;
  }

  var AGING = [["notDue", L("eng.aging.notDue"), -Infinity, 0], ["d30", L("eng.aging.d30"), 1, 30], ["d60", L("eng.aging.d60"), 31, 60],
               ["d90", L("eng.aging.d90"), 61, 90], ["more", L("eng.aging.more"), 91, Infinity]];

  /** Factures émises non soldées par ancienneté du retard ; les plus en retard d'abord. */
  function aging(documents, today) {
    var buckets = AGING.map(function (b) { return { key: b[0], label: b[1], amount: 0, count: 0 }; }), items = [];
    (documents || []).forEach(function (d) {
      if (!d || d.type !== "facture" || d.status === "draft") return;
      var st = state(d, today, documents);
      if (st !== "unpaid" && st !== "partial" && st !== "overdue") return;
      var due = dueDate(d), late = Math.max(0, daysBetween(due, today)), amount = balance(d, documents);
      var i = AGING.findIndex(function (b) { return late >= b[2] && late <= b[3]; });
      buckets[i].amount = round2(buckets[i].amount + amount);
      buckets[i].count++;
      items.push({ doc: d, amount: amount, due: due, lateDays: late, bucket: AGING[i][0] });
    });
    items.sort(function (a, b) { return b.lateDays - a.lateDays || (a.due < b.due ? -1 : 1); });
    var sum = function (list) { return round2(list.reduce(function (s, b) { return s + b.amount; }, 0)); };
    return { total: sum(buckets), late: sum(buckets.slice(1)), lateCount: buckets.slice(1).reduce(function (s, b) { return s + b.count; }, 0),
             buckets: buckets, items: items };
  }

  /** Sorties régulières ramenées au mois (trimestre ÷ 3, année ÷ 12) ; charges terminées, ponctuelles et entrées exclues. */
  function monthlyCharges(charges, today) {
    return round2((charges || []).reduce(function (s, c) {
      if (!c || isIn(c) || !has(EVERY, c.every) || (c.end && c.end < today)) return s;
      return s + (Number(c.amount) || 0) / EVERY[c.every];
    }, 0));
  }

  /** Mois couverts par le disponible au rythme des charges mensuelles (une décimale) ; null sans charges. */
  function runway(available, monthly) {
    if (available === null || available === undefined || !(monthly > 0)) return null;
    return Math.max(0, Math.floor(available / monthly * 10) / 10);
  }

  /** Devis acceptés pas encore facturés : nombre et montant TTC. */
  function quotesToInvoice(documents) {
    var list = (documents || []).filter(function (d) { return d && d.type === "devis" && d.status === "accepted" && !d.invoiceId; });
    return { count: list.length, amount: round2(list.reduce(function (s, d) { return s + total(d); }, 0)) };
  }

  var FLOW_KINDS = labels("eng.flow.", ["receipt", "refund", "urssaf", "vat", "charge", "planned"]);

  /** Export de la prévision : date, nature, libellé, montant et solde après le mouvement (si un solde est saisi). */
  function forecastCSV(f) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var bal = f.start, lines = [csvHeader("eng.csv.forecast")];
    if (bal !== null) lines.push([dayText(f.today), q(L("eng.csv.forecastStart")), q(""), "", amountText(bal)].join(csvSep()));
    f.items.forEach(function (x) {
      if (bal !== null) bal = round2(bal + x.amount);
      lines.push([dayText(x.date), q(FLOW_KINDS[x.kind] || x.kind), q(x.label), amountText(x.amount), bal === null ? "" : amountText(bal)].join(csvSep()));
    });
    return lines.join("\r\n");
  }


  // ----- Périodes, encaissé, historique et prévision (communs ; documentation/60, § 3.3, D92) --------------------
  // Le pays fournit son livre des encaissements (country.receipts : lignes { date, amount }, remboursements en
  // négatif) et le total de ses dépenses d'une période (country.expenseTotal), lus au moment des appels.

  var MONTHS = L("eng.months").split("|");
  /** Période d'une clé « 2026-09 » ou « 2026-T3 » : dates de début et de fin, libellé. */
  function period(key) {
    var m = /^(\d{4})-(\d{2})$/.exec(key), q = /^(\d{4})-T([1-4])$/.exec(key);
    if (m) {
      var y = +m[1], mo = +m[2];
      return { key: key, start: iso(y, mo, 1), end: iso(y, mo, lastDay(y, mo)), label: L("eng.period.month", { month: MONTHS[mo - 1], year: y }) };
    }
    if (q) {
      var yq = +q[1], n = +q[2], first = 3 * n - 2;
      return { key: key, start: iso(yq, first, 1), end: iso(yq, first + 2, lastDay(yq, first + 2)),
               label: n === 1 ? L("eng.period.quarterFirst", { n: n, year: yq }) : L("eng.period.quarter", { n: n, year: yq }) };
    }
    return null;
  }
  /** Encaissé net d'une période (remboursements déduits), d'après le livre des encaissements du pays. */
  function cashed(documents, from, to) {
    return round2(country.receipts(documents, from, to).reduce(function (s, r) { return s + r.amount; }, 0));
  }
  /** Par mois entre from et to : encaissements nets (remboursements déduits) et dépenses saisies. */
  function cashHistory(documents, expenses, from, to) {
    var rows = country.receipts(documents || [], from, to), out = [];
    for (var m = monthStart(from); m <= to; m = addMonths(m, 1)) {
      var end = monthEnd(m), inflow = 0;
      rows.forEach(function (r) { if (r.date >= m && r.date <= end) inflow += r.amount; });
      var outflow = country.expenseTotal(expenses, m < from ? from : m, end < to ? end : to);
      out.push({ key: m.slice(0, 7), label: period(m.slice(0, 7)).label, in: round2(inflow), out: outflow, net: round2(inflow - outflow) });
    }
    return out;
  }
  /**
   * Prévision sur input.months mois (mois en cours compris) : encaissements attendus (scénario prudent : factures déjà
   * en retard non comptées, les autres avec le retard moyen du client), entrées prévues, flux d'impôt du pays
   * (taxes({ receipts, plannedRevenue, until }) : mouvements { date, kind, amount, label }), charges régulières ; solde
   * de fin de chaque mois à partir du solde saisi (profile.cashBalance).
   */
  function forecastWith(input, taxes) {
    var p = input.profile || {}, today = input.today, docs = input.documents || [];
    var n = Math.min(12, Math.max(1, Math.round(Number(input.months)) || 6)), prudent = input.scenario === "prudent";
    var until = monthEnd(addMonths(monthStart(today), n - 1)), items = [];
    var receipts = expectedReceipts(docs, today);
    if (prudent) {
      // Scénario prudent : factures déjà en retard non comptées ; les autres arrivent avec le retard moyen constaté
      // du client sur 12 mois (à défaut, le retard moyen de tous les clients ; documentation/39, § 7).
      var stats = paymentStats(docs, addMonths(today, -12), today);
      receipts = receipts.filter(function (r) { return !r.late; }).map(function (r) {
        if (r.amount < 0) return r;
        var c = stats.byClient[r.doc.clientId], delay = Math.round(c ? c.avgLate : stats.avgLate || 0);
        return delay > 0 ? Object.assign({}, r, { date: INV.addDays(r.date, delay), delay: delay }) : r;
      });
    }
    receipts = receipts.filter(function (r) { return r.date <= until; });
    receipts.forEach(function (r) {
      var who = (r.doc.snapshot && r.doc.snapshot.client && r.doc.snapshot.client.name) || "";
      items.push({ date: r.date, kind: r.amount < 0 ? "refund" : "receipt", amount: r.amount, late: r.late, docId: r.doc.id, delay: r.delay || 0,
                   label: (r.doc.type === "avoir" ? L("eng.forecast.refund", { number: r.doc.number }) : L("eng.forecast.invoice", { number: r.doc.number })) +
                     (who ? " (" + who + ")" : "") });
    });
    // Entrées prévues de chiffre d'affaires (mouvements prévus « revenue ») : comptées comme des encaissements.
    var plannedRevenue = [];
    (input.charges || []).forEach(function (c) {
      if (isIn(c) && c.revenue) chargeDates(c, today, until).forEach(function (d) { plannedRevenue.push({ date: d, amount: round2(Number(c.amount)) }); });
    });
    // Flux d'impôt du pays (France : cotisations Urssaf et TVA ; États-Unis : acomptes trimestriels).
    if (taxes) taxes({ receipts: receipts, plannedRevenue: plannedRevenue, until: until }).forEach(function (x) { items.push(x); });
    (input.charges || []).forEach(function (c) {
      chargeDates(c, today, until).forEach(function (d) {
        var amount = round2(Number(c.amount));
        items.push({ date: d, kind: isIn(c) ? "planned" : "charge", amount: isIn(c) ? amount : -amount, label: c.label, chargeId: c.id });
      });
    });
    items.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var start = blank(p.cashBalance) || !isFinite(Number(p.cashBalance)) ? null : round2(Number(p.cashBalance));
    var bal = start, months = [], negative = null;
    for (var i = 0; i < n; i++) {
      var ms = addMonths(monthStart(today), i), me = monthEnd(ms);
      var list = items.filter(function (x) { return x.date >= ms && x.date <= me; });
      var inflow = round2(list.reduce(function (s, x) { return s + (x.amount > 0 ? x.amount : 0); }, 0));
      var outflow = round2(list.reduce(function (s, x) { return s - (x.amount < 0 ? x.amount : 0); }, 0));
      if (bal !== null) bal = round2(bal + inflow - outflow);
      if (bal !== null && bal < 0 && negative === null) negative = ms.slice(0, 7);
      months.push({ key: ms.slice(0, 7), label: period(ms.slice(0, 7)).label, start: ms, end: me, items: list, in: inflow, out: outflow, balance: bal });
    }
    var lastEvent = (input.events || []).reduce(function (m, e) { return e.date > m ? e.date : m; }, "");
    return { start: start, today: today, until: until, scenario: prudent ? "prudent" : "prevu", items: items, months: months,
             negative: negative, calendarShort: lastEvent < until };
  }

  return { compare: compare, csvSep: csvSep, csvHeader: csvHeader, EVERY: EVERY, period: period, cashed: cashed, cashHistory: cashHistory, forecastWith: forecastWith, CHARGE_LABELS: CHARGE_LABELS, isIn: isIn, addMonths: addMonths, monthStart: monthStart, monthEnd: monthEnd, chargeDates: chargeDates, chargeErrors: chargeErrors, expectedReceipts: expectedReceipts, balanceCurve: balanceCurve, safeAmount: safeAmount, daysBetween: daysBetween, avg: avg, paymentStats: paymentStats, AGING: AGING, aging: aging, monthlyCharges: monthlyCharges, runway: runway, quotesToInvoice: quotesToInvoice, FLOW_KINDS: FLOW_KINDS, forecastCSV: forecastCSV,
           series: series, seriesPrefix: seriesPrefix, nextNumber: nextNumber, continuation: continuation, checkIssue: checkIssue, issue: issue, state: state, checkPayment: checkPayment, clientTotals: clientTotals, COPY_FIELDS: COPY_FIELDS, copyFrom: copyFrom, invoiceFromQuote: invoiceFromQuote, creditFromInvoice: creditFromInvoice, duplicate: duplicate,
           nameKey: nameKey, listText: listText, labels: labels, round2: round2, lastDay: lastDay, iso: iso, total: total, payments: payments, paidAmount: paidAmount,
           credited: credited, balance: balance, dueDate: dueDate, order: order, TIME_MAX: TIME_MAX, NBSP: NBSP, dec: dec, dayText: dayText, amountText: amountText,
           hasRate: hasRate, byDate: byDate, parseDuration: parseDuration, durationLabel: durationLabel, ISO_DAY: ISO_DAY, timerCheck: timerCheck,
           timerElapsed: timerElapsed, timerStart: timerStart, timerPause: timerPause, timerResume: timerResume, timerStop: timerStop,
           timerClock: timerClock, timerDuration: timerDuration, timeErrors: timeErrors, checkTime: checkTime, timeState: timeState,
           lastRate: lastRate, timeInvoiceLines: timeInvoiceLines, linesAmount: linesAmount, timeInvoice: timeInvoice, timeSummary: timeSummary,
           unbilledByClient: unbilledByClient, timeCSV: timeCSV, STAGE_LABELS: STAGE_LABELS, STAGE_RANK: STAGE_RANK, OPEN_STAGES: OPEN_STAGES,
           has: has, isDay: isDay, blank: blank, prospectErrors: prospectErrors, exchangeErrors: exchangeErrors, prospectQuotes: prospectQuotes,
           minStage: minStage, prospectStage: prospectStage, prospectClosedAt: prospectClosedAt, prospectValue: prospectValue, pipeline: pipeline,
           followUps: followUps, lastContactFrom: lastContactFrom, addYears: addYears, retentionDue: retentionDue, optoutKeys: optoutKeys,
           prospectsCSV: prospectsCSV };
});
