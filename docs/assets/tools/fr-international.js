/* Facturer un client étranger : TVA applicable, mentions de la facture et obligations, selon le client et la prestation. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("intl-form");
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var DIR = "directive 2006/112/CE";

  function franchiseText() {
    return OF.today() >= "2027-01-01" ? "TVA non applicable, art. L. 233-3 du CIBS (ex-art. 293 B du CGI)" : "TVA non applicable, art. 293 B du CGI";
  }

  /** Règle de TVA applicable : verdict, explication, mentions et obligations. */
  function decide(v) {
    var franchise = v.regime === "franchise";
    var french = franchise
      ? { verdict: "Pas de TVA (franchise)", why: "La prestation est imposable en France, mais vous êtes en franchise en base.", mentions: [franchiseText()] }
      : { verdict: "TVA française", why: "La prestation est imposable en France : facturez la TVA française, au taux normal de 20 % le plus souvent.", mentions: ["Taux et montant de la TVA, total TTC"] };
    if (v.country === "fr") return Object.assign(french, { obligations: [] });

    if (v.client === "pro") {
      var proofs = "Gardez la preuve que votre client est une entreprise (numéro d'immatriculation, site, échanges).";
      if (v.country === "eu") {
        return {
          verdict: "Autoliquidation par le client",
          why: "Entre entreprises, un service est imposable dans le pays du client : c'est lui qui déclare la TVA de son pays. Vous facturez hors taxes" + (franchise ? ", même en franchise en base." : "."),
          mentions: ["Autoliquidation : TVA due par le preneur (art. 196 de la " + DIR + ")", "Votre numéro de TVA intracommunautaire", "Le numéro de TVA intracommunautaire du client"],
          obligations: [
            franchise ? "Demandez un numéro de TVA intracommunautaire à votre service des impôts des entreprises (SIE) : vous restez en franchise pour vos clients français." : "Utilisez votre numéro de TVA intracommunautaire habituel.",
            "Vérifiez le numéro de TVA du client sur le service VIES de la Commission européenne, et gardez une capture.",
            "Déposez chaque mois concerné une déclaration européenne de services (DES) sur douane.gouv.fr, au plus tard le 10e jour ouvrable du mois suivant.",
            proofs]
        };
      }
      return {
        verdict: "Pas de TVA française",
        why: "Entre entreprises, un service est imposable dans le pays du client : hors de l'Union européenne, il échappe à la TVA française. Une taxe locale peut s'appliquer dans le pays du client, à sa charge.",
        mentions: ["TVA non applicable : prestation de services dont le lieu est hors de France (art. 44 de la " + DIR + ")"],
        obligations: [proofs, "Pas de déclaration européenne de services pour un client hors de l'UE."]
      };
    }

    // Particulier
    if (v.service === "digital" && v.country === "eu") {
      var over = v.oss === "over";
      return {
        verdict: over ? "TVA du pays du client (guichet OSS)" : french.verdict,
        why: over
          ? "Au-delà de 10 000 € par an de services numériques vendus à des particuliers d'autres pays de l'UE, la TVA du pays du client s'applique. Vous la déclarez et la payez en France via le guichet unique OSS."
          : "Sous le seuil de 10 000 € par an de ventes à distance à des particuliers de l'UE, les règles françaises s'appliquent. " + french.why,
        mentions: over ? ["Taux et montant de la TVA du pays du client, total TTC"] : french.mentions,
        obligations: over ? ["Inscrivez-vous au guichet unique OSS dans votre espace professionnel impots.gouv.fr.", "Déposez la déclaration OSS chaque trimestre."] : ["Suivez vos ventes numériques aux particuliers de l'UE : le seuil de 10 000 € s'apprécie sur l'année civile et l'année précédente."]
      };
    }
    if (v.country === "world" && v.service !== "other") {
      return {
        verdict: "Pas de TVA française",
        why: "Les services immatériels (conseil, informatique, création, publicité, services numériques…) rendus à un particulier établi hors de l'UE sont imposables hors de l'Union.",
        mentions: ["TVA non applicable : prestation de services dont le lieu est hors de l'Union européenne (art. 59 de la " + DIR + ")"],
        obligations: ["Gardez la preuve que votre client réside hors de l'UE (adresse, moyen de paiement, échanges)."]
      };
    }
    return Object.assign(french, {
      why: "Pour un particulier, un service est en principe imposable là où vous êtes établi. " + french.why,
      obligations: []
    });
  }

  function compute() {
    var v = { regime: $("i-regime").value, country: $("i-country").value, client: $("i-client").value, service: $("i-service").value, oss: $("i-oss").value };
    $("i-client-field").hidden = v.country === "fr";
    $("i-service-field").hidden = v.country === "fr" || v.client === "pro";
    $("i-oss-field").hidden = !(v.country === "eu" && v.client === "private" && v.service === "digital");
    var r = decide(v);
    set("i-verdict", r.verdict);
    set("i-why", r.why);
    $("i-mentions").innerHTML = r.mentions.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("");
    $("i-obligations-card").hidden = !r.obligations.length;
    $("i-obligations").innerHTML = r.obligations.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("");
  }

  OF.persistForm(form, "international");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
