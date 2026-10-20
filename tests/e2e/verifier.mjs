// Teste le site généré dans docs/ avec un vrai navigateur (Playwright) et produit des captures d'écran.
// Usage : node tests/e2e/verifier.mjs [dossier-captures]
import { createRequire } from "module";
import { spawn } from "child_process";
import { mkdtempSync, symlinkSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const shots = path.resolve(process.argv[2] || path.join(root, "tests", "captures"));
mkdirSync(shots, { recursive: true });

// Sert docs/ sous /outils-freelance/, comme GitHub Pages.
const serveDir = mkdtempSync(path.join(tmpdir(), "of-"));
symlinkSync(path.join(root, "docs"), path.join(serveDir, "outils-freelance"));
const port = 8765;
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], { cwd: serveDir, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const BASE = `http://127.0.0.1:${port}/outils-freelance/`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
const failures = [];
const check = (cond, message) => { if (!cond) failures.push(message); console.log(`${cond ? "✓" : "✗"} ${message}`); };

// La copie est asynchrone : on attend la confirmation sur le bouton.
const copied = (page, sel) => page.waitForFunction((s) => /Copi(é|ed)/.test(document.querySelector(s).textContent), sel, { timeout: 3000 }).then(() => true, () => false);

async function open(page, url) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const res = await page.goto(BASE + url, { waitUntil: "networkidle" });
  check(res.status() === 200, `${url || "accueil"} : page servie (200)`);
  return errors;
}

const tests = {
  async "fr/generateur-facture/"(page) {
    await page.fill("#f-me-name", "Camille Martin EI");
    await page.fill("#f-me-siret", "123 456 789 00012");
    await page.fill("#f-me-iban", "FR76 1234");
    await page.fill("#f-client-name", "Studio Nova SAS");
    await page.fill("#l-desc-0", "Création du site vitrine");
    await page.fill("#l-qty-0", "1");
    await page.fill("#l-price-0", "1800");
    await page.click("#f-add-line");
    await page.fill("#l-desc-1", "Rédaction des contenus");
    await page.fill("#l-qty-1", "3");
    await page.fill("#l-price-1", "150,50");
    const text = await page.textContent("#f-preview");
    check(/2\s?251,50\s?€/.test(text), "facture : total HT calculé (1 800 + 3 × 150,50 = 2 251,50 €)");
    check(text.includes("TVA non applicable, art. L. 223-3 du CIBS"), "facture : mention de franchise de TVA (CIBS)");
    check(text.includes("40 €"), "facture : indemnité forfaitaire de 40 € (client professionnel)");
    check(text.includes("IBAN FR76 1234"), "facture : IBAN dans les conditions de paiement");
    await page.fill("#f-client-id", "812 345 678");
    const reform = await page.textContent("#f-preview");
    check(reform.includes("SIREN : 812 345 678") && reform.includes("Prestation de services"), "facture : SIREN du client et nature de l'opération (réforme)");
    await page.selectOption("#f-nature", "mixte");
    check((await page.textContent("#f-preview")).includes("Biens et services"), "facture : nature de l'opération mixte");
    await page.selectOption("#f-nature", "services");
    await page.uncheck("#f-franchise");
    const ttc = await page.textContent("#f-preview");
    check(/2\s?701,80\s?€/.test(ttc), "facture : TVA 20 % appliquée (2 701,80 € TTC)");
    await page.check("#f-debits");
    check((await page.textContent("#f-preview")).includes("d'après les débits"), "facture : option pour le paiement de la TVA d'après les débits");
    await page.uncheck("#f-debits");
    await page.check("#f-franchise");
    await page.click('[data-doctype="devis"]');
    const devis = await page.textContent("#f-preview");
    check(devis.includes("DEVIS") && devis.includes("Bon pour accord"), "devis : titre et zone de signature");
    check(/Acompte à la signature \(30 %\)/.test(devis), "devis : acompte de 30 % affiché");
    await page.click('[data-doctype="facture"]');
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#f-client-name")) === "Studio Nova SAS", "facture : saisie mémorisée après rechargement");
    check((await page.inputValue("#l-desc-1")) === "Rédaction des contenus", "facture : lignes mémorisées après rechargement");
    await page.emulateMedia({ media: "print" });
    await page.screenshot({ path: path.join(shots, "facture-impression.png"), fullPage: true });
    await page.emulateMedia({ media: "screen" });
  },
  async "fr/"(page) {
    const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    const internal = [...new Set(links.filter((h) => h.startsWith("/outils-freelance/")))];
    for (const href of internal) {
      const res = await page.request.get(`http://127.0.0.1:${port}${href}`);
      check(res.status() === 200, `lien interne ${href} (${res.status()})`);
    }
    check(links.some((h) => h.includes("gumroad.com")), "accueil FR : lien vers le kit");
    check((await page.$$(".grid-categories .nav-item")).length >= 8, "accueil FR : grille des outils par catégorie");
    check((await page.getAttribute('link[hreflang="x-default"]', "href")) === "https://smileylab95.github.io/outils-freelance/", "accueil FR : hreflang x-default");
    // Menu déroulant et sélecteur de pays (ordinateur).
    await page.click(".nav .nav-group:first-child .nav-trigger");
    check(await page.isVisible(".nav .nav-group:first-child .nav-menu"), "menu : la catégorie s'ouvre au clic");
    await page.keyboard.press("Escape");
    check(!(await page.isVisible(".nav .nav-group:first-child .nav-menu")), "menu : Échap le referme");
    await page.click(".country-switch .nav-trigger");
    check(await page.isVisible('.country-switch a[hreflang="fr-FR"]'), "sélecteur de pays : France proposée");
  },
  async ""(page) {
    check((await page.$$("a.country-card")).length >= 1, "accueil mondial : cartes des pays");
    check((await page.getAttribute("html", "lang")) === "en", "accueil mondial : langue anglaise");
    check((await page.$$('link[rel="alternate"][hreflang]')).length >= 2, "accueil mondial : balises hreflang");
    await page.click('a.country-card[href$="/fr/"]');
    await page.waitForLoadState("networkidle");
    check(page.url().endsWith("/outils-freelance/fr/"), "accueil mondial → section France");
    await page.goBack({ waitUntil: "networkidle" });
  },
  async "generateur-facture/"(page) {
    await page.waitForURL(/\/fr\/generateur-facture\/$/);
    check(page.url().endsWith("/fr/generateur-facture/"), "ancienne adresse → redirection vers /fr/");
  },
  async "fr/calculateur-tjm/"(page) {
    const tjm = await page.textContent("#r-tjm");
    check(/^407\s?€$/.test(tjm.trim()), `TJM conseillé par défaut = 407 € (obtenu : ${tjm})`);
    check(/354\s?€/.test(await page.textContent("#r-tjm-min")), "TJM minimum par défaut : 39 000 € ÷ 0,744 ÷ 148 j ≈ 354 €");
    check((await page.textContent("#r-billable")).includes("148"), "148 jours facturables");
    await page.selectOption("#t-status", "custom");
    check(await page.isVisible("#t-rate"), "taux personnalisé : champ affiché");
    await page.fill("#t-rate", "50");
    check(/^(\d[\d\s\u202f]*)€$/.test((await page.textContent("#r-tjm")).trim()), "taux personnalisé : TJM recalculé");
    await page.selectOption("#t-status", "0.256");
    check((await page.textContent("#s-result")).includes("par mois"), "simulation inverse affichée");
  },
  async "fr/simulateur-auto-entrepreneur/"(page) {
    // Défaut : libéral BNC, 3 000 €/mois → 36 000 € × 25,6 % = 9 216 € ; CFP 0,2 % = 72 € ; reste 26 712 €/an = 2 226 €/mois.
    check(/^2\s?226\s?€$/.test((await page.textContent("#s-net-month")).trim()), "simulateur : 2 226 € par mois par défaut");
    check(/9\s?216\s?€/.test(await page.textContent("#s-r-cotis")), "simulateur : cotisations 25,6 % = 9 216 €");
    check(/^72\s?€$/.test((await page.textContent("#s-r-cfp")).trim()), "simulateur : formation professionnelle 72 €");
    check(/23\s?760\s?€/.test(await page.textContent("#s-r-tax")), "simulateur : revenu imposable après abattement de 34 % = 23 760 €");
    await page.check("#s-vl");
    check(/25\s?920\s?€/.test(await page.textContent("#s-r-net")), "simulateur : versement libératoire 2,2 % → 25 920 €/an");
    await page.uncheck("#s-vl");
    await page.selectOption("#s-acre", "25");
    check((await page.textContent("#s-r-cotis-label")).includes("19,2 %") && /6\s?912\s?€/.test(await page.textContent("#s-r-cotis")), "simulateur : ACRE à partir du 1/07/2026 → 19,2 % = 6 912 €");
    await page.selectOption("#s-activity", "vente");
    check((await page.textContent("#s-r-cotis-label")).includes("9,3 %"), "simulateur : vente avec ACRE −25 % → 9,3 %");
    await page.selectOption("#s-acre", "50");
    check((await page.textContent("#s-r-cotis-label")).includes("6,2 %"), "simulateur : vente avec ACRE −50 % → 6,2 %");
    await page.selectOption("#s-activity", "cipav");
    check((await page.textContent("#s-r-cotis-label")).includes("13,4 %"), "simulateur : CIPAV avec ACRE −50 % → 13,4 % (taux publié par l'Urssaf)");
    check((await page.$$(".sources li")).length >= 5, "simulateur : sources officielles affichées");
    await page.selectOption("#s-acre", "0");
    await page.selectOption("#s-activity", "liberal");
    await page.click('[data-period="an"]');
    check(/^36\s?000$/.test(await page.inputValue("#s-ca")) && /^2\s?226\s?€$/.test((await page.textContent("#s-net-month")).trim()), "simulateur : passage au CA annuel sans changer le résultat");
    await page.fill("#s-ca", "43 200");
    check((await page.textContent("#s-notice")).includes("dès le jour du dépassement"), "simulateur : alerte TVA au-delà de 41 250 €");
    await page.fill("#s-ca", "90 000");
    check((await page.textContent("#s-notice")).includes("plafond de la micro-entreprise"), "simulateur : alerte plafond de 83 600 €");
    await page.fill("#s-ca", "36 000");
    await page.reload({ waitUntil: "networkidle" });
    check((await page.getAttribute('[data-period="an"]', "aria-pressed")) === "true", "simulateur : période mémorisée après rechargement");
  },
  async "fr/calcul-tva-ht-ttc/"(page) {
    check((await page.textContent("#v-hero")).replace(/\s/g, "") === "1200,00€", "TVA : 1 000 € HT à 20 % = 1 200 € TTC");
    check(/200,00\s?€/.test(await page.textContent("#v-tva")), "TVA : 200 € de TVA");
    await page.click('[data-dir="ttc"]');
    check(/833,33\s?€/.test(await page.textContent("#v-hero")) && /166,67\s?€/.test(await page.textContent("#v-tva")), "TVA : 1 000 € TTC → 833,33 € HT + 166,67 € de TVA");
    await page.click('[data-dir="ht"]');
    await page.fill("#v-amount", "100");
    await page.check('input[name="rate"][value="5.5"]', { force: true });
    check(/105,50\s?€/.test(await page.textContent("#v-ttc")) && (await page.textContent("#v-formula")).includes("1,055"), "TVA : 100 € HT à 5,5 % = 105,50 € TTC, coefficient 1,055");
    check((await page.$$("#v-table tr")).length === 4, "TVA : tableau des 4 taux");
    await page.check('input[name="rate"][value="custom"]', { force: true });
    check(await page.isVisible("#v-custom"), "TVA : champ de taux libre affiché");
    await page.fill("#v-custom", "8,5");
    check(/108,50\s?€/.test(await page.textContent("#v-ttc")), "TVA : taux libre de 8,5 %");
    await page.check('input[name="rate"][value="5.5"]', { force: true });
    await page.reload({ waitUntil: "networkidle" });
    check(await page.isChecked('input[name="rate"][value="5.5"]'), "TVA : taux mémorisé après rechargement");
  },
  async "fr/relance-facture-impayee/"(page) {
    const due = new Date(Date.now() - 25 * 86400000).toISOString().slice(0, 10);
    await page.fill("#r-due", due);
    await page.fill("#r-number", "2026-014");
    await page.fill("#r-contact", "Julie");
    await page.fill("#r-amount", "1800");
    check((await page.getAttribute('[data-stage="2"]', "aria-selected")) === "true", "25 jours de retard → relance ferme sélectionnée");
    const body = await page.textContent("#r-body");
    check(body.includes("Bonjour Julie") && body.includes("L441-10") && /1\s?800,00\s?€/.test(body), "relance ferme : message personnalisé et base légale");
    await page.click('[data-stage="3"]');
    check((await page.textContent("#r-subject")).includes("Mise en demeure"), "mise en demeure : objet");
    check((await page.getAttribute("#r-mail", "href")) !== null, "lien vers la messagerie présent");
    await page.click("#r-copy");
    check(await copied(page, "#r-copy"), "bouton Copier : confirmation");
    check((await page.evaluate(() => navigator.clipboard.readText())).includes("Mise en demeure"), "bouton Copier : objet et message dans le presse-papiers");
  },
  async "fr/penalites-de-retard/"(page) {
    await page.fill("#p-rate", "12");
    const total = await page.textContent("#p-total");
    check(/66,63\s?€/.test(total), `pénalités : 1 800 € × 12 % × 45 j ÷ 365 + 40 € = 66,63 € (obtenu : ${total})`);
    await page.selectOption("#p-method", "bce");
    await page.fill("#p-bce", "2");
    check((await page.textContent("#p-r-rate")).includes("12 %"), "méthode BCE + 10 points : 12 %");
  },
  async "fr/mentions-obligatoires-facture/"(page) {
    const boxes = await page.$$("#checklist input");
    for (const b of boxes) await b.check();
    check((await page.textContent("#cl-msg")).includes("Bravo"), "checklist : toutes les mentions cochées");
  },
  async "fr/modeles-emails-freelance/"(page) {
    await page.click('[data-copy="#tpl-1"]');
    check(await copied(page, '[data-copy="#tpl-1"]'), "modèles : bouton Copier");
    check((await page.evaluate(() => navigator.clipboard.readText())).length > 100, "modèles : texte dans le presse-papiers");
  },
  async "us/"(page) {
    const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const href of [...new Set(links.filter((h) => h.startsWith("/outils-freelance/")))]) {
      const res = await page.request.get(`http://127.0.0.1:${port}${href}`);
      check(res.status() === 200, `US : lien interne ${href} (${res.status()})`);
    }
    check((await page.getAttribute("html", "lang")) === "en-US", "US : langue en-US");
    check((await page.$$('link[hreflang="fr-FR"], link[hreflang="en-US"]')).length === 2, "US : hreflang vers la France");
  },
  async "us/self-employment-tax-calculator/"(page) {
    // 80 000 $, célibataire : SE tax 11 303,64 ; impôt 5 343,83 ; total 16 647,47 (voir tests unitaires)
    check((await page.textContent("#r-total")).trim() === "$16,647", `SE tax : total 16 647 $ (obtenu : ${await page.textContent("#r-total")})`);
    check((await page.textContent("#r-se")).trim() === "$11,304", "SE tax : 11 304 $");
    check((await page.textContent("#r-income")).trim() === "$5,344", "SE tax : impôt fédéral 5 344 $");
    check((await page.textContent("#r-sub")).includes("20.8%") && (await page.textContent("#r-sub")).includes("21%"), "SE tax : taux effectif 20,8 %, mettre de côté 21 %");
    check((await page.textContent("#r-quarterly")).includes("$4,162"), "SE tax : acompte trimestriel ≈ 4 162 $");
    check((await page.textContent("#r-quarterly")).includes("and Jan 15, 2027"), "SE tax : liste des échéances bien formée");
    await page.fill("#t-state", "5");
    check((await page.textContent("#r-state")).trim() === "$3,717", "SE tax : impôt d'État 5 % × (80 000 − 5 651,82) = 3 717 $");
    await page.fill("#t-state", "");
    await page.fill("#t-profit", "60000");
    await page.selectOption("#t-status", "married_filing_jointly");
    check((await page.textContent("#r-income")).trim() === "$1,885", "SE tax : couple, 60 000 $ → impôt fédéral 1 885 $");
    await page.click("#r-details summary");
    check((await page.$$("#r-steps li")).length >= 9, "SE tax : détail du calcul affiché");
    check((await page.$$(".sources li")).length >= 4, "SE tax : sources officielles affichées");
    await page.fill("#t-profit", "80,000");
    await page.selectOption("#t-status", "single");
  },
  async "us/quarterly-tax-calculator/"(page) {
    check((await page.textContent("#q-per")).trim() === "$3,746", `acomptes : 90 % × 16 647,47 ÷ 4 = 3 746 $ (obtenu : ${await page.textContent("#q-per")})`);
    await page.fill("#e-prior-tax", "12000");
    await page.fill("#e-prior-agi", "60000");
    check((await page.textContent("#q-per")).trim() === "$3,000", "acomptes : 100 % de l'impôt 2025 ÷ 4 = 3 000 $");
    await page.fill("#e-prior-agi", "200000");
    check((await page.textContent("#q-per")).trim() === "$3,300", "acomptes : 110 % au-delà de 150 000 $ d'AGI = 3 300 $");
    check((await page.$$("#q-schedule tr")).length === 4, "acomptes : 4 échéances");
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("#q-ics")]);
    const ics = await (await import("fs")).promises.readFile(await download.path(), "utf8");
    check(download.suggestedFilename() === "estimated-tax-2026.ics" && (ics.match(/BEGIN:VEVENT/g) || []).length === 4 && ics.includes("DTSTART;VALUE=DATE:20260415"), "acomptes : export agenda .ics avec 4 échéances");
  },
  async "us/hourly-rate-calculator/"(page) {
    // 52 − 4 semaines − 10 jours fériés = 46 semaines × 40 h × 70 % = 1 288 h facturables
    check((await page.textContent("#h-billable")).includes("1,288"), "taux horaire : 1 288 heures facturables");
    const ok = await page.evaluate(() => {
      const profit = OFE.taxUS.profitForTakeHome(70000, { status: "single", stateRate: 0 }, OF_RULES);
      const back = OFE.taxUS.estimate({ profit, status: "single" }, OF_RULES).takeHome;
      const rate = (profit + 6000) / 1288 * 1.15;
      return Math.abs(back - 70000) < 1 && document.getElementById("h-rate").textContent.trim() === OF.money(rate, 0);
    });
    check(ok, "taux horaire : bénéfice inverse cohérent et taux = (bénéfice + frais) ÷ heures × 1,15");
    check((await page.textContent("#h-try-result")).includes("take-home"), "taux horaire : simulation « et si je facture… »");
  },
  async "us/late-fee-calculator/"(page) {
    check((await page.textContent("#l-fee")).trim() === "$44.38", `pénalités US : 2 000 × 18 % × 45 ÷ 365 = 44,38 $ (obtenu : ${await page.textContent("#l-fee")})`);
    await page.selectOption("#l-accrual", "month");
    check((await page.textContent("#l-fee")).trim() === "$60.00", "pénalités US : 1,5 % × 2 mois commencés = 60 $");
    await page.selectOption("#l-method", "flat");
    check((await page.textContent("#l-fee")).trim() === "$35.00", "pénalités US : forfait 35 $");
    await page.fill("#l-grace", "50");
    check((await page.textContent("#l-fee")).trim() === "$0.00", "pénalités US : délai de grâce de 50 jours → 0 $");
    check((await page.textContent("#l-clause")).includes("late fee"), "pénalités US : clause à copier");
    await page.fill("#l-grace", "0");
    await page.selectOption("#l-method", "monthly");
    await page.selectOption("#l-accrual", "daily");
  },
  async "us/payment-reminder-email/"(page) {
    const due = new Date(Date.now() - 25 * 86400000).toISOString().slice(0, 10);
    await page.fill("#rm-due", due);
    await page.fill("#rm-number", "2026-014");
    await page.fill("#rm-amount", "2000");
    await page.fill("#rm-contact", "Julie");
    await page.selectOption("#rm-location", "nyc");
    check((await page.getAttribute('[data-stage="2"]', "aria-selected")) === "true", "relance US : 25 jours → relance ferme");
    const body = await page.textContent("#rm-body");
    check(body.includes("Hi Julie") && body.includes("$2,000.00") && body.includes("NYC Freelance Isn't Free Act"), "relance US : message personnalisé et loi de New York");
    await page.click('[data-stage="3"]');
    check((await page.textContent("#rm-subject")).includes("Final notice"), "relance US : avis final");
    check((await page.getAttribute("#rm-mail", "href")).startsWith("mailto:"), "relance US : lien vers la messagerie");
    await page.click("#rm-copy");
    check(await copied(page, "#rm-copy"), "relance US : bouton Copy");
  },
  async "us/invoice-generator/"(page) {
    await page.fill("#iv-me-name", "Alex Morgan Design LLC");
    await page.fill("#iv-client-name", "Northwind Inc.");
    await page.fill("#l-desc-0", "Website design");
    await page.fill("#l-qty-0", "1");
    await page.fill("#l-price-0", "1,800");
    await page.click("#iv-add-line");
    await page.fill("#l-desc-1", "Copywriting (hours)");
    await page.fill("#l-qty-1", "3");
    await page.fill("#l-price-1", "150.50");
    let text = await page.textContent("#iv-preview");
    check(text.includes("$2,251.50") && text.includes("Net 30"), "facture US : sous-total 2 251,50 $ et conditions Net 30");
    await page.fill("#iv-tax-rate", "8.25");
    text = await page.textContent("#iv-preview");
    check(text.includes("$185.75") && text.includes("$2,437.25"), "facture US : taxe 8,25 % = 185,75 $, total 2 437,25 $");
    await page.click('[data-doctype="estimate"]');
    text = await page.textContent("#iv-preview");
    check(text.includes("ESTIMATE") && text.includes("Deposit due on acceptance (30%)"), "devis US : titre et acompte de 30 %");
    await page.click('[data-doctype="invoice"]');
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#iv-client-name")) === "Northwind Inc." && (await page.inputValue("#l-desc-1")) === "Copywriting (hours)", "facture US : saisie mémorisée");
    await page.emulateMedia({ media: "print" });
    await page.screenshot({ path: path.join(shots, "us-facture-impression.png"), fullPage: true });
    await page.emulateMedia({ media: "screen" });
  },
  async "us/freelance-email-templates/"(page) {
    await page.click('[data-copy="#tpl-1"]');
    check(await copied(page, '[data-copy="#tpl-1"]'), "modèles US : bouton Copy");
  },
  async "us/legal-notice/"() {},
  async "us/privacy-policy/"() {},
  async "uk/"(page) {
    const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const href of [...new Set(links.filter((h) => h.startsWith("/outils-freelance/")))]) {
      const res = await page.request.get(`http://127.0.0.1:${port}${href}`);
      check(res.status() === 200, `UK : lien interne ${href} (${res.status()})`);
    }
    check((await page.getAttribute("html", "lang")) === "en-GB", "UK : langue en-GB");
  },
  async "uk/self-employed-tax-calculator/"(page) {
    // 50 000 £ : impôt 7 486 + Class 4 2 245,80 = 9 731,80 (voir tests unitaires)
    check((await page.textContent("#r-total")).trim() === "£9,732", `UK : total 9 732 £ (obtenu : ${await page.textContent("#r-total")})`);
    check((await page.textContent("#r-it")).trim() === "£7,486" && (await page.textContent("#r-ni")).trim() === "£2,246", "UK : impôt 7 486 £ et Class 4 2 246 £");
    check((await page.textContent("#r-sub")).includes("19.5%") && (await page.textContent("#r-sub")).includes("20%"), "UK : 19,5 % du bénéfice, mettre de côté 20 %");
    check((await page.$$("#r-schedule tr")).length === 5, "UK : échéancier avec payments on account");
    await page.check("#t-first");
    check((await page.textContent("#r-poa-note")).includes("£14,598"), "UK : première année = facture + 1er acompte (14 598 £)");
    await page.uncheck("#t-first");
    await page.selectOption("#t-region", "scotland");
    check((await page.textContent("#r-it")).trim() === "£8,982", "UK : Écosse, impôt 8 982 £");
    await page.selectOption("#t-region", "ruk");
    await page.fill("#t-profit", "20,000");
    await page.fill("#t-salary", "30,000");
    check((await page.textContent("#r-it")).trim() === "£4,000" && (await page.textContent("#r-ni")).trim() === "£446", "UK : avec un salaire de 30 000 £, impôt supplémentaire 4 000 £, Class 4 446 £");
    await page.fill("#t-profit", "50,000");
    await page.fill("#t-salary", "");
  },
  async "uk/sole-trader-vs-limited-company/"(page) {
    // Ltd : 60 000 − 12 570 − 1 135,50 − 1 500 = 44 794,50 ; IS 19 % ; dividendes 36 283,55 ; impôt 3 846,73 → 45 006,81
    check((await page.textContent("#c-l-take")).trim() === "£45,007", `Ltd : revenu net 45 007 £ (obtenu : ${await page.textContent("#c-l-take")})`);
    check((await page.textContent("#c-s-take")).trim() === "£46,111", "sole trader : revenu net 46 111 £");
    check((await page.textContent("#c-winner-label")).includes("Sole trader") && (await page.textContent("#c-winner")).includes("£1,105"), "comparaison : sole trader gagne de 1 105 £");
    await page.click('[data-salary="custom"]');
    check(await page.isVisible("#s-salary"), "comparaison : salaire personnalisé");
    await page.click('[data-salary="12570"]');
  },
  async "uk/day-rate-calculator/"(page) {
    // 260 − 25 − 8 = 227 jours × 80 % = 182 jours facturables
    check((await page.textContent("#d-days")).includes("182 days"), "UK : 182 jours facturables");
    const ok = await page.evaluate(() => {
      const profit = OFE.taxUK.profitForTakeHome(45000, { region: "ruk" }, OF_RULES);
      const back = OFE.taxUK.soleTrader({ profit, region: "ruk" }, OF_RULES).takeHome;
      return Math.abs(back - 45000) < 1 && document.getElementById("d-rate").textContent.trim() === OF.money((profit + 4000) / 182 * 1.1, 0);
    });
    check(ok, "UK : tarif journalier = (bénéfice + frais) ÷ jours × 1,10");
  },
  async "uk/vat-calculator/"(page) {
    check((await page.textContent("#st-hero")).trim() === "£1,200.00", "VAT : 1 000 £ + 20 % = 1 200 £");
    await page.click('[data-dir="gross"]');
    check((await page.textContent("#st-hero")).trim() === "£833.33", "VAT : 1 000 £ TTC → 833,33 £ HT");
    await page.click('[data-dir="net"]');
    await page.check('input[name="rate"][value="5"]', { force: true });
    check((await page.textContent("#st-hero")).trim() === "£1,050.00" && await page.isVisible("#st-note"), "VAT : taux réduit 5 % et note");
    await page.check('input[name="rate"][value="custom"]', { force: true });
    await page.fill("#st-custom", "12.5");
    check((await page.textContent("#st-hero")).trim() === "£1,125.00", "VAT : taux libre 12,5 %");
    check((await page.$$("#st-table tr")).length === 3, "VAT : tableau des 3 taux");
    await page.check('input[name="rate"][value="20"]', { force: true });
  },
  async "uk/late-payment-interest-calculator/"(page) {
    // Exigible au 2e semestre 2026 : 8 % + 3,75 % ; 5 000 × 11,75 % × 30 ÷ 365 = 48,29 + 70
    check((await page.textContent("#l-total")).trim() === "£118.29", `UK retard : 48,29 + 70 = 118,29 £ (obtenu : ${await page.textContent("#l-total")})`);
    await page.fill("#l-due", "2025-03-15");
    check((await page.textContent("#l-rate")).includes("12.75%"), "UK retard : dette exigible au 1er semestre 2025 → 12,75 %");
    await page.fill("#l-due", "2025-09-15");
    check((await page.textContent("#l-rate")).includes("12.25%"), "UK retard : 2e semestre 2025 → 12,25 %");
    await page.uncheck("#l-b2b");
    check((await page.textContent("#l-total")).trim() === "£0.00", "UK retard : client particulier → rien à réclamer");
    await page.check("#l-b2b");
    check((await page.textContent("#l-claim")).includes("Late Payment of Commercial Debts"), "UK retard : phrase pour la relance");
  },
  async "uk/payment-reminder-letter/"(page) {
    const due = new Date(Date.now() - 50 * 86400000).toISOString().slice(0, 10);
    await page.fill("#rm-due", due);
    await page.fill("#rm-number", "INV-014");
    await page.fill("#rm-amount", "2000");
    await page.fill("#rm-contact", "Sarah");
    check((await page.getAttribute('[data-stage="3"]', "aria-selected")) === "true", "relance UK : 50 jours → letter before action");
    const body = await page.textContent("#rm-body");
    check(body.includes("LETTER BEFORE ACTION") && body.includes("£2,000.00") && body.includes("Late Payment of Commercial Debts (Interest) Act 1998"), "relance UK : lettre et intérêts légaux");
    await page.click('[data-stage="0"]');
    check((await page.textContent("#rm-subject")).includes("Friendly reminder"), "relance UK : changement d'étape au clic");
  },
  async "uk/invoice-generator/"(page) {
    await page.fill("#iv-me-name", "James Taylor");
    await page.fill("#iv-client-name", "Brightside Ltd");
    await page.fill("#l-desc-0", "Website design");
    await page.fill("#l-qty-0", "1");
    await page.fill("#l-price-0", "1,800");
    await page.click("#iv-add-line");
    await page.fill("#l-desc-1", "Copywriting (days)");
    await page.fill("#l-qty-1", "3");
    await page.fill("#l-price-1", "150.50");
    let text = await page.textContent("#iv-preview");
    check(text.includes("£2,251.50") && !text.includes("VAT ("), "facture UK : sans TVA par défaut");
    await page.selectOption("#iv-tax-rate", "20");
    text = await page.textContent("#iv-preview");
    check(text.includes("£450.30") && text.includes("£2,701.80"), "facture UK : TVA 20 % = 450,30 £, total 2 701,80 £");
    await page.selectOption("#iv-tax-rate", "0");
    check((await page.textContent("#iv-preview")).includes("VAT (0%)"), "facture UK : taux zéro affiché");
    await page.fill("#iv-me-extra", "Company no. 01234567");
    check((await page.textContent("#iv-preview")).includes("Company no. 01234567"), "facture UK : mentions de société");
    await page.click('[data-doctype="estimate"]');
    check((await page.textContent("#iv-preview")).includes("QUOTE"), "devis UK : titre QUOTE");
    await page.click('[data-doctype="invoice"]');
    await page.selectOption("#iv-tax-rate", "none");
  },
  async "uk/making-tax-digital/"(page) {
    check((await page.textContent("#m-start")).trim() === "6 April 2027", "MTD : 40 000 £ → avril 2027");
    await page.fill("#m-income", "60,000");
    check((await page.textContent("#m-start")).trim() === "6 April 2026", "MTD : 60 000 £ → avril 2026");
    await page.fill("#m-income", "15,000");
    check((await page.textContent("#m-start")).trim() === "Not yet", "MTD : 15 000 £ → pas concerné");
    check((await page.$$("#m-deadlines tr")).length === 4, "MTD : 4 échéances trimestrielles");
    await page.fill("#m-income", "40,000");
  },
  async "uk/freelance-email-templates/"(page) {
    await page.click('[data-copy="#tpl-3"]');
    check(await copied(page, '[data-copy="#tpl-3"]'), "modèles UK : bouton Copy");
  },
  async "uk/legal-notice/"() {},
  async "uk/privacy-policy/"() {},
  async "ca/"(page) {
    const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const href of [...new Set(links.filter((h) => h.startsWith("/outils-freelance/")))]) {
      const res = await page.request.get(`http://127.0.0.1:${port}${href}`);
      check(res.status() === 200, `CA : lien interne ${href} (${res.status()})`);
    }
    check((await page.$$('link[rel="alternate"][hreflang]')).length === 6, "CA : hreflang vers les 5 sections + x-default");
  },
  async "ca/self-employed-tax-calculator/"(page) {
    // Ontario, 80 000 $ : RPC 8 892,90 + fédéral 8 698,44 + Ontario 3 785,12 + contribution santé 750 (voir tests unitaires)
    check((await page.textContent("#r-total")).trim() === "$22,126", `CA : Ontario 80 000 $ → 22 126 $ (obtenu : ${await page.textContent("#r-total")})`);
    check((await page.textContent("#r-federal")).trim() === "$8,698" && (await page.textContent("#r-provincial")).trim() === "$4,535", "CA : fédéral 8 698 $, Ontario 4 535 $");
    await page.selectOption("#t-province", "QC");
    await page.fill("#t-profit", "60,000");
    check((await page.textContent("#r-total")).trim() === "$16,663" && await page.isVisible("#r-qpip-row"), "CA : Québec 60 000 $ → 16 663 $, RQAP affiché");
    check((await page.textContent("#r-inst")).includes("Revenu Québec"), "CA : acomptes ARC et Revenu Québec");
    await page.selectOption("#t-province", "AB");
    await page.fill("#t-profit", "50,000");
    check((await page.textContent("#r-total")).trim() === "$11,191", "CA : Alberta 50 000 $ → 11 191 $");
    await page.selectOption("#t-province", "ON");
    await page.fill("#t-profit", "80,000");
  },
  async "ca/gst-hst-calculator/"(page) {
    check((await page.textContent("#st-hero")).trim() === "$1,130.00", "TVH : Ontario 13 % par défaut");
    await page.selectOption("#st-region", "QC");
    check((await page.textContent("#st-hero")).trim() === "$1,149.75" && (await page.$$("#st-list li")).length === 4, "TPS + TVQ : 1 000 $ → 1 149,75 $, deux lignes de taxe");
    await page.click('[data-dir="gross"]');
    await page.fill("#st-amount", "1,149.75");
    check((await page.textContent("#st-hero")).trim() === "$1,000.00", "TPS + TVQ : retrait des taxes");
    check((await page.$$("#st-table tr")).length === 13, "taxes : tableau des 13 provinces et territoires");
    await page.click('[data-dir="net"]');
    await page.fill("#st-amount", "1,000");
    await page.selectOption("#st-region", "ON");
  },
  async "ca/hourly-rate-calculator/"(page) {
    check((await page.textContent("#h-billable")).includes("1,288"), "CA taux horaire : 1 288 heures facturables");
    const ok = await page.evaluate(() => {
      const P = OF_RULES._meta.provinces;
      const profit = OFE.taxCA.profitForTakeHome(60000, { province: "ON" }, OF_RULES, P);
      const back = OFE.taxCA.estimate({ profit, province: "ON" }, OF_RULES, P).takeHome;
      return Math.abs(back - 60000) < 1 && document.getElementById("h-rate").textContent.trim() === OF.money((profit + 5000) / 1288 * 1.15, 0);
    });
    check(ok, "CA taux horaire : calcul inverse cohérent");
  },
  async "ca/invoice-generator/"(page) {
    await page.fill("#iv-me-name", "Alex Morgan Design");
    await page.fill("#l-desc-0", "Website design");
    await page.fill("#l-qty-0", "1");
    await page.fill("#l-price-0", "1,800");
    await page.click("#iv-add-line");
    await page.fill("#l-desc-1", "Copywriting (hours)");
    await page.fill("#l-qty-1", "3");
    await page.fill("#l-price-1", "150.50");
    let text = await page.textContent("#iv-preview");
    check(text.includes("HST (13%)") && text.includes("$292.70") && text.includes("$2,544.20"), "facture CA : TVH Ontario 13 % = 292,70 $");
    await page.selectOption("#iv-tax-rate", "QC");
    text = await page.textContent("#iv-preview");
    check(text.includes("GST (5%)") && text.includes("$112.58") && text.includes("QST (9.975%)") && text.includes("$224.59") && text.includes("$2,588.67"), "facture CA : TPS + TVQ sur deux lignes");
    await page.selectOption("#iv-tax-rate", "none");
    check(!(await page.textContent("#iv-preview")).includes("GST ("), "facture CA : petit fournisseur sans taxe");
    await page.selectOption("#iv-tax-rate", "ON");
  },
  async "ca/late-fee-calculator/"(page) {
    check((await page.textContent("#l-fee")).trim() === "$44.38", "intérêts CA : 2 000 $ × 18 % × 45 ÷ 365");
    check((await page.textContent("#l-clause")).includes("per year"), "intérêts CA : clause avec taux annuel (Loi sur l'intérêt)");
  },
  async "ca/payment-reminder-email/"(page) {
    const due = new Date(Date.now() - 50 * 86400000).toISOString().slice(0, 10);
    await page.fill("#rm-due", due);
    await page.fill("#rm-amount", "2000");
    check((await page.getAttribute('[data-stage="3"]', "aria-selected")) === "true" && (await page.textContent("#rm-subject")).includes("Demand for payment"), "relance CA : lettre de mise en demeure après 50 jours");
  },
  async "ca/freelance-email-templates/"() {},
  async "ca/legal-notice/"() {},
  async "ca/privacy-policy/"() {},
  async "ca/fr/"(page) {
    const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const href of [...new Set(links.filter((h) => h.startsWith("/outils-freelance/")))]) {
      const res = await page.request.get(`http://127.0.0.1:${port}${href}`);
      check(res.status() === 200, `CA-FR : lien interne ${href} (${res.status()})`);
    }
    check((await page.getAttribute("html", "lang")) === "fr-CA", "CA-FR : langue fr-CA");
  },
  async "ca/fr/calculateur-impot-travailleur-autonome/"(page) {
    const total = (await page.textContent("#r-total")).replace(/\s/g, "");
    check(total === "16663$", `CA-FR : Québec 60 000 $ → 16 663 $ (obtenu : ${total})`);
    check((await page.textContent("#r-pension-label")).includes("RRQ"), "CA-FR : libellé RRQ");
  },
  async "ca/fr/calcul-tps-tvq/"(page) {
    check((await page.textContent("#st-hero")).replace(/\s/g, "") === "114,98$", "TPS/TVQ : 100 $ → 114,98 $");
    const list = (await page.textContent("#st-list")).replace(/\s/g, "");
    check(list.includes("TPS(5%)5,00$") && list.includes("TVQ(9,975%)9,98$"), "TPS/TVQ : 5,00 $ de TPS et 9,98 $ de TVQ");
  },
  async "ca/fr/calculateur-taux-horaire/"(page) {
    check((await page.textContent("#h-billable")).replace(/\s/g, "").includes("1299heures"), "CA-FR taux horaire : 1 299 heures facturables");
  },
  async "ca/fr/generateur-facture/"(page) {
    await page.fill("#l-desc-0", "Conception du site Web");
    await page.fill("#l-qty-0", "1");
    await page.fill("#l-price-0", "1 800");
    await page.click("#iv-add-line");
    await page.fill("#l-desc-1", "Rédaction (heures)");
    await page.fill("#l-qty-1", "3");
    await page.fill("#l-price-1", "150,50");
    const text = (await page.textContent("#iv-preview")).replace(/\s/g, "");
    check(text.includes("TPS(5%)112,58$") && text.includes("TVQ(9,975%)224,59$") && text.includes("2588,67$"), "facture CA-FR : TPS et TVQ, total 2 588,67 $");
    await page.click('[data-doctype="estimate"]');
    check((await page.textContent("#iv-preview")).includes("SOUMISSION"), "soumission CA-FR : titre");
    await page.click('[data-doctype="invoice"]');
  },
  async "ca/fr/relance-de-paiement/"(page) {
    const due = new Date(Date.now() - 50 * 86400000).toISOString().slice(0, 10);
    await page.fill("#rm-due", due);
    check((await page.getAttribute('[data-stage="3"]', "aria-selected")) === "true" && (await page.textContent("#rm-body")).includes("MISE EN DEMEURE"), "relance CA-FR : mise en demeure après 50 jours");
    await page.click("#rm-copy");
    check(await copied(page, "#rm-copy"), "relance CA-FR : bouton Copier");
  },
  async "ca/fr/calculateur-interets-retard/"(page) {
    check((await page.textContent("#l-fee")).replace(/\s/g, "") === "44,38$", "intérêts CA-FR : 44,38 $");
    check((await page.textContent("#l-clause")).includes("par année"), "intérêts CA-FR : clause avec taux annuel");
  },
  async "ca/fr/modeles-de-courriels/"(page) {
    await page.click('[data-copy="#tpl-1"]');
    check(await copied(page, '[data-copy="#tpl-1"]'), "modèles CA-FR : bouton Copier");
  },
  async "ca/fr/mentions-legales/"() {},
  async "ca/fr/confidentialite/"() {},
  async "fr/facturation-electronique/"(page) {
    check((await page.textContent("#e-date")).trim() === "1er septembre 2027", "facture électronique : micro-entreprise → 1er septembre 2027");
    await page.selectOption("#e-size", "eti");
    check((await page.textContent("#e-date")).trim() === "1er septembre 2026", "facture électronique : ETI → 1er septembre 2026");
    await page.check("#e-b2c");
    check((await page.textContent("#e-list")).includes("E-reporting"), "facture électronique : e-reporting pour les particuliers");
    await page.uncheck("#e-b2b");
    check((await page.textContent("#e-date")).trim() === "Non concerné", "facture électronique : sans clients professionnels");
    await page.check('[data-step="pa"]');
    await page.reload({ waitUntil: "networkidle" });
    check(await page.isChecked('[data-step="pa"]'), "facture électronique : checklist mémorisée");
    await page.check("#e-b2b");
    await page.uncheck("#e-b2c");
    await page.selectOption("#e-size", "micro");
  },
  async "fr/calcul-date-echeance-facture/"(page) {
    await page.fill("#d-date", "2026-03-10");
    await page.selectOption("#d-terms", "45fdm");
    check((await page.textContent("#d-due")).trim() === "30 avril 2026", "échéance : 10 mars + 45 jours fin de mois → 30 avril");
    await page.selectOption("#d-terms", "fdm45");
    check((await page.textContent("#d-due")).trim() === "15 mai 2026", "échéance : fin de mars + 45 jours → 15 mai");
    await page.selectOption("#d-terms", "60");
    check((await page.textContent("#d-due")).trim() === "9 mai 2026" && (await page.getAttribute("#d-notice", "class")).includes("ok"), "échéance : 60 jours, conforme");
    await page.fill("#d-date", "");
    await page.selectOption("#d-terms", "30");
  },
  async "fr/comparateur-statuts/"(page) {
    // Micro libérale : 60 000 − 5 000 − 15 480 − 4 983,99 = 34 536 € (voir tests unitaires)
    check((await page.textContent("#c-m-net")).replace(/\s/g, "") === "34536€", "statuts : micro-entreprise 34 536 €");
    check((await page.textContent("#c-best-label")).includes("Micro-entreprise"), "statuts : micro la plus avantageuse à 60 000 €");
    await page.fill("#c-revenue", "120 000");
    check(await page.evaluate(() => document.getElementById("c-micro").classList.contains("is-out")), "statuts : micro exclue au-delà du plafond");
    await page.fill("#c-revenue", "60 000");
    await page.fill("#c-share", "0");
    check((await page.textContent("#c-notice")).includes("retraite"), "statuts : avertissement SASU sans salaire");
    await page.fill("#c-share", "50");
  },
  async "fr/bareme-kilometrique/"(page) {
    // 5 CV, 8 000 km : 8 000 × 0,357 + 1 395 = 4 251 €
    check((await page.textContent("#k-total")).replace(/\s/g, "") === "4251€", "barème kilométrique : 5 CV, 8 000 km → 4 251 €");
    await page.check("#k-ev");
    check((await page.textContent("#k-total")).replace(/\s/g, "") === "5101€", "barème kilométrique : véhicule électrique +20 % → 5 101 €");
    await page.uncheck("#k-ev");
    await page.fill("#k-km", "12 000");
    check((await page.textContent("#k-total")).replace(/\s/g, "") === "5679€", "barème kilométrique : 12 000 km → 5 679 €");
    await page.fill("#k-km", "8 000");
  },
  async "us/mileage-deduction-calculator/"(page) {
    check((await page.textContent("#m-total")).trim() === "$4,455.00", "US mileage: 3,000 × 72.5¢ + 3,000 × 76¢ = $4,455.00");
  },
  async "uk/mileage-allowance-calculator/"(page) {
    check((await page.textContent("#m-total")).trim() === "£6,000.00", "UK mileage: 10,000 × 55p + 2,000 × 25p = £6,000.00");
    await page.fill("#m-paid", "45");
    check((await page.textContent("#m-sub")).includes("£600.00"), "UK mileage: Mileage Allowance Relief £600.00 at 45p");
    await page.fill("#m-paid", "");
    await page.selectOption("#m-vehicle", "motorcycle");
    check((await page.textContent("#m-total")).trim() === "£2,880.00", "UK mileage: motorcycle 12,000 × 24p = £2,880.00");
    await page.selectOption("#m-vehicle", "car");
  },
  async "ca/vehicle-expenses-calculator/"(page) {
    await page.fill("#v-fuel", "5000");
    check((await page.textContent("#v-deduction")).trim() === "$3,000", "CA vehicle: $5,000 × 12,000 / 20,000 km = $3,000");
    await page.fill("#v-total", "10,000");
    check(await page.isVisible("#v-warning"), "CA vehicle: warning when business km exceed total km");
    await page.fill("#v-total", "20,000");
    await page.fill("#v-fuel", "");
  },
  async "ca/fr/calculateur-frais-vehicule/"(page) {
    await page.fill("#v-fuel", "5000");
    check((await page.textContent("#v-deduction")).replace(/\s/g, "") === "3000$", "véhicule CA-FR : 5 000 $ × 12 000 / 20 000 km = 3 000 $");
    await page.fill("#v-fuel", "");
  },
  async "fr/calendrier-fiscal-auto-entrepreneur/"(page) {
    await page.goto(BASE + "fr/calendrier-fiscal-auto-entrepreneur/?today=2026-10-20", { waitUntil: "networkidle" });
    const next = async () => [(await page.textContent("#cal-next")).trim(), await page.textContent("#cal-next-title")];
    let [day, title] = await next();
    check(day === "2 novembre 2026" && title.includes("3e trimestre 2026"), "calendrier FR : trimestriel → 2 novembre 2026 (31 octobre reporté)");
    await page.selectOption("#cal-periodicity", "monthly");
    [day, title] = await next();
    check(day === "2 novembre 2026" && title.includes("septembre 2026"), "calendrier FR : mensuel → chiffre d'affaires de septembre");
    await page.check("#cal-created");
    const list = await page.textContent("#cal-list");
    check(list.includes("1447-C-SD") && !list.includes("Paiement de la CFE 2026"), "calendrier FR : création en 2026 → déclaration 1447-C, pas de CFE 2026");
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("#cal-ics")]);
    const ics = (await import("fs")).readFileSync(await download.path(), "utf8");
    const count = parseInt((await page.textContent("#cal-count")).replace(/\D/g, ""), 10);
    check(ics.startsWith("BEGIN:VCALENDAR") && (ics.match(/BEGIN:VEVENT/g) || []).length === count && ics.includes("TRIGGER:-P3D"),
      `calendrier FR : export .ics de ${count} échéances avec rappel`);
    const shown = await page.$$eval(".cal-item", (els) => els.length);
    await page.click("#cal-more");
    const all = await page.$$eval(".cal-item", (els) => els.length);
    check(shown === 8 && all === count, `calendrier FR : 8 échéances, puis les ${count} avec « Afficher les suivantes »`);
    await page.selectOption("#cal-periodicity", "quarterly");
    await page.uncheck("#cal-created");
  },
  async "us/tax-calendar/"(page) {
    await page.goto(BASE + "us/tax-calendar/?today=2026-10-20", { waitUntil: "networkidle" });
    check((await page.textContent("#cal-next")).trim() === "January 15, 2027", "US calendar: next deadline Q4 estimated tax, January 15, 2027");
    await page.uncheck("#cal-estimated");
    check((await page.textContent("#cal-next")).trim() === "February 1, 2027", "US calendar: without estimated taxes → February 1, 2027 (1099)");
    await page.check("#cal-estimated");
  },
  async "uk/tax-calendar/"(page) {
    await page.goto(BASE + "uk/tax-calendar/?today=2026-10-20", { waitUntil: "networkidle" });
    check((await page.textContent("#cal-next")).trim() === "31 October 2026", "UK calendar: next deadline paper return, 31 October 2026");
    await page.selectOption("#cal-vat", "1");
    await page.selectOption("#cal-mtd", "2026");
    const list = await page.textContent("#cal-list");
    check(list.includes("quarter ending 30 September 2026") && list.includes("Making Tax Digital quarterly update"), "UK calendar: VAT quarter and MTD updates shown");
    await page.selectOption("#cal-vat", "none");
    await page.selectOption("#cal-mtd", "no");
  },
  async "ca/tax-calendar/"(page) {
    await page.goto(BASE + "ca/tax-calendar/?today=2026-10-20", { waitUntil: "networkidle" });
    check((await page.textContent("#cal-next")).trim() === "December 15, 2026", "CA calendar: next deadline instalment, December 15, 2026");
    await page.selectOption("#cal-gst", "quarterly");
    check((await page.textContent("#cal-next")).trim() === "October 31, 2026", "CA calendar: quarterly GST/HST filer → October 31, 2026");
    await page.selectOption("#cal-gst", "annual");
  },
  async "ca/fr/calendrier-fiscal/"(page) {
    await page.goto(BASE + "ca/fr/calendrier-fiscal/?today=2026-10-20", { waitUntil: "networkidle" });
    check((await page.textContent("#cal-next")).trim() === "15 décembre 2026", "calendrier CA-FR : acompte provisionnel du 15 décembre 2026");
  },
  async "fr/confidentialite/"() {},
  async "fr/mentions-legales/"() {},
};

for (const [url, run] of Object.entries(tests)) {
  for (const [label, viewport] of [["bureau", { width: 1280, height: 900 }], ["tablette", { width: 1024, height: 768 }], ["mobile", { width: 390, height: 844 }]]) {
    const page = await context.newPage();
    await page.setViewportSize(viewport);
    const errors = await open(page, url);
    if (label === "bureau") await run(page);
    if (label === "mobile" && url === "fr/") {
      await page.click(".menu-toggle");
      check(await page.isVisible('.nav a[href$="/fr/generateur-facture/"]'), "menu mobile : panneau ouvert avec les outils");
      await page.screenshot({ path: path.join(shots, "menu-mobile.png") });
      await page.click(".menu-toggle");
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(shots, `${url.replace(/\/$/, "").replace(/\//g, "_") || "accueil"}-${label}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (label === "bureau") {
      const hidden = await page.evaluate(() => { const n = document.querySelector(".nav"); return n.scrollWidth > n.clientWidth + 1; });
      check(!hidden, `${url || "accueil"} (${label}) : toutes les catégories du menu sont visibles`);
    }
    check(!overflow, `${url || "accueil"} (${label}) : pas de défilement horizontal`);
    check(errors.length === 0, `${url || "accueil"} (${label}) : aucune erreur JavaScript${errors.length ? " → " + errors.join(" | ") : ""}`);
    await page.close();
  }
}

await browser.close();
server.kill();
console.log(failures.length ? `\n${failures.length} échec(s)` : "\nTous les tests passent.");
process.exit(failures.length ? 1 : 0);
