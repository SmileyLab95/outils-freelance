// Tests du comparateur de statuts (France). Valeurs attendues calculées à la main.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const st = require("../../src/assets/engines/statuts-fr.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const near = (a, e, label) => assert.ok(Math.abs(a - e) < 0.01, `${label} : ${a} ≠ ${e}`);

test("barème de l'impôt sur le revenu, une part", () => {
  // 39 600 € : 11 % × 17 979 + 30 % × 10 021
  near(st.incomeTax(39600, R), 1977.69 + 3006.3, "impôt");
  near(st.incomeTax(11000, R), 0, "sous le seuil");
});

test("micro-entreprise libérale, 60 000 € de CA, 5 000 € de dépenses", () => {
  const r = st.micro({ activity: "liberal_bnc", revenue: 60000, expenses: 5000 }, R);
  near(r.social, 60000 * 0.258, "cotisations 25,6 % + CFP 0,2 %");
  near(r.tax, 4983.99, "impôt sur 60 000 × 66 %");
  near(r.available, 60000 - 5000 - 15480 - 4983.99, "revenu disponible");
});

test("entreprise au réel : cotisations TNS à 45 % du revenu net", () => {
  const r = st.realRegime({ revenue: 60000, expenses: 5000, tnsRate: 0.45 }, R);
  near(r.available, 55000 / 1.45 - (1977.69 + (55000 / 1.45 - 29579) * 0.3), "revenu disponible");
});

test("SASU : tout en dividendes ou tout en salaire", () => {
  const div = st.sasu({ revenue: 60000, expenses: 5000, salaryShare: 0, sasuCoef: 1.82 }, R);
  near(div.is, 42500 * 0.15 + 12500 * 0.25, "IS 15 % puis 25 %");
  near(div.available, (55000 - 9500) * (1 - 0.314), "dividendes après PFU 31,4 %");
  const sal = st.sasu({ revenue: 60000, expenses: 5000, salaryShare: 1, sasuCoef: 1.82 }, R);
  const net = 55000 / 1.82;
  near(sal.available, net - (net * 0.9 - 11600) * 0.11, "salaire net après impôt");
});
