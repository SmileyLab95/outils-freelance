# Journal des modifications

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
