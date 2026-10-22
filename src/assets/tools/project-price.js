/*
 * Prix d'un projet au forfait (quatre pays, deux langues) : tâches, imprévus, frais, taxes, acompte, et tarif réel
 * d'un prix proposé (moteur OFE.projectPrice). Textes, tâches d'exemple et taxes proposées dans la page
 * (<script type="application/json" id="project-price-data">) ; taux de taxe lus dans les règles (window.OF_RULES).
 * Spécification : documentation/18-outils-de-prix.md (§ 2).
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("pp-form");
  var dataEl = document.getElementById("project-price-data");
  if (!form || !dataEl || !OFE || !OFE.projectPrice || !R) return;
  var L = JSON.parse(dataEl.textContent);
  var K = "project-price", MAX = 10;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var list = function (items) {
    return window.Intl && Intl.ListFormat ? new Intl.ListFormat(OF.locale, { type: "conjunction" }).format(items) : items.join(", ");
  };
  var rule = function (path) { return path.split(".").reduce(function (v, k) { return v == null ? v : v[k]; }, R); };
  var pct = function (rate) { return OF.fmt(Math.round(rate * 100000) / 1000) + L.percent; };
  var lines = OF.load(K + "-lines", null) || L.default_lines.map(function (l) { return { desc: l[0], time: l[1] }; });
  var linesBox = $("pp-lines");

  // ----- Taxes proposées : options de la page (taux lus dans les règles) ou provinces du Canada -----------------
  var TAXES = [];
  if (L.taxes) {
    TAXES = L.taxes.map(function (o) {
      return { key: o.key, label: o.label, components: (o.components || []).map(function (c) { return { label: c.label, rate: rule(c.rule) }; }) };
    });
  } else if (L.provinces) {
    var PR = R._meta.provinces, N = L.provinces.tax_names;
    TAXES = [{ key: "none", label: L.provinces.none, components: [] }].concat(Object.keys(PR).sort(function (a, b) {
      return PR[a][L.provinces.names].localeCompare(PR[b][L.provinces.names], OF.locale);
    }).map(function (code) {
      // TPS/TVH et TVQ au Québec ; la TVP n'est pas comptée (la plupart des services professionnels en sont exemptés).
      var t = PR[code].sales_tax;
      var components = t.type === "HST" ? [{ label: N.HST, rate: t.rate }]
        : [{ label: N.GST, rate: t.gst }].concat(t.type === "GST+QST" ? [{ label: N.QST, rate: t.provincial }] : []);
      return { key: code, label: PR[code][L.provinces.names], components: components };
    }));
  }
  if (TAXES.length) {
    $("pp-tax").innerHTML = TAXES.map(function (o) {
      var rates = o.components.length ? " · " + o.components.map(function (c) { return c.label + " " + pct(c.rate); }).join(" + ") : "";
      return '<option value="' + esc(o.key) + '">' + esc(o.label + rates) + "</option>";
    }).join("");
  }

  // ----- Tâches ------------------------------------------------------------------------------------------------
  function saveLines() { OF.save(K + "-lines", lines); }
  function renderLines() {
    linesBox.innerHTML = "";
    lines.forEach(function (line, i) {
      var row = document.createElement("div");
      row.className = "line-row pp-line";
      row.innerHTML =
        '<div class="field line-desc"><label for="pp-desc-' + i + '">' + esc(L.task) + " " + (i + 1) + "</label>" +
        '<input type="text" id="pp-desc-' + i + '" data-k="desc" placeholder="' + esc(L.task_placeholder) + '"></div>' +
        '<div class="field line-qty"><label for="pp-time-' + i + '" class="pp-time-label">' + esc(L.units[unit()].time) + "</label>" +
        '<input type="text" inputmode="decimal" id="pp-time-' + i + '" data-k="time"></div>' +
        '<button type="button" class="line-remove" aria-label="' + esc(fill(L.remove, { n: i + 1 })) + '" title="' + esc(fill(L.remove, { n: i + 1 })) + '">✕</button>';
      row.querySelector('[data-k="desc"]').value = line.desc;
      row.querySelector('[data-k="time"]').value = line.time;
      row.addEventListener("input", function (e) {
        var k = e.target.getAttribute("data-k");
        if (!k) return;
        lines[i][k] = e.target.value;
        saveLines();
        compute();
      });
      row.querySelector(".line-remove").addEventListener("click", function () {
        lines.splice(i, 1);
        if (!lines.length) lines.push({ desc: "", time: "" });
        saveLines();
        renderLines();
        compute();
        var rows = linesBox.querySelectorAll(".pp-line input[data-k='desc']");
        rows[Math.min(i, rows.length - 1)].focus();
      });
      linesBox.appendChild(row);
    });
    $("pp-add").disabled = lines.length >= MAX;
  }
  $("pp-add").addEventListener("click", function () {
    if (lines.length >= MAX) return;
    lines.push({ desc: "", time: "" });
    saveLines();
    renderLines();
    linesBox.querySelector(".pp-line:last-child input").focus();
    compute();
  });

  function unit() { return $("pp-unit").value === "hour" ? "hour" : "day"; }
  // Quantité avec son unité, accordée : singulier sous 2 en français (« 1,5 jour »), seulement pour 1 en anglais.
  function qty(n) {
    var U = L.units[unit()], one = L.one_below ? n < L.one_below : n === 1;
    return OF.fmt(Math.round(n * 100) / 100) + " " + (one ? U.one : U.other);
  }

  // Nombre saisi : vide → null ; illisible ou négatif → signalé et nommé.
  function amount(el, name, bad) {
    var raw = el.value.trim(), n = OF.num(raw), invalid = raw !== "" && !(isFinite(n) && n >= 0);
    el.setAttribute("aria-invalid", String(invalid));
    if (invalid) bad.push(name);
    return invalid || raw === "" ? null : n;
  }

  var ROWS = ["pp-r-time", "pp-r-extra", "pp-r-fees", "pp-r-expenses", "pp-r-net", "pp-r-tax", "pp-r-gross", "pp-r-deposit", "pp-r-balance"];
  function blank(sub, msg, warn) {
    ROWS.forEach(function (id) { set(id, "–"); });
    set("pp-big", "–");
    set("pp-sub", sub);
    $("pp-notice").textContent = msg;
    $("pp-notice").className = "notice" + (warn ? " warn" : "");
  }

  function compute() {
    var U = L.units[unit()];
    set("pp-rate-label", U.rate);
    Array.prototype.forEach.call(linesBox.querySelectorAll(".pp-time-label"), function (el) { el.textContent = U.time; });
    var bad = [];
    var times = Array.prototype.map.call(linesBox.querySelectorAll("input[data-k='time']"), function (el, i) {
      return amount(el, fill(L.fields.time, { n: i + 1 }), bad);
    });
    var rate = amount($("pp-rate"), L.fields.rate, bad), contingency = amount($("pp-contingency"), L.fields.contingency, bad);
    var expenses = amount($("pp-expenses"), L.fields.expenses, bad), deposit = amount($("pp-deposit"), L.fields.deposit, bad);
    var offer = amount($("pp-offer"), L.fields.offer, bad);
    if (bad.length) return blank(fill(L.check, { fields: list(bad) }), fill(L.check_notice, { fields: list(bad) }), true);
    var tax = TAXES.filter(function (o) { return o.key === ($("pp-tax") ? $("pp-tax").value : "none"); })[0];
    var components = tax ? tax.components : [];
    var r = OFE.projectPrice.price({ times: times, rate: rate, contingency: (contingency || 0) / 100, expenses: expenses,
      deposit: (deposit || 0) / 100, components: components, offer: offer });
    if (r.error) return blank(r.error === "no_rate" ? L.enter_rate : L.enter_time, L.msg_always, false);

    var withTax = components.length > 0, withDeposit = r.deposit > 0;
    set("pp-r-time", qty(r.time));
    set("pp-r-extra", qty(r.covered - r.time));
    set("pp-r-fees", OF.money(r.fees, 2));
    set("pp-r-expenses", OF.money(r.expenses, 2));
    set("pp-r-net", OF.money(r.net, 2));
    set("pp-tax-label", withTax ? components.map(function (c) { return c.label; }).join(" + ") : L.tax);
    set("pp-r-tax", OF.money(r.tax, 2));
    set("pp-r-gross", OF.money(r.gross, 2));
    set("pp-r-deposit", OF.money(r.deposit, 2));
    set("pp-r-balance", OF.money(r.balance, 2));
    $("pp-row-tax").hidden = $("pp-row-gross").hidden = !withTax;
    $("pp-row-deposit").hidden = $("pp-row-balance").hidden = !withDeposit;
    set("pp-big", OF.money(r.net, 0));
    var covered = fill(L.covered, { covered: qty(r.covered), time: qty(r.time), contingency: OF.fmt(contingency || 0) + L.percent });
    set("pp-sub", (withTax ? fill(L.sub_tax, { gross: OF.money(r.gross, 0) }) + " " : "") + covered);
    var msgs = [];
    if (r.offerRate !== null) {
      // Prix proposé qui ne couvre même pas les frais : pas de tarif réel (il serait nul ou négatif).
      var diff = r.offerRate - rate;
      msgs.push(fill(r.offerRate <= 0 ? L.offer_low : Math.abs(diff) < 0.005 ? L.offer_same : diff > 0 ? L.offer_more : L.offer_less, {
        offer: OF.money(offer, 2), rate: OF.money(r.offerRate, 2), yours: OF.money(rate, 2), diff: OF.money(Math.abs(diff), 2), unit: U.one,
        expenses: OF.money(r.expenses, 2)
      }));
    }
    msgs.push(L.msg_always);
    $("pp-notice").textContent = msgs.join(" ");
    $("pp-notice").className = "notice";
  }

  renderLines();
  OF.persistForm(form, K);
  form.addEventListener("input", compute);
  form.addEventListener("change", function (e) {
    if (e.target.id === "pp-unit") renderLines();
    compute();
  });
  compute();
})();
