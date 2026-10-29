/*
 * Moteur : signature d'email professionnelle (documentation/43-signature-email.md). Mentions exigées lues dans les
 * règles de chaque pays (rules.email_signature : situations → champs requis), modèles de lignes et libellés dans la
 * page. Rendu HTML pour les messageries (tableau, styles intégrés, sans image) et texte brut. Fonctions pures, sans DOM.
 * Testé par tests/unit/signature.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).signature = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /** Accents proposés : contraste d'au moins 4,5:1 sur fond blanc (texte des liens). */
  var ACCENTS = { brand: "#c2410c", blue: "#1d4ed8", green: "#15803d", ink: "#1f2328" };

  /** Texte d'une ligne : espaces et retours à la ligne réduits à une espace ; les espaces insécables sont gardées, la fine
   *  insécable devient l'insécable, connue de toutes les messageries. */
  function clean(value) {
    return String(value == null ? "" : value).replace(/\u202f/g, "\u00a0").replace(/[ \t\r\n\f\v]+/g, " ").trim();
  }
  function esc(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /** Adresse web sûre (http ou https, avec un nom de domaine) ; « exemple.fr » devient « https://exemple.fr » ; "" sinon. */
  function web(value) {
    var url = clean(value);
    if (!url) return "";
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = "https://" + url;
    return /^https?:\/\/[^\s"'<>\/]+\.[^\s"'<>\/]+(\/[^\s"'<>]*)?$/i.test(url) ? url : "";
  }
  /** Adresse web sans « https:// » ni « www. » ni barre finale, pour l'affichage. */
  function shortUrl(url) { return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""); }
  function emailOk(value) { return /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/.test(clean(value)); }
  /** Lien « tel: » (chiffres et « + » initial, 6 à 15 chiffres), "" si le numéro n'en est pas un. */
  function tel(value) {
    var digits = clean(value).replace(/(?!^\+)[^\d]/g, "");
    return /^\+?\d{6,15}$/.test(digits) ? "tel:" + digits : "";
  }
  function digits(value) { return clean(value).replace(/[\s.  -]/g, ""); }

  /** Situation des règles (statut ou usage), null si inconnue. */
  function situation(rules, key) {
    var s = rules && rules.email_signature && rules.email_signature.situations;
    return s && Object.prototype.hasOwnProperty.call(s, key) ? s[key] : null;
  }

  /** Un champ requis est-il rempli correctement ? */
  function filled(input, key, rules) {
    var R = rules.email_signature;
    switch (key) {
      case "siren": return new RegExp("^\\d{" + R.siren_digits + "}$").test(digits(input.siren));
      case "registration": return input.activity === "commerciale" ? !!clean(input.city) : input.activity === "autre";
      case "name_or_business": return !!(clean(input.name) || clean(input.business));
      case "email": return emailOk(input.email);
      default: return !!clean(input[key]);
    }
  }

  /** Mentions requises pour la situation : [{ key, ok }] (vide si la situation n'exige rien ou est inconnue). */
  function check(input, rules) {
    var s = situation(rules, input.status);
    return (s ? s.required : []).map(function (key) { return { key: key, ok: filled(input, key, rules) }; });
  }

  /**
   * Remplit un modèle de ligne : segments séparés par « · » ; dans un segment, {champ} est remplacé, et une partie
   * entre crochets [ … ] n'apparaît que si tous ses champs sont remplis ; un segment dont un champ hors crochets est
   * vide est omis. Renvoie "" si aucun segment n'est complet.
   */
  function fill(line, values) {
    var missing = false;
    var sub = function (text) {
      return text.replace(/\{(\w+)\}/g, function (m, k) { if (!values[k]) missing = true; return values[k] || ""; });
    };
    return line.map(function (segment) {
      missing = false;
      var out = sub(segment.replace(/\[([^\]]*)\]/g, function (m, inner) {
        var keep = true;
        inner.replace(/\{(\w+)\}/g, function (n, k) { if (!values[k]) keep = false; return n; });
        return keep ? inner : "";
      }));
      return missing ? "" : out;
    }).filter(Boolean).join(" · ");
  }

  /**
   * Compose la signature : { name, sub, contacts: [{ text, href }], legal: [lignes], optout, colon, items: check() }.
   * input : name, role, status, business, address, phone, email, website, linkedin, siren, activity (« commerciale »
   * ou « autre »), city, form, capital (déjà mis en forme), company_number, uk_part.
   * L (textes de la page) : tpl[situation] (lignes de mentions), optout[situation], registration { rcs, rne },
   * uk_parts, limited_note, linkedin (libellé du lien), colon (« : » ou « : » selon la langue, texte brut).
   */
  function compose(input, rules, L) {
    var s = situation(rules, input.status) || {};
    var name = clean(input.name), business = clean(input.business), email = clean(input.email);
    var values = {
      name: name && s.name_suffix ? name + " " + s.name_suffix : name,
      business: business,
      name_or_business: business || name,
      address: clean(input.address),
      siren: filled(input, "siren", rules) ? digits(input.siren).replace(/(\d{3})(?=\d)/g, "$1 ") : "",
      registration: !filled(input, "registration", rules) ? ""
        : !L.registration ? "" : input.activity === "commerciale" ? L.registration.rcs.replace("{city}", clean(input.city)) : L.registration.rne,
      form: clean(input.form),
      capital: clean(input.capital),
      company_number: clean(input.company_number),
      uk_part: (L.uk_parts && L.uk_parts[input.uk_part]) || "",
      limited_note: business && !/\b(limited|ltd)\b/i.test(business) ? L.limited_note || "" : "",
      email: emailOk(email) ? email : ""
    };
    var legal = ((L.tpl && L.tpl[input.status]) || []).map(function (line) { return fill(line, values); }).filter(Boolean);
    var usesAddress = ((L.tpl && L.tpl[input.status]) || []).some(function (line) { return line.join("").indexOf("{address}") >= 0; });
    var contacts = [];
    if (clean(input.phone)) contacts.push({ text: clean(input.phone), href: tel(input.phone) });
    if (values.email) contacts.push({ text: values.email, href: "mailto:" + values.email });
    var site = web(input.website), linkedin = web(input.linkedin);
    if (site) contacts.push({ text: shortUrl(site), href: site });
    if (linkedin) contacts.push({ text: L.linkedin || "LinkedIn", href: linkedin });
    if (values.address && !usesAddress) contacts.push({ text: values.address, href: "" });
    var optout = L.optout && L.optout[input.status] ? fill([L.optout[input.status]], values) : "";
    return {
      name: values.name,
      sub: [clean(input.role), business].filter(Boolean).join(" · "),
      contacts: contacts,
      legal: legal,
      optout: optout,
      colon: L.colon || ": ",
      items: check(input, rules)
    };
  }

  /** Signature en HTML pour les messageries : tableau, styles intégrés, liens https, mailto et tel seulement. */
  function html(sig, accent) {
    var color = ACCENTS[accent] || ACCENTS.brand;
    // Mentions et ligne de désabonnement lisibles, pas en petits caractères (« clear and conspicuous », « clairs et
    // facilement lisibles ») : 12 px, contraste d'environ 7,9:1 sur fond blanc.
    var muted = "color:#4b5158;font-size:12px;line-height:1.45;";
    var link = function (c) {
      return c.href ? '<a href="' + esc(c.href) + '" style="color:' + color + ';text-decoration:none;">' + esc(c.text) + "</a>" : esc(c.text);
    };
    var rows = [];
    if (sig.name) rows.push('<div style="font-size:15px;font-weight:bold;color:#1f2328;">' + esc(sig.name) + "</div>");
    if (sig.sub) rows.push('<div style="font-size:13px;color:#3d4248;">' + esc(sig.sub) + "</div>");
    if (sig.contacts.length) rows.push('<div style="font-size:13px;margin-top:6px;color:#3d4248;">' + sig.contacts.map(link).join(" &middot; ") + "</div>");
    if (sig.legal.length) rows.push('<div style="margin-top:8px;' + muted + '">' + sig.legal.map(esc).join("<br>") + "</div>");
    if (sig.optout) rows.push('<div style="margin-top:4px;' + muted + '">' + esc(sig.optout) + "</div>");
    if (!rows.length) return "";
    return '<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">' +
      '<tr><td style="border-left:3px solid ' + color + ';padding:2px 0 2px 12px;">' + rows.join("") + "</td></tr></table>";
  }

  /** Même signature en texte brut (une ligne par bloc de la version HTML) ; adresses web écrites en entier. */
  function text(sig) {
    return [sig.name, sig.sub, sig.contacts.map(function (c) {
      if (c.href.indexOf("http") !== 0) return c.text;
      return c.text === shortUrl(c.href) ? c.href : c.text + sig.colon + c.href;
    }).join(" · ")].concat(sig.legal, [sig.optout]).filter(Boolean).join("\n");
  }

  return { ACCENTS: ACCENTS, esc: esc, web: web, tel: tel, emailOk: emailOk, situation: situation, check: check,
    fill: fill, compose: compose, html: html, text: text };
});
