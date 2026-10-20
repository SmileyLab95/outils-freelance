// Tests de l'Espace v1.1 : emails, reprise du générateur, numérotation continuée (documentation/09, section 11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/espace-fr.js");

const fmt = { eur: (n) => n.toFixed(2).replace(".", ",") + " €", date: (iso) => iso.split("-").reverse().join("/") };
const me = { name: "Camille Martin EI" };
const client = { id: "c1", name: "Studio Nova", pro: true };
const profile = { name: "Camille Martin EI", iban: "FR76 1234", bic: "ABCDFRPP", vatRegime: "franchise", vatRate: 20, terms: 30 };
const draft = (over = {}) => Object.assign({
  id: "d" + Math.random(), type: "facture", status: "draft", date: "2026-10-05", terms: 30, clientId: "c1",
  lines: [{ desc: "Site vitrine", qty: 1, price: 1000 }], vat: { franchise: true, rate: 20, place: "fr" }, payments: []
}, over);
const issueAll = (docs, doc, numbering, prefixes) => {
  const r = E.issue(docs, doc, me, client, prefixes || null, "2026-10-20T10:00:00Z", numbering);
  assert.deepEqual(r.errors, []);
  docs.push(r.doc);
  return r.doc;
};
const pay = (doc, amount, date = "2026-10-12") => doc.payments.push({ id: "p" + Math.random(), date, amount, method: "virement" });

// ----- A13 : textes d'email -----------------------------------------------------------------------

test("A13 : envoi d'une facture à payer, en partie payée, soldée", () => {
  const docs = [];
  const inv = issueAll(docs, draft());
  let m = E.email("send", inv, docs, profile, "2026-10-06", fmt);
  assert.equal(m.subject, "Facture F2026-001 – Camille Martin EI");
  assert.match(m.body, /^Bonjour,\n\nVeuillez trouver ci-joint la facture F2026-001 du 05\/10\/2026, d'un montant de 1000,00 €\. Elle est payable au plus tard le 04\/11\/2026\./);
  assert.match(m.body, /IBAN FR76 1234, BIC ABCDFRPP, en indiquant la référence F2026-001\./);
  assert.match(m.body, /Bien cordialement,\nCamille Martin EI$/);
  assert.doesNotMatch(m.body, /TTC/, "pas de TTC en franchise");

  pay(inv, 400);
  m = E.email("send", inv, docs, profile, "2026-10-13", fmt);
  assert.match(m.body, /Compte tenu des règlements déjà reçus, le montant restant dû est de 600,00 €, payable au plus tard le 04\/11\/2026\./);

  pay(inv, 600);
  m = E.email("send", inv, docs, profile, "2026-10-14", fmt);
  assert.match(m.body, /Elle est déjà réglée : merci !/);
  assert.doesNotMatch(m.body, /IBAN/, "pas d'IBAN quand rien n'est dû");
});

test("A13 : facture avec TVA, à réception, sans IBAN", () => {
  const docs = [];
  const inv = issueAll(docs, draft({ terms: 0, vat: { franchise: false, rate: 20, place: "fr" } }));
  const m = E.email("send", inv, docs, { name: "Camille" }, "2026-10-05", fmt);
  assert.match(m.body, /d'un montant de 1200,00 € TTC\. Elle est payable à réception\./);
  assert.doesNotMatch(m.body, /IBAN/);
});

test("A13 : facture réduite par un avoir, puis annulée", () => {
  const docs = [];
  const inv = issueAll(docs, draft());
  const credit = issueAll(docs, Object.assign(E.creditFromInvoice(inv, "2026-10-08", "a1"), { lines: [{ desc: "Remise", qty: 1, price: 300 }] }));
  let m = E.email("send", inv, docs, profile, "2026-10-09", fmt);
  assert.match(m.body, /Compte tenu de l'avoir émis, le montant restant dû est de 700,00 €/);
  m = E.email("send", credit, docs, profile, "2026-10-09", fmt);
  assert.equal(m.subject, "Avoir A2026-001 – Camille Martin EI");
  assert.match(m.body, /l'avoir A2026-001 du 08\/10\/2026, d'un montant de 300,00 €, relatif à la facture F2026-001 du 05\/10\/2026\./);
  assert.match(m.body, /Il vient en déduction de cette facture : le montant restant dû est désormais de 700,00 €\./);

  issueAll(docs, Object.assign(E.creditFromInvoice(inv, "2026-10-09", "a2"), { lines: [{ desc: "Annulation du solde", qty: 1, price: 700 }] }));
  m = E.email("send", inv, docs, profile, "2026-10-10", fmt);
  assert.match(m.body, /Elle a été annulée par un avoir\./);
  m = E.email("send", docs[2], docs, profile, "2026-10-10", fmt);
  assert.match(m.body, /qui est ainsi annulée\./);
});

test("A13 : avoir à rembourser puis remboursé", () => {
  const docs = [];
  const inv = issueAll(docs, draft());
  pay(inv, 1000);
  const credit = issueAll(docs, Object.assign(E.creditFromInvoice(inv, "2026-10-15", "a1"), { lines: [{ desc: "Remise", qty: 1, price: 250 }] }));
  let m = E.email("send", credit, docs, profile, "2026-10-15", fmt);
  assert.match(m.body, /La somme de 250,00 € vous sera remboursée prochainement\./);
  credit.payments.push({ id: "r1", date: "2026-10-18", amount: 250, method: "virement" });
  m = E.email("send", credit, docs, profile, "2026-10-19", fmt);
  assert.match(m.body, /La somme de 250,00 € vous a été remboursée le 18\/10\/2026\./);
});

test("A13 : devis avec acompte et mention d'acceptation", () => {
  const docs = [];
  const quote = issueAll(docs, draft({ type: "devis", validity: 30, depositPct: 30, vat: { franchise: false, rate: 20, place: "fr" } }));
  const m = E.email("send", quote, docs, profile, "2026-10-05", fmt);
  assert.equal(m.subject, "Devis D2026-001 – Camille Martin EI");
  assert.match(m.body, /le devis D2026-001 du 05\/10\/2026, d'un montant de 1200,00 € TTC, valable jusqu'au 04\/11\/2026\./);
  assert.match(m.body, /Un acompte de 30 % \(360,00 €\) est demandé à la signature\./);
  assert.match(m.body, /« Devis reçu avant l'exécution des travaux, bon pour accord »/);
  assert.doesNotMatch(m.body, /IBAN/);
});

test("A13 : relance avant et après l'échéance (texte de la version 1)", () => {
  const docs = [];
  const inv = issueAll(docs, draft());
  pay(inv, 200);
  let m = E.email("reminder", inv, docs, profile, "2026-11-01", fmt);
  assert.equal(m.subject, "Facture F2026-001 : échéance du 04/11/2026");
  assert.match(m.body, /d'un montant de 800,00 €, arrive à échéance le 04\/11\/2026\./);
  m = E.email("reminder", inv, docs, profile, "2026-11-10", fmt);
  assert.equal(m.subject, "Facture F2026-001 : rappel de paiement");
  assert.match(m.body, /arrivée à échéance le 04\/11\/2026, ne m'est pas encore parvenu\. Le montant restant dû est de 800,00 €\./);
  assert.match(m.body, /Vous pouvez la régler par virement : IBAN FR76 1234/);
});

// ----- A16 et A17 : numérotation continuée -------------------------------------------------------------

test("A17 : dernier numéro déclaré pour l'année ; un rang émis plus élevé l'emporte", () => {
  const numbering = { facture: { year: "2026", last: 12 } };
  assert.equal(E.nextNumber([], "facture", "2026", null, numbering), "F2026-013");
  assert.equal(E.nextNumber([], "facture", "2027", null, numbering), "F2027-001", "autre année : pas de reprise");
  assert.equal(E.nextNumber([], "devis", "2026", null, numbering), "D2026-001", "autre type : pas de reprise");
  const docs = [];
  assert.equal(issueAll(docs, draft(), numbering).number, "F2026-013");
  assert.equal(issueAll(docs, draft({ date: "2026-10-06" }), numbering).number, "F2026-014");
  assert.equal(E.nextNumber(docs, "facture", "2026", null, { facture: { year: "2026", last: 3 } }), "F2026-015", "le rang émis l'emporte");
  assert.equal(E.nextNumber([], "facture", "2026", null, { facture: { year: "2026", last: "x" } }), "F2026-001", "valeur illisible ignorée");
});

test("une série commencée garde son préfixe jusqu'à la fin de l'année", () => {
  const docs = [];
  issueAll(docs, draft());
  assert.equal(E.seriesPrefix(docs, "facture", "2026"), "F");
  assert.equal(E.seriesPrefix(docs, "facture", "2027"), null);
  assert.equal(E.nextNumber(docs, "facture", "2026", { facture: "FA-" }), "F2026-002", "changement de préfixe en cours d'année : sans effet sur la série");
  assert.equal(issueAll(docs, draft({ date: "2026-12-30" }), null, { facture: "FA-" }).number, "F2026-002");
  assert.equal(issueAll(docs, draft({ date: "2027-01-04" }), null, { facture: "FA-" }).number, "FA-2027-001", "nouvelle série : nouveau préfixe");
  assert.equal(issueAll(docs, draft({ date: "2026-12-31" }), null, { facture: "FA-" }).number, "F2026-003", "facture de fin d'année émise en janvier");
});

test("A16 : numérotation du générateur reconnue et continuée", () => {
  assert.deepEqual(E.continuation([], "facture", "2026-007", "2026"), { prefix: "", year: "2026", last: 6, number: "2026-007" });
  assert.deepEqual(E.continuation([], "devis", "D-2026-003", "2026"), { prefix: "D-", year: "2026", last: 2, number: "D-2026-003" });
  assert.equal(E.continuation([], "facture", "2025-014", "2026"), null, "année différente");
  assert.equal(E.continuation([], "facture", "FAC-42", "2026"), null, "forme sans année");
  assert.equal(E.continuation([], "facture", "2026-07", "2026"), null, "rang sur 2 chiffres : format différent de l'Espace");
  assert.equal(E.continuation([], "facture", "2026-000", "2026"), null, "rang nul");
  const docs = [];
  issueAll(docs, draft());
  assert.equal(E.continuation(docs, "facture", "2026-007", "2026"), null, "une facture est déjà émise cette année dans l'Espace");

  const cont = E.continuation([], "facture", "2026-007", "2026");
  const numbering = { facture: { year: cont.year, last: cont.last } }, prefixes = { facture: cont.prefix };
  const d2 = [];
  assert.equal(issueAll(d2, draft(), numbering, prefixes).number, "2026-007");
  assert.equal(issueAll(d2, draft({ date: "2026-10-06" }), numbering, prefixes).number, "2026-008");
});

// ----- A14 et A15 : reprise du document du générateur ---------------------------------------------------

const generatorDoc = (over = {}) => Object.assign({
  type: "facture", number: "2026-007", date: "2026-10-15", serviceDate: "2026-10-10", terms: "45", validity: "30", depositPct: 30,
  nature: "services",
  me: { name: "Camille Martin EI", status: "EI", address: "12 rue de la République\n69002 Lyon", siret: "123 456 789 00012", vat: "",
        email: "camille@exemple.fr", phone: "", iban: "FR76 9999", bic: "", logo: "" },
  client: { name: "  Studio   Nova ", address: "14 rue des Lilas\n69003 Lyon", id: "812 345 678", vat: "FR00812345678", delivery: "", pro: true },
  lines: [{ desc: "Création du site", qty: 1, price: 1500 }, { desc: "", qty: 1, price: null }, { desc: "Maintenance", qty: 3, price: 80 }],
  vat: { franchise: true, rate: 20, place: "fr", debits: false }, paid: 500, penalty: "trois fois le taux d'intérêt légal", notes: "Merci !"
}, over);
const ids = { doc: "new-doc", client: "new-client" };

test("A14 : le brouillon reprend lignes, client, TVA et conditions", () => {
  const r = E.fromGenerator(generatorDoc(), profile, [], [], ids, "2026-10-20", "2026-10-20T10:00:00Z");
  assert.equal(r.doc.type, "facture");
  assert.equal(r.doc.status, "draft");
  assert.equal(r.doc.date, "2026-10-15");
  assert.equal(r.doc.serviceDate, "2026-10-10");
  assert.equal(r.doc.terms, 45);
  assert.equal(r.doc.depositPct, 0, "pas d'acompte sur une facture");
  assert.deepEqual(r.doc.lines, [{ desc: "Création du site", qty: 1, price: 1500 }, { desc: "Maintenance", qty: 3, price: 80 }], "ligne vide retirée");
  assert.equal(E.total(r.doc), 1740);
  assert.deepEqual(r.doc.vat, { franchise: true, rate: 20, place: "fr", debits: false });
  assert.equal(r.doc.penalty, "trois fois le taux d'intérêt légal");
  assert.equal(r.doc.notes, "Merci !");
  assert.equal(r.paid, 500, "l'acompte déjà versé est signalé, pas repris comme montant");
  assert.equal(r.doc.paid, undefined);
  assert.equal(r.vatDiffers, false);
  assert.deepEqual(r.continuation, { prefix: "", year: "2026", last: 6, number: "2026-007" });

  const q = E.fromGenerator(generatorDoc({ type: "devis", number: "D-2026-003", depositPct: 40, validity: "15" }), profile, [], [], ids, "2026-10-20", "t");
  assert.equal(q.doc.type, "devis");
  assert.equal(q.doc.depositPct, 40);
  assert.equal(q.doc.validity, 15);
  assert.equal(q.doc.serviceDate, q.doc.date);
  assert.equal(q.continuation.prefix, "D-");
});

test("A15 : client existant rattaché ou créé ; profil complété sur ses champs vides", () => {
  const existing = [{ id: "c9", name: "studio nova", pro: true, place: "eu", address: "Ancienne adresse" }];
  let r = E.fromGenerator(generatorDoc(), profile, existing, [], ids, "2026-10-20", "t");
  assert.equal(r.newClient, false);
  assert.equal(r.client, existing[0]);
  assert.equal(r.client.address, "Ancienne adresse", "fiche existante non modifiée");
  assert.equal(r.doc.clientId, "c9");
  assert.equal(r.doc.vat.place, "eu", "la TVA suit la fiche client");

  r = E.fromGenerator(generatorDoc(), profile, [], [], ids, "2026-10-20", "t");
  assert.equal(r.newClient, true);
  assert.deepEqual([r.client.id, r.client.name, r.client.siren, r.client.vat, r.client.pro, r.client.place],
    ["new-client", "Studio Nova", "812 345 678", "FR00812345678", true, "fr"]);
  assert.equal(r.doc.clientId, "new-client");

  assert.deepEqual(r.profilePatch, { status: "EI", address: "12 rue de la République\n69002 Lyon", siret: "123 456 789 00012",
    email: "camille@exemple.fr" }, "IBAN déjà renseigné dans le profil : non remplacé");

  r = E.fromGenerator(generatorDoc({ client: { name: "", pro: true } }), profile, [], [], ids, "2026-10-20", "t");
  assert.equal(r.client, null);
  assert.equal(r.doc.clientId, "");
});

test("A15 : TVA selon le profil, débits et cas limites", () => {
  const reel = Object.assign({}, profile, { vatRegime: "simplified", vatRate: 20 });
  let r = E.fromGenerator(generatorDoc({ vat: { franchise: true, rate: 10, place: "fr", debits: true } }), reel, [], [], ids, "2026-10-20", "t");
  assert.equal(r.doc.vat.franchise, false);
  assert.equal(r.doc.vat.rate, 10);
  assert.equal(r.doc.vat.debits, true);
  assert.equal(r.vatDiffers, true, "le générateur était en franchise, le profil ne l'est pas");

  r = E.fromGenerator(generatorDoc({ client: { name: "Acme Ltd", pro: true }, vat: { franchise: false, rate: 20, place: "world", debits: true } }),
    reel, [], [], ids, "2026-10-20", "t");
  assert.equal(r.client.place, "world");
  assert.equal(r.doc.vat.place, "world");
  assert.equal(r.doc.vat.debits, false, "pas d'option pour les débits sans TVA française");

  r = E.fromGenerator(generatorDoc({ date: "", terms: "", nature: "x", lines: [] }), profile, [], [], ids, "2026-10-20", "t");
  assert.equal(r.doc.date, "2026-10-20");
  assert.equal(r.doc.terms, 30);
  assert.equal(r.doc.nature, "services");
  assert.equal(r.doc.lines.length, 1);

  const taken = Object.assign({}, profile, { prefixes: { facture: "F", devis: "", avoir: "A" } });
  assert.equal(E.fromGenerator(generatorDoc(), taken, [], [], ids, "2026-10-20", "t").continuation, null, "préfixe déjà pris par les devis");
  assert.equal(E.fromGenerator(generatorDoc({ number: "2025-012", date: "2025-12-30" }), profile, [], [], ids, "2026-01-12", "t").continuation, null,
    "document d'une année passée : pas de changement de préfixe");
  const ahead = Object.assign({}, profile, { numbering: { facture: { year: "2026", last: 9 } } });
  assert.equal(E.fromGenerator(generatorDoc(), ahead, [], [], ids, "2026-10-20", "t").continuation, null, "numérotation déjà plus avancée");
});
