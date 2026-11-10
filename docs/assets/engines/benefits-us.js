/*
 * Moteur : protection de l'indépendant aux États-Unis en cas de maladie, de naissance ou de soins à un proche.
 * Programmes des États ouverts aux indépendants par adhésion volontaire (Californie, Delaware, Maine, Massachusetts,
 * Minnesota, New York, Oregon, Washington) et invalidité de longue durée de la Social Security (SSDI). Chiffres lus dans data/rules/us.json
 * (us_paid_leave_*, us_ssdi_basics). Spécification : documentation/52-protection-sociale-etats-unis.md.
 * Fonctions pures, testées par tests/unit/benefits-us.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).benefitsUS = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // États dont les règles ont été lues aux sources (règle de chaque programme).
  var STATES = { CA: "us_paid_leave_ca_diec", DE: "us_paid_leave_de_self_employed", MA: "us_paid_leave_ma_self_employed", ME: "us_paid_leave_me_self_employed",
    MN: "us_paid_leave_mn_self_employed", NJ: "us_paid_leave_nj_self_employed", NY: "us_paid_leave_ny_self_employed", OR: "us_paid_leave_or_self_employed",
    WA: "us_paid_leave_wa_elective" };

  function round2(x) { return Math.round(Number((x * 100).toPrecision(12))) / 100; }

  /** Programme d'un État : sa règle, ou null pour un État non étudié. */
  function program(rules, state) {
    return Object.prototype.hasOwnProperty.call(STATES, state) ? rules[STATES[state]] : null;
  }

  /**
   * Prime annuelle estimée, pour les États dont le taux a été lu (Californie, Oregon, Minnesota), à partir du bénéfice net de
   * l'activité indépendante (netProfit, en dollars). Renvoie { error } pour un bénéfice invalide, null si l'État n'a pas
   * de taux publié dans les règles, sinon { annual, quarterly, eligible }.
   * Californie (DIEC 2026) : 8,84 % du bénéfice, avec un minimum de 406,64 $ (bénéfice de 4 600 $ ou moins).
   * Oregon (2025-2026) : 0,6 % du revenu net d'Oregon, plafonné à 184 500 $ ; au moins 1 000 $ pour pouvoir adhérer.
   * Minnesota (2026) : 0,88 % de la base de prime de l'indépendant, plafonnée au plafond de la Social Security
   * (Minn. Stat. 268B.11, subd. 3 ; taux publié par le DEED).
   */
  function premium(rules, state, netProfit) {
    if (state !== "CA" && state !== "OR" && state !== "MN") return null;
    if (typeof netProfit !== "number" || !isFinite(netProfit) || netProfit < 0) return { error: "profit" };
    var annual, eligible = true;
    if (state === "CA") {
      var C = rules.us_paid_leave_ca_diec;
      annual = netProfit <= C.minimum_premium_net_profit ? C.minimum_annual_premium_2026 : round2(netProfit * C.premium_rate_2026);
    } else if (state === "MN") {
      annual = round2(Math.min(netProfit, rules.social_security_wage_base_2026) * rules.us_paid_leave_mn_self_employed.premium_rate_2026);
    } else {
      var O = rules.us_paid_leave_or_self_employed;
      eligible = netProfit >= O.min_oregon_net_income;
      annual = eligible ? round2(Math.min(netProfit, O.income_cap) * O.contribution_rate_2025_2026) : 0;
    }
    return { annual: annual, quarterly: round2(annual / 4), eligible: eligible };
  }

  return { STATES: STATES, program: program, premium: premium };
});
