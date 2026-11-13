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

// ------------------------------------------------------------------------------------------------------------
// Royaume-Uni : liste publiée par GOV.UK (data/rules/uk.json, public_holidays)

const UK = ruleValues("uk");
const uk = (zone) => ({ rules: UK, zone });
const ukHtml = readFileSync(new URL("../../content/uk/working-days-calculator.html", import.meta.url), "utf8");
const ukFront = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(ukHtml)[1]);
const ukFaq = ukFront.faq.flat().join(" ");

test("Royaume-Uni : années et régions de la liste, 2026 = GOV.UK pour les trois régions", () => {
  assert.deepEqual(D.years(UK), { min: 2024, max: 2028 });
  assert.deepEqual(D.zones(UK), ["england-and-wales", "scotland", "northern-ireland"]);
  assert.deepEqual(D.years(R), { min: 2000, max: 2100 });
  assert.deepEqual(dates(D.holidays(2026, UK, "england-and-wales")), ["2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25",
    "2026-08-31", "2026-12-25", "2026-12-28"]);
  assert.deepEqual(dates(D.holidays(2026, UK, "scotland")), ["2026-01-01", "2026-01-02", "2026-04-03", "2026-05-04", "2026-05-25",
    "2026-06-15", "2026-08-03", "2026-11-30", "2026-12-25", "2026-12-28"]);
  assert.deepEqual(dates(D.holidays(2026, UK, "northern-ireland")), ["2026-01-01", "2026-03-17", "2026-04-03", "2026-04-06", "2026-05-04",
    "2026-05-25", "2026-07-13", "2026-08-31", "2026-12-25", "2026-12-28"]);
  assert.equal(D.holidays(2026, UK, "scotland").find((h) => h.date === "2026-06-15").name, "World Cup bank holiday");
  assert.ok(UK.public_holidays["england-and-wales"]["2026"].find((h) => h.date === "2026-12-28").substitute, "Boxing Day : jour de remplacement");
  assert.deepEqual(D.holidays(2026, UK, "england-and-wales").filter((h) => h.substitute).map((h) => [h.date, h.name]), [["2026-12-28", "Boxing Day"]],
    "drapeau transmis par le moteur");
  assert.ok(D.holidays(2026, R, "alsace_moselle").every((h) => h.substitute === false), "France : pas de jour de remplacement");
  for (const [zone, years] of Object.entries(UK.public_holidays)) {
    for (const [y, list] of Object.entries(years)) {
      assert.ok(list.every((h) => h.date.startsWith(y) && D.weekday(D.day(h.date)) >= 1 && D.weekday(D.day(h.date)) <= 5), `${zone} ${y} : en semaine`);
      assert.deepEqual(list.map((h) => h.date), list.map((h) => h.date).slice().sort(), `${zone} ${y} : dans l'ordre`);
      assert.ok(list.some((h) => h.title === "Good Friday" && h.date === D.iso(D.day(D.easter(Number(y))) - 2)), `${zone} ${y} : Vendredi saint = Pâques − 2`);
    }
  }
  assert.deepEqual(D.holidays(2029, UK, "scotland"), [], "année pas encore publiée");
  assert.deepEqual(D.years({ public_holidays: { a: { 2027: [], 2025: [], 2026: [] } } }), { min: 2025, max: 2027 }, "années dans le désordre");
  assert.equal(D.years({}), null, "sans jours fériés dans les règles");
  assert.equal(D.count("2026-01-01", "2026-01-31", { rules: {} }), null);
});

test("Royaume-Uni : jours ouvrés 2026 (253, 251, 251), années non couvertes refusées, délais", () => {
  assert.equal(D.count("2026-01-01", "2026-12-31", uk("england-and-wales")).ouvres, 253);
  assert.equal(D.count("2026-01-01", "2026-12-31", uk("scotland")).ouvres, 251);
  assert.equal(D.count("2026-01-01", "2026-12-31", uk("northern-ireland")).ouvres, 251);
  assert.equal(D.count("2026-01-01", "2026-12-31", { rules: UK }).ouvres, 253, "Angleterre et pays de Galles par défaut");
  assert.equal(D.count("2028-12-01", "2029-01-31", uk("scotland")), null, "2029 pas encore publié");
  assert.equal(D.addDays("2026-12-15", 10, "ouvre", uk("england-and-wales")).date, "2026-12-31", "Noël et Boxing Day (lundi 28) sautés");
  assert.equal(D.addDays("2026-12-24", 1, "ouvre", uk("england-and-wales")).date, "2026-12-29");
  assert.equal(D.addDays("2028-12-20", 20, "ouvre", uk("england-and-wales")), null, "sort de 2028");
  assert.equal(D.count("2023-12-01", "2024-01-31", uk("scotland")), null, "2023 pas dans la liste");
  assert.equal(D.addDays("2028-12-29", 3, "franc", uk("england-and-wales")), null, "report examiné en 2029 : non couvert");
  assert.equal(D.addDays("2100-12-31", 1, "calendaire", o), null, "au-delà de 2100");
  assert.equal(D.addDays("2028-12-20", 20, "calendaire", uk("england-and-wales")).date, "2029-01-09", "jours calendaires : pas besoin des jours fériés");
});

test("Royaume-Uni : page, menu, chiffres de la FAQ = règles, aide du day rate", () => {
  assert.equal(ukFront.id, "workdays");
  assert.deepEqual(ukFront.scripts, ["engines/jours.js", "tools/jours.js"]);
  assert.equal(ukFront.rules, "uk");
  assert.deepEqual(ukFront.sources, ["public_holidays"]);
  assert.ok(ukFront.title.length <= 60 && ukFront.description.length <= 160);
  const nav = JSON.parse(readFileSync(new URL("../../content/uk/site.json", import.meta.url), "utf8")).nav;
  assert.ok(nav.find((g) => g.key === "pricing").items.includes("workdays"));
  const options = [...ukHtml.matchAll(/<option value="([\w-]+)">/g)].map((m) => m[1]);
  for (const zone of D.zones(UK)) assert.ok(options.includes(zone), zone);
  assert.deepEqual([...ukHtml.matchAll(/<select id="jo-mode"[\s\S]*?<\/select>/g)][0][0].match(/value="(\w+)"/g), ['value="ouvre"', 'value="calendaire"'], "pas de jours francs ni ouvrables");
  assert.match(ukHtml, /id="jo-year" name="year" min="2024" max="2028"/);
  const ew = D.count("2026-01-01", "2026-12-31", uk("england-and-wales"));
  assert.ok(ukFaq.includes(`${ew.ouvres} working days`) && ukFaq.includes(`minus ${ew.holidays.length} bank holidays`) &&
    ukFaq.includes(`${D.holidays(2026, UK, "scotland").length} bank holidays in 2026`) && ukFaq.includes("Monday 28 December") && ukFaq.includes("Monday 15 June 2026"));
  const data = JSON.parse(/id="jours-data">([\s\S]*?)<\/script>/.exec(ukHtml)[1]);
  const frData = JSON.parse(/id="jours-data">([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.deepEqual(Object.keys(data).filter((k) => !["store", "sep", "substitute", "explain_postponed", "explain_not_postponed"].includes(k)).sort(),
    Object.keys(frData).filter((k) => !["explain_postponed", "explain_not_postponed"].includes(k)).sort(), "mêmes textes dans les deux langues");
  assert.deepEqual(Object.keys(data.modes), ["ouvre", "calendaire"]);
  assert.equal(data.substitute, " (substitute day)", "libellé de GOV.UK");
  const rate = readFileSync(new URL("../../content/uk/day-rate-calculator.html", import.meta.url), "utf8");
  assert.match(rate, /"engines\/jours\.js", "tools\/uk-rate\.js"\]/);
  assert.match(rate, /href="\{\{link:workdays\}\}"/);
  assert.match(rate, /id="d-bank" name="bank" value="8"/);
});

// ------------------------------------------------------------------------------------------------------------
// États-Unis : jours fériés fédéraux publiés par OPM (data/rules/us.json, public_holidays), dates observées

const US = ruleValues("us");
const us = { rules: US, zone: "federal" };
const usHtml = readFileSync(new URL("../../content/us/business-days-calculator.html", import.meta.url), "utf8");
const usFront = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(usHtml)[1]);
const usFaq = usFront.faq.flat().join(" ");
const usDay = (iso, opts) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

test("États-Unis : années, zone, 2026 et 2027 = tableaux d'OPM (dates observées, rangées à leur vraie date)", () => {
  assert.deepEqual(D.years(US), { min: 2024, max: 2030 });
  assert.deepEqual(D.zones(US), ["federal"]);
  assert.deepEqual(dates(D.holidays(2026, US, "federal")), ["2026-01-01", "2026-01-19", "2026-02-16", "2026-05-25", "2026-06-19",
    "2026-07-03", "2026-09-07", "2026-10-12", "2026-11-11", "2026-11-26", "2026-12-25"]);
  assert.deepEqual(dates(D.holidays(2027, US, "federal")), ["2027-01-01", "2027-01-18", "2027-02-15", "2027-05-31", "2027-06-18",
    "2027-07-05", "2027-09-06", "2027-10-11", "2027-11-11", "2027-11-25", "2027-12-24", "2027-12-31"]);
  assert.deepEqual(dates(D.holidays(2027, US, "federal").filter((h) => h.substitute)), ["2027-06-18", "2027-07-05", "2027-12-24", "2027-12-31"]);
  assert.equal(D.holidays(2027, US, "federal").at(-1).name, "New Year’s Day", "New Year's Day 2028 observé le vendredi 31 décembre 2027");
  assert.equal(D.holidays(2028, US, "federal")[0].date, "2028-01-17", "2028 commence par le Birthday of Martin Luther King, Jr.");
  const sizes = Object.fromEntries(Object.entries(US.public_holidays.federal).map(([y, list]) => [y, list.length]));
  assert.deepEqual(sizes, { 2024: 11, 2025: 11, 2026: 11, 2027: 12, 2028: 10, 2029: 11, 2030: 11 });
  for (const [y, list] of Object.entries(US.public_holidays.federal)) {
    assert.ok(list.every((h) => h.date.startsWith(y) && D.weekday(D.day(h.date)) >= 1 && D.weekday(D.day(h.date)) <= 5), `${y} : en semaine`);
    assert.deepEqual(list.map((h) => h.date), list.map((h) => h.date).slice().sort(), `${y} : dans l'ordre`);
    assert.ok(!list.some((h) => /Inauguration/.test(h.title)), `${y} : sans Inauguration Day`);
  }
  assert.deepEqual(D.holidays(2031, US, "federal"), [], "année pas encore publiée");
  assert.match(ruleEntries("us").public_holidays.source, /^https:\/\/www\.opm\.gov\//);
});

test("États-Unis : contrôle de la transcription (5 U.S.C. 6103 : dates légales et report du samedi et du dimanche)", () => {
  // Jours fixes : samedi → vendredi précédent, dimanche → lundi suivant ; jours mobiles : n-ième jour de la semaine du mois.
  const fixed = { "New Year’s Day": "01-01", "Juneteenth National Independence Day": "06-19", "Independence Day": "07-04",
    "Veterans Day": "11-11", "Christmas Day": "12-25" };
  const nth = { "Birthday of Martin Luther King, Jr.": [1, 1, 3], "Washington’s Birthday": [2, 1, 3], "Memorial Day": [5, 1, -1],
    "Labor Day": [9, 1, 1], "Columbus Day": [10, 1, 2], "Thanksgiving Day": [11, 4, 4] };
  const all = Object.values(US.public_holidays.federal).flat();
  for (let y = 2024; y <= 2030; y++) {
    for (const [title, md] of Object.entries(fixed)) {
      const legal = D.day(`${y}-${md}`), w = D.weekday(legal), observed = D.iso(legal + (w === 6 ? -1 : w === 0 ? 1 : 0));
      const found = all.find((h) => h.title === title && h.date === observed);
      assert.ok(found, `${title} ${y} : ${observed}`);
      assert.equal(found.substitute, observed !== D.iso(legal), `${title} ${y} : jour de remplacement`);
    }
    for (const [title, [month, weekday, k]] of Object.entries(nth)) {
      const days = [];
      for (let n = D.day(`${y}-${String(month).padStart(2, "0")}-01`); D.iso(n).slice(5, 7) === String(month).padStart(2, "0"); n++) {
        if (D.weekday(n) === weekday) days.push(D.iso(n));
      }
      const expected = k > 0 ? days[k - 1] : days[days.length - 1];
      assert.ok(all.some((h) => h.title === title && h.date === expected && !h.substitute), `${title} ${y} : ${expected}`);
    }
  }
  assert.equal(all.length, 7 * 11, "11 jours par an, rien d'autre");
});

test("États-Unis : jours ouvrés (250 en 2026), délais, années non couvertes", () => {
  const y = D.count("2026-01-01", "2026-12-31", us);
  assert.equal(y.ouvres, 250);
  assert.equal(y.holidays.filter((h) => h.off).length, 11);
  assert.equal(D.count("2026-01-01", "2026-12-31", { rules: { public_holidays: { federal: { 2026: [] } } } }).ouvres, 261, "jours de semaine");
  assert.equal(D.count("2027-01-01", "2027-12-31", us).ouvres, 249, "2027 : 12 jours fériés observés");
  assert.equal(D.count("2028-01-01", "2028-12-31", us).ouvres, 250, "2028 : 260 jours de semaine, 10 jours fériés");
  assert.deepEqual(D.count("2026-07-01", "2026-07-10", us).holidays,
    [{ date: "2026-07-03", name: "Independence Day", substitute: true, weekday: 5, off: true }]);
  assert.equal(D.count("2026-01-01", "2026-12-31", { rules: US }).ouvres, 250, "zone fédérale par défaut");
  assert.equal(D.addDays("2026-06-26", 10, "ouvre", us).date, "2026-07-13", "Independence Day observé le vendredi 3 juillet");
  assert.equal(D.addDays("2027-12-23", 1, "ouvre", us).date, "2027-12-27", "Christmas Day observé le 24, puis le week-end");
  assert.equal(D.addDays("2027-12-30", 1, "ouvre", us).date, "2028-01-03", "New Year's Day observé le 31 décembre 2027");
  assert.equal(D.count("2030-12-01", "2031-01-31", us), null, "2031 pas encore publié");
  assert.equal(D.count("2023-12-01", "2024-01-31", us), null, "2023 pas dans la liste");
  assert.equal(D.addDays("2030-12-20", 20, "calendaire", us).date, "2031-01-09", "jours calendaires : pas besoin des jours fériés");
});

test("États-Unis : page, menu, chiffres de la FAQ = règles, aide du taux horaire", () => {
  assert.equal(usFront.id, "workdays");
  assert.deepEqual(usFront.scripts, ["engines/jours.js", "tools/jours.js"]);
  assert.equal(usFront.rules, "us");
  assert.deepEqual(usFront.sources, ["public_holidays"]);
  assert.ok(usFront.title.length <= 60 && usFront.description.length <= 160);
  assert.ok(usFront.faq.length >= 3 && usFront.faq.length <= 6);
  const pricing = JSON.parse(readFileSync(new URL("../../content/us/site.json", import.meta.url), "utf8")).nav.find((g) => g.key === "pricing");
  assert.deepEqual(pricing.items.slice(0, 2), ["rate", "workdays"]);
  assert.match(usHtml, new RegExp(`<input type="hidden" id="jo-zone" name="zone" value="${D.zones(US)[0]}">`));
  assert.deepEqual([...usHtml.matchAll(/<select id="jo-mode"[\s\S]*?<\/select>/g)][0][0].match(/value="(\w+)"/g), ['value="ouvre"', 'value="calendaire"']);
  assert.match(usHtml, new RegExp(`id="jo-year" name="year" min="${D.years(US).min}" max="${D.years(US).max}"`));
  const y = D.count("2026-01-01", "2026-12-31", us);
  assert.ok(usFaq.includes(`${y.ouvres} business days`) && usFaq.includes(`261 weekdays minus ${y.holidays.length} federal holidays`));
  for (const h of y.holidays) {
    const when = usDay(h.date, { month: "long", day: "numeric" });
    assert.ok(usFaq.includes(h.substitute ? `${h.name} (observed ${usDay(h.date, { weekday: "long" })}, ${when})` : `${h.name} (${when})`), `${h.name} : ${when}`);
  }
  for (const h of D.holidays(2027, US, "federal").filter((x) => x.substitute)) {
    const when = usDay(h.date, { weekday: "long", month: "long", day: "numeric" });
    assert.ok(usFaq.includes(h.date.endsWith("12-31") ? `${when}, 2027` : when), `${h.name} : ${when}`);
  }
  assert.ok(/Inauguration Day/.test(usFaq) && !D.holidays(2025, US, "federal").some((h) => /Inauguration/.test(h.name)));
  const data = JSON.parse(/id="jours-data">([\s\S]*?)<\/script>/.exec(usHtml)[1]);
  const frData = JSON.parse(/id="jours-data">([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.deepEqual(Object.keys(data).filter((k) => !["store", "sep", "substitute"].includes(k)).sort(),
    Object.keys(frData).filter((k) => !["explain_postponed", "explain_not_postponed"].includes(k)).sort(), "mêmes textes qu'en France");
  assert.deepEqual(Object.keys(data.modes), ["ouvre", "calendaire"]);
  assert.equal(data.store, "jours-us");
  assert.equal(data.substitute, " (observed)");
  const rate = readFileSync(new URL("../../content/us/hourly-rate-calculator.html", import.meta.url), "utf8");
  assert.match(rate, /"engines\/jours\.js", "tools\/us-rate\.js"\]/);
  assert.match(rate, /href="\{\{link:workdays\}\}"/);
  assert.match(rate, /id="h-holidays" name="holidays" value="10"/, "valeur par défaut inchangée");
});

// ------------------------------------------------------------------------------------------------------------
// Canada : jours fériés de chaque juridiction calculés par la règle de la loi (data/rules/ca.json, statutory_holidays),
// contrôlés par les tableaux datés publiés par la Colombie-Britannique (2023 à 2027) et l'Alberta (2026 à 2028).

const CA = ruleValues("ca");
const ca = (zone, lang) => ({ rules: CA, zone, lang });
const caEn = readFileSync(new URL("../../content/ca/business-days-calculator.html", import.meta.url), "utf8");
const caFr = readFileSync(new URL("../../content/ca-fr/calcul-jours-ouvrables.html", import.meta.url), "utf8");
const frontOf = (page) => JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(page)[1]);
const md = (zone, y) => D.holidays(y, CA, zone).map((h) => h.date.slice(5));

test("Canada : années, juridictions, tableaux datés de gov.bc.ca (2024 à 2027) et d'alberta.ca (2026 à 2028)", () => {
  assert.deepEqual(D.years(CA), { min: 2024, max: 2030 });
  assert.deepEqual(D.zones(CA), ["federal", "ab", "bc", "mb", "nb", "nl", "ns", "nt", "on", "pe", "qc-good-friday", "qc-easter-monday"]);
  // gov.bc.ca, « Statutory holidays », page mise à jour le 01/01/2026, lue le 13/11/2026 : 11 jours par an.
  const bc = {
    2024: ["01-01", "02-19", "03-29", "05-20", "07-01", "08-05", "09-02", "09-30", "10-14", "11-11", "12-25"],
    2025: ["01-01", "02-17", "04-18", "05-19", "07-01", "08-04", "09-01", "09-30", "10-13", "11-11", "12-25"],
    2026: ["01-01", "02-16", "04-03", "05-18", "07-01", "08-03", "09-07", "09-30", "10-12", "11-11", "12-25"],
    2027: ["01-01", "02-15", "03-26", "05-24", "07-01", "08-02", "09-06", "09-30", "10-11", "11-11", "12-25"],
  };
  for (const [y, list] of Object.entries(bc)) assert.deepEqual(md("bc", Number(y)), list, `Colombie-Britannique ${y}`);
  assert.deepEqual(D.holidays(2026, CA, "bc").map((h) => h.name), ["New Year’s Day", "Family Day", "Good Friday", "Victoria Day", "Canada Day",
    "British Columbia Day", "Labour Day", "National Day for Truth and Reconciliation", "Thanksgiving Day", "Remembrance Day", "Christmas Day"]);
  // alberta.ca, « Alberta general holidays », lue le 13/11/2026 : 9 jours par an.
  const ab = {
    2026: ["01-01", "02-16", "04-03", "05-18", "07-01", "09-07", "10-12", "11-11", "12-25"],
    2027: ["01-01", "02-15", "03-26", "05-24", "07-01", "09-06", "10-11", "11-11", "12-25"],
    2028: ["01-01", "02-21", "04-14", "05-22", "07-01", "09-04", "10-09", "11-11", "12-25"],
  };
  for (const [y, list] of Object.entries(ab)) assert.deepEqual(md("ab", Number(y)), list, `Alberta ${y}`);
  assert.deepEqual(D.holidays(2023, CA, "bc"), [], "2023 hors des années couvertes");
  assert.deepEqual(D.holidays(2031, CA, "on"), []);
  assert.deepEqual(D.holidays(2026, CA, "sk"), D.holidays(2026, CA, "federal"), "juridiction inconnue : la première des règles");
  const unordered = { statutory_holidays: { years: { min: 2026, max: 2026 }, zones: { x: [{ name: "B", date: "12-25" }, { name: "A", paques: -2 }, { name: "C", monday: [2, 3] }] } } };
  assert.deepEqual(D.holidays(2026, unordered, "x").map((h) => h.name), ["C", "A", "B"], "rangés par date, quel que soit l'ordre des règles");
  assert.match(ruleEntries("ca").statutory_holidays.source, /^https:\/\/laws-lois\.justice\.gc\.ca\//);
});

test("Canada : contrôle de la transcription (règle de chaque loi recalculée, nombre de jours par juridiction)", () => {
  // Règles des lois lues (documentation/42, § 10), refaites ici sans le moteur : jour du mois et jour de la semaine.
  const wd = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();
  const isMonday = (iso, from, to) => wd(iso) === 1 && Number(iso.slice(8)) >= from && Number(iso.slice(8)) <= to;
  const rules = {
    "Family Day": (d) => d.slice(5, 7) === "02" && isMonday(d, 15, 21), "Alberta Family Day": (d) => d.slice(5, 7) === "02" && isMonday(d, 15, 21),
    "Louis Riel Day": (d) => d.slice(5, 7) === "02" && isMonday(d, 15, 21), "Islander Day": (d) => d.slice(5, 7) === "02" && isMonday(d, 15, 21),
    "Nova Scotia Heritage Day": (d) => d.slice(5, 7) === "02" && isMonday(d, 15, 21),
    "Victoria Day": (d) => d.slice(5, 7) === "05" && isMonday(d, 18, 24), "National Patriots’ Day": (d) => d.slice(5, 7) === "05" && isMonday(d, 18, 24),
    "British Columbia Day": (d) => d.slice(5, 7) === "08" && isMonday(d, 1, 7), "New Brunswick Day": (d) => d.slice(5, 7) === "08" && isMonday(d, 1, 7),
    "First Monday in August": (d) => d.slice(5, 7) === "08" && isMonday(d, 1, 7),
    "Labour Day": (d) => d.slice(5, 7) === "09" && isMonday(d, 1, 7), "Thanksgiving Day": (d) => d.slice(5, 7) === "10" && isMonday(d, 8, 14),
    "Good Friday": (d, y) => d === D.iso(D.day(D.easter(y)) - 2), "Easter Monday": (d, y) => d === D.iso(D.day(D.easter(y)) + 1),
  };
  const fixed = { "New Year’s Day": "01-01", "National Indigenous Peoples Day": "06-21", "Canada Day (July 1)": "07-01",
    "Memorial Day (Canada Day)": "07-01", "National Day for Truth and Reconciliation": "09-30",
    "Orange Shirt Day (National Day for Truth and Reconciliation)": "09-30", "Remembrance Day": "11-11", "Christmas Day": "12-25",
    "Boxing Day": "12-26", "Boxing Day (December 26)": "12-26" };
  const sizes = { federal: 10, ab: 9, bc: 11, mb: 9, nb: 8, nl: 6, ns: 7, nt: 11, on: 9, pe: 8, "qc-good-friday": 8, "qc-easter-monday": 8 };
  for (const zone of D.zones(CA)) {
    for (let y = 2024; y <= 2030; y++) {
      const list = D.holidays(y, CA, zone), sundayJuly = wd(`${y}-07-01`) === 0, sundayJune = wd(`${y}-06-24`) === 0;
      const extra = zone.startsWith("qc") && sundayJune ? 1 : 0;
      assert.equal(list.length, sizes[zone] + extra, `${zone} ${y} : nombre de jours`);
      assert.deepEqual(dates(list), dates(list).slice().sort(), `${zone} ${y} : dans l'ordre`);
      for (const h of list) {
        assert.ok(h.date.startsWith(String(y)), `${zone} ${h.name} ${y}`);
        if (rules[h.name]) assert.ok(rules[h.name](h.date, y), `${zone} ${h.name} ${h.date}`);
        else if (fixed[h.name]) assert.equal(h.date.slice(5), fixed[h.name], `${zone} ${h.name} ${y}`);
        else if (h.name === "Canada Day") assert.equal(h.date.slice(5), sundayJuly ? "07-02" : "07-01", `${zone} Canada Day ${y}`);
        else if (h.name === "Fête nationale du Québec") assert.ok(h.date.endsWith("06-24") || (sundayJune && h.date.endsWith("06-25")), `${zone} ${h.date}`);
        else assert.fail(`${zone} : jour sans règle de contrôle, ${h.name}`);
        assert.equal(h.substitute, h.date.endsWith("07-02") || (h.date.endsWith("06-25") && zone.startsWith("qc")), `${zone} ${h.date} : report`);
      }
    }
  }
  // 2029 : 1er juillet et 24 juin un dimanche.
  assert.deepEqual(md("federal", 2029).filter((d) => d.startsWith("07")), ["07-02"], "fédéral : fête du Canada le 2 juillet");
  assert.deepEqual(md("qc-good-friday", 2029).filter((d) => d.startsWith("06") || d.startsWith("07")), ["06-24", "06-25", "07-02"]);
  for (const zone of ["mb", "pe", "nl"]) assert.ok(md(zone, 2029).includes("07-01") && !md(zone, 2029).includes("07-02"), `${zone} : la loi nomme le 1er juillet`);
  assert.deepEqual(md("qc-easter-monday", 2026).slice(0, 2), ["01-01", "04-06"], "Québec : lundi de Pâques");
  assert.ok(!md("on", 2026).includes("11-11") && !md("qc-good-friday", 2026).includes("11-11") && !md("mb", 2026).includes("11-11"));
  assert.ok(md("ns", 2026).includes("11-11"), "Nouvelle-Écosse : Remembrance Day Act");
  assert.ok(md("nt", 2026).includes("06-21") && !md("nt", 2026).includes("12-26"));
});

test("Canada : jours ouvrables 2026, noms en français, délais, années non couvertes", () => {
  const year = (zone) => D.count("2026-01-01", "2026-12-31", ca(zone)).ouvres;
  assert.deepEqual(Object.fromEntries(D.zones(CA).map((z) => [z, year(z)])), { federal: 252, ab: 252, bc: 250, mb: 252, nb: 253, nl: 255,
    ns: 254, nt: 251, on: 253, pe: 253, "qc-good-friday": 253, "qc-easter-monday": 253 }, "261 jours de semaine moins les jours fériés en semaine");
  const on = D.count("2026-01-01", "2026-12-31", ca("on"));
  assert.deepEqual(on.holidays.filter((h) => !h.off).map((h) => [h.date, h.weekday]), [["2026-12-26", 6]], "Ontario : le 26 décembre est un samedi");
  assert.equal(D.count("2026-01-01", "2026-12-31", ca("nt")).holidays.find((h) => h.date === "2026-06-21").off, false, "21 juin 2026 : un dimanche");
  assert.deepEqual(D.holidays(2026, CA, "qc-good-friday", "fr").map((h) => h.name), ["Jour de l’An", "Vendredi saint",
    "Journée nationale des patriotes", "Fête nationale du Québec", "Fête du Canada", "Fête du Travail", "Action de grâce", "Noël"]);
  assert.equal(D.count("2026-06-01", "2026-06-30", ca("nt", "fr")).holidays[0].name, "Journée nationale des peuples autochtones", "nom de la loi bilingue");
  assert.equal(D.count("2026-06-01", "2026-06-30", ca("nt")).holidays[0].name, "National Indigenous Peoples Day");
  for (const zone of D.zones(CA)) assert.ok(CA.statutory_holidays.zones[zone].every((h) => h.name && h.name_fr), `${zone} : noms anglais et français`);
  assert.deepEqual(D.count("2029-06-20", "2029-07-05", ca("qc-good-friday", "fr")).holidays.map((h) => [h.date, h.name, h.substitute, h.off]),
    [["2029-06-24", "Fête nationale du Québec", false, false], ["2029-06-25", "Fête nationale du Québec", true, true], ["2029-07-02", "Fête du Canada", true, true]]);
  assert.equal(D.addDays("2026-06-29", 2, "ouvre", ca("on")).date, "2026-07-02", "fête du Canada sautée");
  assert.equal(D.addDays("2026-12-23", 2, "ouvre", ca("on")).date, "2026-12-28", "Noël, puis la fin de semaine (26 décembre un samedi)");
  assert.equal(D.addDays("2026-11-10", 1, "ouvre", ca("ns")).date, "2026-11-12", "Nouvelle-Écosse : 11 novembre");
  assert.equal(D.addDays("2026-11-10", 1, "ouvre", ca("on")).date, "2026-11-11", "Ontario : 11 novembre travaillé");
  assert.equal(D.count("2030-12-01", "2031-01-31", ca("on")), null, "2031 non couvert");
  assert.equal(D.count("2023-12-01", "2024-01-31", ca("on")), null, "2023 non couvert");
  assert.equal(D.addDays("2030-12-20", 20, "calendaire", ca("on")).date, "2031-01-09", "jours civils : pas besoin des jours fériés");
});

test("Canada : pages en anglais et en français, menu, chiffres de la FAQ = moteur, aide du taux horaire", () => {
  for (const [page, site, rate, store, lang] of [[caEn, "ca", "hourly-rate-calculator", "jours-ca", "en"], [caFr, "ca-fr", "calculateur-taux-horaire", "jours-ca-fr", "fr"]]) {
    const f = frontOf(page);
    assert.equal(f.id, "workdays");
    assert.deepEqual(f.scripts, ["engines/jours.js", "tools/jours.js"]);
    assert.equal(f.rules, "ca");
    assert.deepEqual(f.sources, ["statutory_holidays"]);
    assert.ok(f.title.length <= 60 && f.description.length <= 160, `${site} : titre et description`);
    assert.ok(f.faq.length >= 3 && f.faq.length <= 6);
    const pricing = JSON.parse(readFileSync(new URL(`../../content/${site}/site.json`, import.meta.url), "utf8")).nav.find((g) => g.key === "pricing");
    assert.deepEqual(pricing.items.slice(0, 2), ["rate", "workdays"], site);
    const options = [...page.matchAll(/<select id="jo-zone"[\s\S]*?<\/select>/g)][0][0].match(/value="([\w-]+)"/g).map((v) => v.slice(7, -1));
    assert.deepEqual(options.slice().sort(), D.zones(CA).slice().sort(), `${site} : une option par juridiction`);
    assert.deepEqual([...page.matchAll(/<select id="jo-mode"[\s\S]*?<\/select>/g)][0][0].match(/value="(\w+)"/g), ['value="ouvre"', 'value="calendaire"']);
    assert.match(page, new RegExp(`id="jo-year" name="year" min="${D.years(CA).min}" max="${D.years(CA).max}"`));
    const data = JSON.parse(/id="jours-data">([\s\S]*?)<\/script>/.exec(page)[1]);
    const usData = JSON.parse(/id="jours-data">([\s\S]*?)<\/script>/.exec(usHtml)[1]);
    assert.deepEqual(Object.keys(data).filter((k) => k !== "zone_notes").sort(), Object.keys(usData).sort(), `${site} : mêmes textes qu'aux États-Unis`);
    assert.equal(data.store, store);
    for (const zone of Object.keys(data.zone_notes)) assert.ok(zone === "*" || D.zones(CA).includes(zone), `${site} : note de ${zone}`);
    const faq = f.faq.flat().join(" "), n = (zone) => D.count("2026-01-01", "2026-12-31", ca(zone)).ouvres;
    assert.ok(faq.includes(`${n("on")} `) && n("on") === n("qc-good-friday") && faq.includes(`${n("ab")} `) && n("ab") === n("mb") && n("ab") === n("federal") &&
      faq.includes(`${n("bc")} `) && faq.includes("261") && faq.includes(`${D.count("2026-01-01", "2026-12-31", ca("on")).holidays.filter((h) => h.off).length} `), `${site} : FAQ 2026`);
    assert.ok(faq.includes("2029") && D.holidays(2029, CA, "federal").some((h) => h.date === "2029-07-02"), `${site} : prochaine fête du Canada reportée`);
    const ratePage = readFileSync(new URL(`../../content/${site}/${rate}.html`, import.meta.url), "utf8");
    assert.match(ratePage, /aria-describedby="h-holidays-hint"[^>]*>\s*<span class="hint" id="h-holidays-hint"><a href="\{\{link:workdays\}\}">/, `${site} : lien depuis le taux horaire`);
    assert.equal(lang === "fr" ? /selected>Québec \(Vendredi saint\)/.test(page) : /value="on" selected>Ontario/.test(page), true, `${site} : juridiction par défaut`);
  }
  const fr = frontOf(caFr).faq.flat().join(" ");
  assert.ok(fr.includes(`en compte ${D.holidays(2026, CA, "qc-good-friday").length}`), "Québec : nombre de jours fériés");
  const en = frontOf(caEn).faq.flat().join(" ");
  const withRemembrance = D.zones(CA).filter((z) => z !== "ns" && md(z, 2026).includes("11-11"));
  assert.deepEqual(withRemembrance, ["federal", "ab", "bc", "nb", "nl", "nt", "pe"], "Remembrance Day dans la FAQ");
  assert.ok(["Alberta", "British Columbia", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Prince Edward Island", "federally regulated"].every((w) => en.includes(w)));
  assert.ok(en.includes("Ontario: " + D.holidays(2026, CA, "on").map((h) => h.name.replace(" (December 26)", "")).slice(0, -1).join(", ") + " and Boxing Day"), "liste de l'Ontario");
});
