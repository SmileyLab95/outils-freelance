// Serveur des comptes (server/lib/app.js) testé par HTTP, sur un vrai serveur lancé pour le test : parcours de
// connexion, clés d'accès, clé enveloppée et coffre, et chaque protection de la spécification
// (documentation/23-serveur-et-connexion.md, § 2 et § 6) : aucun accès d'un compte aux données d'un autre, liens à
// usage unique et limités dans le temps, requêtes forgées refusées, limites, tailles.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";
import { SoftAuthenticator } from "./authenticator.mjs";

const require = createRequire(import.meta.url);
const { createApp } = require("../../server/lib/app.js");
const { MemoryStore, SqliteStore } = require("../../server/lib/store.js");
const { MemoryMailer } = require("../../server/lib/emails.js");
process.removeAllListeners("warning");

const ORIGIN = "https://outils.example", RP_ID = "outils.example";
const MIN = 60000, DAY = 24 * 60 * MIN;

async function start(makeStore = () => new MemoryStore(), limits, accountPaths = { fr: "/fr/compte/", en: "/uk/account/" }) {
  const clock = { t: Date.UTC(2026, 9, 22, 12) };
  const store = makeStore(), mailer = new MemoryMailer();
  const app = createApp({ store, mailer, now: () => clock.t,
    config: { rpId: RP_ID, origins: [ORIGIN], appUrl: ORIGIN, accountPaths, limits } });
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const close = () => new Promise((r) => { server.close(r); store.close(); });
  return { clock, store, mailer, port, close, device: () => new Device(port) };
}

/** Un navigateur : garde son cookie de session, envoie l'origine et l'en-tête du site (sauf si on les retire). */
class Device {
  constructor(port) { this.port = port; this.cookie = null; }
  req(method, path, { body, raw, headers = {}, origin = ORIGIN, site = true, contentType = "application/json" } = {}) {
    return new Promise((resolve, reject) => {
      const data = raw !== undefined ? Buffer.from(raw) : body !== undefined ? Buffer.from(JSON.stringify(body)) : null;
      const h = { ...headers };
      if (origin) h.Origin = origin;
      if (site && method !== "GET") h["X-OF-Request"] = "1";
      if (data) { h["Content-Type"] = contentType; h["Content-Length"] = data.length; }
      if (this.cookie) h.Cookie = this.cookie;
      const r = http.request({ host: "127.0.0.1", port: this.port, method, path: "/api/v1" + path, headers: h }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const setCookie = res.headers["set-cookie"];
          if (setCookie) { const v = setCookie[0].split(";")[0]; this.cookie = v.endsWith("=") ? null : v; }
          resolve({ status: res.statusCode, headers: res.headers, body: text ? JSON.parse(text) : null, setCookie });
        });
      });
      r.on("error", reject);
      if (data) r.write(data);
      r.end();
    });
  }
  /** Connexion complète par lien : demande, lecture de l'email, vérification. */
  async signIn(env, email) {
    assert.equal((await this.req("POST", "/auth/link", { body: { email, lang: "fr" } })).status, 202);
    const token = /#token=([A-Za-z0-9_-]+)/.exec(env.mailer.last(email.trim().toLowerCase()).text)[1];
    return this.req("POST", "/auth/verify", { body: { token } });
  }
}

const KEYS = { kdf: "hkdf-sha256", salt: "c2FsdHNhbHRzYWx0c2FsdA", wrapped: { iv: "aXZpdml2aXZpdml2", data: "d3JhcHBlZGtleXdyYXBwZWRrZXl3cmFwcGVkaw" } };
const VAULT = (n) => ({ iv: "dml2aXZpdml2aXZp", data: Buffer.from("coffre chiffré " + n).toString("base64url") });

for (const [name, makeStore] of [["mémoire", () => new MemoryStore()], ["SQLite", () => new SqliteStore(":memory:")]]) {
  test(`${name} : création de compte par lien, email, session, déconnexion`, async () => {
    const env = await start(makeStore);
    try {
      const phone = env.device();
      const r = await phone.signIn(env, "  Camille@Exemple.FR ");
      assert.equal(r.status, 200);
      assert.equal(r.body.created, true);
      assert.equal(r.body.account.email, "camille@exemple.fr");
      assert.match(r.setCookie[0], /^of_session=[A-Za-z0-9_-]{43}; Path=\/api\/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000$/);
      const mail = env.mailer.last("camille@exemple.fr");
      assert.match(mail.subject, /lien de connexion/);
      assert.match(mail.text, /https:\/\/outils\.example\/fr\/compte\/#token=/);
      assert.match(mail.text, /15 minutes/);
      assert.equal((await phone.req("GET", "/me")).body.email, "camille@exemple.fr");

      // Deuxième appareil : même compte, pas de nouveau compte.
      const laptop = env.device();
      const again = await laptop.signIn(env, "camille@exemple.fr");
      assert.equal(again.body.created, false);
      assert.equal(again.body.account.id, r.body.account.id);
      const sessions = (await laptop.req("GET", "/sessions")).body.sessions;
      assert.deepEqual(sessions.map((s) => s.current), [false, true]);

      // Déconnexion : cookie effacé, ancienne session refusée.
      const old = laptop.cookie;
      const out = await laptop.req("POST", "/auth/logout");
      assert.equal(out.status, 204);
      assert.match(out.setCookie[0], /Max-Age=0/);
      laptop.cookie = old;
      assert.equal((await laptop.req("GET", "/me")).status, 401);
      // Fermer la session d'un autre appareil depuis le téléphone.
      const third = env.device();
      await third.signIn(env, "camille@exemple.fr");
      const thirdId = (await third.req("GET", "/sessions")).body.sessions.find((s) => s.current).id;
      assert.equal((await phone.req("DELETE", "/sessions/" + thirdId)).status, 204);
      assert.equal((await third.req("GET", "/me")).status, 401);
    } finally { await env.close(); }
  });

  test(`${name} : liens à usage unique, expirés après 15 minutes, réponse identique avec ou sans compte`, async () => {
    const env = await start(makeStore);
    try {
      const d = env.device();
      await d.signIn(env, "a@x.fr");
      // Même réponse pour une adresse inscrite ou non (aucune information sur les inscrits).
      const known = await env.device().req("POST", "/auth/link", { body: { email: "a@x.fr" } });
      const unknown = await env.device().req("POST", "/auth/link", { body: { email: "inconnu@x.fr" } });
      assert.deepEqual([known.status, known.body], [unknown.status, unknown.body]);
      // Usage unique.
      const token = /#token=([A-Za-z0-9_-]+)/.exec(env.mailer.last("a@x.fr").text)[1];
      assert.equal((await env.device().req("POST", "/auth/verify", { body: { token } })).status, 200);
      assert.deepEqual((await env.device().req("POST", "/auth/verify", { body: { token } })).body, { error: "invalid_link" });
      // Expiré.
      await env.device().req("POST", "/auth/link", { body: { email: "a@x.fr" } });
      const late = /#token=([A-Za-z0-9_-]+)/.exec(env.mailer.last("a@x.fr").text)[1];
      env.clock.t += 15 * MIN;
      assert.deepEqual((await env.device().req("POST", "/auth/verify", { body: { token: late } })).body, { error: "invalid_link" });
      // Jeton inventé, ou mal formé.
      assert.equal((await env.device().req("POST", "/auth/verify", { body: { token: "A".repeat(43) } })).status, 400);
      assert.equal((await env.device().req("POST", "/auth/verify", { body: { token: "<script>" } })).status, 400);
      assert.equal((await env.device().req("POST", "/auth/link", { body: { email: "pas-une-adresse" } })).status, 400);
    } finally { await env.close(); }
  });

  test(`${name} : aucun accès d'un compte aux données d'un autre`, async () => {
    const env = await start(makeStore);
    try {
      const a = env.device(), b = env.device();
      await a.signIn(env, "a@x.fr");
      await b.signIn(env, "b@x.fr");
      assert.equal((await a.req("PUT", "/keys", { body: KEYS, headers: { "If-Match": "0" } })).status, 200);
      assert.equal((await a.req("PUT", "/vault", { body: VAULT("A"), headers: { "If-Match": "0" } })).status, 200);
      // B ne voit ni la clé ni le coffre de A, et n'écrit que chez lui.
      assert.equal((await b.req("GET", "/keys")).status, 404);
      assert.equal((await b.req("GET", "/vault")).status, 404);
      assert.equal((await b.req("PUT", "/vault", { body: VAULT("B"), headers: { "If-Match": "0" } })).body.error, "no_keys");
      assert.equal((await b.req("PUT", "/keys", { body: KEYS, headers: { "If-Match": "0" } })).status, 200);
      assert.equal((await b.req("PUT", "/vault", { body: VAULT("B"), headers: { "If-Match": "0" } })).status, 200);
      assert.equal(Buffer.from((await a.req("GET", "/vault")).body.data, "base64url").toString(), "coffre chiffré A");
      assert.equal(Buffer.from((await b.req("GET", "/vault")).body.data, "base64url").toString(), "coffre chiffré B");
      // Sessions et clés d'accès de A : invisibles et impossibles à supprimer pour B.
      const aSession = (await a.req("GET", "/sessions")).body.sessions[0].id;
      assert.equal((await b.req("DELETE", "/sessions/" + aSession)).status, 404);
      assert.equal((await a.req("GET", "/me")).status, 200);
      assert.ok((await b.req("GET", "/sessions")).body.sessions.every((s) => s.id !== aSession));
      const auth = new SoftAuthenticator();
      const options = (await a.req("POST", "/passkeys/options")).body;
      await a.req("POST", "/passkeys", { body: { credential: auth.create({ challenge: options.challenge, origin: ORIGIN, rpId: RP_ID }), name: "Téléphone" } });
      const keyId = (await a.req("GET", "/passkeys")).body.passkeys[0].id;
      assert.equal((await b.req("DELETE", "/passkeys/" + keyId)).status, 404);
      assert.deepEqual((await b.req("GET", "/passkeys")).body.passkeys, []);
      // Un défi d'inscription émis pour A ne sert pas à B.
      const forA = (await a.req("POST", "/passkeys/options")).body;
      const stolen = await b.req("POST", "/passkeys", { body: { credential: new SoftAuthenticator().create({ challenge: forA.challenge, origin: ORIGIN, rpId: RP_ID }) } });
      assert.equal(stolen.status, 400);
      // Export : seulement les données du compte, sans empreinte de jeton.
      const exp = (await b.req("GET", "/export")).body;
      assert.equal(exp.account.email, "b@x.fr");
      assert.equal(exp.passkeys.length, 0);
      assert.ok(!JSON.stringify(exp).includes('"hash"'));
      assert.equal(Buffer.from(exp.vault.data, "base64url").toString(), "coffre chiffré B");
    } finally { await env.close(); }
  });

  test(`${name} : clé enveloppée et coffre : version lue exigée, conflits, formes et tailles`, async () => {
    const env = await start(makeStore);
    try {
      const d = env.device();
      await d.signIn(env, "a@x.fr");
      assert.equal((await d.req("PUT", "/keys", { body: KEYS })).status, 428, "If-Match obligatoire");
      assert.equal((await d.req("PUT", "/keys", { body: { ...KEYS, kdf: "md5" }, headers: { "If-Match": "0" } })).status, 400);
      assert.equal((await d.req("PUT", "/keys", { body: { ...KEYS, wrapped: { iv: "x", data: "<>" } }, headers: { "If-Match": "0" } })).status, 400);
      assert.deepEqual((await d.req("PUT", "/keys", { body: KEYS, headers: { "If-Match": "0" } })).body, { version: 1 });
      assert.deepEqual((await d.req("PUT", "/keys", { body: KEYS, headers: { "If-Match": "0" } })).body, { error: "conflict", version: 1 });
      assert.deepEqual((await d.req("GET", "/keys")).body, { version: 1, ...KEYS });

      assert.deepEqual((await d.req("PUT", "/vault", { body: VAULT(1), headers: { "If-Match": "0" } })).body, { version: 1 });
      // Un autre appareil a écrit entre-temps : 409 avec la version en cours, puis écriture sur cette version.
      assert.deepEqual((await d.req("PUT", "/vault", { body: VAULT(2), headers: { "If-Match": "0" } })).body, { error: "conflict", version: 1 });
      assert.deepEqual((await d.req("PUT", "/vault", { body: VAULT(2), headers: { "If-Match": '"1"' } })).body, { version: 2 });
      const v = (await d.req("GET", "/vault")).body;
      assert.deepEqual([v.version, v.size, v.updatedAt], [2, "coffre chiffré 2".length + 1, env.clock.t]);
      // JSON malformé, mauvais type de contenu, champs invalides, trop gros.
      assert.equal((await d.req("PUT", "/vault", { raw: "{pas du json", headers: { "If-Match": "2" } })).status, 400);
      assert.equal((await d.req("PUT", "/vault", { raw: "[]", headers: { "If-Match": "2" } })).status, 400);
      assert.equal((await d.req("PUT", "/vault", { body: VAULT(3), contentType: "text/plain", headers: { "If-Match": "2" } })).status, 400);
      assert.equal((await d.req("PUT", "/vault", { body: { iv: "a b", data: "x" }, headers: { "If-Match": "2" } })).status, 400);
      const big = { iv: "dml2aXZpdml2aXZp", data: Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64url") };
      assert.equal((await d.req("PUT", "/vault", { body: big, headers: { "If-Match": "2" } })).status, 413);
      assert.equal((await d.req("POST", "/auth/link", { raw: JSON.stringify({ email: "a@x.fr", pad: "x".repeat(70000) }) })).status, 413);
      assert.equal((await d.req("GET", "/vault")).body.version, 2, "coffre inchangé");
    } finally { await env.close(); }
  });

  test(`${name} : clés d'accès : inscription, connexion sans email, défi à usage unique`, async () => {
    const env = await start(makeStore);
    try {
      const d = env.device();
      const account = (await d.signIn(env, "a@x.fr")).body.account;
      const auth = new SoftAuthenticator({ counter: 1 });
      const options = (await d.req("POST", "/passkeys/options")).body;
      assert.equal(options.rp.id, RP_ID);
      assert.equal(options.user.name, "a@x.fr");
      const created = await d.req("POST", "/passkeys", { body: { credential: auth.create({ challenge: options.challenge, origin: ORIGIN, rpId: RP_ID }), name: "  Téléphone  " } });
      assert.equal(created.status, 201);
      assert.equal(created.body.name, "Téléphone");
      // Même défi rejoué : refusé ; même clé enregistrée deux fois : conflit, et elle est exclue des options.
      assert.equal((await d.req("POST", "/passkeys", { body: { credential: auth.create({ challenge: options.challenge, origin: ORIGIN, rpId: RP_ID }) } })).status, 400);
      const again = (await d.req("POST", "/passkeys/options")).body;
      assert.deepEqual(again.excludeCredentials.map((c) => c.id), [created.body.id]);
      assert.equal((await d.req("POST", "/passkeys", { body: { credential: auth.create({ challenge: again.challenge, origin: ORIGIN, rpId: RP_ID }) } })).status, 409);

      // Connexion sur un nouvel appareil avec la clé d'accès.
      const other = env.device();
      const login = (await other.req("POST", "/auth/passkey/options")).body;
      const assertion = auth.get({ challenge: login.challenge, origin: ORIGIN, rpId: RP_ID });
      const ok = await other.req("POST", "/auth/passkey", { body: { credential: assertion } });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.account.id, account.id);
      assert.equal((await other.req("GET", "/sessions")).body.sessions.find((s) => s.current).method, "passkey");
      // Défi rejoué, défi inventé (bien formé ; mal formé : 400), clé inconnue, mauvaise origine : refusés.
      assert.equal((await env.device().req("POST", "/auth/passkey", { body: { credential: assertion } })).status, 401);
      assert.equal((await env.device().req("POST", "/auth/passkey", { body: { credential: auth.get({ challenge: "RGVmaUludmVudGU", origin: ORIGIN, rpId: RP_ID }) } })).status, 401);
      assert.equal((await env.device().req("POST", "/auth/passkey", { body: { credential: auth.get({ challenge: "inventé", origin: ORIGIN, rpId: RP_ID }) } })).status, 400);
      const fresh = (await env.device().req("POST", "/auth/passkey/options")).body;
      assert.equal((await env.device().req("POST", "/auth/passkey", { body: { credential: new SoftAuthenticator().get({ challenge: fresh.challenge, origin: ORIGIN, rpId: RP_ID }) } })).status, 401);
      const fresh2 = (await env.device().req("POST", "/auth/passkey/options")).body;
      assert.equal((await env.device().req("POST", "/auth/passkey", { body: { credential: auth.get({ challenge: fresh2.challenge, origin: "https://pirate.example", rpId: RP_ID }) } })).status, 401);
      // Défi expiré (5 minutes).
      const slow = (await env.device().req("POST", "/auth/passkey/options")).body;
      env.clock.t += 5 * MIN;
      assert.equal((await env.device().req("POST", "/auth/passkey", { body: { credential: auth.get({ challenge: slow.challenge, origin: ORIGIN, rpId: RP_ID }) } })).status, 401);
      // Clé supprimée : plus de connexion avec elle.
      assert.equal((await d.req("DELETE", "/passkeys/" + created.body.id)).status, 204);
      const after = (await env.device().req("POST", "/auth/passkey/options")).body;
      assert.equal((await env.device().req("POST", "/auth/passkey", { body: { credential: auth.get({ challenge: after.challenge, origin: ORIGIN, rpId: RP_ID }) } })).status, 401);
    } finally { await env.close(); }
  });

  test(`${name} : sessions expirées après 30 jours sans activité, prolongées par l'usage ; suppression du compte`, async () => {
    const env = await start(makeStore);
    try {
      const d = env.device();
      await d.signIn(env, "a@x.fr");
      env.clock.t += 29 * DAY;
      assert.equal((await d.req("GET", "/me")).status, 200, "utilisée avant 30 jours : prolongée");
      env.clock.t += 29 * DAY;
      assert.equal((await d.req("GET", "/me")).status, 200);
      env.clock.t += 30 * DAY;
      assert.equal((await d.req("GET", "/me")).status, 401, "30 jours sans activité");

      // Suppression : connexion de moins de 15 minutes exigée.
      await d.signIn(env, "a@x.fr");
      await d.req("PUT", "/keys", { body: KEYS, headers: { "If-Match": "0" } });
      const other = env.device();
      await other.signIn(env, "a@x.fr");
      env.clock.t += 16 * MIN;
      assert.deepEqual((await d.req("DELETE", "/account")).body, { error: "reauth" });
      const firstId = (await d.req("GET", "/me")).body.id;
      await d.signIn(env, "a@x.fr");
      const del = await d.req("DELETE", "/account");
      assert.equal(del.status, 204);
      assert.match(del.setCookie[0], /Max-Age=0/);
      assert.equal((await other.req("GET", "/me")).status, 401, "toutes les sessions fermées");
      // L'adresse peut recréer un compte, vide.
      const re = await env.device().signIn(env, "a@x.fr");
      assert.equal(re.body.created, true);
      assert.notEqual(re.body.account.id, firstId);
      assert.equal(re.body.account.keysVersion, 0);
    } finally { await env.close(); }
  });

  test(`${name} : préférences : langue de l'inscription, lettre d'information choisie, datée, retirée ; export`, async () => {
    const env = await start(makeStore);
    try {
      const phone = env.device(), other = env.device();
      const created = await phone.signIn(env, "camille@exemple.fr");
      assert.deepEqual(created.body.account.prefs, { lang: "fr", newsletter: { value: false, at: null, wording: null } },
        "compte nouveau : langue de l'inscription, aucune lettre d'information sans choix");
      const t0 = env.clock.t;
      let r = await phone.req("PUT", "/me/prefs", { body: { newsletter: { value: true, wording: "fr-2026-10-23" } } });
      assert.equal(r.status, 200);
      assert.deepEqual(r.body.prefs, { lang: "fr", newsletter: { value: true, at: t0, wording: "fr-2026-10-23" } });
      assert.deepEqual((await phone.req("GET", "/me")).body.prefs.newsletter, { value: true, at: t0, wording: "fr-2026-10-23" });
      env.clock.t += DAY;
      r = await phone.req("PUT", "/me/prefs", { body: { newsletter: { value: false, wording: "fr-2026-10-23" } } });
      assert.deepEqual(r.body.prefs.newsletter, { value: false, at: t0 + DAY, wording: "fr-2026-10-23" }, "retrait daté");
      r = await phone.req("PUT", "/me/prefs", { body: { lang: "en" } });
      assert.deepEqual([r.status, r.body.prefs.lang, r.body.prefs.newsletter.value], [200, "en", false], "langue seule, choix gardé");

      for (const body of [{}, { lang: "de" }, { lang: 3 }, { other: 1 }, { lang: "fr", other: 1 }, { newsletter: true },
        { newsletter: { value: "oui", wording: "fr-2026-10-23" } }, { newsletter: { value: true } }, { newsletter: { value: true, wording: "Texte libre !" } },
        { newsletter: { value: true, wording: "x".repeat(41) } }, { newsletter: null }]) {
        assert.equal((await phone.req("PUT", "/me/prefs", { body })).status, 400, JSON.stringify(body));
      }
      assert.equal((await phone.req("GET", "/me")).body.prefs.lang, "en", "requêtes refusées sans effet");
      assert.equal((await other.req("PUT", "/me/prefs", { body: { lang: "fr" } })).status, 401, "sans session");
      assert.equal((await phone.req("PUT", "/me/prefs", { body: { lang: "fr" }, site: false })).status, 403, "sans l'en-tête du site");
      assert.equal((await phone.req("PUT", "/me/prefs", { body: { lang: "fr" }, origin: "https://autre.example" })).status, 403, "autre site");

      await other.signIn(env, "dominique@exemple.fr");
      assert.equal((await other.req("GET", "/me")).body.prefs.newsletter.value, false, "préférences propres à chaque compte");
      const exp = (await phone.req("GET", "/export")).body;
      assert.deepEqual(exp.prefs, { lang: "en", newsletter: { value: false, at: t0 + DAY, wording: "fr-2026-10-23" } }, "export");

      const again = await phone.signIn(env, "camille@exemple.fr");
      assert.deepEqual([again.body.created, again.body.account.prefs.lang], [false, "en"], "reconnexion : préférences gardées");
    } finally { await env.close(); }
    // Langue sans page de compte sur ce serveur : refusée (les emails renverraient vers une page inexistante).
    const frOnly = await start(makeStore, undefined, { fr: "/fr/compte/" });
    try {
      const d = frOnly.device();
      await d.signIn(frOnly, "camille@exemple.fr");
      assert.equal((await d.req("PUT", "/me/prefs", { body: { lang: "en" } })).status, 400);
    } finally { await frOnly.close(); }
  });
}

/** Stockage qui retient les lectures « compte absent » jusqu'à ce que deux requêtes y soient : course garantie. */
class RacingStore extends SqliteStore {
  constructor() { super(":memory:"); this.waiting = []; }
  async accountByEmail(email) {
    const found = await super.accountByEmail(email);
    if (found || this.waiting === null) return found;
    await new Promise((resolve) => {
      this.waiting.push(resolve);
      if (this.waiting.length === 2) { this.waiting.forEach((r) => r()); this.waiting = null; }
    });
    return found;
  }
}

test("deux liens vérifiés en même temps pour une nouvelle adresse : un seul compte ; 20 clés d'accès au plus", async () => {
  const env = await start(() => new RacingStore());
  try {
    const d1 = env.device(), d2 = env.device();
    for (const d of [d1, d2]) await d.req("POST", "/auth/link", { body: { email: "n@x.fr" } });
    const [t1, t2] = env.mailer.outbox.map((m) => /#token=([A-Za-z0-9_-]+)/.exec(m.text)[1]);
    const [r1, r2] = await Promise.all([d1.req("POST", "/auth/verify", { body: { token: t1 } }), d2.req("POST", "/auth/verify", { body: { token: t2 } })]);
    assert.deepEqual([r1.status, r2.status], [200, 200]);
    assert.equal(r1.body.account.id, r2.body.account.id);
    assert.deepEqual([r1.body.created, r2.body.created].sort(), [false, true]);
    for (let i = 0; i < 20; i++) {
      const o = (await d1.req("POST", "/passkeys/options")).body;
      assert.equal((await d1.req("POST", "/passkeys", { body: { credential: new SoftAuthenticator().create({ challenge: o.challenge, origin: ORIGIN, rpId: RP_ID }) } })).status, 201);
    }
    const o = (await d1.req("POST", "/passkeys/options")).body;
    assert.equal((await d1.req("POST", "/passkeys", { body: { credential: new SoftAuthenticator().create({ challenge: o.challenge, origin: ORIGIN, rpId: RP_ID }) } })).status, 409);
  } finally { await env.close(); }
});

test("requêtes forgées depuis un autre site, en-tête manquant, préflight, routes inconnues", async () => {
  const env = await start();
  try {
    const d = env.device();
    await d.signIn(env, "a@x.fr");
    assert.equal((await d.req("PUT", "/keys", { body: KEYS, headers: { "If-Match": "0" }, site: false })).status, 403, "sans X-OF-Request");
    assert.equal((await d.req("PUT", "/keys", { body: KEYS, headers: { "If-Match": "0" }, origin: "https://pirate.example" })).status, 403);
    assert.equal((await d.req("PUT", "/keys", { body: KEYS, headers: { "If-Match": "0" }, origin: null })).status, 403, "sans origine");
    assert.equal((await d.req("GET", "/me", { origin: "https://pirate.example" })).status, 403);
    assert.equal((await d.req("GET", "/me", { origin: null })).status, 200, "lecture de même origine");
    const pre = await d.req("OPTIONS", "/vault");
    assert.equal(pre.status, 204);
    assert.equal(pre.headers["access-control-allow-origin"], ORIGIN);
    assert.equal(pre.headers["access-control-allow-credentials"], "true");
    assert.equal((await d.req("OPTIONS", "/vault", { origin: "https://pirate.example" })).status, 403);
    const me = await d.req("GET", "/me");
    assert.equal(me.headers["cache-control"], "no-store");
    assert.equal(me.headers["x-content-type-options"], "nosniff");
    assert.equal((await d.req("GET", "/inconnu")).status, 404);
    assert.equal((await d.req("PATCH", "/vault", { body: {} })).status, 404);
    assert.equal((await env.device().req("GET", "/vault")).status, 401);
    assert.equal((await env.device().req("GET", "/health")).body.ok, true);
  } finally { await env.close(); }
});

test("limites : 5 liens par heure et par adresse, 20 par adresse IP, 20 tentatives de connexion", async () => {
  const env = await start();
  try {
    const d = env.device();
    for (let i = 0; i < 5; i++) assert.equal((await d.req("POST", "/auth/link", { body: { email: "a@x.fr" } })).status, 202);
    const sixth = await d.req("POST", "/auth/link", { body: { email: "a@x.fr" } });
    assert.equal(sixth.status, 429);
    assert.ok(Number(sixth.headers["retry-after"]) > 0 && Number(sixth.headers["retry-after"]) <= 3600);
    assert.equal(env.mailer.outbox.length, 5, "aucun email au-delà de la limite");
    for (let i = 0; i < 14; i++) await d.req("POST", "/auth/link", { body: { email: `x${i}@x.fr` } });
    assert.equal((await d.req("POST", "/auth/link", { body: { email: "y@x.fr" } })).status, 429, "limite par IP");
    for (let i = 0; i < 20; i++) await d.req("POST", "/auth/verify", { body: { token: "B".repeat(43) } });
    assert.equal((await d.req("POST", "/auth/verify", { body: { token: "B".repeat(43) } })).status, 429);
    // Fenêtre suivante : de nouveau permis.
    env.clock.t += 60 * MIN;
    assert.equal((await d.req("POST", "/auth/link", { body: { email: "a@x.fr" } })).status, 202);
  } finally { await env.close(); }
});
