# 37. Temps passé (Espace entrepreneur)

Deuxième module du compte gratuit ([31](31-vision-plateforme.md) § 5, étape 5), dans l'**Espace entrepreneur**, public
et local (D30), synchronisé avec les comptes quand ils ouvriront. Spécification avant le code, 23/10/2026.

## 1. Besoin

Un indépendant payé au temps (à l'heure ou à la journée) doit savoir ce qu'il a travaillé pour chaque client, ce qui
reste à facturer, et transformer ce temps en facture sans rien recopier. Il veut aussi noter le temps qu'il ne facture
pas (prospection, administratif) pour connaître son taux horaire réel.

## 2. Règles

| Règle | Source | Usage |
|---|---|---|
| Chaque ligne d'une facture porte la **quantité**, la **dénomination précise** du service et son **prix unitaire hors taxes** | CGI, annexe II, art. 242 nonies A (règle `mentions_obligatoires_facture` : « Désignation précise, quantité et prix unitaire hors taxe de chaque produit ou service ») | Les lignes créées à partir du temps reprennent la tâche, la quantité et le taux ; **une ligne commencée mais incomplète (désignation, quantité ou prix manquant) bloque l'émission** (correction du moteur commun, § 6) |
| Date de la prestation : date à laquelle elle a été effectuée ou achevée | Même article (champ « Date de la prestation » déjà présent) | La facture créée prend la date de la dernière saisie reprise |
| Unité de la quantité dans la facture électronique : codes de la recommandation n° 20 de la CEE-ONU, **HUR** (heure) et **DAY** (jour) ; **C62** (unité) sinon | EN 16931, BT-130, règle BR-CL-23 ; liste des codes de Factur-X 1.09.2 (`FACTUR-X_EN16931_codedb.xml`, lue le 23/10/2026), contrôlée par le schematron EN 16931 (FX-SCH-A-000613) | Les lignes en heures ou en jours portent leur unité dans le PDF (« 1,5 h », « 2 j ») et dans le XML |

Aucune règle propre au temps passé : la page sert au suivi et à la facturation. Elle n'est pas un registre obligatoire.

## 3. Données

Nouvelle liste `timeEntries` dans l'Espace (aucune donnée envoyée sans compte) :
`{ id, date (AAAA-MM-JJ), clientId, task, unit ("hour" | "day"), quantity, rate (prix unitaire HT, facultatif),
billable (vrai par défaut), invoiceId (facture où le temps a été repris), createdAt, updatedAt }`.

- **Durée** : en heures, on peut écrire `1,5`, `1h30`, `1 h 30`, `1:30` ou `45 min` ; elle est enregistrée en heures
  décimales arrondies au centième (1 h 10 → 1,17 h). En jours : `1` ou `0,5`. Une saisie porte sur une seule date :
  24 heures ou 1 jour au plus.
- **Client** : obligatoire pour un temps facturable ; facultatif pour un temps non facturable (temps interne).
- **Tâche** : obligatoire (elle devient la désignation de la ligne de facture).
- **Taux** : prérempli par le dernier taux utilisé pour ce client et cette unité ; facultatif (le prix se saisit alors
  dans le brouillon).
- **État** (calculé, jamais enregistré) :
  - **non facturable** : `billable` faux ;
  - **à facturer** : facturable, sans facture, ou dont la facture n'existe plus (brouillon supprimé : le temps redevient
    à facturer sans rien faire) ;
  - **dans un brouillon** : repris dans une facture encore en brouillon ;
  - **facturé** : repris dans une facture émise. Une facture annulée ensuite par un avoir ne remet pas le temps à
    facturer : l'utilisateur décide de refacturer.
- Un temps **facturé** ne peut plus être modifié ni supprimé (la facture fait foi). Un temps **dans un brouillon** peut
  l'être, avec l'avertissement que la ligne du brouillon ne change pas ; il peut aussi être **retiré du brouillon**
  (il redevient à facturer ; l'utilisateur supprime la ligne dans le brouillon).
- Sauvegarde, import : liste facultative (anciennes sauvegardes acceptées), chaque temps contrôlé (identifiant, date,
  unité, durée).
- Synchronisation des comptes : liste fusionnée comme les dépenses (par identifiant, champ par champ ; suppression d'un
  côté et modification de l'autre : conservé et signalé). Comptes pas encore ouverts : schéma 2 inchangé (D34).

## 4. Écrans

### 4.1 « Temps » (`#/temps`)

- **Saisie rapide** en haut : date (aujourd'hui), client, tâche, durée et unité (heures ou jours), taux, case
  « Facturable » (cochée). Après « Ajouter », le formulaire garde la date, le client, l'unité et le taux, vide la tâche
  et la durée, recoche « Facturable » (un oubli ferait perdre du temps à facturer) et remet le curseur dans la tâche.
- **À facturer** : un bloc par client ayant du temps à facturer (toutes dates) : durée, montant (temps × taux ; « taux à
  préciser » si un temps n'a pas de taux), bouton « Facturer ».
- **Mois** : navigation « mois précédent / mois suivant » ; tableau du mois (date, client, tâche, durée, montant, état),
  le plus récent en haut, chaque ligne menant à la modification ; totaux du mois : heures, jours, part facturable,
  montant facturable ; export CSV et impression.

### 4.2 « Facturer le temps » (`#/temps/facturer?client=<id>`)

- Liste des temps à facturer du client, tous cochés ; choix des lignes : **une ligne par tâche** (par défaut : tâche,
  unité et taux identiques regroupés, avec la période « du 12/10/2026 au 16/10/2026 ») ou **une ligne par saisie**
  (« Maquettes — 12/10/2026 »).
- « Créer la facture en brouillon » : brouillon pour ce client (TVA selon le profil et le client, comme une facture
  ordinaire), date de la prestation = date de la dernière saisie cochée, lignes avec quantité, unité et prix ; les temps
  cochés sont marqués « dans un brouillon ». L'utilisateur relit et émet la facture comme d'habitude.

### 4.3 Modification d'un temps (`#/temps/<id>`)

- Mêmes champs que la saisie rapide ; « Enregistrer », « Annuler », « Supprimer » (avec confirmation) ; selon l'état :
  avertissement et « Retirer du brouillon », ou temps facturé en lecture seule avec le lien vers la facture.

### 4.4 Ailleurs

- Navigation de l'Espace : onglet **Temps**, entre Clients et Recettes.
- Tableau de bord : rappel « Temps à facturer » (montant et nombre de clients) avec un lien, s'il y en a.
- Brouillon de facture : chaque ligne a une **unité** (aucune, heure, jour) ; l'aperçu, le PDF et le Factur-X la
  reprennent.

## 5. Tests

- Moteur (`espace-fr.js`) : lecture des durées (formats acceptés et refusés, arrondi), libellés, contrôles de saisie,
  états (non facturable, à facturer, brouillon, brouillon supprimé, facturé), dernier taux, totaux du mois et à facturer
  par client, lignes de facture (par tâche et par saisie, regroupement, période, arrondis, temps sans taux), date de la
  prestation ; chaque test vérifié en réintroduisant l'erreur qu'il doit détecter.
- Moteur commun : ligne incomplète refusée à l'émission ; unité affichée ; code d'unité Factur-X (validé par le schéma,
  les schematrons EN 16931 et BR-FR, et Mustang pour le PDF).
- Stockage : sauvegarde avec et sans temps, temps illisible refusé. Synchronisation : ajout des deux côtés, suppression
  et modification croisées.
- Parcours navigateur : saisie (formats de durée, erreurs), liste du mois, facturation d'un client (brouillon créé,
  lignes, temps repris), brouillon supprimé (temps de nouveau à facturer), émission (temps verrouillé), retrait du
  brouillon, unité dans l'aperçu, rappel du tableau de bord, accessibilité, mobile.

## 6. Correction du moteur commun (trouvée en préparant ce module)

Le contrôle avant émission acceptait une facture dont **une** ligne était complète et une autre commencée sans prix :
la ligne incomplète paraissait sur le PDF sans montant, mais n'était pas dans le XML Factur-X (les deux ne
concordaient plus). Désormais, toute ligne commencée (désignation ou prix saisi) doit avoir sa désignation, sa
quantité et son prix, sinon l'émission est refusée avec le numéro de la ligne.

## 7. Réalisation (23/10/2026)

- Moteur `espace-fr.js` : `parseDuration`, `durationLabel`, `timeErrors` et `checkTime`, `timeState`, `lastRate`,
  `timeInvoiceLines`, `timeInvoice`, `timeSummary`, `unbilledByClient`, `timeCSV` ; moteur commun : unité des lignes
  (`invoice-fr.js`, `facturx-fr.js`) et contrôle des lignes incomplètes (§ 6). Stockage (liste facultative, contrôlée à
  l'import), synchronisation (`timeEntries` fusionnée comme les dépenses ; champs des conflits nommés en français, y
  compris ceux des dépenses, qui s'affichaient en anglais). Écrans « Temps », « Facturer le temps » et modification ;
  unité dans l'éditeur de brouillon ; rappel au tableau de bord ; mention sur la page de l'Espace.
- Tests : `temps.test.mjs` (12), un test des lignes incomplètes, 2 tests de synchronisation ; 38 erreurs
  réintroduites, toutes détectées (trois après un renforcement des tests : même tâche dans deux unités, arrondi du
  montant à facturer, nom d'unité hérité d'un objet, qui a révélé un contrôle trop permissif, corrigé) ; Factur-X :
  nouveau cas « temps-heures-jours », 11 factures conformes (XSD, EN 16931, BR-FR) et PDF/A-3 validés par Mustang,
  code d'unité inventé rejeté ; parcours navigateur de l'Espace (saisie, erreurs, totaux, CSV, mois précédent, rappel,
  facturation par tâche et par saisie, brouillon supprimé, retrait du brouillon, émission, temps verrouillé,
  modification, suppression, sauvegarde avec le temps, temps illisible refusé, ancienne sauvegarde acceptée,
  accessibilité, mobile) ; parcours des comptes ; suite complète : 3 358 vérifications navigateur.
- Relecture des captures : colonne « Désignation » écrasée dans l'éditeur par la nouvelle colonne « Unité », champ de
  prix trop étroit sur mobile et montants superposés dans l'aperçu « Facturer le temps » sur mobile : corrigés
  (désignation sur sa propre ligne, aperçu en trois colonnes).
