// Tests du moteur « assurances » hors de France (Royaume-Uni, États-Unis, Canada) et des quatre pages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { ruleEntries, ruleValues } from "./regles.mjs";

const ins = createRequire(import.meta.url)("../../src/assets/engines/insurance-intl.js");
const PAGES = [["uk", "uk/business-insurance.html"], ["us", "us/business-insurance.html"],
  ["ca", "ca/business-insurance.html"], ["ca", "ca-fr/assurance-entreprise.html"]];
const RULES = { uk: ruleValues("uk"), us: ruleValues("us"), ca: ruleValues("ca") };
const read = (path) => {
  const html = readFileSync(new URL(`../../content/${path}`, import.meta.url), "utf8");
  return { html, L: JSON.parse(/<script type="application\/json" id="ins-data">([\s\S]*?)<\/script>/.exec(html)[1]),
           front: JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]) };
};
const pairs = (r) => r.items.map((i) => `${i.level}:${i.key}`);
const bools = (names) => names.reduce((all, name) => all.flatMap((o) => [{ ...o, [name]: false }, { ...o, [name]: true }]), [{}]);

// Toutes les situations de chaque pays (combinaisons des réponses).
const UK_CASES = ins.UK_STRUCTURES.flatMap((structure) => ins.UK_STAFF.flatMap((staff) =>
  bools(["vehicle", "advice", "regulated", "home"]).map((b) => ({ structure, staff, ...b }))));
const US_CASES = ins.US_STATES.flatMap((state) => bools(["employees", "services", "home"]).map((b) => ({ state, ...b })));
const CA_CASES = ins.CA_PROVINCES.flatMap((province) => bools(["employees", "construction", "home"]).map((b) => ({ province, ...b })));
const CASES = { uk: UK_CASES, us: US_CASES, ca: CA_CASES };

test("Royaume-Uni : employers' liability selon la forme et le personnel, véhicule, PI, domicile", () => {
  const uk = (input) => pairs(ins.check("uk", { structure: "sole_trader", staff: "none", vehicle: false, advice: false,
                                                 regulated: false, home: false, ...input }, RULES.uk));
  assert.deepEqual(uk({}), ["recommended:uk_public_liability", "not_required:uk_el_alone"]);
  assert.equal(ins.check("uk", { structure: "sole_trader", staff: "none" }, RULES.uk).verdict, "none");
  assert.deepEqual(uk({ staff: "family" }), ["recommended:uk_public_liability", "not_required:uk_el_family"]);
  assert.deepEqual(uk({ staff: "employees" }), ["required:uk_el_employees", "recommended:uk_public_liability"]);
  assert.deepEqual(uk({ structure: "limited", staff: "family" }), ["required:uk_el_company_family", "recommended:uk_public_liability"]);
  assert.deepEqual(uk({ structure: "limited", staff: "employees" }), ["required:uk_el_employees", "recommended:uk_public_liability"]);
  assert.deepEqual(uk({ structure: "limited" }), ["check:uk_el_company_alone", "recommended:uk_public_liability"]);
  assert.equal(ins.check("uk", { structure: "limited", staff: "none" }, RULES.uk).verdict, "check");
  assert.deepEqual(uk({ vehicle: true, advice: true, home: true }),
    ["required:uk_motor", "todo:uk_home", "recommended:uk_pi_advice", "recommended:uk_public_liability", "not_required:uk_el_alone"]);
  assert.equal(ins.check("uk", { structure: "sole_trader", staff: "none", vehicle: true }, RULES.uk).verdict, "some");
  assert.deepEqual(uk({ advice: true, regulated: true }), ["check:uk_pi_regulated", "recommended:uk_public_liability", "not_required:uk_el_alone"]);
  assert.deepEqual(uk({ regulated: true }), ["check:uk_pi_regulated", "recommended:uk_public_liability", "not_required:uk_el_alone"]);
  // Le domicile est « à faire » : il ne change pas la réponse principale.
  assert.equal(ins.check("uk", { structure: "sole_trader", staff: "none", home: true }, RULES.uk).verdict, "none");
  assert.throws(() => ins.check("uk", { structure: "llp", staff: "none" }, RULES.uk));
  assert.throws(() => ins.check("uk", { structure: "limited", staff: "contractors" }, RULES.uk));
});

test("États-Unis : obligations d'employeur selon l'État (Texas, invalidité), pour soi, conseillées", () => {
  const us = (input) => pairs(ins.check("us", { state: "FL", employees: false, services: false, home: false, ...input }, RULES.us));
  assert.deepEqual(us({}), ["recommended:us_general_liability", "optional:us_wc_owner"]);
  assert.equal(ins.check("us", { state: "FL" }, RULES.us).verdict, "none");
  assert.deepEqual(us({ employees: true }), ["required:us_wc_employees", "required:us_unemployment",
    "recommended:us_general_liability", "optional:us_wc_owner"]);
  assert.deepEqual(us({ state: "TX", employees: true }), ["required:us_unemployment", "check:us_wc_texas",
    "recommended:us_general_liability", "optional:us_wc_owner"]);
  for (const state of ["CA", "HI", "NJ", "NY", "RI"])
    assert.deepEqual(us({ state, employees: true }).slice(0, 3), ["required:us_wc_employees", "required:us_unemployment", "required:us_disability"], state);
  const disability = ins.US_STATES.filter((state) => us({ state, employees: true }).includes("required:us_disability"));
  assert.deepEqual(disability, ["CA", "HI", "NJ", "NY", "RI"]);
  assert.ok(!us({ state: "CA" }).includes("required:us_disability"), "sans salarié, pas d'obligation");
  assert.deepEqual(us({ services: true }), ["recommended:us_general_liability", "recommended:us_professional_liability", "optional:us_wc_owner"]);
  assert.deepEqual(us({ home: true }), ["recommended:us_general_liability", "recommended:us_home_rider", "optional:us_wc_owner"]);
  assert.deepEqual(us({ services: true, home: true }), ["recommended:us_general_liability", "recommended:us_professional_liability",
    "recommended:us_home_rider", "optional:us_wc_owner"]);
  assert.equal(ins.US_STATES.length, 51);
  assert.throws(() => ins.check("us", { state: "PR" }, RULES.us));
});

test("Canada : protection personnelle facultative, construction en Ontario, employeur, domicile", () => {
  const ca = (input) => pairs(ins.check("ca", { province: "QC", employees: false, construction: false, home: false, ...input }, RULES.ca));
  assert.deepEqual(ca({}), ["recommended:ca_business", "optional:ca_self_optional"]);
  assert.equal(ins.check("ca", { province: "QC" }, RULES.ca).verdict, "none");
  assert.deepEqual(ca({ province: "ON", construction: true }), ["required:ca_self_construction", "recommended:ca_business"]);
  assert.equal(ins.check("ca", { province: "ON", construction: true }, RULES.ca).verdict, "some");
  const compulsory = ins.CA_PROVINCES.filter((province) => ca({ province, construction: true }).includes("required:ca_self_construction"));
  assert.deepEqual(compulsory, ["ON"], "la construction ne change rien hors de l'Ontario");
  assert.deepEqual(ca({ employees: true, home: true }), ["check:ca_workers", "todo:ca_home", "recommended:ca_business", "optional:ca_self_optional"]);
  assert.equal(ins.check("ca", { province: "QC", employees: true }, RULES.ca).verdict, "check");
  assert.equal(ins.CA_PROVINCES.length, 13);
  assert.throws(() => ins.check("ca", { province: "XX" }, RULES.ca));
  assert.throws(() => ins.check("fr", {}, RULES.ca));
});

test("chaque situation : lignes rangées par niveau, réponse cohérente, une seule ligne par clé", () => {
  for (const [country, cases] of Object.entries(CASES)) {
    for (const input of cases) {
      const r = ins.check(country, input, RULES[country]);
      const levels = r.items.map((i) => ins.LEVELS.indexOf(i.level));
      assert.ok(levels.every((l, n) => l >= 0 && (n === 0 || l >= levels[n - 1])), `${country} ${JSON.stringify(input)} : ordre`);
      assert.equal(new Set(r.items.map((i) => i.key)).size, r.items.length);
      const has = (level) => r.items.some((i) => i.level === level);
      assert.equal(r.verdict, has("required") ? "some" : has("check") ? "check" : "none");
    }
  }
});

for (const [country, path] of PAGES) {
  test(`${path} : un texte par clé, aucun texte inutilisé, questions et sources présentes`, () => {
    const { html, L, front } = read(path);
    assert.equal(L.country, country);
    const used = { verdicts: new Set(), subs: new Set(), levels: new Set(), names: new Set(), texts: new Set() };
    for (const input of CASES[country]) {
      const r = ins.check(country, input, RULES[country]);
      used.verdicts.add(r.verdict); used.subs.add(r.verdict);
      for (const i of r.items) { used.levels.add(i.level); used.names.add(i.key); used.texts.add(i.key); }
    }
    for (const [group, keys] of Object.entries(used)) {
      for (const key of keys) assert.ok(typeof L[group][key] === "string" && L[group][key].length > 0, `${group}.${key}`);
      assert.deepEqual(Object.keys(L[group]).filter((k) => !keys.has(k)), [], `${group} : aucun texte inutilisé`);
    }
    for (const text of Object.values(L.texts)) if (text.includes("{board}")) assert.equal(country, "ca", "{board} réservé au Canada");
    const fields = { uk: ["structure", "staff", "vehicle", "advice", "regulated", "home"], us: ["state", "employees", "services", "home"],
                     ca: ["province", "employees", "construction", "home"] }[country];
    for (const name of fields) assert.match(html, new RegExp(`name="${name}"`), `champ ${name}`);
    const options = { uk: { structure: ins.UK_STRUCTURES, staff: ins.UK_STAFF }, us: { state: ins.US_STATES }, ca: { province: ins.CA_PROVINCES } }[country];
    for (const [name, values] of Object.entries(options)) {
      const select = new RegExp(`<select[^>]*name="${name}"[^>]*>([\\s\\S]*?)</select>`).exec(html)[1];
      assert.deepEqual([...select.matchAll(/value="([^"]+)"/g)].map((m) => m[1]).sort(), [...values].sort(), `options ${name}`);
    }
    const rules = ruleEntries(country);
    for (const key of front.sources) assert.ok(rules[key], `source ${key}`);
    assert.equal(front.id, "insurance");
    assert.ok(front.title.length <= 60 && front.description.length <= 160, "titre et description");
  });
}

test("les chiffres et les noms des pages viennent des règles", () => {
  const el = RULES.uk.uk_employers_liability_insurance;
  const { html: ukPage } = read("uk/business-insurance.html");
  for (const m of ukPage.matchAll(/£([\d,.]+)([\s\u00a0]million)?/g)) {
    const amount = Number(m[1].replace(/,/g, "")) * (m[2] ? 1e6 : 1);
    assert.ok([el.min_cover, el.fine_per_day, el.certificate_fine].includes(amount), m[0]);
  }
  assert.equal(el.family_exemption_for_limited_companies, false);
  assert.ok(el.only_close_family_exempt && el.only_staff_based_abroad_exempt);
  assert.equal(RULES.uk.uk_compulsory_business_insurance.length, 2);

  const { html: usPage } = read("us/business-insurance.html");
  const states = { CA: "California", HI: "Hawaii", NJ: "New Jersey", NY: "New York", RI: "Rhode Island", PR: "Puerto Rico" };
  assert.deepEqual(RULES.us.us_employer_insurance.disability_states, Object.keys(states));
  const row = /<td>Disability insurance<\/td><td>([^<]*)/.exec(usPage)[1];
  const faq = read("us/business-insurance.html").front.faq.find(([q]) => /disability/.test(q))[1];
  for (const name of Object.values(states)) assert.ok(row.includes(name) && faq.includes(name), name);
  assert.equal(RULES.us.us_texas_workers_comp.annual_notice_to_dwc, "February 1 to April 30");
  assert.ok(usPage.includes("between February 1 and April 30"));
  assert.equal(RULES.us.us_workers_comp_owners.owners_usually_covered, false);

  const boards = RULES.ca.ca_workers_comp_personal_coverage;
  assert.deepEqual(Object.keys(boards).sort(), [...ins.CA_PROVINCES].sort());
  assert.deepEqual(Object.keys(boards).filter((p) => boards[p].construction_compulsory), ["ON"]);
  const sources = [ruleEntries("ca").ca_workers_comp_personal_coverage, ...ruleEntries("ca").ca_workers_comp_personal_coverage.more_sources].map((r) => r.source);
  for (const p of ins.CA_PROVINCES) assert.ok(sources.includes(boards[p].url), `${p} : lien parmi les sources`);
  for (const [path, field] of [["ca/business-insurance.html", "board"], ["ca-fr/assurance-entreprise.html", "board_fr"]]) {
    const { html, L } = read(path);
    assert.equal(L.board_name, field);
    const rows = [...html.matchAll(/<tr><td>[^<]+<\/td><td><a href="([^"]+)" rel="noopener">([^<]+)<\/a><\/td><\/tr>/g)].map((m) => [m[2], m[1]]);
    assert.deepEqual(rows, ins.CA_PROVINCES.map((p) => [boards[p][field], boards[p].url]), `${path} : tableau des organismes`);
  }
  assert.equal(RULES.ca.ca_home_based_business_insurance.home_policy_usually_covers_business, false);
  assert.equal(RULES.ca.ca_home_based_business_insurance.notify_insurer, true);
});

test("les deux pages canadiennes ont les mêmes clés", () => {
  const en = read("ca/business-insurance.html").L, fr = read("ca-fr/assurance-entreprise.html").L;
  for (const group of ["verdicts", "subs", "levels", "names", "texts"]) assert.deepEqual(Object.keys(en[group]), Object.keys(fr[group]), group);
  for (const key of Object.keys(en.texts)) assert.equal(en.texts[key].includes("{board}"), fr.texts[key].includes("{board}"), key);
});
