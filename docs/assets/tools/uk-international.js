/*
 * Facturer un client étranger (Royaume-Uni) : verdict de TVA, mentions et démarches selon la situation (moteur
 * OFE.internationalUK). Textes dans la page (<script type="application/json" id="intl-uk-data">). Spécification :
 * documentation/pays/uk.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE;
  var form = document.getElementById("intl-form");
  var dataEl = document.getElementById("intl-uk-data");
  if (!form || !dataEl || !OFE || !OFE.internationalUK) return;
  var L = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };

  // Liste de textes : un <li> par clé, ou une phrase unique si la liste est vide.
  function fill(id, texts, empty) {
    var ul = $(id);
    ul.textContent = "";
    (texts.length ? texts : [empty]).forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      ul.appendChild(li);
    });
  }

  function compute() {
    var input = { registered: $("x-registered").value === "yes", location: $("x-location").value,
      customer: $("x-customer").value, service: $("x-service").value };
    // Client au Royaume-Uni : ni le type de client ni le service ne changent la réponse.
    $("x-customer-field").hidden = $("x-service-field").hidden = input.location === "uk";
    var r = OFE.internationalUK.decide(input);
    $("x-verdict").textContent = L.verdicts[r.verdict];
    $("x-why").textContent = r.reasons.map(function (k) { return L.reasons[k]; }).join(" ");
    fill("x-wording", r.wording.map(function (k) { return L.wording[k]; }));
    fill("x-actions", r.actions.map(function (k) { return L.actions[k]; }), L.no_actions);
  }

  OF.persistForm(form, "international");
  form.addEventListener("change", compute);
  compute();
})();
