/*
 * Moteur : impôt sur le revenu en France pour une personne seule (une part, sans autre revenu) : barème des revenus
 * de 2025, décote, déduction forfaitaire de 10 % des salaires. Partagé par le comparateur de statuts et « Salarié ou
 * freelance ? » (une seule source pour l'impôt). Règles de data/rules/fr.json : ir_bareme_revenus_2025, ir_decote,
 * ir_deduction_frais_salaires. Fonctions pures, testées par tests/unit/ir-fr.test.mjs.
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.brackets : require("./brackets.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).irFR = api;
})(typeof self !== "undefined" ? self : this, function (B) {
  "use strict";

  /** Impôt sur un revenu imposable, décote comprise, sans réductions ni crédits d'impôt : { raw, decote, tax }. */
  function incomeTax(taxable, rules) {
    var raw = B.progressive(Math.max(0, taxable), rules.ir_bareme_revenus_2025).tax;
    var D = rules.ir_decote;
    var decote = raw < D.seuil_impot_celibataire ? Math.min(raw, Math.max(0, D.forfait_celibataire - D.coefficient * raw)) : 0;
    return { raw: raw, decote: decote, tax: raw - decote };
  }

  /** Déduction forfaitaire de 10 % sur un salaire net imposable, entre le minimum (sans dépasser le salaire) et le plafond. */
  function salaryDeduction(netTaxable, rules) {
    var D = rules.ir_deduction_frais_salaires, n = Math.max(0, netTaxable);
    return Math.min(D.maximum, Math.max(n * D.taux, Math.min(D.minimum, n)));
  }

  return { incomeTax: incomeTax, salaryDeduction: salaryDeduction };
});
