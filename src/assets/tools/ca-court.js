/* Petites créances au Canada (anglais et français) : tribunal, plafond et prescription de la province (moteur OFE.courtCA). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("court-form"), data = document.getElementById("court-ca-data");
  if (!form || !data || !OFE || !OFE.courtCA || !R) return;
  var L = JSON.parse(data.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var whole = function (x) { return OF.money(x, 0); };   // « 15 000 $ », « $15,000 »

  function compute() {
    var province = $("c-province").value, select = $("c-province");
    var r = OFE.courtCA.decide({ province: province, amount: OF.num($("c-amount").value) || 0 }, R);
    set("c-verdict", L.verdicts[r.verdict]);
    set("c-sub", L.subs[r.verdict].replace("{limit}", r.limit === null ? "" : whole(r.limit))
      .replace("{tribunal}", r.tribunalLimit ? whole(r.tribunalLimit) : ""));
    set("c-court", r.verdict === "tribunal" ? L.tribunal : L.courts[province]);
    set("c-limit", r.limit === null ? L.verdicts.unknown : whole(r.limit));
    set("c-name", select.options[select.selectedIndex].text);
    set("c-note", L.notes[province]);
    $("c-link").href = L.links[province];
    set("c-time", r.limitation ? L.limitation[r.limitation.from].replace("{years}", r.limitation.years) : L.limitation.unknown);
  }

  OF.persistForm(form, "court");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
