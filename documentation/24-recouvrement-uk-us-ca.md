# 24. Recouvrement en justice : Royaume-Uni, Canada, États-Unis

Besoin P2 de [02](02-besoins-clients.md) : « Recouvrement en justice » (*small claims*, *money claim online*), colonnes
Royaume-Uni, États-Unis et Canada (la France attend les textes de 2026 : [14](14-etude-recouvrement.md)).
Spécification du 22/10/2026 ; **§ 1, § 2 et § 3 réalisés le 23/10/2026**. Les règles ont été recherchées le 22/10/2026 sur les sites officiels (GOV.UK,
justice.gov.uk, legislation.gov.uk, tribunaux et lois des provinces), lues par extraits de recherche : aucun de ces
sites ne s'ouvre directement depuis l'environnement de travail. Confiance « medium » quand seul un extrait a été lu,
« high » quand plusieurs pages officielles concordent.

**Question commune** : « Mon client ne paie pas malgré mes relances : où le poursuivre, combien cela coûte, en combien
de temps, et jusqu'à quand puis-je agir ? » Même identifiant `court` dans chaque pays (liens de langue et de pays),
rangé dans le menu « Être payé » après les relances et les intérêts de retard. Pas de conseil personnalisé (D8) :
chaque page renvoie vers un avocat (*solicitor*, *lawyer*) pour un cas particulier ou un montant élevé.

## 1. Royaume-Uni : *Small claims for unpaid invoices* (`/uk/small-claims-court/`)

Outil de calcul pour l'Angleterre et le pays de Galles (le cas de la plupart des clients), avec un renvoi pour
l'Écosse et l'Irlande du Nord, dont les procédures diffèrent.

**Situation** : montant de la facture impayée (TVA comprise), date d'échéance, type de client (société ou LLP,
*sole trader*, particulier), lieu du client (Angleterre et pays de Galles, Écosse, Irlande du Nord, hors du
Royaume-Uni), intérêts ajoutés ou non.

| Sujet | Réponse | Règle (uk.json) |
|---|---|---|
| Ce que l'on réclame | Facture + intérêts jusqu'à aujourd'hui. Client professionnel (société ou *sole trader*) : intérêts légaux du *Late Payment Act* (8 % + taux de référence du semestre) et indemnité fixe de 40, 70 ou 100 £, calculés par le moteur existant (`taxUK.latePayment`). Particulier : 8 % par an, le taux « habituel » indiqué par GOV.UK pour les autres dettes. Un taux prévu au contrat s'applique à la place. | `late_payment_*` (existantes), `uk_court_interest_other_debts` |
| Frais de dépôt (*issue fee*) | Barème selon le montant réclamé **intérêts compris** : 35 £ jusqu'à 300 £, 50, 70, 80, 115, 205, 455 £ jusqu'à 10 000 £, puis 5 % arrondis au penny inférieur jusqu'à 200 000 £, 10 000 £ au-delà. Même barème en ligne et sur papier depuis 2021 ; inchangé au 13/07/2026. | `uk_money_claim_issue_fee` |
| Frais d'audience | Seulement si le client conteste et que l'affaire relevant des *small claims* va à l'audience : 27 £ à 346 £ selon le montant réclamé. | `uk_small_claims_hearing_fee` |
| Circuit (*track*) | Selon le montant en litige **sans les intérêts ni les frais** (CPR 26.13) : *small claims* jusqu'à 10 000 £, *fast track* jusqu'à 25 000 £, *intermediate track* jusqu'à 100 000 £, *multi-track* au-delà. Au-delà des *small claims* : frais d'audience plus élevés et frais d'avocat en jeu, conseil recommandé. | `uk_civil_tracks` |
| Avant le dépôt | Particulier ou *sole trader* : protocole des créances (*Pre-Action Protocol for Debt Claims*) : lettre de réclamation avec fiche d'information, formulaire de réponse et état financier, 30 jours pour répondre. Société : *Practice Direction – Pre-Action Conduct* : lettre détaillée, réponse dans un délai raisonnable, 14 jours dans un cas simple. Le générateur de relances existant fournit la *letter before action*. | `uk_debt_pre_action_protocol`, `uk_pre_action_conduct` |
| Où déposer | Client en Angleterre ou au pays de Galles : en ligne (*Money Claim Online* : montant fixe de moins de 100 000 £, un demandeur, deux défendeurs au plus, adresse en Angleterre ou au pays de Galles), sinon formulaire papier N1. Écosse : *simple procedure* jusqu'à 5 000 £ (tribunal du shérif). Irlande du Nord : *small claims* jusqu'à 5 000 £. Hors du Royaume-Uni : conseil juridique. | `uk_mcol_conditions`, `uk_scotland_simple_procedure`, `uk_ni_small_claims` |
| Après le dépôt | Le client a 14 jours après la signification pour répondre, 28 s'il accuse réception ; sans réponse, demander un jugement ; sans paiement, mesures d'exécution (*warrant of control*, saisie sur salaire, *charging order*, saisie entre les mains d'un tiers), avec des frais en plus. | `uk_claim_response_deadlines`, `uk_enforcement_options` |
| Jusqu'à quand | 6 ans à compter de la naissance du droit d'agir (*Limitation Act 1980*, art. 5) : pour une facture, en général la date d'échéance ; l'outil affiche le mois et l'année limites (pas de date au jour près). | `uk_limitation_simple_contract` |

**Non publiés** (sources contradictoires ou non lues) : les frais des mesures d'exécution (chiffres différents selon les
sources après la hausse du 13/07/2026) ; les frais d'audience au-delà des *small claims* ; les frais en Écosse et en
Irlande du Nord ; le champ exact de la nouvelle procédure en ligne de HMCTS (*Online Civil Money Claims*, jusqu'à
25 000 £ selon une source secondaire) : la page renvoie vers le service de GOV.UK, qui oriente lui-même.

### Réalisation (23/10/2026)

- Page `/uk/small-claims-court/` (menu « *Getting paid* ») : montant, échéance, type de client, lieu du client,
  intérêts ou non. Résultat : frais de dépôt (en titre), montant réclamé (facture, intérêts au jour du calcul,
  indemnité), frais d'audience si le client conteste, circuit, démarche avant le dépôt, voie de dépôt, délai de
  prescription au mois près ; Écosse, Irlande du Nord et étranger : renvoi, sans chiffres anglais.
- Moteur `engines/court-uk.js` (s'appuie sur `taxUK.latePayment`) ; douze règles nouvelles dans uk.json (dont la
  médiation obligatoire des *small claims*, `uk_small_claims_mediation`) et trois questions ouvertes (limite de *Money
  Claim Online* et intérêts, base des frais d'audience, frais d'exécution).
- Tests : `court-uk.test.mjs` (bornes de chaque tranche, arrondi au penny inférieur, circuits, intérêts, plans, textes,
  tableaux et chiffres de la page repris des règles) ; parcours navigateur ; erreurs réintroduites, toutes détectées.
- Revue : la limite de *Money Claim Online* est comparée au total réclamé, intérêts compris (lecture prudente) ;
  phrases retirées faute de source officielle lue (inscription au registre des jugements, frais d'exécution
  « ajoutés à la dette », réponse du client « jusqu'à réception de la demande de jugement »).
- La page des relances (« *From reminder to small claim* ») renvoie vers l'outil.

## 2. Canada : *Small claims court* (`/ca/small-claims-court/`) et *Petites créances* (`/ca/fr/petites-creances/`)

Un outil, en anglais et en français : la province ou le territoire où l'on dépose (en général celui où le client vit
ou exerce, ou celui où le contrat a été conclu : à vérifier auprès du tribunal), et le montant réclamé sans les
intérêts ni les frais. Réponse : le tribunal, le plafond, si la créance tient dans les petites créances, le délai de
prescription, les particularités, le lien officiel.

| Province ou territoire | Tribunal | Plafond | Prescription (règle générale) |
|---|---|---|---|
| Ontario | *Small Claims Court* (Cour supérieure de justice) | 50 000 $ sans intérêts ni frais (depuis le 01/10/2025) | 2 ans depuis la découverte (*Limitations Act, 2002*) |
| Québec | Cour du Québec, Division des petites créances | 15 000 $ sans intérêts ; personne morale : 10 salariés au plus dans les 12 mois ; sans avocat ; créance non fractionnable | 3 ans (C.c.Q., art. 2925) |
| Colombie-Britannique | *Civil Resolution Tribunal* jusqu'à 5 000 $, puis Cour provinciale jusqu'à 35 000 $ (sans intérêts ni frais) | 35 000 $ | 2 ans depuis la découverte (*Limitation Act*, art. 6) |
| Alberta | Cour de justice, division civile | 100 000 $ plus intérêts et frais | 2 ans depuis la découverte (*Limitations Act*, art. 3) |
| Saskatchewan | Cour provinciale (petites créances) | 50 000 $ (depuis le 01/04/2024) | 2 ans depuis la découverte (*Limitations Act*, art. 5) |
| Manitoba | Cour du Banc du Roi (petites créances) | 20 000 $ sans intérêts ni frais (depuis le 01/01/2025) | 2 ans depuis la découverte (*Limitations Act*, en vigueur le 30/09/2022) |
| Nouvelle-Écosse | *Small Claims Court* | 25 000 $ sans intérêts ni frais | 2 ans depuis la découverte (*Limitation of Actions Act*) |
| Nouveau-Brunswick | Cour des petites créances | 20 000 $ | 2 ans depuis la découverte (*Loi sur la prescription*, art. 5) |
| Île-du-Prince-Édouard | Cour suprême, section des petites créances | 16 000 $ | 6 ans depuis la naissance du droit (*Statute of Limitations*, art. 2(1)g)) |
| Terre-Neuve-et-Labrador | Cour provinciale, petites créances | 25 000 $ sans intérêts ni frais | 6 ans (*Limitations Act*, art. 6 et 9) |
| Yukon | *Small Claims Court* (Cour territoriale) | 25 000 $ | 6 ans pour un contrat (*Limitation of Actions Act*) |
| Territoires du Nord-Ouest | Cour territoriale, réclamations civiles | 35 000 $ sans intérêts ni frais | 6 ans (*Limitation of Actions Act*, règle générale ; confiance « medium ») |
| Nunavut | Cour de justice du Nunavut | **non confirmé** (sources secondaires discordantes) : l'outil n'affiche pas de plafond | **non confirmé** |

Règles : `ca_small_claims_courts` et `ca_limitation_periods` (ca.json), une entrée par province, chacune avec sa source
officielle (`more_sources`). **Non publiés** : les frais de dépôt (différents selon la province, le montant et parfois le
nombre de demandes ; plusieurs changés en 2026), les délais de procédure propres à chaque province (signification,
défense), les intérêts judiciaires de chaque province.

### Réalisation (23/10/2026)

- Pages `/ca/small-claims-court/` et `/ca/fr/petites-creances/` (menu « *Getting paid* » / « Se faire payer ») :
  province ou territoire et montant ; verdict (petites créances, Tribunal de résolution civile, au-delà du plafond, à
  vérifier), tribunal, plafond, particularités de la province, lien officiel, délai de prescription.
- Moteur `engines/court-ca.js` ; règles `ca_small_claims_limits` (avec, pour le Québec, la limite des 10 employés
  d'une personne morale, la médiation obligatoire jusqu'à 5 000 $ et le délai de 10 jours de la mise en demeure) et
  `ca_limitation_periods`, une source officielle par province ; deux questions ouvertes (Nunavut, frais de dépôt).
- Tests : `court-ca.test.mjs` (plafonds des 13 juridictions aux bornes, Tribunal de résolution civile, prescription,
  textes anglais et français, chaque plafond et délai des deux pages repris des règles) ; parcours navigateur dans les
  deux langues ; erreurs réintroduites, toutes détectées.
- Revue des captures : sur mobile, les noms de tribunaux longs débordaient de la page ; ils passent désormais à la
  ligne. Au Québec, la limite des 10 employés vise une personne morale, une société ou une association (pas le
  travailleur autonome) : texte précisé.
- Les pages de relances (anglais et français) renvoient vers l'outil.

## 3. États-Unis : *Small claims court* (`/us/small-claims-court/`)

Même outil : l'État où l'on dépose, le montant réclamé et le statut du freelance (*sole proprietor*, ou société et
LLC : plusieurs États ont un plafond plus bas ou exigent un avocat pour une société) ; réponse : le tribunal, le
plafond, les particularités, le lien officiel. La prescription des contrats (différente selon les États et selon que
le contrat est écrit ou non) ne sera publiée que si elle est vérifiée de la même façon. Les frais de dépôt varient
souvent selon le comté : pas publiés.

### Recherches du 22 et du 23/10/2026

Plafonds lus par extraits de recherche sur les sites des tribunaux et des législatures de chaque État (« moyen » :
pages de comté ou guides seulement, texte de loi non lu). À reprendre une à une dans les règles, avec la source exacte.

| État | Plafond (tribunal) | Particularités | Confiance |
|---|---|---|---|
| AK | 10 000 $ hors intérêts, frais et honoraires (AS 22.15.040) | | élevée |
| AL | 6 000 $ (division des *small claims* de la *district court*, Ala. Code § 12-12-31, loi de 2015) | une page de comté indique encore 3 000 $ | moyenne |
| AR | 5 000 $ (division des *small claims* de la *district court*) | | élevée |
| AZ | 5 000 $ hors intérêts et frais (*justice court*, A.R.S. § 22-503, SB 1022, 2025) | règles de procédure modifiées en août 2025 | élevée |
| CA | 12 500 $ pour une personne physique, *sole proprietor* compris (CCP § 116.221) ; 6 250 $ pour une société ou une autre entité (CCP § 116.220) | deux demandes de plus de 2 500 $ par an au plus ; projet AB 1827 (15 000 $) bloqué en commission le 13/08/2026 | élevée |
| CO | 7 500 $ hors intérêts et frais | 2 demandes par mois et par comté, 18 par an | élevée |
| CT | 5 000 $ (honoraires compris, hors intérêts) | | élevée |
| DC | 10 000 $ hors intérêts, honoraires et frais (D.C. Code § 11-1321) | une entreprise demanderesse doit avoir un avocat | élevée |
| DE | 25 000 $ (*Justice of the Peace Court*) | | élevée |
| FL | 8 000 $ hors frais, intérêts et honoraires (*county court*) | | élevée |
| GA | 15 000 $ (*magistrate court*) ; **25 000 $ pour les demandes déposées à partir du 01/01/2027** (HB 999, loi n° 707 de 2026) | | élevée |
| HI | 5 000 $ hors intérêts et frais | | élevée |
| IA | 6 500 $ hors intérêts et frais (Iowa Code § 631.1) | | élevée |
| ID | 15 000 $ depuis le 01/07/2026 (S 1330, 2026) | | élevée |
| IL | 10 000 $ hors intérêts et frais | une société doit être représentée par un avocat | élevée |
| IN | 10 000 $ | une société sans avocat seulement jusqu'à 6 000 $ | élevée |
| KS | 10 000 $ (HB 2604, 2024) | | élevée |
| KY | 2 500 $ hors intérêts et frais (KRS 24A.230) | 25 demandes par an au plus | élevée |
| LA | 5 000 $ hors intérêts, frais, honoraires et pénalités (division des *small claims* d'une *city court*, La. R.S. 13:5202 ; *justice of the peace* : 5 000 $) | projet de 2026 (8 000 $ dans les petites paroisses) : sort inconnu | élevée (*city court*), moyenne (*justice of the peace*) |
| MA | 7 000 $ (G.L. c. 218, § 21) | | élevée |
| MD | 5 000 $ hors intérêts, frais et honoraires (*District Court*) | | élevée |
| ME | 10 000 $ depuis le 01/01/2026 (14 M.R.S. § 7482) | | élevée |
| MI | 7 000 $ depuis le 01/01/2024 (MCL 600.8401) | pas d'avocat (MCL 600.8408) ; une société est représentée par un dirigeant ou un employé qui connaît les faits | élevée |
| MN | 20 000 $ (*conciliation court*, depuis le 01/07/2024) ; 4 000 $ pour un crédit à la consommation | | élevée |
| MO | 5 000 $ hors intérêts et frais (RSMo 482.305) | 12 demandes par an au plus | élevée |
| MS | 3 500 $ (*justice court*) | | élevée |
| MT | 7 000 $ hors frais (MCA 25-35-502) | défendeur signifié dans le comté | élevée |
| NC | 5 000 à 10 000 $ selon le comté (*magistrate*) | | élevée (fourchette) |
| ND | 15 000 $ (N.D.C.C. 27-08.1-01) | ni jury ni appel | élevée |
| NE | 7 500 $ depuis le 01/07/2025, hors intérêts et frais | pas d'avocat ; 2 demandes par semaine, 10 par an | élevée |
| NH | 10 000 $ hors intérêts et frais (RSA 503:1) | médiation obligatoire au-delà de 5 000 $ ; dépôt en ligne obligatoire | élevée |
| NJ | 5 000 $ (*Small Claims Section*) ; 20 000 $ (*Special Civil Part*) | une société doit avoir un avocat au-delà de 5 000 $ | élevée |
| NM | 10 000 $ (*magistrate court* et *Metropolitan Court*) | | moyenne |
| NV | 10 000 $ (NRS 73.010) | | élevée |
| NY | 10 000 $ à New York ; 5 000 $ dans les *City Courts* ; 3 000 $ dans les *Town and Village Courts* | demandes d'une société : *commercial claims* (5 000 $, 10 000 $ à New York) | élevée |
| OH | 6 000 $ hors intérêts et frais (ORC 1925.02) | | élevée |
| OK | 10 000 $ hors honoraires et frais (12 O.S. § 1751) | | élevée |
| OR | 10 000 $ (ORS 46.405) ; projet SB 484 (20 000 $) resté en commission en 2025 | pas d'appel | élevée |
| PA | 12 000 $ hors intérêts et frais (*Magisterial District Judge*) ; 10 000 $ à Philadelphie | | élevée |
| RI | 5 000 $ hors intérêts et frais (*District Court*) | | élevée |
| SC | 7 500 $ (*magistrate court*, § 22-3-10) ; projets de hausse non adoptés à ce jour | | élevée (à revoir en décembre) |
| SD | 12 000 $ (*magistrate court*) | pas d'appel | élevée |
| TN | 25 000 $ (*General Sessions*, T.C.A. § 16-15-501(d)(1), d'après la note fiscale de 2025), autres plafonds dans quelques grands comtés | projet HB 982 / SB 572 (50 000 $) retiré du calendrier le 18/03/2026 | moyenne |
| TX | 20 000 $ hors intérêts légaux et frais, honoraires compris (*justice court*) | | élevée |
| UT | 20 000 $ honoraires compris, hors frais et intérêts (demandes de 2025 à 2029) | | élevée |
| VA | 5 000 $ hors intérêts (§ 16.1-122.2) | en général sans avocat | élevée |
| VT | 10 000 $ ; 5 000 $ pour un crédit à la consommation ou une dette médicale | | élevée |
| WA | 10 000 $ pour une personne physique ; 5 000 $ pour toute autre partie (RCW 12.40.010) | avocats seulement avec l'accord du juge | élevée |
| WI | 10 000 $ ; **15 000 $ à partir du 01/01/2027** (loi 105 de 2025) | | élevée |
| WV | 20 000 $ hors intérêts et frais depuis le 07/07/2025 (§ 50-2-1) | | élevée |
| WY | 6 000 $ (*circuit court*) | | élevée |

### Réalisation (23/10/2026)

- Page `/us/small-claims-court/` (menu « *Getting paid* ») : État, montant, statut (personne physique ou *sole
  proprietor*, ou LLC et société). Verdict : *small claims*, « *depends on the court* » (New York, Caroline du Nord,
  Pennsylvanie : plafond selon le tribunal ou le comté) ou au-delà du plafond ; plafond applicable, changement à venir
  (Géorgie et Wisconsin au 01/01/2027, appliqué automatiquement à partir de la date), particularités de l'État, lien
  vers les informations de l'État.
- Moteur `engines/court-us.js` ; règle `us_small_claims_limits` (us.json) : plafond, plafond d'une entité
  (Californie, Washington, New York), fourchette, date d'effet, et chaque chiffre cité par les notes de la page
  (anciens plafonds, nombre de demandes par an, seuils de médiation ou d'avocat), une source par État.
- Tennessee : le projet de hausse à 50 000 $ a été retiré en mars 2026, plafond de 25 000 $ (note fiscale de 2025).
- Tests : `court-us.test.mjs` (plafond de chaque juridiction aux bornes, fourchettes, entités, dates d'effet, chaque
  montant d'une note pris dans l'entrée de son État, FAQ) ; parcours navigateur ; 12 erreurs réintroduites, toutes
  détectées. Revue des captures : un trait de séparation restait sous la dernière ligne visible d'une liste de
  résultats quand la ligne suivante était masquée (corrigé dans la feuille de style commune).
- La prescription des contrats n'est pas chiffrée (différente selon l'État et selon que le contrat est écrit) ; les
  frais de dépôt non plus (selon le comté).

## 4. Pages existantes reliées

- Royaume-Uni : la section « *From reminder to small claim* » de la page des relances renvoie vers l'outil.
- Canada (anglais et français) : la question de la FAQ « *Where do I sue* » / « Où réclamer » renvoie vers l'outil.
- États-Unis : après la publication de la page américaine.

## 5. Critères de « terminé »

- Règles ajoutées avec source officielle, niveau de confiance et date de lecture ; ce qui n'est pas confirmé n'est pas
  affiché (Nunavut) ou est signalé.
- Moteurs purs testés : barèmes aux bornes (300 £ et 300,01 £, 10 000 £ et 10 000,01 £, 200 000 £), arrondi des 5 %,
  circuits, plafonds de chaque province aux bornes, verdicts ; textes de la page (une clé = un texte, aucun texte
  inutilisé), chiffres de la page repris des règles.
- Parcours navigateur, accessibilité (axe-core) et captures relues sur ordinateur, tablette et mobile.
