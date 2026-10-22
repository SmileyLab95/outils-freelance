// Chiffrement des comptes (src/assets/engines/compte-crypto.js) avec la WebCrypto de Node, la même que celle des
// navigateurs : code de récupération, enveloppe de la clé du compte, coffre chiffré.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const C = createRequire(import.meta.url)("../../src/assets/engines/compte-crypto.js");
const rejects = (promise, code) => assert.rejects(promise, (e) => e.code === code, `erreur attendue : ${code}`);
const FORMAT = /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){6}$/;

test("code de récupération : format, lecture tolérante, fautes de frappe détectées", async () => {
  const seen = new Set();
  for (let i = 0; i < 50; i++) {
    const code = await C.newRecoveryCode();
    assert.match(code.text, FORMAT);
    assert.equal(code.bytes.length, 16);
    assert.deepEqual(await C.parseRecoveryCode(code.text), code.bytes);
    seen.add(code.text);
  }
  assert.equal(seen.size, 50, "codes tous différents");
  // Code fixe (tests reproductibles) : 16 octets connus.
  const bytes = Uint8Array.from({ length: 16 }, (_, i) => (i * 37 + 11) & 255);
  const text = await C.formatRecoveryCode(bytes);
  assert.match(text, FORMAT);
  // Minuscules, espaces, sans tirets ; O lu 0, I et L lus 1.
  const loose = text.toLowerCase().replace(/-/g, " ").replace(/0/g, "o").replace(/1/g, "l");
  assert.deepEqual(await C.parseRecoveryCode(loose), bytes);
  // Chaque caractère changé : refusé (contrôle de 10 bits, ou caractère hors des 128 bits).
  const flat = text.replace(/-/g, "");
  for (let i = 0; i < 28; i++) {
    const other = C.ALPHABET[(C.ALPHABET.indexOf(flat[i]) + 7) % 32];
    await assert.rejects(C.parseRecoveryCode(flat.slice(0, i) + other + flat.slice(i + 1)), (e) => ["checksum", "character"].includes(e.code), `position ${i}`);
  }
  await rejects(C.parseRecoveryCode(flat.slice(1)), "length");
  await rejects(C.parseRecoveryCode(flat.slice(0, 27) + "U"), "character");
  await rejects(C.parseRecoveryCode("Z" + flat.slice(1)), "character");   // plus de 128 bits
});

test("clé du compte : enveloppe ouverte avec le bon code seulement, clé jamais exportable", async () => {
  const code = await C.newRecoveryCode();
  const { key, keys } = await C.createAccountKey(code.bytes);
  // Forme acceptée par le serveur (server/lib/app.js, PUT /keys).
  assert.equal(keys.kdf, "hkdf-sha256");
  assert.ok(keys.salt.length <= 64 && keys.wrapped.iv.length <= 16 && keys.wrapped.data.length <= 256);
  for (const v of [keys.salt, keys.wrapped.iv, keys.wrapped.data]) assert.match(v, /^[A-Za-z0-9_-]+$/);
  await assert.rejects(globalThis.crypto.subtle.exportKey("raw", key), "clé non exportable");

  const opened = await C.openAccountKey(code.bytes, keys);
  await assert.rejects(globalThis.crypto.subtle.exportKey("raw", opened));
  const vault = await C.encryptVault(key, { a: 1 }, "compte", 1);
  assert.deepEqual(await C.decryptVault(opened, { ...vault, version: 1 }, "compte"), { a: 1 }, "même clé sur le nouvel appareil");

  const other = await C.newRecoveryCode();
  await rejects(C.openAccountKey(other.bytes, keys), "wrong_code");
  const tampered = { ...keys, wrapped: { ...keys.wrapped, data: keys.wrapped.data.slice(0, -2) + (keys.wrapped.data.endsWith("A") ? "BA" : "AA") } };
  await rejects(C.openAccountKey(code.bytes, tampered), "wrong_code");
});

test("coffre : déchiffré seulement pour le même compte et la même version, toute modification détectée", async () => {
  const code = await C.newRecoveryCode();
  const { key } = await C.createAccountKey(code.bytes);
  const data = { schema: 2, profile: { name: "Camille Martin EI" }, clients: Array.from({ length: 200 }, (_, i) => ({ id: "c" + i, name: "Client n° " + i + " – éàü" })), documents: [] };
  const vault = { ...(await C.encryptVault(key, data, "acc-1", 3)), version: 3 };
  assert.deepEqual(await C.decryptVault(key, vault, "acc-1"), data);
  assert.ok(C.fromB64(vault.data).length < JSON.stringify(data).length / 4, "compressé");
  await rejects(C.decryptVault(key, vault, "acc-2"), "vault");
  await rejects(C.decryptVault(key, { ...vault, version: 2 }, "acc-1"), "vault");
  const bytes = C.fromB64(vault.data); bytes[10] ^= 1;
  await rejects(C.decryptVault(key, { ...vault, data: C.toB64(bytes) }, "acc-1"), "vault");
  const otherKey = (await C.createAccountKey((await C.newRecoveryCode()).bytes)).key;
  await rejects(C.decryptVault(otherKey, vault, "acc-1"), "vault");
  // Deux chiffrements des mêmes données : vecteurs et résultats différents.
  const again = await C.encryptVault(key, data, "acc-1", 3);
  assert.notEqual(again.iv, vault.iv);
  assert.notEqual(again.data, vault.data);
});

test("base64url : aller-retour sur de grands tableaux", () => {
  const bytes = new Uint8Array(300000).map((_, i) => (i * 7) & 255);
  assert.deepEqual(C.fromB64(C.toB64(bytes)), bytes);
  assert.match(C.toB64(bytes), /^[A-Za-z0-9_-]+$/);
});
