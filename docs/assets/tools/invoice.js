/*
 * Générateur de facture et de devis (estimate / quote), indépendant du pays.
 * Libellés, conditions de paiement et mentions viennent de la page : <script type="application/json" id="invoice-profile">.
 * Aperçu en direct, mémorisation sur l'appareil, export PDF par l'impression du navigateur.
 */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("invoice-form");
  var profileEl = document.getElementById("invoice-profile");
  if (!form || !profileEl) return;
  var P = JSON.parse(profileEl.textContent);
  var L = P.labels;
  var $ = function (id) { return document.getElementById(id); };
  var preview = $("iv-preview");
  var linesBox = $("iv-lines");
  var year = new Date().getFullYear();
  var K = P.storage;

  var state = {
    type: OF.load(K + "-type", "invoice"),
    lines: OF.load(K + "-lines", [{ desc: "", qty: "1", price: "" }]),
    numbers: OF.load(K + "-numbers", { invoice: year + "-001", estimate: "E-" + year + "-001" }),
    logo: OF.load(K + "-logo", "")
  };

  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function multiline(text) { return esc(text).replace(/\n/g, "<br>"); }
  function orHint(value, hint) {
    return value && value.trim() ? multiline(value.trim()) : '<span class="p-empty">' + esc(hint) + "</span>";
  }
  function val(id) { return ($(id) && $(id).value || "").trim(); }
  function date(iso) { return OF.date(iso, P.date_format); }
  function saveLines() { OF.save(K + "-lines", state.lines); }

  // ----- Lignes ----------------------------------------------------------------
  function renderLines() {
    linesBox.innerHTML = "";
    state.lines.forEach(function (line, i) {
      var row = document.createElement("div");
      row.className = "line-row";
      row.innerHTML =
        '<div class="field line-desc"><label for="l-desc-' + i + '">' + esc(L.item) + "</label>" +
        '<input type="text" id="l-desc-' + i + '" data-k="desc" placeholder="' + esc(P.item_placeholder) + '"></div>' +
        '<div class="field line-qty"><label for="l-qty-' + i + '">' + esc(L.qty) + "</label>" +
        '<input type="text" inputmode="decimal" id="l-qty-' + i + '" data-k="qty"></div>' +
        '<div class="field line-price"><label for="l-price-' + i + '">' + esc(L.rate) + "</label>" +
        '<input type="text" inputmode="decimal" id="l-price-' + i + '" data-k="price" placeholder="0"></div>' +
        '<button type="button" class="line-remove" aria-label="' + esc(L.remove) + " " + (i + 1) + '" title="' + esc(L.remove) + '">✕</button>';
      row.querySelector('[data-k="desc"]').value = line.desc;
      row.querySelector('[data-k="qty"]').value = line.qty;
      row.querySelector('[data-k="price"]').value = line.price;
      row.addEventListener("input", function (e) {
        var k = e.target.getAttribute("data-k");
        if (!k) return;
        state.lines[i][k] = e.target.value;
        saveLines();
        render();
      });
      row.querySelector(".line-remove").addEventListener("click", function () {
        state.lines.splice(i, 1);
        if (!state.lines.length) state.lines.push({ desc: "", qty: "1", price: "" });
        saveLines();
        renderLines();
        render();
      });
      linesBox.appendChild(row);
    });
  }
  $("iv-add-line").addEventListener("click", function () {
    state.lines.push({ desc: "", qty: "1", price: "" });
    saveLines();
    renderLines();
    linesBox.querySelector(".line-row:last-child input").focus();
    render();
  });

  // ----- Type de document ------------------------------------------------------
  function applyType() {
    form.querySelectorAll("[data-doctype]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-doctype") === state.type));
    });
    form.querySelectorAll("[data-only]").forEach(function (el) {
      el.hidden = el.getAttribute("data-only") !== state.type;
    });
    $("iv-number-label").textContent = state.type === "invoice" ? L.invoice_number : L.estimate_number;
    $("iv-number").value = state.numbers[state.type];
  }
  form.querySelectorAll("[data-doctype]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.type = b.getAttribute("data-doctype");
      OF.save(K + "-type", state.type);
      applyType();
      render();
    });
  });
  $("iv-number").addEventListener("input", function () {
    state.numbers[state.type] = $("iv-number").value;
    OF.save(K + "-numbers", state.numbers);
  });

  // ----- Logo ------------------------------------------------------------------
  $("iv-logo").addEventListener("change", function () {
    var file = this.files && this.files[0];
    if (!file) return;
    if (file.size > 600 * 1024) { alert(L.logo_too_big); this.value = ""; return; }
    var reader = new FileReader();
    reader.onload = function () { state.logo = reader.result; OF.save(K + "-logo", state.logo); render(); };
    reader.readAsDataURL(file);
  });
  $("iv-logo-remove").addEventListener("click", function () {
    state.logo = ""; OF.save(K + "-logo", ""); $("iv-logo").value = ""; render();
  });

  // ----- Calculs ---------------------------------------------------------------
  function totals() {
    var subtotal = 0;
    var rows = state.lines.map(function (l) {
      var qty = OF.num(l.qty), price = OF.num(l.price);
      var total = isFinite(qty) && isFinite(price) ? qty * price : NaN;
      if (isFinite(total)) subtotal += total;
      return { desc: l.desc, qty: qty, price: price, total: total };
    });
    var discountPct = Math.min(100, Math.max(0, OF.num(val("iv-discount")) || 0));
    var discount = Math.round(subtotal * discountPct) / 100;
    // Taux vide ou « none » : pas de ligne de taxe. Un taux de 0 % s'affiche si le profil le demande (TVA à taux zéro).
    var rawRate = val("iv-tax-rate");
    var taxRate = Math.max(0, OF.num(rawRate) || 0);
    var showTax = rawRate !== "" && rawRate !== "none" && isFinite(OF.num(rawRate)) && (taxRate > 0 || !!P.show_zero_tax);
    var tax = Math.round((subtotal - discount) * taxRate) / 100;
    var total = subtotal - discount + tax;
    var paid = state.type === "invoice" ? Math.max(0, OF.num(val("iv-paid")) || 0) : 0;
    return { rows: rows, subtotal: subtotal, discountPct: discountPct, discount: discount, taxRate: taxRate, tax: tax, showTax: showTax, total: total, paid: paid };
  }

  // ----- Aperçu ----------------------------------------------------------------
  function render() {
    var isInvoice = state.type === "invoice";
    var t = totals();
    var issued = val("iv-date") || OF.today();
    var termsDays = parseInt(val("iv-terms"), 10) || 0;
    var due = OF.addDays(issued, termsDays);
    var validUntil = OF.addDays(issued, Math.max(1, parseInt(val("iv-validity"), 10) || 30));
    $("iv-logo-remove").hidden = !state.logo;

    var me = [$("iv-me-address").value.trim(), val("iv-me-email"), val("iv-me-phone"),
      val("iv-me-taxid") ? L.tax_id + " " + val("iv-me-taxid") : "", val("iv-me-extra")].filter(Boolean);
    var client = [$("iv-client-address").value.trim(), val("iv-client-email"),
      val("iv-client-taxid") ? L.client_tax_id + " " + val("iv-client-taxid") : ""].filter(Boolean);

    var html = '<div class="p-head"><div class="p-brand">' +
      (state.logo ? '<img src="' + state.logo + '" alt="Logo">' : "") +
      '<div class="p-me-name">' + orHint(val("iv-me-name"), L.your_name) + "</div></div>" +
      '<div class="p-title">' + esc(isInvoice ? L.invoice : L.estimate) +
      "<span>" + esc(L.number) + " " + orHint(val("iv-number"), "—") + "</span></div></div>";

    html += '<div class="p-parties"><div><div class="p-label">' + esc(L.from) + "</div><strong>" + orHint(val("iv-me-name"), L.your_name) +
      "</strong><br>" + (me.length ? me.map(multiline).join("<br>") : '<span class="p-empty">' + esc(L.your_details) + "</span>") +
      '</div><div><div class="p-label">' + esc(isInvoice ? L.bill_to : L.prepared_for) + "</div><strong>" +
      orHint(val("iv-client-name"), L.client_name) + "</strong><br>" +
      (client.length ? client.map(multiline).join("<br>") : '<span class="p-empty">' + esc(L.client_details) + "</span>") + "</div></div>";

    var meta = [[isInvoice ? L.invoice_date : L.estimate_date, date(issued)]];
    if (isInvoice) {
      var termLabel = (P.terms.filter(function (x) { return x.value === termsDays; })[0] || {}).label;
      meta.push([L.terms, termLabel || termsDays + " " + L.days]);
      meta.push([L.due, date(due)]);
      if (val("iv-po")) meta.push([L.po, val("iv-po")]);
    } else {
      meta.push([L.valid, date(validUntil)]);
    }
    html += '<div class="p-meta">' + meta.map(function (m) {
      return "<div><span>" + esc(m[0]) + "</span><b>" + esc(m[1]) + "</b></div>";
    }).join("") + "</div>";

    html += '<table class="p-lines"><thead><tr><th>' + esc(L.item) + "</th><th>" + esc(L.qty) + "</th><th>" + esc(L.rate) +
      "</th><th>" + esc(L.amount) + "</th></tr></thead><tbody>";
    var any = false;
    t.rows.forEach(function (r) {
      if (!r.desc && !isFinite(r.price)) return;
      any = true;
      html += "<tr><td>" + orHint(r.desc, L.item) + "</td><td>" + (isFinite(r.qty) ? OF.fmt(r.qty) : "") +
        "</td><td>" + (isFinite(r.price) ? OF.money(r.price) : "") + "</td><td>" + (isFinite(r.total) ? OF.money(r.total) : "") + "</td></tr>";
    });
    if (!any) html += '<tr><td colspan="4"><span class="p-empty">' + esc(L.empty_lines) + "</span></td></tr>";
    html += "</tbody></table>";

    var tot = [[L.subtotal, OF.money(t.subtotal)]];
    if (t.discount > 0) tot.push([L.discount + " (" + OF.fmt(t.discountPct) + "%)", "− " + OF.money(t.discount)]);
    if (t.showTax) tot.push([(val("iv-tax-label") || L.tax) + " (" + OF.fmt(t.taxRate) + "%)", OF.money(t.tax)]);
    tot.push([L.total, OF.money(t.total), !t.paid]);
    if (t.paid > 0) {
      tot.push([L.paid, "− " + OF.money(t.paid)]);
      tot.push([L.balance, OF.money(t.total - t.paid), true]);
    }
    if (!isInvoice) {
      var pct = Math.min(100, Math.max(0, OF.num(val("iv-deposit-pct")) || 0));
      if (pct > 0) tot.push([L.deposit + " (" + OF.fmt(pct) + "%)", OF.money(t.total * pct / 100)]);
    }
    html += '<div class="p-totals">' + tot.map(function (r) {
      return '<div class="' + (r[2] ? "p-grand" : "") + '"><span>' + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></div>";
    }).join("") + "</div>";

    var notes = [];
    if (isInvoice) {
      if (val("iv-payment")) notes.push("<p><b>" + esc(L.payment) + "</b><br>" + multiline(val("iv-payment")) + "</p>");
      if (val("iv-late")) notes.push("<p>" + esc(L.late_prefix) + " " + esc(val("iv-late")) + "</p>");
    } else {
      notes.push("<p>" + esc(L.estimate_terms.replace("{date}", date(validUntil))) + "</p>");
    }
    (P.mentions || []).forEach(function (m) { notes.push("<p>" + esc(m) + "</p>"); });
    if (notes.length) html += '<div class="p-mentions">' + notes.join("") + "</div>";
    if (!isInvoice) {
      html += '<div class="p-sign"><div class="p-label">' + esc(L.accept_title) + "</div><p>" + esc(L.accept) +
        '</p><div class="p-sign-box"></div></div>';
    }
    if (val("iv-notes")) html += '<div class="p-notes">' + multiline(val("iv-notes")) + "</div>";
    preview.innerHTML = html;
  }

  // ----- Actions ---------------------------------------------------------------
  $("iv-print").addEventListener("click", function () {
    var title = document.title;
    document.title = (state.type === "invoice" ? L.invoice_file : L.estimate_file) + " " + (val("iv-number") || "");
    window.print();
    document.title = title;
  });
  $("iv-next").addEventListener("click", function () {
    var current = state.numbers[state.type] || "";
    var m = /(\d+)(\D*)$/.exec(current);
    state.numbers[state.type] = m ? current.slice(0, m.index) + String(+m[1] + 1).padStart(m[1].length, "0") + m[2] : current + "-2";
    OF.save(K + "-numbers", state.numbers);
    state.lines = [{ desc: "", qty: "1", price: "" }];
    saveLines();
    $("iv-paid").value = "";
    $("iv-date").value = OF.today();
    applyType();
    renderLines();
    render();
  });
  $("iv-reset").addEventListener("click", function () {
    if (!confirm(L.reset_confirm)) return;
    [K, K + "-type", K + "-lines", K + "-numbers", K + "-logo"].forEach(function (k) { OF.save(k, null); });
    window.location.reload();
  });

  // ----- Initialisation --------------------------------------------------------
  OF.persistForm(form, K);
  $("iv-date").value = OF.today();
  applyType();
  renderLines();
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
