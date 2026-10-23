// Contrat du stockage (server/lib/store.js) : mêmes résultats en mémoire et avec SQLite.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const { MemoryStore, SqliteStore } = createRequire(import.meta.url)("../../server/lib/store.js");
process.removeAllListeners("warning");   // avertissement « SQLite expérimental » de Node 22

for (const [name, make] of [["mémoire", () => new MemoryStore()], ["SQLite", () => new SqliteStore(":memory:")]]) {
  test(`${name} : comptes, jetons à usage unique, sessions et clés d'accès cloisonnées par compte`, async () => {
    const s = make();
    await s.createAccount({ id: "a1", email: "a@x.fr", createdAt: 1 });
    await s.createAccount({ id: "b1", email: "b@x.fr", createdAt: 2 });
    await assert.rejects(s.createAccount({ id: "a2", email: "a@x.fr", createdAt: 3 }));
    assert.equal((await s.accountByEmail("a@x.fr")).id, "a1");
    assert.equal(await s.accountByEmail("c@x.fr"), null);

    await s.putLoginToken({ hash: "h1", email: "a@x.fr", lang: "fr", expiresAt: 100 });
    assert.equal((await s.takeLoginToken("h1", 50)).email, "a@x.fr");
    assert.equal(await s.takeLoginToken("h1", 50), null, "usage unique");
    await s.putLoginToken({ hash: "h2", email: "a@x.fr", lang: "fr", expiresAt: 100 });
    assert.equal(await s.takeLoginToken("h2", 100), null, "expiré");

    const session = (id, accountId) => ({ id, hash: "s" + id, accountId, createdAt: 1, lastSeen: 1, expiresAt: 1000, authAt: 1, method: "link", userAgent: "UA" });
    await s.createSession(session("1", "a1"));
    await s.createSession(session("2", "b1"));
    assert.equal((await s.sessionByHash("s1")).accountId, "a1");
    assert.deepEqual((await s.sessions("a1")).map((x) => x.id), ["1"]);
    assert.equal(await s.deleteSession("a1", "2"), false, "session d'un autre compte");
    assert.equal(await s.deleteSession("a1", "1"), true);
    assert.equal(await s.sessionByHash("s1"), null);

    const key = { kty: "EC", crv: "P-256", x: "x", y: "y" };
    await s.addPasskey({ id: "k1", accountId: "a1", publicKey: key, alg: -7, signCount: 0, name: "Téléphone", createdAt: 1 });
    await assert.rejects(s.addPasskey({ id: "k1", accountId: "b1", publicKey: key, alg: -7, signCount: 0, name: "x", createdAt: 1 }));
    assert.deepEqual((await s.passkey("k1")).publicKey, key);
    await s.updatePasskey("k1", { signCount: 4, lastUsed: 9 });
    assert.equal((await s.passkey("k1")).signCount, 4);
    assert.equal(await s.deletePasskey("b1", "k1"), false, "clé d'un autre compte");
    assert.deepEqual((await s.passkeys("b1")), []);

    await s.putChallenge({ value: "c1", purpose: "login", accountId: null, expiresAt: 100 });
    assert.equal(await s.takeChallenge("c1", "register", 1), null, "autre usage");
    assert.equal((await s.takeChallenge("c1", "login", 1)).value, "c1");
    assert.equal(await s.takeChallenge("c1", "login", 1), null, "usage unique");
    s.close();
  });

  test(`${name} : clé enveloppée et coffre versionnés (écriture seulement sur la version lue)`, async () => {
    const s = make();
    await s.createAccount({ id: "a1", email: "a@x.fr", createdAt: 1 });
    assert.deepEqual(await s.putKeys("a1", { w: 1 }, 1, 5), { conflict: true, version: 0 });
    assert.deepEqual(await s.putKeys("a1", { w: 1 }, 0, 5), { ok: true, version: 1 });
    assert.deepEqual(await s.putKeys("a1", { w: 2 }, 0, 6), { conflict: true, version: 1 });
    assert.deepEqual((await s.keys("a1")).data, { w: 1 });

    assert.equal(await s.vault("a1"), null);
    assert.deepEqual(await s.putVault("a1", { iv: "i", data: "d1", size: 2 }, 0, 7), { ok: true, version: 1 });
    assert.deepEqual(await s.putVault("a1", { iv: "i", data: "d2", size: 2 }, 0, 8), { conflict: true, version: 1 });
    assert.deepEqual(await s.putVault("a1", { iv: "j", data: "d2", size: 2 }, 1, 9), { ok: true, version: 2 });
    const v = await s.vault("a1");
    assert.deepEqual([v.iv, v.data, v.size, v.version, v.updatedAt], ["j", "d2", 2, 2, 9]);

    assert.equal(await s.prefs("a1"), null);
    await s.putPrefs("a1", { lang: "fr", newsletter: { value: true, at: 3, wording: "fr-1" } }, 10);
    await s.putPrefs("a1", { lang: "en", newsletter: { value: true, at: 3, wording: "fr-1" } }, 11);
    assert.deepEqual(await s.prefs("a1"), { lang: "en", newsletter: { value: true, at: 3, wording: "fr-1" }, updatedAt: 11 });

    // Suppression du compte : tout part avec lui.
    await s.createSession({ id: "1", hash: "s1", accountId: "a1", createdAt: 1, lastSeen: 1, expiresAt: 1000, authAt: 1, method: "link", userAgent: "" });
    await s.deleteAccount("a1");
    assert.equal(await s.vault("a1"), null);
    assert.equal(await s.keys("a1"), null);
    assert.equal(await s.sessionByHash("s1"), null);
    assert.equal(await s.prefs("a1"), null);
    s.close();
  });

  test(`${name} : compteurs de limites et purge`, async () => {
    const s = make();
    assert.equal(await s.hit("ip:1", 1000), 1);
    assert.equal(await s.hit("ip:1", 1000), 2);
    assert.equal(await s.hit("ip:1", 2000), 1, "nouvelle fenêtre");
    await s.putLoginToken({ hash: "h", email: "a@x.fr", lang: "fr", expiresAt: 10 });
    await s.purgeExpired(20, 1500);
    assert.equal(await s.takeLoginToken("h", 0), null);
    assert.equal(await s.hit("ip:1", 1000), 1, "fenêtre purgée");
    s.close();
  });
}
