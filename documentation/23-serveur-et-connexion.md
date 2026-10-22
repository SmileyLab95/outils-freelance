# 23. Comptes : serveur et connexion (étapes C3 et C4)

Spécification du 22/10/2026, à la demande d'Ismail (« le login pour les utilisateurs et leurs espaces »). Elle
détaille les étapes C3 (serveur) et C4 (interface) de [12](12-specification-comptes.md) et prend la décision
technique **D15**. Ismail a choisi de **décider plus tard** de l'hébergeur et du nom de domaine : le serveur et les
écrans sont donc construits et testés dans l'environnement de travail, **sans mise en ligne** ; ils seront branchés
quand l'hébergeur (comparatif [13](13-comparatif-hebergeurs.md)) et le domaine seront choisis.

## 1. Décision technique (D15)

- **Synchronisation chiffrée de bout en bout** (option C de [12](12-specification-comptes.md) § 4) : l'appareil
  chiffre tout l'Espace avant de l'envoyer ; le serveur ne garde qu'un bloc illisible par compte (le « coffre »).
- **Serveur Node.js sans dépendance externe** (modules `node:http`, `node:crypto`, `node:sqlite`) : rien à mettre à
  jour hors de Node, code entièrement lisible et testé, et portable sur les trois hébergeurs du comparatif (conteneur
  ou instance). Le stockage passe par une interface (`MemoryStore` pour les tests, `SqliteStore` pour un serveur) ;
  un adaptateur PostgreSQL s'ajoutera si l'hébergeur choisi impose une base managée.
- **Envoi des emails** par une interface (`mailer`) : boîte de test dans l'environnement de travail ; service
  d'envoi européen branché à l'étape C5, avec l'hébergeur.

## 2. Connexion

| Point | Règle |
|---|---|
| Création de compte et connexion | Par **lien envoyé par email** (aucun mot de passe) : jeton aléatoire de 256 bits, gardé seulement sous forme d'empreinte (SHA-256), valable **15 minutes**, utilisable **une seule fois**. Le compte est créé à la première vérification d'un lien. |
| Réponse à une demande de lien | Toujours la même, que l'adresse ait un compte ou non (on ne révèle pas qui est inscrit). |
| Clés d'accès (*passkeys*, WebAuthn) | Ajoutées depuis un compte connecté ; connexion ensuite sans email. Algorithmes ES256 et RS256 ; vérification du défi (usage unique, 5 minutes), de l'origine, de l'empreinte de l'identifiant du site (`rpId`), de la présence de l'utilisateur et du compteur de signatures. |
| Session | Jeton aléatoire de 256 bits dans un cookie `HttpOnly`, `Secure`, `SameSite=Strict`, gardé sous forme d'empreinte ; **30 jours** sans activité au plus ; liste des appareils connectés et déconnexion d'un appareil depuis le compte. |
| Requêtes qui modifient | En-tête `X-OF-Request: 1` et origine autorisée exigés (protection contre les requêtes forgées depuis un autre site). |
| Limites | Demandes de lien : 5 par heure et par adresse, 20 par heure et par adresse IP ; tentatives de connexion : 20 par heure et par IP ; réponse 429 avec `Retry-After`. |
| Suppression du compte | Depuis le compte, après une connexion de moins de 15 minutes ; efface tout (coffre, clés, sessions, clés d'accès) ; export préalable proposé. |

## 3. Chiffrement et coffre

- **Clé du compte** : clé AES-GCM de 256 bits tirée au hasard sur le premier appareil ; elle ne quitte jamais
  l'appareil en clair. Elle est gardée sur l'appareil (IndexedDB, clé non exportable) et, **enveloppée**, sur le
  serveur.
- **Code de récupération** : 128 bits aléatoires affichés **une seule fois**, en 26 caractères (alphabet Crockford,
  sans lettres ambiguës, groupés par 4) suivis de 2 caractères de contrôle qui détectent une faute de frappe. La clé
  d'enveloppe est dérivée du code par HKDF-SHA-256 (le code a assez d'entropie pour se passer d'une dérivation lente).
  Sur un nouvel appareil : connexion, puis saisie du code pour ouvrir le coffre. **Sans le code ni un appareil déjà
  connecté, les données chiffrées ne se récupèrent pas** : l'écran le dit et propose d'imprimer ou d'enregistrer le
  code.
- **Coffre** : l'Espace complet (schéma 2) en JSON, compressé puis chiffré (AES-GCM, vecteur aléatoire de 96 bits,
  données associées : identifiant du compte et version). Le serveur garde `{ version, iv, données, taille, date }` ;
  taille maximale 5 Mo.
- **Synchronisation** : l'appareil lit la version du serveur ; si elle a changé depuis sa dernière synchronisation, il
  déchiffre, fusionne avec le moteur de C2 (`engines/espace-sync.js` : base, local, distant), puis renvoie le résultat
  en précisant la version lue (`If-Match`). Si un autre appareil a écrit entre-temps (409), il recommence. Le serveur
  ne voit jamais le contenu.
- **Numérotation** : le serveur ne lit pas les numéros. Deux appareils hors connexion peuvent émettre le même numéro :
  le moteur de C2 garde les deux documents et le signale (régularisation par un avoir). La réservation de numéros
  par le serveur ([12](12-specification-comptes.md) § 3) est abandonnée : elle exigerait que le serveur lise les
  documents.

## 4. Interface de programmation (`/api/v1`, JSON)

| Méthode et chemin | Rôle |
|---|---|
| `POST /auth/link` | Demander un lien de connexion `{ email, lang }` → 202 |
| `POST /auth/verify` | Vérifier le jeton du lien `{ token }` → session ; compte créé s'il n'existait pas |
| `POST /auth/logout` | Fermer la session en cours |
| `POST /auth/passkey/options`, `POST /auth/passkey` | Connexion par clé d'accès |
| `GET /me` | Compte connecté : adresse, date de création, clé enveloppée présente ou non, version du coffre |
| `GET /sessions`, `DELETE /sessions/:id` | Appareils connectés |
| `POST /passkeys/options`, `POST /passkeys`, `GET /passkeys`, `DELETE /passkeys/:id` | Clés d'accès du compte |
| `GET /keys`, `PUT /keys` | Clé du compte enveloppée (écrite une fois ; remplacée seulement avec la version en cours) |
| `GET /vault`, `PUT /vault` | Coffre chiffré (`If-Match` obligatoire pour écrire) |
| `GET /export` | Tout ce que le serveur garde sur le compte (RGPD) |
| `DELETE /account` | Suppression définitive (connexion récente exigée) |
| `GET /health` | État du serveur (sans donnée) |

Erreurs : `{ error: "code" }` avec un code stable (`unauthorized`, `forbidden`, `invalid`, `conflict`, `too_large`,
`rate_limited`, `not_found`) ; les textes sont dans l'interface.

## 5. Interface (C4, page `/fr/compte/`, non publiée avant l'ouverture)

- Créer un compte ou se connecter : adresse email → « Consultez votre boîte » → le lien ouvre la page, qui vérifie le
  jeton.
- Premier appareil : création de la clé, affichage du code de récupération (copier, imprimer, enregistrer),
  confirmation par la saisie de 4 caractères du code, puis envoi de l'Espace local (sans perte ni doublon).
- Nouvel appareil : saisie du code de récupération, puis fusion avec l'Espace local s'il existe.
- Dans l'Espace : état de la synchronisation (« à jour », « hors connexion », « conflits à voir »), conflits listés.
- Réglages du compte : appareils connectés, clés d'accès, export, suppression.
- La page est construite seulement avec l'option de construction des brouillons (`OF_DRAFTS=1`) jusqu'à l'ouverture :
  rien n'apparaît sur le site public.

## 6. Réalisation de C3 (22/10/2026)

- Code dans `server/` ([notice](../server/README.md)) : `lib/app.js` (routes, sessions, limites, protections),
  `lib/webauthn.js` (CBOR, vérification ES256 et RS256), `lib/store.js` (mémoire et SQLite, même contrat),
  `lib/emails.js`, `main.js` (refuse de démarrer sans service d'envoi, hors mode de test).
- Tests (`tests/server/`, 27) : authentificateur logiciel (inscription, connexion, chaque falsification refusée),
  contrat du stockage sur les deux implémentations, API par HTTP sur les deux (comptes, liens, sessions, clés
  d'accès, clé enveloppée, coffre, export, suppression, requêtes forgées, limites, tailles).
- 17 failles réintroduites une à une (en-tête ou origine non vérifiés, lien réutilisable ou sans expiration,
  suppression d'une session ou d'une clé d'un autre compte, défi d'un autre compte, signature ou rpId non vérifiés,
  session sans expiration, suppression sans connexion récente, limite par adresse, coffre écrasé sans version, défi
  de connexion non exigé, coffre sans clé, session non prolongée) : toutes détectées.
- Revue de sécurité : deux corrections avant la fin de l'étape. Deux liens vérifiés en même temps pour une nouvelle
  adresse provoquaient une erreur ; le second retrouve maintenant le compte (test qui force la course). Les clés
  d'accès sont limitées à 20 par compte. Un corps de requête trop gros reçoit bien 413 (la connexion était fermée
  avant la réponse).
- Écarts à la spécification : aucun. Le service d'envoi réel (C5) et l'adaptateur PostgreSQL attendent l'hébergeur.

## 7. Réalisation de C4 (22/10/2026)

- **Brouillons** : `OF_DRAFTS=1 python3 build.py` construit aussi les pages marquées `draft` dans `brouillons/`
  (ignoré par git, jamais publié), avec l'adresse de l'API (`OF_API_URL`, `/api/v1` par défaut) et les scripts
  `draft_scripts` ; le site publié (`docs/`) ne contient ni la page du compte ni la synchronisation.
- **Chiffrement** `engines/compte-crypto.js` (WebCrypto, testé sous Node : `tests/unit/compte-crypto.test.mjs`) :
  code de récupération (chaque faute de frappe d'un code fixe détectée), clé du compte non exportable, coffre
  compressé et chiffré, lié au compte et à la version.
- **Synchronisation** `tools/compte-sync.js` : fusion avec le moteur de C2, réécriture sur la version lue, nouvel
  essai en cas d'écriture concurrente ; refus d'un coffre modifié ou d'une version plus ancienne renvoyée par le
  serveur ; si l'Espace est modifié pendant une synchronisation, nouvelle fusion au lieu d'écraser la saisie.
- **Page `/fr/compte/`** (`tools/compte.js`) : connexion par lien (y compris collé dans un onglet déjà ouvert) ou
  par clé d'accès, code de récupération (copier, enregistrer, imprimer ; vérification des 4 derniers caractères),
  ouverture sur un nouvel appareil, état de la synchronisation et conflits nommés par l'élément concerné,
  appareils, clés d'accès, export, déconnexion (la clé quitte l'appareil, l'Espace reste), suppression.
- **Espace** : stockage au schéma 1 tant qu'aucun compte n'est actif ; données synchronisées au schéma 2, éléments
  marqués supprimés retirés au chargement (la fusion de C2 traite ce retrait comme une suppression) ; dans la
  version en brouillon, ligne d'état et synchronisation à l'ouverture, 3 secondes après chaque modification et au
  retour de la connexion (`tools/espace-compte.js`) ; l'Espace ouvert se recharge après une synchronisation.
- **Parcours navigateur** `tests/e2e/comptes.mjs` (37 vérifications) contre un serveur de test qui sert les
  brouillons et l'API sur la même origine : deux appareils, code de récupération et faute de frappe, conflit,
  synchronisation dans l'Espace, clé d'accès virtuelle, déconnexion à distance, serveur compromis (coffre modifié,
  version plus ancienne), export, suppression ; accessibilité de chaque écran ; captures relues sur ordinateur et
  mobile. 8 erreurs réintroduites dans le code du navigateur, toutes détectées.

## 8. Critères de « terminé »

- **C3** : tests unitaires des briques (jetons, code de récupération, WebAuthn avec un authentificateur logiciel,
  limites) ; tests d'intégration HTTP sur un serveur lancé pour le test : **aucun accès d'un compte aux données d'un
  autre**, lien rejoué ou expiré refusé, session fermée refusée, requête sans en-tête ou d'une autre origine refusée,
  limites, coffre en conflit, taille maximale, JSON malformé ; chaque contrôle vérifié en réintroduisant l'erreur
  qu'il doit détecter ; revue de sécurité du code.
- **C4** : parcours navigateur complet contre un serveur de test (création, code de récupération, deuxième appareil,
  synchronisation et conflit, clé d'accès avec un authentificateur virtuel, suppression), accessibilité, captures
  relues.
- **Mise en ligne** (après les décisions d'Ismail) : hébergeur, domaine, service d'envoi, sauvegardes chiffrées et
  restauration testée, politique de confidentialité mise à jour, CGU relues par un avocat.
