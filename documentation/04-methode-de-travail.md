# 4. Méthode de travail

Le site doit être **exact**, **cohérent** et **toujours à jour**. Chaque outil suit le même circuit, du chiffre officiel à la mise en ligne.

## Charte qualité

Règle fixée par Ismail le 20/10/2026 : **tout produit ou service est fait avec le maximum de qualité possible.**
Concrètement, rien n'est publié ou vendu sans avoir passé ces exigences.

| Moment | Exigence |
|---|---|
| Avant | Besoin clair et **spécification écrite** pour tout module important : parcours, écrans, cas limites, critères d'acceptation. |
| Avant | **Règles vérifiées** aux sources officielles ; une source secondaire doit être recoupée ; toute incertitude est signalée et jamais présentée comme certaine. |
| Pendant | **Moteurs de calcul purs et testés** avant l'interface : exemples officiels, calculs à la main, cas limites. |
| Pendant | **Une seule source de vérité** : une règle ou une mention légale n'est écrite qu'à un seul endroit et réutilisée partout. |
| Pendant | **Accessibilité** : libellés, navigation au clavier, focus visible, contrastes suffisants, résultats annoncés aux lecteurs d'écran. |
| Pendant | **Tous les états** prévus : vide, erreur, chargement, données incomplètes, très longues valeurs, montants nuls ou négatifs. |
| Pendant | **Sécurité et vie privée** : données échappées à l'affichage, rien d'envoyé sans nécessité, export et suppression possibles. |
| Pendant | **Légèreté** : pas de dépendance lourde, pages rapides même sur mobile. |
| Avant publication | Tous les tests passent ; **captures relues** sur ordinateur, tablette et mobile ; **relecture critique** du code (revue) et des textes (ton, exactitude, fautes). |
| Avant publication | Documentation, feuille de route et journaux à jour. |
| Produits vendus | Mêmes exigences, plus : contenu relu en entier, exemples et formules testés, mise en page soignée, conformité juridique vérifiée. |

## Le rituel de chaque session

1. Lire « Où en est-on ? » dans la [feuille de route](05-feuille-de-route.md) et le [plan de développement](07-plan-de-developpement.md).
2. Travailler sur l'étape en cours (ou sur la demande d'Ismail), selon le circuit ci-dessous.
3. Vérifier (tests, captures), publier, puis cocher la feuille de route et mettre à jour « Où en est-on ? ».
4. Noter toute décision dans le [journal des décisions](08-journal-des-decisions.md) et chaque évolution dans le journal des modifications.

## Le circuit d'un nouvel outil

| Étape | Ce qu'on fait | Résultat |
|---|---|---|
| 1. Besoin | Choisir le besoin dans [02-besoins-clients.md](02-besoins-clients.md) selon la priorité (P1 d'abord) et vérifier les recherches Google visées. | Une ligne de la feuille de route passe « en cours ». |
| 2. Règles | Rechercher chaque chiffre sur la source officielle du pays ; l'enregistrer dans `data/rules/<pays>.json` avec source, date et niveau de confiance ; documenter dans `documentation/pays/<pays>.md`. | Aucun chiffre sans source. |
| 3. Moteur | Écrire ou réutiliser un moteur pur dans `src/assets/engines/`. Écrire les tests unitaires **avant** l'interface : exemples officiels, cas calculés à la main, cas limites (0, seuils, plafonds, montants négatifs). | `node --test tests/unit/*.test.mjs` passe. |
| 4. Page | Créer `content/<section>/<page>.html` avec le gabarit d'outil : promesse, outil, explications, FAQ, sources, outils liés, offre. Ajouter la page au menu (`site.json`). | Page complète, rédigée pour l'utilisateur, pas pour Google. |
| 5. Vérification | `python3 build.py` puis `node tests/e2e/verifier.mjs <dossier-captures>` : calculs, mémorisation, copie, absence d'erreur, affichage sans débordement sur ordinateur, tablette et mobile, accessibilité (règles WCAG 2.1 A et AA d'axe-core sur chaque page dans les trois formats, sur ordinateur à l'ouverture et après le parcours, et sur les écrans de l'Espace). Relire les captures d'écran. | Tous les tests passent ; rendu relu. |
| 6. Publication | Commit clair, envoi sur `main`, vérification que la publication GitHub Pages a réussi. | Page en ligne. |
| 7. Suivi | Cocher la feuille de route ; après indexation, suivre impressions et clics dans Search Console. | La page vit et s'améliore. |

## Définition de « terminé »

Une page n'est terminée que si :

- [ ] chaque chiffre vient de `data/rules/` et sa source est affichée ;
- [ ] le moteur a des tests unitaires qui passent ;
- [ ] les tests navigateur couvrent le calcul principal, la mémorisation et l'affichage mobile ;
- [ ] aucune violation des règles WCAG 2.1 A et AA relevée par axe-core, à l'ouverture et après le parcours (résultats,
      erreurs) ;
- [ ] titre de 60 caractères environ, description de 150 environ, une seule balise `h1`, FAQ de 3 à 6 questions ;
- [ ] la page est reliée : menu, grille d'accueil, outils liés, pages équivalentes des autres pays (`id` commun) ;
- [ ] le texte est relu : ton simple, phrases courtes, aucune promesse que l'outil ne tient pas ;
- [ ] l'avertissement « à titre indicatif » et le renvoi vers la source officielle sont présents.

## Règles de rédaction

- **Pour l'utilisateur d'abord** : la réponse en haut, les explications ensuite.
- **Langue locale** : vocabulaire du pays (*sole trader* au Royaume-Uni, *sole proprietor* aux États-Unis, « travailleur autonome » au Québec, « micro-entrepreneur » en France).
- **Pas de copie entre pays** : une page anglaise n'est pas une traduction d'une page française ; elle répond aux questions du pays.
- **Aucun chiffre inventé**, aucun témoignage inventé, aucune statistique sans source.
- **Prudence juridique** : on informe et on calcule ; on ne remplace pas un expert-comptable ou un avocat, et on le dit.

## Conventions techniques

| Sujet | Convention |
|---|---|
| Noms de fichiers | `content/<section>/<slug-sans-slash>.html`, scripts en minuscules avec tirets |
| Identifiants de page (`id`) | anglais, courts : `invoice`, `rate`, `tax`, `salestax`, `latefee`, `reminder`, `templates`, `invoice-rules`, `legal`, `privacy` |
| Clés des règles | anglais, `snake_case`, unité explicite si besoin (`ss_wage_base`, `vat_registration_threshold`) |
| Taux | toujours en décimal dans les données (`0.256`), affichés en pourcentage |
| Stockage navigateur | clés préfixées `of:` puis section et outil (`of:us:rate`) |
| Commits | message en français, à l'impératif ou descriptif, une évolution par commit |
| Branche | `main` = ce qui est en ligne |

## Calendrier de mise à jour des chiffres

| Période | Pays | Ce qui change | Où vérifier |
|---|---|---|---|
| Janvier | France | Taux Urssaf, PASS, SMIC, barème de l'impôt (loi de finances), taux d'intérêt légal du 1er semestre | urssaf.fr, impots.gouv.fr, banque-france.fr |
| Juillet | France | Taux d'intérêt légal du 2e semestre, éventuels changements au 1er juillet | banque-france.fr, service-public.fr |
| Octobre – novembre | États-Unis | Plafond de la sécurité sociale (SSA, octobre), barèmes et déduction forfaitaire (IRS), taux kilométrique (décembre) | ssa.gov, irs.gov |
| Novembre (Budget) puis 6 avril | Royaume-Uni | Barèmes, *National Insurance*, seuils de TVA, *Making Tax Digital* | gov.uk |
| 30 juin et 31 décembre | Royaume-Uni | Taux de référence des intérêts de retard (taux de la Banque d'Angleterre) | bankofengland.co.uk |
| Novembre – décembre | Canada | Indexation des barèmes (ARC), MGA du RPC, taux du RRQ et du RQAP | canada.ca, retraitequebec.gouv.qc.ca, revenuquebec.ca |
| Printemps | Canada | Budgets provinciaux | sites des provinces |

| Décembre | Tous | Calendriers fiscaux de l'année suivante : jours fériés, dates publiées (déclaration de revenus en France, MTD, etc.) | `scripts/calendriers.py`, puis `python3 scripts/calendriers.py` |

À chaque mise à jour : modifier `data/rules/<pays>.json` (valeur, source, `verified_on`), relancer les tests, mettre à jour la fiche pays et le journal des modifications.

## Outils de travail

| Commande | Rôle |
|---|---|
| `python3 build.py` | Génère le site dans `docs/` |
| `node --test tests/unit/*.test.mjs` | Tests des moteurs de calcul |
| `node tests/e2e/verifier.mjs /tmp/captures` | Tests navigateur, accessibilité (axe-core) et captures d'écran |
| `sh tests/e2e/installer-axe.sh` | Installe axe-core 4.14.0 dans `~/.cache/axe-core` (ou le dossier donné, alors indiqué par `AXE_CORE`) |
| `python3 -m json.tool data/rules/us.json` | Vérifie qu'un fichier de règles est valide |
| Workflow « Lire une source officielle » (GitHub Actions, à la demande) | Lit une page ou un PDF d'un site officiel inaccessible depuis l'environnement de travail (CNIL, Légifrance, BOFiP…) et affiche le texte ou les passages autour des mots cherchés, avec la date et l'empreinte du fichier (`scripts/lire_source.py` ; sites officiels seulement, lecture seule). Une règle lue ainsi en entier n'est plus « lue par extraits ». Légifrance refuse ces lectures automatiques (réponse 403) : pour un article de code, lire la fiche officielle qui le cite (CNIL, service-public.fr) ou l'article sur EUR-Lex pour un texte européen |

## Journal des modifications

Chaque évolution notable est notée dans [CHANGELOG.md](../CHANGELOG.md) : date, ce qui change, pourquoi.
