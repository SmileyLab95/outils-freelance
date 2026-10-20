/* Générateur de relance de facture impayée : choisit le niveau selon le retard et rédige le message. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("relance-form");
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var v = function (id, fallback) { var x = ($(id).value || "").trim(); return x || fallback; };
  var stage = null; // null : niveau choisi automatiquement selon le retard

  function stageFor(late) {
    if (late >= 30) return 3;
    if (late >= 20) return 2;
    if (late >= 10) return 1;
    return 0;
  }

  function message(s) {
    var contact = v("r-contact", "[Prénom]");
    var num = v("r-number", "[numéro]");
    var amountValue = OF.num($("r-amount").value);
    var amount = isFinite(amountValue) ? OF.eur(amountValue) : "[montant] €";
    var due = $("r-due").value ? OF.frDate($("r-due").value) : "[date d'échéance]";
    var issue = $("r-issue").value ? OF.frDate($("r-issue").value) : "[date de la facture]";
    var me = v("r-me", "[Votre prénom]");
    var penalty = v("r-penalty", "trois fois le taux d'intérêt légal");
    var previous = v("r-previous", "[dates de vos relances]");
    if (s === 0) return {
      subject: "Petit rappel : facture " + num,
      body: "Bonjour " + contact + ",\n\nSauf erreur de ma part, la facture " + num + " de " + amount + ", arrivée à échéance le " + due +
        ", ne semble pas encore réglée.\n\nIl s'agit sans doute d'un simple oubli : je vous la remets en pièce jointe. Si le paiement est déjà parti, merci d'ignorer ce message.\n\nBonne journée,\n" + me
    };
    if (s === 1) return {
      subject: "Facture " + num + " en attente de règlement",
      body: "Bonjour " + contact + ",\n\nJe reviens vers vous au sujet de la facture " + num + " de " + amount + ", échue depuis le " + due +
        ".\n\nPourriez-vous m'indiquer la date de paiement prévue ? S'il y a un blocage (validation interne, bon de commande, coordonnées bancaires), je peux vous aider à le lever.\n\nMerci par avance,\n" + me
    };
    if (s === 2) return {
      subject: "Facture " + num + " impayée : action requise",
      body: "Bonjour " + contact + ",\n\nMalgré mes précédents messages, la facture " + num + " de " + amount + ", échue le " + due +
        ", reste impayée.\n\nJe vous rappelle que, conformément à mes conditions générales et à l'article L441-10 du Code de commerce, tout retard entraîne des pénalités de retard au taux de " +
        penalty + " ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement.\n\nJe vous remercie de procéder au règlement sous 8 jours.\n\n" + me
    };
    var today = OF.frDate(OF.today());
    return {
      subject: "Mise en demeure de payer : facture n° " + num,
      body: v("r-me-address", "[Vos nom, adresse et SIRET]") + "\n\n" + v("r-company", "[Raison sociale et adresse du client]") +
        "\n\nÀ " + v("r-city", "[ville]") + ", le " + today + "\n\nLettre recommandée avec accusé de réception\n\nObjet : mise en demeure de payer, facture n° " + num +
        "\n\nMadame, Monsieur,\n\nPar la présente, je vous mets en demeure de me régler la somme de " + amount + " correspondant à la facture n° " + num +
        " du " + issue + ", échue le " + due + " et restée impayée malgré mes relances des " + previous +
        ".\n\nÀ cette somme s'ajoutent les pénalités de retard au taux de " + penalty +
        " ainsi que l'indemnité forfaitaire de 40 € pour frais de recouvrement (articles L441-10 et D441-5 du Code de commerce).\n\nÀ défaut de paiement sous 8 jours à compter de la réception de ce courrier, je me verrai contraint(e) d'engager une procédure de recouvrement judiciaire, sans autre avis.\n\nVeuillez agréer, Madame, Monsieur, mes salutations distinguées.\n\n" + me
    };
  }

  function render() {
    var late = $("r-due").value ? OF.daysBetween($("r-due").value, OF.today()) : NaN;
    var auto = isFinite(late) ? stageFor(late) : 0;
    var s = stage === null ? auto : stage;
    var status = $("r-status");
    if (!isFinite(late)) {
      status.className = "notice";
      status.textContent = "Indiquez la date d'échéance : l'outil choisira le bon niveau de relance.";
    } else if (late < 0) {
      status.className = "notice ok";
      status.textContent = "Cette facture n'est pas encore échue (échéance dans " + (-late) + " jour" + (-late > 1 ? "s" : "") + "). Inutile de relancer pour l'instant.";
    } else if (late < 3) {
      status.className = "notice";
      status.textContent = "Échue depuis " + late + " jour" + (late > 1 ? "s" : "") + ". Attendez J+3 pour envoyer un rappel courtois.";
    } else {
      status.className = "notice " + (late >= 20 ? "warn" : "gold");
      status.textContent = "Retard de " + late + " jours : niveau conseillé « " + ["rappel courtois", "relance", "relance ferme", "mise en demeure"][auto] + " ».";
    }
    $("r-tabs").querySelectorAll(".tab").forEach(function (t) {
      var n = Number(t.getAttribute("data-stage"));
      t.setAttribute("aria-selected", String(n === s));
      t.innerHTML = t.textContent.replace(" ★", "") + (n === auto && isFinite(late) && late >= 3 ? " ★" : "");
    });
    var m = message(s);
    $("r-subject").innerHTML = "<b>Objet :</b> " + OF.highlight(m.subject);
    $("r-body").innerHTML = OF.highlight(m.body);
    $("r-mail").href = "mailto:" + encodeURIComponent(v("r-email", "")) + "?subject=" + encodeURIComponent(m.subject) +
      "&body=" + encodeURIComponent(m.body);
    $("r-mail").hidden = s === 3;
  }

  $("r-tabs").addEventListener("click", function (e) {
    var tab = e.target.closest(".tab");
    if (!tab) return;
    stage = Number(tab.getAttribute("data-stage"));
    render();
  });
  $("r-copy").addEventListener("click", function () {
    var m = message(stage === null ? stageFor(OF.daysBetween($("r-due").value, OF.today()) || 0) : stage);
    OF.copy("Objet : " + m.subject + "\n\n" + m.body, this);
  });

  OF.persistForm(form, "relance");
  form.addEventListener("input", function (e) {
    if (e.target.id === "r-due") stage = null; // nouvelle échéance : on revient au niveau conseillé
    render();
  });
  form.addEventListener("change", render);
  render();
})();
