# 53. Activité mixte dans l'Espace : ventes et prestations de services

Suite de la [spécification de l'Espace](09-specification-espace.md) (§ 4 et 5), du
[registre des achats](36-depenses-et-registre-des-achats.md) et de la [trésorerie](39-tresorerie.md). Écrite le
09/11/2026 au soir (décision D59), avant le code, à partir des pages officielles lues le même jour (annexe).

## 1. Besoin

Le profil de l'Espace n'a qu'une activité. Or un micro-entrepreneur peut à la fois **vendre des marchandises** et
**rendre des services** (BIC ou BNC) : c'est l'activité mixte. Il a alors deux plafonds, des taux de cotisations
différents pour chaque part de son chiffre d'affaires, et il doit distinguer les ventes et les prestations dans son
livre des recettes et sur ses factures. Sans cela, l'Espace sous-estime ou surestime ses cotisations, ne surveille
pas le bon plafond et tient un livre des recettes incomplet.

## 2. Règles (lues le 09/11/2026)

| Règle | Contenu | Source |
|---|---|---|
| Définition | Le micro-entrepreneur « peut exercer en même temps plusieurs types d'activités (vente de marchandises, denrées ou location non meublée + prestation de services relevant des BIC ou des BNC) : on parle alors d'activité mixte » | F23267 (Entreprendre.Service-Public) |
| Plafonds 2026-2028 | Chiffre d'affaires HT **global** de 203 100 € au plus, **dont** 83 600 € au plus pour les prestations de services (2023-2025 : 188 700 € et 77 700 €) ; régime perdu après deux années civiles consécutives de dépassement | F23267 ; impots.gouv.fr, « Pour rester micro-entrepreneur, quel montant de chiffre d'affaires… » ; règles `micro_activities` |
| Livre des recettes et factures | « En cas d'activité mixte, les ventes et les prestations de services doivent apparaître distinctement sur le livre-journal présentant le détail des recettes et sur les factures » | BOFiP, BOI-BIC-DECLA-30-30, § 30 ; règle `livre_recettes_micro` |
| Cotisations | Taux propre à chaque activité (12,3 % pour la vente, 21,2 % pour les services BIC, 25,6 % ou 23,2 % pour les libéraux en 2026) ; déclaration des recettes réellement encaissées de la période | F37353 ; règles `micro_activities` |
| Versement libératoire, ACRE | Taux propres à chaque activité (1 %, 1,7 %, 2,2 % ; taux ACRE par activité) | F23267, F11677 ; règles `micro_activities` |
| Formation professionnelle (CFP) | 0,1 % du chiffre d'affaires pour une activité commerciale, 0,3 % artisanale, 0,2 % libérale ; **rien sur l'activité mixte** | F23459 |
| Abattement fiscal | Les abattements de chaque activité s'appliquent à la fraction du chiffre d'affaires correspondante ; abattement minimal doublé, 610 € | F23267 ; BOFiP BOI-BIC-DECLA-20 ; règle `micro_abattement_minimum` |
| Registre des achats | Obligatoire quand le commerce principal est la vente de marchandises ou la fourniture de logement | BOFiP, BOI-BIC-DECLA-30-30, § 40 ; règle `registre_achats` |
| Franchise de TVA | Seuils par catégorie (85 000 € et 93 500 € pour les ventes, 37 500 € et 41 250 € pour les services) ; la règle propre à l'activité mixte est à l'article 293 B du CGI, **non lu** (Légifrance refuse la lecture automatisée ; F21746 et la page d'impots.gouv.fr ne la donnent pas) | impots.gouv.fr ; F21746 ; règle `tva_franchise_seuils` |

## 3. Ce que fait l'Espace

**Profil.** Pour une micro-entreprise, un champ « Seconde activité (activité mixte) » : aucune (par défaut), ou une
activité de l'autre famille. Une activité mixte associe toujours la **vente** (`vente`) et **une** activité de
services (`services_bic`, `artisan`, `liberal_bnc` ou `cipav`), dans un ordre quelconque. Toute autre combinaison
est ignorée (le profil reste à une activité).

**Documents.** La nature de l'opération existe déjà (prestation de services, livraison de biens, biens et
services). Pour un document « biens et services », chaque ligne indique sa nature (« Vente » ou « Service ») ; le
document affiche alors, sous les lignes, le **sous-total HT des ventes** et le **sous-total HT des prestations**
(BOFiP § 30). Une facture « biens et services » ne peut pas être émise tant qu'une ligne n'a pas de nature. Les
avoirs reprennent la nature des lignes de leur facture.

**Générateur de facture public** (ajouté le 09/11/2026 au soir) : pour une opération « Mixte (biens et services) »,
même choix « Vente » ou « Service » sur chaque ligne, avec une aide qui l'explique, et mêmes sous-totaux dans l'aperçu
(moteur commun). La nature des lignes est mémorisée avec la saisie et reprise quand le document passe dans l'Espace
(une nature inconnue est ignorée). Le générateur ne connaît pas l'activité de l'utilisateur : la nature des lignes y
reste facultative.

**Encaissements.** Un encaissement est rattaché aux ventes (facture de biens), aux prestations (facture de services)
ou aux deux (facture mixte) : dans ce dernier cas, il est **réparti au prorata des montants HT** des lignes de
chaque nature (convention D59, aucune source ne fixant la répartition d'un paiement partiel) ; arrondi au centime
sur les ventes, le reste aux prestations.

**Livre des recettes.** En activité mixte, deux colonnes de montant, **Ventes** et **Prestations**, et leurs totaux
à la fin de chaque trimestre et de l'année ; mêmes colonnes dans l'export CSV.

**Déclaration Urssaf.** Le chiffre d'affaires encaissé de la période est donné par activité (ventes, prestations) ;
les cotisations sont estimées avec le taux de chaque activité (taux ACRE et versement libératoire compris). La
CFP n'étant pas définie pour l'activité mixte, l'Espace applique à tout le chiffre d'affaires **le plus élevé** des
taux de CFP des deux activités (lecture la plus prudente, D57) et le dit dans la note d'estimation.

**Plafonds.** Deux jauges : chiffre d'affaires global comparé au plafond de la vente (203 100 €), part des
prestations comparée au plafond des services (83 600 €).

**Franchise de TVA.** En activité mixte, pas de jauge de seuil tant que la règle de l'article 293 B n'est pas lue :
l'Espace affiche l'encaissé des ventes et des prestations de l'année et renvoie vers impots.gouv.fr pour les seuils.

**Trésorerie.** Les cotisations « déjà dues » et prévues ([39](39-tresorerie.md)) sont calculées de la même façon,
part par part ; un encaissement attendu d'une facture mixte est réparti comme un encaissement réel.

**Registre des achats.** Obligatoire dès que l'une des deux activités est la vente.

## 4. Modèle de données (sans changement de schéma)

```
profile.activity2 : "" | "vente" | "services_bic" | "artisan" | "liberal_bnc" | "cipav"   (facultatif)
document.lines[].kind : "biens" | "services"   (facultatif ; lu seulement si document.nature = "mixte")
```

Les deux champs sont facultatifs : les sauvegardes et les données synchronisées existantes restent valables, et un
profil sans seconde activité se comporte exactement comme avant. La fusion de la synchronisation traite déjà le
profil champ par champ et les lignes avec leur document.

## 5. Moteur (`engines/espace-fr.js`)

- `mixedActivities(profile, rules)` : `{ vente, services }` ou `null`.
- `goodsShare(doc)` : part HT des ventes d'un document (1 pour des biens, 0 pour des services, prorata des lignes
  pour un document mixte).
- `ledger(documents, from, to, profile, rules)` : chaque ligne porte `goods` et `services` en activité mixte.
- `revenueParts(documents, profile, rules, from, to)` : chiffre d'affaires encaissé par activité.
- `nextDeclaration` : `parts` (activité, encaissé, taux, cotisations) ; `revenue`, `social`, `vl`, `total` restent
  les totaux.
- `thresholds` : `services: { revenue, ceiling }` et `vatMixed: { goods, services }` (sans seuil) en activité mixte.
- `owed`, `forecast` : cotisations part par part.

## 6. Tests

Unitaires (`tests/unit/espace-mixte.test.mjs`, 10 tests, valeurs calculées à la main) : règles lues ; combinaisons
d'activités admises et refusées ; sous-totaux et natures de lignes du document (nature inconnue ignorée) ; nature
exigée à l'émission en activité mixte seulement ; part des ventes (ligne sans nature avec les prestations) ; livre des
recettes (encaissement de 500 € d'une facture 300 + 700 réparti 150 / 350, avoir de vente en négatif), totaux du
trimestre et export CSV ; déclaration (ventes 650 € × 12,5 % = 81,25 €, prestations 1 350 € × 25,8 % = 348,30 €,
versement libératoire, ACRE) ; plafonds ; trésorerie (déjà dû 429,55 €, prévision du 4e trimestre 340,45 € avec les
encaissements attendus répartis) ; registre des achats. Contrôle par mutation : 21 erreurs réintroduites dans les
moteurs de l'Espace et de la facture, toutes détectées (deux l'ont été après ajout d'assertions). Profil à une
activité : tests existants inchangés. Reprise du générateur : nature des lignes conservée, nature inconnue ignorée
(11 tests en tout).

Parcours navigateur (`tests/e2e/verifier.mjs`, fin du parcours de l'Espace) : seconde activité proposée selon
l'activité, profil enregistré, nature des lignes absente d'une facture de services, émission refusée tant qu'une ligne
n'a pas de nature, aperçu avec « Vente : … », « Service : … » et sous-totaux, encaissement partiel réparti dans le livre
des recettes, note de déclaration par activité, jauges et note sur la TVA, retour à une activité ; accessibilité
(axe-core) de la facture, du livre des recettes et du tableau de bord ; captures relues sur ordinateur et mobile.
Générateur public : pas de nature de ligne pour des services, choix et aide pour une opération mixte, sous-totaux
(1 800 € de ventes, 451,50 € de prestations), accessibilité, nature mémorisée après rechargement, retour aux services.

## 7. Hors champ

Deux activités de services (BIC et BNC) ensemble ; location meublée de tourisme ; seuil de franchise de TVA en
activité mixte (article 293 B à lire) ; impôt sur le revenu (abattements par part, minimum de 610 €) dans
l'Espace.

## Annexe : sources lues le 09/11/2026 (outil « Lire une source officielle »)

| Source | Contenu relevé |
|---|---|
| F23267, Régime fiscal de la micro-entreprise | Définition de l'activité mixte ; seuils 2026 (203 100 €, dont 83 600 € de services) ; abattements cumulés, minimum 610 € |
| impots.gouv.fr, « Pour rester micro-entrepreneur, quel montant de chiffre d'affaires… » | Activité mixte : 203 100 € global, 83 600 € pour la partie services (2026-2028) ; seuils de franchise de TVA par catégorie |
| BOFiP, BOI-BIC-DECLA-30-30, § 30 et 40 | Ventes et prestations distinctes sur le livre-journal et sur les factures ; registre des achats |
| F37353, Régime micro-social | Taux de cotisations par activité ; recettes réellement encaissées |
| F23459, Contribution à la formation professionnelle | 0,1 %, 0,3 %, 0,2 % selon l'activité ; rien sur l'activité mixte |
| F21746, Franchise en base de TVA | Seuils par activité ; pas de règle pour l'activité mixte ; renvoi à l'article 293 B du CGI |
| F36232 | Pas de mention de l'activité mixte |
