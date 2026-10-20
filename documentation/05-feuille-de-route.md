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
- [x] *How much to set aside for taxes* (page dédiée, avec répartition d'un paiement)
- [x] *Late fee calculator* + *payment reminder emails*
- [x] *Freelance email templates*
- [x] Guides : 1099-NEC et W-9 (vérificateur), *Freelance Isn't Free Act* et lois locales (vérificateur)
- [x] *Privacy policy* et *legal notice*

## Phase 2 — Royaume-Uni (`/uk/`)

- [x] *Invoice generator* (sole trader, limited company, VAT)
- [x] *Day rate calculator*
- [x] *Self-employed tax calculator* (income tax Angleterre/Écosse + Class 4 NI + payments on account)
- [x] *VAT calculator* + seuil d'immatriculation
- [x] *Late payment interest calculator* (Late Payment Act, indemnité fixe)
- [x] *Payment reminder letters* (jusqu'à la *letter before action*)
- [x] *Sole trader vs limited company calculator*
- [x] Guide *Making Tax Digital* (avec vérificateur)

## Phase 3 — Canada (`/ca/` et `/ca/fr/`)

- [x] Générateur de facture avec numéro de TPS/TVH et taxes par province
- [x] Calculateur TPS/TVH/TVQ/TVP par province
- [x] Calculateur d'impôt du travailleur autonome (fédéral + provincial + RPC/RRQ)
- [x] Calculateur d'acomptes provisionnels (intégré au calculateur d'impôt)
- [x] Calculateur de taux horaire
- [x] Relances de paiement, intérêts de retard et modèles d'emails (anglais et français)

## Phase 4 — France, aller plus loin

- [x] Comparateur de statuts : micro-entreprise, entreprise au réel (EI / EURL à l'IR), SASU (salaire / dividendes), EURL à l'IS (cotisations TNS sur les dividendes au-delà de 10 % du capital)
- [x] Rubrique facturation électronique : calendrier, obligations, plateformes agréées, nouvelles mentions, checklist
- [x] Mention de franchise de TVA mise à jour (art. L. 223-3 du CIBS)
- [x] Générateur de facture : nouvelles mentions de la réforme (SIREN du client, nature de l'opération…)
- [x] Indemnités kilométriques (barème officiel)
- [x] Calendrier fiscal et social avec export agenda
- [x] Calcul de date d'échéance (30 jours, 45 jours fin de mois — deux méthodes —, 60 jours)
- [x] Générateur de contrat de prestation (FR, US, UK, Canada anglais et français)

## Phase 5 — Revenus (reportée à la fin, sur décision du 20/10/2026 : d'abord terminer le site, puis Gumroad, puis l'affiliation)

- [ ] Inscription aux programmes d'affiliation prioritaires (voir [06-affiliation.md](06-affiliation.md))
- [ ] Encarts « Outils recommandés » avec mention de transparence
- [ ] Mise en vente du kit US sur Gumroad, offre affichée sur `/us/` et `/ca/`
- [ ] Gamme de produits : pack contrats et CGV, kit facturation électronique, kits UK et Canada
- [ ] Produit gratuit sur Gumroad pour constituer la liste d'emails
- [ ] Nom de domaine, puis AdSense avec consentement (après environ 10 000 visites par mois)

## Phase 6 — Outils universels et contenus

- [x] Calendrier fiscal par pays avec export .ics
- [x] Indemnités kilométriques des 4 pays
- [x] Épargne retraite des indépendants (PER, SEP-IRA / Solo 401(k), pension UK, REER)
- [ ] Guides de fond : facturer un client étranger, recouvrement, assurance, compte pro

## Points de contrôle

| Date | Question | Décision possible |
|---|---|---|
| +3 mois après la phase 1 | Combien de pages indexées et d'impressions par pays ? | Renforcer le pays qui démarre le mieux |
| +6 mois | Clics, ventes, premières commissions ? | Continuer, réorienter ou ajouter un pays |
| +12 mois | Revenu mensuel et tendance | Acheter des contenus ou des outils supplémentaires, publicité |
