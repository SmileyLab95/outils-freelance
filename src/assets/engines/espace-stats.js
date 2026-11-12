/*
 * Moteur : indicateurs des onglets de l'Espace (documentation/55-indicateurs-espace.md). Fonctions pures sur les données
 * de l'Espace ; s'appuie sur le moteur de l'Espace (OFE.espaceFR) pour les encaissements, statuts et soldes.
 * Testé par tests/unit/espace-stats.test.mjs.
 */
(function (root, factory) {
  var api = factory(root.OFE && root.OFE.espaceFR ? root.OFE.espaceFR : require("./espace-fr.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).espaceStats = api;
})(typeof self !== "undefined" ? self : this, function (E) {
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

  return { lastYear: lastYear, change: change, toDate: toDate, monthly: monthly, topClients: topClients };
});
