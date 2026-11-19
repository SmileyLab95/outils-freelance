// Textes de l'Espace entrepreneur (documentation/60-espace-etats-unis.md, § 3, étape 1) : chaque clé utilisée par
// tools/espace.js existe dans chaque langue, chaque clé d'un dictionnaire sert, et une traduction garde les mêmes
// valeurs insérées (« {n} ») que le français.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const DIR = fileURLToPath(new URL("../../src/assets/tools/", import.meta.url));
const CODE = readFileSync(DIR + "espace.js", "utf8");
const FILES = readdirSync(DIR).filter((f) => /^espace-texts-[a-z]{2}\.js$/.test(f));

/** Dictionnaires définis par les fichiers de textes, par langue (« fr », « en »…). */
function dictionaries() {
  const sandbox = { self: {} };
  vm.createContext(sandbox);
  for (const f of FILES) vm.runInContext(readFileSync(DIR + f, "utf8"), sandbox, { filename: f });
  return sandbox.self.OF_ESPACE_TEXTS;
}
// Clés écrites en entier (L("type.facture")) et préfixes de clés construites (L("activity." + k)).
const STATIC = new Set([...CODE.matchAll(/\bL\("([A-Za-z0-9_.-]+)"[,)]/g)].map((m) => m[1]));
const PREFIXES = [...CODE.matchAll(/\bL\("([A-Za-z0-9_.-]+\.)"\s*\+/g)].map((m) => m[1]);
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

test("textes de l'Espace : au moins le français, chargé sans erreur", () => {
  const T = dictionaries();
  assert.ok(FILES.includes("espace-texts-fr.js") && T && T.fr, "dictionnaire français");
  assert.ok(STATIC.size > 0 && PREFIXES.length > 0, "clés trouvées dans tools/espace.js");
});

test("textes de l'Espace : chaque clé écrite dans le code existe dans chaque langue", () => {
  const T = dictionaries();
  for (const [lang, dict] of Object.entries(T)) {
    if (lang.includes("-")) continue;   // variante régionale : ne redéfinit que ce qui change
    for (const key of STATIC) assert.ok(key in dict, `${lang} : clé « ${key} » absente`);
    for (const prefix of PREFIXES) assert.ok(Object.keys(dict).some((k) => k.startsWith(prefix)), `${lang} : aucune clé « ${prefix}… »`);
  }
});

test("textes de l'Espace : chaque clé d'un dictionnaire sert dans le code", () => {
  const T = dictionaries();
  for (const [lang, dict] of Object.entries(T)) {
    for (const key of Object.keys(dict)) {
      assert.ok(STATIC.has(key) || PREFIXES.some((p) => key.startsWith(p)), `${lang} : clé « ${key} » inutilisée`);
    }
  }
});

test("textes de l'Espace : mêmes valeurs insérées qu'en français, aucun texte vide", () => {
  const T = dictionaries();
  for (const [lang, dict] of Object.entries(T)) {
    for (const [key, text] of Object.entries(dict)) {
      assert.ok(typeof text === "string" && text.trim() !== "", `${lang} : « ${key} » vide`);
      if (lang !== "fr" && key in T.fr) assert.equal(placeholders(text), placeholders(T.fr[key]), `${lang} : « ${key} » : valeurs insérées`);
    }
  }
});
