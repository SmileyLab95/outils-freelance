/*
 * Moteur : taxe sur les ventes (TVA, VAT, TPS/TVH/TVQ/TVP…), avec une ou plusieurs composantes calculées
 * sur le montant hors taxes. Fonctions pures, utilisables dans le navigateur (OFE.salestax) et dans Node.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).salestax = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function cents(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  /**
   * Décompose un montant.
   * @param {number} amount      montant saisi
   * @param {Array} components   [{label, rate}] (taux décimaux, appliqués chacun au hors-taxes)
   * @param {string} from        "net" si le montant est hors taxes, "gross" s'il est taxes comprises
   * Chaque taxe est arrondie au centime ; depuis un montant TTC, l'écart d'arrondi va sur la dernière taxe
   * pour que hors-taxes + taxes = montant saisi.
   */
  function split(amount, components, from) {
    var total = components.reduce(function (s, c) { return s + c.rate; }, 0);
    var net = from === "gross" ? cents(amount / (1 + total)) : cents(amount);
    var taxes = components.map(function (c) { return { label: c.label, rate: c.rate, amount: cents(net * c.rate) }; });
    var sum = taxes.reduce(function (s, t) { return s + t.amount; }, 0);
    if (from === "gross" && taxes.length) {
      taxes[taxes.length - 1].amount = cents(taxes[taxes.length - 1].amount + cents(amount) - net - sum);
      sum = cents(amount) - net;
    }
    return { net: net, taxes: taxes, tax: cents(sum), gross: cents(net + sum), rate: total };
  }

  return { split: split, cents: cents };
});
