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
