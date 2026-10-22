// Authentificateur WebAuthn logiciel pour les tests : produit les mêmes réponses qu'un navigateur
// (navigator.credentials.create et get), avec de vraies clés ES256 ou RS256 et un encodeur CBOR minimal.
import crypto from "node:crypto";

export function cborEncode(v) {
  const head = (major, n) => {
    if (n < 24) return Buffer.from([(major << 5) | n]);
    if (n < 0x100) return Buffer.from([(major << 5) | 24, n]);
    if (n < 0x10000) { const b = Buffer.alloc(3); b[0] = (major << 5) | 25; b.writeUInt16BE(n, 1); return b; }
    const b = Buffer.alloc(5); b[0] = (major << 5) | 26; b.writeUInt32BE(n, 1); return b;
  };
  if (v === null) return Buffer.from([0xf6]);
  if (v === true || v === false) return Buffer.from([v ? 0xf5 : 0xf4]);
  if (typeof v === "number") return v >= 0 ? head(0, v) : head(1, -1 - v);
  if (Buffer.isBuffer(v)) return Buffer.concat([head(2, v.length), v]);
  if (typeof v === "string") { const b = Buffer.from(v, "utf8"); return Buffer.concat([head(3, b.length), b]); }
  if (Array.isArray(v)) return Buffer.concat([head(4, v.length), ...v.map(cborEncode)]);
  const entries = v instanceof Map ? [...v.entries()] : Object.entries(v);
  return Buffer.concat([head(5, entries.length), ...entries.flatMap(([k, x]) => [cborEncode(k), cborEncode(x)])]);
}

const sha256 = (data) => crypto.createHash("sha256").update(data).digest();
const b64 = (buf) => Buffer.from(buf).toString("base64url");

export class SoftAuthenticator {
  constructor({ alg = -7, counter = 0, uv = true } = {}) {
    this.alg = alg;
    this.counter = counter;
    this.uv = uv;
    this.keys = alg === -7 ? crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }) : crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    this.credentialId = crypto.randomBytes(32);
  }

  cose() {
    const jwk = this.keys.publicKey.export({ format: "jwk" });
    return this.alg === -7
      ? new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, "base64url")], [-3, Buffer.from(jwk.y, "base64url")]])
      : new Map([[1, 3], [3, -257], [-1, Buffer.from(jwk.n, "base64url")], [-2, Buffer.from(jwk.e, "base64url")]]);
  }

  authData(rpId, attested, { up = true } = {}) {
    const flags = (up ? 0x01 : 0) | (this.uv ? 0x04 : 0) | (attested ? 0x40 : 0);
    const count = Buffer.alloc(4); count.writeUInt32BE(this.counter);
    const parts = [sha256(rpId), Buffer.from([flags]), count];
    if (attested) {
      const len = Buffer.alloc(2); len.writeUInt16BE(this.credentialId.length);
      parts.push(Buffer.alloc(16), len, this.credentialId, cborEncode(this.cose()));
    }
    return Buffer.concat(parts);
  }

  /** Réponse à navigator.credentials.create(). */
  create({ challenge, origin, rpId, type = "webauthn.create", up }) {
    const clientDataJSON = Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
    const attestationObject = cborEncode(new Map([["fmt", "none"], ["attStmt", new Map()], ["authData", this.authData(rpId, true, { up })]]));
    return { id: b64(this.credentialId), rawId: b64(this.credentialId), type: "public-key",
             response: { clientDataJSON: b64(clientDataJSON), attestationObject: b64(attestationObject) } };
  }

  /** Réponse à navigator.credentials.get() ; le compteur augmente si l'authentificateur en utilise un. */
  get({ challenge, origin, rpId, type = "webauthn.get", up }) {
    if (this.counter > 0) this.counter += 1;
    const clientDataJSON = Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
    const authenticatorData = this.authData(rpId, false, { up });
    const signed = Buffer.concat([authenticatorData, sha256(clientDataJSON)]);
    const signature = this.alg === -7
      ? crypto.sign("sha256", signed, { key: this.keys.privateKey, dsaEncoding: "der" })
      : crypto.sign("sha256", signed, this.keys.privateKey);
    return { id: b64(this.credentialId), rawId: b64(this.credentialId), type: "public-key",
             response: { clientDataJSON: b64(clientDataJSON), authenticatorData: b64(authenticatorData), signature: b64(signature), userHandle: null } };
  }
}
