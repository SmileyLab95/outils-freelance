/*
 * Moteur : date d'échéance d'une facture (documentation/44-date-echeance-international.md). Conditions de paiement
 * (à réception, N jours, N jours fin de mois, fin de mois + N jours) ; France : délais maximaux de l'article L441-10 ;
 * Royaume-Uni : « relevant day » du Late Payment Act 1998, s. 4 ; États-Unis : échéance par défaut des lois
 * Freelance Isn't Free. Dates ISO (AAAA-MM-JJ) calculées en UTC ; fonctions pures, sans DOM.
 * Testé par tests/unit/echeance.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).dueDate = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DAY = 86400000;

  /** Date ISO → numéro du jour (UTC), NaN si illisible ou inexistante (31 février). */
  function day(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || "");
    if (!m) return NaN;
    var n = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY;
    return iso(n) === m[0] ? n : NaN;
  }
  function iso(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
  function addDays(date, n) { var d = day(date); return isNaN(d) ? "" : iso(d + n); }
  /** Dernier jour du mois d'une date ISO. */
  function endOfMonth(date) {
    var d = day(date);
    if (isNaN(d)) return "";
    var t = new Date(d * DAY);
    return iso(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0) / DAY);
  }
  /** Nombre de jours de a à b (b − a), NaN si une date est illisible. */
  function between(a, b) { return day(b) - day(a); }
  function later(a, b) { return !a ? b : !b ? a : a > b ? a : b; }

  /**
   * Conditions de paiement : « 0 » ou « receipt » (à réception), « 30 » (N jours), « 45fdm » ou « 45eom » (N jours
   * puis fin de mois), « fdm45 » ou « eom45 » (fin de mois puis N jours) → { kind, n } ; null si inconnues
   * (« none » : pas de date convenue).
   */
  function parseTerms(terms) {
    var t = String(terms == null ? "" : terms), m;
    if (t === "receipt" || t === "0") return { kind: "days", n: 0 };
    if ((m = /^(\d{1,3})$/.exec(t))) return { kind: "days", n: Number(m[1]) };
    if ((m = /^(\d{1,3})(?:fdm|eom)$/.exec(t))) return { kind: "then_eom", n: Number(m[1]) };
    if ((m = /^(?:fdm|eom)(\d{1,3})$/.exec(t))) return { kind: "eom_then", n: Number(m[1]) };
    return null;
  }

  /** Date d'échéance convenue à partir de la date de la facture ; "" si la date ou les conditions sont illisibles. */
  function due(date, terms) {
    var t = parseTerms(terms);
    if (!t || isNaN(day(date))) return "";
    if (t.kind === "then_eom") return endOfMonth(addDays(date, t.n));
    if (t.kind === "eom_then") return addDays(endOfMonth(date), t.n);
    return addDays(date, t.n);
  }

  /**
   * France (art. L441-10, règle retard_paiement_delais) : maximums entre professionnels à partir de la date de la
   * facture : { max60, max45, max45b, latest } (45 jours fin de mois selon les deux méthodes ; latest : le plus tardif).
   */
  function frLimits(date, rules) {
    var D = rules.retard_paiement_delais;
    if (isNaN(day(date))) return null;
    var max60 = addDays(date, D.delai_max_date_facture_jours);
    var max45 = endOfMonth(addDays(date, D.delai_max_fin_de_mois_jours));
    var max45b = addDays(endOfMonth(date), D.delai_max_fin_de_mois_jours);
    return { max60: max60, max45: max45, max45b: max45b, latest: [max60, max45, max45b].sort().pop() };
  }

  /**
   * Royaume-Uni (Late Payment of Commercial Debts (Interest) Act 1998, s. 4 ; règle late_payment_default_due_period) :
   * opts { agreed (date convenue ou ""), performed (prestation), notice (facture reçue), publicAuthority }.
   * Les périodes de 30 et de 60 jours commencent le plus tardif des deux jours (performed, notice), ce jour compris.
   * → { due (relevant day), lateFrom (lendemain : l'intérêt court), start, end30, end60, cap } ; cap : "default"
   * (pas de date convenue), "30" (autorité publique, date convenue plus tardive), "60" (date convenue au-delà de 60 jours :
   * la fin de la période l'emporte, sauf si la date convenue n'est pas manifestement abusive, s. 4(2F)), sinon "".
   * null si aucune date de départ n'est lisible.
   */
  function ukRelevantDay(opts, rules) {
    var R = rules.late_payment_default_due_period;
    var start = later(isNaN(day(opts.performed)) ? "" : opts.performed, isNaN(day(opts.notice)) ? "" : opts.notice);
    if (!start) return null;
    var end30 = addDays(start, R.default_period_days - 1), end60 = addDays(start, R.business_max_days - 1);
    var agreed = isNaN(day(opts.agreed)) ? "" : opts.agreed;
    var result = { start: start, end30: end30, end60: end60, due: agreed, cap: "" };
    if (!agreed) { result.due = end30; result.cap = "default"; }
    else if (opts.publicAuthority && agreed > addDays(start, R.public_authority_max_days - 1)) {
      result.due = addDays(start, R.public_authority_max_days - 1); result.cap = "30";
    } else if (agreed > end60) { result.due = end60; result.cap = "60"; }   // autorité publique : déjà plafonnée à 30 jours
    result.lateFrom = addDays(result.due, 1);
    return result;
  }

  /**
   * États-Unis (lois Freelance Isn't Free, règle freelance_default_payment) : sans date dans le contrat, échéance au
   * plus tard N jours après la fin du travail, dans les lieux de la règle ; "" ailleurs ou si la date est illisible.
   */
  function usDefault(completed, place, rules) {
    var R = rules.freelance_default_payment;
    return R.places.indexOf(place) >= 0 ? addDays(completed, R.days_after_completion) : "";
  }

  return { day: day, iso: iso, addDays: addDays, endOfMonth: endOfMonth, between: between, parseTerms: parseTerms,
    due: due, frLimits: frLimits, ukRelevantDay: ukRelevantDay, usDefault: usDefault };
});
