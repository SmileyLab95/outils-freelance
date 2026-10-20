# Journal des modifications

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
