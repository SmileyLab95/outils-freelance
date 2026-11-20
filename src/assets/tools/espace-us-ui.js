/*
 * Écrans de l'Espace entrepreneur propres aux États-Unis (documentation/60-espace-etats-unis.md, § 3.2 et § 3.3, D90 et
 * D92). Module d'écrans d'un pays : la fabrique OFE.espaceUI.us reçoit le contexte prêté par tools/espace.js et renvoie
 * ses crochets ; us.engines déclare les moteurs de la section (moteur américain, moteur de facture international avec
 * les paramètres du générateur public, formats, coordonnées). Lot 3d-3 : profil, client, document (taxe de vente,
 * aperçu identique au générateur, critère U2). Chargé par la page de la section avant tools/espace.js.
 */
(function (root) {
  "use strict";
  var OFE = root.OFE = root.OFE || {};

  var us = (OFE.espaceUI = OFE.espaceUI || {}).us = function (ctx) {
    var L = ctx.L, field = ctx.field, OF = ctx.OF, TERMS = ctx.TERMS, profile = ctx.profile;
    var STATUSES = ["single", "married_filing_jointly", "married_filing_separately", "head_of_household"];
    var str = function (v) { return String(v == null ? "" : v).trim(); };

    // ----- Profil : coordonnées, EIN facultatif, instructions de paiement, situation familiale ------------------------

    /** Profil proposé au premier lancement : célibataire (situation familiale du calcul des acomptes). */
    function profileDefaults() { return { filingStatus: "single" }; }
    /** Champs du profil américain, entre le nom et la numérotation ; coordonnées après le premier lancement. */
    function profileFields(p, first) {
      return field("filingStatus", L("us.profile.filingStatus"), STATUSES.indexOf(p.filingStatus) > -1 ? p.filingStatus : "single",
          { options: STATUSES.map(function (s) { return [s, L("us.status." + s)]; }), hint: L("us.profile.filingStatusHint") }) +
        (first ? "" :
          field("address", L("us.profile.address"), p.address, { textarea: true, placeholder: L("us.profile.addressPlaceholder") }) +
          field("email", L("profile.email"), p.email, { type: "email", half: true }) +
          field("phone", L("profile.phone"), p.phone, { type: "tel", half: true }) +
          field("ein", L("us.profile.ein"), p.ein, { half: true, placeholder: "12-3456789", hint: L("us.profile.einHint") }) +
          field("terms", L("us.profile.terms"), p.terms == null ? 30 : p.terms, { options: TERMS, half: true }) +
          field("payment", L("us.profile.payment"), p.payment, { textarea: true, placeholder: L("us.profile.paymentPlaceholder"), hint: L("us.profile.paymentHint") }) +
          field("late", L("us.profile.late"), p.late, { placeholder: L("us.profile.latePlaceholder") }));
    }
    function bindProfile() {}
    /**
     * Lit les champs du pays dans p ; renvoie { message, field } si un champ est refusé. EIN : 9 chiffres (12-3456789) ;
     * un numéro au format d'un numéro de sécurité sociale (123-45-6789) est refusé : il n'a rien à faire sur une facture.
     */
    function readProfile(form, p, first) {
      var f = form.elements;
      p.filingStatus = STATUSES.indexOf(f.filingStatus.value) > -1 ? f.filingStatus.value : "single";
      if (first) return null;
      ["address", "email", "phone", "ein", "payment", "late"].forEach(function (k) { p[k] = str(f[k].value); });
      if (/^\d{3}-?\d{2}-?\d{4}$/.test(p.ein) && !/^\d{2}-?\d{7}$/.test(p.ein)) return { message: L("us.profile.errSsn"), field: "ein" };
      if (p.ein && !/^\d{2}-?\d{7}$/.test(p.ein)) return { message: L("us.profile.errEin"), field: "ein" };
      if (p.ein) p.ein = p.ein.replace(/^(\d{2})-?(\d{7})$/, "$1-$2");
      p.terms = Number(f.terms.value);
      return null;
    }
    /** Champs du profil à compléter pour des factures lisibles par le client : l'adresse. */
    function profileMissing(p) { return str(p.address) ? [] : [L("us.patch.address")]; }

    // ----- Clients : adresse, email, identifiant fiscal facultatif ----------------------------------------------------

    function clientDefaults() { return {}; }
    function clientFields(c) {
      return field("address", L("us.client.address"), c.address, { textarea: true }) +
        field("email", L("profile.email"), c.email, { type: "email", half: true }) +
        field("taxId", L("us.client.taxId"), c.taxId, { half: true, hint: L("us.client.taxIdHint") });
    }
    function bindClient() {}
    function readClient(form, c) {
      var f = form.elements;
      ["address", "email", "taxId"].forEach(function (k) { c[k] = str(f[k].value); });
      return null;
    }

    // ----- Document : taxe de vente saisie, numéro de bon de commande ----------------------------------------------

    /** Brouillon neuf : pas de taxe tant que l'utilisateur n'en saisit pas (elle dépend de l'État et de ce qui est vendu). */
    function draftFields() { return { tax: { rate: NaN, label: "" }, po: "" }; }
    function retax() {}
    function kindCell() { return ""; }
    function docFields(d) {
      var t = d.tax || {}, rate = OF.num(t.rate);
      return '<div class="field"><label for="d-tax-rate">' + L("us.doc.taxRate") + '</label><input type="text" id="d-tax-rate" name="taxRate" inputmode="decimal" value="' +
          (isFinite(rate) ? ctx.esc(OF.fmt(rate)) : "") + '"></div>' +
        '<div class="field"><label for="d-tax-label">' + L("us.doc.taxLabel") + '</label><input type="text" id="d-tax-label" name="taxLabel" placeholder="' +
          ctx.esc(L("us.doc.taxLabelPlaceholder")) + '" value="' + ctx.esc(t.label || "") + '"></div>' +
        (d.type === "facture" ? '<div class="field"><label for="d-po">' + L("us.doc.po") + '</label><input type="text" id="d-po" name="po" value="' + ctx.esc(d.po || "") + '"></div>' : "");
    }
    function docNote() { return L("us.doc.taxNote"); }
    function docInput(d, t) {
      d.tax = d.tax || { rate: NaN, label: "" };
      if (t.name === "taxRate") { d.tax.rate = OF.num(t.value); return true; }
      if (t.name === "taxLabel") { d.tax.label = t.value; return true; }
      if (t.name === "po") { d.po = t.value; return true; }
      return false;
    }
    function issueOptions() { return {}; }

    return {
      routes: {},
      profile: { defaults: profileDefaults, fields: profileFields, bind: bindProfile, read: readProfile, missing: profileMissing },
      client: { defaults: clientDefaults, fields: clientFields, bind: bindClient, read: readClient },
      doc: { draft: draftFields, retax: retax, fields: docFields, note: docNote, input: docInput, kindCell: kindCell, issueOptions: issueOptions }
    };
  };

  /**
   * Moteurs de la section (documentation/60, § 3.3, D92) : moteur américain ; moteur de facture international avec les
   * paramètres du générateur public (bloc #invoice-profile de la page, data/invoice-profiles/us.json), pour un aperçu
   * identique (critère U2) ; formats de la section ; coordonnées passées à l'aperçu et à l'émission.
   */
  us.engines = function (TX, OF) {
    var IV = OFE.invoiceIntl, US = OFE.espaceUS;
    if (!IV || !US) return null;
    var E = US.create(TX), el = document.getElementById("invoice-profile");
    var L = function (key) { return TX[key] !== undefined ? TX[key] : key; };
    var P = el ? JSON.parse(el.textContent) : { labels: {}, terms: [] };
    // Avoir : même mise en page qu'une facture, avec son titre et sans mention de paiement.
    var CREDIT = Object.assign({}, P, { labels: Object.assign({}, P.labels, { invoice: L("us.doc.creditTitle"), invoice_number: L("us.doc.creditNumber") }) });
    var TYPES = { facture: "invoice", devis: "estimate", avoir: "invoice" };
    /** Document de l'Espace (avec me et client) vu par le moteur international. */
    function toIntl(d) {
      var me = d.me || {}, credit = d.type === "avoir", tax = d.tax || {};
      return {
        type: TYPES[d.type] || "invoice", number: d.number || "", date: d.date, terms: d.type === "facture" ? d.terms : 0,
        validity: d.type === "devis" ? d.validity : "", po: d.po || "", paid: 0, depositPct: d.type === "devis" ? d.depositPct : 0,
        discountPct: d.discountPct || 0, tax: { rate: tax.rate, label: tax.label || "" },
        me: { name: me.name || "", address: me.address || "", email: me.email || "", phone: me.phone || "", taxId: me.taxId || "", extra: "", logo: me.logo || "" },
        client: d.client || {}, lines: (d.lines || []).map(function (l) { return { desc: l.desc, qty: l.qty, price: l.price }; }),
        payment: credit ? "" : me.payment || "", late: credit ? "" : me.late || "", notes: d.notes || ""
      };
    }
    return {
      engine: E,
      invoice: { amount: IV.amount, addDays: IV.addDays, UNITS: { hour: " h", day: " d" }, compute: US.INV.compute,
                 render: function (d, R, fmt) { return IV.render(toIntl(d), d.type === "avoir" ? CREDIT : P, fmt); } },
      fmt: { money: OF.money, eur: OF.money, num: OF.fmt, rate: OF.rate, date: function (iso) { return OF.date(iso, P.date_format); } },
      parties: {
        me: function (p) {
          return { name: p.name, address: p.address, email: p.email, phone: p.phone, taxId: p.ein || "", logo: p.logo || "",
                   payment: p.payment || "", late: p.late || "" };
        },
        client: function (c) { return { name: c.name, address: c.address, email: c.email, taxId: c.taxId || "", pro: !!c.pro }; }
      }
    };
  };
})(typeof self !== "undefined" ? self : this);
