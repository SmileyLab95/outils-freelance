/*
 * Stockage du serveur des comptes : même interface (asynchrone) pour la mémoire (tests) et SQLite (serveur).
 * Documentation : documentation/23-serveur-et-connexion.md. Les jetons (lien, session) ne sont gardés que sous forme
 * d'empreinte ; le coffre et la clé enveloppée sont des blocs chiffrés sur l'appareil, que le serveur ne sait pas lire.
 * Contrat vérifié sur les deux implémentations par tests/server/store.test.mjs.
 */
"use strict";

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

class MemoryStore {
  constructor() {
    this.accounts = new Map(); this.tokens = new Map(); this.sessionsById = new Map(); this.passkeysById = new Map();
    this.challenges = new Map(); this.keysByAccount = new Map(); this.vaults = new Map(); this.rate = new Map();
  }
  async createAccount(a) {
    if ([...this.accounts.values()].some((x) => x.email === a.email)) throw new Error("email déjà utilisé");
    this.accounts.set(a.id, clone(a));
    return clone(a);
  }
  async accountByEmail(email) { return clone([...this.accounts.values()].find((a) => a.email === email) || null); }
  async account(id) { return clone(this.accounts.get(id) || null); }
  async deleteAccount(id) {
    this.accounts.delete(id); this.keysByAccount.delete(id); this.vaults.delete(id);
    for (const [k, s] of this.sessionsById) if (s.accountId === id) this.sessionsById.delete(k);
    for (const [k, p] of this.passkeysById) if (p.accountId === id) this.passkeysById.delete(k);
    for (const [k, c] of this.challenges) if (c.accountId === id) this.challenges.delete(k);
  }

  async putLoginToken(t) { this.tokens.set(t.hash, clone(t)); }
  async takeLoginToken(hash, now) {
    const t = this.tokens.get(hash);
    this.tokens.delete(hash);
    return t && t.expiresAt > now ? clone(t) : null;
  }

  async createSession(s) { this.sessionsById.set(s.id, clone(s)); }
  async sessionByHash(hash) { return clone([...this.sessionsById.values()].find((s) => s.hash === hash) || null); }
  async touchSession(id, lastSeen, expiresAt) {
    const s = this.sessionsById.get(id);
    if (s) Object.assign(s, { lastSeen, expiresAt });
  }
  async sessions(accountId) {
    return clone([...this.sessionsById.values()].filter((s) => s.accountId === accountId).sort((a, b) => a.createdAt - b.createdAt));
  }
  async deleteSession(accountId, id) {
    const s = this.sessionsById.get(id);
    if (!s || s.accountId !== accountId) return false;
    return this.sessionsById.delete(id);
  }

  async addPasskey(p) {
    if (this.passkeysById.has(p.id)) throw new Error("clé déjà enregistrée");
    this.passkeysById.set(p.id, clone(p));
  }
  async passkey(id) { return clone(this.passkeysById.get(id) || null); }
  async passkeys(accountId) {
    return clone([...this.passkeysById.values()].filter((p) => p.accountId === accountId).sort((a, b) => a.createdAt - b.createdAt));
  }
  async updatePasskey(id, fields) { const p = this.passkeysById.get(id); if (p) Object.assign(p, clone(fields)); }
  async deletePasskey(accountId, id) {
    const p = this.passkeysById.get(id);
    if (!p || p.accountId !== accountId) return false;
    return this.passkeysById.delete(id);
  }

  async putChallenge(c) { this.challenges.set(c.value, clone(c)); }
  async takeChallenge(value, purpose, now) {
    const c = this.challenges.get(value);
    if (!c || c.purpose !== purpose) return null;
    this.challenges.delete(value);
    return c.expiresAt > now ? clone(c) : null;
  }

  async keys(accountId) { return clone(this.keysByAccount.get(accountId) || null); }
  async putKeys(accountId, data, expected, now) {
    const cur = this.keysByAccount.get(accountId), version = cur ? cur.version : 0;
    if (version !== expected) return { conflict: true, version };
    this.keysByAccount.set(accountId, { data: clone(data), version: version + 1, updatedAt: now });
    return { ok: true, version: version + 1 };
  }

  async vault(accountId) { return clone(this.vaults.get(accountId) || null); }
  async putVault(accountId, blob, expected, now) {
    const cur = this.vaults.get(accountId), version = cur ? cur.version : 0;
    if (version !== expected) return { conflict: true, version };
    this.vaults.set(accountId, { ...clone(blob), version: version + 1, updatedAt: now });
    return { ok: true, version: version + 1 };
  }

  async hit(key, windowStart) {
    const k = key + "|" + windowStart, n = (this.rate.get(k) || 0) + 1;
    this.rate.set(k, n);
    return n;
  }

  async purgeExpired(now, rateBefore) {
    for (const [k, t] of this.tokens) if (t.expiresAt <= now) this.tokens.delete(k);
    for (const [k, c] of this.challenges) if (c.expiresAt <= now) this.challenges.delete(k);
    for (const [k, s] of this.sessionsById) if (s.expiresAt <= now) this.sessionsById.delete(k);
    for (const k of this.rate.keys()) if (Number(k.split("|").pop()) < rateBefore) this.rate.delete(k);
  }

  close() {}
}

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, createdAt INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS login_tokens (hash TEXT PRIMARY KEY, email TEXT NOT NULL, lang TEXT NOT NULL, expiresAt INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, hash TEXT NOT NULL UNIQUE,
    accountId TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, createdAt INTEGER NOT NULL, lastSeen INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL, authAt INTEGER NOT NULL, method TEXT NOT NULL, userAgent TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS passkeys (id TEXT PRIMARY KEY, accountId TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    publicKey TEXT NOT NULL, alg INTEGER NOT NULL, signCount INTEGER NOT NULL, name TEXT NOT NULL, createdAt INTEGER NOT NULL,
    lastUsed INTEGER);
  CREATE TABLE IF NOT EXISTS challenges (value TEXT PRIMARY KEY, purpose TEXT NOT NULL,
    accountId TEXT REFERENCES accounts(id) ON DELETE CASCADE, expiresAt INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS account_keys (accountId TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    data TEXT NOT NULL, version INTEGER NOT NULL, updatedAt INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS vaults (accountId TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    iv TEXT NOT NULL, data TEXT NOT NULL, size INTEGER NOT NULL, version INTEGER NOT NULL, updatedAt INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS rate (key TEXT NOT NULL, windowStart INTEGER NOT NULL, count INTEGER NOT NULL,
    PRIMARY KEY (key, windowStart));
  CREATE INDEX IF NOT EXISTS sessions_account ON sessions(accountId);
  CREATE INDEX IF NOT EXISTS passkeys_account ON passkeys(accountId);
`;

class SqliteStore {
  /** file : chemin du fichier de base, ou ":memory:". */
  constructor(file) {
    const { DatabaseSync } = require("node:sqlite");
    this.db = new DatabaseSync(file);
    this.db.exec(SCHEMA);
    this.q = {};
  }
  prep(sql) { return this.q[sql] || (this.q[sql] = this.db.prepare(sql)); }
  row(sql, ...args) { const r = this.prep(sql).get(...args); return r ? { ...r } : null; }
  rows(sql, ...args) { return this.prep(sql).all(...args).map((r) => ({ ...r })); }
  run(sql, ...args) { return this.prep(sql).run(...args); }
  /** Exécute fn dans une transaction (opérations qui lisent puis écrivent). */
  tx(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try { const out = fn(); this.db.exec("COMMIT"); return out; } catch (e) { this.db.exec("ROLLBACK"); throw e; }
  }

  async createAccount(a) { this.run("INSERT INTO accounts (id, email, createdAt) VALUES (?, ?, ?)", a.id, a.email, a.createdAt); return { ...a }; }
  async accountByEmail(email) { return this.row("SELECT * FROM accounts WHERE email = ?", email); }
  async account(id) { return this.row("SELECT * FROM accounts WHERE id = ?", id); }
  async deleteAccount(id) { this.run("DELETE FROM accounts WHERE id = ?", id); }

  async putLoginToken(t) { this.run("INSERT INTO login_tokens (hash, email, lang, expiresAt) VALUES (?, ?, ?, ?)", t.hash, t.email, t.lang, t.expiresAt); }
  async takeLoginToken(hash, now) {
    const t = this.row("DELETE FROM login_tokens WHERE hash = ? RETURNING *", hash);
    return t && t.expiresAt > now ? t : null;
  }

  async createSession(s) {
    this.run("INSERT INTO sessions (id, hash, accountId, createdAt, lastSeen, expiresAt, authAt, method, userAgent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      s.id, s.hash, s.accountId, s.createdAt, s.lastSeen, s.expiresAt, s.authAt, s.method, s.userAgent);
  }
  async sessionByHash(hash) { return this.row("SELECT * FROM sessions WHERE hash = ?", hash); }
  async touchSession(id, lastSeen, expiresAt) { this.run("UPDATE sessions SET lastSeen = ?, expiresAt = ? WHERE id = ?", lastSeen, expiresAt, id); }
  async sessions(accountId) { return this.rows("SELECT * FROM sessions WHERE accountId = ? ORDER BY createdAt", accountId); }
  async deleteSession(accountId, id) { return this.run("DELETE FROM sessions WHERE id = ? AND accountId = ?", id, accountId).changes > 0; }

  async addPasskey(p) {
    this.run("INSERT INTO passkeys (id, accountId, publicKey, alg, signCount, name, createdAt, lastUsed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      p.id, p.accountId, JSON.stringify(p.publicKey), p.alg, p.signCount, p.name, p.createdAt, p.lastUsed ?? null);
  }
  passkeyRow(r) { return r && { ...r, publicKey: JSON.parse(r.publicKey) }; }
  async passkey(id) { return this.passkeyRow(this.row("SELECT * FROM passkeys WHERE id = ?", id)); }
  async passkeys(accountId) { return this.rows("SELECT * FROM passkeys WHERE accountId = ? ORDER BY createdAt", accountId).map((r) => this.passkeyRow(r)); }
  async updatePasskey(id, f) { this.run("UPDATE passkeys SET signCount = ?, lastUsed = ? WHERE id = ?", f.signCount, f.lastUsed, id); }
  async deletePasskey(accountId, id) { return this.run("DELETE FROM passkeys WHERE id = ? AND accountId = ?", id, accountId).changes > 0; }

  async putChallenge(c) { this.run("INSERT INTO challenges (value, purpose, accountId, expiresAt) VALUES (?, ?, ?, ?)", c.value, c.purpose, c.accountId ?? null, c.expiresAt); }
  async takeChallenge(value, purpose, now) {
    const c = this.row("DELETE FROM challenges WHERE value = ? AND purpose = ? RETURNING *", value, purpose);
    return c && c.expiresAt > now ? c : null;
  }

  async keys(accountId) {
    const r = this.row("SELECT data, version, updatedAt FROM account_keys WHERE accountId = ?", accountId);
    return r && { ...r, data: JSON.parse(r.data) };
  }
  async putKeys(accountId, data, expected, now) {
    return this.tx(() => {
      const cur = this.row("SELECT version FROM account_keys WHERE accountId = ?", accountId), version = cur ? cur.version : 0;
      if (version !== expected) return { conflict: true, version };
      this.run("INSERT INTO account_keys (accountId, data, version, updatedAt) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(accountId) DO UPDATE SET data = excluded.data, version = excluded.version, updatedAt = excluded.updatedAt",
        accountId, JSON.stringify(data), version + 1, now);
      return { ok: true, version: version + 1 };
    });
  }

  async vault(accountId) { return this.row("SELECT iv, data, size, version, updatedAt FROM vaults WHERE accountId = ?", accountId); }
  async putVault(accountId, blob, expected, now) {
    return this.tx(() => {
      const cur = this.row("SELECT version FROM vaults WHERE accountId = ?", accountId), version = cur ? cur.version : 0;
      if (version !== expected) return { conflict: true, version };
      this.run("INSERT INTO vaults (accountId, iv, data, size, version, updatedAt) VALUES (?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(accountId) DO UPDATE SET iv = excluded.iv, data = excluded.data, size = excluded.size, version = excluded.version, updatedAt = excluded.updatedAt",
        accountId, blob.iv, blob.data, blob.size, version + 1, now);
      return { ok: true, version: version + 1 };
    });
  }

  async hit(key, windowStart) {
    return this.row("INSERT INTO rate (key, windowStart, count) VALUES (?, ?, 1) " +
      "ON CONFLICT(key, windowStart) DO UPDATE SET count = count + 1 RETURNING count", key, windowStart).count;
  }

  async purgeExpired(now, rateBefore) {
    this.run("DELETE FROM login_tokens WHERE expiresAt <= ?", now);
    this.run("DELETE FROM challenges WHERE expiresAt <= ?", now);
    this.run("DELETE FROM sessions WHERE expiresAt <= ?", now);
    this.run("DELETE FROM rate WHERE windowStart < ?", rateBefore);
  }

  close() { this.db.close(); }
}

module.exports = { MemoryStore, SqliteStore };
