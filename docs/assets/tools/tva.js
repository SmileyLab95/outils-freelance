/* Calcul de TVA : HT → TTC ou TTC → HT, aux taux français ou à un taux libre. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("tva-form");
  var T = (window.OF_RULES || {}).tva_taux_metropole;
  if (!form || !T) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  // Taux de data/rules/fr.json (tva_taux_metropole), en pourcentage : une seule source.
  var RATES = [T.normal, T.intermediaire, T.reduit, T.particulier].map(function (r) { return Math.round(r * 1000) / 10; });
  var cents = function (n) { return Math.round(n * 100) / 100; };
  var coef = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 });

  /** Décompose un montant : la TVA est arrondie au centime, le TTC est la somme HT + TVA. */
  function split(amount, rate, dir) {
    var ht = dir === "ht" ? cents(amount) : cents(amount / (1 + rate / 100));
    var ttc = dir === "ht" ? cents(ht * (1 + rate / 100)) : cents(amount);
    return { ht: ht, tva: cents(ttc - ht), ttc: ttc };
  }

  function currentRate() {
    var checked = form.querySelector('input[name="rate"]:checked');
    var custom = checked && checked.value === "custom";
    $("v-custom-field").hidden = !custom;
    return custom ? OF.num($("v-custom").value) : Number(checked ? checked.value : 20);
  }

  function compute() {
    var dir = $("v-dir").value === "ttc" ? "ttc" : "ht";
    form.querySelectorAll("[data-dir]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-dir") === dir));
    });
    set("v-amount-label", dir === "ht" ? "Montant hors taxes (HT)" : "Montant toutes taxes comprises (TTC)");
    var amount = OF.num($("v-amount").value), rate = currentRate();
    var ok = isFinite(amount) && isFinite(rate) && rate >= 0;
    var r = ok ? split(amount, rate, dir) : { ht: NaN, tva: NaN, ttc: NaN };

    set("v-hero-label", dir === "ht" ? "Prix TTC" : "Prix HT");
    set("v-hero", OF.eur(dir === "ht" ? r.ttc : r.ht));
    set("v-hero-sub", ok ? "dont TVA à " + OF.fmt(rate) + " % : " + OF.eur(r.tva) : "Saisissez un montant et un taux.");
    set("v-ht", OF.eur(r.ht));
    set("v-tva-label", "TVA" + (ok ? " (" + OF.fmt(rate) + " %)" : ""));
    set("v-tva", OF.eur(r.tva));
    set("v-ttc", OF.eur(r.ttc));
    var k = coef.format(1 + rate / 100);
    $("v-formula").textContent = !ok ? "TTC = HT × (1 + taux)"
      : dir === "ht" ? OF.eur(r.ht) + " × " + k + " = " + OF.eur(r.ttc) + " TTC"
      : OF.eur(r.ttc) + " ÷ " + k + " = " + OF.eur(r.ht) + " HT";

    set("v-table-caption", ok ? "Le même montant " + (dir === "ht" ? "HT" : "TTC") + " aux autres taux" : "Le même montant aux autres taux");
    $("v-table").innerHTML = RATES.map(function (t) {
      var x = isFinite(amount) ? split(amount, t, dir) : { ht: NaN, tva: NaN, ttc: NaN };
      return "<tr" + (t === rate ? ' class="current"' : "") + "><td>" + OF.fmt(t) + " %</td><td>" + OF.eur(x.ht) +
        "</td><td>" + OF.eur(x.tva) + "</td><td>" + OF.eur(x.ttc) + "</td></tr>";
    }).join("");
  }

  form.addEventListener("click", function (event) {
    var button = event.target.closest("[data-dir]");
    if (!button) return;
    $("v-dir").value = button.getAttribute("data-dir");
    form.dispatchEvent(new Event("input"));
  });

  OF.persistForm(form, "tva");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
