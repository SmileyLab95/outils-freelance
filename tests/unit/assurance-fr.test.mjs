// Tests du moteur « assurances de l'indépendant » (documentation/15-guides-gestion.md, § 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const A = require("../../src/assets/engines/assurance-fr.js");
const rules = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url))).values;

test("règles sourcées : décennale, attestation, mention sur les devis et factures, RC pro, véhicule", () => {
  for (const key of ["assurance_rc_pro", "assurance_decennale", "assurance_attestation_decennale", "assurance_mention_devis_factures", "assurance_rc_auto"]) {
    assert.ok(rules[key] && /^https:\/\/(www\.)?(legifrance|economie)\.gouv\.fr\//.test(rules[key].source), key);
  }
  assert.equal(rules.assurance_rc_pro.value.obligation_generale, false);
});

test("travaux de construction : décennale obligatoire, responsabilité civile à vérifier, attestation jointe", () => {
  for (const micro of [true, false]) {
    const r = A.check({ activity: "construction", micro, vehicle: false });
    assert.deepEqual([r.required, r.recommended], [["decennale"], ["rc-batiment"]], "pas d'obligation de RC pro affirmée sans article de loi");
    assert.equal(r.documents, "attestation", "la mention de l'art. L132-1 ne s'applique pas aux constructeurs");
  }
});

test("profession réglementée : responsabilité civile selon la profession ; mention si micro-entrepreneur", () => {
  assert.deepEqual(A.check({ activity: "reglementee", micro: true }), { activity: "reglementee", required: ["rc-profession"], recommended: [], documents: "mention" });
  assert.equal(A.check({ activity: "reglementee", micro: false }).documents, "none");
  assert.equal(A.check({ activity: "reglementee", micro: false, artisan: true }).documents, "mention", "artisan immatriculé, sans être micro-entrepreneur");
});

test("artisan hors bâtiment : à vérifier pour son métier ; mention due si une assurance est obligatoire", () => {
  for (const micro of [true, false]) {
    const r = A.check({ activity: "artisan", micro });
    assert.deepEqual([r.required, r.recommended, r.documents], [[], ["rc-metier"], "mention-if-required"]);
  }
});

test("services et commerce : pas d'obligation générale, responsabilité civile conseillée", () => {
  for (const activity of ["services", "commerce"]) {
    assert.deepEqual(A.check({ activity, micro: false }), { activity, required: [], recommended: ["rc-pro"], documents: "none" });
    assert.equal(A.check({ activity, micro: true }).documents, "mention-if-required");
  }
});

test("véhicule utilisé pour l'activité : responsabilité civile automobile obligatoire ; activité inconnue lue comme services", () => {
  assert.deepEqual(A.check({ activity: "services", vehicle: true }).required, ["rc-auto"]);
  assert.deepEqual(A.check({ activity: "construction", vehicle: true }).required, ["decennale", "rc-auto"]);
  assert.equal(A.check({ activity: "autre" }).activity, "services");
});

test("la page et la checklist reprennent les règles (dates et articles, une seule source : data/rules/fr.json)", () => {
  const read = (f) => readFileSync(new URL("../../content/fr/" + f, import.meta.url), "utf8").replace(/[\u00a0\u202f]/g, " ");
  const page = read("assurance-independant.html"), checklist = read("mentions-obligatoires-facture.html");
  const since = new Date(rules.assurance_mention_devis_factures.value.depuis).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }).replace(/^1 /, "1er ");
  assert.ok(page.includes(since), `mention sur les devis et factures depuis le ${since}`);
  for (const [key, article] of [["assurance_mention_devis_factures", "L132-1"], ["assurance_attestation_decennale", "L243-2"], ["assurance_decennale", "L241-1"]]) {
    assert.ok(rules[key].source_title.includes(article), `${key} : ${article}`);
    assert.ok(page.includes(article), `guide : ${article}`);
  }
  for (const article of ["L132-1", "L243-2"]) assert.ok(checklist.includes(article), `checklist : ${article}`);
  const meta = JSON.parse(checklist.match(/<!--(\{.*?\})-->/s)[1]);
  assert.ok(meta.sources.includes("assurance_mention_devis_factures") && meta.sources.includes("assurance_attestation_decennale"), "checklist : sources reliées aux règles");
});
