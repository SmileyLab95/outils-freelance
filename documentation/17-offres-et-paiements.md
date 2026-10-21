# 17. Offres, prix et encaissement des abonnements (feuille de route 1.5)

Rédigé le 21/10/2026 pour deux décisions d'Ismail : le **prix de l'offre « Pro »** et le **prestataire de paiement**
des abonnements (étape C7 des comptes, [12](12-specification-comptes.md) § 7). Les frais ont été relevés le
21/10/2026 par recherche web sur les sites des prestataires, dont certaines pages sont anciennes : **à vérifier sur
la grille du jour avant toute souscription**. Les points de TVA et de facturation sont des **questions à poser à
l'expert-comptable**, pas des conseils (décision D8).

## 1. Grille proposée

Les fonctions des formules de lancement (sans compte, compte gratuit, « Pro ») sont décrites dans
[12](12-specification-comptes.md) § 2 ; le [plan](07-plan-de-developpement.md) § 4 décrit l'offre cible complète
(étape E3 et au-delà), avec des prix indicatifs plus élevés. Ce document fixe la première grille.

| Formule | Prix proposé | Justification |
|---|---|---|
| Outils publics et Espace sans compte | Gratuit (D7) | Promesse du site ; c'est ce qui attire les visiteurs. |
| Compte gratuit | Gratuit | Sauvegarde en ligne et synchronisation entre deux appareils : la raison de créer un compte. |
| « Pro » | **5 € HT par mois, ou 50 € HT par an** (deux mois offerts) | Au milieu de la fourchette de [11](11-etude-concurrentielle.md) (4 à 6 € HT) ; presque deux fois moins que les premières formules payantes des grands acteurs français (9 à 10 € HT par mois avec engagement annuel, relevé du 20/10/2026), comptabilité comprise (absente de notre offre). |

Options à trancher par Ismail :

- **Prix de lancement garanti** pour les membres de la bêta (le prix ne change pas tant que l'abonnement continue) ;
- **Essai** de la formule « Pro » (par exemple 30 jours) sans carte bancaire, ou pas d'essai ;
- formule « Business » (plusieurs utilisateurs) : pas avant d'avoir des abonnés « Pro ».

## 2. Coûts fixes pris en compte (par mois)

| Poste | Montant hors taxes | Source |
|---|---|---|
| Hébergement des comptes (Scaleway recommandé) | 12 à 20 €, 22 à 30 € en haute disponibilité | [13](13-comparatif-hebergeurs.md) § 3 |
| Mesure d'audience (Plausible recommandé) | 9 $, soit environ 8 € | [16](16-mesure-audience.md) ; [cours BCE][bce] du 20/10/2026 (1 € = 1,1215 $) |

Hypothèses du calcul : **30 €** (hébergement en haute disponibilité), ou **38 €** avec la mesure d'audience. Une
entreprise en franchise de TVA ne récupère pas la TVA de ses achats : ces coûts deviennent alors **36 €** et
**45,60 €** (TVA de 20 % supposée sur les deux postes ; traitement d'un service acheté à l'étranger à confirmer, § 5).

**Non compris** : expert-comptable, assurance, avocat, plateforme agréée de facturation électronique, nom de domaine
(budget du [plan](07-plan-de-developpement.md) § 10).

## 3. Prestataires de paiement

| Prestataire | Frais relevés | TVA des ventes | Points d'attention | Sources |
|---|---|---|---|---|
| **Stripe** (Checkout et Billing) | Cartes standard de l'Espace économique européen : 1,5 % + 0,25 € ; prélèvement SEPA : 0,35 € ; Billing (abonnements) : 0,7 % du montant facturé, sans forfait mensuel | À notre charge (Stripe Tax en option : 0,5 % par transaction là où l'on est immatriculé) | Prélèvement SEPA adapté à l'offre annuelle ; la page France affiche aussi un autre tarif carte (1,4 % + 0,10 €), à confirmer | [Tarifs](https://stripe.com/en-fr/pricing), [Billing](https://stripe.com/billing/pricing), [Tax](https://support.stripe.com/questions/understanding-stripe-tax-pricing) |
| **Stripe Managed Payments** (revendeur, dit *merchant of record*) | 3,5 % du montant taxes comprises, en plus des frais de paiement et de Billing | Prise en charge par Stripe (plus de 75 pays selon Stripe) | Disponibilité pour une entreprise française à confirmer (annonces de 2026 pour l'Allemagne) | [Tarif](https://support.stripe.com/questions/managed-payments-pricing), [annonce](https://stripe.com/newsroom/news/stripe-tour-berlin-2026) |
| **Paddle** (revendeur) | 5 % + 0,50 $ par transaction, tout compris (paiement, taxes, fraude, abonnements) | Prise en charge par Paddle | Le revendeur vend à nos clients et nous reverse le montant ; validation du dossier par Paddle avant ouverture | [Paddle](https://www.paddle.com/paddle-101) |
| **Lemon Squeezy** (revendeur, racheté par Stripe) | 5 % + 0,50 $, plus 1,5 % hors des États-Unis et 0,5 % sur les abonnements ; versement : 1 % hors des États-Unis | Prise en charge par Lemon Squeezy | Grille relevée sur une page ancienne | [Frais](https://docs.lemonsqueezy.com/help/getting-started/fees) |
| Mollie | Cartes de l'EEE 1,8 % + 0,25 €, prélèvement SEPA 0,35 € ; frais propres aux abonnements non relevés | À notre charge | Peut-être moins cher que Stripe (cartes, prélèvement), mais page tarifaire ancienne : à vérifier avant la décision | [Mollie](https://www.mollie.com/pricing) |
| GoCardless | Grille en euros non trouvée | À notre charge | Non comparé | [GoCardless](https://gocardless.com/en-us/pricing) |

## 4. Abonnés nécessaires pour couvrir ces coûts (calcul de Claude)

Frais par paiement, sur le montant encaissé (5 € par mois ou 50 € par an), puis nombre d'abonnés « Pro » qui
couvrent les coûts du § 2, **avant cotisations sociales et impôts** (ils dépendent de la structure juridique,
décision d'Ismail avec un expert-comptable). Montants en dollars convertis au cours BCE du 20/10/2026. Chaque case
d'abonnés donne : paiement mensuel / paiement annuel.

| Prestataire | Frais sur 5 € par mois | Frais sur 50 € par an | 30 € HT | 38 € HT | 36 € (TVA non récupérée) | 45,60 € (TVA non récupérée) |
|---|---|---|---|---|---|---|
| Stripe, carte et Billing | 0,36 € (7,2 %) | 1,35 € (2,7 %) | 7 / 8 | 9 / 10 | 8 / 9 | 10 / 12 |
| Stripe, prélèvement SEPA et Billing | 0,39 € (7,7 %) | 0,70 € (1,4 %) | 7 / 8 | 9 / 10 | 8 / 9 | 10 / 12 |
| Stripe Managed Payments, carte et Billing | 0,54 € (10,7 %) | 3,10 € (6,2 %) | 7 / 8 | 9 / 10 | 9 / 10 | 11 / 12 |
| Paddle | 0,70 € (13,9 %) | 2,95 € (5,9 %) | 7 / 8 | 9 / 10 | 9 / 10 | 11 / 12 |
| Lemon Squeezy, versement compris | 0,84 € (16,8 %) | 4,41 € (8,8 %) | 8 / 8 | 10 / 11 | 9 / 10 | 11 / 13 |

Constat : **7 à 13 abonnés** suffisent, selon le prestataire et les hypothèses. À ce stade, les frais comptent moins que la charge administrative (TVA, factures), qui départage les options (§ 5).

## 5. TVA et factures des abonnements : questions pour l'expert-comptable

1. **Franchise en base de TVA** : sous les seuils de 2026 (37 500 € pour les prestations de services, 41 250 € en
   seuil majoré ; `data/rules/fr.json`, clé `tva_franchise_seuils`), pas de TVA facturée, avec la mention de
   franchise. Le prix « 5 € HT » est alors aussi le prix payé ; la TVA des achats n'est pas récupérée (§ 2) : quel
   est alors le coût d'un service acheté à une entreprise d'un autre pays (mesure d'audience) ?
2. **Clients professionnels en France** (la plupart des abonnés, micro-entrepreneurs compris) : à partir du
   **1er septembre 2027**, les PME et micro-entreprises émettent leurs factures entre assujettis établis en France
   sous forme électronique, par une plateforme agréée ; les ventes aux particuliers sont transmises en *e-reporting*
   (clés `facturation_electronique_calendrier` et `facturation_electronique_e_reporting`, de confiance moyenne :
   source à revérifier lors de la veille). Avec Stripe, chaque facture d'abonnement à un professionnel français
   devrait donc passer par une plateforme agréée choisie par l'entreprise d'Ismail, ce qui suppose de demander le
   SIREN de l'abonné pour distinguer professionnels et particuliers.
3. **Particuliers dans d'autres pays de l'Union** : jusqu'à 10 000 € par an (année en cours et année précédente) de
   services électroniques et de ventes à distance vers des particuliers d'autres États membres, les règles
   françaises s'appliquent (donc pas de TVA en franchise) ; au-delà, la TVA du pays du client, déclarée par le
   guichet unique (OSS) ([BOFiP][bofip-oss], [Commission européenne][ce-oss]).
4. **Revendeur** (Paddle, Lemon Squeezy, Stripe Managed Payments) : le revendeur vend aux clients et gère leur TVA ;
   nous lui facturons nos ventes, ou il établit lui-même la facture (autofacturation), à confirmer. À confirmer
   aussi : traitement de ces opérations avec un client non établi en France (*e-reporting*) et effet sur la
   franchise.
5. Mentions des CGV pour un abonnement vendu à des particuliers (droit de rétractation, résiliation) : avec l'avocat
   qui relira les CGU et CGV (feuille de route 2.1).

## 6. Recommandation de Claude

- **Prix** : « Pro » à **5 € HT par mois ou 50 € HT par an**, prix de lancement garanti pour les membres de la bêta.
- **Prestataire** : **Stripe** (Checkout et Billing) à l'ouverture, en France seulement : frais les plus bas des
  options vérifiées (Mollie reste à vérifier), carte et prélèvement SEPA, abonnements et factures intégrés ; les
  factures électroniques de 2027 pourraient passer par la plateforme agréée retenue pour la plateforme elle-même
  (étape E3), si elle convient aussi à l'entreprise d'Ismail. **Revoir l'option revendeur** (Stripe Managed Payments
  ou Paddle) avant d'ouvrir l'offre « Pro » hors de France, où la TVA des particuliers se complique.
- **Alternative** : Paddle dès le départ, si Ismail préfère déléguer toute la TVA et les factures des abonnements,
  pour environ deux fois plus de frais sur les paiements mensuels.

## 7. Tâches d'Ismail

- [ ] **[Ismail]** Choisir le prix (proposition : 5 € HT par mois, 50 € HT par an) et les options du § 1.
- [ ] **[Ismail]** Poser les questions du § 5 à l'expert-comptable, avec le choix de la structure juridique.
- [ ] **[Ismail]** Choisir le prestataire (recommandation : Stripe), après la revérification des grilles par Claude,
      puis ouvrir le compte une fois l'entreprise immatriculée (SIREN et compte bancaire de l'activité) ; Claude
      prépare l'intégration à l'étape C7.

[bce]: https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.fr.html
[bofip-oss]: https://bofip.impots.gouv.fr/bofip/13240-PGP.html/identifiant=BOI-TVA-DECLA-20-20-60-10-20220629
[ce-oss]: https://taxation-customs.ec.europa.eu/vat-e-commerce_fr
