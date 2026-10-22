// Tests des jauges de seuils hors de France (documentation/21-jauges-de-seuils.md) : chaque seuil est lu dans les
// règles, aucun montant n'est écrit dans les scripts ni dans les messages des pages, et chaque règle utilisée est
// citée dans les sources de la page. L'affichage (pourcentages, couleurs, messages) est vérifié par le parcours
// navigateur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const rulesOf = (country) => JSON.parse(read(`data/rules/${country}.json`)).values;
const front = (html) => JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);

const PAGES = [
  { script: "src/assets/tools/uk-tax.js", pages: ["content/uk/self-employed-tax-calculator.html"], country: "uk" },
  { script: "src/assets/tools/us-tax.js", pages: ["content/us/self-employment-tax-calculator.html"], country: "us" },
  { script: "src/assets/tools/ca-tax.js", country: "ca",
    pages: ["content/ca/self-employed-tax-calculator.html", "content/ca-fr/calculateur-impot-travailleur-autonome.html"] }
];

/** Corps de la fonction thresholds() d'un script. */
function thresholdsBody(source) {
  const start = source.indexOf("function thresholds(");
  assert.ok(start >= 0, "fonction thresholds() présente");
  return source.slice(start, source.indexOf("\n  }\n", start));
}

/** Nombres écrits dans du code ou du texte, noms de règles et de variables retirés (mtd_itsa_threshold_2026…). */
const numbers = (code) => code.replace(/\b[A-Za-z_$][\w$]*\b/g, " ").match(/\d+(?:[.,]\d+)*/g) || [];

test("jauges : aucun montant ni pourcentage écrit dans les scripts, seuils lus dans les règles", () => {
  for (const { script, country } of PAGES) {
    const body = thresholdsBody(read(script));
    // Seuls nombres admis : indices et décimales d'OF.money (0 à 2) ; au Royaume-Uni, les années des paliers de
    // Making Tax Digital et les délais de la TVA, écrits dans les règles (vérifié ci-dessous).
    const R = rulesOf(country);
    const ukText = { "2026": "mtd_itsa_threshold_2026", "2027": "mtd_itsa_threshold_2027", "2028": "mtd_itsa_threshold_2028",
                     "12": "vat_registration_threshold", "30": "vat_registration_threshold" };
    const ruleText = (key) => `${R[key].label} ${R[key].note}`;
    const left = numbers(body).filter((n) => !/^[0-2]$/.test(n) && !(country === "uk" && n in ukText && ruleText(ukText[n]).includes(n)));
    assert.deepEqual(left, [], `${script} : nombres écrits dans le script`);
    for (const [, key] of body.matchAll(/\bR\.(\w+)/g)) assert.ok(key in R, `${script} : règle ${key} absente de data/rules/${country}.json`);
  }
});

test("jauges : règles utilisées citées dans les sources de chaque page", () => {
  for (const { script, pages, country } of PAGES) {
    const used = [...new Set([...thresholdsBody(read(script)).matchAll(/\bR\.(\w+)/g)].map((m) => m[1]))];
    // Règles lues par le moteur pour la jauge des acomptes canadiens (OFE.taxCA.instalments).
    if (country === "ca") used.push("instalment_threshold", "instalment_threshold_quebec");
    for (const page of pages) {
      const sources = front(read(page)).sources;
      for (const key of used) assert.ok(sources.includes(key), `${page} : règle ${key} absente des sources`);
    }
  }
});

test("jauges du Canada : messages et libellés sans montant (seuil inséré depuis les règles), mêmes clés en anglais et en français", () => {
  const data = (page) => JSON.parse(/<script type="application\/json" id="ca-tax-data">([\s\S]*?)<\/script>/.exec(read(page))[1]);
  const [en, fr] = PAGES[2].pages.map(data);
  const keys = Object.keys(en).filter((k) => /^(gst|inst)_label|^gst_/.test(k));
  assert.equal(keys.length, 10);
  for (const k of keys) {
    for (const [lang, L] of [["en", en], ["fr", fr]]) {
      assert.equal(typeof L[k], "string", `${lang} : ${k}`);
      assert.deepEqual(numbers(L[k].replace(/\{threshold\}/g, "")), [], `${lang} : ${k} sans montant écrit`);
    }
    assert.equal(/\{threshold\}/.test(en[k]), /\{threshold\}/.test(fr[k]), `${k} : seuil cité dans les deux langues`);
  }
});

test("jauges : pages sans JavaScript → jauges à « – », barres vides", () => {
  for (const { pages } of PAGES) {
    for (const page of pages) {
      const html = read(page);
      const gauges = [...html.matchAll(/<b id="(g-[\w-]+)">([^<]*)<\/b>/g)];
      assert.ok(gauges.length >= 2, `${page} : jauges présentes`);
      for (const [, id, value] of gauges) {
        assert.equal(value, "–", `${page} : ${id}`);
        assert.match(html, new RegExp(`<div class="progress"><div id="${id}-bar"></div></div>`), `${page} : barre ${id}`);
      }
    }
  }
});
