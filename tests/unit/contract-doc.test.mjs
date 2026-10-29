// Tests du moteur de rendu des contrats et accords (documentation/29-accord-de-confidentialite.md) : syntaxe des
// textes, conditions, signatures ; puis les cinq accords de confidentialité rendus pour chaque sens et chaque droit,
// comparés aux règles officielles (data/rules) ; enfin, les contrats de prestation rendus par le même moteur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const K = createRequire(import.meta.url)("../../src/assets/engines/contract-doc.js");
const rules = (name) => JSON.parse(readFileSync(new URL(`../../data/rules/${name}.json`, import.meta.url), "utf8")).values;

test("conditions : toutes les clés d'un objet, l'une des variantes d'une liste", () => {
  const raw = { direction: "to_me", law: "SC" };
  assert.equal(K.matches(undefined, raw), true);
  assert.equal(K.matches({ direction: ["to_me", "from_me"] }, raw), true);
  assert.equal(K.matches({ direction: ["to_me"], law: ["EW", "NI"] }, raw), false, "toutes les clés");
  assert.equal(K.matches([{ direction: ["mutual"] }, { law: ["SC"] }], raw), true, "une variante suffit");
  assert.equal(K.matches([{ direction: ["mutual"] }, { law: ["EW"] }], raw), false);
});

test("repères has_<champ> : champs remplis ou vides, cases à cocher exclues", () => {
  assert.deepEqual(K.flags({ start: "", purpose: "x", reverse: "on", personal: "off" }),
    { start: "", has_start: "off", purpose: "x", has_purpose: "on", reverse: "on", personal: "off" });
});

test("textes : valeurs échappées, passages conditionnels, repère à compléter, variantes de titre", () => {
  const v = { raw: {}, text: { a: "<b>&", n: "x\ny" } };
  assert.equal(K.fill("{a}[[a|, avec a]][[b|, avec b]]", v, {}), "&lt;b&gt;&amp;, avec a");
  assert.equal(K.fill("{n}", v, {}), "x<br>y");
  assert.equal(K.fill("{b}", v, { b: "nom" }), '<span class="p-empty k-blank">nom</span>');
  assert.equal(K.fill("{b}", v, {}), '<span class="p-empty k-blank">b</span>', "sans repère : le nom du champ");
  const title = [{ when: { direction: ["mutual"] }, text: "MUTUEL" }, { text: "SIMPLE" }];
  assert.equal(K.pick(title, { direction: "mutual" }), "MUTUEL");
  assert.equal(K.pick(title, { direction: "to_me" }), "SIMPLE");
  assert.equal(K.pick("FIXE", {}), "FIXE");
});

test("rendu : articles numérotés sans les articles masqués, signatures conditionnelles, témoin, mention propre", () => {
  const D = { doc_title: "T", article: "{n}. {title}", sign_note: "Note", preamble: ["P"], closing: ["C"],
    clauses: [{ title: "Un", paras: ["a"] }, { title: "Masqué", when: { x: ["on"] }, paras: ["b"] }, { title: "Deux", paras: ["c", { when: { x: ["on"] }, text: "d" }] }],
    signatures: [{ title: "A", name: "{p}" }, { title: "B", name: "B", when: { x: ["on"] }, note: "Autre", witness: { title: "devant :", lines: ["L1", "L2"] } }] };
  const off = K.render(D, { raw: { x: "off" }, text: { p: "Pat" } });
  assert.match(off, /<h3>1\. Un<\/h3><p>a<\/p><\/section><section class="k-article"><h3>2\. Deux<\/h3><p>c<\/p><\/section>/);
  assert.ok(!off.includes("Masqué") && !off.includes(">B<") && !off.includes("k-witness"));
  assert.ok(off.includes('<p class="k-sign-note">Note</p>'));
  const on = K.render(D, { raw: { x: "on" }, text: { p: "Pat" } });
  assert.ok(on.includes("<h3>3. Deux</h3><p>c</p><p>d</p>"));
  assert.ok(on.includes('<p class="k-sign-note">Autre</p>') && on.includes('<p class="k-witness-line">L1</p><p class="k-witness-line">L2</p>'));
});

test("annexes : après les signatures, sans numéro d'article, conditionnelles ; lignes à remplir et blocs", () => {
  const D = { doc_title: "T", article: "{n}. {title}", annex: "Annexe – {title}", preamble: [], closing: ["C"],
    clauses: [{ title: "Un", paras: ["a"] }],
    signatures: [{ title: "A", name: "A" }],
    annexes: [{ title: "Formulaire", when: { x: ["on"] }, paras: [{ block: "form" }, { field: "Nom :" }, { field: "" }] }, { title: "Toujours", paras: ["z"] }] };
  const v = (x) => ({ raw: { x }, text: { p: "Pat" }, blocks: { form: ["À {p}", { field: "Date :" }, { when: { x: ["off"] }, text: "jamais" }] } });
  const on = K.render(D, v("on"));
  assert.ok(on.indexOf('<div class="k-signs">') < on.indexOf('<section class="k-annex">'), "annexes après les signatures");
  assert.ok(on.includes('<section class="k-annex"><h3>Annexe – Formulaire</h3><p>À Pat</p><p class="k-field">Date :</p><p class="k-field">Nom :</p><p class="k-field"></p></section>'));
  assert.ok(on.includes('<section class="k-annex"><h3>Annexe – Toujours</h3><p>z</p></section>'));
  assert.ok(!on.includes("jamais"), "conditions dans un bloc");
  assert.equal((on.match(/<h3>\d+\. /g) || []).length, 1, "une annexe n'est pas un article numéroté");
  const off = K.render(D, v("off"));
  assert.ok(!off.includes("Formulaire") && off.includes("Annexe – Toujours"));
  // Sans signatures ni clôture ; titre d'annexe par défaut ; bloc absent.
  const bare = K.render({ doc_title: "T", article: "{n}. {title}", preamble: [], clauses: [], annexes: [{ title: "B", paras: [{ block: "nope" }] }] }, { raw: {}, text: {} });
  assert.ok(bare.endsWith('<div class="k-closing"></div><section class="k-annex"><h3>Annexe – B</h3></section>'));
  assert.ok(K.word("T", "<p>x</p>").includes(".k-annex{page-break-before:always}"), "Word : annexe sur une nouvelle page");
});

// ------------------------------------------------------------------------------------------------------------
// Pages : formulaire lu comme le fait tools/contract.js (valeurs par défaut, libellé de l'option choisie).

const read = (path) => readFileSync(new URL(`../../content/${path}`, import.meta.url), "utf8");
function load(path) {
  const html = read(path);
  return { html, D: JSON.parse(/id="contract-data">([\s\S]*?)<\/script>/.exec(html)[1]), front: JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]) };
}
function fields(html) {
  const form = /<form[^>]*id="contract-form"[\s\S]*?<\/form>/.exec(html)[0];
  const out = {};
  for (const m of form.matchAll(/<input type="(\w+)" id="([\w-]+)" name="(\w+)"([^>]*)>/g)) {
    out[m[3]] = { id: m[2], type: m[1], value: (/ value="([^"]*)"/.exec(m[4]) || [, ""])[1], checked: / checked/.test(m[4]) };
  }
  for (const m of form.matchAll(/<textarea id="([\w-]+)" name="(\w+)"/g)) out[m[2]] = { id: m[1], type: "textarea", value: "" };
  for (const m of form.matchAll(/<select id="([\w-]+)" name="(\w+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const options = [...m[3].matchAll(/<option value="([^"]*)"( selected)?>([^<]*)<\/option>/g)].map((o) => ({ value: o[1], selected: !!o[2], text: o[3] }));
    out[m[2]] = { id: m[1], type: "select", options, value: (options.find((o) => o.selected) || options[0]).value };
  }
  return out;
}
function values(page, set = {}) {
  const raw = {}, text = {};
  for (const [name, f] of Object.entries(fields(page.html))) {
    const value = name in set ? set[name] : f.type === "checkbox" ? (f.checked ? "on" : "off") : f.value;
    raw[name] = value;
    if (f.type === "checkbox") continue;
    const override = page.D.option_text && page.D.option_text[name] && page.D.option_text[name][value];
    text[name] = override || (f.type === "select" ? f.options.find((o) => o.value === value).text : value);
  }
  text.today = "today";
  return { raw: K.flags(raw), text };
}
const plain = (html) => html.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
const count = (s, part) => s.split(part).length - 1;

const NDA = {
  "fr/accord-de-confidentialite.html": { rules: "fr", disc: "la « Partie divulgatrice »", me: "Le Prestataire (la « Partie divulgatrice »)", them: "Le Client (la « Partie divulgatrice »)", mutual: "Chaque Partie peut communiquer" },
  "us/nda-template.html": { rules: "us", disc: "the “Discloser”", me: "Contractor (the “Discloser”)", them: "Client (the “Discloser”)", mutual: "Each party may disclose" },
  "uk/nda-template.html": { rules: "uk", disc: "the “Discloser”", me: "Contractor (the “Discloser”)", them: "Client (the “Discloser”)", mutual: "Each party may disclose" },
  "ca/nda-template.html": { rules: "ca", disc: "the “Discloser”", me: "Contractor (the “Discloser”)", them: "Client (the “Discloser”)", mutual: "Each party may disclose" },
  "ca-fr/entente-de-confidentialite.html": { rules: "ca", disc: "la « Partie divulgatrice »", me: "Le Prestataire (la « Partie divulgatrice »)", them: "Le Client (la « Partie divulgatrice »)", mutual: "Chaque Partie peut communiquer" },
};
const TEXT_KEYS = ["today"];   // valeurs calculées par l'outil, hors formulaire

for (const [path, L] of Object.entries(NDA)) {
  test(`${path} : formulaire, clés des textes, sources et FAQ`, () => {
    const page = load(path), f = fields(page.html), R = rules(L.rules);
    assert.equal(page.front.id, "nda");
    assert.equal(page.D.store, "nda", "saisie séparée de celle du contrat");
    assert.deepEqual(page.front.scripts, ["engines/contract-doc.js", "tools/contract.js"]);
    assert.ok(page.front.title.length <= 60 && page.front.description.length <= 160, "titre et description");
    assert.ok(page.front.faq.length >= 3 && page.front.faq.length <= 6, "FAQ de 3 à 6 questions");
    for (const key of page.front.sources) assert.ok(R[key], `source ${key}`);
    for (const name of ["p_name", "c_name", "c_rep", "direction", "purpose", "start", "period", "years", "reverse", "personal"]) assert.ok(f[name], name);
    assert.deepEqual(f.direction.options.map((o) => o.value), ["mutual", "to_me", "from_me"]);
    // Durées finies, jamais perpétuelles (France : article 1210 du Code civil).
    assert.ok(f.years.options.every((o) => /^\d+$/.test(o.value) && o.text.startsWith(o.value + " ")), "durées en années");
    assert.ok(f.period.options.every((o) => /^\d+$/.test(o.value) && o.text.startsWith(o.value + " ")), "périodes en mois");
    assert.doesNotMatch(JSON.stringify(page.D), /perpetu|perpétu|indefinite|for ever|forever/i);
    // Toute clé {…} des textes vient du formulaire ou de l'outil ; chaque clé a son repère à compléter.
    const keys = new Set([...JSON.stringify(page.D).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => !["n", "title"].includes(k)));
    for (const k of keys) {
      assert.ok(f[k] || TEXT_KEYS.includes(k), `clé {${k}} sans champ`);
      if (!["p_status", "p_address", "p_id", "p_email", "c_status", "c_address", "c_id", "c_rep"].includes(k)) assert.ok(page.D.hints[k], `repère de {${k}}`);
    }
    for (const [, id] of Object.entries(f).map(([n, x]) => [n, x.id])) assert.match(page.html, new RegExp(`<label for="${id}"|<label class="check full"><input type="checkbox" id="${id}"`), `libellé de ${id}`);
    assert.match(page.html, /href="\{\{link:contract\}\}"/, "lien vers le contrat");
  });

  test(`${path} : rôles cohérents pour chaque sens, options, durée`, () => {
    const page = load(path);
    const laws = fields(page.html).law ? (fields(page.html).law.options || [{ value: fields(page.html).law.value }]).map((o) => o.value) : [""];
    for (const law of laws) {
      for (const direction of ["mutual", "to_me", "from_me"]) {
        const set = { direction, purpose: "Projet X", period: "24", years: "5", ...(law ? { law } : {}) };
        const text = plain(K.render(page.D, values(page, set)));
        const where = `${direction} ${law}`;
        assert.equal(count(text, L.disc), 1, `${where} : rôles définis une fois`);
        assert.equal(text.includes(L.mutual), direction === "mutual", `${where} : accord mutuel`);
        assert.equal(text.includes(L.me), direction === "from_me", `${where} : je communique`);
        assert.equal(text.includes(L.them), direction === "to_me", `${where} : le client communique`);
        assert.ok(text.includes("Projet X"), `${where} : objet`);
        assert.ok(/24 (mois|months)/.test(text) && /5 (ans|years)/.test(text), `${where} : période et durée`);
        assert.ok(!text.includes("k-blank") && !/\{\w+\}|\[\[/.test(text), `${where} : aucune clé brute`);
      }
    }
    const base = { purpose: "x" };
    const on = plain(K.render(page.D, values(page, { ...base, reverse: "on", personal: "on", start: "2027-03-01" })));
    const off = plain(K.render(page.D, values(page, { ...base, reverse: "off", personal: "off", start: "" })));
    assert.ok(/rétro-ingénierie|reverse engineer/.test(on) && !/rétro-ingénierie|reverse engineer/.test(off), "rétro-ingénierie");
    assert.ok(/données personnelles|renseignements personnels|personal information/.test(on) && !/données personnelles|renseignements personnels|personal information/.test(off), "données personnelles");
    assert.ok(on.includes("2027-03-01") && /à la date de sa signature|on the date it is signed/.test(off), "date d'effet ou signature");
  });
}

test("langue : contractions françaises, orthographe britannique et canadienne", () => {
  for (const path of ["fr/accord-de-confidentialite.html", "ca-fr/entente-de-confidentialite.html"]) {
    const text = JSON.stringify(load(path).D);
    // « à le présent accord » pour « au présent accord » (pas de \b : « à » n'est pas un caractère de mot pour JavaScript).
    assert.doesNotMatch(text, /(^|[\s(])(à|de) (le (présent|contrat|Client|Prestataire)|les (Parties|Informations))/, path);
  }
  assert.doesNotMatch(JSON.stringify(load("uk/nda-template.html").D), /unauthoriz|analyz|\blicense\b/, "Royaume-Uni");
  assert.doesNotMatch(JSON.stringify(load("ca/nda-template.html").D), /\blicense\b/, "Canada : licence");
});

test("France : articles cités conformes aux règles, alerte et durée", () => {
  const page = load("fr/accord-de-confidentialite.html"), R = rules("fr");
  const faq = page.front.faq.flat().join(" ");
  assert.match(R.confidentialite_negociations.source_title, /art\. 1112-2/);
  assert.ok(faq.includes("article 1112-2 du Code civil") && faq.includes("article 1210 du Code civil"));
  assert.equal(R.engagements_perpetuels.value.perpetuel_interdit, true);
  assert.match(R.secret_affaires.source_title, /L151-1/);
  assert.match(R.secret_affaires.more_sources[0].source_title, /L151-8/);
  assert.ok(faq.includes("article L151-1 du Code de commerce") && faq.includes("article L151-8 du Code de commerce"));
  const text = plain(K.render(page.D, values(page)));
  assert.ok(text.includes("lanceurs d'alerte (article L151-8 du Code de commerce)") && text.includes("soumis au droit français"));
  assert.ok(text.includes("dans le respect de la bonne foi"), "rupture des négociations libre, de bonne foi (art. 1112)");
});

test("États-Unis : avis d'immunité du Defend Trade Secrets Act repris du texte de la loi, toujours présent", () => {
  const page = load("us/nda-template.html"), R = rules("us").dtsa_whistleblower_immunity.value;
  const norm = (s) => s.toLowerCase().replace(/\((a|b)\) /g, "").replace(/[,;.]/g, "").replace(/\bthe individual's attorney\b/, "the attorney of the individual").replace(/\s+/g, " ");
  assert.equal(R.notice_required, true);
  assert.equal(R.employee_includes_contractors, true);
  for (const direction of ["mutual", "to_me", "from_me"]) {
    const text = norm(plain(K.render(page.D, values(page, { direction }))));
    assert.ok(text.includes(norm(R.immunity)), `${direction} : immunité`);
    assert.ok(text.includes(norm(R.retaliation_lawsuit)), `${direction} : procès pour représailles`);
  }
  assert.ok(plain(K.render(page.D, values(page))).includes("laws of the State of New York"));
  const texas = plain(K.render(page.D, values(page, { law: "Texas" })));
  assert.ok(texas.includes("laws of the State of Texas") && texas.includes("competent courts of the State of Texas"), "État choisi");
});

test("Royaume-Uni : acte (deed) pour un accord à sens unique en Angleterre, au pays de Galles et en Irlande du Nord", () => {
  const page = load("uk/nda-template.html"), R = rules("uk");
  assert.equal(R.uk_nda_guidance.value.one_way_may_need_deed, true);
  assert.equal(R.uk_deed_execution.value.must_say_it_is_a_deed, true);
  for (const law of ["EW", "SC", "NI"]) {
    for (const direction of ["mutual", "to_me", "from_me"]) {
      const html = K.render(page.D, values(page, { direction, law })), text = plain(html);
      const deed = direction !== "mutual" && law !== "SC";
      const where = `${direction} ${law}`;
      assert.equal(text.includes("This deed is made on"), deed, `${where} : préambule`);
      assert.equal(text.includes("executed as a deed and is delivered"), deed, `${where} : mention de l'acte`);
      assert.equal(count(text, "Executed as a deed by"), deed ? 3 : 0, `${where} : clôture et deux signatures`);
      assert.equal(count(html, 'class="k-witness-line"'), deed ? 6 : 0, `${where} : témoin sous chaque signature`);
      if (deed) assert.deepEqual([...html.matchAll(/class="k-witness-line">([^<]*)</g)].map((m) => m[1]).slice(0, 3),
        ["Witness signature", "Witness name", "Witness address"], `${where} : signature, nom et adresse du témoin`);
      assert.equal(text.includes("signed electronically"), !deed, `${where} : signature électronique hors acte`);
      assert.equal(text.includes("In consideration of their mutual promises"), direction === "mutual", `${where} : contrepartie`);
      assert.equal(count(html, 'class="p-label"'), 2, `${where} : deux signatures`);
    }
  }
  const faq = page.front.faq.flat().join(" ");
  assert.equal(R.uk_nda_victims_disclosures.value.from, "2025-10-01");
  assert.ok(faq.includes("1 October 2025") && faq.includes("section 17"));
});

test("Canada : droit de la province, règle québécoise des contrats d'adhésion, lien vers la version française", () => {
  const en = load("ca/nda-template.html"), fr = load("ca-fr/entente-de-confidentialite.html"), R = rules("ca");
  assert.equal(R.qc_adhesion_contract_french.value.french_version_first, true);
  assert.ok(plain(K.render(en.D, values(en))).includes("laws in force in Ontario"));
  assert.ok(plain(K.render(en.D, values(en, { law: "QC" }))).includes("laws in force in Quebec"));
  assert.ok(plain(K.render(fr.D, values(fr))).includes("lois en vigueur au Québec"), "Québec par défaut");
  assert.ok(plain(K.render(fr.D, values(fr, { law: "ON" }))).includes("tribunaux compétents en Ontario"));
  assert.match(en.html, /href=\\"\{\{link:ca-fr\/nda\}\}\\"/, "lien vers la version française");
  assert.ok(fr.front.faq.flat().join(" ").includes("article 55"));
});

// ------------------------------------------------------------------------------------------------------------
// Contrats de prestation : même moteur, même texte qu'avant (saisie propre au contrat).

test("contrats de prestation : rendus par le moteur, clé d'enregistrement d'origine", () => {
  const pages = { "fr/contrat-de-prestation.html": "Article 1 – Objet", "us/freelance-contract.html": "1. Services",
    "uk/freelance-contract.html": "1. Services", "ca/freelance-contract.html": "1. Services", "ca-fr/contrat-de-service.html": "Article 1 – Objet" };
  for (const [path, first] of Object.entries(pages)) {
    const page = load(path);
    assert.equal(page.D.store, undefined, `${path} : clé « contract » par défaut`);
    assert.deepEqual(page.front.scripts.slice(-2), ["engines/contract-doc.js", "tools/contract.js"], path);
    const html = K.render(page.D, values(page));
    assert.ok(plain(html).includes(first), `${path} : premier article`);
    assert.equal(count(html, 'class="p-label"'), 2, `${path} : deux signatures`);
    assert.match(page.html, /href="\{\{link:nda\}\}"/, `${path} : lien vers l'accord de confidentialité`);
  }
});
