// Tests du convertisseur de tarifs (moteur commun aux quatre pays). Valeurs attendues calculées à la main.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const C = require("../../src/assets/engines/rate-convert.js");
const near = (actual, expected, label, tol = 0.005) => assert.ok(Math.abs(actual - expected) < tol, `${label} : ${actual} ≠ ${expected}`);

test("TJM de 450 € (7 h, 148 jours) : 64,29 € de l'heure, 2 250 € la semaine, 5 550 € par mois, 66 600 € par an", () => {
  const r = C.convert({ amount: 450, unit: "day", hoursPerDay: 7, daysPerYear: 148 });
  near(r.hour, 450 / 7, "heure");
  near(r.week, 2250, "semaine de 5 jours");
  near(r.year, 66600, "an : 450 × 148");
  near(r.month, 5550, "mois : 66 600 ÷ 12");
  assert.equal(r.hoursPerYear, 1036);
});

test("75 $ de l'heure (8 h, 161 jours) : 600 $ par jour, 96 600 $ par an pour 1 288 heures", () => {
  const r = C.convert({ amount: 75, unit: "hour", hoursPerDay: 8, daysPerYear: 161 });
  near(r.day, 600, "jour");
  near(r.week, 3000, "semaine");
  near(r.year, 96600, "an");
  near(r.month, 8050, "mois");
  assert.equal(r.hoursPerYear, 1288);
});

test("5 000 £ par mois (7,5 h, 182 jours) : 60 000 £ par an, 329,67 £ par jour, 43,96 £ de l'heure", () => {
  const r = C.convert({ amount: 5000, unit: "month", hoursPerDay: 7.5, daysPerYear: 182 });
  near(r.year, 60000, "an");
  near(r.day, 60000 / 182, "jour");
  near(r.hour, 60000 / 182 / 7.5, "heure");
  // Depuis l'an et depuis la semaine.
  near(C.convert({ amount: 60000, unit: "year", hoursPerDay: 7.5, daysPerYear: 182 }).month, 5000, "an → mois");
  near(C.convert({ amount: 2500, unit: "week", hoursPerDay: 8, daysPerYear: 200 }).day, 500, "semaine → jour");
});

test("aller-retour : convertir puis reconvertir redonne le montant, pour chaque unité", () => {
  for (const from of C.UNITS) for (const to of C.UNITS) {
    const a = C.convert({ amount: 1234.5, unit: from, hoursPerDay: 7.5, daysPerYear: 175 });
    const b = C.convert({ amount: a[to], unit: to, hoursPerDay: 7.5, daysPerYear: 175 });
    near(b[from], 1234.5, `${from} → ${to} → ${from}`, 1e-6);
  }
});

test("refus : heures par jour ou jours par an nuls ou hors limites ; montant négatif ou vide ramené à 0", () => {
  for (const [h, d] of [[0, 150], [24.5, 150], [7, 0], [7, 367], [NaN, 150], [7, undefined]])
    assert.deepEqual(C.convert({ amount: 100, unit: "day", hoursPerDay: h, daysPerYear: d }), { error: "assumptions" }, `${h} h, ${d} j`);
  assert.equal(C.convert({ amount: 100, unit: "day", hoursPerDay: 24, daysPerYear: 366 }).year, 36600);
  assert.equal(C.convert({ amount: -5, unit: "hour", hoursPerDay: 7, daysPerYear: 100 }).year, 0);
  assert.equal(C.convert({ unit: "hour", hoursPerDay: 7, daysPerYear: 100 }).year, 0);
});

// Pages : hypothèses par défaut tirées des calculateurs de taux de la même section, exemples recalculés, seuils lus
// dans les règles du pays.
import { readFileSync } from "node:fs";
const read = (f) => readFileSync(new URL("../../content/" + f, import.meta.url), "utf8").replace(/[  ]/g, " ");
const value = (html, id) => {
  const m = new RegExp(`id="${id}"[^>]*value="([^"]*)"`).exec(html);
  assert.ok(m, `champ ${id}`);
  return Number(m[1].replace(/\s/g, "").replace(",", "."));
};
const rules = (c) => {
  const d = JSON.parse(readFileSync(new URL(`../../data/rules/${c}.json`, import.meta.url)));
  return Object.fromEntries(Object.entries(d.values).map(([k, v]) => [k, v.value]));
};
const rule = (R, path) => path.split(".").reduce((v, k) => v[k], R);
const PAGES = {
  fr: ["fr/convertisseur-tjm.html", "fr/calculateur-tjm.html", "fr"],
  us: ["us/rate-converter.html", "us/hourly-rate-calculator.html", "us"],
  uk: ["uk/rate-converter.html", "uk/day-rate-calculator.html", "uk"],
  ca: ["ca/rate-converter.html", "ca/hourly-rate-calculator.html", "ca"],
  "ca-fr": ["ca-fr/convertisseur-de-tarifs.html", "ca-fr/calculateur-taux-horaire.html", "ca"]
};

test("pages : heures et jours facturés par défaut = ceux des calculateurs de taux (même formule)", () => {
  for (const [section, [page, ratePage]] of Object.entries(PAGES)) {
    const conv = read(page), rate = read(ratePage);
    let hours, days;
    if (section === "fr") {
      // tools/tjm.js : (365 − 104 − semaines × 5 − fériés) × (1 − non facturé).
      hours = value(rate, "t-hours");
      days = Math.round((365 - 104 - value(rate, "t-holidays") * 5 - value(rate, "t-public")) * (1 - value(rate, "t-unbilled") / 100));
    } else if (section === "uk") {
      // tools/uk-rate.js : (52 × 5 − semaines × 5 − bank holidays) × (1 − non facturé).
      hours = value(rate, "d-hours");
      days = Math.round((52 * 5 - value(rate, "d-holidays") * 5 - value(rate, "d-bank")) * (1 - value(rate, "d-unbilled") / 100));
    } else {
      // tools/us-rate.js et ca-rate.js : heures = (52 − semaines − fériés ÷ 5) × heures par semaine × (1 − non facturé).
      hours = value(rate, "h-hours") / 5;
      const perYear = Math.round((52 - value(rate, "h-weeks") - value(rate, "h-holidays") / 5) * value(rate, "h-hours") * (1 - value(rate, "h-unbilled") / 100));
      days = Math.round(perYear / hours);
    }
    assert.equal(value(conv, "rc-hours"), hours, `${section} : heures par jour`);
    assert.equal(value(conv, "rc-days"), days, `${section} : jours facturés par an`);
  }
});

test("pages : exemples du texte recalculés, seuils et sources présents dans les règles", () => {
  const ex = (amount, unit, h, d) => C.convert({ amount, unit, hoursPerDay: h, daysPerYear: d });
  const eur = (n) => Math.round(n).toLocaleString("fr-FR").replace(/\s/g, " ") + " €";
  const fr = read(PAGES.fr[0]), us = read(PAGES.us[0]), uk = read(PAGES.uk[0]), ca = read(PAGES.ca[0]), cafr = read(PAGES["ca-fr"][0]);
  assert.ok(fr.includes("450 € pour 7 heures font 64,29 € de l'heure"), "FR : taux horaire");
  assert.ok(fr.includes(`500 € par jour font ${eur(ex(500, "day", 7, 148).year)} de chiffre d'affaires annuel, soit ${eur(ex(500, "day", 7, 148).month)} par mois`), "FR : 500 € par jour");
  assert.ok(fr.includes("environ 228 jours ouvrés"), "FR : 365 − 104 − 25 − 8");
  for (const page of [us, ca]) {
    assert.ok(page.includes(`$100 an hour is $${ex(100, "hour", 8, 161).year.toLocaleString("en-US")} a year`), "100 $ de l'heure");
    assert.ok(page.includes("about 230 working days"), "260 − 20 − 10");
  }
  assert.ok(cafr.includes(`100 $ de l'heure font ${ex(100, "hour", 8, 162).year.toLocaleString("fr-CA").replace(/\s/g, " ")} $ par an`), "CA-FR : 100 $ de l'heure");
  assert.ok(cafr.includes("environ 232 jours ouvrables"), "CA-FR : 260 − 20 − 8");
  const R = { fr: rules("fr"), uk: rules("uk"), ca: rules("ca") };
  assert.ok(uk.includes(`£400 for 7.5 hours is £${(400 / 7.5).toFixed(2)} an hour`), "UK : taux horaire");
  const y500 = ex(500, "day", 7.5, 182).year;
  assert.ok(uk.includes(`£500 a day is £${y500.toLocaleString("en-GB")} a year`) && y500 > R.uk.vat_registration_threshold &&
    uk.includes(`£${R.uk.vat_registration_threshold.toLocaleString("en-GB")} VAT registration threshold`), "UK : 500 £ par jour et seuil de TVA");
  assert.ok(uk.includes("about 227 weekdays"), "UK : 260 − 25 − 8");
  for (const [section, [page, , country]] of Object.entries(PAGES)) {
    const html = read(page);
    const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
    const data = JSON.parse(/id="rate-converter-data">([\s\S]*?)<\/script>/.exec(html)[1]);
    assert.equal(front.id, "rate-converter");
    const Rc = rules(country);
    for (const key of front.sources || []) assert.ok(Rc[key] !== undefined, `${section} : source ${key}`);
    for (const t of data.thresholds) {
      assert.equal(typeof rule(Rc, t.rule), "number", `${section} : seuil ${t.rule}`);
      for (const v of Object.values(t.vars || {})) assert.equal(typeof rule(Rc, v), "number", `${section} : ${v}`);
      assert.ok((front.sources || []).includes(t.rule.split(".")[0]), `${section} : ${t.rule} cité dans les sources`);
    }
  }
});

test("calculateurs de taux : FAQ sur le temps facturable tirée des valeurs par défaut, sans statistique non sourcée", () => {
  const fr = read("fr/calculateur-tjm.html"), uk = read("uk/day-rate-calculator.html"), us = read("us/hourly-rate-calculator.html");
  const ca = read("ca/hourly-rate-calculator.html"), cafr = read("ca-fr/calculateur-taux-horaire.html");
  const hours = (html) => Math.round((52 - value(html, "h-weeks") - value(html, "h-holidays") / 5) * value(html, "h-hours") * (1 - value(html, "h-unbilled") / 100));
  assert.ok(fr.includes(`en compte ${value(fr, "t-unbilled")} %, ce qui laisse 148 jours facturables`), "TJM");
  assert.ok(uk.includes(`${value(uk, "d-unbilled")}% unbillable time, which leaves 182 billable days`), "day rate");
  for (const page of [us, ca]) assert.ok(page.includes(`which leaves ${hours(page).toLocaleString("en-US")} billable hours`), "hourly rate");
  assert.ok(cafr.includes(`${value(cafr, "h-holidays")} jours fériés`) && cafr.includes(`ce qui laisse ${hours(cafr).toLocaleString("fr-CA").replace(/\s/g, " ")} heures facturables`), "taux horaire (Québec)");
  for (const page of [fr, uk, us, ca, cafr]) assert.doesNotMatch(page, /[Mm]ost freelancers bill|La plupart (des freelances )?facturent/);
});
