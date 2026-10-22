// Format des règles (data/rules/*.json) : chaque règle a une valeur, une unité, un libellé, une source officielle et
// un niveau de confiance ; les règles communes (shared.json) ont leur date de lecture et ne doublent aucune règle
// d'un pays. Le contenu de chaque règle est vérifié par les tests de l'outil qui l'utilise.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ruleEntries } from "./regles.mjs";

const FILES = ["fr", "uk", "us", "ca", "shared"];
const read = (name) => JSON.parse(readFileSync(new URL(`../../data/rules/${name}.json`, import.meta.url), "utf8"));
const UNITS = ["text", "rate", "object", "list", "brackets", "date", "hours", "boolean", "EUR", "USD", "GBP", "CAD"];

test("règles : valeur, unité, libellé, source https et confiance pour chaque règle", () => {
  for (const name of FILES) {
    for (const [key, rule] of Object.entries(read(name).values)) {
      const where = `${name}.json : ${key}`;
      assert.ok("value" in rule, `${where} : valeur`);
      assert.ok(UNITS.includes(rule.unit), `${where} : unité « ${rule.unit} »`);
      assert.ok(typeof rule.label === "string" && rule.label.length > 0, `${where} : libellé`);
      for (const ref of [rule, ...(rule.more_sources || [])]) assert.match(ref.source, /^https:\/\//, `${where} : source`);
      assert.ok(["high", "medium", "low"].includes(rule.confidence), `${where} : confiance`);
      if (rule.verified_on) assert.match(rule.verified_on, /^\d{4}-\d{2}-\d{2}$/, `${where} : date de lecture`);
    }
  }
});

test("règles communes : datées, jamais en double avec un pays, fusionnées comme dans le build", () => {
  const shared = read("shared").values;
  assert.ok(Object.keys(shared).length > 0);
  for (const [key, rule] of Object.entries(shared)) assert.ok(rule.verified_on, `shared.json : ${key} sans date de lecture`);
  for (const country of ["fr", "uk", "us", "ca"]) {
    const own = read(country).values;
    assert.deepEqual(Object.keys(shared).filter((k) => k in own), [], `${country}.json double une règle commune`);
    const merged = ruleEntries(country);
    for (const key of Object.keys(shared)) assert.deepEqual(merged[key], shared[key], `${country} : ${key} fusionnée`);
  }
});
