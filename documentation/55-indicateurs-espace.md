# 55. Indicateurs et graphiques dans tous les onglets de l'Espace (spécification du 11/11/2026)

Demande d'Ismail du 11/11/2026 : après la trésorerie ([39](39-tresorerie.md), § 7), « ceci est dit pour tous les autres
onglets » : chaque onglet doit répondre aux questions de gestion de l'indépendant, avec des indicateurs (KPI) et des
graphiques. Spécification avant le code ; réalisation onglet par onglet, chacun testé et relu avant publication.

## 1. Principes communs

- **Une question, un indicateur** : chaque chiffre répond à une question concrète et dit sur quelle période il porte.
- **Mêmes composants** que la trésorerie : tuiles `kpi` (4 par ligne, 2 sur mobile), graphiques `tools/charts.js`
  (SVG, accessibles, tableau « Voir les données », couleurs du thème), échelles `engines/chart-scale.js`.
- **Période** choisie dans l'adresse quand c'est utile (`?periode=12m|annee|trimestre|mois`), comme l'horizon de la
  trésorerie.
- **Calculs dans le moteur** (`espace-fr.js` ou un moteur `espace-stats.js` dédié), fonctions pures testées avec des
  cas calculés à la main et contrôlées par erreurs réintroduites ; l'écran ne fait qu'afficher.
- **Aucun chiffre inventé** : seulement des calculs sur les données de l'utilisateur et des règles déjà sourcées
  (`data/rules/`) ; pas de « probabilité de signature » ni de moyenne de marché.
- **Pas de conseil personnalisé** : des constats (« votre premier client représente 62 % de votre chiffre
  d'affaires ») et des liens vers les outils et guides du site.

## 2. Par onglet

| Onglet | Questions | Indicateurs | Graphiques |
|---|---|---|---|
| **Tableau de bord** | Où en suis-je cette année ? Mieux ou moins bien que l'an dernier ? | Encaissé de l'année (et même période l'an dernier), encaissé du mois, à encaisser (dont en retard), disponible (trésorerie), prochaine déclaration | Encaissements par mois sur 12 mois, année précédente en pointillés ; jauges des plafonds (existantes) ; 5 premiers clients |
| **Documents** | Combien ai-je facturé ? Mes devis se signent-ils ? | Facturé (HT) du mois et de l'année, nombre de factures, montant moyen d'une facture, devis en attente (montant), taux de signature des devis (acceptés ÷ envoyés, 12 mois), avoirs | Facturé et encaissé par mois ; devis par issue (acceptés, refusés, expirés, en attente) |
| **Clients** | De qui dépend mon activité ? Qui paie mal ? | Clients actifs (12 mois), nouveaux clients de l'année, chiffre d'affaires moyen par client, part du premier client et des trois premiers | Chiffre d'affaires par client (barres, 10 premiers) ; sur la fiche d'un client : facturé par mois, délai moyen de paiement, impayés |
| **Recettes** | Combien ai-je encaissé, au rythme de quel plafond ? | Encaissé de l'année, du trimestre en cours, moyenne mensuelle, projection de fin d'année au rythme actuel (signalée comme telle) | Encaissements par mois ; cumul de l'année face au plafond de la micro-entreprise et au seuil de TVA |
| **Dépenses** | Où part mon argent ? | Dépenses de l'année et du mois, moyenne mensuelle, part des dépenses dans les encaissements, comparaison avec l'abattement forfaitaire de l'activité (règle `micro_activities`, lien vers le comparateur de statuts) | Dépenses par mois ; par catégorie (nouveau champ facultatif `category`) ; 5 premiers fournisseurs |
| **Temps** | Combien d'heures, et combien me rapportent-elles ? | Heures du mois et de la semaine, part facturable, temps à facturer (montant), revenu par heure (facturé ÷ heures facturables, période choisie) | Heures par semaine (facturables et internes empilées) ; heures par client |
| **Prospects** | Mon carnet de commandes se remplit-il ? | Valeur des pistes ouvertes par étape, taux de conversion (gagnées ÷ closes, 12 mois), valeur moyenne d'une piste gagnée, relances en retard | Entonnoir par étape (barres) ; pistes gagnées et perdues par mois |
| **Échéances** | Qu'est-ce qui arrive, et combien cela coûtera ? | Prochaine échéance (dans n jours), montants estimés des 3 prochains mois (cotisations, TVA : repris de la trésorerie) | Frise des 90 prochains jours |

## 3. Données (ajouts)

- Dépenses : `category` facultatif (liste fermée : logiciels et abonnements, matériel, déplacements, locaux,
  téléphone et internet, formation, sous-traitance, marchandises, assurances, frais bancaires, autres), proposé à la
  saisie, repris dans l'export CSV ; les anciennes dépenses restent « non classées ».
- Aucun autre champ : tout le reste se calcule à partir des données existantes.

## 4. Ordre de réalisation

1. Tableau de bord (vue d'ensemble, comparaison avec l'année précédente).
2. Clients et Documents (dépendance, signature des devis).
3. Dépenses (catégories) et Recettes (cumul face au plafond).
4. Temps et Prospects.
5. Échéances.

Chaque étape : moteur et tests, écran, parcours navigateur (accessibilité comprise), captures relues sur ordinateur,
tablette et mobile, documentation, publication.

## 5. Réalisation

### 5.1 Tableau de bord (12/11/2026)

- Moteur `engines/espace-stats.js` (nouveau, s'appuie sur `espace-fr.js`) : `lastYear` (même jour un an plus tôt, le
  29 février devient le 28), `change` (évolution en %, une décimale ; aucune si la référence est nulle), `toDate`
  (encaissé de l'année et du mois face à la même période de l'an dernier, **jusqu'au même jour**), `monthly`
  (encaissements des 12 derniers mois et du même mois un an plus tôt, mois entier), `topClients` (encaissements nets
  des 12 derniers mois par client, remboursements d'avoirs déduits, 5 premiers et le reste, parts).
- Écran : 4 indicateurs (encaissé de l'année avec la comparaison, encaissé du mois, à encaisser, déclaration Urssaf ou
  devis en attente) ; graphique « Encaissements par mois » (barres pleines : 12 derniers mois ; barres vides : un an plus
  tôt ; tableau des données) ; « Principaux clients » (barres, montants, parts, lien vers la fiche ; constat si le
  premier client dépasse la moitié des encaissements, sans conseil) ; résumé de la trésorerie (disponible, point bas
  sur 6 mois, versement possible) ; prochaines échéances ; derniers documents.
- Choix : base **encaissements** (le livre des recettes et les déclarations de la micro-entreprise sont tenus à
  l'encaissement) ; comparaison « à la même date » plutôt qu'à l'année entière, pour ne pas comparer 10 mois à 12.
- Tests : `espace-stats.test.mjs` (4 tests, cas calculés à la main), 13 erreurs réintroduites toutes détectées ;
  parcours navigateur (5 points nouveaux, accessibilité comprise) ; captures relues sur ordinateur et mobile.
- Relecture du code : une seconde fonction `kpi()` (trésorerie, 11/11) remplaçait en silence celle du tableau de bord,
  qui échappe le texte ; renommée `tile()`, et nouveau test `doublons.test.mjs` qui refuse deux fonctions de même nom au
  premier niveau d'un script (il détecte l'erreur sur l'ancien code).

### 5.2 Documents et clients (12/11/2026)

- Moteur `espace-stats.js` : `invoiced` (facturé HT entre deux dates, factures moins avoirs, à la date du document,
  pour tous les clients ou un seul), `quotes` (devis émis sur la période : signés, refusés, **expirés** – envoyés dont
  la validité est passée sans réponse –, en attente ; taux de signature = signés ÷ (signés + refusés + expirés)),
  `documents`, `invoicedMonthly` (facturé HT et encaissé par mois), `clients` (actifs : un encaissement sur 12 mois ;
  nouveaux : première facture émise cette année ; encaissé moyen ; part du premier et des trois premiers),
  `clientDetail` (facturé depuis le début, encaissé sur 12 mois, reste et retard, délais de paiement de toutes ses
  factures soldées, dernière facture).
- Écrans : **Documents** (4 indicateurs : facturé du mois et de l'année, devis en attente, taux de signature ;
  graphique facturé et encaissé par mois) ; **Clients** (4 indicateurs, principaux clients sur 12 mois, 10 premiers) ;
  **fiche d'un client** (4 indicateurs et son graphique facturé et encaissé).
- Tests : 5 tests unitaires nouveaux (cas calculés à la main), 17 erreurs réintroduites, toutes détectées après ajout
  de deux cas (quatre clients actifs ; factures dans le désordre) ; parcours navigateur (3 points et 3 contrôles
  d'accessibilité nouveaux ; valeurs attendues recalculées par le moteur dans la page) ; captures relues sur ordinateur
  et mobile.

### 5.3 Dépenses et recettes (12/11/2026)

- Données : catégorie facultative des dépenses (`category`, liste fermée `E.EXPENSE_CATEGORIES` ; une catégorie
  inconnue compte comme non classée), proposée dans le formulaire, ajoutée **en dernière colonne** de l'export CSV
  (les colonnes du registre des achats restent à leur place), synchronisée (libellé « catégorie »).
- Moteur `espace-stats.js` : `expenses` (année choisie, jusqu'à aujourd'hui pour l'année en cours : total, mois en
  cours, moyenne des mois écoulés, par mois, par catégorie, 5 premiers fournisseurs, part des encaissements ;
  abattement forfaitaire de l'activité seulement en micro-entreprise à une activité **sans versement libératoire**),
  `receipts` (encaissé, trimestre en cours, moyenne des mois écoulés, **projection** de fin d'année au rythme des jours
  écoulés à partir de février, signalée comme une estimation, cumul jour par jour).
- Écrans : **Dépenses** (4 indicateurs, dépenses par mois, par catégorie, principaux fournisseurs, rappel de
  l'abattement avec lien vers le comparateur de statuts) ; **Recettes** (4 indicateurs, encaissements cumulés face au
  plafond de la micro-entreprise et au seuil de la franchise de TVA). Ces blocs ne s'impriment pas : le livre et le
  registre imprimés restent tels quels.
- Composant : lignes de référence (`refs`) et fin de courbe (`end`) dans le graphique en escalier ; tableaux de données
  des graphiques en classe `data-table` (ils prenaient la classe du livre des recettes, que le parcours navigateur a
  confondue avec le registre).
- Tests : 2 tests unitaires nouveaux et un contrôle de l'export, 15 erreurs réintroduites toutes détectées (après un cas
  d'égalité ajouté) ; parcours navigateur (3 points nouveaux) ; captures relues sur ordinateur et mobile (courbe du
  cumul arrêtée à aujourd'hui, noms de catégories longs sur deux lignes).
- Relecture : la note sur l'abattement était fausse avec le versement libératoire (impôt en pourcentage du chiffre
  d'affaires) : retirée dans ce cas, test ajouté.

### 5.4 Temps et prospects (12/11/2026)

- Moteur `espace-stats.js` : `monday` et `isoWeek` (semaine ISO : celle qui contient le jeudi ; semaine 53 et semaine 1
  à cheval sur deux années testées), `time` (8 dernières semaines du lundi au dimanche, facturable et interne ; semaine
  et mois en cours ; part facturable ; taux moyen ; répartition du mois par client, le temps interne à part ; montant
  encore à facturer, repris de `unbilledByClient` comme la liste « À facturer » de l'écran), `prospects` (pistes par
  étape avec leur valeur, pistes closes, taux de conversion, valeur moyenne d'une piste gagnée, relances en retard et
  du jour).
- **Unité** : les indicateurs et le graphique sont calculés dans l'unité suivie (heures si au moins un temps des
  8 dernières semaines ou du mois est en heures, sinon jours) ; un mélange d'heures et de jours n'est pas converti (la
  durée d'une journée dépend de chacun) : l'écran signale que l'autre unité figure dans le détail du mois.
- Écrans : **Temps** (4 indicateurs : cette semaine, part facturable du mois, à facturer, taux horaire ou journalier
  moyen ; graphique des 8 semaines, facturable et interne ; répartition du mois par client) ; **Prospects**
  (4 indicateurs : pistes ouvertes et leur valeur, à relancer dont en retard, taux de conversion, valeur moyenne
  gagnée ; entonnoir par étape, en nombre et en valeur). Ces blocs ne s'impriment pas.
- Écarts avec le tableau du § 2, et pourquoi :
  - « revenu par heure (facturé ÷ heures facturables) » devient le **taux moyen** des temps facturables du mois,
    pondéré par la durée : une facture n'est pas reliée aux heures qu'elle rémunère quand elle n'a pas été faite
    depuis l'onglet Temps, et diviser tout le facturé par les seules heures saisies gonflerait le résultat ;
  - le taux de conversion porte sur **toutes les pistes closes** et non sur 12 mois, et le graphique « gagnées et
    perdues par mois » n'est pas fait : une piste n'enregistre pas la date à laquelle elle a été gagnée ou perdue (sa
    date de modification change à chaque échange). À reprendre si une date de clôture est ajoutée aux pistes.
- Composant : libellé court d'un groupe de barres (`short`, ici « S46 ») dans `OF.charts.bars` ; `barList` accepte un
  format (durées au lieu de montants).
- Tests : 2 tests unitaires nouveaux (cas calculés à la main), 15 erreurs réintroduites toutes détectées après l'ajout
  d'un cas (ancienne saisie sans champ « facturable ») ; parcours navigateur (5 points nouveaux, accessibilité
  comprise ; valeurs attendues calculées à la main) ; captures relues sur ordinateur et mobile.
- Relecture : le haut de l'onglet Prospects gardait l'ancien encadré à trois chiffres : remplacé par les tuiles
  communes ; le nombre de pistes closes était recalculé dans l'écran : fourni par le moteur.
