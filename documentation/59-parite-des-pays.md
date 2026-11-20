# 59. Parité des pays : mêmes fonctionnalités partout

Demande d'Ismail du 18/11/2026 : « la fonctionnalité Espace est absente pour les autres pays que la France ? […] tu vas
la faire pour tous les pays, de même pour toutes les fonctionnalités ». Décision D85 : chaque pays reçoit le même niveau
de service que la France, adapté à ses règles (lues aux sources officielles, comme partout sur le site).

## 1. Inventaire au 18/11/2026

Pages publiées : France 42 (dont 3 brouillons), États-Unis 39, Royaume-Uni 39, Canada 38 en anglais et 38 en français.
La plupart des outils existent dans tous les pays, avec les règles de chacun. Les écarts :

| Fonctionnalité | France | États-Unis | Royaume-Uni | Canada (EN, FR) | Lecture |
|---|---|---|---|---|---|
| **Espace entrepreneur** (clients, devis, factures, encaissements, dépenses, temps, prospects, trésorerie, échéances, indicateurs) | Oui | Oui (publié le 20/11/2026, [60](60-espace-etats-unis.md)) | Oui (publié le 20/11/2026, [61](61-espace-royaume-uni.md)) | **Non** | Reste le Canada (§ 2) |
| **Compte gratuit** (sauvegarde chiffrée, synchronisation) | Oui (brouillon, en attente de l'hébergeur) | **Non** | **Non** | **Non** | Suit l'Espace de chaque pays |
| Mentions obligatoires d'une facture | Oui | **Non** | Oui | Oui | États-Unis : aucune règle fédérale sur le contenu d'une facture relevée à ce jour (à vérifier) ; un guide « que mettre sur une facture » reste utile, d'après les pièces que l'IRS demande de conserver |
| Calcul de la taxe de vente | Oui (TVA) | **Non** | Oui (VAT) | Oui (TPS/TVH/TVQ) | États-Unis : taxe des États et des villes, due sur certains services selon l'État ; d'abord un guide par État, d'après les sites officiels des États |
| Petites créances, tribunal | **Non** | Oui | Oui | Oui | France : injonction de payer et procédure simplifiée (étude [14](14-etude-recouvrement.md), textes à lire) |
| Contrat de sous-traitance | **Non** | Oui | Oui | Oui | France : en attente de la loi du 31/12/1975 (Légifrance illisible, D50) |
| Chômage de l'indépendant | Oui (ATI) | — | — | — | Propre à la France ; ailleurs, guides de protection sociale déjà publiés (arrêt maladie, congés) |
| Facturation électronique | Oui | — | — | — | Réforme française ; projets ou obligations des autres pays à vérifier aux sources officielles avant d'en parler |
| Acomptes trimestriels, 1099, lois locales des freelances | — | Oui | — | — | Propres aux États-Unis ; Royaume-Uni et Canada : acomptes inclus dans leurs calculateurs d'impôt |
| Making Tax Digital | — | — | Oui | — | Propre au Royaume-Uni |

« — » : la règle n'existe pas dans ce pays.

## 2. Espace entrepreneur pour les États-Unis, le Royaume-Uni et le Canada

Prévu par la spécification de l'Espace ([09](09-specification-espace.md) § 10) sans avoir été planifié ; devient le
prochain grand chantier.

**Ce qui se partage** (le cœur de l'Espace, déjà indépendant du pays) : clients, devis et factures, encaissements,
temps passé, prospects, indicateurs, trésorerie, stockage, sauvegarde, import et export, compte et synchronisation.

**Ce qui change d'un pays à l'autre** (règles à lire aux sources officielles avant le code) :

| | États-Unis | Royaume-Uni | Canada |
|---|---|---|---|
| Facture | Moteur du générateur américain (taxe de vente facultative) | Moteur britannique (VAT, mentions HMRC) | Moteur canadien (TPS/TVH, TVQ, TVP, numéros d'inscription) |
| Livre des recettes et dépenses | Catégories de l'annexe C (Schedule C) | Catégories de la déclaration *self-employment* (SA103) ; comptabilité de caisse | Catégories du formulaire T2125 |
| Impôt et cotisations | Impôt fédéral et *self-employment tax* (moteurs existants) | Impôt sur le revenu et *Class 4 NI* (moteur existant) | Impôt fédéral et provincial, RPC ou RRQ (moteurs existants) |
| Échéances | Acomptes trimestriels (1040-ES), calendrier fiscal existant | *Self Assessment*, acomptes provisionnels, MTD (mises à jour trimestrielles) | Acomptes provisionnels, déclarations de TPS/TVH et de TVQ |
| Seuils suivis | Formulaires 1099 à recevoir des clients | Seuil d'immatriculation à la VAT, seuil d'entrée dans MTD | Seuil du petit fournisseur (TPS/TVH et TVQ) |
| Langue | Anglais | Anglais | Anglais et français |

**Ordre proposé** (D85) : États-Unis d'abord (le moteur d'impôt et les acomptes existent déjà, la facture est la plus
simple), puis Royaume-Uni, puis Canada dans ses deux langues. Pour chaque pays : spécification (règles lues, sources
dans `data/rules/`), tests unitaires du moteur, parcours navigateur, captures relues, revue critique, comme pour la
France.

## 3. Autres écarts à combler

1. États-Unis : guide « que mettre sur une facture » ; guide de la taxe de vente sur les services, État par État.
2. France : guide de l'injonction de payer (dès la lecture des textes) ; contrat de sous-traitance (dès la lecture de
   la loi de 1975).
3. À chaque nouvelle fonctionnalité : la faire pour tous les pays où la règle existe, ou noter ici pourquoi elle n'a pas
   d'équivalent.
