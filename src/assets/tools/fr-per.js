/* Simulateur PER de l'indépendant : plafond de déduction, économie d'impôt et effort réel (moteur OFE.perFR). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("per-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var e = function (n) { return OF.eur(n, 0); };
  var pct = function (x) { return OF.fmt(Math.round(x * 100)) + " %"; };

  function compute() {
    var regime = $("p-regime").value, micro = regime === "micro";
    $("p-activity-field").hidden = !micro;
    $("p-vl-field").hidden = !micro;
    set("p-revenue-label", micro ? "Chiffre d'affaires annuel" : "Bénéfice annuel (après cotisations)");
    var input = {
      regime: regime, activity: $("p-activity").value,
      revenue: Math.max(0, OF.num($("p-revenue").value) || 0),
      otherIncome: Math.max(0, OF.num($("p-other").value) || 0),
      parts: Number($("p-parts").value), contribution: Math.max(0, OF.num($("p-amount").value) || 0)
    };
    var r = OFE.perFR.simulate(input, R);
    var vl = micro && $("p-vl").checked;
    set("p-saving", vl ? "0 €" : e(r.saving));
    set("p-sub", vl
      ? "Avec le versement libératoire, votre activité n'entre pas dans le revenu imposable : un PER ne réduit votre impôt que sur vos autres revenus."
      : input.contribution > 0 ? "d'impôt en moins pour " + e(input.contribution) + " versés : un effort réel de " + e(r.cost) + "." : "Indiquez le montant que vous envisagez de verser.");
    set("p-ceiling", e(r.ceiling));
    set("p-ceiling-label", micro ? "Plafond de déduction (plafond général)" : "Plafond de déduction (plafond TNS)");
    set("p-deducted", e(r.deducted));
    set("p-tmi", pct(r.marginal));
    set("p-taxable", e(r.taxable));
    set("p-before", e(r.taxBefore));
    set("p-after", e(r.taxAfter));
    var notice = $("p-notice");
    if (input.contribution > r.ceiling) {
      notice.className = "notice warn";
      notice.textContent = "Votre versement dépasse votre plafond estimé : seuls " + e(r.ceiling) + " sont déductibles cette année, sauf plafonds non utilisés des années précédentes (indiqués sur votre avis d'impôt).";
    } else if (r.marginal <= 0.11) {
      notice.className = "notice";
      notice.textContent = "À " + pct(r.marginal) + " d'imposition marginale, l'avantage fiscal est faible : l'argent sera imposé à la sortie, souvent au même taux. Le PER est surtout intéressant à partir de 30 %.";
    } else {
      notice.className = "notice ok";
      notice.textContent = "Chaque euro versé vous fait économiser environ " + pct(r.marginal) + " d'impôt cette année. À la sortie, le capital correspondant aux versements déduits sera imposé.";
    }
  }

  OF.persistForm(form, "per");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
