# 20. Checklist de création : les démarches pour démarrer

Besoin P2 de [02](02-besoins-clients.md) (§ 1, « Les démarches pour démarrer ») : « Checklist interactive de
création », dans les quatre pays. Spécification du 22/10/2026, avant le code (charte qualité,
[04](04-methode-de-travail.md)).

## 1. Principe commun

**Question** : « Je me lance comme indépendant : quelles démarches faire, dans quel ordre, et lesquelles me
restent ? »

- **Une page par section**, identifiant `start`, dans le premier groupe du menu (« Statut et revenus » en France).
  Statut couvert : celui par lequel la plupart des indépendants commencent (micro-entreprise en France, *sole
  proprietor* aux États-Unis, *sole trader* au Royaume-Uni, entreprise individuelle au Canada) ; la page renvoie au
  comparateur de statuts pour les sociétés.
- **Étapes dans l'ordre** (avant de se déclarer, se déclarer, dès les premières factures, pendant la première
  année), chacune avec une phrase d'explication, un lien vers l'outil du site qui aide à la faire quand il existe,
  et une ou plusieurs règles sourcées (`data-rule`) : **aucune étape sans source officielle**.
- **Situation** : quelques questions (par exemple vente de marchandises, ACRE) qui montrent ou cachent les étapes
  concernées, mémorisées comme dans les autres listes.
- **Cases cochées mémorisées** dans le navigateur (les démarches s'étalent sur des semaines), progression « X
  démarches sur Y » ; une étape seulement conseillée est montrée, marquée « conseillé », et n'entre pas dans le
  compte (même règle que D18).
- **Réutilisation** : script commun `tools/checklist.js`, étendu pour mémoriser les cases (`data-persist` sur la
  liste, `data-id` sur chaque étape) et accepter des intertitres (`li.cl-group`, sans case, jamais comptés).
- **Chiffres** (délais, seuils, dates) écrits dans la page et vérifiés par test contre les règles.

## 2. France : créer sa micro-entreprise (`/fr/creer-sa-micro-entreprise/`)

Situation : « Je vends des marchandises » (plafond, seuil de TVA et registre des achats propres à la vente) ;
« Je peux bénéficier de l'ACRE » (demandeur d'emploi indemnisé, moins de 26 ans, etc. : règle `acre_conditions`).

| Étape | Règles |
|---|---|
| **Avant de vous déclarer** | |
| Vérifier que l'activité peut s'exercer en micro-entreprise (activités agricoles, la plupart des professions libérales réglementées et activités immobilières exclues) | `micro_activites_exclues` (nouvelle) |
| Vérifier le plafond de chiffre d'affaires (services 83 600 €, vente 203 100 €) | `micro_plafond_ca_services`, `micro_plafond_ca_vente` |
| Choisir l'adresse de l'entreprise (domicile possible sauf disposition légale ou clause contraire) | `domiciliation_domicile` (nouvelle) |
| Préparer les pièces : pièce d'identité, numéro de sécurité sociale, déclaration de non-condamnation | `creation_guichet_unique` (nouvelle) |
| **Vous déclarer** | |
| Déclarer le début d'activité sur le guichet unique (formalites.entreprises.gouv.fr), gratuit sauf pour les agents commerciaux | `creation_guichet_unique` |
| Demander l'ACRE au plus tard 60 jours après le début d'activité (si éligible) | `acre_conditions` |
| Choisir ou non le versement libératoire (sous condition de revenu fiscal, au plus tard 3 mois après la création) | `versement_liberatoire_option`, `vl_rfr_plafond_par_part_2026` |
| Une fois le numéro SIRET reçu, créer son espace sur autoentrepreneur.urssaf.fr | `micro_declaration_ca` (nouvelle) |
| **Dès les premières factures** | |
| Ajouter « EI » ou « entrepreneur individuel » à son nom sur tous les documents professionnels | `mention_ei_documents` (nouvelle) |
| Facturer avec les mentions obligatoires, dont la mention de franchise de TVA | `mentions_obligatoires_facture`, `mention_franchise_tva` |
| Tenir un livre des recettes ; registre des achats en plus pour la vente | `livre_recettes_micro` |
| Pouvoir recevoir des factures électroniques depuis le 1er septembre 2026 (plateforme agréée) | `facturation_electronique_calendrier`, `plateformes_agreees` |
| Vérifier les assurances obligatoires pour son activité (décennale, véhicule…) | `assurance_rc_pro`, `assurance_decennale`, `assurance_rc_auto` |
| Conseillé : compte bancaire dédié (obligatoire au-delà de 10 000 € deux années civiles de suite) | `compte_dedie_micro`, `compte_dedie_urssaf` |
| **Pendant la première année** | |
| Déclarer son chiffre d'affaires chaque mois ou trimestre, même nul | `micro_declaration_ca`, `calendrier_urssaf_declarations` |
| Déposer la déclaration initiale de CFE (1447-C-SD) au plus tard le 31 décembre de l'année de création | `cfe_declaration_initiale` (nouvelle) |
| Créer son espace professionnel sur impots.gouv.fr (avis de CFE en ligne seulement) | `cfe_echeance` |
| Surveiller le seuil de franchise de TVA (37 500 € pour les services, 85 000 € pour la vente) | `tva_franchise_seuils` |
| Reporter son chiffre d'affaires sur la déclaration de revenus (2042-C-PRO), même avec le versement libératoire | `micro_declaration_revenus` (nouvelle) |

Non publiés faute de source concordante : le montant de la pénalité pour une déclaration de chiffre d'affaires
manquante (50 € ou 58 € selon les pages de l'Urssaf).

## 3. Royaume-Uni : *How to become a sole trader* (`/uk/how-to-become-a-sole-trader/`, 22/10/2026)

Situation : « I'll trade under a business name » (règles du nom) ; « I'll run my business from home ».

| Étape | Règles |
|---|---|
| Nom commercial conforme : ni *limited*, *Ltd*, *LLP*, *plc*, ni nom offensant ou déjà déposé ; mots sensibles soumis à autorisation | `uk_business_name_rules` (nouvelle, GOV.UK) |
| Licence ou permis selon l'activité (*licence finder*) | `uk_licences` (nouvelle) |
| Domicile : prêteur ou bailleur, assureur, conseil local (urbanisme, *business rates*) | `uk_business_from_home` (nouvelle) |
| Numéro de National Insurance | `uk_register_sole_trader` (nouvelle) |
| Inscription à la Self Assessment au-delà de 1 000 £ de recettes, au plus tard le 5 octobre suivant la fin de l'année fiscale | `uk_register_sole_trader`, `sa_registration_deadline`, `trading_allowance` |
| Redevance de protection des données de l'ICO, sauf exemption (montants non publiés : pages discordantes) | `uk_ico_fee` (nouvelle) |
| Nom (et nom commercial) sur les factures | `invoice_requirements_sole_trader` |
| Registres de recettes et dépenses, gardés 5 ans après la date limite du 31 janvier | `uk_records_retention` (nouvelle) |
| *Making Tax Digital for Income Tax* au-delà de 50 000 £ (à partir d'avril 2026, sur une déclaration antérieure) | `mtd_itsa_threshold_2026` |
| Seuil d'immatriculation à la TVA (90 000 £ sur 12 mois glissants) | `vat_registration_threshold` |
| Déclaration en ligne avant le 31 janvier, paiement du solde et acomptes (*payments on account*) | `sa_online_return_deadline`, `sa_balancing_payment_deadline`, `payments_on_account_dates`, `payments_on_account_threshold` |

10 étapes comptées par défaut, 12 au plus. Un test vérifie que **chaque montant écrit dans les étapes** (France et
Royaume-Uni) est celui d'une règle.

## 4. États-Unis et Canada

Même principe, recherches à faire avant le code : nom commercial (*DBA*), EIN facultatif, licences et permis, taxe
de vente de l'État, W-9, acomptes trimestriels (États-Unis) ; enregistrement du nom dans la province, numéro
d'entreprise, TPS/TVH et TVQ au-delà de 30 000 $, acomptes provisionnels (Canada).

## 5. Critères de « terminé »

- Chaque étape porte au moins une règle existante, citée dans les sources de la page ; chaque chiffre de la page est
  vérifié contre sa règle (test).
- Nombre d'étapes comptées selon la situation (test) ; conditions limitées aux champs de situation mémorisés.
- Parcours navigateur : situation, cases mémorisées après rechargement, progression et messages, accessibilité,
  captures relues ; revue critique.
