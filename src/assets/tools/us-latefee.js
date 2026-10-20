/* US invoice late fee calculator : intérêts mensuels ou annuels (au jour ou par mois commencé) ou forfait. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("us-late-form");
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var long = function (iso) { return OF.date(iso, { month: "long", day: "numeric", year: "numeric" }); };

  function compute() {
    var method = $("l-method").value;
    form.querySelectorAll("[data-method]").forEach(function (el) {
      el.hidden = el.getAttribute("data-method").split(" ").indexOf(method) < 0;
    });
    var amount = OF.num($("l-amount").value) || 0;
    var due = $("l-due").value;
    var paid = $("l-paid").value || OF.today();
    var grace = Math.max(0, parseInt($("l-grace").value, 10) || 0);
    var late = due ? Math.max(0, OF.daysBetween(due, paid)) : NaN;
    var counted = Math.max(0, late - grace);
    var monthly = method === "annual" ? (OF.num($("l-annual").value) || 0) / 12 : OF.num($("l-monthly").value) || 0;
    var daily = $("l-accrual").value === "daily";
    var months = Math.ceil(counted / 30);
    var fee, formula, clause;

    if (method === "flat") {
      fee = counted > 0 ? OF.num($("l-flat").value) || 0 : 0;
      formula = "Flat fee of " + OF.money(OF.num($("l-flat").value) || 0) + " once the invoice is more than " + grace + " days overdue";
      clause = "Payment is due within [30] days of the invoice date. A late fee of " + OF.money(OF.num($("l-flat").value) || 0) +
        " will be added to any invoice not paid within " + grace + " days after its due date.";
    } else {
      fee = daily ? amount * monthly * 12 / 100 * counted / 365 : amount * monthly / 100 * months;
      formula = daily
        ? OF.money(amount) + " × " + OF.fmt(monthly * 12) + "% × " + counted + " days ÷ 365 = " + OF.money(fee)
        : OF.money(amount) + " × " + OF.fmt(monthly) + "% × " + months + " month" + (months > 1 ? "s" : "") + " = " + OF.money(fee);
      clause = "Payment is due within [30] days of the invoice date. Overdue balances accrue interest at " + OF.fmt(monthly) +
        "% per month (" + OF.fmt(monthly * 12) + "% per year), or the maximum rate permitted by law if lower, " +
        (daily ? "calculated daily " : "for each month or part of a month ") + "from " +
        (grace ? grace + " days after " : "") + "the due date until paid in full.";
    }

    set("l-r-amount", OF.money(amount));
    set("l-r-days", isFinite(late) ? late + " day" + (late === 1 ? "" : "s") + (grace && late ? " (" + counted + " after grace period)" : "") : "–");
    set("l-r-fee", OF.money(fee));
    set("l-r-total", OF.money(amount + (fee || 0)));
    set("l-fee", isFinite(fee) ? OF.money(fee) : "–");
    set("l-sub", !due ? "Enter the invoice due date."
      : late === 0 ? "Not overdue on " + long(paid) + ": no late fee yet."
      : "Due " + long(due) + ", " + late + " days late on " + long(paid) + ". Total due: " + OF.money(amount + fee) + ".");
    set("l-formula", isFinite(fee) && counted > 0 ? formula : "Late fee = overdue amount × rate × time late");
    $("l-clause").innerHTML = OF.highlight(clause);
  }

  OF.persistForm(form, "latefee");
  if (!$("l-due").value) $("l-due").value = OF.addDays(OF.today(), -45);
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
