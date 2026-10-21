// Tests de la typographie française du générateur (build.py, documentation/15-guides-gestion.md, § 3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
/** Appelle build.typographie_fr sur chaque texte (un seul lancement de Python). */
const typo = (inputs) => JSON.parse(execFileSync("python3", ["-c",
  "import json, sys, build; print(json.dumps([build.typographie_fr(t) for t in json.load(sys.stdin)]))"],
  { cwd: ROOT, input: JSON.stringify(inputs), encoding: "utf8" }));
const NB = " ", FINE = " ";

test("espaces insécables : ponctuation double, guillemets, nombres, unités, références", () => {
  const [a, b, c, d] = typo([
    "<p>Total : 10 000 € ; payé ? Oui !</p>",
    "<p>Intitulé « EI » depuis le 15 mai 2022.</p>",
    "<li>art. L613-10, loi n° 2026-307, 1 234 567 €, 20 %, 30 jours, 2 ans</li>",
    "<h1>Compte bancaire : est-il obligatoire ?</h1>"
  ]);
  assert.equal(a, `<p>Total${NB}: 10${FINE}000${NB}€${FINE}; payé${FINE}? Oui${FINE}!</p>`);
  assert.equal(b, `<p>Intitulé «${NB}EI${NB}» depuis le 15${NB}mai 2022.</p>`);
  assert.equal(c, `<li>art.${NB}L613-10, loi n°${NB}2026-307, 1${FINE}234${FINE}567${NB}€, 20${NB}%, 30${NB}jours, 2${NB}ans</li>`);
  assert.equal(d, `<h1>Compte bancaire${NB}: est-il obligatoire${FINE}?</h1>`);
  const [e, f] = typo(["<p>Excel : 8 graphiques, depuis le 15 mai 2022, 10 000 clients.</p>", "<p>« art. L. 233-3 du CIBS », art. 293 B du CGI</p>"]);
  assert.equal(e, `<p>Excel${NB}: 8${NB}graphiques, depuis le 15${NB}mai 2022, 10${FINE}000${NB}clients.</p>`, "un nombre reste avec le mot qui suit (pas les années)");
  assert.equal(f, `<p>«${NB}art.${NB}L.${NB}233-3 du CIBS${NB}», art.${NB}293${NB}B du CGI</p>`);
});

test("rien n'est retouché hors du texte visible", () => {
  const cases = [
    "<script>var a = 1 ; b ? c : d; // 10 000 €</script>",
    '<script type="application/json">{"q": "Total : 10 000 € ?"}</script>',
    "<style>a::before { content: \" : \"; }</style>",
    "<code>a : b ; c</code><pre>x ? y</pre><textarea>Note : 10 000 €</textarea>",
    "<!-- Commentaire : 10 000 € ? -->",
    '<input placeholder="Exemple : 12 500" title="Note ; ici ?">'
  ];
  assert.deepEqual(typo(cases), cases);
  const [link] = typo(['<a href="https://exemple.fr/page?x=1" title="Lien : ici">Voir : la page</a>']);
  assert.equal(link, `<a href="https://exemple.fr/page?x=1" title="Lien : ici">Voir${NB}: la page</a>`);
});

test("revue : codes, deux nombres voisins, majuscules, « < » isolé dans le texte", () => {
  const [codes, near, upper, lt] = typo([
    "<p>RRQ2 entre 74 600 $, T1 avec le formulaire, relance J+10 qui demande</p>",
    "<p>En 2026 300 entreprises</p>",
    "<p>N° 2026-014, Art. 293 B</p>",
    "<p>CA < 77 700 €</p><script>var x = { a : 1 };</script>"
  ]);
  assert.equal(codes, `<p>RRQ2 entre 74${FINE}600${NB}$, T1 avec le formulaire, relance J+10 qui demande</p>`, "pas d'espace insécable après un code");
  assert.ok(near.startsWith(`<p>En 2026 300${NB}entreprises`), "une année n'est pas un groupe de milliers");
  assert.equal(upper, `<p>N°${NB}2026-014, Art.${NB}293${NB}B</p>`);
  assert.ok(lt.endsWith("<script>var x = { a : 1 };</script>") && lt.startsWith(`<p>CA < 77${FINE}700${NB}€</p>`), "le script reste intact");
});

test("cas à ne pas confondre ; deuxième passage sans effet", () => {
  const [years, hours, url, after] = typo([
    "<p>Années 2024 2025 et 2026.</p>", "<p>Rendez-vous à 10:30.</p>",
    "<p>https://exemple.fr/?q=1</p>", "<p>Ouvert</p><p>Fermé : oui</p>"
  ]);
  assert.equal(years, "<p>Années 2024 2025 et 2026.</p>");
  assert.equal(hours, "<p>Rendez-vous à 10:30.</p>");
  assert.equal(url, "<p>https://exemple.fr/?q=1</p>");
  assert.equal(after, `<p>Ouvert</p><p>Fermé${NB}: oui</p>`);
  const once = typo(["<p>Total : 10 000 € ; « EI » ?</p>"])[0];
  assert.equal(typo([once])[0], once, "idempotent");
});
