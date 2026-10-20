/* Calculateur de taux horaire du travailleur autonome canadien (moteur OFE.taxCA), bilingue : libellés dans #ca-rate-data. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("ca-rate-form");
  var dataEl = document.getElementById("ca-rate-data");
  if (!form || !OFE || !R || !dataEl) return;
  var L = JSON.parse(dataEl.textContent);
  var P = R._meta.provinces;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };

  var codes = Object.keys(P).sort(function (a, b) { return P[a][L.names].localeCompare(P[b][L.names], OF.locale); });
  $("h-province").innerHTML = codes.map(function (c) {
    return '<option value="' + c + '"' + (c === L.default_province ? " selected" : "") + ">" + P[c][L.names] + "</option>";
  }).join("");

  function compute() {
    var take = Math.max(0, OF.num($("h-take").value) || 0);
    var costs = Math.max(0, OF.num($("h-costs").value) || 0);
    var input = { province: $("h-province").value };
    var weeks = Math.max(0, 52 - (OF.num($("h-weeks").value) || 0) - (OF.num($("h-holidays").value) || 0) / 5);
    var hours = OF.num($("h-hours").value) || 0;
    var unbilled = Math.min(95, Math.max(0, OF.num($("h-unbilled").value) || 0)) / 100;
    var buffer = Math.max(0, OF.num($("h-buffer").value) || 0) / 100;
    var billable = Math.round(weeks * hours * (1 - unbilled));
    var profit = OFE.taxCA.profitForTakeHome(take, input, R, P);
    var taxes = OFE.taxCA.estimate(Object.assign({}, input, { profit: profit }), R, P).total;
    var revenue = profit + costs;
    var minimum = billable > 0 ? revenue / billable : NaN;
    var rate = minimum * (1 + buffer);

    set("h-rate", OF.money(rate, 0));
    set("h-sub", isFinite(minimum) ? fill(L.sub, { minimum: OF.money(minimum, 0), buffer: Math.round(buffer * 100) + L.percent }) : L.sub_empty);
    set("h-day", OF.money(rate * 7.5, 0));
    set("h-revenue", OF.money(revenue * (1 + buffer), 0));
    set("h-month", OF.money(revenue * (1 + buffer) / 12, 0));
    set("h-taxes", OF.money(taxes, 0));
    set("h-billable", fill(L.billable, { hours: OF.fmt(billable), week: OF.fmt(Math.round(billable / Math.max(1, weeks))) }));
  }

  OF.persistForm(form, "rate");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
