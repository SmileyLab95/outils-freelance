/*
 * Moteur : réclamer une facture impayée devant le tribunal au Royaume-Uni (documentation/24-recouvrement-uk-us-ca.md,
 * § 1). Angleterre et pays de Galles : intérêts jusqu'au jour du calcul, frais de dépôt et d'audience, circuit,
 * démarche avant le procès, voie de dépôt ; Écosse, Irlande du Nord et client à l'étranger : renvoi seulement (autres
 * procédures). Règles dans data/rules/uk.json (uk_money_claim_issue_fee, uk_small_claims_hearing_fee, uk_civil_tracks,
 * uk_mcol_conditions, uk_court_interest_other_debts, late_payment_*). Fonctions pures, testées par
 * tests/unit/court-uk.test.mjs ; les textes sont dans la page, le moteur ne renvoie que des montants et des clés.
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.taxUK : require("./tax-uk.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).courtUK = api;
})(typeof self !== "undefined" ? self : this, function (T) {
  "use strict";

  var CLIENTS = ["company", "sole_trader", "consumer"];
  var PLACES = ["england_wales", "scotland", "northern_ireland", "abroad"];
  var pence = function (x) { return Math.round(x * 100); };
  var round2 = function (x) { return pence(x) / 100; };

  /** Tranche d'un barème dont la borne haute est comprise (« up to £300 », « £300.01 to £500 »…). */
  function band(value, bands) {
    for (var i = 0; i < bands.length; i++) if (bands[i].to === null || value <= bands[i].to) return bands[i];
    throw new Error("Barème incomplet");
  }

  /** Frais de dépôt d'une demande en paiement : forfait de la tranche, ou pourcentage arrondi au penny inférieur. */
  function issueFee(claimed, rules) {
    if (!(claimed > 0)) return 0;
    var b = band(round2(claimed), rules.uk_money_claim_issue_fee);
    // En pence entiers, après avoir effacé le bruit du calcul en virgule flottante (5 % de 12 345,60 £ = 617,28 £).
    return "rate" in b ? Math.floor(Math.round(pence(claimed) * b.rate * 1e6) / 1e6) / 100 : b.fee;
  }

  /** Frais d'audience d'une affaire des small claims contestée, selon le montant réclamé. */
  function hearingFee(claimed, rules) {
    return claimed > 0 ? band(round2(claimed), rules.uk_small_claims_hearing_fee).fee : 0;
  }

  /** Circuit habituel selon le montant en litige, sans les intérêts ni les frais (CPR 26.13). */
  function track(disputed, rules) {
    var t = rules.uk_civil_tracks;
    return disputed <= t.small_claims ? "small_claims" : disputed <= t.fast_track ? "fast_track"
      : disputed <= t.intermediate_track ? "intermediate_track" : "multi_track";
  }

  /**
   * Intérêts jusqu'au jour du calcul. Client professionnel (société, LLP ou sole trader) : intérêts légaux et indemnité
   * fixe du Late Payment Act, au taux de référence du semestre où la facture est devenue exigible. Particulier : taux
   * habituel des autres dettes (8 % par an, intérêts simples).
   */
  function interest(owed, daysLate, referenceRate, client, rules) {
    var days = Math.max(0, daysLate);
    if (client === "consumer") {
      var rate = rules.uk_court_interest_other_debts;
      return { basis: "court_rate", rate: rate, interest: round2(owed * rate * days / 365), compensation: 0 };
    }
    var r = T.latePayment(owed, days, referenceRate, rules);
    return { basis: "late_payment_act", rate: r.rate, interest: round2(r.interest), compensation: r.compensation };
  }

  /**
   * input : { owed: montant de la facture (TVA comprise), daysLate: jours de retard au jour du calcul, referenceRate:
   * taux de référence du semestre de l'échéance (Late Payment Act), client: "company" | "sole_trader" | "consumer",
   * place: "england_wales" | "scotland" | "northern_ireland" | "abroad" (adresse du client), addInterest: booléen }.
   * Renvoie { place, interest, claimed, issueFee, track, hearingFee, route, preAction } ; hors de l'Angleterre et du
   * pays de Galles, seulement { place, route } (les barèmes et circuits calculés ici ne s'y appliquent pas).
   */
  function plan(input, rules) {
    var owed = Math.max(0, Number(input.owed) || 0), client = input.client, place = input.place;
    if (CLIENTS.indexOf(client) < 0 || PLACES.indexOf(place) < 0) throw new Error("Situation inconnue : " + JSON.stringify(input));
    if (place !== "england_wales") return { place: place, route: place };

    var i = input.addInterest && input.daysLate > 0 && owed > 0 ? interest(owed, input.daysLate, input.referenceRate, client, rules)
      : { basis: "none", rate: 0, interest: 0, compensation: 0 };
    var claimed = round2(owed + i.interest + i.compensation);
    var t = track(owed, rules);
    return {
      place: place,
      interest: i,
      claimed: claimed,
      issueFee: issueFee(claimed, rules),
      track: t,
      hearingFee: t === "small_claims" ? hearingFee(claimed, rules) : null,
      // Lecture prudente : le total réclamé, intérêts compris, doit rester sous la limite de Money Claim Online.
      route: claimed < rules.uk_mcol_conditions.max_claim_below ? "online" : "paper",
      // Protocole des créances quand le débiteur est une personne physique (sole trader compris).
      preAction: client === "company" ? "pre_action_conduct" : "debt_protocol"
    };
  }

  return { CLIENTS: CLIENTS, PLACES: PLACES, band: band, issueFee: issueFee, hearingFee: hearingFee, track: track,
           interest: interest, plan: plan };
});
