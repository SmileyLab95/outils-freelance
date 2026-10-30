# 46. Conditions générales aux États-Unis (*terms and conditions*)

Besoin P3 de [02](02-besoins-clients.md) (« générateur de CGV »), étape 6 de [31](31-vision-plateforme.md) § 5. La
France ([40](40-cgv.md)) et le Royaume-Uni ([45](45-cgv-royaume-uni.md)) ont leur générateur ; les États-Unis suivent
(décision D39 : chaque pays après la lecture de ses propres sources). Spécification avant le code, 30/10/2026, après
la lecture des sources ci-dessous.

## 1. Besoin

Un indépendant établi aux États-Unis (*sole proprietor*, LLC, *corporation* ou *partnership*) qui vend des prestations
de services veut des *terms and conditions* à joindre à ses devis et propositions : adaptées à sa clientèle
(entreprises, particuliers ou les deux), conformes aux lois qui imposent un **contrat écrit** aux donneurs d'ordre
(*Freelance Isn't Free*), avec le **droit d'annulation de trois jours ouvrés** quand il vend à un particulier chez lui ou
hors de son établissement, et la liste de ce qu'il reste à faire. Le générateur ne remplace pas un avocat (*attorney*)
et la page le dit.

**Champ** : prestations de services, droit d'un des 50 États ou du District de Columbia (au choix de l'utilisateur).
**Hors champ** (signalé sur la page) : vente de biens (règles propres, dont le *Uniform Commercial Code*), abonnements et
contrats reconduits automatiquement (lois des États), services financiers, professions soumises à licence et métiers du
bâtiment (règles propres des États, exclus de la loi de l'État de New York), clients établis hors des États-Unis, et
les lois particulières des États sur la vente hors établissement, que la règle fédérale n'écarte pas quand elles sont
plus protectrices.

## 2. Règles

Lues le 30/10/2026 avec l'outil « Lire une source officielle » ; empreintes SHA-256 dans les notes des règles
(`data/rules/us.json`). Pas de loi fédérale générale sur les conditions générales de services : chaque règle ci-dessous
a un champ précis.

| Règle | Source | Usage |
|---|---|---|
| **Vente hors établissement à un particulier** (*Cooling-Off Rule*) : services achetés surtout pour un usage personnel, familial ou domestique, accord donné ailleurs qu'au lieu d'activité du vendeur après une sollicitation personnelle (même à l'invitation de l'acheteur), prix d'au moins **25 $ au domicile** de l'acheteur ou **130 $ ailleurs** ; l'acheteur peut annuler **jusqu'à minuit du troisième jour ouvré** après la transaction (jour ouvré : tous les jours sauf le dimanche et les jours fériés fédéraux) ; à la signature : copie du contrat ou reçu (date, nom et adresse du vendeur, même langue que la présentation orale), phrase type en gras près de la signature, **formulaire « Notice of Cancellation » en double**, rempli (nom, adresse, date de la transaction, date limite qui ne peut être antérieure au 3e jour ouvré), information orale ; ni renonciation ni présentation trompeuse ; **remboursement sous 10 jours ouvrés** ; exclusions (vente entièrement par courrier ou téléphone, urgence avec déclaration manuscrite, réparation demandée par l'acheteur…) ; les lois des États plus protectrices restent applicables | 16 CFR Part 429 (eCFR, lu en entier) ; `us_ftc_cooling_off` et `us_ftc_cancellation_notice` (nouvelles) | Article « Cancelling a sale made away from our place of business », annexe « Notice of Cancellation », date limite calculée, contrôles |
| Jours fériés fédéraux (jours observés, 2024 à 2030) | Règle existante `public_holidays` (OPM) | Date limite d'annulation |
| **Contrat écrit avec un indépendant** : État de New York (GBL art. 44-A, en vigueur le 28/08/2024) : dès **800 $** (seul ou cumulé sur les 120 jours précédents) ; au minimum les noms et **adresses postales** des deux parties, la **liste des services**, leur **valeur**, le **taux et le mode de rémunération**, la **date de paiement** (ou son mécanisme) et la **date à laquelle l'indépendant remet la liste des services rendus** pour les délais internes du client ; copie gardée par chacun ; paiement à la date convenue ou, à défaut, 30 jours après la fin ; le client ne peut exiger d'accepter moins pour être payé à temps ; renonciation nulle. Ville de New York : dès 800 $ (sur 120 jours) : travail, rémunération, date de paiement. Illinois : dès **500 $** sur 120 jours : noms et coordonnées, liste des produits et services, taux et mode de rémunération, date de paiement, dates des services | Projet S8039 (texte de l'article 44-A, lu en entier ; pas de version amendée publiée) et page du ministère du Travail de New York ; dépliant officiel de la ville (DCWP) ; page du ministère du Travail de l'Illinois (la loi, 820 ILCS 193, n'a pas pu être lue : certificat du site refusé) ; règles existantes `freelance_law_new_york_state`, `freelance_law_nyc`, `freelance_law_illinois` (mises à jour) ; `freelance_written_contract_contents` (nouvelle) | Article « Freelance protection laws », date de remise de la facture, contrôle « contenu du devis », page |
| **Signature électronique** : un contrat ou une signature ne peut être privé d'effet du seul fait de sa forme électronique ; personne n'est obligé de l'accepter ; une information due **par écrit à un consommateur** ne peut lui être donnée par voie électronique qu'avec son consentement préalable, après une information claire | Electronic Signatures in Global and National Commerce Act, 15 U.S.C. 7001 (govinfo, lu) ; `us_esign` (nouvelle) | Article « Quotes and the contract » (acceptation signée, y compris électroniquement), page (copies papier lors d'une vente hors établissement) |
| **Cession du droit d'auteur** : valable seulement par un écrit signé par le titulaire des droits | 17 U.S.C. 204(a) (govinfo, lu) ; `us_copyright_transfer_writing` (nouvelle) | Article « Intellectual property », contrôle (signer le devis qui renvoie aux CGV) |
| Intérêts de retard : aucune règle fédérale entre entreprises ; seulement s'ils sont convenus, dans les limites de la loi de l'État (usure, clause pénale) | Règle existante `late_fees_federal_rule` (confiance moyenne) | Clause « au taux convenu, ou au taux maximal permis par la loi s'il est plus bas », contrôle (vérifier la loi de l'État) |

**Points signalés, non tranchés** : la loi californienne (SB 988, contrat écrit dès 250 $) n'a pas pu être lue sur le
site officiel (réponse 403) : la page la cite seulement comme exemple d'autres lois, sans détail ; idem pour les villes
(Los Angeles, Seattle, Minneapolis, Columbus), dont les règles restent en confiance moyenne ou basse ; les lois des États
sur la vente à domicile (souvent plus protectrices) et sur les clauses limitatives ne sont pas couvertes : la page le
dit ; l'outil ne juge pas si un plafond de responsabilité est opposable dans un État donné.

Choix de calcul de la date limite d'annulation : le 3e jour ouvré après la date de la transaction, en sautant les
dimanches et les jours fériés fédéraux de la règle `public_holidays` (jours observés) **et**, quand un jour férié est
observé un autre jour, sa date légale (un 4 juillet tombé un samedi, par exemple) : la règle interdit une date plus
précoce que le 3e jour ouvré, pas une date plus tardive ; en cas de doute, la date la plus tardive protège le vendeur.

## 3. Outil

Page `/us/terms-and-conditions-generator/`, identifiant `cgv` (liens de langue avec les pages française et britannique),
menu « Selling » après l'accord de confidentialité.

**Formulaire** (enregistré sur l'appareil, clé `cgv-us`) :

- *About you* : nom, nom commercial (*DBA*, facultatif), structure (*sole proprietor*, LLC, *corporation*,
  *partnership*), État de constitution (LLC, *corporation*, facultatif), adresse postale, email, téléphone (facultatif),
  politique de confidentialité (facultatif), assurance (facultatif), prestations.
- *Your clients* : entreprises, particuliers ou les deux ; contrats conclus chez le particulier ou hors de
  l'établissement ; date de la transaction (facultative, pour remplir le formulaire d'annulation d'une vente donnée).
- *Prices and payment* : sur devis, au jour ou à l'heure ; tarifs (facultatifs) ; validité des devis ; acompte ; délai
  de paiement ; moyens de paiement (virement ou ACH, carte, chèque, lien de paiement) ; intérêts de retard (oui ou non,
  taux mensuel).
- *Work and terms* : délai de vérification des livrables (entreprises) ; préavis ; propriété intellectuelle (cession
  après paiement ou licence) ; portfolio ; confidentialité ; plafond de responsabilité (entreprises) ; sous-traitance ;
  droit applicable (50 États et District de Columbia, choix obligatoire).

**Moteur** `engines/cgv-us.js` (OFE.cgvUS, fonctions pures, testées ; s'appuie sur `engines/jours.js`) :

- `cancelBy(rules, iso)` : date limite d'annulation d'une vente hors établissement conclue ce jour-là, `null` si la date
  est illisible ou si l'année n'est pas couverte par les jours fériés des règles.
- `cancellationNotice(rules)` : formulaire officiel repris de la règle, sans les paragraphes propres aux biens (« where
  applicable »), coordonnées du vendeur et dates remplies (ou lignes à remplir).
- `prepare(raw, rules, today, fmt)` → repères (`has_pro`, `has_part`, `offsite_part`…), textes calculés et **contrôles**
  (codes ; messages dans la page) : nom et adresse (16 CFR 429.1 ; GBL 1412), email, droit applicable non choisi, délai
  de paiement, taux de retard illisible ou à vérifier selon l'État, acompte, moyens de paiement, délais, date de la
  transaction illisible ou année non couverte, étapes d'une vente hors établissement, contenu du devis exigé par les lois
  sur les indépendants, cession signée, plafond de responsabilité à faire relire.

**Script** : `tools/cgv.js`, commun aux trois pays (moteur choisi selon la page) ; rendu `engines/contract-doc.js` ;
PDF, Word, copie.

**Texte** (anglais américain clair, « we » et « you ») : About these terms ; About us ; Quotes and the contract ; Prices ;
Invoices and payment ; Freelance protection laws ; Carrying out the services ; Cancelling a sale made away from our place
of business (particuliers, vente hors établissement) ; Intellectual property ; Confidentiality ; Warranties and
liability ; Events outside our control ; Ending the contract ; Personal data ; Disputes, governing law and courts ;
General ; Annex – Notice of Cancellation.

Choix de rédaction (comme au Royaume-Uni, par prudence, en l'absence d'une règle fédérale unique) : envers un
particulier, ni plafond de responsabilité, ni exclusion des garanties implicites, ni réception tacite des livrables, ni
clause d'« entire agreement », ni juridiction exclusive, et rappel que ses droits de consommateur dans son État ne sont
pas limités ; l'acompte est déduit de la facture et, si le contrat prend fin, seul le prix du travail fait et des frais
engagés non récupérables est gardé ; vente hors établissement : pas de début des travaux avant la fin du délai
d'annulation (la règle ne prévoit pas de paiement partiel en cas d'annulation) ; la facture est envoyée à la date dont
le client a besoin s'il la signale avant le début (GBL 1412(2)(d)) ; petites créances (*small claims*) toujours
possibles ; suspension pour impayé seulement entre entreprises.

**Page** : avertissements au-dessus de l'aperçu ; explications : ce que contient le document, comment le faire
accepter (avec le devis, accord signé, y compris électroniquement, version datée), ce que le devis doit contenir à New
York et en Illinois, ce qu'il faut faire en plus lors d'une vente chez un particulier (information orale, copies papier,
formulaire en double rempli, même langue, phrase près de la signature, ne pas commencer avant la fin du délai), ce que
le générateur ne couvre pas ; questions fréquentes ; sources.

## 4. Tests

- Moteur : date limite (samedi compté, dimanche et jours fériés sautés, date légale d'un jour férié observé un autre
  jour, année non couverte), formulaire mot pour mot depuis la règle (sans les paragraphes des biens), chaque contrôle
  présent et absent, repères selon la clientèle et la façon de conclure.
- Page : chaque combinaison (3 clientèles × vente hors établissement ou non × options) rendue sans clé brute ; envers un
  particulier : pas de plafond, pas d'exclusion des garanties, pas de réception tacite, pas d'« entire agreement », pas
  de juridiction exclusive ; formulaire et article d'annulation si et seulement si la règle s'applique ; chiffres lus
  dans les règles (3 et 10 jours ouvrés, 25 $ et 130 $, 800 $ et 500 $) ; en-tête, menu, liens de langue.
- Parcours navigateur : saisie, changements de clientèle, avertissements, annexe et dates, Word, enregistrement séparé,
  accessibilité, ordinateur, tablette et mobile ; erreurs réintroduites.

## 5. Réalisation (30/10/2026)

- Sources : le règlement de la FTC lu en entier (16 CFR Part 429, eCFR) ; 15 U.S.C. 7001 et 7002 (E-SIGN) et
  17 U.S.C. 204 (govinfo) ; l'article 44-A de la loi générale des affaires de New York, lu en entier dans le projet S8039
  (aucune version amendée n'est publiée), et la page du ministère du Travail de New York ; le dépliant officiel de la
  ville de New York (DCWP) ; la page du ministère du Travail de l'Illinois. Lectures impossibles, signalées dans les
  règles : la loi de l'Illinois (ilga.gov, chaîne de certificats refusée), les pages de lois de nysenate.gov et la loi
  californienne (leginfo, réponses 403), une page de la FTC destinée au public (404).
- Outil de lecture des sources : ajout des sites des lois américaines (eCFR, govinfo, Code des États-Unis, État et ville
  de New York, Illinois, Californie), avec ses tests.
- Règles : cinq nouvelles dans `data/rules/us.json` (`us_ftc_cooling_off`, `us_ftc_cancellation_notice`,
  `freelance_written_contract_contents`, `us_esign`, `us_copyright_transfer_writing`) ; `freelance_law_new_york_state`,
  `freelance_law_nyc` et `freelance_law_illinois` vérifiées le 30/10/2026 (notes : sanctions, délais et conservation de
  New York désormais lus dans la loi) ; règles existantes reprises (`public_holidays`, `late_fees_federal_rule`,
  `freelance_default_payment`).
- Code : moteur `engines/cgv-us.js` (date limite par `engines/jours.js`) ; `tools/cgv.js` commun aux trois pays ;
  `engines/contract-doc.js` : option `bold` (un paragraphe ou une annexe en gras, aussi dans le document Word) ; page
  `content/us/terms-and-conditions-generator.html` (menu *Selling*, après l'accord de confidentialité ; liens de langue
  avec les pages française et britannique).
- Choix faits en réalisant : formulaire d'annulation sans les deux paragraphes sur les biens livrés ; dates laissées en
  lignes à remplir à la main quand la date de la vente n'est pas saisie (pas de repère grisé dans un formulaire
  imprimé) ; droit applicable obligatoire, sans État par défaut ; intérêts de retard facultatifs, au mois, « ou au taux
  maximal permis par la loi s'il est plus bas », comme le contrat de prestation américain ; la Californie et les villes
  restent hors du document tant que leur texte n'est pas lu.
- Tests : `cgv-us.test.mjs` (19 tests : règles, date limite avec samedis, dimanches, jours fériés observés et années non
  couvertes, formulaire mot pour mot, chaque contrôle, six combinaisons de clientèle et de vente hors établissement
  rendues sans clé brute, rien de réservé aux entreprises envers un particulier, chiffres lus dans les règles) ; test du
  gras dans `contract-doc.test.mjs`. Les tests ont trouvé un défaut : une chaîne JavaScript a une méthode `bold`, si
  bien que tous les paragraphes passaient en gras ; corrigé. Erreurs réintroduites : 54 dans le moteur et 37 dans le
  texte de la page ; 4 n'étaient pas détectées au premier passage (État inconnu, seuils d'un message lus dans les
  règles, niveau d'un contrôle, clause d'intérêts avec un taux illisible), toutes le sont après renforcement ; une est
  sans effet (option déjà première de la liste). Parcours navigateur : saisie, champs conditionnels, avertissements et
  focus, LLC, intérêts de retard, particuliers, vente à domicile, phrase et formulaire en gras, dates (4 juillet 2026 un
  samedi), année non couverte, Word, copie, enregistrement séparé des CGV française et britannique, « Clear everything »,
  accessibilité, trois formats.
