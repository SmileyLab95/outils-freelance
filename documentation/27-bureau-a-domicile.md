# 27. Bureau à domicile (4 pays)

Besoin P3 de [02](02-besoins-clients.md), § 8 : « Bureau à domicile : calculateur de déduction ». Spécification du
23/10/2026, avant tout code (charte qualité) ; **réalisé le même jour (§ 3)**. Pas de conseil personnalisé (D8) : l'outil applique les méthodes
officielles et signale ce qu'il ne calcule pas.

## 1. Ce que les sources officielles établissent (lu par extraits de recherche le 23/10/2026)

| Pays | Règle | Source |
|---|---|---|
| États-Unis | Espace utilisé régulièrement et exclusivement comme lieu principal d'activité ou pour recevoir des clients. **Méthode simplifiée** : 5 $ par pied carré, 300 pieds carrés au plus (1 500 $ au plus) ; pas d'amortissement de la partie professionnelle ; l'excédent sur la limite de revenu ne se reporte pas ; les intérêts d'emprunt et taxes foncières restent déductibles en déduction personnelle (Schedule A). **Méthode réelle** : part de la surface × dépenses du logement (formulaire 8829) ; la déduction ne peut pas dépasser la limite de revenu (calcul détaillé du formulaire 8829) ; l'excédent se reporte sur l'année suivante. Choix de la méthode chaque année. | [IRS : Simplified option](https://www.irs.gov/businesses/small-businesses-self-employed/simplified-option-for-home-office-deduction) ; [Pub. 587 (2025)](https://www.irs.gov/publications/p587) ; [Topic 509](https://www.irs.gov/taxtopics/tc509) |
| Royaume-Uni | **Forfait** (*simplified expenses*) si l'on travaille au moins 25 heures par mois à domicile : 10 £ par mois de 25 à 50 heures, 18 £ de 51 à 100 heures, 26 £ au-delà ; ne couvre ni le téléphone ni internet (part professionnelle réelle à part) ; réservé aux *sole traders* et aux *partnerships* sans société associée. **Coûts réels** : part raisonnable des frais (chauffage, électricité, *Council Tax*, intérêts d'emprunt ou loyer), par exemple selon le nombre de pièces et le temps : exemple officiel, 4 pièces dont un bureau, 1 120 £ d'électricité → 280 £, bureau utilisé un jour par semaine → 40 £. Pas les deux méthodes pour les mêmes frais. | [GOV.UK : simplified expenses, working from home](https://www.gov.uk/simpler-income-tax-simplified-expenses/working-from-home) ; [GOV.UK : expenses if you're self-employed](https://www.gov.uk/expenses-if-youre-self-employed) |
| Canada | Espace qui est le lieu principal d'affaires, ou utilisé uniquement pour l'entreprise et de façon régulière et continue pour rencontrer des clients. Répartition raisonnable : superficie de l'espace ÷ superficie habitable totale, et part du temps si l'espace sert aussi à la vie privée. Dépenses : loyer, assurance, impôt foncier, intérêts hypothécaires, chauffage, électricité, eau, entretien ; pas les dépenses en capital (meubles, ordinateurs) ; la DPA sur le logement entraîne des conséquences à la vente (à éviter dans l'outil). Plafond : le revenu net de l'entreprise avant ces dépenses (pas de perte créée ni augmentée) ; l'excédent se reporte à l'année suivante. | [ARC : Business-use-of-home expenses](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/business-use-home-expenses.html) ; [ARC : Calculating business-use-of-home expenses](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/sole-proprietorships-partnerships/report-business-income-expenses/completing-form-t2125/calculating-business-use-home-expenses.html) ; [Folio S4-F2-C2](https://www.canada.ca/en/revenue-agency/services/tax/technical-information/income-tax/income-tax-folios-index/series-4-businesses/series-4-businesses-folio-2-deducting-business-expenses/income-tax-folio-s4-f2-c2-business-use-home-expenses.html) |
| France | **Micro-entreprise** : pas de déduction des charges réelles ; l'abattement forfaitaire (71 %, 50 % ou 34 %) est censé couvrir notamment les charges liées au local professionnel. **Régime réel** : pour un local à usage mixte, la part déductible du loyer (et des dépenses du logement) est, en règle pratique, le rapport entre la superficie professionnelle et la superficie totale ; à justifier. Domicile déclarable comme adresse de l'entreprise (règle `domiciliation_domicile`). | [impots.gouv : micro-entrepreneur, puis-je déduire des charges ?](https://www.impots.gouv.fr/professionnel/questions/je-suis-micro-entrepreneur-puis-je-deduire-des-charges) ; [BOI-BNC-BASE-40-60-30](https://bofip.impots.gouv.fr/bofip/4659-PGP.html/identifiant=BOI-BNC-BASE-40-60-30-20120912) |

## 2. Outil proposé

Un calculateur par pays, identifiant `home-office`, moteur pur `engines/home-office.js` (`us`, `uk`, `ca`, `fr`) ;
textes dans les pages.

| Pays | Entrées | Résultat |
|---|---|---|
| États-Unis | Surface du bureau, surface du logement, dépenses annuelles du logement, bénéfice avant la déduction (facultatif) | Méthode simplifiée (5 $ × surface plafonnée à 300) et méthode réelle (part de surface × dépenses), la plus favorable, limitées au bénéfice saisi ; report possible avec la méthode réelle seulement. Avertissement : limite exacte du formulaire 8829 non calculée, amortissement non compté. |
| Royaume-Uni | Heures de travail à domicile par mois, nombre de mois, frais annuels du logement, pièces au total, pièces de travail, jours de travail par semaine | Forfait annuel (barème mensuel × mois) et coûts réels (frais × pièces de travail ÷ pièces × jours ÷ 7), le plus favorable ; sous 25 heures, pas de forfait. |
| Canada (EN, FR) | Condition remplie (lieu principal ou clients), surface de l'espace, surface habitable, part du temps (%), dépenses annuelles, revenu net avant ces dépenses, report de l'an dernier | Montant de l'année (surface × temps × dépenses), déductible = min(montant + report, revenu net ≥ 0), report sur l'année suivante ; condition non remplie → rien. |
| France | Régime (micro ou réel), surface professionnelle, surface totale, loyer et charges annuels | Micro : aucune déduction (abattement) ; réel : prorata de surface × dépenses. |

Cas limites : surfaces nulles ou bureau plus grand que le logement (refusé : part plafonnée à 100 %), montants négatifs
ramenés à 0, revenu négatif (Canada : 0 déductible, tout reporté).

Tests : exemples officiels (GOV.UK : 280 £ et 40 £ ; forfait 136 £ pour 10 mois à 40 heures et 2 mois à 60 heures ;
IRS : 300 pieds carrés → 1 500 $), plafonds et reports, chaque texte présent, chiffres des pages repris des règles.

## 3. Réalisation (23/10/2026)

- Pages `/us/home-office-deduction-calculator/`, `/uk/working-from-home-allowance-calculator/`,
  `/ca/business-use-of-home-calculator/`, `/ca/fr/frais-bureau-a-domicile/` et `/fr/bureau-a-domicile/` (identifiant
  `home-office`, dans le menu après les indemnités kilométriques).
- Moteur `engines/home-office.js` (quatre fonctions pures) et outil commun `tools/home-office.js` ; six règles
  nouvelles ou complétées (us.json, uk.json, ca.json, fr.json), deux règles existantes enfin utilisées (méthode
  simplifiée de l'IRS, forfaits britanniques).
- Tests : `home-office.test.mjs` (exemples officiels : 1 500 $, 136 £, 280 £ et 40 £, exemple 173/441 du BOFiP ;
  plafonds, reports, cas limites ; textes et chiffres des pages) ; parcours navigateur des cinq pages ; 15 erreurs
  réintroduites, toutes détectées. Revue des captures : tableau britannique trop large sur mobile (conteneur défilant
  retiré, en-têtes raccourcis) ; indication d'unité canadienne mal alignée (placée sous le champ).
