"""Prépare les polices du site (documentation/32-design.md), au format WOFF2, servies par le site lui-même.

Sources (licence SIL Open Font License 1.1, dépôt google/fonts) :
- Bricolage Grotesque (titres) : ofl/bricolagegrotesque/BricolageGrotesque[opsz,wdth,wght].ttf ; largeur fixée à 100,
  graisse limitée à 500-800, taille optique gardée (12 à 96).
- Atkinson Hyperlegible Next (texte), Braille Institute : ofl/atkinsonhyperlegiblenext/AtkinsonHyperlegibleNext[wght].ttf
  et sa version italique ; graisse limitée à 300-800.
Le script garde les caractères du français et de l'anglais (latin de base, latin-1, latin étendu A, ponctuation,
flèches, €), ajoute l'espace fine insécable (U+202F) aux polices qui ne l'ont pas, en reprenant le dessin de l'espace
fine (U+2009), puis écrit src/assets/fonts/*.woff2. Les licences sont copiées à côté (OFL-*.txt).

Prérequis : pip install fonttools brotli
Usage : python3 scripts/polices_site.py <BricolageGrotesque.ttf> <AtkinsonHyperlegibleNext.ttf> <AtkinsonHyperlegibleNext-Italic.ttf>
"""
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "fonts"
CHARS = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) +
         [0x0178, 0x02C6, 0x02DC, 0x2009, 0x2011, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E,
          0x2022, 0x2026, 0x202F, 0x2039, 0x203A, 0x20AC, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193, 0x2194, 0x2212])
FEATURES = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum", "lnum", "pnum", "case", "frac"]


def narrow_nbsp(font):
    """Espace fine insécable (typographie française) : même dessin que l'espace fine, si la police ne l'a pas."""
    for table in font["cmap"].tables:
        if table.isUnicode() and 0x202F not in table.cmap and 0x2009 in table.cmap:
            table.cmap[0x202F] = table.cmap[0x2009]


def build(src, name, limits):
    font = TTFont(src)
    narrow_nbsp(font)
    options = subset.Options()
    options.layout_features = FEATURES
    options.name_IDs = ["*"]
    options.notdef_outline = True
    sub = subset.Subsetter(options)
    sub.populate(unicodes=CHARS)
    sub.subset(font)
    # Axes réduits après le sous-ensemble (dans l'autre ordre, fontTools perd les variations des glyphes vides).
    font = instancer.instantiateVariableFont(font, limits)
    out = OUT / f"{name}.woff2"
    font.flavor = "woff2"
    font.save(out)
    print(f"{out.name} : {out.stat().st_size // 1024} Ko")


if __name__ == "__main__":
    bricolage, atkinson, atkinson_italic = sys.argv[1:4]
    build(bricolage, "bricolage-grotesque", {"wdth": 100, "wght": (500, 800)})
    build(atkinson, "atkinson-hyperlegible-next", {"wght": (300, 800)})
    build(atkinson_italic, "atkinson-hyperlegible-next-italic", {"wght": (300, 800)})
