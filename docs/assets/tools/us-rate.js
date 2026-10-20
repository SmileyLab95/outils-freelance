/* US freelance hourly rate calculator : du revenu net visé au taux horaire, impôts 2026 compris (moteur OFE.taxUS). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("us-rate-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };

  function compute() {
    var take = OF.num($("h-take").value) || 0;
    var costs = OF.num($("h-costs").value) || 0;
    var input = { status: $("h-status").value, stateRate: (OF.num($("h-state").value) || 0) / 100 };
    var weeks = Math.max(0, 52 - (OF.num($("h-weeks").value) || 0) - (OF.num($("h-holidays").value) || 0) / 5);
    var hours = OF.num($("h-hours").value) || 0;
    var unbilled = Math.min(95, Math.max(0, OF.num($("h-unbilled").value) || 0)) / 100;
    var buffer = Math.max(0, OF.num($("h-buffer").value) || 0) / 100;

    var billable = Math.round(weeks * hours * (1 - unbilled));
    var profit = OFE.taxUS.profitForTakeHome(take, input, R);
    var taxes = OFE.taxUS.estimate(Object.assign({}, input, { profit: profit }), R).total;
    var revenue = profit + costs;
    var minimum = billable > 0 ? revenue / billable : NaN;
    var rate = minimum * (1 + buffer);

    set("h-rate", OF.money(rate, 0));
    set("h-sub", isFinite(minimum)
      ? "Minimum " + OF.money(minimum, 0) + "/hour to reach your goal, plus your " + Math.round(buffer * 100) + "% safety margin."
      : "Add working hours to see your rate.");
    set("h-day", OF.money(rate * 8, 0));
    set("h-revenue", OF.money(revenue * (1 + buffer), 0));
    set("h-month", OF.money(revenue * (1 + buffer) / 12, 0));
    set("h-taxes", OF.money(taxes, 0));
    set("h-r-costs", OF.money(costs, 0));
    set("h-billable", OF.fmt(billable) + " hours (" + OF.fmt(Math.round(billable / Math.max(1, weeks))) + "/week)");

    // Simulation : revenu net pour un taux et un volume donnés.
    var tryRate = OF.num($("h-try").value) || 0;
    var tryHours = OF.num($("h-try-hours").value) || 0;
    var tryRevenue = tryRate * tryHours * weeks;
    var tryResult = OFE.taxUS.estimate(Object.assign({}, input, { profit: Math.max(0, tryRevenue - costs) }), R);
    $("h-try-result").textContent = "Revenue " + OF.money(tryRevenue, 0) + " a year → take-home about " +
      OF.money(tryResult.takeHome, 0) + " (" + OF.money(tryResult.takeHome / 12, 0) + " a month) after " +
      OF.money(tryResult.total, 0) + " in taxes.";
  }

  OF.persistForm(form, "rate");
  document.addEventListener("input", compute);
  document.addEventListener("change", compute);
  compute();
})();
