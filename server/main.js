/*
 * Lancement du serveur des comptes (sans dépendance) : node server/main.js
 * Variables d'environnement : PORT, OF_DB (fichier SQLite), OF_RP_ID (domaine des clés d'accès), OF_ORIGINS (origines
 * autorisées, séparées par des virgules), OF_APP_URL (adresse du site), OF_TRUST_PROXY=1 derrière un proxy.
 * L'envoi réel des emails (étape C5) n'est pas encore branché : sans service d'envoi, le serveur refuse de démarrer
 * hors du mode de test (OF_TEST_MAILER=1 écrit les emails dans la console).
 */
"use strict";
const http = require("node:http");
const { createApp } = require("./lib/app.js");
const { SqliteStore } = require("./lib/store.js");

const env = process.env;
if (env.OF_TEST_MAILER !== "1") {
  console.error("Aucun service d'envoi d'emails configuré (étape C5) : lancer avec OF_TEST_MAILER=1 pour un essai.");
  process.exit(1);
}
const mailer = { async send(m) { console.log(`[email de test] à ${m.to} : ${m.subject}\n${m.text}`); } };
const store = new SqliteStore(env.OF_DB || "comptes.sqlite");
const app = createApp({
  store, mailer,
  config: {
    rpId: env.OF_RP_ID || "localhost",
    origins: (env.OF_ORIGINS || "http://localhost:8080").split(",").map((s) => s.trim()),
    appUrl: env.OF_APP_URL || "http://localhost:8080/outils-freelance",
    accountPaths: { fr: "/fr/compte/" },
    trustProxy: env.OF_TRUST_PROXY === "1",
    log: (e) => console.error(e)
  }
});
const server = http.createServer(app);
server.listen(Number(env.PORT || 8787), () => console.log(`Serveur des comptes sur le port ${server.address().port}`));
// Purge des jetons, défis, sessions et compteurs expirés, toutes les 10 minutes.
setInterval(() => { const t = Date.now(); store.purgeExpired(t, t - 2 * 3600 * 1000).catch((e) => console.error(e)); }, 10 * 60 * 1000).unref();
