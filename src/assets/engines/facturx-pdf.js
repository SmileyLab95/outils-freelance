/*
 * Moteur : PDF de la facture électronique Factur-X (profil EN 16931). Mise en page A4 du contenu de la page
 * imprimable (OFE.invoiceFR.model), PDF/A-3 (OFE.pdfa) et données structurées jointes (OFE.facturxFR, factur-x.xml).
 * Étude : documentation/10-etude-factur-x.md.
 */
(function (root, factory) {
  var deps = root.OFE && root.OFE.pdfa ? [root.OFE.invoiceFR, root.OFE.facturxFR, root.OFE.pdfa]
    : [require("./invoice-fr.js"), require("./facturx-fr.js"), require("./pdfa.js")];
  var api = factory.apply(null, deps);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).facturxPDF = api;
})(typeof self !== "undefined" ? self : this, function (INV, FX, PDFA) {
  "use strict";

  var rgb = function (hex) { return [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; }); };
  var C = { ink: rgb("#17152f"), brand: rgb("#4f46e5"), label: rgb("#6c6987"), muted: rgb("#6d6a8a"), soft: rgb("#f5f4fb"),
            rule: rgb("#ecebf3"), dark: rgb("#14122b"), mention: rgb("#3d3a5c"), white: [1, 1, 1] };
  var M = { left: 42.5, right: 42.5, top: 48, bottom: 56 };

  var XMP_FACTURX = '<rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">' +
    "<fx:DocumentType>INVOICE</fx:DocumentType><fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>" +
    "<fx:Version>1.0</fx:Version><fx:ConformanceLevel>EN 16931</fx:ConformanceLevel></rdf:Description>\n" +
    '<rdf:Description rdf:about="" xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/" ' +
    'xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#" xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">' +
    "<pdfaExtension:schemas><rdf:Bag><rdf:li rdf:parseType=\"Resource\">" +
    "<pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>" +
    "<pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>" +
    "<pdfaSchema:prefix>fx</pdfaSchema:prefix><pdfaSchema:property><rdf:Seq>" +
    [["DocumentFileName", "The name of the embedded XML document"], ["DocumentType", "The type of the hybrid document in capital letters, e.g. INVOICE or ORDER"],
     ["Version", "The actual version of the standard applying to the embedded XML document"],
     ["ConformanceLevel", "The conformance level of the embedded XML document"]].map(function (p) {
      return "<rdf:li rdf:parseType=\"Resource\"><pdfaProperty:name>" + p[0] + "</pdfaProperty:name><pdfaProperty:valueType>Text</pdfaProperty:valueType>" +
        "<pdfaProperty:category>external</pdfaProperty:category><pdfaProperty:description>" + p[1] + "</pdfaProperty:description></rdf:li>";
    }).join("") +
    "</rdf:Seq></pdfaSchema:property></rdf:li></rdf:Bag></pdfaExtension:schemas></rdf:Description>\n";

  /** Lignes d'un texte coupé à la largeur donnée (mots, puis caractères pour un mot trop long). */
  function wrap(pdf, text, size, width, font) {
    var out = [];
    String(text || "").split(/\r?\n/).forEach(function (para) {
      var line = "";
      para.split(/ +/).forEach(function (word) {
        var test = line ? line + " " + word : word;
        if (pdf.width(test, size, font) <= width) { line = test; return; }
        if (line) out.push(line);
        line = "";
        while (pdf.width(word, size, font) > width) {
          var n = word.length;
          while (n > 1 && pdf.width(word.slice(0, n), size, font) > width) n--;
          out.push(word.slice(0, n));
          word = word.slice(n);
        }
        line = word;
      });
      out.push(line);
    });
    return out;
  }

  /**
   * PDF/A-3 Factur-X d'une facture ou d'un avoir émis. assets : { fonts (OFE.pdfFonts), icc (OFE.pdfSRGB),
   * logo: { jpeg, width, height } ou null, now (date-heure ISO) }. Renvoie { bytes, xml, missing (caractères absents
   * de la police, remplacés) }.
   */
  function build(doc, documents, rules, fmt, assets) {
    var snap = doc.snapshot || {};
    var m = INV.model(Object.assign({}, doc, { me: snap.me || {}, client: snap.client || {} }), rules, fmt);
    var xml = FX.xml(doc, documents, rules, fmt);
    var label = m.title.charAt(0) + m.title.slice(1).toLowerCase();
    var pdf = PDFA.create({
      fonts: assets.fonts, icc: assets.icc, date: assets.now, lang: "fr-FR",
      title: label + " " + m.number, author: m.me.name || "Émetteur", subject: label + " " + m.number + " · " + m.client.name,
      creator: "Outils Freelance · Espace entrepreneur", producer: "Outils Freelance (PDF/A-3, Factur-X EN 16931)", xmpExtra: XMP_FACTURX
    });

    var W = 595.28 - M.left - M.right, pages = [], page, y;
    var newPage = function () { page = pdf.page(); pages.push(page); y = page.height - M.top; };
    var room = function (h) { if (y - h < M.bottom) { newPage(); return true; } return false; };
    var text = function (x, yy, s, o) { page.text(x, yy, s, o); };
    var right = function (xr, yy, s, o) { page.text(xr - pdf.width(s, o.size, o.font), yy, s, o); };
    newPage();

    // En-tête : logo et nom, titre et numéro, filet de couleur.
    var headH = 44, nameX = M.left;
    if (assets.logo) {
      var lh = Math.min(42, assets.logo.height), lw = lh * assets.logo.width / assets.logo.height;
      if (lw > 110) { lw = 110; lh = lw * assets.logo.height / assets.logo.width; }
      page.image(pdf.addImage(assets.logo.jpeg, assets.logo.width, assets.logo.height), M.left, y - headH / 2 - lh / 2, lw, lh);
      nameX = M.left + lw + 10;
    }
    // Nom de l'émetteur sur deux lignes au plus, sans empiéter sur le titre (taille réduite si nécessaire).
    var titleW = Math.max(pdf.width(m.title, 20, "bold"), pdf.width("N° " + m.number, 9.5, "bold"));
    var nameW = M.left + W - titleW - 20 - nameX, nameSize = 12.5, names = wrap(pdf, m.me.name, nameSize, nameW, "bold");
    if (names.length > 2) { nameSize = 10; names = wrap(pdf, m.me.name, nameSize, nameW, "bold").slice(0, 3); }
    names.forEach(function (l, i) {
      text(nameX, y - headH / 2 + (names.length - 1) * nameSize * 0.6 - 4 - i * nameSize * 1.2, l, { font: "bold", size: nameSize, color: C.ink });
    });
    right(M.left + W, y - 18, m.title, { font: "bold", size: 20, color: C.brand });
    right(M.left + W, y - 34, "N° " + m.number, { font: "bold", size: 9.5, color: C.ink });
    y -= headH + 6;
    page.rect(M.left, y, W, 2.2, { fill: C.brand });
    y -= 22;

    // Émetteur et client, en deux colonnes.
    var colW = (W - 20) / 2, top = y;
    var column = function (x, title, name, lines, extra) {
      var yy = top;
      text(x, yy, title.toUpperCase(), { font: "bold", size: 7.5, color: C.label });
      wrap(pdf, name, 9.5, colW, "bold").forEach(function (s, i) { yy -= i ? 12 : 13; text(x, yy, s, { font: "bold", size: 9.5, color: C.ink }); });
      lines.forEach(function (l) { wrap(pdf, l, 9, colW).forEach(function (s) { yy -= 12; text(x, yy, s, { size: 9, color: C.ink }); }); });
      if (extra) {
        yy -= 16;
        text(x, yy, "Adresse de livraison", { size: 7.5, color: C.muted });
        wrap(pdf, extra, 8.5, colW).forEach(function (s) { yy -= 11; text(x, yy, s, { size: 8.5, color: C.ink }); });
      }
      return yy;
    };
    var y1 = column(M.left, "Émetteur", m.me.name, m.me.lines);
    var y2 = column(M.left + colW + 20, m.client.label, m.client.name, [m.client.address].concat(m.client.ids), m.client.delivery);
    y = Math.min(y1, y2) - 18;

    // Dates et nature de l'opération.
    var gap = 22, x = M.left + 10, metaH = 30;
    page.rect(M.left, y - metaH, W, metaH, { fill: C.soft });
    m.meta.forEach(function (it) {
      var w = Math.max(pdf.width(it[0], 7.5), pdf.width(it[1], 9.5, "bold"));
      text(x, y - 11, it[0], { size: 7.5, color: C.muted });
      text(x, y - 23, it[1], { font: "bold", size: 9.5, color: C.ink });
      x += w + gap;
    });
    y -= metaH + 16;

    // Lignes.
    var cols = [{ t: "Désignation", w: W - 220 }, { t: "Qté", w: 40 }, { t: "Prix unitaire HT", w: 95 }, { t: "Total HT", w: 85 }];
    var tableHead = function () {
      page.rect(M.left, y - 18, W, 18, { fill: C.brand });
      var cx = M.left;
      cols.forEach(function (c, i) {
        if (i === 0) text(cx + 7, y - 12, c.t, { font: "bold", size: 8, color: C.white });
        else right(cx + c.w - 7, y - 12, c.t, { font: "bold", size: 8, color: C.white });
        cx += c.w;
      });
      y -= 18;
    };
    tableHead();
    m.rows.forEach(function (r) {
      var lines = wrap(pdf, r.desc, 9, cols[0].w - 14);
      var h = 12 * lines.length + 10;
      if (room(h)) tableHead();
      lines.forEach(function (s, i) { text(M.left + 7, y - 14 - 12 * i, s, { size: 9, color: C.ink }); });
      var cx = M.left + cols[0].w;
      [r.qty, r.price, r.total].forEach(function (v, i) {
        right(cx + cols[i + 1].w - 7, y - 14, v, { font: i === 2 ? "bold" : "regular", size: 9, color: C.ink });
        cx += cols[i + 1].w;
      });
      y -= h;
      page.line(M.left, y, M.left + W, y, { color: C.rule, width: 0.75 });
    });
    y -= 12;

    // Totaux.
    var tw = 220, tx = M.left + W - tw;
    room(m.sums.length * 20 + 8);
    m.sums.forEach(function (s) {
      if (s[2]) {
        page.rect(tx, y - 20, tw, 20, { fill: C.dark });
        text(tx + 8, y - 14, s[0], { font: "bold", size: 10.5, color: C.white });
        right(tx + tw - 8, y - 14, s[1], { font: "bold", size: 10.5, color: C.white });
        y -= 24;
      } else {
        text(tx + 8, y - 12, s[0], { size: 9, color: C.ink });
        right(tx + tw - 8, y - 12, s[1], { font: "bold", size: 9, color: C.ink });
        y -= 17;
      }
    });
    y -= 12;

    // Mentions, note.
    room(30);
    page.line(M.left, y, M.left + W, y, { color: C.rule, width: 0.75 });
    y -= 4;
    m.mentions.forEach(function (s) {
      wrap(pdf, s, 8, W).forEach(function (l) { room(11); y -= 11; text(M.left, y, l, { size: 8, color: C.mention }); });
      y -= 3;
    });
    if (m.notes) {
      y -= 12;
      wrap(pdf, m.notes, 9, W, "bold").forEach(function (l) {
        room(12);
        y -= 12;
        text(M.left + (W - pdf.width(l, 9, "bold")) / 2, y, l, { font: "bold", size: 9, color: C.brand });
      });
    }

    // Pied de page : nature du fichier et pagination.
    pages.forEach(function (p, i) {
      var foot = label + " électronique au format Factur-X (profil EN 16931) : données structurées jointes (factur-x.xml)." +
        (pages.length > 1 ? "   Page " + (i + 1) + "/" + pages.length : "");
      p.text(M.left, 30, foot, { size: 7, color: C.label });
    });

    pdf.attach("factur-x.xml", PDFA.utf8(xml), "text/xml", "Alternative", "Données de la facture au format Factur-X (profil EN 16931)");
    return { bytes: pdf.save(), xml: xml, missing: pdf.missing() };
  }

  return { build: build, wrap: wrap };
});
