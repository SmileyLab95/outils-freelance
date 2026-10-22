// Sections W-8BEN des pages « client étranger » (documentation/22-client-etranger-us-et-w8ben.md, § 2) : règles
// communes citées, chiffres et formulaires repris des règles, même contenu dans chaque pays et chaque langue.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ruleEntries } from "./regles.mjs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const front = (html) => JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
const text = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const PAGES = [
  { file: "content/fr/facturer-client-etranger.html", rules: "fr", lang: "fr", heading: "Client américain : le formulaire W-8BEN", place: "la France" },
  { file: "content/uk/invoicing-overseas-clients.html", rules: "uk", lang: "en", heading: "US clients: Form W-8BEN", place: "the UK" },
  { file: "content/ca/invoicing-clients-outside-canada.html", rules: "ca", lang: "en", heading: "US clients: Form W-8BEN", place: "Canada" },
  { file: "content/ca-fr/facturer-client-etranger.html", rules: "ca", lang: "fr", heading: "Client américain : le formulaire W-8BEN", place: "le Canada" }
];
const RULES = ["w8ben_purpose", "w8ben_services_outside_us", "w8ben_validity"];

/** Texte de la section W-8BEN (du titre au titre suivant ou à la fin de la partie). */
function section(html, heading) {
  const start = html.indexOf(`<h2>${heading}</h2>`);
  assert.ok(start >= 0, `section « ${heading} »`);
  const ends = ["<h2>", '<p class="small muted">', "</section>"].map((tag) => html.indexOf(tag, start + 4)).filter((i) => i > 0);
  return text(html.slice(start, Math.min(...ends)));
}

test("W-8BEN : section, FAQ et règles citées dans les quatre pages", () => {
  for (const p of PAGES) {
    const html = read(p.file), meta = front(html), rules = ruleEntries(p.rules);
    for (const key of RULES) {
      assert.ok(meta.sources.includes(key), `${p.file} : source ${key}`);
      assert.ok(rules[key], `${p.rules} : règle ${key} disponible (règles communes)`);
    }
    assert.ok(meta.faq.some(([q, a]) => q.includes("W-8BEN") && a.includes(p.place)), `${p.file} : question W-8BEN`);
    assert.ok(section(html, p.heading).includes(p.place), `${p.file} : lieu du travail`);
  }
});

test("W-8BEN : chiffres et formulaires repris des règles", () => {
  const R = ruleEntries("us");
  const years = R.w8ben_validity.value.years_after_signing;
  for (const p of PAGES) {
    const html = read(p.file), s = section(html, p.heading);
    const faq = front(html).faq.find(([q]) => q.includes("W-8BEN"))[1];
    // Retenue de 30 % : celle de la règle.
    assert.match(R.w8ben_purpose.value, /withhold 30%/);
    assert.match(s, p.lang === "fr" ? /retenir 30 %/ : /withhold 30%/, `${p.file} : 30 %`);
    assert.match(faq, p.lang === "fr" ? /retenir 30 %/ : /withhold 30%/, `${p.file} : 30 % (FAQ)`);
    // Formulaires cités : ceux de la règle.
    for (const form of ["W-8BEN-E", "8233"]) {
      assert.ok(R.w8ben_purpose.value.includes(form), `règle : ${form}`);
      assert.ok(s.includes(form), `${p.file} : ${form}`);
    }
    // Durée : un formulaire signé en 2026 vaut jusqu'à la fin de 2026 + 3.
    assert.ok(s.includes(`2026`) && s.includes(String(2026 + years)), `${p.file} : validité jusqu'à fin ${2026 + years}`);
    assert.ok(s.includes(p.lang === "fr" ? "troisième année" : "third year"), `${p.file} : troisième année (règle : ${years})`);
    assert.equal(years, 3);
  }
});

test("W-8BEN : même contenu dans les pages d'une même langue, au lieu du travail près", () => {
  for (const lang of ["fr", "en"]) {
    const [a, b] = PAGES.filter((p) => p.lang === lang).map((p) => section(read(p.file), p.heading)
      .replace(p.place, "{place}").replace(/31 December|December 31/, "{date}").replace(/sole traders|sole proprietors/, "{who}"));
    assert.equal(a, b, `pages en ${lang}`);
  }
});
