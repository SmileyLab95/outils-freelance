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

  /**
   * Jauges des seuils (documentation/21-jauges-de-seuils.md), mesurées sur les données saisies ; montants des règles.
   * Le message des acomptes est déjà dans la carte « Quarterly estimated payments ».
   */
  function thresholds(r, q) {
    var m = OF.money, earnings = r.se.earnings + r.wages;
    var base = R.social_security_wage_base_2026, med = R.additional_medicare_tax_thresholds[r.status];
    var qbiStart = R.qbi_threshold_2026[r.status], qbiEnd = qbiStart + R.qbi_phase_in_range_2026[r.status];
    OF.gauge("g-est", q.owed, R.estimated_tax_threshold);
    OF.gauge("g-ss", earnings, base);
    OF.gauge("g-addmed", earnings, med);
    OF.gauge("g-qbi", r.taxableBeforeQbi, qbiStart);
    var msgs = [], warn = false, near = false;
    if (earnings > base) msgs.push("Over the " + m(base, 0) + " wage base, no more Social Security tax on the excess: only the " +
      pct(R.se_tax_medicare_rate) + " Medicare part continues.");
    if (earnings > med) { warn = true; msgs.push("Over " + m(med, 0) + " for your filing status, the " + pct(R.additional_medicare_tax_rate) +
      " Additional Medicare Tax applies to the excess (included above)."); }
    // Messages QBI seulement avec un bénéfice d'activité : sans lui, il n'y a pas de déduction à limiter.
    if (r.profit > 0 && r.taxableBeforeQbi > qbiStart) {
      warn = true;
      msgs.push($("t-sstb").checked
        ? "Over " + m(qbiStart, 0) + " of taxable income, the QBI deduction of a specified service business shrinks, and disappears at " + m(qbiEnd, 0) + "."
        : "Over " + m(qbiStart, 0) + " of taxable income, the QBI deduction is capped by the W-2 wages your business pays and its qualified property: with neither, it shrinks to the " +
          m(R.qbi_minimum_deduction.minimum_deduction, 0) + " minimum at " + m(qbiEnd, 0) + ".");
    } else if (r.profit > 0 && r.taxableBeforeQbi > qbiStart * OF.gaugeNear) {
      near = true;
      msgs.push("Getting close to the QBI threshold (" + m(qbiStart, 0) + " of taxable income): above it, the deduction starts to shrink for a specified service business or one without employees.");
    }
    if (!msgs.length) msgs.push("You're below the Social Security wage base, the Additional Medicare Tax threshold and the QBI limits.");
    $("g-notice").textContent = msgs.join(" ");
    // Rouge si un seuil coûte plus cher (Additional Medicare, QBI réduite), neutre à l'approche, vert sinon.
    $("g-notice").className = "notice" + (warn ? " warn" : near ? "" : " ok");
  }

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
    thresholds(r, q);

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
