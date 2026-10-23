// Tests du moteur « compte bancaire » hors de France (Royaume-Uni, États-Unis, Canada) et des quatre pages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { ruleEntries, ruleValues } from "./regles.mjs";

const bank = createRequire(import.meta.url)("../../src/assets/engines/bank-intl.js");
const PAGES = [["uk", "uk/business-bank-account.html"], ["us", "us/business-bank-account.html"],
  ["ca", "ca/business-bank-account.html"], ["ca", "ca-fr/compte-bancaire-entreprise.html"]];
const read = (path) => {
  const html = readFileSync(new URL(`../../content/${path}`, import.meta.url), "utf8");
  return { html, L: JSON.parse(/<script type="application\/json" id="bank-data">([\s\S]*?)<\/script>/.exec(html)[1]),
           front: JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]) };
};

// Réponses attendues, écrites à partir des règles (documentation/25, § 1).
const EXPECTED = {
  uk: { sole_trader: ["not_required", ["uk_not_required", "uk_records_identify"], ["uk_check_bank", "uk_records_keep"]],
        partnership: ["not_required", ["uk_not_required", "uk_records_identify"], ["uk_check_bank", "uk_records_keep"]],
        limited: ["company_account", ["uk_company_separate"], ["uk_company_account"]] },
  us: { sole_prop: ["recommended", ["us_irs_first", "us_no_separation"], ["us_ssn_ok", "us_records_keep"]],
        single_llc: ["keep_separate", ["us_irs_first", "us_llc_liability"], ["us_ein_single_llc", "us_records_keep"]],
        entity: ["keep_separate", ["us_irs_first", "us_llc_liability"], ["us_ein_entity", "us_records_keep"]] },
  ca: { own_name: ["recommended", ["ca_own_name"], ["ca_records_keep"]],
        business_name: ["needed_for_cheques", ["ca_business_name"], ["ca_records_keep"]],
        corporation: ["corporation_account", ["ca_corporation"], ["ca_records_keep"]] }
};

test("chaque forme d'activité des trois pays donne la réponse attendue ; situation inconnue refusée", () => {
  for (const [country, cases] of Object.entries(EXPECTED)) {
    assert.deepEqual(bank.STRUCTURES[country], Object.keys(cases));
    for (const [structure, [verdict, reasons, steps]] of Object.entries(cases))
      assert.deepEqual(bank.decide(country, structure), { verdict, reasons, steps }, `${country} ${structure}`);
  }
  assert.throws(() => bank.decide("fr", "micro"));
  assert.throws(() => bank.decide("uk", "llc"));
});

for (const [country, path] of PAGES) {
  test(`${path} : un texte par clé, un choix par forme, sources présentes`, () => {
    const { html, L, front } = read(path);
    assert.equal(L.country, country);
    const used = { verdicts: new Set(), subs: new Set(), reasons: new Set(), steps: new Set() };
    for (const structure of bank.STRUCTURES[country]) {
      const r = bank.decide(country, structure);
      used.verdicts.add(r.verdict); used.subs.add(r.verdict);
      r.reasons.forEach((k) => used.reasons.add(k)); r.steps.forEach((k) => used.steps.add(k));
      assert.match(html, new RegExp(`<select[^>]*name="structure"[\\s\\S]*?<option value="${structure}"`), `choix ${structure}`);
    }
    for (const [group, keys] of Object.entries(used)) {
      for (const key of keys) assert.ok(typeof L[group][key] === "string" && L[group][key].length > 0, `${group}.${key}`);
      assert.deepEqual(Object.keys(L[group]).filter((k) => !keys.has(k)), [], `${group} : aucun texte inutilisé`);
    }
    const rules = ruleEntries(country);
    for (const key of front.sources) assert.ok(rules[key], `source ${key}`);
    assert.equal(front.id, "bank");
    assert.ok(front.title.length <= 60 && front.description.length <= 160, "titre et description");
  });
}

test("les chiffres des pages viennent des règles (conservation des registres, EIN)", () => {
  const uk = ruleValues("uk"), us = ruleValues("us"), ca = ruleValues("ca");
  const usEntries = ruleEntries("us");
  const ukPage = read("uk/business-bank-account.html").html;
  for (const m of ukPage.matchAll(/(\d+) years/g)) assert.equal(Number(m[1]), uk.uk_records_retention.years_after_filing_deadline, m[0]);
  assert.ok(ukPage.includes("31 January"));
  const usPage = read("us/business-bank-account.html").html;
  const years = new Set([us.us_records_retention.general_years]);
  if (/6 years/.test(usEntries.us_records_retention.note)) years.add(6);
  for (const m of usPage.matchAll(/(\d+) years/g)) assert.ok(years.has(Number(m[1])), m[0]);
  assert.match(usEntries.us_records_retention.note, /25%/);
  assert.ok(usPage.includes("25%"));
  assert.equal(us.us_ein.needed_without_employees, false);
  assert.ok(us.us_ein.needed_when.some((w) => /employee/.test(w)) && us.us_ein.needed_when.some((w) => /excise/.test(w)));
  assert.equal(us.us_ein_entities.single_member_llc_without_employees_needs_ein, false);
  assert.equal(us.us_ein_entities.partnership_and_corporation_need_ein, true);
  assert.equal(ca.ca_records_retention.years, 6);
  assert.ok(read("ca/business-bank-account.html").html.includes("six years"));
  assert.ok(read("ca-fr/compte-bancaire-entreprise.html").html.includes("six ans"));
});

test("les deux pages canadiennes ont les mêmes clés", () => {
  const en = read("ca/business-bank-account.html").L, fr = read("ca-fr/compte-bancaire-entreprise.html").L;
  for (const group of ["verdicts", "subs", "reasons", "steps"]) assert.deepEqual(Object.keys(en[group]), Object.keys(fr[group]), group);
});
