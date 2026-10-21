/*
 * Typographie française du texte produit par les scripts des outils (résultats, messages, listes). Les règles sont
 * celles de data/typo-fr.json, que build.py applique déjà au texte des pages et place dans chaque page en français
 * (window.OF_TYPO) : une seule source. Spécification : documentation/15-guides-gestion.md, § 3.
 * Testé par tests/unit/typographie.test.mjs (parité avec build.py) et par le parcours navigateur (observateur).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).typoFR = api;
})(typeof self !== "undefined" ? self : this, function (root) {
  "use strict";

  /** Fonction de typographie à partir des règles : { find, replace } ou { find, group, spaces }. */
  function make(rules) {
    var compiled = rules.map(function (r) {
      var re = new RegExp(r.find, "g");
      if (r.group === undefined) return [re, r.replace];
      // Remplace les espaces du groupe indiqué (le groupe est à la fin de la correspondance).
      return [re, function (match) {
        var g = arguments[r.group], at = match.lastIndexOf(g);
        return match.slice(0, at) + g.replace(/ /g, r.spaces) + match.slice(at + g.length);
      }];
    });
    return function text(value) {
      var out = String(value);
      for (var i = 0; i < compiled.length; i++) out = out.replace(compiled[i][0], compiled[i][1]);
      return out;
    };
  }

  var api = { make: make };
  var doc = root && root.document;
  if (!doc || !root.OF_TYPO || !root.MutationObserver || (doc.documentElement.lang || "").slice(0, 2) !== "fr" || !doc.body) return api;
  api.text = make(root.OF_TYPO);

  // Le texte que les scripts ajoutent ou modifient est traité à la volée ; jamais dans script, style, code, pre,
  // textarea ni dans une zone modifiable.
  var SKIP = /^(SCRIPT|STYLE|CODE|PRE|TEXTAREA)$/;
  var rejected = function (el) { return SKIP.test(el.tagName) || el.isContentEditable; };
  function inside(node) {
    for (var el = node.nodeType === 1 ? node : node.parentElement; el; el = el.parentElement) if (rejected(el)) return true;
    return false;
  }
  function typeset(textNode) {
    var t = api.text(textNode.nodeValue);
    if (t !== textNode.nodeValue) textNode.nodeValue = t;
  }
  /** Un nœud ajouté ou modifié : ses ancêtres sont vérifiés une fois, puis ses descendants sans remonter. */
  function fix(node) {
    if ((node.nodeType !== 1 && node.nodeType !== 3) || inside(node)) return;
    if (node.nodeType === 3) { typeset(node); return; }
    var walker = doc.createTreeWalker(node, 1 | 4, {
      acceptNode: function (n) { return n.nodeType === 1 && rejected(n) ? 2 : 1; }   // 2 : ignore tout le sous-arbre
    });
    var n, texts = [];
    while ((n = walker.nextNode())) if (n.nodeType === 3) texts.push(n);
    texts.forEach(typeset);
  }
  var observer = new root.MutationObserver(function (records) {
    records.forEach(function (r) {
      if (r.type === "characterData") fix(r.target);
      else Array.prototype.forEach.call(r.addedNodes, fix);
    });
    observer.takeRecords();   // nos propres modifications : déjà traitées, la règle étant idempotente
  });
  observer.observe(doc.body, { childList: true, characterData: true, subtree: true });
  return api;
});
