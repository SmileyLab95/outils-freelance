/*
 * Calculateur de taxe sur les ventes, indépendant du pays (moteur OFE.salestax).
 * Les taux, les libellés et le mode de choix (boutons de taux ou liste de régions) viennent de la page :
 * <script type="application/json" id="salestax-data">.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE;
  var form = document.getElementById("salestax-form");
  var dataEl = document.getElementById("salestax-data");
  if (!form || !dataEl || !OFE) return;
  var D = JSON.parse(dataEl.textContent);
  var L = D.labels;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var coef = new Intl.NumberFormat(OF.locale, { maximumFractionDigits: 5 });
  var pct = function (rate) { return OF.fmt(Math.round(rate * 100000) / 1000) + L.percent; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };

  // Contrôles de choix du taux : boutons (« chips ») ou liste déroulante.
  if (D.mode === "select") {
    $("st-choices").innerHTML = '<select id="st-region" name="region" data-save>' + D.options.map(function (o) {
      return '<option value="' + o.key + '">' + o.label + "</option>";
    }).join("") + "</select>";
  } else {
    $("st-choices").innerHTML = '<div class="rate-chips" role="radiogroup" aria-label="' + L.rate + '">' +
      D.options.map(function (o, i) {
        return '<label><input type="radio" name="rate" value="' + o.key + '"' + (i === 0 ? " checked" : "") +
          " data-save><span>" + o.label + "</span></label>";
      }).join("") +
      (D.custom ? '<label><input type="radio" name="rate" value="custom" data-save><span>' + L.other + "</span></label>" : "") + "</div>";
  }

  function current() {
    if (D.mode === "select") {
      var key = $("st-region").value;
      return D.options.filter(function (o) { return o.key === key; })[0] || D.options[0];
    }
    var checked = form.querySelector('input[name="rate"]:checked');
    var custom = checked && checked.value === "custom";
    if ($("st-custom-field")) $("st-custom-field").hidden = !custom;
    if (custom) {
      var rate = OF.num($("st-custom").value) / 100;
      return { key: "custom", label: L.other, components: [{ label: D.custom_label, rate: isFinite(rate) ? rate : NaN }] };
    }
    var k = checked ? checked.value : D.options[0].key;
    return D.options.filter(function (o) { return o.key === k; })[0] || D.options[0];
  }

  function compute() {
    var dir = $("st-dir").value === "gross" ? "gross" : "net";
    form.querySelectorAll("[data-dir]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-dir") === dir));
    });
    set("st-amount-label", dir === "net" ? L.amount_net : L.amount_gross);
    var amount = OF.num($("st-amount").value);
    var opt = current();
    var ok = isFinite(amount) && opt.components.every(function (c) { return isFinite(c.rate) && c.rate >= 0; });
    var r = ok ? OFE.salestax.split(amount, opt.components, dir) : null;

    set("st-hero-label", dir === "net" ? L.result_gross : L.result_net);
    set("st-hero", r ? OF.money(dir === "net" ? r.gross : r.net) : "–");
    set("st-hero-sub", r ? fill(L.of_which, { tax: OF.money(r.tax), rate: pct(r.rate) }) : L.enter_amount);
    $("st-note").textContent = opt.note || "";
    $("st-note").hidden = !opt.note;

    var rows = r ? [[L.net, OF.money(r.net)]].concat(r.taxes.map(function (t) {
      return [t.label + " (" + pct(t.rate) + ")", OF.money(t.amount)];
    }), [[L.gross, OF.money(r.gross)]]) : [];
    $("st-list").innerHTML = rows.map(function (row, i) {
      return "<li><span>" + (i === rows.length - 1 ? "<strong>" + row[0] + "</strong>" : row[0]) + "</span><b>" + row[1] + "</b></li>";
    }).join("");

    var k = r ? coef.format(1 + r.rate) : "";
    $("st-formula").textContent = !r ? L.formula_generic
      : dir === "net" ? OF.money(r.net) + " × " + k + " = " + OF.money(r.gross)
      : OF.money(r.gross) + " ÷ " + k + " = " + OF.money(r.net);

    set("st-caption", fill(L.table, { kind: dir === "net" ? L.net_short : L.gross_short }));
    $("st-table").innerHTML = D.options.map(function (o) {
      var x = isFinite(amount) ? OFE.salestax.split(amount, o.components, dir) : null;
      return "<tr" + (o.key === opt.key ? ' class="current"' : "") + "><td>" + (o.short || o.label) + "</td><td>" +
        (x ? OF.money(x.net) : "–") + "</td><td>" + (x ? OF.money(x.tax) : "–") + "</td><td>" + (x ? OF.money(x.gross) : "–") + "</td></tr>";
    }).join("");
  }

  form.addEventListener("click", function (event) {
    var button = event.target.closest("[data-dir]");
    if (!button) return;
    $("st-dir").value = button.getAttribute("data-dir");
    form.dispatchEvent(new Event("input"));
  });

  OF.persistForm(form, D.storage);
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
