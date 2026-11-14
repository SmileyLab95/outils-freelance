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
  assert.deepEqual(E.assetsYear([], 2026), { rows: [], amount: 0, deductible: 0, net: 0, count: 0, pending: 0,
    disposals: { count: 0, shortTerm: 0, longTerm: 0, pending: 0, pendingGains: 0 } });
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
  assert.equal(head.split(";").length, 15);
  assert.equal(line, '"Bureau ""assis-debout""";"Matériel et mobilier de bureau";01/07/2026;01/07/2026;1234,50;3;50;207,44;207,44;1027,06;103,72;31/01/2027;400,00;;', "cédé l'année suivante : pas de résultat de cession cette année");
});

// Plafond des voitures particulières (documentation/57 § 8) : CGI, art. 39, 4 ; BOI-BIC-AMT-20-40-50 ; notices 2032 et 2142 de 2026.
const car = (over) => a(Object.assign({ id: "c", label: "Voiture", category: "transport", vp: true, acquiredOn: "2026-01-01", cost: 35000, years: 4,
  firstRegOn: "2026-01-01", co2: 200 }, over));
const capOf = (over) => E.vehicleCap(car(over), R).cap;

test("règle du plafond des voitures particulières : barèmes WLTP et ancien, sources officielles", () => {
  assert.deepEqual(R.plafond_amortissement_vp, { acquired_from: "2021-01-01", wltp_from: "2020-03-01",
    wltp: [{ below: 20, cap: 30000 }, { below: 50, cap: 20300 }, { up_to: 160, cap: 18300 }, { cap: 9900 }],
    nedc: [{ below: 20, cap: 30000 }, { below: 60, cap: 20300 }, { up_to: 130, cap: 18300 }, { cap: 9900 }] });
  const entry = ruleEntries("fr").plafond_amortissement_vp;
  assert.equal(entry.confidence, "high");
  assert.match(entry.source, /^https:\/\/www\.impots\.gouv\.fr\//);
  assert.ok(entry.more_sources.some((m) => /BOI-BIC-AMT-20-40-50/.test(m.source)));
});

test("plafond : bornes des barèmes WLTP (première immatriculation depuis le 1er mars 2020) et ancien", () => {
  const wltp = (co2) => capOf({ firstRegOn: "2020-03-01", co2 });
  assert.deepEqual([0, 19, 20, 49, 50, 160, 161].map(wltp), [30000, 30000, 20300, 20300, 18300, 18300, 9900]);
  const old = (co2) => capOf({ acquiredOn: "2022-05-10", firstRegOn: "2020-02-29", co2 });
  assert.deepEqual([19, 20, 59, 60, 130, 131].map(old), [30000, 20300, 20300, 18300, 18300, 9900]);
  assert.equal(E.vehicleCap(car({ firstRegOn: "2020-03-01", co2: 120 }), R).wltp, true);
  assert.equal(E.vehicleCap(car({ firstRegOn: "2020-02-29", co2: 120 }), R).wltp, false);
});

test("plafond : statuts (pas un véhicule, pas une voiture particulière, acquise avant 2021, carte grise incomplète, sous le plafond)", () => {
  assert.equal(E.vehicleCap(a(), R), null);
  assert.deepEqual(E.vehicleCap(car({ vp: false }), R), { status: "not_vp" });
  assert.deepEqual(E.vehicleCap(car({ acquiredOn: "2020-12-31" }), R), { status: "before" });
  assert.equal(E.vehicleCap(car({ acquiredOn: "2021-01-01" }), R).status, "capped");
  assert.deepEqual(E.vehicleCap(car({ co2: "" }), R), { status: "missing" });
  assert.deepEqual(E.vehicleCap(car({ firstRegOn: "" }), R), { status: "missing" });
  assert.deepEqual(E.vehicleCap(car({ co2: "abc" }), R), { status: "missing" });
  assert.deepEqual(E.vehicleCap(car({ cost: 18300, co2: 120 }), R), { status: "under", cap: 18300, ratio: 1, wltp: true, co2: 120 });
  assert.equal(E.vehicleCap(car({ cost: 18300.01, co2: 120 }), R).status, "capped");
  assert.equal(E.vehicleCap(car({ cost: 15000, co2: 120 }), R).ratio, 1, "sous le plafond : rapport de 1");
});

test("plafond : part déductible = annuité × plafond ÷ prix (exemple du BOFiP : 8 750 € × 9 900 / 35 000 = 2 475 €)", () => {
  assert.deepEqual(E.assetPlan(car(), R).map((r) => [r.amount, r.deductible]), [[8750, 2475], [8750, 2475], [8750, 2475], [8750, 2475]]);
  const prorata = E.assetPlan(car({ acquiredOn: "2026-03-01" }), R);
  assert.deepEqual(prorata.map((r) => r.deductible), [2074.93, 2475, 2475, 2475, 400.07]);
  assert.equal(Math.round(prorata.reduce((s, r) => s + r.deductible, 0) * 100) / 100, 9900, "total déductible = plafond");
  assert.deepEqual(prorata.map((r) => r.net).slice(-1), [0], "cumul et valeur nette comptables inchangés");
  assert.deepEqual(E.assetPlan(car(), undefined).map((r) => r.deductible), [8750, 8750, 8750, 8750], "sans les règles : pas de plafond");
  for (const over of [{ vp: false }, { cost: 15000, co2: 120 }]) {
    assert.deepEqual(E.assetPlan(car(over), R).map((r) => r.deductible), E.assetPlan(car(over)).map((r) => r.amount), JSON.stringify(over));
  }
});

test("plafond : voiture en partie privée, acquise avant 2021 ou carte grise incomplète, part à établir ; totaux sans elle", () => {
  assert.deepEqual(E.assetPlan(car({ proShare: 80 }), R).map((r) => r.deductible), [null, null, null, null]);
  assert.deepEqual(E.assetPlan(car({ co2: "" }), R).map((r) => r.deductible), [null, null, null, null]);
  assert.deepEqual(E.assetPlan(car({ acquiredOn: "2020-01-01", cost: 9000 }), R).map((r) => r.deductible), [null, null, null, null], "acquise avant 2021");
  assert.deepEqual(E.assetPlan(car({ proShare: 80, cost: 15000, co2: 120 }), R)[0].deductible, 3000, "sous le plafond : part professionnelle seule");
  const y = E.assetsYear([car(), car({ id: "d", label: "Autre voiture", proShare: 80 }),
    a({ id: "m", acquiredOn: "2026-01-01", cost: 1200 })], 2026, R);
  assert.deepEqual([y.amount, y.deductible, y.pending], [17900, 2875, 1]);
  assert.deepEqual(y.rows.map((r) => [r.asset.id, r.deductible]), [["d", null], ["m", 400], ["c", 2475]]);
  const lines = E.assetsCSV(y).split("\r\n");
  assert.equal(lines[1], '"Autre voiture";"Véhicule ou matériel de transport";01/01/2026;01/01/2026;35000,00;4;80;8750,00;8750,00;26250,00;;;;;', "part à établir : cellule vide");
});

test("plafond : saisie de la carte grise exigée pour une voiture particulière acquise depuis 2021", () => {
  const fields = (x) => E.assetErrors(x, R).map((e) => e.field);
  assert.deepEqual(fields(car()), []);
  assert.deepEqual(fields(car({ firstRegOn: "", co2: "" })), ["firstRegOn", "co2"]);
  for (const co2 of [120.5, -1, 1000, "abc"]) assert.deepEqual(fields(car({ co2 })), ["co2"], String(co2));
  assert.deepEqual(fields(car({ co2: 0 })), [], "0 g (électrique) accepté");
  assert.deepEqual(fields(car({ firstRegOn: "", co2: "", acquiredOn: "2020-06-01" })), [], "acquise avant 2021 : rien d'exigé");
  assert.deepEqual(fields(car({ firstRegOn: "", co2: "", acquiredOn: "2021-01-01" })), ["firstRegOn", "co2"], "acquise le 1er janvier 2021 : exigé");
  assert.deepEqual(fields(car({ firstRegOn: "", co2: "", vp: false })), [], "pas une voiture particulière");
  assert.deepEqual(E.assetErrors(car({ firstRegOn: "", co2: "" })).map((e) => e.field), [], "sans les règles : pas de contrôle");
});


// Plus-values et moins-values de cession (documentation/57 § 9) : BOI-BNC-BASE-30-20, BOI-BNC-BASE-30-30-10.
const out = (over) => { const d = E.assetDisposal(a(over), R); return [d.net, d.result, d.heldTwoYears, d.shortTerm, d.longTerm, d.split]; };

test("règle des plus-values professionnelles : deux ans, étalement sur trois ans, 12,8 %, dix exercices ; sources BOFiP", () => {
  assert.deepEqual(R.plus_values_professionnelles, { holding_years: 2, short_term_spread_years: 3, long_term_rate: 12.8, long_term_loss_carry_years: 10 });
  const entry = ruleEntries("fr").plus_values_professionnelles;
  assert.equal(entry.confidence, "high");
  assert.match(entry.source, /BOI-BNC-BASE-30-30-10/);
  assert.ok(entry.more_sources.some((m) => /BOI-BNC-BASE-30-20/.test(m.source)));
});

test("cession : moins-value à court terme (toute durée), plus-value avant deux ans à court terme, mise au rebut", () => {
  assert.equal(E.assetDisposal(a(), R), null, "pas de cession");
  assert.equal(E.assetDisposal(a({ soldOn: "2027-03-31" }), R), null, "prix de cession manquant");
  assert.deepEqual(out({ soldOn: "2027-03-31", salePrice: 900 }), [1124.66, -224.66, false, -224.66, 0, "ok"]);
  assert.deepEqual(out({ acquiredOn: "2020-01-01", cost: 3000, years: 10, soldOn: "2026-12-31", salePrice: 500 }), [900, -400, true, -400, 0, "ok"],
    "moins-value d'un bien amortissable détenu depuis plus de deux ans : court terme");
  assert.deepEqual(out({ acquiredOn: "2026-01-01", cost: 3000, soldOn: "2027-06-30", salePrice: 2800 }), [1504.11, 1295.89, false, 1295.89, 0, "ok"]);
  assert.deepEqual(out({ soldOn: "2027-03-31", salePrice: 0 }), [1124.66, -1124.66, false, -1124.66, 0, "ok"], "mise au rebut");
  assert.deepEqual(out({ acquiredOn: "2026-01-01", cost: 1000, years: 1, soldOn: "2027-06-30", salePrice: 0 }).slice(0, 2), [0, 0], "bien amorti, rebut : ni plus ni moins-value");
});

test("cession après deux ans : court terme jusqu'aux amortissements déduits, long terme au-delà ; borne des deux ans", () => {
  assert.deepEqual(out({ acquiredOn: "2024-01-01", cost: 3000, soldOn: "2026-12-31", salePrice: 3500 }), [0, 3500, true, 3000, 500, "ok"]);
  assert.deepEqual(out({ acquiredOn: "2024-01-01", cost: 3000, soldOn: "2026-12-31", salePrice: 1500 }), [0, 1500, true, 1500, 0, "ok"]);
  const eve = out({ acquiredOn: "2024-03-10", cost: 3000, soldOn: "2026-03-09", salePrice: 3500 });
  const day = out({ acquiredOn: "2024-03-10", cost: 3000, soldOn: "2026-03-10", salePrice: 3500 });
  assert.deepEqual([eve[2], eve[4]], [false, 0], "veille des deux ans : tout à court terme");
  assert.deepEqual([day[2], day[3], day[4]], [true, 2000.52, 500], "jour des deux ans : court terme = amortissements, long terme = prix − prix de revient");
  assert.equal(E.assetDisposal(a({ acquiredOn: "2024-02-29", cost: 3000, soldOn: "2026-02-28", salePrice: 2900 }), R).heldTwoYears, true, "29 février : 28 février");
  assert.equal(E.assetDisposal(a({ acquiredOn: "2024-02-29", cost: 3000, soldOn: "2026-02-27", salePrice: 2900 }), R).heldTwoYears, false);
});

test("cession d'un véhicule : part professionnelle appliquée ; voiture plafonnée et bien partiel : répartition à établir", () => {
  const van = { category: "transport", acquiredOn: "2024-01-01", cost: 30000, years: 5, soldOn: "2026-12-31", salePrice: 20000 };
  assert.deepEqual(out(van), [12000, 8000, true, 8000, 0, "ok"]);
  assert.deepEqual(out(Object.assign({}, van, { proShare: 75 })), [12000, 6000, true, 6000, 0, "ok"], "véhicule aux trois quarts : résultat × 75 %");
  assert.deepEqual(out(Object.assign({}, van, { proShare: 75, salePrice: 33000 })), [12000, 15750, true, 13500, 2250, "ok"],
    "court terme = amortissements × part (18 000 × 75 %), long terme le reste");
  const vp = E.assetDisposal(a(Object.assign({}, van, { vp: true, firstRegOn: "2024-01-01", co2: 200 })), R);
  assert.deepEqual([vp.net, vp.result, vp.shortTerm, vp.longTerm, vp.split, vp.reason], [12000, 8000, null, null, "unknown", "vehicle_cap"],
    "voiture plafonnée : résultat avec les amortissements sans limitation, répartition à établir");
  const under = E.assetDisposal(a(Object.assign({}, van, { vp: true, firstRegOn: "2024-01-01", co2: 120, cost: 15000, salePrice: 10000 })), R);
  assert.equal(under.split, "ok", "voiture sous le plafond : répartition calculée");
  const desk = E.assetDisposal(a({ category: "bureau", acquiredOn: "2024-01-01", cost: 3000, proShare: 60, soldOn: "2026-12-31", salePrice: 1500 }), R);
  assert.deepEqual([desk.result, desk.split, desk.reason], [1500, "unknown", "partial"]);
});

test("registre : cessions de l'année (solde à court terme, long terme, à établir) et colonnes du CSV", () => {
  const y = E.assetsYear([a({ id: "m", soldOn: "2027-03-31", salePrice: 900 }), a({ id: "p", acquiredOn: "2026-01-01", cost: 3000, soldOn: "2027-06-30", salePrice: 2800 }),
    a({ id: "b", category: "bureau", acquiredOn: "2024-01-01", cost: 3000, proShare: 60, soldOn: "2027-02-01", salePrice: 1500 }),
    a({ id: "l", acquiredOn: "2024-01-01", cost: 3000, soldOn: "2027-05-01", salePrice: 3600 }), a({ id: "k", acquiredOn: "2027-01-05" })], 2027, R);
  assert.deepEqual(y.disposals, { count: 4, shortTerm: 4071.23, longTerm: 600, pending: 1, pendingGains: 1 });
  assert.deepEqual(E.assetsYear([a()], 2026, R).disposals, { count: 0, shortTerm: 0, longTerm: 0, pending: 0, pendingGains: 0 });
  const loss = E.assetsYear([a({ id: "b", category: "bureau", acquiredOn: "2026-01-01", cost: 3000, proShare: 60, soldOn: "2027-02-01", salePrice: 0 })], 2027, R);
  assert.deepEqual([loss.disposals.pending, loss.disposals.pendingGains], [1, 0], "cession à établir en moins-value : pas une plus-value à établir");
  const before = E.assetsYear([a({ soldOn: "2027-03-31", salePrice: 900 })], 2026, R);
  assert.deepEqual([before.rows[0].disposal, before.disposals.count], [null, 0], "cédé l'année suivante : rien cette année");
  assert.equal(E.assetsYear([a({ soldOn: "2027-03-31", salePrice: 900 })], 2027).rows[0].disposal, null, "sans les règles : pas de calcul");
  const lines = E.assetsCSV(y).split("\r\n");
  assert.ok(lines.some((l) => l.endsWith(";31/03/2027;900,00;-224,66;0,00")));
  assert.ok(lines.some((l) => l.endsWith(";01/02/2027;1500,00;;")), "à établir : cellules vides");
});


// ----- Exonération des petites entreprises (article 151 septies du CGI, documentation/57 § 10) -----------------------

let invSeq = 0;
/** Facture émise (TVA à 20 % par défaut) encaissée aux dates et montants TTC donnés. */
const inv = (pays, over = {}) => Object.assign({ id: "f" + (++invSeq), type: "facture", status: "issued", date: pays[0][0], nature: "services",
  lines: [{ desc: "Conseil", qty: 1, price: 1000 }], vat: { franchise: false, rate: 20, place: "fr" },
  payments: pays.map(([date, amount], i) => ({ id: "p" + invSeq + "-" + i, date, amount, method: "virement" })) }, over);
const franchise = { vat: { franchise: true, rate: 20, place: "fr" } };

test("151 septies : règle sourcée (cinq ans ; 90 000 / 126 000 € en BNC et services ; 250 000 / 350 000 € en vente)", () => {
  assert.deepEqual(R.plus_values_exoneration_151_septies, { activity_years: 5,
    services_bnc: { full_up_to: 90000, partial_below: 126000, divisor: 36000 }, sales: { full_up_to: 250000, partial_below: 350000, divisor: 100000 } });
  const entry = ruleEntries("fr").plus_values_exoneration_151_septies;
  assert.equal(entry.confidence, "high");
  assert.equal(entry.source, "https://bofip.impots.gouv.fr/doctrine/BOI-BIC-PVMV-40-10-10-30");
  assert.ok(entry.more_sources.some((m) => m.source.endsWith("BOI-BIC-PVMV-40-10-10-20")));
});

test("151 septies : recettes encaissées HT d'une année (TVA retirée, avoirs déduits, brouillons, devis et paiements supprimés ignorés)", () => {
  const docs = [
    inv([["2024-03-10", 1200]]),                                                // 1 000 € HT
    inv([["2024-05-01", 1000]], franchise),                                     // franchise : 1 000 €
    inv([["2024-06-01", 120]], { type: "avoir" }),                              // remboursement : − 100 € HT
    inv([["2024-07-01", 600]], { status: "draft" }),
    inv([["2024-07-01", 600]], { type: "devis" }),
    inv([["2024-12-31", 1200], ["2025-01-01", 1200]]),                          // 1 000 € en 2024, 1 000 € en 2025
  ];
  docs.push(Object.assign(inv([["2024-08-01", 600]]), { payments: [{ id: "z", date: "2024-08-01", amount: 600, deletedAt: "2024-08-02" }] }));
  assert.deepEqual(E.receiptsHT(docs, 2024), { year: 2024, amount: 2900, count: 4 });
  assert.deepEqual(E.receiptsHT(docs, "2025"), { year: 2025, amount: 1000, count: 1 });
  assert.deepEqual(E.receiptsHT(docs, 2023), { year: 2023, amount: 0, count: 0 });
  assert.deepEqual(E.receiptsHT(undefined, 2024), { year: 2024, amount: 0, count: 0 });
});

test("151 septies : moyenne des deux années précédentes, exonération totale, partielle ou nulle, montants à court et long terme", () => {
  // Recettes HT de 2024 et 2025 dont la moyenne vaut m (franchise : encaissé = HT).
  const years = (m24, m25) => [inv([["2024-06-30", m24]], franchise), inv([["2025-06-30", m25]], franchise)];
  const D = { shortTerm: 3000, longTerm: 1000 };
  let x = E.exemption151(years(80000, 100000), 2026, D, R);
  assert.deepEqual(x.years, [2024, 2025]);
  assert.deepEqual(x.receipts.map((r) => r.amount), [80000, 100000]);
  assert.equal(x.average, 90000);
  assert.deepEqual([x.kind, x.rate, x.shortTerm, x.longTerm], ["full", 1, 3000, 1000], "90 000 € : exonération totale (inférieures ou égales)");
  x = E.exemption151(years(90000, 90000.02), 2026, D, R);
  assert.equal(x.average, 90000.01);
  assert.deepEqual([x.kind, x.rate], ["partial", 1], "90 000,01 € : partielle, taux arrondi à 100,00 %");
  x = E.exemption151(years(120000, 120000), 2026, { shortTerm: 40000, longTerm: 0 }, R);
  assert.deepEqual([x.kind, x.rate, x.shortTerm, x.longTerm], ["partial", 0.1667, 6668, 0], "exemple du BOFiP : (126 000 − 120 000) / 36 000 = 16,67 % ; 40 000 × 16,67 % = 6 668");
  x = E.exemption151(years(108000, 108000), 2026, D, R);
  assert.deepEqual([x.kind, x.rate, x.shortTerm, x.longTerm], ["partial", 0.5, 1500, 500]);
  x = E.exemption151(years(126000, 126000), 2026, D, R);
  assert.deepEqual([x.kind, x.rate, x.shortTerm, x.longTerm], ["none", 0, 0, 0], "126 000 € : plus d'exonération");
  x = E.exemption151(years(125999.98, 126000), 2026, D, R);
  assert.deepEqual([x.average, x.kind], [125999.99, "partial"], "juste en dessous de 126 000 €");
  x = E.exemption151(years(50000, 50000), 2026, { shortTerm: -2000, longTerm: 1000 }, R);
  assert.deepEqual([x.shortTerm, x.longTerm, x.base.shortTerm], [0, 1000, 0], "solde à court terme négatif : rien à exonérer");
  x = E.exemption151(years(50000, 50000), 2026, { shortTerm: 500, longTerm: -300 }, R);
  assert.deepEqual([x.shortTerm, x.longTerm, x.base.longTerm], [500, 0, 0], "long terme négatif : rien à exonérer");
  x = E.exemption151(years(50000, 50000), "2026", null, R);
  assert.deepEqual([x.kind, x.shortTerm, x.longTerm], ["full", 0, 0], "année en texte, sans cession");
});

test("151 septies : seuils lus dans la règle (exonération totale jusqu'au seuil, même si la formule donnerait moins)", () => {
  const years = (m24, m25) => [inv([["2024-06-30", m24]], franchise), inv([["2025-06-30", m25]], franchise)];
  const odd = Object.assign({}, R, { plus_values_exoneration_151_septies: Object.assign({}, R.plus_values_exoneration_151_septies,
    { services_bnc: { full_up_to: 90000, partial_below: 126000, divisor: 50000 } }) });
  let x = E.exemption151(years(90000, 90000), 2026, { shortTerm: 1000, longTerm: 0 }, odd);
  assert.deepEqual([x.kind, x.rate, x.shortTerm], ["full", 1, 1000], "au seuil : totale, pas (126 000 − 90 000) / 50 000");
  x = E.exemption151(years(100000, 100000), 2026, { shortTerm: 1000, longTerm: 0 }, odd);
  assert.deepEqual([x.kind, x.rate, x.shortTerm], ["partial", 0.52, 520], "diviseur lu dans la règle");
});

test("151 septies : une année sans encaissement enregistré → estimation à établir", () => {
  const D = { shortTerm: 3000, longTerm: 1000 };
  let x = E.exemption151([inv([["2025-06-30", 50000]], franchise)], 2026, D, R);
  assert.deepEqual([x.kind, x.average, x.rate, x.shortTerm, x.longTerm], [null, null, null, null, null]);
  assert.deepEqual(x.receipts.map((r) => r.count), [0, 1]);
  x = E.exemption151([inv([["2024-06-30", 50000]], franchise)], 2026, D, R);
  assert.equal(x.kind, null, "2025 manquante");
  x = E.exemption151([inv([["2024-06-30", 50000]], franchise), inv([["2025-06-30", 0]], franchise)], 2026, D, R);
  assert.deepEqual([x.kind, x.average], ["full", 25000], "encaissement nul enregistré : l'année est connue");
});
