/*
 * Moteur : cœur commun de l'Espace entrepreneur, tous pays (documentation/60-espace-etats-unis.md, § 3.1, décision D88).
 * Fonctions pures sur les données de l'Espace, sans règle propre à un pays : montants et soldes des documents, ordre
 * d'émission, temps passé (documentation/37) et prospects (documentation/38). C'est une fabrique : chaque moteur de pays
 * (engines/espace-fr.js…) l'appelle avec son moteur de facture (INV) et la fonction L des textes de la langue de la
 * section ; il en reprend les fonctions sous leur nom. Testé par les tests du moteur français.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else (root.OFE = root.OFE || {}).espaceCore = factory;
})(typeof self !== "undefined" ? self : this, function (INV, L) {
  "use strict";

  /** « 1, 2 et 3 » : liste de numéros dans la langue de la section. */
  function listText(items) { return items.length > 1 ? items.slice(0, -1).join(", ") + L("eng.listAnd") + items[items.length - 1] : String(items[0]); }

  /** Libellés traduits des clés : { clé: L(préfixe + clé) } (l'ordre des clés est celui de la liste). */
  var labels = function (prefix, keys) { var o = {}; keys.forEach(function (k) { o[k] = L(prefix + k); }); return o; };

  /** Clé de comparaison d'un nom (espaces réduits, minuscules). */
  var nameKey = function (s) { return String(s || "").trim().replace(/\s+/g, " ").toLowerCase(); };
  var round2 = function (n) { return Math.round(n * 100) / 100; };

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

  // ----- Temps passé (documentation/37-temps-passe.md) -------------------------------------------------------

  var TIME_MAX = { hour: 24, day: 1 };
  var NBSP = "\u00a0";
  var dec = function (n) { return String(round2(n)).replace(".", ","); };
  var frDay = function (d) { return String(d || "").split("-").reverse().join("/"); };
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
      return list.map(function (t) { return { desc: String(t.task || "").trim() + " — " + frDay(t.date), qty: round2(t.quantity), unit: t.unit, price: price(t) }; });
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
      return { desc: g.task + " — " + (g.first === g.last ? frDay(g.first) : "du " + frDay(g.first) + " au " + frDay(g.last)),
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
    var lines = [L("eng.csv.time")];
    rows.forEach(function (r) {
      lines.push([frDay(r.date), q(clientName(r.clientId)), q(r.task), dec(r.quantity), r.unit === "day" ? L("eng.csv.day") : L("eng.csv.hour"),
                  r.rate === null ? "" : r.rate.toFixed(2).replace(".", ","), r.amount === null ? "" : r.amount.toFixed(2).replace(".", ","),
                  r.billable ? L("eng.csv.yes") : L("eng.csv.no")].join(";"));
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
      return a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : String(a.name || "").localeCompare(String(b.name || ""), "fr");
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
    var lines = [L("eng.csv.prospects")];
    (prospects || []).forEach(function (p) {
      var v = prospectValue(p, documents);
      lines.push([q(p.name), q(p.contact), p.pro === false ? L("eng.prospect.person") : L("eng.prospect.pro"), q(p.email), q(p.phone), q(p.source),
                  STAGE_LABELS[prospectStage(p, documents)], v === null ? "" : v.toFixed(2).replace(".", ","), frDay(p.nextDate), q(p.nextAction),
                  frDay(lastContactFrom(p)), frDay(String(p.createdAt || "").slice(0, 10))].join(";"));
    });
    return lines.join("\r\n");
  }

  return { nameKey: nameKey, listText: listText, labels: labels, round2: round2, lastDay: lastDay, iso: iso, total: total, payments: payments, paidAmount: paidAmount,
           credited: credited, balance: balance, dueDate: dueDate, order: order, TIME_MAX: TIME_MAX, NBSP: NBSP, dec: dec, frDay: frDay,
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
