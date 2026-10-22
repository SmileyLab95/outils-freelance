/*
 * Moteur : entreprise individuelle ou société par actions (SPCC) au Canada, année civile 2026.
 * Spécification : documentation/pays/ca.md (« comparateur Sole proprietor vs corporation ») ; règles dans
 * data/rules/ca.json (corporate_tax_rates_2026, provincial_dtc_non_eligible_2026, fss_employer_rate_2026…).
 * Fonctions pures, testées par tests/unit/structure-ca.test.mjs ; s'appuient sur le moteur taxCA.
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.taxCA : require("./tax-ca.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).structureCA = api;
})(typeof self !== "undefined" ? self : this, function (T) {
  "use strict";

  // Année d'imposition de la société : du 1er janvier au 31 décembre 2026, comme l'impôt personnel.
  var YEAR_START = Date.UTC(2026, 0, 1), YEAR_END = Date.UTC(2027, 0, 1);
  var DAY = 86400000;

  function utc(iso) {
    var p = iso.split("-");
    return Date.UTC(+p[0], +p[1] - 1, +p[2]);
  }

  /**
   * Taux provincial sur le revenu admissible à la déduction pour petite entreprise, pour l'année civile 2026.
   * Changement en cours d'année (Ontario, 1er juillet 2026) : au prorata des jours. Québec : taux réduit seulement
   * avec 5 500 heures rémunérées (sinon taux général) ; la hausse de la déduction ne vise que les années qui
   * commencent après le 29 avril 2026.
   */
  function provincialRate(code, rules, hours5500) {
    var p = rules.corporate_tax_rates_2026.provinces[code];
    if (code === "QC" && !hours5500) return p.higher;
    var c = p.lower_change;
    if (!c) return p.lower;
    if (c.years_starting_after) return YEAR_START > utc(c.years_starting_after) ? c.rate : p.lower;
    var before = Math.min(Math.max((utc(c.from) - YEAR_START) / DAY, 0), (YEAR_END - YEAR_START) / DAY);
    var days = (YEAR_END - YEAR_START) / DAY;
    return (p.lower * before + c.rate * (days - before)) / days;
  }

  /** Charges de l'employeur sur le salaire du dirigeant : RPC ou RRQ (même montant que le salarié), RQAP et FSS au Québec. */
  function employerCosts(salary, code, rules) {
    var quebec = code === "QC";
    var pensions = T.employeePensions(salary, quebec, rules).total;
    var qpip = quebec ? Math.min(salary, rules.qpip_max_insurable_earnings) * rules.qpip_rate_employer : 0;
    var fss = quebec ? salary * rules.fss_employer_rate_2026 : 0;
    return { pensions: pensions, qpip: qpip, fss: fss, total: pensions + qpip + fss };
  }

  /**
   * Société par actions dont le dirigeant est l'unique actionnaire.
   * input : { province, profit (bénéfice avant la rémunération du dirigeant), salary, keep (montant laissé dans la
   *   société après impôt), extraCosts (frais propres à la société), hours5500 (Québec) }.
   * Renvoie le détail, ou { error } : "province_not_available" (taux du crédit pour dividendes inconnu),
   * "salary_too_high", "above_business_limit", "keep_too_high" (avec available).
   */
  function corporation(input, rules, provinces) {
    var code = provinces[input.province] ? input.province : "ON";
    if (typeof rules.provincial_dtc_non_eligible_2026[code] !== "number") return { error: "province_not_available" };
    var profit = Math.max(0, input.profit || 0), salary = Math.max(0, input.salary || 0);
    var extra = Math.max(0, input.extraCosts || 0), keep = Math.max(0, input.keep || 0);
    var employer = employerCosts(salary, code, rules);
    var income = profit - extra - salary - employer.total;
    if (income < 0) return { error: "salary_too_high" };
    var c = rules.corporate_tax_rates_2026;
    if (income > c.federal_business_limit) return { error: "above_business_limit" };
    var provincial = provincialRate(code, rules, !!input.hours5500);
    var rate = c.federal_small_business + provincial;
    var corporateTax = income * rate;
    var afterTax = income - corporateTax;
    if (keep > afterTax + 0.005) return { error: "keep_too_high", available: afterTax };
    keep = Math.min(keep, afterTax);
    var dividends = afterTax - keep;
    var person = T.personal({ province: code, salary: salary, dividends: dividends }, rules, provinces);
    // Impôt reporté : impôt personnel qu'aurait coûté le versement immédiat du montant laissé dans la société.
    var allOut = keep > 0 ? T.personal({ province: code, salary: salary, dividends: afterTax }, rules, provinces) : person;
    return {
      province: code, quebec: code === "QC", salary: salary, extraCosts: extra, employer: employer,
      income: income, provincialRate: provincial, rate: rate, corporateTax: corporateTax, afterTax: afterTax,
      keep: keep, dividends: dividends, personal: person,
      contributions: employer.total + person.contributions, personalTax: person.incomeTax,
      // Cotisations qui ouvrent des droits (RPC ou RRQ, RQAP), sans le FSS ni l'impôt sur le salaire des T.N.-O.
      pensionContributions: employer.pensions + employer.qpip + person.contributions - person.payrollTax,
      total: employer.total + corporateTax + person.total,
      receive: salary + dividends - person.total,
      receiveAllOut: salary + afterTax - allOut.total,
      deferred: allOut.total - person.total
    };
  }

  /**
   * Comparaison avec l'entreprise individuelle (moteur taxCA). difference : (reçu + laissé dans la société) − revenu
   * disponible de l'entreprise individuelle ; differenceAllOut : même écart si tout est versé ; deferred : la part de
   * l'écart qui n'est qu'un report d'impôt ; differenceAllOut = contributionsSaved (RPC ou RRQ et RQAP non versés)
   * + taxesAndCosts.
   */
  function compare(input, rules, provinces) {
    var sole = T.estimate({ profit: input.profit, province: input.province }, rules, provinces);
    var corp = corporation(input, rules, provinces);
    if (corp.error) return { sole: sole, corp: corp, difference: null, differenceAllOut: null, deferred: null };
    return {
      sole: sole, corp: corp,
      difference: corp.receive + corp.keep - sole.takeHome,
      differenceAllOut: corp.receiveAllOut - sole.takeHome,
      deferred: corp.deferred,
      contributionsSaved: sole.contributions - corp.pensionContributions,
      // Reste de l'écart « tout versé » : impôts (société et personnels), FSS, impôt des T.N.-O. et frais.
      taxesAndCosts: corp.receiveAllOut - sole.takeHome - (sole.contributions - corp.pensionContributions)
    };
  }

  return { provincialRate: provincialRate, employerCosts: employerCosts, corporation: corporation, compare: compare };
});
