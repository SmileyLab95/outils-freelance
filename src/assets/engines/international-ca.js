/*
 * Moteur : facturer un client hors du Canada (TPS/TVH et TVQ des prestations de services). Spécification :
 * documentation/pays/ca.md (« assistant Invoicing clients outside Canada ») ; règles dans data/rules/ca.json
 * (export_services_zero_rated, export_professional_services_zero_rated, export_ip_non_registered,
 * export_evidence_non_resident, small_supplier_includes_zero_rated, gst_return_line_101, quick_method_zero_rated,
 * qst_services_non_residents_zero_rated). Fonction pure, testée par tests/unit/international-ca.test.mjs ; les textes
 * sont dans chaque page (anglais, français), le moteur ne renvoie que des clés.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).internationalCA = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LOCATIONS = ["abroad", "canada"], SERVICES = ["professional", "other", "ip", "property"];

  /**
   * input : { registered: booléen (inscrit à la TPS/TVH, et à la TVQ au Québec), quebec: booléen (entreprise au
   * Québec), location: "abroad" (client non-résident) | "canada" (résident, ou établissement au Canada),
   * service: "professional" (conseil, services professionnels : art. 23) | "other" (autre service : art. 7) |
   * "ip" (cession ou licence de propriété intellectuelle : art. 10) | "property" (service lié à un immeuble situé au
   * Canada ou à un bien qui s'y trouve), present: booléen (service rendu en personne au Canada, ou client
   * particulier au Canada quand il traite avec vous) }.
   * Renvoie { verdict, reasons, wording, actions } : verdict et listes de clés, dans l'ordre d'affichage.
   * verdict « check » : la réponse dépend d'une règle que l'outil ne tranche pas.
   */
  function decide(input) {
    var registered = !!input.registered, quebec = !!input.quebec, location = input.location, service = input.service;
    if (LOCATIONS.indexOf(location) < 0 || SERVICES.indexOf(service) < 0) throw new Error("Situation inconnue : " + JSON.stringify(input));
    var check = function (reason) { return { verdict: "check", reasons: [reason], wording: ["check_wording"], actions: ["check_memo"] }; };
    // Fourniture taxable au Canada : taxe au taux de la province (inscrit) ; sinon, aucune taxe, mais la vente compte
    // dans le seuil du petit fournisseur.
    var taxable = function (reason) {
      return registered
        ? { verdict: "charge_tax", reasons: [reason].concat(quebec ? ["qst_where_supplied"] : []), wording: ["tax_invoice"], actions: [] }
        : { verdict: "no_tax_unregistered", reasons: [reason, "unregistered"], wording: ["no_tax_shown"], actions: ["counts_threshold"] };
    };
    // Exportation détaxée (0 %), TVQ comprise pour une entreprise du Québec.
    var zeroRated = function (reasons) {
      reasons = reasons.concat(quebec ? ["qst_zero_rated"] : []);
      return registered
        ? { verdict: "zero_rated", reasons: reasons, wording: [quebec ? "zero_rated_wording_qc" : "zero_rated_wording", "client_address"],
            actions: ["evidence_non_resident", "return_reporting"] }
        : { verdict: "no_tax_unregistered", reasons: reasons.concat(["unregistered"]), wording: ["no_tax_shown", "client_address"],
            actions: ["evidence_non_resident", "counts_threshold_exports"] };
    };

    if (location === "canada") return taxable("canada_customer");
    if (service === "property") return taxable("exception_property");
    if (service === "ip") return check("ip_rules");
    if (service === "professional") {
      // Article 23 : ses exceptions ne visent pas la simple présence du client au Canada ; l'outil ne tranche pas.
      return input.present ? check("professional_present") : zeroRated(["export_professional", "exception_litigation"]);
    }
    return input.present ? taxable("exception_individual") : zeroRated(["export_zero_rated", "other_rules"]);
  }

  return { decide: decide, LOCATIONS: LOCATIONS, SERVICES: SERVICES };
});
