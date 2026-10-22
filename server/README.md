# Serveur des comptes (étape C3)

Serveur de l'API des comptes en ligne : connexion par lien envoyé par email et par clé d'accès (passkey), sessions,
clé du compte enveloppée et coffre chiffré de bout en bout. Spécification :
[documentation/23-serveur-et-connexion.md](../documentation/23-serveur-et-connexion.md).

**Pas encore en ligne** : l'hébergeur et le nom de domaine sont des décisions d'Ismail, en attente
([13](../documentation/13-comparatif-hebergeurs.md)). Le serveur est construit et testé dans l'environnement de travail.

## Contenu

| Fichier | Rôle |
|---|---|
| `lib/app.js` | Routes `/api/v1`, sessions, limites, protections contre les requêtes forgées |
| `lib/webauthn.js` | Clés d'accès : CBOR, données de l'authentificateur, vérification des signatures (ES256, RS256) |
| `lib/store.js` | Stockage : `MemoryStore` (tests) et `SqliteStore` (`node:sqlite`), même interface |
| `lib/emails.js` | Textes des emails (français, anglais) et boîte d'envoi de test |
| `main.js` | Lancement (variables d'environnement ci-dessous) |

Aucune dépendance : Node.js 22 ou plus suffit (`node:sqlite` est encore marqué expérimental dans Node 22).

## Essai local

```sh
OF_TEST_MAILER=1 OF_DB=/tmp/comptes.sqlite PORT=8787 node server/main.js
```

Sans `OF_TEST_MAILER=1`, le serveur refuse de démarrer tant que le service d'envoi d'emails (étape C5) n'est pas
branché : les emails de test s'affichent dans la console.

| Variable | Rôle | Défaut |
|---|---|---|
| `PORT` | Port d'écoute | 8787 |
| `OF_DB` | Fichier SQLite | `comptes.sqlite` |
| `OF_RP_ID` | Domaine des clés d'accès (sans protocole) | `localhost` |
| `OF_ORIGINS` | Origines autorisées, séparées par des virgules | `http://localhost:8080` |
| `OF_APP_URL` | Adresse du site (liens des emails) | `http://localhost:8080/outils-freelance` |
| `OF_TRUST_PROXY` | `1` derrière un proxy (adresse IP lue dans `X-Forwarded-For`) | non |

## Tests

```sh
node --test tests/server/*.test.mjs
```

WebAuthn avec un authentificateur logiciel, contrat du stockage (mémoire et SQLite), API par HTTP sur un serveur
lancé pour le test (aucun accès entre comptes, liens, sessions, limites, tailles, requêtes forgées). Chaque contrôle
de sécurité a été vérifié en réintroduisant la faille qu'il doit détecter.

## Avant la mise en ligne (après les décisions d'Ismail)

- Hébergeur et domaine ; API sur le même site que les pages (cookie `SameSite=Strict`), HTTPS obligatoire.
- Service d'envoi d'emails européen (C5), domaine d'envoi authentifié (SPF, DKIM, DMARC).
- Sauvegardes chiffrées quotidiennes de la base, restauration testée ; purge des données expirées (déjà dans `main.js`).
- Adaptateur PostgreSQL si l'hébergeur impose une base managée ; même contrat de tests que `store.test.mjs`.
- Politique de confidentialité et CGU mises à jour (relecture par un avocat).
