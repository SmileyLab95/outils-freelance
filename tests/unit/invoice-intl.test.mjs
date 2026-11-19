// Moteur de facture hors de France (engines/invoice-intl.js) : totaux et aperçu, partagés par le générateur public
// (États-Unis, Royaume-Uni, Canada) et l'Espace de ces pays (documentation/60, § 3.1, lot 2d).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const IV = require("../../src/assets/engines/invoice-intl.js");

const LABELS = {
  tax: "Tax", invoice: "Invoice", estimate: "Estimate", number: "No.", from: "From", bill_to: "Bill to", prepared_for: "Prepared for",
  your_name: "Your name", your_details: "Your details", client_name: "Client name", client_details: "Client details",
  invoice_date: "Invoice date", estimate_date: "Estimate date", terms: "Terms", days: "days", due: "Due date", po: "PO",
  valid: "Valid until", item: "Item", qty: "Qty", rate: "Rate", amount: "Amount", empty_lines: "Add a line", subtotal: "Subtotal",
  discount: "Discount", percent: "%", total: "Total", paid: "Paid", balance: "Balance due", deposit: "Deposit", payment: "Payment",
  late_prefix: "Late fee:", estimate_terms: "Valid until {date}.", accept_title: "Acceptance", accept: "Signed for acceptance",
  tax_id: "EIN", client_tax_id: "Tax ID",
};
const P = { labels: LABELS, terms: [{ value: 30, label: "Net 30" }], mentions: ["Thank you."] };
const fmt = { money: (n) => "$" + n.toFixed(2), num: (n) => String(n), rate: (n) => String(n), date: (iso) => iso };
const round = (n) => Math.round(n * 100) / 100;

test("totaux : lignes, remise arrondie au centime, taxe saisie, payé", () => {
  const t = IV.compute({ type: "invoice", lines: [{ desc: "Design", qty: 12.5, price: 85 }, { desc: "Hosting", qty: 1, price: 19.99 }],
                         discountPct: 10, tax: { rate: 8.25, label: "Sales tax" }, paid: 200 }, P);
  assert.equal(round(t.subtotal), 1082.49);
  assert.equal(t.discount, 108.25, "10 % de 1 082,49 = 108,249 → 108,25");
  assert.deepEqual(t.taxes, [{ label: "Sales tax", rate: 8.25, amount: 80.37 }], "8,25 % de 974,24 = 80,3748 → 80,37");
  assert.equal(round(t.total), 1054.61);
  assert.equal(t.paid, 200);
  assert.equal(t.ttc, t.total, "ttc : total du document, comme le moteur français");
  assert.equal(t.noVat, false);
});

test("totaux : lignes incomplètes ignorées, remise bornée, pas de taxe sans taux, payé ignoré sur un devis", () => {
  const t = IV.compute({ type: "estimate", lines: [{ desc: "A", qty: NaN, price: 10 }, { desc: "B", qty: 2, price: NaN }, { desc: "C", qty: 2, price: 50 }],
                         discountPct: 150, tax: { rate: NaN, label: "" }, paid: 50 }, P);
  assert.equal(t.subtotal, 100);
  assert.equal(t.discountPct, 100);
  assert.equal(t.discount, 100);
  assert.deepEqual(t.taxes, []);
  assert.equal(t.noVat, true);
  assert.equal(t.paid, 0, "un devis n'a pas de montant payé");
});

test("totaux : taux de 0 % affiché seulement si le profil le demande ; libellé par défaut", () => {
  const doc = { type: "invoice", lines: [{ desc: "A", qty: 1, price: 100 }], tax: { rate: 0, label: "" } };
  assert.deepEqual(IV.compute(doc, P).taxes, []);
  assert.deepEqual(IV.compute(doc, Object.assign({ show_zero_tax: true }, P)).taxes, [{ label: "Tax", rate: 0, amount: 0 }]);
});

test("totaux : option de taxes à plusieurs composantes (TPS + TVQ)", () => {
  const options = [{ key: "QC", label: "Québec", components: [{ label: "GST", rate: 5 }, { label: "QST", rate: 9.975 }] }];
  const t = IV.compute({ type: "invoice", lines: [{ desc: "A", qty: 1, price: 1000 }], tax: { option: "QC" } }, Object.assign({ tax_options: options }, P));
  assert.deepEqual(t.taxes.map((x) => x.amount), [50, 99.75]);
  assert.equal(t.total, 1149.75);
  assert.deepEqual(IV.compute({ type: "invoice", lines: [], tax: { option: "none" } }, Object.assign({ tax_options: options }, P)).taxes, []);
});

test("aperçu : échéance, textes échappés, solde dû, mentions", () => {
  const html = IV.render({ type: "invoice", number: "2026-014", date: "2026-03-31", terms: "30", lines: [{ desc: "Design", qty: 2, price: 100 }],
                           tax: { rate: NaN }, paid: 50, me: { name: "Alex", taxId: "12-3456789" }, client: { name: "Acme <Corp> & Co" },
                           payment: "ACH\n123", notes: "" }, P, fmt);
  assert.match(html, /<span>Due date<\/span><b>2026-04-30<\/b>/);
  assert.match(html, /<span>Terms<\/span><b>Net 30<\/b>/);
  assert.match(html, /Acme &lt;Corp&gt; &amp; Co/);
  assert.match(html, /EIN 12-3456789/);
  assert.match(html, /<span>Balance due<\/span><b>\$150\.00<\/b>/);
  assert.match(html, /<b>Payment<\/b><br>ACH<br>123/);
  assert.match(html, /<p>Thank you\.<\/p>/);
  assert.doesNotMatch(html, /p-sign/, "pas de bloc d'acceptation sur une facture");
});

test("aperçu : devis avec validité, acompte et bloc d'acceptation ; lignes vides signalées", () => {
  const html = IV.render({ type: "estimate", number: "E-1", date: "2026-12-30", validity: "45", depositPct: 30,
                           lines: [{ desc: "Audit", qty: 1, price: 1000 }], tax: {} }, P, fmt);
  assert.match(html, /<span>Valid until<\/span><b>2027-02-13<\/b>/);
  assert.match(html, /Deposit \(30%\)<\/span><b>\$300\.00/);
  assert.match(html, /p-sign/);
  assert.match(html, /Valid until 2027-02-13\./);
  const empty = IV.render({ type: "invoice", date: "2026-01-01", lines: [{ desc: "", qty: 1, price: NaN }], tax: {} }, P, fmt);
  assert.match(empty, /Add a line/);
  assert.match(empty, /<span class="p-empty">Your name<\/span>/);
});

test("dates : ajout de jours sur les changements d'heure et les fins de mois", () => {
  assert.equal(IV.addDays("2026-03-07", 2), "2026-03-09");
  assert.equal(IV.addDays("2026-01-31", 30), "2026-03-02");
  assert.equal(IV.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(IV.addDays("", 3), "");
});
