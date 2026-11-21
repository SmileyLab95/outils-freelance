# 62. Espace entrepreneur pour le Canada (« My workspace » / « Mon espace »)

Spécification rédigée le 21/11/2026 avant le développement (parité des pays, D85, [59](59-parite-des-pays.md) § 2 ;
décision D101). Public : **travailleurs autonomes** (entreprises individuelles, *sole proprietors*) qui déclarent leurs
revenus d'entreprise ou de profession sur le formulaire fédéral **T2125** et, au Québec, aussi sur le **TP-80** de
Revenu Québec. Deux sections : `ca` (anglais canadien, `/ca/`) et `ca-fr` (français du Québec, `/ca/fr/`), mêmes
écrans et même moteur, textes dans les deux langues. Références : les Espaces américain ([60](60-espace-etats-unis.md))
et britannique ([61](61-espace-royaume-uni.md)), dont on reprend toute l'architecture.

## 1. Règles

### 1.1 Déjà lues aux sources officielles (dans `data/rules/ca.json`)

| Sujet | Règle | Clé |
|---|---|---|
| Taxes de vente | TPS 5 % ; TVH par province ; TVQ 9,975 % ; TVP de la Colombie-Britannique, de la Saskatchewan et du Manitoba ; taux par province (`_meta.provinces`) | `gst_rate`, `hst_rates`, `qst_rate`, `pst_rates` |
| Petit fournisseur | Seuil de 30 000 $ sur les quatre trimestres civils précédents (Loi sur la taxe d'accise, art. 148), fournitures taxables faites au Canada ou à l'étranger ; TVQ : même seuil | `small_supplier_threshold`, `qst_small_supplier_threshold`, `small_supplier_includes_zero_rated` |
| Exportation de services | Détaxée (0 %) pour la plupart des services rendus à un non-résident ; preuves à garder | `export_services_zero_rated`, `export_evidence_non_resident`, `qst_services_non_residents_zero_rated` |
| Facture | Mentions exigées pour le crédit de taxe sur les intrants selon le montant (moins de 100 $, 100 $ à 499,99 $, 500 $ ou plus) ; numéros de TPS/TVH et de TVQ ; au Québec, factures en français | `itc_invoice_requirements`, `tax_number_formats`, `qst_registration_number_on_invoices`, `quebec_invoices_in_french` |
| Impôt et cotisations | Barèmes fédéral et provinciaux, montant personnel de base, abattement du Québec, surtaxe et contribution santé de l'Ontario ; RPC/RRQ du travailleur autonome (deux parts), RPC2/RRQ2, RQAP ; moteur `engines/tax-ca.js` du calculateur public | `federal_*`, `provinces`, `cpp_*`, `qpp_*`, `qpip_*` |
| Acomptes provisionnels | 15 mars, 15 juin, 15 septembre, 15 décembre ; requis si l'impôt net à payer dépasse 3 000 $ (1 800 $ au Québec) pour l'année et l'une des deux années précédentes | `instalment_due_dates_2026`, `instalment_threshold`, `instalment_threshold_quebec` |
| Dates limites | Déclaration d'un travailleur autonome : 15 juin ; solde dû : 30 avril | `filing_deadline_self_employed`, `balance_due_date` |
| Conservation des pièces | Six ans après la fin de l'année d'imposition visée | `ca_records_retention` |
| Retards de paiement | Pas d'intérêt légal automatique ; taux convenu par contrat (Loi sur l'intérêt, art. 4 : taux annuel à indiquer) | `late_payment_interest_practice`, `interest_act_s4` |
| Frais de véhicule, bureau à domicile | Kilométrage raisonnable de l'ARC ; conditions du bureau à domicile | `cra_reasonable_kilometre_allowance`, `ca_business_use_of_home` |
| Échéances | Calendrier fiscal canadien existant (`data/calendars/ca.json`, avec le Québec) | — |

### 1.2 À lire avant le moteur (étape 1)

1. **Méthode de comptabilité et exercice** (guide T4002 de l'ARC) : le revenu d'entreprise ou de profession se déclare
   selon la **comptabilité d'exercice** (sauf exceptions), contrairement aux États-Unis et au Royaume-Uni ; exercice
   d'un particulier (année civile, sauf choix) ; ce qui compte dans le revenu brut (montants facturés, encaissés ou non).
2. **Formulaire T2125** de l'année en cours : numéros et intitulés exacts des lignes de dépenses (partie 5 : 8521
   publicité, 8523 repas et frais de représentation, 8690 assurances, 8810 frais de bureau, 8860 honoraires
   professionnels, 9200 frais de déplacement, 9270 autres dépenses…), ligne du revenu brut (partie 3), règle des repas
   à 50 %, ligne de la TPS/TVH incluse ou non.
3. **TP-80** de Revenu Québec : correspondance des lignes avec le T2125 (pour une seule saisie au Québec).
4. **Taxe de vente d'un inscrit** : ce que l'Espace peut montrer sans préparer la déclaration (taxe perçue d'après les
   factures, crédits de taxe sur les intrants d'après les dépenses saisies) ; dates de déclaration selon la période.
5. **Prospection** : Loi canadienne anti-pourriel (LCAP, articles 6, 10 et 11 : consentement exprès ou tacite,
   identification, mécanisme d'exclusion à traiter en 10 jours ouvrables) ; Règles sur les télécommunications non
   sollicitées du CRTC (liste nationale de numéros de télécommunication exclus).

## 2. Périmètre de la version 1

**Repris de l'Espace commun** : profil, clients, soumissions/estimates, factures (moteur et paramètres du générateur
canadien : taxes de vente de la province du client, aperçu identique), notes de crédit, encaissements, relances par
courriel, temps passé, prospects, indicateurs, trésorerie, échéances, sauvegarde, adresses dans la langue de la section.

**Propre au Canada** :

1. **Revenu de l'année** : en comptabilité d'exercice (Loi de l'impôt sur le revenu, art. 12(1)b) et 28(1), lus le
   21/11/2026) : montants facturés dans l'année, payés ou non, notes de crédit déduites, avec l'encaissé à côté pour
   la trésorerie ; année civile.
2. **Dépenses** par ligne du T2125 (intitulés exacts, aide de l'ARC), repas à 50 % ; au Québec, ligne équivalente du
   TP-80 affichée à côté.
3. **Synthèse T2125** de l'année (revenu brut, dépenses par ligne, revenu net) ; export CSV ; aide à la préparation,
   pas une déclaration.
4. **Impôt estimé** : impôt fédéral et provincial, RPC/RRQ et RQAP du calculateur public (même moteur), province du
   profil ; **acomptes provisionnels** trimestriels si le seuil est dépassé, montants versés saisis.
5. **TPS/TVH et TVQ** : indicateur du seuil de petit fournisseur (quatre trimestres civils), et, pour un inscrit, taxe
   perçue d'après les factures et taxe payée d'après les dépenses (estimation de la taxe nette).
6. **Retards de paiement** : intérêts seulement s'ils sont prévus au contrat (taux annuel), sinon aucune somme proposée.
7. **Échéances** : calendrier canadien existant, filtré par la province et le profil.

**Hors version 1** (dit à l'écran) : déduction pour amortissement (DPA), méthode rapide de TPS/TVH, préparation des
déclarations de taxe, sociétés et sociétés de personnes, revenus de location, envoi à l'ARC ou à Revenu Québec.

## 3. Architecture

Comme les États-Unis et le Royaume-Uni (D88 à D100) : `engines/espace-ca.js` (fabrique `create(textes)` sur le cœur
commun) ; `tools/espace-ca-ui.js` (crochets du module, communs aux deux sections) ; textes `tools/espace-ca-texts-en.js`
et `tools/espace-ca-texts-fr.js` ; variantes régionales des textes communs `tools/espace-texts-en-CA.js` (orthographe
canadienne au besoin) et `tools/espace-texts-fr-CA.js` (français du Québec : *soumission* pour le devis, *note de crédit*
pour l'avoir, *courriel*) ; paramètres de facture des générateurs canadiens dans `data/invoice-profiles/ca.json` et
`ca-fr.json`, et la construction des choix de taxe par province déplacée de `tools/invoice.js` vers le moteur de
facture (une seule source pour le générateur et l'Espace) ; pages en brouillon `/ca/workspace/` et `/ca/fr/espace/`,
puis publication.

## 4. Critères d'acceptation

| N° | Critère |
|---|---|
| C1 | Parcours des Espaces français, américain et britannique identiques. |
| C2 | Une facture canadienne émise dans l'Espace a le même aperçu et les mêmes taxes que le générateur public de sa langue. |
| C3 | Le revenu de l'année suit la méthode lue au T4002 (exercice ou caisse), avec un exemple officiel s'il en existe un. |
| C4 | Chaque dépense a une ligne du T2125 ; repas à 50 % ; la synthèse additionne exactement les dépenses de l'année ; export CSV identique à l'écran. |
| C5 | L'impôt, les cotisations et les acomptes affichés sont ceux du calculateur public pour les mêmes données. |
| C6 | Seuil de petit fournisseur : total exact des quatre derniers trimestres civils ; taxe perçue égale à celle des factures. |
| C7 | Textes en anglais canadien et en français du Québec (aucun texte manquant ni de France là où le Québec diffère), aucun débordement, accessibilité AA, trois largeurs, dans les deux sections. |

## 5. Étapes

1. **Lectures** (§ 1.2), règles nouvelles dans `data/rules/ca.json`.
2. **Moteur** `engines/espace-ca.js` et ses tests (C3 à C6) ; choix de taxe par province dans le moteur de facture.
3. **Module d'écrans**, textes des deux langues, variantes régionales, pages en brouillon, parcours navigateur (C2, C7).
4. **Publication** des deux sections : pages, menus, en-têtes, encarts, vitrines (comme D96 et D100).

### Avancement

- **21/11/2026** : spécification (D101) ; premières lectures (§ 6) : méthode de comptabilité tranchée par la loi
  (exercice), LCAP ; règles `ca_business_income_accrual` et `ca_casl`.

## 6. Lectures

- **Loi de l'impôt sur le revenu, art. 12(1)b) et 28(1)** (Justice Canada, lus le 21/11/2026) : le revenu d'une
  entreprise comprend « any amount receivable ... in respect of property sold or services rendered in the course of a
  business in the year, notwithstanding that the amount ... is not due until a subsequent year » ; la méthode de caisse
  n'est qu'une option d'une entreprise agricole ou de pêche (art. 28(1)). **Conséquence (critère C3)** : l'Espace
  canadien compte le revenu de l'année d'après les factures de l'année (services rendus et facturés), payées ou non,
  notes de crédit déduites ; l'encaissé reste montré pour la trésorerie. Règle `ca_business_income_accrual`.
- **Loi canadienne anti-pourriel (LCAP), art. 6, 10 et 11** (Justice Canada, lus le 21/11/2026) : message
  électronique commercial seulement avec le consentement exprès ou tacite du destinataire, identification de
  l'expéditeur, coordonnées valides 60 jours, mécanisme d'exclusion ; consentement tacite par une relation d'affaires
  en cours (achat ou contrat dans les **deux ans**, demande de renseignements dans les **six mois**) ou une adresse
  publiée ou communiquée avec un message lié aux fonctions de la personne ; une soumission demandée par le destinataire
  est exemptée du consentement ; exclusion appliquée **au plus tard 10 jours ouvrables** après la demande. Règle
  `ca_casl`.
- **Non lus le 21/11/2026** : le guide T4002 et le formulaire T2125 (canada.ca n'a pas répondu au lecteur : délai
  dépassé, trois essais) ; le TP-80 (Revenu Québec refuse le lecteur automatique : réponse 403, non contourné). À
  relire avant le moteur pour les lignes du T2125 ; le TP-80 restera sans correspondance tant qu'il n'est pas lisible
  (l'Espace le dira au Québec).
- **À lire ensuite** : Règles sur les télécommunications non sollicitées du CRTC (appels de prospection, liste nationale
  de numéros exclus).
