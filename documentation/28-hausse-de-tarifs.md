# 28. Augmenter ses tarifs (4 pays)

Besoin P3 de [02](02-besoins-clients.md), § 4 : « Augmenter ses tarifs : calculateur + email d'annonce ». L'email
existe aux États-Unis, au Royaume-Uni et au Canada (pages de modèles d'emails, modèle 3) ; il manque en France.
Spécification du 23/10/2026, avant tout code (charte qualité) ; **réalisé le même jour (§ 4)**.

## 1. Principe

Un calculateur de pur calcul, sans chiffre officiel à tenir à jour : les seuls nombres sont ceux que l'utilisateur
saisit. L'inflation n'est pas reprise du site (elle change chaque mois) : l'utilisateur saisit le taux de son choix,
avec un lien vers l'organisme statistique de son pays (INSEE, BLS, ONS, Statistique Canada) pour le trouver. Aucune
règle juridique sur le préavis : la page conseille de prévenir ses clients à l'avance, sans durée imposée.

## 2. Calcul (moteur pur `engines/price-increase.js`)

Entrées : tarif actuel (horaire ou journalier), nouveau tarif ou hausse en %, volume facturé par mois (heures ou
jours), part du volume que l'on craint de perdre (%), inflation (% , facultative).

Sorties :

- nouveau tarif = tarif × (1 + hausse) ou tarif saisi ; hausse en % recalculée dans l'autre sens ;
- chiffre d'affaires mensuel avant et après (volume × (1 − perte)) et écart ;
- **perte de volume supportable** : 1 − tarif actuel ÷ nouveau tarif (au-delà, le chiffre d'affaires baisse) ;
- tarif qui suit l'inflation saisie : tarif × (1 + inflation) ; hausse réelle = (1 + hausse) ÷ (1 + inflation) − 1.

Cas limites : tarif nul ou négatif (rien à calculer), baisse de tarif (hausse négative : signalée), perte de 100 %,
inflation négative (acceptée).

## 3. Pages

`/fr/augmenter-ses-tarifs/`, `/us/rate-increase-calculator/`, `/uk/rate-increase-calculator/`,
`/ca/rate-increase-calculator/`, `/ca/fr/calculateur-hausse-tarifs/` (identifiant `raise`, menu « Tarifs »), avec un
lien vers le modèle d'email d'annonce ; en France, un septième modèle « Annoncer une hausse de tarifs » est ajouté à
la page des modèles d'emails (le texte ne vit qu'à un endroit).

Tests : moteur (exemples calculés à la main, perte supportable, inflation, cas limites), textes des pages, parcours
navigateur, erreurs réintroduites.

## 4. Réalisation (23/10/2026)

- Pages `/us/rate-increase-calculator/`, `/uk/rate-increase-calculator/`, `/ca/rate-increase-calculator/`,
  `/ca/fr/calculateur-hausse-tarifs/` et `/fr/augmenter-ses-tarifs/` (identifiant `raise`, menu des tarifs), avec
  un bouton vers le modèle d'email d'annonce ; liens vers le BLS, l'ONS, Statistique Canada et l'Insee pour le
  dernier chiffre de l'inflation.
- France : septième modèle « Annoncer une hausse de tarifs » sur la page des modèles d'emails (titre et FAQ
  ajustés : le texte de la FAQ ne dit plus que les modèles sont tirés du kit).
- Moteur `engines/price-increase.js` et outil `tools/price-increase.js` ; aucune règle officielle (pur calcul).
- Tests : `price-increase.test.mjs` (exemples calculés à la main, perte supportable, inflation, cas limites ; textes
  des cinq pages, exemple de la FAQ recalculé par le moteur, lien vers un organisme statistique officiel) ; parcours
  navigateur des cinq pages et copie du nouveau modèle ; 10 erreurs réintroduites, toutes détectées.
