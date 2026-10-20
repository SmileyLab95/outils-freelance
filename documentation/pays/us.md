# États-Unis — règles fiscales et juridiques pour les freelances (année fiscale 2026)

*Vérifié le 20 octobre 2026. Données machine : `data/rules/us.json`.*

> **Méthode et limites.** Les sites irs.gov et ssa.gov n'étaient pas accessibles directement depuis l'environnement de recherche (DNS bloqué). Les chiffres ont été vérifiés via des résultats de recherche citant les pages officielles, recoupés avec des sources secondaires sérieuses. Le quota de recherches a été épuisé avant la fin : quelques points (Seattle, exemples de pénalités de retard, formulaire *W-9*) n'ont pas pu être revérifiés et sont marqués « confiance faible » ou listés dans les questions ouvertes. Aucun chiffre n'a été inventé.

---

## 1. Résumé pour le freelance américain

Un freelance américain paie deux impôts fédéraux principaux sur son bénéfice : l'*income tax* (barème progressif 10 % à 37 %) et le *self-employment tax* (15,3 % : retraite *Social Security* + assurance maladie *Medicare*, l'équivalent de nos cotisations sociales). Il n'y a pas de prélèvement à la source : il verse des acomptes trimestriels (*estimated taxes*). S'y ajoutent l'impôt de l'État (sauf 9 États) et parfois un impôt local (ex. New York City). La déduction *Qualified Business Income* (QBI, 20 %) réduit l'*income tax* mais pas le *self-employment tax*.

### Statuts courants

**_Sole proprietor_ (entrepreneur individuel)**
- Statut par défaut : dès qu'on facture en son nom, on est *sole proprietor*, sans formalité fédérale (un *DBA* local si l'on utilise un nom commercial).
- Le bénéfice se déclare sur le *Schedule C* et le *self-employment tax* sur le *Schedule SE*, avec la *Form 1040*.
- Aucune séparation juridique : le patrimoine personnel répond des dettes professionnelles.
- Pertinent pour démarrer, tester une activité, ou pour un freelance à faible risque juridique et revenu modeste.
- On peut utiliser son *SSN* ou obtenir gratuitement un *EIN* pour ne pas communiquer son SSN aux clients.

**_Single-member LLC_ (SARL unipersonnelle, à peu près)**
- Société créée auprès d'un État (frais d'immatriculation et parfois taxe annuelle, variables selon l'État — à vérifier État par État).
- Fiscalement « transparente » par défaut (*disregarded entity*) : mêmes formulaires et même impôt que le *sole proprietor* (*Schedule C* + *SE*).
- Intérêt principal : responsabilité limitée (protection du patrimoine personnel), image plus professionnelle, compte bancaire séparé.
- Pertinent dès qu'il existe un risque de litige client, un patrimoine à protéger, ou des contrats exigeant une structure.
- Attention : certains États sans impôt sur le revenu taxent quand même les LLC (ex. Tennessee, Texas — non vérifié ici).

**_S-corp election_ (option pour le régime de la S corporation)**
- Ce n'est pas un statut juridique mais une option fiscale (*Form 2553*) ouverte à une LLC ou à une société.
- Le freelance devient salarié de sa structure : il se verse un salaire « raisonnable » (*reasonable compensation*) soumis aux charges sociales, et le reste du bénéfice sort en distributions non soumises au *self-employment tax*.
- Coûts : paie (*payroll*), déclaration *Form 1120-S*, comptable, frais d'État ; le salaire versé réduit aussi la base QBI.
- Pertinent seulement quand le bénéfice net est nettement supérieur à un salaire raisonnable pour le métier ; il n'existe pas de seuil officiel — à valider avec un *CPA*.
- Échéance usuelle de l'option pour une année civile : 2 mois et 15 jours après le début de l'année (15 mars 2027 pour 2027) — règle légale, non revérifiée en ligne ici.

---

## 2. Chiffres clés 2026

| Élément | Valeur 2026 | Confiance | Source |
|---|---|---|---|
| *Social Security* (part du *self-employment tax*) | 12,4 % | élevée | [SSA – COLA Fact Sheet 2026](https://www.ssa.gov/news/en/cola/factsheets/2026.html) |
| *Medicare* (part du *self-employment tax*) | 2,9 % (sans plafond) | élevée | [SSA – COLA Fact Sheet 2026](https://www.ssa.gov/news/en/cola/factsheets/2026.html) |
| Taux global *self-employment tax* | 15,3 % sous le plafond | élevée | [IRS – Topic 554](https://www.irs.gov/taxtopics/tc554) |
| Assiette : part du bénéfice net soumise | 92,35 % | élevée | [IRS – Topic 554](https://www.irs.gov/taxtopics/tc554) |
| Seuil de *net earnings* pour devoir le *SE tax* | 400 $ | élevée | [IRS – Topic 554](https://www.irs.gov/taxtopics/tc554) |
| Déduction de la moitié du *SE tax* (calcul de l'*AGI*) | 50 % | élevée | [IRS – Topic 554](https://www.irs.gov/taxtopics/tc554) |
| Plafond *Social Security* (*wage base*) 2026 | 184 500 $ | élevée | [SSA – Contribution and Benefit Base](https://www.ssa.gov/oact/cola/cbb.html) |
| Cotisation *Social Security* maximale d'un indépendant 2026 | 22 878 $ (calculé) | élevée | idem |
| Plafond *Social Security* 2027 (déjà publié) | 192 300 $ | élevée | [SSA – COLA Fact Sheet 2027](https://www.ssa.gov/news/en/cola/factsheets/2027.html) |
| *Additional Medicare Tax* | 0,9 % au-delà de 200 000 $ (*single*, *head of household*), 250 000 $ (*married filing jointly*), 125 000 $ (*married filing separately*) — non indexés | élevée | [IRS – Instructions Form 8959](https://www.irs.gov/instructions/i8959) |
| Barème *single* | 10 % ≤ 12 400 ; 12 % ≤ 50 400 ; 22 % ≤ 105 700 ; 24 % ≤ 201 775 ; 32 % ≤ 256 225 ; 35 % ≤ 640 600 ; 37 % au-delà | élevée | [IRS – Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) |
| Barème *married filing jointly* | 10 % ≤ 24 800 ; 12 % ≤ 100 800 ; 22 % ≤ 211 400 ; 24 % ≤ 403 550 ; 32 % ≤ 512 450 ; 35 % ≤ 768 700 ; 37 % au-delà | élevée | [IRS – Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) |
| Barème *head of household* | 10 % ≤ 17 700 ; 12 % ≤ 67 450 ; 22 % ≤ 105 700 ; 24 % ≤ 201 750 ; 32 % ≤ 256 200 ; 35 % ≤ 640 600 ; 37 % au-delà | élevée (voir note) | [IRS – Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) |
| *Standard deduction* | 16 100 $ (*single*, *MFS*) ; 32 200 $ (*MFJ*) ; 24 150 $ (*HOH*) | élevée | [IRS – Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) |
| Déduction QBI (*Section 199A*) | 20 %, rendue **permanente** par l'OBBBA | élevée | [IRS – OBBB provisions](https://www.irs.gov/newsroom/one-big-beautiful-bill-provisions-individuals-and-workers) |
| Seuil QBI 2026 (début des limitations) | 201 750 $ (*single*, *HOH*) ; 201 775 $ (*MFS*) ; 403 500 $ (*MFJ*) | élevée | [IRS – Rev. Proc. 2025-32](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf) |
| Fourchette de *phase-in* QBI (OBBBA) | 75 000 $ (150 000 $ *MFJ*) → fin à 276 750 $ / 553 500 $ | élevée | idem |
| Déduction QBI minimale (OBBBA) | 400 $ si ≥ 1 000 $ de QBI d'une activité active (indexé dès 2027) | moyenne | [IRS – OBBB provisions](https://www.irs.gov/newsroom/one-big-beautiful-bill-provisions-individuals-and-workers) |
| Seuil d'obligation d'acomptes | impôt attendu ≥ 1 000 $ | élevée | [IRS – Estimated taxes](https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes) |
| *Safe harbor* acomptes | le plus faible de 90 % de l'impôt 2026 ou 100 % de l'impôt 2025 (110 % si *AGI* 2025 > 150 000 $, 75 000 $ en *MFS*) | élevée | [IRS – Form 1040-ES 2026](https://www.irs.gov/pub/irs-pdf/f1040es.pdf) |
| Seuil *Form 1099-NEC* / *1099-MISC* (paiements faits en 2026) | 2 000 $ par bénéficiaire (600 $ jusqu'en 2025), indexable dès 2027 | élevée | [IRS – Instructions 1099-MISC/NEC (déc. 2026)](https://www.irs.gov/instructions/i1099mec) |
| Seuil *Form 1099-K* (plateformes de paiement) | > 20 000 $ **et** > 200 transactions (retour à l'ancien seuil, OBBBA) | élevée | [IRS – IR-2025-107](https://www.irs.gov/newsroom/irs-issues-faqs-on-form-1099-k-threshold-under-the-one-big-beautiful-bill-dollar-limit-reverts-to-20000) |
| *Backup withholding* (TIN manquant sur *W-9*) | 24 % | moyenne | [IRS – Instructions 1099-MISC/NEC](https://www.irs.gov/instructions/i1099mec) |
| Indemnité kilométrique (*standard mileage rate*) | 0,725 $/mile du 1/01 au 30/06/2026 | élevée | [IRS – IR-2025-128](https://www.irs.gov/newsroom/irs-sets-2026-business-standard-mileage-rate-at-725-cents-per-mile-up-25-cents) |
| Indemnité kilométrique, hausse en cours d'année | 0,76 $/mile du 1/07 au 31/12/2026 (*Announcement 2026-11*) | moyenne | [Thomson Reuters](https://tax.thomsonreuters.com/news/irs-announces-midyear-increase-in-standard-mileage-rates-for-business-medical-and-moving-expense-purposes/) |
| Bureau à domicile, méthode simplifiée | 5 $/pied carré, 300 pieds carrés max (1 500 $ max) — toujours en vigueur | élevée | [IRS – Simplified option](https://www.irs.gov/businesses/small-businesses-self-employed/simplified-option-for-home-office-deduction) |
| États sans impôt sur le revenu d'activité | AK, FL, NV, NH, SD, TN, TX, WA, WY | élevée | [Tax Foundation 2026](https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/) |

**Notes importantes**

- **OBBBA** (*One Big Beautiful Bill Act*, P.L. 119-21, signée le 4 juillet 2025) : barème TCJA rendu permanent, *standard deduction* 2025 relevée (15 750 / 31 500 / 23 625 $) puis indexée pour 2026, QBI rendue permanente avec *phase-in* élargi et minimum de 400 $, seuil *1099-NEC* porté à 2 000 $, seuil *1099-K* ramené à 20 000 $ / 200 transactions.
- **Barème *head of household*** : la limite 24 %/32 % est 201 750 $ dans la Rev. Proc. (cohérent avec l'impôt cumulé de 191 171 $ à 640 600 $). Plusieurs sites secondaires (dont le tableau de la Tax Foundation) affichent 201 775 $, qui est le chiffre *single*.
- **Professions de service (*SSTB*)** : conseil, droit, comptabilité, santé, arts du spectacle, services financiers… perdent progressivement la déduction QBI entre le seuil et la fin du *phase-in*, et totalement au-delà. Beaucoup de freelances sont concernés.
- **Indemnités kilométriques 2026** : la hausse du 1er juillet 2026 est rare (la précédente date de juillet 2022). Un calculateur doit séparer les miles parcourus avant et après le 1er juillet.
- **Washington** ne taxe que les plus-values (pas le revenu d'activité) ; le **New Hampshire** a supprimé sa taxe sur intérêts et dividendes à partir de 2025. Des taxes au niveau de l'entreprise peuvent s'appliquer malgré tout (B&O tax à Washington, *franchise tax* au Texas et au Tennessee pour les LLC — non vérifié ici).

### Taxe sur les ventes (*sales tax*) et services

La plupart des États ne soumettent pas les services professionnels (conseil, rédaction, design, droit, comptabilité) à la *sales tax* ; seuls quelques États taxent les services par défaut : Hawaï (*general excise tax*), Nouveau-Mexique (*gross receipts tax*), Dakota du Sud et Virginie-Occidentale ([TaxJar](https://www.taxjar.com/sales-tax/when-should-a-business-charge-sales-tax-on-services), source secondaire). Deux exceptions récentes concernent directement les freelances tech :

- **Washington** : depuis le 1er octobre 2025 (*ESSB 5814*), la *retail sales tax* s'applique aux services informatiques (support, réseau, conseil IT, formation), à certains services publicitaires, etc. Les services professionnels livrés électroniquement restent en principe exclus. Pénalités allégées jusqu'au 31/12/2026 ([WA DOR](https://dor.wa.gov/taxes-rates/retail-sales-tax/services-newly-subject-retail-sales-tax)).
- **Maryland** : taxe de 3 % depuis le 1er juillet 2025 sur les services informatiques et de données (NAICS 518, 519, 5415) et l'édition de logiciels (5132) ([Maryland Comptroller, Technical Bulletin 56](https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/legal-publications/technical-bulletins/tb-56.pdf)).

---

## 3. Calendrier fiscal 2026–2027 (année fiscale 2026)

| Date | Échéance | Source / confiance |
|---|---|---|
| 15 avril 2026 (mer.) | 1er acompte 2026 (revenus du 1/01 au 31/03) | [Form 1040-ES 2026](https://www.irs.gov/pub/irs-pdf/f1040es.pdf) — élevée |
| 15 juin 2026 (lun.) | 2e acompte (revenus du 1/04 au 31/05) | idem — élevée |
| 1er juillet 2026 | Indemnité kilométrique portée à 0,76 $/mile | Announcement 2026-11 — moyenne |
| 15 septembre 2026 (mar.) | 3e acompte (revenus du 1/06 au 31/08) | idem — élevée |
| 14 octobre 2026 | Publication par la SSA du plafond 2027 (192 300 $) | [SSA](https://www.ssa.gov/blog/en/posts/2026-10-14.html) — élevée |
| octobre–novembre 2026 | Publication attendue des barèmes IRS 2027 (*Rev. Proc.*) | non encore parue lors de la vérification |
| fin décembre 2026 | Publication attendue des indemnités kilométriques 2027 | habitude (29/12/2025 l'an dernier) |
| 15 janvier 2027 (ven.) | 4e acompte 2026 (revenus du 1/09 au 31/12) — facultatif si la déclaration 2026 est déposée et l'impôt payé avant le 1er février 2027 | [Form 1040-ES 2026](https://www.irs.gov/pub/irs-pdf/f1040es.pdf) — élevée |
| 1er février 2027 (lun.) | Les clients doivent envoyer les *Form 1099-NEC* (paiements 2026 ≥ 2 000 $) au freelance et à l'IRS (31 janvier = dimanche) | [Instructions 1099](https://www.irs.gov/instructions/i1099mec) — moyenne (date déduite de la règle) |
| 15 mars 2027 (lun.) | Date limite usuelle de l'option *S corporation* (*Form 2553*) pour 2027 et de la *Form 1120-S* 2026 | règle légale — faible (non revérifiée) |
| 15 avril 2027 (jeu.) | Déclaration 2026 (*Form 1040*, *Schedule C*, *Schedule SE*) et paiement du solde ; 1er acompte 2027 | [Pub. 509](https://www.irs.gov/publications/p509) — moyenne |
| 15 octobre 2027 (ven.) | Date limite si prorogation (*Form 4868*) — prorogation du dépôt, pas du paiement | règle légale — moyenne |

---

## 4. Lois de protection des freelances (paiement et contrat écrit)

Il n'existe pas de loi fédérale ; ce sont des lois d'État ou de ville. Elles imposent un contrat écrit au-delà d'un seuil et un délai de paiement par défaut (souvent 30 jours après la fin de la mission) quand le contrat n'en prévoit pas.

| Juridiction | En vigueur depuis | Seuil du contrat écrit | Délai de paiement par défaut | Sanctions / autorité | Confiance |
|---|---|---|---|---|---|
| **New York City** — *Freelance Isn't Free Act* | 15 mai 2017 | 800 $ (seul ou cumulé sur 120 jours) | date du contrat, sinon 30 jours après la fin du travail | dommages doublés, frais d'avocat ; DCWP | élevée — [nyc.gov](https://www.nyc.gov/assets/dca/downloads/pdf/workers/Protecting-Freelance-Workers.pdf) |
| **État de New York** — *Freelance Isn't Free Act* (GBL art. 44-A) | 28 août 2024 | 800 $ (cumulé sur 120 jours) | date du contrat, sinon 30 jours après la fin | dommages doublés ; *Attorney General* | élevée — [dol.ny.gov](https://dol.ny.gov/freelance-isnt-free-act) |
| **Illinois** — *Freelance Worker Protection Act* | 1er juillet 2024 | 500 $ (cumulé sur 120 jours) | date du contrat, sinon 30 jours après la fin | 500 $ si contrat refusé, frais d'avocat ; IDOL | élevée — [labor.illinois.gov](https://labor.illinois.gov/laws-rules/legal/freelance-worker-protection-act.html) |
| **Californie** (État) — *Freelance Worker Protection Act* (SB 988) | 1er janvier 2025 | 250 $ (cumulé sur 120 jours) | date du contrat, sinon 30 jours après la fin | action civile, anti-représailles | moyenne — [SB 988](https://calmatters.digitaldemocracy.org/bills/ca_202320240sb988) |
| **Los Angeles** (ville) | 1er juillet 2023 | 600 $ par année civile | date du contrat, sinon 30 jours après la fin | 250 $ si contrat refusé, jusqu'au double des impayés ; *Office of Wage Standards* | moyenne — [wagesla.lacity.gov](https://wagesla.lacity.gov/sites/g/files/wph1941/files/2023-06/Freelance%20Worker%20Protections%20Summary.pdf) |
| **Minneapolis** | 1er janvier 2021 | 600 $ par année civile ou 200 $ sur 7 jours (donneurs d'ordre professionnels) | date fixée au contrat (pas de délai légal par défaut trouvé) | ~250 $ par travailleur (source secondaire) ; *Department of Civil Rights* | moyenne — [minneapolismn.gov](https://minimumwage.minneapolismn.gov/uploads/9/6/3/1/96313024/freelance_faqs_final_draft.pdf) |
| **Columbus (Ohio)** | 2023 (date exacte à confirmer) | 250 $ (seul ou sur 120 jours) | date du contrat, sinon 30 jours après la fin | non vérifié | moyenne — [Epstein Becker Green](https://www.ebglaw.com/workforce-bulletin/columbus-oh-adds-freelance-worker-protections-to-its-city-code) |
| **Seattle** — *Independent Contractor Protections Ordinance* | 1er septembre 2022 (à vérifier) | 600 $/an (à vérifier) | 30 jours (à vérifier) | *Office of Labor Standards* | **faible** — non vérifié |

Précisions : à New York (État), les avocats, professions médicales réglementées, entrepreneurs du bâtiment et certains représentants commerciaux sont exclus. En Illinois, la loi couvre le travail réalisé en Illinois ou pour un donneur d'ordre situé en Illinois. À Los Angeles, la date d'entrée en vigueur est 2023 (et non 2025 comme parfois indiqué).

---

## 5. Facturation et retards de paiement

**Facture.** Aucune mention obligatoire fédérale n'existe pour une facture entre entreprises (pas d'équivalent des mentions françaises). Usages : nom et adresse des parties, numéro et date, description des prestations, montant, échéance, modalités de paiement, conditions de retard. Sales tax uniquement si l'État et le service sont taxables (voir § 2).

**Formulaires associés.**
- Le client demande au freelance une *Form W-9* (nom, classification fiscale, adresse, *SSN* ou *EIN*). Une *single-member LLC* transparente indique le nom du propriétaire en ligne 1 et le numéro fiscal du propriétaire. Sans numéro valable, le client peut appliquer le *backup withholding* (24 %). (Confiance moyenne — instructions W-9 non relues dans cette session.)
- Le client envoie une *Form 1099-NEC* si ses paiements 2026 au freelance atteignent 2 000 $ (600 $ auparavant). Les paiements par carte ou plateforme relèvent de la *Form 1099-K* (au-delà de 20 000 $ et 200 transactions), pas de la 1099-NEC. Le revenu reste imposable même sans formulaire.

**Pénalités de retard.**
- **Pas de règle fédérale** pour les relations entre entreprises privées : pas d'équivalent de l'indemnité forfaitaire française de 40 € ni d'un taux légal national.
- Une pénalité ou des intérêts de retard ne sont exigibles que s'ils ont été **acceptés contractuellement** (contrat, devis signé, conditions générales). Ils doivent respecter le **plafond d'usure de l'État** et la doctrine des *liquidated damages* (montant raisonnable, pas une sanction).
- Les lois « freelance » ci-dessus ajoutent des recours légaux (dommages doublés à NYC, dans l'État de New York et à Los Angeles), sans fixer de taux d'intérêt.
- Exemples (confiance **faible**, textes non revérifiés en ligne dans cette session) :
  - **Californie** : à défaut de taux contractuel, une obligation porte intérêt à 10 % par an après la défaillance (*Civil Code* § 3289) ; pénalités contractuelles appréciées selon *Civil Code* § 1671.
  - **New York** : plafond d'usure civil de 16 % par an (*General Obligations Law* § 5-501, *Banking Law* § 14-a), usure pénale au-delà de 25 %.
  - **Marchés publics fédéraux** : le *Prompt Payment Act* impose aux agences fédérales des intérêts de retard au-delà de l'échéance (en général 30 jours après une facture conforme) — ne concerne que les clients fédéraux.
- Recommandation produit : le générateur de factures doit proposer un champ « *late fee* » libre avec un avertissement (« doit être prévu au contrat et respecter la loi de votre État »), sans taux par défaut.

---

## 6. Points à revérifier chaque année

| Élément | Organisme | Publication habituelle |
|---|---|---|
| Plafond *Social Security* (*wage base*) | SSA | mi-octobre, avec le *COLA* (14/10/2026 pour 2027 ; 24/10/2025 pour 2026) |
| Barèmes, *standard deduction*, seuils QBI, seuil 1099-NEC indexé (dès 2027), minimum QBI indexé | IRS (*Revenue Procedure*) | octobre–novembre (9/10/2025 pour 2026) |
| Indemnité kilométrique | IRS (*Notice*) | fin décembre ; révision possible en juillet (2022, 2026) |
| *Form 1040-ES* (échéances, *safe harbor*) | IRS | décembre–janvier |
| Instructions 1099-MISC/NEC | IRS | publiées en cours d'année (révision « décembre ») |
| Seuil 1099-K | IRS | stable (loi) ; vérifier les FAQ en début d'année |
| Méthode simplifiée bureau à domicile (5 $/pied²) | IRS | inchangée depuis 2013 ; vérifier les instructions *Schedule C* / *Form 8829* (décembre–janvier) |
| *Additional Medicare Tax*, seuil 400 $, 92,35 %, *safe harbor* 150 000 $ | loi fédérale | non indexés — vérifier seulement en cas de réforme |
| Impôts d'État, *sales tax* sur services (WA, MD…) | administrations fiscales des États | entrées en vigueur le 1er janvier et le 1er juillet ; sessions législatives de janvier à juin |
| Lois de protection des freelances | villes et États | au fil de l'eau ; contrôle semestriel conseillé |

---

## 7. Questions ouvertes

- Barèmes IRS 2027 non encore publiés lors de la vérification (attendus en octobre–novembre 2026).
- Hausse kilométrique de juillet 2026 : confirmer le texte de l'*Announcement 2026-11* sur irs.gov.
- Seattle, Columbus : textes officiels à retrouver (seuils, dates, sanctions).
- Montants des pénalités de la loi de l'État de New York après l'amendement S8039.
- Exemples de pénalités de retard (Californie, New York, *Prompt Payment Act*) à confirmer sur les textes officiels avant affichage.
- Taxes d'entreprise dans les États sans impôt sur le revenu (WA B&O, TN, TX, NV) : non vérifiées.
- Statut du projet ESSB 6346 (Washington).

---

## 8. Sources

**Officielles (fédéral)**
- IRS — Topic no. 554, Self-employment tax : https://www.irs.gov/taxtopics/tc554
- IRS — Rev. Proc. 2025-32 (ajustements 2026) : https://www.irs.gov/pub/irs-drop/rp-25-32.pdf
- IRS — Inflation-adjusted tax items by tax year : https://www.irs.gov/newsroom/inflation-adjusted-tax-items-by-tax-year
- IRS — One, Big, Beautiful Bill provisions (individuals and workers) : https://www.irs.gov/newsroom/one-big-beautiful-bill-provisions-individuals-and-workers
- IRS — Instructions for Form 8959 (Additional Medicare Tax) : https://www.irs.gov/instructions/i8959
- IRS — 2026 Form 1040-ES : https://www.irs.gov/pub/irs-pdf/f1040es.pdf
- IRS — Estimated taxes : https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes
- IRS — Publication 509, Tax Calendars : https://www.irs.gov/publications/p509
- IRS — Instructions for Forms 1099-MISC and 1099-NEC (Rev. December 2026) : https://www.irs.gov/instructions/i1099mec
- IRS — FAQ Form 1099-K, seuil ramené à 20 000 $ (IR-2025-107) : https://www.irs.gov/newsroom/irs-issues-faqs-on-form-1099-k-threshold-under-the-one-big-beautiful-bill-dollar-limit-reverts-to-20000
- IRS — About Form W-9 : https://www.irs.gov/forms-pubs/about-form-w-9
- IRS — 2026 business standard mileage rate 72.5 cents (IR-2025-128) : https://www.irs.gov/newsroom/irs-sets-2026-business-standard-mileage-rate-at-725-cents-per-mile-up-25-cents
- IRS — Simplified option for home office deduction : https://www.irs.gov/businesses/small-businesses-self-employed/simplified-option-for-home-office-deduction
- SSA — 2026 COLA Fact Sheet : https://www.ssa.gov/news/en/cola/factsheets/2026.html
- SSA — 2027 COLA Fact Sheet : https://www.ssa.gov/news/en/cola/factsheets/2027.html
- SSA — Contribution and Benefit Base : https://www.ssa.gov/oact/cola/cbb.html
- SSA — Annonce du 14 octobre 2026 : https://www.ssa.gov/blog/en/posts/2026-10-14.html

**Officielles (États et villes)**
- NYC DCWP — Protecting Freelance Workers : https://www.nyc.gov/assets/dca/downloads/pdf/workers/Protecting-Freelance-Workers.pdf
- NYS DOL — Freelance Isn't Free Act : https://dol.ny.gov/freelance-isnt-free-act
- NY Senate — S8039 (amendement) : https://www.nysenate.gov/legislation/bills/2023/S8039
- Illinois DOL — Freelance Worker Protection Act : https://labor.illinois.gov/laws-rules/legal/freelance-worker-protection-act.html
- Illinois General Assembly — 820 ILCS 193 : https://www.ilga.gov/Legislation/ILCS/Articles?ActID=4441&ChapterID=68
- Los Angeles Office of Wage Standards — résumé de l'ordonnance : https://wagesla.lacity.gov/sites/g/files/wph1941/files/2023-06/Freelance%20Worker%20Protections%20Summary.pdf
- Minneapolis — FAQ Freelance Worker Protections : https://minimumwage.minneapolismn.gov/uploads/9/6/3/1/96313024/freelance_faqs_final_draft.pdf
- Seattle — Office of Labor Standards (non vérifié) : https://www.seattle.gov/laborstandards
- Washington DOR — Services newly subject to retail sales tax : https://dor.wa.gov/taxes-rates/retail-sales-tax/services-newly-subject-retail-sales-tax
- Maryland Comptroller — Technical Bulletin 56 : https://www.marylandcomptroller.gov/content/dam/mdcomp/tax/legal-publications/technical-bulletins/tb-56.pdf
- Californie — Civil Code § 3289 (non vérifié) : https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=3289
- New York — General Obligations Law § 5-501 (non vérifié) : https://www.nysenate.gov/legislation/laws/GOB/5-501

**Secondaires (recoupement)**
- Tax Foundation — 2026 State Income Tax Rates and Brackets : https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
- Tax Foundation — Nonresident Income Tax Filing Laws by State, 2026 : https://taxfoundation.org/data/all/state/nonresident-income-tax-filing/
- Journal of Accountancy / The Tax Adviser — ajustements 2026 : https://www.thetaxadviser.com/news/2025/oct/annual-inflation-adjustments-announced-for-tax-year-2026/
- Spidell — chiffres QBI 2026 : https://spidell.com/?p=641291
- Capital Group — Federal tax rates 2026 : https://www.capitalgroup.com/individual/service-and-support/other-resources/federal-tax-rates.html
- Thomson Reuters — hausse kilométrique en cours d'année 2026 : https://tax.thomsonreuters.com/news/irs-announces-midyear-increase-in-standard-mileage-rates-for-business-medical-and-moving-expense-purposes/
- SHRM — IRS Increases Standard Mileage Rate for Second Half of 2026 : https://www.shrm.org/topics-tools/news/benefits-compensation/irs-increases-standard-mileage-rate-for-second-half-of-2026-
- TaxJar — Sales tax on services : https://www.taxjar.com/sales-tax/when-should-a-business-charge-sales-tax-on-services
- CalMatters Digital Democracy — SB 988 : https://calmatters.digitaldemocracy.org/bills/ca_202320240sb988
- Epstein Becker Green — Columbus, OH freelance protections : https://www.ebglaw.com/workforce-bulletin/columbus-oh-adds-freelance-worker-protections-to-its-city-code
- Fisher Phillips — FAQ ordonnance de Los Angeles : https://www.fisherphillips.com/en/news-insights/faqs-los-angeles-freelance-worker-protections-ordinance.html
