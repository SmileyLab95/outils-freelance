# 44. Date d'échéance d'une facture hors de France (Royaume-Uni, États-Unis, Canada)

Besoin P3 de [02](02-besoins-clients.md) (« date d'échéance hors de France ») ; la France a son calculateur depuis le
20/10/2026. Spécification avant le code, 29/10/2026, après la lecture en entier des sources ci-dessous.

## 1. Besoin

Un indépendant qui facture veut savoir **jusqu'à quel jour son client peut payer**, et à partir de quand le paiement
est en retard : selon les conditions convenues (30 jours, fin de mois, à réception…) et, si rien n'a été convenu ou si
le délai convenu est trop long, selon la règle du pays.

## 2. Règles

| Pays | Règle | Source | Usage |
|---|---|---|---|
| Royaume-Uni (entre entreprises) | « Relevant day » : la date de paiement convenue ; sans date convenue, le dernier jour d'une période de **30 jours commençant** le jour de la prestation ou, s'il est plus tardif, le jour où le client connaît le montant (la facture) ; l'intérêt légal court **le lendemain**. Client **autorité publique** : si la date convenue tombe après la fin de cette période de 30 jours, la fin de la période l'emporte. Autre client : si elle tombe après la fin de la période de **60 jours**, la fin de cette période l'emporte, sauf si la date convenue n'est pas manifestement abusive (*grossly unfair*) pour le prestataire | Late Payment of Commercial Debts (Interest) Act 1998, s. 4(2) à (2I) et (7A) (version révisée, à jour) ; GOV.UK, *When a payment becomes late* ; règle `late_payment_default_due_period` (`data/rules/uk.json`), reprise et structurée | Échéance, début du retard, plafonds de 30 et 60 jours |
| États-Unis | Pas de règle fédérale générale. À New York (ville et État) et dans l'Illinois, un client qui engage un freelance paie à la date du contrat ou, **s'il n'y en a pas, au plus tard 30 jours après la fin du travail** | Règles existantes `freelance_law_nyc`, `freelance_law_new_york_state`, `freelance_law_illinois` (confiance haute) ; nouvelle règle `freelance_default_payment` qui les regroupe | Échéance par défaut selon le lieu |
| Canada | Aucune règle n'est reprise : la date dépend des conditions convenues ; les lois sur le paiement rapide ne visent que la construction (règle existante `prompt_payment_legislation`) | `late_payment_interest_practice`, `prompt_payment_legislation` (`data/rules/ca.json`) | Calcul selon les conditions, sans plafond légal |
| France | Inchangé : 60 jours après la facture, ou 45 jours fin de mois (deux méthodes) au plus (L441-10) | `retard_paiement_delais` | Moteur commun |

**Prudence.** Les autres lois américaines (Californie, Los Angeles, Columbus, Seattle) sont en confiance moyenne ou
basse dans `us.json` : elles ne sont pas reprises dans le calcul ; la page renvoie au guide *Freelance Isn't Free*. Le
caractère « manifestement abusif » d'un délai au Royaume-Uni s'apprécie au cas par cas (s. 4(7A)) : l'outil ne le
juge pas, il signale le dépassement de 60 jours.

## 3. Outil

- **Moteur** `engines/echeance.js` (OFE.dueDate), fonctions pures, dates en UTC :
  - conditions : à réception, N jours, N jours fin de mois, fin de mois + N jours ;
  - France : maximum légal (inchangé) ;
  - Royaume-Uni : `relevantDay({ agreed, performed, notice, publicAuthority })` → jour d'échéance, début du retard,
    plafond appliqué (30 ou 60 jours) ;
  - États-Unis : échéance par défaut = fin du travail + 30 jours, dans les lieux de la règle.
- **Page française** : même résultat qu'aujourd'hui, calcul confié au moteur (une seule source).
- **Royaume-Uni** (*Invoice due date calculator*) : date de la facture, date de la prestation, conditions (dont « no
  date agreed »), client entreprise ou autorité publique → *pay by*, *late from*, avertissement au-delà de 60 (ou 30)
  jours, lien vers le calcul des intérêts.
- **États-Unis** : date de la facture, conditions (dont « no date in the contract »), date de fin du travail, lieu
  (New York City, État de New York, Illinois, ailleurs) → échéance, rappel des lois.
- **Canada** (anglais et français) : date de la facture et conditions → échéance ; rappel : convenir des conditions
  par écrit.
- Menu « Invoicing and getting paid / Facturer » après la facture (comme en France) ; jour de la semaine affiché.

## 4. Tests

- Conditions : 30 jours, fin de mois (28 février, années bissextiles), fin de mois + N jours, à réception.
- France : exemples de la page (10 mars + 45 jours fin de mois → 30 avril ; fin mars + 45 → 15 mai ; 60 jours → 9 mai).
- Royaume-Uni : sans date convenue, prestation le 1er mars et facture le 5 mars → dernier jour le 3 avril (période de
  30 jours commençant le 5 mars), retard le 4 avril ; date convenue à 90 jours → plafonnée au 60e jour (sauf accord non
  abusif) ; autorité publique et date à 45 jours → 30e jour.
- États-Unis : sans date, fin du travail le 15 octobre 2026 → 14 novembre 2026 à New York et dans l'Illinois ; rien
  ailleurs.
- Pages : textes complets, sources, parcours navigateur sur ordinateur, tablette et mobile, accessibilité.

## 5. Réalisation (29/10/2026)

- Règles : `late_payment_default_due_period` (`uk.json`) structurée et sourcée à la loi (s. 4, lue en entier, confiance
  haute) ; `freelance_default_payment` (`us.json`) regroupe le délai par défaut des trois lois de confiance haute ; la
  cohérence avec leur texte est testée.
- Moteur `engines/echeance.js` : conditions (codes de la page française gardés : `45fdm`, `fdm45`), maximums français,
  `ukRelevantDay`, `usDefault` ; une condition redondante (autorité publique déjà plafonnée à 30 jours) retirée après
  les erreurs réintroduites.
- Page française rebranchée sur le moteur : mêmes résultats (parcours navigateur inchangé).
- Pages : `uk/invoice-due-date-calculator/`, `us/invoice-due-date-calculator/`, `ca/invoice-due-date-calculator/`,
  `ca/fr/calcul-date-echeance-facture/`, script commun `tools/echeance.js`, textes dans la page ; menu « facturer »
  avant les relances, comme en France.
- Retiré à la relecture : une réponse américaine « pas de règle fédérale » (non sourcée ; la loi fédérale *Prompt
  Payment Act* vise les administrations fédérales).
- Parcours de la signature d'email (doc 43) rendu robuste : le presse-papiers est lu après la confirmation de la copie
  (lecture trop tôt pendant la suite complète : contenu de la page précédente).
- Tests : 7 tests (moteur et pages) ; 13 erreurs réintroduites, 12 détectées et 1 équivalente (code retiré) ;
  parcours navigateur des 5 pages sur ordinateur, tablette et mobile, audit d'accessibilité sans erreur.
