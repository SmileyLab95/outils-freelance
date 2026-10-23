/* Compte bancaire de l'activité (Royaume-Uni, États-Unis, Canada) : réponse, raisons et démarches (moteur OFE.bankIntl). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE;
  var form = document.getElementById("bank-form"), data = document.getElementById("bank-data");
  if (!form || !data || !OFE || !OFE.bankIntl) return;
  var L = JSON.parse(data.textContent);
  var $ = function (id) { return document.getElementById(id); };

  function fill(id, keys, group) {
    var ul = $(id);
    ul.textContent = "";
    keys.forEach(function (key) {
      var li = document.createElement("li");
      li.textContent = L[group][key];
      ul.appendChild(li);
    });
  }

  function compute() {
    var r = OFE.bankIntl.decide(L.country, $("k-structure").value);
    $("k-verdict").textContent = L.verdicts[r.verdict];
    $("k-sub").textContent = L.subs[r.verdict];
    fill("k-reasons", r.reasons, "reasons");
    fill("k-steps", r.steps, "steps");
  }

  OF.persistForm(form, "bank");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
