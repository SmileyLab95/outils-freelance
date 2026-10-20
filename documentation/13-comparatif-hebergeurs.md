# 13. Comparatif des hébergeurs pour les comptes en ligne (étape C1)

Rédigé le 20/10/2026 pour la décision d'Ismail : choix de l'hébergeur et du budget de départ
([12](12-specification-comptes.md), § 8). Il applique la recommandation technique de [12](12-specification-comptes.md), § 4 :
synchronisation chiffrée de bout en bout (option C), hébergée chez un fournisseur français (option B).

**Limite importante** : les pages tarifaires des hébergeurs ne sont pas consultables depuis l'environnement de travail
de Claude (accès refusé par le réseau). Les prix ci-dessous ont été **relevés le 20/10/2026 par recherche web**, avec
leur source ; plusieurs sources sont des sites tiers et certaines se contredisent. Ce sont des **ordres de grandeur hors
taxes**, à vérifier sur les grilles officielles (liens au § 6) avant toute souscription.

## 1. Ce qu'il faut héberger

| Brique | Rôle | Remarque |
|---|---|---|
| Petite API | Connexion (lien par email, clés d'accès), réception et envoi des données chiffrées, limites de requêtes | Le moteur de fusion tourne sur l'appareil ([12](12-specification-comptes.md), § 3.1) : le serveur ne calcule rien sur les données |
| Base PostgreSQL managée | Comptes, appareils liés, blocs chiffrés et leurs versions | Sauvegardes quotidiennes, restauration testée chaque mois (§ 5 de 12) |
| Envoi d'emails | Liens de connexion ; rappels d'échéances à l'étape C5 | Depuis le domaine du site (voir § 5) |
| Stockage objet (facultatif) | Copies des sauvegardes de la base | Quelques gigaoctets au plus au départ |

**Volume attendu** : une facture émise de trois lignes occupe environ 1 Ko (mesuré sur les données de test, avant
chiffrement). Même à 500 documents par an et par compte, 1 000 comptes représentent moins d'un gigaoctet : le coût du
stockage est négligeable ; c'est l'abonnement minimal de chaque service qui compte.

## 2. Offres relevées (hors taxes)

| | Scaleway (Paris) | OVHcloud | Clever Cloud | Supabase (option A, pour référence) |
|---|---|---|---|---|
| API | Conteneurs sans serveur facturés à l'usage, avec un volume gratuit chaque mois (200 000 vCPU-s et 400 000 Go-s) [S1] ; ou petite instance DEV1-S vers 6,5 €/mois [S2] | VPS-1 à partir d'environ 4,5 $/mois, avec engagement de 12 mois ; prix en euros à vérifier [O1] | Instance « nano » (1 vCPU, 512 Mo) vers 6 €/mois, « XS » (1 Go) vers 16 €/mois [C1] | Comprise (fonctions et API fournies) |
| PostgreSQL managé, entrée de gamme | DEV-S (2 vCPU, 2 Go) vers **11 €/mois**, 21 € en haute disponibilité ; stockage vers 0,10 €/Go/mois, sauvegardes 0,03 €/Go/mois [S3] | Essential DB1-4 : 0,0746 € par heure et par nœud depuis avril 2026 [O2], soit environ **54 €/mois** (calcul de Claude sur 730 heures) | Prix actuel non trouvé ; un tableau ancien (2024) commençait à 5,25 €/mois [C2] | Offre « Pro » à partir de 25 $/mois, avec 10 $ de crédit de calcul [U1] |
| Emails | Service d'emails transactionnels : 300 emails gratuits par mois, puis 0,25 € les 1 000 [S4] | Pas de service relevé ; par exemple Brevo (300 emails par jour gratuits) [B1] | Pas de service relevé ; même solution externe | Non relevé |
| Stockage objet | Vers 0,0146 €/Go/mois, 75 Go sortants gratuits par mois [S5] | Non relevé | Non relevé | Non relevé |
| Contrat de sous-traitance (art. 28 RGPD) | Intégré aux conditions, s'applique à tous les clients [S6] | Annexe intégrée aux conditions [O3] | Liste des sous-traitants ultérieurs publiée, qui renvoie à son contrat de traitement : centres de données de la région Paris en France, mais quelques sous-traitants hors de l'UE pour des services annexes [C3] | Éditeur américain ; région européenne proposée |
| Points d'attention | Prix modifiés le 1er juin 2026 [S7] : vérifier la grille du jour | Base managée d'entrée de gamme bien plus chère ; une base installée soi-même sur un VPS coûte moins mais laisse à notre charge mises à jour et sauvegardes | Déploiement le plus simple (envoi du code) ; prix de la base à confirmer | Option écartée dans [12](12-specification-comptes.md) (éditeur non européen) |

## 3. Budget de départ estimé (par mois, hors taxes)

| Poste | Scaleway | OVHcloud | Clever Cloud |
|---|---|---|---|
| API | 0 € dans le volume gratuit (faible trafic de la bêta) à 7 € avec une instance | 5 à 7 € | 6 € (nano) |
| Base PostgreSQL | 11 à 12 € (21 € en haute disponibilité) | 54 € (managée) ou 0 € de plus (installée sur le VPS) | À confirmer (au moins 5 € selon un relevé ancien) |
| Emails | 0 € jusqu'à 300 par mois | 0 € jusqu'à 300 par jour (Brevo) | 0 € jusqu'à 300 par jour (Brevo) |
| **Total** | **environ 12 à 20 €** ; 22 à 30 € en haute disponibilité | environ 60 € (managé) ; 5 à 7 € (installé soi-même) | au moins 11 €, à confirmer |

S'y ajoute le **nom de domaine** (coût annuel à relever lors du choix de la marque, feuille de route 1.1).

## 4. Recommandation de Claude

**Scaleway**, région de Paris, pour démarrer :

1. Toutes les briques chez un seul fournisseur français, sous un seul contrat de sous-traitance déjà intégré aux
   conditions générales.
2. L'entrée de gamme managée la moins chère relevée (base PostgreSQL vers 11 €/mois), avec sauvegardes gérées.
3. Une API sans serveur gratuite tant que le trafic reste faible, et un service d'emails avec un volume gratuit.
4. Budget de départ proposé : **20 à 30 € HT par mois**, avec une alerte de dépense à 30 € (dans la console du
   fournisseur, si elle est proposée). Base sans haute
   disponibilité pendant la bêta privée (C6), haute disponibilité à l'ouverture à tous.

**Alternative** : Clever Cloud, si la simplicité de déploiement est préférée, après confirmation du prix de sa base.
OVHcloud n'est pas recommandé pour démarrer (base managée vers 54 €/mois ; la base installée soi-même ajoute de
l'exploitation et du risque).

Ce comparatif n'est pas un conseil juridique : Ismail lit et accepte le contrat de sous-traitance du fournisseur choisi.

## 5. Dépendance à décider : le nom de domaine avant l'ouverture des comptes

- Les **clés d'accès** (passkeys) sont liées au domaine sur lequel elles ont été créées : si le site change de domaine
  ensuite, chaque utilisateur doit recréer les siennes (sauf passage à un sous-domaine du domaine d'origine) [D1], [D2].
- Les **emails de connexion** doivent partir du domaine du site, configuré auprès du service d'envoi (enregistrements
  SPF et DKIM) [S8] ; une adresse générique arriverait plus souvent dans les indésirables.

Conséquence : la décision D10 place la marque et le domaine à la fin ; pour les comptes, **le domaine doit être choisi
avant l'étape C4** (interface des comptes, essais des clés d'accès), donc avant la bêta privée. Le déménagement du site
lui-même peut rester à la fin. Décision d'Ismail.

## 6. Ce qu'Ismail aura à faire (Claude prépare tout le reste)

- [ ] **[Ismail]** Vérifier les prix sur les pages officielles : [Scaleway, bases managées](https://www.scaleway.com/fr/tarifs/managed-databases/),
      [Scaleway, sans serveur](https://www.scaleway.com/fr/tarifs/serverless/), [Scaleway, emails](https://www.scaleway.com/fr/transactional-email-tem/),
      [OVHcloud, Public Cloud](https://www.ovhcloud.com/fr/public-cloud/prices/), [Clever Cloud, tarifs](https://www.clever.cloud/pricing/).
- [ ] **[Ismail]** Choisir l'hébergeur et valider le budget mensuel de départ.
- [ ] **[Ismail]** Ouvrir le compte au nom de la structure qui encaissera les abonnements (décision « structure
      juridique » en attente), activer la double authentification, fixer l'alerte de dépense, accepter le contrat
      de sous-traitance.
- [ ] **[Ismail]** Créer pour Claude un projet dédié et une clé d'accès limitée à ce projet (jamais l'accès
      d'administration du compte).
- [ ] **[Ismail]** Avancer le choix du nom de domaine avant l'étape C4 (§ 5).

## 7. Sources (consultées le 20/10/2026)

- [S1] Scaleway, tarifs des conteneurs sans serveur : [scaleway.com/fr/tarifs/serverless](https://www.scaleway.com/fr/tarifs/serverless/) et
  [facturation des conteneurs](https://scaleway.com/en/docs/serverless/containers/reference-content/containers-billing) (les deux pages
  divergent sur le prix de la mémoire au-delà du volume gratuit).
- [S2] Scaleway, tarifs des instances : [scaleway.com/fr/tarifs/virtual-instances](https://scaleway.com/fr/tarifs/virtual-instances) ;
  relevé tiers : [vpsbenchmarks.com, DEV1-S](https://vpsbenchmarks.com/hosters/scaleway/plans/dev1-s).
- [S3] [HostStack, « Scaleway Managed PostgreSQL Pricing 2026 »](https://hoststack.dev/blog/scaleway-postgresql-pricing-2026) (prix
  catalogue de la région de Paris relevés le 22/09/2026) ; ordre de grandeur voisin dans
  [« State of Managed Databases 2026 »](https://dev.to/atmeszaros/state-of-managed-databases-2026-market-benchmark-and-cost-analysis-5h0g).
- [S4] [Scaleway, Transactional Email](https://www.scaleway.com/fr/transactional-email-tem/) et
  [limites du service](https://scaleway.com/en/docs/transactional-email/reference-content/tem-capabilities-and-limits).
- [S5] [Scaleway, tarifs du stockage](https://www.scaleway.com/fr/tarifs/storage).
- [S6] [Scaleway, politique de confidentialité](https://www.scaleway.com/en/privacy-policy) (renvoi au contrat de sous-traitance) ;
  [donneespersonnelles.fr, « Scaleway et le RGPD »](https://donneespersonnelles.fr/scaleway-rgpd).
- [S7] [Scaleway, « Une mise à jour claire sur les tarifs de Scaleway »](https://www.scaleway.com/fr/blog/a-transparent-update-on-scaleway-pricing/).
- [S8] [Scaleway, configurer un domaine pour l'envoi d'emails](https://www.scaleway.com/en/docs/transactional-email/how-to/configure-domain-with-transactional-email/).
- [O1] [vpsbenchmarks.com, OVHcloud VPS-1](https://www.vpsbenchmarks.com/hosters/ovhcloud/plans/vps-1) (relevé du 18/08/2026, sources
  contradictoires sur ce produit).
- [O2] [OVHcloud, évolution des prix du Public Cloud, du Bare Metal et des VPS](https://blog.ovhcloud.com/en/posts/pricing-evolution-of-public-cloud-bare-metal-and-vps-at-ovhcloud/).
- [O3] [donneespersonnelles.fr, « OVHcloud et le RGPD »](https://donneespersonnelles.fr/ovhcloud-rgpd).
- [C1] [Clever Cloud, comparaison avec Heroku](https://www.clever.cloud/clever-cloud-vs-heroku/).
- [C2] [Medium, « PostgreSQL Hostings Prices »](https://medium.com/@vosarat1995/postgresql-hostings-prices-some-are-free-397c88cc847d) (2024, ancien).
- [C3] [Clever Cloud, liste des sous-traitants ultérieurs (septembre 2026)](https://cdn.clever-cloud.com/uploads/2026/09/sous-traitants-ulterieurs-de-clever-cloud.pdf).
- [U1] [we.inc, « Supabase Pricing (Oct 2026) »](https://we.inc/guides/supabase-pricing) et
  [MakerKit, « Supabase Pricing in 2026 »](https://makerkit.dev/blog/saas/supabase-pricing).
- [B1] [Moosend, « Brevo Pricing: In-Depth Analysis [2026] »](https://moosend.com/blog/brevo-pricing/).
- [D1] [Corbado, « What is the relying party ID? »](https://docs.corbado.com/helpful-guides/passkeys/relying-party-id).
- [D2] [Okta, partage des clés d'accès entre domaines associés](https://support.okta.com/help/s/article/faq-on-sharing-passkeys-with-the-associated-domains).
