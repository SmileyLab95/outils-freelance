/*
 * Moteur : augmenter ses tarifs (documentation/28-hausse-de-tarifs.md). Pur calcul sur les nombres saisis : nouveau
 * tarif, chiffre d'affaires mensuel avant et après (avec une éventuelle perte de volume), perte de volume supportable
 * et, si l'utilisateur saisit un taux d'inflation, le tarif qui le suit et la hausse réelle. Aucun chiffre officiel.
 * Testé par tests/unit/price-increase.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).priceIncrease = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var cents = function (x) { return Math.round(x * 100) / 100; };
  var positive = function (x) { x = Number(x); return isFinite(x) && x > 0 ? x : 0; };
  var given = function (x) { return x !== null && x !== undefined && x !== "" && isFinite(Number(x)); };

  /**
   * input : { rate (tarif actuel), mode : "percent" | "rate", increase (hausse en %, mode percent), newRate (mode rate),
   * volume (unités facturées par mois), loss (perte de volume en %, facultative), inflation (en %, facultative) }.
   * Renvoie { valid, rate, newRate, increase (fraction), before, after, change, changeShare, breakEvenLoss (fraction,
   * null si le tarif ne monte pas), inflationRate, realIncrease (null sans inflation saisie) }.
   */
  function compute(input) {
    var rate = positive(input.rate);
    if (!rate) return { valid: false };
    var newRate = input.mode === "rate" ? positive(input.newRate) : rate * (1 + (Number(input.increase) || 0) / 100);
    newRate = Math.max(0, cents(newRate));
    var increase = newRate / rate - 1;
    var volume = positive(input.volume);
    var loss = Math.min(100, positive(input.loss)) / 100;
    var before = cents(rate * volume), after = cents(newRate * volume * (1 - loss));
    var out = { valid: true, rate: rate, newRate: newRate, increase: increase, before: before, after: after,
                change: cents(after - before), changeShare: before > 0 ? (after - before) / before : 0,
                breakEvenLoss: newRate > rate ? 1 - rate / newRate : null, inflationRate: null, realIncrease: null };
    if (given(input.inflation)) {
      var inflation = Number(input.inflation) / 100;
      if (inflation > -1) {
        out.inflationRate = cents(rate * (1 + inflation));
        out.realIncrease = (1 + increase) / (1 + inflation) - 1;
      }
    }
    return out;
  }

  return { compute: compute };
});
