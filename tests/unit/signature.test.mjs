// Signature d'email professionnelle (documentation/43-signature-email.md) : exigences lues dans les règles, mentions
// composées pour chaque pays, échappement et liens sûrs, texte brut, pages des 4 pays.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ruleValues, ruleEntries } from "./regles.mjs";

const require = createRequire(import.meta.url);
const S = require("../../src/assets/engines/signature.js");
const FR = ruleValues("fr"), UK = ruleValues("uk"), US = ruleValues("us"), CA = ruleValues("ca");

const PAGES = {
  fr: { file: "fr/signature-email-professionnelle.html", rules: FR, nav: "fr" },
  uk: { file: "uk/email-signature-generator.html", rules: UK, nav: "uk" },
  us: { file: "us/email-signature-generator.html", rules: US, nav: "us" },
  ca: { file: "ca/email-signature-generator.html", rules: CA, nav: "ca" },
  "ca-fr": { file: "ca-fr/signature-courriel.html", rules: CA, nav: "ca-fr" },
};
for (const page of Object.values(PAGES)) {
  page.html = readFileSync(new URL(`../../content/${page.file}`, import.meta.url), "utf8");
  page.front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(page.html)[1]);
  page.L = JSON.parse(/id="signature-data">([\s\S]*?)<\/script>/.exec(page.html)[1]);
}
const fr = PAGES.fr.L, uk = PAGES.uk.L, us = PAGES.us.L, ca = PAGES.ca.L, cafr = PAGES["ca-fr"].L;
const keys = (items) => items.map((i) => i.key);
const todo = (items) => items.filter((i) => !i.ok).map((i) => i.key);

const ei = { status: "ei", name: "Camille Martin", role: "Développeuse web", siren: "123 456 789", activity: "commerciale",
  city: "Lyon", address: "12 rue des Lilas, 69003 Lyon", phone: "06 12 34 56 78", email: "camille@exemple.fr",
  website: "exemple.fr", linkedin: "linkedin.com/in/camille" };

// ------------------------------------------------------------------------------------------------------------
// Exigences

test("exigences = règles de chaque pays (statuts, champs requis)", () => {
  assert.deepEqual(Object.keys(FR.email_signature.situations), ["ei", "societe"]);
  assert.deepEqual(FR.email_signature.situations.ei.required, ["name", "siren", "registration", "address"]);
  assert.equal(FR.email_signature.situations.ei.name_suffix, "EI");
  assert.deepEqual(FR.mention_ei_documents.mention, ["EI", "entrepreneur individuel"], "même mention que la règle R526-27");
  assert.deepEqual(FR.email_signature.situations.societe.required, ["business", "form", "capital", "siren", "registration", "address"]);
  assert.equal(FR.email_signature.siren_digits, 9);
  assert.deepEqual(Object.keys(UK.email_signature.situations), ["sole_own_name", "sole_trading_name", "limited"]);
  assert.deepEqual(UK.email_signature.situations.sole_own_name.required, []);
  assert.deepEqual(UK.email_signature.situations.limited.required, ["business", "company_number", "uk_part", "address"]);
  assert.deepEqual(US.email_signature.situations.marketing.required, ["address"]);
  assert.deepEqual(US.email_signature.situations.everyday.required, []);
  assert.deepEqual(Object.keys(CA.email_signature.situations), ["commercial"], "Canada : toujours identification et exclusion");
  assert.deepEqual(CA.email_signature.situations.commercial.required, ["name_or_business", "address", "email"]);
  for (const [c, src] of [["fr", /F37370/], ["uk", /gov\.uk/], ["us", /ftc\.gov/], ["ca", /laws-lois\.justice\.gc\.ca/]]) {
    assert.match(ruleEntries(c).email_signature.source, src, c);
  }
  assert.equal(ruleEntries("fr").email_signature.confidence, "medium", "texte de R123-237 non lu");
  assert.ok(JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url), "utf8")).open_questions.some((q) => /R123-237/.test(q)));
});

test("France : mentions vérifiées (Siren à 9 chiffres, RCS avec ville ou RNE, adresse)", () => {
  assert.deepEqual(todo(S.check({ status: "ei" }, FR)), ["name", "siren", "registration", "address"]);
  assert.deepEqual(todo(S.check(ei, FR)), []);
  assert.deepEqual(todo(S.check({ ...ei, siren: "12345678" }, FR)), ["siren"], "8 chiffres");
  assert.deepEqual(todo(S.check({ ...ei, siren: "1234567890" }, FR)), ["siren"], "10 chiffres");
  assert.deepEqual(todo(S.check({ ...ei, siren: "123.456.789" }, FR)), [], "séparateurs acceptés");
  assert.deepEqual(todo(S.check({ ...ei, siren: "12345678A" }, FR)), ["siren"]);
  assert.deepEqual(todo(S.check({ ...ei, city: " " }, FR)), ["registration"], "RCS sans ville du greffe");
  assert.deepEqual(todo(S.check({ ...ei, activity: "autre", city: "" }, FR)), [], "RNE : pas de ville");
  assert.deepEqual(todo(S.check({ ...ei, activity: "" }, FR)), ["registration"]);
  assert.deepEqual(todo(S.check({ ...ei, status: "societe" }, FR)), ["business", "form", "capital"]);
  assert.deepEqual(S.check({ ...ei, status: "inconnu" }, FR), []);
  assert.equal(S.situation(FR, "toString"), null, "pas de clé héritée");
});

// ------------------------------------------------------------------------------------------------------------
// Composition

test("France : entrepreneur individuel et société (nom suivi de « EI », Siren, RCS ou RNE, capital)", () => {
  const sig = S.compose(ei, FR, fr);
  assert.equal(sig.name, "Camille Martin EI");
  assert.equal(sig.sub, "Développeuse web");
  assert.deepEqual(sig.legal, ["Camille Martin EI · SIREN 123 456 789 · RCS Lyon", "12 rue des Lilas, 69003 Lyon"]);
  assert.deepEqual(sig.contacts.map((c) => c.href), ["tel:0612345678", "mailto:camille@exemple.fr", "https://exemple.fr", "https://linkedin.com/in/camille"]);
  assert.deepEqual(S.compose({ ...ei, activity: "autre" }, FR, fr).legal[0], "Camille Martin EI · SIREN 123 456 789 · RNE");
  const sas = S.compose({ ...ei, status: "societe", business: "Atelier Martin", form: "SAS", capital: "1 000 €" }, FR, fr);
  assert.equal(sas.name, "Camille Martin", "pas de « EI » pour une société");
  assert.equal(sas.sub, "Développeuse web · Atelier Martin");
  assert.deepEqual(sas.legal, ["Atelier Martin SAS au capital de 1 000 € · SIREN 123 456 789 · RCS Lyon", "Siège : 12 rue des Lilas, 69003 Lyon"]);
  const noCapital = S.compose({ ...ei, status: "societe", business: "Atelier Martin", form: "SAS" }, FR, fr);
  assert.equal(noCapital.legal[0], "Atelier Martin SAS · SIREN 123 456 789 · RCS Lyon", "partie facultative omise, le reste gardé");
  const empty = S.compose({ status: "ei" }, FR, fr);
  assert.deepEqual([empty.name, empty.legal, empty.contacts, empty.optout], ["", [], [], ""]);
  assert.equal(S.html(empty, "brand"), "", "rien à afficher");
});

test("Royaume-Uni : société, nom commercial, nom propre", () => {
  const ltd = { status: "limited", name: "Sam Taylor", business: "Taylor Studio Ltd", company_number: "01234567", uk_part: "scotland",
    address: "10 High Street, Bristol BS1 4ST" };
  assert.deepEqual(todo(S.check(ltd, UK)), []);
  assert.deepEqual(S.compose(ltd, UK, uk).legal, ["Taylor Studio Ltd · Registered in Scotland · Company number 01234567",
    "Registered office: 10 High Street, Bristol BS1 4ST"]);
  assert.equal(S.compose({ ...ltd, business: "Taylor Studio" }, UK, uk).legal[0],
    "Taylor Studio (a limited company) · Registered in Scotland · Company number 01234567", "« Limited » ou « Ltd » absent : précisé");
  assert.equal(S.compose({ ...ltd, business: "Taylor Studio Limited" }, UK, uk).legal[0].indexOf("(a limited company)"), -1);
  assert.deepEqual(todo(S.check({ ...ltd, uk_part: "" }, UK)), ["uk_part"]);
  const trading = { status: "sole_trading_name", name: "Sam Taylor", business: "Bright Ideas", address: "10 High Street, Bristol" };
  assert.deepEqual(S.compose(trading, UK, uk).legal, ["Bright Ideas is a trading name of Sam Taylor", "Address for service of documents: 10 High Street, Bristol"]);
  assert.deepEqual(todo(S.check({ ...trading, name: "" }, UK)), ["name"]);
  const own = S.compose({ status: "sole_own_name", name: "Sam Taylor", address: "10 High Street, Bristol" }, UK, uk);
  assert.deepEqual(own.legal, []);
  assert.deepEqual(own.contacts.map((c) => c.text), ["10 High Street, Bristol"], "adresse dans les coordonnées");
});

test("États-Unis et Canada : adresse postale, ligne de refus ou de désabonnement", () => {
  const mk = { status: "marketing", name: "Jordan Lee", address: "123 Main St, Austin, TX 78701", email: "jordan@leecopy.com" };
  const sig = S.compose(mk, US, us);
  assert.deepEqual(sig.legal, ["123 Main St, Austin, TX 78701"]);
  assert.match(sig.optout, /reply with “unsubscribe\.”/);
  assert.deepEqual(todo(S.check({ ...mk, address: "" }, US)), ["address"]);
  const everyday = S.compose({ ...mk, status: "everyday" }, US, us);
  assert.deepEqual([everyday.legal, everyday.optout], [[], ""]);
  assert.ok(everyday.contacts.some((c) => c.text === mk.address), "adresse dans les coordonnées");
  const c = { status: "commercial", name: "Alex Tremblay", address: "200 Queen St W, Toronto ON", email: "alex@tremblayweb.ca" };
  assert.deepEqual(todo(S.check(c, CA)), []);
  assert.equal(S.compose(c, CA, ca).optout, "To unsubscribe from my commercial emails, reply “unsubscribe” or write to alex@tremblayweb.ca.");
  assert.equal(S.compose(c, CA, cafr).optout, "Pour ne plus recevoir mes courriels commerciaux, répondez « désabonnement » ou écrivez à alex@tremblayweb.ca.");
  assert.deepEqual(todo(S.check({ ...c, email: "alex@" }, CA)), ["email"]);
  assert.equal(S.compose({ ...c, email: "alex@" }, CA, ca).optout, "", "sans adresse de courriel valide, pas de ligne trompeuse");
  assert.deepEqual(todo(S.check({ ...c, name: "", business: "Tremblay Web" }, CA)), [], "nom d'entreprise suffit");
  assert.deepEqual(todo(S.check({ ...c, name: "" }, CA)), ["name_or_business"]);
});

// ------------------------------------------------------------------------------------------------------------
// Rendu sûr

test("HTML : texte échappé, liens https, mailto et tel seulement, couleur connue", () => {
  const evil = { status: "ei", name: 'Eve <script>alert("x")</script>', role: "A & B", siren: "123456789", activity: "autre",
    address: "1 rue <b>", email: 'eve@x.fr"><img src=x onerror=alert(1)>', website: "javascript:alert(1)",
    linkedin: 'https://linkedin.com/in/eve" onmouseover="alert(1)', phone: "abc" };
  const sig = S.compose(evil, FR, fr), code = S.html(sig, "nope");
  assert.ok(!/<script|<img|<b>|javascript:|onerror|onmouseover/i.test(code), code);
  assert.match(code, /Eve &lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; EI/);
  assert.match(code, /A &amp; B/);
  assert.match(code, new RegExp(S.ACCENTS.brand), "couleur inconnue : orange");
  assert.deepEqual(sig.contacts.map((c) => c.href), [""], "téléphone illisible : texte sans lien ; email, site et LinkedIn refusés");
  assert.equal(S.web("exemple.fr"), "https://exemple.fr");
  assert.equal(S.web("http://exemple.fr/a?b=1"), "http://exemple.fr/a?b=1");
  assert.equal(S.web("ftp://exemple.fr"), "");
  assert.equal(S.web("exemple"), "", "sans nom de domaine");
  assert.equal(S.tel("+44 7700 900123"), "tel:+447700900123");
  assert.equal(S.tel("(512) 555-0142"), "tel:5125550142");
  assert.equal(S.tel("12 34"), "", "trop court");
  assert.equal(S.tel("06 12+34 56 78"), "tel:0612345678", "« + » au milieu ignoré");
  const ok = S.html(S.compose(ei, FR, fr), "blue");
  assert.match(ok, /^<table[^>]*role="presentation"/);
  assert.match(ok, /href="tel:0612345678"/);
  assert.match(ok, /href="https:\/\/exemple\.fr" style="color:#1d4ed8/);
  for (const color of Object.values(S.ACCENTS)) assert.match(color, /^#[0-9a-f]{6}$/);
});

test("texte brut : mêmes informations que le HTML, adresses web en entier", () => {
  const t = S.text(S.compose(ei, FR, fr));
  assert.equal(t, ["Camille Martin EI", "Développeuse web",
    "06 12 34 56 78 · camille@exemple.fr · https://exemple.fr · LinkedIn : https://linkedin.com/in/camille",
    "Camille Martin EI · SIREN 123 456 789 · RCS Lyon", "12 rue des Lilas, 69003 Lyon"].join("\n"));
  assert.match(S.text(S.compose({ ...ei, website: "", linkedin: "linkedin.com/in/x" }, UK, uk)), /LinkedIn: https:\/\/linkedin\.com\/in\/x/);
  assert.equal(S.fill([["{a}", "x {b}"]][0], { a: "A", b: "" }), "A", "segment incomplet omis");
  assert.equal(S.fill(["{a}[ ({b})]"], { a: "A", b: "" }), "A", "partie facultative omise");
  assert.equal(S.fill(["{a}[ ({b})]"], { a: "A", b: "B" }), "A (B)");
});

// ------------------------------------------------------------------------------------------------------------
// Pages

test("pages : en-tête, menu, situations = règles, textes de chaque mention requise", () => {
  for (const [name, page] of Object.entries(PAGES)) {
    const { front, html, L, rules } = page;
    assert.equal(front.id, "signature", name);
    assert.deepEqual(front.scripts, ["engines/signature.js", "tools/signature.js"], name);
    assert.ok(front.sources.includes("email_signature"), name);
    assert.ok(front.title.length <= 60 && front.description.length <= 160, `${name} : titre et description`);
    assert.ok(front.faq.length >= 3 && front.faq.length <= 6, name);
    const situations = Object.keys(rules.email_signature.situations);
    const options = [...(/<select id="sg-status"[\s\S]*?<\/select>/.exec(html) || [""])[0].matchAll(/value="(\w+)"/g)].map((m) => m[1]);
    const hidden = (/<input type="hidden" id="sg-status" name="status" value="(\w+)">/.exec(html) || [])[1];
    assert.deepEqual(hidden ? [hidden] : options, situations, `${name} : un choix par situation des règles`);
    assert.deepEqual(Object.keys(L.tpl), situations, `${name} : modèles de mentions`);
    for (const s of situations) {
      for (const key of rules.email_signature.situations[s].required) assert.ok(L.items[key], `${name} : libellé ${key}`);
      if (!rules.email_signature.situations[s].required.length) assert.ok(L.none[s], `${name} : rien d'exigé (${s})`);
      assert.ok(L.explain[s], `${name} : explication ${s}`);
    }
    for (const id of ["sg-form", "sg-preview", "sg-checks", "sg-summary", "sg-explain", "sg-message", "sg-copy", "sg-copy-text", "sg-copy-html", "sg-download"]) {
      assert.equal(html.split(`id="${id}"`).length, 2, `${name} : #${id} unique`);
    }
    for (const key of ["store", "lang", "file", "file_title", "colon", "linkedin", "tpl", "explain", "items", "ok", "todo", "none", "missing", "complete",
      "empty", "copied", "copied_button", "copied_text", "copied_html", "copy_failed", "downloaded"]) assert.ok(key in L, `${name} : texte ${key}`);
    assert.equal(L.missing.length, 2, `${name} : singulier et pluriel`);
    const nav = JSON.parse(readFileSync(new URL(`../../content/${page.nav}/site.json`, import.meta.url), "utf8")).nav.find((g) => g.key === "sell").items;
    assert.equal(nav[nav.indexOf("templates") + 1], "signature", `${name} : menu, après les modèles d'emails`);
  }
  const stores = Object.values(PAGES).map((p) => p.L.store);
  assert.equal(new Set(stores).size, stores.length, "saisie propre à chaque page");
  assert.deepEqual(Object.keys(uk.uk_parts), UK.email_signature.uk_parts);
  assert.deepEqual([...PAGES.uk.html.matchAll(/<select id="sg-uk-part"[\s\S]*?<\/select>/g)][0][0].match(/value="([\w-]+)"/g).map((v) => v.slice(7, -1)), UK.email_signature.uk_parts);
  assert.match(PAGES.fr.front.faq.flat().join(" "), /9 chiffres/);
  assert.match(PAGES.fr.html, /« EI »/);
});
