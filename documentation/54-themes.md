# 54. Propositions de thème visuel (décision d'Ismail en attente)

Demande d'Ismail du 11/11/2026 : « le design est vraiment très classique : utiliser un autre thème, me proposer pour
décider ». Le thème actuel (« le cachet », [32](32-design.md) : papier, encre, vermillon) reste en place jusqu'à sa
décision. Trois propositions ont été appliquées aux **vraies pages** du site (accueil, simulateur, Espace avec une année
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

## 2. Réalisation après la décision

1. Jetons du thème retenu dans `:root` (et, pour un mode sombre, sous `prefers-color-scheme: dark` et
   `[data-theme="dark"]`) ; composants qui codent une couleur en dur (`#fff`, `rgba(247,245,240,…)`, une vingtaine de
   règles) passés sur les jetons.
2. Polices servies par le site (licence OFL, `scripts/polices_site.py`), sans service tiers.
3. Icônes Lucide dans le menu de l'Espace ; en-tête de l'Espace compact.
4. Contrastes AA vérifiés par axe-core sur toutes les pages (parcours navigateur), captures relues sur ordinateur,
   tablette et mobile ; mise à jour de [32](32-design.md) (jetons et contrastes calculés).
5. Les graphiques de l'Espace ([39](39-tresorerie.md), § 7.4) prennent déjà leurs couleurs des jetons : rien à changer.
