/*
 * Moteur : impôts d'un travailleur autonome au Canada (année fiscale des règles fournies).
 * Cotisations RPC/RPC2 (ou RRQ/RRQ2 et RQAP au Québec), impôt fédéral (montant personnel de base dégressif,
 * abattement du Québec) et impôt provincial ou territorial (surtaxe et contribution santé de l'Ontario, déduction pour
 * travailleur du Québec) ; salaire et dividendes non déterminés pour le comparateur de statuts (structure-ca.js).
 * Fonctions pures : les règles viennent de data/rules/ca.json (window.OF_RULES dans le navigateur).
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.brackets : require("./brackets.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).taxCA = api;
})(typeof self !== "undefined" ? self : this, function (B) {
  "use strict";

  /**
   * Cotisations de retraite d'un travailleur autonome (les deux parts).
   * Déductibles : la part « employeur » et la part bonifiée de la part « employé » (1 %), plus tout le RPC2/RRQ2.
   * Crédit d'impôt : la part de base de la part « employé » (4,95 % RPC, 5,3 % RRQ).
   */
  function pensions(profit, quebec, rules) {
    var ympe = quebec ? rules.qpp_maximum_pensionable_earnings : rules.cpp_ympe;
    var yampe = quebec ? rules.qpp2_maximum_additional_earnings : rules.cpp2_yampe;
    var rate = quebec ? rules.qpp_rate_self_employed : rules.cpp_rate_self_employed;
    var employee = quebec ? rules.qpp_rate_employee : rules.cpp_rate_employee;
    var enhanced = rules.cpp_first_additional_rate_employee;
    var rate2 = quebec ? rules.qpp2_rate_self_employed : rules.cpp2_rate_self_employed;
    var earnings = Math.max(0, profit);
    var ce = Math.max(0, Math.min(earnings, ympe) - rules.cpp_basic_exemption);
    var ce2 = Math.max(0, Math.min(earnings, yampe) - ympe);
    var first = ce * rate, second = ce2 * rate2;
    return {
      first: first, second: second, total: first + second,
      deduction: ce * (rate / 2 + enhanced) + second,
      creditBase: ce * (employee - enhanced)
    };
  }

  /** Prime du RQAP (Québec) d'un travailleur autonome, à partir de 2 000 $ de revenu net. */
  function qpip(profit, rules) {
    return profit >= 2000 ? Math.min(profit, rules.qpip_max_insurable_earnings) * rules.qpip_rate_self_employed : 0;
  }

  /**
   * Prime du RQAP d'un travailleur autonome : la part au-delà du taux « salarié » est déductible (fédéral, ligne 22300,
   * et Québec, annexe R) ; le reste donne un crédit fédéral (ligne 31215), mais aucun crédit du Québec.
   */
  function qpipSplit(premium, rules) {
    var share = (rules.qpip_rate_self_employed - rules.qpip_rate_employee) / rules.qpip_rate_self_employed;
    return { deduction: premium * share, creditBase: premium * (1 - share) };
  }

  /** Cotisations « salarié » au RPC (ou au RRQ) sur un salaire ; l'employeur verse les mêmes montants. */
  function employeePensions(salary, quebec, rules) {
    var ympe = quebec ? rules.qpp_maximum_pensionable_earnings : rules.cpp_ympe;
    var yampe = quebec ? rules.qpp2_maximum_additional_earnings : rules.cpp2_yampe;
    var rate = quebec ? rules.qpp_rate_employee : rules.cpp_rate_employee;
    var rate2 = (quebec ? rules.qpp2_rate_self_employed : rules.cpp2_rate_self_employed) / 2;
    var enhanced = rules.cpp_first_additional_rate_employee;
    var earnings = Math.max(0, salary);
    var ce = Math.max(0, Math.min(earnings, ympe) - rules.cpp_basic_exemption);
    var ce2 = Math.max(0, Math.min(earnings, yampe) - ympe);
    var first = ce * rate, second = ce2 * rate2;
    return { first: first, second: second, total: first + second, deduction: ce * enhanced + second, creditBase: ce * (rate - enhanced) };
  }

  /** Montant personnel de base fédéral, réduit entre les deux seuils de revenu net. */
  function federalBPA(netIncome, rules) {
    var r = rules.federal_bpa_reduction_rule;
    var max = rules.federal_basic_personal_amount_max, min = rules.federal_basic_personal_amount_min;
    var f = Math.min(1, Math.max(0, (netIncome - r.reduction_start_net_income) / (r.reduction_end_net_income - r.reduction_start_net_income)));
    return max - (max - min) * f;
  }

  /**
   * Montant personnel de base provincial : fixe, ou réduit selon le revenu net (Manitoba : de 200 000 $ à 400 000 $,
   * nul au-delà ; Yukon : même réduction que le montant fédéral).
   */
  function provincialBPA(prov, netIncome, rules) {
    if (prov.basic_personal_amount_follows_federal) return federalBPA(netIncome, rules);
    var o = prov.basic_personal_amount_phase_out;
    if (!o) return prov.basic_personal_amount;
    return prov.basic_personal_amount * (1 - Math.min(1, Math.max(0, (netIncome - o.from) / (o.to - o.from))));
  }

  function healthPremium(taxable, rules) {
    var steps = rules.ontario_health_premium_steps.filter(function (s) { return taxable > s.from; });
    if (!steps.length) return 0;
    var s = steps[steps.length - 1];
    return Math.min(s.cap, s.base + s.rate * (taxable - s.from));
  }

  /**
   * Impôt et cotisations d'un particulier : revenu de travail autonome, salaire et dividendes non déterminés.
   * Un revenu de travail autonome et un salaire ensemble ne sont pas prévus (plafonds du RPC comptés séparément).
   * @param {object} input { province, profit, salary, dividends (montant reçu, non majoré), deduction (REER),
   *   insurable (salaire soumis à l'assurance-emploi : salarié sans lien de dépendance ; faux pour l'actionnaire
   *   qui contrôle plus de 40 % des actions) }
   *   Code de province : ON, QC, BC, AB, SK, MB, NS, NB, NL, PE, YT, NT, NU.
   * @param {object} rules valeurs de data/rules/ca.json
   * @param {object} provinces « provinces » de data/rules/ca.json
   * Renvoie aussi dividendCreditMissing si la province n'a pas de taux de crédit pour dividendes (Saskatchewan, Nunavut).
   */
  function personal(input, rules, provinces) {
    var code = provinces[input.province] ? input.province : "ON";
    var prov = provinces[code];
    var quebec = code === "QC";
    var profit = Math.max(0, input.profit || 0), salary = Math.max(0, input.salary || 0), dividends = Math.max(0, input.dividends || 0);

    var pen = pensions(profit, quebec, rules);
    var parental = quebec ? qpip(profit, rules) : 0;
    var split = qpipSplit(parental, rules);
    var emp = employeePensions(salary, quebec, rules);
    var parentalEmployee = quebec ? Math.min(salary, rules.qpip_max_insurable_earnings) * rules.qpip_rate_employee : 0;
    var payrollTax = code === "NT" ? salary * rules.nwt_payroll_tax : 0;
    // Assurance-emploi du salarié : crédit fédéral (ligne 31200) et provincial hors Québec (ligne 58300) ; cotisations
    // remboursées si la rémunération assurable ne dépasse pas 2 000 $.
    var E = rules.ei_rate_employee;
    var ei = input.insurable && salary > E.refund_threshold ? Math.min(salary, rules.ei_max_insurable_earnings) * (quebec ? E.quebec : E.canada) : 0;
    var grossedUp = dividends * (1 + rules.non_eligible_dividend_gross_up);

    var deductions = pen.deduction + split.deduction + emp.deduction;
    var netIncome = Math.max(0, profit + salary + grossedUp - deductions - Math.max(0, input.deduction || 0));
    var taxable = netIncome;

    var fedBrackets = B.progressive(taxable, rules.federal_income_tax_brackets);
    var bpa = federalBPA(netIncome, rules);
    var employment = Math.min(salary, rules.canada_employment_amount_2026);
    var fedCredits = rules.federal_non_refundable_credit_rate *
      (bpa + pen.creditBase + split.creditBase + emp.creditBase + parentalEmployee + employment + ei);
    var fedDividendCredit = grossedUp * rules.federal_dtc_non_eligible;
    var federalBasic = Math.max(0, fedBrackets.tax - fedCredits - fedDividendCredit);
    var abatement = quebec ? federalBasic * rules.quebec_abatement : 0;
    var federal = federalBasic - abatement;

    // Québec : déduction pour travailleur (déclaration du Québec seulement), aucun crédit pour les cotisations.
    var w = rules.quebec_deduction_for_workers;
    var workers = quebec ? Math.min(w.max_2026, w.rate * (profit + salary)) : 0;
    var provTaxable = Math.max(0, taxable - workers);
    var provBrackets = B.progressive(provTaxable, prov.income_tax_brackets);
    var provRate = prov.income_tax_brackets[0].rate;
    var provAmounts = provincialBPA(prov, netIncome, rules) + (quebec ? 0 : pen.creditBase + emp.creditBase + ei) +
      (code === "YT" ? Math.min(salary, rules.yukon_canada_employment_amount_2026) : 0);
    var provCredits = provRate * provAmounts;
    var dtcRate = rules.provincial_dtc_non_eligible_2026[code];
    var missing = dividends > 0 && typeof dtcRate !== "number";
    var provDividendCredit = dividends > 0 && !missing ? grossedUp * dtcRate : 0;
    var provincialBasic = Math.max(0, provBrackets.tax - provCredits);
    var surtax = 0, premium = 0;
    if (code === "ON") {
      var s = rules.ontario_surtax;
      surtax = Math.max(0, provincialBasic - s.threshold_1) * s.rate_1 + Math.max(0, provincialBasic - s.threshold_2) * s.rate_2;
      premium = healthPremium(taxable, rules);
    }
    // Ontario : la surtaxe se calcule avant le crédit pour dividendes (formulaire ON428).
    var provincial = Math.max(0, provincialBasic + surtax - provDividendCredit) + premium;
    var contributions = pen.total + parental + emp.total + parentalEmployee + ei + payrollTax;
    return {
      province: code, quebec: quebec, profit: profit, salary: salary, dividends: dividends, grossedUp: grossedUp,
      pensions: pen, qpip: parental, qpipDeduction: split.deduction, employeePensions: emp, qpipEmployee: parentalEmployee, ei: ei,
      payrollTax: payrollTax, contributions: contributions,
      netIncome: netIncome, taxable: taxable,
      federalBrackets: fedBrackets.tax, federalBPA: bpa, federalCredits: fedCredits, federalDividendCredit: fedDividendCredit,
      abatement: abatement, federal: federal,
      workersDeduction: workers, provincialTaxable: provTaxable,
      provincialBrackets: provBrackets.tax, provincialCredits: provCredits, provincialDividendCredit: provDividendCredit,
      dividendCreditMissing: missing, surtax: surtax, healthPremium: premium, provincial: provincial,
      incomeTax: federal + provincial, total: contributions + federal + provincial,
      marginalFederal: fedBrackets.marginal, marginalProvincial: provBrackets.marginal
    };
  }

  /**
   * Estimation complète pour un travailleur autonome.
   * @param {object} input { profit, province, deduction }  (code de province : ON, QC, BC, AB, SK, MB, NS, NB, NL, PE, YT, NT, NU)
   *   deduction : déductions du revenu net (cotisations REER), sans effet sur le RPC/RRQ.
   * @param {object} rules valeurs de data/rules/ca.json, plus « provinces »
   */
  function estimate(input, rules, provinces) {
    var r = personal({ province: input.province, profit: input.profit, deduction: input.deduction }, rules, provinces);
    r.takeHome = r.profit - r.total;
    r.effectiveRate = r.profit > 0 ? r.total / r.profit : 0;
    return r;
  }

  /**
   * Acomptes provisionnels de l'année (condition de l'année en cours seulement : la loi exige aussi que le seuil ait
   * été dépassé l'une des deux années précédentes, ce que l'appelant doit dire).
   * Hors Québec : impôt et RPC à l'ARC si l'impôt à payer dépasse 3 000 $. Au Québec, deux tests distincts :
   * l'ARC sur l'impôt fédéral (1 800 $), Revenu Québec sur l'impôt du Québec seul (1 800 $, « impôt net à payer ») ;
   * les acomptes à Revenu Québec couvrent alors aussi les cotisations RRQ et RQAP.
   */
  function instalments(result, rules) {
    var dates = rules.instalment_due_dates_2026;
    if (!result.quebec) {
      var owing = result.incomeTax + result.pensions.total, req = owing > rules.instalment_threshold;
      // measure : montant comparé au seuil (jauge) ; au Québec, le plus élevé des deux impôts.
      return { required: req, requiredFederal: req, requiredQuebec: false, threshold: rules.instalment_threshold, measure: owing,
               federal: req ? owing / 4 : 0, quebec: 0, dueDates: dates };
    }
    var t = rules.instalment_threshold_quebec;
    var fed = result.federal > t, qc = result.provincial > t;
    return { required: fed || qc, requiredFederal: fed, requiredQuebec: qc, threshold: t, measure: Math.max(result.federal, result.provincial),
             federal: fed ? result.federal / 4 : 0,
             quebec: qc ? (result.provincial + result.pensions.total + result.qpip) / 4 : 0, dueDates: dates };
  }

  function profitForTakeHome(takeHome, input, rules, provinces) {
    var f = function (p) { return estimate(Object.assign({}, input, { profit: p }), rules, provinces).takeHome; };
    return B.solve(f, takeHome, 0, Math.max(1000, takeHome * 4), 0.01);
  }

  return { pensions: pensions, qpip: qpip, qpipSplit: qpipSplit, employeePensions: employeePensions,
           federalBPA: federalBPA, provincialBPA: provincialBPA, healthPremium: healthPremium, personal: personal,
           estimate: estimate, instalments: instalments, profitForTakeHome: profitForTakeHome };
});
