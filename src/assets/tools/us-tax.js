/* US self-employment tax calculator: relie le formulaire au moteur OFE.taxUS (règles 2026 dans window.OF_RULES). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("us-tax-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var pct = function (x) { return OF.fmt(Math.round(x * 1000) / 10) + "%"; };
  var md = function (iso) { return OF.date(iso, { month: "short", day: "numeric", year: "numeric" }); };

  function compute() {
    var input = {
      profit: OF.num($("t-profit").value) || 0,
      status: $("t-status").value,
      wages: OF.num($("t-wages").value) || 0,
      stateRate: (OF.num($("t-state").value) || 0) / 100,
      sstb: $("t-sstb").checked
    };
    var r = OFE.taxUS.estimate(input, R);
    var withheld = OF.num($("t-withheld").value) || 0;

    set("r-total", OF.money(r.total, 0));
    set("r-sub", r.profit > 0
      ? "That's " + pct(r.effectiveRate) + " of your profit. Set aside about " + pct(OF.ceilShare(r.effectiveRate)) +
        " of every payment you receive."
      : "Enter your net profit for the year.");
    set("r-profit", OF.money(r.profit, 0));
    set("r-se", OF.money(r.se.total, 0));
    set("r-income-label", "Federal income tax (" + pct(r.marginalRate) + " bracket)");
    set("r-income", OF.money(r.incomeTax, 0));
    $("r-addmed-row").hidden = r.additionalMedicare <= 0;
    set("r-addmed", OF.money(r.additionalMedicare, 0));
    set("r-state", OF.money(r.state, 0));
    set("r-take", OF.money(r.takeHome, 0) + " · " + OF.money(r.takeHome / 12, 0) + "/mo");

    // Répartition du bénéfice.
    var parts = [
      { label: "Take-home", value: Math.max(0, r.takeHome), cls: "net" },
      { label: "SE tax", value: r.se.total, cls: "cotis" },
      { label: "Income tax", value: r.incomeTax + r.additionalMedicare, cls: "tax" },
      { label: "State", value: r.state, cls: "costs" }
    ].filter(function (p) { return p.value > 0; });
    var sum = parts.reduce(function (s, p) { return s + p.value; }, 0);
    $("r-bar").innerHTML = parts.map(function (p) {
      return '<span class="' + p.cls + '" style="width:' + (p.value / sum * 100) + '%"></span>';
    }).join("");
    $("r-legend").innerHTML = sum > 0 ? parts.map(function (p) {
      return '<li><i class="' + p.cls + '"></i>' + p.label + " <b>" + Math.round(p.value / sum * 100) + "%</b></li>";
    }).join("") : "";

    // Acomptes trimestriels (méthode simple : impôt fédéral de l'année ÷ 4).
    var q = OFE.taxUS.quarterly(r.federal, withheld, null, 0, r.status, R);
    $("r-quarterly").innerHTML = q.needed
      ? "About <b>" + OF.money(q.owed / 4, 0) + "</b> per quarter in federal tax, due " +
        new Intl.ListFormat(OF.locale, { type: "conjunction" }).format(q.dueDates.map(md)) + "." +
        (r.state > 0 ? " Your state may also require estimated payments." : "")
      : "You expect to owe less than " + OF.money(R.estimated_tax_threshold, 0) +
        " in federal tax after withholding: quarterly payments are generally not required.";

    // Détail du calcul.
    var steps = [
      ["Net earnings from self-employment (92.35%)", r.se.earnings],
      ["Social Security (12.4%, up to " + OF.money(R.social_security_wage_base_2026, 0) + ")", r.se.socialSecurity],
      ["Medicare (2.9%)", r.se.medicare],
      ["Deduction for half of SE tax", -r.se.deduction],
      ["Adjusted gross income", r.agi],
      ["Standard deduction", -r.standardDeduction],
      ["QBI deduction (Section 199A)", -r.qbiDeduction],
      ["Taxable income", r.taxable]
    ];
    r.brackets.forEach(function (b) {
      steps.push([pct(b.rate) + " on " + OF.money(b.base, 0), b.tax]);
    });
    steps.push(["Federal income tax", r.incomeTax]);
    $("r-steps").innerHTML = steps.map(function (s) {
      return "<li><span>" + s[0] + "</span><b>" + (s[1] < 0 ? "− " + OF.money(-s[1], 0) : OF.money(s[1], 0)) + "</b></li>";
    }).join("");
  }

  OF.persistForm(form, "tax");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
