# Outils Freelance · Freelance Tools

Site d'outils gratuits pour les indépendants, par pays : France (en ligne), États-Unis, Royaume-Uni, Canada (en préparation).
Publié avec GitHub Pages : https://smileylab95.github.io/outils-freelance/

Toute la conception est dans [documentation/](documentation/README.md) : vision, besoins des clients, architecture,
méthode de travail, feuille de route, affiliation et fiches pays.

## Démarrage rapide

```bash
python3 build.py                                  # génère le site dans docs/
node --test tests/unit/*.test.mjs                          # tests des moteurs de calcul
node tests/e2e/verifier.mjs /tmp/captures         # tests navigateur + captures d'écran
```

Prérequis : Python 3 et Node 18 ou plus ; Playwright avec Chromium pour les tests navigateur.

## Organisation

```
config/          site.json (adresse, base, redirections), locales.json (sections pays/langue)
content/         une section par dossier : global/, fr/, us/, uk/, ca/, ca-fr/
data/rules/      chiffres fiscaux officiels, sourcés et datés, un fichier par pays
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
