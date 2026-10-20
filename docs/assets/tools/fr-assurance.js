/* Assurances de l'indépendant : relie le formulaire au moteur OFE.assuranceFR (obligations, conseils, mentions). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE;
  var form = document.getElementById("ins-form");
  if (!form || !OFE || !OFE.assuranceFR) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };

  var ITEMS = {
    "decennale": ["Assurance de responsabilité décennale", "Obligatoire pour les travaux qui engagent votre responsabilité décennale, à justifier à l'ouverture de chaque chantier (article L241-1 du Code des assurances). Les simples travaux d'entretien en sont dispensés."],
    "rc-batiment": ["À vérifier : responsabilité civile professionnelle", "Le ministère de l'Économie la cite parmi les assurances des professionnels du bâtiment, et les clients l'exigent souvent : vérifiez avec votre assureur ou votre organisation professionnelle si votre métier l'impose."],
    "rc-profession": ["Responsabilité civile professionnelle", "Le texte qui encadre votre profession fixe l'obligation et ses conditions (responsabilité civile médicale pour la santé, par exemple) : vérifiez-les auprès de votre ordre ou de votre organisme professionnel."],
    "rc-auto": ["Responsabilité civile automobile", "Tout véhicule à moteur doit être assuré ; signalez à votre assureur l'usage professionnel du véhicule."],
    "rc-pro": ["Conseillé : responsabilité civile professionnelle", "Pas obligatoire en règle générale pour votre activité, mais souvent demandée par les clients : elle couvre les dommages que vous pourriez leur causer."],
    "rc-metier": ["À vérifier : votre métier peut imposer une assurance", "Certains métiers de l'artisanat sont soumis à une obligation : consultez la fiche de votre activité (Bpifrance Création, chambre de métiers et de l'artisanat). Sinon, la responsabilité civile professionnelle reste conseillée."]
  };
  var HERO = {
    construction: { positive: true, answer: "Oui : la décennale",
      sub: "Pour les travaux de construction, l'assurance de responsabilité décennale est obligatoire. La responsabilité civile professionnelle est à vérifier pour votre métier." },
    reglementee: { positive: true, answer: "Oui, selon votre profession",
      sub: "Selon le ministère de l'Économie, les obligations d'assurance concernent surtout les professions réglementées : le texte de votre profession fixe les vôtres." },
    artisan: { positive: false, answer: "À vérifier pour votre métier",
      sub: "Il n'y a pas d'obligation générale : certains métiers de l'artisanat en ont une. Consultez la fiche de votre activité." },
    services: { positive: false, answer: "Pas en règle générale",
      sub: "Aucune assurance professionnelle n'est imposée à votre activité en règle générale, mais la responsabilité civile professionnelle reste conseillée." }
  };
  HERO.commerce = HERO.services;
  var DOCUMENTS = {
    "attestation": "Sur vos devis et factures : joignez l'attestation d'assurance décennale, établie selon le modèle officiel, à chaque devis et à chaque facture (article L243-2 du Code des assurances). Pour des travaux non soumis à la décennale, un artisan ou un micro-entrepreneur dont l'activité exige une assurance l'indique sur ses devis et factures (article L132-1 du Code de l'artisanat).",
    "mention": "Sur vos devis et factures : indiquez l'assurance souscrite, les coordonnées de l'assureur et la couverture géographique du contrat (article L132-1 du Code de l'artisanat).",
    "mention-if-required": "Sur vos devis et factures : si votre métier impose une assurance, indiquez l'assurance souscrite, les coordonnées de l'assureur et la couverture géographique (article L132-1 du Code de l'artisanat). Sinon, aucune mention n'est exigée.",
    "none": "Sur vos devis et factures : le Code de l'artisanat n'exige de mention d'assurance que des artisans et des micro-entrepreneurs ; le texte de votre profession peut en prévoir une."
  };

  function compute() {
    var activity = $("a-activity").value;
    // L'artisanat hors bâtiment suppose l'immatriculation au secteur des métiers : la case n'a alors pas d'effet.
    $("a-artisan-field").hidden = activity === "artisan";
    var res = OFE.assuranceFR.check({ activity: activity, micro: $("a-micro").checked, artisan: $("a-artisan").checked, vehicle: $("a-vehicle").checked });
    var hero = HERO[res.activity];
    var vehicle = res.required.indexOf("rc-auto") > -1;
    $("a-answer").textContent = hero.answer;
    $("a-sub").textContent = hero.sub + (vehicle ? " Votre véhicule doit, lui, être assuré en responsabilité civile (voir ci-dessous)." : "");
    $("a-hero").classList.toggle("is-negative", !hero.positive);
    $("a-list").innerHTML = res.required.concat(res.recommended).map(function (key) {
      var item = ITEMS[key], required = res.required.indexOf(key) > -1;
      return "<li><div><strong>" + (required ? "Obligatoire : " : "") + esc(item[0]) + "</strong><span>" + esc(item[1]) + "</span></div></li>";
    }).join("");
    $("a-documents").textContent = DOCUMENTS[res.documents];
  }

  OF.persistForm(form, "assurance");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
