# 9. Spécification : Espace entrepreneur (version 1, locale, France)

Rédigée le 20/10/2026 avant le développement, conformément à la charte qualité. Elle sert de référence au code et aux
tests ; toute évolution du périmètre est notée ici.

## 1. Objectif

Donner au micro-entrepreneur français **un espace de gestion complet et gratuit** : ses clients, ses devis, ses factures
et avoirs, ses encaissements, son livre des recettes, ses montants à déclarer à l'Urssaf, ses plafonds et ses échéances,
au même endroit.

Version 1 = **locale** : les données restent dans le navigateur de l'appareil (aucun compte, aucun serveur). Le modèle
de données est conçu pour être synchronisé tel quel avec les comptes en ligne de l'étape 2 (identifiants uniques, dates
de création et de modification, version du schéma).

## 2. Pour qui

| Profil | Besoin principal |
|---|---|
| Micro-entrepreneur qui démarre | Faire des devis et factures conformes, savoir combien déclarer et payer à l'Urssaf |
| Micro-entrepreneur installé | Suivre les impayés, tenir le livre des recettes, surveiller les plafonds et le seuil de TVA |
| Indépendant au réel ou en société | Devis, factures, avoirs et suivi des paiements (les calculs Urssaf de la micro ne s'appliquent pas) |

## 3. Périmètre

**Inclus en version 1**

- Profil de l'entreprise (une seule entreprise par navigateur).
- Clients : création, modification, archivage ; recherche.
- Documents : devis, factures, avoirs ; brouillon puis émission ; numérotation automatique conforme ; PDF par impression ;
  duplication ; conversion d'un devis en facture ; avoir à partir d'une facture.
- Encaissements : un ou plusieurs paiements par facture (date, montant, moyen) ; remboursements sur un avoir.
- Tableau de bord : chiffre d'affaires encaissé, prochaine déclaration Urssaf (montant et cotisations estimées),
  impayés et retards, plafond de la micro-entreprise, seuil de la franchise de TVA, prochaines échéances.
- Livre des recettes : tenu automatiquement à partir des encaissements, export CSV et impression.
- Échéances : calendrier fiscal filtré selon le profil.
- Sauvegarde : export et import d'un fichier, suppression de toutes les données ; reprise des informations du
  générateur de facture public.
- Relance d'une facture en retard : email prérempli.

**Exclu de la version 1** (étapes suivantes) : compte et synchronisation entre appareils, envoi des factures par la
plateforme, facture électronique (Factur-X, plateforme agréée), paiement en ligne, dépenses et justificatifs,
connexion bancaire, autres pays.

## 4. Règles métier et sources

| Règle | Application dans l'Espace | Source |
|---|---|---|
| Numérotation unique, chronologique et continue, séries possibles | Numéro attribué **à l'émission** seulement : `{préfixe}{année}-{rang sur 3 chiffres}` (F2026-001, D2026-001, A2026-001), une série par type et par année. La date d'un document émis ne peut pas être antérieure à celle du dernier document émis de la même série. | CGI, ann. II, art. 242 nonies A |
| Une facture émise ne se modifie ni ne se supprime | Document émis verrouillé ; correction par **avoir** ; suppression possible des brouillons uniquement. | Même source ; pratique administrative |
| Mentions obligatoires | Moteur commun `engines/invoice-fr.js` (le même que le générateur public). Les coordonnées de l'émetteur et du client sont **figées à l'émission**. | `data/rules/fr.json` (`mentions_obligatoires_facture`, `mention_franchise_tva`…) |
| Livre des recettes du micro-entrepreneur | Chronologique, par date d'encaissement : date, client, nature, montant, moyen de paiement, référence de la facture. | CGI, art. 50-0 et 102 ter ; `livre_recettes_micro` |
| Déclaration Urssaf sur le chiffre d'affaires encaissé | Période mensuelle ou trimestrielle selon le profil ; montant = encaissements de la période ; cotisations = montant × (taux + formation professionnelle), versement libératoire en plus si choisi ; taux ACRE pendant la période d'ACRE. Date limite lue dans le calendrier fiscal (report au jour ouvré). | `micro_activities`, `acre_conditions`, `data/calendars/fr.json` |
| Plafond de chiffre d'affaires | Encaissements de l'année civile comparés au plafond de l'activité. | `micro_activities` |
| Franchise en base de TVA | Encaissements de l'année comparés au seuil et au seuil majoré de l'activité (si le profil est en franchise). | `micro_activities`, `tva_franchise_seuils` |

Les montants sont des **estimations** : l'Espace l'indique, et renvoie vers autoentrepreneur.urssaf.fr pour la déclaration.

## 5. Modèle de données (schéma 1)

```
Espace { schema: 1, profile, clients[], documents[], settings, savedAt }

profile   { name, status, address, siret, vat, email, phone, iban, bic, logo,
            activity: "liberal_bnc" | "cipav" | "services_bic" | "artisan" | "vente" | "real",
            vatRegime: "franchise" | "simplified" | "normal", vatRate,
            periodicity: "monthly" | "quarterly", vl: bool, acre: 0 | 25 | 50, startDate,
            terms, penalty, prefixes: { facture, devis, avoir } }

client    { id, name, address, siren, vat, email, pro: bool, place: "fr" | "eu" | "world",
            delivery, notes, archived: bool, createdAt, updatedAt }

document  { id, type: "facture" | "devis" | "avoir", status, number, date, serviceDate, terms, validity,
            depositPct, nature, clientId, lines[{ desc, qty, price }],
            vat { franchise, rate, place, debits }, paid, penalty, notes,
            snapshot { me, client }   (figé à l'émission),
            payments[{ id, date, amount, method, note }],
            originId (avoir → facture), quoteId (facture → devis), invoiceId (devis → facture),
            issuedAt, createdAt, updatedAt }
```

Statuts :

- **Facture** : `draft` → `issued` ; l'état de paiement est calculé : à encaisser, en retard (échéance dépassée et
  reste dû), payée en partie, payée, annulée par avoir.
- **Devis** : `draft` → `sent` → `accepted` ou `refused` ; « facturé » quand une facture y est liée.
- **Avoir** : `draft` → `issued`. Un avoir lié à une facture est d'abord **imputé** sur ce qui reste dû. Seul le
  **trop-perçu** (facture déjà payée au-delà de son nouveau montant) est à rembourser, réparti entre les avoirs dans
  l'ordre d'émission. Un avoir ne peut pas dépasser le montant restant de sa facture. États : imputé, à rembourser, remboursé.

Ajouts de la revue de code du 20/10/2026 : montants vides conservés vides après enregistrement ; chronologie contrôlée par
date (et non par tri du numéro) ; avoir dupliqué toujours lié à sa facture ; brouillon enregistré immédiatement quand on
quitte l'écran ; brouillon en cours prioritaire sur les modifications reçues d'un autre onglet ; sauvegarde importée
contrôlée champ par champ ; durée de conservation et indemnité de 40 € lues dans `data/rules/fr.json`.

## 6. Écrans

Une seule page, `/fr/espace/`, avec une navigation par onglets (adresse `#/…` pour chaque écran, bouton retour du
navigateur fonctionnel).

| Écran | Contenu | Actions |
|---|---|---|
| Accueil (premier lancement) | Présentation, promesse de confidentialité, profil en 2 minutes | Créer mon profil ; reprendre les informations du générateur ; importer une sauvegarde |
| Tableau de bord `#/` | Encaissé cette année ; prochaine déclaration (période, montant, cotisations, date limite) ; impayés et retards ; jauges plafond et TVA ; 4 prochaines échéances ; derniers documents | Nouvelle facture, nouveau devis, nouveau client |
| Documents `#/documents` | Liste filtrable (tous, factures, devis, avoirs, brouillons, à encaisser) et recherche ; numéro, date, client, montant, statut | Ouvrir, créer |
| Document `#/documents/<id>` | Formulaire à gauche, aperçu à droite (identique au PDF) | Enregistrer, émettre, PDF, dupliquer, supprimer (brouillon), paiement, avoir, conversion du devis, accepté/refusé, relancer |
| Clients `#/clients` | Liste avec chiffre d'affaires encaissé et reste à encaisser par client | Créer, modifier, archiver, nouvelle facture pour ce client |
| Recettes `#/recettes` | Livre des recettes de l'année choisie, total | Export CSV, impression |
| Échéances `#/echeances` | Échéances des 12 prochains mois selon le profil | Lien vers le calendrier complet et l'export agenda |
| Réglages `#/reglages` | Profil, numérotation, valeurs par défaut ; sauvegarde | Enregistrer, exporter, importer, tout effacer |

## 7. Stockage, sécurité et vie privée

- Données enregistrées dans **IndexedDB** (repli sur le stockage local si IndexedDB est indisponible) ; demande de
  stockage persistant au navigateur.
- Rien n'est envoyé sur un serveur ; aucun outil de mesure ne lit ces données.
- Toutes les valeurs saisies sont **échappées** à l'affichage.
- Plusieurs onglets ouverts : les modifications d'un onglet sont reprises par les autres.
- Rappel de sauvegarde : date du dernier export affichée ; message si aucun export depuis 30 jours et au moins un
  document émis.
- Import : fichier vérifié (format, version du schéma) avant de remplacer les données, après confirmation.

## 8. Accessibilité et qualité d'interface

- Navigation entièrement au clavier, focus visible, titre de l'écran annoncé à chaque changement d'écran.
- Chaque champ a un libellé ; messages de confirmation et d'erreur annoncés (`aria-live`).
- États vides rédigés (premier client, premier document), erreurs explicites (date antérieure au dernier document
  émis, montant de paiement invalide…).
- Rendu relu sur ordinateur, tablette et mobile ; tableaux transformés en listes lisibles sur mobile.

## 9. Critères d'acceptation (tests automatiques)

| N° | Critère |
|---|---|
| A1 | Le moteur de facture commun produit les mêmes mentions que le générateur public (tests du générateur inchangés et verts). |
| A2 | Première facture émise en 2026 : numéro F2026-001 ; la suivante F2026-002 ; un devis émis reçoit D2026-001. |
| A3 | Une facture émise ne peut plus être modifiée ni supprimée ; un brouillon peut l'être. |
| A4 | Émettre un document daté avant le dernier document émis de sa série est refusé avec un message clair. |
| A5 | Un paiement partiel puis le solde font passer la facture de « à payer » à « payée partiellement » puis « payée ». |
| A6 | Le livre des recettes liste chaque encaissement par date, avec client, nature, montant, moyen, référence ; un remboursement d'avoir apparaît en négatif. |
| A7 | Déclaration : encaissements de la période et cotisations estimées exacts (taux de l'activité + formation professionnelle, ACRE et versement libératoire inclus) ; date limite issue du calendrier. |
| A8 | Jauges : plafond et seuil de TVA calculés sur les encaissements de l'année civile. |
| A9 | Un devis accepté se convertit en facture brouillon liée, avec les mêmes lignes. |
| A10 | Un avoir créé depuis une facture reprend ses lignes et cite sa référence. |
| A11 | Les données survivent au rechargement ; l'export puis l'import restituent exactement les mêmes données. |
| A12 | Aucune erreur JavaScript, aucun débordement horizontal sur ordinateur, tablette et mobile. |

## 10. Après la version 1

Comptes et synchronisation (étape 2), facture électronique et paiement en ligne (étape 3), dépenses et banque (étape 4),
Espace pour les États-Unis, le Royaume-Uni et le Canada.
