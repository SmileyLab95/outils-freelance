/*
 * Checklist (mentions obligatoires d'une facture…) : barre de progression et message selon le nombre de points
 * cochés. Textes dans la page, sur la liste #checklist : data-score (« {done} sur {total} mentions »), data-all,
 * data-none, data-missing-one et data-missing-many (« {missing} »). Filtres facultatifs : les champs de #cl-filters
 * décrivent la situation (mémorisée s'ils portent data-save) ; un point marqué data-when="clé=valeur", "clé" ou
 * "!clé" (plusieurs conditions séparées par des espaces : toutes requises) n'est montré et compté que si la situation
 * y répond, et tout élément marqué data-show-when n'est montré que dans ce cas. Un point data-optional (recommandé,
 * non obligatoire) est montré mais n'entre pas dans le compte. Un intertitre (li.cl-group, sans case) n'est jamais
 * compté. Avec data-persist="clé" sur la liste, les cases cochées sont mémorisées (étapes repérées par data-id).
 */
(function () {
  "use strict";
  var list = document.getElementById("checklist");
  if (!list) return;
  var filters = document.getElementById("cl-filters");
  var bar = document.getElementById("cl-bar");
  var score = document.getElementById("cl-score");
  var msg = document.getElementById("cl-msg");
  var D = list.dataset;
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };

  /** Situation décrite par les filtres : { clé: valeur } (boutons radio et listes) ou { clé: vrai/faux } (cases). */
  function situation() {
    var s = {};
    if (!filters) return s;
    Array.prototype.forEach.call(filters.querySelectorAll("input, select"), function (el) {
      if (el.type === "radio") { if (el.checked) s[el.name] = el.value; }
      else if (el.type === "checkbox") s[el.name] = el.checked;
      else s[el.name] = el.value;
    });
    return s;
  }
  // Une condition illisible est signalée (erreur visible dans les tests) et ne masque pas le point.
  function applies(conds, s) {
    return !conds || conds.trim().split(/\s+/).every(function (cond) {
      var m = /^(!?)([\w-]+)(?:=([\w-]+))?$/.exec(cond);
      if (!m) { console.error("checklist : condition illisible « " + cond + " »"); return true; }
      var ok = m[3] !== undefined ? String(s[m[2]]) === m[3] : !!s[m[2]];
      return m[1] ? !ok : ok;
    });
  }

  function update() {
    var s = situation(), done = 0, total = 0;
    Array.prototype.forEach.call(list.children, function (li) {
      var shown = applies(li.getAttribute("data-when"), s), box = li.querySelector("input[type=checkbox]");
      li.hidden = !shown;
      if (!shown || !box || li.hasAttribute("data-optional")) return;
      total++;
      if (box.checked) done++;
    });
    if (filters) Array.prototype.forEach.call(document.querySelectorAll("[data-show-when]"), function (el) {
      el.hidden = !applies(el.getAttribute("data-show-when"), s);
    });
    bar.style.width = (total ? done / total * 100 : 0) + "%";
    score.textContent = fill(D.score, { done: done, total: total });
    var missing = total - done;
    msg.className = "notice " + (missing === 0 && total > 0 ? "ok" : "warn");
    msg.textContent = missing === 0 && total > 0 ? D.all : done === 0 ? D.none
      : fill(missing > 1 ? D.missingMany : D.missingOne, { missing: missing });
  }
  // Cases mémorisées : une démarche faite reste cochée d'une visite à l'autre. Une liste mémorisée garde aussi sa
  // situation sous sa propre clé : persistForm remplace tout l'objet enregistré, et une clé partagée entre deux
  // listes d'une même section effacerait les réponses de l'autre.
  var persist = list.getAttribute("data-persist");
  if (filters) {
    window.OF.persistForm(filters, persist ? persist + "-situation" : "checklist");
    filters.addEventListener("change", update);
  }
  if (persist) {
    var done = window.OF.load(persist, {});
    Array.prototype.forEach.call(list.querySelectorAll("li[data-id] input[type=checkbox]"), function (box) {
      box.checked = !!done[box.closest("li").getAttribute("data-id")];
    });
    list.addEventListener("change", function (e) {
      var li = e.target.closest("li[data-id]");
      if (!li || e.target.type !== "checkbox") return;
      var id = li.getAttribute("data-id");
      done[id] = e.target.checked;
      window.OF.save(persist, done);
      // Variantes d'une même étape selon la situation (même data-id) : cochées ensemble.
      Array.prototype.forEach.call(list.querySelectorAll('li[data-id="' + id + '"] input[type=checkbox]'), function (b) { b.checked = e.target.checked; });
    });
  }
  list.addEventListener("change", update);
  update();
})();
