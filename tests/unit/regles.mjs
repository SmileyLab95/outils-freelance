// Lecture des règles pour les tests, comme le build : data/rules/<pays>.json complété par data/rules/shared.json.
import { readFileSync } from "node:fs";

const read = (name) => JSON.parse(readFileSync(new URL(`../../data/rules/${name}.json`, import.meta.url), "utf8"));

/** Entrées complètes (value, source, note…) des règles d'un pays, règles communes comprises. */
export function ruleEntries(country) {
  return { ...read(country).values, ...read("shared").values };
}

/** Valeurs seules, comme window.OF_RULES. */
export function ruleValues(country) {
  return Object.fromEntries(Object.entries(ruleEntries(country)).map(([k, v]) => [k, v.value]));
}
