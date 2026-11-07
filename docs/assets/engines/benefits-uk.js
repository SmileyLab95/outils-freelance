/*
 * Moteur : protection sociale de l'indépendant au Royaume-Uni. Maladie (New Style ESA ; pas de Statutory Sick Pay pour
 * l'activité indépendante), maternité (Maternity Allowance) et fin d'activité (pas de New Style JSA avec la seule
 * classe 2). Chiffres lus dans data/rules/uk.json (uk_new_style_esa, uk_maternity_allowance, uk_new_style_jsa,
 * uk_statutory_sick_pay, class2_voluntary_weekly_rate). Spécification : documentation/51-protection-sociale-royaume-uni.md.
 * Fonctions pures, testées par tests/unit/benefits-uk.test.mjs.
 *
 * Chaque condition a un statut : « ok » (remplie), « check » (à vérifier : l'utilisateur ne sait pas, ou la règle
 * dépend d'un point que les pages officielles ne tranchent pas) ou « no » (non remplie). Le résultat vaut « no » dès
 * qu'une condition n'est pas remplie, « check » s'il reste une condition à vérifier, « yes » sinon.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).benefitsUK = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function round2(x) { return Math.round(Number((x * 100).toPrecision(12))) / 100; }

  function outcome(conditions) {
    var st = conditions.map(function (c) { return c.status; });
    return st.indexOf("no") >= 0 ? "no" : st.indexOf("check") >= 0 ? "check" : "yes";
  }

  /**
   * Maladie : New Style ESA. o = { age: "under_25" | "25_and_over", ni: "yes" | "unsure" | "no",
   * underPensionAge: bool }. Renvoie { error } pour une saisie inconnue, sinon les conditions, le résultat, le taux
   * d'évaluation (par semaine et sur les semaines d'évaluation) et les montants après l'évaluation.
   */
  function esa(rules, o) {
    var E = rules.uk_new_style_esa;
    if (!own(E.assessment_rate, o.age)) return { error: "age" };
    var weekly = E.assessment_rate[o.age];
    var NI = { yes: "ok", unsure: "check", no: "no" };
    if (!own(NI, o.ni)) return { error: "ni" };
    var conditions = [
      { key: "health", status: "ok" },
      { key: "pension_age", status: o.underPensionAge ? "ok" : "no" },
      { key: "contributions", status: NI[o.ni] }
    ];
    return {
      conditions: conditions,
      outcome: outcome(conditions),
      weekly: weekly,
      assessmentWeeks: E.assessment_weeks,
      assessmentTotal: round2(weekly * E.assessment_weeks),
      wrag: E.work_related_activity_group,
      support: E.support_group
    };
  }

  // Semaines de classe 2 payées sur les 66 semaines : 13 ou plus, 1 à 12, aucune, inconnu.
  var CLASS2 = { "13": true, some: true, none: true, unsure: true };

  /**
   * Maternité : Maternity Allowance d'un indépendant. o = { registered26: bool (inscrit au moins 26 semaines sur les
   * 66), class2: "13" | "some" | "none" | "unsure", smp: bool (Statutory Maternity Pay possible d'un employeur) }.
   * Montant : taux standard avec 13 semaines de classe 2, taux minimal sans classe 2, fourchette sinon (la formule
   * entre les deux n'est pas publiée) ; complément : semaines à payer au plus pour atteindre 13, au taux volontaire.
   */
  function maternity(rules, o) {
    var M = rules.uk_maternity_allowance;
    if (!own(CLASS2, o.class2)) return { error: "class2" };
    var full = o.class2 === "13", none = o.class2 === "none";
    var conditions = [
      { key: "no_smp", status: o.smp ? "no" : "ok" },
      { key: "registered", status: o.registered26 ? "ok" : "no" },
      { key: "class2", status: full ? "ok" : "check" }
    ];
    var weeklyMin = full ? M.standard_rate : M.lowest_rate;
    var weeklyMax = none ? M.lowest_rate : M.standard_rate;
    var topUpWeeks = full ? 0 : o.class2 === "some" ? M.class2_weeks_for_max - 1 : M.class2_weeks_for_max;
    return {
      conditions: conditions,
      outcome: outcome(conditions),
      weeks: M.max_weeks,
      weeklyMin: weeklyMin,
      weeklyMax: weeklyMax,
      totalMin: round2(weeklyMin * M.max_weeks),
      totalMax: round2(weeklyMax * M.max_weeks),
      bestWeekly: M.standard_rate,
      bestTotal: round2(M.standard_rate * M.max_weeks),
      topUpWeeks: topUpWeeks,
      topUpCost: round2(topUpWeeks * rules.class2_voluntary_weekly_rate)
    };
  }

  /**
   * Fin d'activité : New Style JSA. o = { class1: bool (salarié ayant payé la classe 1 sur les années fiscales
   * demandées) }. L'indépendant qui n'a payé que la classe 2 n'y a pas droit ; avec un emploi salarié, à vérifier.
   */
  function jsa(rules, o) {
    var J = rules.uk_new_style_jsa;
    var conditions = [{ key: "class1", status: o.class1 ? "check" : "no" }];
    return { conditions: conditions, outcome: outcome(conditions), maxDays: J.max_days, taxYears: J.class1_tax_years };
  }

  return { esa: esa, maternity: maternity, jsa: jsa, outcome: outcome };
});
