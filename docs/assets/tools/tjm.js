/* Calculateur de TJM : chiffre d'affaires nécessaire, jours facturables, TJM minimum et conseillé. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("tjm-form");
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };

  function rate() {
    var status = $("t-status").value;
    $("t-rate-field").hidden = status !== "custom";
    return status === "custom" ? OF.num($("t-rate").value) / 100 : Number(status);
  }

  function compute() {
    var net = OF.num($("t-net").value), costs = OF.num($("t-costs").value) || 0;
    var r = rate();
    var days = 365 - 104 - (OF.num($("t-holidays").value) || 0) * 5 - (OF.num($("t-public").value) || 0);
    var billable = Math.round(days * (1 - (OF.num($("t-unbilled").value) || 0) / 100));
    var hours = OF.num($("t-hours").value) || 7;
    var margin = (OF.num($("t-margin").value) || 0) / 100;
    var ok = isFinite(net) && isFinite(r) && r < 1 && billable > 0;
    var ca = ok ? (net + costs) / (1 - r) : NaN;
    var tjmMin = ca / billable, tjm = tjmMin * (1 + margin);
    set("r-tjm", OF.eur(tjm, 0));
    set("r-tjm-min", OF.eur(tjmMin, 0));
    set("r-hour", OF.eur(tjm / hours, 0));
    set("r-ca", OF.eur(ca, 0));
    set("r-days", isFinite(days) ? days + " jours" : "–");
    set("r-billable", ok ? billable + " jours" : "–");
    set("r-contrib", OF.eur(ca * r, 0));
    set("r-half", OF.eur(tjm / 2, 0));
    set("r-month", OF.eur(ca / 12, 0));

    // Simulation inverse : revenu net mensuel pour un TJM et un volume donnés.
    var sTjm = OF.num($("s-tjm").value), sDays = OF.num($("s-days").value);
    var monthlyNet = sTjm * sDays * (1 - r) - costs / 12;
    $("s-result").textContent = isFinite(monthlyNet)
      ? "Revenu net estimé : " + OF.eur(monthlyNet, 0) + " par mois, soit " + OF.eur(monthlyNet * 12, 0) + " par an (chiffre d'affaires : " +
        OF.eur(sTjm * sDays, 0) + " par mois)."
      : "Saisissez un TJM et un nombre de jours.";
  }

  // Jours fériés de l'année tombant du lundi au vendredi en métropole (moteur des jours ouvrés), en aide du champ.
  var D = window.OFE && window.OFE.days, R = window.OF_RULES, year = OF.today().slice(0, 4);
  var count = D && R ? D.count(year + "-01-01", year + "-12-31", { rules: R }) : null;
  if (count) {
    var off = count.holidays.filter(function (h) { return h.off; }).length;
    $("t-public-year").textContent = "En " + year + " : " + off + " jours fériés du lundi au vendredi (métropole).";
  }

  OF.persistForm(form, "tjm");
  document.addEventListener("input", compute);
  document.addEventListener("change", compute);
  compute();
})();
