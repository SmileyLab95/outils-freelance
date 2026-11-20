// Parcours navigateur de l'Espace du Royaume-Uni (documentation/61-espace-royaume-uni.md, § 3 et § 4), sur la page
// en brouillon /uk/workspace/ : OF_DRAFTS=1 python3 build.py, puis node tests/e2e/espace-uk.mjs [dossier-captures].
// Critères : K2 (même aperçu que le générateur public pour les mêmes données) et K8 (aucune erreur JavaScript, aucun
// texte manquant, français ou américain là où l'anglais britannique diffère, aucun débordement horizontal,
// accessibilité AA sur ordinateur, tablette et téléphone) ; K3 à K7 vus à l'écran (moteur : tests/unit/espace-uk.test.mjs).
import { createRequire } from "module";
import { mkdirSync, existsSync, readFileSync } from "fs";
import { readFile } from "fs/promises";
import { homedir } from "os";
import http from "http";
import path from "path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const site = path.join(root, "brouillons");
if (!existsSync(path.join(site, "uk", "workspace", "index.html"))) {
  console.error("Construire d'abord les brouillons : OF_DRAFTS=1 python3 build.py");
  process.exit(1);
}
const shots = path.resolve(process.argv[2] || path.join(root, "tests", "captures-espace-uk"));
mkdirSync(shots, { recursive: true });

// ----- Serveur de test : brouillons/ --------------------------------------------------------------------------------

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png",
                ".webp": "image/webp", ".json": "application/json", ".woff2": "font/woff2", ".ico": "image/x-icon", ".xml": "application/xml" };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]).replace(/^\/outils-freelance/, "");
  if (p.endsWith("/")) p += "index.html";
  try {
    const body = await readFile(path.join(site, path.normalize(p)));
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const ORIGIN = `http://localhost:${server.address().port}`;
const PAGE = ORIGIN + "/outils-freelance/uk/workspace/?today=2026-11-20";

// ----- Vérifications ------------------------------------------------------------------------------------------------

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); console.log(`${cond ? "✓" : "✗"} ${msg}`); };
const AXE_FILE = path.join(process.env.AXE_CORE || path.join(homedir(), ".cache", "axe-core"), "node_modules", "axe-core", "axe.min.js");
const AXE = existsSync(AXE_FILE) ? readFileSync(AXE_FILE, "utf8") : null;
check(AXE !== null, "accessibilité : axe-core disponible");
async function accessible(page, label) {
  if (!AXE) return;
  if (!(await page.evaluate(() => "axe" in window))) await page.addScriptTag({ content: AXE });
  const v = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }))
    .violations.map((x) => `${x.id} : ${x.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`));
  check(v.length === 0, `${label} : accessibilité WCAG 2.1 AA${v.length ? " → " + v.join(" | ") : ""}`);
}
const text = async (page, sel) => ((await page.textContent(sel)) || "").replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const errors = [];
// Mots français, typographie française, ou mots américains là où l'anglais britannique diffère.
const FRENCH = /[àâçéèêëîïôûùœ«»]|\b(le|la|les|des|une|pour|avec|facture|devis|aujourd'hui|janv|févr|avr|juil)\b|\s[:;!?](?=\s|$)/i;
const AMERICAN = /\b(estimates?|credit memos?|canceled|uncheck|Schedule C|IRS|ACH|1099|Zelle|Net 30)\b|\$/;
/** Écran courant : aucun texte français ni américain, aucune clé de texte affichée telle quelle. */
async function british(page, label) {
  const t = await text(page, "#espace-app");
  const bad = (t.match(FRENCH) || [])[0] || (t.match(AMERICAN) || [])[0] || (t.match(/\b(?:eng|uk|us|tr|pros|dl|time|doc|draft)\.[a-z][\w.]*\b/) || [])[0];
  check(!bad, `${label} : texte entièrement en anglais britannique${bad ? " → « " + bad + " »" : ""}`);
}
/** Ordinateur, tablette, téléphone : pas de défilement horizontal ; capture de chaque largeur. */
async function widths(page, name) {
  for (const [label, vp] of [["bureau", { width: 1280, height: 900 }], ["tablette", { width: 768, height: 1024 }], ["mobile", { width: 390, height: 844 }]]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), `${name} (${label}) : pas de défilement horizontal`);
    await page.screenshot({ path: path.join(shots, `${name}-${label}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}
/** Écran complet : texte britannique, accessibilité, trois largeurs. */
async function screen(page, label, name) {
  await british(page, label);
  await accessible(page, label);
  await widths(page, name);
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const context = await browser.newContext({ locale: "en-GB" });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("dialog", (d) => d.accept());
  const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(250); };

  // ----- Premier lancement : région fiscale ----------------------------------------------------------------------
  await page.goto(PAGE, { waitUntil: "networkidle" });
  await page.waitForSelector("#profile-form");
  check((await text(page, "#espace-view h2")) === "Welcome to your workspace" && (await page.getAttribute("html", "lang")) === "en-GB" &&
    (await page.getAttribute("meta[name=robots]", "content")) === "noindex", "premier lancement : accueil en anglais, brouillon non indexé");
  check((await page.$$eval("#ep-region option", (o) => o.map((x) => x.value))).join() === "ruk,scotland", "profil : région fiscale (Écosse ou reste du Royaume-Uni)");
  await british(page, "premier lancement");
  await accessible(page, "premier lancement");
  await page.fill("#ep-name", "Sam Taylor Design");
  await page.click("#profile-form button[type=submit]");
  await page.waitForSelector(".kpis");
  check((await text(page, "#espace-view h2")) === "Sam Taylor Design", "profil créé, tableau de bord");
  await british(page, "tableau de bord vide");

  // ----- Réglages : coordonnées, VAT, coordonnées bancaires, intérêts légaux -------------------------------------
  await go("#/settings");
  await page.fill("#ep-address", "12 High Street, Manchester M1 1AA");
  await page.fill("#ep-email", "sam@example.co.uk");
  await page.fill("#ep-vatNumber", "GB123456789");
  await page.fill("#ep-payment", "Sort code 12-34-56, account 12345678");
  await page.click("#profile-form button[type=submit]");
  await page.waitForTimeout(200);
  check((await text(page, "#profile-error")).startsWith("You entered a VAT registration number") && (await page.evaluate(() => document.activeElement.id)) === "ep-vat",
    "profil : numéro de VAT sans immatriculation refusé");
  await page.fill("#ep-vatNumber", "");
  await page.check("#ep-lateInterest");
  await page.click("#profile-form button[type=submit]");
  await page.waitForTimeout(300);
  const stored = await page.evaluate(() => window.EspaceStore.load());
  check(stored.profile.payment === "Sort code 12-34-56, account 12345678" && stored.profile.terms === 30 && stored.profile.lateInterest === true && stored.profile.vat === "none",
    "profil : coordonnées bancaires, 30 jours, intérêts légaux dans les relances, pas de VAT");
  await screen(page, "réglages", "uk-reglages");

  // ----- Client ---------------------------------------------------------------------------------------------------
  await go("#/clients/nouveau");
  await page.fill("#ep-name", "Northwind Ltd");
  await page.fill("#ep-address", "1 King Street, Leeds LS1 2HL");
  await page.fill("#ep-email", "accounts@northwind.example");
  await page.click("#client-form button[type=submit]");
  await page.waitForSelector(".doc-list");
  check((await text(page, ".doc-list")).includes("Northwind Ltd"), "client créé");

  // ----- Facture : pas de VAT sans immatriculation, aperçu, émission ------------------------------------------------
  await go("#/documents/nouveau?type=facture");
  await page.selectOption("#d-client", { label: "Northwind Ltd" });
  await page.fill("#d-date", "2026-08-31");
  await page.fill("#ln-desc-0", "Website design");
  await page.fill("#ln-price-0", "2,400");
  await page.waitForTimeout(600);
  check((await page.inputValue("#d-tax-rate")) === "none" && (await page.$$eval("#d-tax-rate option", (o) => o.map((x) => x.value))).join() === "none,20,5,0,outside",
    "brouillon : pas de VAT sans immatriculation, mêmes choix de VAT que le générateur");
  const draft = await text(page, "#d-preview");
  check(draft.includes("INVOICE") && draft.includes("£2,400.00") && draft.includes("30 days") && draft.includes("Sort code 12-34-56, account 12345678"),
    "aperçu : livres sterling, 30 jours, coordonnées bancaires");
  await screen(page, "éditeur de facture", "uk-editeur");
  await page.click("#d-issue");
  await page.waitForFunction(() => /Invoice 2026-001/.test(document.querySelector("#espace-view h2").textContent));
  check(!(await page.$("#doc-form")), "facture émise : numéro 2026-001, non modifiable");
  const espaceHTML = await page.innerHTML("#d-preview");

  // ----- K2 : la même facture saisie dans le générateur public a le même aperçu -----------------------------------
  const gen = await context.newPage();
  gen.on("pageerror", (e) => errors.push("générateur : " + e.message));
  await gen.goto(ORIGIN + "/outils-freelance/uk/invoice-generator/", { waitUntil: "networkidle" });
  for (const [sel, v] of [["#iv-number", "2026-001"], ["#iv-date", "2026-08-31"], ["#iv-me-name", "Sam Taylor Design"],
    ["#iv-me-address", "12 High Street, Manchester M1 1AA"], ["#iv-me-email", "sam@example.co.uk"],
    ["#iv-client-name", "Northwind Ltd"], ["#iv-client-address", "1 King Street, Leeds LS1 2HL"], ["#iv-client-email", "accounts@northwind.example"],
    ["#l-desc-0", "Website design"], ["#l-qty-0", "1"], ["#l-price-0", "2,400"], ["#iv-payment", "Sort code 12-34-56, account 12345678"]]) await gen.fill(sel, v);
  await gen.selectOption("#iv-terms", "30");
  await gen.selectOption("#iv-tax-rate", "none");
  await gen.waitForTimeout(300);
  const genHTML = await gen.innerHTML("#iv-preview");
  if (genHTML !== espaceHTML) {
    let i = 0;
    while (i < genHTML.length && genHTML[i] === espaceHTML[i]) i++;
    console.log("écart K2 :\n  générateur : " + genHTML.slice(Math.max(0, i - 80), i + 160) + "\n  Espace     : " + espaceHTML.slice(Math.max(0, i - 80), i + 160));
  }
  check(genHTML === espaceHTML, "K2 : aperçu identique à celui du générateur public pour les mêmes données");
  await gen.close();

  // ----- Encaissement partiel, relance avec intérêts légaux --------------------------------------------------------
  await page.fill("#pay-date", "2026-10-01");
  await page.fill("#pay-amount", "300");
  await page.selectOption("#pay-method", "bank");
  await page.click("#pay-form button[type=submit]");
  await page.waitForTimeout(300);
  check((await text(page, "#espace-view .st")) === "Overdue" || (await text(page, "#espace-view .st")) === "Partially paid", "encaissement partiel");
  const remind = await page.$("#d-remind, a[href^='mailto:'][id*='remind']");
  const remindHref = remind ? decodeURIComponent(await remind.getAttribute("href")).replace(/\s+/g, " ") : "";
  check(remindHref.includes("Under the Late Payment of Commercial Debts (Interest) Act 1998, statutory interest of 11.75% a year is accruing on this invoice from") &&
    remindHref.includes("fixed compensation of £70.00") && remindHref.includes("Kind regards,"),
    "relance d'un client professionnel en retard : intérêts légaux (8 % + taux de référence) et indemnité fixe" + (remindHref ? "" : " → bouton de relance introuvable"));
  await screen(page, "facture émise", "uk-facture");

  // ----- Recettes par année fiscale -------------------------------------------------------------------------------
  await go("#/income");
  const inc = await text(page, "#espace-view");
  check(inc.includes("Income 2026/27") && inc.includes("Payments received£300.00") && !inc.includes("Quarter 3,") && inc.includes("Quarter 2, 06/07/2026 to 05/10/2026"),
    "recettes : année fiscale 2026/27, trimestre de MTD du paiement → " + inc.slice(0, 200));
  await screen(page, "recettes", "uk-recettes");

  // ----- Dépenses par case du SA103S --------------------------------------------------------------------------------
  await go("#/expenses/new");
  await page.fill("#ep-amount", "45.50");
  await page.fill("#ep-supplier", "BT");
  await page.selectOption("#ep-box", "18");
  check((await text(page, "#box-help")).startsWith("Allowable: Phone, mobile, internet, email and fax running costs."), "dépense : aide de la case (fiche HS222)");
  await page.click("#expense-form button[type=submit]");
  await page.waitForTimeout(300);
  await go("#/expenses/new");
  await page.fill("#ep-amount", "120");
  await page.fill("#ep-supplier", "Adobe");
  await page.click("#expense-form button[type=submit]");
  await page.waitForTimeout(200);
  check((await text(page, "#expense-error")).includes("Choose the SA103S box for this expense."), "dépense sans case refusée");
  await page.selectOption("#ep-box", "18");
  await page.click("#expense-form button[type=submit]");
  await page.waitForTimeout(300);
  const exp = await text(page, "#espace-view");
  check(exp.includes("Expenses 2026/27") && exp.includes("Allowable expenses£165.50") && exp.includes("18 Phone, fax, stationery and other office costs"),
    "dépenses : total de l'année fiscale, case du formulaire");
  await screen(page, "dépenses", "uk-depenses");

  // ----- Synthèse du SA103S --------------------------------------------------------------------------------------
  await go("#/sa103s");
  const sa = await text(page, "#espace-view");
  check(sa.includes("Self-employment summary 2026/27") && sa.includes("9Your turnover") && sa.includes("£300.00") && sa.includes("20Total expenses (boxes 11 to 19)£165.50") &&
    sa.includes("21Net profit£134.50") && sa.includes("28Net business profit for tax purposes£134.50") && sa.includes("2025/26 short self-employment page"),
    "synthèse : cases 9, 20, 21 et 28, intitulés du formulaire 2025/26");
  check(sa.includes("covered by the trading income allowance") && sa.includes("lower than the £1,000.00 trading income allowance"),
    "synthèse : allocation de 1 000 £ signalée (recettes et dépenses sous le seuil)");
  await screen(page, "synthèse SA103S", "uk-sa103s");

  // ----- Impôt : bénéfice prévu, acomptes, seuil de VAT -----------------------------------------------------------
  await page.evaluate(async () => { const d = await window.EspaceStore.load(); d.profile.taxYears = { 2026: { expectedProfit: 40000, priorBill: 3000 } }; await window.EspaceStore.save(d); });
  await page.reload({ waitUntil: "networkidle" });
  await go("#/tax");
  await page.waitForSelector("#paid-form");
  const expected = await page.evaluate(() => {
    const st = window.OFE.taxUK.soleTrader({ profit: 40000, salary: 0, region: "ruk" }, window.OF_RULES);
    return { total: window.OF.money(Math.round(st.total * 100) / 100), each: window.OF.money(Math.round(st.paymentsOnAccount.each * 100) / 100) };
  });
  const tax = await text(page, "#espace-view");
  check(tax.includes("Tax 2026/27") && tax.includes("Estimated tax bill" + expected.total) && tax.includes("Payment on account 1 for 2026/27") &&
    tax.includes("£1,500.00") && tax.includes("Payment on account 1 for 2027/28") && tax.includes(expected.each),
    "K5 : impôt du calculateur public, acomptes de 2026/27 (moitié de l'impôt de l'an dernier) et de 2027/28");
  check(tax.includes("VAT registration threshold") && tax.includes("Invoiced over the last 12 months£2,400.00") && tax.includes("Below the £90,000.00 threshold"),
    "K7 : seuil de VAT, facturé sur 12 mois");
  await page.fill("#ep-paid1", "1500");
  await page.click("#paid-form button[type=submit]");
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.EspaceStore.load())).profile.poaPaid["2026-1"] === 1500, "acompte versé enregistré");
  await screen(page, "impôt", "uk-impot");

  // ----- Making Tax Digital ------------------------------------------------------------------------------------------
  await go("#/mtd");
  await page.fill("#ep-q2024", "52000");
  await page.click("#mtd-form button[type=submit]");
  await page.waitForTimeout(300);
  const mtd = await text(page, "#espace-view");
  check(mtd.includes("Making Tax Digital for Income Tax applies to you from 06/04/2026") && mtd.includes("Applies from 06/04/2026") &&
    mtd.includes("Update 2") && mtd.includes("07/11/2026") &&
    mtd.includes("2026/27: £300.00 (so far, from your records here)£20,000.00Below the threshold so far") && mtd.includes("The workspace doesn't send anything to HMRC"),
    "K6 : concerné dès avril 2026 (52 000 £ en 2024/25), dates limites, rien envoyé à HMRC → " + mtd.slice(0, 400));
  await screen(page, "Making Tax Digital", "uk-mtd");

  // ----- Échéances, trésorerie, prospects --------------------------------------------------------------------------
  await go("#/deadlines");
  const dl = await text(page, "#espace-view");
  check(dl.includes("Making Tax Digital quarterly update") && dl.includes("First payment on account (2026/27)") && !dl.includes("VAT return and payment"),
    "échéances : MTD et acomptes affichés, pas de VAT sans immatriculation");
  await screen(page, "échéances", "uk-echeances");
  await go("#/cash-flow");
  await british(page, "trésorerie");
  await accessible(page, "trésorerie");
  await widths(page, "uk-tresorerie");
  await go("#/leads");
  const pros = await text(page, "#espace-view");
  check(pros.includes("soft opt-in") && pros.includes("regulation 26"), "prospects : règles du PECR (emails, soft opt-in, registre des appels)");
  await screen(page, "prospects", "uk-prospects");
  await go("#/");
  const dash = await text(page, "#espace-view .kpis");
  check(dash.includes("Collected in 2026/27£300.00") && dash.includes("2025/26 at the same date"), "tableau de bord : encaissé de l'année fiscale 2026/27 → " + dash.slice(0, 120));
  await screen(page, "tableau de bord", "uk-tableau-de-bord");

  check(errors.length === 0, `aucune erreur JavaScript ni texte manquant${errors.length ? " → " + errors.slice(0, 5).join(" | ") : ""}`);
} finally {
  await browser.close();
  server.close();
}
console.log(failures.length ? `\n${failures.length} échec(s)` : "\nTous les tests passent.");
process.exit(failures.length ? 1 : 0);
