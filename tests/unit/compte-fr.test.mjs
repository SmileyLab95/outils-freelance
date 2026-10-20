// Tests du moteur « compte bancaire de l'activité » (documentation/15-guides-gestion.md, § 1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const C = require("../../src/assets/engines/compte-fr.js");
const rules = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url))).values;
const RULE = rules.compte_dedie_micro.value;
const micro = (prev2, prev, current) => C.check({ status: "micro", year: 2026, ca: { prev2, prev, current } }, RULE);

test("règle sourcée : 10 000 € pendant deux années civiles consécutives (CSS, art. L613-10)", () => {
  assert.deepEqual(RULE, { seuil_ca: 10000, annees_consecutives: 2 });
  assert.match(rules.compte_dedie_micro.source, /legifrance\.gouv\.fr/);
});

test("micro-entreprise : obligatoire après deux années au-dessus du seuil", () => {
  assert.deepEqual(micro(12000, 15000, null), { code: "micro-required", year: 2025 });
  assert.deepEqual(micro(10000.01, 10000.01, null), { code: "micro-required", year: 2025 }, "un centime au-dessus suffit");
});

test("micro-entreprise : 10 000 € tout juste n'est pas un dépassement", () => {
  assert.deepEqual(micro(10000, 10000, 10000), { code: "micro-not-required" });
  assert.deepEqual(micro(10000, 15000, 10000), { code: "micro-watch", year: 2026 });
});

test("micro-entreprise : l'année dernière au-dessus, et l'estimation de l'année en cours aussi ou non", () => {
  assert.deepEqual(micro(4000, 15000, 11000), { code: "micro-required-end-of-year", year: 2026 });
  assert.deepEqual(micro(4000, 15000, 9000), { code: "micro-watch", year: 2026 });
  assert.deepEqual(micro(null, 15000, null), { code: "micro-watch", year: 2026 }, "estimation absente");
});

test("micro-entreprise : pas de deux années consécutives, montants vides ou illisibles", () => {
  assert.deepEqual(micro(15000, 8000, 20000), { code: "micro-not-required" }, "dépassements non consécutifs");
  assert.deepEqual(micro(null, null, null), { code: "micro-not-required" });
  assert.deepEqual(micro(NaN, -20000, Infinity), { code: "micro-not-required" }, "valeurs non numériques ignorées");
  assert.deepEqual(micro("15000", "15000", null), { code: "micro-not-required" }, "le texte n'est pas lu : c'est à l'appelant (OF.num)");
});

test("entreprise individuelle au réel et société", () => {
  assert.deepEqual(C.check({ status: "ei", year: 2026, ca: { prev2: 50000, prev: 50000 } }, RULE), { code: "ei" });
  assert.deepEqual(C.check({ status: "societe", year: 2026 }, RULE), { code: "societe" });
});

test("une règle différente de deux années est refusée plutôt que mal appliquée", () => {
  assert.throws(() => C.check({ status: "micro", year: 2026, ca: {} }, { seuil_ca: 10000, annees_consecutives: 3 }));
});

test("la page reprend les valeurs des règles (une seule source : data/rules/fr.json)", () => {
  const page = readFileSync(new URL("../../content/fr/compte-bancaire-professionnel.html", import.meta.url), "utf8").replace(/[\u00a0\u202f]/g, " ");
  const euros = RULE.seuil_ca.toLocaleString("fr-FR").replace(/[\u00a0\u202f]/g, " ") + " €";
  const since = new Date(rules.compte_intitule_ei.value.depuis).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const dac = rules.droit_au_compte_pro.value;
  assert.ok(page.includes(euros), `seuil ${euros}`);
  assert.ok(page.includes(since), `mention « EI » depuis le ${since}`);
  assert.ok(page.includes(`${dac.silence_vaut_refus_jours} jours`), "silence de la banque");
  assert.ok(page.includes(["zéro", "un", "deux", "trois", "quatre", "cinq"][dac.ouverture_jours] + " jours"), "délai d'ouverture");
  assert.ok(page.includes("deux années civiles consécutives") && RULE.annees_consecutives === 2);
});
