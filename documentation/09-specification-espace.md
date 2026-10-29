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
| Livre des recettes du micro-entrepreneur | Chronologique, par date d'encaissement : date, client, nature, montant, moyen de paiement, référence de la facture ; **total à la fin de chaque trimestre** (trimestre en cours signalé) **et de l'année** (ajouté le 24/10/2026). | CGI, art. 50-0 et 102 ter ; BOFiP, BOI-BIC-DECLA-30-30, § 30 ; `livre_recettes_micro` |
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
| Trésorerie `#/tresorerie` | Solde du compte, déjà dû (cotisations, TVA), disponible, prévision sur 6 mois, charges régulières ([39](39-tresorerie.md)) | Enregistrer le solde, ajouter, modifier, supprimer une charge |
| Prospects `#/prospects` | Pistes par étape, relances dues, conservation, liste d'opposition ([38](38-prospects.md)) | Créer, noter un échange, créer le client, faire un devis, ne plus contacter, exporter |
| Clients `#/clients` | Liste avec chiffre d'affaires encaissé et reste à encaisser par client | Créer, modifier, archiver, nouvelle facture pour ce client |
| Recettes `#/recettes` | Livre des recettes de l'année choisie, total de chaque trimestre et de l'année | Export CSV, impression |
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
- Règles WCAG 2.1 A et AA contrôlées par axe-core dans le parcours navigateur, sur chaque écran testé (premier
  lancement, tableau de bord, clients, saisie et émission d'un document, paiements, Factur-X, réglages avec erreur,
  livre des recettes, liste des documents, reprise du générateur, envoi, numérotation) ; la reprise, l'envoi et la
  numérotation aussi sur mobile, le tableau de bord aussi sur tablette et mobile.

## 9. Critères d'acceptation (tests automatiques)

| N° | Critère |
|---|---|
| A1 | Le moteur de facture commun produit les mêmes mentions que le générateur public (tests du générateur inchangés et verts). |
| A2 | Première facture émise en 2026 : numéro F2026-001 ; la suivante F2026-002 ; un devis émis reçoit D2026-001. |
| A3 | Une facture émise ne peut plus être modifiée ni supprimée ; un brouillon peut l'être. |
| A4 | Émettre un document daté avant le dernier document émis de sa série est refusé avec un message clair. |
| A5 | Un paiement partiel puis le solde font passer la facture de « à payer » à « payée partiellement » puis « payée ». |
| A6 | Le livre des recettes liste chaque encaissement par date, avec client, nature, montant, moyen, référence ; un remboursement d'avoir apparaît en négatif ; un total suit chaque trimestre écoulé ou en cours depuis le début de l'activité (0,00 € sans encaissement), le trimestre en cours étant signalé, puis le total de l'année. |
| A7 | Déclaration : encaissements de la période et cotisations estimées exacts (taux de l'activité + formation professionnelle, ACRE et versement libératoire inclus) ; date limite issue du calendrier. |
| A8 | Jauges : plafond et seuil de TVA calculés sur les encaissements de l'année civile. |
| A9 | Un devis accepté se convertit en facture brouillon liée, avec les mêmes lignes. |
| A10 | Un avoir créé depuis une facture reprend ses lignes et cite sa référence. |
| A11 | Les données survivent au rechargement ; l'export puis l'import restituent exactement les mêmes données. |
| A12 | Aucune erreur JavaScript, aucun débordement horizontal sur ordinateur, tablette et mobile. |

## 10. Après la version 1

Comptes et synchronisation (étape 2), facture électronique et paiement en ligne (étape 3), dépenses et banque (étape 4),
Espace pour les États-Unis, le Royaume-Uni et le Canada.

## 11. Version 1.1 : envoi par email, passage depuis le générateur, reprise de numérotation

Rédigée le 20/10/2026 avant le développement. Objectif : rendre l'Espace utilisable par celui qui facture déjà avec le
générateur public, sans casser sa numérotation, et faciliter l'envoi des documents.

### 11.1 Envoyer un document par email

- Sur chaque document émis (facture, devis, avoir) : carte « Envoyer au client » avec deux étapes : télécharger le PDF,
  puis écrire l'email (lien `mailto:` prérempli : destinataire, objet, texte).
- Un lien `mailto:` ne peut pas joindre de fichier : l'écran le dit (« joignez le PDF téléchargé »).
- Destinataire : email de la fiche client actuelle (sinon celui figé à l'émission) ; s'il manque, lien vers la fiche
  client pour l'ajouter.
- Textes (moteur `espace-fr.js`, testé) :
  - **facture** : numéro, date, montant (« TTC » si la TVA s'applique), échéance (« à réception » si délai nul) ; reste
    dû si un paiement ou un avoir a déjà réduit la facture ; « déjà réglée » si elle est soldée ; IBAN et référence à
    indiquer quand il reste un montant dû ;
  - **devis** : numéro, date, montant, date de fin de validité, acompte demandé à la signature, mention à porter pour
    l'accepter (la même que sur le devis) ;
  - **avoir** : numéro, date, montant, facture d'origine ; montant à rembourser, ou déduction de la facture et nouveau
    reste dû ;
  - **relance** : le texte de la version 1, déplacé dans le moteur.
- Signature : nom du profil. Aucun texte ne promet un envoi : c'est la messagerie de l'utilisateur qui envoie.

### 11.2 Du générateur public vers l'Espace

- Bouton « Continuer dans mon Espace » sous l'aperçu du générateur. Il dépose le document en cours dans le stockage
  local du navigateur (clé `of:espace-import`, aussi au clic du milieu et au menu contextuel) et ouvre
  `/fr/espace/#/importer`. Sans JavaScript, le lien ouvre l'Espace. Un dépôt de plus de 24 heures est ignoré et effacé.
- Écran `#/importer` :
  - sans profil : écran d'accueil (profil prérempli avec les coordonnées du générateur), puis reprise du document ;
  - avec profil : récapitulatif (type, client, lignes, total) et avertissement : le document devient un **brouillon** et
    reçoit son numéro à l'émission ; **s'il a déjà été envoyé au client depuis le générateur, il ne doit pas être émis
    une seconde fois** (une même vente n'est facturée qu'une fois) ;
  - client : fiche existante du même nom (sans tenir compte des majuscules ni des espaces) si elle existe, sinon nouvelle
    fiche (nom, adresse, SIREN, TVA, adresse de livraison, professionnel, pays) ; une fiche existante n'est pas modifiée ;
  - coordonnées de l'entreprise : seuls les champs **vides** du profil sont complétés par ceux du générateur ;
  - l'acompte déjà versé du générateur n'est pas repris comme montant : l'écran invite à l'enregistrer comme encaissement
    après l'émission ;
  - boutons « Créer le brouillon » et « Ne pas reprendre » ; dans les deux cas, le dépôt est effacé.
- Aucun dépôt : message et lien vers le générateur.

### 11.3 Reprendre une numérotation existante

Règle : la numérotation doit rester **unique, chronologique et continue** (CGI, ann. II, art. 242 nonies A). Celui qui a
déjà émis des factures ailleurs (générateur, autre logiciel) doit pouvoir **continuer sa séquence** plutôt que d'en
recommencer une.

- Réglages : pour chaque type, « dernier numéro déjà utilisé en <année> » (entier, facultatif), avec l'aperçu du prochain
  numéro. Stocké dans `profile.numbering = { facture: { year, last }, devis: …, avoir: … }` (champ facultatif, schéma 1
  inchangé).
- Prochain numéro = préfixe + année + rang, où rang = 1 + le plus grand entre le rang le plus élevé déjà émis dans
  l'Espace et le dernier numéro déclaré pour l'année.
- **Une série commencée garde son préfixe** (celui de son dernier document émis) jusqu'à la fin de l'année, même si le
  préfixe change dans les réglages ou lors d'une reprise : le nouveau préfixe vaut pour les séries suivantes. Une
  facture de décembre émise en janvier reçoit donc bien le numéro suivant de la série de décembre.
- Le dernier numéro déclaré n'est plus modifiable une fois la série de l'année commencée dans l'Espace (pas de trou).
- Reprise depuis le générateur : si son numéro a la forme `<préfixe><année>-<rang>` (ex. `2026-007`, `D-2026-003`), que
  l'année est celle du document **et l'année en cours**, qu'aucun document de ce type n'est encore émis cette année dans
  l'Espace et que le préfixe n'est pas celui d'un autre type, l'écran propose (case cochée) de **continuer cette
  numérotation** : préfixe repris, dernier numéro = rang − 1, de sorte que le document reçoive le numéro affiché dans le
  générateur.
- Réglages : préfixes différents pour les factures, les devis et les avoirs ; lettres, tirets (- ou _) ou barres
  obliques (12 caractères au plus), seuls caractères admis avec les chiffres dans le numéro d'une facture électronique
  (règle BR-FR-02 de la norme XP Z12-012).

### 11.4 Raccourcis depuis les outils publics

Encart « Espace entrepreneur » sur les outils qui y mènent naturellement : simulateur auto-entrepreneur (déclaration
estimée), calendrier fiscal (échéances selon le profil), relance de facture impayée (suivi des retards), mentions
obligatoires (factures conformes et numérotées). Texte factuel, sans promesse au-delà de ce que fait la version locale.

### 11.5 Critères d'acceptation

| N° | Critère |
|---|---|
| A13 | Les textes d'email (facture à payer, en partie payée, soldée ; devis avec acompte ; avoir imputé et à rembourser ; relance) contiennent le numéro, la date, le bon montant et la bonne échéance. |
| A14 | Le bouton du générateur ouvre l'Espace et le document repris devient un brouillon avec les mêmes lignes, le même client, la même TVA et les mêmes conditions. |
| A15 | Le client repris est rattaché à la fiche existante du même nom, ou créé ; un profil existant n'est complété que sur ses champs vides. |
| A16 | Numérotation continuée : générateur à `2026-007` → la facture émise reçoit `2026-007`, la suivante `2026-008`. |
| A17 | Réglage « dernier numéro utilisé » = 12 → prochaine facture `F2026-013` ; un rang déjà émis plus élevé l'emporte. |
| A18 | Sans profil, le passage par l'accueil reprend ensuite le document ; « Ne pas reprendre » efface le dépôt ; un dépôt de plus de 24 heures est ignoré. |
| A19 | Une série commencée garde son préfixe : changer le préfixe en cours d'année n'a d'effet que sur la série suivante. |

Ajouts de la revue de code du 20/10/2026 (v1.1) : série commencée qui garde son préfixe (A19) ; reprise de
numérotation limitée à l'année en cours ; boutons protégés contre le double clic ; dépôt du générateur limité à
24 heures ; mention d'acceptation du devis partagée entre le devis et l'email ; numéro affiché à la confirmation
d'émission identique au numéro attribué. Mention de paiement corrigée dans le moteur commun : « au plus tard le … »,
ou « à réception » si le délai est nul (au lieu de « à réception, au plus tard le … »).

## 12. Facture électronique (Factur-X)

Rédigée le 20/10/2026 à partir de l'[étude](10-etude-factur-x.md), dont elle reprend les règles.

- Sur chaque **facture ou avoir émis à un client professionnel** : carte « Facture électronique (Factur-X) » avec deux
  boutons : le fichier Factur-X (PDF/A-3 lisible avec `factur-x.xml` joint) et les données seules (XML CII).
- Le moteur PDF (environ 100 Ko) n'est chargé qu'au premier export (`lazy_scripts` de la page).
- Avant l'export, contrôle des données (`OFE.facturxFR.check`) : SIRET du vendeur, SIREN du client en France, adresses
  avec code postal et ville, pays et email d'un client à l'étranger, numéros de TVA en autoliquidation. Les manques
  sont listés avec des liens vers le profil et la fiche client.
- Les coordonnées restent celles **figées à l'émission** ; seuls les identifiants manquants (SIRET, SIREN, pays, email,
  adresses électroniques, adresse avec code postal et ville) sont complétés depuis le profil et la fiche client
  actuels, et l'écran l'indique. Les montants, les lignes et les noms ne changent jamais.
- Données nouvelles, facultatives : pays du client hors de France (liste ISO 3166, noms en français) ; adresse de
  facturation électronique du profil et des clients (par défaut le SIREN ; sinon elle commence par le SIREN, lettres,
  chiffres, - _ . seulement). Elles sont figées à l'émission avec les autres coordonnées.
- Logo : converti en JPEG sur fond blanc (480 × 240 pixels au plus) pour le PDF.
- Caractères absents de la police incorporée : remplacés par la lettre sans accent ou « ? », et signalés à l'écran.

| N° | Critère |
|---|---|
| A20 | Données manquantes listées avec des liens ; une fois les fiches complétées, l'export réussit et l'écran signale les identifiants complétés. |
| A21 | Le fichier produit dans le navigateur est conforme : XSD et schematrons EN 16931 et BR-FR, PDF/A-3 et Factur-X validés par Mustang (veraPDF). |
| A22 | Le XML seul est identique au XML joint au PDF ; le nom des fichiers reprend le numéro (`F2026-001-factur-x.pdf`). |
| A23 | Une adresse de facturation électronique qui ne commence pas par le SIREN est refusée dans le profil et la fiche client. |

## Modules ajoutés depuis la v1.1

- **Dépenses et registre des achats** (23/10/2026) : [36](36-depenses-et-registre-des-achats.md).
- **Temps passé** (23/10/2026) : [37](37-temps-passe.md) ; lignes de facture avec unité (heure, jour).
