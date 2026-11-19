/*
 * Générateur de facture et de devis (estimate / quote), indépendant du pays.
 * Libellés, conditions de paiement et mentions viennent de la page : <script type="application/json" id="invoice-profile">.
 * Aperçu en direct, mémorisation sur l'appareil, export PDF par l'impression du navigateur. Totaux et aperçu :
 * engines/invoice-intl.js (moteur partagé avec l'Espace).
 */
(function () {
  "use strict";
  var OF = window.OF, IV = window.OFE && window.OFE.invoiceIntl;
  var form = document.getElementById("invoice-form");
  var profileEl = document.getElementById("invoice-profile");
  if (!form || !profileEl || !IV) return;
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
  function val(id) { return ($(id) && $(id).value || "").trim(); }
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

  // ----- Document et aperçu (engines/invoice-intl.js, partagé avec l'Espace : documentation/60, § 3.1, lot 2d) ----
  /** Document décrit par le formulaire : nombres lus (NaN si vides), textes sans espaces superflus. */
  function currentDoc() {
    var rawRate = val("iv-tax-rate");
    return {
      type: state.type, number: val("iv-number"), date: val("iv-date") || OF.today(), terms: val("iv-terms"), validity: val("iv-validity"),
      po: val("iv-po"), paid: OF.num(val("iv-paid")), depositPct: OF.num(val("iv-deposit-pct")), discountPct: OF.num(val("iv-discount")),
      tax: P.tax_options ? { option: rawRate } : { rate: OF.num(rawRate), label: val("iv-tax-label") },
      me: { name: val("iv-me-name"), address: $("iv-me-address").value.trim(), email: val("iv-me-email"), phone: val("iv-me-phone"),
            taxId: val("iv-me-taxid"), extra: val("iv-me-extra"), logo: state.logo },
      client: { name: val("iv-client-name"), address: $("iv-client-address").value.trim(), email: val("iv-client-email"),
                taxId: val("iv-client-taxid") },
      lines: state.lines.map(function (l) { return { desc: l.desc, qty: OF.num(l.qty), price: OF.num(l.price) }; }),
      payment: val("iv-payment"), late: val("iv-late"), notes: val("iv-notes")
    };
  }
  var FMT = { money: OF.money, num: OF.fmt, rate: OF.rate, date: function (iso) { return OF.date(iso, P.date_format); } };
  function render() {
    $("iv-logo-remove").hidden = !state.logo;
    preview.innerHTML = IV.render(currentDoc(), P, FMT);
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

  // ----- Taxes par province (Canada) --------------------------------------------
  if (P.tax_from_rules && window.OF_RULES) {
    var PR = window.OF_RULES._meta.provinces, N = P.tax_names;
    P.tax_options = Object.keys(PR).sort(function (a, b) {
      return PR[a][P.names].localeCompare(PR[b][P.names], OF.locale);
    }).map(function (code) {
      var t = PR[code].sales_tax, parts = t.type.split("+");
      var components = t.type === "HST" ? [{ label: N.HST, rate: t.rate * 100 }]
        : [{ label: N.GST, rate: t.gst * 100 }].concat(parts[1] ? [{ label: N[parts[1]], rate: t.provincial * 100 }] : []);
      return { key: code, label: PR[code][P.names], components: components };
    });
    // Exportation de services détaxée (taux de 0 %), avec la TVQ pour une entreprise du Québec.
    if (L.zero_rated) P.tax_options.push(
      { key: "zero", label: L.zero_rated, components: [{ label: N.GST + "/" + N.HST, rate: 0 }] },
      { key: "zero-qc", label: L.zero_rated_qc, components: [{ label: N.GST, rate: 0 }, { label: N.QST, rate: 0 }] });
    $("iv-tax-rate").innerHTML = '<option value="none">' + esc(L.no_tax) + "</option>" + P.tax_options.map(function (o) {
      return '<option value="' + o.key + '"' + (o.key === P.default_tax ? " selected" : "") + ">" + esc(o.label + " · " + o.components.map(function (c) {
        return c.label + " " + OF.rate(c.rate) + L.percent;
      }).join(" + ")) + "</option>";
    }).join("");
  }

  // ----- Initialisation --------------------------------------------------------
  OF.persistForm(form, K);
  $("iv-date").value = OF.today();
  applyType();
  renderLines();
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
