/*
 * Moteur : conditions générales (terms and conditions) d'un travailleur autonome établi au Canada, en anglais ou en
 * français (documentation/47-cgv-canada.md). Taux d'intérêt mensuel et taux annuel équivalent (Loi sur l'intérêt,
 * art. 4), taux criminel, repères des articles selon la clientèle, la province et les provinces des particuliers,
 * textes calculés et contrôles de la saisie (codes ; les messages sont dans la page). Le texte est dans la page
 * (#cgv-data), rendu par OFE.contractDoc. Fonctions pures, sans DOM. Testé par tests/unit/cgv-ca.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).cgvCA = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var round2 = function (x) { return Math.round(x * 100) / 100; };
  var on = function (x) { return x === "on"; };
  var flag = function (b) { return b ? "on" : "off"; };
  var str = function (x) { return String(x == null ? "" : x).trim(); };

  // Provinces et territoires : nom seul et forme « de … » (lois de l'Ontario, du Québec…).
  var PROVINCES = {
    ON: { en: "Ontario", fr: "l'Ontario", fr_of: "de l'Ontario" },
    QC: { en: "Quebec", fr: "le Québec", fr_of: "du Québec" },
    BC: { en: "British Columbia", fr: "la Colombie-Britannique", fr_of: "de la Colombie-Britannique" },
    AB: { en: "Alberta", fr: "l'Alberta", fr_of: "de l'Alberta" },
    MB: { en: "Manitoba", fr: "le Manitoba", fr_of: "du Manitoba" },
    SK: { en: "Saskatchewan", fr: "la Saskatchewan", fr_of: "de la Saskatchewan" },
    NS: { en: "Nova Scotia", fr: "la Nouvelle-Écosse", fr_of: "de la Nouvelle-Écosse" },
    NB: { en: "New Brunswick", fr: "le Nouveau-Brunswick", fr_of: "du Nouveau-Brunswick" },
    NL: { en: "Newfoundland and Labrador", fr: "Terre-Neuve-et-Labrador", fr_of: "de Terre-Neuve-et-Labrador" },
    PE: { en: "Prince Edward Island", fr: "l'Île-du-Prince-Édouard", fr_of: "de l'Île-du-Prince-Édouard" },
    YT: { en: "Yukon", fr: "le Yukon", fr_of: "du Yukon" },
    NT: { en: "the Northwest Territories", fr: "les Territoires du Nord-Ouest", fr_of: "des Territoires du Nord-Ouest" },
    NU: { en: "Nunavut", fr: "le Nunavut", fr_of: "du Nunavut" }
  };
  // Provinces dont les règles sur les particuliers ont été lues (les autres : mention générale).
  var DETAILED = ["ON", "QC", "BC", "AB"];

  var WORDS = {
    en: {
      sole: "a sole proprietor", corp: "a corporation", corp_in: "a corporation incorporated in ",
      on_receipt: "on receipt", within: "within {n} days of the invoice date", or: "or", and: "and",
      transfer: "bank transfer or Interac e-Transfer", card: "credit card", cheque: "cheque", link: "online payment link",
      late: "interest at {m} per month ({y} per year) on the overdue amount, from the due date until paid"
    },
    fr: {
      sole: "une entreprise individuelle", corp: "une société par actions", corp_in: "une société par actions constituée sous le régime ",
      on_receipt: "à réception", within: "dans les {n} jours suivant la date de la facture", or: "ou", and: "et",
      transfer: "virement bancaire ou virement Interac", card: "carte de crédit", cheque: "chèque", link: "lien de paiement en ligne",
      late: "des intérêts de {m} par mois ({y} par an) sur la somme impayée, de la date d'échéance jusqu'au paiement"
    }
  };

  /** Nombre saisi (« 30 », « 1.5 », « 1,5 ») ; NaN si illisible, null si vide. */
  function num(value) {
    var t = str(value).replace(",", ".");
    if (t === "") return null;
    var n = Number(t);
    return isFinite(n) ? n : NaN;
  }

  /** Liste lisible : « a, b ou c ». */
  function join(items, word) {
    if (items.length < 2) return items.join("");
    return items.slice(0, -1).join(", ") + " " + word + " " + items[items.length - 1];
  }

  /**
   * Taux annuel équivalent d'un taux mensuel (intérêt simple, non capitalisé) : 12 fois le taux mensuel, arrondi au
   * centième ; c'est ce taux que l'art. 4 de la Loi sur l'intérêt exige d'écrire. null si le taux est illisible.
   */
  function annualRate(monthly) {
    var m = typeof monthly === "number" ? monthly : num(monthly);
    if (m === null || isNaN(m) || m <= 0) return null;
    return round2(m * 12);
  }

  /**
   * Provinces des particuliers : celles cochées (cons_on, cons_qc, cons_bc, cons_ab), « autres » (cons_other) ;
   * sans case cochée, la province du travailleur autonome.
   */
  function consumerProvinces(raw, province) {
    var list = DETAILED.filter(function (p) { return on(raw["cons_" + p.toLowerCase()]); });
    var other = on(raw.cons_other);
    if (!list.length && !other && province) {
      if (DETAILED.indexOf(province) > -1) list = [province];
      else other = true;
    }
    return { list: list, other: other };
  }

  function prepare(raw, rules, today, fmt, lang) {
    var fr = /^fr/.test(String(lang || ""));
    var W = WORDS[fr ? "fr" : "en"];
    var clients = raw.clients === "part" || raw.clients === "both" ? raw.clients : "pro";
    var hasPro = clients !== "part", hasPart = clients !== "pro";
    var status = raw.status === "corp" ? "corp" : "sole";
    var province = PROVINCES[raw.province] ? raw.province : "";
    var incorp = PROVINCES[raw.incorp] || raw.incorp === "CA" ? raw.incorp : "";
    var cons = hasPart ? consumerProvinces(raw, province) : { list: [], other: false };
    var qcCons = cons.list.indexOf("QC") > -1;
    var R = function (k, field) { return field ? (rules[k] || {})[field] : rules[k]; };   // valeurs des règles (OF_RULES)
    var checks = [];
    var check = function (code, field, level, params) { checks.push({ code: code, field: field, level: level, params: params || {} }); };

    // Identité et coordonnées (informations à donner avant un contrat à distance : nom, adresse, téléphone, email).
    if (!str(raw.p_name)) check("name_missing", "p_name", "error");
    if (!str(raw.p_address)) check("address_missing", "p_address", "error");
    if (!str(raw.p_email)) check("email_missing", "p_email", "warn");
    if (hasPart && !str(raw.p_phone)) check("phone_missing", "p_phone", "warn");
    if (!province) check("province_missing", "province", "error");

    // Délai de paiement.
    var terms = num(raw.terms);
    var termsOk = terms !== null && !isNaN(terms) && terms >= 0 && terms === Math.floor(terms);
    if (!termsOk) check("terms_invalid", "terms", "error");

    // Intérêts de retard : taux mensuel et taux annuel écrits (Loi sur l'intérêt, art. 4), sous le taux criminel.
    var late = on(raw.late), monthly = num(raw.late_rate), yearly = annualRate(monthly);
    var criminal = R("criminal_interest_rate");
    var lateOk = late && yearly !== null;
    if (late && !lateOk) check("late_invalid", "late_rate", "error");
    else if (lateOk && criminal && yearly / 100 > criminal) {
      check("late_criminal", "late_rate", "error", { max: fmt.pct(criminal) });
      lateOk = false;
    }

    // Acompte et moyens de paiement ; au Québec, un particulier servi à distance ne paie d'avance que par carte de crédit.
    var deposit = num(raw.deposit);
    var hasDeposit = deposit !== null && !isNaN(deposit) && deposit > 0 && deposit <= 100;
    if (deposit !== null && (isNaN(deposit) || deposit < 0 || deposit > 100)) check("deposit_invalid", "deposit", "error");
    var methods = [];
    if (on(raw.pay_transfer)) methods.push(W.transfer);
    if (on(raw.pay_card)) methods.push(W.card);
    if (on(raw.pay_cheque)) methods.push(W.cheque);
    if (on(raw.pay_link)) methods.push(W.link);
    if (!methods.length) check("payment_none", "pay_transfer", "error");
    if (hasDeposit && qcCons && !on(raw.pay_card)) check("qc_deposit_card", "pay_card", "warn");

    var acceptance = num(raw.acceptance);
    if (hasPro && (acceptance === null || isNaN(acceptance) || acceptance < 1)) check("acceptance_invalid", "acceptance", "error");
    var notice = num(raw.notice);
    if (notice === null || isNaN(notice) || notice < 0) check("notice_invalid", "notice", "error");
    var validity = num(raw.validity);
    if (validity === null || isNaN(validity) || validity < 1) check("validity_invalid", "validity", "error");

    // Particuliers : contrat conclu chez eux (hors champ), informations du devis, copie, autres provinces.
    var threshold = R("ca_consumer_threshold"), copyDays = R("ca_consumer_copy_days", "days");
    if (hasPart && on(raw.at_home)) check("at_home_out_of_scope", "at_home", "warn");
    if (hasPart) check("consumer_quote_items", "activity", "info", { amount: threshold ? fmt.money(threshold) : "", days: copyDays ? fmt.num(copyDays) : "" });
    if (cons.other) check("other_provinces", "cons_other", "info");

    // Québec : contrat d'adhésion d'abord en français (Charte de la langue française, art. 55).
    if (!fr && (province === "QC" || qcCons)) check("french_first", "province", "warn");

    if (raw.ip !== "license") check("ip_signed", "ip", "info");
    var liability = hasPro && on(raw.liability);
    if (liability) check("liability_review", "liability", "info");

    var where = incorp === "CA" ? (fr ? "de la Loi canadienne sur les sociétés par actions" : "under federal law") :
      incorp ? (fr ? "des lois " + PROVINCES[incorp].fr_of : "in " + PROVINCES[incorp].en) : "";
    var statusText = status === "corp" ? (where ? (fr ? W.corp_in + where : "a corporation incorporated " + where) : W.corp) : W.sole;
    var tol = R("ca_on_estimate_tolerance");
    var flags = {
      clients: clients, has_pro: flag(hasPro), has_part: flag(hasPart), both: flag(hasPro && hasPart),
      pro_only: flag(!hasPart), part_only: flag(!hasPro), qc_law: flag(province === "QC"), qc_cons: flag(qcCons),
      has_deposit: flag(hasDeposit), late_on: flag(lateOk), status: status, province: province,
      liability: flag(liability), ip: raw.ip === "license" ? "license" : "assign"
    };
    var text = {
      status_text: statusText,
      province_name: province ? PROVINCES[province][fr ? "fr" : "en"] : "",
      province_of: province ? (fr ? PROVINCES[province].fr_of : PROVINCES[province].en) : "",
      terms_text: !termsOk ? "" : terms === 0 ? W.on_receipt : W.within.replace("{n}", fmt.num(terms)),
      payment_methods: join(methods, W.or),
      late_text: lateOk ? W.late.replace("{m}", fmt.pct(monthly / 100)).replace("{y}", fmt.pct(yearly / 100)) : "",
      deposit: hasDeposit ? fmt.num(deposit) : "",
      acceptance: acceptance > 0 ? fmt.num(acceptance) : "",
      notice: notice >= 0 ? fmt.num(notice) : "",
      validity: validity > 0 ? fmt.num(validity) : "",
      estimate_pct: tol ? fmt.pct(tol) : "",
      copy_days: copyDays ? fmt.num(copyDays) : "",
      start_days: R("ca_consumer_start_delay_days", "days") ? fmt.num(R("ca_consumer_start_delay_days", "days")) : "",
      info_cancel_days: R("ca_consumer_info_cancel_days", "days") ? fmt.num(R("ca_consumer_info_cancel_days", "days")) : "",
      refund_days: R("ca_consumer_refund_days", "days") ? fmt.num(R("ca_consumer_refund_days", "days")) : ""
    };
    return { flags: flags, text: text, blocks: {}, checks: checks };
  }

  return { PROVINCES: PROVINCES, annualRate: annualRate, consumerProvinces: consumerProvinces, prepare: prepare };
});
