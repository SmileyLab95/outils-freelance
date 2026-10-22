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
  calendars/<pays>.json échéances fiscales datées (générées par scripts/calendriers.py)
scripts/
  calendriers.py       génère data/calendars/ (règles de dates, jours fériés, reports)
  og-images.mjs        génère les images de partage par section (src/assets/img/og-<section>.png)
src/
  layout.html          gabarit commun à toutes les pages
  assets/
    style.css          système de design (variables, composants)
    app.js             fonctions communes : formats, nombres, stockage, copie, menu
    engines/           moteurs de calcul purs, testés unitairement (aucun accès à la page)
    tools/             un script par outil : relie le formulaire au moteur
    img/               images et icônes
server/                serveur des comptes en ligne (Node.js sans dépendance, pas encore en ligne) : server/README.md
tests/
  unit/                tests des moteurs (node --test), exemples officiels et calculs à la main
  server/              tests du serveur des comptes : WebAuthn, stockage, API par HTTP
  e2e/verifier.mjs     tests dans un vrai navigateur, accessibilité (axe-core), captures d'écran
  e2e/installer-axe.sh installe axe-core, version fixée (outil de test, non publié)
documentation/         ce dossier
build.py               générateur : content/ + src/ + data/ → docs/ ; typographie française (espaces insécables) des pages fr et ca-fr
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

Outils génériques pilotés par la page : `tools/invoice.js` (profil JSON `#invoice-profile` : libellés, conditions de paiement, mentions) et `tools/reminder.js` (données JSON `#reminder-data` : étapes, modèles, lois citées). Un nouveau pays les réutilise en fournissant seulement ses textes.

Remplacements disponibles dans le contenu : `{{base}}` (racine du site), `{{home}}` (accueil de la section), `{{kit_cta}}` (encart de l'offre de la section), `{{tools_grid}}` (grille des outils, générée depuis les métadonnées), `{{link:<id>}}` (adresse de la page `<id>` de la même section), `{{link:<section>/<id>}}` (page d'une autre section, par exemple `{{link:ca-fr/invoice}}` pour renvoyer vers la version française ; lien inconnu : la construction s'arrête).

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
    "social_security_wage_base_2026": {
      "value": 184500, "unit": "USD", "label": "Social Security wage base",
      "source": "https://www.ssa.gov/…", "source_title": "…",
      "confidence": "high", "note": "…"
    }
  },
  "open_questions": []
}
```

- Le générateur injecte les valeurs (sans les sources) dans les pages qui en ont besoin : `window.OF_RULES.social_security_wage_base_2026`.
- Les pages affichent la source et la date de vérification des chiffres qu'elles utilisent. Une règle peut avoir sa
  propre date (`verified_on`, quand elle a été lue après la date du fichier) : la page affiche la plus récente. Une
  règle qui rassemble plusieurs textes (un taux par province) liste ses autres sources dans `more_sources`
  (`[{"source": …, "source_title": …}]`), affichées avec les autres.
- Une valeur de confiance `low` n'est jamais utilisée dans un calcul sans avertissement visible.
- **Règles communes** (`data/rules/shared.json`, même format, `verified_on` obligatoire sur chaque règle) : le système
  d'un autre pays cité par plusieurs sections (TVA de l'UE, TVA britannique et TPS/TVH pour un prestataire étranger,
  formulaires américains). Le générateur les ajoute aux règles de chaque pays ; une même clé ne peut pas figurer dans
  les deux fichiers (le build s'arrête). Les tests lisent les règles de la même façon (`tests/unit/regles.mjs`), et
  `regles.test.mjs` vérifie le format de toutes les règles (valeur, unité, libellé, source, confiance).

## Les calendriers fiscaux (`data/calendars/<pays>.json`)

- `scripts/calendriers.py` écrit la liste des échéances de septembre 2026 à janvier 2028. Chaque échéance a une date,
  une catégorie (`social`, `tax`, `vat`, `filing`, `info`), une étiquette, un titre, une description, des conditions
  d'affichage (`when`, liées aux champs du formulaire de la page), un drapeau `est` pour les dates estimées et un lien
  vers un outil du site.
- Le Canada est bilingue : `tag`, `title` et `desc` valent `{"en": …, "fr": …}`.
- Dans une page, `{{calendar:fr}}` est remplacé par les échéances dans la langue de la section ; le script générique
  `tools/calendar.js` les filtre, affiche la prochaine échéance et exporte un fichier `.ics` (rappel 3 jours avant).
- Report des dates : Urssaf au jour ouvré suivant (jours fériés français dans le script) ; IRS déjà reporté ;
  HMRC et ARC à la date nominale (l'ARC accepte le jour ouvrable suivant, indiqué sur la page).

## L'Espace entrepreneur (`/fr/espace/`)

Application d'une page, spécifiée dans [09-specification-espace.md](09-specification-espace.md).

| Fichier | Rôle |
|---|---|
| `engines/invoice-fr.js` | Moteur de facture **commun** au générateur public et à l'Espace : totaux, TVA, mentions légales, rendu de la page imprimable. Toute règle de facturation se modifie ici. |
| `engines/espace-fr.js` | Fonctions pures de l'Espace : numérotation et émission (séries, reprise d'une séquence existante), statuts, avoirs, encaissements, livre des recettes, déclaration Urssaf, plafonds, textes des emails, reprise d'un document du générateur. Testé par `tests/unit/espace-fr.test.mjs` et `tests/unit/espace-v11.test.mjs`. |
| `engines/facturx-fr.js` | Données structurées de la facture électronique (CII, profil EN 16931 de Factur-X, règles françaises BR-FR) et contrôle des données manquantes. |
| `engines/pdfa.js` | Générateur PDF/A-3 sans dépendance : police TrueType incorporée, XMP, OutputIntent sRGB, fichiers joints (/AF). |
| `engines/facturx-pdf.js` | PDF de la facture électronique : mise en page du modèle commun (`invoiceFR.model`), XML joint. |
| `engines/assurance-fr.js` | Guide de l'assurance : assurances obligatoires et conseillées selon l'activité, mention ou attestation à porter sur les devis et factures. Testé par `tests/unit/assurance-fr.test.mjs`. |
| `engines/typo-fr.js` | Typographie française du texte que les scripts produisent dans les pages en français, avec les règles de `data/typo-fr.json` (les mêmes que `build.py`). Testé par `tests/unit/typographie.test.mjs` et le parcours navigateur. |
| `engines/compte-fr.js` | Guide du compte bancaire : le compte dédié est-il obligatoire (règle des 10 000 € sur deux années civiles) ? Testé par `tests/unit/compte-fr.test.mjs`. |
| `engines/espace-sync.js` | Synchronisation entre appareils (comptes en ligne, étape C2) : fusion à trois versions (base commune, local, distant) du schéma 2, règles de [12](12-specification-comptes.md) § 3.1. Pas encore chargé par l'interface (étape C4). Testé par `tests/unit/espace-sync.test.mjs` (scénarios écrits et simulation de plusieurs appareils). |
| `engines/pdf-fonts.js`, `engines/pdf-srgb.js` | Police Inter (sous-ensemble, `scripts/polices_pdf.py`) et profil sRGB incorporés aux PDF. |
| `tools/espace-store.js` | Stockage : IndexedDB (repli sur le stockage local), synchronisation entre onglets, contrôle des sauvegardes importées. |
| `tools/espace.js` | Interface : écrans `#/`, `#/documents`, `#/clients`, `#/recettes`, `#/echeances`, `#/reglages`, `#/importer`. |

- Les données ont la forme `{ schema: 1, profile, clients, documents, settings }`, avec des identifiants uniques et des
  dates de création et de modification, pour être synchronisées telles quelles avec les comptes en ligne (étape 2).
- La date limite de la déclaration Urssaf vient du calendrier fiscal (`period` des échéances de `data/calendars/fr.json`).
- `?today=AAAA-MM-JJ` dans l'adresse fixe la date du jour (tests).
- Passage depuis le générateur public : le bouton « Continuer dans mon Espace » dépose le document en cours dans le
  stockage local (`of:espace-import`, valable 24 heures) et ouvre `#/importer`, qui en fait un brouillon.
- Facture électronique : les scripts du PDF sont déclarés dans `lazy_scripts` (en-tête de la page) ; le générateur du
  site les publie avec leur empreinte dans `#lazy-scripts`, et l'Espace ne les charge qu'au premier export. Validation :
  `tests/facturx/` (XSD et schematrons officiels, Mustang pour le PDF/A-3).
- Numérotation : une série (type et année) commencée garde le préfixe de ses documents émis ; le préfixe des réglages
  vaut pour les séries suivantes. `profile.numbering` reprend le dernier numéro utilisé hors de l'Espace.

## Le générateur de contrat (`tools/contract.js`)

- Le texte du contrat est dans la page (`#contract-data`) : préambule, articles, clôture, signatures.
- `{champ}` insère la valeur d'un champ du formulaire (ou un repère « à compléter », imprimé comme une ligne vide) ;
  `[[champ|texte]]` n'apparaît que si le champ est rempli ; `when` affiche un article ou un paragraphe selon les choix.
- Valeurs calculées : `total`, `deposit_amount`, dates longues, `has_deposit`, `has_end`, `has_deliverables`.
- `option_text` remplace le libellé d'une option dans le texte (ex. « au Québec », « en Ontario »).

## Les moteurs de calcul (`src/assets/engines/`)

- Fonctions **pures** : elles reçoivent des nombres et des règles, renvoient des nombres. Aucun accès à la page.
- Écrits pour fonctionner à la fois dans le navigateur (`window.OFE`) et dans Node (`module.exports`) afin d'être testés unitairement.
- Chaque moteur est accompagné de tests avec des exemples calculés à la main et, quand ils existent, des exemples officiels.

| Moteur | Rôle |
|---|---|
| `brackets.js` | Impôt selon un barème progressif, arrondi au centime, recherche d'une valeur par dichotomie |
| `ir-fr.js` | Impôt sur le revenu d'une personne seule en France : barème, décote, déduction de 10 % (commun au comparateur de statuts et à « Salarié ou freelance ? ») |
| `micro-fr.js`, `statuts-fr.js`, `per-fr.js` | Micro-entreprise (taux par activité, somme à mettre de côté), comparaison des statuts français, plafond du PER |
| `tax-us.js`, `structure-us.js` | *Self-employment tax*, impôt fédéral, déduction QBI, acomptes trimestriels ; *sole proprietor* ou *S corp* |
| `tax-uk.js` | *Income tax* (Angleterre, Écosse), *Class 1* (salarié) et *Class 4 NI*, *payments on account*, *limited company* |
| `tax-ca.js`, `structure-ca.js` | Impôt fédéral et provincial, RPC/RRQ, RQAP, assurance-emploi des salariés, acomptes ; société par actions |
| `international-uk.js`, `international-ca.js`, `international-us.js` | Facturer un client étranger : TVA, TPS/TVH et TVQ des prestations de services ; aux États-Unis, taxe du pays du client (UE, Royaume-Uni, Canada) et démarches américaines ([22](22-client-etranger-us-et-w8ben.md)) |
| `salestax.js` | TVA, *VAT*, TPS/TVH/TVQ/TVP : HT ↔ TTC, plusieurs composantes |
| `rate-convert.js`, `project-price.js` | Conversion d'un tarif (heure, jour, semaine, mois, an) ; prix d'un projet au forfait ([18](18-outils-de-prix.md)) |
| `employee-freelance.js` | Salarié ou freelance : revenu disponible d'un salarié et chiffre d'affaires équivalent, quatre pays ([19](19-freelance-ou-salarie.md)) ; s'appuie sur les moteurs de chaque pays, chargés par la page |

## Interface et design

- **Système de design** unique (`style.css`) : couleurs, rayons, ombres et espacements en variables CSS ; composants réutilisables (carte d'outil, formulaire, résultat principal, liste de résultats, jauge, onglets, FAQ, encart d'offre).
- **Gabarit d'outil** identique partout : fil d'Ariane → titre et promesse → outil (formulaire à gauche, résultats à droite, empilés sur mobile) → explications → FAQ → sources → outils liés → offre.
- **Menu par catégories** avec menus déroulants sur ordinateur et panneau plein écran sur mobile ; **sélecteur de pays** qui mène à la page équivalente quand elle existe.
- **Accessibilité** : niveau AA des règles WCAG 2.1, contrôlé par axe-core dans les tests navigateur ; navigation au clavier (menus refermés quand le focus les quitte, Échap qui rend le focus au bouton, contour de focus opaque, tableaux défilants nommés par leur titre), contrastes d'au moins 4,5:1 (texte discret `--faint` compris), libellés sur tous les champs, nom accessible qui reprend le texte affiché, `prefers-reduced-motion` respecté.
- **Performance** : aucune police externe, aucune bibliothèque, images en WebP avec dimensions, scripts en `defer`, empreinte dans l'adresse des fichiers pour le cache.

## Formats et saisie

- Les montants sont affichés avec `Intl.NumberFormat` selon la langue et la devise de la section (`1 234,50 €`, `$1,234.50`, `£1,234.50`, `1 234,50 $`).
- La saisie accepte les deux conventions (`1 234,5`, `1,234.50`, `1.800`) : `OF.num()` reconnaît le séparateur décimal selon la section.
- Les dates sont saisies avec le sélecteur natif et affichées au format local.
- Les jauges de seuils passent par `OF.gauge(id, valeur, seuil)` : « 85 % of £90,000 » dans la langue de la page,
  barre orange au-delà de `OF.gaugeNear` (85 %), rouge au-delà du seuil ; le pourcentage n'affiche jamais « 100 % »
  juste sous ou juste au-dessus du seuil ([21](21-jauges-de-seuils.md)).

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
