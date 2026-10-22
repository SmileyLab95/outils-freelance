// Tests des checklists de création (documentation/20-checklist-creation.md) : chaque étape est sourcée par une règle
// citée dans la page, chaque chiffre de la page est celui de sa règle, et le nombre d'étapes comptées dépend de la
// situation. Le comportement dans la page (cases mémorisées, progression) est vérifié par le parcours navigateur.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const rulesOf = (country) => Object.fromEntries(Object.entries(JSON.parse(read(`data/rules/${country}.json`)).values).map(([k, v]) => [k, v.value]));
const CONDITION = /^(!?)([\w-]+)(?:=([\w-]+))?$/;   // même grammaire que checklist.js
const front = (html) => JSON.parse(/<!--(\{[\s\S]*?\})-->/.exec(html)[1]);
const text = (s) => s.replace(/<[^>]+>/g, "").replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();

/** Étapes de la liste (intertitres exclus) : identifiant, règles, condition, conseillée, texte. */
function steps(html) {
  const list = /<ul class="checklist" id="checklist"[\s\S]*?<\/ul>/.exec(html)[0];
  return [...list.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/g)].filter(([, attrs]) => !/class="cl-group"/.test(attrs)).map(([, attrs, body]) => ({
    id: (/data-id="([^"]*)"/.exec(attrs) || [, null])[1],
    rules: (/data-rule="([^"]*)"/.exec(attrs) || [, ""])[1].split(/\s+/).filter(Boolean),
    when: (/data-when="([^"]*)"/.exec(attrs) || [, null])[1],
    optional: /\sdata-optional\b/.test(attrs),
    text: text(body)
  }));
}
const applies = (conds, s) => conds.trim().split(/\s+/).every((cond) => {
  const [, not, key, value] = CONDITION.exec(cond);
  const ok = value !== undefined ? String(s[key]) === value : !!s[key];
  return not ? !ok : ok;
});
const counted = (list, s) => list.filter((i) => !i.optional && (!i.when || applies(i.when, s))).length;
const fr = (n) => n.toLocaleString("fr-FR").replace(/[  ]/g, " ");

const FR = read("content/fr/creer-sa-micro-entreprise.html"), R = rulesOf("fr"), S = steps(FR);
const step = (id, when) => S.find((i) => i.id === id && (when === undefined || i.when === when));

test("France : chaque étape porte une règle existante citée dans les sources, et chaque source sert à une étape", () => {
  assert.ok(S.length > 0);
  const sources = front(FR).sources, used = new Set(S.flatMap((i) => i.rules));
  for (const i of S) {
    assert.ok(i.id && i.rules.length, `${i.text.slice(0, 40)} : data-id et data-rule`);
    for (const key of i.rules) {
      assert.ok(R[key] !== undefined, `${i.id} : règle ${key}`);
      assert.ok(sources.includes(key), `${i.id} : ${key} dans les sources de la page`);
    }
  }
  for (const key of sources) assert.ok(used.has(key), `source ${key} utilisée par une étape`);
});

test("France : conditions lisibles, sur les seuls champs de situation mémorisés ; identifiants partagés par des variantes exclusives", () => {
  for (const i of S) if (i.when) for (const cond of i.when.split(/\s+/)) {
    assert.match(cond, CONDITION, `${i.id} : condition lisible`);
    assert.ok(["vente", "acre"].includes(CONDITION.exec(cond)[2]), `${i.id} : ${cond}`);
  }
  for (const name of ["vente", "acre"]) assert.match(FR, new RegExp(`name="${name}"[^>]*data-save`), `champ ${name} mémorisé`);
  // Un même identifiant (case mémorisée) ne sert qu'à des variantes qui ne sont jamais montrées ensemble.
  for (const s of [{}, { vente: true }, { acre: true }, { vente: true, acre: true }]) {
    const shown = S.filter((i) => !i.when || applies(i.when, s)).map((i) => i.id);
    assert.equal(new Set(shown).size, shown.length, `identifiants uniques dans la situation ${JSON.stringify(s)}`);
  }
});

test("France : nombre de démarches comptées selon la situation ; compte bancaire conseillé, non compté", () => {
  assert.equal(counted(S, {}), 17);
  assert.equal(counted(S, { acre: true }), 18);
  assert.equal(counted(S, { vente: true }), 18);
  assert.equal(counted(S, { vente: true, acre: true }), 19);
  assert.deepEqual(S.filter((i) => i.optional).map((i) => i.id), ["compte"]);
  assert.match(FR, /id="cl-score">0 démarches sur 17</, "score affiché sans JavaScript : situation par défaut");
});

test("France : chiffres, dates et formulaires de la page repris des règles", () => {
  const T = R.tva_franchise_seuils;
  const checks = [
    [step("plafond", "!vente"), `${fr(R.micro_plafond_ca_services)} €`],
    [step("plafond", "vente"), `${fr(R.micro_plafond_ca_vente)} €`],
    [step("vl"), `${fr(R.vl_rfr_plafond_par_part_2026)} € par part en 2026`],
    [step("compte"), `${fr(R.compte_dedie_micro.seuil_ca)} € deux années civiles de suite`],
    [step("tva", "!vente"), `${fr(T.services_seuil)} € par an`], [step("tva", "!vente"), `${fr(T.services_seuil_majore)} €`],
    [step("tva", "vente"), `${fr(T.vente_seuil)} € par an`], [step("tva", "vente"), `${fr(T.vente_seuil_majore)} €`],
    [step("cfe"), R.cfe_declaration_initiale.formulaire], [step("cfe"), R.cfe_declaration_initiale.date_limite],
    [step("revenus"), R.micro_declaration_revenus.formulaire],
    [step("factures"), R.mention_franchise_tva],
    [step("guichet"), R.creation_guichet_unique.site], [step("urssaf"), R.micro_declaration_ca.en_ligne]
  ];
  for (const [s, expected] of checks) assert.ok(s && s.text.includes(expected), `${s && s.id} : « ${expected} »`);
  assert.equal(R.compte_dedie_micro.annees_consecutives, 2);
  // Délais écrits en toutes lettres dans les règles.
  assert.match(R.acre_conditions, /60 jours/);
  assert.ok(step("acre").text.includes("60 jours"));
  assert.match(R.versement_liberatoire_option, /3 mois/);
  assert.ok(step("vl").text.includes("3 mois"));
  assert.equal(R.facturation_electronique_calendrier.reception_toutes_entreprises, "2026-09-01");
  assert.ok(step("einvoice").text.includes("1er septembre 2026"));
  for (const piece of R.creation_guichet_unique.pieces) assert.ok(step("pieces").text.toLowerCase().includes(piece), piece);
});
