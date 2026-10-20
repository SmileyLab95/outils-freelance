// Tests du moteur Factur-X (documentation/10-etude-factur-x.md). La conformité complète du XML (XSD, schematrons
// EN 16931 et BR-FR) est vérifiée par tests/facturx/valider.py sur le jeu d'essai de tests/facturx/generer.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/espace-fr.js");
const FX = require("../../src/assets/engines/facturx-fr.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const fmt = { eur: (n) => n.toFixed(2).replace(".", ",") + " €", num: String, date: (iso) => iso.split("-").reverse().join("/") };

const me = { name: "Camille Martin EI", address: "12 rue de la République\n69002 Lyon", siret: "123 456 789 00012", iban: "FR76 1234" };
const client = { name: "Studio Nova SAS", address: "14 rue des Lilas\n69003 Lyon", id: "812 345 678", pro: true, place: "fr" };
const issued = (over = {}, c = client, m = me) => {
  const doc = Object.assign({ id: "d1", type: "facture", status: "draft", date: "2026-10-05", serviceDate: "2026-10-01", terms: 30,
    nature: "services", lines: [{ desc: "Site", qty: 1, price: 1800 }], vat: { franchise: true, rate: 20, place: "fr" }, payments: [] }, over);
  const r = E.issue([], doc, m, c, null, "2026-10-20T10:00:00Z");
  assert.deepEqual(r.errors, []);
  return r.doc;
};

test("adresse : code postal et ville lus sur la dernière ligne, champs structurés prioritaires", () => {
  assert.deepEqual(FX.address({ address: "12 rue de la République\n69002 Lyon" }),
    { lines: ["12 rue de la République"], postcode: "69002", city: "Lyon", country: "" });
  assert.deepEqual(FX.address({ address: "Friedrichstraße 10", postcode: "10117", city: "Berlin", country: "de" }),
    { lines: ["Friedrichstraße 10"], postcode: "10117", city: "Berlin", country: "DE" });
  assert.equal(FX.address({ address: "1 place du Marché\nBP 12\n75001 Paris" }).lines.length, 2);
});

test("SIREN depuis un SIREN ou un SIRET, avec ou sans espaces", () => {
  assert.equal(FX.siren("812 345 678"), "812345678");
  assert.equal(FX.siren("123 456 789 00012"), "123456789");
  assert.equal(FX.siren("12345"), "");
});

test("catégories de TVA : franchise, TVA, autoliquidation, hors UE (services et biens)", () => {
  const cat = (vat, nature = "services", date = "2026-10-05") => {
    const doc = { date, nature, vat, lines: [{ desc: "x", qty: 1, price: 100 }] };
    return FX.taxCategory(doc, require("../../src/assets/engines/invoice-fr.js").compute(doc), R);
  };
  assert.deepEqual(cat({ franchise: true }), { code: "E", rate: 0, reason: "TVA non applicable, art. 293 B du CGI", reasonCode: "VATEX-FR-FRANCHISE" });
  assert.equal(cat({ franchise: true }, "services", "2027-01-04").reason, "TVA non applicable, art. L. 233-3 du CIBS (ex-art. 293 B du CGI)");
  assert.deepEqual(cat({ franchise: false, rate: 20 }), { code: "S", rate: 20 });
  assert.equal(cat({ franchise: false, rate: 20, place: "eu" }).code, "AE");
  assert.equal(cat({ franchise: false, place: "world" }).code, "O");
  assert.equal(cat({ franchise: false, place: "world" }, "biens").code, "G");
  assert.equal(FX.businessProcess({ nature: "biens" }), "B1");
  assert.equal(FX.businessProcess({ nature: "services" }), "S1");
  assert.equal(FX.businessProcess({ nature: "mixte" }), "M1");
});

test("données manquantes signalées avant l'export", () => {
  assert.deepEqual(FX.check(issued()), []);
  assert.match(FX.check({ type: "devis", status: "sent", number: "D2026-001", snapshot: { me, client } }).join(" "), /factures et les avoirs/);
  assert.match(FX.check(issued({}, Object.assign({}, client, { pro: false }))).join(" "), /clients professionnels/);
  assert.match(FX.check(issued({}, Object.assign({}, client, { id: "" }))).join(" "), /SIREN du client/);
  assert.match(FX.check(issued({}, client, Object.assign({}, me, { siret: "123" }))).join(" "), /Votre SIRET/);
  assert.match(FX.check(issued({}, client, Object.assign({}, me, { address: "12 rue de la République" }))).join(" "), /code postal et une ville/);
  const abroad = { name: "Maple", address: "200 Queen Street\nMontréal", pro: true, place: "world" };
  const problems = FX.check(issued({ vat: { franchise: false, rate: 20, place: "world" } }, abroad)).join(" ");
  assert.match(problems, /pays du client/);
  assert.match(problems, /email du client/);
  assert.match(FX.check(issued({ vat: { franchise: false, rate: 20, place: "eu" } },
    Object.assign({}, abroad, { place: "eu", country: "DE", email: "a@b.example" }))).join(" "), /Autoliquidation/);
});

test("XML : en-tête, notes obligatoires, parties, totaux, avoir lié", () => {
  const inv = issued({ paid: 300 });
  const x = FX.xml(inv, [inv], R, fmt);
  assert.match(x, /<ram:BusinessProcessSpecifiedDocumentContextParameter><ram:ID>S1<\/ram:ID>/);
  assert.match(x, /<ram:ID>urn:cen\.eu:en16931:2017<\/ram:ID>/);
  assert.match(x, /<ram:ID>F2026-001<\/ram:ID><ram:TypeCode>380<\/ram:TypeCode>/);
  for (const code of ["AAB", "PMD", "PMT", "BAR"]) assert.match(x, new RegExp("<ram:SubjectCode>" + code + "</ram:SubjectCode>"));
  assert.match(x, /<ram:Content>B2B<\/ram:Content><ram:SubjectCode>BAR/);
  assert.match(x, /<ram:ID schemeID="0002">123456789<\/ram:ID>/);
  assert.match(x, /<ram:URIID schemeID="0225">812345678<\/ram:URIID>/);
  assert.match(x, /<ram:ID schemeID="FC">123456789<\/ram:ID>/, "franchise sans numéro de TVA : SIREN en BT-32");
  assert.match(x, /<ram:PostcodeCode>69002<\/ram:PostcodeCode><ram:LineOne>12 rue de la République<\/ram:LineOne><ram:CityName>Lyon<\/ram:CityName><ram:CountryID>FR/);
  assert.match(x, /<ram:GrandTotalAmount>1800\.00<\/ram:GrandTotalAmount><ram:TotalPrepaidAmount>300\.00<\/ram:TotalPrepaidAmount><ram:DuePayableAmount>1500\.00/);
  assert.match(x, /<udt:DateTimeString format="102">20261104<\/udt:DateTimeString>/, "échéance");

  const credit = E.issue([inv], Object.assign(E.creditFromInvoice(inv, "2026-10-08", "a1"), { lines: [{ desc: "Remise", qty: 1, price: 300 }] }),
    me, client, null, "2026-10-20T10:00:00Z").doc;
  const c = FX.xml(credit, [inv, credit], R, fmt);
  assert.match(c, /<ram:TypeCode>381<\/ram:TypeCode>/);
  assert.match(c, /<ram:InvoiceReferencedDocument><ram:IssuerAssignedID>F2026-001<\/ram:IssuerAssignedID><ram:FormattedIssueDateTime><qdt:DateTimeString format="102">20261005/);
  assert.doesNotMatch(c, /SpecifiedTradePaymentTerms/, "pas d'échéance sur un avoir");
});

test("XML : caractères spéciaux échappés, quantités et prix au bon format", () => {
  const inv = issued({ lines: [{ desc: "Licence & support <annuel> \"pro\"", qty: 2.5, price: 33.333333 }], vat: { franchise: false, rate: 5.5, place: "fr" } });
  const x = FX.xml(inv, [inv], R, fmt);
  assert.match(x, /<ram:Name>Licence &amp; support &lt;annuel&gt; &quot;pro&quot;<\/ram:Name>/);
  assert.match(x, /<ram:BilledQuantity unitCode="C62">2\.5<\/ram:BilledQuantity>/);
  assert.match(x, /<ram:ChargeAmount>33\.333333<\/ram:ChargeAmount>/);
  assert.match(x, /<ram:LineTotalAmount>83\.33<\/ram:LineTotalAmount>/);
  assert.match(x, /<ram:RateApplicablePercent>5\.5<\/ram:RateApplicablePercent>/);
});
