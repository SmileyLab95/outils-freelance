/* Simulateur de charges auto-entrepreneur : cotisations URSSAF 2026, ACRE, versement libératoire, plafonds et TVA. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("sim-form");
  if (!form || !window.OF_RULES || !window.OFE || !window.OFE.microFR) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };

  // Taux officiels de l'année (data/rules/fr.json, micro_activities), lus par le moteur commun OFE.microFR, comme
  // le calculateur « combien mettre de côté ». Convertis en dixièmes de point pour des calculs exacts (25,6 % → 256).
  // cotis : cotisations sociales, acre : taux minorés publiés, cfp : formation professionnelle,
  // vl : versement libératoire, abatt : abattement fiscal (%).
  var RULES = window.OF_RULES;
  var MIN_ABATT = RULES.micro_abattement_minimum;
  var tenths = function (rate) { return Math.round(rate * 1000); };
  var KEYS = { liberal: "liberal_bnc", cipav: "cipav", services: "services_bic", artisan: "artisan", vente: "vente" };
  var ACTIVITIES = {};
  Object.keys(KEYS).forEach(function (key) {
    var r = window.OFE.microFR.activity(RULES, KEYS[key]);
    ACTIVITIES[key] = {
      cotis: tenths(r.cotisations), acre: { 50: tenths(r.acre[50]), 25: tenths(r.acre[25]) },
      cfp: tenths(r.cfp), vl: tenths(r.vl), abatt: Math.round(r.abattement * 100),
      seuils: { plafond: r.plafond, tva: r.tva, tvaMaj: r.tvaMajore }
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

  function compute() {
    var mixed = $("s-activity").value === "mixte";
    $("s-mixed-fields").hidden = !mixed;
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
    // Revenu imposable sans versement libératoire : CA après abattement forfaitaire (minimum annuel des règles).
    var taxable = Math.max(0, ca - Math.max(ca * a.abatt / 100, MIN_ABATT));
    var labels = {
      cotis: "Cotisations sociales (" + pct(cotisRate) + (acre ? ", avec l'ACRE" : "") + ")",
      cfp: "Formation professionnelle (" + pct(a.cfp) + ")",
      tax: vlOn ? "Impôt : versement libératoire (" + pct(a.vl) + ")" : "Revenu imposable à déclarer (abattement de " + a.abatt + " %)"
    };
    // Activité mixte (documentation/53-activite-mixte.md) : ventes et prestations chacune à leurs taux (moteur commun).
    var m = null, goods = NaN;
    if (mixed) {
      goods = OF.num($("s-goods").value) * (period === "mois" ? 12 : 1);
      m = isFinite(ca) && isFinite(goods) && goods >= 0 && goods <= ca
        ? window.OFE.microFR.mixedYear(RULES, { goods: goods, services: ca - goods, servicesKey: KEYS[$("s-activity2").value] || "services_bic", acre: acre, vl: vlOn })
        : null;
      if (!m || m.errors) { invalidMixed(); return; }
      cotis = m.cotisations; cfp = m.cfp; tax = m.vl; taxable = m.taxable;
      labels = {
        cotis: "Cotisations sociales (" + pct(m.rates.goods) + " sur les ventes, " + pct(m.rates.services) + " sur les prestations" + (acre ? ", avec l'ACRE" : "") + ")",
        cfp: "Formation professionnelle (" + pct(m.rates.cfp) + ", taux le plus élevé de vos deux activités)",
        tax: vlOn ? "Impôt : versement libératoire (" + pct(m.rates.vlGoods) + " sur les ventes, " + pct(m.rates.vlServices) + " sur les prestations)"
          : "Revenu imposable à déclarer (abattements de " + m.rates.abattGoods + " % et " + m.rates.abattServices + " %)"
      };
    }
    var net = ca - cotis - cfp - tax - costs;

    set("s-net-month", OF.eur(net / 12, 0));
    set("s-net-sub", isFinite(net)
      ? "Soit " + OF.eur(net, 0) + " par an, " + (vlOn ? "impôt compris" : "avant impôt sur le revenu") +
        ". Prélèvements : " + OF.fmt(Math.round((cotis + cfp + tax) / ca * 1000) / 10) + " % du chiffre d'affaires."
      : "Indiquez votre chiffre d'affaires.");

    set("s-r-ca", OF.eur(ca, 0));
    set("s-r-cotis-label", labels.cotis);
    set("s-r-cotis", OF.eur(cotis, 0));
    set("s-r-cfp-label", labels.cfp);
    set("s-r-cfp", OF.eur(cfp, 0));
    set("s-r-tax-label", labels.tax);
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
    var notice = $("s-notice"), msg, level = "ok";
    if (m) {
      // Activité mixte : plafond global et plafond des prestations ; seuil de franchise de TVA de l'activité mixte
      // (art. 293 B du CGI) non lu : renvoi à impots.gouv.fr (décision D59).
      var services = ca - goods;
      set("s-g-tva-label", "Plafond des prestations de services");
      OF.gauge("s-g-plafond", ca, m.ceilings.total);
      OF.gauge("s-g-tva", services, m.ceilings.services);
      if (!(ca > 0)) { msg = "Indiquez votre chiffre d'affaires pour vérifier les seuils."; level = ""; }
      else if (ca > m.ceilings.total || services > m.ceilings.services) {
        msg = "Vous dépassez " + (ca > m.ceilings.total ? "le plafond global de la micro-entreprise (" + OF.eur(m.ceilings.total, 0) + ")"
          : "le plafond des prestations de services (" + OF.eur(m.ceilings.services, 0) + ")") +
          ". Si cela se produit deux années de suite, vous passez au régime réel au 1er janvier suivant : parlez-en à un expert-comptable.";
        level = "warn";
      } else {
        msg = "Vous restez sous les deux plafonds de la micro-entreprise. Franchise de TVA en activité mixte : vérifiez les seuils qui s'appliquent à votre situation sur impots.gouv.fr.";
      }
      notice.textContent = msg;
      notice.className = "notice" + (level ? " " + level : "");
      return;
    }
    set("s-g-tva-label", "Seuil de franchise de TVA");
    var s = a.seuils;
    OF.gauge("s-g-plafond", ca, s.plafond);
    OF.gauge("s-g-tva", ca, s.tva);
    if (!isFinite(ca) || ca <= 0) { msg = "Indiquez votre chiffre d'affaires pour vérifier les seuils."; level = ""; }
    else if (ca > s.plafond) { msg = "Vous dépassez le plafond de la micro-entreprise (" + OF.eur(s.plafond, 0) + "). Si cela se produit deux années de suite, vous passez au régime réel au 1er janvier suivant : parlez-en à un expert-comptable."; level = "warn"; }
    else if (ca > s.tvaMaj) { msg = "Au-delà de " + OF.eur(s.tvaMaj, 0) + ", vous devez facturer la TVA dès le jour du dépassement. Pensez à adapter vos prix et vos factures."; level = "warn"; }
    else if (ca > s.tva) { msg = "Vous dépassez le seuil de franchise de TVA (" + OF.eur(s.tva, 0) + ") : vous garderez la franchise cette année, mais facturerez la TVA à partir du 1er janvier suivant."; level = "warn"; }
    else { msg = "Vous restez sous le plafond et sous le seuil de TVA : vos factures portent la mention « TVA non applicable, art. 293 B du CGI »."; }
    notice.textContent = msg;
    notice.className = "notice" + (level ? " " + level : "");
  }

  /** Activité mixte : part des ventes illisible, négative ou supérieure au chiffre d'affaires. */
  function invalidMixed() {
    ["s-net-month", "s-r-ca", "s-r-cotis", "s-r-cfp", "s-r-tax", "s-r-costs", "s-r-net"].forEach(function (id) { set(id, "–"); });
    OF.gauge("s-g-plafond", NaN, 1);
    OF.gauge("s-g-tva", NaN, 1);
    set("s-net-sub", "Indiquez la part des ventes : un montant entre 0 et votre chiffre d'affaires.");
    $("s-bar").innerHTML = "";
    $("s-legend").innerHTML = "";
    var notice = $("s-notice");
    notice.textContent = "La part des ventes doit être comprise entre 0 et votre chiffre d'affaires.";
    notice.className = "notice warn";
  }

  form.addEventListener("click", function (event) {
    var button = event.target.closest("[data-period]");
    if (!button) return;
    var next = button.getAttribute("data-period"), field = $("s-period");
    if (next === field.value) return;
    // Convertit le montant saisi pour garder le même chiffre d'affaires.
    ["s-ca", "s-goods"].forEach(function (id) {
      var amount = OF.num($(id).value);
      if (isFinite(amount)) $(id).value = OF.fmt(Math.round(next === "an" ? amount * 12 : amount / 12));
    });
    field.value = next;
    form.dispatchEvent(new Event("input"));
  });

  OF.persistForm(form, "simulateur");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
