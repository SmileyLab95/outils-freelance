/* Frais de véhicule du travailleur autonome canadien : part professionnelle (km d'affaires ÷ km totaux) × dépenses réelles. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("vehicle-form");
  var dataEl = document.getElementById("vehicle-data");
  if (!form || !dataEl) return;
  var L = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var FIELDS = ["fuel", "insurance", "maintenance", "licence", "interest", "cca"];

  function compute() {
    var business = Math.max(0, OF.num($("v-business").value) || 0);
    var total = Math.max(0, OF.num($("v-total").value) || 0);
    var share = total > 0 ? Math.min(1, business / total) : 0;
    var expenses = FIELDS.reduce(function (s, f) { return s + Math.max(0, OF.num($("v-" + f).value) || 0); }, 0);
    var deduction = expenses * share;
    var pct = OF.fmt(Math.round(share * 1000) / 10) + L.percent;
    $("v-deduction").textContent = OF.money(deduction, 0);
    $("v-sub").textContent = total > 0 ? fill(L.sub, { share: pct, expenses: OF.money(expenses, 0) }) : L.sub_empty;
    $("v-formula").textContent = OF.money(expenses) + " × " + OF.fmt(business) + " ÷ " + OF.fmt(total) + " = " + OF.money(deduction);
    $("v-warning").hidden = !(business > total);
  }

  OF.persistForm(form, "vehicle");
  form.addEventListener("input", compute);
  compute();
})();
