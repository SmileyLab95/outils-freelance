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
