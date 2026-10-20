/* Générateur de contrat de prestation : clauses choisies selon le formulaire, aperçu en direct, PDF, Word et copie.
   Le texte du contrat est dans la page (#contract-data) : préambule, articles, signatures.
   Dans les textes : {champ} insère une valeur, [[champ|texte]] n'apparaît que si le champ est rempli,
   "when" n'affiche un article ou un paragraphe que pour certaines valeurs du formulaire. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("contract-form");
  var dataEl = document.getElementById("contract-data");
  if (!form || !dataEl) return;
  var D = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var preview = $("k-preview");
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var longDate = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };

  /** Valeurs du formulaire : `raw` pour les conditions, `text` pour l'affichage (libellé de l'option choisie). */
  function read() {
    var raw = {}, text = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") { raw[el.name] = el.checked ? "on" : "off"; return; }
      raw[el.name] = el.value.trim();
      var override = D.option_text && D.option_text[el.name] && D.option_text[el.name][el.value];
      text[el.name] = override || (el.tagName === "SELECT" ? el.options[el.selectedIndex].text : el.value.trim());
    });
    var price = OF.num(raw.price), qty = OF.num(raw.qty), deposit = OF.num(raw.deposit);
    var unit = raw.price_type === "daily" || raw.price_type === "hourly";
    var total = isFinite(price) ? (unit ? (isFinite(qty) ? price * qty : NaN) : price) : NaN;
    text.price = isFinite(price) && raw.price ? OF.money(price) : "";
    text.total = isFinite(total) && raw.price ? OF.money(total) : "";
    text.qty = isFinite(qty) && raw.qty ? OF.fmt(qty) : "";
    text.deposit = isFinite(deposit) && deposit > 0 ? OF.fmt(deposit) : "";
    text.deposit_amount = isFinite(total) && isFinite(deposit) && deposit > 0 ? OF.money(total * deposit / 100) : "";
    text.start = raw.start ? longDate(raw.start) : "";
    text.end = raw.end ? longDate(raw.end) : "";
    text.today = longDate(OF.today());
    raw.has_deposit = isFinite(deposit) && deposit > 0 ? "on" : "off";
    raw.has_end = raw.end ? "on" : "off";
    raw.has_deliverables = raw.deliverables ? "on" : "off";
    return { raw: raw, text: text };
  }

  function matches(when, raw) {
    return !when || Object.keys(when).every(function (k) { return when[k].indexOf(raw[k]) > -1; });
  }

  /** Remplace {champ} et [[champ|…]] ; une valeur vide affiche un repère à compléter. */
  function fill(template, v) {
    var out = esc(template).replace(/\[\[(\w+)\|([^\]]*)\]\]/g, function (m, key, inner) {
      return v.text[key] ? inner : "";
    });
    return out.replace(/\{(\w+)\}/g, function (m, key) {
      var value = v.text[key];
      if (value) return esc(value).replace(/\n/g, "<br>");
      return '<span class="p-empty k-blank">' + esc((D.hints && D.hints[key]) || key) + "</span>";
    });
  }

  function paragraphs(list, v) {
    return list.filter(function (p) { return typeof p === "string" || matches(p.when, v.raw); }).map(function (p) {
      return "<p>" + fill(typeof p === "string" ? p : p.text, v) + "</p>";
    }).join("");
  }

  function render() {
    var v = read();
    var html = '<h2 class="k-title">' + esc(D.doc_title) + "</h2>";
    if (v.text.title) html += '<p class="k-subtitle">' + esc(v.text.title) + "</p>";
    html += '<div class="k-preamble">' + paragraphs(D.preamble, v) + "</div>";
    var n = 0;
    D.clauses.forEach(function (c) {
      if (!matches(c.when, v.raw)) return;
      n += 1;
      html += '<section class="k-article"><h3>' + esc(D.article.replace("{n}", n).replace("{title}", c.title)) + "</h3>" +
        paragraphs(c.paras, v) + "</section>";
    });
    html += '<div class="k-closing">' + paragraphs(D.closing, v) + "</div>";
    html += '<div class="k-signs">' + D.signatures.map(function (s) {
      return '<div><div class="p-label">' + esc(s.title) + "</div><p>" + fill(s.name, v) + "</p>" +
        '<p class="k-sign-note">' + esc(D.sign_note) + '</p><div class="p-sign-box"></div></div>';
    }).join("") + "</div>";
    preview.innerHTML = html;
  }

  $("k-print").addEventListener("click", function () {
    var title = document.title;
    document.title = D.file + (form.elements.c_name && form.elements.c_name.value ? " - " + form.elements.c_name.value : "");
    window.print();
    document.title = title;
  });
  // Document Word modifiable : HTML enregistré avec l'extension .doc, que Word et LibreOffice ouvrent directement.
  $("k-word").addEventListener("click", function () {
    var doc = '<html><head><meta charset="utf-8"><title>' + esc(D.file) + "</title><style>" +
      "body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.45}h2{text-align:center;font-size:15pt}" +
      "h3{font-size:11.5pt;margin:14pt 0 4pt}.k-subtitle{text-align:center;font-style:italic}" +
      ".p-label{font-weight:bold;text-transform:uppercase;font-size:9pt}.k-blank{color:#999}" +
      ".k-signs div{margin-top:18pt}.p-sign-box{height:60pt}</style></head><body>" + preview.innerHTML + "</body></html>";
    var link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["﻿" + doc], { type: "application/msword" }));
    link.download = D.file + ".doc";
    document.body.appendChild(link);
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
  });
  $("k-copy").addEventListener("click", function () { OF.copy(preview.innerText, this); });
  $("k-reset").addEventListener("click", function () {
    if (!confirm(D.reset_confirm)) return;
    OF.save("contract", null);
    window.location.reload();
  });

  OF.persistForm(form, "contract");
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
