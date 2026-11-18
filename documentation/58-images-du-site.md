# 58. Images du site

Demande d'Ismail du 18/11/2026 : « essaie d'aider avec des images » puis « dans l'accueil par exemple, il n'y a que du
texte, pas d'image ». Constat : sur téléphone, l'accueil n'a aucune image (l'illustration du haut n'apparaît qu'à partir
de 1 080 px de large) ; sur ordinateur, seule cette illustration rompt le texte. Les outils, eux, sont très visuels
(aperçu de facture, graphiques, indicateurs), mais rien ne les montre avant d'y entrer.

## 1. Principes

1. **Montrer le vrai produit.** Les images sont des captures des outils du site, faites par un script à partir du site
   construit (`scripts/vitrine.mjs`) : ce qu'on voit est ce qu'on obtient. Pas de banque d'images, pas de photo de
   personnes, pas d'image générée par une IA, pas de capture d'un autre site.
2. **Données d'exemple, annoncées comme telles.** Les montants affichés sont calculés par les outils eux-mêmes à partir
   de saisies d'exemple (« Camille Martin EI », clients fictifs) ; le texte alternatif et la légende le disent. Aucun
   chiffre présenté comme une statistique ou un témoignage.
3. **Accessibles.** Chaque image a un texte alternatif qui dit ce qu'elle montre ; le lien de la tuile est porté par son
   titre (pas par l'image), pour que le nom du lien reste court ; contrastes du thème ; aucune information qui n'existe
   que dans l'image (le texte de la tuile dit ce que fait l'outil).
4. **Légères et nettes.** WebP, capturées à la densité 2 (écrans haute définition), dimensions déclarées (`width`,
   `height` : pas de saut de mise en page), chargement différé (`loading="lazy"`) sous le haut de page.
5. **À jour.** Le script refait toutes les captures en une commande après un changement d'interface ; il est relancé
   au moins chaque année (les dates des exemples sont celles de l'année en cours).

## 2. Accueil : la vitrine « bento »

Juste sous le haut de page, une grille de tuiles (le motif qui donne son nom au thème) : chaque tuile montre un outil
en image, avec son nom et une phrase.

| Tuile | Image | Taille |
|---|---|---|
| Espace entrepreneur | Tableau de bord : indicateurs de l'année, déclaration Urssaf, plafonds | Grande (2 × 2) |
| Facture et devis | Aperçu de la facture générée | Haute (1 × 2) |
| Simulateur Urssaf | Résultat : ce qu'il reste chaque mois, répartition | Normale |
| Calendrier fiscal | Prochaine échéance et liste | Normale |
| Trésorerie | Graphique du solde prévu | Large (2 × 1) |

Sur téléphone, les tuiles s'empilent (une colonne) ; l'image occupe toute la largeur de la tuile.

## 3. Étapes suivantes

1. ~~Vitrine des autres accueils~~ : faite le 18/11/2026 (§ 4.2).
2. Images d'outil dans la liste des étapes (miniature de l'outil phare de chaque étape).
3. Schémas explicatifs sur les pages de règles : facture annotée (mentions obligatoires, numéros reliés à la liste),
   frise des relances, calendrier de la facturation électronique.

## 4. Réalisation

### 4.1 Accueil France (18/11/2026)

- **Section « Les outils, en vrai »** sous le haut de page : cinq tuiles (Espace entrepreneur, Facture et devis,
  Simulateur Urssaf, Calendrier fiscal, Trésorerie), chacune avec son titre (le lien), une phrase et une capture.
  Grille de trois colonnes sur ordinateur (l'Espace sur deux colonnes, la facture à côté), deux sur tablette (les
  petites tuiles y ont la même proportion d'image, 10:7, pour rester alignées), une sur téléphone.
- **Captures** : `node scripts/vitrine.mjs [section]` sert `docs/`, remplit les outils (Espace d'exemple daté par
  rapport au jour de la capture, facture d'exemple, valeurs par défaut des simulateurs), masque l'en-tête collant,
  capture chaque élément sur toute sa largeur à la densité 2 avec une proportion fixe, encode en WebP (qualité 82)
  et écrit `src/assets/img/vitrine/dimensions.json`. Poids : 22 à 88 Ko par image, 290 Ko pour les six (un
  ordinateur en charge cinq, 244 Ko ; un téléphone cinq aussi, 202 Ko), chargées seulement à l'approche.
- **Téléphone** : la capture de l'Espace (version ordinateur) y serait illisible ; une variante prise à 390 px de large
  (`fr-espace-mobile`) est servie sous 600 px par une balise `<picture>`.
- **Construction** : `{{vitrine:nom|texte alternatif}}` (build.py) écrit l'image avec ses dimensions, son empreinte de
  cache, `loading="lazy"` et `decoding="async"` ; une image absente arrête la construction.
- **Accessibilité** : lien porté par le titre et étiré sur toute la tuile (un clic sur l'image ouvre l'outil), anneau
  de focus dessiné à l'intérieur de la tuile (3 px, cobalt), texte alternatif qui décrit la capture et dit, quand
  c'est le cas, que les données sont des exemples (le calendrier montre les vraies échéances).
- **Tests** : parcours de l'accueil (tuiles, liens, textes alternatifs, dimensions, chargement des images, clic sur
  une image, variante téléphone sous 600 px), trois erreurs réintroduites (lien étiré retiré, variante téléphone
  ignorée, chargement différé retiré) toutes détectées ; axe-core sans erreur ; captures relues à 390, 820, 1110 et
  1440 px.

### 4.2 Accueils États-Unis, Royaume-Uni, Canada (deux langues) et mondial (18/11/2026)

- Même grille de cinq tuiles, aux emplacements numérotés (`tile-1` à `tile-5` : grande, haute, trois petites), avec les
  outils de chaque section et leur interface dans la langue de la section : générateur de facture (formulaire et
  aperçu), contrat, puis trois calculateurs (États-Unis : impôt des indépendants, acomptes trimestriels, taux horaire ;
  Royaume-Uni : impôt, taux journalier, calendrier fiscal ; Canada : impôt, taxes de vente, taux horaire).
- Exemples repris des textes d'aide de chaque générateur (mêmes noms fictifs), description et date de début du
  contrat remplies ; sur téléphone, la grande tuile montre la facture seule (`<section>-facture-mobile`).
- Accueil mondial : une tuile par pays, dans la langue de l'outil (`lang="fr"` pour les tuiles en français), après le
  choix du pays.
- 30 images, 1,5 Mo en tout ; un visiteur n'en charge que cinq, à l'approche.
- Tests : la vérification de la vitrine est une fonction commune du parcours, appelée sur les six accueils (tuiles,
  liens, textes alternatifs, chargement, clic sur l'image, variante téléphone) ; 386 contrôles des accueils, axe-core
  compris.
