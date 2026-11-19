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
| Paiements par carte | « Payments made with a credit card or payment card and certain other types of payments, including third-party network transactions, must be reported on Form 1099-K […] and are not subject to reporting on Form 1099-MISC or Form 1099-NEC » : exclus des 1099-NEC attendus | Instructions des formulaires 1099-MISC et 1099-NEC, lues le 19/11/2026 (SHA-256 d0847f66…) | `us_1099_nec_card_exclusion` (nouvelle) |
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

### 3.1 Étape 2 : un cœur commun et un module par pays

**Fichiers.** `engines/espace-core.js` (nouveau) contient ce qui ne dépend d'aucun pays ; c'est une fabrique qui reçoit
le contexte de la section : le moteur de facture du pays (`compute`, `amount`, `addDays`, `render`, `UNITS`,
`NATURES`), le dictionnaire de la langue et les règles. `engines/espace-fr.js` garde son nom et son API
(`OFE.espaceFR`, chargé directement par 14 fichiers de tests, `espace-stats.js`, la vitrine et les parcours) : il
assemble le cœur et la France. `engines/espace-us.js` assemble le cœur et les États-Unis. `tools/espace.js` prend le
moteur de la section (pays de `OF_RULES._meta`), `engines/espace-stats.js` aussi.

**Classement des fonctions du moteur actuel** (1 602 lignes) :

| Domaine | Cœur commun | Propre au pays (crochet fourni par le pays) |
|---|---|---|
| Documents | totaux, paiements, soldes, avoirs, échéance, séries et numéros, reprise d'une numérotation, devis vers facture, doublon, totaux par client | préfixes par défaut, contrôle avant émission (mentions), natures et activités (France), statut d'une facture selon l'activité, import du générateur public du pays, moyens de paiement, champs du profil |
| Recettes | — | livre des recettes (France : micro-entreprise, par activité ; États-Unis : comptabilité de caisse, lignes 1 et 2) et son export |
| Déclarations | — | France : périodes Urssaf, taux, ACRE, plafonds, TVA ; États-Unis : synthèse de l'annexe C, acomptes trimestriels, 1099 attendus |
| Dépenses | saisie, contrôle, période, export | catégories (France ; États-Unis : lignes de l'annexe C, repas à 50 %), registre des achats obligatoire ou non |
| Immobilisations | — | France seulement en version 1 |
| Temps passé | tout : durées, chronomètre, états, facturation du temps | — |
| Prospects | étapes, entonnoir, relances, liste d'opposition (empreintes), export | durée de conservation et règles de prospection (France : CNIL ; États-Unis : à lire avant d'ouvrir le module) |
| Trésorerie | mouvements prévus, échéances des charges, créances par ancienneté, délais de paiement, courbe du solde, versement possible, autonomie, historique | flux d'impôts et de cotisations (France : Urssaf et TVA ; États-Unis : acomptes), point mort (part qui reste après cotisations ou impôt) |

**Textes et formats des moteurs (décision D88).** Un moteur ne contient aucun texte : ses messages et libellés sont
des clés du dictionnaire de la langue (préfixe `eng.`), lues par la même fonction que l'interface, et ses dates et
montants passent par les fonctions de format de la section. Le moteur français charge par défaut le dictionnaire
français : les tests gardent leurs phrases (environ 160 assertions) ; le test des clés couvre aussi les moteurs ; les
tests américains chargent le dictionnaire anglais.

**Ordre des lots** (chacun : parcours de l'Espace 359/359, parcours des comptes et tests unitaires inchangés) :

1. **2a — textes des moteurs** : `espace-fr.js` (environ 150 textes), `espace-stats.js`, `espace-store.js` et
   `tools/charts.js` lisent le dictionnaire ; le fichier du dictionnaire se charge aussi dans Node.
2. **2b — cœur extrait** : les domaines communs passent dans `espace-core.js`, avec les crochets du pays pour ce qui
   dépend de ses règles (activité micro, natures, flux d'impôts, point mort).
3. **2c — formats de la section** dans `tools/espace.js` (pourcentages, virgule décimale des champs, signe des montants).
4. **2d — moteur de facture international** (`engines/invoice-intl.js`) sorti de `tools/invoice.js`, avec les mêmes
   aperçus et totaux que le générateur public (critère U2).
5. **2e — moteur américain** et ses tests (critères U3 à U7).

**Avancement de l'étape 2.** Lot 2a fait le 19/11/2026 : `espace-fr.js` lit ses 163 textes (mois, catégories,
moyens de paiement, contrôles, courriel prérempli, périodes, durées, libellés de la prévision, en-têtes des exports)
dans le dictionnaire de la langue par sa fonction `L` (exportée sous `text`, reprise par `espace-stats.js`) ;
`tools/charts.js` lit le sien ; `tools/espace-store.js` renvoie un code (`notBackup`, `version`, `incomplete`,
`profile`, `unreadable`) que `tools/espace.js` traduit, car la page Compte charge le magasin sans le dictionnaire. Le
dictionnaire est chargé avant les moteurs dans la page. Restent pour le lot 2c, dans le moteur : la date française des
exports et des contrôles (`frDay`, jour/mois/année), la virgule décimale (`dec`, montants des exports) et le titre des
échéances de TVA tiré du calendrier français.
Lot 2b-1 fait le 19/11/2026 : `engines/espace-core.js` (420 lignes) reçoit les utilitaires, les montants et soldes des
documents, l'ordre d'émission, le temps passé et les prospects (60 fonctions) ; `espace-fr.js` les reprend sous leur nom
(API inchangée, 112 entrées). Aucun nom introuvable (contrôle par le vérificateur TypeScript, essayé sur une copie
piégée).
Lot 2b-2 fait le 19/11/2026 : numérotation et émission, statuts, totaux par client, transformations (devis vers facture,
avoir, doublon) et parties communes de la trésorerie (mouvements prévus, encaissements attendus, courbe du solde,
versement possible, délais de paiement, créances par ancienneté, autonomie, export de la prévision) rejoignent le cœur
(770 lignes, 95 fonctions) ; le moteur français passe de 1 602 à 912 lignes. Réglages du pays lus par le cœur au
moment des appels : `country.prefixes` (préfixes par défaut des numéros) et `country.methods` (moyens de paiement).
Restent propres à la France : TVA, déclarations Urssaf, acomptes, sommes déjà dues, prévision complète (elle assemble
les pièces du cœur et les flux d'impôts), historique des flux, point mort, livre des recettes. Le moteur américain
assemblera sa prévision avec les mêmes pièces ; si les deux assemblages se ressemblent trop, un crochet commun (flux
d'impôts du pays) sera étudié.
Lot 2c fait le 19/11/2026 : les moteurs lisent leurs formats dans les réglages du pays (`country.fmt` : date, nombre,
montant à deux décimales ; ceux de la France pour le moteur français) ; l'Espace passe aux formats de la section
(`OF.money`, `OF.date`, strictement identiques à `OF.eur` et `OF.frDate` en fr-FR et EUR), tire le séparateur
décimal des champs et le symbole de la devise du format de la section, et écrit les pourcentages par la clé
`fmt.percent`. Le test `tests/unit/espace-core.test.mjs` crée le cœur avec un pays fictif (préfixes INV, EST, CM,
formats américains) et des textes en clés brutes : aucun texte ni format français n'en sort (contrôle vérifié en
réintroduisant une date et une virgule à la française). Factur-X : 12 factures sur 12 conformes, PDF/A-3 valides
(Mustang).
Lot 2d fait le 19/11/2026 : `engines/invoice-intl.js` (fonctions pures `compute`, `render`, `amount`, `addDays`) reprend
les totaux et l'aperçu du générateur public des États-Unis, du Royaume-Uni et du Canada ; `tools/invoice.js` lui passe
un document lu dans le formulaire. Aperçus identiques au caractère près à l'ancienne version sur les quatre pages
(20 comparaisons dans un navigateur ; une erreur glissée dans l'arrondi de la remise est détectée) ; 7 tests unitaires
aux montants calculés à la main. L'Espace américain utilisera ce moteur (critère U2). Le moteur ne gère pas encore les
unités de quantité (heures, jours) que la facturation du temps passé met sur les lignes : à ajouter à l'étape 3.
Lot 2e fait le 19/11/2026 : `engines/espace-us.js`, fabrique `create(textes)` qui assemble le cœur commun, le moteur
de facture international et les règles américaines : numéros comme le générateur public (`2026-001`, `E-2026-001`,
avoirs `CM-2026-001`), moyens de paiement (ACH, chèque, virement, carte, plateforme, espèces, autre), livre des recettes
en comptabilité de caisse (`income`, `incomeQuarters`), dépenses par ligne de l'annexe C (`checkExpense`,
`expenseLines`, repas à 50 %), synthèse (`scheduleC`, lignes 1 à 31) et son export (`scheduleCCSV`), acomptes
(`estimatedTax` : `taxUS.estimate` puis `taxUS.quarterly`, comme le calculateur public ; bénéfice prévu, ou bénéfice à
date ramené à l'année au prorata des jours), 1099-NEC attendus (`expected1099`). Tests `tests/unit/espace-us.test.mjs` :
critères U3 à U7, chacun vérifié en réintroduisant une erreur (6 sur 6 détectées). Clés de texte propres au moteur,
à mettre dans le dictionnaire anglais à l'étape 3 (avec toutes les clés `eng.*` du cœur) : `eng.us.method.*` (7),
`eng.us.exp.line`, `eng.us.csv.scheduleC`, `eng.us.line.*` (lignes 1 à 7 et 28 à 31). Le test des clés couvrira alors
`espace-us.js` pour l'anglais.

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
