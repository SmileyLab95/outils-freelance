/* Comparateur de statuts (France) : relie le formulaire au moteur OFE.statutsFR. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("statuts-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var e = function (n) { return OF.eur(n, 0); };
  var NAMES = { micro: "Micro-entreprise", real: "Entreprise au réel", sasu: "SASU" };

  function compute() {
    var input = {
      activity: $("c-activity").value,
      revenue: Math.max(0, OF.num($("c-revenue").value) || 0),
      expenses: Math.max(0, OF.num($("c-expenses").value) || 0),
      tnsRate: Math.max(0, OF.num($("c-tns").value) || 0) / 100,
      salaryShare: Math.min(100, Math.max(0, OF.num($("c-share").value) || 0)) / 100,
      sasuCoef: Math.max(1, OF.num($("c-coef").value) || 1.82),
      companyCosts: Math.max(0, OF.num($("c-company").value) || 0)
    };
    var m = OFE.statutsFR.micro(input, R);
    var r = OFE.statutsFR.realRegime(input, R);
    var s = OFE.statutsFR.sasu(input, R);

    set("c-m-social", e(m.social)); set("c-m-tax", e(m.tax)); set("c-m-net", e(m.available));
    set("c-r-social", e(r.social)); set("c-r-tax", e(r.tax)); set("c-r-net", e(r.available));
    set("c-s-social", e(s.social)); set("c-s-tax", e(s.tax)); set("c-s-net", e(s.available));

    var options = [{ key: "real", value: r.available }, { key: "sasu", value: s.available }];
    if (!m.overCeiling) options.push({ key: "micro", value: m.available });
    options.sort(function (a, b) { return b.value - a.value; });
    var best = options[0], second = options[1];
    ["micro", "real", "sasu"].forEach(function (k) { $("c-" + k).classList.toggle("is-best", k === best.key && input.revenue > 0); });
    $("c-micro").classList.toggle("is-out", m.overCeiling);
    set("c-best-label", input.revenue > 0 ? "Le plus avantageux : " + NAMES[best.key] : "Le plus avantageux");
    set("c-best", input.revenue > 0 ? e(best.value) + " par an" : "–");
    set("c-sub", input.revenue > 0 ? "Soit " + e(best.value / 12) + " par mois, " + e(best.value - second.value) +
      " de plus par an que « " + NAMES[second.key] + " »." : "Indiquez votre chiffre d'affaires.");

    var notice = $("c-notice");
    if (m.overCeiling) {
      notice.className = "notice warn";
      notice.textContent = "Au-delà de " + e(m.ceiling) + " de chiffre d'affaires, la micro-entreprise n'est plus possible (après deux années de dépassement).";
    } else if (input.salaryShare === 0) {
      notice.className = "notice warn";
      notice.textContent = "Sans salaire, le président de SASU ne cotise pas pour sa retraite et n'a pas d'indemnités journalières en cas d'arrêt.";
    } else {
      notice.className = "notice";
      notice.textContent = "Estimation pour une part de quotient familial. Les cotisations du régime réel et de la SASU sont calculées avec les taux moyens des hypothèses.";
    }
  }

  OF.persistForm(form, "statuts");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
