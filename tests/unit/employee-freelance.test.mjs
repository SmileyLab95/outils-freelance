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

const US = rules("us"), UK = rules("uk");
const caData = JSON.parse(readFileSync(new URL("../../data/rules/ca.json", import.meta.url)));
const CA = rules("ca"), PROV = caData.provinces;
const TCA = require("../../src/assets/engines/tax-ca.js");

test("États-Unis, 70 000 $ (single) : FICA 5 355 $, impôt fédéral 6 570 $ ; sole proprietor : 73 141,49 $ (56,79 $ de l'heure)", () => {
  const e = EF.employeeUS({ gross: 70000, status: "single" }, US);
  near(e.fica, 5355, "FICA salariale 7,65 %");
  near(e.incomeTax, 6570, "impôt : 1 240 + 4 560 + 3 500 × 22 %");
  near(e.available, 58075, "revenu disponible");
  const r = EF.compare("us", { gross: 70000, status: "single", units: 1288 }, US);
  assert.equal(r.revenue, 73141.49);
  assert.ok(EF.freelanceUS({ revenue: 73141.48, status: "single" }, US).available < 58074.995, "un centime de moins ne suffit pas");
  near(r.rate, 73141.49 / 1288, "taux horaire équivalent");
  near(EF.compare("us", { gross: 70000, status: "single", units: 1288, rate: 100 }, US).atRate.available, 97655.44, "à 100 $ de l'heure");
  // Frais déductibles aux États-Unis et au Royaume-Uni : le chiffre d'affaires nécessaire augmente de leur montant.
  assert.equal(EF.compare("us", { gross: 70000, status: "single", expenses: 5000 }, US).revenue, 78141.49);
  assert.equal(EF.compare("uk", { gross: 40000, region: "ruk", expenses: 5000 }, UK).revenue, 44258.65);
});

test("États-Unis, 250 000 $ : Social Security plafonnée, Additional Medicare Tax, tranche à 32 %", () => {
  const e = EF.employeeUS({ gross: 250000, status: "single" }, US);
  near(e.fica, 184500 * 0.062 + 250000 * 0.0145, "FICA");
  near(e.additionalMedicare, 450, "0,9 % au-delà de 200 000 $");
  near(e.incomeTax, 51304, "impôt fédéral");
  near(e.contributions, 15064 + 450, "FICA et Additional Medicare Tax");
  near(e.available, 183182, "revenu disponible");
  // Couple marié, déclaration commune : déduction standard de 32 200 $, barème des couples (10 % jusqu'à 24 800 $).
  near(EF.employeeUS({ gross: 70000, status: "married_filing_jointly" }, US).incomeTax, 2480 + 13000 * 0.12, "impôt d'un couple");
  // Sole proprietor à 300 000 $ : SE tax (Social Security plafonnée) et Additional Medicare Tax sur 92,35 % du bénéfice.
  const f = EF.freelanceUS({ revenue: 300000, status: "single" }, US);
  near(f.contributions, 184500 * 0.124 + 277050 * 0.029 + 77050 * 0.009, "SE tax et Additional Medicare Tax");
});

test("Royaume-Uni, 40 000 £ : NIC 2 194,40 £, impôt 5 486 £ ; sole trader : 39 258,65 £ (215,71 £ par jour) ; pension minimale 1 012,80 £", () => {
  const e = EF.employeeUK({ gross: 40000, region: "ruk" }, UK);
  near(e.contributions, 2194.4, "Class 1 : 27 430 £ × 8 %");
  near(e.incomeTax, 5486, "impôt : 27 430 £ × 20 %");
  near(e.available, 32319.6, "revenu disponible");
  near(e.employerPensionMinimum, 1012.8, "3 % de 40 000 £ − 6 240 £");
  const r = EF.compare("uk", { gross: 40000, region: "ruk", units: 182 }, UK);
  assert.equal(r.revenue, 39258.65);
  near(r.rate, 39258.65 / 182, "tarif journalier");
  assert.equal(EF.employeeUK({ gross: 10000, region: "ruk" }, UK).employerPensionMinimum, 0, "sous le seuil d'affiliation de 10 000 £");
  const h = EF.employeeUK({ gross: 120000, region: "ruk" }, UK);
  near(h.incomeTax, 39432, "allocation personnelle réduite au-delà de 100 000 £");
  near(h.contributions, 4410.6, "2 % au-delà de l'UEL");
  near(h.employerPensionMinimum, 1320.9, "3 % de 50 270 £ − 6 240 £ : bande plafonnée");
  assert.equal(EF.compare("uk", { gross: 120000, region: "ruk" }, UK).revenue, 118015.78);
  assert.ok(EF.employeeUK({ gross: 40000, region: "scotland" }, UK).incomeTax !== e.incomeTax, "barème écossais");
});

test("Canada : assurance-emploi du salarié (1,63 %, 1,30 % au Québec, plafond, remboursement sous 2 000 $) et ses crédits", () => {
  const on = (insurable) => TCA.personal({ province: "ON", salary: 70000, insurable }, CA, PROV);
  const a = on(true), b = on(false);
  near(a.ei, 1123.07, "68 900 $ × 1,63 %");
  near(a.contributions - b.contributions, 1123.07, "cotisation ajoutée");
  near(b.federal - a.federal, 0.14 * 1123.07, "crédit fédéral, ligne 31200");
  near(b.provincial - a.provincial, 0.0505 * 1123.07, "crédit de l'Ontario, ligne 58300");
  const qc = (insurable) => TCA.personal({ province: "QC", salary: 70000, insurable }, CA, PROV);
  const c = qc(true), d = qc(false);
  near(c.ei, 895.7, "Québec : 68 900 $ × 1,30 %");
  near(d.federal - c.federal, 0.14 * 895.7 * (1 - 0.165), "crédit fédéral après l'abattement du Québec");
  near(d.provincial - c.provincial, 0, "pas de crédit du Québec");
  assert.equal(TCA.personal({ province: "ON", salary: 2000, insurable: true }, CA, PROV).ei, 0, "cotisations remboursées jusqu'à 2 000 $");
  assert.equal(TCA.personal({ province: "ON", salary: 70000 }, CA, PROV).ei, 0, "actionnaire : pas d'assurance-emploi par défaut");
});

test("Canada : salarié et travailleur autonome comparés au centime (Ontario, Québec, Saskatchewan)", () => {
  for (const province of ["ON", "QC", "SK"]) {
    const r = EF.compare("ca", { gross: 70000, province, units: 1288 }, CA, PROV);
    const e = TCA.personal({ province, salary: 70000, insurable: true }, CA, PROV);
    near(r.employee.available, 70000 - e.total, `${province} : revenu disponible du salarié`);
    assert.equal(r.freelance.available.toFixed(2), r.target.toFixed(2), `${province} : même revenu disponible`);
    const less = TCA.estimate({ province, profit: r.revenue - 0.01 }, CA, PROV);
    assert.ok(r.revenue - 0.01 - less.total < r.target - 0.005, `${province} : un centime de moins ne suffit pas`);
    // Le travailleur autonome paie les deux parts du RPC ou du RRQ : il lui faut plus que le salaire brut.
    assert.ok(r.revenue > 70000, `${province} : ${r.revenue}`);
  }
  // Dépenses déductibles : le chiffre d'affaires nécessaire augmente exactement de leur montant.
  const base = EF.compare("ca", { gross: 70000, province: "ON" }, CA, PROV).revenue;
  assert.equal(Math.round((EF.compare("ca", { gross: 70000, province: "ON", expenses: 5000 }, CA, PROV).revenue - base) * 100), 500000);
});

// Pages : exemple de la FAQ recalculé à partir des valeurs par défaut, jours facturés identiques à ceux du
// convertisseur de la même section, sources citées présentes dans les règles.
const read = (f) => readFileSync(new URL("../../content/" + f, import.meta.url), "utf8").replace(/[  ]/g, " ");
const num = (s) => Number(String(s).replace(/\s/g, "").replace(",", "."));
const PAGES = {
  fr: ["fr/salarie-ou-freelance.html", "fr/convertisseur-tjm.html", "fr", "fr-FR", false,
    "Avec {gross} € brut par an, un salarié du secteur privé garde {available} € après cotisations et impôt sur le revenu (personne seule, sans autre revenu). En micro-entreprise libérale, sans frais, il faut {revenue} € de chiffre d'affaires pour garder autant, soit {rate} € par jour sur {units} jours facturés."],
  us: ["us/salary-vs-freelance.html", "us/rate-converter.html", "us", "en-US", true,
    "With a ${gross} salary, a single filer keeps ${available} after FICA and federal income tax. As a sole proprietor with no expenses, you need ${revenue} in revenue to keep the same amount, or ${rate2} an hour over {units} billed hours."],
  uk: ["uk/salary-vs-freelance.html", "uk/rate-converter.html", "uk", "en-GB", false,
    "With a £{gross} salary, you keep £{available} after Income Tax and National Insurance (outside Scotland). As a sole trader with no expenses, you need £{revenue} in turnover to keep the same amount, or £{rate2} a day over {units} billed days."],
  ca: ["ca/salary-vs-freelance.html", "ca/rate-converter.html", "ca", "en-CA", true,
    "With a ${gross} salary in Ontario, you keep ${available} after CPP, EI and income tax. Self-employed with no expenses, you need ${revenue} in revenue to keep the same amount, or ${rate2} an hour over {units} billed hours."],
  "ca-fr": ["ca-fr/salarie-ou-travailleur-autonome.html", "ca-fr/convertisseur-de-tarifs.html", "ca", "fr-CA", true,
    "Avec un salaire de {gross} $ au Québec, vous gardez {available} $ après les cotisations (RRQ, assurance-emploi, RQAP) et l'impôt. Comme travailleur autonome, sans dépenses, il vous faut {revenue} $ de revenus pour garder autant, soit {rate2} $ de l'heure sur {units} heures facturées."]
};

test("pages : exemple de la FAQ = calcul avec les valeurs par défaut ; jours du convertisseur ; sources", () => {
  for (const [section, [page, converter, country, locale, hourly, sentence]] of Object.entries(PAGES)) {
    const html = read(page), conv = read(converter), R = rules(country);
    const data = JSON.parse(/id="employee-freelance-data">([\s\S]*?)<\/script>/.exec(html)[1]);
    const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
    // Nombre affiché dans la langue de la page : virgule des milliers en anglais, virgule décimale en français.
    const parse = (v) => locale.startsWith("en") ? Number(v.replace(/[\s,]/g, "")) : num(v);
    const field = (h, id) => parse(new RegExp(`id="${id}"[^>]*value="([^"]*)"`).exec(h)[1]);
    const selected = (id) => { const m = new RegExp(`id="${id}"[\\s\\S]*?<option value="(\\w+)" selected`).exec(html); return m && m[1]; };
    const input = { gross: field(html, "ef-gross"), units: field(html, "ef-units") };
    for (const id of ["activity", "status", "region", "province"]) if (selected("ef-" + id)) input[id] = selected("ef-" + id);
    if (data.default_province) input.province = data.default_province;
    const r = EF.compare(data.country, input, R, PROV);
    const f = (n, d = 0) => n.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/\s/g, " ");
    const expected = sentence.replace("{gross}", f(input.gross)).replace("{available}", f(r.employee.available)).replace("{revenue}", f(r.revenue))
      .replace("{rate}", f(r.rate)).replace("{rate2}", f(r.rate, 2)).replace("{units}", f(input.units));
    assert.ok(html.includes(expected), `${section} : exemple de la FAQ\n${expected}`);
    assert.equal(front.id, "employee-vs-freelance");
    assert.equal(input.units, field(conv, "rc-days") * (hourly ? field(conv, "rc-hours") : 1), `${section} : jours ou heures facturés du convertisseur`);
    for (const key of front.sources || []) assert.ok(R[key] !== undefined, `${section} : source ${key}`);
    const keys = ["na", "fields", "check", "check_notice", "enter_salary", "enter_units", "not_found", "sub", "sub_no_units", "at_rate_more",
      "at_rate_less", "at_rate_same", "msg_always"].concat(country === "fr" ? ["over_ceiling", "at_rate_over_ceiling", "over_vat"] : [])
      .concat(country === "uk" ? ["pension"] : []).concat(country === "ca" ? ["names", "default_province"] : []);
    for (const key of keys) assert.ok(data[key] !== undefined, `${section} : texte ${key}`);
    for (const t of data.thresholds || []) assert.equal(typeof R[t.rule], "number", `${section} : seuil ${t.rule}`);
    for (const key of Object.values(data.fields)) assert.ok(key.length > 0);
    assert.deepEqual(Object.keys(data.fields).sort(), ["ef-benefits", "ef-expenses", "ef-gross", "ef-rate", "ef-units"]);
  }
});
