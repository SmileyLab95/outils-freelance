/*
 * Moteur : protection sociale de l'indépendant en France. Indemnités journalières en cas d'arrêt maladie et allocation
 * des travailleurs indépendants (ATI). Chiffres lus dans data/rules/fr.json (ij_maladie_independants, ati_independants,
 * pass_2026, micro_activities, micro_abattement_minimum). Spécification : documentation/50-protection-sociale.md.
 * Fonctions pures, testées par tests/unit/protection-fr.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).protectionFR = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  function day(iso) {
    var m = ISO.exec(iso || "");
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]), d = new Date(t);
    return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? t : null;
  }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  var DAY = 86400000;
  function round2(x) { return Math.round(Number((x * 100).toPrecision(12))) / 100; }

  /** Régime d'indemnisation d'une situation : « artisan_commercant » ou « liberal ». */
  // Micro-entrepreneur : clés de micro_activities (abattement de 71 %, 50 % ou 34 %) ; au réel : revenu saisi.
  var REGIME = { vente: "artisan_commercant", services_bic: "artisan_commercant", liberal_bnc: "liberal",
                 reel_artisan_commercant: "artisan_commercant", reel_liberal: "liberal" };

  /**
   * Revenu d'activité retenu : pour un micro-entrepreneur, chiffre d'affaires moins l'abattement fiscal de son activité
   * (avec son minimum) ; sinon, le revenu saisi. Renvoie null si la saisie est invalide.
   */
  function revenu(rules, situation, montant) {
    if (!REGIME[situation] || !(isFinite(montant) && montant >= 0)) return null;
    var act = (rules.micro_activities || {})[situation];
    if (!act) return montant;
    var abattement = Math.max(montant * act.abattement, rules.micro_abattement_minimum);
    return round2(Math.max(0, montant - abattement));
  }

  /**
   * Indemnités journalières maladie de l'entrepreneur individuel au réel. input : { situation (« reel_artisan_commercant »
   * ou « reel_liberal » ; une situation de micro-entrepreneur renvoie { error: "micro" }), montant (revenu annuel),
   * debut, fin (dates AAAA-MM-JJ de l'arrêt), affilie (au moins 12 mois d'affiliation : true/false) }.
   * Renvoie { regime, revenu, plafond, ij, plafonnee, jours, carence, joursIndemnises, premierJour, dernierJour, total,
   * limite (jours au-delà de la durée maximale), eligible } ou { error }.
   */
  function ijMaladie(rules, input) {
    var R = rules.ij_maladie_independants, regime = REGIME[input.situation];
    if (!regime) return { error: "situation" };
    // La fiche F36708 ne vise que l'entrepreneur individuel au réel : pas de calcul pour un micro-entrepreneur tant que
    // ses règles n'ont pas été lues à une source officielle (documentation/50-protection-sociale.md, D53).
    if ((rules.micro_activities || {})[input.situation]) return { error: "micro" };
    var rev = revenu(rules, input.situation, input.montant);
    if (rev === null) return { error: "montant" };
    var d1 = day(input.debut), d2 = day(input.fin);
    if (d1 === null || d2 === null) return { error: "dates" };
    if (d2 < d1) return { error: "ordre" };
    var plafond = rules.pass_2026 * R.plafond_pass[regime];
    var brut = round2(Math.min(rev, plafond) / R.diviseur), ij = Math.min(brut, R.ij_max[regime]);
    var jours = Math.round((d2 - d1) / DAY) + 1;
    var max = R.duree_max_jours[regime] || null;
    var couverts = max ? Math.min(jours, max) : jours;
    var indemnises = input.affilie ? Math.max(0, couverts - R.carence_jours) : 0;
    return {
      regime: regime, revenu: rev, plafond: plafond, ij: ij, plafonnee: rev >= plafond || brut > ij,
      jours: jours, carence: Math.min(jours, R.carence_jours), joursIndemnises: indemnises,
      premierJour: indemnises ? iso(d1 + R.carence_jours * DAY) : null,
      dernierJour: indemnises ? iso(d1 + (couverts - 1) * DAY) : null,
      total: round2(ij * indemnises), limite: max && jours > max ? jours - max : 0,
      eligible: !!input.affilie
    };
  }

  /**
   * Allocation des travailleurs indépendants. input : { cause (« liquidation », « redressement », « non_viable »,
   * « autre »), deuxAns (activité sans interruption depuis au moins 2 ans dans la même entreprise), situation (clé de
   * REGIME), revenus [année la plus récente, année précédente] (chiffre d'affaires pour un micro-entrepreneur),
   * ressources (ressources personnelles mensuelles), baisse30 (baisse d'au moins 30 % des revenus attestée, pour une
   * activité non viable), date (date du jugement ou de la cessation, facultative), mayotte }.
   * Renvoie { conditions: [{ key, ok }], eligible, revenus (revenus retenus), meilleur (le plus élevé), jourMin, jourMax,
   * duree, totalMin, totalMax, inscription (date limite indicative d'inscription à France Travail) } ou { error }.
   */
  function ati(rules, input) {
    var A = rules.ati_independants;
    if (["liquidation", "redressement", "non_viable", "autre"].indexOf(input.cause) < 0) return { error: "cause" };
    if (!REGIME[input.situation]) return { error: "situation" };
    var revs = (input.revenus || []).map(function (m) { return m === "" || m == null ? 0 : revenu(rules, input.situation, m); });
    if (revs.some(function (r) { return r === null; })) return { error: "revenus" };
    if (!(isFinite(input.ressources) && input.ressources >= 0)) return { error: "ressources" };
    var conditions = [
      { key: "cause", ok: input.cause !== "autre" },
      { key: "anciennete", ok: !!input.deuxAns },
      { key: "revenu", ok: revs.some(function (r) { return r > A.revenu_minimum; }) },
      { key: "ressources", ok: input.ressources < A.ressources_max_mois }
    ];
    if (input.cause === "non_viable") conditions.push({ key: "baisse", ok: !!input.baisse30 });
    var montants = input.mayotte ? A.mayotte : A;
    var t = day(input.date), inscription = null;
    if (t !== null && (input.cause === "liquidation" || input.cause === "redressement")) {
      var d = new Date(t);
      d.setUTCMonth(d.getUTCMonth() + A.inscription_mois);
      // Le 31 suivi d'un mois de 30 jours déborde : le dernier jour du mois visé est retenu.
      if (d.getUTCDate() !== new Date(t).getUTCDate()) d.setUTCDate(0);
      inscription = iso(d.getTime());
    }
    return {
      conditions: conditions, eligible: conditions.every(function (c) { return c.ok; }),
      revenus: revs, meilleur: Math.max.apply(null, revs.concat(0)),
      jourMin: montants.minimum_jour, jourMax: montants.forfait_jour, duree: A.duree_jours,
      totalMin: round2(montants.minimum_jour * A.duree_jours), totalMax: round2(montants.forfait_jour * A.duree_jours),
      inscription: inscription
    };
  }

  return { REGIME: REGIME, revenu: revenu, ijMaladie: ijMaladie, ati: ati, round2: round2 };
});
