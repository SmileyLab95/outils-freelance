# 7. Plan de développement : de la boîte à outils à la plateforme de l'entrepreneur

Adopté le 20/10/2026. Ce document fixe le **cap** ; la [feuille de route](05-feuille-de-route.md) détaille les tâches
et indique où en est le projet. Les décisions sont tracées dans le [journal des décisions](08-journal-des-decisions.md).

## 1. L'ambition

Devenir **la plateforme où un entrepreneur gère toute son activité, avec un seul compte** : créer son entreprise,
vendre, facturer, encaisser, déclarer, se protéger, épargner et se faire accompagner, selon les règles de **son pays**
et de **son statut**.

Le moteur du projet tient en une phrase :

> **Les outils gratuits attirent** (Google) → **le compte fidélise** (tout au même endroit) → **les abonnements, les
> produits et les partenaires financent**.

Ce que la plateforme ne sera pas : une banque, un cabinet d'expertise comptable ou un cabinet d'avocats. Pour ces
métiers réglementés, elle s'appuie sur des **partenaires agréés** et des **professionnels** (voir § 7).

## 2. Point de départ (octobre 2026)

| Atouts | Limites |
|---|---|
| 81 pages, 4 pays, 2 langues, une quarantaine d'outils | Pas de nom de domaine ni de mesure d'audience |
| Chiffres sourcés et datés, moteurs de calcul testés | Pas de compte : les données restent sur l'appareil |
| Site statique rapide, gratuit à héberger, respectueux de la vie privée | Revenus encore quasi nuls (un kit à 9 €) |
| Méthode documentée, tests automatiques, déploiement continu | Une seule personne pour les décisions et les démarches |

## 3. Le parcours de l'entrepreneur et les modules de la plateforme

Chaque besoin du parcours devient un module. Les outils gratuits actuels en sont la première brique.

| # | Étape de vie | Besoins | Module | Offre | Étape |
|---|---|---|---|---|---|
| 1 | Décider et créer | Choisir son statut, estimer ses revenus, créer l'entreprise | Simulateurs (existants), assistant de création, partenaires création et domiciliation | Gratuit + partenaires | E1, E5 |
| 2 | S'équiper | Banque pro, assurance, logiciels | Comparatifs et offres partenaires | Gratuit + partenaires | E5 |
| 3 | Vendre | Trouver des clients, fixer ses prix, devis, contrats, CGV | Calculateurs, générateur de contrats (existants), devis en ligne acceptés par le client | Gratuit / Pro | E2, E3 |
| 4 | Facturer | Factures conformes, numérotation, facturation électronique | Module Facturation dans le cloud, Factur-X, envoi par plateforme agréée | Gratuit / Pro | E2, E3 |
| 5 | Encaisser | Liens de paiement, suivi, relances, pénalités | Module Encaissement, relances automatiques | Pro | E3 |
| 6 | Gérer | Dépenses, justificatifs, banque, livre des recettes, trésorerie | Module Gestion, banque connectée | Pro / Business | E4 |
| 7 | Déclarer | Urssaf, TVA, impôt, échéances | Module Obligations : montants préparés, rappels | Gratuit / Pro | E2 à E4 |
| 8 | Se protéger, épargner | Retraite, prévoyance, mutuelle | Simulateurs (existants) + partenaires | Gratuit + partenaires | E5 |
| 9 | Se faire accompagner | Comptable, avocat, formation, entraide | Place de marché d'experts, académie, communauté | Commission / Pro | E5 |
| 10 | Grandir | Passer en société, sous-traiter, recruter | Comparateur de statuts (existant), outils d'équipe | Business | E6 |

## 4. Les offres (modèle économique cible)

| Offre | Pour qui | Contenu | Prix indicatif |
|---|---|---|---|
| **Outils** (sans compte) | Tout le monde | Tous les outils publics actuels, calcul dans le navigateur | Gratuit |
| **Compte gratuit** | Démarrage | Profil enregistré, clients, quelques factures par mois, tableau de bord, rappels d'échéances | Gratuit |
| **Pro** | Freelance actif | Devis et factures illimités, facturation électronique, relances automatiques, liens de paiement, livre des recettes, exports | 9 à 15 € par mois |
| **Business** | TPE, freelance confirmé | Banque connectée, dépenses et justificatifs, exports comptables, accès du comptable, plusieurs utilisateurs | 25 à 39 € par mois |

Revenus complémentaires : produits numériques (Gumroad puis boutique intégrée), commissions des partenaires
(affiliation, mise en relation), formations de l'académie, publicité discrète sur les pages publiques (jamais dans
l'application). Ce tableau décrit l'offre cible ; la première grille, pour les comptes de l'étape 2, est proposée
dans [17](17-offres-et-paiements.md) (« Pro » à 5 € HT par mois, fonctions de [12](12-specification-comptes.md) § 2).

**Concurrents à étudier** (pour se situer, pas pour copier) : en France, des outils de facturation et de comptabilité
pour indépendants comme Abby, Freebe, Indy, Tiime ou Henrri ; aux États-Unis, FreshBooks ou Wave ; au Royaume-Uni,
FreeAgent. Notre différence : **plusieurs pays et deux langues**, **règles sourcées et vérifiées**, **outils gratuits
sans compte**, **simplicité**, **respect de la vie privée**.

## 5. Architecture cible

```
            Google / partages
                   │
     ┌─────────────▼──────────────┐         ┌──────────────────────────────┐
     │ Site public (actuel)       │  compte │ Application « Espace »       │
     │ statique, SEO, outils      ├────────►│ app.<domaine>                │
     │ gratuits, sans compte      │         │ tableau de bord, factures,   │
     └────────────────────────────┘         │ clients, obligations…        │
                                            └──────┬──────────────┬────────┘
                                                   │              │
                              ┌────────────────────▼───┐   ┌──────▼─────────────────────────┐
                              │ Socle (hébergé en UE)  │   │ Partenaires par API            │
                              │ base PostgreSQL,       │   │ plateforme agréée (factures),  │
                              │ authentification,      │   │ agrégateur bancaire agréé,     │
                              │ fichiers, tâches       │   │ paiements (Stripe…), SIREN     │
                              │ planifiées, emails     │   │ (API Recherche d'entreprises), │
                              └────────────────────────┘   │ TVA UE (VIES), signature       │
                                                           └────────────────────────────────┘
```

Principes :

- **Le site public reste statique** : rapide, gratuit à héberger, excellent pour le référencement. Les outils restent
  utilisables sans compte (c'est notre promesse de confidentialité).
- **L'application réutilise les moteurs de calcul existants**, déjà purs et testés, dans le navigateur comme sur le serveur.
- **Socle managé hébergé dans l'Union européenne** (base PostgreSQL, authentification, stockage de fichiers) pour aller
  vite sans gérer de serveurs ; une solution souveraine (hébergeur français) reste possible plus tard. Le choix exact
  est fait et consigné au début de l'étape 2.
- **Paiements** : Stripe pour les abonnements ; Gumroad garde les produits numériques au début.
- **Sécurité dès le départ** : chiffrement, double authentification, cloisonnement des données par utilisateur au
  niveau de la base, sauvegardes quotidiennes, journal d'audit, aucune donnée bancaire stockée (jetons des partenaires
  seulement), tests de sécurité avant chaque ouverture.
- **Réversibilité** : l'utilisateur peut tout exporter et supprimer son compte à tout moment.

## 6. Les étapes

| Étape | Période visée | Objectif | Livrables clés | Pour passer à l'étape suivante |
|---|---|---|---|---|
| **E1 — Fondations commerciales** | nov. – déc. 2026 | Rendre le site rentable et mesurable, préparer la plateforme | Marque et domaine, mesure d'audience, 3 produits en vente, liste d'emails, liste d'attente « Espace », étude de marché, spécification du MVP | Domaine en ligne, au moins 2 produits vendus, liste d'attente ou trafic en croissance, statut juridique choisi |
| **E2 — Comptes et MVP « Espace entrepreneur »** | janv. – avril 2027 | Un compte gratuit utile | Socle sécurisé, CGU, profil entreprise, clients, devis et factures dans le cloud, tableau de bord, livre des recettes, rappels | Environ 300 comptes, 40 % créent une facture, aucun incident de sécurité |
| **E3 — Facturation électronique et encaissement** | mai – août 2027 | Être prêt pour le **1er septembre 2027** | Factur-X, connexion à une plateforme agréée, réception des factures, liens de paiement, relances automatiques, offre Pro | Émission électronique testée avant le 1er septembre 2027, premiers abonnés payants |
| **E4 — Gestion financière** | sept. 2027 – mars 2028 | Piloter son activité au même endroit | Dépenses et justificatifs, banque connectée, trésorerie, déclarations préparées, exports comptables, application mobile, offre Business, modules US/UK/Canada | Abonnements en croissance, rétention mesurée |
| **E5 — Écosystème** | 2028 | Accompagner l'entrepreneur au-delà du logiciel | Place de marché d'experts, offres partenaires, académie, communauté, assistant de création, boutique intégrée | Revenus (abonnements + partenaires) supérieurs aux coûts |
| **E6 — Échelle** | 2029 et après | Grandir | Application complète dans tous les pays, nouveaux pays, assistant IA, API publique, marque blanche, équipe | Selon les résultats et le financement |

Les dates sont des objectifs : **une étape ne commence que si l'étape précédente a atteint son critère de passage**,
sauf l'échéance du 1er septembre 2027, qui impose son calendrier à l'étape 3.

## 7. Conformité (non négociable)

| Sujet | Règle de conduite |
|---|---|
| Entreprise | Pour encaisser des abonnements, il faut une structure juridique (micro-entreprise pour démarrer, société ensuite) : décision d'Ismail avec un expert-comptable, à l'étape 1. |
| Données personnelles (RGPD) | Hébergement dans l'UE, registre des traitements, politique de confidentialité, contrats de sous-traitance avec chaque prestataire, export et suppression du compte, mesure d'audience sans cookie ou avec consentement. |
| Conditions d'utilisation | CGU et CGV relues par un avocat avant l'ouverture des comptes. |
| Facturation électronique | La plateforme sera une **solution compatible** connectée à une ou plusieurs **plateformes agréées** ; devenir soi-même plateforme agréée n'est pas visé (immatriculation et exigences techniques lourdes). |
| Archivage | Conservation des factures pendant les durées légales (10 ans pour les pièces comptables, 6 ans au titre du contrôle fiscal), export garanti. |
| Données bancaires | Uniquement via un prestataire agréé (DSP2) ; aucun identifiant bancaire stocké. |
| Professions réglementées | Pas de conseil juridique ou comptable personnalisé par la plateforme : information générale et calculs, puis mise en relation avec des professionnels. Les règles de déontologie sur la rémunération des mises en relation seront vérifiées avant l'étape 5. |
| Responsabilité | Avertissements « à titre indicatif », sources affichées, assurance responsabilité civile professionnelle de l'éditeur avant l'ouverture des comptes. |
| Accessibilité | Viser le niveau AA des règles WCAG. |

## 8. Indicateurs (ordres de grandeur pour piloter, pas des promesses)

| Fin d'étape | Audience | Comptes | Payants | Autres |
|---|---|---|---|---|
| E1 (déc. 2026) | 150 pages indexées, trafic mesuré | Liste d'attente : 100 inscrits | — | 3 produits en vente, liste d'emails lancée |
| E2 (avril 2027) | 5 000 visites par mois | 300 | — | 40 % des comptes créent une facture |
| E3 (août 2027) | 15 000 visites par mois | 1 500 | 100 | Émission électronique fonctionnelle |
| E4 (mars 2028) | 40 000 visites par mois | 5 000 | 400 | Taux de désabonnement mensuel suivi |
| E5 (fin 2028) | — | — | — | Revenus supérieurs aux coûts |

## 9. Rôles

| Qui | Rôle |
|---|---|
| **Claude** | Conception, code, tests, contenus, recherche réglementaire, documentation, sécurité applicative, suivi de la feuille de route à chaque session. |
| **Ismail** | Décisions (marque, prix, priorités), création des comptes et signature des contrats (domaine, hébergement, Stripe, Gumroad, partenaires), structure juridique et obligations déclaratives, relecture juridique avec un avocat, budget, premiers contacts avec les utilisateurs. |
| **Plus tard** | Expert-comptable conseil, avocat, associé ou développeur, support client. |

## 10. Budget indicatif

Ordres de grandeur à vérifier au moment de souscrire ; les dépenses suivent les étapes et les revenus.

| Étape | Postes | Ordre de grandeur |
|---|---|---|
| E1 | Nom de domaine ; outils gratuits (mesure d'audience, emails) au début | Quelques dizaines d'euros par an |
| E2 – E3 | Socle et hébergement (offres gratuites puis payantes), emails transactionnels, relecture des CGU par un avocat, assurance RC Pro, abonnement à une plateforme agréée partenaire, commissions de paiement | Quelques centaines d'euros au démarrage, puis quelques dizaines à quelques centaines d'euros par mois |
| E4 – E5 | Agrégateur bancaire (souvent facturé par compte connecté), reconnaissance de texte des justificatifs, support | Proportionnel au nombre d'utilisateurs |

Financement : d'abord par les produits et les premiers abonnements ; ensuite, selon les résultats, aides publiques à
l'innovation ou associé.

## 11. Risques et parades

| Risque | Parade |
|---|---|
| Concurrents financés et installés | Se distinguer : plusieurs pays, exactitude sourcée, outils gratuits sans compte, simplicité ; partenariats plutôt que tout refaire. |
| Erreur de calcul ou règle périmée | Sources et dates sur chaque chiffre, tests automatiques, veille de juin et de décembre, avertissements, assurance. |
| Fuite de données | Sécurité dès la conception, minimisation des données, audits avant ouverture. |
| Coûts avant revenus | Étapes conditionnées par des indicateurs ; offres gratuites des prestataires au démarrage. |
| Dépendance à une seule personne | Documentation complète, automatisation, tests, feuille de route à jour. |
| Réglementation mouvante (facturation électronique, recodification de la TVA) | Veille mensuelle sur les sujets en cours, règles centralisées dans `data/rules/`. |

## 12. Comment ce plan est suivi

- **À chaque session** : lire la section « Où en est-on ? » de la [feuille de route](05-feuille-de-route.md), travailler
  sur l'étape en cours, puis cocher et mettre à jour cette section (règle inscrite dans `CLAUDE.md`).
- **Chaque mois** : bilan chiffré (Search Console, audience, ventes, comptes) ajouté à la feuille de route.
- **En juin et en décembre** : veille réglementaire de tous les pays (barèmes, seuils, calendriers).
- **À la fin de chaque étape** : point de décision noté dans le [journal des décisions](08-journal-des-decisions.md).
- Ce plan est révisé si une décision change le cap ; l'ancienne version reste dans l'historique Git.
