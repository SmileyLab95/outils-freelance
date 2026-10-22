# Journal des modifications

## 2026-10-22 — Matrice des besoins remise à jour

- `documentation/02-besoins-clients.md` : chaque besoin vérifié contre les pages publiées des quatre pays
  (calendriers, indemnités kilométriques, retraite, contrats, devis, calculateurs d'impôt et d'acomptes, modèles
  d'emails, *Making Tax Digital*, numérotation automatique… étaient encore marqués « prévus ») ; nouvelle ligne pour
  l'Espace entrepreneur ; liste des besoins encore ouverts par priorité.
- Feuille de route : prochains outils choisis d'après cette liste (comparateurs de statuts aux États-Unis et au
  Canada en P1, puis convertisseur de tarifs et prix au forfait).

## 2026-10-21 — Canada : *Invoicing clients outside Canada* et « Facturer un client étranger »

- Deux pages (anglais et français, menus « Invoicing » et « Facturer », même identifiant que les pages française et
  britannique) : selon l'inscription, le Québec, la résidence du client et le service, l'assistant dit si la vente
  est détaxée (0 %) ou taxable, quoi écrire sur la facture et quelles démarches suivre. Services de conseil et
  professionnels (art. 23 : exception du litige au Canada), autres services (art. 7 : exception du particulier au
  Canada), services liés à un immeuble ou à un bien au Canada (taxables), propriété intellectuelle et conseil rendu
  au Canada (« ça dépend », renvoi aux publications de l'ARC). Les exportations détaxées comptent dans le seuil de
  30 000 $ ; ligne 101 selon la méthode ordinaire ou rapide ; TVQ détaxée aussi.
- Règles nouvelles (`ca.json`) : `export_services_zero_rated`, `export_professional_services_zero_rated`,
  `export_ip_non_registered`, `export_evidence_non_resident`, `small_supplier_includes_zero_rated`,
  `gst_return_line_101`, `quick_method_zero_rated`, `qst_services_non_residents_zero_rated` ;
  `place_of_supply_and_exports` corrigée (la non-inscription du client ne compte que pour certains services).
- Générateur de facture canadien : options « Exportation détaxée » (TPS/TVH 0 %) et « (Québec) » (TPS et TVQ 0 %).
- Pages « client étranger » (Canada et Royaume-Uni) : seuls le verdict et l'explication sont annoncés aux lecteurs
  d'écran, les listes ne le sont plus à chaque changement.
- Moteur `engines/international-ca.js` ; tests : unitaires (cas écrits à la main à partir des règles, invariants sur
  les 64 situations, textes des deux pages), contrôlés en réintroduisant les erreurs ; parcours navigateur des deux
  pages et du générateur ; suite complète (162 tests unitaires, 1 915 vérifications navigateur) ; revue critique
  (4 erreurs bloquantes corrigées, dont l'article applicable au conseil).

## 2026-10-21 — Royaume-Uni : *Invoicing overseas clients*

- Nouvelle page `/uk/invoicing-overseas-clients/` (menu « Invoicing », même identifiant que « Facturer un client
  étranger ») : selon l'immatriculation, le pays du client (Royaume-Uni ou île de Man, UE, ailleurs), son statut
  (entreprise ou particulier) et le service, l'assistant dit s'il faut facturer la TVA britannique, quoi écrire sur
  la facture et quelles démarches suivre (preuves, case 6, seuil de 90 000 £, guichet *non-Union* de l'UE pour les
  services numériques à des particuliers, dès la première vente). Quand la règle n'est pas tranchée (design ou
  rédaction pour un particulier à l'étranger, services liés à un lieu), la réponse est « It depends », avec le
  renvoi à la Notice 741A.
- Règles nouvelles (`uk.json`) : lieu de la prestation entre entreprises et envers un particulier, services de
  l'annexe 4A § 16, services numériques, guichet *non-Union* (Commission européenne), territoire de TVA, preuves,
  case 6, chiffre d'affaires taxable ; deux questions ouvertes (services « semblables » au conseil, régime
  forfaitaire). La mention « hors champ », qu'HMRC ne fixe pas, est présentée comme une suggestion.
- Générateur de facture britannique : option « No UK VAT (outside the scope) », sans ligne de TVA.
- Moteur `engines/international-uk.js` ; tests : unitaires (les 48 situations, invariants, textes de la page, montants
  et taux repris des règles), contrôlés en réintroduisant les erreurs ; parcours navigateur (11 situations,
  mémorisation, accessibilité avec un résultat affiché) ; suite complète (155 tests unitaires, 1 865 vérifications
  navigateur) ; revue critique (10 points traités).

## 2026-10-21 — Canada : *What to put on an invoice* et « Que mettre sur une facture »

- Deux pages (anglais et français), même liste : les mentions dont un client inscrit à la TPS/TVH a besoin pour
  demander ses crédits de taxe sur les intrants, selon le total de la facture taxes comprises (moins de 100 $,
  100 $ à 499,99 $, 500 $ ou plus : 3, 5 ou 8 points), plus, au Québec, le numéro de TVQ (dès 100 $) et la facture
  rédigée en français (Charte de la langue française, art. 57) ; sans inscription, seules les mentions de base
  restent, avec le rappel du petit fournisseur. Situation mémorisée ; ajoutées aux menus « Invoicing » et
  « Facturer » ; même identifiant que les listes française et britannique.
- Règles : `itc_invoice_requirements` revérifiée (tableau du mémorandum 8.4 de l'ARC, question ouverte levée) ;
  nouvelles règles `qst_registration_number_on_invoices`, `quebec_invoices_in_french`,
  `small_supplier_not_required_to_collect`. Signalé plutôt que publié : les renseignements propres à la TVQ sous
  500 $ (tableau de Revenu Québec illisible dans les extraits : la page renvoie à Revenu Québec) et deux questions
  sur la langue des factures.
- Générateurs de facture canadiens : FAQ alignées (le numéro de facture n'est plus dit exigé ; seuil du petit
  fournisseur exact, aussi dans les calculateurs de TPS/TVH ; renvoi vers le générateur en français pour le Québec).
- `tools/checklist.js` : plusieurs conditions par point (toutes requises). `build.py` : liens vers une page d'une
  autre section (`{{link:ca-fr/invoice}}`). Listes : traits entre les seuls points visibles ; score et message
  annoncés à part des rappels (aussi au Royaume-Uni).
- Tests : unitaires (chaque mention des paliers reprise une fois, mêmes points en anglais et en français, conditions
  des points et des rappels, nombre de points par situation, seuils et exemples de numéros repris des règles) ;
  parcours navigateur des deux pages (paliers, inscription, Québec, clavier, mémorisation, accessibilité avec les
  rappels affichés, lien vers le générateur en français), contrôlés en réintroduisant les erreurs ; suite complète (151 tests
  unitaires, 1 835 vérifications navigateur, accessibilité comprise) ; revue critique
  (10 points, 9 traités ; confiance des nouvelles règles laissée « moyenne », selon la convention du projet pour une
  lecture par recherche).

## 2026-10-21 — Royaume-Uni : *What to put on an invoice*

- Nouvelle page `/uk/invoice-requirements/` : liste interactive des détails d'une facture, selon la situation
  (*sole trader* ou *limited company*, immatriculé à la TVA ou non, mémorisée) ; les points qui ne s'appliquent pas
  sont masqués et sortent du compte (11 points pour un *sole trader* sans TVA, 18 avec) ; rappel de ne pas faire
  figurer de TVA sans immatriculation ; facture simplifiée de 250 £ ou moins ; cas des sociétés (nom complet
  obligatoire ; numéro, siège et lieu d'immatriculation affichés comme recommandés, hors du compte : décision D18).
  Ajoutée au menu « Invoicing » ; même identifiant que la liste française (liens entre pays).
- Règle `vat_invoice_full_requirements` revérifiée (Notice 700 § 16.3, manuel VATREC5010, règlement TVA de 1995,
  art. 14, lus par recherche) : la remise visée est le taux d'escompte ; le fait générateur (*tax point*) est un
  point distinct de la date de la prestation. Le générateur de facture britannique ne présente plus le numéro et le
  siège de la société comme obligatoires sur la facture.
- `tools/checklist.js` généralisé : textes du score et des messages dans la page, filtres facultatifs
  (`data-when`, `data-show-when`), points recommandés (`data-optional`), condition illisible signalée ; la liste
  française garde exactement son comportement.
- Pages britanniques : date de vérification des sources au format du pays (« 20 October 2026 »).
- Tests : unitaires (chaque point sourcé, chaque élément des quatre règles repris une fois, condition d'affichage,
  nombre de points selon la situation) ; parcours navigateur (score, filtres à la souris et au clavier,
  mémorisation, point recommandé hors compte, messages au singulier et au pluriel, y compris sur la liste
  française) ; chaque nouvelle vérification contrôlée en réintroduisant l'erreur ; suite complète (148 tests
  unitaires, 1 784 vérifications navigateur, accessibilité comprise) ; revue de code (22 points :
  20 traités ; reportés : l'orthographe « VAT registered » à harmoniser sur tout le site, et un texte de repli si
  un attribut manque, couvert pour l'instant par un test).

## 2026-10-21 — Canada : TVP de la province du client, en option

- Règle `pst_on_professional_services` complétée à partir des bulletins officiels de la Saskatchewan (PST-46, PST-7)
  et du Manitoba (RST 033) : créer ou modifier un logiciel est un service informatique taxable en Saskatchewan ; au
  Manitoba, les services liés à un logiciel commercial et l'infonuagique (depuis le 1er janvier 2026) sont taxables,
  le logiciel sur mesure ne l'est pas ; le conseil seul ne l'est généralement pas. Confiance moyenne (lus par
  recherche) ; question ouverte levée.
- Calculateurs « combien mettre de côté » (anglais et français) : une case ajoute la TVP (TVD au Manitoba) quand le
  service y est soumis dans la province du client ; FAQ avec ces exemples.
- Tests : parcours navigateur (TPS + TVP en C.-B., TVD au Manitoba, case masquée ailleurs).

## 2026-10-21 — Canada : seuil d'acomptes de Revenu Québec et TVP de la Colombie-Britannique précisés

- Revenu Québec : l'« impôt net à payer » de son seuil de 1 800 $ ne comprend que l'impôt (les cotisations RRQ,
  RQAP et FSS sont versées avec les acomptes, mais ne comptent pas dans le test) ; le moteur suivait jusque-là une
  hypothèse prudente qui annonçait des acomptes à tort entre environ 16 800 $ et 35 900 $ de revenu net. Question
  ouverte levée ; calculateurs d'impôt et « combien mettre de côté » corrigés.
- TVP de la Colombie-Britannique : règle complétée (conseil et design non taxables sauf avec des biens ou un
  logiciel ; services à un logiciel non taxables, vente d'un logiciel taxable). Reste à vérifier : Saskatchewan et
  Manitoba.
- Tests : 144 unitaires (acomptes du Québec réécrits sur les nouveaux seuils), parcours navigateur mis à jour.

## 2026-10-21 — Canada : « How much to set aside for taxes » et « Combien mettre de côté pour l'impôt »

- Deux pages (anglais et français), un seul script bilingue : part de chaque paiement à mettre de côté pour l'impôt
  et le RPC (ou le RRQ et le RQAP), dans les 13 provinces et territoires ; acomptes provisionnels ; répartition d'un
  paiement, taxes de vente retirées d'abord **au taux de la province du client** (TVH, TPS + TVQ ou TPS seule ; la
  TVP est signalée, pas comptée) ; seuil du petit fournisseur ; tableau selon le revenu. Reliées aux pages des trois
  autres pays et aux calculateurs d'impôt canadiens.
- Moteur `tax-ca.js` : au Québec, deux tests d'acomptes distincts (ARC sur l'impôt fédéral, Revenu Québec sur l'impôt
  du Québec et les cotisations, par prudence) ; les acomptes sont présentés sous la condition des deux années
  précédentes, aussi dans les calculateurs d'impôt canadiens (dates en toutes lettres, l'année une fois).
- Règles : TVP en Colombie-Britannique (extension aux services professionnels suspendue le 18 septembre 2026),
  seuil de Revenu Québec (deux conditions, revenuquebec.ca) ; une question ouverte sur la base de ce seuil.
- Pages britannique et américaine : ligne du tableau la plus proche du bénéfice signalée (une seule, annoncée aux
  lecteurs d'écran) ; résumé « par mois » et total de l'année séparés.
- Tests : 4 tests unitaires (acomptes du Québec, taux de taxe de vente des 13 provinces, textes et exemples
  recalculés), 2 parcours navigateur (19 vérifications) ; revue critique (6 points et les remarques traités).

## 2026-10-21 — Royaume-Uni : *How much to set aside for tax*

- Nouvelle page `/uk/how-much-to-set-aside-for-tax/` : part de chaque paiement à mettre de côté pour l'*income tax*
  et la Class 4 (arrondie au point supérieur, comme la page américaine), *payments on account*, ce qui reste,
  répartition d'un paiement (TVA d'abord si l'utilisateur est immatriculé), tableau de la part selon le bénéfice ;
  seuil d'immatriculation à la TVA et facture de la première année rappelés. Reliée aux pages française et
  américaine.
- Moteur `tax-uk.js` : `soleTrader` prend en compte un salaire (impôt dû sur le bénéfice seulement, PAYE compté dans
  le test des 80 % des *payments on account*) ; le calculateur d'impôt britannique l'utilise désormais (un seul
  calcul, résultats inchangés).
- Revue critique (7 points traités) : arrondi au point supérieur corrigé sur toutes les pages qui l'affichent
  (une part exacte de 11 % s'affichait 12 %) ; fourchettes « la plupart des indépendants » sans source remplacées
  par des exemples recalculés par les moteurs (Royaume-Uni, États-Unis) ; récupération de la TVA et maximum annuel
  de National Insurance sourcés (gov.uk) et signalés ; champs invalides nommés et annoncés ; bordure rouge des
  saisies invalides sur tout le site.
- Tests : 4 tests unitaires (salaire, acomptes inutiles grâce au PAYE, textes et exemples recalculés), parcours
  navigateur de la page (10 vérifications), chaque correction contrôlée en réintroduisant le défaut ; suite
  complète de 1 707 vérifications.

## 2026-10-21 — Calculateur « Combien mettre de côté sur chaque paiement » (France)

- Nouvelle page `/fr/combien-mettre-de-cote-auto-entrepreneur/` : pour un paiement reçu, la TVA à reverser, les
  cotisations et la formation professionnelle (sur le montant hors taxes, ACRE comprise) et l'impôt (versement
  libératoire, ou estimation de l'acompte au taux du foyer sur le hors taxes après abattement) ; reste disponible ;
  CFE et régularisation de l'impôt rappelées. Reliée à la page américaine équivalente.
- Moteur `engines/micro-fr.js` (calculs exacts en centimes), partagé avec le simulateur auto-entrepreneur, qui lit
  aussi l'abattement minimum dans les règles ; le calculateur de TVA lit ses taux dans les règles et affiche ses
  sources.
- Règles : `ca_declare_hors_taxes`, `tva_taux_metropole`, `pas_micro_acomptes` (relevées par recherche sur les sites
  officiels, confiance moyenne) ; taux du versement libératoire relus sur impots.gouv.fr (question ouverte levée).
- Mémorisation des formulaires (tout le site) : une valeur enregistrée qui ne correspond plus à aucun choix est
  ignorée, au lieu d'une liste vide.
- Tests : 10 tests du moteur et de la cohérence page/règles (chaque contrôle vérifié en glissant une erreur dans la
  page), parcours navigateur de la page (9 vérifications), suite complète ; revue critique (11 points traités, dont
  le taux ACRE de la Cipav signalé comme à confirmer et une seule annonce pour les lecteurs d'écran).

## 2026-10-21 — Navigation au clavier ; offres et paiements

- Clavier : un menu déroulant se referme quand le focus le quitte, et Échap rend le focus à son bouton (il restait
  sur un lien masqué) ; contour de focus opaque (indigo, 6:1 sur fond blanc ; blanc sur le bandeau sombre du kit),
  au lieu d'un indigo transparent à 2:1.
- Tests : lien d'évitement, ouverture et fermeture des menus au clavier, contour de focus, panneau mobile refermé
  par Échap ; chaque test contrôlé en réintroduisant le défaut qu'il doit détecter ; suite complète de 1 658
  vérifications.
- `documentation/17-offres-et-paiements.md` : prix proposés (« Pro » à 5 € HT par mois ou 50 € HT par an), coûts
  pris en compte, frais de Stripe, Stripe Managed Payments, Paddle, Lemon Squeezy et Mollie relevés sur leurs sites
  (grille de GoCardless non trouvée), abonnés nécessaires pour couvrir l'hébergement et la mesure d'audience (7 à 13),
  questions de TVA et de facturation pour l'expert-comptable, recommandation (Stripe en France) et tâches d'Ismail ;
  relu (9 points corrigés, dont des frais oubliés et une comparaison trop favorable).
- Spécification des comptes : étape C7 (abonnement « Pro ») ; plan : l'offre cible renvoie à la première grille.
- Journal des décisions : décisions en attente complétées (prix, prestataire de paiement).

## 2026-10-21 — Accessibilité (WCAG 2.1 AA) contrôlée à chaque vérification

- Audit axe-core (règles WCAG 2.1 A et AA) des 84 pages, sur ordinateur et mobile, puis des états produits par les
  outils. Corrigé : contraste du texte discret (`--faint` : #6c6987, au moins 4,6:1) et du vert de confirmation
  (`--ok` : #15803d, 5:1 ; boutons « Copié », cases cochées), champs vides de l'aperçu de facture ; tableaux
  défilants atteignables au clavier et nommés par leur titre ; nom accessible du sélecteur de pays qui reprend le
  texte affiché (« FR, Pays : France ») ; lien temporaire des téléchargements retiré aussitôt.
- Une seule fonction de téléchargement (`OF.download`) au lieu de quatre copies (calendrier, contrat, acomptes US,
  Espace).
- Tests : axe-core 4.14.0 (version fixée, `sh tests/e2e/installer-axe.sh`) fait partie du parcours navigateur :
  chaque page dans les trois formats (sur ordinateur, à l'ouverture et après le parcours), la page 404 et 15 écrans
  de l'Espace, une fois les transitions terminées ; 362 contrôles d'accessibilité, suite complète de 1 650
  vérifications (décision D17). Factur-X revalidé après le changement de couleur du PDF (XML conforme, 10 PDF/A-3
  valides selon Mustang).
- `build.py` s'arrête si un tableau défilant n'a pas de titre `h2` avant lui ou n'est pas reconnu. Revue de code :
  aucun défaut bloquant, 7 remarques traitées (documentation précisée, URL des téléchargements libérée après une
  minute pour Safari, emoji du sélecteur mondial masqué aux lecteurs d'écran…).

## 2026-10-21 — Mesure d'audience : règles et comparatif

- `documentation/16-mesure-audience.md` : conditions de la CNIL pour une mesure d'audience sans consentement,
  comparatif de Plausible, Pirsch, GoatCounter et Matomo (prix relevés sur les sites des éditeurs, hébergement),
  recommandation (Plausible), plan de mise en place et tâches d'Ismail ; décision ajoutée aux décisions en attente.
- Feuille de route : la complétion du SIREN par l'API Recherche d'entreprises attend un accès réseau permettant de
  vérifier le service (format des réponses, appels depuis le navigateur).

## 2026-10-21 — Typographie du texte produit par les outils

- Règles de typographie française regroupées dans `data/typo-fr.json` (une seule source, syntaxe commune à Python et
  à JavaScript) : `build.py` les applique au texte des pages ; `engines/typo-fr.js` les applique au texte que les
  scripts des outils ajoutent ou modifient dans les pages en français (résultats, messages, listes de l'Espace).
- Tests : parité Python/JavaScript et idempotence sur 23 cas ; parcours navigateur (texte produit par un outil, texte
  ajouté puis modifié, code et `pre` intacts) ; suite complète (1 277 vérifications) ; revue de code (8 points
  traités, dont la réunion des règles en une seule source).

## 2026-10-21 — Typographie française automatique

- `build.py` : espaces insécables dans le texte visible des pages en français (`fr`, `ca-fr`) : avant « ; ! ? »
  (espace fine) et « : », dans les guillemets, entre les groupes de chiffres, entre un nombre et son unité ou le mot
  qui le suit, après « art. », « L. » et « n° ». Rien n'est retouché dans les balises `script`, `style`, `code`,
  `pre`, `textarea`, ni dans les attributs ; pas d'espace insécable après la fin d'un code (« RRQ2 », « J+10 »), et
  une année n'est pas lue comme un groupe de milliers. 37 pages concernées.
- Boutons « Copier » : l'espace fine insécable devient une espace insécable avant la copie, pour toutes les
  messageries.
- Tests : 5 tests de la fonction (cas à traiter et cas à laisser) ; suite navigateur complète (1 275 vérifications) ;
  captures mobiles relues ; revue de code (8 points traités). Spécification `documentation/15-guides-gestion.md`, § 3.

## 2026-10-20 — Guide « Assurance de l'indépendant » (France)

- Nouvelle page `/fr/assurance-independant/` (menu « Statut et revenus ») : vérificateur des assurances selon
  l'activité (travaux du bâtiment, artisanat, profession réglementée, services, commerce), la micro-entreprise,
  l'immatriculation au secteur des métiers et l'usage d'un véhicule ; décennale obligatoire pour la construction,
  responsabilité civile selon la profession (« à vérifier » pour le bâtiment, faute d'article de loi relevé),
  responsabilité civile automobile ; ce qu'il faut porter sur les devis et factures (mention de l'art. L132-1 du Code
  de l'artisanat ou attestation décennale de l'art. L243-2 du Code des assurances).
- Mentions obligatoires : point « Assurance professionnelle » ajouté à la liste (12 points), sources de la page
  reliées aux règles.
- Règles sourcées `assurance_*` dans `data/rules/fr.json` ; moteur `engines/assurance-fr.js` et 7 tests unitaires
  (dont la cohérence entre les pages et les règles) ; parcours navigateur ; revue de code (10 points traités).

## 2026-10-20 — Guide « Compte bancaire professionnel » (France)

- Nouvelle page `/fr/compte-bancaire-professionnel/` (menu « Statut et revenus ») : vérificateur du compte dédié
  obligatoire pour les micro-entrepreneurs (plus de 10 000 € de chiffre d'affaires deux années civiles consécutives,
  avec l'estimation de l'année en cours), cas de l'entreprise individuelle au réel et des sociétés, intitulé « EI »,
  droit au compte auprès de la Banque de France, questions que le texte laisse ouvertes.
- Règles sourcées dans `data/rules/fr.json` (CSS art. L613-10, Code de commerce art. R526-27 et L123-24, Urssaf,
  Banque de France) ; moteur `engines/compte-fr.js` et 8 tests unitaires (dont la cohérence entre la page et les
  règles) ; parcours navigateur ; spécification `documentation/15-guides-gestion.md`.
- Règles : la mention de l'assurance sur les devis et factures est corrigée dans la liste des mentions obligatoires
  (artisans et micro-entrepreneurs : Code de l'artisanat, art. L132-1, qui a repris en 2023 l'article 22-2 de la loi
  n° 96-603 ; travaux soumis à la décennale : attestation jointe, Code des assurances, art. L243-2). Spécification du
  guide « Assurance de l'indépendant » (`documentation/15-guides-gestion.md`, § 2).

## 2026-10-20 — Recouvrement judiciaire : étude préalable

- `documentation/14-etude-recouvrement.md` : nouvelle procédure de recouvrement des créances commerciales incontestées
  (loi n° 2026-307 du 23/04/2026, entre commerçants seulement), petites créances (jusqu'à 5 000 €, désormais hors
  factures entre commerçants), injonction de payer ; points à vérifier avant publication du guide et plan du guide.
- Relance de facture impayée : la question sur la mise en demeure ne la présente plus comme une étape obligatoire avant
  l'injonction de payer.

## 2026-10-20 — Étude concurrentielle : prix revérifiés sur les sites officiels

- `documentation/11-etude-concurrentielle.md` : prix d'Indy, Abby, Tiime, Henrri, Freebe, Wave, FreshBooks et FreeAgent
  relevés sur leurs sites officiels, avec les écarts entre pages et les promotions ; constat précisé (facturation
  gratuite chez quatre acteurs français, premières formules payantes à 9 à 10 € HT par mois) ; proposition pour
  l'offre « Pro » (4 à 6 € HT par mois), à décider par Ismail.

## 2026-10-20 — Comparatif des hébergeurs (étape C1)

- `documentation/13-comparatif-hebergeurs.md` : besoins de l'hébergement des comptes (API, PostgreSQL, emails,
  sauvegardes ; environ 1 Ko par facture émise), offres et prix relevés chez Scaleway, OVHcloud, Clever Cloud et
  Supabase avec leurs sources, budget de départ (Scaleway : environ 12 à 20 € HT par mois, 22 à 30 € en haute
  disponibilité), recommandation (Scaleway, région de Paris), tâches d'Ismail. Prix relevés par recherche web, à
  vérifier sur les grilles officielles.
- Dépendance signalée : le nom de domaine doit être choisi avant l'étape C4 (clés d'accès et emails de connexion liés
  au domaine) ; ajoutée aux décisions en attente.

## 2026-10-20 — Comptes en ligne, étape C2 : moteur de synchronisation

- `engines/espace-sync.js` : fusion de l'Espace entre appareils (schéma 2), sans serveur ni chiffrement, à partir de
  trois versions (dernière base commune, appareil, compte) : champ par champ, suppressions marquées (`deletedAt`), une
  modification l'emporte sur une suppression, un document émis sur un brouillon (modifications gardées dans une
  copie, y compris celles faites ensuite), deux émissions du même brouillon conservées toutes les deux, encaissements
  fusionnés un par un, liens des devis recalculés, numéros en double signalés, réglages de l'appareil non synchronisés,
  données d'une version plus récente refusées. Règles dans `documentation/12-specification-comptes.md`, § 3.1
  (décision D16).
- Moteur de l'Espace : les encaissements marqués supprimés ne comptent plus dans les montants, le livre des recettes,
  la synthèse par client ni les emails (fonction `payments`).
- Tests : 17 scénarios écrits, chacun contrôlé en réintroduisant l'erreur qu'il doit détecter ; simulation de
  50 scénarios reproductibles à trois appareils (convergence, chaque émission conservée une fois, chaque encaissement
  une fois sur son document, liens des devis valides, chaque cas de conflit rencontré) ; essai ponctuel sur 1 000
  scénarios à trois appareils et 300 à cinq. 107 tests unitaires.

## 2026-10-20 — Spécification des comptes en ligne (première version)

- `documentation/12-specification-comptes.md` : principes (l'Espace reste utilisable sans compte, local d'abord,
  hébergement dans l'UE), fonctions du compte gratuit et de l'offre « Pro » proposée, synchronisation (schéma 2,
  suppressions marquées, numérotation sur plusieurs appareils), options d'architecture et recommandation
  (synchronisation chiffrée de bout en bout chez un hébergeur français), sécurité, RGPD, étapes C1 à C6 et décisions
  d'Ismail.

## 2026-10-20 — Finitions SEO et étude concurrentielle

- Titres (60 caractères au plus) et descriptions (160 au plus) revus sur 72 pages des cinq sections : mots-clés en
  tête, sans promesse au-delà du contenu ; audit : 83 pages conformes.
- Étude concurrentielle, première version (`documentation/11-etude-concurrentielle.md`) : offres et ordres de prix en
  France (Indy, Abby, Tiime, Henrri, Freebe) et dans les pays anglophones (Wave, FreshBooks, Bonsai, QuickBooks,
  FreeAgent), positionnement et pistes de revenus ; prix à vérifier sur les pages officielles.

## 2026-10-20 — Espace : facture électronique Factur-X

- Sur chaque facture ou avoir émis à un client professionnel : fichier **Factur-X** (PDF/A-3 lisible avec ses données
  structurées `factur-x.xml`, profil EN 16931, règles françaises) et données seules (XML). Données manquantes listées
  avec des liens vers les fiches ; identifiants manquants complétés depuis le profil et la fiche client, et signalés.
- Générateur PDF/A-3 maison (`engines/pdfa.js`, décision D14) : police Inter incorporée (sous-ensemble de 330
  glyphes, licence OFL), profil sRGB (littleCMS, licence zlib), XMP Factur-X ; chargé seulement au premier export.
- Clients : pays (liste ISO 3166, noms en français) et adresse de facturation électronique ; profil : adresse de
  facturation électronique, contrôlée (elle commence par le SIREN).
- Moteur de facture commun : modèle du document (`model`) partagé par la page imprimable et le PDF.
- Validation : 10 cas (dont une facture de 3 pages avec logo, un client belge, des noms longs) conformes au XSD et aux
  schematrons EN 16931 et BR-FR, PDF/A-3 et Factur-X validés par Mustang 2.26.0 (veraPDF) ; le fichier produit dans
  le navigateur est validé de la même façon. Revue de code : 10 points corrigés.
- Pages : la facturation électronique et l'Espace présentent l'export, sans promettre plus que ce qu'il fait.

## 2026-10-20 — Factur-X : moteur XML validé par les fichiers officiels

- Moteur `engines/facturx-fr.js` : données structurées CII, profil EN 16931 de Factur-X 1.09.2, règles françaises BR-FR
  (cadre de facturation, notes PMT, PMD, AAB et BAR, SIREN et adresses électroniques, catégories de TVA E, S, AE, O, G,
  avoir lié à sa facture). Pas encore de bouton dans l'Espace (étapes F2, F4 et F5 de l'étude).
- Chaîne de validation `tests/facturx/` : jeu d'essai de 8 cas, XSD et schematrons officiels exécutés en local ;
  8/8 conformes, et 8 variantes volontairement fausses toutes rejetées.
- Moteur de facture commun : montants de ligne arrondis au centime avant le total (la facture lisible et les données
  structurées concordent toujours).
- Étude mise à jour : points tranchés par les règles officielles, points restant à confirmer au texte.

## 2026-10-20 — Espace entrepreneur v1.1

- Envoi au client : sur chaque facture, devis et avoir émis, email prérempli (objet, montant, échéance ou validité,
  acompte, reste dû, IBAN) à joindre au PDF ; la relance utilise le même moteur de textes, testé.
- Générateur de facture : bouton « Continuer dans mon Espace » ; l'Espace reprend le document en brouillon (client
  existant ou nouvelle fiche, profil complété sur ses champs vides, acompte signalé) et propose de continuer la
  numérotation du générateur (ex. 2026-007, puis 2026-008).
- Réglages : dernier numéro déjà utilisé cette année pour chaque type, aperçu du prochain numéro, préfixes contrôlés ;
  une série commencée garde son préfixe jusqu'à la fin de l'année (décision D13).
- Encarts vers l'Espace sur le simulateur auto-entrepreneur, le calendrier fiscal, la relance de facture impayée et les
  mentions obligatoires ; nouvelle question fréquente sur la numérotation.
- Moteur de facture commun : mention de paiement « au plus tard le … », ou « à réception » si le délai est nul (au
  lieu de « à réception, au plus tard le … »).
- Qualité : spécification préalable (section 11 de `documentation/09-specification-espace.md`), 73 tests unitaires,
  parcours navigateur étendu (reprise, envoi, numérotation), revue de code (10 points corrigés), captures relues.
- Étude de l'export Factur-X (`documentation/10-etude-factur-x.md`) : cadre officiel, règles françaises BR-FR,
  données à ajouter, choix techniques, chaîne de validation et étapes F1 à F5.

## 2026-10-20 — Espace entrepreneur v1 (France, version locale)

- Nouvelle page `/fr/espace/` : profil de l'entreprise, clients, devis, factures et avoirs (brouillon puis émission,
  numérotation continue F2026-001, coordonnées figées à l'émission, contrôle de la chronologie), encaissements
  partiels, relance par email préremplie, livre des recettes (export CSV, impression), déclaration Urssaf estimée
  (période, date limite du calendrier, taux de l'activité, ACRE, versement libératoire), jauges du plafond et du seuil
  de TVA, échéances selon le profil, sauvegarde (export, import contrôlé, effacement), reprise des informations du
  générateur de facture. Données dans le navigateur (IndexedDB), synchronisées entre onglets ; rien n'est envoyé.
- Moteur de facture commun `engines/invoice-fr.js` (générateur public et Espace) ; moteur `engines/espace-fr.js`.
- Règles ajoutées : `livre_recettes_micro`, `conservation_pieces` ; échéances Urssaf du calendrier marquées par période.
- Qualité : spécification préalable (`documentation/09-specification-espace.md`), charte qualité (règle d'Ismail),
  60 tests unitaires, parcours navigateur complet, revue de code (10 points corrigés), captures relues.
- Mobile : lignes de facture (quantité étroite, prix large) corrigées aussi dans le générateur public ; champs de
  recherche stylés ; option `ONLY=` pour lancer les tests d'une seule page.

## 2026-10-20 — Plan de développement de la plateforme

- Nouveau cap : passer du site d'outils gratuits à la plateforme de l'entrepreneur avec un compte
  ([documentation/07-plan-de-developpement.md](documentation/07-plan-de-developpement.md)).
- Feuille de route réorganisée en 6 étapes (E1 à E6) avec « Où en est-on ? », tâches d'Ismail, critères de passage,
  bilans mensuels ; l'historique du site d'outils est conservé.
- Journal des décisions ; `CLAUDE.md` impose de lire et de mettre à jour la feuille de route à chaque session.

## 2026-10-20 — Facturer un client étranger

- Assistant (France) : TVA applicable selon le pays du client (France, UE, hors UE), entreprise ou particulier, et la
  nature du service (immatériel, numérique, autre) ; mentions à copier (autoliquidation, hors champ), numéro de TVA
  intracommunautaire même en franchise, VIES, DES, guichet OSS au-delà de 10 000 €.
- Générateur de facture : option « client de l'UE » (autoliquidation) ou « hors de l'UE » (hors champ), sans TVA.
- Les mentions citent la directive 2006/112/CE (art. 44, 59 et 196), valable avant et après le transfert de la TVA
  dans le CIBS.

## 2026-10-20 — Correction : mention de franchise de TVA

- L'ordonnance n° 2026-671 du 27 juillet 2026 a reporté au 1er janvier 2027 le transfert de la TVA dans le CIBS
  (prévu au 1er septembre 2026) et renuméroté les articles. Jusqu'au 31 décembre 2026, la mention reste
  « TVA non applicable, art. 293 B du CGI ».
- Le générateur de facture choisit la mention selon la date de la facture : « art. 293 B du CGI » en 2026,
  « art. L. 233-3 du CIBS (ex-art. 293 B du CGI) » à partir du 1er janvier 2027 (règles `mention_franchise_tva`
  et `mention_franchise_tva_2027`, sources affichées sur la page).
- Pages corrigées : accueil, générateur de facture, mentions obligatoires, calcul de TVA, simulateur, contrat.

## 2026-10-20 — Images de partage par pays

- Une image de partage (1200 × 630) par section, dans sa langue : `og-fr`, `og-us`, `og-uk`, `og-ca`, `og-ca-fr`,
  et une image générale pour l'accueil mondial ; générées par `scripts/og-images.mjs`.

## 2026-10-20 — Épargne retraite des indépendants (4 pays)

- France : simulateur PER (plafond TNS de l'art. 154 bis ou plafond général pour les micro-entrepreneurs, économie
  d'impôt, effort réel, alerte versement libératoire) ; moteur `engines/per-fr.js` testé.
- États-Unis : SEP-IRA vs solo 401(k) (limites 2026 de la Notice 2025-67, rattrapage à 50 ans et entre 60 et 63 ans,
  impôt fédéral et d'État économisé) ; `tax-us.js` accepte désormais une déduction retraite (AGI et QBI).
- Royaume-Uni : pension tax relief (relief at source de 20 %, complément via Self Assessment, allocation annuelle,
  limite des revenus, effet sur le personal allowance).
- Canada (anglais et français) : droits REER 2026 (18 %, 33 810 $), économie d'impôt par province ; `tax-ca.js`
  accepte une déduction du revenu net.

## 2026-10-20 — Comparateur de statuts : EURL à l'IS

- Quatrième statut : rémunération du gérant TNS (abattement de 10 % à l'impôt), IS, dividendes au PFU jusqu'à 10 %
  du capital et des comptes courants, cotisations TNS et part impôt du PFU au-delà (`eurlIS`, testé).
- Champ « capital et comptes courants », comparaison en grille 2 × 2.

## 2026-10-20 — États-Unis : trois nouveaux guides interactifs

- *How much to set aside for taxes* : part de chaque paiement à mettre de côté (moteur `tax-us.js`), répartition
  d'un paiement, tableau par niveau de bénéfice.
- *1099-NEC and W-9 guide* : vérificateur (seuil de 2 000 $ pour les paiements de 2026, carte et applications de
  paiement → 1099-K, sociétés, avocats), échéance du 1er février 2027, retenue de 24 % sans W-9.
- *Freelance protection laws* : New York (État et ville), Illinois, Californie, Los Angeles, Minneapolis, Columbus ;
  seuil du contrat écrit avec cumul sur 120 jours, délai de paiement, sanctions, organisme compétent.

## 2026-10-20 — Générateur de contrat de prestation (5 versions)

- France : contrat de prestation de services (cession de droits d'auteur conforme à l'article L131-3 du CPI,
  indépendance du prestataire, pénalités de retard et indemnité de 40 €, résiliation, force majeure).
- États-Unis : *independent contractor agreement* (cession à paiement complet, clause *Freelance Isn't Free Act*,
  droit de l'État choisi).
- Royaume-Uni : *contract for services* (TVA, Late Payment Act, substitution, droit anglais, écossais ou nord-irlandais).
- Canada (anglais et français) : taxes en sus, intérêts au taux annuel (Loi sur l'intérêt), renonciation aux droits
  moraux, résiliation selon les articles 2125 à 2129 du Code civil du Québec ou préavis dans les autres provinces.
- Outil commun `tools/contract.js` : texte des clauses dans la page, conditions selon le formulaire, export PDF,
  Word (.doc) et copie, saisie mémorisée sur l'appareil.

## 2026-10-20 — Calendriers fiscaux des 4 pays

- France : déclarations Urssaf mensuelles ou trimestrielles (reportées au jour ouvré suivant), CFE, TVA (réel simplifié
  et normal), déclaration de revenus, versement libératoire, changement de périodicité (avant le 31 janvier),
  facturation électronique.
- États-Unis : acomptes trimestriels (dont le 18 janvier 2028), 1099-NEC (seuil de 2 000 $), déclaration et extension.
- Royaume-Uni : Self Assessment, payments on account, Making Tax Digital (2026 et 2027), TVA pour les trois groupes de trimestres.
- Canada (anglais et français) : acomptes provisionnels, solde du 30 avril, déclaration du 15 juin, TPS/TVH
  annuelle, trimestrielle ou mensuelle, REER.
- Outil commun `tools/calendar.js` : filtres selon la situation, compte à rebours, export `.ics` avec rappel,
  lien Google Agenda ; données générées par `scripts/calendriers.py`.

## 2026-10-20 — Générateur de facture : mentions de la facturation électronique

- SIREN du client (avec n° de TVA séparé), adresse de livraison, nature de l'opération (services, biens, mixte),
  option pour le paiement de la TVA d'après les débits.

## 2026-10-20 — Indemnités kilométriques des 4 pays

- France : barème kilométrique 2026 (3 à 7 CV, majoration de 20 % pour les voitures électriques, tableau pour toutes
  les puissances).
- États-Unis : *mileage deduction calculator* (taux de l'IRS par semestre, parking et péages).
- Royaume-Uni : *mileage allowance calculator* (55p puis 25p par mille, moto 24p, vélo 20p, Mileage Allowance Relief).
- Canada (anglais et français) : frais de véhicule déductibles selon la part des kilomètres d'affaires.
- Règles ajoutées : barème kilométrique et majoration électrique (FR), taux de l'IRS 2026 (US), taux vélo (UK).

## 2026-10-20 — France : nouveaux outils et mise à jour réglementaire

- Mention de franchise de TVA : « TVA non applicable, art. L. 223-3 du CIBS (ex-art. 293 B du CGI) » (recodification
  de la TVA, ordonnance n° 2025-1247 ; article vérifié sur Légifrance).
- Facturation électronique : vérificateur des dates (réception, émission, e-reporting), nouvelles mentions, sanctions
  2026 (50 € par facture, 500 € par e-reporting manquant), checklist mémorisée.
- Calcul de la date d'échéance d'une facture (deux méthodes du « 45 jours fin de mois », maximum légal).
- Comparateur de statuts : micro-entreprise, entreprise au réel, SASU (moteur `engines/statuts-fr.js`, testé).
- Dates françaises au format « 1er septembre ».

## 2026-10-20 — Sections Royaume-Uni et Canada (anglais et français)

- Royaume-Uni (`/uk/`, 12 pages) : impôt du sole trader (Angleterre/Écosse, Class 4, payments on account),
  sole trader vs limited company, day rate, VAT, intérêts légaux de retard, relances jusqu'à la letter before action,
  facture, Making Tax Digital, modèles d'emails.
- Canada (`/ca/` et `/ca/fr/`, 20 pages) : impôt du travailleur autonome pour les 13 provinces et territoires
  (RPC/RPC2, RRQ/RRQ2, RQAP, abattement du Québec, surtaxe et contribution santé de l'Ontario, acomptes),
  TPS/TVH/TVQ/TVP, taux horaire, facture avec taxes par province, intérêts de retard (Loi sur l'intérêt),
  relances jusqu'à la mise en demeure, modèles de courriels.
- Moteurs testés : `engines/tax-uk.js`, `engines/tax-ca.js`, `engines/salestax.js` (29 tests unitaires).
- Outils génériques étendus : taxes à plusieurs composantes (facture), frais de retard bilingues, taux lus dans les règles.
- Règles revérifiées : taxes de vente canadiennes (tableau de l'ARC), barèmes de l'Alberta, de la C.-B., de l'Î.-P.-É.
  et de T.-N.-L., montant personnel de base fédéral ; historique du taux de la Banque d'Angleterre.

## 2026-10-20 — Section États-Unis (`/us/`)

- 8 outils : *self-employment tax calculator* (SE tax, impôt fédéral 2026, déduction QBI, impôt d'État estimé),
  *quarterly tax calculator* (règle de sécurité 90 % / 100 % / 110 %, échéancier, export agenda .ics),
  *hourly rate calculator* (calcul inverse depuis le revenu net visé), *invoice generator* (facture et *estimate*,
  format Letter), *payment reminder emails* (4 niveaux, lois de protection des freelances), *late fee calculator*,
  *email templates*, pages légales.
- Moteurs de calcul testés unitairement : `engines/brackets.js`, `engines/tax-us.js`.
- Outils génériques réutilisables par pays : `tools/invoice.js`, `tools/reminder.js`.
- Correctifs : onglets de relance qui perdaient un clic après une saisie, largeur de l'aperçu de facture sur mobile.

## 2026-10-20 — Socle multi-pays

- Nouvelle architecture : sections par pays et langue (`config/locales.json`, `content/<section>/`), pages reliées
  entre pays par un identifiant commun, balises `hreflang`, accueil mondial avec choix du pays, 404 bilingue.
- Section France déplacée sous `/fr/` ; les anciennes adresses redirigent vers les nouvelles.
- Menu par catégories (menus déroulants sur ordinateur, panneau sur mobile et tablette), sélecteur de pays,
  fil d'Ariane avec le pays, grille des outils générée depuis les métadonnées des pages, outils liés en bas de page.
- Saisie et affichage des nombres selon la langue de la section (`1 234,50 €`, `$1,234.50`).
- Chiffres officiels sourcés : `data/rules/` (États-Unis vérifié ; France, Royaume-Uni, Canada en cours).
- Documentation complète : vision, besoins, architecture, méthode, feuille de route, affiliation, fiches pays.

## 2026-10-18 — Site français

- 8 outils : facture et devis, TJM, simulateur auto-entrepreneur, TVA, relance, pénalités, mentions, modèles d'emails.
- Taux BNC 2026 corrigé (25,6 %, décret n° 2025-943).
- Mise en ligne sur GitHub Pages, vérification Google Search Console.
