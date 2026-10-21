/* Combien mettre de côté sur un paiement (micro-entrepreneur) : relie le formulaire au moteur OFE.microFR. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("sa-form");
  if (!form || !OFE || !OFE.microFR || !R) return;
  var M = OFE.microFR;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  // Taux écrits comme dans les textes officiels (25,6 %, 1,7 %).
  var pct = function (rate) { return OF.fmt(Math.round(rate * 1000) / 10) + " %"; };
  // Taux de TVA de data/rules/fr.json (tva_taux_metropole) : une seule source.
  var VAT = R.tva_taux_metropole;
  var LINES = ["sa-total", "sa-r-vat", "sa-r-cotis", "sa-r-cfp", "sa-r-tax", "sa-r-keep"];
  var LABELS = { "sa-r-vat-label": "TVA à reverser", "sa-r-cotis-label": "Cotisations sociales",
    "sa-r-cfp-label": "Formation professionnelle", "sa-r-tax-label": "Impôt sur le revenu", "sa-r-keep-label": "Il vous reste" };

  function activity() {
    try { return M.activity(R, $("sa-activity").value); } catch (e) { return M.activity(R, "liberal_bnc"); }
  }

  function compute() {
    var act = activity(), vatRate = VAT[$("sa-vat").value] || 0;
    var acre = Number($("sa-acre").value) || 0;
    var checked = form.querySelector('input[name="tax"]:checked'), vl = !!checked && checked.value === "vl";
    $("sa-pas-field").hidden = vl;
    // Montants lus comme ailleurs sur le site (OF.num) ; une saisie invalide est signalée, pas ignorée.
    var pasRaw = $("sa-pas").value.trim(), pasPct = OF.num(pasRaw) + 0;
    var res = M.setAside({
      amount: OF.num($("sa-amount").value), vatRate: vatRate, activity: act, acre: acre, vl: vl,
      pasRate: vl || pasRaw === "" ? null : pasPct / 100
    });
    var errors = res.errors || [];
    $("sa-amount").setAttribute("aria-invalid", String(errors.indexOf("amount") > -1));
    $("sa-pas").setAttribute("aria-invalid", String(errors.indexOf("pasRate") > -1));
    var notice = $("sa-notice");
    if (errors.length) {
      LINES.forEach(function (id) { set(id, "–"); });
      Object.keys(LABELS).forEach(function (id) { set(id, LABELS[id]); });
      var msg = errors.map(function (e) {
        return e === "amount" ? "Montant invalide : saisissez le montant reçu en chiffres, par exemple 1 500."
          : "Taux de prélèvement invalide : saisissez un pourcentage entre 0 et 100, par exemple 7,5.";
      }).join(" ");
      set("sa-sub", msg);
      notice.textContent = msg;
      notice.className = "notice warn";
      return;
    }

    var cotisRate = M.cotisationRate(act, acre), unknown = res.taxMode === "unknown";
    set("sa-total", OF.eur(res.total));
    set("sa-sub", "Soit " + pct(res.share) + " du paiement" +
      (unknown ? ", sans l'impôt sur le revenu" : res.taxMode === "pas" ? ", dont " + OF.eur(res.tax) + " d'impôt estimé" : "") +
      ". Il vous reste " + OF.eur(res.keep) + (unknown ? " avant l'impôt sur le revenu." : "."));
    set("sa-r-vat-label", vatRate ? "TVA à reverser (" + pct(vatRate) + ")" : "TVA : franchise en base, rien à reverser");
    set("sa-r-vat", OF.eur(res.vat));
    set("sa-r-cotis-label", "Cotisations sociales (" + pct(cotisRate) + " du montant hors taxes" + (acre ? ", avec l'ACRE" : "") + ")");
    set("sa-r-cotis", OF.eur(res.cotisations));
    set("sa-r-cfp-label", "Formation professionnelle (" + pct(act.cfp) + ")");
    set("sa-r-cfp", OF.eur(res.cfp));
    set("sa-r-tax-label", res.taxMode === "vl" ? "Impôt : versement libératoire (" + pct(act.vl) + ")"
      : res.taxMode === "pas" ? "Impôt estimé (taux du foyer de " + OF.rate(pasPct) + " %)"
      : "Impôt sur le revenu : indiquez votre taux");
    set("sa-r-tax", res.tax === null ? "–" : OF.eur(res.tax));
    set("sa-r-keep-label", unknown ? "Il vous reste, avant l'impôt sur le revenu" : "Il vous reste");
    set("sa-r-keep", OF.eur(res.keep));

    var base = "montant hors taxes après l'abattement de " + Math.round(act.abattement * 100) + " %";
    var msg = res.taxMode === "vl"
      ? "Le versement libératoire se paie avec vos cotisations, à chaque déclaration de chiffre d'affaires."
      : res.taxMode === "pas"
        ? "Impôt estimé sur " + OF.eur(res.taxable) + " (" + base + "). Les acomptes réels sont calculés par l'administration sur vos revenus des années précédentes, puis régularisés l'année suivante."
        : "Sans votre taux de prélèvement, l'impôt n'est pas compté. Base de l'acompte pour ce paiement : " + OF.eur(res.taxable) + " (" + base + ").";
    if (vatRate) msg += " La TVA se reverse au service des impôts, pas à l'Urssaf.";
    // Taux minoré publié pour la Cipav, différent de la moitié du taux plein : question ouverte des règles.
    if (act.key === "cipav" && acre === 50) msg += " Cipav avec l'ACRE à −50 % : l'Urssaf publie un taux de " + pct(act.acre[50]) + ", et non la moitié du taux plein ; à confirmer auprès d'elle.";
    notice.textContent = msg;
    notice.className = "notice" + (unknown ? " warn" : "");
  }

  OF.persistForm(form, "mettre-de-cote");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
