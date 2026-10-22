/*
 * Salarié ou freelance ? (quatre pays, deux langues) : revenu disponible d'un salarié et chiffre d'affaires dont un
 * freelance a besoin pour garder le même revenu, avec le tarif équivalent (moteur OFE.employeeFreelance).
 * Textes dans la page (<script type="application/json" id="employee-freelance-data">) ; règles du pays dans
 * window.OF_RULES. Spécification : documentation/19-freelance-ou-salarie.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("ef-form");
  var dataEl = document.getElementById("employee-freelance-data");
  if (!form || !dataEl || !OFE || !OFE.employeeFreelance || !R) return;
  var L = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var list = function (items) {
    return window.Intl && Intl.ListFormat ? new Intl.ListFormat(OF.locale, { type: "conjunction" }).format(items) : items.join(", ");
  };
  var money = function (n) { return OF.money(n, 0); };
  var NUMBERS = { gross: "ef-gross", benefits: "ef-benefits", expenses: "ef-expenses", units: "ef-units", rate: "ef-rate" };
  var CELLS = ["gross", "contributions", "tax", "expenses", "available", "benefits", "total"];

  // Nombre saisi : vide → null ; illisible ou négatif → signalé, nommé et non compté.
  function amount(id, bad) {
    var raw = $(id).value.trim(), n = OF.num(raw), invalid = raw !== "" && !(isFinite(n) && n >= 0);
    $(id).setAttribute("aria-invalid", String(invalid));
    if (invalid) bad.push(L.fields[id]);
    return invalid || raw === "" ? null : n;
  }

  function blank(sub, msg, warn) {
    CELLS.forEach(function (c) { set("ef-e-" + c, "–"); set("ef-f-" + c, "–"); });
    $("ef-row-benefits").hidden = $("ef-row-total").hidden = true;
    set("ef-big", "–");
    set("ef-sub", sub);
    $("ef-notice").textContent = msg;
    $("ef-notice").className = "notice" + (warn ? " warn" : "");
  }

  function compute() {
    var bad = [], input = {};
    Object.keys(NUMBERS).forEach(function (k) { input[k] = amount(NUMBERS[k], bad); });
    if (bad.length) return blank(fill(L.check, { fields: list(bad) }), fill(L.check_notice, { fields: list(bad) }), true);
    // Champs propres au pays (activité, situation familiale, région, province) : attribut data-input.
    Array.prototype.forEach.call(form.querySelectorAll("[data-input]"), function (el) {
      input[el.name] = el.type === "checkbox" ? el.checked : el.value;
    });
    var r = OFE.employeeFreelance.compare(L.country, input, R);
    if (r.error) return blank(L.enter_salary, L.msg_always, false);
    if (r.revenue === null) return blank(L.not_found, L.msg_always, true);

    var e = r.employee, f = r.freelance, withBenefits = r.benefits > 0;
    // Montants retirés du brut ou du chiffre d'affaires : précédés du signe moins typographique.
    var cells = {
      e: { gross: e.gross, contributions: -e.contributions, tax: -e.incomeTax, expenses: null, available: e.available, benefits: r.benefits, total: r.target },
      f: { gross: f.revenue, contributions: -f.contributions, tax: -f.incomeTax, expenses: -f.expenses, available: f.available, benefits: null, total: f.available }
    };
    ["e", "f"].forEach(function (side) {
      CELLS.forEach(function (c) {
        var v = cells[side][c];
        set("ef-" + side + "-" + c, v === null ? "–" : (v <= -0.5 ? "−" : "") + money(Math.abs(v)));
      });
    });
    $("ef-row-benefits").hidden = $("ef-row-total").hidden = !withBenefits;
    set("ef-big", money(r.revenue));
    var vars = { rate: OF.money(r.rate, 2), units: OF.fmt(input.units || 0), target: money(r.target) };
    set("ef-sub", fill(r.rate === null ? L.sub_no_units : L.sub, vars));

    var msgs = [];
    if (r.atRate) {
      var diff = r.atRate.available - r.target;
      msgs.push(fill(Math.abs(diff) < 0.5 ? L.at_rate_same : diff > 0 ? L.at_rate_more : L.at_rate_less, {
        rate: OF.money(input.rate, 2), units: OF.fmt(input.units), revenue: money(r.atRate.revenue),
        available: money(r.atRate.available), diff: money(Math.abs(diff))
      }));
    } else if (input.rate > 0) msgs.push(L.enter_units);
    if (f.overCeiling) msgs.push(fill(L.over_ceiling, { ceiling: money(f.ceiling) }));
    else if (r.atRate && r.atRate.overCeiling) msgs.push(fill(L.at_rate_over_ceiling, { ceiling: money(r.atRate.ceiling) }));
    else if (f.vatThreshold && f.revenue > f.vatThreshold) {
      msgs.push(fill(L.over_vat, { threshold: money(f.vatThreshold), major: money(f.vatThresholdMajor || f.vatThreshold) }));
    }
    msgs.push(L.msg_always);
    $("ef-notice").textContent = msgs.join(" ");
    $("ef-notice").className = "notice" + (f.overCeiling ? " warn" : "");
  }

  OF.persistForm(form, "employee-freelance");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
