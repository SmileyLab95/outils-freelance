/* Making Tax Digital checker : date d'entrée dans MTD selon le revenu qualifiant, échéances trimestrielles. */
(function () {
  "use strict";
  var OF = window.OF, R = window.OF_RULES;
  var form = document.getElementById("uk-mtd-form");
  if (!form || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var long = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  var QUARTER_ENDS = ["2026-07-05", "2026-10-05", "2027-01-05", "2027-04-05"];

  function compute() {
    var income = Math.max(0, OF.num($("m-income").value) || 0);
    var start, sub;
    if (income > R.mtd_itsa_threshold_2026) {
      start = "6 April 2026";
      sub = "Over " + OF.money(R.mtd_itsa_threshold_2026, 0) + ": if this was your 2024/25 income, you should already be keeping digital records and sending quarterly updates.";
    } else if (income > R.mtd_itsa_threshold_2027) {
      start = "6 April 2027";
      sub = "Over " + OF.money(R.mtd_itsa_threshold_2027, 0) + " in 2025/26: choose your software before April 2027.";
    } else if (income > R.mtd_itsa_threshold_2028) {
      start = "6 April 2028";
      sub = "Over " + OF.money(R.mtd_itsa_threshold_2028, 0) + " in 2026/27 (planned threshold): you have time, but digital records will help now.";
    } else {
      start = "Not yet";
      sub = "At or below " + OF.money(R.mtd_itsa_threshold_2028, 0) + ", Making Tax Digital for Income Tax doesn't apply to you under the announced thresholds. Keep filing your Self Assessment return as usual.";
    }
    $("m-start").textContent = start;
    $("m-sub").textContent = sub;
    $("m-deadlines").innerHTML = R.mtd_itsa_quarterly_deadlines_2026_27.map(function (d, i) {
      return "<tr><td>" + long(QUARTER_ENDS[i]) + "</td><td>" + long(d) + "</td></tr>";
    }).join("");
  }

  OF.persistForm(form, "mtd");
  form.addEventListener("input", compute);
  compute();
})();
