# 5. Feuille de route

Le cap est fixé par le [plan de développement](07-plan-de-developpement.md) : passer du site d'outils gratuits à la
**plateforme de l'entrepreneur avec un compte**. Cette page détaille les tâches, étape par étape.

**Règles** : on travaille sur l'étape en cours ; une étape n'est terminée que si son critère de passage est atteint ;
chaque session commence par la lecture de « Où en est-on ? » et se termine par sa mise à jour. Les tâches marquées
**[Ismail]** ne peuvent être faites que par Ismail (comptes, contrats, paiements, décisions).

## Où en est-on ?

*Mis à jour le 21/10/2026.*

- **Priorité (décision D10)** : le site et la plateforme d'abord ; noms de domaine, Gumroad et affiliation à la fin.
  Règle de qualité maximale pour tout produit ou service (D11, charte dans la [méthode](04-methode-de-travail.md#charte-qualité)).
- **Étape en cours : E1, volet « plateforme »**, avec des fonctions de l'étape E2 livrées en version locale (D12).
- **Fait le 20/10/2026** : **Espace entrepreneur v1** (France, version locale) : profil, clients, devis, factures,
  avoirs, encaissements, livre des recettes, déclaration Urssaf estimée, plafonds, échéances, sauvegarde ;
  moteur de facture commun au générateur public ; spécification ([09](09-specification-espace.md)), 60 tests
  unitaires, parcours navigateur complet, revue de code (10 points corrigés).
- **Fait le 20/10/2026 (suite)** : **Espace v1.1** : envoi des factures, devis et avoirs par email prérempli ;
  bouton « Continuer dans mon Espace » dans le générateur public ; reprise d'une numérotation commencée ailleurs (une
  série garde son préfixe jusqu'à la fin de l'année, D13) ; encarts vers l'Espace sur 4 outils ; mention de paiement
  corrigée dans le moteur commun. 73 tests unitaires, parcours navigateur étendu, revue de code (10 points corrigés).
- **Factur-X (20/10/2026)** : export publié dans l'Espace ([étude](10-etude-factur-x.md)) : PDF/A-3 avec données
  EN 16931 et règles françaises, validé par les fichiers officiels et par Mustang (veraPDF) ; générateur PDF maison (D14).
- **Fait aussi le 20/10/2026** : finitions SEO (72 pages) ; [étude concurrentielle](11-etude-concurrentielle.md),
  première version : les grands acteurs français offrent déjà la facturation gratuite ; nos atouts sont l'absence de
  compte, les quatre pays et la rigueur des règles.
- **Spécification des comptes en ligne** (E2), première version : [12](12-specification-comptes.md) (offres gratuit
  et « Pro » proposées, synchronisation chiffrée de bout en bout recommandée, étapes C1 à C6).
- **Étape C2 faite le 20/10/2026** : moteur de synchronisation entre appareils (`engines/espace-sync.js`, schéma 2),
  testé sans serveur : règles de fusion de [12](12-specification-comptes.md) § 3.1 (décision D16), 17 scénarios écrits,
  chacun contrôlé en réintroduisant l'erreur qu'il doit détecter, et simulation de 50 scénarios à trois appareils
  (essai ponctuel : 1 000 scénarios à trois appareils et 300 à cinq, sans écart) ; deux revues de code (20 points
  traités). Le moteur de l'Espace ignore déjà les encaissements marqués supprimés.
- **Comparatif des hébergeurs (20/10/2026)** : [13](13-comparatif-hebergeurs.md) ; recommandation : Scaleway (Paris),
  budget de départ de 20 à 30 € HT par mois ; prix relevés par recherche web, à vérifier sur les grilles officielles.
  Point nouveau : les clés d'accès et les emails de connexion dépendent du nom de domaine, qui doit donc être choisi
  **avant l'étape C4** (le déménagement du site peut rester à la fin).
- **Prix des concurrents revérifiés sur leurs sites officiels (20/10/2026)** : premières formules payantes à 9 à
  10 € HT par mois en France ; proposition pour l'offre « Pro » : 4 à 6 € HT par mois ([11](11-etude-concurrentielle.md)).
- **Recouvrement judiciaire (20/10/2026)** : étude préalable ([14](14-etude-recouvrement.md)). Nouveauté de 2026 : une
  procédure sans juge pour les factures impayées **entre commerçants** (loi n° 2026-307), qui ne concerne pas la
  plupart des indépendants. Guide en attente de la lecture complète de deux textes (décret d'application, décret
  n° 2026-683), impossible depuis l'environnement de travail.
- **Guide « Compte bancaire professionnel » publié (20/10/2026)** : vérificateur de la règle des 10 000 € sur deux
  années civiles (micro-entreprise), cas de l'entreprise individuelle au réel et des sociétés, mention « EI », droit
  au compte auprès de la Banque de France ; règles sourcées (Légifrance, Urssaf, Banque de France), moteur testé.
- **Assurance (20/10/2026)** : règles vérifiées et guide spécifié ([15](15-guides-gestion.md) § 2) ; la mention de
  l'assurance sur les devis et factures relève désormais de l'article L132-1 du Code de l'artisanat (et, pour la
  décennale, d'une attestation jointe) : liste des mentions corrigée.
- **Guide « Assurance de l'indépendant » publié (20/10/2026)** : vérificateur selon l'activité (décennale
  obligatoire pour la construction, responsabilité civile selon la profession, véhicule), mention de l'assurance
  (Code de l'artisanat, art. L132-1) ou attestation décennale (Code des assurances, art. L243-2) sur les devis et
  factures ; point « assurance » ajouté à la liste des mentions obligatoires (12 points).
- **Typographie française automatique (21/10/2026)** : le générateur place les espaces insécables dans les pages en
  français (« 10 000 € », « art. L. 233-3 », « : ; ! ? », guillemets) ; plus de coupures de ligne mal placées sur
  mobile ; les boutons « Copier » restent compatibles avec toutes les messageries.
- **Typographie du texte des outils (21/10/2026)** : les résultats et messages produits par les outils suivent les
  mêmes règles que les pages, depuis un fichier de règles unique.
- **Mesure d'audience (21/10/2026)** : comparatif et règles de la CNIL ([16](16-mesure-audience.md)) ;
  recommandation : Plausible (9 $ par mois), sans cookie ni bandeau ; installation prête à faire dès le choix d'Ismail.
- **Accessibilité (21/10/2026)** : niveau AA des règles WCAG 2.1 atteint sur toutes les pages et les écrans de
  l'Espace (contrastes, tableaux au clavier, sélecteur de pays) ; contrôlé désormais à chaque vérification par
  axe-core dans le parcours navigateur (D17). Navigation au clavier corrigée et testée (menus, focus visible).
- **Nouveau calculateur (21/10/2026)** : « Combien mettre de côté sur chaque paiement » (France) : TVA, cotisations,
  formation professionnelle et impôt (versement libératoire ou estimation au taux du foyer), sur le hors taxes ;
  moteur commun avec le simulateur, règles relues sur impots.gouv.fr et autoentrepreneur.urssaf.fr. Même outil
  pour le Royaume-Uni (*How much to set aside for tax*) et le Canada (anglais et français) : le besoin est couvert
  dans les quatre pays.
- **Offres et paiements (21/10/2026)** : grille de prix et comparatif des prestataires ([17](17-offres-et-paiements.md)) ;
  proposition : « Pro » à 5 € HT par mois ou 50 € HT par an, Stripe en France ; 7 à 13 abonnés couvrent
  l'hébergement et la mesure d'audience ; questions de TVA et de facturation à poser à l'expert-comptable.
- **Listes des mentions d'une facture, Royaume-Uni et Canada (21/10/2026)** : *What to put on an invoice* (et
  « Que mettre sur une facture » au Canada), selon la situation : *sole trader* ou société et TVA au Royaume-Uni ;
  total de la facture, inscription à la TPS/TVH et Québec au Canada. Chaque élément des règles officielles repris une
  fois, vérifié par test ; le besoin est couvert dans les trois pays concernés (sans objet aux États-Unis).
- **Client étranger, Royaume-Uni (21/10/2026)** : assistant *Invoicing overseas clients* : TVA britannique ou non
  selon le client (entreprise ou particulier, UE ou ailleurs) et le service, mentions et démarches ; règles lues sur
  GOV.UK et dans les manuels HMRC ; la formulation de la mention, qu'HMRC ne fixe pas, est présentée comme une
  suggestion.
- **Prochaines actions de Claude** : guide « facturer un client étranger » au Canada, en anglais et en français
  (besoin P2 de [02](02-besoins-clients.md) § 5) ; revérifier les grilles des prestataires de paiement (Stripe, Mollie) sur leurs
  pages officielles quand Ismail décidera ([17](17-offres-et-paiements.md)) ; guide du recouvrement dès que les
  textes sont lisibles ; veille réglementaire de décembre (dont la version de Factur-X et l'annexe A de XP Z12-012
  pour le BT-32 en franchise, et la question 13 de [pays/ca.md](pays/ca.md) sur la TVQ). Les étapes C3 (serveur) et
  C4 (interface des comptes) attendent le choix de l'hébergeur.
- **En attente d'Ismail** (pas urgent) : structure juridique avec un comptable ; choix de l'hébergeur et budget pour
  les comptes en ligne (comparatif [13](13-comparatif-hebergeurs.md), § 6) ; nom de domaine à choisir avant l'étape C4
  ([13](13-comparatif-hebergeurs.md), § 5) ; outil de mesure d'audience ([16](16-mesure-audience.md)) ; prix de l'offre « Pro » et prestataire de paiement
  ([17](17-offres-et-paiements.md) : 5 € HT par mois ou 50 € HT par an, Stripe) ; à la fin,
  Gumroad.

## Vue d'ensemble

| Étape | Période visée | État |
|---|---|---|
| E0 — Site d'outils gratuits (4 pays) | juillet – octobre 2026 | **Terminée** (historique en bas de page) |
| E1 — Fondations commerciales | novembre – décembre 2026 | **En cours** |
| E2 — Comptes et MVP « Espace entrepreneur » | janvier – avril 2027 | À venir |
| E3 — Facturation électronique et encaissement | mai – août 2027 (prêt avant le 1er septembre 2027) | À venir |
| E4 — Gestion financière | septembre 2027 – mars 2028 | À venir |
| E5 — Écosystème (experts, partenaires, académie) | 2028 | À venir |
| E6 — Échelle (pays, IA, API, équipe) | 2029 et après | À venir |

## E1 — Fondations commerciales (novembre – décembre 2026)

Objectif : un site mesuré, sous sa propre marque, qui commence à rapporter, et une plateforme prête à être construite.

### 1.1 Marque et domaine

- [ ] Proposer 10 noms de marque utilisables en français et en anglais, vérifier les domaines disponibles (.com, .fr)
- [ ] **[Ismail]** Choisir la marque et acheter le domaine
- [ ] Basculer le site sur le domaine (`config/site.json`), redirections depuis GitHub Pages, nouvelle propriété
      Search Console, envoi du plan du site
- [ ] Logo et images de partage à la nouvelle marque

### 1.2 Mesure d'audience

- [x] Comparer les mesures d'audience sans cookie et les règles de la CNIL ([16](16-mesure-audience.md)) :
      recommandation Plausible (alternative : Pirsch)
- [ ] **[Ismail]** Choisir l'outil et ouvrir le compte ([16](16-mesure-audience.md) § 4)
- [ ] Installer la mesure (script ajouté par `build.py` s'il est configuré, hors Espace), événements des outils,
      politique de confidentialité mise à jour
- [ ] Tableau de bord mensuel : visites par pays et par outil, pages d'entrée, clics vers les produits
- [ ] Premier bilan mensuel ajouté à cette page (section « Bilans »)

### 1.3 Produits et boutique

- [ ] **[Ismail]** Mettre en vente le kit US (*Freelance Pro Kit*) sur Gumroad et envoyer le lien
- [ ] Afficher l'offre US sur `/us/` et `/ca/` (bouton d'en-tête et encarts)
- [ ] Kit FR : note sur la mention de TVA à partir de 2027 (art. L. 233-3 du CIBS), régénérer les fichiers
- [ ] Pack Contrats & CGV (France) : contrat long, CGV, accord de confidentialité, avenant, bon de commande,
      procès-verbal de livraison, cession de droits détaillée
- [ ] *Contract Pack* en anglais (US, UK, Canada)
- [ ] Kit Facturation électronique 2027 (checklist, modèles aux nouvelles mentions, guide pas à pas)
- [ ] Produit gratuit : calendrier fiscal 2027 imprimable (PDF) par pays
- [ ] **[Ismail]** Ouvrir un compte d'emailing ; Claude prépare le formulaire d'inscription et les emails de bienvenue
- [ ] Encarts produits contextuels sur les pages d'outils (le bon produit au bon endroit)
- [ ] Page « Ressources » par pays (produits gratuits et payants)

### 1.4 Qualité et veille

- [x] Finitions SEO : titres de 60 caractères au plus et descriptions de 160 au plus sur les 83 pages (72 pages
      revues le 20/10/2026, mots-clés en tête)
- [ ] Veille de décembre 2026 : barèmes 2027 des 4 pays, PASS 2027, taux d'intérêt légal du 1er semestre 2027,
      numéro définitif de la mention de franchise (L. 233-3 du CIBS), calendriers 2027-2028 (`scripts/calendriers.py`)
- [ ] Guide du recouvrement judiciaire (injonction de payer, procédure simplifiée) une fois les règles 2026 vérifiées :
      étude et plan prêts ([14](14-etude-recouvrement.md)) ; deux textes de 2026 à lire en entier avant publication
- [x] Guide « Compte bancaire professionnel » avec vérificateur (règle des 10 000 € sur deux ans, mention « EI »,
      droit au compte) : spécification [15](15-guides-gestion.md) § 1
- [x] Guide « Assurance de l'indépendant » avec vérificateur (décennale, responsabilité civile selon l'activité,
      mention ou attestation sur les devis et factures) : spécification [15](15-guides-gestion.md) § 2
- [x] Typographie française automatique dans le générateur : espaces insécables avant « ; : ! ? », dans les montants
      (« 10 000 € ») et les références d'articles, pour éviter les coupures de ligne sur mobile
      (spécification [15](15-guides-gestion.md) § 3)
- [x] Typographie du texte produit par les scripts des outils (résultats, messages) : mêmes règles, une seule source
      (`data/typo-fr.json`)
- [x] Accessibilité : audit WCAG 2.1 AA (axe-core) des 84 pages et des écrans de l'Espace, corrections (contrastes,
      tableaux défilants, sélecteur de pays, téléchargements) et contrôle intégré au parcours navigateur (D17)
- [x] Navigation au clavier : menus refermés quand le focus les quitte, Échap qui rend le focus, contour de focus
      opaque ; tests du lien d'évitement, des menus et du panneau mobile
- [x] Calculateur « Combien mettre de côté sur chaque paiement » (micro-entrepreneur : TVA, cotisations, formation
      professionnelle, versement libératoire ou impôt estimé au taux du foyer) ; moteur `engines/micro-fr.js` partagé
      avec le simulateur ; taux de TVA lus dans les règles (spécification [15](15-guides-gestion.md) § 4)
- [x] Royaume-Uni : *How much to set aside for tax* (part de chaque paiement, TVA si immatriculé, salaire,
      *payments on account*) ; moteur `tax-uk.js` commun avec le calculateur d'impôt (spécification
      [pays/uk.md](pays/uk.md))
- [x] Canada : *How much to set aside for taxes* et « Combien mettre de côté pour l'impôt » (toutes les provinces,
      RPC ou RRQ et RQAP, TPS/TVH et TVQ, acomptes provisionnels) ; un seul script bilingue (spécification
      [pays/ca.md](pays/ca.md))
- [x] Royaume-Uni : *What to put on an invoice*, liste interactive selon la situation (*sole trader* ou *limited
      company*, immatriculé à la TVA ou non) ; script `tools/checklist.js` généralisé, chaque élément des règles
      couvert une fois (test) ; spécification [pays/uk.md](pays/uk.md)
- [x] Canada : *What to put on an invoice* et « Que mettre sur une facture » : mentions pour les CTI selon le total
      (moins de 100 $, 100 $ à 499,99 $, 500 $ ou plus), numéro de TVQ et français au Québec ; conditions combinées
      dans `tools/checklist.js` ; spécification [pays/ca.md](pays/ca.md)
- [x] Royaume-Uni : assistant *Invoicing overseas clients* (TVA des services selon le client et le service : règle
      générale, services de conseil à un particulier hors du Royaume-Uni, services numériques à des particuliers de
      l'UE, preuves, case 6, seuil ; réponse « ça dépend » quand la règle n'est pas tranchée) ; moteur
      `engines/international-uk.js` testé (48 situations) ; option « hors champ » dans le générateur de facture ;
      spécification [pays/uk.md](pays/uk.md)
- [ ] Parcours navigateur : un contrôle de contraste (axe) a échoué une fois sur le logo de l'Espace (liste des
      clients) dans une suite complète, sans se reproduire en isolé (3 essais) : en trouver la cause
- [ ] Canada : guide « facturer un client étranger » (exportation de services détaxée, TVQ), en anglais et en français

### 1.5 Préparer la plateforme

- [x] Étude concurrentielle par pays, première version ([11](11-etude-concurrentielle.md)) ; prix revérifiés sur les sites officiels le 20/10/2026
- [x] Grille d'offres et de prix à partir de l'étude (fonctions gratuites et « Pro ») : [17](17-offres-et-paiements.md),
      avec les prestataires de paiement comparés et le seuil de rentabilité
- [ ] **[Ismail]** Choisir le prix « Pro » et le prestataire de paiement ([17](17-offres-et-paiements.md) § 7)
- [ ] Liste d'attente « Espace entrepreneur » sur le site, avec un court questionnaire sur les besoins
- [x] Spécification du MVP : parcours, écrans, modèle de données, critères d'acceptation (`documentation/09-specification-espace.md`)
- [x] Espace entrepreneur v1 en version locale (France) : voir les fonctions cochées « version locale » en E2.2
- [ ] Choix techniques consignés dans le journal des décisions (socle, hébergement UE, framework, paiements)
- [x] Comparatif chiffré des hébergeurs pour la décision d'Ismail ([13](13-comparatif-hebergeurs.md)) : prix à vérifier sur les grilles officielles
- [ ] **[Ismail]** Choisir la structure juridique pour encaisser des abonnements (avec un expert-comptable)
- [ ] **[Ismail]** Budget de départ validé

**Critère de passage vers E2** : domaine en ligne, mesure d'audience en place, au moins 2 produits vendus, liste
d'attente ou trafic en croissance, structure juridique choisie.

## E2 — Comptes et MVP « Espace entrepreneur » (janvier – avril 2027)

Objectif : un compte gratuit qui rend service dès le premier jour.

### 2.1 Socle

- [ ] **[Ismail]** Créer les comptes du socle et de l'hébergement (Claude prépare la configuration)
- [ ] Environnements de test et de production, déploiement automatique, tests à chaque modification
- [ ] Authentification : email avec lien de connexion, connexion Google, double authentification
- [ ] Modèle de données : utilisateur, entreprise, clients, devis, factures, lignes, paiements, échéances, documents
- [x] Synchronisation entre appareils : moteur de fusion du schéma 2, testé sans serveur *(étape C2 de [12](12-specification-comptes.md) ; serveur et interface aux étapes C3 et C4)*
- [ ] Sécurité : données cloisonnées par utilisateur dans la base, sauvegardes quotidiennes, journal d'audit, limites de requêtes
- [ ] Juridique : CGU, CGV, politique de confidentialité, registre des traitements, contrats de sous-traitance
- [ ] **[Ismail]** Relecture des CGU et CGV par un avocat ; assurance responsabilité civile professionnelle

### 2.2 Fonctions

- [x] Profil entreprise : statut, régime de TVA, coordonnées, ACRE, versement libératoire *(version locale)*
- [ ] Profil : SIREN complété automatiquement (API Recherche d'entreprises) — en attente : l'API n'est pas joignable
      depuis l'environnement de travail (format des réponses et appels depuis le navigateur à vérifier) ; la recherche
      ne partira qu'à la demande de l'utilisateur, mentionnée dans la politique de confidentialité
- [x] Clients : fiche, pays, historique et totaux *(version locale)*
- [ ] Clients : SIREN et numéro de TVA vérifiés (API Recherche d'entreprises, VIES)
- [x] Devis, factures et avoirs : numérotation continue, PDF, duplication, avoirs, devis transformé en facture *(version locale)*
- [ ] Devis, factures et avoirs enregistrés dans le cloud (comptes en ligne)
- [ ] Devis accepté en ligne par le client (lien sécurisé)
- [x] Tableau de bord : chiffre d'affaires encaissé, déclaration Urssaf estimée, plafonds, seuil de TVA, impayés *(version locale)*
- [x] Livre des recettes tenu automatiquement (micro-entrepreneurs), export CSV *(version locale)*
- [x] Échéances selon le profil *(version locale)*
- [ ] Rappels d'échéances par email (comptes en ligne)
- [x] Reprise des informations du générateur de facture ; import et export d'une sauvegarde *(version locale)*
- [x] Passage du générateur public à l'Espace (document repris en brouillon) et reprise d'une numérotation existante *(version locale)*
- [x] Envoi des factures, devis et avoirs par email prérempli (messagerie de l'utilisateur) *(version locale)*
- [ ] Import de la version locale dans le compte en ligne
- [x] Export complet (PDF, CSV, JSON) et suppression des données *(version locale)*

### 2.3 Lancement

- [ ] Bêta privée avec la liste d'attente, corrections, puis ouverture à tous (gratuit)
- [ ] Pages publiques : présentation de l'Espace, appels à créer un compte depuis les outils

**Critère de passage vers E3** : environ 300 comptes, 40 % ont créé au moins une facture, aucun incident de sécurité.

## E3 — Facturation électronique et encaissement (mai – août 2027)

Objectif : être prêt pour l'**obligation d'émettre des factures électroniques au 1er septembre 2027** (PME et
micro-entreprises), et lancer l'offre Pro.

- [x] Factures au format Factur-X (PDF + données structurées), validées par des outils de contrôle *(version locale, export à déposer sur la plateforme de l'utilisateur)*
- [ ] **[Ismail]** Partenariat avec une ou plusieurs plateformes agréées (Claude compare les offres et leurs API)
- [ ] Connexion à la plateforme agréée : émission, réception, statuts de traitement, e-reporting
- [ ] Réception des factures fournisseurs dans l'Espace
- [ ] Liens de paiement (carte, virement, prélèvement) et rapprochement des paiements
- [ ] Relances automatiques (séquences existantes) et pénalités de retard calculées
- [ ] Offre Pro : abonnement chez le prestataire choisi ([17](17-offres-et-paiements.md)), essai s'il est retenu,
      factures d'abonnement
- [ ] **[Ismail]** Compte chez le prestataire de paiement, au nom de l'entreprise
- [ ] Campagne « Prêt pour le 1er septembre 2027 » : pages, emails, guide
- [ ] Plan B si aucun partenariat n'est signé en juin 2027 : export Factur-X à déposer sur la plateforme de l'utilisateur

**Critère** : émission électronique testée de bout en bout avant le 1er septembre 2027 ; premiers abonnés Pro.

## E4 — Gestion financière (septembre 2027 – mars 2028)

- [ ] Dépenses et justificatifs (photo, PDF), lecture automatique des montants
- [ ] **[Ismail]** Contrat avec un agrégateur bancaire agréé
- [ ] Banque connectée : catégorisation, rapprochement avec les factures
- [ ] Trésorerie et prévisions ; provisions pour impôts et cotisations
- [ ] Déclarations préparées : montant Urssaf, TVA, récapitulatif pour la 2042-C-PRO
- [ ] Exports comptables (fichier des écritures comptables pour le régime réel, CSV) et accès invité pour le comptable
- [ ] Application mobile installable (photo des reçus, notifications)
- [ ] Offre Business
- [ ] Modules pays : États-Unis (Schedule C, acomptes trimestriels, suivi des 1099, carnet de kilométrage),
      Royaume-Uni (préparation de *Making Tax Digital*, reconnaissance par HMRC à étudier), Canada (TPS/TVH, TVQ, acomptes)

**Critère** : abonnements en croissance, rétention mesurée chaque mois.

## E5 — Écosystème (2028)

- [ ] Vérifier les règles de déontologie (experts-comptables, avocats) sur la mise en relation et sa rémunération
- [ ] Place de marché d'experts : comptables, avocats, assureurs partenaires ; accès au dossier avec l'accord de l'utilisateur
- [ ] Offres partenaires intégrées : banque, assurance, création d'entreprise, domiciliation ([affiliation](06-affiliation.md))
- [ ] Académie : guides, vidéos, formations gratuites et payantes, webinaires
- [ ] Communauté : questions-réponses, entraide, annuaire des freelances
- [ ] Assistant de création d'entreprise (démarches pas à pas, guichet unique)
- [ ] Boutique intégrée (remplace Gumroad)
- [ ] Publicité discrète sur les pages publiques uniquement (après environ 10 000 visites par mois), avec consentement conforme

**Critère** : revenus des abonnements et des partenaires supérieurs aux coûts.

## E6 — Échelle (2029 et après)

- [ ] Application complète aux États-Unis, au Royaume-Uni et au Canada ; nouveaux pays (Belgique, Suisse…)
- [ ] Assistant IA appuyé sur les règles sourcées (questions, catégorisation, rédaction de relances), avec garde-fous
- [ ] API publique et intégrations ; marque blanche pour des banques ou des réseaux d'accompagnement
- [ ] Équipe (support, développement, juridique) et financement
- [ ] Certification de sécurité si les partenaires l'exigent

## Rendez-vous réguliers

| Quand | Quoi |
|---|---|
| Chaque session | Lire « Où en est-on ? », travailler sur l'étape en cours, cocher, mettre à jour la section |
| Chaque mois | Bilan chiffré (Search Console, audience, ventes, comptes) dans « Bilans » |
| Juin et décembre | Veille réglementaire des 4 pays (voir [méthode](04-methode-de-travail.md#calendrier-de-mise-à-jour-des-chiffres)) |
| Fin d'étape | Point de décision dans le [journal des décisions](08-journal-des-decisions.md) |

## Bilans

| Mois | Pages indexées | Visites | Ventes | Comptes | Commentaire |
|---|---|---|---|---|---|
| Octobre 2026 | 81 pages publiées (indexation à suivre) | non mesuré | Kit FR en vente | — | Fin de l'étape 0 |

## Historique — E0 : le site d'outils gratuits (terminée en octobre 2026)

### Phase 0 — Socle multi-pays

- [x] Site français en ligne : 8 outils, 11 pages, tests navigateur
- [x] Google Search Console vérifiée, plan du site envoyé
- [x] Plan, besoins, architecture, méthode (ce dossier)
- [x] Recherche des règles officielles 2026 : France, États-Unis, Royaume-Uni, Canada (points à revérifier listés dans chaque fiche pays)
- [x] Générateur multi-sections (`config/locales.json`, `content/<section>/`, `hreflang`)
- [x] Section France déplacée sous `/fr/`, redirection des anciennes adresses
- [x] Accueil mondial avec choix du pays, page 404 bilingue
- [x] Menu par catégories (menus déroulants, panneau mobile), sélecteur de pays
- [x] Saisie et affichage des nombres selon la langue (`1 234,50 €` / `$1,234.50`)
- [x] Moteurs de calcul séparés et tests unitaires (barème progressif, impôts US) — à étendre aux outils français
- [x] Bloc « Sources et date de vérification » sur les pages de calcul

### Phase 1 — États-Unis (`/us/`)

- [x] *Freelance invoice generator* (avec *estimate*)
- [x] *Hourly rate calculator* (avec équivalent journalier et annuel)
- [x] *Self-employment tax calculator* (SE tax + impôt fédéral + QBI)
- [x] *Quarterly estimated tax calculator* (échéances, règle de sécurité, export agenda)
- [x] *How much to set aside for taxes* (page dédiée, avec répartition d'un paiement)
- [x] *Late fee calculator* + *payment reminder emails*
- [x] *Freelance email templates*
- [x] Guides : 1099-NEC et W-9 (vérificateur), *Freelance Isn't Free Act* et lois locales (vérificateur)
- [x] *Privacy policy* et *legal notice*

### Phase 2 — Royaume-Uni (`/uk/`)

- [x] *Invoice generator* (sole trader, limited company, VAT)
- [x] *Day rate calculator*
- [x] *Self-employed tax calculator* (income tax Angleterre/Écosse + Class 4 NI + payments on account)
- [x] *VAT calculator* + seuil d'immatriculation
- [x] *Late payment interest calculator* (Late Payment Act, indemnité fixe)
- [x] *Payment reminder letters* (jusqu'à la *letter before action*)
- [x] *Sole trader vs limited company calculator*
- [x] Guide *Making Tax Digital* (avec vérificateur)

### Phase 3 — Canada (`/ca/` et `/ca/fr/`)

- [x] Générateur de facture avec numéro de TPS/TVH et taxes par province
- [x] Calculateur TPS/TVH/TVQ/TVP par province
- [x] Calculateur d'impôt du travailleur autonome (fédéral + provincial + RPC/RRQ)
- [x] Calculateur d'acomptes provisionnels (intégré au calculateur d'impôt)
- [x] Calculateur de taux horaire
- [x] Relances de paiement, intérêts de retard et modèles d'emails (anglais et français)

### Phase 4 — France, aller plus loin

- [x] Comparateur de statuts : micro-entreprise, entreprise au réel (EI / EURL à l'IR), SASU (salaire / dividendes), EURL à l'IS (cotisations TNS sur les dividendes au-delà de 10 % du capital)
- [x] Rubrique facturation électronique : calendrier, obligations, plateformes agréées, nouvelles mentions, checklist
- [x] Mention de franchise de TVA : art. 293 B du CGI jusqu'au 31/12/2026, art. L. 233-3 du CIBS ensuite (report par l'ordonnance n° 2026-671) — numéro à revérifier sur Légifrance en décembre 2026
- [x] Générateur de facture : nouvelles mentions de la réforme (SIREN du client, nature de l'opération…)
- [x] Indemnités kilométriques (barème officiel)
- [x] Calendrier fiscal et social avec export agenda
- [x] Calcul de date d'échéance (30 jours, 45 jours fin de mois — deux méthodes —, 60 jours)
- [x] Générateur de contrat de prestation (FR, US, UK, Canada anglais et français)

### Phase 6 — Outils universels et contenus

- [x] Calendrier fiscal par pays avec export .ics
- [x] Indemnités kilométriques des 4 pays
- [x] Épargne retraite des indépendants (PER, SEP-IRA / Solo 401(k), pension UK, REER)
- [x] Facturer un client étranger (assistant TVA + option du générateur de facture)
- [ ] Guides de fond : recouvrement judiciaire, assurance, compte pro → reportés dans E1 (1.4)
