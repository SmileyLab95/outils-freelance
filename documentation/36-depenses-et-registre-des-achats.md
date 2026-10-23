# 36. Dépenses et registre des achats (Espace entrepreneur)

Premier des modules du compte gratuit ([31](31-vision-plateforme.md) § 5, étape 5 : prospects, temps passé,
dépenses, trésorerie). Il entre dans l'**Espace entrepreneur**, public et local (D30 : les outils restent ouverts
sans compte), et se synchronise avec les comptes quand ils ouvriront. Spécification avant le code, 23/10/2026.

## 1. Règles

| Règle | Source | Usage |
|---|---|---|
| Micro-entrepreneur dont le commerce principal est de vendre des marchandises, objets, fournitures et denrées à emporter ou à consommer sur place, ou de fournir le logement : **registre récapitulé par année, présentant le détail de ses achats**, en plus du livre des recettes ; à présenter sur demande de l'administration. Les prestataires de services n'en ont pas l'obligation | CGI, art. 50-0 ; Code de commerce, art. L123-28 ; BOFiP, BOI-BIC-DECLA-30-30 | Dans l'Espace, activité « Vente de marchandises (BIC) » : la page s'appelle **Registre des achats** et le tableau de bord le rappelle ; pour les autres activités : **Dépenses**, facultatif |
| Tenue : dans l'ordre chronologique, en distinguant les règlements en espèces, avec la référence des pièces justificatives | Code de commerce, partie réglementaire (art. R123-203 et suivants, d'après les sommaires de Légifrance) | Colonnes : date, fournisseur, nature, moyen de paiement, référence de la pièce, montant ; total des achats réglés en espèces |
| En micro-entreprise, les dépenses réelles ne se déduisent pas : l'abattement forfaitaire en tient lieu | CGI, art. 50-0 et 102 ter (abattements déjà dans `micro_activities`) | Phrase d'aide sous la liste : la page sert au suivi et au registre, pas à réduire le chiffre d'affaires déclaré |
| Conservation des pièces | Règle `conservation_pieces` (déjà sourcée) | Rappel en bas de page, comme le livre des recettes |

Le registre des achats et le contenu réglementaire ont été lus par extraits de Légifrance et du BOFiP le 23/10/2026
(confiance moyenne) : à relire en entier lors de la veille de décembre.

## 2. Données

Nouvelle liste `expenses` dans l'Espace (aucune donnée envoyée sans compte) :
`{ id, date (AAAA-MM-JJ), supplier, label, amount (montant payé, TTC, en euros), method (moyens de l'Espace : virement,
carte, espèces, chèque, autre), ref (numéro de la facture du fournisseur), createdAt, updatedAt }`.

- Sauvegarde, import : la liste est facultative dans une sauvegarde (anciennes sauvegardes acceptées) ; chaque dépense
  est contrôlée (identifiant, date, montant).
- Synchronisation des comptes (`engines/espace-sync.js`) : la liste est fusionnée comme les clients (par identifiant,
  champ par champ depuis la base commune ; suppression d'un côté et modification de l'autre : conservée et signalée).
  Les comptes ne sont pas encore ouverts : aucun appareil ne tourne avec l'ancien moteur, le schéma 2 reste le même.
  **Règle pour la suite** : toute nouvelle liste ajoutée après l'ouverture des comptes changera le numéro de schéma,
  pour qu'un appareil resté sur l'ancienne version refuse de synchroniser au lieu de perdre la liste.

## 3. Écran

- Onglet **Dépenses** dans la navigation de l'Espace ; pour une activité de vente, la page s'intitule « Registre des
  achats {année} » et le bouton « + Achat ».
- En haut : année (onglets comme le livre des recettes), boutons « + Dépense », « Exporter (CSV) », « Imprimer ».
- Formulaire : date (aujourd'hui par défaut), fournisseur (obligatoire), nature, montant (obligatoire, positif), moyen
  de paiement, référence de la pièce ; « Enregistrer », « Annuler » ; modification et suppression (avec confirmation).
- Tableau chronologique ; pied : total de l'année et total réglé en espèces.
- Impression : le tableau seul, titré « Registre des achats {année} » (ou « Dépenses {année} »).
- Tableau de bord : pour une activité de vente sans achat saisi dans l'année, rappel « Registre des achats
  obligatoire » avec un lien.

## 4. Tests

- Moteur (`espace-fr.js`) : lignes de l'année triées, libellés des moyens de paiement, totaux (dont espèces), CSV ;
  obligation selon l'activité (règle) ; chaque test vérifié en réintroduisant l'erreur qu'il doit détecter.
- Stockage : sauvegarde avec et sans dépenses, dépense illisible refusée.
- Synchronisation : ajout des deux côtés, modification de champs différents, conflit sur un même champ, suppression
  d'un côté, suppression et modification ; anciennes données sans liste.
- Parcours navigateur de l'Espace : ajout, erreurs (fournisseur, montant), modification, suppression, total, CSV,
  activité de vente (titre, rappel), accessibilité, mobile.

## 5. Réalisation (23/10/2026)

- Règle `registre_achats` (`data/rules/fr.json`), moteur `espace-fr.js` (`purchasesRequired`, `expenseRows`,
  `checkExpense`, `expensesCSV`), stockage (liste facultative, contrôlée à l'import), synchronisation (`expenses`
  fusionnée comme les clients ; messages accordés : « Dépense effacée… elle est conservée »), écran « Dépenses » de
  l'Espace, rappel au tableau de bord, mention sur la page de l'Espace.
- Tests : `depenses.test.mjs` (5) et 2 tests de synchronisation ; 17 erreurs réintroduites, toutes détectées (deux
  après un renforcement des tests : ordre de saisie le même jour, dépense sans date) ; parcours navigateur de l'Espace
  (saisie, erreurs, modification, suppression, totaux, CSV, activité de vente, rappel) ; parcours des comptes ;
  captures relues (montant affiché à deux décimales à la modification, corrigé).
