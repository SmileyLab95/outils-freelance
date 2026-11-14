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
