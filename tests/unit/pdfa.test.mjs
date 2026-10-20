// Tests du générateur PDF/A-3 (engines/pdfa.js) et du PDF Factur-X (engines/facturx-pdf.js). La conformité PDF/A-3
// et Factur-X complète est vérifiée par Mustang (veraPDF) : python3 tests/facturx/valider.py <dossier> --pdf.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const PDFA = require("../../src/assets/engines/pdfa.js");
const FXPDF = require("../../src/assets/engines/facturx-pdf.js");
const E = require("../../src/assets/engines/espace-fr.js");
const fonts = require("../../src/assets/engines/pdf-fonts.js");
const icc = require("../../src/assets/engines/pdf-srgb.js");
const data = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const fmt = { eur: (n) => n.toFixed(2).replace(".", ",") + " €", num: String, date: (iso) => iso.split("-").reverse().join("/") };
const latin1 = (bytes) => Buffer.from(bytes).toString("latin1");

function sample() {
  const pdf = PDFA.create({ fonts, icc, title: "Facture F2026-001", author: "Camille Martin EI", creator: "Test", producer: "Test",
                            date: "2026-10-20T10:00:00Z", lang: "fr-FR" });
  const page = pdf.page();
  page.text(40, 800, "Été 2026 : « 1 234,56 € »", { size: 12 });
  page.text(40, 780, "Gras", { font: "bold", size: 12 });
  page.rect(40, 700, 100, 20, { fill: [0.3, 0.3, 0.9] });
  page.line(40, 690, 200, 690);
  pdf.attach("factur-x.xml", PDFA.utf8("<a>é</a>"), "text/xml", "Alternative", "Données");
  return pdf.save();
}

test("structure : en-tête binaire, objets aux positions de la table xref, longueurs des flux", () => {
  const bytes = sample();
  const s = latin1(bytes);
  assert.ok(s.startsWith("%PDF-1.7\n%"));
  assert.ok([...s.slice(10, 14)].every((c) => c.charCodeAt(0) > 127), "commentaire binaire après l'en-tête");
  const start = +/startxref\n(\d+)\n%%EOF\n$/.exec(s)[1];
  const xref = s.slice(start).split("\n");
  assert.equal(xref[0], "xref");
  const count = +xref[1].split(" ")[1];
  for (let id = 1; id < count; id++) {
    const offset = +xref[2 + id].slice(0, 10);
    assert.ok(s.startsWith(id + " 0 obj\n", offset), `objet ${id} à la position ${offset}`);
  }
  for (const m of s.matchAll(/\/Length (\d+) >>\nstream\n/g)) {
    const begin = m.index + m[0].length, len = +m[1];
    assert.equal(s.slice(begin + len, begin + len + 10), "\nendstream", "longueur exacte du flux");
  }
  assert.match(s, /\/ID \[<[0-9A-F]{32}> <[0-9A-F]{32}>\]/);
});

test("PDF/A : XMP pdfaid, OutputIntent sRGB, police incorporée, fichier joint déclaré dans /AF", () => {
  const s = latin1(sample());
  assert.match(s, /<pdfaid:part>3<\/pdfaid:part><pdfaid:conformance>B<\/pdfaid:conformance>/);
  assert.match(s, /\/OutputIntents \[<< \/Type \/OutputIntent \/S \/GTS_PDFA1 \/OutputConditionIdentifier \(sRGB IEC61966-2\.1\)/);
  assert.match(s, /\/Subtype \/CIDFontType2 .*\/CIDToGIDMap \/Identity/);
  assert.match(s, /\/FontFile2 \d+ 0 R/);
  assert.match(s, /\/Type \/EmbeddedFile \/Subtype \/text#2Fxml \/Params << \/ModDate \(D:20261020100000\+00'00'\) \/Size 9 >>/);
  assert.match(s, /\/AFRelationship \/Alternative/);
  assert.match(s, /\/AF \[\d+ 0 R\]/);
  assert.match(s, /\/Names << \/EmbeddedFiles << \/Names \[\(factur-x\.xml\) \d+ 0 R\] >> >>/);
  assert.match(s, /\/Lang \(fr-FR\)/);
  assert.doesNotMatch(s, /\/Encrypt|\/JavaScript|\/JS /);
});

test("texte : glyphes de la police, table ToUnicode, remplacement des caractères absents", () => {
  const pdf = PDFA.create({ fonts, icc, title: "t", author: "a", creator: "c", producer: "p", date: "2026-10-20T10:00:00Z" });
  const page = pdf.page();
  page.text(10, 10, "Ω é →");
  assert.deepEqual(pdf.missing().sort(), ["Ω", "→"]);
  assert.ok(pdf.width("Facture", 10) > 30 && pdf.width("Facture", 10) < 45, "largeur plausible");
  assert.ok(pdf.width("Facture", 10, "bold") > pdf.width("Facture", 10), "gras plus large");
  const s = latin1(pdf.save());
  assert.match(s, /beginbfchar/);
  assert.match(s, /<[0-9A-F]{4}> <00E9>/, "é dans la table ToUnicode");
  assert.doesNotMatch(s, /<03A9>|<2192>/, "un caractère remplacé n'entre pas dans la table");
});

test("ToUnicode : un glyphe garde le caractère qu'il montre, même après un remplacement", () => {
  const pdf = PDFA.create({ fonts, icc, title: "t", author: "a", creator: "c", producer: "p", date: "2026-10-20T10:00:00Z" });
  const page = pdf.page();
  page.text(10, 10, "ạ Ω puis a et ?");
  const s = latin1(pdf.save());
  const a = fonts.regular.cmap[97].toString(16).toUpperCase().padStart(4, "0");
  const q = fonts.regular.cmap[63].toString(16).toUpperCase().padStart(4, "0");
  assert.match(s, new RegExp("<" + a + "> <0061>"), "le glyphe de « a » se lit « a »");
  assert.match(s, new RegExp("<" + q + "> <003F>"), "le glyphe de « ? » se lit « ? »");
  assert.doesNotMatch(s, /<1EA1>|<03A9>/);
});

test("dates et chaînes : formats PDF et XMP, UTF-16 pour les textes", () => {
  assert.deepEqual(PDFA.dates("2026-10-20T10:05:09Z"), { pdf: "D:20261020100509+00'00'", xmp: "2026-10-20T10:05:09+00:00" });
  assert.equal(PDFA.textString("Été"), "<FEFF00C9007400E9>");
});

test("PDF Factur-X : XML joint identique au moteur, coupure des lignes, pages", () => {
  const me = { name: "Camille Martin EI", address: "12 rue de la République\n69002 Lyon", siret: "123 456 789 00012" };
  const client = { name: "Studio Nova SAS", address: "14 rue des Lilas\n69003 Lyon", id: "812 345 678", pro: true, place: "fr" };
  const lines = Array.from({ length: 40 }, (_, i) => ({ desc: "Ligne " + (i + 1) + " " + "très longue désignation ".repeat(4), qty: 1, price: 10 }));
  const doc = E.issue([], { id: "d1", type: "facture", status: "draft", date: "2026-10-05", terms: 30, nature: "services", lines,
    vat: { franchise: true, rate: 20, place: "fr" }, payments: [] }, me, client, null, "2026-10-20T10:00:00Z").doc;
  const out = FXPDF.build(doc, [doc], R, fmt, { fonts, icc, logo: null, now: "2026-10-20T10:00:00Z" });
  const s = latin1(out.bytes);
  assert.ok(out.xml.includes("<ram:ID>F2026-001</ram:ID>"));
  assert.ok(s.includes(out.xml.slice(0, 60)), "XML joint tel quel");
  assert.equal((s.match(/\/Type \/Page /g) || []).length, 3, "40 lignes sur 3 pages");
  assert.match(s, /<fx:ConformanceLevel>EN 16931<\/fx:ConformanceLevel>/);
  assert.deepEqual(out.missing, []);

  const pdf = PDFA.create({ fonts, icc, title: "t", author: "a", creator: "c", producer: "p" });
  const wrapped = FXPDF.wrap(pdf, "un texte assez long pour être coupé en plusieurs lignes\nnouvelle ligne", 9, 100);
  assert.ok(wrapped.length >= 4);
  wrapped.forEach((l) => assert.ok(pdf.width(l, 9) <= 100, `« ${l} » tient dans la largeur`));
  assert.equal(wrapped[wrapped.length - 1], "nouvelle ligne");
});
