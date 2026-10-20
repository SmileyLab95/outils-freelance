/*
 * Calculateur de frais de retard contractuels (intérêts mensuels ou annuels, au jour ou par mois commencé, ou forfait),
 * indépendant de la langue : textes et clause à copier viennent de la page (<script type="application/json" id="latefee-data">).
 */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("late-form");
  var dataEl = document.getElementById("latefee-data");
  if (!form || !dataEl) return;
  var L = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var long = function (iso) { return OF.date(iso, L.date_format); };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var plural = function (n, one, many) { return n + " " + (n === 1 ? one : many); };

  function compute() {
    var method = $("l-method").value;
    form.querySelectorAll("[data-method]").forEach(function (el) {
      el.hidden = el.getAttribute("data-method").split(" ").indexOf(method) < 0;
    });
    var amount = OF.num($("l-amount").value) || 0;
    var due = $("l-due").value;
    var paid = $("l-paid").value || OF.today();
    var grace = Math.max(0, parseInt($("l-grace").value, 10) || 0);
    var late = due ? Math.max(0, OF.daysBetween(due, paid)) : NaN;
    var counted = Math.max(0, late - grace);
    var monthly = method === "annual" ? (OF.num($("l-annual").value) || 0) / 12 : OF.num($("l-monthly").value) || 0;
    var daily = $("l-accrual").value === "daily";
    var months = Math.ceil(counted / 30);
    var flat = OF.num($("l-flat").value) || 0;
    var vars = {
      fee: OF.money(flat), grace: String(grace), monthly: OF.fmt(monthly), annual: OF.fmt(monthly * 12),
      accrual: daily ? L.accrual_daily : L.accrual_month, start: grace ? fill(L.start_grace, { grace: String(grace) }) : "",
      amount: OF.money(amount), days: String(counted), months: plural(months, L.month, L.months)
    };
    var fee, formula, clause;
    if (method === "flat") {
      fee = counted > 0 ? flat : 0;
      formula = fill(L.formula_flat, vars);
      clause = fill(L.clause_flat, vars);
    } else {
      fee = daily ? amount * monthly * 12 / 100 * counted / 365 : amount * monthly / 100 * months;
      vars.result = OF.money(fee);
      formula = fill(daily ? L.formula_daily : L.formula_month, vars);
      clause = fill(L.clause_interest, vars);
    }

    set("l-r-amount", OF.money(amount));
    set("l-r-days", isFinite(late) ? plural(late, L.day, L.days) + (grace && late ? fill(L.after_grace, { n: String(counted) }) : "") : "–");
    set("l-r-fee", OF.money(fee));
    set("l-r-total", OF.money(amount + (fee || 0)));
    set("l-fee", isFinite(fee) ? OF.money(fee) : "–");
    set("l-sub", !due ? L.sub_no_due
      : late === 0 ? fill(L.sub_not_late, { date: long(paid) })
      : fill(L.sub_late, { due: long(due), days: String(late), date: long(paid), total: OF.money(amount + fee) }));
    set("l-formula", isFinite(fee) && counted > 0 ? formula : L.formula_generic);
    $("l-clause").innerHTML = OF.highlight(clause);
  }

  OF.persistForm(form, "latefee");
  if (!$("l-due").value) $("l-due").value = OF.addDays(OF.today(), -45);
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
