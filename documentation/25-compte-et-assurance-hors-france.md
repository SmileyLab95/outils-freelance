# 25. Compte professionnel et assurance hors de France (Royaume-Uni, États-Unis, Canada)

Besoins P2 de [02](02-besoins-clients.md) : « Assurance professionnelle » et « Compte pro, encaissement », colonnes
États-Unis, Royaume-Uni et Canada (la France est faite : [15](15-guides-gestion.md), § 1 et § 2). **Spécification en
cours** (23/10/2026) : recherches faites, pages à construire. Mêmes identifiants que les pages françaises (`bank`,
`insurance`) pour les liens de langue et de pays. Pas de partenaires ni d'affiliation (D4) ; pas de conseil personnalisé
(D8).

## 1. Ce que les sources officielles établissent (lu par extraits de recherche le 23/10/2026)

### Compte bancaire

| Pays | Règle | Source |
|---|---|---|
| Royaume-Uni | Un *sole trader* (et une *partnership* ordinaire) n'est pas obligé d'avoir un compte professionnel ; séparer simplifie la comptabilité. Les registres doivent permettre d'identifier les opérations de l'activité ; on peut, selon la banque, utiliser un compte personnel ou professionnel. | [business.gov.uk : *Getting a business bank account*](https://www.business.gov.uk/support/accounting-tax-cashflow/getting-a-business-bank-account/) ; [GOV.UK : *Business records if you're self-employed*](https://www.gov.uk/self-employed-records) |
| Royaume-Uni | Une *limited company* doit garder son argent séparé de celui de ses dirigeants (personne morale distincte) : compte de la société. | [GOV.UK : *Running a limited company — company and accounting records*](https://www.gov.uk/running-a-limited-company/company-and-accounting-records) |
| États-Unis | L'IRS conseille d'ouvrir un compte professionnel dès le début et de le garder séparé du compte personnel (toutes les recettes y passent, rapprochement mensuel). | [IRS, Pub. 583 (12/2024)](https://www.irs.gov/publications/p583) |
| États-Unis | Un *sole proprietor* n'a aucune séparation juridique avec son activité ; pour une LLC, garder les fonds séparés participe à la protection de la responsabilité limitée. Pièces demandées : EIN (ou numéro de sécurité sociale pour un *sole proprietor*), statuts, licence. Une LLC sans salarié n'a pas besoin d'EIN, mais peut en demander un pour ouvrir un compte (gratuit). | [SBA : *Open a business bank account*](https://www.sba.gov/business-guide/launch-your-business/open-business-bank-account) ; [IRS : *Single member LLCs*](https://www.irs.gov/businesses/small-businesses-self-employed/single-member-limited-liability-companies) |
| Canada | Une entreprise individuelle qui exerce sous un autre nom que celui de son propriétaire a besoin d'un compte séparé pour encaisser les chèques à ce nom ; sous son propre nom, un compte existant peut servir, mais l'ARC encourage fortement à séparer. Registres et pièces gardés 6 ans après la fin de la dernière année d'imposition concernée. | [ARC : *Sole proprietorship*](https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/sole-proprietorship.html) ; [ARC : *Starting a small business*](https://www.canada.ca/en/revenue-agency/campaigns/life-events/starting-small-business.html) ; [ARC : *Business records*](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/business-records.html) |

### Assurance

| Pays | Règle | Source |
|---|---|---|
| Royaume-Uni | *Employers' liability* obligatoire dès le premier salarié : 5 millions de livres au moins, assureur agréé ; amende de 2 500 £ par jour sans assurance, 1 000 £ si le certificat n'est pas affiché ; pas obligatoire si l'on n'emploie qu'un membre de sa famille proche ou une personne basée hors d'Angleterre, d'Écosse et du pays de Galles. | [GOV.UK : *Employers' liability insurance*](https://www.gov.uk/employers-liability-insurance) ; [SI 1998/2573](https://www.legislation.gov.uk/uksi/1998/2573/made) |
| Royaume-Uni | Assurance auto obligatoire pour un véhicule utilisé pour l'activité, y compris une voiture personnelle ; prévenir l'assureur de la maison si l'on y travaille. Responsabilité civile professionnelle obligatoire seulement pour certaines professions (santé, réglementées). | [business.gov.uk : *How to get insurance for small businesses*](https://www.business.gov.uk/support/regulations-and-licensing/insuring-your-business/) |
| États-Unis | Avec des salariés : assurance accidents du travail exigée par les États (le Texas la laisse facultative pour la plupart des employeurs privés, qui doivent alors en informer leurs salariés et la DWC) ; assurance chômage de l'État ; assurance invalidité obligatoire en Californie, à Hawaï, au New Jersey, dans l'État de New York, au Rhode Island et à Porto Rico. | [SBA : *Get business insurance*](https://www.sba.gov/business-guide/launch-your-business/get-business-insurance) ; [SBA : *Hire and manage employees*](https://www.sba.gov/business-guide/manage-your-business/hire-manage-employees) ; [Texas Department of Insurance](https://www.tdi.texas.gov/wc/employer/index.html) |
| Canada | Accidents du travail pour soi-même : facultatif pour le travailleur autonome en Ontario hors construction (obligatoire dans la construction, avec une exception pour la rénovation résidentielle), au Québec (protection personnelle de la CNESST), en Colombie-Britannique (*Personal Coverage*, nouveau nom depuis le 02/03/2026) et en Alberta (un donneur d'ordre peut l'exiger par contrat) ; un employeur doit inscrire ses salariés. Autres provinces : à rechercher. | [WSIB](https://www.wsib.ca/en/businesses/registration-and-coverage/can-i-choose-have-wsib-insurance) ; [CNESST, note 278H](https://www.cnesst.gouv.qc.ca/sites/default/files/documents/note278h_0.pdf) ; [WorkSafeBC](https://www.worksafebc.com/en/insurance/need-coverage/optional-coverage/personal-coverage) ; [WCB Alberta](https://www.wcb.ab.ca/insurance-and-premiums/types-of-coverage/personal-coverage.html) |

## 2. Pages proposées

Un vérificateur par pays et par sujet, sur le modèle des pages françaises : quelques questions (statut, salariés,
véhicule, profession réglementée, province ou État), puis ce qui est obligatoire, ce qui est conseillé, et les
démarches, chaque ligne liée à sa règle.

- Royaume-Uni : `/uk/business-bank-account/`, `/uk/business-insurance/`.
- États-Unis : `/us/business-bank-account/`, `/us/business-insurance/`.
- Canada : `/ca/business-bank-account/`, `/ca/business-insurance/` et leurs versions françaises.

**À faire avant de construire** : relire les sources exactes ; compléter les provinces et territoires canadiens
manquants (Saskatchewan, Manitoba, provinces de l'Atlantique, territoires) ; vérifier, au Royaume-Uni, la conservation
des registres et la règle du compte bancaire pour la TVA ; décider de ne rien afficher sur les prix des assurances
(aucune source officielle).
