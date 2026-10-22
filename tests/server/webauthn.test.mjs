// Clés d'accès (server/lib/webauthn.js) : inscription et connexion avec un authentificateur logiciel (ES256 et RS256),
// puis chaque falsification qu'un serveur doit refuser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { SoftAuthenticator, cborEncode } from "./authenticator.mjs";

const W = createRequire(import.meta.url)("../../server/lib/webauthn.js");
const RP = { rpId: "outils.example", origins: ["https://outils.example"] };
const ORIGIN = RP.origins[0];
const fails = (fn, code) => assert.throws(fn, (e) => e instanceof W.WebAuthnError && e.code === code, `erreur attendue : ${code}`);

for (const alg of [-7, -257]) {
  test(`inscription puis connexion (${alg === -7 ? "ES256" : "RS256"})`, () => {
    const a = new SoftAuthenticator({ alg });
    const reg = W.verifyRegistration(a.create({ challenge: "c1", origin: ORIGIN, rpId: RP.rpId }), { ...RP, challenge: "c1" });
    assert.equal(reg.alg, alg);
    assert.equal(reg.credentialId, a.credentialId.toString("base64url"));
    assert.equal(reg.userVerified, true);
    const out = W.verifyAssertion(a.get({ challenge: "c2", origin: ORIGIN, rpId: RP.rpId }), reg, { ...RP, challenge: "c2" });
    assert.equal(out.signCount, 0);
  });
}

test("inscription refusée : défi, origine, type, rpId, présence, identifiant", () => {
  const a = new SoftAuthenticator();
  const ok = { ...RP, challenge: "c1" };
  fails(() => W.verifyRegistration(a.create({ challenge: "autre", origin: ORIGIN, rpId: RP.rpId }), ok), "challenge");
  fails(() => W.verifyRegistration(a.create({ challenge: "c1", origin: "https://pirate.example", rpId: RP.rpId }), ok), "origin");
  fails(() => W.verifyRegistration(a.create({ challenge: "c1", origin: ORIGIN, rpId: RP.rpId, type: "webauthn.get" }), ok), "type");
  fails(() => W.verifyRegistration(a.create({ challenge: "c1", origin: ORIGIN, rpId: "pirate.example" }), ok), "rp_id");
  fails(() => W.verifyRegistration(a.create({ challenge: "c1", origin: ORIGIN, rpId: RP.rpId, up: false }), ok), "user_presence");
  const cred = a.create({ challenge: "c1", origin: ORIGIN, rpId: RP.rpId });
  fails(() => W.verifyRegistration({ ...cred, rawId: "AAAA" }, ok), "credential_id");
  fails(() => W.verifyRegistration({ ...cred, response: { ...cred.response, attestationObject: "%%" } }, ok), "encoding");
  fails(() => W.verifyRegistration({ ...cred, response: { ...cred.response, attestationObject: cborEncode(new Map([["fmt", "none"]])).toString("base64url") } }, ok), "attestation");
});

test("connexion refusée : signature, défi, origine, rpId, compteur qui recule", () => {
  const a = new SoftAuthenticator({ counter: 5 });
  const reg = W.verifyRegistration(a.create({ challenge: "c1", origin: ORIGIN, rpId: RP.rpId }), { ...RP, challenge: "c1" });
  const ok = { ...RP, challenge: "c2" };
  const good = a.get({ challenge: "c2", origin: ORIGIN, rpId: RP.rpId });
  assert.equal(W.verifyAssertion(good, reg, ok).signCount, 6);
  // Signature d'autres données : un octet changé dans authenticatorData.
  const data = Buffer.from(good.response.authenticatorData, "base64url"); data[36] ^= 1;
  fails(() => W.verifyAssertion({ ...good, response: { ...good.response, authenticatorData: data.toString("base64url") } }, reg, ok), "signature");
  // Clé d'un autre authentificateur.
  const other = new SoftAuthenticator();
  const otherReg = W.verifyRegistration(other.create({ challenge: "c1", origin: ORIGIN, rpId: RP.rpId }), { ...RP, challenge: "c1" });
  fails(() => W.verifyAssertion(a.get({ challenge: "c2", origin: ORIGIN, rpId: RP.rpId }), otherReg, ok), "signature");
  fails(() => W.verifyAssertion(a.get({ challenge: "c3", origin: ORIGIN, rpId: RP.rpId }), reg, ok), "challenge");
  fails(() => W.verifyAssertion(a.get({ challenge: "c2", origin: "http://outils.example", rpId: RP.rpId }), reg, ok), "origin");
  fails(() => W.verifyAssertion(a.get({ challenge: "c2", origin: ORIGIN, rpId: "outils.example.pirate" }), reg, ok), "rp_id");
  fails(() => W.verifyAssertion(a.get({ challenge: "c2", origin: ORIGIN, rpId: RP.rpId, type: "webauthn.create" }), reg, ok), "type");
  // Compteur : une réponse dont le compteur ne dépasse pas celui enregistré (authentificateur cloné) est refusée.
  const stored = { ...reg, signCount: a.counter + 1 };
  fails(() => W.verifyAssertion(a.get({ challenge: "c2", origin: ORIGIN, rpId: RP.rpId }), stored, ok), "sign_count");
});

test("CBOR : valeurs, maps, limites et données tronquées", () => {
  const value = new Map([[1, 2], [-1, "texte"], ["k", [0, 23, 24, 255, 256, 65535, 65536, -25]], ["b", Buffer.from([1, 2])], ["t", true], ["n", null]]);
  const [decoded, end] = W.cborDecode(cborEncode(value));
  assert.equal(end, cborEncode(value).length);
  assert.deepEqual([...decoded.keys()], [1, -1, "k", "b", "t", "n"]);
  assert.deepEqual(decoded.get("k"), [0, 23, 24, 255, 256, 65535, 65536, -25]);
  assert.deepEqual(decoded.get("b"), Buffer.from([1, 2]));
  fails(() => W.cborDecode(cborEncode("abcdef").subarray(0, 3)), "cbor");
  fails(() => W.cborDecode(Buffer.from([0x5f])), "cbor");                 // longueur indéfinie
  fails(() => W.cborDecode(Buffer.from([0xc1, 0x00])), "cbor");           // étiquette
  // Profondeur limitée : 20 tableaux imbriqués.
  fails(() => W.cborDecode(Buffer.from([...Array(20).fill(0x81), 0x00])), "cbor");
});

test("données de l'authentificateur : octets en trop refusés, algorithmes inconnus refusés", () => {
  const a = new SoftAuthenticator();
  fails(() => W.parseAuthData(Buffer.concat([a.authData(RP.rpId, true), Buffer.from([0])])), "auth_data");
  fails(() => W.parseAuthData(Buffer.alloc(10)), "auth_data");
  fails(() => W.coseToJwk(new Map([[1, 1], [3, -8]])), "algorithm");   // Ed25519 non pris en charge
  fails(() => W.coseToJwk(new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.alloc(31)], [-3, Buffer.alloc(32)]])), "key");
});
