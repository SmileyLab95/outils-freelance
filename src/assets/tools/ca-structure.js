/*
 * Entreprise individuelle ou société par actions (Canada), bilingue : impôts et cotisations 2026 comparés (moteur
 * OFE.structureCA). Textes dans la page (<script type="application/json" id="structure-ca-data">). Spécification :
 * documentation/pays/ca.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("structure-form");
  var dataEl = document.getElementById("structure-ca-data");
  if (!form || !dataEl || !OFE || !OFE.structureCA || !R) return;
  var L = JSON.parse(dataEl.textContent);
  var P = R._meta.provinces;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var money = function (x) { return OF.money(x, 0); };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var SOLE = ["c-p-contrib", "c-p-tax", "c-p-receive"];
  var CORP = ["c-s-salary", "c-s-dividends", "c-s-contrib", "c-s-other", "c-s-corptax", "c-s-tax", "c-s-extra", "c-s-keep", "c-s-receive"];
  var blank = function (ids) { ids.forEach(function (id) { set(id, "–"); }); };
  var list = function (items) {
    return window.Intl && Intl.ListFormat ? new Intl.ListFormat(OF.locale, { type: "conjunction" }).format(items) : items.join(", ");
  };

  // Provinces et territoires, triés par nom dans la langue de la page.
  var codes = Object.keys(P).sort(function (a, b) { return P[a][L.names].localeCompare(P[b][L.names], OF.locale); });
  $("c-province").innerHTML = codes.map(function (c) {
    return '<option value="' + c + '"' + (c === L.default_province ? " selected" : "") + ">" + P[c][L.names] + "</option>";
  }).join("");

  // Montant saisi : nombre positif ; vide : null ; illisible : signalé, nommé et non compté.
  function amount(id, bad) {
    var raw = $(id).value.trim(), n = OF.num(raw), invalid = raw !== "" && !(isFinite(n) && n >= 0);
    $(id).setAttribute("aria-invalid", String(invalid));
    if (invalid) bad.push(L.fields[id]);
    return invalid || raw === "" ? null : n;
  }

  function verdict(d) {
    return Math.abs(d) < 1 ? L.about_same : fill(L.per_year, { amount: (d > 0 ? "+" : "−") + money(Math.abs(d)) });
  }

  function compute() {
    var bad = [], msgs = [], warn = false;
    var profit = amount("c-profit", bad), salary = amount("c-salary", bad), keep = amount("c-keep", bad), extra = amount("c-extra", bad);
    var code = $("c-province").value, quebec = code === "QC";
    $("c-hours-field").hidden = !quebec;
    var notice = $("c-notice");
    set("c-contrib-label", quebec ? L.contrib_qpp : L.contrib_cpp);
    // Une saisie illisible : aucun résultat plutôt qu'un résultat faux.
    if (bad.length) {
      blank(SOLE); blank(CORP);
      $("c-other-row").hidden = true;
      set("c-verdict", "–");
      set("c-sub", fill(L.check, { fields: list(bad) }));
      notice.textContent = fill(L.check_notice, { fields: list(bad) });
      notice.className = "notice warn";
      return;
    }
    // Sans bénéfice saisi, aucune comparaison (et pas un « à peu près pareil » trompeur).
    if (profit === null) {
      blank(SOLE); blank(CORP);
      $("c-other-row").hidden = true;
      set("c-verdict", "–");
      set("c-sub", L.enter_profit);
      notice.textContent = L.msg_always;
      notice.className = "notice";
      return;
    }
    var r = OFE.structureCA.compare({ province: code, profit: profit, salary: salary || 0, keep: keep || 0,
      extraCosts: extra || 0, hours5500: quebec && $("c-hours").checked }, R, P), p = r.sole, c = r.corp;
    set("c-p-contrib", money(p.contributions));
    set("c-p-tax", money(p.incomeTax));
    set("c-p-receive", money(p.takeHome));

    if (c.error) {
      blank(CORP);
      $("c-other-row").hidden = true;
      set("c-verdict", "–");
      set("c-sub", L.sub_error);
      msgs.push(c.error === "province_not_available" ? fill(L.msg_not_available, { where: (L.where && L.where[code]) || P[code][L.names], of: (L.of && L.of[code]) || P[code][L.names] })
        : c.error === "keep_too_high" ? fill(L.msg_keep_too_high, { amount: money(c.available) })
        : c.error === "above_business_limit" ? L.msg_above_limit : L.msg_salary_too_high);
      warn = true;
    } else {
      // FSS de l'employeur (Québec) ou impôt sur le salaire (T.N.-O.) : ligne à part, affichée seulement s'il y en a.
      var other = c.employer.fss + c.personal.payrollTax;
      $("c-other-row").hidden = !(other > 0);
      set("c-other-label", c.employer.fss > 0 ? L.other_fss : L.other_nwt);
      set("c-s-salary", money(c.salary));
      set("c-s-dividends", money(c.dividends));
      set("c-s-contrib", money(c.pensionContributions));
      set("c-s-other", money(other));
      set("c-s-corptax", money(c.corporateTax));
      set("c-s-tax", money(c.personalTax));
      set("c-s-extra", money(c.extraCosts));
      set("c-s-keep", money(c.keep));
      set("c-s-receive", money(c.receive));
      var d = r.difference, all = r.differenceAllOut, C = r.contributionsSaved, T = r.taxesAndCosts;
      var plan = quebec ? L.plan_qpp : L.plan_cpp;
      // Décomposition de l'écart « tout versé » : cotisations (RPC ou RRQ et RQAP) et impôts et frais.
      var parts = [];
      if (Math.abs(C) >= 1) parts.push(fill(C > 0 ? L.part_contrib_less : L.part_contrib_more, { amount: money(Math.abs(C)), contrib: plan.contrib, loss: plan.loss }));
      if (Math.abs(T) >= 1) parts.push(fill(T > 0 ? L.part_tax_less : L.part_tax_more, { amount: money(Math.abs(T)) }));
      var partsText = parts.length ? parts.join(L.and) : L.part_none;
      set("c-verdict", verdict(d));
      if (c.keep > 0) {
        set("c-sub", [fill(d >= 0 ? L.sub_keep_more : L.sub_keep_less, { amount: money(Math.abs(d)), keep: money(c.keep) }),
          r.deferred >= 1 ? fill(L.sub_deferred, { deferred: money(r.deferred) }) : "",
          Math.abs(all) < 1 ? fill(L.all_same, { parts: partsText })
            : fill(L.all_diff, { all: money(Math.abs(all)), more_less: all > 0 ? L.more : L.less, parts: partsText })
        ].filter(Boolean).join(" "));
      } else {
        set("c-sub", (Math.abs(d) < 1 ? L.sub_same : fill(d > 0 ? L.sub_more : L.sub_less, { amount: money(Math.abs(d)) })) +
          (parts.length ? " " + fill(L.breakdown, { parts: partsText }) : ""));
      }
      if (C >= 1) msgs.push(fill(c.salary > 0 ? L.msg_salary : L.msg_no_salary, { amount: money(C), contrib: plan.contrib, loss: plan.loss, no_salary_loss: plan.no_salary_loss }));
      else if (C <= -1) msgs.push(fill(L.msg_salary_more, { amount: money(-C), contrib: plan.contrib }));
      if (quebec && !$("c-hours").checked) msgs.push(L.msg_quebec_hours);
      if (quebec) msgs.push(L.msg_quebec_fss);
    }
    msgs.push(L.msg_always);
    notice.textContent = msgs.join(" ");
    notice.className = "notice" + (warn ? " warn" : "");
  }

  OF.persistForm(form, "structure");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
