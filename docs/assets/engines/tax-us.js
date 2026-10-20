/*
 * Moteur : impôts fédéraux d'un travailleur indépendant aux États-Unis (année fiscale des règles fournies).
 * Self-employment tax (Schedule SE), Additional Medicare Tax, impôt fédéral sur le revenu (barème, déduction
 * forfaitaire, déduction QBI de la section 199A) et acomptes trimestriels (Form 1040-ES).
 * Fonctions pures : les règles viennent de data/rules/us.json (window.OF_RULES dans le navigateur).
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.brackets : require("./brackets.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).taxUS = api;
})(typeof self !== "undefined" ? self : this, function (B) {
  "use strict";

  var STATUSES = ["single", "married_filing_jointly", "married_filing_separately", "head_of_household"];

  function brackets(rules, status) {
    // Le barème des époux imposés séparément suit celui des célibataires jusqu'à 35 %, puis s'arrête à la moitié
    // du seuil des couples. Faute de barème publié dans les règles, on retient celui des célibataires.
    return rules["federal_brackets_" + status] || rules.federal_brackets_single;
  }

  /**
   * Self-employment tax.
   * @param {number} profit  bénéfice net de l'activité (Schedule C)
   * @param {number} wages   salaires W-2 de l'année (réduisent la part Social Security restante)
   */
  function selfEmployment(profit, wages, rules) {
    var earnings = Math.max(0, profit) * rules.se_net_earnings_factor;
    if (earnings < rules.se_tax_minimum_net_earnings) {
      return { earnings: earnings, socialSecurity: 0, medicare: 0, total: 0, deduction: 0 };
    }
    var base = Math.max(0, rules.social_security_wage_base_2026 - Math.max(0, wages || 0));
    var socialSecurity = Math.min(earnings, base) * rules.se_tax_social_security_rate;
    var medicare = earnings * rules.se_tax_medicare_rate;
    var total = socialSecurity + medicare;
    return { earnings: earnings, socialSecurity: socialSecurity, medicare: medicare, total: total,
             deduction: total * rules.se_tax_deduction_share };
  }

  /** Additional Medicare Tax (Form 8959) sur salaires + revenus d'indépendant au-delà du seuil. */
  function additionalMedicare(earnings, wages, status, rules) {
    var threshold = rules.additional_medicare_tax_thresholds[status];
    var wagesOver = Math.max(0, (wages || 0) - threshold);
    var seOver = Math.max(0, earnings - Math.max(0, threshold - (wages || 0)));
    return (wagesOver + seOver) * rules.additional_medicare_tax_rate;
  }

  /**
   * Déduction QBI (section 199A) d'un indépendant sans salarié ni actif amortissable.
   * Sous le seuil : 20 % du QBI, limité à 20 % du revenu imposable avant QBI.
   * Dans la zone de transition : la limite liée aux salaires versés (nulle ici) réduit la déduction
   * proportionnellement ; pour une activité de service « spécifiée » (SSTB), le QBI est en plus réduit
   * par le pourcentage applicable. Au-delà : plus de déduction.
   */
  function qbi(qbiAmount, taxableBeforeQbi, status, sstb, rules) {
    if (qbiAmount <= 0 || taxableBeforeQbi <= 0) return 0;
    var rate = rules.qbi_deduction_rate;
    var threshold = rules.qbi_threshold_2026[status];
    var range = rules.qbi_phase_in_range_2026[status];
    var excess = Math.max(0, taxableBeforeQbi - threshold);
    var f = Math.min(1, excess / range);
    // Au-delà de la zone de transition, une SSTB n'est plus une activité qualifiée : ni déduction ni minimum.
    if (sstb && f >= 1) return 0;
    var tentative = rate * qbiAmount * (sstb ? 1 - f : 1);
    var deduction = tentative * (1 - f);
    var min = rules.qbi_minimum_deduction;
    if (min && qbiAmount >= min.minimum_qbi_required) deduction = Math.max(deduction, min.minimum_deduction);
    return Math.max(0, Math.min(deduction, rate * taxableBeforeQbi, taxableBeforeQbi));
  }

  /**
   * Estimation complète.
   * @param {object} input { profit, status, wages, sstb, stateRate, withheld, retirement }
   *   retirement : cotisations retraite du travailleur indépendant (SEP-IRA, solo 401(k)), déduites de l'AGI et du QBI.
   */
  function estimate(input, rules) {
    var status = STATUSES.indexOf(input.status) >= 0 ? input.status : "single";
    var profit = Math.max(0, input.profit || 0);
    var wages = Math.max(0, input.wages || 0);
    var se = selfEmployment(profit, wages, rules);
    var addMedicare = additionalMedicare(se.earnings, wages, status, rules);
    var retirement = Math.max(0, input.retirement || 0);
    var agi = profit + wages - se.deduction - retirement;
    var standard = rules.standard_deduction_2026[status];
    var taxableBeforeQbi = Math.max(0, agi - standard);
    var qbiAmount = profit - se.deduction - retirement;
    var qbiDeduction = qbi(qbiAmount, taxableBeforeQbi, status, !!input.sstb, rules);
    var taxable = Math.max(0, taxableBeforeQbi - qbiDeduction);
    var income = B.progressive(taxable, brackets(rules, status));
    var federal = income.tax + se.total + addMedicare;
    // Impôt d'État : estimation à un taux unique sur le revenu de l'activité après la moitié de la SE tax.
    var state = Math.max(0, profit - se.deduction - retirement) * Math.max(0, input.stateRate || 0);
    var total = federal + state;
    return {
      status: status, profit: profit, wages: wages,
      se: se, additionalMedicare: addMedicare,
      agi: agi, standardDeduction: standard, qbiDeduction: qbiDeduction, taxable: taxable,
      incomeTax: income.tax, marginalRate: income.marginal, brackets: income.details,
      federal: federal, state: state, total: total,
      effectiveRate: profit > 0 ? total / profit : 0,
      takeHome: profit - total
    };
  }

  /**
   * Acomptes trimestriels : montant annuel requis selon la règle de sécurité (« safe harbor »).
   * @param {number} currentTax  impôt fédéral total estimé de l'année (income tax + SE tax + Additional Medicare)
   * @param {number} withheld    impôt déjà retenu sur les salaires
   * @param {number|null} priorTax  impôt total de l'année précédente (null si inconnu)
   * @param {number} priorAgi    revenu fiscal (AGI) de l'année précédente
   */
  function quarterly(currentTax, withheld, priorTax, priorAgi, status, rules) {
    var owed = Math.max(0, currentTax - (withheld || 0));
    var currentRule = currentTax * rules.estimated_tax_safe_harbor_current_year_rate;
    var limit = rules.estimated_tax_high_agi_threshold[status === "married_filing_separately" ? "married_filing_separately" : "default"];
    var priorRate = (priorAgi || 0) > limit ? rules.estimated_tax_safe_harbor_prior_year_rate_high_agi
                                             : rules.estimated_tax_safe_harbor_prior_year_rate;
    var priorRule = priorTax == null || priorTax < 0 ? Infinity : priorTax * priorRate;
    var required = Math.max(0, Math.min(currentRule, priorRule) - (withheld || 0));
    var needed = owed >= rules.estimated_tax_threshold;
    return {
      owed: owed, needed: needed, required: needed ? required : 0,
      perQuarter: needed ? required / 4 : 0,
      rule: priorRule < currentRule ? "prior" : "current", priorRate: priorRate,
      dueDates: rules.estimated_tax_due_dates_2026
    };
  }

  /** Bénéfice nécessaire pour garder un revenu net donné après impôts (inverse de estimate). */
  function profitForTakeHome(takeHome, input, rules) {
    var f = function (p) { return estimate(Object.assign({}, input, { profit: p }), rules).takeHome; };
    return B.solve(f, takeHome, 0, Math.max(1000, takeHome * 4), 0.01);
  }

  return { STATUSES: STATUSES, selfEmployment: selfEmployment, additionalMedicare: additionalMedicare,
           qbi: qbi, estimate: estimate, quarterly: quarterly, profitForTakeHome: profitForTakeHome };
});
