/*
 * Moteur : conditions générales (terms and conditions) d'un prestataire de services établi aux États-Unis
 * (documentation/46-cgv-etats-unis.md). Date limite d'annulation d'une vente conclue chez un particulier ou hors de
 * l'établissement (FTC Cooling-Off Rule, jours fériés fédéraux lus dans les règles par engines/jours.js), formulaire
 * officiel d'annulation, repères des articles selon la clientèle, textes calculés et contrôles de la saisie (codes ; les
 * messages sont dans la page). Le texte est dans la page (#cgv-data), rendu par OFE.contractDoc. Fonctions pures, sans
 * DOM. Testé par tests/unit/cgv-us.test.mjs.
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.days : require("./jours.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).cgvUS = api;
})(typeof self !== "undefined" ? self : this, function (days) {
  "use strict";

  var round = function (x) { return Math.round(x * 1e6) / 1e6; };
  var on = function (x) { return x === "on"; };
  var flag = function (b) { return b ? "on" : "off"; };
  var str = function (x) { return String(x == null ? "" : x).trim(); };

  // Droit applicable et État de constitution : les 50 États et le District de Columbia.
  var STATES = {
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
    DE: "Delaware", DC: "the District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
    IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine",
    MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
    MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
    NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
    PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
    UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
  };

  /** Nombre saisi (« 30 », « 1.5 ») ; NaN si illisible, null si vide. */
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
   * Date limite d'annulation d'une vente conclue le jour iso (16 CFR 429.1) : minuit du 3e jour ouvré suivant, jours
   * ouvrés = tous les jours sauf le dimanche et les jours fériés fédéraux (règle public_holidays : jours observés). Un
   * jour férié observé un autre jour que sa date légale (le vendredi pour un samedi) est aussi sauté à sa date légale :
   * la date limite ne peut être plus précoce que le 3e jour ouvré, une date plus tardive reste conforme.
   * null si la date est illisible ou si une année à examiner n'est pas couverte par les règles.
   */
  function cancelBy(rules, iso) {
    var start = days.day(iso), cool = rules.us_ftc_cooling_off, span = rules.public_holidays && days.years(rules);
    if (isNaN(start) || !cool || !span) return null;
    var off = {}, marked = {};
    var mark = function (year) {
      if (marked[year]) return;
      marked[year] = true;
      days.holidays(year, rules, "federal").forEach(function (h) {
        var n = days.day(h.date);
        off[h.date] = true;
        if (h.substitute && days.weekday(n) === 5) off[days.iso(n + 1)] = true;   // date légale : le samedi
      });
    };
    var d = start;
    for (var k = 0; k < cool.cancel_business_days;) {
      d++;
      var year = Number(days.iso(d).slice(0, 4));
      if (year < span.min || year > span.max) return null;
      mark(year - 1);   // un jour férié observé le 31 décembre a sa date légale l'année suivante
      mark(year);
      if (days.weekday(d) !== 0 && !off[days.iso(d)]) k++;
    }
    return days.iso(d);
  }

  /**
   * Formulaire d'annulation, mot pour mot depuis la règle (16 CFR 429.1(b)), sans les paragraphes propres aux biens
   * livrés (« where applicable ») : le vendeur y inscrit son nom, son adresse, la date de la vente et la date limite
   * (429.1(c)) ; les dates restent à remplir à la main si elles ne sont pas saisies ; sous chaque ligne à remplir par
   * l'acheteur, sa légende (« (Date) », « (Buyer's signature) »).
   */
  function cancellationNotice(rules) {
    var N = rules.us_ftc_cancellation_notice || {}, skip = N.goods_only || [], lines = N.form || [];
    return lines.reduce(function (out, line, i) {
      if (skip.indexOf(i) > -1) return out;
      if (line === "[enter date of transaction]") out.push({ field: "[[tx_date|{tx_date}]]" });
      else if (/^\(.*\)$/.test(line) && lines[i - 1] !== "[enter date of transaction]") out.push({ field: "" }, line);
      else out.push(line.replace("[Name of seller]", "{p_name}").replace("[address of seller's place of business]", "{p_address}")
        .replace("[date]", "[[cancel_by|{cancel_by}]][[cancel_blank|________________]]"));
      return out;
    }, []);
  }

  /**
   * Repères, textes et contrôles à partir de la saisie (valeurs brutes du formulaire : texte, "on"/"off" des cases).
   * fmt : { pct(taux) → « 1.5% », num(n) → « 30 », money(n) → « $25 », date(iso) → « October 30, 2026 » }.
   * Renvoie { flags, text, blocks, checks } ; checks : [{ code, field, level ("error" | "warn" | "info"), params }].
   */
  function prepare(raw, rules, today, fmt) {
    var clients = raw.clients === "part" || raw.clients === "both" ? raw.clients : "pro";
    var hasPro = clients !== "part", hasPart = clients !== "pro";
    var offsite = hasPart && on(raw.offsite);
    var status = ["llc", "corp", "partnership"].indexOf(raw.status) > -1 ? raw.status : "sole";
    var law = STATES[raw.law] ? raw.law : "";
    var org = STATES[raw.org_state] ? STATES[raw.org_state] : "";
    var cool = rules.us_ftc_cooling_off || {};
    var checks = [];
    var check = function (code, field, level, params) { checks.push({ code: code, field: field, level: level, params: params || {} }); };

    // Nom et adresse du vendeur (16 CFR 429.1(a) ; GBL 1412(2)(a) : adresse postale), email pour les avis.
    if (!str(raw.p_name)) check("name_missing", "p_name", "error");
    if (!str(raw.p_address)) check("address_missing", "p_address", "error");
    if (!str(raw.p_email)) check("email_missing", "p_email", "warn");
    if (!law) check("law_missing", "law", "error");

    // Délai de paiement : la date convenue (lois sur les indépendants : sinon 30 jours après la fin des travaux).
    var terms = num(raw.terms);
    var termsOk = terms !== null && !isNaN(terms) && terms >= 0 && terms === Math.floor(terms);
    if (!termsOk) check("terms_invalid", "terms", "error");

    // Intérêts de retard : seulement s'ils sont convenus, dans la limite de la loi de l'État (pas de règle fédérale).
    var late = on(raw.late), rate = num(raw.late_rate);
    var lateOk = late && rate !== null && !isNaN(rate) && rate > 0;
    if (late && !lateOk) check("late_invalid", "late_rate", "error");
    else if (lateOk) check("late_state_law", "late_rate", "info");

    // Acompte, moyens de paiement, délais.
    var deposit = num(raw.deposit);
    var hasDeposit = deposit !== null && !isNaN(deposit) && deposit > 0 && deposit <= 100;
    if (deposit !== null && (isNaN(deposit) || deposit < 0 || deposit > 100)) check("deposit_invalid", "deposit", "error");
    var methods = [];
    if (on(raw.pay_ach)) methods.push("bank transfer (ACH or wire)");
    if (on(raw.pay_card)) methods.push("card");
    if (on(raw.pay_check)) methods.push("check");
    if (on(raw.pay_link)) methods.push("online payment link");
    if (!methods.length) check("payment_none", "pay_ach", "error");
    var acceptance = num(raw.acceptance);
    if (hasPro && (acceptance === null || isNaN(acceptance) || acceptance < 1)) check("acceptance_invalid", "acceptance", "error");
    var notice = num(raw.notice);
    if (notice === null || isNaN(notice) || notice < 0) check("notice_invalid", "notice", "error");
    var validity = num(raw.validity);
    if (validity === null || isNaN(validity) || validity < 1) check("validity_invalid", "validity", "error");

    // Vente chez un particulier ou hors de l'établissement : étapes, date de la vente et date limite d'annulation.
    var tx = str(raw.tx_date), by = null, txOk = false;
    if (offsite) {
      check("offsite_steps", "offsite", "info", { home: fmt.money(cool.home_min), other: fmt.money(cool.other_min) });
      if (tx) {
        txOk = !isNaN(days.day(tx));
        if (!txOk) check("tx_date_invalid", "tx_date", "error");
        else if (!(by = cancelBy(rules, tx))) check("holidays_unknown", "tx_date", "warn");
      }
    }

    // Contenu du contrat écrit exigé par les lois sur les indépendants (New York, Illinois) : le devis le porte.
    var nys = rules.freelance_law_new_york_state || {}, il = rules.freelance_law_illinois || {};
    check("contract_items", "activity", "info", { ny: fmt.money(nys.written_contract_threshold_usd), il: fmt.money(il.written_contract_threshold_usd) });
    if (raw.ip !== "license") check("ip_signed", "ip", "info");
    var liability = hasPro && on(raw.liability);
    if (liability) check("liability_review", "liability", "info");

    var company = status === "llc" ? "a limited liability company" + (org ? " organized in " + org : "") :
      status === "corp" ? "a corporation" + (org ? " incorporated in " + org : "") : status === "partnership" ? "a partnership" : "a sole proprietor";

    var flags = {
      clients: clients, has_pro: flag(hasPro), has_part: flag(hasPart), both: flag(hasPro && hasPart),
      pro_only: flag(!hasPart), part_only: flag(!hasPro), offsite_part: flag(offsite), has_deposit: flag(hasDeposit),
      late_on: flag(lateOk), status: status, law: law, liability: flag(liability), ip: raw.ip === "license" ? "license" : "assign"
    };
    var text = {
      status_text: company,
      terms_text: !termsOk ? "" : terms === 0 ? "on receipt" : "within " + fmt.num(terms) + " days of the invoice date",
      payment_methods: join(methods, "or"),
      late_text: lateOk ? "interest at " + fmt.pct(round(rate / 100)) + " per month on the overdue amount, or at the highest rate allowed by law if that is lower" : "",
      deposit: hasDeposit ? fmt.num(deposit) : "",
      acceptance: acceptance > 0 ? fmt.num(acceptance) : "",
      notice: notice >= 0 ? fmt.num(notice) : "",
      validity: validity > 0 ? fmt.num(validity) : "",
      law_name: law ? STATES[law] : "",
      cancel_days: cool.cancel_business_days ? fmt.num(cool.cancel_business_days) : "",
      refund_days: cool.refund_business_days ? fmt.num(cool.refund_business_days) : "",
      home_min: cool.home_min ? fmt.money(cool.home_min) : "",
      other_min: cool.other_min ? fmt.money(cool.other_min) : "",
      statement: cool.statement || "",
      tx_date: txOk ? fmt.date(tx) : "",
      cancel_by: by ? fmt.date(by) : "",
      cancel_blank: by ? "" : "on"
    };
    return { flags: flags, text: text, blocks: { notice: cancellationNotice(rules) }, checks: checks };
  }

  return { STATES: STATES, cancelBy: cancelBy, cancellationNotice: cancellationNotice, prepare: prepare };
});
