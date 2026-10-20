/* Générateur de facture et de devis : aperçu en direct, mentions légales, export PDF via l'impression. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE;
  var form = document.getElementById("facture-form");
  if (!form || !OFE) return;
  var $ = function (id) { return document.getElementById(id); };
  var preview = $("f-preview");
  var linesBox = $("f-lines");
  var year = new Date().getFullYear();

  var state = {
    type: OF.load("facture-type", "facture"),
    lines: OF.load("facture-lines", [{ desc: "", qty: "1", price: "" }]),
    numbers: OF.load("facture-numbers", { facture: year + "-001", devis: "D-" + year + "-001" }),
    logo: OF.load("facture-logo", "")
  };

  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function val(id) { return ($(id).value || "").trim(); }

  // ----- Lignes de prestations -------------------------------------------------
  function renderLines() {
    linesBox.innerHTML = "";
    state.lines.forEach(function (line, i) {
      var row = document.createElement("div");
      row.className = "line-row";
      row.innerHTML =
        '<div class="field line-desc"><label for="l-desc-' + i + '">Désignation</label>' +
        '<input type="text" id="l-desc-' + i + '" data-k="desc" placeholder="Ex. : création d\'un site vitrine (5 pages)"></div>' +
        '<div class="field line-qty"><label for="l-qty-' + i + '">Qté</label>' +
        '<input type="text" inputmode="decimal" id="l-qty-' + i + '" data-k="qty"></div>' +
        '<div class="field line-price"><label for="l-price-' + i + '">Prix unitaire HT</label>' +
        '<div class="input-suffix"><input type="text" inputmode="decimal" id="l-price-' + i + '" data-k="price" placeholder="0"><span>€</span></div></div>' +
        '<button type="button" class="line-remove" aria-label="Supprimer la ligne ' + (i + 1) + '" title="Supprimer">✕</button>';
      row.querySelector('[data-k="desc"]').value = line.desc;
      row.querySelector('[data-k="qty"]').value = line.qty;
      row.querySelector('[data-k="price"]').value = line.price;
      row.addEventListener("input", function (e) {
        var k = e.target.getAttribute("data-k");
        if (!k) return;
        state.lines[i][k] = e.target.value;
        OF.save("facture-lines", state.lines);
        render();
      });
      row.querySelector(".line-remove").addEventListener("click", function () {
        state.lines.splice(i, 1);
        if (!state.lines.length) state.lines.push({ desc: "", qty: "1", price: "" });
        OF.save("facture-lines", state.lines);
        renderLines();
        render();
      });
      linesBox.appendChild(row);
    });
  }
  $("f-add-line").addEventListener("click", function () {
    state.lines.push({ desc: "", qty: "1", price: "" });
    OF.save("facture-lines", state.lines);
    renderLines();
    linesBox.querySelector(".line-row:last-child input").focus();
    render();
  });

  // ----- Type de document ------------------------------------------------------
  function applyType() {
    var isInvoice = state.type === "facture";
    form.querySelectorAll("[data-doctype]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-doctype") === state.type));
    });
    form.querySelectorAll("[data-only]").forEach(function (el) {
      el.hidden = el.getAttribute("data-only") !== state.type;
    });
    $("f-number-label").textContent = isInvoice ? "Numéro de facture" : "Numéro de devis";
    $("f-number").value = state.numbers[state.type];
  }
  form.querySelectorAll("[data-doctype]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.type = b.getAttribute("data-doctype");
      OF.save("facture-type", state.type);
      applyType();
      render();
    });
  });
  $("f-number").addEventListener("input", function () {
    state.numbers[state.type] = $("f-number").value;
    OF.save("facture-numbers", state.numbers);
  });

  // ----- Logo ------------------------------------------------------------------
  $("f-logo").addEventListener("change", function () {
    var file = this.files && this.files[0];
    if (!file) return;
    if (file.size > 600 * 1024) { alert("Ce logo est trop lourd (600 Ko maximum)."); this.value = ""; return; }
    var reader = new FileReader();
    reader.onload = function () { state.logo = reader.result; OF.save("facture-logo", state.logo); render(); };
    reader.readAsDataURL(file);
  });
  $("f-logo-remove").addEventListener("click", function () {
    state.logo = ""; OF.save("facture-logo", ""); $("f-logo").value = ""; render();
  });

  // ----- Document : les valeurs du formulaire, mises en forme par le moteur OFE.invoiceFR --------------
  var R = window.OF_RULES || {};

  function currentDoc() {
    var num = function (id) { return OF.num($(id).value); };
    return {
      type: state.type, number: val("f-number"),
      date: $("f-date").value || OF.today(), serviceDate: $("f-service-date").value,
      terms: $("f-terms").value, validity: $("f-validity").value, depositPct: num("f-deposit-pct"),
      nature: $("f-nature").value,
      me: { name: val("f-me-name"), status: val("f-me-status"), address: $("f-me-address").value.trim(), siret: val("f-me-siret"),
            vat: val("f-me-vat"), email: val("f-me-email"), phone: val("f-me-phone"), iban: val("f-me-iban"), bic: val("f-me-bic"),
            logo: state.logo },
      client: { name: val("f-client-name"), address: $("f-client-address").value, id: val("f-client-id"), vat: val("f-client-vat"),
                delivery: val("f-client-delivery"), pro: $("f-client-pro").checked },
      lines: state.lines.map(function (l) { return { desc: l.desc, qty: OF.num(l.qty), price: OF.num(l.price) }; }),
      vat: { franchise: $("f-franchise").checked, rate: num("f-vat-rate"), place: $("f-vat-place").value, debits: $("f-debits").checked },
      paid: num("f-paid"), penalty: val("f-penalty"), notes: val("f-notes")
    };
  }

  function render() {
    var doc = currentDoc();
    var t = OFE.invoiceFR.compute(doc);
    $("f-vat-rate-field").hidden = t.noVat;
    $("f-debits-field").hidden = t.noVat;
    form.querySelectorAll("[data-pro]").forEach(function (el) { el.hidden = !doc.client.pro; });
    $("f-logo-remove").hidden = !state.logo;
    preview.innerHTML = OFE.invoiceFR.render(doc, R, { eur: OF.eur, num: OF.fmt, date: OF.frDate });
  }

  // ----- Actions ---------------------------------------------------------------
  $("f-print").addEventListener("click", function () {
    var title = document.title;
    document.title = (state.type === "facture" ? "Facture " : "Devis ") + (val("f-number") || "");
    window.print();
    document.title = title;
  });
  $("f-next").addEventListener("click", function () {
    var current = state.numbers[state.type] || "";
    var m = /(\d+)(\D*)$/.exec(current);
    var next = m ? current.slice(0, m.index) + String(+m[1] + 1).padStart(m[1].length, "0") + m[2] : current + "-2";
    state.numbers[state.type] = next;
    OF.save("facture-numbers", state.numbers);
    state.lines = [{ desc: "", qty: "1", price: "" }];
    OF.save("facture-lines", state.lines);
    $("f-paid").value = "";
    $("f-date").value = OF.today();
    $("f-service-date").value = OF.today();
    applyType();
    renderLines();
    render();
  });
  $("f-reset").addEventListener("click", function () {
    if (!confirm("Effacer toutes les informations saisies ?")) return;
    ["facture", "facture-type", "facture-lines", "facture-numbers", "facture-logo"].forEach(function (k) { OF.save(k, null); });
    window.location.reload();
  });

  // ----- Initialisation --------------------------------------------------------
  OF.persistForm(form, "facture");
  $("f-date").value = OF.today();
  $("f-service-date").value = OF.today();
  applyType();
  renderLines();
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
