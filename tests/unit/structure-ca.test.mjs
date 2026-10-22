// Tests du comparateur entreprise individuelle / société par actions (Canada, 2026). Valeurs attendues calculées à
// la main (détail en commentaire, recalculées indépendamment du code), à partir des règles de data/rules/ca.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const S = require("../../src/assets/engines/structure-ca.js");
const T = require("../../src/assets/engines/tax-ca.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/ca.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const P = data.provinces;
const near = (actual, expected, label, tol = 0.01) => assert.ok(Math.abs(actual - expected) < tol, `${label} : ${actual} ≠ ${expected}`);

test("taux provincial de 2026 : Ontario au prorata des jours, Québec selon les 5 500 heures, T.-N.-L. à 2 %", () => {
  // Ontario : 3,2 % pendant 181 jours (1er janvier – 30 juin), 2,2 % pendant 184 jours : 984 ÷ 365 = 2,69589 %.
  near(S.provincialRate("ON", R), (0.032 * 181 + 0.022 * 184) / 365, "Ontario", 1e-9);
  // Québec : sans 5 500 heures rémunérées, taux général de 11,5 % ; avec, 3,2 % (année commencée avant le 30 avril).
  assert.equal(S.provincialRate("QC", R, false), 0.115);
  assert.equal(S.provincialRate("QC", R, true), 0.032);
  assert.equal(S.provincialRate("NL", R), 0.02);
  assert.equal(S.provincialRate("MB", R), 0);
});

test("Ontario, 100 000 $, dividendes seulement : 78 498,32 $ reçus contre 71 662,13 $ en entreprise individuelle", () => {
  const r = S.compare({ province: "ON", profit: 100000 }, R, P), c = r.corp;
  // Société : 100 000 × (9 % + 2,69589 %) = 11 695,89 ; dividendes 88 304,11, majorés à 101 549,73.
  near(c.corporateTax, 11695.89, "impôt de la société");
  near(c.dividends, 88304.11, "dividendes");
  // Fédéral : 8 193,22 + 20,5 % × 43 026,73 = 17 013,70 − 14 % × 16 452 − 9,0301 % × 101 549,73 (9 170,04) = 5 540,38.
  near(c.personal.federal, 5540.38, "impôt fédéral");
  // Ontario : 2 721,50 + 9,15 % × 47 658,73 − 5,05 % × 12 989 = 6 426,32 ; surtaxe 20 % × 608,32 = 121,66 ;
  // crédit pour dividendes 2,9863 % × 101 549,73 = 3 032,58 (après la surtaxe) ; contribution-santé 750.
  near(c.personal.surtax, 121.66, "surtaxe calculée avant le crédit pour dividendes");
  near(c.personal.provincial, 6426.32 + 121.66 - 3032.58 + 750, "impôt de l'Ontario", 0.02);
  near(c.receive, 78498.32, "reçu");
  // Entreprise individuelle : RPC 9 292,90 ; fédéral 12 716,45 ; Ontario 5 578,52 + 750 ; revenu disponible 71 662,13.
  near(r.sole.takeHome, 71662.13, "entreprise individuelle");
  near(r.difference, 6836.19, "écart");
  // Dont 9 292,90 $ de RPC non versé (et aucune rente acquise) : sans le RPC, la société coûte 2 456,71 $ de plus.
  near(r.contributionsSaved, 9292.9, "cotisations non versées");
  assert.equal(r.deferred, 0);
});

test("Ontario, 150 000 $, salaire de 60 000 $, 30 000 $ laissés dans la société : impôt reporté de 10 597,15 $", () => {
  const r = S.compare({ province: "ON", profit: 150000, salary: 60000, keep: 30000 }, R, P), c = r.corp;
  // RPC de l'employeur : 56 500 × 5,95 % = 3 361,75 ; revenu de la société 150 000 − 60 000 − 3 361,75 = 86 638,25 ;
  // impôt 10 133,11 ; après impôt 76 505,14 ; dividendes 76 505,14 − 30 000 = 46 505,14.
  near(c.employer.total, 3361.75, "charges de l'employeur");
  near(c.income, 86638.25, "revenu de la société");
  near(c.corporateTax, 10133.11, "impôt de la société");
  near(c.dividends, 46505.14, "dividendes");
  // Actionnaire : revenu net 60 000 + 1,15 × 46 505,14 − 1 % × 56 500 = 112 915,91 ; fédéral 8 193,22 + 20,5 % ×
  // 54 392,91 − 14 % × (16 452 + 2 796,75 + 1 501 du montant canadien pour emploi) − 9,0301 % × 53 480,91 = 11 609,42.
  near(c.personal.netIncome, 112915.91, "revenu net");
  near(c.personal.federal, 11609.42, "impôt fédéral");
  near(c.receive, 84630.79, "reçu");
  near(c.deferred, 10597.15, "impôt reporté sur les 30 000 $");
  near(r.differenceAllOut, 1675.96, "écart si tout est versé");
  near(r.difference, 1675.96 + 10597.15, "écart = tout versé + impôt reporté");
});

test("Québec, 100 000 $, dividendes seulement : taux général sans 5 500 heures, taux réduit avec", () => {
  // Sans les heures : 20,5 % → 20 500 ; dividendes 79 500 majorés à 91 425 ; fédéral (8 193,22 + 20,5 % × 32 902 −
  // 2 303,28 − 9,0301 % × 91 425) × 0,835 = 3 656,53 ; Québec 7 608,30 + 19 % × 37 080 − 14 % × 18 952 − 3,42 % ×
  // 91 425 = 8 873,49 (pas de déduction pour travailleur sur des dividendes) ; reçu 66 969,98.
  const r = S.compare({ province: "QC", profit: 100000 }, R, P);
  near(r.corp.corporateTax, 20500, "impôt de la société");
  near(r.corp.personal.federal, 3656.53, "impôt fédéral");
  near(r.corp.personal.provincial, 8873.49, "impôt du Québec", 0.02);
  assert.equal(r.corp.personal.workersDeduction, 0);
  near(r.corp.receive, 66969.98, "reçu");
  // Entreprise individuelle (moteur corrigé) : 66 860,02 ; RRQ et RQAP non versés : 10 554,60.
  near(r.sole.takeHome, 66860.02, "entreprise individuelle");
  near(r.difference, 109.96, "écart");
  near(r.contributionsSaved, 10554.6, "RRQ et RQAP non versés");
  // Avec 5 500 heures : 12,2 % → 12 200 ; reçu 72 868,71.
  const h = S.compare({ province: "QC", profit: 100000, hours5500: true }, R, P);
  near(h.corp.corporateTax, 12200, "impôt de la société, taux réduit");
  near(h.corp.receive, 72868.71, "reçu, taux réduit");
});

test("Québec, 120 000 $, salaire de 50 000 $ : RRQ, RQAP et FSS de l'employeur, déduction pour travailleur", () => {
  const c = S.corporation({ province: "QC", profit: 120000, salary: 50000 }, R, P);
  // Employeur : RRQ 46 500 × 6,3 % = 2 929,50 ; RQAP 50 000 × 0,602 % = 301 ; FSS 50 000 × 1,65 % = 825.
  near(c.employer.pensions, 2929.5, "RRQ de l'employeur");
  near(c.employer.qpip, 301, "RQAP de l'employeur");
  near(c.employer.fss, 825, "FSS");
  // Revenu de la société 120 000 − 50 000 − 4 055,50 = 65 944,50 ; impôt 20,5 % = 13 518,62.
  near(c.corporateTax, 13518.62, "impôt de la société");
  // Salarié : RRQ 2 929,50 et RQAP 50 000 × 0,43 % = 215 ; pas d'AE (actionnaire à plus de 40 %).
  near(c.personal.contributions, 3144.5, "cotisations du salarié");
  near(c.personal.workersDeduction, 1450, "déduction pour travailleur plafonnée");
  near(c.personal.federal, 8665.05, "impôt fédéral");
  near(c.personal.provincial, 13158.76, "impôt du Québec");
  near(c.receive, 77457.56, "reçu");
  // Cotisations ouvrant des droits : 2 × 2 929,50 + 301 + 215 = 6 375 (sans le FSS) ; entreprise individuelle
  // 10 577,52 (RRQ 8 958,60 + RRQ2 832 + RQAP 786,92) : 4 202,52 de moins.
  near(c.pensionContributions, 6375, "RRQ et RQAP des deux parts");
  near(S.compare({ province: "QC", profit: 120000, salary: 50000 }, R, P).contributionsSaved, 4202.52, "cotisations non versées");
});

test("territoires et Î.-P.-É. : montant pour emploi du Yukon, impôt sur le salaire des T.N.-O., crédit de 10 % de la majoration", () => {
  const yt = T.personal({ province: "YT", salary: 40000 }, R, P);
  // Yukon : 6,4 % × (montant personnel de base + 36 500 × 4,95 % + 1 501).
  near(yt.provincialCredits, P.YT.income_tax_brackets[0].rate * (P.YT.basic_personal_amount + 36500 * 0.0495 + 1501), "crédits du Yukon");
  near(T.personal({ province: "NT", salary: 50000 }, R, P).payrollTax, 1000, "2 % de 50 000 $");
  // L'impôt sur le salaire ne compte pas dans les cotisations : RPC 46 500 × 5,95 % de chaque côté = 5 533,50.
  near(S.corporation({ province: "NT", profit: 100000, salary: 50000 }, R, P).pensionContributions, 5533.5, "RPC des T.N.-O.");
  assert.equal(T.personal({ province: "ON", salary: 50000 }, R, P).payrollTax, 0);
  // Î.-P.-É. : 10 % de la majoration de 15 % : 10 000 $ de dividendes → 150 $.
  near(T.personal({ province: "PE", dividends: 10000 }, R, P).provincialDividendCredit, 150, "crédit de l'Î.-P.-É.");
});

test("Ontario, 200 000 $, salaire de 90 000 $ (au-delà du MGAP) : RPC et RPC2 des deux côtés, écart de −44,01 $", () => {
  const r = S.compare({ province: "ON", profit: 200000, salary: 90000 }, R, P), c = r.corp;
  // Employeur : 71 100 × 5,95 % = 4 230,45 et RPC2 10 400 × 4 % = 416 ; revenu de la société 105 353,55 ; impôt
  // 12 322,04 ; dividendes 93 031,51, majorés à 106 986,24.
  near(c.employer.total, 4646.45, "RPC et RPC2 de l'employeur");
  near(c.corporateTax, 12322.04, "impôt de la société");
  // Revenu net 90 000 + 106 986,24 − (711 + 416) = 195 859,24 ; montant personnel fédéral réduit (16 148,24) ;
  // fédéral 41 114,51 − 14 % × (16 148,24 + 3 519,45 + 1 501) − 9,0301 % × 106 986,24 = 28 489,93.
  near(c.personal.netIncome, 195859.24, "revenu net");
  near(c.personal.federal, 28489.93, "impôt fédéral");
  near(c.personal.provincial, 20397.51, "impôt de l'Ontario");
  near(c.receive, 129497.62, "reçu");
  near(r.sole.takeHome, 129541.63, "entreprise individuelle");
  // Mêmes cotisations des deux côtés (maximums atteints) : tout l'écart vient des impôts.
  near(r.contributionsSaved, 0, "cotisations");
  near(r.taxesAndCosts, -44.01, "impôts et frais");
});

test("intégration : tout verser en dividendes coûte au plus 5 % du bénéfice en impôts de plus ou de moins (Québec sans les 5 500 heures : bien plus)", () => {
  for (const province of Object.keys(P).filter((c) => typeof R.provincial_dtc_non_eligible_2026[c] === "number"))
    for (const profit of [50000, 100000, 200000, 400000]) {
      const r = S.compare({ province, profit, hours5500: true }, R, P);
      assert.ok(Math.abs(r.taxesAndCosts) / profit < 0.05, `${province} ${profit} : ${r.taxesAndCosts}`);
      near(r.differenceAllOut, r.contributionsSaved + r.taxesAndCosts, `${province} ${profit} : décomposition`, 1e-6);
    }
  // Taux général du Québec (20,5 %) sans crédit pour dividendes adapté : 10 444,64 $ d'impôts de plus à 100 000 $.
  near(S.compare({ province: "QC", profit: 100000 }, R, P).taxesAndCosts, -10444.64, "Québec sans les heures");
});

test("refus : province sans taux officiel, salaire trop élevé, plafond des affaires, montant laissé trop grand", () => {
  for (const province of ["SK", "NU"]) {
    const r = S.compare({ province, profit: 100000 }, R, P);
    assert.deepEqual([r.corp.error, r.difference], ["province_not_available", null], province);
    assert.ok(r.sole.takeHome > 0, `${province} : l'entreprise individuelle reste calculée`);
  }
  assert.deepEqual(S.corporation({ province: "ON", profit: 60000, salary: 60000 }, R, P), { error: "salary_too_high" });
  assert.deepEqual(S.corporation({ province: "ON", profit: 520000, extraCosts: 10000 }, R, P), { error: "above_business_limit" });
  assert.equal(S.corporation({ province: "ON", profit: 510000, extraCosts: 10000 }, R, P).income, 500000);
  const k = S.corporation({ province: "ON", profit: 100000, keep: 90000 }, R, P);
  assert.equal(k.error, "keep_too_high");
  near(k.available, 88304.11, "montant disponible");
  near(S.corporation({ province: "ON", profit: 100000, keep: 88304.11 }, R, P).dividends, 0, "tout laissé", 0.01);
});

test("invariants : l'argent est conservé, l'écart = tout versé + impôt reporté, l'impôt reporté croît avec le montant laissé", () => {
  const codes = Object.keys(P).filter((c) => typeof R.provincial_dtc_non_eligible_2026[c] === "number");
  assert.equal(codes.length, 11);
  const cases = codes.map((province) => ({ province, hours5500: false })).concat([{ province: "QC", hours5500: true }]);
  for (const base of cases) for (const profit of [30000, 90000, 250000]) for (const salary of [0, 20000, 80000]) {
    const input = Object.assign({ profit, salary, extraCosts: 1500 }, base), label = `${base.province} ${base.hours5500} ${profit} ${salary}`;
    const avail = S.corporation(input, R, P);
    if (avail.error) { assert.equal(avail.error, "salary_too_high", label); continue; }
    let last = -1;
    for (const share of [0, 0.25, 0.5, 1]) {
      const r = S.compare(Object.assign({}, input, { keep: avail.afterTax * share }), R, P), c = r.corp;
      near(c.receive + c.keep + c.total + c.extraCosts, profit, `${label} ${share} : conservation`, 1e-6);
      near(r.sole.takeHome + r.sole.total, profit, `${label} ${share} : entreprise individuelle`, 1e-6);
      near(r.difference, r.differenceAllOut + r.deferred, `${label} ${share} : décomposition`, 1e-6);
      assert.ok(c.deferred >= last - 1e-9, `${label} ${share} : impôt reporté croissant`);
      if (share === 0) assert.equal(c.deferred, 0);
      last = c.deferred;
    }
  }
});

test("les pages : chiffres du texte repris des règles, sources présentes, province par défaut", () => {
  const read = (f) => readFileSync(new URL("../../content/" + f, import.meta.url), "utf8").replace(/[  ]/g, " ");
  const en = read("ca/sole-proprietor-vs-corporation.html"), fr = read("ca-fr/entreprise-individuelle-ou-societe.html");
  const c = R.corporate_tax_rates_2026, on = c.provinces.ON, qc = c.provinces.QC, h = R.quebec_sbd_paid_hours;
  const enPct = (x) => `${Math.round(x * 10000) / 100}%`, frPct = (x) => `${String(Math.round(x * 10000) / 100).replace(".", ",")} %`;
  const usd = (n) => "$" + n.toLocaleString("en-CA"), cad = (n) => n.toLocaleString("fr-CA").replace(/\s/g, " ") + " $";
  // Taux combinés des petites entreprises de 2026 : du plus bas (Manitoba, Yukon) au plus haut (Québec avec les heures).
  const combined = Object.keys(c.provinces).map((k) => c.federal_small_business + S.provincialRate(k, R, true));
  const low = Math.min(...combined), high = Math.max(...combined);
  for (const text of [enPct(R.cpp_rate_self_employed), usd(R.cpp_basic_exemption), usd(R.cpp_ympe), `${enPct(R.cpp2_rate_self_employed)} CPP2`,
    usd(R.cpp2_yampe), `${enPct(c.federal_small_business)} federal`, usd(c.federal_business_limit), `${enPct(R.non_eligible_dividend_gross_up)} gross-up`,
    `from ${enPct(on.lower)} to ${enPct(on.lower_change.rate)} on July 1, 2026`, `${enPct(R.rrsp_limits_2026.rate)} of it`,
    `${h.full_deduction_hours.toLocaleString("en-CA")} hours`, `between ${h.no_deduction_hours.toLocaleString("en-CA")} and ${h.full_deduction_hours.toLocaleString("en-CA")} hours`,
    `${enPct(qc.higher)} general Quebec rate`, `(${enPct(R.fss_employer_rate_2026)})`, `${enPct(low)} to ${enPct(high)} in 2026`,
    `${enPct(c.federal_small_business + qc.higher)} in Quebec`])
    assert.ok(en.includes(text), `« ${text} » dans la page anglaise`);
  for (const text of [frPct(R.qpp_rate_self_employed), cad(R.cpp_basic_exemption), cad(R.cpp_ympe), `${frPct(R.qpp2_rate_self_employed)} de RRQ2`,
    cad(R.cpp2_yampe), `RPC de ${frPct(R.cpp_rate_self_employed)}`, `${frPct(c.federal_small_business)} au fédéral`, cad(c.federal_business_limit),
    `majoration de ${frPct(R.non_eligible_dividend_gross_up)}`, `passe de ${frPct(on.lower)} à ${frPct(on.lower_change.rate)} le 1er juillet 2026`,
    `${frPct(R.rrsp_limits_2026.rate)} du salaire`, `entre ${cad(h.full_deduction_hours).slice(0, -2)} et ${cad(h.no_deduction_hours).slice(0, -2)} heures`,
    `${frPct(qc.higher)} au Québec`, `(${frPct(R.fss_employer_rate_2026)})`, `${frPct(c.federal_small_business + qc.higher)} (`])
    assert.ok(fr.includes(text), `« ${text} » dans la page française`);
  for (const page of [en, fr]) {
    const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(page)[1]);
    assert.equal(front.id, "structure");
    for (const key of front.sources) assert.ok(R[key] !== undefined, `source ${key} présente dans ca.json`);
  }
  assert.ok(en.includes('"default_province": "ON"') && fr.includes('"default_province": "QC"'));
});
