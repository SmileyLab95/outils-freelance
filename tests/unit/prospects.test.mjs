// Prospects de l'Espace (documentation/38-prospects.md) : contrôle de la saisie, étape calculée d'après les devis et
// les échanges, valeur, pipeline, relances dues, conservation de 3 ans (CNIL), clés de la liste d'opposition, CSV.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { ruleValues } from "./regles.mjs";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/espace-fr.js");
const R = ruleValues("fr");
const p = (over) => Object.assign({ id: "p1", name: "Atelier Lumen", contact: "Inès Moreau", email: "ines@lumen.fr", phone: "06 12 34 56 78",
  pro: true, source: "Recommandation", stage: "new", value: 1200, nextDate: "", nextAction: "", notes: "", clientId: "", exchanges: [],
  createdAt: "2026-10-01T09:00:00Z", updatedAt: "2026-10-01T09:00:00Z" }, over);
const me = { name: "Camille Martin EI" };
const client = { id: "c1", name: "Atelier Lumen", pro: true };
const quote = (over) => Object.assign({ id: "q" + Math.random(), type: "devis", status: "draft", date: "2026-10-10", clientId: "c1", prospectId: "p1",
  validity: 30, lines: [{ desc: "Identité visuelle", qty: 1, price: 1500 }], vat: { franchise: true, rate: 20, place: "fr" }, payments: [] }, over);
const issued = (docs, over) => {
  const r = E.issue(docs, quote(over), me, client, null, "2026-10-20T10:00:00Z");
  assert.deepEqual(r.errors, []);
  docs.push(r.doc);
  return r.doc;
};
const fields = (errors) => errors.map((e) => e.field);

test("règles de la CNIL lues : conservation de 3 ans, opposition, email et téléphone", () => {
  assert.equal(R.prospects_conservation.annees, 3);
  assert.equal(R.prospects_opposition.conservation_min_annees, 3);
  assert.match(R.prospection_telephone.particuliers, /consentement préalable/);
  assert.equal(R.prospection_telephone.depuis, "2026-08-11");
  assert.match(R.prospection_email.particuliers, /consentement préalable/);
});

test("contrôle d'une fiche : nom, email, valeur, date de relance, étape", () => {
  assert.deepEqual(E.prospectErrors(p()), []);
  assert.deepEqual(E.prospectErrors(p({ email: "", phone: "", value: null, contact: "" })), [], "seul le nom est obligatoire");
  assert.deepEqual(fields(E.prospectErrors(p({ name: "  " }))), ["name"]);
  assert.deepEqual(fields(E.prospectErrors(p({ email: "ines@lumen" }))), ["email"]);
  assert.deepEqual(fields(E.prospectErrors(p({ email: "ines lumen.fr" }))), ["email"]);
  assert.deepEqual(fields(E.prospectErrors(p({ value: -1 }))), ["value"]);
  assert.deepEqual(fields(E.prospectErrors(p({ value: NaN }))), ["value"]);
  assert.deepEqual(E.prospectErrors(p({ value: 0 })), [], "valeur nulle admise");
  assert.deepEqual(fields(E.prospectErrors(p({ nextDate: "2026-13-01" }))), ["nextDate"]);
  assert.deepEqual(fields(E.prospectErrors(p({ nextDate: "12/10/2026" }))), ["nextDate"]);
  assert.deepEqual(fields(E.prospectErrors(p({ nextDate: "2026-02-29" }))), ["nextDate"], "29 février d'une année non bissextile");
  assert.deepEqual(E.prospectErrors(p({ nextDate: "2028-02-29" })), []);
  assert.deepEqual(fields(E.prospectErrors(p({ stage: "optout" }))), ["stage"]);
  assert.deepEqual(fields(E.prospectErrors(p({ stage: "toString" }))), ["stage"], "nom hérité d'un objet refusé");
  assert.deepEqual(fields(E.prospectErrors(p({ name: "", email: "x", value: -2 }))), ["name", "email", "value"]);
});

test("contrôle d'un échange : date passée ou du jour, sens, résumé", () => {
  const x = { date: "2026-10-28", from: "them", text: "Demande de devis par téléphone" };
  assert.deepEqual(E.exchangeErrors(x, "2026-10-28"), []);
  assert.deepEqual(fields(E.exchangeErrors(Object.assign({}, x, { date: "2026-10-29" }), "2026-10-28")), ["date"], "pas d'échange dans le futur");
  assert.deepEqual(fields(E.exchangeErrors(Object.assign({}, x, { date: "" }), "2026-10-28")), ["date"]);
  assert.deepEqual(fields(E.exchangeErrors(Object.assign({}, x, { from: "other" }), "2026-10-28")), ["from"]);
  assert.deepEqual(fields(E.exchangeErrors(Object.assign({}, x, { text: " " }), "2026-10-28")), ["text"]);
});

test("étape calculée : choix de l'utilisateur, échanges, devis émis, devis accepté ; gagné et perdu restent", () => {
  const docs = [];
  assert.equal(E.prospectStage(p(), docs), "new");
  assert.equal(E.prospectStage(p({ exchanges: [{ id: "x1", date: "2026-10-02", from: "me", text: "Appel" }] }), docs), "talks", "un échange : en discussion");
  assert.equal(E.prospectStage(p({ stage: "quote" }), docs), "quote", "étape choisie plus avancée gardée");
  const q = quote();
  docs.push(q);
  assert.equal(E.prospectStage(p(), docs), "new", "un brouillon de devis ne change rien");
  docs.length = 0;
  const sent = issued(docs);
  assert.equal(E.prospectStage(p(), docs), "quote", "devis émis : devis envoyé");
  assert.equal(E.prospectStage(p({ id: "p2" }), docs), "new", "devis d'une autre piste ignoré");
  sent.status = "refused";
  assert.equal(E.prospectStage(p(), docs), "quote", "devis refusé : la piste reste à devis envoyé");
  sent.status = "accepted";
  assert.equal(E.prospectStage(p(), docs), "won", "devis accepté : gagné");
  assert.equal(E.prospectStage(p({ stage: "lost" }), docs), "lost", "perdu choisi : gardé");
  sent.status = "sent";
  sent.invoiceId = "f1";
  assert.equal(E.prospectStage(p(), docs), "won", "devis facturé : gagné");
  assert.equal(E.prospectStage(p({ stage: "won" }), []), "won");
  assert.equal(E.prospectStage(p({ stage: "lost", exchanges: [{ id: "x1", date: "2026-10-02", from: "me", text: "Appel" }] }), []), "lost");
  assert.equal(E.prospectStage(p({ stage: "bogus" }), []), "new", "étape illisible : à contacter");
  assert.equal(E.prospectStage(p({ exchanges: [{ id: "x1", date: "2026-10-02", from: "me", text: "Appel", deletedAt: "2026-10-03T00:00:00Z" }] }), []), "new",
    "échange effacé (synchronisation) ignoré");
  assert.equal(E.minStage(p({ stage: "quote" }), []), "new", "étape minimale : sans tenir compte du choix");
  assert.equal(E.minStage(p({ stage: "new" }), docs), "won");
  assert.equal(E.duplicate(sent, "2026-10-25", "q2").prospectId, "p1", "devis dupliqué (revu) : toujours lié à la piste");
  assert.equal(E.invoiceFromQuote(sent, "2026-10-25", "f2").prospectId, undefined, "facture tirée du devis : pas liée à la piste");
});

test("valeur : montant HT du dernier devis émis, sinon estimation", () => {
  const docs = [];
  assert.equal(E.prospectValue(p(), docs), 1200);
  assert.equal(E.prospectValue(p({ value: null }), docs), null);
  assert.equal(E.prospectValue(p({ value: "abc" }), docs), null, "valeur illisible (import)");
  assert.equal(E.prospectValue(p({ value: 1200.006 }), docs), 1200.01, "arrondie au centime");
  docs.push(quote({ lines: [{ desc: "Brouillon", qty: 1, price: 9999 }] }));
  assert.equal(E.prospectValue(p(), docs), 1200, "brouillon ignoré");
  issued(docs, { date: "2026-10-10" });
  issued(docs, { date: "2026-10-15", lines: [{ desc: "Identité et site", qty: 2, price: 1100.105 }] });
  assert.equal(E.prospectValue(p(), docs), 2200.21, "dernier devis émis, HT arrondi au centime");
  assert.equal(E.prospectValue(p({ value: null }), docs), 2200.21);
});

test("pipeline : nombre et valeur par étape, pistes ouvertes", () => {
  const docs = [];
  issued(docs, { prospectId: "p3", lines: [{ desc: "Site", qty: 1, price: 800 }] });
  const list = [p({ id: "p3", value: 100 }), p({ id: "p1", value: 0.1 }), p({ id: "p6", value: 0.2 }), p({ id: "p2", stage: "talks", value: null }),
    p({ id: "p4", stage: "won", value: 300 }), p({ id: "p5", stage: "lost", value: null })];
  const s = E.pipeline(list, docs);
  assert.deepEqual(s.new, { count: 2, value: 0.3 }, "0,1 + 0,2 au centime");
  assert.deepEqual(s.talks, { count: 1, value: 0 });
  assert.deepEqual(s.quote, { count: 1, value: 800 }, "valeur du devis émis");
  assert.deepEqual(s.won, { count: 1, value: 300 });
  assert.deepEqual(s.lost, { count: 1, value: 0 });
  assert.deepEqual(s.open, { count: 4, value: 800.3 }, "800 + 0,1 + 0,2 au centime");
});

test("relances dues : pistes ouvertes dont la date est aujourd'hui ou passée, la plus ancienne d'abord", () => {
  const docs = [];
  issued(docs, { prospectId: "p5" });
  docs[0].status = "accepted";
  const list = [p({ id: "p1", name: "B", nextDate: "2026-10-28" }), p({ id: "p2", name: "A", nextDate: "2026-10-27" }),
    p({ id: "p3", nextDate: "2026-10-29" }), p({ id: "p4", stage: "lost", nextDate: "2026-10-01" }),
    p({ id: "p5", nextDate: "2026-10-01" }), p({ id: "p6", nextDate: "" }), p({ id: "p7", name: "A", nextDate: "2026-10-28" })];
  assert.deepEqual(E.followUps(list, docs, "2026-10-28").map((x) => x.id), ["p2", "p7", "p1"], "date puis nom ; gagné (devis accepté) et perdu exclus");
});

test("conservation : 3 ans après le dernier contact de sa part, sinon après la création ; pistes gagnées exclues", () => {
  const old = p({ createdAt: "2023-10-28T08:00:00Z" });
  assert.deepEqual(E.retentionDue([old], [], "2026-10-27", 3), [], "veille de l'échéance");
  assert.deepEqual(E.retentionDue([old], [], "2026-10-28", 3).map((x) => [x.prospect.id, x.since, x.due]), [["p1", "2023-10-28", "2026-10-28"]]);
  const mine = p({ createdAt: "2023-01-10T08:00:00Z", exchanges: [{ id: "x1", date: "2026-01-05", from: "me", text: "Relance" }] });
  assert.equal(E.retentionDue([mine], [], "2026-10-28", 3).length, 1, "un échange de ma part ne compte pas");
  const theirs = p({ createdAt: "2023-01-10T08:00:00Z", exchanges: [{ id: "x1", date: "2024-02-29", from: "them", text: "Demande de documentation" },
    { id: "x2", date: "2023-05-01", from: "them", text: "Premier appel" }] });
  assert.equal(E.lastContactFrom(theirs), "2024-02-29", "le plus récent, pas le dernier de la liste");
  assert.equal(E.lastContactFrom(p({ exchanges: theirs.exchanges.concat([{ id: "x3", date: "2026-01-01", from: "them", text: "Effacé", deletedAt: "2026-02-01T00:00:00Z" }]) })),
    "2024-02-29", "échange effacé (synchronisation) ignoré");
  assert.deepEqual(E.retentionDue([p({ createdAt: "1999-13-45T00:00:00Z" })], [], "2026-10-28", 3), [], "date de création illisible : pas de rappel");
  assert.deepEqual(E.retentionDue([theirs], [], "2027-02-27", 3), []);
  assert.deepEqual(E.retentionDue([theirs], [], "2027-02-28", 3).map((x) => x.due), ["2027-02-28"], "29 février : 28 février");
  assert.deepEqual(E.retentionDue([p({ stage: "won", createdAt: "2020-01-01T00:00:00Z" })], [], "2026-10-28", 3), [], "client : autre règle");
  assert.equal(E.retentionDue([p({ stage: "lost", createdAt: "2020-01-01T00:00:00Z" })], [], "2026-10-28", 3).length, 1, "piste perdue : comptée");
  assert.equal(E.addYears("2026-03-31", 3), "2029-03-31");
  assert.equal(E.addYears("2028-02-29", 4), "2032-02-29");
});

test("liste d'opposition : email, téléphone et nom normalisés avant l'empreinte", () => {
  assert.deepEqual(E.optoutKeys({ email: " Ines@Lumen.FR ", phone: "+33 6 12 34 56 78", name: "Atelier Lumen" }),
    ["e:ines@lumen.fr", "t:0612345678", "n:atelier lumen"]);
  for (const phone of ["06 12 34 56 78", "06.12.34.56.78", "+33 (0)6 12 34 56 78", "+33612345678", "0033 6 12 34 56 78"]) {
    assert.deepEqual(E.optoutKeys({ phone }), ["t:0612345678"], phone);
  }
  assert.deepEqual(E.optoutKeys({ phone: "+44 20 7946 0958" }), ["t:+442079460958"]);
  assert.deepEqual(E.optoutKeys({ phone: "0044 20 7946 0958" }), ["t:+442079460958"], "00 : préfixe international");
  assert.deepEqual(E.optoutKeys({ phone: "12 34" }), [], "trop court");
  assert.deepEqual(E.optoutKeys({ email: "pas une adresse" }), []);
  assert.deepEqual(E.optoutKeys({ name: "  Éloïse   D'Arcy-Lefèvre " }), ["n:eloise d arcy lefevre"]);
  assert.deepEqual(E.optoutKeys({ name: "Œuvre & Cie" }), ["n:oeuvre cie"]);
  assert.deepEqual(E.optoutKeys({ name: " - " }), []);
  assert.deepEqual(E.optoutKeys({}), []);
});

test("export CSV des prospects", () => {
  const docs = [];
  const list = [p({ exchanges: [{ id: "x1", date: "2026-10-03", from: "them", text: "Appel" }], nextDate: "2026-11-02", nextAction: "Envoyer \"le\" devis" }),
    p({ id: "p2", name: "Studio Nova", contact: "", email: "", phone: "", pro: false, source: "", value: null, stage: "lost" }),
    p({ id: "p3", name: "Sans type", pro: undefined, email: "", phone: "", contact: "", source: "", value: null })];
  assert.equal(E.prospectsCSV(list, docs),
    "Nom;Interlocuteur;Type;Email;Téléphone;Origine;Étape;Valeur HT;Prochaine relance;Prochaine action;Dernier contact de sa part;Créé le\r\n" +
    '"Atelier Lumen";"Inès Moreau";Professionnel;"ines@lumen.fr";"06 12 34 56 78";"Recommandation";En discussion;1200,00;02/11/2026;"Envoyer ""le"" devis";03/10/2026;01/10/2026\r\n' +
    '"Studio Nova";"";Particulier;"";"";"";Perdu;;;"";;01/10/2026\r\n' +
    '"Sans type";"";Professionnel;"";"";"";À contacter;;;"";;01/10/2026');
  assert.deepEqual(Object.keys(E.STAGE_LABELS), ["new", "talks", "quote", "won", "lost"]);
});
