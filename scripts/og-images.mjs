// Génère les images de partage (1200 × 630) de chaque section : src/assets/img/og-<section>.png.
// Usage : node scripts/og-images.mjs   (Playwright installé ; polices du site dans src/assets/fonts)
import { createRequire } from "module";
import { readFileSync } from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const IMAGES = {
  og: { brand: ["Freelance", "Tools"], title: "Free tools for freelancers, country by country",
        sub: "France · United States · United Kingdom · Canada. Invoices, taxes, contracts and payments, with the 2026 rules.",
        chips: ["100% free", "No sign-up", "Gratuit, sans inscription"] },
  "og-fr": { brand: ["Outils", "Freelance"], title: "Tous les outils du freelance, gratuits",
        sub: "Factures, devis, impôts, statuts, contrats, relances et retraite : les règles 2026, calculées pour vous.",
        chips: ["100 % gratuit", "Sans inscription", "Données sur votre appareil"] },
  "og-us": { brand: ["Freelance", "Tools"], title: "Free tools for US freelancers",
        sub: "Invoices, self-employment tax, quarterly payments, contracts and retirement: 2026 IRS rules, worked out for you.",
        chips: ["100% free", "No sign-up", "Data stays on your device"] },
  "og-uk": { brand: ["Freelance", "Tools"], title: "Free tools for UK sole traders",
        sub: "Invoices, Self Assessment, VAT, Making Tax Digital, contracts and pensions: 2026/27 HMRC rules, worked out for you.",
        chips: ["100% free", "No sign-up", "Data stays on your device"] },
  "og-ca": { brand: ["Freelance", "Tools"], title: "Free tools for Canadian freelancers",
        sub: "Invoices with GST/HST, self-employed tax, instalments, contracts and RRSP: 2026 rules for every province.",
        chips: ["100% free", "No sign-up", "Data stays on your device"] },
  "og-ca-fr": { brand: ["Outils", "Freelance"], title: "Les outils gratuits du travailleur autonome",
        sub: "Factures avec TPS et TVQ, impôt, acomptes, contrats et REER : les règles 2026 de l'ARC et de Revenu Québec.",
        chips: ["100 % gratuit", "Sans inscription", "Données sur votre appareil"] },
};

// Thème « Bento » (documentation/54-themes.md, § 3) : fond gris bleuté, carte blanche arrondie, accent cobalt, polices
// du site (Manrope pour le titre, Inter pour le texte) incorporées pour que le rendu ne dépende pas de la machine.
const font = (name) => readFileSync(path.join(root, "src", "assets", "fonts", name)).toString("base64");
const FONTS = `
  @font-face { font-family: "Manrope"; src: url(data:font/woff2;base64,${font("manrope.woff2")}) format("woff2"); font-weight: 500 800; }
  @font-face { font-family: "Inter"; src: url(data:font/woff2;base64,${font("inter.woff2")}) format("woff2"); font-weight: 300 900; }`;
const LOGO = '<svg width="52" height="52" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#2a55f5"/>' +
  '<path d="M10 9h12v3.2h-8.4v3.3h7.4v3.2h-7.4V23H10z" fill="#fff"/><circle cx="23.5" cy="22.5" r="3" fill="#f5a524"/></svg>';

const html = (o) => `<!doctype html><html><head><meta charset="utf-8"><style>${FONTS}
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #eef1f6; padding: 40px; font-family: Inter, sans-serif; color: #0b1324; }
  .card { position: relative; height: 100%; background: #fff; border-radius: 40px; padding: 56px 64px;
    box-shadow: 0 1px 2px rgba(11,19,36,.04), 0 24px 60px rgba(11,19,36,.08); overflow: hidden; }
  .card::after { content: ""; position: absolute; right: -90px; top: -90px; width: 320px; height: 320px; border-radius: 80px;
    background: #e9eeff; transform: rotate(18deg); }
  .brand { position: relative; z-index: 1; display: flex; align-items: center; gap: 16px; font-family: Manrope, Inter, sans-serif;
    font-size: 28px; font-weight: 600; letter-spacing: -0.015em; }
  .brand b { color: #1c3fd1; font-weight: 800; }
  h1 { position: relative; z-index: 1; font-family: Manrope, Inter, sans-serif; font-size: 70px; line-height: 1.04; letter-spacing: -0.05em;
    font-weight: 800; margin: 52px 0 22px; max-width: 920px; }
  p { font-size: 26px; line-height: 1.4; color: #475467; max-width: 900px; }
  .chips { position: absolute; left: 64px; bottom: 52px; display: flex; gap: 12px; }
  .chips span { border-radius: 999px; padding: 11px 20px; font-size: 20px; font-weight: 650; background: #e9eeff; color: #1a3bc2; }
  .chips span:first-child { background: #2a55f5; color: #fff; }
</style></head><body><div class="card">
  <div class="brand">${LOGO}<span>${o.brand[0]} <b>${o.brand[1]}</b></span></div>
  <h1>${o.title}</h1><p>${o.sub}</p>
  <div class="chips">${o.chips.map((c) => `<span>${c}</span>`).join("")}</div>
</div></body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [name, o] of Object.entries(IMAGES)) {
  await page.setContent(html(o), { waitUntil: "load" });
  await page.screenshot({ path: path.join(root, "src", "assets", "img", `${name}.png`) });
  console.log(`${name}.png`);
}
await browser.close();
