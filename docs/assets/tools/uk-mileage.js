/* UK mileage allowance : 55p puis 25p par mille (voiture), 24p (moto), 20p (vélo), et Mileage Allowance Relief. */
(function () {
  "use strict";
  var OF = window.OF, R = window.OF_RULES;
  var form = document.getElementById("mileage-form");
  if (!form || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var LIMIT = 10000;

  function compute() {
    var vehicle = $("m-vehicle").value;
    var miles = Math.max(0, OF.num($("m-miles").value) || 0);
    var paid = Math.max(0, OF.num($("m-paid").value) || 0) / 100;
    var total, formula;
    if (vehicle === "car") {
      var first = Math.min(miles, LIMIT), rest = Math.max(0, miles - LIMIT);
      total = first * R.simplified_mileage_car_first_10000 + rest * R.simplified_mileage_car_after_10000;
      formula = OF.fmt(first) + " × " + Math.round(R.simplified_mileage_car_first_10000 * 100) + "p" +
        (rest ? " + " + OF.fmt(rest) + " × " + Math.round(R.simplified_mileage_car_after_10000 * 100) + "p" : "") + " = " + OF.money(total);
    } else {
      var rate = vehicle === "motorcycle" ? R.simplified_mileage_motorcycle : R.simplified_mileage_bicycle;
      total = miles * rate;
      formula = OF.fmt(miles) + " × " + Math.round(rate * 100) + "p = " + OF.money(total);
    }
    var relief = Math.max(0, total - miles * paid);
    $("m-total").textContent = OF.money(total);
    $("m-sub").textContent = paid > 0
      ? "Your employer pays " + OF.money(miles * paid) + ": you can claim Mileage Allowance Relief on " + OF.money(relief) + "."
      : "Allowable expense for sole traders, or tax-free allowance an employer can pay.";
    $("m-formula").textContent = formula;
  }

  OF.persistForm(form, "mileage");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
