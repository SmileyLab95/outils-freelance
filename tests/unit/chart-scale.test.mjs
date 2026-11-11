// Échelles et tracés des graphiques de l'Espace (documentation/39-tresorerie.md, § 7.4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const C = require("../../src/assets/engines/chart-scale.js");

test("pas ronds : 1, 2, 2,5, 5 ou 10 × une puissance de 10", () => {
  assert.equal(C.niceStep(10000, 5), 2000);
  assert.equal(C.niceStep(12000, 5), 2500);
  assert.equal(C.niceStep(900, 5), 200);
  assert.equal(C.niceStep(300, 5), 100);
  assert.equal(C.niceStep(3, 5), 1);
  assert.equal(C.niceStep(45, 5), 10);
  assert.equal(C.niceStep(0, 5), 1, "étendue nulle");
});

test("graduations : zéro toujours compris, bornes arrondies au pas", () => {
  assert.deepEqual(C.ticks([1200, 9800]), { min: 0, max: 10000, step: 2000, values: [0, 2000, 4000, 6000, 8000, 10000] });
  const neg = C.ticks([-3100, 6900]);
  assert.equal(neg.step, 2000);
  assert.deepEqual([neg.min, neg.max], [-4000, 8000]);
  assert.ok(neg.values.includes(0));
  assert.equal(C.ticks([-2900, 6900]).min, -4000, "borne basse arrondie vers le bas : la valeur reste dans l'axe");
  assert.deepEqual(C.ticks([]).values, [0, 1], "aucune valeur : un intervalle par défaut");
  assert.deepEqual(C.ticks([-400, -150]).values, [-400, -300, -200, -100, 0], "valeurs négatives : zéro en haut");
  assert.deepEqual(C.ticks([NaN, 50, Infinity]).values, [0, 10, 20, 30, 40, 50], "valeurs non finies ignorées");
});

test("échelles linéaire et de dates", () => {
  const y = C.linear(0, 10000, 200, 0);
  assert.equal(y(0), 200);
  assert.equal(y(10000), 0);
  assert.equal(y(2500), 150);
  assert.equal(C.linear(5, 5, 0, 100)(5), 0, "domaine nul");
  assert.equal(C.linear(5, 5, 0, 100)(6), 0, "domaine nul : toutes les valeurs au début");
  const x = C.dateScale("2026-11-01", "2026-12-01", 0, 300);
  assert.equal(x("2026-11-01"), 0);
  assert.equal(x("2026-12-01"), 300);
  assert.equal(x("2026-11-16"), 150);
  assert.equal(C.dateScale("2026-03-01", "2026-04-01", 0, 31)("2026-03-29"), 28, "changement d'heure sans effet");
});

test("premiers jours des mois de la période", () => {
  assert.deepEqual(C.monthStarts("2026-11-11", "2027-02-28"), ["2026-12-01", "2027-01-01", "2027-02-01"]);
  assert.deepEqual(C.monthStarts("2026-11-01", "2026-12-01"), ["2026-11-01", "2026-12-01"]);
  assert.deepEqual(C.monthStarts("2026-12-15", "2026-12-31"), []);
  assert.deepEqual(C.monthStarts("2026-12-15", "2027-01-31"), ["2027-01-01"], "passage d'année");
});

test("chemin en escalier et surface d'un solde", () => {
  const x = C.dateScale("2026-11-01", "2026-11-11", 0, 100), y = C.linear(0, 1000, 100, 0);
  const pts = [{ date: "2026-11-01", balance: 500 }, { date: "2026-11-04", balance: 800 }, { date: "2026-11-06", balance: 200 }];
  assert.equal(C.stepPath(pts, x, y, "2026-11-11"), "M0 50H30V20H50V80H100");
  assert.equal(C.stepPath(pts, x, y), "M0 50H30V20H50V80");
  assert.equal(C.stepArea(pts, x, y, "2026-11-11", 100), "M0 50H30V20H50V80H100V100H0Z");
  assert.equal(C.stepPath([], x, y), "");
  assert.equal(C.stepArea([], x, y, "2026-11-11", 100), "");
});

test("barres groupées : positions régulières dans la largeur", () => {
  const b = C.bands(2, 2, 0, 100, 0.2);
  assert.deepEqual(b(0, 0), { x: 5, width: 19 });
  assert.deepEqual(b(0, 1), { x: 25, width: 19 });
  assert.deepEqual(b(1, 0), { x: 55, width: 19 });
  const one = C.bands(1, 1, 10, 50, 0);
  assert.deepEqual(one(0, 0), { x: 10, width: 49 });
});

test("montants courts pour les axes", () => {
  assert.equal(C.short(0), "0");
  assert.equal(C.short(950), "950");
  assert.equal(C.short(1000), "1\u202fk");
  assert.equal(C.short(12500), "12,5 k");
  assert.equal(C.short(-2000), "−2 k");
  assert.equal(C.short(2000000), "2 M");
});
