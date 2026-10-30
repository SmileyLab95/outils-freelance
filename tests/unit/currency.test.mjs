// Tests du moteur de conversion de devises (documentation/49-devises.md). Réponses tirées des sources lues le 30/10/2026
// (BCE, HMRC, Banque du Canada), raccourcies ; résultats attendus calculés à la main.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const C = require("../../src/assets/engines/currency.js");
const SOURCES = ruleValues("fr").fx_reference_sources;

const ECB_HEAD = "KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE,OBS_STATUS,OBS_CONF,OBS_PRE_BREAK,OBS_COM,TIME_FORMAT,BREAKS,COLLECTION,COMPILING_ORG,DISS_ORG,DOM_SER_IDS,PUBL_ECB,PUBL_MU,PUBL_PUBLIC,UNIT_INDEX_BASE,COMPILATION,COVERAGE,DECIMALS,NAT_TITLE,SOURCE_AGENCY,SOURCE_PUB,TITLE,TITLE_COMPL,UNIT,UNIT_MULT";
const ecbRow = (cur, date, value) => `EXR.D.${cur}.EUR.SP00.A,D,${cur},EUR,SP00,A,${date},${value},A,F,,,P1D,,A,,,,,,,99Q1=100,,,4,,4F0,,US dollar/Euro ECB reference exchange rate,"ECB reference exchange rate, US dollar/Euro, 2.15 pm (C.E.T.)",${cur},0`;
const ECB = [ECB_HEAD, ecbRow("USD", "2026-10-29", "1.113"), ecbRow("USD", "2026-10-23", "1.1201"), ecbRow("USD", "2026-10-26", "1.1188"),
  ecbRow("GBP", "2026-10-26", "0.8382")].join("\r\n") + "\r\n";

const HMRC = "Country/Territories,Currency,Currency Code,Currency Units per £1,Start date,End date\n" +
  "Niger Republic,CFA Franc,XOF,765.1987,01/10/2026,31/10/2026\nSenegal,CFA Franc,XOF,765.1987,01/10/2026,31/10/2026\n" +
  "Switzerland,Franc,CHF,1.1020,01/10/2026,31/10/2026\nUSA,Dollar,USD,1.3456,01/10/2026,31/10/2026\n";

const BOC = { observations: [
  { d: "2026-10-30", FXUSDCAD: { v: "1.3960" }, FXEURCAD: { v: "1.5582" } },
  { d: "2026-10-29", FXUSDCAD: { v: "1.3985" }, FXEURCAD: { v: "1.5601" }, FXJPYCAD: { v: "0.008870" } },
] };

test("règle des sources : 18 devises, adresses https avec leurs repères, fenêtre de 14 jours", () => {
  assert.equal(SOURCES.currencies.length, 18);
  assert.equal(new Set(SOURCES.currencies).size, 18, "sans doublon");
  for (const c of SOURCES.currencies) assert.match(c, /^[A-Z]{3}$/);
  for (const k of ["ecb", "hmrc", "boc"]) assert.match(SOURCES[k], /^https:\/\//, k);
  assert.match(SOURCES.ecb, /\{currency\}.*\{start\}.*\{end\}/);
  assert.match(SOURCES.boc, /\{currency\}.*\{start\}.*\{end\}/);
  assert.match(SOURCES.hmrc, /\{year\}-\{month\}/);
  assert.equal(SOURCES.window_days, 14);
});

test("adresses : fenêtre de 14 jours (BCE, Banque du Canada), mois sans zéro (HMRC), changement d'année", () => {
  assert.equal(C.ecbUrl(SOURCES, "USD", "2026-10-29"),
    "https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?startPeriod=2026-10-15&endPeriod=2026-10-29&format=csvdata");
  assert.equal(C.bocUrl(SOURCES, "EUR", "2027-01-05"),
    "https://www.bankofcanada.ca/valet/observations/FXEURCAD/json?start_date=2026-12-22&end_date=2027-01-05");
  assert.equal(C.hmrcUrl(SOURCES, "2026-09-15"), "https://www.trade-tariff.service.gov.uk/uk/api/exchange_rates/files/monthly_csv_2026-9.csv");
  assert.equal(C.hmrcUrl(SOURCES, "2026-10-01"), "https://www.trade-tariff.service.gov.uk/uk/api/exchange_rates/files/monthly_csv_2026-10.csv");
  assert.equal(C.addDays("2028-03-01", -1), "2028-02-29", "année bissextile");
});

test("dates : seules les dates qui existent sont acceptées", () => {
  for (const d of ["2026-10-30", "2028-02-29"]) assert.ok(C.validDate(d), d);
  for (const d of ["2026-04-31", "2027-02-29", "30/10/2026", "", null, "2026-1-5"]) assert.ok(!C.validDate(d), String(d));
});

test("BCE : lecture du CSV (virgules entre guillemets), tri par date, une seule devise", () => {
  const usd = C.parseEcb(ECB, "USD");
  assert.deepEqual(usd.map((o) => o.date), ["2026-10-23", "2026-10-26", "2026-10-29"]);
  assert.equal(usd[2].value, 1.113);
  assert.equal(usd[2].text, "1.113", "valeur gardée telle que publiée");
  assert.equal(C.parseEcb(ECB, "GBP").length, 1);
  assert.deepEqual(C.parseEcb(ECB, "JPY"), [], "devise absente : aucune observation");
  assert.equal(C.parseEcb("date,valeur\n2026-10-29,1.1", "USD"), null, "format inconnu");
  assert.equal(C.parseEcb("", "USD"), null);
  assert.deepEqual(C.parseEcb(ECB_HEAD + "\n" + ecbRow("USD", "2026-10-29", "NaN"), "USD"), [], "valeur illisible ignorée");
});

test("dernier taux publié au plus tard à la date : fin de semaine et jour sans taux → jour ouvré précédent", () => {
  const usd = C.parseEcb(ECB, "USD");
  assert.equal(C.latest(usd, "2026-10-29").date, "2026-10-29", "taux du jour");
  assert.equal(C.latest(usd, "2026-10-28").date, "2026-10-26", "pas de taux le 27 et le 28 : celui du 26");
  assert.equal(C.latest(usd, "2026-10-25").date, "2026-10-23", "dimanche : vendredi");
  assert.equal(C.latest(usd, "2026-10-22"), null, "rien avant le 23 dans la réponse");
  assert.equal(C.latest([], "2026-10-29"), null);
});

test("Banque du Canada : lecture du JSON de Valet, séries absentes ignorées", () => {
  const usd = C.parseBoc(BOC, "USD");
  assert.deepEqual(usd.map((o) => [o.date, o.value]), [["2026-10-29", 1.3985], ["2026-10-30", 1.396]]);
  assert.equal(usd[1].text, "1.3960");
  assert.deepEqual(C.parseBoc(BOC, "JPY").map((o) => o.text), ["0.008870"]);
  assert.deepEqual(C.parseBoc(BOC, "GBP"), []);
  assert.equal(C.parseBoc({ seriesDetail: {} }, "USD"), null, "format inconnu");
  assert.equal(C.parseBoc(null, "USD"), null);
});

test("HMRC : taux du mois (unités pour 1 £), premier pays qui utilise la devise, période du fichier", () => {
  assert.deepEqual(C.parseHmrc(HMRC, "USD"), { value: 1.3456, text: "1.3456", start: "2026-10-01", end: "2026-10-31" });
  assert.equal(C.parseHmrc(HMRC, "CHF").text, "1.1020");
  assert.equal(C.parseHmrc(HMRC, "XOF").value, 765.1987, "code partagé par plusieurs pays : une seule valeur");
  assert.equal(C.parseHmrc(HMRC, "JPY"), null, "devise absente");
  assert.equal(C.parseHmrc("Country,Currency,Code,Rate\nUSA,Dollar,USD,1.3", "USD"), null, "colonnes renommées : format inconnu");
  assert.equal(C.parseHmrc(HMRC.replace("USD,1.3456,01/10/2026", "USD,1.3456,2026-10-01"), "USD"), null, "date de début illisible");
});

test("conversion vers la monnaie du pays, deux conventions de taux, arrondi au centime", () => {
  // 1 000 $ US au taux de la BCE (1 € = 1,1130 $) : 1 000 ÷ 1,113 = 898,4726… → 898,47 €.
  let r = C.convert({ amount: 1000, direction: "to_home", rate: { value: 1.113, per: "home" }, vat: 20 });
  assert.equal(r.foreign, 1000);
  assert.equal(r.home, 898.47);
  assert.equal(r.homeVat, 179.69, "TVA sur le hors taxe arrondi : 898,47 × 20 % = 179,694");
  assert.equal(r.homeTotal, 1078.16);
  assert.equal(r.foreignVat, 200);
  assert.equal(r.foreignTotal, 1200);
  // 1 000 $ US au taux de la Banque du Canada (1 $ US = 1,3960 $ CA) : 1 396,00 $ CA.
  r = C.convert({ amount: 1000, direction: "to_home", rate: { value: 1.396, per: "foreign" }, vat: null });
  assert.equal(r.home, 1396);
  assert.equal(r.homeVat, null);
  assert.equal(r.homeTotal, 1396);
  // 1 000 $ US au taux du HMRC (1 £ = 1,3456 $) : 743,16 £ ; TVA 20 % : 148,63 £.
  r = C.convert({ amount: 1000, direction: "to_home", rate: { value: 1.3456, per: "home" }, vat: 20 });
  assert.equal(r.home, 743.16);
  assert.equal(r.homeVat, 148.63);
});

test("conversion inverse (devis en devise) : 500 € au taux de 1,1130 $ font 556,50 $", () => {
  const r = C.convert({ amount: 500, direction: "to_foreign", rate: { value: 1.113, per: "home" }, vat: 20 });
  assert.equal(r.home, 500);
  assert.equal(r.foreign, 556.5);
  assert.equal(r.homeVat, 100);
  assert.equal(r.foreignTotal, 667.8);
  const ca = C.convert({ amount: 1396, direction: "to_foreign", rate: { value: 1.396, per: "foreign" }, vat: null });
  assert.equal(ca.foreign, 1000);
});

test("arrondi : demi-centime vers le haut malgré la virgule flottante, montants négatifs symétriques", () => {
  assert.equal(C.round2(898.465), 898.47);
  assert.equal(C.round2(1.005), 1.01);
  assert.equal(C.round2(0.125), 0.13);
  assert.equal(C.round2(-1.005), -1.01);
  assert.equal(C.round2(2.3449999), 2.34);
});

test("erreurs : montant nul ou négatif, taux absent ou nul, convention inconnue, TVA hors bornes", () => {
  const rate = { value: 1.1, per: "home" };
  for (const amount of [0, -5, NaN, Infinity]) assert.equal(C.convert({ amount, rate }).error, "amount", String(amount));
  for (const bad of [{ value: 0, per: "home" }, { value: -1, per: "home" }, { value: NaN, per: "home" }, { value: 1.1, per: "x" }, undefined]) {
    assert.equal(C.convert({ amount: 10, rate: bad }).error, "rate", JSON.stringify(bad));
  }
  assert.equal(C.convert({ amount: 10, rate, vat: -1 }).error, "vat");
  assert.equal(C.convert({ amount: 10, rate, vat: 100 }).error, "vat");
});

test("taux saisi : virgule ou point décimal, sans séparateur de milliers ; zéro, négatif ou illisible refusés", () => {
  assert.equal(C.parseRate("1,1130"), 1.113);
  assert.equal(C.parseRate(" 1.3456 "), 1.3456);
  assert.equal(C.parseRate("0,00887"), 0.00887);
  assert.equal(C.parseRate("150"), 150);
  for (const bad of ["", "0", "0,0", "-1,2", "1.2.3", "1 000,5", "abc", "1,2,3", null]) assert.equal(C.parseRate(bad), null, String(bad));
});

test("remplissage des textes : clés connues remplacées, clés absentes laissées visibles", () => {
  assert.equal(C.fill("1 € = {rate} {cur}", { rate: "1,1130", cur: "USD" }), "1 € = 1,1130 USD");
  assert.equal(C.fill("{a} {b}", { a: "x" }), "x {b}");
});
