/*
 * Moteur : entreprise individuelle (ou LLC à un associé) ou S corporation, impôts fédéraux comparés (États-Unis).
 * Spécification : documentation/pays/us.md (« comparateur Sole proprietor vs S corp ») ; règles dans
 * data/rules/us.json (fica_rates_2026, futa_2026, qbi_w2_wage_limit, barèmes). Fonction pure, testée par
 * tests/unit/structure-us.test.mjs ; s'appuie sur le moteur taxUS.
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.taxUS : require("./tax-us.js"), root.OFE ? root.OFE.brackets : require("./brackets.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).structureUS = api;
})(typeof self !== "undefined" ? self : this, function (T, B) {
  "use strict";

  /** Cotisations FICA d'un côté (salarié ou employeur) sur un salaire : Social Security plafonnée, Medicare. */
  function fica(wages, rules) {
    var r = rules.fica_rates_2026;
    return Math.min(wages, rules.social_security_wage_base_2026) * r.social_security_rate + wages * r.medicare_rate;
  }

  /**
   * S corporation dont l'associé unique se verse un salaire.
   * input : { profit (bénéfice avant le salaire du dirigeant), salary, status, sstb, extraCosts (frais propres à la
   * S corp : paie, comptabilité, État…) }.
   * Renvoie le détail, ou { error: "salary_too_high" } si le salaire et ses charges dépassent le bénéfice.
   */
  function sCorp(input, rules) {
    var status = T.STATUSES.indexOf(input.status) >= 0 ? input.status : "single";
    var profit = Math.max(0, input.profit || 0), salary = Math.max(0, input.salary || 0), extra = Math.max(0, input.extraCosts || 0);
    var employerFica = fica(salary, rules);
    var futa = Math.min(salary, rules.futa_2026.wage_base) * rules.futa_2026.net_rate;
    var k1 = profit - extra - salary - employerFica - futa;
    if (k1 < 0) return { error: "salary_too_high" };
    var employeeFica = fica(salary, rules);
    var addMedicare = T.additionalMedicare(0, salary, status, rules);
    var agi = salary + k1;
    var standard = rules.standard_deduction_2026[status];
    var taxableBeforeQbi = Math.max(0, agi - standard);
    // Le salaire raisonnable n'est pas du QBI ; il compte comme salaire W-2 pour la limite de la déduction.
    var qbiDeduction = T.qbi(k1, taxableBeforeQbi, status, !!input.sstb, rules, salary);
    var taxable = Math.max(0, taxableBeforeQbi - qbiDeduction);
    var incomeTax = B.progressive(taxable, T.brackets(rules, status)).tax;
    var payroll = employerFica + employeeFica + futa;
    var total = payroll + addMedicare + incomeTax;
    return {
      salary: salary, k1: k1, extraCosts: extra, employerFica: employerFica, employeeFica: employeeFica, futa: futa,
      payroll: payroll, additionalMedicare: addMedicare, agi: agi, qbiDeduction: qbiDeduction, taxable: taxable,
      incomeTax: incomeTax, total: total, takeHome: profit - extra - total
    };
  }

  /** Comparaison : entreprise individuelle (moteur taxUS) et S corporation, revenu disponible après impôts fédéraux. */
  function compare(input, rules) {
    var sole = T.estimate({ profit: input.profit, status: input.status, sstb: input.sstb }, rules);
    var scorp = sCorp(input, rules);
    return { sole: sole, scorp: scorp, difference: scorp.error ? null : scorp.takeHome - sole.takeHome };
  }

  return { fica: fica, sCorp: sCorp, compare: compare };
});
