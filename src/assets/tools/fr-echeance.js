/* Date d'échéance d'une facture : délais en jours, fin de mois (deux méthodes) et maximum légal (art. L441-10).
   Calculs : moteur commun OFE.dueDate (engines/echeance.js, documentation/44-date-echeance-international.md). */
(function () {
  "use strict";
  var OF = window.OF, R = window.OF_RULES, E = window.OFE && window.OFE.dueDate;
  var form = document.getElementById("echeance-form");
  if (!form || !R || !E) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var long = function (iso) { return OF.date(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
  function compute() {
    var date = $("d-date").value || OF.today();
    if (isNaN(E.day(date))) date = OF.today();
    var terms = $("d-terms").value;
    var due = E.due(date, terms) || date;
    var span = E.between(date, due);
    var left = E.between(OF.today(), due);
    var limits = E.frLimits(date, R), max60 = limits.max60, max45 = limits.max45, max45b = limits.max45b, latest = limits.latest;

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
