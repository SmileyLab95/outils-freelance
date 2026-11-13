/*
 * Assurance-emploi du travailleur autonome (Canada) : prestations spéciales de l'AE (adhésion volontaire) et, au
 * Québec, RQAP pour la maternité, la paternité et les prestations parentales. Moteur OFE.benefitsCA ; chiffres lus dans
 * les règles ; textes de la page (<script type="application/json" id="benefits-data">), en anglais ou en français.
 * Spécification : documentation/56-protection-sociale-canada.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("ben-form"), dataEl = document.getElementById("benefits-data");
  if (!form || !dataEl || !OFE || !OFE.benefitsCA || !R || !R.ei_self_employed_special_benefits) return;
  var B = OFE.benefitsCA, L = JSON.parse(dataEl.textContent), FRENCH = OF.locale.slice(0, 2) === "fr";
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var pct = function (r) { return OF.rate(Math.round(r * 100000) / 1000) + (FRENCH ? " %" : "%"); };
  var money = function (n) { return OF.money(n, Math.round(n) === n ? 0 : undefined); };
  var MARK = { ok: ["is-ok", "✓ "], check: ["is-check", "? "], no: ["is-todo", "✗ "] };
  var QPIP_KINDS = ["maternity", "paternity", "parental"];

  function compute() {
    var quebec = $("ben-province").value === "qc", select = $("ben-situation"), situation = select.value;
    // Paternité : prestation du RQAP seulement ; ailleurs, l'autre parent prend des prestations parentales.
    var paternity = select.querySelector('option[value="paternity"]');
    paternity.hidden = paternity.disabled = !quebec;
    if (!quebec && situation === "paternity") select.value = situation = "parental";
    var qpip = quebec && QPIP_KINDS.indexOf(situation) >= 0;
    $("ben-registration-field").hidden = qpip;
    $("ben-ei-parental-field").hidden = qpip || situation !== "parental";
    $("ben-qpip-option-field").hidden = !qpip;
    var earnings = OF.num($("ben-earnings").value), list = $("ben-checks");
    var kind = !qpip && situation === "parental" && $("ben-ei-parental").value === "extended" ? "parental_extended" : situation;
    var r = qpip ? B.qpip(R, { kind: situation, option: $("ben-qpip-option").value, earnings: earnings })
      : B.ei(R, { kind: kind, registration: $("ben-registration").value, earnings: earnings, quebec: quebec });
    list.textContent = "";
    set("ben-label", L.labels[(qpip ? "qpip_" : "ei_") + situation]);
    if (r.error) {
      set("ben-big", "–");
      set("ben-sub", L.error);
      $("ben-step").hidden = $("ben-notice").hidden = true;
      return;
    }
    var texts = L.conditions[r.plan], vars = { min: money(R.ei_self_employed_special_benefits.minimum_earnings_base),
      months: R.ei_self_employed_special_benefits.agreement_months, qpip_min: money(R.qpip_self_employed_benefits.minimum_insurable_income) };
    r.conditions.forEach(function (c) {
      var li = document.createElement("li"), mark = MARK[c.status], t = texts[c.key];
      var text = c.key === "registration" && c.status === "no" ? t["no_" + $("ben-registration").value] : t[c.status];
      li.className = mark[0];
      li.textContent = mark[1] + fill(text, vars);
      list.appendChild(li);
    });
    var base = Math.min(earnings, r.plan === "qpip" ? R.qpip_max_insurable_earnings : R.ei_max_insurable_earnings);
    if (r.outcome === "no") {
      var missing = r.conditions.filter(function (c) { return c.status === "no"; }).length;
      set("ben-big", L.not_eligible);
      set("ben-sub", fill(L.missing[missing === 1 ? 0 : 1], { n: missing }));
    } else if (r.plan === "ei") {
      set("ben-big", fill(L.weekly, { amount: money(r.weekly) }));
      set("ben-sub", fill(L.ei_sub, { weeks: r.weeks, total: money(r.total), pct: pct(r.rate), base: money(base),
        cap: r.capped ? fill(L.capped, { max: money(R.ei_max_insurable_earnings) }) : "" }));
    } else {
      set("ben-big", fill(L.weekly, { amount: r.phases.map(function (p) { return money(p.weekly); }).join(L.then) }));
      set("ben-sub", fill(L.qpip_sub, { phases: r.phases.map(function (p) { return fill(L.phase, { weeks: p.weeks, pct: pct(p.rate) }); }).join(L.phase_sep),
        total: money(r.total), average: money(r.average), cap: r.capped ? fill(L.capped, { max: money(R.qpip_max_insurable_earnings) }) : "" }));
    }
    // Ensuite : la demande, l'adhésion à faire, ou le minimum de revenu non atteint (l'année précédente compte).
    var step = r.plan === "qpip" ? (r.outcome === "no" ? L.step_qpip_low : L.step_qpip)
      : $("ben-registration").value !== "12_months" ? L.step_ei_register : r.outcome === "no" ? L.step_ei_low : L.step_ei;
    $("ben-step").hidden = false;
    $("ben-step").className = "notice" + (r.outcome === "no" ? "" : " ok");
    set("ben-step", fill(step, vars));
    $("ben-notice").hidden = false;
    set("ben-notice", fill(r.plan === "qpip" ? L.premium_qpip : L.premium_ei + (quebec ? L.premium_ei_qc : ""),
      { rate: pct(r.premiumRate), amount: money(r.premium), earnings: money(Math.max(earnings, 0)) }));
  }

  OF.persistForm(form, L.store);
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
