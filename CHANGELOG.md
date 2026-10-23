# Journal des modifications

## 2026-10-23 — Compte bancaire d'entreprise : Royaume-Uni, États-Unis, Canada

- Vérificateur « *Business bank account* » au Royaume-Uni, aux États-Unis et au Canada, et « Compte bancaire
  d'entreprise » au Canada en français : selon la forme de l'activité, si un compte séparé est obligatoire, nécessaire
  ou conseillé, pourquoi, et quoi faire (vérifier les conditions de sa banque, EIN aux États-Unis, durée de
  conservation des registres). Sept règles nouvelles, une source officielle chacune (GOV.UK, Business.gov.uk, IRS,
  SBA, ARC).
- Tests : `bank-intl.test.mjs` ; 6 erreurs réintroduites, toutes détectées ; suite complète (278 tests unitaires,
  27 tests serveur, 2 599 vérifications navigateur du site public).

## 2026-10-23 — Recouvrement en justice : États-Unis

- `/us/small-claims-court/` : plafond des *small claims* dans les 50 États et le district de Columbia, selon que l'on
  agit en son nom (*sole proprietor* compris) ou comme LLC ou société (Californie, Washington, New York) ; plafonds
  qui dépendent du tribunal ou du comté (New York, Caroline du Nord, Pennsylvanie) ; hausses du 1er janvier 2027
  (Géorgie, Wisconsin) appliquées à leur date ; particularités de chaque État (avocats, nombre de demandes, exclusions)
  et lien vers les informations de l'État. Les pages des relances et des pénalités de retard renvoient vers l'outil.
- Règle `us_small_claims_limits` (us.json), une source par État ; recherches détaillées dans la spécification
  [24](documentation/24-recouvrement-uk-us-ca.md), § 3.
- Feuille de style : plus de trait sous la dernière ligne visible d'une liste de résultats.
- Tests : `court-us.test.mjs` ; 12 erreurs réintroduites, toutes détectées ; suite complète (271 tests unitaires,
  27 tests serveur, 2 525 vérifications navigateur du site public).

## 2026-10-23 — Recouvrement en justice : Royaume-Uni et Canada

- Spécification [24](documentation/24-recouvrement-uk-us-ca.md) (Royaume-Uni, Canada, puis États-Unis) et décision
  D26 : n'afficher que ce qu'une source officielle confirme.
- Royaume-Uni, `/uk/small-claims-court/` : ce que l'on peut réclamer (facture, intérêts du *Late Payment Act* et
  indemnité, ou 8 % pour un particulier), frais de dépôt et d'audience 2026, circuit (*small claims* jusqu'à
  10 000 £), lettre avant procès (protocole des créances : 30 jours ; société : 14 jours dans un cas simple), dépôt en
  ligne, médiation obligatoire, exécution, prescription de 6 ans ; Écosse et Irlande du Nord renvoyées vers leurs
  procédures. La page des relances renvoie vers l'outil.
- Canada, `/ca/small-claims-court/` et `/ca/fr/petites-creances/` : tribunal, plafond et prescription des 13
  provinces et territoires, Tribunal de résolution civile de la Colombie-Britannique, particularités du Québec
  (sans avocat, 10 employés au plus pour une personne morale, mise en demeure, médiation) ; plafond du Nunavut non
  confirmé, donc non affiché. Les pages de relances renvoient vers l'outil.
- Règles : douze nouvelles dans uk.json, deux dans ca.json (une source officielle par province), cinq questions
  ouvertes.
- Tests : `court-uk.test.mjs`, `court-ca.test.mjs` ; 17 erreurs réintroduites, toutes détectées ; parcours
  navigateur des trois pages ; suite complète (265 tests unitaires, 27 tests serveur, 2 502 vérifications
  navigateur du site public).

## 2026-10-22 — Site publié : scripts des comptes retirés

- Les scripts utilisés seulement par les brouillons (page du compte, synchronisation, chiffrement, moteur de fusion)
  ne sont plus copiés dans le site publié : aucune page publique ne les chargeait, mais ils restaient accessibles par
  leur adresse (défaut trouvé en relisant la publication précédente).
- Tests : suite complète (249 tests unitaires, 27 tests serveur, 37 vérifications du parcours des comptes,
  2 434 vérifications navigateur du site public).

## 2026-10-22 — Comptes en ligne : écrans de connexion et synchronisation de l'Espace (étape C4), en brouillon

- Page « Mon compte » (`/fr/compte/`) : connexion sans mot de passe (lien par email ou clé d'accès), code de
  récupération sur le premier appareil, ouverture sur un nouvel appareil, synchronisation et conflits, appareils
  connectés, clés d'accès, export, déconnexion, suppression du compte.
- Chiffrement sur l'appareil (`engines/compte-crypto.js`) et synchronisation (`tools/compte-sync.js`) : l'Espace est
  fusionné sur l'appareil et envoyé chiffré ; un coffre modifié ou une version plus ancienne renvoyés par le serveur
  sont refusés.
- Espace : synchronisation à l'ouverture et après chaque modification, ligne d'état (version en brouillon) ; le
  stockage accepte les données synchronisées et prévient l'Espace ouvert. Rien ne change pour l'Espace local.
- Générateur : pages en brouillon (`OF_DRAFTS=1`, dossier `brouillons/`, jamais publié) ; décision D25.
- Tests : `compte-crypto.test.mjs`, parcours `tests/e2e/comptes.mjs` (37 vérifications, deux appareils, clé d'accès
  virtuelle, serveur compromis) ; suite complète (249 tests unitaires, 27 tests serveur,
  2 434 vérifications navigateur du site public).
- **Rien n'est en ligne** : hébergeur, domaine et service d'envoi d'emails restent à décider.

## 2026-10-22 — Comptes en ligne : serveur (étape C3), sans mise en ligne

- Spécification [23](documentation/23-serveur-et-connexion.md) et décision D15 : synchronisation chiffrée de bout en
  bout (coffre chiffré sur l'appareil, clé du compte enveloppée par un code de récupération), connexion par lien
  envoyé par email (15 minutes, usage unique) et par clé d'accès, sans mot de passe ; sessions de 30 jours.
- Serveur `server/` (Node.js sans dépendance) : API `/api/v1`, vérification WebAuthn (ES256, RS256), stockage en
  mémoire et SQLite, limites de requêtes, protection contre les requêtes forgées, export et suppression du compte.
- Tests `tests/server/` (27) : authentificateur logiciel, contrat du stockage, API par HTTP (aucun accès entre
  comptes) ; 17 failles réintroduites, toutes détectées ; revue de sécurité (deux corrections).
- **Rien n'est en ligne** : le choix de l'hébergeur et du domaine a été reporté par Ismail. Le site public est
  inchangé.

## 2026-10-22 — Formulaire W-8BEN pour un client américain (France, Royaume-Uni, Canada)

- Pages « client étranger » de la France, du Royaume-Uni et du Canada (anglais et français) : section et question
  sur le W-8BEN (à qui le remettre, pas de retenue américaine pour un travail fait hors des États-Unis, retenue de
  30 % sans formulaire, W-8BEN-E pour une société, durée de validité, formulaire 8233 pour un travail fait aux
  États-Unis) ; trois règles communes sourcées (instructions du W-8BEN, publication 515 de l'IRS).
- Tests : `w8ben.test.mjs` ; deux tests existants lisent désormais les règles communes ; suite complète
  (245 tests unitaires, 2 434 vérifications navigateur).

## 2026-10-22 — Client étranger aux États-Unis ; règles communes à plusieurs pays

- Nouvelle page `/us/invoicing-international-clients/` (identifiant `international`, menu *Invoicing*) : selon le
  pays du client (UE, Royaume-Uni, Canada, ailleurs), son type et le service, taxe étrangère à facturer ou non
  (autoliquidation des entreprises, TVA dès la première vente de services numériques aux particuliers de l'UE et du
  Royaume-Uni, seuil canadien de 30 000 $ CA sur 12 mois pour les services vendus aux particuliers) ; mentions et
  démarches ; aux États-Unis, revenu en dollars, retenue étrangère (formulaire 6166, crédit d'impôt limité au revenu
  de source étrangère), FBAR et taxe de vente des États. « Facturer un client étranger » existe dans les quatre pays.
- Règles communes (`data/rules/shared.json`, décision D24) ajoutées par le générateur aux règles de chaque pays :
  huit règles (UE, Royaume-Uni, Canada), dont trois déplacées de uk.json ; quatre règles américaines (IRS, FinCEN).
- Nouveau test du format de toutes les règles (valeur, unité, libellé, source, confiance) : 13 règles sans unité
  complétées.
- Tests : moteur sur 48 situations, textes et montants de la page, parcours navigateur ; suite complète (242 tests unitaires, 2 434
  vérifications navigateur).

## 2026-10-22 — Jauges de seuils au Royaume-Uni, au Canada et aux États-Unis

- Calculateurs d'impôt : nouvelle carte « *Thresholds to watch* » / « Seuils à surveiller » avec jauges et message
  ([21](documentation/21-jauges-de-seuils.md)).
  - Royaume-Uni : seuil d'immatriculation à la TVA et *Making Tax Digital for Income Tax*, sur un nouveau champ
    facultatif de chiffre d'affaires (le seuil porte sur les ventes, pas sur le bénéfice) ; *trading allowance*.
  - Canada (anglais et français) : seuil du petit fournisseur (TPS/TVH, et TVQ au Québec) sur un champ facultatif de
    ventes ; seuil des acomptes provisionnels sur l'impôt calculé.
  - États-Unis : acomptes trimestriels, *Social Security wage base*, *Additional Medicare Tax*, limites de la
    déduction QBI (message propre aux activités de service).
- Fonction commune `OF.gauge`, reprise par le simulateur auto-entrepreneur : le pourcentage n'affiche plus « 100 % »
  juste sous ou juste au-dessus d'un seuil, et les grands pourcentages ont leur séparateur de milliers.
- Moteurs : `instalments()` (Canada) donne le montant comparé au seuil ; `estimate()` (États-Unis) donne le revenu
  imposable avant QBI.
- Tests : nouveau fichier `jauges.test.mjs` (aucun montant écrit dans les scripts ni dans les messages, règles
  citées dans les sources) ; parcours navigateur des cinq calculateurs ; suite complète (236 tests unitaires,
  2 407 vérifications navigateur).

## 2026-10-22 — Checklist de création au Canada (anglais et français) ; situation des listes corrigée

- Nouvelles pages `/ca/how-to-start-a-business/` et `/ca/fr/demarrer-entreprise-individuelle/` (identifiant `start`) :
  forme de l'entreprise, enregistrement du nom, permis (PerLE / BizPaL), TPS/TVH et TVQ au-delà de 30 000 $ avec le
  numéro d'entreprise, assurance-emploi facultative, factures, registres, acomptes provisionnels, déclaration ;
  Québec coché par défaut en français. La checklist de création existe maintenant dans les quatre pays (cinq pages).
- Cinq règles sourcées ajoutées (ARC, Canada.ca, ISDE) : entreprise individuelle, enregistrement provincial, numéro
  d'entreprise, PerLE / BizPaL, durée de conservation des registres.
- **Défaut corrigé** dans `tools/checklist.js` : toutes les listes d'une section gardaient leur situation sous la
  même clé, que chaque page remplaçait entièrement. Répondre à la checklist de création effaçait la situation
  enregistrée dans la liste des mentions de facture (au Royaume-Uni depuis la publication de la checklist ce jour).
  Les listes à cases mémorisées ont désormais leur propre clé ; contrôle ajouté au parcours navigateur (vérifié en
  réintroduisant le défaut).
- Tests : mêmes étapes, règles et conditions dans les deux langues ; montants, dates et délais repris des règles ;
  parcours navigateur ; suite complète (231 tests unitaires, 2 387 vérifications navigateur).

## 2026-10-22 — Checklist *How to start freelancing* (États-Unis)

- Nouvelle page `/us/how-to-start-freelancing/` (identifiant `start`, en tête du menu *Taxes*) : forme de
  l'entreprise, nom commercial (DBA), licences et permis, inscriptions fiscales de l'État, EIN facultatif, W-9,
  contrat écrit (New York, Californie, Illinois), registres, compte bancaire conseillé, acomptes trimestriels,
  déclaration 1040 ; situation et cases gardées sur l'appareil (7 à 9 étapes).
- Sept règles sourcées ajoutées (SBA, IRS) : *sole proprietorship* par défaut, DBA, licences, EIN, inscription
  fiscale de l'État, durée de conservation des registres, compte bancaire.
- Tests : la checklist rejoint les contrôles communs ; montants et dates des FAQ vérifiés contre les règles dans les
  trois pays ; parcours navigateur ; suite complète (224 tests unitaires, 2 347 vérifications navigateur).

## 2026-10-22 — Checklist *How to become a sole trader* (Royaume-Uni)

- Nouvelle page `/uk/how-to-become-a-sole-trader/` (identifiant `start`, en tête du menu *Tax*) : nom commercial,
  licences, travail à domicile, numéro de National Insurance, inscription à la Self Assessment, redevance de l'ICO,
  factures, registres, *Making Tax Digital*, seuil de TVA, déclaration et paiements ; situation (nom commercial,
  domicile) et cases gardées sur l'appareil (10 à 12 étapes).
- Six règles sourcées ajoutées (GOV.UK, ICO) : inscription comme *sole trader*, règles du nom commercial, licences,
  activité à domicile, redevance de l'ICO (montants non publiés, pages discordantes), durée de conservation des
  registres.
- Tests : structure commune aux checklists de France et du Royaume-Uni ; nouveau contrôle : tout montant écrit dans
  une étape est celui d'une règle (il a révélé qu'une erreur de montant pouvait passer quand le montant figure deux
  fois) ; parcours navigateur ; suite complète (220 tests unitaires, 2 327 vérifications navigateur).

## 2026-10-22 — Checklist « Créer sa micro-entreprise » (France)

- Nouvelle page `/fr/creer-sa-micro-entreprise/` (identifiant `start`, en tête du menu « Statut et revenus ») : les
  démarches de création, dans l'ordre (avant de se déclarer, se déclarer, premières factures, première année), avec
  pour chacune une explication, un lien vers l'outil du site qui aide à la faire et ses sources officielles. La
  situation (vente de marchandises, ACRE) montre les étapes concernées ; les cases cochées et la situation restent
  sur l'appareil (17 à 19 démarches selon la situation, compte bancaire dédié « conseillé », hors du compte).
- Sept règles sourcées ajoutées : activités exclues de la micro-entreprise (ministère de l'Économie), domiciliation
  au domicile (C. com., art. L123-10), guichet unique des formalités (ministère, Urssaf), déclaration du chiffre
  d'affaires en ligne même nul (CSS, art. L613-8), mention « EI » (C. com., art. R526-27), déclaration initiale de
  CFE 1447-C-SD (impots.gouv.fr), report sur la 2042-C-PRO (impots.gouv.fr). Montant de la pénalité pour une
  déclaration manquante non publié : les pages de l'Urssaf ne concordent pas (50 € ou 58 €).
- `tools/checklist.js` : cases mémorisées (`data-persist`), variantes d'une même étape cochées ensemble, intertitres
  (`li.cl-group`). Spécification `documentation/20-checklist-creation.md`, décision D22.
- Tests : unitaires (chaque étape sourcée et citée, chaque chiffre, date ou formulaire comparé à sa règle, nombre
  d'étapes par situation ; 7 erreurs réintroduites et détectées) ; parcours navigateur (situation, cases retrouvées
  après rechargement, progression, accessibilité) ; suite complète (215 tests unitaires, 2 306 vérifications
  navigateur).

## 2026-10-22 — Comparateur de statuts : décote et déduction de 10 % officielles

- Nouveau moteur commun `engines/ir-fr.js` (impôt d'une personne seule : barème des revenus de 2025, décote,
  déduction forfaitaire de 10 % avec son minimum et son plafond), utilisé par le comparateur de statuts et par
  « Salarié ou freelance ? » : les deux outils calculent désormais le même impôt.
- Comparateur de statuts : la décote est appliquée (elle réduit ou annule l'impôt des revenus modestes) et la
  déduction de 10 % sur la rémunération de SASU ou d'EURL suit le minimum et le plafond officiels. Exemple par
  défaut : EURL à l'IS, rémunération de 50 %, 28 070 € par an au lieu de 27 520 € (impôt de 550 € annulé par la
  décote) ; micro-entreprise et entreprise au réel inchangées à 60 000 €. Texte de méthode mis à jour.
- Tests : moteur commun (décote, décote limitée à l'impôt, seuil, minimum, plafond), comparateur recalculé à la main,
  5 erreurs réintroduites et détectées ; suite complète (211 tests unitaires, 2 283 vérifications navigateur).

## 2026-10-22 — « Salary vs freelance » : États-Unis, Royaume-Uni et Canada

- Nouvelles pages `/us/salary-vs-freelance/`, `/uk/salary-vs-freelance/`, `/ca/salary-vs-freelance/` et
  `/ca/fr/salarie-ou-travailleur-autonome/` (menu « Taxes » / « Impôts et taxes ») : revenu disponible d'un salarié
  et revenus dont un indépendant a besoin pour garder autant, avec le tarif horaire ou journalier équivalent ;
  avantages de l'employeur, frais et tarif facultatifs.
- États-Unis : FICA, *Additional Medicare Tax* et impôt fédéral du salarié ; *self-employment tax*, déduction QBI et
  impôt fédéral du *sole proprietor* (impôt de l'État non compté, dit dans la page).
- Royaume-Uni : *Class 1* et *Income Tax* du salarié (Écosse comprise), *Class 4* du *sole trader* ; minimum légal
  de l'employeur à la retraite d'entreprise (*automatic enrolment* 2026/27, règle sourcée) ; seuils *Making Tax
  Digital* et TVA signalés.
- Canada : RPC ou RRQ, RQAP et assurance-emploi du salarié (nouvelle règle sourcée : 1,63 %, 1,30 % au Québec, avec
  ses crédits d'impôt), impôts fédéral et provincial des 13 provinces et territoires ; seuil du petit fournisseur.
- Tableau de résultats : cases sans objet annoncées « sans objet » aux lecteurs d'écran.
- Moteurs : `taxUK.class1Employee` extraite ; `taxCA.personal` accepte un salaire assurable (assurance-emploi) ;
  `employeeFreelance` charge à la demande les moteurs du pays. Document d'architecture : liste des moteurs à jour.
- Tests : 208 unitaires (valeurs recalculées à la main, 22 erreurs réintroduites dans les moteurs et détectées,
  exemples des FAQ recalculés dans les cinq pages) ; parcours navigateur des quatre pages ; suite complète
  (2 283 vérifications navigateur).

## 2026-10-22 — « Salarié ou freelance ? » (France)

- Nouvelle page `/fr/salarie-ou-freelance/` (menu « Statut et revenus ») : à partir du salaire brut, revenu disponible
  du salarié du secteur privé (cotisations salariales 2026, impôt d'une personne seule, décote comprise) et chiffre
  d'affaires dont un micro-entrepreneur a besoin pour garder le même revenu, avec le TJM équivalent sur ses jours
  facturés ; avantages de l'employeur et frais professionnels facultatifs ; comparaison directe avec un TJM saisi ;
  plafond de la micro-entreprise et seuil de franchise de TVA signalés.
- Nouvelles règles sourcées : cotisations salariales du secteur privé (Urssaf, CGI art. 154 quinquies), retraite
  complémentaire Agirc-Arrco 2026, déduction forfaitaire de 10 % (revenus 2025) ; décote confirmée par le BOFiP.
- Moteur `engines/employee-freelance.js` (recherche du chiffre d'affaires au centime) et script commun
  `tools/employee-freelance.js`, prêts pour les trois autres pays ; spécification
  `documentation/19-freelance-ou-salarie.md`.
- Tests : unitaires calculés à la main (sous le PASS, entre 1 et 4 PASS, au-delà de 4 et de 8 PASS, déduction minimale
  et plafonnée, décote, chiffre d'affaires au centime, versement libératoire, plafond micro) et contrôlés par mutation ;
  exemple de la FAQ recalculé ; parcours navigateur ; suite complète (203 tests unitaires, 2 202 vérifications
  navigateur).

## 2026-10-22 — Calculateur de prix au forfait (France, États-Unis, Royaume-Uni, Canada)

- Nouvelles pages `/fr/calcul-prix-forfait/`, `/us/project-price-calculator/`, `/uk/project-price-calculator/`,
  `/ca/project-price-calculator/` et `/ca/fr/calcul-prix-forfaitaire/` (identifiant `project-price`, menu « Tarifs »
  / *Pricing*) : tâches et durées estimées (dix au plus, ajout et suppression), marge pour imprévus, frais inclus,
  taxe de vente, acompte et solde ; ce que vaut, par jour ou par heure de travail estimé, le prix proposé par le
  client (avec un message dédié quand il ne couvre pas les frais). Unité et tarif par défaut repris du convertisseur
  de la même section (vérifié par test).
- Taxes lues dans les règles, aucun taux écrit dans les pages : TVA à 20 %, 10 % ou 5,5 % ou franchise (France) ;
  TVA à 20 % ou 5 % (Royaume-Uni) ; TPS/TVH, et TVQ au Québec, selon la province du client (Canada), la TVP n'étant
  pas comptée ; aux États-Unis, pas de champ : la page rappelle que la taxe dépend de l'État et du type de service.
- Moteur `engines/project-price.js` (taxes par `engines/salestax.js`) et script commun `tools/project-price.js` ;
  spécification `documentation/18-outils-de-prix.md` § 2.
- Tests : unitaires (calculs à la main, arrondis, taxes à deux composantes, acompte, prix proposé, refus ; exemples
  des FAQ recalculés depuis les valeurs par défaut ; taux cités en source) ; parcours navigateur des cinq pages
  (ajout et suppression de tâches, saisie illisible, rechargement, accessibilité) ; suite complète (195 tests
  unitaires, 2 177 vérifications navigateur).

## 2026-10-22 — Convertisseur de tarifs (France, États-Unis, Royaume-Uni, Canada)

- Nouvelles pages `/fr/convertisseur-tjm/`, `/us/rate-converter/`, `/uk/rate-converter/`, `/ca/rate-converter/` et
  `/ca/fr/convertisseur-de-tarifs/` (même identifiant `rate-converter`, menu « Tarifs » / *Pricing*) : un tarif à
  l'heure, au jour, à la semaine, au mois ou à l'an, converti dans les autres unités selon les heures et les jours
  facturés ; hypothèses par défaut reprises du calculateur de taux de chaque section (vérifié par test).
- Seuils signalés selon le chiffre d'affaires annuel, montants lus dans les règles : franchise de TVA des services
  et plafond du régime micro (France), *Making Tax Digital for Income Tax* et immatriculation à la TVA
  (Royaume-Uni), petit fournisseur TPS/TVH (Canada).
- Moteur `engines/rate-convert.js` et script commun `tools/rate-converter.js` (textes et seuils fournis par chaque
  page) ; spécification `documentation/18-outils-de-prix.md`.
- Calculateurs de taux : FAQ sur le temps facturable réécrites à partir de leurs hypothèses par défaut ; les
  statistiques non sourcées (« la plupart des freelances facturent entre… ») sont retirées ; au Québec, la FAQ parle
  désormais des 8 jours fériés de la valeur par défaut.
- Tests : unitaires (conversions, aller-retour dans les 25 combinaisons d'unités, refus, cohérence des pages avec les
  calculateurs de taux et les règles) ; parcours navigateur des cinq pages ; suite complète (189 tests unitaires,
  2 082 vérifications navigateur).

## 2026-10-22 — Canada : comparateur « Sole proprietor vs corporation » / « Entreprise individuelle ou société par actions »

- Nouvelles pages `/ca/sole-proprietor-vs-corporation/` et `/ca/fr/entreprise-individuelle-ou-societe/` (menu
  « Taxes » / « Impôts et taxes », même identifiant que les comparateurs des trois autres pays) : impôts et
  cotisations 2026 en entreprise individuelle et en société par actions (SPCC) dont le travailleur autonome est
  l'unique actionnaire. Saisie : bénéfice, province, salaire (facultatif), montant laissé dans la société, frais
  propres à la société ; au Québec, case des 5 500 heures rémunérées. Résultat : ce que vous recevez et ce qui reste
  dans la société, impôt reporté sur ce montant, écart si tout est versé, cotisations RPC ou RRQ non versées
  (rente et droits REER rappelés).
- Moteur `engines/structure-ca.js` : impôt de la société (taux de l'Ontario au prorata des jours pour l'année
  civile 2026, taux général du Québec sans 5 500 heures), charges de l'employeur (RPC ou RRQ, RQAP et FSS au Québec,
  pas d'AE), dividendes non déterminés et impôt personnel (fonction `personal()` du moteur commun : crédits pour
  dividendes fédéral et provinciaux, surtaxe de l'Ontario avant le crédit, montant canadien pour emploi et celui du
  Yukon, impôt sur le salaire des T.N.-O.). Saskatchewan et Nunavut non calculés tant que leur taux officiel n'est
  pas lu (D19).
- Générateur : une règle peut citer plusieurs sources (`more_sources`, une par province pour les crédits pour
  dividendes) et avoir sa propre date de vérification (`verified_on`) ; la page affiche la plus récente.
- Style : tiret « sans objet » en gris dans les tableaux de comparaison (il ne se lit plus comme un signe moins) ;
  aide sous une case à cocher regroupée.
- Moteur commun : montant personnel de base réduit du Manitoba (de 200 000 à 400 000 $ de revenu net) et du Yukon
  (comme le montant fédéral) ; corrige aussi le calculateur d'impôt et « Combien mettre de côté » pour les revenus
  élevés dans ces deux provinces.
- Relecture indépendante : aucun écart de calcul ; résumé du résultat décomposé (cotisations non versées, impôts et
  frais), pour qu'un gain venant surtout du RPC non versé ne passe pas pour une économie d'impôt ; perte de
  l'assurance parentale (RQAP) dite au Québec ; cas limites (bénéfice vide, impôt reporté nul, cotisations plus
  élevées en société) ; sources et textes précisés.
- Tests : unitaires (cas calculés à la main et recalculés indépendamment : Ontario en dividendes, Ontario avec
  salaire et montant laissé, salaire au-delà du MGAP, Québec avec et sans 5 500 heures, Québec avec salaire, Yukon,
  T.N.-O., Î.-P.-É., refus ; invariants sur 11 provinces : conservation de l'argent, écart = tout versé + impôt
  reporté, intégration à 5 % près ; Manitoba et Yukon à revenu élevé) ; chaque élément du calcul contrôlé en
  réintroduisant l'erreur (8 mutations) ; textes des deux pages repris des règles ; parcours navigateur des deux
  pages ; suite complète (181 tests unitaires, 1 991 vérifications navigateur).

## 2026-10-22 — Québec : impôt du travailleur autonome corrigé ; règles du comparateur canadien

- Calcul québécois corrigé (moteur `engines/tax-ca.js`, utilisé par le calculateur d'impôt, « Combien mettre de
  côté » et le calculateur REER, en anglais et en français) : plus de crédit du Québec pour la part de base du RRQ
  (le Québec n'en accorde pas : impôt sous-estimé d'au plus 528 $) ; déduction pour travailleur de 6 %, au plus
  1 450 $ en 2026 (impôt surestimé jusqu'ici) ; RQAP : part « employeur » déduite et crédit fédéral sur le reste.
  Exemple : 60 000 $ au Québec, 16 721 $ d'impôt et de cotisations au lieu de 16 663 $. Détail du calcul de la page
  enrichi (RQAP déductible, déduction pour travailleur, revenu imposable au Québec) ; textes et exemples mis à jour.
- Moteur : nouvelle fonction `personal()` (revenu de travail autonome, salaire et dividendes non déterminés), base
  du futur comparateur entreprise individuelle / société par actions ; résultats inchangés hors Québec.
- Règles nouvelles (`ca.json`), lues le 22/10/2026 : taux d'impôt des sociétés 2026 (fédéral et 13 provinces,
  changements de l'Ontario et de T.-N.-L.), règle des 5 500 heures du Québec, majoration et crédits pour dividendes
  non déterminés (fédéral et 11 provinces ; Saskatchewan et Nunavut non trouvés), ordre surtaxe / crédit de l'ON428,
  RPC et RRQ de l'employeur, AE exclue pour l'actionnaire qui contrôle plus de 40 % des actions, montant canadien
  pour emploi (et celui du Yukon), RQAP salarié et employeur, FSS, impôt sur le salaire des T.N.-O., entreprise de
  services personnels, revenus passifs, TOSI, absence de cotisations et de droits REER sur les dividendes.
- Spécification du comparateur dans `documentation/pays/ca.md` ; décision D19 ; questions ouvertes 14 et 15.
- Tests : unitaires québécois recalculés à la main (60 000 $, 20 000 $, acomptes à 24 000, 36 000 et 40 000 $),
  chacune des trois corrections contrôlée en réintroduisant l'erreur ; parcours navigateur.

## 2026-10-22 — États-Unis : comparateur *Sole proprietor vs S corp*

- Nouvelle page `/us/sole-proprietor-vs-s-corp/` (menu « Taxes », même identifiant que les comparateurs de statuts
  français et britannique) : impôts fédéraux 2026 et revenu disponible d'une entreprise individuelle (ou LLC à un
  associé) et d'une S corp qui verse un salaire au dirigeant : FICA patronale et salariale, FUTA, *Additional
  Medicare Tax*, déduction QBI (sur le résultat de la société, limitée à 50 % des salaires W-2 au-delà du seuil),
  frais propres à la S corp. Aucun salaire n'est proposé : la page rappelle l'obligation d'un salaire raisonnable
  et avertit si le salaire est nul.
- Règles nouvelles (`us.json`) : `fica_rates_2026`, `futa_2026`, `scorp_reasonable_compensation`,
  `scorp_income_not_se`, `qbi_w2_wage_limit`, `single_member_llc_default`, `ssa_benefits_based_on_earnings` ;
  question ouverte sur le barème 2026 des époux imposés séparément.
- Moteur commun : la déduction QBI tient compte des salaires W-2 versés (sans effet pour un indépendant sans
  salarié) ; nouveau moteur `engines/structure-us.js`. Style : tableau de comparaison à trois colonnes lisible sur
  mobile, aide sous une case à cocher.
- Tests : unitaires (cas calculés à la main : sous le seuil, déclaration commune, zone de transition avec et sans
  limite des salaires, SSTB, minimum de 400 $, salaire nul, plafond de la Social Security, frais) ; parcours
  navigateur ; suite complète (168 tests unitaires, 1 940 vérifications navigateur) ; revue critique (11 points traités ; le débounce de la saisie, absent des autres outils, n'est pas
  ajouté).

## 2026-10-22 — Matrice des besoins remise à jour

- `documentation/02-besoins-clients.md` : chaque besoin vérifié contre les pages publiées des quatre pays
  (calendriers, indemnités kilométriques, retraite, contrats, devis, calculateurs d'impôt et d'acomptes, modèles
  d'emails, *Making Tax Digital*, numérotation automatique… étaient encore marqués « prévus ») ; nouvelle ligne pour
  l'Espace entrepreneur ; liste des besoins encore ouverts par priorité.
- Feuille de route : prochains outils choisis d'après cette liste (comparateurs de statuts aux États-Unis et au
  Canada en P1, puis convertisseur de tarifs et prix au forfait).

## 2026-10-21 — Canada : *Invoicing clients outside Canada* et « Facturer un client étranger »

- Deux pages (anglais et français, menus « Invoicing » et « Facturer », même identifiant que les pages française et
  britannique) : selon l'inscription, le Québec, la résidence du client et le service, l'assistant dit si la vente
  est détaxée (0 %) ou taxable, quoi écrire sur la facture et quelles démarches suivre. Services de conseil et
  professionnels (art. 23 : exception du litige au Canada), autres services (art. 7 : exception du particulier au
  Canada), services liés à un immeuble ou à un bien au Canada (taxables), propriété intellectuelle et conseil rendu
  au Canada (« ça dépend », renvoi aux publications de l'ARC). Les exportations détaxées comptent dans le seuil de
  30 000 $ ; ligne 101 selon la méthode ordinaire ou rapide ; TVQ détaxée aussi.
- Règles nouvelles (`ca.json`) : `export_services_zero_rated`, `export_professional_services_zero_rated`,
  `export_ip_non_registered`, `export_evidence_non_resident`, `small_supplier_includes_zero_rated`,
  `gst_return_line_101`, `quick_method_zero_rated`, `qst_services_non_residents_zero_rated` ;
  `place_of_supply_and_exports` corrigée (la non-inscription du client ne compte que pour certains services).
- Générateur de facture canadien : options « Exportation détaxée » (TPS/TVH 0 %) et « (Québec) » (TPS et TVQ 0 %).
- Pages « client étranger » (Canada et Royaume-Uni) : seuls le verdict et l'explication sont annoncés aux lecteurs
  d'écran, les listes ne le sont plus à chaque changement.
- Moteur `engines/international-ca.js` ; tests : unitaires (cas écrits à la main à partir des règles, invariants sur
  les 64 situations, textes des deux pages), contrôlés en réintroduisant les erreurs ; parcours navigateur des deux
  pages et du générateur ; suite complète (162 tests unitaires, 1 915 vérifications navigateur) ; revue critique
  (4 erreurs bloquantes corrigées, dont l'article applicable au conseil).

## 2026-10-21 — Royaume-Uni : *Invoicing overseas clients*

- Nouvelle page `/uk/invoicing-overseas-clients/` (menu « Invoicing », même identifiant que « Facturer un client
  étranger ») : selon l'immatriculation, le pays du client (Royaume-Uni ou île de Man, UE, ailleurs), son statut
  (entreprise ou particulier) et le service, l'assistant dit s'il faut facturer la TVA britannique, quoi écrire sur
  la facture et quelles démarches suivre (preuves, case 6, seuil de 90 000 £, guichet *non-Union* de l'UE pour les
  services numériques à des particuliers, dès la première vente). Quand la règle n'est pas tranchée (design ou
  rédaction pour un particulier à l'étranger, services liés à un lieu), la réponse est « It depends », avec le
  renvoi à la Notice 741A.
- Règles nouvelles (`uk.json`) : lieu de la prestation entre entreprises et envers un particulier, services de
  l'annexe 4A § 16, services numériques, guichet *non-Union* (Commission européenne), territoire de TVA, preuves,
  case 6, chiffre d'affaires taxable ; deux questions ouvertes (services « semblables » au conseil, régime
  forfaitaire). La mention « hors champ », qu'HMRC ne fixe pas, est présentée comme une suggestion.
- Générateur de facture britannique : option « No UK VAT (outside the scope) », sans ligne de TVA.
- Moteur `engines/international-uk.js` ; tests : unitaires (les 48 situations, invariants, textes de la page, montants
  et taux repris des règles), contrôlés en réintroduisant les erreurs ; parcours navigateur (11 situations,
  mémorisation, accessibilité avec un résultat affiché) ; suite complète (155 tests unitaires, 1 865 vérifications
  navigateur) ; revue critique (10 points traités).

## 2026-10-21 — Canada : *What to put on an invoice* et « Que mettre sur une facture »

- Deux pages (anglais et français), même liste : les mentions dont un client inscrit à la TPS/TVH a besoin pour
  demander ses crédits de taxe sur les intrants, selon le total de la facture taxes comprises (moins de 100 $,
  100 $ à 499,99 $, 500 $ ou plus : 3, 5 ou 8 points), plus, au Québec, le numéro de TVQ (dès 100 $) et la facture
  rédigée en français (Charte de la langue française, art. 57) ; sans inscription, seules les mentions de base
  restent, avec le rappel du petit fournisseur. Situation mémorisée ; ajoutées aux menus « Invoicing » et
  « Facturer » ; même identifiant que les listes française et britannique.
- Règles : `itc_invoice_requirements` revérifiée (tableau du mémorandum 8.4 de l'ARC, question ouverte levée) ;
  nouvelles règles `qst_registration_number_on_invoices`, `quebec_invoices_in_french`,
  `small_supplier_not_required_to_collect`. Signalé plutôt que publié : les renseignements propres à la TVQ sous
  500 $ (tableau de Revenu Québec illisible dans les extraits : la page renvoie à Revenu Québec) et deux questions
  sur la langue des factures.
- Générateurs de facture canadiens : FAQ alignées (le numéro de facture n'est plus dit exigé ; seuil du petit
  fournisseur exact, aussi dans les calculateurs de TPS/TVH ; renvoi vers le générateur en français pour le Québec).
- `tools/checklist.js` : plusieurs conditions par point (toutes requises). `build.py` : liens vers une page d'une
  autre section (`{{link:ca-fr/invoice}}`). Listes : traits entre les seuls points visibles ; score et message
  annoncés à part des rappels (aussi au Royaume-Uni).
- Tests : unitaires (chaque mention des paliers reprise une fois, mêmes points en anglais et en français, conditions
  des points et des rappels, nombre de points par situation, seuils et exemples de numéros repris des règles) ;
  parcours navigateur des deux pages (paliers, inscription, Québec, clavier, mémorisation, accessibilité avec les
  rappels affichés, lien vers le générateur en français), contrôlés en réintroduisant les erreurs ; suite complète (151 tests
  unitaires, 1 835 vérifications navigateur, accessibilité comprise) ; revue critique
  (10 points, 9 traités ; confiance des nouvelles règles laissée « moyenne », selon la convention du projet pour une
  lecture par recherche).

## 2026-10-21 — Royaume-Uni : *What to put on an invoice*

- Nouvelle page `/uk/invoice-requirements/` : liste interactive des détails d'une facture, selon la situation
  (*sole trader* ou *limited company*, immatriculé à la TVA ou non, mémorisée) ; les points qui ne s'appliquent pas
  sont masqués et sortent du compte (11 points pour un *sole trader* sans TVA, 18 avec) ; rappel de ne pas faire
  figurer de TVA sans immatriculation ; facture simplifiée de 250 £ ou moins ; cas des sociétés (nom complet
  obligatoire ; numéro, siège et lieu d'immatriculation affichés comme recommandés, hors du compte : décision D18).
  Ajoutée au menu « Invoicing » ; même identifiant que la liste française (liens entre pays).
- Règle `vat_invoice_full_requirements` revérifiée (Notice 700 § 16.3, manuel VATREC5010, règlement TVA de 1995,
  art. 14, lus par recherche) : la remise visée est le taux d'escompte ; le fait générateur (*tax point*) est un
  point distinct de la date de la prestation. Le générateur de facture britannique ne présente plus le numéro et le
  siège de la société comme obligatoires sur la facture.
- `tools/checklist.js` généralisé : textes du score et des messages dans la page, filtres facultatifs
  (`data-when`, `data-show-when`), points recommandés (`data-optional`), condition illisible signalée ; la liste
  française garde exactement son comportement.
- Pages britanniques : date de vérification des sources au format du pays (« 20 October 2026 »).
- Tests : unitaires (chaque point sourcé, chaque élément des quatre règles repris une fois, condition d'affichage,
  nombre de points selon la situation) ; parcours navigateur (score, filtres à la souris et au clavier,
  mémorisation, point recommandé hors compte, messages au singulier et au pluriel, y compris sur la liste
  française) ; chaque nouvelle vérification contrôlée en réintroduisant l'erreur ; suite complète (148 tests
  unitaires, 1 784 vérifications navigateur, accessibilité comprise) ; revue de code (22 points :
  20 traités ; reportés : l'orthographe « VAT registered » à harmoniser sur tout le site, et un texte de repli si
  un attribut manque, couvert pour l'instant par un test).

## 2026-10-21 — Canada : TVP de la province du client, en option

- Règle `pst_on_professional_services` complétée à partir des bulletins officiels de la Saskatchewan (PST-46, PST-7)
  et du Manitoba (RST 033) : créer ou modifier un logiciel est un service informatique taxable en Saskatchewan ; au
  Manitoba, les services liés à un logiciel commercial et l'infonuagique (depuis le 1er janvier 2026) sont taxables,
  le logiciel sur mesure ne l'est pas ; le conseil seul ne l'est généralement pas. Confiance moyenne (lus par
  recherche) ; question ouverte levée.
- Calculateurs « combien mettre de côté » (anglais et français) : une case ajoute la TVP (TVD au Manitoba) quand le
  service y est soumis dans la province du client ; FAQ avec ces exemples.
- Tests : parcours navigateur (TPS + TVP en C.-B., TVD au Manitoba, case masquée ailleurs).

## 2026-10-21 — Canada : seuil d'acomptes de Revenu Québec et TVP de la Colombie-Britannique précisés

- Revenu Québec : l'« impôt net à payer » de son seuil de 1 800 $ ne comprend que l'impôt (les cotisations RRQ,
  RQAP et FSS sont versées avec les acomptes, mais ne comptent pas dans le test) ; le moteur suivait jusque-là une
  hypothèse prudente qui annonçait des acomptes à tort entre environ 16 800 $ et 35 900 $ de revenu net. Question
  ouverte levée ; calculateurs d'impôt et « combien mettre de côté » corrigés.
- TVP de la Colombie-Britannique : règle complétée (conseil et design non taxables sauf avec des biens ou un
  logiciel ; services à un logiciel non taxables, vente d'un logiciel taxable). Reste à vérifier : Saskatchewan et
  Manitoba.
- Tests : 144 unitaires (acomptes du Québec réécrits sur les nouveaux seuils), parcours navigateur mis à jour.

## 2026-10-21 — Canada : « How much to set aside for taxes » et « Combien mettre de côté pour l'impôt »

- Deux pages (anglais et français), un seul script bilingue : part de chaque paiement à mettre de côté pour l'impôt
  et le RPC (ou le RRQ et le RQAP), dans les 13 provinces et territoires ; acomptes provisionnels ; répartition d'un
  paiement, taxes de vente retirées d'abord **au taux de la province du client** (TVH, TPS + TVQ ou TPS seule ; la
  TVP est signalée, pas comptée) ; seuil du petit fournisseur ; tableau selon le revenu. Reliées aux pages des trois
  autres pays et aux calculateurs d'impôt canadiens.
- Moteur `tax-ca.js` : au Québec, deux tests d'acomptes distincts (ARC sur l'impôt fédéral, Revenu Québec sur l'impôt
  du Québec et les cotisations, par prudence) ; les acomptes sont présentés sous la condition des deux années
  précédentes, aussi dans les calculateurs d'impôt canadiens (dates en toutes lettres, l'année une fois).
- Règles : TVP en Colombie-Britannique (extension aux services professionnels suspendue le 18 septembre 2026),
  seuil de Revenu Québec (deux conditions, revenuquebec.ca) ; une question ouverte sur la base de ce seuil.
- Pages britannique et américaine : ligne du tableau la plus proche du bénéfice signalée (une seule, annoncée aux
  lecteurs d'écran) ; résumé « par mois » et total de l'année séparés.
- Tests : 4 tests unitaires (acomptes du Québec, taux de taxe de vente des 13 provinces, textes et exemples
  recalculés), 2 parcours navigateur (19 vérifications) ; revue critique (6 points et les remarques traités).

## 2026-10-21 — Royaume-Uni : *How much to set aside for tax*

- Nouvelle page `/uk/how-much-to-set-aside-for-tax/` : part de chaque paiement à mettre de côté pour l'*income tax*
  et la Class 4 (arrondie au point supérieur, comme la page américaine), *payments on account*, ce qui reste,
  répartition d'un paiement (TVA d'abord si l'utilisateur est immatriculé), tableau de la part selon le bénéfice ;
  seuil d'immatriculation à la TVA et facture de la première année rappelés. Reliée aux pages française et
  américaine.
- Moteur `tax-uk.js` : `soleTrader` prend en compte un salaire (impôt dû sur le bénéfice seulement, PAYE compté dans
  le test des 80 % des *payments on account*) ; le calculateur d'impôt britannique l'utilise désormais (un seul
  calcul, résultats inchangés).
- Revue critique (7 points traités) : arrondi au point supérieur corrigé sur toutes les pages qui l'affichent
  (une part exacte de 11 % s'affichait 12 %) ; fourchettes « la plupart des indépendants » sans source remplacées
  par des exemples recalculés par les moteurs (Royaume-Uni, États-Unis) ; récupération de la TVA et maximum annuel
  de National Insurance sourcés (gov.uk) et signalés ; champs invalides nommés et annoncés ; bordure rouge des
  saisies invalides sur tout le site.
- Tests : 4 tests unitaires (salaire, acomptes inutiles grâce au PAYE, textes et exemples recalculés), parcours
  navigateur de la page (10 vérifications), chaque correction contrôlée en réintroduisant le défaut ; suite
  complète de 1 707 vérifications.

## 2026-10-21 — Calculateur « Combien mettre de côté sur chaque paiement » (France)

- Nouvelle page `/fr/combien-mettre-de-cote-auto-entrepreneur/` : pour un paiement reçu, la TVA à reverser, les
  cotisations et la formation professionnelle (sur le montant hors taxes, ACRE comprise) et l'impôt (versement
  libératoire, ou estimation de l'acompte au taux du foyer sur le hors taxes après abattement) ; reste disponible ;
  CFE et régularisation de l'impôt rappelées. Reliée à la page américaine équivalente.
- Moteur `engines/micro-fr.js` (calculs exacts en centimes), partagé avec le simulateur auto-entrepreneur, qui lit
  aussi l'abattement minimum dans les règles ; le calculateur de TVA lit ses taux dans les règles et affiche ses
  sources.
- Règles : `ca_declare_hors_taxes`, `tva_taux_metropole`, `pas_micro_acomptes` (relevées par recherche sur les sites
  officiels, confiance moyenne) ; taux du versement libératoire relus sur impots.gouv.fr (question ouverte levée).
- Mémorisation des formulaires (tout le site) : une valeur enregistrée qui ne correspond plus à aucun choix est
  ignorée, au lieu d'une liste vide.
- Tests : 10 tests du moteur et de la cohérence page/règles (chaque contrôle vérifié en glissant une erreur dans la
  page), parcours navigateur de la page (9 vérifications), suite complète ; revue critique (11 points traités, dont
  le taux ACRE de la Cipav signalé comme à confirmer et une seule annonce pour les lecteurs d'écran).

## 2026-10-21 — Navigation au clavier ; offres et paiements

- Clavier : un menu déroulant se referme quand le focus le quitte, et Échap rend le focus à son bouton (il restait
  sur un lien masqué) ; contour de focus opaque (indigo, 6:1 sur fond blanc ; blanc sur le bandeau sombre du kit),
  au lieu d'un indigo transparent à 2:1.
- Tests : lien d'évitement, ouverture et fermeture des menus au clavier, contour de focus, panneau mobile refermé
  par Échap ; chaque test contrôlé en réintroduisant le défaut qu'il doit détecter ; suite complète de 1 658
  vérifications.
- `documentation/17-offres-et-paiements.md` : prix proposés (« Pro » à 5 € HT par mois ou 50 € HT par an), coûts
  pris en compte, frais de Stripe, Stripe Managed Payments, Paddle, Lemon Squeezy et Mollie relevés sur leurs sites
  (grille de GoCardless non trouvée), abonnés nécessaires pour couvrir l'hébergement et la mesure d'audience (7 à 13),
  questions de TVA et de facturation pour l'expert-comptable, recommandation (Stripe en France) et tâches d'Ismail ;
  relu (9 points corrigés, dont des frais oubliés et une comparaison trop favorable).
- Spécification des comptes : étape C7 (abonnement « Pro ») ; plan : l'offre cible renvoie à la première grille.
- Journal des décisions : décisions en attente complétées (prix, prestataire de paiement).

## 2026-10-21 — Accessibilité (WCAG 2.1 AA) contrôlée à chaque vérification

- Audit axe-core (règles WCAG 2.1 A et AA) des 84 pages, sur ordinateur et mobile, puis des états produits par les
  outils. Corrigé : contraste du texte discret (`--faint` : #6c6987, au moins 4,6:1) et du vert de confirmation
  (`--ok` : #15803d, 5:1 ; boutons « Copié », cases cochées), champs vides de l'aperçu de facture ; tableaux
  défilants atteignables au clavier et nommés par leur titre ; nom accessible du sélecteur de pays qui reprend le
  texte affiché (« FR, Pays : France ») ; lien temporaire des téléchargements retiré aussitôt.
- Une seule fonction de téléchargement (`OF.download`) au lieu de quatre copies (calendrier, contrat, acomptes US,
  Espace).
- Tests : axe-core 4.14.0 (version fixée, `sh tests/e2e/installer-axe.sh`) fait partie du parcours navigateur :
  chaque page dans les trois formats (sur ordinateur, à l'ouverture et après le parcours), la page 404 et 15 écrans
  de l'Espace, une fois les transitions terminées ; 362 contrôles d'accessibilité, suite complète de 1 650
  vérifications (décision D17). Factur-X revalidé après le changement de couleur du PDF (XML conforme, 10 PDF/A-3
  valides selon Mustang).
- `build.py` s'arrête si un tableau défilant n'a pas de titre `h2` avant lui ou n'est pas reconnu. Revue de code :
  aucun défaut bloquant, 7 remarques traitées (documentation précisée, URL des téléchargements libérée après une
  minute pour Safari, emoji du sélecteur mondial masqué aux lecteurs d'écran…).

## 2026-10-21 — Mesure d'audience : règles et comparatif

- `documentation/16-mesure-audience.md` : conditions de la CNIL pour une mesure d'audience sans consentement,
  comparatif de Plausible, Pirsch, GoatCounter et Matomo (prix relevés sur les sites des éditeurs, hébergement),
  recommandation (Plausible), plan de mise en place et tâches d'Ismail ; décision ajoutée aux décisions en attente.
- Feuille de route : la complétion du SIREN par l'API Recherche d'entreprises attend un accès réseau permettant de
  vérifier le service (format des réponses, appels depuis le navigateur).

## 2026-10-21 — Typographie du texte produit par les outils

- Règles de typographie française regroupées dans `data/typo-fr.json` (une seule source, syntaxe commune à Python et
  à JavaScript) : `build.py` les applique au texte des pages ; `engines/typo-fr.js` les applique au texte que les
  scripts des outils ajoutent ou modifient dans les pages en français (résultats, messages, listes de l'Espace).
- Tests : parité Python/JavaScript et idempotence sur 23 cas ; parcours navigateur (texte produit par un outil, texte
  ajouté puis modifié, code et `pre` intacts) ; suite complète (1 277 vérifications) ; revue de code (8 points
  traités, dont la réunion des règles en une seule source).

## 2026-10-21 — Typographie française automatique

- `build.py` : espaces insécables dans le texte visible des pages en français (`fr`, `ca-fr`) : avant « ; ! ? »
  (espace fine) et « : », dans les guillemets, entre les groupes de chiffres, entre un nombre et son unité ou le mot
  qui le suit, après « art. », « L. » et « n° ». Rien n'est retouché dans les balises `script`, `style`, `code`,
  `pre`, `textarea`, ni dans les attributs ; pas d'espace insécable après la fin d'un code (« RRQ2 », « J+10 »), et
  une année n'est pas lue comme un groupe de milliers. 37 pages concernées.
- Boutons « Copier » : l'espace fine insécable devient une espace insécable avant la copie, pour toutes les
  messageries.
- Tests : 5 tests de la fonction (cas à traiter et cas à laisser) ; suite navigateur complète (1 275 vérifications) ;
  captures mobiles relues ; revue de code (8 points traités). Spécification `documentation/15-guides-gestion.md`, § 3.

## 2026-10-20 — Guide « Assurance de l'indépendant » (France)

- Nouvelle page `/fr/assurance-independant/` (menu « Statut et revenus ») : vérificateur des assurances selon
  l'activité (travaux du bâtiment, artisanat, profession réglementée, services, commerce), la micro-entreprise,
  l'immatriculation au secteur des métiers et l'usage d'un véhicule ; décennale obligatoire pour la construction,
  responsabilité civile selon la profession (« à vérifier » pour le bâtiment, faute d'article de loi relevé),
  responsabilité civile automobile ; ce qu'il faut porter sur les devis et factures (mention de l'art. L132-1 du Code
  de l'artisanat ou attestation décennale de l'art. L243-2 du Code des assurances).
- Mentions obligatoires : point « Assurance professionnelle » ajouté à la liste (12 points), sources de la page
  reliées aux règles.
- Règles sourcées `assurance_*` dans `data/rules/fr.json` ; moteur `engines/assurance-fr.js` et 7 tests unitaires
  (dont la cohérence entre les pages et les règles) ; parcours navigateur ; revue de code (10 points traités).

## 2026-10-20 — Guide « Compte bancaire professionnel » (France)

- Nouvelle page `/fr/compte-bancaire-professionnel/` (menu « Statut et revenus ») : vérificateur du compte dédié
  obligatoire pour les micro-entrepreneurs (plus de 10 000 € de chiffre d'affaires deux années civiles consécutives,
  avec l'estimation de l'année en cours), cas de l'entreprise individuelle au réel et des sociétés, intitulé « EI »,
  droit au compte auprès de la Banque de France, questions que le texte laisse ouvertes.
- Règles sourcées dans `data/rules/fr.json` (CSS art. L613-10, Code de commerce art. R526-27 et L123-24, Urssaf,
  Banque de France) ; moteur `engines/compte-fr.js` et 8 tests unitaires (dont la cohérence entre la page et les
  règles) ; parcours navigateur ; spécification `documentation/15-guides-gestion.md`.
- Règles : la mention de l'assurance sur les devis et factures est corrigée dans la liste des mentions obligatoires
  (artisans et micro-entrepreneurs : Code de l'artisanat, art. L132-1, qui a repris en 2023 l'article 22-2 de la loi
  n° 96-603 ; travaux soumis à la décennale : attestation jointe, Code des assurances, art. L243-2). Spécification du
  guide « Assurance de l'indépendant » (`documentation/15-guides-gestion.md`, § 2).

## 2026-10-20 — Recouvrement judiciaire : étude préalable

- `documentation/14-etude-recouvrement.md` : nouvelle procédure de recouvrement des créances commerciales incontestées
  (loi n° 2026-307 du 23/04/2026, entre commerçants seulement), petites créances (jusqu'à 5 000 €, désormais hors
  factures entre commerçants), injonction de payer ; points à vérifier avant publication du guide et plan du guide.
- Relance de facture impayée : la question sur la mise en demeure ne la présente plus comme une étape obligatoire avant
  l'injonction de payer.

## 2026-10-20 — Étude concurrentielle : prix revérifiés sur les sites officiels

- `documentation/11-etude-concurrentielle.md` : prix d'Indy, Abby, Tiime, Henrri, Freebe, Wave, FreshBooks et FreeAgent
  relevés sur leurs sites officiels, avec les écarts entre pages et les promotions ; constat précisé (facturation
  gratuite chez quatre acteurs français, premières formules payantes à 9 à 10 € HT par mois) ; proposition pour
  l'offre « Pro » (4 à 6 € HT par mois), à décider par Ismail.

## 2026-10-20 — Comparatif des hébergeurs (étape C1)

- `documentation/13-comparatif-hebergeurs.md` : besoins de l'hébergement des comptes (API, PostgreSQL, emails,
  sauvegardes ; environ 1 Ko par facture émise), offres et prix relevés chez Scaleway, OVHcloud, Clever Cloud et
  Supabase avec leurs sources, budget de départ (Scaleway : environ 12 à 20 € HT par mois, 22 à 30 € en haute
  disponibilité), recommandation (Scaleway, région de Paris), tâches d'Ismail. Prix relevés par recherche web, à
  vérifier sur les grilles officielles.
- Dépendance signalée : le nom de domaine doit être choisi avant l'étape C4 (clés d'accès et emails de connexion liés
  au domaine) ; ajoutée aux décisions en attente.

## 2026-10-20 — Comptes en ligne, étape C2 : moteur de synchronisation

- `engines/espace-sync.js` : fusion de l'Espace entre appareils (schéma 2), sans serveur ni chiffrement, à partir de
  trois versions (dernière base commune, appareil, compte) : champ par champ, suppressions marquées (`deletedAt`), une
  modification l'emporte sur une suppression, un document émis sur un brouillon (modifications gardées dans une
  copie, y compris celles faites ensuite), deux émissions du même brouillon conservées toutes les deux, encaissements
  fusionnés un par un, liens des devis recalculés, numéros en double signalés, réglages de l'appareil non synchronisés,
  données d'une version plus récente refusées. Règles dans `documentation/12-specification-comptes.md`, § 3.1
  (décision D16).
- Moteur de l'Espace : les encaissements marqués supprimés ne comptent plus dans les montants, le livre des recettes,
  la synthèse par client ni les emails (fonction `payments`).
- Tests : 17 scénarios écrits, chacun contrôlé en réintroduisant l'erreur qu'il doit détecter ; simulation de
  50 scénarios reproductibles à trois appareils (convergence, chaque émission conservée une fois, chaque encaissement
  une fois sur son document, liens des devis valides, chaque cas de conflit rencontré) ; essai ponctuel sur 1 000
  scénarios à trois appareils et 300 à cinq. 107 tests unitaires.

## 2026-10-20 — Spécification des comptes en ligne (première version)

- `documentation/12-specification-comptes.md` : principes (l'Espace reste utilisable sans compte, local d'abord,
  hébergement dans l'UE), fonctions du compte gratuit et de l'offre « Pro » proposée, synchronisation (schéma 2,
  suppressions marquées, numérotation sur plusieurs appareils), options d'architecture et recommandation
  (synchronisation chiffrée de bout en bout chez un hébergeur français), sécurité, RGPD, étapes C1 à C6 et décisions
  d'Ismail.

## 2026-10-20 — Finitions SEO et étude concurrentielle

- Titres (60 caractères au plus) et descriptions (160 au plus) revus sur 72 pages des cinq sections : mots-clés en
  tête, sans promesse au-delà du contenu ; audit : 83 pages conformes.
- Étude concurrentielle, première version (`documentation/11-etude-concurrentielle.md`) : offres et ordres de prix en
  France (Indy, Abby, Tiime, Henrri, Freebe) et dans les pays anglophones (Wave, FreshBooks, Bonsai, QuickBooks,
  FreeAgent), positionnement et pistes de revenus ; prix à vérifier sur les pages officielles.

## 2026-10-20 — Espace : facture électronique Factur-X

- Sur chaque facture ou avoir émis à un client professionnel : fichier **Factur-X** (PDF/A-3 lisible avec ses données
  structurées `factur-x.xml`, profil EN 16931, règles françaises) et données seules (XML). Données manquantes listées
  avec des liens vers les fiches ; identifiants manquants complétés depuis le profil et la fiche client, et signalés.
- Générateur PDF/A-3 maison (`engines/pdfa.js`, décision D14) : police Inter incorporée (sous-ensemble de 330
  glyphes, licence OFL), profil sRGB (littleCMS, licence zlib), XMP Factur-X ; chargé seulement au premier export.
- Clients : pays (liste ISO 3166, noms en français) et adresse de facturation électronique ; profil : adresse de
  facturation électronique, contrôlée (elle commence par le SIREN).
- Moteur de facture commun : modèle du document (`model`) partagé par la page imprimable et le PDF.
- Validation : 10 cas (dont une facture de 3 pages avec logo, un client belge, des noms longs) conformes au XSD et aux
  schematrons EN 16931 et BR-FR, PDF/A-3 et Factur-X validés par Mustang 2.26.0 (veraPDF) ; le fichier produit dans
  le navigateur est validé de la même façon. Revue de code : 10 points corrigés.
- Pages : la facturation électronique et l'Espace présentent l'export, sans promettre plus que ce qu'il fait.

## 2026-10-20 — Factur-X : moteur XML validé par les fichiers officiels

- Moteur `engines/facturx-fr.js` : données structurées CII, profil EN 16931 de Factur-X 1.09.2, règles françaises BR-FR
  (cadre de facturation, notes PMT, PMD, AAB et BAR, SIREN et adresses électroniques, catégories de TVA E, S, AE, O, G,
  avoir lié à sa facture). Pas encore de bouton dans l'Espace (étapes F2, F4 et F5 de l'étude).
- Chaîne de validation `tests/facturx/` : jeu d'essai de 8 cas, XSD et schematrons officiels exécutés en local ;
  8/8 conformes, et 8 variantes volontairement fausses toutes rejetées.
- Moteur de facture commun : montants de ligne arrondis au centime avant le total (la facture lisible et les données
  structurées concordent toujours).
- Étude mise à jour : points tranchés par les règles officielles, points restant à confirmer au texte.

## 2026-10-20 — Espace entrepreneur v1.1

- Envoi au client : sur chaque facture, devis et avoir émis, email prérempli (objet, montant, échéance ou validité,
  acompte, reste dû, IBAN) à joindre au PDF ; la relance utilise le même moteur de textes, testé.
- Générateur de facture : bouton « Continuer dans mon Espace » ; l'Espace reprend le document en brouillon (client
  existant ou nouvelle fiche, profil complété sur ses champs vides, acompte signalé) et propose de continuer la
  numérotation du générateur (ex. 2026-007, puis 2026-008).
- Réglages : dernier numéro déjà utilisé cette année pour chaque type, aperçu du prochain numéro, préfixes contrôlés ;
  une série commencée garde son préfixe jusqu'à la fin de l'année (décision D13).
- Encarts vers l'Espace sur le simulateur auto-entrepreneur, le calendrier fiscal, la relance de facture impayée et les
  mentions obligatoires ; nouvelle question fréquente sur la numérotation.
- Moteur de facture commun : mention de paiement « au plus tard le … », ou « à réception » si le délai est nul (au
  lieu de « à réception, au plus tard le … »).
- Qualité : spécification préalable (section 11 de `documentation/09-specification-espace.md`), 73 tests unitaires,
  parcours navigateur étendu (reprise, envoi, numérotation), revue de code (10 points corrigés), captures relues.
- Étude de l'export Factur-X (`documentation/10-etude-factur-x.md`) : cadre officiel, règles françaises BR-FR,
  données à ajouter, choix techniques, chaîne de validation et étapes F1 à F5.

## 2026-10-20 — Espace entrepreneur v1 (France, version locale)

- Nouvelle page `/fr/espace/` : profil de l'entreprise, clients, devis, factures et avoirs (brouillon puis émission,
  numérotation continue F2026-001, coordonnées figées à l'émission, contrôle de la chronologie), encaissements
  partiels, relance par email préremplie, livre des recettes (export CSV, impression), déclaration Urssaf estimée
  (période, date limite du calendrier, taux de l'activité, ACRE, versement libératoire), jauges du plafond et du seuil
  de TVA, échéances selon le profil, sauvegarde (export, import contrôlé, effacement), reprise des informations du
  générateur de facture. Données dans le navigateur (IndexedDB), synchronisées entre onglets ; rien n'est envoyé.
- Moteur de facture commun `engines/invoice-fr.js` (générateur public et Espace) ; moteur `engines/espace-fr.js`.
- Règles ajoutées : `livre_recettes_micro`, `conservation_pieces` ; échéances Urssaf du calendrier marquées par période.
- Qualité : spécification préalable (`documentation/09-specification-espace.md`), charte qualité (règle d'Ismail),
  60 tests unitaires, parcours navigateur complet, revue de code (10 points corrigés), captures relues.
- Mobile : lignes de facture (quantité étroite, prix large) corrigées aussi dans le générateur public ; champs de
  recherche stylés ; option `ONLY=` pour lancer les tests d'une seule page.

## 2026-10-20 — Plan de développement de la plateforme

- Nouveau cap : passer du site d'outils gratuits à la plateforme de l'entrepreneur avec un compte
  ([documentation/07-plan-de-developpement.md](documentation/07-plan-de-developpement.md)).
- Feuille de route réorganisée en 6 étapes (E1 à E6) avec « Où en est-on ? », tâches d'Ismail, critères de passage,
  bilans mensuels ; l'historique du site d'outils est conservé.
- Journal des décisions ; `CLAUDE.md` impose de lire et de mettre à jour la feuille de route à chaque session.

## 2026-10-20 — Facturer un client étranger

- Assistant (France) : TVA applicable selon le pays du client (France, UE, hors UE), entreprise ou particulier, et la
  nature du service (immatériel, numérique, autre) ; mentions à copier (autoliquidation, hors champ), numéro de TVA
  intracommunautaire même en franchise, VIES, DES, guichet OSS au-delà de 10 000 €.
- Générateur de facture : option « client de l'UE » (autoliquidation) ou « hors de l'UE » (hors champ), sans TVA.
- Les mentions citent la directive 2006/112/CE (art. 44, 59 et 196), valable avant et après le transfert de la TVA
  dans le CIBS.

## 2026-10-20 — Correction : mention de franchise de TVA

- L'ordonnance n° 2026-671 du 27 juillet 2026 a reporté au 1er janvier 2027 le transfert de la TVA dans le CIBS
  (prévu au 1er septembre 2026) et renuméroté les articles. Jusqu'au 31 décembre 2026, la mention reste
  « TVA non applicable, art. 293 B du CGI ».
- Le générateur de facture choisit la mention selon la date de la facture : « art. 293 B du CGI » en 2026,
  « art. L. 233-3 du CIBS (ex-art. 293 B du CGI) » à partir du 1er janvier 2027 (règles `mention_franchise_tva`
  et `mention_franchise_tva_2027`, sources affichées sur la page).
- Pages corrigées : accueil, générateur de facture, mentions obligatoires, calcul de TVA, simulateur, contrat.

## 2026-10-20 — Images de partage par pays

- Une image de partage (1200 × 630) par section, dans sa langue : `og-fr`, `og-us`, `og-uk`, `og-ca`, `og-ca-fr`,
  et une image générale pour l'accueil mondial ; générées par `scripts/og-images.mjs`.

## 2026-10-20 — Épargne retraite des indépendants (4 pays)

- France : simulateur PER (plafond TNS de l'art. 154 bis ou plafond général pour les micro-entrepreneurs, économie
  d'impôt, effort réel, alerte versement libératoire) ; moteur `engines/per-fr.js` testé.
- États-Unis : SEP-IRA vs solo 401(k) (limites 2026 de la Notice 2025-67, rattrapage à 50 ans et entre 60 et 63 ans,
  impôt fédéral et d'État économisé) ; `tax-us.js` accepte désormais une déduction retraite (AGI et QBI).
- Royaume-Uni : pension tax relief (relief at source de 20 %, complément via Self Assessment, allocation annuelle,
  limite des revenus, effet sur le personal allowance).
- Canada (anglais et français) : droits REER 2026 (18 %, 33 810 $), économie d'impôt par province ; `tax-ca.js`
  accepte une déduction du revenu net.

## 2026-10-20 — Comparateur de statuts : EURL à l'IS

- Quatrième statut : rémunération du gérant TNS (abattement de 10 % à l'impôt), IS, dividendes au PFU jusqu'à 10 %
  du capital et des comptes courants, cotisations TNS et part impôt du PFU au-delà (`eurlIS`, testé).
- Champ « capital et comptes courants », comparaison en grille 2 × 2.

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
