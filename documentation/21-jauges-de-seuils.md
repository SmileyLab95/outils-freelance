# 21. Jauges de seuils hors de France

Besoin P2 de [02](02-besoins-clients.md) (§ 7, « Les seuils à surveiller ») : « Jauges (TVA, plafonds) intégrées aux
simulateurs », aux États-Unis, au Royaume-Uni et au Canada (la France les a dans le simulateur auto-entrepreneur).
Spécification du 22/10/2026, avant le code.

## 1. Principe

- **Où** : dans le calculateur d'impôt de chaque section (`/uk/self-employed-tax-calculator/`,
  `/us/self-employment-tax-calculator/`, `/ca/self-employed-tax-calculator/`, `/ca/fr/calculateur-impot-travailleur-autonome/`),
  sous le résultat, dans la même carte « jauges » que le simulateur français.
- **Une jauge** = un libellé, « 85 % of £90,000 » (pourcentage du seuil atteint), une barre (orange à partir de
  85 %, rouge au-delà de 100 %), et un message sur la conséquence quand le seuil approche ou est dépassé. Montants
  des seuils lus dans les règles, aucun chiffre écrit dans le script.
- **Bonne mesure** : les seuils de TVA et de taxe de vente portent sur le **chiffre d'affaires** (avant dépenses),
  pas sur le bénéfice que demandent ces calculateurs. Un champ facultatif « chiffre d'affaires » est donc ajouté au
  Royaume-Uni et au Canada ; sans lui, les jauges de chiffre d'affaires restent vides avec une invitation à le
  saisir. Aux États-Unis, les jauges portent sur des seuils de revenu, mesurés sur les données déjà saisies.
- **Fonction commune** `OF.gauge(id, valeur, seuil)` dans `app.js` (barre, couleur, texte dans la langue de la
  page), reprise par le simulateur français pour n'avoir qu'une seule mise en forme.

## 2. Jauges par pays

| Pays | Jauge | Mesure | Seuil (règle) | Message |
|---|---|---|---|---|
| Royaume-Uni | *VAT registration* | chiffre d'affaires saisi | `vat_registration_threshold` (90 000 £) | au-delà : inscription obligatoire si dépassé sur 12 mois glissants (ou attendu dans les 30 prochains jours) ; à l'approche : surveiller les 12 derniers mois |
| Royaume-Uni | *Making Tax Digital for Income Tax* | chiffre d'affaires saisi | `mtd_itsa_threshold_2026` (50 000 £) | au-delà : registres numériques et déclarations trimestrielles, d'après une déclaration antérieure, revenus fonciers compris ; puis 30 000 £ en 2027 et 20 000 £ en 2028 (`mtd_itsa_threshold_2027`, `_2028`) |
| Royaume-Uni | (message) | chiffre d'affaires ≤ 1 000 £ | `trading_allowance` | pas besoin de le déclarer à HMRC, sauf inscription à la Self Assessment pour une autre raison |
| Canada | Petit fournisseur (TPS/TVH, TVQ) | revenus bruts saisis | `small_supplier_threshold` (30 000 $) | au-delà : inscription obligatoire (un trimestre civil ou quatre trimestres consécutifs) |
| Canada | Acomptes provisionnels | impôt net calculé (fédéral au Québec) | `instalment_threshold` (3 000 $), `instalment_threshold_quebec` (1 800 $) | au-delà : acomptes si c'était aussi le cas l'une des deux années précédentes (texte déjà affiché par le calculateur) |
| États-Unis | *Estimated tax* | impôt fédéral après retenue à la source | `estimated_tax_threshold` (1 000 $) | au-delà : acomptes trimestriels (texte déjà affiché) |
| États-Unis | *Social Security wage base* | revenus nets d'indépendant (92,35 % du bénéfice) + salaires | `social_security_wage_base_2026` (184 500 $) | au-delà : plus de cotisation Social Security sur le surplus (Medicare continue) |
| États-Unis | *Additional Medicare Tax* | mêmes revenus | `additional_medicare_tax_thresholds` (selon la situation) | au-delà : 0,9 % de plus sur le surplus |
| États-Unis | Déduction QBI | revenu imposable avant QBI | `qbi_threshold_2026` (selon la situation) | au-delà : limites progressives, et pour un *specified service trade or business* la déduction diminue puis disparaît (`qbi_phase_in_range_2026`) |

## 3. Critères de « terminé »

- Tests unitaires de `OF.gauge` indirects (parcours navigateur) ; tests de cohérence : chaque seuil cité dans une
  page ou un message est lu dans les règles (aucun montant écrit dans les scripts) ; pages sans JavaScript : jauges
  à « – ».
- Parcours navigateur des quatre pages : jauge vide sans chiffre d'affaires, proche, dépassée, messages ;
  accessibilité ; captures relues ; simulateur français inchangé (parcours existant).

## 4. Réalisation (22/10/2026)

- **Royaume-Uni** : champ « *Income before expenses (optional)* » ; jauges TVA et *Making Tax Digital* (palier
  d'avril 2026) ; messages selon le palier atteint (2026, 2027 ou 2028) et sous la *trading allowance*.
- **Canada** (anglais et français) : champ « *Sales before expenses* » / « Ventes avant dépenses » (ventes taxables
  de l'année, exportations comprises : règle `small_supplier_includes_zero_rated`) ; au Québec, libellés « TPS/TVH et
  TVQ » et jauge des acomptes sur le plus élevé des deux impôts (fédéral, Québec), chacun comparé à 1 800 $ ;
  mesure fournie par le moteur (`instalments().measure`, testée : elle franchit le seuil exactement quand les acomptes
  deviennent obligatoires).
- **États-Unis** : quatre jauges sur les données saisies ; revenu imposable avant QBI fourni par le moteur
  (`taxableBeforeQbi`) ; message QBI différent pour une activité de service (*SSTB* : la déduction disparaît à la fin
  de la zone de transition) et pour une autre activité sans salariés ni biens (minimum de 400 $,
  `qbi_minimum_deduction`).
- **Affichage commun** (décision D23) : pourcentage jamais arrondi à « 100 % » de part et d'autre du seuil (99 % ou
  101 %) ; message rouge si un seuil est dépassé, neutre à l'approche (85 %, `OF.gaugeNear`), vert sinon.
- **Tests** : `tests/unit/jauges.test.mjs` (aucun nombre écrit dans les fonctions des jauges ni dans les messages du
  Canada, sauf les années et délais lus dans le texte des règles britanniques ; règles citées dans les sources de
  chaque page ; jauges à « – » sans JavaScript) ; parcours navigateur des cinq pages, simulateur français compris ;
  chaque contrôle vérifié en réintroduisant l'erreur qu'il doit détecter (14 erreurs, toutes détectées). Défaut
  trouvé par ces tests et corrigé avant publication : deux règles des messages américains (taux Medicare et
  *Additional Medicare Tax*) manquaient dans les sources de la page.
