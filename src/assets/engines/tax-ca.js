/*
 * Moteur : impôts d'un travailleur autonome au Canada (année fiscale des règles fournies).
 * Cotisations RPC/RPC2 (ou RRQ/RRQ2 et RQAP au Québec), impôt fédéral (montant personnel de base dégressif,
 * abattement du Québec) et impôt provincial ou territorial (surtaxe et contribution santé de l'Ontario).
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

  /** Montant personnel de base fédéral, réduit entre les deux seuils de revenu net. */
  function federalBPA(netIncome, rules) {
    var r = rules.federal_bpa_reduction_rule;
    var max = rules.federal_basic_personal_amount_max, min = rules.federal_basic_personal_amount_min;
    var f = Math.min(1, Math.max(0, (netIncome - r.reduction_start_net_income) / (r.reduction_end_net_income - r.reduction_start_net_income)));
    return max - (max - min) * f;
  }

  function healthPremium(taxable, rules) {
    var steps = rules.ontario_health_premium_steps.filter(function (s) { return taxable > s.from; });
    if (!steps.length) return 0;
    var s = steps[steps.length - 1];
    return Math.min(s.cap, s.base + s.rate * (taxable - s.from));
  }

  /**
   * Estimation complète.
   * @param {object} input { profit, province, deduction }  (code de province : ON, QC, BC, AB, SK, MB, NS, NB, NL, PE, YT, NT, NU)
   *   deduction : déductions du revenu net (cotisations REER), sans effet sur le RPC/RRQ.
   * @param {object} rules valeurs de data/rules/ca.json, plus « provinces »
   */
  function estimate(input, rules, provinces) {
    var code = provinces[input.province] ? input.province : "ON";
    var prov = provinces[code];
    var quebec = code === "QC";
    var profit = Math.max(0, input.profit || 0);
    var pen = pensions(profit, quebec, rules);
    var parental = quebec ? qpip(profit, rules) : 0;
    var netIncome = Math.max(0, profit - pen.deduction - Math.max(0, input.deduction || 0));
    var taxable = netIncome;

    var fedBrackets = B.progressive(taxable, rules.federal_income_tax_brackets);
    var bpa = federalBPA(netIncome, rules);
    var fedCredits = rules.federal_non_refundable_credit_rate * (bpa + pen.creditBase);
    var federalBasic = Math.max(0, fedBrackets.tax - fedCredits);
    var abatement = quebec ? federalBasic * rules.quebec_abatement : 0;
    var federal = federalBasic - abatement;

    var provBrackets = B.progressive(taxable, prov.income_tax_brackets);
    var provRate = prov.income_tax_brackets[0].rate;
    var provCredits = provRate * (prov.basic_personal_amount + pen.creditBase);
    var provincialBasic = Math.max(0, provBrackets.tax - provCredits);
    var surtax = 0, premium = 0;
    if (code === "ON") {
      var s = rules.ontario_surtax;
      surtax = Math.max(0, provincialBasic - s.threshold_1) * s.rate_1 + Math.max(0, provincialBasic - s.threshold_2) * s.rate_2;
      premium = healthPremium(taxable, rules);
    }
    var provincial = provincialBasic + surtax + premium;
    var total = pen.total + parental + federal + provincial;
    return {
      province: code, quebec: quebec, profit: profit, pensions: pen, qpip: parental,
      netIncome: netIncome, taxable: taxable,
      federalBrackets: fedBrackets.tax, federalBPA: bpa, federalCredits: fedCredits, abatement: abatement, federal: federal,
      provincialBrackets: provBrackets.tax, provincialCredits: provCredits, surtax: surtax, healthPremium: premium, provincial: provincial,
      incomeTax: federal + provincial, total: total, takeHome: profit - total,
      effectiveRate: profit > 0 ? total / profit : 0,
      marginalFederal: fedBrackets.marginal, marginalProvincial: provBrackets.marginal
    };
  }

  /**
   * Acomptes provisionnels de l'année (condition de l'année en cours seulement : la loi exige aussi que le seuil ait
   * été dépassé l'une des deux années précédentes, ce que l'appelant doit dire).
   * Hors Québec : impôt et RPC à l'ARC si l'impôt à payer dépasse 3 000 $. Au Québec, deux tests distincts :
   * l'ARC sur l'impôt fédéral (1 800 $), Revenu Québec sur l'impôt du Québec et les cotisations RRQ et RQAP (1 800 $ ;
   * cotisations comptées par prudence, question ouverte des règles).
   */
  function instalments(result, rules) {
    var dates = rules.instalment_due_dates_2026;
    if (!result.quebec) {
      var owing = result.incomeTax + result.pensions.total, req = owing > rules.instalment_threshold;
      return { required: req, requiredFederal: req, requiredQuebec: false, threshold: rules.instalment_threshold,
               federal: req ? owing / 4 : 0, quebec: 0, dueDates: dates };
    }
    var t = rules.instalment_threshold_quebec, qcOwing = result.provincial + result.pensions.total + result.qpip;
    var fed = result.federal > t, qc = qcOwing > t;
    return { required: fed || qc, requiredFederal: fed, requiredQuebec: qc, threshold: t,
             federal: fed ? result.federal / 4 : 0, quebec: qc ? qcOwing / 4 : 0, dueDates: dates };
  }

  function profitForTakeHome(takeHome, input, rules, provinces) {
    var f = function (p) { return estimate(Object.assign({}, input, { profit: p }), rules, provinces).takeHome; };
    return B.solve(f, takeHome, 0, Math.max(1000, takeHome * 4), 0.01);
  }

  return { pensions: pensions, qpip: qpip, federalBPA: federalBPA, healthPremium: healthPremium,
           estimate: estimate, instalments: instalments, profitForTakeHome: profitForTakeHome };
});
