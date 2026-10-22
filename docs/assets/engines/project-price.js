/*
 * Moteur : prix d'un projet au forfait (temps estimé, marge pour imprévus, frais, taxes, acompte) et tarif réel d'un
 * prix proposé. Spécification : documentation/18-outils-de-prix.md (§ 2). Fonction pure, testée par
 * tests/unit/project-price.test.mjs ; taxes calculées par le moteur salestax.
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.salestax : require("./salestax.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).projectPrice = api;
})(typeof self !== "undefined" ? self : this, function (ST) {
  "use strict";

  var cents = ST.cents;

  /**
   * input : { times (durées des tâches, dans l'unité du tarif), rate (tarif par jour ou par heure), contingency
   *   (imprévus, fraction du temps), expenses (frais inclus dans le prix), deposit (acompte, fraction du total taxes
   *   comprises), components ([{label, rate}] : taxes de vente, taux décimaux), offer (prix hors taxes proposé) }.
   * Renvoie le détail, ou { error: "no_time" } si aucune durée n'est saisie, { error: "no_rate" } sans tarif.
   */
  function price(input) {
    var time = (input.times || []).reduce(function (s, t) { return s + Math.max(0, t || 0); }, 0);
    var rate = Math.max(0, input.rate || 0);
    if (!(time > 0)) return { error: "no_time" };
    if (!(rate > 0)) return { error: "no_rate" };
    var contingency = Math.max(0, input.contingency || 0), expenses = Math.max(0, input.expenses || 0);
    var covered = time * (1 + contingency);
    var fees = cents(covered * rate);
    var t = ST.split(fees + expenses, input.components || [], "net");
    var deposit = cents(t.gross * Math.min(1, Math.max(0, input.deposit || 0)));
    var offer = input.offer > 0 ? input.offer : null;
    return {
      time: time, covered: covered, fees: fees, expenses: cents(expenses), net: t.net, taxes: t.taxes, tax: t.tax,
      gross: t.gross, deposit: deposit, balance: cents(t.gross - deposit),
      // Prix proposé par le client (hors taxes) : ce qu'il paie par unité de temps estimé, une fois les frais retirés.
      offerRate: offer === null ? null : (offer - expenses) / time
    };
  }

  return { price: price };
});
