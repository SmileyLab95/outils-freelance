/*
 * Moteur : assurances de l'activité au Royaume-Uni, aux États-Unis et au Canada
 * (documentation/25-compte-et-assurance-hors-france.md, § 4). Selon la situation : la réponse principale et la liste
 * des assurances, chacune avec son niveau (obligatoire, à vérifier, à faire, conseillée, facultative, pas obligatoire), sous
 * forme de clés ; les textes sont dans les pages. Règles dans data/rules/<pays>.json
 * (uk_employers_liability_insurance, uk_compulsory_business_insurance, uk_business_from_home, us_employer_insurance,
 * us_texas_workers_comp, us_workers_comp_owners, us_business_insurance_types, ca_workers_comp_personal_coverage,
 * ca_home_based_business_insurance). Fonction pure, testée par tests/unit/insurance-intl.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).insuranceIntl = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LEVELS = ["required", "check", "todo", "recommended", "optional", "not_required"];
  var UK_STRUCTURES = ["sole_trader", "limited"];
  var UK_STAFF = ["none", "family", "employees"];
  var US_STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS",
    "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
    "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];
  var CA_PROVINCES = ["ON", "QC", "BC", "AB", "SK", "MB", "NS", "NB", "PE", "NL", "YT", "NT", "NU"];

  function item(key, level) { return { key: key, level: level }; }

  function sortItems(items) {
    return items.sort(function (a, b) { return LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level); });
  }

  /**
   * input : { structure: "sole_trader" (ou partnership) | "limited", staff: "none" | "family" | "employees",
   * vehicle, advice, regulated, home: booléens }.
   */
  function checkUK(input, rules) {
    var el = rules.uk_employers_liability_insurance;
    if (UK_STRUCTURES.indexOf(input.structure) < 0 || UK_STAFF.indexOf(input.staff) < 0) throw new Error("Situation inconnue : " + JSON.stringify(input));
    var items = [], limited = input.structure === "limited";
    if (input.staff === "employees") items.push(item("uk_el_employees", "required"));
    else if (input.staff === "family" && limited && !el.family_exemption_for_limited_companies) items.push(item("uk_el_company_family", "required"));
    else if (input.staff === "family") items.push(item("uk_el_family", "not_required"));
    else if (limited) items.push(item("uk_el_company_alone", "check"));
    else items.push(item("uk_el_alone", "not_required"));
    if (input.vehicle) items.push(item("uk_motor", "required"));
    if (input.regulated) items.push(item("uk_pi_regulated", "check"));
    else if (input.advice) items.push(item("uk_pi_advice", "recommended"));
    items.push(item("uk_public_liability", "recommended"));
    if (input.home) items.push(item("uk_home", "todo"));
    return result(items);
  }

  /** input : { state: code de l'État (51 juridictions), employees, services, home: booléens }. */
  function checkUS(input, rules) {
    var employer = rules.us_employer_insurance;
    if (US_STATES.indexOf(input.state) < 0) throw new Error("État inconnu : " + JSON.stringify(input));
    var items = [];
    if (input.employees) {
      items.push(input.state === "TX" && rules.us_texas_workers_comp.optional_for_private_employers
        ? item("us_wc_texas", "check") : item("us_wc_employees", "required"));
      items.push(item("us_unemployment", "required"));
      if (employer.disability_states.indexOf(input.state) > -1) items.push(item("us_disability", "required"));
    }
    items.push(item("us_wc_owner", "optional"));
    items.push(item("us_general_liability", "recommended"));
    if (input.services) items.push(item("us_professional_liability", "recommended"));
    if (input.home) items.push(item("us_home_rider", "recommended"));
    return result(items);
  }

  /** input : { province: code (13 provinces et territoires), employees, construction, home: booléens }. */
  function checkCA(input, rules) {
    if (CA_PROVINCES.indexOf(input.province) < 0) throw new Error("Province inconnue : " + JSON.stringify(input));
    var board = rules.ca_workers_comp_personal_coverage[input.province], items = [];
    items.push(input.construction && board.construction_compulsory
      ? item("ca_self_construction", "required") : item("ca_self_optional", "optional"));
    if (input.employees) items.push(item("ca_workers", "check"));
    if (input.home) items.push(item("ca_home", "todo"));
    items.push(item("ca_business", "recommended"));
    return result(items);
  }

  // La réponse principale : « some » si au moins une assurance est obligatoire, « check » si une ligne au moins est
  // à vérifier et aucune n'est obligatoire, « none » sinon.
  function result(items) {
    sortItems(items);
    var levels = items.map(function (i) { return i.level; });
    var verdict = levels.indexOf("required") > -1 ? "some" : levels.indexOf("check") > -1 ? "check" : "none";
    return { verdict: verdict, items: items };
  }

  var CHECKS = { uk: checkUK, us: checkUS, ca: checkCA };

  /** country : "uk" | "us" | "ca". Renvoie { verdict, items: [{ key, level }] }, items rangés par niveau. */
  function check(country, input, rules) {
    if (!CHECKS[country]) throw new Error("Pays inconnu : " + country);
    return CHECKS[country](input, rules);
  }

  return { LEVELS: LEVELS, UK_STRUCTURES: UK_STRUCTURES, UK_STAFF: UK_STAFF, US_STATES: US_STATES,
           CA_PROVINCES: CA_PROVINCES, check: check };
});
