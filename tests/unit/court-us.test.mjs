// Tests du moteur « small claims » des États-Unis : plafonds des 51 juridictions, statut, dates d'effet, et textes de la page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { ruleEntries, ruleValues } from "./regles.mjs";

const court = createRequire(import.meta.url)("../../src/assets/engines/court-us.js");
const R = ruleValues("us");
const LIMITS = R.us_small_claims_limits;
const html = readFileSync(new URL("../../content/us/small-claims-court.html", import.meta.url), "utf8");
const L = JSON.parse(/<script type="application\/json" id="court-us-data">([\s\S]*?)<\/script>/.exec(html)[1]);
const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
const TODAY = "2026-10-23";

// Plafonds pour une personne physique au 23/10/2026, d'après les recherches (documentation/24, § 3).
const EXPECTED = { AL: 6000, AK: 10000, AZ: 5000, AR: 5000, CA: 12500, CO: 7500, CT: 5000, DE: 25000, DC: 10000, FL: 8000,
  GA: 15000, HI: 5000, ID: 15000, IL: 10000, IN: 10000, IA: 6500, KS: 10000, KY: 2500, LA: 5000, ME: 10000, MD: 5000,
  MA: 7000, MI: 7000, MN: 20000, MS: 3500, MO: 5000, MT: 7000, NE: 7500, NV: 10000, NH: 10000, NJ: 5000, NM: 10000,
  NY: 10000, NC: 10000, ND: 15000, OH: 6000, OK: 10000, OR: 10000, PA: 12000, RI: 5000, SC: 7500, SD: 12000, TN: 25000,
  TX: 20000, UT: 20000, VT: 10000, VA: 5000, WA: 10000, WV: 20000, WI: 10000, WY: 6000 };

test("51 juridictions, plafond de chacune pour une personne physique, bornes comprises", () => {
  assert.equal(court.STATES.length, 51);
  assert.deepEqual(Object.keys(LIMITS).sort(), [...court.STATES].sort());
  assert.deepEqual(Object.keys(EXPECTED).sort(), [...court.STATES].sort());
  for (const state of court.STATES) {
    const at = court.decide({ state, amount: EXPECTED[state], entity: false, date: TODAY }, R);
    assert.equal(at.max, EXPECTED[state], state);
    assert.notEqual(at.verdict, "above_limit", state);
    assert.equal(court.decide({ state, amount: EXPECTED[state] + 0.01, entity: false, date: TODAY }, R).verdict, "above_limit", state);
  }
});

test("plafonds qui dépendent du tribunal ou du comté : New York, Caroline du Nord, Pennsylvanie", () => {
  const range = (state, entity) => { const r = court.decide({ state, amount: 1, entity, date: TODAY }, R); return [r.min, r.max]; };
  assert.deepEqual(range("NY", false), [3000, 10000]);
  assert.deepEqual(range("NY", true), [5000, 10000]);
  assert.deepEqual(range("NC", false), [5000, 10000]);
  assert.deepEqual(range("PA", false), [10000, 12000]);
  assert.equal(court.decide({ state: "NY", amount: 3000, entity: false, date: TODAY }, R).verdict, "small_claims");
  assert.equal(court.decide({ state: "NY", amount: 3000.01, entity: false, date: TODAY }, R).verdict, "depends");
  assert.equal(court.decide({ state: "NY", amount: 10000, entity: false, date: TODAY }, R).verdict, "depends");
  assert.equal(court.decide({ state: "NC", amount: 7000, entity: true, date: TODAY }, R).verdict, "depends");
  for (const state of court.STATES.filter((s) => !["NY", "NC", "PA"].includes(s)))
    for (const entity of [false, true]) { const [min, max] = range(state, entity); assert.equal(min, max, `${state} ${entity}`); }
});

test("société ou LLC : plafond plus bas en Californie et dans l'État de Washington, le même ailleurs", () => {
  const max = (state, entity) => court.decide({ state, amount: 1, entity, date: TODAY }, R).max;
  assert.equal(max("CA", true), 6250);
  assert.equal(max("WA", true), 5000);
  assert.equal(court.decide({ state: "CA", amount: 6250.01, entity: true, date: TODAY }, R).verdict, "above_limit");
  assert.equal(court.decide({ state: "CA", amount: 6250.01, entity: false, date: TODAY }, R).verdict, "small_claims");
  for (const state of court.STATES.filter((s) => !["CA", "WA"].includes(s))) assert.equal(max(state, true), max(state, false), state);
});

test("changements du 01/01/2027 : Géorgie 25 000 $, Wisconsin 15 000 $ ; annoncés avant, appliqués à partir de la date", () => {
  for (const [state, before, after] of [["GA", 15000, 25000], ["WI", 10000, 15000]]) {
    const old = court.decide({ state, amount: 1, entity: false, date: "2026-12-31" }, R);
    assert.equal(old.max, before, state);
    assert.deepEqual(old.next, { limit: after, from: "2027-01-01" }, state);
    const now = court.decide({ state, amount: 1, entity: false, date: "2027-01-01" }, R);
    assert.equal(now.max, after, state);
    assert.equal(now.next, null, state);
  }
  for (const state of court.STATES.filter((s) => !["GA", "WI"].includes(s)))
    assert.equal(court.decide({ state, amount: 1, entity: false, date: TODAY }, R).next, null, state);
  assert.throws(() => court.decide({ state: "XX", amount: 1, entity: false, date: TODAY }, R));
  assert.throws(() => court.decide({ state: "CA", amount: 1, entity: false, date: "23/10/2026" }, R));
});

test("la page : une note et un lien par État, un choix par État, aucun texte inutilisé, source citée", () => {
  for (const group of ["notes", "links"]) assert.deepEqual(Object.keys(L[group]).sort(), [...court.STATES].sort(), group);
  for (const url of Object.values(L.links)) assert.match(url, /^https:\/\//);
  for (const state of court.STATES) assert.match(html, new RegExp(`<option value="${state}"[^>]*>[A-Z][^<]+</option>`), `choix ${state}`);
  const verdicts = new Set();
  for (const state of court.STATES) for (const entity of [false, true]) for (const amount of [1, 4000, 7000, 11000, 1e6])
    verdicts.add(court.decide({ state, amount, entity, date: TODAY }, R).verdict);
  assert.deepEqual(Object.keys(L.verdicts).sort(), [...verdicts].sort());
  assert.deepEqual(Object.keys(L.subs).sort(), [...verdicts].sort());
  assert.match(L.next, /\{date\}/);
  assert.deepEqual(front.sources, ["us_small_claims_limits"]);
  const rule = ruleEntries("us").us_small_claims_limits;
  assert.equal(rule.more_sources.length >= 50, true, "une source par État");
  assert.ok(front.title.length <= 60 && front.description.length <= 160);
});

test("la page : chaque montant d'une note vient de l'entrée de son État ; FAQ et chiffres repris des règles", () => {
  const numbers = (obj) => (typeof obj === "number" ? [obj] : obj && typeof obj === "object" ? Object.values(obj).flatMap(numbers) : []);
  const dollars = (text) => [...text.matchAll(/\$([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, "")));
  for (const state of court.STATES) {
    const own = new Set(numbers(LIMITS[state]));
    for (const amount of dollars(L.notes[state])) assert.ok(own.has(amount), `${state} : $${amount}`);
    for (const m of L.notes[state].matchAll(/(\d+) claims a (week|month|year)/g)) assert.ok(own.has(Number(m[1])), `${state} : ${m[0]}`);
  }
  // FAQ : plus petit et plus grand plafond, États nommés, changements de 2027, sociétés en Californie et à Washington.
  const all = court.STATES.map((s) => ({ s, max: court.decide({ state: s, amount: 1, entity: false, date: TODAY }, R).max }));
  const low = Math.min(...all.map((x) => x.max)), high = Math.max(...all.map((x) => x.max));
  const faq = front.faq[1][1];
  assert.ok(faq.includes(`$${low.toLocaleString("en-US")} in Kentucky`) && all.filter((x) => x.max === low).map((x) => x.s).join() === "KY");
  assert.ok(faq.includes(`$${high.toLocaleString("en-US")} in Delaware and Tennessee`) && all.filter((x) => x.max === high).map((x) => x.s).join() === "DE,TN");
  assert.ok(faq.includes("Georgia and Wisconsin") && faq.includes("January 1, 2027"));
  const llc = front.faq[2][1];
  assert.ok(llc.includes(`$${LIMITS.CA.entity_limit.toLocaleString("en-US")} instead of $${LIMITS.CA.limit.toLocaleString("en-US")}`));
  assert.ok(llc.includes(`$${LIMITS.WA.entity_limit.toLocaleString("en-US")} instead of $${LIMITS.WA.limit.toLocaleString("en-US")}`));
  assert.ok(llc.includes(`New Jersey above $${LIMITS.NJ.entity_lawyer_above.toLocaleString("en-US")}`));
  const allowed = new Set(court.STATES.flatMap((s) => numbers(LIMITS[s])));
  for (const amount of dollars(html.replace(/<script[\s\S]*?<\/script>/, ""))) assert.ok(allowed.has(amount), `page : $${amount}`);
});
