/*
 * Moteur : facturer un client étranger depuis le Royaume-Uni (TVA des prestations de services). Spécification :
 * documentation/pays/uk.md (« assistant Invoicing overseas clients ») ; règles dans data/rules/uk.json
 * (place_of_supply_*, b2c_described_services_outside_uk, digital_services_consumers, eu_non_union_scheme,
 * outside_scope_*, vat_territory_isle_of_man). Fonction pure, testée par tests/unit/international-uk.test.mjs ; les
 * textes sont dans la page, le moteur ne renvoie que des clés.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).internationalUK = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LOCATIONS = ["uk", "eu", "world"], CUSTOMERS = ["business", "consumer"], SERVICES = ["listed", "digital", "remote", "place"];

  /**
   * input : { registered: booléen (immatriculé à la TVA britannique), location: "uk" (Royaume-Uni ou île de Man) |
   * "eu" | "world" (pays où le client est établi), customer: "business" | "consumer", service: "listed" (services de
   * l'annexe 4A, § 16 : conseil et services semblables, publicité, traitement de données, information, cession de
   * droits) | "digital" (services numériques automatisés) | "remote" (autre service rendu à distance : design,
   * rédaction, traduction…) | "place" (service lié à un lieu : immobilier, événements, formation en présentiel,
   * transport) }.
   * Renvoie { verdict, reasons, wording, actions } : verdict et listes de clés de textes, dans l'ordre d'affichage.
   * verdict « check » : la réponse dépend d'une règle que l'outil ne tranche pas (règles particulières, ou service
   * dont l'appartenance à la liste du § 16 n'est pas établie).
   */
  function decide(input) {
    var registered = !!input.registered, location = input.location, customer = input.customer, service = input.service;
    if (LOCATIONS.indexOf(location) < 0 || CUSTOMERS.indexOf(customer) < 0 || SERVICES.indexOf(service) < 0)
      throw new Error("Situation inconnue : " + JSON.stringify(input));
    // Ventes hors champ : déclarées en case 6 si l'on est immatriculé ; hors du chiffre d'affaires taxable sinon.
    var outside = function (verdict, reasons, wording, actions) {
      return { verdict: verdict, reasons: reasons, wording: wording, actions: actions.concat(registered ? ["box6"] : ["not_taxable_turnover"]) };
    };

    if (location === "uk") {
      return registered
        ? { verdict: "uk_vat", reasons: ["uk_customer"], wording: ["vat_invoice"], actions: [] }
        : { verdict: "no_vat_unregistered", reasons: ["uk_customer_unregistered"], wording: ["no_vat_shown"], actions: ["counts_towards_threshold"] };
    }
    // Service lié à un lieu : règles particulières, examinées avant la règle générale, pour tout client.
    if (service === "place") return { verdict: "check", reasons: ["special_rules_place"], wording: ["check_wording"], actions: ["check_notice"] };

    if (customer === "business") {
      return outside("outside_scope", ["b2b_general_rule"],
        location === "eu" ? ["outside_scope_wording", "customer_vat_number"] : ["outside_scope_wording"], ["evidence_business"]);
    }

    // Particulier établi hors du Royaume-Uni et de l'île de Man.
    if (service === "listed") return outside("outside_scope", ["b2c_described_services"], ["outside_scope_wording"], ["evidence_location"]);
    if (service === "digital") {
      return location === "eu"
        ? outside("eu_vat", ["digital_eu_consumer"], ["eu_vat_shown"], ["oss_register", "evidence_location"])
        : outside("outside_scope", ["digital_consumer_world"], ["outside_scope_wording"], ["local_rules", "evidence_location"]);
    }
    // Autre service à distance : hors champ s'il relève de la liste du § 16, sinon règle générale (lieu du prestataire).
    return registered
      ? { verdict: "check", reasons: ["b2c_remote_unsettled"], wording: ["check_wording"], actions: ["check_notice"] }
      : { verdict: "no_vat_unregistered", reasons: ["b2c_remote_unregistered"], wording: ["no_vat_shown"], actions: ["counts_if_uk"] };
  }

  return { decide: decide, LOCATIONS: LOCATIONS, CUSTOMERS: CUSTOMERS, SERVICES: SERVICES };
});
