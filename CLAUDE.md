# Instructions pour Claude — projet Outils Freelance

- **Règle n° 1 (Ismail, 20/10/2026)** : tout produit ou service est fait avec le **maximum de qualité possible**.
  Appliquer la charte qualité de `documentation/04-methode-de-travail.md` sans exception : spécification avant le code,
  règles vérifiées aux sources officielles, moteurs testés, une seule source de vérité, accessibilité, rendu relu sur
  ordinateur, tablette et mobile, relecture critique du code et des textes avant chaque publication.

- **Langue** : répondre en français à Ismail (le propriétaire du projet).
- **Avant de travailler** : lire la section « Où en est-on ? » de `documentation/05-feuille-de-route.md`, et le cap dans
  `documentation/07-plan-de-developpement.md`. Travailler sur l'étape en cours, sauf demande contraire d'Ismail.
- **Méthode** : suivre `documentation/04-methode-de-travail.md` (circuit d'un outil, définition de « terminé »).
  Aucun chiffre sans source dans `data/rules/` ; aucun chiffre, témoignage ou statistique inventé.
- **Vérifier avant de publier** : `python3 build.py`, `node --test tests/unit/*.test.mjs`,
  `node tests/e2e/verifier.mjs <dossier de captures>` ; relire les captures d'écran. Si la facturation change :
  `node tests/facturx/generer.mjs <dossier>` puis `python3 tests/facturx/valider.py <dossier> --controle`.
- **Après le travail** : cocher la feuille de route, mettre à jour « Où en est-on ? » (date, étape, prochaines actions,
  actions en attente d'Ismail), le `CHANGELOG.md`, et le journal des décisions (`documentation/08-journal-des-decisions.md`)
  si une décision a été prise. Puis commit sur `main` et vérification de la publication GitHub Pages.
- **Tâches [Ismail]** : comptes, contrats, paiements, décisions ; les préparer au maximum, ne jamais les faire à sa place.
- **Prudence** : ne pas donner de conseil juridique ou comptable personnalisé ; ne jamais publier de données personnelles
  d'Ismail ; signaler toute règle fiscale incertaine plutôt que de la publier.
- **Ordre des priorités** : d'abord le site et la plateforme ; les noms de domaine, Gumroad et l'affiliation à la fin
  (décisions D4 et D10).
