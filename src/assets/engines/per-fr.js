/*
 * Moteur : plan d'épargne retraite (PER) d'un indépendant en France.
 * Plafond « TNS » (art. 154 bis du CGI) pour les bénéfices au réel : 10 % du bénéfice dans la limite de 8 PASS,
 * plus 15 % de la fraction entre 1 et 8 PASS, au minimum 10 % du PASS.
 * Plafond général (art. 163 quatervicies), seul ouvert aux micro-entrepreneurs : 10 % des revenus d'activité
 * de l'année précédente (après abattement), entre 10 % du PASS et 10 % de 8 PASS de cette année-là.
 * Économie d'impôt : impôt sur le revenu avant et après déduction (barème, 1 ou 2 parts, sans décote).
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.brackets : require("./brackets.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).perFR = api;
})(typeof self !== "undefined" ? self : this, function (B) {
  "use strict";

  function ceilingTNS(profit, pass, rules) {
    var p = rules.per_plafond_tns;
    var base = Math.min(Math.max(0, profit), p.plafond_pass * pass);
    return Math.max(p.minimum_pass * pass, p.taux_base * base + p.taux_supplement * Math.max(0, base - pass));
  }

  function ceilingGeneral(income, pass, rules) {
    var p = rules.per_plafond_general;
    return Math.min(p.plafond_pass * pass * p.taux, Math.max(p.minimum_pass * pass, p.taux * Math.max(0, income)));
  }

  /** Impôt sur le revenu du foyer : barème appliqué par part (1 ou 2 parts). */
  function incomeTax(taxable, parts, rules) {
    var n = parts === 2 ? 2 : 1;
    return n * B.progressive(Math.max(0, taxable) / n, rules.ir_bareme_revenus_2025).tax;
  }

  /**
   * @param {object} input { regime: "micro" | "real", revenue, activity, otherIncome, parts, contribution, pastIncome }
   */
  function simulate(input, rules) {
    var micro = input.regime === "micro";
    var activity = rules.micro_activities[input.activity] || rules.micro_activities.liberal_bnc;
    var revenue = Math.max(0, input.revenue || 0);
    // Micro : chiffre d'affaires après l'abattement forfaitaire (au moins le minimum légal) ; réel : bénéfice.
    var professional = micro ? Math.max(0, revenue - Math.max(revenue * activity.abattement, rules.micro_abattement_minimum)) : revenue;
    var taxable = professional + Math.max(0, input.otherIncome || 0);
    var ceiling = micro
      ? ceilingGeneral(input.pastIncome != null ? input.pastIncome : professional, rules.pass_2025, rules)
      : ceilingTNS(revenue, rules.pass_2026, rules);
    var deducted = Math.min(Math.max(0, input.contribution || 0), ceiling, taxable);
    var before = incomeTax(taxable, input.parts, rules), after = incomeTax(taxable - deducted, input.parts, rules);
    var parts = input.parts === 2 ? 2 : 1;
    var marginal = B.progressive(taxable / parts, rules.ir_bareme_revenus_2025).marginal;
    return { professional: professional, taxable: taxable, ceiling: ceiling, deducted: deducted,
             saving: before - after, taxBefore: before, taxAfter: after, marginal: marginal,
             cost: Math.max(0, input.contribution || 0) - (before - after) };
  }

  return { ceilingTNS: ceilingTNS, ceilingGeneral: ceilingGeneral, incomeTax: incomeTax, simulate: simulate };
});
