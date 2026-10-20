// Génère les images de partage (1200 × 630) de chaque section : src/assets/img/og-<section>.png.
// Usage : node scripts/og-images.mjs   (Playwright et la police Inter installés)
import { createRequire } from "module";
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

const html = (o) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; font-family: Inter, sans-serif; color: #fff; overflow: hidden;
    background: radial-gradient(circle at 88% 4%, #6d5cf6 0, rgba(109,92,246,.55) 18%, rgba(20,18,43,0) 46%),
                radial-gradient(circle at 0% 100%, rgba(147,51,234,.55) 0, rgba(20,18,43,0) 30%), #14122b; padding: 78px 80px; }
  .brand { display: flex; align-items: center; gap: 14px; font-size: 27px; font-weight: 600; }
  .logo { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #7c3aed);
    display: grid; place-items: center; font-weight: 900; font-size: 28px; }
  .brand b { color: #a5b4fc; font-weight: 700; }
  h1 { font-size: 76px; line-height: 1.02; letter-spacing: -0.04em; font-weight: 900; margin: 64px 0 26px; max-width: 900px; }
  p { font-size: 26px; line-height: 1.4; color: #d4d2f5; max-width: 900px; }
  .chips { display: flex; gap: 12px; margin-top: 26px; }
  .chips span { border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.08); border-radius: 999px; padding: 10px 18px; font-size: 20px; font-weight: 600; }
</style></head><body>
  <div class="brand"><div class="logo">F</div><span>${o.brand[0]} <b>${o.brand[1]}</b></span></div>
  <h1>${o.title}</h1><p>${o.sub}</p>
  <div class="chips">${o.chips.map((c) => `<span>${c}</span>`).join("")}</div>
</body></html>`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [name, o] of Object.entries(IMAGES)) {
  await page.setContent(html(o), { waitUntil: "load" });
  await page.screenshot({ path: path.join(root, "src", "assets", "img", `${name}.png`) });
  console.log(`${name}.png`);
}
await browser.close();
