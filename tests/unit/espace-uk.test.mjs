// Moteur de l'Espace du Royaume-Uni (engines/espace-uk.js) : critères d'acceptation K3 à K7 de
// documentation/61-espace-royaume-uni.md (§ 4), avec les règles de data/rules/uk.json. Textes : clés brutes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const UK = require("../../src/assets/engines/espace-uk.js");
const TAX = require("../../src/assets/engines/tax-uk.js");
const R = ruleValues("uk");
const TX = new Proxy({}, { get: (_, k) => "[" + String(k) + "]" });
const E = UK.create(TX);
const round2 = (n) => Math.round(n * 100) / 100;

let seq = 0;
function invoice(clientId, date, price, payments = [], extra = {}) {
  seq++;
  return Object.assign({ id: "f" + seq, type: "facture", status: "issued", number: "2026-" + String(seq).padStart(3, "0"), date, clientId, terms: 30,
    lines: [{ desc: "Work", qty: 1, price }], tax: {}, snapshot: { client: { name: "Client " + clientId } },
    payments: payments.map(([d, amount, method = "bank"], i) => ({ id: "p" + seq + "-" + i, date: d, amount, method })) }, extra);
}
function credit(origin, date, price, refunds = []) {
  seq++;
  return { id: "a" + seq, type: "avoir", status: "issued", number: "CN-2026-" + String(seq).padStart(3, "0"), date, clientId: origin.clientId, originId: origin.id,
           lines: [{ desc: "Refund", qty: 1, price }], tax: {}, payments: refunds.map(([d, amount], i) => ({ id: "r" + seq + "-" + i, date: d, amount, method: "bank" })) };
}
const exp = (id, date, amount, box, extra = {}) => Object.assign({ id, date, supplier: "Supplier " + id, amount, method: "card", box }, extra);

test("numérotation, moyens de paiement, formats et totaux à la britannique", () => {
  assert.equal(E.nextNumber([], "facture", "2026"), "2026-001", "comme le générateur public");
  assert.equal(E.nextNumber([], "devis", "2026"), "Q-2026-001");
  assert.equal(E.nextNumber([], "avoir", "2026"), "CN-2026-001");
  const doc = invoice("c1", "2026-05-02", 100, [], { tax: { rate: 20, label: "VAT" } });
  assert.equal(E.total(doc), 120, "VAT comprise, moteur de facture international");
  assert.deepEqual(E.checkPayment(doc, { date: "2026-05-10", amount: 50, method: "cheque" }, [doc]), []);
  assert.deepEqual(E.checkPayment(doc, { date: "2026-05-10", amount: 50, method: "ach" }, [doc]), ["[eng.pay.method]"]);
  assert.equal(E.METHODS.bank, "[eng.uk.method.bank]");
  assert.equal(E.dayText("2026-11-20"), "20/11/2026");
});

test("année fiscale : du 6 avril au 5 avril", () => {
  assert.equal(E.taxYearOf("2026-04-05"), 2025);
  assert.equal(E.taxYearOf("2026-04-06"), 2026);
  assert.equal(E.taxYearOf("2027-01-31"), 2026);
  const ty = E.taxYear(2026);
  assert.equal(ty.start, "2026-04-06");
  assert.equal(ty.end, "2027-04-05");
  assert.equal(ty.start, R.tax_year_start, "année des règles");
  assert.equal(ty.end, R.tax_year_end);
  assert.equal(E.rulesYear(R), 2026);
});

test("K3 : un encaissement compte dans l'année fiscale de sa réception ; facture impayée sans effet ; remboursement déduit", () => {
  // Exemple officiel (uk_records_proof) : facture du 15 mars 2024 payée le 30 avril 2024, recette de 2024-25.
  const hmrc = invoice("c1", "2024-03-15", 500, [["2024-04-30", 500]]);
  assert.equal(E.summary({ documents: [hmrc], expenses: [], year: 2023, rules: R }).values["9"], 0);
  assert.equal(E.summary({ documents: [hmrc], expenses: [], year: 2024, rules: R }).values["9"], 500);
  const lastDay = invoice("c2", "2027-03-01", 1000, [["2027-04-05", 1000]]);
  const nextYear = invoice("c2", "2027-03-02", 700, [["2027-04-06", 700]]);
  const unpaid = invoice("c3", "2026-06-01", 4000);
  const paid = invoice("c4", "2026-05-01", 3000, [["2026-05-20", 1000], ["2026-06-20", 2000]]);
  const cn = credit(paid, "2026-07-01", 200, [["2026-07-10", 200]]);
  const docs = [lastDay, nextYear, unpaid, paid, cn];
  const s = E.summary({ documents: docs, expenses: [], year: 2026, rules: R });
  assert.equal(s.income.gross, 4000, "1 000 + 2 000 + 1 000 reçus le 5 avril 2027 ; 700 reçus le 6 avril : année suivante");
  assert.equal(s.income.returns, 200);
  assert.equal(s.values["9"], 3800, "recettes encaissées, remboursement déduit (D98)");
  assert.equal(E.summary({ documents: docs, expenses: [], year: 2027, rules: R }).values["9"], 700);
  assert.deepEqual(E.incomeQuarters(docs, 2026, R).map((q) => q.net), [3000, -200, 0, 1000]);
});

test("K4 : chaque dépense a une case 11 à 19 du SA103S ; la synthèse additionne exactement les dépenses de l'année ; CSV identique", () => {
  const ok = exp("x", "2026-05-01", 10, "18");
  assert.deepEqual(E.checkExpense(ok), []);
  assert.deepEqual(E.checkExpense(Object.assign({}, ok, { box: "20" })), ["[eng.uk.exp.box]"], "la case 20 est un total");
  assert.deepEqual(E.checkExpense(Object.assign({}, ok, { box: "24" })), ["[eng.uk.exp.box]"], "pas une case du SA103S court");
  assert.deepEqual(E.checkExpense({ date: "", supplier: " ", amount: 0, method: "x", box: "11" }),
                   ["[eng.exp.date]", "[eng.exp.supplier]", "[eng.exp.amount]", "[eng.pay.method]"]);
  const expenses = [exp("e1", "2026-04-06", 100, "18"), exp("e2", "2026-06-10", 50.25, "18"), exp("e3", "2026-08-01", 300, "12"),
                    exp("e4", "2027-04-05", 40, "19"), exp("e5", "2026-04-05", 999, "18"), exp("e6", "2027-04-06", 999, "18"),
                    exp("e7", "2026-09-01", 999, "16", { deletedAt: "2026-09-02" })];
  const docs = [invoice("c1", "2026-05-01", 6000, [["2026-05-15", 6000]])];
  const s = E.summary({ documents: docs, expenses, year: 2026, rules: R, otherIncome: 250 });
  assert.equal(s.values["18"], 150.25);
  assert.equal(s.values["12"], 300);
  assert.equal(s.values["19"], 40, "dernier jour de l'année fiscale compris");
  assert.equal(s.values["16"], 0, "dépense supprimée exclue");
  assert.equal(s.values["20"], 490.25);
  assert.equal(s.values["20"], round2(E.EXPENSE_BOXES.reduce((t, b) => t + s.values[b], 0)));
  assert.equal(s.values["10"], 250);
  assert.equal(s.values["21"], round2(6000 + 250 - 490.25), "case 21 = 9 + 10 − 20");
  assert.equal(s.values["22"], 0);
  assert.equal(s.values["28"], s.values["21"]);
  assert.deepEqual(s.expenses.map((r) => r.label), E.EXPENSE_BOXES.map((b) => R.uk_sa103s_boxes.expenses[b]), "intitulés exacts du formulaire");
  const csv = E.summaryCSV(s, R).split("\r\n");
  assert.equal(csv[0], "[eng.uk.csv.summary]");
  assert.equal(csv.length, 1 + 2 + 9 + 1 + 3, "en-tête, cases 9 et 10, 11 à 19, 20, 21, 22 et 28");
  assert.equal(csv[1], '"9","' + R.uk_sa103s_boxes.income["9"].replace(/"/g, '""') + '",6000.00');
  assert.ok(csv.includes('"20","[eng.uk.box.20]",490.25'));
  assert.ok(csv.includes('"28","' + R.uk_sa103s_boxes.tax_adjusted["28"] + '",' + s.values["28"].toFixed(2)));
  const ex = E.expensesCSV(expenses, "2026-04-06", "2027-04-05", R).split("\r\n");
  assert.equal(ex.length, 1 + 4, "quatre dépenses de l'année");
  assert.ok(ex[1].startsWith("06/04/2026,"));
});

test("synthèse : perte, trading income allowance (case 10.1), pages complètes au-delà de 90 000 £", () => {
  const loss = E.summary({ documents: [invoice("c1", "2026-05-01", 400, [["2026-05-02", 400]])], expenses: [exp("e", "2026-05-03", 900, "14")], year: 2026, rules: R });
  assert.equal(loss.values["21"], 0);
  assert.equal(loss.values["22"], 500);
  assert.equal(loss.values["28"], 0);
  assert.equal(loss.values["32"], 500, "perte fiscale en case 32");
  assert.ok(loss.withinAllowance, "recettes jusqu'à 1 000 £");
  const docs = [invoice("c1", "2026-05-01", 5000, [["2026-05-02", 5000]])], small = [exp("e", "2026-05-03", 300, "18")];
  const without = E.summary({ documents: docs, expenses: small, year: 2026, rules: R });
  assert.ok(without.allowanceHigher, "300 £ de dépenses : l'allocation de 1 000 £ serait plus élevée");
  assert.equal(E.summary({ documents: docs, expenses: [exp("e", "2026-05-03", 1000, "18")], year: 2026, rules: R }).allowanceHigher, false,
               "dépenses égales à l'allocation : rien à gagner");
  const exactly = E.summary({ documents: [invoice("c1", "2026-05-01", R.trading_allowance, [["2026-05-02", R.trading_allowance]])], expenses: [], year: 2026, rules: R });
  assert.equal(exactly.withinAllowance, true, "1 000 £ ou moins : exonérées");
  const withA = E.summary({ documents: docs, expenses: small, year: 2026, rules: R, tradingAllowance: true });
  assert.equal(withA.values["10.1"], R.trading_allowance);
  assert.equal(withA.values["20"], 0, "cases 11 à 20 laissées vides avec l'allocation");
  assert.equal(withA.values["18"], 0);
  assert.equal(withA.values["21"], 5000);
  assert.equal(withA.values["28"], 5000 - R.trading_allowance, "case 28 = 21 − 10.1");
  const tiny = E.summary({ documents: [invoice("c1", "2026-05-01", 600, [["2026-05-02", 600]])], expenses: [], year: 2026, rules: R, tradingAllowance: true });
  assert.equal(tiny.values["10.1"], 600, "l'allocation ne crée pas de perte");
  assert.equal(tiny.values["28"], 0);
  assert.equal(tiny.values["32"], 0);
  const csv = E.summaryCSV(withA, R).split("\r\n");
  assert.ok(csv.some((l) => l.startsWith('"10.1",')) && !csv.some((l) => l.startsWith('"18",')), "export avec la case 10.1, sans les cases de dépenses");
  const limit = R.uk_sa103s_boxes.short_form_turnover_limit;
  assert.equal(E.summary({ documents: [invoice("c1", "2026-05-01", limit, [["2026-05-02", limit]])], expenses: [], year: 2026, rules: R }).fullPages, true);
  assert.equal(E.summary({ documents: [invoice("c1", "2026-05-01", limit - 1, [["2026-05-02", limit - 1]])], expenses: [], year: 2026, rules: R }).fullPages, false);
});

test("K6 : périodes de MTD et dates limites des règles ; totaux cumulés depuis le 6 avril ; état d'après la date du jour", () => {
  const periods = E.mtdPeriods(2026, R);
  assert.deepEqual(periods.map((p) => p.deadline), R.mtd_itsa_quarterly_deadlines_2026_27, "mêmes dates que la règle datée de 2026-27");
  assert.deepEqual(periods.map((p) => p.to), ["2026-07-05", "2026-10-05", "2027-01-05", "2027-04-05"]);
  assert.ok(periods.every((p) => p.from === "2026-04-06"), "chaque mise à jour couvre l'année depuis son début");
  assert.deepEqual(E.mtdPeriods(2027, R).map((p) => p.deadline), ["2027-08-07", "2027-11-07", "2028-02-07", "2028-05-07"]);
  const cal = E.mtdPeriods(2026, R, "calendar");
  assert.deepEqual(cal.map((p) => p.to), ["2026-06-30", "2026-09-30", "2026-12-31", "2027-03-31"], "périodes calendaires");
  assert.deepEqual(cal.map((p) => p.deadline), R.mtd_itsa_quarterly_deadlines_2026_27, "mêmes dates limites (7 février après le 31 décembre)");
  assert.deepEqual(E.quarters(2026, R).map((q) => q.from), ["2026-04-06", "2026-07-06", "2026-10-06", "2027-01-06"]);
  const docs = [invoice("c1", "2026-05-01", 1000, [["2026-05-10", 1000]]), invoice("c2", "2026-08-01", 2500, [["2026-08-20", 2500]])];
  const expenses = [exp("e1", "2026-06-01", 100, "18"), exp("e2", "2026-09-01", 50, "12")];
  const up = E.mtdUpdates({ documents: docs, expenses, year: 2026, rules: R, today: "2026-11-20" });
  assert.deepEqual(up.map((u) => u.income), [1000, 3500, 3500, 3500]);
  assert.deepEqual(up.map((u) => u.quarterIncome), [1000, 2500, 0, 0]);
  assert.deepEqual(up.map((u) => u.spent), [100, 150, 150, 150]);
  assert.equal(up[1].expenses.find((r) => r.box === "12").spent, 50, "totaux par case");
  assert.deepEqual(up.map((u) => u.status), ["past", "past", "open", "future"]);
  assert.deepEqual(E.mtdUpdates({ documents: docs, expenses, year: 2026, rules: R, today: "2026-10-20" }).map((u) => u.status), ["past", "due", "open", "future"]);
});

test("K6 : concerné par MTD selon le revenu éligible de l'année de référence face au seuil de l'année de départ", () => {
  const today = "2026-11-20";
  const entered = (y, v) => ({ taxYears: { [y]: { qualifyingIncome: v } } });
  let st = E.mtdStatus({ documents: [], profile: entered(2024, 52000), rules: R, today });
  assert.deepEqual(st.map((s) => s.start), [2026, 2027, 2028]);
  assert.equal(st[0].threshold, R.mtd_itsa_threshold_2026);
  assert.equal(st[0].incomeYear.start, "2024-04-06");
  assert.equal(st[0].applies, true, "exemple officiel : 52 000 £ en 2024-25, au-dessus de 50 000 £");
  assert.equal(st[0].source, "entered");
  assert.equal(st[1].applies, null, "2025-26 inconnu");
  st = E.mtdStatus({ documents: [], profile: entered(2024, R.mtd_itsa_threshold_2026), rules: R, today });
  assert.equal(st[0].applies, false, "« more than » : le seuil lui-même ne suffit pas");
  // Revenu de 2025-26 tiré des recettes de l'Espace (cases 9 et 10) et des loyers saisis.
  const docs = [invoice("c1", "2025-06-01", 28000, [["2025-06-15", 28000]])];
  st = E.mtdStatus({ documents: docs, profile: { taxYears: { 2025: { otherIncome: 500, propertyIncome: 2000 } } }, rules: R, today });
  assert.equal(st[1].source, "records");
  assert.equal(st[1].amount, 30500);
  assert.equal(st[1].applies, true, "30 500 £ en 2025-26, au-dessus de 30 000 £");
  assert.equal(st[1].complete, true);
  assert.equal(st[2].applies, null, "2026-27 : rien d'enregistré");
});

test("K7 : seuil de VAT, facturé hors taxe sur 12 mois glissants, avoirs déduits, part des clients hors du Royaume-Uni à part", () => {
  const today = "2026-11-20";
  const out = invoice("c1", "2025-11-20", 9000);
  const first = invoice("c1", "2025-11-21", 40000, [], { tax: { rate: 20, label: "VAT" } });
  const abroad = invoice("c9", "2026-03-01", 30000);
  const big = invoice("c2", "2026-10-01", 25000);
  const cn = credit(big, "2026-10-15", 5000);
  const future = invoice("c2", "2026-11-21", 7000);
  const draft = invoice("c2", "2026-11-01", 7000, [], { status: "draft" });
  const v = E.vatTurnover([out, first, abroad, big, cn, future, draft], [{ id: "c9", abroad: true }, { id: "c1" }], today, R);
  assert.equal(v.from, "2025-11-21");
  assert.equal(v.total, 90000, "40 000 (hors VAT) + 30 000 + 25 000 − 5 000");
  assert.equal(v.overseas, 30000);
  assert.equal(v.threshold, R.vat_registration_threshold);
  assert.equal(v.over, false, "le seuil n'est pas dépassé à 90 000 £ exactement");
  assert.equal(E.vatTurnover([first, abroad, big], [], today, R).over, true);
});

test("K5 : impôt estimé et acomptes égaux au calculateur public pour les mêmes données", () => {
  const docs = [invoice("c1", "2026-05-01", 40000, [["2026-06-01", 40000]])];
  const expenses = [exp("e1", "2026-07-01", 4000, "18")];
  const profile = { region: "scotland", taxYears: { 2026: { salary: 10000, expectedProfit: 50000 } } };
  const est = E.estimatedTax({ documents: docs, expenses, profile, rules: R, today: "2026-11-20", year: 2026 });
  assert.equal(est.available, true);
  assert.equal(est.actual, 36000);
  assert.equal(est.projected, 50000, "bénéfice prévu par l'utilisateur");
  assert.deepEqual(est.tax, TAX.soleTrader({ profit: 50000, salary: 10000, region: "scotland" }, R));
  // Sans prévision : bénéfice à date ramené à l'année au prorata des jours écoulés (6 avril au 20 novembre : 229 jours sur 365).
  const pro = E.estimatedTax({ documents: docs, expenses, profile: {}, rules: R, today: "2026-11-20", year: 2026 });
  assert.equal(pro.projected, round2(36000 * 365 / 229));
  assert.deepEqual(pro.tax, TAX.soleTrader({ profit: pro.projected, salary: 0, region: "ruk" }, R));
  assert.equal(E.estimatedTax({ documents: docs, expenses, profile: {}, rules: R, today: "2027-05-01", year: 2026 }).projected, 36000, "année finie : bénéfice réel");
  assert.equal(E.estimatedTax({ documents: docs, expenses, profile: {}, rules: R, today: "2026-11-20", year: 2025 }).available, false, "barème de 2025-26 absent");
});

test("K5 : échéancier (acomptes de l'année, solde, acomptes de l'année suivante) comme le calculateur public", () => {
  const docs = [invoice("c1", "2026-05-01", 40000, [["2026-06-01", 40000]])];
  const base = { documents: docs, expenses: [], rules: R, today: "2026-11-20", year: 2026 };
  const profile = { taxYears: { 2026: { expectedProfit: 40000, priorBill: 3000, priorBalancing: 800 } }, poaPaid: { "2026-1": 500 } };
  const sch = E.taxSchedule(Object.assign({ profile }, base));
  const st = TAX.soleTrader({ profit: 40000, salary: 0, region: "ruk" }, R);
  assert.equal(sch.bill, round2(st.total));
  const rows = sch.rows.map((r) => [r.date, r.kind, r.n || 0, r.year.year, r.amount, r.paid]);
  assert.deepEqual(rows, [
    [R.sa_online_return_deadline_2025_26, "priorBalancing", 0, 2025, 800, 0],
    [R.payments_on_account_dates[0], "poa", 1, 2026, 1500, 500],
    [R.payments_on_account_dates[1], "poa", 2, 2026, 1500, 0],
    [R.sa_balancing_payment_deadline, "balancing", 0, 2026, round2(st.total - 3000), 0],
    [R.sa_balancing_payment_deadline, "poa", 1, 2027, round2(st.paymentsOnAccount.each), 0],
    ["2028-07-31", "poa", 2, 2027, round2(st.paymentsOnAccount.each), 0]
  ]);
  const none = E.taxSchedule(Object.assign({ profile: { taxYears: { 2026: { expectedProfit: 40000, noPoa: true } } } }, base));
  assert.deepEqual(none.rows.filter((r) => r.year.year === 2026).map((r) => r.amount), [0, 0, round2(st.total)], "pas d'acompte : tout au solde");
  const small = E.taxSchedule(Object.assign({ profile: { taxYears: { 2026: { expectedProfit: 40000, priorBill: 900 } } } }, base));
  assert.equal(small.rows[0].amount, 0, "impôt de l'an dernier sous 1 000 £ : pas d'acompte");
  const low = E.taxSchedule(Object.assign({ profile: { taxYears: { 2026: { expectedProfit: 14000, priorBill: 3000 } } } }, base));
  assert.ok(TAX.soleTrader({ profit: 14000, salary: 0, region: "ruk" }, R).total < R.payments_on_account_threshold);
  assert.equal(low.rows.filter((r) => r.year.year === 2027).length, 0, "impôt estimé sous 1 000 £ : pas d'acompte pour l'année suivante");
  const unknown = E.taxSchedule(Object.assign({ profile: { taxYears: { 2026: { expectedProfit: 40000 } } } }, base));
  assert.deepEqual(unknown.rows.slice(0, 3).map((r) => r.amount), [null, null, null], "impôt de l'an dernier inconnu : montants inconnus");
});

test("trésorerie : paiements de l'impôt dans la prévision, montants inconnus signalés, année sans règles ; déjà dû", () => {
  const docs = [invoice("c1", "2026-05-01", 40000, [["2026-06-01", 40000]])];
  const profile = { taxYears: { 2026: { expectedProfit: 40000, priorBill: 3000 } }, poaPaid: { "2026-1": 500 } };
  const f = E.forecast({ documents: docs, expenses: [], profile, rules: R, today: "2026-11-20", months: 6, charges: [] });
  const tax = f.items.filter((x) => x.kind === "tax");
  assert.deepEqual(tax.map((x) => [x.date, x.amount]), [["2027-01-31", -1000]], "1 500 − 500 déjà versés ; juillet hors horizon");
  assert.equal(tax[0].label, "[eng.uk.forecast.poa]");
  assert.deepEqual(f.missingTaxYears, [], "les paiements de 2027-28 tombent à partir du 31 janvier 2028 : déjà dans l'échéancier");
  const f12 = E.forecast({ documents: docs, expenses: [], profile: { taxYears: { 2026: { expectedProfit: 40000 } } }, rules: R, today: "2026-11-20", months: 12, charges: [] });
  assert.equal(f12.items.filter((x) => x.kind === "tax").length, 0);
  assert.equal(f12.unknownTax.length, 2, "deux acomptes de montant inconnu dans l'horizon");
  assert.deepEqual(f12.missingTaxYears, [], "horizon jusqu'au 31 octobre 2027");
  const later = E.forecast({ documents: docs, expenses: [], profile, rules: R, today: "2028-03-01", months: 12, charges: [] });
  assert.deepEqual(later.missingTaxYears.map((t) => t.year), [2027], "solde de 2027-28 le 31 janvier 2029 : barème absent");
  assert.deepEqual(later.items.filter((x) => x.kind === "tax").map((x) => x.date), ["2028-07-31"], "second acompte de 2027-28, calculé sur 2026-27");
  assert.match(E.forecastCSV(f).split("\r\n").find((l) => l.startsWith("31/01/2027")), /\[eng\.uk\.flow\.tax\]/, "nature lisible dans l'export");
  const o = E.owed({ documents: docs, expenses: [], profile, rules: R, today: "2026-11-20" });
  const st = TAX.soleTrader({ profit: 40000, salary: 0, region: "ruk" }, R);
  assert.equal(o.tax.accrued, round2(st.total * 1), "bénéfice à date = bénéfice prévu");
  assert.equal(o.total, round2(st.total - 500));
  assert.equal(E.owed({ documents: docs, expenses: [], profile, rules: R, today: "2027-06-01" }).tax, null, "année 2027-28 : règles absentes");
  const mid = E.owed({ documents: docs, expenses: [], profile: { taxYears: { 2026: { expectedProfit: 80000 } } }, rules: R, today: "2026-11-20" });
  const st80 = TAX.soleTrader({ profit: 80000, salary: 0, region: "ruk" }, R);
  assert.equal(mid.tax.accrued, round2(st80.total * 40000 / 80000), "impôt de l'année au prorata du bénéfice déjà réalisé");
});

test("intérêts légaux de retard comme le calculateur public ; phrase de la relance d'un client professionnel", () => {
  const doc = invoice("c1", "2026-08-31", 1500, [["2026-10-01", 300]], { terms: 30 });
  const li = E.lateInterest(doc, [doc], "2026-11-20", R);
  assert.equal(li.due, "2026-09-30");
  assert.equal(li.from, "2026-10-01");
  assert.equal(li.days, 51);
  assert.equal(li.amount, 1200, "sur le reste dû");
  const ref = R.late_payment_reference_rates.find((r) => "2026-10-01" >= r.overdue_from && "2026-10-01" <= r.overdue_to);
  assert.equal(li.referenceRate, ref.bank_rate);
  const pub = TAX.latePayment(1200, 51, ref.bank_rate, R);
  assert.equal(li.interest, round2(pub.interest));
  assert.equal(li.compensation, pub.compensation);
  assert.equal(li.compensation, 70, "dette de 1 000 à 9 999,99 £");
  assert.equal(E.lateInterest(doc, [doc], "2026-09-30", R), null, "pas encore en retard");
  const paid = invoice("c1", "2026-08-31", 1500, [["2026-10-05", 1500]]);
  assert.equal(E.lateInterest(paid, [paid], "2026-11-20", R), null, "soldée");
  assert.equal(E.referenceRate("2027-02-01", R).known, false, "semestre sans taux publié : taux actuel, signalé");
  const h2 = R.late_payment_reference_rates.find((r) => r.overdue_from === "2025-07-01").bank_rate;
  assert.equal(E.referenceRate("2025-06-30", R).rate, h2, "échéance au 30 juin : exigible le 1er juillet, taux du second semestre");
  assert.notEqual(h2, R.late_payment_reference_rates.find((r) => r.overdue_from === "2025-01-01").bank_rate);
  const fmt = { money: (n) => "£" + n.toFixed(2), date: (d) => d, pct: (x) => x * 100 + "%" };
  const withI = E.email("reminder", doc, [doc], { name: "Sam", payment: "Sort code 00-00-00" }, "2026-11-20", fmt, { interest: true, rules: R });
  assert.match(withI.body, /\[eng\.uk\.mail\.lateInterest\]/);
  assert.match(withI.body, /\[eng\.uk\.mail\.payment\]/);
  assert.equal(withI.subject, "[eng.uk.mail.subjectLate]");
  const without = E.email("reminder", doc, [doc], { name: "Sam" }, "2026-11-20", fmt, {});
  assert.doesNotMatch(without.body, /lateInterest/);
  const soon = E.email("reminder", doc, [doc], {}, "2026-09-20", fmt, { interest: true, rules: R });
  assert.doesNotMatch(soon.body, /lateInterest/, "pas d'intérêts avant l'échéance");
  assert.equal(E.email("send", doc, [doc], { name: "Sam" }, "2026-11-20", fmt).subject, "[eng.uk.type.facture] " + doc.number + " – Sam");
});

test("règles britanniques lues par le moteur : présentes et cohérentes", () => {
  assert.deepEqual(Object.keys(R.uk_allowable_expenses), E.EXPENSE_BOXES, "aide de chaque case de dépenses (HS222)");
  assert.deepEqual(Object.keys(R.uk_sa103s_boxes.expenses), E.EXPENSE_BOXES);
  assert.equal(R.uk_mtd_itsa_update_periods.standard.length, 4);
  for (const start of Object.keys(R.uk_mtd_itsa_qualifying_income.income_year_for_start)) assert.ok(isFinite(R["mtd_itsa_threshold_" + start]), start);
});
