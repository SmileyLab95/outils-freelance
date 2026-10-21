# 15. Spécification : guides de gestion (France)

Rédigée le 20/10/2026 pour la tâche « Guides : assurance de l'indépendant, compte bancaire professionnel » de la
feuille de route (1.4). Chaque guide associe un vérificateur (quelques questions, une réponse claire) et une explication
sourcée ; les règles et leurs sources sont dans `data/rules/fr.json`. Pas de conseil personnalisé (décision D8).

## 1. Compte bancaire professionnel (`/fr/compte-bancaire-professionnel/`)

**Question de l'utilisateur** : « Dois-je ouvrir un compte bancaire pour mon activité, et lequel ? »

### Règles (sources dans `data/rules/fr.json`)

| Clé | Règle | Source |
|---|---|---|
| `compte_dedie_micro` | Micro-entrepreneur : un compte bancaire réservé à l'ensemble des opérations financières de l'activité devient obligatoire quand le chiffre d'affaires annuel dépasse 10 000 € pendant deux années civiles consécutives (en vigueur depuis le 24/05/2019, loi PACTE). | CSS, art. L. 613-10 |
| `compte_dedie_urssaf` | Ce compte peut être un compte personnel ou professionnel, à condition d'être réservé à l'activité ; il reste conseillé sous le seuil. | Urssaf (autoentrepreneur.urssaf.fr) |
| `compte_intitule_ei` | Entrepreneur individuel : chaque compte dédié à l'activité porte dans son intitulé le nom suivi de « EI » ou « entrepreneur individuel » (depuis le 15/05/2022). | Code de commerce, art. R. 526-27 |
| `compte_commercant` | Tout commerçant (personne physique ou société commerciale) doit avoir un compte dans un établissement de crédit. | Code de commerce, art. L. 123-24 |
| `droit_au_compte_pro` | Refus d'ouverture : la Banque de France désigne une banque, qui ouvre un compte professionnel avec les services de base ; le silence de la banque pendant 15 jours vaut refus ; ouverture dans les 3 jours suivant un dossier complet ; gratuit. | Banque de France |

### Vérificateur

- Entrées : statut (micro-entreprise ; entreprise individuelle au réel ; société) ; pour la micro-entreprise, chiffre
  d'affaires des deux dernières années civiles complètes et estimation de l'année en cours (facultative).
- Moteur pur `engines/compte-fr.js`, fonction `check(input, rules)` ; réponses :
  - micro, deux dernières années au-dessus de 10 000 € (strictement) : **obligatoire** ;
  - micro, l'année dernière au-dessus et l'estimation de l'année en cours aussi : **obligatoire à la fin de l'année** ;
  - micro, l'année dernière au-dessus seulement : **à surveiller** (obligatoire si l'année en cours dépasse aussi) ;
  - micro, sinon : **pas obligatoire**, conseillé ;
  - entreprise individuelle au réel : **pas d'obligation générale** de compte dédié ; un compte est exigé si l'activité
    est commerciale ; séparation conseillée ;
  - société : **compte au nom de la société**.
- Les étapes affichées sous la réponse ne présentent des obligations que si le compte est (ou va être) obligatoire ;
  sinon, des conseils (« Préparez », « Conseillé »). Chaque réponse rappelle l'intitulé « EI » et renvoie au droit au
  compte.
- Montants lus comme sur le reste du site (`OF.num`) ; un montant illisible est signalé (message et `aria-invalid`)
  au lieu d'être ignoré en silence. Le moteur ne reçoit que des nombres.
- Une seule source : le seuil, la mention « EI » et sa date viennent de `data/rules/fr.json` dans le script ; un test
  unitaire vérifie que le texte de la page reprend les mêmes valeurs (seuil, date, délais du droit au compte).
- Le texte ne fixe ni délai d'ouverture après le dépassement, ni sortie de l'obligation quand le chiffre d'affaires
  redescend, ni prorata la première année : le guide le dit, sans interpréter (questions ouvertes du fichier de règles).

### Critères d'acceptation

- Tests unitaires du moteur : chaque réponse ci-dessus, seuil exact (10 000 € n'est pas un dépassement), montants
  absents ou non numériques, cohérence entre la page et les règles.
- Parcours navigateur : réponse par défaut et ses étapes, dépassements, statuts, rechargement (statut retrouvé),
  montant illisible ; pas d'erreur JavaScript ; rendu relu sur ordinateur, tablette et mobile.

## 2. Assurance de l'indépendant (`/fr/assurance-independant/`, publié le 20/10/2026)

**Question de l'utilisateur** : « Quelle assurance est obligatoire pour mon activité, et que dois-je indiquer sur mes
devis et factures ? »

### Règles vérifiées le 20/10/2026 (`data/rules/fr.json`, clés `assurance_*`)

| Règle | Source |
|---|---|
| Pas d'obligation générale d'assurance de responsabilité civile professionnelle : elle dépend de l'activité (professions de santé, du droit, de l'immobilier, du bâtiment, agents de voyage, diagnostiqueurs…). Conseillée dans les autres cas ; les clients la demandent souvent. | [economie.gouv.fr, « Professionnels : quelles sont les assurances obligatoires ? »](https://www.economie.gouv.fr/entreprises/gerer-ses-ressources-humaines-et-ses-salaries/professionnels-quelles-sont-les-assurances-obligatoires) ; fiches des activités réglementées de Bpifrance Création |
| Travaux de construction : assurance de responsabilité décennale obligatoire pour toute personne dont la responsabilité décennale peut être engagée, justifiée à l'ouverture de chaque chantier. | Code des assurances, art. L241-1 |
| Constructeurs soumis à la décennale : attestation d'assurance (modèle fixé par arrêté du 05/01/2016) jointe aux devis et aux factures. | Code des assurances, art. L243-2 ; arrêté du 05/01/2016 |
| Artisans (secteur des métiers) et micro-entrepreneurs dont l'activité exige une assurance : sur chaque devis et chaque facture, l'assurance professionnelle souscrite, les coordonnées de l'assureur ou du garant et la couverture géographique ; ne s'applique pas aux constructeurs soumis à la décennale (règle précédente). Depuis le 01/07/2023 (reprise de l'art. 22-2 de la loi n° 96-603). | Code de l'artisanat, art. L132-1 |

### Vérificateur

- Moteur pur `engines/assurance-fr.js`, fonction `check(input)`, testé par `tests/unit/assurance-fr.test.mjs`.
- Entrées : nature de l'activité (travaux de construction ; artisanat hors construction ; profession réglementée ;
  prestation de services ou conseil ; commerce) ; micro-entreprise ; immatriculation au secteur des métiers et de
  l'artisanat (implicite pour l'artisanat hors bâtiment) ; véhicule utilisé pour l'activité.
- Ce qui n'a pas d'article de loi relevé n'est pas présenté comme obligatoire : la responsabilité civile
  professionnelle du bâtiment, citée par la page du ministère de l'Économie, est affichée « à vérifier » ; aucun
  exemple de métier n'est donné sans source.
- Réponses : assurances obligatoires (décennale, responsabilité civile selon la profession), mentions à porter sur les
  devis et factures (attestation jointe ou mention L132-1), assurances conseillées ; renvoi vers la fiche de
  l'activité réglementée et vers l'ordre professionnel, la liste des professions n'étant pas exhaustive.
- Liste de vérification des [mentions obligatoires](../content/fr/mentions-obligatoires-facture.html) : point
  « Assurance professionnelle » ajouté (12 points) ; ses sources sont reliées aux règles.
- Un test unitaire vérifie que le guide et la liste citent les mêmes articles et la même date que les règles.

### Questions ouvertes

- Sanctions du défaut de mention (art. L132-1) : non relevées.
- Liste des professions soumises à une responsabilité civile professionnelle obligatoire : à constituer à partir des
  fiches officielles, sans prétendre à l'exhaustivité.

## 3. Typographie française automatique (publiée le 21/10/2026)

Constat (captures du 20/10/2026) : sur mobile, des retours à la ligne tombent entre « 10 » et « 000 € », après « « »
ou avant « ; ». Proposition, à l'étape de génération (`build.py`), pour les sections en français (`fr`, `ca-fr`) :

- espace fine insécable (U+202F) avant « ; ! ? » et entre les groupes de chiffres (« 10 000 », comme
  `Intl.NumberFormat`) ; espace insécable (U+00A0) avant « : », à l'intérieur des guillemets « », entre un nombre et
  son unité (« € », « % », « jours »…) ou le mot qui le suit (« 8 graphiques », « 15 mai »), et après « art. »,
  « L. » et « n° » (majuscules comprises) ; pas après un nombre qui termine un code (« RRQ2 », « T1 », « J+10 ») ;
  une année n'est pas lue comme un groupe de milliers ;
- les boutons « Copier » remplacent l'espace fine insécable par l'espace insécable, connue de toutes les
  messageries ;
- limite : le texte produit par les scripts (résultats des outils) n'est pas concerné ; les montants y sont déjà
  formatés par `Intl.NumberFormat` ; le reste est une amélioration ultérieure ;
- seulement dans le texte visible : jamais dans les balises `script`, `style`, `code`, `pre`, ni dans les attributs,
  les adresses web et les heures ;
- fonction pure testée (cas positifs et cas à ne pas toucher), puis génération complète et parcours navigateur ; les
  tests qui comparent du texte normalisent les espaces.
