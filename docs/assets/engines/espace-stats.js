/*
 * Moteur : indicateurs des onglets de l'Espace (documentation/55-indicateurs-espace.md). Fonctions pures sur les données
 * de l'Espace ; s'appuie sur le moteur de l'Espace (OFE.espaceFR) pour les encaissements, statuts et soldes.
 * Testé par tests/unit/espace-stats.test.mjs.
 */
(function (root, factory) {
  var api = factory(root.OFE && root.OFE.espaceFR ? root.OFE.espaceFR : require("./espace-fr.js"),
                    root.OFE && root.OFE.invoiceFR ? root.OFE.invoiceFR : require("./invoice-fr.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).espaceStats = api;
})(typeof self !== "undefined" ? self : this, function (E, INV) {
  "use strict";

  var round2 = function (n) { return Math.round(n * 100) / 100; };
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var lastDay = function (y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

  /** Même jour un an plus tôt (le 29 février devient le 28). */
  function lastYear(day) {
    var y = +day.slice(0, 4) - 1, m = +day.slice(5, 7), d = Math.min(+day.slice(8, 10), lastDay(y, m));
    return y + "-" + pad(m) + "-" + pad(d);
  }
  /** Évolution en pourcentage (une décimale) ; null si la valeur de référence est nulle ou négative. */
  function change(now, prev) {
    return prev > 0 ? Math.round((now - prev) / prev * 1000) / 10 : null;
  }

  /**
   * Encaissé depuis le 1er janvier et depuis le 1er du mois, comparé à la même période un an plus tôt (jusqu'au même
   * jour) : { year: { now, prev, change }, month: { now, prev, change } }.
   */
  function toDate(documents, today) {
    var ly = lastYear(today);
    var yearNow = E.cashed(documents, today.slice(0, 4) + "-01-01", today), yearPrev = E.cashed(documents, ly.slice(0, 4) + "-01-01", ly);
    var monthNow = E.cashed(documents, today.slice(0, 8) + "01", today), monthPrev = E.cashed(documents, ly.slice(0, 8) + "01", ly);
    return { year: { now: yearNow, prev: yearPrev, change: change(yearNow, yearPrev) },
             month: { now: monthNow, prev: monthPrev, change: change(monthNow, monthPrev) } };
  }

  /**
   * Encaissements des n derniers mois (le mois en cours compris, jusqu'à aujourd'hui) et du même mois un an plus tôt
   * (mois entier) : [{ key, label, amount, prev, current }].
   */
  function monthly(documents, today, n) {
    n = n || 12;
    var start = E.addMonths(today.slice(0, 8) + "01", -(n - 1));
    var now = E.cashHistory(documents, [], start, today);
    var ly = lastYear(today), prevEnd = ly.slice(0, 8) + pad(lastDay(+ly.slice(0, 4), +ly.slice(5, 7)));
    var before = E.cashHistory(documents, [], E.addMonths(start, -12), prevEnd);
    return now.map(function (m, i) {
      return { key: m.key, label: m.label, amount: m.in, prev: before[i] ? before[i].in : 0, current: m.key === today.slice(0, 7) };
    });
  }

  /**
   * Clients par encaissements nets entre from et to (remboursements d'avoirs déduits), les n premiers et le reste :
   * { total, rows: [{ clientId, name, amount, share }], others: { count, amount, share } }. Part : 0 à 1, trois décimales.
   */
  function topClients(documents, from, to, n) {
    var byDoc = {}, by = {}, names = {};
    (documents || []).forEach(function (d) { if (d) byDoc[d.id] = d; });
    E.ledger(documents || [], from, to).forEach(function (r) {
      var d = byDoc[r.docId], key = d && d.clientId ? d.clientId : "?";
      by[key] = round2((by[key] || 0) + r.amount);
      if (r.client) names[key] = r.client;
    });
    var total = round2(Object.keys(by).reduce(function (s, k) { return s + by[k]; }, 0));
    var share = function (a) { return total > 0 ? Math.round(a / total * 1000) / 1000 : 0; };
    var all = Object.keys(by).filter(function (k) { return by[k] > 0; })
      .sort(function (a, b) { return by[b] - by[a] || String(names[a] || "").localeCompare(String(names[b] || ""), "fr"); });
    var rows = all.slice(0, n || 5).map(function (k) { return { clientId: k, name: names[k] || "Client inconnu", amount: by[k], share: share(by[k]) }; });
    var rest = all.slice(n || 5), restAmount = round2(rest.reduce(function (s, k) { return s + by[k]; }, 0));
    return { total: total, rows: rows, others: { count: rest.length, amount: restAmount, share: share(restAmount) } };
  }

  // ----- Documents et clients (documentation/55, § 2) -------------------------------------------------------

  var issued = function (d) { return d && d.status !== "draft"; };
  /** Montant HT d'une facture (positif) ou d'un avoir (négatif). */
  var signedHT = function (d) { return (d.type === "avoir" ? -1 : 1) * INV.compute(d).ht; };
  /** Facturé HT entre from et to (factures moins avoirs, à la date du document). */
  function invoiced(documents, from, to, clientId) {
    return round2((documents || []).reduce(function (s, d) {
      if (!issued(d) || (d.type !== "facture" && d.type !== "avoir") || d.date < from || d.date > to) return s;
      return clientId && d.clientId !== clientId ? s : s + signedHT(d);
    }, 0));
  }

  /**
   * Devis émis entre from et to : signés (acceptés ou facturés), refusés, expirés (envoyés, validité passée sans
   * réponse), en attente (envoyés, encore valides) ; taux de signature = signés ÷ (signés + refusés + expirés).
   */
  function quotes(documents, from, to, today) {
    var out = { signed: 0, refused: 0, expired: 0, pending: 0, pendingAmount: 0, signedAmount: 0, rate: null };
    (documents || []).forEach(function (d) {
      if (!issued(d) || d.type !== "devis" || d.date < from || d.date > to) return;
      var st = E.state(d, today, documents), ht = INV.compute(d).ht;
      if (st === "accepted" || st === "invoiced") { out.signed++; out.signedAmount += ht; }
      else if (st === "refused") out.refused++;
      else if (INV.addDays(d.date, Math.max(1, parseInt(d.validity, 10) || 30)) < today) out.expired++;
      else { out.pending++; out.pendingAmount += ht; }
    });
    var decided = out.signed + out.refused + out.expired;
    out.rate = decided ? Math.round(out.signed / decided * 1000) / 1000 : null;
    out.pendingAmount = round2(out.pendingAmount);
    out.signedAmount = round2(out.signedAmount);
    return out;
  }

  /**
   * Indicateurs de l'onglet Documents : facturé HT du mois et de l'année, nombre et montant moyen des factures de
   * l'année, avoirs de l'année, devis des 12 derniers mois.
   */
  function documents(list, today) {
    var year = today.slice(0, 4), from = year + "-01-01";
    var bills = (list || []).filter(function (d) { return issued(d) && d.type === "facture" && d.date >= from && d.date <= today; });
    var credits = (list || []).filter(function (d) { return issued(d) && d.type === "avoir" && d.date >= from && d.date <= today; });
    var gross = round2(bills.reduce(function (s, d) { return s + INV.compute(d).ht; }, 0));
    return { month: invoiced(list, today.slice(0, 8) + "01", today), year: invoiced(list, from, today), count: bills.length,
             average: bills.length ? round2(gross / bills.length) : null,
             credits: round2(credits.reduce(function (s, d) { return s + INV.compute(d).ht; }, 0)), creditCount: credits.length,
             quotes: quotes(list, E.addYears(today, -1), today, today) };
  }

  /** Facturé HT et encaissé par mois sur les n derniers mois (le mois en cours compris), pour un client ou tous. */
  function invoicedMonthly(list, today, n, clientId) {
    var start = E.addMonths(today.slice(0, 8) + "01", -((n || 12) - 1)), out = [];
    var docs = clientId ? (list || []).filter(function (d) { return d && d.clientId === clientId; }) : list || [];
    E.cashHistory(docs, [], start, today).forEach(function (m) {
      var end = m.key + "-" + pad(lastDay(+m.key.slice(0, 4), +m.key.slice(5, 7)));
      out.push({ key: m.key, label: m.label, invoiced: invoiced(docs, m.key + "-01", end < today ? end : today), cashed: m.in, current: m.key === today.slice(0, 7) });
    });
    return out;
  }

  /**
   * Indicateurs de l'onglet Clients : clients actifs (un encaissement sur 12 mois), nouveaux clients de l'année
   * (première facture émise cette année), encaissé moyen par client actif, part du premier et des trois premiers.
   */
  function clients(list, today) {
    var top = topClients(list, E.addYears(today, -1), today, 3), first = {};
    (list || []).forEach(function (d) {
      if (!issued(d) || d.type !== "facture" || !d.clientId) return;
      if (!first[d.clientId] || d.date < first[d.clientId]) first[d.clientId] = d.date;
    });
    var year = today.slice(0, 4), active = top.rows.length + top.others.count;
    return { active: active, newThisYear: Object.keys(first).filter(function (k) { return first[k].slice(0, 4) === year && first[k] <= today; }).length,
             average: active ? round2(top.total / active) : null, total: top.total,
             top1: top.rows.length ? top.rows[0].share : null,
             top3: top.rows.length ? Math.round(top.rows.reduce(function (s, r) { return s + r.share; }, 0) * 1000) / 1000 : null };
  }

  /**
   * Fiche d'un client : facturé HT depuis le début, encaissé sur 12 mois, reste à encaisser et en retard, délais de
   * paiement (toutes ses factures soldées), date de la dernière facture.
   */
  function clientDetail(list, clientId, today) {
    var own = (list || []).filter(function (d) { return d && d.clientId === clientId; }), due = 0, late = 0, last = null;
    own.forEach(function (d) {
      if (!issued(d) || d.type !== "facture") return;
      if (!last || d.date > last) last = d.date;
      var st = E.state(d, today, list);
      if (st === "unpaid" || st === "partial" || st === "overdue") {
        var b = E.balance(d, list);
        due += b;
        if (st === "overdue") late += b;
      }
    });
    var stats = E.paymentStats(own, "0000-01-01", today);
    return { invoiced: invoiced(own, "0000-01-01", today), cashed12: E.cashed(own, E.addYears(today, -1), today), due: round2(due), late: round2(late),
             avgDays: stats.avgDays, avgLate: stats.avgLate, paidCount: stats.count, lastInvoice: last };
  }

  // ----- Dépenses et recettes (documentation/55, § 2) --------------------------------------------------------

  var monthsOf = function (year, today) {
    var last = year === today.slice(0, 4) ? +today.slice(5, 7) : year < today.slice(0, 4) ? 12 : 0, out = [];
    for (var m = 1; m <= last; m++) out.push(year + "-" + pad(m));
    return out;
  };
  /** Classement par montant décroissant (à égalité, par ordre alphabétique) avec la part de chacun ; n premiers. */
  function ranking(map, total, n) {
    return Object.keys(map).filter(function (k) { return map[k] > 0; })
      .sort(function (a, b) { return map[b] - map[a] || a.localeCompare(b, "fr"); }).slice(0, n || 100)
      .map(function (k) { return { name: k, amount: round2(map[k]), share: total > 0 ? Math.round(map[k] / total * 1000) / 1000 : 0 }; });
  }

  /**
   * Dépenses d'une année (jusqu'à aujourd'hui pour l'année en cours) : total, mois en cours, moyenne mensuelle (mois
   * écoulés), par mois, par catégorie (« Non classées » sans catégorie), 5 premiers fournisseurs ; part des
   * encaissements de la même période ; abattement forfaitaire de l'activité (micro-entreprise à une activité, sans
   * versement libératoire).
   */
  function expenses(list, documents, year, today, profile, rules) {
    var to = year === today.slice(0, 4) ? today : year + "-12-31";
    var res = E.expenseRows(list, year + "-01-01", to), months = monthsOf(year, today);
    var byCat = {}, bySupplier = {}, byMonth = {};
    res.rows.forEach(function (r) {
      var cat = r.category || "Non classées";
      byCat[cat] = (byCat[cat] || 0) + r.amount;
      bySupplier[r.supplier] = (bySupplier[r.supplier] || 0) + r.amount;
      byMonth[r.date.slice(0, 7)] = round2((byMonth[r.date.slice(0, 7)] || 0) + r.amount);
    });
    var cashed = E.cashed(documents || [], year + "-01-01", to);
    var p = profile || {}, a = rules && rules.micro_activities && rules.micro_activities[p.activity];
    var mixed = rules && E.mixedActivities(p, rules);
    return { total: res.total, count: res.rows.length, month: year === today.slice(0, 4) ? byMonth[today.slice(0, 7)] || 0 : null,
             average: months.length ? round2(res.total / months.length) : null,
             byMonth: months.map(function (k) { return { key: k, label: E.period(k).label, amount: byMonth[k] || 0 }; }),
             byCategory: ranking(byCat, res.total), suppliers: ranking(bySupplier, res.total, 5),
             cashed: cashed, ratio: cashed > 0 ? Math.round(res.total / cashed * 1000) / 1000 : null,
             // Abattement de l'impôt sur le revenu : sans objet avec le versement libératoire (impôt en % du chiffre d'affaires).
             abatement: a && !mixed && !p.vl ? a.abattement : null };
  }

  /**
   * Recettes d'une année : encaissé, trimestre en cours (année en cours), moyenne mensuelle (mois écoulés), projection
   * de fin d'année au rythme des jours écoulés (année en cours, à partir du 2e mois), cumul jour par jour.
   */
  function receipts(documents, year, today) {
    var current = year === today.slice(0, 4), to = current ? today : year + "-12-31";
    var rows = E.ledger(documents || [], year + "-01-01", to), total = round2(rows.reduce(function (s, r) { return s + r.amount; }, 0));
    var months = monthsOf(year, today), q = Math.floor((+today.slice(5, 7) - 1) / 3) * 3 + 1;
    var quarter = current ? E.cashed(documents || [], year + "-" + pad(q) + "-01", today) : null;
    var days = Math.round((Date.parse(to) - Date.parse(year + "-01-01")) / 864e5) + 1;
    var inYear = Math.round((Date.parse(year + "-12-31") - Date.parse(year + "-01-01")) / 864e5) + 1;
    var cum = 0, points = [{ date: year + "-01-01", balance: 0 }];
    rows.forEach(function (r, i) {
      cum = round2(cum + r.amount);
      if (!rows[i + 1] || rows[i + 1].date !== r.date) points.push({ date: r.date, balance: cum });
    });
    return { total: total, quarter: quarter, quarterLabel: current ? E.period(year + "-T" + ((q + 2) / 3)).label : null,
             average: months.length ? round2(total / months.length) : null,
             projection: current && +today.slice(5, 7) > 1 ? Math.round(total / days * inYear) : null, points: points, end: to };
  }

  // ----- Temps et prospects (documentation/55, § 2) ----------------------------------------------------------

  var addDays = function (iso, n) { return new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10); };
  /** Lundi de la semaine d'une date. */
  function monday(iso) { var dow = (new Date(iso + "T00:00:00Z").getUTCDay() + 6) % 7; return addDays(iso, -dow); }
  /** Numéro de semaine ISO 8601 (la semaine 1 contient le premier jeudi de l'année). */
  function isoWeek(iso) {
    var thursday = addDays(monday(iso), 3), y = thursday.slice(0, 4);
    return 1 + Math.floor((Date.parse(thursday) - Date.parse(y + "-01-01")) / (7 * 864e5));
  }

  /**
   * Temps passé : unité de suivi (heures si des heures sont saisies sur la période, sinon jours), n dernières
   * semaines (facturable et interne), semaine en cours, mois en cours (part facturable, taux moyen facturé par unité,
   * temps par client) et montant du temps à facturer (tous mois).
   */
  function time(entries, documents, today, n) {
    n = n || 8;
    var start = addDays(monday(today), -7 * (n - 1)), month = today.slice(0, 7);
    var list = (entries || []).filter(function (t) { return t && t.date && t.date <= today && (t.unit === "hour" || t.unit === "day"); });
    var recent = list.filter(function (t) { return t.date >= start || t.date.slice(0, 7) === month; });
    var unit = recent.some(function (t) { return t.unit === "hour"; }) || !recent.length ? "hour" : "day";
    var mine = list.filter(function (t) { return t.unit === unit; }), qty = function (t) { return Number(t.quantity) || 0; };
    var weeks = [];
    for (var i = 0; i < n; i++) {
      var w0 = addDays(start, 7 * i), w1 = addDays(w0, 6), inWeek = mine.filter(function (t) { return t.date >= w0 && t.date <= w1; });
      weeks.push({ key: w0, label: "S" + isoWeek(w0), billable: round2(inWeek.filter(function (t) { return t.billable !== false; }).reduce(function (s, t) { return s + qty(t); }, 0)),
                   internal: round2(inWeek.filter(function (t) { return t.billable === false; }).reduce(function (s, t) { return s + qty(t); }, 0)) });
    }
    var inMonth = mine.filter(function (t) { return t.date.slice(0, 7) === month; });
    var total = inMonth.reduce(function (s, t) { return s + qty(t); }, 0);
    var billable = inMonth.filter(function (t) { return t.billable !== false; });
    var rated = billable.filter(function (t) { return t.rate !== null && t.rate !== undefined && t.rate !== "" && isFinite(Number(t.rate)); });
    var ratedQty = rated.reduce(function (s, t) { return s + qty(t); }, 0);
    var byClient = {};
    inMonth.forEach(function (t) { var k = t.billable === false ? "" : t.clientId || ""; byClient[k] = (byClient[k] || 0) + qty(t); });
    var cur = weeks[weeks.length - 1];
    return { unit: unit, weeks: weeks, week: round2(cur.billable + cur.internal), month: round2(total),
             share: total > 0 ? Math.round(billable.reduce(function (s, t) { return s + qty(t); }, 0) / total * 1000) / 1000 : null,
             rate: ratedQty > 0 ? round2(rated.reduce(function (s, t) { return s + qty(t) * Number(t.rate); }, 0) / ratedQty) : null,
             byClient: Object.keys(byClient).map(function (k) { return { clientId: k, quantity: round2(byClient[k]), share: total > 0 ? Math.round(byClient[k] / total * 1000) / 1000 : 0 }; })
               .sort(function (a, b) { return b.quantity - a.quantity || a.clientId.localeCompare(b.clientId); }),
             unbilled: round2(E.unbilledByClient(entries, documents).reduce(function (s, c) { return s + (c.amount || 0); }, 0)) };
  }

  /**
   * Prospects : pistes par étape (nombre, valeur), pistes ouvertes, taux de conversion des pistes closes
   * (gagnées ÷ gagnées et perdues, sans période : une piste n'a pas de date de clôture), valeur moyenne d'une piste
   * gagnée, relances en retard (avant aujourd'hui) et du jour.
   */
  function prospects(list, documents, today) {
    var pipe = E.pipeline(list || [], documents), due = E.followUps(list || [], documents, today);
    var closed = pipe.won.count + pipe.lost.count;
    // Clôtures datées (documentation/55, § 7) : 12 derniers mois glissants et 12 derniers mois calendaires.
    var from = lastYear(today), start = E.addMonths(today.slice(0, 8) + "01", -11), won12 = 0, lost12 = 0, undated = 0, byMonth = {};
    (list || []).forEach(function (p) {
      var s = E.prospectStage(p, documents);
      if (s !== "won" && s !== "lost") return;
      var at = E.prospectClosedAt(p, documents);
      if (!at) { undated++; return; }
      if (at > from && at <= today) { if (s === "won") won12++; else lost12++; }
      if (at >= start && at <= today) {
        var k = at.slice(0, 7);
        byMonth[k] = byMonth[k] || { won: 0, lost: 0 };
        byMonth[k][s]++;
      }
    });
    var months = [];
    for (var i = 0; i < 12; i++) {
      var key = E.addMonths(start, i).slice(0, 7);
      months.push({ key: key, won: (byMonth[key] || {}).won || 0, lost: (byMonth[key] || {}).lost || 0 });
    }
    return { open: pipe.open, stages: Object.keys(E.STAGE_LABELS).map(function (k) { return { key: k, label: E.STAGE_LABELS[k], count: pipe[k].count, value: pipe[k].value }; }),
             closed: closed, conversion: closed ? Math.round(pipe.won.count / closed * 1000) / 1000 : null,
             closed12: won12 + lost12, conversion12: won12 + lost12 ? Math.round(won12 / (won12 + lost12) * 1000) / 1000 : null, undated: undated, months: months,
             wonAverage: pipe.won.count ? round2(pipe.won.value / pipe.won.count) : null,
             late: due.filter(function (p) { return p.nextDate < today; }).length, today: due.filter(function (p) { return p.nextDate === today; }).length };
  }

  /**
   * Échéances (documentation/55, § 5.5) : events = échéances du calendrier retenues pour le profil ; items = mouvements
   * prévus de la trésorerie (E.forecast). Montant estimé d'une échéance = cotisations (tag « Urssaf ») ou TVA (tag « TVA »)
   * prévues à la même date. Fenêtre : aujourd'hui compris, jusqu'à aujourd'hui + days (90 par défaut).
   */
  var DEADLINE_KINDS = { Urssaf: "urssaf", TVA: "vat" };
  function deadlines(events, items, today, days) {
    days = days || 90;
    var end = addDays(today, days), due = {};
    var inWindow = function (date) { return date >= today && date <= end; };
    (items || []).forEach(function (x) {
      if ((x.kind === "urssaf" || x.kind === "vat") && inWindow(x.date)) due[x.date + "|" + x.kind] = round2((due[x.date + "|" + x.kind] || 0) - x.amount);
    });
    var list = (events || []).filter(function (e) { return e && e.date >= today; }).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
      .map(function (e) {
        var k = DEADLINE_KINDS[e.tag], amount = k && due[e.date + "|" + k] !== undefined ? due[e.date + "|" + k] : null; // due ne contient que la fenêtre
        return Object.assign({}, e, { days: Math.round((Date.parse(e.date) - Date.parse(today)) / 864e5), amount: amount });
      });
    var total = function (kind) {
      return round2(Object.keys(due).filter(function (k) { return k.split("|")[1] === kind; }).reduce(function (s, k) { return s + due[k]; }, 0));
    };
    var soon = list.filter(function (e) { return e.date <= end; });
    return { end: end, next: list[0] || null, events: list, soon: soon, urssaf: total("urssaf"), vat: total("vat") };
  }

  return { lastYear: lastYear, change: change, toDate: toDate, monthly: monthly, topClients: topClients, expenses: expenses, receipts: receipts,
           monday: monday, isoWeek: isoWeek, time: time, prospects: prospects, deadlines: deadlines,
           invoiced: invoiced, quotes: quotes, documents: documents, invoicedMonthly: invoicedMonthly, clients: clients, clientDetail: clientDetail };
});
