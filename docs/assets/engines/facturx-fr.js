/*
 * Moteur : données structurées d'une facture électronique (France), syntaxe UN/CEFACT CII, profil EN 16931 de
 * Factur-X, avec les règles françaises BR-FR (norme XP Z12-012). Étude : documentation/10-etude-factur-x.md.
 * Entrée : un document émis de l'Espace (coordonnées figées dans doc.snapshot). Sortie : le texte du fichier factur-x.xml.
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.invoiceFR : require("./invoice-fr.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).facturxFR = api;
})(typeof self !== "undefined" ? self : this, function (INV) {
  "use strict";

  var NS = 'xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" ' +
    'xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" ' +
    'xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" ' +
    'xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"';
  var PROFILE = "urn:cen.eu:en16931:2017";
  // Unité de la quantité (BT-130) : recommandation n° 20 de la CEE-ONU ; C62 (unité) pour une ligne sans unité.
  var UNIT_CODES = { hour: "HUR", day: "DAY" };

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var str = function (v) { return String(v == null ? "" : v).trim(); };
  var digits = function (v) { return str(v).replace(/\s+/g, ""); };
  var amount = function (n) { return (Math.round(Number(n) * 100) / 100).toFixed(2); };
  var day = function (iso) { return String(iso || "").replace(/-/g, ""); };
  function number(n, max) {
    var s = (Math.round(Number(n) * Math.pow(10, max)) / Math.pow(10, max)).toFixed(max);
    return s.indexOf(".") > -1 ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  }
  function el(name, content, attrs) {
    if (content == null || content === "") return "";
    return "<" + name + (attrs || "") + ">" + content + "</" + name + ">";
  }
  var date102 = function (tag, iso, q) {
    return el(tag, el((q || "udt") + ":DateTimeString", day(iso), ' format="102"'));
  };

  /**
   * Adresse postale à partir d'un texte libre (« 12 rue …\n69002 Lyon ») : lignes, code postal, ville.
   * Les champs structurés (postcode, city, country) l'emportent quand ils sont renseignés.
   */
  function address(party) {
    var lines = String(party.address || "").split(/\r?\n/).map(str).filter(Boolean);
    var out = { lines: lines, postcode: str(party.postcode), city: str(party.city), country: str(party.country).toUpperCase() };
    var last = lines[lines.length - 1] || "";
    var m = /^(\d{5})\s+(.+)$/.exec(last);
    if (m && !out.postcode && !out.city) {
      out.postcode = m[1];
      out.city = m[2];
      out.lines = lines.slice(0, -1);
    }
    return out;
  }

  /** SIREN : 9 chiffres (ou les 9 premiers d'un SIRET). */
  function siren(v) {
    var d = digits(v);
    return /^\d{9}$/.test(d) ? d : /^\d{14}$/.test(d) ? d.slice(0, 9) : "";
  }

  /** Catégorie de TVA (BT-118) et motif d'exonération (BT-120, BT-121) du document. */
  function taxCategory(doc, t, rules) {
    if (t.place === "eu") return { code: "AE", rate: 0, reason: "Autoliquidation", reasonCode: "VATEX-EU-AE" };
    if (t.place === "world") {
      // Biens expédiés hors de l'UE : exportation exonérée (G) ; services à un client professionnel hors UE : hors du champ
      // de la TVA française (O), comme l'indique la mention de la facture.
      return doc.nature === "biens" ? { code: "G", rate: 0, reason: "Exportation hors de l'Union européenne", reasonCode: "VATEX-EU-G" }
        : { code: "O", rate: null, reason: "Prestation de services dont le lieu est hors de France", reasonCode: "VATEX-EU-O" };
    }
    if (t.franchise) {
      return { code: "E", rate: 0, reason: INV.franchiseMention(doc.date, rules).replace(/\.$/, ""), reasonCode: "VATEX-FR-FRANCHISE" };
    }
    return { code: "S", rate: t.rate };
  }

  /** Cadre de facturation (BT-23) : facture simple de services (S1), de biens (B1) ou mixte (M1). */
  function businessProcess(doc) { return { biens: "B1", mixte: "M1" }[doc.nature] || "S1"; }

  /**
   * Client à l'étranger (factures « B2BINT », adresse électronique = email) : selon le lieu retenu pour la TVA du
   * document, figé avec lui, plutôt que la fiche client qui a pu changer depuis.
   */
  function international(doc) {
    var place = (doc.vat && doc.vat.place) || ((doc.snapshot || {}).client || {}).place || "fr";
    return place === "eu" || place === "world";
  }

  /** Données manquantes pour produire un fichier conforme ; liste vide si l'export est possible. */
  function check(doc) {
    var errors = [];
    var p = doc.snapshot || {}, me = p.me || {}, client = p.client || {};
    if (doc.type !== "facture" && doc.type !== "avoir") errors.push("Seules les factures et les avoirs ont un format électronique.");
    if (doc.status === "draft" || !doc.number) errors.push("Émettez d'abord le document.");
    if (!client.pro) errors.push("Le format électronique concerne les clients professionnels.");
    if (!siren(me.siret)) errors.push("Votre SIRET (14 chiffres) est nécessaire.");
    if (client.pro && (!client.place || client.place === "fr") && !siren(client.id)) errors.push("Le SIREN du client (9 chiffres) est nécessaire.");
    var a = address(me), b = address(client), abroad = international(doc);
    if (!a.lines.length || !a.postcode || !a.city) errors.push("Votre adresse doit comporter une ligne, puis le code postal et la ville sur la dernière ligne.");
    // Client en France : code postal et ville lus sur la dernière ligne ; à l'étranger, les lignes et le pays suffisent (EN 16931).
    if (!b.lines.length || (!abroad && !b.city)) errors.push(abroad ? "Indiquez l'adresse du client." : "L'adresse du client doit comporter une ligne, puis le code postal et la ville.");
    if (doc.vat && doc.vat.place === "eu" && (!str(me.vat) || !str(client.vat))) {
      errors.push("Autoliquidation : votre numéro de TVA intracommunautaire et celui du client sont nécessaires.");
    }
    if (abroad) {
      if (!/^[A-Z]{2}$/.test(b.country) || b.country === "FR") errors.push("Indiquez le pays du client.");
      if (!str(client.endpoint) && !str(client.email)) errors.push("L'email du client est nécessaire : il lui sert d'adresse de facturation électronique.");
    }
    return errors;
  }

  /**
   * Vendeur ou acheteur. Adresse électronique (BT-34, BT-49) : celle de l'annuaire, par défaut le SIREN (schéma 0225) ;
   * pour un client à l'étranger, son email (schéma EM). Vendeur en franchise sans numéro de TVA : son SIREN comme
   * identifiant fiscal (BT-32, schéma FC), exigé par la règle BR-E-02 (annexe A de XP Z12-012, à confirmer au texte).
   */
  function party(tag, p, role, cat, abroad) {
    var a = address(p);
    var id = siren(role === "seller" ? p.siret : p.id);
    var country = a.country || "FR";
    var endpoint = abroad ? str(p.endpoint) || str(p.email) : str(p.endpoint) || id;
    // Catégorie O (hors champ) : aucun numéro de TVA dans les données (règles BR-O-02 à BR-O-04).
    var vatId = cat.code === "O" ? "" : digits(p.vat).toUpperCase();
    return "<ram:" + tag + ">" +
      el("ram:Name", esc(str(p.name))) +
      (id ? "<ram:SpecifiedLegalOrganization>" + el("ram:ID", id, ' schemeID="0002"') + "</ram:SpecifiedLegalOrganization>" : "") +
      "<ram:PostalTradeAddress>" + el("ram:PostcodeCode", esc(a.postcode)) + el("ram:LineOne", esc(a.lines[0])) +
      el("ram:LineTwo", esc(a.lines[1])) + el("ram:LineThree", esc(a.lines.slice(2).join(", "))) + el("ram:CityName", esc(a.city)) +
      el("ram:CountryID", esc(country)) + "</ram:PostalTradeAddress>" +
      (endpoint ? "<ram:URIUniversalCommunication>" + el("ram:URIID", esc(endpoint), abroad ? ' schemeID="EM"' : ' schemeID="0225"') +
        "</ram:URIUniversalCommunication>" : "") +
      (vatId ? "<ram:SpecifiedTaxRegistration>" + el("ram:ID", esc(vatId), ' schemeID="VA"') + "</ram:SpecifiedTaxRegistration>" : "") +
      (role === "seller" && cat.code === "E" && !vatId && id ? "<ram:SpecifiedTaxRegistration>" + el("ram:ID", id, ' schemeID="FC"') + "</ram:SpecifiedTaxRegistration>" : "") +
      "</ram:" + tag + ">";
  }

  function note(text, code) {
    return "<ram:IncludedNote>" + el("ram:Content", esc(text)) + el("ram:SubjectCode", code) + "</ram:IncludedNote>";
  }

  /**
   * Texte du fichier factur-x.xml d'une facture ou d'un avoir émis. documents : tous les documents (facture d'origine
   * d'un avoir). rules : règles fiscales (data/rules/fr.json). fmt : { eur, num, date } pour les textes des mentions.
   */
  function xml(doc, documents, rules, fmt) {
    var p = doc.snapshot || {}, me = p.me || {}, client = p.client || {};
    var t = INV.compute(doc);
    var cat = taxCategory(doc, t, rules);
    var lines = t.rows.filter(function (r) { return str(r.desc) && isFinite(r.total); });
    var ht = t.ht, vat = cat.code === "S" ? t.vat : 0, total = ht + vat;
    var paid = doc.type === "facture" ? Math.max(0, Number(doc.paid) || 0) : 0;
    var due = INV.addDays(doc.date, Math.max(0, parseInt(doc.terms, 10) || 0));
    var fee = rules && rules.indemnite_forfaitaire_recouvrement != null ? rules.indemnite_forfaitaire_recouvrement : 40;
    var origin = doc.type === "avoir" && doc.originId ? (documents || []).filter(function (d) { return d.id === doc.originId; })[0] : null;
    var originRef = origin ? { number: origin.number, date: origin.date } : doc.origin && doc.origin.number ? doc.origin : null;
    var serviceDate = doc.serviceDate || (origin && origin.serviceDate) || "";

    var out = '<?xml version="1.0" encoding="UTF-8"?>\n<rsm:CrossIndustryInvoice ' + NS + ">" +
      "<rsm:ExchangedDocumentContext>" +
      "<ram:BusinessProcessSpecifiedDocumentContextParameter>" + el("ram:ID", businessProcess(doc)) + "</ram:BusinessProcessSpecifiedDocumentContextParameter>" +
      "<ram:GuidelineSpecifiedDocumentContextParameter>" + el("ram:ID", PROFILE) + "</ram:GuidelineSpecifiedDocumentContextParameter>" +
      "</rsm:ExchangedDocumentContext>" +
      "<rsm:ExchangedDocument>" + el("ram:ID", esc(doc.number)) + el("ram:TypeCode", doc.type === "avoir" ? "381" : "380") +
      date102("ram:IssueDateTime", doc.date) +
      note("Pas d'escompte pour paiement anticipé.", "AAB") +
      note("En cas de retard de paiement : pénalités au taux de " + (str(doc.penalty) || "trois fois le taux d'intérêt légal") + ".", "PMD") +
      note("Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : " + fee + " € (art. L441-10 et D441-5 du Code de commerce).", "PMT") +
      (cat.code === "S" && doc.vat && doc.vat.debits ? note("Option pour le paiement de la taxe d'après les débits.", "TXD") : "") +
      (str(doc.notes) ? note(str(doc.notes), "AAI") : "") +
      note(international(doc) ? "B2BINT" : "B2B", "BAR") +
      "</rsm:ExchangedDocument>" +
      "<rsm:SupplyChainTradeTransaction>";

    lines.forEach(function (r, i) {
      out += "<ram:IncludedSupplyChainTradeLineItem>" +
        "<ram:AssociatedDocumentLineDocument>" + el("ram:LineID", String(i + 1)) + "</ram:AssociatedDocumentLineDocument>" +
        "<ram:SpecifiedTradeProduct>" + el("ram:Name", esc(str(r.desc))) + "</ram:SpecifiedTradeProduct>" +
        "<ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice>" + el("ram:ChargeAmount", number(r.price, 6)) +
        "</ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>" +
        "<ram:SpecifiedLineTradeDelivery>" + el("ram:BilledQuantity", number(r.qty, 4), ' unitCode="' + (UNIT_CODES[r.unit] || "C62") + '"') + "</ram:SpecifiedLineTradeDelivery>" +
        "<ram:SpecifiedLineTradeSettlement><ram:ApplicableTradeTax>" + el("ram:TypeCode", "VAT") + el("ram:CategoryCode", cat.code) +
        (cat.rate == null ? "" : el("ram:RateApplicablePercent", number(cat.rate, 2))) + "</ram:ApplicableTradeTax>" +
        "<ram:SpecifiedTradeSettlementLineMonetarySummation>" + el("ram:LineTotalAmount", amount(r.total)) +
        "</ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement>" +
        "</ram:IncludedSupplyChainTradeLineItem>";
    });

    out += "<ram:ApplicableHeaderTradeAgreement>" + party("SellerTradeParty", me, "seller", cat, false) + party("BuyerTradeParty", client, "buyer", cat, international(doc)) +
      "</ram:ApplicableHeaderTradeAgreement>" +
      "<ram:ApplicableHeaderTradeDelivery>" +
      (serviceDate ? "<ram:ActualDeliverySupplyChainEvent>" + date102("ram:OccurrenceDateTime", serviceDate) + "</ram:ActualDeliverySupplyChainEvent>" : "") +
      "</ram:ApplicableHeaderTradeDelivery>" +
      "<ram:ApplicableHeaderTradeSettlement>" + el("ram:PaymentReference", esc(doc.number)) + el("ram:InvoiceCurrencyCode", "EUR") +
      (str(me.iban) && doc.type === "facture" ? "<ram:SpecifiedTradeSettlementPaymentMeans>" + el("ram:TypeCode", "58") +
        "<ram:PayeePartyCreditorFinancialAccount>" + el("ram:IBANID", esc(digits(me.iban).toUpperCase())) + "</ram:PayeePartyCreditorFinancialAccount>" +
        "</ram:SpecifiedTradeSettlementPaymentMeans>" : "") +
      "<ram:ApplicableTradeTax>" + el("ram:CalculatedAmount", amount(vat)) + el("ram:TypeCode", "VAT") + el("ram:ExemptionReason", esc(cat.reason)) +
      el("ram:BasisAmount", amount(ht)) + el("ram:CategoryCode", cat.code) + el("ram:ExemptionReasonCode", cat.reasonCode) +
      (cat.rate == null ? "" : el("ram:RateApplicablePercent", number(cat.rate, 2))) + "</ram:ApplicableTradeTax>" +
      (doc.type === "facture" ? "<ram:SpecifiedTradePaymentTerms>" +
        el("ram:Description", esc(due > doc.date ? "Paiement au plus tard le " + fmt.date(due) : "Paiement à réception")) +
        date102("ram:DueDateDateTime", due) + "</ram:SpecifiedTradePaymentTerms>" : "") +
      "<ram:SpecifiedTradeSettlementHeaderMonetarySummation>" + el("ram:LineTotalAmount", amount(ht)) + el("ram:TaxBasisTotalAmount", amount(ht)) +
      el("ram:TaxTotalAmount", amount(vat), ' currencyID="EUR"') + el("ram:GrandTotalAmount", amount(total)) +
      el("ram:TotalPrepaidAmount", amount(paid)) + el("ram:DuePayableAmount", amount(total - paid)) +
      "</ram:SpecifiedTradeSettlementHeaderMonetarySummation>" +
      (originRef ? "<ram:InvoiceReferencedDocument>" + el("ram:IssuerAssignedID", esc(originRef.number)) +
        date102("ram:FormattedIssueDateTime", originRef.date, "qdt") + "</ram:InvoiceReferencedDocument>" : "") +
      "</ram:ApplicableHeaderTradeSettlement>" +
      "</rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>\n";
    return out;
  }

  return { PROFILE: PROFILE, address: address, siren: siren, taxCategory: taxCategory, businessProcess: businessProcess,
           check: check, xml: xml };
});
