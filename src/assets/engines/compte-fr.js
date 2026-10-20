/*
 * Moteur : compte bancaire de l'activité (France). Règles : documentation/15-guides-gestion.md, § 1 ; seuil dans
 * data/rules/fr.json (compte_dedie_micro, CSS art. L613-10). Fonction pure, testée par tests/unit/compte-fr.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).compteFR = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Montant déjà lu par l'appelant (OF.num dans la page) : nombre fini et positif, sinon null (non renseigné). */
  function amount(v) {
    return typeof v === "number" && isFinite(v) && v >= 0 ? v : null;
  }

  /**
   * Faut-il un compte réservé à l'activité ?
   * input : { status: "micro" | "ei" | "societe", year: année en cours, ca: { prev2, prev, current } } (chiffres
   * d'affaires des deux dernières années civiles complètes et estimation de l'année en cours, facultative ; nombres,
   * ou null s'ils ne sont pas renseignés).
   * rule : { seuil_ca, annees_consecutives } (seule la règle de deux années consécutives est prévue par le texte).
   * Renvoie { code, year } : year est l'année à la fin de laquelle la condition est (ou serait) remplie.
   *   micro-required : dépassement les deux dernières années ; micro-required-end-of-year : l'année dernière et
   *   l'estimation de l'année en cours ; micro-watch : l'année dernière seulement, sans estimation au-dessus ;
   *   micro-not-required ; ei : entreprise individuelle au réel ; societe.
   */
  function check(input, rule) {
    if (rule.annees_consecutives !== 2) throw new Error("Règle de compte dédié inattendue : " + rule.annees_consecutives + " années.");
    if (input.status === "societe") return { code: "societe" };
    if (input.status !== "micro") return { code: "ei" };
    var ca = input.ca || {}, year = input.year;
    var over = function (v) { var n = amount(v); return n !== null && n > rule.seuil_ca; };
    if (over(ca.prev2) && over(ca.prev)) return { code: "micro-required", year: year - 1 };
    if (over(ca.prev) && over(ca.current)) return { code: "micro-required-end-of-year", year: year };
    if (over(ca.prev)) return { code: "micro-watch", year: year };
    return { code: "micro-not-required" };
  }

  return { check: check, amount: amount };
});
