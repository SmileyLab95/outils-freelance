# 3. Architecture

## Principes

1. **Site statique** : des pages HTML générées à l'avance, servies par GitHub Pages. Pas de serveur, pas de base de données, coût zéro, chargement instantané, rien à pirater.
2. **Une section par pays et par langue** : chaque marché a ses adresses, ses textes, sa devise et ses règles.
3. **Une seule source de vérité par information** :
   - les chiffres fiscaux dans `data/rules/<pays>.json`, avec leur source et leur date de vérification ;
   - les textes de l'interface dans `content/<section>/site.json` ;
   - les métadonnées d'une page (titre, menu, icône, résumé) dans l'en-tête de la page elle-même.
4. **Des moteurs de calcul communs, des profils par pays** : la logique (barème progressif, facture, taxe sur les ventes…) est écrite une fois et testée ; chaque pays fournit ses paramètres.
5. **Tout dans le navigateur** : les saisies ne quittent jamais l'appareil de l'utilisateur.
6. **Aucune dépendance** : JavaScript et CSS natifs, Python standard pour la génération. Rien à mettre à jour, rien qui casse.

## Sections du site

| Section | Langue (`lang`) | Devise | Adresse | Statut |
|---|---|---|---|---|
| Accueil mondial (choix du pays) | en + fr | — | `/` | Socle |
| France | fr-FR | EUR | `/fr/` | En ligne (migré depuis la racine) |
| États-Unis | en-US | USD | `/us/` | Phase 1 |
| Royaume-Uni | en-GB | GBP | `/uk/` | Phase 2 |
| Canada (anglais) | en-CA | CAD | `/ca/` | Phase 3 |
| Canada (français) | fr-CA | CAD | `/ca/fr/` | Phase 3 |

Ajouter un pays = ajouter une entrée dans `config/locales.json`, un dossier `content/<section>/` et un fichier `data/rules/<pays>.json`. Aucune modification du générateur.

Tant que le nom de domaine n'est pas acheté, tout est servi sous `https://smileylab95.github.io/outils-freelance/`. La bascule se fait dans `config/site.json` (`site_url` et `base`).

## Arborescence du dépôt

```
config/
  site.json            adresse du site, chemin de base, année, redirections des anciennes adresses
  locales.json         liste des sections : code, chemin, langue, pays, devise, nom, ordre
content/
  global/              accueil mondial, page 404
  fr/                  France : site.json (textes, menu, offre) + une page HTML par fichier
  us/  uk/  ca/  ca-fr/
data/
  rules/fr.json        chiffres officiels sourcés et datés, un fichier par pays
  rules/us.json  uk.json  ca.json
src/
  layout.html          gabarit commun à toutes les pages
  assets/
    style.css          système de design (variables, composants)
    app.js             fonctions communes : formats, nombres, stockage, copie, menu
    engines/           moteurs de calcul purs, testés unitairement (aucun accès à la page)
    tools/             un script par outil : relie le formulaire au moteur
    img/               images et icônes
tests/
  unit/                tests des moteurs (node --test), exemples officiels et calculs à la main
  e2e/verifier.mjs     tests dans un vrai navigateur, captures d'écran
documentation/         ce dossier
build.py               générateur : content/ + src/ + data/ → docs/
docs/                  site généré, publié par GitHub Pages (ne jamais modifier à la main)
```

## Le modèle de page

Chaque page est un fichier `content/<section>/<nom>.html` qui commence par ses métadonnées en JSON :

```html
<!--{
  "id": "invoice",
  "slug": "generateur-facture/",
  "title": "Titre pour Google (environ 60 caractères)",
  "description": "Description pour Google (environ 150 caractères).",
  "menu": "Facture et devis",
  "icon": "🧾",
  "blurb": "Une phrase qui résume l'outil, reprise dans le menu et sur l'accueil.",
  "app": "Nom de l'outil pour les données structurées",
  "scripts": ["tools/facture.js"],
  "rules": "fr",
  "sources": ["micro_activities", "tva_franchise"],
  "priority": 0.9,
  "faq": [["Question ?", "Réponse."]]
}-->
<section class="hero hero-tool">…</section>
```

| Clé | Rôle |
|---|---|
| `id` | Identifiant commun à toutes les sections : relie les pages équivalentes entre pays (balises `hreflang`, sélecteur de pays). |
| `slug` | Adresse de la page dans sa section (`""` pour l'accueil de la section). |
| `menu`, `icon`, `blurb` | Libellé et présentation dans le menu, sur l'accueil et dans les « outils liés ». |
| `rules` | Pays dont les chiffres sont injectés dans la page (`window.OF_RULES`). |
| `sources` | Clés des chiffres dont la source est affichée en bas de page, avec la date de vérification. |
| `faq` | Questions affichées en bas de page et déclarées à Google (FAQPage). |
| `noindex` | Page exclue de Google et du plan du site. |

Remplacements disponibles dans le contenu : `{{base}}` (racine du site), `{{home}}` (accueil de la section), `{{kit_cta}}` (encart de l'offre de la section), `{{tools_grid}}` (grille des outils, générée depuis les métadonnées), `{{link:<id>}}` (adresse de la page `<id>` de la même section).

## Le fichier `site.json` d'une section

```json
{
  "brand": ["Outils", "Freelance"],
  "nav": [
    {"label": "Facturer", "items": ["invoice", "salestax", "invoice-rules"]},
    {"label": "Se faire payer", "items": ["reminder", "latefee"]}
  ],
  "offer": {"url": "https://…gumroad.com/l/…", "button": "Kit complet · 9 €", "cta": "kit-cta.html"},
  "strings": {"skip": "Aller au contenu", "privacy_note": "…", "disclaimer": "…"}
}
```

Le menu, le pied de page et la grille d'accueil sont construits à partir de `nav` et des métadonnées des pages : ajouter une page à un groupe suffit pour qu'elle apparaisse partout.

## Les règles fiscales (`data/rules/<pays>.json`)

```json
{
  "country": "US", "tax_year": "2026", "currency": "USD", "verified_on": "2026-10-20",
  "values": {
    "ss_wage_base": {
      "value": 184500, "unit": "USD", "label": "Social Security wage base",
      "source": "https://www.ssa.gov/…", "source_title": "…",
      "confidence": "high", "note": "…"
    }
  },
  "open_questions": []
}
```

- Le générateur injecte les valeurs (sans les sources) dans les pages qui en ont besoin : `window.OF_RULES.ss_wage_base`.
- Les pages affichent la source et la date de vérification des chiffres qu'elles utilisent.
- Une valeur de confiance `low` n'est jamais utilisée dans un calcul sans avertissement visible.

## Les moteurs de calcul (`src/assets/engines/`)

- Fonctions **pures** : elles reçoivent des nombres et des règles, renvoient des nombres. Aucun accès à la page.
- Écrits pour fonctionner à la fois dans le navigateur (`window.OFE`) et dans Node (`module.exports`) afin d'être testés unitairement.
- Chaque moteur est accompagné de tests avec des exemples calculés à la main et, quand ils existent, des exemples officiels.

| Moteur | Rôle |
|---|---|
| `brackets.js` | Impôt selon un barème progressif, taux marginal et moyen |
| `tax-us.js` | *Self-employment tax*, impôt fédéral, déduction QBI, acomptes trimestriels |
| `tax-uk.js` | *Income tax* (Angleterre, Écosse), *Class 4 NI*, *payments on account* |
| `tax-ca.js` | Impôt fédéral et provincial, RPC/RRQ, acomptes provisionnels |
| `salestax.js` | TVA, *VAT*, TPS/TVH/TVQ/TVP : HT ↔ TTC |

## Interface et design

- **Système de design** unique (`style.css`) : couleurs, rayons, ombres et espacements en variables CSS ; composants réutilisables (carte d'outil, formulaire, résultat principal, liste de résultats, jauge, onglets, FAQ, encart d'offre).
- **Gabarit d'outil** identique partout : fil d'Ariane → titre et promesse → outil (formulaire à gauche, résultats à droite, empilés sur mobile) → explications → FAQ → sources → outils liés → offre.
- **Menu par catégories** avec menus déroulants sur ordinateur et panneau plein écran sur mobile ; **sélecteur de pays** qui mène à la page équivalente quand elle existe.
- **Accessibilité** : navigation au clavier, contrastes suffisants, libellés sur tous les champs, `prefers-reduced-motion` respecté.
- **Performance** : aucune police externe, aucune bibliothèque, images en WebP avec dimensions, scripts en `defer`, empreinte dans l'adresse des fichiers pour le cache.

## Formats et saisie

- Les montants sont affichés avec `Intl.NumberFormat` selon la langue et la devise de la section (`1 234,50 €`, `$1,234.50`, `£1,234.50`, `1 234,50 $`).
- La saisie accepte les deux conventions (`1 234,5`, `1,234.50`, `1.800`) : `OF.num()` reconnaît le séparateur décimal selon la section.
- Les dates sont saisies avec le sélecteur natif et affichées au format local.

## Référencement

- Une adresse canonique par page, des balises `hreflang` entre pages équivalentes, `x-default` vers l'accueil mondial.
- Données structurées : `WebApplication` pour les outils, `FAQPage`, `BreadcrumbList`, `WebSite`.
- Un plan du site (`sitemap.xml`) avec toutes les pages indexables.
- Les anciennes adresses françaises (à la racine) redirigent vers `/fr/` : page de redirection immédiate avec adresse canonique, que Google traite comme une redirection permanente.

## Monétisation dans les pages

- **Offre de la section** (`offer` dans `site.json`) : bouton dans l'en-tête et encart `{{kit_cta}}`. Une section sans offre n'affiche rien.
- **Partenaires (affiliation)** : à venir dans `content/<section>/partners.json`, affichés dans des encarts « Outils recommandés » par catégorie, toujours avec la mention de transparence exigée par le pays.
- **Publicité** : emplacements prévus hors des outils, activés seulement après l'achat du domaine et la mise en place du consentement.

## Confidentialité

- Aucune donnée envoyée, aucun cookie, aucune mesure d'audience tierce. Les saisies sont mémorisées dans le `localStorage` de l'appareil (clé préfixée `of:`), effaçables par l'utilisateur.
- Si la publicité ou une mesure d'audience est ajoutée, la page Confidentialité de chaque section sera mise à jour et un consentement sera demandé.
