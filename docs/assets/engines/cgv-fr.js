/*
 * Moteur : conditions générales de vente d'un prestataire de services établi en France (documentation/40-cgv.md).
 * Taux du semestre lus dans les règles (intérêt légal, BCE), repères des articles selon la clientèle et la façon de
 * conclure les contrats, textes calculés et contrôles de la saisie (codes ; les messages sont dans la page).
 * Le texte des CGV est dans la page (#cgv-data), rendu par OFE.contractDoc. Fonctions pures, sans DOM.
 * Testé par tests/unit/cgv-fr.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).cgvFR = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var round = function (x) { return Math.round(x * 1e6) / 1e6; };
  var on = function (x) { return x === "on"; };
  var flag = function (b) { return b ? "on" : "off"; };
  var str = function (x) { return String(x == null ? "" : x).trim(); };

  /** Semestre d'une date ISO : « 2026-S1 » (janvier à juin) ou « 2026-S2 ». */
  function semester(iso) {
    return iso.slice(0, 4) + (Number(iso.slice(5, 7)) <= 6 ? "-S1" : "-S2");
  }

  /**
   * Taux du semestre de la date : intérêt légal (créancier professionnel : taux « autres cas »), minimum des pénalités
   * de retard entre professionnels (3 fois ce taux), taux de refinancement de la BCE au 1er janvier ou au 1er juillet et
   * taux des pénalités par défaut (BCE + 10 points). Chaque taux vaut null si le semestre n'est pas dans les règles.
   */
  function rates(rules, iso) {
    var s = semester(iso);
    var legal = rules.taux_interet_legal && rules.taux_interet_legal[s];
    var bce = rules["taux_bce_refinancement_" + s.slice(0, 4) + (s.slice(-1) === "1" ? "_01_01" : "_07_01")];
    var hasBce = typeof bce === "number";
    return {
      semester: s,
      legal: legal ? legal.autres : null,
      minPenalty: legal ? round(3 * legal.autres) : null,
      bce: hasBce ? bce : null,
      defaultPenalty: hasBce ? round(bce + 0.10) : null
    };
  }

  /** « premier semestre 2026 » ou « second semestre 2026 ». */
  function semesterLabel(s) {
    return (s.slice(-1) === "1" ? "premier" : "second") + " semestre " + s.slice(0, 4);
  }

  /** Nombre entier saisi (« 30 », « 30,0 ») ; NaN si illisible, null si vide. */
  function int(value) {
    var t = str(value).replace(",", ".");
    if (t === "") return null;
    var n = Number(t);
    return isFinite(n) ? n : NaN;
  }

  /** Liste « a, b et c ». */
  function join(list) {
    return list.length < 2 ? list.join("") : list.slice(0, -1).join(", ") + " et " + list[list.length - 1];
  }

  /**
   * Formulaire de rétractation, mot pour mot depuis la règle (directive 2011/83/UE, annexe I, partie B) : la ligne
   * d'adresse, que le professionnel complète lui-même, est remplacée par ses coordonnées (champs de la page) ; les lignes
   * que le client remplit à la main deviennent des lignes à remplir.
   */
  function withdrawalForm(rules) {
    var lines = (rules.retractation_modeles && rules.retractation_modeles.formulaire) || [];
    return lines.reduce(function (out, line, i) {
      if (/^À l'attention de/.test(line)) out.push("À l'attention de {p_name}[[p_address|, {p_address}]][[p_email|, {p_email}]] :");
      else if (i === 0 || /^\(\*\)/.test(line)) out.push(line);          // consigne d'en-tête, renvoi de l'astérisque
      else if (/^Je\/Nous/.test(line)) out.push(line, { field: "" });     // la prestation concernée, écrite dessous
      else out.push({ field: line + " :" });
      return out;
    }, []);
  }

  /**
   * Repères, textes et contrôles à partir de la saisie (valeurs brutes du formulaire : texte, "on"/"off" des cases).
   * fmt : { pct(taux) → « 12,40 % », num(n) → « 60 » }.
   * Renvoie { flags, text, blocks, checks } ; checks : [{ code, field, level ("error" | "warn" | "info"), params }].
   */
  function prepare(raw, rules, today, fmt) {
    var clients = raw.clients === "part" || raw.clients === "both" ? raw.clients : "pro";
    var hasPro = clients !== "part", hasPart = clients !== "pro";
    var online = on(raw.online);
    var distance = on(raw.distance) || online;           // une commande sur le site est un contrat à distance
    var offsite = on(raw.offsite);
    var retract = hasPart && (distance || offsite);
    var smallPro = hasPro && offsite;                      // art. L221-3 : hors établissement seulement
    var r = rates(rules, today);
    var rc = rules.retractation_consommateur || {};
    var he = rules.hors_etablissement || {};
    var med = rules.mediation_consommation || {};
    var small = rules.petits_professionnels_hors_etablissement || {};
    var warranty = rules.garantie_legale_conformite || {};
    var delays = rules.retard_paiement_delais || {};
    var checks = [];
    var check = function (code, field, level, params) { checks.push({ code: code, field: field, level: level, params: params || {} }); };

    // Délai de paiement (entre professionnels : 60 jours au plus après la facture, 45 pour une facture périodique).
    var terms = int(raw.terms);
    var maxTerms = delays.delai_max_date_facture_jours, maxPeriodic = delays.delai_max_facture_periodique_jours;
    var termsOk = terms !== null && !isNaN(terms) && terms >= 0 && terms === Math.floor(terms);
    if (!termsOk) check("terms_invalid", "terms", "error");
    else if (hasPro && terms > maxTerms) { check("terms_max", "terms", "error", { max: maxTerms }); termsOk = false; }
    else if (hasPro && terms > maxPeriodic) check("terms_periodic", "terms", "info", { max: maxPeriodic });

    // Taux des pénalités de retard (clients professionnels).
    var penalty = raw.penalty === "legal" || raw.penalty === "custom" ? raw.penalty : "bce";
    var custom = int(raw.penalty_rate);
    var penaltyText;
    if (penalty === "bce") {
      penaltyText = "au taux de refinancement de la Banque centrale européenne en vigueur au 1er janvier (premier semestre) ou au 1er juillet (second semestre), majoré de 10 points" +
        (r.defaultPenalty !== null ? ", soit " + fmt.pct(r.defaultPenalty) + " par an au " + semesterLabel(r.semester) : "");
    } else if (penalty === "legal") {
      penaltyText = "à trois fois le taux de l'intérêt légal en vigueur" +
        (r.minPenalty !== null ? ", soit " + fmt.pct(r.minPenalty) + " par an au " + semesterLabel(r.semester) : "");
    } else {
      penaltyText = custom !== null && !isNaN(custom) && custom > 0 ? "au taux de " + fmt.pct(custom / 100) + " par an" : "";
    }
    if (hasPro) {
      if (penalty === "custom" && (custom === null || isNaN(custom) || custom <= 0)) check("penalty_invalid", "penalty_rate", "error");
      else if (penalty === "custom" && r.minPenalty !== null && round(custom / 100) < r.minPenalty) {
        check("penalty_min", "penalty_rate", "error", { min: fmt.pct(r.minPenalty), semester: semesterLabel(r.semester) });
        penaltyText = "";   // un taux illégal n'est pas écrit dans les CGV : la case reste à remplir
      }
      if ((penalty === "bce" && r.defaultPenalty === null) || (penalty !== "bce" && r.minPenalty === null)) {
        check("rates_unknown", "penalty", "warn", { semester: semesterLabel(r.semester) });
      }
    }

    // Acompte : aucun paiement avant 7 jours pour un contrat hors établissement avec un particulier.
    var deposit = int(raw.deposit);
    var hasDeposit = deposit !== null && !isNaN(deposit) && deposit > 0;
    if (deposit !== null && (isNaN(deposit) || deposit < 0 || deposit > 100)) check("deposit_invalid", "deposit", "error");
    if (hasDeposit && hasPart && offsite) check("offsite_deposit", "deposit", "warn", { days: he.paiement_interdit_jours });

    // Escompte pour paiement anticipé.
    var escompte = raw.escompte === "yes";
    var escRate = int(raw.escompte_rate), escDays = int(raw.escompte_days);
    if (escompte && (escRate === null || isNaN(escRate) || escRate <= 0 || escDays === null || isNaN(escDays) || escDays < 0)) {
      check("escompte_invalid", "escompte_rate", "error");
    }

    // Moyens de paiement.
    var methods = [];
    if (on(raw.pay_transfer)) methods.push("virement");
    if (on(raw.pay_card)) methods.push("carte bancaire");
    if (on(raw.pay_check)) methods.push("chèque");
    if (!methods.length) check("payment_none", "pay_transfer", "error");

    // Recette entre professionnels : 30 jours au plus (F23211), sauf contrat contraire.
    var acceptance = int(raw.acceptance);
    if (hasPro && (acceptance === null || isNaN(acceptance) || acceptance < 1)) check("acceptance_invalid", "acceptance", "error");
    else if (hasPro && acceptance > 30) check("acceptance_max", "acceptance", "warn", { max: 30 });

    var notice = int(raw.notice);
    if (notice === null || isNaN(notice) || notice < 0) check("notice_invalid", "notice", "error");

    var validity = int(raw.validity);
    if (validity === null || isNaN(validity) || validity < 1) check("validity_invalid", "validity", "error");

    // Informations obligatoires et démarches.
    if (!str(raw.p_name)) check("name_missing", "p_name", "error");
    if (!str(raw.p_siren)) check("siren_missing", "p_siren", "warn");
    if (raw.vat === "vat" && !str(raw.p_vat)) check("vat_number_missing", "p_vat", "warn");
    if (!str(raw.p_privacy)) check("privacy_missing", "p_privacy", "info");
    if (hasPart && !str(raw.med_name)) check("mediator_missing", "med_name", "error");
    if (hasPart && str(raw.med_name) && (!str(raw.med_address) || !str(raw.med_site))) check("mediator_incomplete", "med_address", "warn");
    if (retract && (!str(raw.p_address) || !str(raw.p_email))) check("retract_contact", "p_address", "error");
    if (retract && online && !str(raw.online_url)) check("online_url_missing", "online_url", "error");
    if (hasPart && !distance && !offsite) check("premises_only", "distance", "info");

    var where = distance && offsite ? "à distance ou hors établissement" :
      offsite ? "hors établissement (notamment à son domicile)" : "à distance (notamment par email, par téléphone ou sur internet)";

    var flags = {
      clients: clients, has_pro: flag(hasPro), has_part: flag(hasPart), both: flag(hasPro && hasPart),
      pro_only: flag(!hasPart), part_only: flag(!hasPro), distance: flag(distance), offsite: flag(offsite),
      online: flag(retract && online), retract: flag(retract), small_pro: flag(smallPro),
      withdrawal: flag(retract || smallPro), offsite_part: flag(hasPart && offsite), distance_part: flag(hasPart && distance),
      has_deposit: flag(hasDeposit), escompte: flag(escompte), penalty: penalty
    };
    var text = {
      penalty_text: penaltyText,
      terms_text: !termsOk ? "" : terms === 0 ? "à réception de la facture" :
        "dans un délai de " + fmt.num(terms) + " jours à compter de leur date d'émission",
      payment_methods: join(methods),
      deposit: hasDeposit ? fmt.num(deposit) : "",
      escompte_rate: escompte && escRate > 0 ? fmt.num(escRate) : "",
      escompte_days: escompte && escDays >= 0 ? fmt.num(escDays) : "",
      acceptance: acceptance > 0 ? fmt.num(acceptance) : "",
      notice: notice >= 0 ? fmt.num(notice) : "",
      validity: validity > 0 ? fmt.num(validity) : "",
      where: where,
      retract_days: rc.delai_jours ? fmt.num(rc.delai_jours) : "",
      refund_days: rc.remboursement_jours ? fmt.num(rc.remboursement_jours) : "",
      offsite_days: he.paiement_interdit_jours ? fmt.num(he.paiement_interdit_jours) : "",
      indemnity: rules.indemnite_forfaitaire_recouvrement != null ? fmt.num(rules.indemnite_forfaitaire_recouvrement) + " €" : "",
      small_max: small.salaries_max ? fmt.num(small.salaries_max) : "",
      med_delay: med.saisine_delai_ans === 1 ? "d'un an" : med.saisine_delai_ans > 1 ? "de " + fmt.num(med.saisine_delai_ans) + " ans" : "",
      warranty_years: warranty.duree_ans ? fmt.num(warranty.duree_ans) : ""
    };
    return { flags: flags, text: text, blocks: { form: withdrawalForm(rules) }, checks: checks };
  }

  return { semester: semester, rates: rates, semesterLabel: semesterLabel, withdrawalForm: withdrawalForm, prepare: prepare };
});
