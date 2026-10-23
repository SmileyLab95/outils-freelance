/*
 * Moteur : réclamer une facture impayée aux petites créances au Canada (documentation/24-recouvrement-uk-us-ca.md,
 * § 2). Selon la province ou le territoire où l'on dépose et le montant réclamé (sans les intérêts ni les frais) : le
 * tribunal compétent, le plafond et le délai de prescription général. Règles dans data/rules/ca.json
 * (ca_small_claims_limits, ca_limitation_periods). Fonction pure, testée par tests/unit/court-ca.test.mjs ; les textes
 * (anglais et français) sont dans les pages, le moteur ne renvoie que des clés et des nombres.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).courtCA = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var PROVINCES = ["ON", "QC", "BC", "AB", "SK", "MB", "NS", "NB", "PE", "NL", "YT", "NT", "NU"];

  /**
   * input : { province: code de la province ou du territoire où l'on dépose, amount: montant réclamé sans les intérêts
   * ni les frais }.
   * Renvoie { verdict, limit, tribunalLimit, limitation } : verdict « tribunal » (Colombie-Britannique, jusqu'au
   * plafond du Civil Resolution Tribunal), « small_claims » (jusqu'au plafond compris), « above_limit » ou « unknown »
   * (plafond non confirmé) ; limitation = { years, from } ou null.
   */
  function decide(input, rules) {
    var province = input.province, amount = Math.max(0, Number(input.amount) || 0);
    if (PROVINCES.indexOf(province) < 0) throw new Error("Province inconnue : " + JSON.stringify(input));
    var court = rules.ca_small_claims_limits[province], limitation = rules.ca_limitation_periods[province];
    var verdict = court.limit === null ? "unknown"
      : court.tribunal_limit && amount <= court.tribunal_limit ? "tribunal"
      : amount <= court.limit ? "small_claims" : "above_limit";
    return { verdict: verdict, limit: court.limit, tribunalLimit: court.tribunal_limit || null, limitation: limitation || null };
  }

  return { PROVINCES: PROVINCES, decide: decide };
});
