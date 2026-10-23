// Dépenses et registre des achats de l'Espace (documentation/36-depenses-et-registre-des-achats.md) : obligation selon
// l'activité (règle registre_achats), lignes de l'année dans l'ordre chronologique, totaux dont espèces, contrôle de la
// saisie, export CSV.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const E = createRequire(import.meta.url)("../../src/assets/engines/espace-fr.js");
const R = ruleValues("fr");
const x = (over) => Object.assign({ id: "e1", date: "2026-03-10", supplier: "Grossiste Lumière", label: "Bougies", amount: 120, method: "virement", ref: "FA-12", createdAt: "2026-03-10T09:00:00Z" }, over);

test("registre des achats obligatoire pour la vente de marchandises seulement (règle registre_achats)", () => {
  assert.deepEqual(R.registre_achats.activities, ["vente"]);
  assert.equal(E.purchasesRequired({ activity: "vente" }, R.registre_achats), true);
  for (const activity of ["liberal_bnc", "cipav", "services_bic", "artisan", "real", undefined]) {
    assert.equal(E.purchasesRequired({ activity }, R.registre_achats), false, String(activity));
  }
  assert.equal(E.purchasesRequired(null, R.registre_achats), false);
  assert.equal(E.purchasesRequired({ activity: "vente" }, undefined), false, "sans la règle : rien d'obligatoire");
  assert.ok("vente" in R.micro_activities, "même catégorie que les seuils de la micro-entreprise");
});

test("lignes de l'année : ordre chronologique (date, puis saisie), bornes incluses, montants au centime", () => {
  const list = [x({ id: "b", date: "2026-03-10", createdAt: "2026-03-10T11:00:00Z" }), x({ id: "a", date: "2026-01-01", amount: "19.999" }),
    x({ id: "c", date: "2026-03-10", createdAt: "2026-03-10T08:00:00Z" }), x({ id: "z", date: "2026-12-31" }), x({ id: "old", date: "2025-12-31" }),
    x({ id: "next", date: "2027-01-01" }), null, x({ id: "nodate", date: "" })];
  const r = E.expenseRows(list, "2026-01-01", "2026-12-31");
  assert.deepEqual(r.rows.map((l) => l.id), ["a", "c", "b", "z"], "même date : ordre de saisie, pas d'identifiant");
  assert.equal(r.rows[0].amount, 20);
  assert.equal(r.total, 380);
  assert.deepEqual(E.expenseRows([x({ id: "q", createdAt: "" }), x({ id: "p", createdAt: "" })]).rows.map((l) => l.id), ["p", "q"], "même date, même saisie : identifiant");
  assert.deepEqual(E.expenseRows(undefined), { rows: [], total: 0, cash: 0 });
  assert.deepEqual(E.expenseRows([x({ id: "nodate", date: "" }), x()]).rows.map((l) => l.id), ["e1"], "sans date : jamais listée, même sans bornes");
});

test("totaux : espèces distinguées ; libellés des moyens de paiement", () => {
  const r = E.expenseRows([x({ amount: 50.1, method: "especes" }), x({ id: "e2", amount: 0.2, method: "especes" }), x({ id: "e3", amount: 10, method: "carte" })]);
  assert.deepEqual([r.total, r.cash], [60.3, 50.3]);
  assert.deepEqual(r.rows.map((l) => [l.method, l.cash]), [["Espèces", true], ["Espèces", true], ["Carte bancaire", false]]);
  assert.equal(E.expenseRows([x({ method: "inconnu" })]).rows[0].method, "inconnu");
});

test("contrôle de la saisie : date, fournisseur, montant positif, moyen de paiement", () => {
  assert.deepEqual(E.checkExpense(x()), []);
  assert.deepEqual(E.checkExpense({ date: "", supplier: " ", amount: NaN, method: "x" }),
    ["Indiquez la date de la dépense.", "Indiquez le fournisseur.", "Indiquez un montant positif.", "Choisissez le moyen de paiement."]);
  for (const amount of [0, -5, NaN, Infinity]) assert.deepEqual(E.checkExpense(x({ amount })), ["Indiquez un montant positif."], String(amount));
  assert.deepEqual(E.checkExpense(x({ date: "10/03/2026" })), ["Indiquez la date de la dépense."]);
});

test("export CSV : séparateur point-virgule, date française, virgule décimale, guillemets échappés", () => {
  const rows = E.expenseRows([x({ supplier: 'Atelier "Nord"', amount: 1234.5, method: "especes" })]).rows;
  assert.equal(E.expensesCSV(rows), 'Date;Fournisseur;Nature;Montant;Moyen de paiement;Référence de la pièce\r\n10/03/2026;"Atelier ""Nord""";"Bougies";1234,50;"Espèces";"FA-12"');
});
