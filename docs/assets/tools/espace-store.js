/*
 * Stockage de l'Espace entrepreneur : IndexedDB (repli sur le stockage local), synchronisation entre onglets,
 * contrôle des sauvegardes importées. Aucune donnée n'est envoyée sur un serveur par ce fichier ; la synchronisation
 * chiffrée des comptes (tools/compte-sync.js) y garde aussi l'état du compte de l'appareil (getMeta, setMeta).
 * Schéma 1 tant que l'Espace reste local ; les données synchronisées sont au schéma 2 (suppressions marquées par
 * deletedAt) : les éléments marqués sont retirés au chargement, ce que la fusion traite comme une suppression.
 */
(function () {
  "use strict";
  var DB_NAME = "outils-freelance", STORE = "espace", SCHEMA = 1;
  var KEY = (document.body.getAttribute("data-section") || "fr");
  var LOCAL_KEY = "of:espace:" + KEY;
  var channel = "BroadcastChannel" in window ? new BroadcastChannel("of-espace-" + KEY) : null;

  function empty() {
    return { schema: SCHEMA, profile: null, clients: [], documents: [], settings: { lastExport: null }, savedAt: null };
  }

  // Une seule connexion à la base, ouverte au premier besoin puis réutilisée.
  var connection = null;
  function openDB() {
    if (connection) return connection;
    connection = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("IndexedDB indisponible"));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () {
        req.result.onversionchange = function () { req.result.close(); connection = null; };
        resolve(req.result);
      };
      req.onerror = function () { reject(req.error); };
    });
    connection.catch(function () { connection = null; });
    return connection;
  }

  function idb(mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var req = fn(tx.objectStore(STORE));
        tx.oncomplete = function () { resolve(req && req.result); };
        tx.onerror = tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  var isText = function (v) { return typeof v === "string"; };
  var isDate = function (v) { return isText(v) && /^\d{4}-\d{2}-\d{2}$/.test(v); };

  /** Vérifie qu'un objet a la forme d'un Espace (sauvegarde importée) ; renvoie un message d'erreur ou "". */
  function validate(data) {
    if (!data || typeof data !== "object") return "Ce fichier n'est pas une sauvegarde de l'Espace entrepreneur.";
    if (data.schema !== SCHEMA && data.schema !== 2) return "Cette sauvegarde vient d'une version de l'Espace que ce site ne sait pas lire.";
    if (!Array.isArray(data.clients) || !Array.isArray(data.documents)) return "Cette sauvegarde est incomplète.";
    if (data.profile !== null && data.profile !== undefined && (typeof data.profile !== "object" || !isText(data.profile.name))) {
      return "Le profil de cette sauvegarde est illisible.";
    }
    var badClient = data.clients.some(function (c) { return !c || !isText(c.id) || !isText(c.name); });
    var badDoc = data.documents.some(function (d) {
      return !d || !isText(d.id) || ["facture", "devis", "avoir"].indexOf(d.type) < 0 || !isText(d.status) || !isDate(d.date) ||
        !Array.isArray(d.lines) || (d.payments !== undefined && !Array.isArray(d.payments)) ||
        (d.payments || []).some(function (p) { return !p || !isDate(p.date) || !isFinite(Number(p.amount)); });
    });
    return badClient || badDoc ? "Cette sauvegarde contient des éléments illisibles." : "";
  }

  var live = function (x) { return x && !x.deletedAt; };

  /**
   * Complète les champs facultatifs absents (anciennes données, sauvegardes partielles) et retire les éléments
   * marqués supprimés (schéma 2) ; un document émis n'est jamais retiré (la fusion ignore déjà sa marque).
   */
  function normalise(data) {
    var out = Object.assign(empty(), data || {});
    out.settings = Object.assign({ lastExport: null }, out.settings || {});
    out.clients = out.clients.filter(live);
    out.documents = out.documents.filter(function (d) { return d && (!d.deletedAt || d.status !== "draft"); }).map(function (d) {
      var doc = Object.assign({ payments: [], lines: [], vat: { franchise: true, rate: 20, place: "fr" } }, d);
      delete doc.deletedAt;
      doc.payments = (doc.payments || []).filter(live);
      return doc;
    });
    return out;
  }

  var mode = "indexeddb";

  function load() {
    return idb("readonly", function (s) { return s.get(KEY); }).then(function (data) {
      return normalise(data);
    }, function () {
      mode = "local";
      try { return normalise(JSON.parse(localStorage.getItem(LOCAL_KEY) || "null")); } catch (e) { return empty(); }
    });
  }

  /**
   * Enregistre l'Espace. origin : « sync » quand l'enregistrement vient de la synchronisation des comptes (l'Espace
   * ouvert doit alors relire ses données), sinon une modification faite dans l'Espace. Les autres onglets sont
   * prévenus par BroadcastChannel, cet onglet par l'évènement « of-espace-saved ».
   */
  function save(data, origin) {
    data.savedAt = new Date().toISOString();
    // IndexedDB enregistre une copie (clonage structuré) : pas besoin de copier les données avant.
    var done = mode === "indexeddb"
      ? idb("readwrite", function (s) { return s.put(data, KEY); })
      : new Promise(function (resolve) { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); resolve(); });
    return done.then(function () {
      if (channel) channel.postMessage({ savedAt: data.savedAt });
      window.dispatchEvent(new CustomEvent("of-espace-saved", { detail: { savedAt: data.savedAt, origin: origin || "espace" } }));
    });
  }

  function onChange(fn) { if (channel) channel.onmessage = fn; }

  // État du compte de l'appareil (clé de chiffrement non exportable, dernière version synchronisée) : IndexedDB
  // seulement, car une clé WebCrypto ne s'écrit pas dans le stockage local.
  var META = function (name) { return name + ":" + KEY; };
  function getMeta(name) { return idb("readonly", function (s) { return s.get(META(name)); }).then(function (v) { return v || null; }); }
  function setMeta(name, value) { return idb("readwrite", function (s) { return s.put(value, META(name)); }); }
  function deleteMeta(name) { return idb("readwrite", function (s) { return s.delete(META(name)); }); }

  /** Demande au navigateur de ne pas effacer les données en cas de manque d'espace. */
  function persist() {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  window.EspaceStore = { SCHEMA: SCHEMA, empty: empty, load: load, save: save, validate: validate, normalise: normalise,
                         onChange: onChange, persist: persist, uid: uid, mode: function () { return mode; },
                         getMeta: getMeta, setMeta: setMeta, deleteMeta: deleteMeta };
})();
