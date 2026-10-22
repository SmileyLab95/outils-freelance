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

test("Québec, 60 000 $ : RRQ, RQAP (déduction et crédit fédéral), abattement de 16,5 %, déduction pour travailleur", () => {
  const r = ca.estimate({ profit: 60000, province: "QC" }, R, P);
  // RRQ : 56 500 × 12,6 % = 7 119 ; déduction 56 500 × 7,3 % = 4 124,50 ; crédit fédéral 56 500 × 5,3 % = 2 994,50
  near(r.pensions.total, 7119, "RRQ");
  // RQAP : 60 000 × 0,764 % = 458,40, dont 60 000 × (0,764 % − 0,430 %) = 200,40 déductibles, 258 au crédit fédéral
  near(r.qpip, 458.4, "RQAP 0,764 %");
  near(r.qpipDeduction, 200.4, "part déductible du RQAP");
  near(r.netIncome, 55675.1, "revenu net : 60 000 − 4 124,50 − 200,40");
  // Fédéral : 14 % × 55 675,10 − 14 % × (16 452 + 2 994,50 + 258) = 5 035,884, moins l'abattement de 16,5 %
  near(r.federal, 5035.884 * 0.835, "impôt fédéral après abattement");
  // Québec : déduction pour travailleur min(1 450, 6 % × 60 000) ; 14 % × (55 675,10 − 1 450) − 14 % × 18 952
  // (aucun crédit du Québec pour le RRQ ni le RQAP)
  near(r.workersDeduction, 1450, "déduction pour travailleur plafonnée");
  near(r.provincial, 7591.514 - 2653.28, "impôt du Québec");
});

test("Québec, 20 000 $ : déduction pour travailleur de 6 %, sous le plafond", () => {
  const r = ca.estimate({ profit: 20000, province: "QC" }, R, P);
  near(r.workersDeduction, 1200, "6 % × 20 000");
  // RRQ : 16 500 × 7,3 % = 1 204,50 déductibles ; RQAP : 20 000 × 0,334 % = 66,80 ; revenu net 18 728,70 ;
  // Québec : 14 % × (18 728,70 − 1 200) = 2 454,018, moins 2 653,28 : impôt nul
  near(r.netIncome, 18728.7, "revenu net");
  assert.equal(r.provincial, 0);
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

test("acomptes au Québec : deux tests distincts, ARC (impôt fédéral) et Revenu Québec (impôt du Québec seul)", () => {
  // 24 000 $ : impôt fédéral 559 $ et impôt du Québec 283 $, sous 1 800 $ : aucun acompte, même si RRQ + RQAP
  // dépassent 2 700 $ (les cotisations ne comptent pas dans l'« impôt net à payer » de Revenu Québec).
  const low = ca.instalments(ca.estimate({ profit: 24000, province: "QC" }, R, P), R);
  assert.deepEqual([low.required, low.requiredFederal, low.requiredQuebec, low.federal, low.quebec], [false, false, false, 0, 0]);
  // 36 000 $ : impôt fédéral 2 124,91 × 0,835 = 1 774,30 $, sous le seuil ; impôt du Québec 14 % × 32 057,26 −
  // 2 653,28 = 1 834,74 $, au-dessus : acomptes à Revenu Québec seulement.
  const mid = ca.instalments(ca.estimate({ profit: 36000, province: "QC" }, R, P), R);
  assert.deepEqual([mid.required, mid.requiredFederal, mid.requiredQuebec, mid.federal], [true, false, true, 0]);
  // 40 000 $ : impôt fédéral 2 179 $ et impôt du Québec 2 352 $ : les deux ; la part de Revenu Québec couvre aussi
  // le RRQ et le RQAP.
  const r = ca.estimate({ profit: 40000, province: "QC" }, R, P), i = ca.instalments(r, R);
  assert.deepEqual([i.requiredFederal, i.requiredQuebec], [true, true]);
  near(r.federal, 2610.076 * 0.835, "impôt fédéral");
  near(r.provincial, 5005.266 - 2653.28, "impôt du Québec");
  near(i.federal, r.federal / 4, "impôt fédéral ÷ 4");
  near(i.quebec, (r.provincial + r.pensions.total + r.qpip) / 4, "impôt du Québec, RRQ et RQAP ÷ 4");
  // Hors Québec, un seul test, à l'ARC.
  const on = ca.instalments(ca.estimate({ profit: 30000, province: "ON" }, R, P), R);
  assert.deepEqual([on.requiredFederal, on.requiredQuebec, on.quebec], [true, false, 0]);
});

test("acomptes : la mesure de la jauge franchit le seuil exactement quand les acomptes deviennent obligatoires", () => {
  for (const province of ["ON", "QC", "AB", "BC"]) {
    for (let profit = 5000; profit <= 120000; profit += 2500) {
      const r = ca.estimate({ profit, province }, R, P), i = ca.instalments(r, R);
      assert.equal(i.required, i.measure > i.threshold, `${province} ${profit}`);
    }
  }
  const qc = ca.instalments(ca.estimate({ profit: 36000, province: "QC" }, R, P), R);
  assert.equal(qc.threshold, R.instalment_threshold_quebec);
  near(qc.measure, ca.estimate({ profit: 36000, province: "QC" }, R, P).provincial, "Québec : le plus élevé des deux impôts");
});

test("taxes de vente des provinces : mêmes taux que les règles générales (TPS, TVH, TVQ, TVP)", () => {
  for (const [code, p] of Object.entries(P)) {
    const t = p.sales_tax;
    if (t.type === "HST") { assert.equal(t.rate, R.hst_rates[code], code); continue; }
    assert.equal(t.gst, R.gst_rate, code);
    if (t.type === "GST") assert.equal(t.rate, R.gst_rate, code);
    else assert.ok(Math.abs(t.rate - (t.gst + t.provincial)) < 1e-12, code);
    if (t.type === "GST+QST") assert.equal(t.provincial, R.qst_rate, code);
    if (t.type === "GST+PST" || t.type === "GST+RST") assert.equal(t.provincial, R.pst_rates[code], code);
  }
  assert.deepEqual(Object.keys(R.hst_rates).sort(), Object.keys(P).filter((c) => P[c].sales_tax.type === "HST").sort());
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

test("pages « combien mettre de côté » : seuils, dates et exemples repris des règles et du moteur (anglais et français)", () => {
  const read = (f) => readFileSync(new URL("../../content/" + f, import.meta.url), "utf8").replace(/[  ]/g, " ");
  const en = read("ca/how-much-to-set-aside-for-taxes.html"), fr = read("ca-fr/combien-mettre-de-cote-impot.html");
  const ex = (prov, p) => Math.round(ca.estimate({ profit: p, province: prov }, R, P).effectiveRate * 1000) / 10;
  const frPct = (x) => String(x).replace(".", ",") + " %";
  assert.ok(en.includes(`about ${ex("ON", 50000)}% of a $50,000 profit and ${ex("ON", 100000)}% of $100,000 in Ontario`), "exemples (anglais)");
  assert.ok(fr.includes(`environ ${frPct(ex("QC", 50000))} d'un revenu net de 50 000 $ et ${frPct(ex("QC", 100000))} de 100 000 $ au Québec`), "exemples (français)");
  const usd = (n) => "$" + n.toLocaleString("en-CA"), cad = (n) => n.toLocaleString("fr-CA").replace(/\s/g, " ") + " $";
  assert.equal(R.small_supplier_threshold, R.qst_small_supplier_threshold);
  assert.ok(en.includes(`go over ${usd(R.small_supplier_threshold)} in a single calendar quarter`) && fr.includes(`dépassent ${cad(R.small_supplier_threshold)} au cours d'un seul trimestre`), "petit fournisseur");
  assert.ok(en.includes(`more than ${usd(R.instalment_threshold)} this year and was also over ${usd(R.instalment_threshold)}`) &&
    en.includes(`a ${usd(R.instalment_threshold_quebec)} test to your federal tax, and Revenu Québec its own ${usd(R.instalment_threshold_quebec)} test`) &&
    fr.includes(`dépasse ${cad(R.instalment_threshold)} cette année et dépassait aussi ${cad(R.instalment_threshold)}`) &&
    fr.includes(`un seuil de ${cad(R.instalment_threshold_quebec)} à votre impôt fédéral, et Revenu Québec son propre seuil de ${cad(R.instalment_threshold_quebec)}`), "seuils des acomptes");
  const enDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-CA", { month: "long", day: "numeric", timeZone: "UTC" });
  const frDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-CA", { day: "numeric", month: "long", timeZone: "UTC" });
  const d = R.instalment_due_dates_2026;
  assert.ok(en.includes(`on ${d.slice(0, 3).map(enDate).join(", ")} and ${enDate(d[3])}`), "dates des acomptes (anglais)");
  assert.ok(fr.includes(`le ${d.slice(0, 3).map(frDate).join(", le ")} et le ${frDate(d[3])}`), "dates des acomptes (français)");
  assert.ok(en.includes(`due on ${enDate(R.balance_due_date)}, ${R.balance_due_date.slice(0, 4)}`) && en.includes(`until ${enDate(R.filing_deadline_self_employed)}, ${R.filing_deadline_self_employed.slice(0, 4)}`), "solde et déclaration (anglais)");
  assert.ok(fr.includes(`dû le ${frDate(R.balance_due_date)} ${R.balance_due_date.slice(0, 4)}`) && fr.includes(`jusqu'au ${frDate(R.filing_deadline_self_employed)} ${R.filing_deadline_self_employed.slice(0, 4)}`), "solde et déclaration (français)");
  for (const page of [en, fr]) assert.equal(JSON.parse(page.match(/<!--(\{.*?\})-->/s)[1]).id, "set-aside");
});

test("montant personnel de base réduit : Manitoba (200 000 à 400 000 $) et Yukon (comme le fédéral)", () => {
  // Manitoba, 300 000 $ : revenu net 300 000 − 5 773,45 = 294 226,55 ; montant 15 780 × (1 − 94 226,55 ÷ 200 000)
  // = 8 345,53 ; crédits 10,8 % × (8 345,53 + 3 519,45) = 1 281,42.
  near(ca.estimate({ profit: 300000, province: "MB" }, R, P).provincialCredits, 1281.42, "Manitoba, 300 000 $");
  // Au-delà de 400 000 $ de revenu net : plus de montant de base, seul le crédit du RPC reste (10,8 % × 3 519,45).
  near(ca.estimate({ profit: 450000, province: "MB" }, R, P).provincialCredits, 380.1, "Manitoba, 450 000 $");
  // Yukon, 220 000 $ : revenu net 214 226,55 ; montant 16 452 − 1 623 × 0,42557 = 15 761,30 ; crédits 6,4 % ×
  // (15 761,30 + 3 519,45) = 1 233,97.
  near(ca.estimate({ profit: 220000, province: "YT" }, R, P).provincialCredits, 1233.97, "Yukon, 220 000 $");
  // Sous les seuils, montant entier.
  near(ca.provincialBPA(P.MB, 150000, R), 15780, "Manitoba sous 200 000 $");
});
