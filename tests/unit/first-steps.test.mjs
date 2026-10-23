// Premiers pas du compte gratuit (documentation/34-inscription-compte-gratuit.md, § 4) : étapes cochées d'après
// l'Espace et le compte, étape de la clé d'accès selon l'appareil, outils suggérés selon l'activité.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const F = createRequire(import.meta.url)("../../src/assets/engines/first-steps.js");
const MICRO = ruleValues("fr").micro_activities;
const ids = (r) => r.steps.map((s) => s.id + (s.done ? "+" : "-")).join(" ");

test("compte nouveau sans Espace : rien de fait, recherche de nom de domaine suggérée", () => {
  const r = F.steps({ profile: null, documents: [], passkeys: 0, microActivities: MICRO });
  assert.equal(ids(r), "profile- mentions- document- passkey-");
  assert.deepEqual([r.done, r.total, r.complete], [0, 4, false]);
  assert.deepEqual(r.tools, ["domain"]);
  assert.deepEqual(F.steps({}).tools, ["domain"], "entrée vide");
});

test("étapes cochées d'après l'Espace et le compte", () => {
  const profile = { name: "Camille Martin EI", activity: "liberal_bnc", address: "12 rue de la République, Lyon", siret: "123 456 789 00012" };
  const r = F.steps({ profile, documents: [{ type: "devis" }], passkeys: 2, microActivities: MICRO });
  assert.equal(ids(r), "profile+ mentions+ document+ passkey+");
  assert.deepEqual([r.done, r.complete], [4, true]);
  assert.equal(ids(F.steps({ profile: { name: "  " }, passkeys: 0 })), "profile- mentions- document- passkey-", "nom vide");
  assert.equal(ids(F.steps({ profile: { name: "X", address: "Lyon", siret: " " }, passkeys: 0 })), "profile+ mentions- document- passkey-", "SIRET vide");
  assert.equal(ids(F.steps({ profile: { name: "X", siret: "1" }, passkeys: 0 })), "profile+ mentions- document- passkey-", "adresse absente");
  assert.equal(F.steps({ documents: [{ type: "facture" }] }).steps.find((s) => s.id === "document").done, true);
  assert.equal(F.steps({ documents: [{ type: "avoir" }, null] }).steps.find((s) => s.id === "document").done, false, "un avoir seul ne compte pas");
});

test("clé d'accès : étape absente si l'appareil ne la permet pas", () => {
  for (const passkeys of [null, undefined]) {
    const r = F.steps({ profile: { name: "X" }, passkeys });
    assert.equal(ids(r), "profile+ mentions- document-");
    assert.equal(r.total, 3);
  }
});

test("outils suggérés selon l'activité (règle micro_activities)", () => {
  for (const activity of Object.keys(MICRO)) {
    assert.deepEqual(F.steps({ profile: { name: "X", activity }, microActivities: MICRO }).tools, ["tax", "calendar", "domain"], activity);
  }
  assert.deepEqual(F.steps({ profile: { name: "X", activity: "real" }, microActivities: MICRO }).tools, ["einvoicing", "domain"]);
  assert.deepEqual(F.steps({ profile: { name: "X", activity: "liberal_bnc" } }).tools, ["einvoicing", "domain"], "sans la règle : pas de suggestion micro");
  assert.ok(Object.keys(MICRO).length >= 4 && !("real" in MICRO));
});
