/*
 * Moteur : conditions générales (terms and conditions) d'un prestataire de services établi au Royaume-Uni
 * (documentation/45-cgv-royaume-uni.md). Intérêt légal du Late Payment Act lu dans les règles, repères des articles
 * selon la clientèle et la façon de conclure les contrats, textes calculés et contrôles de la saisie (codes ; les
 * messages sont dans la page). Le texte est dans la page (#cgv-data), rendu par OFE.contractDoc. Fonctions pures,
 * sans DOM. Testé par tests/unit/cgv-uk.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).cgvUK = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var round = function (x) { return Math.round(x * 1e6) / 1e6; };
  var on = function (x) { return x === "on"; };
  var flag = function (b) { return b ? "on" : "off"; };
  var str = function (x) { return String(x == null ? "" : x).trim(); };
  var LAWS = { ew: "England and Wales", sc: "Scotland", ni: "Northern Ireland" };

  /** Nombre saisi (« 30 », « 30.5 ») ; NaN si illisible, null si vide. */
  function num(value) {
    var t = str(value);
    if (t === "") return null;
    var n = Number(t);
    return isFinite(n) ? n : NaN;
  }

  /** Liste « a, b or c ». */
  function join(list, word) {
    return list.length < 2 ? list.join("") : list.slice(0, -1).join(", ") + " " + word + " " + list[list.length - 1];
  }

  /**
   * Intérêt légal (Late Payment Act 1998) d'une dette échue à la date iso : 8 % + taux de référence du semestre
   * (règles late_payment_statutory_interest_margin et late_payment_reference_rates) → { rate, from, to } ;
   * null si le semestre n'est pas dans les règles.
   */
  function statutoryRate(rules, iso) {
    var rows = (rules.late_payment_reference_rates || []).filter(function (r) { return iso >= r.overdue_from && iso <= r.overdue_to; });
    if (!rows.length || rules.late_payment_statutory_interest_margin == null) return null;
    return { rate: round(rules.late_payment_statutory_interest_margin + rows[0].bank_rate), from: rows[0].overdue_from, to: rows[0].overdue_to };
  }

  /**
   * Formulaire type d'annulation, mot pour mot depuis la règle (SI 2013/3134, annexe 3, partie B) : la ligne que le
   * professionnel complète lui-même (« To [here the trader’s name…] ») reçoit ses coordonnées (champs de la page) ;
   * les lignes que le client remplit à la main deviennent des lignes à remplir ; le renvoi de l'astérisque reste.
   */
  function cancellationForm(rules) {
    var lines = (rules.uk_cancellation_model_form && rules.uk_cancellation_model_form.form) || [];
    return lines.reduce(function (out, line) {
      if (/^To \[/.test(line)) out.push("To {p_name}[[p_address|, {p_address}]][[p_email|, {p_email}]]:");
      else if (/^\[\*\]/.test(line)) out.push(line);
      else if (/^I\/We/.test(line)) out.push(line, { field: "" });    // la prestation concernée, écrite dessous
      else out.push({ field: line });
      return out;
    }, []);
  }

  /**
   * Repères, textes et contrôles à partir de la saisie (valeurs brutes du formulaire : texte, "on"/"off" des cases).
   * fmt : { pct(taux) → « 11.75% », num(n) → « 60 », money(n) → « £40 », date(iso) → « 1 July 2026 » }.
   * Renvoie { flags, text, blocks, checks } ; checks : [{ code, field, level ("error" | "warn" | "info"), params }].
   */
  function prepare(raw, rules, today, fmt) {
    var clients = raw.clients === "part" || raw.clients === "both" ? raw.clients : "pro";
    var hasPro = clients !== "part", hasPart = clients !== "pro";
    var distance = on(raw.distance), offsite = on(raw.offsite);
    var retract = hasPart && (distance || offsite);
    var status = raw.status === "limited" || raw.status === "partnership" ? raw.status : "sole";
    var law = LAWS[raw.law] ? raw.law : "ew";
    var vat = raw.vat === "vat";
    var cancel = rules.uk_consumer_cancellation || {};
    var due = rules.late_payment_default_due_period || {};
    var sums = rules.late_payment_fixed_compensation || [];
    var checks = [];
    var check = function (code, field, level, params) { checks.push({ code: code, field: field, level: level, params: params || {} }); };

    // Coordonnées et informations obligatoires (Provision of Services Regulations 2009, regs. 7 et 8).
    if (!str(raw.p_name)) check("name_missing", "p_name", "error");
    if (!str(raw.p_address)) check("address_missing", "p_address", "error");
    if (!str(raw.p_phone)) check("phone_missing", "p_phone", "warn");
    if (!str(raw.p_email)) check("email_missing", "p_email", "warn");
    if (status === "limited" && !str(raw.p_company)) check("company_number_missing", "p_company", "warn");
    if (vat && !str(raw.p_vat)) check("vat_number_missing", "p_vat", "warn");
    if (!str(raw.p_privacy)) check("privacy_missing", "p_privacy", "info");

    // Délai de paiement ; entre entreprises, au-delà de 60 jours, la fin de la période de 60 jours l'emporte sauf
    // délai non manifestement abusif (Late Payment Act 1998, s. 4).
    var terms = num(raw.terms);
    var termsOk = terms !== null && !isNaN(terms) && terms >= 0 && terms === Math.floor(terms);
    if (!termsOk) check("terms_invalid", "terms", "error");
    else if (hasPro && terms > due.business_max_days) check("terms_over_max", "terms", "warn", { max: due.business_max_days });

    // Retard de paiement entre entreprises : intérêt légal, ou taux contractuel (remède substantiel, s. 9).
    var penalty = raw.penalty === "custom" ? "custom" : "statutory";
    var legal = statutoryRate(rules, today);
    var custom = num(raw.penalty_rate);
    var interest = "";
    if (penalty === "statutory") {
      interest = "statutory interest under the Late Payment of Commercial Debts (Interest) Act 1998, at " +
        fmt.pct(rules.late_payment_statutory_interest_margin) + " a year above the Bank of England reference rate" +
        (legal ? " (" + fmt.pct(legal.rate) + " a year for debts that become overdue between " + fmt.date(legal.from) + " and " + fmt.date(legal.to) + ")" : "");
    } else if (custom !== null && !isNaN(custom) && custom > 0) {
      interest = "interest at " + fmt.pct(custom / 100) + " a year";
    }
    if (hasPro) {
      if (penalty === "custom" && (custom === null || isNaN(custom) || custom <= 0)) check("penalty_invalid", "penalty_rate", "error");
      else if (penalty === "custom" && legal && round(custom / 100) < legal.rate) check("penalty_low", "penalty_rate", "info", { rate: fmt.pct(legal.rate) });
      if (!legal) check("rates_unknown", "penalty", "warn");
    }

    // Acompte, moyens de paiement, délais.
    var deposit = num(raw.deposit);
    var hasDeposit = deposit !== null && !isNaN(deposit) && deposit > 0 && deposit <= 100;
    if (deposit !== null && (isNaN(deposit) || deposit < 0 || deposit > 100)) check("deposit_invalid", "deposit", "error");
    var methods = [];
    if (on(raw.pay_transfer)) methods.push("bank transfer");
    if (on(raw.pay_card)) methods.push("card");
    if (on(raw.pay_link)) methods.push("online payment link");
    if (!methods.length) check("payment_none", "pay_transfer", "error");
    var acceptance = num(raw.acceptance);
    if (hasPro && (acceptance === null || isNaN(acceptance) || acceptance < 1)) check("acceptance_invalid", "acceptance", "error");
    var notice = num(raw.notice);
    if (notice === null || isNaN(notice) || notice < 0) check("notice_invalid", "notice", "error");
    var validity = num(raw.validity);
    if (validity === null || isNaN(validity) || validity < 1) check("validity_invalid", "validity", "error");

    // Particuliers : pas de droit d'annulation pour un contrat conclu dans les locaux ; ADR facultatif mais complet.
    if (hasPart && !distance && !offsite) check("premises_only", "distance", "info");
    if (hasPart && str(raw.adr_name) && !str(raw.adr_site)) check("adr_incomplete", "adr_site", "warn");
    var liability = hasPro && on(raw.liability);
    if (liability) check("liability_reasonable", "liability", "info");

    var where = distance && offsite ? "at a distance (for example by email, phone, video call or online) or away from our business premises" :
      offsite ? "away from our business premises (for example at your home)" : "at a distance (for example by email, phone, video call or online)";
    var company = status === "limited" ? "a limited company registered in " + LAWS[LAWS[raw.registered] ? raw.registered : "ew"] + (str(raw.p_company) ? " under company number " + str(raw.p_company) : "") +
      (str(raw.p_registered) ? ", registered office: " + str(raw.p_registered) : "") : "";

    var flags = {
      clients: clients, has_pro: flag(hasPro), has_part: flag(hasPart), both: flag(hasPro && hasPart),
      pro_only: flag(!hasPart), part_only: flag(!hasPro), distance: flag(distance), offsite: flag(offsite),
      retract: flag(retract), offsite_part: flag(hasPart && offsite), has_deposit: flag(hasDeposit),
      penalty: penalty, status: status, law: law, part_vat: flag(hasPart && vat),
      pro_vat: flag(hasPro && vat), adr: flag(hasPart && !!str(raw.adr_name)), liability: flag(liability)
    };
    var text = {
      status_text: status === "limited" ? company : status === "partnership" ? "a partnership" : "a sole trader",
      terms_text: !termsOk ? "" : terms === 0 ? "on receipt" : "within " + fmt.num(terms) + " days of the invoice date",
      payment_methods: join(methods, "or"),
      interest_text: interest,
      fixed_sums: sums.length ? join(sums.map(function (s) { return fmt.money(s.amount); }), "or") : "",
      deposit: hasDeposit ? fmt.num(deposit) : "",
      acceptance: acceptance > 0 ? fmt.num(acceptance) : "",
      notice: notice >= 0 ? fmt.num(notice) : "",
      validity: validity > 0 ? fmt.num(validity) : "",
      where: where,
      cancel_days: cancel.period_days ? fmt.num(cancel.period_days) : "",
      refund_days: cancel.refund_days ? fmt.num(cancel.refund_days) : "",
      rights_refund_days: rules.uk_consumer_service_rights && rules.uk_consumer_service_rights.refund_days ? fmt.num(rules.uk_consumer_service_rights.refund_days) : "",
      law_name: LAWS[law],
      service_payment: (rules.uk_cancellation_model_form && rules.uk_cancellation_model_form.service_payment) || ""
    };
    return { flags: flags, text: text, blocks: { form: cancellationForm(rules) }, checks: checks };
  }

  return { statutoryRate: statutoryRate, cancellationForm: cancellationForm, prepare: prepare, LAWS: LAWS };
});
