/*
 * Moteur : protection du travailleur autonome au Canada. Prestations spéciales de l'assurance-emploi (partie VII.1 de
 * la Loi sur l'assurance-emploi : adhésion volontaire ; maladie, grossesse, parentales, proches aidants) et, au Québec,
 * Régime québécois d'assurance parentale (RQAP, obligatoire : maternité, paternité, parentales). Chiffres lus dans
 * data/rules/ca.json (ei_self_employed_special_benefits, ei_max_insurable_earnings, ei_rate_self_employed,
 * ei_rate_self_employed_quebec, qpip_self_employed_benefits, qpip_max_insurable_earnings, qpip_rate_self_employed).
 * Spécification : documentation/56-protection-sociale-canada.md. Fonctions pures, testées par
 * tests/unit/benefits-ca.test.mjs.
 *
 * Conditions : « ok » (remplie), « check » (à vérifier) ou « no » (non remplie) ; le résultat vaut « no » dès qu'une
 * condition n'est pas remplie, « check » s'il reste une condition à vérifier, « yes » sinon.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).benefitsCA = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var EI_KINDS = ["sickness", "maternity", "parental", "parental_extended", "compassionate", "critically_ill_child", "critically_ill_adult"];
  var QPIP_KINDS = ["maternity", "paternity", "parental"];
  var REGISTRATION = { "12_months": "ok", less: "no", none: "no" };

  function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function round2(x) { return Math.round(Number((x * 100).toPrecision(12))) / 100; }
  /** Au dollar le plus proche, la moitié vers le haut (Loi sur l'assurance-emploi, par. 152.01(5)). */
  function dollar(x) { return Math.floor(Number(x.toPrecision(12)) + 0.5); }

  function outcome(conditions) {
    var st = conditions.map(function (c) { return c.status; });
    return st.indexOf("no") >= 0 ? "no" : st.indexOf("check") >= 0 ? "check" : "yes";
  }

  /** Montant saisi lisible et positif, sinon NaN. */
  function amount(x) { var n = Number(x); return isFinite(n) && n >= 0 ? n : NaN; }

  /**
   * Prestations spéciales de l'AE. o = { kind (EI_KINDS), registration: « 12_months » | « less » | « none »,
   * earnings: revenu net d'indépendant de l'année précédente, quebec: bool }. Au Québec, grossesse et parentales
   * relèvent du RQAP : { plan: "qpip" }. Renvoie { error } pour une saisie inconnue ou un revenu illisible.
   */
  function ei(rules, o) {
    var B = rules.ei_self_employed_special_benefits, mie = rules.ei_max_insurable_earnings;
    if (EI_KINDS.indexOf(o.kind) < 0) return { error: "kind" };
    if (o.quebec && /^(maternity|parental)/.test(o.kind)) return { plan: "qpip" };
    if (!own(REGISTRATION, o.registration)) return { error: "registration" };
    var earnings = amount(o.earnings);
    if (isNaN(earnings)) return { error: "earnings" };
    var rate = o.kind === "parental_extended" ? B.extended_parental_rate : B.rate;
    var insured = Math.min(earnings, mie), weekly = dollar(rate * insured / B.divisor), weeks = B.weeks[o.kind];
    var conditions = [
      { key: "registration", status: REGISTRATION[o.registration] },
      // Montant minimal : 6 000 $ indexé depuis 2012 (règlement, art. 11.1), jamais moins de 6 000 $ ; le montant de
      // l'année, publié par Service Canada, n'est pas lu : au-dessus de 6 000 $, à vérifier.
      { key: "earnings", status: earnings < B.minimum_earnings_base ? "no" : "check" },
      { key: "interruption", status: "check" },
    ];
    var premiumRate = o.quebec ? rules.ei_rate_self_employed_quebec : rules.ei_rate_self_employed;
    return {
      plan: "ei", conditions: conditions, outcome: outcome(conditions), rate: rate, weekly: weekly, weeks: weeks,
      total: weekly * weeks, waitingWeeks: B.waiting_weeks, capped: earnings > mie, maxWeekly: dollar(rate * mie / B.divisor),
      premium: round2(premiumRate * insured), premiumRate: premiumRate, minimum: B.minimum_earnings_base,
    };
  }

  /**
   * RQAP (Québec). o = { kind (QPIP_KINDS), option: « basic » | « special », earnings: revenu d'entreprise de l'année
   * précédente }. Revenu hebdomadaire moyen = revenu assurable ÷ 52, plafonné au maximum ÷ 52 (art. 21) ; tranches de
   * semaines et taux de l'art. 18. Renvoie { error } pour une saisie inconnue.
   */
  function qpip(rules, o) {
    var Q = rules.qpip_self_employed_benefits, max = rules.qpip_max_insurable_earnings;
    if (QPIP_KINDS.indexOf(o.kind) < 0) return { error: "kind" };
    if (!own(Q, o.option) || typeof Q[o.option] !== "object") return { error: "option" };
    var earnings = amount(o.earnings);
    if (isNaN(earnings)) return { error: "earnings" };
    var average = round2(Math.max(Math.min(earnings, max), Q.minimum_insurable_income) / Q.divisor);
    var plan = Q[o.option][o.kind], parts = Array.isArray(plan) ? plan : [plan];
    var phases = parts.map(function (p) { return { weeks: p.weeks, rate: p.rate, weekly: round2(p.rate * average) }; });
    var conditions = [
      { key: "insurable_income", status: earnings >= Q.minimum_insurable_income ? "ok" : "no" },
      { key: "residence", status: "check" },
      { key: "interruption", status: "check" },
    ];
    return {
      plan: "qpip", conditions: conditions, outcome: outcome(conditions), average: average, phases: phases,
      weeks: phases.reduce(function (s, p) { return s + p.weeks; }, 0),
      total: round2(phases.reduce(function (s, p) { return s + p.weeks * p.weekly; }, 0)),
      // Pas de cotisation sous 2 000 $ de revenu de travail (art. 54).
      capped: earnings > max, premium: earnings < Q.premium_exempt_below ? 0 : round2(rules.qpip_rate_self_employed * Math.min(earnings, max)),
      premiumRate: rules.qpip_rate_self_employed,
    };
  }

  return { EI_KINDS: EI_KINDS, QPIP_KINDS: QPIP_KINDS, ei: ei, qpip: qpip, outcome: outcome, dollar: dollar };
});
