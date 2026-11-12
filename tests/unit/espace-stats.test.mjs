// Indicateurs des onglets de l'Espace (documentation/55-indicateurs-espace.md) : tableau de bord.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/espace-fr.js");
const S = require("../../src/assets/engines/espace-stats.js");
const me = { name: "Camille Martin EI" };
const clients = { c1: { id: "c1", name: "Studio Nova", pro: true }, c2: { id: "c2", name: "Atelier Kora", pro: true }, c3: { id: "c3", name: "Maison Bérard", pro: true } };
let seq = 0;
const issue = (docs, date, clientId, price, payments = []) => {
  const d = { id: "d" + (++seq), type: "facture", status: "draft", date, terms: 30, clientId, nature: "services",
    lines: [{ desc: "Prestation", qty: 1, price }], vat: { franchise: true, rate: 20, place: "fr" }, payments: [] };
  const r = E.issue(docs, d, me, clients[clientId], null, date + "T10:00:00Z");
  assert.deepEqual(r.errors, []);
  r.doc.payments = payments.map(([pd, amount], i) => ({ id: r.doc.id + "-p" + i, date: pd, amount, method: "virement" }));
  docs.push(r.doc);
  return r.doc;
};

test("même jour un an plus tôt et évolution en pourcentage", () => {
  assert.equal(S.lastYear("2026-11-12"), "2025-11-12");
  assert.equal(S.lastYear("2028-02-29"), "2027-02-28", "29 février");
  assert.equal(S.change(1200, 1000), 20);
  assert.equal(S.change(900, 1200), -25);
  assert.equal(S.change(1000, 3000), -66.7, "une décimale");
  assert.equal(S.change(500, 0), null, "pas de référence");
  assert.equal(S.change(500, -10), null);
});

test("encaissé de l'année et du mois comparé à la même date l'an dernier", () => {
  const docs = [];
  issue(docs, "2025-01-10", "c1", 1000, [["2025-01-20", 1000]]);
  issue(docs, "2025-11-02", "c1", 500, [["2025-11-10", 300], ["2025-11-13", 200]]); // le 13/11/2025 est après la même date
  issue(docs, "2025-12-01", "c2", 700, [["2025-12-05", 700]]);
  issue(docs, "2026-02-01", "c1", 900, [["2026-02-10", 900]]);
  issue(docs, "2026-11-01", "c3", 600, [["2026-11-05", 600], ["2026-11-12", 0.5]]);
  const t = S.toDate(docs, "2026-11-12");
  // 2026 : 900 + 600 + 0,5 ; 2025 jusqu'au 12/11 : 1 000 + 300.
  assert.deepEqual(t.year, { now: 1500.5, prev: 1300, change: 15.4 });
  assert.deepEqual(t.month, { now: 600.5, prev: 300, change: 100.2 });
  assert.deepEqual(S.toDate([], "2026-11-12").year, { now: 0, prev: 0, change: null });
});

test("encaissements des 12 derniers mois et du même mois un an plus tôt", () => {
  const docs = [];
  issue(docs, "2024-12-01", "c1", 400, [["2024-12-15", 400]]); // hors période
  issue(docs, "2025-01-10", "c1", 1000, [["2025-01-20", 1000]]);
  issue(docs, "2025-11-02", "c1", 500, [["2025-11-10", 300], ["2025-11-25", 200]]);
  issue(docs, "2025-12-01", "c2", 700, [["2025-12-05", 700]]);
  issue(docs, "2026-01-08", "c1", 900, [["2026-01-10", 900]]);
  issue(docs, "2026-11-01", "c3", 600, [["2026-11-05", 600]]);
  const m = S.monthly(docs, "2026-11-12");
  assert.equal(m.length, 12);
  assert.deepEqual(m.map((x) => x.key), ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
  assert.deepEqual(m[0], { key: "2025-12", label: "décembre 2025", amount: 700, prev: 400, current: false });
  assert.deepEqual([m[1].amount, m[1].prev], [900, 1000]);
  assert.deepEqual([m[11].amount, m[11].prev, m[11].current], [600, 500, true], "mois en cours : comparé au mois entier de l'an dernier");
  assert.deepEqual(S.monthly(docs, "2026-11-12", 3).map((x) => [x.key, x.amount, x.prev]), [["2026-09", 0, 0], ["2026-10", 0, 0], ["2026-11", 600, 500]]);
});

test("principaux clients par encaissements nets, part et reste", () => {
  const docs = [];
  issue(docs, "2026-01-05", "c1", 3000, [["2026-01-10", 3000]]);
  issue(docs, "2026-02-05", "c2", 1000, [["2026-02-10", 1000]]);
  const paid = issue(docs, "2026-03-05", "c3", 1000, [["2026-03-10", 1000]]);
  const av = E.issue(docs, E.creditFromInvoice(paid, "2026-03-20", "av1"), me, clients.c3, null, "2026-03-20T10:00:00Z").doc;
  av.payments = [{ id: "rb", date: "2026-03-25", amount: 1000, method: "virement" }];
  docs.push(av); // remboursé en entier : c3 à 0
  issue(docs, "2026-04-05", "c2", 500, [["2026-04-10", 500]]);
  issue(docs, "2025-04-05", "c3", 9000, [["2025-04-10", 9000]]); // hors période
  const t = S.topClients(docs, "2026-01-01", "2026-12-31", 1);
  assert.equal(t.total, 4500);
  assert.deepEqual(t.rows, [{ clientId: "c1", name: "Studio Nova", amount: 3000, share: 0.667 }]);
  assert.deepEqual(t.others, { count: 1, amount: 1500, share: 0.333 }, "client remboursé en entier : ni dans le classement ni dans le reste");
  assert.deepEqual(S.topClients(docs, "2026-01-01", "2026-12-31").rows.map((r) => [r.name, r.amount]), [["Studio Nova", 3000], ["Atelier Kora", 1500]]);
  const tie = [];
  issue(tie, "2026-01-05", "c1", 100, [["2026-01-10", 100]]);
  issue(tie, "2026-01-06", "c2", 100, [["2026-01-10", 100]]);
  assert.deepEqual(S.topClients(tie, "2026-01-01", "2026-12-31").rows.map((r) => r.name), ["Atelier Kora", "Studio Nova"], "égalité : ordre alphabétique");
  assert.deepEqual(S.topClients([], "2026-01-01", "2026-12-31"), { total: 0, rows: [], others: { count: 0, amount: 0, share: 0 } });
});

// ----- Documents et clients (documentation/55, § 2) -----

const quote = (docs, date, clientId, price, status, validity = 30) => {
  const d = { id: "q" + (++seq), type: "devis", status: "draft", date, validity, clientId, nature: "services",
    lines: [{ desc: "Devis", qty: 1, price }], vat: { franchise: true, rate: 20, place: "fr" }, payments: [] };
  const r = E.issue(docs, d, me, clients[clientId], null, date + "T10:00:00Z");
  assert.deepEqual(r.errors, []);
  if (status !== "sent") r.doc.status = status;
  docs.push(r.doc);
  return r.doc;
};

test("devis : signés, refusés, expirés, en attente et taux de signature", () => {
  const docs = [];
  quote(docs, "2025-09-01", "c1", 999, "accepted"); // hors des 12 mois
  quote(docs, "2026-01-10", "c1", 1000, "accepted");
  const inv = quote(docs, "2026-02-10", "c2", 2000, "accepted");
  inv.invoiceId = "f1"; // facturé : compte comme signé
  quote(docs, "2026-03-10", "c3", 500, "refused");
  quote(docs, "2026-09-01", "c1", 700, "sent", 30); // validité passée le 01/10 : expiré
  quote(docs, "2026-10-14", "c2", 400, "sent", 30); // validité le 13/11 : en attente
  quote(docs, "2026-11-01", "c2", 300, "sent", 30); // en attente
  const q = S.quotes(docs, "2025-11-12", "2026-11-12", "2026-11-12");
  assert.deepEqual(q, { signed: 2, refused: 1, expired: 1, pending: 2, pendingAmount: 700, signedAmount: 3000, rate: 0.5 });
  assert.equal(S.quotes([], "2025-11-12", "2026-11-12", "2026-11-12").rate, null, "aucun devis tranché");
  const edge = [];
  quote(edge, "2026-10-13", "c1", 100, "sent", 30); // validité le 12/11 : encore valable ce jour-là
  assert.deepEqual([S.quotes(edge, "2025-11-12", "2026-11-12", "2026-11-12").pending, S.quotes(edge, "2025-11-12", "2026-11-13", "2026-11-13").expired], [1, 1]);
});

test("documents : facturé HT du mois et de l'année, moyenne, avoirs", () => {
  const docs = [];
  issue(docs, "2025-12-20", "c1", 5000); // année précédente
  issue(docs, "2026-01-15", "c1", 1000);
  const big = issue(docs, "2026-06-15", "c2", 3000);
  issue(docs, "2026-11-02", "c3", 600);
  docs.push(E.issue(docs, Object.assign(E.creditFromInvoice(big, "2026-11-05", "av1"), { lines: [{ desc: "Remise", qty: 1, price: 200 }] }),
    me, clients.c2, null, "2026-11-05T10:00:00Z").doc);
  const d = S.documents(docs, "2026-11-12");
  assert.deepEqual([d.month, d.year, d.count, d.average, d.credits, d.creditCount], [400, 4400, 3, 1533.33, 200, 1]);
  assert.equal(S.invoiced(docs, "2026-01-01", "2026-12-31", "c2"), 2800, "par client : avoir déduit");
  assert.deepEqual(S.documents([], "2026-11-12").average, null);
});

test("facturé et encaissé par mois, pour tous les clients ou un seul", () => {
  const docs = [];
  issue(docs, "2026-09-10", "c1", 1000, [["2026-10-05", 1000]]);
  issue(docs, "2026-10-20", "c2", 400, [["2026-11-03", 150]]);
  issue(docs, "2026-11-10", "c1", 250);
  const m = S.invoicedMonthly(docs, "2026-11-12", 3);
  assert.deepEqual(m.map((x) => [x.key, x.invoiced, x.cashed, x.current]), [["2026-09", 1000, 0, false], ["2026-10", 400, 1000, false], ["2026-11", 250, 150, true]]);
  assert.deepEqual(S.invoicedMonthly(docs, "2026-11-12", 3, "c1").map((x) => [x.invoiced, x.cashed]), [[1000, 0], [0, 1000], [250, 0]]);
  assert.equal(S.invoicedMonthly(docs, "2026-11-12").length, 12);
});

test("clients : actifs, nouveaux de l'année, moyenne, parts du premier et des trois premiers", () => {
  const docs = [];
  issue(docs, "2025-03-01", "c1", 2000, [["2025-03-10", 2000]]); // c1 client depuis 2025
  issue(docs, "2026-02-01", "c1", 4000, [["2026-02-10", 4000]]);
  issue(docs, "2026-03-01", "c2", 3000, [["2026-03-10", 3000]]); // c2 nouveau en 2026
  issue(docs, "2026-04-01", "c3", 1000, [["2026-04-10", 1000]]); // c3 nouveau en 2026
  clients.c4 = { id: "c4", name: "Julie Fabre", pro: false };
  issue(docs, "2026-10-01", "c4", 2000); // c4 nouveau, rien encaissé : pas actif
  const c = S.clients(docs, "2026-11-12");
  assert.deepEqual(c, { active: 3, newThisYear: 3, average: 2666.67, total: 8000, top1: 0.5, top3: 1 });
  docs.find((d) => d.clientId === "c4").payments = [{ id: "p4", date: "2026-10-20", amount: 2000, method: "virement" }];
  assert.deepEqual(S.clients(docs, "2026-11-12"), { active: 4, newThisYear: 3, average: 2500, total: 10000, top1: 0.4, top3: 0.9 },
    "quatre clients actifs : le quatrième compte dans la moyenne");
  assert.deepEqual(S.clients([], "2026-11-12"), { active: 0, newThisYear: 0, average: null, total: 0, top1: null, top3: null });
});

test("fiche d'un client : facturé, encaissé sur 12 mois, reste, retard, délais, dernière facture", () => {
  const docs = [];
  issue(docs, "2025-01-10", "c1", 1000, [["2025-02-19", 1000]]); // 40 jours, 10 de retard ; hors 12 mois
  issue(docs, "2026-05-01", "c1", 2000, [["2026-05-21", 2000]]); // 20 jours, à l'heure
  issue(docs, "2026-09-01", "c1", 500, [["2026-09-15", 100]]); // en retard depuis le 01/10 : reste 400
  issue(docs, "2026-11-01", "c1", 300); // pas échue
  issue(docs, "2026-11-02", "c2", 9999, [["2026-11-03", 9999]]); // autre client
  const f = S.clientDetail(docs, "c1", "2026-11-12");
  assert.deepEqual(f, { invoiced: 3800, cashed12: 2100, due: 700, late: 400, avgDays: 30, avgLate: 5, paidCount: 2, lastInvoice: "2026-11-01" });
  assert.equal(S.clientDetail(docs.slice().reverse(), "c1", "2026-11-12").lastInvoice, "2026-11-01", "dernière facture quel que soit l'ordre");
  assert.deepEqual(S.clientDetail(docs, "zz", "2026-11-12"), { invoiced: 0, cashed12: 0, due: 0, late: 0, avgDays: null, avgLate: null, paidCount: 0, lastInvoice: null });
});
