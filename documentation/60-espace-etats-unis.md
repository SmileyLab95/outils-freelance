# 60. Espace entrepreneur pour les États-Unis (« My workspace »)

Spécification rédigée le 18/11/2026 avant le développement (parité des pays, D85, [59](59-parite-des-pays.md) § 2).
Public : *sole proprietors* et LLC à un seul associé non imposées comme une société (*disregarded entity*), qui
déclarent leur activité sur l'annexe C (*Schedule C*). Référence : l'Espace français ([09](09-specification-espace.md)
et ses suites), dont on reprend tout ce qui ne dépend pas du pays.

## 1. Règles lues aux sources officielles

| Sujet | Règle | Source (lue le) | Dans `data/rules/us.json` |
|---|---|---|---|
| Lignes de dépenses | Annexe C 2026, partie II : 8 *Advertising*, 9 *Car and truck expenses*, 10 *Commissions and fees*, 11 *Contract labor*, 12 *Depletion*, 13 *Depreciation and section 179 expense deduction*, 14 *Employee benefit programs*, 15 *Insurance (other than health)*, 16a *Mortgage interest*, 16b *Vehicle loan interest*, 16c *Other interest*, 17 *Legal and professional services*, 18 *Office expense*, 19 *Pension and profit-sharing plans*, 20a *Rent or lease: vehicles, machinery, and equipment*, 20b *Rent or lease: other business property*, 21 *Repairs and maintenance*, 22 *Supplies*, 23 *Taxes and licenses*, 24a *Travel*, 24b *Deductible meals*, 25 *Utilities*, 26 *Wages*, 27a *Energy efficient commercial buildings deduction*, 27b *Other expenses* (partie V) ; le bureau à domicile va **seulement** en ligne 30 | Formulaire Schedule C (Form 1040) 2026, irs.gov, lu en entier le 18/11/2026 (SHA-256 cc44e7d1…) | `us_schedule_c_expense_lines` (nouvelle) |
| Recettes | Ligne 1 *Gross receipts or sales*, ligne 2 *Returns and allowances* | Même formulaire | idem |
| Comptabilité de caisse | « Under the cash method, you generally report income in the tax year you receive it, and deduct expenses in the tax year in which you pay the expenses » ; recettes et dépenses à la même méthode | Publication 538 (révisée en janvier 2022), lue le 18/11/2026 | `us_cash_method` (nouvelle) |
| Impôt des indépendants, impôt fédéral, QBI | Taux, barèmes, plafonds 2026 | Déjà sourcés (SSA, IRS, Rev. Proc. 2025-32) | `se_tax_*`, `federal_brackets_*`, `qbi_*` |
| Acomptes trimestriels | 15/04, 15/06, 15/09/2026, 15/01/2027 ; seuil de 1 000 $ ; *safe harbor* 90 % / 100 % / 110 % | Form 1040-ES, déjà sourcé | `estimated_tax_*` |
| Formulaires 1099 | 1099-NEC déposé **par le client** (payeur) pour 2 000 $ ou plus versés en 2026 (600 $ avant) ; à remettre au plus tard le 01/02/2027 ; paiements par carte et plateformes : 1099-K (plus de 20 000 $ et plus de 200 opérations) ; le revenu est imposable avec ou sans 1099 | Instructions 1099-MISC/NEC, FAQ 1099-K, déjà sourcées | `form_1099_*` |
| Conservation des pièces | En général 3 ans après le dépôt de la déclaration (plus long dans certains cas) | Topic 305, Publication 583, déjà sourcés | `us_records_retention` |
| Aide de chaque ligne | Ce qui va sur les lignes 1, 2, 6, 11, 17, 18, 22, 23, 24a, 24b, 25, 27b (partie V) et 30, condensé des instructions ; ligne 27b : pas d'équipement ni de mobilier, pas de dépense personnelle, pas de don, pas d'amende | Instructions de l'annexe C 2025 (édition publiée le 19/11/2026), lues le 19/11/2026 (SHA-256 57209107…) | `us_schedule_c_line_help` (nouvelle) |
| Repas | Ligne 24b : 50 % du coût réel « dans la plupart des cas » ; 80 % pour les personnes soumises aux limites d'heures du DOT ; 100 % si traités en salaire ou déclarés sur un 1099-NEC ; pas de divertissement | Mêmes instructions ; Pub. 334 (2025) | `us_meals_deduction_rate` (nouvelle) |
| Remboursements | « Credits you allow customers for returned merchandise and any other allowances you make on sales are deductions from gross sales » ; les instructions de la ligne 2 parlent de produits : la ligne 2 pour un service est **notre lecture** (confiance moyenne), la ligne 3 étant la même dans les deux présentations | Pub. 334 (2025), lue le 19/11/2026 (SHA-256 aab3f8c3…) | `us_sales_returns_allowances` (nouvelle) |
| Factures impayées | En comptabilité de caisse, pas de déduction pour créance irrécouvrable sur une somme jamais reçue ni comptée en recette ; une créance déduite puis encaissée redevient une recette | Pub. 334 (2025), chapitre 8 ; instructions, partie V | `us_bad_debts_cash_method` (nouvelle) |
| Pièces justificatives | Recettes : relevés de dépôt, factures, carnets de reçus, 1099-NEC et 1099-MISC… ; dépenses : chèques encaissés, relevés de compte, factures… ; un relevé bancaire prouve le paiement, pas la déductibilité | Pub. 583 (révisée en décembre 2024), partie *Supporting Documents* lue en entier le 19/11/2026 (SHA-256 fa3b6c32…) | `us_supporting_documents` (nouvelle) |
| Facture | Aucune règle fédérale sur le contenu d'une facture relevée ; ne jamais y mettre son numéro de sécurité sociale (EIN facultatif) | Générateur américain existant | — |

## 2. Périmètre de la version 1

**Repris de l'Espace français, traduit** : profil, clients, devis (*estimates*) et factures (moteur du générateur
américain), numérotation unique, encaissements (paiements partiels), avoirs (*credit memos*), relance par email
préremplie, temps passé et chronomètre, prospects, indicateurs (tableau de bord, documents, clients), trésorerie
(solde prévu, créances, charges régulières), sauvegarde, import, export.

**Propre aux États-Unis** :
1. **Livre des recettes** (*income ledger*) en comptabilité de caisse : encaissements par date de réception, totaux par
   trimestre et par année, remboursements en ligne 2.
2. **Dépenses** classées par ligne de l'annexe C (liste ci-dessus) ; le bureau à domicile renvoie à l'outil
   *Home office deduction* (ligne 30), le véhicule à l'outil *Mileage deduction* (ligne 9).
3. **Synthèse de l'annexe C** de l'année : lignes 1, 2, 3, 6 (autres recettes saisies), 7, 8 à 27b, 28, 29 ; ligne 30
   saisie à part ; ligne 31 = 29 − 30. Export CSV ligne par ligne. Présentée comme une **aide à la préparation**, pas
   comme une déclaration.
4. **Acomptes trimestriels** : prochaine échéance, montant minimal estimé par le moteur existant (`us-estimated.js`) à
   partir du bénéfice de l'année projeté (encaissé moins dépenses, ramené à l'année au prorata des jours écoulés, ou
   bénéfice prévu saisi), situation familiale du profil ; acomptes versés saisis par l'utilisateur.
5. **Formulaires 1099 attendus** : clients professionnels qui ont versé 2 000 $ ou plus dans l'année (hors paiements
   par carte ou plateforme, que l'utilisateur peut marquer), avec la date du 01/02/2027 ; formulé comme « vous
   devriez recevoir », avec le rappel que le revenu est imposable même sans 1099.
6. **Échéances** : calendrier fiscal américain existant (acomptes, déclaration annuelle, 1099).

**Hors version 1** (dit dans l'écran) : comptabilité d'engagement (*accrual*), stocks et coût des ventes (partie III),
amortissements et section 179 (ligne 13), partie IV (véhicule), taxe de vente des États, impôt des États (estimation
seulement par un taux saisi, comme le calculateur existant), LLC imposée en société, salariés.

## 3. Architecture : un Espace, plusieurs pays

Une seule source de vérité : le code de l'Espace devient commun ; seul ce qui dépend du pays change.

1. **Étape 1 — textes séparés du code** : les quelque 440 textes de `tools/espace.js` passent dans un dictionnaire par
   langue (`fr`, puis `en`), sans changer le comportement : le parcours de l'Espace français (359 points) et les tests
   unitaires doivent rester identiques. Les dates et montants passent déjà par les fonctions de format de la section.
2. **Étape 2 — moteur par pays** : interface commune (numérotation, émission, statuts, livre, déclarations ou acomptes,
   seuils, catégories de dépenses, échéances) ; `engines/espace-fr.js` la remplit pour la France, `engines/espace-us.js`
   pour les États-Unis. Le moteur de facture du générateur international est sorti de `tools/invoice.js` en moteur
   (`engines/invoice-intl.js`) pour être partagé avec l'Espace, comme `invoice-fr.js` l'est déjà.
3. **Étape 3 — modules propres au pays** : écrans de la France (déclarations Urssaf, immobilisations, activité mixte)
   et des États-Unis (synthèse de l'annexe C, acomptes, 1099) branchés sur le cœur commun.
4. **Étape 4 — page** `/us/workspace/` (« My workspace »), bouton d'en-tête de la section américaine, encarts dans les
   outils américains, vitrine de l'accueil mise à jour.

Le stockage est déjà séparé par section (clé `of:espace:<section>`) : un utilisateur des deux pays a deux Espaces.

### Avancement

- **Étape 1 terminée le 19/11/2026.** Les textes de `tools/espace.js` sont dans `tools/espace-texts-fr.js`
  (1 172 clés regroupées par écran), lus par `L(clé, valeurs)` : variables entre accolades (`{name}`), clés suffixées
  `Html` quand le texte contient du balisage, pluriels par paires `count.*.one` / `count.*.many`, variante régionale
  fusionnée par-dessus la langue (`fr-CA` sur `fr`). Une clé absente est signalée dans la console (le parcours échoue).
  Le test `tests/unit/espace-textes.test.mjs` vérifie que chaque clé appelée existe, qu'aucune clé n'est inutilisée et
  que toutes les langues ont les mêmes variables. Chaque lot a été validé par le parcours de l'Espace (359 points sur
  359, critère U1) et les tests unitaires.
- **Reste, pour l'étape 2** (textes affichés dans l'Espace mais écrits ailleurs) : le moteur français
  `engines/espace-fr.js` (environ 150 textes : mois, catégories de dépenses, moyens de paiement, étapes des prospects,
  messages d'erreur, en-têtes des exports CSV), `engines/espace-stats.js` (2), `tools/espace-store.js` (10 messages de
  contrôle d'une sauvegarde), `tools/charts.js` (7 : mois abrégés, « Seuil de sécurité ») ; et, dans `tools/espace.js`,
  des formats écrits pour le français : pourcentages (`" %"`), virgule décimale des champs (`rateText`,
  `amountText`), `OF.eur` dans `signed` et dans la table `FMT`, à faire passer par les fonctions de format de la section.

## 4. Critères d'acceptation (extraits, à compléter à l'étape 2)

| N° | Critère |
|---|---|
| U1 | Le parcours de l'Espace français et ses 359 points passent à l'identique après l'étape 1. |
| U2 | Une facture américaine émise dans l'Espace a le même aperçu et les mêmes totaux que le générateur public. |
| U3 | Un encaissement compte dans l'année de sa date de réception (cash method), un remboursement en ligne 2 l'année où il est versé, avec la mention de la ligne 3 identique (D87) ; une facture impayée ne crée aucune déduction. |
| U4 | Chaque dépense a une ligne de l'annexe C ; la synthèse additionne exactement les dépenses de l'année par ligne. |
| U5 | La ligne 31 = ligne 29 − ligne 30, ligne 29 = ligne 7 − ligne 28 ; export CSV identique à l'écran. |
| U6 | L'acompte affiché est celui du calculateur public pour les mêmes données. |
| U7 | Un client professionnel à 1 999,99 $ n'apparaît pas dans les 1099 attendus ; à 2 000,00 $, si. |
| U8 | Aucune erreur JavaScript, aucun débordement horizontal, accessibilité AA (axe-core) sur ordinateur, tablette et téléphone. |

## 5. Lectures avant l'étape 2

- **Faites le 19/11/2026** (§ 1, D87) : instructions de l'annexe C 2025 (lignes 1, 2, 6, 11, 17, 18, 22, 23, 24a, 24b,
  25, partie V et 30), Publication 334 (retours et rabais, créances irrécouvrables, repas), Publication 583 (*Supporting
  Documents* en entier, durée de conservation).
- **À relire** : les instructions de l'annexe C 2026 dès leur publication (les lignes du formulaire 2026 sont déjà
  reprises) ; le seuil du formulaire 1099-NEC pour 2027 dès sa publication (indexation).
