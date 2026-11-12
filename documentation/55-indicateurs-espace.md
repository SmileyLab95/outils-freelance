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

### 5.5 Échéances (12/11/2026)

- Moteur `espace-stats.js` : `deadlines(événements, mouvements prévus, aujourd'hui, jours)` : échéances à venir triées,
  nombre de jours restants, **montant estimé** d'une échéance Urssaf ou TVA repris des mouvements prévus de la
  trésorerie (`E.forecast`) à la même date, totaux des cotisations et de la TVA dans la fenêtre. Les échéances retenues
  restent celles du profil (périodicité, régime de TVA, création dans l'année), comme avant.
- Écran : 4 indicateurs (prochaine échéance, nombre d'échéances dans les 90 jours, cotisations estimées, TVA estimée ;
  « – » avec la raison en franchise en base, au réel simplifié sans la TVA de l'an dernier, ou hors micro-entreprise) ;
  **frise des 90 prochains jours** (tige de hauteur proportionnelle au montant estimé ; repères sous l'axe pour les
  échéances sans montant ; forme et couleur par catégorie : rond Urssaf, carré TVA, losange impôts, anneau
  information ; tableau des données) ; liste des 12 mois avec le montant estimé à droite.
- Écart avec le tableau du § 2 : les montants portent sur les **90 prochains jours** (la fenêtre de la frise) et non sur
  « 3 prochains mois » : le calendrier reporte au premier jour ouvré une date limite tombant un week-end (déclaration du
  4e trimestre 2026 : 1er février 2027), qu'une fenêtre arrêtée au 31 janvier aurait laissée de côté pour un
  déclarant trimestriel.
- Composant : `OF.charts.timeline` ; classes `is-dl-*` (la classe `is-vat` désignait déjà le seuil de TVA en
  pointillés des recettes).
- Tests : 1 test unitaire nouveau (cas calculés à la main, bornes de la fenêtre, deux montants le même jour),
  12 erreurs réintroduites : 11 détectées ; la douzième était redondante (le montant n'est indexé que dans la fenêtre) et
  la vérification a été retirée ; parcours navigateur (4 points nouveaux, accessibilité comprise ; acompte de TVA de
  décembre calculé à la main : 40 % de 5 000 €) ; captures relues sur ordinateur et mobile (franchise trimestrielle,
  réel normal mensuel).
- Relecture : la phrase d'en-tête de la liste affichait « franchise en base (pas de tva)) » (libellé du formulaire mis en
  minuscules) : libellés propres à cette phrase.

## 6. Bilan

Les huit onglets de l'Espace (trésorerie comprise, [39](39-tresorerie.md) § 7) ont leurs indicateurs et graphiques.
Pistes d'amélioration notées : date de clôture des pistes (faite le 12/11, § 7) ;
période choisie dans l'adresse (faite le 12/11 pour les documents, § 8, et les dépenses, § 9) pour les documents et les dépenses (`?periode=`), aujourd'hui fixée à l'année ou à
12 mois glissants.

## 7. Date de clôture des pistes (spécification du 12/11/2026, suite du § 6)

Besoin : le § 2 demandait le taux de conversion sur 12 mois et les pistes gagnées et perdues par mois ; il faut pour
cela savoir **quand** une piste a été gagnée ou perdue, ce que les données ne disaient pas (§ 5.4).

**Données** (deux champs facultatifs, au format AAAA-MM-JJ ; les anciennes données restent valables) :

- devis : `decidedAt`, date à laquelle l'utilisateur l'a marqué « Accepté » ou « Refusé » (retirée s'il le remet « En
  attente ») ; posée aussi quand une facture est créée depuis le devis, s'il n'en avait pas ;
- piste : `closedAt`, date à laquelle l'utilisateur l'a passée à « Gagné » ou « Perdu » (retirée s'il la rouvre ; une
  piste déjà close et seulement modifiée garde sa date ; une piste close **avant** ce changement reste sans date : on
  ne la date pas du jour où elle est réenregistrée).

**Date de clôture d'une piste** (moteur, une seule source de vérité) :

- piste affichée « Perdu » : `closedAt` ;
- piste affichée « Gagné » : la plus ancienne des dates disponibles : `closedAt` si « Gagné » a été choisi, date de
  décision de ses devis acceptés ou facturés, et, pour un devis facturé sans date de décision, date de la facture ;
- piste ouverte : aucune ; aucune date connue : « sans date ».

**Indicateurs** : taux de conversion sur les **12 derniers mois** (pistes closes datées dans la période, du lendemain
du même jour un an plus tôt jusqu'à aujourd'hui) ; s'il n'y en a aucune, le taux sur toutes les pistes closes, dit
comme tel ; graphique « Pistes gagnées et perdues par mois » (12 derniers mois), affiché dès qu'une clôture est
datée, avec le nombre de pistes closes sans date signalé sous le graphique.

**Synchronisation et sauvegarde** : champs fusionnés comme les autres champs (libellés « date de décision » et « date
de clôture » dans les conflits) ; à l'import, une date présente mais illisible rend la sauvegarde illisible.

**Tests** : moteur (cas calculés à la main : chaque règle ci-dessus, bornes des 12 mois, anciennes pistes sans date),
erreurs réintroduites ; parcours navigateur (devis accepté puis remis en attente, piste perdue puis rouverte,
graphique et note des pistes sans date) ; import d'une date illisible ; captures.

### 7.1 Réalisation (12/11/2026)

- Moteur : `E.prospectClosedAt` (règles ci-dessus) ; `ST.prospects` donne en plus `closed12`, `conversion12`,
  `undated` (pistes closes sans date) et `months` (gagnées et perdues des 12 derniers mois calendaires).
- Écran : boutons « Accepté », « Refusé », « En attente » du devis et création d'une facture depuis un devis (date de
  décision) ; enregistrement d'une piste (date de clôture) ; indicateur « Taux de conversion » sur 12 mois (sinon sur
  toutes les pistes closes, dit comme tel) ; carte « Pistes gagnées et perdues » (graphique bas, données, note des
  pistes sans date).
- Sauvegarde : une date présente mais illisible est refusée ; synchronisation : libellés « date de décision » et « date
  de clôture ».
- Tests : 1 test du moteur des pistes (12 cas), 1 test des indicateurs, 1 test de synchronisation ; 15 erreurs
  réintroduites : 14 détectées après l'ajout de deux cas (devis refusé sur une piste gagnée ; devis facturé qui a aussi
  une date de décision), la quinzième sans effet possible (une piste ouverte n'a aucune date à retenir) ; parcours
  navigateur (10 points nouveaux, accessibilité comprise) ; captures relues sur ordinateur et mobile (hauteur du
  graphique réduite : il ne compte que quelques pistes).
- Relecture : un contrôle existant du parcours lisait le premier bloc dépliable de la page, devenu le « Voir les
  données » du nouveau graphique ; il vise maintenant la liste des pistes gagnées. Un second clic sur « Accepté »
  aurait redaté le devis du jour : la date n'est posée que si le statut change (contrôle ajouté au parcours).

## 8. Période choisie dans l'adresse : onglet Documents (spécification du 12/11/2026, suite du § 6)

Besoin : les indicateurs de l'onglet Documents étaient figés (mois, année en cours, 12 mois). Un indépendant veut
aussi voir son trimestre (déclarations trimestrielles) et l'année précédente entière (déclaration annuelle des revenus).
L'onglet Dépenses a déjà son année dans l'adresse (`?annee=`) ; l'onglet Clients reste sur 12 mois (dépendance).

- **Adresse** : `#/documents?periode=mois|trimestre|annee|12m|precedente` ; par défaut `annee` ; une valeur inconnue
  revient au défaut. Le choix se fait par des boutons (comme l'horizon de la trésorerie) et se combine avec les
  filtres et la recherche existants.
- **Périodes** (moteur `ST.period`, une seule définition) : mois en cours (du 1er à aujourd'hui) ; trimestre civil en
  cours (de son premier jour à aujourd'hui) ; année en cours (du 1er janvier à aujourd'hui) ; 12 derniers mois (du
  lendemain du même jour un an plus tôt à aujourd'hui) ; année précédente entière (1er janvier – 31 décembre).
- **Indicateurs** sur la période : facturé HT (factures moins avoirs, nombre de factures, montant moyen, avoirs) ;
  **encaissé** (paiements reçus, remboursements déduits, comme le livre des recettes) ; taux de signature des devis
  émis sur la période ; « devis en attente » reste un état présent (devis encore valables), sans période.
- **Graphique** « Facturé et encaissé par mois » : mois de l'année choisie pour « année » et « année précédente » ;
  12 derniers mois sinon.
- **12 derniers mois partout** : la même fenêtre (du lendemain du même jour un an plus tôt à aujourd'hui) pour les
  principaux clients (tableau de bord, Clients), les clients actifs, l'encaissé sur 12 mois d'une fiche client, les
  délais de paiement de la trésorerie et les prospects ; jusqu'ici certains onglets comptaient aussi le jour de
  l'an dernier (12 mois et un jour).
- **Tests** : moteur (chaque période, bornes, 29 février, début de trimestre), parcours navigateur (chaque bouton,
  valeurs recalculées, adresse inconnue), captures.

### 8.1 Réalisation (12/11/2026)

- Moteur : `ST.period(clé, aujourd'hui)` (bornes et libellé : « ce mois-ci », « au 4e trimestre », « en 2026 »,
  « sur 12 mois », « en 2025 »), `ST.since12` (début des 12 derniers mois) ; `ST.documents(liste, aujourd'hui, clé)`
  donne facturé, encaissé, nombre et moyenne des factures, avoirs et devis de la période.
- Écran : boutons « Mois, Trimestre, Année, 12 mois, Année précédente » avec les dates de la période ; indicateurs
  « Facturé », « Encaissé », « Devis en attente » (état présent) et « Taux de signature » ; graphique de l'année
  choisie ; les filtres et la recherche gardent la période dans l'adresse. La liste des documents n'est pas filtrée
  par la période (les boutons portent sur les indicateurs, comme le dit leur libellé).
- 12 derniers mois : la même fenêtre partout (principaux clients du tableau de bord et de Clients, clients actifs,
  encaissé d'une fiche client, délais de paiement de la trésorerie, prospects).
- Mobile : les boutons de période passent à la ligne dans un cadre arrondi (ils dépassaient de l'écran).
- Tests : 3 tests unitaires (périodes, documents sur chaque période, bornes des 12 mois pour les clients), cas
  calculés à la main ; 14 erreurs réintroduites, toutes détectées après l'ajout d'un devis de l'année en cours ;
  parcours navigateur (6 points nouveaux, accessibilité comprise) ; captures relues sur ordinateur et mobile.
- Relecture : le parcours lisait l'écran avant son nouveau rendu après un clic ; il attend désormais que les
  indicateurs affichent la période choisie.

## 9. Période de l'onglet Dépenses (spécification du 12/11/2026, suite du § 6)

Besoin : en début d'année, les indicateurs « de l'année » ne portent que sur quelques semaines ; le mois et le
trimestre servent au suivi courant ; les 12 derniers mois donnent une moyenne et une part des encaissements stables.

- **Onglets d'année gardés** : le registre des achats se tient et se récapitule **par année** (documentation/36) ;
  la liste, ses totaux, l'export CSV et l'impression restent ceux de l'année choisie. Une année passée garde ses
  indicateurs de l'année entière, sans boutons (« Du 01/01/2025 au 31/12/2025. »).
- **Année en cours** : boutons « Période des indicateurs » **Mois, Trimestre, Année** (par défaut), **12 mois**, mêmes
  bornes que les documents (§ 8, `ST.period`). Pas d'« Année précédente » : l'onglet de l'année la remplace. Adresse
  `#/depenses?periode=mois|trimestre|12m` ; une période inconnue (ou « precedente ») donne l'année.
- **Indicateurs** sur la période : dépenses (total, nombre) ; premier poste (catégorie la plus élevée et sa part) ;
  moyenne mensuelle sur les mois de la période (trimestre : mois commencés du trimestre ; année : mois écoulés ;
  12 mois : 12) ou, pour le mois, **dépense moyenne** (total ÷ nombre) ; part des encaissements de la même période
  (et abattement forfaitaire de l'activité, inchangé). Catégories et principaux fournisseurs sur la période.
- **Graphique** « Dépenses par mois » : mois de l'année pour « Année » (et pour une année passée), 12 derniers mois
  sinon (comme les documents).
- **Affichage** : les indicateurs apparaissent dès qu'une dépense passée existe (une année sans dépense affiche
  0 € et les 12 mois restent utiles) ; aucune dépense : rien, comme aujourd'hui.
- **Tests** : moteur (chaque période, bornes, moyenne, part des encaissements, valeurs calculées à la main), parcours
  navigateur (boutons, adresse, période inconnue, année passée), captures sur ordinateur et mobile.

### 9.1 Réalisation (12/11/2026)

- Moteur : `ST.expensesPeriod(dépenses, documents, aujourd'hui, clé, profil, règles)` (bornes et libellés de
  `ST.period`, moyenne par mois de la période, dépense moyenne, graphique) ; `ST.expenses` (année entière) et lui
  partagent le calcul des catégories, fournisseurs, encaissé et abattement (`expenseStats`, `expensesByMonth`).
- Écran : boutons « Mois, Trimestre, Année, 12 mois » au-dessus des indicateurs de l'année en cours, avec les dates de
  la période ; « Premier poste » remplace « Ce mois-ci » (le bouton « Mois » le donne) ; une année passée affiche ses
  dates, sans boutons. La liste, l'export et l'impression restent ceux de l'année.
- Graphique des 12 derniers mois : mois entiers (de décembre 2025 à novembre 2026 le 12/11/2026) ; les indicateurs
  « sur 12 mois » partent du 13/11/2025 : une dépense du début du mois de l'an dernier compte dans les indicateurs sans
  figurer sur le graphique (comme pour les documents, § 8).
- Tests : 1 test unitaire (chaque période, bornes du trimestre et des 12 mois, dépense future, janvier, aucune dépense),
  valeurs calculées à la main ; 15 erreurs réintroduites : 14 détectées, la quinzième sans effet (la fin de chaque
  période est aujourd'hui) ; parcours navigateur (6 points nouveaux, accessibilité comprise ; Espace : 288 points) ;
  captures relues sur ordinateur et mobile (trimestre, 12 mois, année passée).
