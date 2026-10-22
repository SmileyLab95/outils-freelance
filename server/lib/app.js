/*
 * Serveur des comptes : API JSON /api/v1 (connexion par lien envoyé par email et par clé d'accès, sessions, clé du
 * compte enveloppée, coffre chiffré, export et suppression). Spécification : documentation/23-serveur-et-connexion.md.
 * createApp() renvoie un gestionnaire de requêtes node:http ; le stockage, l'envoi d'emails et l'horloge sont fournis
 * par l'appelant (tests : MemoryStore, MemoryMailer, horloge réglable).
 */
"use strict";
const crypto = require("node:crypto");
const W = require("./webauthn.js");
const { loginEmail, LANGS } = require("./emails.js");

const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const DEFAULTS = {
  brand: "Outils Freelance",
  cookieName: "of_session",
  linkTtl: 15 * MIN,
  challengeTtl: 5 * MIN,
  sessionTtl: 30 * DAY,
  reauthWindow: 15 * MIN,
  limits: { linkPerEmail: 5, linkPerIp: 20, loginPerIp: 20, window: HOUR },
  maxBody: 64 * 1024,
  maxVault: 5 * 1024 * 1024,
  maxKeys: 4 * 1024,
  maxPasskeys: 20,
  trustProxy: false
};

class HttpError extends Error {
  constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra || {}; }
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const token = () => crypto.randomBytes(32).toString("base64url");
const isB64url = (s, max) => typeof s === "string" && s.length > 0 && s.length <= max && /^[A-Za-z0-9_-]+$/.test(s);
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

/** Adresse email normalisée (espaces retirés, minuscules) ou null si elle n'a pas la forme d'une adresse. */
function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

function parseCookies(header) {
  const out = {};
  String(header || "").split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

function createApp({ store, mailer, now = Date.now, config }) {
  const C = { ...DEFAULTS, ...config, limits: { ...DEFAULTS.limits, ...(config.limits || {}) } };
  if (!C.rpId || !Array.isArray(C.origins) || !C.origins.length || !C.appUrl || !C.accountPaths) {
    throw new Error("Configuration incomplète : rpId, origins, appUrl, accountPaths");
  }
  const rp = { rpId: C.rpId, origins: C.origins };

  // ----- Réponses ---------------------------------------------------------------------------------------------

  function send(res, status, body, headers = {}) {
    const payload = body === undefined ? "" : JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      ...headers
    });
    res.end(payload);
  }
  const cookie = (value, maxAgeMs) =>
    `${C.cookieName}=${value}; Path=/api/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor(maxAgeMs / 1000)}`;

  // ----- Requête ----------------------------------------------------------------------------------------------

  /** Corps de la requête, refusé au-delà de limit (annoncé par Content-Length ou constaté en lisant). */
  function readBody(req, limit) {
    if (Number(req.headers["content-length"]) > limit) return Promise.reject(new HttpError(413, "too_large", { headers: { Connection: "close" } }));
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size <= limit) chunks.push(c);   // au-delà : lu jusqu'au bout sans être gardé, puis refusé
      });
      req.on("end", () => (size > limit ? reject(new HttpError(413, "too_large", { headers: { Connection: "close" } })) : resolve(Buffer.concat(chunks))));
      req.on("error", reject);
    });
  }
  async function json(req, limit = C.maxBody) {
    if (!/^application\/json\b/i.test(req.headers["content-type"] || "")) throw new HttpError(400, "invalid");
    const raw = await readBody(req, limit);
    try {
      const v = JSON.parse(raw.toString("utf8"));
      if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error();
      return v;
    } catch { throw new HttpError(400, "invalid"); }
  }
  const clientIp = (req) => (C.trustProxy && req.headers["x-forwarded-for"]
    ? String(req.headers["x-forwarded-for"]).split(",")[0].trim() : req.socket.remoteAddress || "?");

  async function limit(key, max) {
    const t = now(), windowStart = t - (t % C.limits.window);
    if ((await store.hit(key, windowStart)) > max) {
      throw new HttpError(429, "rate_limited", { headers: { "Retry-After": String(Math.ceil((windowStart + C.limits.window - t) / 1000)) } });
    }
  }

  /** Session de la requête (cookie) → { session, account } ; 401 sinon. Prolonge la session au plus une fois par heure. */
  async function auth(req) {
    const value = parseCookies(req.headers.cookie)[C.cookieName];
    if (!value || !isB64url(value, 64)) throw new HttpError(401, "unauthorized");
    const session = await store.sessionByHash(sha256(value));
    const t = now();
    if (!session || session.expiresAt <= t) throw new HttpError(401, "unauthorized");
    const account = await store.account(session.accountId);
    if (!account) throw new HttpError(401, "unauthorized");
    if (t - session.lastSeen > HOUR) await store.touchSession(session.id, t, t + C.sessionTtl);
    return { session, account };
  }

  async function openSession(res, account, method, req) {
    const value = token(), t = now();
    await store.createSession({ id: crypto.randomUUID(), hash: sha256(value), accountId: account.id, createdAt: t, lastSeen: t,
      expiresAt: t + C.sessionTtl, authAt: t, method, userAgent: String(req.headers["user-agent"] || "").slice(0, 200) });
    return cookie(value, C.sessionTtl);
  }

  async function me(account) {
    const [keys, vault, passkeys] = await Promise.all([store.keys(account.id), store.vault(account.id), store.passkeys(account.id)]);
    return { id: account.id, email: account.email, createdAt: account.createdAt, keysVersion: keys ? keys.version : 0,
             vaultVersion: vault ? vault.version : 0, passkeys: passkeys.length };
  }

  /** Version lue par l'appareil (If-Match, entier ≥ 0), exigée pour écrire la clé ou le coffre. */
  function ifMatch(req) {
    const v = String(req.headers["if-match"] || "").replace(/"/g, "");
    if (!/^\d{1,9}$/.test(v)) throw new HttpError(428, "invalid");
    return Number(v);
  }

  /** Défi d'une réponse WebAuthn (lu dans clientDataJSON), pour retrouver celui que le serveur a émis. */
  function challengeOf(credential) {
    try {
      const data = JSON.parse(W.b64url.decode(credential.response.clientDataJSON).toString("utf8"));
      if (isB64url(data.challenge, 128)) return data.challenge;
    } catch { /* réponse illisible */ }
    throw new HttpError(400, "invalid");
  }

  // ----- Routes -----------------------------------------------------------------------------------------------

  const routes = {
    "GET /health": async () => [200, { ok: true }],

    "POST /auth/link": async (req) => {
      const body = await json(req);
      const email = normalizeEmail(body.email);
      const lang = LANGS.includes(body.lang) && C.accountPaths[body.lang] ? body.lang : "fr";
      if (!email) throw new HttpError(400, "invalid");
      await limit("link-ip:" + clientIp(req), C.limits.linkPerIp);
      await limit("link-email:" + email, C.limits.linkPerEmail);
      const value = token();
      await store.putLoginToken({ hash: sha256(value), email, lang, expiresAt: now() + C.linkTtl });
      const link = C.appUrl + C.accountPaths[lang] + "#token=" + value;
      await mailer.send({ to: email, lang, ...loginEmail({ lang, brand: C.brand, link, minutes: Math.round(C.linkTtl / MIN) }) });
      // Même réponse que l'adresse ait déjà un compte ou non.
      return [202, { ok: true }];
    },

    "POST /auth/verify": async (req, res) => {
      const body = await json(req);
      await limit("login-ip:" + clientIp(req), C.limits.loginPerIp);
      if (!isB64url(body.token, 64)) throw new HttpError(400, "invalid_link");
      const link = await store.takeLoginToken(sha256(body.token), now());
      if (!link) throw new HttpError(400, "invalid_link");
      let account = await store.accountByEmail(link.email), created = false;
      if (!account) {
        // Deux liens vérifiés en même temps pour une nouvelle adresse : le second retrouve le compte créé par le premier.
        try { account = await store.createAccount({ id: crypto.randomUUID(), email: link.email, createdAt: now() }); created = true; }
        catch (e) { account = await store.accountByEmail(link.email); if (!account) throw e; }
      }
      const setCookie = await openSession(res, account, "link", req);
      return [200, { account: await me(account), created }, { "Set-Cookie": setCookie }];
    },

    "POST /auth/logout": async (req) => {
      const { session, account } = await auth(req);
      await store.deleteSession(account.id, session.id);
      return [204, undefined, { "Set-Cookie": cookie("", 0) }];
    },

    "POST /auth/passkey/options": async (req) => {
      await limit("login-ip:" + clientIp(req), C.limits.loginPerIp);
      const challenge = token();
      await store.putChallenge({ value: challenge, purpose: "login", accountId: null, expiresAt: now() + C.challengeTtl });
      return [200, { challenge, rpId: C.rpId, timeout: C.challengeTtl, userVerification: "preferred", allowCredentials: [] }];
    },

    "POST /auth/passkey": async (req) => {
      const body = await json(req);
      await limit("login-ip:" + clientIp(req), C.limits.loginPerIp);
      const credential = body.credential;
      if (!credential || !isB64url(credential.id, 1400)) throw new HttpError(400, "invalid");
      const challenge = challengeOf(credential);
      if (!(await store.takeChallenge(challenge, "login", now()))) throw new HttpError(401, "unauthorized");
      const stored = await store.passkey(credential.id);
      if (!stored) throw new HttpError(401, "unauthorized");
      let result;
      try { result = W.verifyAssertion(credential, stored, { ...rp, challenge }); } catch { throw new HttpError(401, "unauthorized"); }
      await store.updatePasskey(stored.id, { signCount: result.signCount, lastUsed: now() });
      const account = await store.account(stored.accountId);
      if (!account) throw new HttpError(401, "unauthorized");
      return [200, { account: await me(account) }, { "Set-Cookie": await openSession(null, account, "passkey", req) }];
    },

    "GET /me": async (req) => {
      const { account } = await auth(req);
      return [200, await me(account)];
    },

    "GET /sessions": async (req) => {
      const { session, account } = await auth(req);
      const list = (await store.sessions(account.id)).filter((s) => s.expiresAt > now()).map((s) => ({
        id: s.id, createdAt: s.createdAt, lastSeen: s.lastSeen, method: s.method, userAgent: s.userAgent, current: s.id === session.id
      }));
      return [200, { sessions: list }];
    },

    "DELETE /sessions/:id": async (req, res, id) => {
      const { account } = await auth(req);
      if (!(await store.deleteSession(account.id, id))) throw new HttpError(404, "not_found");
      return [204];
    },

    "POST /passkeys/options": async (req) => {
      const { account } = await auth(req);
      const challenge = token();
      await store.putChallenge({ value: challenge, purpose: "register", accountId: account.id, expiresAt: now() + C.challengeTtl });
      const existing = await store.passkeys(account.id);
      return [200, {
        challenge, rp: { id: C.rpId, name: C.brand },
        user: { id: Buffer.from(account.id).toString("base64url"), name: account.email, displayName: account.email },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        timeout: C.challengeTtl, attestation: "none",
        authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
        excludeCredentials: existing.map((p) => ({ type: "public-key", id: p.id }))
      }];
    },

    "POST /passkeys": async (req) => {
      const { account } = await auth(req);
      const body = await json(req);
      if (!body.credential) throw new HttpError(400, "invalid");
      const challenge = challengeOf(body.credential);
      const issued = await store.takeChallenge(challenge, "register", now());
      if (!issued || issued.accountId !== account.id) throw new HttpError(400, "invalid");
      let reg;
      try { reg = W.verifyRegistration(body.credential, { ...rp, challenge }); } catch { throw new HttpError(400, "invalid"); }
      if (await store.passkey(reg.credentialId)) throw new HttpError(409, "conflict");
      if ((await store.passkeys(account.id)).length >= C.maxPasskeys) throw new HttpError(409, "conflict");
      const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "Passkey";
      await store.addPasskey({ id: reg.credentialId, accountId: account.id, publicKey: reg.publicKey, alg: reg.alg,
        signCount: reg.signCount, name, createdAt: now(), lastUsed: null });
      return [201, { id: reg.credentialId, name }];
    },

    "GET /passkeys": async (req) => {
      const { account } = await auth(req);
      return [200, { passkeys: (await store.passkeys(account.id)).map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt, lastUsed: p.lastUsed })) }];
    },

    "DELETE /passkeys/:id": async (req, res, id) => {
      const { account } = await auth(req);
      if (!(await store.deletePasskey(account.id, id))) throw new HttpError(404, "not_found");
      return [204];
    },

    "GET /keys": async (req) => {
      const { account } = await auth(req);
      const keys = await store.keys(account.id);
      if (!keys) throw new HttpError(404, "not_found");
      return [200, { version: keys.version, ...keys.data }];
    },

    "PUT /keys": async (req) => {
      const { account } = await auth(req);
      const expected = ifMatch(req);
      const body = await json(req, C.maxKeys);
      // Clé enveloppée : bloc chiffré sur l'appareil ; le serveur vérifie seulement sa forme.
      const w = body.wrapped;
      if (body.kdf !== "hkdf-sha256" || !isB64url(body.salt, 64) || !w || !isB64url(w.iv, 16) || !isB64url(w.data, 256)) {
        throw new HttpError(400, "invalid");
      }
      const out = await store.putKeys(account.id, { kdf: body.kdf, salt: body.salt, wrapped: { iv: w.iv, data: w.data } }, expected, now());
      if (out.conflict) throw new HttpError(409, "conflict", { body: { version: out.version } });
      return [200, { version: out.version }];
    },

    "GET /vault": async (req) => {
      const { account } = await auth(req);
      const vault = await store.vault(account.id);
      if (!vault) throw new HttpError(404, "not_found");
      return [200, vault];
    },

    "PUT /vault": async (req) => {
      const { account } = await auth(req);
      const expected = ifMatch(req);
      const maxText = Math.ceil(C.maxVault * 4 / 3);   // taille maximale du coffre, encodé en base64url
      const body = await json(req, maxText + 1024);
      if (typeof body.data === "string" && body.data.length > maxText) throw new HttpError(413, "too_large");
      if (!isB64url(body.iv, 16) || !isB64url(body.data, maxText)) throw new HttpError(400, "invalid");
      if (!(await store.keys(account.id))) throw new HttpError(409, "no_keys");
      const size = Buffer.from(body.data, "base64url").length;
      if (size > C.maxVault) throw new HttpError(413, "too_large");
      const out = await store.putVault(account.id, { iv: body.iv, data: body.data, size }, expected, now());
      if (out.conflict) throw new HttpError(409, "conflict", { body: { version: out.version } });
      return [200, { version: out.version }];
    },

    "GET /export": async (req) => {
      const { account } = await auth(req);
      const [sessions, passkeys, keys, vault] = await Promise.all([store.sessions(account.id), store.passkeys(account.id),
        store.keys(account.id), store.vault(account.id)]);
      return [200, {
        account: { id: account.id, email: account.email, createdAt: account.createdAt },
        sessions: sessions.map((s) => ({ id: s.id, createdAt: s.createdAt, lastSeen: s.lastSeen, method: s.method, userAgent: s.userAgent })),
        passkeys: passkeys.map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt, lastUsed: p.lastUsed })),
        keys, vault
      }, { "Content-Disposition": 'attachment; filename="compte-export.json"' }];
    },

    "DELETE /account": async (req) => {
      const { session, account } = await auth(req);
      if (now() - session.authAt > C.reauthWindow) throw new HttpError(403, "reauth");
      await store.deleteAccount(account.id);
      return [204, undefined, { "Set-Cookie": cookie("", 0) }];
    }
  };

  function route(method, path) {
    if (routes[method + " " + path]) return [routes[method + " " + path], null];
    const m = /^(\/(?:sessions|passkeys))\/([A-Za-z0-9_-]{1,1400})$/.exec(path);
    if (m && routes[method + " " + m[1] + "/:id"]) return [routes[method + " " + m[1] + "/:id"], m[2]];
    return [null, null];
  }

  // ----- Gestionnaire -----------------------------------------------------------------------------------------

  return async function handle(req, res) {
    const origin = req.headers.origin;
    const allowed = origin && C.origins.includes(origin);
    const cors = allowed ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true", Vary: "Origin" } : {};
    try {
      const url = new URL(req.url, "http://localhost");
      if (!url.pathname.startsWith("/api/v1/")) throw new HttpError(404, "not_found");
      const path = url.pathname.slice("/api/v1".length);
      if (req.method === "OPTIONS") {
        if (!allowed) throw new HttpError(403, "forbidden");
        res.writeHead(204, { ...cors, "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
          "Access-Control-Allow-Headers": "Content-Type, X-OF-Request, If-Match", "Access-Control-Max-Age": "600" });
        return res.end();
      }
      const [handler, id] = route(req.method, path);
      if (!handler) throw new HttpError(404, "not_found");
      // Requêtes qui modifient : origine autorisée et en-tête propre au site (contre les requêtes forgées).
      if (req.method !== "GET" && (!allowed || req.headers["x-of-request"] !== "1")) throw new HttpError(403, "forbidden");
      if (req.method === "GET" && origin && !allowed) throw new HttpError(403, "forbidden");
      const [status, body, headers] = await handler(req, res, id);
      send(res, status, body, { ...cors, ...(headers || {}) });
    } catch (e) {
      if (e instanceof HttpError) {
        send(res, e.status, { error: e.code, ...(e.extra.body || {}) }, { ...cors, ...(e.extra.headers || {}) });
      } else {
        if (C.log) C.log(e);
        send(res, 500, { error: "server" }, cors);
      }
    }
  };
}

module.exports = { createApp, normalizeEmail, parseCookies, HttpError, DEFAULTS };
