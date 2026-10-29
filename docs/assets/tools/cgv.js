/* Conditions générales de vente (France) : formulaire, champs affichés selon la situation, contrôles, aperçu en
   direct, PDF, Word et copie. Repères, textes calculés et contrôles par le moteur OFE.cgvFR ; rendu par
   OFE.contractDoc (même syntaxe que le contrat) ; texte des CGV et messages dans la page (#cgv-data).
   Spécification : documentation/40-cgv.md. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("cgv-form"), dataEl = document.getElementById("cgv-data");
  if (!form || !dataEl || !OFE || !OFE.cgvFR || !OFE.contractDoc || !R) return;
  var D = JSON.parse(dataEl.textContent), L = D.ui, K = "cgv";
  var $ = function (id) { return document.getElementById(id); };
  var esc = OFE.contractDoc.esc;
  var preview = $("cg-preview"), notices = $("cg-notices");
  var longDate = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  var fillIn = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  // Taux à deux décimales s'il n'est pas entier (« 12,40 % », « 8,25 % », « 15 % »), comme les fiches officielles.
  var pct2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var fmt = {
    pct: function (rate) {
      var n = Math.round(rate * 10000) / 100;
      return (n === Math.round(n) ? OF.fmt(n) : pct2.format(n)) + " %";
    },
    num: function (n) { return OF.fmt(n); }
  };

  /** Valeurs du formulaire : `raw` pour les conditions et le moteur, `text` pour l'affichage. */
  function read() {
    var raw = {}, text = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") { raw[el.name] = el.checked ? "on" : "off"; return; }
      raw[el.name] = el.value.trim();
      text[el.name] = el.tagName === "SELECT" ? el.options[el.selectedIndex].text : el.value.trim();
    });
    var today = OF.today();
    var p = OFE.cgvFR.prepare(raw, R, today, fmt);
    Object.keys(p.text).forEach(function (k) { text[k] = p.text[k]; });
    text.contacts = [raw.p_email, raw.p_phone].filter(Boolean).join(", ");
    text.today = longDate(today);
    text.title = L.title_prefix + (raw.p_name ? " – " + raw.p_name : "");
    if (OFE.invoiceFR) text.franchise = OFE.invoiceFR.franchiseMention(today, R);
    var flags = OFE.contractDoc.flags(raw);   // has_<champ> de chaque champ rempli
    Object.keys(p.flags).forEach(function (k) { flags[k] = p.flags[k]; });
    return { raw: flags, text: text, blocks: p.blocks, checks: p.checks };
  }

  // Champs affichés selon la situation (data-when) ; un champ masqué garde sa valeur.
  var SHOW = {
    vat: function (v) { return v.raw.vat === "vat"; },
    has_pro: function (v) { return v.raw.has_pro === "on"; },
    has_part: function (v) { return v.raw.has_part === "on"; },
    online: function (v) { return v.raw.has_part === "on" && form.elements.online.checked; },
    escompte: function (v) { return v.raw.escompte === "on"; },
    penalty_custom: function (v) { return v.raw.has_pro === "on" && v.raw.penalty === "custom"; }
  };

  function showFields(v) {
    Array.prototype.forEach.call(form.querySelectorAll("[data-when]"), function (el) {
      el.hidden = !SHOW[el.getAttribute("data-when")](v);
    });
  }

  /** Contrôles : à corriger (erreurs et avertissements), puis à savoir ; chaque message renvoie à son champ. */
  function showChecks(checks) {
    Array.prototype.forEach.call(form.querySelectorAll("[aria-invalid]"), function (el) { el.removeAttribute("aria-invalid"); });
    var groups = { fix: [], note: [] };
    checks.forEach(function (c) {
      var el = form.elements[c.field];
      if (c.level === "error" && el && el.type !== "checkbox") el.setAttribute("aria-invalid", "true");
      var id = el && el.id ? el.id : "";
      var msg = esc(fillIn(L.checks[c.code] || c.code, c.params));
      var item = id ? '<a href="#' + id + '" data-focus="' + id + '">' + msg + "</a>" : msg;
      groups[c.level === "info" ? "note" : "fix"].push("<li>" + item + "</li>");
    });
    var html = (groups.fix.length ? '<div class="notice warn"><strong>' + esc(L.errors) + "</strong><ul>" + groups.fix.join("") + "</ul></div>" : "") +
      (groups.note.length ? '<div class="notice"><strong>' + esc(L.notes) + "</strong><ul>" + groups.note.join("") + "</ul></div>" : "");
    if (html !== lastNotices) notices.innerHTML = lastNotices = html;   // annoncé une fois, pas à chaque frappe
  }
  var lastNotices = null;

  notices.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-focus]");
    if (!a) return;
    e.preventDefault();
    var el = $(a.getAttribute("data-focus"));
    if (el) { el.focus(); el.scrollIntoView({ block: "center" }); }
  });

  function render() {
    var v = read();
    showFields(v);
    showChecks(v.checks);
    preview.innerHTML = OFE.contractDoc.render(D, v);
  }

  $("cg-print").addEventListener("click", function () {
    var title = document.title;
    document.title = D.file + (form.elements.p_name.value ? " - " + form.elements.p_name.value : "");
    window.print();
    document.title = title;
  });
  // Document Word modifiable (moteur : HTML enregistré avec l'extension .doc).
  $("cg-word").addEventListener("click", function () {
    OF.download("﻿" + OFE.contractDoc.word(D.file, preview.innerHTML), D.file + ".doc", "application/msword");
  });
  $("cg-copy").addEventListener("click", function () { OF.copy(preview.innerText, this); });
  $("cg-reset").addEventListener("click", function () {
    if (!confirm(D.reset_confirm)) return;
    OF.save(K, null);
    window.location.reload();
  });

  OF.persistForm(form, K);
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
