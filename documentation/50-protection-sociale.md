# 50. Protection sociale de l'indépendant : arrêt maladie et chômage (France d'abord)

Besoins « Arrêt maladie, maternité, accident » et « Chômage et fin d'activité » de [31](31-vision-plateforme.md)
(§ 3.8), étape 6 de [31](31-vision-plateforme.md) § 5. Spécification écrite le 31/10/2026 (décision D53). France
d'abord ; Royaume-Uni, États-Unis et Canada ensuite (sources à lire : *Employment and Support Allowance* et
*Maternity Allowance* sur GOV.UK, assurance invalidité de certains États et prestations spéciales de l'assurance
emploi sur canada.ca, encore illisible).

## 1. Besoin

Un indépendant qui tombe malade ou qui doit cesser son activité se demande s'il sera indemnisé, à partir de quand,
combien et pendant combien de temps. Les réponses dépendent de l'activité (artisanale ou commerciale, libérale), du
revenu, de l'ancienneté et de la cause de la cessation. Les pages officielles sont éparses (service-public.fr,
Assurance maladie, Urssaf, France Travail) ; l'outil rassemble les règles lues, les explique et chiffre une estimation.

## 2. Règles (sources lues le 31/10/2026, annexe)

**Arrêt maladie** (règle `ij_maladie_independants`, fiche F36708 de service-public, vérifiée le 08/01/2026) :
- affiliation à la Sécurité sociale des indépendants depuis au moins **12 mois** sans interruption ;
- **délai de carence de 3 jours** : rien n'est versé pour les 3 premiers jours (exemple officiel : arrêt du 13 au 25
  novembre, indemnités du 16 au 25 novembre) ;
- *activité artisanale ou commerciale* : indemnité journalière égale au **revenu d'activité annuel ÷ 730**, dans la
  limite de 48 060 € de revenu (soit **65,84 €** par jour au plus) ;
- *activité libérale* : **revenu d'activité annuel moyen ÷ 730**, dans la limite de 144 180 € (soit **197,50 €** par
  jour au plus) ; **90 jours** au plus pour l'arrêt ;
- la fiche **ne concerne pas le micro-entrepreneur** (bandeau « La page que vous consultez ne concerne pas les
  micro-entrepreneurs ») : la version qui le vise n'est pas lisible par l'outil (bouton du site, sans adresse), la
  recherche du site demande JavaScript, et les sites de l'Assurance maladie et de l'Urssaf refusent la lecture.

Le plafond de 48 060 € est le plafond annuel de la sécurité sociale 2026 (règle `pass_2026`) ; 144 180 € en est le
triple. La fiche ne dit pas sur combien d'années est calculé le revenu, s'il existe un revenu minimum, ni la durée
maximale d'indemnisation d'un artisan ou d'un commerçant ; l'outil le dit et renvoie à la caisse d'assurance maladie.

**Décision D53** : l'outil ne chiffre l'arrêt maladie que pour l'entrepreneur individuel au réel. Pour un
micro-entrepreneur, il explique que ses règles n'ont pas été vérifiées, sans montant : reprendre la définition du
revenu publiée pour le chômage (chiffre d'affaires moins l'abattement) serait une supposition, et une condition propre
au micro-entrepreneur (revenu minimum, années retenues) changerait tout pour un petit chiffre d'affaires.

**Chômage** (règle `ati_independants`, fiche F23994 vérifiée le 01/04/2026, qui vise les micro-entreprises et les
entrepreneurs individuels ; France Travail, site de l'ATI) : allocation des travailleurs indépendants (ATI, Code du
travail, art. L5424-24 à L5424-28 et R5424-70 à D5424-76) si l'activité cesse à cause d'une **liquidation judiciaire**,
d'un **redressement judiciaire**, ou parce qu'elle **n'était pas économiquement viable**, et si :
- activité non salariée exercée **sans interruption pendant au moins 2 ans dans une seule et même entreprise** ;
- inscription à France Travail et recherche d'emploi ; après un jugement, inscription **dans un délai de 12 mois à
  partir de la date** du jugement (liquidation ou redressement ; pas de délai indiqué pour l'activité non viable) ;
- revenu **supérieur à 10 000 €** sur l'une des 2 années d'activité non salariée (micro-entrepreneur : chiffre
  d'affaires moins l'abattement fiscal, commerciale 71 %, artisanale 50 %, libérale 34 %) ;
- ressources personnelles **inférieures à 651,69 € par mois** pour une seule personne ;
- activité non viable : **baisse d'au moins 30 % des revenus**, attestée par un tiers de confiance (attestation :
  nom, Siret, affiliation, durée de l'activité, revenus par année, baisse en montant et en pourcentage ; pour une
  société à l'impôt sur les sociétés, résultat fiscal des 2 derniers exercices).

La demande se fait auprès de France Travail, dans l'espace personnel, avec la copie de la déclaration de cessation
d'activité (et l'attestation). Les activités concernées sont listées par France Travail.

Montant : **26,30 € par jour** (forfait), diminué si le revenu moyen des 2 dernières années civiles est inférieur,
sans descendre sous **19,73 €** (Mayotte : 13,15 € à 19,73 €) ; versé **182 jours** (environ 6 mois), non
renouvelable, sans différé ni délai d'attente. La formule exacte de la réduction n'est pas publiée sur les pages lues :
l'outil donne la fourchette et renvoie à la fiche F23994 (qui donne accès à un simulateur du montant) et au site
de France Travail consacré à l'ATI.

## 3. Outils

Deux pages en France, menu « Impôts et gestion » (dont la description devient « Cotisations, impôts, échéances,
frais, retraite et protection sociale ») :

1. **Arrêt maladie de l'indépendant : calcul des indemnités journalières** (`/fr/arret-maladie-independant/`).
   Saisie : activité (artisan ou commerçant au réel, profession libérale au réel, micro-entrepreneur), revenu
   annuel (annuel moyen en libéral), premier et dernier jour de l'arrêt, affiliation depuis au moins 12 mois.
   Résultat : total estimé, revenu retenu (plafonné), indemnité par jour (au centime, jamais plus que le maximum
   publié), durée de l'arrêt, carence, jours indemnisés (90 jours d'arrêt au plus en libéral, soit 87 jours payés),
   premier et dernier jour indemnisés ; avertissements (plafond, limite des 90 jours, affiliation, estimation).
   Micro-entrepreneur : pas de montant, explication (D53).
2. **Chômage de l'indépendant : avez-vous droit à l'ATI ?** (`/fr/chomage-independant-ati/`). Saisie : cause de la
   cessation (et date du jugement, facultative ; baisse de 30 % attestée pour une activité non viable), ancienneté
   dans l'entreprise, activité et régime, revenus (ou chiffres d'affaires) des 2 dernières années, ressources
   mensuelles, Mayotte. Résultat : conditions remplies ou non (chacune expliquée, revenu retenu au centime s'il n'est
   pas rond), montant compris entre 19,73 € et 26,30 € par jour, total pour 182 jours, démarche (date limite
   indicative d'inscription : 12 mois après le jugement), liens vers la liste des activités et le site de France
   Travail.

Moteur commun `engines/protection-fr.js` (fonctions pures), chiffres lus dans les règles, textes dans la page.

## 4. Tests

Moteur : plafonds, arrondi, carence (arrêt de moins de 4 jours), 90 jours en libéral, refus du micro-entrepreneur
pour l'arrêt maladie, affiliation de moins de 12 mois, dates invalides ; ATI : chaque condition seule, cumul, bornes
(10 000 € exactement : refusé, la fiche dit « supérieur » ; 651,69 € : refusé), revenu du micro-entrepreneur
(abattement de chaque activité, minimum de 305 €), délai d'inscription (fin de mois, 29 février). Pages : chiffres
cités égaux aux règles, exemple recalculé par le moteur, seuil de chiffre d'affaires cité (15 152 € en libéral)
vérifié par le moteur ; parcours navigateur (accessibilité, trois largeurs), captures relues.

## 5. Réalisation (31/10/2026)

- Moteur `src/assets/engines/protection-fr.js` (`OFE.protectionFR` : `revenu`, `ijMaladie`, `ati`) ; scripts
  `tools/fr-arret-maladie.js` et `tools/fr-ati.js` ; pages `content/fr/arret-maladie-independant.html` (id
  `sick-pay`) et `content/fr/chomage-independant-ati.html` (id `unemployment`), ajoutées au menu « Impôts et
  gestion » ; lien depuis le guide des assurances (prévoyance).
- Règles `ij_maladie_independants` et `ati_independants` (`data/rules/fr.json`), notes complètes des lectures.
- Tests : `tests/unit/protection-fr.test.mjs` (14 tests, dont la cohérence des deux pages) ; 18 mutants du moteur sur 19
  détectés (le 19e est équivalent : le revenu plafonné avant la division donne la même indemnité que le maximum
  publié) ; parcours navigateur des deux pages dans `tests/e2e/verifier.mjs` (exemple officiel, plafonds, limite des
  90 jours, carence, affiliation, saisies refusées, micro-entrepreneur ; ATI : chaque cause, chaque condition,
  Mayotte, montant au centime), 6 mutants des scripts détectés (un 7e, équivalent, a conduit à simplifier le
  script).
- Relecture des captures : intitulés des listes raccourcis (coupés sur mobile), dates de la période indemnisée sur deux
  lignes (débordement à 390 px), montant de l'ATI sans « par jour » dans le gros chiffre.
- À faire : arrêt maladie du micro-entrepreneur dès que ses règles sont lues (Assurance maladie, Urssaf) ; maternité,
  paternité, accident ; prévoyance et mutuelle ; Royaume-Uni (*Employment and Support Allowance*, *Maternity
  Allowance*), États-Unis, Canada.

## Annexe : sources lues (31/10/2026, outil « Lire une source officielle »)

| Source | Empreinte SHA-256 | Contenu relevé |
|---|---|---|
| Service-public, F36708 « Tout savoir sur la protection sociale de l'entrepreneur individuel » (vérifiée le 08/01/2026 ; « ne concerne pas les micro-entrepreneurs ») | ba7787e6…38b9 | Maladie : 12 mois d'affiliation, carence de 3 jours, revenu ÷ 730 plafonné (48 060 € et 65,84 € en artisanal ou commercial ; 144 180 € et 197,50 €, 90 jours au plus en libéral) ; exemple du 13 au 25 novembre ; ATI de 19,73 € à 26,30 € par jour, 182 jours ; Code de la sécurité sociale, art. L621-1 à L623-4 et L631-1 à L635-4-1 |
| Service-public, F23994 « Un travailleur indépendant a-t-il droit à une assurance chômage ? » (vérifiée le 01/04/2026 ; vise les micro-entreprises et les entrepreneurs individuels) | variable à chaque lecture (éléments changeants de la page) ; texte de 20 510 caractères | Liquidation et redressement judiciaires : 2 ans dans la même entreprise, inscription dans les 12 mois à partir de la date du jugement, revenu supérieur à 10 000 € sur l'une des 2 années, ressources inférieures à 651,69 € par mois pour une seule personne ; activité non viable : mêmes conditions, baisse d'au moins 30 % attestée par un tiers de confiance (contenu de l'attestation) ; forfait 26,30 €, minimum 19,73 €, Mayotte 19,73 € et 13,15 €, 182 jours ; micro-entrepreneur : chiffre d'affaires moins l'abattement (71 %, 50 %, 34 %) ; demande à France Travail avec la déclaration de cessation ; Code du travail, art. L5424-24 à L5424-28 et R5424-70 à D5424-76 ; liste des activités sur chomage-independant.francetravail.fr |
| France Travail, site de l'ATI, « Le montant d'indemnisation » (© 1er juillet 2025) | 049f5b87…e887 | Montant individualisé selon les revenus des 2 années civiles précédant la cessation, entre 19,73 € et 26,30 € par jour (Mayotte : 13,15 € à 19,73 €), 182 jours non renouvelables, sans différé ni délai d'attente, à compter de l'inscription |
| France Travail, site de l'ATI, accueil | cc8ab089…60fa5 | Règles applicables aux fins d'activité à partir du 1er avril 2022 |
| Ameli (Assurance maladie) | — | Refus de l'outil de lecture (réponse 403) |
| Urssaf, « Indépendant : vos prestations santé » ; autoentrepreneur.urssaf.fr (« L'essentiel du statut », « Ma protection sociale ») | — | Échec de la lecture (31/10/2026) |
| Service-public, recherche « micro-entrepreneur arrêt maladie » | — | Résultats affichés par JavaScript : « Aucun résultat » pour l'outil |
