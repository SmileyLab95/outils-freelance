// Tests du moteur commun d'impôt sur le revenu (France, une part). Valeurs attendues calculées à la main.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const IR = require("../../src/assets/engines/ir-fr.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const near = (a, e, label) => assert.ok(Math.abs(a - e) < 0.005, `${label} : ${a} ≠ ${e}`);

test("décote : zone d'application, décote supérieure à l'impôt, au-delà du seuil", () => {
  // 20 000 € : (20 000 − 11 600) × 11 % = 924 € ; décote 897 − 45,25 % × 924 = 478,89 € ; impôt 445,11 €.
  const a = IR.incomeTax(20000, R);
  near(a.raw, 924, "impôt avant décote");
  near(a.decote, 478.89, "décote");
  near(a.tax, 445.11, "impôt");
  // 15 000 € : 374 € avant décote ; décote 897 − 169,24 = 727,76 € > 374 € → impôt nul.
  const b = IR.incomeTax(15000, R);
  near(b.decote, 374, "décote limitée à l'impôt");
  assert.equal(b.tax, 0);
  // 30 000 € : 1 977,69 + 421 × 30 % = 2 103,99 € ≥ 1 982 € → pas de décote.
  const c = IR.incomeTax(30000, R);
  assert.equal(c.decote, 0);
  near(c.tax, 2103.99, "impôt sans décote");
  assert.equal(IR.incomeTax(-5, R).tax, 0);
});

test("déduction de 10 % : taux, minimum de 509 € sans dépasser le salaire, plafond de 14 555 €", () => {
  near(IR.salaryDeduction(30000, R), 3000, "10 %");
  near(IR.salaryDeduction(3000, R), 509, "minimum");
  near(IR.salaryDeduction(400, R), 400, "pas plus que le salaire");
  near(IR.salaryDeduction(200000, R), 14555, "plafond");
  assert.equal(IR.salaryDeduction(-1, R), 0);
});
