// Tests du moteur « petites créances » du Canada : plafonds aux bornes, verdicts, prescription, et textes des deux pages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { ruleEntries, ruleValues } from "./regles.mjs";

const court = createRequire(import.meta.url)("../../src/assets/engines/court-ca.js");
const R = ruleValues("ca");
const LIMITS = R.ca_small_claims_limits, TIME = R.ca_limitation_periods;
const page = (path) => {
  const html = readFileSync(new URL(`../../content/${path}`, import.meta.url), "utf8");
  return { html, L: JSON.parse(/<script type="application\/json" id="court-ca-data">([\s\S]*?)<\/script>/.exec(html)[1]),
           front: JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]) };
};
const EN = page("ca/small-claims-court.html"), FR = page("ca-fr/petites-creances.html");
const NAMES = {
  en: { ON: "Ontario", QC: "Québec", BC: "British Columbia", AB: "Alberta", SK: "Saskatchewan", MB: "Manitoba", NS: "Nova Scotia",
        NB: "New Brunswick", PE: "Prince Edward Island", NL: "Newfoundland and Labrador", YT: "Yukon", NT: "Northwest Territories", NU: "Nunavut" },
  fr: { ON: "Ontario", QC: "Québec", BC: "Colombie-Britannique", AB: "Alberta", SK: "Saskatchewan", MB: "Manitoba", NS: "Nouvelle-Écosse",
        NB: "Nouveau-Brunswick", PE: "Île-du-Prince-Édouard", NL: "Terre-Neuve-et-Labrador", YT: "Yukon", NT: "Territoires du Nord-Ouest", NU: "Nunavut" }
};
const cad = { en: (n) => "$" + n.toLocaleString("en-CA"), fr: (n) => n.toLocaleString("en-CA").replace(/,/g, " ") + " $" };

test("plafonds des 13 provinces et territoires aux bornes ; Tribunal de résolution civile en Colombie-Britannique", () => {
  assert.deepEqual(Object.keys(LIMITS).sort(), [...court.PROVINCES].sort());
  assert.deepEqual(Object.keys(TIME).sort(), [...court.PROVINCES].sort());
  const expected = { ON: 50000, QC: 15000, BC: 35000, AB: 100000, SK: 50000, MB: 20000, NS: 25000, NB: 20000, PE: 16000, NL: 25000, YT: 25000, NT: 35000, NU: null };
  for (const [province, limit] of Object.entries(expected)) {
    if (limit === null) {
      assert.equal(court.decide({ province, amount: 1000 }, R).verdict, "unknown", province);
      continue;
    }
    const at = court.decide({ province, amount: limit }, R), over = court.decide({ province, amount: limit + 0.01 }, R);
    assert.equal(at.limit, limit, province);
    assert.equal(at.verdict, "small_claims", `${province} : ${limit} $`);
    assert.equal(over.verdict, "above_limit", `${province} : ${limit + 0.01} $`);
  }
  assert.equal(court.decide({ province: "BC", amount: 5000 }, R).verdict, "tribunal");
  assert.equal(court.decide({ province: "BC", amount: 5000.01 }, R).verdict, "small_claims");
  assert.equal(court.decide({ province: "BC", amount: 0 }, R).tribunalLimit, 5000);
  assert.equal(court.decide({ province: "ON", amount: 0 }, R).tribunalLimit, null);
  assert.throws(() => court.decide({ province: "XX", amount: 1 }, R));
});

test("prescription : 2 ans depuis la découverte, 3 ans au Québec, 6 ans ailleurs, non confirmée au Nunavut", () => {
  const years = Object.fromEntries(court.PROVINCES.map((p) => [p, court.decide({ province: p, amount: 1 }, R).limitation]));
  for (const p of ["ON", "BC", "AB", "SK", "MB", "NS", "NB"]) assert.deepEqual(years[p], { years: 2, from: "discovery" }, p);
  assert.deepEqual(years.QC, { years: 3, from: "right_of_action" });
  for (const p of ["PE", "NL", "YT", "NT"]) assert.deepEqual(years[p], { years: 6, from: "right_of_action" }, p);
  assert.equal(years.NU, null);
});

for (const [lang, P] of [["en", EN], ["fr", FR]]) {
  test(`page ${lang} : un texte par province et par clé, aucun texte inutilisé, choix et sources`, () => {
    const { html, L, front } = P;
    for (const group of ["courts", "notes", "links"]) assert.deepEqual(Object.keys(L[group]).sort(), [...court.PROVINCES].sort(), group);
    for (const url of Object.values(L.links)) assert.match(url, /^https:\/\//);
    const verdicts = new Set(), froms = new Set(["unknown"]);
    for (const province of court.PROVINCES) for (const amount of [1000, 10000, 1e6]) {
      const r = court.decide({ province, amount }, R);
      verdicts.add(r.verdict);
      if (r.limitation) froms.add(r.limitation.from);
    }
    for (const [group, keys] of [["verdicts", verdicts], ["subs", verdicts], ["limitation", froms]])
      assert.deepEqual(Object.keys(L[group]).sort(), [...keys].sort(), group);
    for (const key of verdicts) if (key !== "unknown") assert.ok(L.subs[key].includes(key === "tribunal" ? "{tribunal}" : "{limit}"), `subs.${key}`);
    for (const key of ["discovery", "right_of_action"]) assert.ok(L.limitation[key].includes("{years}"), `limitation.${key}`);
    for (const province of court.PROVINCES)
      assert.match(html, new RegExp(`<option value="${province}"[^>]*>${NAMES[lang][province]}</option>`), `choix ${province}`);
    assert.deepEqual(front.sources, ["ca_small_claims_limits", "ca_limitation_periods"]);
    const rules = ruleEntries("ca");
    for (const key of front.sources) assert.ok(rules[key], key);
    assert.ok(front.title.length <= 60 && front.description.length <= 160, "titre et description");
  });

  test(`page ${lang} : chaque plafond, délai et chiffre du Québec repris des règles`, () => {
    const { html, front } = P;
    const faq = Object.fromEntries(front.faq.map(([q, a], i) => [i, a]));
    // Plafond de chaque province dans la réponse « quel est le plafond » (sauf le Nunavut, non confirmé).
    for (const province of court.PROVINCES) {
      const limit = LIMITS[province].limit;
      if (limit === null) { assert.ok(!faq[1].includes(NAMES[lang][province]), "Nunavut absent"); continue; }
      const shown = lang === "en" ? `${NAMES[lang][province]} ${cad.en(limit)}` : `${NAMES[lang][province]} ${cad.fr(limit)}`;
      assert.ok(faq[1].includes(shown), `${province} : ${shown}`);
    }
    const known = Object.values(LIMITS).map((c) => c.limit).filter((x) => x !== null);
    assert.ok(faq[0].includes(cad[lang](Math.min(...known))) && faq[0].includes(cad[lang](Math.max(...known))), "plus petit et plus grand plafond");
    // Tous les montants de la page : plafonds, Tribunal de résolution civile (et 1 $ de plus), médiation au Québec.
    const allowed = new Set([...known, LIMITS.BC.tribunal_limit, LIMITS.BC.tribunal_limit + 1, LIMITS.QC.mandatory_mediation_up_to]);
    const amounts = lang === "en" ? [...html.matchAll(/\$([\d,]+)/g)].map((m) => m[1].replace(/,/g, ""))
      : [...html.matchAll(/(\d{1,3}(?: \d{3})+|\d+) \$/g)].map((m) => m[1].replace(/ /g, ""));
    assert.ok(amounts.length >= 20);
    for (const a of amounts) assert.ok(allowed.has(Number(a)), `montant ${a} $`);
    // Délais de prescription : la liste des provinces de chaque durée est celle des règles.
    const word = lang === "en" ? "years" : "ans";
    for (const segment of faq[3].split(";")) {
      const n = Number(new RegExp(`(\\d+) ${word}`).exec(segment)[1]);
      const named = court.PROVINCES.filter((p) => segment.includes(NAMES[lang][p]));
      assert.deepEqual(named.sort(), court.PROVINCES.filter((p) => TIME[p] && TIME[p].years === n).sort(), `${n} ${word}`);
    }
    const qc = LIMITS.QC;
    assert.ok(html.includes(lang === "en" ? `${qc.legal_person_max_employees} employees` : `${qc.legal_person_max_employees} employés`));
    assert.ok(html.includes(lang === "en" ? `${qc.demand_letter_days} days` : `${qc.demand_letter_days} jours`));
    for (const m of html.matchAll(new RegExp(`(\\d+) ${word}`, "g"))) assert.ok([2, 3, 6].includes(Number(m[1])), m[0]);
  });
}

test("les deux pages disent la même chose : mêmes liens officiels (sauf le Québec, en français), mêmes clés", () => {
  for (const province of court.PROVINCES) if (province !== "QC") assert.equal(EN.L.links[province], FR.L.links[province], province);
  assert.match(FR.L.links.QC, /quebec\.ca\/justice-et-etat-civil\/petites-creances$/);
  for (const group of ["verdicts", "subs", "limitation"]) assert.deepEqual(Object.keys(EN.L[group]), Object.keys(FR.L[group]), group);
});
