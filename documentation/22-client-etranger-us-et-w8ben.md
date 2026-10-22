# 22. Client étranger aux États-Unis, et formulaire W-8BEN pour un client américain

Besoins P2 de [02](02-besoins-clients.md) : « Facturer un client étranger » (§ 5, colonne États-Unis, 🟡) et
« Formulaires fiscaux : W-8BEN » (§ 7). Spécification du 22/10/2026, **brouillon** : règles recherchées le
22/10/2026 sur les sites officiels (IRS, Commission européenne, GOV.UK, ARC), lues par extraits de recherche (les
sites de l'IRS et de l'ARC ne s'ouvrent pas directement depuis l'environnement de travail) ; chaque règle sera
ajoutée à `data/rules/` avec sa source avant le code.

## 1. États-Unis : *Invoicing international clients* (`/us/invoicing-international-clients/`)

**Question** : « J'ai un client hors des États-Unis : dois-je facturer une taxe étrangère, comment déclarer ce revenu
et que faire si mon client retient un impôt ? » Même identifiant `international` que les pages de la France, du
Royaume-Uni et du Canada (liens de langue et de pays).

**Situation** (assistant, comme au Royaume-Uni) : pays du client (Union européenne, Royaume-Uni, Canada, autre) ;
client entreprise ou particulier ; service numérique automatisé (téléchargement, cours préenregistré, logiciel en
ligne) ou autre service rendu à distance (conseil, design, rédaction, cours en direct) ; travail fait aux
États-Unis ou en partie à l'étranger.

| Sujet | Réponse | Règle (nouvelle sauf mention) |
|---|---|---|
| Taxe du pays du client, client entreprise | Pas de taxe étrangère sur la facture : dans l'UE et au Royaume-Uni, le client l'autoliquide (lieu de la prestation chez lui) ; garder son numéro de TVA comme preuve | `eu_b2b_reverse_charge` (Commission européenne, art. 44 et 196 de la directive), `uk_b2b_reverse_charge` (GOV.UK, Notice 741A) |
| Taxe du pays du client, particulier, service numérique | UE : TVA du pays du client dès la première vente, guichet *non-Union OSS* dans un État au choix, déclaration trimestrielle ; Royaume-Uni : immatriculation dès la première vente (aucun seuil pour une entreprise non établie) ; Canada : inscription simplifiée au-delà de 30 000 $ CA sur 12 mois | `eu_non_union_scheme` (reprise de uk.json), `uk_netp_no_threshold` (Notice 700/1), `ca_digital_nonresident_threshold` (ARC) |
| Taxe du pays du client, particulier, autre service | Réponse prudente (« It depends ») : en règle générale taxé là où le prestataire est établi, donc pas de TVA de l'UE, mais des règles particulières existent (biens immobiliers, événements, règle d'utilisation effective de certains États) | `eu_b2c_general_rule` (art. 45) ; question ouverte |
| Autres pays | Renvoi à l'administration du pays du client (Australie, Suisse, Norvège… ont leurs propres règles pour les services numériques) | aucune |
| Taxe de vente des États | Non traitée : aucune règle générale officielle pour un client étranger (règles différentes selon les États) ; renvoi aux règles de l'État | `states_tax_services_by_default` (existante) ; question ouverte |
| Revenu aux États-Unis | Revenu imposable comme les autres (annexe C), même sans formulaire 1099 ; en dollars : cours du jour de réception, ou cours moyen annuel publié par l'IRS pour un revenu reçu régulièrement, appliqué de façon constante | `us_foreign_currency_translation` (IRS), `us_yearly_average_rates` (IRS) |
| Impôt retenu par le pays du client | Demander le taux de la convention fiscale avec le formulaire 6166 (demande par le formulaire 8802) ; crédit d'impôt étranger (formulaire 1116) limité à l'impôt américain sur le revenu **de source étrangère** : un travail fait aux États-Unis donne un revenu de source américaine, sauf disposition d'une convention | `us_form_6166` (IRS), `us_ftc_source_rule` (IRS, Pub. 514) |
| Comptes à l'étranger | FBAR (FinCEN 114) si les comptes financiers à l'étranger dépassent 10 000 $ au total à un moment de l'année ; 15 avril, prolongation automatique au 15 octobre | `us_fbar` (IRS, FinCEN) |
| Facture | Montant dans la devise convenue ; numéro de TVA du client de l'UE ou du Royaume-Uni ; mention d'autoliquidation proposée comme suggestion (aucune formulation imposée trouvée pour un prestataire hors de l'UE) | `eu_b2b_reverse_charge` |

**Non publiés** (aucune source officielle sûre) : l'obligation pour un payeur étranger de remettre un 1099 ; les
règles de taxe de vente de chaque État pour un client étranger.

## 2. Formulaire W-8BEN (France, Royaume-Uni, Canada en anglais et en français)

**Question** : « Mon client américain me demande un W-8BEN : qu'est-ce que c'est, faut-il le remplir, et va-t-il
retenir 30 % ? » Une section dans chaque page « client étranger » existante (et pas une page à part), puisque c'est
la même question : facturer un client hors de son pays.

| Point | Règle (IRS) |
|---|---|
| Formulaire remis au client (pas à l'IRS), à sa demande, avant le paiement, par une personne physique non résidente ; une société remplit le W-8BEN-E | `w8ben_purpose` (instructions du W-8BEN, rév. octobre 2021) |
| Travail fait hors des États-Unis : revenu de source étrangère, sans retenue américaine ni déclaration 1042-S ; partage au prorata du temps si une partie est faite aux États-Unis | `w8ben_services_outside_us` (Pub. 515, 2026) |
| Sans formulaire, le client peut devoir retenir 30 % (ou la retenue de sauvegarde) | `w8ben_purpose` |
| Services rendus **aux** États-Unis : formulaire 8233 (exemption par convention), pas le W-8BEN | `w8ben_purpose` |
| Validité : jusqu'au 31 décembre de la troisième année suivant la signature, sauf changement de situation | `w8ben_validity` |

## 3. Critères de « terminé »

- Règles ajoutées avec source et niveau de confiance ; questions ouvertes notées dans [pays/us.md](pays/us.md).
- Moteur `engines/international-us.js` (situation → verdicts et démarches sous forme de clés), testé sur toutes les
  combinaisons et contrôlé par mutation ; textes dans la page.
- Sections W-8BEN : montants et délais vérifiés contre les règles (test) ; mêmes points en anglais et en français
  au Canada.
- Parcours navigateur, accessibilité, captures relues ; revue critique.
