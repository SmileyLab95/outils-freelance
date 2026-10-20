/*
 * Calculateur d'impôt du travailleur autonome canadien (moteur OFE.taxCA), bilingue :
 * les libellés viennent de la page (<script type="application/json" id="ca-tax-data">).
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("ca-tax-form");
  var dataEl = document.getElementById("ca-tax-data");
  if (!form || !OFE || !R || !dataEl) return;
  var L = JSON.parse(dataEl.textContent);
  var P = R._meta.provinces;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var pct = function (x) { return OF.fmt(Math.round(x * 1000) / 10) + L.percent; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var md = function (iso) { return OF.date(iso, L.date_format); };
  var list = function (items) { return new Intl.ListFormat(OF.locale, { type: "conjunction" }).format(items); };

  // Provinces et territoires, triés par nom dans la langue de la page.
  var codes = Object.keys(P).sort(function (a, b) { return P[a][L.names].localeCompare(P[b][L.names], OF.locale); });
  $("t-province").innerHTML = codes.map(function (c) {
    return '<option value="' + c + '"' + (c === L.default_province ? " selected" : "") + ">" + P[c][L.names] + "</option>";
  }).join("");

  function compute() {
    var r = OFE.taxCA.estimate({ profit: OF.num($("t-profit").value) || 0, province: $("t-province").value }, R, P);
    var name = P[r.province][L.names];
    var inst = OFE.taxCA.instalments(r, R);

    set("r-total", OF.money(r.total, 0));
    set("r-sub", r.profit > 0 ? fill(L.sub, { rate: pct(r.effectiveRate), aside: pct(Math.ceil(r.effectiveRate * 100) / 100) }) : L.sub_empty);
    set("r-profit", OF.money(r.profit, 0));
    set("r-pension-label", r.quebec ? L.pension_qpp : L.pension_cpp);
    set("r-pension", OF.money(r.pensions.total, 0));
    $("r-qpip-row").hidden = !r.quebec;
    set("r-qpip", OF.money(r.qpip, 0));
    set("r-federal-label", r.quebec ? L.federal_qc : L.federal);
    set("r-federal", OF.money(r.federal, 0));
    set("r-provincial-label", fill(L.provincial, { province: name }));
    set("r-provincial", OF.money(r.provincial, 0));
    set("r-take", OF.money(r.takeHome, 0) + " · " + OF.money(r.takeHome / 12, 0) + L.per_month);

    var parts = [
      { label: L.bar.net, value: Math.max(0, r.takeHome), cls: "net" },
      { label: r.quebec ? L.bar.pension_qc : L.bar.pension, value: r.pensions.total + r.qpip, cls: "cotis" },
      { label: L.bar.tax, value: r.incomeTax, cls: "tax" }
    ].filter(function (p) { return p.value > 0; });
    var sum = parts.reduce(function (s, p) { return s + p.value; }, 0);
    $("r-bar").innerHTML = parts.map(function (p) {
      return '<span class="' + p.cls + '" style="width:' + (p.value / sum * 100) + '%"></span>';
    }).join("");
    $("r-legend").innerHTML = sum > 0 ? parts.map(function (p) {
      return '<li><i class="' + p.cls + '"></i>' + p.label + " <b>" + Math.round(p.value / sum * 100) + L.percent + "</b></li>";
    }).join("") : "";

    var dates = list(inst.dueDates.map(md));
    $("r-inst").textContent = !inst.required ? fill(L.inst_not, { threshold: OF.money(inst.threshold, 0) })
      : r.quebec ? fill(L.inst_required_qc, { federal: OF.money(inst.federal, 0), quebec: OF.money(inst.quebec, 0), dates: dates })
      : fill(L.inst_required, { amount: OF.money(inst.federal, 0), dates: dates });

    var S = L.steps;
    var steps = [
      [S.profit, r.profit],
      [r.quebec ? S.pension_deduction_qc : S.pension_deduction, -r.pensions.deduction],
      [S.net_income, r.netIncome],
      [S.federal_brackets, r.federalBrackets],
      [S.federal_credits, -r.federalCredits]
    ];
    if (r.quebec) steps.push([S.abatement, -r.abatement]);
    steps.push([S.federal, r.federal]);
    steps.push([fill(S.provincial_brackets, { province: name }), r.provincialBrackets]);
    steps.push([S.provincial_credits, -r.provincialCredits]);
    if (r.surtax > 0) steps.push([S.surtax, r.surtax]);
    if (r.healthPremium > 0) steps.push([S.health, r.healthPremium]);
    steps.push([fill(S.provincial, { province: name }), r.provincial]);
    $("r-steps").innerHTML = steps.map(function (s) {
      return "<li><span>" + s[0] + "</span><b>" + (s[1] < 0 ? "− " + OF.money(-s[1], 0) : OF.money(s[1], 0)) + "</b></li>";
    }).join("");
  }

  OF.persistForm(form, "tax");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
