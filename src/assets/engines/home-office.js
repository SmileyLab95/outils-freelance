/*
 * Moteur : bureau à domicile (documentation/27-bureau-a-domicile.md). Une fonction pure par pays, qui applique les
 * méthodes officielles : États-Unis (méthode simplifiée de l'IRS ou part réelle de la surface), Royaume-Uni (forfait
 * mensuel ou part des coûts réels selon les pièces et le temps), Canada (part de la surface et du temps, plafonnée
 * au revenu net, avec report), France (micro : aucune déduction ; réel : prorata de surface). Règles dans
 * data/rules/<pays>.json (home_office_simplified_method, us_home_office_regular_method, use_of_home_flat_rates,
 * uk_use_of_home_actual_costs, ca_business_use_of_home, micro_charges_reelles, reel_local_mixte_prorata).
 * Testé par tests/unit/home-office.test.mjs ; les textes sont dans les pages.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).homeOffice = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var cents = function (x) { return Math.round(x * 100) / 100; };
  var amount = function (x) { x = Number(x); return isFinite(x) && x > 0 ? x : 0; };
  /** Part d'un tout (surface, pièces), entre 0 et 1 : une partie plus grande que le tout compte pour le tout. */
  function share(part, total) {
    part = amount(part); total = amount(total);
    return total > 0 ? Math.min(1, part / total) : 0;
  }
  // En cas d'égalité, la méthode la plus simple est proposée.
  function best(simple, other, simpleKey, otherKey) {
    if (simple <= 0 && other <= 0) return "none";
    return other > simple ? otherKey : simpleKey;
  }

  /**
   * États-Unis. input : { officeArea, homeArea (pieds carrés), expenses (dépenses annuelles du logement), profit
   * (bénéfice avant la déduction, facultatif : null ou vide pour ne pas plafonner) }.
   * Renvoie { simplifiedArea, simplified, percentage, regular, limit, simplifiedAllowed, regularAllowed, carryover,
   * best : "simplified" | "regular" | "none" }.
   */
  function us(input, rules) {
    var S = rules.home_office_simplified_method;
    var simplifiedArea = Math.min(amount(input.officeArea), S.max_sqft);
    var simplified = cents(simplifiedArea * S.rate_per_sqft);
    var percentage = share(input.officeArea, input.homeArea);
    var regular = cents(percentage * amount(input.expenses));
    var given = input.profit !== null && input.profit !== undefined && input.profit !== "" && isFinite(Number(input.profit));
    var limit = given ? Math.max(0, Number(input.profit)) : null;
    var simplifiedAllowed = limit === null ? simplified : Math.min(simplified, limit);
    var regularAllowed = limit === null ? regular : Math.min(regular, limit);
    return { simplifiedArea: simplifiedArea, simplified: simplified, percentage: percentage, regular: regular, limit: limit,
             simplifiedAllowed: cents(simplifiedAllowed), regularAllowed: cents(regularAllowed),
             carryover: rules.us_home_office_regular_method.carryover ? cents(regular - regularAllowed) : 0,
             best: best(simplifiedAllowed, regularAllowed, "simplified", "regular") };
  }

  /** Royaume-Uni : forfait d'un mois selon les heures travaillées à domicile (heures entières). */
  function ukMonthlyRate(hours, rules) {
    hours = Math.floor(amount(hours));
    var rate = 0;
    rules.use_of_home_flat_rates.forEach(function (band) {
      if (hours >= band.hours_per_month_from) rate = band.monthly_amount;
    });
    return rate;
  }

  /**
   * Royaume-Uni. input : { hours (heures par mois, nombre ou liste d'un nombre par mois), months (nombre de mois si
   * hours est un nombre), costs (frais annuels du logement), rooms, businessRooms, daysPerWeek }.
   * Renvoie { flatRate, flatMonths, actual, best : "flat" | "actual" | "none" }.
   */
  function uk(input, rules) {
    var list = Array.isArray(input.hours) ? input.hours : [];
    if (!Array.isArray(input.hours)) {
      var months = Math.min(12, Math.floor(amount(input.months)));
      for (var i = 0; i < months; i++) list.push(input.hours);
    }
    var flatRate = 0, flatMonths = 0;
    list.forEach(function (h) { var r = ukMonthlyRate(h, rules); flatRate += r; if (r > 0) flatMonths++; });
    var days = Math.min(7, amount(input.daysPerWeek));
    var actual = cents(amount(input.costs) * share(input.businessRooms, input.rooms) * days / 7);
    return { flatRate: flatRate, flatMonths: flatMonths, actual: actual, best: best(flatRate, actual, "flat", "actual") };
  }

  /**
   * Canada. input : { eligible (lieu principal d'affaires, ou usage exclusif et clients reçus), workspaceArea,
   * homeArea, businessTime (part du temps en %, 100 si l'espace ne sert qu'à l'entreprise), expenses, netIncome
   * (revenu net de l'entreprise avant ces dépenses), carryIn (report de l'année précédente) }.
   * Renvoie { share, current, available, limit, deductible, carryForward }.
   */
  function ca(input, rules) {
    var C = rules.ca_business_use_of_home;
    var time = Math.min(1, amount(input.businessTime) / 100);
    var part = share(input.workspaceArea, input.homeArea) * time;
    var current = cents(part * amount(input.expenses));
    var available = cents(current + amount(input.carryIn));
    var limit = Math.max(0, Number(input.netIncome) || 0);
    if (!input.eligible) return { share: part, current: current, available: available, limit: limit, deductible: 0, carryForward: 0 };
    var deductible = C.limited_to_net_income_before_these_expenses ? Math.min(available, limit) : available;
    return { share: part, current: current, available: available, limit: limit, deductible: cents(deductible),
             carryForward: C.carry_forward ? cents(available - deductible) : 0 };
  }

  /**
   * France. input : { regime : "micro" | "reel", proArea, totalArea, expenses (loyer et dépenses annuels du logement) }.
   * Renvoie { share, deductible, reason : "abattement" | "prorata" }.
   */
  function fr(input, rules) {
    if (input.regime === "micro") {
      if (rules.micro_charges_reelles.charges_reelles_deductibles) throw new Error("Règle micro_charges_reelles inattendue");
      return { share: 0, deductible: 0, reason: "abattement" };
    }
    if (input.regime !== "reel") throw new Error("Régime inconnu : " + input.regime);
    var part = share(input.proArea, input.totalArea);
    return { share: part, deductible: cents(part * amount(input.expenses)), reason: "prorata" };
  }

  return { share: share, ukMonthlyRate: ukMonthlyRate, us: us, uk: uk, ca: ca, fr: fr };
});
