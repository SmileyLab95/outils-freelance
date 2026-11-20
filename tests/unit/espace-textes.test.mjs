// Textes de l'Espace entrepreneur (documentation/60-espace-etats-unis.md, § 3.2, lot 3b) : deux sortes de dictionnaires.
// Communs (tools/espace-texts-<langue>.js) : clés de l'interface partagée et des moteurs communs, dans chaque langue.
// D'un pays (tools/espace-<pays>-texts-<langue>.js) : clés du module d'écrans et du moteur de ce pays, seulement dans
// les langues de ce pays. Chaque clé lue existe ; chaque clé d'un dictionnaire sert au code de son groupe ; une
// traduction garde les mêmes valeurs insérées (« {n} ») que le français ; aucun texte n'est vide.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const TOOLS = fileURLToPath(new URL("../../src/assets/tools/", import.meta.url));
const ENGINES = fileURLToPath(new URL("../../src/assets/engines/", import.meta.url));
const read = (f) => readFileSync(f, "utf8");
// Code commun : interface partagée et moteurs communs (D88, D90).
const COMMON_CODE = [TOOLS + "espace.js", TOOLS + "charts.js", ENGINES + "espace-core.js", ENGINES + "espace-stats.js"];
// Modules de pays : écrans (tools/espace-<pays>-ui.js) et moteur ; langues de leurs textes.
const MODULES = {
  fr: { code: [TOOLS + "espace-fr-ui.js", ENGINES + "espace-fr.js"], langs: ["fr"] },
  // États-Unis : moteur (lot 3d-2) ; écrans tools/espace-us-ui.js ajoutés avec le lot 3d-3.
  us: { code: [ENGINES + "espace-us.js"], langs: ["en"] }
};

/** Clés écrites en entier (L("type.facture")), préfixes de clés construites (L("activity." + k), labels("eng.x.", […])). */
function usage(files) {
  const code = files.map(read).join("\n");
  const keys = new Set([...code.matchAll(/\bL\("([A-Za-z0-9_.-]+)"[,)]/g)].map((m) => m[1]));
  const prefixes = [...code.matchAll(/\bL\("([A-Za-z0-9_.-]+\.)"\s*\+/g), ...code.matchAll(/\blabels\("([A-Za-z0-9_.-]+\.)",/g)].map((m) => m[1]);
  return { keys, prefixes, uses: (k) => keys.has(k) || prefixes.some((p) => k.startsWith(p)) };
}
/** Dictionnaires définis par un seul fichier de textes, par langue (chargé seul, pour savoir d'où vient chaque clé). */
function load(file) {
  const sandbox = { self: {} };
  vm.createContext(sandbox);
  vm.runInContext(read(TOOLS + file), sandbox, { filename: file });
  return sandbox.self.OF_ESPACE_TEXTS || {};
}
const FILES = readdirSync(TOOLS);
const COMMON_FILES = FILES.filter((f) => /^espace-texts-[a-z]{2}(-[A-Z]{2})?\.js$/.test(f));
const MODULE_FILES = FILES.filter((f) => /^espace-[a-z]{2}-texts-[a-z]{2}(-[A-Z]{2})?\.js$/.test(f));
const COMMON = usage(COMMON_CODE);
const USES = Object.fromEntries(Object.entries(MODULES).map(([c, m]) => [c, usage(m.code)]));

/** Textes communs par langue. */
function commonDicts() {
  const out = {};
  for (const f of COMMON_FILES) for (const [lang, dict] of Object.entries(load(f))) out[lang] = Object.assign(out[lang] || {}, dict);
  return out;
}
/** Textes des pays : { pays: { langue: dictionnaire } }, d'après le nom du fichier. */
function moduleDicts() {
  const out = {};
  for (const f of MODULE_FILES) {
    const [, country, lang] = /^espace-([a-z]{2})-texts-([a-z]{2}(?:-[A-Z]{2})?)\.js$/.exec(f);
    const dicts = load(f);
    assert.deepEqual(Object.keys(dicts), [lang], `${f} : une seule langue, celle de son nom`);
    out[country] = Object.assign(out[country] || {}, dicts);
  }
  return out;
}
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

test("textes de l'Espace : textes communs et textes de la France en français, chargés sans erreur", () => {
  const C = commonDicts(), M = moduleDicts();
  assert.ok(COMMON_FILES.includes("espace-texts-fr.js") && C.fr, "textes communs en français");
  assert.ok(M.fr && M.fr.fr, "textes de la France en français");
  assert.ok(COMMON.keys.size > 0 && COMMON.prefixes.length > 0 && USES.fr.keys.size > 0, "clés trouvées dans le code");
});

test("textes communs : chaque clé lue par le code commun existe dans chaque langue", () => {
  for (const [lang, dict] of Object.entries(commonDicts())) {
    if (lang.includes("-")) continue;   // variante régionale : ne redéfinit que ce qui change
    for (const key of COMMON.keys) assert.ok(key in dict, `${lang} : clé commune « ${key} » absente`);
    for (const prefix of COMMON.prefixes) assert.ok(Object.keys(dict).some((k) => k.startsWith(prefix)), `${lang} : aucune clé « ${prefix}… »`);
  }
});

test("textes d'un pays : chaque clé lue par son module existe dans chacune de ses langues (texte commun ou du pays)", () => {
  const C = commonDicts(), M = moduleDicts();
  for (const [country, mod] of Object.entries(MODULES)) {
    for (const lang of mod.langs) {
      const dict = Object.assign({}, C[lang.slice(0, 2)], C[lang], (M[country] || {})[lang]);
      for (const key of USES[country].keys) assert.ok(key in dict, `${country}/${lang} : clé « ${key} » absente`);
      for (const prefix of USES[country].prefixes) assert.ok(Object.keys(dict).some((k) => k.startsWith(prefix)), `${country}/${lang} : aucune clé « ${prefix}… »`);
    }
  }
});

test("textes communs : chaque clé sert au code commun", () => {
  for (const [lang, dict] of Object.entries(commonDicts())) {
    for (const key of Object.keys(dict)) assert.ok(COMMON.uses(key), `${lang} : clé commune « ${key} » inutilisée par le code commun`);
  }
});

test("textes d'un pays : pays et langue connus ; chaque clé sert à son module et n'est ni commune ni lue par le code commun", () => {
  const C = commonDicts();
  for (const [country, byLang] of Object.entries(moduleDicts())) {
    assert.ok(MODULES[country], `textes d'un pays sans module : « ${country} »`);
    for (const [lang, dict] of Object.entries(byLang)) {
      assert.ok(MODULES[country].langs.includes(lang), `${country} : langue « ${lang} » hors des langues du pays`);
      for (const key of Object.keys(dict)) {
        assert.ok(USES[country].uses(key), `${country}/${lang} : clé « ${key} » inutilisée par le module`);
        assert.ok(!COMMON.uses(key), `${country}/${lang} : clé « ${key} » lue par le code commun (à mettre dans les textes communs)`);
        assert.ok(!(key in (C[lang] || {})), `${country}/${lang} : clé « ${key} » déjà dans les textes communs`);
      }
    }
  }
});

test("textes : mêmes valeurs insérées qu'en français, aucun texte vide", () => {
  const C = commonDicts(), M = moduleDicts();
  const check = (dict, fr, where) => {
    for (const [key, text] of Object.entries(dict)) {
      assert.ok(typeof text === "string" && text.trim() !== "", `${where} : « ${key} » vide`);
      if (fr && fr !== dict && key in fr) assert.equal(placeholders(text), placeholders(fr[key]), `${where} : « ${key} » : valeurs insérées`);
    }
  };
  for (const [lang, dict] of Object.entries(C)) check(dict, C.fr, lang);
  for (const [country, byLang] of Object.entries(M)) for (const [lang, dict] of Object.entries(byLang)) check(dict, byLang.fr, country + "/" + lang);
});
