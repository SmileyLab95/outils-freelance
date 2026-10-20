// Tests du moteur de facture commun (générateur public et Espace entrepreneur).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const inv = require("../../src/assets/engines/invoice-fr.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const fmt = {
  eur: (n) => money.format(n),
  num: (n) => new Intl.NumberFormat("fr-FR").format(n),
  date: (iso) => iso.split("-").reverse().join("/")
};
const base = () => ({
  type: "facture", number: "F2026-001", date: "2026-11-15", terms: 30, nature: "services",
  me: { name: "Camille Martin EI", siret: "123 456 789 00012", iban: "FR76 1234" },
  client: { name: "Studio Nova", address: "14 rue des Lilas", id: "812 345 678", pro: true },
  lines: [{ desc: "Site vitrine", qty: 1, price: 1800 }, { desc: "Rédaction", qty: 3, price: 150.5 }],
  vat: { franchise: true, rate: 20, place: "fr" }
});

test("totaux : franchise, TVA à 20 %, client de l'UE", () => {
  const doc = base();
  let t = inv.compute(doc);
  assert.equal(t.ht, 2251.5);
  assert.equal(t.ttc, 2251.5);
  doc.vat.franchise = false;
  t = inv.compute(doc);
  assert.equal(t.vat, 450.3);
  assert.equal(t.ttc, 2701.8);
  doc.vat.place = "eu";
  t = inv.compute(doc);
  assert.equal(t.vat, 0);
  assert.equal(t.noVat, true);
});

test("lignes incomplètes ignorées dans le total", () => {
  const t = inv.compute({ lines: [{ desc: "A", qty: 2, price: 100 }, { desc: "B", qty: NaN, price: 50 }] });
  assert.equal(t.ht, 200);
});

test("mention de franchise selon la date du document", () => {
  assert.equal(inv.franchiseMention("2026-12-31", R), "TVA non applicable, art. 293 B du CGI.");
  assert.equal(inv.franchiseMention("2027-01-01", R), "TVA non applicable, art. L. 233-3 du CIBS (ex-art. 293 B du CGI).");
});

test("mentions d'une facture : virement, escompte, pénalités et 40 € pour un client professionnel", () => {
  const doc = base();
  const m = inv.mentions(doc, inv.compute(doc), R, fmt);
  assert.equal(m[0], "TVA non applicable, art. 293 B du CGI.");
  assert.match(m[1], /^Paiement par virement au plus tard le 15\/12\/2026 · IBAN FR76 1234 · Référence : F2026-001\.$/);
  assert.equal(m[2], "Pas d'escompte pour paiement anticipé.");
  assert.match(m[3], /indemnité forfaitaire pour frais de recouvrement de 40 €/);
  doc.client.pro = false;
  assert.equal(inv.mentions(doc, inv.compute(doc), R, fmt).length, 3, "pas de pénalités pour un particulier");
});

test("mention de paiement : échéance datée, ou à réception si le délai est nul", () => {
  const doc = base();
  doc.me.iban = "";
  assert.match(inv.mentions(doc, inv.compute(doc), R, fmt)[1], /^Paiement au plus tard le 15\/12\/2026\.$/);
  doc.terms = 0;
  assert.equal(inv.mentions(doc, inv.compute(doc), R, fmt)[1], "Paiement à réception.");
  doc.me.iban = "FR76 1234";
  assert.match(inv.mentions(doc, inv.compute(doc), R, fmt)[1], /^Paiement par virement à réception · IBAN FR76 1234/);
});

test("mentions : autoliquidation, hors UE, option débits, devis, avoir", () => {
  const doc = base();
  doc.vat.place = "eu";
  assert.match(inv.mentions(doc, inv.compute(doc), R, fmt)[0], /^Autoliquidation : TVA due par le preneur \(art\. 196/);
  doc.vat.place = "world";
  assert.match(inv.mentions(doc, inv.compute(doc), R, fmt)[0], /art\. 44 de la directive/);
  Object.assign(doc.vat, { place: "fr", franchise: false, debits: true });
  assert.equal(inv.mentions(doc, inv.compute(doc), R, fmt)[0], "Option pour le paiement de la taxe d'après les débits.");
  const devis = Object.assign(base(), { type: "devis", validity: 30 });
  assert.match(inv.mentions(devis, inv.compute(devis), R, fmt).pop(), /^Devis valable jusqu'au 15\/12\/2026\./);
  const avoir = Object.assign(base(), { type: "avoir", origin: { number: "F2026-001", date: "2026-11-15" } });
  assert.equal(inv.mentions(avoir, inv.compute(avoir), R, fmt)[0], "Avoir relatif à la facture n° F2026-001 du 15/11/2026.");
});

test("rendu : titre, numéro, SIREN du client, valeurs échappées", () => {
  const doc = base();
  doc.client.name = "<script>alert(1)</script>";
  const html = inv.render(doc, R, fmt);
  assert.match(html, /FACTURE<span>N° F2026-001<\/span>/);
  assert.match(html, /SIREN : 812 345 678/);
  assert.ok(!html.includes("<script>"), "le nom du client est échappé");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.match(inv.render(Object.assign(base(), { type: "avoir" }), R, fmt), /AVOIR<span>/);
});

test("ajout de jours aux dates (fin de mois, années bissextiles)", () => {
  assert.equal(inv.addDays("2026-01-31", 30), "2026-03-02");
  assert.equal(inv.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(inv.addDays("", 30), "");
});

test("revue : montants vides (null) ignorés ; indemnité forfaitaire lue dans les règles", () => {
  assert.equal(inv.compute({ lines: [{ desc: "A", qty: 1, price: null }, { desc: "B", qty: 2, price: 10 }] }).ht, 20);
  const doc = base();
  const m = inv.mentions(doc, inv.compute(doc), Object.assign({}, R, { indemnite_forfaitaire_recouvrement: 45 }), fmt);
  assert.match(m[3], /recouvrement de 45 €/);
});
