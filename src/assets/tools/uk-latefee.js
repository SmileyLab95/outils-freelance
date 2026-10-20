/* UK late payment interest : intérêts légaux (8 % + taux de référence du semestre) et indemnité fixe (moteur OFE.taxUK). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("uk-late-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var long = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  var pct = function (x) { return OF.fmt(Math.round(x * 10000) / 100) + "%"; };

  /** Taux de référence du semestre où la dette est devenue exigible (le lendemain de l'échéance). */
  function referenceRate(due) {
    var overdue = OF.addDays(due, 1);
    var row = R.late_payment_reference_rates.filter(function (r) { return overdue >= r.overdue_from && overdue <= r.overdue_to; })[0];
    return row ? { rate: row.bank_rate, known: true } : { rate: R.boe_bank_rate, known: false };
  }

  function compute() {
    var amount = Math.max(0, OF.num($("l-amount").value) || 0);
    var due = $("l-due").value;
    var paid = $("l-paid").value || OF.today();
    var b2b = $("l-b2b").checked;
    var days = due ? Math.max(0, OF.daysBetween(due, paid)) : NaN;
    var ref = due ? referenceRate(due) : { rate: R.boe_bank_rate, known: true };
    var r = OFE.taxUK.latePayment(amount, isFinite(days) ? days : 0, ref.rate, R);

    set("l-days", isFinite(days) ? days + " day" + (days === 1 ? "" : "s") : "–");
    set("l-rate-label", "Statutory interest (8% + " + pct(ref.rate) + " base rate)");
    set("l-rate", pct(r.rate) + " a year");
    set("l-daily", OF.money(r.daily));
    set("l-interest", OF.money(r.interest));
    set("l-comp", OF.money(r.compensation));

    if (!b2b) {
      set("l-total", OF.money(0));
      set("l-sub", "The Late Payment Act only covers business-to-business debts. With a consumer, you can only claim interest if your contract provides for it.");
    } else if (!due) {
      set("l-total", "–");
      set("l-sub", "Enter the invoice due date.");
    } else if (days === 0) {
      set("l-total", OF.money(0));
      set("l-sub", "Not late on " + long(paid) + ": nothing to claim yet.");
    } else {
      set("l-total", OF.money(r.total));
      set("l-sub", OF.money(r.interest) + " interest + " + OF.money(r.compensation) + " compensation, on top of the " +
        OF.money(amount) + " owed." + (ref.known ? "" : " Rate assumes the base rate stays at " + pct(R.boe_bank_rate) + "."));
    }
    set("l-formula", b2b && days > 0
      ? OF.money(amount) + " × " + pct(r.rate) + " × " + days + " days ÷ 365 = " + OF.money(r.interest)
      : "Interest = amount × (8% + reference rate) × days late ÷ 365");
    $("l-claim").innerHTML = OF.highlight(b2b && days > 0
      ? "Under the Late Payment of Commercial Debts (Interest) Act 1998, statutory interest of " + pct(r.rate) +
        " a year is accruing on this invoice from " + long(OF.addDays(due, 1)) + " (" + OF.money(r.daily) +
        " a day, " + OF.money(r.interest) + " to date), and we are entitled to fixed compensation of " + OF.money(r.compensation) +
        ". We will waive these amounts if the invoice is paid in full by [date]."
      : "Add a due date in the past to generate the sentence.");
  }

  OF.persistForm(form, "latefee");
  if (!$("l-due").value) $("l-due").value = OF.addDays(OF.today(), -30);
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
