# 30. Proposition commerciale (4 pays)

Besoin P3 de [02](02-besoins-clients.md), § 3 : « Rédiger une proposition commerciale : modèle de proposition ».
Spécification du 23/10/2026, avant tout code (charte qualité) ; **réalisé le même jour (§ 3)**.

## 1. Ce que la proposition est, et ce qu'elle n'est pas

La proposition sert à convaincre : le besoin du client, l'approche, les étapes, le prix, les raisons de choisir
l'indépendant et la suite. Elle ne remplace ni le devis ni le contrat, qui engagent les deux parties ; elle y renvoie
(générateur de facture et de devis, générateur de contrat).

| Pays | Règle | Source |
|---|---|---|
| France | Une offre comprend les éléments essentiels du contrat envisagé et exprime la volonté de son auteur d'être lié en cas d'acceptation ; à défaut, il y a seulement invitation à entrer en négociation (art. 1114 du Code civil). Une offre ne peut être rétractée avant l'expiration du délai fixé par son auteur (art. 1116) ; elle est caduque à l'expiration de ce délai (art. 1117). | [Code civil, art. 1114](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032040891/) ; [art. 1116](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032040881) ; [art. 1113 à 1122](https://www.legifrance.gouv.fr/codes/id/LEGISCTA000032007103) |
| France | Franchise en base : mention « TVA non applicable, art. 293 B du CGI » (règle `mention_franchise_tva`, déjà sourcée). | `data/rules/fr.json` |
| États-Unis, Royaume-Uni, Canada | Aucune règle propre à une proposition n'est affirmée : la page décrit le modèle (« ce document n'est pas un contrat ; le travail commence après la signature du contrat ») sans en tirer de conséquence juridique. Taxes : mêmes phrases que les contrats de prestation (taxe de vente « *where applicable* », TVA britannique selon l'inscription, TPS/TVH et TVQ). | Pages de contrat |

Choix de rédaction (décision D29) : la proposition indique qu'elle n'est pas un contrat et que les parties
s'engageront par la signature du devis ou du contrat. En France, c'est la situation d'une invitation à entrer en
négociation (art. 1114) : l'indépendant peut encore ajuster le prix et le périmètre, et rien n'est conclu sur un
simple « d'accord ». La date de validité annonce jusqu'à quand le prix et les disponibilités tiennent.

## 2. Outil proposé

Un générateur par pays, identifiant `proposal`, menu « Clients et contrats » ou *Templates*, avant le contrat.

- **Moteur pur** `engines/proposal.js` : étapes et options saisies (intitulé, durée libre, prix), lignes vides
  ignorées, prix illisible ou négatif signalé, total des étapes au centime, total des options (non compris dans le
  prix), acompte (0 à 100 %) et solde, date de fin de validité (date du jour + 15, 30, 60 ou 90 jours).
- **Rendu** par `engines/contract-doc.js` (même syntaxe que le contrat et l'accord de confidentialité), étendu aux
  tableaux (`{"table": "phases"}`) et à la fabrication du fichier Word, commune à tous les documents ; aucune
  signature.
- **Outil** `tools/proposal.js` : formulaire, lignes d'étapes (8 au plus) et d'options (5 au plus), aperçu en direct,
  PDF, Word, copie, saisie gardée sur l'appareil.

Formulaire : vous (nom, activité, email, téléphone, site), le client (nom, à l'attention de), le projet (intitulé,
contexte, objectifs facultatifs, approche), étapes, options, prix et conditions (TVA ou taxes selon le pays, acompte,
délai de paiement, date de début possible, validité), « pourquoi moi » et références (facultatifs).

Document : titre et intitulé ; pour, de, date et validité ; 1. Votre projet ; 2. Objectifs (si saisis) ; 3. Ce que
je propose ; 4. Étapes et calendrier (tableau) ; 5. Investissement (total hors taxes, mention de TVA ou de taxes,
acompte et solde, délai de paiement, tableau des options) ; 6. Pourquoi travailler avec moi (si saisi) ;
7. Prochaines étapes (devis ou contrat à signer, facture d'acompte, démarrage, validité, « n'est pas un contrat »).

Pages : `/fr/proposition-commerciale/`, `/us/business-proposal-template/`, `/uk/business-proposal-template/`,
`/ca/business-proposal-template/`, `/ca/fr/proposition-commerciale/` ; liens vers le devis et le contrat.

Tests : moteur (totaux, centimes, lignes vides, prix invalides, acompte et solde, validité, fin de mois et année
bissextile) ; rendu des tableaux ; textes des cinq pages (champs, clés, mentions de taxes, phrase « n'est pas un
contrat », articles cités conformes aux règles) ; parcours navigateur ; erreurs réintroduites.

## 3. Réalisation (23/10/2026)

- Pages `/fr/proposition-commerciale/`, `/us/business-proposal-template/`, `/uk/business-proposal-template/`,
  `/ca/business-proposal-template/` et `/ca/fr/proposition-commerciale/` (identifiant `proposal`, dans le menu avant le
  contrat), avec liens vers le devis, le contrat et le calculateur de prix au forfait.
- Moteur `engines/proposal.js` ; `engines/contract-doc.js` étendu aux tableaux et à la fabrication du fichier Word
  (désormais commune au contrat, à l'accord de confidentialité et à la proposition) ; outil `tools/proposal.js`.
- France : mention de franchise datée reprise du moteur des factures (art. 293 B du CGI, puis CIBS à partir du
  1er janvier 2027, règle `mention_franchise_tva_2027`) ; le contrat de prestation, qui portait une mention figée,
  utilise désormais la même (texte inchangé en 2026 : 20 aperçus comparés à la version publiée, sans différence).
  Règle nouvelle `offre_et_acceptation` (art. 1113 à 1117 du Code civil).
- Tests : `proposal.test.mjs` (moteur : lignes vides, prix illisibles, centimes, acompte plafonné, validité en fin de
  mois, d'année et en année bissextile ; tableaux ; cinq pages rendues : sections facultatives et numérotation,
  acompte et solde, taxes, « n'est pas un contrat », mention datée en 2026 et en 2027) ; parcours navigateur des cinq
  pages (prix illisible signalé, ajout et retrait d'étapes, validité, Word avec tableaux, saisie mémorisée) ;
  29 erreurs réintroduites : 28 détectées, une sans effet (le lien vers le calculateur reste dans le texte de la page).
