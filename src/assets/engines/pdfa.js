/*
 * Moteur : écriture d'un PDF/A-3 (niveau B) sans dépendance. Pages, texte en police TrueType incorporée (CIDFontType2,
 * Identity-H, ToUnicode), filets, rectangles, images JPEG, fichiers joints déclarés dans /AF (Factur-X), métadonnées
 * XMP, profil sRGB en OutputIntent. Utilisé par engines/facturx-pdf.js (documentation/10-etude-factur-x.md).
 * Les polices (OFE.pdfFonts) et le profil (OFE.pdfSRGB) viennent de pdf-fonts.js et pdf-srgb.js.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).pdfa = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ----- Octets et chaînes -----------------------------------------------------------------------

  function base64(text) {
    var bin = typeof atob === "function" ? atob(text) : Buffer.from(text, "base64").toString("binary");
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function utf8(text) {
    var s = unescape(encodeURIComponent(text)), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  var hex4 = function (n) { return ("000" + n.toString(16).toUpperCase()).slice(-4); };
  /** Chaîne de texte PDF en UTF-16BE (avec BOM), écrite en hexadécimal : sûre pour tous les caractères. */
  function textString(text) {
    var out = "<FEFF";
    for (var i = 0; i < text.length; i++) out += hex4(text.charCodeAt(i));
    return out + ">";
  }
  /** Chaîne PDF littérale ASCII (noms de fichiers, identifiants). */
  function literal(text) { return "(" + String(text).replace(/[\\()]/g, "\\$&").replace(/[^\x20-\x7e]/g, "?") + ")"; }
  function num(n) {
    var s = (Math.round(n * 1000) / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    return s === "-0" ? "0" : s;
  }
  function xml(text) { return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /** Dates : { pdf: "D:AAAAMMJJHHmmSS+00'00'", xmp: "AAAA-MM-JJTHH:mm:SS+00:00" } d'une date ISO en UTC. */
  function dates(iso) {
    var d = new Date(iso || Date.now()), p = function (n) { return (n < 10 ? "0" : "") + n; };
    var ymd = d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()), hms = p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds());
    return { pdf: "D:" + ymd + hms + "+00'00'",
             xmp: ymd.slice(0, 4) + "-" + ymd.slice(4, 6) + "-" + ymd.slice(6) + "T" + hms.slice(0, 2) + ":" + hms.slice(2, 4) + ":" + hms.slice(4) + "+00:00" };
  }

  /** Empreinte de 16 octets (FNV-1a sur 4 graines) pour l'identifiant du fichier (/ID). */
  function fingerprint(text) {
    var out = "";
    for (var seed = 0; seed < 4; seed++) {
      var h = 0x811c9dc5 ^ (seed * 0x9e3779b1);
      for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
      out += ("0000000" + (h >>> 0).toString(16).toUpperCase()).slice(-8);
    }
    return out;
  }

  // ----- Polices ------------------------------------------------------------------------------

  /** Police prête à l'emploi : glyphes d'un texte, largeur, caractères remplacés. */
  function Font(def, key) {
    this.def = def;
    this.key = key;
    this.scale = 1000 / def.unitsPerEm;
    this.used = {};
    this.missing = {};
  }
  /** Caractère réellement dessiné : lui-même, sinon sa lettre de base sans accent (NFD), sinon « ? ». */
  Font.prototype.drawn = function (cp) {
    if (this.def.cmap[cp] !== undefined) return cp;
    this.missing[cp] = true;
    var base = String.fromCodePoint(cp).normalize("NFD").codePointAt(0);
    return this.def.cmap[base] !== undefined ? base : 63;
  };
  Font.prototype.glyphs = function (text) {
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var cp = text.codePointAt(i);
      if (cp > 0xffff) i++;
      if (cp === 9 || cp === 10 || cp === 13) cp = 32;
      cp = this.drawn(cp);
      var gid = this.def.cmap[cp];
      this.used[gid] = cp; // table ToUnicode : le caractère que montre le glyphe
      out.push(gid);
    }
    return out;
  };
  /** Largeur d'un texte, en points. */
  Font.prototype.width = function (text, size) {
    var w = 0, widths = this.def.widths, gids = this.glyphs(text);
    for (var i = 0; i < gids.length; i++) w += widths[gids[i]];
    return w * size / this.def.unitsPerEm;
  };

  // ----- Document ---------------------------------------------------------------------------------

  /**
   * Nouveau document. opts : { fonts: { regular, bold } (définitions OFE.pdfFonts), icc: { name, data }, title, author,
   * subject, creator, producer, lang, date (ISO), xmpExtra (descriptions RDF supplémentaires, ex. Factur-X) }.
   */
  function create(opts) {
    var fonts = {};
    Object.keys(opts.fonts).forEach(function (k) { fonts[k] = new Font(opts.fonts[k], k); });
    var pages = [], images = [], files = [];

    function page(width, height) {
      var p = { width: width || 595.28, height: height || 841.89, ops: [], fonts: {}, images: {} };
      pages.push(p);
      var api = {
        width: p.width, height: p.height,
        /** Texte sur une ligne ; x, y : point de base en points depuis le bas à gauche. */
        text: function (x, y, text, o) {
          o = o || {};
          var font = fonts[o.font || "regular"], size = o.size || 10, c = o.color || [0, 0, 0];
          var gids = font.glyphs(String(text));
          if (!gids.length) return;
          p.fonts[font.key] = true;
          p.ops.push("BT " + num(c[0]) + " " + num(c[1]) + " " + num(c[2]) + " rg /F" + font.key + " " + num(size) + " Tf 1 0 0 1 " + num(x) + " " + num(y) +
            " Tm <" + gids.map(hex4).join("") + "> Tj ET");
        },
        rect: function (x, y, w, h, o) {
          o = o || {};
          if (o.fill) p.ops.push(num(o.fill[0]) + " " + num(o.fill[1]) + " " + num(o.fill[2]) + " rg " + num(x) + " " + num(y) + " " + num(w) + " " + num(h) + " re f");
          if (o.stroke) p.ops.push(num(o.stroke[0]) + " " + num(o.stroke[1]) + " " + num(o.stroke[2]) + " RG " + num(o.lineWidth || 0.5) + " w " +
            num(x) + " " + num(y) + " " + num(w) + " " + num(h) + " re S");
        },
        line: function (x1, y1, x2, y2, o) {
          o = o || {};
          var c = o.color || [0, 0, 0];
          p.ops.push(num(c[0]) + " " + num(c[1]) + " " + num(c[2]) + " RG " + num(o.width || 0.5) + " w " + num(x1) + " " + num(y1) + " m " + num(x2) + " " + num(y2) + " l S");
        },
        /** Image ajoutée par addImage, dessinée dans le rectangle donné. */
        image: function (img, x, y, w, h) {
          p.images[img.key] = img;
          p.ops.push("q " + num(w) + " 0 0 " + num(h) + " " + num(x) + " " + num(y) + " cm /" + img.key + " Do Q");
        }
      };
      return api;
    }

    /** Image JPEG (octets du fichier, largeur et hauteur en pixels, RVB ou niveaux de gris). */
    function addImage(jpeg, width, height, gray) {
      var img = { key: "Im" + (images.length + 1), data: jpeg, width: width, height: height, gray: !!gray };
      images.push(img);
      return img;
    }

    /** Fichier joint déclaré dans /AF (relation : Data, Source, Alternative, Supplement ou Unspecified). */
    function attach(name, bytes, mime, relationship, description) {
      files.push({ name: name, data: bytes, mime: mime, relationship: relationship, description: description || "" });
    }

    function width(text, size, key) { return fonts[key || "regular"].width(String(text), size); }

    function missing() {
      var all = {};
      Object.keys(fonts).forEach(function (k) { Object.keys(fonts[k].missing).forEach(function (cp) { all[cp] = true; }); });
      return Object.keys(all).map(function (cp) { return String.fromCodePoint(+cp); });
    }

    /** Octets du PDF. */
    function save() {
      var chunks = [], offsets = [], length = 0, nextId = 1;
      var push = function (part) {
        if (typeof part === "string") {
          var bytes = new Uint8Array(part.length);
          for (var i = 0; i < part.length; i++) bytes[i] = part.charCodeAt(i) & 0xff;
          part = bytes;
        }
        chunks.push(part);
        length += part.length;
      };
      var alloc = function () { return nextId++; };
      var obj = function (id, body) { offsets[id] = length; push(id + " 0 obj\n" + body + "\nendobj\n"); };
      var stream = function (id, dict, bytes) {
        offsets[id] = length;
        push(id + " 0 obj\n<< " + dict + " /Length " + bytes.length + " >>\nstream\n");
        push(bytes);
        push("\nendstream\nendobj\n");
      };
      var d = dates(opts.date);

      push("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n");
      var catalogId = alloc(), pagesId = alloc(), infoId = alloc(), metaId = alloc(), iccId = alloc();

      // Polices utilisées : Type0 → CIDFontType2 (Identity) → descripteur → programme TrueType, et ToUnicode.
      var fontRefs = {};
      Object.keys(fonts).forEach(function (k) {
        var f = fonts[k], def = f.def;
        var used = Object.keys(f.used).map(Number).sort(function (a, b) { return a - b; });
        if (!used.length) return;
        var type0 = alloc(), cid = alloc(), desc = alloc(), file = alloc(), toUni = alloc();
        fontRefs[k] = type0;
        var tag = "OFX" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Object.keys(fontRefs).length) + "AA+";
        var name = "/" + tag + def.name.replace(/[^A-Za-z0-9-]/g, "");
        var w = "[0 [" + def.widths.map(function (v) { return num(v * f.scale); }).join(" ") + "]]";
        obj(type0, "<< /Type /Font /Subtype /Type0 /BaseFont " + name + " /Encoding /Identity-H /DescendantFonts [" + cid + " 0 R] /ToUnicode " + toUni + " 0 R >>");
        obj(cid, "<< /Type /Font /Subtype /CIDFontType2 /BaseFont " + name + " /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> " +
          "/FontDescriptor " + desc + " 0 R /W " + w + " /CIDToGIDMap /Identity >>");
        var b = def.bbox.map(function (v) { return num(v * f.scale); }).join(" ");
        obj(desc, "<< /Type /FontDescriptor /FontName " + name + " /Flags 32 /FontBBox [" + b + "] /ItalicAngle " + num(def.italicAngle) +
          " /Ascent " + num(def.ascent * f.scale) + " /Descent " + num(def.descent * f.scale) + " /CapHeight " + num(def.capHeight * f.scale) +
          " /StemV " + (def.bold ? 140 : 80) + " /FontWeight " + (def.bold ? 700 : 400) + " /FontFile2 " + file + " 0 R >>");
        stream(file, "/Filter /FlateDecode /Length1 " + def.length1, base64(def.data));
        var map = used.map(function (gid) {
          var cp = f.used[gid], u = String.fromCodePoint(cp), hex = "";
          for (var i = 0; i < u.length; i++) hex += hex4(u.charCodeAt(i));
          return "<" + hex4(gid) + "> <" + hex + ">";
        });
        var cmap = "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n" +
          "/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n";
        for (var i = 0; i < map.length; i += 100) {
          var part = map.slice(i, i + 100);
          cmap += part.length + " beginbfchar\n" + part.join("\n") + "\nendbfchar\n";
        }
        cmap += "endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend";
        stream(toUni, "", utf8(cmap));
      });

      var imageRefs = {};
      images.forEach(function (img) {
        var id = alloc();
        imageRefs[img.key] = id;
        stream(id, "/Type /XObject /Subtype /Image /Width " + img.width + " /Height " + img.height + " /ColorSpace /" + (img.gray ? "DeviceGray" : "DeviceRGB") +
          " /BitsPerComponent 8 /Filter /DCTDecode", img.data);
      });

      var pageIds = pages.map(function (p) {
        var pageId = alloc(), contentId = alloc();
        var fontRes = Object.keys(p.fonts).map(function (k) { return "/F" + k + " " + fontRefs[k] + " 0 R"; }).join(" ");
        var imgRes = Object.keys(p.images).map(function (k) { return "/" + k + " " + imageRefs[k] + " 0 R"; }).join(" ");
        stream(contentId, "", utf8(p.ops.join("\n")));
        obj(pageId, "<< /Type /Page /Parent " + pagesId + " 0 R /MediaBox [0 0 " + num(p.width) + " " + num(p.height) + "] /Resources << /Font << " + fontRes +
          " >>" + (imgRes ? " /XObject << " + imgRes + " >>" : "") + " >> /Contents " + contentId + " 0 R >>");
        return pageId;
      });
      obj(pagesId, "<< /Type /Pages /Kids [" + pageIds.map(function (id) { return id + " 0 R"; }).join(" ") + "] /Count " + pageIds.length + " >>");

      var fileSpecs = files.map(function (f) {
        var ef = alloc(), spec = alloc();
        stream(ef, "/Type /EmbeddedFile /Subtype /" + f.mime.replace("/", "#2F") + " /Params << /ModDate (" + d.pdf + ") /Size " + f.data.length + " >>", f.data);
        obj(spec, "<< /Type /Filespec /F " + literal(f.name) + " /UF " + textString(f.name) + " /Desc " + textString(f.description) +
          " /AFRelationship /" + f.relationship + " /EF << /F " + ef + " 0 R /UF " + ef + " 0 R >> >>");
        return { name: f.name, id: spec };
      });

      stream(iccId, "/N 3", base64(opts.icc.data));

      var xmp = '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/">\n' +
        '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n' +
        '<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"><pdfaid:part>3</pdfaid:part><pdfaid:conformance>B</pdfaid:conformance></rdf:Description>\n' +
        '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:format>application/pdf</dc:format>' +
        "<dc:title><rdf:Alt><rdf:li xml:lang=\"x-default\">" + xml(opts.title) + "</rdf:li></rdf:Alt></dc:title>" +
        "<dc:creator><rdf:Seq><rdf:li>" + xml(opts.author) + "</rdf:li></rdf:Seq></dc:creator>" +
        (opts.subject ? "<dc:description><rdf:Alt><rdf:li xml:lang=\"x-default\">" + xml(opts.subject) + "</rdf:li></rdf:Alt></dc:description>" : "") +
        "</rdf:Description>\n" +
        '<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/"><xmp:CreatorTool>' + xml(opts.creator) + "</xmp:CreatorTool>" +
        "<xmp:CreateDate>" + d.xmp + "</xmp:CreateDate><xmp:ModifyDate>" + d.xmp + "</xmp:ModifyDate><xmp:MetadataDate>" + d.xmp + "</xmp:MetadataDate></rdf:Description>\n" +
        '<rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/"><pdf:Producer>' + xml(opts.producer) + "</pdf:Producer></rdf:Description>\n" +
        (opts.xmpExtra || "") + "</rdf:RDF>\n</x:xmpmeta>\n" + new Array(20).join("                                                  \n") +
        '<?xpacket end="w"?>';
      stream(metaId, "/Type /Metadata /Subtype /XML", utf8(xmp));

      obj(infoId, "<< /Title " + textString(opts.title) + " /Author " + textString(opts.author) + (opts.subject ? " /Subject " + textString(opts.subject) : "") +
        " /Creator " + textString(opts.creator) + " /Producer " + textString(opts.producer) +
        " /CreationDate (" + d.pdf + ") /ModDate (" + d.pdf + ") >>");
      obj(catalogId, "<< /Type /Catalog /Pages " + pagesId + " 0 R /Metadata " + metaId + " 0 R" +
        " /OutputIntents [<< /Type /OutputIntent /S /GTS_PDFA1 /OutputConditionIdentifier " + literal(opts.icc.name) +
        " /Info " + literal(opts.icc.name) + " /DestOutputProfile " + iccId + " 0 R >>]" +
        (opts.lang ? " /Lang " + literal(opts.lang) : "") +
        (fileSpecs.length ? " /Names << /EmbeddedFiles << /Names [" + fileSpecs.map(function (s) { return literal(s.name) + " " + s.id + " 0 R"; }).join(" ") +
          "] >> >> /AF [" + fileSpecs.map(function (s) { return s.id + " 0 R"; }).join(" ") + "]" : "") +
        " /ViewerPreferences << /DisplayDocTitle true >> >>");

      var xrefAt = length, size = nextId;
      var xref = "xref\n0 " + size + "\n0000000000 65535 f \n";
      for (var id = 1; id < size; id++) xref += ("000000000" + offsets[id]).slice(-10) + " 00000 n \n";
      var fid = fingerprint(opts.title + "|" + d.pdf + "|" + length);
      push(xref + "trailer\n<< /Size " + size + " /Root " + catalogId + " 0 R /Info " + infoId + " 0 R /ID [<" + fid + "> <" + fid + ">] >>\nstartxref\n" +
        xrefAt + "\n%%EOF\n");

      var out = new Uint8Array(length), at = 0;
      chunks.forEach(function (c) { out.set(c, at); at += c.length; });
      return out;
    }

    return { page: page, addImage: addImage, attach: attach, width: width, missing: missing, save: save };
  }

  return { create: create, dates: dates, textString: textString, utf8: utf8, base64: base64 };
});
