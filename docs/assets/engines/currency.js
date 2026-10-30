/*
 * Moteur : conversion d'un montant en devise aux taux de référence officiels (BCE, HMRC, Banque du Canada) ou à un
 * taux saisi, TVA dans la monnaie du pays. Spécification : documentation/49-devises.md. Fonctions pures, testées par
 * tests/unit/currency.test.mjs ; les adresses des sources et la liste des devises viennent de la règle
 * fx_reference_sources (data/rules/shared.json).
 *
 * Un taux est { value, per } : per « home » = unités de devise pour 1 unité de la monnaie du pays (BCE, HMRC :
 * 1,1130 $ pour 1 €) ; per « foreign » = unités de la monnaie du pays pour 1 unité de devise (Banque du Canada :
 * 1,3960 $ CA pour 1 $ US).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).currency = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

  /** Vrai pour une date AAAA-MM-JJ qui existe (pas de 31 avril). */
  function validDate(iso) {
    var m = ISO.exec(iso || "");
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }

  function addDays(iso, days) {
    var m = ISO.exec(iso);
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + days));
    return d.toISOString().slice(0, 10);
  }

  /** Arrondi au centime, sans bruit de virgule flottante (898,465 → 898,47, même stocké 898,46499…). */
  function round2(x) {
    var cents = Number((Math.abs(x) * 100).toPrecision(12));
    return (x < 0 ? -1 : 1) * Math.round(cents) / 100;
  }

  /** Taux saisi (« 1,1130 », « 1.113 ») : nombre strictement positif, ou null. Pas de séparateur de milliers. */
  function parseRate(raw) {
    var clean = String(raw == null ? "" : raw).trim().replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(clean) && !/^\.\d+$/.test(clean)) return null;
    var n = Number(clean);
    return isFinite(n) && n > 0 ? n : null;
  }

  /** Remplace {clé} par vars.clé (clé absente : laissée telle quelle, pour que les tests la voient). */
  function fill(text, vars) {
    return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  }

  // ---- Adresses des sources ----

  function ecbUrl(sources, currency, date) {
    return fill(sources.ecb, { currency: currency, start: addDays(date, -sources.window_days), end: date });
  }
  function bocUrl(sources, currency, date) {
    return fill(sources.boc, { currency: currency, start: addDays(date, -sources.window_days), end: date });
  }
  /** Fichier du HMRC du mois de la date ; le numéro du mois s'écrit sans zéro (« 2026-9 »). */
  function hmrcUrl(sources, date) {
    var m = ISO.exec(date);
    return fill(sources.hmrc, { year: m[1], month: String(+m[2]) });
  }

  // ---- Lecture des réponses ----

  /** Lignes d'un fichier CSV (guillemets doublés, virgules et retours à la ligne entre guillemets). */
  function csvRows(text) {
    var rows = [], row = [], field = "", quoted = false;
    text = String(text).replace(/^﻿/, "");
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    return rows;
  }

  // Valeur publiée : nombre décimal positif, gardé aussi tel qu'écrit (« 1.1130 ») pour l'afficher sans le recalculer.
  function observation(date, text) {
    var value = /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
    return validDate(date) && value > 0 ? { date: date, value: value, text: text } : null;
  }

  /** CSV du portail de données de la BCE : observations de la devise, par date croissante. Format inconnu : null. */
  function parseEcb(text, currency) {
    var rows = csvRows(text), head = rows[0] || [];
    var cur = head.indexOf("CURRENCY"), date = head.indexOf("TIME_PERIOD"), value = head.indexOf("OBS_VALUE");
    if (cur < 0 || date < 0 || value < 0) return null;
    return rows.slice(1).filter(function (r) { return r[cur] === currency; })
      .map(function (r) { return observation(r[date], String(r[value]).trim()); })
      .filter(Boolean).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }

  /** JSON de Valet (Banque du Canada), série FX{devise}CAD : observations par date croissante. Format inconnu : null. */
  function parseBoc(json, currency) {
    if (!json || !Array.isArray(json.observations)) return null;
    var key = "FX" + currency + "CAD";
    return json.observations.map(function (o) {
      return o && o[key] && typeof o[key].v === "string" ? observation(o.d, o[key].v.trim()) : null;
    }).filter(Boolean).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }

  /** CSV mensuel du HMRC : { value, text, start, end } de la devise (premier pays qui l'utilise), null si absente ou
   *  si le format a changé. */
  function parseHmrc(text, currency) {
    var rows = csvRows(text), head = (rows[0] || []).map(function (h) { return h.trim(); });
    var code = head.indexOf("Currency Code"), value = head.indexOf("Currency Units per £1");
    var start = head.indexOf("Start date"), end = head.indexOf("End date");
    if (code < 0 || value < 0 || start < 0 || end < 0) return null;
    var dmy = function (s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s).trim()); return m ? m[3] + "-" + m[2] + "-" + m[1] : ""; };
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][code]).trim() !== currency) continue;
      var obs = observation(dmy(rows[i][start]), String(rows[i][value]).trim());
      if (!obs || !validDate(dmy(rows[i][end]))) return null;
      return { value: obs.value, text: obs.text, start: obs.date, end: dmy(rows[i][end]) };
    }
    return null;
  }

  /** Dernière observation publiée au plus tard à la date (null s'il n'y en a pas). */
  function latest(observations, date) {
    var found = null;
    (observations || []).forEach(function (o) { if (o.date <= date) found = o; });
    return found;
  }

  // ---- Conversion ----

  function toHome(amount, rate) { return rate.per === "home" ? amount / rate.value : amount * rate.value; }
  function toForeign(amount, rate) { return rate.per === "home" ? amount * rate.value : amount / rate.value; }

  /**
   * input : { amount, direction (« to_home » : montant en devise ; « to_foreign » : montant dans la monnaie du pays),
   *   rate: { value, per }, vat (taux de TVA en %, ou null) }.
   * Renvoie { foreign, home, homeVat, homeTotal, foreignVat, foreignTotal } arrondis au centime (TVA calculée sur le
   * montant hors taxe arrondi, dans chaque monnaie), ou { error: "amount" | "rate" | "vat" }.
   */
  function convert(input) {
    var amount = input.amount, rate = input.rate || {}, vat = input.vat;
    if (!(isFinite(amount) && amount > 0)) return { error: "amount" };
    if (!(isFinite(rate.value) && rate.value > 0) || (rate.per !== "home" && rate.per !== "foreign")) return { error: "rate" };
    if (vat != null && !(isFinite(vat) && vat >= 0 && vat < 100)) return { error: "vat" };
    var foreign, home;
    if (input.direction === "to_foreign") { home = round2(amount); foreign = round2(toForeign(amount, rate)); }
    else { foreign = round2(amount); home = round2(toHome(amount, rate)); }
    var r = { foreign: foreign, home: home, homeVat: null, homeTotal: home, foreignVat: null, foreignTotal: foreign };
    if (vat != null) {
      r.homeVat = round2(home * vat / 100);
      r.homeTotal = round2(home + r.homeVat);
      r.foreignVat = round2(foreign * vat / 100);
      r.foreignTotal = round2(foreign + r.foreignVat);
    }
    return r;
  }

  return {
    validDate: validDate, addDays: addDays, round2: round2, parseRate: parseRate, fill: fill,
    ecbUrl: ecbUrl, bocUrl: bocUrl, hmrcUrl: hmrcUrl,
    csvRows: csvRows, parseEcb: parseEcb, parseBoc: parseBoc, parseHmrc: parseHmrc, latest: latest,
    toHome: toHome, toForeign: toForeign, convert: convert
  };
});
