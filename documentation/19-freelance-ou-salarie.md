# 19. Freelance ou salarié ?

Besoin P2 de [02](02-besoins-clients.md) (§ 1, « Freelance ou salarié ? ») : « Comparateur salaire ↔ chiffre
d'affaires », dans les quatre pays. Spécification du 22/10/2026, avant le code (charte qualité,
[04](04-methode-de-travail.md)).

## 1. Question et réponse

**Question** : « Je gagne (ou on me propose) tel salaire : quel chiffre d'affaires me faudrait-il en freelance pour
garder le même revenu, et à quel tarif journalier ou horaire cela correspond-il ? Et mon tarif actuel vaut-il ce
salaire ? »

**Réponse** : le revenu disponible du salarié (salaire brut moins cotisations salariales et impôt sur le revenu,
plus les avantages payés par l'employeur que l'utilisateur veut compter) ; le chiffre d'affaires dont le freelance a
besoin pour garder le même revenu disponible, après ses cotisations, son impôt et ses frais ; le tarif équivalent sur
les jours (ou heures) facturés ; si un tarif est saisi, le revenu disponible qu'il donne et l'écart avec le salaire.

Ce qui n'est pas compté, et que la page dit : la protection sociale n'est pas la même (chômage, retraite,
prévoyance) ; seuls des montants sont comparés.

## 2. Pages

Identifiant `employee-vs-freelance`, dans le menu après le comparateur de statuts (« Statut et revenus » en France,
« Taxes » ou « Impôts et taxes » ailleurs) :

| Section | Adresse | Statut du freelance comparé |
|---|---|---|
| France | `/fr/salarie-ou-freelance/` | Micro-entrepreneur (activité au choix : libérale BNC par défaut, services BIC, vente) |
| États-Unis | `/us/salary-vs-freelance/` | *Sole proprietor* (Schedule C) |
| Royaume-Uni | `/uk/salary-vs-freelance/` | *Sole trader* |
| Canada | `/ca/salary-vs-freelance/` et `/ca/fr/salarie-ou-travailleur-autonome/` | Travailleur autonome (entreprise individuelle) ; Ontario par défaut en anglais, Québec en français |

## 3. Saisie et valeurs par défaut

Valeurs par défaut présentées comme des exemples modifiables ; jours ou heures facturés repris du convertisseur de
tarifs de la même section (vérifié par test, comme pour [18](18-outils-de-prix.md)).

- **Salaire brut annuel** (exemple : 40 000 € en France, 70 000 $ aux États-Unis, 40 000 £ au Royaume-Uni, 70 000 $
  au Canada).
- **Avantages payés par l'employeur** (facultatif, par an) : ce que l'employeur paie en plus du salaire et que le
  freelance devra payer lui-même (part employeur de la mutuelle, titres-restaurant, *health insurance*, *401(k)
  match*, *employer pension contributions*, assurance collective…). Montant saisi par l'utilisateur : aucun chiffre
  par défaut, aucun montant inventé.
- **Frais professionnels du freelance** (par an : logiciels, matériel, assurance, comptabilité…), 0 par défaut.
- **Jours facturés par an** (France et Royaume-Uni, tarif journalier) ou **heures facturées** (États-Unis et Canada,
  tarif horaire) : 148 jours, 182 jours, 161 × 8 heures, 161 ou 162 × 8 heures (valeurs du convertisseur).
- **Votre tarif en freelance** (facultatif) : pour comparer directement.
- Par pays : activité micro et versement libératoire (France) ; situation familiale (*filing status*, États-Unis) ;
  Écosse ou reste du Royaume-Uni ; province ou territoire (Canada).

## 4. Calcul

Fonctions pures, dans les moteurs de chaque pays (déjà testés pour les travailleurs indépendants), plus un moteur
commun `engines/employee-freelance.js` qui cherche le chiffre d'affaires nécessaire (`brackets.solve`, recherche
par dichotomie du plus petit chiffre d'affaires dont le revenu disponible atteint la cible, au centime).

**Cible** = revenu disponible du salarié + avantages de l'employeur. **Chiffre d'affaires nécessaire** = le plus
petit chiffre d'affaires dont le revenu disponible du freelance (chiffre d'affaires − frais − cotisations − impôt)
atteint la cible. **Tarif équivalent** = chiffre d'affaires nécessaire ÷ jours (ou heures) facturés.

### 4.1 France (salarié du secteur privé, régime général, hors Alsace-Moselle)

Cotisations salariales 2026 (règles `salarie_cotisations_2026` et `agirc_arrco_2026`) :

| Cotisation (part salariale) | Taux | Assiette | Source |
|---|---|---|---|
| Assurance vieillesse plafonnée | 6,90 % | dans la limite du PASS (48 060 €) | Urssaf, taux secteur privé |
| Assurance vieillesse déplafonnée | 0,40 % | totalité du salaire | Urssaf |
| Maladie, assurance chômage | 0 % | — | Urssaf (part salariale nulle hors Alsace-Moselle) |
| Retraite complémentaire Agirc-Arrco, tranche 1 | 3,15 % + CEG 0,86 % | jusqu'au PASS | Agirc-Arrco, cotisations 2026 |
| Retraite complémentaire, tranche 2 | 8,64 % + CEG 1,08 % | du PASS à 8 PASS | Agirc-Arrco |
| CET | 0,14 % | tranches 1 et 2, si le salaire dépasse le PASS | Agirc-Arrco |
| CSG | 9,20 %, dont 6,80 % déductible | 98,25 % du brut jusqu'à 4 PASS, 100 % au-delà | Urssaf ; CGI, art. 154 quinquies |
| CRDS | 0,50 % (non déductible) | même assiette que la CSG | Urssaf |

Non comptés (la page le dit) : la part salariale de la complémentaire santé et de la prévoyance (propres à chaque
entreprise), les contributions des cadres à l'Apec, le régime local d'Alsace-Moselle.

Salaire net avant impôt = brut − toutes les cotisations ci-dessus. Salaire net imposable = net avant impôt + CSG non
déductible + CRDS. Revenu imposable = net imposable − déduction forfaitaire de 10 % pour frais professionnels (au
moins 509 €, au plus 14 555 € pour les revenus de 2025 : règle `ir_deduction_frais_salaires`).

Micro-entrepreneur : cotisations, CFP et abattement des règles existantes (`micro_activities`), impôt sur le
chiffre d'affaires après abattement (au moins 305 €), ou versement libératoire si la case est cochée.

Impôt sur le revenu, des deux côtés : barème des revenus de 2025 pour une part (personne seule, sans autre revenu),
**décote comprise** (`ir_decote`) ; pas de réductions ni de crédits d'impôt. La micro-entreprise ne peut pas
dépasser son plafond de chiffre d'affaires : au-delà, la page renvoie au comparateur de statuts.

### 4.2 États-Unis (impôts fédéraux)

Salarié (*W-2 employee*) : cotisations FICA salariales (Social Security 6,2 % jusqu'au plafond de 2026, Medicare
1,45 %, `fica_rates_2026`), *Additional Medicare Tax* au-delà du seuil, impôt fédéral après la déduction standard.
Freelance : moteur `taxUS.estimate` (SE tax, déduction de la moitié, QBI). Impôt de l'État non compté des deux côtés
(la page le dit). Avantages : assurance santé et *401(k) match* à saisir par l'utilisateur.

### 4.3 Royaume-Uni (2026/27)

Salarié : *Class 1 employee NIC* (8 % entre le *primary threshold* et l'*upper earnings limit*, 2 % au-delà, règles
`class1_*`) et impôt sur le revenu (Écosse ou reste du pays). Freelance : moteur `taxUK.soleTrader` (*Class 4*,
même impôt). Avantages : *employer pension contributions* à saisir (le minimum légal de l'*auto-enrolment* est
rappelé dans la page s'il est sourcé dans les règles).

### 4.4 Canada (2026)

Salarié : `taxCA.personal` avec `salary` (RPC ou RRQ et RQAP salariés, montant canadien pour emploi), plus les
cotisations d'assurance-emploi salariées (1,63 %, 1,30 % au Québec, jusqu'au maximum de la rémunération assurable de
68 900 $ : règle `ei_rate_employee`) et leur crédit d'impôt non remboursable (fédéral, et provincial hors Québec si
la règle est confirmée). Freelance : `taxCA.estimate` (RPC ou RRQ des deux parts, RQAP). Province ou territoire au
choix ; Saskatchewan et Nunavut calculables (pas de dividendes en jeu).

## 5. Résultat

- En tête : chiffre d'affaires annuel nécessaire et tarif équivalent (« soit … € par jour sur 148 jours
  facturés »), avec le revenu disponible visé.
- Tableau à deux colonnes (salarié, freelance) : revenu brut ou chiffre d'affaires, cotisations, impôt sur le
  revenu, frais professionnels, avantages de l'employeur, revenu disponible.
- Si un tarif est saisi : revenu disponible à ce tarif et écart avec le salaire.
- Messages : plafond de la micro-entreprise dépassé ; chiffre d'affaires nécessaire au-delà d'un seuil de TVA ou de
  taxe de vente (lu dans les règles, comme le convertisseur) ; protection sociale non comparée.
- Saisie illisible : aucun résultat, champ signalé (même convention que les autres outils).

## 6. Critères de « terminé »

- Tests unitaires : cotisations salariales et net imposable calculés à la main (sous et au-dessus du PASS, au-delà
  de 4 PASS), déduction de 10 % (minimum et maximum), décote, chiffre d'affaires nécessaire (le revenu disponible
  obtenu égale la cible au centime, et un centime de moins ne suffit pas), tarif équivalent, plafond micro ; mêmes
  contrôles dans les trois autres pays ; contrôle par mutation de chaque nouveau test.
- Textes et taux lus dans les règles, sources citées ; FAQ recalculées à partir des valeurs par défaut (test).
- Parcours navigateur des cinq pages, accessibilité, captures relues (ordinateur, tablette, mobile), revue critique.

## 7. Ordre de réalisation

1. France (règles nouvelles : cotisations salariales, Agirc-Arrco, déduction de 10 %).
2. États-Unis et Royaume-Uni (moteurs existants, fonctions « salarié » à extraire).
3. Canada (assurance-emploi des salariés et son crédit à ajouter au moteur, avec les sources).

Chaque pays est publié dès que ses pages passent tous les tests.

## 8. Avancement

- **France, fait le 22/10/2026** : règles `salarie_cotisations_2026`, `agirc_arrco_2026` et
  `ir_deduction_frais_salaires` (sources Urssaf, Agirc-Arrco, Légifrance, impots.gouv.fr), décote confirmée par le
  BOFiP ; moteur `engines/employee-freelance.js` (13 erreurs réintroduites, toutes détectées par les tests) ; script
  commun `tools/employee-freelance.js` ; page `/fr/salarie-ou-freelance/`. Exemple : 40 000 € brut laissent
  29 697,21 € ; en micro-entreprise libérale sans frais, il faut 42 332,70 € de chiffre d'affaires (286,03 € par jour
  sur 148 jours facturés).
- **Point relevé** : le comparateur de statuts calcule l'impôt sans la décote, alors que ce nouvel outil l'applique ;
  à corriger pour que les deux outils donnent le même impôt (prochaine action).
- **États-Unis, Royaume-Uni et Canada, faits le 22/10/2026** : fonctions `employeeUS`, `freelanceUS`, `employeeUK`,
  `freelanceUK`, `employeeCA`, `freelanceCA` ; *Class 1* du salarié extraite dans `taxUK.class1Employee` ;
  assurance-emploi du salarié ajoutée à `taxCA.personal` (option `insurable`, règle `ei_rate_employee` : 1,63 %,
  1,30 % au Québec, crédit fédéral ligne 31200 et provincial ligne 58300 hors Québec, cotisations remboursées
  jusqu'à 2 000 $) ; minimum légal de l'employeur à la retraite d'entreprise au Royaume-Uni affiché (règle
  `auto_enrolment_2026_27` : 3 % des gains entre 6 240 £ et 50 270 £, au-delà de 10 000 £), à ajouter aux avantages.
  Exemples par défaut : 70 000 $ aux États-Unis → 73 141,49 $ (56,79 $ de l'heure) ; 40 000 £ → 39 258,65 £
  (215,71 £ par jour) ; 70 000 $ en Ontario → 73 392,13 $ ; au Québec → 74 097,07 $. Valeurs recalculées à la main
  (calcul décimal indépendant pour les États-Unis et le Royaume-Uni ; écart de crédit d'assurance-emploi vérifié au
  Canada) ; 22 erreurs réintroduites dans les moteurs, toutes détectées.
- **Limites dites dans les pages** : impôt de l'État non compté (États-Unis), remboursement des prêts étudiants non
  compté (Royaume-Uni), protection sociale non chiffrée (quatre pays).

