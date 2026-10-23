# 32. Système de design et refonte (« très clair, très simple, très moderne »)

Demande d'Ismail du 23/10/2026 ([31](31-vision-plateforme.md)). Spécification avant le code : critique du site
actuel, direction, jetons, composants, navigation, recherche, accueil, et ce qui ne change pas.

## 1. Critique du site actuel (captures du 23/10/2026)

| Constat | Gravité | Réponse |
|---|---|---|
| L'accueil promet seulement « être payé » : la plateforme couvre bien plus (démarrer, prix, contrats, impôts) | 🔴 | Promesse « tout pour travailler à son compte » et parcours par étapes |
| Plus de 30 outils par pays, aucune recherche | 🔴 | Recherche instantanée (bouton dans l'en-tête, touche `/`, Ctrl ou ⌘ + K) |
| Catégories déséquilibrées : « Statut et revenus » regroupe 16 outils | 🟡 | Cinq étapes de la vie du freelance, de 2 à 10 outils chacune |
| Icônes en emoji : rendu différent selon l'appareil, aspect peu professionnel | 🟡 | Jeu d'icônes vectorielles unique (Lucide, licence ISC), même trait partout |
| Dégradé violet sur fond blanc, vu partout | 🟡 | Identité propre : papier, encre, accent vermillon, motif du cachet |
| Le bouton du kit payant domine l'en-tête | 🟡 | En-tête centré sur l'usage (outils, recherche, espace) ; kit plus bas |
| Pied de page très long (30 liens en colonnes) | 🟢 | Pied de page court : étapes, site, pays |
| Points forts à garder : hiérarchie typographique nette, cartes cohérentes, contrastes AA, typographie française | | |

## 2. Direction : « le cachet »

Un outil sérieux et chaleureux, comme un document officiel bien fait : **fond papier**, **encre presque noire**, un
seul accent **vermillon** (la couleur des tampons), des filets fins, beaucoup d'air. Le motif du **cachet** (badge
rond, bord pointillé) signale ce qui est vérifié aux sources officielles. Aucun dégradé décoratif.

## 3. Jetons

| Jeton | Valeur | Usage | Contraste |
|---|---|---|---|
| `--bg` | `#f7f5f0` | Fond papier | — |
| `--card` | `#ffffff` | Cartes, champs | — |
| `--ink` | `#15171a` | Texte, boutons sombres | 17,4:1 sur blanc |
| `--ink-2` | `#2e3236` | Texte secondaire fort | 12,9:1 |
| `--muted` | `#555b62` | Texte d'accompagnement | 6,2:1 sur `--bg` |
| `--faint` | `#666c73` | Libellés discrets | 4,8:1 sur `--bg` |
| `--line`, `--line-2` | `#e5e0d6`, `#d6cfc2` | Filets, bordures | — |
| `--brand` | `#c2410c` | Accent : bouton principal, sélection | 5,2:1 avec le blanc |
| `--brand-2` | `#9a3412` | Survol, liens | 7,3:1 sur blanc |
| `--brand-soft` | `#fbeadf` | Fond d'accent | — |
| `--ok`, `--warn`, `--danger` | `#15803d`, `#a16207`, `#b91c1c` | États (l'avertissement n'est plus de la couleur de la marque) | ≥ 4,5:1 sur blanc |

Typographie : **Bricolage Grotesque** pour les titres (graisses 500 à 800, taille optique) et **Atkinson Hyperlegible
Next** pour le texte (Braille Institute, conçue pour la lisibilité ; graisses 300 à 800), servies par le site
(WOFF2, licence OFL, `scripts/polices_site.py`) ; chiffres tabulaires dans les résultats. Rayons 10 à 16 px ;
ombres légères et chaudes.

## 4. Navigation et recherche

- **En-tête** : logo · bouton « Outils » (panneau des cinq étapes, toutes visibles d'un coup) · recherche · pays ·
  bouton d'action de la section (France : « Mon espace » ; ailleurs : le générateur de facture).
- **Cinq étapes** dans chaque pays (mêmes identifiants de pages) : Démarrer · Prix et clients · Contrats ·
  Facturer et encaisser · Impôts et gestion (libellés traduits).
- **Recherche** : index des outils de la section généré au build (titre, accroche, description, étape) ; recherche
  sans accents ni majuscules, mots dans n'importe quel ordre ; liste de résultats au clavier (motif *combobox* de
  l'ARIA APG : ↑ ↓, Entrée, Échap) ; s'ouvre avec le bouton, `/`, Ctrl ou ⌘ + K ; rien n'est envoyé à un serveur.
- **Mobile** : bouton « Menu » qui ouvre la recherche et les cinq étapes ; cibles de 44 px.

## 5. Accueil

1. Titre « Tout pour travailler à son compte » (équivalents traduits), sous-titre, **champ de recherche** et
   raccourcis vers les outils les plus utilisés.
2. **Votre parcours** : les cinq étapes en cartes, chacune avec ses outils.
3. Les plus utilisés ; pourquoi nous faire confiance (sourcé, privé, gratuit) avec le cachet ; kit ; questions.

## 6. Ce qui ne change pas

Le contenu et le comportement des outils, les documents générés (factures, contrats, propositions, PDF Factur-X :
leur mise en page reste celle du PDF validé), l'accessibilité AA vérifiée par axe-core, la typographie française.

## 7. Réalisation, première partie (23/10/2026)

- Jetons, polices (153 Ko au total, WOFF2), icônes (Lucide, 57 dessins, `src/icons/`, une icône par outil dans
  `data/icons.json`, sprite par page), boutons, cartes, champs (bordure à 3,98:1), résultats (encre et filet vermillon).
- En-tête : panneau « Outils » des cinq étapes, bouton de recherche (et bouton dédié sur mobile), bouton d'action de la
  section ; le kit passe dans le pied de page et l'encart de l'accueil.
- Recherche : fenêtre `<dialog>` native, motif *combobox*, « / », Ctrl ou ⌘ + K, Échap, sans accents, plusieurs mots.
- Accueil des cinq sections et accueil mondial : promesse « Tout pour travailler à son compte », recherche, raccourcis,
  étapes en lignes (présentation à gauche, outils à droite ; les cartes de hauteurs inégales laissaient des trous),
  cachet « Sources officielles vérifiées ».
- Relecture des captures : soulignement de la page en cours qui traversait tout l'en-tête (corrigé) ; contrastes de
  l'illustration de l'accueil (corrigés) ; Échap qui vidait le champ de recherche au lieu de fermer (corrigé).
- Reste à faire : écrans du compte gratuit, pages Offres et Soutenir, recherche de noms de domaine ([31](31-vision-plateforme.md) § 5).
