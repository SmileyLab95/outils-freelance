// Tests du moteur « augmenter ses tarifs » (documentation/28-hausse-de-tarifs.md) : exemples calculés à la main,
// perte de volume supportable, inflation et cas limites.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const P = createRequire(import.meta.url)("../../src/assets/engines/price-increase.js");
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg} : ${a} au lieu de ${b}`);

test("hausse en pourcentage : nouveau tarif, chiffre d'affaires et perte supportable", () => {
  // 500 € par jour, +10 %, 15 jours par mois : 550 €, 7 500 € puis 8 250 € ; on peut perdre 1/11 du volume.
  const r = P.compute({ rate: 500, mode: "percent", increase: 10, volume: 15, loss: 0 });
  assert.deepEqual([r.valid, r.newRate, r.before, r.after, r.change], [true, 550, 7500, 8250, 750]);
  near(r.increase, 0.1, "hausse");
  near(r.changeShare, 0.1, "écart");
  near(r.breakEvenLoss, 1 / 11, "perte supportable");
  assert.equal(r.inflationRate, null);
  assert.equal(r.realIncrease, null);
});

test("perte de volume : au seuil, le chiffre d'affaires ne bouge pas ; au-delà, il baisse", () => {
  // 100 $ → 125 $ : perte supportable de 20 %.
  const at = P.compute({ rate: 100, mode: "rate", newRate: 125, volume: 100, loss: 20 });
  near(at.breakEvenLoss, 0.2, "seuil");
  assert.equal(at.change, 0);
  assert.equal(P.compute({ rate: 100, mode: "rate", newRate: 125, volume: 100, loss: 30 }).change, -1250);
  assert.equal(P.compute({ rate: 100, mode: "rate", newRate: 125, volume: 100, loss: 10 }).change, 1250);
  assert.equal(P.compute({ rate: 100, mode: "rate", newRate: 125, volume: 100, loss: 150 }).after, 0, "perte plafonnée à 100 %");
});

test("inflation saisie : tarif qui la suit et hausse réelle", () => {
  // 400 £, +5 %, inflation de 3,5 % : 414 £ pour suivre ; hausse réelle 1,05 / 1,035 − 1.
  const r = P.compute({ rate: 400, mode: "percent", increase: 5, volume: 15, inflation: 3.5 });
  assert.equal(r.inflationRate, 414);
  near(r.realIncrease, 1.05 / 1.035 - 1, "hausse réelle");
  const below = P.compute({ rate: 400, mode: "percent", increase: 2, volume: 15, inflation: 3.5 });
  assert.ok(below.realIncrease < 0, "hausse inférieure à l'inflation : perte de pouvoir d'achat");
  assert.equal(P.compute({ rate: 400, mode: "percent", increase: 2, volume: 15, inflation: -1 }).inflationRate, 396);
  assert.equal(P.compute({ rate: 400, mode: "percent", increase: 2, volume: 15, inflation: "" }).inflationRate, null);
  assert.equal(P.compute({ rate: 400, mode: "percent", increase: 2, volume: 15, inflation: -100 }).inflationRate, null);
});

test("cas limites : tarif nul, baisse, nouveau tarif vide, arrondi au centime", () => {
  assert.deepEqual(P.compute({ rate: 0, mode: "percent", increase: 10 }), { valid: false });
  assert.deepEqual(P.compute({ rate: -50, mode: "percent", increase: 10 }), { valid: false });
  const down = P.compute({ rate: 100, mode: "percent", increase: -10, volume: 10 });
  assert.equal(down.newRate, 90);
  assert.equal(down.breakEvenLoss, null, "pas de seuil pour une baisse");
  assert.equal(P.compute({ rate: 100, mode: "rate", newRate: "", volume: 10 }).newRate, 0);
  assert.equal(P.compute({ rate: 100, mode: "percent", increase: -150, volume: 10 }).newRate, 0, "jamais négatif");
  assert.equal(P.compute({ rate: 85, mode: "percent", increase: 7, volume: 1 }).newRate, 90.95);
  assert.equal(P.compute({ rate: 33.33, mode: "percent", increase: 3.333, volume: 3 }).newRate, 34.44);
});

// Pages : champs, textes de l'outil, exemple de la FAQ recalculé par le moteur, lien vers le modèle d'email.
import { readFileSync } from "node:fs";
const page = (path) => {
  const html = readFileSync(new URL(`../../content/${path}`, import.meta.url), "utf8");
  return { html, L: JSON.parse(/<script type="application\/json" id="pi-data">([\s\S]*?)<\/script>/.exec(html)[1]),
           front: JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]) };
};
const PAGES = { "us/rate-increase-calculator.html": "us", "uk/rate-increase-calculator.html": "uk", "ca/rate-increase-calculator.html": "ca",
  "ca-fr/calculateur-hausse-tarifs.html": "ca-fr", "fr/augmenter-ses-tarifs.html": "fr" };
const IDS = ["pi-form", "pi-rate", "pi-unit", "pi-mode", "pi-increase-field", "pi-increase", "pi-new-rate-field", "pi-new-rate", "pi-volume",
  "pi-volume-label", "pi-loss", "pi-inflation", "pi-big", "pi-sub", "pi-results", "pi-before", "pi-after", "pi-change",
  "pi-inflation-rate-row", "pi-inflation-rate", "pi-real-row", "pi-real", "pi-breakeven"];
const KEYS = { per: ["hour", "day"], volume_label: ["hour", "day"], units: ["hour", "day"], sub: ["up", "down", "same"], breakeven: ["up", "none"] };

for (const [path, country] of Object.entries(PAGES)) {
  test(`${path} : champs, textes de l'outil, FAQ et lien vers le modèle d'annonce`, () => {
    const { html, L, front } = page(path);
    assert.equal(L.country, country);
    for (const id of IDS) assert.match(html, new RegExp(`id="${id}"`), id);
    for (const [group, keys] of Object.entries(KEYS)) assert.deepEqual(Object.keys(L[group]).sort(), [...keys].sort(), group);
    assert.ok(L.sub.up.includes("{pct}") && L.sub.down.includes("{pct}") && L.breakeven.up.includes("{pct}") && L.breakeven.up.includes("{unit}"));
    assert.ok(typeof L.invalid === "string" && typeof L.percent === "string");
    assert.equal(front.id, "raise");
    assert.ok(front.title.length <= 60 && front.description.length <= 160, "titre et description");
    assert.ok(front.faq.length >= 3 && front.faq.length <= 6, "FAQ de 3 à 6 questions");
    assert.match(html, /href="\{\{link:templates\}\}"/, "lien vers le modèle d'email");
    assert.match(html, /id="pi-inflation-hint">[^<]*<a href="https:\/\/www\.(bls\.gov|ons\.gov\.uk|statcan\.gc\.ca|insee\.fr)\//, "organisme statistique officiel");
    // Exemple de la FAQ : +10 % → 9,1 % de travail que l'on peut perdre.
    const r = P.compute({ rate: 100, mode: "percent", increase: 10, volume: 1 });
    const shown = (Math.round(r.breakEvenLoss * 1000) / 10).toString();
    const faq = front.faq.flat().join(" ");
    assert.ok(faq.includes(country.endsWith("fr") ? `${shown.replace(".", ",")} %` : `${shown}%`), `FAQ : ${shown}`);
  });
}

test("France : le modèle d'email d'annonce existe une seule fois, sur la page des modèles", () => {
  const html = readFileSync(new URL("../../content/fr/modeles-emails-freelance.html", import.meta.url), "utf8");
  assert.equal((html.match(/id="tpl-7"/g) || []).length, 1);
  assert.match(html, /<b>7\. Annoncer une hausse de tarifs<\/b>/);
  assert.match(html, /"title": "7 modèles/);
});
