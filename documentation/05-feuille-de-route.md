# 5. Feuille de route

Les phases s'enchaînent dans cet ordre ; une phase n'est terminée que lorsque toutes ses pages respectent la [définition de « terminé »](04-methode-de-travail.md#définition-de--terminé-).

## Phase 0 — Socle multi-pays

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

## Phase 1 — États-Unis (`/us/`)

- [x] *Freelance invoice generator* (avec *estimate*)
- [x] *Hourly rate calculator* (avec équivalent journalier et annuel)
- [x] *Self-employment tax calculator* (SE tax + impôt fédéral + QBI)
- [x] *Quarterly estimated tax calculator* (échéances, règle de sécurité, export agenda)
- [x] *How much to set aside for taxes* (intégré au calculateur d'impôts) — page dédiée à créer
- [x] *Late fee calculator* + *payment reminder emails*
- [x] *Freelance email templates*
- [ ] Guides : 1099-NEC et W-9, *Freelance Isn't Free Act*
- [x] *Privacy policy* et *legal notice*

## Phase 2 — Royaume-Uni (`/uk/`)

- [ ] *Invoice generator* (sole trader, limited company, VAT)
- [ ] *Day rate calculator*
- [ ] *Self-employed tax calculator* (income tax Angleterre/Écosse + Class 4 NI + payments on account)
- [ ] *VAT calculator* + seuil d'immatriculation
- [ ] *Late payment interest calculator* (Late Payment Act, indemnité fixe)
- [ ] *Payment reminder letters* (jusqu'à la *letter before action*)
- [ ] *Sole trader vs limited company calculator*
- [ ] Guide *Making Tax Digital*

## Phase 3 — Canada (`/ca/` et `/ca/fr/`)

- [ ] Générateur de facture avec numéro de TPS/TVH et taxes par province
- [ ] Calculateur TPS/TVH/TVQ/TVP par province
- [ ] Calculateur d'impôt du travailleur autonome (fédéral + provincial + RPC/RRQ)
- [ ] Calculateur d'acomptes provisionnels
- [ ] Calculateur de taux horaire
- [ ] Relances de paiement et modèles d'emails (anglais et français)

## Phase 4 — France, aller plus loin

- [ ] Comparateur de statuts : micro-entreprise, EI au réel, EURL, SASU
- [ ] Rubrique facturation électronique : calendrier, obligations, plateformes agréées, nouvelles mentions
- [ ] Générateur de facture : nouvelles mentions de la réforme (SIREN du client, nature de l'opération…)
- [ ] Indemnités kilométriques (barème officiel)
- [ ] Calendrier fiscal et social avec export agenda
- [ ] Calcul de date d'échéance
- [ ] Générateur de contrat de prestation

## Phase 5 — Revenus

- [ ] Inscription aux programmes d'affiliation prioritaires (voir [06-affiliation.md](06-affiliation.md))
- [ ] Encarts « Outils recommandés » avec mention de transparence
- [ ] Mise en vente du kit US sur Gumroad, offre affichée sur `/us/` et `/ca/`
- [ ] Gamme de produits : pack contrats et CGV, kit facturation électronique, kits UK et Canada
- [ ] Produit gratuit sur Gumroad pour constituer la liste d'emails
- [ ] Nom de domaine, puis AdSense avec consentement (après environ 10 000 visites par mois)

## Phase 6 — Outils universels et contenus

- [ ] Calendrier fiscal par pays avec export .ics
- [ ] Indemnités kilométriques des 4 pays
- [ ] Épargne retraite des indépendants (PER, SEP-IRA / Solo 401(k), SIPP, REER)
- [ ] Guides de fond : facturer un client étranger, recouvrement, assurance, compte pro

## Points de contrôle

| Date | Question | Décision possible |
|---|---|---|
| +3 mois après la phase 1 | Combien de pages indexées et d'impressions par pays ? | Renforcer le pays qui démarre le mieux |
| +6 mois | Clics, ventes, premières commissions ? | Continuer, réorienter ou ajouter un pays |
| +12 mois | Revenu mensuel et tendance | Acheter des contenus ou des outils supplémentaires, publicité |
