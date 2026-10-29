// Jours fériés, jours ouvrés et délais (documentation/42-jours-ouvres.md) : Pâques, jours fériés des fiches officielles,
// exemples de la fiche F35697 refaits, décomptes d'une période, page du calculateur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ruleValues, ruleEntries } from "./regles.mjs";

const require = createRequire(import.meta.url);
const D = require("../../src/assets/engines/jours.js");
const R = ruleValues("fr");
const o = { rules: R };
const dates = (list) => list.map((h) => h.date);

// ------------------------------------------------------------------------------------------------------------
// Pâques et jours fériés

test("Pâques : lundis de Pâques publiés (F2405 pour 2026 et 2027, gov.uk de 2019 à 2028)", () => {
  const monday = { 2019: "04-22", 2020: "04-13", 2021: "04-05", 2022: "04-18", 2023: "04-10", 2024: "04-01", 2025: "04-21",
    2026: "04-06", 2027: "03-29", 2028: "04-17" };
  for (const [y, md] of Object.entries(monday)) assert.equal(D.iso(D.day(D.easter(Number(y))) + 1), `${y}-${md}`, `Pâques ${y}`);
  for (let y = D.MIN_YEAR; y <= D.MAX_YEAR; y++) {
    const e = D.easter(y);
    assert.equal(D.weekday(D.day(e)), 0, `dimanche ${y}`);
    assert.ok(e.slice(5) >= "03-22" && e.slice(5) <= "04-25", `entre le 22 mars et le 25 avril ${y}`);
  }
});

test("jours fériés 2026 et 2027 = tableaux de la fiche F2405 (métropole, Alsace-Moselle, outre-mer)", () => {
  assert.deepEqual(dates(D.holidays(2026, R, "metropole")), ["2026-01-01", "2026-04-06", "2026-05-01", "2026-05-08", "2026-05-14",
    "2026-05-25", "2026-07-14", "2026-08-15", "2026-11-01", "2026-11-11", "2026-12-25"]);
  assert.deepEqual(dates(D.holidays(2027, R, "metropole")), ["2027-01-01", "2027-03-29", "2027-05-01", "2027-05-06", "2027-05-08",
    "2027-05-17", "2027-07-14", "2027-08-15", "2027-11-01", "2027-11-11", "2027-12-25"]);
  assert.deepEqual(dates(D.holidays(2026, R, "alsace_moselle")).filter((d) => !dates(D.holidays(2026, R, "metropole")).includes(d)),
    ["2026-04-03", "2026-12-26"], "Vendredi saint et 2e jour de Noël");
  assert.deepEqual(dates(D.holidays(2027, R, "alsace_moselle")).slice(1, 3), ["2027-03-26", "2027-03-29"]);
  const abolition = { guadeloupe: "05-27", guyane: "06-10", martinique: "05-22", mayotte: "04-27", reunion: "12-20", saint_barthelemy: "10-09",
    saint_martin: "05-27" };
  for (const [zone, md] of Object.entries(abolition)) {
    const list = D.holidays(2026, R, zone);
    assert.equal(list.length, 12, zone);
    assert.ok(list.some((h) => h.date === `2026-${md}` && /abolition de l'esclavage/i.test(h.name)), zone);
  }
  assert.deepEqual(D.holidays(1999, R, "metropole"), [], "hors des années couvertes");
  const E = ruleEntries("fr");
  assert.match(E.jours_feries.source, /F2405/);
  assert.match(E.jours_decompte.source, /F35697/);
});

// ------------------------------------------------------------------------------------------------------------
// Exemples de la fiche F35697

test("F35697 : 10 jours francs à compter du mardi 15 décembre 2026 → lundi 28 décembre 2026", () => {
  assert.deepEqual(D.addDays("2026-12-15", 10, "franc", o), { date: "2026-12-28", postponed: true, skipped: ["2026-12-25", "2026-12-26", "2026-12-27"] });
  assert.equal(D.addDays("2026-12-15", 10, "calendaire", o).date, "2026-12-25", "en jours calendaires, pas de report");
});

test("F35697 : délai de 7 jours commençant un lundi, mercredi férié, dans les quatre modes", () => {
  // Lundi 9 novembre 2026 : premier jour du délai (départ la veille), mercredi 11 novembre férié.
  const due = (mode) => D.addDays("2026-11-08", 7, mode, o).date;
  assert.equal(due("calendaire"), "2026-11-15", "dimanche : chaque jour compte");
  assert.equal(due("franc"), "2026-11-16", "7e jour un dimanche : reporté au lundi");
  assert.equal(due("ouvrable"), "2026-11-17", "ni dimanche ni jour férié : mardi suivant");
  assert.equal(due("ouvre"), "2026-11-18", "ni samedi, ni dimanche, ni jour férié : mercredi suivant");
  assert.deepEqual(D.addDays("2026-11-08", 7, "ouvre", o).skipped, ["2026-11-11", "2026-11-14", "2026-11-15"]);
});

test("F35697 : congés de juillet et de novembre 2026 comptés en jours ouvrés et ouvrables", () => {
  assert.equal(D.count("2026-07-13", "2026-07-17", o).ouvres, 4, "14 juillet chômé");
  assert.equal(D.count("2026-07-13", "2026-07-18", o).ouvrables, 5);
  assert.equal(D.count("2026-11-09", "2026-11-13", o).ouvres, 4, "11 novembre chômé");
  assert.equal(D.count("2026-11-09", "2026-11-14", o).ouvrables, 5);
  const worked = D.count("2026-07-13", "2026-07-17", { ...o, workHolidays: true });
  assert.equal(worked.ouvres, 5, "jour férié travaillé");
  assert.equal(worked.holidays[0].off, false, "14 juillet travaillé : pas « en moins »");
  assert.equal(D.count("2026-11-08", "2026-11-14", o).ouvrables, 5, "ni le dimanche 8 ni le mercredi 11 novembre");
});

// ------------------------------------------------------------------------------------------------------------
// Décomptes

test("année 2026 : 365 jours, 252 jours ouvrés, 9 jours fériés en semaine ; somme des mois = année", () => {
  const y = D.count("2026-01-01", "2026-12-31", o);
  assert.equal(y.calendar, 365);
  assert.equal(y.ouvres, 252);
  assert.equal(y.holidays.length, 11);
  assert.equal(y.holidays.filter((h) => h.off).length, 9, "15 août un samedi, 1er novembre un dimanche");
  let sum = 0;
  for (let m = 1; m <= 12; m++) {
    const last = new Date(Date.UTC(2026, m, 0)).getUTCDate();
    sum += D.count(`2026-${String(m).padStart(2, "0")}-01`, `2026-${String(m).padStart(2, "0")}-${last}`, o).ouvres;
  }
  assert.equal(sum, 252);
  assert.equal(D.count("2028-01-01", "2028-12-31", o).calendar, 366, "année bissextile");
  assert.equal(D.count("2026-05-01", "2026-05-31", o).ouvres, 17, "mai 2026 : 21 jours de semaine moins 4 fériés (1er, 8, 14 et 25 mai)");
});

test("semaine de travail : 4 jours, samedi travaillé ; zone Alsace-Moselle", () => {
  assert.equal(D.count("2026-01-01", "2026-12-31", { ...o, workdays: [] }).ouvres, 252, "aucun jour coché : du lundi au vendredi");
  const fourDays = D.count("2026-01-01", "2026-12-31", { ...o, workdays: [1, 2, 3, 4] });
  const fridays = D.count("2026-01-01", "2026-12-31", o).holidays.filter((h) => h.weekday === 5 && h.off).length;
  assert.equal(fourDays.ouvres, 252 - 52 + fridays, "sans les vendredis");
  const saturday = D.count("2026-08-10", "2026-08-16", { ...o, workdays: [1, 2, 3, 4, 5, 6] });
  assert.equal(saturday.ouvres, 5, "15 août férié un samedi travaillé : 5 jours");
  assert.equal(D.count("2026-12-21", "2026-12-27", { ...o, zone: "alsace_moselle" }).ouvres, 4, "Noël vendredi ; 26 décembre samedi");
  assert.equal(D.count("2026-03-30", "2026-04-05", { ...o, zone: "alsace_moselle" }).ouvres, 4, "Vendredi saint");
});

test("délais : zéro jour, début un vendredi, n invalide, dates invalides ou hors des années", () => {
  assert.equal(D.addDays("2026-10-29", 0, "ouvre", o).date, "2026-10-29");
  assert.equal(D.addDays("2026-10-31", 0, "franc", o).date, "2026-10-31", "zéro jour : pas de report, même un samedi");
  assert.equal(D.addDays("2026-10-30", 1, "ouvre", o).date, "2026-11-02", "vendredi + 1 jour ouvré = lundi");
  assert.equal(D.addDays("2026-10-30", 1, "ouvrable", o).date, "2026-10-31", "samedi");
  assert.equal(D.addDays("2026-10-31", 1, "ouvrable", o).date, "2026-11-02", "1er novembre férié et dimanche");
  assert.equal(D.addDays("2026-10-29", 1.5, "ouvre", o), null);
  assert.equal(D.addDays("2026-10-29", -1, "ouvre", o), null);
  assert.equal(D.addDays("2026-10-29", 3651, "ouvre", o), null);
  assert.equal(D.addDays("2026-02-31", 1, "ouvre", o), null, "31 février");
  assert.equal(D.addDays("2026-10-29", 1, "semaine", o), null, "mode inconnu");
  assert.equal(D.addDays("2100-12-01", 60, "ouvre", o), null, "sort des années couvertes");
  assert.equal(D.count("2026-10-29", "2026-10-28", o), null, "fin avant le début");
  assert.equal(D.count("1999-12-31", "2026-01-01", o), null);
  assert.deepEqual(D.count("2026-10-29", "2026-10-29", o), { calendar: 1, ouvrables: 1, ouvres: 1, holidays: [] });
});

// ------------------------------------------------------------------------------------------------------------
// Page du calculateur

const html = readFileSync(new URL("../../content/fr/calcul-jours-ouvres.html", import.meta.url), "utf8");
const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
const faq = front.faq.flat().join(" ");

test("page : en-tête, scripts, sources, menu « Fixer ses prix », lien depuis le calculateur de TJM", () => {
  assert.equal(front.id, "workdays");
  assert.deepEqual(front.scripts, ["engines/jours.js", "tools/jours.js"]);
  assert.equal(front.rules, "fr");
  assert.deepEqual(front.sources, ["jours_feries", "jours_decompte"]);
  assert.ok(front.title.length <= 60 && front.description.length <= 160, "titre et description");
  assert.ok(front.faq.length >= 3 && front.faq.length <= 6);
  const nav = JSON.parse(readFileSync(new URL("../../content/fr/site.json", import.meta.url), "utf8")).nav;
  assert.ok(nav.find((g) => g.key === "pricing").items.includes("workdays"));
  const tjm = readFileSync(new URL("../../content/fr/calculateur-tjm.html", import.meta.url), "utf8");
  assert.match(tjm, /"scripts": \["engines\/jours\.js", "tools\/tjm\.js"\]/);
  assert.match(tjm, /href="\{\{link:workdays\}\}"/);
  assert.match(tjm, /id="t-public" name="publicHolidays" value="8"/, "convention commune : 8 jours fériés, 148 jours facturables");
  const zones = [...html.matchAll(/<option value="(\w+)">/g)].map((m) => m[1]).filter((z) => z === "metropole" || z === "alsace_moselle" || z in R.jours_feries.abolition_esclavage);
  assert.equal(zones.length, 2 + Object.keys(R.jours_feries.abolition_esclavage).length, "un lieu par territoire des règles");
});

test("page : chiffres de la FAQ = moteur et règles", () => {
  const y = D.count("2026-01-01", "2026-12-31", o);
  const weekdays = D.count("2026-01-01", "2026-12-31", { ...o, rules: { jours_feries: { fetes_legales: [], alsace_moselle: [], abolition_esclavage: {} } } }).ouvres;
  assert.ok(faq.includes(`${y.ouvres} jours ouvrés`) && faq.includes(`${weekdays} jours de semaine`) && faq.includes(`${y.holidays.filter((h) => h.off).length} jours fériés`));
  assert.equal(D.addDays("2026-12-15", 10, "franc", o).date, "2026-12-28");
  assert.ok(faq.includes("lundi 28 décembre 2026") && faq.includes("vendredi 25 décembre"));
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const said = { mayotte: "Mayotte", martinique: "Martinique", guadeloupe: "Guadeloupe", saint_martin: "Saint-Martin", guyane: "Guyane",
    saint_barthelemy: "Saint-Barthélemy", reunion: "La Réunion" };
  for (const [zone, md] of Object.entries(R.jours_feries.abolition_esclavage)) {
    const when = `${Number(md.slice(3))} ${months[Number(md.slice(0, 2)) - 1]}`;
    const i = faq.indexOf(when);
    assert.ok(i >= 0 && faq.slice(i, i + 60).includes(said[zone]), `${said[zone]} : ${when}`);
  }
  assert.ok(html.includes("2000 à 2100") && D.MIN_YEAR === 2000 && D.MAX_YEAR === 2100);
});
