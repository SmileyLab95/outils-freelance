// Teste le site généré dans docs/ avec un vrai navigateur (Playwright) et produit des captures d'écran.
// Usage : node outils/verifier.mjs [dossier-captures]
import { createRequire } from "module";
import { spawn } from "child_process";
import { mkdtempSync, symlinkSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import path from "path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const shots = path.resolve(process.argv[2] || path.join(root, "outils", "captures"));
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
const copied = (page, sel) => page.waitForFunction((s) => document.querySelector(s).textContent.includes("Copié"), sel, { timeout: 3000 }).then(() => true, () => false);

async function open(page, url) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const res = await page.goto(BASE + url, { waitUntil: "networkidle" });
  check(res.status() === 200, `${url || "accueil"} : page servie (200)`);
  return errors;
}

const tests = {
  async "generateur-facture/"(page) {
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
    check(text.includes("TVA non applicable, art. 293 B du CGI"), "facture : mention de franchise de TVA");
    check(text.includes("40 €"), "facture : indemnité forfaitaire de 40 € (client professionnel)");
    check(text.includes("IBAN FR76 1234"), "facture : IBAN dans les conditions de paiement");
    await page.uncheck("#f-franchise");
    const ttc = await page.textContent("#f-preview");
    check(/2\s?701,80\s?€/.test(ttc), "facture : TVA 20 % appliquée (2 701,80 € TTC)");
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
  async ""(page) {
    const links = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    const internal = [...new Set(links.filter((h) => h.startsWith("/outils-freelance/")))];
    for (const href of internal) {
      const res = await page.request.get(`http://127.0.0.1:${port}${href}`);
      check(res.status() === 200, `lien interne ${href} (${res.status()})`);
    }
    check(links.some((h) => h.includes("gumroad.com")), "accueil : lien vers le kit");
  },
  async "calculateur-tjm/"(page) {
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
  async "simulateur-auto-entrepreneur/"(page) {
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
  async "calcul-tva-ht-ttc/"(page) {
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
  async "relance-facture-impayee/"(page) {
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
  async "penalites-de-retard/"(page) {
    await page.fill("#p-rate", "12");
    const total = await page.textContent("#p-total");
    check(/66,63\s?€/.test(total), `pénalités : 1 800 € × 12 % × 45 j ÷ 365 + 40 € = 66,63 € (obtenu : ${total})`);
    await page.selectOption("#p-method", "bce");
    await page.fill("#p-bce", "2");
    check((await page.textContent("#p-r-rate")).includes("12 %"), "méthode BCE + 10 points : 12 %");
  },
  async "mentions-obligatoires-facture/"(page) {
    const boxes = await page.$$("#checklist input");
    for (const b of boxes) await b.check();
    check((await page.textContent("#cl-msg")).includes("Bravo"), "checklist : toutes les mentions cochées");
  },
  async "modeles-emails-freelance/"(page) {
    await page.click('[data-copy="#tpl-1"]');
    check(await copied(page, '[data-copy="#tpl-1"]'), "modèles : bouton Copier");
    check((await page.evaluate(() => navigator.clipboard.readText())).length > 100, "modèles : texte dans le presse-papiers");
  },
  async "confidentialite/"() {},
  async "mentions-legales/"() {},
};

for (const [url, run] of Object.entries(tests)) {
  for (const [label, viewport] of [["bureau", { width: 1280, height: 900 }], ["tablette", { width: 1024, height: 768 }], ["mobile", { width: 390, height: 844 }]]) {
    const page = await context.newPage();
    await page.setViewportSize(viewport);
    const errors = await open(page, url);
    if (label === "bureau") await run(page);
    await page.screenshot({ path: path.join(shots, `${url.replace(/\/$/, "") || "accueil"}-${label}.png`), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (label !== "mobile") {
      const hidden = await page.evaluate(() => { const n = document.querySelector(".nav"); return n.scrollWidth > n.clientWidth + 1; });
      check(!hidden, `${url || "accueil"} (${label}) : tous les liens du menu sont visibles`);
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
