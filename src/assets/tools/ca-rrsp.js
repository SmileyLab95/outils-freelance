/* REER du travailleur autonome (bilingue) : droits de cotisation 2026, remboursement d'impôt, coût réel (moteur OFE.taxCA). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("rrsp-form");
  var dataEl = document.getElementById("rrsp-data");
  if (!form || !OFE || !R || !dataEl) return;
  var L = JSON.parse(dataEl.textContent);
  var P = R._meta.provinces, Q = R.rrsp_limits_2026;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var pct = function (x) { return OF.fmt(Math.round(x * 1000) / 10) + L.percent; };

  var codes = Object.keys(P).sort(function (a, b) { return P[a][L.names].localeCompare(P[b][L.names], OF.locale); });
  $("v-province").innerHTML = codes.map(function (c) {
    return '<option value="' + c + '"' + (c === L.default_province ? " selected" : "") + ">" + P[c][L.names] + "</option>";
  }).join("");

  function compute() {
    var province = $("v-province").value;
    var profit = Math.max(0, OF.num($("v-income").value) || 0);
    var lastYear = $("v-last").value.trim() === "" ? profit : Math.max(0, OF.num($("v-last").value) || 0);
    var unused = Math.max(0, OF.num($("v-unused").value) || 0);
    var amount = Math.max(0, OF.num($("v-amount").value) || 0);
    var room = Math.min(Q.rate * lastYear, Q.dollar_limit) + unused;
    var deducted = Math.min(amount, room);
    var base = OFE.taxCA.estimate({ profit: profit, province: province }, R, P);
    var after = OFE.taxCA.estimate({ profit: profit, province: province, deduction: deducted }, R, P);
    var refund = base.total - after.total;
    var marginal = deducted > 0 ? refund / deducted : 0;
    set("v-refund", OF.money(refund, 0));
    set("v-sub", amount > 0 ? fill(L.sub, { amount: OF.money(amount, 0), cost: OF.money(amount - refund, 0) }) : L.sub_empty);
    set("v-room", OF.money(room, 0));
    set("v-deducted", OF.money(deducted, 0));
    set("v-rate", deducted > 0 ? pct(marginal) : "–");
    set("v-deadline", OF.date(Q.deadline, L.date_format));
    var notice = $("v-notice");
    if (amount > room) {
      notice.className = "notice warn";
      notice.textContent = fill(L.over, { room: OF.money(room, 0) });
    } else {
      notice.className = "notice";
      notice.textContent = L.info;
    }
  }

  OF.persistForm(form, "rrsp");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
