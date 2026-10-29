# 40. Conditions générales de vente (France)

Besoin P3 de [02](02-besoins-clients.md) (« Conditions générales de vente : générateur de CGV »), étape 6 de
[31](31-vision-plateforme.md) § 5. Spécification avant le code, 29/10/2026. La France d'abord (décision D39) ; le
Royaume-Uni, les États-Unis et le Canada suivront, chacun après la lecture de ses propres sources.

## 1. Besoin

Un indépendant qui vend des prestations de services doit pouvoir montrer ses conditions de vente : un client
professionnel peut les lui demander, et pour un client particulier elles sont **obligatoires avant la conclusion du
contrat**. Il les joint en général à ses devis. Le générateur rédige des CGV adaptées à sa clientèle (professionnels,
particuliers ou les deux) et à la façon dont il conclut ses contrats (à distance, chez le client, sur son site), avec les
mentions obligatoires, sans clause abusive, et signale ce qu'il reste à faire (désigner un médiateur, par exemple). Il
ne remplace pas un avocat : France Num recommande de faire relire ses CGV par un juriste ou un avocat, et la page le dit.

**Champ** : prestations de services d'un indépendant établi en France, droit français. **Hors champ** (signalé sur la
page) : vente de biens (garantie légale de conformité, encadré obligatoire des biens et contenus numériques), contrats
d'abonnement (résiliation en ligne obligatoire), services financiers, clients établis à l'étranger, règles propres à une
profession réglementée.

## 2. Règles

Toutes lues **en entier** le 29/10/2026 avec l'outil « Lire une source officielle » (option « * », ajoutée le même jour) ;
règles dans `data/rules/fr.json`.

| Règle | Source | Usage |
|---|---|---|
| Entre professionnels, CGV facultatives mais **communiquées à tout acheteur professionnel qui les demande** ; elles comprennent les conditions d'exécution, les éléments de détermination du prix (barème des prix unitaires ou méthode de calcul, réductions) et les conditions de règlement (délai, conditions d'application et taux des pénalités de retard, indemnité forfaitaire de 40 €, escompte s'il est proposé) ; CGV distinctes possibles par catégorie de clients ; amende jusqu'à 15 000 € (entreprise individuelle) ou 75 000 € (société) | F33527 (vérifiée le 01/07/2026), F23455 (19/06/2026) ; `cgv_professionnels` | Articles « Prix », « Facturation et paiement », « Retard de paiement » |
| Délai de paiement : 30 jours après l'exécution à défaut de stipulation ; **60 jours au plus** après la date de la facture, ou 45 jours fin de mois expressément convenus ; **45 jours** pour une facture périodique ; le délai figure sur la facture et dans les CGV | F23211 (07/08/2026) ; `retard_paiement_delais` (complétée) | Contrôle du délai saisi (au-delà de 60 jours : erreur ; au-delà de 45 : rappel des factures périodiques) |
| Pénalités dues de plein droit, sans rappel, dès le lendemain de l'échéance ; taux d'au moins **3 fois le taux de l'intérêt légal** (8,25 % au 2nd semestre 2026) ; à défaut, taux de refinancement de la BCE (1er janvier ou 1er juillet) **majoré de 10 points** : 12,15 % au 1er semestre 2026, **12,40 %** au 2nd ; indemnité de 40 € par facture, non soumise à TVA ; l'indemnisation complémentaire sur justificatifs **ne doit pas** figurer dans les CGV ni sur les factures ; amende jusqu'à 75 000 € (entreprise individuelle) ou 2 millions € (société) si les CGV n'indiquent pas les pénalités ou prévoient un taux non conforme | F23211 ; `penalites_retard_regle`, `indemnite_forfaitaire_recouvrement`, `taux_bce_refinancement` (table par semestre depuis le 29/10/2026, [41](41-penalites-de-retard.md)) | Trois choix de taux (BCE + 10 points, trois fois le taux légal, taux choisi) ; taux choisi contrôlé contre le minimum du semestre |
| Taux de l'intérêt légal par semestre : 2026, 1er semestre 6,67 % (créancier particulier) et 2,62 % (autres cas) ; **2nd semestre 6,84 % et 2,75 %** | F783 (01/07/2026) ; `taux_interet_legal` (nouvelle) | Minimum des pénalités ; intérêts dus par un client particulier après mise en demeure (créancier professionnel : taux « autres cas ») |
| Clients particuliers : CGV **obligatoires**, communiquées avant le contrat sur un support durable (sur le site pour un contrat à distance) : caractéristiques essentielles, **prix toutes taxes comprises**, modalités de paiement et d'exécution, date ou délai, identité et coordonnées, garanties légales, médiation ; pour les services, en plus : forme juridique, immatriculation, autorisation, numéro de TVA, profession réglementée, loi applicable et juridiction, assurance professionnelle (assureur, couverture géographique) ; à distance, en plus : SIREN, rétractation et formulaire type, résiliation, modes de règlement des litiges ; amende de 3 000 € ou 15 000 € (F23455) | F33527, F23455 ; Your Europe (12/07/2026) pour la confirmation du contrat sur un support durable, au plus tard avant le début de la prestation ; `cgv_particuliers` | Article « Identification du Prestataire » ; prix TTC ; confirmation du contrat à distance |
| **Rétractation** (contrat à distance ou hors établissement) : 14 jours à compter du lendemain de la conclusion du contrat de services, prolongés jusqu'au premier jour ouvrable ; forme libre (pas de lettre recommandée imposée) ; remboursement de tous les paiements sous 14 jours, par le même moyen de paiement, sans frais ; exécution pendant le délai seulement **à la demande expresse** du client, recueillie sur un support durable, sinon il ne doit rien ; s'il se rétracte après, il paie un montant **proportionnel** à ce qui a été fourni ; plus de rétractation pour un service **pleinement exécuté** avant la fin du délai, commencé après accord préalable exprès et renoncement exprès ; sans information, délai prolongé de 12 mois ; amende jusqu'à 15 000 € ou 75 000 € | F10485 (01/01/2026), F23455, F23224 (11/08/2026), Your Europe ; `retractation_consommateur` | Article « Droit de rétractation » |
| Modèle de formulaire de rétractation et informations types (directive 2011/83/UE, annexe I) ; les États ne peuvent ajouter aucune exigence de forme | Directive 2011/83/UE, JO L 304 du 22.11.2011 (Office des publications de l'UE, texte lu en entier) ; `retractation_modeles` | Annexe « Modèle de formulaire de rétractation », reprise mot pour mot depuis la règle, coordonnées du Prestataire remplies |
| Depuis le **19 juin 2026**, fonctionnalité de rétractation en ligne (« renoncer au contrat ici », « confirmer la rétractation », accusé de réception avec date et heure) pour les contrats conclus via une interface en ligne ; les CGV en mentionnent l'existence et l'emplacement ; texte type de l'article R221-3 | F23455 ; France Num (02/10/2026) ; `retractation_en_ligne` | Option « Mes clients commandent sur mon site » : adresse de la fonctionnalité et texte type |
| **Hors établissement** (contrat signé chez le client) : exemplaire daté, signé par les deux parties, sur un support durable, avec le formulaire de rétractation ; **aucun paiement ni prestation avant 7 jours** à compter de la conclusion (sauf exceptions : réparations urgentes demandées par le client…) | F23224 ; `hors_etablissement` | Article « Devis et commande » et « Facturation et paiement » ; avertissement si un acompte est demandé |
| Client professionnel de **5 salariés au plus**, contrat **hors établissement**, objet hors de son activité principale : mêmes droits qu'un consommateur (art. L221-3) | France Num (11/12/2025) ; F33527 ; `petits_professionnels_hors_etablissement` | Phrase de l'article « Droit de rétractation » dès qu'il y a des clients professionnels et des contrats hors établissement |
| **Médiation** obligatoire avec les consommateurs (pas entre professionnels) : nom, adresse postale et site du médiateur sur le site, les CGV et les bons de commande ; médiateur référencé par la CECMC et convention signée **avant** d'en donner les coordonnées ; réclamation écrite préalable ; saisine dans l'année ; gratuite ; **interdit** d'imposer une médiation avant le juge ; amende de 3 000 € ou 15 000 € | F33338 (16/10/2026) ; `mediation_consommation` | Article « Réclamations et médiation » ; avertissement sans médiateur |
| **Clauses abusives** (interdites ou présumées) : réduire le droit à réparation, modifier seul le prix, garder les sommes versées sans réciprocité, résiliation déséquilibrée, date d'exécution seulement indicative, pénalités excessives, recours restreints… | F33527 ; `clauses_abusives` | Aucune limitation de responsabilité envers un particulier ; prix du devis non modifiable sans accord ; résiliation et remboursements réciproques ; pas d'étape amiable obligatoire pour un particulier |
| Opposabilité : support durable, CGV communiquées **avant** l'engagement (sur le devis), acceptation expresse (devis signé, case non pré-cochée), CGV applicables = celles du jour de la commande ; **français** obligatoire avec des consommateurs | France Num (13/07/2026) ; `cgv_opposabilite` | Article « Devis et commande », version datée, article « Modification des CGV » ; conseils de la page |
| Garantie légale de conformité : biens, contenus et services numériques, biens à fabriquer ; **2 ans** ; pas une prestation de services sans bien ni contenu numérique | F11094 (17/08/2026) ; `garantie_legale_conformite` | Phrase de l'article « Responsabilité et garanties » pour les particuliers |
| Mention « EI », mention de franchise de TVA, mention de l'assurance | Règles existantes `mention_ei_documents`, `mention_franchise_tva` (et 2027), `assurance_mention_devis_factures` | Exemple de nom « EI », mention de franchise datée (même fonction que les factures), champ « assurance » |

**Points signalés, non tranchés** (questions ouvertes de `fr.json`) : la fiche F23211 écrit que l'indemnité de 40 €
« ne peut s'appliquer que sur des actes de commerce » (portée pour les professions libérales à confirmer) ; le texte de
l'annexe de l'article R221-1 n'a pas pu être lu sur Légifrance (le modèle de la directive est repris) ; F33527 étend
l'art. L221-3 aux contrats « à distance », France Num non (le générateur suit le texte cité : hors établissement) ;
l'interdiction de paiement pendant 7 jours n'est pas reprise pour les petits professionnels (aucune source lue ne le dit).

## 3. Outil

Page `/fr/conditions-generales-de-vente/`, identifiant `cgv`, menu « Vendre » après l'accord de confidentialité ; liens
réciproques avec le contrat de prestation et le générateur de devis.

**Formulaire** (enregistré sur l'appareil, comme les autres générateurs) :

- Vous : nom (avec « EI »), statut et forme juridique, adresse, SIREN, immatriculation (RCS ou RNE), TVA (franchise ou
  assujetti, numéro), email, téléphone, adresse de la politique de confidentialité, assurance professionnelle
  (facultatif), profession réglementée (facultatif), prestations proposées.
- Vos clients : professionnels, particuliers ou les deux ; contrats conclus à distance (email, téléphone, visio,
  internet) et/ou hors établissement (chez le client) ; commandes sur votre site (adresse de la rétractation en ligne) ;
  médiateur (nom, adresse, site), si vous avez des clients particuliers.
- Prix et paiement : sur devis, au jour ou à l'heure ; barème et réductions (facultatifs) ; validité des devis ;
  acompte ; délai de paiement ; moyens de paiement ; escompte (aucun, ou taux et délai) ; taux des pénalités (BCE +
  10 points, trois fois le taux légal, autre taux).
- Exécution et clauses : délai de recette entre professionnels ; préavis de résiliation ; cession des droits d'auteur ou
  licence ; portfolio ; confidentialité ; limitation de responsabilité (professionnels) ; sous-traitance.

**Moteur** `engines/cgv-fr.js` (fonctions pures, testées) :

- `semester(iso)`, `rates(rules, iso)` : taux légal et taux BCE du semestre, minimum des pénalités (3 fois) et taux par
  défaut (BCE + 10 points) ; `null` si le semestre n'est pas encore dans les règles (le générateur le signale).
- `prepare(raw, rules, today, fmt)` : repères des articles (`has_pro`, `has_part`, `both`, `retract` = particuliers et
  contrat à distance ou hors établissement, `offsite_part`, `online`, `small_pro`…), textes calculés (taux des
  pénalités, délai, moyens de paiement, formulaire de rétractation repris de la règle avec les coordonnées) et
  **contrôles** : délai au-delà de 60 jours, rappel des 45 jours d'une facture périodique, taux choisi sous le minimum du
  semestre, semestre absent des règles, particuliers sans médiateur, rétractation sans adresse ni email, rétractation en
  ligne sans adresse, acompte demandé pour un contrat hors établissement avec un particulier, assujetti sans numéro de
  TVA, SIREN manquant, politique de confidentialité manquante, délai de recette au-delà de 30 jours, escompte incomplet.
  Le moteur renvoie des codes ; les messages sont dans la page.

**Rendu** : moteur commun `engines/contract-doc.js`, avec deux ajouts rétrocompatibles : des **annexes** (après les
articles, titre « Annexe – … », jamais numérotées comme un article, sur une nouvelle page à l'impression) et des
paragraphes « à remplir » (ligne pointillée) et « bloc » (liste de paragraphes fournie par l'outil). PDF, Word, copie.

**Texte** (articles numérotés selon ce qui s'applique) : Objet et champ d'application ; Identification du Prestataire ;
Devis et commande ; Prix ; Facturation et paiement ; Retard de paiement ; Exécution des prestations ; Droit de
rétractation ; Propriété intellectuelle ; Confidentialité ; Responsabilité et garanties ; Force majeure ; Résiliation ;
Données personnelles ; Réclamations et médiation ; Droit applicable et langue ; Modification des CGV ; Annexe – Modèle
de formulaire de rétractation. Les dispositions propres à une catégorie de clients le disent (« Clients professionnels :
… »), comme le recommande la fiche F33527 quand une seule CGV sert aux deux.

**Page** : avertissements au-dessus de l'aperçu (région annoncée aux lecteurs d'écran) ; explications : ce que contient
le document, comment le faire accepter (avec le devis, support durable, version datée), ce qu'il faut faire en plus
avec des particuliers (adhérer à un médiateur, CGV sur le site, fonctionnalité de rétractation en ligne), ce que le
générateur ne couvre pas ; questions fréquentes ; sources.

## 4. Tests

- Moteur : semestres et taux (1er et 2nd semestre 2026, semestre absent), minimum des pénalités, repères selon chaque
  clientèle et chaque façon de conclure, chaque contrôle (présent et absent), formulaire repris mot pour mot de la règle.
- Moteur de rendu : annexes conditionnelles et non numérotées, paragraphes à remplir et blocs ; contrat et accords de
  confidentialité rendus à l'identique.
- Page : chaque combinaison (3 clientèles × distance / hors établissement / site) rendue sans clé brute ; pas de
  limitation de responsabilité ni d'étape amiable obligatoire pour un particulier ; articles « professionnels » absents
  pour une clientèle de particuliers ; formulaire présent si et seulement si la rétractation s'applique ; chiffres lus
  dans les règles (14 jours, 7 jours, 40 €, 60 jours) ; textes conformes à la typographie française.
- Parcours navigateur : saisie, changements de clientèle, avertissements, annexe, enregistrement, Word, accessibilité,
  mobile ; erreurs réintroduites.

## 5. Réalisation (29/10/2026)

- Sources : treize pages officielles lues en entier (fiches F33527, F23455, F23211, F23224, F33338 d'Entreprendre
  Service Public ; F783, F10485 et F11094 de Service Public ; trois fiches de France Num ; Your Europe ; directive
  2011/83/UE, annexe I, sur le serveur de l'Office des publications de l'UE, EUR-Lex refusant les lectures). L'outil de
  lecture a reçu l'option « * » (texte entier et liens vers les textes cités). economie.gouv.fr refuse aussi les lectures
  automatiques (réponse 403) : ses fiches ont été remplacées par celles d'Entreprendre Service Public et de France Num.
- Règles : treize nouvelles (`taux_interet_legal`, `taux_bce_refinancement_2026_07_01`, `cgv_professionnels`,
  `cgv_particuliers`, `retractation_consommateur`, `retractation_modeles`, `retractation_en_ligne`, `hors_etablissement`,
  `petits_professionnels_hors_etablissement`, `mediation_consommation`, `clauses_abusives`, `cgv_opposabilite`,
  `garantie_legale_conformite`) ; quatre confirmées à la source (`retard_paiement_delais`, complétée des 45 jours d'une
  facture périodique, `penalites_retard_regle`, `indemnite_forfaitaire_recouvrement`, `taux_bce_refinancement_2026_01_01`,
  passée en confiance haute). Deux questions ouvertes résolues (taux légal et taux de la BCE du 2nd semestre 2026), deux
  ajoutées (indemnité de 40 € et professions libérales ; texte français du formulaire type). Les deux règles de la BCE
  sont réunies depuis en une table par semestre, `taux_bce_refinancement`, lue par le moteur commun `engines/retard-fr.js`
  ([41](41-penalites-de-retard.md)).
- Code : moteur `engines/cgv-fr.js`, script `tools/cgv.js`, page `content/fr/conditions-generales-de-vente.html` (menu
  « Vendre », lien depuis le contrat de prestation) ; moteur de rendu commun : annexes, lignes à remplir et blocs, sans
  changement des documents existants ; styles : annexe sur une nouvelle page à l'impression et dans Word, lignes
  pointillées, avertissements ; sur un écran étroit, le texte des documents (contrats, accords, propositions, CGV)
  n'est plus justifié.
- Choix faits en réalisant : une valeur illégale n'est jamais écrite dans le document (case à compléter et
  avertissement) ; dans le formulaire de rétractation, la consigne au professionnel est remplacée par ses coordonnées et
  une ligne vide suit « ci-dessous » pour décrire la prestation ; « à défaut de solution amiable » n'apparaît que si la
  CGV vise aussi des professionnels ; la cession de droits renvoie à « l'usage prévu au devis », sans « supports à
  venir » (forme d'exploitation non prévisible) ; un rappel de la page invite à préciser cet usage dans chaque devis.
- Tests : `cgv-fr.test.mjs` (38 tests : taux comparés aux chiffres des fiches, formulaire mot pour mot, contrôles,
  24 combinaisons de clientèle, de mode de conclusion et de commande en ligne rendues sans clé brute, sans clause
  interdite envers un particulier, avec les chiffres des règles) ; moteur de rendu (annexes, lignes, blocs) ; outil de
  lecture des sources (lecture complète). Erreurs réintroduites : 71 dans le moteur, le rendu et le texte de la page ;
  16 n'étaient pas détectées au premier passage (cas limites : un seul moyen de paiement, taux inconnu, escompte sans
  délai, phrase en double pour une clientèle mixte…), toutes le sont après renforcement des tests. Parcours navigateur
  (saisie, avertissements et focus, rétractation, annexe, Word, copie, enregistrement, « Tout effacer »,
  accessibilité, trois formats) ; suite complète : 470 tests unitaires, 29 tests serveur, 3 463 vérifications
  navigateur.
- Relecture des captures et du PDF : taux affiché « 12,4 % » (désormais « 12,40 % »), ligne « undefined » dans le
  formulaire, bouton « Tout effacer » imprimé, champs d'adresse web sans style, listes de choix tronquées sur tablette
  et mobile, grands blancs du texte justifié sur mobile : corrigés.
