# 54. Thème visuel : propositions et décision (« Bento », 18/11/2026)

Demande d'Ismail du 11/11/2026 : « le design est vraiment très classique : utiliser un autre thème, me proposer pour
décider ». Le thème d'alors (« le cachet », [32](32-design.md) : papier, encre, vermillon) est resté en place jusqu'à
sa décision (§ 3). Trois propositions ont été appliquées aux **vraies pages** du site (accueil, simulateur, Espace avec une année
de données d'exemple, trésorerie, ordinateur et mobile) et présentées côte à côte sur une page de comparaison privée
transmise à Ismail le 11/11/2026.

## 1. Les trois propositions

| | A « Minuit » | B « Bento » | C « Pop » |
|---|---|---|---|
| Idée | Sombre et technique, comme une application de finance | Clair et aérien, cartes très arrondies sans bordure | Audacieux (néo-brutalisme) : traits noirs épais, ombres pleines |
| Fond, cartes | `#0a0c10`, `#12161d` | `#eef1f6`, blanc | `#fff5d9`, blanc |
| Accent | Citron `#c8f53c` (texte foncé dessus), violet `#7c6cff` pour le chiffre clé | Cobalt `#2a55f5` | Orange `#ff5a1f` (texte noir), jaune `#ffd23f`, ciel, menthe |
| Titres, texte | Space Grotesk, Inter ; montants en JetBrains Mono | Manrope, Inter | Archivo (large et très gras), Inter |
| Formes | Rayons 16 px, liseré clair | Rayons 24 px, boutons en pilule | Rayons 14 px, bordures de 2 px, ombre décalée de 4 px |
| Pour | Le plus « produit tech » ; graphiques très lisibles | Le plus lisible et rassurant pour l'argent et les papiers | Le plus mémorable ; se distingue des concurrents |
| Contre | Moins confortable en plein jour ; factures et PDF restent blancs | Moins de caractère ; bleu répandu | Peut sembler moins sérieux ; à doser sur les pages denses |

**Recommandation de Claude** : B en thème principal, A comme **mode sombre automatique** (réglage de l'appareil).
Commun aux trois : menu de l'Espace en icônes au trait (fin des emoji), en-tête de l'Espace réduit pour que
l'application apparaisse tout de suite.

Feuilles de style des maquettes : `design/propositions/` (`commun.css` et une feuille par thème, injectées par-dessus
`style.css` pour les captures ; pas servies par le site).

## 2. Réalisation après la décision (faite le 18/11/2026, § 3)

1. Jetons du thème retenu dans `:root` (et, pour un mode sombre, sous `prefers-color-scheme: dark` et
   `[data-theme="dark"]`) ; composants qui codent une couleur en dur (`#fff`, `rgba(247,245,240,…)`, une vingtaine de
   règles) passés sur les jetons.
2. Polices servies par le site (licence OFL, `scripts/polices_site.py`), sans service tiers.
3. Icônes Lucide dans le menu de l'Espace ; en-tête de l'Espace compact.
4. Contrastes AA vérifiés par axe-core sur toutes les pages (parcours navigateur), captures relues sur ordinateur,
   tablette et mobile ; mise à jour de [32](32-design.md) (jetons et contrastes calculés). L'en-tête translucide doit
   garder 4,5:1 **quel que soit le contenu qui défile dessous** (D70) : `tests/unit/contraste-entete.test.mjs` le
   vérifie pour le thème clair ; l'étendre aux jetons du mode sombre s'il est retenu (le test ne lit que les règles
   hors `@media`).
5. Les graphiques de l'Espace ([39](39-tresorerie.md), § 7.4) prennent déjà leurs couleurs des jetons : rien à changer.

## 3. Décision d'Ismail (18/11/2026) : « Bento »

Ismail a répondu « bento » : la proposition B devient le thème du site. Le **mode sombre** (« Minuit » en réglage de
l'appareil) faisait partie de la recommandation, mais Ismail ne l'a pas retenu explicitement : le site reste en thème
clair seul ; la question lui est posée (feuille de route, actions en attente).

### 3.1 Jetons et contrastes calculés (WCAG 2.1)

| Jeton | Valeur | Usage | Contraste |
|---|---|---|---|
| `--bg` | `#eef1f6` | Fond gris bleuté | — |
| `--card` | `#ffffff` | Cartes, champs | — |
| `--tint` | `#f4f6fb` | Fonds discrets (onglets, survol) | — |
| `--ink` | `#0b1324` | Texte, blocs sombres | 18,54:1 sur blanc, 16,37:1 sur `--bg` |
| `--ink-2` | `#1d2939` | Texte secondaire fort | 14,70:1 sur blanc, 12,98:1 sur `--bg` |
| `--muted` | `#475467` | Texte d'accompagnement | 7,69:1 sur blanc, 6,79:1 sur `--bg` |
| `--faint` | `#586274` | Libellés discrets | 6,15:1 sur blanc, 5,43:1 sur `--bg` |
| `--line`, `--line-2` | `#e4e8f0`, `#d3d9e4` | Filets | — |
| `--field` | `#7c8699` | Bordure des champs | 3,67:1 sur blanc, 3,24:1 sur `--bg` (au moins 3:1, critère 1.4.11) |
| `--brand` | `#2a55f5` | Accent cobalt : bouton principal, sélection, focus | 5,65:1 avec le blanc, 4,99:1 sur `--bg` |
| `--brand-2` | `#1c3fd1` | Liens, survol, logo | 7,83:1 sur blanc, 6,92:1 sur `--bg` |
| `--brand-soft`, `--brand-ink` | `#e9eeff`, `#1a3bc2` | Fond d'accent et son texte | 7,41:1 |
| `--ok`, `--ok-soft` | `#067d55`, `#dcf7ec` | Succès | 5,16:1 sur blanc, 4,56:1 sur son fond |
| `--warn`, `--warn-soft` | `#a15c00`, `#fff1d6` | Avertissement | 5,19:1 sur blanc, 4,65:1 sur son fond |
| `--danger`, `--danger-soft` | `#c4222b`, `#ffe4e4` | Erreur, montant négatif | 5,82:1 sur blanc, 4,84:1 sur son fond |
| `--gold` | `#f5a524` | Barres « proche du seuil » (toujours doublées d'un texte) | — |

Rayons 24 px (cartes) et 16 px (petits éléments), boutons en pilule, champs à 14 px ; ombres douces sans bordure.

### 3.2 Écarts volontaires par rapport à la maquette

1. **Bordure des champs** : la maquette utilisait `#b9c2d0` (1,8:1 sur blanc, sous le minimum de 3:1 du critère
   1.4.11 pour repérer un champ) ; le site garde `--field` à 3,67:1.
2. **En-tête translucide** : la maquette (fond à 80 %, logo en `--brand`) descendait à 3,13:1 dans le pire cas (D70) ;
   le site met le fond à 88 % et le logo en `--brand-2` : 5,28:1 au pire, vérifié par `tests/unit/contraste-entete.test.mjs`.
3. **Libellés des indicateurs** de l'Espace en minuscules (la maquette les mettait en capitales) : certains sont longs
   (« Déclaration Urssaf : 3e trimestre 2026 ») et un texte long en capitales se lit moins bien.
4. Règles intégrées à `style.css` (la maquette les injectait par-dessus avec `!important`).

### 3.3 Polices

**Manrope** (titres, chiffres clés ; graisses 500 à 800) et **Inter** (texte ; graisses 300 à 900, taille optique 14 à
32, droit et italique), servies par le site en WOFF2 (licence OFL, `scripts/polices_site.py`, sources du dépôt
google/fonts). Manrope n'a pas l'espace fine insécable de la typographie française, ni « ↔ » et quelques lettres rares
du latin étendu : le navigateur les prend dans Inter, police suivante de la pile (même rendu, aucun carré vide).

### 3.4 Composants

Cartes sans bordure (ombre douce) ; boutons en pilule ; champs arrondis ; recherche de l'accueil en pilule ; indicateurs
de l'Espace (valeur en Manrope très gras) ; résultat principal des simulateurs sur bleu nuit avec
filet cobalt ; **menu de l'Espace en icônes Lucide** (tableau de bord, documents, cible, clients, chronomètre, livre,
reçu, portefeuille, calendrier, réglages) au lieu des emoji ; **en-tête de l'Espace compact** (titre plus petit, sans
pastille) pour que l'application apparaisse tout de suite ; **plus aucun emoji en guise d'icône** : les sept outils qui en
avaient encore un (jours ouvrés, devises, conditions générales, arrêt maladie, signature, sous-traitance, ATI) ont
une icône Lucide. Logo et icône d'onglet en cobalt, images de partage (Open Graph) refaites aux couleurs du thème.
Indicateurs par quatre (Espace, ordinateur) : valeur à 1,6 rem pour qu'un montant à six chiffres tienne sur une ligne.
Petits téléphones : sous 420 px, le bouton du menu ne montre que son icône (son nom reste lu par les lecteurs d'écran)
et sous 360 px le logo ne montre que son dessin (nom porté par `aria-label`) ; l'en-tête débordait de 2 px à 390 px
et de 30 px à 360 px (déjà avec l'ancien thème).

### 3.5 Ce qui ne change pas

Le contenu et le comportement des outils ; les aperçus des documents générés (factures, contrats : leurs propres
couleurs, comme le PDF) ; le PDF Factur-X ; l'accessibilité AA vérifiée par axe-core sur toutes les pages.
