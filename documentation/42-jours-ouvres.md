# 42. Jours ouvrés, jours fériés et délais (France d'abord)

Outil de l'étape 6 de [31](31-vision-plateforme.md) § 5 (« jours ouvrés ») et de la boîte à outils du § 4 (« calculateur
de jours ouvrés et de délais »). Spécification avant le code, 29/10/2026. La France d'abord ; le Royaume-Uni (calendrier
officiel de gov.uk, déjà lu), les États-Unis et le Canada suivront, chacun après la lecture de ses sources. Fait le
29/10/2026 pour le Royaume-Uni (§ 6 et 7) et les États-Unis (§ 8 et 9) ; le Canada reste à faire.

## 1. Besoin

Un indépendant a besoin de savoir :

1. **Combien de jours il peut facturer** dans un mois, un trimestre ou l'année : jours ouvrés moins les jours fériés
   (et ses congés), pour fixer son TJM, prévoir son chiffre d'affaires ou chiffrer une mission au forfait ;
2. **Combien de jours ouvrés compte une période** (durée d'une mission, d'un devis, d'une absence) ;
3. **Quelle est la date d'un délai** exprimé en jours ouvrés, ouvrables, francs ou calendaires (livraison « sous 10 jours
   ouvrés », délai de réponse, rétractation de 14 jours) ;
4. **Quels sont les jours fériés** de l'année, selon le lieu (métropole, Alsace-Moselle, outre-mer).

Aujourd'hui, le calculateur de TJM demande de saisir soi-même le nombre de jours fériés.

## 2. Règles

Lues **en entier** le 29/10/2026 avec l'outil « Lire une source officielle ».

| Règle | Source | Usage |
|---|---|---|
| Fêtes légales : 1er janvier, lundi de Pâques, 1er mai, 8 mai, Ascension, lundi de Pentecôte, 14 juillet, 15 août, 1er novembre, 11 novembre, 25 décembre ; **Alsace-Moselle** : en plus le Vendredi saint (communes ayant un temple protestant ou une église mixte) et le 26 décembre ; **outre-mer** : commémoration de l'abolition de l'esclavage (Guadeloupe et Saint-Martin 27 mai, Guyane 10 juin, Martinique 22 mai, Mayotte 27 avril, La Réunion 20 décembre, Saint-Barthélemy 9 octobre) ; dates 2026 et 2027 publiées ; seul le 1er mai est obligatoirement chômé pour les salariés | F2405 (vérifiée le 01/01/2026) ; `jours_feries` (nouvelle) | Liste des jours fériés ; jours ouvrés ; contrôle du calcul de Pâques sur les dates publiées |
| Jour ouvrable (6 par semaine, sauf repos hebdomadaire et jours fériés habituellement non travaillés), jour ouvré (jours effectivement travaillés, généralement du lundi au vendredi, sauf jours fériés non travaillés), jour franc (0 h à 24 h, sans le jour de départ ni celui de l'échéance ; fin un samedi, un dimanche ou un jour férié → reportée au premier jour suivant qui n'en est pas un), jour calendaire (tous les jours) ; exemples chiffrés (10 jours francs à compter du 15/12/2026 → lundi 28/12/2026 ; congés du 13 au 17/07/2026 = 4 jours ouvrés) | F35697 (vérifiée le 30/04/2026) ; `jours_decompte` (nouvelle) | Quatre façons de compter ; tests sur les exemples officiels |

Prudence : les jours fériés autres que le 1er mai ne sont chômés que si un accord ou l'usage le prévoit (F2405) ; pour un
indépendant, l'outil compte par défaut les jours fériés comme non travaillés et permet de travailler certains jours.
Les fêtes locales ou professionnelles (Saint-Éloi, Sainte-Barbe, mi-carême) ne sont pas comptées : signalé sur la page.
Le décompte d'un délai **légal** dépend du texte qui le fixe (procédure civile, consommation…) : la page le dit et ne
remplace pas la règle propre à chaque délai.

## 3. Outil

- **Période** : un mois, un trimestre, une année ou deux dates ; résultat : jours calendaires, jours ouvrables, jours
  ouvrés, jours fériés tombant un jour ouvré (avec leur nom), **jours facturables** (jours ouvrés moins congés saisis).
- **Délai** : date de départ + N jours ouvrés, ouvrables, francs ou calendaires → date d'échéance, avec l'explication
  (jours sautés : week-end, fériés ; report éventuel).
- **Lieu** : métropole (par défaut), Alsace-Moselle, Guadeloupe, Guyane, Martinique, Mayotte, La Réunion,
  Saint-Barthélemy, Saint-Martin.
- **Semaine de travail** : jours travaillés cochables (du lundi au vendredi par défaut) ; option « je travaille les jours
  fériés ».
- **Liste des jours fériés** de la période, avec le jour de la semaine et « non travaillé », « travaillé » ou « jour de
  repos » selon la semaine de travail.
- **Congés** : nombre de jours de travail à retirer (0 au plus les jours ouvrés de la période) ; jours facturables =
  jours ouvrés moins congés.
- **Liens** : le calculateur de TJM affiche en aide le nombre de jours fériés tombant du lundi au vendredi de l'année en
  cours (métropole) et renvoie à l'outil. Sa valeur par défaut reste **8 jours** : c'est la convention commune du
  calculateur de TJM, du convertisseur de tarifs et des outils qui partent de 148 jours facturables
  ([18](18-outils-de-prix.md)) ; la changer chaque année ferait varier tous ces chiffres.
- **Moteur** `engines/jours.js` (OFE.days) : Pâques (calendrier grégorien), jours fériés d'une année et d'un lieu, jours
  d'une période selon le mode, ajout de N jours selon le mode (0 à 3 650) ; fonctions pures, années 2000 à 2100 (liste
  des fêtes légales actuelle, sans l'historique des lois).
- **Export .ics** des jours fériés : plus tard, avec le moteur du calendrier fiscal.

## 4. Tests

- Pâques : dates publiées de 2019 à 2028 (lundi de Pâques F2405 2026 et 2027, gov.uk 2019–2028) ; propriétés sur toutes
  les années couvertes (dimanche, entre le 22 mars et le 25 avril).
- Jours fériés 2026 et 2027 = tableaux de F2405, pour la métropole, l'Alsace-Moselle et l'outre-mer.
- Exemples de F35697 refaits : 10 jours francs depuis le 15/12/2026 → 28/12/2026 ; délai de 7 jours avec un mercredi
  férié dans les quatre modes ; congés de juillet et de novembre 2026.
- Nombre de jours ouvrés de chaque mois de 2026 (somme = total de l'année) ; année bissextile ; période inversée ; zéro jour.
- Page : chiffres de la FAQ = moteur ; parcours navigateur sur ordinateur, tablette et mobile ; accessibilité.

## 5. Réalisation (29/10/2026)

- Sources lues en entier avec l'outil « Lire une source officielle » : F2405 (jours fériés 2026 et 2027, Alsace-Moselle,
  outre-mer) et F35697 (quatre façons de compter, exemples). Le calendrier officiel du Royaume-Uni (gov.uk, 2019–2028,
  trois régions, dont le jour férié écossais de la Coupe du monde du 15 juin 2026) est lu pour la suite.
- Règles : `jours_feries` (fêtes légales, dates mobiles en jours après Pâques, Alsace-Moselle, abolition de l'esclavage
  par territoire) et `jours_decompte` (définitions et exemples). La fiche F35697 dit que le jour franc ne tient pas compte
  « du jour de l'échéance », mais son exemple compte 10 jours du 16 au 25 décembre : le calcul suit l'exemple (noté dans
  la règle).
- Code : moteur `engines/jours.js` (OFE.days), script `tools/jours.js`, page `content/fr/calcul-jours-ouvres.html`
  (menu « Fixer ses prix », après le TJM) ; calculateur de TJM : aide « En 2026 : 9 jours fériés du lundi au vendredi
  (métropole) » et lien, valeur par défaut inchangée (8).
- Relecture : libellés des types de jours raccourcis pour le mobile (option tronquée à 390 px) ; double point après une
  date abrégée (« 11 nov.. ») supprimé ; accords « 1 jour ouvré », « 1er jour » ; une erreur de mon propre test corrigée
  (mai 2026 : 17 jours ouvrés, 4 jours fériés en semaine et non 5).
- Tests : 10 tests unitaires (Pâques sur 101 ans, fiches officielles, exemples refaits, décomptes, page) ; 27 erreurs
  réintroduites dans le moteur, 23 détectées au premier passage, les 4 autres après ajout de tests ; parcours navigateur
  (année, mois, Alsace-Moselle, dates, congés, délais francs et ouvrés) sur ordinateur, tablette et mobile, audit
  d'accessibilité sans erreur.

## 6. Royaume-Uni (spécification, 29/10/2026)

Même outil, en anglais : *Working days and bank holidays calculator* (menu *Pricing*, après le *day rate*).

| Règle | Source | Usage |
|---|---|---|
| Jours fériés (*bank holidays*) de 2024 à 2028 pour l'Angleterre et le pays de Galles (8 par an), l'Écosse (9 ou 10 : 2nd January, St Andrew's Day, *Summer bank holiday* début août, pas d'*Easter Monday*) et l'Irlande du Nord (10 : St Patrick's Day, Battle of the Boyne) ; jours de remplacement (*substitute day*) quand la fête tombe un week-end ; jours exceptionnels (Écosse : *World Cup bank holiday* le 15 juin 2026) | gov.uk, liste officielle (`bank-holidays.json`, lue le 29/10/2026) ; `bank_holidays` (nouvelle, `data/rules/uk.json`), renommée `public_holidays` le même jour (§ 8) | Liste des jours fériés ; jours ouvrés |

- **Pas de calcul** : les jours fériés britanniques comportent des jours exceptionnels décidés chaque année ; l'outil
  reprend la liste publiée, et seulement les années qu'elle couvre (2024 à 2028) ; au-delà, un message le dit.
- **Modes de délai** : *working days* (du lundi au vendredi, ou les jours cochés, sauf *bank holidays*) et *calendar
  days*. Pas de jours francs ni ouvrables (notions françaises) ; aucune définition légale n'est affirmée : la page
  rappelle qu'un délai fixé par un contrat ou un texte se compte selon ses propres règles.
- **Régions** : *England and Wales* (par défaut), *Scotland*, *Northern Ireland*.
- **Calculateur de *day rate*** : aide « In 2026: 8 bank holidays in England and Wales » et lien ; valeur par défaut
  inchangée (8).
- **Moteur** : `engines/jours.js` lit soit les règles françaises (calcul à partir de Pâques), soit une liste publiée
  (`bank_holidays`) ; années couvertes données par les règles ; script `tools/jours.js` commun, textes dans la page.
- **Tests** : 2026 = liste de gov.uk pour les trois régions (8, 10, 10 jours) ; jours de remplacement (Boxing Day
  2026 le lundi 28 décembre) ; jours ouvrés 2026 (253 en Angleterre, 251 en Écosse et en Irlande du Nord) ; années non
  couvertes refusées ; la version française inchangée.

## 7. Réalisation, Royaume-Uni (29/10/2026)

- Règle `bank_holidays` (`data/rules/uk.json`, renommée `public_holidays` au § 9) : liste de GOV.UK pour 2024 à 2028, trois régions, avec le nom de chaque
  jour férié et les jours de remplacement ; recopiée depuis la lecture du 29/10/2026 (`bank-holidays.json`), le site
  gov.uk n'étant pas joignable directement depuis l'environnement de travail ; contrôles automatiques : chaque date en
  semaine, dans l'ordre, Good Friday = Pâques − 2 (même calcul que la France).
- Moteur : liste publiée ou calcul selon les règles, années couvertes données par les règles (`years`), lieux
  (`zones`), recherche des jours fériés année par année ; un délai qui tombe une année non couverte est refusé.
- Script `tools/jours.js` commun aux deux pays : textes, pluriels (« 0 jour » en français, « 0 days » en anglais),
  séparateur de liste (« ; » en anglais, les dates abrégées contenant une virgule), saisie enregistrée par pays.
- Page `content/uk/working-days-calculator.html` (menu *Pricing*) ; calculateur de *day rate* : aide « In 2026: 8 bank
  holidays on weekdays in England and Wales » et lien, valeur par défaut inchangée (8).
- Tests : 3 tests de plus (13 au total) ; erreurs réintroduites dans les parties nouvelles du moteur : 17, dont 12
  détectées au premier passage ; 3 tests ajoutés ; 2 se sont révélées équivalentes (lieu par défaut choisi deux fois,
  tri d'années déjà dans l'ordre) et le code redondant a été retiré ; parcours navigateur britannique sur ordinateur,
  tablette et mobile, audit d'accessibilité sans erreur.

## 8. États-Unis (spécification, 29/10/2026)

Même outil, en anglais américain : *Business days and federal holidays calculator* (menu *Pricing*, après le taux
horaire).

| Règle | Source | Usage |
|---|---|---|
| Jours fériés fédéraux (5 U.S.C. 6103) : New Year's Day, Birthday of Martin Luther King, Jr., Washington's Birthday, Memorial Day, Juneteenth National Independence Day, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving Day, Christmas Day (11 par an) ; tombant un samedi, jour observé le vendredi précédent ; un dimanche, le lundi suivant (« for most Federal employees ») ; Inauguration Day réservé à la région de Washington ; les États et les entreprises peuvent observer d'autres jours | OPM, *Federal Holidays* (tableaux par année, de 2011 à 2030, lus le 29/10/2026) ; `public_holidays` (nouvelle, `data/rules/us.json`) | Liste des jours fériés ; jours ouvrés (*business days*) |

- **Liste publiée, dates observées** : l'outil reprend les dates du tableau d'OPM (jour observé), de 2024 à 2030 ; une
  date observée peut tomber l'année précédente (New Year's Day 2028 observé le vendredi 31 décembre 2027) : elle est
  rangée à sa vraie date. Inauguration Day n'est pas compté (région de Washington seulement, et seulement pour les
  employés fédéraux).
- **Une seule zone** (*Federal holidays*) ; la page rappelle que les États, les clients et les banques peuvent fermer
  d'autres jours.
- **Modes** : *business days* et *calendar days*.
- **Calculateur de taux horaire** : aide « In 2026: 11 federal holidays on weekdays » et lien ; valeur par défaut
  inchangée (10).
- **Même règle pour les deux pays** : la liste publiée s'appelle désormais `public_holidays` (Royaume-Uni compris), lue
  par le moteur commun.
- **Tests** : 2026 = tableau d'OPM (11 jours, Independence Day observé le vendredi 3 juillet) ; 2027 (Juneteenth le 18
  juin, Independence Day le 5 juillet, Christmas Day le 24 décembre, New Year's Day 2028 le 31 décembre 2027) ; jours
  ouvrés 2026 (250) ; jours de la semaine des dates (vendredi ou lundi pour les dates déplacées).

## 9. Réalisation, États-Unis (29/10/2026)

- Règle `public_holidays` (`data/rules/us.json`) : tableaux d'OPM de 2024 à 2030 (11 jours par an, Inauguration Day
  retiré), rangés à l'année de la date observée (2027 : 12 jours ; 2028 : 10) ; `substitute` = jour observé à une autre
  date que la date légale (samedi → vendredi, dimanche → lundi). La règle britannique `bank_holidays` porte désormais le
  même nom : le moteur lit une seule forme de liste publiée.
- Moteur : chaque jour férié porte `substitute` (toujours faux en France) ; la page ajoute son libellé : « (substitute
  day) » au Royaume-Uni (celui de GOV.UK), « (observed) » aux États-Unis. Une seule zone (`federal`), dans un champ
  caché : pas de liste à un seul choix ; une phrase sous la période rappelle que l'État, les clients et la banque
  peuvent fermer d'autres jours.
- Page `content/us/business-days-calculator.html` (menu *Pricing*, après le taux horaire), FAQ dont chaque date est
  vérifiée par les tests ; calculateur de taux horaire : aide « In 2026: 11 federal holidays on weekdays » et lien,
  valeur par défaut inchangée (10). Tableau des jours fériés : date sur une ligne (mobile).
- Tests : 4 tests de plus (17 au total), dont un contrôle de la transcription : les 77 dates sont recalculées à partir
  des règles de 5 U.S.C. 6103 (dates fixes avec report, n-ième lundi ou jeudi du mois) et comparées à la liste ; erreurs
  réintroduites dans le moteur (5) et dans les données (4) : toutes détectées ; libellé « (observed) » retiré du script :
  détecté par le parcours navigateur ; parcours américain sur ordinateur, tablette et mobile, audit d'accessibilité
  sans erreur.

## 10. Canada (spécification du 12/11/2026, réalisée le 13/11/2026, § 10.1)

Même outil, en anglais et en français (*Business days calculator* / « Jours ouvrables »). canada.ca refusant la lecture,
les jours fériés sont pris **dans les lois** (fédérale et provinciales), lues avec l'outil « Lire une source officielle ».
Une **zone par juridiction** : fédéral (entreprises de compétence fédérale) et chaque province ou territoire, au choix ;
dates **légales** seulement (un jour de remplacement accordé aux salariés quand un férié tombe un jour de repos dépend de
la loi et de l'employeur : signalé, non compté).

Lu le 12/11/2026 :

| Juridiction | Texte | Jours fériés |
|---|---|---|
| Fédéral | Code canadien du travail, art. 166, « general holiday » | New Year's Day, Good Friday, Victoria Day, Canada Day, Labour Day, National Day for Truth and Reconciliation (« observed on September 30 »), Thanksgiving Day, Remembrance Day, Christmas Day, Boxing Day ; plus les jours substitués selon l'art. 195 |
| Fédéral | Loi instituant des jours de fête légale (L.R.C. 1985, ch. H-5), art. 2 à 4 | Canada Day : 1er juillet, ou 2 juillet si le 1er est un dimanche ; Remembrance Day : 11 novembre ; Victoria Day : « The first Monday immediately preceding May 25 » ; la Journée de la vérité et de la réconciliation n'y figure pas |
| Colombie-Britannique | Employment Standards Act, art. 1, « statutory holiday » | New Year's Day, Family Day, Good Friday, Victoria Day, Canada Day, British Columbia Day, Labour Day, National Day for Truth and Reconciliation, Thanksgiving Day, Remembrance Day, Christmas Day, et tout jour prévu par règlement |
| Manitoba | Employment Standards Code (C.P.L.M. c. E110), art. 21(1), « general holiday » | New Year's Day, Louis Riel Day (« the third Monday in February »), Good Friday, Victoria Day, July 1, Labour Day, Orange Shirt Day (National Day for Truth and Reconciliation), Thanksgiving Day, Christmas Day, et tout jour désigné par règlement |
| Ontario | Employment Standards Act, 2000, art. 1, « public holiday » (version Word d'ontario.ca, la page web étant construite par JavaScript ; SHA-256 63d227ab…a638) | New Year's Day, Family Day (« the third Monday in February »), Good Friday, Victoria Day, Canada Day, Labour Day, Thanksgiving Day, Christmas Day, December 26, et tout jour prescrit |
| Alberta | Employment Standards Code (RSA 2000, c. E-9), art. 25 (PDF du King's Printer, SHA-256 b5242ba6…e001) | New Year's Day, Alberta Family Day, Good Friday, Victoria Day, Canada Day, Labour Day, Thanksgiving Day, Remembrance Day, Christmas Day, et tout jour désigné par règlement ou par accord |
| Québec | Loi sur les normes du travail (RLRQ, c. N-1.1), art. 60 (SHA-256 ac48c12f…a8dd) | 1er janvier ; « le Vendredi saint ou le lundi de Pâques, au choix de l'employeur » ; « le lundi qui précède le 25 mai » ; « le 1er juillet ou, si cette date tombe un dimanche, le 2 juillet » ; « le 1er lundi de septembre » ; « le deuxième lundi d'octobre » ; 25 décembre ; Loi sur la fête nationale (c. F-1.1), art. 1 et 2 : « Le 24 juin est un jour férié et chômé » ; « lorsque cette date tombe un dimanche, le 25 juin est, à l'égard du salarié pour qui le dimanche n'est pas normalement un jour ouvrable, un jour chômé » |
| Nouvelle-Écosse | Page « Holiday Pay » du ministère (novascotia.ca) | « six holidays with pay: New Year's Day, Nova Scotia Heritage Day, Good Friday, Canada Day, Labour Day, and Christmas Day » ; « A separate law covers Remembrance Day » (texte de la loi à lire) ; Heritage Day : décret pris en vertu du February Holiday Act (S.N.S. 2013, c. 35), N.S. Reg. 9/2015 : « the third Monday in February in 2015 and in each subsequent year » |
| Nouveau-Brunswick | Employment Standards Act (c. E-7.2), art. 1, « public holiday » (laws.gnb.ca, SHA-256 027c0e06…81ca0) | New Year's Day, Family Day, Good Friday, Canada Day, New Brunswick Day, Labour Day, Remembrance Day, Christmas Day, et les jours substitués selon la loi ; « Family Day » : « the third Monday in February » (même loi) ; New Brunswick Day Act (2014, c.121), art. 1 : « the first Monday in August » |
| Terre-Neuve-et-Labrador | Labour Standards Act (RSNL 1990, c. L-2), art. 14(1), « public holiday » (assembly.nl.ca) | New Year's Day, Good Friday, Remembrance Day, Memorial Day, Labour Day, Christmas Day, et les jours proclamés par le lieutenant-gouverneur en conseil ; date de Memorial Day à lire |
| Île-du-Prince-Édouard | Employment Standards Act (E-6.3, consolidée au 30/06/2026, PDF de princeedwardisland.ca, SHA-256 56b44f65…db08), art. 1(n), « paid holiday » ; la page « Paid Holidays » est construite par JavaScript | New Year's Day, Islander Day, Good Friday, July 1, Labour Day, National Day for Truth and Reconciliation (« observed on September 30 »), Remembrance Day, Christmas Day, et tout jour prescrit ; date d'Islander Day à relire |
| Territoires du Nord-Ouest | Foire aux questions du ministère (ece.gov.nt.ca), renvoi à l'art. 22 de l'Employment Standards Act | New Year's Day, Good Friday, Victoria Day, National Aboriginal Day, Canada Day, First Monday in August, Labour Day, National Day for Truth and Reconciliation, Thanksgiving Day, Remembrance Day, Christmas Day (11) ; Easter Monday et Boxing Day ne sont pas des jours fériés de la loi |
| Yukon, Nunavut | yukon.ca et nunavutlegislation.ca | Lecture refusée à l'outil (403) le 12/11/2026, non contournée : essayer laws.yukon.ca et la loi du Nunavut publiée par gov.nu.ca |
| Saskatchewan | Page « Public (Statutory) Holidays » (saskatchewan.ca, 6 288 caractères) | La liste n'apparaît pas dans le texte lu : lire la loi (publications.saskatchewan.ca) |

À lire : dates de Labour Day, Thanksgiving Day, Family Day, New Brunswick Day et Memorial Day (lois
d'interprétation et lois provinciales), Islander Day ; Saskatchewan (loi) ; Nouvelle-Écosse (Remembrance Day Act) ;
Yukon et Nunavut (autres sites officiels ; le communiqué de gov.nu.ca de juin 2020 n'a pas été lu, échec de la lecture).

Lu le 13/11/2026 : **Loi d'interprétation fédérale** (L.R.C. 1985, ch. I-21), art. 35, « holiday » (SHA-256
5fd81300…1d86) : « the first Monday in September, designated Labour Day » ; « National Day for Truth and Reconciliation,
which is observed on September 30 » ; l'Action de grâce n'y a pas de date (« any day appointed by proclamation to be
observed as a day of … thanksgiving ») : la date (deuxième lundi d'octobre) vient de la Loi sur les normes du travail
du Québec et, ailleurs, d'une proclamation non lue (à signaler). **Colombie-Britannique** : la page officielle
« Statutory holidays » (gov.bc.ca) affiche une liste datée (celle de 2023 : B.C. Day le lundi 7 août, Labour Day le
lundi 4 septembre, Thanksgiving le lundi 9 octobre…) : contrôle possible de la transcription. **Bloqués** :
publications.saskatchewan.ca (certificat refusé par l'outil, non contourné), gov.nu.ca (403), alberta.ca (adresse de la
page des jours fériés à retrouver, 404).

Lu le 13/11/2026 (nuit) : **Islander Day Act** (Île-du-Prince-Édouard, c. I-10.01, consolidé au 15/05/2009,
princeedwardisland.ca) : « the third Monday in February in each year shall be a public holiday … “Islander Day” ».
**Terre-Neuve-et-Labrador** : le Commemoration Day Act (dimanche du 1er juillet ou le plus proche) ne date pas le
Memorial Day de la Labour Standards Act : date à trouver (liste du gouvernement ou règlement). **Alberta** : la page
open.alberta.ca/publications/f04p5 et le PDF F04P5 ne sont pas le Family Day Act (texte sans « Monday ») : référence à
retrouver. **Territoires du Nord-Ouest** : le PDF de la loi redirige vers gnwt.ca, domaine du gouvernement territorial,
désormais accepté par l'outil de lecture.

Lu le 13/11/2026 (matin) : **Alberta**, page officielle « Alberta general holidays » (alberta.ca, SHA-256
e2bd71a1…864c) : tableau daté des 9 jours fériés pour 2026, 2027 et 2028 avec leur règle — New Year's Day (1er janvier) ;
Alberta Family Day, « Third Monday in February » (16/02/2026, 15/02/2027, 21/02/2028) ; Good Friday, « Friday before
Easter » (03/04/2026, 26/03/2027, 14/04/2028) ; Victoria Day, « Monday before May 25 » (18/05/2026, 24/05/2027,
22/05/2028) ; Canada Day, « July 1, except when it falls on a Sunday, then it is July 2 » ; Labour Day (07/09/2026,
06/09/2027, 04/09/2028) ; Thanksgiving Day, « Second Monday in October » (12/10/2026, 11/10/2027, 09/10/2028) ;
Remembrance Day (11 novembre) ; Christmas Day (25 décembre) : **contrôle de transcription** pour 2026 à 2028 et règle de
l'Action de grâce confirmée par une source provinciale. **Terre-Neuve-et-Labrador**, guide officiel « Your Rights at
Work » (gov.nl.ca) : « Memorial Day (Canada Day) » parmi les six jours fériés, donc le 1er juillet. **À lire encore** :
date de la National Aboriginal Day aux Territoires du Nord-Ouest (la page gnwt.ca atteinte ne contient pas la loi) ;
Remembrance Day Act de Nouvelle-Écosse (non trouvé dans la page lue).

Constat du 12/11/2026 (soir) : plusieurs lois nomment les fêtes sans les dater (Interpretation Act de la
Colombie-Britannique, art. 29 : « holiday » comprend Family Day, British Columbia Day, December 26… sans date ; loi de
l'Île-du-Prince-Édouard : Islander Day sans date). Pour ces fêtes, prendre la date dans la loi propre à la fête quand
elle existe (comme le New Brunswick Day Act ou le décret néo-écossais), sinon dans la liste datée publiée par le
gouvernement de la province (page officielle des jours fériés de l'année), qui servira aussi de contrôle de
transcription, comme le tableau d'OPM aux États-Unis.

Choix de réalisation envisagés (à confirmer par la décision lors de la réalisation) : une zone par juridiction ; au
Québec, deux zones (« Vendredi saint » et « lundi de Pâques »), la loi laissant le choix à l'employeur ; dates calculées
par règle (jour fixe, n-ième lundi, lundi précédant le 25 mai, Pâques) et contrôlées par un test, comme aux États-Unis ;
jours de remplacement : seulement ceux que la loi fixe pour tous (fête du Canada le 2 juillet au Québec et au fédéral,
25 juin au Québec), les autres étant propres à chaque salarié ou employeur.

Lu le 13/11/2026 (matin, suite) : **Nouvelle-Écosse**, Remembrance Day Act (R.S., c. 396, consolidé au 27/10/2020,
nslegislature.ca, SHA-256 ed90764e…be26c) : « Remembrance Day » est « the whole of the eleventh day of November »
(art. 2) ; « no person shall, on Remembrance Day, (a) sell, offer for sale or purchase any goods or real property; or
(b) for gain or reward engage as employer or employee in any industry » (art. 3), sauf les exceptions de l'art. 4
(hôpitaux, hôtellerie, stations-service, commerces de trois personnes au plus…). **Territoires du Nord-Ouest** :
National Indigenous Peoples Day Act (SNWT 2021, c. 15, gnwt.ca, SHA-256 38258b4a…4d11), art. 1 : « June 21 of each
year shall be known as "National Indigenous Peoples Day" and shall be observed as a public holiday » (remplace la
National Aboriginal Day) ; Employment Standards Act, art. 22(1) (SHA-256 ad2f707b…80a0, bilingue) : 11 jours, dont
« the first Monday in August » et la Journée nationale de la vérité et de la réconciliation « observed on
September 30 ». **Colombie-Britannique** : la page « Statutory holidays » (mise à jour le 01/01/2026, SHA-256
eef31e4d…2c8d) donne les tableaux datés de **2023 à 2027** (11 jours par an) et précise : « Easter Sunday, Easter
Monday and Boxing Day are not statutory holidays in B.C. ». **Code canadien du travail en français**, art. 166
(SHA-256 b4d7885b…c3c5) : « Le 1er janvier, le vendredi saint, la fête de Victoria, la fête du Canada, la fête du
Travail, la Journée nationale de la vérité et de la réconciliation, qui a lieu le 30 septembre, le jour de l'Action de
grâces, le jour du Souvenir, le jour de Noël et le lendemain de Noël ». La page de la CNESST sur les jours fériés a
refusé l'outil (403, non contournée).

### 10.1 Réalisation (13/11/2026)

- **Règle** `statutory_holidays` de `data/rules/ca.json` : douze zones (fédéral ; Alberta, Colombie-Britannique,
  Manitoba, Nouveau-Brunswick, Terre-Neuve-et-Labrador, Nouvelle-Écosse, Territoires du Nord-Ouest, Ontario,
  Île-du-Prince-Édouard ; Québec « Vendredi saint » et Québec « lundi de Pâques »), années 2024 à 2030. Chaque fête est
  enregistrée avec **la règle que pose sa loi** (date fixe, écart à Pâques, n-ième lundi d'un mois, lundi qui précède le
  25 mai) et le moteur calcule les dates : 8 Ko dans chaque page canadienne, au lieu de quelque 80 Ko pour une liste
  datée de sept ans, et une seule source de vérité (la règle de la loi). Noms anglais et français.
- **Reports** : seulement ceux que la loi fixe pour tous : fête du Canada le 2 juillet quand le 1er est un dimanche
  (loi fédérale, Québec, Alberta ; appliqué là où la loi nomme « Canada Day ») ; 25 juin chômé en plus du 24 juin
  quand celui-ci tombe un dimanche (Québec). Le Manitoba et l'Île-du-Prince-Édouard nomment le « July 1 » et
  Terre-Neuve-et-Labrador le Memorial Day du 1er juillet : pas de report. Prochain cas : 2029.
- **Nouvelle-Écosse** : le 11 novembre compté comme jour non travaillé (loi de fermeture, avec exceptions), signalé
  sous le choix de la province.
- **Action de grâces** : deuxième lundi d'octobre (loi du Québec, tableau de l'Alberta) ; la date fédérale est fixée
  par proclamation (non lue) : signalé en bas de page.
- **Absents** : Saskatchewan, Yukon et Nunavut (textes illisibles par l'outil, non contournés), dits sur la page.
- **Moteur** : `engines/jours.js` (`statutory`, `nthMonday`, `mondayBefore`, option `lang` pour les noms) ; écran
  commun (`tools/jours.js`, note propre à la zone sous le choix de la province).
- **Pages** : *Business days calculator* (/ca/, Ontario par défaut) et « Calcul des jours ouvrables » (/ca/fr/, Québec
  « Vendredi saint » par défaut ; jours ouvrables et jours civils), menu « Pricing / Prix » ; lien depuis le champ
  « jours fériés » des calculateurs de taux horaire.
- **Tests** : 4 tests unitaires : dates calculées = tableaux datés de la Colombie-Britannique (2024 à 2027) et de
  l'Alberta (2026 à 2028) ; chaque fête de chaque zone et de chaque année recalculée sans le moteur à partir du texte
  de la loi (jour du mois et jour de la semaine) ; nombres de jours ouvrables de 2026 ; reports de 2029 ; noms
  français ; pages, menu et chiffres de la FAQ tirés du moteur. 15 erreurs réintroduites dans le moteur : 15
  détectées (la quinzième après l'ajout d'un cas de règles dans le désordre). Parcours navigateur des deux pages
  (accessibilité comprise) et des 74 pages canadiennes ; captures relues sur ordinateur et mobile.

### 10.2 Saskatchewan (13/11/2026, matin)

La loi (*The Saskatchewan Employment Act*) reste illisible (certificat de publications.saskatchewan.ca refusé par
l'outil), mais la page officielle « List of Saskatchewan Public Holidays » (saskatchewan.ca, SHA-256 13cc3882…0d0d)
l'est : « There are 10 public (statutory) holidays per year in Saskatchewan » ; dates de 2026 : New Year's Day
(1er janvier), Family Day (16 février), Good Friday (3 avril), Victoria Day (18 mai), Canada Day (1er juillet),
Saskatchewan Day (3 août), Labour Day (7 septembre), Thanksgiving (12 octobre), Remembrance Day (11 novembre),
Christmas Day (25 décembre). Dimanche : « Where businesses are normally closed on Sunday, and New Year's Day,
Christmas Day or Remembrance Day fall on a Sunday, the following Monday is observed as a public holiday » ; fête du
Canada selon la loi fédérale (2 juillet quand le 1er est un dimanche) ; « When a public holiday falls on a Saturday,
it is not observed on a different day » ; la Journée nationale de la vérité et de la réconciliation « is not a public
holiday under The Saskatchewan Employment Act ».

Réalisation : zone `sk` de la règle `statutory_holidays` (Family Day : troisième lundi de février ; Saskatchewan
Day : premier lundi d'août, comme sur la liste de 2026, la règle de la loi n'étant pas lue : signalé dans la note) ;
le lundi qui suit le jour de l'An, le jour du Souvenir ou Noël tombé un dimanche est compté, comme le 25 juin au
Québec (prochain cas : lundi 12 novembre 2029). Test : dates de 2026 = liste officielle ; règle du dimanche
recalculée sans le moteur. **Yukon** (yukon.ca et laws.yukon.ca : 403) et **Nunavut** (gov.nu.ca, www.gov.nu.ca et
nunavutlegislation.ca : 403) restent absents, sans contournement.

