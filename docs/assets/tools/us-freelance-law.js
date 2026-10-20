/* Freelance protection laws (US) : la loi locale impose-t-elle un contrat écrit, et quel délai de paiement s'applique ? */
(function () {
  "use strict";
  var OF = window.OF, R = window.OF_RULES;
  var form = document.getElementById("law-form");
  var dataEl = document.getElementById("law-data");
  if (!form || !R || !dataEl) return;
  var PLACES = JSON.parse(dataEl.textContent).places;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };

  function compute() {
    var place = PLACES[$("l-place").value];
    var value = Math.max(0, OF.num($("l-value").value) || 0);
    var prior = Math.max(0, OF.num($("l-prior").value) || 0);
    var total = value + prior;
    var laws = place.laws.map(function (k) { return R[k]; }).filter(Boolean);
    var hero = $("l-hero");

    if (!laws.length) {
      set("l-answer", "No freelance law found");
      set("l-sub", "Your state or city has no specific freelance payment law in our list. A written contract is still your best protection.");
      hero.classList.add("is-negative");
      $("l-details").innerHTML = "";
      $("l-must").hidden = true;
      $("l-verify").hidden = true;
      return;
    }
    var threshold = Math.min.apply(null, laws.map(function (l) { return l.written_contract_threshold_usd; }));
    var required = total >= threshold;
    hero.classList.toggle("is-negative", !required);
    set("l-answer", required ? "Written contract required" : "Not required, but recommended");
    set("l-sub", (required ? "This work, " : "This work ") + "worth " + OF.money(total, 0) + " with this client" +
      (required ? ", is at or above the " : ", is below the ") + OF.money(threshold, 0) + " threshold. " +
      (required ? "The client must sign a written contract and pay on time." : "Payment protections may still apply once you reach the threshold."));
    $("l-must").hidden = !required;
    $("l-details").innerHTML = laws.map(function (l) {
      return '<div class="card law-card"><h3>' + esc(l.name) + "</h3><ul class=\"result-list result-wrap\">" +
        "<li><span>In force since</span><b>" + esc(/^\d{4}-\d{2}-\d{2}$/.test(l.effective_date) ? OF.date(l.effective_date, { month: "long", day: "numeric", year: "numeric" }) : l.effective_date) + "</b></li>" +
        "<li><span>Written contract from</span><b>" + OF.money(l.written_contract_threshold_usd, 0) + "</b></li>" +
        "<li><span>Counting</span><b>" + esc(l.aggregation) + "</b></li>" +
        "<li><span>Payment deadline</span><b>" + esc(l.payment_deadline) + "</b></li>" +
        "<li><span>If the client breaks the law</span><b>" + esc(l.remedies) + "</b></li>" +
        "<li><span>Who enforces it</span><b>" + esc(l.enforcer) + "</b></li></ul></div>";
    }).join("");
    $("l-verify").hidden = !place.verify;
  }

  OF.persistForm(form, "freelance-law");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
