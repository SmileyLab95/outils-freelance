# 35. Pages « Offres » et « Soutenir », solutions de dons

Suite de la [vision](31-vision-plateforme.md) (§ 2 : quatre niveaux d'accès ; § 5, étape 4) et de la grille des
offres ([17](17-offres-et-paiements.md)). Spécification et comparatif pour la décision d'Ismail, 23/10/2026. Les deux
pages restent en **brouillon** tant que le prix du Pro, le prestataire de paiement et la solution de dons ne sont pas
choisis. Aucun conseil fiscal personnalisé : les points marqués « à valider » vont à l'expert-comptable.

## 1. Ce que disent les règles

| Point | Règle | Source | Conséquence pour la page |
|---|---|---|---|
| Réduction d'impôt du donateur | Les dons faits à des entreprises ne relèvent pas du régime du mécénat ; la réduction d'impôt des particuliers (CGI, art. 200) vise des organismes d'intérêt général, qui délivrent le reçu (formulaire 2041-RD) | BOFiP, BOI-BIC-RICI-20-30-10-10 ; associations.gouv.fr, « Dons fiscaux » | Écrire clairement : **pas de reçu fiscal, pas de réduction d'impôt** |
| Contrepartie | Un soutien sans contrepartie ne doit rien réserver : sinon c'est une vente (conditions, TVA, facture) | D30 ; CJCE, *Tolsma*, C-16/93 (1994) : des sommes versées volontairement, sans accord sur un prix ni lien nécessaire avec un service, ne sont pas la contrepartie d'une prestation | Aucune fonction réservée aux donateurs ; remerciement seulement |
| TVA sur les dons | D'après *Tolsma*, un don sans contrepartie n'est pas une prestation à titre onéreux | CJCE, C-16/93 ; confirmé par C-316/18 (2019) pour des dons | **À valider** avec l'expert-comptable pour l'entreprise d'Ismail |
| Impôt sur les dons reçus | BIC : les dons et legs reçus par une entreprise sont imposables comme accroissement de l'actif net (CGI, art. 38, 2) ; BNC : les simples libéralités ne sont pas des recettes imposables, sauf si elles rémunèrent des actes professionnels. En micro-entreprise, on déclare un chiffre d'affaires : le traitement des dons n'a pas été trouvé | BOFiP, BIC-PDSTK (produits exceptionnels) ; BOI-BNC-BASE-20-20 | **À valider** : régime fiscal de l'activité d'Ismail (BIC ou BNC), déclaration des dons, cotisations |
| Conditions des plateformes | Liberapay : seulement des dons, pas de paiement lié à un contrat ou à une promesse de contrepartie ; le bénéficiaire doit résider, ou avoir son entreprise, dans un territoire pris en charge | Liberapay, conditions et FAQ | Compatible si aucune contrepartie (ligne 2) |

## 2. Solutions de dons

Tarifs lus par extraits le 23/10/2026 sur les pages des prestataires : **à revérifier sur les grilles officielles au
moment du choix** (ils changent souvent).

| Solution | Frais de la plateforme | Frais de paiement | Dons ponctuels / mensuels | Points forts | Limites |
|---|---|---|---|---|---|
| **Stripe** (lien de paiement, sur le compte du Pro) | Aucun | Cartes de l'EEE : 1,5 % + 0,25 € ([17](17-offres-et-paiements.md)) | Oui / oui (abonnement) | Un seul prestataire pour le Pro et les dons ; page aux couleurs du site ; paiement sans quitter une marque connue | À ouvrir au nom de l'entreprise d'Ismail ; les dons y apparaissent comme des encaissements à justifier |
| **Liberapay** (association à but non lucratif) | Aucune commission (financée par des dons) | Moyennes annoncées : environ 3 % avec Stripe, 5 % avec PayPal | Mal pris en charge / oui | Plateforme sans but lucratif, cohérente avec la promesse du site | Dons plafonnés à 100 $ par semaine et par donateur ; dons ponctuels mal pris en charge ; page Liberapay, pas celle du site |
| **Ko-fi** | 0 % sur les dons ponctuels selon l'aide, 5 % sur le reste ; la page des prix indique 5 % sur tout : **contradiction à lever** | Ceux de PayPal ou de Stripe, en plus | Oui / oui | Très connu, simple, sans abonnement | Fonds versés sur le compte PayPal ou Stripe du créateur ; marque Ko-fi |
| **Buy Me a Coffee** | 5 % | Ceux de Stripe, en plus | Oui / oui | Très connu, simple | 5 % sur chaque don ; marque tierce |

**Recommandation de Claude** : **Stripe**, si Ismail le choisit aussi pour le Pro ([17](17-offres-et-paiements.md)) :
frais les plus bas, aucune commission de plateforme, un seul prestataire à déclarer et à suivre, et une page qui reste
celle du site. **Liberapay** est la meilleure solution si Ismail préfère une plateforme sans but lucratif et accepte
qu'elle ne fasse que des dons mensuels. Dans les deux cas, demander d'abord à l'expert-comptable comment déclarer les
dons (§ 1, lignes 3 et 4).

## 3. Page « Offres »

- Trois colonnes, mêmes mots dans toutes les sections : **Gratuit** (tous les outils, sans compte ; compte gratuit :
  Espace, sauvegarde chiffrée, synchronisation, rappels), **Pro** (relances automatiques, signature en ligne, liens de
  paiement, facturation électronique par plateforme agréée, exports, page publique ; prix affiché seulement après la
  décision d'Ismail), **Soutenir** (don libre, sans contrepartie).
- Règle de la vision : le gratuit n'est jamais bridé pour pousser au Pro sur l'essentiel (facturer juste, déclarer
  juste) ; la page le dit.
- Ce que le Pro ne fait pas encore est marqué « bientôt », jamais présenté comme disponible.
- Questions fréquentes : que reste-t-il gratuit, pourquoi un Pro, peut-on résilier à tout moment (à écrire avec les CGV),
  où vont les données.

## 4. Page « Soutenir »

- Pourquoi soutenir : le site reste gratuit, sans publicité ni revente de données ; les dons paient l'hébergement, la
  vérification des règles aux sources officielles et les nouveaux outils.
- Ce que le don n'est pas : **ni un achat, ni un don à une association** : pas de reçu fiscal, pas de réduction
  d'impôt ; aucune fonction réservée aux donateurs.
- Un bouton par solution choisie (§ 2), avec la mention de la plateforme ; montant libre ; ponctuel ou mensuel selon
  la solution.
- Transparence, quand il y aura des dons : ce qu'ils ont financé (sans montant inventé).

## 5. Tests

- Pages en brouillon (`OF_DRAFTS=1`) : construites, non indexées, absentes du plan du site et des menus publics ;
  accessibilité ; mobile ; aucun lien de paiement actif tant que les choix ne sont pas faits.

## 6. Tâches d'Ismail

- [ ] **[Ismail]** Choisir la solution de dons (§ 2), après avoir posé à l'expert-comptable les questions du § 1
      (TVA, impôt, cotisations, déclaration des dons selon le régime de son activité).
- [ ] **[Ismail]** Prix du Pro et prestataire de paiement (déjà en attente, [17](17-offres-et-paiements.md)).

## 7. Réalisation (23/10/2026, brouillon)

- `content/fr/offres.html` et `content/fr/soutenir.html` (pages « draft ») ; parcours des brouillons : titre, page non
  indexée, absente du site public et du plan du site, aucun lien de paiement, phrase « pas de reçu fiscal, pas de
  réduction d'impôt », accessibilité ; captures relues (ordinateur, mobile).

## 8. Sources

- BOFiP : BOI-BIC-RICI-20-30-10-10 (mécénat, organismes bénéficiaires : les dons faits à des entreprises ne sont pas
  éligibles) ; BIC-PDSTK, produits exceptionnels (dons reçus, CGI art. 38, 2) ; BOI-BNC-BASE-20-20 (nature des
  recettes, libéralités). Lus par extraits de recherche le 23/10/2026.
- associations.gouv.fr, « Dons fiscaux » (reçu délivré par l'organisme bénéficiaire).
- CJCE, 3 mars 1994, *Tolsma*, C-16/93 (EUR-Lex) ; CJUE, C-316/18 (2019).
- Liberapay : FAQ, prestataires de paiement, conditions. Ko-fi : page des prix et centre d'aide. Buy Me a Coffee :
  conditions d'utilisation et FAQ. Stripe : grille des prix (voir [17](17-offres-et-paiements.md)).
