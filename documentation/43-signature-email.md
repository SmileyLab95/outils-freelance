# 43. Signature d'email professionnelle (4 pays)

Outil de l'étape 6 de [31](31-vision-plateforme.md) § 5 (« signature d'email »). Spécification avant le code,
29/10/2026, après la lecture en entier des sources ci-dessous avec l'outil « Lire une source officielle ».

## 1. Besoin

Un indépendant écrit chaque jour à ses clients et prospects. Sa signature doit :

1. le présenter clairement (nom, métier, coordonnées, site) ;
2. porter les **mentions que la loi de son pays demande** sur ses courriers professionnels, selon son statut ;
3. se coller telle quelle dans Gmail, Outlook ou Apple Mail (mise en forme comprise), ou en texte brut.

Les générateurs de signature courants soignent l'apparence mais ne disent rien des mentions obligatoires.

## 2. Règles

| Pays | Règle | Source | Usage |
|---|---|---|---|
| France | Les courriers (papier ou **emails commerciaux**) sont des documents commerciaux qui comportent des mentions obligatoires. Identification de l'entreprise : numéro **Siren** ; mention **RCS** suivie de la ville du greffe (activité commerciale) ou mention **RNE** (activité artisanale, libérale ou agricole) ; lieu de domiciliation (entreprise individuelle) ou du siège social (société) ; pour une société : **forme juridique** et **capital social** ; entrepreneur individuel : nom précédé ou suivi de « **EI** » ou « entrepreneur individuel » | Fiches F37370, F36008, F37371 (vérifiées le 08/12/2025), Code de commerce R123-237 à R123-238 (cités par les fiches) ; règle existante `mention_ei_documents` (R526-27) ; nouvelle règle `email_signature` (`data/rules/fr.json`) | Mentions de la signature |
| Royaume-Uni | **Société** (*limited company*) : nom enregistré sur toute correspondance ; sur les *business letters*, les bons de commande et les sites : numéro d'immatriculation, adresse du *registered office*, partie du Royaume-Uni où elle est enregistrée, caractère limité ; un document « électronique » est un document (reg. 29(c)) ; si un directeur est nommé ailleurs que dans le texte ou comme signataire, tous les directeurs ; capital affiché = capital libéré. **Entrepreneur individuel sous un nom commercial** (*business name*, autre que son nom de famille avec prénom ou initiale) : son nom et une adresse au Royaume-Uni où des documents peuvent lui être signifiés, sur les *business letters*, bons de commande, factures, reçus et demandes de paiement | GOV.UK, *Signs, stationery and promotional material* ; SI 2015/17, Part 6 (version révisée) ; Companies Act 2006, ss. 1200 à 1206 ; nouvelle règle `email_signature` (`data/rules/uk.json`) | Mentions de la signature |
| États-Unis | La loi CAN-SPAM vise les **emails commerciaux** (but premier : publicité ou promotion d'un produit ou service), pas les messages transactionnels ou relationnels. Un email commercial contient une **adresse postale physique valide**, un **moyen de refuser** les prochains emails commerciaux (adresse de réponse ou autre mécanisme, de la manière indiquée dans le message, valable 30 jours) et, sauf consentement préalable, l'indication qu'il s'agit d'une publicité | CAN-SPAM Act of 2003, ss. 3(2), 5(a)(3) et 5(a)(5) (texte promulgué, ftc.gov) ; nouvelle règle `email_signature` (`data/rules/us.json`) | Option « emails de prospection » |
| Canada | La LCAP vise les **messages électroniques commerciaux** : un message qui a pour but, ou l'un de ses buts, d'encourager la participation à une activité commerciale (offre de services, publicité, promotion de la personne). Chacun contient : le nom (nom commercial s'il diffère), l'**adresse postale** et un téléphone, une adresse de courriel ou un site Web ; un **mécanisme d'exclusion** gratuit, par le même moyen électronique, qui indique une adresse électronique ou un lien, valable 60 jours, appliqué dans les 10 jours ouvrables. Un devis demandé est dispensé du seul consentement : l'identification et l'exclusion restent dues | Loi (L.C. 2010, ch. 23), art. 1(2), 6 et 11 ; Règlement sur la protection du commerce électronique (CRTC), DORS/2012-36, art. 2 et 3 (versions anglaise et française) ; nouvelle règle `email_signature` (`data/rules/ca.json`) | Identification et ligne d'exclusion, toujours (§ 5) |

**Prudence.** Le texte de l'article R123-237 (« toutes correspondances ») n'a pas pu être lu (Légifrance inaccessible) :
les mentions françaises viennent des fiches officielles, qui rangent les emails commerciaux parmi les documents
commerciaux et renvoient à cet article ; question ouverte dans `fr.json`. Au Royaume-Uni, la loi ne dit pas si un
email d'entrepreneur individuel est une *business letter* : la page le dit et recommande de mettre les mentions dans
la signature, ce qui couvre les deux lectures. Cas particuliers non traités (liquidation, location-gérance, contrat
d'appui, profession réglementée, numéro de TVA) : la page renvoie aux fiches.

## 3. Outil

- **Saisie** : prénom et nom, fonction, statut (selon le pays), nom commercial ou dénomination, téléphone, email, site,
  profil LinkedIn, adresse ; champs du statut (France : Siren, activité commerciale ou non, ville du greffe, forme et
  capital pour une société ; Royaume-Uni : numéro de société, partie du Royaume-Uni) ; option « emails de prospection »
  (États-Unis) ; couleur d'accent (4 couleurs contrastées). Canada : pas d'option, l'identification et la ligne
  d'exclusion sont toujours ajoutées (voir § 5).
- **Résultat** : aperçu de la signature ; liste des **mentions requises** pour la situation choisie, chacune cochée ou
  signalée manquante, avec sa source ; boutons « Copier la signature » (mise en forme), « Copier le texte brut »,
  « Copier le code HTML », « Télécharger (.html) ».
- **Signature** : tableau HTML à styles intégrés (compatibles avec les messageries), sans image ni police externe ;
  liens `https://`, `mailto:` et `tel:` seulement ; texte échappé ; mentions en petit, contraste suffisant.
- **Mentions produites** : France EI « Prénom Nom EI », « SIREN 123 456 789 · RCS Lyon » ou « · RNE », adresse ;
  société « Dénomination SAS au capital de 1 000 € · SIREN … · RCS Lyon · Siège : adresse ». Royaume-Uni société
  « Exemple Ltd · Registered in England and Wales, company number 01234567 · Registered office: adresse » ; nom
  commercial « Nom commercial is a trading name of Prénom Nom · Address for service: adresse ». États-Unis (option)
  adresse postale et « To stop receiving marketing emails from me, reply with “unsubscribe.” » Canada : nom,
  adresse postale, contact et ligne d'exclusion avec l'adresse de courriel.
- **Rien n'est envoyé** : la signature est créée dans le navigateur ; la saisie est enregistrée sur l'appareil.
- **Moteur** `engines/signature.js` (OFE.signature) : exigences lues dans les règles (`email_signature` de chaque
  pays), vérification des champs, composition des lignes, rendu HTML et texte ; fonctions pures, testées.
- **Pages** : France (menu « Vendre », après les modèles d'emails), Royaume-Uni, États-Unis, Canada (anglais et
  français) ; même script, textes dans chaque page.

## 4. Tests

- Exigences par pays et statut = règles ; champ manquant signalé ; Siren à 9 chiffres ; nom d'une société britannique
  sans « Limited » ni « Ltd » signalé ; option « emails de prospection » (États-Unis) et Canada : adresse postale exigée,
  ligne d'exclusion présente ; Canada : au moins un moyen de contact, adresse de courriel dans la ligne d'exclusion.
- Échappement : `<script>`, guillemets et `&` dans tous les champs ; liens `javascript:` refusés ; téléphone en `tel:`.
- Texte brut = mêmes informations que le HTML.
- Pages : textes de chaque pays au complet, sources affichées ; parcours navigateur (saisie, mentions, copie,
  téléchargement) sur ordinateur, tablette et mobile ; accessibilité.

## 5. Réalisation (29/10/2026)

- Règles `email_signature` dans les quatre fichiers de règles : situations et champs requis (France : `ei`, `societe` ;
  Royaume-Uni : `sole_own_name`, `sole_trading_name`, `limited` ; États-Unis : `everyday`, `marketing` ; Canada :
  `commercial`), sources et empreintes des textes lus ; question ouverte sur R123-237 dans `fr.json`.
- **Canada, décision** : l'article 6(6) de la Loi range parmi les messages commerciaux, dispensés du seul
  consentement, même ceux qui envoient un devis demandé, confirment une transaction ou fournissent un service convenu.
  Une option « emails non commerciaux » aurait pu faire croire qu'un courriel ordinaire à un client en est dispensé :
  la page canadienne ajoute toujours l'identification et la ligne d'exclusion.
- Moteur `engines/signature.js` : exigences lues dans les règles, Siren à 9 chiffres (fiche F32135), modèles de lignes
  avec parties facultatives (« au capital de … » omis sans capital, le reste gardé), « (a limited company) » ajouté si
  le nom d'une société britannique ne contient ni « Limited » ni « Ltd » ; rendu HTML (tableau, styles intégrés) et
  texte brut ; texte échappé, liens `https://`, `mailto:` et `tel:` seulement ; espaces insécables gardées, la fine
  insécable remplacée par l'insécable (messageries) ; mentions et ligne d'exclusion en 12 px, contraste d'environ
  7,9:1, pour rester « claires et facilement lisibles » (pas de petits caractères).
- Script `tools/signature.js` commun aux 5 pages : saisie enregistrée sur l'appareil, mentions cochées ou à compléter
  (singulier et pluriel), copie avec la mise en forme (presse-papiers HTML, sinon sélection de l'aperçu), texte brut,
  code HTML, fichier .html ; pages en français : typographie du site appliquée au texte copié.
- Pages : `fr/signature-email-professionnelle/`, `uk/email-signature-generator/`, `us/email-signature-generator/`,
  `ca/email-signature-generator/`, `ca/fr/signature-courriel/` (menu « Vendre », après les modèles d'emails).
- Tests : 8 tests du moteur et des 5 pages ; 20 erreurs réintroduites dans le moteur, toutes détectées ; parcours
  navigateur des 5 pages (mentions, copie HTML lue dans le presse-papiers, texte brut, téléchargement, rechargement,
  échappement) sur ordinateur, tablette et mobile, audit d'accessibilité sans erreur.
