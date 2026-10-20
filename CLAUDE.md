# Instructions pour Claude — projet Outils Freelance

- **Langue** : répondre en français à Ismail (le propriétaire du projet).
- **Avant de travailler** : lire la section « Où en est-on ? » de `documentation/05-feuille-de-route.md`, et le cap dans
  `documentation/07-plan-de-developpement.md`. Travailler sur l'étape en cours, sauf demande contraire d'Ismail.
- **Méthode** : suivre `documentation/04-methode-de-travail.md` (circuit d'un outil, définition de « terminé »).
  Aucun chiffre sans source dans `data/rules/` ; aucun chiffre, témoignage ou statistique inventé.
- **Vérifier avant de publier** : `python3 build.py`, `node --test tests/unit/*.test.mjs`,
  `node tests/e2e/verifier.mjs <dossier de captures>` ; relire les captures d'écran.
- **Après le travail** : cocher la feuille de route, mettre à jour « Où en est-on ? » (date, étape, prochaines actions,
  actions en attente d'Ismail), le `CHANGELOG.md`, et le journal des décisions (`documentation/08-journal-des-decisions.md`)
  si une décision a été prise. Puis commit sur `main` et vérification de la publication GitHub Pages.
- **Tâches [Ismail]** : comptes, contrats, paiements, décisions ; les préparer au maximum, ne jamais les faire à sa place.
- **Prudence** : ne pas donner de conseil juridique ou comptable personnalisé ; ne jamais publier de données personnelles
  d'Ismail ; signaler toute règle fiscale incertaine plutôt que de la publier.
- **Affiliation** : reportée à la fin (décision D4 du 20/10/2026).
