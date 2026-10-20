/* Facturation électronique : dates d'obligation selon la taille de l'entreprise et les clients, checklist mémorisée. */
(function () {
  "use strict";
  var OF = window.OF, R = window.OF_RULES;
  var form = document.getElementById("einvoice-form");
  if (!form || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var C = R.facturation_electronique_calendrier;
  var long = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  var checklist = $("e-checklist");
  var done = OF.load("einvoice-steps", {});

  function status(iso) {
    var days = OF.daysBetween(OF.today(), iso);
    return days <= 0 ? "en vigueur depuis le " + long(iso) : "dans " + days + " jours (" + long(iso) + ")";
  }

  function compute() {
    var size = $("e-size").value;
    var b2b = $("e-b2b").checked, b2c = $("e-b2c").checked, intl = $("e-intl").checked;
    var issue = size === "eti" ? C.emission_ereporting_grandes_entreprises_eti : C.emission_ereporting_pme_tpe_micro;
    var days = OF.daysBetween(OF.today(), issue);

    $("e-date").textContent = b2b ? long(issue) : "Non concerné";
    $("e-sub").textContent = !b2b
      ? "Sans clients professionnels en France, vous n'émettez pas de factures électroniques, mais vous devez pouvoir en recevoir de vos fournisseurs."
      : days > 0 ? "Dans " + days + " jours. Vos factures aux entreprises françaises devront passer par une plateforme agréée."
      : "C'est déjà le cas : vos factures aux entreprises françaises doivent passer par une plateforme agréée.";

    var rows = [["Recevoir des factures électroniques", status(C.reception_toutes_entreprises)]];
    if (b2b) rows.push(["Émettre des factures électroniques", status(issue)]);
    if (b2c || intl) rows.push(["E-reporting (" + [b2c ? "particuliers" : "", intl ? "étranger" : ""].filter(Boolean).join(", ") + ")", status(issue)]);
    rows.push(["Nouvelles mentions sur vos factures", b2b ? status(issue) : "à ajouter avec vos factures électroniques"]);
    $("e-list").innerHTML = rows.map(function (r) { return "<li><span>" + r[0] + "</span><b>" + r[1] + "</b></li>"; }).join("");
  }

  function progress() {
    var boxes = checklist.querySelectorAll("input");
    var n = 0;
    boxes.forEach(function (b) { if (b.checked) n++; });
    $("e-progress").style.width = (n / boxes.length * 100) + "%";
  }
  checklist.querySelectorAll("input").forEach(function (b) {
    b.checked = !!done[b.getAttribute("data-step")];
    b.addEventListener("change", function () {
      done[b.getAttribute("data-step")] = b.checked;
      OF.save("einvoice-steps", done);
      progress();
    });
  });

  OF.persistForm(form, "einvoice");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
  progress();
})();
