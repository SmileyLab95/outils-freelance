# 45. Conditions générales de vente au Royaume-Uni (*terms and conditions*)

Besoin P3 de [02](02-besoins-clients.md) (« générateur de CGV »), étape 6 de [31](31-vision-plateforme.md) § 5. La
France a son générateur depuis le 29/10/2026 ([40](40-cgv.md)) ; le Royaume-Uni suit (décision D39 : chaque pays après
la lecture de ses propres sources). Spécification avant le code, 30/10/2026, après la lecture en entier des sources
ci-dessous.

## 1. Besoin

Un indépendant établi au Royaume-Uni (*sole trader*, société *limited* ou *partnership*) qui vend des prestations de
services veut des *terms and conditions* à joindre à ses devis : adaptés à sa clientèle (entreprises, particuliers ou
les deux) et à la façon dont il conclut ses contrats (à distance, chez le client, dans ses locaux), avec les
informations obligatoires, sans clause abusive, et la liste de ce qu'il reste à faire. Comme en France, le générateur
ne remplace pas un avocat (*solicitor*) et la page le dit.

**Champ** : prestations de services, droit de l'Angleterre et du pays de Galles, de l'Écosse ou de l'Irlande du Nord.
**Hors champ** (signalé sur la page) : vente de biens et de contenus numériques (règles propres de la loi de 2015 et du
règlement de 2013), abonnements et contrats reconduits automatiquement, services financiers, règles d'une profession
réglementée, clients établis hors du Royaume-Uni.

## 2. Règles

Toutes lues **en entier** le 30/10/2026 avec l'outil « Lire une source officielle » (version révisée à jour de
legislation.gov.uk) ; empreintes SHA-256 dans les notes des règles (`data/rules/uk.json`).

| Règle | Source | Usage |
|---|---|---|
| Tout prestataire de services donne ses coordonnées pour les réclamations : adresse postale, fax **ou** email, **et un numéro de téléphone** ; et, en temps utile avant le contrat, son nom, son statut et sa forme juridique, son adresse géographique et de quoi le joindre rapidement (email s'il en a un), son registre et son numéro, son numéro de TVA, son organisme professionnel, ses conditions générales s'il en a, les clauses de loi applicable et de juridiction, le prix, les caractéristiques, l'assurance obligatoire ; il répond aux réclamations aussi vite que possible et fait de son mieux pour trouver une solution | Provision of Services Regulations 2009 (SI 2009/2999), regs. 7 à 12 ; `uk_service_provider_information` (nouvelle) | Article « About us », contrôles (adresse, téléphone, numéro de société, de TVA), article « Complaints » |
| Avec un consommateur : informations avant le contrat (annexe 2 du règlement de 2013 : prix total TTC, paiement, délai, réclamations, conditions de l'annulation…) ; contrat à distance : confirmation sur un support durable **avant le début de la prestation** ; hors établissement : informations sur papier (ou autre support durable accepté), copie ou confirmation, formulaire d'annulation | Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 (SI 2013/3134), Part 1 (définitions), Part 2, annexe 2 ; `uk_consumer_contract_information` (nouvelle) | Articles « Quotes and contract », « Prices » (TVA comprise pour les particuliers) |
| **Annulation** (*cancellation*) d'un contrat de services à distance ou hors établissement : 14 jours après le jour de la conclusion, sans motif ; déclaration claire ou formulaire type ; envoi avant la fin du délai suffisant ; remboursement de tous les paiements sous 14 jours après en avoir été informé, par le même moyen, sans frais ; pas de prestation pendant le délai **sans demande expresse** (sur un support durable hors établissement) ; montant proportionnel à ce qui a été fourni ; droit perdu une fois le service entièrement exécuté à la demande du client, qui l'a reconnu ; délai prolongé jusqu'à 12 mois si l'information manque | SI 2013/3134, regs. 27 à 36 ; `uk_consumer_cancellation` (nouvelle) | Article « Cancellation (consumers) », annexe |
| Formulaire type d'annulation (annexe 3, partie B) et phrase type sur le paiement proportionnel (partie A, note 6) | SI 2013/3134, annexe 3 : publiée en image sur legislation.gov.uk (ni le HTML, ni le XML, ni le PDF d'origine n'en contiennent le texte) ; texte lu dans la publication du règlement par le ministère (BIS/13/1111, GOV.UK) et vérifié avec l'annexe I de la directive 2011/83/UE sur legislation.gov.uk ; `uk_cancellation_model_form` (nouvelle, confiance moyenne) | Annexe « Model cancellation form », mot pour mot, coordonnées du prestataire remplies |
| Droits du consommateur : prestation avec une **diligence raisonnable** (*reasonable care and skill*), ce qui est dit ou écrit sur le prestataire ou le service le lie, prix et délai raisonnables à défaut d'accord ; nouvelle exécution ou réduction du prix (remboursement sous 14 jours) ; ces droits ne peuvent être exclus ; jamais d'exclusion pour décès ou blessure par négligence | Consumer Rights Act 2015, ss. 2, 48 à 57, 65 ; `uk_consumer_service_rights` (nouvelle) | Articles « Your rights as a consumer », « Liability » |
| **Clauses abusives** envers un consommateur : non obligatoires (déséquilibre significatif contraire à la bonne foi), transparence, interprétation la plus favorable, liste grise (garder des sommes sans réciprocité, indemnité disproportionnée, résiliation discrétionnaire, modification ou prix fixés seul, cession sans accord…) ; guide de la CMA (CMA37, mis à jour le 22/07/2026) : acompte restituable sauf coûts réels, juridiction des tribunaux du lieu de résidence du consommateur, cession seulement avec son accord, prix confirmé à la commande | Consumer Rights Act 2015, Part 2 et annexe 2 ; CMA37 (GOV.UK) ; `uk_unfair_terms` (nouvelle) | Pas de limitation envers un particulier ; acompte ; juridiction ; cession ; modification des CGV |
| Entre entreprises : jamais d'exclusion pour décès ou blessure par négligence ; autres exclusions et limitations (conditions générales écrites) seulement si **raisonnables** ; pour un plafond chiffré, ressources et assurance du prestataire ; règles équivalentes en Écosse ; diligence raisonnable et délai raisonnable implicites (Angleterre, pays de Galles, Irlande du Nord) | Unfair Contract Terms Act 1977, Part I (ss. 1 à 3, 11, 13, 14), Part II (ss. 16, 17, 24, 25, Écosse) et annexe 2 ; Supply of Goods and Services Act 1982, Part II (ss. 12 à 16) ; `uk_business_exclusion_clauses` (nouvelle) | Article « Liability » (plafond au prix pour les clients professionnels), avertissement de la page |
| Retard de paiement entre entreprises : intérêt légal de 8 % au-dessus du taux de référence (11,75 % pour les dettes échues en 2026), indemnité fixe de 40, 70 ou 100 £ et frais raisonnables au-delà ; un taux contractuel doit être un « remède substantiel » ; délai au-delà de 60 jours : fin de la période de 60 jours, sauf délai non manifestement abusif | Late Payment of Commercial Debts (Interest) Act 1998, ss. 4 et 9 ; règles existantes `late_payment_statutory_interest_margin`, `late_payment_reference_rates`, `late_payment_fixed_compensation`, `late_payment_default_due_period` ; `late_payment_substantial_remedy` (nouvelle) | Article « Invoices and payment », contrôles (60 jours, taux contractuel plus bas) |
| Réclamations d'un consommateur : en y répondant, le professionnel l'informe de tout mode alternatif de règlement (ADR) auquel il est tenu de participer (loi, contrat) ; **pas d'obligation générale d'adhérer** à un médiateur (différence avec la France) ; les règlements ADR de 2015 sont **abrogés depuis le 6 avril 2026** | Digital Markets, Competition and Consumers Act 2024, Part 4, ch. 4 (s. 308, en vigueur le 06/04/2026) ; SI 2015/542 (abrogé) ; PSR 2009, reg. 10 ; `uk_complaints_adr` (nouvelle) | Article « Complaints » (ADR facultatif), page |

**Points signalés, non tranchés** : le texte définitif de l'annexe 3 est publié en image (le générateur reprend celui de
la publication du ministère, identique à la directive pour les parties utiles, et la règle le dit) ; les modifications
à venir de la loi de 2024 (regs. 7(4A) et 27(3A) du règlement de 2013, ss. 12(2A) et 37(2A) de la loi de 2015) ne sont
pas encore en vigueur et ne concernent pas les services ; l'outil ne juge pas si un plafond de responsabilité est
raisonnable : il le signale.

## 3. Outil

Page `/uk/terms-and-conditions-generator/`, identifiant `cgv` (mêmes liens de langue que la page française), menu
« Sell » après l'accord de confidentialité, comme en France.

**Formulaire** (enregistré sur l'appareil) :

- *About you* : nom, nom commercial (facultatif), statut (*sole trader*, *limited company*, *partnership*), pour une
  société : numéro, partie du Royaume-Uni où elle est immatriculée, siège ; adresse ; TVA (non immatriculé ou numéro) ;
  email ; téléphone ; politique de confidentialité ; organisme professionnel et assurance (facultatifs) ; prestations.
- *Your customers* : entreprises, particuliers ou les deux ; contrats à distance et/ou hors établissement ; ADR auquel
  le prestataire adhère (facultatif : nom, site).
- *Prices and payment* : sur devis, au jour ou à l'heure ; tarifs (facultatifs) ; validité des devis ; acompte ; délai
  de paiement ; moyens de paiement ; retard entre entreprises : intérêt légal (par défaut) ou taux contractuel.
- *Work and terms* : délai de vérification des livrables (entreprises) ; préavis ; propriété intellectuelle (cession
  après paiement ou licence) ; portfolio ; confidentialité ; plafond de responsabilité (entreprises) ; sous-traitance ;
  droit applicable (Angleterre et pays de Galles, Écosse, Irlande du Nord).

**Moteur** `engines/cgv-uk.js` (OFE.cgvUK, fonctions pures, testées) :

- `statutoryRate(rules, iso)` : taux de l'intérêt légal pour une dette échue à cette date (8 % + taux de référence du
  semestre), `null` si le semestre manque dans les règles.
- `cancellationForm(rules)` : formulaire type repris de la règle, coordonnées du prestataire, lignes à remplir.
- `prepare(raw, rules, today, fmt)` → repères (`has_pro`, `has_part`, `retract`…), textes calculés et **contrôles**
  (codes ; messages dans la page) : nom, adresse, téléphone et email (PSR reg. 7 et 8), numéro de société, numéro de TVA,
  délai de paiement illisible ou au-delà de 60 jours (entreprises), taux contractuel illisible ou plus bas que l'intérêt
  légal, semestre absent des règles, acompte, moyens de paiement, délais, politique de confidentialité, particuliers
  sans contrat à distance ni hors établissement (pas de droit d'annulation), ADR sans site, plafond de responsabilité à
  justifier.

**Script** : `tools/cgv.js`, commun à la France et au Royaume-Uni (moteur choisi selon la page) ; rendu
`engines/contract-doc.js` ; PDF, Word, copie.

**Texte** (anglais clair, « we » et « you », comme le recommande le guide CMA37) : About these terms ; About us ; Quotes
and the contract ; Prices ; Invoices and payment ; Carrying out the services ; Cancellation (consumers) ; Your rights as
a consumer ; Intellectual property ; Confidentiality ; Liability ; Events outside our control ; Ending the contract ;
Personal data ; Complaints ; Governing law and courts ; General ; Annex – Model cancellation form. Les dispositions
propres à une catégorie de clients le disent (« Business customers: … », « If you are a consumer, … »).

Choix de rédaction (clauses « plus probablement loyales » du guide CMA37) : l'acompte est déduit de la facture et,
si le contrat prend fin, seul le prix du travail fait et des frais engagés non récupérables est gardé ; la juridiction
des tribunaux de la partie du Royaume-Uni où vit le consommateur ; la cession du contrat seulement avec l'accord du
client ; les CGV en vigueur le jour de l'acceptation du devis ; aucune clause d'« entire agreement » ni de réception
tacite des livrables envers un particulier ; suspension pour impayé et plafond de responsabilité seulement entre
entreprises.

**Page** : avertissements au-dessus de l'aperçu ; explications : ce que contient le document, comment le faire
accepter (avec le devis, avant l'accord, support durable, version datée), ce qu'il faut faire en plus avec des
particuliers (informations avant le contrat, confirmation, formulaire, ne pas commencer sans demande expresse, bouton
« order with obligation to pay » sur un site), ce que le générateur ne couvre pas ; questions fréquentes ; sources.

## 4. Tests

- Moteur : taux légal par semestre (2026, semestre absent), formulaire mot pour mot depuis la règle, chaque contrôle
  présent et absent, repères selon la clientèle et la façon de conclure.
- Page : chaque combinaison (3 clientèles × distance / hors établissement / dans les locaux) rendue sans clé brute ;
  envers un particulier : pas de plafond, pas d'« entire agreement », pas de réception tacite, juridiction de son lieu
  de résidence ; formulaire présent si et seulement si l'annulation s'applique ; chiffres lus dans les règles (14 jours,
  8 %, 40/70/100 £, 60 jours) ; en-tête, menu, liens de langue avec la page française.
- Parcours navigateur : saisie, changements de clientèle, avertissements, annexe, Word, enregistrement, accessibilité,
  ordinateur, tablette et mobile ; erreurs réintroduites.

## 5. Réalisation (30/10/2026)

- Sources : seize textes lus en entier sur legislation.gov.uk (règlement de 2009, Part 2 ; règlement de 2013, Parts 1 à 3
  et annexe 2 ; loi de 2015, s. 2, Part 1 ch. 4, Part 2 et annexe 2 ; loi de 1977, Parts I et II et annexe 2 ; loi de
  1982, Part II ; loi de 1998, s. 9 ; loi de 2024, Part 4 ch. 4 ; règlement ADR de 2015, abrogé) ; le guide CMA37
  (juillet 2026) pour la juridiction et les acomptes. L'annexe 3 du règlement de 2013 n'existe qu'en image sur
  legislation.gov.uk (HTML, XML et PDF d'origine lus) : son texte vient de la publication du ministère (BIS/13/1111),
  identique à l'annexe I de la directive 2011/83/UE lue sur legislation.gov.uk (« cancel » au lieu de « withdraw »).
- Règles : neuf nouvelles dans `data/rules/uk.json` (`uk_service_provider_information`,
  `uk_consumer_contract_information`, `uk_consumer_cancellation`, `uk_cancellation_model_form` en confiance moyenne,
  `uk_consumer_service_rights`, `uk_unfair_terms`, `uk_business_exclusion_clauses`, `late_payment_substantial_remedy`,
  `uk_complaints_adr`), avec les empreintes des pages lues ; règles existantes de l'intérêt légal reprises
  (`late_payment_statutory_interest_margin`, `late_payment_reference_rates`, `late_payment_fixed_compensation`,
  `late_payment_default_due_period`).
- Code : moteur `engines/cgv-uk.js` ; script `tools/cgv.js` rendu commun aux deux pays (moteur, format des taux et
  enregistrement choisis par la page : `cgv` en France, `cgv-uk` au Royaume-Uni) ; page
  `content/uk/terms-and-conditions-generator.html` (menu *Selling*, après l'accord de confidentialité ; liens de langue
  avec la page française).
- Choix faits en réalisant : une valeur illisible (taux, acompte, délai) n'est jamais écrite dans le document ; le
  délai de 60 jours entre entreprises est signalé, pas refusé (la loi admet un délai plus long s'il n'est pas
  manifestement abusif) ; un taux contractuel plus bas que l'intérêt légal est signalé (remède substantiel, s. 9), pas
  refusé ; le portfolio n'est montré pour un particulier qu'avec son accord.
- Tests : `cgv-uk.test.mjs` (27 tests : règles, intérêt légal par semestre, formulaire mot pour mot, chaque contrôle,
  12 combinaisons de clientèle et de mode de conclusion rendues sans clé brute, sans clause de la liste grise envers
  un particulier, chiffres lus dans les règles). Erreurs réintroduites : 43 dans le moteur et 24 dans le texte de la
  page ; 8 n'étaient pas détectées au premier passage (dernier jour d'un semestre, TVA d'une clientèle d'entreprises
  seule, chiffres écrits en dur au lieu d'être lus dans les règles, juridiction exclusive en double, phrases de la perte
  du droit d'annulation et des frais), toutes le sont après renforcement des tests. Parcours navigateur (saisie, avertissements et focus, société,
  délai et taux signalés, particuliers, contrat chez le client, ADR, annexe, Word, copie, enregistrement séparé des CGV
  françaises, « Clear everything », accessibilité, trois formats) ; les CGV françaises gardent le même comportement.
