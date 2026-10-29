// Date d'échéance d'une facture (documentation/44-date-echeance-international.md) : conditions de paiement, maximums
// français (L441-10), « relevant day » du Late Payment Act britannique (s. 4), échéance par défaut des lois
// Freelance Isn't Free (New York, Illinois).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues, ruleEntries } from "./regles.mjs";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/echeance.js");
const FR = ruleValues("fr"), UK = ruleValues("uk"), US = ruleValues("us");

test("dates : lecture stricte, fin de mois, années bissextiles", () => {
  assert.ok(isNaN(E.day("2026-02-31")) && isNaN(E.day("2026-2-3")) && isNaN(E.day("")) && isNaN(E.day(undefined)));
  assert.equal(E.addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(E.addDays("2026-02-31", 1), "", "date illisible");
  assert.equal(E.endOfMonth("2026-02-10"), "2026-02-28");
  assert.equal(E.endOfMonth("2028-02-10"), "2028-02-29", "année bissextile");
  assert.equal(E.endOfMonth("2026-12-31"), "2026-12-31");
  assert.equal(E.endOfMonth("nope"), "");
  assert.equal(E.between("2026-03-10", "2026-05-09"), 60);
  assert.ok(isNaN(E.between("x", "2026-05-09")));
});

test("conditions : à réception, N jours, N jours fin de mois, fin de mois + N jours", () => {
  assert.deepEqual(E.parseTerms("receipt"), { kind: "days", n: 0 });
  assert.deepEqual(E.parseTerms("0"), { kind: "days", n: 0 });
  assert.deepEqual(E.parseTerms("45fdm"), E.parseTerms("45eom"));
  assert.deepEqual(E.parseTerms("fdm45"), { kind: "eom_then", n: 45 });
  assert.equal(E.parseTerms("none"), null);
  assert.equal(E.parseTerms("1000"), null, "au plus 3 chiffres");
  assert.equal(E.parseTerms("-30"), null);
  assert.equal(E.due("2026-03-10", "receipt"), "2026-03-10");
  assert.equal(E.due("2026-03-10", "30"), "2026-04-09");
  assert.equal(E.due("2026-03-10", "45fdm"), "2026-04-30", "10 mars + 45 jours = 24 avril, fin de mois");
  assert.equal(E.due("2026-03-10", "fdm45"), "2026-05-15", "fin mars + 45 jours");
  assert.equal(E.due("2026-03-10", "60"), "2026-05-09");
  assert.equal(E.due("2026-01-31", "30eom"), "2026-03-31", "31 janvier + 30 jours = 2 mars → 31 mars");
  assert.equal(E.due("2028-01-30", "30eom"), "2028-02-29", "29 février 2028");
  assert.equal(E.due("2026-03-10", "none"), "");
  assert.equal(E.due("", "30"), "");
});

test("France : maximums de la règle L441-10 (60 jours, 45 jours fin de mois selon les deux méthodes)", () => {
  assert.equal(FR.retard_paiement_delais.delai_max_date_facture_jours, 60);
  assert.equal(FR.retard_paiement_delais.delai_max_fin_de_mois_jours, 45);
  assert.deepEqual(E.frLimits("2026-03-10", FR), { max60: "2026-05-09", max45: "2026-04-30", max45b: "2026-05-15", latest: "2026-05-15" });
  assert.equal(E.frLimits("", FR), null);
});

test("Royaume-Uni : sans date convenue, 30 jours à compter du plus tardif (prestation, facture), ce jour compris", () => {
  const R = UK.late_payment_default_due_period;
  assert.deepEqual([R.default_period_days, R.public_authority_max_days, R.business_max_days], [30, 30, 60]);
  assert.match(ruleEntries("uk").late_payment_default_due_period.source, /legislation\.gov\.uk\/ukpga\/1998\/20\/section\/4$/);
  const r = E.ukRelevantDay({ performed: "2026-03-01", notice: "2026-03-05", agreed: "" }, UK);
  assert.deepEqual(r, { start: "2026-03-05", end30: "2026-04-03", end60: "2026-05-03", due: "2026-04-03", cap: "default", lateFrom: "2026-04-04" });
  assert.equal(E.ukRelevantDay({ performed: "2026-03-20", notice: "2026-03-05" }, UK).start, "2026-03-20", "prestation plus tardive");
  assert.equal(E.ukRelevantDay({ performed: "", notice: "2026-03-05" }, UK).due, "2026-04-03", "facture seule");
  assert.equal(E.ukRelevantDay({ performed: "bad", notice: "" }, UK), null);
});

test("Royaume-Uni : date convenue, plafonds de 60 jours (entreprise) et 30 jours (autorité publique)", () => {
  const base = { performed: "2026-03-01", notice: "2026-03-01" };
  const limit = E.ukRelevantDay({ ...base, agreed: "2026-04-29" }, UK);
  assert.deepEqual([limit.end60, limit.due, limit.cap, limit.lateFrom], ["2026-04-29", "2026-04-29", "", "2026-04-30"],
    "60e jour (1er mars compris) : pas de plafond");
  const over = E.ukRelevantDay({ ...base, agreed: "2026-04-30" }, UK);
  assert.deepEqual([over.due, over.cap, over.lateFrom], ["2026-04-29", "60", "2026-04-30"], "un jour de plus : plafonné");
  const long = E.ukRelevantDay({ ...base, agreed: E.due("2026-03-01", "90") }, UK);
  assert.deepEqual([long.due, long.cap, long.lateFrom], ["2026-04-29", "60", "2026-04-30"]);
  const pub = E.ukRelevantDay({ ...base, agreed: E.due("2026-03-01", "45"), publicAuthority: true }, UK);
  assert.deepEqual([pub.due, pub.cap, pub.lateFrom], ["2026-03-30", "30", "2026-03-31"]);
  const pubOk = E.ukRelevantDay({ ...base, agreed: "2026-03-30", publicAuthority: true }, UK);
  assert.deepEqual([pubOk.due, pubOk.cap], ["2026-03-30", ""]);
  const pubLong = E.ukRelevantDay({ ...base, agreed: "2026-06-30", publicAuthority: true }, UK);
  assert.equal(pubLong.cap, "30", "autorité publique : jamais le plafond de 60 jours");
});

test("États-Unis : sans date au contrat, 30 jours après la fin du travail à New York et dans l'Illinois", () => {
  const R = US.freelance_default_payment;
  assert.deepEqual(R.places, ["nyc", "new_york_state", "illinois"]);
  for (const place of R.places) {
    assert.match(US[R.laws[place]].payment_deadline, new RegExp(`if none, no later than ${R.days_after_completion} days after completion`), place);
    assert.equal(ruleEntries("us")[R.laws[place]].confidence, "high", place);
  }
  assert.equal(E.usDefault("2026-10-15", "nyc", US), "2026-11-14");
  assert.equal(E.usDefault("2026-10-15", "illinois", US), "2026-11-14");
  assert.equal(E.usDefault("2026-10-15", "other", US), "", "ailleurs : pas de date par défaut calculée");
  assert.equal(E.usDefault("", "nyc", US), "");
});

// ------------------------------------------------------------------------------------------------------------
// Pages

import { readFileSync } from "node:fs";
const page = (file) => {
  const html = readFileSync(new URL(`../../content/${file}`, import.meta.url), "utf8");
  const data = /id="echeance-data">([\s\S]*?)<\/script>/.exec(html);
  return { html, front: JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]), L: data ? JSON.parse(data[1]) : null };
};
const PAGES = { uk: page("uk/invoice-due-date-calculator.html"), us: page("us/invoice-due-date-calculator.html"),
  ca: page("ca/invoice-due-date-calculator.html"), "ca-fr": page("ca-fr/calcul-date-echeance-facture.html") };
const terms = (html) => [...(/<select id="(?:ec|d)-terms"[\s\S]*?<\/select>/.exec(html) || [""])[0].matchAll(/value="(\w+)"/g)].map((m) => m[1]);

test("pages : en-tête, menu, conditions lisibles par le moteur, textes complets", () => {
  const fr = page("fr/calcul-date-echeance-facture.html");
  assert.deepEqual(fr.front.scripts, ["engines/echeance.js", "tools/fr-echeance.js"], "France : moteur commun");
  for (const v of terms(fr.html)) assert.ok(E.parseTerms(v), `France : ${v}`);
  const common = ["lang", "store", "days", "in_days", "days_ago", "before_invoice", "today"];
  for (const [name, { html, front, L }] of Object.entries(PAGES)) {
    assert.equal(front.id, "duedate", name);
    assert.deepEqual(front.scripts, ["engines/echeance.js", "tools/echeance.js"], name);
    assert.ok(front.title.length <= 60 && front.description.length <= 160, `${name} : titre et description`);
    assert.ok(front.faq.length >= 3 && front.faq.length <= 6, name);
    for (const v of terms(html)) assert.ok(v === "none" || E.parseTerms(v), `${name} : ${v}`);
    assert.equal(/<option value="30" selected>/.test(html), true, `${name} : 30 jours par défaut`);
    for (const k of common) assert.ok(k in L, `${name} : ${k}`);
    for (const k of ["days", "in_days", "days_ago", "before_invoice"]) assert.equal(L[k].length, 2, `${name} : ${k} singulier et pluriel`);
    const nav = JSON.parse(readFileSync(new URL(`../../content/${name}/site.json`, import.meta.url), "utf8")).nav.find((g) => g.key === "invoice").items;
    assert.equal(nav[nav.indexOf("reminder") - 1], "duedate", `${name} : menu, avant les relances (comme en France)`);
  }
  const { L: uk, html: ukHtml, front: ukFront } = PAGES.uk;
  assert.equal(uk.country, "uk");
  assert.deepEqual(Object.keys(uk.uk).sort(), ["30", "60", "default", "ok"], "un texte par cas de ukRelevantDay");
  assert.ok(terms(ukHtml).includes("none") && /id="ec-client"[\s\S]*value="public"/.test(ukHtml));
  assert.deepEqual(ukFront.sources, ["late_payment_default_due_period"]);
  const { L: us, html: usHtml } = PAGES.us;
  const places = [...(/<select id="ec-place"[\s\S]*?<\/select>/.exec(usHtml))[0].matchAll(/value="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(places, [...US.freelance_default_payment.places, "other"]);
  assert.deepEqual(Object.keys(us.laws), US.freelance_default_payment.places);
  for (const k of ["terms_note", "us_terms_law", "us_default", "us_no_default", "need_done"]) assert.ok(us[k], `us : ${k}`);
  assert.match(usHtml, /id="ec-done"/);
  for (const name of ["ca", "ca-fr"]) {
    assert.equal(PAGES[name].L.country, "ca");
    assert.ok(!terms(PAGES[name].html).includes("none"), `${name} : pas de règle par défaut`);
    assert.ok(PAGES[name].L.terms_note);
  }
  assert.match(PAGES.uk.front.faq.flat().join(" "), /30 days beginning with/);
  assert.match(PAGES.us.front.faq.flat().join(" "), /no later than 30 days after you complete the work/);
});
