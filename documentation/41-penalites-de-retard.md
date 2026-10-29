# 41. Pénalités de retard : taux officiels de chaque semestre (France)

Prochaine action de [05](05-feuille-de-route.md) (« préremplir le taux légal et le taux de la BCE du semestre dans le
calculateur de pénalités de retard »). Spécification avant le code, 29/10/2026. Le calculateur existe depuis l'étape E0
([page](../content/fr/penalites-de-retard.html)) ; il demandait de saisir soi-même le taux de l'intérêt légal ou le
taux de la BCE. Les règles du semestre étant désormais sourcées (CGV, [40](40-cgv.md)), il les applique seul.

## 1. Besoin

Un indépendant dont le client professionnel paie en retard veut savoir **combien réclamer** : pénalités et indemnité
de 40 €. Il ne connaît en général ni le taux de l'intérêt légal du semestre ni le taux de refinancement de la BCE au
1er janvier ou au 1er juillet ; les chercher est fastidieux et source d'erreurs (taux « particuliers » au lieu du taux
« autres cas », taux de la BCE du jour au lieu de celui du 1er juillet). Le calculateur doit donner le bon montant sans
recherche, pour une facture récente comme pour une facture ancienne, et montrer son calcul.

**Hors champ** : clients particuliers (intérêts au taux légal après mise en demeure, autre régime, déjà signalé dans la
FAQ) ; intérêts judiciaires (taux majoré après un jugement) ; indemnisation complémentaire sur justificatifs.

## 2. Règles

Lues **en entier** le 29/10/2026 avec l'outil « Lire une source officielle » ; règles dans `data/rules/fr.json`.

| Règle | Source | Usage |
|---|---|---|
| Pénalités dues de plein droit dès le lendemain de la date de règlement ; taux des CGV, **au moins 3 fois le taux de l'intérêt légal** ; à défaut, taux de refinancement de la BCE **majoré de 10 points** ; taux BCE en vigueur au **1er janvier** pour le 1er semestre et au **1er juillet** pour le 2nd ; montant TTC × taux annuel × jours de retard ÷ 365 | F23211 (vérifiée le 07/08/2026) ; `penalites_retard_regle` | Formule, premier jour de retard, trois façons de fixer le taux |
| Taux de l'intérêt légal de chaque semestre (créancier professionnel : colonne « autres cas »), **du 1er semestre 2015 au 2nd semestre 2026** ; calcul « au taux d'intérêt légal applicable sur la période », 365 jours même les années bissextiles | F783 (vérifiée le 01/07/2026) ; `taux_interet_legal` (complétée : tout le tableau officiel) | Taux « 3 fois le taux légal » de chaque semestre ; minimum légal contrôlé |
| Taux des opérations principales de refinancement de la BCE par date d'effet ; taux retenu au 1er janvier et au 1er juillet de 2015 à 2026 (2,15 % et 2,40 % en 2026, recoupés avec F23211) | BCE, « Official interest rates » ; F23211 ; `taux_bce_refinancement` (nouvelle : une table par semestre, remplace les deux règles de 2026) | Taux « BCE + 10 points » de chaque semestre |
| Indemnité forfaitaire de 40 € par facture payée en retard, entre professionnels | F23211 ; `indemnite_forfaitaire_recouvrement` | Montant lu dans les règles (n'est plus écrit dans le script) |

**Retard sur plusieurs semestres.** L'article L441-10 dit que « le taux applicable *pendant* le premier semestre de
l'année concernée est le taux en vigueur au 1er janvier », et la fiche F783 calcule l'intérêt légal « au taux applicable
sur la période ». Le calculateur découpe donc le retard par semestre, chacun à son taux, et l'écrit (« 12,15 % puis
12,40 % »). Une autre lecture (un seul taux pour tout le retard : celui du semestre où il commence) est possible :
point **signalé** dans les questions ouvertes de `data/rules/fr.json`, à faire confirmer par l'avocat lors de
la relecture des modèles (décision D40). L'écart est faible (quelques centimes à quelques euros) et le détail affiché
permet à chacun de vérifier.

## 3. Outil

- **Choix du taux**, dans cet ordre : « Trois fois le taux d'intérêt légal » (par défaut : c'est la mention que nos
  factures, l'Espace et les relances écrivent par défaut), « Taux de la BCE + 10 points » (si rien n'est prévu),
  « Un autre taux prévu dans mes conditions ». Un choix enregistré sur l'appareil est conservé.
- **Taux officiels automatiques** : pour les deux premiers choix, le champ du taux est **facultatif** ; vide, l'outil
  applique le taux officiel de chaque semestre du retard, écrit sous le champ (« Taux officiel : 2,75 % au second
  semestre 2026 ») ; un taux saisi remplace le taux officiel sur tout le retard (pour un semestre pas encore dans les
  règles, par exemple).
- **Semestre absent des règles** (avant 2015, ou 2027 avant la mise à jour) : le total n'affiche que l'indemnité et
  le message demande de saisir le taux du semestre nommé.
- **Taux des conditions inférieur au minimum légal** du semestre : avertissement (« inférieur au minimum légal :
  8,25 % au second semestre 2026 »), le calcul garde le taux saisi.
- **Résultats** : total à réclamer, jours de retard, taux appliqué (« 12,15 % puis 12,40 % » si le taux change),
  pénalités, indemnité ; formule détaillée, **une ligne par semestre** quand le taux change en cours de retard (total
  égal à la somme des lignes arrondies au centime) ; un seul calcul quand le taux ne change pas.
- **Accessibilité** : le résultat principal est annoncé (`role="status"`) ; l'aide sous chaque champ de taux lui est
  reliée (`aria-describedby`) ; un taux illisible marque le champ (`aria-invalid`).
- **Moteur** `engines/retard-fr.js` (OFE.retardFR) : semestres, taux du semestre, découpage du retard, calcul ; aussi
  utilisé par le générateur de CGV (une seule source pour les taux du semestre).

## 4. Tests

- Unitaires (`tests/unit/retard-fr.test.mjs`) : semestres et libellés ; taux de 2026 = chiffres des fiches (8,25 %,
  12,15 %, 12,40 %) ; tables complètes et cohérentes (24 semestres consécutifs, taux « autres cas » inférieurs aux taux
  « particuliers ») ; découpage (même jour, un jour, fin de semestre, 30 juin → 1er juillet, plusieurs années, années
  bissextiles) ; calcul : exemple de F783 refait, retard sur deux semestres, taux saisi, taux manquant, taux illisible,
  taux sous le minimum, montant vide, indemnité lue dans les règles ; page : scripts, sources et chiffres de la FAQ =
  règles.
- De bout en bout (`tests/e2e/verifier.mjs`) : choix par défaut et taux officiel affiché, retard à cheval sur deux
  semestres (deux lignes, deux taux), taux saisi, semestre inconnu, taux des conditions sous le minimum ; captures sur
  ordinateur, tablette et mobile, audit d'accessibilité.

## 5. Réalisation (29/10/2026)

- Sources : tableau complet de la fiche F783 (relu dans le texte lu en entier le 29/10/2026) ; page « Official interest
  rates » de la BCE lue en entier avec l'outil « Lire une source officielle » (la page des taux directeurs de la Banque
  de France refuse les lectures automatiques : réponse 403) ; taux de 2026 identiques à ceux de la fiche F23211.
- Règles : `taux_interet_legal` complétée (24 semestres), `taux_bce_refinancement` (nouvelle, 24 semestres) remplace
  `taux_bce_refinancement_2026_01_01` et `taux_bce_refinancement_2026_07_01` ; une question ouverte ajoutée (retard sur
  plusieurs semestres), reprise dans « En attente d'Ismail » pour l'avocat.
- Code : moteur `engines/retard-fr.js` (semestres, taux, découpage, calcul ; utilisé aussi par `engines/cgv-fr.js`),
  script `tools/penalites.js` réécrit, page `content/fr/penalites-de-retard.html` (choix du taux, aides reliées aux
  champs, résultat annoncé, avertissement, explication « Un taux par semestre », FAQ, sources officielles).
- Relecture : accord « le taux officiel » / « les taux officiels » ; libellés raccourcis pour le mobile (option tronquée
  à 390 px) ; lignes du calcul séparées ; un seul calcul quand le taux ne change pas (1 800 € à 6 % sur 1 338 jours :
  395,90 €, et non 395,89 € par la somme de huit lignes) ; nombres de jours groupés (« 1 338 ») ; textes courts au-delà
  de trois semestres.
- Tests : 14 tests unitaires ; 37 erreurs réintroduites dans le moteur, 33 détectées au premier passage, les 4 autres
  après ajout de tests (taux réservé vide, taux illisible prioritaire, minimum réservé au taux des conditions, montant
  illisible sans retard) ; parcours navigateur (taux par défaut, deux semestres, taux saisi, semestre inconnu, minimum,
  taux illisible) sur ordinateur, tablette et mobile, audit d'accessibilité sans erreur.
