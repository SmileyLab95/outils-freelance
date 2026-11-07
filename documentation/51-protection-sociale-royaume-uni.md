# 51. Protection sociale de l'indépendant au Royaume-Uni : maladie, maternité, fin d'activité

Suite de [50](50-protection-sociale.md) (France), besoins « Arrêt maladie, maternité, accident » et « Chômage et fin
d'activité » de [31](31-vision-plateforme.md) (§ 3.8). Spécification écrite le 07/11/2026 (décision D54), à partir des
pages de GOV.UK lues le même jour (annexe).

## 1. Besoin

Un *sole trader* qui tombe malade, attend un enfant ou voit son activité s'arrêter se demande ce qu'il peut toucher.
Les réponses sont éparses sur GOV.UK et souvent écrites pour les salariés : le *Statutory Sick Pay* et la *Statutory
Maternity Pay* sont versés par un employeur, le *New Style Jobseeker's Allowance* exige des cotisations de salarié.
L'outil dit, pour chacune des trois situations, ce qui est ouvert à l'indépendant, à quelles conditions et pour quel
montant publié.

## 2. Règles (GOV.UK, lu le 07/11/2026)

**Maladie.**
- *Statutory Sick Pay* (règle `uk_statutory_sick_pay`) : jusqu'à **£123.25 par semaine**, « payé par votre
  employeur », pendant 28 semaines au plus. Pas pour l'activité indépendante ; un indépendant qui est aussi salarié
  peut le recevoir de son employeur.
- *New Style Employment and Support Allowance* (règle `uk_new_style_esa`) : sous l'âge de la retraite de l'État, avec
  un handicap ou un problème de santé qui limite le travail ; avoir travaillé comme salarié **ou comme indépendant** et
  payé assez de cotisations (*National Insurance*), en général sur les 2 à 3 dernières années, les crédits comptant
  aussi ; pas en même temps que le JSA ou le SSP. Montants : **taux d'évaluation** pendant 13 semaines en général,
  jusqu'à **£75.65** par semaine avant 25 ans et **£95.55** à partir de 25 ans (prolongé, avec rappel, si l'évaluation
  dure plus longtemps) ; ensuite, jusqu'à **£95.55** dans le *work-related activity group* et **£145.90** dans le
  *support group*. Une pension privée de plus de £85 par semaine réduit l'ESA de la moitié de l'excédent. L'ESA ouvre
  des crédits de cotisation de classe 1. L'*income-related ESA* est fermé aux nouvelles demandes. Le Universal Credit
  peut se cumuler (réduit du montant de l'ESA).

**Maternité** (règle `uk_maternity_allowance`).
- *Statutory Maternity Pay* : versée par un employeur ; « exclusivement indépendant » est une raison de ne pas l'avoir.
  La *Maternity Allowance* n'est possible que sans SMP.
- Conditions : inscrit comme indépendant (ou salarié) **au moins 26 semaines sur les 66 semaines** précédant la
  semaine prévue de l'accouchement (la « période de test »), semaines non consécutives possibles ; salarié : au moins
  £30 par semaine sur 13 semaines.
- Montant pour un indépendant : **de £27 à £194.32 par semaine**, pendant **39 semaines** au plus, selon le nombre de
  semaines de **cotisations de classe 2** payées dans la période de test. Montant maximal : inscrit auprès du HMRC au
  moins 26 semaines **et** classe 2 payée sur au moins **13 semaines** des 66. Aucune classe 2 payée : **£27 par
  semaine**. Entre 1 et 12 semaines : montant calculé selon le nombre de semaines (formule non publiée sur les pages
  lues). Après la demande, le HMRC indique combien de semaines payer en plus pour obtenir le maximum ; la classe 2
  volontaire coûte **£3.65 par semaine** en 2026/27 (règle `class2_voluntary_weekly_rate` ; £3.50 en 2025/26, une
  année passée se payant à son taux). Les paiements sont augmentés et rappelés une fois les cotisations rattachées.
- Conjoint ou partenaire non rémunéré d'un indépendant : £27 par semaine pendant 14 semaines (conditions de la
  période de test ; le conjoint paie la classe 2).
- Demande : formulaire MA1, possible **dès 26 semaines de grossesse** ; versement à partir de la 11e semaine avant la
  semaine prévue au plus tôt, et au plus tard le lendemain de la naissance ; demander **dans les 3 mois** suivant le
  début choisi pour tout recevoir ; décision en **20 jours ouvrés** ; pièces : preuve de la date prévue (MATB1 ou
  lettre du médecin ou de la sage-femme), et de la naissance si elle a eu lieu. Pas d'impôt ni de cotisations sur la
  MA. Versée toutes les 2 ou 4 semaines ; elle réduit le Universal Credit du même montant et arrête le JSA.

**Classe 2 depuis le 6 avril 2024** (règle `class2_status`) : plus de classe 2 obligatoire. Au-dessus du *Small Profits
Threshold* (£7,105 en 2026/27), l'indépendant garde l'accès aux prestations contributives par un **crédit** de
cotisation, sans payer ; en dessous, il peut payer la classe 2 volontairement. **Incertitude signalée** : les pages de
la Maternity Allowance parlent de semaines de classe 2 « payées » et ne disent pas comment comptent ces crédits ;
l'outil ne l'affirme pas et renvoie à la lettre du HMRC qui suit la demande (le guide technique des prestations
maternité, encore rédigé avant 2024, ne tranche pas non plus).

**Fin d'activité** (règle `uk_new_style_jsa`) : le *New Style JSA* exige d'avoir travaillé comme **salarié** et payé
des cotisations de **classe 1** (en général sur les 2 années fiscales précédentes, une année pouvant être couverte par
des crédits). Il n'est **pas ouvert** à l'indépendant qui n'a payé que la classe 2, sauf pêcheur à la part (*share
fisherman*) ou *volunteer development worker*. Autres conditions : 18 ans au moins, sous l'âge de la retraite, en
Grande-Bretagne, moins de 16 heures de travail par semaine ; durée de 182 jours. L'épargne n'est pas prise en compte.
Le Universal Credit (sous conditions de ressources) peut être demandé à la place ou en plus.

**Territoire** : ces pages valent pour la Grande-Bretagne ; l'Irlande du Nord a ses propres règles (GOV.UK le dit pour
le JSA) : l'outil renvoie à nidirect.

## 3. Outil

Une page au Royaume-Uni, **Self-employed sick pay, maternity and out-of-work benefits** (`/uk/self-employed-sick-pay/`,
id `sick-pay`, équivalente de l'arrêt maladie français), menu « Tax and admin » (description : « Tax, deadlines,
expenses, pensions and benefits. »).

Saisie : la situation (*I'm too ill to work*, *I'm having a baby*, *My work has stopped*), puis selon la situation :
- maladie : âge (moins de 25 ans, 25 ans ou plus), cotisations suffisantes sur 2 à 3 ans (oui / je ne sais pas),
  sous l'âge de la retraite, emploi salarié en plus ;
- maternité : au moins 26 semaines d'inscription sur les 66, semaines de classe 2 payées (13 ou plus, 1 à 12, aucune,
  je ne sais pas), SMP possible d'un employeur ;
- fin d'activité : emploi salarié avec classe 1 sur les 2 dernières années fiscales.

Résultat : la prestation principale et son montant publié (par semaine et sur la durée : 13 semaines d'évaluation pour
l'ESA, 39 semaines pour la MA), la liste des conditions (remplie, à vérifier, non remplie) et ce qui n'est pas
ouvert (SSP, JSA) ; pour la MA avec moins de 13 semaines de classe 2 : la fourchette et le coût d'un complément (13
semaines au plus × £3.65 = £47.45 au plus au taux 2026/27) ; démarches et liens GOV.UK. Moteur `engines/benefits-uk.js`
(fonctions pures), chiffres lus dans les règles, textes dans le script de la page.

Hors champ : montants du Universal Credit (sous conditions de ressources, *minimum income floor*), du JSA (l'indépendant
n'y a pas droit), durée maximale de l'ESA dans le *work-related activity group* (non publiée sur les pages lues),
Irlande du Nord, sociétés (le dirigeant salarié de sa société relève des règles des salariés).

## 4. Tests

Moteur : chaque situation, chaque condition seule ; ESA par âge (13 semaines × taux), SSP et JSA refusés à
l'indépendant ; MA : 13 semaines ou plus → £194.32 × 39 = £7,578.48, aucune → £27 × 39 = £1,053, 1 à 12 → fourchette et
complément, SMP possible → pas de MA, moins de 26 semaines → pas de MA ; saisies inconnues refusées. Page : chiffres
cités égaux aux règles ; parcours navigateur (trois situations, accessibilité, trois largeurs), captures relues.

## 5. Réalisation (07/11/2026)

- Moteur `src/assets/engines/benefits-uk.js` (`OFE.benefitsUK` : `esa`, `maternity`, `jsa`, `outcome`) ; script
  `tools/uk-benefits.js` ; page `content/uk/self-employed-sick-pay.html` (id `sick-pay`, reliée à l'arrêt maladie
  français par les balises *hreflang*), ajoutée au menu *Tax and admin* (description « Tax, deadlines, expenses,
  pensions and benefits. ») ; style des conditions « à vérifier » (`.mention-checks .is-check`).
- Règles `uk_new_style_esa`, `uk_maternity_allowance`, `uk_new_style_jsa`, `uk_statutory_sick_pay`
  (`data/rules/uk.json`), notes complètes des lectures ; `class2_status` : libellé corrigé selon sa source (« crédit »,
  la note de politique fiscale ne dit pas « réputée payée »).
- Tests : `tests/unit/benefits-uk.test.mjs` (10 tests, dont la cohérence des chiffres de la page) ; 26 mutants du
  moteur sur 26 détectés ; parcours navigateur dans `tests/e2e/verifier.mjs` (maladie selon l'âge, cotisations
  incertaines, âge de la retraite ; maternité avec 13 semaines, sans classe 2, 1 à 12 semaines, SMP, moins de
  26 semaines ; fin d'activité avec ou sans classe 1) ; 7 mutants du script détectés.
- Relecture des captures (ordinateur, tablette, mobile) : rien à corriger ; seuil de 2025/26 (£6,845) ajouté à côté de
  celui de 2026/27, la période de 66 semaines couvrant les deux années.
- À faire : revoir la MA si GOV.UK précise l'effet des crédits de classe 2 ; montants du JSA (pour qui a aussi été
  salarié) ; Universal Credit (*minimum income floor* des indépendants) ; Irlande du Nord.

## Annexe : sources lues (07/11/2026, outil « Lire une source officielle »)

| Source | Empreinte SHA-256 | Contenu relevé |
|---|---|---|
| GOV.UK, *Employment and Support Allowance (ESA): What you'll get* | 9b433063…a524 | Taux d'évaluation 13 semaines (£75.65 avant 25 ans, £95.55 ensuite), puis £95.55 (*work-related activity group*) ou £145.90 (*support group*), prolongation et rappel, paiement toutes les 2 semaines ; pension privée au-delà de £85 par semaine (lecture du 07/11 à 16 h) |
| GOV.UK, *ESA: Eligibility* | — | Sous l'âge de la retraite, problème de santé, salarié ou indépendant, cotisations suffisantes sur 2 à 3 ans (crédits compris), pas avec le JSA ni le SSP, Universal Credit réduit du montant de l'ESA |
| GOV.UK, *Maternity Allowance: Eligibility* | c69b7e54…ffa4 | 26 semaines sur 66 (indépendant ou salarié), £30 par semaine sur 13 semaines pour un salarié, conjoint non rémunéré (14 semaines, conjoint inscrit et payant la classe 2), bébé perdu |
| GOV.UK, *Maternity Allowance: What you'll get* | 9567a081…44a6 | £194.32 ou 90 % du salaire (salarié) ; indépendant : £27 à £194.32 par semaine, 39 semaines, selon la classe 2 des 66 semaines ; maximum avec 26 semaines d'inscription et 13 semaines de classe 2 ; £27 sans classe 2 ; complément après la demande, classe 2 à £3.65 ; conjoint £27 pendant 14 semaines ; versements toutes les 2 ou 4 semaines ; effets sur les autres prestations |
| GOV.UK, *Maternity Allowance: How to claim* | — | Dès 26 semaines de grossesse ; début entre la 11e semaine avant la date prévue et le lendemain de la naissance ; 3 mois pour tout recevoir ; formulaire MA1 ; pièces ; décision en 20 jours ouvrés ; *mandatory reconsideration* |
| GOV.UK, *Maternity benefits: technical guidance* | — | SMP impossible pour l'indépendant exclusif ; règles de la période de test (66 semaines jusqu'à la semaine précédant la semaine prévue), semaines couvertes par la classe 2 ; texte antérieur à 2024 (taux de 2015), cité pour le principe seulement |
| GOV.UK, *Jobseeker's Allowance (JSA): Eligibility* | — | Salarié et classe 1 sur les 2 dernières années fiscales ; indépendant avec la seule classe 2 exclu (sauf *share fisherman*, *volunteer development worker*) ; 18 ans, sous l'âge de la retraite, Grande-Bretagne, moins de 16 heures ; 182 jours ; Irlande du Nord à part |
| GOV.UK, *Statutory Sick Pay (SSP)* | — | Jusqu'à £123.25 par semaine, payé par l'employeur, 28 semaines au plus |
| GOV.UK, note de politique fiscale sur la suppression de la classe 2 obligatoire (6 avril 2024) | 65957e2e…d2b3 | Accès aux prestations contributives conservé par un crédit au-dessus du seuil ; classe 2 volontaire en dessous |
