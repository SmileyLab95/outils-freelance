# 1. Vision et stratégie

> Depuis le 20/10/2026, la vision s'élargit : le site devient la **plateforme de l'entrepreneur avec un compte**.
> Le cap et les étapes sont dans le [plan de développement](07-plan-de-developpement.md) ; cette page décrit la stratégie
> du site public, qui reste le moteur d'acquisition.

## Le projet en une phrase

Le site de référence, gratuit, où un indépendant trouve **tout ce dont il a besoin pour démarrer, facturer, fixer ses prix, se faire payer et gérer ses impôts**, adapté à **son pays** et à **son statut** — financé par des produits numériques, l'affiliation et, plus tard, la publicité.

## Pourquoi ce modèle

| Constat | Conséquence |
|---|---|
| Aucun compte sur les réseaux sociaux, pas de budget publicité | Le trafic doit venir de **Google** : chaque page répond à une recherche précise. |
| Les indépendants cherchent des réponses concrètes (« calcul TVA », « self-employment tax calculator », « invoice template UK ») | Des **outils gratuits** qui donnent le résultat en quelques secondes, puis des explications sourcées. |
| Un seul produit à 9 € plafonne les revenus | **Plusieurs sources de revenus** : affiliation, gamme de produits, liste d'emails, publicité. |
| Un site uniquement français limite l'audience | **4 pays au lancement** (France, États-Unis, Royaume-Uni, Canada anglais et français), architecture prête pour d'autres. |
| Les règles fiscales changent chaque année | Les chiffres vivent dans des **fichiers de règles sourcés et datés**, revus selon un calendrier. |

## Marchés

| Pays | Langue | Taille du marché (indicatif) | Concurrence | Rôle |
|---|---|---|---|---|
| France | fr-FR | 3,19 M de micro-entrepreneurs inscrits (mi-2025), 758 600 créations en 2025 | Forte sur les grandes requêtes, faible sur la longue traîne | Marché d'origine, déjà en ligne |
| États-Unis | en-US | Le plus grand marché de freelances au monde | Très forte | Volume maximal, revenus d'affiliation les plus élevés |
| Royaume-Uni | en-GB | Plusieurs millions de *sole traders* | Forte | Actualité porteuse : *Making Tax Digital* (avril 2026) |
| Canada | en-CA / fr-CA | Marché bilingue, règles par province | Moyenne | Réutilise le travail anglais et français ; outils par province peu couverts |

Extensions possibles ensuite : Belgique, Suisse, Australie, Irlande (même architecture).

## Positionnement

- **Gratuit, sans inscription, sans publicité intrusive** au démarrage.
- **Exact et sourcé** : chaque chiffre affiche sa source officielle et sa date de vérification. C'est ce qui nous distingue des sites qui recopient des chiffres périmés.
- **Local** : le bon vocabulaire, la bonne devise, les bonnes règles (TVA, *sales tax*, GST/HST, cotisations, *self-employment tax*, *National Insurance*…).
- **Privé** : tout est calculé dans le navigateur, aucune donnée envoyée.
- **Rapide et beau** : site statique, chargement instantané, design soigné sur mobile.

## Modèle économique

| Source | Quand | Principe |
|---|---|---|
| Produits numériques (Gumroad) | Dès maintenant | Kits par pays (FR et US existent), puis gamme : contrats, CGV, packs Excel, kit facturation électronique. |
| Affiliation | Dès les premières visites | Recommandation de services utiles (banque pro, logiciel de facturation, assurance, création d'entreprise), avec mention transparente. Voir [06-affiliation.md](06-affiliation.md). |
| Liste d'emails | Phase 5 | Un produit gratuit sur Gumroad récupère les emails ; chaque nouveau produit est présenté à la liste. |
| Publicité (AdSense) | Après l'achat du domaine et environ 10 000 visites par mois | Bandeaux discrets hors des outils, consentement conforme (CMP certifiée). |

## Ce qu'il faut savoir honnêtement

- **Le référencement prend du temps** : 3 à 12 mois avant un trafic régulier pour un site neuf. On gagne d'abord sur des requêtes précises (« longue traîne »).
- **La qualité et le nombre de pages comptent** : l'objectif est de passer de 11 pages à plus de 150 pages utiles, réparties sur les pays.
- **Rien n'est garanti** : on décide sur des chiffres (Search Console), aux points de contrôle prévus dans la [feuille de route](05-feuille-de-route.md).

## Indicateurs suivis

| Indicateur | Outil | Objectif à 6 mois | Objectif à 12 mois |
|---|---|---|---|
| Pages indexées | Search Console | > 100 | > 200 |
| Impressions Google par mois | Search Console | 20 000 | 150 000 |
| Clics par mois | Search Console | 1 000 | 10 000 |
| Ventes de kits | Gumroad | 10 par mois | 50 par mois |
| Inscriptions via affiliation | Tableaux de bord des programmes | Premières conversions | Revenu régulier |

Les objectifs sont des ordres de grandeur pour piloter, pas des promesses.

## Décisions en attente

- **Nom de domaine et marque** : à acheter plus tard. Le site est prêt pour la bascule (une ligne dans `config/site.json`). La marque devra fonctionner en français et en anglais.
- **Kit US sur Gumroad** : le produit anglais existe (fichiers dans le dépôt Claud-Proj, `dist/en/`) ; il faut le mettre en vente et donner le lien.
