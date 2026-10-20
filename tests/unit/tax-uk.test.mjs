// Tests du moteur fiscal britannique (2026/27). Valeurs attendues calculées à la main, détail en commentaire.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const uk = require("../../src/assets/engines/tax-uk.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/uk.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 0.01, `${label} : ${actual} ≠ ${expected}`);

test("sole trader, Angleterre, 50 000 £", () => {
  const r = uk.soleTrader({ profit: 50000, region: "ruk" }, R);
  near(r.incomeTax, 7486, "20 % × (50 000 − 12 570)");
  near(r.class4, 2245.8, "6 % × 37 430");
  near(r.takeHome, 40268.2, "revenu net");
  assert.equal(r.paymentsOnAccount.required, true);
  near(r.paymentsOnAccount.each, 4865.9, "50 % de 9 731,80");
});

test("sole trader, Angleterre, 60 000 £ : tranche à 40 % et Class 4 à 2 %", () => {
  const r = uk.soleTrader({ profit: 60000, region: "ruk" }, R);
  near(r.incomeTax, 11432, "7 540 + 40 % × 9 730");
  near(r.class4, 2456.6, "2 262 + 2 % × 9 730");
});

test("110 000 £ : Personal Allowance réduite à 7 570 £", () => {
  const r = uk.soleTrader({ profit: 110000, region: "ruk" }, R);
  near(r.allowance, 7570, "12 570 − 10 000 ÷ 2");
  near(r.incomeTax, 33432, "7 540 + 40 % × 64 730");
  near(r.class4, 3456.6, "2 262 + 2 % × 59 730");
});

test("Écosse, 50 000 £ : six tranches écossaises", () => {
  const r = uk.soleTrader({ profit: 50000, region: "scotland" }, R);
  // 3 967 × 19 % + 12 989 × 20 % + 14 136 × 21 % + 6 338 × 42 %
  near(r.incomeTax, 753.73 + 2597.8 + 2968.56 + 2661.96, "impôt écossais");
});

test("impôt sur les sociétés et marginal relief", () => {
  near(uk.corporationTax(40000, R), 7600, "19 %");
  near(uk.corporationTax(100000, R), 22750, "25 % × 100 000 − 150 000 × 3/200");
  near(uk.corporationTax(300000, R), 75000, "25 %");
});

test("limited company, 60 000 £, salaire de 12 570 £", () => {
  const r = uk.limitedCompany({ profit: 60000, salary: 12570, region: "ruk" }, R);
  near(r.employerNI, 1135.5, "15 % × (12 570 − 5 000)");
  near(r.employeeNI, 0, "au seuil");
  near(r.corporationTax, 8795.955, "19 % × 46 294,50");
  near(r.dividendTax, 3977.3436, "10,75 % × (37 498,55 − 500)");
  near(r.takeHome, 46091.2014, "revenu net");
});

test("dividendes à cheval sur deux tranches", () => {
  const r = uk.limitedCompany({ profit: 100000, salary: 12570, region: "ruk" }, R);
  near(r.corporationTax, 19118.0425, "marginal relief sur 86 294,50");
  // 37 200 × 10,75 % + (67 176,4575 − 37 700) × 35,75 %
  near(r.dividendTax, 3999 + 29476.4575 * 0.3575, "dividendes");
});

test("intérêts de retard : exemple officiel 5 000 £ payés 30 jours en retard", () => {
  const r = uk.latePayment(5000, 30, 0.0375, R);
  near(r.rate, 0.1175, "8 % + 3,75 %");
  near(r.interest, 48.29, "5 000 × 11,75 % × 30 ÷ 365");
  assert.equal(r.compensation, 70);
  assert.equal(uk.latePayment(999.99, 5, 0.0375, R).compensation, 40);
  assert.equal(uk.latePayment(10000, 5, 0.0375, R).compensation, 100);
  assert.equal(uk.latePayment(5000, 0, 0.0375, R).compensation, 0);
});

test("payments on account : pas d'acompte sous 1 000 £", () => {
  assert.equal(uk.paymentsOnAccount(900, 0, R).required, false);
  assert.equal(uk.paymentsOnAccount(5000, 30000, R).required, false, "plus de 80 % prélevé à la source");
});

test("bénéfice nécessaire pour 40 268,20 £ nets", () => {
  const p = uk.profitForTakeHome(40268.2, { region: "ruk" }, R);
  assert.ok(Math.abs(p - 50000) < 0.05, `bénéfice : ${p}`);
});
