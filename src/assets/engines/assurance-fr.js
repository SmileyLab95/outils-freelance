/*
 * Moteur : assurances de l'indépendant (France). Règles : documentation/15-guides-gestion.md, § 2 ; sources dans
 * data/rules/fr.json (assurance_*). Fonction pure, testée par tests/unit/assurance-fr.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).assuranceFR = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ACTIVITIES = ["construction", "artisan", "reglementee", "services", "commerce"];

  /**
   * Assurances obligatoires et conseillées, et ce qu'il faut porter sur les devis et factures.
   * input : { activity: "construction" | "artisan" | "reglementee" | "services" | "commerce",
   *           micro: micro-entrepreneur, artisan: immatriculé au secteur des métiers et de l'artisanat (implicite pour
   *           l'activité « artisan »), vehicle: véhicule utilisé pour l'activité } (booléens).
   * Renvoie { activity, required, recommended, documents } :
   *   required : "decennale", "rc-profession" (selon le texte de la profession), "rc-auto" ;
   *   recommended : "rc-batiment" (citée par le ministère de l'Économie pour le bâtiment, sans article de loi relevé :
   *   à vérifier), "rc-pro", "rc-metier" (à vérifier pour son métier) ;
   *   documents : "attestation" (décennale, art. L243-2 C. assur.), "mention" (art. L132-1 C. artisanat : une
   *   assurance est obligatoire), "mention-if-required" (mention due seulement si le métier impose une assurance),
   *   "none" (ni artisan ni micro-entrepreneur : pas de mention au titre de l'art. L132-1).
   */
  function check(input) {
    var activity = ACTIVITIES.indexOf(input.activity) > -1 ? input.activity : "services";
    var required = [], recommended = [];
    if (activity === "construction") { required.push("decennale"); recommended.push("rc-batiment"); }
    else if (activity === "reglementee") required.push("rc-profession");
    else if (activity === "artisan") recommended.push("rc-metier");
    else recommended.push("rc-pro");
    if (input.vehicle) required.push("rc-auto");

    // La mention de l'art. L132-1 vise les artisans et les micro-entrepreneurs, sauf les constructeurs (attestation).
    var concerned = !!input.micro || !!input.artisan || activity === "artisan", documents;
    if (activity === "construction") documents = "attestation";
    else if (!concerned) documents = "none";
    else documents = activity === "reglementee" ? "mention" : "mention-if-required";
    return { activity: activity, required: required, recommended: recommended, documents: documents };
  }

  return { ACTIVITIES: ACTIVITIES, check: check };
});
