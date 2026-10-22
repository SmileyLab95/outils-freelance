/*
 * Moteur : facturer un client étranger depuis les États-Unis (taxe du pays du client et démarches américaines).
 * Spécification : documentation/22-client-etranger-us-et-w8ben.md ; règles communes dans data/rules/shared.json
 * (eu_b2b_reverse_charge, eu_b2c_general_rule, eu_non_union_scheme, uk_b2b_reverse_charge_overseas,
 * place_of_supply_services_b2c, uk_netp_no_threshold, ca_b2b_nonresident, ca_simplified_regime) et américaines dans
 * data/rules/us.json (us_foreign_currency_translation, us_form_6166, us_ftc_source_rule, us_fbar,
 * states_tax_services_by_default). Fonction pure, testée par tests/unit/international-us.test.mjs ; les textes sont
 * dans la page, le moteur ne renvoie que des clés.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).internationalUS = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LOCATIONS = ["eu", "uk", "canada", "world"], CUSTOMERS = ["business", "consumer"],
      SERVICES = ["digital", "remote", "place"], WORKPLACES = ["us", "abroad"];

  /**
   * input : { location: "eu" | "uk" | "canada" | "world" (pays où le client est établi ou habite), customer:
   * "business" | "consumer", service: "digital" (service numérique automatisé : téléchargement, cours préenregistré,
   * logiciel en ligne) | "remote" (autre service rendu à distance : conseil, design, rédaction, cours en direct) |
   * "place" (service lié à un lieu ou fait sur place : immobilier, événements, transport, travail chez le client),
   * workplace: "us" (tout le travail est fait aux États-Unis) | "abroad" (une partie est faite à l'étranger) }.
   * Renvoie { verdict, reasons, wording, actions, us } : verdict et listes de clés de textes, dans l'ordre
   * d'affichage ; « us » : démarches américaines, les mêmes pour tout client étranger, sauf la retenue étrangère.
   * verdict « check » : la réponse dépend de règles que l'outil ne tranche pas (service lié à un lieu, autre pays).
   */
  function decide(input) {
    var location = input.location, customer = input.customer, service = input.service, workplace = input.workplace;
    if (LOCATIONS.indexOf(location) < 0 || CUSTOMERS.indexOf(customer) < 0 || SERVICES.indexOf(service) < 0 ||
        WORKPLACES.indexOf(workplace) < 0)
      throw new Error("Situation inconnue : " + JSON.stringify(input));
    // Travail fait aux États-Unis : revenu de source américaine, crédit d'impôt étranger en général impossible.
    var us = ["report_in_dollars", workplace === "us" ? "withholding_us_work" : "withholding_abroad_work", "fbar", "state_sales_tax"];
    var result = function (verdict, reasons, wording, actions) {
      return { verdict: verdict, reasons: reasons, wording: wording, actions: actions, us: us };
    };

    // Service lié à un lieu (règles particulières dans tous les pays) ou pays non couvert : pas de réponse ferme.
    if (service === "place") return result("check", ["special_rules_place"], ["check_wording"], ["check_local"]);
    if (location === "world") return result("check", ["world_rules"], ["check_wording"], ["check_local"]);

    if (customer === "business") {
      if (location === "canada") return result("no_foreign_tax", ["ca_b2b"], ["customer_gst_number"], ["evidence_gst_number"]);
      return result("no_foreign_tax", [location === "eu" ? "eu_b2b" : "uk_b2b"], ["reverse_charge_wording", "customer_vat_number"],
        ["evidence_business"]);
    }

    // Particulier. Canada : régime simplifié pour les services comme pour les produits numériques, au-delà du seuil.
    if (location === "canada") return result("threshold", ["ca_consumer_threshold"], ["ca_tax_once_registered"], ["ca_track_threshold"]);
    if (service === "digital") {
      return location === "eu"
        ? result("foreign_vat", ["eu_digital_consumer"], ["eu_vat_shown"], ["oss_register", "evidence_location"])
        : result("foreign_vat", ["uk_digital_consumer"], ["uk_vat_shown"], ["uk_register", "evidence_location"]);
    }
    // Autre service à distance : règle générale (lieu du prestataire, hors de l'UE et du Royaume-Uni), exceptions.
    return result("usually_none", [location === "eu" ? "eu_b2c_general" : "uk_b2c_general"], ["no_vat_shown"], ["check_local"]);
  }

  return { decide: decide, LOCATIONS: LOCATIONS, CUSTOMERS: CUSTOMERS, SERVICES: SERVICES, WORKPLACES: WORKPLACES };
});
