// Cœur commun de l'Espace (engines/espace-core.js, documentation/60, § 3.1, D88) : sans texte ni format d'un pays.
// Créé avec un pays fictif (préfixes, moyens de paiement et formats à l'américaine) et une fonction de texte qui rend
// la clé brute : aucune phrase ni aucun format français ne doit apparaître.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const CORE = require("../../src/assets/engines/espace-core.js");
const INV = require("../../src/assets/engines/invoice-fr.js");

const L = (key, vars) => "[" + key + (vars ? " " + JSON.stringify(vars) : "") + "]";
const country = {
  prefixes: { facture: "INV", devis: "EST", avoir: "CM" },
  methods: { check: "[check]", ach: "[ach]" },
  fmt: { day: (d) => d.slice(5, 7) + "/" + d.slice(8, 10) + "/" + d.slice(0, 4), dec: (n) => String(n), amount: (n) => n.toFixed(2) },
};
const C = CORE(INV, L, country);
// Une lettre accentuée ou une virgule décimale trahirait un texte ou un format français.
const FRENCH = /[àâçéèêëîïôûùœ]|\d,\d/;

test("cœur : fabrique sans état partagé, numérotation avec les préfixes du pays", () => {
  assert.equal(typeof CORE, "function");
  assert.equal(C.nextNumber([], "facture", "2026"), "INV2026-001");
  assert.equal(C.nextNumber([], "devis", "2026"), "EST2026-001");
  const other = CORE(INV, L, { prefixes: { facture: "F", devis: "D", avoir: "A" }, methods: {}, fmt: country.fmt });
  assert.equal(other.nextNumber([], "facture", "2026"), "F2026-001", "deux pays, deux réglages");
  assert.equal(C.nextNumber([], "facture", "2026"), "INV2026-001", "le premier cœur garde les siens");
});

test("cœur : moyens de paiement du pays, messages en clés", () => {
  const doc = { id: "f1", type: "facture", status: "issued", date: "2026-10-01", terms: 30, number: "INV2026-001",
                lines: [{ desc: "Design", qty: 1, price: 500 }], vat: { franchise: true, rate: 0, place: "fr" }, payments: [] };
  assert.deepEqual(C.checkPayment(doc, { date: "2026-10-05", amount: 100, method: "check" }, [doc]), []);
  assert.deepEqual(C.checkPayment(doc, { date: "2026-10-05", amount: 100, method: "virement" }, [doc]), ["[eng.pay.method]"]);
  assert.deepEqual(C.checkPayment(doc, { date: "", amount: 0, method: "ach" }, [doc]), ["[eng.pay.date]", "[eng.pay.positive]"]);
});

test("cœur : exports et durées au format du pays, sans texte français", () => {
  const rows = [{ date: "2026-10-01", clientId: "c1", task: "Design", quantity: 1.5, unit: "hour", rate: 80, amount: 120, billable: true }];
  const csv = C.timeCSV(rows, () => "Acme");
  assert.match(csv, /^\[eng\.csv\.time\]\r\n10\/01\/2026;"Acme";"Design";1\.5;\[eng\.csv\.hour\];80\.00;120\.00;\[eng\.csv\.yes\]$/);
  const forecast = { start: 1000, today: "2026-10-01", items: [{ date: "2026-10-15", kind: "charge", label: "Rent", amount: -250.5 }] };
  const out = C.forecastCSV(forecast);
  assert.match(out, /10\/15\/2026;"\[eng\.flow\.charge\]";"Rent";-250\.50;749\.50$/);
  assert.equal(C.durationLabel(1.25, "hour"), '[eng.duration.hoursMinutes {"h":1,"m":"15"}]');
  assert.equal(C.durationLabel(0.5, "day"), '[eng.duration.day {"n":"0.5"}]');
  const lines = C.timeInvoiceLines([{ id: "t1", date: "2026-10-01", task: "Design", quantity: 2, unit: "hour", rate: 80, billable: true },
                                    { id: "t2", date: "2026-10-03", task: "Design", quantity: 1, unit: "hour", rate: 80, billable: true }], "task");
  assert.equal(lines.length, 1);
  assert.match(lines[0].desc, /Design — \[eng\.time\.span \{"from":"10\/01\/2026","to":"10\/03\/2026"\}\]/);
  for (const text of [csv, out, lines[0].desc]) assert.doesNotMatch(text, FRENCH);
});

test("cœur : libellés construits par la fonction de texte du pays", () => {
  assert.equal(C.STAGE_LABELS.won, "[eng.stage.won]");
  assert.equal(C.CHARGE_LABELS.month, "[eng.every.month]");
  assert.equal(C.FLOW_KINDS.receipt, "[eng.flow.receipt]");
  assert.deepEqual(C.AGING.map((a) => a[1]), ["[eng.aging.notDue]", "[eng.aging.d30]", "[eng.aging.d60]", "[eng.aging.d90]", "[eng.aging.more]"]);
});
