/*
 * Facturer un client étranger (États-Unis) : taxe du pays du client, mentions, démarches et démarches américaines
 * (moteur OFE.internationalUS). Textes dans la page (<script type="application/json" id="intl-us-data">).
 * Spécification : documentation/22-client-etranger-us-et-w8ben.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE;
  var form = document.getElementById("intl-form");
  var dataEl = document.getElementById("intl-us-data");
  if (!form || !dataEl || !OFE || !OFE.internationalUS) return;
  var L = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };

  // Liste de textes : un <li> par clé.
  function fill(id, texts) {
    var ul = $(id);
    ul.textContent = "";
    texts.forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      ul.appendChild(li);
    });
  }

  function compute() {
    var r = OFE.internationalUS.decide({ location: $("x-location").value, customer: $("x-customer").value,
      service: $("x-service").value, workplace: $("x-workplace").value });
    $("x-verdict").textContent = L.verdicts[r.verdict];
    $("x-why").textContent = r.reasons.map(function (k) { return L.reasons[k]; }).join(" ");
    fill("x-wording", r.wording.map(function (k) { return L.wording[k]; }));
    fill("x-actions", r.actions.map(function (k) { return L.actions[k]; }));
    fill("x-us", r.us.map(function (k) { return L.us[k]; }));
  }

  OF.persistForm(form, "international");
  form.addEventListener("change", compute);
  compute();
})();
