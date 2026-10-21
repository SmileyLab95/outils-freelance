/*
 * Facturer un client hors du Canada, bilingue : verdict de TPS/TVH (et TVQ), mentions et démarches (moteur
 * OFE.internationalCA). Textes dans chaque page (<script type="application/json" id="intl-ca-data">). Spécification :
 * documentation/pays/ca.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE;
  var form = document.getElementById("intl-form");
  var dataEl = document.getElementById("intl-ca-data");
  if (!form || !dataEl || !OFE || !OFE.internationalCA) return;
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
    var input = { registered: $("x-registered").value === "yes", quebec: $("x-quebec").checked, location: $("x-location").value,
      service: $("x-service").value, present: $("x-present").checked };
    // Client résident : le service ne change pas la réponse ; la présence au Canada ne compte que pour un service de
    // conseil ou un autre service rendu à un non-résident.
    $("x-service-field").hidden = input.location === "canada";
    $("x-present-field").hidden = input.location === "canada" || input.service === "property" || input.service === "ip";
    var r = OFE.internationalCA.decide(input);
    $("x-verdict").textContent = L.verdicts[r.verdict];
    $("x-why").textContent = r.reasons.map(function (k) { return L.reasons[k]; }).join(" ");
    fill("x-wording", r.wording.map(function (k) { return L.wording[k]; }));
    fill("x-actions", r.actions.map(function (k) { return L.actions[k]; }), L.no_actions);
  }

  OF.persistForm(form, "international");
  form.addEventListener("change", compute);
  compute();
})();
