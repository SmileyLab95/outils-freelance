// Tests du générateur de terms and conditions britannique (documentation/45-cgv-royaume-uni.md) : moteur
// engines/cgv-uk.js (intérêt légal du semestre, repères, contrôles, formulaire d'annulation), puis la page rendue par
// engines/contract-doc.js pour chaque clientèle et chaque façon de conclure les contrats, comparée aux règles
// officielles (data/rules/uk.json).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ruleValues, ruleEntries } from "./regles.mjs";

const require = createRequire(import.meta.url);
const C = require("../../src/assets/engines/cgv-uk.js");
const K = require("../../src/assets/engines/contract-doc.js");
const R = ruleValues("uk");
const TODAY = "2026-10-30";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmt = {
  pct: (rate) => { const n = Math.round(rate * 10000) / 100; return (Number.isInteger(n) ? String(n) : n.toFixed(2)) + "%"; },
  num: (n) => String(n),
  money: (n) => "£" + n,
  date: (iso) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`,
};
const codes = (p) => p.checks.map((c) => c.code);
const prep = (raw, today = TODAY) => C.prepare(raw, R, today, fmt);

// Saisie complète et valide (entreprises et particuliers, contrats à distance).
const OK = {
  clients: "both", distance: "on", offsite: "off", p_name: "Jane Smith", p_trading: "", status: "sole", p_company: "",
  registered: "ew", p_registered: "", p_address: "12 Station Road, Leeds LS1 4AB", vat: "none", p_vat: "",
  p_email: "hello@example.co.uk", p_phone: "07700 900123", p_privacy: "https://www.example.co.uk/privacy", p_body: "",
  p_insurance: "", activity: "", adr_name: "", adr_site: "", pricing: "quote", rates: "", validity: "30", deposit: "",
  terms: "30", pay_transfer: "on", pay_card: "off", pay_link: "off", penalty: "statutory", penalty_rate: "",
  acceptance: "10", notice: "14", ip: "assign", portfolio: "on", conf: "on", liability: "on", subcontract: "off", law: "ew",
};

// ------------------------------------------------------------------------------------------------------------
// Règles et moteur

test("règles : nouvelles règles sourcées à legislation.gov.uk ou GOV.UK, lues le 30/10/2026", () => {
  const E = ruleEntries("uk");
  for (const key of ["uk_service_provider_information", "uk_consumer_contract_information", "uk_consumer_cancellation",
    "uk_cancellation_model_form", "uk_consumer_service_rights", "uk_unfair_terms", "uk_business_exclusion_clauses",
    "late_payment_substantial_remedy", "uk_complaints_adr"]) {
    assert.ok(E[key], key);
    assert.match(E[key].source, /^https:\/\/(www\.legislation\.gov\.uk|www\.gov\.uk|assets\.publishing\.service\.gov\.uk)\//, key);
    assert.equal(E[key].verified_on, "2026-10-30", key);
    assert.match(E[key].note, /SHA-256|image/, `${key} : empreinte ou explication`);
  }
  assert.equal(E.uk_cancellation_model_form.confidence, "medium", "texte de l'annexe 3 publié en image : confiance moyenne");
  assert.ok(R.uk_service_provider_information.contact_details.includes("a telephone number"), "reg. 7(2)(b)");
  assert.equal(R.uk_consumer_cancellation.period_days, 14);
  assert.equal(R.uk_consumer_cancellation.refund_days, 14);
  assert.equal(R.uk_complaints_adr.general_duty_to_join, false);
  assert.equal(R.uk_complaints_adr.in_force, "2026-04-06");
});

test("intérêt légal : 8 % + taux de référence du semestre (11,75 % en 2026), semestre absent", () => {
  assert.equal(R.late_payment_statutory_interest_margin, 0.08);
  assert.deepEqual(C.statutoryRate(R, "2026-10-30"), { rate: 0.1175, from: "2026-07-01", to: "2026-12-31" });
  assert.deepEqual(C.statutoryRate(R, "2025-03-01"), { rate: 0.1275, from: "2025-01-01", to: "2025-06-30" });
  assert.equal(C.statutoryRate(R, "2025-07-01").rate, 0.1225);
  assert.equal(C.statutoryRate(R, "2030-01-01"), null);
  assert.equal(C.statutoryRate(R, "2026-12-31").rate, 0.1175, "dernier jour du semestre compris");
  assert.equal(C.statutoryRate(R, "2026-06-30").to, "2026-06-30");
  assert.equal(C.statutoryRate(R, "2026-07-01").rate, R.late_payment_statutory_interest_rate_current, "même taux que la règle du taux en vigueur");
});

test("formulaire d'annulation : modèle officiel mot pour mot, coordonnées du prestataire, lignes à remplir", () => {
  const form = C.cancellationForm(R), lines = R.uk_cancellation_model_form.form;
  assert.equal(lines.length, 8);
  assert.match(lines[0], /^To \[here the trader’s name, geographical address/);
  assert.equal(form[0], "To {p_name}[[p_address|, {p_address}]][[p_email|, {p_email}]]:", "coordonnées remplies par le prestataire");
  assert.equal(form[1], lines[1], "phrase d'annulation intacte");
  assert.deepEqual(form[2], { field: "" }, "ligne pour décrire la prestation");
  assert.deepEqual(form.slice(3, 8), lines.slice(2, 7).map((l) => ({ field: l })), "lignes que le consommateur remplit");
  assert.equal(form[8], "[*] Delete as appropriate.");
  assert.equal(C.cancellationForm({}).length, 0);
});

test("repères : annulation selon la clientèle et la façon de conclure le contrat", () => {
  const f = (set) => prep({ ...OK, ...set }).flags;
  assert.equal(f({ clients: "pro", distance: "on", offsite: "on" }).retract, "off", "entreprises : pas d'annulation");
  assert.equal(f({ clients: "part", distance: "on" }).retract, "on");
  assert.equal(f({ clients: "both", distance: "off", offsite: "on" }).retract, "on");
  assert.equal(f({ clients: "part", distance: "off", offsite: "off" }).retract, "off", "dans les locaux : pas d'annulation");
  assert.equal(f({ clients: "part", offsite: "on" }).offsite_part, "on");
  assert.equal(f({ clients: "pro", offsite: "on" }).offsite_part, "off");
  assert.deepEqual([f({ clients: "x" }).clients, f({ status: "x" }).status, f({ law: "x" }).law, f({ penalty: "x" }).penalty], ["pro", "sole", "ew", "statutory"]);
  assert.equal(f({ clients: "part", liability: "on" }).liability, "off", "plafond : entreprises seulement");
  assert.equal(f({ clients: "part", adr_name: "ADR" }).adr, "on");
  assert.equal(f({ clients: "pro", adr_name: "ADR" }).adr, "off");
  assert.deepEqual([f({ vat: "vat", clients: "both" }).part_vat, f({ vat: "vat", clients: "both" }).pro_vat, f({ vat: "none" }).pro_vat], ["on", "on", "off"]);
  assert.deepEqual([f({ vat: "vat", clients: "pro" }).part_vat, f({ vat: "vat", clients: "part" }).pro_vat], ["off", "off"]);
});

test("coordonnées et informations obligatoires (Provision of Services Regulations 2009) : contrôles", () => {
  assert.deepEqual(codes(prep(OK)), ["liability_reasonable"], "saisie complète : seul le rappel du plafond");
  const empty = prep({ ...OK, p_name: " ", p_address: "", p_phone: "", p_email: "", p_privacy: "" });
  assert.deepEqual(codes(empty).slice(0, 5), ["name_missing", "address_missing", "phone_missing", "email_missing", "privacy_missing"]);
  assert.deepEqual(empty.checks.slice(0, 4).map((c) => c.level), ["error", "error", "warn", "warn"]);
  assert.ok(codes(prep({ ...OK, status: "limited" })).includes("company_number_missing"));
  assert.ok(!codes(prep({ ...OK, status: "limited", p_company: "12345678" })).includes("company_number_missing"));
  assert.ok(!codes(prep({ ...OK, status: "partnership" })).includes("company_number_missing"));
  assert.ok(codes(prep({ ...OK, vat: "vat" })).includes("vat_number_missing"));
  assert.ok(!codes(prep({ ...OK, vat: "vat", p_vat: "GB123456789" })).includes("vat_number_missing"));
});

test("délai de paiement : au-delà de 60 jours entre entreprises signalé, à réception", () => {
  const max = R.late_payment_default_due_period.business_max_days;
  assert.equal(max, 60);
  assert.ok(!codes(prep({ ...OK, terms: "60" })).includes("terms_over_max"));
  const over = prep({ ...OK, terms: "61" });
  assert.deepEqual(over.checks.find((c) => c.code === "terms_over_max"), { code: "terms_over_max", field: "terms", level: "warn", params: { max } });
  assert.ok(!codes(prep({ ...OK, clients: "part", terms: "90" })).includes("terms_over_max"), "particuliers : pas de règle des 60 jours");
  for (const bad of ["", "abc", "-1", "30.5"]) assert.ok(codes(prep({ ...OK, terms: bad })).includes("terms_invalid"), bad);
  assert.equal(prep({ ...OK, terms: "0" }).text.terms_text, "on receipt");
  assert.equal(prep({ ...OK, terms: "30" }).text.terms_text, "within 30 days of the invoice date");
  assert.equal(prep({ ...OK, terms: "x" }).text.terms_text, "");
});

test("retard entre entreprises : intérêt légal, indemnités 40/70/100 £, taux contractuel contrôlé", () => {
  const p = prep(OK);
  assert.equal(p.text.interest_text, "statutory interest under the Late Payment of Commercial Debts (Interest) Act 1998, at 8% a year above the Bank of England reference rate (11.75% a year for debts that become overdue between 1 July 2026 and 31 December 2026)");
  assert.deepEqual(R.late_payment_fixed_compensation.map((s) => s.amount), [40, 70, 100]);
  assert.equal(p.text.fixed_sums, "£40, £70 or £100");
  const unknown = prep(OK, "2030-02-01");
  assert.ok(codes(unknown).includes("rates_unknown"));
  assert.equal(unknown.text.interest_text, "statutory interest under the Late Payment of Commercial Debts (Interest) Act 1998, at 8% a year above the Bank of England reference rate", "formule sans taux");
  assert.ok(!codes(prep({ ...OK, clients: "part" }, "2030-02-01")).includes("rates_unknown"), "particuliers : pas d'intérêt légal");
  const custom = prep({ ...OK, penalty: "custom", penalty_rate: "15" });
  assert.equal(custom.text.interest_text, "interest at 15% a year");
  assert.deepEqual(codes(custom), ["liability_reasonable"]);
  const low = prep({ ...OK, penalty: "custom", penalty_rate: "5" });
  assert.deepEqual(low.checks.find((c) => c.code === "penalty_low"), { code: "penalty_low", field: "penalty_rate", level: "info", params: { rate: "11.75%" } });
  assert.ok(!codes(prep({ ...OK, penalty: "custom", penalty_rate: "11.75" })).includes("penalty_low"), "égal au taux légal : pas d'alerte");
  for (const bad of ["", "0", "x", "-2"]) {
    const r = prep({ ...OK, penalty: "custom", penalty_rate: bad });
    assert.ok(codes(r).includes("penalty_invalid"), bad);
    assert.equal(r.text.interest_text, "", `taux illisible jamais écrit (${bad})`);
  }
});

test("acompte, moyens de paiement, délais : contrôles et textes", () => {
  assert.equal(prep({ ...OK, deposit: "25" }).flags.has_deposit, "on");
  assert.equal(prep({ ...OK, deposit: "25" }).text.deposit, "25");
  for (const v of ["", "0"]) assert.equal(prep({ ...OK, deposit: v }).flags.has_deposit, "off", v);
  for (const bad of ["x", "-5", "101"]) {
    const r = prep({ ...OK, deposit: bad });
    assert.ok(codes(r).includes("deposit_invalid"), bad);
    assert.equal(r.flags.has_deposit, "off", `acompte illisible jamais écrit (${bad})`);
  }
  assert.ok(codes(prep({ ...OK, pay_transfer: "off" })).includes("payment_none"));
  assert.equal(prep({ ...OK, pay_card: "on", pay_link: "on" }).text.payment_methods, "bank transfer, card or online payment link");
  assert.equal(prep({ ...OK, pay_transfer: "off", pay_card: "on" }).text.payment_methods, "card");
  assert.ok(codes(prep({ ...OK, acceptance: "0" })).includes("acceptance_invalid"));
  assert.ok(!codes(prep({ ...OK, clients: "part", acceptance: "" })).includes("acceptance_invalid"), "réception : entreprises seulement");
  assert.ok(codes(prep({ ...OK, notice: "" })).includes("notice_invalid"));
  assert.ok(!codes(prep({ ...OK, notice: "0" })).includes("notice_invalid"));
  assert.ok(codes(prep({ ...OK, validity: "0" })).includes("validity_invalid"));
});

test("particuliers : dans les locaux, ADR incomplet ; entreprises : plafond à justifier", () => {
  assert.ok(codes(prep({ ...OK, clients: "part", distance: "off", offsite: "off" })).includes("premises_only"));
  assert.ok(!codes(prep({ ...OK, clients: "pro", distance: "off", offsite: "off" })).includes("premises_only"));
  assert.ok(codes(prep({ ...OK, clients: "part", adr_name: "Scheme" })).includes("adr_incomplete"));
  assert.ok(!codes(prep({ ...OK, clients: "part", adr_name: "Scheme", adr_site: "https://x.uk" })).includes("adr_incomplete"));
  assert.ok(!codes(prep({ ...OK, clients: "pro", adr_name: "Scheme" })).includes("adr_incomplete"));
  assert.ok(!codes(prep({ ...OK, liability: "off" })).includes("liability_reasonable"));
  assert.ok(!codes(prep({ ...OK, clients: "part", liability: "on" })).includes("liability_reasonable"));
});

test("textes calculés depuis les règles : 14 jours, statut, droit applicable", () => {
  const t = prep(OK).text;
  const other = C.prepare(OK, { ...R, uk_consumer_cancellation: { period_days: 30, refund_days: 21 }, uk_consumer_service_rights: { refund_days: 7 },
    late_payment_fixed_compensation: [{ from: 0, to: null, amount: 55 }] }, TODAY, fmt).text;
  assert.deepEqual([other.cancel_days, other.refund_days, other.rights_refund_days, other.fixed_sums], ["30", "21", "7", "£55"], "chiffres lus dans les règles");
  assert.deepEqual([t.cancel_days, t.refund_days, t.rights_refund_days], ["14", "14", "14"]);
  assert.equal(t.service_payment, R.uk_cancellation_model_form.service_payment);
  assert.equal(t.status_text, "a sole trader");
  assert.equal(prep({ ...OK, status: "partnership" }).text.status_text, "a partnership");
  assert.equal(prep({ ...OK, status: "limited", p_company: "12345678", registered: "sc", p_registered: "1 George Street, Edinburgh" }).text.status_text,
    "a limited company registered in Scotland under company number 12345678, registered office: 1 George Street, Edinburgh");
  assert.equal(prep({ ...OK, status: "limited", registered: "x" }).text.status_text, "a limited company registered in England and Wales");
  assert.deepEqual(["ew", "sc", "ni"].map((law) => prep({ ...OK, law }).text.law_name), ["England and Wales", "Scotland", "Northern Ireland"]);
  assert.match(prep({ ...OK, distance: "on", offsite: "on" }).text.where, /at a distance .* or away from our business premises/);
  assert.match(prep({ ...OK, distance: "off", offsite: "on" }).text.where, /^away from our business premises/);
});

// ------------------------------------------------------------------------------------------------------------
// Page

const html = readFileSync(new URL("../../content/uk/terms-and-conditions-generator.html", import.meta.url), "utf8");
const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
const D = JSON.parse(/id="cgv-data">([\s\S]*?)<\/script>/.exec(html)[1]);
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].slice(1).map((m) => [m[1], m[2] === undefined ? true : m[2]]));
function fields() {
  const form = /<form[^>]*id="cgv-form"[\s\S]*?<\/form>/.exec(html)[0], out = {};
  for (const m of form.matchAll(/<input [^>]*>/g)) {
    const a = attrs(m[0]);
    out[a.name] = { id: a.id, type: a.type, value: a.value || "", checked: !!a.checked };
  }
  for (const m of form.matchAll(/<textarea [^>]*>/g)) { const a = attrs(m[0]); out[a.name] = { id: a.id, type: "textarea", value: "" }; }
  for (const m of form.matchAll(/<select id="([\w-]+)" name="(\w+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const options = [...m[3].matchAll(/<option value="([^"]*)"( selected)?>([^<]*)<\/option>/g)].map((o) => ({ value: o[1], selected: !!o[2], text: o[3] }));
    out[m[2]] = { id: m[1], type: "select", options, value: (options.find((o) => o.selected) || options[0]).value };
  }
  return out;
}
function render(set = {}, rules = R) {
  const raw = {}, text = {};
  for (const [name, f] of Object.entries(fields())) {
    raw[name] = name in set ? set[name] : f.type === "checkbox" ? (f.checked ? "on" : "off") : f.value;
    if (f.type !== "checkbox") text[name] = raw[name];
  }
  const p = C.prepare(raw, rules, TODAY, fmt);
  Object.assign(text, p.text, { contacts: [raw.p_email, raw.p_phone].filter(Boolean).join(", "), today: "30 October 2026", title: D.ui.title_prefix });
  const flags = Object.assign(K.flags(raw), p.flags);
  return { html: K.render(D, { raw: flags, text, blocks: p.blocks }), flags, checks: p.checks };
}
const plain = (h) => h.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("page : en-tête, scripts, sources, menu, liens de langue, messages de tous les contrôles", () => {
  assert.equal(front.id, "cgv", "même identifiant que la page française (liens de langue)");
  assert.deepEqual(front.scripts, ["engines/contract-doc.js", "engines/cgv-uk.js", "tools/cgv.js"]);
  assert.ok(front.title.length <= 60 && front.description.length <= 160, "titre et description");
  assert.ok(front.faq.length >= 3 && front.faq.length <= 6);
  for (const key of front.sources) assert.ok(key in R, `source ${key}`);
  assert.deepEqual([D.country, D.lang, D.store], ["uk", "en-GB", "cgv-uk"], "moteur, langue et enregistrement propres au Royaume-Uni");
  const nav = JSON.parse(readFileSync(new URL("../../content/uk/site.json", import.meta.url), "utf8")).nav.find((g) => g.key === "sell").items;
  assert.equal(nav[nav.indexOf("cgv") - 1], "nda", "menu « Selling », après l'accord de confidentialité comme en France");
  const engine = readFileSync(new URL("../../src/assets/engines/cgv-uk.js", import.meta.url), "utf8");
  const all = [...engine.matchAll(/check\("(\w+)"/g)].map((m) => m[1]);
  assert.ok(all.length >= 20);
  for (const code of all) assert.ok(D.ui.checks[code], `message du contrôle ${code}`);
  for (const code of Object.keys(D.ui.checks)) assert.ok(all.includes(code), `message sans contrôle : ${code}`);
  assert.match(D.ui.checks.terms_over_max, /\{max\}/);
  assert.match(D.ui.checks.penalty_low, /\{rate\}/);
});

test("page : chiffres de la FAQ et des explications = règles", () => {
  const faq = JSON.stringify(front.faq);
  assert.ok(faq.includes(`${R.uk_consumer_cancellation.period_days} days`));
  assert.ok(faq.includes(`${fmt.pct(R.late_payment_statutory_interest_margin)} a year above the Bank of England reference rate`));
  assert.ok(faq.includes(R.late_payment_fixed_compensation.map((s) => "£" + s.amount).slice(0, 2).join(", ") + " or £100"));
  assert.ok(faq.includes("6 April 2026") && R.uk_complaints_adr.in_force === "2026-04-06");
  const prose = html.slice(html.indexOf('<section class="section prose">'));
  assert.ok(prose.includes(`“${R.uk_consumer_contract_information.order_button}”`), "bouton de commande");
  assert.ok(prose.includes(`${R.uk_consumer_cancellation.period_days} days`));
});

test("page : chaque champ des textes existe (formulaire ou valeur calculée)", () => {
  const f = fields(), computed = Object.keys(C.prepare(OK, R, TODAY, fmt).text).concat(["contacts", "today", "title"]);
  const doc = JSON.stringify({ ...D, ui: null });
  const keys = new Set([...doc.matchAll(/\{(\w+)\}|\[\[(\w+)\|/g)].map((m) => m[1] || m[2]));
  keys.delete("n"); keys.delete("title");
  for (const key of keys) assert.ok(key in f || computed.includes(key), `champ {${key}}`);
  for (const key of Object.keys(OK)) assert.ok(key in f, `champ du formulaire ${key}`);
  const conds = new Set([...doc.matchAll(/"when":\{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/"(\w+)":/g)].map((x) => x[1])));
  const flags = render().flags;
  for (const c of conds) assert.ok(c in flags, `condition ${c}`);
});

const CLIENTS = ["pro", "part", "both"];
const MODES = { distance: { distance: "on", offsite: "off" }, offsite: { distance: "off", offsite: "on" }, both: { distance: "on", offsite: "on" }, premises: { distance: "off", offsite: "off" } };

for (const clients of CLIENTS) {
  for (const [mode, set] of Object.entries(MODES)) {
    test(`rendu : clients ${clients}, contrats ${mode}`, () => {
      const r = render({ ...OK, clients, ...set, adr_name: "Example ADR", adr_site: "https://adr.example.org.uk" });
      const out = plain(r.html);
      assert.doesNotMatch(r.html, /\{\w+\}|\[\[|undefined|k-blank/, "aucune clé brute ni case vide avec une saisie complète");
      const nums = [...r.html.matchAll(/<h3>(\d+)\. /g)].map((m) => Number(m[1]));
      assert.deepEqual(nums, nums.map((_, i) => i + 1), "articles numérotés sans trou");
      const pro = clients !== "part", part = clients !== "pro";
      const cancel = part && (set.distance === "on" || set.offsite === "on");
      assert.equal(r.html.includes("Annex – Model cancellation form"), cancel, "annexe si et seulement si l'annulation s'applique");
      assert.equal(out.includes("Cancellation (consumers)"), cancel);
      assert.equal(out.includes("Your rights as a consumer"), part);
      assert.equal(out.includes("fixed compensation of £40, £70 or £100"), pro);
      assert.equal(out.includes("is limited to the total price payable under the quote"), pro, "plafond : entreprises seulement");
      assert.equal(out.includes("these Terms do not limit our liability to you or your legal rights"), part);
      assert.equal(out.includes("treated as accepted"), pro, "réception tacite : entreprises seulement");
      assert.equal(out.includes("entire agreement"), pro, "« entire agreement » : entreprises seulement");
      assert.equal(out.includes("may suspend the services"), pro);
      assert.equal(out.includes("the courts of the part of the UK where you live"), part, "juridiction du lieu de résidence (CMA37)");
      assert.equal((out.match(/have exclusive jurisdiction/g) || []).length, pro ? 1 : 0, "une seule clause de juridiction exclusive, jamais envers un particulier");
      assert.equal(out.includes("Business customers: the courts of"), clients === "both");
      assert.equal(out.includes("Business customers:"), pro);
      assert.equal(out.includes("Example ADR"), part, "ADR : particuliers seulement");
      assert.equal(out.includes("on paper or by email, if the contract was made away from our business premises"), part && set.offsite === "on");
      assert.equal(out.includes("in your presence away from our business premises"), part && set.offsite === "on");
      assert.ok(out.includes("Nothing in these Terms limits or excludes our liability for death or personal injury caused by our negligence"));
      if (cancel) {
        assert.ok(out.includes("within 14 days without giving any reason") && out.includes("14 days after the day the contract is entered into"));
        assert.ok(out.includes("no later than 14 days after the day we are told of your decision, using the same means of payment"));
        assert.ok(out.includes(R.uk_cancellation_model_form.service_payment), "phrase type sur le paiement proportionnel, mot pour mot");
        assert.ok(out.includes("To Jane Smith, 12 Station Road, Leeds LS1 4AB, hello@example.co.uk:"));
        assert.ok(out.includes(R.uk_cancellation_model_form.form[1]), "formulaire mot pour mot");
        assert.ok(out.includes("If, at your request, the services are fully performed within the cancellation period and you acknowledged that you would then lose your right to cancel"), "perte du droit (reg. 36(2))");
      }
    });
  }
}

test("rendu : aucune clause de la liste grise envers un particulier (Consumer Rights Act 2015, annexe 2 ; CMA37)", () => {
  const out = plain(render({ ...OK, clients: "part", deposit: "50" }).html);
  assert.doesNotMatch(out, /non-refundable|as updated from time to time|at our sole discretion|without notice|we are not liable|exclusive jurisdiction|treated as accepted|entire agreement|shall be entitled to assign/i);
  assert.ok(out.includes("the price only changes if you accept it in writing"), "prix du devis (liste grise 14, 15)");
  assert.ok(out.includes("including the balance of any advance payment"), "acompte restitué (CMA37 6.62)");
  assert.ok(out.includes("only with your agreement"), "cession avec accord (liste grise 19)");
  assert.ok(out.includes("The version in force on the day you accept a quote applies"), "pas de CGV modifiables en cours de contrat");
  assert.ok(!out.includes("Late Payment"), "pas d'intérêt commercial envers un particulier");
  assert.ok(out.includes("Expenses, such as travel, are charged only if the quote says so."), "frais supplémentaires annoncés (annexe 2 (g))");
  const R2 = { ...R, uk_consumer_cancellation: { ...R.uk_consumer_cancellation, period_days: 30, refund_days: 21 } };
  const other = plain(render({ ...OK, clients: "part" }, R2).html);
  assert.ok(other.includes("within 30 days without giving any reason") && other.includes("ends 30 days after the day") && other.includes("no later than 21 days"), "délais lus dans les règles");
});

test("rendu : TVA, statut, options et droit applicable", () => {
  const vat = plain(render({ ...OK, vat: "vat", p_vat: "GB123456789" }).html);
  assert.ok(vat.includes("Prices quoted to consumers include VAT.") && vat.includes("Prices quoted to business customers exclude VAT"));
  assert.ok(vat.includes("VAT registration number: GB123456789."));
  assert.ok(plain(render({ ...OK, clients: "part", vat: "vat", p_vat: "GB1" }).html).includes("include VAT") &&
    !plain(render({ ...OK, clients: "part", vat: "vat", p_vat: "GB1" }).html).includes("exclude VAT"));
  assert.ok(plain(render(OK).html).includes("We are not registered for VAT, so no VAT is charged."));
  const proVat = plain(render({ ...OK, clients: "pro", vat: "vat", p_vat: "GB1" }).html);
  assert.ok(proVat.includes("exclude VAT") && !proVat.includes("include VAT"), "entreprises seules : prix hors TVA seulement");
  const ltd = plain(render({ ...OK, status: "limited", p_company: "12345678", p_trading: "" }).html);
  assert.ok(ltd.includes("Jane Smith is a limited company registered in England and Wales under company number 12345678."));
  const opt = plain(render({ ...OK, ip: "license", portfolio: "off", conf: "off", subcontract: "on", deposit: "25", rates: "Day rate: £450", pricing: "daily", p_trading: "Smith Design", p_body: "Chartered Institute", p_insurance: "Insurer X, UK cover" }).html);
  assert.ok(opt.includes("non-exclusive, perpetual, worldwide licence to use them for the purposes described in the quote"));
  assert.ok(!opt.includes("portfolio") && !opt.includes("Confidentiality"));
  assert.ok(opt.includes("We may use subcontractors") && opt.includes("advance payment of 25% of the price"));
  assert.ok(opt.includes("Our current rates: Day rate: £450.") && opt.includes("based on a day rate"));
  assert.ok(opt.includes("provided by Jane Smith trading as Smith Design"));
  assert.ok(opt.includes("Professional body and title: Chartered Institute.") && opt.includes("Professional liability insurance: Insurer X, UK cover."));
  const sc = plain(render({ ...OK, clients: "pro", law: "sc" }).html);
  assert.ok(sc.includes("governed by the law of Scotland. The courts of Scotland have exclusive jurisdiction."));
  const custom = plain(render({ ...OK, penalty: "custom", penalty_rate: "15" }).html);
  assert.ok(custom.includes("we may claim interest at 15% a year on the overdue amount") && !custom.includes("fixed compensation"));
  const portfolio = (c) => (plain(render({ ...OK, clients: c }).html).match(/portfolio/g) || []).length;
  assert.deepEqual([portfolio("pro"), portfolio("part"), portfolio("both")], [1, 1, 2]);
});
