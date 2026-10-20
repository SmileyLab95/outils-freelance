/* Checklist des mentions obligatoires : barre de progression et message selon le nombre de mentions cochées. */
(function () {
  "use strict";
  var list = document.getElementById("checklist");
  if (!list) return;
  var boxes = list.querySelectorAll("input[type=checkbox]");
  var bar = document.getElementById("cl-bar");
  var score = document.getElementById("cl-score");
  var msg = document.getElementById("cl-msg");

  function update() {
    var done = Array.prototype.filter.call(boxes, function (b) { return b.checked; }).length;
    var total = boxes.length;
    bar.style.width = (done / total * 100) + "%";
    score.textContent = done + " sur " + total + " mentions";
    if (done === total) {
      msg.className = "notice ok";
      msg.textContent = "Bravo : votre facture contient toutes les mentions essentielles.";
    } else if (done === 0) {
      msg.className = "notice warn";
      msg.textContent = "Cochez les mentions présentes sur votre facture.";
    } else {
      msg.className = "notice warn";
      msg.textContent = "Il manque " + (total - done) + " mention" + (total - done > 1 ? "s" : "") +
        ". Les points non cochés sont à ajouter avant d'envoyer votre facture.";
    }
  }
  list.addEventListener("change", update);
  update();
})();
