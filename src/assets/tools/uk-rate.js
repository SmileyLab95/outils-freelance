/* UK freelance day rate calculator : du revenu net visé au tarif journalier (moteur OFE.taxUK). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("uk-rate-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };

  function compute() {
    var take = Math.max(0, OF.num($("d-take").value) || 0);
    var costs = Math.max(0, OF.num($("d-costs").value) || 0);
    var input = { region: $("d-region").value };
    var weekdays = 52 * 5 - (OF.num($("d-holidays").value) || 0) * 5 - (OF.num($("d-bank").value) || 0);
    var unbilled = Math.min(95, Math.max(0, OF.num($("d-unbilled").value) || 0)) / 100;
    var days = Math.max(0, Math.round(weekdays * (1 - unbilled)));
    var hours = OF.num($("d-hours").value) || 7.5;
    var buffer = Math.max(0, OF.num($("d-buffer").value) || 0) / 100;

    var profit = OFE.taxUK.profitForTakeHome(take, input, R);
    var taxes = OFE.taxUK.soleTrader(Object.assign({}, input, { profit: profit }), R).total;
    var revenue = (profit + costs) * (1 + buffer);
    var minimum = days > 0 ? (profit + costs) / days : NaN;
    var rate = minimum * (1 + buffer);

    set("d-rate", OF.money(rate, 0));
    set("d-sub", isFinite(minimum)
      ? "Minimum " + OF.money(minimum, 0) + " a day to reach your goal, plus your " + Math.round(buffer * 100) + "% safety margin."
      : "Add working days to see your rate.");
    set("d-hour", OF.money(rate / hours, 0));
    set("d-revenue", OF.money(revenue, 0));
    set("d-month", OF.money(revenue / 12, 0));
    set("d-taxes", OF.money(taxes, 0));
    set("d-days", OF.fmt(days) + " days (" + OF.fmt(Math.round(days / 52 * 10) / 10) + " a week)");
  }

  OF.persistForm(form, "rate");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
