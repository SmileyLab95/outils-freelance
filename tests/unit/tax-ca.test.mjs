// Tests du moteur fiscal canadien (2026). Valeurs attendues calculées à la main, détail en commentaire.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const ca = require("../../src/assets/engines/tax-ca.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/ca.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const P = data.provinces;
const near = (actual, expected, label, tol = 0.01) => assert.ok(Math.abs(actual - expected) < tol, `${label} : ${actual} ≠ ${expected}`);

test("RPC d'un travailleur autonome au maximum : 8 460,90 $ + RPC2 832 $", () => {
  const p = ca.pensions(100000, false, R);
  near(p.first, 8460.9, "RPC");
  near(p.second, 832, "RPC2");
});

test("Ontario, 80 000 $ : fédéral, provincial, contribution santé", () => {
  const r = ca.estimate({ profit: 80000, province: "ON" }, R, P);
  // Gains cotisables 71 100 $ : RPC 8 460,90 ; déduction 71 100 × 6,95 % = 4 941,45 ; crédit 71 100 × 4,95 % = 3 519,45
  // RPC2 : 5 400 × 8 % = 432, déductible → revenu net 80 000 − 5 373,45 = 74 626,55
  near(r.pensions.total, 8892.9, "RPC + RPC2");
  near(r.netIncome, 74626.55, "revenu net");
  // Fédéral : 8 193,22 + 20,5 % × 16 103,55 − 14 % × (16 452 + 3 519,45)
  near(r.federal, 8193.22 + 3301.22775 - 2796.003, "impôt fédéral");
  // Ontario : 2 721,4955 + 9,15 % × 20 735,55 − 5,05 % × (12 989 + 3 519,45) ; sans surtaxe ; contribution santé 750 $
  near(r.provincial - r.healthPremium, 2721.4955 + 1897.302825 - 833.676725, "impôt de l'Ontario");
  near(r.surtax, 0, "surtaxe");
  near(r.healthPremium, 750, "contribution santé plafonnée");
  near(r.total, 8892.9 + 8698.44475 + 3785.1216 + 750, "total", 0.02);
});

test("Québec, 60 000 $ : RRQ, RQAP, abattement de 16,5 %", () => {
  const r = ca.estimate({ profit: 60000, province: "QC" }, R, P);
  // RRQ : 56 500 × 12,6 % = 7 119 ; déduction 56 500 × 7,3 % = 4 124,50 ; crédit 56 500 × 5,3 % = 2 994,50
  near(r.pensions.total, 7119, "RRQ");
  near(r.qpip, 458.4, "RQAP 0,764 %");
  // Fédéral : 14 % × 55 875,50 − 14 % × (16 452 + 2 994,50) = 5 100,06, moins l'abattement de 16,5 %
  near(r.federal, 5100.06 * 0.835, "impôt fédéral après abattement");
  // Québec : 7 608,30 + 19 % × 1 530,50 − 14 % × (18 952 + 2 994,50)
  near(r.provincial, 7608.3 + 290.795 - 3072.51, "impôt du Québec");
});

test("Alberta, 50 000 $ : crédits au taux le plus bas (8 %)", () => {
  const r = ca.estimate({ profit: 50000, province: "AB" }, R, P);
  near(r.federal, 6547.555 - 2625.525, "fédéral");
  near(r.provincial, 3741.46 - 2005.66, "Alberta");
  near(r.total, 5533.5 + 3922.03 + 1735.8, "total");
});

test("montant personnel de base fédéral dégressif", () => {
  near(ca.federalBPA(100000, R), 16452, "plein montant");
  near(ca.federalBPA(300000, R), 14829, "minimum");
  near(ca.federalBPA((181440 + 258482) / 2, R), (16452 + 14829) / 2, "à mi-chemin");
});

test("acomptes provisionnels au-delà de 3 000 $", () => {
  const r = ca.estimate({ profit: 80000, province: "ON" }, R, P);
  const i = ca.instalments(r, R);
  assert.equal(i.required, true);
  near(i.federal, (r.incomeTax + r.pensions.total) / 4, "quart de l'impôt et du RPC");
  assert.equal(ca.instalments(ca.estimate({ profit: 15000, province: "ON" }, R, P), R).required, false);
});

test("revenu visé : calcul inverse", () => {
  const target = ca.estimate({ profit: 80000, province: "ON" }, R, P).takeHome;
  const p = ca.profitForTakeHome(target, { province: "ON" }, R, P);
  assert.ok(Math.abs(p - 80000) < 0.05, `bénéfice : ${p}`);
});

test("REER de 5 000 $ en Alberta : économie au taux marginal 14 % + 8 %, RPC inchangé", () => {
  const base = ca.estimate({ profit: 50000, province: "AB" }, R, P);
  const r = ca.estimate({ profit: 50000, province: "AB", deduction: 5000 }, R, P);
  assert.equal(r.pensions.total, base.pensions.total);
  near(base.total - r.total, 5000 * (0.14 + 0.08), "économie d'impôt");
});
