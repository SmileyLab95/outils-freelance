/* Assurances de l'activité (Royaume-Uni, États-Unis, Canada) : réponse principale et liste des assurances (moteur OFE.insuranceIntl). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("ins-form"), data = document.getElementById("ins-data");
  if (!form || !data || !OFE || !OFE.insuranceIntl || !R) return;
  var L = JSON.parse(data.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var field = function (name) { var el = form.elements[name]; return el.type === "checkbox" ? el.checked : el.value; };
  var FIELDS = { uk: ["structure", "staff", "vehicle", "advice", "regulated", "home"],
                 us: ["state", "employees", "services", "home"],
                 ca: ["province", "employees", "construction", "home"] };

  // « A », « A and B », « A, B and C » (la conjonction vient de la page).
  function join(names) {
    if (names.length < 2) return names.join("");
    return names.slice(0, -1).join(", ") + L.and + names[names.length - 1];
  }

  function compute() {
    var input = {};
    FIELDS[L.country].forEach(function (name) { input[name] = field(name); });
    var board = L.country === "ca" ? R.ca_workers_comp_personal_coverage[input.province] : null;
    if (board) $("i-construction-field").hidden = !board.construction_compulsory;
    var r = OFE.insuranceIntl.check(L.country, input, R);
    var required = r.items.filter(function (i) { return i.level === "required"; }).map(function (i) { return L.names[i.key]; });
    var verdict = L.verdicts[r.verdict].replace("{names}", join(required));
    $("i-verdict").textContent = verdict.charAt(0).toUpperCase() + verdict.slice(1);
    $("i-sub").textContent = L.subs[r.verdict];
    $("i-hero").classList.toggle("is-negative", r.verdict === "none");
    var ul = $("i-list");
    ul.textContent = "";
    r.items.forEach(function (i) {
      var li = document.createElement("li"), div = document.createElement("div");
      var strong = document.createElement("strong"), span = document.createElement("span");
      strong.textContent = L.levels[i.level] + L.names[i.key];
      span.textContent = L.texts[i.key].replace("{board}", board ? board[L.board_name] : "");
      div.appendChild(strong); div.appendChild(span); li.appendChild(div); ul.appendChild(li);
    });
  }

  OF.persistForm(form, "insurance");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
