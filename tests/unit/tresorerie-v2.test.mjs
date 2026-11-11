// Trésorerie v2 (documentation/39-tresorerie.md, § 7) : mouvements ponctuels et entrées, chiffre d'affaires prévu,
// scénario prudent, horizon, courbe du solde, versement possible, délais de paiement, ancienneté des créances,
// historique des flux, charges mensuelles, autonomie, point mort, devis à facturer, export CSV.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/espace-fr.js");
const R = ruleValues("fr");
const CAL = JSON.parse(readFileSync(new URL("../../data/calendars/fr.json", import.meta.url))).events;
const me = { name: "Camille Martin EI" };
const clients = { c1: { id: "c1", name: "Studio Nova", pro: true }, c2: { id: "c2", name: "Atelier Kora", pro: true } };
const T = "2026-10-20";
let seq = 0;
const doc = (over) => Object.assign({ id: "d" + (++seq), type: "facture", status: "draft", date: "2026-10-01", terms: 30, clientId: "c1",
  nature: "services", lines: [{ desc: "Prestation", qty: 1, price: 1000 }], vat: { franchise: true, rate: 20, place: "fr" }, payments: [] }, over);
const issue = (docs, over, payments = []) => {
  const d = doc(over);
  const r = E.issue(docs, d, me, clients[d.clientId], null, d.date + "T10:00:00Z");
  assert.deepEqual(r.errors, []);
  r.doc.payments = payments.map((p, i) => Object.assign({ id: r.doc.id + "-p" + i, method: "virement" }, p));
  docs.push(r.doc);
  return r.doc;
};
const micro = { activity: "liberal_bnc", vatRegime: "franchise", periodicity: "quarterly", startDate: "2025-01-01", acre: 0, vl: false };
const input = (over) => Object.assign({ documents: [], charges: [], profile: micro, rules: R, events: CAL, today: T, months: 6 }, over);
const withCash = (p, cash) => Object.assign({}, p, { cashBalance: cash, cashDate: T });

test("mouvements ponctuels et entrées prévues : dates, contrôles, sens dans la prévision", () => {
  const once = { label: "Ordinateur", amount: 1500, every: "once", start: "2026-12-03" };
  assert.deepEqual(E.chargeDates(once, T, "2027-03-31"), ["2026-12-03"]);
  assert.deepEqual(E.chargeDates(once, "2026-12-04", "2027-03-31"), [], "date passée : rien");
  assert.deepEqual(E.chargeDates(once, T, "2026-12-02"), [], "au-delà de l'horizon : rien");
  assert.deepEqual(E.chargeDates(once, "2026-12-03", "2026-12-03"), ["2026-12-03"], "bornes comprises");
  assert.deepEqual(E.chargeDates(Object.assign({}, once, { start: "2026-02-30" }), T, "2027-03-31"), [], "date impossible");
  assert.deepEqual(E.chargeErrors(Object.assign({}, once, { end: "2026-01-01" })), [], "ponctuel : la dernière échéance ne compte pas");
  assert.deepEqual(E.chargeErrors(Object.assign({}, once, { start: "" })).map((e) => [e.field, e.message]), [["start", "Indiquez la date du mouvement."]]);
  assert.deepEqual(E.chargeErrors(Object.assign({}, once, { flow: "up" })).map((e) => e.field), ["flow"]);
  assert.deepEqual(E.chargeErrors(Object.assign({}, once, { flow: "in" })), []);
  assert.deepEqual(E.chargeErrors(Object.assign({}, once, { flow: "out" })), []);
  assert.deepEqual(E.chargeErrors(Object.assign({}, once, { every: "weekly" })).map((e) => e.field), ["every"]);
  assert.equal(E.CHARGE_LABELS.once, "Une seule fois");
  const f = E.forecast(input({ charges: [once, { id: "x", label: "Subvention", amount: 800, every: "once", start: "2026-11-10", flow: "in" }],
    profile: withCash(micro, 1000) }));
  assert.deepEqual(f.items.map((x) => [x.date, x.kind, x.amount]), [["2026-11-10", "planned", 800], ["2026-12-03", "charge", -1500]]);
  assert.deepEqual(f.months.slice(0, 3).map((m) => m.balance), [1000, 1800, 300]);
  assert.deepEqual(f.items.filter((x) => x.kind === "urssaf"), [], "entrée qui n'est pas du chiffre d'affaires : pas de cotisations");
});

test("chiffre d'affaires prévu : cotisations à la date de la déclaration, TVA du réel normal le mois suivant", () => {
  const rev = { id: "r", label: "Mission", amount: 1000, every: "once", start: "2026-11-15", flow: "in", revenue: true };
  const f = E.forecast(input({ charges: [rev] }));
  // 4e trimestre 2026 : 1 000 × (25,6 % + 0,2 %) = 258, le 01/02/2027.
  assert.deepEqual(f.items.map((x) => [x.date, x.kind, x.amount]), [["2026-11-15", "planned", 1000], ["2027-02-01", "urssaf", -258]]);
  const monthly = E.forecast(input({ charges: [Object.assign({}, rev, { every: "month", start: "2026-11-15", end: "2027-01-15" })] }));
  // Novembre et décembre au 4e trimestre (2 000 → 516), janvier au 1er trimestre 2027 (date limite le 30/04, hors horizon).
  assert.deepEqual(monthly.items.filter((x) => x.kind === "urssaf").map((x) => [x.date, x.amount]), [["2027-02-01", -516]]);
  const real = { activity: "real", vatRegime: "normal", vatRate: 20 };
  const vat = E.forecast(input({ charges: [Object.assign({}, rev, { amount: 1200 })], profile: real }));
  // 1 200 TTC à 20 % : 200 de TVA, déclarée et payée le 15/12 (CA3 de novembre).
  assert.deepEqual(vat.items.filter((x) => x.kind === "vat").map((x) => [x.date, x.amount]), [["2026-12-15", -200]]);
  const vat55 = E.forecast(input({ charges: [Object.assign({}, rev, { amount: 1055 })], profile: Object.assign({}, real, { vatRate: 5.5 }) }));
  assert.deepEqual(vat55.items.filter((x) => x.kind === "vat").map((x) => x.amount), [-55], "taux du profil : 1 055 TTC à 5,5 %");
  const mixed = Object.assign({}, micro, { activity: "vente", activity2: "services_bic" });
  const fm = E.forecast(input({ charges: [rev], profile: mixed }));
  // Activité mixte : rattaché à l'activité principale (vente : 12,3 % + 0,1 % de formation, le plus élevé des deux taux).
  assert.deepEqual(fm.items.filter((x) => x.kind === "urssaf").map((x) => x.amount), [-124]);
});

test("horizon de 1 à 12 mois", () => {
  assert.equal(E.forecast(input({ months: 12 })).months.length, 12);
  assert.equal(E.forecast(input({ months: 12 })).until, "2027-09-30");
  assert.equal(E.forecast(input({ months: 24 })).months.length, 12, "plafonné à 12");
  assert.equal(E.forecast(input({ months: 0 })).months.length, 6, "illisible : 6 par défaut");
  assert.equal(E.forecast(input({ months: "abc" })).months.length, 6);
  assert.equal(E.forecast(input({ months: 3 })).months.length, 3);
});

test("délais de paiement : délai moyen, retard moyen, part à l'heure, par client", () => {
  const docs = [];
  issue(docs, { date: "2026-03-01" }, [{ date: "2026-03-21", amount: 1000 }]); // 20 jours, à l'heure
  issue(docs, { date: "2026-04-01" }, [{ date: "2026-04-10", amount: 400 }, { date: "2026-05-16", amount: 600 }]); // 45 jours, 15 de retard
  issue(docs, { date: "2026-05-01", clientId: "c2" }, [{ date: "2026-06-30", amount: 1000 }]); // 60 jours, 30 de retard
  issue(docs, { date: "2026-06-01" }, [{ date: "2026-06-10", amount: 300 }]); // partielle : exclue
  issue(docs, { date: "2025-01-01" }, [{ date: "2025-01-15", amount: 1000 }]); // hors période
  const cancelled = issue(docs, { date: "2026-07-01" });
  docs.push(E.issue(docs, E.creditFromInvoice(cancelled, "2026-07-02", "av1"), me, clients.c1, null, "2026-07-02T10:00:00Z").doc); // annulée : exclue
  const s = E.paymentStats(docs, "2025-10-20", T);
  assert.deepEqual([s.count, s.avgDays, s.avgLate, s.onTime], [3, 41.7, 15, 0.33]);
  assert.deepEqual(s.byClient.c1, { count: 2, avgDays: 32.5, avgLate: 7.5, onTime: 0.5 });
  assert.deepEqual(s.byClient.c2, { count: 1, avgDays: 60, avgLate: 30, onTime: 0 });
  const oneDay = [];
  issue(oneDay, { date: "2026-03-01" }, [{ date: "2026-04-01", amount: 1000 }]); // échéance 31/03 : 1 jour de retard
  assert.deepEqual([E.paymentStats(oneDay, "2025-10-20", T).avgLate, E.paymentStats(oneDay, "2025-10-20", T).onTime], [1, 0], "un jour de retard : pas à l'heure");
  const none = E.paymentStats([], "2025-10-20", T);
  assert.deepEqual([none.count, none.avgDays, none.avgLate, none.onTime], [0, null, null, null]);
});

test("scénario prudent : factures en retard retirées, autres décalées du retard moyen du client", () => {
  const docs = [];
  issue(docs, { date: "2026-04-01" }, [{ date: "2026-05-11", amount: 1000 }]); // c1 : 10 jours de retard
  issue(docs, { date: "2026-04-01", clientId: "c2" }, [{ date: "2026-05-21", amount: 1000 }]); // c2 : 20 jours de retard
  const late = issue(docs, { date: "2026-09-01", lines: [{ desc: "En retard", qty: 1, price: 700 }] }); // échue le 01/10
  const next = issue(docs, { date: "2026-10-10", lines: [{ desc: "Site", qty: 1, price: 2000 }] }); // échéance 09/11
  const prevu = E.forecast(input({ documents: docs, profile: withCash(micro, 0) }));
  assert.deepEqual(prevu.items.filter((x) => x.kind === "receipt").map((x) => [x.docId, x.date]), [[late.id, T], [next.id, "2026-11-09"]]);
  const prudent = E.forecast(input({ documents: docs, profile: withCash(micro, 0), scenario: "prudent" }));
  assert.equal(prudent.scenario, "prudent");
  assert.deepEqual(prudent.items.filter((x) => x.kind === "receipt").map((x) => [x.docId, x.date, x.delay]), [[next.id, "2026-11-19", 10]]);
  // Cotisations du 4e trimestre recalculées sans la facture en retard : 2 000 × 25,8 % = 516 (au lieu de 2 700 × 25,8 %).
  assert.deepEqual(prudent.items.filter((x) => x.kind === "urssaf").map((x) => x.amount), [-516]);
  assert.deepEqual(prevu.items.filter((x) => x.kind === "urssaf").map((x) => x.amount), [-696.6]);
  // Client sans historique : retard moyen de tous les clients (15 jours).
  const other = [];
  issue(other, { date: "2026-04-01" }, [{ date: "2026-05-11", amount: 1000 }]);
  issue(other, { date: "2026-04-01", clientId: "c2" }, [{ date: "2026-05-21", amount: 1000 }]);
  clients.c3 = { id: "c3", name: "Nouveau client", pro: true };
  const fresh = issue(other, { date: "2026-10-15", clientId: "c3" });
  assert.deepEqual(E.forecast(input({ documents: other, scenario: "prudent" })).items.filter((x) => x.docId === fresh.id).map((x) => [x.date, x.delay]),
    [["2026-11-29", 15]]);
  const shifted = [];
  issue(shifted, { date: "2026-04-01" }, [{ date: "2026-05-31", amount: 1000 }]); // 30 jours de retard
  issue(shifted, { date: "2026-12-30" }); // échéance 29/01/2027 + 30 jours : au-delà d'un horizon de 3 mois
  assert.deepEqual(E.forecast(input({ documents: shifted, months: 3, scenario: "prudent" })).items.filter((x) => x.kind === "receipt"), [],
    "décalée au-delà de l'horizon : sort de la prévision");
  // Avoir à rembourser : sortie aujourd'hui dans les deux scénarios (jamais décalé).
  const refund = [];
  issue(refund, { date: "2026-04-01" }, [{ date: "2026-05-11", amount: 1000 }]); // 10 jours de retard
  const paid = issue(refund, { date: "2026-10-01" }, [{ date: "2026-10-02", amount: 1000 }]);
  const av = E.issue(refund, E.creditFromInvoice(paid, "2026-10-05", "av9"), me, clients.c1, null, "2026-10-05T10:00:00Z").doc;
  refund.push(av);
  assert.deepEqual(E.forecast(input({ documents: refund, scenario: "prudent" })).items.filter((x) => x.kind === "refund").map((x) => [x.date, x.amount]), [[T, -1000]]);
});

test("courbe du solde, point bas, versement possible", () => {
  const f = E.forecast(input({ profile: withCash(micro, 1000), charges: [
    { id: "a", label: "Loyer", amount: 600, every: "month", start: "2026-11-05" },
    { id: "b", label: "Prime", amount: 900, every: "once", start: "2026-11-05", flow: "in" },
    { id: "c", label: "Matériel", amount: 1200, every: "once", start: "2026-11-20" }], months: 3 }));
  const c = E.balanceCurve(f);
  // 1 000 ; 05/11 : −600 + 900 (un seul point) ; 20/11 : −1 200 ; 05/12 : −600.
  assert.deepEqual(c.points, [{ date: T, balance: 1000 }, { date: "2026-11-05", balance: 1300 }, { date: "2026-11-20", balance: 100 }, { date: "2026-12-05", balance: -500 }]);
  assert.deepEqual([c.low, c.end], [{ date: "2026-12-05", balance: -500 }, -500]);
  assert.equal(E.safeAmount(c, 0), 0, "point bas négatif : rien à verser");
  const up = E.balanceCurve(E.forecast(input({ profile: withCash(micro, 5000), charges: [{ id: "a", label: "Loyer", amount: 600, every: "month", start: "2026-11-05" }], months: 3 })));
  // Horizon de 3 mois (octobre à décembre) : loyers du 05/11 et du 05/12.
  assert.deepEqual(up.low, { date: "2026-12-05", balance: 3800 });
  assert.equal(E.safeAmount(up, 1000), 2800, "point bas − seuil");
  assert.equal(E.safeAmount(up, 5000), 0, "seuil au-dessus du point bas : 0");
  assert.equal(E.safeAmount(up, -100), 3800, "seuil négatif ignoré");
  assert.equal(E.safeAmount(null, 0), null);
  assert.equal(E.balanceCurve(E.forecast(input({}))), null, "sans solde saisi");
  const flat = E.balanceCurve(E.forecast(input({ profile: withCash(micro, 50) })));
  assert.deepEqual([flat.points.length, flat.low, flat.end], [1, { date: T, balance: 50 }, 50], "aucun mouvement : le solde d'aujourd'hui");
  const twice = E.balanceCurve(E.forecast(input({ profile: withCash(micro, 100), charges: [
    { id: "a", label: "A", amount: 100, every: "once", start: "2026-11-05" }, { id: "b", label: "B", amount: 100, every: "once", start: "2026-11-06" }] })));
  assert.deepEqual(twice.low, { date: "2026-11-06", balance: -100 });
  const tie = E.balanceCurve(E.forecast(input({ profile: withCash(micro, 100), charges: [
    { id: "a", label: "A", amount: 100, every: "once", start: "2026-11-05" }, { id: "b", label: "B", amount: 100, every: "once", start: "2026-11-06", flow: "in" },
    { id: "c", label: "C", amount: 100, every: "once", start: "2026-11-07" }] })));
  assert.deepEqual(tie.low, { date: "2026-11-05", balance: 0 }, "point bas atteint deux fois : le premier");
});

test("ancienneté des créances par tranche de retard", () => {
  const docs = [];
  const make = (date, price, payments) => issue(docs, { date, lines: [{ desc: "F", qty: 1, price }] }, payments);
  make("2026-05-24", 500); // 23/06 : 119 jours
  make("2026-07-07", 400); // 06/08 : 75 jours
  make("2026-08-06", 300, [{ date: "2026-09-01", amount: 50 }]); // 05/09 : 45 jours, reste 250
  make("2026-09-10", 200); // 10/10 : 10 jours
  make("2026-10-01", 100); // échéance 31/10 : pas échue
  make("2026-10-02", 600, [{ date: "2026-10-05", amount: 600 }]); // payée
  make("2026-10-10", 100, [{ date: "2026-10-12", amount: 30 }]); // partielle, pas échue : reste 70
  const a = E.aging(docs, T);
  assert.deepEqual(a.buckets.map((b) => [b.key, b.amount, b.count]), [["notDue", 170, 2], ["d30", 200, 1], ["d60", 250, 1], ["d90", 400, 1], ["more", 500, 1]]);
  assert.deepEqual([a.total, a.late, a.lateCount], [1520, 1350, 4]);
  assert.deepEqual(a.items.map((x) => [x.lateDays, x.bucket]), [[119, "more"], [75, "d90"], [45, "d60"], [10, "d30"], [0, "notDue"], [0, "notDue"]]);
  const edges = [];
  issue(edges, { date: "2026-08-20", terms: 30 }); // 19/09 : 31 jours
  issue(edges, { date: "2026-08-21", terms: 30 }); // échéance 20/09 : 30 jours
  issue(edges, { date: "2026-09-20", terms: 29 }); // 19/10 : 1 jour
  issue(edges, { date: "2026-09-21", terms: 29 }); // 20/10 : échue aujourd'hui, pas en retard
  assert.deepEqual(E.aging(edges, T).buckets.map((b) => b.count), [1, 2, 1, 0, 0], "bornes : 0, 1 et 30 jours, 31 jours");
  assert.deepEqual(E.aging([], T).total, 0);
});

test("historique des flux par mois : encaissements nets et dépenses", () => {
  const docs = [];
  const paid = issue(docs, { date: "2026-08-01" }, [{ date: "2026-08-20", amount: 1000 }]);
  issue(docs, { date: "2026-09-01" }, [{ date: "2026-09-05", amount: 300 }, { date: "2026-10-02", amount: 700 }]);
  const credit = E.issue(docs, Object.assign(E.creditFromInvoice(paid, "2026-09-10", "av1"), { lines: [{ desc: "Remise", qty: 1, price: 100 }] }),
    me, clients.c1, null, "2026-09-10T10:00:00Z").doc;
  credit.payments = [{ id: "rb", date: "2026-09-12", amount: 100, method: "virement" }];
  docs.push(credit);
  const expenses = [{ id: "e1", date: "2026-08-03", supplier: "A", amount: 50, method: "carte" }, { id: "e2", date: "2026-09-30", supplier: "B", amount: 20.5, method: "carte" },
    { id: "e3", date: "2026-07-31", supplier: "C", amount: 999, method: "carte" }];
  assert.deepEqual(E.cashHistory(docs, expenses, "2026-08-01", "2026-10-15").map((m) => [m.key, m.in, m.out, m.net]),
    [["2026-08", 1000, 50, 950], ["2026-09", 200, 20.5, 179.5], ["2026-10", 700, 0, 700]]);
  assert.deepEqual(E.cashHistory(docs, expenses, "2026-08-15", "2026-08-31").map((m) => [m.key, m.in, m.out]), [["2026-08", 1000, 0]], "bornes de la période respectées");
  assert.equal(E.cashHistory([], [], "2026-01-01", "2026-12-31").length, 12);
});

test("charges mensuelles, autonomie, point mort, devis à facturer", () => {
  const charges = [{ label: "Logiciel", amount: 100, every: "month", start: "2026-01-01" }, { label: "Comptable", amount: 300, every: "quarter", start: "2026-01-01" },
    { label: "Assurance", amount: 1200, every: "year", start: "2026-01-01" }, { label: "Ancien", amount: 999, every: "month", start: "2025-01-01", end: "2026-01-01" },
    { label: "Ordinateur", amount: 2000, every: "once", start: "2026-11-01" }, { label: "Mission", amount: 3000, every: "month", start: "2026-11-01", flow: "in" },
    { label: "Fin ce jour", amount: 50, every: "month", start: "2026-01-20", end: T }];
  assert.equal(E.monthlyCharges(charges, T), 350, "100 + 300/3 + 1 200/12 + 50 (se termine aujourd'hui)");
  assert.equal(E.monthlyCharges([], T), 0);
  assert.equal(E.runway(1000, 300), 3.3);
  assert.equal(E.runway(1000, 281), 3.5, "3,56 : arrondi à la décimale inférieure (prudent)");
  assert.equal(E.runway(-50, 300), 0);
  assert.equal(E.runway(1000, 0), null);
  assert.equal(E.runway(null, 300), null);
  // Point mort : 300 / (1 − 25,8 %) = 404,3 → 405.
  assert.equal(E.breakEven(300, micro, R, T), 405);
  assert.equal(E.breakEven(300, Object.assign({}, micro, { vl: true }), R, T), 417, "versement libératoire : 300 / (1 − 28 %) = 416,67 → 417");
  assert.equal(E.breakEven(300, { activity: "real", vatRegime: "normal" }, R, T), null, "hors micro-entreprise");
  assert.equal(E.breakEven(0, micro, R, T), null, "sans charges");
});

test("devis à facturer et export CSV de la prévision", () => {
  const docs = [];
  const q1 = E.issue(docs, doc({ type: "devis", validity: 30, lines: [{ desc: "A", qty: 1, price: 1500 }] }), me, clients.c1, null, "2026-10-01T10:00:00Z").doc;
  q1.status = "accepted"; docs.push(q1);
  const q2 = E.issue(docs, doc({ type: "devis", date: "2026-10-02", validity: 30, lines: [{ desc: "B", qty: 1, price: 500 }] }), me, clients.c1, null, "2026-10-02T10:00:00Z").doc;
  q2.status = "accepted"; q2.invoiceId = "f1"; docs.push(q2);
  const q3 = E.issue(docs, doc({ type: "devis", date: "2026-10-03", validity: 30, lines: [{ desc: "C", qty: 1, price: 700 }] }), me, clients.c1, null, "2026-10-03T10:00:00Z").doc;
  docs.push(q3);
  assert.deepEqual(E.quotesToInvoice(docs), { count: 1, amount: 1500 });
  const f = E.forecast(input({ profile: withCash(micro, 100.5), charges: [{ id: "a", label: 'Loyer "bureau"', amount: 50, every: "once", start: "2026-11-02" },
    { id: "b", label: "Prime", amount: 20, every: "once", start: "2026-11-03", flow: "in" }], months: 2 }));
  assert.equal(E.forecastCSV(f), ["Date;Nature;Libellé;Montant;Solde prévu", '20/10/2026;"Solde du compte";"";;100,50',
    '02/11/2026;"Charge";"Loyer ""bureau""";-50,00;50,50', '03/11/2026;"Entrée prévue";"Prime";20,00;70,50'].join("\r\n"));
  const noCash = E.forecast(input({ charges: [{ id: "a", label: "Loyer", amount: 50, every: "once", start: "2026-11-02" }], months: 2 }));
  assert.equal(E.forecastCSV(noCash), 'Date;Nature;Libellé;Montant;Solde prévu\r\n02/11/2026;"Charge";"Loyer";-50,00;');
});
