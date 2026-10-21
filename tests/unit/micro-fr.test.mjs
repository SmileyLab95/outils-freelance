// Tests du moteur « micro-entreprise » : taux par activité et montant à mettre de côté sur un paiement
// (documentation/15-guides-gestion.md, § 4). Exemples calculés à la main.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const M = require("../../src/assets/engines/micro-fr.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url)));
const rules = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const bnc = M.activity(rules, "liberal_bnc"), bic = M.activity(rules, "services_bic"), vente = M.activity(rules, "vente");

test("taux lus dans les règles : une seule source pour le simulateur et le calculateur", () => {
  assert.deepEqual([bnc.cotisations, bnc.cfp, bnc.vl, bnc.abattement], [0.256, 0.002, 0.022, 0.34]);
  assert.deepEqual([M.cotisationRate(bnc, 0), M.cotisationRate(bnc, 50), M.cotisationRate(bnc, 25)], [0.256, 0.128, 0.192]);
  assert.throws(() => M.activity(rules, "inconnue"), /inconnue/);
  for (const key of ["ca_declare_hors_taxes", "tva_taux_metropole", "pas_micro_acomptes"]) {
    assert.ok(/^https:\/\/www\.(impots|economie)\.gouv\.fr\/|^https:\/\/www\.autoentrepreneur\.urssaf\.fr\//.test(data.values[key].source), key);
  }
  assert.deepEqual(rules.tva_taux_metropole, { normal: 0.2, intermediaire: 0.1, reduit: 0.055, particulier: 0.021 });
});

test("franchise, libéral, taux du foyer de 7,5 % : 1 500 € encaissés", () => {
  // Cotisations 1 500 × 25,6 % = 384 ; formation 1 500 × 0,2 % = 3 ; base de l'acompte 1 500 × 66 % = 990 ;
  // impôt estimé 990 × 7,5 % = 74,25 ; total 461,25 ; reste 1 038,75.
  const r = M.setAside({ amount: 1500, vatRate: 0, activity: bnc, acre: 0, vl: false, pasRate: 0.075 });
  assert.deepEqual(r, { ht: 1500, vat: 0, cotisations: 384, cfp: 3, taxable: 990, tax: 74.25, taxMode: "pas", total: 461.25, keep: 1038.75, share: 0.3075 });
});

test("TVA à 20 % comprise : la TVA est reversée, les cotisations portent sur le hors taxes", () => {
  // 1 800 € TTC = 1 500 € HT + 300 € de TVA ; services BIC : 21,2 % = 318 ; formation 0,1 % = 1,50.
  const r = M.setAside({ amount: 1800, vatRate: rules.tva_taux_metropole.normal, activity: bic, acre: 0, vl: false, pasRate: null });
  assert.equal(r.ht, 1500);
  assert.equal(r.vat, 300);
  assert.equal(r.cotisations, 318);
  assert.equal(r.cfp, 1.5);
  assert.equal(r.tax, null, "taux du foyer non renseigné : impôt non calculé");
  assert.equal(r.taxMode, "unknown");
  assert.equal(r.taxable, 750);
  assert.equal(r.total, 619.5);
  assert.equal(r.keep, 1180.5);
});

test("versement libératoire et ACRE : taux minoré publié, impôt au taux du versement", () => {
  // Vente, 1 000 € : ACRE −50 % → 6,2 % = 62 ; formation 0,1 % = 1 ; versement libératoire 1 % = 10.
  const r = M.setAside({ amount: 1000, vatRate: 0, activity: vente, acre: 50, vl: true, pasRate: 0.2 });
  assert.deepEqual([r.cotisations, r.cfp, r.tax, r.taxMode, r.total, r.keep], [62, 1, 10, "vl", 73, 927]);
  assert.equal(M.setAside({ amount: 1000, vatRate: 0, activity: vente, acre: 25, vl: true }).cotisations, 93);
});

test("arrondis au centime : TVA à 5,5 % et montants à virgule", () => {
  // 100 € TTC à 5,5 % : HT = 94,786… → 94,79 ; TVA 5,21. Libéral : 94,79 × 25,6 % = 24,266… → 24,27.
  const r = M.setAside({ amount: 100, vatRate: rules.tva_taux_metropole.reduit, activity: bnc, acre: 0, vl: false, pasRate: 0 });
  assert.deepEqual([r.ht, r.vat, r.cotisations, r.cfp, r.tax], [94.79, 5.21, 24.27, 0.19, 0]);
  assert.equal(Math.round((r.vat + r.cotisations + r.cfp) * 100) / 100, r.total);
  // Arrondi au plus proche : 0,05 € × 25,6 % = 0,0128 → 0,01 ; demi-centime 12,50 € × 0,2 % = 0,025 → 0,03.
  assert.equal(M.setAside({ amount: 0.05, vatRate: 0, activity: bnc, acre: 0 }).cotisations, 0.01);
  assert.equal(M.setAside({ amount: 12.5, vatRate: 0, activity: bnc, acre: 0 }).cfp, 0.03);
});

test("entrées invalides signalées ensemble ; taux du foyer ignoré avec le versement libératoire", () => {
  for (const amount of [-1, NaN, Infinity, "1500", null, 1e9 + 1]) assert.deepEqual(M.setAside({ amount, activity: bnc }), { errors: ["amount"] }, String(amount));
  for (const pasRate of [-0.01, 1.01, NaN, "7"]) assert.deepEqual(M.setAside({ amount: 100, activity: bnc, pasRate }), { errors: ["pasRate"] }, String(pasRate));
  assert.deepEqual(M.setAside({ amount: NaN, activity: bnc, pasRate: 2 }), { errors: ["amount", "pasRate"] });
  assert.equal(M.setAside({ amount: 100, activity: bnc, vl: true, pasRate: NaN }).taxMode, "vl");
  assert.throws(() => M.setAside({ amount: 100, vatRate: -1, activity: bnc }), /TVA/);
  assert.throws(() => M.setAside({ amount: 100, activity: bnc, acre: 30 }), /ACRE/);
  const zero = M.setAside({ amount: -0, vatRate: 0, activity: bnc, acre: 0, pasRate: -0 });
  assert.deepEqual([zero.total, zero.keep, zero.share], [0, 0, 0]);
  assert.ok(Object.is(zero.keep, 0) && Object.is(zero.vat, 0) && Object.is(zero.tax, 0), "jamais de « -0,00 € »");
});

test("petit paiement : pas d'abattement minimum (annuel) ; versement libératoire avec TVA", () => {
  // 200 € en libéral, taux du foyer de 10 % : base 200 × 66 % = 132 ; impôt 13,20 (l'abattement minimum de 305 €
  // est annuel et ne s'applique pas à un paiement).
  const small = M.setAside({ amount: 200, vatRate: 0, activity: bnc, acre: 0, pasRate: 0.1 });
  assert.deepEqual([small.taxable, small.tax], [132, 13.2]);
  // 1 200 € TTC à 20 %, services BIC, versement libératoire : HT 1 000 ; TVA 200 ; cotisations 212 ; formation 1 ;
  // versement 17 ; total 430.
  const r = M.setAside({ amount: 1200, vatRate: 0.2, activity: bic, acre: 0, vl: true });
  assert.deepEqual([r.ht, r.vat, r.cotisations, r.cfp, r.tax, r.total], [1000, 200, 212, 1, 17, 430]);
});

test("versement libératoire : les deux clés des règles concordent", () => {
  const map = { vente: "vente", services_bic: "services_bic", artisan: "services_bic", liberal_bnc: "bnc", cipav: "bnc" };
  for (const [key, vlKey] of Object.entries(map)) assert.equal(M.activity(rules, key).vl, rules.versement_liberatoire_taux[vlKey], key);
});

test("la page reprend les taux et les règles (une seule source : data/rules/fr.json)", () => {
  const page = readFileSync(new URL("../../content/fr/combien-mettre-de-cote-auto-entrepreneur.html", import.meta.url), "utf8").replace(/[  ]/g, " ");
  const meta = JSON.parse(page.match(/<!--(\{.*?\})-->/s)[1]);
  for (const key of ["micro_activities", "ca_declare_hors_taxes", "tva_taux_metropole", "pas_micro_acomptes", "versement_liberatoire_taux", "cfe_echeance"]) {
    assert.ok(meta.sources.includes(key), `source affichée : ${key}`);
  }
  const pct = (rate) => (Math.round(rate * 1000) / 10).toString().replace(".", ",") + " %";
  // Tableau des taux : chaque ligne comparée aux règles de son activité (cotisations, versement, abattement).
  const rows = Object.fromEntries([...page.matchAll(/<tr><td>([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><\/tr>/g)].map((m) => [m[1], m.slice(2)]));
  const table = { "Vente de marchandises, restauration, hébergement": ["vente"],
    "Prestations de services commerciales ou artisanales (BIC)": ["services_bic", "artisan"],
    "Professions libérales (BNC)": ["liberal_bnc"], "Professions libérales affiliées à la Cipav": ["cipav"] };
  assert.equal(Object.keys(rows).length, Object.keys(table).length, "une ligne par activité");
  for (const [label, keys] of Object.entries(table)) {
    for (const key of keys) {
      const a = M.activity(rules, key);
      assert.deepEqual(rows[label], [pct(a.cotisations), pct(a.vl), Math.round(a.abattement * 100) + " %"], `${label} (${key})`);
    }
  }
  // Chiffres de la FAQ et du texte, recalculés depuis les règles.
  const all = ["vente", "services_bic", "artisan", "liberal_bnc", "cipav"].map((k) => M.activity(rules, k));
  const range = (xs) => `de ${pct(Math.min(...xs))} à ${pct(Math.max(...xs))}`;
  assert.ok(page.includes(range(all.map((a) => a.cotisations))), "fourchette des cotisations");
  assert.ok(page.includes(range(all.map((a) => a.cfp))), "fourchette de la formation professionnelle");
  const total = Math.round((bnc.cotisations + bnc.cfp + bnc.vl) * 1000) / 1000;
  assert.ok(page.includes(`${pct(total)} (${pct(bnc.cotisations)} + ${pct(bnc.cfp)} + ${pct(bnc.vl)})`), "exemple du libéral : " + pct(total));
  assert.ok(rules.cfe_echeance.includes("15 décembre") && page.includes("au plus tard le 15 décembre"), "date de la CFE");
  assert.equal(rules.acre_date_bascule, "2026-07-01");
  assert.ok(page.includes("avant le 1er juillet 2026") && page.includes("à partir du 1er juillet 2026"), "date de bascule de l'ACRE");
  assert.equal(meta.id, "set-aside", "même identifiant que la page américaine (liens entre pays)");
});

test("taux de TVA : les pages proposent les taux des règles (tva_taux_metropole)", () => {
  const read = (f) => readFileSync(new URL("../../content/fr/" + f, import.meta.url), "utf8");
  const tva = read("calcul-tva-ht-ttc.html"), setAside = read("combien-mettre-de-cote-auto-entrepreneur.html");
  for (const [key, rate] of Object.entries(rules.tva_taux_metropole)) {
    const p = Math.round(rate * 1000) / 10, label = p.toString().replace(".", ",") + " %";
    assert.ok(tva.includes(`name="rate" value="${p}"`) && tva.includes(`<span>${label}</span>`), `calcul de TVA : ${label}`);
    assert.ok(setAside.includes(`<option value="${key}">TVA à ${label} comprise</option>`), `à mettre de côté : ${label}`);
  }
  assert.ok(JSON.parse(tva.match(/<!--(\{.*?\})-->/s)[1]).sources.includes("tva_taux_metropole"), "calcul de TVA : source affichée");
});
