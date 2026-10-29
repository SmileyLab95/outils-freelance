// Pénalités de retard entre professionnels (documentation/41-penalites-de-retard.md) : semestres, taux officiels de
// chaque semestre, découpage du retard, calcul, page du calculateur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ruleValues, ruleEntries } from "./regles.mjs";

const require = createRequire(import.meta.url);
const L = require("../../src/assets/engines/retard-fr.js");
const R = ruleValues("fr");
const base = { amount: 1800, method: "legal", rate: null, fee: true };
const calc = (input, rules = R) => L.compute({ ...base, ...input }, rules);

// ------------------------------------------------------------------------------------------------------------
// Semestres et taux

test("semestres : premier jusqu'au 30 juin, second dès le 1er juillet ; libellés", () => {
  assert.equal(L.semester("2026-01-01"), "2026-S1");
  assert.equal(L.semester("2026-06-30"), "2026-S1");
  assert.equal(L.semester("2026-07-01"), "2026-S2");
  assert.equal(L.semester("2026-12-31"), "2026-S2");
  assert.equal(L.semesterLabel("2026-S2"), "second semestre 2026");
  assert.equal(L.semesterLabel("2015-S1"), "premier semestre 2015");
});

test("taux de 2026 : chiffres des fiches officielles (8,25 %, 12,15 %, 12,40 %)", () => {
  assert.deepEqual(L.rates(R, "2026-10-29"), { semester: "2026-S2", legal: 0.0275, minPenalty: 0.0825, bce: 0.024, defaultPenalty: 0.124 });
  assert.deepEqual(L.rates(R, "2026-03-01"), { semester: "2026-S1", legal: 0.0262, minPenalty: 0.0786, bce: 0.0215, defaultPenalty: 0.1215 });
  assert.deepEqual(L.rates(R, "2027-01-15"), { semester: "2027-S1", legal: null, minPenalty: null, bce: null, defaultPenalty: null }, "pas encore publié");
  assert.deepEqual(L.rates(R, "2014-12-31"), { semester: "2014-S2", legal: null, minPenalty: null, bce: null, defaultPenalty: null }, "avant les tables");
  const blank = L.rates({ ...R, taux_bce_refinancement: { "2027-S1": null } }, "2027-02-01");
  assert.equal(blank.bce, null, "taux réservé mais pas encore saisi");
  assert.equal(blank.defaultPenalty, null);
  const E = ruleEntries("fr");
  assert.match(E.taux_interet_legal.note, /8,25 %/);
  assert.match(E.taux_bce_refinancement.note, /12,15 %/);
  assert.match(E.taux_bce_refinancement.note, /12,40 %/);
  assert.ok(!("taux_bce_refinancement_2026_01_01" in R) && !("taux_bce_refinancement_2026_07_01" in R), "une seule règle pour les taux de la BCE");
});

test("tables officielles : 24 semestres consécutifs, de 2015 à 2026, valeurs plausibles", () => {
  const expected = [];
  for (let y = 2015; y <= 2026; y++) expected.push(`${y}-S1`, `${y}-S2`);
  assert.deepEqual(Object.keys(R.taux_interet_legal).sort(), expected);
  assert.deepEqual(Object.keys(R.taux_bce_refinancement).sort(), expected);
  for (const s of expected) {
    const legal = R.taux_interet_legal[s], bce = R.taux_bce_refinancement[s];
    assert.ok(legal.autres > 0 && legal.autres < legal.particuliers && legal.particuliers < 0.1, `intérêt légal ${s}`);
    assert.ok(bce >= 0 && bce < 0.06, `BCE ${s}`);
  }
  // Quelques lignes des tableaux officiels (F783 ; BCE, dates d'effet 21/12/2022, 21/06/2023, 12/06/2024, 11/06/2025).
  assert.deepEqual(R.taux_interet_legal["2015-S1"], { particuliers: 0.0406, autres: 0.0093 });
  assert.deepEqual(R.taux_interet_legal["2024-S1"], { particuliers: 0.0801, autres: 0.0507 });
  assert.deepEqual(R.taux_interet_legal["2025-S2"], { particuliers: 0.0665, autres: 0.0276 });
  assert.equal(R.taux_bce_refinancement["2016-S1"], 0.0005);
  assert.equal(R.taux_bce_refinancement["2016-S2"], 0);
  assert.equal(R.taux_bce_refinancement["2022-S2"], 0, "hausse du 27/07/2022 : après le 1er juillet");
  assert.equal(R.taux_bce_refinancement["2023-S1"], 0.025);
  assert.equal(R.taux_bce_refinancement["2023-S2"], 0.04);
  assert.equal(R.taux_bce_refinancement["2024-S2"], 0.0425);
  assert.equal(R.taux_bce_refinancement["2025-S2"], 0.0215, "« inchangé depuis le 2e semestre 2025 » (F23211)");
  assert.deepEqual(L.rates(R, "2016-08-01").defaultPenalty, 0.1, "BCE à 0 % : 10 %");
});

// ------------------------------------------------------------------------------------------------------------
// Découpage du retard

test("découpage : du lendemain de l'échéance au jour du paiement compris", () => {
  assert.deepEqual(L.periods("2026-10-01", "2026-10-01"), [], "payé le jour de l'échéance");
  assert.deepEqual(L.periods("2026-10-01", "2026-09-20"), [], "payé avant");
  assert.deepEqual(L.periods("", "2026-10-01"), [], "sans échéance");
  assert.deepEqual(L.periods("2026-10-01", "1er octobre"), [], "date illisible");
  assert.deepEqual(L.periods("2026-10-01", "2026-10-02"), [{ semester: "2026-S2", from: "2026-10-02", to: "2026-10-02", days: 1 }]);
  assert.deepEqual(L.periods("2026-06-30", "2026-07-01"), [{ semester: "2026-S2", from: "2026-07-01", to: "2026-07-01", days: 1 }],
    "échéance le 30 juin : le retard commence au second semestre");
  assert.deepEqual(L.periods("2026-06-29", "2026-06-30"), [{ semester: "2026-S1", from: "2026-06-30", to: "2026-06-30", days: 1 }]);
  assert.deepEqual(L.periods("2026-06-20", "2026-07-10"), [
    { semester: "2026-S1", from: "2026-06-21", to: "2026-06-30", days: 10 },
    { semester: "2026-S2", from: "2026-07-01", to: "2026-07-10", days: 10 },
  ]);
});

test("découpage sur plusieurs années : années bissextiles, total = jours entre les deux dates", () => {
  const p = L.periods("2023-12-31", "2026-01-01");
  assert.deepEqual(p.map((x) => x.semester), ["2024-S1", "2024-S2", "2025-S1", "2025-S2", "2026-S1"]);
  assert.deepEqual(p.map((x) => x.days), [182, 184, 181, 184, 1], "2024 : 29 février compris");
  assert.equal(p.reduce((s, x) => s + x.days, 0), 732);
  assert.equal(calc({ due: "2023-12-31", paid: "2026-01-01" }).days, 732);
  // An 26 : pas confondu avec 1926 (Date.UTC ajoute 1900 aux années 0 à 99).
  assert.deepEqual(L.periods("0026-06-29", "0026-07-01").map((x) => x.semester), ["0026-S1", "0026-S2"]);
});

// ------------------------------------------------------------------------------------------------------------
// Calcul

test("calcul : exemple de la fiche F783 refait (2 000 € × 3,11 % × 29 jours ÷ 365 = 4,94 €)", () => {
  const r = calc({ amount: 2000, method: "cgv", rate: 0.0311, due: "2020-09-01", paid: "2020-09-30", fee: false });
  assert.equal(r.days, 29);
  assert.equal(r.penalties, 4.94);
  assert.equal(r.total, 4.94);
});

test("calcul : trois fois le taux légal du semestre, indemnité lue dans les règles", () => {
  const r = calc({ due: "2026-09-14", paid: "2026-10-29" });
  assert.equal(r.days, 45);
  assert.equal(r.rate, 0.0825);
  assert.equal(r.uniform, true);
  assert.equal(r.penalties, 18.31, "1 800 × 8,25 % × 45 ÷ 365 = 18,308");
  assert.equal(r.fee, R.indemnite_forfaitaire_recouvrement);
  assert.equal(r.total, 58.31);
  assert.equal(r.error, null);
  assert.equal(calc({ due: "2026-09-14", paid: "2026-10-29" }, { ...R, indemnite_forfaitaire_recouvrement: 50 }).fee, 50, "pas de 40 écrit en dur");
  assert.equal(calc({ due: "2026-09-14", paid: "2026-10-29", fee: false }).fee, 0);
  assert.equal(calc({ due: "2026-10-29", paid: "2026-10-29" }).fee, 0, "pas de retard, pas d'indemnité");
});

test("calcul : chaque semestre à son taux, total = somme des lignes arrondies ; un seul taux, un seul calcul", () => {
  const r = calc({ method: "bce", due: "2026-06-20", paid: "2026-07-10" });
  assert.deepEqual(r.periods.map((p) => [p.rate, p.penalties]), [[0.1215, 5.99], [0.124, 6.12]]);
  assert.equal(r.uniform, false);
  assert.equal(r.rate, null);
  assert.equal(r.penalties, 12.11);
  assert.equal(r.total, 52.11);
  const legal = calc({ due: "2025-12-01", paid: "2026-08-01" });
  assert.deepEqual(legal.periods.map((p) => p.rate), [0.0828, 0.0786, 0.0825], "2,76 %, 2,62 %, 2,75 % × 3");
  assert.equal(legal.penalties, Math.round(legal.periods.reduce((s, p) => s + p.penalties, 0) * 100) / 100);
  // Même taux sur plusieurs semestres : un seul calcul (1 800 × 6 % × 1 338 ÷ 365 = 395,904), pas 395,89 (somme des lignes).
  const own = calc({ method: "cgv", rate: 0.06, due: "2023-03-01", paid: "2026-10-29" });
  assert.equal(own.periods.length, 8);
  assert.equal(own.penalties, 395.9);
  const flat = calc({ method: "bce", due: "2017-01-01", paid: "2022-06-30" });
  assert.equal(flat.uniform, true, "BCE à 0 % de 2016 à mi-2022 : 10 % sur tout le retard");
  assert.equal(flat.rate, 0.1);
});

test("calcul : un taux saisi remplace le taux officiel sur tout le retard", () => {
  const legal = calc({ due: "2026-06-20", paid: "2026-07-10", rate: 0.03 });
  assert.deepEqual(legal.periods.map((p) => p.rate), [0.09, 0.09]);
  assert.equal(legal.uniform, true);
  const bce = calc({ method: "bce", due: "2026-06-20", paid: "2026-07-10", rate: 0.024 });
  assert.equal(bce.rate, 0.124);
  const own = calc({ method: "cgv", due: "2026-06-20", paid: "2026-07-10", rate: 0.15 });
  assert.equal(own.rate, 0.15);
  assert.deepEqual(own.below, []);
});

test("calcul : semestre absent des règles, signalé ; un taux saisi le remplace", () => {
  const next = calc({ due: "2026-12-20", paid: "2027-01-10" });
  assert.equal(next.error, "rates_unknown");
  assert.deepEqual(next.missing, ["2027-S1"]);
  assert.ok(Number.isNaN(next.penalties) && Number.isNaN(next.total));
  assert.equal(next.fee, 40, "l'indemnité reste due");
  assert.equal(next.periods[0].rate, 0.0825, "le semestre connu garde son taux");
  assert.deepEqual(calc({ method: "bce", due: "2014-12-01", paid: "2015-01-10" }).missing, ["2014-S2"]);
  const bad = calc({ due: "2026-12-20", paid: "2027-01-10", rate: NaN });
  assert.equal(bad.error, "rate_invalid", "le taux illisible est signalé d'abord");
  assert.deepEqual(bad.missing, []);
  const typed = calc({ due: "2026-12-20", paid: "2027-01-10", rate: 0.0275 });
  assert.equal(typed.error, null);
  assert.deepEqual(typed.missing, []);
  assert.ok(typed.penalties > 0);
});

test("calcul : taux illisible, négatif ou manquant ; montant illisible ; pas de retard", () => {
  assert.equal(calc({ due: "2026-09-14", paid: "2026-10-29", rate: NaN }).error, "rate_invalid");
  assert.equal(calc({ method: "cgv", due: "2026-09-14", paid: "2026-10-29", rate: -0.01 }).error, "rate_invalid");
  const none = calc({ method: "cgv", due: "2026-09-14", paid: "2026-10-29", rate: null });
  assert.equal(none.error, "rate_missing");
  assert.ok(Number.isNaN(none.penalties));
  assert.equal(none.fee, 40);
  const onTime = calc({ method: "cgv", due: "2026-10-29", paid: "2026-10-29", rate: null });
  assert.equal(onTime.error, null, "sans retard, le taux n'est pas demandé");
  assert.equal(onTime.penalties, 0);
  assert.equal(onTime.total, 0);
  assert.ok(Number.isNaN(calc({ amount: NaN, due: "2026-09-14", paid: "2026-10-29" }).penalties));
  assert.ok(Number.isNaN(calc({ amount: NaN, due: "2026-10-29", paid: "2026-10-29" }).penalties), "montant illisible, même sans retard");
  assert.ok(Number.isNaN(calc({ amount: -100, due: "2026-09-14", paid: "2026-10-29" }).penalties), "montant négatif");
  assert.equal(calc({ amount: 0, due: "2026-09-14", paid: "2026-10-29" }).total, 40);
  assert.ok(Number.isNaN(calc({ due: "", paid: "2026-10-29" }).days));
  assert.equal(calc({ due: "2026-11-01", paid: "2026-10-29" }).days, 0, "payé avant l'échéance");
});

test("calcul : taux des conditions inférieur au minimum légal du semestre", () => {
  const low = calc({ method: "cgv", rate: 0.05, due: "2026-06-20", paid: "2026-07-10" });
  assert.deepEqual(low.below, [{ semester: "2026-S1", min: 0.0786 }, { semester: "2026-S2", min: 0.0825 }]);
  assert.equal(low.rate, 0.05, "le calcul garde le taux saisi");
  assert.deepEqual(calc({ method: "cgv", rate: 0.0825, due: "2026-09-14", paid: "2026-10-29" }).below, [], "égal au minimum");
  assert.deepEqual(calc({ method: "cgv", rate: 0.08, due: "2026-09-14", paid: "2026-10-29" }).below, [{ semester: "2026-S2", min: 0.0825 }]);
  assert.deepEqual(calc({ method: "legal", due: "2026-09-14", paid: "2026-10-29" }).below, [], "seulement pour le taux des conditions");
  assert.deepEqual(calc({ method: "legal", rate: 0.0275, due: "2026-09-14", paid: "2026-10-29" }).below, [], "taux légal saisi : pas comparé au minimum");
});

// ------------------------------------------------------------------------------------------------------------
// Page du calculateur

const html = readFileSync(new URL("../../content/fr/penalites-de-retard.html", import.meta.url), "utf8");
const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
const script = readFileSync(new URL("../../src/assets/tools/penalites.js", import.meta.url), "utf8");
const pct = (x) => (Math.round(x * 10000) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " %";

test("page : scripts, règles, sources, choix par défaut cohérent avec nos factures", () => {
  assert.deepEqual(front.scripts, ["engines/retard-fr.js", "tools/penalites.js"]);
  assert.equal(front.rules, "fr");
  for (const key of front.sources) assert.ok(key in R, `source ${key}`);
  for (const key of ["taux_interet_legal", "taux_bce_refinancement", "indemnite_forfaitaire_recouvrement"]) assert.ok(front.sources.includes(key));
  const options = [.../<select id="p-method"[\s\S]*?<\/select>/.exec(html)[0].matchAll(/<option value="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(options, ["legal", "bce", "cgv"], "trois fois le taux légal d'abord");
  const invoice = readFileSync(new URL("../../content/fr/generateur-facture.html", import.meta.url), "utf8");
  assert.match(invoice, /id="f-penalty" name="penalty" value="trois fois le taux d'intérêt légal"/, "mention par défaut de nos factures");
  for (const id of ["p-legal", "p-bce", "p-rate", "p-method"]) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-describedby="${id}-hint"`), `aide reliée à ${id}`);
    assert.ok(html.includes(`id="${id}-hint"`));
  }
  assert.match(html, /class="result-hero" role="status"/);
});

test("page : chiffres de la FAQ = règles ; aucun montant ni taux écrit dans le script", () => {
  const faq = JSON.stringify(front.faq);
  const r = L.rates(R, "2026-10-29");
  assert.ok(faq.includes(pct(r.minPenalty)) && faq.includes(pct(r.defaultPenalty)), "8,25 % et 12,40 % au second semestre 2026");
  assert.ok(faq.includes("second semestre 2026"));
  assert.ok(faq.includes(`${R.indemnite_forfaitaire_recouvrement} €`));
  assert.ok(html.includes("depuis 2015") && Object.keys(R.taux_interet_legal).sort()[0] === "2015-S1", "« taux officiels depuis 2015 »");
  const code = script.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "").replace(/"(?:[^"\\]|\\.)*"/g, '""');   // sans commentaires ni textes
  assert.ok(!/\b40\b|[*+]\s*(3|10|0\.1)\b|\b(3|10)\s*\*/.test(code), "indemnité, « 3 × » et « + 10 points » : règles et moteur");
  assert.ok(front.title.length <= 60 && front.description.length <= 160);
});
