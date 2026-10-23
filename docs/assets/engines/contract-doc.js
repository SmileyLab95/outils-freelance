/*
 * Moteur : rendu d'un contrat ou d'un accord à partir de son texte (documentation/29-accord-de-confidentialite.md).
 * Le texte vient de la page (#contract-data) : titre, préambule, articles, clôture, signatures. Dans les textes,
 * {champ} insère une valeur, [[champ|texte]] n'apparaît que si le champ est rempli, et "when" n'affiche un titre, un
 * article, un paragraphe ou une signature que pour certaines valeurs du formulaire. Fonctions pures, sans DOM.
 * Testé par tests/unit/contract-doc.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).contractDoc = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };

  /** when : { champ: [valeurs acceptées] }, toutes les conditions remplies ; ou liste de tels objets, l'un d'eux suffit. */
  function matches(when, raw) {
    if (Array.isArray(when)) return when.some(function (w) { return matches(w, raw); });
    return !when || Object.keys(when).every(function (k) { return when[k].indexOf(raw[k]) > -1; });
  }

  /** Repères de conditions : has_<champ> vaut "on" si le champ est rempli (cases à cocher exclues). */
  function flags(raw) {
    var out = {};
    Object.keys(raw).forEach(function (k) {
      out[k] = raw[k];
      if (raw[k] !== "on" && raw[k] !== "off") out["has_" + k] = raw[k] ? "on" : "off";
    });
    return out;
  }

  /** Remplace {champ} et [[champ|…]] ; une valeur vide affiche un repère à compléter. */
  function fill(template, v, hints) {
    var out = esc(template).replace(/\[\[(\w+)\|([^\]]*)\]\]/g, function (m, key, inner) {
      return v.text[key] ? inner : "";
    });
    return out.replace(/\{(\w+)\}/g, function (m, key) {
      var value = v.text[key];
      if (value) return esc(value).replace(/\n/g, "<br>");
      return '<span class="p-empty k-blank">' + esc((hints && hints[key]) || key) + "</span>";
    });
  }

  function paragraphs(list, v, hints) {
    return list.filter(function (p) { return typeof p === "string" || matches(p.when, v.raw); }).map(function (p) {
      return "<p>" + fill(typeof p === "string" ? p : p.text, v, hints) + "</p>";
    }).join("");
  }

  /** Texte simple ou liste de variantes { when, text } : la première qui convient. */
  function pick(value, raw) {
    if (typeof value === "string") return value;
    var hit = (value || []).filter(function (x) { return matches(x.when, raw); })[0];
    return hit ? hit.text : "";
  }

  /** v : { raw (valeurs pour les conditions), text (valeurs affichées) } ; renvoie le HTML de l'aperçu. */
  function render(D, v) {
    var hints = D.hints;
    var html = '<h2 class="k-title">' + esc(pick(D.doc_title, v.raw)) + "</h2>";
    if (v.text.title) html += '<p class="k-subtitle">' + esc(v.text.title) + "</p>";
    html += '<div class="k-preamble">' + paragraphs(D.preamble, v, hints) + "</div>";
    var n = 0;
    D.clauses.forEach(function (c) {
      if (!matches(c.when, v.raw)) return;
      n += 1;
      html += '<section class="k-article"><h3>' + esc(D.article.replace("{n}", n).replace("{title}", c.title)) + "</h3>" +
        paragraphs(c.paras, v, hints) + "</section>";
    });
    html += '<div class="k-closing">' + paragraphs(D.closing, v, hints) + "</div>";
    html += '<div class="k-signs">' + D.signatures.filter(function (s) { return matches(s.when, v.raw); }).map(function (s) {
      var witness = s.witness ? '<div class="k-witness"><p class="k-sign-note">' + esc(s.witness.title) + "</p>" +
        s.witness.lines.map(function (line) { return '<p class="k-witness-line">' + esc(line) + "</p>"; }).join("") + "</div>" : "";
      return '<div><div class="p-label">' + fill(s.title, v, hints) + "</div><p>" + fill(s.name, v, hints) + "</p>" +
        '<p class="k-sign-note">' + esc(s.note || D.sign_note) + '</p><div class="p-sign-box"></div>' + witness + "</div>";
    }).join("") + "</div>";
    return html;
  }

  return { esc: esc, matches: matches, flags: flags, fill: fill, pick: pick, render: render };
});
