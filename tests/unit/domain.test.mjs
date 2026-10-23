// Tests de la recherche de noms de domaine (documentation/33-noms-de-domaine.md) : mise en forme du nom, règles d'une
// étiquette, variantes, adresse interrogée, lecture des réponses des registres, file de requêtes, table des serveurs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const D = require("../../src/assets/engines/domain.js");
const R = ruleValues("fr");
const SERVERS = R.rdap_servers;
const TLDS = Object.keys(SERVERS);
const DROPPING = R.rdap_status_dropping;

// Réponses construites sur le modèle de celles relevées le 23/10/2026 par scripts/verifier_rdap.py (RFC 9083).
const VERISIGN = {
  objectClassName: "domain", handle: "6017964_DOMAIN_COM-VRSN", ldhName: "VERISIGN.COM",
  status: ["client delete prohibited", "client transfer prohibited", "server update prohibited"],
  entities: [
    { objectClassName: "entity", roles: ["registrant"], vcardArray: ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "REDACTED FOR PRIVACY"]]] },
    { objectClassName: "entity", handle: "292", roles: ["registrar"], publicIds: [{ type: "IANA Registrar ID", identifier: "292" }],
      vcardArray: ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "CSC Corporate Domains, Inc."]]],
      entities: [{ objectClassName: "entity", roles: ["abuse"], vcardArray: ["vcard", [["fn", {}, "text", "Abuse desk"]]] }] },
  ],
  events: [
    { eventAction: "registration", eventDate: "1995-06-02T04:00:00Z" },
    { eventAction: "expiration", eventDate: "2034-06-01T04:00:00Z" },
    { eventAction: "last changed", eventDate: "2025-02-07T17:08:30Z" },
    { eventAction: "last update of RDAP database", eventDate: "2026-10-23T15:19:35Z" },
  ],
};
const NOMINET = {  // .uk : pas de date d'expiration publiée
  objectClassName: "domain", ldhName: "nominet.uk", status: ["server delete prohibited"],
  entities: [{ roles: ["registrar"], vcardArray: ["vcard", [["fn", {}, "text", "Nominet UK"]]] }],
  events: [{ eventAction: "registration", eventDate: "2014-06-10T06:45:19Z" }, { eventAction: "last changed", eventDate: "2021-11-30T13:16:31Z" }],
};

test("étiquette : minuscules, accents et ligatures retirés, mots reliés par un tiret", () => {
  assert.equal(D.slug("Café Lumière"), "cafe-lumiere");
  assert.equal(D.slug("Œuvre & Cœur"), "oeuvre-coeur");
  assert.equal(D.slug("Straße"), "strasse");
  assert.equal(D.slug("L'Atelier d’Élise"), "l-atelier-d-elise");
  assert.equal(D.slug("  marie__dupont...studio  "), "marie-dupont-studio");
  assert.equal(D.slug("--Ça va ?! (oui)--"), "ca-va-oui");
  assert.equal(D.slug("Ñandú Ægir Øre"), "nandu-aegir-ore");
  assert.equal(D.slug(null), "");
});

test("règles d'une étiquette : 1 à 63 caractères, lettres, chiffres, tiret, pas de tirets en 3e et 4e positions", () => {
  assert.equal(D.labelError("a"), "");
  assert.equal(D.labelError("marie-dupont-2"), "");
  assert.equal(D.labelError("a".repeat(63)), "");
  assert.equal(D.labelError("a".repeat(64)), "long");
  assert.equal(D.labelError(""), "empty");
  assert.equal(D.labelError("ab--cd"), "hyphens");
  assert.equal(D.labelError("xn--caf-dma"), "hyphens", "noms internationalisés non pris en charge");
  assert.equal(D.labelError("a--b"), "", "deux tirets ailleurs qu'en 3e et 4e positions");
  assert.equal(D.labelError("-ab"), "chars");
  assert.equal(D.labelError("ab-"), "chars");
  assert.equal(D.labelError("ab_c"), "chars");
});

test("saisie : adresse, www et extension retirés ; extension connue gardée, la plus longue d'abord", () => {
  const n = D.normalize("  https://www.Marie-Dupont.FR/contact?x=1 ", TLDS);
  assert.deepEqual([n.label, n.tld, n.unknownTld, n.changed, n.error], ["marie-dupont", "fr", "", false, ""]);
  assert.equal(D.normalize("studio.co.uk", TLDS).tld, "co.uk");
  assert.equal(D.normalize("studio.co.uk", TLDS).label, "studio");
  assert.equal(D.normalize("studio.uk", TLDS).tld, "uk");
  assert.equal(D.normalize("marie.consulting", TLDS).tld, "consulting");
  assert.equal(D.normalize("marie-dupont.fr.", TLDS).tld, "fr", "point final d'un nom complet");
  assert.deepEqual([D.normalize("MarieDupont", TLDS).label, D.normalize("MarieDupont", TLDS).changed], ["mariedupont", false],
    "les majuscules ne comptent pas dans un nom de domaine");
});

test("saisie : extension de deux lettres non vérifiable signalée, autre point lu comme un séparateur", () => {
  const eu = D.normalize("marie.eu", TLDS);
  assert.deepEqual([eu.label, eu.tld, eu.unknownTld, eu.changed], ["marie", "", "eu", false]);
  assert.equal(D.normalize("lumiere.io", TLDS).unknownTld, "io");
  const dot = D.normalize("marie.dupont", TLDS);
  assert.deepEqual([dot.label, dot.unknownTld, dot.changed], ["marie-dupont", "", true]);
  const both = D.normalize("marie.io.fr", TLDS);
  assert.deepEqual([both.label, both.tld, both.unknownTld], ["marie-io", "fr", ""], "extension connue d'abord, le reste fait partie du nom");
  const spaced = D.normalize("Café Lumière", TLDS);
  assert.deepEqual([spaced.label, spaced.changed, spaced.error], ["cafe-lumiere", true, ""]);
});

test("saisie : erreurs (vide, trop long, tirets réservés)", () => {
  for (const input of ["", "   ", "!!!", null, undefined, "https://www./"]) assert.equal(D.normalize(input, TLDS).error, "empty", String(input));
  assert.equal(D.normalize(".fr", TLDS).error, "empty", "extension seule");
  assert.equal(D.normalize("a".repeat(64) + ".fr", TLDS).error, "long");
  const doubled = D.normalize("ab--cd.com", TLDS);
  assert.deepEqual([doubled.label, doubled.changed, doubled.error], ["ab-cd", true, ""], "tirets doublés réduits");
});

test("variantes : sans tirets, nom-activité, activité-nom, nom-ville ; au plus 4, valables, sans doublon", () => {
  assert.deepEqual(D.variants("marie-dupont", { activity: "Graphiste", city: "Lyon" }),
    ["mariedupont", "marie-dupont-graphiste", "graphiste-marie-dupont", "marie-dupont-lyon"]);
  assert.deepEqual(D.variants("studio", {}), [], "un seul mot sans précision : aucune variante");
  assert.deepEqual(D.variants("lumiere", { activity: "Développeuse web" }), ["lumiere-developpeuse-web", "developpeuse-web-lumiere"]);
  assert.deepEqual(D.variants("studio-lumiere", { activity: "studio", city: "Lumière" }), ["studiolumiere"], "mot déjà dans le nom");
  assert.deepEqual(D.variants("a".repeat(55), { activity: "graphiste", city: "lyon" }), ["a".repeat(55) + "-lyon"],
    "une variante trop longue est écartée");
  assert.ok(D.variants("marie-dupont", { activity: "x", city: "y" }).length <= 4);
});

test("adresse interrogée : <serveur>domain/<nom>.<extension> ; extension sans serveur : rien", () => {
  assert.equal(D.rdapUrl(SERVERS, "marie-dupont", "com"), "https://rdap.verisign.com/com/v1/domain/marie-dupont.com");
  assert.equal(D.rdapUrl(SERVERS, "studio", "co.uk"), "https://rdap.nominet.uk/uk/domain/studio.co.uk");
  assert.equal(D.rdapUrl({ fr: "https://rdap.nic.fr" }, "x", "fr"), "https://rdap.nic.fr/domain/x.fr", "barre finale ajoutée");
  assert.equal(D.rdapUrl(SERVERS, "x", "eu"), "");
});

test("réponse 200 : déjà pris, dates et registraire ; jamais les coordonnées du titulaire", () => {
  const r = D.interpret(200, VERISIGN, DROPPING);
  assert.deepEqual(r, { state: "taken", reason: "", created: "1995-06-02T04:00:00Z", expires: "2034-06-01T04:00:00Z",
                        registrar: "CSC Corporate Domains, Inc.", dropping: false });
  const uk = D.interpret(200, NOMINET, DROPPING);
  assert.deepEqual([uk.created, uk.expires, uk.registrar], ["2014-06-10T06:45:19Z", null, "Nominet UK"]);
  const bare = D.interpret(200, { objectClassName: "domain" }, DROPPING);
  assert.deepEqual([bare.state, bare.created, bare.expires, bare.registrar], ["taken", null, null, null]);
  const odd = D.interpret(200, { objectClassName: "domain", events: [{ eventAction: "registration", eventDate: "hier" }],
    entities: [{ roles: ["registrar"], vcardArray: ["vcard"] }, { roles: ["registrar"], vcardArray: ["vcard", [["fn", {}, "text", "  "]]] }] }, DROPPING);
  assert.deepEqual([odd.created, odd.registrar], [null, null], "date illisible et vCard vide ignorées");
});

test("réponse 200 en cours de suppression : signalée (statuts de la règle, sans tenir compte des majuscules)", () => {
  assert.deepEqual(DROPPING, ["redemption period", "pending delete"]);
  for (const status of [["redemption period"], ["Pending Delete", "server hold"]]) {
    assert.equal(D.interpret(200, { ...VERISIGN, status }, DROPPING).dropping, true, status.join());
  }
  assert.equal(D.interpret(200, { ...VERISIGN, status: ["pending transfer"] }, DROPPING).dropping, false);
  assert.equal(D.interpret(200, { ...VERISIGN, status: "pending delete" }, DROPPING).dropping, false, "statut qui n'est pas une liste");
});

test("autres réponses : 404 probablement libre, 429 trop de requêtes, le reste non vérifié", () => {
  assert.deepEqual(D.interpret(404, { errorCode: 404 }, DROPPING),
    { state: "free", reason: "", created: null, expires: null, registrar: null, dropping: false });
  assert.deepEqual([D.interpret(429, null).state, D.interpret(429, null).reason], ["unknown", "rate"]);
  for (const [status, body] of [[500, null], [0, null], [null, null], [200, null], [200, { objectClassName: "entity" }], [301, VERISIGN], [400, {}]]) {
    const r = D.interpret(status, body, DROPPING);
    assert.deepEqual([r.state, r.reason], ["unknown", "error"], `${status} ${JSON.stringify(body)}`);
  }
});

test("file de requêtes : au plus n à la fois, résultats dans l'ordre, erreurs gardées", async () => {
  let running = 0, peak = 0;
  const items = [30, 5, 20, 1, 15, 2, 9];
  const results = await D.pool(items, 3, (ms, i) => new Promise((resolve, reject) => {
    running++; peak = Math.max(peak, running);
    setTimeout(() => { running--; if (i === 4) reject(new Error("réseau")); else resolve(ms * 2); }, ms);
  }));
  assert.equal(peak, 3);
  assert.deepEqual(results.slice(0, 4), [60, 10, 40, 2]);
  assert.ok(results[4] instanceof Error);
  assert.deepEqual(results.slice(5), [4, 18]);
  assert.deepEqual(await D.pool([], 4, () => 1), []);
  assert.deepEqual(await D.pool([1, 2], 0, (x) => x), [1, 2], "au moins une requête à la fois");
});

test("table des serveurs : adresses https terminées par une barre, co.uk servi par le serveur de .uk", () => {
  for (const [tld, base] of Object.entries(SERVERS)) {
    assert.match(base, /^https:\/\/[a-z0-9.-]+\/([a-z0-9/._-]*\/)?$/, tld);
    assert.match(tld, /^[a-z]+(\.[a-z]+)?$/, tld);
  }
  assert.equal(SERVERS["co.uk"], SERVERS.uk);
  for (const tld of ["eu", "us", "io", "co", "me"]) assert.ok(!(tld in SERVERS), `.${tld} n'a pas de serveur RDAP dans le fichier de l'IANA`);
  assert.deepEqual(R.domain_https_only, ["dev", "app"]);
  for (const tld of R.domain_https_only) assert.ok(tld in SERVERS);
});

// Les pages de l'outil déclarent leurs extensions (data-default, data-extra) : toutes doivent avoir un serveur.
test("pages : chaque extension proposée a un serveur RDAP, sans doublon", () => {
  const pages = [["fr", "recherche-nom-de-domaine"], ["us", "domain-name-search"], ["uk", "domain-name-search"],
                 ["ca", "domain-name-search"], ["ca-fr", "recherche-nom-de-domaine"]];
  for (const [section, file] of pages) {
    const html = readFileSync(new URL(`../../content/${section}/${file}.html`, import.meta.url), "utf8");
    const read = (name) => (new RegExp(`data-${name}="([^"]+)"`).exec(html) || [])[1].split(" ");
    const all = [...read("default"), ...read("extra")];
    assert.equal(new Set(all).size, all.length, `${section} : doublon`);
    for (const tld of all) assert.ok(tld in SERVERS, `${section} : .${tld} sans serveur`);
  }
  assert.ok(readdirSync(new URL("../../content/fr/", import.meta.url)).includes("recherche-nom-de-domaine.html"));
});
