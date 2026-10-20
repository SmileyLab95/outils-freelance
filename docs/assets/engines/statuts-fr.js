/*
 * Moteur : comparaison des statuts d'un indépendant en France (revenu disponible pour une part de quotient familial).
 * Micro-entreprise (taux officiels), entreprise individuelle au réel ou EURL à l'IR (cotisations TNS au taux moyen
 * choisi), SASU (rémunération et/ou dividendes, charges au taux moyen choisi, IS, prélèvement forfaitaire unique),
 * EURL à l'IS (rémunération du gérant TNS, IS, dividendes soumis aux cotisations TNS au-delà de 10 % du capital).
 * Les taux moyens de cotisations TNS et assimilé salarié sont des hypothèses modifiables, pas des barèmes exacts.
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.brackets : require("./brackets.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).statutsFR = api;
})(typeof self !== "undefined" ? self : this, function (B) {
  "use strict";

  /** Impôt sur le revenu pour une part (sans décote ni réductions). */
  function incomeTax(taxable, rules) {
    return B.progressive(Math.max(0, taxable), rules.ir_bareme_revenus_2025).tax;
  }

  /** Impôt sur les sociétés : taux réduit jusqu'au seuil, taux normal au-delà. */
  function corporateTax(profit, rules) {
    var p = Math.max(0, profit);
    var low = Math.min(p, rules.is_seuil_taux_reduit);
    return low * rules.is_taux_reduit + (p - low) * rules.is_taux_normal;
  }

  /** Micro-entreprise : cotisations sur le chiffre d'affaires, impôt après abattement (ou versement libératoire). */
  function micro(input, rules) {
    var a = rules.micro_activities[input.activity] || rules.micro_activities.liberal_bnc;
    var ca = Math.max(0, input.revenue || 0);
    var social = ca * (a.cotisations + a.cfp);
    var tax = input.vl ? ca * a.versement_liberatoire : incomeTax(ca - Math.max(ca * a.abattement, rules.micro_abattement_minimum), rules);
    var available = ca - (input.expenses || 0) - social - tax;
    return { social: social, tax: tax, available: available, overCeiling: ca > a.plafond_ca, ceiling: a.plafond_ca };
  }

  /** Entreprise individuelle au réel ou EURL à l'IR : cotisations TNS ≈ taux × revenu net. */
  function realRegime(input, rules) {
    var profit = Math.max(0, (input.revenue || 0) - (input.expenses || 0));
    var net = profit / (1 + input.tnsRate);
    var social = profit - net;
    var tax = incomeTax(net, rules);
    return { profit: profit, social: social, tax: tax, available: net - tax };
  }

  /**
   * SASU : une part du bénéfice sert à la rémunération du président (coût total = net × coefficient),
   * le reste supporte l'IS puis est distribué en dividendes soumis au prélèvement forfaitaire unique.
   */
  function sasu(input, rules) {
    var profit = Math.max(0, (input.revenue || 0) - (input.expenses || 0) - (input.companyCosts || 0));
    var budget = profit * Math.min(1, Math.max(0, input.salaryShare));
    var netSalary = budget / input.sasuCoef;
    var social = budget - netSalary;
    var salaryTax = incomeTax(netSalary * 0.9, rules);
    var is = corporateTax(profit - budget, rules);
    var dividends = profit - budget - is;
    var pfu = dividends * rules.pfu_total_dividendes_2026;
    return { profit: profit, netSalary: netSalary, social: social, salaryTax: salaryTax, is: is, dividends: dividends, pfu: pfu,
             tax: salaryTax + is + pfu, available: netSalary - salaryTax + dividends - pfu };
  }

  /**
   * EURL à l'IS, gérant associé unique (TNS) : la rémunération (coût = net × (1 + taux TNS)) est déduite du bénéfice,
   * le reste supporte l'IS puis est distribué. Les dividendes jusqu'à 10 % du capital et des comptes courants
   * supportent le prélèvement forfaitaire unique ; au-delà, des cotisations TNS (même taux moyen) et la part impôt du PFU.
   */
  function eurlIS(input, rules) {
    var profit = Math.max(0, (input.revenue || 0) - (input.expenses || 0) - (input.companyCosts || 0));
    var budget = profit * Math.min(1, Math.max(0, input.salaryShare));
    var netSalary = budget / (1 + input.tnsRate);
    var salarySocial = budget - netSalary;
    var salaryTax = incomeTax(netSalary * 0.9, rules);
    var is = corporateTax(profit - budget, rules);
    var dividends = profit - budget - is;
    var normal = Math.min(dividends, Math.max(0, input.capital || 0) * 0.1);
    var excess = dividends - normal;
    var dividendSocial = excess * input.tnsRate;
    var pfu = normal * rules.pfu_total_dividendes_2026 + excess * rules.pfu_part_impot;
    return { profit: profit, netSalary: netSalary, social: salarySocial + dividendSocial, dividendSocial: dividendSocial,
             salaryTax: salaryTax, is: is, dividends: dividends, pfu: pfu, tax: salaryTax + is + pfu,
             available: netSalary - salaryTax + dividends - dividendSocial - pfu };
  }

  return { incomeTax: incomeTax, corporateTax: corporateTax, micro: micro, realRegime: realRegime, sasu: sasu, eurlIS: eurlIS };
});
