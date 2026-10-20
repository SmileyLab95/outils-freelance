/* Simulateur de charges auto-entrepreneur : cotisations URSSAF 2026, ACRE, versement libératoire, plafonds et TVA. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("sim-form");
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };

  // Taux officiels de l'année, injectés par le générateur depuis data/rules/fr.json (micro_activities).
  // Convertis en dixièmes de point pour des calculs exacts (25,6 % → 256).
  // cotis : cotisations sociales, acre : taux minorés publiés, cfp : formation professionnelle,
  // vl : versement libératoire, abatt : abattement fiscal (%).
  var RULES = window.OF_RULES || {};
  var tenths = function (rate) { return Math.round(rate * 1000); };
  var KEYS = { liberal: "liberal_bnc", cipav: "cipav", services: "services_bic", artisan: "artisan", vente: "vente" };
  var ACTIVITIES = {};
  Object.keys(KEYS).forEach(function (key) {
    var r = (RULES.micro_activities || {})[KEYS[key]];
    if (!r) return;
    ACTIVITIES[key] = {
      cotis: tenths(r.cotisations), acre: { 50: tenths(r.acre_50), 25: tenths(r.acre_25) },
      cfp: tenths(r.cfp), vl: tenths(r.versement_liberatoire), abatt: Math.round(r.abattement * 100),
      seuils: { plafond: r.plafond_ca, tva: r.tva_seuil, tvaMaj: r.tva_seuil_majore }
    };
  });

  /** Taux de cotisations avec l'ACRE : taux minorés publiés par l'Urssaf (−50 % ou −25 %). */
  function acreRate(activity, reduction) {
    return reduction ? activity.acre[reduction] : activity.cotis;
  }
  var pct = function (tenths) { return OF.fmt(tenths / 10) + " %"; };

  function syncPeriod() {
    var period = $("s-period").value;
    form.querySelectorAll("[data-period]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-period") === period));
    });
    return period;
  }

  function gauge(id, value, limit) {
    var ratio = value / limit;
    var bar = $(id + "-bar");
    bar.style.width = Math.min(100, Math.max(0, ratio * 100)) + "%";
    bar.className = ratio > 1 ? "over" : ratio > 0.85 ? "near" : "";
    set(id, isFinite(ratio) ? Math.round(ratio * 100) + " % de " + OF.eur(limit, 0) : "–");
  }

  function compute() {
    var a = ACTIVITIES[$("s-activity").value] || ACTIVITIES.liberal;
    var period = syncPeriod();
    var amount = OF.num($("s-ca").value);
    var ca = period === "mois" ? amount * 12 : amount;
    var acre = Number($("s-acre").value) || 0;
    var cotisRate = acreRate(a, acre);
    var vlOn = $("s-vl").checked;
    var costs = OF.num($("s-costs").value) || 0;

    var cotis = ca * cotisRate / 1000;
    var cfp = ca * a.cfp / 1000;
    var tax = vlOn ? ca * a.vl / 1000 : 0;
    var net = ca - cotis - cfp - tax - costs;
    // Revenu imposable sans versement libératoire : CA après abattement forfaitaire (305 € minimum).
    var taxable = Math.max(0, ca - Math.max(ca * a.abatt / 100, 305));

    set("s-net-month", OF.eur(net / 12, 0));
    set("s-net-sub", isFinite(net)
      ? "Soit " + OF.eur(net, 0) + " par an, " + (vlOn ? "impôt compris" : "avant impôt sur le revenu") +
        ". Prélèvements : " + OF.fmt(Math.round((cotis + cfp + tax) / ca * 1000) / 10) + " % du chiffre d'affaires."
      : "Indiquez votre chiffre d'affaires.");

    set("s-r-ca", OF.eur(ca, 0));
    set("s-r-cotis-label", "Cotisations sociales (" + pct(cotisRate) + (acre ? ", avec l'ACRE" : "") + ")");
    set("s-r-cotis", OF.eur(cotis, 0));
    set("s-r-cfp-label", "Formation professionnelle (" + pct(a.cfp) + ")");
    set("s-r-cfp", OF.eur(cfp, 0));
    set("s-r-tax-label", vlOn ? "Impôt : versement libératoire (" + pct(a.vl) + ")" : "Revenu imposable à déclarer (abattement de " + a.abatt + " %)");
    set("s-r-tax", OF.eur(vlOn ? tax : taxable, 0));
    set("s-r-costs", OF.eur(costs, 0));
    set("s-r-net", OF.eur(net, 0));

    // Répartition du chiffre d'affaires.
    var parts = [
      { label: "Pour vous", value: Math.max(0, net), cls: "net" },
      { label: "Cotisations", value: cotis + cfp, cls: "cotis" },
      { label: "Impôt", value: tax, cls: "tax" },
      { label: "Dépenses", value: Math.min(costs, Math.max(0, ca - cotis - cfp - tax)), cls: "costs" }
    ].filter(function (p) { return p.value > 0; });
    var total = parts.reduce(function (s, p) { return s + p.value; }, 0);
    $("s-bar").innerHTML = parts.map(function (p) {
      return '<span class="' + p.cls + '" style="width:' + (p.value / total * 100) + '%"></span>';
    }).join("");
    $("s-legend").innerHTML = total > 0 ? parts.map(function (p) {
      return '<li><i class="' + p.cls + '"></i>' + p.label + " <b>" + Math.round(p.value / total * 100) + " %</b></li>";
    }).join("") : "";

    // Plafonds et seuils.
    var s = a.seuils;
    gauge("s-g-plafond", ca, s.plafond);
    gauge("s-g-tva", ca, s.tva);
    var notice = $("s-notice"), msg, level = "ok";
    if (!isFinite(ca) || ca <= 0) { msg = "Indiquez votre chiffre d'affaires pour vérifier les seuils."; level = ""; }
    else if (ca > s.plafond) { msg = "Vous dépassez le plafond de la micro-entreprise (" + OF.eur(s.plafond, 0) + "). Si cela se produit deux années de suite, vous passez au régime réel au 1er janvier suivant : parlez-en à un expert-comptable."; level = "warn"; }
    else if (ca > s.tvaMaj) { msg = "Au-delà de " + OF.eur(s.tvaMaj, 0) + ", vous devez facturer la TVA dès le jour du dépassement. Pensez à adapter vos prix et vos factures."; level = "warn"; }
    else if (ca > s.tva) { msg = "Vous dépassez le seuil de franchise de TVA (" + OF.eur(s.tva, 0) + ") : vous garderez la franchise cette année, mais facturerez la TVA à partir du 1er janvier suivant."; level = "warn"; }
    else { msg = "Vous restez sous le plafond et sous le seuil de TVA : vos factures portent la mention « TVA non applicable, art. 293 B du CGI »."; }
    notice.textContent = msg;
    notice.className = "notice" + (level ? " " + level : "");
  }

  form.addEventListener("click", function (event) {
    var button = event.target.closest("[data-period]");
    if (!button) return;
    var next = button.getAttribute("data-period"), field = $("s-period");
    if (next === field.value) return;
    // Convertit le montant saisi pour garder le même chiffre d'affaires.
    var amount = OF.num($("s-ca").value);
    if (isFinite(amount)) $("s-ca").value = OF.fmt(Math.round(next === "an" ? amount * 12 : amount / 12));
    field.value = next;
    form.dispatchEvent(new Event("input"));
  });

  OF.persistForm(form, "simulateur");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
