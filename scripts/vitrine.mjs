// Images de la vitrine des accueils (documentation/58-images-du-site.md) : captures des vrais outils du site construit,
// avec des données d'exemple, en WebP dans src/assets/img/vitrine/<section>-<nom>.webp.
// Usage : python3 build.py && node scripts/vitrine.mjs   (Playwright ; Python avec Pillow pour l'encodage WebP)
// Chaque élément est capturé sur toute sa largeur, à la densité 2, avec un rapport hauteur / largeur fixe : la mise en
// page de l'accueil ne bouge pas quand on les refait ; leurs dimensions vont dans dimensions.json (lu par build.py). Les dates des exemples suivent la date du jour : relancer le script au moins chaque année.
import { createRequire } from "module";
import { spawn, execFileSync } from "child_process";
import { mkdtempSync, symlinkSync, mkdirSync, rmSync, unlinkSync, rmdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(root, "src", "assets", "img", "vitrine");
const PORT = 8777;

// Sert docs/ sous /outils-freelance/, comme GitHub Pages.
const serveDir = mkdtempSync(path.join(tmpdir(), "of-vitrine-"));
symlinkSync(path.join(root, "docs"), path.join(serveDir, "outils-freelance"));
const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: serveDir, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const BASE = `http://127.0.0.1:${PORT}/outils-freelance/`;

/** Espace d'exemple (France) : deux ans de factures payées, deux devis, des dépenses et deux charges, datés par
 *  rapport au jour de la capture. Exécuté dans la page (window.EspaceStore, window.OFE.espaceFR). */
function frEspaceDemo() {
  const S = window.EspaceStore, E = window.OFE.espaceFR, d = S.empty();
  const uid = () => crypto.randomUUID();
  const iso = (dt) => dt.toISOString().slice(0, 10);
  const today = new Date();
  const day = (y, m, dd) => iso(new Date(Date.UTC(y, m, dd)));
  d.profile = { name: "Camille Martin EI", status: "Entrepreneur individuel (micro-entreprise)", activity: "liberal_bnc", vatRegime: "franchise",
    periodicity: "quarterly", vl: false, acre: 0, startDate: "2021-03-01", address: "12 rue de la République\n69002 Lyon",
    siret: "12345678900012", email: "contact@exemple.fr", cashBalance: 8200, cashDate: day(today.getUTCFullYear(), today.getUTCMonth(), 1), cashThreshold: 3000 };
  d.settings.lastExport = iso(today);
  const names = ["Studio Nova", "Atelier Lumen", "Maison Brune", "Agence Orbe", "Coopérative Sillon"];
  d.clients = names.map((n, i) => ({ id: "c" + i, name: n, pro: true, address: (10 + i) + " avenue des Lilas\n75011 Paris", email: "contact@client" + i + ".example" }));
  const me = { name: d.profile.name, address: d.profile.address, siret: d.profile.siret, email: d.profile.email, status: d.profile.status };
  const amounts = [1800, 2400, 1250, 3200, 950, 2750, 1600];
  let k = 0;
  for (let back = 22; back >= 0; back--) {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    const y = first.getUTCFullYear(), m = first.getUTCMonth();
    for (let j = 0; j < (m % 3 === 2 ? 2 : 1); j++) {
      const date = day(y, m, 5 + j * 12);
      if (date > iso(today)) continue;
      const client = k % names.length, amount = amounts[k++ % amounts.length] + (back < 12 ? 300 : 0);
      const draft = { id: uid(), type: "facture", status: "draft", date, terms: 30, clientId: "c" + client,
        lines: [{ desc: ["Site vitrine", "Accompagnement mensuel", "Audit d'accessibilité", "Refonte graphique", "Formation"][client], qty: 1, price: amount }],
        vat: { franchise: true, rate: 20, place: "fr" }, payments: [] };
      const r = E.issue(d.documents, draft, me, d.clients[client], null, date + "T10:00:00Z");
      if (r.errors.length) throw new Error(r.errors.join(" "));
      const paid = new Date(date + "T00:00:00Z"); paid.setUTCDate(paid.getUTCDate() + 28);
      if (iso(paid) < iso(today)) r.doc.payments = [{ id: uid(), date: iso(paid), amount, method: "virement", note: "" }];
      d.documents.push(r.doc);
    }
  }
  for (let back = 22; back >= 0; back--) {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    const y = first.getUTCFullYear(), m = first.getUTCMonth();
    d.expenses.push({ id: uid(), date: day(y, m, 2), supplier: "Logiciel Pro", label: "Abonnement", method: "carte", ref: "", amount: 39, category: "logiciels" });
    d.expenses.push({ id: uid(), date: day(y, m, 8), supplier: "Opérateur", label: "Forfait mobile et box", method: "prelevement", ref: "", amount: 42, category: "telecom" });
  }
  const start = day(today.getUTCFullYear() - 1, 0, 1);
  d.charges.push({ id: uid(), label: "Coworking", amount: 280, every: "month", start, end: "", flow: "out", revenue: false });
  d.charges.push({ id: uid(), label: "Assurance RC pro", amount: 320, every: "year", start, end: "", flow: "out", revenue: false });
  return S.save(d);
}

/** Espace d'exemple (États-Unis) : vingt-trois mois de factures payées par virement ACH, des dépenses rangées sur les
 *  lignes de l'annexe C dont la description officielle leur correspond, deux charges, datés par rapport au jour de la
 *  capture. Exécuté dans la page (window.EspaceStore, window.OFE.espaceUS). */
function usEspaceDemo() {
  const S = window.EspaceStore, E = window.OFE.espaceUS.create(window.OF_ESPACE_TEXTS.en), d = S.empty();
  const uid = () => crypto.randomUUID();
  const iso = (dt) => dt.toISOString().slice(0, 10);
  const today = new Date();
  const day = (y, m, dd) => iso(new Date(Date.UTC(y, m, dd)));
  d.profile = { name: "Jordan Lee Design", filingStatus: "single", address: "100 Market Street\nSan Francisco, CA 94105", email: "hello@example.com",
    terms: 30, payment: "ACH or Zelle: hello@example.com", cashBalance: 9400, cashDate: day(today.getUTCFullYear(), today.getUTCMonth(), 1), cashThreshold: 3000 };
  d.settings.lastExport = iso(today);
  const names = ["Northwind Studio", "Bluebird Labs", "Cedar & Pine", "Harbor Coffee Co.", "Summit Analytics"];
  d.clients = names.map((n, i) => ({ id: "c" + i, name: n, pro: true, address: (200 + i * 15) + " Congress Avenue\nAustin, TX 78701", email: "ap@client" + i + ".example" }));
  const me = { name: d.profile.name, address: d.profile.address, email: d.profile.email, phone: "", taxId: "", logo: "", payment: d.profile.payment, late: "" };
  const amounts = [2400, 3200, 1650, 4100, 1250, 3600, 2100];
  let k = 0;
  for (let back = 22; back >= 0; back--) {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    const y = first.getUTCFullYear(), m = first.getUTCMonth();
    for (let j = 0; j < (m % 3 === 2 ? 2 : 1); j++) {
      const date = day(y, m, 5 + j * 12);
      if (date > iso(today)) continue;
      const client = k % names.length, amount = amounts[k++ % amounts.length] + (back < 12 ? 400 : 0);
      const c = d.clients[client];
      const draft = { id: uid(), type: "facture", status: "draft", date, terms: 30, clientId: c.id, po: "",
        lines: [{ desc: ["Website design", "Monthly retainer", "Accessibility audit", "Brand refresh", "Workshop"][client], qty: 1, price: amount }],
        tax: { rate: 0, label: "" }, payments: [] };
      const r = E.issue(d.documents, draft, me, { name: c.name, address: c.address, email: c.email, taxId: "", pro: true }, null, date + "T10:00:00Z");
      if (r.errors.length) throw new Error(r.errors.join(" "));
      const paid = new Date(date + "T00:00:00Z"); paid.setUTCDate(paid.getUTCDate() + 28);
      if (iso(paid) < iso(today)) r.doc.payments = [{ id: uid(), date: iso(paid), amount, method: "ach", note: "" }];
      d.documents.push(r.doc);
    }
  }
  for (let back = 22; back >= 0; back--) {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    const y = first.getUTCFullYear(), m = first.getUTCMonth();
    d.expenses.push({ id: uid(), date: day(y, m, 3), supplier: "Shared workspace", label: "Coworking membership", method: "card", ref: "", amount: 250, line: "20b" });
    d.expenses.push({ id: uid(), date: day(y, m, 9), supplier: "Office supply store", label: "Paper, ink and postage", method: "card", ref: "", amount: 36, line: "18" });
    if (m % 3 === 0) d.expenses.push({ id: uid(), date: day(y, m, 20), supplier: "CPA firm", label: "Bookkeeping review", method: "ach", ref: "", amount: 180, line: "17" });
  }
  const start = day(today.getUTCFullYear() - 1, 0, 1);
  d.charges.push({ id: uid(), label: "Coworking membership", amount: 250, every: "month", start, end: "", flow: "out", revenue: false });
  d.charges.push({ id: uid(), label: "Professional liability insurance", amount: 540, every: "year", start, end: "", flow: "out", revenue: false });
  return S.save(d);
}

/** Saisies d'exemple du générateur de facture (France). */
async function frInvoice(page) {
  await page.fill("#f-me-name", "Camille Martin EI");
  await page.fill("#f-me-address", "12 rue de la République\n69002 Lyon");
  await page.fill("#f-me-siret", "123 456 789 00012");
  await page.fill("#f-client-name", "Studio Nova SAS");
  await page.fill("#f-client-address", "14 rue des Lilas\n69003 Lyon");
  await page.fill("#l-desc-0", "Création du site vitrine");
  await page.fill("#l-qty-0", "1");
  await page.fill("#l-price-0", "1800");
  await page.click("#f-add-line");
  await page.fill("#l-desc-1", "Rédaction des contenus");
  await page.fill("#l-qty-1", "3");
  await page.fill("#l-price-1", "150,50");
}

/** Saisies d'exemple des générateurs de facture et de contrat des autres sections (exemples repris des textes d'aide
 *  de chaque générateur : mêmes noms fictifs que ceux que le visiteur voit dans les champs vides). */
const EXAMPLES = {
  us: { me: "Alex Morgan Design LLC", meAddr: "123 Main Street\nAustin, TX 78701", client: "Northwind Inc.", clientAddr: "500 Market Street\nSan Francisco, CA 94105",
        lines: [["Website design", "1", "1800"], ["Copywriting (hours)", "3", "150.50"]], title: "Website redesign", price: "4500",
        scope: "Design and build of a five-page website, including copywriting and one round of revisions." },
  uk: { me: "James Taylor (trading as Taylor Design)", meAddr: "12 High Street\nBristol BS1 4DJ", client: "Brightside Ltd", clientAddr: "1 Market Square\nManchester M1 1AA",
        lines: [["Website design", "1", "1800"], ["Copywriting (hours)", "3", "150.50"]], title: "Website redesign", price: "4500",
        scope: "Design and build of a five-page website, including copywriting and one round of revisions." },
  ca: { me: "Alex Morgan Design", meAddr: "123 Main Street\nToronto, ON M5V 2T6", client: "Maple Leaf Media Inc.", clientAddr: "200 Bay Street\nToronto, ON M5J 2J2",
        lines: [["Website design", "1", "1800"], ["Copywriting (hours)", "3", "150.50"]], title: "Website redesign", price: "4500",
        scope: "Design and build of a five-page website, including copywriting and one round of revisions." },
  "ca-fr": { me: "Camille Tremblay Design", meAddr: "123, rue Saint-Denis\nMontréal (Québec) H2X 3K8", client: "Studio Boréal inc.",
        clientAddr: "500, Grande Allée Est\nQuébec (Québec) G1R 2J7", lines: [["Conception du site Web", "1", "1800"], ["Rédaction (heures)", "3", "150,50"]],
        title: "Refonte du site internet", price: "4500",
        scope: "Conception et réalisation d'un site de cinq pages, rédaction comprise, avec une série de corrections." },
};
const invoice = (ex) => async (page) => {
  await page.fill("#iv-me-name", ex.me);
  await page.fill("#iv-me-address", ex.meAddr);
  await page.fill("#iv-client-name", ex.client);
  await page.fill("#iv-client-address", ex.clientAddr);
  for (const [i, [desc, qty, price]] of ex.lines.entries()) {
    if (i) await page.click("#iv-add-line");
    await page.fill(`#l-desc-${i}`, desc);
    await page.fill(`#l-qty-${i}`, qty);
    await page.fill(`#l-price-${i}`, price);
  }
};
const contract = (ex) => async (page) => {
  await page.fill("#k-p-name", ex.me);
  await page.fill("#k-c-name", ex.client);
  await page.fill("#k-title", ex.title);
  await page.fill("#k-scope", ex.scope);
  // Début de la mission : dans deux semaines (date du jour de la capture).
  await page.fill("#k-start", new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10));
  await page.fill("#k-price", ex.price);
};
/** Vitrine d'une section sans Espace : générateur de facture (grande tuile), contrat (haute), trois calculateurs. */
const SMALL = { ratio: 0.7, viewport: 1280, from: ".results", hide: ".results > :nth-child(n+3)" };
const sectionShots = (key, base, invoicePage, contractPage, tools) => [
  { name: "facture", url: base + invoicePage, fill: invoice(EXAMPLES[key]), from: ".tool-layout", ratio: 0.62, viewport: 1280 },
  // Variante téléphone : la facture seule (le formulaire et l'aperçu côte à côte y seraient illisibles).
  { name: "facture-mobile", url: base + invoicePage, fill: invoice(EXAMPLES[key]), from: "#iv-preview", ratio: 1.1, viewport: 1280, hide: "#iv-reset" },
  { name: "contrat", url: base + contractPage, fill: contract(EXAMPLES[key]), from: "#k-preview", ratio: 1.15, viewport: 1280 },
  ...tools.map(([name, page, options]) => Object.assign({ name, url: base + page }, SMALL, options)),
];

// Chaque capture : page, préparation, élément capturé sur toute sa largeur, rapport hauteur / largeur de la zone
// découpée (les trois petites tuiles de l'accueil ont le même, pour être alignées) et, au besoin, éléments masqués
// sous la zone (le fond de page les remplace : pas de carte coupée à moitié).
const SHOTS = {
  fr: [
    { name: "espace", url: "fr/espace/", demo: frEspaceDemo, hash: "#/", from: "#espace-view .kpis", ratio: 0.62, viewport: 1180 },
    // Variante téléphone (servie sous 600 px par build.py : balise <picture>) : la version ordinateur y serait illisible.
    { name: "espace-mobile", url: "fr/espace/", demo: frEspaceDemo, hash: "#/", from: "#espace-view .kpis", ratio: 1.3, viewport: 390 },
    { name: "facture", url: "fr/generateur-facture/", fill: frInvoice, from: "#f-preview", ratio: 1.15, viewport: 1280 },
    { name: "simulateur", url: "fr/simulateur-auto-entrepreneur/", from: ".results", ratio: 0.7, viewport: 1280,
      hide: ".results > :nth-child(n+3)" },
    { name: "calendrier", url: "fr/calendrier-fiscal-auto-entrepreneur/", from: ".results", ratio: 0.7, viewport: 1280 },
    { name: "tresorerie", url: "fr/espace/", demo: frEspaceDemo, hash: "#/tresorerie", from: "#espace-view .tr-charts .espace-card", ratio: 0.7, viewport: 1280 },
  ],
  // États-Unis : comme la France (D96), l'Espace en grande tuile (avec sa variante téléphone), puis l'aperçu de facture.
  us: [
    { name: "espace", url: "us/workspace/", demo: usEspaceDemo, hash: "#/", from: "#espace-view .kpis", ratio: 0.62, viewport: 1180 },
    { name: "espace-mobile", url: "us/workspace/", demo: usEspaceDemo, hash: "#/", from: "#espace-view .kpis", ratio: 1.3, viewport: 390 },
    // Facture d'exemple complète (instructions de paiement, remerciement) : la feuille remplit la zone capturée ; ce qui
    // la suit (encart vers l'Espace, bouton) est masqué au cas où elle serait moins haute.
    { name: "facture", url: "us/invoice-generator/", from: "#iv-preview", ratio: 1.15, viewport: 1280, hide: ".espace-cta, #iv-reset",
      fill: async (page) => {
        await invoice(EXAMPLES.us)(page);
        await page.fill("#iv-payment", "ACH or Zelle: billing@example.com");
        await page.fill("#iv-notes", "Thank you for your business!");
      } },
    ...[["impot", "self-employment-tax-calculator/"], ["acomptes", "quarterly-tax-calculator/"], ["tarif", "hourly-rate-calculator/"]]
      .map(([name, page]) => Object.assign({ name, url: "us/" + page }, SMALL)),
  ],
  uk: sectionShots("uk", "uk/", "invoice-generator/", "freelance-contract/",
    [["impot", "self-employed-tax-calculator/"], ["tarif", "day-rate-calculator/"], ["calendrier", "tax-calendar/", { hide: null }]]),
  ca: sectionShots("ca", "ca/", "invoice-generator/", "freelance-contract/",
    [["impot", "self-employed-tax-calculator/"], ["taxes", "gst-hst-calculator/"], ["tarif", "hourly-rate-calculator/"]]),
  "ca-fr": sectionShots("ca-fr", "ca/fr/", "generateur-facture/", "contrat-de-service/",
    [["impot", "calculateur-impot-travailleur-autonome/"], ["taxes", "calcul-tps-tvq/"], ["tarif", "calculateur-taux-horaire/"]]),
};
const LOCALES = { fr: "fr-FR", us: "en-US", uk: "en-GB", ca: "en-CA", "ca-fr": "fr-CA" };

const only = process.argv[2];
// Dimensions des images (pixels réels), lues par build.py pour les attributs width et height.
const MANIFEST = path.join(OUT, "dimensions.json");
const sizes = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(path.join(tmpdir(), "of-vitrine-png-"));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  for (const [section, shots] of Object.entries(SHOTS)) {
    if (only && only !== section) continue;
    for (const s of shots) {
      const context = await browser.newContext({ viewport: { width: s.viewport, height: 1000 }, deviceScaleFactor: 2, locale: LOCALES[section] });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(BASE + s.url, { waitUntil: "networkidle" });
      if (s.demo) {
        await page.evaluate(s.demo);
        await page.goto(BASE + s.url + (s.hash || ""), { waitUntil: "networkidle" });
        await page.reload({ waitUntil: "networkidle" });
      }
      if (s.fill) await s.fill(page);
      await page.evaluate(() => document.fonts.ready);
      // Pas d'animation ni de curseur clignotant dans l'image ; l'en-tête collant et les résultats collants ne doivent
      // pas recouvrir l'élément capturé.
      await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }" +
        " .site-header { display: none !important; } .results, .espace-nav { position: static !important; }" +
        (s.hide ? ` ${s.hide} { visibility: hidden !important; }` : "") });
      // Haut de l'élément en haut de l'écran (un élément plus haut que l'écran serait sinon centré, et la zone découpée
      // tomberait en son milieu).
      await page.evaluate((sel) => window.scrollTo(0, document.querySelector(sel).getBoundingClientRect().top + window.scrollY), s.from);
      await page.mouse.move(0, 0);
      await page.waitForTimeout(400);
      const box = await page.locator(s.from).first().boundingBox();
      if (!box) throw new Error(`${section}-${s.name} : élément introuvable (${s.from})`);
      const width = Math.round(box.width), height = Math.round(box.width * s.ratio);
      const png = path.join(tmp, `${section}-${s.name}.png`);
      await page.screenshot({ path: png, clip: { x: box.x, y: box.y, width, height } });
      const webp = path.join(OUT, `${section}-${s.name}.webp`);
      execFileSync("python3", ["-I", "-c",
        "import sys; from PIL import Image; Image.open(sys.argv[1]).convert('RGB').save(sys.argv[2], 'WEBP', quality=82, method=6)", png, webp]);
      if (errors.length) throw new Error(`${section}-${s.name} : erreur JavaScript : ${errors[0]}`);
      sizes[`${section}-${s.name}`] = [width * 2, height * 2];
      console.log(`${section}-${s.name}.webp (${width * 2} × ${height * 2})`);
      await context.close();
    }
  }
  writeFileSync(MANIFEST, JSON.stringify(Object.fromEntries(Object.entries(sizes).sort()), null, 2) + "\n");
} finally {
  await browser.close();
  server.kill();
  rmSync(tmp, { recursive: true, force: true });
  // Le lien vers docs/ est retiré seul (jamais suivi), puis le dossier vide.
  unlinkSync(path.join(serveDir, "outils-freelance"));
  rmdirSync(serveDir);
}
