/*
 * Moteur : proposition commerciale (documentation/30-proposition-commerciale.md). Étapes et options saisies, totaux au
 * centime, acompte et solde, date de fin de validité. Pur calcul sur les nombres saisis, aucun chiffre officiel.
 * Testé par tests/unit/proposal.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).proposal = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var cents = function (x) { return Math.round(x * 100) / 100; };
  var blank = function (s) { return s === null || s === undefined || String(s).trim() === ""; };

  /**
   * Lignes saisies : [{ name, duration, price }] où price est un nombre (déjà lu), NaN si illisible, null si vide.
   * Les lignes entièrement vides sont ignorées ; un prix illisible ou négatif est signalé (invalid) et non compté.
   */
  function lines(list) {
    var out = [], invalid = [];
    (list || []).forEach(function (l, i) {
      if (blank(l.name) && blank(l.duration) && (l.price === null || l.price === undefined)) return;
      var bad = l.price !== null && l.price !== undefined && !(isFinite(l.price) && l.price >= 0);
      if (bad) invalid.push(i);
      out.push({ index: i, name: blank(l.name) ? "" : String(l.name).trim(), duration: blank(l.duration) ? "" : String(l.duration).trim(),
                 price: bad || l.price === null || l.price === undefined ? null : cents(l.price) });
    });
    return { lines: out, invalid: invalid };
  }

  /** Date ISO + n jours (calendrier civil, sans fuseau horaire). */
  function addDays(iso, n) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!p) return "";
    var d = new Date(Date.UTC(+p[1], +p[2] - 1, +p[3] + n));
    return d.toISOString().slice(0, 10);
  }

  /**
   * input : { phases, options (lignes, voir lines), deposit (%), today (AAAA-MM-JJ), validity (jours) }.
   * Renvoie { phases, options, invalid: { phases, options }, total, optionsTotal, deposit (fraction), depositAmount,
   * balance, validUntil }.
   */
  function compute(input) {
    var P = lines(input.phases), O = lines(input.options);
    var sum = function (ls) { return cents(ls.reduce(function (s, l) { return s + (l.price || 0); }, 0)); };
    var total = sum(P.lines);
    var pct = Number(input.deposit);
    var deposit = isFinite(pct) && pct > 0 ? Math.min(pct, 100) / 100 : 0;
    var depositAmount = cents(total * deposit);
    var validity = Number(input.validity);
    return { phases: P.lines, options: O.lines, invalid: { phases: P.invalid, options: O.invalid },
             total: total, optionsTotal: sum(O.lines), deposit: deposit, depositAmount: depositAmount,
             balance: cents(total - depositAmount),
             validUntil: isFinite(validity) && validity > 0 ? addDays(input.today, Math.round(validity)) : "" };
  }

  return { compute: compute, lines: lines, addDays: addDays };
});
