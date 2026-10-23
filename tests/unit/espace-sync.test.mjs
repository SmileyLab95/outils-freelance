// Tests du moteur de synchronisation (documentation/12-specification-comptes.md, § 3.1) : un scénario par règle, la
// symétrie de la fusion, et une simulation reproductible de plusieurs appareils (convergence et invariants).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const S = require("../../src/assets/engines/espace-sync.js");
const E = require("../../src/assets/engines/espace-fr.js");

const T = (n) => new Date(Date.UTC(2026, 9, 1, 8) + n * 60000).toISOString();
const uidFrom = (prefix) => { let k = 0; return () => `${prefix}-${++k}`; };
const state = (over = {}) => Object.assign({ schema: 2, profile: null, clients: [], documents: [], expenses: [], timeEntries: [], settings: { lastExport: null }, savedAt: null }, over);
const client = (over = {}) => Object.assign({ id: "c1", name: "Studio Nova", email: "a@nova.example", pro: true, place: "fr", createdAt: T(0), updatedAt: T(0) }, over);
const draft = (over = {}) => Object.assign({ id: "d1", type: "facture", status: "draft", date: "2026-10-05", clientId: "c1", terms: 30, nature: "services",
  lines: [{ desc: "Site", qty: 1, price: 1000 }], vat: { franchise: true, rate: 20, place: "fr" }, payments: [], createdAt: T(0), updatedAt: T(0) }, over);
const issue = (doc, at, docs = []) => E.issue(docs, doc, { name: "Camille" }, { name: "Studio Nova", pro: true }, null, at).doc;
const merge = (o, a, b, prefix = "copie") => S.merge(o, a, b, { uid: uidFrom(prefix) });
const data = (x) => S.canonical(Object.assign({}, x, { settings: null, savedAt: null }));
const sym = (o, a, b) => assert.equal(data(merge(o, a, b).data), data(merge(o, b, a).data), "même résultat dans les deux sens");

test("champ modifié d'un seul côté : gardé ; des deux côtés : le plus récent l'emporte, conflit signalé", () => {
  const o = state({ clients: [client()] });
  const a = state({ clients: [client({ email: "compta@nova.example", updatedAt: T(5) })] });
  const b = state({ clients: [client({ name: "Studio Nova SAS", updatedAt: T(3) })] });
  let r = merge(o, a, b);
  assert.equal(r.data.clients[0].email, "compta@nova.example");
  assert.equal(r.data.clients[0].name, "Studio Nova SAS");
  assert.equal(r.data.clients[0].updatedAt, T(5));
  assert.deepEqual(r.conflicts, []);
  sym(o, a, b);

  const c = state({ clients: [client({ email: "x@nova.example", updatedAt: T(9) })] });
  r = merge(o, a, c);
  assert.equal(r.data.clients[0].email, "x@nova.example", "le plus récent gagne");
  assert.deepEqual(r.conflicts.map((x) => [x.type, x.fields]), [["field", ["email"]]]);
  sym(o, a, c);

  // Même horodatage des deux côtés : un ordre fixe départage, identique sur tous les appareils.
  const t1 = state({ clients: [client({ email: "un@nova.example", updatedAt: T(7) })] });
  const t2 = state({ clients: [client({ email: "deux@nova.example", updatedAt: T(7) })] });
  sym(o, t1, t2);
});

test("enregistrements créés d'un seul côté : ajoutés ; premier lien sans base", () => {
  const a = state({ clients: [client()], documents: [draft()] });
  const b = state({ clients: [client({ id: "c2", name: "Atelier Lumen" })], profile: { name: "Camille", updatedAt: T(1) } });
  const r = merge(null, a, b);
  assert.deepEqual(r.data.clients.map((c) => c.id), ["c1", "c2"]);
  assert.equal(r.data.documents.length, 1);
  assert.equal(r.data.profile.name, "Camille");
  sym(null, a, b);
});

test("supprimé d'un côté, modifié de l'autre : la modification l'emporte ; supprimé sans modification : supprimé", () => {
  const o = state({ documents: [draft()] });
  const deleted = state({ documents: [draft({ deletedAt: T(4), updatedAt: T(4) })] });
  const edited = state({ documents: [draft({ notes: "Merci", updatedAt: T(2) })] });
  let r = merge(o, deleted, edited);
  assert.equal(r.data.documents[0].deletedAt, undefined);
  assert.equal(r.data.documents[0].notes, "Merci");
  assert.equal(r.conflicts[0].type, "deleted-modified");
  sym(o, deleted, edited);
  r = merge(o, deleted, o);
  assert.equal(r.data.documents[0].deletedAt, T(4), "suppression gardée si l'autre côté n'a rien changé");
  assert.deepEqual(r.conflicts, []);
});

test("brouillon émis d'un côté, modifié de l'autre : l'émis l'emporte, copie des modifications en brouillon", () => {
  const o = state({ documents: [draft()] });
  const done = state({ documents: [issue(draft(), T(5))] });
  const edited = state({ documents: [draft({ lines: [{ desc: "Site et logo", qty: 1, price: 1400 }], updatedAt: T(6) })] });
  const r = merge(o, done, edited);
  const kept = r.data.documents.find((d) => d.id === "d1");
  assert.equal(kept.status, "issued");
  assert.equal(kept.number, "F2026-001");
  const copy = r.data.documents.find((d) => d.id !== "d1");
  assert.equal(copy.status, "draft");
  assert.equal(copy.lines[0].desc, "Site et logo");
  assert.equal(copy.number, undefined);
  assert.equal(copy.copyOf, "d1");
  assert.equal(r.conflicts[0].type, "issued-draft");
  sym(o, done, edited);
  const quiet = merge(o, done, o);
  assert.equal(quiet.data.documents.length, 1, "brouillon non modifié : pas de copie");
  assert.deepEqual(quiet.conflicts, []);
});

test("encaissements réunis ; un encaissement supprimé reste supprimé ; un émis ne se supprime pas", () => {
  const inv = issue(draft(), T(1));
  const o = state({ documents: [inv] });
  const p1 = { id: "p1", date: "2026-10-10", amount: 400, method: "virement" };
  const p2 = { id: "p2", date: "2026-10-12", amount: 600, method: "cheque" };
  const a = state({ documents: [Object.assign({}, inv, { payments: [p1], updatedAt: T(3) })] });
  const b = state({ documents: [Object.assign({}, inv, { payments: [p2], updatedAt: T(4) })] });
  let r = merge(o, a, b);
  assert.deepEqual(r.data.documents[0].payments.map((p) => p.id), ["p1", "p2"]);
  sym(o, a, b);

  const both = state({ documents: [Object.assign({}, inv, { payments: [p1, p2] })] });
  const removed = state({ documents: [Object.assign({}, inv, { payments: [Object.assign({}, p1, { deletedAt: T(6) }), p2], updatedAt: T(6) })] });
  r = merge(both, removed, both);
  assert.equal(r.data.documents[0].payments.find((p) => p.id === "p1").deletedAt, T(6));
  r = merge(both, removed, Object.assign(state(), { documents: [Object.assign({}, inv, { payments: [p1, p2], notes: "x", updatedAt: T(7) })] }));
  assert.equal(r.data.documents[0].payments.find((p) => p.id === "p1").deletedAt, T(6), "la suppression n'est pas annulée par une autre modification");

  const wrongly = state({ documents: [Object.assign({}, inv, { deletedAt: T(8), updatedAt: T(8) })] });
  r = merge(o, wrongly, o);
  assert.equal(r.data.documents[0].deletedAt, undefined);
  assert.equal(r.conflicts[0].type, "issued-deleted");
});

test("deux documents émis avec le même numéro : signalé, jamais corrigé", () => {
  const o = state({ documents: [] });
  const a = state({ documents: [issue(draft({ id: "da" }), T(1))] });
  const b = state({ documents: [issue(draft({ id: "db", lines: [{ desc: "Audit", qty: 1, price: 500 }] }), T(2))] });
  const r = merge(o, a, b);
  assert.equal(r.data.documents.length, 2);
  const dup = r.conflicts.find((c) => c.type === "duplicate-number");
  assert.deepEqual([dup.number, dup.ids], ["F2026-001", ["da", "db"]]);
  assert.deepEqual(S.duplicates(r.data.documents), [{ type: "facture", number: "F2026-001", ids: ["da", "db"] }]);
});

test("schéma 1 converti ; réglages de l'appareil non synchronisés ; montants vides équivalents", () => {
  const v1 = { schema: 1, profile: null, clients: [], documents: [draft({ lines: [{ desc: "x", qty: 1, price: NaN }] })], settings: { lastExport: "2026-10-01" } };
  assert.equal(S.migrate(v1).schema, 2);
  const r = merge(null, v1, state({ settings: { lastExport: "autre" } }));
  assert.equal(r.data.schema, 2);
  assert.equal(r.data.settings.lastExport, "2026-10-01");
  assert.equal(S.canonical(NaN), S.canonical(null));
});

test("même brouillon émis sur deux appareils sous deux numéros : les deux sont gardés ; la synchronisation suivante ne recrée rien", () => {
  const o = state({ documents: [draft()] });
  const p1 = { id: "p1", date: "2026-10-21", amount: 300, method: "virement" };
  const p2 = { id: "p2", date: "2026-10-22", amount: 200, method: "cheque" };
  const onA = state({ documents: [Object.assign(issue(draft(), T(5)), { payments: [p1] })] });
  const onB = state({ documents: [Object.assign(issue(draft(), T(6)), { number: "F2026-002", payments: [p2] })] });
  const r = merge(o, onA, onB);
  sym(o, onA, onB);
  const kept = r.data.documents.find((d) => d.id === "d1");
  const copy = r.data.documents.find((d) => d.id !== "d1");
  assert.deepEqual([kept.number, kept.issuedAt, kept.payments.map((p) => p.id)], ["F2026-001", T(5), ["p1"]], "la première émission garde l'identifiant");
  assert.deepEqual([copy.number, copy.issuedAt, copy.status, copy.copyOf, copy.payments.map((p) => p.id)], ["F2026-002", T(6), "issued", "d1", ["p2"]]);
  assert.deepEqual(r.conflicts.map((c) => [c.type, c.numbers]), [["issued-twice", ["F2026-001", "F2026-002"]]]);

  // L'appareil B avait déjà envoyé sa version (c'est sa base) et a saisi un encaissement depuis : il rejoint la copie.
  const p3 = { id: "p3", date: "2026-10-23", amount: 100, method: "virement" };
  const localB = state({ documents: [Object.assign({}, onB.documents[0], { payments: [p2, p3], updatedAt: T(8) })] });
  const again = merge(onB, localB, r.data, "autre");
  sym(onB, localB, r.data);
  assert.equal(again.data.documents.length, 2, "aucune nouvelle copie");
  assert.deepEqual(again.data.documents.find((d) => d.id === "d1").payments.map((p) => p.id), ["p1"]);
  assert.deepEqual(again.data.documents.find((d) => d.id === copy.id).payments.map((p) => p.id), ["p2", "p3"], "l'encaissement suit son numéro");
  assert.equal(again.conflicts[0].type, "issued-twice", "l'appareil B est prévenu à son tour");
  // Une copie de brouillon émise deux fois : la copie de l'émission ne reprend pas la marque de version copiée
  // (copyFrom), sinon deux copies distinctes auraient la même clé.
  const draftCopy = draft({ id: "x1", copyOf: "d0", copyFrom: T(2) });
  const split = merge(state({ documents: [draftCopy] }), state({ documents: [issue(draftCopy, T(5))] }),
    state({ documents: [Object.assign(issue(draftCopy, T(6)), { number: "F2026-002" })] }));
  const second = split.data.documents.find((d) => d.id !== "x1");
  assert.deepEqual([second.copyOf, second.copyFrom, second.number], ["x1", undefined, "F2026-002"]);
  // Un troisième appareil qui connaissait la version de B reçoit simplement l'état commun.
  assert.equal(data(merge(onB, onB, again.data).data), data(again.data));
});

test("même brouillon émis deux fois sous le même numéro : réuni si le contenu est identique, sinon les deux sont gardés et signalés", () => {
  const o = state({ documents: [draft()] });
  const a = state({ documents: [issue(draft(), T(5))] });
  const b = state({ documents: [issue(draft(), T(6))] });
  let r = merge(o, a, b);
  sym(o, a, b);
  assert.equal(r.data.documents.length, 1);
  assert.equal(r.data.documents[0].issuedAt, T(5), "la première émission compte");
  assert.deepEqual(r.conflicts, []);
  assert.equal(merge(b, b, r.data).data.documents.length, 1, "la synchronisation suivante ne sépare rien");

  const c = state({ documents: [issue(draft({ lines: [{ desc: "Audit", qty: 1, price: 500 }] }), T(6))] });
  r = merge(o, a, c);
  sym(o, a, c);
  assert.deepEqual(r.data.documents.map((d) => d.number), ["F2026-001", "F2026-001"]);
  assert.deepEqual(r.conflicts.map((x) => x.type), ["issued-twice", "duplicate-number"]);
  assert.match(r.conflicts[0].message, /deux fois sous le n° F2026-001/);
  assert.equal(merge(c, c, r.data).data.documents.length, 2, "aucune troisième copie");
});

test("émis d'un côté, brouillon de l'autre : sans base (premier lien), copie seulement si le brouillon diffère ; brouillon supprimé : pas de copie", () => {
  const done = state({ documents: [issue(draft(), T(5))] });
  const edited = state({ documents: [draft({ notes: "Acompte reçu", updatedAt: T(6) })] });
  let r = merge(null, done, edited);
  assert.equal(r.data.documents.length, 2);
  assert.equal(r.conflicts[0].type, "issued-draft");
  sym(null, done, edited);
  r = merge(null, done, state({ documents: [draft()] }));
  assert.equal(r.data.documents.length, 1, "brouillon identique au document émis : rien à copier");
  assert.deepEqual(r.conflicts, []);

  const o = state({ documents: [draft()] });
  const gone = state({ documents: [draft({ notes: "x", deletedAt: T(6), updatedAt: T(6) })] });
  r = merge(o, done, gone);
  assert.equal(r.data.documents.length, 1, "un brouillon supprimé n'est pas recopié");
  assert.equal(r.data.documents[0].deletedAt, undefined);
  assert.deepEqual(r.conflicts, []);
  sym(o, done, gone);
});

test("brouillon modifié à nouveau après sa copie : les modifications rejoignent la même copie", () => {
  const o = state({ documents: [draft()] });
  const draftA = state({ documents: [draft({ notes: "v1", updatedAt: T(3) })] }); // envoyé par l'appareil A
  const doneB = state({ documents: [issue(draft(), T(4))] }); // émis hors connexion sur l'appareil B
  const r1 = merge(o, doneB, draftA);
  const copy = r1.data.documents.find((d) => d.id !== "d1");
  assert.deepEqual([copy.notes, copy.copyOf, copy.copyFrom], ["v1", "d1", T(3)]);
  const draftA2 = state({ documents: [draft({ notes: "v2", lines: [{ desc: "Site et SEO", qty: 1, price: 1500 }], updatedAt: T(6) })] });
  const r2 = merge(draftA, draftA2, r1.data, "autre");
  sym(draftA, draftA2, r1.data);
  assert.equal(r2.data.documents.length, 2, "pas de deuxième copie");
  const joined = r2.data.documents.find((d) => d.id === copy.id);
  assert.deepEqual([joined.notes, joined.lines[0].desc, joined.status], ["v2", "Site et SEO", "draft"]);
  assert.deepEqual(r2.conflicts.map((c) => [c.type, c.copyId]), [["issued-draft", copy.id]]);
});

test("liens entre devis et factures : un brouillon copié ne reprend pas le devis ; un lien vers un brouillon supprimé disparaît", () => {
  const quote = Object.assign(issue(draft({ id: "q1", type: "devis", validity: 30 }), T(1)), { invoiceId: "d1" });
  const inv = draft({ quoteId: "q1" });
  const o = state({ documents: [quote, inv] });
  const done = state({ documents: [quote, issue(inv, T(5), [quote])] });
  const edited = state({ documents: [quote, draft({ quoteId: "q1", notes: "x", updatedAt: T(6) })] });
  let r = merge(o, done, edited);
  const copy = r.data.documents.find((d) => d.copyOf === "d1");
  assert.equal(copy.quoteId, undefined, "le devis n'est pas facturé deux fois");
  assert.equal(r.data.documents.find((d) => d.id === "q1").invoiceId, "d1");

  // Facture émise sous deux numéros : la seconde reste « issue du devis » (un document émis ne change pas), le devis
  // reste lié à la première.
  const second = state({ documents: [quote, Object.assign(issue(inv, T(6), [quote]), { number: "F2026-002" })] });
  r = merge(o, done, second);
  sym(o, done, second);
  assert.equal(r.data.documents.find((d) => d.copyOf === "d1").quoteId, "q1");
  assert.equal(r.data.documents.find((d) => d.id === "q1").invoiceId, "d1");

  const gone = state({ documents: [quote, Object.assign({}, inv, { deletedAt: T(7), updatedAt: T(7) })] });
  r = merge(o, gone, o);
  assert.equal(r.data.documents.find((d) => d.id === "q1").invoiceId, undefined);
  sym(o, gone, o);
});

test("encaissements : fusion champ par champ ; même champ modifié des deux côtés signalé ; double suppression sans conflit", () => {
  const inv = issue(draft(), T(1));
  const p = { id: "p1", date: "2026-10-10", amount: 400, method: "virement" };
  const o = state({ documents: [Object.assign({}, inv, { payments: [p] })] });
  const withP = (q) => state({ documents: [Object.assign({}, inv, { payments: [Object.assign({}, p, q)], updatedAt: q.updatedAt || q.deletedAt })] });
  let a = withP({ note: "Acompte", updatedAt: T(3) }), b = withP({ method: "cheque", updatedAt: T(4) });
  let r = merge(o, a, b);
  assert.deepEqual([r.data.documents[0].payments[0].note, r.data.documents[0].payments[0].method], ["Acompte", "cheque"]);
  assert.deepEqual(r.conflicts, []);
  sym(o, a, b);
  a = withP({ amount: 450, updatedAt: T(3) });
  b = withP({ amount: 500, updatedAt: T(4) });
  r = merge(o, a, b);
  assert.equal(r.data.documents[0].payments[0].amount, 500);
  assert.deepEqual(r.conflicts.map((c) => [c.kind, c.type, c.fields]), [["payment", "field", ["amount"]]]);
  sym(o, a, b);
  a = withP({ deletedAt: T(5) });
  b = withP({ deletedAt: T(6) });
  r = merge(o, a, b);
  assert.equal(r.data.documents[0].payments[0].deletedAt, T(5));
  assert.deepEqual(r.conflicts, []);
  sym(o, a, b);
});

test("suppressions : des deux côtés sans conflit ; effacé avec le schéma 1 : client retiré s'il n'a pas changé, document émis gardé", () => {
  const o = state({ clients: [client()], documents: [issue(draft(), T(1))] });
  let r = merge(o, state({ clients: [client({ deletedAt: T(5), updatedAt: T(5) })], documents: o.documents }),
    state({ clients: [client({ deletedAt: T(4), updatedAt: T(4) })], documents: o.documents }));
  assert.equal(r.data.clients[0].deletedAt, T(4));
  assert.deepEqual(r.conflicts, []);

  const v1 = { schema: 1, profile: null, clients: [], documents: [], settings: { lastExport: null } };
  r = merge(o, v1, o);
  assert.deepEqual(r.data.clients, [], "client effacé et inchangé ailleurs : retiré");
  assert.equal(r.data.documents.length, 1);
  assert.deepEqual(r.conflicts.map((c) => [c.kind, c.type]), [["document", "removed-modified"]]);
  assert.match(r.conflicts[0].message, /émis : un document émis est conservé/);
  r = merge(o, v1, state({ clients: [client({ email: "new@nova.example", updatedAt: T(3) })], documents: o.documents }));
  assert.equal(r.data.clients[0].email, "new@nova.example", "client modifié ailleurs : gardé");
  assert.ok(r.conflicts.some((c) => c.kind === "client" && c.type === "removed-modified"));
});

test("revue : compte encore vide ; encaissements sans identifiant ; encaissement supprimé d'un côté et modifié de l'autre", () => {
  const local = state({ clients: [client()], documents: [draft()], profile: { name: "Camille", updatedAt: T(1) } });
  for (const empty of [null, {}, { schema: 2 }]) {
    const r = merge(null, local, empty);
    assert.equal(data(r.data), data(local), "premier envoi vers un compte vide : l'Espace local tel quel");
    assert.deepEqual(r.conflicts, []);
  }
  // Ancienne sauvegarde : encaissements sans identifiant, importée sur deux appareils puis synchronisée.
  const inv = issue(draft(), T(1));
  const old = { schema: 1, clients: [], documents: [Object.assign({}, inv, { payments: [
    { date: "2026-10-10", amount: 100, method: "virement" }, { date: "2026-10-10", amount: 100, method: "virement" }, { date: "2026-10-11", amount: 50, method: "cheque" }] })] };
  assert.deepEqual(S.migrate(old).documents[0].payments.map((p) => p.id), ["d1-p1", "d1-p2", "d1-p3"]);
  let r = merge(null, old, old);
  assert.equal(E.paidAmount(r.data.documents[0]), 250, "aucun encaissement perdu");

  const p = { id: "p1", date: "2026-10-10", amount: 400, method: "virement" };
  const o = state({ documents: [Object.assign({}, inv, { payments: [p] })] });
  const withP = (list, at) => state({ documents: [Object.assign({}, inv, { payments: list, updatedAt: at })] });
  const deleted = withP([Object.assign({}, p, { deletedAt: T(5) })], T(5));
  const corrected = withP([Object.assign({}, p, { amount: 450, updatedAt: T(6) })], T(6));
  r = merge(o, deleted, corrected);
  assert.deepEqual([r.data.documents[0].payments[0].amount, r.data.documents[0].payments[0].deletedAt], [450, undefined], "la correction l'emporte");
  assert.deepEqual(r.conflicts.map((c) => [c.kind, c.type, c.docId]), [["payment", "deleted-modified", "d1"]]);
  sym(o, deleted, corrected);
  // Effacé sans marque (schéma 1) d'un côté, modifié de l'autre : gardé et signalé ; marqué supprimé de l'autre : supprimé, sans conflit.
  r = merge(o, withP([], T(5)), corrected);
  assert.equal(r.data.documents[0].payments[0].amount, 450);
  assert.deepEqual(r.conflicts.map((c) => [c.kind, c.type, c.docId]), [["payment", "removed-modified", "d1"]]);
  r = merge(o, withP([], T(5)), deleted);
  assert.equal(r.data.documents[0].payments[0].deletedAt, T(5));
  assert.deepEqual(r.conflicts, []);
  const od = state({ documents: [draft({ id: "d2" })] });
  r = merge(od, { schema: 1, clients: [], documents: [] }, state({ documents: [draft({ id: "d2", deletedAt: T(4), updatedAt: T(4) })] }));
  assert.equal(r.data.documents[0].deletedAt, T(4), "brouillon supprimé des deux côtés : reste supprimé");
  assert.deepEqual(r.conflicts, [], "sans signalement trompeur");
});

test("revue : devis sans lien vers la facture, émise deux fois : lié à la première émission ; émission partagée sans copie connue : rien n'est mélangé", () => {
  const quote = issue(draft({ id: "q1", type: "devis", validity: 30 }), T(1));
  const inv = draft({ quoteId: "q1" });
  const o = state({ documents: [quote, inv] });
  const a = state({ documents: [quote, issue(inv, T(5), [quote])] });
  const b = state({ documents: [quote, Object.assign(issue(inv, T(6), [quote]), { number: "F2026-002" })] });
  const r = merge(o, a, b, "a"); // identifiant de la copie (« a-1 ») classé avant « d1 »
  assert.equal(r.data.documents.find((d) => d.id === "q1").invoiceId, "d1", "la première émission, quel que soit l'identifiant de la copie");
  sym(o, a, b);

  // La base connaît l'émission F2026-001 ; l'autre côté porte F2026-002 sans la copie attendue (sauvegarde ancienne
  // restaurée, par exemple) : les deux émissions restent distinctes, chacune avec ses encaissements.
  const p = { id: "p1", date: "2026-10-21", amount: 300, method: "virement" };
  const f1 = issue(draft(), T(5)), f2 = Object.assign(issue(draft({ notes: "autre" }), T(6)), { number: "F2026-002" });
  const base = state({ documents: [f1] }), local = state({ documents: [Object.assign({}, f1, { payments: [p], updatedAt: T(7) })] });
  const remote = state({ documents: [f2] });
  const m = merge(base, local, remote);
  sym(base, local, remote);
  assert.deepEqual(m.data.documents.map((d) => [d.number, d.issuedAt, d.payments.map((x) => x.id)]),
    [["F2026-002", T(6), []], ["F2026-001", T(5), ["p1"]]]);
  assert.equal(m.conflicts[0].type, "issued-twice");
});

test("données d'une version plus récente de l'Espace : refusées, sans rien fusionner", () => {
  const newer = { schema: 3, clients: [], documents: [] };
  assert.throws(() => S.migrate(newer), (e) => e.code === "schema-newer");
  assert.throws(() => merge(null, state(), newer), (e) => e.code === "schema-newer");
  assert.throws(() => merge(newer, state(), state()), (e) => e.code === "schema-newer");
});

// ----- Simulation : trois appareils, opérations aléatoires, synchronisations -----------------------------------

function simulate(seed) {
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const pickOne = (list) => list[Math.floor(rnd() * list.length)];
  let clock = 0, ids = 0;
  const tick = () => T(++clock);
  const uid = () => `s${seed}-${++ids}`;
  const devices = [0, 1, 2].map(() => ({ data: state(), base: null }));
  let server = state();
  const issuedIds = new Set(), deletedPayments = new Set();
  const issuances = [], paymentHome = new Map(); // émissions faites ; numéro du document de chaque encaissement
  let reportedDuplicates = false;

  const live = (list) => list.filter((x) => !x.deletedAt);
  const ops = {
    profile(d) { d.data.profile = Object.assign({}, d.data.profile, { name: "Camille " + Math.floor(rnd() * 9), updatedAt: tick() }); },
    addClient(d) { const t = tick(); d.data.clients.push({ id: uid(), name: "Client " + Math.floor(rnd() * 99), pro: true, place: "fr", createdAt: t, updatedAt: t }); },
    editClient(d) { const c = pickOne(live(d.data.clients)); if (c) Object.assign(c, { email: `x${Math.floor(rnd() * 99)}@ex.example`, updatedAt: tick() }); },
    deleteClient(d) { const c = pickOne(live(d.data.clients)); if (c) Object.assign(c, { deletedAt: tick(), updatedAt: T(clock) }); },
    addDraft(d) {
      const c = pickOne(live(d.data.clients)), t = tick(), type = rnd() < 0.2 ? "devis" : "facture";
      d.data.documents.push(draft({ id: uid(), type, clientId: c ? c.id : "", lines: [{ desc: "Ligne", qty: 1, price: 100 + Math.floor(rnd() * 900) }], createdAt: t, updatedAt: t }));
    },
    convert(d) {
      const quote = pickOne(live(d.data.documents).filter((x) => x.type === "devis" && x.status !== "draft" && !x.invoiceId));
      if (!quote) return;
      const inv = E.invoiceFromQuote(quote, "2026-10-20", uid());
      inv.createdAt = inv.updatedAt = tick();
      Object.assign(quote, { status: "accepted", invoiceId: inv.id, updatedAt: T(clock) });
      d.data.documents.push(inv);
    },
    editDraft(d) {
      const doc = pickOne(live(d.data.documents).filter((x) => x.status === "draft"));
      if (doc) Object.assign(doc, { notes: "Note " + Math.floor(rnd() * 99), lines: [{ desc: "Ligne", qty: 1, price: Math.floor(rnd() * 999) + 1 }], updatedAt: tick() });
    },
    deleteDraft(d) {
      const doc = pickOne(live(d.data.documents).filter((x) => x.status === "draft"));
      if (!doc) return;
      Object.assign(doc, { deletedAt: tick(), updatedAt: T(clock) });
      const quote = d.data.documents.find((x) => x.id === doc.quoteId);
      if (quote && quote.invoiceId === doc.id) { delete quote.invoiceId; quote.updatedAt = T(clock); }
    },
    issue(d) {
      const doc = pickOne(live(d.data.documents).filter((x) => x.status === "draft"));
      if (!doc) return;
      const c = d.data.clients.find((x) => x.id === doc.clientId && !x.deletedAt);
      const r = E.issue(d.data.documents, Object.assign({}, doc, { date: "2026-10-20" }), { name: "Camille" }, c ? { name: c.name, pro: true } : null, null, tick());
      if (r.errors.length) return;
      d.data.documents = d.data.documents.map((x) => (x.id === doc.id ? r.doc : x));
      const quote = d.data.documents.find((x) => x.id === r.doc.quoteId);
      if (quote) quote.invoiceId = r.doc.id;
      issuedIds.add(doc.id);
      issuances.push(r.doc);
    },
    pay(d) {
      const doc = pickOne(d.data.documents.filter((x) => x.type === "facture" && x.status !== "draft"));
      if (!doc) return;
      const p = { id: uid(), date: "2026-10-2" + Math.floor(rnd() * 9), amount: 10, method: "virement" };
      doc.payments = (doc.payments || []).concat([p]);
      doc.updatedAt = tick();
      paymentHome.set(p.id, doc.type + "|" + doc.number);
    },
    unpay(d) {
      const doc = pickOne(d.data.documents.filter((x) => x.type === "facture" && x.status !== "draft" && (x.payments || []).some((p) => !p.deletedAt)));
      if (!doc) return;
      const p = pickOne(doc.payments.filter((x) => !x.deletedAt));
      p.deletedAt = tick();
      doc.updatedAt = T(clock);
      deletedPayments.add(p.id);
    },
    sync(d, step) {
      const r = S.merge(d.base, d.data, server, { uid: uidFrom(`s${seed}-copie${step}`) });
      const mirror = S.merge(d.base, server, d.data, { uid: uidFrom(`s${seed}-copie${step}`) });
      assert.equal(data(r.data), data(mirror.data), `graine ${seed}, étape ${step} : fusion symétrique`);
      if (r.conflicts.some((c) => c.type === "duplicate-number")) reportedDuplicates = true;
      r.conflicts.forEach((c) => conflictTypes.add(c.type));
      server = JSON.parse(JSON.stringify(r.data));
      d.data = JSON.parse(JSON.stringify(r.data));
      d.base = JSON.parse(JSON.stringify(r.data));
    }
  };
  // Opérations tirées au sort ; émission, encaissement et création de brouillon plus fréquents.
  const names = Object.keys(ops).filter((n) => n !== "sync").concat(["issue", "issue", "pay", "addDraft"]);
  const conflictTypes = new Set();
  devices.forEach((d) => ops.addClient(d));
  for (let step = 0; step < 120; step++) {
    const d = pickOne(devices), op = rnd() < 0.25 ? "sync" : pickOne(names);
    ops[op](d, step);
  }
  for (let round = 0; round < 2; round++) devices.forEach((d, i) => ops.sync(d, 1000 + round * 10 + i));

  devices.forEach((d, i) => assert.equal(data(d.data), data(server), `graine ${seed} : l'appareil ${i} a convergé`));
  const docs = server.documents;
  issuedIds.forEach((id) => assert.ok(docs.some((x) => x.id === id && x.status !== "draft"), `graine ${seed} : document émis ${id} conservé`));
  assert.ok(docs.every((x) => !(x.status !== "draft" && x.deletedAt)), `graine ${seed} : aucun émis supprimé`);
  // Chaque émission est conservée : telle quelle, ou réunie avec une émission antérieure du même numéro (même contenu).
  issuances.forEach((x) => assert.ok(docs.some((y) => y.type === x.type && y.number === x.number && y.status !== "draft" && y.issuedAt <= x.issuedAt),
    `graine ${seed} : émission ${x.number} du ${x.issuedAt} conservée`));
  // Aucune copie en trop : une émission n'apparaît qu'une fois ; une version de brouillon n'est copiée qu'une fois.
  const keys = docs.filter((x) => x.status !== "draft").map((x) => x.type + "|" + x.number + "|" + x.issuedAt);
  assert.equal(new Set(keys).size, keys.length, `graine ${seed} : aucune émission en double`);
  const copies = docs.filter((x) => x.copyFrom).map((x) => x.copyOf + "|" + x.copyFrom);
  assert.equal(new Set(copies).size, copies.length, `graine ${seed} : aucune copie de brouillon en double`);
  // Chaque encaissement est présent une seule fois, sur un document du numéro où il a été saisi ; supprimé, il le reste.
  const holders = new Map();
  docs.forEach((x) => (x.payments || []).forEach((p) => holders.set(p.id, (holders.get(p.id) || []).concat([{ doc: x, p }]))));
  paymentHome.forEach((home, id) => {
    const h = holders.get(id) || [];
    assert.equal(h.length, 1, `graine ${seed} : encaissement ${id} présent une fois`);
    assert.equal(h[0].doc.type + "|" + h[0].doc.number, home, `graine ${seed} : encaissement ${id} sur son document`);
  });
  deletedPayments.forEach((id) => assert.ok(holders.get(id)[0].p.deletedAt, `graine ${seed} : encaissement ${id} reste supprimé`));
  // Liens entre devis et factures : vers un document existant ; vers une facture émise s'il en existe une.
  docs.filter((q) => q.type === "devis" && q.invoiceId).forEach((q) => {
    const target = docs.find((x) => x.id === q.invoiceId);
    assert.ok(target && !target.deletedAt, `graine ${seed} : devis ${q.id} lié à un document existant`);
    if (docs.some((x) => x.quoteId === q.id && x.status !== "draft")) assert.notEqual(target.status, "draft", `graine ${seed} : devis ${q.id} lié à sa facture émise`);
  });
  if (S.duplicates(docs).length) assert.ok(reportedDuplicates, `graine ${seed} : numéro en double signalé`);
  return { documents: docs.length, issued: issuedIds.size, duplicates: S.duplicates(docs).length, conflictTypes };
}

test("simulation de 50 scénarios à trois appareils : convergence, documents émis et encaissements conservés", () => {
  let issued = 0, dups = 0;
  const seen = new Set();
  for (let seed = 1; seed <= 50; seed++) {
    const r = simulate(seed);
    issued += r.issued;
    dups += r.duplicates;
    r.conflictTypes.forEach((t) => seen.add(t));
  }
  assert.ok(issued > 50, `assez d'émissions simulées (${issued})`);
  assert.ok(dups > 0, "des numéros en double apparaissent (appareils hors connexion) et sont signalés");
  // La simulation passe par chaque règle de conflit.
  ["field", "deleted-modified", "issued-draft", "issued-twice", "duplicate-number"].forEach((t) => assert.ok(seen.has(t), `cas « ${t} » simulé`));
});

// Dépenses (documentation/36-depenses-et-registre-des-achats.md) : fusionnées comme les fiches clients.
const expense = (over = {}) => Object.assign({ id: "e1", date: "2026-10-03", supplier: "Papeterie du centre", label: "Ramettes", amount: 24.9,
  method: "carte", ref: "F-881", createdAt: T(0), updatedAt: T(0) }, over);

test("dépenses : ajoutées des deux côtés, modifiées sur des champs différents, conflit sur un même champ", () => {
  const o = state({ expenses: [expense()] });
  const a = state({ expenses: [expense({ label: "Ramettes A4", updatedAt: T(2) }), expense({ id: "e2", supplier: "Imprimeur", amount: 120, createdAt: T(1), updatedAt: T(1) })] });
  const b = state({ expenses: [expense({ ref: "F-0881", updatedAt: T(3) }), expense({ id: "e3", supplier: "Transporteur", amount: 15, createdAt: T(1), updatedAt: T(1) })] });
  let r = merge(o, a, b);
  assert.deepEqual(r.data.expenses.map((e) => e.id), ["e1", "e2", "e3"]);
  assert.deepEqual([r.data.expenses[0].label, r.data.expenses[0].ref, r.data.expenses[0].updatedAt], ["Ramettes A4", "F-0881", T(3)], "champs différents : les deux gardés");
  assert.deepEqual(r.conflicts, []);
  r = merge(o, state({ expenses: [expense({ amount: 25.9, updatedAt: T(2) })] }), state({ expenses: [expense({ amount: 29.9, updatedAt: T(4) })] }));
  assert.equal(r.data.expenses[0].amount, 29.9, "même champ : la plus récente");
  assert.deepEqual(r.conflicts.map((c) => [c.kind, c.type, c.fields]), [["expense", "field", ["amount"]]]);
  assert.match(r.conflicts[0].message, /^Dépense modifiée sur deux appareils/);
});

test("dépenses : supprimée d'un côté (retirée, ou conservée si modifiée de l'autre) ; anciennes données sans liste", () => {
  const o = state({ expenses: [expense()] });
  let r = merge(o, state({ expenses: [] }), o);
  assert.deepEqual(r.data.expenses, [], "supprimée d'un côté, inchangée de l'autre : retirée");
  r = merge(o, state({ expenses: [] }), state({ expenses: [expense({ amount: 30, updatedAt: T(2) })] }));
  assert.deepEqual([r.data.expenses.length, r.data.expenses[0].amount], [1, 30], "supprimée et modifiée : conservée");
  assert.deepEqual(r.conflicts.map((c) => [c.kind, c.type]), [["expense", "removed-modified"]]);
  assert.equal(r.conflicts[0].message, "Dépense effacée sur un appareil mais modifiée sur un autre : elle est conservée.");
  const marked = merge(o, state({ expenses: [expense({ deletedAt: T(1), updatedAt: T(1) })] }), state({ expenses: [expense({ label: "Encre", updatedAt: T(2) })] }));
  assert.equal(marked.data.expenses[0].deletedAt, undefined, "marquée supprimée et modifiée : conservée");
  assert.deepEqual(marked.conflicts.map((c) => [c.kind, c.type]), [["expense", "deleted-modified"]]);
  const old = { schema: 1, clients: [], documents: [] };
  assert.deepEqual(S.migrate(old).expenses, [], "ancienne sauvegarde sans dépenses");
  assert.deepEqual(merge(null, old, state({ expenses: [expense()] })).data.expenses.map((e) => e.id), ["e1"], "liste d'un seul côté");
});

// Temps passé (documentation/37-temps-passe.md) : fusionné comme les dépenses ; champs nommés en français.
const entry = (over = {}) => Object.assign({ id: "t1", date: "2026-10-12", clientId: "c1", task: "Maquettes", unit: "hour", quantity: 2, rate: 60,
  billable: true, createdAt: T(0), updatedAt: T(0) }, over);

test("temps passé : ajouté des deux côtés, champs différents gardés, conflit sur un même champ nommé en français", () => {
  const o = state({ timeEntries: [entry()] });
  const a = state({ timeEntries: [entry({ task: "Maquettes v2", updatedAt: T(2) }), entry({ id: "t2", quantity: 1, createdAt: T(1), updatedAt: T(1) })] });
  const b = state({ timeEntries: [entry({ invoiceId: "d1", updatedAt: T(3) }), entry({ id: "t3", unit: "day", quantity: 1, createdAt: T(1), updatedAt: T(1) })] });
  let r = merge(o, a, b);
  assert.deepEqual(r.data.timeEntries.map((e) => e.id), ["t1", "t2", "t3"]);
  assert.deepEqual([r.data.timeEntries[0].task, r.data.timeEntries[0].invoiceId], ["Maquettes v2", "d1"], "champs différents : les deux gardés");
  assert.deepEqual(r.conflicts, []);
  r = merge(o, state({ timeEntries: [entry({ quantity: 2.5, rate: 70, updatedAt: T(2) })] }), state({ timeEntries: [entry({ quantity: 3, rate: 65, updatedAt: T(4) })] }));
  assert.deepEqual([r.data.timeEntries[0].quantity, r.data.timeEntries[0].rate], [3, 65], "même champ : la plus récente");
  assert.equal(r.conflicts[0].message, "Temps passé modifié sur deux appareils : la version la plus récente est gardée (durée, taux).");
  const spent = merge(state({ expenses: [expense()] }), state({ expenses: [expense({ supplier: "A", label: "B", ref: "C", updatedAt: T(2) })] }),
    state({ expenses: [expense({ supplier: "X", label: "Y", ref: "Z", updatedAt: T(3) })] }));
  assert.match(spent.conflicts[0].message, /\(nature, référence de la pièce, fournisseur\)\.$/, "dépenses : champs nommés en français");
});

test("temps passé : supprimé d'un côté (retiré, ou conservé si modifié de l'autre) ; anciennes données sans liste", () => {
  const o = state({ timeEntries: [entry()] });
  assert.deepEqual(merge(o, state({ timeEntries: [] }), o).data.timeEntries, [], "supprimé d'un côté, inchangé de l'autre : retiré");
  const r = merge(o, state({ timeEntries: [] }), state({ timeEntries: [entry({ quantity: 3, updatedAt: T(2) })] }));
  assert.deepEqual(r.data.timeEntries.map((e) => e.quantity), [3], "supprimé et modifié : conservé");
  assert.deepEqual(r.conflicts.map((c) => [c.kind, c.type, c.message]),
    [["time", "removed-modified", "Temps passé effacé sur un appareil mais modifié sur un autre : il est conservé."]]);
  const marked = merge(o, state({ timeEntries: [entry({ deletedAt: T(1), updatedAt: T(1) })] }), state({ timeEntries: [entry({ task: "Intégration", updatedAt: T(2) })] }));
  assert.deepEqual(marked.conflicts.map((c) => [c.kind, c.type]), [["time", "deleted-modified"]]);
  assert.deepEqual(S.migrate({ schema: 1, clients: [], documents: [] }).timeEntries, [], "ancienne sauvegarde sans temps");
  assert.deepEqual(merge(null, { schema: 2, clients: [], documents: [] }, state({ timeEntries: [entry()] })).data.timeEntries.map((e) => e.id), ["t1"]);
});
