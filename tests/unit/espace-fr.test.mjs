// Tests du moteur de l'Espace entrepreneur (critères d'acceptation de documentation/09-specification-espace.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/espace-fr.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const CAL = JSON.parse(readFileSync(new URL("../../data/calendars/fr.json", import.meta.url))).events;
const near = (a, e, label) => assert.ok(Math.abs(a - e) < 0.005, `${label} : ${a} ≠ ${e}`);

const client = { id: "c1", name: "Studio Nova", pro: true };
const me = { name: "Camille Martin EI" };
const draft = (over = {}) => Object.assign({
  id: "d" + Math.random(), type: "facture", status: "draft", date: "2026-10-05", terms: 30, clientId: "c1",
  lines: [{ desc: "Site vitrine", qty: 1, price: 1000 }], vat: { franchise: true, rate: 20, place: "fr" }, payments: []
}, over);
const issueAll = (docs, doc) => {
  const r = E.issue(docs, doc, me, client, null, "2026-10-20T10:00:00Z");
  assert.deepEqual(r.errors, []);
  docs.push(r.doc);
  return r.doc;
};

test("A2 : numérotation par série et par année", () => {
  const docs = [];
  assert.equal(issueAll(docs, draft()).number, "F2026-001");
  assert.equal(issueAll(docs, draft({ date: "2026-10-06" })).number, "F2026-002");
  assert.equal(issueAll(docs, draft({ type: "devis", date: "2026-10-06" })).number, "D2026-001");
  assert.equal(issueAll(docs, draft({ date: "2027-01-04" })).number, "F2027-001");
  assert.equal(E.nextNumber(docs, "facture", "2028", { facture: "FA-" }), "FA-2028-001", "préfixe personnalisé");
});

test("A3/A4 : document émis figé ; date antérieure au dernier document refusée", () => {
  const docs = [];
  const first = issueAll(docs, draft({ date: "2026-10-10" }));
  assert.equal(first.status, "issued");
  assert.equal(first.snapshot.client.name, "Studio Nova", "client figé à l'émission");
  const late = E.issue(docs, draft({ date: "2026-10-01" }), me, client, null, "now");
  assert.match(late.errors.join(" "), /antérieure à celle du dernier document émis de la série \(F2026-001 du 10\/10\/2026\)/);
  const empty = E.issue(docs, draft({ date: "2026-10-12", lines: [{ desc: "", qty: 1, price: NaN }] }), me, { name: "" }, null, "now");
  assert.deepEqual(empty.errors, ["Choisissez un client.", "Ajoutez au moins une ligne avec une désignation, une quantité et un prix."]);
  const zero = E.issue(docs, draft({ date: "2026-10-12", lines: [{ desc: "Offert", qty: 1, price: 0 }] }), me, client, null, "now");
  assert.deepEqual(zero.errors, ["Le montant total doit être positif."]);
});

test("ligne commencée mais incomplète : émission refusée, avec le numéro de la ligne (doc 37, § 6)", () => {
  const ok = { desc: "Maquettes", qty: 2, price: 300 };
  const check = (lines) => E.checkIssue([], draft({ lines }), client);
  assert.deepEqual(check([ok, { desc: "Sans prix", qty: 1, price: NaN }]),
    ["Complétez la ligne 2 (désignation, quantité et prix unitaire hors taxes) ou supprimez-la."]);
  assert.deepEqual(check([{ desc: "", qty: 1, price: 120 }, ok, { desc: "Sans quantité", qty: NaN, price: 50 }, { desc: "Sans prix", qty: 1, price: null }]),
    ["Complétez les lignes 1, 3 et 4 (désignation, quantité et prix unitaire hors taxes) ou supprimez-les."]);
  assert.deepEqual(check([ok, { desc: "  ", qty: 1, price: NaN }, { desc: "", qty: 3, price: "" }]), [], "lignes vides (rien de visible) ignorées");
  assert.deepEqual(check([{ desc: "Offert", qty: 1, price: 0 }, { desc: "Sans prix", qty: 1 }]).length, 1, "prix nul accepté, prix absent refusé");
  assert.deepEqual(check([ok, { desc: "Conseil", qty: "1,5", price: 80 }]).length, 1, "quantité illisible refusée");
});

test("A5 : paiement partiel puis solde ; retard", () => {
  const docs = [];
  const f = issueAll(docs, draft());
  assert.equal(E.state(f, "2026-10-20"), "unpaid");
  assert.equal(E.state(f, "2026-11-05"), "overdue", "échéance du 04/11 dépassée");
  assert.deepEqual(E.checkPayment(f, { date: "2026-10-25", amount: 1200, method: "virement" }), ["Le montant dépasse le reste à encaisser."]);
  f.payments.push({ id: "p1", date: "2026-10-25", amount: 400, method: "virement" });
  assert.equal(E.state(f, "2026-10-26"), "partial");
  assert.equal(E.balance(f), 600);
  f.payments.push({ id: "p2", date: "2026-11-02", amount: 600, method: "cheque" });
  assert.equal(E.state(f, "2026-12-01"), "paid");
});

test("A6 : livre des recettes chronologique, remboursement d'avoir en négatif, export CSV", () => {
  const docs = [];
  const f1 = issueAll(docs, draft({ lines: [{ desc: "Site vitrine", qty: 1, price: 1000 }, { desc: "Logo", qty: 1, price: 200 }] }));
  f1.payments.push({ id: "p1", date: "2026-11-02", amount: 1200, method: "virement" });
  const f2 = issueAll(docs, draft({ date: "2026-10-06" }));
  f2.payments.push({ id: "p2", date: "2026-10-20", amount: 1000, method: "carte" });
  const a = issueAll(docs, E.creditFromInvoice(f2, "2026-11-10", "a1"));
  a.payments.push({ id: "p3", date: "2026-11-12", amount: 300, method: "virement" });
  const rows = E.ledger(docs, "2026-01-01", "2026-12-31");
  assert.deepEqual(rows.map((r) => [r.date, r.amount, r.ref]), [["2026-10-20", 1000, "F2026-002"], ["2026-11-02", 1200, "F2026-001"], ["2026-11-12", -300, "A2026-001"]]);
  assert.equal(rows[1].nature, "Site vitrine (+ 1)");
  assert.equal(rows[0].method, "Carte bancaire");
  assert.equal(E.cashed(docs, "2026-11-01", "2026-11-30"), 900);
  const csv = E.ledgerCSV(rows).split("\r\n");
  assert.equal(csv[0], "Date;Client;Nature;Montant;Moyen de paiement;Référence");
  assert.equal(csv[3], '12/11/2026;"Studio Nova";"Site vitrine";-300,00;"Virement";"A2026-001"');
});

test("A7 : prochaine déclaration (trimestrielle, BNC) : période, date limite reportée, cotisations", () => {
  const docs = [];
  const f = issueAll(docs, draft({ date: "2026-08-01" }));
  f.payments.push({ id: "p", date: "2026-09-15", amount: 1000, method: "virement" });
  const profile = { activity: "liberal_bnc", periodicity: "quarterly", vl: false, acre: 0 };
  const d = E.nextDeclaration(docs, profile, R, CAL, "2026-10-20");
  assert.equal(d.period.label, "3e trimestre 2026");
  assert.equal(d.due, "2026-11-02", "31 octobre reporté au lundi 2 novembre");
  assert.equal(d.revenue, 1000);
  near(d.social, 1000 * (0.256 + 0.002), "cotisations BNC 25,6 % + formation 0,2 %");
  const vl = E.nextDeclaration(docs, Object.assign({}, profile, { vl: true }), R, CAL, "2026-10-20");
  near(vl.vl, 22, "versement libératoire 2,2 %");
  const monthly = E.nextDeclaration(docs, Object.assign({}, profile, { periodicity: "monthly" }), R, CAL, "2026-10-20");
  assert.equal(monthly.period.label, "septembre 2026");
  assert.equal(E.nextDeclaration(docs, { activity: "real" }, R, CAL, "2026-10-20"), null, "pas de déclaration micro au réel");
});

test("A7 : ACRE jusqu'à la fin du 3e trimestre qui suit le début d'activité", () => {
  assert.equal(E.acreEnd("2026-07-01"), "2027-06-30", "exemple de l'Urssaf");
  assert.equal(E.acreEnd("2026-01-15"), "2026-12-31");
  assert.equal(E.acreEnd("2026-11-03"), "2027-09-30");
  const p = { activity: "liberal_bnc", acre: 50, startDate: "2026-07-01" };
  assert.equal(E.rates(p, R, "2026-09-30").social, 0.128);
  assert.equal(E.rates(p, R, "2027-09-30").social, 0.256, "après la fin de l'ACRE");
});

test("A8 : plafond et seuil de TVA sur l'année civile", () => {
  const docs = [];
  const f = issueAll(docs, draft());
  f.payments.push({ id: "p", date: "2026-10-30", amount: 1000, method: "virement" });
  const t = E.thresholds(docs, { activity: "liberal_bnc", vatRegime: "franchise" }, R, 2026);
  assert.equal(t.revenue, 1000);
  assert.equal(t.ceiling, 83600);
  assert.deepEqual(t.vat, { base: 37500, major: 41250 });
  assert.equal(E.thresholds(docs, { activity: "liberal_bnc", vatRegime: "simplified" }, R, 2026).vat, null);
});

test("A9/A10 : devis → facture, facture → avoir, duplication", () => {
  const docs = [];
  const quote = issueAll(docs, draft({ type: "devis", lines: [{ desc: "Audit", qty: 2, price: 500 }] }));
  const inv = E.invoiceFromQuote(quote, "2026-10-21", "f9");
  assert.equal(inv.type, "facture");
  assert.equal(inv.status, "draft");
  assert.equal(inv.quoteId, quote.id);
  assert.deepEqual(inv.lines, quote.lines);
  inv.lines[0].price = 1;
  assert.equal(quote.lines[0].price, 500, "copie indépendante");
  const f = issueAll(docs, draft());
  const credit = E.creditFromInvoice(f, "2026-10-22", "a9");
  assert.deepEqual(credit.origin, { number: f.number, date: f.date });
  assert.equal(E.duplicate(f, "2026-10-23", "x").number, undefined, "la copie n'a pas de numéro");
});

test("synthèse par client", () => {
  const docs = [];
  const f = issueAll(docs, draft());
  f.payments.push({ id: "p", date: "2026-10-30", amount: 250, method: "virement" });
  issueAll(docs, draft({ date: "2026-10-07" }));
  assert.deepEqual(E.clientTotals(docs, "c1"), { cashed: 250, due: 1750 });
});

test("A10 : avoir sur une facture non payée (annulation) ou payée (remboursement)", () => {
  const docs = [];
  const unpaid = issueAll(docs, draft());
  const full = issueAll(docs, E.creditFromInvoice(unpaid, "2026-10-21", "a1"));
  assert.equal(E.balance(unpaid, docs), 0);
  assert.equal(E.state(unpaid, "2026-12-01", docs), "cancelled", "facture annulée par l'avoir");
  assert.equal(E.state(full, "2026-12-01", docs), "imputed", "avoir déduit, rien à rembourser");
  const tooMuch = E.issue(docs, E.creditFromInvoice(unpaid, "2026-10-22", "a2"), me, client, null, "now");
  assert.match(tooMuch.errors[0], /ne peut pas dépasser le montant restant de la facture F2026-001/);

  const paid = issueAll(docs, draft({ date: "2026-10-23" }));
  paid.payments.push({ id: "p", date: "2026-10-24", amount: 1000, method: "virement" });
  const partialCredit = E.creditFromInvoice(paid, "2026-10-25", "a3");
  partialCredit.lines[0].price = 300;
  const credit = issueAll(docs, partialCredit);
  assert.equal(E.balance(credit, docs), 300, "300 € à rembourser au client");
  assert.equal(E.state(credit, "2026-10-26", docs), "refund");
  assert.deepEqual(E.checkPayment(credit, { date: "2026-10-27", amount: 400, method: "virement" }, docs), ["Le montant dépasse le reste à rembourser."]);
  credit.payments.push({ id: "r", date: "2026-10-27", amount: 300, method: "virement" });
  assert.equal(E.state(credit, "2026-10-28", docs), "refunded");
  assert.equal(E.state(paid, "2026-10-28", docs), "paid");
  assert.equal(E.cashed(docs, "2026-10-01", "2026-10-31"), 700, "1 000 encaissés − 300 remboursés");
});

test("revue : plusieurs avoirs sur une facture payée en partie (trop-perçu compté une seule fois)", () => {
  const docs = [];
  const f = issueAll(docs, draft({ lines: [{ desc: "Mission", qty: 1, price: 100 }] }));
  f.payments.push({ id: "p", date: "2026-10-06", amount: 50, method: "virement" });
  const a1 = E.creditFromInvoice(f, "2026-10-07", "a1"); a1.lines[0].price = 30;
  const a2 = E.creditFromInvoice(f, "2026-10-08", "a2"); a2.lines[0].price = 30;
  issueAll(docs, a1); issueAll(docs, a2);
  // 100 − 60 d'avoirs = 40 dus, 50 payés : 10 € à rembourser au total
  assert.equal(E.balance(docs[1], docs) + E.balance(docs[2], docs), 10);
  assert.equal(E.balance(docs[1], docs), 10, "le premier avoir porte le remboursement");
  assert.equal(E.balance(docs[2], docs), 0);
});

test("revue : montants vides après une sauvegarde JSON (null) ; chronologie au-delà de 999 ; avoir dupliqué", () => {
  const docs = [];
  const saved = JSON.parse(JSON.stringify(draft({ lines: [{ desc: "Sans prix", qty: 1, price: NaN }] })));
  assert.equal(saved.lines[0].price, null);
  assert.match(E.issue(docs, saved, me, client, null, "now").errors.join(" "), /Complétez la ligne 1 /);
  const many = [{ type: "facture", status: "issued", number: "F2026-999", date: "2026-10-01" },
                { type: "facture", status: "issued", number: "F2026-1000", date: "2026-10-09" }];
  assert.equal(E.nextNumber(many, "facture", "2026"), "F2026-1001");
  assert.match(E.checkIssue(many, draft({ date: "2026-10-05" }), client).join(" "), /F2026-1000 du 09\/10\/2026/);
  const f = issueAll(docs, draft());
  const copy = E.duplicate(E.creditFromInvoice(f, "2026-10-21", "a"), "2026-10-22", "b");
  assert.equal(copy.originId, f.id);
  assert.deepEqual(copy.origin, { number: f.number, date: f.date });
});

test("schéma 2 : un encaissement marqué supprimé (synchronisation) ne compte nulle part", () => {
  const docs = [];
  const f = issueAll(docs, draft());
  f.payments.push({ id: "p1", date: "2026-10-25", amount: 400, method: "virement" });
  f.payments.push({ id: "p2", date: "2026-10-26", amount: 600, method: "cheque", deletedAt: "2026-10-27T09:00:00Z" });
  assert.deepEqual(E.payments(f).map((p) => p.id), ["p1"]);
  assert.equal(E.paidAmount(f), 400);
  assert.equal(E.balance(f, docs), 600);
  assert.equal(E.state(f, "2026-10-28", docs), "partial");
  assert.deepEqual(E.checkPayment(f, { date: "2026-10-28", amount: 600, method: "virement" }, docs), [], "le solde reste encaissable");
  assert.deepEqual(E.ledger(docs, "2026-01-01", "2026-12-31").map((r) => r.amount), [400]);
  assert.deepEqual(E.clientTotals(docs, "c1"), { cashed: 400, due: 600 });

  // Avoir remboursé : la date annoncée est celle du remboursement en vigueur, pas d'un remboursement supprimé.
  const fmt = { eur: (n) => n.toFixed(2).replace(".", ",") + " €", date: (iso) => iso.split("-").reverse().join("/") };
  const paid = issueAll(docs, draft({ date: "2026-10-23", clientId: "c2" }));
  paid.payments.push({ id: "p3", date: "2026-10-24", amount: 1000, method: "virement" });
  const partialCredit = E.creditFromInvoice(paid, "2026-10-25", "a1");
  partialCredit.lines[0].price = 300;
  const credit = issueAll(docs, partialCredit);
  credit.payments.push({ id: "r1", date: "2026-10-27", amount: 300, method: "virement" });
  credit.payments.push({ id: "r0", date: "2026-10-30", amount: 300, method: "virement", deletedAt: "2026-10-30T12:00:00Z" });
  assert.equal(E.state(credit, "2026-10-31", docs), "refunded");
  assert.match(E.email("send", credit, docs, { name: "Camille" }, "2026-10-31", fmt).body, /remboursée le 27\/10\/2026\./);
});
