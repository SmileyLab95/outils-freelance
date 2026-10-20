# 5. Feuille de route

Le cap est fixé par le [plan de développement](07-plan-de-developpement.md) : passer du site d'outils gratuits à la
**plateforme de l'entrepreneur avec un compte**. Cette page détaille les tâches, étape par étape.

**Règles** : on travaille sur l'étape en cours ; une étape n'est terminée que si son critère de passage est atteint ;
chaque session commence par la lecture de « Où en est-on ? » et se termine par sa mise à jour. Les tâches marquées
**[Ismail]** ne peuvent être faites que par Ismail (comptes, contrats, paiements, décisions).

## Où en est-on ?

*Mis à jour le 20/10/2026.*

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
- **Prochaines actions de Claude** : étude concurrentielle et spécification des comptes en ligne (E2) ; finitions
  SEO (titres et descriptions trop longs) ; guides (recouvrement judiciaire, assurance, compte bancaire) ; veille
  réglementaire de décembre (dont la version de Factur-X et l'annexe A de XP Z12-012 pour le BT-32 en franchise).
- **En attente d'Ismail** (pas urgent) : structure juridique avec un comptable ; plus tard, compte d'hébergement pour
  les comptes en ligne (E2) ; à la fin, marque et domaine, Gumroad.

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

- [ ] Choisir une mesure d'audience sans cookie (pas de bandeau de consentement), l'installer sur toutes les pages
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

- [ ] Finitions SEO : raccourcir les titres de plus de 60 caractères et les descriptions de plus de 160 caractères
      (environ 70 pages, audit du 20/10/2026)
- [ ] Veille de décembre 2026 : barèmes 2027 des 4 pays, PASS 2027, taux d'intérêt légal du 1er semestre 2027,
      numéro définitif de la mention de franchise (L. 233-3 du CIBS), calendriers 2027-2028 (`scripts/calendriers.py`)
- [ ] Guide du recouvrement judiciaire (injonction de payer, procédure simplifiée) une fois les règles 2026 vérifiées
- [ ] Guides : assurance de l'indépendant, compte bancaire professionnel

### 1.5 Préparer la plateforme

- [ ] Étude concurrentielle par pays (fonctions, prix, avis) → grille d'offres et de prix
- [ ] Liste d'attente « Espace entrepreneur » sur le site, avec un court questionnaire sur les besoins
- [x] Spécification du MVP : parcours, écrans, modèle de données, critères d'acceptation (`documentation/09-specification-espace.md`)
- [x] Espace entrepreneur v1 en version locale (France) : voir les fonctions cochées « version locale » en E2.2
- [ ] Choix techniques consignés dans le journal des décisions (socle, hébergement UE, framework, paiements)
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
- [ ] Sécurité : données cloisonnées par utilisateur dans la base, sauvegardes quotidiennes, journal d'audit, limites de requêtes
- [ ] Juridique : CGU, CGV, politique de confidentialité, registre des traitements, contrats de sous-traitance
- [ ] **[Ismail]** Relecture des CGU et CGV par un avocat ; assurance responsabilité civile professionnelle

### 2.2 Fonctions

- [x] Profil entreprise : statut, régime de TVA, coordonnées, ACRE, versement libératoire *(version locale)*
- [ ] Profil : SIREN complété automatiquement (API Recherche d'entreprises)
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
- [ ] Offre Pro : abonnement par Stripe, essai gratuit, factures d'abonnement
- [ ] **[Ismail]** Compte Stripe au nom de l'entreprise
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
