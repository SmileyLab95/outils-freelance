/*
 * Moteur : micro-entreprise (France). Taux par activité lus dans data/rules/fr.json (micro_activities), partagés par
 * le simulateur et le calculateur « combien mettre de côté » ; montant à mettre de côté sur un paiement.
 * Spécification : documentation/15-guides-gestion.md, § 4. Fonctions pures, testées par tests/unit/micro-fr.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).microFR = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Taux et seuils d'une activité (vente, services_bic, artisan, liberal_bnc, cipav), tels que publiés. */
  function activity(rules, key) {
    var r = (rules.micro_activities || {})[key];
    if (!r) throw new Error("Activité de micro-entreprise inconnue : " + key);
    return {
      key: key, cotisations: r.cotisations, acre: { 50: r.acre_50, 25: r.acre_25 }, cfp: r.cfp,
      vl: r.versement_liberatoire, abattement: r.abattement,
      plafond: r.plafond_ca, tva: r.tva_seuil, tvaMajore: r.tva_seuil_majore
    };
  }

  /** Taux de cotisations : taux minoré publié avec l'ACRE (réduction de 50 % ou 25 %), sinon taux normal. */
  function cotisationRate(act, acre) {
    return acre ? act.acre[acre] : act.cotisations;
  }

  // Calculs en centimes et en cent-millièmes de taux : entiers exacts, arrondi au centime le plus proche.
  var SCALE = 100000;
  var scaled = function (rate) { return Math.round(rate * SCALE); };
  function mul(cents, rate) {
    return Math.floor((cents * scaled(rate) + SCALE / 2) / SCALE);
  }
  function withoutVat(cents, vatRate) {
    var d = SCALE + scaled(vatRate);
    return Math.floor((2 * cents * SCALE + d) / (2 * d));
  }

  var MAX = 1e9;   // au-delà, les calculs en entiers ne sont plus exacts (centimes × 100 000 < 2^53)

  /**
   * Montant à mettre de côté sur un paiement reçu.
   * input : { amount (€, TVA comprise s'il y en a), vatRate (0 en franchise), activity (objet de activity()),
   *           acre (0, 50 ou 25), vl (versement libératoire), pasRate (taux du foyer, 0 à 1, ou null s'il n'est pas
   *           connu ; ignoré avec le versement libératoire) }.
   * Saisies de l'utilisateur invalides (montant illisible, négatif ou supérieur à un milliard ; taux hors de 0 à 1) :
   * renvoie { errors: ["amount", "pasRate"] } (celles qui le sont). Un taux de TVA ou d'ACRE inconnu est une erreur
   * de programmation : exception.
   * Sinon, montants en euros : ht, vat, cotisations, cfp, taxable (base de l'acompte : hors taxes après abattement),
   * tax (null si le taux du foyer n'est pas connu), taxMode ("vl", "pas" ou "unknown"), total, keep (reste
   * disponible), share (part du paiement à mettre de côté).
   */
  function setAside(input) {
    var amount = input.amount, vatRate = input.vatRate || 0, act = input.activity, acre = input.acre || 0;
    var pas = input.vl || input.pasRate === null || input.pasRate === undefined ? null : input.pasRate;
    if (!(vatRate >= 0 && vatRate < 1)) throw new Error("Taux de TVA invalide : " + input.vatRate);
    if (acre && !(act.acre[acre] >= 0)) throw new Error("Réduction ACRE inconnue : " + input.acre);
    var errors = [];
    if (!(typeof amount === "number" && amount >= 0 && amount <= MAX)) errors.push("amount");
    if (pas !== null && !(typeof pas === "number" && pas >= 0 && pas <= 1)) errors.push("pasRate");
    if (errors.length) return { errors: errors };
    var c = Math.round(amount * 100) + 0;   // + 0 : jamais de « -0 »
    var ht = withoutVat(c, vatRate), vat = c - ht;
    var cotisations = mul(ht, cotisationRate(act, acre)), cfp = mul(ht, act.cfp);
    var taxable = ht - mul(ht, act.abattement), tax, taxMode;
    if (input.vl) { tax = mul(ht, act.vl); taxMode = "vl"; }
    else if (pas !== null) { tax = mul(taxable, pas + 0); taxMode = "pas"; }
    else { tax = null; taxMode = "unknown"; }
    var total = vat + cotisations + cfp + (tax || 0);
    var eur = function (cents) { return cents / 100; };
    return {
      ht: eur(ht), vat: eur(vat), cotisations: eur(cotisations), cfp: eur(cfp), taxable: eur(taxable),
      tax: tax === null ? null : eur(tax), taxMode: taxMode, total: eur(total), keep: eur(c - total),
      share: c > 0 ? total / c : 0
    };
  }

  return { activity: activity, cotisationRate: cotisationRate, setAside: setAside };
});
