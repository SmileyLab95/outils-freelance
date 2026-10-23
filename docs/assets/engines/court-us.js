/*
 * Moteur : réclamer une facture impayée aux small claims aux États-Unis (documentation/24-recouvrement-uk-us-ca.md,
 * § 3). Selon l'État, le montant réclamé, le statut du demandeur (personne physique ou sole proprietor, ou société
 * et LLC) et la date du dépôt : le plafond applicable et le verdict. Règle dans data/rules/us.json
 * (us_small_claims_limits). Fonction pure, testée par tests/unit/court-us.test.mjs ; les textes sont dans la page.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).courtUS = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
                "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH",
                "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

  /**
   * Plafond applicable : celui de la date de dépôt (« next » à partir de sa date), celui d'une société s'il est plus
   * bas, et une fourchette { min, max } quand il dépend du tribunal ou du comté (New York, Caroline du Nord,
   * Pennsylvanie). date : AAAA-MM-JJ.
   */
  function limits(state, entity, date, rules) {
    var s = rules.us_small_claims_limits[state];
    var base = s.next && date >= s.next.from ? s.next.limit : s.limit;
    var max = entity && s.entity_limit !== undefined ? s.entity_limit : base;
    var min = entity && s.entity_min_limit !== undefined ? s.entity_min_limit : s.min_limit !== undefined ? s.min_limit : max;
    return { min: min, max: max, next: s.next && date < s.next.from ? s.next : null };
  }

  /**
   * input : { state, amount (montant réclamé, sans les intérêts ni les frais), entity: booléen (société ou LLC),
   * date: AAAA-MM-JJ (jour du dépôt) }.
   * Renvoie { verdict, min, max, next } : verdict « small_claims » (jusqu'au plus petit plafond compris),
   * « depends » (entre le plus petit et le plus grand plafond de l'État) ou « above_limit ».
   */
  function decide(input, rules) {
    var state = input.state, amount = Math.max(0, Number(input.amount) || 0);
    if (STATES.indexOf(state) < 0) throw new Error("État inconnu : " + JSON.stringify(input));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || "")) throw new Error("Date attendue : " + JSON.stringify(input));
    var l = limits(state, !!input.entity, input.date, rules);
    var verdict = amount <= l.min ? "small_claims" : amount <= l.max ? "depends" : "above_limit";
    return { verdict: verdict, min: l.min, max: l.max, next: l.next };
  }

  return { STATES: STATES, limits: limits, decide: decide };
});
