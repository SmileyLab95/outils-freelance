# Outils Freelance · Freelance Tools

Site d'outils gratuits pour les indépendants, par pays : France, États-Unis, Royaume-Uni, Canada (anglais et français).
81 pages indexables, toutes en ligne : factures, impôts, statuts, contrats, calendriers fiscaux, relances, retraite.
Publié avec GitHub Pages : https://smileylab95.github.io/outils-freelance/

Toute la conception est dans [documentation/](documentation/README.md) : vision, besoins des clients, architecture,
méthode de travail, feuille de route, affiliation et fiches pays.

## Démarrage rapide

```bash
python3 build.py                                  # génère le site dans docs/
node --test tests/unit/*.test.mjs                 # tests des moteurs de calcul
node tests/e2e/verifier.mjs /tmp/captures         # tests navigateur, accessibilité + captures d'écran
node tests/facturx/generer.mjs /tmp/fx            # Factur-X : jeu d'essai XML…
python3 tests/facturx/valider.py /tmp/fx --controle --pdf   # …validé : XSD, EN 16931, BR-FR, et Mustang pour le PDF/A-3
```

Prérequis : Python 3 et Node 18 ou plus ; Playwright avec Chromium et axe-core (`sh tests/e2e/installer-axe.sh`) pour
les tests navigateur ;
`pip install factur-x saxonche` et, pour les PDF, Java et Maven avec `sh tests/facturx/installer-mustang.sh`
(outils de test, non publiés).

## Organisation

```
config/          site.json (adresse, base, redirections), locales.json (sections pays/langue)
content/         une section par dossier : global/, fr/, us/, uk/, ca/, ca-fr/
data/rules/      chiffres fiscaux officiels, sourcés et datés, un fichier par pays
data/calendars/  échéances fiscales par pays (générées par scripts/calendriers.py)
scripts/         calendriers.py (échéances), og-images.mjs (images de partage)
src/             layout.html, assets/ (style.css, app.js, engines/, tools/, img/)
tests/           unit/ (moteurs), e2e/ (navigateur)
docs/            site généré, publié par GitHub Pages (ne pas modifier à la main)
documentation/   conception et méthode
```

## Publier une modification

1. Modifier `content/`, `src/` ou `data/rules/`.
2. `python3 build.py`, puis les tests.
3. Committer `content/`, `src/`, `data/`, `docs/` et pousser sur `main` : GitHub Pages publie en une minute.

Avec un nom de domaine : le renseigner dans Settings → Pages, mettre à jour `site_url` et `base` (`"/"`) dans
`config/site.json`, puis relancer `python3 build.py`.
