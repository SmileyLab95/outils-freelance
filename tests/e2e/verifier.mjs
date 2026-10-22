// Teste le site généré dans docs/ avec un vrai navigateur (Playwright) et produit des captures d'écran.
// Usage : node tests/e2e/verifier.mjs [dossier-captures]   (ONLY=fr/espace/ pour une seule page)
import { createRequire } from "module";
import { spawn } from "child_process";
import { mkdtempSync, symlinkSync, mkdirSync, existsSync, readFileSync } from "fs";
import { tmpdir, homedir } from "os";
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
// Les pages en français placent des espaces insécables (build.py et engines/typo-fr.js) : les vérifications comparent
// le texte avec des espaces ordinaires.
context.on("page", (page) => {
  const textContent = page.textContent.bind(page);
  page.textContent = async (...args) => {
    const value = await textContent(...args);
    return typeof value === "string" ? value.replace(/[\u00a0\u202f]/g, " ") : value;
  };
});
const failures = [];
const check = (cond, message) => { if (!cond) failures.push(message); console.log(`${cond ? "✓" : "✗"} ${message}`); };

// Accessibilité : règles WCAG 2.1 A et AA d'axe-core (installé par sh tests/e2e/installer-axe.sh ; dossier dans
// AXE_CORE), sur chaque page dans les trois formats (sur ordinateur, à l'ouverture et après le parcours) et sur les
// écrans de l'Espace.
const AXE_FILE = path.join(process.env.AXE_CORE || path.join(homedir(), ".cache", "axe-core"), "node_modules", "axe-core", "axe.min.js");
const AXE = existsSync(AXE_FILE) ? readFileSync(AXE_FILE, "utf8") : null;
check(AXE !== null, `accessibilité : axe-core disponible${AXE ? "" : ` (absent de ${AXE_FILE} → sh tests/e2e/installer-axe.sh)`}`);
async function accessible(page, label) {
  if (!AXE) return;
  if (!(await page.evaluate(() => "axe" in window))) await page.addScriptTag({ content: AXE });
  // Transitions en cours (bouton « Copié ») : attendre leur fin, sinon axe mesure des couleurs intermédiaires.
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect && a.effect.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))));
  const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }))
    .violations.map((v) => `${v.id} : ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}${v.nodes.length > 3 ? "…" : ""}`));
  check(violations.length === 0, `${label} : accessibilité WCAG 2.1 AA (axe-core)${violations.length ? " → " + violations.join(" | ") : ""}`);
}

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
    await page.fill("#f-date", "2026-11-15");
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
    check(text.includes("TVA non applicable, art. 293 B du CGI."), "facture : mention de franchise de TVA (art. 293 B du CGI en 2026)");
    await page.fill("#f-date", "2027-01-15");
    check((await page.textContent("#f-preview")).includes("TVA non applicable, art. L. 233-3 du CIBS (ex-art. 293 B du CGI)."), "facture : mention CIBS pour une facture datée de 2027");
    await page.fill("#f-date", "2026-11-15");
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
    await page.selectOption("#f-vat-place", "eu");
    const eu = await page.textContent("#f-preview");
    check(eu.includes("Autoliquidation : TVA due par le preneur") && eu.includes("N° de TVA intracommunautaire du client") && !/2\s?701,80/.test(eu), "facture : client de l'UE → autoliquidation, sans TVA");
    await page.selectOption("#f-vat-place", "fr");
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
    // Clavier (WCAG 2.1.1, 2.4.1, 2.4.3, 2.4.7) : lien d'évitement, menu ouvert et refermé au clavier, focus visible.
    await page.reload({ waitUntil: "networkidle" });
    const active = (fn) => page.evaluate(fn);
    await page.keyboard.press("Tab");
    check(await active(() => document.activeElement.matches(".skip") && document.activeElement.getBoundingClientRect().left >= 0),
      "clavier : « Aller au contenu » est le premier arrêt, et il est visible");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    check(await active(() => !!document.activeElement.closest("main")), "clavier : le lien d'évitement mène au contenu");
    const first = ".nav .nav-group:first-child";
    await page.focus(`${first} .nav-trigger`);
    await page.keyboard.press("Enter");
    check(await page.isVisible(`${first} .nav-menu`) && (await page.getAttribute(`${first} .nav-trigger`, "aria-expanded")) === "true",
      "clavier : Entrée ouvre le menu");
    await page.keyboard.press("Tab");
    check(await active(() => !!document.activeElement.closest(".nav-group.open .nav-menu")), "clavier : Tab entre dans le menu ouvert");
    check(await active(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle === "solid" && parseFloat(s.outlineWidth) >= 2 && /^rgb\(/.test(s.outlineColor); }),
      "clavier : contour de focus visible et opaque");
    await page.keyboard.press("Escape");
    check(!(await page.isVisible(`${first} .nav-menu`)) && (await active(() => document.activeElement.matches(".nav-group:first-child > .nav-trigger"))),
      "clavier : Échap referme le menu et rend le focus à son bouton");
    await page.focus(`${first} .nav-trigger`);
    await page.keyboard.press("Enter");
    const reopened = await page.isVisible(`${first} .nav-menu`);
    const items = await page.$$eval(`${first} .nav-menu a`, (as) => as.length);
    for (let i = 0; i <= items; i++) await page.keyboard.press("Tab");
    check(reopened && !(await page.isVisible(`${first} .nav-menu`)) && (await page.getAttribute(`${first} .nav-trigger`, "aria-expanded")) === "false",
      "clavier : le menu se referme quand le focus le quitte");
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
    check(boxes.length === 12 && (await page.textContent("#checklist")).includes("assurance professionnelle"), "checklist : 12 mentions, dont l'assurance professionnelle");
    const text = async (sel) => (await page.textContent(sel)).replace(/[\u00a0\u202f]/g, " ");
    check((await text("#cl-msg")) === "Cochez les mentions présentes sur votre facture." && (await text("#cl-score")) === "0 sur 12 mentions",
      "checklist : message et score de départ");
    for (const b of boxes) await b.check();
    check((await page.textContent("#cl-msg")).includes("Bravo") && (await page.textContent("#cl-score")).includes("12 sur 12"), "checklist : toutes les mentions cochées");
    await boxes[0].uncheck();
    check((await text("#cl-msg")) === "Il manque 1 mention. Les points non cochés sont à ajouter avant d'envoyer votre facture.", "checklist : une mention manquante (singulier)");
    await boxes[1].uncheck();
    check((await text("#cl-msg")).startsWith("Il manque 2 mentions.") && (await text("#cl-score")) === "10 sur 12 mentions", "checklist : deux mentions manquantes (pluriel)");
  },
  async "fr/modeles-emails-freelance/"(page) {
    await page.click('[data-copy="#tpl-1"]');
    check(await copied(page, '[data-copy="#tpl-1"]'), "modèles : bouton Copier");
    check((await page.evaluate(() => navigator.clipboard.readText())).length > 100, "modèles : texte dans le presse-papiers");
  },
  async "us/sole-proprietor-vs-s-corp/"(page) {
    const t = (id) => page.textContent(`#${id}`);
    check((await t("c-verdict")) === "–" && (await t("c-sub")) === "Enter the salary the S corp would pay you." && (await t("c-p-keep")) === "$91,538" &&
      (await t("c-s-keep")) === "–", "S corp US : aucun salaire proposé, colonne S corp en attente");
    await page.fill("#c-salary", "60,000");
    check((await t("c-verdict")) === "+$5,125 a year" && (await t("c-s-payroll")) === "$9,222" && (await t("c-s-keep")) === "$96,663",
      "S corp US : 120 000 $, salaire 60 000 $ → +5 125 $ par an, charges sociales 9 222 $");
    await page.fill("#c-extra", "3,000");
    check((await t("c-verdict")) === "+$2,653 a year" && (await t("c-s-extra")) === "$3,000", "S corp US : frais de 3 000 $ déduits de l'écart");
    await page.selectOption("#c-status", "married_filing_jointly");
    await page.fill("#c-extra", "");
    check((await t("c-verdict")) === "+$6,697 a year", "S corp US : mariés, déclaration commune → +6 697 $");
    await page.selectOption("#c-status", "single");
    await page.fill("#c-salary", "0");
    check((await t("c-notice")).includes("A salary of $0 isn't reasonable") && (await page.getAttribute("#c-notice", "class")).includes("warn"),
      "S corp US : salaire nul → avertissement du salaire raisonnable");
    await page.fill("#c-salary", "130,000");
    check((await t("c-verdict")) === "–" && (await t("c-notice")).includes("Lower the salary"), "S corp US : salaire supérieur au bénéfice → refus expliqué");
    await page.fill("#c-salary", "abc");
    check((await page.getAttribute("#c-salary", "aria-invalid")) === "true" && (await t("c-verdict")) === "–" && (await t("c-p-keep")) === "–" &&
      (await t("c-notice")).includes("Check the salary"), "S corp US : saisie illisible → aucun résultat, champ signalé");
    await accessible(page, "S corp US (saisie illisible)");
    await page.fill("#c-salary", "60,000");
    await page.check("#c-sstb");
    await page.reload({ waitUntil: "networkidle" });
    check(await page.isChecked("#c-sstb") && (await page.inputValue("#c-salary")) === "60,000", "S corp US : saisie mémorisée après rechargement");
    await page.uncheck("#c-sstb");
    await page.fill("#c-salary", "");
    check((await t("c-verdict")) === "–", "S corp US : situation par défaut rétablie");
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
  async "uk/how-much-to-set-aside-for-tax/"(page) {
    // documentation/pays/uk.md (spécification) : 4 000 £ par mois, 300 £ de dépenses → bénéfice 44 400 £ ;
    // impôt 20 % × 31 830 = 6 366 ; Class 4 6 % × 31 830 = 1 909,80 ; total 8 275,80 = 17,2 % du CA → 18 %.
    const text = async (sel) => (await page.textContent(sel)).replace(/\s+/g, " ").trim();
    check((await text("#u-share")) === "18%" && (await text("#u-sub")).includes("about £720 a month. Tax for the year: £8,276."),
      "UK set aside : 18 % de chaque paiement (impôt et Class 4 de 8 276 £)");
    check((await text("#u-it")) === "£6,366" && (await text("#u-ni")) === "£1,910" && (await text("#u-poa")) === "£4,138 each",
      "UK set aside : impôt, Class 4 et payments on account");
    check((await text("#u-pay-tax")) === "£360.00" && (await text("#u-pay-keep")) === "£1,640.00" && !(await page.isVisible("#u-pay-vat-row")),
      "UK set aside : 2 000 £ reçus, 360 £ à mettre de côté");
    await page.check("#u-vat");
    await page.fill("#u-payment", "2,400");
    check((await text("#u-pay-vat")) === "£400.00" && (await text("#u-pay-tax")) === "£360.00" && (await text("#u-notice")).includes("Flat Rate Scheme"),
      "UK set aside : 2 400 £ TTC, TVA de 400 £ mise de côté d'abord");
    await page.fill("#u-salary", "30,000");
    // Salaire 30 000 + bénéfice 44 400 : impôt total 7 540 + 40 % × 24 130 = 17 192 ; sur le salaire 3 486 ;
    // dû sur le bénéfice 13 706 ; avec la Class 4, 15 615,80 = 32,5 % → 33 %.
    check((await text("#u-share")) === "33%" && (await text("#u-it")) === "£13,706" && (await text("#u-it-label")).includes("on your profit (40% band)"),
      "UK set aside : avec un salaire de 30 000 £, le bénéfice est imposé à 40 % (33 %)");
    await page.fill("#u-salary", "");
    await page.uncheck("#u-vat");
    await page.fill("#u-income", "8,000");
    check((await text("#u-notice")).includes("VAT registration threshold"), "UK set aside : seuil de TVA de 90 000 £ dépassé signalé");
    await page.fill("#u-income", "4,000");
    await page.selectOption("#u-region", "scotland");
    check((await text("#u-total")) === "£8,540" && (await text("#u-it")) === "£6,630" && (await text("#u-it-label")).includes("(42% band)"),
      "UK set aside : barème écossais (tranche à 42 %)");
    await page.selectOption("#u-region", "ruk");
    // 2 769 £ par mois, 550 £ de dépenses : impôt et Class 4 de 3 655,08 £ = exactement 11 % de 33 228 £.
    await page.fill("#u-income", "2,769");
    await page.fill("#u-expenses", "550");
    check((await text("#u-share")) === "11%", "UK set aside : part exacte de 11 %, pas arrondie à 12 % (virgule flottante)");
    await page.fill("#u-expenses", "-200");
    check((await page.getAttribute("#u-expenses", "aria-invalid")) === "true" && (await text("#u-notice")).includes("Check business expenses") &&
      (await text("#u-sub")).includes("Check business expenses"), "UK set aside : champ invalide nommé, aussi dans le résumé annoncé");
    await page.fill("#u-expenses", "300");
    await page.fill("#u-income", "4,000");
    await page.selectOption("#u-region", "scotland");
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#u-region")) === "scotland" && (await page.inputValue("#u-payment")) === "2,400", "UK set aside : saisie retrouvée après rechargement");
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
    await page.selectOption("#iv-tax-rate", "outside");
    text = await page.textContent("#iv-preview");
    check(!text.includes("VAT (") && text.includes("£2,251.50"), "facture UK : hors champ → aucune ligne de TVA");
    await page.selectOption("#iv-tax-rate", "none");
  },
  async "uk/invoice-requirements/"(page) {
    const visible = () => page.$$eval("#checklist li", (lis) => lis.filter((li) => !li.hidden && li.offsetParent !== null).map((li) => li.textContent));
    const score = () => page.textContent("#cl-score");
    const msg = () => page.textContent("#cl-msg");
    const tickAll = async () => { for (const box of await page.$$("#checklist li:not([hidden]) input")) await box.check(); };
    let items = await visible();
    check(items.length === 11 && (await score()) === "0 of 11 details" && items.some((t) => t.includes("Your own name")) &&
      !items.some((t) => /VAT registration number|registered company name/.test(t)), "liste UK : 11 points pour un sole trader non immatriculé à la TVA");
    check((await msg()) === "Tick the details your invoice shows." && await page.isVisible("text=Don't show any VAT"),
      "liste UK : message de départ et rappel « pas de TVA »");
    await tickAll();
    check((await score()) === "11 of 11 details" && (await page.getAttribute("#cl-msg", "class")).includes("ok") &&
      (await msg()).startsWith("All set"), "liste UK : toutes les mentions cochées");
    await page.click('label:has(input[name="vat"])');
    items = await visible();
    check(items.length === 18 && (await score()) === "11 of 18 details" && items.some((t) => t.includes("VAT registration number")) &&
      items.some((t) => t.includes("time of supply (tax point)")) && !(await page.isVisible("text=Don't show any VAT")),
      "liste UK : immatriculé à la TVA → 18 points, 7 de plus");
    check((await msg()) === "7 details missing: add them before you send your invoice.", "liste UK : 7 points manquants");
    await page.click('label:has(input[value="ltd"])');
    items = await visible();
    check(items.length === 18 && (await score()) === "8 of 17 details" && items.some((t) => t.includes("full registered company name")) &&
      !items.some((t) => t.includes("Your own name")), "liste UK : société → ses points au lieu de ceux du sole trader, le recommandé hors compte");
    await page.check("#checklist li[data-optional] input");
    check((await score()) === "8 of 17 details", "liste UK : cocher le point recommandé ne change pas le compte");
    await page.focus('input[name="business"][value="ltd"]');
    await page.keyboard.press("ArrowLeft");
    check(await page.isChecked('input[name="business"][value="sole"]') && (await score()) === "11 of 18 details", "liste UK : situation changée au clavier (flèches)");
    await page.keyboard.press("ArrowRight");
    await page.reload({ waitUntil: "networkidle" });
    check(await page.isChecked('input[name="business"][value="ltd"]') && await page.isChecked('input[name="vat"]') &&
      (await score()) === "0 of 17 details", "liste UK : situation mémorisée après rechargement");
    await page.click('label:has(input[value="sole"])');
    await page.click('label:has(input[name="vat"])');
    await tickAll();
    await page.uncheck("#checklist li:not([hidden]) input >> nth=0");
    check((await msg()) === "1 detail missing: add it before you send your invoice." && (await score()) === "10 of 11 details",
      "liste UK : un point manquant (singulier)");
    check((await page.textContent("main")).includes("£250 or less"), "liste UK : facture simplifiée de 250 £ ou moins");
    check((await page.textContent(".sources")).includes("20 October 2026"), "liste UK : date de vérification au format britannique");
  },
  async "uk/invoicing-overseas-clients/"(page) {
    const verdict = () => page.textContent("#x-verdict");
    const why = () => page.textContent("#x-why");
    const items = (id) => page.$$eval(`#${id} li`, (lis) => lis.map((li) => li.textContent));
    const choose = async (values) => { for (const [id, value] of Object.entries(values)) await page.selectOption(`#x-${id}`, value); };
    check((await verdict()) === "No UK VAT" && (await why()).includes("supplied where the business belongs") &&
      (await items("x-wording")).some((t) => t.includes("client's VAT number")) && (await items("x-actions")).some((t) => t.includes("£90,000")),
      "client étranger UK : entreprise de l'UE, non immatriculé → hors champ, n° de TVA du client, seuil");
    await choose({ registered: "yes" });
    check((await items("x-actions")).some((t) => t.includes("box 6")) && !(await items("x-actions")).some((t) => t.includes("£90,000")),
      "client étranger UK : immatriculé → case 6, pas de seuil");
    await choose({ location: "world" });
    check((await verdict()) === "No UK VAT" && !(await items("x-wording")).some((t) => t.includes("VAT number")), "client étranger UK : entreprise hors UE → pas de n° de TVA demandé");
    await choose({ service: "place" });
    check((await verdict()) === "It depends" && (await why()).includes("special rules") && (await items("x-actions"))[0].includes("Notice 741A"),
      "client étranger UK : service lié à un lieu → règles particulières, sans verdict");
    await choose({ customer: "consumer", service: "remote" });
    check((await verdict()) === "It depends" && (await why()).includes("doesn't settle"), "client étranger UK : particulier, design → question non tranchée signalée");
    await choose({ registered: "no" });
    check((await verdict()) === "No VAT" && (await items("x-actions"))[0].startsWith("If the sale is a UK sale"), "client étranger UK : non immatriculé, design → pas de TVA, seuil si vente britannique");
    await choose({ registered: "yes", service: "listed" });
    check((await verdict()) === "No UK VAT" && (await why()).includes("private client who belongs outside the UK"), "client étranger UK : particulier, conseil → hors champ");
    await choose({ service: "digital" });
    check((await verdict()) === "No UK VAT" && (await items("x-actions"))[0].includes("client's country taxes digital services"),
      "client étranger UK : services numériques à un particulier hors UE → hors champ, règles locales");
    await choose({ location: "eu" });
    check((await verdict()) === "VAT of your client's EU country" && (await items("x-actions")).some((t) => t.includes("box 6")),
      "client étranger UK : immatriculé, numériques à un particulier de l'UE → TVA du pays, case 6");
    await choose({ registered: "no" });
    check((await verdict()) === "VAT of your client's EU country" && (await items("x-actions"))[0].includes("non-Union scheme") && (await items("x-actions"))[0].includes("10 years"),
      "client étranger UK : non immatriculé, numériques à un particulier de l'UE → TVA du pays, guichet non-Union");
    await accessible(page, "client étranger UK (TVA de l'UE)");
    await choose({ location: "uk" });
    check((await verdict()) === "No VAT" && !(await page.isVisible("#x-customer")) && !(await page.isVisible("#x-service")) &&
      (await items("x-actions"))[0].includes("counts towards the £90,000"), "client étranger UK : client au Royaume-Uni → champs inutiles masqués, seuil");
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#x-location")) === "uk" && (await verdict()) === "No VAT", "client étranger UK : situation mémorisée après rechargement");
    // Retour à la situation par défaut pour les formats suivants (tablette, mobile).
    await choose({ location: "eu", customer: "business", service: "listed" });
    check((await verdict()) === "No UK VAT", "client étranger UK : situation par défaut rétablie");
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
  async "ca/how-much-to-set-aside-for-taxes/"(page) {
    // documentation/pays/ca.md : 6 000 $ par mois, 500 $ de dépenses → bénéfice 66 000 $ en Ontario ; impôt et RPC
    // de 16 756,47 $ (moteur testé) = 23,3 % du chiffre d'affaires de 72 000 $ → 24 %.
    const text = async (sel) => (await page.textContent(sel)).replace(/\s+/g, " ").trim();
    check((await text("#c-share")) === "24%" && (await text("#c-sub")).includes("about $1,440 a month. Total for the year: $16,756."),
      "CA set aside : 24 % de chaque paiement en Ontario (16 756 $)");
    check((await text("#c-pension")) === "$7,438" && (await text("#c-federal")) === "$6,099" && (await text("#c-provincial")) === "$3,220" &&
      (await text("#c-inst")) === "$4,189/quarter" && (await text("#c-inst-detail")).includes("If your tax owing was also over $3,000 in 2024 or 2025: about $4,189 per quarter to the CRA"),
      "CA set aside : RPC, impôts et acomptes (sous condition des deux années précédentes)");
    check((await text("#c-pay-tax")) === "$720.00" && (await text("#c-pay-keep")) === "$2,280.00" && (await text("#c-notice")).includes("$30,000 small supplier threshold") &&
      !(await page.isVisible("#c-client")), "CA set aside : 3 000 $ reçus, 720 $ de côté ; seuil du petit fournisseur signalé");
    await page.check("#c-registered");
    await page.fill("#c-payment", "3,390");
    check((await text("#c-pay-sales")) === "$390.00" && (await text("#c-pay-tax")) === "$720.00" && (await text("#c-pay-sales-label")).startsWith("HST") &&
      !(await text("#c-notice")).includes("small supplier"), "CA set aside : inscrit en Ontario, TVH de 390 $ retirée d'abord, plus de message du petit fournisseur");
    await page.selectOption("#c-province", "AB");
    await page.selectOption("#c-client", "ON");
    check((await text("#c-pay-sales")) === "$390.00" && (await text("#c-pay-sales-label")).startsWith("HST"),
      "CA set aside : résident de l'Alberta, client de l'Ontario → TVH de 13 % (province du client)");
    await page.selectOption("#c-client", "BC");
    check((await text("#c-pay-sales")) === "$161.43" && (await text("#c-pay-sales-label")).startsWith("GST") && (await text("#c-notice")).includes("PST (RST in Manitoba) isn't counted"),
      "CA set aside : client en Colombie-Britannique → TPS seule (5 %), TVP signalée");
    // Service soumis à la TVP (case cochée) : 3 390 $ ÷ 1,12 → taxes de 363,21 $.
    await page.check("#c-pst");
    check((await text("#c-pay-sales")) === "$363.21" && (await text("#c-pay-sales-label")).startsWith("GST and PST") &&
      !(await text("#c-notice")).includes("isn't counted"), "CA set aside : service soumis à la TVP, client en C.-B. → TPS + TVP (12 %)");
    await page.selectOption("#c-client", "MB");
    check((await text("#c-pay-sales-label")).startsWith("GST and RST") && (await text("#c-pst-label")).includes("subject to RST"),
      "CA set aside : client au Manitoba → TVD");
    await page.uncheck("#c-pst");
    await page.selectOption("#c-client", "AB");
    check(!(await page.isVisible("#c-pst")), "CA set aside : case de la TVP masquée hors C.-B., Sask. et Man.");
    await page.selectOption("#c-client", "same");
    await page.selectOption("#c-province", "QC");
    check((await text("#c-share")) === "27%" && (await text("#c-pension-label")).includes("QPP") &&
      (await text("#c-inst-detail")).includes("$1,240 to the CRA (federal tax) and $3,591 to Revenu Québec") &&
      (await text("#c-pay-sales-label")).startsWith("GST and QST") && !(await text("#c-notice")).includes("PST"),
      "CA set aside : Québec, RRQ et RQAP, TPS et TVQ, acomptes à l'ARC et à Revenu Québec");
    await page.fill("#c-income", "2,500");
    // 2 000 $ de bénéfice par mois au Québec : impôt fédéral 559 $ et impôt du Québec 283 $, sous 1 800 $ : pas
    // d'acomptes (les cotisations RRQ et RQAP ne comptent pas dans le seuil de Revenu Québec).
    check((await text("#c-inst")) === "Not required" && (await text("#c-inst-detail")).includes("under $1,800"),
      "CA set aside : Québec, pas d'acomptes sous 1 800 $ d'impôt fédéral et d'impôt du Québec");
    await page.selectOption("#c-province", "ON");
    await page.fill("#c-income", "1,000");
    await page.fill("#c-expenses", "0");
    check((await text("#c-inst")) === "Not required" && (await text("#c-inst-detail")).includes("instalments are generally not required"),
      "CA set aside : acomptes non exigés sous 3 000 $");
    await page.fill("#c-income", "6,000");
    await page.fill("#c-expenses", "-1");
    check((await page.getAttribute("#c-expenses", "aria-invalid")) === "true" && (await text("#c-sub")).includes("Check business expenses"),
      "CA set aside : champ invalide nommé dans le résumé annoncé");
    await page.fill("#c-expenses", "500");
    await page.selectOption("#c-province", "QC");
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#c-province")) === "QC" && (await page.isChecked("#c-registered")) && (await page.inputValue("#c-client")) === "same",
      "CA set aside : saisie retrouvée après rechargement");
  },
  async "ca/fr/combien-mettre-de-cote-impot/"(page) {
    // Même calcul au Québec : impôt, RRQ et RQAP de 19 323,30 $ = 26,8 % de 72 000 $ → 27 %.
    const text = async (sel) => (await page.textContent(sel)).replace(/\s+/g, " ").trim();
    check((await text("#c-share")) === "27 %" && (await text("#c-sub")).includes("environ 1 620 $ par mois. Total de l'année : 19 323 $.") &&
      (await text("#c-inst")) === "4 831 $/trimestre" && (await text("#c-inst-detail")).includes("1 240 $ à l'ARC (impôt fédéral) et 3 591 $ à Revenu Québec") &&
      (await text("#c-inst-detail")).includes("en 2024 ou en 2025") && (await text("#c-inst-detail")).includes("15 décembre 2026"),
      "CA-FR mettre de côté : 27 % au Québec, acomptes à l'ARC et à Revenu Québec sous condition");
    await page.check("#c-registered");
    await page.fill("#c-payment", "3 449,25");
    check((await text("#c-pay-sales")) === "449,25 $" && (await text("#c-pay-tax")) === "810,00 $" && (await text("#c-pay-sales-label")).startsWith("TPS et TVQ"),
      "CA-FR mettre de côté : TPS et TVQ (449,25 $) retirées, puis 27 % du reste");
    check((await text("#c-notice")).includes("sont d'abord retirées") && (await text("#c-notice")).includes("Le solde de 2026 est dû le 30 avril 2027"),
      "CA-FR mettre de côté : taxes de vente et date du solde rappelées");
  },
  async "ca/self-employed-tax-calculator/"(page) {
    // Ontario, 80 000 $ : RPC 8 892,90 + fédéral 8 698,44 + Ontario 3 785,12 + contribution santé 750 (voir tests unitaires)
    check((await page.textContent("#r-total")).trim() === "$22,126", `CA : Ontario 80 000 $ → 22 126 $ (obtenu : ${await page.textContent("#r-total")})`);
    check((await page.textContent("#r-federal")).trim() === "$8,698" && (await page.textContent("#r-provincial")).trim() === "$4,535", "CA : fédéral 8 698 $, Ontario 4 535 $");
    await page.selectOption("#t-province", "QC");
    await page.fill("#t-profit", "60,000");
    check((await page.textContent("#r-total")).trim() === "$16,721" && await page.isVisible("#r-qpip-row"), "CA : Québec 60 000 $ → 16 721 $, RQAP affiché");
    check((await page.textContent("#r-inst")).includes("Revenu Québec"), "CA : acomptes ARC et Revenu Québec");
    await page.selectOption("#t-province", "AB");
    await page.fill("#t-profit", "50,000");
    check((await page.textContent("#r-total")).trim() === "$11,191", "CA : Alberta 50 000 $ → 11 191 $");
    await page.selectOption("#t-province", "ON");
    await page.fill("#t-profit", "80,000");
  },
  async "ca/sole-proprietor-vs-corporation/"(page) {
    // Valeurs des tests unitaires (tests/unit/structure-ca.test.mjs).
    const t = async (id) => (await page.textContent(`#${id}`)).replace(/\s+/g, " ").trim();
    check((await t("c-verdict")) === "+$6,836 a year" && (await t("c-p-receive")) === "$71,662" && (await t("c-s-receive")) === "$78,498" &&
      (await t("c-s-corptax")) === "$11,696" && (await t("c-s-dividends")) === "$88,304" && (await t("c-p-contrib")) === "$9,293" && (await t("c-s-contrib")) === "$0",
      "CA société : Ontario, 100 000 $ en dividendes → +6 836 $ par an");
    check((await t("c-sub")) === "You'd have $6,836 more after tax than as a sole proprietor, with all the profit paid out to you. That's $9,293 less in CPP contributions (a smaller pension) and $2,457 more in taxes and costs." &&
      (await t("c-notice")).includes("you'd pay $9,293 less in CPP contributions") && !(await page.isVisible("#c-hours-field")) && !(await page.isVisible("#c-other-row")),
      "CA société : RPC non versé signalé, case des 5 500 heures masquée hors Québec");
    const sources = (await page.textContent("section.sources")).replace(/\s+/g, " ");
    check(sources.includes("B.C. basic personal income tax credits") && sources.includes("Yukon-specific income tax measures") &&
      sources.includes("What's new for corporations"), "CA société : sources de chaque province listées (règles à plusieurs sources)");
    await page.fill("#c-profit", "150,000");
    await page.fill("#c-salary", "60,000");
    await page.fill("#c-keep", "30,000");
    check((await t("c-verdict")) === "+$12,273 a year" && (await t("c-sub")).includes("counting the $30,000 left in the corporation") &&
      (await t("c-sub")).includes("The personal tax of $10,597 on that amount is only deferred") &&
      (await t("c-sub")).includes("All paid out, you'd have $1,676 more than as a sole proprietor: $2,569 less in CPP contributions (a smaller pension) and $893 more in taxes and costs.") &&
      (await t("c-s-keep")) === "$30,000", "CA société : 30 000 $ laissés → impôt reporté de 10 597 $, +1 676 $ si tout est versé");
    await page.fill("#c-profit", "100,000");
    await page.fill("#c-salary", "");
    await page.fill("#c-keep", "90,000");
    check((await t("c-verdict")) === "–" && (await t("c-notice")).includes("You can leave at most $88,304") && (await t("c-s-receive")) === "–" &&
      (await t("c-p-receive")) === "$71,662", "CA société : montant laissé trop grand → refus, entreprise individuelle affichée");
    await page.fill("#c-keep", "");
    await page.fill("#c-profit", "");
    check((await t("c-verdict")) === "–" && (await t("c-sub")) === "Enter your business profit." && (await t("c-p-receive")) === "–",
      "CA société : bénéfice vide → invitation à le saisir, aucun résultat");
    await page.fill("#c-profit", "100,000");
    await page.selectOption("#c-province", "SK");
    check((await t("c-verdict")) === "–" && (await t("c-notice")).includes("isn't available yet for Saskatchewan") && (await t("c-p-receive")) !== "–",
      "CA société : Saskatchewan non calculée, message");
    await page.selectOption("#c-province", "NT");
    await page.fill("#c-salary", "50,000");
    check(await page.isVisible("#c-other-row") && (await t("c-other-label")) === "NWT payroll tax" && (await t("c-s-other")) === "$1,000" && (await t("c-s-contrib")) === "$5,534",
      "CA société : T.N.-O., impôt de 2 % sur le salaire");
    await page.selectOption("#c-province", "QC");
    await page.fill("#c-profit", "120,000");
    check(await page.isVisible("#c-hours-field") && (await t("c-contrib-label")) === "QPP and QPIP (both halves)" && (await t("c-verdict")) === "−$1,986 a year" &&
      (await t("c-other-label")) === "Health Services Fund (employer)" && (await t("c-s-other")) === "$825" && (await t("c-s-contrib")) === "$6,375" &&
      (await t("c-notice")).includes("Without 5,500 paid hours a year") && (await t("c-notice")).includes("Health Services Fund contribution of individuals isn't included"),
      "CA société : Québec, salaire de 50 000 $, RRQ, RQAP et FSS");
    await accessible(page, "CA société (Québec, salaire)");
    await page.fill("#c-salary", "130,000");
    check((await t("c-verdict")) === "–" && (await t("c-notice")).includes("Lower the salary"), "CA société : salaire supérieur au bénéfice → refus expliqué");
    await page.fill("#c-salary", "abc");
    check((await page.getAttribute("#c-salary", "aria-invalid")) === "true" && (await t("c-verdict")) === "–" && (await t("c-p-receive")) === "–" &&
      (await t("c-notice")).includes("Check the salary"), "CA société : saisie illisible → aucun résultat, champ signalé");
    await page.fill("#c-salary", "50,000");
    await page.check("#c-hours");
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#c-province")) === "QC" && await page.isChecked("#c-hours") && (await page.inputValue("#c-salary")) === "50,000",
      "CA société : saisie mémorisée après rechargement");
    await page.uncheck("#c-hours");
    await page.fill("#c-salary", "");
    await page.fill("#c-profit", "100,000");
    await page.selectOption("#c-province", "ON");
    check((await t("c-verdict")) === "+$6,836 a year", "CA société : situation par défaut rétablie");
  },
  async "ca/fr/entreprise-individuelle-ou-societe/"(page) {
    const t = async (id) => (await page.textContent(`#${id}`)).replace(/\s+/g, " ").trim();
    check((await t("c-verdict")) === "+110 $ par an" && (await t("c-s-corptax")) === "20 500 $" && (await t("c-p-receive")) === "66 860 $" &&
      (await t("c-s-receive")) === "66 970 $" && (await t("c-contrib-label")) === "RRQ et RQAP (les deux parts)",
      "CA-FR société : Québec, 100 000 $ en dividendes, taux général → +110 $ par an");
    check((await t("c-sub")).endsWith("Soit 10 555 $ de cotisations au RRQ et au RQAP en moins (rente plus faible et moins d'assurance parentale) et 10 445 $ d'impôts et de frais en plus."),
      "CA-FR société : écart décomposé (cotisations non versées, impôts et frais)");
    check((await t("c-notice")).includes("Sans salaire, vous paieriez 10 555 $ de cotisations au RRQ et au RQAP de moins qu'en entreprise individuelle et n'acquerriez ni rente du RRQ ni protection du RQAP pour l'année.") &&
      (await t("c-notice")).includes("Sans 5 500 heures rémunérées par an") &&
      await page.isVisible("#c-hours-field"), "CA-FR société : RRQ et RQAP non versés et règle des 5 500 heures signalés");
    await page.check("#c-hours");
    check((await t("c-verdict")) === "+6 009 $ par an" && (await t("c-s-corptax")) === "12 200 $" && !(await t("c-notice")).includes("Sans 5 500 heures"),
      "CA-FR société : 5 500 heures → taux réduit, +6 009 $ par an");
    await page.uncheck("#c-hours");
    await page.selectOption("#c-province", "NU");
    check((await t("c-verdict")) === "–" && (await t("c-notice")).includes("pas encore offerte au Nunavut"), "CA-FR société : Nunavut non calculé, message");
    await page.selectOption("#c-province", "QC");
    check((await t("c-verdict")) === "+110 $ par an", "CA-FR société : situation par défaut rétablie");
  },
  async "fr/convertisseur-tjm/"(page) {
    // documentation/18-outils-de-prix.md : 450 € par jour, 7 h, 148 jours → 66 600 € par an.
    const t = async (id) => (await page.textContent(`#${id}`)).replace(/\s+/g, " ").trim();
    check((await t("rc-big")) === "66 600 €" && (await t("rc-hour")) === "64,29 €" && (await t("rc-day")) === "450,00 €" && (await t("rc-week")) === "2 250 €" &&
      (await t("rc-month")) === "5 550 €" && (await t("rc-sub")) === "Soit 5 550 € par mois en moyenne, pour 148 jours facturés de 7 h (1 036 heures par an).",
      "Convertisseur FR : TJM de 450 € → 66 600 € par an");
    check((await page.getAttribute("#rc-day", "class")) === null && (await page.$eval("#rc-day", (td) => td.parentNode.className)) === "current" &&
      (await t("rc-notice")).includes("au-dessus du seuil de franchise de TVA des prestations de services (37 500 € par an)") &&
      (await t("rc-notice")).includes("dès le dépassement de 41 250 €") && !(await t("rc-notice")).includes("régime micro"),
      "Convertisseur FR : ligne saisie mise en avant, seuil de TVA signalé, pas le plafond micro");
    await page.fill("#rc-amount", "600");
    check((await t("rc-big")) === "88 800 €" && (await t("rc-notice")).includes("plafond du régime micro-entrepreneur pour les prestations de services (83 600 € par an)"),
      "Convertisseur FR : 600 € par jour → plafond micro signalé");
    await page.selectOption("#rc-unit", "month");
    await page.fill("#rc-amount", "5 550");
    check((await t("rc-day")) === "450,00 €" && (await page.$eval("#rc-month", (td) => td.parentNode.className)) === "current", "Convertisseur FR : 5 550 € par mois → TJM de 450 €");
    await page.fill("#rc-hours", "0");
    check((await t("rc-big")) === "–" && (await page.getAttribute("#rc-hours", "aria-invalid")) === "true" && (await t("rc-notice")).includes("entre 0 et 24 heures"),
      "Convertisseur FR : 0 heure par jour → refus expliqué, champ signalé");
    await page.fill("#rc-hours", "7");
    await page.fill("#rc-amount", "abc");
    check((await page.getAttribute("#rc-amount", "aria-invalid")) === "true" && (await t("rc-big")) === "–" && (await t("rc-notice")).includes("Vérifiez : montant"),
      "Convertisseur FR : saisie illisible → aucun résultat");
    await accessible(page, "Convertisseur FR (saisie illisible)");
    await page.fill("#rc-amount", "");
    check((await t("rc-sub")) === "Indiquez un tarif." && (await t("rc-hour")) === "–", "Convertisseur FR : montant vide → invitation à le saisir");
    await page.fill("#rc-amount", "5 550");
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#rc-unit")) === "month" && (await t("rc-day")) === "450,00 €", "Convertisseur FR : saisie mémorisée après rechargement");
    await page.selectOption("#rc-unit", "day");
    await page.fill("#rc-amount", "450");
    check((await t("rc-big")) === "66 600 €", "Convertisseur FR : situation par défaut rétablie");
  },
  async "us/rate-converter/"(page) {
    const t = async (id) => (await page.textContent(`#${id}`)).replace(/\s+/g, " ").trim();
    check((await t("rc-big")) === "$128,800" && (await t("rc-hour")) === "$100.00" && (await t("rc-day")) === "$800.00" && (await t("rc-week")) === "$4,000" &&
      (await t("rc-month")) === "$10,733" && (await t("rc-sub")).includes("161 billed days of 8 hours (1,288 hours a year)") &&
      (await t("rc-notice")) === "What you bill isn't what you earn: expenses, self-employment tax and income tax come out of it.",
      "Converter US : 100 $ de l'heure → 128 800 $ par an, pas de seuil");
    await page.selectOption("#rc-unit", "year");
    await page.fill("#rc-amount", "96,600");
    check((await t("rc-hour")) === "$75.00", "Converter US : 96 600 $ par an → 75 $ de l'heure");
    await page.selectOption("#rc-unit", "hour");
    await page.fill("#rc-amount", "100");
  },
  async "uk/rate-converter/"(page) {
    const t = async (id) => (await page.textContent(`#${id}`)).replace(/\s+/g, " ").trim();
    check((await t("rc-big")) === "£72,800" && (await t("rc-hour")) === "£53.33" && (await t("rc-notice")).includes("Making Tax Digital for Income Tax applies") &&
      !(await t("rc-notice")).includes("VAT registration threshold"), "Converter UK : 400 £ par jour → 72 800 £, MTD signalé");
    await page.fill("#rc-amount", "500");
    check((await t("rc-big")) === "£91,000" && (await t("rc-notice")).includes("VAT registration threshold (£90,000"), "Converter UK : 500 £ par jour → seuil de TVA signalé");
    await page.fill("#rc-amount", "400");
  },
  async "ca/rate-converter/"(page) {
    const t = async (id) => (await page.textContent(`#${id}`)).replace(/\s+/g, " ").trim();
    check((await t("rc-big")) === "$128,800" && (await t("rc-notice")).includes("no longer a small supplier") && (await t("rc-notice")).includes("Amounts before GST/HST"),
      "Converter CA : 100 $ de l'heure → 128 800 $, petit fournisseur signalé");
  },
  async "ca/fr/convertisseur-de-tarifs/"(page) {
    const t = async (id) => (await page.textContent(`#${id}`)).replace(/\s+/g, " ").trim();
    check((await t("rc-big")) === "129 600 $" && (await t("rc-hour")) === "100,00 $" && (await t("rc-sub")).includes("162 jours facturés de 8 h (1 296 heures par an)") &&
      (await t("rc-notice")).includes("vous n'êtes plus un petit fournisseur"), "Convertisseur CA-FR : 100 $ de l'heure → 129 600 $, petit fournisseur signalé");
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
    await page.selectOption("#iv-tax-rate", "zero");
    text = await page.textContent("#iv-preview");
    check(text.includes("GST/HST (0%)") && text.includes("$2,251.50"), "facture CA : exportation détaxée → TPS/TVH à 0 %");
    await page.selectOption("#iv-tax-rate", "zero-qc");
    text = await page.textContent("#iv-preview");
    check(text.includes("GST (0%)") && text.includes("QST (0%)") && text.includes("$2,251.50"), "facture CA : exportation détaxée (Québec) → TPS et TVQ à 0 %");
    await page.selectOption("#iv-tax-rate", "QC");
    text = await page.textContent("#iv-preview");
    check(text.includes("GST (5%)") && text.includes("$112.58") && text.includes("QST (9.975%)") && text.includes("$224.59") && text.includes("$2,588.67"), "facture CA : TPS + TVQ sur deux lignes");
    await page.selectOption("#iv-tax-rate", "none");
    check(!(await page.textContent("#iv-preview")).includes("GST ("), "facture CA : petit fournisseur sans taxe");
    await page.selectOption("#iv-tax-rate", "ON");
  },
  async "ca/invoice-requirements/"(page) {
    const visible = () => page.$$eval("#checklist li", (lis) => lis.filter((li) => !li.hidden && li.offsetParent !== null).map((li) => li.textContent));
    const score = () => page.textContent("#cl-score");
    const msg = () => page.textContent("#cl-msg");
    const tickAll = async () => { for (const box of await page.$$("#checklist li:not([hidden]) input")) await box.check(); };
    let items = await visible();
    check(items.length === 8 && (await score()) === "0 of 8 details" && items.some((t) => t.includes("GST/HST registration number")) &&
      items.some((t) => t.includes("terms of payment")) && !items.some((t) => /QST registration|in French/.test(t)),
      "liste CA : 8 mentions à 500 $ ou plus, inscrit, hors Québec");
    check((await msg()) === "Tick the details your invoice shows." && !(await page.isVisible("text=Not registered for GST/HST?")),
      "liste CA : message de départ, pas de rappel du petit fournisseur");
    await tickAll();
    check((await score()) === "8 of 8 details" && (await msg()).startsWith("All set"), "liste CA : toutes les mentions cochées");
    await page.click('label:has(input[value="100to499"])');
    items = await visible();
    check(items.length === 5 && (await score()) === "5 of 5 details" && !items.some((t) => t.includes("terms of payment")),
      "liste CA : 100 $ à 499,99 $ → 5 mentions (sans client, modalités ni description)");
    await page.click('label:has(input[value="under100"])');
    items = await visible();
    check(items.length === 3 && (await score()) === "3 of 3 details" && !items.some((t) => t.includes("registration number")),
      "liste CA : moins de 100 $ → nom, date et total");
    await page.click('label:has(input[name="quebec"])');
    items = await visible();
    check(items.length === 4 && items.some((t) => t.includes("in French")) && !items.some((t) => t.includes("QST registration")) &&
      (await score()) === "3 of 4 details" && (await msg()) === "1 detail missing: add it before you send your invoice." &&
      await page.isVisible("text=Under $500 in Quebec"), "liste CA : Québec sous 100 $ → français, pas de numéro de TVQ, renvoi à Revenu Québec");
    await accessible(page, "liste CA (renvoi à Revenu Québec affiché)");
    const fr = await page.getAttribute("#checklist a[hreflang=fr-CA]", "href");
    check(fr.endsWith("/ca/fr/generateur-facture/") && (await page.request.get(`http://127.0.0.1:${port}${fr}`)).status() === 200,
      "liste CA : lien vers le générateur de facture en français");
    await page.click('label:has(input[value="500plus"])');
    items = await visible();
    check(items.length === 10 && items.some((t) => t.includes("QST registration number")) && (await score()) === "8 of 10 details" &&
      !(await page.isVisible("text=Under $500 in Quebec")), "liste CA : Québec à 500 $ ou plus → 10 mentions, numéro de TVQ");
    check((await msg()) === "2 details missing: add them before you send your invoice.", "liste CA : 2 mentions manquantes (pluriel)");
    await page.click('label:has(input[name="gst"])');
    items = await visible();
    check(items.length === 4 && !items.some((t) => /registration number|tax charged|terms of payment/.test(t)) &&
      await page.isVisible("text=Not registered for GST/HST?") && !(await page.isVisible("text=Under $500 in Quebec")),
      "liste CA : non inscrit → nom, date, total et français (Québec), rappel du petit fournisseur");
    await page.click('label:has(input[value="100to499"])');
    check(!(await page.isVisible("text=Under $500 in Quebec")), "liste CA : pas de renvoi à Revenu Québec sans inscription");
    await accessible(page, "liste CA (rappel du petit fournisseur affiché)");
    await page.click('label:has(input[value="500plus"])');
    await page.focus('input[name="amount"][value="500plus"]');
    await page.keyboard.press("ArrowLeft");
    check(await page.isChecked('input[name="amount"][value="100to499"]'), "liste CA : palier changé au clavier (flèches)");
    await page.reload({ waitUntil: "networkidle" });
    check(await page.isChecked('input[name="amount"][value="100to499"]') && !(await page.isChecked('input[name="gst"]')) &&
      await page.isChecked('input[name="quebec"]') && (await score()) === "0 of 4 details", "liste CA : situation mémorisée après rechargement");
    await page.click('label:has(input[value="500plus"])');
    await page.click('label:has(input[name="gst"])');
    await page.click('label:has(input[name="quebec"])');
    check((await score()) === "0 of 8 details", "liste CA : retour à la situation par défaut");
  },
  async "ca/fr/mentions-facture/"(page) {
    const text = async (sel) => (await page.textContent(sel)).replace(/[\u00a0\u202f]/g, " ");
    const visible = () => page.$$eval("#checklist li", (lis) => lis.filter((li) => !li.hidden && li.offsetParent !== null).length);
    check((await visible()) === 8 && (await text("#cl-score")) === "0 sur 8 mentions" && (await text("#cl-msg")) === "Cochez les mentions présentes sur votre facture.",
      "liste CA-FR : 8 mentions par défaut, message de départ");
    await page.click('label:has(input[name="quebec"])');
    check((await visible()) === 10 && await page.isVisible("#checklist >> text=rédigée en français"), "liste CA-FR : Québec → 10 mentions, dont le français");
    for (const box of await page.$$("#checklist li:not([hidden]) input")) await box.check();
    check((await text("#cl-score")) === "10 sur 10 mentions" && (await text("#cl-msg")).startsWith("C'est complet"), "liste CA-FR : toutes les mentions cochées");
    await page.uncheck("#checklist li:not([hidden]) input >> nth=0");
    check((await text("#cl-msg")) === "Il manque 1 mention : ajoutez-la avant d'envoyer votre facture.", "liste CA-FR : une mention manquante (singulier)");
    await page.click('label:has(input[value="under100"])');
    check((await visible()) === 4 && await page.isVisible("text=Moins de 500 $ au Québec"), "liste CA-FR : moins de 100 $ au Québec → 4 mentions, renvoi à Revenu Québec");
    await page.click('label:has(input[value="500plus"])');
    await page.click('label:has(input[name="quebec"])');
  },
  async "ca/invoicing-clients-outside-canada/"(page) {
    const verdict = () => page.textContent("#x-verdict");
    const why = () => page.textContent("#x-why");
    const items = (id) => page.$$eval(`#${id} li`, (lis) => lis.map((li) => li.textContent));
    check((await verdict()) === "No sales tax" && (await why()).includes("consulting or professional service supplied to a non-resident is zero-rated") &&
      (await items("x-actions")).some((t) => t.includes("Zero-rated exports still count towards the $30,000")),
      "client étranger CA : non inscrit, conseil à un non-résident → pas de taxe, mais l'exportation compte dans le seuil");
    await page.selectOption("#x-registered", "yes");
    check((await verdict()) === "Zero-rated: 0%" && (await why()).includes("litigation in Canada") && (await items("x-wording"))[0].includes("“Zero-rated export”") &&
      (await items("x-actions")).some((t) => t.includes("quick method")), "client étranger CA : inscrit, conseil → détaxé, litige rappelé, méthodes ordinaire et rapide");
    await page.check("#x-present");
    check((await verdict()) === "It depends" && (await why()).includes("memorandum 4.5.3"), "client étranger CA : conseil rendu au Canada → pas de verdict ferme");
    await page.selectOption("#x-service", "other");
    check((await verdict()) === "Charge GST/HST" && (await why()).includes("isn't zero-rated"), "client étranger CA : autre service à un particulier au Canada → taxable");
    await page.check("#x-quebec");
    check((await why()).includes("the QST also applies when the service is supplied in Quebec"), "client étranger CA : taxable au Québec → TVQ rappelée");
    await page.uncheck("#x-present");
    check((await verdict()) === "Zero-rated: 0%" && (await why()).includes("for the QST too") && (await items("x-wording"))[0].includes("“Zero-rated export (Quebec)”"),
      "client étranger CA : Québec → TPS et TVQ détaxées");
    await page.selectOption("#x-service", "ip");
    check((await verdict()) === "It depends" && (await why()).includes("GI-034") && !(await page.isVisible("#x-present")), "client étranger CA : propriété intellectuelle → règles propres, sans verdict");
    await page.selectOption("#x-service", "property");
    check((await verdict()) === "Charge GST/HST" && (await why()).includes("real property") && !(await page.isVisible("#x-present")),
      "client étranger CA : service lié à un immeuble au Canada → taxable, question de présence masquée");
    await page.selectOption("#x-location", "canada");
    check((await verdict()) === "Charge GST/HST" && (await why()).includes("your client's province") && !(await page.isVisible("#x-service")),
      "client étranger CA : client résident → taux de la province du client");
    await accessible(page, "client étranger CA (client résident)");
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#x-location")) === "canada" && await page.isChecked("#x-quebec"), "client étranger CA : situation mémorisée après rechargement");
    // Retour à la situation par défaut pour les formats suivants.
    await page.selectOption("#x-location", "abroad");
    await page.selectOption("#x-service", "professional");
    await page.selectOption("#x-registered", "no");
    await page.uncheck("#x-quebec");
    check((await verdict()) === "No sales tax", "client étranger CA : situation par défaut rétablie");
  },
  async "ca/fr/facturer-client-etranger/"(page) {
    const text = async (sel) => (await page.textContent(sel)).replace(/[\u00a0\u202f]/g, " ");
    check((await text("#x-verdict")) === "Aucune taxe de vente" && (await text("#x-actions")).includes("comptent quand même dans le seuil de 30 000 $"),
      "client étranger CA-FR : non inscrit → pas de taxe, seuil");
    await page.selectOption("#x-registered", "yes");
    await page.check("#x-quebec");
    check((await text("#x-verdict")) === "Détaxé : 0 %" && (await text("#x-wording")).includes("La TPS et la TVQ à 0 %") && (await text("#x-actions")).includes("méthode rapide"),
      "client étranger CA-FR : inscrit au Québec → TPS et TVQ détaxées, déclaration");
    await page.selectOption("#x-service", "other");
    await page.check("#x-present");
    check((await text("#x-verdict")) === "Facturez la TPS/TVH" && (await text("#x-why")).includes("la TVQ s'applique aussi"), "client étranger CA-FR : particulier au Canada → taxable, TVQ rappelée");
    await page.selectOption("#x-service", "property");
    check(!(await page.isVisible("#x-present")) && (await text("#x-why")).includes("immeuble"), "client étranger CA-FR : immeuble au Canada → taxable, question masquée");
    await page.selectOption("#x-location", "canada");
    check(!(await page.isVisible("#x-service")) && (await text("#x-why")).includes("résident du Canada"), "client étranger CA-FR : client résident → champs masqués");
    await page.selectOption("#x-location", "abroad");
    await page.selectOption("#x-service", "professional");
    await page.uncheck("#x-present");
    await page.selectOption("#x-registered", "no");
    await page.uncheck("#x-quebec");
    check((await text("#x-verdict")) === "Aucune taxe de vente", "client étranger CA-FR : situation par défaut rétablie");
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
    check(total === "16721$", `CA-FR : Québec 60 000 $ → 16 721 $ (obtenu : ${total})`);
    check((await page.textContent("#r-pension-label")).includes("RRQ"), "CA-FR : libellé RRQ");
    // Détail : part déductible du RQAP (200 $), déduction pour travailleur plafonnée (1 450 $), revenu imposable au
    // Québec 54 225 $, montant personnel de base du Québec (14 % × 18 952 $ = 2 653 $).
    const steps = (await page.textContent("#r-steps")).replace(/\s/g, "");
    check(steps.includes("PartiedéductibleduRQAP−200$") && steps.includes("Déductionpourtravailleur(Québec)−1450$") &&
      steps.includes("RevenuimposableauQuébec54225$") && steps.includes("MontantpersonneldebaseduQuébec−2653$"),
      "CA-FR : détail du calcul québécois (RQAP déductible, déduction pour travailleur, aucun crédit RRQ au Québec)");
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
    check((await page.textContent("#c-e-net")).replace(/\s/g, "") === "27520€", "statuts : EURL à l'IS, rémunération 50 % → 27 520 € (moteur testé)");
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
  async "fr/contrat-de-prestation/"(page) {
    await page.fill("#k-p-name", "Camille Martin EI");
    await page.fill("#k-c-name", "Studio Nova");
    await page.fill("#k-scope", "Refonte du site vitrine");
    await page.fill("#k-price", "4500");
    let text = (await page.textContent("#k-preview")).replace(/\s/g, " ");
    check(/prix forfaitaire de 4\s?500,00\s?€/.test(text) && text.includes("TVA non applicable"), "contrat FR : forfait de 4 500 € en franchise de TVA");
    check(/acompte de 30 % du prix, soit 1\s?350,00\s?€/.test(text), "contrat FR : acompte de 30 % = 1 350 €");
    check(text.includes("Article 1 – Objet") && text.includes("cède au Client, à titre exclusif"), "contrat FR : articles numérotés et cession de droits");
    await page.selectOption("#k-price-type", "daily");
    await page.fill("#k-price", "500");
    await page.fill("#k-qty", "10");
    text = (await page.textContent("#k-preview")).replace(/\s/g, " ");
    check(/estimé à 10 jours, soit 5\s?000,00\s?€/.test(text), "contrat FR : TJM 500 € × 10 jours = 5 000 €");
    await page.uncheck("#k-ip");
    await page.check("#k-nonsolicit");
    text = await page.textContent("#k-preview");
    check(text.includes("reste titulaire des droits") && text.includes("Non-sollicitation"), "contrat FR : licence au lieu de cession, clause de non-sollicitation");
    const [download] = await Promise.all([page.waitForEvent("download"), page.click("#k-word")]);
    const doc = (await import("fs")).readFileSync(await download.path(), "utf8");
    check(download.suggestedFilename() === "Contrat de prestation.doc" && doc.includes("CONTRAT DE PRESTATION DE SERVICES"), "contrat FR : téléchargement Word");
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#k-c-name")) === "Studio Nova" && !(await page.isChecked("#k-ip")), "contrat FR : saisie mémorisée");
    await page.click("#k-copy");
    check(await copied(page, "#k-copy"), "contrat FR : bouton Copier");
    await page.selectOption("#k-price-type", "fixed");
    await page.check("#k-ip");
    await page.uncheck("#k-nonsolicit");
  },
  async "us/freelance-contract/"(page) {
    await page.fill("#k-price", "4,500");
    const text = await page.textContent("#k-preview");
    check(text.includes("INDEPENDENT CONTRACTOR AGREEMENT") && text.includes("fixed fee of $4,500.00") && text.includes("$1,350.00"), "US contract: fixed fee and 30% deposit");
    check(text.includes("Freelance Isn't Free Act") && text.includes("State of New York") && text.includes("1.5% per month"), "US contract: freelance law clause, governing law, late fee");
  },
  async "uk/freelance-contract/"(page) {
    await page.selectOption("#k-vat", "vat");
    await page.selectOption("#k-law", "SC");
    const text = await page.textContent("#k-preview");
    check(text.includes("exclusive of VAT") && text.includes("law of Scotland") && text.includes("Late Payment of Commercial Debts"), "UK contract: VAT, Scottish law, Late Payment Act");
    await page.selectOption("#k-vat", "novat");
    await page.selectOption("#k-law", "EW");
  },
  async "ca/freelance-contract/"(page) {
    let text = await page.textContent("#k-preview");
    check(text.includes("laws in force in Ontario") && text.includes("12% per year") && text.includes("moral rights"), "CA contract: Ontario law, yearly interest, moral rights waiver");
    await page.selectOption("#k-law", "QC");
    text = await page.textContent("#k-preview");
    check(text.includes("Civil Code of Québec"), "CA contract: Quebec termination rules");
    await page.selectOption("#k-law", "ON");
  },
  async "ca/fr/contrat-de-service/"(page) {
    let text = await page.textContent("#k-preview");
    check(text.includes("articles 2125 à 2129") && text.includes("lois en vigueur au Québec"), "contrat CA-FR : Code civil du Québec par défaut");
    await page.selectOption("#k-law", "ON");
    text = await page.textContent("#k-preview");
    check(text.includes("lois en vigueur en Ontario") && !text.includes("articles 2125"), "contrat CA-FR : droit de l'Ontario");
    await page.selectOption("#k-law", "QC");
  },
  async "us/how-much-to-set-aside-for-taxes/"(page) {
    // $7,000/mo − $500 expenses: profit $78,000, tax $16,186 = 19.3% of revenue → 20% (see engine tests)
    check((await page.textContent("#s-share")).trim() === "20%", "set aside: 20% of every payment at $7,000/month");
    check((await page.textContent("#s-pay-tax")).trim() === "$500.00" && (await page.textContent("#s-pay-keep")).trim() === "$2,000.00", "set aside: $2,500 payment → $500 to savings");
    check((await page.$$eval("#s-levels tr", (r) => r.length)) === 6 && (await page.$$eval("#s-levels tr.current", (r) => r.length)) === 1, "set aside: table by profit with current row");
  },
  async "us/1099-nec-w9-guide/"(page) {
    check((await page.textContent("#n-answer")).includes("Yes") && (await page.textContent("#n-due")).trim() === "February 1, 2027", "1099 checker: $3,500 to an individual → file by February 1, 2027");
    await page.fill("#n-paid", "1,500");
    check((await page.textContent("#n-answer")).includes("No"), "1099 checker: $1,500 is below the $2,000 threshold");
    await page.fill("#n-paid", "3,500");
    await page.selectOption("#n-method", "card");
    check((await page.textContent("#n-sub")).includes("1099-K"), "1099 checker: card payments go on 1099-K");
    await page.selectOption("#n-method", "direct");
    await page.uncheck("#n-w9");
    check((await page.textContent("#n-notice")).includes("24%"), "1099 checker: backup withholding warning without W-9");
    await page.check("#n-w9");
  },
  async "us/freelance-isnt-free-act/"(page) {
    check((await page.textContent("#l-answer")).includes("required") && (await page.$$eval(".law-card", (c) => c.length)) === 2, "freelance law: NYC $1,200 → contract required, city and state laws");
    await page.selectOption("#l-place", "il");
    await page.fill("#l-value", "400");
    check((await page.textContent("#l-answer")).startsWith("Not required"), "freelance law: Illinois $400 → below $500");
    await page.fill("#l-prior", "200");
    check((await page.textContent("#l-answer")).startsWith("Written contract required"), "freelance law: Illinois 120-day aggregation");
    await page.selectOption("#l-place", "other");
    check((await page.textContent("#l-answer")).includes("No freelance law"), "freelance law: elsewhere → no specific law");
    await page.selectOption("#l-place", "nyc");
    await page.fill("#l-value", "1,200");
    await page.fill("#l-prior", "");
  },
  async "fr/simulateur-per-independant/"(page) {
    // Micro BNC, 60 000 € : 39 600 € imposables, plafond 4 710 €, 4 000 € versés à 30 %
    check((await page.textContent("#p-saving")).replace(/\s/g, "") === "1200€" && (await page.textContent("#p-ceiling")).replace(/\s/g, "") === "4710€", "PER : micro BNC 60 000 €, 4 000 € versés → 1 200 € d'impôt en moins, plafond 4 710 €");
    await page.selectOption("#p-regime", "real");
    check((await page.textContent("#p-ceiling")).replace(/\s/g, "") === "7791€", "PER : réel, bénéfice de 60 000 € → plafond TNS 7 791 €");
    await page.selectOption("#p-regime", "micro");
    await page.check("#p-vl");
    check((await page.textContent("#p-saving")).replace(/\s/g, "") === "0€", "PER : versement libératoire → pas d'économie sur l'activité");
    await page.uncheck("#p-vl");
  },
  async "us/sep-ira-vs-solo-401k-calculator/"(page) {
    check((await page.textContent("#u-sep-max")).trim() === "$18,587" && (await page.textContent("#u-solo-max")).trim() === "$43,087", "retirement: $100k profit → SEP $18,587, solo 401(k) $43,087");
    check((await page.textContent("#u-solo-tax")).trim() === "$5,243", "retirement: tax saved at the solo 401(k) maximum (engine)");
    await page.selectOption("#u-age", "60");
    check((await page.textContent("#u-solo-max")).trim() === "$54,337", "retirement: ages 60-63 catch-up $11,250");
    await page.selectOption("#u-age", "under50");
  },
  async "uk/pension-tax-relief-calculator/"(page) {
    check((await page.textContent("#p-gross")).trim() === "£10,000" && (await page.textContent("#p-extra")).trim() === "£1,946", "pension: £8,000 net → £10,000 gross, £1,946 higher-rate relief at £60k");
    check((await page.textContent("#p-cost")).trim() === "£6,054", "pension: real cost £6,054");
  },
  async "ca/rrsp-calculator/"(page) {
    check((await page.textContent("#v-room")).trim() === "$14,400" && (await page.textContent("#v-refund")).trim() === "$3,115", "RRSP: Ontario $80k → room $14,400, $10,000 saves $3,115");
    await page.fill("#v-amount", "20,000");
    check((await page.getAttribute("#v-notice", "class")).includes("warn"), "RRSP: warning above room");
    await page.fill("#v-amount", "10,000");
  },
  async "ca/fr/calculateur-reer/"(page) {
    check((await page.textContent("#v-refund")).replace(/\s/g, "") === "3612$" && (await page.textContent("#v-deadline")).trim() === "1er mars 2027", "REER : Québec 80 000 $, 10 000 $ → 3 612 $ ; date limite 1er mars 2027");
  },
  async "fr/facturer-client-etranger/"(page) {
    const res = async () => [await page.textContent("#i-verdict"), await page.textContent("#i-mentions"), await page.textContent("#i-obligations")];
    let [v, m, o] = await res();
    check(v.includes("Autoliquidation") && m.includes("art. 196") && o.includes("DES") && o.includes("numéro de TVA intracommunautaire"), "client étranger : entreprise de l'UE → autoliquidation, DES, numéro de TVA (franchise)");
    await page.selectOption("#i-country", "world");
    [v, m] = await res();
    check(v.includes("Pas de TVA") && m.includes("art. 44"), "client étranger : entreprise hors UE → hors champ (art. 44)");
    await page.selectOption("#i-client", "private");
    [v, m] = await res();
    check(m.includes("art. 59"), "client étranger : particulier hors UE, service immatériel → art. 59");
    await page.selectOption("#i-country", "eu");
    await page.selectOption("#i-service", "digital");
    await page.selectOption("#i-oss", "over");
    [v] = await res();
    check(v.includes("OSS"), "client étranger : services numériques > 10 000 € → guichet OSS");
    await page.selectOption("#i-country", "fr");
    [v, m] = await res();
    check(v.includes("franchise") && m.includes("TVA non applicable, art."), "client étranger : client en France, franchise");
    // Remise à zéro dans l'ordre où les champs redeviennent visibles.
    await page.selectOption("#i-country", "eu");
    await page.selectOption("#i-oss", "under");
    await page.selectOption("#i-service", "intangible");
    await page.selectOption("#i-client", "pro");
  },
  async "fr/combien-mettre-de-cote-auto-entrepreneur/"(page) {
    // Calculateur « combien mettre de côté » (documentation/15-guides-gestion.md, § 4) : montants calculés à la main.
    const text = async (sel) => (await page.textContent(sel)).replace(/\s+/g, " ").trim();
    const total = () => text("#sa-total");
    check((await total()) === "387,00 €" && (await text("#sa-sub")).includes("25,8 % du paiement, sans l'impôt sur le revenu") &&
      (await text("#sa-notice")).includes("Base de l'acompte pour ce paiement : 990,00 €"),
      "mettre de côté : 1 500 € en libéral, cotisations 384 € et formation 3 €, base de l'acompte 990 €");
    await page.fill("#sa-pas", "7,5");
    check((await total()) === "461,25 €" && (await text("#sa-r-tax")) === "74,25 €" && (await text("#sa-r-keep")) === "1 038,75 €",
      "mettre de côté : impôt estimé au taux du foyer de 7,5 % (74,25 €)");
    await page.selectOption("#sa-vat", "normal");
    await page.fill("#sa-amount", "1 800");
    check((await text("#sa-r-vat")) === "300,00 €" && (await text("#sa-r-cotis")) === "384,00 €" && (await total()) === "761,25 €" &&
      (await text("#sa-notice")).includes("pas à l'Urssaf"), "mettre de côté : 1 800 € TTC, TVA de 300 € reversée, cotisations sur 1 500 € HT");
    await page.check('input[name="tax"][value="vl"]', { force: true });
    check((await text("#sa-r-tax")) === "33,00 €" && (await total()) === "720,00 €" && !(await page.isVisible("#sa-pas")),
      "mettre de côté : versement libératoire de 2,2 %, taux du foyer masqué");
    await page.selectOption("#sa-acre", "50");
    check((await text("#sa-r-cotis")) === "192,00 €" && (await total()) === "528,00 €", "mettre de côté : ACRE, taux minoré de 12,8 %");
    await page.fill("#sa-amount", "mille");
    check((await page.getAttribute("#sa-amount", "aria-invalid")) === "true" && (await text("#sa-notice")).includes("Montant invalide") &&
      (await total()) === "–" && (await text("#sa-sub")).includes("Montant invalide"), "mettre de côté : montant illisible signalé, et dans le résumé annoncé");
    await page.fill("#sa-amount", "1 800");
    await page.check('input[name="tax"][value="pas"]', { force: true });
    await page.fill("#sa-pas", "150");
    check((await page.getAttribute("#sa-pas", "aria-invalid")) === "true" && (await text("#sa-notice")).includes("Taux de prélèvement invalide") && (await text("#sa-r-tax-label")) === "Impôt sur le revenu",
      "mettre de côté : taux du foyer hors de 0 à 100 % signalé");
    await page.fill("#sa-pas", "7,5");
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#sa-vat")) === "normal" && (await page.inputValue("#sa-acre")) === "50" && (await total()) === "569,25 €",
      "mettre de côté : saisie retrouvée après rechargement (300 + 192 + 3 + 74,25 €)");
    // Valeur enregistrée devenue obsolète (option retirée) : le choix par défaut reste affiché et sert au calcul.
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.endsWith("mettre-de-cote")), saved = JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify({ ...saved, vat: "ancien", tax: "ancien" }));
    });
    await page.reload({ waitUntil: "networkidle" });
    check((await page.inputValue("#sa-vat")) === "franchise" && (await page.isChecked('input[name="tax"][value="pas"]')) && (await total()) === "323,10 €",
      "mettre de côté : valeur enregistrée obsolète ignorée, choix par défaut affiché et calculé (230,40 + 3,60 + 89,10 €)");
  },
  async "fr/compte-bancaire-professionnel/"(page) {
    await page.goto(BASE + "fr/compte-bancaire-professionnel/?today=2026-10-20", { waitUntil: "networkidle" });
    const res = async () => [await page.textContent("#b-answer"), await page.textContent("#b-sub"), await page.textContent("#b-steps")];
    let [a, sub, steps] = await res();
    check(a.includes("à surveiller") && sub.includes("en 2025") && (await page.textContent(".b-y2")) === "2024", "compte bancaire : 14 000 € en 2025 seulement → à surveiller (années affichées)");
    check(steps.includes("Préparez") && !steps.includes("Ouvrez un compte"), "compte bancaire : « à surveiller » → étapes de préparation, pas d'obligation");
    await page.fill("#b-prev2", "12 000");
    [a, sub, steps] = await res();
    check(a.includes("obligatoire") && sub.includes("en 2024 et en 2025") && /«\s?EI\s?»/.test(steps) && steps.includes("droit au compte"), "compte bancaire : deux années au-dessus de 10 000 € → obligatoire, intitulé EI, droit au compte");
    await page.fill("#b-prev2", "8 000");
    await page.fill("#b-current", "11 000");
    [a] = await res();
    check(a.includes("fin 2026"), "compte bancaire : 2025 et estimation 2026 au-dessus → obligatoire fin 2026");
    await page.fill("#b-prev", "10 000");
    [a, , steps] = await res();
    check(a === "Pas obligatoire" && steps.includes("Conseillé"), "compte bancaire : 10 000 € tout juste → pas obligatoire, conseillé");
    await page.selectOption("#b-status", "ei");
    [a] = await res();
    check(a.includes("Pas d'obligation") && !(await page.isVisible("#b-prev")) && !(await page.isVisible("#b-notice")), "compte bancaire : entreprise individuelle au réel → pas d'obligation générale, champs masqués");
    await page.selectOption("#b-status", "societe");
    [a] = await res();
    check(a.includes("à son nom"), "compte bancaire : société → compte à son nom");
    await page.reload({ waitUntil: "networkidle" });
    [a] = await res();
    check(a.includes("à son nom") && !(await page.isVisible("#b-prev")), "compte bancaire : statut retrouvé après rechargement");
    await page.selectOption("#b-status", "micro");
    await page.fill("#b-prev2", "12 000");
    await page.fill("#b-prev", "14k");
    [a] = await res();
    const error = await page.textContent("#b-error");
    check(await page.isVisible("#b-error") && error.includes("2025") && a === "Pas obligatoire" && (await page.getAttribute("#b-prev", "aria-invalid")) === "true", "compte bancaire : montant illisible signalé, pas ignoré en silence");
    // Retour aux valeurs par défaut (enregistrées dans le navigateur) avant les captures.
    await page.fill("#b-prev2", "8 000");
    await page.fill("#b-prev", "14 000");
    await page.fill("#b-current", "");
    check(!(await page.isVisible("#b-error")), "compte bancaire : message d'erreur retiré une fois le montant corrigé");
    // Texte brut (sans la normalisation des vérifications) : l'observateur de engines/typo-fr.js.
    await page.goto(BASE + "fr/compte-bancaire-professionnel/?today=2026-10-20", { waitUntil: "networkidle" });
    const raw = await page.evaluate(() => document.querySelector("#b-sub").textContent);
    check(raw.includes("10\u202f000\u00a0€") && raw.includes("2025\u00a0:"), "typographie : texte produit par le script traité (10 000 €, « : »)");
    const result = await page.evaluate(async () => {
      const box = document.createElement("div");
      box.innerHTML = '<p id="ty-p">Total : 10 000 € ; payé ?</p><code id="ty-c">a : b ; c</code><pre id="ty-pre">x ? y</pre>';
      document.querySelector("main, body").appendChild(box);
      await new Promise((r) => setTimeout(r, 30));
      const p = document.getElementById("ty-p");
      p.firstChild.nodeValue = "Délai : 30 jours";   // modification d'un texte existant
      await new Promise((r) => setTimeout(r, 30));
      const out = [p.textContent, document.getElementById("ty-c").textContent, document.getElementById("ty-pre").textContent];
      box.remove();
      return out;
    });
    check(result[0] === "Délai\u00a0: 30\u00a0jours" && result[1] === "a : b ; c" && result[2] === "x ? y", "typographie : texte ajouté puis modifié traité ; code et pre intacts");
  },
  async "fr/assurance-independant/"(page) {
    const res = async () => [await page.textContent("#a-answer"), await page.textContent("#a-list"), await page.textContent("#a-documents"), await page.textContent("#a-sub")];
    let [a, list, docs, sub] = await res();
    check(a === "Pas en règle générale" && list.includes("Conseillé") && docs.includes("si votre métier impose"), "assurance : prestations de services en micro-entreprise → conseillée, mention si le métier l'impose");
    await page.selectOption("#a-activity", "construction");
    [a, list, docs] = await res();
    check(a.includes("décennale") && list.includes("Obligatoire : Assurance de responsabilité décennale") && list.includes("À vérifier : responsabilité civile") && docs.includes("attestation") && docs.includes("L243-2"), "assurance : travaux → décennale obligatoire, RC pro à vérifier, attestation jointe (L243-2)");
    await page.selectOption("#a-activity", "artisan");
    [a, list] = await res();
    check(a.includes("À vérifier") && list.includes("chambre de métiers") && !(await page.isVisible("#a-artisan")), "assurance : artisanat hors bâtiment → à vérifier pour le métier, case « artisan » masquée");
    await page.selectOption("#a-activity", "reglementee");
    [a, list, docs] = await res();
    check(a.includes("profession") && docs.includes("L132-1") && !docs.includes("si votre métier"), "assurance : profession réglementée en micro-entreprise → mention L132-1");
    await page.uncheck("#a-micro");
    [, , docs] = await res();
    check(docs.includes("n'exige de mention"), "assurance : profession réglementée hors micro-entreprise → pas de mention au titre du Code de l'artisanat");
    await page.check("#a-artisan");
    [, , docs] = await res();
    check(docs.includes("L132-1") && !docs.includes("n'exige"), "assurance : artisan immatriculé hors micro-entreprise → mention L132-1");
    await page.reload({ waitUntil: "networkidle" });
    [a, , docs] = await res();
    check((await page.inputValue("#a-activity")) === "reglementee" && (await page.isChecked("#a-artisan")) && !(await page.isChecked("#a-micro")) && docs.includes("L132-1"), "assurance : choix retrouvés après rechargement");
    await page.uncheck("#a-artisan");
    await page.selectOption("#a-activity", "commerce");
    await page.check("#a-vehicle");
    [a, list, , sub] = await res();
    check(a === "Pas en règle générale" && list.includes("Obligatoire : Responsabilité civile automobile") && sub.includes("véhicule"), "assurance : commerce avec véhicule → RC automobile obligatoire, annoncée dans la réponse");
    // Retour aux valeurs par défaut (enregistrées dans le navigateur) avant les captures.
    await page.selectOption("#a-activity", "services");
    await page.uncheck("#a-vehicle");
    await page.check("#a-micro");
  },
  async "fr/espace/"(page) {
    // Parcours complet de l'Espace (critères A2 à A11 de documentation/09-specification-espace.md).
    const fs = await import("fs");
    page.on("dialog", (d) => d.accept());
    const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(150); };
    const text = async (sel) => (await page.innerText(sel)).replace(/\s+/g, " ").trim();
    await page.goto(BASE + "fr/espace/?today=2026-10-20", { waitUntil: "networkidle" });
    check((await text("#espace-view h2")) === "Bienvenue dans votre espace", "Espace : premier lancement");
    await accessible(page, "Espace : premier lancement");
    await page.fill("#ep-name", "Camille Martin EI");
    await page.selectOption("#ep-activity", "liberal_bnc");
    await page.selectOption("#ep-vatRegime", "franchise");
    await page.selectOption("#ep-periodicity", "quarterly");
    await page.click("#profile-form button[type=submit]");
    await page.waitForSelector(".kpis");
    check((await text("#espace-view h2")) === "Camille Martin EI", "Espace : profil créé, tableau de bord");
    await accessible(page, "Espace : tableau de bord vide");

    await go("#/clients/nouveau");
    await page.fill("#ep-name", "Studio Nova");
    await page.fill("#ep-siren", "812 345 678");
    await page.fill("#ep-email", "compta@studio-nova.example");
    await page.click("#client-form button[type=submit]");
    await page.waitForSelector(".doc-list");
    check((await text(".doc-list")).includes("Studio Nova"), "Espace : client créé");
    await accessible(page, "Espace : liste des clients");
    const clientId = await page.evaluate(() => location.hash);

    const newInvoice = async (date, desc, price, type = "facture", terms) => {
      await go("#/documents/nouveau?type=" + type);
      await page.selectOption("#d-client", { label: "Studio Nova" });
      await page.fill("#d-date", date);
      if (terms) await page.selectOption("#d-terms", String(terms));
      await page.fill("#ln-desc-0", desc);
      await page.fill("#ln-price-0", String(price));
      await page.waitForTimeout(600);
    };
    await newInvoice("2026-09-10", "Site vitrine", 1800, "facture", 60);
    check((await text("#d-preview")).includes("1 800,00 €") && (await text("#d-preview")).includes("TVA non applicable, art. 293 B du CGI."), "Espace : aperçu de la facture (moteur commun)");
    await accessible(page, "Espace : facture en cours de saisie");
    await page.click("#d-issue");
    await page.waitForFunction(() => /Facture F2026-001/.test(document.querySelector("#espace-view h2").textContent));
    check(true, "Espace : facture émise F2026-001 (A2)");
    check(!(await page.$("#doc-form")), "Espace : facture émise non modifiable (A3)");
    await accessible(page, "Espace : facture émise");
    const sendHref = await page.getAttribute("#d-send", "href");
    check(sendHref.startsWith("mailto:compta@studio-nova.example?subject=Facture%20F2026-001%20%E2%80%93%20Camille%20Martin%20EI&body=") &&
      decodeURIComponent(sendHref).replace(/\s+/g, " ").includes("la facture F2026-001 du 10/09/2026, d'un montant de 1 800,00 €. Elle est payable au plus tard le 09/11/2026."),
      "Espace : email d'envoi prérempli avec destinataire, objet et échéance (A13)");
    await page.fill("#pay-date", "2026-09-15");
    await page.fill("#pay-amount", "800");
    await page.click("#pay-form button[type=submit]");
    await page.waitForTimeout(250);
    check((await text("#espace-view .st")) === "Payée en partie", "Espace : paiement partiel (A5)");
    await page.fill("#pay-date", "2026-09-20");
    await page.click("#pay-form button[type=submit]");
    await page.waitForTimeout(250);
    check((await text("#espace-view .st")) === "Payée", "Espace : facture payée (A5)");
    await accessible(page, "Espace : facture payée, paiements");

    // Facture électronique (Factur-X) : données manquantes signalées, fiches complétées, PDF/A-3 et XML téléchargés.
    const invoiceHash = await page.evaluate(() => location.hash);
    await page.click("#d-facturx");
    await page.waitForFunction(() => /Pour produire un fichier conforme/.test(document.querySelector("#fx-status").textContent), null, { timeout: 15000 });
    const fxProblems = await text("#fx-status");
    // (Le SIRET peut déjà venir du générateur de facture testé plus tôt dans le même navigateur.)
    check(fxProblems.includes("Votre adresse") && fxProblems.includes("L'adresse du client") && fxProblems.includes("Compléter mon profil") &&
      fxProblems.includes("Compléter la fiche client"), "Espace : Factur-X, données manquantes signalées avec liens vers les fiches");
    await accessible(page, "Espace : Factur-X, données manquantes");
    await go("#/reglages");
    await page.fill("#ep-siret", "123 456 789 00012");
    await page.fill("#ep-address", "12 rue de la République\n69002 Lyon");
    await page.fill("#ep-endpoint", "999999999");
    await page.click("#profile-form button[type=submit]");
    await page.waitForTimeout(200);
    check((await text("#profile-error")).includes("doit commencer par votre SIREN (123456789)"), "Espace : adresse de facturation électronique contrôlée");
    await accessible(page, "Espace : réglages, erreur de saisie");
    await page.fill("#ep-endpoint", "");
    await page.click("#profile-form button[type=submit]");
    await page.waitForTimeout(300);
    await go("#/clients");
    await page.click(".doc-list a");
    await page.waitForSelector("#client-form");
    await page.fill("#ep-address", "14 rue des Lilas\n69003 Lyon");
    await page.fill("#ep-endpoint", "111111111_ACHATS");
    await page.click("#client-form button[type=submit]");
    await page.waitForTimeout(200);
    check((await text("#client-error")).includes("doit commencer par le SIREN du client (812345678)"), "Espace : adresse électronique du client contrôlée (A23)");
    await page.fill("#ep-endpoint", "");
    await page.click("#client-form button[type=submit]");
    await page.waitForTimeout(300);
    await go(invoiceHash);
    const [fxDownload] = await Promise.all([page.waitForEvent("download"), page.click("#d-facturx")]);
    const fxPath = path.join(shots, "espace-facturx.pdf");
    await fxDownload.saveAs(fxPath);
    const fxBytes = fs.readFileSync(fxPath).toString("latin1");
    check(fxDownload.suggestedFilename() === "F2026-001-factur-x.pdf" && fxBytes.startsWith("%PDF-1.7") && fxBytes.includes("/AFRelationship /Alternative") &&
      fxBytes.includes("<ram:ID>F2026-001</ram:ID>") && fxBytes.includes("<pdfaid:part>3</pdfaid:part>"),
      "Espace : facture électronique téléchargée (PDF/A-3 avec factur-x.xml)");
    await page.waitForFunction(() => /Factur-X \(PDF\/A-3/.test(document.querySelector("#fx-status").textContent));
    const fxStatus = await text("#fx-status");
    check(fxStatus.includes("Complété depuis vos fiches :") && fxStatus.includes("votre adresse") && fxStatus.includes("l'adresse du client"),
      "Espace : identifiants complétés depuis les fiches, et signalés");
    const [xmlDownload] = await Promise.all([page.waitForEvent("download"), page.click("#d-facturx-xml")]);
    await xmlDownload.saveAs(path.join(shots, "espace-facturx.xml"));
    check(xmlDownload.suggestedFilename() === "F2026-001-factur-x.xml" &&
      fs.readFileSync(path.join(shots, "espace-facturx.xml"), "utf8").includes("<ram:ID schemeID=\"0002\">812345678</ram:ID>"),
      "Espace : données Factur-X seules (XML) téléchargées");

    await go("#/");
    const kpis = await text(".kpis");
    check(kpis.includes("Encaissé en 2026 1 800,00 €"), "Espace : encaissé de l'année");
    check(kpis.includes("Déclaration Urssaf : 3e trimestre 2026 1 800,00 €") && kpis.includes("2 novembre 2026") && kpis.includes("464,40 €"),
      "Espace : déclaration du 3e trimestre, date limite et cotisations 25,8 % (A7)");
    check((await text(".gauges")).includes("1 800,00 € / 83 600,00 €"), "Espace : jauge du plafond (A8)");
    await accessible(page, "Espace : tableau de bord");

    await go("#/recettes");
    const ledger = await text(".ledger");
    check(ledger.includes("15/09/2026") && ledger.includes("20/09/2026") && ledger.includes("F2026-001") && ledger.includes("Total encaissé en 2026 1 800,00 €"), "Espace : livre des recettes (A6)");
    await accessible(page, "Espace : livre des recettes");
    const [csv] = await Promise.all([page.waitForEvent("download"), page.click("#ledger-csv")]);
    check(fs.readFileSync(await csv.path(), "utf8").includes('15/09/2026;"Studio Nova";"Site vitrine";800,00;"Virement";"F2026-001"'), "Espace : export CSV du livre des recettes");

    await newInvoice("2026-08-01", "Maintenance", 200);
    await page.click("#d-issue");
    await page.waitForTimeout(200);
    check((await text("#doc-error")).includes("antérieure à celle du dernier document émis"), "Espace : chronologie de la numérotation (A4)");
    await accessible(page, "Espace : document refusé");
    await page.click("#d-delete");
    await page.waitForTimeout(250);

    await newInvoice("2026-10-12", "Audit SEO", 600, "devis");
    await page.click("#d-issue");
    await page.waitForFunction(() => /Devis D2026-001/.test(document.querySelector("#espace-view h2").textContent));
    await page.click('[data-quote="accepted"]');
    await page.waitForTimeout(200);
    await page.click("#d-convert");
    await page.waitForSelector("#doc-form");
    check((await page.inputValue("#ln-desc-0")) === "Audit SEO", "Espace : devis transformé en facture (A9)");
    await page.fill("#d-date", "2026-10-15");
    await page.waitForTimeout(500);
    await page.click("#d-issue");
    await page.waitForFunction(() => /Facture F2026-002/.test(document.querySelector("#espace-view h2").textContent));
    await page.click("#d-credit");
    await page.waitForSelector("#doc-form");
    await page.fill("#d-date", "2026-10-16");
    await page.waitForTimeout(500);
    check((await text("#d-preview")).includes("Avoir relatif à la facture n° F2026-002"), "Espace : avoir lié à la facture (A10)");
    await page.click("#d-issue");
    await page.waitForFunction(() => /Avoir A2026-001/.test(document.querySelector("#espace-view h2").textContent));
    await go("#/documents?filtre=facture");
    check((await text(".doc-list")).includes("Annulée par avoir"), "Espace : facture annulée par l'avoir (A10)");
    await accessible(page, "Espace : liste des documents");

    await page.reload({ waitUntil: "networkidle" });
    await go("#/documents");
    check((await page.$$eval(".doc-list li", (l) => l.length)) === 4, "Espace : données conservées après rechargement (A11)");
    await go("#/reglages");
    const [backup] = await Promise.all([page.waitForEvent("download"), page.click("#export-btn")]);
    const saved = JSON.parse(fs.readFileSync(await backup.path(), "utf8"));
    check(saved.schema === 1 && saved.documents.length === 4 && saved.clients.length === 1, "Espace : sauvegarde exportée (A11)");
    await page.click("#wipe-btn");
    await page.waitForFunction(() => /Bienvenue/.test(document.querySelector("#espace-view h2").textContent));
    await page.setInputFiles("#import-file", await backup.path());
    await page.waitForSelector(".kpis");
    await go("#/documents");
    check((await page.$$eval(".doc-list li", (l) => l.length)) === 4, "Espace : sauvegarde restaurée à l'identique (A11)");
    // Revue de code : quitter l'écran pendant l'enregistrement automatique ; prix vide après rechargement.
    await page.evaluate(() => { location.hash = "#/documents/nouveau?type=facture"; });
    await page.waitForSelector("#doc-form");
    await page.fill("#ln-desc-0", "Prix à définir");
    await page.evaluate(() => { location.hash = "#/clients"; });
    await page.waitForTimeout(700);
    check((await page.evaluate(() => location.hash)) === "#/clients", "Espace : l'adresse reste celle de l'écran affiché");
    await page.reload({ waitUntil: "networkidle" });
    await go("#/documents?filtre=draft");
    await page.click(".doc-list a");
    await page.waitForSelector("#doc-form");
    check((await page.inputValue("#ln-desc-0")) === "Prix à définir" && (await page.inputValue("#ln-price-0")) === "",
      "Espace : brouillon enregistré en quittant l'écran, prix vide conservé vide");
    await page.click("#d-delete");
    await page.waitForTimeout(250);

    // Version 1.1 (documentation/09, section 11) : reprise du générateur, numérotation continuée, envoi par email.
    const shot = async (name) => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: path.join(shots, `espace-${name}-bureau.png`), fullPage: true });
      await accessible(page, `Espace ${name} (bureau)`);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(150);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), `Espace ${name} (mobile) : pas de défilement horizontal`);
      await page.screenshot({ path: path.join(shots, `espace-${name}-mobile.png`), fullPage: true });
      await accessible(page, `Espace ${name} (mobile)`);
      await page.setViewportSize({ width: 1280, height: 900 });
    };
    await go("#/reglages");
    check(await page.isDisabled("#ep-last_facture") && (await text("#ep-last_facture-hint")).includes("Série 2026 commencée dans l'Espace. Prochain numéro : F2026-003"),
      "Espace : suite de la série fixée une fois la série de l'année commencée");
    await page.fill("#ep-prefix_facture", "FA-");
    check((await text("#next-facture")) === "F2026-003", "Espace : nouveau préfixe sans effet sur la série commencée");
    await page.click("#profile-form button[type=submit]");
    await page.waitForTimeout(300);
    check((await text("#ep-prefix_facture-hint")).includes("La série 2026 garde le préfixe « F »"), "Espace : préfixe réservé aux séries suivantes");
    await page.click("#wipe-btn");
    await page.waitForFunction(() => /Bienvenue/.test(document.querySelector("#espace-view h2").textContent));
    await go("#/importer");
    await page.goto(BASE + "fr/generateur-facture/", { waitUntil: "networkidle" });
    await page.click('[data-doctype="facture"]');
    await page.click("#f-next");
    await page.fill("#f-number", "2026-007");
    await page.fill("#f-date", "2026-10-18");
    await page.fill("#f-me-name", "Camille Martin EI");
    await page.fill("#f-me-siret", "123 456 789 00012");
    await page.fill("#f-client-name", "Atelier Lumen");
    await page.check("#f-client-pro");
    await page.fill("#f-client-id", "901 234 567");
    await page.fill("#f-terms", "20");
    await page.fill("#l-desc-0", "Identité visuelle");
    await page.fill("#l-qty-0", "1");
    await page.fill("#l-price-0", "950");
    await page.selectOption("#f-vat-place", "fr");
    await page.check("#f-franchise");
    await page.fill("#f-paid", "300");
    await page.click("#f-espace");
    await page.waitForURL(/espace\/#\/importer$/);
    // Même parcours avec la date du jour fixée, pour que le test ne dépende pas de l'année en cours.
    await page.goto(BASE + "fr/espace/?today=2026-10-20#/importer", { waitUntil: "networkidle" });
    await page.waitForSelector("#profile-form");
    check((await text("#espace-view")).includes("sera repris en brouillon dès que votre profil sera créé"), "Espace : document du générateur en attente pendant la création du profil (A18)");
    check((await page.inputValue("#ep-name")) === "Camille Martin EI", "Espace : profil prérempli depuis le générateur");
    await page.click("#profile-form button[type=submit]");
    await page.waitForSelector("#imp-ok");
    const imp = await text("#espace-view");
    check(imp.includes("Atelier Lumen (nouvelle fiche)") && imp.includes("950,00 €") && imp.includes("ne l'émettez pas une seconde fois"), "Espace : récapitulatif de la reprise (A14)");
    check(imp.includes("cette facture recevra le n° 2026-007 à son émission, la suivante le n° 2026-008"), "Espace : numérotation du générateur proposée (A16)");
    check(imp.includes("Acompte déjà versé indiqué dans le générateur (300,00 €)"), "Espace : acompte du générateur signalé, non repris");
    await shot("importer");
    await page.click("#imp-ok");
    await page.waitForSelector("#doc-form");
    check((await page.inputValue("#ln-desc-0")) === "Identité visuelle" && (await page.inputValue("#ln-price-0")) === "950" &&
      (await page.inputValue("#d-terms")) === "20" && (await page.$eval("#d-client option:checked", (o) => o.textContent)) === "Atelier Lumen",
      "Espace : brouillon repris avec ses lignes, son client et son délai de 20 jours (A14)");
    check((await page.evaluate(() => localStorage.getItem("of:espace-import"))) === "null", "Espace : dépôt du générateur effacé après la reprise");
    await page.click("#d-issue");
    await page.waitForFunction(() => /Facture 2026-007/.test(document.querySelector("#espace-view h2").textContent));
    check(true, "Espace : facture émise sous le numéro du générateur, 2026-007 (A16)");
    const href = await page.getAttribute("#d-send", "href");
    check(href.startsWith("mailto:?subject=Facture%202026-007") && decodeURIComponent(href).includes("payable au plus tard le 07/11/2026") &&
      href.includes("%0D%0A"), "Espace : email d'envoi sans destinataire, échéance à 20 jours, retours à la ligne CRLF (A13)");
    check((await text("#espace-view")).includes("Pas d'email dans la fiche du client : l'ajouter pour le préremplir"), "Espace : invitation à compléter l'email du client");
    await shot("envoi");
    await go("#/reglages");
    check(await page.isDisabled("#ep-last_facture") && (await page.inputValue("#ep-prefix_facture")) === "" && (await text("#next-facture")) === "2026-008",
      "Espace : la numérotation continue à 2026-008 (A16)");
    await page.fill("#ep-prefix_avoir", "D");
    await page.click("#profile-form button[type=submit]");
    await page.waitForTimeout(200);
    check((await text("#profile-error")).includes("doivent être différents"), "Espace : préfixes identiques refusés");
    await page.fill("#ep-prefix_avoir", "A");
    await page.fill("#ep-last_devis", "12");
    check((await text("#next-devis")) === "D2026-013", "Espace : aperçu du prochain numéro pendant la saisie (A17)");
    await page.fill("#ep-last_avoir", "douze");
    await page.click("#profile-form button[type=submit]");
    await page.waitForTimeout(200);
    check((await text("#profile-error")).includes("indiquez le rang du dernier numéro utilisé"), "Espace : dernier numéro illisible refusé");
    await page.fill("#ep-last_avoir", "");
    await page.click("#profile-form button[type=submit]");
    await page.waitForTimeout(300);
    await shot("numerotation");
    await go("#/documents/nouveau?type=devis");
    await page.selectOption("#d-client", { label: "Atelier Lumen" });
    await page.fill("#d-date", "2026-10-19");
    await page.fill("#ln-desc-0", "Charte graphique");
    await page.fill("#ln-price-0", "700");
    await page.waitForTimeout(600);
    await page.click("#d-issue");
    await page.waitForFunction(() => /Devis D2026-013/.test(document.querySelector("#espace-view h2").textContent));
    check(decodeURIComponent(await page.getAttribute("#d-send", "href")).replace(/\s+/g, " ").includes("valable jusqu'au 18/11/2026. Un acompte de 30 % (210,00 €) est demandé à la signature."),
      "Espace : devis D2026-013 après le dernier numéro déclaré, email avec validité et acompte (A13, A17)");
    await page.evaluate(() => localStorage.setItem("of:espace-import", JSON.stringify({ doc: { type: "facture", client: { name: "Atelier Lumen" }, lines: [] }, savedAt: new Date().toISOString() })));
    await go("#/importer");
    check((await text("#espace-view")).includes("Atelier Lumen (fiche existante)"), "Espace : client du générateur rattaché à la fiche existante (A15)");
    await page.click("#imp-cancel");
    await page.waitForTimeout(250);
    check((await page.evaluate(() => location.hash)) === "#/" && (await page.evaluate(() => localStorage.getItem("of:espace-import"))) === "null",
      "Espace : « Ne pas reprendre » efface le dépôt (A18)");
    await page.evaluate(() => localStorage.setItem("of:espace-import", JSON.stringify({ doc: { type: "facture", lines: [] }, savedAt: "2026-01-01T00:00:00Z" })));
    await go("#/importer");
    check((await text("#espace-view")).includes("Aucun document à reprendre") && (await page.evaluate(() => localStorage.getItem("of:espace-import"))) === "null",
      "Espace : document en attente depuis plus de 24 h ignoré et effacé");
    await go("#/");
  },
  async "fr/confidentialite/"() {},
  async "fr/mentions-legales/"() {},
  async "404.html"() {},
};

// ONLY=fr/espace/,fr/  : ne lance que ces pages (développement).
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
for (const [url, run] of Object.entries(tests)) {
  if (only && !only.includes(url)) continue;
  for (const [label, viewport] of [["bureau", { width: 1280, height: 900 }], ["tablette", { width: 1024, height: 768 }], ["mobile", { width: 390, height: 844 }]]) {
    const page = await context.newPage();
    await page.setViewportSize(viewport);
    const errors = await open(page, url);
    if (label === "bureau") {
      await accessible(page, `${url || "accueil"} (bureau, à l'ouverture)`);
      await run(page);
    }
    await accessible(page, `${url || "accueil"} (${label}${label === "bureau" ? ", après le parcours" : ""})`);
    if (label === "mobile" && url === "fr/") {
      await page.click(".menu-toggle");
      check(await page.isVisible('.nav a[href$="/fr/generateur-facture/"]'), "menu mobile : panneau ouvert avec les outils");
      await page.screenshot({ path: path.join(shots, "menu-mobile.png") });
      await page.focus('.nav a[href$="/fr/generateur-facture/"]');
      await page.keyboard.press("Escape");
      check(!(await page.isVisible('.nav a[href$="/fr/generateur-facture/"]')) && (await page.evaluate(() => document.activeElement.matches(".menu-toggle"))),
        "menu mobile : Échap referme le panneau et rend le focus au bouton du menu");
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
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
