// Activité mixte dans l'Espace (documentation/53-activite-mixte.md) : ventes et prestations distinctes sur les factures
// et dans le livre des recettes, encaissement d'une facture mixte réparti au prorata HT, déclaration et cotisations par
// activité, plafonds global et des services, trésorerie. Valeurs attendues calculées à la main.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/espace-fr.js");
const INV = require("../../src/assets/engines/invoice-fr.js");
const R = ruleValues("fr");
const CAL = JSON.parse(readFileSync(new URL("../../data/calendars/fr.json", import.meta.url))).events;
const me = { name: "Camille Martin EI" };
const client = { id: "c1", name: "Studio Nova", pro: true };
const near = (a, e, label) => assert.ok(Math.abs(a - e) < 0.005, `${label} : ${a} ≠ ${e}`);
let seq = 0;
const doc = (over) => Object.assign({ id: "m" + (++seq), type: "facture", status: "draft", date: "2026-08-01", terms: 30, clientId: "c1",
  nature: "services", lines: [{ desc: "Conseil", qty: 1, price: 1000 }], vat: { franchise: true, rate: 20, place: "fr" }, payments: [] }, over);
const issue = (docs, over, payments = []) => {
  const r = E.issue(docs, doc(over), me, client, null, "2026-10-01T10:00:00Z", null, { lineKinds: true });
  assert.deepEqual(r.errors, []);
  r.doc.payments = payments.map((p, i) => Object.assign({ id: r.doc.id + "-p" + i, method: "virement" }, p));
  docs.push(r.doc);
  return r.doc;
};
const mixed = { activity: "vente", activity2: "liberal_bnc", vatRegime: "franchise", periodicity: "quarterly", startDate: "2025-01-01", acre: 0, vl: false };
const mixedLines = [{ desc: "Matériel", qty: 1, price: 300, kind: "biens" }, { desc: "Installation", qty: 1, price: 700, kind: "services" }];

/** Troisième trimestre 2026 : vente 600 €, prestation 1 000 €, facture mixte (300 + 700) payée 500 €, avoir de vente remboursé 100 €. */
function year2026() {
  const docs = [];
  issue(docs, { date: "2026-08-01", nature: "biens", lines: [{ desc: "Lampe", qty: 2, price: 300 }] }, [{ date: "2026-08-10", amount: 600 }]);
  issue(docs, { date: "2026-09-01" }, [{ date: "2026-09-05", amount: 1000 }]);
  issue(docs, { date: "2026-09-10", nature: "mixte", lines: mixedLines }, [{ date: "2026-09-20", amount: 500 }]);
  issue(docs, { type: "avoir", date: "2026-09-25", nature: "mixte", lines: [{ desc: "Retour lampe", qty: 1, price: 100, kind: "biens" }] },
    [{ date: "2026-09-25", amount: 100 }]);
  return docs;
}

test("règles lues : plafonds de la vente et des services, abattement minimal doublé, ventes et prestations distinctes", () => {
  assert.equal(R.micro_activities.vente.plafond_ca, 203100);
  assert.equal(R.micro_activities.liberal_bnc.plafond_ca, 83600);
  assert.match(R.livre_recettes_micro.activite_mixte, /^ventes et prestations de services distinctes sur le livre-journal et sur les factures$/);
  assert.deepEqual([R.micro_activities.vente.cfp, R.micro_activities.liberal_bnc.cfp, R.micro_activities.artisan.cfp], [0.001, 0.002, 0.003]);
});

test("profil mixte : la vente et une activité de services, dans un ordre quelconque ; sinon une seule activité", () => {
  assert.deepEqual(E.mixedActivities(mixed, R), { vente: "vente", services: "liberal_bnc" });
  assert.deepEqual(E.mixedActivities({ activity: "artisan", activity2: "vente" }, R), { vente: "vente", services: "artisan" });
  for (const p of [{ activity: "vente" }, { activity: "vente", activity2: "" }, { activity: "vente", activity2: "vente" },
    { activity: "liberal_bnc", activity2: "services_bic" }, { activity: "real", activity2: "vente" }, { activity: "vente", activity2: "toString" }, null]) {
    assert.equal(E.mixedActivities(p, R), null, JSON.stringify(p));
  }
});

test("facture mixte : nature de chaque ligne et sous-totaux HT des ventes et des prestations", () => {
  const d = doc({ nature: "mixte", lines: mixedLines.concat([{ desc: "Sans nature", qty: 1, price: 50 }]) });
  assert.deepEqual(INV.compute(d).split, { goods: 300, services: 700, unclassified: 1 });
  const fmt = { eur: (n) => n.toFixed(2) + " €", num: String, date: String };
  const m = INV.model(d, R, fmt);
  assert.deepEqual(m.sums.slice(0, 3), [["Total HT", "1050.00 €"], ["dont ventes", "300.00 €"], ["dont prestations de services", "700.00 €"]]);
  assert.deepEqual(m.rows.map((r) => r.desc), ["Vente : Matériel", "Service : Installation", "Sans nature"]);
  assert.equal(INV.compute(doc({ lines: mixedLines })).split, null, "document de services : pas de sous-totaux");
  assert.equal(INV.compute(doc({ nature: "biens", lines: mixedLines })).split, null, "document de biens : pas de sous-totaux");
  const odd = doc({ nature: "mixte", lines: [mixedLines[0], { desc: "Étrange", qty: 1, price: 20, kind: "toString" }] });
  assert.deepEqual([INV.compute(odd).split, INV.model(odd, R, fmt).rows[1].desc], [{ goods: 300, services: 0, unclassified: 1 }, "Étrange"],
    "nature de ligne inconnue ignorée");
  assert.deepEqual(INV.model(doc({ lines: mixedLines }), R, fmt).rows.map((r) => r.desc), ["Matériel", "Installation"], "nature des lignes ignorée hors document mixte");
  assert.equal(INV.model(doc({ nature: "mixte", lines: [{ desc: "A", qty: 1, price: 10 }] }), R, fmt).sums[1][0], "TVA", "aucune ligne classée : pas de sous-totaux");
});

test("émission : en activité mixte, chaque ligne d'une facture mixte dit si c'est une vente ou une prestation", () => {
  const lines = [{ desc: "Matériel", qty: 1, price: 300, kind: "biens" }, { desc: "Pose", qty: 1, price: 200 }, { desc: "Câbles", qty: 2, price: 5, kind: "toString" }];
  assert.deepEqual(E.checkIssue([], doc({ nature: "mixte", lines }), client, { lineKinds: true }),
    ["Indiquez si les lignes 2 et 3 sont des ventes ou des prestations : en activité mixte, la facture les distingue."]);
  assert.deepEqual(E.checkIssue([], doc({ nature: "mixte", lines: lines.slice(0, 2) }), client, { lineKinds: true }),
    ["Indiquez si la ligne 2 est une vente ou une prestation : en activité mixte, la facture les distingue."]);
  assert.deepEqual(E.checkIssue([], doc({ nature: "mixte", lines }), client), [], "profil à une activité : nature des lignes facultative");
  assert.deepEqual(E.checkIssue([], doc({ lines }), client, { lineKinds: true }), [], "facture de services : pas de nature de ligne");
});

test("part des ventes : biens 1, services 0, facture mixte au prorata HT (ligne sans nature avec les prestations)", () => {
  assert.equal(E.goodsShare(doc({ nature: "biens" })), 1);
  assert.equal(E.goodsShare(doc({})), 0);
  assert.equal(E.goodsShare(doc({ nature: "mixte", lines: mixedLines })), 0.3);
  assert.equal(E.goodsShare(doc({ nature: "mixte", lines: [mixedLines[0], { desc: "Pose", qty: 1, price: 700 }] })), 0.3);
  assert.equal(E.goodsShare(doc({ nature: "mixte", lines: [] })), 0);
  const credit = E.creditFromInvoice(doc({ nature: "mixte", lines: mixedLines }), "2026-10-20", "a1");
  assert.deepEqual([credit.nature, credit.lines.map((l) => l.kind), E.goodsShare(credit)], ["mixte", ["biens", "services"], 0.3],
    "avoir d'une facture mixte : natures des lignes reprises");
});

test("livre des recettes : ventes et prestations en deux colonnes, totaux du trimestre par activité, export CSV", () => {
  const docs = year2026();
  const rows = E.ledger(docs, "2026-01-01", "2026-12-31", mixed, R);
  assert.deepEqual(rows.map((r) => [r.date, r.amount, r.goods, r.services]), [
    ["2026-08-10", 600, 600, 0], ["2026-09-05", 1000, 0, 1000], ["2026-09-20", 500, 150, 350], ["2026-09-25", -100, -100, 0]]);
  assert.equal(E.ledger(docs, "2026-01-01", "2026-12-31")[0].goods, undefined, "sans profil : une seule colonne");
  assert.equal(E.ledger(docs, "2026-01-01", "2026-12-31", { activity: "vente" }, R)[0].goods, undefined, "profil à une activité");
  const q = E.ledgerQuarters(rows, 2026, "2026-10-20", "2026-01-01").filter((x) => x.key === "2026-T3")[0];
  assert.deepEqual([q.total, q.goods, q.services], [2000, 650, 1350]);
  const csv = E.ledgerCSV(rows).split("\r\n");
  assert.equal(csv[0], "Date;Client;Nature;Ventes;Prestations;Montant;Moyen de paiement;Référence");
  assert.equal(csv[3], '20/09/2026;"Studio Nova";"Matériel (+ 1)";150,00;350,00;500,00;"Virement";"F2026-003"');
  assert.equal(E.ledgerCSV(E.ledger(docs, "2026-01-01", "2026-12-31")).split("\r\n")[0], "Date;Client;Nature;Montant;Moyen de paiement;Référence");
});

test("déclaration Urssaf : encaissé et cotisations par activité, formation professionnelle au taux le plus élevé", () => {
  const docs = year2026();
  const d = E.nextDeclaration(docs, mixed, R, CAL, "2026-10-20");
  assert.equal(d.period.key, "2026-T3");
  assert.equal(d.mixed, true);
  assert.deepEqual(d.parts.map((x) => [x.activity, x.kind, x.revenue]), [["vente", "biens", 650], ["liberal_bnc", "services", 1350]]);
  // Ventes : 650 × (12,3 % + 0,2 %) = 81,25 ; prestations : 1 350 × (25,6 % + 0,2 %) = 348,30.
  assert.deepEqual(d.parts.map((x) => x.social), [81.25, 348.3]);
  assert.deepEqual([d.revenue, d.social, d.vl, d.total], [2000, 429.55, 0, 429.55]);
  const vl = E.nextDeclaration(docs, Object.assign({}, mixed, { vl: true }), R, CAL, "2026-10-20");
  assert.deepEqual([vl.parts[0].vl, vl.parts[1].vl, vl.vl, vl.total], [6.5, 29.7, 36.2, 465.75], "versement libératoire : 1 % et 2,2 %");
  const acre = E.nextDeclaration(docs, Object.assign({}, mixed, { acre: 50, startDate: "2026-03-01" }), R, CAL, "2026-10-20");
  // ACRE jusqu'au 31/12/2026 : 650 × (6,2 % + 0,2 %) = 41,60 ; 1 350 × (12,8 % + 0,2 %) = 175,50.
  assert.deepEqual(acre.parts.map((x) => x.social), [41.6, 175.5]);
  const single = E.nextDeclaration(docs, { activity: "liberal_bnc", periodicity: "quarterly", acre: 0 }, R, CAL, "2026-10-20");
  assert.deepEqual([single.mixed, single.parts.length, single.revenue], [false, 1, 2000], "profil à une activité : tout au taux de l'activité");
  near(single.social, 2000 * 0.258, "BNC");
  near(E.rates({ activity: "vente" }, R, "2026-09-30").cfp, 0.001, "vente seule : CFP de 0,1 %");
});

test("plafonds : global au plafond de la vente, part des prestations au plafond des services ; TVA non jaugée", () => {
  const th = E.thresholds(year2026(), mixed, R, 2026);
  assert.deepEqual([th.revenue, th.ceiling, th.goods, th.services.revenue, th.services.ceiling, th.vat, th.vatMixed], [2000, 203100, 650, 1350, 83600, null, true]);
  assert.equal(E.thresholds(year2026(), Object.assign({}, mixed, { vatRegime: "normal" }), R, 2026).vatMixed, false);
  const single = E.thresholds(year2026(), { activity: "vente", vatRegime: "franchise" }, R, 2026);
  assert.deepEqual([single.ceiling, single.vat.base, single.services], [203100, 85000, undefined]);
});

test("trésorerie : cotisations déjà dues et prévues par activité ; encaissement attendu d'une facture mixte réparti", () => {
  const docs = year2026();
  issue(docs, { date: "2026-10-01", nature: "mixte", lines: [{ desc: "Matériel", qty: 1, price: 200, kind: "biens" }, { desc: "Conseil", qty: 1, price: 800, kind: "services" }] });
  const base = { documents: docs, charges: [], profile: mixed, rules: R, events: CAL, today: "2026-10-20", months: 6 };
  const o = E.owed(base);
  assert.deepEqual(o.urssaf.periods.map((p) => [p.period.key, p.cashed, p.amount]), [["2026-T3", 2000, 429.55], ["2026-T4", 0, 0]]);
  const f = E.forecast(base);
  // T4 : reste de F2026-003 en retard, attendu aujourd'hui (500 € : 150 de ventes, 350 de prestations) et nouvelle facture
  // attendue le 31/10/2026 (1 000 € : 200 de ventes, 800 de prestations) : 350 × 12,5 % + 1 150 × 25,8 % = 43,75 + 296,70.
  const t4 = f.items.filter((x) => x.kind === "urssaf" && /4e trimestre/.test(x.label))[0];
  assert.deepEqual([t4.date, t4.amount], ["2027-02-01", -340.45]);
  assert.equal(f.items.filter((x) => x.kind === "urssaf" && /3e trimestre/.test(x.label))[0].amount, -429.55);
});

test("registre des achats : obligatoire si l'une des deux activités est la vente", () => {
  assert.equal(E.purchasesRequired({ activity: "liberal_bnc", activity2: "vente" }, R.registre_achats, R), true);
  assert.equal(E.purchasesRequired({ activity: "liberal_bnc", activity2: "vente" }, R.registre_achats), false, "sans les règles : activité principale seule");
  assert.equal(E.purchasesRequired({ activity: "liberal_bnc", activity2: "services_bic" }, R.registre_achats, R), false);
  assert.equal(E.purchasesRequired({ activity: "vente" }, R.registre_achats, R), true);
});

test("générateur public vers l'Espace : la nature des lignes d'un document mixte est reprise, une nature inconnue ignorée", () => {
  const g = { type: "facture", date: "2026-10-15", nature: "mixte", client: { name: "Atelier Lumen" }, vat: { franchise: true },
    lines: [{ desc: "Lampe", qty: "2", price: "150", kind: "biens" }, { desc: "Pose", qty: "1", price: "700", kind: "services" },
      { desc: "Câbles", qty: "1", price: "20", kind: "toString" }, { desc: "Sans nature", qty: "1", price: "10", kind: "" }] };
  const r = E.fromGenerator(g, mixed, [], [], { doc: "d", client: "c" }, "2026-10-20", "t");
  assert.equal(r.doc.nature, "mixte");
  assert.deepEqual(r.doc.lines.map((l) => [l.desc, l.kind]), [["Lampe", "biens"], ["Pose", "services"], ["Câbles", undefined], ["Sans nature", undefined]]);
});
