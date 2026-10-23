/* Augmenter ses tarifs : relie le formulaire au moteur OFE.priceIncrease ; textes dans la page (#pi-data). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE;
  var form = document.getElementById("pi-form"), data = document.getElementById("pi-data");
  if (!form || !data || !OFE || !OFE.priceIncrease) return;
  var L = JSON.parse(data.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var pct = function (x) { return OF.fmt(Math.round(Math.abs(x) * 1000) / 10) + L.percent; };   // « 9.1% » ou « 9,1 % »
  var signed = function (x) { return (x < 0 ? "−" : "+") + OF.money(Math.abs(x)); };
  var value = function (id) { var v = $(id).value.trim(); return v === "" ? "" : OF.num(v); };

  function compute() {
    var unit = $("pi-unit").value, mode = $("pi-mode").value;
    $("pi-increase-field").hidden = mode !== "percent";
    $("pi-new-rate-field").hidden = mode !== "rate";
    set("pi-volume-label", L.volume_label[unit]);
    var r = OFE.priceIncrease.compute({ rate: value("pi-rate"), mode: mode, increase: value("pi-increase"), newRate: value("pi-new-rate"),
                                        volume: value("pi-volume"), loss: value("pi-loss"), inflation: value("pi-inflation") });
    $("pi-results").hidden = !r.valid;
    if (!r.valid) { set("pi-big", "–"); set("pi-sub", L.invalid); return; }
    set("pi-big", OF.money(r.newRate) + " " + L.per[unit]);
    var step = Math.abs(r.increase) < 1e-9 ? "same" : r.increase > 0 ? "up" : "down";
    set("pi-sub", fill(L.sub[step], { pct: pct(r.increase) }));
    set("pi-before", OF.money(r.before));
    set("pi-after", OF.money(r.after));
    set("pi-change", signed(r.change) + (r.before > 0 ? " (" + (r.changeShare < 0 ? "−" : "+") + pct(r.changeShare) + ")" : ""));
    set("pi-breakeven", r.breakEvenLoss === null ? L.breakeven.none : fill(L.breakeven.up, { pct: pct(r.breakEvenLoss), unit: L.units[unit] }));
    var inflation = r.inflationRate !== null;
    $("pi-inflation-rate-row").hidden = !inflation;
    $("pi-real-row").hidden = !inflation;
    if (inflation) {
      set("pi-inflation-rate", OF.money(r.inflationRate) + " " + L.per[unit]);
      set("pi-real", (r.realIncrease < 0 ? "−" : "+") + pct(r.realIncrease));
    }
  }

  OF.persistForm(form, "price-increase");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
