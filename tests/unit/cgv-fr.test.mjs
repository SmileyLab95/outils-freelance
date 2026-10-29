// Tests du générateur de conditions générales de vente (documentation/40-cgv.md) : moteur engines/cgv-fr.js (taux du
// semestre, repères, contrôles, formulaire de rétractation), puis la page rendue par engines/contract-doc.js pour chaque
// clientèle et chaque façon de conclure les contrats, comparée aux règles officielles (data/rules/fr.json).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { ruleValues, ruleEntries } from "./regles.mjs";

const require = createRequire(import.meta.url);
const C = require("../../src/assets/engines/cgv-fr.js");
const K = require("../../src/assets/engines/contract-doc.js");
const INV = require("../../src/assets/engines/invoice-fr.js");
const R = ruleValues("fr");
const TODAY = "2026-10-29";
const fmt = {
  pct: (rate) => { const n = Math.round(rate * 10000) / 100; return (Number.isInteger(n) ? String(n) : n.toFixed(2)).replace(".", ",") + " %"; },
  num: (n) => String(n).replace(".", ","),
};
const codes = (p) => p.checks.map((c) => c.code);
const prep = (raw, today = TODAY) => C.prepare(raw, R, today, fmt);

// Saisie complète et valide (clients professionnels et particuliers, contrats à distance).
const OK = {
  clients: "both", distance: "on", offsite: "off", online: "off", online_url: "", p_name: "Camille Martin EI",
  p_address: "12 rue de la République, 69002 Lyon", p_siren: "123 456 789", p_email: "contact@exemple.fr",
  p_privacy: "https://www.exemple.fr/confidentialite", vat: "franchise", p_vat: "", med_name: "Médiateur Exemple",
  med_address: "1 rue de Paris, 75001 Paris", med_site: "https://mediateur.exemple.fr", terms: "30", penalty: "bce",
  penalty_rate: "", deposit: "30", escompte: "none", pay_transfer: "on", pay_card: "off", pay_check: "off",
  acceptance: "15", notice: "15", validity: "30",
};

// ------------------------------------------------------------------------------------------------------------
// Moteur

test("semestres et taux : chiffres des fiches officielles (8,25 %, 12,40 %, 12,15 %)", () => {
  assert.equal(C.semester("2026-06-30"), "2026-S1");
  assert.equal(C.semester("2026-07-01"), "2026-S2");
  assert.deepEqual(C.rates(R, "2026-10-29"), { semester: "2026-S2", legal: 0.0275, minPenalty: 0.0825, bce: 0.024, defaultPenalty: 0.124 });
  assert.deepEqual(C.rates(R, "2026-01-15"), { semester: "2026-S1", legal: 0.0262, minPenalty: 0.0786, bce: 0.0215, defaultPenalty: 0.1215 });
  assert.deepEqual(C.rates(R, "2027-02-01"), { semester: "2027-S1", legal: null, minPenalty: null, bce: null, defaultPenalty: null }, "semestre pas encore publié");
  assert.equal(C.semesterLabel("2026-S2"), "second semestre 2026");
  assert.equal(C.semesterLabel("2027-S1"), "premier semestre 2027");
  // Les fiches F33527 et F23211 citent ces chiffres : la règle et le calcul doivent les retrouver.
  const E = ruleEntries("fr");
  assert.match(E.taux_interet_legal.note, /8,25 %/);
  assert.match(E.taux_bce_refinancement_2026_07_01.note, /12,40 %/);
  assert.match(E.taux_bce_refinancement_2026_01_01.note, /12,15 %/);
});

test("formulaire de rétractation : modèle officiel mot pour mot, coordonnées du Prestataire, lignes à remplir", () => {
  const model = R.retractation_modeles.formulaire, form = C.withdrawalForm(R);
  const texts = form.map((p) => (typeof p === "string" ? p : p.field));
  for (const line of model) {
    if (line.startsWith("À l'attention de")) continue;
    assert.ok(texts.some((t) => t === line || t === line + " :"), `ligne du modèle reprise : ${line}`);
  }
  assert.ok(!texts.some((t) => t.includes("[le professionnel")), "la consigne au professionnel est remplacée");
  assert.equal(texts.filter((t) => t.startsWith("À l'attention de {p_name}")).length, 1);
  assert.equal(form[0], model[0], "consigne d'en-tête");
  assert.equal(form[form.length - 1], "(*) Biffez la mention inutile.");
  const fields = form.filter((p) => typeof p === "object").map((p) => p.field);
  assert.deepEqual(fields, ["", "Commandé le (*)/reçu le (*) :", "Nom du (des) consommateur(s) :", "Adresse du (des) consommateur(s) :",
    "Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :", "Date :"]);
});

test("repères : rétractation selon la clientèle et la façon de conclure le contrat", () => {
  const f = (set) => prep({ ...OK, ...set }).flags;
  assert.equal(f({ clients: "pro" }).retract, "off");
  assert.equal(f({ clients: "pro" }).withdrawal, "off", "professionnels à distance : pas de rétractation");
  assert.deepEqual([f({ clients: "pro", offsite: "on" }).small_pro, f({ clients: "pro", offsite: "on" }).withdrawal], ["on", "on"], "art. L221-3 hors établissement");
  assert.equal(f({ clients: "pro", offsite: "on" }).retract, "off");
  assert.deepEqual([f({ clients: "part" }).retract, f({ clients: "part" }).distance_part, f({ clients: "part" }).offsite_part], ["on", "on", "off"]);
  assert.deepEqual([f({ clients: "part", distance: "off" }).retract, f({ clients: "part", distance: "off" }).withdrawal], ["off", "off"], "dans les locaux seulement");
  assert.deepEqual([f({ clients: "part", distance: "off", online: "on" }).distance, f({ clients: "part", distance: "off", online: "on" }).online], ["on", "on"], "commande en ligne = à distance");
  assert.equal(f({ clients: "pro", online: "on" }).online, "off", "rétractation en ligne : clients particuliers");
  const both = f({ clients: "both", offsite: "on" });
  assert.deepEqual([both.offsite_part, both.small_pro, both.both, both.pro_only, both.part_only], ["on", "on", "on", "off", "off"]);
  assert.deepEqual([f({ clients: "x" }).clients, f({ clients: "x" }).has_part], ["pro", "off"], "valeur inconnue : professionnels");
});

test("délai de paiement : 60 jours au plus entre professionnels, rappel des 45 jours, à réception", () => {
  assert.deepEqual(codes(prep(OK)), []);
  assert.equal(prep(OK).text.terms_text, "dans un délai de 30 jours à compter de leur date d'émission");
  assert.equal(prep({ ...OK, terms: "0" }).text.terms_text, "à réception de la facture");
  const over = prep({ ...OK, terms: "61" });
  assert.ok(codes(over).includes("terms_max"));
  assert.equal(over.checks.find((c) => c.code === "terms_max").params.max, R.retard_paiement_delais.delai_max_date_facture_jours);
  assert.equal(over.text.terms_text, "", "un délai illégal n'est pas écrit");
  assert.ok(codes(prep({ ...OK, terms: "60" })).includes("terms_periodic"));
  assert.ok(!codes(prep({ ...OK, terms: "45" })).includes("terms_periodic"));
  assert.deepEqual(codes(prep({ ...OK, clients: "part", terms: "90" })), [], "pas de plafond légal avec des particuliers");
  for (const bad of ["", "abc", "-1", "12,5"]) assert.ok(codes(prep({ ...OK, terms: bad })).includes("terms_invalid"), `délai « ${bad} »`);
});

test("pénalités de retard : BCE + 10 points, trois fois le taux légal, taux choisi contrôlé", () => {
  assert.equal(prep(OK).text.penalty_text,
    "au taux de refinancement de la Banque centrale européenne en vigueur au 1er janvier (premier semestre) ou au 1er juillet (second semestre), majoré de 10 points, soit 12,40 % par an au second semestre 2026");
  assert.equal(prep({ ...OK, penalty: "legal" }).text.penalty_text, "à trois fois le taux de l'intérêt légal en vigueur, soit 8,25 % par an au second semestre 2026");
  assert.equal(prep({ ...OK, penalty: "custom", penalty_rate: "15" }).text.penalty_text, "au taux de 15 % par an");
  assert.deepEqual(codes(prep({ ...OK, penalty: "custom", penalty_rate: "8,25" })), [], "le minimum est permis");
  const low = prep({ ...OK, penalty: "custom", penalty_rate: "8,2" });
  assert.deepEqual(low.checks.find((c) => c.code === "penalty_min").params, { min: "8,25 %", semester: "second semestre 2026" });
  assert.equal(low.text.penalty_text, "", "un taux illégal n'est pas écrit");
  assert.ok(codes(prep({ ...OK, penalty: "custom", penalty_rate: "" })).includes("penalty_invalid"));
  assert.deepEqual(codes(prep({ ...OK, clients: "part", penalty: "custom", penalty_rate: "" })), [], "pénalités : clients professionnels seulement");
  assert.equal(prep({ ...OK, penalty: "inconnu" }).text.penalty_text, prep(OK).text.penalty_text, "valeur inconnue : taux par défaut");
  assert.ok(codes(prep({ ...OK, penalty: "legal" }, "2027-02-01")).includes("rates_unknown"), "taux légal inconnu");
  const later = prep(OK, "2027-02-01");
  assert.ok(codes(later).includes("rates_unknown"));
  assert.ok(!later.text.penalty_text.includes("soit"), "sans taux connu : la formule seule");
  assert.ok(prep({ ...OK, penalty: "custom", penalty_rate: "5" }, "2027-02-01").text.penalty_text.includes("5 %"), "minimum inconnu : pas de blocage");
});

test("acompte, escompte, moyens de paiement, délais : contrôles", () => {
  const off = prep({ ...OK, clients: "part", offsite: "on" });
  assert.ok(codes(off).includes("offsite_deposit"));
  assert.equal(off.checks.find((c) => c.code === "offsite_deposit").params.days, R.hors_etablissement.paiement_interdit_jours);
  assert.ok(!codes(prep({ ...OK, clients: "part", offsite: "on", deposit: "0" })).includes("offsite_deposit"));
  assert.ok(!codes(prep({ ...OK, clients: "pro", offsite: "on" })).includes("offsite_deposit"), "règle des 7 jours : particuliers");
  assert.equal(prep({ ...OK, deposit: "0" }).flags.has_deposit, "off");
  assert.equal(prep({ ...OK, deposit: "" }).flags.has_deposit, "off");
  assert.ok(codes(prep({ ...OK, deposit: "120" })).includes("deposit_invalid"));
  assert.ok(codes(prep({ ...OK, escompte: "yes" })).includes("escompte_invalid"));
  const esc = prep({ ...OK, escompte: "yes", escompte_rate: "2", escompte_days: "8" });
  assert.deepEqual([esc.flags.escompte, esc.text.escompte_rate, esc.text.escompte_days, codes(esc).length], ["on", "2", "8", 0]);
  assert.ok(codes(prep({ ...OK, pay_transfer: "off" })).includes("payment_none"));
  assert.equal(prep({ ...OK, pay_card: "on", pay_check: "on" }).text.payment_methods, "virement, carte bancaire et chèque");
  assert.equal(prep(OK).text.payment_methods, "virement");
  assert.equal(prep({ ...OK, pay_check: "on" }).text.payment_methods, "virement et chèque");
  assert.ok(codes(prep({ ...OK, escompte: "yes", escompte_rate: "2", escompte_days: "" })).includes("escompte_invalid"), "escompte sans délai");
  assert.deepEqual([prep(OK).text.escompte_rate, prep(OK).text.escompte_days], ["", ""], "pas d'escompte : rien d'écrit");
  assert.ok(codes(prep({ ...OK, acceptance: "31" })).includes("acceptance_max"));
  assert.ok(codes(prep({ ...OK, acceptance: "" })).includes("acceptance_invalid"));
  assert.ok(!codes(prep({ ...OK, clients: "part", acceptance: "" })).includes("acceptance_invalid"), "recette : professionnels");
  assert.ok(codes(prep({ ...OK, notice: "x" })).includes("notice_invalid"));
  assert.ok(codes(prep({ ...OK, validity: "0" })).includes("validity_invalid"));
});

test("informations obligatoires et démarches : contrôles", () => {
  const has = (set, code) => codes(prep({ ...OK, ...set })).includes(code);
  assert.ok(has({ p_name: "" }, "name_missing"));
  assert.ok(has({ p_siren: "" }, "siren_missing"));
  assert.ok(has({ vat: "vat" }, "vat_number_missing") && !has({ vat: "vat", p_vat: "FR12123456789" }, "vat_number_missing"));
  assert.ok(has({ p_privacy: "" }, "privacy_missing"));
  assert.ok(has({ med_name: "" }, "mediator_missing") && !has({ clients: "pro", med_name: "" }, "mediator_missing"), "médiateur : particuliers");
  assert.ok(has({ med_site: "" }, "mediator_incomplete"));
  assert.ok(has({ p_email: "" }, "retract_contact") && has({ p_address: "" }, "retract_contact"));
  assert.ok(!has({ clients: "part", distance: "off", p_email: "" }, "retract_contact"), "sans rétractation, pas de contrôle");
  assert.ok(has({ online: "on" }, "online_url_missing") && !has({ online: "on", online_url: "https://x.fr/r" }, "online_url_missing"));
  assert.ok(has({ clients: "part", distance: "off" }, "premises_only"));
  assert.ok(!has({ clients: "pro", distance: "off" }, "premises_only"), "locaux : contrôle pour les particuliers seulement");
  assert.ok(!has({ clients: "pro", online: "on" }, "online_url_missing"), "rétractation en ligne : particuliers seulement");
  const levels = Object.fromEntries(prep({ ...OK, p_name: "", p_siren: "", p_privacy: "" }).checks.map((c) => [c.code, c.level]));
  assert.deepEqual(levels, { name_missing: "error", siren_missing: "warn", privacy_missing: "info" });
});

test("textes calculés depuis les règles : 14 jours, 7 jours, 40 €, un an, 5 salariés, 2 ans", () => {
  const t = prep(OK).text;
  assert.equal(t.retract_days, String(R.retractation_consommateur.delai_jours));
  assert.equal(t.refund_days, String(R.retractation_consommateur.remboursement_jours));
  assert.equal(t.offsite_days, String(R.hors_etablissement.paiement_interdit_jours));
  assert.equal(t.indemnity, R.indemnite_forfaitaire_recouvrement + " €");
  assert.equal(t.med_delay, R.mediation_consommation.saisine_delai_ans === 1 ? "d'un an" : "?");
  assert.equal(t.small_max, String(R.petits_professionnels_hors_etablissement.salaries_max));
  assert.equal(t.warranty_years, String(R.garantie_legale_conformite.duree_ans));
  assert.equal(prep({ ...OK, offsite: "on" }).text.where, "à distance ou hors établissement");
  assert.equal(prep({ ...OK, distance: "off", offsite: "on" }).text.where, "hors établissement (notamment à son domicile)");
});

// ------------------------------------------------------------------------------------------------------------
// Page : formulaire lu comme le fait tools/cgv.js, rendu par le moteur commun.

const html = readFileSync(new URL("../../content/fr/conditions-generales-de-vente.html", import.meta.url), "utf8");
const D = JSON.parse(/id="cgv-data">([\s\S]*?)<\/script>/.exec(html)[1]);
const front = JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].slice(1).map((m) => [m[1], m[2] === undefined ? true : m[2]]));
function fields() {
  const form = /<form[^>]*id="cgv-form"[\s\S]*?<\/form>/.exec(html)[0], out = {};
  for (const m of form.matchAll(/<input [^>]*>/g)) {
    const a = attrs(m[0]);
    out[a.name] = { id: a.id, type: a.type, value: a.value || "", checked: !!a.checked };
  }
  for (const m of form.matchAll(/<textarea [^>]*>/g)) { const a = attrs(m[0]); out[a.name] = { id: a.id, type: "textarea", value: "" }; }
  for (const m of form.matchAll(/<select id="([\w-]+)" name="(\w+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    const options = [...m[3].matchAll(/<option value="([^"]*)"( selected)?>([^<]*)<\/option>/g)].map((o) => ({ value: o[1], selected: !!o[2], text: o[3] }));
    out[m[2]] = { id: m[1], type: "select", options, value: (options.find((o) => o.selected) || options[0]).value };
  }
  return out;
}
function render(set = {}) {
  const raw = {}, text = {};
  for (const [name, f] of Object.entries(fields())) {
    raw[name] = name in set ? set[name] : f.type === "checkbox" ? (f.checked ? "on" : "off") : f.value;
    if (f.type !== "checkbox") text[name] = raw[name];
  }
  const p = C.prepare(raw, R, TODAY, fmt);
  Object.assign(text, p.text, { contacts: [raw.p_email, raw.p_phone].filter(Boolean).join(", "), today: "29 octobre 2026",
    franchise: INV.franchiseMention(TODAY, R), title: D.ui.title_prefix });
  const flags = Object.assign(K.flags(raw), p.flags);
  return { html: K.render(D, { raw: flags, text, blocks: p.blocks }), flags, checks: p.checks };
}
const plain = (h) => h.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

test("page : en-tête, scripts, sources, menu, messages de tous les contrôles", () => {
  assert.equal(front.id, "cgv");
  assert.deepEqual(front.scripts, ["engines/invoice-fr.js", "engines/contract-doc.js", "engines/cgv-fr.js", "tools/cgv.js"]);
  assert.ok(front.title.length <= 60 && front.description.length <= 160, "titre et description");
  assert.ok(front.faq.length >= 3 && front.faq.length <= 6);
  for (const key of front.sources) assert.ok(key in R, `source ${key}`);
  const nav = JSON.parse(readFileSync(new URL("../../content/fr/site.json", import.meta.url), "utf8")).nav;
  assert.ok(nav.find((g) => g.key === "sell").items.includes("cgv"), "menu « Vendre »");
  const engine = readFileSync(new URL("../../src/assets/engines/cgv-fr.js", import.meta.url), "utf8");
  const all = [...engine.matchAll(/check\("(\w+)"/g)].map((m) => m[1]);
  assert.ok(all.length >= 20);
  for (const code of all) assert.ok(D.ui.checks[code], `message du contrôle ${code}`);
  for (const code of Object.keys(D.ui.checks)) assert.ok(all.includes(code), `message sans contrôle : ${code}`);
});

test("page : chiffres de la FAQ et des explications = règles", () => {
  const faq = JSON.stringify(front.faq);
  const r = C.rates(R, TODAY);
  assert.ok(faq.includes(fmt.pct(r.minPenalty)) && faq.includes(fmt.pct(r.defaultPenalty)), "8,25 % et 12,40 %");
  assert.ok(faq.includes(`${R.retractation_consommateur.delai_jours} jours`));
  assert.ok(faq.includes(`${R.indemnite_forfaitaire_recouvrement} €`));
  assert.ok(faq.includes(R.mediation_consommation.amende_ei.toLocaleString("fr-FR").replace(/\s/g, " ") + " €"), "amende du médiateur");
  const prose = html.slice(html.indexOf('<section class="section prose">'));
  assert.ok(prose.includes(`${R.hors_etablissement.paiement_interdit_jours} jours`));
  assert.ok(prose.includes(`${R.retard_paiement_delais.delai_max_date_facture_jours} jours`));
  assert.ok(prose.includes("19 juin 2026") && R.retractation_en_ligne.depuis === "2026-06-19");
});

test("page : chaque champ des textes existe (formulaire ou valeur calculée)", () => {
  const f = fields(), computed = Object.keys(C.prepare(OK, R, TODAY, fmt).text).concat(["contacts", "today", "franchise", "title"]);
  const doc = JSON.stringify({ ...D, ui: null });   // les messages (D.ui) ont leurs propres paramètres
  const keys = new Set([...doc.matchAll(/\{(\w+)\}|\[\[(\w+)\|/g)].map((m) => m[1] || m[2]));
  keys.delete("n"); keys.delete("title");   // numéro et titre d'article (D.article, D.annex)
  for (const key of keys) assert.ok(key in f || computed.includes(key), `champ {${key}}`);
  const conds = new Set([...doc.matchAll(/"when":\{([^}]*)\}/g)].flatMap((m) => [...m[1].matchAll(/"(\w+)":/g)].map((x) => x[1])));
  const flags = render().flags;
  for (const c of conds) assert.ok(c in flags, `condition ${c}`);
});

const CLIENTS = ["pro", "part", "both"];
const MODES = { distance: { distance: "on", offsite: "off" }, offsite: { distance: "off", offsite: "on" }, both: { distance: "on", offsite: "on" }, premises: { distance: "off", offsite: "off" } };

for (const clients of CLIENTS) {
  for (const [mode, set] of Object.entries(MODES)) {
    for (const online of ["off", "on"]) {
      test(`rendu : clients ${clients}, contrats ${mode}, commande en ligne ${online}`, () => {
        const r = render({ ...OK, clients, ...set, online, online_url: "https://x.fr/retractation" });
        const out = plain(r.html);
        assert.doesNotMatch(r.html, /\{\w+\}|\[\[|undefined|k-blank/, "aucune clé brute ni case vide avec une saisie complète");
        // Articles numérotés sans trou.
        const nums = [...r.html.matchAll(/<h3>Article (\d+) – /g)].map((m) => Number(m[1]));
        assert.deepEqual(nums, nums.map((_, i) => i + 1));
        const pro = clients !== "part", part = clients !== "pro";
        const withdrawal = (part && (set.distance === "on" || set.offsite === "on" || online === "on")) || (pro && set.offsite === "on");
        assert.equal(r.html.includes("Annexe – Modèle de formulaire de rétractation"), withdrawal, "annexe si et seulement si la rétractation s'applique");
        assert.equal(out.includes("Droit de rétractation"), withdrawal);
        assert.equal(out.includes("indemnité forfaitaire pour frais de recouvrement de 40 €"), pro);
        assert.equal(out.includes("limitée aux dommages directs"), pro, "limitation de responsabilité : professionnels seulement");
        assert.equal(out.includes("ne limite ni n'exclut le droit du Client à réparation"), part);
        assert.equal(out.includes("médiateur de la consommation"), part);
        assert.equal(out.includes("réputés acceptés"), pro, "recette tacite : professionnels seulement");
        assert.equal(out.includes("toutes taxes comprises") || out.includes("prix nets"), true);
        assert.equal(out.includes("Clients professionnels :"), clients === "both", "étiquettes seulement si les deux clientèles");
        assert.equal(out.includes("Clients particuliers :"), clients === "both");
        if (clients === "part") assert.ok(!out.includes("solution amiable"), "pas d'étape amiable évoquée pour un particulier");
        assert.equal(out.includes("à l'adresse https://x.fr/retractation"), part && online === "on", "rétractation en ligne");
        assert.equal(out.includes(`délai de ${R.hors_etablissement.paiement_interdit_jours} jours à compter de la conclusion`), part && set.offsite === "on");
        assert.equal(out.includes("art. L221-3"), pro && set.offsite === "on");
        assert.equal((out.match(/salariés au plus/g) || []).length, pro && set.offsite === "on" ? 1 : 0, "petits professionnels : une seule phrase");
        assert.equal(out.includes("Pour un contrat conclu à distance avec un client particulier, le Prestataire lui confirme le contrat sur un support durable"), part && (set.distance === "on" || online === "on"));
        assert.equal((out.match(/solution amiable avant toute action/g) || []).length, pro ? 1 : 0, "une seule clause amiable, jamais pour les particuliers seuls");
        assert.equal(out.includes("Article 16 – Règlement amiable") || out.includes("– Règlement amiable"), clients === "pro");
        if (clients === "both") {
          for (const label of ["Clients professionnels : tout retard", "Clients particuliers : en cas de retard", "Clients professionnels : le Client vérifie",
            "Clients particuliers : le Client signale", "Clients professionnels : sauf refus", "Clients particuliers : le Prestataire ne présente",
            "Clients professionnels : la responsabilité", "Clients particuliers : aucune stipulation", "Clients particuliers : le Client adresse",
            "Clients professionnels : les Parties recherchent"]) assert.ok(out.includes(label), label);
        }
        assert.equal(out.includes("exemplaire daté du contrat signé par les deux Parties"), part && set.offsite === "on");
        if (withdrawal) {
          assert.ok(out.includes("dispose d'un délai de 14 jours") || out.includes("bénéficie du même droit"));
          assert.ok(out.includes("par le même moyen de paiement") && out.includes("montant proportionnel"));
          assert.ok(out.includes("À l'attention de Camille Martin EI, 12 rue de la République, 69002 Lyon, contact@exemple.fr :"));
        }
      });
    }
  }
}

test("rendu : aucune clause interdite envers un particulier (fiche officielle des clauses abusives)", () => {
  const out = plain(render({ ...OK, clients: "part" }).html);
  assert.doesNotMatch(out, /pourra être modifié à tout moment|seul juge|sans préavis|à titre indicatif|ne pourra en aucun cas être tenu responsable|conserve l'acompte/i);
  assert.ok(out.includes("ne peut pas être modifié sans l'accord du Client"), "prix du devis");
  assert.ok(out.includes("les sommes versées au-delà lui sont remboursées"), "réciprocité de la résiliation");
  assert.ok(out.includes("Le recours à la médiation est facultatif"));
  assert.ok(out.includes("intérêts au taux de l'intérêt légal à compter de la mise en demeure"));
  assert.ok(!out.includes("pénalités de retard"), "pas de pénalités commerciales envers un particulier");
});

test("rendu : contrat hors établissement avec un particulier, avec ou sans acompte", () => {
  const without = plain(render({ ...OK, clients: "part", offsite: "on", deposit: "0" }).html);
  assert.ok(without.includes("Pour un contrat conclu hors établissement avec un client particulier, aucun paiement ne peut être reçu avant l'expiration d'un délai de 7 jours"));
  assert.ok(!without.includes("Un acompte de"));
  const withDeposit = plain(render({ ...OK, clients: "part", offsite: "on" }).html);
  assert.ok(withDeposit.includes("Un acompte de 30 % du prix") && withDeposit.includes("Toutefois, pour un contrat conclu hors établissement avec un client particulier, aucun paiement ni acompte"));
});

test("rendu : prix, TVA et options", () => {
  const vat = plain(render({ ...OK, vat: "vat", p_vat: "FR12 123456789" }).html);
  assert.ok(vat.includes("hors taxes pour les clients professionnels") && vat.includes("toutes taxes comprises pour les clients particuliers"));
  assert.ok(vat.includes("Numéro de TVA intracommunautaire : FR12 123456789."));
  const PRICE = {
    pro: "Les prix sont exprimés en euros hors taxes ; ils sont majorés de la TVA au taux en vigueur à la date de facturation.",
    part: "Les prix sont exprimés en euros, toutes taxes comprises.",
    both: "Les prix sont exprimés en euros, hors taxes pour les clients professionnels, majorés de la TVA au taux en vigueur à la date de facturation, et toutes taxes comprises pour les clients particuliers.",
  };
  for (const clients of CLIENTS) {
    for (const v of ["vat", "franchise"]) {
      const out = plain(render({ ...OK, clients, vat: v, p_vat: "FR12" }).html);
      assert.equal((out.match(/Les prix sont exprimés/g) || []).length, 1, `une seule phrase de prix (${clients}, ${v})`);
      if (v === "vat") assert.ok(out.includes(PRICE[clients]), `prix ${clients}`);
      const refs = (out.match(/présente(r)? les livrables dans ses références/g) || []).length;
      assert.equal(refs, clients === "both" ? 2 : 1, `portfolio (${clients})`);
    }
  }
  const fr = plain(render(OK).html);
  assert.ok(fr.includes("prix nets : " + INV.franchiseMention(TODAY, R)), "mention de franchise des factures");
  assert.ok(fr.includes("Aucun escompte n'est accordé"));
  assert.ok(plain(render({ ...OK, escompte: "yes", escompte_rate: "2", escompte_days: "8" }).html).includes("dans les 8 jours suivant la date de la facture bénéficie d'un escompte de 2 %"));
  assert.ok(plain(render({ ...OK, ip: "license" }).html).includes("droit d'utilisation non exclusif des livrables pour l'usage prévu au devis"));
  assert.ok(!plain(render({ ...OK, conf: "off" }).html).includes("Confidentialité"));
  assert.ok(plain(render({ ...OK, subcontract: "on" }).html).includes("à des sous-traitants"));
  assert.ok(!plain(render({ ...OK, clients: "pro", liability: "off" }).html).includes("limitée aux dommages directs"));
  assert.ok(plain(render({ ...OK, p_insurance: "Assureur X, France" }).html).includes("Assurance de responsabilité professionnelle : Assureur X, France."));
  // Valeurs illégales : laissées en blanc à compléter.
  assert.match(render({ ...OK, terms: "90" }).html, /payables <span class="p-empty k-blank">délai de paiement<\/span>/);
  assert.match(render({ ...OK, penalty: "custom", penalty_rate: "3" }).html, /calculées <span class="p-empty k-blank">au taux de …<\/span>/);
});
