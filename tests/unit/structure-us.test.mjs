// Tests du comparateur entreprise individuelle / S corporation (États-Unis). Valeurs attendues calculées à la main
// (détail en commentaire), indépendamment du code, à partir des règles de data/rules/us.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const S = require("../../src/assets/engines/structure-us.js");
const T = require("../../src/assets/engines/tax-us.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/us.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 0.01, `${label} : ${actual} ≠ ${expected}`);

test("bénéfice de 100 000 $, célibataire, salaire de 50 000 $ : la S corp garde 4 383,14 $ de plus", () => {
  const r = S.compare({ profit: 100000, salary: 50000, status: "single" }, R);
  // S corp : FICA employeur 50 000 × 7,65 % = 3 825 ; FUTA 7 000 × 0,6 % = 42 ; K-1 = 100 000 − 50 000 − 3 825 − 42
  // = 46 133 ; imposable avant QBI 96 133 − 16 100 = 80 033 ; QBI 20 % × 46 133 = 9 226,60 ; imposable 70 806,40 ;
  // impôt 1 240 + 4 560 + 22 % × 20 406,40 = 10 289,41 ; total 2 × 3 825 + 42 + 10 289,41 = 17 981,41.
  near(r.scorp.employerFica, 3825, "FICA employeur");
  near(r.scorp.futa, 42, "FUTA");
  near(r.scorp.k1, 46133, "K-1");
  near(r.scorp.qbiDeduction, 9226.6, "QBI de la S corp");
  near(r.scorp.incomeTax, 10289.41, "impôt de la S corp");
  near(r.scorp.total, 17981.41, "total S corp");
  // Entreprise individuelle : SE tax 92 350 × 15,3 % = 14 129,55 ; QBI 20 % × (100 000 − 7 064,775 − 16 100) =
  // 15 367,05 ; imposable 61 468,18 ; impôt 8 235,00 ; total 22 364,55.
  near(r.sole.se.total, 14129.55, "SE tax");
  near(r.sole.incomeTax, 8235, "impôt de l'entreprise individuelle");
  near(r.difference, 4383.14, "écart de revenu disponible");
});

test("mariés, déclaration commune : 120 000 $, salaire 60 000 $ → 102 622,67 $ contre 95 925,60 $", () => {
  // S corp : K-1 = 120 000 − 60 000 − 4 590 − 42 = 55 368 ; QBI 20 % × 55 368 = 11 073,60 ; impôt 8 155,33 ;
  // total 2 × 4 590 + 42 + 8 155,33 = 17 377,33. Entreprise individuelle : SE tax 16 955,46, QBI 15 864,45,
  // impôt 7 118,94, total 24 074,40.
  const r = S.compare({ profit: 120000, salary: 60000, status: "married_filing_jointly" }, R);
  near(r.scorp.qbiDeduction, 11073.6, "QBI");
  near(r.scorp.incomeTax, 8155.33, "impôt");
  near(r.scorp.takeHome, 102622.67, "revenu disponible S corp");
  near(r.sole.takeHome, 95925.6, "revenu disponible entreprise individuelle");
  near(r.difference, 6697.07, "écart");
});

test("QBI avec salaires W-2 : zone de transition (limite atteinte ou non), SSTB, au-delà de la zone", () => {
  // Bénéfice 250 000, salaire 100 000 : K-1 142 308 ; part de la zone 0,326107 ; 20 % × K-1 = 28 461,60 < 50 % ×
  // 100 000 : pas de réduction. En SSTB : 20 % × 142 308 × 0,673893 = 19 180,08.
  near(S.sCorp({ profit: 250000, salary: 100000, status: "single" }, R).qbiDeduction, 28461.6, "salaires suffisants");
  near(S.sCorp({ profit: 250000, salary: 100000, status: "single", sstb: true }, R).qbiDeduction, 19180.08, "SSTB, salaires suffisants");
  // Bénéfice 240 000, salaire 20 000 : K-1 = 240 000 − 20 000 − 1 530 − 42 = 218 428 ; imposable avant QBI 222 328 ;
  // part 20 578 / 75 000 = 0,274373 ; 43 685,60 − 0,274373 × (43 685,60 − 10 000) = 34 443,17 (limite atteinte).
  near(S.sCorp({ profit: 240000, salary: 20000, status: "single" }, R).qbiDeduction, 34443.17, "limite des salaires dans la zone");
  // En SSTB : QBI et salaires × 0,725627 : 31 699,44 − 0,274373 × (31 699,44 − 7 256,27) = 24 992,88.
  near(S.sCorp({ profit: 240000, salary: 20000, status: "single", sstb: true }, R).qbiDeduction, 24992.88, "SSTB, limite dans la zone");
  // Au-delà de la zone : 50 % des salaires. Bénéfice 300 000, salaire 30 000 → 15 000 ; en SSTB → 0.
  near(S.sCorp({ profit: 300000, salary: 30000, status: "single" }, R).qbiDeduction, 15000, "au-delà, limitée aux salaires");
  assert.equal(S.sCorp({ profit: 300000, salary: 30000, status: "single", sstb: true }, R).qbiDeduction, 0, "SSTB au-delà de la zone");
});

test("entreprise individuelle sans salaire : QBI de la zone de transition et minimum de 400 $ (valeurs à la main)", () => {
  // 260 000 $ : SE tax 29 841,19, moitié déduite 14 920,595 ; imposable avant QBI 228 979,41 ; part 0,363059 ;
  // 20 % × 245 079,41 × (1 − 0,363059) = 31 220,24 ; en SSTB × (1 − 0,363059) une seconde fois : 19 885,46.
  near(T.estimate({ profit: 260000, status: "single" }, R).qbiDeduction, 31220.24, "zone de transition");
  near(T.estimate({ profit: 260000, status: "single", sstb: true }, R).qbiDeduction, 19885.46, "zone de transition, SSTB");
  // 400 000 $ : au-delà de la zone, sans salaire : 0, relevé au minimum de 400 $ (règle qbi_minimum_deduction).
  assert.equal(T.estimate({ profit: 400000, status: "single" }, R).qbiDeduction, 400);
});

test("cas limites : salaire nul, bénéfice nul, salaire au-delà du plafond, frais qui rendent le salaire impossible", () => {
  // Salaire 0 : aucune charge sociale ; K-1 = 120 000 ; QBI 20 % × (120 000 − 16 100) = 20 780 ; impôt 12 998,40.
  const zero = S.sCorp({ profit: 120000, salary: 0, status: "single" }, R);
  assert.equal(zero.payroll, 0);
  near(zero.qbiDeduction, 20780, "QBI sans salaire, sous le seuil");
  near(zero.incomeTax, 12998.4, "impôt sans salaire");
  assert.deepEqual([S.sCorp({ profit: 0, salary: 0, status: "single" }, R).total, T.estimate({ profit: 0, status: "single" }, R).total], [0, 0]);
  // Salaire 200 000 sur 400 000 : FICA d'un côté 184 500 × 6,2 % + 200 000 × 1,45 % = 14 339 ; K-1 185 619 ;
  // QBI 37 123,80 ; impôt 85 107,57 ; Additional Medicare 0 (seuil de 200 000 non dépassé).
  const high = S.sCorp({ profit: 400000, salary: 200000, status: "single" }, R);
  near(high.employerFica, 14339, "FICA plafonnée");
  near(high.k1, 185619, "K-1");
  near(high.qbiDeduction, 37123.8, "QBI");
  near(high.incomeTax, 85107.57, "impôt");
  assert.equal(high.additionalMedicare, 0);
  near(S.sCorp({ profit: 600000, salary: 250000, status: "single" }, R).additionalMedicare, 450, "0,9 % × (250 000 − 200 000)");
  // 60 000 − 7 000 de frais − 50 000 − 3 825 − 42 < 0 : refusé.
  assert.deepEqual(S.sCorp({ profit: 60000, salary: 50000, status: "single", extraCosts: 7000 }, R), { error: "salary_too_high" });
  assert.equal(S.compare({ profit: 50000, salary: 50000, status: "single" }, R).difference, null);
  // Frais de 2 000 $ : K-1 = 44 133 ; QBI 20 % × 44 133 = 8 826,60 ; imposable 94 133 − 16 100 − 8 826,60 =
  // 69 206,40 ; impôt 1 240 + 4 560 + 22 % × 18 806,40 = 9 937,41 ; revenu disponible 100 000 − 2 000 −
  // (7 650 + 42 + 9 937,41) = 80 370,59.
  const c = S.sCorp({ profit: 100000, salary: 50000, status: "single", extraCosts: 2000 }, R);
  near(c.k1, 44133, "K-1 après frais");
  near(c.incomeTax, 9937.41, "impôt après frais");
  near(c.takeHome, 80370.59, "revenu disponible après frais");
});

test("la page : chiffres du texte repris des règles, sources citées, aucun salaire proposé", () => {
  const html = readFileSync(new URL("../../content/us/sole-proprietor-vs-s-corp.html", import.meta.url), "utf8");
  const pct = (x) => `${Math.round(x * 10000) / 100}%`;
  const fr = R.fica_rates_2026, usd = (x) => `$${x.toLocaleString("en-US")}`;
  for (const text of [pct(R.se_tax_total_rate), pct(R.se_net_earnings_factor), pct(fr.social_security_rate + fr.medicare_rate),
    usd(R.social_security_wage_base_2026), pct(R.futa_2026.net_rate), usd(R.futa_2026.wage_base),
    `${R.qbi_w2_wage_limit.w2_wage_rate * 100}% of the W-2 wages`, usd(R.qbi_threshold_2026.single), usd(R.qbi_threshold_2026.married_filing_jointly),
    usd(R.qbi_minimum_deduction.minimum_deduction)])
    assert.ok(html.includes(text), `chiffre « ${text} » présent dans la page`);
  assert.doesNotMatch(html, /id="c-salary"[^>]*value=/, "le salaire n'est pas prérempli");
  const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
  assert.equal(front.id, "structure");
  for (const key of front.sources) assert.ok(R[key] !== undefined, `source ${key} présente dans us.json`);
});
