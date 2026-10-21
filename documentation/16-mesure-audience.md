# 16. Mesure d'audience : règles, options et recommandation (feuille de route 1.2)

Rédigé le 21/10/2026 pour la décision d'Ismail (choix de l'outil et ouverture du compte). Objectif : savoir quelles
pages et quels outils servent, par pays, **sans bandeau de cookies** et sans trahir la promesse de confidentialité
du site. Prix relevés par recherche web sur les sites des éditeurs, à vérifier avant souscription ; ce document
n'est pas un conseil juridique.

## 1. Ce que dit la CNIL

- Une mesure d'audience peut être **exemptée de consentement** si elle sert uniquement à mesurer l'audience du site,
  pour le seul compte de l'éditeur, produit des statistiques anonymes, ne permet pas de suivre la navigation d'un
  site à l'autre et n'est ni recoupée avec d'autres traitements ni transmise à des tiers ; un identifiant commun à
  plusieurs sites est exclu ([CNIL, « Mesurer la fréquentation de vos sites web et de vos applications »](https://www.cnil.fr/fr/mesurer-la-frequentation-de-vos-sites-web-et-de-vos-applications)).
- Recommandations associées : traceurs de treize mois au plus, sans prolongation automatique ; données conservées
  vingt-cinq mois au plus ; **engagement contractuel du fournisseur** de ne pas réutiliser les données ; un moyen pour
  l'internaute de **s'opposer** à la mesure ([même page](https://www.cnil.fr/fr/mesurer-la-frequentation-de-vos-sites-web-et-de-vos-applications)).
- La CNIL publie des guides de configuration pour des outils identifiés et un outil d'auto-évaluation destiné aux
  éditeurs de solutions (juillet 2025) ; aucun outil ne peut se dire « certifié » par la CNIL
  ([CNIL, « Cookies : solutions pour les outils de mesure d'audience »](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience)).

Les outils ci-dessous n'enregistrent rien sur l'appareil de l'internaute, d'après leurs éditeurs. Le site les
appliquerait dans les conditions ci-dessus : mesure du seul site, sans recoupement, mention dans la politique de
confidentialité avec un moyen de s'opposer.

## 2. Options relevées (hors taxes)

| Outil | Prix relevé | Hébergement | Points forts | Limites |
|---|---|---|---|---|
| Plausible (hébergé) | 9 $/mois jusqu'à 10 000 pages vues, 1 site ; 14 $ jusqu'à 3 sites ; 19 $ jusqu'à 10 sites ([plausible.io](https://plausible.io/)) | Union européenne, infrastructure européenne (éditeur) | Logiciel libre (version communautaire à héberger soi-même plus tard) ; très répandu | Payant dès le départ |
| Pirsch | À partir de 6 $/mois pour 10 000 pages vues ; essai de 30 jours ([pirsch.io/pricing](https://pirsch.io/pricing)) | Allemagne, Hetzner ([pirsch.io](https://pirsch.io/privacy-friendly-analytics)) | Le moins cher des outils payants relevés ; sans cookie | Logiciel moins ouvert ; sortie moins simple |
| GoatCounter | Gratuit pour un usage raisonnable (dons) ([goatcounter.com](https://www.goatcounter.com/)) | Non précisé dans les pages relevées | Gratuit ; données agrégées, sans adresse IP conservée selon l'éditeur ([GDPR](https://www.goatcounter.com/help/gdpr)) | Service d'un seul développeur ; lieu d'hébergement à vérifier ; trafic très élevé non accepté |
| Matomo hébergé chez nous | Logiciel libre ; coût de l'hébergement (comptes en ligne, [13](13-comparatif-hebergeurs.md)) | Celui choisi par Ismail (France) | Maîtrise complète ; guide de configuration CNIL publié par l'éditeur ([Matomo](https://matomo.org/wp-content/uploads/2026/04/Configurer-Matomo-pour-la-CNIL-FR.pdf)) | Cookies par défaut, à configurer ; maintenance à notre charge |

Sans outil, Google Search Console (déjà vérifiée pour le site) donne les recherches qui mènent au site, mais pas l'usage
des outils.

## 3. Recommandation de Claude

**Plausible**, formule de départ (9 $ par mois, un site) : hébergement européen, aucune information enregistrée sur
l'appareil, logiciel libre (on pourra l'héberger soi-même chez le même hébergeur que les comptes si le coût
augmente). **Alternative économique** : Pirsch (6 $ par mois). GoatCounter reste possible pour tester sans frais,
après vérification du lieu d'hébergement.

Mise en place (Claude, une fois le compte ouvert) :

1. Script de mesure ajouté par `build.py` seulement s'il est configuré dans `config/site.json` (aucun script tant
   que rien n'est décidé) ; pas sur l'Espace entrepreneur, dont les écrans contiennent des données de gestion.
2. Événements mesurés : utilisation d'un outil (calcul lancé, document créé), clic vers un produit ; jamais de
   montant, de nom ni de donnée saisie.
3. Politique de confidentialité : finalité, outil et pays d'hébergement, durée de conservation, moyen de s'opposer
   (lien dans la page), relue avant publication.
4. Tableau de bord mensuel et premier bilan dans la feuille de route (1.2).

## 4. Tâches d'Ismail

- [ ] **[Ismail]** Choisir l'outil (recommandation : Plausible) et ouvrir le compte ; vérifier le prix sur la page
      officielle et l'engagement de ne pas réutiliser les données (contrat de traitement).
- [ ] **[Ismail]** Me transmettre le nom du site déclaré dans l'outil (aucun mot de passe).
