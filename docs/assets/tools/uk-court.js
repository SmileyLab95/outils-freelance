/* UK small claims : ce que l'on peut réclamer, frais de justice, circuit et démarches (moteur OFE.courtUK). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("court-form"), data = document.getElementById("court-uk-data");
  if (!form || !data || !OFE || !OFE.courtUK || !R) return;
  var L = JSON.parse(data.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var pct = function (x) { return OF.fmt(Math.round(x * 10000) / 100) + "%"; };

  /** Taux de référence du semestre où la dette est devenue exigible (le lendemain de l'échéance), comme le calculateur d'intérêts. */
  function referenceRate(due) {
    var overdue = OF.addDays(due, 1);
    var row = R.late_payment_reference_rates.filter(function (r) { return overdue >= r.overdue_from && overdue <= r.overdue_to; })[0];
    return row ? { rate: row.bank_rate, known: true } : { rate: R.boe_bank_rate, known: false };
  }

  /** Délai de prescription : 6 ans après l'échéance, affiché au mois près (le point de départ exact dépend du dossier). */
  function limitation(due, today) {
    var years = R.uk_limitation_simple_contract.years;
    if (!due) return "Enter the due date to see until when you can claim.";
    var d = OF.parseDate(due);
    d.setFullYear(d.getFullYear() + years);
    var end = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    if (end <= today) return "More than " + years + " years have passed since the due date: the claim is probably out of time, unless your client has since made a part payment or acknowledged the debt in writing. Get legal advice.";
    return years + " years from when payment was due: until about " + OF.date(end, { month: "long", year: "numeric" }) +
      ". A part payment, or an acknowledgment of the debt in writing and signed by your client, restarts the clock.";
  }

  function compute() {
    var owed = Math.max(0, OF.num($("c-amount").value) || 0);
    var due = $("c-due").value, today = OF.today();
    var client = $("c-client").value, place = $("c-place").value;
    var days = due ? Math.max(0, OF.daysBetween(due, today)) : 0;
    var ref = due ? referenceRate(due) : { rate: R.boe_bank_rate, known: true };
    var p = OFE.courtUK.plan({ owed: owed, daysLate: days, referenceRate: ref.rate, client: client, place: place,
                               addInterest: $("c-interest").checked }, R);
    var local = place === "england_wales";

    $("c-figures").hidden = !local;
    $("c-interest-note").hidden = !local;
    $("c-before-card").hidden = !local;
    $("c-limit-card").hidden = !local;
    set("c-route-title", local ? "Where to claim" : L.route_titles[p.route]);
    set("c-route", L.routes[p.route]);

    if (!local) {
      set("c-hero-label", "Your client's address");
      set("c-fee", L.route_titles[p.route]);
      set("c-sub", "This calculator covers claims against clients in England and Wales.");
      $("c-track-note").hidden = true;
      return;
    }
    set("c-hero-label", "Court fee to start your claim");
    set("c-fee", owed > 0 ? OF.money(p.issueFee) : "–");
    set("c-sub", owed > 0 ? "On a claim of " + OF.money(p.claimed) + ". If you win, your client normally pays it back."
      : "Enter the amount your client owes you.");
    set("c-owed", OF.money(owed));
    set("c-int", OF.money(p.interest.interest));
    set("c-comp", OF.money(p.interest.compensation));
    set("c-claimed", OF.money(p.claimed));
    set("c-hearing", p.hearingFee === null ? "Higher (not a small claim)" : OF.money(p.hearingFee));
    set("c-track", L.tracks[p.track]);

    var note;
    if (!$("c-interest").checked) note = L.interest.none;
    else if (!due || days === 0) note = L.interest.not_late;
    else {
      note = L.interest[p.interest.basis].replace("{rate}", pct(p.interest.rate));
      if (p.interest.basis === "late_payment_act" && !ref.known)
        note += " The reference rate for that half-year isn't in our data, so this uses today's base rate (" + pct(R.boe_bank_rate) + "): check it.";
    }
    set("c-interest-note", note);
    set("c-before", L.pre_action[p.preAction]);
    $("c-track-note").hidden = false;
    set("c-track-note", L.tracks[p.track] + ": " + L.track_notes[p.track]);
    set("c-limit", limitation(due, today));
  }

  OF.persistForm(form, "court");
  if (!$("c-due").value) $("c-due").value = OF.addDays(OF.today(), -60);
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
