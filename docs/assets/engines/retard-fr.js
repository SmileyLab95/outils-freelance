/*
 * Moteur : pénalités de retard entre professionnels (Code de commerce, art. L441-10) et indemnité forfaitaire pour
 * frais de recouvrement (art. D441-5) ; taux de chaque semestre lus dans les règles (intérêt légal du créancier
 * professionnel, taux de refinancement de la BCE au 1er janvier ou au 1er juillet). Un retard qui couvre plusieurs
 * semestres est découpé : chaque semestre à son taux (« le taux applicable pendant le premier semestre… »).
 * Utilisé par le calculateur de pénalités et par les CGV (OFE.cgvFR). Fonctions pures, sans DOM.
 * Spécification : documentation/41-penalites-de-retard.md. Testé par tests/unit/retard-fr.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).retardFR = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DAY = 86400000;
  var round = function (x) { return Math.round(x * 1e6) / 1e6; };
  var cents = function (x) { return Math.round(x * 100) / 100; };
  var isNum = function (x) { return typeof x === "number" && isFinite(x); };

  /** Date ISO → numéro du jour (UTC), NaN si illisible. setUTCFullYear : l'an 0026 reste l'an 26, pas 1926. */
  function day(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return NaN;
    var d = new Date(0);
    d.setUTCFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.getTime() / DAY;
  }
  function iso(n) { return new Date(n * DAY).toISOString().slice(0, 10); }

  /** Semestre d'une date ISO : « 2026-S1 » (janvier à juin) ou « 2026-S2 ». */
  function semester(date) {
    return date.slice(0, 4) + (Number(date.slice(5, 7)) <= 6 ? "-S1" : "-S2");
  }

  /** « premier semestre 2026 » ou « second semestre 2026 ». */
  function semesterLabel(s) {
    return (s.slice(-1) === "1" ? "premier" : "second") + " semestre " + s.slice(0, 4);
  }

  /**
   * Taux du semestre de la date : intérêt légal (créancier professionnel : taux « autres cas »), minimum des pénalités
   * de retard entre professionnels (3 fois ce taux), taux de refinancement de la BCE au 1er janvier ou au 1er juillet et
   * taux des pénalités par défaut (BCE + 10 points). Chaque taux vaut null si le semestre n'est pas dans les règles.
   */
  function rates(rules, date) {
    var s = semester(date);
    var legal = rules.taux_interet_legal && rules.taux_interet_legal[s];
    var bce = rules.taux_bce_refinancement && rules.taux_bce_refinancement[s];
    var hasBce = isNum(bce);
    return {
      semester: s,
      legal: legal ? legal.autres : null,
      minPenalty: legal ? round(3 * legal.autres) : null,
      bce: hasBce ? bce : null,
      defaultPenalty: hasBce ? round(bce + 0.10) : null
    };
  }

  /**
   * Jours de retard découpés par semestre, du lendemain de l'échéance au jour du paiement compris :
   * [{ semester, from, to, days }]. Vide s'il n'y a pas de retard ou si une date manque.
   */
  function periods(due, paid) {
    var a = day(due), b = day(paid), out = [];
    for (var from = a + 1; from <= b;) {
      var s = semester(iso(from));
      var end = Math.min(b, day(s.slice(0, 4) + (s.slice(-1) === "1" ? "-06-30" : "-12-31")));
      out.push({ semester: s, from: iso(from), to: iso(end), days: end - from + 1 });
      from = end + 1;
    }
    return out;
  }

  /**
   * Pénalités de retard et indemnité forfaitaire.
   * input : { amount, due, paid, method, rate, fee }
   *   method : "cgv" (taux des conditions de vente), "legal" (3 fois le taux de l'intérêt légal) ou "bce" (taux de
   *   refinancement de la BCE + 10 points) ;
   *   rate : fraction (0,124 pour 12,40 %) ; pour "cgv", le taux des conditions ; pour "legal" et "bce", un taux saisi
   *   (intérêt légal ou BCE) qui remplace le taux officiel sur tout le retard ; null si vide, NaN si illisible ;
   *   fee : ajouter l'indemnité forfaitaire.
   * Renvoie { days, periods: [{ semester, from, to, days, rate, penalties }], uniform, rate, penalties, fee, total,
   *   error, missing, below } :
   *   error : null, "rate_missing" (taux des conditions à saisir), "rate_invalid" (taux illisible ou négatif) ou
   *   "rates_unknown" (taux officiel d'un semestre absent des règles, listés dans missing) ; avec une erreur ou un
   *   montant illisible ou négatif, penalties et total valent NaN ; sans retard, penalties vaut 0 ;
   *   below : semestres où le taux des conditions est inférieur au minimum légal [{ semester, min }].
   * Montants arrondis au centime : un seul taux sur tout le retard, un seul calcul ; des taux différents, la somme des
   * montants de chaque semestre.
   */
  function compute(input, rules) {
    var a = day(input.due), b = day(input.paid);
    var days = isNaN(a) || isNaN(b) ? NaN : Math.max(0, b - a);
    var ps = periods(input.due, input.paid);
    var amount = input.amount, rate = input.rate, own = input.method === "cgv";
    var error = null, missing = [], below = [];
    if (rate != null && !(isNum(rate) && rate >= 0)) error = "rate_invalid";
    else if (own && !isNum(rate) && ps.length) error = "rate_missing";
    var given = isNum(rate), valid = isNum(amount) && amount >= 0;
    ps.forEach(function (p) {
      var r = rates(rules, p.from);
      if (own) p.rate = rate;
      else if (input.method === "legal") p.rate = given ? round(3 * rate) : r.minPenalty;
      else p.rate = given ? round(rate + 0.10) : r.defaultPenalty;
      if (!error && p.rate === null) missing.push(p.semester);
      if (own && given && r.minPenalty !== null && rate < r.minPenalty) below.push({ semester: p.semester, min: r.minPenalty });
      p.penalties = isNum(p.rate) && valid && !error ? cents(amount * p.rate * p.days / 365) : NaN;
    });
    if (!error && missing.length) error = "rates_unknown";
    var uniform = ps.length > 0 && ps.every(function (p) { return p.rate === ps[0].rate; });
    // Un seul taux : un seul calcul sur tout le retard ; plusieurs taux : somme des montants de chaque semestre.
    var penalties = error || !valid ? NaN : uniform ? cents(amount * ps[0].rate * days / 365)
      : cents(ps.reduce(function (sum, p) { return sum + p.penalties; }, 0));
    var fee = input.fee && days > 0 ? rules.indemnite_forfaitaire_recouvrement : 0;
    return {
      days: days, periods: ps, uniform: uniform, rate: uniform ? ps[0].rate : null,
      penalties: penalties, fee: fee, total: cents(penalties + fee),
      error: error, missing: missing, below: below
    };
  }

  return { semester: semester, semesterLabel: semesterLabel, rates: rates, periods: periods, compute: compute };
});
