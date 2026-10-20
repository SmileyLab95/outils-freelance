# France : règles 2026 pour les indépendants

Vérifié le 20 octobre 2026. Les données lisibles par les calculateurs sont dans `data/rules/fr.json`.

> **Limite de vérification.** Pendant la recherche, le quota de recherche web partagé de la session a été épuisé et les pages officielles ne pouvaient pas être ouvertes directement. Résultat :
> - **recoupés sur des pages officielles**, par les extraits de recherche : micro-entreprise (taux, ACRE, CFP, plafonds, TVA), barème de l'IR, PASS ;
> - **issus de connaissances antérieures**, marqués *moyenne* ou *faible* : sociétés (IS, PFU, TNS, SASU), facturation électronique, retard de paiement, mentions obligatoires.
>
> Une ligne marquée *faible* ne doit pas alimenter un calculateur sans revérification.

## 1. Résumé : quel statut choisir ?

### Micro-entreprise
- Cotisations sociales calculées en pourcentage du chiffre d'affaires encaissé (12,3 % vente, 21,2 % BIC, 25,6 % BNC, 23,2 % Cipav), sans minimum : on ne paie rien sans chiffre d'affaires.
- Impôt sur le CA après abattement forfaitaire (71 / 50 / 34 %), ou versement libératoire (1 / 1,7 / 2,2 %) sous condition de revenu.
- Plafonds de CA : 83 600 € (services) et 203 100 € (vente). Franchise de TVA jusqu'à 37 500 € ou 85 000 €.
- Comptabilité minimale, mais aucune charge réelle n'est déductible et la responsabilité est celle d'un entrepreneur individuel (patrimoine personnel protégé depuis 2022).
- **À choisir** pour démarrer, tester une activité ou facturer avec peu de frais (moins de 30 à 35 % du CA environ).

### EI au réel (entreprise individuelle, régime réel BIC/BNC)
- Même entité juridique que la micro, sans plafond de CA : le bénéfice réel (recettes moins charges) est imposé.
- Cotisations TNS (SSI) sur le bénéfice, environ 40 à 45 % du revenu net. Depuis 2026, elles sont calculées sur une assiette unique avec un abattement de 26 %.
- IR au barème progressif sur le bénéfice. Option possible pour l'IS : l'EI est alors traitée comme une EURL.
- Comptabilité complète, souvent avec un expert-comptable.
- **À choisir** quand les frais réels sont élevés ou que le CA dépasse les plafonds de la micro, sans vouloir créer de société.

### EURL (SARL à associé unique)
- Société dotée d'une personnalité juridique et d'un capital ; gérant associé unique, donc TNS (cotisations SSI comme en EI).
- IR par défaut (associé personne physique), ou option pour l'IS : 15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà.
- À l'IS, les dividendes au-delà de 10 % du capital, des primes et des comptes courants supportent les cotisations TNS. Peu de dividendes, donc, si le capital est faible.
- Coût social plus bas que la SASU pour un même revenu, mais protection sociale moins complète (pas de régime général).
- **À choisir** pour optimiser le coût social d'une rémunération régulière tout en séparant les patrimoines.

### SASU (SAS à associé unique)
- Président assimilé salarié (régime général, sans assurance chômage) : environ 80 % du salaire net en cotisations, environ 45 % du coût total.
- IS par défaut (15 % / 25 %) ; dividendes au PFU (31,4 % en 2026 si la hausse de la CSG est confirmée), jamais soumis à cotisations.
- On peut ne pas se rémunérer et se verser uniquement des dividendes : aucune cotisation, mais aucun droit retraite ni indemnité journalière.
- Statuts souples, image valorisée, compatibilité avec l'ARE (allocations chômage).
- **À choisir** pour une rémunération surtout en dividendes, pour préserver l'ARE ou pour une meilleure protection sociale si l'on accepte d'en payer le coût.

**En bref** : micro-entreprise pour commencer ; EI au réel ou EURL quand les charges ou le CA grossissent ; SASU quand on privilégie les dividendes, l'ARE ou la protection du régime général. Le comparateur doit rester indicatif : renvoyer vers le simulateur Urssaf (mon-entreprise.urssaf.fr) et un expert-comptable.

## 2. Chiffres 2026

| Donnée | Valeur 2026 | Confiance | Source |
|---|---|---|---|
| Cotisations micro, vente de marchandises | 12,3 % | élevée | [autoentrepreneur.urssaf.fr](https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut/lessentiel-du-statut.html) |
| Cotisations micro, prestations BIC (commerciales et artisanales) | 21,2 % | élevée | [autoentrepreneur.urssaf.fr](https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut/lessentiel-du-statut.html) |
| Cotisations micro, BNC (SSI) | 25,6 % (décret n° 2025-943, au lieu de 26,1 %) | élevée | [Légifrance, décret 2025-943](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000052211971) |
| Cotisations micro, libéral Cipav | 23,2 % | élevée | [urssaf.fr, Cipav](https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-plr-cipav.html) |
| ACRE, début d'activité jusqu'au 30/06/2026 (−50 %) | vente 6,2 % · BIC 10,6 % · BNC 12,8 % · **Cipav 13,4 %** | élevée | [economie.gouv.fr](https://www.economie.gouv.fr/entreprises/gerer-sa-micro-entreprise/micro-entreprises-quel-est-le-montant-de-vos-cotisations-sociales) |
| ACRE, début à partir du 01/07/2026 (−25 %, décret n° 2026-69) | vente 9,3 % · BIC 15,9 % · BNC 19,2 % · Cipav 17,4 % | élevée | [Légifrance, décret 2026-69](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053449085) |
| Durée et demande de l'ACRE | jusqu'à la fin du 3e trimestre civil suivant le début ; demande dans les 60 jours | moyenne | [urssaf.fr, ACRE](https://www.urssaf.fr/accueil/exoneration-acre-createur.html) |
| CFP (formation professionnelle) | commerçant 0,1 % · artisan 0,3 % · libéral 0,2 % | élevée | [autoentrepreneur.urssaf.fr](https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut/lessentiel-du-statut.html) |
| Versement libératoire | vente 1 % · BIC 1,7 % · BNC 2,2 % | moyenne | [economie.gouv.fr](https://www.economie.gouv.fr/entreprises/gerer-sa-micro-entreprise/micro-entreprise-comment-fonctionne-le-versement-liberatoire-de-limpot-sur-le-revenu) |
| Versement libératoire en 2026 : plafond de RFR 2024 | 29 315 € par part | élevée | [impots.gouv.fr](https://www.impots.gouv.fr/professionnel/questions/en-tant-que-micro-entrepreneur-sous-quelles-conditions-puis-je-opter-pour-l) |
| Versement libératoire en 2027 : plafond de RFR 2025 (déduit) | 29 579 € par part | moyenne | [BOFiP barème IR](https://bofip.impots.gouv.fr/bofip/2491-PGP.html/identifiant=BOI-IR-LIQ-20-10-20260407) |
| Abattements micro | 71 % vente / hébergement · 50 % BIC services · 34 % BNC | élevée | [impots.gouv.fr](https://www.impots.gouv.fr/particulier/questions/comment-declarer-les-revenus-provenant-de-mon-activite-dauto-entrepreneur) |
| Abattement minimum | 305 € (610 € en activité mixte) | élevée | [BOFiP BIC-DECLA-20](https://bofip.impots.gouv.fr/bofip/1884-PGP.html/identifiant=BOI-BIC-DECLA-20-20200205) |
| Plafonds de CA micro 2026-2028 | 203 100 € vente · 83 600 € services · 15 000 € meublé de tourisme non classé | élevée | [economie.gouv.fr](https://www.economie.gouv.fr/entreprises/gerer-sa-micro-entreprise/micro-entreprise-que-se-passe-t-il-quand-le-seuil-de-chiffre-daffaires-est-depasse) |
| Franchise en base de TVA (seuil / seuil majoré) | vente 85 000 / 93 500 € · services 37 500 / 41 250 € | élevée | [impots.gouv.fr](https://www.impots.gouv.fr/professionnel/questions/pour-rester-micro-entrepreneur-quel-montant-de-chiffre-daffaires-ou-de) |
| Franchise spéciale avocats, auteurs, artistes-interprètes | 50 000 / 55 000 € (activité propre) · 35 000 / 38 500 € (autres opérations) | moyenne | [impots.gouv.fr, TVA](https://www.impots.gouv.fr/professionnel/tva) |
| Taxe chambre consulaire (micro) | CMA 0,48 % prestations / 0,22 % vente (Alsace 0,65 %, Moselle 0,83 %) · CCI 0,015 % vente / 0,044 % services | **faible** | [autoentrepreneur.urssaf.fr](https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut/lessentiel-du-statut.html) |
| Barème IR 2026 (revenus 2025), par part | 0 % ≤ 11 600 € · 11 % ≤ 29 579 € · 30 % ≤ 84 577 € · 41 % ≤ 181 917 € · 45 % au-delà | élevée | [BOFiP BOI-IR-LIQ-20-10](https://bofip.impots.gouv.fr/bofip/2491-PGP.html/identifiant=BOI-IR-LIQ-20-10-20260407) |
| Plafond du quotient familial | 1 807 € par demi-part | élevée | [BOFiP BOI-IR-LIQ-20-20-20](https://bofip.impots.gouv.fr/bofip/2494-PGP.html/identifiant=BOI-IR-LIQ-20-20-20-20260407) |
| Décote | 897 € − 45,25 % de l'impôt (seul) · 1 483 € − 45,25 % (couple) ; seuils 1 982 € / 3 277 € | moyenne | [Brochure IR 2026](https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/21-calcul_impot_369a382.pdf) |
| Barème IR applicable aux revenus 2026 | non publié (loi de finances pour 2027) | — | — |
| Impôt sur les sociétés | 15 % jusqu'à 42 500 € (PME : CA < 10 M€, capital libéré, détenu à 75 % par des personnes physiques), 25 % au-delà | moyenne | [entreprendre.service-public.fr F23575](https://entreprendre.service-public.fr/vosdroits/F23575) |
| PFU sur dividendes | 12,8 % IR + 18,6 % prélèvements sociaux = 31,4 % (17,2 % / 30 % jusqu'en 2025) | moyenne | [CSS art. L136-7, LFSS 2026](https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006073189) |
| Gérant majoritaire TNS (EURL / SARL, EI au réel) | environ 45 % de la rémunération nette (ordre de grandeur) | **faible** | [urssaf.fr, indépendants](https://www.urssaf.fr/accueil/independant/comprendre-payer-cotisations/vos-cotisations.html) |
| Dividendes du gérant TNS | part au-delà de 10 % du capital + primes + comptes courants soumise à cotisations | élevée | [CSS art. L131-6](https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006073189) |
| Président de SASU | environ 22 % du brut (salarié) + 42 % du brut (employeur), soit environ 80 % du net | **faible** | [urssaf.fr, secteur privé](https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html) |
| PASS 2026 | 48 060 € par an (4 005 € par mois) | élevée | [urssaf.fr, Cipav (19 % du PASS = 9 131 €)](https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-plr-cipav.html) |
| Smic au 01/01/2026 | 12,02 € brut / h · 1 823,03 € brut / mois (35 h) | moyenne | [service-public.fr F2300](https://www.service-public.fr/particuliers/vosdroits/F2300) |

**Remarques pour les calculateurs**
- Les taux ACRE publiés valent taux plein × 50 % ou × 75 %, arrondi au dixième supérieur (vente : 6,15 → 6,2 ; 9,225 → 9,3). **Seule exception : la Cipav avant le 1er juillet 2026, publiée à 13,4 % au lieu de 11,6 %.** Le simulateur du site, qui calcule `ceil(23,2 × 50 %)` soit 11,6 %, doit utiliser la valeur publiée.
- CFP d'une prestation de services BIC : 0,1 % pour un commerçant, 0,3 % pour un artisan. L'Urssaf raisonne par catégorie professionnelle, pas par catégorie fiscale.

## 3. Facturation électronique

**Calendrier** (art. 289 bis CGI ; LF 2024 modifiée par la LF 2025) — confiance moyenne :

| Date | Obligation |
|---|---|
| 1er septembre 2026 | **Réception** des factures électroniques pour toutes les entreprises assujetties à la TVA établies en France, micro-entrepreneurs en franchise compris. **Émission** et e-reporting pour les grandes entreprises et les ETI. |
| 1er septembre 2027 | **Émission** et e-reporting pour les PME, TPE et micro-entreprises. |

La catégorie de l'entreprise s'apprécie sur le dernier exercice clos avant le 1er janvier 2025.

**Obligations**
- *E-invoicing* : toute facture entre assujettis établis en France (B2B domestique) doit être émise, transmise et reçue au format électronique structuré, par une plateforme agréée. Un PDF envoyé par courriel ne suffit plus.
- *E-reporting* : transmission à l'administration des données des opérations hors e-invoicing (ventes aux particuliers, opérations internationales) et des données de paiement des prestations de services.

**Plateformes agréées (PA)**
- Ce sont les anciennes « PDP » (plateformes de dématérialisation partenaires), renommées par la LF 2025. Elles sont immatriculées par la DGFiP.
- Chaque entreprise doit en choisir au moins une pour recevoir ses factures avant le 1er septembre 2026.
- Le Portail public de facturation (PPF) n'échange plus de factures : il tient l'annuaire et collecte les données fiscales.
- La liste officielle est publiée et mise à jour sur impots.gouv.fr. Elle compte de l'ordre d'une centaine de plateformes (confiance faible sur ce nombre).
- Un logiciel de facturation non immatriculé (opérateur de dématérialisation) doit passer par une PA.

**Formats du socle** : Factur-X (PDF/A-3 avec XML CII intégré), UBL 2.1, UN/CEFACT CII. Tous suivent la norme EN 16931.

**Nouvelles mentions obligatoires** (art. 242 nonies A, annexe II CGI ; décret n° 2022-1299) :
1. le numéro SIREN du client ;
2. l'adresse de livraison des biens, si elle diffère de l'adresse du client ;
3. la nature des opérations : livraisons de biens, prestations de services, ou les deux ;
4. la mention « Option pour le paiement de la taxe d'après les débits », si le fournisseur a choisi cette option.

La date d'effet est généralement fixée au 1er septembre 2026, mais certaines sources la lient à la date d'émission de chaque entreprise. Point à trancher.

**Sanctions** (art. 1737 III et 1788 D CGI) — confiance faible :
- 15 € par facture non émise électroniquement (plafond 15 000 € par an) ;
- 250 € par e-reporting manquant (plafond 15 000 € par an) ;
- pas d'amende pour une première infraction régularisée dans les 30 jours ;
- des amendes pour défaut de plateforme agréée et une hausse éventuelle des montants (LF 2025 / 2026) restent à vérifier.

## 4. Retard de paiement (entre professionnels)

- **Délais** (art. L441-10 C. com.) :
  - à défaut de clause, 30 jours après la réception des marchandises ou l'exécution de la prestation ;
  - délai convenu : 60 jours au plus après la date d'émission de la facture, ou 45 jours fin de mois s'il est expressément stipulé et non abusif.
- **Pénalités** : dues de plein droit, sans rappel.
  - Taux contractuel au moins égal à 3 fois le taux d'intérêt légal.
  - À défaut, taux de refinancement de la BCE + 10 points. On retient le taux BCE au 1er janvier pour le 1er semestre et au 1er juillet pour le 2nd semestre.
  - Calcul : montant TTC × taux × jours de retard / 365.
- **Indemnité forfaitaire de recouvrement** : 40 € par facture payée en retard (art. D441-5). Une indemnité complémentaire est possible sur justificatifs.
- **Taux BCE au 1er janvier 2026** : 2,15 % (inchangé depuis juin 2025 ; confiance moyenne), soit 12,15 % de pénalités par défaut au 1er semestre 2026.
- **Non vérifiés** (voir les questions ouvertes) :
  - le taux BCE au 1er juillet 2026 ;
  - le taux d'intérêt légal du 2nd semestre 2026, pour les créanciers professionnels comme pour les autres.
- **Clients particuliers** : pas de pénalités L441-10 ni d'indemnité de 40 €. Seuls les intérêts au taux légal « autres créanciers » sont dus après mise en demeure.

## 5. Mentions obligatoires d'une facture (2026)

- date d'émission et numéro unique en séquence chronologique continue ;
- vendeur : nom ou dénomination, adresse (et adresse de facturation si différente), SIREN ou SIRET, forme juridique et capital pour une société, RCS ou RM le cas échéant ;
- **« EI » ou « entrepreneur individuel »** accolé au nom, obligatoire depuis le 15 mai 2022 (loi n° 2022-172), micro-entrepreneurs compris ;
- numéro de TVA intracommunautaire du vendeur (sauf franchise) et du client professionnel ;
- nom et adresse du client (et adresse de facturation si différente) ; numéro de bon de commande s'il existe ;
- date de la vente ou de la prestation ;
- désignation, quantité, prix unitaire HT, réductions ;
- taux et montant de TVA, total HT et total TTC ;
- date d'échéance, conditions d'escompte, taux des pénalités de retard, indemnité forfaitaire de 40 € (clients professionnels) ;
- le cas échéant : « TVA non applicable, art. 293 B du CGI », « Autoliquidation », assurance professionnelle obligatoire (décennale pour le bâtiment) ;
- **à partir de la réforme** : SIREN du client, adresse de livraison, nature de l'opération, option pour les débits (voir la section 3).

Sanctions : amende fiscale de 15 € par mention manquante, plafonnée au quart du montant de la facture (art. 1737 CGI). Amende administrative jusqu'à 75 000 € pour une personne physique et 375 000 € pour une personne morale (art. L441-9 C. com.).

Point à surveiller : une source non officielle affirme que l'art. 293 B du CGI serait recodifié au 1er septembre 2026 (ordonnance n° 2025-1247), ce qui changerait la référence de la mention de franchise. Non confirmé.

## 6. Points à revérifier chaque année

| Donnée | Texte de référence | Publication habituelle |
|---|---|---|
| Taux de cotisations micro | décret | à l'automne de l'année précédente (septembre 2025 pour 2026) ; page Urssaf en décembre ou janvier |
| ACRE (taux, conditions) | LFSS + décret | LFSS fin décembre ; décret dans les semaines suivantes (février 2026) |
| Barème IR, décote, quotient familial | loi de finances | fin décembre, ou février en cas de retard (19/02/2026 pour la LF 2026) ; BOFiP au printemps |
| Plafond de RFR du versement libératoire | suit le barème IR | à vérifier avant l'option, à faire au plus tard le 30 septembre pour l'année suivante |
| Plafonds de CA micro | art. 50-0 CGI | révisés tous les 3 ans ; prochaine révision pour 2029 |
| Seuils de franchise de TVA | loi de finances | à chaque LF (fin décembre à février) ; BOFiP barème |
| Taux d'IS, PFU | loi de finances | fin décembre à février |
| Prélèvements sociaux | LFSS | fin décembre |
| PASS | arrêté | fin novembre ou décembre |
| Smic | décret | mi-décembre pour le 1er janvier ; revalorisation en cours d'année si l'inflation dépasse 2 % |
| Taux d'intérêt légal | arrêté | fin juin (2nd semestre) et fin décembre (1er semestre) |
| Taux de refinancement BCE | décision du Conseil des gouverneurs | à chaque réunion (environ toutes les 6 semaines) ; on retient le taux au 1er janvier et au 1er juillet |
| Taxe pour frais de chambre consulaire | loi de finances (art. 1600, 1601 CGI) | fin décembre à février |
| Facturation électronique (calendrier, liste des PA, spécifications, amendes) | lois de finances, impots.gouv.fr | liste des PA mise à jour en continu ; spécifications externes en plusieurs versions par an |

## 7. Questions ouvertes

1. **ACRE Cipav** : expliquer le taux de 13,4 % publié (astérisque du tableau Urssaf) au lieu de 11,6 %.
2. **Taux d'intérêt légal** du 2nd semestre 2026, pour les deux catégories de créanciers.
3. **Taux BCE** au 1er juillet 2026.
4. **Prélèvements sociaux 2026** sur les dividendes : confirmer 18,6 % et la liste des exclusions.
5. **Barème IR des revenus 2026** : attendre la loi de finances pour 2027.
6. **Art. 293 B du CGI** : recodification éventuelle au 1er septembre 2026, avec un nouveau libellé pour la mention de franchise.
7. **Seuil de franchise de 25 000 €** pour les travaux immobiliers : prévu par le PLF 2026, non confirmé dans le texte définitif.
8. **Seuils spéciaux** pour les avocats, auteurs et artistes, à confirmer dans le barème BOFiP au 1er juillet 2026.
9. **Taxe pour frais de chambre consulaire** : vérifier les taux.
10. **Facturation électronique** : nombre et URL de la liste des PA, montants des amendes après les LF 2025 et 2026, date d'effet des nouvelles mentions.
11. **Smic 2026** : confirmer le montant et l'absence de revalorisation en cours d'année.
12. **Versement libératoire** : relire les taux de 1 % et 1,7 % sur une page officielle 2026.

## 8. Sources

**Vues pendant la recherche** (extraits de recherche)
- Urssaf, *L'essentiel du statut* : https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut/lessentiel-du-statut.html
- Urssaf, *Taux de cotisations, profession libérale réglementée Cipav* : https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-plr-cipav.html
- Urssaf, *L'Acre* : https://www.urssaf.fr/accueil/exoneration-acre-createur.html
- Urssaf, diaporama *Auto-entrepreneur*, avril 2026 : https://www.urssaf.fr/files/live/sites/urssaffr/files/autres/Diaporama_Auto-entrepreneur.pdf
- Urssaf, *Évolution des taux de cotisations des auto-entrepreneurs* : https://www.urssaf.fr/accueil/actualites/taux-cotisations-autoentrepeneur.html
- Urssaf, *Réforme de l'assiette sociale des indépendants* : https://www.urssaf.fr/accueil/independant/comprendre-payer-cotisations/reforme-cotisations-independants.html
- Urssaf, *Vos cotisations d'indépendant* : https://www.urssaf.fr/accueil/independant/comprendre-payer-cotisations/vos-cotisations.html
- Urssaf, *Taux secteur privé* : https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/taux-cotisations-secteur-prive.html
- Urssaf, *Modalités d'adhésion au versement libératoire en 2026* : https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut/toutes-les-actualites/modalites-dadhesion-au-verseme-2.html
- Légifrance, décret n° 2026-69 du 6 février 2026 : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053449085
- Légifrance, décret n° 2025-943 du 8 septembre 2025 : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000052211971
- Légifrance, loi n° 2026-103 du 19 février 2026 de finances pour 2026 : https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053508155
- Légifrance, art. 197 CGI : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051212954
- economie.gouv.fr, *Montant des cotisations sociales des micro-entreprises* : https://www.economie.gouv.fr/entreprises/gerer-sa-micro-entreprise/micro-entreprises-quel-est-le-montant-de-vos-cotisations-sociales
- economie.gouv.fr, *Versement libératoire* : https://www.economie.gouv.fr/entreprises/gerer-sa-micro-entreprise/micro-entreprise-comment-fonctionne-le-versement-liberatoire-de-limpot-sur-le-revenu
- economie.gouv.fr, *Dépassement des seuils* : https://www.economie.gouv.fr/entreprises/gerer-sa-micro-entreprise/micro-entreprise-que-se-passe-t-il-quand-le-seuil-de-chiffre-daffaires-est-depasse
- economie.gouv.fr, *Loi de finances 2026 pour les particuliers* : https://www.economie.gouv.fr/particuliers/impots-et-fiscalite/gerer-mon-impot-sur-le-revenu/loi-de-finances-2026-ce-qui-change-pour-les-particuliers
- impots.gouv.fr, *Conditions du versement libératoire* : https://www.impots.gouv.fr/professionnel/questions/en-tant-que-micro-entrepreneur-sous-quelles-conditions-puis-je-opter-pour-l
- impots.gouv.fr, *Déclarer ses revenus de micro-entrepreneur* : https://www.impots.gouv.fr/particulier/questions/comment-declarer-les-revenus-provenant-de-mon-activite-dauto-entrepreneur
- impots.gouv.fr, *Plafonds pour rester micro-entrepreneur* : https://www.impots.gouv.fr/professionnel/questions/pour-rester-micro-entrepreneur-quel-montant-de-chiffre-daffaires-ou-de
- impots.gouv.fr, *TVA* : https://www.impots.gouv.fr/professionnel/tva
- impots.gouv.fr, brochure IR 2026, calcul de l'impôt : https://www.impots.gouv.fr/www2/fichiers/documentation/brochure/ir_2026/pdf_som/21-calcul_impot_369a382.pdf
- BOFiP, barème IR : https://bofip.impots.gouv.fr/bofip/2491-PGP.html/identifiant=BOI-IR-LIQ-20-10-20260407
- BOFiP, plafonnement du quotient familial : https://bofip.impots.gouv.fr/bofip/2494-PGP.html/identifiant=BOI-IR-LIQ-20-20-20-20260407
- BOFiP, franchise en base de TVA : https://bofip.impots.gouv.fr/bofip/849-PGP.html/identifiant=BOI-TVA-DECLA-40-10-10-20260701
- BOFiP, régime micro BIC : https://bofip.impots.gouv.fr/bofip/1884-PGP.html/identifiant=BOI-BIC-DECLA-20-20200205
- entreprises.gouv.fr, *Taux de la CFP des micro-entrepreneurs* : https://www.entreprises.gouv.fr/espace-entreprises/faq/mon-entreprise-au-quotidien/quel-est-le-taux-de-contribution-la-formation

**Citées sans avoir été consultées pendant la session** (URL et contenu à revérifier)
- entreprendre.service-public.fr, *Impôt sur les sociétés* (F23575) : https://entreprendre.service-public.fr/vosdroits/F23575
- entreprendre.service-public.fr, *Mentions obligatoires d'une facture* (F31808) : https://entreprendre.service-public.fr/vosdroits/F31808
- service-public.fr, *Smic* (F2300) : https://www.service-public.fr/particuliers/vosdroits/F2300
- service-public.fr, *Taux d'intérêt légal* (F783) : https://www.service-public.fr/particuliers/vosdroits/F783
- impots.gouv.fr, *Facturation électronique* : https://www.impots.gouv.fr/professionnel/je-passe-la-facturation-electronique
- Légifrance, Code général des impôts : https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006069577
- Légifrance, Code de commerce : https://www.legifrance.gouv.fr/codes/id/LEGITEXT000005634379
- Légifrance, Code de la sécurité sociale : https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006073189
- BCE, *Key ECB interest rates* : https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html

## Calendrier fiscal (`data/calendars/fr.json`)

- Urssaf : échéances reportées au jour ouvré suivant (fiche « Déclarer et payer mes cotisations »), changement de périodicité avant le 31 janvier, option pour le versement libératoire avant le 30 septembre.
- CFE : 15 décembre, adhésion au prélèvement à l'échéance jusqu'au 30 novembre (impots.gouv.fr).
- **À revérifier au printemps 2027** : dates limites de la déclaration de revenus 2026 par département (marquées « date estimée ») et date exacte de la CA12 (2e jour ouvré après le 1er mai : 4 mai 2027, estimée).

## Mention de franchise de TVA (mise à jour du 20/10/2026)

- L'ordonnance n° 2025-1247 prévoyait le transfert de la TVA dans le CIBS au 1er septembre 2026 (franchise : art. L. 223-3).
- L'ordonnance n° 2026-671 du 27 juillet 2026 (JO du 28 juillet) l'a **reporté au 1er janvier 2027** et a renuméroté
  les articles : la franchise devient l'art. **L. 233-3** du CIBS (Legifiscal, Bpifrance Création).
- Jusqu'au 31 décembre 2026 : « TVA non applicable, art. 293 B du CGI ». Ensuite : « art. L. 233-3 du CIBS »,
  l'ancienne mention restant tolérée (jusqu'au 30 juin 2028 selon les résumés de l'ordonnance).
- **À vérifier en décembre 2026** sur Légifrance : numéro définitif et durée de la tolérance.
