/*
 * Moteur : premiers pas du compte gratuit (documentation/34-inscription-compte-gratuit.md, § 4). Étapes cochées
 * d'après les données de l'Espace (profil, documents) et le nombre de clés d'accès du compte ; outils suggérés selon
 * l'activité (micro-entreprise ou non). Aucun chiffre officiel. Testé par tests/unit/first-steps.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).firstSteps = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var filled = function (v) { return typeof v === "string" && v.trim() !== ""; };

  /**
   * input : { profile, documents, passkeys (nombre, ou null si l'appareil ne sait pas créer de clé d'accès),
   *           microActivities (règle micro_activities : activités de la micro-entreprise) }.
   * Renvoie { steps: [{ id, done }], done, total, complete, tools: [ids] } ; l'étape « clé d'accès » est absente
   * quand l'appareil ne la permet pas.
   */
  function steps(input) {
    var p = input.profile || null, docs = input.documents || [];
    var list = [
      { id: "profile", done: !!p && filled(p.name) },
      { id: "mentions", done: !!p && filled(p.address) && filled(p.siret) },
      { id: "document", done: docs.some(function (d) { return d && (d.type === "devis" || d.type === "facture"); }) },
    ];
    if (input.passkeys !== null && input.passkeys !== undefined) list.push({ id: "passkey", done: Number(input.passkeys) > 0 });
    var done = list.filter(function (s) { return s.done; }).length;
    var micro = !!p && !!(input.microActivities || {})[p.activity];
    // Outils suggérés : ceux de la micro-entreprise si l'activité en est une, la facturation électronique sinon ;
    // la recherche de nom de domaine dans tous les cas.
    var tools = (micro ? ["tax", "calendar"] : p ? ["einvoicing"] : []).concat(["domain"]);
    return { steps: list, done: done, total: list.length, complete: done === list.length, tools: tools };
  }

  return { steps: steps };
});
