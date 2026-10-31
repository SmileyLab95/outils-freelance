/*
 * Chômage de l'indépendant : conditions et montant de l'allocation des travailleurs indépendants (ATI). Moteur
 * OFE.protectionFR ; chiffres lus dans la règle ati_independants. Spécification : documentation/50-protection-sociale.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("ati-form");
  if (!form || !OFE || !OFE.protectionFR || !R || !R.ati_independants) return;
  var P = OFE.protectionFR, A = R.ati_independants;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var e0 = function (n) { return OF.eur(n, 0); };
  var e2 = function (n) { return OF.eur(n); };
  // Revenu retenu : au centime s'il n'est pas rond (9 999,66 € ne doit pas s'afficher « 10 000 € »).
  var eRev = function (n) { return Math.round(n) === n ? e0(n) : e2(n); };
  var longDate = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  var CAUSES = { liquidation: "liquidation judiciaire", redressement: "redressement judiciaire", non_viable: "activité économiquement non viable" };

  // Montant saisi : vide → 0 (année sans revenu) ; invalide → NaN, signalé sur le champ.
  function amount(id) {
    var raw = $(id).value.trim(), n = raw === "" ? 0 : OF.num(raw), bad = !(n >= 0);
    $(id).setAttribute("aria-invalid", String(bad));
    return bad ? NaN : n;
  }

  function texts(r, cause) {
    var plus = e0(A.revenu_minimum), seuil = e2(A.ressources_max_mois);
    return {
      cause: cause === "autre"
        ? "Votre fin d'activité doit être due à une liquidation ou un redressement judiciaire, ou à une activité qui n'était plus économiquement viable."
        : "Fin d'activité involontaire : " + CAUSES[cause] + ".",
      anciennete: (r.ok.anciennete ? "Au moins " : "Il faut au moins ") + A.anciennete_ans + " ans d'activité sans interruption dans la même entreprise.",
      revenu: r.ok.revenu
        ? "Revenu de plus de " + plus + " sur l'une des 2 dernières années (" + eRev(r.meilleur) + " retenus)."
        : "Il faut un revenu de plus de " + plus + " sur l'une des 2 dernières années ; le plus élevé retenu : " + eRev(r.meilleur) + ".",
      ressources: r.ok.ressources
        ? "Ressources personnelles inférieures à " + seuil + " par mois."
        : "Il faut des ressources personnelles inférieures à " + seuil + " par mois (personne seule).",
      baisse: r.ok.baisse
        ? "Baisse des revenus d'au moins " + Math.round(A.baisse_non_viable * 100) + " %, attestée par un tiers de confiance."
        : "Pour une activité non viable, il faut une baisse des revenus d'au moins " + Math.round(A.baisse_non_viable * 100) + " %, attestée par un tiers de confiance."
    };
  }

  function compute() {
    var cause = $("ati-cause").value, situation = $("ati-situation").value;
    var micro = !!(R.micro_activities || {})[situation];
    var judgement = cause === "liquidation" || cause === "redressement";
    $("ati-date-field").hidden = !judgement;
    $("ati-baisse-field").hidden = cause !== "non_viable";
    var what = micro ? "Chiffre d'affaires" : "Revenu d'activité";
    set("ati-rev1-label", what + " de la dernière année d'activité");
    set("ati-rev2-label", what + " de l'année précédente");

    var revs = [amount("ati-rev1"), amount("ati-rev2")], res = amount("ati-resources");
    var list = $("ati-checks"), step = $("ati-step"), notice = $("ati-notice");
    list.textContent = "";
    step.hidden = true;
    if (revs.some(isNaN) || isNaN(res)) {
      set("ati-big", "–");
      set("ati-sub", "Vérifiez les montants saisis.");
      notice.className = "notice warn";
      notice.textContent = "Saisissez des montants positifs, en euros (par exemple 24 000).";
      return;
    }
    var r = P.ati(R, {
      cause: cause, deuxAns: $("ati-two-years").checked, situation: situation, revenus: revs, ressources: res,
      baisse30: $("ati-baisse").checked, date: $("ati-date").value, mayotte: $("ati-mayotte").checked
    });
    r.ok = {};
    r.conditions.forEach(function (c) { r.ok[c.key] = c.ok; });
    var t = texts(r, cause);
    r.conditions.forEach(function (c) {
      var li = document.createElement("li");
      li.className = c.ok ? "is-ok" : "is-todo";
      li.textContent = (c.ok ? "✓ " : "✗ ") + t[c.key];
      list.appendChild(li);
    });
    var missing = r.conditions.filter(function (c) { return !c.ok; }).length;
    if (r.eligible) {
      set("ati-big", e2(r.jourMin) + " à " + e2(r.jourMax));
      set("ati-sub", "par jour pendant " + r.duree + " jours, soit " + e2(r.totalMin) + " à " + e2(r.totalMax) + " au total, selon vos revenus des 2 dernières années civiles.");
      step.hidden = false;
      step.className = "notice ok";
      step.textContent = "À faire : vous inscrire à France Travail"
        + (r.inscription ? " avant le " + longDate(r.inscription) + " (" + A.inscription_mois + " mois après le jugement)" : "")
        + ", rechercher un emploi et joindre à votre demande la copie de votre déclaration de cessation d'activité"
        + (cause === "non_viable" ? " et l'attestation du tiers de confiance." : ".");
    } else {
      set("ati-big", "Conditions non remplies");
      set("ati-sub", missing === 1 ? "Une condition n'est pas remplie : voir ci-dessous." : missing + " conditions ne sont pas remplies : voir ci-dessous.");
    }
    notice.className = "notice";
    notice.textContent = "Estimation à partir des conditions publiées par service-public.fr. Le montant exact, entre "
      + e2(r.jourMin) + " et " + e2(r.jourMax) + " par jour, est calculé par France Travail, qui examine votre dossier.";
  }

  OF.persistForm(form, "ati");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
