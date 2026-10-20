/* SEP-IRA vs solo 401(k) : cotisations maximales 2026 d'un travailleur indépendant et impôt économisé (moteur OFE.taxUS). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("retire-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var L = R.retirement_limits_2026;

  function compute() {
    var input = {
      profit: Math.max(0, OF.num($("u-profit").value) || 0), status: $("u-status").value,
      stateRate: Math.max(0, OF.num($("u-state").value) || 0) / 100
    };
    var base = OFE.taxUS.estimate(input, R);
    var earnings = Math.max(0, base.profit - base.se.deduction);
    var rate = R.sep_self_employed_rate;
    var employer = Math.min(L.annual_additions, rate * Math.min(earnings, L.compensation_limit));
    // Solo 401(k) : part « salarié » jusqu'au plafond de report, puis part « employeur » de 20 %, total limité à 72 000 $.
    var deferral = Math.min(L.deferral, Math.max(0, earnings - employer));
    var soloBase = Math.min(L.annual_additions, employer + deferral);
    var age = $("u-age").value;
    var catchUp = age === "50" ? L.catch_up_50 : age === "60" ? L.catch_up_60_63 : 0;
    catchUp = Math.min(catchUp, Math.max(0, earnings - employer - deferral));
    var sep = employer, solo = soloBase + catchUp;
    var saved = function (amount) { return base.total - OFE.taxUS.estimate(Object.assign({}, input, { retirement: amount }), R).total; };

    set("u-best", OF.money(solo, 0));
    set("u-sub", earnings > 0 ? "with a solo 401(k), versus " + OF.money(sep, 0) + " with a SEP-IRA. Saving the maximum cuts your 2026 tax by about " + OF.money(saved(solo), 0) + "." : "Enter your net profit.");
    set("u-sep-max", OF.money(sep, 0));
    set("u-sep-tax", OF.money(saved(sep), 0));
    set("u-solo-max", OF.money(solo, 0));
    set("u-solo-split", OF.money(deferral + catchUp, 0) + " + " + OF.money(Math.max(0, soloBase - deferral), 0));
    set("u-solo-tax", OF.money(saved(solo), 0));
    $("u-sep").classList.toggle("is-best", sep >= solo && earnings > 0);
    $("u-solo").classList.toggle("is-best", solo > sep);

    var amount = Math.max(0, OF.num($("u-amount").value) || 0);
    var capped = Math.min(amount, solo);
    var s = saved(capped);
    set("u-amount-tax", amount > 0 ? OF.money(s, 0) + " (" + OF.fmt(Math.round(s / capped * 1000) / 10) + "%)" : "–");
    set("u-amount-cost", amount > 0 ? OF.money(capped - s, 0) : "–");
    $("u-amount-note").hidden = amount <= solo;
  }

  OF.persistForm(form, "retirement");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
