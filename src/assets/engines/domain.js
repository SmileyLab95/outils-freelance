/*
 * Moteur : recherche de noms de domaine (documentation/33-noms-de-domaine.md). Mise en forme du nom voulu, variantes,
 * adresse RDAP à interroger (table des serveurs de l'IANA, data/rules/shared.json : rdap_servers) et lecture de la
 * réponse du registre (RFC 7480 : 200 l'objet existe, 404 le registre ne l'a pas, 429 trop de requêtes).
 * Testé par tests/unit/domain.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).domain = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAX = 63;                                   // longueur d'une étiquette (RFC 1035, § 2.3.4)
  var LIGATURES = { "œ": "oe", "æ": "ae", "ß": "ss", "ø": "o", "đ": "d", "ł": "l", "þ": "th", "ð": "d", "ı": "i" };

  /** Étiquette au format d'un nom de domaine : minuscules, sans accents, mots reliés par un tiret. */
  function slug(text) {
    var s = String(text == null ? "" : text).toLowerCase().replace(/[œæßøđłþðı]/g, function (c) { return LIGATURES[c]; });
    // NFD sépare les lettres de leurs accents (é → e + accent) ; le filtre des signes retire ensuite les accents.
    return s.normalize("NFD").replace(/[\s'’‘`._&+,;:/\\]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  /** Erreur d'une étiquette (RFC 1035 et RFC 5891, § 4.2.3.1), ou "" si elle est valable. */
  function labelError(label) {
    if (!label) return "empty";
    if (label.length > MAX) return "long";
    if (label.slice(2, 4) === "--") return "hyphens";   // réservé aux noms internationalisés (xn--)
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) return "chars";
    return "";
  }

  /**
   * Saisie → { label, typed, tld, unknownTld, changed, error }.
   * Adresse, « www. » et extension retirés : une extension connue (tlds) est rendue dans tld ; une extension de deux
   * lettres non vérifiable ici (.eu, .io…) dans unknownTld ; un autre point est lu comme un séparateur de mots
   * (« marie.dupont » → « marie-dupont »). changed : l'étiquette diffère de ce qui a été tapé (hors majuscules, qui ne
   * comptent pas dans un nom de domaine).
   */
  function normalize(input, tlds) {
    var typed = String(input == null ? "" : input).trim().toLowerCase();
    var s = typed.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/[/?#].*$/, "").replace(/^www\./, "").replace(/\.+$/, "");
    var tld = "", unknownTld = "";
    var known = (tlds || []).slice().sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < known.length; i++) {
      var end = "." + known[i];
      if (s.slice(-end.length) === end) { tld = known[i]; s = s.slice(0, -end.length); break; }
    }
    var two = /\.([a-z]{2})$/.exec(s);
    if (!tld && two && s.length > 3) { unknownTld = two[1]; s = s.slice(0, -3); }
    var label = slug(s);
    return { label: label, typed: typed, tld: tld, unknownTld: unknownTld, changed: label !== s, error: labelError(label) };
  }

  /**
   * Variantes du nom : sans tirets, nom-activité, activité-nom, nom-ville. Au plus 4, valables, sans doublon ni
   * le nom lui-même.
   */
  function variants(label, options) {
    var opts = options || {}, a = slug(opts.activity), c = slug(opts.city), out = [];
    var words = ("-" + label + "-");
    var add = function (v) { if (v && v !== label && out.indexOf(v) < 0 && !labelError(v)) out.push(v); };
    // Un mot déjà dans le nom n'est pas ajouté une seconde fois (« studio-lumiere » + « studio »).
    var fresh = function (w) { return w && words.indexOf("-" + w + "-") < 0; };
    add(label.replace(/-/g, ""));
    if (fresh(a)) { add(label + "-" + a); add(a + "-" + label); }
    if (fresh(c)) add(label + "-" + c);
    return out.slice(0, 4);
  }

  /** Adresse de la requête RDAP : <serveur>domain/<nom>.<extension> (RFC 9082, § 3.1.3). */
  function rdapUrl(servers, label, tld) {
    var base = servers[tld];
    if (!base) return "";
    return base + (base.slice(-1) === "/" ? "" : "/") + "domain/" + label + "." + tld;
  }

  /** Date d'un évènement RDAP (eventAction), si elle est lisible. */
  function eventDate(events, action) {
    for (var i = 0; i < (events || []).length; i++) {
      var e = events[i];
      if (e && e.eventAction === action && !isNaN(Date.parse(e.eventDate))) return e.eventDate;
    }
    return null;
  }

  /** Nom du registraire : entité de rôle « registrar », champ « fn » de sa vCard (RFC 9083, § 5.1). */
  function registrar(entities) {
    for (var i = 0; i < (entities || []).length; i++) {
      var e = entities[i];
      if (!e || (e.roles || []).indexOf("registrar") < 0 || !Array.isArray(e.vcardArray)) continue;
      var props = e.vcardArray[1] || [];
      for (var j = 0; j < props.length; j++) {
        if (props[j] && props[j][0] === "fn" && typeof props[j][3] === "string" && props[j][3].trim()) return props[j][3].trim();
      }
    }
    return null;
  }

  /**
   * Réponse du registre → { state, reason, created, expires, registrar, dropping }.
   * state : "taken" (200 et objet domaine), "free" (404 : probablement libre), "unknown" (reason : "rate" pour 429,
   * "error" sinon, dont une réponse 200 qui n'est pas un domaine). dropping : le statut contient l'un des statuts de
   * suppression (règle rdap_status_dropping). Les coordonnées du titulaire ne sont jamais lues.
   */
  function interpret(status, body, droppingStatuses) {
    var out = { state: "unknown", reason: "error", created: null, expires: null, registrar: null, dropping: false };
    if (status === 404) { out.state = "free"; out.reason = ""; return out; }
    if (status === 429) { out.reason = "rate"; return out; }
    if (status !== 200 || !body || body.objectClassName !== "domain") return out;
    var statuses = Array.isArray(body.status) ? body.status.map(function (s) { return String(s).toLowerCase(); }) : [];
    out.state = "taken";
    out.reason = "";
    out.created = eventDate(body.events, "registration");
    out.expires = eventDate(body.events, "expiration");
    out.registrar = registrar(body.entities);
    out.dropping = (droppingStatuses || []).some(function (s) { return statuses.indexOf(s) >= 0; });
    return out;
  }

  /** Lance fn(item) sur chaque élément, au plus limit à la fois ; la promesse rend les résultats dans l'ordre. */
  function pool(items, limit, fn) {
    var results = new Array(items.length), next = 0;
    function worker() {
      if (next >= items.length) return Promise.resolve();
      var i = next++;
      return Promise.resolve().then(function () { return fn(items[i], i); })
        .then(function (r) { results[i] = r; }, function (e) { results[i] = e; })
        .then(worker);
    }
    var workers = [];
    for (var k = 0; k < Math.max(1, Math.min(limit, items.length)); k++) workers.push(worker());
    return Promise.all(workers).then(function () { return results; });
  }

  return { slug: slug, labelError: labelError, normalize: normalize, variants: variants, rdapUrl: rdapUrl,
           interpret: interpret, pool: pool, MAX: MAX };
});
