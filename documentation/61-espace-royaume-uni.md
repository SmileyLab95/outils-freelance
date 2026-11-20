# 61. Espace entrepreneur pour le Royaume-Uni (« My workspace »)

Spécification rédigée le 20/11/2026 avant le développement (parité des pays, D85, [59](59-parite-des-pays.md) § 2 ;
décision D97). Public : *sole traders* (entrepreneurs individuels) qui déclarent leur activité dans la partie
*self-employment* de la déclaration *Self Assessment* (SA103S, version courte, ou SA103F) et, à partir du 6 avril 2026,
dans les mises à jour trimestrielles de *Making Tax Digital for Income Tax* au-delà du seuil. Référence : l'Espace
américain ([60](60-espace-etats-unis.md)), dont on reprend toute l'architecture (cœur commun, module du pays, textes par
langue et par pays, branchements, adresses dans la langue de la section).

## 1. Règles

### 1.1 Déjà lues aux sources officielles (dans `data/rules/uk.json`)

| Sujet | Règle | Clé |
|---|---|---|
| Comptabilité de caisse | Par défaut depuis 2024/25 pour les *sole traders*, sans plafond de chiffre d'affaires ; l'engagement est une option | `cash_basis_default` |
| Année fiscale | Du 6 avril au 5 avril | `tax_year_start`, `tax_year_end` |
| Facture | Numéro unique, nom, adresse et coordonnées du fournisseur, nom et adresse du client, description, date de la prestation, date de la facture, montants, VAT le cas échéant, total ; *sole trader* : son nom, le nom commercial utilisé et, dans ce cas, une adresse où recevoir les actes | `invoice_requirements_all`, `invoice_requirements_sole_trader` |
| Retard de paiement entre entreprises | Intérêts légaux : taux de référence de la Banque d'Angleterre + 8 points ; indemnité fixe de 40, 70 ou 100 £ selon le montant ; délai par défaut de 30 jours | `late_payment_*` |
| Impôt et cotisations | Income tax (Angleterre, pays de Galles, Irlande du Nord ; Écosse), Class 4 NI, Class 2 (statut actuel) ; moteur `engines/tax-uk.js` du calculateur public | `personal_allowance`, `income_tax_bands_*`, `class4_*`, `class2_*` |
| Acomptes provisionnels | 31 janvier et 31 juillet, la moitié de l'impôt de l'année précédente chacun ; pas d'acompte sous 1 000 £ ou si 80 % de l'impôt est déjà prélevé à la source ; solde au 31 janvier | `payments_on_account_*`, `sa_balancing_payment_deadline` |
| Making Tax Digital for Income Tax | Seuils de revenus éligibles de 50 000 £ (dès avril 2026), 30 000 £ (2027), 20 000 £ (2028) ; mises à jour trimestrielles aux dates sourcées ; pénalités | `mtd_itsa_*` |
| VAT | Seuil d'immatriculation de 90 000 £ ; taux ; règles de facture de VAT | `vat_*` |
| Franchise de recettes | *Trading allowance* de 1 000 £ | `trading_allowance` |
| Conservation des pièces | Au moins 5 ans après la date limite de dépôt (31 janvier) | `uk_records_retention` |
| Bureau à domicile, kilomètres | Forfaits *use of home* et *simplified mileage* | `use_of_home_flat_rates`, `simplified_mileage_*` |
| Échéances | Calendrier fiscal britannique existant (`data/calendars/uk.json` : Self Assessment, acomptes, MTD, VAT) | — |

### 1.2 À lire avant le moteur (étape 1)

1. **Catégories de dépenses** du formulaire SA103S (et SA103F) de l'année en cours et de leurs notes : intitulés exacts
   des cases (*cost of goods*, *car, van and travel*, *wages*, *rent, rates, power and insurance*, *repairs*, *phone,
   fax, stationery and other office costs*, *advertising*, *interest*, *other finance charges*, *irrecoverable debts*,
   *accountancy, legal and other professional fees*, *other allowable business expenses*…), ce qui va dans chacune, et
   la case de dépenses totales du formulaire court.
2. **Mises à jour trimestrielles** de Making Tax Digital : périodes (6 avril–5 juillet…), catégories demandées
   (mêmes que le SA103F ?), ce qu'un logiciel doit faire (registres numériques) — sans prétendre à la compatibilité :
   l'Espace n'envoie rien à HMRC.
3. **Registres** : *Business records if you're self-employed* (gov.uk) : ce qu'il faut garder, combien de temps.
4. **Prospection** : règles PECR de l'ICO (emails et SMS à des particuliers et à des entreprises, *soft opt-in*,
   TPS et CTPS pour les appels) ; durée de conservation des données des prospects (UK GDPR, pas de durée fixée ?).
5. **Revenu éligible de MTD** : définition (*qualifying income* : revenus bruts d'activité et fonciers de l'année de
   référence) pour dire si l'utilisateur est concerné.

## 2. Périmètre de la version 1

**Repris de l'Espace commun** : profil, clients, devis (*quotes*), factures (moteur et paramètres du générateur
britannique : aperçu identique), avoirs (*credit notes*), encaissements, relances par email, temps passé, prospects,
indicateurs, trésorerie, échéances, sauvegarde, adresses en anglais.

**Propre au Royaume-Uni** :

1. **Livre des recettes** en comptabilité de caisse, par **année fiscale** (6 avril–5 avril) et par trimestre de MTD.
2. **Dépenses** rangées par catégorie du SA103 (intitulés et aide lus au § 1.2), totaux par catégorie.
3. **Synthèse *self-employment*** de l'année fiscale : chiffre d'affaires, autres recettes, dépenses par catégorie,
   bénéfice ; export CSV ; présentée comme une aide à la préparation, pas comme une déclaration.
4. **Impôt estimé** : income tax et Class 4 NI du calculateur public (même moteur, même résultat), acomptes
   provisionnels de janvier et juillet et solde ; région (Écosse ou reste du Royaume-Uni) dans le profil.
5. **Making Tax Digital** : l'Espace dit si l'utilisateur est concerné (revenu éligible déclaré ou estimé face au seuil
   de l'année), affiche les trimestres et leurs dates limites, et les totaux du trimestre par catégorie ; il n'envoie
   rien à HMRC (pas un logiciel compatible) et le dit.
6. **Seuil de VAT** : chiffre d'affaires des 12 derniers mois glissants face au seuil, avec l'alerte d'approche.
7. **Retards de paiement** : intérêts légaux et indemnité fixe proposés dans la relance d'un client professionnel
   (calcul du calculateur public existant).
8. **Échéances** : calendrier britannique existant, filtré par le profil (MTD, acomptes, VAT).

**Hors version 1** (dit à l'écran) : comptabilité d'engagement, VAT des entreprises immatriculées (déclarations,
*flat rate scheme*), *capital allowances*, sociétés (*limited companies*) et associations (*partnerships*), revenus
fonciers, prêts étudiants, envoi à HMRC.

## 3. Architecture

Comme les États-Unis (D88 à D96) : `engines/espace-uk.js` (fabrique `create(textes)` sur le cœur commun : livre et
périodes par année fiscale, dépenses par catégorie, synthèse, impôt estimé et acomptes, MTD, seuil de VAT, prévision,
déjà dû, courriels) ; `tools/espace-uk-ui.js` (crochets du module : profil, client, document, tableau de bord, écrans,
échéances, trésorerie, prospects, adresses) ; textes `tools/espace-uk-texts-en.js` ; variante régionale des textes
communs `tools/espace-texts-en-GB.js` pour ce qui change en anglais britannique (*quote* au lieu de *estimate*,
orthographe) ; paramètres de facture du générateur britannique dans `data/invoice-profiles/uk.json` (une seule source) ;
page en brouillon `/uk/workspace/` puis publication. Le cœur a des périodes en année civile : l'année fiscale
britannique est fournie par le pays (périodes et libellés), sans changer la France ni les États-Unis.

## 4. Critères d'acceptation

| N° | Critère |
|---|---|
| K1 | Parcours de l'Espace français et américain identiques. |
| K2 | Une facture britannique émise dans l'Espace a le même aperçu et les mêmes totaux que le générateur public. |
| K3 | Un encaissement compte dans l'année fiscale (6 avril–5 avril) de sa date de réception ; une facture impayée ne compte pas. |
| K4 | Chaque dépense a une catégorie du SA103 ; la synthèse additionne exactement les dépenses de l'année par catégorie ; export CSV identique à l'écran. |
| K5 | L'impôt et les acomptes affichés sont ceux du calculateur public pour les mêmes données. |
| K6 | MTD : concerné ou non selon le seuil de l'année ; trimestres et dates limites des règles. |
| K7 | Seuil de VAT : chiffre d'affaires glissant sur 12 mois exact, alerte au-delà du seuil. |
| K8 | Aucune erreur JavaScript, aucun texte manquant ni américain là où l'anglais britannique diffère, aucun débordement, accessibilité AA, trois largeurs. |

## 5. Étapes

1. **Lectures** (§ 1.2), règles nouvelles dans `data/rules/uk.json`.
2. **Moteur** `engines/espace-uk.js` et ses tests (K3 à K7), dont l'année fiscale fournie au cœur.
3. **Module d'écrans**, textes, variante en-GB, page en brouillon, parcours navigateur (K2, K8).
4. **Publication** : page, menu, en-tête, encarts, vitrine (comme D96).

### Avancement

- **20/11/2026** : spécification (D97) ; premières lectures faites (§ 6), règle `uk_sa103s_boxes`.

## 6. Lectures

- **Formulaire SA103S 2026** (année fiscale 2025-26, « HMRC 12/25 », page de publication mise à jour le 6 avril 2026),
  lu en entier le 20/11/2026 par l'action `lire-source` (SHA-256 556bb1d4…) : recettes en cases 9 (*turnover*) et 10
  (autres recettes), *trading income allowance* en case 10.1 ; dépenses en cases 11 à 19 (intitulés exacts dans la
  règle `uk_sa103s_boxes`), total en case 20 ; bénéfice net en case 21 (cases 9 + 10 − 20), perte en case 22 ;
  version courte pour un chiffre d'affaires annuel inférieur à 90 000 £. Le formulaire 2027 (année 2026-27) n'est pas
  encore publié : l'Espace reprendra les intitulés de 2026 et le dira, jusqu'à sa publication.
- **Notes du SA103S 2026**, lues le 20/11/2026 (recherches ciblées) : au-dessous de 90 000 £, le total des dépenses
  peut aller seul en case 20 ; avec la *trading income allowance* (jusqu'à 1 000 £), aucune dépense n'est déduite et
  elle ne peut pas créer de perte ; pages complètes (SA103F) à partir de 90 000 £ ; le détail des dépenses admises est
  dans la fiche HS222 (**à lire** : aide de chaque catégorie, comme l'aide des lignes américaines).
- **Business records if you're self-employed** (gov.uk), lu le 20/11/2026 : comptabilité de caisse par défaut depuis
  2024-25 (« you only record income or expenses when you receive money or pay a bill ») ; exemple officiel : facture du
  15 mars 2024 payée le 30 avril 2024, recette de l'année fiscale 2024-25 (critère K3) ; sans comptes annuels, recettes
  et dépenses s'enregistrent par année fiscale (6 avril–5 avril). Page « What records to keep » **à lire**.
- **À lire ensuite** : HS222 ; catégories et périodes des mises à jour trimestrielles de MTD ; définition du revenu
  éligible de MTD ; règles PECR de l'ICO (prospection) ; page « What records to keep ».
