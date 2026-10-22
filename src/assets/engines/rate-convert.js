/*
 * Moteur : conversion d'un tarif entre l'heure, le jour, la semaine (cinq jours facturés), le mois et l'an.
 * Spécification : documentation/18-outils-de-prix.md (§ 1). Fonction pure, testée par
 * tests/unit/rate-convert.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).rateConvert = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var UNITS = ["hour", "day", "week", "month", "year"];
  var DAYS_PER_WEEK = 5;

  /**
   * input : { amount, unit (hour, day, week, month, year), hoursPerDay (heures facturées par jour),
   *   daysPerYear (jours facturés par an) }.
   * Renvoie { hour, day, week, month, year, hoursPerYear }, ou { error: "assumptions" } si les heures par jour ne
   * sont pas comprises entre 0 (exclu) et 24, ou les jours par an entre 0 (exclu) et 366.
   */
  function convert(input) {
    var h = input.hoursPerDay, d = input.daysPerYear, amount = Math.max(0, input.amount || 0);
    if (!(h > 0 && h <= 24 && d > 0 && d <= 366)) return { error: "assumptions" };
    var unit = UNITS.indexOf(input.unit) >= 0 ? input.unit : "hour";
    var day = unit === "hour" ? amount * h
      : unit === "day" ? amount
      : unit === "week" ? amount / DAYS_PER_WEEK
      : unit === "month" ? amount * 12 / d
      : amount / d;
    var year = day * d;
    return { hour: day / h, day: day, week: day * DAYS_PER_WEEK, month: year / 12, year: year, hoursPerYear: h * d };
  }

  return { UNITS: UNITS, DAYS_PER_WEEK: DAYS_PER_WEEK, convert: convert };
});
