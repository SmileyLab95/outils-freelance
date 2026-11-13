// Tests du moteur de protection de l'indépendant aux États-Unis : programmes des États ouverts par adhésion
// volontaire et primes publiées (documentation/52-protection-sociale-etats-unis.md). Valeurs attendues calculées à la
// main à partir des pages lues le 09/11/2026.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const B = require("../../src/assets/engines/benefits-us.js");
const R = ruleValues("us");

test("règles : chiffres lus aux sources officielles", () => {
  const C = R.us_paid_leave_ca_diec, O = R.us_paid_leave_or_self_employed;
  assert.equal(C.premium_rate_2026, 0.0884);
  assert.equal(C.minimum_annual_premium_2026, 406.64);
  assert.equal(C.minimum_premium_net_profit, 4600);
  assert.equal(Math.round(C.minimum_premium_net_profit * C.premium_rate_2026 * 100) / 100, C.minimum_annual_premium_2026,
    "le minimum de l'EDD vaut 8,84 % de 4 600 $");
  assert.equal(C.di_max_weeks, 39);
  assert.equal(C.pfl_max_weeks, 8);
  assert.equal(C.months_before_claim, 6);
  assert.equal(O.contribution_rate_2025_2026, 0.006);
  assert.equal(O.income_cap, 184500);
  assert.equal(O.min_oregon_net_income, 1000);
  assert.equal(O.commitment_years, 3);
  assert.equal(R.us_paid_leave_wa_elective.initial_period_years, 3);
  assert.equal(R.us_paid_leave_wa_elective.hours_required, 820);
  const WA = R.us_paid_leave_wa_elective;
  assert.deepEqual([WA.premium_rate_2026, WA.employee_share_2026, WA.premium_rate_2027, WA.employee_share_2027], [0.0113, 0.7143, 0.012, 0.707]);
  assert.equal(R.us_paid_leave_mn_self_employed.min_weeks, 104);
  assert.equal(R.us_paid_leave_mn_self_employed.min_net_earnings_share_of_state_average_wage, 0.053);
  assert.equal(R.us_paid_leave_mn_self_employed.rate_adjusted_each_year_by, "July 31");
  assert.equal(R.us_paid_leave_ny_self_employed.pfl_alone_allowed, false);
  assert.deepEqual(R.us_paid_leave_ma_self_employed, { initial_period_years: 3, quarters_of_contributions: 2, quarters_lookback: 4 });
  assert.equal(R.us_paid_leave_me_self_employed.initial_period_years, 3);
  assert.equal(R.us_paid_leave_de_self_employed.contribution_share, 1);
  assert.equal(R.us_paid_leave_de_self_employed.quarterly_divisor, 4);
  assert.equal(R.us_paid_leave_de_self_employed.program_rate_through_2026, 0.008);
  assert.equal(R.us_paid_leave_nj_self_employed.independent_contractors_covered, false);
  assert.equal(R.us_paid_leave_me_self_employed.premium_rate_2025_2027, 0.005);
  assert.equal(R.us_ssdi_basics.waiting_period_months, 5);
  assert.equal(R.us_ssdi_basics.insured_quarters_of_coverage, 20);
  assert.equal(R.us_ssdi_basics.insured_period_quarters, 40);
});

test("programmes : les dix États lus, aucun autre", () => {
  assert.deepEqual(Object.keys(B.STATES).sort(), ["CA", "CO", "DE", "MA", "ME", "MN", "NJ", "NY", "OR", "WA"]);
  for (const s of Object.keys(B.STATES)) assert.ok(B.program(R, s), s);
  assert.equal(B.program(R, "TX"), null);
  assert.equal(B.program(R, "toString"), null, "pas de propriété héritée");
});

test("Californie : 8,84 % du bénéfice net, minimum de 406,64 $", () => {
  assert.deepEqual(B.premium(R, "CA", 50000), { annual: 4420, quarterly: 1105, eligible: true });
  assert.deepEqual(B.premium(R, "CA", 4600), { annual: 406.64, quarterly: 101.66, eligible: true });
  assert.deepEqual(B.premium(R, "CA", 0), { annual: 406.64, quarterly: 101.66, eligible: true });
  assert.deepEqual(B.premium(R, "CA", 4601), { annual: 406.73, quarterly: 101.68, eligible: true }, "4 601 × 8,84 % = 406,7284");
  assert.deepEqual(B.premium(R, "CA", 250000), { annual: 22100, quarterly: 5525, eligible: true }, "pas de plafond publié");
});

test("Oregon : 0,6 % du revenu net, plafond de 184 500 $, 1 000 $ au moins", () => {
  assert.deepEqual(B.premium(R, "OR", 10000), { annual: 60, quarterly: 15, eligible: true }, "exemple de la page officielle");
  assert.deepEqual(B.premium(R, "OR", 1000), { annual: 6, quarterly: 1.5, eligible: true });
  assert.deepEqual(B.premium(R, "OR", 999), { annual: 0, quarterly: 0, eligible: false });
  assert.deepEqual(B.premium(R, "OR", 200000), { annual: 1107, quarterly: 276.75, eligible: true }, "184 500 × 0,6 %");
  assert.deepEqual(B.premium(R, "OR", 184500), { annual: 1107, quarterly: 276.75, eligible: true });
});

test("Minnesota : 0,88 % de la base de prime en 2026, plafonnée au plafond de la Social Security", () => {
  assert.equal(R.us_paid_leave_mn_self_employed.premium_rate_2026, 0.0088);
  assert.deepEqual(B.premium(R, "MN", 50000), { annual: 440, quarterly: 110, eligible: true }, "50 000 × 0,88 %");
  assert.deepEqual(B.premium(R, "MN", 200000), { annual: 1623.6, quarterly: 405.9, eligible: true }, "184 500 × 0,88 %");
  assert.deepEqual(B.premium(R, "MN", 184500), { annual: 1623.6, quarterly: 405.9, eligible: true });
  assert.deepEqual(B.premium(R, "MN", 0), { annual: 0, quarterly: 0, eligible: true });
  assert.deepEqual(B.premium(R, "MN", -1), { error: "profit" });
});

test("Colorado : 0,44 % du revenu brut d'indépendant en 2026, 0,43 % en 2027, plafonnés au plafond de la Social Security", () => {
  const CO = R.us_paid_leave_co_self_employed;
  assert.deepEqual([CO.self_employed_premium_rate_2026, CO.min_years, CO.quarters_paid_before_benefits], [0.0044, 3, 1]);
  assert.deepEqual([CO.premium_rate_2026, CO.premium_rate_2027, CO.self_employed_share_of_premium], [0.0088, 0.0086, 0.5]);
  assert.equal(CO.premium_rate_2026 * CO.self_employed_share_of_premium, CO.self_employed_premium_rate_2026, "2026 : la moitié de 0,88 %");
  assert.deepEqual(B.premium(R, "CO", 50000), { annual: 220, quarterly: 55, eligible: true,
    next: { year: 2027, annual: 215, quarterly: 53.75 } }, "50 000 × 0,44 % ; 50 000 × 0,43 %");
  assert.deepEqual(B.premium(R, "CO", 200000), { annual: 811.8, quarterly: 202.95, eligible: true,
    next: { year: 2027, annual: 826.89, quarterly: 206.72 } }, "184 500 × 0,44 % ; 192 300 × 0,43 % = 826,89");
  assert.deepEqual(B.premium(R, "CO", 190000).next, { year: 2027, annual: 817, quarterly: 204.25 }, "sous le plafond de 2027 : 190 000 × 0,43 %");
  assert.deepEqual(B.premium(R, "CO", 0), { annual: 0, quarterly: 0, eligible: true, next: { year: 2027, annual: 0, quarterly: 0 } });
  assert.deepEqual(B.premium(R, "CO", "x"), { error: "profit" });
});

test("autres États et saisies invalides", () => {
  for (const s of ["DE", "MA", "ME", "NJ", "NY", "WA", "TX"]) assert.equal(B.premium(R, s, 50000), null, s + " : pas d'estimation");
  for (const bad of [-1, NaN, Infinity, "50000", undefined]) assert.deepEqual(B.premium(R, "CA", bad), { error: "profit" });
  assert.deepEqual(B.premium(R, "OR", -5), { error: "profit" });
});

test("page : chiffres cités égaux aux règles", () => {
  const html = readFileSync(new URL("../../content/us/self-employed-paid-leave.html", import.meta.url), "utf8");
  const usd = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const C = R.us_paid_leave_ca_diec, O = R.us_paid_leave_or_self_employed, W = R.us_paid_leave_wa_elective;
  for (const n of [C.minimum_annual_premium_2026, C.minimum_premium_net_profit, O.min_oregon_net_income, O.income_cap]) {
    assert.ok(html.includes(usd(n)), `${usd(n)} cité dans la page`);
  }
  assert.ok(html.includes("8.84%") && html.includes("0.6%") && html.includes("0.5%"), "taux de la Californie, de l'Oregon et du Maine");
  assert.ok(html.includes("2 of your last 4 completed calendar quarters"), "Massachusetts : 2 trimestres sur les 4 derniers");
  const WA = R.us_paid_leave_wa_elective, pct = (r) => Math.round(r * 10000) / 100 + "%";
  assert.ok(html.includes(`The premium rate is ${pct(WA.premium_rate_2026)} in 2026 (${pct(WA.premium_rate_2027)} in 2027), and employees pay ${pct(WA.employee_share_2026)} of it (${pct(WA.employee_share_2027)} in 2027)`) &&
    html.includes(`about ${pct(WA.premium_rate_2026 * WA.employee_share_2026)} of the income you report (about ${pct(WA.premium_rate_2027 * WA.employee_share_2027)} in 2027)`),
    "Washington : taux, part des salariés et part de l'indépendant");
  const D = R.us_paid_leave_de_self_employed;
  assert.ok(html.includes(`(${D.earnings_lines}), divided by ${D.quarterly_divisor} for each quarter, and you pay ${D.contribution_share * 100}% of them`),
    "Delaware : lignes de la déclaration, division par 4, 100 % de la cotisation");
  assert.ok(html.includes(`contribution rate is ${D.program_rate_through_2026 * 100}% of wages through 2026`), "Delaware : taux du programme");
  assert.ok(html.includes("independent contractors are not covered") && !html.includes("New Jersey and other states"), "New Jersey : non couverts");
  const CO = R.us_paid_leave_co_self_employed;
  assert.ok(html.includes(`drops from ${pct(CO.premium_rate_2026)} to ${pct(CO.premium_rate_2027)} of wages; as self-employed people pay half of it, your rate becomes ${pct(CO.premium_rate_2027 * CO.self_employed_share_of_premium)}`),
    "Colorado : taux de 2027 et part de l'indépendant");
  assert.ok(html.includes(`You pay ${CO.self_employed_premium_rate_2026 * 100}% of your gross income from self-employment (2026)`) &&
    html.includes(`every quarter for at least ${CO.min_years} years`) && !html.includes("Colorado, Connecticut"), "Colorado : taux, engagement");
  assert.ok(html.includes(`${C.di_max_weeks} weeks`) && html.includes(`${C.pfl_max_weeks} weeks`) && html.includes(`${C.months_before_claim} months`));
  assert.ok(html.includes(`${W.hours_required} hours`) && html.includes(`${R.us_paid_leave_mn_self_employed.min_weeks} consecutive weeks`));
  const MN = R.us_paid_leave_mn_self_employed;
  assert.ok(html.includes(`the rate is ${Math.round(MN.premium_rate_2026 * 10000) / 100}% in 2026`), "Minnesota : taux de 2026");
  assert.ok(html.includes(`at least ${Math.round(MN.min_net_earnings_share_of_state_average_wage * 1000) / 10}% of the state's average annual wage`)
    && html.includes(`by ${MN.rate_adjusted_each_year_by} for the next year`), "Minnesota : 5,3 % du salaire moyen, taux ajusté avant le 31 juillet");
  assert.ok(html.includes(`${R.us_ssdi_basics.waiting_period_months} full months`) && html.includes(`${R.us_ssdi_basics.insured_quarters_of_coverage} quarters`));
});
