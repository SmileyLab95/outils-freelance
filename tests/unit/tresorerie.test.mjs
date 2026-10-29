// Trésorerie de l'Espace (documentation/39-tresorerie.md) : charges régulières, encaissements attendus, TVA exigible
// (services à l'encaissement, biens et débits à la facture), déjà dû (cotisations et TVA), prévision sur 6 mois.
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
const client = { id: "c1", name: "Studio Nova", pro: true };
const T = "2026-10-20";
let seq = 0;
const doc = (over) => Object.assign({ id: "d" + (++seq), type: "facture", status: "draft", date: "2026-10-01", terms: 30, clientId: "c1",
  nature: "services", lines: [{ desc: "Prestation", qty: 1, price: 1000 }], vat: { franchise: true, rate: 20, place: "fr" }, payments: [] }, over);
const issue = (docs, over, payments = []) => {
  const r = E.issue(docs, doc(over), me, client, null, "2026-10-01T10:00:00Z");
  assert.deepEqual(r.errors, []);
  r.doc.payments = payments.map((p, i) => Object.assign({ id: r.doc.id + "-p" + i, method: "virement" }, p));
  docs.push(r.doc);
  return r.doc;
};
const micro = { activity: "liberal_bnc", vatRegime: "franchise", periodicity: "quarterly", startDate: "2025-01-01", acre: 0, vl: false };
const input = (over) => Object.assign({ documents: [], charges: [], profile: micro, rules: R, events: CAL, today: T, months: 6 }, over);

test("règles de la TVA lues : acomptes de 55 % et 40 %, dispense sous 1 000 €, exigibilité", () => {
  assert.match(R.tva_rsi_calendrier, /juillet \(55 %\) et en décembre \(40 %\)/);
  assert.match(R.tva_exigibilite.services, /^encaissement/);
  assert.match(R.tva_exigibilite.biens, /^livraison/);
});

test("charges régulières : mois courts, trimestres, années, première et dernière échéance", () => {
  assert.deepEqual(E.chargeDates({ every: "month", start: "2026-01-31" }, "2026-02-01", "2026-05-31"), ["2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
  assert.deepEqual(E.chargeDates({ every: "quarter", start: "2026-11-30" }, "2026-01-01", "2027-06-30"), ["2026-11-30", "2027-02-28", "2027-05-30"]);
  assert.deepEqual(E.chargeDates({ every: "year", start: "2024-02-29" }, "2024-01-01", "2028-12-31"), ["2024-02-29", "2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]);
  assert.deepEqual(E.chargeDates({ every: "month", start: "2026-01-15", end: "2026-03-15" }, "2026-01-01", "2026-12-31"), ["2026-01-15", "2026-02-15", "2026-03-15"], "dernière échéance comprise");
  assert.deepEqual(E.chargeDates({ every: "month", start: "2026-01-15" }, "2026-02-15", "2026-02-15"), ["2026-02-15"], "bornes comprises");
  assert.deepEqual(E.chargeDates({ every: "week", start: "2026-01-15" }, "2026-01-01", "2026-12-31"), [], "fréquence inconnue");
  assert.deepEqual(E.chargeDates({ every: "month", start: "2026-12-15" }, "2026-12-01", "2027-02-28"), ["2026-12-15", "2027-01-15", "2027-02-15"], "passage d'année");
  assert.deepEqual(E.chargeDates({ every: "month", start: "" }, "2026-01-01", "2026-12-31"), []);
  assert.equal(E.chargeDates({ every: "month", start: "2000-01-01" }, "2026-01-01", "2026-01-31").length, 1, "charge ancienne : seules les échéances de la période");
});

test("contrôle d'une charge : libellé, montant positif, fréquence, dates", () => {
  const ok = { label: "Logiciel de compta", amount: 30, every: "month", start: "2026-01-31", end: "" };
  assert.deepEqual(E.chargeErrors(ok), []);
  const fields = (x) => E.chargeErrors(Object.assign({}, ok, x)).map((e) => e.field);
  assert.deepEqual(fields({ label: " " }), ["label"]);
  assert.deepEqual(fields({ amount: 0 }), ["amount"]);
  assert.deepEqual(fields({ amount: NaN }), ["amount"]);
  assert.deepEqual(fields({ every: "toString" }), ["every"]);
  assert.deepEqual(fields({ start: "2026-02-30" }), ["start"]);
  assert.deepEqual(fields({ end: "2025-12-31" }), ["end"], "dernière échéance avant la première");
});

test("encaissements attendus : solde des factures à l'échéance, retard ramené à aujourd'hui, avoir à rembourser", () => {
  const docs = [];
  const late = issue(docs, { date: "2026-09-10" }, [{ date: "2026-09-20", amount: 400 }]);
  const next = issue(docs, { date: "2026-10-05", lines: [{ desc: "Site", qty: 1, price: 2000 }] });
  issue(docs, { date: "2026-10-06", lines: [{ desc: "Payée", qty: 1, price: 500 }] }, [{ date: "2026-10-07", amount: 500 }]);
  docs.push(doc({ id: "brouillon", lines: [{ desc: "Brouillon", qty: 1, price: 9000 }] }));
  const r = E.expectedReceipts(docs, T);
  assert.deepEqual(r.map((x) => [x.doc.id, x.amount, x.date, x.late]), [[late.id, 600, T, true], [next.id, 2000, "2026-11-04", false]]);
  const paid = issue(docs, { date: "2026-10-08", lines: [{ desc: "Remboursée", qty: 1, price: 300 }] }, [{ date: "2026-10-09", amount: 300 }]);
  const credit = E.creditFromInvoice(paid, "2026-10-10", "av1");
  const issuedCredit = E.issue(docs, credit, me, client, null, "2026-10-10T10:00:00Z").doc;
  docs.push(issuedCredit);
  const refund = E.expectedReceipts(docs, T).find((x) => x.doc.id === issuedCredit.id);
  assert.deepEqual([refund.amount, refund.date], [-300, T], "avoir à rembourser : sortie aujourd'hui");
});

test("TVA exigible : services à l'encaissement, biens et option pour les débits à la facture, avoir, franchise, client de l'UE", () => {
  const vat = { franchise: false, rate: 20, place: "fr" };
  const docs = [];
  issue(docs, { date: "2026-09-25", vat, lines: [{ desc: "Conseil", qty: 1, price: 1000 }] }, [{ date: "2026-10-02", amount: 600 }]);
  issue(docs, { date: "2026-10-10", nature: "biens", vat, lines: [{ desc: "Livres", qty: 1, price: 500 }] });
  const debits = issue(docs, { date: "2026-10-11", vat: Object.assign({}, vat, { debits: true }), lines: [{ desc: "Débits", qty: 1, price: 300 }] });
  const credit = E.issue(docs, Object.assign(E.creditFromInvoice(debits, "2026-10-12", "av2"), { lines: [{ desc: "Remise", qty: 1, price: 100 }] }),
    me, client, null, "2026-10-12T10:00:00Z").doc;
  docs.push(credit);
  issue(docs, { date: "2026-10-13", nature: "mixte", vat, lines: [{ desc: "Mixte", qty: 1, price: 50 }] });
  issue(docs, { date: "2026-10-14", vat: { franchise: false, rate: 20, place: "eu" }, lines: [{ desc: "UE", qty: 1, price: 700 }] }, [{ date: "2026-10-15", amount: 700 }]);
  issue(docs, { date: "2026-10-14", lines: [{ desc: "Franchise", qty: 1, price: 900 }] }, [{ date: "2026-10-15", amount: 900 }]);
  // 600 × 200/1200 = 100 ; biens 100 ; débits 60 ; avoir −20 ; mixte 10 (à la facture, par prudence) ; UE et franchise : 0.
  assert.equal(E.vatExigible(docs, "2026-10-01", "2026-10-31"), 250);
  assert.equal(E.vatExigible(docs, "2026-09-01", "2026-09-30"), 0, "services facturés en septembre, encaissés en octobre");
  assert.equal(E.vatExigible(docs, "2026-10-01", "2026-10-10"), 200);
  assert.equal(E.vatPart(docs[0]), 1 / 6);
});

test("déjà dû (micro-entrepreneur) : cotisations des périodes pas encore payées, ACRE et versement libératoire", () => {
  const docs = [];
  issue(docs, { date: "2026-06-10", lines: [{ desc: "T2", qty: 1, price: 800 }] }, [{ date: "2026-06-20", amount: 800 }]);
  issue(docs, { date: "2026-09-10" }, [{ date: "2026-09-20", amount: 400 }]);
  issue(docs, { date: "2026-10-01", lines: [{ desc: "Payée", qty: 1, price: 1500 }] }, [{ date: "2026-10-15", amount: 1500 }]);
  const o = E.owed(input({ documents: docs }));
  // T3 (date limite 02/11/2026) : 400 × 25,8 % ; T4 commencé : 1 500 × 25,8 % ; T2 déjà payé (31/07/2026).
  assert.deepEqual(o.urssaf.periods.map((p) => [p.period.key, p.cashed, p.amount, p.due]), [["2026-T3", 400, 103.2, "2026-11-02"], ["2026-T4", 1500, 387, "2027-02-01"]]);
  assert.deepEqual([o.urssaf.total, o.vat.total, o.total], [490.2, 0, 490.2]);
  const acre = E.owed(input({ documents: docs, profile: Object.assign({}, micro, { acre: 50, startDate: "2025-11-15", vl: true }) }));
  // ACRE jusqu'à la fin du 3e trimestre civil suivant celui du début (30/09/2026) : T3 à 12,8 % + 0,2 % + 2,2 % ; T4 à 25,6 % + 0,2 % + 2,2 %.
  assert.deepEqual(acre.urssaf.periods.map((p) => p.amount), [60.8, 420]);
  const monthly = E.owed(input({ documents: docs, profile: Object.assign({}, micro, { periodicity: "monthly" }) }));
  assert.deepEqual(monthly.urssaf.periods.map((p) => [p.period.key, p.amount]), [["2026-09", 103.2], ["2026-10", 387]], "septembre (30/10 → 02/11) et octobre");
  assert.deepEqual(E.owed(input({ documents: docs, profile: { activity: "real", vatRegime: "franchise" } })).urssaf, { total: 0, periods: [], computed: false },
    "hors micro-entreprise : cotisations non estimées");
});

test("déjà dû (TVA) : réel normal, mois pas encore déclarés ; réel simplifié, moins les acomptes échus", () => {
  const vat = { franchise: false, rate: 20, place: "fr" };
  const docs = [];
  issue(docs, { date: "2026-03-01", vat, lines: [{ desc: "Mars", qty: 1, price: 10000 }] }, [{ date: "2026-03-05", amount: 12000 }]);
  issue(docs, { date: "2026-09-01", vat, lines: [{ desc: "Sept", qty: 1, price: 1000 }] }, [{ date: "2026-09-05", amount: 1200 }]);
  issue(docs, { date: "2026-10-01", vat, lines: [{ desc: "Oct", qty: 1, price: 500 }] }, [{ date: "2026-10-03", amount: 600 }]);
  const real = { activity: "real", vatRegime: "normal" };
  // 20/10 : la TVA de septembre a été déclarée le 15/10 ; reste octobre (100).
  assert.deepEqual([E.owed(input({ documents: docs, profile: real })).vat.total], [100]);
  assert.equal(E.owed(input({ documents: docs, profile: real, today: "2026-10-10" })).vat.total, 300, "avant le 15/10 : septembre et octobre");
  assert.equal(E.owed(input({ documents: docs, profile: real, today: "2026-10-15" })).vat.total, 300, "le jour de la déclaration : septembre encore dû");
  const december = [];
  issue(december, { date: "2026-11-02", vat, lines: [{ desc: "Nov", qty: 1, price: 4000 }] }, [{ date: "2026-11-05", amount: 4800 }]);
  issue(december, { date: "2026-12-01", vat, lines: [{ desc: "Déc", qty: 1, price: 1000 }] }, [{ date: "2026-12-10", amount: 1200 }]);
  assert.equal(E.owed(input({ documents: december, profile: real, today: "2027-01-10" })).vat.total, 200,
    "janvier : la TVA de décembre (déclarée le 15/01) est due, pas celle de novembre (déclarée le 15/12)");
  const rsi = { activity: "real", vatRegime: "simplified", vatLastYear: 5000 };
  // Depuis le 1er janvier : 2 000 + 200 + 100 = 2 300 ; acompte de juillet échu (55 % de 5 000 = 2 750) : rien de plus à devoir.
  assert.deepEqual([E.owed(input({ documents: docs, profile: rsi })).vat.total, E.owed(input({ documents: docs, profile: rsi })).vat.advances], [0, 2750]);
  assert.equal(E.owed(input({ documents: docs, profile: Object.assign({}, rsi, { vatLastYear: 1000 }) })).vat.total, 1750, "2 300 − 550");
  assert.equal(E.owed(input({ documents: docs, profile: Object.assign({}, rsi, { vatLastYear: 999 }) })).vat.total, 2300, "moins de 1 000 € : pas d'acompte");
  const unknown = E.owed(input({ documents: docs, profile: Object.assign({}, rsi, { vatLastYear: null }) })).vat;
  assert.deepEqual([unknown.total, unknown.advancesUnknown], [2300, true], "TVA de l'an dernier inconnue : acomptes non déduits, signalé");
  assert.equal(E.owed(input({ documents: docs, profile: Object.assign({}, rsi, { vatLastYear: "abc" }) })).vat.advancesUnknown, true, "montant illisible : inconnu");
  // Un acompte compte comme versé le mois suivant le sien (par prudence : sa date exacte n'est pas dans la règle).
  assert.equal(E.owed(input({ documents: docs, profile: Object.assign({}, rsi, { vatLastYear: 1000 }), today: "2026-07-31" })).vat.total, 2000, "au 31/07, seule la TVA de mars ; acompte de juillet pas encore compté");
  assert.equal(E.owed(input({ documents: docs, profile: Object.assign({}, rsi, { vatLastYear: 1000 }), today: "2026-08-01" })).vat.total, 1450, "compté en août : 2 000 − 550");
  const january = E.owed(input({ documents: docs, profile: Object.assign({}, rsi, { vatLastYear: 1000 }), today: "2027-01-10" })).vat;
  assert.deepEqual([january.total, january.previousYearDue], [0, "2027-05-04"],
    "nouvelle année : TVA comptée depuis le 1er janvier 2027 ; solde de 2026 à payer avec la CA12, signalé sans être estimé");
  assert.equal(E.owed(input({ documents: docs, profile: rsi })).vat.previousYearDue, null, "CA12 de 2026 passée");
});

test("prévision sur 6 mois : factures attendues, cotisations au calendrier, charges, solde de fin, mois négatif", () => {
  const docs = [];
  issue(docs, { date: "2026-09-10" }, [{ date: "2026-09-20", amount: 400 }]);
  issue(docs, { date: "2026-10-01", lines: [{ desc: "Payée", qty: 1, price: 1500 }] }, [{ date: "2026-10-15", amount: 1500 }]);
  issue(docs, { date: "2026-10-05", lines: [{ desc: "Site", qty: 1, price: 2000 }] });
  const charges = [{ id: "ch1", label: "Logiciel", amount: 30, every: "month", start: "2026-01-31" },
    { id: "ch2", label: "Assurance", amount: 420, every: "year", start: "2026-03-15" }];
  const f = E.forecast(input({ documents: docs, charges, profile: Object.assign({}, micro, { cashBalance: 5000, cashDate: T }) }));
  assert.deepEqual(f.months.map((m) => [m.key, m.in, m.out, m.balance]), [
    ["2026-10", 600, 30, 5570], ["2026-11", 2000, 133.2, 7436.8], ["2026-12", 0, 30, 7406.8],
    ["2027-01", 0, 30, 7376.8], ["2027-02", 0, 1087.8, 6289], ["2027-03", 0, 450, 5839]]);
  // T4 : encaissé 1 500 + attendu 600 (retard) + 2 000 = 4 100 × 25,8 % = 1 057,80 au 01/02/2027.
  assert.deepEqual(f.months[4].items.map((x) => [x.date, x.kind, x.amount]), [["2027-02-01", "urssaf", -1057.8], ["2027-02-28", "charge", -30]]);
  assert.equal(f.months[4].items[0].label, "Cotisations Urssaf du 4e trimestre 2026");
  assert.deepEqual(f.months[0].items.map((x) => [x.date, x.kind, x.late || false]), [[T, "receipt", true], ["2026-10-31", "charge", false]]);
  assert.equal(f.negative, null);
  assert.ok(f.items.every((x) => x.date >= T && x.date <= f.until) && f.until === "2027-03-31", "rien au-delà de l'horizon (T1 2027, payé le 30/04/2027)");
  assert.equal(f.calendarShort, false);
  assert.equal(E.forecast(input({ events: [] })).calendarShort, true, "calendrier fiscal trop court : signalé");
  const later = [];
  issue(later, { date: "2026-10-10", terms: 90 });
  assert.deepEqual(E.forecast(input({ documents: later })).items.map((x) => [x.date, x.kind]), [["2027-01-08", "receipt"]],
    "facture attendue en janvier : ses cotisations (T1 2027, payées le 30/04/2027) sont au-delà de l'horizon");
  const tight = E.forecast(input({ documents: docs, charges: charges.concat([{ id: "ch3", label: "Loyer", amount: 3000, every: "month", start: "2026-11-05" }]),
    profile: Object.assign({}, micro, { cashBalance: 0, cashDate: T }) }));
  assert.equal(tight.negative, "2026-11", "premier mois qui finit en négatif");
  const noBalance = E.forecast(input({ documents: docs, charges }));
  assert.deepEqual([noBalance.months[0].balance, noBalance.months[0].in, noBalance.negative], [null, 600, null], "sans solde saisi : flux seulement");
  const cents = E.forecast(input({ charges: [{ id: "a", label: "A", amount: 0.1, every: "month", start: "2026-10-25" }, { id: "b", label: "B", amount: 0.2, every: "month", start: "2026-10-26" }],
    profile: Object.assign({}, micro, { cashBalance: 1, cashDate: T }) }));
  assert.deepEqual([cents.months[0].out, cents.months[0].balance], [0.3, 0.7], "arrondis au centime");
  const drift = E.forecast(input({ charges: [{ id: "a", label: "A", amount: 0.1, every: "month", start: "2026-10-25" }], profile: Object.assign({}, micro, { cashBalance: 0.3, cashDate: T }) }));
  assert.equal(drift.months[0].balance, 0.2, "0,3 − 0,1 au centime");
  const odd = E.forecast(input({ profile: Object.assign({}, micro, { cashBalance: "abc", cashDate: T }) }));
  assert.deepEqual([odd.start, odd.months[0].balance], [null, null], "solde illisible : ignoré");
  assert.equal(E.forecast(input({ profile: Object.assign({}, micro, { cashBalance: 100.004, cashDate: T }) })).start, 100);
  const past = E.forecast(input({ charges: [{ id: "b", label: "Banque", amount: 10, every: "month", start: "2026-10-05" }] }));
  assert.deepEqual(past.items.map((x) => x.date).slice(0, 2), ["2026-11-05", "2026-12-05"], "échéance déjà passée ce mois-ci : pas reprise (le solde en tient compte)");
});

test("prévision : TVA du réel normal au calendrier du mois suivant, acomptes du réel simplifié", () => {
  const vat = { franchise: false, rate: 20, place: "fr" };
  const docs = [];
  issue(docs, { date: "2026-09-25", vat, lines: [{ desc: "Conseil", qty: 1, price: 1000 }] }, [{ date: "2026-10-02", amount: 600 }]);
  issue(docs, { date: "2026-10-10", nature: "biens", vat, lines: [{ desc: "Livres", qty: 1, price: 500 }] });
  const normal = E.forecast(input({ documents: docs, profile: { activity: "real", vatRegime: "normal", cashBalance: 1000, cashDate: T } }));
  // Octobre : 100 encaissé + 100 (biens, à la facture) + 100 attendu le 25/10 (services) = 300, payés le 15/11.
  assert.deepEqual(normal.items.filter((x) => x.kind === "vat").map((x) => [x.date, x.amount, x.label]), [["2026-11-15", -300, "TVA d'octobre 2026 (CA3)"]],
    "novembre : la facture de biens attendue le 09/11 a déjà sa TVA en octobre");
  const rsi = E.forecast(input({ documents: docs, profile: { activity: "real", vatRegime: "simplified", vatLastYear: 5000, cashBalance: 1000, cashDate: T } }));
  assert.deepEqual(rsi.items.filter((x) => x.kind === "vat").map((x) => [x.date, x.amount, x.label]), [["2026-12-15", -2000, "Acompte de TVA de décembre 2026 (40 %)"]]);
  const dispensed = E.forecast(input({ documents: docs, profile: { activity: "real", vatRegime: "simplified", vatLastYear: 900, cashBalance: 1000, cashDate: T } }));
  assert.deepEqual(dispensed.items.filter((x) => x.kind === "vat"), [], "dispense d'acompte sous 1 000 €");
  // Avoir de services à rembourser ce mois-ci : la TVA prévue baisse (remboursement de 600 € TTC = 100 € de TVA).
  const refunded = [];
  const paid = issue(refunded, { date: "2026-10-01", vat, lines: [{ desc: "Conseil", qty: 1, price: 1000 }] }, [{ date: "2026-10-02", amount: 1200 }]);
  const credit = E.issue(refunded, Object.assign(E.creditFromInvoice(paid, "2026-10-12", "av3"), { lines: [{ desc: "Annulation partielle", qty: 1, price: 500 }] }),
    me, client, null, "2026-10-12T10:00:00Z").doc;
  refunded.push(credit);
  const refund = E.forecast(input({ documents: refunded, profile: { activity: "real", vatRegime: "normal", cashBalance: 1000, cashDate: T } }));
  assert.deepEqual(refund.items.map((x) => [x.date, x.kind, x.amount]), [[T, "refund", -600], ["2026-11-15", "vat", -100]],
    "TVA d'octobre : 200 encaissés − 100 remboursés");
  const franchise = E.forecast(input({ documents: docs, profile: { activity: "real", vatRegime: "franchise" } }));
  assert.deepEqual(franchise.items.filter((x) => x.kind === "vat"), []);
});
