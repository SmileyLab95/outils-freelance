/*
 * Moteur : salarié ou freelance ? Revenu disponible d'un salarié (salaire brut moins cotisations salariales et impôt
 * sur le revenu) et chiffre d'affaires dont un freelance a besoin pour garder le même revenu disponible, avec le tarif
 * équivalent. Spécification : documentation/19-freelance-ou-salarie.md. Fonctions pures, testées par
 * tests/unit/employee-freelance.test.mjs ; règles de data/rules/<pays>.json (window.OF_RULES dans le navigateur).
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.brackets : require("./brackets.js"),
                    root.OFE ? root.OFE.microFR : require("./micro-fr.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).employeeFreelance = api;
})(typeof self !== "undefined" ? self : this, function (B, M) {
  "use strict";

  var cents = B.cents;

  /**
   * Plus petit chiffre d'affaires, au centime, dont le revenu disponible (arrondi au centime) atteint la cible.
   * available doit être croissante. Renvoie null si aucun chiffre d'affaires raisonnable n'y suffit.
   */
  function revenueFor(target, available) {
    var goal = cents(target);
    var f = function (c) { return cents(available(c / 100)); };
    if (f(0) >= goal) return 0;
    var hi = Math.max(100000, Math.round(goal * 200));
    for (var i = 0; i < 40 && f(hi) < goal; i++) hi *= 2;
    if (f(hi) < goal) return null;
    var lo = 0;
    while (hi - lo > 1) {
      var mid = Math.floor((lo + hi) / 2);
      if (f(mid) >= goal) hi = mid; else lo = mid;
    }
    return hi / 100;
  }

  // ----- France ------------------------------------------------------------------------------------------------

  /** Impôt sur le revenu d'une personne seule (une part), décote comprise, sans réductions ni crédits d'impôt. */
  function incomeTaxFR(taxable, rules) {
    var raw = B.progressive(Math.max(0, taxable), rules.ir_bareme_revenus_2025).tax;
    var D = rules.ir_decote;
    var decote = raw < D.seuil_impot_celibataire ? Math.min(raw, Math.max(0, D.forfait_celibataire - D.coefficient * raw)) : 0;
    return { raw: raw, decote: decote, tax: raw - decote };
  }

  /**
   * Salarié du secteur privé (régime général, hors Alsace-Moselle) : cotisations salariales, salaire net, net
   * imposable, déduction forfaitaire de 10 %, impôt sur le revenu et revenu disponible.
   * input : { gross (salaire brut annuel) }.
   */
  function employeeFR(input, rules) {
    var gross = Math.max(0, input.gross || 0);
    var S = rules.salarie_cotisations_2026, A = rules.agirc_arrco_2026, P = rules.pass_2026;
    var t1 = Math.min(gross, P), t2 = Math.min(Math.max(0, gross - P), (A.t2_limite_pass - 1) * P);
    var pension = t1 * S.vieillesse_plafonnee + gross * S.vieillesse_deplafonnee;
    var complementary = t1 * (A.t1 + A.t1_ceg) + t2 * (A.t2 + A.t2_ceg) + (gross > P ? (t1 + t2) * A.cet : 0);
    var other = gross * S.maladie + Math.min(gross, 4 * P) * S.chomage;
    // CSG et CRDS : 98,25 % du brut jusqu'à 4 PASS, la totalité au-delà.
    var limit = S.csg_abattement_limite_pass * P;
    var base = Math.min(gross, limit) * S.csg_assiette_abattue + Math.max(0, gross - limit);
    var csg = base * S.csg, csgDeductible = base * S.csg_deductible, crds = base * S.crds;
    var contributions = pension + complementary + other + csg + crds;
    var net = gross - contributions;
    var netTaxable = net + (csg - csgDeductible) + crds;
    var D = rules.ir_deduction_frais_salaires;
    var deduction = Math.min(D.maximum, Math.max(netTaxable * D.taux, Math.min(D.minimum, netTaxable)));
    var taxable = Math.max(0, netTaxable - deduction);
    var it = incomeTaxFR(taxable, rules);
    return {
      gross: gross, pension: pension, complementary: complementary, csg: csg, csgDeductible: csgDeductible, crds: crds,
      contributions: contributions, net: net, netTaxable: netTaxable, deduction: deduction, taxable: taxable,
      incomeTaxRaw: it.raw, decote: it.decote, incomeTax: it.tax, available: net - it.tax
    };
  }

  /**
   * Micro-entrepreneur : cotisations et CFP sur le chiffre d'affaires, impôt sur le chiffre d'affaires après
   * abattement (au moins le minimum légal) ou versement libératoire ; frais réels non déductibles.
   * input : { revenue, activity (vente, services_bic, artisan, liberal_bnc, cipav), vl, expenses }.
   */
  function freelanceFR(input, rules) {
    var a = M.activity(rules, input.activity || "liberal_bnc");
    var revenue = Math.max(0, input.revenue || 0), expenses = Math.max(0, input.expenses || 0);
    var contributions = revenue * (a.cotisations + a.cfp);
    var taxable = Math.max(0, revenue - Math.max(revenue * a.abattement, Math.min(revenue, rules.micro_abattement_minimum)));
    var it = input.vl ? { raw: revenue * a.vl, decote: 0, tax: revenue * a.vl } : incomeTaxFR(taxable, rules);
    return {
      revenue: revenue, expenses: expenses, contributions: contributions, taxable: input.vl ? null : taxable,
      incomeTaxRaw: it.raw, decote: it.decote, incomeTax: it.tax,
      available: revenue - expenses - contributions - it.tax, ceiling: a.plafond, overCeiling: revenue > a.plafond,
      vatThreshold: a.tva, vatThresholdMajor: a.tvaMajore
    };
  }

  var COUNTRIES = { fr: { employee: employeeFR, freelance: freelanceFR } };

  /**
   * Comparaison. input : { gross, benefits (avantages payés par l'employeur, par an), expenses, units (jours ou
   * heures facturés par an), rate (tarif du freelance, facultatif), et les champs propres au pays }.
   * Renvoie { employee, benefits, target, revenue, freelance, rate, atRate } ou { error: "no_salary" }.
   */
  function compare(country, input, rules) {
    var C = COUNTRIES[country];
    if (!C) throw new Error("Pays inconnu : " + country);
    if (!(input.gross > 0)) return { error: "no_salary" };
    var employee = C.employee(input, rules);
    var benefits = Math.max(0, input.benefits || 0);
    var target = employee.available + benefits;
    var free = function (revenue) { return C.freelance(Object.assign({}, input, { revenue: revenue }), rules); };
    var revenue = revenueFor(target, function (r) { return free(r).available; });
    var units = input.units > 0 ? input.units : null;
    return {
      employee: employee, benefits: benefits, target: target, revenue: revenue,
      freelance: revenue === null ? null : free(revenue),
      rate: revenue === null || !units ? null : revenue / units,
      // Tarif saisi : chiffre d'affaires et revenu disponible obtenus, écart avec la cible.
      atRate: input.rate > 0 && units ? free(input.rate * units) : null
    };
  }

  return { revenueFor: revenueFor, incomeTaxFR: incomeTaxFR, employeeFR: employeeFR, freelanceFR: freelanceFR, compare: compare };
});
