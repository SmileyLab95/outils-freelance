# 38. Prospects (Espace entrepreneur)

Troisième module du compte gratuit ([31](31-vision-plateforme.md) § 5, étape 5 ; besoin « Suivre ses prospects » :
mini-CRM, étapes, rappels), dans l'**Espace entrepreneur**, public et local (D30), synchronisé avec les comptes quand
ils ouvriront (D34). Spécification avant le code, 28/10/2026.

## 1. Besoin

Un indépendant suit ses pistes commerciales jusqu'au devis : qui contacter, quand relancer, ce que vaut chaque piste,
ce qui a été gagné ou perdu. Une piste gagnée devient un client et un devis **sans rien recopier**. Les données des
prospects sont des données personnelles (une personne, ou l'interlocuteur dans une entreprise) : le module aide à
respecter les règles de la CNIL (durée de conservation, opposition), sans conseil juridique personnalisé.

## 2. Règles

Toutes lues en entier le 28/10/2026 avec l'outil « Lire une source officielle » (D36), règles dans `data/rules/fr.json`.

| Règle | Source | Usage |
|---|---|---|
| Données d'un prospect non client : conservées **3 ans** à compter de leur collecte ou du **dernier contact émanant du prospect** (une demande de documentation, un clic dans un courriel ; la simple ouverture d'un courriel n'en est pas un). Au terme : reprendre contact pour savoir s'il souhaite continuer à être sollicité ; sans réponse positive et explicite, supprimer (ou archiver selon les dispositions en vigueur) | CNIL, référentiel « gestion des activités commerciales » (PDF, SHA-256 `3b70f8a6…e6e7`) ; `prospects_conservation` | Échanges notés « de sa part » ou « de ma part » : le dernier échange **de sa part** (ou la création de la fiche) fait partir le délai ; rappel des pistes dont le délai est passé, avec « Supprimer » |
| Droit d'opposition à la prospection : **absolu**, simple et gratuit, sans justification ; pris en compte **dans la durée** par une **liste repoussoir**, qui ne sert à rien d'autre, ne garde que les données nécessaires et peut ne garder que des **empreintes** (hachage) de l'adresse ou du numéro ; la CNIL recommande de la conserver **au moins 3 ans** | CNIL, « Comment utiliser une liste repoussoir pour respecter l'opposition à la prospection ? » (10 juin 2026) ; référentiel, § 9 (RGPD, art. 21) ; `prospects_opposition` | « Ne plus contacter » : la fiche est supprimée et remplacée par une entrée de la liste d'opposition qui ne contient que la date et les empreintes SHA-256 de l'email, du téléphone et du nom ; une nouvelle fiche qui correspond déclenche un avertissement |
| Prospection par **email** : particuliers, **consentement préalable** (case non pré-cochée ; les conditions générales ne suffisent pas) ; professionnels, information et opposition simple et gratuite, possible si l'objet est en rapport avec leur profession ; chaque message dit qui l'envoie et permet de refuser simplement les suivants ; adresses génériques d'une société (contact@…) hors de ces règles | CNIL, « La prospection commerciale par courrier électronique, SMS, MMS et automate d'appel » (10 juin 2026 ; CPCE, art. L34-5) ; `prospection_email` | Aide de la fiche, selon le type (professionnel ou particulier) |
| Prospection par **téléphone** depuis le **11 août 2026** : particuliers, **consentement préalable** (sauf contrat en cours et appel en rapport avec lui), valable **un an** au plus, preuve gardée **au moins 3 ans** ; appels du lundi au vendredi, de 10 h à 13 h et de 14 h à 20 h ; rappel d'un particulier qui l'a demandé sous **5 jours ouvrables**, sur l'objet demandé ; professionnels : information et opposition simple et gratuite | CNIL, « Prospection commerciale par téléphone (hors automate d'appel) : quelles sont les règles ? » (10 juin 2026 ; Code de la consommation, art. L223-1, loi du 30 juin 2025 ; décret n° 2026-662 du 23 juillet 2026) ; `prospection_telephone` | Aide de la fiche, selon le type |

L'aide rappelle ces règles générales et renvoie aux fiches de la CNIL ; elle ne dit jamais qu'une prospection donnée
est permise. Le module n'envoie rien : le bouton « Écrire » ouvre la messagerie de l'appareil.

## 3. Données

Deux nouvelles listes de l'Espace (aucune donnée envoyée sans compte) :

- `prospects` : `{ id, name, contact, email, phone, pro (vrai : professionnel), source, stage, value (montant estimé HT,
  facultatif), nextDate (prochaine relance), nextAction, notes, clientId, exchanges, createdAt, updatedAt }`.
  - `stage` : `new` (À contacter), `talks` (En discussion), `quote` (Devis envoyé), `won` (Gagné), `lost` (Perdu).
  - `exchanges` : `[{ id, date, from ("me" | "them"), text }]`, du plus ancien au plus récent ; date aujourd'hui au plus.
- `optouts` (liste d'opposition) : `{ id, date, hashes: ["e:…", "t:…", "n:…"], createdAt, updatedAt }`. Empreinte =
  SHA-256 (hexadécimal) du texte normalisé, préfixé du type : email en minuscules sans espaces ; téléphone réduit à ses
  chiffres, indicatif français ramené au 0 (« +33 6 12… », « 0033 6… » et « 06 12… » donnent la même empreinte) ; nom
  en minuscules, sans accents ni ponctuation, espaces resserrés.
- Devis : nouveau champ facultatif `prospectId` (devis fait depuis une piste).

**Étape affichée** (calculée, une seule source de vérité : le devis fait foi) :

1. « Gagné » ou « Perdu » choisis par l'utilisateur : gardés tels quels.
2. Sinon, un devis lié **accepté** (ou déjà facturé) : « Gagné ».
3. Sinon, un devis lié **émis** : « Devis envoyé » (refusé : la piste reste à « Devis envoyé », avec l'état du devis ;
   l'utilisateur choisit « Perdu » ou fait un autre devis).
4. Sinon l'étape choisie, au moins « En discussion » dès qu'un échange est noté.

Les étapes en dessous de l'étape calculée sont grisées dans la liste de choix.

**Valeur** d'une piste : montant HT du dernier devis émis s'il y en a un, sinon le montant estimé.

**Relance due** : piste ouverte (À contacter, En discussion, Devis envoyé), date de relance aujourd'hui ou passée.

**Conservation** : pour une piste non gagnée, départ = date du dernier échange « de sa part », sinon date de création ;
échéance = départ + 3 ans (un 29 février donne le 28 février) ; rappel le jour de l'échéance et après.

Synchronisation : `prospects` fusionnée comme les clients, les échanges comme les encaissements d'une facture (par
identifiant, ajout des deux côtés conservé) ; `optouts` fusionnée comme les dépenses ; comptes pas encore ouverts :
schéma 2 inchangé (D34). Sauvegarde : listes facultatives, contrôlées à l'import (anciennes sauvegardes acceptées).

## 4. Écrans

### 4.1 « Prospects » (`#/prospects`)

- En tête : « + Prospect », « Exporter (CSV) ».
- Résumé : nombre de pistes ouvertes et valeur totale ; relances dues.
- **À relancer** : pistes dont la relance est due, la plus ancienne en haut (date, nom, prochaine action).
- **Pistes ouvertes**, par étape (À contacter, En discussion, Devis envoyé), chacune avec son nombre et sa valeur ;
  colonnes sur ordinateur, sections l'une sous l'autre sur mobile ; chaque piste : nom, interlocuteur, valeur,
  prochaine relance. Pas de glisser-déposer (l'étape se change dans la fiche, au clavier comme à la souris).
- **Gagnés** et **Perdus** repliés, avec leur nombre et leur valeur.
- **Conservation** (s'il y a lieu) : pistes sans contact de leur part depuis 3 ans, avec la règle et « Supprimer ».
- **Liste d'opposition** : nombre d'entrées et explication (aucune identité affichée : seules des empreintes sont
  gardées).
- Aide : règles du § 2 en bref, liens vers les fiches de la CNIL et les modèles d'emails de prospection.

### 4.2 Fiche (`#/prospects/nouveau`, `#/prospects/<id>`)

- Champs : nom (entreprise ou personne, obligatoire), interlocuteur, type (professionnel ou particulier), email,
  téléphone, origine (liste de suggestions : recommandation, réseau, site web, réseaux sociaux, salon, plateforme,
  prospection directe), étape, valeur estimée HT, prochaine relance (date et action), notes.
- Une fiche qui correspond à la liste d'opposition (même email, même téléphone ou même nom) : avertissement à
  l'enregistrement (« … a demandé le JJ/MM/AAAA à ne plus être sollicité ») avec « Enregistrer quand même » (s'il vous
  recontacte, vous pouvez lui répondre) et « Retirer de la liste d'opposition » (seulement s'il vous a de nouveau
  donné son accord).
- Fiche existante :
  - **Échanges** : liste et ajout rapide (date, de ma part ou de sa part, résumé) ; dernier contact de sa part rappelé.
  - **Client** : « Créer le client » (formulaire client prérempli : nom, type, email, interlocuteur et téléphone dans
    les notes) ou lien vers le client ; « Lier à un client existant » par la liste des clients.
  - **Devis** : « Faire un devis » (client créé d'abord s'il manque ; devis en brouillon lié à la piste) ; devis liés
    avec leur état.
  - « Écrire » (lien `mailto:`), « Ne plus contacter » (avec confirmation : la fiche est supprimée, l'opposition
    gardée), « Supprimer ».
  - Aide selon le type : règles de l'email et du téléphone pour un professionnel ou un particulier.

### 4.3 Ailleurs

- Navigation de l'Espace : onglet **Prospects**, avant Clients.
- Tableau de bord : rappel « Prospects à relancer » (nombre) et rappel de conservation, avec un lien, s'il y en a.
- Brouillon de devis fait depuis une piste : mention « Devis pour la piste … » ; à l'émission, l'étape suit (§ 3).
- Page de l'Espace : mention du module.

## 5. Tests

- Moteur (`espace-fr.js`) : contrôles de saisie (nom, email, valeur, date de relance, échange daté dans le futur ou sans
  résumé), étape calculée (chaque règle du § 3 et leur ordre), valeur (devis émis le plus récent, sinon estimation),
  pipeline, relances dues (bornes, pistes closes exclues), conservation (départ, 3 ans, 29 février, pistes gagnées
  exclues), normalisation des empreintes (email, téléphones français, nom), CSV ; chaque test vérifié en
  réintroduisant l'erreur qu'il doit détecter.
- Stockage : sauvegarde avec et sans prospects ni opposition ; prospect, échange ou entrée illisibles refusés.
  Synchronisation : ajouts des deux côtés, échanges ajoutés sur deux appareils, suppression et modification croisées,
  opposition.
- Parcours navigateur : création, erreurs, échanges, étapes, relance due et rappel du tableau de bord, client créé,
  devis fait et émis (étape « Devis envoyé »), accepté (« Gagné »), perte, opposition (fiche supprimée, empreintes
  seules dans les données, avertissement sur une nouvelle fiche, retrait), conservation, export CSV, accessibilité,
  mobile.
