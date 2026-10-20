// Tests du moteur PER (France). Valeurs attendues calculées à la main.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const per = require("../../src/assets/engines/per-fr.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const near = (a, e, label) => assert.ok(Math.abs(a - e) < 0.01, `${label} : ${a} ≠ ${e}`);

test("plafond TNS : 10 % du bénéfice + 15 % entre 1 et 8 PASS, minimum et maximum", () => {
  near(per.ceilingTNS(60000, 48060, R), 6000 + 0.15 * (60000 - 48060), "60 000 € de bénéfice");
  near(per.ceilingTNS(30000, 48060, R), 4806, "minimum 10 % du PASS");
  near(per.ceilingTNS(1e6, 48060, R), 88911, "maximum 2026");
});

test("plafond général (micro-entrepreneur) : 10 % des revenus, entre 4 710 € et 37 680 €", () => {
  near(per.ceilingGeneral(60000, 47100, R), 6000, "60 000 €");
  near(per.ceilingGeneral(20000, 47100, R), 4710, "minimum");
  near(per.ceilingGeneral(500000, 47100, R), 37680, "maximum");
});

test("réel, 60 000 € de bénéfice, versement de 5 000 € : économie au taux de 30 %", () => {
  const r = per.simulate({ regime: "real", revenue: 60000, parts: 1, contribution: 5000 }, R);
  near(r.saving, 1500, "économie d'impôt");
  near(r.cost, 3500, "effort réel");
  assert.equal(r.marginal, 0.3);
});

test("micro BNC, 50 000 € de CA : revenu après abattement de 34 %, plafond limité", () => {
  const r = per.simulate({ regime: "micro", activity: "liberal_bnc", revenue: 50000, parts: 1, contribution: 10000 }, R);
  near(r.professional, 33000, "revenu imposable");
  near(r.ceiling, 4710, "plafond : 10 % de 33 000 € < minimum 4 710 €");
  near(r.deducted, 4710, "versement déductible");
  // 33 000 → 28 290 € : 30 % sur 3 421 € (33 000 − 29 579) puis 11 % sur le reste (1 289 €)
  near(r.saving, 3421 * 0.3 + 1289 * 0.11, "économie d'impôt");
});
