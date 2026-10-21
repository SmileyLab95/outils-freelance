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

test("sole trader avec un salaire : impôt dû sur le bénéfice seulement, PAYE compté dans le test des 80 %", () => {
  // Salaire 30 000 £ + bénéfice 20 000 £ = 50 000 £ : impôt total 7 486 ; sur le salaire seul 20 % × 17 430 = 3 486 ;
  // dû sur le bénéfice 4 000 (20 % × 20 000). Class 4 sur le bénéfice : 6 % × (20 000 − 12 570) = 445,80.
  const r = uk.soleTrader({ profit: 20000, salary: 30000, region: "ruk" }, R);
  near(r.incomeTax, 4000, "7 486 − 3 486");
  near(r.salaryTax, 3486, "impôt sur le salaire");
  near(r.class4, 445.8, "Class 4 sur le bénéfice seul");
  near(r.total, 4445.8, "total dû sur le bénéfice");
  assert.equal(r.marginal, 0.2);
  // Facture de 4 445,80 £ et 3 486 £ prélevés : 44 % à la source, moins de 80 % → acomptes de 2 222,90 £.
  assert.equal(r.paymentsOnAccount.required, true);
  near(r.paymentsOnAccount.each, 2222.9, "50 % de 4 445,80");
  // Bénéfice qui passe dans la tranche à 40 % : salaire 45 000 + bénéfice 10 000 = 55 000 £.
  // Impôt total 7 540 + 40 % × 4 730 = 9 432 ; salaire seul 20 % × 32 430 = 6 486 ; dû 2 946.
  const h = uk.soleTrader({ profit: 10000, salary: 45000, region: "ruk" }, R);
  near(h.incomeTax, 2946, "5 270 £ à 20 % puis 4 730 £ à 40 %");
  near(h.class4, 0, "bénéfice sous le seuil de la Class 4");
  assert.equal(h.paymentsOnAccount.required, true, "2 946 £ de facture, 6 486 £ prélevés : 69 %");
  // Sans salaire : identique au calcul précédent.
  const a = uk.soleTrader({ profit: 50000, region: "ruk" }, R), b = uk.soleTrader({ profit: 50000, salary: 0, region: "ruk" }, R);
  assert.deepEqual(a, b);
  assert.equal(a.salaryTax, 0);
});

test("payments on account : l'impôt prélevé sur le salaire peut les rendre inutiles (test des 80 %)", () => {
  // Salaire 100 000 £ + bénéfice 6 000 £ : impôt total (allocation réduite à 9 570 £) 7 540 + 40 % × 58 730 = 31 032 ;
  // sur le salaire 27 432 ; dû 3 600 £ ; 27 432 ÷ 31 032 = 88 % prélevé à la source → pas d'acompte.
  const r = uk.soleTrader({ profit: 6000, salary: 100000, region: "ruk" }, R);
  near(r.incomeTax, 3600, "impôt dû sur le bénéfice");
  near(r.salaryTax, 27432, "impôt prélevé sur le salaire");
  assert.equal(r.paymentsOnAccount.required, false);
});

test("pages britanniques : chiffres du texte repris des règles, exemples recalculés par le moteur", () => {
  const read = (f) => readFileSync(new URL("../../content/uk/" + f, import.meta.url), "utf8");
  const page = read("how-much-to-set-aside-for-tax.html"), taxPage = read("self-employed-tax-calculator.html");
  const money = (n) => "£" + n.toLocaleString("en-GB");
  const pc = (r) => Math.round(r * 1000) / 10 + "%";
  const higher = R.personal_allowance + R.basic_rate_limit;
  assert.equal(higher, R.higher_rate_threshold_gross);
  for (const s of [`20% above the ${money(R.personal_allowance)} Personal Allowance and 40% above ${money(higher)}`,
    `${pc(R.class4_main_rate)} on profits between ${money(R.class4_lower_profits_limit)} and ${money(R.class4_upper_profits_limit)}, then ${pc(R.class4_additional_rate)} above`,
    `under ${money(R.payments_on_account_threshold)} or ${pc(R.payments_on_account_source_deduction_test)} or more of your tax was taken at source`,
    `goes over ${money(R.vat_registration_threshold)} in any rolling 12-month period`, `At the ${pc(R.vat_standard_rate)} standard rate, that's one sixth`,
    `pay me ${pc(R.vat_standard_rate)} VAT on top`]) {
    assert.ok(page.includes(s), s);
  }
  assert.ok(Math.abs(R.vat_standard_rate / (1 + R.vat_standard_rate) - 1 / 6) < 1e-12, "un sixième d'un paiement TTC à 20 %");
  const ex = (p) => pc(uk.soleTrader({ profit: p, region: "ruk" }, R).effectiveRate);
  assert.ok(page.includes(`about ${ex(30000)} of a £30,000 profit, ${ex(50000)} of £50,000 and ${ex(100000)} of £100,000`), "exemples de la page");
  assert.ok(taxPage.includes(`about ${ex(50000)} of a £50,000 profit and ${ex(100000)} of £100,000`), "exemples du calculateur d'impôt");
  assert.equal(JSON.parse(page.match(/<!--(\{.*?\})-->/s)[1]).id, "set-aside");
});
