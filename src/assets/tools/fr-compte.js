/* Compte bancaire de l'activité : relie le formulaire au moteur OFE.compteFR (règle des 10 000 € sur deux ans). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("bank-form");
  if (!form || !OFE || !OFE.compteFR || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  // ?today=AAAA-MM-JJ permet de vérifier le guide à une date donnée.
  var forced = /[?&]today=(\d{4}-\d{2}-\d{2})/.exec(window.location.search);
  var year = +(forced ? forced[1] : OF.today()).slice(0, 4);
  // Valeurs des règles (data/rules/fr.json) : seuil, mention « EI » et sa date.
  var RULE = R.compte_dedie_micro, SEUIL = OF.eur(RULE.seuil_ca, 0);
  var EI = R.compte_intitule_ei, DEPUIS = OF.date(EI.depuis, { day: "numeric", month: "long", year: "numeric" });
  var MENTION = "« " + EI.mention + " »", LONG = "« entrepreneur individuel »";
  var FIELDS = [["b-prev2", "prev2", year - 2], ["b-prev", "prev", year - 1], ["b-current", "current", year]];

  [["b-y2", year - 2], ["b-y1", year - 1], ["b-y0", year]].forEach(function (pair) {
    Array.prototype.forEach.call(document.getElementsByClassName(pair[0]), function (el) { el.textContent = pair[1]; });
  });

  var IBAN = ["Mettez l'IBAN de ce compte sur vos factures", "Le générateur de facture et l'Espace entrepreneur le reprennent sur chaque document."];
  var TITLE_IF = ["S'il est dédié à l'activité : intitulé " + MENTION, "Votre nom suivi de " + MENTION + " ou " + LONG + ", obligatoire pour tout compte dédié depuis le " + DEPUIS + "."];

  /** Étapes affichées sous la réponse : des obligations seulement quand le compte est (ou va être) obligatoire. */
  function steps(res) {
    switch (res.code) {
      case "micro-required":
      case "micro-required-end-of-year": return [
        ["Ouvrez un compte réservé à l'activité", "Un compte personnel convient s'il ne sert qu'à l'activité ; un compte professionnel aussi."],
        ["Intitulé : votre nom suivi de " + MENTION, "Ou " + LONG + " : c'est obligatoire pour tout compte dédié à l'activité depuis le " + DEPUIS + "."],
        ["Faites-y passer toutes les opérations de l'activité", "Paiements des clients et dépenses de l'activité ; pour vous rémunérer, un virement vers votre compte personnel."],
        IBAN];
      case "micro-watch": return [
        ["Préparez un compte réservé à l'activité", "Il deviendra obligatoire si votre chiffre d'affaires " + res.year + " dépasse aussi " + SEUIL + ". Un compte personnel convient s'il ne sert qu'à l'activité."],
        TITLE_IF, IBAN];
      case "micro-not-required": return [
        ["Conseillé : un compte réservé à l'activité", "Un compte personnel convient s'il ne sert qu'à l'activité ; vos encaissements sont plus simples à suivre et à justifier."],
        TITLE_IF, IBAN];
      case "ei": return [
        ["Séparez vos comptes", "Un compte pour l'activité, au moins pour les encaissements et les dépenses professionnelles : votre comptabilité au réel en sera plus simple."],
        TITLE_IF,
        ["Activité commerciale : un compte bancaire est obligatoire", "Tout commerçant doit avoir un compte dans un établissement de crédit (article L123-24 du Code de commerce)."]];
      default: return [
        ["Ouvrez le compte au nom de la société", "Les encaissements et les dépenses de la société y passent, séparés de vos comptes personnels."],
        ["Rémunération et remboursements par virement", "Votre rémunération, vos dividendes ou vos notes de frais passent du compte de la société au vôtre par virement."]];
    }
  }

  /** Réponse principale ; les années viennent du moteur (année à la fin de laquelle la condition est remplie). */
  function answer(res) {
    switch (res.code) {
      case "micro-required": return { positive: true, answer: "Oui, c'est obligatoire",
        sub: "Votre chiffre d'affaires a dépassé " + SEUIL + " en " + (res.year - 1) + " et en " + res.year + " : toutes les opérations de votre activité doivent passer par un compte qui lui est réservé." };
      case "micro-required-end-of-year": return { positive: true, answer: "Obligatoire fin " + res.year,
        sub: "Vous avez dépassé " + SEUIL + " en " + (res.year - 1) + " et votre estimation pour " + res.year + " dépasse aussi ce seuil : si elle se confirme, le compte dédié sera obligatoire à la fin de " + res.year + ". Préparez-le dès maintenant." };
      case "micro-watch": return { positive: false, answer: "Pas encore : à surveiller",
        sub: "Vous avez dépassé " + SEUIL + " en " + (res.year - 1) + " : si votre chiffre d'affaires " + res.year + " dépasse aussi ce seuil, le compte dédié deviendra obligatoire." };
      case "micro-not-required": return { positive: false, answer: "Pas obligatoire",
        sub: "Le compte dédié devient obligatoire après deux années civiles consécutives au-dessus de " + SEUIL + " de chiffre d'affaires. Il reste conseillé : vos encaissements sont plus simples à suivre et à justifier." };
      case "ei": return { positive: false, answer: "Pas d'obligation générale",
        sub: "Hors micro-entreprise, la loi n'impose pas de compte réservé à l'activité d'un entrepreneur individuel ; un commerçant doit cependant avoir un compte bancaire." };
      default: return { positive: true, answer: "Un compte à son nom",
        sub: "La société est une personne distincte de vous : ses encaissements et ses dépenses passent par un compte ouvert à son nom." };
    }
  }

  function compute() {
    var status = $("b-status").value, micro = status === "micro";
    Array.prototype.forEach.call(form.querySelectorAll("[data-micro]"), function (el) { el.hidden = !micro; });
    $("b-notice").hidden = !micro;
    // Montants lus comme ailleurs sur le site (OF.num) ; un montant illisible est signalé, pas ignoré en silence.
    var ca = {}, unreadable = [];
    FIELDS.forEach(function (f) {
      var el = $(f[0]), raw = el.value.trim(), n = OF.num(raw);
      var bad = micro && raw !== "" && !(isFinite(n) && n >= 0);
      el.setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad) unreadable.push(f[2]);
      ca[f[1]] = bad || raw === "" ? null : n;
    });
    var error = $("b-error");
    error.hidden = !unreadable.length;
    error.textContent = unreadable.length ? "Montant illisible pour " + unreadable.join(" et ") +
      " : saisissez un nombre, par exemple 12 500. La réponse ci-dessous n'en tient pas compte." : "";

    var res = OFE.compteFR.check({ status: status, year: year, ca: ca }, RULE), a = answer(res);
    $("b-answer").textContent = a.answer;
    $("b-sub").textContent = a.sub;
    $("b-hero").classList.toggle("is-negative", !a.positive);
    $("b-steps").innerHTML = steps(res).map(function (s) {
      return "<li><div><strong>" + esc(s[0]) + "</strong><span>" + esc(s[1]) + "</span></div></li>";
    }).join("") + '<li><div><strong>Une banque refuse ?</strong><span>Le droit au compte vous permet d\'obtenir un compte professionnel : <a href="#droit-au-compte">voir la procédure</a>.</span></div></li>';
  }

  OF.persistForm(form, "compte");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
