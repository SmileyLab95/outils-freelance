/* US mileage deduction : milles par semestre au taux standard de l'IRS, plus stationnement et péages. */
(function () {
  "use strict";
  var OF = window.OF, R = window.OF_RULES;
  var form = document.getElementById("mileage-form");
  if (!form || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  $("m-r1").placeholder = OF.fmt(R.mileage_rate_business_2026_jan_jun * 100);
  $("m-r2").placeholder = OF.fmt(R.mileage_rate_business_2026_jul_dec * 100);

  function compute() {
    var h1 = Math.max(0, OF.num($("m-h1").value) || 0), h2 = Math.max(0, OF.num($("m-h2").value) || 0);
    var r1 = (OF.num($("m-r1").value) || R.mileage_rate_business_2026_jan_jun * 100) / 100;
    var r2 = (OF.num($("m-r2").value) || R.mileage_rate_business_2026_jul_dec * 100) / 100;
    var extra = Math.max(0, OF.num($("m-extra").value) || 0);
    var total = h1 * r1 + h2 * r2 + extra;
    $("m-total").textContent = OF.money(total);
    $("m-sub").textContent = OF.fmt(h1 + h2) + " business miles" + (extra ? " plus " + OF.money(extra) + " of parking and tolls." : ".");
    $("m-formula").textContent = OF.fmt(h1) + " × $" + OF.rate(r1) + " + " + OF.fmt(h2) + " × $" + OF.rate(r2) +
      (extra ? " + " + OF.money(extra) : "") + " = " + OF.money(total);
  }

  OF.persistForm(form, "mileage");
  form.addEventListener("input", compute);
  compute();
})();
