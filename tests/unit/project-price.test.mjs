// Tests du calculateur de prix au forfait (moteur commun aux quatre pays). Valeurs attendues calculées à la main.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PP = require("../../src/assets/engines/project-price.js");

test("12 jours à 450 €, 10 % d'imprévus, sans TVA : 13,2 jours couverts, 5 940 € ; acompte de 30 % : 1 782 €", () => {
  const r = PP.price({ times: [2, 8, 2], rate: 450, contingency: 0.1, deposit: 0.3 });
  assert.equal(r.time, 12);
  assert.ok(Math.abs(r.covered - 13.2) < 1e-9);
  assert.deepEqual([r.fees, r.net, r.tax, r.gross, r.deposit, r.balance], [5940, 5940, 0, 5940, 1782, 4158]);
  assert.equal(r.offerRate, null);
});

test("TVA à 20 % : 5 940 € HT → 1 188 € de TVA, 7 128 € TTC, acompte de 30 % sur le TTC : 2 138,40 €", () => {
  const r = PP.price({ times: [2, 8, 2], rate: 450, contingency: 0.1, deposit: 0.3, components: [{ label: "TVA", rate: 0.2 }] });
  assert.deepEqual([r.net, r.tax, r.gross, r.deposit, r.balance], [5940, 1188, 7128, 2138.4, 4989.6]);
});

test("Québec : 56 h à 100 $, 10 % d'imprévus, 250 $ de frais → 6 410 $ ; TPS 320,50 $ et TVQ 639,40 $", () => {
  const r = PP.price({ times: [8, 40, 8], rate: 100, contingency: 0.1, expenses: 250,
    components: [{ label: "TPS", rate: 0.05 }, { label: "TVQ", rate: 0.09975 }] });
  // 61,6 h × 100 = 6 160 ; + 250 = 6 410 ; TVQ 6 410 × 9,975 % = 639,3975 → 639,40.
  assert.deepEqual([r.fees, r.expenses, r.net], [6160, 250, 6410]);
  assert.deepEqual(r.taxes.map((t) => t.amount), [320.5, 639.4]);
  assert.deepEqual([r.tax, r.gross], [959.9, 7369.9]);
});

test("prix proposé : 5 000 $ pour 56 h estimées et 250 $ de frais → 84,82 $ de l'heure", () => {
  const r = PP.price({ times: [8, 40, 8], rate: 100, contingency: 0.1, expenses: 250, offer: 5000 });
  assert.ok(Math.abs(r.offerRate - 4750 / 56) < 1e-9, String(r.offerRate));
  // Prix proposé inférieur aux frais : tarif réel négatif, que l'outil remplace par un message dédié.
  assert.ok(PP.price({ times: [1], rate: 100, expenses: 600, offer: 500 }).offerRate < 0);
});

test("arrondis au centime ; durées négatives ignorées ; refus sans durée ni tarif", () => {
  // 3 jours × 1,15 = 3,45 ; × 333,33 = 1 149,9885 → 1 149,99.
  assert.equal(PP.price({ times: [3, -2], rate: 333.33, contingency: 0.15 }).fees, 1149.99);
  assert.deepEqual(PP.price({ times: [], rate: 450 }), { error: "no_time" });
  assert.deepEqual(PP.price({ times: [0, -1], rate: 450 }), { error: "no_time" });
  assert.deepEqual(PP.price({ times: [1], rate: 0 }), { error: "no_rate" });
  // Acompte limité à 100 % ; sans imprévus, temps couvert = temps estimé.
  const r = PP.price({ times: [1], rate: 500, deposit: 1.5 });
  assert.deepEqual([r.covered, r.deposit, r.balance], [1, 500, 0]);
});

// Pages : exemples des FAQ recalculés à partir des valeurs par défaut, taxes lues dans les règles et citées en
// source, tarif par défaut identique à celui du convertisseur de la même section.
import { readFileSync } from "node:fs";
const read = (f) => readFileSync(new URL("../../content/" + f, import.meta.url), "utf8").replace(/[  ]/g, " ");
const rules = (c) => {
  const d = JSON.parse(readFileSync(new URL(`../../data/rules/${c}.json`, import.meta.url)));
  return Object.fromEntries(Object.entries(d.values).map(([k, v]) => [k, v.value]));
};
const num = (s) => Number(String(s).replace(/\s/g, "").replace(",", "."));
const PAGES = {
  fr: ["fr/calcul-prix-forfait.html", "fr/convertisseur-tjm.html", "fr", "Avec 12 jours estimés, 10 % d'imprévus et un TJM de 450 €, le prix est de {price} € HT."],
  us: ["us/project-price-calculator.html", "us/rate-converter.html", "us", "With 56 estimated hours, a 10% buffer and $100 an hour, the price is ${price}."],
  uk: ["uk/project-price-calculator.html", "uk/rate-converter.html", "uk", "With 12 estimated days, a 10% buffer and a £400 day rate, the price is £{price} before VAT."],
  ca: ["ca/project-price-calculator.html", "ca/rate-converter.html", "ca", "With 56 estimated hours, a 10% buffer and $100 an hour, the price is ${price} before sales tax."],
  "ca-fr": ["ca-fr/calcul-prix-forfaitaire.html", "ca-fr/convertisseur-de-tarifs.html", "ca", "Avec 56 heures estimées, 10 % d'imprévus et un taux de 100 $ de l'heure, le prix est de {price} $ avant taxes."]
};

test("pages : exemple de la FAQ = calcul avec les valeurs par défaut ; taxes des règles ; tarif du convertisseur", () => {
  for (const [section, [page, converter, country, sentence]] of Object.entries(PAGES)) {
    const html = read(page), conv = read(converter);
    const data = JSON.parse(/id="project-price-data">([\s\S]*?)<\/script>/.exec(html)[1]);
    const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
    const field = (h, id) => num(new RegExp(`id="${id}"[^>]*value="([^"]*)"`).exec(h)[1]);
    const selected = (h, id) => new RegExp(`id="${id}"[\\s\\S]*?<option value="(\\w+)" selected`).exec(h)[1];
    const r = PP.price({ times: data.default_lines.map((l) => num(l[1])), rate: field(html, "pp-rate"), contingency: field(html, "pp-contingency") / 100 });
    const locale = section === "fr" ? "fr-FR" : section === "ca-fr" ? "fr-CA" : "en-US";
    const price = r.net.toLocaleString(locale).replace(/\s/g, " ");
    assert.ok(html.includes(sentence.replace("{price}", price)), `${section} : exemple de la FAQ (${price})`);
    assert.equal(front.id, "project-price");
    for (const key of ["percent", "task", "task_placeholder", "remove", "units", "fields", "check", "check_notice", "enter_time", "enter_rate",
      "covered", "sub_tax", "tax", "offer_less", "offer_more", "offer_same", "offer_low", "msg_always", "default_lines"]) {
      assert.ok(data[key] !== undefined, `${section} : texte ${key}`);
    }
    assert.equal(field(html, "pp-rate"), field(conv, "rc-amount"), `${section} : tarif du convertisseur`);
    assert.equal(selected(html, "pp-unit"), selected(conv, "rc-unit"), `${section} : unité du convertisseur`);
    const R = rules(country);
    for (const o of data.taxes || []) for (const c of o.components || []) {
      assert.equal(typeof c.rule.split(".").reduce((v, k) => v[k], R), "number", `${section} : ${c.rule}`);
      assert.ok(front.sources.includes(c.rule.split(".")[0]), `${section} : ${c.rule} cité dans les sources`);
    }
    if (data.provinces) for (const key of ["gst_rate", "hst_rates", "qst_rate", "pst_on_professional_services"]) assert.ok(front.sources.includes(key), `${section} : ${key}`);
    for (const key of front.sources || []) assert.ok(R[key] !== undefined, `${section} : source ${key}`);
    assert.equal(/id="pp-tax"/.test(html), section !== "us", `${section} : champ de taxe`);
  }
});
