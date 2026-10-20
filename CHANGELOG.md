# Journal des modifications

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
