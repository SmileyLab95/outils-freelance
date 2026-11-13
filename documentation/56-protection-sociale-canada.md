# 56. Protection sociale du travailleur autonome au Canada : prestations spéciales de l'assurance-emploi

Suite de [50](50-protection-sociale.md) (France), [51](51-protection-sociale-royaume-uni.md) (Royaume-Uni) et
[52](52-protection-sociale-etats-unis.md) (États-Unis), besoins « Arrêt maladie, maternité, accident » de
[31](31-vision-plateforme.md) (§ 3.8). Spécification commencée le 13/11/2026 à partir de la Loi sur l'assurance-emploi
et de son règlement, lus sur laws-lois.justice.gc.ca (canada.ca, où Service Canada publie ses guides, refuse l'outil
de lecture).

## 1. Besoin

Un travailleur autonome canadien n'a pas d'assurance-emploi d'office : il peut **adhérer** aux prestations spéciales
(maladie, maternité, parentales, proches aidants) en concluant une entente avec la Commission, puis cotiser chaque
année. Il se demande : est-ce que j'y ai droit, combien toucherais-je par semaine et pendant combien de semaines,
combien coûte l'adhésion, puis-je en sortir ? Au Québec, la maternité et les prestations parentales relèvent du Régime
québécois d'assurance parentale (RQAP), obligatoire pour les travailleurs autonomes.

## 2. Règles (lues le 13/11/2026)

**Loi sur l'assurance-emploi (L.C. 1996, ch. 23), partie VII.1, « Benefits for Self-employed Persons »**
(laws-lois.justice.gc.ca, texte à jour au 19/10/2026, SHA-256 830801db…a827) :

- **Qui** (art. 152.02(1)) : le travailleur indépendant citoyen canadien ou résident permanent qui a conclu une
  **entente** avec la Commission. Travailleur indépendant (art. 152.01) : la personne qui exploite ou a exploité une
  entreprise (ou dont l'emploi est exclu des emplois assurables par l'alinéa 5(2)b), contrôle de plus de 40 % des
  actions).
- **Durée de l'entente** (art. 152.02(2) à (7)) : indéterminée ; on peut y mettre fin par avis **avant d'avoir reçu
  des prestations** (ou, après en avoir reçu, seulement dans les circonstances prévues par règlement, non trouvées dans
  le règlement lu), la fin prenant effet le **31 décembre** de l'année de l'avis ; avis donné dans les **60 jours**
  suivant l'entente : l'entente est réputée n'avoir jamais existé. Avis et retrait d'avis par écrit (règlement,
  art. 9.01 et 9.02).
- **Prestations** : maladie, blessure ou quarantaine (art. 152.03) ; grossesse (art. 152.04 : de 12 semaines avant la
  semaine prévue de l'accouchement à 17 semaines après) ; soins aux nouveau-nés ou enfants adoptés (art. 152.05) ;
  proches aidants (art. 152.06 à 152.062).
- **Conditions** (art. 152.07(1)) : au moins **12 mois** depuis l'entente ; entente en vigueur ; **arrêt de la
  rémunération** provenant du travail indépendant ; revenu d'indépendant pendant la période de référence au moins égal
  à **6 000 $** ou au montant fixé par règlement (multiplié par 1,25 à 2 en cas de violation dans les 260 semaines).
  Règlement (DORS/96-332, SHA-256 a15d0d70…050b), art. 11.1 : ce montant est **indexé chaque année depuis le
  1er janvier 2012** par le ratio de l'alinéa 4(2)b) de la Loi (celui du maximum de la rémunération assurable), sans
  descendre sous 6 000 $, arrondi au dollar inférieur. **Le montant de chaque année n'est pas dans les textes lus**
  (publié par Service Canada sur canada.ca) : l'outil dit « au moins 6 000 $, montant indexé à vérifier ».
- **Revenu d'indépendant** (art. 152.01(2)) : le revenu tiré des entreprises au sens de la Loi de l'impôt sur le
  revenu, moins les pertes d'entreprise (hors entreprises tirant plus de la moitié de leurs recettes de loyers).
- **Durées maximales** (art. 152.14(1)) : grossesse **15** semaines ; parentales **35** (prestations standard) ou **61**
  (prolongées) ; maladie **26** ; soins à un membre de la famille (compassion) **26** ; enfant gravement malade **35** ;
  adulte gravement malade **15**. Parentales partagées entre deux parents : 40 ou 69 semaines au total (152.14(2)).
  Semaines combinées : 50 au plus en général.
- **Délai de carence** (art. 152.15) : **une semaine** sans prestations au début de la période. La dispense pour la
  maladie (art. 153.191(1.1)) fait partie des mesures temporaires de la partie VIII.5, qui ont cessé de s'appliquer au
  plus tard le **25 septembre 2021** (art. 153.196(1)) : la semaine de carence s'applique.
- **Taux** (art. 152.16) : **55 %** (33 % pour les prestations parentales prolongées) de (revenu d'indépendant de la
  période de référence + rémunération assurable de la même période) ÷ 52, la somme étant **plafonnée au maximum de la
  rémunération assurable** (68 900 $ en 2026, règle `ei_max_insurable_earnings`) ; montant arrondi au dollar le plus
  proche (art. 152.01(5)). Maximum en 2026 : 55 % × 68 900 ÷ 52 = 728,75 → **729 $** par semaine (le même chiffre que
  la Gazette du Canada, règle `ei_max_insurable_earnings`). Supplément familial possible pour les familles à faible
  revenu (art. 152.17), non calculé.
- **Cotisation** (art. 152.21) : chaque année d'entente, **taux** (1,63 % en 2026 ; 1,30 % au Québec, règles
  `ei_rate_self_employed` et `ei_rate_self_employed_quebec`) × le moindre du revenu d'indépendant de l'année et du
  maximum de la rémunération assurable moins la rémunération assurable comme salarié ; due aussi l'année de l'entente et
  celle de la fin de l'entente, quelle qu'en soit la date ; déclarée avec la déclaration de revenus (art. 152.22).
- **Hors du Canada** (art. 152.2) : pas de prestations, sauf exception prévue par règlement.

**Régime québécois d'assurance parentale** (Loi sur l'assurance parentale, RLRQ c. A-29.011, LégisQuébec,
SHA-256 578de835…cb05, à jour de 2026, c. 5 : le régime est désormais administré par Retraite Québec) :

- **Obligatoire** : tout travailleur autonome qui réside au Québec à la fin de l'année cotise (art. 53), sauf si son
  revenu de travail est inférieur à **2 000 $** (art. 54) ; cotisation = taux (0,764 % en 2026, règle
  `qpip_rate_self_employed`) × le moindre du revenu d'entreprise et du maximum des revenus assurables (103 000 $ en
  2026 ; 0,764 % × 103 000 $ = 786,92 $, le maximum publié par Québec.ca) (art. 66).
- **Admissibilité** (art. 3) : revenu assurable d'au moins **2 000 $** pendant la période de référence, résidence au
  Québec, arrêt de rémunération (défini par règlement).
- **Revenu hebdomadaire moyen** (art. 21) : pour un revenu d'entreprise, **1/52 du revenu assurable de l'année
  précédant** le début de la période de prestations, au plus le maximum ÷ 52, au moins 2 000 $ ÷ 52.
- **Semaines** (art. 7, 9, 10) : maternité **18** (ou 15), paternité **5** (ou 3), parentales partageables **32**
  (ou 25), les secondes valeurs pour l'option de l'art. 18.
- **Taux** (art. 18) : régime de base, **70 %** pour la maternité, la paternité et les 7 premières semaines
  parentales, **55 %** pour les 25 autres ; option (régime particulier) : **75 %** pour un nombre de semaines moindre ;
  l'option du premier parent qui fait sa demande lie l'autre ; irrévocable sauf circonstances exceptionnelles.
  Majoration pour les familles à faible revenu (art. 19) et semaines additionnelles (naissances multiples, adoption,
  grossesse pour autrui) : non calculées. Arrondi de la prestation : non lu (montants au cent, estimation).

**Période de référence de l'AE** (art. 152.08(1)) : « the year immediately before the year during which their
benefit period begins » ; un même revenu ne sert qu'à une demande initiale (152.08(2)).

**Non lus ou non tranchés** : « arrêt de rémunération » (règlements) ; montant minimal indexé de
l'AE pour l'année ; taux de cotisation de l'AE au Québec pour les travailleurs autonomes (règle
`ei_rate_self_employed_quebec`, confiance moyenne).

## 3. Outil (à confirmer quand les points à lire le sont)

Une page au Canada, en anglais et en français, id `sick-pay` (comme au Royaume-Uni et aux États-Unis) : **EI special
benefits for the self-employed** / « Prestations spéciales de l'assurance-emploi du travailleur autonome ». Saisie :
province (Québec ou ailleurs), situation (maladie, grossesse, parentales standard ou prolongées, proche aidant ×3),
adhésion depuis au moins 12 mois (oui, non, pas encore inscrit), revenu net d'indépendant de l'année précédente.
Résultat : prestation hebdomadaire (55 % ou 33 %, plafond), nombre de semaines, total (semaine de carence déduite),
cotisation annuelle de l'adhésion, conditions (remplie, à vérifier, non remplie) ; au Québec, grossesse et parentales
renvoyées au RQAP. Moteur `engines/benefits-ca.js`, chiffres lus dans les règles.

## 4. Réalisation, étape 1 (13/11/2026)

- Règles `ei_self_employed_special_benefits` et `qpip_self_employed_benefits` (`data/rules/ca.json`).
- Moteur `engines/benefits-ca.js` : `ei` (taux, plafond, arrondi au dollar le plus proche, semaines, total,
  cotisation, conditions ; au Québec, grossesse et parentales renvoyées au RQAP) et `qpip` (revenu hebdomadaire moyen,
  tranches de semaines et taux, plafond, plancher, cotisation, conditions).
- Tests : 4 tests unitaires, valeurs calculées à la main (dont 729 $, maximum hebdomadaire publié, et 786,92 $,
  cotisation maximale du RQAP publiée) ; 18 erreurs réintroduites, toutes détectées.
- Étape 2 : pages anglaise et française (id `sick-pay`), parcours navigateur, captures (faite, § 5).

## 5. Réalisation, étape 2 (13/11/2026)

- Pages *EI special benefits for the self-employed* (`/ca/self-employed-ei-benefits/`, hors Québec par défaut) et
  « Assurance-emploi et RQAP du travailleur autonome » (`/ca/fr/assurance-emploi-travailleur-autonome/`, Québec par
  défaut), menu « Taxes and admin / Impôts et gestion » ; script `tools/ca-benefits.js`, textes de chaque page dans un
  bloc JSON (`benefits-data`).
- Saisie : lieu (Québec ou ailleurs), situation (maladie, grossesse, paternité au Québec, parentales, trois cas de
  proche aidant), adhésion à l'AE (12 mois ou plus, moins, pas encore), option parentale de l'AE (standard ou
  prolongée), régime du RQAP (base ou particulier), revenu net de l'an dernier. Résultat : montant par semaine (ou
  tranches du RQAP), semaines, total, conditions, prochaine étape (demande, adhésion, ou minimum non atteint) et
  cotisation (AE au taux du Québec ou d'ailleurs ; RQAP obligatoire).
- Tests : test des pages (en-têtes, menu, options = moteur, chiffres de la FAQ = moteur, mêmes textes dans les deux
  langues) ; parcours navigateur (14 points, accessibilité comprise, trois largeurs) ; parcours des pages canadiennes ;
  captures relues (ordinateur, mobile) : le message « faites votre demande » affiché sous le minimum de revenu a été
  remplacé par un message propre à ce cas.

