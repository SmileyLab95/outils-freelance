# 42. Jours ouvrés, jours fériés et délais (France d'abord)

Outil de l'étape 6 de [31](31-vision-plateforme.md) § 5 (« jours ouvrés ») et de la boîte à outils du § 4 (« calculateur
de jours ouvrés et de délais »). Spécification avant le code, 29/10/2026. La France d'abord ; le Royaume-Uni (calendrier
officiel de gov.uk, déjà lu), les États-Unis et le Canada suivront, chacun après la lecture de ses sources.

## 1. Besoin

Un indépendant a besoin de savoir :

1. **Combien de jours il peut facturer** dans un mois, un trimestre ou l'année : jours ouvrés moins les jours fériés
   (et ses congés), pour fixer son TJM, prévoir son chiffre d'affaires ou chiffrer une mission au forfait ;
2. **Combien de jours ouvrés compte une période** (durée d'une mission, d'un devis, d'une absence) ;
3. **Quelle est la date d'un délai** exprimé en jours ouvrés, ouvrables, francs ou calendaires (livraison « sous 10 jours
   ouvrés », délai de réponse, rétractation de 14 jours) ;
4. **Quels sont les jours fériés** de l'année, selon le lieu (métropole, Alsace-Moselle, outre-mer).

Aujourd'hui, le calculateur de TJM demande de saisir soi-même le nombre de jours fériés.

## 2. Règles

Lues **en entier** le 29/10/2026 avec l'outil « Lire une source officielle ».

| Règle | Source | Usage |
|---|---|---|
| Fêtes légales : 1er janvier, lundi de Pâques, 1er mai, 8 mai, Ascension, lundi de Pentecôte, 14 juillet, 15 août, 1er novembre, 11 novembre, 25 décembre ; **Alsace-Moselle** : en plus le Vendredi saint (communes ayant un temple protestant ou une église mixte) et le 26 décembre ; **outre-mer** : commémoration de l'abolition de l'esclavage (Guadeloupe et Saint-Martin 27 mai, Guyane 10 juin, Martinique 22 mai, Mayotte 27 avril, La Réunion 20 décembre, Saint-Barthélemy 9 octobre) ; dates 2026 et 2027 publiées ; seul le 1er mai est obligatoirement chômé pour les salariés | F2405 (vérifiée le 01/01/2026) ; `jours_feries` (nouvelle) | Liste des jours fériés ; jours ouvrés ; contrôle du calcul de Pâques sur les dates publiées |
| Jour ouvrable (6 par semaine, sauf repos hebdomadaire et jours fériés habituellement non travaillés), jour ouvré (jours effectivement travaillés, généralement du lundi au vendredi, sauf jours fériés non travaillés), jour franc (0 h à 24 h, sans le jour de départ ni celui de l'échéance ; fin un samedi, un dimanche ou un jour férié → reportée au premier jour suivant qui n'en est pas un), jour calendaire (tous les jours) ; exemples chiffrés (10 jours francs à compter du 15/12/2026 → lundi 28/12/2026 ; congés du 13 au 17/07/2026 = 4 jours ouvrés) | F35697 (vérifiée le 30/04/2026) ; `jours_decompte` (nouvelle) | Quatre façons de compter ; tests sur les exemples officiels |

Prudence : les jours fériés autres que le 1er mai ne sont chômés que si un accord ou l'usage le prévoit (F2405) ; pour un
indépendant, l'outil compte par défaut les jours fériés comme non travaillés et permet de travailler certains jours.
Les fêtes locales ou professionnelles (Saint-Éloi, Sainte-Barbe, mi-carême) ne sont pas comptées : signalé sur la page.
Le décompte d'un délai **légal** dépend du texte qui le fixe (procédure civile, consommation…) : la page le dit et ne
remplace pas la règle propre à chaque délai.

## 3. Outil

- **Période** : un mois, un trimestre, une année ou deux dates ; résultat : jours calendaires, jours ouvrables, jours
  ouvrés, jours fériés tombant un jour ouvré (avec leur nom), **jours facturables** (jours ouvrés moins congés saisis).
- **Délai** : date de départ + N jours ouvrés, ouvrables, francs ou calendaires → date d'échéance, avec l'explication
  (jours sautés : week-end, fériés ; report éventuel).
- **Lieu** : métropole (par défaut), Alsace-Moselle, Guadeloupe, Guyane, Martinique, Mayotte, La Réunion,
  Saint-Barthélemy, Saint-Martin.
- **Semaine de travail** : jours travaillés cochables (du lundi au vendredi par défaut) ; option « je travaille les jours
  fériés ».
- **Liste des jours fériés** de la période, avec le jour de la semaine et « non travaillé », « travaillé » ou « jour de
  repos » selon la semaine de travail.
- **Congés** : nombre de jours de travail à retirer (0 au plus les jours ouvrés de la période) ; jours facturables =
  jours ouvrés moins congés.
- **Liens** : le calculateur de TJM affiche en aide le nombre de jours fériés tombant du lundi au vendredi de l'année en
  cours (métropole) et renvoie à l'outil. Sa valeur par défaut reste **8 jours** : c'est la convention commune du
  calculateur de TJM, du convertisseur de tarifs et des outils qui partent de 148 jours facturables
  ([18](18-outils-de-prix.md)) ; la changer chaque année ferait varier tous ces chiffres.
- **Moteur** `engines/jours.js` (OFE.days) : Pâques (calendrier grégorien), jours fériés d'une année et d'un lieu, jours
  d'une période selon le mode, ajout de N jours selon le mode (0 à 3 650) ; fonctions pures, années 2000 à 2100 (liste
  des fêtes légales actuelle, sans l'historique des lois).
- **Export .ics** des jours fériés : plus tard, avec le moteur du calendrier fiscal.

## 4. Tests

- Pâques : dates publiées de 2019 à 2028 (lundi de Pâques F2405 2026 et 2027, gov.uk 2019–2028) ; propriétés sur toutes
  les années couvertes (dimanche, entre le 22 mars et le 25 avril).
- Jours fériés 2026 et 2027 = tableaux de F2405, pour la métropole, l'Alsace-Moselle et l'outre-mer.
- Exemples de F35697 refaits : 10 jours francs depuis le 15/12/2026 → 28/12/2026 ; délai de 7 jours avec un mercredi
  férié dans les quatre modes ; congés de juillet et de novembre 2026.
- Nombre de jours ouvrés de chaque mois de 2026 (somme = total de l'année) ; année bissextile ; période inversée ; zéro jour.
- Page : chiffres de la FAQ = moteur ; parcours navigateur sur ordinateur, tablette et mobile ; accessibilité.

## 5. Réalisation (29/10/2026)

- Sources lues en entier avec l'outil « Lire une source officielle » : F2405 (jours fériés 2026 et 2027, Alsace-Moselle,
  outre-mer) et F35697 (quatre façons de compter, exemples). Le calendrier officiel du Royaume-Uni (gov.uk, 2019–2028,
  trois régions, dont le jour férié écossais de la Coupe du monde du 15 juin 2026) est lu pour la suite.
- Règles : `jours_feries` (fêtes légales, dates mobiles en jours après Pâques, Alsace-Moselle, abolition de l'esclavage
  par territoire) et `jours_decompte` (définitions et exemples). La fiche F35697 dit que le jour franc ne tient pas compte
  « du jour de l'échéance », mais son exemple compte 10 jours du 16 au 25 décembre : le calcul suit l'exemple (noté dans
  la règle).
- Code : moteur `engines/jours.js` (OFE.days), script `tools/jours.js`, page `content/fr/calcul-jours-ouvres.html`
  (menu « Fixer ses prix », après le TJM) ; calculateur de TJM : aide « En 2026 : 9 jours fériés du lundi au vendredi
  (métropole) » et lien, valeur par défaut inchangée (8).
- Relecture : libellés des types de jours raccourcis pour le mobile (option tronquée à 390 px) ; double point après une
  date abrégée (« 11 nov.. ») supprimé ; accords « 1 jour ouvré », « 1er jour » ; une erreur de mon propre test corrigée
  (mai 2026 : 17 jours ouvrés, 4 jours fériés en semaine et non 5).
- Tests : 10 tests unitaires (Pâques sur 101 ans, fiches officielles, exemples refaits, décomptes, page) ; 27 erreurs
  réintroduites dans le moteur, 23 détectées au premier passage, les 4 autres après ajout de tests ; parcours navigateur
  (année, mois, Alsace-Moselle, dates, congés, délais francs et ouvrés) sur ordinateur, tablette et mobile, audit
  d'accessibilité sans erreur.
