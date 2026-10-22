// Tests du moteur « facturer un client hors du Canada » : toutes les situations, et textes des deux pages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { ruleEntries } from "./regles.mjs";

const intl = createRequire(import.meta.url)("../../src/assets/engines/international-ca.js");
const all = [];
for (const registered of [true, false])
  for (const quebec of [true, false])
    for (const location of intl.LOCATIONS)
      for (const service of intl.SERVICES)
        for (const present of [true, false]) all.push({ registered, quebec, location, service, present });

const base = { registered: true, quebec: false, location: "abroad", service: "other", present: false };
const at = (changes) => intl.decide({ ...base, ...changes });

// Cas écrits à la main à partir des règles (data/rules/ca.json), indépendamment du code du moteur.
test("conseil ou service professionnel à un non-résident (art. 23) : détaxé, exception du litige rappelée", () => {
  assert.deepEqual(at({ service: "professional" }), { verdict: "zero_rated", reasons: ["export_professional", "exception_litigation"],
    wording: ["zero_rated_wording", "client_address"], actions: ["evidence_non_resident", "return_reporting"] });
  assert.deepEqual(at({ service: "professional", quebec: true }).wording[0], "zero_rated_wording_qc");
  assert.ok(at({ service: "professional", quebec: true }).reasons.includes("qst_zero_rated"));
  assert.deepEqual(at({ service: "professional", present: true }).verdict, "check", "présence du client : l'art. 23 n'a pas cette exception, pas de verdict");
  assert.deepEqual(at({ service: "professional", registered: false }).actions, ["evidence_non_resident", "counts_threshold_exports"]);
});

test("autre service à un non-résident (art. 7) : détaxé, sauf particulier présent au Canada", () => {
  assert.deepEqual(at({}), { verdict: "zero_rated", reasons: ["export_zero_rated", "other_rules"],
    wording: ["zero_rated_wording", "client_address"], actions: ["evidence_non_resident", "return_reporting"] });
  assert.deepEqual(at({ present: true }), { verdict: "charge_tax", reasons: ["exception_individual"], wording: ["tax_invoice"], actions: [] });
  assert.deepEqual(at({ present: true, quebec: true }).reasons, ["exception_individual", "qst_where_supplied"]);
  assert.deepEqual(at({ present: true, registered: false }), { verdict: "no_tax_unregistered", reasons: ["exception_individual", "unregistered"],
    wording: ["no_tax_shown"], actions: ["counts_threshold"] });
});

test("immeuble ou bien au Canada : taxable ; propriété intellectuelle : pas de verdict ; client au Canada : taxable", () => {
  for (const service of ["professional", "other"]) assert.equal(at({ service, present: false, location: "canada" }).verdict, "charge_tax");
  assert.deepEqual(at({ service: "property" }), { verdict: "charge_tax", reasons: ["exception_property"], wording: ["tax_invoice"], actions: [] });
  for (const registered of [true, false])
    assert.deepEqual(at({ service: "ip", registered }), { verdict: "check", reasons: ["ip_rules"], wording: ["check_wording"], actions: ["check_memo"] });
  assert.deepEqual(at({ location: "canada", quebec: true }).reasons, ["canada_customer", "qst_where_supplied"]);
  assert.deepEqual(at({ location: "canada", registered: false }).actions, ["counts_threshold"]);
});

test("invariants sur les 64 situations", () => {
  for (const s of all) {
    const r = intl.decide(s), label = JSON.stringify(s);
    if (!s.registered) assert.ok(r.verdict !== "charge_tax" && r.verdict !== "zero_rated", label);
    if (s.registered) assert.ok(!r.actions.some((a) => a.startsWith("counts_threshold")), label);
    if (!s.registered && r.verdict === "no_tax_unregistered") assert.ok(r.actions.some((a) => a.startsWith("counts_threshold")), `${label} : la vente compte dans le seuil`);
    assert.equal(r.reasons.some((k) => k.startsWith("qst_")), s.quebec && (r.verdict === "zero_rated" || r.verdict === "charge_tax" ||
      (r.verdict === "no_tax_unregistered" && r.reasons.includes("qst_zero_rated"))), `${label} : TVQ seulement au Québec`);
    if (r.verdict === "zero_rated") assert.ok(s.location === "abroad" && !s.present && ["professional", "other"].includes(s.service), label);
    if (r.verdict === "check") assert.ok(s.location === "abroad" && (s.service === "ip" || (s.service === "professional" && s.present)), label);
  }
});

test("situation inconnue refusée", () => {
  assert.throws(() => intl.decide({ registered: true, location: "us", service: "remote" }));
  assert.throws(() => intl.decide({ registered: true, location: "abroad", service: "consulting" }));
});

for (const [page, lang] of [["content/ca/invoicing-clients-outside-canada.html", "en-CA"], ["content/ca-fr/facturer-client-etranger.html", "fr-CA"]]) {
  test(`${page} : un texte par clé, un choix par valeur, des sources, des montants repris des règles`, () => {
    const html = readFileSync(new URL(`../../${page}`, import.meta.url), "utf8");
    const L = JSON.parse(/<script type="application\/json" id="intl-ca-data">([\s\S]*?)<\/script>/.exec(html)[1]);
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
    for (const [name, values] of [["location", intl.LOCATIONS], ["service", intl.SERVICES]])
      for (const value of values) assert.match(html, new RegExp(`<select[^>]*name="${name}"[\\s\\S]*?<option value="${value}"`), `choix ${name}=${value}`);
    const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
    const rules = ruleEntries("ca");
    assert.equal(front.id, "international");
    for (const key of front.sources) assert.ok(rules[key], `source ${key} présente dans ca.json ou shared.json`);
    for (const key of ["export_services_zero_rated", "export_professional_services_zero_rated", "export_ip_non_registered", "export_evidence_non_resident",
      "small_supplier_includes_zero_rated", "gst_return_line_101", "quick_method_zero_rated", "qst_services_non_residents_zero_rated",
      "small_supplier_threshold", "small_supplier_not_required_to_collect"])
      assert.ok(front.sources.includes(key), `règle ${key} citée par la page`);
    const threshold = rules.small_supplier_threshold.value.toLocaleString(lang).replace(/\s/g, " ");
    const amounts = [...html.replace(/[  ]/g, " ").matchAll(/\$\s?([\d, ]*\d)|([\d][\d ]*\d) \$/g)].map((m) => (m[1] || m[2]).trim());
    assert.ok(amounts.length >= 3 && amounts.every((a) => a === threshold), `montants : ${amounts.join(" | ")}`);
  });
}
