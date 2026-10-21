// Tests des listes de vérification (checklist.js) : chaque élément des règles officielles est repris exactement une
// fois, et chaque point n'est montré que dans la situation à laquelle il s'applique. Le comportement dans la page
// (filtres, compte, messages) est vérifié par le parcours navigateur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const rulesOf = (country) => JSON.parse(read(`data/rules/${country}.json`)).values;
const CONDITION = /^(!?)([\w-]+)(?:=([\w-]+))?$/;   // même grammaire que checklist.js

/**
 * Points de la liste #checklist : règles couvertes (« clé:indice », « clé.palier:indice » ou « clé » pour une règle à
 * valeur unique), condition d'affichage, point recommandé.
 */
function items(html) {
  const list = /<ul class="checklist" id="checklist"[\s\S]*?<\/ul>/.exec(html)[0];
  return [...list.matchAll(/<li([^>]*)>/g)].map(([, attrs]) => ({
    rules: (/data-rule="([^"]*)"/.exec(attrs) || [, ""])[1].split(/\s+/).filter(Boolean).map((r) => {
      const [key, index] = r.split(":");
      return { key, index: index === undefined ? null : Number(index) };
    }),
    when: (/data-when="([^"]*)"/.exec(attrs) || [, null])[1],
    optional: /\sdata-optional\b/.test(attrs)
  }));
}
/** Nombre de points comptés dans une situation (les points recommandés sont montrés, pas comptés). */
const applies = (conds, s) => conds.trim().split(/\s+/).every((cond) => {
  const [, not, key, value] = CONDITION.exec(cond);
  const ok = value !== undefined ? String(s[key]) === value : !!s[key];
  return not ? !ok : ok;
});
const front = (html) => JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
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
  for (const key of ukLists) assert.ok(front(UK).sources.includes(key), `${key} figure dans les sources de la page`);
});

test("Royaume-Uni : chaque point n'est montré que dans sa situation, et seul le recommandé est hors du compte", () => {
  for (const item of ukItems) {
    const keys = item.rules.map((r) => r.key), label = item.rules.map((r) => `${r.key}:${r.index}`).join(" ");
    if (item.when) for (const cond of item.when.split(/\s+/)) assert.match(cond, CONDITION, `${label} : condition lisible`);
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
  for (const page of ["content/uk/invoice-requirements.html", "content/fr/mentions-obligatoires-facture.html",
    "content/ca/invoice-requirements.html", "content/ca-fr/mentions-facture.html"]) {
    const html = read(page);
    for (const attr of ["data-score", "data-all", "data-none", "data-missing-one", "data-missing-many"])
      assert.match(html, new RegExp(`${attr}="[^"]+"`), `${page} : ${attr}`);
  }
  assert.match(read("content/fr/mentions-obligatoires-facture.html"), /data-score="\{done\} sur \{total\} mentions"/);
});

// Canada : mentions qui permettent au client de demander ses CTI (DORS/91-45) et, au Québec, ses RTI ; une page en
// anglais et une en français, avec les mêmes points.
const CA = read("content/ca/invoice-requirements.html"), CA_FR = read("content/ca-fr/mentions-facture.html");
const caRules = rulesOf("ca");
const caItems = items(CA);
const META = /^Everything required/;   // « tout ce qui est exigé au palier précédent » : pas un point de la liste

test("Canada : chaque point est sourcé, chaque mention des paliers reprise une fois, mêmes points en français", () => {
  assert.ok(caItems.length > 0 && caItems.every((i) => i.rules.length === 1), "chaque point porte une seule règle");
  const tiers = caRules.itc_invoice_requirements.value;
  for (const [tier, list] of Object.entries(tiers)) {
    const key = `itc_invoice_requirements.${tier}`;
    const seen = caItems.flatMap((i) => i.rules).filter((r) => r.key === key).map((r) => r.index).sort((a, b) => a - b);
    const expected = list.map((text, i) => (META.test(text) ? null : i)).filter((i) => i !== null);
    assert.deepEqual(seen, expected, `${key} : indices repris ${seen.join(", ")}`);
  }
  for (const key of ["qst_registration_number_on_invoices", "quebec_invoices_in_french"])
    assert.equal(caItems.filter((i) => i.rules[0].key === key && i.rules[0].index === null).length, 1, `${key} repris une fois`);
  const known = new Set([...Object.keys(tiers).map((t) => `itc_invoice_requirements.${t}`), "qst_registration_number_on_invoices", "quebec_invoices_in_french"]);
  assert.deepEqual(caItems.flatMap((i) => i.rules).filter((r) => !known.has(r.key)), [], "aucune référence à une autre règle");
  for (const html of [CA, CA_FR]) {
    for (const key of ["itc_invoice_requirements", "qst_registration_number_on_invoices", "quebec_invoices_in_french", "small_supplier_not_required_to_collect", "small_supplier_threshold"])
      assert.ok(front(html).sources.includes(key), `${key} figure dans les sources`);
    assert.equal(front(html).id, "invoice-rules", "même identifiant que les listes française et britannique");
  }
  const strip = (list) => list.map(({ rules, when, optional }) => JSON.stringify({ rules, when, optional }));
  assert.deepEqual(strip(items(CA_FR)), strip(caItems), "page française : mêmes points, mêmes conditions, même ordre");
});

test("Canada : chaque point n'est montré qu'à partir de son palier et dans sa situation", () => {
  const expected = {
    "itc_invoice_requirements.under_100": null,
    "itc_invoice_requirements.100_to_499_99": "gst !amount=under100",
    "itc_invoice_requirements.500_and_over": "gst amount=500plus",
    qst_registration_number_on_invoices: "gst quebec !amount=under100",
    quebec_invoices_in_french: "quebec"
  };
  for (const item of caItems) assert.equal(item.when, expected[item.rules[0].key], item.rules[0].key);
  assert.equal(caRules.qst_registration_number_on_invoices.value, 100, "numéro de TVQ à partir de 100 $ (règle)");
  // Rappels : petit fournisseur sans inscription ; renvoi à Revenu Québec sous 500 $ pour un inscrit au Québec.
  for (const html of [CA, CA_FR])
    assert.deepEqual([...html.matchAll(/data-show-when="([^"]*)"/g)].map((m) => m[1]), ["!gst", "gst quebec !amount=500plus"], "conditions des rappels");
  for (const html of [CA, CA_FR])
    for (const [name, value] of [["amount", "under100"], ["amount", "100to499"], ["amount", "500plus"], ["gst"], ["quebec"]])
      assert.match(html, new RegExp(`name="${name}"${value ? ` value="${value}"` : ""}[^>]*data-save`), `champ ${name} ${value || ""} présent et mémorisé`);
});

test("Canada : nombre de mentions selon la situation, seuils repris des règles", () => {
  const n = (amount, gst, quebec) => counted(caItems, { amount, gst, quebec });
  assert.equal(n("500plus", true, false), 8);
  assert.equal(n("500plus", true, true), 10);
  assert.equal(n("100to499", true, false), 5);
  assert.equal(n("100to499", true, true), 7);
  assert.equal(n("under100", true, false), 3);
  assert.equal(n("under100", true, true), 4);
  assert.equal(n("500plus", false, false), 3);
  assert.equal(n("500plus", false, true), 4);
  assert.match(CA, /id="cl-score">0 of 8 details</);
  assert.match(CA_FR, /id="cl-score">0 sur 8 mentions</);
  const threshold = caRules.small_supplier_threshold.value;   // 30 000 $
  assert.ok(CA.includes(`$${threshold.toLocaleString("en-CA")}`) && CA_FR.includes(`${threshold.toLocaleString("fr-CA").replace(/\s/g, " ")} $`),
    "seuil du petit fournisseur repris de la règle, dans les deux langues");
  for (const html of [CA, CA_FR]) {
    for (const example of Object.values(caRules.tax_number_formats.value).map((f) => /e\.g\. (.+)$/.exec(f)[1]))
      assert.ok(html.includes(example), `exemple de numéro ${example} repris de la règle`);
    assert.ok(/\$100\b|100 \$/.test(html) && /\$500\b|500 \$/.test(html), "seuils de 100 $ et 500 $ (paliers de la règle)");
  }
  assert.deepEqual(Object.keys(caRules.itc_invoice_requirements.value), ["under_100", "100_to_499_99", "500_and_over"], "paliers de la règle");
});
