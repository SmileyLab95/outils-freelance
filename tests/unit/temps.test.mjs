// Temps passé de l'Espace (documentation/37-temps-passe.md) : lecture des durées, contrôle de la saisie, états (à
// facturer, brouillon, facturé), dernier taux, totaux, lignes de facture par tâche ou par saisie, export CSV ; unité des
// lignes dans la facture et dans le Factur-X.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/espace-fr.js");
const INV = require("../../src/assets/engines/invoice-fr.js");
const FX = require("../../src/assets/engines/facturx-fr.js");
const R = ruleValues("fr");
const NB = " ";
const t = (over) => Object.assign({ id: "t1", date: "2026-10-12", clientId: "c1", task: "Maquettes de la page d'accueil", unit: "hour", quantity: 2,
  rate: 60, billable: true, createdAt: "2026-10-12T09:00:00Z" }, over);

test("durées en heures : décimales, 1h30, 1 h 30, 1:30, minutes ; arrondi au centième", () => {
  const cases = { "1,5": 1.5, "1.5": 1.5, "2": 2, "1,5 h": 1.5, "3 heures": 3, "1h30": 1.5, "1 h 30": 1.5, "1H30": 1.5, "1h": 1, "0h45": 0.75,
    "1h30min": 1.5, "1:30": 1.5, "0:05": 0.08, "45 min": 0.75, "90mn": 1.5, "1h10": 1.17, " 2  h ": 2, "0,333": 0.33 };
  for (const [text, hours] of Object.entries(cases)) assert.equal(E.parseDuration(text, "hour"), hours, text);
  for (const text of ["", "abc", "1:3", "1h75", "1:60", "-1", "1,5 j", "1 h 30 h", "1..5", null, undefined]) {
    assert.ok(Number.isNaN(E.parseDuration(text, "hour")), String(text));
  }
  assert.ok(Number.isNaN(E.parseDuration("1", "week")), "unité inconnue");
});

test("durées en jours : 1, 0,5, « jour(s) », « j » ; pas d'heures", () => {
  const cases = { "1": 1, "0,5": 0.5, "0.5 j": 0.5, "1 jour": 1, "2 jours": 2, "0,25": 0.25 };
  for (const [text, days] of Object.entries(cases)) assert.equal(E.parseDuration(text, "day"), days, text);
  for (const text of ["1h", "1:30", "45 min", "demi"]) assert.ok(Number.isNaN(E.parseDuration(text, "day")), text);
});

test("durées lisibles : « 1 h 05 », « 45 min », « 0,5 jour », « 2 jours » (espaces insécables)", () => {
  assert.equal(E.durationLabel(1.5, "hour"), `1${NB}h${NB}30`);
  assert.equal(E.durationLabel(1.08, "hour"), `1${NB}h${NB}05`);
  assert.equal(E.durationLabel(1.17, "hour"), `1${NB}h${NB}10`, "1 h 10 enregistrée 1,17 h : relue 1 h 10");
  assert.equal(E.durationLabel(3, "hour"), `3${NB}h`);
  assert.equal(E.durationLabel(0.75, "hour"), `45${NB}min`);
  assert.equal(E.durationLabel(12.5, "hour"), `12${NB}h${NB}30`);
  assert.equal(E.durationLabel(0.5, "day"), `0,5${NB}jour`);
  assert.equal(E.durationLabel(1.5, "day"), `1,5${NB}jour`, "singulier en dessous de 2");
  assert.equal(E.durationLabel(2, "day"), `2${NB}jours`);
  assert.equal(E.durationLabel(NaN, "hour"), "");
});

test("contrôle de la saisie : date, tâche, unité, durée (24 h ou 1 jour au plus), client si facturable, taux", () => {
  assert.deepEqual(E.checkTime(t()), []);
  assert.deepEqual(E.checkTime({ date: "", task: " ", unit: "hour", quantity: NaN, clientId: "" }),
    ["Indiquez la date.", "Indiquez la tâche.", "Indiquez la durée : par exemple 1,5 ou 1h30.",
     "Choisissez le client, ou décochez « Facturable » pour un temps interne."]);
  assert.deepEqual(E.checkTime(t({ unit: "day", quantity: 0 })), ["Indiquez la durée en jours : par exemple 1 ou 0,5."]);
  assert.deepEqual(E.checkTime(t({ unit: "week" })), ["Choisissez l'unité : heures ou jours."]);
  assert.deepEqual(E.checkTime(t({ quantity: 24 })), []);
  assert.deepEqual(E.checkTime(t({ quantity: 24.25 })), ["Une saisie compte 24 heures au plus : saisissez chaque jour séparément."]);
  assert.deepEqual(E.checkTime(t({ unit: "day", quantity: 1 })), []);
  assert.deepEqual(E.checkTime(t({ unit: "day", quantity: 1.5 })), ["Une saisie compte une journée au plus : saisissez chaque jour séparément."]);
  assert.deepEqual(E.checkTime(t({ clientId: "", billable: false })), [], "temps interne sans client");
  for (const rate of [null, undefined, "", 0, 45.5]) assert.deepEqual(E.checkTime(t({ rate })), [], String(rate));
  for (const rate of [-1, NaN, "abc"]) assert.deepEqual(E.checkTime(t({ rate })), ["Le taux doit être un montant positif."], String(rate));
  assert.deepEqual(E.checkTime(t({ date: "12/10/2026" })), ["Indiquez la date."]);
  assert.deepEqual(E.timeErrors({ date: "", task: "", unit: "day", quantity: 2, clientId: "", rate: -1 }).map((e) => e.field),
    ["date", "task", "duration", "clientId", "rate"], "champ de chaque erreur, pour le signaler à l'écran");
  assert.deepEqual(E.timeErrors(t({ unit: "" })).map((e) => e.field), ["unit"]);
  assert.deepEqual(E.timeErrors(t({ unit: "constructor" })).map((e) => e.field), ["unit"], "nom hérité d'un objet : pas une unité");
});

test("états : non facturable, à facturer, dans un brouillon, facturé ; brouillon supprimé : de nouveau à facturer", () => {
  const docs = [{ id: "d1", status: "draft" }, { id: "f1", status: "issued" }, { id: "f2", status: "paid" }];
  assert.equal(E.timeState(t({ billable: false, invoiceId: "f1" }), docs), "internal");
  assert.equal(E.timeState(t(), docs), "unbilled");
  assert.equal(E.timeState(t({ invoiceId: "d1" }), docs), "draft");
  assert.equal(E.timeState(t({ invoiceId: "f1" }), docs), "invoiced");
  assert.equal(E.timeState(t({ invoiceId: "f2" }), docs), "invoiced");
  assert.equal(E.timeState(t({ invoiceId: "gone" }), docs), "unbilled", "document supprimé");
  assert.equal(E.timeState(t({ invoiceId: "d1" }), undefined), "unbilled");
  assert.equal(E.timeState(t({ billable: undefined }), docs), "unbilled", "facturable par défaut");
});

test("dernier taux du client et de l'unité (date, puis ordre de saisie) ; aucun : null", () => {
  const list = [t({ id: "a", rate: 50, date: "2026-10-01" }), t({ id: "b", rate: 70, date: "2026-10-20", createdAt: "2026-10-20T08:00:00Z" }),
    t({ id: "c", rate: 65, date: "2026-10-20", createdAt: "2026-10-20T07:00:00Z" }), t({ id: "d", rate: null, date: "2026-10-25" }),
    t({ id: "e", unit: "day", rate: 450, date: "2026-10-26" }), t({ id: "f", clientId: "c2", rate: 90, date: "2026-10-27" }), null];
  assert.equal(E.lastRate(list, "c1", "hour"), 70);
  assert.equal(E.lastRate(list, "c1", "day"), 450);
  assert.equal(E.lastRate(list, "c2", "hour"), 90);
  assert.equal(E.lastRate(list, "c3", "hour"), null);
  assert.equal(E.lastRate(list, "", "hour"), null, "sans client");
  assert.equal(E.lastRate([t({ rate: 0 })], "c1", "hour"), 0, "taux nul gardé");
});

test("lignes par tâche : tâche, unité et taux identiques regroupés, période, ordre de la première date", () => {
  const list = [t({ id: "a", date: "2026-10-16", quantity: 1.5 }), t({ id: "b", date: "2026-10-12", quantity: 2.25, task: "  maquettes de la page d'accueil " }),
    t({ id: "c", date: "2026-10-14", task: "Intégration", quantity: 3, rate: 60 }), t({ id: "d", date: "2026-10-13", task: "Intégration", quantity: 1, rate: 80 }),
    t({ id: "e", date: "2026-10-15", task: "Atelier", unit: "day", quantity: 0.5, rate: 450 }), t({ id: "f", date: "2026-10-17", task: "Recette", rate: null, quantity: 0.33 })];
  const lines = E.timeInvoiceLines(list, "task");
  assert.deepEqual(lines, [
    { desc: "maquettes de la page d'accueil — du 12/10/2026 au 16/10/2026", qty: 3.75, unit: "hour", price: 60 },
    { desc: "Intégration — 13/10/2026", qty: 1, unit: "hour", price: 80 },
    { desc: "Intégration — 14/10/2026", qty: 3, unit: "hour", price: 60 },
    { desc: "Atelier — 15/10/2026", qty: 0.5, unit: "day", price: 450 },
    { desc: "Recette — 17/10/2026", qty: 0.33, unit: "hour", price: NaN }]);
  assert.deepEqual(E.timeInvoiceLines([t({ quantity: 0.1 }), t({ id: "z", quantity: 0.2 })], "task")[0].qty, 0.3, "somme arrondie au centième");
  assert.deepEqual(E.timeInvoiceLines([t({ task: "Conseil", rate: null }), t({ id: "z", task: "Conseil", unit: "day", quantity: 1, rate: null })], "task")
    .map((l) => [l.qty, l.unit]), [[2, "hour"], [1, "day"]], "même tâche, même taux, unités différentes : deux lignes");
  assert.deepEqual(E.timeInvoiceLines(undefined, "task"), []);
});

test("lignes par saisie : « tâche — date », dans l'ordre chronologique ; date de la prestation = dernière saisie", () => {
  const list = [t({ id: "b", date: "2026-10-14", quantity: 1 }), t({ id: "a", date: "2026-10-12", unit: "day", quantity: 1, rate: 450 })];
  assert.deepEqual(E.timeInvoiceLines(list, "entry"), [
    { desc: "Maquettes de la page d'accueil — 12/10/2026", qty: 1, unit: "day", price: 450 },
    { desc: "Maquettes de la page d'accueil — 14/10/2026", qty: 1, unit: "hour", price: 60 }]);
  assert.deepEqual(E.timeInvoice(list, "entry").serviceDate, "2026-10-14");
  assert.deepEqual(E.timeInvoice([], "task"), { lines: [], serviceDate: "" });
});

test("totaux d'une période : heures, jours, part facturable, montant, taux manquants ; le plus récent en haut", () => {
  const docs = [{ id: "f1", status: "issued" }];
  const list = [t({ id: "a", date: "2026-10-01", quantity: 1.5 }), t({ id: "b", date: "2026-10-31", quantity: 0.75, rate: 80, invoiceId: "f1" }),
    t({ id: "c", date: "2026-10-15", unit: "day", quantity: 0.5, rate: 450 }), t({ id: "d", date: "2026-10-15", billable: false, clientId: "", quantity: 2 }),
    t({ id: "e", date: "2026-10-20", rate: null, quantity: 1 }), t({ id: "out", date: "2026-11-01" }), t({ id: "before", date: "2026-09-30" })];
  const s = E.timeSummary(list, docs, "2026-10-01", "2026-10-31");
  assert.deepEqual(s.rows.map((r) => r.id), ["b", "e", "d", "c", "a"]);
  assert.deepEqual([s.hours, s.days], [5.25, 0.5]);
  assert.deepEqual(s.billable, { hours: 3.25, days: 0.5, amount: 375, missingRate: 1 }, "1,5 × 60 + 0,75 × 80 + 0,5 × 450");
  assert.deepEqual(s.rows.map((r) => r.state), ["invoiced", "unbilled", "internal", "unbilled", "unbilled"]);
  assert.equal(s.rows.find((r) => r.id === "d").amount, null, "temps interne : pas de montant");
  assert.deepEqual(E.timeSummary(undefined, []).billable, { hours: 0, days: 0, amount: 0, missingRate: 0 });
});

test("à facturer par client : seulement les temps facturables sans facture (ou au brouillon supprimé), montant de la facture par tâche", () => {
  const docs = [{ id: "d1", status: "draft" }, { id: "f1", status: "issued" }];
  const list = [t({ id: "a", quantity: 0.33, rate: 50 }), t({ id: "b", quantity: 0.33, rate: 50, date: "2026-10-13" }), t({ id: "c", invoiceId: "d1" }),
    t({ id: "d", invoiceId: "f1" }), t({ id: "e", invoiceId: "deleted", clientId: "c2", unit: "day", quantity: 1, rate: 400 }),
    t({ id: "f", billable: false }), t({ id: "g", clientId: "c2", rate: null, quantity: 1 })];
  const r = E.unbilledByClient(list, docs);
  assert.deepEqual(r.map((c) => [c.clientId, c.entries.map((x) => x.id), c.hours, c.days, c.amount, c.missingRate]),
    [["c1", ["a", "b"], 0.66, 0, 33, 0], ["c2", ["e", "g"], 1, 1, 400, 1]]);
  // Montant affiché = celui de la facture par tâche : 3 × 1 h 10 (1,17 h) à 45,50 € → 3,51 h × 45,50 € = 159,70 €,
  // et non 3 × 53,24 € = 159,72 € (chaque saisie arrondie séparément).
  const odd = [1, 2, 3].map((i) => t({ id: "o" + i, date: "2026-10-1" + i, quantity: 1.17, rate: 45.5 }));
  assert.equal(E.unbilledByClient(odd, [])[0].amount, 159.7);
  assert.equal(E.timeSummary(odd, []).billable.amount, 159.72, "totaux du mois : somme des saisies");
  assert.equal(INV.compute({ lines: E.timeInvoiceLines(odd, "task") }).ht, 159.7);
  assert.deepEqual(E.unbilledByClient([t({ clientId: "", billable: true })], []), [], "sans client : jamais facturé");
});

test("export CSV : point-virgule, date française, virgule décimale, nom du client, guillemets échappés", () => {
  const rows = E.timeSummary([t({ task: 'Atelier "UX"', quantity: 1.5 }), t({ id: "x", billable: false, rate: null, clientId: "", date: "2026-10-11" })], []).rows;
  assert.equal(E.timeCSV(rows, (id) => (id === "c1" ? "Studio Nova" : "")),
    'Date;Client;Tâche;Durée;Unité;Taux HT;Montant HT;Facturable\r\n12/10/2026;"Studio Nova";"Atelier ""UX""";1,5;heure;60,00;90,00;oui\r\n11/10/2026;"";"Maquettes de la page d\'accueil";2;heure;;;non');
});

test("unité des lignes : « 1,5 h » et « 2 j » dans la facture ; codes HUR et DAY dans le Factur-X, C62 sinon", () => {
  const fmt = { eur: (n) => n.toFixed(2).replace(".", ",") + NB + "€", num: (n) => String(n).replace(".", ","), date: (d) => d.split("-").reverse().join("/") };
  const doc = { type: "facture", status: "issued", number: "F2026-001", date: "2026-10-20", serviceDate: "2026-10-16", terms: 30, nature: "services",
    vat: { franchise: true, rate: 20, place: "fr" }, payments: [],
    lines: [{ desc: "Maquettes", qty: 1.5, unit: "hour", price: 60 }, { desc: "Atelier", qty: 2, unit: "day", price: 450 }, { desc: "Licence", qty: 1, price: 30 },
            { desc: "Autre", qty: 1, unit: "semaine", price: 10 }],
    snapshot: { me: { name: "Camille Martin EI", address: "12 rue de la République\n69002 Lyon", siret: "12345678900012" },
                client: { name: "Studio Nova", address: "3 quai Saint-Antoine\n69002 Lyon", id: "987654321", pro: true, place: "fr" } } };
  assert.deepEqual(INV.model(doc, R, fmt).rows.map((r) => r.qty), [`1,5${NB}h`, `2${NB}j`, "1", "1"], "unité inconnue : ignorée");
  const odd = Object.assign({}, doc, { lines: [{ desc: "Piège", qty: 1, unit: "constructor", price: 10 }] });
  assert.deepEqual([INV.model(odd, R, fmt).rows[0].qty, /unitCode="(\w+)"/.exec(FX.xml(odd, [odd], R, fmt))[1]], ["1", "C62"], "nom hérité d'un objet : pas une unité");
  const xml = FX.xml(doc, [doc], R, fmt);
  assert.deepEqual([...xml.matchAll(/<ram:BilledQuantity unitCode="(\w+)">([\d.]+)</g)].map((m) => m[1] + " " + m[2]),
    ["HUR 1.5", "DAY 2", "C62 1", "C62 1"]);
  assert.equal(INV.compute(doc).ht, 1030, "l'unité ne change pas les montants : 90 + 900 + 30 + 10");
});
