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

### 3.2 Étape 3 : écrans par pays

**Constat.** `tools/espace.js` (2 917 lignes) mêle l'interface commune (cadre, routeur, documents, clients, temps,
prospects, trésorerie, réglages, sauvegarde) et des écrans français : profil (activité, régime de TVA, SIRET, ACRE,
versement libératoire), clients (UE, SIREN, adresse électronique de facturation), éditeur de document (TVA, mentions,
nature des lignes), Factur-X, tableau de bord (déclaration Urssaf, jauges des plafonds), livre des recettes
micro-entreprise, registre des achats, immobilisations, règles CNIL des prospects, sommes déjà dues (Urssaf, TVA),
échéances de TVA estimées, reprise d'un document du générateur public français. Traduire ces écrans en anglais
n'aurait pas de sens : l'Espace américain ne les affiche pas.

**Architecture (décision D90).** Un module d'écrans par pays, chargé par la page de la section
(`tools/espace-fr-ui.js`, `tools/espace-us-ui.js`), s'inscrit dans `OFE.espaceUI` et fournit des crochets que
`tools/espace.js` appelle : champs et contrôle du profil et d'un client, éditeur de taxe d'un document et rendu de
l'aperçu (moteur de facture du pays), cartes du tableau de bord, écrans propres (routes en plus : immobilisations en
France ; annexe C, acomptes et 1099 aux États-Unis), livre des recettes et dépenses, bloc des règles de prospection,
flux d'impôts de la trésorerie, reprise du générateur public. La navigation est écrite dans la page de chaque section ;
les adresses internes gardent leurs clés (`recettes`, `depenses`…) et chaque section a ses alias lisibles (`#/income`,
`#/expenses`…). Dictionnaires : les clés communes (interface partagée et moteurs communs) existent dans chaque langue ;
les clés d'un module de pays seulement dans les langues de ce pays (France : `fr` ; États-Unis : `en` ; Canada : `en`
et `fr-CA`) ; le test des clés vérifie ces deux règles.

**Écrans américains (version 1, § 2).** Profil : nom, adresse, email, téléphone, EIN facultatif (jamais le numéro de
sécurité sociale, comme le générateur), situation familiale et autres revenus pour les acomptes. Client : professionnel
ou particulier, adresse, email, identifiant fiscal facultatif. Documents : moteur `invoice-intl.js` (même aperçu que le
générateur, critère U2), taxe de vente saisie. Recettes : livre de caisse par date de réception, totaux par trimestre,
remboursements en ligne 2. Dépenses : ligne de l'annexe C avec l'aide de la ligne (`us_schedule_c_line_help`), repas
à 50 %. Annexe C : synthèse et export. Acomptes : prochaine échéance, montant requis, acomptes versés. 1099 : clients
qui devraient en envoyer un. Échéances : calendrier américain existant. Trésorerie : charges et acomptes prévus.

**Lots** (chacun : parcours de l'Espace français identique, 359 points, et tests unitaires) :

1. **3a — module français** : les parties françaises de `tools/espace.js` passent dans `tools/espace-fr-ui.js`, appelées
   par les crochets ; aucun changement visible.
2. **3b — dictionnaires** : clés communes et clés de module séparées ; test des clés à deux règles.
3. **3c — dictionnaire anglais** des clés communes, relu (américain, phrases courtes, termes de l'IRS).
4. **3d — module américain** `tools/espace-us-ui.js` et ses écrans, avec un parcours navigateur dédié (critères U2 à U8,
   accessibilité, ordinateur, tablette, téléphone).
5. **Étape 4** — page `/us/workspace/`, lien d'en-tête, encarts, vitrine.

**Avancement de l'étape 3.** Lot 3a-1 fait le 19/11/2026 : `tools/espace-fr-ui.js` (fabrique `OFE.espaceUI.fr`)
reçoit les écrans d'immobilisations (228 lignes) ; `tools/espace.js` lui prête un contexte (`ctx` : `$`, textes,
formats, champs, persistance, règles, moteur, données par `ctx.data()`) et ajoute ses routes au routeur. Parcours de
l'Espace 359/359 et des comptes 51/51. Le premier essai a échoué au parcours : le raccourci `$` manquait au contexte,
et le vérificateur TypeScript ne signale pas ce nom (angle mort désormais couvert par un contrôle dédié).
Lot 3a-2 fait le 19/11/2026 : crochet `dashboard()` du module (rappel du registre des achats, prochaine déclaration
Urssaf en 4e indicateur, jauges des plafonds, note sur l'estimation) ; sans module, le tableau de bord garde les devis
en attente en 4e indicateur. Parcours de l'Espace 359/359 et des comptes 51/51.
Lot 3a-3 fait le 19/11/2026 : crochet `profile` du module (`defaults`, `fields`, `bind`, `read`) ; le formulaire
commun garde le nom, la numérotation, l'enregistrement et le passage au tableau de bord ; le module rend et lit les
champs du pays (activité, TVA, micro-entreprise, coordonnées, délai, pénalités) et renvoie `{ message, field }` quand il
refuse une saisie (adresse électronique de facturation). Parcours de l'Espace 359/359 et des comptes 51/51.
Lot 3a-4 fait le 19/11/2026 : crochet `client` du module, sur le même modèle ; le nom, le type (professionnel ou
particulier), les notes, l'enregistrement et le retour au document ou à la piste restent communs ; le lieu, le pays,
le SIREN, la TVA, l'e-mail, l'adresse électronique de facturation et la livraison passent dans le module, avec la
liste des pays et le contrôle de l'adresse électronique. Parcours de l'Espace 359/359 et des comptes 51/51.
Lot 3a-5 fait le 19/11/2026 : crochet `doc` du module (`draft`, `retax`, `fields`, `note`, `input`, `kindCell`,
`issueOptions`) : TVA d'un brouillon selon le client, nature du document, biens ou services d'une ligne mixte, taux et
note de TVA, options d'émission. Le parcours ne passait ni par le taux de TVA de l'éditeur ni par la fiche client créée
depuis un brouillon : quatre points ajoutés (taux du profil proposé, taux choisi dans l'aperçu, client de l'UE créé
depuis le brouillon avec TVA autoliquidée et taux gardé, retour à un client en France). Un brouillon pas encore
enregistré suit désormais la même règle que les autres (taux choisi gardé) ; sans effet visible, car quitter l'éditeur
enregistre le brouillon dès qu'il a été modifié. Parcours de l'Espace 363/363 et des comptes 51/51 ; mutation
(taux saisi non enregistré) détectée par trois des quatre nouveaux points.
Lot 3a-6 fait le 19/11/2026 : crochet `issued` du module (`cards`, `bind`) : carte de la facture électronique
Factur-X d'un document émis à un professionnel, coordonnées complétées depuis les fiches, export PDF/A-3 et XML. Le
chargeur de scripts différés reste commun et est prêté au module. Parcours de l'Espace 363/363 et des comptes 51/51 ;
jeu d'essai Factur-X (12 factures, XML et PDF) et fichiers produits par l'Espace pendant le parcours validés (XSD,
EN 16931, règles françaises, PDF/A-3).
Lot 3a-7 fait le 19/11/2026 : le livre des recettes (micro-entreprise, activité mixte, plafonds) et les dépenses
(registre des achats, catégories) passent entiers dans le module, comme routes `recettes` et `depenses` : l'Espace
américain aura ses propres écrans pour ces adresses (recettes en caisse, lignes de l'annexe C). Les aides génériques
restent communes et sont prêtées (listes en barres, pourcentages, statistiques) ; `ctx.charts(fn)` installe le dessin
des graphiques de l'écran, redessinés au changement de taille (capture sur téléphone relue). Parcours de l'Espace
363/363 et des comptes 51/51.
Lot 3a-8 fait le 19/11/2026 : crochet `prospects` du module (`retentionYears`, `retentionNote`, `optoutNote`,
`rules`) : règles de la CNIL, durée de conservation des données et note de la liste d'opposition ; sans durée fournie
par le pays, le cadre commun n'affiche pas les rappels de conservation. Étapes, relances, liste d'opposition
(empreintes), boutons et exports restent communs. Parcours de l'Espace 363/363 et des comptes 51/51.
Lot 3a-9 fait le 19/11/2026 : crochet `deadlines` du module (`values`, `hidden`, `classes`, `summary`) :
conditions du calendrier selon le profil, échéances Urssaf masquées hors micro-entreprise, catégories de la frise,
cotisations et TVA estimées, introduction et lien vers le calendrier fiscal français. La fenêtre de 90 jours, la frise,
la liste et la prochaine échéance restent communes ; le calcul des montants (`ST.deadlines`, flux Urssaf et TVA de la
trésorerie) sera généralisé avec le module américain. Parcours de l'Espace 363/363 et des comptes 51/51.
Lot 3a-10 fait le 19/11/2026 : crochet `treasury` du module (`kinds`, `owed`, `revenueLabel`, `settings`,
`assumptions`) : sommes déjà dues (cotisations, TVA) et leurs notes, libellés des flux Urssaf et TVA, case « chiffre
d'affaires à venir », TVA de l'année précédente dans les réglages (champ, contrôle, enregistrement), hypothèses. Le
solde prévu, les graphiques, les créances, les charges, les réglages communs et l'export restent communs. Le parcours
vérifie en plus le refus d'une TVA de l'année précédente négative : Espace 364/364, comptes 51/51.
Lot 3a-11 fait le 19/11/2026 : crochet `generator` du module (`saved`, `profile`, `extras`, `patchLabels`,
`notes`) pour la reprise du générateur public français ; `profile.missing` (adresse et SIRET du rappel) ;
`dashboard().receipts` (nombre d'encaissements de l'année, compté par le livre des recettes). Le dépôt du générateur
(`#/importer`), le récapitulatif et la création du brouillon restent communs. Trois points ajoutés au parcours :
SIRET du générateur repris au premier lancement, TVA du générateur différente du profil signalée, rappel du profil
incomplet. Parcours de l'Espace 367/367 et des comptes 51/51 ; mutation (note de TVA de la reprise supprimée)
détectée.

**Lot 3a terminé le 19/11/2026.** `tools/espace-fr-ui.js` porte les écrans et les parties françaises de l'Espace
(crochets : `routes`, `dashboard`, `profile`, `client`, `doc`, `issued`, `prospects`, `deadlines`, `treasury`,
`generator`) ; le parcours de l'Espace français est passé de 359 à 367 points (taux de TVA de l'éditeur, fiche client
créée depuis un brouillon, TVA de l'an dernier refusée, reprise du générateur, profil incomplet). Restent dans
`tools/espace.js` des branchements de moteur, à traiter avec le module américain (lot 3d) : choix du moteur de
l'Espace et du moteur de facture de la section (`E`, `INV`, aujourd'hui français), coordonnées passées à l'aperçu et à
l'émission (`meFromProfile`, `clientForDoc`), micro-entreprise (`isMicro`), montants des échéances (`ST.deadlines`,
flux Urssaf et TVA de la trésorerie).

Lot 3b fait le 19/11/2026 : le dictionnaire français est partagé en textes communs (`tools/espace-texts-fr.js`,
876 clés : interface partagée et moteurs communs) et textes de la France (`tools/espace-fr-texts-fr.js`, 478 clés :
module français et moteur français), fusionnés par langue au chargement ; leur union est identique à l'ancien
dictionnaire. Le partage suit l'usage : une clé lue par le code commun est commune, même si le module la lit aussi
(26 clés). Le test des clés vérifie deux règles : chaque clé lue par le code commun existe dans chaque langue ;
chaque clé lue par un module existe dans les langues de son pays (texte commun ou du pays) ; et chaque clé d'un
dictionnaire sert au code de son groupe, une clé de pays n'étant ni commune ni lue par le code commun. Contrôlé par
quatre erreurs réintroduites (clé du pays renommée, clé commune renommée, clé de pays copiée dans les textes
communs, code commun lisant une clé du pays), toutes détectées. Le moteur américain (`eng.us.*`) recevra ses textes
avec le module américain (`tools/espace-us-texts-en.js`, lot 3d). Parcours de l'Espace 367/367 et des comptes 51/51,
752 tests unitaires. Pour le lot 3c, quelques textes communs restent liés à la France et seront rendus neutres ou
confiés au module : accueil (« déclarations Urssaf »), aides « en euros », « € » dans un message du cœur
(`eng.issue.creditOver`), lien vers la page française des pénalités de retard, point mort « micro-entreprise ».

Lot 3c-1 fait le 20/11/2026 : le format du pays gagne `money` (montant avec sa devise : « 1234,50 € » en France,
« $1,234.50 » aux États-Unis), utilisé par le message du cœur sur un avoir trop élevé au lieu d'un « € » écrit dans
le texte (même message en France, testé mot pour mot ; format américain testé ; deux erreurs réintroduites,
détectées). La note des pénalités de retard (lien vers la page française) et le texte du point mort non calculé
(« micro-entreprise ») passent dans le module (crochet `treasury` : `agingNote`, `breakEvenNone`) avec leurs clés.
Le parcours ne les affichait jamais vérifiés : deux points ajoutés (point mort sans charge notée ; facture en retard
injectée, rappel des pénalités et lien). Les autres textes communs liés à la France (accueil, aides « en euros »)
restent en français pour la France ; leur traduction anglaise sera neutre (sans pays ni devise).
Parcours de l'Espace 369/369 et des comptes 51/51, 753 tests unitaires ; mutation (note des pénalités vidée)
détectée. Le lien des modèles de relance (`remind.templatesHref`) vise `payment-reminder-email` aux États-Unis et
au Canada, `payment-reminder-letter` au Royaume-Uni : variante `en-GB` à prévoir avec le Royaume-Uni.

Lot 3c-2 fait le 20/11/2026 : `tools/espace-texts-en.js`, les 874 textes communs en anglais américain (phrases
courtes, neutres quant au pays : ni devise, ni règle française ; « Workspace », *estimate*, *credit memo*, *leads*,
*cash flow*, *Net 30*…). Contrôles : mêmes clés et mêmes valeurs insérées que le français, mêmes balises, aucun
caractère français, listes de même longueur (origines des pistes, mois) ; seul lien différent, voulu : le générateur
anglais (`../invoice-generator/`). Test des clés : 753 tests ; une valeur insérée retirée et une clé supprimée sont
détectées. Le fichier n'est chargé par aucune page avant la page américaine (étape 4), dont le parcours lira ces
textes en situation ; les en-têtes CSV gardent le séparateur « ; » du cœur (séparateur des exports américains à
décider avec le module américain).

### 3.3 Lot 3d : le module américain (spécifié le 20/11/2026, décision D92)

**Constat.** Après les lots 3a à 3c, `tools/espace.js` reste lié à la France par ses branchements : moteur de l'Espace
(`OFE.espaceFR`), moteur de facture (`OFE.invoiceFR`) et formats de l'aperçu (`FMT`), moteur des indicateurs
(`engines/espace-stats.js`, lié au moteur français au chargement), coordonnées passées à l'aperçu (`meFromProfile`,
`clientForDoc`). Le moteur américain ne fournit pas encore neuf fonctions que le cadre commun appelle : `cashed`,
`cashHistory`, `period`, `mixedActivities`, `forecast`, `owed`, `breakEven`, `email`, `fromGenerator`. Le stockage local
est déjà séparé par section (`of:espace:<section>`) ; le dépôt du générateur public (`espace-import`) ne l'est pas.

**Choix (D92).**

1. **Branchements par section.** Le module d'écrans d'un pays déclare, à côté de sa fabrique, ses moteurs :
   `engine(textes)` (moteur de l'Espace), `invoice` (moteur de facture : rendu de l'aperçu et montants), `fmt` (formats
   de l'aperçu) et `parties` (coordonnées de l'émetteur et du client passées à l'aperçu et à l'émission). Le moteur des
   indicateurs devient une fabrique `create(moteur, facture)` ; l'instance française reste exposée telle quelle. En
   France, rien ne change (parcours de l'Espace identique).
2. **Fonctions communes au cœur.** `cashed`, `cashHistory` et `period` (encaissé sur une période, historique mensuel des
   entrées et sorties, libellé d'une période) n'ont rien de français : elles passent dans `engines/espace-core.js`.
   `mixedActivities` reste française ; le cœur renvoie « pas d'activité mixte » pour les autres pays.
3. **Trésorerie américaine (estimations, présentées comme telles).** Flux d'impôt : les acomptes trimestriels de
   l'année (dates de la règle `estimated_tax_due_dates_<année>`), du montant donné par `estimatedTax` (critère U6),
   moins les acomptes déjà versés que l'utilisateur saisit (par échéance) ; une année dont les dates ne sont pas dans
   les règles n'a pas de flux d'impôt, et l'écran le dit. **Déjà dû** : impôt fédéral estimé sur le bénéfice déjà
   réalisé dans l'année (impôt annuel estimé × bénéfice à date ÷ bénéfice projeté), moins les acomptes versés,
   jamais négatif. Point mort : non calculé en version 1 (dit dans l'écran). Impôt des États : hors version 1 (§ 2).
4. **Reprise du générateur.** Le dépôt du générateur public porte sa section (`espace-import` en France, inchangé ;
   `espace-import:<section>` ailleurs) : l'Espace d'une section ignore le dépôt d'une autre. Le générateur américain
   n'a pas encore de bouton « Continue in my Workspace » : en version 1, l'Espace américain n'a pas de reprise.
5. **Prospects.** Les règles de prospection américaines (CAN-SPAM, TCPA, liste nationale *Do Not Call*) sont lues
   aux sources officielles avant d'être affichées (sous-lot 3d-5, D95) ; jusque-là, l'Espace américain affichait les
   pistes, relances et la liste d'opposition, sans bloc de règles ni durée de conservation.
6. **Courriels préremplis.** Le moteur américain compose ses propres courriels (envoi, relance), sans mention
   française (pénalités, indemnité forfaitaire) ; textes `eng.us.mail.*`.

**Sous-lots** (chacun : parcours de l'Espace français identique, 369 points ; tests unitaires ; revue critique) :

1. **3d-1 — branchements** : `engine`, `invoice`, `fmt`, `parties` déclarés par le module français ; fabrique des
   indicateurs ; dépôt du générateur par section. Aucun changement visible.
2. **3d-2 — moteur américain complété** : fonctions communes au cœur ; `forecast`, `owed`, `breakEven` (null),
   `email`, `fromGenerator` (absent : pas de reprise) ; tests (flux d'acomptes aux dates sourcées, déjà dû, courriels
   sans mention française).
3. **3d-3 — module américain, premiers écrans** : `tools/espace-us-ui.js` et ses textes `tools/espace-us-texts-en.js`
   (profil : nom, adresse, email, téléphone, EIN facultatif, situation familiale ; client : professionnel ou
   particulier, adresse, email, identifiant fiscal facultatif ; document : taxe de vente saisie, aperçu du moteur
   international, critère U2 ; tableau de bord : prochain acompte, 1099 attendus).
4. **3d-4 — écrans propres** : recettes en caisse (*income*), dépenses par ligne de l'annexe C, synthèse de l'annexe C
   et son export, acomptes (saisie des acomptes versés), 1099 attendus ; échéances (calendrier américain) ; trésorerie
   (flux d'acomptes, hypothèses).
5. **3d-5 — règles de prospection** (spécifié le 20/11/2026, D95) : voir ci-dessous.
6. **Étape 4 — page `/us/workspace/`** : navigation, alias d'adresses lisibles (`#/income`, `#/expenses`…), lien
   d'en-tête, encarts ; parcours navigateur dédié (critères U2 à U8 : ordinateur, tablette, téléphone, axe-core).

**Sous-lot 3d-5 — règles de prospection américaines (D95).** Sources lues le 20/11/2026 par l'action `lire-source`
(§ 5) : loi CAN-SPAM (15 U.S.C. chapitre 103) et règlement de la FTC (16 CFR partie 316) ; loi TCPA (47 U.S.C. § 227),
règlement de la FCC (47 CFR § 64.1200) et règle de vente par téléphone de la FTC (16 CFR partie 310, § 310.6(b)). Deux
règles sourcées dans `data/rules/us.json` : `us_can_spam` (mécanisme de désinscription valable 30 jours, demande
respectée sous 10 jours ouvrés) et `us_telemarketing` (heures 8 h à 21 h chez l'appelé, copie de la liste nationale de
31 jours au plus, liste propre à l'entreprise : demande respectée sous 10 jours ouvrés et pendant 5 ans). Crochet
`prospects` du module américain :

1. **Règles** (écran des pistes et fiche d'une piste) : email, à une entreprise comme à un particulier (la définition du
   message commercial n'exclut pas les entreprises : notre lecture, dite dans la note de la règle) ; appel d'une
   entreprise (exemption de la règle de vente par téléphone, sauf quelques exigences ; règles d'opposition réservées aux
   abonnés résidentiels, mais pouvant couvrir les mobiles, § 64.1200(e)) ; appel d'un particulier (heures, liste
   nationale sauf permission ou relation d'affaires établie, liste propre) ; appels et SMS automatisés vers un mobile
   (consentement écrit préalable) ; règles des États non reprises (dit). Liens vers les cinq textes lus (mêmes adresses
   que les sources des règles, vérifié par un test) et vers les modèles d'emails américains.
2. **Liste d'opposition** : délais fédéraux (10 jours ouvrés pour un email, 10 jours ouvrés et 5 ans pour un appel) ;
   l'empreinte reste jusqu'à son retrait par l'utilisateur (aucune expiration : les 5 ans sont respectés).
3. **Pas de durée de conservation des pistes** : aucune règle fédérale lue n'en fixe ; ni rappel de suppression ni
   mention dans la fiche (`retentionYears` renvoie null).

Ce que l'Espace ne fait pas : consulter la liste nationale à la place de l'utilisateur ; l'écran lui rappelle de le
faire (copie de 31 jours au plus). Critères : valeurs affichées tirées des règles ; parcours américain (règles des deux
sortes de pistes, liens, pas de rappel de conservation, anglais seul, axe-core, trois largeurs).

**Avancement du lot 3d.** Sous-lot 3d-1 fait le 20/11/2026 : `OFE.espaceUI.fr.engines(textes, OF)` déclare le
moteur de l'Espace, le moteur de facture, les formats de l'aperçu et les coordonnées (`parties`) ; `tools/espace.js`
les lit avant de créer le module ; `engines/espace-stats.js` expose `create(moteur, facture)` (instance française
inchangée, testée) ; le dépôt du générateur porte sa section. Parcours de l'Espace et du générateur français 403/403,
comptes 51/51, 754 tests unitaires.
Sous-lot 3d-2a fait le 20/11/2026 : `period`, `cashed`, `cashHistory` et la partie générale de la prévision
(`forecastWith(entrée, flux)` : encaissements attendus, scénario prudent, entrées prévues, charges, soldes mensuels)
passent dans le cœur ; le pays fournit son livre des encaissements (`country.receipts`), le total de ses dépenses
(`country.expenseTotal`) et ses flux d'impôt (France : Urssaf et TVA, inchangés). Textes des mois, des périodes et
des libellés de la prévision devenus communs, avec leur anglais. Test du cœur avec un pays fictif (encaissé net,
périodes, historique, flux d'impôt du pays dans les soldes). Parcours de l'Espace 369/369, comptes 51/51,
755 tests unitaires (dont les 59 points de la trésorerie, inchangés).
Sous-lot 3d-2b fait le 20/11/2026 : le moteur américain fournit son livre au format commun (`ledger`, remboursements
en négatif), branché sur l'encaissé, l'historique et la prévision du cœur ; la prévision ajoute les acomptes aux dates
de `estimated_tax_due_dates_<année>` (montant du calculateur, critère U6, moins les acomptes versés saisis par échéance
dans `profile.estimatedPaid`) et signale les années sans dates sourcées (`missingTaxYears`) ; « déjà dû » et point mort
comme spécifié ; courriels américains (envoi, relance, devis, avoir ; instructions de paiement du profil). Données du
calcul tirées du profil : `filingStatus`, `wages`, `withheld`, `priorTax`, `priorAgi`, `expectedProfit`, `otherIncome`,
`homeOffice`. Textes du moteur dans `tools/espace-us-texts-en.js` ; intitulés des lignes 1 à 7 et 28 à 31 de l'annexe C
relus sur le formulaire officiel 2026 (lecture du 20/11/2026). Le tri alphabétique suit la langue du pays
(`country.locale`) et le nom par défaut d'un client inconnu devient un texte commun (il était écrit en français dans
le moteur des indicateurs). Cinq erreurs réintroduites dans le moteur américain, toutes détectées ; 759 tests
unitaires.
Sous-lot 3d-3a fait le 20/11/2026 : `tools/espace-us-ui.js` (moteurs de la section ; profil : situation familiale,
adresse, email, téléphone, EIN facultatif mis en forme et refus d'un numéro au format de la sécurité sociale, délai,
instructions de paiement, conditions de retard ; client : adresse, email, identifiant fiscal ; document : taxe de vente
et libellé saisis, bon de commande ; avoir rendu avec son titre) ; paramètres de facture du générateur américain
déplacés dans `data/invoice-profiles/us.json` (balise `{{invoice_profile:us}}`, contenu identique, vérifié) ; page en
brouillon `/us/workspace/` ; parcours `tests/e2e/espace-us.mjs` : U2 (même facture saisie dans le générateur public et
dans l'Espace : aperçus identiques au caractère près ; erreur réintroduite détectée), U8 (anglais seul, aucune erreur
ni texte manquant, axe-core, ordinateur, tablette, téléphone), courriel, encaissement, tableau de bord, échéances
américaines. Nombre d'encaissements du tableau de bord redevenu commun (les deux moteurs ont `ledger`) ; pluriels
selon la langue (`Intl.PluralRules` : « 0 payments », « 0 encaissement »).
Sous-lot 3d-3b fait le 20/11/2026 : date de prestation masquée dans l'éditeur américain (`doc.serviceDate: false`,
mention française) ; tableau de bord américain : prochain acompte (dates sourcées de l'année, ou de la précédente en
janvier ; montant du calculateur moins l'acompte versé ; « pas requis » sous le seuil de 1 000 $ ; dates non publiées
signalées) et note sur l'estimation. Parcours américain : 40 points, dont l'acompte affiché égal au calcul du
calculateur public pour un bénéfice prévu de 120 000 $ (U6 à l'écran ; erreur réintroduite détectée). Les 1099 attendus
viendront avec leur écran (3d-4).
Sous-lot 3d-4a fait le 20/11/2026 : écrans américains des recettes (paiements à leur date de réception, remboursements
en ligne 2 avec la mention « notre lecture » pour les services, totaux par trimestre et par année, règle sourcée de la
comptabilité de caisse, pièces à garder et durée de conservation sourcées, export, impression) et des dépenses (ligne
de l'annexe C exigée avec l'aide officielle de la ligne, totaux par ligne, repas à 50 %, export, impression). Exports
au séparateur du pays (`country.csvSep` : « , » aux États-Unis, « ; » en France, inchangé), en-têtes recomposés
(`csvHeader`) ; tableau par ligne lisible sur téléphone (montants avec leur libellé). Parcours américain : 55 points ;
erreur réintroduite détectée.
Sous-lot 3d-4b fait le 20/11/2026 : écran « Taxes » (`#/taxes`) : bénéfice de l'année (réel, prévu ou projeté),
impôt fédéral estimé, acompte trimestriel du calculateur (U6), échéancier aux dates sourcées avec les acomptes versés
saisis (`profile.estimatedPaid`), données du calcul rangées par année fiscale (`profile.taxYears[année]`, le moteur
gardant les valeurs générales par défaut), méthode et règles (seuil, règle de sécurité, quatrième acompte), 1099-NEC
attendus au seuil de l'année (U7) ; écran « Schedule C » (`#/schedule-c`) : synthèse de l'année et export identique à
l'écran (U5), rangé sous l'onglet « Taxes ». L'onglet surligné d'un écran rangé sous un autre devient un crochet du
pays (`tabs`, France : immobilisations sous « Dépenses », vérifié par le parcours français, 370 points). Texte de la règle
`estimated_tax_q4_skip_rule` aligné sur la formulation du formulaire 1040-ES citée dans sa note (« by February 1,
2027 »). Parcours américain : 72 points ; erreur réintroduite détectée.
Sous-lot 3d-5 fait le 20/11/2026 (D95) : règles de prospection américaines (email, appel d'une entreprise ou d'un
particulier, appels et SMS automatisés, États), liste d'opposition aux délais fédéraux, pas de durée de conservation ;
règles `us_can_spam` et `us_telemarketing` ; test « une seule source » (liens de l'écran = sources des règles).
Heure des règles mise en forme à l'américaine (`us.clock`, testée avec midi et minuit). Parcours américain :
107 points ; trois erreurs réintroduites détectées (deux par le parcours, une par le test unitaire).
Sous-lot 3d-4c fait le 20/11/2026 (D94) : **échéances américaines** : calendrier fédéral existant
(`data/calendars/us.json`) filtré par les mêmes choix que le calendrier public : acomptes trimestriels toujours
retenus (l'Espace les calcule ; leur montant dit s'ils sont requis), formulaires 1099-NEC à envoyer et déclaration
prolongée selon deux cases du profil (« I pay independent contractors », avec le seuil 1099-NEC de l'année tiré des
règles ; « I file my tax return with an extension »), non cochées par défaut ; montant estimé des acomptes repris de
la trésorerie (table « étiquette du calendrier → nature du flux » donnée par le pays : `deadlines.kinds`, France
`{ Urssaf, TVA }`, États-Unis `{ "Estimated tax": "tax" }`, le moteur des indicateurs n'ayant plus de table française
en dur) ; indicateurs « Estimated tax due » (90 jours) et « Next tax return » ; mention « fédéral seulement » du
calendrier public. **Trésorerie américaine** : « déjà dû » (impôt fédéral sur le bénéfice réalisé, acomptes saisis
déduits, note s'il n'y en a aucun), point mort non calculé (dit), factures en retard : frais seulement s'ils sont
convenus (règle `late_fees_federal_rule`), liens vers le calculateur de frais de retard et le modèle de relance ;
hypothèses : acomptes du calculateur, année dont le formulaire 1040-ES n'est pas encore repris (pas d'acompte compté),
impôt des États et solde de la déclaration non comptés ; pas de case « chiffre d'affaires à venir » (les acomptes
suivent le bénéfice de l'écran Taxes) ni de réglage propre (crochets `revenueLabel`, `settings` et `hidden` devenus
facultatifs). Export de la prévision : nature des flux d'impôt donnée par le pays (`country.flowKinds` ; l'acompte
américain serait sorti « tax »). Trois défauts de langue trouvés en relisant les captures et corrigés dans le code
commun : « Aujourd'hui » écrit en dur dans la frise, « Jan 27 » sur l'axe (lu « 27 janvier » en anglais : « Jan '27 »,
texte `eng.chart.monthYear`), espace avant les deux-points dans la légende des créances et le titre d'un graphique
(texte `common.colon`) ; le contrôle « anglais seul » du parcours les détecte désormais. Parcours américain :
95 points ; cinq erreurs réintroduites, toutes détectées.

### 3.4 Étape 4 : publication de `/us/workspace/` (spécifiée le 20/11/2026, décision D96)

**Constat.** Les écrans américains sont faits (lots 3d-1 à 3d-5, parcours de 107 points) sur une page en brouillon.
Les adresses internes de l'Espace sont françaises (`#/recettes`, `#/depenses`, `#/reglages`, `#/clients/nouveau`…) :
elles s'affichent dans la barre d'adresse d'un utilisateur américain et dans ses favoris.

**Choix (D96).**

1. **Adresses dans la langue de la section (sous-lot 4a).** Le module d'un pays peut déclarer une table d'alias
   (`aliases` : adresse du pays → nom interne), appliquée au nom de l'écran et à l'identifiant (`new` → `nouveau`).
   Le routeur lit les adresses du pays et réécrit une adresse interne dans la langue du pays sans nouvelle entrée
   d'historique (`history.replaceState`) : les liens internes du code commun restent valables. États-Unis :
   `#/income`, `#/expenses`, `#/time` (et `#/time/bill`), `#/leads`, `#/cash-flow`, `#/deadlines`, `#/settings`,
   `#/import`, `/new` ; `#/documents`, `#/clients`, `#/taxes`, `#/schedule-c` inchangés. Les paramètres (`?annee=`,
   `?filtre=`…) gardent leur nom interne. France : aucune table, rien ne change.
2. **Page publique (sous-lot 4b).** `/us/workspace/` sort du brouillon (indexée, dans le plan du site) avec un texte de
   page comme l'Espace français : ce que fait l'Espace (factures et devis, encaissements, recettes en caisse, dépenses
   par ligne de l'annexe C, acomptes, 1099 attendus, temps, pistes, trésorerie, échéances), ce qu'il ne fait pas
   (version 1, § 2), questions fréquentes (gratuité, données sur l'appareil, déclaration, numérotation), sources
   officielles (règles déjà lues). Entrée « Workspace » en tête du groupe « Invoicing and getting paid » du menu,
   parmi les outils mis en avant, et bouton d'en-tête « My workspace » (comme « Mon espace » en France).
3. **Encarts** (`aside.espace-cta`, comme en France) sur cinq outils américains : générateur de facture, calendrier
   fiscal, calculateur d'acomptes, « how much to set aside », relance de paiement ; une phrase propre à l'outil et un
   bouton vers l'Espace.
4. **Vitrine de l'accueil américain (sous-lot 4c)** : une tuile de l'Espace, capture faite par `scripts/vitrine.mjs`
   avec des données d'exemple annoncées comme telles (D84).
5. **Vérifications** : parcours `tests/e2e/espace-us.mjs` sur le site public (critères U2 à U8), adresses en anglais
   (lecture, réécriture, onglet actif) ; parcours des pages américaines (encarts, menu) ; Espace français identique.

**Avancement de l'étape 4.** Sous-lot 4a fait le 20/11/2026 : table `aliases` du module américain et routeur commun
(lecture des adresses du pays, réécriture des adresses internes par `history.replaceState`) ; menu de la page en
adresses anglaises ; l'écran de saisie d'une dépense américaine prend l'identifiant commun `nouveau` (`#/expenses/new`).
Défaut trouvé en vérifiant les liens (présent aussi en France) : un lien vers une partie de l'écran (« Indiquer le
solde », « Notez vos charges » de la trésorerie : `#tr-settings`, `#tr-charges`) changeait l'adresse et affichait le
tableau de bord ; il fait désormais défiler l'écran jusqu'à sa cible et y place le focus, sans changer d'écran.
Parcours américain : 116 points ; parcours de l'Espace français : un point de plus (le lien « Indiquer le solde »),
371 points ; deux erreurs réintroduites (lien interne, réécriture d'adresse), toutes deux détectées.
Sous-lot 4b fait le 20/11/2026 : `/us/workspace/` publiée (indexable, dans le plan du site) avec son texte (ce que
fait l'Espace, ce que la version 1 ne fait pas), sept questions fréquentes et onze règles en sources ; entrée
« Freelancer workspace » en tête du groupe « Invoicing and getting paid », outils mis en avant (Workspace, facture,
impôt des indépendants) et bouton d'en-tête « My workspace » ; encarts sur le générateur de facture (qui ne promet pas
de reprise du document : il n'y en a pas en version 1), la relance de paiement, le calculateur d'acomptes, « how much
to set aside » et le calendrier fiscal. Le parcours `tests/e2e/espace-us.mjs` tourne sur le site public (`docs/`) :
page indexable et adresse canonique, texte, questions, sources, bouton d'en-tête, encarts visibles et en anglais,
trois largeurs ; 129 points. Pages américaines : 71 points. Erreur réintroduite (encart masqué) : d'abord non
détectée (le contrôle ne regardait que la présence de l'encart), détectée après l'avoir rendu sensible à la visibilité.
Sous-lot 4c fait le 20/11/2026 : vitrine de l'accueil américain refaite comme la française (documentation/58, § 4.2) :
l'Espace en grande tuile (tableau de bord d'un Espace d'exemple créé par `scripts/vitrine.mjs` : vingt-trois mois de
factures payées par ACH, dépenses rangées sur les lignes de l'annexe C dont la description officielle leur correspond,
deux charges), avec sa variante téléphone ; la facture d'exemple complète (instructions de paiement, remerciement) en
tuile haute ; les trois calculateurs ; la tuile du contrat est retirée (le contrat reste dans la liste des outils).
Raccourci « Most used » de l'accueil : « My workspace » à la place du contrat. Pages américaines : 71 points (vitrine :
cinq tuiles, captures chargées, clic, variante téléphone `us-espace-mobile`) ; erreur réintroduite (grande tuile sans
variante téléphone) détectée. **Étape 4 terminée.**


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
- **Faite le 20/11/2026** (lot 3d-2) : formulaire *Schedule C (Form 1040) 2026* (version créée le 15/05/26), intitulés
  des lignes 1 à 7 et 28 à 31, lus par l'action `lire-source`.
- **À relire** : les instructions de l'annexe C 2026 dès leur publication (les lignes du formulaire 2026 sont déjà
  reprises) ; le seuil du formulaire 1099-NEC pour 2027 dès sa publication (indexation).
- **Règles de prospection américaines (préparation, 20/11/2026)** : le guide CAN-SPAM de la FTC n'est pas lisible
  (ftc.gov : nom introuvable depuis l'environnement de travail, réponse 404 depuis l'action `lire-source` ; pas de
  contournement) ; lus à la place, par l'action `lire-source` : la loi elle-même, **15 U.S.C. chapitre 103** (govinfo,
  *US Code* 2023 : § 7702(2) message commercial, § 7702(17) message transactionnel ou de relation, § 7704(a)(1) en-têtes,
  (a)(2) objet trompeur, (a)(3) mécanisme de désinscription valable au moins 30 jours après l'envoi, (a)(4) demande
  respectée au plus tard 10 jours ouvrés après sa réception et adresse jamais cédée, (a)(5) message identifié comme
  publicité sauf accord préalable, possibilité de refuser, adresse postale valide) ; le règlement **16 CFR partie 316**
  (govinfo, édition du 01/01/2025 : § 316.2(p) adresse postale valide = adresse de l'expéditeur, boîte postale ou boîte
  privée enregistrées ; § 316.3 objet principal ; § 316.5 ni frais ni autre exigence pour se désinscrire qu'un email de
  réponse ou une seule page web) ; la loi **TCPA** (47 U.S.C. § 227(a)(4) sollicitation téléphonique, hors permission
  et relation d'affaires établie ; (b)(1) appels automatisés) ; le règlement de la **FCC**, 47 CFR § 64.1200 (édition
  2025 : (a)(2) consentement écrit préalable pour les appels de vente automatisés vers un mobile, (c) heures de 8 h à
  21 h et liste nationale, copie de 31 jours au plus, (d)(3) et (d)(6) liste propre : 10 jours ouvrés, 5 ans, (e) mobiles) ;
  la **règle de vente par téléphone** (16 CFR § 310.6(b) : appels entre un vendeur et une entreprise exemptés, sauf
  § 310.3(a)(2) et (4) et fournitures de bureau ou d'entretien). Règles des États non lues (non reprises, dit à
  l'écran).
