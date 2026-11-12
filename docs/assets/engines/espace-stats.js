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

  return { lastYear: lastYear, change: change, toDate: toDate, monthly: monthly, topClients: topClients,
           invoiced: invoiced, quotes: quotes, documents: documents, invoicedMonthly: invoicedMonthly, clients: clients, clientDetail: clientDetail };
});
