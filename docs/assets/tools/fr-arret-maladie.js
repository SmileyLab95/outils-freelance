/*
 * Arrêt maladie de l'indépendant : indemnités journalières de l'entrepreneur individuel au réel (carence, plafond,
 * 90 jours en libéral). Moteur OFE.protectionFR ; chiffres lus dans la règle ij_maladie_independants.
 * Spécification : documentation/50-protection-sociale.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("am-form");
  if (!form || !OFE || !OFE.protectionFR || !R || !R.ij_maladie_independants) return;
  var P = OFE.protectionFR, IJ = R.ij_maladie_independants;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var longDate = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  var days = function (n) { return OF.fmt(n) + (n > 1 ? " jours" : " jour"); };

  function blank(sub, message, warn) {
    set("am-total", "–");
    set("am-sub", sub);
    ["am-income", "am-daily", "am-days", "am-waiting", "am-paid", "am-first", "am-last"].forEach(function (id) { set(id, "–"); });
    $("am-notice").className = "notice" + (warn ? " warn" : "");
    set("am-notice", message);
  }

  function compute() {
    var situation = $("am-situation").value, micro = situation === "micro", liberal = situation === "reel_liberal";
    ["am-amount-field", "am-start-field", "am-end-field", "am-affiliated-field"].forEach(function (id) { $(id).hidden = micro; });
    $("am-details").hidden = micro;
    if (micro) {
      blank("Règles du micro-entrepreneur non vérifiées",
        "La fiche officielle sur laquelle repose le calcul ne concerne que l'entrepreneur individuel au réel. Pour un micro-entrepreneur, le revenu retenu et les conditions n'ont pas pu être vérifiés à une source officielle : l'outil ne donne pas de montant. Votre caisse d'assurance maladie (ameli.fr) vous indique vos droits.", true);
      return;
    }
    set("am-amount-label", liberal ? "Revenu d'activité annuel moyen" : "Revenu d'activité annuel");
    set("am-amount-hint", liberal ? "Moyenne de vos revenus d'activité indépendante sur une année." : "Revenu de votre activité indépendante sur une année.");

    var raw = $("am-amount").value.trim(), montant = OF.num(raw);
    $("am-amount").setAttribute("aria-invalid", String(raw !== "" && !(montant >= 0)));
    var r = P.ijMaladie(R, { situation: situation, montant: raw === "" ? NaN : montant, debut: $("am-start").value, fin: $("am-end").value, affilie: $("am-affiliated").checked });
    $("am-end").setAttribute("aria-invalid", String(r.error === "ordre"));
    if (r.error === "montant") { blank("–", raw === "" ? "Indiquez votre revenu d'activité annuel." : "Saisissez un revenu positif, en euros (par exemple 36 500).", raw !== ""); return; }
    if (r.error === "dates") { blank("–", "Indiquez le premier et le dernier jour de l'arrêt.", false); return; }
    if (r.error === "ordre") { blank("–", "Le dernier jour de l'arrêt doit suivre le premier.", true); return; }

    set("am-total", OF.eur(r.total));
    set("am-income", OF.eur(Math.min(r.revenu, r.plafond), 0) + (r.revenu > r.plafond ? " (plafond)" : ""));
    set("am-daily", OF.eur(r.ij));
    set("am-days", days(r.jours));
    set("am-waiting", days(r.carence));
    set("am-paid", OF.fmt(r.joursIndemnises));
    set("am-first", r.premierJour ? longDate(r.premierJour) : "–");
    set("am-last", r.dernierJour ? longDate(r.dernierJour) : "–");

    var notes = [];
    if (!r.eligible) {
      set("am-sub", "Pas d'indemnités sans " + IJ.affiliation_mois + " mois d'affiliation : à titre indicatif, l'indemnité serait de " + OF.eur(r.ij) + " par jour.");
    } else if (!r.joursIndemnises) {
      set("am-sub", "Rien n'est versé : l'arrêt ne dépasse pas les " + IJ.carence_jours + " jours de carence.");
    } else {
      set("am-sub", days(r.joursIndemnises) + " indemnisé" + (r.joursIndemnises > 1 ? "s" : "") + " à " + OF.eur(r.ij) + " par jour, après " + IJ.carence_jours + " jours de carence.");
    }
    if (r.plafonnee) notes.push("Indemnité plafonnée à " + OF.eur(IJ.ij_max[r.regime]) + " par jour.");
    if (r.limite) notes.push("En activité libérale, la durée totale de l'arrêt ne peut pas dépasser " + IJ.duree_max_jours.liberal + " jours : "
      + (r.limite > 1 ? "les " + days(r.limite) + " suivants ne sont pas indemnisés." : "le jour suivant n'est pas indemnisé."));
    notes.push("Estimation selon la fiche officielle de service-public.fr ; le montant exact est calculé par votre caisse d'assurance maladie.");
    $("am-notice").className = "notice" + (r.limite || !r.eligible ? " warn" : "");
    set("am-notice", notes.join(" "));
  }

  if (!$("am-start").value) $("am-start").value = OF.today();
  if (!$("am-end").value) $("am-end").value = OF.addDays($("am-start").value, 12);
  OF.persistForm(form, "sick-pay");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
