/* Small claims aux États-Unis : plafond de l'État selon le statut et la date, particularités (moteur OFE.courtUS). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("court-form"), data = document.getElementById("court-us-data");
  if (!form || !data || !OFE || !OFE.courtUS || !R) return;
  var L = JSON.parse(data.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var whole = function (x) { return OF.money(x, 0); };   // « $12,500 »

  function compute() {
    var state = $("c-state").value, select = $("c-state");
    var r = OFE.courtUS.decide({ state: state, amount: OF.num($("c-amount").value) || 0,
                                 entity: $("c-entity").value === "entity", date: OF.today() }, R);
    set("c-verdict", L.verdicts[r.verdict]);
    set("c-sub", L.subs[r.verdict].replace("{limit}", whole(r.max)).replace("{max}", whole(r.max)));
    set("c-limit", r.min === r.max ? whole(r.max) : whole(r.min) + " to " + whole(r.max));
    $("c-next-row").hidden = !r.next;
    if (r.next) set("c-next", L.next.replace("{date}", OF.date(r.next.from, { month: "long", day: "numeric", year: "numeric" }))
      .replace("{limit}", whole(r.next.limit)));
    set("c-name", select.options[select.selectedIndex].text);
    set("c-note", L.notes[state]);
    $("c-link").href = L.links[state];
  }

  OF.persistForm(form, "court");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
