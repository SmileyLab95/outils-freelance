/* Date d'échéance d'une facture : délais en jours, fin de mois (deux méthodes) et maximum légal (art. L441-10). */
(function () {
  "use strict";
  var OF = window.OF, R = window.OF_RULES;
  var form = document.getElementById("echeance-form");
  if (!form || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var long = function (iso) { return OF.date(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
  var D = R.retard_paiement_delais;

  /** Dernier jour du mois d'une date ISO. */
  function endOfMonth(iso) {
    var d = OF.parseDate(iso);
    var last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return last.getFullYear() + "-" + String(last.getMonth() + 1).padStart(2, "0") + "-" + String(last.getDate()).padStart(2, "0");
  }

  function dueDate(date, terms) {
    if (terms === "30fdm") return endOfMonth(OF.addDays(date, 30));
    if (terms === "45fdm") return endOfMonth(OF.addDays(date, 45));
    if (terms === "fdm45") return OF.addDays(endOfMonth(date), 45);
    return OF.addDays(date, Number(terms) || 0);
  }

  function compute() {
    var date = $("d-date").value || OF.today();
    var terms = $("d-terms").value;
    var due = dueDate(date, terms);
    var span = OF.daysBetween(date, due);
    var left = OF.daysBetween(OF.today(), due);
    var max60 = OF.addDays(date, D.delai_max_date_facture_jours);
    var max45 = endOfMonth(OF.addDays(date, D.delai_max_fin_de_mois_jours));
    var max45b = OF.addDays(endOfMonth(date), D.delai_max_fin_de_mois_jours);
    var latest = [max60, max45, max45b].sort().pop();

    set("d-due", OF.date(due, { day: "numeric", month: "long", year: "numeric" }));
    set("d-sub", long(due).replace(/^./, function (c) { return c.toUpperCase(); }) +
      (left > 0 ? " · dans " + left + " jour" + (left > 1 ? "s" : "") : left === 0 ? " · aujourd'hui" : " · dépassée de " + (-left) + " jour" + (left < -1 ? "s" : "")));
    set("d-span", span + " jour" + (span > 1 ? "s" : ""));
    set("d-max60", OF.frDate(max60));
    set("d-max45", OF.frDate(max45) + " (ou " + OF.frDate(max45b) + ")");
    var notice = $("d-notice");
    if (due > latest) {
      notice.className = "notice warn";
      notice.textContent = "Ce délai dépasse le maximum autorisé entre professionnels (60 jours ou 45 jours fin de mois).";
    } else {
      notice.className = "notice ok";
      notice.textContent = "Délai conforme entre professionnels. Indiquez cette date sur la facture, avec le taux des pénalités de retard et l'indemnité de 40 €.";
    }
  }

  OF.persistForm(form, "echeance");
  if (!$("d-date").value) $("d-date").value = OF.today();
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
