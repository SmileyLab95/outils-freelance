/* Générateur de facture et de devis : aperçu en direct, mentions légales, export PDF via l'impression. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("facture-form");
  if (!form) return;
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
  function multiline(text) { return esc(text).replace(/\n/g, "<br>"); }
  function orHint(value, hint) {
    return value && value.trim() ? multiline(value.trim()) : '<span class="p-empty">' + esc(hint) + "</span>";
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

  // ----- Calculs ---------------------------------------------------------------
  function totals() {
    var ht = 0;
    var rows = state.lines.map(function (l) {
      var qty = OF.num(l.qty), price = OF.num(l.price);
      var total = isFinite(qty) && isFinite(price) ? qty * price : NaN;
      if (isFinite(total)) ht += total;
      return { desc: l.desc, qty: qty, price: price, total: total };
    });
    var franchise = $("f-franchise").checked;
    // Client professionnel à l'étranger : pas de TVA française (autoliquidation dans l'UE, hors champ ailleurs).
    var place = $("f-vat-place").value;
    var rate = franchise || place !== "fr" ? 0 : OF.num($("f-vat-rate").value);
    var vat = Math.round(ht * rate) / 100;
    var ttc = ht + vat;
    var paid = OF.num($("f-paid").value);
    return { rows: rows, ht: ht, rate: rate, vat: vat, ttc: ttc, paid: isFinite(paid) ? paid : 0, franchise: franchise,
             place: place, noVat: franchise || place !== "fr" };
  }

  // ----- Mention de franchise de TVA : 293 B du CGI, puis CIBS pour les factures datées à partir du 1er janvier 2027.
  var R = window.OF_RULES || {};
  function franchiseMention(date) {
    var next = R.mention_franchise_tva_2027;
    if (next && date >= next.from) return next.text + " (ex-art. 293 B du CGI).";
    return (R.mention_franchise_tva || "TVA non applicable, art. 293 B du CGI") + ".";
  }

  // ----- Aperçu ----------------------------------------------------------------
  var NATURES = { services: "Prestation de services", biens: "Livraison de biens", mixte: "Biens et services" };

  /** Identifiants du client professionnel : SIREN (ou n° de TVA saisi à sa place) et n° de TVA. */
  function clientIds(pro) {
    if (!pro) return [];
    var id = val("f-client-id"), vat = val("f-client-vat");
    return [
      id ? (/^[A-Z]{2}/i.test(id) ? "N° TVA : " : "SIREN : ") + id : "",
      vat ? "N° TVA : " + vat : ""
    ].filter(Boolean);
  }

  function render() {
    var isInvoice = state.type === "facture";
    var t = totals();
    var date = $("f-date").value || OF.today();
    var due = OF.addDays(date, Math.max(0, parseInt($("f-terms").value, 10) || 0));
    var validUntil = OF.addDays(date, Math.max(1, parseInt($("f-validity").value, 10) || 30));
    var pro = $("f-client-pro").checked;
    $("f-vat-rate-field").hidden = t.noVat;
    $("f-debits-field").hidden = t.noVat;
    form.querySelectorAll("[data-pro]").forEach(function (el) { el.hidden = !pro; });
    $("f-logo-remove").hidden = !state.logo;

    var meLines = [
      val("f-me-status"),
      $("f-me-address").value.trim(),
      val("f-me-siret") ? "SIRET : " + val("f-me-siret") : "",
      val("f-me-vat") ? "N° TVA : " + val("f-me-vat") : "",
      [val("f-me-email"), val("f-me-phone")].filter(Boolean).join(" · ")
    ].filter(Boolean);

    var html = '<div class="p-head"><div class="p-brand">' +
      (state.logo ? '<img src="' + state.logo + '" alt="Logo">' : "") +
      '<div class="p-me-name">' + orHint(val("f-me-name"), "Votre nom") + "</div></div>" +
      '<div class="p-title">' + (isInvoice ? "FACTURE" : "DEVIS") +
      '<span>N° ' + orHint(val("f-number"), "—") + "</span></div></div>";

    html += '<div class="p-parties"><div><div class="p-label">Émetteur</div><strong>' + orHint(val("f-me-name"), "Votre nom") +
      "</strong><br>" + (meLines.length ? meLines.map(multiline).join("<br>") : '<span class="p-empty">Statut, adresse, SIRET</span>') +
      '</div><div><div class="p-label">' + (isInvoice ? "Facturé à" : "Client") + "</div><strong>" +
      orHint(val("f-client-name"), "Nom du client") + "</strong><br>" + orHint($("f-client-address").value, "Adresse du client") +
      clientIds(pro).map(function (l) { return "<br>" + esc(l); }).join("") +
      (t.place === "eu" && !val("f-client-vat") ? '<br><span class="p-empty">N° de TVA intracommunautaire du client</span>' : "") +
      (val("f-client-delivery") ? '<div class="p-delivery"><span>Adresse de livraison</span><br>' + multiline(val("f-client-delivery")) + "</div>" : "") +
      "</div></div>";

    var meta = [["Date", OF.frDate(date)]];
    if (isInvoice) {
      meta.push(["Date de la prestation", OF.frDate($("f-service-date").value || date)]);
      meta.push(["Échéance", OF.frDate(due)]);
    } else {
      meta.push(["Valable jusqu'au", OF.frDate(validUntil)]);
    }
    meta.push(["Opération", NATURES[$("f-nature").value] || NATURES.services]);
    html += '<div class="p-meta">' + meta.map(function (m) {
      return "<div><span>" + esc(m[0]) + "</span><b>" + esc(m[1]) + "</b></div>";
    }).join("") + "</div>";

    html += '<table class="p-lines"><thead><tr><th>Désignation</th><th>Qté</th><th>Prix unitaire HT</th><th>Total HT</th></tr></thead><tbody>';
    t.rows.forEach(function (r) {
      if (!r.desc && !isFinite(r.price)) return;
      html += "<tr><td>" + orHint(r.desc, "Désignation") + "</td><td>" + (isFinite(r.qty) ? OF.fmt(r.qty) : "") +
        "</td><td>" + (isFinite(r.price) ? OF.eur(r.price) : "") + "</td><td>" + (isFinite(r.total) ? OF.eur(r.total) : "") + "</td></tr>";
    });
    if (!t.rows.some(function (r) { return r.desc || isFinite(r.price); })) {
      html += '<tr><td colspan="4"><span class="p-empty">Ajoutez vos prestations dans le formulaire</span></td></tr>';
    }
    html += "</tbody></table>";

    var tot = [["Total HT", OF.eur(t.ht)]];
    if (t.place === "eu") tot.push(["TVA", "autoliquidation"]);
    else if (t.noVat) tot.push(["TVA", "non applicable"]);
    else tot.push(["TVA (" + OF.fmt(t.rate) + " %)", OF.eur(t.vat)]);
    tot.push([t.noVat ? "Total à payer" : "Total TTC", OF.eur(t.ttc), true]);
    if (isInvoice && t.paid > 0) {
      tot.push(["Acompte déjà versé", "− " + OF.eur(t.paid)]);
      tot.push(["Net à payer", OF.eur(t.ttc - t.paid), true]);
    }
    if (!isInvoice) {
      var pct = Math.min(100, Math.max(0, OF.num($("f-deposit-pct").value) || 0));
      if (pct > 0) tot.push(["Acompte à la signature (" + OF.fmt(pct) + " %)", OF.eur(t.ttc * pct / 100)]);
    }
    html += '<div class="p-totals">' + tot.map(function (r) {
      return '<div class="' + (r[2] ? "p-grand" : "") + '"><span>' + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></div>";
    }).join("") + "</div>";

    var mentions = [];
    if (t.place === "eu") mentions.push("Autoliquidation : TVA due par le preneur (art. 196 de la directive 2006/112/CE).");
    else if (t.place === "world") mentions.push("TVA non applicable : prestation de services dont le lieu est hors de France (art. 44 de la directive 2006/112/CE).");
    else if (t.franchise) mentions.push(franchiseMention(date));
    else if ($("f-debits").checked) mentions.push("Option pour le paiement de la taxe d'après les débits.");
    if (isInvoice) {
      if (val("f-me-iban")) {
        mentions.push("Paiement par virement avant le " + OF.frDate(due) + " · IBAN " + val("f-me-iban") +
          (val("f-me-bic") ? " · BIC " + val("f-me-bic") : "") + (val("f-number") ? " · Référence : " + val("f-number") : "") + ".");
      } else {
        mentions.push("Paiement à réception, au plus tard le " + OF.frDate(due) + ".");
      }
      mentions.push("Pas d'escompte pour paiement anticipé.");
      if (pro) {
        mentions.push("En cas de retard de paiement : pénalités au taux de " + (val("f-penalty") || "trois fois le taux d'intérêt légal") +
          " et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce).");
      }
    } else {
      mentions.push("Devis valable jusqu'au " + OF.frDate(validUntil) + ". Toute prestation non prévue fera l'objet d'un devis complémentaire.");
    }
    html += '<div class="p-mentions">' + mentions.map(function (m) { return "<p>" + esc(m) + "</p>"; }).join("") + "</div>";

    if (!isInvoice) {
      html += '<div class="p-sign"><div class="p-label">Bon pour accord</div>' +
        "<p>Date et signature du client, précédées de la mention « Devis reçu avant l'exécution des travaux, bon pour accord ».</p><div class=\"p-sign-box\"></div></div>";
    }
    if (val("f-notes")) html += '<div class="p-notes">' + multiline(val("f-notes")) + "</div>";
    preview.innerHTML = html;
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
