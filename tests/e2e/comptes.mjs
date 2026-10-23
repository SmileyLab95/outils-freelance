// Parcours navigateur des comptes en ligne (étape C4, documentation/23-serveur-et-connexion.md § 5 et § 7), sur les
// pages en brouillon : OF_DRAFTS=1 python3 build.py, puis node tests/e2e/comptes.mjs [dossier-captures].
// Un serveur de test sert brouillons/ et l'API sur la même origine (comme en production) ; deux contextes de
// navigateur jouent deux appareils ; une clé d'accès virtuelle (protocole CTAP2 du navigateur) remplace le téléphone.
import { createRequire } from "module";
import { mkdirSync, existsSync, readFileSync } from "fs";
import { readFile } from "fs/promises";
import { homedir } from "os";
import http from "http";
import path from "path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const { createApp } = require("../../server/lib/app.js");
const { MemoryStore } = require("../../server/lib/store.js");
const { MemoryMailer } = require("../../server/lib/emails.js");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const site = path.join(root, "brouillons");
if (!existsSync(path.join(site, "fr", "compte", "index.html"))) {
  console.error("Construire d'abord les brouillons : OF_DRAFTS=1 python3 build.py");
  process.exit(1);
}
const shots = path.resolve(process.argv[2] || path.join(root, "tests", "captures-comptes"));
mkdirSync(shots, { recursive: true });

// ----- Serveur de test : pages et API sur la même origine ----------------------------------------------------------

const store = new MemoryStore(), mailer = new MemoryMailer();
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".json": "application/json", ".woff2": "font/woff2" };
const server = http.createServer();
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port, ORIGIN = `http://localhost:${port}`;
const api = createApp({ store, mailer, config: { rpId: "localhost", origins: [ORIGIN], appUrl: ORIGIN + "/outils-freelance", accountPaths: { fr: "/fr/compte/" }, log: console.error } });
server.on("request", async (req, res) => {
  if (req.url.startsWith("/api/")) return api(req, res);
  let p = decodeURIComponent(req.url.split("?")[0]).replace(/^\/outils-freelance/, "");
  if (p.endsWith("/")) p += "index.html";
  try {
    const body = await readFile(path.join(site, path.normalize(p)));
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
const PAGE = ORIGIN + "/outils-freelance/fr/compte/";

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
const visible = (page, sel) => page.isVisible(sel);
const errors = [];
async function device(name) {
  const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${name} : ${e.message}`));
  return { context, page };
}
/** Attend qu'une condition de la page soit vraie (10 s au plus) : vrai ou faux, sans interrompre le parcours. */
const until = (page, fn, arg) => page.waitForFunction(fn, arg, { timeout: 10000 }).then(() => true, () => false);
/** Attend qu'une condition côté serveur de test soit vraie. */
const serverUntil = async (fn, ms) => { for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 100))) if (fn()) return true; return fn(); };
const linkFor = (email) => /(http\S+#token=[A-Za-z0-9_-]+)/.exec(mailer.last(email).text)[1];
async function shot(page, name) {
  for (const [label, vp] of [["bureau", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    await page.setViewportSize(vp);
    await page.locator(".account-card").screenshot({ path: path.join(shots, `${name}-${label}.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}
// Données de l'Espace : lues et écrites par le stockage de l'Espace, sur la page du compte (même origine).
const espace = (page) => page.evaluate(() => window.EspaceStore.load());
const putEspace = (page, fn) => page.evaluate((src) => window.EspaceStore.load().then((d) => { new Function("d", src)(d); return window.EspaceStore.save(d); }), fn);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
try {
  // ----- Pages Offres et Soutenir (brouillons, documentation/35-offres-et-soutien.md) ---------------------------
  for (const [slug, title] of [["offres", "Gratuit pour l'essentiel"], ["soutenir", "Soutenir Outils Freelance"]]) {
    const { page } = await device(slug);
    await page.goto(ORIGIN + `/outils-freelance/fr/${slug}/`, { waitUntil: "networkidle" });
    const links = await page.$$eval("main a[href]", (as) => as.map((a) => a.href));
    check((await text(page, "h1")).startsWith(title) && (await page.getAttribute("meta[name=robots]", "content")) === "noindex"
      && !links.some((h) => /stripe|liberapay|ko-fi|buymeacoffee|paypal/i.test(h))
      && !existsSync(path.join(root, "docs", "fr", slug)) && !readFileSync(path.join(root, "docs", "sitemap.xml"), "utf8").includes(`/fr/${slug}/`),
      `${slug} : brouillon non indexé, absent du site public, aucun lien de paiement`);
    await accessible(page, `${slug} (brouillon)`);
    for (const [label, vp] of [["bureau", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
      await page.setViewportSize(vp);
      await page.screenshot({ path: path.join(shots, `0-${slug}-${label}.png`), fullPage: true });
    }
    await page.context().close();
  }
  check((await (async () => { const { page } = await device("soutenir-texte"); await page.goto(ORIGIN + "/outils-freelance/fr/soutenir/", { waitUntil: "networkidle" });
    const t = await text(page, "main"); await page.context().close(); return t; })()).includes("pas de reçu fiscal, pas de réduction d'impôt"),
    "soutenir : la page dit qu'un don ne donne ni reçu fiscal ni réduction d'impôt");

  // ----- Premier appareil : Espace local existant, création du compte -----------------------------------------
  const A = await device("A");
  await A.page.goto(PAGE, { waitUntil: "networkidle" });
  check(await visible(A.page, "#s-signin") && (await A.page.getAttribute("meta[name=robots]", "content")) === "noindex",
    "compte : déconnecté → écran de connexion ; page en brouillon non indexée");
  await putEspace(A.page, `d.profile = { name: "Camille Martin EI" }; d.clients.push({ id: "c-1", name: "Studio Nova", createdAt: "2026-10-22T10:00:00.000Z", updatedAt: "2026-10-22T10:00:00.000Z" });`);
  // Données synchronisées (schéma 2) : un élément marqué supprimé n'est pas montré à l'Espace.
  await putEspace(A.page, `d.clients.push({ id: "c-del", name: "Supprimé", deletedAt: "2026-10-22T09:00:00.000Z" });`);
  check(!(await espace(A.page)).clients.some((c) => c.id === "c-del"), "Espace : élément marqué supprimé retiré au chargement");
  await accessible(A.page, "compte, connexion");
  await shot(A.page, "1-connexion");

  await A.page.fill("#c-email", "pas-une-adresse");
  await A.page.click("#b-link");
  check((await text(A.page, "#c-msg")).includes("ne semble pas valide") && (await A.page.getAttribute("#c-email", "aria-invalid")) === "true", "compte : adresse invalide signalée");
  await A.page.fill("#c-email", "Camille@Exemple.fr");
  await A.page.click("#b-link");
  await A.page.waitForSelector("#s-sent:not([hidden])");
  check((await text(A.page, "#sent-email")) === "Camille@Exemple.fr" && mailer.outbox.length === 1, "compte : lien envoyé, écran « consultez votre boîte »");
  await shot(A.page, "2-lien-envoye");

  await A.page.goto(linkFor("camille@exemple.fr"), { waitUntil: "networkidle" });
  await A.page.waitForSelector("#s-welcome:not([hidden])");
  check(!A.page.url().includes("token") && (await A.page.evaluate(() => document.activeElement.textContent)).includes("votre compte est créé"),
    "compte : lien vérifié, jeton retiré de l'adresse, compte créé → écran Bienvenue (titre au focus)");
  const prefsOf = () => [...store.prefsByAccount.values()][0];
  check(!(await A.page.isChecked("#c-newsletter")) && prefsOf().lang === "fr" && prefsOf().newsletter.value === false,
    "compte : lettre d'information non cochée par défaut, aucune inscription sans choix");
  await accessible(A.page, "compte, bienvenue");
  await shot(A.page, "3a-bienvenue");
  await A.page.check("#c-newsletter");
  await A.page.click("#b-welcome");
  await A.page.waitForSelector("#s-setup:not([hidden])");
  check(prefsOf().newsletter.value === true && prefsOf().newsletter.wording === "fr-2026-10-23" && Number.isFinite(prefsOf().newsletter.at)
    && (await text(A.page, "#c-msg")).includes("Inscription à la lettre d'information enregistrée"),
    "compte : choix de la lettre d'information enregistré avec sa date et la version du texte");
  await A.page.click("#b-new-code");
  const code = await text(A.page, "#code-text");
  check(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){6}$/.test(code), `compte : code de récupération affiché (${code.length} caractères)`);
  await accessible(A.page, "compte, code de récupération");
  await shot(A.page, "3-code");
  await A.page.fill("#c-confirm", "ZZZZ");
  await A.page.check("#c-kept");
  await A.page.click("#b-activate");
  check((await text(A.page, "#c-msg")).includes("ne correspondent pas") && !(await visible(A.page, "#s-account")), "compte : confirmation fausse refusée");
  await A.page.fill("#c-confirm", code.replace(/-/g, "").slice(-4).toLowerCase());
  await A.page.click("#b-activate");
  await A.page.waitForSelector("#s-account:not([hidden])");
  await A.page.waitForFunction(() => /synchronisé le/.test(document.getElementById("sync-status").textContent));
  const account = [...store.accounts.values()][0];
  const vault = store.vaults.get(account.id);
  check(vault && vault.version === 1 && !Buffer.from(vault.data, "base64url").toString("latin1").includes("Studio Nova"),
    "compte : Espace local envoyé chiffré (version 1, illisible par le serveur)");
  check((await text(A.page, "#acc-email")) === "camille@exemple.fr" && (await A.page.$$("#acc-sessions li")).length === 1, "compte : écran du compte, un appareil connecté");
  // Premiers pas : profil décrit (Espace local), le reste à faire ; outils suggérés hors micro-entreprise.
  await A.page.waitForSelector("#acc-steps:not([hidden])");
  const stepState = () => A.page.$$eval(".steps-list li", (ls) => ls.map((l) => l.id.slice(5) + (l.hidden ? "?" : l.classList.contains("is-done") ? "+" : "-")).join(" "));
  check((await stepState()) === "profile+ mentions- document- passkey-" && (await text(A.page, "#acc-steps-count")) === "1 étape faite sur 4.",
    `compte : premiers pas d'après l'Espace (${await stepState()})`);
  check(await A.page.isVisible('[data-tool="einvoicing"]') && !(await A.page.isVisible('[data-tool="tax"]')) && await A.page.isVisible('[data-tool="domain"]'),
    "compte : outils suggérés selon l'activité");
  check((await A.page.getAttribute("#step-mentions a", "href")).endsWith("/fr/espace/#/reglages"), "compte : lien vers les réglages de l'Espace");
  check(await A.page.isChecked("#acc-newsletter"), "compte : choix de la lettre d'information affiché");
  await A.page.uncheck("#acc-newsletter");
  check(await serverUntil(() => prefsOf().newsletter.value === false, 3000) && (await until(A.page, () => /Désinscription enregistrée/.test(document.getElementById("c-msg").textContent))),
    "compte : désinscription depuis le compte, datée sur le serveur");
  await accessible(A.page, "compte, écran du compte");
  await shot(A.page, "4-compte");

  // ----- Deuxième appareil : ouverture avec le code, données retrouvées -------------------------------------
  const B = await device("B");
  await B.page.goto(PAGE, { waitUntil: "networkidle" });
  await B.page.fill("#c-email", "camille@exemple.fr");
  await B.page.click("#b-link");
  await B.page.waitForSelector("#s-sent:not([hidden])");
  await B.page.goto(linkFor("camille@exemple.fr"), { waitUntil: "networkidle" });
  await B.page.waitForSelector("#s-unlock:not([hidden])");
  check((await text(B.page, "#c-msg")) === "Vous êtes connecté.", "compte : deuxième appareil → saisie du code");
  const typo = code.slice(0, 5) + (code[5] === "A" ? "B" : "A") + code.slice(6);
  await B.page.fill("#c-code", typo);
  await B.page.click("#b-unlock");
  await B.page.waitForFunction(() => document.getElementById("c-code").getAttribute("aria-invalid") === "true");
  check(/faute de frappe|caractère inattendu/.test(await text(B.page, "#c-msg")), "compte : faute de frappe dans le code détectée");
  await accessible(B.page, "compte, ouverture sur un nouvel appareil");
  await shot(B.page, "5-ouverture");
  await B.page.fill("#c-code", code.toLowerCase().replace(/-/g, " "));
  await B.page.click("#b-unlock");
  await B.page.waitForSelector("#s-account:not([hidden])");
  const bData = await espace(B.page);
  check(bData.profile && bData.profile.name === "Camille Martin EI" && bData.clients.some((c) => c.name === "Studio Nova"), "compte : Espace retrouvé sur le deuxième appareil");

  // ----- Modifications des deux côtés, puis conflit ----------------------------------------------------------
  await putEspace(B.page, `d.clients.push({ id: "c-2", name: "Atelier Lune", createdAt: "2026-10-22T11:00:00.000Z", updatedAt: "2026-10-22T11:00:00.000Z" });`);
  await B.page.click("#b-sync");
  await B.page.waitForFunction(() => /synchronisé le/.test(document.getElementById("sync-status").textContent));
  check(store.vaults.get(account.id).version === 2, "compte : modification du deuxième appareil envoyée (version 2)");
  await A.page.click("#b-sync");
  await A.page.waitForFunction(() => /synchronisé le/.test(document.getElementById("sync-status").textContent));
  check((await espace(A.page)).clients.some((c) => c.name === "Atelier Lune"), "compte : modification reçue sur le premier appareil");
  await putEspace(A.page, `d.clients[0].name = "Studio Nova SAS"; d.clients[0].updatedAt = "2026-10-22T12:00:00.000Z";`);
  await putEspace(B.page, `d.clients[0].name = "Studio Nova SARL"; d.clients[0].updatedAt = "2026-10-22T12:05:00.000Z";`);
  await A.page.click("#b-sync");
  await A.page.waitForFunction(() => /synchronisé le/.test(document.getElementById("sync-status").textContent));
  await B.page.click("#b-sync");
  await B.page.waitForSelector("#sync-conflicts:not([hidden])");
  check((await text(B.page, "#sync-conflicts")).startsWith("Studio Nova SARL : fiche modifiée sur deux appareils") && (await B.page.getAttribute("#sync-status", "class")).includes("warn") &&
    (await espace(B.page)).clients[0].name === "Studio Nova SARL", "compte : même client modifié des deux côtés → plus récent gardé, conflit affiché");
  await shot(B.page, "6-conflit");

  // ----- Dans l'Espace : synchronisation à l'ouverture et après chaque modification ------------------------------
  const ESPACE = ORIGIN + "/outils-freelance/fr/espace/";
  await A.page.goto(ESPACE + "#/clients", { waitUntil: "networkidle" });
  check(await until(A.page, () => /Synchronisé à/.test(document.getElementById("espace-sync").textContent)) &&
    await until(A.page, () => /Studio Nova SARL/.test(document.getElementById("espace-view").textContent)),
    "Espace : synchronisé à l'ouverture, modification de l'autre appareil affichée sans recharger");
  check((await text(A.page, "#espace-sync")).includes("mon compte") && (await A.page.getAttribute("#espace-sync a", "href")) === "../compte/",
    "Espace : ligne d'état avec un lien vers le compte");
  await accessible(A.page, "Espace synchronisé");
  for (const [label, vp] of [["bureau", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    await A.page.setViewportSize(vp);
    await A.page.locator("#espace-app").screenshot({ path: path.join(shots, `7-espace-${label}.png`) });
  }
  await A.page.setViewportSize({ width: 1280, height: 900 });
  const v0 = store.vaults.get(account.id).version;
  await A.page.evaluate(() => window.EspaceStore.load().then((d) => { d.clients.push({ id: "c-3", name: "Client de l'Espace", createdAt: "2026-10-22T13:00:00.000Z", updatedAt: "2026-10-22T13:00:00.000Z" }); return window.EspaceStore.save(d); }));
  check(await serverUntil(() => store.vaults.get(account.id).version > v0, 8000), "Espace : modification envoyée automatiquement quelques secondes après l'enregistrement");
  await B.page.click("#b-sync");
  await B.page.waitForFunction(() => /synchronisé le/.test(document.getElementById("sync-status").textContent));
  check((await espace(B.page)).clients.some((c) => c.name === "Client de l'Espace"), "Espace : modification reçue sur le deuxième appareil");
  await A.page.goto(PAGE, { waitUntil: "networkidle" });
  await A.page.waitForSelector("#s-account:not([hidden])");

  // ----- Clé d'accès (authentificateur virtuel) --------------------------------------------------------------
  const cdp = await A.context.newCDPSession(A.page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", { options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true } });
  await A.page.click("#b-add-passkey");
  await A.page.waitForFunction(() => document.querySelectorAll("#acc-passkeys li button").length === 1);
  check((await text(A.page, "#c-msg")).includes("Clé d'accès ajoutée"), "compte : clé d'accès ajoutée");
  check(await until(A.page, () => document.getElementById("step-passkey").classList.contains("is-done")), "compte : premier pas « clé d'accès » coché");
  await A.page.click("#b-logout");
  await A.page.waitForSelector("#s-signin:not([hidden])");
  check((await A.page.evaluate(() => window.EspaceStore.getMeta("compte"))) === null && (await espace(A.page)).clients.length === 3,
    "compte : déconnexion → clé de chiffrement retirée de l'appareil, Espace local gardé");
  await A.page.click("#b-passkey");
  await A.page.waitForSelector("#s-unlock:not([hidden])");
  check((await text(A.page, "#c-msg")) === "Vous êtes connecté.", "compte : connexion par clé d'accès, sans email → saisie du code");
  await A.page.fill("#c-code", code);
  await A.page.click("#b-unlock");
  await A.page.waitForSelector("#s-account:not([hidden])");
  check((await text(A.page, "#acc-sessions")).includes("Clé d'accès"), "compte : session ouverte par clé d'accès listée");

  // ----- Appareils : déconnecter le deuxième appareil à distance --------------------------------------------
  await A.page.waitForFunction(() => document.querySelectorAll("#acc-sessions li button").length >= 1);
  const before = (await A.page.$$("#acc-sessions li")).length;
  await A.page.click("#acc-sessions li button");
  await A.page.waitForFunction((n) => document.querySelectorAll("#acc-sessions li").length === n - 1, before);
  await B.page.click("#b-sync");
  await B.page.waitForSelector("#s-signin:not([hidden])");
  check((await text(B.page, "#c-msg")).includes("session a expiré"), "compte : appareil déconnecté à distance → reconnexion demandée");

  // ----- Serveur compromis : coffre modifié, ou version plus ancienne renvoyée → l'appareil refuse ------------
  const real = { ...store.vaults.get(account.id) };
  const flipped = Buffer.from(real.data, "base64url"); flipped[20] ^= 1;
  store.vaults.set(account.id, { ...real, data: flipped.toString("base64url"), version: real.version + 1 });
  await A.page.click("#b-sync");
  check(await until(A.page, () => /déchiffré/.test(document.getElementById("sync-status").textContent)) &&
    (await A.page.getAttribute("#sync-status", "class")).includes("warn") && (await espace(A.page)).clients.length === 3,
    "compte : coffre modifié sur le serveur → refusé, Espace de l'appareil intact");
  store.vaults.set(account.id, { ...real, version: 1 });
  await A.page.click("#b-sync");
  check(await until(A.page, () => /plus ancienne/.test(document.getElementById("sync-status").textContent)),
    "compte : version plus ancienne renvoyée par le serveur → synchronisation arrêtée");
  store.vaults.set(account.id, real);
  await A.page.click("#b-sync");
  check(await until(A.page, () => /synchronisé le/.test(document.getElementById("sync-status").textContent)), "compte : coffre rétabli → synchronisation reprise");

  // ----- Export et suppression -------------------------------------------------------------------------------
  const [download] = await Promise.all([A.page.waitForEvent("download"), A.page.click("#b-export")]);
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  check(exported.account.email === "camille@exemple.fr" && exported.vault.version >= 3 && !JSON.stringify(exported).includes("Studio Nova"),
    "compte : export des données du serveur (coffre chiffré)");
  await A.page.click(".danger-zone summary");
  await A.page.click("#b-delete");
  check((await text(A.page, "#c-msg")).includes("Cochez la case"), "compte : suppression sans confirmation refusée");
  await A.page.check("#c-delete-ok");
  await A.page.click("#b-delete");
  await A.page.waitForSelector("#s-signin:not([hidden])");
  check(store.accounts.size === 0 && store.vaults.size === 0 && (await espace(A.page)).clients.length === 3,
    "compte : suppression → tout effacé du serveur, Espace gardé sur l'appareil");

  check(errors.length === 0, `aucune erreur JavaScript${errors.length ? " → " + errors.join(" | ") : ""}`);
} finally {
  await browser.close();
  server.close();
}
console.log(failures.length ? `\n${failures.length} échec(s)` : "\nTous les tests passent.");
process.exit(failures.length ? 1 : 0);
