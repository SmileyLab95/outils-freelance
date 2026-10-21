// Tests des listes de vérification (checklist.js) : chaque élément des règles officielles est repris exactement une
// fois, et chaque point n'est montré que dans la situation à laquelle il s'applique. Le comportement dans la page
// (filtres, compte, messages) est vérifié par le parcours navigateur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const rulesOf = (country) => JSON.parse(read(`data/rules/${country}.json`)).values;
const CONDITION = /^(!?)([\w-]+)(?:=([\w-]+))?$/;   // même grammaire que checklist.js

/** Points de la liste #checklist : règles couvertes (« clé:indice »), condition d'affichage, point recommandé. */
function items(html) {
  const list = /<ul class="checklist" id="checklist"[\s\S]*?<\/ul>/.exec(html)[0];
  return [...list.matchAll(/<li([^>]*)>/g)].map(([, attrs]) => ({
    rules: (/data-rule="([^"]*)"/.exec(attrs) || [, ""])[1].split(/\s+/).filter(Boolean).map((r) => {
      const [key, index] = r.split(":");
      return { key, index: Number(index) };
    }),
    when: (/data-when="([^"]*)"/.exec(attrs) || [, null])[1],
    optional: /\sdata-optional\b/.test(attrs)
  }));
}
/** Nombre de points comptés dans une situation (les points recommandés sont montrés, pas comptés). */
function applies(cond, s) {
  const [, not, key, value] = CONDITION.exec(cond);
  const ok = value !== undefined ? String(s[key]) === value : !!s[key];
  return not ? !ok : ok;
}
const counted = (list, s) => list.filter((i) => !i.optional && (!i.when || applies(i.when, s))).length;

const UK = read("content/uk/invoice-requirements.html");
const ukRules = rulesOf("uk");
const ukItems = items(UK);
const ukLists = ["invoice_requirements_all", "invoice_requirements_sole_trader", "invoice_requirements_limited_company", "vat_invoice_full_requirements"];

test("Royaume-Uni : chaque point est sourcé, et chaque élément des listes officielles repris exactement une fois", () => {
  assert.ok(ukItems.length > 0 && ukItems.every((i) => i.rules.length), "chaque point de la liste porte data-rule");
  for (const key of ukLists) {
    const list = ukRules[key].value;
    const seen = ukItems.flatMap((i) => i.rules).filter((r) => r.key === key).map((r) => r.index).sort((a, b) => a - b);
    assert.deepEqual(seen, list.map((_, i) => i), `${key} : indices repris ${seen.join(", ")} pour ${list.length} éléments`);
  }
  const unknown = ukItems.flatMap((i) => i.rules).filter((r) => !ukLists.includes(r.key));
  assert.deepEqual(unknown, [], "aucune référence à une autre règle");
  const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(UK)[1]);
  for (const key of ukLists) assert.ok(front.sources.includes(key), `${key} figure dans les sources de la page`);
});

test("Royaume-Uni : chaque point n'est montré que dans sa situation, et seul le recommandé est hors du compte", () => {
  for (const item of ukItems) {
    const keys = item.rules.map((r) => r.key), label = item.rules.map((r) => `${r.key}:${r.index}`).join(" ");
    if (item.when) assert.match(item.when, CONDITION, `${label} : condition lisible`);
    if (keys.includes("invoice_requirements_sole_trader")) assert.equal(item.when, "business=sole", label);
    else if (keys.includes("invoice_requirements_limited_company")) assert.equal(item.when, "business=ltd", label);
    // Pour toutes les factures, sauf la TVA, qu'une entreprise non immatriculée ne doit pas faire figurer.
    else if (item.rules.some((r) => r.key === "invoice_requirements_all" && !/VAT/.test(ukRules.invoice_requirements_all.value[r.index])))
      assert.equal(item.when, null, label);
    else assert.equal(item.when, "vat", label);
    // Seul point non obligatoire sur la facture : numéro, siège et lieu d'immatriculation de la société (règle).
    assert.equal(item.optional, label === "invoice_requirements_limited_company:2", `${label} : recommandé ou obligatoire`);
  }
  assert.match(ukRules.invoice_requirements_limited_company.value[2], /best practice/, "la règle dit « best practice »");
  // Les conditions ne visent que les champs du formulaire de situation, mémorisés.
  for (const cond of ["business=sole", "business=ltd", "vat"]) {
    const [name, value] = cond.split("=");
    assert.match(UK, new RegExp(`name="${name}"${value ? ` value="${value}"` : ""}[^>]*data-save`), `champ ${cond} présent et mémorisé`);
  }
});

test("Royaume-Uni : nombre de points selon la situation, facture simplifiée et textes du score", () => {
  assert.equal(counted(ukItems, { business: "sole", vat: false }), 11);
  assert.equal(counted(ukItems, { business: "sole", vat: true }), 18);
  assert.equal(counted(ukItems, { business: "ltd", vat: false }), 10);
  assert.equal(counted(ukItems, { business: "ltd", vat: true }), 17);
  assert.match(UK, /id="cl-score">0 of 11 details</, "score affiché sans JavaScript : situation par défaut");
  assert.ok(UK.includes(`£${ukRules.vat_invoice_simplified_threshold.value} or less`), "seuil de la facture simplifiée repris de la règle");
});

test("textes du score et des messages présents sur chaque liste", () => {
  for (const page of ["content/uk/invoice-requirements.html", "content/fr/mentions-obligatoires-facture.html"]) {
    const html = read(page);
    for (const attr of ["data-score", "data-all", "data-none", "data-missing-one", "data-missing-many"])
      assert.match(html, new RegExp(`${attr}="[^"]+"`), `${page} : ${attr}`);
  }
  assert.match(read("content/fr/mentions-obligatoires-facture.html"), /data-score="\{done\} sur \{total\} mentions"/);
});
