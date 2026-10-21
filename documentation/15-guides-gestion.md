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
- une seule source de règles, `data/typo-fr.json`, écrite dans la syntaxe d'expressions commune à Python et à
  JavaScript (ni `\b`, ni `\w`, ni `\d`, ni assertion arrière) : `build.py` l'applique au texte des pages ; chaque
  page en français la reçoit (`window.OF_TYPO`) et `engines/typo-fr.js` l'applique au texte que les scripts des outils
  ajoutent ou modifient (observateur des changements, idempotent ; jamais dans script, style, code, pre, textarea ni
  dans une zone modifiable) — depuis le 21/10/2026 ;
- un test vérifie que Python et JavaScript donnent le même texte sur les mêmes cas, et deux fois le même ;
- seulement dans le texte visible : jamais dans les balises `script`, `style`, `code`, `pre`, ni dans les attributs,
  les adresses web et les heures ;
- fonction pure testée (cas positifs et cas à ne pas toucher), puis génération complète et parcours navigateur ; les
  tests qui comparent du texte normalisent les espaces.

## 4. Combien mettre de côté sur chaque paiement (`/fr/combien-mettre-de-cote-auto-entrepreneur/`)

**Question de l'utilisateur** : « Un client vient de me payer : combien dois-je mettre de côté pour l'Urssaf, les
impôts et la TVA ? » Besoin P1 de [02](02-besoins-clients.md) (§ 7), déjà couvert aux États-Unis (page équivalente
`set-aside`, même identifiant pour les liens entre pays).

### Règles (`data/rules/fr.json`)

| Clé | Règle | Source |
|---|---|---|
| `micro_activities` | Taux de cotisations, taux minorés de l'ACRE, formation professionnelle, versement libératoire et abattement, par activité | Urssaf (déjà utilisée par le simulateur) |
| `ca_declare_hors_taxes` (nouvelle) | Le chiffre d'affaires déclaré à l'Urssaf est le montant encaissé hors TVA ; la TVA facturée est reversée au service des impôts | autoentrepreneur.urssaf.fr, « Déterminer mon chiffre d'affaires » |
| `tva_taux_metropole` (nouvelle) | Taux de TVA en France métropolitaine : 20 %, 10 %, 5,5 % et 2,1 % | economie.gouv.fr |
| `pas_micro_acomptes` (nouvelle) | Sans versement libératoire, les revenus de micro-entrepreneur donnent lieu à des acomptes contemporains prélevés chaque mois (ou chaque trimestre sur option), au taux du foyer ; avec le versement libératoire, le prélèvement à la source ne s'applique pas | impots.gouv.fr |
| `cfe_echeance` | CFE payée le 15 décembre : non comprise dans le montant par paiement, rappelée sous le résultat | impots.gouv.fr |

### Moteur `engines/micro-fr.js` (partagé avec le simulateur)

- `activity(rules, key)` : taux de l'activité lus dans `micro_activities` ; une seule lecture des règles pour le
  simulateur et ce calculateur (le simulateur lit aussi l'abattement minimum dans `micro_abattement_minimum` au lieu
  d'un nombre écrit dans son script).
- `setAside({ amount, vatRate, activity, acre, vl, pasRate })` : montant encaissé (TVA comprise s'il y en a) ;
  calcul en centimes :
  - hors taxes = montant ÷ (1 + taux de TVA), arrondi au centime ; TVA à reverser = montant − hors taxes ;
  - cotisations et formation professionnelle = hors taxes × taux (taux minoré si ACRE) ;
  - impôt : versement libératoire = hors taxes × taux ; sinon, **estimation** = hors taxes × (1 − abattement) × taux
    de prélèvement du foyer, si l'utilisateur l'indique (sinon non calculé, et dit) ; l'abattement minimum de 305 €
    est annuel et ne s'applique pas à un paiement ;
  - total à mettre de côté, part du montant, reste disponible.
- Entrées invalides (montant illisible, négatif ou supérieur à un milliard d'euros, taux hors de 0 à 100 %) : toutes
  signalées ensemble (`errors`), jamais ignorées ; le taux du foyer est ignoré avec le versement libératoire. Un taux
  de TVA ou d'ACRE inconnu est une erreur de programmation (exception).

### Page

- Formulaire : montant encaissé ; TVA (franchise, ou taux compris dans le montant) ; activité ; ACRE ; impôt
  (prélèvement à la source avec le taux du foyer, facultatif, ou versement libératoire).
- Résultat : total à mettre de côté et part du paiement ; détail (TVA, cotisations, formation professionnelle,
  impôt) ; reste disponible ; rappel de la CFE ; conseil de virer la somme sur le compte dédié (lien vers le guide
  du compte bancaire professionnel).
- Le texte dit que l'impôt sans versement libératoire est une estimation : les acomptes réels sont calculés par
  l'administration sur les revenus des années précédentes, puis régularisés.
- Le calcul de la TVA du calculateur HT ↔ TTC lit aussi `tva_taux_metropole` (une seule source).
- Cipav avec l'ACRE à −50 % : le taux minoré publié (13,4 %) n'est pas la moitié du taux plein (question ouverte des
  règles) : le résultat le signale.
- Accessibilité : le résumé (total, part, reste ou message d'erreur) est la seule zone annoncée aux lecteurs d'écran ;
  les champs invalides sont marqués et reliés au message.

### Critères d'acceptation

- Tests unitaires : exemples calculés à la main (franchise, TVA à 20 %, ACRE, versement libératoire, taux du foyer),
  arrondis au centime, entrées invalides, cohérence entre le texte de la page et les règles.
- Simulateur : mêmes résultats qu'avant le passage au moteur commun (parcours navigateur existant).
- Parcours navigateur : résultat par défaut, TVA, versement libératoire, taux du foyer, taux invalide, rechargement ;
  accessibilité (axe-core) ; captures relues sur ordinateur, tablette et mobile.
