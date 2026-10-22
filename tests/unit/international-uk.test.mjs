// Tests du moteur « facturer un client étranger » (Royaume-Uni) : toutes les situations, et textes de la page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { ruleEntries } from "./regles.mjs";

const intl = createRequire(import.meta.url)("../../src/assets/engines/international-uk.js");
const all = [];
for (const registered of [true, false])
  for (const location of intl.LOCATIONS)
    for (const customer of intl.CUSTOMERS)
      for (const service of intl.SERVICES) all.push({ registered, location, customer, service });
const tail = (s) => (s.registered ? "box6" : "not_taxable_turnover");   // dernière démarche d'une vente hors champ

/** Réponse attendue pour chaque situation, écrite à partir des règles (spécification, documentation/pays/uk.md). */
function expected(s) {
  if (s.location === "uk") return s.registered
    ? { verdict: "uk_vat", reasons: ["uk_customer"], wording: ["vat_invoice"], actions: [] }
    : { verdict: "no_vat_unregistered", reasons: ["uk_customer_unregistered"], wording: ["no_vat_shown"], actions: ["counts_towards_threshold"] };
  if (s.service === "place") return { verdict: "check", reasons: ["special_rules_place"], wording: ["check_wording"], actions: ["check_notice"] };
  if (s.customer === "business") return { verdict: "outside_scope", reasons: ["b2b_general_rule"],
    wording: s.location === "eu" ? ["outside_scope_wording", "customer_vat_number"] : ["outside_scope_wording"], actions: ["evidence_business", tail(s)] };
  if (s.service === "listed") return { verdict: "outside_scope", reasons: ["b2c_described_services"], wording: ["outside_scope_wording"], actions: ["evidence_location", tail(s)] };
  if (s.service === "digital") return s.location === "eu"
    ? { verdict: "eu_vat", reasons: ["digital_eu_consumer"], wording: ["eu_vat_shown"], actions: ["oss_register", "evidence_location", tail(s)] }
    : { verdict: "outside_scope", reasons: ["digital_consumer_world"], wording: ["outside_scope_wording"], actions: ["local_rules", "evidence_location", tail(s)] };
  return s.registered
    ? { verdict: "check", reasons: ["b2c_remote_unsettled"], wording: ["check_wording"], actions: ["check_notice"] }
    : { verdict: "no_vat_unregistered", reasons: ["b2c_remote_unregistered"], wording: ["no_vat_shown"], actions: ["counts_if_uk"] };
}

test("chaque situation (48) donne la réponse attendue", () => {
  for (const s of all) assert.deepEqual(intl.decide(s), expected(s), JSON.stringify(s));
});

test("invariants : TVA de l'UE même sans immatriculation ; jamais de case 6 sans immatriculation ni de seuil une fois immatriculé", () => {
  for (const s of all) {
    const r = intl.decide(s), label = JSON.stringify(s);
    if (s.customer === "consumer" && s.location === "eu" && s.service === "digital") assert.equal(r.verdict, "eu_vat", label);
    if (!s.registered) assert.ok(!r.actions.includes("box6") && r.verdict !== "uk_vat", label);
    if (s.registered) assert.ok(!r.actions.some((a) => /threshold|turnover|counts/.test(a)), label);
    if (r.verdict === "uk_vat") assert.ok(!r.actions.includes("box6"), label);
  }
});

test("situation inconnue refusée", () => {
  assert.throws(() => intl.decide({ registered: true, location: "fr", customer: "business", service: "listed" }));
  assert.throws(() => intl.decide({ registered: true, location: "eu", customer: "charity", service: "listed" }));
  assert.throws(() => intl.decide({ registered: true, location: "eu", customer: "business", service: "other" }));
});

test("la page : un texte par clé, un choix par valeur, des sources, des chiffres repris des règles", () => {
  const html = readFileSync(new URL("../../content/uk/invoicing-overseas-clients.html", import.meta.url), "utf8");
  const L = JSON.parse(/<script type="application\/json" id="intl-uk-data">([\s\S]*?)<\/script>/.exec(html)[1]);
  const used = { verdicts: new Set(), reasons: new Set(), wording: new Set(), actions: new Set() };
  for (const s of all) {
    const r = intl.decide(s);
    used.verdicts.add(r.verdict);
    for (const group of ["reasons", "wording", "actions"]) for (const key of r[group]) used[group].add(key);
  }
  for (const [group, keys] of Object.entries(used)) {
    for (const key of keys) assert.ok(typeof L[group][key] === "string" && L[group][key].length > 0, `texte ${group}.${key}`);
    assert.deepEqual(Object.keys(L[group]).filter((k) => !keys.has(k)), [], `${group} : aucun texte inutilisé`);
  }
  for (const [name, values] of [["location", intl.LOCATIONS], ["customer", intl.CUSTOMERS], ["service", intl.SERVICES]])
    for (const value of values) assert.match(html, new RegExp(`<select[^>]*name="${name}"[\\s\\S]*?<option value="${value}"`), `choix ${name}=${value}`);
  const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
  const rules = ruleEntries("uk");
  for (const key of front.sources) assert.ok(rules[key], `source ${key} présente dans uk.json ou shared.json`);
  for (const key of ["place_of_supply_services_b2b", "place_of_supply_services_b2c", "b2c_described_services_outside_uk", "digital_services_consumers",
    "eu_non_union_scheme", "vat_territory_isle_of_man", "outside_scope_evidence", "outside_scope_vat_return_box6", "outside_scope_not_taxable_turnover"])
    assert.ok(front.sources.includes(key), `règle ${key} citée par la page`);
  const pounds = [...html.matchAll(/£[\d,]+/g)].map((m) => m[0]);
  assert.ok(pounds.length >= 4 && pounds.every((p) => p === `£${rules.vat_registration_threshold.value.toLocaleString("en-GB")}`), `montants : ${pounds}`);
  // Taux de TVA seulement : la retenue américaine du W-8BEN (« withhold 30% ») est vérifiée par w8ben.test.mjs.
  const percents = [...html.replace(/withhold \d+%/g, "").matchAll(/(\d+)%/g)].map((m) => Number(m[1]) / 100);
  assert.deepEqual([...new Set(percents)], [rules.vat_standard_rate.value], "taux de TVA repris de la règle");
  assert.match(rules.eu_non_union_scheme.value, /10 years/, "conservation des registres (règle)");
});
