"""Génère le site statique multi-pays dans docs/ (servi par GitHub Pages).

Sources :
    config/site.json        adresse du site, chemin de base, redirections des anciennes adresses
    config/locales.json     sections (pays et langue) : chemin, langue, devise, nom
    content/global/         pages hors section (accueil mondial, 404)
    content/<section>/      site.json (menu, textes, offre) + une page HTML par fichier
    data/rules/<pays>.json  chiffres officiels, sourcés et datés
    src/layout.html         gabarit commun
    src/assets/             styles, scripts, images

Chaque page commence par ses métadonnées en JSON dans un commentaire HTML (voir documentation/03-architecture.md).

Usage : python3 build.py
        OF_DRAFTS=1 python3 build.py   construit aussi les pages en brouillon (« draft »), dans brouillons/ (jamais
                                       publié) ; OF_API_URL : adresse de l'API des comptes (défaut /api/v1)
"""
import hashlib
import html
import json
import os
import re
import shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
# Brouillons (comptes en ligne avant leur ouverture, documentation/23-serveur-et-connexion.md § 5) : construits
# seulement à la demande, dans un dossier séparé, ignoré par git ; le site publié (docs/) ne les contient jamais.
DRAFTS = os.environ.get("OF_DRAFTS") == "1"
SRC, CONTENT, OUT = ROOT / "src", ROOT / "content", ROOT / ("brouillons" if DRAFTS else "docs")
SITE = json.loads((ROOT / "config" / "site.json").read_text(encoding="utf-8"))
LOCALES = json.loads((ROOT / "config" / "locales.json").read_text(encoding="utf-8"))
SITE_URL = SITE["site_url"].rstrip("/")  # ex. https://smileylab95.github.io/outils-freelance
BASE = SITE["base"]                       # ex. /outils-freelance/

META_RE = re.compile(r"\A\s*<!--(.*?)-->\s*", re.S)
LINK_RE = re.compile(r"\{\{link:(?:([a-z-]+)/)?([a-z0-9-]+)\}\}")   # {{link:id}} ou {{link:section/id}}
LOGO_SVG = (
    '<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" '
    'x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>'
    '</defs><rect width="32" height="32" rx="9" fill="url(#lg)"/><path d="M10 9h12v3.2h-8.4v3.3h7.4v3.2h-7.4V23H10z" '
    'fill="#fff"/></svg>'
)
GLOBAL = {
    "key": "global", "dir": "global", "path": "", "lang": "en", "country": "", "currency": "EUR",
    "name": "International", "language": "", "live": True,
}
GLOBAL_SITE = {
    "brand": ["Freelance", "Tools"],
    "nav": [],
    "strings": {
        "skip": "Skip to content", "menu": "Menu", "home": "Home", "country": "Country",
        "country_label": "Choose your country", "logo_label": "Freelance Tools, home",
        "tagline": "Free tools for freelancers and the self-employed · Outils gratuits pour les indépendants.",
        "privacy_note": "🔒 Everything runs in your browser · Tout est calculé dans votre navigateur.",
        "disclaimer": "For information only · À titre indicatif.", "site": "Countries",
    },
}


# ---------------------------------------------------------------------------
# Lecture des sources
# ---------------------------------------------------------------------------

def read_page(path):
    text = path.read_text(encoding="utf-8")
    m = META_RE.match(text)
    if not m:
        raise SystemExit(f"{path} : métadonnées JSON manquantes")
    meta = json.loads(m.group(1))
    for key in ("id", "slug", "title", "description"):
        if key not in meta:
            raise SystemExit(f"{path} : clé « {key} » manquante")
    return meta, text[m.end():]


class Rules(dict):
    """Fichiers data/rules/<pays>.json, lus seulement quand une page en a besoin, complétés par les règles communes
    de data/rules/shared.json (système d'un autre pays cité par plusieurs sections : TVA de l'UE, formulaires
    américains) ; une même clé ne peut pas figurer dans les deux fichiers."""

    def __missing__(self, country):
        path = ROOT / "data" / "rules" / f"{country}.json"
        if not path.exists():
            raise SystemExit(f"Règles introuvables : {path.relative_to(ROOT)}")
        data = json.loads(path.read_text(encoding="utf-8"))
        shared = json.loads((ROOT / "data" / "rules" / "shared.json").read_text(encoding="utf-8"))["values"]
        twice = sorted(set(shared) & set(data["values"]))
        if twice:
            raise SystemExit(f"{path.relative_to(ROOT)} : règles déjà dans data/rules/shared.json {twice}")
        data["values"].update(shared)
        self[country] = data
        return self[country]


def load_sections():
    """Sections actives : celles marquées « live » dont le dossier de contenu existe."""
    sections = []
    for loc in [GLOBAL] + LOCALES:
        folder = CONTENT / loc["dir"]
        if not loc["live"] or not folder.exists():
            continue
        site_file = folder / "site.json"
        site = json.loads(site_file.read_text(encoding="utf-8")) if site_file.exists() else GLOBAL_SITE
        pages = {}
        for path in sorted(folder.glob("*.html")):
            if path.name == site.get("offer", {}).get("cta"):
                continue
            meta, content = read_page(path)
            if meta.get("draft") and not DRAFTS:
                continue
            if meta["id"] in pages:
                raise SystemExit(f"{path} : identifiant « {meta['id']} » déjà utilisé dans {loc['dir']}")
            pages[meta["id"]] = {"meta": meta, "content": content, "file": path}
        sections.append({"loc": loc, "site": site, "pages": pages, "folder": folder})
    return sections


# ---------------------------------------------------------------------------
# Adresses
# ---------------------------------------------------------------------------

def page_path(section, page_id):
    """Chemin relatif à la racine du site : « fr/generateur-facture/ »."""
    return section["loc"]["path"] + section["pages"][page_id]["meta"]["slug"]


def href(section, page_id):
    return BASE + page_path(section, page_id)


def absolute(path):
    return f"{SITE_URL}/{path}"


def asset_url(name):
    """URL d'un fichier de src/assets, avec une empreinte pour forcer le rafraîchissement du cache."""
    digest = hashlib.sha1((SRC / "assets" / name).read_bytes()).hexdigest()[:8]
    return f"{BASE}assets/{name}?v={digest}"


# ---------------------------------------------------------------------------
# Blocs générés
# ---------------------------------------------------------------------------

def esc(text):
    return html.escape(text, quote=True)


def nav_item(section, page_id, current_id):
    meta = section["pages"][page_id]["meta"]
    current = ' aria-current="page"' if page_id == current_id else ""
    return (
        f'<a class="nav-item" href="{href(section, page_id)}"{current}>'
        f'<span class="ico" aria-hidden="true">{meta.get("icon", "•")}</span>'
        f'<span><b>{esc(meta.get("menu", meta["title"]))}</b><small>{esc(meta.get("blurb", ""))}</small></span></a>'
    )


def nav_html(section, current_id):
    groups = []
    for group in section["site"].get("nav", []):
        items = [i for i in group["items"] if i in section["pages"]]
        if not items:
            continue
        active = " is-active" if current_id in items else ""
        links = "".join(nav_item(section, i, current_id) for i in items)
        groups.append(
            f'<div class="nav-group{active}"><button class="nav-trigger" type="button" aria-expanded="false">'
            f'{esc(group["label"])}</button><div class="nav-menu">{links}</div></div>'
        )
    offer = section["site"].get("offer")
    if offer:
        groups.append(f'<a class="btn btn-kit nav-offer" href="{esc(offer["url"])}" rel="noopener">{esc(offer["button"])}</a>')
    return "".join(groups)


def equivalents(sections, page_id):
    """Pages portant le même identifiant dans les autres sections : {clé de section: chemin}."""
    found = {}
    for s in sections:
        if s["loc"]["key"] != "global" and page_id in s["pages"]:
            found[s["loc"]["key"]] = page_path(s, page_id)
    return found


def country_switch(sections, section, page_id):
    s = section["site"]["strings"]
    alts = equivalents(sections, page_id)
    links = []
    for other in sections:
        loc = other["loc"]
        if loc["key"] == "global":
            continue
        path = alts.get(loc["key"]) or page_path(other, "home")
        current = ' aria-current="true"' if loc["key"] == section["loc"]["key"] else ""
        links.append(
            f'<a class="nav-item" href="{BASE}{path}" hreflang="{loc["lang"]}" lang="{loc["lang"]}"{current}>'
            f'<span class="cc" aria-hidden="true">{loc["country"]}</span>'
            f'<span><b>{esc(loc["name"])}</b><small>{esc(loc["language"])}</small></span></a>'
        )
    links.append(f'<a class="nav-all" href="{BASE}">{esc(s["country_label"])} →</a>')
    # Le nom accessible commence par le texte affiché (« FR »), pour la commande vocale (WCAG 2.5.3) ; l'emoji de la
    # section mondiale est décoratif.
    colon = " : " if section["loc"]["lang"].startswith("fr") else ": "
    label = esc(f'{s["country"]}{colon}{section["loc"]["name"]}')
    code = section["loc"]["country"]
    visible = f'<span class="cc">{code}</span><span class="sr-only">, {label}</span>' if code else \
        f'<span class="cc" aria-hidden="true">🌐</span><span class="sr-only">{label}</span>'
    return (
        f'<div class="nav-group country-switch"><button class="nav-trigger" type="button" aria-expanded="false">'
        f'{visible}</button>'
        f'<div class="nav-menu nav-menu-right">{"".join(links)}</div></div>'
    )


def footer_html(sections, section):
    s = section["site"]["strings"]
    brand = section["site"]["brand"]
    cols = [
        f'<div class="footer-brand"><a class="logo logo-footer" href="{BASE}{section["loc"]["path"]}">'
        f'<span>{esc(brand[0])} <b>{esc(brand[1])}</b></span></a>'
        + (f'<p class="audience">{esc(section["site"]["audience"])}</p>' if section["site"].get("audience") else "")
        + f'<p>{esc(s["tagline"])}</p><p class="privacy-note">{esc(s["privacy_note"])}</p></div>'
    ]
    for group in section["site"].get("nav", []):
        items = [i for i in group["items"] if i in section["pages"]]
        if items:
            lis = "".join(
                f'<li><a href="{href(section, i)}">{esc(section["pages"][i]["meta"].get("menu", ""))}</a></li>' for i in items
            )
            cols.append(f'<div><h2>{esc(group["label"])}</h2><ul>{lis}</ul></div>')
    site_links = [
        f'<li><a href="{href(section, i)}">{esc(section["pages"][i]["meta"].get("menu", i))}</a></li>'
        for i in section["site"].get("footer_links", []) if i in section["pages"]
    ]
    for other in sections:
        loc = other["loc"]
        if loc["key"] not in ("global", section["loc"]["key"]):
            site_links.append(
                f'<li><a href="{BASE}{loc["path"]}" hreflang="{loc["lang"]}" lang="{loc["lang"]}">'
                f'{esc(loc["name"])} · {esc(loc["language"])}</a></li>'
            )
    if site_links:
        cols.append(f'<div><h2>{esc(s["site"])}</h2><ul>{"".join(site_links)}</ul></div>')
    return "".join(cols)


def card(section, page_id, featured=False):
    meta = section["pages"][page_id]["meta"]
    cls = "tool-card featured" if featured else "tool-card"
    return (
        f'<a class="{cls}" href="{href(section, page_id)}"><span class="ico" aria-hidden="true">{meta.get("icon", "•")}</span>'
        f'<h3>{esc(meta.get("menu", meta["title"]))}</h3><p>{esc(meta.get("blurb", ""))}</p>'
        f'<span class="go" aria-hidden="true">→</span></a>'
    )


def featured_html(section):
    ids = [i for i in section["site"].get("featured", []) if i in section["pages"]]
    return '<div class="grid-featured">' + "".join(card(section, i, featured=(n == 0)) for n, i in enumerate(ids)) + "</div>"


def tools_grid(section):
    panels = []
    for group in section["site"].get("nav", []):
        items = [i for i in group["items"] if i in section["pages"]]
        if not items:
            continue
        rows = "".join(nav_item(section, i, None) for i in items)
        panels.append(f'<div class="category"><h3>{esc(group["label"])}</h3><div class="category-items">{rows}</div></div>')
    return '<div class="grid-categories">' + "".join(panels) + "</div>"


def country_cards(sections):
    """Cartes de choix du pays (accueil mondial, 404) : sections en ligne et sections à venir."""
    live = {s["loc"]["key"]: s for s in sections}
    cards = []
    for loc in LOCALES:
        head = (f'<span class="cc cc-lg" aria-hidden="true">{loc["country"]}</span>'
                f'<span class="cc-text"><b>{esc(loc["name"])}</b><small>{esc(loc["language"])}</small></span>')
        section = live.get(loc["key"])
        if section:
            tools = sum(len(g["items"]) for g in section["site"].get("nav", []))
            count = section["site"]["strings"].get("tools_count", "{n}").replace("{n}", str(tools))
            cards.append(
                f'<a class="country-card" href="{BASE}{loc["path"]}" hreflang="{loc["lang"]}" lang="{loc["lang"]}" '
                f'data-lang="{loc["lang"]}">{head}<span class="count">{esc(count)}</span>'
                f'<span class="go" aria-hidden="true">→</span></a>'
            )
        else:
            cards.append(f'<div class="country-card is-soon" lang="{loc["lang"]}">{head}'
                         f'<span class="count">Coming soon · Bientôt</span></div>')
    return '<div class="grid-countries">' + "".join(cards) + "</div>"


def related_html(section, page_id):
    """Les autres outils du même groupe, puis ceux mis en avant."""
    strings = section["site"]["strings"]
    group = next((g["items"] for g in section["site"].get("nav", []) if page_id in g["items"]), [])
    ids = [i for i in group if i != page_id]
    ids += [i for i in section["site"].get("featured", []) if i != page_id and i not in ids]
    ids = [i for i in ids if i in section["pages"]][:3]
    if not ids:
        return ""
    cards = "".join(card(section, i) for i in ids)
    return f'<section class="section related"><h2>{esc(strings["related"])}</h2><div class="grid-tools">{cards}</div></section>'


def sources_html(section, meta, rules):
    keys = meta.get("sources")
    if not keys:
        return ""
    data = rules[meta["rules"]]
    strings = section["site"]["strings"]
    items = []
    seen = set()
    for key in keys:
        entry = data["values"].get(key)
        if not entry:
            raise SystemExit(f"{meta['slug']} : la source « {key} » n'existe pas dans data/rules/{meta['rules']}.json")
        # Une règle qui rassemble plusieurs textes (un taux par province, par exemple) liste aussi ses autres sources.
        for ref in [entry] + entry.get("more_sources", []):
            if ref["source"] in seen:
                continue
            seen.add(ref["source"])
            title = ref.get("source_title") or ref["source"]
            items.append(f'<li><a href="{esc(ref["source"])}" rel="noopener">{esc(title)}</a></li>')
    # Date de vérification du fichier, ou plus récente si l'une des règles citées a été lue depuis (« verified_on »).
    verified = max([date.fromisoformat(data["verified_on"])] +
                   [date.fromisoformat(data["values"][k]["verified_on"]) for k in keys if "verified_on" in data["values"][k]])
    # Date dans l'usage du pays : 20/10/2026, 20 October 2026 (Royaume-Uni), October 20, 2026 (États-Unis, Canada).
    lang = section["loc"]["lang"]
    shown = verified.strftime("%d/%m/%Y" if lang.startswith("fr") else "%-d %B %Y" if lang == "en-GB" else "%B %-d, %Y")
    return (
        f'<section class="section sources"><h2>{esc(strings["sources"])}</h2><ul>{"".join(items)}</ul>'
        f'<p class="small muted">{esc(strings["verified"])} {shown}.</p></section>'
    )


def faq_html(section, faq):
    items = "\n".join(
        f'<details class="faq-item"><summary>{esc(q)}</summary><div>{a}</div></details>' for q, a in faq
    )
    return f'<section class="section faq" id="faq"><h2>{esc(section["site"]["strings"]["faq"])}</h2>{items}</section>'


def breadcrumb(section, page_id):
    meta = section["pages"][page_id]["meta"]
    s = section["site"]["strings"]
    if page_id == "home" or section["loc"]["key"] == "global":
        return ""
    return (
        f'<nav class="breadcrumb" aria-label="{esc(s.get("breadcrumb", "Breadcrumb"))}"><a href="{href(section, "home")}">'
        f'<span class="cc">{section["loc"]["country"]}</span> {esc(section["loc"]["name"])}</a> › '
        f'<span aria-current="page">{esc(meta.get("menu", meta["title"]))}</span></nav>'
    )


def json_ld(section, page_id, url):
    meta = section["pages"][page_id]["meta"]
    loc = section["loc"]
    graph = []
    if meta.get("app"):
        graph.append({
            "@type": "WebApplication", "name": meta["app"], "url": url, "description": meta["description"],
            "applicationCategory": "BusinessApplication", "operatingSystem": "Any (web browser)",
            "inLanguage": loc["lang"], "offers": {"@type": "Offer", "price": "0", "priceCurrency": loc["currency"]},
        })
    if meta.get("faq"):
        graph.append({
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}}
                for q, a in meta["faq"]
            ],
        })
    if page_id != "home" and loc["key"] != "global":
        graph.append({
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": loc["name"], "item": absolute(page_path(section, "home"))},
                {"@type": "ListItem", "position": 2, "name": meta.get("menu", meta["title"]), "item": url},
            ],
        })
    if page_id == "home":
        brand = " ".join(section["site"]["brand"])
        graph.append({"@type": "WebSite", "name": brand, "url": url, "inLanguage": loc["lang"]})
    if not graph:
        return ""
    data = {"@context": "https://schema.org", "@graph": graph}
    return f'<script type="application/ld+json">{json.dumps(data, ensure_ascii=False)}</script>'


def alternates(sections, section, page_id):
    """Balises hreflang entre pages équivalentes ; x-default vers l'accueil mondial."""
    if section["loc"]["key"] == "global" and page_id != "home":
        return ""
    alts = equivalents(sections, page_id)
    if section["loc"]["key"] == "global":
        alts = {s["loc"]["key"]: page_path(s, "home") for s in sections if s["loc"]["key"] != "global"}
    if len(alts) < 1:
        return ""
    by_key = {s["loc"]["key"]: s["loc"] for s in sections}
    tags = [f'<link rel="alternate" hreflang="{by_key[k]["lang"]}" href="{absolute(p)}">' for k, p in alts.items()]
    if page_id == "home":
        tags.append(f'<link rel="alternate" hreflang="x-default" href="{SITE_URL}/">')
    return "\n".join(tags)


def typo_script(loc):
    """Pages en français : règles de typographie (data/typo-fr.json) pour engines/typo-fr.js, window.OF_TYPO."""
    if not loc["lang"].startswith("fr"):
        return ""
    return "<script>window.OF_TYPO=" + json.dumps(TYPO["rules"], ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + ";</script>"


def rules_script(meta, rules):
    """Valeurs des règles du pays (sans les sources), lisibles par les scripts : window.OF_RULES."""
    if not meta.get("rules"):
        return ""
    values = {k: v["value"] for k, v in rules[meta["rules"]]["values"].items()}
    extra = {k: v for k, v in rules[meta["rules"]].items() if k not in ("values", "open_questions")}
    payload = json.dumps({**values, "_meta": extra}, ensure_ascii=False, separators=(",", ":"))
    return f"<script>window.OF_RULES={payload};</script>"


# ---------------------------------------------------------------------------
# Rendu d'une page
# ---------------------------------------------------------------------------

def resolve_links(text, section, sections):
    """{{link:id}} : page de la même section ; {{link:ca-fr/id}} : page d'une autre section (autre langue)."""
    def repl(m):
        key, page_id = m.group(1) or section["loc"]["key"], m.group(2)
        target = next((s for s in sections if s["loc"]["key"] == key), None)
        if target is None or page_id not in target["pages"]:
            raise SystemExit(f"Lien vers une page inconnue « {m.group(0)} » dans la section {section['loc']['key']}")
        return href(target, page_id)
    return LINK_RE.sub(repl, text)


CALENDAR_RE = re.compile(r"\{\{calendar:([a-z]+)\}\}")


def calendar_json(country, lang):
    """Échéances de data/calendars/<pays>.json, textes dans la langue de la section, prêtes pour une balise <script>."""
    data = json.loads((ROOT / "data" / "calendars" / f"{country}.json").read_text(encoding="utf-8"))
    pick = lambda v: v.get(lang, v["en"]) if isinstance(v, dict) else v
    for e in data["events"]:
        for k in ("tag", "title", "desc"):
            e[k] = pick(e[k])
        if e.get("link"):
            e["link"] = "{{link:" + e["link"] + "}}"
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


SCROLL_RE = re.compile(r'<h2[^>]*>(.*?)</h2>|<div class="table-scroll">', re.S)


def label_scroll_tables(content, slug):
    """Tableaux défilants : accessibles au clavier (tabindex) et nommés par le titre qui les précède (WCAG 2.1.1)."""
    heading = [""]

    def repl(m):
        if m.group(1) is not None:
            heading[0] = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip()
            return m.group(0)
        if not heading[0]:
            raise SystemExit(f"{slug} : tableau défilant sans titre <h2> avant lui (nom accessible)")
        return f'<div class="table-scroll" tabindex="0" role="region" aria-label="{esc(heading[0])}">'
    content = SCROLL_RE.sub(repl, content)
    if len(re.findall(r'class="[^"]*\btable-scroll\b', content)) != content.count('class="table-scroll" tabindex="0"'):
        raise SystemExit(f'{slug} : tableau défilant à écrire exactement <div class="table-scroll">')
    return content


def render(layout, sections, section, page_id, rules, kit_cta):
    page = section["pages"][page_id]
    meta, content = page["meta"], page["content"]
    loc, site, strings = section["loc"], section["site"], section["site"]["strings"]
    path = page_path(section, page_id)
    url = absolute(path)

    content = (content.replace("{{breadcrumb}}", breadcrumb(section, page_id))
               .replace("{{tools_grid}}", tools_grid(section))
               .replace("{{featured}}", featured_html(section))
               .replace("{{country_cards}}", country_cards(sections))
               .replace("{{kit_cta}}", kit_cta))
    content = CALENDAR_RE.sub(lambda m: calendar_json(m.group(1), loc["lang"][:2]), content)
    content = label_scroll_tables(content, meta["slug"])
    if meta.get("faq"):
        content += faq_html(section, meta["faq"])
    content += sources_html(section, meta, rules)
    if meta.get("menu") and any(page_id in g["items"] for g in site.get("nav", [])):
        content += related_html(section, page_id)

    # Pages en français : typographie du texte que les scripts des outils produisent (engines/typo-fr.js).
    base_scripts = ["engines/typo-fr.js", "app.js"] if loc["lang"].startswith("fr") else ["app.js"]
    # Scripts réservés aux brouillons (synchronisation des comptes) : absents du site publié.
    page_scripts = [*meta.get("scripts", []), *(meta.get("draft_scripts", []) if DRAFTS else [])]
    scripts = "".join(f'<script src="{asset_url(s)}" defer></script>' for s in [*base_scripts, *page_scripts])
    if DRAFTS and (meta.get("api") or meta.get("draft_scripts")):
        scripts = f"<script>window.OF_API={json.dumps(os.environ.get('OF_API_URL', '/api/v1'))};</script>" + scripts
    # Scripts chargés à la demande par la page (ex. génération du PDF Factur-X) : adresses avec leur empreinte de version.
    if meta.get("lazy_scripts"):
        lazy = {name: asset_url(name) for name in meta["lazy_scripts"]}
        scripts += '<script type="application/json" id="lazy-scripts">' + json.dumps(lazy).replace("</", "<\\/") + "</script>"
    offer = site.get("offer")
    brand = site["brand"]
    values = {
        "lang": loc["lang"],
        "og_locale": loc["lang"].replace("-", "_"),
        "currency": loc["currency"],
        "section": loc["key"],
        "title": esc(meta["title"]),
        "description": esc(meta["description"]),
        "canonical": url,
        "robots": "noindex" if meta.get("noindex") or meta.get("draft") else "index, follow",
        "og_image": f"{SITE_URL}/assets/img/" + (f"og-{loc['key']}.png" if (ROOT / "src" / "assets" / "img" / f"og-{loc['key']}.png").exists() else "og.png"),
        "gsv": SITE.get("google_site_verification", ""),
        "css": asset_url("style.css"),
        "alternates": alternates(sections, section, page_id),
        "rules": rules_script(meta, rules) + typo_script(loc),
        "scripts": scripts,
        "jsonld": json_ld(section, page_id, url),
        "skip": esc(strings["skip"]),
        "logo_label": esc(strings["logo_label"]),
        "logo_svg": LOGO_SVG,
        "brand": f'{esc(brand[0])} <b>{esc(brand[1])}</b>',
        "brand_text": esc(" ".join(brand)),
        "nav": nav_html(section, page_id),
        "country_switch": country_switch(sections, section, page_id),
        "offer_button": f'<a class="btn btn-kit header-offer" href="{esc(offer["url"])}" rel="noopener">{esc(offer["button"])}</a>' if offer else "",
        "menu_toggle": (f'<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">'
                        f'<span class="bars" aria-hidden="true"></span>{esc(strings["menu"])}</button>') if site.get("nav") else "",
        "footer": footer_html(sections, section),
        "disclaimer": esc(strings["disclaimer"]),
        "year": str(date.today().year),
        "content": content,
    }
    out = layout
    for key, value in values.items():
        out = out.replace("{{" + key + "}}", value)
    out = out.replace("{{home}}", BASE + loc["path"])
    out = resolve_links(out, section, sections)
    if offer:
        out = out.replace("{{kit_url}}", offer["url"])
    out = out.replace("{{base}}", BASE)
    if loc["lang"].startswith("fr"):
        out = typographie_fr(out)
    leftover = re.findall(r"\{\{[a-z_:-]+\}\}", out)
    if leftover:
        raise SystemExit(f"{page['file']} : remplacements non résolus {sorted(set(leftover))}")
    return out


# ---------------------------------------------------------------------------
# Typographie française (documentation/15-guides-gestion.md, § 3)
# ---------------------------------------------------------------------------

NBSP, NNBSP = "\u00a0", "\u202f"   # espace insécable, espace fine insécable
# Une balise commence par une lettre, « / » ou « ! » : un « < » isolé dans le texte (« CA < 77 700 € ») n'en est pas une.
TAG_RE = re.compile(r"(<!--.*?-->|<[!/a-zA-Z][^>]*>)", re.S)
RAW_TAGS = ("script", "style", "code", "pre", "textarea")   # contenu jamais retouché
TYPO = json.loads((ROOT / "data" / "typo-fr.json").read_text(encoding="utf-8"))


def typo_rule(rule):
    """Règle de data/typo-fr.json → (motif compilé, remplacement) ; $1 devient \\g<1>."""
    pattern = re.compile(rule["find"])
    if "group" in rule:
        n, spaces = rule["group"], rule["spaces"]
        return pattern, lambda m: (m.group(0)[:m.start(n) - m.start(0)] + m.group(n).replace(" ", spaces)
                                   + m.group(0)[m.end(n) - m.start(0):])
    return pattern, re.sub(r"\$(\d)", r"\\g<\1>", rule["replace"])


TYPO_FR = [typo_rule(r) for r in TYPO["rules"]]


def typo_fr_text(text):
    """Espaces insécables d'un texte français : guillemets, « : ; ! ? », nombres (et ce qui les suit), références."""
    for pattern, repl in TYPO_FR:
        text = pattern.sub(repl, text)
    return text


def typographie_fr(page_html):
    """Applique typo_fr_text au seul texte visible : ni balises ni attributs, ni script, style, code, pre, textarea."""
    out, raw = [], None
    for token in TAG_RE.split(page_html):
        if token.startswith("<"):
            name = re.match(r"</?([a-zA-Z0-9]+)", token)
            name = name.group(1).lower() if name else ""
            if raw is None and name in RAW_TAGS and not token.startswith("</") and not token.endswith("/>"):
                raw = name
            elif raw == name and token.startswith("</"):
                raw = None
            out.append(token)
        else:
            out.append(token if raw else typo_fr_text(token))
    return "".join(out)


def redirect_page(target):
    url = absolute(target)
    return (
        '<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        f'<title>Page déplacée</title><link rel="canonical" href="{url}">'
        f'<meta http-equiv="refresh" content="0; url={BASE}{target}">'
        f'<script>location.replace("{BASE}{target}" + location.search + location.hash);</script></head>'
        f'<body><p>Cette page a déménagé : <a href="{BASE}{target}">{url}</a></p></body></html>\n'
    )


def draft_only_assets():
    """Scripts chargés seulement par les brouillons (pages « draft », « draft_scripts ») : absents du site publié."""
    draft, public = set(), set()
    for path in CONTENT.glob("*/*.html"):
        if not META_RE.match(path.read_text(encoding="utf-8")):
            continue   # fragment inclus dans d'autres pages (encart de l'offre)
        meta, _ = read_page(path)
        (draft if meta.get("draft") else public).update(meta.get("scripts", []) + meta.get("lazy_scripts", []))
        draft.update(meta.get("draft_scripts", []))
    return sorted(draft - public)


# ---------------------------------------------------------------------------
# Programme principal
# ---------------------------------------------------------------------------

def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    shutil.copytree(SRC / "assets", OUT / "assets")
    (OUT / ".nojekyll").write_text("")
    if not DRAFTS:
        for name in draft_only_assets():
            (OUT / "assets" / name).unlink()

    layout = (SRC / "layout.html").read_text(encoding="utf-8")
    rules = Rules()
    sections = load_sections()
    urls = []
    for section in sections:
        offer = section["site"].get("offer")
        kit_cta = (section["folder"] / offer["cta"]).read_text(encoding="utf-8") if offer and offer.get("cta") else ""
        for page_id in section["pages"]:
            meta = section["pages"][page_id]["meta"]
            html_out = render(layout, sections, section, page_id, rules, kit_cta)
            path = page_path(section, page_id)
            target = OUT / (path if path.endswith(".html") else path + "index.html")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(html_out, encoding="utf-8")
            if not meta.get("noindex") and not meta.get("draft"):
                urls.append((absolute(path), meta.get("priority", 0.7)))
        print(f"  {section['loc']['key']:7} {len(section['pages'])} pages")

    taken = {u for u, _ in urls}
    for old, new in SITE.get("redirects", {}).items():
        if absolute(old) in taken:
            raise SystemExit(f"Redirection « {old} » : cette adresse est déjà une page")
        target = OUT / old / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(redirect_page(new), encoding="utf-8")

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
    print(f"{len(urls)} pages indexables, {len(SITE.get('redirects', {}))} redirections, sitemap généré.")


if __name__ == "__main__":
    main()
