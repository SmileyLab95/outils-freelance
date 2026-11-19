// Moteur de l'Espace des États-Unis (engines/espace-us.js) : critères d'acceptation U3 à U7 de
// documentation/60-espace-etats-unis.md (§ 4), avec les règles de data/rules/us.json. Textes : clés brutes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const US = require("../../src/assets/engines/espace-us.js");
const TAX = require("../../src/assets/engines/tax-us.js");
const R = ruleValues("us");
const TX = new Proxy({}, { get: (_, k) => "[" + String(k) + "]" });
const E = US.create(TX);
const round2 = (n) => Math.round(n * 100) / 100;

let seq = 0;
function invoice(clientId, date, price, payments = [], extra = {}) {
  seq++;
  return Object.assign({ id: "f" + seq, type: "facture", status: "issued", number: "2026-" + String(seq).padStart(3, "0"), date, clientId, terms: 30,
    lines: [{ desc: "Work", qty: 1, price }], tax: {}, snapshot: { client: { name: "Client " + clientId } },
    payments: payments.map(([d, amount, method = "ach"], i) => ({ id: "p" + seq + "-" + i, date: d, amount, method })) }, extra);
}

test("numérotation, moyens de paiement et totaux à l'américaine", () => {
  assert.equal(E.nextNumber([], "facture", "2026"), "2026-001", "comme le générateur public");
  assert.equal(E.nextNumber([], "devis", "2026"), "E-2026-001");
  assert.equal(E.nextNumber([], "avoir", "2026"), "CM-2026-001");
  const doc = invoice("c1", "2026-03-02", 100, [], { tax: { rate: 8.25, label: "Sales tax" } });
  assert.equal(E.total(doc), 108.25, "taxe comprise, moteur de facture international");
  assert.deepEqual(E.checkPayment(doc, { date: "2026-03-10", amount: 50, method: "check" }, [doc]), []);
  assert.deepEqual(E.checkPayment(doc, { date: "2026-03-10", amount: 50, method: "virement" }, [doc]), ["[eng.pay.method]"]);
  assert.equal(E.METHODS.card, "[eng.us.method.card]");
});

test("U3 : comptabilité de caisse ; remboursement en ligne 2 l'année où il est versé ; facture impayée sans effet", () => {
  const lateDec = invoice("c1", "2026-12-20", 1000, [["2027-01-05", 1000]]);
  const paid = invoice("c2", "2026-02-01", 3000, [["2026-02-15", 1200], ["2026-03-01", 1800]]);
  const unpaid = invoice("c3", "2026-05-01", 5000);
  const credit = { id: "a1", type: "avoir", status: "issued", number: "CM-2026-001", date: "2026-06-01", clientId: "c2", originId: paid.id,
                   lines: [{ desc: "Refund", qty: 1, price: 200 }], tax: {}, payments: [{ id: "r1", date: "2026-06-10", amount: 200, method: "ach" }] };
  const docs = [lateDec, paid, unpaid, credit];
  const y26 = E.income(docs, "2026-01-01", "2026-12-31");
  assert.equal(y26.gross, 3000, "encaissé en 2026 : 1 200 + 1 800 ; décembre payé en janvier : 2027");
  assert.equal(y26.returns, 200);
  assert.equal(E.income(docs, "2027-01-01", "2027-12-31").gross, 1000);
  const s = E.scheduleC({ documents: docs, expenses: [], year: "2026", rules: R });
  assert.equal(s.values[1], 3000);
  assert.equal(s.values[2], 200);
  assert.equal(s.values[3], 2800);
  assert.equal(s.values[28], 0, "la facture impayée n'est ni une recette ni une dépense (us_bad_debts_cash_method)");
  assert.deepEqual(E.incomeQuarters(docs, "2026").map((q) => q.net), [3000, -200, 0, 0]);
});

test("U4 : chaque dépense a une ligne de l'annexe C ; la synthèse additionne exactement les dépenses de l'année", () => {
  const expenses = [
    { id: "e1", date: "2026-01-10", supplier: "Ads Inc", amount: 100, method: "card", line: "8" },
    { id: "e2", date: "2026-02-10", supplier: "Staples", amount: 50.25, method: "card", line: "18" },
    { id: "e3", date: "2026-03-10", supplier: "Diner", amount: 80, method: "cash", line: "24b" },
    { id: "e4", date: "2026-04-10", supplier: "Bank", amount: 10, method: "ach", line: "27b" },
    { id: "e5", date: "2025-12-31", supplier: "Old", amount: 999, method: "ach", line: "8" },
    { id: "e6", date: "2026-05-10", supplier: "Gone", amount: 70, method: "ach", line: "8", deletedAt: "2026-05-11" },
  ];
  const x = E.expenseLines(expenses, "2026", R);
  const byLine = Object.fromEntries(x.rows.map((r) => [r.line, r]));
  assert.equal(byLine["8"].deductible, 100);
  assert.equal(byLine["18"].deductible, 50.25);
  assert.equal(byLine["24b"].spent, 80);
  assert.equal(byLine["24b"].deductible, 40, "repas : 50 % (us_meals_deduction_rate)");
  assert.equal(byLine["27b"].deductible, 10);
  assert.equal(x.total, 200.25);
  assert.deepEqual(x.rows.map((r) => r.line), Object.keys(R.us_schedule_c_expense_lines), "ordre du formulaire");
  assert.deepEqual(E.checkExpense({ date: "2026-01-10", supplier: "A", amount: 5, method: "ach", line: "30" }, R), ["[eng.us.exp.line]"],
    "le bureau à domicile n'est pas une ligne de dépense (ligne 30 à part)");
  assert.deepEqual(E.checkExpense({ date: "", supplier: "", amount: 0, method: "x", line: "8" }, R),
    ["[eng.exp.date]", "[eng.exp.supplier]", "[eng.exp.amount]", "[eng.pay.method]"]);
});

test("U5 : 7 = 5 + 6, 29 = 7 − 28, 31 = 29 − 30 ; export identique à l'écran", () => {
  const docs = [invoice("c1", "2026-01-05", 12000, [["2026-01-20", 12000]])];
  const expenses = [{ id: "e1", date: "2026-02-01", supplier: "Soft", amount: 1234.56, method: "card", line: "18" },
                    { id: "e2", date: "2026-02-02", supplier: "Lunch", amount: 99.99, method: "card", line: "24b" }];
  const s = E.scheduleC({ documents: docs, expenses, year: "2026", rules: R, otherIncome: 25, homeOffice: 1500 });
  const v = s.values;
  assert.equal(v[5], v[3] - v[4]);
  assert.equal(v[7], round2(v[5] + v[6]));
  assert.equal(v[7], 12025);
  assert.equal(v[28], round2(1234.56 + round2(99.99 * 0.5)));
  assert.equal(v[29], round2(v[7] - v[28]));
  assert.equal(v[31], round2(v[29] - v[30]));
  const csv = E.scheduleCCSV(s, R).split("\r\n");
  assert.equal(csv[0], "[eng.us.csv.scheduleC]");
  const rows = Object.fromEntries(csv.slice(1).map((l) => { const p = l.split(";"); return [p[0], Number(p[p.length - 1])]; }));
  for (const [k, val] of Object.entries(v)) assert.equal(rows[k], val, `ligne ${k} : export = écran`);
  assert.match(csv.find((l) => l.startsWith("18;")), /^18;"Office expense";1234\.56$/);
  assert.match(csv.find((l) => l.startsWith("31;")), /^31;"\[eng\.us\.line\.31\]";/);
});

test("U6 : l'acompte est celui du calculateur public pour les mêmes données", () => {
  const base = { documents: [], expenses: [], year: "2026", today: "2026-07-01", rules: R, status: "single", wages: 0, withheld: 0, priorTax: null, priorAgi: 0 };
  const a = E.estimatedTax(Object.assign({ expectedProfit: 60000 }, base));
  const est = TAX.estimate({ profit: 60000, status: "single", wages: 0 }, R);
  assert.deepEqual(a.quarterly, TAX.quarterly(est.federal, 0, null, 0, "single", R));
  assert.ok(a.quarterly.required > 0);
  assert.equal(a.next, "2026-09-15", "prochaine échéance après le 1er juillet");
  // Sans bénéfice prévu : bénéfice à date ramené à l'année (182 jours écoulés sur 365 au 1er juillet 2026).
  const docs = [invoice("c1", "2026-03-01", 18200, [["2026-03-15", 18200]])];
  const b = E.estimatedTax(Object.assign({}, base, { documents: docs }));
  assert.equal(b.actual, 18200);
  assert.equal(b.projected, round2(18200 * 365 / 182));
  const prior = E.estimatedTax(Object.assign({}, base, { documents: docs, today: "2027-02-01" }));
  assert.equal(prior.projected, 18200, "année passée : bénéfice réel");
});

test("U7 : 1099-NEC attendus au seuil de 2 000 $, cartes et plateformes exclues, clients particuliers exclus", () => {
  const clients = [{ id: "a", name: "Under", pro: true }, { id: "b", name: "At", pro: true }, { id: "c", name: "Cards", pro: true },
                   { id: "d", name: "Person", pro: false }];
  const docs = [invoice("a", "2026-01-01", 1999.99, [["2026-01-10", 1999.99]]), invoice("b", "2026-01-01", 2000, [["2026-02-10", 2000]]),
                invoice("c", "2026-01-01", 2100, [["2026-03-10", 1500, "ach"], ["2026-03-11", 600, "card"]]),
                invoice("d", "2026-01-01", 5000, [["2026-04-10", 5000]]),
                invoice("b", "2025-12-01", 9000, [["2025-12-20", 9000]])];
  const r = E.expected1099(docs, clients, "2026", R);
  assert.equal(r.threshold, 2000);
  assert.deepEqual(r.clients, [{ clientId: "b", name: "At", total: 2000 }]);
  assert.equal(r.dueDate, "2027-02-01");
  assert.deepEqual(E.expected1099(docs, clients, "2025", R).clients.map((c) => c.clientId), ["b"], "2025 : seuil de 600 $");
  assert.deepEqual(E.expected1099(docs, clients, "2024", R), { threshold: null, dueDate: null, clients: [] }, "seuil inconnu : pas de liste");
  assert.deepEqual(US.NOT_ON_1099_NEC, ["card", "platform"], "us_1099_nec_card_exclusion");
});
