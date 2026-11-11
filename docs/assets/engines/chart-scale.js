/*
 * Moteur : échelles et tracés des graphiques de l'Espace (documentation/39-tresorerie.md, § 7.4). Fonctions pures,
 * sans DOM : graduations « rondes », échelles linéaires et de dates, chemin en escalier d'un solde, barres.
 * Le dessin (SVG) est dans tools/charts.js. Testé par tests/unit/chart-scale.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).chartScale = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var round = function (n, d) { var f = Math.pow(10, d || 0); return Math.round(n * f) / f; };

  /** Pas « rond » (1, 2, 2,5 ou 5 × 10^n) proche de range / count. */
  function niceStep(range, count) {
    if (!(range > 0)) return 1;
    var raw = range / Math.max(1, count || 5), mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
    var step = r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10;
    return step * mag;
  }

  /**
   * Graduations d'un axe de valeurs : bornes arrondies au pas, zéro toujours compris (un solde se lit par rapport à
   * zéro), au moins deux graduations. Valeurs égales : un intervalle autour de la valeur.
   */
  function ticks(values, count) {
    var list = (values || []).filter(function (v) { return typeof v === "number" && isFinite(v); });
    var min = Math.min.apply(null, list.concat([0])), max = Math.max.apply(null, list.concat([0]));
    if (min === max) max = min + 1;
    var step = Math.max(1, niceStep(max - min, count || 5)); // montants : pas d'au moins 1 €
    var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, out = [];
    for (var v = lo; v <= hi + step / 2; v += step) out.push(round(v, 6));
    return { min: lo, max: hi, step: step, values: out };
  }

  /** Échelle linéaire : domaine [d0, d1] vers [r0, r1]. */
  function linear(d0, d1, r0, r1) {
    var k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
    return function (v) { return round(r0 + (v - d0) * k, 2); };
  }

  var dayNumber = function (iso) { return Math.round(Date.parse(iso + "T00:00:00Z") / 864e5); };
  /** Échelle de dates (AAAA-MM-JJ) : un jour = une unité. */
  function dateScale(from, to, r0, r1) {
    var s = linear(dayNumber(from), dayNumber(to), r0, r1);
    return function (iso) { return s(dayNumber(iso)); };
  }

  /** Premiers jours des mois entre from et to (bornes comprises), pour les graduations de l'axe des dates. */
  function monthStarts(from, to) {
    var out = [], y = +from.slice(0, 4), m = +from.slice(5, 7);
    if (from.slice(8, 10) !== "01") { m++; if (m > 12) { m = 1; y++; } }
    for (;;) {
      var d = y + "-" + String(m).padStart(2, "0") + "-01";
      if (d > to) break;
      out.push(d);
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }

  /**
   * Chemin SVG en escalier d'un solde : la valeur reste la même jusqu'au mouvement suivant, puis jusqu'à end.
   * points : [{ date, balance }] dans l'ordre ; x et y : échelles.
   */
  function stepPath(points, x, y, end) {
    if (!points || !points.length) return "";
    var d = "M" + x(points[0].date) + " " + y(points[0].balance);
    for (var i = 1; i < points.length; i++) d += "H" + x(points[i].date) + "V" + y(points[i].balance);
    if (end) d += "H" + x(end);
    return d;
  }

  /** Surface sous le chemin en escalier jusqu'à la ligne de base (y de zéro). */
  function stepArea(points, x, y, end, base) {
    var line = stepPath(points, x, y, end);
    if (!line) return "";
    return line + "V" + base + "H" + x(points[0].date) + "Z";
  }

  /**
   * Barres groupées : pour n groupes de k séries dans une largeur donnée, position et largeur de chaque barre.
   * Retourne une fonction (groupe, série) → { x, width }.
   */
  function bands(n, k, left, width, gap) {
    var g = gap === undefined ? 0.28 : gap, slot = width / Math.max(1, n), inner = slot * (1 - g), bar = inner / Math.max(1, k);
    return function (i, j) { return { x: round(left + slot * i + (slot - inner) / 2 + bar * j, 2), width: round(Math.max(1, bar - 1), 2) }; };
  }

  /** Montant court pour un axe : 12 500 → « 12,5 k », 2 000 000 → « 2 M » (espace insécable fine avant l'unité). */
  function short(v) {
    var a = Math.abs(v), sign = v < 0 ? "−" : "";
    var fmt = function (n) { return String(round(n, 1)).replace(".", ","); };
    if (a >= 1e6) return sign + fmt(a / 1e6) + " M";
    if (a >= 1e3) return sign + fmt(a / 1e3) + " k";
    return sign + fmt(a);
  }

  return { niceStep: niceStep, ticks: ticks, linear: linear, dateScale: dateScale, monthStarts: monthStarts,
           stepPath: stepPath, stepArea: stepArea, bands: bands, short: short };
});
