# 10. Étude : export Factur-X depuis l'Espace entrepreneur

Rédigée le 20/10/2026, avant tout développement (charte qualité). Elle fixe ce que l'export doit produire, comment le
vérifier, et dans quel ordre le construire. Les points marqués **à vérifier** doivent être confirmés au texte officiel
avant d'être codés.

## 1. Le cadre

| Point | Ce qu'on retient | Source |
|---|---|---|
| Calendrier | Réception des factures électroniques obligatoire pour toutes les entreprises depuis le 1er septembre 2026 ; émission obligatoire pour les PME et micro-entreprises au 1er septembre 2027, par une plateforme agréée. | DGFiP, *Facturation électronique : guide pratique de démarrage au 1er septembre 2026* (impots.gouv.fr) |
| PDF simple | Un PDF envoyé par email n'est pas une facture électronique au sens de la réforme. | DGFiP, FAQ « Je découvre la facturation électronique » |
| Formats du socle | Trois formats : UBL, CII et Factur-X, chacun avec deux profils de données : EN16931 et EXTENDED-CTC-FR. | Norme AFNOR XP Z12-012 (mai 2025), publiée sur impots.gouv.fr |
| Factur-X | Format mixte : un PDF/A-3 lisible qui contient le fichier XML structuré `factur-x.xml` (syntaxe UN/CEFACT CII), déclaré dans les métadonnées XMP. Cinq profils : MINIMUM, BASIC WL, BASIC, EN 16931, EXTENDED. | FNFE-MPE ; fichiers officiels de la version **1.09.2** (publiée le 04/08/2026, en vigueur le 01/09/2026), distribués avec la bibliothèque de référence `factur-x` 7.7 |
| Règles françaises | Contrôles « BR-FR » (schematron « Flux 2 ») appliqués aux factures échangées entre plateformes. | Fichier `BR-FR-Flux2-Schematron-CII.xslt` de la même distribution |
| Positionnement | La plateforme sera une « solution compatible », pas une plateforme agréée. | Décision D9 |

Conséquence : **l'Espace ne transmettra pas de factures électroniques**. Il peut produire un fichier Factur-X conforme
au profil EN 16931 et aux règles françaises, que l'utilisateur dépose sur la plateforme agréée de son choix (selon les
services qu'elle propose) ou garde dans ses archives. L'écran le dira clairement, sans promettre plus.

## 2. Règles françaises qui concernent nos factures

Lues dans le schematron BR-FR (liste non exhaustive ; le test automatique appliquera **toutes** les règles) :

| Règle | Exigence | Effet sur l'Espace |
|---|---|---|
| BR-FR-01, 02 | Numéro de facture : 35 caractères au plus ; lettres, chiffres et `+ - _ /` uniquement, sans espace. | Préfixes limités en conséquence (fait en v1.1). |
| BR-FR-03 | Dates entre 2000 et 2099. | Déjà contrôlé. |
| BR-FR-04 | Types de document autorisés (380 facture, 381 avoir…). | 380 et 381. |
| BR-FR-05, 06 | Notes obligatoires, une seule fois chacune : indemnité forfaitaire de recouvrement (PMT), pénalités de retard (PMD), escompte ou absence d'escompte (AAB). | Reprises des mentions du moteur de facture. |
| BR-FR-08 | Cadre de facturation (BT-23) obligatoire : B1, S1, M1, B2… | **À vérifier** : signification exacte de chaque code dans XP Z12-012 (B = biens, S = services, M = mixte ; 1 = facture simple ; 2 = déjà payée ; 4 = définitive après acompte…). |
| BR-FR-09, 10 | SIRET de 14 chiffres commençant par le SIREN ; SIREN du vendeur obligatoire (9 chiffres). | Contrôle du SIRET dans le profil avant l'export. |
| BR-FR-11, 31 | Note « BAR » (B2B, B2BINT, B2C…) ; si B2B, SIREN de l'acheteur obligatoire. | Client professionnel en France : B2B et SIREN exigé ; client de l'UE ou hors UE : B2BINT. |
| BR-FR-12, 13 | Adresse électronique de l'acheteur (BT-49) et du vendeur (BT-34) obligatoires. | **À vérifier** : forme de l'adresse dans l'annuaire (SIREN seul, ou SIREN suivi d'un suffixe). Champ à ajouter au profil et au client. |
| BR-FR-15, 16 | Catégories de TVA S, E, AE, K, G, O, Z ; taux autorisés. | Franchise : catégorie E avec le motif VATEX-FR-FRANCHISE (**à vérifier**, une règle de correspondance BR-FR-MAP-08 semble dire autre chose) ; autoliquidation UE : AE ; hors UE : **à vérifier** (G ou O). |
| BR-FR-CO-05 | Avoir : référence à la facture d'origine (BT-25) avec sa date (BT-26). | Déjà dans le modèle (`origin`). |
| BR-FR-CO-07 | Échéance postérieure ou égale à la date de facture. | Toujours vrai dans l'Espace. |
| BR-FR-DEC-01 à 04 | Montants : 2 décimales et un point ; quantités : 4 décimales ; prix : 6 décimales ; taux : 2 décimales. | Formatage du moteur XML. |

## 3. Ce qui manque au modèle de données

| Donnée | Pourquoi | Proposition |
|---|---|---|
| Adresse structurée (ligne, code postal, ville, **pays**) du vendeur et du client | Le code pays du vendeur (BT-40) et de l'acheteur (BT-55) est obligatoire dans EN 16931 ; l'adresse est aujourd'hui un texte libre. | Champs code postal, ville et pays dans le profil et la fiche client, préremplis en lisant la dernière ligne de l'adresse actuelle (« 69002 Lyon »), modifiables. |
| SIREN séparé du SIRET | BT-30 (SIREN) et contrôle BR-FR-09. | Calculé à partir du SIRET (9 premiers chiffres), avec contrôle de forme (et de la clé de Luhn **à vérifier**). |
| Adresses électroniques (annuaire) | BR-FR-12 et 13. | Champ facultatif, prérempli avec le SIREN si l'annuaire l'admet (**à vérifier**). |
| Unité des lignes | BT-130 obligatoire. | Code « C62 » (unité) par défaut ; heure (HUR) et jour (DAY) en option plus tard. |

Le schéma reste en version 1 : ces champs sont facultatifs et complétés au premier export.

## 4. Choix techniques

- **XML** : moteur pur `engines/facturx-fr.js` (CII D22B, profil EN 16931, règles BR-FR), même principe que les autres
  moteurs : testé sous Node, utilisé dans le navigateur.
- **PDF/A-3** : produit dans le navigateur avec `pdf-lib` 1.17.1 (licence MIT) et `@pdf-lib/fontkit` (MIT), copiés
  dans le site et chargés **seulement au moment de l'export**. Exigences : polices incorporées (Inter, licence OFL),
  profil de couleur sRGB (OutputIntent), métadonnées XMP (`pdfaid` partie 3, niveau B, et schéma d'extension
  Factur-X : `DocumentFileName` = `factur-x.xml`, `DocumentType` = `INVOICE`, `ConformanceLevel` = `EN 16931`),
  fichier joint `factur-x.xml` déclaré dans `/AF` avec la relation `Alternative` (**à vérifier** dans la
  spécification 1.09 pour le profil EN 16931), aucune transparence ni script.
- **Mise en page** : le PDF reprend la présentation de la page imprimable actuelle (même moteur de mentions), dessinée
  directement (texte, filets, tableau des lignes avec retour à la ligne, logo PNG ou JPEG).

## 5. Vérification (définition de « terminé »)

| Contrôle | Outil | Critère |
|---|---|---|
| Structure XML | XSD officiels Factur-X 1.09.2 EN 16931 (avec `lxml`) | Aucune erreur |
| Règles EN 16931 | Schematron officiel `FACTUR-X_EN16931.xslt` (XSLT 2.0, avec `saxonche`) | Aucune erreur |
| Règles françaises | Schematron `BR-FR-Flux2-Schematron-CII.xslt` | Aucune erreur |
| PDF/A-3 et Factur-X complet | veraPDF, ou Mustang (validateur Factur-X de référence, sur Maven Central) | Conforme PDF/A-3B, XML trouvé et valide |
| Rendu | Conversion du PDF en image et relecture | Identique à la page imprimable |
| Jeu d'essai | Franchise, TVA à 20 %, autoliquidation UE, client hors UE, avoir, acompte, plusieurs lignes, accents et caractères spéciaux, logo | Tous conformes |

Les outils de contrôle ne sont pas publiés avec le site : ils servent aux tests (`tests/facturx/`).

## 6. Étapes proposées

| Étape | Contenu | Résultat |
|---|---|---|
| F1 | Lever les points « à vérifier » (XP Z12-012 : codes BT-23, adresses électroniques, catégories de TVA, relation du fichier joint) | Section 2 complétée avec les sources |
| F2 | Modèle : adresse structurée, SIREN, adresse électronique ; formulaires et reprise des données existantes | Profil et clients prêts |
| F3 | Moteur XML et sa chaîne de validation (XSD + 2 schematrons) sur le jeu d'essai | XML conforme |
| F4 | PDF/A-3 dans le navigateur, XML joint, métadonnées ; validation veraPDF ou Mustang | Factur-X conforme |
| F5 | Bouton « Facture électronique (Factur-X) » sur les factures et avoirs émis à un client professionnel ; texte d'aide | Fonction publiée |

## 7. Limites et prudence

- Le fichier ne remplace pas l'émission par une plateforme agréée à partir de la date d'obligation de l'entreprise.
- Pas d'export pour les clients particuliers : ces ventes relèvent de l'e-reporting, transmis par la plateforme agréée.
- Les règles évoluent (Factur-X 1.08 en janvier 2026, 1.09 en septembre 2026) : la veille de juin et décembre
  vérifie la version en vigueur, et les tests échouent si les fichiers officiels changent sans mise à jour.
