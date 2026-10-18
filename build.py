"""Génère le site statique dans docs/ (servi par GitHub Pages).

Chaque page de src/pages/ commence par un commentaire HTML contenant ses métadonnées en JSON :
    <!--{"title": "...", "description": "...", "path": "calculateur-tjm/", ...}-->
Le reste du fichier est le contenu de la page, inséré dans src/layout.html.

Usage : python3 build.py
"""
import hashlib
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
SRC, OUT = ROOT / "src", ROOT / "docs"
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
SITE_URL = CONFIG["site_url"].rstrip("/")  # ex. https://smileylab95.github.io/outils-freelance
BASE = CONFIG["base"]                       # ex. /outils-freelance/
KIT_URL = CONFIG["kit_url"]

META_RE = re.compile(r"\A\s*<!--(.*?)-->\s*", re.S)


def read_page(path):
    text = path.read_text(encoding="utf-8")
    m = META_RE.match(text)
    if not m:
        raise SystemExit(f"{path} : métadonnées JSON manquantes")
    return json.loads(m.group(1)), text[m.end():]


def asset_url(name):
    """URL d'un fichier de src/assets, avec une empreinte pour forcer le rafraîchissement du cache."""
    digest = hashlib.sha1((SRC / "assets" / name).read_bytes()).hexdigest()[:8]
    return f"{BASE}assets/{name}?v={digest}"


def faq_html(faq):
    items = "\n".join(
        f'<details class="faq-item"><summary>{html.escape(q)}</summary><div>{a}</div></details>' for q, a in faq
    )
    return f'<section class="section faq" id="faq"><h2>Questions fréquentes</h2>{items}</section>'


def json_ld(meta, url):
    graph = []
    if meta.get("app"):
        graph.append({
            "@type": "WebApplication",
            "name": meta["app"],
            "url": url,
            "description": meta["description"],
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Tous (navigateur web)",
            "inLanguage": "fr-FR",
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
        })
    if meta.get("faq"):
        graph.append({
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": q,
                 "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}}
                for q, a in meta["faq"]
            ],
        })
    if meta["path"] == "":
        graph.append({"@type": "WebSite", "name": CONFIG["site_name"], "url": SITE_URL + "/", "inLanguage": "fr-FR"})
    if not graph:
        return ""
    data = {"@context": "https://schema.org", "@graph": graph}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def render(layout, meta, content, kit_cta):
    url = f"{SITE_URL}/{meta['path']}"
    if meta.get("faq"):
        content += faq_html(meta["faq"])
    scripts = "".join(f'<script src="{asset_url(s)}" defer></script>' for s in ["app.js", *meta.get("scripts", [])])
    nav = meta.get("nav", "")
    values = {
        "title": html.escape(meta["title"]),
        "description": html.escape(meta["description"]),
        "canonical": url,
        "robots": "noindex" if meta.get("noindex") else "index, follow",
        "og_image": f"{SITE_URL}/assets/og.png",
        "css": asset_url("style.css"),
        "scripts": scripts,
        "jsonld": json_ld(meta, url),
        "content": content,
        "year": str(date.today().year),
    }
    page = layout
    for key, value in values.items():
        page = page.replace("{{" + key + "}}", value)
    # Lien actif dans le menu
    page = page.replace(f'data-nav="{nav}"', f'data-nav="{nav}" aria-current="page"') if nav else page
    page = page.replace("{{kit_cta}}", kit_cta)
    page = page.replace("{{base}}", BASE).replace("{{kit_url}}", KIT_URL)
    return page


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    shutil.copytree(SRC / "assets", OUT / "assets")
    (OUT / ".nojekyll").write_text("")

    layout = (SRC / "layout.html").read_text(encoding="utf-8")
    kit_cta = (SRC / "kit-cta.html").read_text(encoding="utf-8")
    urls = []
    for path in sorted((SRC / "pages").glob("*.html")):
        meta, content = read_page(path)
        page = render(layout, meta, content, kit_cta)
        if path.stem == "404":
            target = OUT / "404.html"
        else:
            target = OUT / meta["path"] / "index.html"
            if not meta.get("noindex"):
                urls.append((f"{SITE_URL}/{meta['path']}", meta.get("priority", 0.7)))
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page, encoding="utf-8")
        print(f"  {target.relative_to(ROOT)}")

    today = date.today().isoformat()
    entries = "\n".join(
        f"  <url><loc>{u}</loc><lastmod>{today}</lastmod><priority>{p}</priority></url>" for u, p in urls
    )
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{entries}\n</urlset>\n',
        encoding="utf-8",
    )
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")
    print(f"{len(urls)} pages indexables, sitemap généré.")


if __name__ == "__main__":
    main()
