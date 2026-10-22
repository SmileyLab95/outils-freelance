// Tests du moteur « facturer un client étranger » (États-Unis) : toutes les situations, et textes de la page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { ruleEntries } from "./regles.mjs";

const intl = createRequire(import.meta.url)("../../src/assets/engines/international-us.js");
const all = [];
for (const location of intl.LOCATIONS)
  for (const customer of intl.CUSTOMERS)
    for (const service of intl.SERVICES)
      for (const workplace of intl.WORKPLACES) all.push({ location, customer, service, workplace });

/** Réponse attendue pour chaque situation, écrite à partir de la table de la spécification (documentation/22). */
function expected(s) {
  const us = ["report_in_dollars", s.workplace === "us" ? "withholding_us_work" : "withholding_abroad_work", "fbar", "state_sales_tax"];
  const r = (verdict, reasons, wording, actions) => ({ verdict, reasons, wording, actions, us });
  if (s.service === "place") return r("check", ["special_rules_place"], ["check_wording"], ["check_local"]);
  if (s.location === "world") return r("check", ["world_rules"], ["check_wording"], ["check_local"]);
  if (s.customer === "business") {
    return {
      eu: r("no_foreign_tax", ["eu_b2b"], ["reverse_charge_wording", "customer_vat_number"], ["evidence_business"]),
      uk: r("no_foreign_tax", ["uk_b2b"], ["reverse_charge_wording", "customer_vat_number"], ["evidence_business"]),
      canada: r("no_foreign_tax", ["ca_b2b"], ["customer_gst_number"], ["evidence_gst_number"])
    }[s.location];
  }
  if (s.location === "canada") return r("threshold", ["ca_consumer_threshold"], ["ca_tax_once_registered"], ["ca_track_threshold"]);
  if (s.location === "eu") return s.service === "digital"
    ? r("foreign_vat", ["eu_digital_consumer"], ["eu_vat_shown"], ["oss_register", "evidence_location"])
    : r("usually_none", ["eu_b2c_general"], ["no_vat_shown"], ["check_local"]);
  return s.service === "digital"
    ? r("foreign_vat", ["uk_digital_consumer"], ["uk_vat_shown"], ["uk_register", "evidence_location"])
    : r("usually_none", ["uk_b2c_general"], ["no_vat_shown"], ["check_local"]);
}

test("toutes les situations (4 pays × 2 clients × 3 services × 2 lieux de travail) : réponse de la spécification", () => {
  assert.equal(all.length, 48);
  for (const s of all) assert.deepEqual(intl.decide(s), expected(s), JSON.stringify(s));
});

test("cas typiques", () => {
  // Designer à New York, client entreprise à Paris : pas de TVA, autoliquidation par le client.
  assert.equal(intl.decide({ location: "eu", customer: "business", service: "remote", workplace: "us" }).verdict, "no_foreign_tax");
  // Cours préenregistré vendu à un particulier allemand : TVA de l'UE, guichet non-Union.
  assert.deepEqual(intl.decide({ location: "eu", customer: "consumer", service: "digital", workplace: "us" }).actions, ["oss_register", "evidence_location"]);
  // Coaching en ligne d'un particulier à Toronto : seuil canadien, même pour un service non numérique.
  assert.equal(intl.decide({ location: "canada", customer: "consumer", service: "remote", workplace: "us" }).verdict, "threshold");
  // Mission faite en partie sur place à l'étranger : crédit d'impôt étranger possible pour cette partie.
  assert.equal(intl.decide({ location: "uk", customer: "business", service: "remote", workplace: "abroad" }).us[1], "withholding_abroad_work");
});

test("situation inconnue : erreur plutôt qu'une réponse fausse", () => {
  assert.throws(() => intl.decide({ location: "mars", customer: "business", service: "remote", workplace: "us" }));
  assert.throws(() => intl.decide({ location: "eu", customer: "business", service: "remote" }));
});

test("page : un texte pour chaque clé, choix du formulaire, règles citées, montants repris des règles", () => {
  const html = readFileSync(new URL("../../content/us/invoicing-international-clients.html", import.meta.url), "utf8");
  const L = JSON.parse(/<script type="application\/json" id="intl-us-data">([\s\S]*?)<\/script>/.exec(html)[1]);
  const used = { verdicts: new Set(), reasons: new Set(), wording: new Set(), actions: new Set(), us: new Set() };
  for (const s of all) {
    const r = intl.decide(s);
    used.verdicts.add(r.verdict);
    for (const group of ["reasons", "wording", "actions", "us"]) r[group].forEach((k) => used[group].add(k));
  }
  for (const [group, keys] of Object.entries(used)) {
    for (const key of keys) assert.ok(typeof L[group][key] === "string" && L[group][key].length > 0, `texte ${group}.${key}`);
    assert.deepEqual(Object.keys(L[group]).sort(), [...keys].sort(), `${group} : aucun texte inutilisé`);
  }
  for (const [name, values] of [["location", intl.LOCATIONS], ["customer", intl.CUSTOMERS], ["service", intl.SERVICES], ["workplace", intl.WORKPLACES]])
    for (const value of values) assert.match(html, new RegExp(`<select[^>]*name="${name}"[\\s\\S]*?<option value="${value}"`), `choix ${name}=${value}`);

  const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
  const rules = ruleEntries("us");
  for (const key of front.sources) assert.ok(rules[key], `source ${key} présente dans us.json ou shared.json`);
  for (const key of ["eu_b2b_reverse_charge", "eu_b2c_general_rule", "eu_non_union_scheme", "uk_b2b_reverse_charge_overseas",
    "place_of_supply_services_b2c", "uk_netp_no_threshold", "ca_b2b_nonresident", "ca_simplified_regime", "us_foreign_currency_translation",
    "us_form_6166", "us_ftc_source_rule", "us_fbar", "states_tax_services_by_default"])
    assert.ok(front.sources.includes(key), `règle ${key} citée par la page`);

  // Montants en dollars (page, textes et FAQ) : seuil canadien (en dollars canadiens) et seuil du FBAR, rien d'autre.
  const text = html;
  const amounts = [...new Set([...text.matchAll(/C?\$\d{1,3}(?:,\d{3})*/g)].map((m) => m[0]))].sort();
  const ca = "C$" + rules.ca_simplified_regime.value.threshold.toLocaleString("en-US");
  const fbar = "$" + rules.us_fbar.value.threshold.toLocaleString("en-US");
  assert.deepEqual(amounts, [ca, fbar].sort(), `montants : ${amounts}`);
  assert.match(text, new RegExp(`${rules.ca_simplified_regime.value.period_months} months`), "période du seuil canadien");
  assert.match(text, new RegExp(rules.us_fbar.value.due) , "échéance du FBAR");
  assert.match(text, new RegExp(rules.us_fbar.value.extended_due), "prolongation du FBAR");

  // Délais, durées, numéros de formulaires et États cités : ceux des règles.
  const ruleText = (key) => JSON.stringify(rules[key]);
  for (const [phrase, key] of [["10 years", "eu_non_union_scheme"], ["30 days", "uk_netp_no_threshold"], ["Form 6166", "us_form_6166"],
    ["Form 8802", "us_form_6166"], ["Form 1116", "us_ftc_source_rule"], ["FinCEN Form 114", "us_fbar"]]) {
    assert.ok(text.includes(phrase), `page : « ${phrase} »`);
    assert.ok(ruleText(key).includes(phrase), `règle ${key} : « ${phrase} »`);
  }
  const STATES = { HI: "Hawaii", NM: "New Mexico", SD: "South Dakota", WV: "West Virginia" };
  const named = rules.states_tax_services_by_default.value.map((code) => STATES[code]);
  assert.ok(named.every(Boolean) && L.us.state_sales_tax.includes(named.slice(0, -1).join(", ") + " and " + named.at(-1)), "États de la règle");
});
