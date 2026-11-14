// Immobilisations et amortissements de l'Espace (documentation/57-immobilisations.md) : contrôles de saisie, plan
// d'amortissement linéaire (prorata en jours, cumul au centime, cession), registre de l'année, messages, export CSV.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues, ruleEntries } from "./regles.mjs";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/espace-fr.js");
const R = ruleValues("fr");
const a = (over) => Object.assign({ id: "a1", label: "Ordinateur portable", category: "materiel", acquiredOn: "2026-07-01", inServiceOn: "",
  cost: 1500, years: 3, proShare: 100, soldOn: "", salePrice: null }, over);
const amounts = (plan) => plan.map((r) => r.amount);

test("règles sourcées : seuil de 500 € HT (trois catégories, transport exclu), amortissement linéaire, registre des BNC", () => {
  assert.deepEqual(R.immobilisation_seuil_charges, { amount: 500, categories: ["materiel", "bureau", "logiciel"] });
  assert.deepEqual(R.amortissement_lineaire, { start: "mise en service", prorata: "jours", cap: "prix de revient", year: "période de douze mois" });
  assert.equal(R.registre_immobilisations_bnc.partial, "affecté partiellement à l'exercice de la profession");
  for (const k of ["immobilisation_seuil_charges", "amortissement_lineaire", "registre_immobilisations_bnc"]) {
    assert.equal(ruleEntries("fr")[k].confidence, "high", k);
    assert.match(ruleEntries("fr")[k].source, /^https:\/\/bofip\.impots\.gouv\.fr\//, k);
  }
  assert.deepEqual(Object.keys(E.ASSET_CATEGORIES), ["materiel", "bureau", "logiciel", "transport", "autre"]);
});

test("plan : mis en service le 1er janvier, trois annuités, cumul au centime égal au prix de revient", () => {
  const plan = E.assetPlan(a({ acquiredOn: "2026-01-01", cost: 1000 }));
  assert.deepEqual(amounts(plan), [333.33, 333.34, 333.33]);
  assert.deepEqual(plan.map((r) => r.year), [2026, 2027, 2028]);
  assert.deepEqual(plan.map((r) => r.days), [null, null, null], "années entières");
  assert.equal(plan[2].cumulative, 1000);
  assert.equal(plan[2].net, 0);
  assert.deepEqual(amounts(E.assetPlan(a({ acquiredOn: "2026-01-01", cost: 900 }))), [300, 300, 300]);
  assert.deepEqual(amounts(E.assetPlan(a({ acquiredOn: "2026-01-01", cost: 777.77, years: 1 }))), [777.77], "un an");
});

test("plan : mise en service en cours d'année, prorata en jours exacts (jour de mise en service compris), bissextile", () => {
  const plan = E.assetPlan(a());   // 1er juillet 2026 : 184 jours sur 365
  assert.deepEqual(plan.map((r) => [r.year, r.days, r.yearDays, r.amount, r.cumulative, r.net]), [
    [2026, 184, 365, 252.05, 252.05, 1247.95], [2027, null, 365, 500, 752.05, 747.95], [2028, null, 366, 500, 1252.05, 247.95], [2029, null, 365, 247.95, 1500, 0]]);
  // Mise en service distincte de l'acquisition : elle seule compte (BOI-BIC-AMT-20-10, § 120).
  const later = E.assetPlan(a({ acquiredOn: "2026-06-15", inServiceOn: "2026-12-31" }));
  assert.equal(later[0].days, 1);
  assert.equal(later[0].amount, 1.37, "un jour : 500 × 1 / 365");
  // 2028 est bissextile : 1er mars 2028 au 31 décembre = 306 jours sur 366.
  const leap = E.assetPlan(a({ acquiredOn: "2028-03-01", cost: 3660, years: 1 }));
  assert.deepEqual(leap.map((r) => [r.year, r.days, r.yearDays, r.amount]), [[2028, 306, 366, 3060], [2029, null, 365, 600]]);
});

test("plan : part professionnelle (seule la fraction est déductible), cumul et valeur nette sur le prix entier", () => {
  const plan = E.assetPlan(a({ acquiredOn: "2026-01-01", cost: 1200, proShare: 60 }));
  assert.deepEqual(plan.map((r) => [r.amount, r.deductible]), [[400, 240], [400, 240], [400, 240]]);
  assert.equal(E.assetPlan(a({ acquiredOn: "2026-01-01", cost: 1000, proShare: 33.3 }))[0].deductible, 111);
});

test("plan : cession en cours d'année, annuité jusqu'au jour de la cession compris, plan arrêté", () => {
  const plan = E.assetPlan(a({ acquiredOn: "2026-01-01", cost: 3650, years: 5, soldOn: "2027-03-31", salePrice: 2000 }));
  // 730 € par an ; 2027 : du 1er janvier au 31 mars = 90 jours, 730 × 90 / 365 = 180 €.
  assert.deepEqual(plan.map((r) => [r.year, r.days, r.amount, r.cumulative, r.net]), [[2026, null, 730, 730, 2920], [2027, 90, 180, 910, 2740]]);
  // Cédé l'année de la mise en service.
  assert.deepEqual(amounts(E.assetPlan(a({ soldOn: "2026-07-01", salePrice: 1000 }))), [1.37]);
  // Cédé après la fin du plan : plan complet, rien de plus.
  assert.deepEqual(amounts(E.assetPlan(a({ acquiredOn: "2020-01-01", cost: 900, soldOn: "2026-05-01", salePrice: 50 }))), [300, 300, 300]);
});

test("registre de l'année : biens présents, annuités, totaux ; bien cédé dans l'année hors valeur nette au 31/12", () => {
  const assets = [a({ id: "p", label: "Imprimante", category: "bureau", acquiredOn: "2026-01-01", cost: 600, years: 2 }),
    a({ id: "o", label: "Ordinateur portable" }),
    a({ id: "v", label: "Vieux poste", acquiredOn: "2024-01-01", cost: 1500, years: 3, soldOn: "2026-03-31", salePrice: 100 }),
    a({ id: "x", label: "Écran revendu en 2025", acquiredOn: "2023-01-01", cost: 900, soldOn: "2025-06-30", salePrice: 0 }),
    a({ id: "f", label: "Achat de 2027", acquiredOn: "2027-02-01" })];
  const y = E.assetsYear(assets, 2026);
  assert.deepEqual(y.rows.map((r) => r.asset.id), ["v", "p", "o"], "triés par mise en service ; cédé en 2025 et acquis en 2027 absents");
  assert.deepEqual(y.rows.map((r) => [r.amount, r.cumulative, r.net, r.sold]), [[123.29, 1123.29, 376.71, true], [300, 300, 300, false], [252.05, 252.05, 1247.95, false]]);
  assert.equal(y.amount, 675.34);
  assert.equal(y.deductible, 675.34);
  assert.equal(y.net, 1547.95, "valeur nette au 31/12 sans le bien cédé");
  assert.equal(y.count, 3);
  const y29 = E.assetsYear(assets, 2029);
  // 2029 : imprimante amortie (rien cette année, valeur nette nulle) ; ordinateur : reste 247,95 € ; achat de 2027
  // (1er février : 334 jours en 2027, 457,53 €) : troisième année pleine, reste 42,47 € pour 2030.
  assert.deepEqual(y29.rows.map((r) => [r.asset.id, r.amount, r.net]), [["p", 0, 0], ["o", 247.95, 0], ["f", 500, 42.47]]);
  assert.deepEqual(E.assetsYear([], 2026), { rows: [], amount: 0, deductible: 0, net: 0, count: 0 });
});

test("contrôles de saisie : champs obligatoires, dates, durée entière, part, cession", () => {
  assert.deepEqual(E.assetErrors(a()), []);
  const fields = (x) => E.assetErrors(x).map((e) => e.field);
  assert.deepEqual(fields({}), ["label", "category", "acquiredOn", "cost", "years", "proShare"]);
  assert.deepEqual(fields(a({ acquiredOn: "2026-02-30" })), ["acquiredOn"], "date inexistante");
  assert.deepEqual(fields(a({ inServiceOn: "2026-06-30" })), ["inServiceOn"], "mise en service avant l'acquisition");
  assert.deepEqual(fields(a({ inServiceOn: "2026-07-01" })), [], "même jour : accepté");
  for (const years of [0, 51, 2.5, "", null]) assert.deepEqual(fields(a({ years })), ["years"], String(years));
  for (const years of [1, 50]) assert.deepEqual(fields(a({ years })), [], String(years));
  for (const proShare of [0, 0.5, 101, ""]) assert.deepEqual(fields(a({ proShare })), ["proShare"], String(proShare));
  for (const cost of [0, -5, "", "abc"]) assert.deepEqual(fields(a({ cost })), ["cost"], String(cost));
  assert.deepEqual(fields(a({ soldOn: "2026-06-30", salePrice: 10 })), ["soldOn"], "cession avant la mise en service");
  assert.deepEqual(fields(a({ soldOn: "2027-01-10" })), ["salePrice"], "prix de cession manquant");
  assert.deepEqual(fields(a({ soldOn: "2027-01-10", salePrice: 0 })), [], "mis au rebut : 0 accepté");
  assert.deepEqual(fields(a({ salePrice: 100 })), ["soldOn"], "prix sans date");
  assert.equal(E.checkAsset({})[0], "Indiquez la nature du bien.");
});

test("messages : 500 € HT ou moins (catégories admises), véhicule, usage partiel", () => {
  assert.deepEqual(E.assetHints(a({ cost: 500 }), R), ["deductible"], "500 € pile : la tolérance s'applique (n'excédant pas)");
  assert.deepEqual(E.assetHints(a({ cost: 500.01 }), R), []);
  for (const category of ["bureau", "logiciel"]) assert.deepEqual(E.assetHints(a({ category, cost: 300 }), R), ["deductible"], category);
  assert.deepEqual(E.assetHints(a({ category: "transport", cost: 300 }), R), ["vehicle"], "matériel de transport exclu de la tolérance");
  assert.deepEqual(E.assetHints(a({ category: "autre", cost: 300 }), R), []);
  assert.deepEqual(E.assetHints(a({ proShare: 80 }), R), ["partial"]);
});

test("export CSV du registre de l'année", () => {
  const csv = E.assetsCSV(E.assetsYear([a({ label: 'Bureau "assis-debout"', category: "bureau", cost: 1234.5, proShare: 50, soldOn: "2027-01-31", salePrice: 400 })], 2026));
  const [head, line] = csv.split("\r\n");
  assert.equal(head.split(";").length, 13);
  assert.equal(line, '"Bureau ""assis-debout""";"Matériel et mobilier de bureau";01/07/2026;01/07/2026;1234,50;3;50;207,44;207,44;1027,06;103,72;31/01/2027;400,00');
});
