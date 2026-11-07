// Tests du moteur de protection sociale au Royaume-Uni : New Style ESA, Maternity Allowance, New Style JSA
// (documentation/51-protection-sociale-royaume-uni.md). Valeurs attendues calculées à la main à partir des pages
// GOV.UK lues le 07/11/2026.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const B = require("../../src/assets/engines/benefits-uk.js");
const R = ruleValues("uk");
const status = (r) => Object.fromEntries(r.conditions.map((c) => [c.key, c.status]));

test("règles : montants publiés sur GOV.UK (2026/27)", () => {
  const E = R.uk_new_style_esa, M = R.uk_maternity_allowance;
  assert.deepEqual(E.assessment_rate, { under_25: 75.65, "25_and_over": 95.55 });
  assert.equal(E.assessment_weeks, 13);
  assert.equal(E.work_related_activity_group, 95.55);
  assert.equal(E.support_group, 145.9);
  assert.equal(M.standard_rate, 194.32);
  assert.equal(M.lowest_rate, 27);
  assert.equal(M.lowest_rate, 0.9 * M.employee_earnings_threshold, "£27 = 90 % du seuil de £30 (guide technique)");
  assert.equal(M.max_weeks, 39);
  assert.equal(M.test_period_weeks, 66);
  assert.equal(M.registered_weeks, 26);
  assert.equal(M.class2_weeks_for_max, 13);
  assert.equal(R.class2_voluntary_weekly_rate, 3.65, "taux cité sur la page de la Maternity Allowance");
  assert.equal(R.uk_statutory_sick_pay.weekly_max, 123.25);
  assert.equal(R.uk_new_style_jsa.max_days, 182);
});

test("ESA : taux d'évaluation selon l'âge, 13 semaines, puis groupes", () => {
  const base = { ni: "yes", underPensionAge: true };
  let r = B.esa(R, { ...base, age: "25_and_over" });
  assert.equal(r.outcome, "yes");
  assert.equal(r.weekly, 95.55);
  assert.equal(r.assessmentTotal, 1242.15, "13 × 95,55");
  assert.equal(r.wrag, 95.55);
  assert.equal(r.support, 145.9);
  r = B.esa(R, { ...base, age: "under_25" });
  assert.equal(r.weekly, 75.65);
  assert.equal(r.assessmentTotal, 983.45, "13 × 75,65");
});

test("ESA : chaque condition seule", () => {
  const base = { age: "25_and_over", ni: "yes", underPensionAge: true };
  assert.deepEqual(status(B.esa(R, base)), { health: "ok", pension_age: "ok", contributions: "ok" });
  let r = B.esa(R, { ...base, ni: "unsure" });
  assert.equal(r.outcome, "check");
  assert.equal(status(r).contributions, "check");
  r = B.esa(R, { ...base, ni: "no" });
  assert.equal(r.outcome, "no");
  r = B.esa(R, { ...base, underPensionAge: false });
  assert.equal(r.outcome, "no");
  assert.equal(status(r).pension_age, "no");
  r = B.esa(R, { ...base, underPensionAge: false, ni: "unsure" });
  assert.equal(r.outcome, "no", "une condition non remplie l'emporte sur une condition à vérifier");
});

test("ESA : saisies inconnues refusées", () => {
  assert.deepEqual(B.esa(R, { age: "40", ni: "yes", underPensionAge: true }), { error: "age" });
  assert.deepEqual(B.esa(R, { age: "toString", ni: "yes", underPensionAge: true }), { error: "age" });
  assert.deepEqual(B.esa(R, { age: "under_25", ni: "maybe", underPensionAge: true }), { error: "ni" });
  assert.deepEqual(B.esa(R, { age: "under_25", ni: "hasOwnProperty", underPensionAge: true }), { error: "ni" });
});

test("Maternity Allowance : 13 semaines de classe 2 → taux standard pendant 39 semaines", () => {
  const r = B.maternity(R, { registered26: true, class2: "13", smp: false });
  assert.equal(r.outcome, "yes");
  assert.equal(r.weeks, 39);
  assert.equal(r.weeklyMin, 194.32);
  assert.equal(r.weeklyMax, 194.32);
  assert.equal(r.totalMax, 7578.48, "39 × 194,32");
  assert.equal(r.totalMin, 7578.48);
  assert.equal(r.topUpWeeks, 0);
  assert.equal(r.topUpCost, 0);
});

test("Maternity Allowance : sans classe 2 → £27 par semaine, complément de 13 semaines au plus", () => {
  const r = B.maternity(R, { registered26: true, class2: "none", smp: false });
  assert.equal(r.outcome, "check");
  assert.equal(r.weeklyMin, 27);
  assert.equal(r.weeklyMax, 27);
  assert.equal(r.totalMin, 1053, "39 × 27");
  assert.equal(r.topUpWeeks, 13);
  assert.equal(r.topUpCost, 47.45, "13 × 3,65");
  assert.equal(r.bestWeekly, 194.32);
  assert.equal(r.bestTotal, 7578.48);
});

test("Maternity Allowance : 1 à 12 semaines ou inconnu → fourchette £27 à £194.32", () => {
  let r = B.maternity(R, { registered26: true, class2: "some", smp: false });
  assert.equal(r.outcome, "check");
  assert.equal(r.weeklyMin, 27);
  assert.equal(r.weeklyMax, 194.32);
  assert.equal(r.totalMin, 1053);
  assert.equal(r.totalMax, 7578.48);
  assert.equal(r.topUpWeeks, 12, "au moins une semaine déjà payée");
  assert.equal(r.topUpCost, 43.8, "12 × 3,65");
  r = B.maternity(R, { registered26: true, class2: "unsure", smp: false });
  assert.equal(r.outcome, "check");
  assert.equal(r.weeklyMin, 27);
  assert.equal(r.weeklyMax, 194.32);
  assert.equal(r.topUpWeeks, 13);
});

test("Maternity Allowance : pas de MA avec la SMP ou moins de 26 semaines d'inscription", () => {
  let r = B.maternity(R, { registered26: true, class2: "13", smp: true });
  assert.equal(r.outcome, "no");
  assert.equal(status(r).no_smp, "no");
  r = B.maternity(R, { registered26: false, class2: "13", smp: false });
  assert.equal(r.outcome, "no");
  assert.equal(status(r).registered, "no");
  assert.deepEqual(B.maternity(R, { registered26: true, class2: "12", smp: false }), { error: "class2" });
  assert.deepEqual(B.maternity(R, { registered26: true, class2: "constructor", smp: false }), { error: "class2" });
});

test("JSA : fermé à l'indépendant qui n'a payé que la classe 2, à vérifier avec la classe 1", () => {
  let r = B.jsa(R, { class1: false });
  assert.equal(r.outcome, "no");
  r = B.jsa(R, { class1: true });
  assert.equal(r.outcome, "check");
  assert.equal(r.maxDays, 182);
  assert.equal(r.taxYears, 2);
});

test("page : chiffres cités égaux aux règles", () => {
  const html = readFileSync(new URL("../../content/uk/self-employed-sick-pay.html", import.meta.url), "utf8");
  const gbp = (n) => "£" + n.toLocaleString("en-GB", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const E = R.uk_new_style_esa, M = R.uk_maternity_allowance;
  for (const n of [E.assessment_rate.under_25, E.assessment_rate["25_and_over"], E.support_group, M.standard_rate,
    M.lowest_rate, R.class2_voluntary_weekly_rate, R.uk_statutory_sick_pay.weekly_max, R.class2_small_profits_threshold, R.class2_small_profits_threshold_2025_26]) {
    assert.ok(html.includes(gbp(n)), `${gbp(n)} cité dans la page`);
  }
  const best = B.maternity(R, { registered26: true, class2: "none", smp: false });
  assert.ok(html.includes(gbp(best.bestTotal)), "total de 39 semaines au taux standard");
  assert.ok(html.includes(gbp(best.totalMin)), "total de 39 semaines à £27");
  assert.ok(html.includes(gbp(best.topUpCost)), "coût du complément de 13 semaines");
  assert.ok(html.includes(`${M.max_weeks} weeks`) && html.includes(`${M.test_period_weeks} weeks`));
});
