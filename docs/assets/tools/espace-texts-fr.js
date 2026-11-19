/*
 * Textes de l'Espace entrepreneur en français (documentation/60-espace-etats-unis.md, § 3, étape 1).
 * Clés groupées par écran ; « {nom} » est remplacé par la valeur que donne tools/espace.js. Chaque langue a son
 * fichier (même clés) ; une variante régionale (« fr-CA ») ne redéfinit que ce qui change.
 * tests/unit/espace-textes.test.mjs vérifie que chaque clé utilisée existe et que chaque clé sert.
 */
(function (root) {
  "use strict";
  var T = root.OF_ESPACE_TEXTS = root.OF_ESPACE_TEXTS || {};
  T.fr = {
    // Activités et régimes de TVA (profil, France).
    "activity.liberal_bnc": "Profession libérale (BNC)",
    "activity.cipav": "Profession libérale relevant de la CIPAV",
    "activity.services_bic": "Prestations de services commerciales (BIC)",
    "activity.artisan": "Activité artisanale (BIC)",
    "activity.vente": "Vente de marchandises (BIC)",
    "activity.real": "Je ne suis pas en micro-entreprise",
    "activity.none": "Aucune",
    "vat.franchise": "Franchise en base (pas de TVA)",
    "vat.simplified": "Régime réel simplifié de TVA",
    "vat.normal": "Régime réel normal de TVA",
    // Documents : types, titres, états.
    "type.facture": "Facture",
    "type.devis": "Devis",
    "type.avoir": "Avoir",
    "new.facture": "Nouvelle facture",
    "new.devis": "Nouveau devis",
    "new.avoir": "Nouvel avoir",
    "state.draft": "Brouillon",
    "state.unpaid": "À encaisser",
    "state.overdue": "En retard",
    "state.partial": "Payée en partie",
    "state.paid": "Payée",
    "state.sent": "Envoyé",
    "state.accepted": "Accepté",
    "state.refused": "Refusé",
    "state.invoiced": "Facturé",
    "state.issued": "Émis",
    "state.refunded": "Remboursé",
    "state.cancelled": "Annulée par avoir",
    "state.imputed": "Imputé sur la facture",
    "state.refund": "À rembourser",
    // Délais de paiement.
    "terms.receipt": "À réception",
    "terms.days": "{n} jours"
  };
})(typeof self !== "undefined" ? self : this);
