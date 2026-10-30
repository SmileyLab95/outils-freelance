# 49. Clients en devises : conversion aux taux de référence officiels (4 pays)

Besoin « Clients en devises » de [31](31-vision-plateforme.md) (« Convertisseur aux taux de référence officiels »),
étape 6 de [31](31-vision-plateforme.md) § 5. Spécification écrite le 30/10/2026 (décision D52).

## 1. Besoin

Un indépendant qui facture un client dans une autre monnaie (dollars, livres, francs suisses…) ou qui est payé dans
une autre monnaie doit convertir le montant dans la monnaie de son pays : pour la TVA (France, Royaume-Uni), pour ses
livres et sa déclaration de revenus (États-Unis, Canada). Il veut savoir **quel taux** retenir, **à quelle date**, ce
qu'il doit **écrire sur la facture**, et obtenir le taux officiel du jour sans le chercher lui-même.

Les convertisseurs grand public donnent un taux de marché sans date ni source : ce n'est pas le taux que demandent les
administrations. L'outil donne le taux de la source officielle de chaque pays, avec sa date et son adresse, la
conversion, la TVA dans la monnaie nationale et la mention à reporter sur la facture.

## 2. Règles (sources lues le 30/10/2026, annexe)

**France** (règle `tva_conversion_devises`). Les éléments de la base d'imposition exprimés dans une autre monnaie que
l'euro sont convertis au **dernier taux publié par la Banque centrale européenne connu au jour de l'exigibilité de la
TVA** (CGI, art. 266-1 bis, d'après le BOFiP ; la fiche BOI-TVA-BASE-10-20-40-20 parle du dernier taux « déterminé par
référence au cours publié par la Banque de France, à partir du cours fixé par la Banque centrale européenne » : les
deux fiches désignent le taux de référence de la BCE, repris par la Banque de France). La facture peut être établie
dans toute monnaie si le montant de la taxe est déterminé en euros. Pour éviter les litiges, le BOFiP propose
d'indiquer sur la facture le taux de change applicable quand la TVA est exigible à la délivrance ou au débit, et de
préciser que le montant de la TVA dépendra du taux du jour de l'encaissement quand elle est exigible à l'encaissement
(cas général des prestations de services, règle existante `tva_exigibilite`). Le texte de l'article 266 du CGI n'a pas
pu être lu sur Légifrance (D50) : la règle s'appuie sur le BOFiP, doctrine publiée de l'administration.

**Royaume-Uni** (règle `uk_vat_foreign_currency`). La facture peut être établie dans toute monnaie ; si la TVA
britannique est due, elle indique aussi **en livres** le total hors taxe à chaque taux et le montant de TVA à chaque
taux (pas chaque ligne). Deux méthodes standard : le **taux vendeur du marché britannique au moment de la livraison**
(*UK market selling rate*, les taux publiés dans la presse nationale sont acceptés) ou le **taux de la période publié
par le HMRC** (*period rate of exchange*, en général le mois civil). La méthode de la période peut servir pour toutes
les opérations ou un type d'opérations (noté dans les registres ; en changer demande l'accord du HMRC) ; toute autre
méthode demande l'accord du HMRC ; pas de taux à terme. Facture émise avant la livraison : en livres pour la TVA.

**États-Unis** (règle `us_foreign_currency_translation`, relue mot pour mot). Tout est déclaré en dollars ; quand la
monnaie fonctionnelle est le dollar (cas de l'entreprise individuelle américaine), chaque montant reçu, payé ou dû en
devise est converti **au taux en vigueur à ce moment** (s'il existe plusieurs taux, celui qui reflète le mieux le
revenu) ; l'IRS n'a **pas de taux officiel** et accepte en général tout taux publié utilisé de façon constante
(banques, ambassades, Trésor, Réserve fédérale). L'IRS publie aussi des **moyennes annuelles**, mais aucune des deux
pages lues ne dit quand elles peuvent remplacer le taux du jour pour un revenu d'entreprise : l'outil ne les propose
pas, et la page « international clients » qui le suggérait (lecture d'extraits du 22/10/2026) est corrigée.

**Canada** (règle `ca_currency_conversion_income_tax`). Loi de l'impôt sur le revenu, art. 261(2)b) : un montant
exprimé dans une autre monnaie est converti en dollars canadiens au **taux de change au comptant du jour où il est
survenu** ; art. 261(1) : c'est le **taux publié par la Banque du Canada ce jour-là** (ou, à défaut de taux publié ce
jour, le jour précédent le plus proche), ou un autre taux que le ministre accepte. Les pratiques administratives de
l'ARC (taux moyen annuel, TPS/TVH) sont sur canada.ca, non lisible depuis l'environnement de travail : non couvertes.

**Sources des taux** (règle `fx_reference_sources`, partagée). Toutes lisibles directement par le navigateur du
visiteur (en-tête `Access-Control-Allow-Origin: *` vérifié le 30/10/2026), comme les registres de la recherche de
noms de domaine (D32) :

| Pays | Source | Taux | Sens |
|---|---|---|---|
| France | BCE, portail de données (`data-api.ecb.europa.eu`, série EXR quotidienne) | Taux de référence du jour ouvré, publié vers 16 h, heure d'Europe centrale | unités de devise pour 1 € |
| Royaume-Uni | HMRC, taux mensuels (`trade-tariff.service.gov.uk`, fichier CSV du mois) | Taux de la période (mois civil), publié avant le début du mois | unités de devise pour 1 £ |
| Canada | Banque du Canada, Valet (`bankofcanada.ca/valet`) | Taux moyen quotidien, jours ouvrables | dollars canadiens pour 1 unité de devise |
| États-Unis | Aucune source officielle lisible depuis un navigateur : taux publié saisi (banque, Réserve fédérale) | Taux du jour du paiement | dollars pour 1 unité de devise |

Le fichier quotidien XML de la BCE (`eurofxref-daily.xml`) n'autorise pas la lecture par un autre site : non utilisé.
La BCE précise que ses taux de référence sont publiés à titre d'information : ce ne sont pas les taux de la banque du
visiteur, ce que l'outil dit.

## 3. Outil

**Pages** (identifiant `currency`, liens de langue ; menu « Facturer et encaisser » / « Invoicing » après la page
« client étranger ») : `/fr/conversion-devises/`, `/uk/foreign-currency-invoices/`, `/us/foreign-currency-income/`,
`/ca/foreign-currency-conversion/`, `/ca/fr/conversion-devises/`. Script `tools/currency.js`, moteur
`engines/currency.js` (fonctions pures), textes dans la page (`#currency-data`), saisie enregistrée sur l'appareil
(clé `currency`), sauf le taux récupéré.

**Formulaire** : montant ; devise (18 monnaies courantes, la monnaie du pays exclue : euro, dollar américain, livre,
dollar canadien, franc suisse, dollar australien, yen, yuan, dollar de Hong Kong, roupie indienne, peso mexicain,
dollar néo-zélandais, couronnes norvégienne et suédoise, dollar de Singapour, rand, réal, won) ; sens (devise vers
monnaie du pays, ou l'inverse pour établir un devis) ; date ; méthode et taux :
- *France* : moment de l'exigibilité (encaissement, cas général des prestations de services ; débit sur option ou
  livraison de biens), date correspondante, taux de référence de la BCE (bouton « Obtenir le taux de la BCE ») ou taux
  saisi ; taux de TVA (20 %, 10 %, 5,5 %, 2,1 %, sans TVA).
- *Royaume-Uni* : taux de la période du HMRC pour le mois de la date de livraison (bouton) ou taux vendeur du marché
  saisi ; taux de TVA (20 %, 5 %, 0 %, sans TVA).
- *États-Unis* : taux publié du jour du paiement, saisi (1 unité de devise = … $), avec les liens des sources que cite
  l'IRS (Trésor, Réserve fédérale) ; pas de récupération automatique (série H.10 de la Réserve fédérale à étudier).
- *Canada* : taux de la Banque du Canada du jour (bouton ; à défaut, jour ouvrable précédent le plus proche) ou autre
  taux saisi.

**Récupération** : seulement au clic ; demande sans cookie ni adresse de la page (`credentials: "omit"`,
`referrerPolicy: "no-referrer"`), délai de 10 secondes ; on retient le dernier taux publié au plus tard à la date
choisie (fenêtre de 14 jours pour la BCE et la Banque du Canada : jours fériés et fins de semaine) ; date de
l'observation affichée. En cas d'échec (réseau, réponse vide, date future, taux absent) : message clair, lien vers la
page officielle et saisie manuelle.

**Résultat** : montant converti (arrondi au centime), taux utilisé avec sa date et sa source (lien), TVA et total dans
la monnaie du pays (France, Royaume-Uni), **mention à reporter sur la facture** (copie en un clic) :
- France, exigibilité au débit ou à la livraison : « Taux de change : 1 € = 1,1130 $ US (taux de référence de la BCE
  du 29/10/2026). Montant hors taxe : 898,47 € ; TVA (20 %) : 179,69 €. »
- France, exigibilité à l'encaissement : la conversion au taux du jour est indicative ; mention « Le montant de la TVA
  en euros sera déterminé au taux de référence de la BCE du jour de l'encaissement. »
- Royaume-Uni : « Exchange rate: £1 = $1.3456 (HMRC period rate, October 2026). Net value: £743.16. VAT at 20%:
  £148.63. »
- États-Unis et Canada : ligne pour les livres (« Converted at… ») ; pas de mention obligatoire sur la facture.

**Avertissements** : taux d'information, pas celui de la banque (l'écart et les frais bancaires sont des écarts de
change à suivre avec le comptable) ; France sans TVA (franchise) : aucun texte lu sur la conversion des recettes,
demander à l'expert-comptable ; Royaume-Uni : impôt sur le revenu non couvert ; Canada : TPS/TVH non couverte.

**Confidentialité** : les pages Confidentialité des cinq sections disent que la conversion de devises interroge, au
clic, la BCE, le HMRC ou la Banque du Canada depuis le navigateur.

**Contrôle mensuel** : `scripts/verifier_taux.py` (GitHub Actions, `verifier-taux.yml`, le 1er de chaque mois) lit
chaque source avec l'origine du site, vérifie l'en-tête `Access-Control-Allow-Origin` et la présence d'un taux pour
chaque devise de la liste : une source qui change d'adresse ou de format fait échouer le contrôle.

## 4. Tests

- Moteur : lecture des réponses de la BCE (CSV), du HMRC (CSV, doublons de code), de la Banque du Canada (JSON) ;
  choix du dernier taux au plus tard à la date (fin de semaine, jour férié, aucune donnée, date future) ; adresses
  construites (fenêtre, mois sans zéro) ; conversion dans les deux sens et les deux conventions de taux ; arrondi ; TVA ;
  mentions de chaque pays ; taux saisi (virgule, zéro, négatif).
- Règles : liste des devises (18, sans doublon), adresses des sources et leurs repères ; source de chaque règle.
- Script de contrôle : lecture simulée de chaque source (en-tête absent, devise manquante, format changé).
- Parcours navigateur des cinq pages (réponses simulées) : récupération, demande sans cookie ni page d'origine, erreur
  réseau, taux saisi, inverse, copie de la mention, enregistrement, accessibilité, ordinateur, tablette, mobile.

## 5. Réalisation

À compléter.

## Annexe : sources lues (30/10/2026, outil « Lire une source officielle »)

| Source | Empreinte SHA-256 | Contenu relevé |
|---|---|---|
| BOFiP, BOI-TVA-BASE-10-20-40-20 (version du 12/09/2012), § 190 | 499e11ff…e466 | Dernier taux déterminé par référence au cours publié par la Banque de France, à partir du cours fixé par la BCE, connu au jour de l'exigibilité (CGI, art. 266-1 bis) ; contrats internationaux facturés en devises ; entre entreprises françaises, cours indicatifs de la Banque de France publiés au Journal officiel |
| BOFiP, BOI-TVA-DECLA-30-20-20-10 (18/10/2013), § 380 à 410 | 7e64e6cc…931c | Factures dans toute monnaie si la taxe est déterminée en euros ; dernier taux publié par la BCE au jour de l'exigibilité ; mentions conseillées selon l'exigibilité (débit ou encaissement) ; taux de la valeur en douane pour les acquisitions intracommunautaires |
| BCE, *Euro foreign exchange reference rates* | (page) | Mise à jour vers 16 h (heure d'Europe centrale) chaque jour ouvré, sauf jours de fermeture de TARGET ; concertation vers 14 h 10 ; publiés à titre d'information, usage pour des transactions déconseillé |
| BCE, portail de données, série EXR.D.USD.EUR.SP00.A (CSV) | 7572091f…8b1b | Colonnes TIME_PERIOD et OBS_VALUE ; « US dollar/Euro ECB reference exchange rate » ; `Access-Control-Allow-Origin: *` |
| BCE, `eurofxref-daily.xml` | c7620e39…a9b1 | Pas d'en-tête `Access-Control-Allow-Origin` : non lisible par un autre site |
| GOV.UK, *Foreign currency transactions, VAT and tour operators* | da063a64…8829 | Conversion en livres pour la TVA ; facture en toute monnaie, totaux hors taxe et TVA à chaque taux en livres si la TVA est due ; deux méthodes (taux vendeur du marché, taux de la période du HMRC) ; autre méthode sur accord ; pas de taux à terme ; factures anticipées |
| HMRC, VAT Traders' Records Manual, VATREC5060 (mis à jour le 16/01/2025) | af133934…f60a | Règlement de 1995, art. 14(1) : montants en toute monnaie, seul le total de la TVA en livres |
| HMRC, taux mensuels, CSV d'octobre et de septembre 2026 (`trade-tariff.service.gov.uk/uk/api/exchange_rates/files/monthly_csv_2026-10.csv`) | 364161eb…a26e (octobre) | En-tête « Country/Territories, Currency, Currency Code, Currency Units per £1, Start date, End date » ; USD 1,3456 en octobre, 1,3554 en septembre ; `Access-Control-Allow-Origin: *` ; fichier de novembre publié le 30/10 |
| IRS, *Foreign currency and currency exchange rates* (revue le 22/05/2026) | de3059dd…d616 | Monnaie fonctionnelle ; conversion immédiate au taux en vigueur au moment où le montant est reçu, payé ou dû ; plusieurs taux : celui qui reflète le mieux le revenu ; taux auprès des banques et des ambassades ; sources publiques (Trésor, Réserve fédérale) |
| IRS, *Yearly average currency exchange rates* (revue le 17/09/2026) | 2cab9172…c6e | Pas de taux officiel, tout taux publié utilisé de façon constante ; conversion par division par le taux moyen ; tableau 2021 à 2025 ; ne dit pas quand la moyenne peut remplacer le taux du jour |
| IRS, publication 54 | 3af3e125…288b | Ni « evenly », ni « average exchange rate » : rien sur l'usage des moyennes annuelles |
| Loi de l'impôt sur le revenu (Canada), art. 261 (modifiée le 15/10/2026, justice.gc.ca) | e7948664…8a88 | Art. 261(1) « relevant spot rate » (taux de change au comptant) : taux publié par la Banque du Canada le jour même ou le jour précédent le plus proche, ou autre taux acceptable pour le ministre ; art. 261(2)b) : conversion au taux du jour où le montant est survenu |
| Loi sur la taxe d'accise (Canada), art. 159 | 9c4682eb…3b26 | Aucune règle de conversion des devises dans cet article : TPS/TVH non couverte |
| Banque du Canada, Valet (FXUSDCAD, FXEURCAD, FXGBPCAD, JSON) | 9fa55713…503e | « Daily average exchange rate », « Canadian dollars per US dollar », jours ouvrables ; `Access-Control-Allow-Origin: *` |
