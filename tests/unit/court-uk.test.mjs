// Tests du moteur « small claims » du Royaume-Uni : barèmes aux bornes, circuits, intérêts, démarches, et textes de la page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { ruleEntries, ruleValues } from "./regles.mjs";

const court = createRequire(import.meta.url)("../../src/assets/engines/court-uk.js");
const R = ruleValues("uk");
const html = readFileSync(new URL("../../content/uk/small-claims-court.html", import.meta.url), "utf8");
const L = JSON.parse(/<script type="application\/json" id="court-uk-data">([\s\S]*?)<\/script>/.exec(html)[1]);

test("frais de dépôt : chaque tranche à ses bornes, 5 % arrondis au penny inférieur, 10 000 £ au-delà de 200 000 £", () => {
  const cases = [[0, 0], [0.01, 35], [300, 35], [300.01, 50], [500, 50], [500.01, 70], [1000, 70], [1000.01, 80], [1500, 80],
    [1500.01, 115], [3000, 115], [3000.01, 205], [5000, 205], [5000.01, 455], [10000, 455], [10000.01, 500],
    [12345.6, 617.28], [12345.67, 617.28], [20000.19, 1000], [150000, 7500], [200000, 10000], [200000.01, 10000], [1e6, 10000]];
  for (const [claimed, fee] of cases) assert.equal(court.issueFee(claimed, R), fee, `${claimed} £`);
});

test("frais d'audience des small claims : chaque tranche à ses bornes", () => {
  const cases = [[0, 0], [300, 27], [300.01, 59], [500, 59], [500.01, 85], [1000, 85], [1000.01, 123], [1500, 123],
    [1500.01, 181], [3000, 181], [3000.01, 346], [10000, 346]];
  for (const [claimed, fee] of cases) assert.equal(court.hearingFee(claimed, R), fee, `${claimed} £`);
});

test("circuits : bornes comprises (10 000, 25 000, 100 000 £)", () => {
  const cases = [[1, "small_claims"], [10000, "small_claims"], [10000.01, "fast_track"], [25000, "fast_track"],
    [25000.01, "intermediate_track"], [100000, "intermediate_track"], [100000.01, "multi_track"]];
  for (const [value, track] of cases) assert.equal(court.track(value, R), track, `${value} £`);
});

test("intérêts : Late Payment Act pour un client professionnel, 8 % pour un particulier", () => {
  // 2 500 £, 60 jours, taux de référence 3,75 % : 2 500 × 11,75 % × 60 / 365 = 48,29 £ ; indemnité de 70 £ (1 000 à 9 999,99 £).
  for (const client of ["company", "sole_trader"]) {
    const i = court.interest(2500, 60, 0.0375, client, R);
    assert.deepEqual(i, { basis: "late_payment_act", rate: 0.1175, interest: 48.29, compensation: 70 }, client);
  }
  assert.deepEqual(court.interest(2500, 60, 0.0375, "consumer", R), { basis: "court_rate", rate: 0.08, interest: 32.88, compensation: 0 });
  assert.equal(court.interest(500, 10, 0.0375, "company", R).compensation, 40);
  assert.equal(court.interest(10000, 10, 0.0375, "company", R).compensation, 100);
});

test("plan en Angleterre et au pays de Galles : montant réclamé, frais, circuit, voie et démarche avant le procès", () => {
  const base = { owed: 2500, daysLate: 60, referenceRate: 0.0375, place: "england_wales", addInterest: true };
  assert.deepEqual(court.plan({ ...base, client: "company" }, R), {
    place: "england_wales", interest: { basis: "late_payment_act", rate: 0.1175, interest: 48.29, compensation: 70 },
    claimed: 2618.29, issueFee: 115, track: "small_claims", hearingFee: 181, route: "online", preAction: "pre_action_conduct" });
  assert.equal(court.plan({ ...base, client: "sole_trader" }, R).preAction, "debt_protocol");
  const consumer = court.plan({ ...base, client: "consumer" }, R);
  assert.equal(consumer.claimed, 2532.88);
  assert.equal(consumer.preAction, "debt_protocol");
  // Sans intérêts, ou sans retard : on réclame la facture seule.
  assert.equal(court.plan({ ...base, client: "company", addInterest: false }, R).claimed, 2500);
  assert.equal(court.plan({ ...base, client: "company", daysLate: 0 }, R).interest.basis, "none");
  // Le circuit suit la facture (sans les intérêts), les frais suivent le total réclamé.
  const near = court.plan({ ...base, client: "company", owed: 9990 }, R);
  assert.ok(near.claimed > 10000);
  assert.equal(near.track, "small_claims");
  assert.equal(near.issueFee, Math.floor(near.claimed * 5) / 100);
  assert.equal(near.hearingFee, 346);
  const big = court.plan({ ...base, client: "company", owed: 30000 }, R);
  assert.equal(big.track, "intermediate_track");
  assert.equal(big.hearingFee, null);
  // Lecture prudente de la limite de Money Claim Online : le total réclamé, intérêts compris.
  assert.equal(court.plan({ ...base, client: "company", owed: 99000 }, R).route, "paper");
  assert.equal(court.plan({ ...base, client: "company", owed: 99000, addInterest: false }, R).route, "online");
  assert.equal(court.plan({ ...base, client: "company", owed: 0 }, R).issueFee, 0);
});

test("Écosse, Irlande du Nord, étranger : renvoi seulement ; situation inconnue refusée", () => {
  for (const place of ["scotland", "northern_ireland", "abroad"])
    for (const client of court.CLIENTS)
      assert.deepEqual(court.plan({ owed: 2500, daysLate: 60, referenceRate: 0.0375, client, place, addInterest: true }, R), { place, route: place });
  assert.throws(() => court.plan({ owed: 1, client: "charity", place: "england_wales" }, R));
  assert.throws(() => court.plan({ owed: 1, client: "company", place: "wales" }, R));
});

test("la page : un texte par clé, un choix par valeur, des sources présentes", () => {
  const used = { tracks: new Set(), track_notes: new Set(), pre_action: new Set(), routes: new Set(), route_titles: new Set() };
  for (const client of court.CLIENTS) for (const place of court.PLACES) for (const owed of [100, 20000, 50000, 200000]) {
    const p = court.plan({ owed, daysLate: 30, referenceRate: 0.0375, client, place, addInterest: true }, R);
    used.routes.add(p.route); used.route_titles.add(p.route);
    if (p.track) { used.tracks.add(p.track); used.track_notes.add(p.track); used.pre_action.add(p.preAction); }
  }
  for (const [group, keys] of Object.entries(used)) {
    for (const key of keys) assert.ok(typeof L[group][key] === "string" && L[group][key].length > 0, `texte ${group}.${key}`);
    assert.deepEqual(Object.keys(L[group]).filter((k) => !keys.has(k)), [], `${group} : aucun texte inutilisé`);
  }
  assert.deepEqual(Object.keys(L.interest).sort(), ["court_rate", "late_payment_act", "none", "not_late"]);
  assert.match(L.interest.late_payment_act, /\{rate\}/);
  for (const [name, values] of [["client", court.CLIENTS], ["place", court.PLACES]])
    for (const value of values) assert.match(html, new RegExp(`<select[^>]*name="${name}"[\\s\\S]*?<option value="${value}"`), `choix ${name}=${value}`);
  const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
  const rules = ruleEntries("uk");
  for (const key of front.sources) assert.ok(rules[key], `source ${key}`);
  for (const key of Object.keys(rules).filter((k) => k.startsWith("uk_") && /court|claim|track|protocol|pre_action|mcol|mediation|enforcement|limitation|simple_procedure|ni_small/.test(k)))
    assert.ok(front.sources.includes(key), `règle ${key} citée par la page`);
  assert.ok(front.title.length <= 60 && front.description.length <= 160);
});

test("la page : barèmes des tableaux identiques aux règles", () => {
  const gbp = (x) => "£" + x.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(x) ? 0 : 2 });
  const rows = (bands, cell) => bands.map((b, i) => {
    const from = i === 0 ? null : bands[i - 1].to;
    const label = i === 0 ? `Up to ${gbp(b.to)}` : b.to === null ? `More than ${gbp(from)}` : `${gbp(from + 0.01)} to ${gbp(b.to)}`;
    return `<tr><td>${label}</td><td>${cell(b)}</td></tr>`;
  });
  for (const row of rows(R.uk_money_claim_issue_fee, (b) => ("rate" in b ? `${b.rate * 100}% of the claim` : gbp(b.fee)))) assert.ok(html.includes(row), row);
  for (const row of rows(R.uk_small_claims_hearing_fee, (b) => gbp(b.fee))) assert.ok(html.includes(row), row);
});

test("la page : chaque montant, délai et taux cité vient des règles", () => {
  const amounts = new Set();
  const add = (x) => { amounts.add(x); amounts.add(Math.round((x + 0.01) * 100) / 100); };
  for (const b of [...R.uk_money_claim_issue_fee, ...R.uk_small_claims_hearing_fee]) { if (b.to !== null) add(b.to); if (b.fee) amounts.add(b.fee); }
  for (const v of Object.values(R.uk_civil_tracks)) add(v);
  for (const b of R.late_payment_fixed_compensation) amounts.add(b.amount);
  for (const v of [R.uk_mcol_conditions.max_claim_below, R.uk_scotland_simple_procedure.limit, R.uk_ni_small_claims.limit, R.uk_small_claims_mediation.claims_up_to]) amounts.add(v);
  const text = html.replace(/<script[\s\S]*?<\/script>/, (s) => s.replace(/\\"/g, '"'));
  for (const m of text.matchAll(/£([\d,]+(?:\.\d\d)?)/g)) assert.ok(amounts.has(Number(m[1].replace(/,/g, ""))), `montant £${m[1]}`);
  const days = new Set([R.uk_debt_pre_action_protocol.reply_days, R.uk_pre_action_conduct.straightforward_reply_days,
    R.uk_claim_response_deadlines.respond_days, R.uk_claim_response_deadlines.with_acknowledgment_days]);
  for (const m of text.matchAll(/(\d+) days/g)) assert.ok(days.has(Number(m[1])), `délai ${m[0]}`);
  assert.ok(text.includes("30 days") && text.includes("14 days") && text.includes("28 days"));
  for (const m of text.matchAll(/(\d+) years/g)) assert.equal(Number(m[1]), R.uk_limitation_simple_contract.years, m[0]);
  const rates = new Set([R.uk_court_interest_other_debts, R.late_payment_statutory_interest_margin, ...R.uk_money_claim_issue_fee.filter((b) => b.rate).map((b) => b.rate)]);
  for (const m of text.matchAll(/(\d+)%/g)) assert.ok(rates.has(Number(m[1]) / 100), `taux ${m[0]}`);
  assert.ok(text.includes("up to two defendants") && R.uk_mcol_conditions.max_defendants === 2);
  assert.ok(text.includes("one-hour") && R.uk_small_claims_mediation.session_hours === 1);
  for (const option of R.uk_enforcement_options) assert.ok(text.includes(option), `exécution : ${option}`);
});
