# Outils Freelance

Site d'outils gratuits pour les freelances et auto-entrepreneurs français, publié avec GitHub Pages.
Chaque outil attire des visiteurs depuis Google et présente le **Kit du Freelance Pro** (Gumroad).

| Page | Requêtes visées |
|---|---|
| `generateur-facture/` | facture auto-entrepreneur gratuite, modèle de facture, devis gratuit |
| `calculateur-tjm/` | calcul TJM freelance, quel tarif journalier |
| `simulateur-auto-entrepreneur/` | charges auto-entrepreneur 2026, cotisations URSSAF, ACRE |
| `calcul-tva-ht-ttc/` | calcul TVA, HT en TTC, TTC en HT |
| `relance-facture-impayee/` | relance facture impayée, mise en demeure |
| `penalites-de-retard/` | pénalités de retard, indemnité 40 € |
| `mentions-obligatoires-facture/` | mentions obligatoires facture |
| `modeles-emails-freelance/` | email de prospection, relance de devis |

Tout fonctionne dans le navigateur : aucun serveur, aucune base de données, aucun cookie.

## Structure

```
config.json          adresse du site, chemin de base, lien du kit
build.py             générateur : src/ → docs/
src/layout.html      gabarit commun (en-tête, pied de page, balises SEO)
src/kit-cta.html     encart de présentation du kit
src/pages/*.html     une page par fichier, métadonnées JSON en tête
src/assets/          style.css, app.js (fonctions communes), un script par outil, images
docs/                site généré, servi par GitHub Pages (ne pas modifier à la main)
outils/verifier.mjs  tests dans un vrai navigateur + captures d'écran
outils/og.html       source de l'image de partage (og.png)
```

## Modifier le site

1. Modifier un fichier de `src/`.
2. `python3 build.py` : régénère `docs/`, le `sitemap.xml` et le `robots.txt`.
3. `node outils/verifier.mjs /tmp/captures` : vérifie chaque page (calculs, copie, mémorisation, affichage mobile, erreurs JavaScript).
4. Committer `src/` et `docs/`, puis pousser.

### Ajouter une page

Créer `src/pages/ma-page.html` :

```html
<!--{
  "title": "Titre pour Google (60 caractères environ)",
  "description": "Description pour Google (150 caractères environ).",
  "path": "ma-page/",
  "nav": "",
  "app": "Nom de l'outil (données structurées WebApplication)",
  "scripts": ["mon-outil.js"],
  "priority": 0.8,
  "faq": [["Question ?", "Réponse."]]
}-->
<section class="hero hero-tool">…</section>
```

`{{base}}`, `{{kit_url}}` et `{{kit_cta}}` sont remplacés à la génération. La FAQ est affichée en bas de page
et ajoutée aux données structurées (FAQPage).

## Mise en ligne (GitHub Pages)

1. Créer le dépôt public `outils-freelance` sur GitHub et y pousser ce dossier.
2. Settings → Pages → Build and deployment → Source : *Deploy from a branch*, branche `main`, dossier `/docs`.
3. Le site est en ligne à l'adresse indiquée dans `config.json` après une ou deux minutes.

Avec un nom de domaine : renseigner le domaine dans Settings → Pages, mettre à jour `site_url` et `base`
(`"/"`) dans `config.json`, puis relancer `python3 build.py`.

## Référencement

- Déclarer le site dans Google Search Console et y soumettre `sitemap.xml`.
- Chaque page a un titre, une description, une URL canonique, une image de partage et des données structurées.

## Taux et règles utilisés (à revoir chaque 1er janvier)

- Cotisations micro-entrepreneur 2026 : vente 12,3 %, services BIC 21,2 %, libéral BNC 25,6 % (décret n° 2025-943), CIPAV 23,2 %.
- ACRE : −50 % pour une création avant le 1er juillet 2026, −25 % à partir de cette date (décret n° 2026-69).
- Versement libératoire : 1 %, 1,7 %, 2,2 %. Formation professionnelle : 0,1 %, 0,3 %, 0,2 %.
- Plafonds micro : 83 600 € et 203 100 €. Franchise de TVA : 37 500 € (41 250 €) et 85 000 € (93 500 €).
- TVA : 20 %, 10 %, 5,5 %, 2,1 %.
- Pénalités de retard : art. L441-10 et D441-5 du Code de commerce (indemnité de 40 €).

Fichiers concernés : `src/assets/simulateur.js`, `src/assets/tjm.js`, `src/assets/tva.js` et les textes des pages.
