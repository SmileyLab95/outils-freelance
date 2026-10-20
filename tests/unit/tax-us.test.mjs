// Tests du moteur fiscal américain. Les valeurs attendues sont calculées à la main (détail en commentaire)
// avec les règles 2026 de data/rules/us.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const tax = require("../../src/assets/engines/tax-us.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/us.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 0.01, `${label} : ${actual} ≠ ${expected}`);

test("célibataire, 80 000 $ de bénéfice : SE tax, QBI limitée, impôt fédéral", () => {
  const r = tax.estimate({ profit: 80000, status: "single" }, R);
  // 80 000 × 92,35 % = 73 880 ; 12,4 % = 9 161,12 ; 2,9 % = 2 142,52
  near(r.se.earnings, 73880, "revenu net d'activité");
  near(r.se.socialSecurity, 9161.12, "Social Security");
  near(r.se.medicare, 2142.52, "Medicare");
  near(r.se.total, 11303.64, "SE tax");
  near(r.se.deduction, 5651.82, "moitié déductible");
  // AGI 74 348,18 − 16 100 = 58 248,18 ; QBI 20 % × 74 348,18 = 14 869,64 limité à 20 % × 58 248,18 = 11 649,64
  near(r.agi, 74348.18, "AGI");
  near(r.qbiDeduction, 11649.636, "déduction QBI");
  near(r.taxable, 46598.544, "revenu imposable");
  // 10 % × 12 400 + 12 % × 34 198,544 = 1 240 + 4 103,83
  near(r.incomeTax, 5343.82528, "impôt fédéral");
  assert.equal(r.marginalRate, 0.12);
  near(r.additionalMedicare, 0, "Additional Medicare");
  near(r.federal, 16647.46528, "total fédéral");
});

test("salarié 150 000 $ + 50 000 $ d'activité : plafond Social Security partagé", () => {
  const se = tax.selfEmployment(50000, 150000, R);
  // Reste du plafond : 184 500 − 150 000 = 34 500 ; 12,4 % = 4 278 ; Medicare 2,9 % × 46 175 = 1 339,075
  near(se.socialSecurity, 4278, "Social Security plafonnée");
  near(se.medicare, 1339.075, "Medicare");
  // Seuil 200 000 − 150 000 = 50 000 > 46 175 : pas d'Additional Medicare
  near(tax.additionalMedicare(se.earnings, 150000, "single", R), 0, "Additional Medicare");
});

test("moins de 400 $ de revenu net d'activité : pas de SE tax", () => {
  near(tax.selfEmployment(400, 0, R).total, 0, "SE tax"); // 400 × 92,35 % = 369,40
});

test("300 000 $ : Additional Medicare Tax au-delà de 200 000 $", () => {
  const r = tax.estimate({ profit: 300000, status: "single" }, R);
  near(r.additionalMedicare, 693.45, "0,9 % × (277 050 − 200 000)");
  near(r.se.socialSecurity, 22878, "Social Security au plafond");
});

test("couple, 60 000 $ : déduction forfaitaire et barème des couples", () => {
  const r = tax.estimate({ profit: 60000, status: "married_filing_jointly" }, R);
  // SE 15,3 % × 55 410 = 8 477,73 ; AGI 55 761,135 ; imposable avant QBI 23 561,135 ; QBI 4 712,227
  near(r.se.total, 8477.73, "SE tax");
  near(r.taxable, 18848.908, "revenu imposable");
  near(r.incomeTax, 1884.8908, "10 % du revenu imposable");
});

test("déduction QBI dans la zone de transition", () => {
  // Revenu imposable avant QBI : seuil + la moitié de la zone (37 500 $) ; QBI 200 000 $
  const taxable = R.qbi_threshold_2026.single + 37500;
  near(tax.qbi(200000, taxable, "single", false, R), 20000, "activité ordinaire : 40 000 × 50 %");
  near(tax.qbi(200000, taxable, "single", true, R), 10000, "SSTB : 40 000 × 50 % × 50 %");
  near(tax.qbi(200000, R.qbi_phase_in_end_2026.single + 1, "single", true, R), 0, "SSTB au-delà de la zone");
});

test("acomptes : la règle de l'année précédente quand elle est plus favorable", () => {
  const q = tax.quarterly(16647.47, 0, 12000, 60000, "single", R);
  near(q.required, 12000, "100 % de l'impôt de l'année précédente");
  near(q.perQuarter, 3000, "par trimestre");
  assert.equal(q.rule, "prior");
  const high = tax.quarterly(16647.47, 0, 12000, 200000, "single", R);
  near(high.required, 13200, "110 % au-delà de 150 000 $ d'AGI");
  const none = tax.quarterly(800, 0, null, 0, "single", R);
  assert.equal(none.needed, false, "moins de 1 000 $ dus : pas d'acompte");
  assert.deepEqual(q.dueDates, ["2026-04-15", "2026-06-15", "2026-09-15", "2027-01-15"]);
});

test("bénéfice nécessaire pour un revenu net visé (inverse)", () => {
  const p = tax.profitForTakeHome(80000 - 16647.46528, { status: "single" }, R);
  assert.ok(Math.abs(p - 80000) < 0.05, `bénéfice retrouvé : ${p}`);
});

test("cotisation retraite de 10 000 $ (SEP-IRA) : AGI et QBI réduits, SE tax inchangée", () => {
  const base = tax.estimate({ profit: 80000, status: "single" }, R);
  const r = tax.estimate({ profit: 80000, status: "single", retirement: 10000 }, R);
  assert.equal(r.se.total, base.se.total);
  // AGI 64 348,18 ; QBI = 20 % × 48 248,18 = 9 649,64 ; imposable 38 598,54 → 1 240 + 12 % × 26 198,54
  near(r.taxable, 38598.54, "revenu imposable");
  near(r.incomeTax, 1240 + 0.12 * 26198.54, "impôt fédéral");
  near(base.total - r.total, 960, "économie : 10 000 × 12 % × 80 % (effet QBI)");
});
