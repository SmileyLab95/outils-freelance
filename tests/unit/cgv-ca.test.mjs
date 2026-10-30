// Tests du générateur de conditions générales canadien (documentation/47-cgv-canada.md) : moteur engines/cgv-ca.js
// (taux annuel, provinces des particuliers, repères, textes anglais et français, contrôles), valeurs lues dans les
// règles officielles (data/rules/ca.json).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const C = require("../../src/assets/engines/cgv-ca.js");
const R = ruleValues("ca");
const TODAY = "2026-10-30";
const fmt = {
  pct: (rate) => { const n = Math.round(rate * 10000) / 100; return (Number.isInteger(n) ? String(n) : n.toFixed(2)) + "%"; },
  num: (n) => String(n),
  money: (n) => "$" + n,
  date: (iso) => iso,
};
const codes = (p) => p.checks.map((c) => c.code);
const prep = (raw, lang = "en-CA", rules = R) => C.prepare(raw, rules, TODAY, fmt, lang);

// Saisie complète et valide : entreprises seulement, Ontario.
const OK = {
  clients: "pro", p_name: "Alex Tremblay", status: "sole", incorp: "", province: "ON",
  p_address: "100 King Street West, Toronto, ON M5X 1A9", p_email: "hello@example.com", p_phone: "416-555-0100",
  activity: "Web design", pricing: "quote", validity: "30", deposit: "", terms: "30",
  pay_transfer: "on", pay_card: "off", pay_cheque: "off", pay_link: "off", late: "off", late_rate: "",
  acceptance: "7", notice: "14", ip: "assign", liability: "off", at_home: "off",
  cons_on: "off", cons_qc: "off", cons_bc: "off", cons_ab: "off", cons_other: "off",
};

test("taux annuel : 12 fois le taux mensuel, au centième ; vide, nul ou illisible → null", () => {
  assert.equal(C.annualRate(1.5), 18);
  assert.equal(C.annualRate("2"), 24);
  assert.equal(C.annualRate("1,25"), 15, "virgule décimale");
  assert.equal(C.annualRate(0.333), 4, "arrondi au centième");
  assert.equal(C.annualRate(0.1234), 1.48);
  for (const bad of ["", "abc", "0", "-1", null]) assert.equal(C.annualRate(bad), null, String(bad));
});

test("saisie valide (entreprises, Ontario) : seule la cession signée est signalée", () => {
  const p = prep(OK);
  assert.deepEqual(codes(p), ["ip_signed"]);
  assert.equal(p.flags.has_pro, "on");
  assert.equal(p.flags.has_part, "off");
  assert.equal(p.flags.pro_only, "on");
  assert.equal(p.flags.qc_law, "off");
  assert.equal(p.text.province_name, "Ontario");
  assert.equal(p.text.terms_text, "within 30 days of the invoice date");
  assert.equal(p.text.payment_methods, "bank transfer or Interac e-Transfer");
  assert.equal(p.text.status_text, "a sole proprietor");
});

test("chiffres lus dans les règles : 10 %, 15, 30, 7 et 15 jours, 50 $", () => {
  const p = prep({ ...OK, clients: "both" });
  assert.equal(p.text.estimate_pct, fmt.pct(R.ca_on_estimate_tolerance));
  assert.equal(p.text.estimate_pct, "10%");
  assert.equal(p.text.copy_days, String(R.ca_consumer_copy_days.days));
  assert.equal(p.text.start_days, String(R.ca_consumer_start_delay_days.days));
  assert.equal(p.text.info_cancel_days, String(R.ca_consumer_info_cancel_days.days));
  assert.equal(p.text.refund_days, String(R.ca_consumer_refund_days.days));
  assert.deepEqual([p.text.copy_days, p.text.start_days, p.text.info_cancel_days, p.text.refund_days], ["15", "30", "7", "15"]);
  const items = p.checks.find((c) => c.code === "consumer_quote_items");
  assert.deepEqual(items.params, { amount: "$50", days: "15" });
  assert.equal(items.level, "info");
});

test("contrôles d'identité, de province, de délais et de paiement", () => {
  const p = prep({ ...OK, p_name: " ", p_address: "", p_email: "", province: "ZZ", terms: "2.5", deposit: "120",
    pay_transfer: "off", acceptance: "0", notice: "-1", validity: "" });
  for (const c of ["name_missing", "address_missing", "email_missing", "province_missing", "terms_invalid", "deposit_invalid",
    "payment_none", "acceptance_invalid", "notice_invalid", "validity_invalid"]) assert.ok(codes(p).includes(c), c);
  const lvl = Object.fromEntries(p.checks.map((c) => [c.code, c.level]));
  assert.equal(lvl.name_missing, "error");
  assert.equal(lvl.email_missing, "warn");
  assert.equal(lvl.province_missing, "error");
  assert.equal(p.text.province_name, "");
  assert.equal(p.text.deposit, "");
  assert.equal(prep({ ...OK, terms: "0" }).text.terms_text, "on receipt");
  assert.ok(!codes(prep({ ...OK, clients: "part", acceptance: "" })).includes("acceptance_invalid"), "vérification des livrables : entreprises seulement");
  assert.ok(!codes(prep({ ...OK, notice: "0" })).includes("notice_invalid"), "préavis de 0 jour accepté");
});

test("intérêts de retard : taux mensuel et annuel écrits, illisibles, au-delà du taux criminel", () => {
  const p = prep({ ...OK, late: "on", late_rate: "1.5" });
  assert.equal(p.flags.late_on, "on");
  assert.equal(p.text.late_text, "interest at 1.50% per month (18% per year) on the overdue amount, from the due date until paid");
  assert.equal(prep({ ...OK, late: "on", late_rate: "1.5" }, "fr-CA").text.late_text,
    "des intérêts de 1.50% par mois (18% par an) sur la somme impayée, de la date d'échéance jusqu'au paiement");
  const bad = prep({ ...OK, late: "on", late_rate: "x" });
  assert.ok(codes(bad).includes("late_invalid"));
  assert.equal(bad.flags.late_on, "off");
  assert.equal(bad.text.late_text, "");
  const crim = prep({ ...OK, late: "on", late_rate: "3" });   // 36 % par an > 35 %
  assert.ok(codes(crim).includes("late_criminal"));
  assert.deepEqual(crim.checks.find((c) => c.code === "late_criminal").params, { max: "35%" });
  assert.equal(crim.flags.late_on, "off");
  assert.ok(!codes(prep({ ...OK, late: "on", late_rate: "2.9" })).includes("late_criminal"), "34,8 % : sous le taux criminel");
  assert.ok(!codes(prep({ ...OK, late: "on", late_rate: "2.9167" })).includes("late_criminal"), "35 % pile : n'excède pas le taux criminel");
  assert.ok(!codes(prep({ ...OK, late: "off", late_rate: "x" })).includes("late_invalid"), "taux ignoré sans intérêts");
  assert.equal(R.criminal_interest_rate, 0.35);
});

test("provinces des particuliers : cochées, sinon celle du travailleur autonome ; autres provinces signalées", () => {
  assert.deepEqual(C.consumerProvinces({ cons_qc: "on", cons_bc: "on" }, "ON"), { list: ["QC", "BC"], other: false });
  assert.deepEqual(C.consumerProvinces({}, "AB"), { list: ["AB"], other: false });
  assert.deepEqual(C.consumerProvinces({}, "MB"), { list: [], other: true });
  assert.deepEqual(C.consumerProvinces({ cons_other: "on" }, "QC"), { list: [], other: true });
  assert.deepEqual(C.consumerProvinces({}, ""), { list: [], other: false });
  assert.ok(codes(prep({ ...OK, clients: "part", province: "NS" })).includes("other_provinces"));
  assert.ok(!codes(prep({ ...OK, clients: "part", province: "ON" })).includes("other_provinces"));
  assert.ok(!codes(prep({ ...OK, clients: "pro", province: "NS" })).includes("other_provinces"), "entreprises seulement : pas de mention");
  assert.equal(prep({ ...OK, clients: "part", province: "QC" }).flags.qc_cons, "on");
  assert.equal(prep({ ...OK, clients: "pro", province: "QC" }).flags.qc_cons, "off");
});

test("particuliers : téléphone, contrat conclu chez eux hors champ, contenu du devis", () => {
  const p = prep({ ...OK, clients: "both", p_phone: "", at_home: "on" });
  assert.ok(codes(p).includes("phone_missing"));
  assert.ok(codes(p).includes("at_home_out_of_scope"));
  assert.equal(p.checks.find((c) => c.code === "at_home_out_of_scope").level, "warn");
  assert.ok(codes(p).includes("consumer_quote_items"));
  const pro = prep({ ...OK, p_phone: "", at_home: "on" });
  for (const c of ["phone_missing", "at_home_out_of_scope", "consumer_quote_items"]) assert.ok(!codes(pro).includes(c), c);
});

test("Québec : acompte d'un particulier par carte de crédit, français d'abord, droit applicable", () => {
  const raw = { ...OK, clients: "both", province: "QC", deposit: "30" };
  assert.ok(codes(prep(raw)).includes("qc_deposit_card"));
  assert.ok(!codes(prep({ ...raw, pay_card: "on" })).includes("qc_deposit_card"));
  assert.ok(!codes(prep({ ...raw, deposit: "" })).includes("qc_deposit_card"));
  assert.ok(!codes(prep({ ...raw, clients: "pro" })).includes("qc_deposit_card"), "entre entreprises : pas de règle");
  assert.ok(codes(prep(raw)).includes("french_first"));
  assert.ok(!codes(prep(raw, "fr-CA")).includes("french_first"), "page française : pas d'avertissement");
  assert.ok(codes(prep({ ...OK, clients: "part", cons_qc: "on" })).includes("french_first"), "client particulier au Québec");
  assert.ok(!codes(prep(OK)).includes("french_first"));
  assert.equal(prep(raw).flags.qc_law, "on");
  assert.equal(prep(raw).flags.has_deposit, "on");
});

test("textes en français : structure, province, délai, moyens de paiement", () => {
  const p = prep({ ...OK, status: "corp", incorp: "QC", province: "QC", pay_card: "on", pay_cheque: "on" }, "fr-CA");
  assert.equal(p.text.status_text, "une société par actions constituée sous le régime des lois du Québec");
  assert.equal(p.text.province_name, "le Québec");
  assert.equal(p.text.province_of, "du Québec");
  assert.equal(p.text.terms_text, "dans les 30 jours suivant la date de la facture");
  assert.equal(p.text.payment_methods, "virement bancaire ou virement Interac, carte de crédit ou chèque");
  assert.equal(prep({ ...OK, status: "corp", incorp: "CA" }, "fr-CA").text.status_text,
    "une société par actions constituée sous le régime de la Loi canadienne sur les sociétés par actions");
  assert.equal(prep({ ...OK, status: "corp", incorp: "CA" }).text.status_text, "a corporation incorporated under federal law");
  assert.equal(prep({ ...OK, status: "corp", incorp: "BC" }).text.status_text, "a corporation incorporated in British Columbia");
  assert.equal(prep({ ...OK, status: "corp", incorp: "" }).text.status_text, "a corporation");
  assert.equal(prep({ ...OK, status: "corp", incorp: "" }, "fr-CA").text.status_text, "une société par actions");
  assert.equal(prep({ ...OK, terms: "0" }, "fr-CA").text.terms_text, "à réception");
});

test("cession, plafond entre entreprises seulement, licence", () => {
  assert.ok(!codes(prep({ ...OK, ip: "license" })).includes("ip_signed"));
  assert.equal(prep({ ...OK, ip: "license" }).flags.ip, "license");
  const lia = prep({ ...OK, liability: "on" });
  assert.ok(codes(lia).includes("liability_review"));
  assert.equal(lia.flags.liability, "on");
  const part = prep({ ...OK, clients: "part", liability: "on" });
  assert.equal(part.flags.liability, "off", "pas de plafond envers des particuliers seulement");
  assert.ok(!codes(part).includes("liability_review"));
});

test("treize provinces et territoires, noms anglais et français", () => {
  assert.equal(Object.keys(C.PROVINCES).length, 13);
  for (const [code, p] of Object.entries(C.PROVINCES)) {
    assert.ok(p.en && p.fr && p.fr_of, code);
    assert.equal(prep({ ...OK, province: code }).text.province_name, p.en);
    assert.equal(prep({ ...OK, province: code }, "fr-CA").text.province_name, p.fr);
  }
});
