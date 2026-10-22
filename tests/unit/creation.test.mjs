// Tests des checklists de création (documentation/20-checklist-creation.md) : chaque étape est sourcée par une règle
// citée dans la page, chaque chiffre de la page est celui de sa règle, et le nombre d'étapes comptées dépend de la
// situation. Le comportement dans la page (cases mémorisées, progression) est vérifié par le parcours navigateur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const rulesOf = (country) => Object.fromEntries(Object.entries(JSON.parse(read(`data/rules/${country}.json`)).values).map(([k, v]) => [k, v.value]));
const CONDITION = /^(!?)([\w-]+)(?:=([\w-]+))?$/;   // même grammaire que checklist.js
const front = (html) => JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
const text = (s) => s.replace(/<[^>]+>/g, "").replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();

/** Étapes de la liste (intertitres exclus) : identifiant, règles, condition, conseillée, texte. */
function steps(html) {
  const list = /<ul class="checklist" id="checklist"[\s\S]*?<\/ul>/.exec(html)[0];
  return [...list.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/g)].filter(([, attrs]) => !/class="cl-group"/.test(attrs)).map(([, attrs, body]) => ({
    id: (/data-id="([^"]*)"/.exec(attrs) || [, null])[1],
    rules: (/data-rule="([^"]*)"/.exec(attrs) || [, ""])[1].split(/\s+/).filter(Boolean),
    when: (/data-when="([^"]*)"/.exec(attrs) || [, null])[1],
    optional: /\sdata-optional\b/.test(attrs),
    text: text(body)
  }));
}
const applies = (conds, s) => conds.trim().split(/\s+/).every((cond) => {
  const [, not, key, value] = CONDITION.exec(cond);
  const ok = value !== undefined ? String(s[key]) === value : !!s[key];
  return not ? !ok : ok;
});
const counted = (list, s) => list.filter((i) => !i.optional && (!i.when || applies(i.when, s))).length;
const fr = (n) => n.toLocaleString("fr-FR").replace(/[  ]/g, " ");

// Pages : fichier, règles du pays, champs de situation, nombre d'étapes comptées par situation, étapes conseillées,
// score affiché sans JavaScript.
const PAGES = {
  France: { file: "content/fr/creer-sa-micro-entreprise.html", country: "fr", fields: ["vente", "acre"], optional: ["compte"],
    counts: [[{}, 17], [{ acre: true }, 18], [{ vente: true }, 18], [{ vente: true, acre: true }, 19]], score: "0 démarches sur 17" },
  "Royaume-Uni": { file: "content/uk/how-to-become-a-sole-trader.html", country: "uk", fields: ["name", "home"], optional: [],
    counts: [[{}, 10], [{ name: true }, 11], [{ home: true }, 11], [{ name: true, home: true }, 12]], score: "0 of 10 steps" },
  "États-Unis": { file: "content/us/how-to-start-freelancing.html", country: "us", fields: ["name", "law"], optional: ["ein", "bank"],
    counts: [[{}, 7], [{ name: true }, 8], [{ law: true }, 8], [{ name: true, law: true }, 9]], score: "0 of 7 steps" }
};

for (const [label, P] of Object.entries(PAGES)) {
  const html = read(P.file), R = rulesOf(P.country), list = steps(html);

  test(`${label} : chaque étape porte une règle existante citée dans les sources, et chaque source sert à une étape`, () => {
    assert.ok(list.length > 0);
    const sources = front(html).sources, used = new Set(list.flatMap((i) => i.rules));
    for (const i of list) {
      assert.ok(i.id && i.rules.length, `${i.text.slice(0, 40)} : data-id et data-rule`);
      for (const key of i.rules) {
        assert.ok(R[key] !== undefined, `${i.id} : règle ${key}`);
        assert.ok(sources.includes(key), `${i.id} : ${key} dans les sources de la page`);
      }
    }
    for (const key of sources) assert.ok(used.has(key), `source ${key} utilisée par une étape`);
  });

  test(`${label} : conditions sur les seuls champs de situation mémorisés ; identifiants partagés par des variantes exclusives`, () => {
    for (const i of list) if (i.when) for (const cond of i.when.split(/\s+/)) {
      assert.match(cond, CONDITION, `${i.id} : condition lisible`);
      assert.ok(P.fields.includes(CONDITION.exec(cond)[2]), `${i.id} : ${cond}`);
    }
    for (const name of P.fields) assert.match(html, new RegExp(`name="${name}"[^>]*data-save`), `champ ${name} mémorisé`);
    for (const [s] of P.counts) {
      const shown = list.filter((i) => !i.when || applies(i.when, s)).map((i) => i.id);
      assert.equal(new Set(shown).size, shown.length, `identifiants uniques dans la situation ${JSON.stringify(s)}`);
    }
    assert.match(html, /id="checklist" data-persist="[\w-]+"/, "cases mémorisées");
  });

  test(`${label} : nombre d'étapes comptées selon la situation ; étapes conseillées hors du compte`, () => {
    for (const [s, n] of P.counts) assert.equal(counted(list, s), n, JSON.stringify(s));
    assert.deepEqual(list.filter((i) => i.optional).map((i) => i.id), P.optional);
    assert.ok(html.includes(`id="cl-score">${P.score}<`), "score affiché sans JavaScript : situation par défaut");
  });
}

const FR = read("content/fr/creer-sa-micro-entreprise.html"), R = rulesOf("fr"), S = steps(FR);
const step = (id, when) => S.find((i) => i.id === id && (when === undefined || i.when === when));

test("France : chiffres, dates et formulaires de la page repris des règles", () => {
  const T = R.tva_franchise_seuils;
  const checks = [
    [step("plafond", "!vente"), `${fr(R.micro_plafond_ca_services)} €`],
    [step("plafond", "vente"), `${fr(R.micro_plafond_ca_vente)} €`],
    [step("vl"), `${fr(R.vl_rfr_plafond_par_part_2026)} € par part en 2026`],
    [step("compte"), `${fr(R.compte_dedie_micro.seuil_ca)} € deux années civiles de suite`],
    [step("tva", "!vente"), `${fr(T.services_seuil)} € par an`], [step("tva", "!vente"), `${fr(T.services_seuil_majore)} €`],
    [step("tva", "vente"), `${fr(T.vente_seuil)} € par an`], [step("tva", "vente"), `${fr(T.vente_seuil_majore)} €`],
    [step("cfe"), R.cfe_declaration_initiale.formulaire], [step("cfe"), R.cfe_declaration_initiale.date_limite],
    [step("revenus"), R.micro_declaration_revenus.formulaire],
    [step("factures"), R.mention_franchise_tva],
    [step("guichet"), R.creation_guichet_unique.site], [step("urssaf"), R.micro_declaration_ca.en_ligne]
  ];
  for (const [s, expected] of checks) assert.ok(s && s.text.includes(expected), `${s && s.id} : « ${expected} »`);
  assert.equal(R.compte_dedie_micro.annees_consecutives, 2);
  // Délais écrits en toutes lettres dans les règles.
  assert.match(R.acre_conditions, /60 jours/);
  assert.ok(step("acre").text.includes("60 jours"));
  assert.match(R.versement_liberatoire_option, /3 mois/);
  assert.ok(step("vl").text.includes("3 mois"));
  assert.equal(R.facturation_electronique_calendrier.reception_toutes_entreprises, "2026-09-01");
  assert.ok(step("einvoice").text.includes("1er septembre 2026"));
  for (const piece of R.creation_guichet_unique.pieces) assert.ok(step("pieces").text.toLowerCase().includes(piece), piece);
  const faq = front(FR).faq.flat().join(" ");
  assert.ok(faq.includes("Au plus tard 60 jours") && faq.includes(R.creation_guichet_unique.site), "délai et site de la FAQ");
});

test("Royaume-Uni : montants, dates et délais de la page repris des règles", () => {
  const U = rulesOf("uk"), L = steps(read("content/uk/how-to-become-a-sole-trader.html"));
  const st = (id) => L.find((i) => i.id === id);
  const gbp = (n) => "£" + n.toLocaleString("en-GB");
  const day = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const checks = [
    [st("register"), `${gbp(U.trading_allowance)} in a tax year`], [st("register"), `by ${day(U.sa_registration_deadline)}`],
    [st("records"), `at least ${U.uk_records_retention.years_after_filing_deadline} years`],
    [st("mtd"), `over ${gbp(U.mtd_itsa_threshold_2026)}`],
    [st("vat"), gbp(U.vat_registration_threshold)],
    [st("return"), `by ${day(U.sa_online_return_deadline)}`],
    [st("pay"), `${gbp(U.payments_on_account_threshold)} or more`]
  ];
  for (const [s, expected] of checks) assert.ok(s && s.text.includes(expected), `${s && s.id} : « ${expected} »`);
  assert.deepEqual(U.payments_on_account_dates.map((d) => d.slice(5)), ["01-31", "07-31"]);
  assert.ok(st("pay").text.includes("on 31 January and 31 July"));
  assert.equal(U.sa_balancing_payment_deadline.slice(5), "01-31");
  for (const word of ["'limited'", "'Ltd'", "'LLP'", "'plc'"]) assert.ok(U.uk_business_name_rules[0].includes(word) && st("name").text.includes(word), word);
  const faq = front(read("content/uk/how-to-become-a-sole-trader.html")).faq.flat().join(" ");
  assert.ok(faq.includes(day(U.sa_registration_deadline)) && faq.includes(`For at least ${U.uk_records_retention.years_after_filing_deadline} years`), "dates et délais de la FAQ");
});

test("tous les montants des étapes et des FAQ viennent des règles (aucun montant écrit sans règle)", () => {
  const F = rulesOf("fr"), U = rulesOf("uk"), A = rulesOf("us"), T = F.tva_franchise_seuils;
  const allowed = {
    // 0 € : la déclaration de chiffre d'affaires « même nul ».
    "content/fr/creer-sa-micro-entreprise.html": { re: /(\d{1,3}(?: \d{3})*) €/g, values: [0, F.micro_plafond_ca_services, F.micro_plafond_ca_vente,
      F.vl_rfr_plafond_par_part_2026, F.compte_dedie_micro.seuil_ca, T.services_seuil, T.services_seuil_majore, T.vente_seuil, T.vente_seuil_majore] },
    "content/uk/how-to-become-a-sole-trader.html": { re: /£(\d{1,3}(?:,\d{3})*)/g, values: [U.trading_allowance, U.mtd_itsa_threshold_2026,
      U.vat_registration_threshold, U.payments_on_account_threshold] },
    "content/us/how-to-start-freelancing.html": { re: /\$(\d{1,3}(?:,\d{3})*)/g, values: [A.estimated_tax_threshold,
      A.freelance_law_new_york_state.written_contract_threshold_usd, A.freelance_law_nyc.written_contract_threshold_usd,
      A.freelance_law_illinois.written_contract_threshold_usd, A.freelance_law_california_state.written_contract_threshold_usd] }
  };
  for (const [file, { re, values }] of Object.entries(allowed)) {
    // Étapes et FAQ de la page.
    const texts = steps(read(file)).map((i) => i.text).concat(front(read(file)).faq.flat().map(text));
    const amounts = texts.flatMap((s) => [...s.matchAll(re)].map((m) => Number(m[1].replace(/[ ,]/g, ""))));
    assert.ok(amounts.length > 0, file);
    for (const a of amounts) assert.ok(values.includes(a), `${file} : ${a} n'est pas un montant des règles`);
  }
});

test("États-Unis : montants, dates, États et délais de la page repris des règles", () => {
  const A = rulesOf("us"), L = steps(read("content/us/how-to-start-freelancing.html"));
  const st = (id) => L.find((i) => i.id === id);
  const usd = (n) => "$" + n.toLocaleString("en-US");
  const day = (iso, year = true) => new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
  const [q1, q2, q3, q4] = A.estimated_tax_due_dates_2026;
  assert.ok(st("estimated").text.includes(`${usd(A.estimated_tax_threshold)} or more`));
  assert.ok(st("estimated").text.includes(`by ${day(q1, false)}, ${day(q2, false)} and ${day(q3)}, and ${day(q4)}`), st("estimated").text);
  assert.ok(st("return").text.includes(`by ${day(A.form_1040_due_date_tax_year_2026)}`));
  assert.ok(st("records").text.includes(`at least ${A.us_records_retention.general_years} years`));
  const law = st("contract").text;
  assert.ok(law.includes(`${usd(A.freelance_law_new_york_state.written_contract_threshold_usd)} in New York (State and City)`));
  assert.equal(A.freelance_law_nyc.written_contract_threshold_usd, A.freelance_law_new_york_state.written_contract_threshold_usd);
  assert.ok(law.includes(`${usd(A.freelance_law_illinois.written_contract_threshold_usd)} in Illinois`));
  assert.ok(law.includes(`${usd(A.freelance_law_california_state.written_contract_threshold_usd)} in California`));
  for (const k of ["freelance_law_new_york_state", "freelance_law_nyc", "freelance_law_illinois", "freelance_law_california_state"]) {
    assert.match(A[k].aggregation, /120 days/, k);
  }
  const STATES = { HI: "Hawaii", NM: "New Mexico", SD: "South Dakota", WV: "West Virginia" };
  assert.deepEqual(A.states_tax_services_by_default, Object.keys(STATES));
  assert.ok(st("state").text.includes("Hawaii, New Mexico, South Dakota and West Virginia tax services by default"));
  assert.equal(A.us_ein.needed_without_employees, false);
  const faq = front(read("content/us/how-to-start-freelancing.html")).faq.flat().join(" ");
  assert.ok(faq.includes(`by ${day(q1, false)}, ${day(q2, false)} and ${day(q3)}, and ${day(q4)}`) && faq.includes(`by ${day(A.form_1040_due_date_tax_year_2026)}`), "dates de la FAQ");
  assert.ok(faq.includes(`at least ${A.us_records_retention.general_years} years`));
});
