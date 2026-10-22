# Canada : règles fiscales du travailleur autonome (année d'imposition 2026)

Vérifié le 2026-10-20 · Données lisibles par les calculateurs : `data/rules/ca.json`

**Comment lire ce document.** Chaque chiffre a un niveau de confiance (repris de `ca.json`) :

- **élevée** : lu sur une page officielle (ARC, Revenu Québec, Retraite Québec, Québec.ca, gouvernement provincial) le 2026-10-20, ou calculé directement à partir de ces chiffres ;
- **moyenne** : règle stable ou chiffre officiel connu, mais pas rouvert le 2026-10-20, ou chiffre confirmé seulement par des sources professionnelles (EY, Andersen, CI Financial, ATB) et cohérent avec l'indexation officielle ;
- **faible** : chiffre 2026 non confirmé ; la dernière valeur connue est donnée.

**Limites de la recherche.** L'accès direct aux sites officiels (canada.ca, revenuquebec.ca, laws-lois.justice.gc.ca) était bloqué, et le quota de recherches web partagé a été épuisé en cours de travail. Voici ce qui n'a donc pas pu être revérifié en ligne : les taux de taxes de vente, les règles de facturation, les acomptes, la *Loi sur l'intérêt* et le taux par kilomètre. Ces éléments sont signalés plus bas.

---

## 1. Résumé pour le travailleur autonome canadien

### Entreprise individuelle (*sole proprietorship*)

1. Aucune formalité de constitution. Le revenu net d'entreprise s'ajoute aux autres revenus sur la déclaration T1 (formulaire T2125) et, au Québec, aussi sur la TP-1 (formulaire TP-80).
2. Imposition progressive : fédéral de 14 % à 33 % plus un barème provincial ou territorial (section 4). Les cotisations au RPC/RRQ couvrent les parts salarié et employeur : 11,9 % (RPC) ou 12,6 % (RRQ), plus 8 % entre 74 600 $ et 85 000 $.
3. L'inscription à la TPS/TVH (et à la TVQ au Québec) devient obligatoire au-delà de 30 000 $ de fournitures taxables sur quatre trimestres civils consécutifs. En dessous, l'inscription est facultative.
4. Acomptes provisionnels trimestriels si l'impôt net dû dépasse 3 000 $ (1 800 $ au Québec). La déclaration est due au plus tard le 15 juin, mais le solde est payable dès le 30 avril.
5. Responsabilité illimitée sur les biens personnels. L'assurance-emploi n'existe que sur adhésion volontaire (prestations spéciales). Au Québec, le RQAP est obligatoire.

### Société par actions (*incorporation*)

1. Constitution fédérale (*Canada Business Corporations Act*) ou provinciale. La société est une personne distincte : elle produit sa propre déclaration (T2, et CO-17 au Québec) et s'inscrit elle-même aux taxes de vente.
2. Le revenu d'entreprise exploitée activement d'une SPCC bénéficie de la déduction pour petite entreprise : 9 % au fédéral sur les premiers 500 000 $, plus un taux provincial réduit. Le taux général fédéral est de 15 %. Confiance moyenne (à revérifier).
3. Le dirigeant se paie en salaire (RPC/RRQ, retenues à la source, feuillet T4) ou en dividendes (pas de RPC). L'impôt est reporté tant que les bénéfices restent dans la société.
4. Coûts supplémentaires : constitution, tenue de livres, états financiers, déclarations annuelles au registre des entreprises.
5. Responsabilité limitée, sauf cautions personnelles. Attention aux règles anti-abus : un pigiste qui serait autrement employé de son client exploite une *personal services business*, qui perd le taux réduit. L'impôt sur le revenu fractionné (*TOSI*) s'applique aux dividendes versés à la famille.

---

## 2. Taxes de vente

### Taux par province et territoire (confiance moyenne : non rouverts le 2026-10-20)

| Province / territoire | Type | Fédéral | Provincial | Total | Remarque |
|---|---|---|---|---|---|
| Ontario | TVH (*HST*) | 5 % | 8 % | **13 %** | |
| Québec | TPS + TVQ | 5 % | 9,975 % | **14,975 %** | TVQ calculée sur le prix hors TPS ; administrée par Revenu Québec |
| Colombie-Britannique | TPS + TVP (*PST*) | 5 % | 7 % | **12 %** | TVP : inscription séparée (eTaxBC) |
| Alberta | TPS (*GST*) | 5 % | aucune | **5 %** | |
| Saskatchewan | TPS + TVP (*PST*) | 5 % | 6 % | **11 %** | TVP : inscription séparée |
| Manitoba | TPS + TVD (*RST*) | 5 % | 7 % | **12 %** | RST passée de 8 % à 7 % le 2019-07-01 |
| Nouvelle-Écosse | TVH | 5 % | 9 % | **14 %** | Passée de 15 % à 14 % le 2025-04-01 |
| Nouveau-Brunswick | TVH | 5 % | 10 % | **15 %** | |
| Terre-Neuve-et-Labrador | TVH | 5 % | 10 % | **15 %** | |
| Île-du-Prince-Édouard | TVH | 5 % | 10 % | **15 %** | |
| Yukon, T.N.-O., Nunavut | TPS | 5 % | aucune | **5 %** | |

### Quel taux facturer (*place of supply*)

Le taux dépend du **lieu de fourniture**, pas de la province du pigiste. Pour la plupart des services, c'est la province de l'adresse du client. Exemple : un graphiste albertain inscrit qui facture un client de Toronto applique la TVH de 13 %.

Les services rendus à un client non résident non inscrit sont en général **détaxés** (0 %, *zero-rated*). Il y a des exceptions, par exemple pour les services liés à un immeuble situé au Canada.

### Seuil du petit fournisseur (*small supplier*)

- **30 000 $** de fournitures taxables mondiales (les vôtres et celles des personnes associées), sur un seul trimestre civil ou sur les quatre derniers trimestres civils consécutifs.
- Dépassement en un seul trimestre : inscription et perception dès la fourniture qui fait dépasser le seuil.
- Dépassement sur quatre trimestres : inscription dans les 29 jours, et perception à compter de la fin du mois suivant.
- La TVQ suit le même seuil de 30 000 $. Au Québec, l'inscription à la TPS et à la TVQ se fait en général ensemble auprès de Revenu Québec.
- L'inscription volontaire permet de récupérer les taxes payées sur les achats (*input tax credits*, CTI ; *remboursements de la taxe sur les intrants*, RTI, au Québec).

### TVP/TVD et services professionnels (confiance faible)

La TVP de la C.-B. et de la Saskatchewan et la TVD du Manitoba visent les biens et une **liste fermée de services**. La plupart des services de conseil, de rédaction, de traduction ou de design n'y figurent pas. Certains services y figurent :

- en C.-B. : services juridiques, télécommunications, logiciels, services liés aux biens ;
- en Saskatchewan et au Manitoba : d'autres services énumérés, selon des listes propres à chaque province.

À vérifier service par service avant de paramétrer un calculateur.

---

## 3. RPC / RRQ, RQAP et assurance-emploi (2026)

### Régime de pensions du Canada (RPC, *Canada Pension Plan*), hors Québec (confiance élevée)

| Élément | 2026 |
|---|---|
| Maximum des gains ouvrant droit à pension (*YMPE*) | 74 600 $ (2025 : 71 300 $) |
| Exemption de base (*basic exemption*) | 3 500 $ |
| Taux salarié = taux employeur | 5,95 % (base 4,95 % + première bonification 1 %) |
| **Taux travailleur autonome** | **11,9 %** |
| **Cotisation maximale du travailleur autonome (RPC)** | **8 460,90 $** (salarié : 4 230,45 $) |
| Second plafond (*YAMPE*) | 85 000 $ |
| **Taux RPC2 travailleur autonome** (entre 74 600 $ et 85 000 $) | **8 %** (4 % + 4 %) |
| **Cotisation maximale RPC2 du travailleur autonome** | **832 $** (salarié : 416 $) |
| Total maximal du travailleur autonome | 9 292,90 $ |

### Régime de rentes du Québec (RRQ) (confiance élevée)

| Élément | 2026 |
|---|---|
| Maximum des gains admissibles (MGA) | 74 600 $ |
| Exemption générale | 3 500 $ |
| Taux salarié = taux employeur | **6,30 %** (base 5,30 % + supplémentaire 1 %). Baisse du taux de base, qui était de 5,40 % en 2025 |
| **Taux travailleur autonome** | **12,6 %** (base 10,6 % + 2 %). 2025 : 12,8 % |
| **Cotisation maximale du travailleur autonome (RRQ)** | **8 958,60 $** (calcul : 71 100 $ × 12,6 % ; salarié : 4 479,30 $) |
| Maximum supplémentaire (RRQ2) | 85 000 $, taux autonome 8 %, maximum 832 $ |
| Total maximal du travailleur autonome | 9 790,60 $ |

### Traitement fiscal des cotisations (confiance moyenne)

Le travailleur autonome **déduit** de son revenu (ligne 22200 de la T1) deux éléments :

- la moitié « employeur » de toutes ses cotisations ;
- la partie bonifiée de la moitié « salarié » (1 % de première bonification et 4 % du RPC2).

Seule la cotisation de **base** de la moitié salarié (4,95 % au RPC, 5,30 % au RRQ en 2026) donne un **crédit d'impôt non remboursable** (ligne 31000), au taux de 14 % au fédéral et au taux le plus bas de la province.

### RQAP (*Québec Parental Insurance Plan*) : obligatoire au Québec (confiance élevée)

| Élément | 2026 |
|---|---|
| Maximum du revenu assurable | 103 000 $ (2025 : 98 000 $) |
| **Taux travailleur autonome** | **0,764 %** (2025 : 0,878 %) |
| **Cotisation maximale du travailleur autonome** | **786,92 $** |
| Taux salarié / employeur | 0,430 % / 0,602 % |

Les taux du RQAP baissent globalement de 13 % au 2026-01-01 (Bulletin d'information 2025-8 des Finances du Québec). Le seuil minimal de revenu d'entreprise pour cotiser (environ 2 000 $) n'a pas été revérifié.

### Assurance-emploi (AE), prestations spéciales sur adhésion (*EI special benefits for self-employed*)

| Élément | 2026 | Confiance |
|---|---|---|
| Maximum de la rémunération assurable | 68 900 $ (2025 : 65 700 $) | élevée |
| Taux du travailleur autonome hors Québec | **1,63 %** (1,63 $ par 100 $), maximum **1 123,07 $** | élevée |
| Taux au Québec | 1,30 %, maximum 895,70 $ | moyenne pour son application aux autonomes |

Il n'y a pas de part employeur. La cotisation est payée une fois par an avec la déclaration. L'adhésion passe par une entente avec Service Canada et engage pour l'année civile entière.

---

## 4. Impôt sur le revenu 2026

### Fédéral (confiance élevée)

| Revenu imposable | Taux |
|---|---|
| 0 à 58 523 $ | **14 %** |
| 58 523 à 117 045 $ | 20,5 % |
| 117 045 à 181 440 $ | 26 % |
| 181 440 à 258 482 $ | 29 % |
| plus de 258 482 $ | 33 % |

- **Taux le plus bas** : abaissé de 15 % à 14 % au 2025-07-01 (projet de loi C-4). Le taux annuel était de 14,5 % pour 2025 ; il est de **14 % pour toute l'année 2026** et les suivantes. Les crédits non remboursables sont calculés à 14 %.
- **Indexation 2026** : 2,0 %.
- **Montant personnel de base** (*basic personal amount*, ligne 30000) : **16 452 $** au maximum, soit un crédit de 2 303,28 $. Le montant complet s'applique jusqu'à 181 440 $ de revenu net. Au-delà, le montant additionnel de 1 623 $ diminue linéairement jusqu'à un minimum de **14 829 $** à 258 482 $ et plus. Le maximum est en confiance élevée ; le minimum, en confiance moyenne (sources secondaires).
- **Montant canadien pour emploi** (*Canada employment amount*) : **ne s'applique pas** au revenu de travail autonome. Il est réservé aux revenus d'emploi (T4) et ne doit pas figurer dans les calculateurs pour pigistes.
- **Abattement du Québec** (*refundable Quebec abatement*) : les résidents du Québec réduisent leur impôt fédéral de base de **16,5 %** (confiance moyenne).

### Provinces et territoires (tranches de revenu imposable, montant personnel de base 2026)

| Province | Tranches 2026 | MPB 2026 | Confiance |
|---|---|---|---|
| **Ontario** | 5,05 % jusqu'à 53 891 $ · 9,15 % jusqu'à 107 785 $ · 11,16 % jusqu'à 150 000 $ · 12,16 % jusqu'à 220 000 $ · 13,16 % au-delà | 12 989 $ | élevée |
| **Québec** | 14 % jusqu'à 54 345 $ · 19 % jusqu'à 108 680 $ · 24 % jusqu'à 132 245 $ · 25,75 % au-delà | 18 952 $ | élevée |
| **Colombie-Britannique** | **5,60 %** jusqu'à 50 363 $ · 7,70 % jusqu'à 100 728 $ · 10,50 % jusqu'à 115 648 $ · 12,29 % jusqu'à 140 430 $ · 14,70 % jusqu'à 190 405 $ · 16,80 % jusqu'à 265 545 $ · 20,50 % au-delà | 13 216 $ | moyenne |
| **Alberta** | 8 % jusqu'à 61 200 $ · 10 % jusqu'à 154 259 $ · 12 % jusqu'à 185 111 $ · 13 % jusqu'à 246 813 $ · 14 % jusqu'à 370 220 $ · 15 % au-delà | 22 769 $ | moyenne |
| **Saskatchewan** | 10,5 % jusqu'à 54 532 $ · 12,5 % jusqu'à 155 805 $ · 14,5 % au-delà | 20 381 $ | élevée |
| **Manitoba** | 10,8 % jusqu'à 47 000 $ · 12,75 % jusqu'à 100 000 $ · 17,4 % au-delà | 15 780 $ | élevée |
| **Nouvelle-Écosse** | 8,79 % jusqu'à 30 995 $ · 14,95 % jusqu'à 61 991 $ · 16,67 % jusqu'à 97 417 $ · 17,5 % jusqu'à 157 124 $ · 21 % au-delà | 11 932 $ | élevée |
| **Nouveau-Brunswick** | 9,4 % jusqu'à 52 333 $ · 14 % jusqu'à 104 666 $ · 16 % jusqu'à 193 861 $ · 19,5 % au-delà | 13 664 $ | élevée |
| **Terre-Neuve-et-Labrador** | 8,7 % jusqu'à 44 678 $ · 14,5 % jusqu'à 89 354 $ · 15,8 % jusqu'à 159 528 $ · 17,8 % jusqu'à 223 340 $ · 19,8 % jusqu'à 285 318 $ · 20,8 % jusqu'à 570 638 $ · 21,3 % jusqu'à 1 141 275 $ · 21,8 % au-delà | 13 094 $ | moyenne |
| **Île-du-Prince-Édouard** | 9,5 % jusqu'à 33 928 $ · 13,47 % jusqu'à 65 820 $ · 16,6 % jusqu'à 106 890 $ · 17,62 % jusqu'à 142 250 $ · 19 % jusqu'à 200 000 $ · **20 %** au-delà | 15 000 $ | moyenne |
| **Yukon** | 6,4 % jusqu'à 58 523 $ · 9 % jusqu'à 117 045 $ · 10,9 % jusqu'à 181 440 $ · 12,8 % jusqu'à 500 000 $ · 15 % au-delà | 16 452 $ (suit le fédéral) | élevée |
| **Territoires du Nord-Ouest** | 5,9 % jusqu'à 53 003 $ · 8,6 % jusqu'à 106 009 $ · 12,2 % jusqu'à 172 346 $ · 14,05 % au-delà | 18 198 $ | élevée |
| **Nunavut** | 4 % jusqu'à 55 801 $ · 7 % jusqu'à 111 602 $ · 9 % jusqu'à 181 439 $ · 11,5 % au-delà | 19 659 $ | élevée |

Le MPB provincial donne un crédit au taux le plus bas de la province (par exemple 12 989 $ × 5,05 % en Ontario). L'impôt provincial dépend de la province de résidence au 31 décembre 2026.

**Points particuliers par province :**

- **Colombie-Britannique** : le budget 2026 (17 février 2026) relève le premier taux de 5,06 % à 5,60 % pour 2026 et les années suivantes. Les tables de paie utilisent 6,14 % à partir de juillet pour rattraper le premier semestre, mais le taux annuel est bien de 5,60 %. Les tranches sont gelées de 2027 à 2030. Le crédit de réduction d'impôt de la C.-B. (*BC tax reduction*) est porté à 690 $ au maximum.
- **Alberta** : les seuils intermédiaires proviennent de sources secondaires et correspondent à une indexation de 2,0 %. Le taux du crédit non remboursable (8 % ou 10 %) est à confirmer.
- **Manitoba** : les tranches et le MPB ne sont plus indexés depuis 2025. Le MPB diminue linéairement entre 200 000 $ et 400 000 $ de revenu net.
- **Nouvelle-Écosse** : indexation de 1,6 % en 2026. La réduction d'impôt pour faible revenu n'est pas modélisée.
- **Terre-Neuve-et-Labrador** : le budget 2026 porte le MPB de 11 188 $ à 15 000 $ à partir du 2026-07-01, ce qui donne 13 094 $ pour l'année 2026 selon gov.nl.ca. Quatre seuils intermédiaires sont calculés (2025 × 1,011), non lus sur une table officielle.
- **Île-du-Prince-Édouard** : le nouveau taux de 20 % au-delà de 200 000 $ s'applique dès 2026 selon le gouvernement de l'Î.-P.-É. et l'ARC (T4127 de juillet 2026), mais seulement en 2027 selon EY et CI. De plus, le seuil publié de 142 250 $ ne correspond pas aux 142 520 $ qu'on obtiendrait en indexant 140 000 $ de 1,8 %. Les deux points sont à confirmer.

### Ontario : surtaxe et contribution-santé (confiance élevée)

**Surtaxe** (*Ontario surtax*), calculée sur l'impôt ontarien de base après crédits :

- 20 % de la partie qui dépasse **5 818 $** ;
- plus 36 % de la partie qui dépasse **7 446 $**.

**Contribution-santé de l'Ontario** (*Ontario Health Premium*), selon le revenu imposable (RI). Elle n'est pas indexée.

| Revenu imposable | Contribution |
|---|---|
| ≤ 20 000 $ | 0 $ |
| 20 000 à 36 000 $ | min(300 $ ; 6 % × (RI − 20 000)) |
| 36 000 à 48 000 $ | min(450 $ ; 300 $ + 6 % × (RI − 36 000)) |
| 48 000 à 72 000 $ | min(600 $ ; 450 $ + 25 % × (RI − 48 000)) |
| 72 000 à 200 000 $ | min(750 $ ; 600 $ + 25 % × (RI − 72 000)) |
| > 200 000 $ | min(900 $ ; 750 $ + 25 % × (RI − 200 000)) |

### Québec : abattement fédéral

Le résident du Québec produit deux déclarations : la T1 auprès de l'ARC et la TP-1 auprès de Revenu Québec. Il réduit son impôt fédéral de base de **16,5 %** (abattement remboursable). Ne sont pas modélisés : la cotisation au Fonds des services de santé et la prime au régime public d'assurance médicaments (voir les questions ouvertes).

---

## 5. Acomptes provisionnels (*instalments*) et calendrier

**Qui doit verser des acomptes** (confiance moyenne : règle légale stable, *Income Tax Act*, art. 156.1) :

- hors Québec : impôt net dû supérieur à **3 000 $** en 2026 **et** en 2025 ou en 2024 ;
- au Québec : **1 800 $** d'impôt fédéral net dû. Revenu Québec applique de son côté le même seuil de 1 800 $ à l'impôt du Québec.

**Comment calculer les acomptes :** trois méthodes au choix.

1. Sans calcul : on verse les montants indiqués sur les rappels de l'ARC.
2. Année précédente : on se base sur l'impôt de l'année précédente.
3. Année courante : on se base sur une estimation de l'impôt de l'année.

L'impôt net dû inclut les cotisations RPC/AE sur le revenu de travail autonome et, en Ontario, la contribution-santé.

| Échéance | 2026 | 2027 |
|---|---|---|
| 1er acompte | 15 mars 2026 (dimanche : un paiement reçu le lundi 16 mars est à temps) | 15 mars 2027 (lundi) |
| 2e acompte | 15 juin 2026 (lundi) | 15 juin 2027 (mardi) |
| 3e acompte | 15 septembre 2026 (mardi) | 15 septembre 2027 (mercredi) |
| 4e acompte | 15 décembre 2026 (mardi) | 15 décembre 2027 (mercredi) |
| **Paiement du solde 2026** (*balance-due day*) | | **30 avril 2027** (vendredi) |
| **Production de la déclaration 2026** (travailleur autonome et conjoint) | | **15 juin 2027** (mardi) |

Les dates sont les mêmes pour Revenu Québec. Des intérêts courent sur le solde impayé dès le 1er mai, même si la déclaration peut être produite jusqu'au 15 juin. La pénalité de production tardive est de 5 % du solde, plus 1 % par mois complet de retard, jusqu'à 12 mois (art. 162(1)).

---

## 6. Règles de facturation

### Numéros d'inscription (confiance moyenne)

- **TPS/TVH** : numéro d'entreprise à 9 chiffres + « RT » + 4 chiffres, par exemple `123456789 RT0001`.
- **TVQ** : 10 chiffres + « TQ » + 4 chiffres, par exemple `1234567890 TQ0001`.
- La TVP de la C.-B., de la Saskatchewan et la TVD du Manitoba ont leurs propres numéros.

### Mentions nécessaires pour que le client puisse demander ses CTI

Ces mentions sont prévues par le *Input Tax Credit Information (GST/HST) Regulations*, DORS/91-45 (confiance moyenne ; répartition par palier revérifiée le 21/10/2026 sur le tableau du mémorandum 8.4 de l'ARC). Les seuils de 100 $ et 500 $, taxes comprises, remplacent les anciens seuils de 30 $ et 150 $ (date d'effet : l'ARC mentionne le 20 avril 2021, une note antérieure le 2021-01-01 ; non affichée sur le site).

| Total de la facture | Mentions requises |
|---|---|
| **Moins de 100 $** | Nom ou raison sociale du fournisseur (ou de l'intermédiaire) · date de la facture (ou du paiement) · montant total payé ou payable |
| **100 $ à 499,99 $** | Tout ce qui précède · **numéro d'inscription TPS/TVH** du fournisseur · montant de la taxe (par taux), ou total avec la mention que la TPS/TVH est incluse et son taux · indication des articles taxables lorsque la facture mélange des articles taxables, exonérés ou détaxés |
| **500 $ ou plus** | Tout ce qui précède · **nom du client** (ou de son mandataire) · **modalités de paiement** · **description** suffisante de chaque fourniture |

Revenu Québec applique les mêmes seuils pour les RTI de la TVQ, avec le numéro de TVQ à partir de 100 $ ; son tableau semble exiger en plus, pour la TVQ seulement, une description et le montant de TVQ sur les petites factures (non confirmé : question 13). Selon Revenu Québec, ces régimes n'imposent pas de facture particulière, sauf pour la restauration et le transport par taxi.

**Langue (Québec)** : les factures sont rédigées en français (Charte de la langue française, art. 57, 1er alinéa). Le 2e alinéa ajouté en 2022 a vu son entrée en vigueur suspendue par la Cour supérieure ; il n'est pas repris sur le site.

**Bonnes pratiques**, non exigées par la loi fédérale mais attendues des clients : numéro de facture unique, adresse des deux parties, conditions de retard (voir section 7). Pour un client non résident, précisez que la fourniture est détaxée.

---

## 7. Intérêts de retard

- **Pas de pénalité légale automatique.** Ni le fédéral ni les provinces n'imposent un taux d'intérêt de retard ou une indemnité forfaitaire pour les factures de services entre entreprises. Il n'existe pas d'équivalent de l'indemnité française de 40 €. L'intérêt n'est dû que s'il a été **convenu** : il faut l'inscrire dans le devis ou le contrat et le rappeler sur la facture.
- **Taux exprimé en taux annuel** : *Interest Act*, L.R.C. 1985, ch. I-15, **art. 4** (confiance moyenne). Si un contrat écrit fixe un intérêt par jour, par semaine, par mois ou pour toute période de moins d'un an, on ne peut exiger plus de **5 % par an**, sauf si le contrat indique aussi le **taux annuel équivalent**. Écrire « 1,5 % par mois » seul limite donc la réclamation à 5 % par an. Il faut écrire « 1,5 % par mois (18 % par an) ».
- **Taux par défaut** : *Interest Act*, **art. 3**. Lorsqu'un intérêt est dû sans taux fixé, le taux est de 5 % par an. Devant les tribunaux s'appliquent aussi les lois provinciales sur les intérêts avant et après jugement, par exemple la *Courts of Justice Act* en Ontario. Au Québec, ce sont les art. 1617 et 1619 du *Code civil du Québec* (intérêt légal plus indemnité additionnelle).
- **Plafond pénal** : *Criminal Code*, art. 347. Le taux criminel est de **35 % par an (TAP) depuis le 2025-01-01** (60 % auparavant). Les pratiques courantes restent bien en dessous.
- **Pratique courante** : conditions « *Net 30* » et 1 % à 2 % par mois sur les soldes en retard, soit 12 % à 24 % par an en intérêt simple, ou 12,68 % à 26,82 % avec capitalisation mensuelle.
- **Lois sur le paiement rapide** (*prompt payment*) : elles visent **uniquement la construction**, par exemple la *Construction Act* de l'Ontario, la *Prompt Payment and Construction Lien Act* de l'Alberta, la *Federal Prompt Payment for Construction Work Act* et des régimes analogues dans d'autres provinces. Elles ne protègent pas le pigiste en général, sauf s'il intervient sur un chantier (architecte, ingénieur, designer sous contrat de construction).

---

## 8. Véhicule et taux par kilomètre

- **Taux raisonnables de l'ARC** (*reasonable kilometre allowance*) : le chiffre 2026 n'a pas été confirmé (confiance faible). Dernière valeur connue (2025) : **0,72 $/km pour les 5 000 premiers km, 0,66 $/km ensuite**, plus 0,04 $/km dans les territoires. Ces taux plafonnent l'allocation non imposable versée à un **employé**.
- **Pour le travailleur autonome lui-même**, il n'y a pas de forfait par kilomètre. On déduit les **frais réels** du véhicule (essence, assurance, entretien, immatriculation, intérêts, location, déduction pour amortissement) multipliés par la part professionnelle (km d'affaires ÷ km totaux), justifiée par un **registre de déplacements**. Les plafonds annuels (catégorie 10.1, véhicules zéro émission, location, intérêts) sont à revérifier pour 2026.

---

## 9. Points à revérifier chaque année

| Élément | Qui publie | Mois de publication habituel |
|---|---|---|
| Taux de TPS/TVH/TVQ/TVP | Budgets fédéral et provinciaux | Budgets provinciaux de février à avril ; budget fédéral variable (automne en 2025) |
| Seuil du petit fournisseur, seuils de facturation CTI | ARC / Finances Canada | Rarement modifiés (dernière modification des seuils CTI : 2021-01-01) |
| MGAP/MSGAP (*YMPE/YAMPE*), cotisations maximales RPC | ARC | Début novembre de l'année précédente |
| MGA, taux RRQ | Retraite Québec / Revenu Québec | Octobre à décembre |
| Taux et maximum de l'AE | Commission de l'assurance-emploi / EDSC | Septembre |
| Taux et maximum du RQAP | Gouvernement du Québec (CGAP) | Automne (octobre à décembre) |
| Tranches fédérales, MPB, facteur d'indexation | ARC | Novembre |
| Tranches et MPB provinciaux | ARC (T4127 de janvier), provinces | Novembre-décembre pour l'indexation ; budgets de février à avril ; T4127 de juillet en mai-juin pour les changements en cours d'année |
| Paramètres du régime d'imposition du Québec | Ministère des Finances du Québec | Novembre-décembre |
| Seuils de la surtaxe de l'Ontario | ARC (T4032-ON) | Novembre-décembre |
| Taux par kilomètre et plafonds automobiles | Finances Canada | Fin décembre ou janvier |
| Dates d'acomptes et d'échéances | Loi (stables) | Chaque année : vérifier les week-ends et jours fériés |
| Taux d'intérêt criminel | Parlement (*Criminal Code*) | Rare (dernière modification : 2025-01-01) |

---

## 10. Questions ouvertes

1. Revérifier en ligne les taux de taxes de vente (TPS, TVH, TVQ, TVP/TVD) : ils n'ont pas pu être rouverts le 2026-10-20.
2. Vérifier les listes de services taxables à la TVP/TVD en C.-B., en Saskatchewan et au Manitoba pour les métiers visés par le site (développement, design, conseil, rédaction).
3. ~~Confirmer les seuils de facturation pour les CTI~~ : confirmés le 21/10/2026 (tableau du mémorandum 8.4 de l'ARC, *Excise and GST/HST News* n° 118).
4. Île-du-Prince-Édouard : le taux de 20 % au-delà de 200 000 $ s'applique-t-il en 2026 ou en 2027 ? Le quatrième seuil est-il de 142 250 $ ou de 142 520 $ ?
5. Terre-Neuve-et-Labrador : confirmer les seuils intermédiaires calculés et le MPB 2026 de 13 094 $.
6. Colombie-Britannique : confirmer l'adoption du taux de 5,60 % et le MPB de 13 216 $.
7. Alberta : lire les seuils intermédiaires sur une table officielle et confirmer le taux du crédit non remboursable (8 % ou 10 %).
8. Confirmer sur la page de la ligne 30000 de l'ARC le MPB fédéral minimal de 14 829 $.
9. Trouver les taux par kilomètre et les plafonds automobiles 2026.
10. Québec : cotisation au Fonds des services de santé (FSS) et prime au régime public d'assurance médicaments pour 2026.
11. AE au Québec pour les autonomes : confirmer le taux de 1,30 % et le revenu minimal requis pour toucher des prestations.
12. RQAP : confirmer le seuil minimal de revenu de travail autonome. Répartition entre déduction et crédit : fédéral
    confirmé le 22/10/2026 (ligne 22300 : part au-delà du taux « salarié ») ; annexe R du Québec à lire.
13. Revenu Québec, « Préparation des factures » : pour la TVQ seulement, une description et le montant de TVQ sont-ils exigés sous 500 $ (et sous 100 $) ? Extraits de recherche illisibles ; les pages de la liste des mentions renvoient à cette page pour les factures de moins de 500 $ au Québec.
14. Comparateur de statuts : taux du crédit pour dividendes non déterminés de 2026 en Saskatchewan et au Nunavut
    (non trouvés sur une source officielle ; ces deux provinces ne sont pas calculées) ; à confirmer sur les
    formulaires 2026 : Nouvelle-Écosse 1,5 %, T.N.-O. 6 %, Alberta 2,18 %, ordre surtaxe / crédit pour dividendes de
    l'ON428, prorata du taux de l'Ontario au 1er juillet 2026.
15. Québec : lire l'annexe R (déduction du RQAP du travailleur autonome) ; impôt sur le salaire des T.N.-O. :
    déductible ou non de l'impôt sur le revenu (traité comme non déductible).

---

## 11. Sources

**ARC / gouvernement du Canada**

- Current year tax rates and income brackets (2026) : https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html
- Payroll Deductions Formulas, T4127, 122e édition (1er janvier 2026) : https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html
- Payroll Deductions Formulas, T4127, 123e édition (1er juillet 2026) : https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html
- Income tax rates and income thresholds (paie) : https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/income-tax/reducing-remuneration-subject-income-tax.html
- T4032-ON, informations générales (surtaxe de l'Ontario) : https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032on-jan/t4032on-january-general-information.html
- T4032-NU, informations générales : https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032nu-jan/t4032nu-january-general-information.html
- Line 30000, Basic personal amount : https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-30000-basic-personal-amount.html
- Report on the Impact of Reducing the Lowest Marginal Personal Income Tax Rate (Finances Canada) : https://www.canada.ca/en/department-finance/services/publications/report-impact-reducing-lowest-marginal-personal-income-tax-rate-non-refundable-tax-credits.html
- CPP contribution rates, maximums and exemptions : https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html
- Second additional CPP (CPP2) contribution rates and maximums : https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/calculating-deductions/making-deductions/second-additional-cpp-contribution-rates-maximums.html
- The Canada Pension Plan enhancement (déductibilité) : https://www.canada.ca/en/revenue-agency/news/2023/05/the-canada-pension-plan-enhancement--businesses-individuals-and-self-employed-what-it-means-for-you.html
- EI premium rates and maximums : https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html
- EI for self-employed, premiums : https://www.canada.ca/en/services/benefits/ei/ei-self-employed-workers/premiums.html
- Taux de l'AE 2026 (communiqué de la CAE, septembre 2025) : https://www.canada.ca/en/employment-social-development/news/2025/09/canada-employment-insurance-commission-sets-the-2026-employment-insurance-premium-rate.html
- GST/HST calculator (and rates) : https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html
- RC4022, General Information for GST/HST Registrants : https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4022.html
- T4002, Self-employed Business, Professional… Income : https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4002.html
- Automobile allowance rates : https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/benefits-allowances/automobile/automobile-motor-vehicle-allowances/automobile-allowance-rates.html
- Corporation tax rates : https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/corporations/corporation-tax-rates.html

**Lois fédérales (laws-lois.justice.gc.ca)**

- *Interest Act*, L.R.C. 1985, ch. I-15 : https://laws-lois.justice.gc.ca/eng/acts/I-15/page-1.html
- *Income Tax Act*, art. 150 et 156.1 : https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-150.html et https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-156.1.html
- *Criminal Code*, art. 347 : https://laws-lois.justice.gc.ca/eng/acts/C-46/section-347.html
- *Input Tax Credit Information (GST/HST) Regulations*, DORS/91-45 : https://laws-lois.justice.gc.ca/eng/regulations/SOR-91-45/

**Québec**

- Revenu Québec, taux d'imposition : https://www.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/income-tax-rates/
- Finances Québec, Paramètres du régime d'imposition des particuliers 2026 : https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/parametres/AUTEN_IncomeTax2026.pdf
- Revenu Québec, MGA et taux du RRQ : https://www.revenuquebec.ca/fr/entreprises/retenues-a-la-source-et-cotisations-de-lemployeur/calcul-des-retenues-et-des-cotisations/cotisations-au-rrq/maximum-des-gains-admissibles-et-taux-de-cotisation/
- Revenu Québec, cotisation du travailleur autonome au RRQ : https://www.revenuquebec.ca/fr/citoyens/declaration-de-revenus/payer-ou-etre-rembourse/paiement-des-cotisations/cotisations-du-travailleur-autonome-ou-du-membre-dune-societe-de-personnes/cotisation-du-travailleur-autonome-ou-du-membre-dune-societe-de-personnes-au-regime-de-rentes-du-quebec/
- Retraite Québec, Contributions to the QPP : https://www.retraitequebec.gouv.qc.ca/en/professionals-employers/your-role-quebec-pension-plan/contributions-quebec-pension-plan-qpp
- Revenu Québec, maximum de revenus assurables et taux du RQAP : https://www.revenuquebec.ca/fr/entreprises/retenues-a-la-source-et-cotisations-de-lemployeur/calcul-des-retenues-et-des-cotisations/cotisations-au-rqap/maximum-de-revenus-assurables-et-taux-de-cotisation/
- Québec.ca, taux de cotisation au RQAP : https://www.quebec.ca/entreprises-et-travailleurs-autonomes/administrer-gerer/embauche-gestion-personnel/assurance-parentale/taux-cotisations
- Québec.ca, baisse des taux du RQAP en 2026 : https://www.quebec.ca/nouvelles/actualites/details/baisse-des-taux-de-cotisation-au-regime-quebecois-dassurance-parentale-en-2026
- Finances Québec, Bulletin d'information 2025-8 : https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/Bulletins/FR/BULFR_2025-8.pdf
- Revenu Québec, TPS/TVH et TVQ : https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/
- *Loi sur les impôts* (RLRQ, c. I-3) : https://www.legisquebec.gouv.qc.ca/en/document/cs/I-3
- *Code civil du Québec* : https://www.legisquebec.gouv.qc.ca/en/document/cs/CCQ-1991

**Provinces et territoires**

- Ontario, Health premium : https://www.ontario.ca/page/health-premium
- Ontario, *Construction Act* : https://www.ontario.ca/laws/statute/90c30
- Colombie-Britannique, PST : https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst
- Saskatchewan, PST : https://www.saskatchewan.ca/business/taxes-licensing-and-reporting/provincial-taxes-policies-and-bulletins/provincial-sales-tax
- Manitoba, crédits personnels : https://www.gov.mb.ca/finance/personal/pcredits.html
- Manitoba, Retail Sales Tax : https://www.gov.mb.ca/finance/taxation/taxes/retail.html
- Nouvelle-Écosse, taux et indexation : https://www.novascotia.ca/personal-income-tax-rates-and-indexation
- Terre-Neuve-et-Labrador, impôt des particuliers : https://www.gov.nl.ca/fin/tax-programs-incentives/personal/personalincometax/
- Île-du-Prince-Édouard, impôt provincial des particuliers : https://www.princeedwardisland.ca/en/information/finance-and-affordability/provincial-personal-income-tax

**Sources secondaires utilisées pour recouper** (non officielles) : EY Tax News (budgets 2026 de l'Alberta, de la C.-B., du Manitoba, du N.-B., de T.-N.-L., de l'Î.-P.-É. et de la N.-É.), Andersen Canada, CI Financial, ATB, Baker Tilly, KPMG.

## Calendrier fiscal (`data/calendars/ca.json`)

- Dates nominales ; l'ARC considère comme fait à temps un paiement reçu le jour ouvrable suivant (indiqué sur les pages).
- TPS/TVH : déclarants mensuels et trimestriels un mois après la période ; annuels (particuliers avec exercice au 31 décembre) déclaration au 15 juin, paiement au 30 avril ; acomptes trimestriels des déclarants annuels si la taxe nette atteint 3 000 $.
- REER 2026 : 1er mars 2027 (60e jour de l'année).

## Spécification : calculateur *How much to set aside for taxes* / « Combien mettre de côté pour l'impôt » (21/10/2026)

Pages `/ca/how-much-to-set-aside-for-taxes/` et `/ca/fr/combien-mettre-de-cote-impot/` (identifiant `set-aside`,
reliées aux pages américaine, britannique et française). Besoin P1 de [02](../02-besoins-clients.md) (§ 7).

- **Règles** (déjà dans `data/rules/ca.json`) : barèmes fédéral et provinciaux, montants personnels, RPC/RPC2,
  RRQ/RRQ2 et RQAP, abattement du Québec, surtaxe et contribution santé de l'Ontario (moteur `tax-ca.js`, déjà
  testé) ; acomptes provisionnels (seuils de 3 000 $ et de 1 800 $ au Québec, dates) ; taxes de vente par province
  (`provinces.*.sales_tax`), TVP généralement non perçue sur les services professionnels
  (`pst_on_professional_services`), seuil du petit fournisseur de 30 000 $ (`small_supplier_threshold`, et
  `qst_small_supplier_threshold` au Québec).
- **Calcul** : bénéfice = (facturé − dépenses) × 12 ; impôt et cotisations de l'année par `taxCA.estimate` (sans
  revenu d'emploi, comme le calculateur d'impôt existant, et dit) ; part = total ÷ chiffre d'affaires, arrondie au
  point supérieur (`OF.ceilShare`). Taxe de vente d'un paiement, si l'utilisateur est inscrit : TVH, ou TPS + TVQ au
  Québec, ou TPS seule (la TVP n'est pas comptée : elle vise des services énumérés, à vérifier) ; retirée d'abord,
  **au taux de la province du client** (lieu de la fourniture pour la plupart des services ; par défaut, celle de
  l'utilisateur). La TVP n'est mentionnée que si le client est dans une province qui la perçoit (C.-B., Sask., Man.) ;
  son extension en C.-B. à certains services professionnels, prévue le 1er octobre 2026, a été suspendue le
  18 septembre 2026 (règle mise à jour). Une case permet d'ajouter la TVP (TVD au Manitoba) quand le service y est
  soumis ; la FAQ donne des exemples relevés dans les bulletins officiels (logiciel en Saskatchewan, au Manitoba et en
  C.-B.).
- **Acomptes** : le moteur distingue au Québec le test de l'ARC (impôt fédéral, 1 800 $) et celui de Revenu Québec
  (impôt du Québec seul, 1 800 $ : les cotisations n'entrent pas dans l'« impôt net à payer », mais sont versées avec
  les acomptes ; relevé sur revenuquebec.ca le 21/10/2026) ; la page présente
  les acomptes sous la condition des deux années précédentes (la loi l'exige ; la première année, ils ne sont souvent
  pas exigés). Le calculateur d'impôt existant utilise la même présentation.
- **Page** bilingue par un même script (`tools/ca-setaside.js`), libellés dans la page (comme `ca-tax.js`) : part à
  mettre de côté, impôt fédéral et provincial, RPC ou RRQ + RQAP, acomptes (montant trimestriel et dates, ou non
  exigés), ce qui reste, répartition d'un paiement, tableau selon le bénéfice ; seuil du petit fournisseur signalé
  sous condition (« si tout est fourniture taxable »).
- **Textes** : aucune fourchette « pour la plupart » : exemples recalculés par le moteur et vérifiés par un test ;
  exclusions dites (revenu d'emploi, REER, crédits, déductions autres que le RPC/RRQ).
- **Critères** : tests unitaires (textes et exemples recalculés, taux de taxe de vente des pages = règles) ; parcours
  navigateur des deux pages (Ontario, Québec, inscription aux taxes, seuil, acomptes, saisie invalide, rechargement) ;
  accessibilité ; captures relues sur ordinateur, tablette et mobile ; revue critique.

## Spécification : liste *What to put on an invoice* / « Que mettre sur une facture » (`/ca/invoice-requirements/`, `/ca/fr/mentions-facture/`, 21/10/2026)

**Question** : « Ma facture contient-elle ce qu'il faut ? » Besoin P2 de [02](../02-besoins-clients.md) (§ 5), couvert en
France et au Royaume-Uni par la même liste (identifiant `invoice-rules`).

- **Ce que dit la règle** : au Canada, aucune loi ne fixe le contenu d'une facture en général ; les mentions exigées
  sont celles qui permettent au client inscrit de demander ses crédits de taxe sur les intrants (CTI, DORS/91-45) et,
  au Québec, ses remboursements de la taxe sur les intrants (RTI). Elles dépendent du total de la facture (moins de
  100 $, 100 $ à 499,99 $, 500 $ ou plus). La page le dit, sans présenter les mentions comme obligatoires en général.
- **Règles** (`data/rules/ca.json`) : `itc_invoice_requirements` (revérifiée : tableau de l'ARC, mémorandum 8.4 et
  *Excise and GST/HST News* n° 118) ; nouvelles : `qst_registration_number_on_invoices` (numéro de TVQ à partir de
  100 $, Revenu Québec), `quebec_invoices_in_french` (Charte de la langue française, art. 57, 1er alinéa ; le 2e
  alinéa, dont l'entrée en vigueur a été suspendue, n'est pas repris), `small_supplier_not_required_to_collect`
  (ARC, mémorandum 2.2).
- **Situation** : total de la facture, taxes comprises (trois paliers, 500 $ ou plus par défaut) ; inscrit à la
  TPS/TVH (coché par défaut) ; entreprise au Québec. Conditions combinées (`data-when="gst !amount=under100"`) :
  la grammaire de `tools/checklist.js` accepte plusieurs conditions séparées par des espaces, toutes requises.
- **Points** : nom ou raison sociale, date, total (toujours) ; numéro de TPS/TVH et taxe facturée (inscrit, 100 $ ou
  plus) ; numéro de TVQ (inscrit, Québec, 100 $ ou plus) ; nom du client, modalités de paiement, description de
  chaque fourniture (inscrit, 500 $ ou plus) ; facture rédigée en français (Québec). Inscrit : 3, 5 ou 8 points selon
  le palier (4, 7 ou 10 au Québec). Non inscrit : le client n'a pas de crédit de taxe à demander, seules les
  mentions de base restent (3, ou 4 au Québec) ; rappel que le petit fournisseur ne perçoit généralement pas la
  TPS/TVH et seuil d'inscription (règles `small_supplier_threshold`, `qst_small_supplier_threshold`).
- **Annonces** : le score et le message forment la zone annoncée (`role="status"`) ; les rappels sont dans une zone
  distincte (`aria-live="polite"`), annoncés quand ils apparaissent, pas à chaque case cochée (même structure sur la
  page britannique).
- **Incertitude signalée, non publiée** : le tableau de Revenu Québec semble exiger, pour la TVQ seulement, une
  description et le montant de TVQ dès moins de 500 $ (extraits de recherche illisibles). Au Québec sous 500 $, la
  page renvoie à la page « Préparation des factures » de Revenu Québec (pour un inscrit) ; question ouverte n° 13.
  Langue : facture bilingue (art. 89) et fournisseur hors Québec non traités (question ouverte dans `ca.json`).
- **Bonnes pratiques** (numéro de facture, échéance, moyen de paiement) : en texte, présentées comme utiles et non
  exigées. Les FAQ des générateurs de facture canadiens sont alignées (le numéro de facture n'y est plus dit exigé ;
  seuil du petit fournisseur exact).
- **Critères** : tests unitaires (chaque élément des règles repris une fois, conditions, nombre de points par
  situation, mêmes points en anglais et en français) ; parcours navigateur des deux pages (paliers, inscription,
  Québec, messages, mémorisation) ; accessibilité ; captures relues ; revue critique.

## Spécification : assistant *Invoicing clients outside Canada* / « Facturer un client étranger » (`/ca/invoicing-clients-outside-canada/`, `/ca/fr/facturer-client-etranger/`, 21/10/2026)

**Question** : « Dois-je facturer la TPS/TVH (et la TVQ) à mon client étranger ? » Besoin P2 de
[02](../02-besoins-clients.md) (§ 5), couvert en France et au Royaume-Uni (même identifiant `international`).

- **Règles** (nouvelles, `data/rules/ca.json`, lues le 21/10/2026 par recherche) : services exportés détaxés
  (`export_services_zero_rated` : un service fourni à un non-résident est en général détaxé, sauf s'il est rendu à
  un particulier présent au Canada, ou s'il porte sur un immeuble situé au Canada ou sur un bien qui s'y trouve,
  mémorandum 4.5.3) ; preuve de la non-résidence (`export_evidence_non_resident`, mémorandums 4.5.1 et 4.5.3) ;
  seuil du petit fournisseur calculé sur les fournitures taxables mondiales, détaxées comprises
  (`small_supplier_includes_zero_rated`, RC4022) ; ligne 101 de la déclaration (`gst_return_line_101`) ; TVQ :
  services fournis à des non-résidents en général détaxés (`qst_services_non_residents_zero_rated`, Revenu Québec).
- **Moteur** `engines/international-ca.js` (UMD, testé) : situation (inscrit ou non ; entreprise au Québec ; client
  résident ou non-résident ; service de conseil ou professionnel (art. 23), autre service (art. 7), vente ou licence
  de propriété intellectuelle (art. 10), service lié à un immeuble ou à un bien situé au Canada ; service rendu en
  personne au Canada ou particulier au Canada) → verdict, raisons, mentions, démarches (clés) ; textes dans chaque
  page, en anglais et en français.
- **Corrigé après revue** : les services de conseil et professionnels suivent l'art. 23 (exception du litige au
  Canada ; la présence du client au Canada n'y est pas une exception : « ça dépend ») ; la propriété intellectuelle
  n'est détaxée que si le non-résident n'est pas inscrit (« ça dépend ») ; la méthode rapide exclut les ventes
  détaxées de la ligne 101 ; la TVQ est rappelée quand une entreprise du Québec doit facturer la taxe ; la règle
  `place_of_supply_and_exports` ne lie plus la détaxation à la non-inscription du client en général ; le générateur
  de facture propose « Exportation détaxée » (TPS/TVH 0 %, ou TPS et TVQ 0 % au Québec).
- **Différence avec le Royaume-Uni** : une exportation détaxée reste une fourniture taxable ; elle compte dans le
  seuil de 30 000 $ et se déclare à la ligne 101. La page le dit pour un travailleur autonome non inscrit.
- **Client au Canada** : renvoi au calculateur de TPS/TVH (taux de la province du client), sans détail.
- **Signalé, non tranché** : certains services (la publicité, par exemple) ne sont détaxés que si le client
  non-résident n'est pas inscrit à la TPS/TVH ; la page renvoie au mémorandum 4.5.3.
- **Mention sur la facture** : aucune formulation officielle relevée ; suggestion présentée comme telle
  (« Fourniture détaxée : service fourni à un non-résident »).
- **Critères** : tests unitaires (toutes les situations, textes des deux pages) ; parcours navigateur des deux pages ;
  accessibilité ; captures relues ; revue critique.

## Correction : impôt d'un travailleur autonome au Québec (`engines/tax-ca.js`, 22/10/2026)

Relevé en préparant le comparateur de statuts : trois écarts dans le calcul québécois, qui alimente le calculateur
d'impôt, « Combien mettre de côté » et le calculateur REER (anglais et français).

- **Pas de crédit du Québec pour la part de base du RRQ** (`quebec_contributions_no_credit`) : le régime québécois
  n'accorde aucun crédit pour les cotisations de base au RRQ, au RQAP ni à l'AE (prises en compte dans le montant
  personnel de base). Le moteur appliquait au Québec, comme ailleurs, le crédit au taux le plus bas sur la part
  « salarié » de base : impôt du Québec sous-estimé d'au plus 14 % × 5,3 % × 71 100 $ = 527,58 $. Le crédit fédéral,
  lui, demeure.
- **Déduction pour travailleur** (`quebec_deduction_for_workers`) : 6 % du revenu de travail admissible (revenu
  d'entreprise net compris), au plus 1 450 $ en 2026, à la déclaration du Québec seulement. Absente du moteur : impôt
  du Québec surestimé d'au plus 1 450 $ × taux marginal.
- **RQAP du travailleur autonome** (`qpip_self_employed_tax_treatment`) : au fédéral, déduction de la part qui
  dépasse le taux « salarié » ((0,764 % − 0,430 %) ÷ 0,764 % de la cotisation, ligne 22300) et crédit à 14 % sur le
  reste (ligne 31215) ; au Québec, déduction de la même part (annexe R, confiance moyenne). Absents du moteur.
- **Critères** : cas recalculés à la main ; les valeurs attendues des tests québécois existants sont mises à jour avec
  le détail du calcul ; pages concernées relues (exemples chiffrés du texte calculés par le moteur).

## Spécification : comparateur *Sole proprietor vs corporation* / « Entreprise individuelle ou société par actions » (`/ca/sole-proprietor-vs-corporation/`, `/ca/fr/entreprise-individuelle-ou-societe/`, 22/10/2026)

**Question** : « Ai-je intérêt à me constituer en société par actions ? » Besoin P1 de
[02](../02-besoins-clients.md) (§ 1, « Quel statut choisir ? »), couvert en France, aux États-Unis et au Royaume-Uni
(même identifiant `structure`).

- **Principe** (intégration) : les bénéfices d'une société privée sous contrôle canadien (SPCC) sont imposés au taux
  des petites entreprises, puis de nouveau chez l'actionnaire quand ils lui sont versés en dividendes (dividendes
  non déterminés, majorés de 15 %, crédit d'impôt pour dividendes). Tout verser donne à peu près le même impôt
  qu'en entreprise individuelle ; l'avantage principal vient de l'**impôt reporté** sur les bénéfices laissés dans la
  société. L'outil montre les deux effets séparément.
- **Année** : année d'imposition 2026 de la société, du 1er janvier au 31 décembre 2026, et impôt personnel 2026
  (dividendes reçus en 2026). Ontario : taux réduit de 3,2 % jusqu'au 30 juin, puis 2,2 %, au prorata des jours
  (181 et 184 jours : 2,6959 %). Terre-Neuve-et-Labrador : 2,0 % (rétroactif au 1er janvier 2026). Québec : taux
  réduit de 3,2 % (l'année commence avant le 30 avril 2026) seulement avec 5 500 heures rémunérées, sinon taux
  général de 11,5 %. Changements de 2027 (Ontario 1,9863 % proposé, Québec 2,69 %, T.-N.-L. 1,5 %) : veille de
  décembre.
- **Saisie** : bénéfice de l'activité (avant la rémunération du dirigeant) ; province ; salaire versé par la société
  (facultatif, 0 = dividendes seulement) ; montant laissé dans la société après impôt (facultatif, 0 = tout est
  versé) ; frais propres à la société (facultatif : comptabilité, déclaration T2, registre) ; au Québec seulement,
  case « la société rémunère au moins 5 500 heures de travail par an ».
- **Société** : charges de l'employeur sur le salaire W (RPC ou RRQ, RPC2 ou RRQ2 de la part « employeur » ; au
  Québec RQAP employeur 0,602 % et FSS 1,65 %) ; pas d'AE (actionnaire qui contrôle plus de 40 % des actions,
  `ei_controlling_shareholder`) ; revenu imposable B = bénéfice − frais − W − charges de l'employeur ; impôt
  B × (9 % + taux provincial réduit) ; après impôt A = B − impôt ; dividendes D = A − montant laissé.
  Refus : B < 0 (« salaire trop élevé »), B > 500 000 $ (plafond des affaires : hors du champ de l'outil), montant
  laissé > A.
- **Actionnaire** : salaire W (RPC ou RRQ « salarié », RQAP salarié au Québec, impôt sur le salaire de 2 % aux
  T.N.-O.) et dividendes D. Revenu net = W + 1,15 × D − part bonifiée des cotisations. Fédéral : barème − 14 % ×
  (montant personnel de base selon le revenu net + part de base des cotisations + montant canadien pour emploi
  (1 501 $ au plus) + RQAP salarié) − crédit pour dividendes (9/13 de la majoration), au moins 0 ; abattement du
  Québec. Province : barème (au Québec, après la déduction pour travailleur) − taux le plus bas × (montant personnel
  de base + part de base des cotisations, sauf au Québec) − crédit provincial pour dividendes (taux de
  `provincial_dtc_non_eligible_2026` × montant majoré), au moins 0 ; Ontario : surtaxe calculée avant le crédit pour
  dividendes, puis contribution-santé.
- **Entreprise individuelle** : moteur existant (`taxCA.estimate`, corrigé pour le Québec, voir ci-dessus).
- **Résultat** : ce que vous recevez (après impôt personnel) et ce qui reste dans la société, comparés au revenu
  disponible de l'entreprise individuelle. Écart affiché = (reçu + laissé dans la société) − revenu disponible en
  entreprise individuelle ; dont impôt reporté = impôt personnel qu'aurait coûté le versement immédiat du montant
  laissé (calcul refait avec tout versé) ; et écart « tout versé ». Tableau : salaire, dividendes, cotisations, impôt
  de la société, impôt personnel, frais, reçu, laissé dans la société.
- **Provinces non calculées** : Saskatchewan et Nunavut (taux du crédit pour dividendes 2026 non trouvé sur une
  source officielle) : message, renvoi au calculateur d'impôt.
- **Dit sur la page, non chiffré** : entreprise de services personnels (`personal_services_business` : pas de taux
  réduit pour un « employé incorporé ») ; aucun droit au RPC/RRQ ni droits REER sur les dividendes
  (`cpp_on_dividends`, `rrsp_earned_income_types`) ; dividendes versés à la famille (`tosi_family_dividends`) ;
  revenus de placement dans la société (`passive_income_business_limit`) ; frais de constitution ; au Québec,
  cotisation des particuliers au FSS sur les revenus autres que d'emploi, normes du travail et CNESST ; impôt minimum
  de remplacement ; réductions d'impôt pour faible revenu de l'Ontario et de la C.-B. (absentes aussi du calculateur
  d'impôt).
- **Critères** : tests unitaires (cas calculés à la main hors Québec, au Québec avec et sans 5 500 heures, en
  Ontario avec surtaxe et dividendes, salaire au-delà du MGAP, montant laissé, refus) ; invariants (tout verser ≈
  entreprise individuelle à quelques pour cent près ; impôt reporté ≥ 0) ; textes des deux pages repris des règles ;
  parcours navigateur et accessibilité ; captures relues ; revue critique.
