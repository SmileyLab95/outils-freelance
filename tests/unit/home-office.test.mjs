// Tests du moteur « bureau à domicile » (documentation/27-bureau-a-domicile.md) : exemples officiels, plafonds,
// reports et cas limites, dans les quatre pays.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const H = createRequire(import.meta.url)("../../src/assets/engines/home-office.js");
const US = ruleValues("us"), UK = ruleValues("uk"), CA = ruleValues("ca"), FR = ruleValues("fr");

test("part d'un tout : bornée entre 0 et 1, nulle si le tout est nul ou négatif", () => {
  assert.equal(H.share(150, 1500), 0.1);
  assert.equal(H.share(2000, 1500), 1);
  assert.equal(H.share(100, 0), 0);
  assert.equal(H.share(-5, 100), 0);
  assert.equal(H.share("abc", 100), 0);
});

test("États-Unis : méthode simplifiée (5 $ par pied carré, 300 au plus) et méthode réelle", () => {
  const S = US.home_office_simplified_method;
  assert.deepEqual([S.rate_per_sqft, S.max_sqft, S.max_deduction], [5, 300, 1500]);
  // 300 pieds carrés : 1 500 $, le maximum (IRS).
  assert.equal(H.us({ officeArea: 300, homeArea: 1500, expenses: 0 }, US).simplified, S.max_deduction);
  const r = H.us({ officeArea: 400, homeArea: 2000, expenses: 24000, profit: null }, US);
  assert.equal(r.simplifiedArea, 300);
  assert.equal(r.simplified, 1500);
  assert.equal(r.percentage, 0.2);
  assert.equal(r.regular, 4800);
  assert.deepEqual([r.limit, r.simplifiedAllowed, r.regularAllowed, r.carryover, r.best], [null, 1500, 4800, 0, "regular"]);
  // Bénéfice de 3 000 $ : chaque méthode plafonnée ; seul l'excédent de la méthode réelle se reporte.
  const l = H.us({ officeArea: 400, homeArea: 2000, expenses: 24000, profit: 3000 }, US);
  assert.deepEqual([l.limit, l.simplifiedAllowed, l.regularAllowed, l.carryover, l.best], [3000, 1500, 3000, 1800, "regular"]);
  // Petit bureau, dépenses faibles : la simplifiée l'emporte ; égalité → la simplifiée.
  assert.equal(H.us({ officeArea: 100, homeArea: 1000, expenses: 3000 }, US).best, "simplified");
  assert.equal(H.us({ officeArea: 100, homeArea: 1000, expenses: 5000 }, US).best, "simplified");
  // Bénéfice nul ou négatif : rien de déductible cette année.
  const z = H.us({ officeArea: 200, homeArea: 1000, expenses: 10000, profit: -500 }, US);
  assert.deepEqual([z.limit, z.simplifiedAllowed, z.regularAllowed, z.carryover, z.best], [0, 0, 0, 2000, "none"]);
  assert.equal(H.us({ officeArea: 0, homeArea: 0, expenses: 0 }, US).best, "none");
  assert.equal(H.us({ officeArea: 200, homeArea: 1000, expenses: 10000, profit: "" }, US).limit, null);
});

test("Royaume-Uni : forfaits mensuels et exemple officiel de 136 £", () => {
  const bands = UK.use_of_home_flat_rates.map((b) => [b.hours_per_month_from, b.hours_per_month_to, b.monthly_amount]);
  assert.deepEqual(bands, [[25, 50, 10], [51, 100, 18], [101, null, 26]]);
  assert.deepEqual([0, 24, 25, 50, 50.9, 51, 100, 101, 300].map((h) => H.ukMonthlyRate(h, UK)), [0, 0, 10, 10, 10, 18, 18, 26, 26]);
  // GOV.UK : 40 heures pendant 10 mois et 60 heures pendant 2 mois : 100 £ + 36 £ = 136 £.
  const ex = H.uk({ hours: [40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 60, 60], costs: 0, rooms: 1, businessRooms: 0, daysPerWeek: 0 }, UK);
  assert.equal(ex.flatRate, UK.uk_use_of_home_actual_costs.flat_rate_example_claim);
  assert.equal(ex.flatMonths, 12);
  assert.equal(H.uk({ hours: 60, months: 12 }, UK).flatRate, 216);
  assert.equal(H.uk({ hours: 20, months: 12 }, UK).flatRate, 0);
  assert.equal(H.uk({ hours: 120, months: 15 }, UK).flatRate, 312, "12 mois au plus");
});

test("Royaume-Uni : coûts réels, exemples officiels de 280 £ et 40 £", () => {
  const E = UK.uk_use_of_home_actual_costs;
  const full = H.uk({ hours: 0, months: 0, costs: E.example_annual_bill, rooms: E.example_rooms, businessRooms: E.example_business_rooms, daysPerWeek: 7 }, UK);
  assert.equal(full.actual, E.example_claim);
  const oneDay = H.uk({ hours: 0, months: 0, costs: E.example_annual_bill, rooms: E.example_rooms, businessRooms: E.example_business_rooms, daysPerWeek: E.example_days_per_week }, UK);
  assert.equal(oneDay.actual, E.example_claim_one_day);
  const both = H.uk({ hours: 120, months: 12, costs: 4000, rooms: 5, businessRooms: 1, daysPerWeek: 5 }, UK);
  assert.deepEqual([both.flatRate, both.actual, both.best], [312, 571.43, "actual"]);
  assert.equal(H.uk({ hours: 120, months: 12, costs: 1000, rooms: 5, businessRooms: 1, daysPerWeek: 5 }, UK).best, "flat");
  assert.equal(H.uk({ hours: 10, months: 12, costs: 0, rooms: 4, businessRooms: 1, daysPerWeek: 9 }, UK).best, "none");
  assert.equal(H.uk({ hours: 0, months: 0, costs: 700, rooms: 1, businessRooms: 3, daysPerWeek: 9 }, UK).actual, 700, "parts plafonnées");
});

test("Canada : part de surface et de temps, plafond au revenu net, report", () => {
  const C = CA.ca_business_use_of_home;
  assert.ok(C.limited_to_net_income_before_these_expenses && C.carry_forward);
  const base = { eligible: true, workspaceArea: 162, homeArea: 1800, businessTime: 100, expenses: 13300, netIncome: 20000, carryIn: 0 };
  const r = H.ca(base, CA);
  assert.equal(r.share, 0.09);
  assert.deepEqual([r.current, r.available, r.deductible, r.carryForward], [1197, 1197, 1197, 0]);
  // Revenu net de 800 $ : 800 $ déduits, 397 $ reportés ; report de l'an dernier ajouté.
  const lim = H.ca({ ...base, netIncome: 800, carryIn: 100 }, CA);
  assert.deepEqual([lim.available, lim.deductible, lim.carryForward], [1297, 800, 497]);
  // Perte : rien de déductible, tout est reporté.
  const loss = H.ca({ ...base, netIncome: -2000 }, CA);
  assert.deepEqual([loss.limit, loss.deductible, loss.carryForward], [0, 0, 1197]);
  // Espace aussi utilisé pour la vie privée : 50 % du temps.
  assert.equal(H.ca({ ...base, businessTime: 50 }, CA).current, 598.5);
  // Condition non remplie : aucune déduction ni report.
  const no = H.ca({ ...base, eligible: false }, CA);
  assert.deepEqual([no.deductible, no.carryForward], [0, 0]);
});

test("France : micro sans déduction, réel au prorata de la surface", () => {
  assert.equal(FR.micro_charges_reelles.charges_reelles_deductibles, false);
  assert.deepEqual(H.fr({ regime: "micro", proArea: 10, totalArea: 50, expenses: 12000 }, FR), { share: 0, deductible: 0, reason: "abattement" });
  assert.deepEqual(H.fr({ regime: "reel", proArea: 10, totalArea: 50, expenses: 12000 }, FR), { share: 0.2, deductible: 2400, reason: "prorata" });
  // Exemple du BOFiP : 173 m² professionnels sur 441 m² au total.
  assert.equal(H.fr({ regime: "reel", proArea: 173, totalArea: 441, expenses: 441 }, FR).deductible, 173);
  assert.equal(H.fr({ regime: "reel", proArea: 60, totalArea: 50, expenses: 1000 }, FR).deductible, 1000);
  assert.throws(() => H.fr({ regime: "is" }, FR));
});

// Pages : textes de l'outil, chiffres repris des règles, sources citées.
import { readFileSync } from "node:fs";
import { ruleEntries } from "./regles.mjs";
const page = (path) => {
  const html = readFileSync(new URL(`../../content/${path}`, import.meta.url), "utf8");
  return { html, L: JSON.parse(/<script type="application\/json" id="ho-data">([\s\S]*?)<\/script>/.exec(html)[1]),
           front: JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]) };
};
const PAGES = { "us/home-office-deduction-calculator.html": "us", "uk/working-from-home-allowance-calculator.html": "uk",
  "ca/business-use-of-home-calculator.html": "ca", "ca-fr/frais-bureau-a-domicile.html": "ca", "fr/bureau-a-domicile.html": "fr" };
// Éléments que l'outil remplit, par pays (tools/home-office.js).
const IDS = { us: ["ho-office", "ho-home", "ho-expenses", "ho-profit", "ho-big", "ho-sub", "ho-simplified", "ho-simplified-detail", "ho-regular", "ho-regular-detail", "ho-carry-row", "ho-carry"],
  uk: ["ho-hours", "ho-months", "ho-costs", "ho-rooms", "ho-business-rooms", "ho-days", "ho-big", "ho-sub", "ho-flat", "ho-flat-detail", "ho-actual"],
  ca: ["ho-eligible", "ho-workspace", "ho-home", "ho-time", "ho-expenses", "ho-income", "ho-carry-in", "ho-hero", "ho-big", "ho-sub", "ho-share", "ho-current", "ho-limit", "ho-carry"],
  fr: ["ho-regime", "ho-pro", "ho-total", "ho-expenses", "ho-hero", "ho-big", "ho-sub", "ho-share"] };
const TEXTS = { us: { best: ["simplified", "regular", "none"], keys: ["simplified_detail", "regular_detail", "percent"] },
  uk: { best: ["flat", "actual", "none"], keys: ["flat_detail", "flat_none", "percent"] },
  ca: { sub: ["all", "carried", "not_eligible"], keys: ["percent"] }, fr: { sub: ["abattement", "prorata"], keys: ["percent"] } };

for (const [path, country] of Object.entries(PAGES)) {
  test(`${path} : champs et zones de résultat présents, un texte par cas, sources citées`, () => {
    const { html, L, front } = page(path);
    assert.equal(L.country, country);
    for (const id of IDS[country]) assert.match(html, new RegExp(`id="${id}"`), id);
    for (const [group, keys] of Object.entries(TEXTS[country])) {
      if (group === "keys") { for (const k of keys) assert.ok(typeof L[k] === "string", k); continue; }
      assert.deepEqual(Object.keys(L[group]).sort(), [...keys].sort(), group);
      for (const k of keys) assert.ok(L[group][k].length > 0, `${group}.${k}`);
    }
    const rules = ruleEntries(country);
    for (const key of front.sources) assert.ok(rules[key], `source ${key}`);
    assert.equal(front.id, "home-office");
    assert.ok(front.title.length <= 60 && front.description.length <= 160, "titre et description");
    assert.ok(front.faq.length >= 3 && front.faq.length <= 6, "FAQ de 3 à 6 questions");
  });
}

test("chiffres des pages repris des règles", () => {
  const S = US.home_office_simplified_method;
  const us = page("us/home-office-deduction-calculator.html");
  const usText = us.html + JSON.stringify(us.front.faq);
  for (const m of usText.matchAll(/\$([\d,]+)/g)) assert.ok([S.rate_per_sqft, S.max_deduction].includes(Number(m[1].replace(/,/g, ""))), m[0]);
  for (const m of usText.matchAll(/([\d,]+) (?:square feet|sq ft)/g)) assert.ok(m[1] === String(S.max_sqft) || m[1] === "{area}", m[0]);
  const uk = page("uk/working-from-home-allowance-calculator.html"), E = UK.uk_use_of_home_actual_costs;
  const allowed = new Set([...UK.use_of_home_flat_rates.map((b) => b.monthly_amount), E.example_annual_bill, E.example_claim, E.example_claim_one_day]);
  for (const m of (uk.html + JSON.stringify(uk.front.faq)).matchAll(/£([\d,]+)/g)) assert.ok(allowed.has(Number(m[1].replace(/,/g, ""))), m[0]);
  for (const b of UK.use_of_home_flat_rates) assert.ok(uk.html.includes(`<td>£${b.monthly_amount}</td>`), `barème ${b.monthly_amount}`);
  assert.ok(uk.html.includes("25 to 50") && uk.html.includes("51 to 100") && uk.html.includes("101 or more"));
  const fr = page("fr/bureau-a-domicile.html"), A = FR.micro_abattements;
  for (const rate of [A.vente_hebergement, A.services_bic, A.bnc]) {
    const p = `${Math.round(rate * 100)} %`;
    assert.ok(fr.L.sub.abattement.includes(p) && fr.html.includes(p), p);
  }
  for (const m of fr.L.sub.abattement.matchAll(/(\d+) %/g)) assert.ok([A.vente_hebergement, A.services_bic, A.bnc].map((r) => Math.round(r * 100)).includes(Number(m[1])), m[0]);
  assert.equal(FR.domiciliation_domicile.domicile_possible, true);
});

test("les deux pages canadiennes ont les mêmes champs et les mêmes textes de résultat", () => {
  const en = page("ca/business-use-of-home-calculator.html"), fr = page("ca-fr/frais-bureau-a-domicile.html");
  assert.deepEqual(Object.keys(en.L.sub), Object.keys(fr.L.sub));
  const names = (html) => [...html.matchAll(/name="([\w-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names(fr.html), names(en.html));
  for (const key of Object.keys(en.L.sub)) assert.equal(en.L.sub[key].includes("{carry}"), fr.L.sub[key].includes("{carry}"), key);
});
