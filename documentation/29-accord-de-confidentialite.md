# 29. Accord de confidentialité (4 pays)

Besoin P3 de [02](02-besoins-clients.md), § 4 : « Protéger un secret : modèle d'accord de confidentialité (NDA) ».
Spécification du 23/10/2026, avant tout code (charte qualité) ; **réalisé le même jour (§ 3)**. Pas de conseil personnalisé (D8) : le modèle couvre
le cas courant (discussions avec un client ou un partenaire) et renvoie vers un avocat pour un enjeu important.

## 1. Ce que les sources officielles établissent (lu par extraits de recherche le 23/10/2026)

| Pays | Règle | Source |
|---|---|---|
| France | Celui qui utilise ou divulgue sans autorisation une information confidentielle obtenue à l'occasion des négociations engage sa responsabilité (art. 1112-2 du Code civil) : l'accord précise ce que la loi laisse ouvert (quelles informations, combien de temps, restitution). | [Code civil, art. 1112-2](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032007140/) |
| France | Les engagements perpétuels sont prohibés ; chaque partie peut y mettre fin comme à un contrat à durée indéterminée (art. 1210) : l'accord fixe donc une durée en années. | [Code civil, art. 1210](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006150252/) |
| France | Secret des affaires : information non généralement connue ni aisément accessible, ayant une valeur commerciale du fait de son caractère secret, et protégée par son détenteur légitime par des **mesures de protection raisonnables** (art. L151-1 du Code de commerce). Le secret n'est pas opposable pour exercer la liberté d'expression, pour révéler de bonne foi une activité illégale (lanceurs d'alerte) ou pour protéger un intérêt légitime reconnu par la loi (art. L151-8, version de la loi n° 2022-401). | [Code de commerce, art. L151-1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037266553) ; [art. L151-8](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037266573/) |
| États-Unis | *Defend Trade Secrets Act* : immunité de la personne qui communique un secret d'affaires en confidence à un agent public ou à un avocat, uniquement pour signaler ou examiner une violation présumée de la loi, ou dans un acte déposé sous scellés ; l'employeur doit mentionner cette immunité dans tout contrat qui régit l'usage d'informations confidentielles, et « employé » comprend la personne qui travaille comme *contractor* ou *consultant* ; sans cette mention, pas de dommages-intérêts exemplaires ni d'honoraires d'avocat contre elle. | [18 U.S.C. § 1833 (GovInfo)](https://www.govinfo.gov/content/pkg/USCODE-2023-title18/pdf/USCODE-2023-title18-partI-chap90-sec1833.pdf) |
| États-Unis | L'USPTO cite, parmi les mesures raisonnables de protection d'un secret, les accords de confidentialité signés par les tiers (clients potentiels compris) avant l'accès, et la restitution des documents. | [USPTO : Trade Secret IP Toolkit](https://www.uspto.gov/sites/default/files/documents/tradesecretsiptoolkit.pdf) |
| Royaume-Uni | Guide de l'IPO : accord à sens unique si une seule partie communique, mutuel si les deux le font (ne pas rendre mutuel un accord qui ne l'est pas) ; définir l'objet autorisé aussi précisément que possible ; un accord à sens unique **peut devoir être signé sous forme d'acte (*deed*)** pour être exécutoire ; modèles publiés (le modèle à sens unique est un *deed*). | [GOV.UK : Non-disclosure agreements (IPO)](https://www.gov.uk/government/publications/non-disclosure-agreements) |
| Royaume-Uni | *Deed* : l'acte doit indiquer qu'il est un *deed* ; une personne le signe en présence d'un témoin qui atteste la signature, et le remet comme *deed* (Angleterre et pays de Galles : LP(MP)A 1989, s. 1 ; Irlande du Nord : ordonnance de 2005, art. 3) ; une société signe par deux signataires autorisés ou par un administrateur (*director*) en présence d'un témoin (Companies Act 2006, s. 44 et 46). L'Écosse a ses propres règles : pas de formule de *deed* pour le droit écossais. | [LP(MP)A 1989, s. 1](https://www.legislation.gov.uk/ukpga/1989/34/section/1) ; [NI Order 2005, art. 3](https://www.legislation.gov.uk/nisi/2005/1452/article/3/made) ; [Companies Act 2006, s. 44](https://www.legislation.gov.uk/ukpga/2006/46/section/44) |
| Royaume-Uni | Brevet : divulguer son invention avant la demande peut faire perdre le droit au brevet ; en parler à d'autres qu'un conseil en brevets peut exiger un accord de confidentialité. | [GOV.UK : Apply for a patent, before you apply](https://www.gov.uk/patent-your-invention/before-you-apply) |
| Royaume-Uni | Depuis le 1er octobre 2025, en Angleterre et au pays de Galles, une clause est nulle dans la mesure où elle empêche une victime d'une infraction de faire certaines divulgations (police, avocat, services d'aide…) (*Victims and Prisoners Act 2024*, s. 17 ; projet de remplacement en cours). | [GOV.UK : changes to NDAs (for businesses)](https://www.gov.uk/government/publications/victims-and-prisoners-act-2024-changes-to-non-disclosure-agreements/victims-and-prisoners-act-2024-changes-to-non-disclosure-agreements) |
| Canada | OPIC : pas d'enregistrement des secrets commerciaux ; protection tant que l'information reste secrète ; accords de non-divulgation à faire signer aux employés, sous-traitants et partenaires **avant** de communiquer l'information ; garder des traces des mesures prises. | [OPIC : Trade secrets](https://ised-isde.canada.ca/site/canadian-intellectual-property-office/en/trade-secrets) |
| Canada (Québec) | Charte de la langue française, art. 55 : un contrat d'adhésion est rédigé en français ; les parties ne peuvent être liées par une autre version qu'après la remise de la version française, si telle est leur volonté expresse (depuis le 1er juin 2023). | [OQLF : contrats d'adhésion](https://www.oqlf.gouv.qc.ca/francisation/entreprises/contrats-adhesion.html) |

## 2. Outil proposé

Un générateur par pays, identifiant `nda`, menu « Clients et contrats » ou *Templates* après le contrat. Même
moteur de rendu que le générateur de contrat (`tools/contract.js`) : texte dans la page (`#contract-data`),
conditions `when`, champs `{clé}` et `[[clé|…]]`, PDF, Word, copie. Changements du moteur, rétrocompatibles :

- clé d'enregistrement propre à chaque document (`store`), pour que l'accord et le contrat ne partagent pas la saisie ;
- signatures conditionnelles (`when`), mention par signature (`note`) et lignes de témoin (`witness`) ;
- repère `has_<champ>` calculé pour tout champ (rempli ou non), en plus des repères existants.

Formulaire : vous (nom, statut, adresse, numéro, email), l'autre partie (nom, forme, adresse, immatriculation,
représentant), **sens de l'accord** (mutuel ; l'autre partie communique ; vous communiquez), **objet autorisé**
(texte libre, à préciser), date d'effet (facultative : à défaut, la signature), **période d'échange** (6, 12, 24 ou
36 mois), **durée de la confidentialité** après cette période (1, 2, 3, 5 ou 10 ans ; jamais perpétuelle), droit
applicable (États-Unis : État ; Royaume-Uni : Angleterre et pays de Galles, Écosse, Irlande du Nord ; Canada :
province), option « interdire l'analyse des prototypes et logiciels » (rétro-ingénierie).

Clauses : parties et rôles (Partie divulgatrice, Partie destinataire, selon le sens), définition des informations
confidentielles (écrites, orales, visuelles ; marquées ou confidentielles par nature), exclusions (publiques, déjà
connues, reçues d'un tiers libre, développées indépendamment), obligations (usage limité à l'objet, soin raisonnable,
personnes qui ont besoin de savoir et sont tenues à la même confidentialité, alerte en cas de fuite), divulgation
exigée par la loi (avec information préalable si la loi le permet), signalements protégés par la loi (lanceurs
d'alerte ; aux États-Unis, mention de l'immunité du *Defend Trade Secrets Act* reprise du texte), restitution ou
destruction, aucune licence ni obligation de conclure, durée, recours, droit applicable, dispositions générales.
Royaume-Uni : accord à sens unique sous droit anglais ou nord-irlandais rédigé comme un *deed*, avec une ligne de
témoin sous chaque signature ; accord mutuel ou droit écossais : signatures simples.

Pages : `/fr/accord-de-confidentialite/`, `/us/nda-template/`, `/uk/nda-template/`, `/ca/nda-template/`,
`/ca/fr/entente-de-confidentialite/` ; liens réciproques avec le contrat de prestation ; au Canada en anglais, la
règle québécoise des contrats d'adhésion avec un lien vers la version française.

Tests : textes des cinq pages (champs du formulaire présents, toutes les clés `{…}` connues, chaque sens produit des
rôles cohérents, aucune durée perpétuelle, mention du *Defend Trade Secrets Act* aux États-Unis, formule de *deed*
selon le droit au Royaume-Uni), moteur de rendu (clé d'enregistrement, signatures conditionnelles), parcours
navigateur des cinq pages, erreurs réintroduites.

## 3. Réalisation (23/10/2026)

- Pages `/fr/accord-de-confidentialite/`, `/us/nda-template/`, `/uk/nda-template/`, `/ca/nda-template/` et
  `/ca/fr/entente-de-confidentialite/` (identifiant `nda`, dans le menu après le contrat de prestation), avec liens
  réciproques vers le contrat ; au Canada en anglais, lien vers la version française pour un contrat d'adhésion.
- Moteur de rendu pur `engines/contract-doc.js` (conditions, variantes de titre, signatures conditionnelles, témoin),
  désormais utilisé aussi par le contrat de prestation ; `tools/contract.js` ne fait plus que lire le formulaire et
  brancher les boutons, avec une clé d'enregistrement par document (`store`). Le contrat de prestation est rendu à
  l'identique : 20 aperçus comparés dans un navigateur entre l'ancienne et la nouvelle version, sans aucune différence.
- Onze règles nouvelles (fr.json : 3, us.json : 2, uk.json : 4, ca.json : 2), chacune avec sa source officielle.
- Tests : `contract-doc.test.mjs` (syntaxe et conditions du moteur ; pour chaque page, chaque sens et chaque droit :
  rôles définis une fois, objet, période et durée, aucune clé brute ; avis du *Defend Trade Secrets Act* comparé au
  texte de la loi ; formule de *deed*, témoins et contrepartie selon le sens et le droit britannique ; contractions
  françaises et orthographe britannique et canadienne) ; parcours navigateur des cinq pages (dont le téléchargement
  Word et la saisie séparée de celle du contrat) ; 30 erreurs réintroduites, toutes détectées (une mutation sans
  effet : l'Ontario est déjà le premier choix de la liste).
- Revue du texte rendu et des captures : contractions fautives (« à le présent accord ») et orthographe américaine
  dans la version britannique corrigées ; bloc de signature coupé entre deux pages à l'impression (désormais jamais
  coupé, contrat compris) ; espace de signature du témoin agrandi. Le test du téléchargement Word a révélé que
  Chromium renomme « download » un fichier accentué quand les paramètres régionaux ne sont pas en UTF-8 : le
  navigateur de test est désormais lancé en UTF-8, comme sur les appareils des visiteurs.
