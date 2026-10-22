# 22. Client étranger aux États-Unis, et formulaire W-8BEN pour un client américain

Besoins P2 de [02](02-besoins-clients.md) : « Facturer un client étranger » (§ 5, colonne États-Unis, 🟡) et
« Formulaires fiscaux : W-8BEN » (§ 7). Spécification du 22/10/2026 : règles recherchées le 22/10/2026 sur les
sites officiels (IRS, FinCEN, Commission européenne, GOV.UK, ARC), lues par extraits de recherche (les sites de l'IRS
et de l'ARC ne s'ouvrent pas directement depuis l'environnement de travail). **§ 1 et § 2 réalisés le 22/10/2026.**

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
| Taxe du pays du client, client entreprise | Pas de taxe étrangère sur la facture : dans l'UE et au Royaume-Uni, le client l'autoliquide (lieu de la prestation chez lui) ; garder son numéro de TVA comme preuve | `eu_b2b_reverse_charge` (Commission européenne, art. 44 et 196 de la directive), `uk_b2b_reverse_charge_overseas` (GOV.UK, Notice 741A § 5) |
| Taxe du pays du client, particulier, service numérique | UE : TVA du pays du client dès la première vente, guichet *non-Union OSS* dans un État au choix, déclaration trimestrielle ; Royaume-Uni : immatriculation dès la première vente (aucun seuil pour une entreprise non établie), sous 30 jours | `eu_non_union_scheme`, `uk_netp_no_threshold` (Notice 700/1) |
| Canada, particulier, tout service rendu à distance | Inscription au régime simplifié au-delà de 30 000 $ CA sur 12 mois : l'ARC l'applique aux services « traditionnels » (juridiques, comptables) comme aux produits numériques ; TPS ou TVH de la province du client | `ca_simplified_regime` (ARC) |
| Canada, client entreprise | Pas de TPS/TVH à facturer par un non-résident qui n'exploite pas d'entreprise au Canada, si le client donne son numéro d'inscription ; le client autocotise | `ca_b2b_nonresident` (RC4027) |
| UE et Royaume-Uni, particulier, autre service | « *Usually no foreign tax* » : en règle générale taxé là où le prestataire est établi (hors de l'UE et du Royaume-Uni), avec les exceptions signalées (utilisation effective dans certains États de l'UE, services liés à un lieu) | `eu_b2c_general_rule` (art. 45, 58, 59a), `place_of_supply_services_b2c` (Notice 741A) |
| Autres pays | Renvoi à l'administration du pays du client (Australie, Suisse, Norvège… ont leurs propres règles pour les services numériques) | aucune |
| Taxe de vente des États | Non traitée : aucune règle générale officielle pour un client étranger (règles différentes selon les États) ; renvoi aux règles de l'État | `states_tax_services_by_default` (existante) ; question ouverte |
| Revenu aux États-Unis | Revenu imposable comme les autres (annexe C), même sans formulaire 1099 ; en dollars : cours du jour de réception, ou cours moyen annuel publié par l'IRS pour un revenu reçu régulièrement, appliqué de façon constante | `us_foreign_currency_translation` (IRS, cours moyens annuels en note) |
| Impôt retenu par le pays du client | Demander le taux de la convention fiscale avec le formulaire 6166 (demande par le formulaire 8802) ; crédit d'impôt étranger (formulaire 1116) limité à l'impôt américain sur le revenu **de source étrangère** : un travail fait aux États-Unis donne un revenu de source américaine, sauf disposition d'une convention | `us_form_6166` (IRS), `us_ftc_source_rule` (IRS, Pub. 514) |
| Comptes à l'étranger | FBAR (FinCEN 114) si les comptes financiers à l'étranger dépassent 10 000 $ au total à un moment de l'année ; 15 avril, prolongation automatique au 15 octobre | `us_fbar` (IRS, FinCEN) |
| Facture | Montant dans la devise convenue ; numéro de TVA du client de l'UE ou du Royaume-Uni ; mention d'autoliquidation proposée comme suggestion (aucune formulation imposée trouvée pour un prestataire hors de l'UE) | `eu_b2b_reverse_charge` |

**Non publiés** (aucune source officielle sûre) : l'obligation pour un payeur étranger de remettre un 1099 ; les
règles de taxe de vente de chaque État pour un client étranger.

### Réalisation (22/10/2026)

- Situation : pays du client (UE, Royaume-Uni, Canada, ailleurs), entreprise ou particulier, service à distance,
  numérique automatisé ou lié à un lieu, travail fait aux États-Unis ou en partie à l'étranger (qui ne change que le
  texte sur la retenue étrangère et le crédit d'impôt). Verdicts : *No foreign tax to charge*, *Foreign VAT from your
  first sale*, *Usually no foreign tax*, *Canadian tax above C$30,000*, *It depends* (service lié à un lieu, autre
  pays). Démarches américaines toujours affichées : revenu en dollars, retenue étrangère, FBAR, taxe de vente des
  États.
- Règles : huit règles communes dans `data/rules/shared.json` (décision D24 : la règle du guichet non-Union et le lieu
  de prestation britannique y sont déplacés depuis uk.json), quatre règles américaines dans us.json ; trois questions
  ouvertes ajoutées à us.json (taxe de vente des États pour un client étranger, 1099 d'un payeur étranger, conventions
  qui changent la source du revenu).
- Tests : moteur sur les 48 situations (réponse écrite à partir de cette table), textes de la page (une clé = un
  texte, aucun texte inutilisé), montants, délais, numéros de formulaires et États repris des règles ; parcours
  navigateur ; 9 erreurs réintroduites, toutes détectées. Revue : libellés des services raccourcis (texte tronqué
  dans la liste sur ordinateur).

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

### Réalisation (22/10/2026)

- Section « Client américain : le formulaire W-8BEN » / « US clients: Form W-8BEN » à la fin de la partie explicative
  des quatre pages, avant la note des sources, et une question dans la FAQ ; règles communes `w8ben_purpose`,
  `w8ben_services_outside_us`, `w8ben_validity` (shared.json) citées dans les sources de chaque page.
- Non publiés : quel numéro fiscal national inscrire en ligne 6a (non vérifié pays par pays), le délai pour remettre
  un nouveau formulaire après un changement de situation (non confirmé).
- Tests : `w8ben.test.mjs` (règles citées, 30 %, W-8BEN-E, formulaire 8233 et durée repris des règles, même texte
  dans les pages d'une même langue) ; 6 erreurs réintroduites, toutes détectées. Revue des captures : les noms de
  formulaires se coupaient au trait d'union en fin de ligne (« W-/8BEN-E ») : insécables désormais.

## 3. Critères de « terminé »

- Règles ajoutées avec source et niveau de confiance ; questions ouvertes notées dans [pays/us.md](pays/us.md).
- Moteur `engines/international-us.js` (situation → verdicts et démarches sous forme de clés), testé sur toutes les
  combinaisons et contrôlé par mutation ; textes dans la page.
- Sections W-8BEN : montants et délais vérifiés contre les règles (test) ; mêmes points en anglais et en français
  au Canada.
- Parcours navigateur, accessibilité, captures relues ; revue critique.
