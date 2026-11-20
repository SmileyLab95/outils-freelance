// Parcours navigateur de l'Espace des États-Unis (documentation/60-espace-etats-unis.md, § 3.3 et § 4), sur la page en
// brouillon /us/workspace/ : OF_DRAFTS=1 python3 build.py, puis node tests/e2e/espace-us.mjs [dossier-captures].
// Critères : U2 (même aperçu que le générateur public pour les mêmes données) et U8 (aucune erreur JavaScript, aucun
// texte manquant ni français, aucun débordement horizontal, accessibilité AA sur ordinateur, tablette et téléphone).
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
if (!existsSync(path.join(site, "us", "workspace", "index.html"))) {
  console.error("Construire d'abord les brouillons : OF_DRAFTS=1 python3 build.py");
  process.exit(1);
}
const shots = path.resolve(process.argv[2] || path.join(root, "tests", "captures-espace-us"));
mkdirSync(shots, { recursive: true });

// ----- Serveur de test : brouillons/ -----------------------------------------------------------------------------

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
const PAGE = ORIGIN + "/outils-freelance/us/workspace/?today=2026-10-20";

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
const text = async (page, sel) => ((await page.textContent(sel)) || "").replace(/[  ]/g, " ").replace(/\s+/g, " ").trim();
const errors = [];
const FRENCH = /[àâçéèêëîïôûùœ«»]|\b(le|la|les|des|une|pour|avec|facture|devis)\b/i;
/** Écran courant : aucun texte français, aucune clé de texte affichée telle quelle. */
async function english(page, label) {
  const t = await text(page, "#espace-app");
  const bad = (t.match(FRENCH) || [])[0] || (t.match(/\b(?:eng|us|tr|pros|dl|time|doc|draft)\.[a-z][\w.]*\b/) || [])[0];
  check(!bad, `${label} : texte entièrement en anglais${bad ? " → « " + bad + " »" : ""}`);
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

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("dialog", (d) => d.accept());
  const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(250); };

  // ----- Premier lancement --------------------------------------------------------------------------------------
  await page.goto(PAGE, { waitUntil: "networkidle" });
  await page.waitForSelector("#profile-form");
  check((await text(page, "#espace-view h2")) === "Welcome to your workspace" && (await page.getAttribute("html", "lang")) === "en-US" &&
    (await page.getAttribute("meta[name=robots]", "content")) === "noindex", "premier lancement : accueil en anglais, page en brouillon non indexée");
  check((await page.$$eval("#ep-filingStatus option", (o) => o.map((x) => x.value))).join() === "single,married_filing_jointly,married_filing_separately,head_of_household",
    "profil : situation familiale (calcul des acomptes)");
  await english(page, "premier lancement");
  await accessible(page, "premier lancement");
  await page.fill("#ep-name", "Jordan Lee Design");
  await page.click("#profile-form button[type=submit]");
  await page.waitForSelector(".kpis");
  check((await text(page, "#espace-view h2")) === "Jordan Lee Design", "profil créé, tableau de bord");
  check((await text(page, "#espace-view")).includes("Complete your profile (business address): these details appear on your invoices."),
    "rappel : adresse manquante");
  await english(page, "tableau de bord vide");

  // ----- Réglages : coordonnées, EIN (jamais le numéro de sécurité sociale), instructions de paiement -------------
  await go("#/reglages");
  await page.fill("#ep-address", "100 Market Street\nSan Francisco, CA 94105");
  await page.fill("#ep-email", "jordan@example.com");
  await page.fill("#ep-ein", "123-45-6789");
  await page.fill("#ep-payment", "Zelle: jordan@example.com");
  await page.click("#profile-form button[type=submit]");
  await page.waitForTimeout(200);
  check((await text(page, "#profile-error")).startsWith("This looks like a Social Security number") &&
    (await page.evaluate(() => document.activeElement.id)) === "ep-ein", "profil : numéro de sécurité sociale refusé");
  await page.fill("#ep-ein", "123456789");
  await page.click("#profile-form button[type=submit]");
  await page.waitForTimeout(300);
  const stored = await page.evaluate(() => window.EspaceStore.load());
  check(stored.profile.ein === "12-3456789" && stored.profile.payment === "Zelle: jordan@example.com" && stored.profile.terms === 30,
    "profil : EIN mis en forme, instructions de paiement, délai Net 30");
  await english(page, "réglages");
  await accessible(page, "réglages");

  // ----- Client -----------------------------------------------------------------------------------------------------
  await go("#/clients/nouveau");
  await page.fill("#ep-name", "Northwind Studio");
  await page.fill("#ep-address", "200 Pine Street\nSeattle, WA 98101");
  await page.fill("#ep-email", "ap@northwind.example");
  await page.click("#client-form button[type=submit]");
  await page.waitForSelector(".doc-list");
  check((await text(page, ".doc-list")).includes("Northwind Studio"), "client créé");

  // ----- Facture : taxe de vente, aperçu, émission ----------------------------------------------------------------
  await go("#/documents/nouveau?type=facture");
  await page.selectOption("#d-client", { label: "Northwind Studio" });
  await page.fill("#d-date", "2026-10-20");
  await page.fill("#ln-desc-0", "Website design");
  await page.fill("#ln-price-0", "2,400");
  await page.fill("#d-tax-rate", "8.25");
  await page.fill("#d-tax-label", "Sales tax");
  await page.waitForTimeout(600);
  const draft = await text(page, "#d-preview");
  check(draft.includes("INVOICE") && draft.includes("$2,400.00") && draft.includes("Sales tax (8.25%)$198.00") && draft.includes("$2,598.00") &&
    draft.includes("Net 30") && draft.includes("Zelle: jordan@example.com") && draft.includes("Tax ID: 12-3456789"),
    "aperçu : taxe de vente, total, conditions, EIN et instructions de paiement");
  check(!(await page.$("#d-service")), "éditeur : pas de date de prestation (mention française)");
  await english(page, "éditeur");
  await accessible(page, "éditeur de facture");
  await widths(page, "us-editeur");
  await page.click("#d-issue");
  await page.waitForFunction(() => /Invoice 2026-001/.test(document.querySelector("#espace-view h2").textContent));
  check(!(await page.$("#doc-form")), "facture émise : numéro 2026-001, non modifiable");
  const espaceHTML = await page.innerHTML("#d-preview");

  // ----- U2 : la même facture saisie dans le générateur public a le même aperçu -----------------------------------
  const gen = await context.newPage();
  gen.on("pageerror", (e) => errors.push("générateur : " + e.message));
  await gen.goto(ORIGIN + "/outils-freelance/us/invoice-generator/", { waitUntil: "networkidle" });
  for (const [sel, v] of [["#iv-number", "2026-001"], ["#iv-date", "2026-10-20"], ["#iv-me-name", "Jordan Lee Design"],
    ["#iv-me-address", "100 Market Street\nSan Francisco, CA 94105"], ["#iv-me-email", "jordan@example.com"], ["#iv-me-taxid", "12-3456789"],
    ["#iv-client-name", "Northwind Studio"], ["#iv-client-address", "200 Pine Street\nSeattle, WA 98101"], ["#iv-client-email", "ap@northwind.example"],
    ["#l-desc-0", "Website design"], ["#l-qty-0", "1"], ["#l-price-0", "2,400"], ["#iv-tax-rate", "8.25"],
    ["#iv-payment", "Zelle: jordan@example.com"]]) await gen.fill(sel, v);
  await gen.selectOption("#iv-terms", "30");   // libellé de la taxe : « Sales tax », fixé par la page
  await gen.waitForTimeout(300);
  const genHTML = await gen.innerHTML("#iv-preview");
  check(genHTML === espaceHTML, "U2 : aperçu identique à celui du générateur public pour les mêmes données");
  await gen.close();

  // ----- Encaissement, courriel, tableau de bord ---------------------------------------------------------------------
  await page.fill("#pay-date", "2026-10-18");
  await page.fill("#pay-amount", "1000");
  await page.selectOption("#pay-method", "ach");
  await page.click("#pay-form button[type=submit]");
  await page.waitForTimeout(300);
  check((await text(page, "#espace-view .st")) === "Partially paid", "encaissement partiel");
  const mail = decodeURIComponent(await page.getAttribute("#d-send", "href")).replace(/\s+/g, " ");
  check(mail.startsWith("mailto:ap@northwind.example?subject=Invoice 2026-001 – Jordan Lee Design&body=Hello,") &&
    mail.includes("After the payments already received, the balance due is $1,598.00, due by Nov 19, 2026.") && mail.includes("Payment instructions: Zelle: jordan@example.com"),
    "courriel d'envoi prérempli en anglais, solde et instructions de paiement");
  await english(page, "facture émise");
  await accessible(page, "facture émise");
  await go("#/");
  const kpis = await text(page, "#espace-view .kpis");
  check(kpis.includes("Collected in 2026$1,000.001 payment ·") && kpis.includes("Collected this month$1,000.00"),
    "tableau de bord : encaissé de l'année, du mois et nombre d'encaissements" + " → " + kpis.slice(0, 160));
  const top = await text(page, ".bar-list");
  check(top.includes("Northwind Studio") && top.includes("$1,000.00") && top.includes("100%"), "tableau de bord : principaux clients → " + top);
  check(kpis.includes("Next estimated tax payment–not required so far: expected tax under $1,000.00"),
    "tableau de bord : pas d'acompte requis pour un petit bénéfice (seuil de 1 000 $)");
  // Bénéfice prévu de 120 000 $ : acompte du calculateur public (U6), prochaine échéance le 15/01/2027 (dates sourcées).
  await page.evaluate(async () => { const d = await window.EspaceStore.load(); d.profile.taxYears = { 2026: { expectedProfit: 120000 } }; await window.EspaceStore.save(d); });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".kpis");
  const expectedQ = await page.evaluate(async () => {
    const d = await window.EspaceStore.load(), E = window.OFE.espaceUS.create(window.OF_ESPACE_TEXTS.en);
    const est = E.estimatedTax(E.taxInput({ documents: d.documents, expenses: d.expenses, profile: d.profile, rules: window.OF_RULES, today: "2026-10-20" }, 2026));
    return window.OF.money(Math.round(est.quarterly.perQuarter * 100) / 100);
  });
  const kpis2 = await text(page, "#espace-view .kpis");
  check(kpis2.includes("Next estimated tax payment" + expectedQ + "payment 4, due 1/15/2027"),
    "tableau de bord : prochain acompte = montant du calculateur (U6), échéance du 15/01/2027 → " + expectedQ);
  await english(page, "tableau de bord");
  await accessible(page, "tableau de bord");
  await widths(page, "us-tableau-de-bord");

  // ----- Recettes en caisse (U3) et dépenses par ligne de l'annexe C (U4) ------------------------------------------
  await go("#/recettes");
  const income = await text(page, "#espace-view");
  check((await text(page, "#espace-view h2")) === "Income 2026" && income.includes("Gross receipts$1,000.00") && income.includes("Q4 so far$1,000.00") &&
    income.includes("Total Q4 2026$1,000.00") && income.includes("Under the cash method, you generally report income in the tax year you receive it"),
    "recettes : paiement à sa date de réception, totaux du trimestre et de l'année, comptabilité de caisse (règle sourcée)");
  const [incomeCsv] = await Promise.all([page.waitForEvent("download"), page.click("#income-csv")]);
  const incomeLines = readFileSync(await incomeCsv.path(), "utf8").replace(/^\ufeff/, "").split("\r\n");
  check(incomeCsv.suggestedFilename() === "income-2026.csv" && incomeLines[0] === "Date received,Client,Document,Payment method,Type,Amount" &&
    incomeLines[1] === '10/18/2026,"Northwind Studio","2026-001","ACH transfer","Payment",1000.00', "recettes : export CSV pour tableur américain");
  await english(page, "recettes");
  await accessible(page, "recettes");
  await widths(page, "us-recettes");

  await go("#/depenses/nouvelle");
  await page.fill("#ep-amount", "120.40");
  await page.fill("#ep-supplier", "Office Depot");
  await page.click("#expense-form button[type=submit]");
  await page.waitForTimeout(200);
  check((await text(page, "#expense-error")).includes("Choose the Schedule C line for this expense.") &&
    (await page.getAttribute("#ep-line", "aria-invalid")) === "true" && (await page.evaluate(() => document.activeElement.id)) === "ep-line",
    "dépenses : ligne de l'annexe C exigée");
  await page.selectOption("#ep-line", "18");
  check((await text(page, "#line-help")) === "Office supplies and postage.", "dépenses : aide de la ligne (instructions de l'IRS, règle sourcée)");
  await page.click("#expense-form button[type=submit]");
  await page.waitForFunction(() => location.hash.startsWith("#/depenses?annee=2026"));
  await go("#/depenses/nouvelle");
  await page.fill("#ep-amount", "80");
  await page.fill("#ep-supplier", "Diner");
  await page.selectOption("#ep-line", "24b");
  await page.selectOption("#ep-method", "cash");
  await page.click("#expense-form button[type=submit]");
  await page.waitForFunction(() => location.hash.startsWith("#/depenses?annee=2026"));
  await page.waitForTimeout(250);
  const spending = await text(page, "#espace-view");
  check(spending.includes("Spent$200.402 expenses") && spending.includes("Deductible expenses$160.40") && spending.includes("24b Deductible meals$80.00$40.00"),
    "dépenses : totaux par ligne, repas déductibles à 50 % (U4)");
  await english(page, "dépenses");
  await accessible(page, "dépenses");
  await widths(page, "us-depenses");

  // ----- Impôts : acomptes (U6), acomptes versés, données du calcul, 1099 attendus (U7), synthèse de l'annexe C (U5) ---
  await go("#/taxes");
  let taxes = await text(page, "#espace-view");
  check((await text(page, "#espace-view h2")) === "Estimated taxes 2026" && taxes.includes("Profit for the year$120,000.00the profit you expect") &&
    taxes.includes("Quarterly payment" + expectedQ) && taxes.includes("Payment 4, due 1/15/2027") && taxes.includes("Payment 1, due 4/15/2026 (past)"),
    "impôts : bénéfice prévu, acompte du calculateur (U6), échéancier aux dates sourcées");
  check(taxes.includes("No client has paid you $2,000.00 or more so far this year.") && taxes.includes("Your income is taxable even if you don't receive a Form 1099."),
    "impôts : 1099-NEC attendus au seuil de l'année (U7)");
  await page.fill("#ep-paid4", "-5");
  await page.click("#paid-form button[type=submit]");
  await page.waitForTimeout(200);
  check((await text(page, "#paid-error")) === "Enter a positive amount, or leave the field empty." && (await page.getAttribute("#ep-paid4", "aria-invalid")) === "true",
    "impôts : acompte versé négatif refusé");
  await page.fill("#ep-paid4", "1,000");
  await page.click("#paid-form button[type=submit]");
  await page.waitForTimeout(400);
  const leftQ = await page.evaluate((q) => window.OF.money(Math.round((window.OF.num(q.replace(/[$,]/g, "")) - 1000) * 100) / 100), expectedQ);
  taxes = await text(page, "#espace-view");
  check((await page.evaluate(() => window.EspaceStore.load())).profile.estimatedPaid["2026-4"] === 1000 && taxes.includes("Paid$1,000.00") &&
    taxes.includes(expectedQ + leftQ), "impôts : acompte versé enregistré, reste à payer de l'échéance → " + leftQ);
  await english(page, "impôts");
  await accessible(page, "impôts");
  await widths(page, "us-impots");
  await go("#/");
  check((await text(page, "#espace-view .kpis")).includes("Next estimated tax payment" + leftQ + "payment 4, due 1/15/2027"),
    "tableau de bord : prochain acompte moins l'acompte déjà versé");
  // Bénéfice prévu retiré : synthèse de l'annexe C sur les montants réels de l'année.
  await page.evaluate(async () => { const d = await window.EspaceStore.load(); d.profile.taxYears = {}; await window.EspaceStore.save(d); });
  await page.reload({ waitUntil: "networkidle" });
  await go("#/schedule-c");
  const sc = await text(page, "#espace-view table");
  check(sc.includes("1Gross receipts or sales$1,000.00") && sc.includes("18Office expense$120.40") && sc.includes("24bDeductible meals$40.00") &&
    sc.includes("28Total expenses before expenses for business use of home$160.40") && sc.includes("31Net profit or (loss)$839.60") &&
    (await page.getAttribute('.espace-nav a[data-route="taxes"]', "aria-current")) === "page",
    "annexe C : lignes 1, 18, 24b (50 %), 28 et 31 ; onglet « Taxes » actif");
  const [scCsv] = await Promise.all([page.waitForEvent("download"), page.click("#sc-csv")]);
  const scLines = readFileSync(await scCsv.path(), "utf8").replace(/^\ufeff/, "").split("\r\n");
  check(scCsv.suggestedFilename() === "schedule-c-2026.csv" && scLines[0] === "Line,Description,Amount" && scLines.includes('"31","Net profit or (loss)",839.60') &&
    scLines.includes('"24b","Deductible meals",40.00'), "annexe C : export identique à l'écran (U5)");
  await english(page, "annexe C");
  await accessible(page, "annexe C");
  await widths(page, "us-annexe-c");

  // ----- Trésorerie et échéances : écrans communs avec le moteur américain ----------------------------------------
  await go("#/tresorerie");
  check((await text(page, "#espace-view h2")).startsWith("Cash flow"), "trésorerie : écran affiché");
  await english(page, "trésorerie");
  await go("#/echeances");
  check((await text(page, "#espace-view h2")) === "Deadlines" && (await text(page, "#espace-view")).includes("Estimated tax payment"),
    "échéances : calendrier fiscal américain");
  await english(page, "échéances");

  check(errors.length === 0, `aucune erreur JavaScript ni texte manquant${errors.length ? " → " + errors.slice(0, 5).join(" | ") : ""}`);
} finally {
  await browser.close();
  server.close();
}
console.log(failures.length ? `\n${failures.length} échec(s)` : "\nTous les tests passent.");
process.exit(failures.length ? 1 : 0);
