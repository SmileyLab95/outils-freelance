# 39. Trésorerie (Espace entrepreneur)

Quatrième module du compte gratuit ([31](31-vision-plateforme.md) § 5 : « Prévision : encaissements attendus, charges,
part à mettre de côté »), dans l'**Espace entrepreneur**, public et local (D30), synchronisé avec les comptes quand ils
ouvriront (D34). Spécification avant le code, 29/10/2026.

## 1. Besoin

Un indépendant regarde son compte et se demande : combien de cet argent est vraiment à moi ? Combien puis-je me verser ?
Vais-je manquer d'argent dans les prochains mois ? Il faut pour cela retirer du solde ce qui est déjà dû (cotisations
sur les encaissements pas encore déclarés, TVA collectée), puis prévoir, mois par mois, les factures qui vont rentrer
et ce qui va sortir (cotisations, TVA, charges régulières).

## 2. Règles

| Règle | Source | Usage |
|---|---|---|
| Micro-entrepreneur : cotisations (et formation professionnelle, versement libératoire s'il est choisi) calculées sur le chiffre d'affaires **encaissé** de la période, payées à la date limite de la déclaration mensuelle ou trimestrielle | Déjà publiées : `micro_activities`, `acre_conditions`, calendrier Urssaf (`data/calendars/fr.json`) ; moteur de la déclaration de l'Espace | « Déjà dû » : cotisations sur ce qui est encaissé dans les périodes pas encore payées ; prévision : cotisations de chaque période (encaissé + factures attendues dans la période), à sa date limite |
| Exigibilité de la TVA : **prestations de services à l'encaissement** du prix ou des acomptes (option possible pour les débits) ; **livraisons de biens à la livraison** (en général la date de la facture) ; activité mixte : chaque opération selon sa nature, ou option globale pour les débits | Entreprendre.service-public.gouv.fr, F31412, lu en entier le 29/10/2026 ; `tva_exigibilite` | TVA due d'une facture de services : part de TVA de chaque encaissement ; facture de biens, facture mixte ou option pour les débits : TVA de la facture à sa date (une facture mixte ne sépare pas ses lignes : la date la plus tôt est retenue, par prudence) |
| Réel normal : déclaration et paiement **mensuels** (CA3) de la TVA du mois précédent ; réel simplifié : **acomptes** de 55 % en juillet et 40 % en décembre de la taxe due l'année précédente, solde avec la déclaration annuelle (CA12) en mai ; pas d'acompte si la TVA de l'année précédente est inférieure à 1 000 € | Entreprendre.service-public.gouv.fr, F23566, lu en entier le 29/10/2026 ; `tva_rsi_calendrier` ; dates du calendrier fiscal | Prévision : TVA du mois au calendrier du mois suivant (réel normal) ; acomptes de juillet et décembre si l'utilisateur indique la TVA due l'année précédente (réel simplifié) ; le solde de mai n'est pas estimé (il dépend de l'année entière) |
| TVA déductible sur les achats | — | **Non déduite** : les dépenses de l'Espace ne séparent pas la TVA ; les montants de TVA sont des maxima, et la page le dit |
| Impôt sur le revenu hors versement libératoire (prélèvement à la source) | — | Hors du module : lien vers le calculateur « Combien mettre de côté » |

Montants **estimés** : l'Espace le dit sur chaque chiffre, sans conseil personnalisé.

## 3. Données

- Profil (champs ajoutés, fusionnés comme les autres champs du profil) : `cashBalance` (solde du compte professionnel),
  `cashDate` (date du solde), `vatLastYear` (TVA due au titre de l'année précédente, réel simplifié, facultative).
- Nouvelle liste `charges` : `{ id, label, amount, every ("month" | "quarter" | "year"), start (première échéance),
  end (dernière, facultative), createdAt, updatedAt }` ; synchronisée comme les dépenses ; sauvegarde : liste
  facultative, contrôlée à l'import.
- Encaissements attendus (calculés) : factures émises non soldées, à leur date d'échéance (en retard : aujourd'hui,
  signalées) ; avoirs à rembourser : sortie aujourd'hui.

## 4. Calculs (moteur `espace-fr.js`)

- **Déjà dû** à la date du jour :
  - cotisations : pour chaque période de déclaration commencée dont la date limite n'est pas passée, encaissé de la
    période × taux (ACRE et versement libératoire compris) ;
  - TVA (hors franchise) : réel normal, TVA exigible des mois dont la déclaration n'est pas passée ; réel simplifié,
    TVA exigible depuis le 1er janvier, moins les acomptes de l'année déjà échus (si la TVA de l'année précédente est
    indiquée) ;
  - **disponible** = solde − déjà dû (si un solde est saisi).
- **Prévision** sur 6 mois (mois en cours compris), à partir du solde saisi : par mois, entrées (factures attendues),
  sorties (cotisations et TVA à leur date, charges régulières), solde de fin ; un mois qui finit en négatif est
  signalé ; chaque montant a sa ligne de détail (date, libellé).
- Charges régulières : chaque mois, trimestre ou année depuis la première échéance (le 31 devient le dernier jour d'un
  mois plus court), jusqu'à la dernière s'il y en a une.

## 5. Écrans

- **Trésorerie** (`#/tresorerie`), onglet après Dépenses :
  - solde du compte (montant, date ; un solde de plus de 7 jours est signalé), et pour le réel simplifié la TVA due
    l'année précédente ;
  - trois chiffres : solde, déjà dû (avec le détail), disponible ;
  - tableau des 6 mois (entrées, sorties, solde de fin) avec le détail de chaque mois ;
  - charges régulières : liste, ajout, modification, suppression ;
  - hypothèses : estimations, TVA avant déduction, impôt sur le revenu hors versement libératoire non compté, lien
    vers « Combien mettre de côté ».
- Tableau de bord : rappel si un mois de la prévision finit en négatif.

## 5 bis. Tests

- Moteur : occurrences des charges (mois courts, fin), encaissements attendus (retard, avoir à rembourser), TVA
  exigible (services à l'encaissement, biens et débits à la facture, avoir, franchise, client hors de France),
  déjà dû (périodes, ACRE, versement libératoire, TVA des deux régimes, acomptes), prévision (soldes, mois négatif,
  dates du calendrier) ; erreurs réintroduites.
- Stockage, synchronisation (charges ; champs du profil), parcours navigateur (solde, charges, prévision, rappel,
  accessibilité, mobile).

## 6. Réalisation (29/10/2026)

- Règles : `tva_rsi_calendrier` confirmée en entier sur la fiche officielle (confiance haute ; dispense d'acomptes sous
  1 000 €, déclarations mensuelles au-delà de 15 000 €) ; nouvelle règle `tva_exigibilite`. L'outil de lecture accepte
  désormais les sites en gouv.fr (entreprendre.service-public.fr y redirige).
- Moteur `espace-fr.js` : `chargeDates`, `chargeErrors`, `expectedReceipts`, `vatPart`, `vatExigible`, `owed`,
  `forecast`. Stockage : liste `charges`, facultative et contrôlée à l'import ; solde, date et TVA de l'année
  précédente dans le profil. Synchronisation : charges fusionnées comme les dépenses, champs du profil nommés en
  français dans les conflits. Écrans « Trésorerie » et modification d'une charge, rappel du tableau de bord, onglet,
  mention sur la page de l'Espace.
- Choix faits en réalisant :
  - un acompte de TVA du réel simplifié n'est déduit qu'à partir du mois suivant le sien (la fiche officielle ne donne
    que le mois) : le « déjà dû » reste prudent ;
  - le solde annuel de TVA de l'année précédente (déclaration CA12 de mai) est signalé, pas estimé : il dépend des
    acomptes de cette année-là, que l'Espace ne connaît pas toujours ;
  - les échéances de charges déjà passées dans le mois en cours ne sont pas reprises (le solde saisi en tient compte) ;
  - un calendrier fiscal trop court pour l'horizon est signalé.
- Tests : `tresorerie.test.mjs` (9 tests, cas calculés à la main : 1 057,80 € de cotisations du 4e trimestre, 300 € de
  TVA d'octobre, acomptes de 55 % et 40 %…), 1 test de synchronisation ; une soixantaine d'erreurs réintroduites, toutes
  détectées après renforcement des tests, sauf trois sans effet observable (une optimisation de boucle et un contrôle
  défensif) ; parcours navigateur de l'Espace (solde, erreurs, charges, détail du mois, mois négatif et rappel du
  tableau de bord, modification, suppression, réel simplifié, sauvegarde, accessibilité, mobile) ; parcours des comptes.
- Relecture critique du code : un avoir de services à rembourser augmentait la TVA prévue au lieu de la diminuer
  (signe compté deux fois) ; test ajouté, qui échouait, puis correction.
- Relecture des captures : lignes à 0 € dans le « déjà dû », toute la ligne d'un mois négatif en rouge, montants
  superposés sur mobile (le tableau héritait de la mise en page du livre des recettes) : corrigés.

## 7. Version 2 : piloter sa trésorerie (spécification du 11/11/2026)

Demande d'Ismail du 11/11/2026 : « la trésorerie n'est pas bien faite : imaginer tout ce dont l'utilisateur pourrait
avoir besoin, avec graphiques et indicateurs ». La v1 répondait à « combien est à moi ? » ; la v2 répond aussi à
« quand vais-je être juste ? », « combien puis-je me verser ? », « qui me paie en retard ? », « combien de temps
puis-je tenir ? », et montre l'évolution plutôt que de la décrire.

### 7.1 Besoins couverts

| Question de l'indépendant | Réponse de l'écran |
|---|---|
| Combien ai-je vraiment ? | Solde saisi, **disponible** (solde − déjà dû), alerte si le solde a plus de 7 jours |
| Vais-je manquer d'argent ? | **Courbe du solde prévu** jour par jour (3, 6 ou 12 mois), ligne zéro et **seuil de sécurité**, **point bas** (montant et date) |
| Et si mes clients paient en retard ? | **Scénario prudent** : factures déjà en retard non comptées, autres factures attendues avec le retard moyen constaté du client (sinon le retard moyen global) ; les deux courbes ensemble |
| Combien puis-je me verser aujourd'hui ? | **Versement possible** : point bas prévu − seuil de sécurité (zéro au minimum), sur l'horizon choisi et le scénario affiché |
| Combien de temps puis-je tenir ? | **Autonomie** : disponible ÷ charges régulières mensuelles moyennes (mois, une décimale) |
| Qui me doit de l'argent, depuis quand ? | **Créances** : à encaisser, dont en retard ; **ancienneté** (pas échues, 1-30, 31-60, 61-90, plus de 90 jours de retard) en barre et en liste, avec lien vers la facture (relance) |
| Mes clients paient-ils vite ? | **Délai moyen de paiement** (jours entre la facture et son paiement complet) et **retard moyen** (jours après l'échéance), sur les 12 derniers mois |
| D'où vient et où va l'argent ? | **Entrées et sorties par mois** : 6 mois passés réels (encaissements, dépenses saisies) puis les mois prévus |
| Qu'est-ce qui arrive bientôt ? | **Prochains mouvements** (30 jours) : factures attendues, cotisations, TVA, charges |
| Quels devis vont rentrer ? | **Devis acceptés à facturer** : montant et nombre (information, non comptés dans la prévision) |
| Une grosse dépense ou une rentrée ponctuelle ? | Mouvements prévus **ponctuels** (une seule date) et **entrées** prévues hors factures (en plus des charges régulières) |
| Le transmettre à mon comptable ou ma banque | **Export CSV** de la prévision (date, nature, libellé, montant, solde) |

### 7.2 Données (ajouts)

- Profil : `cashThreshold` (seuil de sécurité, montant ≥ 0, facultatif ; 0 par défaut).
- Liste `charges` : fréquence `once` (une seule échéance, à la date `start`) ; champ facultatif `flow` (`"in"` pour une
  entrée prévue, sortie sinon). Contrôle de la sauvegarde et synchronisation mis à jour (libellés « sens », « seuil de
  sécurité »).

### 7.3 Calculs (moteur `espace-fr.js`, fonctions pures testées)

- `forecast(input)` : `input.months` de 1 à 12 ; `input.scenario` `"prudent"` (factures en retard retirées, autres
  décalées du retard moyen du client ou, à défaut, du retard moyen global ; une facture décalée au-delà de l'horizon
  sort de la prévision) ; charges ponctuelles et entrées prévues.
- `balanceCurve(f)` : points du solde (aujourd'hui, puis chaque jour qui a un mouvement), point bas, solde final.
- `safeAmount(curve, threshold)` : max(0, point bas − seuil).
- `paymentStats(documents, from, to)` : factures soldées par paiement dans la période (dernier paiement) ; délai moyen,
  retard moyen (un paiement en avance compte 0), part payée à l'heure, et le même calcul par client.
- `aging(documents, today)` : factures émises non soldées par tranche de retard.
- `cashHistory(documents, expenses, from, to)` : par mois, encaissements nets (remboursements d'avoirs déduits) et
  dépenses saisies.
- `monthlyCharges(charges, today)` : sorties régulières ramenées au mois (trimestre ÷ 3, année ÷ 12), charges terminées
  et ponctuelles exclues, entrées exclues ; `runway(available, monthly)`.
- `quotesToInvoice(documents)` ; `forecastCSV(f)`.
- Les montants restent des **estimations** (comme en v1) et l'écran le dit ; aucune règle fiscale nouvelle.

### 7.4 Graphiques

Composant unique `src/assets/tools/charts.js` (SVG, sans bibliothèque) et calculs d'échelle purs et testés
(`engines/chart-scale.js`) : graduations « rondes », courbe en escalier du solde, barres groupées entrées/sorties,
barre empilée de l'ancienneté. Accessibilité : `role="img"`, titre et description, tableau de données dans un
« Voir les données » ; couleurs tirées des jetons du thème (le futur thème s'applique sans changer le code) ; formes en
plus des couleurs (pointillés pour le scénario prudent, hachures pour le prévu) ; lisibles à 360 px.

### 7.5 Écran

1. En-tête : horizon (3, 6, 12 mois), scénario (prévu, prudent), export CSV ; ces choix restent dans l'adresse.
2. Indicateurs : solde, disponible, point bas, versement possible ; à encaisser, délai moyen de paiement, autonomie,
   charges fixes par mois.
3. Graphique « Solde prévu » ; graphique « Entrées et sorties par mois ».
4. Déjà dû (détail) ; créances par ancienneté et factures en retard ; prochains mouvements.
5. Détail mois par mois (tableau v1) ; mouvements prévus (charges régulières, ponctuelles, entrées) ; réglages (solde,
   date, seuil, TVA de l'année précédente) ; hypothèses.
6. Tableau de bord : alerte si le solde prévu passe sous le seuil (et plus seulement sous zéro).

### 7.6 Tests

Moteur (cas calculés à la main, erreurs réintroduites), échelles des graphiques, parcours navigateur (horizon,
scénario, seuil, charge ponctuelle, entrée prévue, export, accessibilité, mobile), synchronisation (nouveaux champs).

### 7.7 Réalisation (11/11/2026)

- Moteur `espace-fr.js` : mouvements ponctuels (`once`) et entrées (`flow: "in"`), chiffre d'affaires prévu (`revenue`)
  compté dans les cotisations de sa période (activité principale du profil) et, au réel normal, dans la TVA du mois au
  taux du profil (montant prévu TTC) ; horizon de 1 à 12 mois ; scénario prudent ; `balanceCurve`, `safeAmount`,
  `paymentStats`, `aging`, `cashHistory`, `monthlyCharges`, `runway`, `breakEven` (point mort : charges mensuelles ÷
  (1 − taux total de l'activité principale), arrondi à l'euro supérieur), `quotesToInvoice`, `forecastCSV`.
- Graphiques : `engines/chart-scale.js` (échelles, testé) et `tools/charts.js` (SVG) : courbe en escalier du solde
  (prévu plein, autre scénario en pointillés, seuil, point bas), barres entrées/sorties (6 mois réels, mois prévus
  hachurés), barre empilée de l'ancienneté des créances ; redessinés à la largeur de leur carte (changement de taille de
  la fenêtre compris) ; tableau « Voir les données » sous chaque graphique.
- Écran : 8 indicateurs (2 colonnes sur mobile), horizon et scénario dans l'adresse (`#/tresorerie?horizon=12&scenario=prudent`),
  export CSV, créances (ancienneté, factures en retard avec lien de relance, lien vers le calculateur de pénalités,
  devis acceptés à facturer), prochains mouvements, déjà dû, détail mois par mois, mouvements prévus (sens, fréquence,
  chiffre d'affaires), réglages (solde, date, seuil). Rappel du tableau de bord daté (« sous zéro le … » ou « sous
  votre seuil de sécurité le … »).
- Choix faits en réalisant : un avoir à rembourser n'est jamais décalé dans le scénario prudent ; l'autonomie est
  arrondie à la décimale inférieure (prudent) ; une entrée qui n'est pas du chiffre d'affaires (apport, subvention)
  n'entre pas dans les cotisations ; le point mort n'est calculé qu'en micro-entreprise (les autres régimes n'ont pas
  de taux de cotisations dans l'Espace).
- Tests : `tresorerie-v2.test.mjs` (10 tests, cas calculés à la main), `chart-scale.test.mjs` (7 tests),
  synchronisation (seuil, sens, chiffre d'affaires) ; 30 erreurs réintroduites dans le moteur et 10 dans les échelles,
  toutes détectées après ajout de 9 cas limites (dates en bordure, remboursement dans le scénario prudent, un jour de
  retard, facture partielle non échue, arrondi de l'autonomie, passage d'année…) ; parcours navigateur (29 points sur
  la trésorerie, accessibilité comprise), parcours des comptes.
- Relecture des captures : liste des prochains mouvements trop serrée dans une demi-colonne (nature passée sous le
  libellé) ; indicateurs sur une seule colonne sur mobile (règle plus spécifique) ; étiquettes du graphique traversées
  par la courbe (liseré) ; hachures des mois prévus de la même couleur pour les entrées et les sorties (un motif SVG ne
  prend pas la couleur de l'élément qui l'utilise : un motif par série).
