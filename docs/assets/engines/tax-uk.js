/*
 * Moteur : impôts d'un indépendant au Royaume-Uni (année fiscale des règles fournies, 6 avril – 5 avril).
 * Income tax (Angleterre, pays de Galles, Irlande du Nord ou Écosse), Class 4 National Insurance,
 * payments on account, et comparaison avec une limited company (salaire, cotisations, impôt sur les sociétés,
 * dividendes). Fonctions pures : les règles viennent de data/rules/uk.json (window.OF_RULES dans le navigateur).
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.brackets : require("./brackets.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).taxUK = api;
})(typeof self !== "undefined" ? self : this, function (B) {
  "use strict";

  /** Personal Allowance, réduite de 1 £ pour 2 £ de revenu au-delà de 100 000 £. */
  function personalAllowance(income, rules) {
    var excess = Math.max(0, income - rules.personal_allowance_taper_threshold);
    return Math.max(0, rules.personal_allowance - excess * rules.personal_allowance_taper_rate);
  }

  function bands(region, rules) {
    return region === "scotland" ? rules.income_tax_bands_scotland : rules.income_tax_bands_ruk;
  }

  /** Income tax sur des revenus d'activité ou de salaire (« non-savings income »). */
  function incomeTax(income, region, rules) {
    var pa = personalAllowance(income, rules);
    var taxable = Math.max(0, income - pa);
    var result = B.progressive(taxable, bands(region, rules));
    return { allowance: pa, taxable: taxable, tax: result.tax, marginal: result.marginal, details: result.details };
  }

  /** Class 4 National Insurance sur le bénéfice d'activité. */
  function class4(profit, rules) {
    var main = Math.max(0, Math.min(profit, rules.class4_upper_profits_limit) - rules.class4_lower_profits_limit);
    var extra = Math.max(0, profit - rules.class4_upper_profits_limit);
    return { main: main * rules.class4_main_rate, additional: extra * rules.class4_additional_rate,
             total: main * rules.class4_main_rate + extra * rules.class4_additional_rate };
  }

  /**
   * Payments on account : deux acomptes de 50 % de la facture Self Assessment, sauf si elle est inférieure
   * à 1 000 £ ou si plus de 80 % de l'impôt a déjà été prélevé à la source.
   */
  function paymentsOnAccount(bill, deducted, rules) {
    var total = bill + (deducted || 0);
    var exempt = bill < rules.payments_on_account_threshold ||
      (total > 0 && (deducted || 0) / total >= rules.payments_on_account_source_deduction_test);
    return { required: !exempt, each: exempt ? 0 : bill * rules.payments_on_account_fraction };
  }

  /**
   * Sole trader : impôt sur le revenu + Class 4 NI sur le bénéfice. Avec un salaire (input.salary), l'impôt dû sur
   * le bénéfice est l'impôt sur salaire + bénéfice moins l'impôt déjà prélevé sur le salaire (PAYE), et cet impôt
   * prélevé compte dans le test des 80 % des payments on account. allowance, taxable, marginal et brackets
   * portent sur le revenu total.
   */
  function soleTrader(input, rules) {
    var profit = Math.max(0, input.profit || 0), salary = Math.max(0, input.salary || 0);
    var all = incomeTax(salary + profit, input.region, rules);
    var onSalary = incomeTax(salary, input.region, rules);
    var it = all.tax - onSalary.tax;
    var ni = class4(profit, rules);
    var total = it + ni.total;
    return {
      profit: profit, salary: salary, incomeTax: it, salaryTax: onSalary.tax, allowance: all.allowance,
      taxable: all.taxable, marginal: all.marginal, brackets: all.details,
      class4: ni.total, class4Main: ni.main, class4Additional: ni.additional,
      total: total, takeHome: profit - total, effectiveRate: profit > 0 ? total / profit : 0,
      paymentsOnAccount: paymentsOnAccount(total, onSalary.tax, rules)
    };
  }

  /** Impôt sur les sociétés avec marginal relief entre les deux seuils. */
  function corporationTax(profits, rules) {
    var p = Math.max(0, profits);
    if (p <= rules.corporation_tax_lower_limit) return p * rules.corporation_tax_small_profits_rate;
    if (p >= rules.corporation_tax_upper_limit) return p * rules.corporation_tax_main_rate;
    return p * rules.corporation_tax_main_rate - (rules.corporation_tax_upper_limit - p) * rules.corporation_tax_marginal_relief_fraction;
  }

  /** Impôt sur les dividendes : barème britannique (même pour un contribuable écossais), après les autres revenus. */
  function dividendTax(dividends, otherTaxable, rules) {
    var start = Math.max(0, otherTaxable);
    var free = Math.min(dividends, rules.dividend_allowance);
    var limits = [
      { to: rules.basic_rate_limit, rate: rules.dividend_ordinary_rate },
      { to: rules.additional_rate_threshold, rate: rules.dividend_upper_rate },
      { to: Infinity, rate: rules.dividend_additional_rate }
    ];
    var from = start + free, end = start + dividends, tax = 0, lower = 0;
    limits.forEach(function (band) {
      var a = Math.max(from, lower), b = Math.min(end, band.to);
      if (b > a) tax += (b - a) * band.rate;
      lower = band.to;
    });
    return tax;
  }

  /**
   * Limited company détenue par un seul dirigeant, sans autre salarié (pas d'Employment Allowance) :
   * salaire, cotisations, impôt sur les sociétés, puis distribution de tout le reste en dividendes.
   */
  function limitedCompany(input, rules) {
    var profit = Math.max(0, input.profit || 0);
    var salary = Math.max(0, Math.min(input.salary || 0, profit));
    var employerNI = Math.max(0, salary - rules.class1_secondary_threshold) * rules.class1_employer_rate;
    if (salary + employerNI > profit) {
      salary = (profit + rules.class1_secondary_threshold * rules.class1_employer_rate) / (1 + rules.class1_employer_rate);
      salary = Math.max(Math.min(salary, profit), 0);
      employerNI = Math.max(0, salary - rules.class1_secondary_threshold) * rules.class1_employer_rate;
    }
    var employeeNI = Math.max(0, Math.min(salary, rules.class1_upper_earnings_limit) - rules.class1_primary_threshold) * rules.class1_employee_main_rate +
      Math.max(0, salary - rules.class1_upper_earnings_limit) * rules.class1_employee_additional_rate;
    var companyProfit = Math.max(0, profit - salary - employerNI - (input.costs || 0));
    var ct = corporationTax(companyProfit, rules);
    var dividends = companyProfit - ct;
    var pa = personalAllowance(salary + dividends, rules);
    var salaryTaxable = Math.max(0, salary - pa);
    var salaryTax = B.progressive(salaryTaxable, bands(input.region, rules)).tax;
    var dividendsTaxable = Math.max(0, dividends - Math.max(0, pa - salary));
    var divTax = dividendTax(dividendsTaxable, salaryTaxable, rules);
    var takeHome = salary - employeeNI - salaryTax + dividends - divTax;
    return {
      profit: profit, salary: salary, employerNI: employerNI, employeeNI: employeeNI, corporationTax: ct,
      dividends: dividends, salaryTax: salaryTax, dividendTax: divTax, costs: input.costs || 0,
      total: employerNI + employeeNI + ct + salaryTax + divTax, takeHome: takeHome
    };
  }

  /** Bénéfice nécessaire (sole trader) pour garder un revenu net donné. */
  function profitForTakeHome(takeHome, input, rules) {
    var f = function (p) { return soleTrader(Object.assign({}, input, { profit: p }), rules).takeHome; };
    return B.solve(f, takeHome, 0, Math.max(1000, takeHome * 4), 0.01);
  }

  /**
   * Intérêts légaux de retard (Late Payment of Commercial Debts (Interest) Act 1998) :
   * 8 % + taux de référence de la Banque d'Angleterre, fixé pour le semestre où la dette est devenue exigible,
   * et indemnité fixe selon le montant de la dette.
   */
  function latePayment(amount, daysLate, referenceRate, rules) {
    var rate = rules.late_payment_statutory_interest_margin + referenceRate;
    var interest = amount * rate * Math.max(0, daysLate) / 365;
    var band = rules.late_payment_fixed_compensation.filter(function (b) {
      return amount >= b.from && (b.to == null || amount <= b.to);
    })[0];
    var compensation = daysLate > 0 && band ? band.amount : 0;
    return { rate: rate, interest: interest, daily: amount * rate / 365, compensation: compensation, total: interest + compensation };
  }

  return { personalAllowance: personalAllowance, incomeTax: incomeTax, class4: class4, paymentsOnAccount: paymentsOnAccount,
           soleTrader: soleTrader, corporationTax: corporationTax, dividendTax: dividendTax, limitedCompany: limitedCompany,
           profitForTakeHome: profitForTakeHome, latePayment: latePayment };
});
