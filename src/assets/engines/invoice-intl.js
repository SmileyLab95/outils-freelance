/*
 * Moteur : facture et devis (invoice, estimate / quote) hors de France : États-Unis, Royaume-Uni, Canada.
 * Fonctions pures : document → totaux, document → aperçu HTML. Partagé par le générateur public (tools/invoice.js) et
 * l'Espace de ces pays (documentation/60-espace-etats-unis.md, § 3.1, lot 2d) : une facture a le même aperçu et les
 * mêmes totaux dans les deux (critère U2). Libellés, conditions de paiement, taxes et mentions viennent du profil de la
 * section (<script type="application/json" id="invoice-profile"> de la page du générateur).
 *
 * Document : { type: "invoice" | "estimate", number, date (AAAA-MM-JJ), terms (jours), validity (jours), po, paid,
 *   depositPct, discountPct, tax: { option } (profil avec tax_options) ou { rate, label }, me: { name, address, email,
 *   phone, taxId, extra, logo }, client: { name, address, email, taxId }, lines: [{ desc, qty, price }], payment, late,
 *   notes } ; les nombres sont déjà lus (NaN si vides ou illisibles), les textes sont déjà sans espaces superflus.
 * Formats (fmt) : { money, num, rate, date } de la section.
 * Testé par tests/unit/invoice-intl.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).invoiceIntl = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function amount(v) { return v === null || v === undefined || v === "" ? NaN : Number(v); }
  function addDays(iso, days) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return "";
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days)).toISOString().slice(0, 10);
  }
  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function multiline(text) { return esc(text).replace(/\n/g, "<br>"); }
  function orHint(value, hint) {
    return value && String(value).trim() ? multiline(String(value).trim()) : '<span class="p-empty">' + esc(hint) + "</span>";
  }

  /**
   * Totaux : lignes (quantité × prix, sans arrondi par ligne), remise en pourcentage (arrondie au centime), taxes
   * (une option du profil à plusieurs composantes, comme TPS + TVQ, ou un taux saisi ; taux vide : pas de taxe ; 0 %
   * affiché seulement si le profil le demande), total, montant déjà payé (facture seulement).
   */
  function compute(doc, P) {
    var L = P.labels || {}, subtotal = 0;
    var rows = (doc.lines || []).map(function (l) {
      var qty = amount(l.qty), price = amount(l.price);
      var total = isFinite(qty) && isFinite(price) ? qty * price : NaN;
      if (isFinite(total)) subtotal += total;
      return { desc: l.desc, qty: qty, price: price, total: total };
    });
    var discountPct = Math.min(100, Math.max(0, amount(doc.discountPct) || 0));
    var discount = Math.round(subtotal * discountPct) / 100;
    var t = doc.tax || {}, components;
    if (P.tax_options) {
      var option = P.tax_options.filter(function (o) { return o.key === t.option; })[0];
      components = option ? option.components : [];
    } else {
      var rate = amount(t.rate), single = Math.max(0, rate || 0);
      components = isFinite(rate) && (single > 0 || !!P.show_zero_tax) ? [{ label: t.label || L.tax, rate: single }] : [];
    }
    var taxes = components.map(function (c) {
      return { label: c.label, rate: c.rate, amount: Math.round((subtotal - discount) * c.rate) / 100 };
    });
    var tax = taxes.reduce(function (sum, x) { return sum + x.amount; }, 0);
    var total = subtotal - discount + tax;
    var paid = doc.type === "invoice" ? Math.max(0, amount(doc.paid) || 0) : 0;
    return { rows: rows, subtotal: subtotal, discountPct: discountPct, discount: discount, taxes: taxes, tax: tax, total: total, paid: paid,
             ttc: total, noVat: !taxes.length };
  }

  /** Aperçu HTML du document (même balisage que le générateur public : classes p-head, p-lines, p-totals…). */
  function render(doc, P, fmt) {
    var L = P.labels, isInvoice = doc.type === "invoice";
    var t = compute(doc, P);
    var issued = doc.date;
    var termsDays = parseInt(doc.terms, 10) || 0;
    var due = addDays(issued, termsDays);
    var validUntil = addDays(issued, Math.max(1, parseInt(doc.validity, 10) || 30));
    var me = doc.me || {}, cl = doc.client || {};

    var mine = [me.address, me.email, me.phone, me.taxId ? L.tax_id + " " + me.taxId : "", me.extra].filter(Boolean);
    var theirs = [cl.address, cl.email, cl.taxId ? L.client_tax_id + " " + cl.taxId : ""].filter(Boolean);

    var html = '<div class="p-head"><div class="p-brand">' +
      (me.logo ? '<img src="' + me.logo + '" alt="Logo">' : "") +
      '<div class="p-me-name">' + orHint(me.name, L.your_name) + "</div></div>" +
      '<div class="p-title">' + esc(isInvoice ? L.invoice : L.estimate) +
      "<span>" + esc(L.number) + " " + orHint(doc.number, "—") + "</span></div></div>";

    html += '<div class="p-parties"><div><div class="p-label">' + esc(L.from) + "</div><strong>" + orHint(me.name, L.your_name) +
      "</strong><br>" + (mine.length ? mine.map(multiline).join("<br>") : '<span class="p-empty">' + esc(L.your_details) + "</span>") +
      '</div><div><div class="p-label">' + esc(isInvoice ? L.bill_to : L.prepared_for) + "</div><strong>" +
      orHint(cl.name, L.client_name) + "</strong><br>" +
      (theirs.length ? theirs.map(multiline).join("<br>") : '<span class="p-empty">' + esc(L.client_details) + "</span>") + "</div></div>";

    var meta = [[isInvoice ? L.invoice_date : L.estimate_date, fmt.date(issued)]];
    if (isInvoice) {
      var termLabel = ((P.terms || []).filter(function (x) { return x.value === termsDays; })[0] || {}).label;
      meta.push([L.terms, termLabel || termsDays + " " + L.days]);
      meta.push([L.due, fmt.date(due)]);
      if (doc.po) meta.push([L.po, doc.po]);
    } else {
      meta.push([L.valid, fmt.date(validUntil)]);
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
      html += "<tr><td>" + orHint(r.desc, L.item) + "</td><td>" + (isFinite(r.qty) ? fmt.num(r.qty) : "") +
        "</td><td>" + (isFinite(r.price) ? fmt.money(r.price) : "") + "</td><td>" + (isFinite(r.total) ? fmt.money(r.total) : "") + "</td></tr>";
    });
    if (!any) html += '<tr><td colspan="4"><span class="p-empty">' + esc(L.empty_lines) + "</span></td></tr>";
    html += "</tbody></table>";

    var tot = [[L.subtotal, fmt.money(t.subtotal)]];
    if (t.discount > 0) tot.push([L.discount + " (" + fmt.num(t.discountPct) + L.percent + ")", "− " + fmt.money(t.discount)]);
    t.taxes.forEach(function (x) { tot.push([x.label + " (" + fmt.rate(x.rate) + L.percent + ")", fmt.money(x.amount)]); });
    tot.push([L.total, fmt.money(t.total), !t.paid]);
    if (t.paid > 0) {
      tot.push([L.paid, "− " + fmt.money(t.paid)]);
      tot.push([L.balance, fmt.money(t.total - t.paid), true]);
    }
    if (!isInvoice) {
      var pct = Math.min(100, Math.max(0, amount(doc.depositPct) || 0));
      if (pct > 0) tot.push([L.deposit + " (" + fmt.num(pct) + L.percent + ")", fmt.money(t.total * pct / 100)]);
    }
    html += '<div class="p-totals">' + tot.map(function (r) {
      return '<div class="' + (r[2] ? "p-grand" : "") + '"><span>' + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></div>";
    }).join("") + "</div>";

    var notes = [];
    if (isInvoice) {
      if (doc.payment) notes.push("<p><b>" + esc(L.payment) + "</b><br>" + multiline(doc.payment) + "</p>");
      if (doc.late) notes.push("<p>" + esc(L.late_prefix) + " " + esc(doc.late) + "</p>");
    } else {
      notes.push("<p>" + esc(L.estimate_terms.replace("{date}", fmt.date(validUntil))) + "</p>");
    }
    (P.mentions || []).forEach(function (m) { notes.push("<p>" + esc(m) + "</p>"); });
    if (notes.length) html += '<div class="p-mentions">' + notes.join("") + "</div>";
    if (!isInvoice) {
      html += '<div class="p-sign"><div class="p-label">' + esc(L.accept_title) + "</div><p>" + esc(L.accept) +
        '</p><div class="p-sign-box"></div></div>';
    }
    if (doc.notes) html += '<div class="p-notes">' + multiline(doc.notes) + "</div>";
    return html;
  }

  return { amount: amount, addDays: addDays, compute: compute, render: render };
});
