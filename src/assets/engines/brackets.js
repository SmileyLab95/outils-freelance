/* Moteur : impôt selon un barème progressif. Fonctions pures, utilisables dans le navigateur et dans Node. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).brackets = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * Impôt dû sur un revenu imposable selon un barème [{from, to, rate}] (to = null pour la dernière tranche).
   * Renvoie { tax, marginal, details: [{from, to, rate, base, tax}] }.
   */
  function progressive(income, brackets) {
    var tax = 0, marginal = 0, details = [];
    var amount = Math.max(0, income || 0);
    brackets.forEach(function (b) {
      var top = b.to == null ? Infinity : b.to;
      if (amount <= b.from) return;
      var base = Math.min(amount, top) - b.from;
      var part = base * b.rate;
      tax += part;
      marginal = b.rate;
      details.push({ from: b.from, to: b.to, rate: b.rate, base: base, tax: part });
    });
    return { tax: tax, marginal: marginal, details: details };
  }

  /** Arrondi au centime, sans les erreurs de virgule flottante (1.005 → 1.01). */
  function cents(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  /** Cherche x tel que f(x) = target, f croissante, par dichotomie entre lo et hi. */
  function solve(f, target, lo, hi, tolerance) {
    tolerance = tolerance || 0.01;
    for (var i = 0; i < 200 && hi - lo > tolerance; i++) {
      var mid = (lo + hi) / 2;
      if (f(mid) < target) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  return { progressive: progressive, cents: cents, solve: solve };
});
