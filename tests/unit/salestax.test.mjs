// Tests du moteur de taxe sur les ventes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const st = createRequire(import.meta.url)("../../src/assets/engines/salestax.js");

test("TVA britannique 20 % : HT → TTC et TTC → HT", () => {
  const a = st.split(1000, [{ label: "VAT", rate: 0.2 }], "net");
  assert.equal(a.gross, 1200); assert.equal(a.tax, 200);
  const b = st.split(1000, [{ label: "VAT", rate: 0.2 }], "gross");
  assert.equal(b.net, 833.33); assert.equal(b.tax, 166.67); assert.equal(b.gross, 1000);
});

test("Québec : TPS 5 % + TVQ 9,975 % sur 100 $", () => {
  const r = st.split(100, [{ label: "GST", rate: 0.05 }, { label: "QST", rate: 0.09975 }], "net");
  assert.equal(r.taxes[0].amount, 5); assert.equal(r.taxes[1].amount, 9.98); assert.equal(r.gross, 114.98);
});

test("depuis un montant TTC, la somme retombe exactement sur le montant saisi", () => {
  const r = st.split(114.98, [{ label: "GST", rate: 0.05 }, { label: "QST", rate: 0.09975 }], "gross");
  assert.equal(r.net, 100); assert.equal(r.gross, 114.98);
  assert.equal(Math.round((r.net + r.taxes[0].amount + r.taxes[1].amount) * 100) / 100, 114.98);
});

test("taux zéro", () => {
  const r = st.split(250, [{ label: "VAT", rate: 0 }], "net");
  assert.equal(r.tax, 0); assert.equal(r.gross, 250);
});
