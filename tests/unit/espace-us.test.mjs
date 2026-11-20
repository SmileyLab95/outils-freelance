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

test("avoir trop élevé : montant restant de la facture avec la devise, au format américain (documentation/60, lot 3c)", () => {
  const T2 = new Proxy({ "eng.issue.creditOver": "{number} ({amount})" }, { get: (o, k) => (k in o ? o[k] : "[" + String(k) + "]") });
  const E2 = US.create(T2);
  const inv = invoice("c1", "2026-03-02", 1234.5);
  const credit = E2.creditFromInvoice(inv, "2026-03-05", "cm1");
  credit.lines = [{ desc: "Refund", qty: 1, price: 2000 }];
  assert.deepEqual(E2.issue([inv], credit, { name: "Me" }, { name: "Client" }, null, "now").errors, [inv.number + " ($1,234.50)"]);
});

// ----- Lot 3d-2 (documentation/60, § 3.3, D92) : livre au format commun, trésorerie, courriels -------------------

test("livre au format commun : encaissements et remboursements (négatifs) ; encaissé et historique du cœur", () => {
  const paid = invoice("c1", "2026-03-01", 1500, [["2026-03-10", 1000], ["2026-04-02", 500]]);
  const credit = { id: "cm", type: "avoir", status: "issued", number: "CM-2026-001", date: "2026-04-05", clientId: "c1", originId: paid.id,
                   lines: [{ desc: "Refund", qty: 1, price: 100 }], tax: {}, payments: [{ id: "r", date: "2026-04-20", amount: 100, method: "ach" }] };
  const docs = [paid, credit];
  assert.deepEqual(E.ledger(docs, "2026-01-01", "2026-12-31").map((r) => [r.date, r.amount, r.ref]),
    [["2026-03-10", 1000, paid.number], ["2026-04-02", 500, paid.number], ["2026-04-20", -100, "CM-2026-001"]]);
  assert.equal(E.cashed(docs, "2026-04-01", "2026-04-30"), 400, "remboursement déduit");
  const h = E.cashHistory(docs, [{ id: "e", date: "2026-04-15", amount: 75.5, line: "18" }], "2026-03-01", "2026-04-30");
  assert.deepEqual(h.map((m) => [m.key, m.in, m.out]), [["2026-03", 1000, 0], ["2026-04", 400, 75.5]]);
  assert.equal(h[0].label, "[eng.period.month]", "libellé de période du cœur");
});

test("trésorerie : acomptes trimestriels aux dates sourcées, du montant du calculateur, moins les acomptes versés", () => {
  const docs = [invoice("c1", "2026-01-10", 60000, [["2026-01-20", 60000]])];
  const profile = { filingStatus: "single", cashBalance: 20000, estimatedPaid: { "2026-3": 500 } };
  const input = { documents: docs, expenses: [], charges: [], profile, rules: R, events: [], today: "2026-08-01", months: 6 };
  const est = E.estimatedTax(E.taxInput(input, 2026));
  assert.ok(est.quarterly.perQuarter > 0, "acomptes requis pour ce bénéfice");
  const f = E.forecast(input);
  const tax = f.items.filter((x) => x.kind === "tax");
  assert.deepEqual(tax.map((x) => x.date), ["2026-09-15", "2027-01-15"], "dates de la règle estimated_tax_due_dates_2026 dans l'horizon");
  assert.equal(-tax[0].amount, Math.round((est.quarterly.perQuarter - 500) * 100) / 100, "acompte 3 moins 500 $ déjà versés");
  assert.equal(-tax[1].amount, Math.round(est.quarterly.perQuarter * 100) / 100, "même montant que le calculateur (U6)");
  assert.equal(tax[0].label, "[eng.us.forecast.installment]");
  assert.deepEqual(f.missingTaxYears, [2027], "dates de 2027 pas encore dans les règles : signalé, rien d'inventé");
  const full = E.forecast(Object.assign({}, input, { profile: Object.assign({}, profile, { estimatedPaid: { "2026-3": 1e9, "2026-4": 1e9 } }) }));
  assert.equal(full.items.filter((x) => x.kind === "tax").length, 0, "acomptes déjà versés : rien de prévu");
});

test("trésorerie : déjà dû = impôt fédéral estimé sur le bénéfice réalisé, moins les acomptes versés ; point mort non calculé", () => {
  const docs = [invoice("c1", "2026-01-10", 40000, [["2026-01-20", 40000]])];
  const base = { documents: docs, expenses: [], profile: { filingStatus: "single", expectedProfit: 80000 }, rules: R, today: "2026-06-30" };
  const est = E.estimatedTax(E.taxInput(base, 2026));
  const o = E.owed(base);
  assert.equal(o.tax.actual, 40000);
  assert.equal(o.tax.projected, 80000, "bénéfice prévu saisi");
  assert.equal(o.tax.accrued, Math.round(est.estimate.federal * 0.5 * 100) / 100, "moitié du bénéfice prévu déjà réalisée");
  assert.equal(o.total, o.tax.accrued);
  const paid = E.owed(Object.assign({}, base, { profile: Object.assign({}, base.profile, { estimatedPaid: { "2026-1": 1000, "2026-2": 1e9 } }) }));
  assert.equal(paid.total, 0, "jamais négatif");
  assert.equal(E.owed(Object.assign({}, base, { documents: [] })).total, 0, "rien de réalisé, rien de dû");
  assert.equal(E.breakEven(3000, {}, R, "2026-06-30"), null);
  assert.equal(E.mixedActivities({}, R), null);
});

test("courriels préremplis : envoi, relance, devis et avoir, sans mention française", () => {
  const T2 = new Proxy(require("../../src/assets/tools/espace-us-texts-en.js").OF_ESPACE_TEXTS.en, { get: (o, k) => (k in o ? o[k] : "[" + String(k) + "]") });
  const E2 = US.create(T2);
  const fmt = { money: (n) => "$" + n.toFixed(2), date: (d) => d };
  const inv = invoice("c1", "2026-03-01", 1200, [["2026-03-05", 200]], { terms: 30, number: "2026-050" });
  const send = E2.email("send", inv, [inv], { name: "Jordan Lee Design", payment: "ACH to account 123" }, "2026-03-10", fmt);
  assert.equal(send.subject, "Invoice 2026-050 – Jordan Lee Design");
  assert.ok(send.body.startsWith("Hello,\n\nPlease find attached invoice 2026-050 dated 2026-03-01, for $1200.00. After the payments already received, the balance due is $1000.00, due by 2026-03-31."));
  assert.ok(send.body.includes("Payment instructions: ACH to account 123") && send.body.endsWith("Best regards,\nJordan Lee Design"));
  const rem = E2.email("reminder", inv, [inv], {}, "2026-04-15", fmt);
  assert.equal(rem.subject, "Invoice 2026-050: payment reminder");
  assert.ok(rem.body.includes("which was due on 2026-03-31, has not been received yet. The balance due is $1000.00."));
  const quote = invoice("c1", "2026-03-01", 2000, [], { type: "devis", number: "E-2026-004", depositPct: 25, validity: 15 });
  const q = E2.email("send", quote, [quote], {}, "2026-03-02", fmt);
  assert.ok(q.subject === "Estimate E-2026-004" && q.body.includes("valid until 2026-03-16. A deposit of 25% ($500.00) is due on acceptance."));
  for (const m of [send, rem, q]) assert.ok(!/[àâçéèêëîïôûùœ]|\[eng\./.test(m.subject + m.body), "aucun texte français ni clé manquante");
});
