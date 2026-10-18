/* Calcul des pénalités de retard (art. L441-10) et de l'indemnité forfaitaire de 40 € (art. D441-5). */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("pen-form");
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };

  function annualRate() {
    var method = $("p-method").value;
    form.querySelectorAll("[data-method]").forEach(function (el) { el.hidden = el.getAttribute("data-method") !== method; });
    if (method === "legal") return { rate: OF.num($("p-legal").value) * 3, label: "3 × taux légal" };
    if (method === "bce") return { rate: OF.num($("p-bce").value) + 10, label: "taux BCE + 10 points" };
    return { rate: OF.num($("p-rate").value), label: "taux de vos conditions" };
  }

  function compute() {
    var amount = OF.num($("p-amount").value);
    var due = $("p-due").value;
    var paid = $("p-paid").value || OF.today();
    var days = due ? Math.max(0, OF.daysBetween(due, paid)) : NaN;
    var r = annualRate();
    var fee = $("p-fee").checked && days > 0 ? 40 : 0;
    var penalties = amount * (r.rate / 100) * days / 365;

    set("p-r-amount", OF.eur(amount));
    set("p-r-days", isFinite(days) ? days + " jour" + (days > 1 ? "s" : "") : "–");
    set("p-r-rate", isFinite(r.rate) ? OF.fmt(r.rate) + " % par an" : "à saisir");
    set("p-r-pen", OF.eur(penalties));
    set("p-r-fee", OF.eur(fee));

    if (!due) {
      set("p-total", "–");
      set("p-sub", "Indiquez la date d'échéance de la facture.");
    } else if (days === 0) {
      set("p-total", OF.eur(0));
      set("p-sub", "Pas de retard à cette date : aucune pénalité n'est due.");
    } else if (!isFinite(r.rate)) {
      set("p-total", OF.eur(fee));
      set("p-sub", "Saisissez le taux pour calculer les pénalités.");
    } else {
      set("p-total", OF.eur(penalties + fee));
      set("p-sub", "Pénalités " + OF.eur(penalties) + " + indemnité " + OF.eur(fee) + ", en plus de la facture (" + OF.eur(amount) + ").");
    }
    $("p-formula").textContent = isFinite(penalties) && days > 0
      ? OF.eur(amount) + " × " + OF.fmt(r.rate) + " % × " + days + " jours ÷ 365 = " + OF.eur(penalties) + " (" + r.label + ")"
      : "Pénalités = montant TTC × taux annuel × jours de retard ÷ 365";
  }

  OF.persistForm(form, "penalites");
  if (!$("p-due").value) $("p-due").value = OF.addDays(OF.today(), -45);
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
