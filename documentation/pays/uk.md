# Royaume-Uni : règles fiscales et sociales du freelance (année fiscale 2026/27)

- **Année fiscale couverte :** 2026/27, du 6 avril 2026 au 5 avril 2027 (avec les chiffres 2025/26 quand ils servent encore, par exemple pour la déclaration due le 31 janvier 2027).
- **Vérifié le :** 20 octobre 2026.
- **Données pour les calculateurs :** `data/rules/uk.json`. Les taux y sont en décimales (0,2 = 20 %), et chaque valeur indique sa source et un niveau de confiance.
- **Méthode :** les chiffres viennent de sources officielles (gov.uk, legislation.gov.uk, gov.scot, gov.wales, bankofengland.co.uk, bills.parliament.uk). Les pages n'ont pas pu être téléchargées directement depuis cet environnement (accès réseau bloqué). Chaque chiffre a donc été relevé dans les extraits des pages officielles renvoyés par le moteur de recherche, puis recoupé quand c'était possible. Il faut faire un contrôle sur les pages en ligne avant de publier un calculateur (voir la section 9).

---

## 1. Résumé pour le freelance britannique

### *Sole trader* ou *limited company*

**Le *sole trader*** (entrepreneur individuel) est le statut par défaut. Il s'inscrit à la *Self Assessment* auprès du HMRC avant le 5 octobre qui suit la fin de sa première année fiscale. Son bénéfice (*trading profits*) est soumis à deux prélèvements :

- l'*Income Tax*, au barème progressif après la *Personal Allowance* de 12 570 £ ;
- les *Class 4 National Insurance contributions* : 6 % entre 12 570 £ et 50 270 £, puis 2 % au-delà.

Il n'y a plus de *Class 2* obligatoire depuis le 6 avril 2024. Au-dessus de la *Small Profits Threshold* (7 105 £ en 2026/27), les droits à la retraite d'État sont acquis gratuitement. En dessous, on peut cotiser volontairement 3,65 £ par semaine.

Les petites activités disposent d'un abattement : la *trading allowance* de 1 000 £ de recettes brutes. Les *simplified expenses* (frais forfaitaires) couvrent les kilomètres et le bureau à domicile. Depuis 2024/25, la comptabilité de trésorerie (*cash basis*) est le régime par défaut.

**La *limited company*** (équivalent de la SARL ou SASU à associé unique) est une personne morale :

- le bénéfice supporte la *Corporation Tax* : 19 % jusqu'à 50 000 £, 25 % au-delà de 250 000 £, avec une *marginal relief* entre les deux, soit un taux marginal effectif de 26,5 % ;
- le dirigeant se verse en général un petit salaire, puis des dividendes ;
- les dividendes sont imposés à 10,75 %, 35,75 % ou 39,35 % en 2026/27, après une *dividend allowance* de 500 £.

**Changements défavorables à la société en 2026/27 :**

- **Dividendes :** le *Budget* du 26 novembre 2025 a relevé de 2 points les taux *ordinary* et *upper* (de 8,75 % à 10,75 % et de 33,75 % à 35,75 %) à partir du 6 avril 2026.
- **Cotisations patronales :** depuis avril 2025, elles sont de 15 % au-delà de seulement 5 000 £ de salaire.
- **Société à un seul salarié :** l'*Employment Allowance* (10 500 £) est refusée à une société dont le seul salarié payé au-dessus du seuil est l'unique dirigeant.

**Illustration simplifiée (Angleterre, bénéfice entièrement distribué, sans pension, sans frais de comptable ni bénéfice laissé dans la société) :**

| Bénéfice avant rémunération | Net *sole trader* | Net *limited company* (salaire 12 570 £ + dividendes) | Net *limited company* (salaire 5 000 £ + dividendes) |
|---|---|---|---|
| 50 000 £ | 40 268,20 £ | 38 861,95 £ | 38 399,15 £ |
| 80 000 £ | 57 711,40 £ | 55 764,87 £ | 55 012,21 £ |

En 2026/27, la société n'est plus avantageuse pour un freelance seul qui distribue tout son bénéfice. Elle peut le redevenir si le bénéfice reste dans la société (taux de 19 % ou 25 %), en cas de cotisations de retraite versées par l'employeur, ou pour des raisons de responsabilité limitée et d'image auprès des clients. Pour un *sole trader* écossais, le net à 50 000 £ est de 38 772,15 £, car l'impôt est plus élevé en Écosse.

### IR35 en bref

L'**IR35**, ou *off-payroll working rules*, vise le freelance qui travaille pour un client via un intermédiaire, le plus souvent sa propre *personal service company*. Il s'applique quand ce freelance serait un salarié du client s'il était engagé directement. Les critères sont le contrôle, la prestation personnelle sans réelle possibilité de substitution et l'obligation réciproque. Si la mission est « *inside IR35* », la rémunération est taxée en gros comme un salaire, avec l'*Income Tax* et les cotisations *Class 1* salariales et patronales. L'avantage des dividendes disparaît alors. Un *sole trader* qui facture en son nom propre n'est pas concerné par l'IR35, mais son statut peut quand même être requalifié en salariat.

**Qui décide :**

- **Client public, ou client privé moyen ou grand :** c'est le client qui détermine le statut. Il remet un *Status Determination Statement* motivé, et le payeur (client ou agence) prélève l'impôt et les cotisations à la source. Le freelance peut contester la décision : le client a 45 jours pour répondre.
- **Petit client privé :** c'est la société du freelance qui décide et qui déclare elle-même le *deemed employment payment*.

Une entreprise est « petite » si elle remplit au moins deux de ces trois critères (exercices ouverts à partir du 6 avril 2025) :

- chiffre d'affaires d'au plus 15 M£ ;
- total de bilan d'au plus 7,5 M£ ;
- 50 salariés au plus.

L'outil officiel d'aide à la décision est *CEST* (*Check Employment Status for Tax*). Sources : [Understanding off-payroll working (IR35)](https://www.gov.uk/guidance/understanding-off-payroll-working-ir35), [ESM10006A](https://www.gov.uk/hmrc-internal-manuals/employment-status-manual/esm10006a).

---

## 2. Chiffres 2026/27 et leurs sources

Abréviations :

- **rUK :** *rest of UK*, c'est-à-dire l'Angleterre, le pays de Galles et l'Irlande du Nord.
- **Revenu imposable :** revenu après déduction de la *Personal Allowance*.
- **Confiance :** H = haute, M = moyenne.

### 2.1 Impôt sur le revenu (*Income Tax*)

| Élément | 2026/27 | 2025/26 | Source | Conf. |
|---|---|---|---|---|
| *Personal Allowance* | 12 570 £ | 12 570 £ | [GOV.UK – Income Tax rates](https://www.gov.uk/income-tax-rates) | H |
| Réduction de la *Personal Allowance* (*taper*) | −1 £ pour 2 £ au-delà de 100 000 £ (*adjusted net income*), nulle à 125 140 £ | idem | [GOV.UK – Income Tax rates](https://www.gov.uk/income-tax-rates) | H |
| Gel des seuils | jusqu'au 5 avril 2031 (*Personal Allowance*, *basic rate limit* et seuils NIC équivalents) | – | [GOV.UK – Maintaining thresholds until 2031](https://www.gov.uk/government/publications/maintaining-income-tax-and-equivalent-national-insurance-contributions-thresholds-until-5-april-2031/income-tax-maintaining-the-personal-allowance-and-the-basic-rate-limit-for-income-tax-and-equivalent-national-insurance-contributions-thresholds-unt) | H |
| rUK *basic rate* | 20 % sur 0 – 37 700 £ imposables (12 571 – 50 270 £ bruts) | idem | [GOV.UK – rates and allowances](https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past) | H |
| rUK *higher rate* | 40 % sur 37 701 – 125 140 £ imposables | idem | idem | H |
| rUK *additional rate* | 45 % au-delà de 125 140 £ | idem | idem | H |
| Pays de Galles | *Welsh rate* de 10 p dans chaque tranche, donc des taux identiques à l'Angleterre | idem | [GOV.UK – Income Tax in Wales](https://www.gov.uk/welsh-income-tax), [gov.wales](https://www.gov.wales/written-statement-draft-budget-2026-27-welsh-taxes) | H |
| Écosse *starter* | 19 % : 12 571 – 16 537 £ bruts (0 – 3 967 £ imposables) | 12 571 – 15 397 £ | [GOV.UK – Income Tax in Scotland](https://www.gov.uk/scottish-income-tax), [gov.scot](https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/2026-to-2027/) | H |
| Écosse *basic* | 20 % : 16 538 – 29 526 £ (3 968 – 16 956 £ imposables) | 15 398 – 27 491 £ | idem | H |
| Écosse *intermediate* | 21 % : 29 527 – 43 662 £ (16 957 – 31 092 £ imposables) | 27 492 – 43 662 £ | idem | H |
| Écosse *higher* | 42 % : 43 663 – 75 000 £ (31 093 – 62 430 £ imposables) | idem | idem | H |
| Écosse *advanced* | 45 % : 75 001 – 125 140 £ (62 431 – 125 140 £ imposables) | idem | idem | H |
| Écosse *top* | 48 % au-delà de 125 140 £ | idem | idem | H |

En Écosse, seuls les revenus d'activité (salaires, bénéfices, pensions) suivent le barème écossais. L'épargne et les dividendes suivent les taux britanniques. Les tranches écossaises 2026/27 ont été annoncées au *Scottish Budget* du 13 janvier 2026 : +7,4 % pour les seuils *basic* et *intermediate*, les autres seuils étant gelés. Dans le JSON, les tranches sont exprimées en **revenu imposable**. La clé `income_tax_bands_scotland_gross_standard_pa` reprend l'affichage en brut de GOV.UK et ne sert qu'à l'affichage.

### 2.2 Cotisations sociales de l'indépendant (*National Insurance*)

| Élément | 2026/27 | 2025/26 | Source | Conf. |
|---|---|---|---|---|
| *Class 4 lower profits limit* | 12 570 £ | 12 570 £ | [GOV.UK – Rates and allowances: NICs](https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions) | H |
| *Class 4 upper profits limit* | 50 270 £ | 50 270 £ | idem | H |
| *Class 4 main rate* | 6 % | 6 % | [GOV.UK – Self-employed NI rates](https://www.gov.uk/self-employed-national-insurance-rates) | H |
| *Class 4 additional rate* (au-delà de 50 270 £) | 2 % | 2 % | idem | H |
| *Class 2* | plus obligatoire depuis le 6 avril 2024 ; considérée comme payée si le bénéfice atteint la *Small Profits Threshold* | idem | [GOV.UK – removal of Class 2](https://www.gov.uk/government/publications/changes-to-national-insurance-contributions-from-6-january-2024/a-reduction-in-the-main-rates-of-primary-class-1-and-class-4-national-insurance-contributions-and-the-removal-of-the-requirement-to-pay-class-2-nation) | H |
| *Small Profits Threshold* | 7 105 £ | 6 845 £ | [GOV.UK – Self-employed NI rates](https://www.gov.uk/self-employed-national-insurance-rates), [projet de règlement 2026](https://www.legislation.gov.uk/ukdsi/2026/9780348278415/pdfs/ukdsi_9780348278415_en.pdf) | H |
| *Class 2* volontaire | 3,65 £ par semaine | 3,50 £ par semaine | [GOV.UK – Voluntary NI rates](https://www.gov.uk/voluntary-national-insurance-contributions/rates) | H |
| *Class 3* volontaire | 18,40 £ par semaine | non vérifié | idem | H |

Depuis le 6 avril 2026, on ne peut plus verser de *Class 2* volontaire pour les périodes passées à l'étranger : seule la *Class 3* reste possible ([GOV.UK](https://www.gov.uk/government/publications/voluntary-national-insurance-contributions-for-periods-abroad-from-6-april-2026/voluntary-national-insurance-contributions-abroad-from-6-april-2026)).

### 2.3 Abattements et frais forfaitaires (*simplified expenses*)

| Élément | 2026/27 | 2025/26 | Source | Conf. |
|---|---|---|---|---|
| *Trading allowance* | 1 000 £ de recettes brutes ; on choisit soit cet abattement, soit les frais réels | idem | [GOV.UK – Tax-free allowances](https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income) | H |
| Indemnité kilométrique, voiture ou utilitaire, 10 000 premiers *miles* | **55 p par *mile*** (hausse annoncée le 21 mai 2026, rétroactive au 6 avril 2026) | 45 p | [GOV.UK – Simplified expenses: vehicles](https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles), [GOV.UK – Increase to AMAPs](https://www.gov.uk/government/publications/increase-to-approved-mileage-allowance-payments-amaps-and-self-employed-simplified-mileage-rates) | H |
| Même indemnité au-delà de 10 000 *miles* | 25 p | 25 p | idem | H |
| Moto | 24 p par *mile* | 24 p | idem | H |
| Bureau à domicile, forfait mensuel | 25 à 50 h : 10 £ ; 51 à 100 h : 18 £ ; 101 h et plus : 26 £ | idem | [GOV.UK – Simplified expenses](https://www.gov.uk/simpler-income-tax-simplified-expenses) | H |
| *Cash basis* par défaut | depuis 2024/25 | idem | [GOV.UK – Cash basis](https://www.gov.uk/simpler-income-tax-cash-basis) | M |

Attention : le chiffre de 45 p, encore très repris en ligne, est **périmé** depuis le 6 avril 2026. Les *simplified expenses* sont réservées aux *sole traders* et aux *partnerships* sans associé société.

### 2.4 Chiffres de comparaison avec la *limited company*

| Élément | 2026/27 | 2025/26 | Source | Conf. |
|---|---|---|---|---|
| *Corporation Tax small profits rate* (bénéfice jusqu'à 50 000 £) | 19 % | 19 % | [GOV.UK – Corporation Tax rates](https://www.gov.uk/government/publications/rates-and-allowances-corporation-tax/rates-and-allowances-corporation-tax) | H |
| *Corporation Tax main rate* (au-delà de 250 000 £) | 25 % | 25 % | idem | H |
| *Marginal relief fraction* | 3/200, soit un taux marginal effectif de 26,5 % entre 50 000 et 250 000 £ | idem | [GOV.UK – Marginal Relief](https://www.gov.uk/guidance/corporation-tax-marginal-relief) | H |
| *Dividend allowance* | 500 £ | 500 £ | [GOV.UK – Tax on dividends](https://www.gov.uk/tax-on-dividends) | H |
| *Dividend ordinary rate* | **10,75 %** | 8,75 % | [GOV.UK – technical note, Budget 2025](https://www.gov.uk/government/publications/changes-to-tax-rates-for-property-savings-and-dividend-income/change-to-tax-rates-for-property-savings-and-dividend-income-technical-note) | H |
| *Dividend upper rate* | **35,75 %** | 33,75 % | idem | H |
| *Dividend additional rate* | 39,35 % | 39,35 % | [GOV.UK – Tax on dividends](https://www.gov.uk/tax-on-dividends) | H |
| *Class 1* salarié : *primary threshold* | 12 570 £ (242 £ par semaine) | idem | [GOV.UK – Rates and thresholds for employers 2026 to 2027](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027) | H |
| *Class 1* salarié : taux | 8 % jusqu'à 50 270 £ (967 £ par semaine), puis 2 % | idem | idem | H |
| *Lower earnings limit* | 6 708 £ (129 £ par semaine) | 6 500 £ (125 £ par semaine) | idem | H |
| *Class 1* employeur : *secondary threshold* | 5 000 £ (96 £ par semaine, 417 £ par mois) | 5 000 £ | idem | H |
| *Class 1* employeur : taux (et *Class 1A*) | 15 % | 15 % | idem | H |
| *Employment Allowance* | 10 500 £ ; exclue si le seul salarié au-dessus du seuil est l'unique dirigeant | 10 500 £ | [GOV.UK – Employment Allowance](https://www.gov.uk/claim-employment-allowance), [NIM06545](https://www.gov.uk/hmrc-internal-manuals/national-insurance-manual/nim06545) | H |

L'exercice de *Corporation Tax* 2026 (*financial year 2026*) court du 1er avril 2026 au 31 mars 2027. Les seuils de 50 000 et 250 000 £ sont réduits au prorata pour un exercice de moins de 12 mois, et divisés par le nombre de sociétés associées.

---

## 3. Calendrier fiscal (*Self Assessment*)

| Date | Événement | Source |
|---|---|---|
| 31 juillet 2026 | 2e *payment on account* 2025/26 | [Payments on account](https://www.gov.uk/understand-self-assessment-bill/payments-on-account) |
| 5 octobre 2026 | Date limite d'inscription à la *Self Assessment* pour un revenu apparu en 2025/26 (passée) | [SA deadlines](https://www.gov.uk/self-assessment-tax-returns/deadlines) |
| **31 octobre 2026** | Déclaration papier 2025/26 (reçue avant 23 h 59) | idem |
| **31 janvier 2027** | Déclaration en ligne 2025/26, solde 2025/26 et 1er *payment on account* 2026/27 | idem |
| 31 juillet 2027 | 2e *payment on account* 2026/27 | [Payments on account](https://www.gov.uk/understand-self-assessment-bill/payments-on-account) |
| 5 octobre 2027 | Inscription pour un revenu apparu en 2026/27 | [SA deadlines](https://www.gov.uk/self-assessment-tax-returns/deadlines) |
| 31 octobre 2027 | Déclaration papier 2026/27 | idem |
| 31 janvier 2028 | Déclaration en ligne et solde 2026/27 | idem |

**Règles générales :**

- inscription : 5 octobre après la fin de l'année fiscale ;
- déclaration papier : 31 octobre ;
- déclaration en ligne et paiement du solde : 31 janvier ;
- *payments on account* : 31 janvier pendant l'année et 31 juillet après.

**Acomptes (*payments on account*) :** deux versements, chacun égal à 50 % de l'impôt de l'année précédente (*Income Tax* et *Class 4*). On en est dispensé si l'une de ces deux conditions est remplie pour l'année précédente :

- l'impôt dû via la *Self Assessment* était inférieur à 1 000 £ ;
- au moins 80 % de l'impôt avait été prélevé à la source (PAYE).

Une consultation de juin 2026 (*Timely Payments in ITSA*) envisage de réformer ces acomptes, notamment par des acomptes prélevés via le PAYE à partir d'avril 2029.

**Pénalités de retard de déclaration (régime actuel, hors MTD) :**

- 100 £ immédiatement, même sans impôt dû ;
- après 3 mois, 10 £ par jour pendant 90 jours au plus (900 £) ;
- après 6 mois, 5 % de l'impôt dû, avec un minimum de 300 £ ;
- après 12 mois, à nouveau 5 % ou 300 £ (confiance moyenne, voir la section 9).

**Pénalités de retard de paiement :** 5 % de l'impôt impayé à 30 jours, puis à nouveau à 6 mois et à 12 mois.

**Intérêts de retard du HMRC :** *Bank Rate* + 4 points, soit **7,75 % depuis le 9 janvier 2026**. Les intérêts moratoires versés par le HMRC sur ses remboursements sont de *Bank Rate* − 1 point, avec un plancher de 0,5 %, soit 2,75 % ([GOV.UK – HMRC interest rates](https://www.gov.uk/government/publications/rates-and-allowances-hmrc-interest-rates-for-late-and-early-payments/rates-and-allowances-hmrc-interest-rates)).

---

## 4. *Making Tax Digital for Income Tax* (MTD ITSA)

| Entrée dans le dispositif | Revenu de référence (*qualifying income*) | Année de mesure | Source | Conf. |
|---|---|---|---|---|
| 6 avril 2026 | plus de 50 000 £ | 2024/25 | [Sign up for MTD](https://www.gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax) | H |
| 6 avril 2027 | plus de 30 000 £ | 2025/26 | [MTD step by step](https://www.gov.uk/government/collections/making-tax-digital-for-income-tax-for-sole-traders-and-landlords-step-by-step) | H |
| 6 avril 2028 | plus de 20 000 £ | 2026/27 | idem | M |

Le *qualifying income* est le total **brut**, avant frais, des recettes d'activité indépendante et des revenus fonciers. Les *limited companies* ne sont pas concernées.

**Obligations :**

- tenir une comptabilité numérique dans un logiciel compatible ;
- envoyer quatre *quarterly updates* par an, de façon cumulative ;
- déposer une déclaration annuelle avant le 31 janvier suivant l'année.

**Échéances trimestrielles 2026/27 :** 7 août 2026 (passée), **7 novembre 2026** (la prochaine), 7 février 2027 et 7 mai 2027. Les trimestres standards vont du 6 avril au 5 juillet, du 6 juillet au 5 octobre, du 6 octobre au 5 janvier et du 6 janvier au 5 avril. On peut opter pour des trimestres calendaires (à partir du 1er avril) : les échéances restent les mêmes. La déclaration annuelle 2026/27 est due le 31 janvier 2028 ([GOV.UK – MTD updates](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/updates)).

**Pénalités MTD** ([GOV.UK – Penalties for MTD](https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax), confiance moyenne) :

- **Retard de dépôt :** un point de pénalité par échéance manquée. À 4 points, une amende de 200 £ s'applique, puis 200 £ à chaque nouveau manquement. Les points expirent au bout de 24 mois tant que le seuil n'est pas atteint. Aucun point n'est attribué pour les *quarterly updates* en retard en 2026/27.
- **Retard de paiement :** rien jusqu'à 15 jours. En 2026/27 : 3 % de l'impôt impayé au 15e jour, plus 3 % au 30e jour, puis 10 % par an à compter du 31e jour. En 2027/28, les deux pénalités passeraient à 4 % chacune. La première année, un délai de grâce de 30 jours s'applique une seule fois.

---

## 5. TVA (*VAT*)

| Élément | Valeur | Source | Conf. |
|---|---|---|---|
| Taux normal | 20 % | [GOV.UK – VAT rates](https://www.gov.uk/vat-rates) | H |
| Taux réduit | 5 % (énergie domestique, sièges auto pour enfants, etc.) | idem | H |
| Taux zéro | 0 % (la plupart des aliments, vêtements d'enfants, livres) : opération taxable, à ne pas confondre avec une opération *exempt* | idem | H |
| Seuil d'immatriculation (*registration threshold*) | 90 000 £ de chiffre d'affaires taxable sur 12 mois glissants, ou prévus sur les 30 prochains jours seuls ; en vigueur depuis le 1er avril 2024 et toujours valable en avril 2026 | [GOV.UK – VAT thresholds](https://www.gov.uk/how-vat-works/vat-thresholds), [Budget 2025 Annex A](https://www.gov.uk/government/publications/budget-2025-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances) | H |
| Seuil de radiation (*deregistration threshold*) | 88 000 £ | [VAT Notice 700/1 supplement](https://www.gov.uk/government/publications/vat-notice-7001-should-i-be-registered-for-vat/vat-notice-7001-supplement--2) | H |
| *Flat Rate Scheme* : entrée | chiffre d'affaires prévu d'au plus 150 000 £ hors TVA | [GOV.UK – Flat Rate Scheme](https://www.gov.uk/vat-flat-rate-scheme) | H |
| *Flat Rate Scheme* : sortie | plus de 230 000 £ TTC (test annuel, ou sur les 30 prochains jours) | [If your circumstances change](https://www.gov.uk/vat-flat-rate-scheme/if-your-circumstances-change) | H |
| Taux *limited cost business* | 16,5 % du chiffre d'affaires TTC, quel que soit le secteur | [Work out your flat rate](https://www.gov.uk/vat-flat-rate-scheme/how-much-you-pay) | H |
| Réduction la première année | −1 point (15,5 % pour une *limited cost business*) | idem | H |
| Déclaration et paiement | en général trimestriels, 1 mois et 7 jours après la fin de la période, via un logiciel MTD | [VAT Returns deadlines](https://www.gov.uk/vat-returns/deadlines) | M |

Une entreprise est une ***limited cost business*** si ses achats de biens (TTC) sont inférieurs à 2 % de son chiffre d'affaires TTC, ou s'ils dépassent 2 % mais restent inférieurs à 1 000 £ par an. Les immobilisations, la nourriture et les véhicules, pièces et carburant ne comptent pas comme achats de biens. Un freelance de services est presque toujours dans ce cas, ce qui rend le *Flat Rate Scheme* rarement intéressant pour lui.

---

## 6. Règles de facturation

**Toute facture** ([GOV.UK – Invoices: what they must include](https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include)) doit comporter :

- un numéro unique ;
- le nom, l'adresse et les coordonnées du fournisseur ;
- le nom et l'adresse du client ;
- une description claire de la prestation ;
- la date de la prestation et la date de la facture ;
- les montants facturés, la TVA éventuelle et le total dû.

Une entreprise non immatriculée à la TVA ne doit pas faire apparaître de TVA.

**Un *sole trader* ajoute :**

- son propre nom ;
- le nom commercial qu'il utilise, le cas échéant ;
- s'il utilise un nom commercial, une adresse où les actes juridiques peuvent lui être signifiés (*Companies Act 2006*, partie 41).

**Une *limited company* ajoute** ([GOV.UK – Signs, stationery and promotional material](https://www.gov.uk/running-a-limited-company/signs-stationery-and-promotional-material), [SI 2015/17](https://www.legislation.gov.uk/uksi/2015/17/contents)) :

- sa dénomination sociale complète, telle qu'elle figure sur le *certificate of incorporation* : c'est obligatoire sur les factures (règlement 24) ;
- si le nom d'un administrateur est mentionné, les noms de tous les administrateurs ;
- son numéro d'immatriculation (*registered number*), l'adresse du *registered office* et la partie du Royaume-Uni où elle est immatriculée.

Ce dernier groupe de mentions est exigé par le règlement 25 sur les *business letters*, *order forms* et sites web. Il faut le faire figurer sur les factures par prudence. Le caractère strictement obligatoire sur la facture elle-même est à confirmer (confiance moyenne).

**Une facture TVA complète (*full VAT invoice*)** est obligatoire pour une vente au taux normal ou réduit à un autre assujetti, au-delà de 250 £ TTC ([VAT Notice 700](https://www.gov.uk/guidance/vat-guide-notice-700), confiance moyenne sur la liste exacte). Elle doit indiquer :

- un numéro séquentiel unique ;
- la date du fait générateur (*time of supply*) et la date de facture si elle est différente ;
- le nom, l'adresse et le numéro de TVA du fournisseur ;
- le nom et l'adresse du client ;
- la description de la prestation ;
- pour chaque ligne : la quantité, le prix unitaire HT, le taux de TVA et le montant HT ;
- les remises éventuelles ;
- le total HT et le total de TVA en livres sterling ;
- les mentions d'autoliquidation (*reverse charge*), de taux zéro ou d'exonération si elles s'appliquent.

Une facture « *modified* » (montants TTC) est possible si le client l'accepte. La facture est normalement émise dans les 30 jours suivant la prestation.

**Une facture TVA simplifiée (*simplified VAT invoice*)** est possible jusqu'à **250 £ TTC**. Elle indique :

- le nom, l'adresse et le numéro de TVA du fournisseur ;
- le fait générateur ;
- la description ;
- pour chaque taux, le total TTC et le taux de TVA.

Elle ne doit pas inclure d'opérations exonérées. Le client peut toujours demander une facture complète.

---

## 7. Retard de paiement (*Late Payment of Commercial Debts (Interest) Act 1998*)

Ces règles ne s'appliquent qu'entre entreprises (B2B), dans tout le Royaume-Uni ([GOV.UK – Interest on late commercial payments](https://www.gov.uk/late-commercial-payments-interest-debt-recovery/charging-interest-commercial-debt), [loi de 1998](https://www.legislation.gov.uk/ukpga/1998/20), [Order 2002](https://www.legislation.gov.uk/uksi/2002/1675/made)).

- **Intérêts légaux (*statutory interest*) :** 8 % + le taux de référence de la Banque d'Angleterre, en intérêts simples. La formule est : créance × taux × jours de retard / 365. Ces intérêts ne s'appliquent pas si le contrat prévoit un autre recours substantiel, par exemple un autre taux.
- **Taux de référence :** c'est le *Bank Rate* en vigueur le **31 décembre** pour les créances échues du 1er janvier au 30 juin, et le **30 juin** pour celles échues du 1er juillet au 31 décembre. Le taux reste figé pour la créance concernée.
- ***Bank Rate* actuel :** **3,75 %**. Il a été abaissé de 4 % à 3,75 % lors du *MPC* clos le 17 décembre 2025, annoncé et en vigueur le **18 décembre 2025**. Il a été maintenu en février, mars, avril, juin, juillet et septembre 2026. En septembre, le vote était de 6 voix contre 3, les trois minoritaires voulant remonter le taux à 4 % ([BoE – Bank Rate](https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate), [décembre 2025](https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2025/december-2025), [septembre 2026](https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/september-2026)).
- **Taux de référence du semestre en cours** (créances échues du 1er juillet au 31 décembre 2026) : le *Bank Rate* au 30 juin 2026 était de 3,75 % ([BoE juin 2026](https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/june-2026)). Le taux légal est donc de **11,75 %**. Il est identique pour le premier semestre 2026 (taux au 31 décembre 2025 : 3,75 %).
- **Indemnité forfaitaire de recouvrement** ([GOV.UK – Claim debt recovery costs](https://www.gov.uk/late-commercial-payments-interest-debt-recovery/claim-debt-recovery-costs)) : 40 £ pour une créance jusqu'à 999,99 £, 70 £ de 1 000 à 9 999,99 £, et 100 £ à partir de 10 000 £. Elle se réclame une seule fois par paiement en retard. Les frais raisonnables qui dépassent ce forfait peuvent aussi être réclamés.
- **Exemple :** pour une facture de 5 000 £ payée avec 30 jours de retard en 2026, les intérêts sont de 5 000 × 11,75 % × 30 / 365 = **48,29 £**, auxquels s'ajoute l'indemnité de **70 £**.
- **Délai par défaut :** sans date convenue, le paiement est en retard 30 jours après la réception de la facture ou la livraison, selon ce qui est le plus tardif. Pour les autorités publiques, le délai est de 30 jours. Entre entreprises, des délais de plus de 60 jours doivent être expressément convenus et ne pas être manifestement abusifs (confiance moyenne).
- **Réforme en cours :** le *Commercial Payments Bill [HL]* ([bills.parliament.uk](https://bills.parliament.uk/bills/4128)) suit son parcours :
  - 1re lecture à la Chambre des Lords le 19 mai 2026 ;
  - 2e lecture le 9 juin ;
  - examen en commission le 21 juillet ;
  - *report stage* le 15 septembre ;
  - 3e lecture prévue le 20 octobre 2026 ;
  - passage aux Communes encore à venir.

  Le texte prévoit un plafond des délais de paiement (60 jours, 30 jours pour le secteur public) et rend les intérêts légaux impératifs, toute clause contraire étant nulle. **Il n'est pas encore en vigueur**, et son application est annoncée « pas avant 2027 ».

---

## 8. Points à revérifier chaque année

| Élément | Quand il change ou est publié | Où vérifier |
|---|---|---|
| Barème rUK, *Personal Allowance*, seuils NIC | Annoncés au *Budget* d'automne (le dernier a eu lieu le 26 novembre 2025), applicables au 6 avril ; seuils gelés jusqu'au 5 avril 2031 | gov.uk/income-tax-rates, OOTLAR Annex A |
| Taux de dividendes, *dividend allowance* | *Budget* d'automne ; *Finance Act* au printemps | gov.uk/tax-on-dividends |
| Taux et seuils *Class 1*, *Class 2*, *Class 3*, *Small Profits Threshold*, *lower earnings limit* | Revalorisation annoncée au *Budget* ; règlements publiés en janvier-février ; en vigueur au 6 avril | *Rates and thresholds for employers* (publiée en janvier-février), gov.uk/self-employed-national-insurance-rates |
| Barème écossais | *Scottish Budget* (décembre-janvier ; le 13 janvier 2026 pour 2026/27), puis vote de la *Scottish Rate Resolution* en février | gov.uk/scottish-income-tax, gov.scot |
| *Welsh rates* | *Draft Budget* gallois en octobre, *Final Budget* en janvier-février | gov.uk/welsh-income-tax, gov.wales |
| *Corporation Tax* | *Budget* et *Finance Act* ; exercice au 1er avril | *Corporation Tax rates and allowances* |
| *Employment Allowance* | *Budget* | gov.uk/claim-employment-allowance |
| Seuils de TVA, *Flat Rate Scheme* | *Budget* (seuil de 90 000 £ inchangé depuis le 1er avril 2024) | gov.uk/how-vat-works/vat-thresholds |
| Indemnités kilométriques | Publication ponctuelle du HMRC (la dernière date du 21 mai 2026, rétroactive au 6 avril 2026) | gov.uk/simpler-income-tax-simplified-expenses/vehicles |
| *Bank Rate* et taux légal de retard de paiement | 8 réunions du *MPC* par an. Restent en 2026 : 5 novembre et **17 décembre** (fixe le taux au 31 décembre). En 2027 : 4 février, 18 mars, 29 avril, **17 juin** (fixe le taux au 30 juin), 29 juillet, 16 septembre, 4 novembre, **16 décembre** | bankofengland.co.uk/monetary-policy/upcoming-mpc-dates |
| Intérêts de retard du HMRC | Révisés environ 13 jours ouvrés après chaque changement du *Bank Rate* | page *HMRC interest rates* |
| Seuils MTD et pénalités | Guides du HMRC mis à jour au fil de l'eau ; nouvelle cohorte chaque 6 avril | gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax |
| Seuils de taille IR35 | Modifications du *Companies Act* (la dernière s'applique aux exercices ouverts à partir du 6 avril 2025) | ESM10006A |
| Réforme des retards de paiement | Avancement du *Commercial Payments Bill* | bills.parliament.uk/bills/4128 |

## 9. Questions ouvertes et limites

1. Les pages officielles n'ont pas pu être ouvertes directement, et le quota de recherche partagé a été épuisé en fin de session. Il faut faire un contrôle sur les pages en ligne avant publication.
2. Indemnité de 55 p : la règle exacte du HMRC pour un *sole trader* dont l'exercice chevauche le 6 avril 2026 (par exemple un exercice clos le 31 décembre 2026) reste à vérifier. Selon les commentateurs, on applique le taux de chaque année fiscale.
3. Décisions du *MPC* du 5 novembre et du 17 décembre 2026 : elles fixeront le taux de référence du premier semestre 2027 et les intérêts du HMRC. Le *MPC* a signalé un risque de hausse.
4. *Commercial Payments Bill* : texte définitif et date d'entrée en vigueur.
5. MTD : statut législatif définitif du seuil de 20 000 £ pour 2028, et pénalités de 4 % en 2027/28.
6. Factures de *limited company* : le numéro d'immatriculation et le *registered office* sont-ils obligatoires sur la facture elle-même, ou seulement conseillés ?
7. Pénalité à 12 mois pour retard de déclaration *Self Assessment* (5 % ou 300 £) : non reconfirmée pendant cette session.
8. Date du *Budget* d'automne 2026, qui fixera les chiffres 2027/28.
9. Le *Budget* 2025 relève aussi de 2 points les taux sur l'épargne et crée des taux spécifiques pour les revenus fonciers à partir d'avril 2027. Ce point n'a pas été vérifié en détail.
10. Points notés avec une confiance moyenne parce que les pages n'ont pas été relues en ligne : *cash basis* par défaut, échéance de la TVA (1 mois et 7 jours), paiement de la *Corporation Tax* (9 mois et 1 jour après la clôture, déclaration CT600 à 12 mois).

## 10. Sources

**Impôt sur le revenu**
- [Income Tax rates and Personal Allowances – GOV.UK](https://www.gov.uk/income-tax-rates)
- [Income Tax rates and allowances for current and previous tax years – GOV.UK](https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances-current-and-past)
- [Maintaining the Personal Allowance and basic rate limit until 5 April 2031 – GOV.UK](https://www.gov.uk/government/publications/maintaining-income-tax-and-equivalent-national-insurance-contributions-thresholds-until-5-april-2031/income-tax-maintaining-the-personal-allowance-and-the-basic-rate-limit-for-income-tax-and-equivalent-national-insurance-contributions-thresholds-unt)
- [Income Tax in Scotland: Current rates – GOV.UK](https://www.gov.uk/scottish-income-tax)
- [Income Tax in Scotland: 2025 to 2026 – GOV.UK](https://www.gov.uk/scottish-income-tax/2025-to-2026-tax-year)
- [Scottish Income Tax rates and bands 2026 to 2027 – gov.scot](https://www.gov.scot/publications/scottish-income-tax-rates-and-bands/pages/2026-to-2027/)
- [Income Tax in Wales – GOV.UK](https://www.gov.uk/welsh-income-tax)
- [Written Statement: Draft Budget 2026-27: Welsh Taxes – gov.wales](https://www.gov.wales/written-statement-draft-budget-2026-27-welsh-taxes)

**Cotisations sociales**
- [Self-employed National Insurance rates – GOV.UK](https://www.gov.uk/self-employed-national-insurance-rates)
- [Rates and allowances: National Insurance contributions – GOV.UK](https://www.gov.uk/government/publications/rates-and-allowances-national-insurance-contributions/rates-and-allowances-national-insurance-contributions)
- [Voluntary National Insurance: Rates – GOV.UK](https://www.gov.uk/voluntary-national-insurance-contributions/rates)
- [Removal of the requirement to pay Class 2 NICs – GOV.UK](https://www.gov.uk/government/publications/changes-to-national-insurance-contributions-from-6-january-2024/a-reduction-in-the-main-rates-of-primary-class-1-and-class-4-national-insurance-contributions-and-the-removal-of-the-requirement-to-pay-class-2-nation)
- [Social Security (Contributions) Regulations 2026 (draft) – legislation.gov.uk](https://www.legislation.gov.uk/ukdsi/2026/9780348278415/pdfs/ukdsi_9780348278415_en.pdf)
- [Rates and thresholds for employers 2026 to 2027 – GOV.UK](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027)
- [Employment Allowance – GOV.UK](https://www.gov.uk/claim-employment-allowance)
- [NIM06545 – single director companies – HMRC](https://www.gov.uk/hmrc-internal-manuals/national-insurance-manual/nim06545)

**Abattements et frais**
- [Tax-free allowances on property and trading income – GOV.UK](https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income)
- [Simplified expenses: Vehicles – GOV.UK](https://www.gov.uk/simpler-income-tax-simplified-expenses/vehicles)
- [Increase to AMAPs and self-employed simplified mileage rates – GOV.UK](https://www.gov.uk/government/publications/increase-to-approved-mileage-allowance-payments-amaps-and-self-employed-simplified-mileage-rates)
- [Simplified expenses: Overview – GOV.UK](https://www.gov.uk/simpler-income-tax-simplified-expenses)

**Self Assessment et MTD**
- [Self Assessment tax returns: Deadlines – GOV.UK](https://www.gov.uk/self-assessment-tax-returns/deadlines)
- [Payments on account – GOV.UK](https://www.gov.uk/understand-self-assessment-bill/payments-on-account)
- [SALF303 – payments on account – HMRC](https://www.gov.uk/hmrc-internal-manuals/self-assessment-legal-framework/salf303)
- [SA370: appeal against penalties – GOV.UK](https://www.gov.uk/government/publications/self-assessment-appeal-against-penalties-for-late-filing-and-late-payment-sa370/self-assessment-how-to-appeal-against-penalties-for-late-filing-and-late-payment)
- [HMRC interest rates for late and early payments – GOV.UK](https://www.gov.uk/government/publications/rates-and-allowances-hmrc-interest-rates-for-late-and-early-payments/rates-and-allowances-hmrc-interest-rates)
- [Sign up for Making Tax Digital for Income Tax – GOV.UK](https://www.gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax)
- [MTD for Income Tax: step by step – GOV.UK](https://www.gov.uk/government/collections/making-tax-digital-for-income-tax-for-sole-traders-and-landlords-step-by-step)
- [Use MTD for Income Tax: Updates – GOV.UK](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/updates)
- [Penalties for MTD for Income Tax – GOV.UK](https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax)

**TVA et facturation**
- [VAT rates – GOV.UK](https://www.gov.uk/vat-rates)
- [How VAT works: VAT thresholds – GOV.UK](https://www.gov.uk/how-vat-works/vat-thresholds)
- [VAT Notice 700/1 supplement – GOV.UK](https://www.gov.uk/government/publications/vat-notice-7001-should-i-be-registered-for-vat/vat-notice-7001-supplement--2)
- [Budget 2025 – Annex A: rates and allowances – GOV.UK](https://www.gov.uk/government/publications/budget-2025-overview-of-tax-legislation-and-rates-ootlar/annex-a-rates-and-allowances)
- [VAT Flat Rate Scheme – GOV.UK](https://www.gov.uk/vat-flat-rate-scheme)
- [Flat Rate Scheme: work out your flat rate – GOV.UK](https://www.gov.uk/vat-flat-rate-scheme/how-much-you-pay)
- [Flat Rate Scheme: if your circumstances change – GOV.UK](https://www.gov.uk/vat-flat-rate-scheme/if-your-circumstances-change)
- [VAT guide (VAT Notice 700) – GOV.UK](https://www.gov.uk/guidance/vat-guide-notice-700)
- [Invoices: what they must include – GOV.UK](https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include)
- [Running a limited company: signs, stationery – GOV.UK](https://www.gov.uk/running-a-limited-company/signs-stationery-and-promotional-material)
- [SI 2015/17 Names and Trading Disclosures Regulations – legislation.gov.uk](https://www.legislation.gov.uk/uksi/2015/17/contents)

**Retard de paiement et Banque d'Angleterre**
- [Late commercial payments: interest – GOV.UK](https://www.gov.uk/late-commercial-payments-interest-debt-recovery/charging-interest-commercial-debt)
- [Late commercial payments: debt recovery costs – GOV.UK](https://www.gov.uk/late-commercial-payments-interest-debt-recovery/claim-debt-recovery-costs)
- [Late Payment of Commercial Debts (Interest) Act 1998 – legislation.gov.uk](https://www.legislation.gov.uk/ukpga/1998/20)
- [Late Payment (Rate of Interest) (No. 3) Order 2002 – legislation.gov.uk](https://www.legislation.gov.uk/uksi/2002/1675/made)
- [Commercial Payments Bill [HL] – UK Parliament](https://bills.parliament.uk/bills/4128)
- [Interest rates and Bank Rate – Bank of England](https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate)
- [Monetary Policy Summary, December 2025 – Bank of England](https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2025/december-2025)
- [Monetary Policy Summary, June 2026 – Bank of England](https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/june-2026)
- [Monetary Policy Summary, September 2026 – Bank of England](https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/september-2026)
- [MPC dates for 2026 and 2027 – Bank of England](https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates)

**Limited company et IR35**
- [Corporation Tax rates and allowances – GOV.UK](https://www.gov.uk/government/publications/rates-and-allowances-corporation-tax/rates-and-allowances-corporation-tax)
- [Marginal Relief for Corporation Tax – GOV.UK](https://www.gov.uk/guidance/corporation-tax-marginal-relief)
- [Tax on dividends – GOV.UK](https://www.gov.uk/tax-on-dividends)
- [Change to tax rates for property, savings and dividend income – technical note – GOV.UK](https://www.gov.uk/government/publications/changes-to-tax-rates-for-property-savings-and-dividend-income/change-to-tax-rates-for-property-savings-and-dividend-income-technical-note)
- [Understanding off-payroll working (IR35) – GOV.UK](https://www.gov.uk/guidance/understanding-off-payroll-working-ir35)
- [Off-payroll working for clients – GOV.UK](https://www.gov.uk/guidance/off-payroll-working-for-clients)
- [ESM10006A – size thresholds from 6 April 2025 – HMRC](https://www.gov.uk/hmrc-internal-manuals/employment-status-manual/esm10006a)
