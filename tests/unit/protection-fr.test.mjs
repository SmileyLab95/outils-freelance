// Tests du moteur de protection sociale (France) : indemnités journalières maladie et allocation des travailleurs
// indépendants (documentation/50-protection-sociale.md). Valeurs attendues calculées à la main à partir des fiches
// F36708 et F23994 de service-public.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const P = require("../../src/assets/engines/protection-fr.js");
const R = ruleValues("fr");

const arret = (over) => P.ijMaladie(R, { situation: "reel_artisan_commercant", montant: 36500, debut: "2026-11-13", fin: "2026-11-25", affilie: true, ...over });

test("règles : plafonds égaux au plafond de la sécurité sociale (×1 et ×3), montants maximaux publiés", () => {
  const ij = R.ij_maladie_independants;
  assert.equal(R.pass_2026 * ij.plafond_pass.artisan_commercant, 48060);
  assert.equal(R.pass_2026 * ij.plafond_pass.liberal, 144180);
  assert.equal(ij.ij_max.artisan_commercant, 65.84, "48 060 ÷ 730 = 65,836 → 65,84 (fiche F36708)");
  assert.equal(ij.ij_max.liberal, 197.5, "publié 197,50 € (144 180 ÷ 730 = 197,507)");
  assert.ok(Math.abs(48060 / ij.diviseur - ij.ij_max.artisan_commercant) < 0.01);
  assert.ok(Math.abs(144180 / ij.diviseur - ij.ij_max.liberal) < 0.01);
});

test("exemple officiel : arrêt du 13 au 25 novembre, indemnités du 16 au 25 (10 jours après 3 jours de carence)", () => {
  const r = arret();
  assert.equal(r.jours, 13);
  assert.equal(r.carence, 3);
  assert.equal(r.joursIndemnises, 10);
  assert.equal(r.premierJour, "2026-11-16");
  assert.equal(r.dernierJour, "2026-11-25");
  assert.equal(r.ij, 50, "36 500 ÷ 730 = 50,00 €");
  assert.equal(r.total, 500);
  assert.equal(r.regime, "artisan_commercant");
});

test("plafond : artisan ou commerçant 65,84 € par jour au-delà de 48 060 €, libéral 197,50 € au-delà de 144 180 €", () => {
  let r = arret({ montant: 90000 });
  assert.equal(r.ij, 65.84);
  assert.equal(r.plafonnee, true);
  r = arret({ montant: 48059 });
  assert.equal(r.ij, 65.83, "48 059 ÷ 730 = 65,834");
  assert.equal(r.plafonnee, false);
  r = arret({ situation: "reel_liberal", montant: 200000 });
  assert.equal(r.ij, 197.5);
  r = arret({ situation: "reel_liberal", montant: 144179 });
  assert.equal(r.ij, 197.5, "144 179 ÷ 730 = 197,505 → 197,51, jamais plus que le maximum publié");
  assert.equal(r.plafonnee, true);
  r = arret({ situation: "reel_liberal", montant: 144000 });
  assert.equal(r.ij, 197.26, "144 000 ÷ 730 = 197,260");
  assert.equal(r.plafonnee, false);
  r = arret({ situation: "reel_liberal", montant: 73000 });
  assert.equal(r.ij, 100);
});

test("arrêt court : 3 jours ou moins, rien n'est versé", () => {
  for (const fin of ["2026-11-13", "2026-11-15"]) {
    const r = arret({ fin });
    assert.equal(r.joursIndemnises, 0, fin);
    assert.equal(r.total, 0);
    assert.equal(r.premierJour, null);
  }
  assert.equal(arret({ fin: "2026-11-16" }).joursIndemnises, 1, "4e jour indemnisé");
});

test("libéral : 90 jours d'arrêt au plus, soit 87 jours indemnisés ; artisan ou commerçant sans limite calculée", () => {
  const lib = arret({ situation: "reel_liberal", montant: 73000, debut: "2026-01-01", fin: "2026-06-30" });
  assert.equal(lib.jours, 181);
  assert.equal(lib.joursIndemnises, 87);
  assert.equal(lib.dernierJour, "2026-03-31", "90e jour d'arrêt");
  assert.equal(lib.limite, 91);
  assert.equal(lib.total, 8700);
  const art = arret({ debut: "2026-01-01", fin: "2026-06-30" });
  assert.equal(art.joursIndemnises, 178);
  assert.equal(art.limite, 0);
});

test("revenu du micro-entrepreneur (pour l'ATI) : chiffre d'affaires moins l'abattement de son activité, minimum compris", () => {
  assert.equal(P.revenu(R, "vente", 100000), 29000);
  assert.equal(P.revenu(R, "services_bic", 60000), 30000);
  assert.equal(P.revenu(R, "liberal_bnc", 50000), 33000);
  assert.equal(P.revenu(R, "liberal_bnc", 500), 195, "abattement minimum de 305 €");
  assert.equal(P.revenu(R, "liberal_bnc", 200), 0, "jamais négatif");
  assert.equal(P.revenu(R, "reel_liberal", 50000), 50000, "au réel : le revenu saisi");
});

test("arrêt maladie : pas de calcul pour un micro-entrepreneur (fiche F36708 limitée à l'entrepreneur individuel au réel)", () => {
  for (const situation of ["vente", "services_bic", "liberal_bnc"]) assert.equal(arret({ situation, montant: 73000 }).error, "micro", situation);
});

test("affiliation de moins de 12 mois : pas d'indemnités", () => {
  const r = arret({ affilie: false });
  assert.equal(r.eligible, false);
  assert.equal(r.joursIndemnises, 0);
  assert.equal(r.total, 0);
  assert.equal(r.ij, 50, "montant indiqué pour information");
});

test("saisies invalides", () => {
  assert.equal(arret({ situation: "x" }).error, "situation");
  assert.equal(arret({ situation: "artisan" }).error, "situation", "micro artisan : choisir « services commerciaux ou artisanaux »");
  assert.equal(P.revenu(R, "cipav", 1000), null);
  assert.equal(arret({ montant: -1 }).error, "montant");
  assert.equal(arret({ montant: NaN }).error, "montant");
  assert.equal(arret({ debut: "2026-02-30" }).error, "dates");
  assert.equal(arret({ fin: "" }).error, "dates");
  assert.equal(arret({ debut: "2026-11-25", fin: "2026-11-13" }).error, "ordre");
});

const ati = (over) => P.ati(R, { cause: "liquidation", deuxAns: true, situation: "reel_artisan_commercant", revenus: [12000, 8000],
  ressources: 400, date: "2026-03-15", ...over });

test("ATI : toutes les conditions remplies → 19,73 € à 26,30 € par jour pendant 182 jours", () => {
  const r = ati();
  assert.equal(r.eligible, true);
  assert.deepEqual(r.conditions.map((c) => [c.key, c.ok]), [["cause", true], ["anciennete", true], ["revenu", true], ["ressources", true]]);
  assert.equal(r.jourMin, 19.73);
  assert.equal(r.jourMax, 26.3);
  assert.equal(r.duree, 182);
  assert.equal(r.totalMin, 3590.86, "19,73 × 182");
  assert.equal(r.totalMax, 4786.6, "26,30 × 182");
  assert.equal(r.inscription, "2027-03-15", "inscription dans les 12 mois suivant le jugement");
  assert.deepEqual(r.revenus, [12000, 8000]);
  assert.equal(r.meilleur, 12000);
});

test("ATI : chaque condition seule", () => {
  assert.equal(ati({ cause: "autre" }).eligible, false, "cessation volontaire");
  assert.equal(ati({ deuxAns: false }).eligible, false);
  assert.equal(ati({ revenus: [10000, 9000] }).eligible, false, "10 000 € exactement : il faut plus de 10 000 €");
  assert.equal(ati({ revenus: [0, 10000.01] }).eligible, true, "l'une des 2 années suffit");
  assert.equal(ati({ ressources: 651.69 }).eligible, false, "il faut moins de 651,69 €");
  assert.equal(ati({ ressources: 651.68 }).eligible, true);
  assert.equal(ati({ cause: "redressement" }).eligible, true);
  const nv = ati({ cause: "non_viable", baisse30: false });
  assert.equal(nv.eligible, false);
  assert.deepEqual(nv.conditions.at(-1), { key: "baisse", ok: false });
  assert.equal(ati({ cause: "non_viable", baisse30: true }).eligible, true);
  assert.equal(ati({ cause: "non_viable", baisse30: true }).inscription, null, "délai d'inscription lu seulement pour un jugement");
  assert.equal(ati({ cause: "redressement" }).inscription, "2027-03-15", "redressement : 12 mois à partir de la date du jugement");
  assert.equal(ati({ revenus: [12000, null] }).eligible, true, "année sans revenu saisi : 0 €");
  assert.deepEqual(ati({ revenus: [12000, null] }).revenus, [12000, 0]);
});

test("ATI : micro-entrepreneur (chiffre d'affaires moins l'abattement), Mayotte, fin de mois, saisies invalides", () => {
  assert.equal(ati({ situation: "liberal_bnc", revenus: [15000, 0] }).eligible, false, "15 000 € de CA en libéral = 9 900 € de revenu");
  const lib = ati({ situation: "liberal_bnc", revenus: [15200, ""] });
  assert.equal(lib.eligible, true, "15 200 € → 10 032 €");
  assert.equal(lib.meilleur, 10032);
  assert.equal(ati({ situation: "liberal_bnc", revenus: [15152, 0] }).eligible, true, "15 152 € → 10 000,32 € (seuil cité par la page)");
  assert.equal(ati({ situation: "liberal_bnc", revenus: [15151, 0] }).eligible, false, "15 151 € → 9 999,66 €");
  assert.equal(ati({ situation: "services_bic", revenus: [20000, 0] }).eligible, false, "20 000 € → 10 000 € exactement");
  assert.equal(ati({ revenus: [] }).meilleur, 0);
  const m = ati({ mayotte: true });
  assert.equal(m.jourMin, 13.15);
  assert.equal(m.jourMax, 19.73);
  assert.equal(ati({ date: "2026-01-31" }).inscription, "2027-01-31");
  assert.equal(ati({ date: "2028-02-29" }).inscription, "2029-02-28", "29 février → dernier jour de février");
  assert.equal(ati({ date: "" }).inscription, null);
  assert.equal(ati({ cause: "x" }).error, "cause");
  assert.equal(ati({ situation: "x" }).error, "situation");
  assert.equal(ati({ revenus: [-5, 0] }).error, "revenus");
  assert.equal(ati({ ressources: NaN }).error, "ressources");
});

test("pages : chiffres cités égaux aux règles, scripts et sources déclarés, liens vers la page sœur", async () => {
  const { readFileSync } = await import("node:fs");
  const read = (f) => readFileSync(new URL("../../content/fr/" + f, import.meta.url), "utf8").replace(/[  ]/g, " ");
  const fr = (n, d = 2) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[  ]/g, " ");
  const A = R.ati_independants;
  const page = read("chomage-independant-ati.html");
  const meta = JSON.parse(page.match(/<!--(\{.*?\})-->/s)[1]);
  assert.deepEqual(meta.scripts, ["engines/protection-fr.js", "tools/fr-ati.js"]);
  assert.ok(meta.sources.includes("ati_independants"));
  const r = P.ati(R, { cause: "liquidation", deuxAns: true, situation: "reel_liberal", revenus: [20000, 0], ressources: 0 });
  for (const value of [fr(A.forfait_jour) + " €", fr(A.minimum_jour) + " €", fr(A.mayotte.minimum_jour) + " €", fr(A.ressources_max_mois) + " €",
    fr(A.revenu_minimum, 0) + " €", A.duree_jours + " jours", A.inscription_mois + " mois", A.anciennete_ans + " ans",
    Math.round(A.baisse_non_viable * 100) + " %", fr(r.totalMin) + " €", fr(r.totalMax) + " €"]) {
    assert.ok(page.includes(value), `ATI : « ${value} »`);
  }
  for (const [key, pct] of [["vente", "71 %"], ["services_bic", "50 %"], ["liberal_bnc", "34 %"]]) {
    assert.equal(Math.round(R.micro_activities[key].abattement * 100) + " %", pct);
    assert.ok(page.includes(pct), `abattement ${pct}`);
  }
  // Seuil de chiffre d'affaires cité pour une activité libérale : le plus petit montant entier qui dépasse 10 000 € de revenu.
  const seuil = Math.floor(A.revenu_minimum / (1 - R.micro_activities.liberal_bnc.abattement)) + 1;
  assert.ok(page.includes(fr(seuil, 0) + " €"), `seuil libéral ${seuil}`);
  assert.equal(P.ati(R, { cause: "liquidation", deuxAns: true, situation: "liberal_bnc", revenus: [seuil, 0], ressources: 0 }).eligible, true);
  assert.equal(P.ati(R, { cause: "liquidation", deuxAns: true, situation: "liberal_bnc", revenus: [seuil - 1, 0], ressources: 0 }).eligible, false);
  assert.ok(page.includes("{{link:sick-pay}}"));
});

test("page arrêt maladie : chiffres cités égaux aux règles, exemple recalculé par le moteur, micro-entrepreneur non chiffré", async () => {
  const { readFileSync } = await import("node:fs");
  const page = readFileSync(new URL("../../content/fr/arret-maladie-independant.html", import.meta.url), "utf8").replace(/[  ]/g, " ");
  const fr = (n, d = 2) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[  ]/g, " ");
  const ij = R.ij_maladie_independants;
  const meta = JSON.parse(page.match(/<!--(\{.*?\})-->/s)[1]);
  assert.deepEqual(meta.scripts, ["engines/protection-fr.js", "tools/fr-arret-maladie.js"]);
  assert.ok(meta.sources.includes("ij_maladie_independants") && meta.sources.includes("pass_2026"));
  for (const value of [fr(R.pass_2026, 0) + " €", fr(R.pass_2026 * ij.plafond_pass.liberal, 0) + " €", fr(ij.ij_max.artisan_commercant) + " €",
    fr(ij.ij_max.liberal) + " €", "÷ " + ij.diviseur, "par " + ij.diviseur, ij.carence_jours + " jours de carence", ij.affiliation_mois + " mois",
    ij.duree_max_jours.liberal + " jours", (ij.duree_max_jours.liberal - ij.carence_jours) + " jours indemnisés"]) {
    assert.ok(page.includes(value), `« ${value} »`);
  }
  // Exemple de la page : 36 500 € de revenu, arrêt de 13 jours (du 13 au 25 novembre) → 10 jours à 50 €, 500 €.
  const r = arret();
  assert.ok(page.includes("36 500 ÷ 730 = 50 € par jour") && page.includes("10 jours × 50 € = " + fr(r.total, 0) + " €"));
  assert.ok(page.includes('<option value="micro">'), "choix micro-entrepreneur présent, sans calcul");
  assert.ok(page.includes("{{link:unemployment}}"));
});
