// Jeu d'essai Factur-X : écrit le fichier XML de chaque cas dans un dossier, pour valider.py.
// Usage : node tests/facturx/generer.mjs <dossier>
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const E = require("../../src/assets/engines/espace-fr.js");
const FX = require("../../src/assets/engines/facturx-fr.js");
const FXPDF = require("../../src/assets/engines/facturx-pdf.js");
const assets = { fonts: require("../../src/assets/engines/pdf-fonts.js"), icc: require("../../src/assets/engines/pdf-srgb.js"),
                 logo: null, now: "2026-10-20T10:00:00Z" };
const data = JSON.parse(readFileSync(new URL("../../data/rules/fr.json", import.meta.url)));
const R = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v.value]));
const fmt = { eur: (n) => n.toFixed(2).replace(".", ",") + " €", num: String, date: (iso) => iso.split("-").reverse().join("/") };
const out = path.resolve(process.argv[2] || "facturx-xml");
mkdirSync(out, { recursive: true });

const me = { name: "Camille Martin EI", status: "Entrepreneur individuel", address: "12 rue de la République\n69002 Lyon",
             siret: "123 456 789 00012", vat: "", email: "camille@exemple.fr", iban: "FR76 3000 6000 0112 3456 7890 189" };
const clients = {
  fr: { name: "Studio Nova SAS", address: "14 rue des Lilas\n69003 Lyon", id: "812 345 678", vat: "FR00812345678", pro: true, place: "fr" },
  eu: { name: "Atelier Berlin GmbH", address: "Friedrichstraße 10", postcode: "10117", city: "Berlin", country: "DE", vat: "DE123456789",
        email: "rechnung@atelier-berlin.example", pro: true, place: "eu" },
  world: { name: "Maple Studio Inc.", address: "200 Queen Street", postcode: "H2X 1Y4", city: "Montréal", country: "CA",
           email: "billing@maple.example", pro: true, place: "world" },
};
const base = (over) => Object.assign({ id: "d" + Math.random(), type: "facture", status: "draft", date: "2026-10-05", serviceDate: "2026-10-01",
  terms: 30, nature: "services", lines: [{ desc: "Création du site vitrine", qty: 1, price: 1800 }],
  vat: { franchise: true, rate: 20, place: "fr" }, penalty: "trois fois le taux d'intérêt légal", payments: [] }, over);

const cases = [];
const add = (name, docs, doc, client, meOver) => {
  const r = E.issue(docs, doc, Object.assign({}, me, meOver), client, null, "2026-10-20T10:00:00Z");
  if (r.errors.length) throw new Error(name + " : " + r.errors.join(" "));
  docs.push(r.doc);
  cases.push([name, r.doc, docs]);
  return r.doc;
};

let docs = [];
const inv = add("franchise", docs, base(), clients.fr);
add("avoir", docs, Object.assign(E.creditFromInvoice(inv, "2026-10-08", "a1"), { lines: [{ desc: "Remise commerciale", qty: 1, price: 300 }] }), clients.fr);
docs = [];
add("tva-20-debits", docs, base({ vat: { franchise: false, rate: 20, place: "fr", debits: true }, nature: "mixte",
  lines: [{ desc: "Conseil", qty: 2.5, price: 450 }, { desc: "Licence & support <annuel>", qty: 1, price: 99.99 }], notes: "Merci pour votre confiance !" }),
  clients.fr, { vat: "FR40123456789" });
docs = [];
add("tva-5-5-acompte", docs, base({ vat: { franchise: false, rate: 5.5, place: "fr" }, nature: "biens", paid: 200, terms: 0,
  lines: [{ desc: "Livres", qty: 3, price: 33.333333 }] }), clients.fr, { vat: "FR40123456789", iban: "" });
docs = [];
add("autoliquidation-ue", docs, base({ vat: { franchise: false, rate: 20, place: "eu" } }), clients.eu, { vat: "FR40123456789" });
docs = [];
add("hors-ue", docs, base({ vat: { franchise: false, rate: 20, place: "world" } }), clients.world, { vat: "FR40123456789" });
docs = [];
add("hors-ue-biens", docs, base({ nature: "biens", vat: { franchise: false, rate: 20, place: "world" }, lines: [{ desc: "Affiches imprimées", qty: 10, price: 25 }] }),
  clients.world, { vat: "FR40123456789" });
docs = [];
const many = Array.from({ length: 34 }, (_, i) => ({ desc: `Journée d'atelier n° ${i + 1} : préparation, animation et compte rendu détaillé ` +
  "remis au client, avec les supports de formation et la synthèse des échanges", qty: 1, price: 650 + i }));
add("plusieurs-pages-logo", docs, base({ lines: many, notes: "Łódź, Ærøskøbing : caractères du latin étendu ; Ω et → sont remplacés." }),
  clients.fr, { logo: "logo" });
docs = [];
add("nom-long-belgique", docs, base({ vat: { franchise: false, rate: 20, place: "eu" },
  notes: "Merci de rappeler le numéro de facture dans le libellé de votre virement : il nous permet de rapprocher votre paiement sans délai." }),
  { name: "Atelier de design graphique et de communication visuelle de Bruxelles SRL", address: "Rue Neuve 1\n1000 Bruxelles", country: "BE",
    vat: "BE0123456789", email: "compta@atelier.example", pro: true, place: "eu" },
  { name: "Camille Martin EI — Conseil en transformation numérique et formation professionnelle", vat: "FR40123456789", logo: "logo" });
docs = [];
// Temps passé facturé (documentation/37-temps-passe.md) : quantités en heures (HUR) et en jours (DAY), ligne sans unité (C62).
add("temps-heures-jours", docs, base({ vat: { franchise: false, rate: 20, place: "fr" }, lines: [
  { desc: "Maquettes de la page d'accueil — du 12/10/2026 au 16/10/2026", qty: 3.75, unit: "hour", price: 60 },
  { desc: "Atelier de cadrage — 15/10/2026", qty: 0.5, unit: "day", price: 450 }, { desc: "Licence de police", qty: 1, price: 40 }] }),
  clients.fr, { vat: "FR40123456789" });
docs = [];
add("franchise-2027", docs, base({ date: "2027-01-15", serviceDate: "2027-01-10" }), clients.fr);

for (const [name, doc, all] of cases) {
  const problems = FX.check(doc);
  if (problems.length) console.log(`! ${name} : ${problems.join(" ")}`);
  writeFileSync(path.join(out, name + ".xml"), FX.xml(doc, all, R, fmt));
  const withLogo = doc.snapshot.me.logo ? Object.assign({}, assets, { logo: { jpeg: readFileSync(new URL("logo.jpg", import.meta.url)), width: 240, height: 120 } }) : assets;
  const pdf = FXPDF.build(doc, all, R, fmt, withLogo);
  if (pdf.missing.length) console.log(`! ${name} : caractères remplacés ${pdf.missing.join(" ")}`);
  writeFileSync(path.join(out, name + ".pdf"), pdf.bytes);
}
console.log(`${cases.length} factures (XML et PDF) écrites dans ${out}`);
