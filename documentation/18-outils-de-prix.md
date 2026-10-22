# 18. Outils de prix : convertisseur de tarifs et prix au forfait

Besoins P2 de [02](02-besoins-clients.md) (§ 2, « Fixer ses prix ») : « Convertir horaire, journalier, mensuel,
annuel » et « Chiffrer un projet au forfait », dans les quatre pays. Le calculateur de taux (identifiant `rate`)
répond déjà à « Quel tarif facturer ? » à partir du revenu voulu ; ces outils partent d'un tarif connu ou proposé.

## 1. Convertisseur de tarifs (spécification du 22/10/2026)

**Question** : « J'ai un tarif, ou un client m'en propose un : combien cela fait-il par heure, par jour, par semaine,
par mois et par an ? »

- **Pages** (identifiant `rate-converter`, groupe « Tarifs » / *Pricing* du menu) : `/fr/convertisseur-tjm/`,
  `/us/rate-converter/`, `/uk/rate-converter/`, `/ca/rate-converter/` et `/ca/fr/convertisseur-de-tarifs/`.
- **Saisie** : un montant et son unité (heure, jour, semaine de cinq jours facturés, mois, an) ; heures facturées
  par jour ; jours facturés par an. Montants hors taxes (hors TVA, hors TPS/TVH).
- **Hypothèses par défaut** : celles du calculateur de taux de la même section, pour que les deux outils donnent les
  mêmes ordres de grandeur. Jours facturés = jours ouvrés moins congés et jours fériés, moins le temps non facturé,
  selon la formule de chaque calculateur : France 7 h et 148 jours ((365 − 104 − 5 × 5 − 8) × 65 %) ; Royaume-Uni
  7,5 h et 182 jours ((52 × 5 − 5 × 5 − 8) × 80 %) ; États-Unis et Canada 8 h et 161 jours (1 288 heures
  facturables : (52 − 4 − 10 ÷ 5) semaines × 40 h × 70 %, divisées par 8 h) ; Canada en français 8 h et 162 jours
  (8 jours fériés, comme le calculateur de taux horaire québécois : 1 299 heures, arrondies en jours). Un test vérifie ces valeurs à partir
  des champs des calculateurs de taux. Les deux hypothèses sont modifiables et la page renvoie au calculateur de
  taux pour établir les siennes.
- **Calcul** (moteur `engines/rate-convert.js`, fonction pure testée) : jour = heure × heures par jour ; semaine =
  jour × 5 ; an = jour × jours facturés par an ; mois = an ÷ 12 (moyenne) ; et l'inverse depuis l'unité saisie.
  Heures facturées par an = jours × heures. Refus si les heures par jour ou les jours par an sont nuls ou hors
  limites (plus de 24 h, plus de 366 jours).
- **Résultat** : chiffre d'affaires annuel en tête, tableau des cinq unités (heure et jour avec centimes), heures
  facturées par an ; saisie illisible : aucun résultat, champ signalé.
- **Seuils signalés selon le chiffre d'affaires annuel** (règles existantes, une seule source) : France, seuil de
  franchise de TVA des services (`tva_franchise_seuils` : 37 500 €, TVA due au 1er janvier suivant ; dès le
  dépassement de 41 250 €) et plafond du régime micro pour les services (`micro_plafond_ca_services`, 83 600 €) ;
  Royaume-Uni, *Making Tax Digital for Income Tax* au-delà de 50 000 £ de revenus avant dépenses
  (`mtd_itsa_threshold_2026`) et immatriculation à la TVA au-delà de 90 000 £ sur douze mois glissants
  (`vat_registration_threshold`) ; Canada, petit fournisseur au-delà de 30 000 $ (`small_supplier_threshold`).
  États-Unis : aucun seuil de chiffre d'affaires à signaler ; renvoi au calculateur « combien mettre de côté ».
- **Critères** : tests unitaires (conversions dans les deux sens, aller-retour, refus, valeurs par défaut cohérentes
  avec les calculateurs de taux, seuils des textes repris des règles) ; parcours navigateur des cinq pages ;
  accessibilité ; captures relues ; revue critique.
- **Fait le 22/10/2026** : moteur, script commun et cinq pages ; le test des hypothèses par défaut a révélé que la FAQ
  du calculateur québécois parlait d'« une dizaine » de jours fériés pour une valeur par défaut de 8 (alignée), et
  la relecture a retiré des cinq FAQ des calculateurs de taux des statistiques non sourcées (« la plupart des
  freelances facturent entre… ») au profit des hypothèses par défaut, vérifiées par test. Au Québec, le convertisseur
  compte 8 jours fériés comme le calculateur de taux horaire (162 jours facturés).

## 2. Prix au forfait (spécification du 22/10/2026)

**Question** : « Quel prix proposer pour ce projet, et que vaut le prix que mon client propose ? »

- **Pages** (identifiant `project-price`, même groupe du menu que le calculateur de taux) : `/fr/calcul-prix-forfait/`,
  `/us/project-price-calculator/`, `/uk/project-price-calculator/`, `/ca/project-price-calculator/` et
  `/ca/fr/calcul-prix-forfaitaire/`.
- **Saisie** : unité de travail (jours ou heures) et tarif correspondant ; tâches (intitulé et durée estimée, dix au
  plus, ajout et suppression comme les lignes du générateur de facture) ; marge pour imprévus (en %, ajoutée au
  temps) ; frais inclus dans le prix (déplacements, achats, licences) ; acompte demandé (en %, facultatif) ; taxe
  de vente ; prix proposé par le client (facultatif).
- **Valeurs par défaut** (exemples modifiables, présentés comme tels) : unité et tarif du convertisseur de la même
  section (jours à 450 € en France, 400 £ au Royaume-Uni ; heures à 100 $ aux États-Unis et au Canada) ; trois
  tâches d'exemple ; 10 % d'imprévus ; pas de frais, pas d'acompte ; pas de taxe (franchise en France,
  non-inscription au Royaume-Uni et au Canada).
- **Taxe de vente** (taux lus dans les règles, aucun taux écrit dans la page) : France, franchise ou TVA à 20 %,
  10 % ou 5,5 % (`tva_taux_metropole`) ; Royaume-Uni, pas de TVA, 20 % ou 5 % (`vat_standard_rate`,
  `vat_reduced_rate`) ; Canada, non inscrit ou province du client : TPS/TVH, et TVQ au Québec (`provinces`),
  la TVP n'étant pas comptée (`pst_on_professional_services` : la plupart des services professionnels en sont
  exemptés, liste fermée par province) ; États-Unis, pas de champ : la taxe de vente sur les services dépend de
  l'État, la page le dit.
- **Calcul** (moteur `engines/project-price.js`, fonction pure testée ; taxes par `engines/salestax.js`) : temps
  estimé = somme des tâches ; temps couvert = temps estimé × (1 + imprévus) ; honoraires = temps couvert × tarif ;
  prix hors taxes = honoraires + frais, au centime ; taxes sur le prix hors taxes ; acompte = total taxes comprises
  × pourcentage, au centime ; solde = total − acompte. Prix proposé par le client (hors taxes) : tarif réel =
  (prix − frais) ÷ temps estimé, comparé au tarif saisi.
- **Résultat** : prix hors taxes en tête, avec le total taxes comprises et le temps couvert ; tableau (temps
  estimé, imprévus, honoraires, frais, hors taxes, taxes, total, acompte, solde) ; tarif réel du prix proposé (s'il
  ne couvre pas les frais, un message le dit au lieu d'afficher un tarif nul ou négatif) ; lien vers le générateur
  de devis. Saisie illisible : aucun résultat, champ signalé.
- **Critères** : tests unitaires (calculs à la main, arrondis, taxes à plusieurs composantes, acompte, prix proposé,
  refus) ; textes repris des règles ; parcours navigateur des cinq pages (ajout et suppression de tâches,
  sauvegarde) ; accessibilité ; captures relues ; revue critique.

- **Fait le 22/10/2026** : moteur, script commun et cinq pages. La relecture a ajouté le cas d'un prix proposé
  inférieur aux frais (message dédié, vérifié dans le navigateur en réintroduisant l'erreur), repris le mot
  *quote* du générateur britannique, et rendu neutres les textes du Canada français et des FAQ anglaises (le temps
  peut être compté en jours ou en heures).
