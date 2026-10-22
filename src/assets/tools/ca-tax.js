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
  // Énumération dans la langue de la page (« A, B and C », « A, B et C ») ; repli pour les navigateurs anciens.
  var list = function (items) {
    return window.Intl && Intl.ListFormat ? new Intl.ListFormat(OF.locale, { type: "conjunction" }).format(items) : items.join(", ");
  };

  // Provinces et territoires, triés par nom dans la langue de la page.
  var codes = Object.keys(P).sort(function (a, b) { return P[a][L.names].localeCompare(P[b][L.names], OF.locale); });
  $("t-province").innerHTML = codes.map(function (c) {
    return '<option value="' + c + '"' + (c === L.default_province ? " selected" : "") + ">" + P[c][L.names] + "</option>";
  }).join("");

  /**
   * Acomptes provisionnels : condition de l'année en cours (moteur) et rappel de celle des deux années précédentes ;
   * au Québec, la part de l'ARC et celle de Revenu Québec, chacune seulement si son seuil est dépassé.
   */
  function instalmentText(r, inst) {
    var year = +inst.dueDates[0].slice(0, 4);
    var dates = fill(L.dates_year, { list: list(inst.dueDates.map(function (iso) { return OF.date(iso, L.day_month); })), year: year });
    var vars = { threshold: OF.money(inst.threshold, 0), y1: year - 1, y2: year - 2, dates: dates, amount: OF.money(inst.federal, 0) };
    if (!inst.required) return fill(L.inst_not, vars);
    if (!r.quebec) return fill(L.inst_required, vars);
    var parts = [];
    if (inst.requiredFederal) parts.push(fill(L.inst_part_cra, { amount: OF.money(inst.federal, 0) }));
    if (inst.requiredQuebec) parts.push(fill(L.inst_part_rq, { amount: OF.money(inst.quebec, 0) }));
    vars.parts = list(parts);
    return fill(L.inst_required_qc, vars);
  }

  /**
   * Jauges des seuils (documentation/21-jauges-de-seuils.md) : petit fournisseur sur les ventes saisies, acomptes sur
   * l'impôt calculé (au Québec, le plus élevé des deux impôts, chacun comparé au même seuil).
   */
  function thresholds(r, inst) {
    var sales = OF.num($("t-revenue").value), has = isFinite(sales) && sales > 0;
    var limit = R.small_supplier_threshold, qc = r.quebec ? "_qc" : "";
    set("g-gst-label", L["gst_label" + qc]);
    set("g-inst-label", L["inst_label" + qc]);
    OF.gauge("g-gst", has ? sales : NaN, limit);
    OF.gauge("g-inst", inst.measure, inst.threshold);
    var vars = { threshold: OF.money(limit, 0) };
    var text = !has ? L.gst_empty : sales > limit ? fill(L["gst_over" + qc], vars)
      : sales > limit * OF.gaugeNear ? fill(L.gst_near, vars) : fill(L["gst_under" + qc], vars);
    $("g-notice").textContent = text;
    // Rouge au-delà du seuil, neutre à l'approche (comme la barre orange), vert en dessous.
    $("g-notice").className = "notice" + (!has ? "" : sales > limit ? " warn" : sales > limit * OF.gaugeNear ? "" : " ok");
  }

  function compute() {
    var r = OFE.taxCA.estimate({ profit: OF.num($("t-profit").value) || 0, province: $("t-province").value }, R, P);
    var name = P[r.province][L.names];
    var inst = OFE.taxCA.instalments(r, R);

    set("r-total", OF.money(r.total, 0));
    set("r-sub", r.profit > 0 ? fill(L.sub, { rate: pct(r.effectiveRate), aside: pct(OF.ceilShare(r.effectiveRate)) }) : L.sub_empty);
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

    $("r-inst").textContent = instalmentText(r, inst);
    thresholds(r, inst);

    var S = L.steps;
    var steps = [
      [S.profit, r.profit],
      [r.quebec ? S.pension_deduction_qc : S.pension_deduction, -r.pensions.deduction]
    ];
    if (r.qpipDeduction > 0) steps.push([S.qpip_deduction, -r.qpipDeduction]);
    steps.push(
      [S.net_income, r.netIncome],
      [S.federal_brackets, r.federalBrackets],
      [S.federal_credits, -r.federalCredits]
    );
    if (r.quebec) steps.push([S.abatement, -r.abatement]);
    steps.push([S.federal, r.federal]);
    if (r.workersDeduction > 0) steps.push([S.workers_qc, -r.workersDeduction], [S.taxable_qc, r.provincialTaxable]);
    steps.push([fill(S.provincial_brackets, { province: name }), r.provincialBrackets]);
    steps.push([r.quebec ? S.provincial_credits_qc : S.provincial_credits, -r.provincialCredits]);
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
