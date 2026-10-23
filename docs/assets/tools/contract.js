/* Générateur de contrat de prestation et d'accord de confidentialité : clauses choisies selon le formulaire, aperçu
   en direct, PDF, Word et copie. Le texte du document est dans la page (#contract-data) : préambule, articles,
   signatures ; le rendu est fait par le moteur OFE.contractDoc (engines/contract-doc.js), qui décrit la syntaxe.
   "store" (facultatif) : clé d'enregistrement de la saisie, pour qu'un document ne reprenne pas celle d'un autre. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE;
  var form = document.getElementById("contract-form");
  var dataEl = document.getElementById("contract-data");
  if (!form || !dataEl || !OFE || !OFE.contractDoc) return;
  var D = JSON.parse(dataEl.textContent);
  var STORE = D.store || "contract";
  var $ = function (id) { return document.getElementById(id); };
  var preview = $("k-preview");
  var esc = OFE.contractDoc.esc;
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
    raw = OFE.contractDoc.flags(raw);   // has_end, has_deliverables, has_start…
    raw.has_deposit = isFinite(deposit) && deposit > 0 ? "on" : "off";
    return { raw: raw, text: text };
  }

  function render() { preview.innerHTML = OFE.contractDoc.render(D, read()); }

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
      ".k-signs div{margin-top:18pt}.p-sign-box{height:60pt}.k-witness-line{border-top:1px solid #999;margin-top:20pt;font-size:9pt}.k-witness .k-witness-line:nth-child(2){margin-top:34pt}" +
      "</style></head><body>" + preview.innerHTML + "</body></html>";
    OF.download("﻿" + doc, D.file + ".doc", "application/msword");
  });
  $("k-copy").addEventListener("click", function () { OF.copy(preview.innerText, this); });
  $("k-reset").addEventListener("click", function () {
    if (!confirm(D.reset_confirm)) return;
    OF.save(STORE, null);
    window.location.reload();
  });

  OF.persistForm(form, STORE);
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
