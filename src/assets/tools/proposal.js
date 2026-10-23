/* Proposition commerciale : formulaire, étapes et options, aperçu en direct, PDF, Word et copie. Totaux par le moteur
   OFE.proposal, rendu par OFE.contractDoc (même syntaxe que le contrat) ; textes dans la page (#proposal-data).
   Spécification : documentation/30-proposition-commerciale.md. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE;
  var form = document.getElementById("proposal-form"), dataEl = document.getElementById("proposal-data");
  if (!form || !dataEl || !OFE || !OFE.proposal || !OFE.contractDoc) return;
  var D = JSON.parse(dataEl.textContent), L = D.ui, K = "proposal";
  var $ = function (id) { return document.getElementById(id); };
  var esc = OFE.contractDoc.esc;
  var fillIn = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var longDate = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  var preview = $("pr-preview");

  // ----- Lignes d'étapes et d'options --------------------------------------------------------------------------
  var LISTS = {
    phases: { box: $("pr-phases"), add: $("pr-add-phase"), max: 8, fields: ["name", "duration", "price"], blank: [{}, {}, {}] },
    options: { box: $("pr-options"), add: $("pr-add-option"), max: 5, fields: ["name", "price"], blank: [{}] }
  };
  var rows = {};
  Object.keys(LISTS).forEach(function (key) {
    var saved = OF.load(K + "-" + key, null);
    rows[key] = Array.isArray(saved) && saved.length ? saved : LISTS[key].blank.map(function () { return {}; });
  });

  function renderRows(key) {
    var list = LISTS[key], T = L[key];
    list.box.innerHTML = "";
    rows[key].forEach(function (row, i) {
      var el = document.createElement("div");
      el.className = "line-row pr-line pr-" + key;
      var example = (T.examples || [])[i] || [];
      el.innerHTML = list.fields.map(function (f, j) {
        var id = "pr-" + key + "-" + f + "-" + i;
        var label = f === "name" ? T.name + " " + (i + 1) : T[f];
        var attrs = f === "price" ? ' inputmode="decimal"' : "";
        var ph = example[j] ? ' placeholder="' + esc(example[j]) + '"' : "";
        return '<div class="field line-' + f + '"><label for="' + id + '">' + esc(label) + "</label>" +
          '<input type="text" id="' + id + '" data-k="' + f + '"' + attrs + ph + "></div>";
      }).join("") +
        '<button type="button" class="line-remove" aria-label="' + esc(fillIn(T.remove, { n: i + 1 })) + '" title="' + esc(fillIn(T.remove, { n: i + 1 })) + '">✕</button>';
      list.fields.forEach(function (f) { el.querySelector('[data-k="' + f + '"]').value = row[f] || ""; });
      el.addEventListener("input", function (e) {
        var f = e.target.getAttribute("data-k");
        if (!f) return;
        rows[key][i][f] = e.target.value;
        OF.save(K + "-" + key, rows[key]);
        render();
      });
      el.querySelector(".line-remove").addEventListener("click", function () {
        rows[key].splice(i, 1);
        if (!rows[key].length) rows[key].push({});
        OF.save(K + "-" + key, rows[key]);
        renderRows(key);
        render();
        var inputs = list.box.querySelectorAll('input[data-k="name"]');
        inputs[Math.min(i, inputs.length - 1)].focus();
      });
      list.box.appendChild(el);
    });
    list.add.disabled = rows[key].length >= list.max;
  }
  Object.keys(LISTS).forEach(function (key) {
    LISTS[key].add.addEventListener("click", function () {
      if (rows[key].length >= LISTS[key].max) return;
      rows[key].push({});
      OF.save(K + "-" + key, rows[key]);
      renderRows(key);
      LISTS[key].box.querySelector(".pr-line:last-child input").focus();
      render();
    });
    renderRows(key);
  });

  // Prix saisi : vide → null, illisible → NaN (le moteur le signale).
  function price(value) {
    var raw = String(value || "").trim();
    return raw === "" ? null : OF.num(raw);
  }

  // ----- Lecture du formulaire et rendu -------------------------------------------------------------------------
  function read() {
    var raw = {}, text = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === "checkbox") { raw[el.name] = el.checked ? "on" : "off"; return; }
      raw[el.name] = el.value.trim();
      text[el.name] = el.tagName === "SELECT" ? el.options[el.selectedIndex].text : el.value.trim();
    });
    var r = OFE.proposal.compute({
      phases: rows.phases.map(function (l) { return { name: l.name, duration: l.duration, price: price(l.price) }; }),
      options: rows.options.map(function (l) { return { name: l.name, price: price(l.price) }; }),
      deposit: OF.num(raw.deposit), today: OF.today(), validity: raw.validity
    });
    var money = function (x) { return x === null ? "–" : OF.money(x); };
    var tables = {};
    if (r.phases.length) {
      tables.phases = { head: L.phases.head, num: [2], foot: [[L.total, "", OF.money(r.total)]],
        rows: r.phases.map(function (l) { return [l.name || "–", l.duration || "–", money(l.price)]; }) };
    }
    if (r.options.length) {
      tables.options = { head: L.options.head, num: [1], rows: r.options.map(function (l) { return [l.name || "–", money(l.price)]; }) };
    }
    // Prix illisibles : champ signalé et message sous les lignes.
    var bad = [];
    Object.keys(LISTS).forEach(function (key) {
      rows[key].forEach(function (l, i) {
        var input = $("pr-" + key + "-price-" + i), invalid = r.invalid[key].indexOf(i) > -1;
        if (input) input.setAttribute("aria-invalid", String(invalid));
        if (invalid) bad.push(L[key].name + " " + (i + 1));
      });
    });
    $("pr-notice").hidden = !bad.length;
    $("pr-notice").textContent = bad.length ? fillIn(L.invalid, { list: bad.join(", ") }) : "";

    text.total = r.total > 0 ? OF.money(r.total) : "";
    text.deposit = r.deposit > 0 ? OF.fmt(Math.round(r.deposit * 10000) / 100) : "";
    text.deposit_amount = r.deposit > 0 && r.total > 0 ? OF.money(r.depositAmount) : "";
    text.balance = r.deposit > 0 && r.total > 0 ? OF.money(r.balance) : "";
    text.valid_until = r.validUntil ? longDate(r.validUntil) : "";
    text.start = raw.start ? longDate(raw.start) : "";
    text.today = longDate(OF.today());
    // France : mention de franchise datée (art. 293 B du CGI, puis CIBS à partir de 2027), celle des factures.
    if (OFE.invoiceFR && window.OF_RULES) text.franchise = OFE.invoiceFR.franchiseMention(OF.today(), window.OF_RULES);
    raw = OFE.contractDoc.flags(raw);
    raw.has_phases = r.phases.length ? "on" : "off";
    raw.has_options = r.options.length ? "on" : "off";
    raw.has_deposit = r.deposit > 0 ? "on" : "off";
    return { raw: raw, text: text, tables: tables };
  }

  function render() { preview.innerHTML = OFE.contractDoc.render(D, read()); }

  $("pr-print").addEventListener("click", function () {
    var title = document.title;
    document.title = D.file + (form.elements.c_name && form.elements.c_name.value ? " - " + form.elements.c_name.value : "");
    window.print();
    document.title = title;
  });
  $("pr-word").addEventListener("click", function () {
    OF.download("﻿" + OFE.contractDoc.word(D.file, preview.innerHTML), D.file + ".doc", "application/msword");
  });
  $("pr-copy").addEventListener("click", function () { OF.copy(preview.innerText, this); });
  $("pr-reset").addEventListener("click", function () {
    if (!confirm(D.reset_confirm)) return;
    [K, K + "-phases", K + "-options"].forEach(function (key) { OF.save(key, null); });
    window.location.reload();
  });

  OF.persistForm(form, K);
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
