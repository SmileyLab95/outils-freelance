/*
 * Moteur : compte bancaire de l'activité au Royaume-Uni, aux États-Unis et au Canada
 * (documentation/25-compte-et-assurance-hors-france.md). Selon la forme de l'activité : la réponse (obligatoire,
 * conseillé…), ses raisons et les démarches, sous forme de clés ; les textes sont dans les pages. Règles dans
 * data/rules/<pays>.json (uk_business_bank_account, uk_limited_company_money, uk_records_retention,
 * us_business_bank_account_irs, us_business_bank_account, us_llc_separate_funds, us_ein, us_ein_entities,
 * us_records_retention, ca_bank_account_own_name, ca_bank_account_business_name, ca_corporation_separate_entity,
 * ca_records_retention). Fonction pure, testée par tests/unit/bank-intl.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).bankIntl = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var STRUCTURES = {
    uk: ["sole_trader", "partnership", "limited"],
    us: ["sole_prop", "single_llc", "entity"],
    ca: ["own_name", "business_name", "corporation"]
  };

  var PLANS = {
    uk: {
      sole_trader: { verdict: "not_required", reasons: ["uk_not_required", "uk_records_identify"], steps: ["uk_check_bank", "uk_records_keep"] },
      partnership: { verdict: "not_required", reasons: ["uk_not_required", "uk_records_identify"], steps: ["uk_check_bank", "uk_records_keep"] },
      limited: { verdict: "company_account", reasons: ["uk_company_separate"], steps: ["uk_company_account"] }
    },
    us: {
      sole_prop: { verdict: "recommended", reasons: ["us_irs_first", "us_no_separation"], steps: ["us_ssn_ok", "us_records_keep"] },
      single_llc: { verdict: "keep_separate", reasons: ["us_irs_first", "us_llc_liability"], steps: ["us_ein_single_llc", "us_records_keep"] },
      entity: { verdict: "keep_separate", reasons: ["us_irs_first", "us_llc_liability"], steps: ["us_ein_entity", "us_records_keep"] }
    },
    ca: {
      own_name: { verdict: "recommended", reasons: ["ca_own_name"], steps: ["ca_records_keep"] },
      business_name: { verdict: "needed_for_cheques", reasons: ["ca_business_name"], steps: ["ca_records_keep"] },
      corporation: { verdict: "corporation_account", reasons: ["ca_corporation"], steps: ["ca_records_keep"] }
    }
  };

  /** country : "uk" | "us" | "ca" ; structure : une valeur de STRUCTURES[country]. Renvoie { verdict, reasons, steps }. */
  function decide(country, structure) {
    var plan = PLANS[country] && PLANS[country][structure];
    if (!plan || STRUCTURES[country].indexOf(structure) < 0) throw new Error("Situation inconnue : " + country + " / " + structure);
    return { verdict: plan.verdict, reasons: plan.reasons.slice(), steps: plan.steps.slice() };
  }

  return { STRUCTURES: STRUCTURES, decide: decide };
});
