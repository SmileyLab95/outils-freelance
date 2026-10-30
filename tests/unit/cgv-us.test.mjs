// Tests du générateur de terms and conditions américain (documentation/46-cgv-etats-unis.md) : moteur
// engines/cgv-us.js (date limite d'annulation d'une vente hors établissement, formulaire officiel, repères, contrôles),
// puis la page rendue par engines/contract-doc.js pour chaque clientèle, comparée aux règles officielles
// (data/rules/us.json).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ruleValues, ruleEntries } from "./regles.mjs";

const require = createRequire(import.meta.url);
const C = require("../../src/assets/engines/cgv-us.js");
const K = require("../../src/assets/engines/contract-doc.js");
const R = ruleValues("us");
const TODAY = "2026-10-30";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmt = {
  pct: (rate) => { const n = Math.round(rate * 10000) / 100; return (Number.isInteger(n) ? String(n) : n.toFixed(2)) + "%"; },
  num: (n) => String(n),
  money: (n) => "$" + n,
  date: (iso) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8))}, ${iso.slice(0, 4)}`,
};
const codes = (p) => p.checks.map((c) => c.code);
const prep = (raw, rules = R) => C.prepare(raw, rules, TODAY, fmt);

// Saisie complète et valide (entreprises et particuliers, pas de vente hors établissement).
const OK = {
  clients: "both", offsite: "off", tx_date: "", p_name: "Jane Smith", p_trading: "", status: "sole", org_state: "",
  p_address: "123 Main Street, Springfield, IL 62701", p_email: "hello@example.com", p_phone: "(555) 123-4567",
  p_privacy: "", p_insurance: "", activity: "", pricing: "quote", rates: "", validity: "30", deposit: "", terms: "30",
  pay_ach: "on", pay_card: "off", pay_check: "off", pay_link: "off", late: "off", late_rate: "", acceptance: "10",
  notice: "14", ip: "assign", portfolio: "on", conf: "on", liability: "on", subcontract: "off", law: "IL",
};

// ------------------------------------------------------------------------------------------------------------
// Règles et moteur

test("règles : nouvelles règles sourcées aux textes officiels (eCFR, govinfo, New York, Illinois), lues le 30/10/2026", () => {
  const E = ruleEntries("us");
  const NEW = ["us_ftc_cooling_off", "us_ftc_cancellation_notice", "freelance_written_contract_contents", "us_esign", "us_copyright_transfer_writing"];
  for (const key of [...NEW, "freelance_law_new_york_state", "freelance_law_nyc", "freelance_law_illinois"]) {
    assert.ok(E[key], key);
    assert.match(E[key].source, /^https:\/\/(www\.ecfr\.gov|www\.govinfo\.gov|legislation\.nysenate\.gov|dol\.ny\.gov|www\.nyc\.gov|labor\.illinois\.gov)\//, key);
    assert.equal(E[key].verified_on, "2026-10-30", key);
    assert.equal(E[key].confidence, "high", key);
    assert.match(E[key].note, /SHA-256 [0-9a-f]{8}…[0-9a-f]{4,}/, `${key} : empreinte de la page lue`);
  }
  const F = R.us_ftc_cooling_off;
  assert.deepEqual([F.home_min, F.other_min, F.cancel_business_days, F.refund_business_days], [25, 130, 3, 10], "16 CFR 429.0(a), 429.1(a) et (g)");
  assert.equal(F.business_day, "any calendar day except Sunday or any federal holiday", "429.0(f)");
  assert.equal(F.statement, "You, the buyer, may cancel this transaction at any time prior to midnight of the third business day after the date of this transaction. See the attached notice of cancellation form for an explanation of this right.");
  const N = R.us_ftc_cancellation_notice;
  assert.equal(N.form.length, 10);
  assert.deepEqual(N.goods_only, [4, 5]);
  for (const i of N.goods_only) assert.match(N.form[i], /goods/, "paragraphes propres aux biens");
  assert.equal(N.form.filter((l, i) => !N.goods_only.includes(i) && /goods/.test(l)).length, 0);
  assert.match(N.form[2], /THREE BUSINESS DAYS/);
  assert.match(N.form[3], /TEN BUSINESS DAYS/);
  assert.deepEqual([R.freelance_law_new_york_state.written_contract_threshold_usd, R.freelance_law_nyc.written_contract_threshold_usd,
    R.freelance_law_illinois.written_contract_threshold_usd], [800, 800, 500]);
  assert.equal(R.freelance_written_contract_contents.new_york_state.length, 4, "GBL 1412(2)(a) à (d)");
  assert.match(R.freelance_written_contract_contents.new_york_state[3], /internal processing deadlines/);
  for (const key of Object.values(R.freelance_written_contract_contents.laws)) assert.ok(R[key], key);
});

test("date limite d'annulation : 3e jour ouvré, samedi compté, dimanche et jours fériés fédéraux sautés", () => {
  assert.equal(C.cancelBy(R, "2026-10-28"), "2026-10-31", "mercredi → samedi (le samedi est un jour ouvré)");
  assert.equal(C.cancelBy(R, "2026-10-30"), "2026-11-03", "vendredi → mardi (dimanche sauté)");
  assert.equal(C.cancelBy(R, "2026-11-24"), "2026-11-28", "Thanksgiving sauté");
  assert.equal(C.cancelBy(R, "2026-11-09"), "2026-11-13", "Veterans Day (mercredi 11) sauté");
  assert.equal(C.cancelBy(R, "2026-12-31"), "2027-01-05", "1er janvier sauté, changement d'année");
  assert.equal(C.cancelBy(R, "2026-11-25"), "2026-11-30", "Thanksgiving le lendemain, dimanche ensuite");
});

test("date limite : jour férié observé un autre jour, sauté aussi à sa date légale ; années non couvertes", () => {
  // 4 juillet 2026 : un samedi, observé le vendredi 3 ; les deux jours sont sautés.
  assert.ok(R.public_holidays.federal["2026"].some((h) => h.date === "2026-07-03" && h.substitute));
  assert.equal(C.cancelBy(R, "2026-07-02"), "2026-07-08");
  assert.equal(C.cancelBy(R, "2026-07-01"), "2026-07-07");
  // Jour de l'an 2028 : un samedi, observé le vendredi 31 décembre 2027 (rangé avec 2027).
  assert.equal(C.cancelBy(R, "2027-12-30"), "2028-01-05");
  assert.equal(C.cancelBy(R, "2027-12-31"), "2028-01-05");
  // Jour férié observé le lundi (date légale un dimanche, déjà sauté).
  assert.equal(C.cancelBy(R, "2027-07-02"), "2027-07-07", "4 juillet 2027 (dimanche) observé le lundi 5");
  assert.equal(C.cancelBy(R, "2030-12-26"), "2030-12-30");
  assert.equal(C.cancelBy(R, "2030-12-30"), null, "2031 pas encore dans les règles");
  assert.equal(C.cancelBy(R, "2023-12-30"), null, "avant 2024");
  assert.equal(C.cancelBy(R, "2026-02-30"), null);
  assert.equal(C.cancelBy(R, ""), null);
  assert.equal(C.cancelBy({ ...R, public_holidays: undefined }, "2026-10-28"), null);
  assert.equal(C.cancelBy({ ...R, us_ftc_cooling_off: undefined }, "2026-10-28"), null);
  assert.equal(C.cancelBy({ ...R, us_ftc_cooling_off: { ...R.us_ftc_cooling_off, cancel_business_days: 5 } }, "2026-10-28"), "2026-11-03", "délai lu dans les règles");
});

test("formulaire d'annulation : texte officiel mot pour mot, sans les paragraphes des biens, coordonnées et dates", () => {
  const form = C.cancellationNotice(R), lines = R.us_ftc_cancellation_notice.form;
  assert.deepEqual(form[0], { field: "[[tx_date|{tx_date}]]" }, "date de la vente remplie ou ligne à remplir");
  assert.equal(form[1], "(Date)");
  assert.equal(form[2], lines[2]);
  assert.equal(form[3], lines[3]);
  assert.equal(form[4], lines[6].replace("[Name of seller]", "{p_name}").replace("[address of seller's place of business]", "{p_address}")
    .replace("[date]", "[[cancel_by|{cancel_by}]][[cancel_blank|________________]]"));
  assert.match(form[4], /, or send a telegram, to \{p_name\}, at \{p_address\} NOT LATER THAN MIDNIGHT OF \[\[cancel_by/);
  assert.deepEqual(form.slice(5), [lines[7], { field: "" }, "(Date)", { field: "" }, "(Buyer's signature)"], "lignes de l'acheteur");
  assert.ok(!JSON.stringify(form).includes("goods"), "rien sur les biens livrés");
  assert.ok(!JSON.stringify(form).includes("[Name of seller]") && !JSON.stringify(form).includes("[date]"));
  assert.deepEqual(C.cancellationNotice({}), []);
  assert.equal(C.cancellationNotice({ us_ftc_cancellation_notice: { ...R.us_ftc_cancellation_notice, goods_only: [] } }).length, 12);
});

test("repères : clientèle, vente hors établissement, retard, plafond, statut", () => {
  const f = (set) => prep({ ...OK, ...set }).flags;
  assert.deepEqual([f({}).has_pro, f({}).has_part, f({}).both, f({}).pro_only, f({}).part_only], ["on", "on", "on", "off", "off"]);
  assert.deepEqual([f({ clients: "pro" }).has_part, f({ clients: "pro" }).pro_only], ["off", "on"]);
  assert.deepEqual([f({ clients: "part" }).has_pro, f({ clients: "part" }).part_only], ["off", "on"]);
  assert.equal(f({ clients: "x" }).clients, "pro", "clientèle inconnue : entreprises");
  assert.equal(f({ offsite: "on" }).offsite_part, "on");
  assert.equal(f({ offsite: "on", clients: "pro" }).offsite_part, "off", "pas de droit d'annulation pour une entreprise");
  assert.equal(f({ offsite: "off" }).offsite_part, "off");
  assert.equal(f({ late: "on", late_rate: "1.5" }).late_on, "on");
  assert.equal(f({ late: "on", late_rate: "" }).late_on, "off", "taux illisible : pas de clause");
  assert.equal(f({ late: "off", late_rate: "1.5" }).late_on, "off");
  assert.equal(f({}).liability, "on");
  assert.equal(f({ clients: "part" }).liability, "off", "plafond : entreprises seulement");
  assert.equal(f({ liability: "off" }).liability, "off");
  assert.deepEqual([f({ deposit: "30" }).has_deposit, f({ deposit: "0" }).has_deposit, f({ deposit: "120" }).has_deposit], ["on", "off", "off"]);
  assert.deepEqual(["sole", "llc", "corp", "partnership", "x"].map((status) => f({ status }).status), ["sole", "llc", "corp", "partnership", "sole"]);
  assert.deepEqual([f({}).law, f({ law: "" }).law, f({ law: "ZZ" }).law], ["IL", "", ""]);
  assert.deepEqual([f({}).ip, f({ ip: "license" }).ip, f({ ip: "x" }).ip], ["assign", "license", "assign"]);
});

test("contrôles : coordonnées, droit applicable, délais, moyens de paiement", () => {
  assert.deepEqual(codes(prep(OK)), ["contract_items", "ip_signed", "liability_review"], "saisie complète : seulement les informations");
  const empty = prep({ ...OK, p_name: " ", p_address: "", p_email: "", law: "" });
  assert.deepEqual(codes(empty).slice(0, 4), ["name_missing", "address_missing", "email_missing", "law_missing"]);
  assert.deepEqual(empty.checks.slice(0, 4).map((c) => c.level), ["error", "error", "warn", "error"]);
  assert.ok(codes(prep({ ...OK, law: "ZZ" })).includes("law_missing"), "État inconnu : à choisir");
  assert.ok(!codes(prep({ ...OK, p_phone: "" })).length || !codes(prep({ ...OK, p_phone: "" })).some((c) => /phone/.test(c)), "téléphone facultatif");
  for (const terms of ["", "x", "-1", "10.5"]) assert.ok(codes(prep({ ...OK, terms })).includes("terms_invalid"), `délai ${terms}`);
  for (const terms of ["0", "30", "120"]) assert.ok(!codes(prep({ ...OK, terms })).includes("terms_invalid"), `délai ${terms}`);
  for (const deposit of ["x", "-5", "101"]) assert.ok(codes(prep({ ...OK, deposit })).includes("deposit_invalid"), `acompte ${deposit}`);
  for (const deposit of ["", "0", "30", "100"]) assert.ok(!codes(prep({ ...OK, deposit })).includes("deposit_invalid"), `acompte ${deposit}`);
  assert.ok(codes(prep({ ...OK, pay_ach: "off" })).includes("payment_none"));
  for (const pay of ["pay_card", "pay_check", "pay_link"]) assert.ok(!codes(prep({ ...OK, pay_ach: "off", [pay]: "on" })).includes("payment_none"), pay);
  assert.ok(codes(prep({ ...OK, acceptance: "0" })).includes("acceptance_invalid"));
  assert.ok(codes(prep({ ...OK, acceptance: "" })).includes("acceptance_invalid"));
  assert.ok(!codes(prep({ ...OK, acceptance: "", clients: "part" })).includes("acceptance_invalid"), "vérification des livrables : entreprises seulement");
  for (const notice of ["", "x", "-1"]) assert.ok(codes(prep({ ...OK, notice })).includes("notice_invalid"), `préavis ${notice}`);
  assert.ok(!codes(prep({ ...OK, notice: "0" })).includes("notice_invalid"));
  for (const validity of ["", "0", "x"]) assert.ok(codes(prep({ ...OK, validity })).includes("validity_invalid"), `validité ${validity}`);
  assert.ok(!codes(prep({ ...OK, validity: "1" })).includes("validity_invalid"));
});

test("contrôles : intérêts de retard, vente hors établissement, contrat écrit, cession, plafond", () => {
  for (const late_rate of ["", "x", "0", "-1"]) {
    const p = prep({ ...OK, late: "on", late_rate });
    assert.ok(codes(p).includes("late_invalid") && !codes(p).includes("late_state_law"), `taux ${late_rate}`);
  }
  assert.ok(codes(prep({ ...OK, late: "on", late_rate: "1.5" })).includes("late_state_law"), "taux à vérifier selon l'État");
  assert.ok(!codes(prep({ ...OK, late: "off", late_rate: "x" })).some((c) => /^late/.test(c)), "option décochée : rien");
  const off = prep({ ...OK, offsite: "on" });
  assert.ok(codes(off).includes("offsite_steps"));
  assert.deepEqual(off.checks.find((c) => c.code === "offsite_steps").params, { home: "$25", other: "$130" }, "seuils lus dans les règles");
  assert.deepEqual(prep({ ...OK, offsite: "on" }, { ...R, us_ftc_cooling_off: { ...R.us_ftc_cooling_off, home_min: 30, other_min: 150 } })
    .checks.find((c) => c.code === "offsite_steps").params, { home: "$30", other: "$150" });
  assert.ok(!codes(prep({ ...OK, offsite: "on", clients: "pro" })).includes("offsite_steps"));
  assert.ok(!codes(prep({ ...OK, offsite: "on" })).includes("tx_date_invalid"), "date facultative");
  assert.equal(prep({ ...OK, offsite: "on", tx_date: "2026-02-30" }).checks.find((c) => c.code === "tx_date_invalid").level, "error");
  assert.ok(codes(prep({ ...OK, offsite: "on", tx_date: "2030-12-30" })).includes("holidays_unknown"));
  assert.ok(!codes(prep({ ...OK, offsite: "on", tx_date: "2026-10-28" })).some((c) => /tx_date|holidays/.test(c)));
  assert.ok(!codes(prep({ ...OK, offsite: "off", tx_date: "x" })).includes("tx_date_invalid"), "champ masqué : ignoré");
  const items = prep(OK).checks.find((c) => c.code === "contract_items");
  assert.deepEqual(items.params, { ny: "$800", il: "$500" });
  assert.equal(items.level, "info");
  assert.deepEqual(prep(OK, { ...R, freelance_law_illinois: { ...R.freelance_law_illinois, written_contract_threshold_usd: 600 } })
    .checks.find((c) => c.code === "contract_items").params.il, "$600", "seuil lu dans les règles");
  assert.ok(!codes(prep({ ...OK, ip: "license" })).includes("ip_signed"), "cession seulement");
  assert.ok(!codes(prep({ ...OK, liability: "off" })).includes("liability_review"));
  assert.ok(!codes(prep({ ...OK, clients: "part" })).includes("liability_review"));
  for (const c of prep({ ...OK, offsite: "on", late: "on", late_rate: "1" }).checks) assert.ok(["error", "warn", "info"].includes(c.level));
});

test("textes calculés : statut, délai, moyens de paiement, intérêts, dates, chiffres lus dans les règles", () => {
  const t = (set, rules) => prep({ ...OK, ...set }, rules).text;
  assert.equal(t({}).status_text, "a sole proprietor");
  assert.equal(t({ status: "partnership" }).status_text, "a partnership");
  assert.equal(t({ status: "llc" }).status_text, "a limited liability company");
  assert.equal(t({ status: "llc", org_state: "DE" }).status_text, "a limited liability company organized in Delaware");
  assert.equal(t({ status: "corp", org_state: "DC" }).status_text, "a corporation incorporated in the District of Columbia");
  assert.equal(t({ status: "sole", org_state: "DE" }).status_text, "a sole proprietor", "État de constitution : sociétés seulement");
  assert.deepEqual([t({}).terms_text, t({ terms: "0" }).terms_text, t({ terms: "x" }).terms_text], ["within 30 days of the invoice date", "on receipt", ""]);
  assert.equal(t({ pay_card: "on", pay_check: "on", pay_link: "on" }).payment_methods, "bank transfer (ACH or wire), card, check or online payment link");
  assert.equal(t({ pay_ach: "off", pay_check: "on" }).payment_methods, "check");
  assert.equal(t({ late: "on", late_rate: "1.5" }).late_text, "interest at 1.50% per month on the overdue amount, or at the highest rate allowed by law if that is lower");
  assert.equal(t({ late: "on", late_rate: "2" }).late_text, "interest at 2% per month on the overdue amount, or at the highest rate allowed by law if that is lower");
  assert.equal(t({ late: "on", late_rate: "0" }).late_text, "");
  assert.deepEqual([t({}).law_name, t({ law: "DC" }).law_name, t({ law: "" }).law_name], ["Illinois", "the District of Columbia", ""]);
  assert.equal(Object.keys(C.STATES).length, 51, "50 États et le District de Columbia");
  assert.deepEqual([t({}).cancel_days, t({}).refund_days, t({}).home_min, t({}).other_min], ["3", "10", "$25", "$130"]);
  const R2 = { ...R, us_ftc_cooling_off: { ...R.us_ftc_cooling_off, cancel_business_days: 5, refund_business_days: 7, home_min: 30, other_min: 150, statement: "S" } };
  assert.deepEqual(["cancel_days", "refund_days", "home_min", "other_min", "statement"].map((k) => t({}, R2)[k]), ["5", "7", "$30", "$150", "S"], "chiffres et phrase lus dans les règles");
  assert.equal(t({}).statement, R.us_ftc_cooling_off.statement);
  const sale = t({ offsite: "on", tx_date: "2026-07-02" });
  assert.deepEqual([sale.tx_date, sale.cancel_by, sale.cancel_blank], ["July 2, 2026", "July 8, 2026", ""]);
  const none = t({ offsite: "on", tx_date: "" });
  assert.deepEqual([none.tx_date, none.cancel_by, none.cancel_blank], ["", "", "on"], "dates à remplir à la main");
  assert.deepEqual([t({ offsite: "on", tx_date: "2030-12-30" }).tx_date, t({ offsite: "on", tx_date: "2030-12-30" }).cancel_by], ["December 30, 2030", ""]);
  assert.equal(t({ offsite: "off", tx_date: "2026-07-02" }).cancel_by, "", "sans vente hors établissement : pas de date");
  assert.deepEqual([t({ deposit: "30" }).deposit, t({ acceptance: "7" }).acceptance, t({ notice: "0" }).notice, t({ validity: "45" }).validity], ["30", "7", "0", "45"]);
});

// ------------------------------------------------------------------------------------------------------------
// Page

const html = readFileSync(new URL("../../content/us/terms-and-conditions-generator.html", import.meta.url), "utf8");
const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
const D = JSON.parse(/id="cgv-data">([\s\S]*?)<\/script>/.exec(html)[1]);
const prose = html.slice(html.indexOf('<section class="section prose">'));
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
  Object.assign(text, p.text, { contacts: [raw.p_email, raw.p_phone].filter(Boolean).join(", "), today: "October 30, 2026", title: D.ui.title_prefix });
  const flags = Object.assign(K.flags(raw), p.flags);
  return { html: K.render(D, { raw: flags, text, blocks: p.blocks }), flags, checks: p.checks };
}
const plain = (h) => h.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("page : en-tête, scripts, sources, menu, liens de langue, messages de tous les contrôles", () => {
  assert.equal(front.id, "cgv", "même identifiant que les pages française et britannique (liens de langue)");
  assert.deepEqual(front.scripts, ["engines/contract-doc.js", "engines/jours.js", "engines/cgv-us.js", "tools/cgv.js"], "jours.js avant le moteur");
  assert.equal(front.rules, "us");
  assert.ok(front.title.length <= 60 && front.description.length <= 160, "titre et description");
  assert.ok(front.faq.length >= 3 && front.faq.length <= 6);
  for (const key of front.sources) assert.ok(key in R, `source ${key}`);
  for (const key of ["us_ftc_cooling_off", "us_ftc_cancellation_notice", "freelance_written_contract_contents", "us_esign", "us_copyright_transfer_writing"]) {
    assert.ok(front.sources.includes(key), `source affichée : ${key}`);
  }
  assert.deepEqual([D.country, D.lang, D.store], ["us", "en-US", "cgv-us"], "moteur, langue et enregistrement propres aux États-Unis");
  const nav = JSON.parse(readFileSync(new URL("../../content/us/site.json", import.meta.url), "utf8")).nav.find((g) => g.key === "sell").items;
  assert.equal(nav[nav.indexOf("cgv") - 1], "nda", "menu « Selling », après l'accord de confidentialité");
  const engine = readFileSync(new URL("../../src/assets/engines/cgv-us.js", import.meta.url), "utf8");
  const all = [...engine.matchAll(/check\("(\w+)"/g)].map((m) => m[1]);
  assert.equal(all.length, 18);
  for (const code of all) assert.ok(D.ui.checks[code], `message du contrôle ${code}`);
  for (const code of Object.keys(D.ui.checks)) assert.ok(all.includes(code), `message sans contrôle : ${code}`);
  assert.match(D.ui.checks.offsite_steps, /\{home\}.*\{other\}/);
  assert.match(D.ui.checks.contract_items, /\{ny\}.*\{il\}/);
  const f = fields();
  assert.equal(f.law.value, "", "droit applicable à choisir");
  for (const name of ["law", "org_state"]) {
    const opts = f[name].options.filter((o) => o.value);
    assert.equal(opts.length, 51, name);
    for (const o of opts) assert.equal(C.STATES[o.value].replace(/^the /, ""), o.text, `${name} : ${o.value}`);
  }
  assert.equal(f.tx_date.type, "date");
  assert.equal(D.annexes[0].title, R.us_ftc_cancellation_notice.title, "titre officiel du formulaire");
  assert.equal(D.annexes[0].bold, true, "formulaire en gras (429.1(b))");
});

test("page : chiffres de la FAQ et des explications = règles", () => {
  const faq = JSON.stringify(front.faq), F = R.us_ftc_cooling_off;
  const ny = R.freelance_law_new_york_state.written_contract_threshold_usd, il = R.freelance_law_illinois.written_contract_threshold_usd;
  assert.equal(R.freelance_law_nyc.written_contract_threshold_usd, ny, "même seuil à New York (État et ville)");
  for (const text of [faq, prose]) {
    assert.ok(text.includes(`$${ny}`) && text.includes(`$${il}`), "seuils du contrat écrit");
    assert.ok(text.includes(`$${F.home_min}`) && text.includes(`$${F.other_min}`), "seuils de la vente hors établissement");
    assert.ok(text.includes("third business day") && F.cancel_business_days === 3);
    assert.ok(text.includes(`${F.refund_business_days} business days`), "remboursement");
  }
  assert.ok(faq.includes("120 days") && R.freelance_law_new_york_state.value === undefined);
  for (const key of ["freelance_law_new_york_state", "freelance_law_nyc", "freelance_law_illinois"]) assert.match(R[key].aggregation, /120 days/, key);
  assert.ok(prose.includes(`within ${R.freelance_default_payment.days_after_completion} days after you finish`));
  assert.ok(prose.includes("bold type of at least 10 points") && /minimum size of 10 points/.test(F.statement_format));
  assert.ok(faq.includes("17 U.S.C. 204(a)") && /204\(a\)/.test(R.us_copyright_transfer_writing));
  for (const key of ["late_fees_federal_rule", "freelance_written_contract_contents", "us_esign"]) assert.ok(front.sources.includes(key), key);
});

test("page : chaque champ des textes existe (formulaire ou valeur calculée)", () => {
  const f = fields(), computed = Object.keys(C.prepare(OK, R, TODAY, fmt).text).concat(["contacts", "today", "title"]);
  const doc = JSON.stringify({ ...D, ui: null }) + JSON.stringify(C.cancellationNotice(R));
  const keys = new Set([...doc.matchAll(/\{(\w+)\}|\[\[(\w+)\|/g)].map((m) => m[1] || m[2]));
  keys.delete("n"); keys.delete("title");
  for (const key of keys) assert.ok(key in f || computed.includes(key), `champ {${key}}`);
  for (const key of Object.keys(OK)) assert.ok(key in f, `champ du formulaire ${key}`);
  for (const key of Object.keys(f)) assert.ok(key in OK, `champ du formulaire dans la saisie de test : ${key}`);
  const conds = new Set([...doc.matchAll(/"when":\{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/"(\w+)":/g)].map((x) => x[1])));
  const flags = render().flags;
  for (const c of conds) assert.ok(c in flags, `condition ${c}`);
  const shown = new Set([...html.matchAll(/data-when="(\w+)"/g)].map((m) => m[1]));
  const tool = readFileSync(new URL("../../src/assets/tools/cgv.js", import.meta.url), "utf8");
  for (const w of shown) assert.match(tool, new RegExp(`\\b${w}: function`), `affichage conditionnel ${w}`);
});

const CLIENTS = ["pro", "part", "both"];
for (const clients of CLIENTS) {
  for (const offsite of ["off", "on"]) {
    test(`rendu : clients ${clients}, vente hors établissement ${offsite}`, () => {
      const r = render({ ...OK, clients, offsite, tx_date: "2026-07-02", late: "on", late_rate: "1.5", deposit: "30" });
      const out = plain(r.html);
      assert.doesNotMatch(r.html, /\{\w+\}|\[\[|undefined|k-blank/, "aucune clé brute ni case vide avec une saisie complète");
      const nums = [...r.html.matchAll(/<h3>(\d+)\. /g)].map((m) => Number(m[1]));
      assert.deepEqual(nums, nums.map((_, i) => i + 1), "articles numérotés sans trou");
      const pro = clients !== "part", part = clients !== "pro", cancel = part && offsite === "on";
      assert.equal(r.html.includes("Annex – NOTICE OF CANCELLATION"), cancel, "formulaire si et seulement si la règle s'applique");
      assert.equal(r.html.includes('<section class="k-annex k-bold">'), cancel, "formulaire en gras");
      assert.equal(out.includes("Cancelling a sale made away from our place of business"), cancel);
      assert.equal(r.html.includes(`<p class="k-bold">${R.us_ftc_cooling_off.statement}</p>`), cancel, "phrase officielle, en gras");
      assert.equal(out.includes("Business clients:"), pro);
      assert.equal(out.includes("is limited to the price paid or payable"), pro, "plafond : entreprises seulement");
      assert.equal(out.includes("we make no other warranties"), pro, "exclusion des garanties : entreprises seulement");
      assert.equal(out.includes("treated as accepted"), pro, "réception tacite : entreprises seulement");
      assert.equal(out.includes("entire agreement"), pro);
      assert.equal(out.includes("we may suspend the services"), pro);
      assert.equal((out.match(/have exclusive jurisdiction/g) || []).length, pro ? 1 : 0, "juridiction exclusive : une fois, jamais envers un particulier");
      assert.equal(out.includes("bring a claim in the courts of the state where you live"), part);
      assert.equal(out.includes("consumer protection laws of the state where you live"), part);
      assert.equal(out.includes("these Terms do not limit our liability to you or exclude any warranty the law gives you"), part);
      assert.equal(out.includes("only with your consent"), part, "portfolio d'un particulier : avec son accord");
      for (const s of ["Freelance protection laws", "will not require us, as a condition of timely payment, to accept less than the agreed price",
        "If you need our invoice by a particular date to meet your internal payment processing deadlines", "governed by the laws of Illinois",
        "small claims court", "interest at 1.50% per month", "advance payment of 30% of the price", "an electronic signature is valid"]) {
        assert.ok(out.includes(s), s);
      }
      if (cancel) {
        const N = R.us_ftc_cancellation_notice;
        for (const i of [2, 3, 7]) assert.ok(out.includes(N.form[i]), `formulaire mot pour mot : ${N.form[i].slice(0, 30)}`);
        for (const i of N.goods_only) assert.ok(!out.includes(N.form[i].slice(0, 60)), "pas de paragraphe sur les biens");
        assert.ok(out.includes("July 2, 2026 (Date)"), "date de la vente");
        assert.ok(out.includes("or send a telegram, to Jane Smith, at 123 Main Street, Springfield, IL 62701 NOT LATER THAN MIDNIGHT OF July 8, 2026."));
        assert.ok(out.includes("$25 or more") && out.includes("$130 or more"));
        assert.ok(out.includes("within 10 business days after we receive your notice"));
        assert.ok(out.includes("We will not start the services until the cancellation period has ended"));
        assert.ok(out.includes("two completed copies of the notice of cancellation, in the language we used to present our services"));
        assert.ok(out.includes("or send it by email to hello@example.com"));
        assert.ok(out.includes("Business days are all days except Sundays and federal holidays"));
      }
    });
  }
}

test("rendu : rien de réservé aux entreprises envers un particulier ; formulaire à remplir sans date", () => {
  const out = plain(render({ ...OK, clients: "part", offsite: "on", deposit: "50" }).html);
  assert.doesNotMatch(out, /non-refundable|at our sole discretion|without notice|exclusive jurisdiction|treated as accepted|entire agreement|no other warranties|is limited to the price|indirect or consequential/i);
  assert.ok(out.includes("we refund any amount you have paid above that"), "acompte restitué hors travail fait et frais");
  assert.ok(out.includes("The version in force on the day you accept a quote applies"));
  const blank = render({ ...OK, clients: "part", offsite: "on", tx_date: "" }).html;
  assert.ok(blank.includes('<p class="k-field"></p><p>(Date)</p><p>You may CANCEL'), "date de la vente : ligne à remplir");
  assert.ok(blank.includes("NOT LATER THAN MIDNIGHT OF ________________."), "date limite : à remplir");
  assert.ok(!blank.includes("k-blank"), "pas de repère gris dans le formulaire");
  const R2 = { ...R, us_ftc_cooling_off: { ...R.us_ftc_cooling_off, refund_business_days: 7, home_min: 30 } };
  const other = plain(render({ ...OK, clients: "part", offsite: "on" }, R2).html);
  assert.ok(other.includes("within 7 business days") && other.includes("$30 or more"), "chiffres lus dans les règles");
});

test("rendu : statut, prix, options, droit applicable", () => {
  const llc = plain(render({ ...OK, status: "llc", org_state: "DE", p_trading: "Smith Design", activity: "Web design" }).html);
  assert.ok(llc.includes("provided by Jane Smith doing business as Smith Design (“we”, “us”, “our”) to our clients (“you”, “your”): Web design."));
  assert.ok(llc.includes("We are a limited liability company organized in Delaware. Our mailing address is 123 Main Street, Springfield, IL 62701."));
  assert.ok(llc.includes("You can contact us at hello@example.com, (555) 123-4567."));
  const opt = plain(render({ ...OK, ip: "license", portfolio: "off", conf: "off", subcontract: "on", pricing: "hourly", rates: "$95 an hour",
    p_insurance: "Insurer X, policy 123", p_privacy: "https://www.example.com/privacy", pay_check: "on", terms: "0" }).html);
  assert.ok(opt.includes("We keep the copyright and other intellectual property rights in the deliverables"));
  assert.ok(!opt.includes("we assign to you") && !opt.includes("portfolio") && !opt.includes("Confidentiality"));
  assert.ok(opt.includes("We may use subcontractors") && opt.includes("We charge an hourly rate: $95 an hour."));
  assert.ok(opt.includes("Professional liability insurance: Insurer X, policy 123.") && opt.includes("Our privacy policy explains how we handle it: https://www.example.com/privacy."));
  assert.ok(opt.includes("Invoices are payable on receipt, by bank transfer (ACH or wire) or check."));
  assert.ok(!opt.includes("we may charge interest"), "sans intérêts de retard");
  assert.ok(!plain(render({ ...OK, late: "on", late_rate: "" }).html).includes("we may charge"), "taux illisible : pas de clause");
  const daily = plain(render({ ...OK, pricing: "daily" }).html);
  assert.ok(daily.includes("We charge a day rate. Each quote gives an estimate of the number of days"));
  const quote = plain(render({ ...OK, rates: "$90 an hour" }).html);
  assert.ok(quote.includes("as a fixed price or based on the time spent. Our current rates: $90 an hour."));
  const dc = plain(render({ ...OK, clients: "pro", law: "DC" }).html);
  assert.ok(dc.includes("governed by the laws of the District of Columbia.") && dc.includes("courts located in the District of Columbia have exclusive jurisdiction."));
  assert.ok(plain(render({ ...OK, law: "" }).html).includes("governed by the laws of your state"), "État non choisi : repère");
  const noliab = plain(render({ ...OK, clients: "pro", liability: "off" }).html);
  assert.ok(!noliab.includes("is limited to the price") && noliab.includes("we make no other warranties"));
});
