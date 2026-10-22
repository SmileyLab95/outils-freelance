/*
 * Convertisseur de tarifs (quatre pays, deux langues) : heure, jour, semaine, mois, an (moteur OFE.rateConvert).
 * Textes, hypothèses par défaut et seuils signalés dans la page (<script type="application/json"
 * id="rate-converter-data">) ; les montants des seuils viennent des règles du pays (window.OF_RULES).
 * Spécification : documentation/18-outils-de-prix.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("rc-form");
  var dataEl = document.getElementById("rate-converter-data");
  if (!form || !dataEl || !OFE || !OFE.rateConvert || !R) return;
  var L = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var list = function (items) {
    return window.Intl && Intl.ListFormat ? new Intl.ListFormat(OF.locale, { type: "conjunction" }).format(items) : items.join(", ");
  };
  // Valeur d'une règle, éventuellement dans un objet (« tva_franchise_seuils.services_seuil »).
  var rule = function (path) { return path.split(".").reduce(function (v, k) { return v == null ? v : v[k]; }, R); };
  var ROWS = { hour: "rc-hour", day: "rc-day", week: "rc-week", month: "rc-month", year: "rc-year" };

  // Nombre saisi : vide → null ; illisible ou négatif → signalé, nommé et non compté.
  function amount(id, bad) {
    var raw = $(id).value.trim(), n = OF.num(raw), invalid = raw !== "" && !(isFinite(n) && n >= 0);
    $(id).setAttribute("aria-invalid", String(invalid));
    if (invalid) bad.push(L.fields[id]);
    return invalid || raw === "" ? null : n;
  }

  function blank() {
    Object.keys(ROWS).forEach(function (u) { set(ROWS[u], "–"); $(ROWS[u]).parentNode.classList.remove("current"); });
    set("rc-big", "–");
  }

  function compute() {
    var bad = [];
    var value = amount("rc-amount", bad), hours = amount("rc-hours", bad), days = amount("rc-days", bad);
    var unit = $("rc-unit").value, notice = $("rc-notice");
    if (bad.length) {
      blank();
      set("rc-sub", fill(L.check, { fields: list(bad) }));
      notice.textContent = fill(L.check_notice, { fields: list(bad) });
      notice.className = "notice warn";
      return;
    }
    if (value === null) {
      blank();
      set("rc-sub", L.enter_amount);
      notice.textContent = L.msg_always;
      notice.className = "notice";
      return;
    }
    var r = OFE.rateConvert.convert({ amount: value, unit: unit, hoursPerDay: hours, daysPerYear: days });
    if (r.error) {
      blank();
      set("rc-sub", L.check_assumptions);
      notice.textContent = L.check_assumptions;
      notice.className = "notice warn";
      [["rc-hours", hours, 24], ["rc-days", days, 366]].forEach(function (f) {
        $(f[0]).setAttribute("aria-invalid", String(!(f[1] > 0 && f[1] <= f[2])));
      });
      return;
    }
    Object.keys(ROWS).forEach(function (u) {
      set(ROWS[u], OF.money(r[u], u === "hour" || u === "day" ? 2 : 0));
      $(ROWS[u]).parentNode.classList.toggle("current", u === unit);
    });
    set("rc-big", OF.money(r.year, 0));
    set("rc-sub", fill(L.sub, { month: OF.money(r.month, 0), days: OF.fmt(days), hours: OF.fmt(hours), total: OF.fmt(Math.round(r.hoursPerYear)) }));
    // Seuils du pays dépassés par le chiffre d'affaires annuel (montants lus dans les règles).
    var msgs = (L.thresholds || []).filter(function (t) { return r.year > rule(t.rule); }).map(function (t) {
      var vars = { threshold: OF.money(rule(t.rule), 0) };
      Object.keys(t.vars || {}).forEach(function (k) { vars[k] = OF.money(rule(t.vars[k]), 0); });
      return fill(t.text, vars);
    });
    msgs.push(L.msg_always);
    notice.textContent = msgs.join(" ");
    notice.className = "notice";
  }

  OF.persistForm(form, "rate-converter");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
