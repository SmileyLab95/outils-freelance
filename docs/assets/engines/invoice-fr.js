/*
 * Moteur : facture, devis et avoir français (calculs, mentions légales, rendu HTML de la page imprimable).
 * Partagé par le générateur de facture public et l'Espace entrepreneur.
 *
 * Document attendu :
 * { type: "facture" | "devis" | "avoir", number, date, serviceDate, terms, validity, depositPct, nature,
 *   me: { name, status, address, siret, vat, email, phone, iban, bic, logo },
 *   client: { name, address, id, vat, delivery, pro },
 *   lines: [{ desc, qty, price }]  (nombres, ou NaN si non saisis),
 *   vat: { franchise, rate, place: "fr" | "eu" | "world", debits },
 *   paid, penalty, notes, origin: { number, date } (avoir) }
 * Formats : { eur(n), num(n), date(iso) } (par défaut window.OF dans le navigateur).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).invoiceFR = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var NATURES = { services: "Prestation de services", biens: "Livraison de biens", mixte: "Biens et services" };
  var TITLES = { facture: "FACTURE", devis: "DEVIS", avoir: "AVOIR" };

  function esc(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function multiline(text) { return esc(text).replace(/\n/g, "<br>"); }
  function str(v) { return v == null ? "" : String(v).trim(); }
  function orHint(value, hint) {
    return str(value) ? multiline(str(value)) : '<span class="p-empty">' + esc(hint) + "</span>";
  }
  /** Nombre saisi, ou NaN si la valeur est vide (null, chaîne vide) : une sauvegarde JSON transforme NaN en null. */
  function amount(v) { return v === null || v === undefined || v === "" ? NaN : Number(v); }

  function addDays(iso, days) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return "";
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days));
    return d.toISOString().slice(0, 10);
  }

  /** Totaux : HT, TVA (sauf franchise ou client professionnel à l'étranger), TTC. */
  function compute(doc) {
    var ht = 0;
    var rows = (doc.lines || []).map(function (l) {
      var qty = amount(l.qty), price = amount(l.price);
      var total = isFinite(qty) && isFinite(price) ? qty * price : NaN;
      if (isFinite(total)) ht += total;
      return { desc: l.desc, qty: qty, price: price, total: total };
    });
    var v = doc.vat || {};
    var place = v.place || "fr";
    var noVat = !!v.franchise || place !== "fr";
    var rate = noVat ? 0 : Number(v.rate) || 0;
    var vat = Math.round(ht * rate) / 100;
    var paid = Number(doc.paid);
    return { rows: rows, ht: ht, rate: rate, vat: vat, ttc: ht + vat, paid: isFinite(paid) ? paid : 0,
             franchise: !!v.franchise, place: place, noVat: noVat };
  }

  /** Mention de franchise : art. 293 B du CGI, puis CIBS pour les documents datés à partir du 1er janvier 2027. */
  function franchiseMention(date, rules) {
    var next = rules && rules.mention_franchise_tva_2027;
    if (next && date >= next.from) return next.text + " (ex-art. 293 B du CGI).";
    return ((rules && rules.mention_franchise_tva) || "TVA non applicable, art. 293 B du CGI") + ".";
  }

  /** Mentions légales du bas de document. */
  function mentions(doc, t, rules, fmt) {
    var list = [];
    var date = doc.date;
    var due = addDays(date, Math.max(0, parseInt(doc.terms, 10) || 0));
    var v = doc.vat || {};
    if (doc.type === "avoir" && doc.origin && doc.origin.number) {
      list.push("Avoir relatif à la facture n° " + doc.origin.number + (doc.origin.date ? " du " + fmt.date(doc.origin.date) : "") + ".");
    }
    if (t.place === "eu") list.push("Autoliquidation : TVA due par le preneur (art. 196 de la directive 2006/112/CE).");
    else if (t.place === "world") list.push("TVA non applicable : prestation de services dont le lieu est hors de France (art. 44 de la directive 2006/112/CE).");
    else if (t.franchise) list.push(franchiseMention(date, rules));
    else if (v.debits) list.push("Option pour le paiement de la taxe d'après les débits.");
    var me = doc.me || {};
    if (doc.type === "facture") {
      if (str(me.iban)) {
        list.push("Paiement par virement avant le " + fmt.date(due) + " · IBAN " + str(me.iban) +
          (str(me.bic) ? " · BIC " + str(me.bic) : "") + (str(doc.number) ? " · Référence : " + str(doc.number) : "") + ".");
      } else {
        list.push("Paiement à réception, au plus tard le " + fmt.date(due) + ".");
      }
      list.push("Pas d'escompte pour paiement anticipé.");
      if (doc.client && doc.client.pro) {
        var fee = rules && rules.indemnite_forfaitaire_recouvrement != null ? rules.indemnite_forfaitaire_recouvrement : 40;
        list.push("En cas de retard de paiement : pénalités au taux de " + (str(doc.penalty) || "trois fois le taux d'intérêt légal") +
          " et indemnité forfaitaire pour frais de recouvrement de " + fee + " € (art. L441-10 et D441-5 du Code de commerce).");
      }
    } else if (doc.type === "devis") {
      var validUntil = addDays(date, Math.max(1, parseInt(doc.validity, 10) || 30));
      list.push("Devis valable jusqu'au " + fmt.date(validUntil) + ". Toute prestation non prévue fera l'objet d'un devis complémentaire.");
    }
    return list;
  }

  /** Identifiants du client professionnel : SIREN (ou n° de TVA saisi à sa place) et n° de TVA. */
  function clientIds(client) {
    if (!client || !client.pro) return [];
    var id = str(client.id), vat = str(client.vat);
    return [id ? (/^[A-Z]{2}/i.test(id) ? "N° TVA : " : "SIREN : ") + id : "", vat ? "N° TVA : " + vat : ""].filter(Boolean);
  }

  /** Page imprimable complète (contenu de l'élément .paper). */
  function render(doc, rules, fmt) {
    fmt = fmt || (typeof window !== "undefined" && window.OF ? { eur: window.OF.eur, num: window.OF.fmt, date: window.OF.frDate } : null);
    var t = compute(doc);
    var type = TITLES[doc.type] ? doc.type : "facture";
    var me = doc.me || {}, client = doc.client || {};
    var date = doc.date;
    var due = addDays(date, Math.max(0, parseInt(doc.terms, 10) || 0));

    var meLines = [str(me.status), str(me.address), str(me.siret) ? "SIRET : " + str(me.siret) : "",
      str(me.vat) ? "N° TVA : " + str(me.vat) : "", [str(me.email), str(me.phone)].filter(Boolean).join(" · ")].filter(Boolean);

    var html = '<div class="p-head"><div class="p-brand">' +
      (me.logo ? '<img src="' + esc(me.logo) + '" alt="Logo">' : "") +
      '<div class="p-me-name">' + orHint(me.name, "Votre nom") + "</div></div>" +
      '<div class="p-title">' + TITLES[type] + "<span>N° " + orHint(doc.number, "—") + "</span></div></div>";

    html += '<div class="p-parties"><div><div class="p-label">Émetteur</div><strong>' + orHint(me.name, "Votre nom") +
      "</strong><br>" + (meLines.length ? meLines.map(multiline).join("<br>") : '<span class="p-empty">Statut, adresse, SIRET</span>') +
      '</div><div><div class="p-label">' + (type === "devis" ? "Client" : "Facturé à") + "</div><strong>" +
      orHint(client.name, "Nom du client") + "</strong><br>" + orHint(client.address, "Adresse du client") +
      clientIds(client).map(function (l) { return "<br>" + esc(l); }).join("") +
      (t.place === "eu" && !str(client.vat) ? '<br><span class="p-empty">N° de TVA intracommunautaire du client</span>' : "") +
      (str(client.delivery) ? '<div class="p-delivery"><span>Adresse de livraison</span><br>' + multiline(str(client.delivery)) + "</div>" : "") +
      "</div></div>";

    var meta = [["Date", fmt.date(date)]];
    if (type === "facture") {
      meta.push(["Date de la prestation", fmt.date(doc.serviceDate || date)]);
      meta.push(["Échéance", fmt.date(due)]);
    } else if (type === "devis") {
      meta.push(["Valable jusqu'au", fmt.date(addDays(date, Math.max(1, parseInt(doc.validity, 10) || 30)))]);
    }
    meta.push(["Opération", NATURES[doc.nature] || NATURES.services]);
    html += '<div class="p-meta">' + meta.map(function (m) {
      return "<div><span>" + esc(m[0]) + "</span><b>" + esc(m[1]) + "</b></div>";
    }).join("") + "</div>";

    html += '<table class="p-lines"><thead><tr><th>Désignation</th><th>Qté</th><th>Prix unitaire HT</th><th>Total HT</th></tr></thead><tbody>';
    t.rows.forEach(function (r) {
      if (!str(r.desc) && !isFinite(r.price)) return;
      html += "<tr><td>" + orHint(r.desc, "Désignation") + "</td><td>" + (isFinite(r.qty) ? fmt.num(r.qty) : "") +
        "</td><td>" + (isFinite(r.price) ? fmt.eur(r.price) : "") + "</td><td>" + (isFinite(r.total) ? fmt.eur(r.total) : "") + "</td></tr>";
    });
    if (!t.rows.some(function (r) { return str(r.desc) || isFinite(r.price); })) {
      html += '<tr><td colspan="4"><span class="p-empty">Ajoutez vos prestations dans le formulaire</span></td></tr>';
    }
    html += "</tbody></table>";

    var tot = [["Total HT", fmt.eur(t.ht)]];
    if (t.place === "eu") tot.push(["TVA", "autoliquidation"]);
    else if (t.noVat) tot.push(["TVA", "non applicable"]);
    else tot.push(["TVA (" + fmt.num(t.rate) + " %)", fmt.eur(t.vat)]);
    tot.push([type === "avoir" ? "Total de l'avoir" : t.noVat ? "Total à payer" : "Total TTC", fmt.eur(t.ttc), true]);
    if (type === "facture" && t.paid > 0) {
      tot.push(["Acompte déjà versé", "− " + fmt.eur(t.paid)]);
      tot.push(["Net à payer", fmt.eur(t.ttc - t.paid), true]);
    }
    if (type === "devis") {
      var pct = Math.min(100, Math.max(0, Number(doc.depositPct) || 0));
      if (pct > 0) tot.push(["Acompte à la signature (" + fmt.num(pct) + " %)", fmt.eur(t.ttc * pct / 100)]);
    }
    html += '<div class="p-totals">' + tot.map(function (r) {
      return '<div class="' + (r[2] ? "p-grand" : "") + '"><span>' + esc(r[0]) + "</span><b>" + esc(r[1]) + "</b></div>";
    }).join("") + "</div>";

    html += '<div class="p-mentions">' + mentions(doc, t, rules, fmt).map(function (m) { return "<p>" + esc(m) + "</p>"; }).join("") + "</div>";
    if (type === "devis") {
      html += '<div class="p-sign"><div class="p-label">Bon pour accord</div>' +
        "<p>Date et signature du client, précédées de la mention « Devis reçu avant l'exécution des travaux, bon pour accord ».</p><div class=\"p-sign-box\"></div></div>";
    }
    if (str(doc.notes)) html += '<div class="p-notes">' + multiline(str(doc.notes)) + "</div>";
    return html;
  }

  return { NATURES: NATURES, amount: amount, compute: compute, franchiseMention: franchiseMention, mentions: mentions, render: render, addDays: addDays };
});
