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

  /**
   * Année d'activité mixte (documentation/53-activite-mixte.md) : chiffre d'affaires annuel des ventes (goods) et des
   * prestations (services), activité de services (servicesKey), ACRE, versement libératoire. Chaque part à ses taux ;
   * formation professionnelle au plus élevé des deux taux (aucune règle publiée pour l'activité mixte) ; abattements de
   * chaque activité cumulés, au moins micro_abattement_minimum_mixte (F23267), sans dépasser le chiffre d'affaires.
   * Taux en dixièmes de point, comme le simulateur (25,6 % → 256) ; montants en euros non arrondis.
   * Renvoie { errors: ["goods" | "services"] } si une part est illisible ou négative.
   */
  function mixedYear(rules, input) {
    var g = input.goods, s = input.services, errors = [];
    if (!(typeof g === "number" && g >= 0 && g <= MAX)) errors.push("goods");
    if (!(typeof s === "number" && s >= 0 && s <= MAX)) errors.push("services");
    if (errors.length) return { errors: errors };
    var v = activity(rules, "vente"), o = activity(rules, input.servicesKey), acre = input.acre || 0;
    if (o.key === "vente") throw new Error("Activité mixte : la seconde activité doit être une activité de services");
    var t = function (rate) { return Math.round(rate * 1000); };
    var cotisV = t(cotisationRate(v, acre)), cotisO = t(cotisationRate(o, acre)), cfp = Math.max(t(v.cfp), t(o.cfp));
    var ca = g + s;
    var abatt = Math.max(g * Math.round(v.abattement * 100) / 100 + s * Math.round(o.abattement * 100) / 100, rules.micro_abattement_minimum_mixte);
    return {
      ca: ca, rates: { goods: cotisV, services: cotisO, cfp: cfp, vlGoods: t(v.vl), vlServices: t(o.vl),
                       abattGoods: Math.round(v.abattement * 100), abattServices: Math.round(o.abattement * 100) },
      cotisations: g * cotisV / 1000 + s * cotisO / 1000, cfp: ca * cfp / 1000,
      vl: input.vl ? g * t(v.vl) / 1000 + s * t(o.vl) / 1000 : 0,
      taxable: Math.max(0, ca - abatt),
      ceilings: { total: v.plafond, services: o.plafond }
    };
  }

  return { activity: activity, cotisationRate: cotisationRate, setAside: setAside, mixedYear: mixedYear };
});
