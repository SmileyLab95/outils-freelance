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

### 1.2 À lire avant le moteur (étape 1, faite le 20/11/2026 : § 6)

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

### 3.1 Moteur (`engines/espace-uk.js`, fait le 20/11/2026, D98)

Fabrique `create(textes)` sur le cœur commun, avec le moteur de facture international (aperçu et totaux du générateur
public) et les règles de `data/rules/uk.json`. Fonctions pures, testées par `tests/unit/espace-uk.test.mjs`.

| Fonction | Rôle | Règles |
|---|---|---|
| `taxYearOf`, `taxYear` | Année fiscale d'une date (du 6 avril au 5 avril), libellé « 2026/27 » | `tax_year_start`, `tax_year_end` |
| `income` | Livre des recettes en caisse : encaissement à sa date de réception, remboursement d'un avoir déduit | `cash_basis_default`, notes de la case 9 |
| `checkExpense`, `expenseBoxes` | Dépense rangée dans une case 11 à 19 du SA103S ; totaux par case, total en case 20 | `uk_sa103s_boxes`, `uk_allowable_expenses` |
| `summary`, `summaryCSV` | Cases 9, 10, 10.1, 11 à 22 et 28 ou 32 ; pages complètes à partir de 90 000 £ ; recettes jusqu'à 1 000 £ ; allocation plus favorable que les dépenses | `uk_sa103s_boxes`, `trading_allowance` |
| `mtdPeriods`, `quarters`, `mtdUpdates` | Périodes standard (ou calendaires) et dates limites ; totaux cumulés depuis le 6 avril, par case, et part du trimestre ; état d'après la date du jour | `uk_mtd_itsa_update_periods` |
| `mtdStatus` | Concerné ou non pour chaque année de départ (2026, 2027, 2028) : revenu éligible saisi, sinon recettes de l'Espace (cases 9 et 10) et loyers saisis, face au seuil (« more than ») | `uk_mtd_itsa_qualifying_income`, `mtd_itsa_threshold_*` |
| `vatTurnover` | Facturé hors taxe sur les 12 derniers mois, par date de facture, avoirs déduits ; part des clients hors du Royaume-Uni donnée à part, sans l'exclure | `vat_registration_threshold`, `outside_scope_not_taxable_turnover` |
| `estimatedTax` | Impôt et Class 4 de `taxUK.soleTrader`, comme le calculateur public : bénéfice prévu, sinon bénéfice à date au prorata des jours de l'année fiscale | barème de l'année des règles |
| `taxSchedule` | Solde de l'année précédente saisi ; acomptes de l'année (moitié de l'impôt de l'année précédente saisi, sauf sous 1 000 £ ou sans acompte demandé) ; solde de l'année ; acomptes de l'année suivante | `payments_on_account_*`, `sa_balancing_payment_deadline` |
| `forecast`, `owed` | Prévision avec les paiements de l'échéancier moins le déjà versé ; montants inconnus signalés ; déjà dû au prorata du bénéfice réalisé | idem |
| `lateInterest`, `email` | Intérêts légaux et indemnité fixe d'une facture en retard (taux de référence du semestre où elle est devenue exigible), phrase de la relance d'un client professionnel | `late_payment_*`, `boe_bank_rate` |

Choix (D98) : numéros `2026-001`, `Q-2026-001` (*quotes*) et `CN-2026-001` (*credit notes*) ; un remboursement versé au
client vient en déduction des recettes de la case 9 (les notes n'en parlent pas : c'est dit à l'écran) ; périodes
standard de MTD seules proposées en version 1 (« Your software will be set to use standard update periods ») ; impôt de
l'année précédente et acomptes déjà versés saisis par l'utilisateur ; seuil de VAT : indicateur sur ce qui est facturé
(l'Espace ne sait pas quelles ventes sont exonérées ou hors du champ), présenté comme tel.

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
- **20/11/2026 (soir)** : lectures finies (§ 6 : HS222, mises à jour trimestrielles de MTD, articles 2 et 26 du PECR,
  cases 9, 10 et 26 à 32 du SA103S) ; deux règles nouvelles (`uk_allowable_expenses`, `uk_mtd_itsa_update_periods`) ;
  **étape 2 faite** : moteur `engines/espace-uk.js` (§ 3.1, D98) et 13 tests (critères K3 à K7), chacun vérifié en
  réintroduisant l'erreur qu'il doit détecter (32 erreurs réintroduites ; les 7 d'abord non détectées l'ont été après six
  contrôles ajoutés et une condition redondante retirée).
  Prochaine étape : écrans (`tools/espace-uk-ui.js`), variante en-GB des textes communs, page en brouillon.
- **20/11/2026 (nuit)** : **étape 3, premier lot fait** (D99) : module d'écrans `tools/espace-uk-ui.js` (profil avec
  région fiscale, immatriculation à la VAT et intérêts légaux dans les relances ; clients hors du Royaume-Uni ; choix de
  VAT des documents identique au générateur public ; recettes par année fiscale et trimestre de MTD ; dépenses par case
  avec l'aide de HS222 ; synthèse du SA103S ; écran « Tax » : impôt, échéancier des acomptes et soldes, données de
  l'année, seuil de VAT ; écran « Making Tax Digital » ; tableau de bord, échéances, trésorerie, règles du PECR) ;
  textes `tools/espace-uk-texts-en.js` ; variante `tools/espace-texts-en-GB.js` (62 textes communs : *quote*, *credit
  note*, *cancelled*, *tick*, ponctuation britannique, lien vers la page de relance britannique) ; page en brouillon
  `/uk/workspace/` ; parcours `tests/e2e/espace-uk.mjs` sur les brouillons : 89 points (K2 : aperçu identique au
  générateur ; K3 à K7 à l'écran ; K8 : textes britanniques, accessibilité, trois largeurs). Captures relues : deux
  défauts corrigés (année de référence de MTD pas finie présentée « Doesn't apply » ; libellé de la case 9).
  **Reste avant publication** : le tableau de bord commun affiche encore l'encaissé de l'année civile (« Collected in
  2026 ») : crochet du pays pour l'année fiscale ; texte de la page, questions fréquentes, sources, menu, encarts,
  vitrine (comme D96).

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
- **Making Tax Digital** (gov.uk, lus le 20/11/2026) : concerné si *sole trader* inscrit au Self Assessment avec un
  revenu éligible au-dessus du seuil ; seuil de 50 000 £ sur 2024-25 (dès le 6 avril 2026), 30 000 £ sur 2025-26 (dès
  2027), 20 000 £ sur 2026-27 (dès 2028) ; revenu éligible = revenus **bruts** d'activité indépendante et de location
  (exemple officiel : 25 000 £ de loyers + 27 000 £ d'activité = 52 000 £), sans salaires, part d'associé, dividendes ni
  pensions ; HMRC écrit, mais l'absence de lettre ne dispense pas de vérifier. Règle `uk_mtd_itsa_qualifying_income`.
- **Prospection** : règlement PECR 2003, articles 22 (emails et SMS aux abonnés **individuels** : accord préalable,
  sauf *soft opt-in* à trois conditions) et 21 (appels : numéro présenté ; pas d'appel à qui s'y est opposé ni aux
  numéros du registre de l'article 26, sauf inscrits depuis moins de 28 jours), lus sur legislation.gov.uk. Règles
  `uk_pecr_email`, `uk_pecr_calls`. Article 2 lu ensuite : un « individual » est une personne physique **et** un
  groupement de personnes physiques sans personnalité morale (*sole traders* et *partnerships* sont donc des abonnés
  individuels) ; l'*electronic mail* comprend les SMS ; l'article 22 ne vise pas les abonnés d'entreprise (sociétés).
  Article 26 lu : registre des numéros dont l'abonné ne veut pas d'appels de prospection ; inscription d'une entreprise
  par écrit, rappel annuel ; consultation payante. Le nom public du registre n'est pas dans le texte : l'Espace dira
  « le registre de l'article 26 » sans nommer de service.
- **Registres** (« What records to keep ») : dépenses, VAT, paie, revenus personnels ; preuves (reçus, relevés,
  talons de chèques, factures de vente) ; règle `uk_records_proof` (le premier élément de la liste est à relire).
- **Paramètres de facture** : ceux du générateur britannique déplacés dans `data/invoice-profiles/uk.json` (balise
  `{{invoice_profile:uk}}`, contenu identique vérifié ; pages britanniques 69/69).
- **Fiche HS222 2026** (version HTML, mise à jour le 7 avril 2026), lue le 20/11/2026 : section 6, tableau des
  dépenses admises et non admises par catégorie (repris mot pour mot, lignes de la comptabilité de caisse seules : règle
  `uk_allowable_expenses`, rangée par case du SA103S ; la publicité, sans case propre sur la version courte, va en case
  19, confiance moyenne : les notes du SA103S n'ont pas d'aide case par case et renvoient à HS222) ; section 7 : en
  caisse, les biens d'équipement sont déductibles, sauf voitures, terrains, formation et autres exceptions ;
  section 13 : en caisse, un assujetti à la VAT peut tenir ses comptes TTC ou HT.
- **Mises à jour trimestrielles de MTD** (gov.uk, lues le 20/11/2026) : périodes standard du 6 avril au 5 juillet,
  5 octobre, 5 janvier et 5 avril, dates limites du 7 août, 7 novembre, 7 février et 7 mai ; périodes calendaires
  (1er avril au 30 juin…) au choix, logiciels réglés sur les périodes standard ; chaque mise à jour couvre l'année depuis
  son début ; totaux par catégorie, mêmes catégories que le Self Assessment ; aucune pièce envoyée ; mise à jour due
  même sans recette ni dépense. Règle `uk_mtd_itsa_update_periods`.
- **SA103S, cases 9, 10 et 26 à 32** (formulaire et notes, relus le 20/11/2026) : case 9 = « the total amount of income
  received (cash basis) … before taking off any expenses » ; case 10 : autres recettes de l'activité ; case 10.1 : au
  plus 1 000 £, jamais de perte ; case 28 « Net business profit for tax purposes » = 21 − 22 (ou 21 − 10.1 avec
  l'allocation) ; case 32 « Net business loss for tax purposes » ; case 31 « Total taxable profits from this business »
  (pertes antérieures et case 30 hors version 1). Les remboursements aux clients ne sont pas cités (D98).
- **Seuil de VAT** (gov.uk « Register for VAT » et VAT Notice 700/1, relus le 20/11/2026) : inscription si le chiffre
  d'affaires taxable des 12 derniers mois dépasse 90 000 £, dans les 30 jours suivant la fin du mois du dépassement
  (exemple officiel : dépassement le 15 juillet, inscription au plus tard le 30 août, effet au 1er septembre) ; Notice
  700/1, 4.2 : constat « at the end of any month » sur les 12 derniers mois ; ventes exonérées ou hors du champ : pas
  d'obligation. L'indicateur de l'Espace (12 derniers mois jusqu'à aujourd'hui, par date de facture) suit cette mesure
  et reste présenté comme un indicateur (l'Espace ne distingue pas les ventes exonérées ou hors du champ).
