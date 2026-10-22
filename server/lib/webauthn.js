/*
 * Clés d'accès (WebAuthn) côté serveur, sans dépendance : décodage CBOR minimal, lecture des données de
 * l'authentificateur, clé publique COSE → JWK, vérification d'une création (inscription) et d'une assertion
 * (connexion). Spécification : documentation/23-serveur-et-connexion.md, § 2. Testé par tests/server/webauthn.test.mjs
 * avec un authentificateur logiciel.
 */
"use strict";
const crypto = require("node:crypto");

const b64url = {
  encode: (buf) => Buffer.from(buf).toString("base64url"),
  decode: (s) => {
    if (typeof s !== "string" || !/^[A-Za-z0-9_-]*$/.test(s)) throw new WebAuthnError("encoding");
    return Buffer.from(s, "base64url");
  }
};

class WebAuthnError extends Error {
  constructor(code) { super(code); this.code = code; }
}

// ----- CBOR (RFC 8949), sous-ensemble utile à WebAuthn ----------------------------------------------------------

/** Décode une valeur CBOR à partir de offset ; renvoie [valeur, offset suivant]. Les maps deviennent des Map. */
function cborDecode(buf, offset = 0, depth = 0) {
  if (depth > 16) throw new WebAuthnError("cbor");
  if (offset >= buf.length) throw new WebAuthnError("cbor");
  const first = buf[offset++], major = first >> 5, info = first & 0x1f;
  let length;
  if (info < 24) length = info;
  else if (info === 24) { need(buf, offset, 1); length = buf[offset]; offset += 1; }
  else if (info === 25) { need(buf, offset, 2); length = buf.readUInt16BE(offset); offset += 2; }
  else if (info === 26) { need(buf, offset, 4); length = buf.readUInt32BE(offset); offset += 4; }
  else if (info === 27) {
    need(buf, offset, 8);
    const big = buf.readBigUInt64BE(offset); offset += 8;
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) throw new WebAuthnError("cbor");
    length = Number(big);
  } else throw new WebAuthnError("cbor");   // longueurs indéfinies : absentes de WebAuthn

  switch (major) {
    case 0: return [length, offset];
    case 1: return [-1 - length, offset];
    case 2: need(buf, offset, length); return [buf.subarray(offset, offset + length), offset + length];
    case 3: need(buf, offset, length); return [buf.subarray(offset, offset + length).toString("utf8"), offset + length];
    case 4: {
      const out = [];
      for (let i = 0; i < length; i++) { let v; [v, offset] = cborDecode(buf, offset, depth + 1); out.push(v); }
      return [out, offset];
    }
    case 5: {
      const out = new Map();
      for (let i = 0; i < length; i++) {
        let k, v;
        [k, offset] = cborDecode(buf, offset, depth + 1);
        [v, offset] = cborDecode(buf, offset, depth + 1);
        out.set(k, v);
      }
      return [out, offset];
    }
    case 7:
      if (length === 20) return [false, offset];
      if (length === 21) return [true, offset];
      if (length === 22) return [null, offset];
      throw new WebAuthnError("cbor");
    default: throw new WebAuthnError("cbor");   // étiquettes (6) : absentes de WebAuthn
  }
}
function need(buf, offset, n) { if (offset + n > buf.length) throw new WebAuthnError("cbor"); }

// ----- Données de l'authentificateur --------------------------------------------------------------------------

const FLAG_UP = 0x01, FLAG_UV = 0x04, FLAG_AT = 0x40, FLAG_ED = 0x80;

/** Lit authenticatorData : empreinte du rpId, indicateurs, compteur, et identifiant et clé COSE si présents. */
function parseAuthData(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 37) throw new WebAuthnError("auth_data");
  const out = { rpIdHash: buf.subarray(0, 32), flags: buf[32], signCount: buf.readUInt32BE(33) };
  let offset = 37;
  if (out.flags & FLAG_AT) {
    if (buf.length < offset + 18) throw new WebAuthnError("auth_data");
    const idLength = buf.readUInt16BE(offset + 16);
    offset += 18;
    if (idLength < 16 || idLength > 1023 || buf.length < offset + idLength) throw new WebAuthnError("auth_data");
    out.credentialId = buf.subarray(offset, offset + idLength);
    offset += idLength;
    [out.cose, offset] = cborDecode(buf, offset);
  }
  if (out.flags & FLAG_ED) [, offset] = cborDecode(buf, offset);   // extensions : lues, ignorées
  if (offset !== buf.length) throw new WebAuthnError("auth_data");
  return out;
}

/** Clé publique COSE → { jwk, alg } ; ES256 (EC2, P-256) et RS256 seulement. */
function coseToJwk(cose) {
  if (!(cose instanceof Map)) throw new WebAuthnError("key");
  const kty = cose.get(1), alg = cose.get(3);
  if (kty === 2 && alg === -7 && cose.get(-1) === 1) {
    const x = cose.get(-2), y = cose.get(-3);
    if (!Buffer.isBuffer(x) || !Buffer.isBuffer(y) || x.length !== 32 || y.length !== 32) throw new WebAuthnError("key");
    return { alg: -7, jwk: { kty: "EC", crv: "P-256", x: b64url.encode(x), y: b64url.encode(y) } };
  }
  if (kty === 3 && alg === -257) {
    const n = cose.get(-1), e = cose.get(-2);
    if (!Buffer.isBuffer(n) || !Buffer.isBuffer(e) || n.length < 256) throw new WebAuthnError("key");
    return { alg: -257, jwk: { kty: "RSA", n: b64url.encode(n), e: b64url.encode(e) } };
  }
  throw new WebAuthnError("algorithm");
}

/** Données du client : type, défi et origine attendus. */
function checkClientData(clientDataJSON, type, challenge, origins) {
  let data;
  try { data = JSON.parse(clientDataJSON.toString("utf8")); } catch { throw new WebAuthnError("client_data"); }
  if (!data || data.type !== type) throw new WebAuthnError("type");
  if (typeof data.challenge !== "string" || !safeEqual(data.challenge, challenge)) throw new WebAuthnError("challenge");
  if (!origins.includes(data.origin)) throw new WebAuthnError("origin");
  if (data.crossOrigin === true) throw new WebAuthnError("origin");
  return data;
}

function checkRp(auth, rpId) {
  const expected = crypto.createHash("sha256").update(rpId).digest();
  if (!crypto.timingSafeEqual(auth.rpIdHash, expected)) throw new WebAuthnError("rp_id");
  if (!(auth.flags & FLAG_UP)) throw new WebAuthnError("user_presence");
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Inscription : vérifie la réponse de navigator.credentials.create().
 * credential : { id, rawId, type, response: { clientDataJSON, attestationObject } } (base64url).
 * Renvoie { credentialId, publicKey (JWK), alg, signCount, userVerified }.
 * L'attestation n'est pas vérifiée : le site demande « none » et n'a pas besoin de connaître le modèle d'appareil.
 */
function verifyRegistration(credential, { challenge, origins, rpId }) {
  if (!credential || credential.type !== "public-key" || !credential.response) throw new WebAuthnError("invalid");
  const clientDataJSON = b64url.decode(credential.response.clientDataJSON);
  checkClientData(clientDataJSON, "webauthn.create", challenge, origins);
  const attestationBytes = b64url.decode(credential.response.attestationObject);
  let attestation;
  try { [attestation] = cborDecode(attestationBytes); } catch { throw new WebAuthnError("attestation"); }
  if (!(attestation instanceof Map) || !Buffer.isBuffer(attestation.get("authData"))) throw new WebAuthnError("attestation");
  const auth = parseAuthData(attestation.get("authData"));
  checkRp(auth, rpId);
  if (!(auth.flags & FLAG_AT) || !auth.credentialId) throw new WebAuthnError("auth_data");
  const credentialId = b64url.encode(auth.credentialId);
  if (credential.rawId !== undefined && credential.rawId !== credentialId) throw new WebAuthnError("credential_id");
  const { jwk, alg } = coseToJwk(auth.cose);
  crypto.createPublicKey({ key: jwk, format: "jwk" });   // clé lisible, sinon exception
  return { credentialId, publicKey: jwk, alg, signCount: auth.signCount, userVerified: !!(auth.flags & FLAG_UV) };
}

/**
 * Connexion : vérifie la réponse de navigator.credentials.get() avec la clé enregistrée
 * ({ publicKey, alg, signCount }). Renvoie { signCount, userVerified }.
 */
function verifyAssertion(credential, stored, { challenge, origins, rpId }) {
  if (!credential || credential.type !== "public-key" || !credential.response) throw new WebAuthnError("invalid");
  const clientDataJSON = b64url.decode(credential.response.clientDataJSON);
  checkClientData(clientDataJSON, "webauthn.get", challenge, origins);
  const authData = b64url.decode(credential.response.authenticatorData);
  const auth = parseAuthData(authData);
  checkRp(auth, rpId);
  const signed = Buffer.concat([authData, crypto.createHash("sha256").update(clientDataJSON).digest()]);
  const key = crypto.createPublicKey({ key: stored.publicKey, format: "jwk" });
  const signature = b64url.decode(credential.response.signature);
  const ok = stored.alg === -7
    ? crypto.verify("sha256", signed, { key, dsaEncoding: "der" }, signature)
    : stored.alg === -257 ? crypto.verify("sha256", signed, { key, padding: crypto.constants.RSA_PKCS1_PADDING }, signature) : false;
  if (!ok) throw new WebAuthnError("signature");
  // Compteur : s'il est utilisé, il doit augmenter (sinon, authentificateur peut-être cloné).
  if ((auth.signCount > 0 || stored.signCount > 0) && auth.signCount <= stored.signCount) throw new WebAuthnError("sign_count");
  return { signCount: auth.signCount, userVerified: !!(auth.flags & FLAG_UV) };
}

module.exports = { b64url, cborDecode, parseAuthData, coseToJwk, verifyRegistration, verifyAssertion, WebAuthnError,
                   FLAGS: { UP: FLAG_UP, UV: FLAG_UV, AT: FLAG_AT, ED: FLAG_ED } };
