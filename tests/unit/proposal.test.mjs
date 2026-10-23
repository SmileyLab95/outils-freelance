// Tests de la proposition commerciale (documentation/30-proposition-commerciale.md) : moteur (totaux, acompte,
// validité), tableaux du moteur de rendu, puis les cinq pages rendues comme le fait tools/proposal.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const P = require("../../src/assets/engines/proposal.js");
const K = require("../../src/assets/engines/contract-doc.js");
const INV = require("../../src/assets/engines/invoice-fr.js");
import { ruleEntries, ruleValues } from "./regles.mjs";
const rules = ruleEntries;

test("lignes : vides ignorées, textes nettoyés, prix illisible ou négatif signalé et non compté", () => {
  const r = P.lines([{ name: " Ateliers ", duration: " 2 semaines ", price: 1800 }, {}, { name: "", duration: "", price: null },
    { name: "Inclus", price: null }, { name: "Erreur", price: NaN }, { name: "Négatif", price: -5 }, { price: 0 }]);
  assert.deepEqual(r.lines.map((l) => [l.index, l.name, l.duration, l.price]),
    [[0, "Ateliers", "2 semaines", 1800], [3, "Inclus", "", null], [4, "Erreur", "", null], [5, "Négatif", "", null], [6, "", "", 0]]);
  assert.deepEqual(r.invalid, [4, 5]);
  assert.deepEqual(P.lines(undefined), { lines: [], invalid: [] });
});

test("totaux au centime, acompte et solde, options à part", () => {
  const r = P.compute({ phases: [{ name: "A", price: 1800 }, { name: "B", price: 3200.5 }, { name: "C", price: null }],
    options: [{ name: "Maintenance", price: 600 }], deposit: 30, today: "2026-10-23", validity: "30" });
  assert.deepEqual([r.total, r.optionsTotal, r.deposit, r.depositAmount, r.balance], [5000.5, 600, 0.3, 1500.15, 3500.35]);
  assert.equal(P.compute({ phases: [{ name: "x", price: 0.1 }, { name: "y", price: 0.2 }] }).total, 0.3, "pas d'erreur d'arrondi");
  assert.equal(P.compute({ phases: [{ name: "x", price: 1000 }], deposit: 150 }).depositAmount, 1000, "acompte plafonné à 100 %");
  for (const deposit of [0, -10, NaN, undefined]) {
    const z = P.compute({ phases: [{ name: "x", price: 1000 }], deposit });
    assert.deepEqual([z.deposit, z.depositAmount, z.balance], [0, 0, 1000], `acompte ${deposit}`);
  }
  assert.equal(P.compute({ phases: [{ name: "x", price: 999.99 }], deposit: 33 }).depositAmount, 330, "arrondi au centime");
});

test("validité : date du jour + n jours, fin de mois, fin d'année, année bissextile", () => {
  assert.equal(P.compute({ today: "2026-10-23", validity: 30 }).validUntil, "2026-11-22");
  assert.equal(P.addDays("2027-01-31", 30), "2027-03-02");
  assert.equal(P.addDays("2026-12-15", 30), "2027-01-14");
  assert.equal(P.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(P.addDays("2027-02-28", 1), "2027-03-01");
  assert.equal(P.addDays("", 30), "");
  assert.equal(P.compute({ today: "2026-10-23", validity: "" }).validUntil, "");
});

test("tableaux du moteur de rendu : en-têtes, montants alignés, total, échappement, tableau vide absent", () => {
  const html = K.table({ head: ["Étape", "Prix"], num: [1], rows: [["<b>A</b>", "10 €"]], foot: [["Total", "10 €"]] });
  assert.equal(html, '<table class="k-table"><thead><tr><th>Étape</th><th class="num">Prix</th></tr></thead>' +
    '<tbody><tr><td>&lt;b&gt;A&lt;/b&gt;</td><td class="num">10 €</td></tr></tbody><tfoot><tr><td>Total</td><td class="num">10 €</td></tr></tfoot></table>');
  assert.equal(K.table({ head: ["x"], rows: [] }), "");
  assert.equal(K.table(undefined), "");
  const D = { doc_title: "T", article: "{n}. {title}", preamble: [], closing: [], signatures: [],
    clauses: [{ title: "Prix", paras: [{ table: "phases" }, { when: { x: ["on"] }, table: "options" }] }] };
  const out = K.render(D, { raw: { x: "off" }, text: {}, tables: { phases: { rows: [["a"]] }, options: { rows: [["b"]] } } });
  assert.ok(out.includes("<td>a</td>") && !out.includes("<td>b</td>"), "tableau conditionnel");
  assert.ok(!out.includes("k-signs"), "aucune signature : pas de bloc vide");
});

// ------------------------------------------------------------------------------------------------------------
// Pages : formulaire lu comme le fait tools/proposal.js.

const load = (path) => {
  const html = readFileSync(new URL(`../../content/${path}`, import.meta.url), "utf8");
  return { html, D: JSON.parse(/id="proposal-data">([\s\S]*?)<\/script>/.exec(html)[1]), front: JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]) };
};
function fields(html) {
  const form = /<form[^>]*id="proposal-form"[\s\S]*?<\/form>/.exec(html)[0], out = {};
  for (const m of form.matchAll(/<input type="(\w+)" (?:inputmode="decimal" )?id="([\w-]+)" name="(\w+)"([^>]*)>/g)) out[m[3]] = { id: m[2], type: m[1], value: (/ value="([^"]*)"/.exec(m[4]) || [, ""])[1] };
  for (const m of form.matchAll(/<textarea id="([\w-]+)" name="(\w+)"/g)) out[m[2]] = { id: m[1], type: "textarea", value: "" };
  for (const m of form.matchAll(/<select id="([\w-]+)" name="(\w+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const options = [...m[3].matchAll(/<option value="([^"]*)"( selected)?>([^<]*)<\/option>/g)].map((o) => ({ value: o[1], selected: !!o[2], text: o[3] }));
    out[m[2]] = { id: m[1], type: "select", options, value: (options.find((o) => o.selected) || options[0]).value };
  }
  return out;
}
const money = (x) => `${x.toFixed(2)} $`;
function view(page, set = {}, phases = [{ name: "Ateliers", duration: "2 weeks", price: 1800 }, { name: "Build", price: 3200 }], options = [], today = "2026-10-23") {
  const raw = {}, text = {};
  for (const [name, f] of Object.entries(fields(page.html))) {
    raw[name] = name in set ? set[name] : f.value;
    text[name] = f.type === "select" ? f.options.find((o) => o.value === raw[name]).text : raw[name];
  }
  const r = P.compute({ phases, options, deposit: Number(raw.deposit), today, validity: raw.validity });
  const tables = {};
  if (r.phases.length) tables.phases = { head: page.D.ui.phases.head, num: [2], foot: [[page.D.ui.total, "", money(r.total)]], rows: r.phases.map((l) => [l.name || "–", l.duration || "–", l.price === null ? "–" : money(l.price)]) };
  if (r.options.length) tables.options = { head: page.D.ui.options.head, num: [1], rows: r.options.map((l) => [l.name || "–", money(l.price)]) };
  Object.assign(text, { total: r.total > 0 ? money(r.total) : "", deposit: r.deposit > 0 ? String(r.deposit * 100) : "",
    deposit_amount: r.deposit > 0 && r.total > 0 ? money(r.depositAmount) : "", balance: r.deposit > 0 && r.total > 0 ? money(r.balance) : "",
    valid_until: r.validUntil, start: raw.start || "", today });
  if (page.front.rules === "fr") text.franchise = INV.franchiseMention(today, ruleValues("fr"));
  const flags = K.flags(raw);
  Object.assign(flags, { has_phases: r.phases.length ? "on" : "off", has_options: r.options.length ? "on" : "off", has_deposit: r.deposit > 0 ? "on" : "off" });
  return K.render(page.D, { raw: flags, text, tables });
}
const plain = (html) => html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
const FULL = { p_name: "Me", c_name: "Client", context: "Context", approach: "Approach" };

const PAGES = {
  "fr/proposition-commerciale.html": { lang: "fr", notContract: "Elle ne constitue pas un contrat : nous nous engagerons l'un envers l'autre par la signature du devis ou du contrat.",
    tax: "hors taxes" },
  "us/business-proposal-template.html": { lang: "en", notContract: "It is not a contract: we will both be bound once the contract is signed.",
    tax: "Fees do not include sales tax, which will be added where applicable." },
  "uk/business-proposal-template.html": { lang: "en", notContract: "It is not a contract: we will both be bound once the contract is signed.",
    tax: "I am not registered for VAT, so no VAT is charged." },
  "ca/business-proposal-template.html": { lang: "en", notContract: "It is not a contract: we will both be bound once the contract is signed.",
    tax: "Fees are exclusive of GST/HST and, where applicable, QST or PST, which will be added at the applicable rates." },
  "ca-fr/proposition-commerciale.html": { lang: "fr", notContract: "Elle ne constitue pas un contrat : nous serons liés par la signature du contrat.",
    tax: "Ce prix exclut la TPS/TVH et, le cas échéant, la TVQ ou la TVP, qui s'ajoutent aux taux applicables." },
};
const COMPUTED = ["total", "deposit_amount", "balance", "valid_until", "today", "phases", "franchise"];

for (const [path, L] of Object.entries(PAGES)) {
  test(`${path} : formulaire, clés des textes, FAQ et liens`, () => {
    const page = load(path), f = fields(page.html);
    assert.equal(page.front.id, "proposal");
    assert.deepEqual(page.front.scripts.slice(-3), ["engines/proposal.js", "engines/contract-doc.js", "tools/proposal.js"]);
    assert.ok(page.front.title.length <= 60 && page.front.description.length <= 160, "titre et description");
    assert.ok(page.front.faq.length >= 3 && page.front.faq.length <= 6, "FAQ de 3 à 6 questions");
    for (const name of ["p_name", "p_email", "c_name", "title", "context", "goals", "approach", "deposit", "terms", "start", "validity", "why", "references"]) assert.ok(f[name], name);
    assert.deepEqual(f.validity.options.map((o) => o.value), ["15", "30", "60", "90"]);
    assert.equal(f.validity.value, "30");
    for (const id of ["pr-phases", "pr-options", "pr-add-phase", "pr-add-option", "pr-notice", "pr-preview", "pr-print", "pr-word", "pr-copy", "pr-reset"]) assert.match(page.html, new RegExp(`id="${id}"`), id);
    const keys = new Set([...JSON.stringify(page.D).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => !["n", "title", "list"].includes(k)));
    for (const k of keys) {
      assert.ok(f[k] || COMPUTED.includes(k), `clé {${k}} sans champ`);
      if (!["p_status", "p_email", "p_phone", "p_site", "c_rep", "goals", "why", "references", "start", "deposit", "franchise"].includes(k)) assert.ok(page.D.hints[k], `repère de {${k}}`);
    }
    assert.equal(page.D.ui.phases.head.length, 3);
    assert.equal(page.D.ui.options.head.length, 2);
    assert.ok(page.D.ui.invalid.includes("{list}") && page.D.ui.phases.remove.includes("{n}"));
    for (const id of ["contract", "invoice", "project-price"]) assert.match(page.html, new RegExp(`\\{\\{link:${id}\\}\\}`), `lien ${id}`);
  });

  test(`${path} : document rendu, sections facultatives, taxes, « pas un contrat »`, () => {
    const page = load(path);
    const base = plain(view(page, FULL));
    assert.ok(base.includes(L.notContract), "pas un contrat");
    assert.ok(base.includes(L.tax), "taxes");
    assert.ok(!/k-blank|\{\w+\}|\[\[/.test(base), "aucune clé brute ni repère, document rempli");
    assert.ok(base.includes("2026-11-22"), "validité de 30 jours");
    // Sections facultatives : objectifs, « pourquoi moi », options ; numérotation continue.
    assert.ok(!/(Vos objectifs|Your goals|Pourquoi travailler|Why work with me)/.test(base));
    const titles = (html) => [...html.matchAll(/<h3>(\d+)\. /g)].map((m) => Number(m[1]));
    assert.deepEqual(titles(view(page, FULL)), [1, 2, 3, 4, 5]);
    const all = view(page, { ...FULL, goals: "G", why: "W" }, undefined, [{ name: "Maintenance", price: 600 }]);
    assert.deepEqual(titles(all), [1, 2, 3, 4, 5, 6, 7]);
    assert.ok(plain(all).includes("Maintenance 600.00 $") && plain(all).includes("Total 5000.00 $"), "options et total");
    assert.ok(plain(view(page, { ...FULL, references: "R" })).match(/(Références|References) : ?R|References: R/), "références seules");
    // Acompte : 30 % par défaut, montant et solde ; sans acompte, facture à la livraison.
    assert.ok(base.includes("1500.00 $") && base.includes("3500.00 $"), "acompte et solde");
    const none = plain(view(page, { ...FULL, deposit: "0" }));
    assert.ok(/(Le prix est facturé à la livraison|The fee is invoiced on delivery)/.test(none) && !none.includes("1500.00"));
    // Sans étape : repère à compléter ; avec une date de début : démarrage.
    assert.ok(view(page, FULL, []).includes("k-blank"), "étapes à compléter");
    assert.ok(plain(view(page, { ...FULL, start: "2027-01-04" })).includes("2027-01-04"), "date de début");
  });
}

test("France : mention de franchise datée (art. 293 B du CGI, puis CIBS en 2027), TVA, articles cités conformes", () => {
  const page = load("fr/proposition-commerciale.html"), R = rules("fr");
  assert.ok(page.front.scripts.includes("engines/invoice-fr.js") && page.front.sources.includes("mention_franchise_tva_2027"));
  assert.ok(plain(view(page, FULL)).includes("TVA non applicable, art. 293 B du CGI."));
  assert.ok(plain(view(page, FULL, undefined, [], "2027-01-04")).includes(`${R.mention_franchise_tva_2027.value.text} (ex-art. 293 B du CGI).`));
  assert.ok(plain(view(page, { ...FULL, vat: "vat" })).includes("majoré de la TVA") && !plain(view(page, { ...FULL, vat: "vat" })).includes("293 B"));
  const faq = page.front.faq.flat().join(" ");
  assert.match(R.offre_et_acceptation.source_title, /art\. 1114/);
  assert.match(R.offre_et_acceptation.more_sources[0].source_title, /art\. 1116/);
  assert.match(R.offre_et_acceptation.more_sources[1].source_title, /1117/);
  assert.ok(faq.includes("(article 1114)") && faq.includes("articles 1116 et 1117 du Code civil"));
  assert.ok(faq.includes("31 décembre 2026") && faq.includes("1er janvier 2027"), "FAQ : changement de mention");
});

test("FAQ des taxes : même phrase que le document", () => {
  for (const path of Object.keys(PAGES).filter((p) => !p.startsWith("fr/"))) {
    const page = load(path), faq = page.front.faq.flat().join(" ");
    const sentence = PAGES[path].tax.replace("I am not registered for VAT, so no VAT is charged.", "no VAT is charged");
    assert.ok(faq.includes(sentence.replace(/^Fees/, "fees").replace(/^Ce prix/, "le prix")) || faq.includes(sentence), `${path} : ${sentence}`);
  }
});

test("Royaume-Uni : TVA selon l'inscription, orthographe britannique", () => {
  const page = load("uk/business-proposal-template.html");
  assert.ok(plain(view(page, { ...FULL, vat: "vat" })).includes("Fees are exclusive of VAT, which will be added at the applicable rate."));
  assert.doesNotMatch(page.html, /moderniz/);
});

test("contrat de prestation français : même mention de franchise datée que les factures", () => {
  const html = readFileSync(new URL("../../content/fr/contrat-de-prestation.html", import.meta.url), "utf8");
  const D = JSON.parse(/id="contract-data">([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.ok(JSON.stringify(D).includes('"text":"{franchise}"') && !JSON.stringify(D).includes("293 B"), "plus de mention figée");
  assert.ok(/"engines\/invoice-fr\.js"/.test(html) && /"mention_franchise_tva_2027"/.test(html));
  assert.equal(INV.franchiseMention("2026-12-31", ruleValues("fr")), "TVA non applicable, art. 293 B du CGI.");
  assert.equal(INV.franchiseMention("2027-01-01", ruleValues("fr")), "TVA non applicable, art. L. 233-3 du CIBS (ex-art. 293 B du CGI).");
});
