/* Barème kilométrique (voitures) : tranche selon la distance annuelle, majoration électrique (règles data/rules/fr.json). */
(function () {
  "use strict";
  var OF = window.OF, R = window.OF_RULES;
  var form = document.getElementById("mileage-form");
  if (!form || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var B = R.bareme_kilometrique_voitures, EV = R.bareme_kilometrique_majoration_electrique;
  var LABELS = { 3: "3 CV et moins", 4: "4 CV", 5: "5 CV", 6: "6 CV", 7: "7 CV et plus" };

  function band(cv, km) {
    return B[cv].filter(function (b) { return b.to == null || km <= b.to; })[0];
  }
  function amount(cv, km, ev) {
    var b = band(cv, km);
    return (km * b.rate + b.fixed) * (ev ? 1 + EV : 1);
  }

  function compute() {
    var km = Math.max(0, OF.num($("k-km").value) || 0);
    var cv = $("k-cv").value, ev = $("k-ev").checked;
    var b = band(cv, km);
    var total = amount(cv, km, ev);
    $("k-total").textContent = OF.eur(total, 0);
    $("k-sub").textContent = km > 0 ? "Soit " + OF.eur(total / km) + " par kilomètre en moyenne, pour " + OF.fmt(km) + " km." : "Indiquez vos kilomètres professionnels.";
    $("k-formula").textContent = OF.fmt(km) + " km × " + OF.rate(b.rate) + (b.fixed ? " + " + OF.fmt(b.fixed) : "") +
      (ev ? " = " + OF.eur(km * b.rate + b.fixed) + " × 1,2 = " : " = ") + OF.eur(total);
    $("k-caption").textContent = "Pour " + OF.fmt(km) + " km";
    $("k-table").innerHTML = Object.keys(B).map(function (k) {
      return "<tr" + (k === cv ? ' class="current"' : "") + "><td>" + LABELS[k] + "</td><td>" + OF.eur(amount(k, km, false), 0) +
        "</td><td>" + OF.eur(amount(k, km, true), 0) + "</td></tr>";
    }).join("");
  }

  OF.persistForm(form, "mileage");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
