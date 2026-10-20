/* Sole trader vs limited company : revenu net comparé (moteur OFE.taxUK). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("uk-structure-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var m = function (n) { return OF.money(n, 0); };

  function compute() {
    var mode = $("s-salary-mode").value;
    form.querySelectorAll("[data-salary]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-salary") === mode));
    });
    $("s-salary-field").hidden = mode !== "custom";
    var profit = Math.max(0, OF.num($("s-profit").value) || 0);
    var region = $("s-region").value;
    var salary = mode === "custom" ? Math.max(0, OF.num($("s-salary").value) || 0) : Number(mode);
    var costs = Math.max(0, OF.num($("s-costs").value) || 0);

    var sole = OFE.taxUK.soleTrader({ profit: profit, region: region }, R);
    var ltd = OFE.taxUK.limitedCompany({ profit: profit, salary: salary, region: region, costs: costs }, R);

    set("c-s-it", m(sole.incomeTax));
    set("c-s-ni", m(sole.class4));
    set("c-s-take", m(sole.takeHome));
    set("c-l-salary", m(ltd.salary));
    set("c-l-ni", m(ltd.employerNI + ltd.employeeNI));
    set("c-l-ct", m(ltd.corporationTax));
    set("c-l-div", m(ltd.dividends));
    set("c-l-tax", m(ltd.salaryTax + ltd.dividendTax));
    set("c-l-costs", m(ltd.costs));
    set("c-l-take", m(ltd.takeHome));

    var diff = ltd.takeHome - sole.takeHome;
    var ltdWins = diff > 0;
    $("c-sole").classList.toggle("is-best", !ltdWins && profit > 0);
    $("c-ltd").classList.toggle("is-best", ltdWins && profit > 0);
    set("c-winner-label", profit > 0 ? (ltdWins ? "Limited company" : "Sole trader") + " leaves you more" : "Best option");
    set("c-winner", profit > 0 ? "+" + m(Math.abs(diff)) + " a year" : "–");
    set("c-sub", profit <= 0 ? "Enter your expected profit."
      : Math.abs(diff) < 1000 ? "The difference is small: simplicity may matter more than tax. A company also means more admin."
      : ltdWins ? "About " + m(diff / 12) + " a month more through a company, after its extra costs."
      : "Staying a sole trader saves you " + m(-diff) + " a year, and the admin of running a company.");
  }

  form.addEventListener("click", function (event) {
    var button = event.target.closest("[data-salary]");
    if (!button) return;
    $("s-salary-mode").value = button.getAttribute("data-salary");
    form.dispatchEvent(new Event("input"));
  });

  OF.persistForm(form, "structure");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
