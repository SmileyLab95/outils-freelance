# 52. Protection de l'indépendant aux États-Unis : congés payés des États et invalidité

Suite de [50](50-protection-sociale.md) (France) et [51](51-protection-sociale-royaume-uni.md) (Royaume-Uni), besoins
« Arrêt maladie, maternité, accident » de [31](31-vision-plateforme.md) (§ 3.8). Spécification écrite le 09/11/2026
(décision D58), à partir des pages et des lois lues le même jour (annexe).

## 1. Besoin

Un freelance américain qui tombe malade, attend un enfant ou doit s'occuper d'un proche n'a pas d'employeur pour lui
verser un congé. Certains États lui permettent d'adhérer à leur programme de congés payés ou d'invalidité, contre une
prime et un engagement de durée ; la Social Security ne couvre que l'invalidité de longue durée. L'outil dit, pour
l'État où il travaille, s'il peut adhérer, ce que coûte l'adhésion quand le taux est publié, et ce à quoi il s'engage.

## 2. Règles (lues le 09/11/2026)

**Fédéral : SSDI** (règle `us_ssdi_basics`, 42 U.S.C. 423) : délai de carence de **5 mois civils consécutifs** de
handicap ; conditions d'assurance : en général **20 trimestres de couverture sur les 40** derniers (moins avant
31 ans). Les revenus d'indépendant comptent dans les gains couverts (règle `ssa_benefits_based_on_earnings`).

**Californie** (`us_paid_leave_ca_diec`, EDD) : *Disability Insurance Elective Coverage* pour les entrepreneurs
individuels, indépendants, associés et gérants de certaines LLC qui ne cotisent pas à la SDI ; *Disability Insurance*
jusqu'à **39 semaines** (maladie, accident, grossesse sans lien avec le travail) et *Paid Family Leave* jusqu'à
**8 semaines** sur 12 mois ; **6 mois** dans le plan avant toute demande. Prime 2026 : **8,84 %** du bénéfice net de
la déclaration **2024** (Schedule SE ligne 3 ou Schedule C ligne 31), au moins **406,64 $** par an (bénéfice de 4 600 $
ou moins, soit 4 600 × 8,84 %), en quatre versements trimestriels. Conditions d'adhésion et de résiliation non lues :
renvoi à l'EDD.

**Minnesota** (`us_paid_leave_mn_self_employed`, Minn. Stat. 268B.11) : adhésion pour **104 semaines consécutives**
au moins ; couverture au trimestre civil suivant l'accord ; sortie seulement au 1er janvier, avec un préavis de
**30 jours** ; prime annuelle : taux du programme × base de prime de l'indépendant, plafonnée au plafond de la Social
Security ; prestations comme les salariés. Taux non lu (pl.mn.gov refuse la lecture) : pas d'estimation.

**New York** (`us_paid_leave_ny_self_employed`) : sans salarié, adhésion par l'achat d'une **police d'assurance**
couvrant **à la fois** le *Paid Family Leave* et l'invalidité (pas de PFL seul) ; prix fixé par l'assureur.

**Oregon** (`us_paid_leave_or_self_employed`) : travail en Oregon et au moins **1 000 $** de revenu net d'indépendant
d'Oregon l'année précédente ; cotisation 2025-2026 de **0,6 %** de ce revenu, plafonné à **184 500 $**, chaque
trimestre ; engagement de **3 ans** au moins ; mêmes prestations que les salariés.

**Washington** (`us_paid_leave_wa_elective`, RCW 50A.10.010) : adhésion pour **3 ans** au moins, puis par périodes
d'**un an** au moins, congé familial et médical ensemble ; l'indépendant paie **100 %** de la prime salariale ; droit aux
prestations après **820 heures** travaillées dans l'État après la déclaration ; retrait dans les 30 jours suivant la fin
d'une période. Taux non lu : pas d'estimation.

**Non retenus** (lecture refusée ou non faite, D57 : ne rien affirmer) : Massachusetts (mass.gov : 403), Colorado
(famli.colorado.gov : refus), autres États (Connecticut, New Jersey, Rhode Island, Hawaï, Delaware, Maine, Maryland…) ;
assurance chômage des indépendants (aucune page du DOL lue ne le dit clairement) ; FMLA (dol.gov : refus).

## 3. Outil

Une page aux États-Unis, **Paid leave and disability insurance for the self-employed** (`/us/self-employed-paid-leave/`,
id `sick-pay`, reliée par *hreflang* aux pages française et britannique), menu « Taxes and admin » (description :
« Tax, deadlines, expenses, retirement and benefits. »).

Saisie : l'État (Californie, Minnesota, New York, Oregon, Washington, autre) et, pour la Californie et l'Oregon, le
bénéfice net. Résultat : le programme, la prime annuelle et trimestrielle estimée (Californie, Oregon), « Opt in » ou
« Buy a policy » ailleurs, « Not eligible » en Oregon sous 1 000 $, « Not covered yet » pour un autre État ; les points à
savoir (durées, engagement, conditions), la démarche, et la note sur le SSDI. Moteur `engines/benefits-us.js`
(`OFE.benefitsUS` : `STATES`, `program`, `premium`), chiffres lus dans les règles, textes dans `tools/us-benefits.js`.

Hors champ : montants des prestations (calculateurs des États), taux du Minnesota et de Washington, résiliation en
Californie, États non lus, chômage, assurance invalidité privée (renvoi au guide des assurances).

## 4. Tests

Moteur (`tests/unit/benefits-us.test.mjs`, 6 tests) : chiffres des règles ; cinq États et aucun autre ; Californie
(50 000 $ → 4 420 $, 4 600 $ et 0 $ → 406,64 $, 4 601 $ → 406,73 $) ; Oregon (exemple officiel 10 000 $ → 60 $, 1 000 $,
999 $ → non éligible, plafond) ; autres États sans taux ; saisies invalides ; chiffres cités par la page égaux aux
règles. Mutation : 9 mutants détectés sur 10, le dixième (`<=` → `<` au seuil californien) est équivalent (4 600 × 8,84 %
= 406,64 $). Parcours navigateur (`tests/e2e/verifier.mjs`) : Californie, minimum, bénéfice vide, Oregon et seuil, New
York, Washington, Minnesota, autre État, accessibilité, trois largeurs ; captures relues.

## Annexe : sources lues (09/11/2026, outil « Lire une source officielle »)

| Source | Contenu relevé |
|---|---|
| 42 U.S.C. 423 (govinfo, US Code 2023) | (c)(2) délai de carence de cinq mois civils consécutifs ; (c)(1) 20 trimestres de couverture sur 40 (moins avant 31 ans) |
| EDD, *Disability Elective Coverage Benefits and Premium Amounts* | Prime 2026 : 8,84 % du bénéfice 2024, 406,64 $ pour 4 600 $ ou moins, quatre versements |
| EDD, *Disability Insurance Elective Coverage (DIEC)* | Bénéficiaires, 6 mois avant une demande, DI 39 semaines, PFL 8 semaines sur 12 mois, formulaires |
| New York Paid Family Leave, *Self-Employed Individuals* | Adhésion par une police couvrant PFL et invalidité, pas de PFL seul ; résiliation |
| Paid Leave Oregon, *Self-employed and independent contractors* | Conditions (Oregon, 1 000 $), 0,6 % jusqu'à 184 500 $, exemple de 10 000 $, 3 ans, trimestres |
| RCW 50A.10.010 (Washington State Legislature) | 3 ans puis 1 an, congé familial et médical, 100 % de la prime salariale, 820 heures, retrait |
| Washington Paid Leave, *Self-employed* | Déclaration et paiement trimestriels |
| Minnesota Statutes 2026, 268B.11 | 104 semaines, trimestre suivant, sortie au 1er janvier avec 30 jours, prime plafonnée, prestations |
| Refus de lecture | mass.gov (403), famli.colorado.gov, pl.mn.gov, dol.gov (FMLA) ; brochure de Washington (lien déplacé) |
