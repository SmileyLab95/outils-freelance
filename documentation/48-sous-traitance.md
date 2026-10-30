# 48. Contrat de sous-traitance (4 pays) — en préparation

Besoin P3 de [02](02-besoins-clients.md) (« Sous-traiter : modèle de contrat de sous-traitance »), étape 6 de
[31](31-vision-plateforme.md) § 5. **Document de travail** : sources lues à ce jour, avant la spécification.

## Besoin

Un indépendant qui confie une partie d'une mission à un autre indépendant (graphisme, développement, rédaction…) veut un
contrat écrit avec lui : ce qu'il confie, le prix et le délai de paiement, les clauses du contrat principal qu'il doit
reprendre (confidentialité, propriété intellectuelle, délais), la cession des droits qui lui permet de les céder à son
client, la responsabilité, la fin du contrat si le contrat principal s'arrête, et ce que la loi exige en plus selon le
pays. Le cas inverse (l'indépendant sous-traitant d'une agence) est couvert par le même document, vu de l'autre côté.

## France : en attente (décision D50)

La loi n° 75-1334 du 31 décembre 1975 relative à la sous-traitance (acceptation du sous-traitant et agrément de ses
conditions de paiement par le maître de l'ouvrage, caution ou délégation de paiement à peine de nullité du sous-traité,
action directe) ne peut pas être lue sur Légifrance : refus de l'outil de lecture des sources (réponse 403 le
30/10/2026, comme la fiche de la direction des affaires juridiques du ministère de l'Économie), site non autorisé dans
l'environnement de travail. Aucune règle n'est tirée de rapports parlementaires, de questions écrites ou de fiches sur
les marchés publics. Action préparée pour Ismail dans la feuille de route : autoriser `www.legifrance.gouv.fr` et
`www.economie.gouv.fr` dans les réglages réseau de l'environnement.

## Sources lues (30/10/2026, outil « Lire une source officielle »)

| Source | Lecture | Contenu relevé |
|---|---|---|
| Code civil du Québec, art. 2098 à 2103 (LégisQuébec, CCQ-1991) | Lus | Art. 2098 : contrat d'entreprise ou de service ; art. 2099 : libre choix des moyens d'exécution, aucun lien de subordination ; art. 2100 : agir au mieux des intérêts du client, avec prudence et diligence, selon les règles de l'art ; **art. 2101** : « À moins que le contrat n'ait été conclu en considération de ses qualités personnelles ou que cela ne soit incompatible avec la nature même du contrat, l'entrepreneur ou le prestataire de services peut s'adjoindre un tiers pour l'exécuter ; il conserve néanmoins la direction et la responsabilité de l'exécution » ; art. 2102 : information du client avant le contrat |
| États-Unis : lois *Freelance Isn't Free* (règles `freelance_law_new_york_state`, `freelance_law_nyc`, `freelance_law_illinois`, lues le 30/10/2026) | Déjà lues | La partie qui engage un indépendant (*hiring party* : dans l'État de New York, toute personne sauf les États-Unis, l'État, les municipalités et les gouvernements étrangers ; même notion pour la ville) doit lui remettre un contrat écrit (dès 800 $, seul ou cumulé sur 120 jours) et le payer à la date convenue : un indépendant qui sous-traite à un autre indépendant est donc lui-même tenu de ces obligations à New York ; Illinois (dès 500 $ sur 120 jours) : définition de la partie qui engage à relire dans la loi, non lisible le 30/10/2026 |
| États-Unis : formulaire 1099-NEC (règle `form_1099_nec_threshold_2026`) | Déjà lue | Déclaration par le payeur à partir de 2 000 $ par bénéficiaire et par an pour les paiements faits après le 31/12/2025 : l'indépendant qui paie un sous-traitant américain la remplit (formulaire W-9 à demander au sous-traitant) |

## Reste à lire avant la spécification

- Royaume-Uni : règles du travail hors masse salariale (*off-payroll working*, IR35) quand le sous-traitant travaille
  par sa propre société (qui décide du statut selon la taille du client), la page lue le 30/10/2026 n'ayant donné que
  la navigation ; *Construction Industry Scheme* et *Housing Grants, Construction and Regeneration Act 1996* pour
  exclure la construction du champ.
- Canada : déclarations de paiements aux sous-traitants hors construction (feuillet T4A) : sources de canada.ca, en
  attente de l'accès au site.
- France : loi du 31 décembre 1975 (ci-dessus).
