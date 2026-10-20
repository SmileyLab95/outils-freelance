/*
 * Générateur de relances de paiement, indépendant de la langue et du pays.
 * Les étapes, les modèles et les lois citées viennent de la page : <script type="application/json" id="reminder-data">.
 * Variables des modèles : {contact} {me} {number} {amount} {due_phrase} {days} {deadline} {late_fee_line}
 * {law_line} {payment_line}. Une valeur manquante devient un champ « [à compléter] » surligné.
 */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("reminder-form");
  var dataEl = document.getElementById("reminder-data");
  if (!form || !dataEl) return;
  var D = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var val = function (id) { return ($(id) && $(id).value || "").trim(); };
  var long = function (iso) { return OF.date(iso, { month: "long", day: "numeric", year: "numeric" }); };
  var manual = null;

  function stageFor(days) {
    var index = 0;
    D.stages.forEach(function (s, i) { if (days >= s.from) index = i; });
    return index;
  }

  function fill(text, vars) {
    return text.replace(/\{(\w+)\}/g, function (m, key) {
      return vars[key] != null && vars[key] !== "" ? vars[key] : (D.placeholders[key] || m);
    });
  }

  function render() {
    var due = val("rm-due");
    var days = due ? OF.daysBetween(due, OF.today()) : NaN;
    var auto = isFinite(days) ? stageFor(days) : 0;
    var current = manual == null ? auto : manual;
    var amount = OF.num(val("rm-amount"));
    var law = D.laws[val("rm-location")] || "";
    var fee = val("rm-fee");
    var vars = {
      contact: val("rm-contact"), me: val("rm-me"), number: val("rm-number"),
      amount: isFinite(amount) ? OF.money(amount) : "",
      days: isFinite(days) ? String(Math.max(0, days)) : "",
      deadline: long(OF.addDays(OF.today(), D.deadline_days)),
      due_phrase: !due ? "" : days < 0 ? fill(D.phrases.upcoming, { due: long(due) })
        : days === 0 ? fill(D.phrases.today, { due: long(due) })
        : fill(D.phrases.late, { due: long(due), days: String(days) }),
      late_fee_line: fee ? fill(D.phrases.late_fee, { fee: fee }) : "",
      law_line: law ? fill(D.phrases.law, { law: law }) : "",
      payment_line: val("rm-payment") ? fill(D.phrases.payment, { payment: val("rm-payment") }) : ""
    };

    // Les onglets sont créés une seule fois : les reconstruire ici ferait perdre un clic qui suit la saisie
    // d'un champ (l'événement « change » du champ arrive entre l'appui et le relâchement du bouton).
    $("rm-tabs").querySelectorAll("[data-stage]").forEach(function (tab, i) {
      tab.setAttribute("aria-selected", String(i === current));
      tab.querySelector(".tag").hidden = !(i === auto && isFinite(days));
    });
    $("rm-status").textContent = !due ? D.strings.no_date
      : fill(days < 0 ? D.strings.status_upcoming : D.strings.status_late, { days: String(Math.abs(days)), stage: D.stages[auto].label });
    $("rm-status").className = "notice " + (days > 20 ? "warn" : days > 0 ? "gold" : "ok");

    var tpl = D.templates[D.stages[current].key];
    var subject = fill(tpl.subject, vars).replace(/\s+/g, " ").trim();
    var body = fill(tpl.body, vars).replace(/ +\n/g, "\n").replace(/\n{3,}/g, "\n\n");
    $("rm-subject").textContent = subject;
    $("rm-body").innerHTML = OF.highlight(body);
    var to = val("rm-email");
    $("rm-mail").href = "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    $("rm-copy").onclick = function () { OF.copy(D.strings.subject_prefix + subject + "\n\n" + body, this); };
  }

  $("rm-tabs").innerHTML = D.stages.map(function (s, i) {
    return '<button type="button" class="tab" role="tab" data-stage="' + i + '" aria-selected="false">' + s.label +
      ' <span class="tag" hidden>★</span></button>';
  }).join("");
  $("rm-tabs").addEventListener("click", function (e) {
    var tab = e.target.closest("[data-stage]");
    if (!tab) return;
    manual = Number(tab.getAttribute("data-stage"));
    render();
  });
  $("rm-due").addEventListener("change", function () { manual = null; });

  OF.persistForm(form, "reminder");
  if (!val("rm-due")) $("rm-due").value = OF.addDays(OF.today(), -12);
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
