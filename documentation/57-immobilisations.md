# 57. Immobilisations et amortissements (Espace entrepreneur)

Module « Matériel » de [31](31-vision-plateforme.md) § 3 (registre des immobilisations et amortissement, régimes
réels), dans l'**Espace entrepreneur**, public et local (D30). Spécification avant le code, 14/11/2026.

## 1. Besoin

L'entrepreneur au **régime réel** (« Je ne suis pas en micro-entreprise » dans le profil) qui achète un ordinateur, un
appareil, du mobilier ou un logiciel ne déduit pas toujours la dépense d'un coup : au-delà de 500 € HT, le bien est
**immobilisé** et **amorti** sur sa durée d'utilisation. Il doit tenir un **registre des immobilisations et des
amortissements** (professions libérales en déclaration contrôlée) et reporter chaque année les amortissements dans sa
déclaration. Il veut savoir quoi immobiliser, combien déduire cette année et ce que contient le registre, sans tableur.

Le micro-entrepreneur n'est pas concerné : son abattement forfaitaire « est réputé tenir compte des amortissements
pratiqués selon le mode linéaire » (§ 2), et plus largement l'abattement tient lieu des charges réelles (CGI, art. 50-0 et
102 ter, comme pour les dépenses : [36](36-depenses-et-registre-des-achats.md)) ; l'écran le lui dit.

## 2. Règles (lues le 14/11/2026 avec l'outil « Lire une source officielle »)

| Règle | Source | Usage |
|---|---|---|
| Matériels et outillages, matériels et mobiliers de bureau, logiciels d'une **valeur unitaire HT n'excédant pas 500 €** : déductibles immédiatement en charges ; matériel de transport exclu ; valeur globale si le bien se compose d'éléments achetés séparément ; mobilier : pas pour l'équipement initial ni le renouvellement complet (sauf si leur total n'excède pas 500 €) | BOFiP BOI-BIC-CHG-20-30-10 (01/03/2017), §§ 10 à 40 ; BOI-BNC-BASE-40-60-30 (12/09/2012), §§ 150 à 220 : l'exploitant qui déduit ces biens « est dispensé de porter le prix d'acquisition [...] sur le registre » | Message sur la fiche d'un bien de 500 € HT ou moins (hors transport) : il peut être déduit en charge au lieu d'être immobilisé ; seuil dans `immobilisation_seuil_charges` |
| Amortissement **linéaire** : annuité = prix de revient ÷ nombre d'années de la période normale d'utilisation ; départ le **jour de la mise en service** ; première annuité réduite **au prorata du temps couru, apprécié en nombre de jours** ; total des amortissements au plus égal au prix de revient ; annuité = période de douze mois ; bien cédé : amortissement de l'année jusqu'à la cession (dispense possible, sauf véhicules du 4 de l'article 39 du CGI) | BOFiP BOI-BIC-AMT-20-10 (12/09/2012), §§ 120, 170, 190, 210, 220, 240, 250 | Moteur : plan d'amortissement année par année ; règle `amortissement_lineaire` |
| Durée : celle de la « durée probable d'utilisation », dans la limite des usages de la profession ; **aucun barème officiel** | BOI-BIC-AMT-20-10, § 170 (renvoi à BOI-BIC-AMT-10-40) | Durée saisie par l'utilisateur (années entières), sans valeur imposée ; aide : « durée pendant laquelle vous utiliserez le bien » |
| BNC : amortissements selon les règles des BIC (CGI, art. 93, 1, 2°) ; à mentionner sur le **registre des immobilisations et des amortissements** de la déclaration contrôlée ; régime déclaratif spécial (micro) : l'abattement « est réputé tenir compte des amortissements pratiqués selon le mode linéaire » (CGI, art. 102 ter) | BOI-BNC-BASE-50 (version du 05/08/2026), §§ 1 à 30 | Module réservé au profil « régime réel » |
| Registre des BNC : présentation libre ; y porter la **date d'acquisition** (et la date de mise en service si elle diffère), la **nature** et le **prix de revient**, le **détail des amortissements de chaque année**, et en cas de cession **le prix et la date** ; pièces justificatives conservées ; bien affecté en partie à la profession : mention « affecté partiellement à l'exercice de la profession », seule la fraction professionnelle de l'amortissement est déductible | BOI-BNC-DECLA-10-20 (12/09/2012), §§ 430 à 470, 560 à 590 | Colonnes du registre, champ « part professionnelle », mention imprimée |

**Exercice** : l'outil compte par **année civile** (cas des BNC et de la plupart des entrepreneurs individuels) ; un
exercice BIC d'une autre durée ou décalé n'est pas géré (dit à l'écran). **Prorata** : jours exacts du jour de mise en
service (compris) au 31 décembre, divisés par le nombre de jours de l'année (365 ou 366) ; le BOFiP dit « en nombre de
jours » sans préciser la base : la pratique comptable sur 360 jours donne un résultat très proche ; **point signalé**.
**Cession** : amortissement de l'année jusqu'au jour de la cession compris, puis valeur nette à cette date ; la
plus-value ou moins-value (régime des articles 39 duodecies et suivants) n'est **pas calculée** : l'écran l'indique.
**Seuil de 500 € HT** : l'écran compare le prix de revient saisi au seuil, qui s'entend hors taxes ; si le montant
saisi comprend la TVA, le message peut manquer : **point signalé**. **Véhicules de tourisme** : plafonds d'amortissement déductible (4 de l'article 39 du CGI) non lus : l'écran
signale que la part déductible peut être plafonnée et ne la calcule pas.

Aucun chiffre de cet écran ne vient d'ailleurs que de ces règles ou de la saisie de l'utilisateur.

## 3. Données

Nouvelle liste `assets` dans l'Espace : `{ id, label (nature), category, acquiredOn, inServiceOn (vide = date
d'acquisition), cost (prix de revient, en euros), years (durée, de 1 à 50 ans), proShare (part professionnelle, de 1 à
100 %, 100 par défaut), soldOn, salePrice, createdAt, updatedAt }`.

- `category` : `materiel` (matériel et outillage), `bureau` (matériel et mobilier de bureau), `logiciel`,
  `transport` (véhicule, matériel de transport), `autre` (agencements, autres biens).
- Contrôles : nature, catégorie et date d'acquisition obligatoires ; mise en service au plus tôt à l'acquisition ;
  prix de revient positif ; durée entière de 1 à 50 ; part de 1 à 100 ; cession après la mise en service, avec un prix
  positif ou nul ; dates valides.
- Sauvegarde et import : liste facultative (anciennes sauvegardes acceptées), chaque bien contrôlé. Synchronisation
  des comptes : fusion par identifiant comme les dépenses.

## 4. Calculs (moteur `espace-fr.js`)

- `assetPlan(asset)` : une ligne par année civile, de l'année de mise en service à la dernière : base, jours retenus
  la première année, annuité, cumul, valeur nette en fin d'année, part déductible (annuité × part professionnelle) ;
  le cumul est arrondi au centime à chaque année et le dernier est égal au prix de revient (deux annuités peuvent donc
  différer d'un centime : 1 000 € sur 3 ans donnent 333,33 €, 333,34 € et 333,33 €). Cédé : plan arrêté à l'année de cession, annuité de
  cette année au prorata jusqu'au jour de la cession, valeur nette à la cession.
- `assetsYear(assets, year)` : biens présents dans l'année, annuités, total des amortissements et de la part
  déductible, valeur nette en fin d'année, biens cédés.
- `assetHints(asset, rules)` : 500 € HT ou moins hors transport (déduction possible) ; véhicule (plafonds non
  calculés) ; usage partiel (mention du registre).

## 5. Écrans

- **Dépenses** (profil au réel) : lien « Registre des immobilisations ». Profil micro : l'écran « Immobilisations »
  explique que l'abattement couvre l'amortissement.
- **« Immobilisations »** (`#/immobilisations?annee=AAAA`) : choix de l'année ; indicateurs (amortissements de l'année,
  part déductible, valeur nette au 31/12, nombre de biens) ; tableau : nature, mise en service, prix de revient,
  durée, annuité, cumul, valeur nette, part déductible ; biens cédés dans l'année signalés ; export CSV et impression
  (registre de l'année) ; bouton « Ajouter un bien ».
- **Fiche d'un bien** (`#/immobilisations/<id>`) : champs du § 3, messages du § 4, plan d'amortissement complet ;
  enregistrer, supprimer (confirmation).
- Mentions : « calcul en année civile », « prorata en jours exacts », « plus-value non calculée », renvoi à la
  déclaration 2035 ou 2031 et à un professionnel en cas de doute ; pas de conseil personnalisé.

## 6. Tests

- Moteur : plan simple (3 ans, mis en service le 1er janvier : trois annuités égales) ; mise en service en cours
  d'année (jours exacts, année bissextile) ; dernière annuité = reste ; total = prix de revient au centime ; part
  professionnelle ; cession en cours d'année (prorata jusqu'à la cession, plan arrêté, valeur nette) ; contrôles de
  saisie ; messages (500 € pile, 500,01 €, transport) ; année sans bien ; chaque test vérifié en réintroduisant
  l'erreur qu'il doit détecter.
- Stockage, import (avec et sans biens, bien illisible refusé), synchronisation (ajout des deux côtés).
- Parcours navigateur : profil micro (explication), profil au réel (ajout, erreurs, plan, année suivante, cession,
  CSV, suppression), accessibilité, mobile.

## 7. Réalisation (14/11/2026)

- Règles `immobilisation_seuil_charges`, `amortissement_lineaire`, `registre_immobilisations_bnc` (`data/rules/fr.json`,
  confiance haute, BOFiP lu le 14/11/2026).
- Moteur `espace-fr.js` : `ASSET_CATEGORIES`, `assetErrors` et `checkAsset`, `assetStart`, `assetPlan`, `assetsYear`,
  `assetHints`, `assetsCSV`. Stockage : liste facultative `assets` (sauvegarde, import contrôlé, anciennes sauvegardes
  acceptées) ; synchronisation : fusion champ par champ comme les charges, champs nommés en français dans les conflits.
- Écrans : « Immobilisations » (`#/immobilisations`, onglet « Dépenses » actif, lien depuis « Dépenses » au régime réel ;
  explication en micro-entreprise), registre de l'année (indicateurs, tableau, total, export CSV, impression), fiche
  avec plan d'amortissement mis à jour à la saisie et messages (500 € HT, véhicule, usage partiel). Sur mobile, chaque
  montant du registre et du plan porte son libellé.
- Tests : 9 tests unitaires (dont un test des règles), 1 test de synchronisation ; 12 erreurs réintroduites dans le
  moteur, toutes détectées, et une branche sans effet retirée (le dernier cumul vaut déjà le prix de revient) ;
  vérification sur environ 16 000 plans tirés au hasard (total = prix de revient, aucune annuité négative) ; parcours
  navigateur de l'Espace (20 points : micro-entreprise, régime réel, erreurs, plan, messages, deux biens, année
  suivante, cession, export, sauvegarde illisible, suppression, accessibilité) ; captures relues sur ordinateur et
  mobile : tableau trop large (colonnes regroupées, cumul gardé dans le plan et l'export) et montants superposés sur
  mobile (libellés ajoutés), corrigés.

## 8. Plafond d'amortissement des voitures particulières (spécification du 14/11/2026)

**Besoin** : l'entrepreneur au réel qui achète une voiture de plus de 18 300 € ne peut pas déduire tout son
amortissement ; l'écran disait seulement « plafond non calculé ».

**Règles lues le 14/11/2026** (outil « Lire une source officielle ») :

| Règle | Source |
|---|---|
| L'amortissement des véhicules **immatriculés dans la catégorie des voitures particulières** n'est pas déductible pour la fraction du prix d'acquisition qui excède le plafond ; entreprises concernées : BIC, IS **et BNC** ; plafond selon la nature du véhicule, son taux d'émission de CO2 (indiqué en principe sur la carte grise), la date de sa première mise en circulation et la date de son acquisition ; les autres frais (entretien, carburant…) restent déductibles sans limite | BOFiP BOI-BIC-AMT-20-40-50 (18/12/2019), §§ 20, 40, 60, 200 |
| Calcul : part déductible de chaque annuité = annuité × plafond ÷ prix d'acquisition TTC (exemple : « montant de la dotation annuelle affecté du rapport 9 900/35 000 ») ; le reste est réintégré | BOI-BIC-AMT-20-40-50, exemple chiffré du I-B, avant le § 180 (tableau « Limite fiscale (art. 39-4) »), et § 280 |
| Véhicules **sans** le nouveau dispositif d'immatriculation, acquis à compter du 1er janvier 2021 : 30 000 € (moins de 20 g/km), 20 300 € (20 à moins de 60 g), 18 300 € (60 à 130 g), 9 900 € (plus de 130 g) | BOI-BIC-AMT-20-40-50, § 80 |
| Véhicules du **nouveau dispositif d'immatriculation** (WLTP : première immatriculation à compter du 1er mars 2020) : 30 000 € (moins de 20 g/km), 20 300 € (20 à moins de 50 g), 18 300 € (50 à 160 g pour un véhicule acquis à compter du 1er janvier 2021), 9 900 € (plus de 160 g) | Notices DGFiP 2026 n° 2032-NOT-SD et 2142-NOT-SD (et 2033-NOT-SD) |

**Choix (D78)** :
- Champs ajoutés pour la catégorie « Véhicule » : « Voiture particulière (VP sur la carte grise) », date de première
  immatriculation, émissions de CO2 en g/km. Obligatoires seulement pour une voiture particulière acquise à compter
  de 2021 (le plafond se calcule alors).
- Voiture particulière acquise **avant 2021** : barèmes des années 2017 à 2020 (et antérieurs) non repris ; la part
  déductible est « à établir », comme pour une carte grise incomplète. Véhicule qui n'est pas une voiture
  particulière : pas de plafond.
- Le prix comparé au plafond est le **prix de revient saisi** ; l'écran rappelle que le plafond s'apprécie sur le
  prix TTC.
- À **160 g/km pile** (WLTP), le plafond retenu est 18 300 € (la notice 2032 dit « inférieur ou égal », la 2142
  « inférieur » mais réserve 9 900 € aux véhicules « supérieur à 160 grammes ») : **point signalé**.
- Voiture **en partie privée** et plafonnée : la façon de combiner la part professionnelle et le plafond n'est pas
  écrite dans les textes lus ; l'Espace **ne calcule pas** la part déductible (« à établir »), la retire des totaux et
  le signale. Le plan d'amortissement comptable (annuités, cumul, valeur nette) reste calculé.
- Le cumul et la valeur nette ne changent pas : la limite est fiscale (réintégration), pas comptable.

**Moteur** : `vehicleCap(asset, rules)` → `null` (pas un véhicule), `{ status: "not_vp" | "before" | "missing" |
"under" | "capped", cap, ratio, wltp }` ; `assetPlan(asset, rules)` et `assetsYear(assets, year, rules)` appliquent
le rapport plafond ÷ prix à la part déductible (`deductible: null` si la part est à établir) ; `assetsYear` compte les
biens dont la part est à établir (`pending`).

**Tests** : barèmes WLTP et anciens aux bornes (19/20, 49/50, 160/161 ; 59/60, 130/131), voiture acquise en 2020,
véhicule utilitaire, prix sous le plafond, annuités plafonnées (exemple du BOFiP : 8 750 € × 9 900 / 35 000 =
2 475 €), voiture en partie privée, totaux sans les parts à établir, saisie (champs obligatoires), écran.

**Réalisation (14/11/2026)** : règle `plafond_amortissement_vp` (notices 2032, 2142 et 2033 de 2026, BOFiP) ; moteur
`vehicleCap`, `assetErrors(asset, rules)`, `assetPlan(asset, rules)`, `assetsYear(assets, year, rules)` (champ
`pending`) ; écran : case « Voiture particulière », date de première immatriculation et CO2 affichés pour la catégorie
« Véhicule », message du plafond (barème, rapport plafond / prix, réintégration), « à établir » dans le plan et le
registre, mention « amortissement déductible plafonné à … » au registre, indicateur « Part déductible » sans les biens
à établir ; sauvegarde, import et synchronisation compris. Tests : 6 tests unitaires (bornes des deux barèmes, statuts,
exemple du BOFiP, part à établir, saisie), 22 erreurs réintroduites dans le moteur, toutes détectées ; 11 points de plus
au parcours de l'Espace (véhicule utilitaire, champs masqués ou affichés selon la catégorie, carte grise exigée, voiture
plafonnée, en partie privée, enregistrée, sauvegardes avec une carte grise illisible refusées), 14 erreurs réintroduites
dans l'écran et le stockage, toutes détectées (deux après ajout de points au parcours) ; parcours des comptes et du site
(4 396 points) ; captures relues (ordinateur, mobile) : indicateur « part professionnelle seulement » devenu
inexact avec le plafond, corrigé ; mention du plafond ajoutée au registre.


## 9. Plus-values et moins-values de cession (spécification du 14/11/2026)

**Besoin** : l'entrepreneur au réel qui vend (ou met au rebut) un bien inscrit au registre doit déclarer une
plus-value ou une moins-value, à court ou à long terme ; l'écran disait seulement « plus-value non calculée ».

**Règles lues le 14/11/2026** (outil « Lire une source officielle ») :

| Règle | Source |
|---|---|
| Prix de cession : somme effectivement acquise, **nette des frais** de la cession (commissions…) ; prix de revient : celui qui sert de base à l'amortissement | BOI-BNC-BASE-30-20 (02/11/2016), §§ 20 et 70 |
| **Véhicule** dont l'amortissement est limité : plus-value calculée avec les amortissements linéaires qui auraient pu être pratiqués **sans limitation** sur le prix de revient total ; véhicule affecté en partie à la profession : plus-value **réduite à la part professionnelle** (exemple : 2 833,33 € × 2/3) ; mêmes règles pour une moins-value | BOI-BNC-BASE-30-20, §§ 80 à 110 |
| Court terme : plus-values sur biens détenus **depuis moins de deux ans** ; biens détenus depuis deux ans au moins : plus-value à court terme **dans la mesure des amortissements déduits** pour l'assiette de l'impôt, le reste à long terme ; moins-values sur biens **amortissables** : à court terme **quelle que soit la durée de détention** | BOI-BNC-BASE-30-30-10, §§ 20 à 70 (tableau) |
| Court terme : compensation de l'année ; plus-value nette ajoutée au bénéfice, **étalement possible** par parts égales sur l'année et les deux suivantes (pas en cas de cessation) ; moins-value nette imputée sur le bénéfice (déficit au-delà) | BOI-BNC-BASE-30-30-10, §§ 80 à 130 |
| Long terme : plus-value nette taxée au **taux de 12,8 %** (1 du I de l'article 39 quindecies du CGI), plus les prélèvements sociaux, portée sur la 2035 et la 2042-C-PRO ; moins-value nette à long terme imputable sur les plus-values nettes à long terme des **dix** exercices suivants | BOI-BNC-BASE-30-30-10, §§ 140 à 160 |
| Exonération totale ou partielle possible sous conditions, notamment des limites de recettes (article 151 septies du CGI) | BOI-BNC-BASE-30-30-30, § 20 ; BOI-BNC-BASE-30-20, § 130 |

**Choix (D79)** :
- Résultat de cession = prix de cession − valeur nette au jour de la cession (prix de revient − amortissements
  linéaires cumulés, plafond des voitures **non** déduit, § 80). Le champ « prix de cession » est le prix net des frais
  (aide à l'écran).
- Durée de détention : de la date d'**acquisition** à la date de cession ; « deux ans au moins » = cession à partir
  du même jour deux ans plus tard (29 février : le 28 février) : **point signalé**.
- Répartition : moins-value → court terme ; plus-value, détention de moins de deux ans → court terme ; deux ans au
  moins → court terme jusqu'aux amortissements déduits (amortissements cumulés × part professionnelle), le reste à
  long terme.
- Part professionnelle : appliquée au résultat pour un **véhicule** (§ 100) ; pour un autre bien affecté en partie, la
  règle n'est pas écrite dans les textes lus : résultat total affiché, répartition **à établir**. Voiture
  **plafonnée** : le texte dit que la plus-value à court terme est « majorée du montant des amortissements expressément
  exclus » : lecture incertaine avec un résultat déjà calculé sans limitation ; répartition **à établir**. Voiture dont
  la part déductible est « à établir » (§ 8) : de même.
- Exonération de l'article 151 septies : **signalée, non calculée** (seuils non relus dans cette lecture).
- Registre : sous le bien cédé, résultat et nature ; sous le tableau, synthèse de l'année (solde à court terme,
  plus-values à long terme) ; export CSV : deux colonnes de plus (court terme, long terme).

**Moteur** : `assetDisposal(asset, rules)` → `null` si pas de cession ; sinon `{ net, result, heldTwoYears,
shortTerm, longTerm, split: "ok" | "unknown", reason }` ; `assetsYear` ajoute `disposals` (court terme, long terme,
biens à établir) pour l'année.

**Tests** : moins-value (court terme, toute durée), plus-value avant deux ans (court terme), après deux ans (court
terme jusqu'aux amortissements, long terme au-delà du prix de revient), borne des deux ans (veille, jour même,
29 février), mise au rebut (prix 0), véhicule plafonné (résultat calculé sans limitation, comme dans l'exemple du
BOFiP, qui compte le prorata sur 360 jours alors que l'Espace compte les jours exacts : chiffres comparables, pas
identiques), véhicule en partie privé (× part professionnelle), bien en partie privé non véhicule (à établir),
synthèse de l'année, CSV, écran.

**Réalisation (14/11/2026)** : règle `plus_values_professionnelles` (BOI-BNC-BASE-30-30-10, 30-20 et 30-30-30) ;
moteur `assetDisposal` (réutilise `addYears` de la section Prospects : une seconde fonction du même nom, ajoutée
d'abord, était masquée par la première ; elle a été retirée), `assetsYear(…).disposals`, deux colonnes de plus au CSV ;
écran : bloc « Cession » sous le plan de la fiche (résultat, durée de détention, répartition, régime et exonération
possible sous conditions), résultat sous le bien cédé et synthèse des cessions au registre, aide du prix de cession (net des frais).
Tests : 5 tests unitaires (règle, moins-value et rebut, borne des deux ans et 29 février, véhicules et biens partiels,
synthèse et CSV) ; 18 erreurs réintroduites dans le moteur : 16 détectées, 2 portaient sur la fonction masquée (retirée) ;
une condition sans effet retirée ; parcours de l'Espace : moins-value, plus-value avant deux ans, résultat nul,
plus-value après deux ans (court et long terme), voiture plafonnée cédée, bien partiel, synthèse et CSV ; 16 erreurs
réintroduites dans l'écran, toutes détectées (4 après ajout de points au parcours, dont une phrase fautive corrigée :
« soit une ni plus-value ni moins-value ») ; parcours des comptes et du site (4 409 points) ; captures relues sur
ordinateur et mobile ; phrase sur l'exonération reformulée après relecture (« sous conditions, notamment de recettes »).

