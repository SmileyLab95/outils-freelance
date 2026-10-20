"""Prépare les polices incorporées dans les PDF/A générés par le site (factures électroniques Factur-X).

Source : police Inter (The Inter Project Authors, licence SIL OFL 1.1, sans nom réservé), fichiers OpenType Regular et
Bold. Le script convertit les contours en TrueType (exigés par le générateur : CIDFontType2), garde les caractères
utiles aux factures (latin de base, latin-1, latin étendu A, ponctuation française, €), retire les tables inutiles,
puis écrit src/assets/engines/pdf-fonts.js : fichier de police compressé (zlib, base64) et métriques (largeurs, table
des caractères), pour que la mise en page et le fichier incorporé concordent exactement.

Prérequis : pip install fonttools
Usage : python3 scripts/polices_pdf.py Inter-Regular.otf Inter-Bold.otf
"""
import base64
import io
import json
import sys
import zlib
from pathlib import Path

from fontTools import subset
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont, newTable

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "engines" / "pdf-fonts.js"
CHARS = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + list(range(0x100, 0x180)) +
         [0x2009, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x202F, 0x20AC, 0x2212])


def to_truetype(font):
    """Contours cubiques (CFF) convertis en contours quadratiques (glyf), à la manière de l'outil otf2ttf de fontTools."""
    glyph_order = font.getGlyphOrder()
    font["loca"] = newTable("loca")
    font["glyf"] = glyf = newTable("glyf")
    glyf.glyphOrder = glyph_order
    glyf.glyphs = {}
    glyph_set = font.getGlyphSet()
    for name in glyph_order:
        pen = TTGlyphPen(glyph_set)
        glyph_set[name].draw(Cu2QuPen(pen, max_err=1.0, reverse_direction=True))
        glyf[name] = pen.glyph()
    font["maxp"] = maxp = newTable("maxp")
    maxp.tableVersion = 0x00010000
    for attr in ("maxZones", "maxTwilightPoints", "maxStorage", "maxFunctionDefs", "maxInstructionDefs",
                 "maxStackElements", "maxSizeOfInstructions", "maxComponentElements"):
        setattr(maxp, attr, 0)
    maxp.maxZones = 1
    font["post"].formatType = 2.0
    font["post"].extraNames = []
    font["post"].mapping = {}
    font["post"].glyphOrder = glyph_order
    del font["CFF "]
    if "VORG" in font:
        del font["VORG"]
    font.sfntVersion = "\x00\x01\x00\x00"
    font["head"].glyphDataFormat = 0
    return font


def prepare(path, key):
    font = TTFont(path)
    options = subset.Options()
    options.layout_features = []
    options.hinting = False
    options.notdef_outline = True
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
    options.drop_tables += ["GSUB", "GPOS", "GDEF", "STAT", "DSIG", "kern"]
    sub = subset.Subsetter(options)
    sub.populate(unicodes=CHARS)
    sub.subset(font)
    font = to_truetype(font)
    buffer = io.BytesIO()
    font.save(buffer)
    data = buffer.getvalue()
    font = TTFont(io.BytesIO(data))  # relu : identifiants des glyphes définitifs
    order = font.getGlyphOrder()
    gid = {name: i for i, name in enumerate(order)}
    cmap = {str(cp): gid[name] for cp, name in font.getBestCmap().items()}
    widths = [font["hmtx"][name][0] for name in order]
    head, hhea, os2 = font["head"], font["hhea"], font["OS/2"]
    return {
        "name": font["name"].getDebugName(6),
        "version": font["name"].getDebugName(5),
        "unitsPerEm": head.unitsPerEm,
        "ascent": hhea.ascent, "descent": hhea.descent, "capHeight": os2.sCapHeight,
        "bbox": [head.xMin, head.yMin, head.xMax, head.yMax],
        "italicAngle": font["post"].italicAngle,
        "bold": key == "bold",
        "widths": widths, "cmap": cmap,
        "length1": len(data),
        "data": base64.b64encode(zlib.compress(data, 9)).decode("ascii"),
    }


def main():
    regular, bold = sys.argv[1], sys.argv[2]
    fonts = {"regular": prepare(regular, "regular"), "bold": prepare(bold, "bold")}
    header = ("/*\n * Polices incorporées dans les PDF/A (généré par scripts/polices_pdf.py, ne pas modifier à la main).\n"
              " * Inter, copyright 2016 The Inter Project Authors (https://github.com/rsms/inter), sous-ensemble converti en\n"
              " * TrueType ; licence SIL Open Font License 1.1 : voir assets/fonts/OFL.txt.\n */\n")
    body = json.dumps(fonts, separators=(",", ":"))
    OUT.write_text(header + "(function (root, data) {\n  if (typeof module === \"object\" && module.exports) module.exports = data;\n"
                   "  else (root.OFE = root.OFE || {}).pdfFonts = data;\n})(typeof self !== \"undefined\" ? self : this, " +
                   body + ");\n", encoding="utf-8")
    for key, f in fonts.items():
        print(f"{key} : {f['name']} {f['version']}, {len(f['widths'])} glyphes, {f['length1']} octets, "
              f"{len(f['data']) * 3 // 4} octets compressés")
    print(f"Écrit : {OUT}")


if __name__ == "__main__":
    main()
