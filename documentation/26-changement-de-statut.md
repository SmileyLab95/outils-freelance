# 26. Guide de changement de statut (4 pays)

Besoin P2 de [02](02-besoins-clients.md), § 10 : « Changer de statut », comparateur (fait dans les quatre pays) puis
**guide de passage**. Spécification du 23/10/2026, avant tout code (charte qualité) ; **réalisé le même jour (§ 4)**. Pas de conseil personnalisé (D8) :
le guide liste les démarches officielles et renvoie vers un comptable pour les choix fiscaux (apport, *rollover*).

## 1. Ce que les sources officielles établissent (lu par extraits de recherche le 23/10/2026)

Les sites officiels ne s'ouvrent pas depuis l'environnement de travail : chaque point a été lu par extraits de
recherche ; confiance « moyenne » sauf recoupement.

### Royaume-Uni : de *sole trader* à *limited company*

| Étape | Règle | Source |
|---|---|---|
| Créer la société | Immatriculation en ligne auprès de Companies House : 100 £ (logiciel : 100 £, papier : 124 £ ; même jour par logiciel seulement : 156 £), grille du 1er février 2026. | [Companies House fees](https://www.gov.uk/government/publications/companies-house-fees/companies-house-fees) ; [IN01](https://www.gov.uk/government/publications/register-a-private-or-public-company-in01) |
| Impôt sur les sociétés | Inscription dans les 3 mois suivant le début de l'activité (acheter, vendre, faire de la publicité, louer, employer) ; pénalité possible en cas de retard ; UTR envoyé dans les 14 jours suivant l'immatriculation. | [Set up a private limited company: Register for Corporation Tax](https://www.gov.uk/limited-company-formation/set-up-your-company-for-corporation-tax) |
| Prévenir HMRC | Dire à HMRC qu'on change de structure et qu'on cesse d'être *self-employed* (service en ligne) ; dernière déclaration *Self Assessment* avant la date limite. | [Stop being self-employed](https://www.gov.uk/stop-being-self-employed) ; [Tell HMRC about a change to your business](https://www.gov.uk/tell-hmrc-changed-business-details/change-to-your-business) |
| Salaire du dirigeant | S'inscrire comme employeur (PAYE) avant le premier jour de paie, même si l'on n'emploie que soi-même comme seul dirigeant ; pas plus de 2 mois avant. | [Register as an employer](https://www.gov.uk/register-employer) |
| TVA | Si l'on est immatriculé : transfert du numéro possible (formulaire VAT68 avec une nouvelle demande d'immatriculation), à demander dès le transfert et avant d'annuler l'ancienne immatriculation ; la société reprend alors les dettes de TVA ; sinon annulation (VAT7) et nouvelle immatriculation. | [Transfer your VAT registration](https://www.gov.uk/register-for-vat/transfer-your-registration) ; [VAT68](https://www.gov.uk/government/publications/vat-request-for-transfer-of-a-registration-number-vat68) |
| Banque, assurance | Compte au nom de la société (règle `uk_limited_company_money`) ; *employers' liability* dès que la société emploie quelqu'un (règle `uk_employers_liability_insurance`). | Règles existantes |

### États-Unis : de *sole proprietor* à LLC ou S corporation

| Étape | Règle | Source |
|---|---|---|
| LLC | Création auprès de l'État : statuts (*articles of organization*) et agent enregistré (*registered agent*) situé dans l'État ; coût d'immatriculation en général inférieur à 300 $, variable selon l'État ; rapport annuel ou biennal dans beaucoup d'États ; licences à refaire selon l'État ou la commune (SBA). Une LLC à un membre peut garder l'EIN du *sole proprietor* si elle ne choisit pas l'imposition comme société ou S corporation, n'a pas de salarié et ne doit pas d'accise. | [SBA : Register your business](https://www.sba.gov/business-guide/launch-your-business/register-your-business) ; [IRS : When to get a new EIN](https://www.irs.gov/businesses/small-businesses-self-employed/when-to-get-a-new-ein) |
| Société, association | Nouvel EIN obligatoire si l'on se constitue en société (*incorporate*) ou si l'on forme une *partnership*. | Idem ; [Instructions SS-4 (12/2025)](https://www.irs.gov/instructions/iss4) |
| Option S corporation | Formulaire 2553 au plus tard 2 mois et 15 jours après le début de l'année d'effet (ou pendant l'année précédente) ; une entité qui dépose le 2553 n'a pas à déposer le 8832 ; recours possible pour un retard justifié (en général dans les 3 ans et 75 jours). | [Instructions for Form 2553](https://www.irs.gov/instructions/i2553) |
| Salaire, banque, assurance | Salaire raisonnable du dirigeant (règle `scorp_reasonable_compensation`) ; compte séparé (règles `us_llc_separate_funds`, `us_business_bank_account_irs`) ; assurances d'employeur (règle `us_employer_insurance`). | Règles existantes |

### Canada : d'entreprise individuelle à société par actions

| Étape | Règle | Source |
|---|---|---|
| Constitution fédérale | En ligne : 200 $ (1 jour ouvrable ; express en 4 heures : 100 $ de plus) ; par courriel ou par la poste : 250 $ ; le numéro d'entreprise (NE) et le compte d'impôt des sociétés (RC) sont attribués à la constitution ; enregistrement simultané en Ontario, en Nouvelle-Écosse et à Terre-Neuve-et-Labrador, sans frais en Ontario. | [Corporations Canada : services, fees and processing times](https://ised-isde.canada.ca/site/corporations-canada/en/services-fees-and-processing-times) ; [Provincial registration of federal corporations](https://ised-isde.canada.ca/site/corporations-canada/en/business-corporations/provincial-registration-federal-business-corporations) |
| Constitution provinciale | Ontario : 300 $ (rapport de recherche de nom, sauf dénomination numérique). Autres provinces : non relevées. | [Ontario : Register your business online](https://www.ontario.ca/page/business/start/register-your-business-online) |
| Transfert des biens | Roulement de l'article 85 : formulaire T2057 (T2058 pour une société de personnes), actions reçues en contrepartie obligatoires, date limite = la plus proche des dates de production des parties, pénalité de retard. À faire avec un comptable. | [IC76-19R3](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/ic76-19/transfer-property-a-corporation-under-section-85.html) ; [T2057](https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2057.html) |
| Comptes de l'ARC | Changement de statut juridique : en général, fermer le NE et les comptes de l'entreprise individuelle et en ouvrir de nouveaux ; les comptes TPS/TVH (RT) et retenues sur la paie (RP) ne passent pas d'eux-mêmes au nouveau NE (à ouvrir après la constitution). | [ARC : Change of legal status](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/business-registration/maintain-business/change-legal-status.html) ; [ARC : Corporation](https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/corporation.html) |
| Déclaration T2 | Dans les 6 mois suivant la fin de l'exercice, même sans impôt à payer ; premier exercice de 53 semaines au plus ; annexe 24 la première fois. | [T4012, chapitre 1](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-1-page-1-t2-return.html) |

### France : de micro-entrepreneur à régime réel ou société

| Étape | Règle | Source |
|---|---|---|
| Rester en entreprise individuelle, au réel | Option pour le régime réel (BIC) dans le délai de dépôt de la déclaration des revenus de l'année précédente ; en création, au plus tard le dernier jour du 3e mois suivant la création ; option BNC (déclaration contrôlée) jusqu'à la date de dépôt de la 2035 ; option valable un an, renouvelée tacitement. | [impots.gouv : les régimes d'imposition](https://www.impots.gouv.fr/particulier/les-regimes-dimposition) ; [BOI-BIC-DECLA-10-30](https://bofip.impots.gouv.fr/bofip/1886-PGP.html/identifiant=BOI-BIC-DECLA-10-30-20220511) |
| Passer en société (EURL, SASU) | Créer la société, transférer l'activité (cession du fonds ou apport), puis cesser la micro-entreprise ; l'apport de l'EI transfère l'actif et le passif professionnels, sauf les dettes de cotisations sociales ; accord du conjoint commun en biens ; déclarations au guichet unique dans les 45 jours suivant l'annonce légale ; la société reçoit un nouveau numéro SIREN ; l'apport à une société dont on est l'unique associé dispense de certaines formalités ; l'option de l'EI pour l'assimilation à une EURL à l'IS vaut cessation fiscale. | [Bpifrance Création : sortir du régime](https://bpifrance-creation.fr/encyclopedie/micro-entreprise-regime-auto-entrepreneur/sortir-du-regime/comment-sortir-du-regime) ; [Service-public : apport d'une EI en société (F36954)](https://entreprendre.service-public.gouv.fr/vosdroits/F36954) |
| Cesser la micro-entreprise | Déclaration de cessation au guichet unique dans les 30 jours suivant l'arrêt ; dernière déclaration de chiffre d'affaires et paiement des cotisations (dans les 30 jours en déclaration mensuelle, le mois suivant le trimestre en déclaration trimestrielle) ; déclaration 2042-C PRO dans les 60 jours ; TVA : déclaration CA12 en ligne dans les 60 jours suivant la cessation au régime simplifié (CA3 : 30 jours) ; CFE selon le cas. | [impots.gouv : délais en cas de cessation](https://www.impots.gouv.fr/professionnel/questions/quels-delais-dois-je-respecter) ; [economie.gouv.fr : fermer sa micro-entreprise](https://www.economie.gouv.fr/entreprises/gerer-sa-micro-entreprise/fermer-sa-micro-entreprise-les-demarches-suivre-en-cas-de-cessation-volontaire) ; [Service-public F20678](https://entreprendre.service-public.gouv.fr/vosdroits/F20678) |

## 2. Pages proposées

Une liste d'étapes interactive par pays (script `tools/checklist.js`, comme les checklists de création), cochable et
mémorisée, chaque étape liée à sa règle :

- Royaume-Uni : `/uk/sole-trader-to-limited-company/` ; options : immatriculé à la TVA, salaire du dirigeant, autres
  salariés. Étapes : Companies House (ce qu'il faut fournir, vérification d'identité des dirigeants), impôt sur les
  sociétés, compte de la société, TVA (transfert ou annulation), PAYE, *employers' liability*, prévenir HMRC, dernière
  déclaration *Self Assessment*.
- États-Unis : `/us/sole-proprietor-to-llc/` ; options : option S corporation, salariés. Étapes : statuts et agent
  enregistré, licences, EIN (conservé ou nouveau selon le cas), compte séparé, formulaire 2553 et salaire raisonnable
  (S corporation), obligations d'employeur, registres.
- Canada : `/ca/incorporate-sole-proprietorship/` et `/ca/fr/constituer-societe/` ; options : où constituer (fédéral,
  Ontario, autre province), inscrit à la TPS/TVH, salaire, transfert de biens. Étapes : constitution, comptes RT et RP
  au nouveau NE, fermeture des comptes de l'entreprise individuelle, choix de l'article 85 avec un comptable, compte
  bancaire, déclaration T2, dernière déclaration de l'entreprise individuelle.
- France : `/fr/passer-en-societe/` ; options : rester en entreprise individuelle au réel ou passer en société (EURL
  ou SASU), activité libérale (BNC), TVA. Étapes : option pour le réel ; ou création de la société, apport de l'EI,
  compte de la société, cessation de la micro-entreprise (30 jours), dernière déclaration de chiffre d'affaires,
  2042-C PRO (60 jours).

Identifiant commun `switch` ; liens depuis les comparateurs de statuts (`structure`). Les frais d'État aux États-Unis,
les montants des autres provinces canadiennes et le détail fiscal des apports ne sont pas repris (sources non lues ou
conseil personnalisé).

## 3. Points à vérifier avant la rédaction

- Canada : frais de constitution des provinces autres que l'Ontario (non repris, renvoi vers la province).
- États-Unis : frais de création de LLC propres à chaque État (non repris, renvoi vers l’État).
- France : effets fiscaux de la cessation (fiche F38564), à résumer sans chiffrer (renvoi vers un comptable).

## 4. Réalisation (23/10/2026)

- Pages `/uk/sole-trader-to-limited-company/`, `/us/sole-proprietor-to-llc/`, `/ca/incorporate-sole-proprietorship/`,
  `/ca/fr/constituer-societe/` et `/fr/passer-en-societe/` (identifiant `switch`, dans le menu après le comparateur
  de statuts, qui renvoie vers elles) : listes d'étapes cochables et mémorisées (`tools/checklist.js`), selon la
  situation (TVA, salaire, salariés ; option S corporation ; lieu de constitution, TPS/TVH, transfert de biens ; SASU
  ou EURL, cessation ou apport, TVA).
- Choix de prudence : le Canada propose la constitution fédérale ou en Ontario (les seuls frais vérifiés), avec un
  renvoi vers le registre provincial ailleurs ; aux États-Unis, ni les frais ni les règles des États ; en France,
  l'apport est signalé sans chiffrer ses effets fiscaux (expert-comptable).
- Dix-sept règles nouvelles (uk.json, us.json, ca.json, fr.json), dont le traitement fiscal par défaut d'une LLC à
  un membre (IRS) ; règles existantes réutilisées (salaire raisonnable, registres, date limite des travailleurs
  autonomes, numéro d'entreprise, compte de la société).
- Tests : `switch.test.mjs` (chaque étape sourcée, une variante par situation, nombre d'étapes, chiffres repris des
  règles, mêmes étapes en anglais et en français au Canada) ; parcours navigateur des cinq pages ; 12 erreurs
  réintroduites, toutes détectées. Revue : une phrase sur l'effet fiscal d'une LLC reformulée et sourcée.
