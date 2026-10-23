// Tests des guides de changement de statut (documentation/26-changement-de-statut.md) : chaque étape est sourcée par
// une règle citée dans la page, chaque chiffre est celui de sa règle, et le nombre d'étapes comptées dépend de la
// situation. Le comportement dans la page (cases mémorisées, progression) est vérifié par le parcours navigateur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const rulesOf = (country) => Object.fromEntries(Object.entries(JSON.parse(read(`data/rules/${country}.json`)).values).map(([k, v]) => [k, v.value]));
const CONDITION = /^(!?)([\w-]+)(?:=([\w-]+))?$/;   // même grammaire que checklist.js
const front = (html) => JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
const text = (s) => s.replace(/<[^>]+>/g, "").replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim();

/** Étapes de la liste (intertitres exclus) : identifiant, règles, condition, texte. */
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
const applies = (conds, s) => !conds || conds.trim().split(/\s+/).every((cond) => {
  const [, not, key, value] = CONDITION.exec(cond);
  const ok = value !== undefined ? String(s[key]) === value : !!s[key];
  return not ? !ok : ok;
});
const counted = (list, s) => list.filter((i) => !i.optional && applies(i.when, s)).length;

// Pages : fichier, pays, champs de situation, nombre d'étapes par situation, score sans JavaScript, règles citées en
// dehors des étapes (texte de la page).
const PAGES = {
  "Royaume-Uni": { file: "content/uk/sole-trader-to-limited-company.html", country: "uk", fields: ["vat", "salary", "staff"],
    counts: [[{ salary: true }, 6], [{}, 5], [{ vat: true, salary: true }, 7], [{ vat: true, salary: true, staff: true }, 8]], score: "0 of 6 steps", prose: [] },
  "États-Unis": { file: "content/us/sole-proprietor-to-llc.html", country: "us", fields: ["scorp", "employees"],
    counts: [[{}, 5], [{ scorp: true }, 7], [{ employees: true }, 6], [{ scorp: true, employees: true }, 8]], score: "0 of 5 steps", prose: [] },
  Canada: { file: "content/ca/incorporate-sole-proprietorship.html", country: "ca", fields: ["where", "gst", "salary", "assets"],
    counts: [[{ where: "federal", salary: true }, 6], [{ where: "ontario" }, 5], [{ where: "federal", gst: true, salary: true, assets: true }, 8]],
    score: "0 of 6 steps", prose: [] },
  "Canada (français)": { file: "content/ca-fr/constituer-societe.html", country: "ca", fields: ["where", "gst", "salary", "assets"],
    counts: [[{ where: "federal", salary: true }, 6], [{ where: "ontario" }, 5], [{ where: "federal", gst: true, salary: true, assets: true }, 8]],
    score: "0 étapes sur 6", prose: [] },
  France: { file: "content/fr/passer-en-societe.html", country: "fr", fields: ["forme", "transfert", "tva"],
    counts: [[{ forme: "sasu", transfert: "cessation" }, 9], [{ forme: "eurl", transfert: "cessation" }, 9],
      [{ forme: "sasu", transfert: "apport" }, 10], [{ forme: "eurl", transfert: "apport", tva: true }, 11]],
    score: "0 étapes sur 9", prose: ["option_regime_reel"] }
};

for (const [label, P] of Object.entries(PAGES)) {
  const html = read(P.file), R = rulesOf(P.country), list = steps(html);

  test(`${label} : chaque étape porte une règle existante citée dans les sources, et chaque source sert`, () => {
    assert.ok(list.length > 0);
    const sources = front(html).sources, used = new Set([...list.flatMap((i) => i.rules), ...P.prose]);
    for (const i of list) {
      assert.ok(i.id && i.rules.length, `${i.text.slice(0, 40)} : data-id et data-rule`);
      for (const key of i.rules) {
        assert.ok(R[key] !== undefined, `${i.id} : règle ${key}`);
        assert.ok(sources.includes(key), `${i.id} : ${key} dans les sources de la page`);
      }
    }
    for (const key of sources) assert.ok(used.has(key), `source ${key} utilisée`);
    assert.equal(front(html).id, "switch");
    assert.ok(front(html).title.length <= 60 && front(html).description.length <= 160, "titre et description");
  });

  test(`${label} : conditions sur les seuls champs mémorisés ; une seule variante de chaque étape par situation`, () => {
    for (const i of list) if (i.when) for (const cond of i.when.split(/\s+/)) {
      assert.match(cond, CONDITION, `${i.id} : condition lisible`);
      assert.ok(P.fields.includes(CONDITION.exec(cond)[2]), `${i.id} : ${cond}`);
    }
    for (const name of P.fields) assert.match(html, new RegExp(`name="${name}"[^>]*data-save`), `champ ${name} mémorisé`);
    for (const [s] of P.counts) {
      const shown = list.filter((i) => applies(i.when, s)).map((i) => i.id);
      assert.equal(new Set(shown).size, shown.length, `identifiants uniques dans la situation ${JSON.stringify(s)}`);
    }
    // Toute étape à variantes a une variante dans chaque situation (aucun trou).
    for (const id of new Set(list.filter((i) => i.when).map((i) => i.id)))
      if (list.filter((i) => i.id === id).length > 1)
        for (const [s] of P.counts) assert.equal(list.filter((i) => i.id === id && applies(i.when, s)).length, 1, `${id} dans ${JSON.stringify(s)}`);
    assert.match(html, /id="checklist" data-persist="[\w-]+"/, "cases mémorisées");
  });

  test(`${label} : nombre d'étapes comptées selon la situation`, () => {
    for (const [s, n] of P.counts) assert.equal(counted(list, s), n, JSON.stringify(s));
    assert.ok(html.includes(`id="cl-score">${P.score}<`), "score affiché sans JavaScript : situation par défaut");
  });
}

const get = (file) => { const L = steps(read(file)); return (id, when) => L.find((i) => i.id === id && (when === undefined || i.when === when)); };
const check = (pairs) => { for (const [s, expected] of pairs) assert.ok(s && s.text.includes(expected), `${s && s.id} : « ${expected} »`); };

test("Royaume-Uni : montants et délais repris des règles", () => {
  const U = rulesOf("uk"), st = get(PAGES["Royaume-Uni"].file);
  check([[st("incorporate"), `£${U.uk_companies_house_incorporation_fee.online} online`],
    [st("ct"), `Within ${U.uk_corporation_tax_registration.within_months_of_starting_business} months`],
    [st("ct"), `within ${U.uk_corporation_tax_registration.utr_posted_within_days} days`],
    [st("paye"), `no more than ${U.uk_paye_registration.earliest_months_before_first_payday} months before`],
    [st("el"), `£${U.uk_employers_liability_insurance.min_cover / 1e6} million`],
    [st("vat"), U.uk_vat_registration_transfer.form], [st("vat"), U.uk_vat_registration_transfer.alternative_cancel_form]]);
  assert.ok(U.uk_paye_registration.applies_to_sole_director && st("paye").text.includes("only director"));
  assert.ok(U.uk_vat_registration_transfer.new_entity_takes_vat_debts && st("vat").text.includes("takes on any VAT you still owe"));
  assert.ok(U.uk_company_registration_requirements.some((r) => /identity verification/.test(r)) && st("incorporate").text.includes("verify their identity"));
  assert.equal(U.sa_online_return_deadline.slice(5), "01-31");
  assert.ok(st("return").text.includes("by 31 January"));
});

test("États-Unis : montants et délais repris des règles", () => {
  const A = rulesOf("us"), st = get(PAGES["États-Unis"].file), D = A.us_s_election_deadline;
  check([[st("articles"), `less than $${A.us_llc_formation.registration_cost_usually_below}`],
    [st("form2553"), `${D.months} months and ${D.days} days`], [st("records"), `${A.us_records_retention.general_years} years`]]);
  assert.ok(D.or_during_preceding_year && st("form2553").text.includes("during the year before"));
  assert.deepEqual(A.us_new_ein_rules.single_llc_keeps_owner_ein_unless.length, 3);
  assert.ok(st("ein", "!scorp !employees").text.includes("has no employees and owes no excise tax"));
  assert.equal(A.us_ein.free, true);
  assert.match(A.us_new_ein_rules.single_llc_default_tax_treatment, /Schedule C/);
  assert.ok(text(read(PAGES["États-Unis"].file)).includes("its income still goes on your Schedule C"));
  const faq = front(read(PAGES["États-Unis"].file)).faq.flat().join(" ");
  assert.ok(faq.includes(`${D.months} months and ${D.days} days`) && faq.includes(`less than $${A.us_llc_formation.registration_cost_usually_below}`));
});

test("Canada : montants, délais et dates repris des règles, en anglais et en français", () => {
  const C = rulesOf("ca"), F = C.ca_federal_incorporation, S85 = C.ca_section_85_rollover, T2 = C.ca_t2_filing_deadline;
  const en = get(PAGES.Canada.file), fr = get(PAGES["Canada (français)"].file);
  const frn = (n) => n.toLocaleString("fr-FR").replace(/[\u00a0\u202f]/g, " ");
  check([[en("incorporate", "where=federal"), `$${F.online_fee} online`], [en("incorporate", "where=federal"), `$${F.express_extra_fee} more`],
    [en("incorporate", "where=federal"), `$${F.mail_fee} by email or mail`], [en("incorporate", "where=ontario"), `$${C.ca_ontario_incorporation_fee} online`],
    [en("s85"), `$${S85.max_late_penalty.toLocaleString("en-CA")}`], [en("s85"), S85.form],
    [en("t2"), `Within ${T2.months_after_year_end} months`], [en("t2"), `${T2.first_year_max_weeks} weeks`],
    [en("t1"), "June 15, 2027 for 2026"],
    [fr("incorporate", "where=federal"), `${F.online_fee} $ en ligne`], [fr("incorporate", "where=federal"), `${F.mail_fee} $ par courriel`],
    [fr("incorporate", "where=ontario"), `${C.ca_ontario_incorporation_fee} $ en ligne`],
    [fr("s85"), `${frn(S85.max_late_penalty)} $`], [fr("t2"), `${T2.months_after_year_end} mois`], [fr("t1"), "15 juin 2027 pour 2026"]]);
  assert.equal(C.filing_deadline_self_employed, "2027-06-15");
  assert.deepEqual(F.provinces_registered_at_same_time, ["ON", "NS", "NL"]);
  assert.equal(F.ontario_registration_fee, 0);
  assert.equal(C.ca_business_number.quebec_gst_administered_by, "Revenu Québec");
  const strip = (file) => steps(read(file)).map(({ id, rules, when, optional }) => JSON.stringify({ id, rules, when, optional }));
  assert.deepEqual(strip(PAGES["Canada (français)"].file), strip(PAGES.Canada.file), "page française : mêmes étapes, mêmes conditions");
});

test("France : délais, taux et sites repris des règles", () => {
  const R = rulesOf("fr"), st = get(PAGES.France.file), C = R.creation_societe_etapes, M = R.micro_cessation, T = R.tva_cessation_delais;
  const pct = (x) => `${Math.round(x * 100)} %`;
  check([[st("capital", "forme=sasu"), pct(C.versement_min_sasu)], [st("capital", "forme=eurl"), pct(C.versement_min_eurl)],
    [st("capital", "forme=sasu"), `${C.solde_ans} ans`], [st("guichet"), C.site],
    [st("fin", "transfert=cessation"), `${M.declaration_cessation_jours} jours`],
    [st("fin", "transfert=apport"), `${R.apport_ei_societe.declarations_jours_apres_annonce_legale} jours`],
    [st("ca"), `${M.derniere_declaration_mensuelle_jours} jours en déclaration mensuelle`], [st("ca"), R.micro_declaration_ca.en_ligne],
    [st("impot"), `${M.declaration_2042_c_pro_jours} jours`],
    [st("tva"), `${T.ca12_jours} jours au régime simplifié`], [st("tva"), `${T.ca3_jours} jours au régime normal`]]);
  assert.equal(C.capital_minimum, null);
  assert.ok(st("capital", "forme=sasu").text.includes("pas de capital minimum"));
  assert.ok(R.apport_ei_societe.dettes_cotisations_transferees === false && st("apport").text.includes("sauf les dettes de cotisations sociales"));
  assert.ok(R.apport_ei_societe.nouveau_siren && st("factures").text.includes("numéro SIREN"));
  const page = text(read(PAGES.France.file));
  assert.equal(R.option_regime_reel.duree_ans, 1);
  assert.ok(page.includes("L'option vaut un an et se renouvelle tacitement") && page.includes("3e mois") && page.includes("2035"));
  const faq = front(read(PAGES.France.file)).faq.flat().join(" ");
  for (const s of [pct(C.versement_min_sasu), pct(C.versement_min_eurl), `${C.solde_ans} ans`, `${M.declaration_cessation_jours} jours`,
    `${R.apport_ei_societe.declarations_jours_apres_annonce_legale} jours`, `${M.declaration_2042_c_pro_jours} jours`]) assert.ok(faq.includes(s), s);
});

test("tous les montants des étapes et des FAQ viennent des règles", () => {
  const U = rulesOf("uk"), A = rulesOf("us"), C = rulesOf("ca");
  const allowed = {
    uk: [U.uk_companies_house_incorporation_fee.online, U.uk_employers_liability_insurance.min_cover / 1e6],
    us: [A.us_llc_formation.registration_cost_usually_below],
    ca: [C.ca_federal_incorporation.online_fee, C.ca_federal_incorporation.express_extra_fee, C.ca_federal_incorporation.mail_fee,
      C.ca_ontario_incorporation_fee, C.ca_section_85_rollover.max_late_penalty]
  };
  for (const P of Object.values(PAGES)) {
    if (P.country === "fr") continue;
    const html = read(P.file), body = steps(html).map((i) => i.text).join(" ") + " " + front(html).faq.flat().join(" ");
    const found = [...body.matchAll(/£([\d,]+)|\$([\d,]+)|(\d[\d \u00a0\u202f]*)[ \u00a0\u202f]\$/g)].map((m) => Number((m[1] || m[2] || m[3]).replace(/[, \u00a0\u202f]/g, "")));
    for (const n of found) assert.ok(allowed[P.country].includes(n), `${P.file} : ${n}`);
  }
});
