// Tests du moteur « salarié ou freelance ? ». Valeurs attendues calculées à la main (calcul décimal indépendant du
// moteur), avec les règles 2026 de data/rules/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const EF = require("../../src/assets/engines/employee-freelance.js");
const rules = (c) => Object.fromEntries(Object.entries(JSON.parse(readFileSync(new URL(`../../data/rules/${c}.json`, import.meta.url))).values).map(([k, v]) => [k, v.value]));
const FR = rules("fr");
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.006, `${msg} : ${a} au lieu de ${b}`);

test("France, 40 000 € brut (sous le PASS) : cotisations 8 336,10 €, net 31 663,90 €, impôt avec décote 1 966,69 €", () => {
  // Vieillesse 2 760 + 160 ; Agirc-Arrco T1 4,01 % = 1 604 ; CSG 9,2 % et CRDS 0,5 % sur 39 300 € = 3 615,60 + 196,50.
  const e = EF.employeeFR({ gross: 40000 }, FR);
  near(e.pension, 2920, "vieillesse");
  near(e.complementary, 1604, "retraite complémentaire");
  near(e.contributions, 8336.1, "cotisations");
  near(e.net, 31663.9, "net");
  // Net imposable : + CSG non déductible (2,4 %) et CRDS ; déduction de 10 % ; barème : 17 923,24 × 11 % = 1 971,56.
  near(e.netTaxable, 32803.6, "net imposable");
  near(e.deduction, 3280.36, "déduction de 10 %");
  near(e.incomeTaxRaw, 1971.5564, "impôt avant décote");
  near(e.decote, 4.8707, "décote : 897 − 45,25 % × 1 971,56");
  near(e.incomeTax, 1966.6857, "impôt");
  near(e.available, 29697.2143, "revenu disponible");
});

test("France, 100 000 € brut : tranche 2 et CET ; 250 000 € : CSG sur 100 % au-delà de 4 PASS, déduction plafonnée", () => {
  const a = EF.employeeFR({ gross: 100000 }, FR);
  // T2 = 51 940 € × 9,72 % ; CET 0,14 % sur tout le salaire ; CSG sur 98 250 €.
  near(a.complementary, 1927.206 + 5048.568 + 140, "retraite complémentaire, T1 + T2 + CET");
  near(a.contributions, 20362.164, "cotisations");
  near(a.incomeTax, 15375.50322, "impôt (sans décote)");
  near(a.available, 64262.33278, "revenu disponible");
  const b = EF.employeeFR({ gross: 250000 }, FR);
  near(b.csg, (192240 * 0.9825 + 57760) * 0.092, "CSG : 98,25 % jusqu'à 192 240 €, 100 % au-delà");
  near(b.deduction, 14555, "déduction de 10 % plafonnée");
  near(b.available, 136727.24018, "revenu disponible");
  // Au-delà de 8 PASS : plus de cotisation de tranche 2.
  const c = EF.employeeFR({ gross: 400000 }, FR);
  near(c.complementary, 48060 * 0.0401 + 7 * 48060 * 0.0972 + 8 * 48060 * 0.0014, "tranche 2 limitée à 8 PASS");
  near(c.available, 201644.39, "revenu disponible");
});

test("France, petit salaire : déduction minimale de 509 € et pas d'impôt", () => {
  const e = EF.employeeFR({ gross: 4000 }, FR);
  assert.equal(e.deduction, 509);
  assert.equal(e.incomeTax, 0);
  near(e.available, 3166.39, "revenu disponible");
  // Salaire inférieur au minimum : la déduction ne dépasse pas le salaire.
  assert.ok(EF.employeeFR({ gross: 500 }, FR).deduction <= EF.employeeFR({ gross: 500 }, FR).netTaxable);
});

test("France : chiffre d'affaires nécessaire en micro BNC au centime près (40 000 € brut → 42 332,70 €, 286,03 € par jour)", () => {
  const r = EF.compare("fr", { gross: 40000, activity: "liberal_bnc", units: 148 }, FR);
  near(r.target, 29697.2143, "cible");
  assert.equal(r.revenue, 42332.7);
  assert.equal(EF.freelanceFR({ revenue: 42332.7, activity: "liberal_bnc" }, FR).available.toFixed(2), "29697.21");
  assert.ok(EF.freelanceFR({ revenue: 42332.69, activity: "liberal_bnc" }, FR).available < 29697.205, "un centime de moins ne suffit pas");
  near(r.rate, 42332.7 / 148, "TJM équivalent");
  assert.equal(r.atRate, null);
  assert.equal(r.freelance.overCeiling, false);
});

test("France : avantages de l'employeur et frais ; versement libératoire ; services BIC ; tarif saisi", () => {
  assert.equal(EF.compare("fr", { gross: 40000, activity: "liberal_bnc", benefits: 1200, expenses: 3000, units: 148 }, FR).revenue, 49634.55);
  assert.equal(EF.compare("fr", { gross: 40000, activity: "liberal_bnc", vl: true }, FR).revenue, 41246.12);
  assert.equal(EF.compare("fr", { gross: 40000, activity: "services_bic" }, FR).revenue, 38108.25);
  const r = EF.compare("fr", { gross: 40000, activity: "liberal_bnc", units: 148, rate: 450 }, FR);
  assert.equal(r.atRate.revenue, 66600);
  near(r.atRate.available, 43126.41, "revenu disponible à 450 € par jour");
});

test("France : plafond de la micro-entreprise signalé ; refus sans salaire", () => {
  const r = EF.compare("fr", { gross: 150000, activity: "liberal_bnc", units: 148 }, FR);
  assert.ok(r.revenue > 83600 && r.freelance.overCeiling);
  assert.deepEqual(EF.compare("fr", { gross: 0 }, FR), { error: "no_salary" });
  // Abattement micro d'au moins 305 € (400 € × 34 % = 136 €), sans dépasser le chiffre d'affaires.
  assert.equal(EF.freelanceFR({ revenue: 400, activity: "liberal_bnc" }, FR).taxable, 95);
  assert.equal(EF.freelanceFR({ revenue: 200, activity: "liberal_bnc" }, FR).taxable, 0);
  assert.throws(() => EF.compare("xx", { gross: 1 }, FR));
});

test("recherche du chiffre d'affaires : plus petit montant au centime, fonction en escalier comprise", () => {
  assert.equal(EF.revenueFor(100, (x) => x), 100);
  // 199,99 × 0,5 = 99,995, arrondi à 100,00 € : la comparaison se fait au centime.
  assert.equal(EF.revenueFor(100, (x) => x * 0.5), 199.99);
  assert.equal(EF.revenueFor(0, (x) => x), 0);
  assert.equal(EF.revenueFor(10, (x) => Math.floor(x / 7) * 7), 14);
  assert.equal(EF.revenueFor(10, () => 0), null);
});

// Pages : exemple de la FAQ recalculé à partir des valeurs par défaut, jours facturés identiques à ceux du
// convertisseur de la même section, sources citées présentes dans les règles.
const read = (f) => readFileSync(new URL("../../content/" + f, import.meta.url), "utf8").replace(/[  ]/g, " ");
const num = (s) => Number(String(s).replace(/\s/g, "").replace(",", "."));
const PAGES = {
  fr: ["fr/salarie-ou-freelance.html", "fr/convertisseur-tjm.html", "fr", "fr-FR",
    "Avec {gross} € brut par an, un salarié du secteur privé garde {available} € après cotisations et impôt sur le revenu (personne seule, sans autre revenu). En micro-entreprise libérale, sans frais, il faut {revenue} € de chiffre d'affaires pour garder autant, soit {rate} € par jour sur {units} jours facturés."]
};

test("pages : exemple de la FAQ = calcul avec les valeurs par défaut ; jours du convertisseur ; sources", () => {
  for (const [section, [page, converter, country, locale, sentence]] of Object.entries(PAGES)) {
    const html = read(page), conv = read(converter), R = rules(country);
    const data = JSON.parse(/id="employee-freelance-data">([\s\S]*?)<\/script>/.exec(html)[1]);
    const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
    const field = (h, id) => num(new RegExp(`id="${id}"[^>]*value="([^"]*)"`).exec(h)[1]);
    const selected = (id) => { const m = new RegExp(`id="${id}"[\\s\\S]*?<option value="(\\w+)" selected`).exec(html); return m && m[1]; };
    const input = { gross: field(html, "ef-gross"), units: field(html, "ef-units") };
    for (const id of ["activity", "status", "region", "province"]) if (selected("ef-" + id)) input[id] = selected("ef-" + id);
    const r = EF.compare(data.country, input, R);
    const f = (n, d = 0) => n.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/\s/g, " ");
    const expected = sentence.replace("{gross}", f(input.gross)).replace("{available}", f(r.employee.available)).replace("{revenue}", f(r.revenue))
      .replace("{rate}", f(r.rate)).replace("{units}", f(input.units));
    assert.ok(html.includes(expected), `${section} : exemple de la FAQ\n${expected}`);
    assert.equal(front.id, "employee-vs-freelance");
    assert.equal(input.units, field(conv, "rc-days"), `${section} : jours facturés du convertisseur`);
    for (const key of front.sources || []) assert.ok(R[key] !== undefined, `${section} : source ${key}`);
    for (const key of ["fields", "check", "check_notice", "enter_salary", "enter_units", "not_found", "sub", "sub_no_units", "at_rate_more",
      "at_rate_less", "at_rate_same", "over_ceiling", "at_rate_over_ceiling", "over_vat", "msg_always"]) {
      assert.ok(data[key] !== undefined, `${section} : texte ${key}`);
    }
  }
});
