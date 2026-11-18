"""Prépare les polices du site (thème « Bento », documentation/54-themes.md § 3.3), au format WOFF2, servies par le site.

Sources (licence SIL Open Font License 1.1, dépôt google/fonts) :
- Manrope (titres, chiffres clés), The Manrope Project Authors : ofl/manrope/Manrope[wght].ttf ; graisse limitée à
  500-800.
- Inter (texte), The Inter Project Authors : ofl/inter/Inter[opsz,wght].ttf et sa version italique
  Inter-Italic[opsz,wght].ttf ; graisse limitée à 300-900, taille optique gardée (14 à 32).
Le script garde les caractères du français et de l'anglais (latin de base, latin-1, latin étendu A, ponctuation,
flèches, €), ajoute l'espace fine insécable (U+202F) aux polices qui ne l'ont pas mais ont l'espace fine (U+2009), puis
écrit src/assets/fonts/*.woff2. Les caractères absents de Manrope (espaces fines, « ↔ », lettres rares) sont pris dans
Inter, police suivante de la pile. Les licences sont copiées à côté (OFL-*.txt).

Prérequis : pip install fonttools brotli
Usage : python3 scripts/polices_site.py <Manrope[wght].ttf> <Inter[opsz,wght].ttf> <Inter-Italic[opsz,wght].ttf>
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
    manrope, inter, inter_italic = sys.argv[1:4]
    build(manrope, "manrope", {"wght": (500, 800)})
    build(inter, "inter", {"wght": (300, 900)})
    build(inter_italic, "inter-italic", {"wght": (300, 900)})
