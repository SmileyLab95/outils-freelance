/* How much to set aside for taxes (US) : part de chaque paiement à mettre de côté, à partir du moteur OFE.taxUS. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("setaside-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var pct = function (x) { return OF.fmt(Math.round(x * 1000) / 10) + "%"; };
  var LEVELS = [30000, 50000, 75000, 100000, 150000, 200000];

  function input(profit) {
    return {
      profit: profit,
      status: $("s-status").value,
      wages: Math.max(0, OF.num($("s-wages").value) || 0),
      stateRate: Math.max(0, OF.num($("s-state").value) || 0) / 100,
      sstb: false
    };
  }

  function compute() {
    var monthly = Math.max(0, OF.num($("s-income").value) || 0);
    var expenses = Math.max(0, OF.num($("s-expenses").value) || 0);
    var revenue = monthly * 12, profit = Math.max(0, revenue - expenses * 12);
    var r = OFE.taxUS.estimate(input(profit), R);
    // Part de chaque encaissement à mettre de côté : impôt total ÷ chiffre d'affaires, arrondie au point supérieur.
    var share = revenue > 0 ? r.total / revenue : 0;
    var rounded = OF.ceilShare(share);
    set("s-share", revenue > 0 ? pct(rounded) : "–");
    set("s-sub", revenue > 0
      ? "of every payment you receive: about " + OF.money(revenue * rounded / 12, 0) + " a month, " + OF.money(r.total, 0) + " for the year."
      : "Enter what you invoice in a typical month.");
    set("s-se", OF.money(r.se.total, 0));
    set("s-fed", OF.money(r.incomeTax + r.additionalMedicare, 0));
    set("s-state-amt", OF.money(r.state, 0));
    set("s-total", OF.money(r.total, 0));
    set("s-quarter", OF.money((r.federal) / 4, 0));
    set("s-keep", OF.money(revenue - expenses * 12 - r.total, 0) + " · " + OF.money((revenue - expenses * 12 - r.total) / 12, 0) + "/mo");

    // Répartition d'un paiement reçu.
    var payment = Math.max(0, OF.num($("s-payment").value) || 0);
    set("s-pay-tax", OF.money(payment * rounded));
    set("s-pay-keep", OF.money(payment * (1 - rounded)));

    // Taux à mettre de côté selon le bénéfice, pour la même situation (sans dépenses).
    $("s-levels").innerHTML = LEVELS.map(function (p) {
      var x = OFE.taxUS.estimate(input(p), R);
      var current = profit >= p * 0.85 && profit < p * 1.18;
      return "<tr" + (current ? ' class="current"' : "") + "><td>" + OF.money(p, 0) + "</td><td>" + pct(x.effectiveRate) +
        "</td><td>" + OF.money(x.total / 12, 0) + "</td></tr>";
    }).join("");
  }

  OF.persistForm(form, "setaside");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
