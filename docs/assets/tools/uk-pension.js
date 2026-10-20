/* Pension tax relief (UK, sole trader) : relief at source de 20 %, complément via Self Assessment, coût réel (moteur OFE.taxUK). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("pension-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var A = R.pension_annual_allowance;

  function compute() {
    var profit = Math.max(0, OF.num($("p-profit").value) || 0);
    var region = $("p-region").value;
    var net = Math.max(0, OF.num($("p-net").value) || 0);
    var gross = net / (1 - A.relief_at_source_rate);
    var limit = Math.max(profit, A.relief_minimum_gross);
    var relievable = Math.min(gross, limit);
    var basic = relievable * A.relief_at_source_rate;
    // Allègement total : impôt avant et après déduction de la cotisation brute (équivalent de l'extension des tranches).
    var total = Math.max(basic, OFE.taxUK.incomeTax(profit, region, R).tax - OFE.taxUK.incomeTax(profit - relievable, region, R).tax);
    var extra = total - basic;
    set("p-gross", OF.money(gross, 0));
    set("p-sub", net > 0 ? "goes into your pension for " + OF.money(net, 0) + " paid in, and costs you " + OF.money(net - extra, 0) + " after the extra relief you claim on your tax return." : "Enter what you pay into your pension.");
    set("p-basic", OF.money(gross - net, 0));
    set("p-extra", OF.money(extra, 0));
    set("p-total", OF.money(total, 0) + " (" + OF.fmt(relievable > 0 ? Math.round(total / relievable * 100) : 0) + "%)");
    set("p-cost", OF.money(net - extra, 0));
    var notice = $("p-notice");
    if (gross > limit) {
      notice.className = "notice warn";
      notice.textContent = "Tax relief is limited to your relevant UK earnings (" + OF.money(limit, 0) + " gross): contributions above that get no relief.";
    } else if (gross > A.annual_allowance) {
      notice.className = "notice warn";
      notice.textContent = "Above the " + OF.money(A.annual_allowance, 0) + " annual allowance: the excess is taxed unless you carry forward unused allowance from the last three tax years.";
    } else if (profit > R.personal_allowance_taper_threshold) {
      notice.className = "notice ok";
      notice.textContent = "Your contribution reduces your adjusted net income, which can restore part of your personal allowance: that's why your relief can exceed 40%.";
    } else {
      notice.className = "notice";
      notice.textContent = extra > 0 ? "Claim the extra relief in your Self Assessment return: it reduces your tax bill or is refunded." : "Your provider claims the 20% basic relief for you: there's nothing else to claim.";
    }
  }

  OF.persistForm(form, "pension");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
