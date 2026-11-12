/*
 * Graphiques de l'Espace (documentation/39-tresorerie.md, § 7.4) : SVG sans bibliothèque, dessinés à la largeur de
 * leur conteneur. Couleurs par classes CSS (jetons du thème), formes en plus des couleurs (pointillés, hachures).
 * Accessibilité : role="img", titre et description ; le tableau des données est fourni à part (OF.charts.table).
 * Échelles et tracés : engines/chart-scale.js (testé).
 */
(function () {
  "use strict";
  var C = window.OFE.chartScale;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  var seq = 0;
  var id = function () { return "ch" + (++seq); };
  var monthLabel = function (iso, withYear) { return MONTHS[+iso.slice(5, 7) - 1] + (withYear ? " " + iso.slice(2, 4) : ""); };

  function frame(w, h, title, desc, body) {
    var t = id(), d = id();
    return '<svg class="chart-svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" role="img" aria-labelledby="' + t + " " + d + '">' +
      '<title id="' + t + '">' + esc(title) + '</title><desc id="' + d + '">' + esc(desc) + "</desc>" + body + "</svg>";
  }
  function yAxis(tk, y, left, right) {
    return tk.values.map(function (v) {
      return '<line class="ch-grid' + (v === 0 ? " ch-zero" : "") + '" x1="' + left + '" x2="' + right + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text class="ch-tick" x="' + (left - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + esc(C.short(v)) + "</text>";
    }).join("");
  }

  /**
   * Solde prévu (ou cumul) en escalier. o : { width, height, from, to, series: [{ name, points, cls, area }], threshold,
   * refs: [{ value, label, cls }], low, title, desc }. La première série porte la surface ; les suivantes sont en pointillés.
   */
  function balance(o) {
    var w = Math.max(300, Math.round(o.width || 640)), h = o.height || (w < 480 ? 220 : 260);
    var left = w < 480 ? 40 : 52, right = w - 12, top = 14, bottom = h - 26;
    var values = [];
    o.series.forEach(function (s) { s.points.forEach(function (p) { values.push(p.balance); }); });
    if (o.threshold) values.push(o.threshold);
    (o.refs || []).forEach(function (r) { values.push(r.value); });
    var tk = C.ticks(values, w < 480 ? 4 : 5), y = C.linear(tk.min, tk.max, bottom, top), x = C.dateScale(o.from, o.to, left, right);
    var body = yAxis(tk, y, left, right);
    C.monthStarts(o.from, o.to).forEach(function (m, i, all) {
      var every = all.length > 7 && w < 640 ? 2 : 1;
      if (i % every) return;
      body += '<line class="ch-month" x1="' + x(m) + '" x2="' + x(m) + '" y1="' + top + '" y2="' + bottom + '"/>' +
        '<text class="ch-tick" x="' + x(m) + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(monthLabel(m, m.slice(5, 7) === "01")) + "</text>";
    });
    if (o.threshold > 0) {
      body += '<line class="ch-threshold" x1="' + left + '" x2="' + right + '" y1="' + y(o.threshold) + '" y2="' + y(o.threshold) + '"/>' +
        '<text class="ch-note ch-note-warn" x="' + right + '" y="' + (y(o.threshold) - 5) + '" text-anchor="end">Seuil de sécurité</text>';
    }
    // Lignes de référence (plafond, seuil de TVA…) : trait et libellé dans la couleur de la ligne.
    (o.refs || []).forEach(function (r) {
      body += '<line class="ch-ref ' + (r.cls || "") + '" x1="' + left + '" x2="' + right + '" y1="' + y(r.value) + '" y2="' + y(r.value) + '"/>' +
        '<text class="ch-note ' + (r.cls || "") + '" x="' + (left + 6) + '" y="' + (y(r.value) - 5) + '">' + esc(r.label) + "</text>";
    });
    var base = y(Math.max(tk.min, Math.min(0, tk.max)));
    o.series.forEach(function (s, i) {
      if (!s.points.length) return;
      // La courbe s'arrête à s.end (aujourd'hui pour un cumul) ou à la fin de l'axe.
      if (i === 0) body += '<path class="ch-area ' + (s.cls || "") + '" d="' + C.stepArea(s.points, x, y, s.end || o.to, base) + '"/>';
      body += '<path class="ch-line ' + (s.cls || "") + (i ? " ch-dashed" : "") + '" d="' + C.stepPath(s.points, x, y, s.end || o.to) + '"/>';
    });
    if (o.low) {
      var lx = x(o.low.date), ly = y(o.low.balance), anchor = lx > (left + right) / 2 ? "end" : "start";
      body += '<circle class="ch-low' + (o.low.balance < (o.threshold || 0) ? " is-bad" : "") + '" cx="' + lx + '" cy="' + ly + '" r="5"/>' +
        '<text class="ch-note" x="' + (lx + (anchor === "end" ? -9 : 9)) + '" y="' + (ly < top + 16 ? ly + 16 : ly - 9) + '" text-anchor="' + anchor + '">Point bas</text>';
    }
    return frame(w, h, o.title, o.desc, body);
  }

  /**
   * Barres groupées par mois. o : { width, height, groups: [{ key, values: [entrées, sorties], future }],
   * series: [{ name, cls }], title, desc } ; les mois prévus sont hachurés et séparés par un trait.
   */
  function bars(o) {
    var w = Math.max(300, Math.round(o.width || 640)), h = o.height || (w < 480 ? 220 : 250);
    var left = w < 480 ? 40 : 52, right = w - 8, top = 14, bottom = h - 26;
    var values = [];
    o.groups.forEach(function (g) { g.values.forEach(function (v) { values.push(v); }); });
    var tk = C.ticks(values, 4), y = C.linear(tk.min, tk.max, bottom, top);
    var band = C.bands(o.groups.length, o.series.length, left, right - left, 0.3), pid = id();
    // Un motif hachuré par série : un motif SVG ne prend pas la couleur de l'élément qui l'utilise.
    var body = "<defs>" + o.series.map(function (s, j) {
      return '<pattern id="' + pid + "-" + j + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
        '<rect width="6" height="6" class="ch-hatch-bg"/><line x1="0" y1="0" x2="0" y2="6" class="ch-hatch ' + s.cls + '"/></pattern>';
    }).join("") + "</defs>" + yAxis(tk, y, left, right);
    var firstFuture = -1;
    o.groups.forEach(function (g, i) {
      if (g.future && firstFuture < 0) firstFuture = i;
      g.values.forEach(function (v, j) {
        var b = band(i, j), y0 = y(0), y1 = y(v);
        body += '<rect class="ch-bar ' + o.series[j].cls + (g.future ? " is-future" : "") + '" x="' + b.x + '" y="' + Math.min(y0, y1) + '" width="' + b.width +
          '" height="' + Math.max(0.5, Math.abs(y1 - y0)) + '"' + (g.future ? ' style="fill:url(#' + pid + "-" + j + ')"' : "") + "/>";
      });
      var c = band(i, 0).x + (band(i, o.series.length - 1).x + band(i, o.series.length - 1).width - band(i, 0).x) / 2;
      var every = o.groups.length > 9 && w < 640 ? 2 : 1;
      if (i % every === 0) body += '<text class="ch-tick" x="' + c + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(g.short || monthLabel(g.key + "-01", g.key.slice(5) === "01")) + "</text>";
    });
    if (firstFuture > 0) {
      var sx = band(firstFuture, 0).x - (band(1, 0).x - band(0, 0).x) * 0.15;
      body += '<line class="ch-sep" x1="' + sx + '" x2="' + sx + '" y1="' + top + '" y2="' + bottom + '"/>' +
        '<text class="ch-note" x="' + (sx + 5) + '" y="' + (top + 10) + '">Prévu</text>' +
        '<text class="ch-note" x="' + (sx - 5) + '" y="' + (top + 10) + '" text-anchor="end">Réel</text>';
    }
    return frame(w, h, o.title, o.desc, body);
  }

  /** Barre horizontale empilée (ancienneté des créances). o : { width, parts: [{ label, value, cls }], title, desc }. */
  function stack(o) {
    var w = Math.max(300, Math.round(o.width || 640)), h = 28, total = o.parts.reduce(function (s, p) { return s + Math.max(0, p.value); }, 0);
    var x = 0, body = "";
    o.parts.forEach(function (p) {
      if (!(p.value > 0) || !total) return;
      var bw = Math.max(2, Math.round(p.value / total * w * 100) / 100);
      body += '<rect class="ch-seg ' + p.cls + '" x="' + x + '" y="0" width="' + bw + '" height="' + h + '"/>';
      x += bw;
    });
    if (!total) body = '<rect class="ch-seg ch-empty" x="0" y="0" width="' + w + '" height="' + h + '"/>';
    return frame(w, h, o.title, o.desc, body);
  }

  /**
   * Frise des échéances (documentation/55, § 5.5). o : { width, from, to, events: [{ date, amount, cls }], title, desc }.
   * Une échéance chiffrée est une tige de hauteur proportionnelle au montant ; les autres sont des repères sous l'axe,
   * empilés quand ils tombent le même jour. Forme en plus de la couleur : rond (Urssaf), carré (TVA), losange (impôts),
   * anneau (information).
   */
  function mark(cls, cx, cy) {
    if (cls === "is-dl-vat") return '<rect class="ch-mark ' + cls + '" x="' + (cx - 4) + '" y="' + (cy - 4) + '" width="8" height="8"/>';
    if (cls === "is-dl-tax") return '<path class="ch-mark ' + cls + '" d="M' + cx + " " + (cy - 5.5) + "l5.5 5.5l-5.5 5.5l-5.5-5.5z" + '"/>';
    return '<circle class="ch-mark ' + cls + '" cx="' + cx + '" cy="' + cy + '" r="4.5"/>';
  }
  function timeline(o) {
    var w = Math.max(300, Math.round(o.width || 640)), small = w < 480;
    var values = o.events.filter(function (e) { return e.amount !== null && e.amount !== undefined; }).map(function (e) { return e.amount; });
    var plain = o.events.filter(function (e) { return e.amount === null || e.amount === undefined; });
    var perDay = {}, depth = 0;
    plain.forEach(function (e) { perDay[e.date] = (perDay[e.date] || 0) + 1; depth = Math.max(depth, perDay[e.date]); });
    var h = (values.length ? (small ? 170 : 200) : 40) + depth * 13;
    var left = small ? 40 : 52, right = w - 12, top = 22, base = values.length ? h - 30 - depth * 13 : 14;
    var x = C.dateScale(o.from, o.to, left, right), body = "";
    if (values.length) {
      var tk = C.ticks(values, 4), y = C.linear(tk.min, tk.max, base, top);
      body += yAxis(tk, y, left, right);
    } else {
      body += '<line class="ch-grid ch-zero" x1="' + left + '" x2="' + right + '" y1="' + base + '" y2="' + base + '"/>';
    }
    C.monthStarts(o.from, o.to).forEach(function (m) {
      body += '<line class="ch-month" x1="' + x(m) + '" x2="' + x(m) + '" y1="' + (values.length ? top : 4) + '" y2="' + (h - 22) + '"/>' +
        '<text class="ch-tick" x="' + x(m) + '" y="' + (h - 8) + '" text-anchor="middle">' + esc(monthLabel(m, m.slice(5, 7) === "01")) + "</text>";
    });
    body += '<text class="ch-note" x="' + (left + 2) + '" y="' + (values.length ? top - 6 : h - 8) + '">' + "Aujourd'hui" + "</text>";
    o.events.forEach(function (e) {
      var cx = x(e.date);
      if (e.amount === null || e.amount === undefined) return;
      var y1 = y(e.amount);
      body += '<line class="ch-stem ' + e.cls + '" x1="' + cx + '" x2="' + cx + '" y1="' + base + '" y2="' + y1 + '"/>' + mark(e.cls, cx, y1);
    });
    var seen = {};
    plain.forEach(function (e) {
      seen[e.date] = (seen[e.date] || 0) + 1;
      body += mark(e.cls, x(e.date), base + 13 * seen[e.date]);
    });
    return frame(w, h, o.title, o.desc, body);
  }

  /** Légende : pastilles de couleur et libellés (texte réel, pas dans le SVG). */
  function legend(items) {
    return '<ul class="ch-legend">' + items.map(function (it) {
      return '<li><span class="ch-key ' + it.cls + '" aria-hidden="true"></span>' + esc(it.label) + "</li>";
    }).join("") + "</ul>";
  }

  /** Tableau des données d'un graphique, dans un « Voir les données ». */
  function table(caption, head, rows) {
    // Classe propre (et non « ledger ») : ces tableaux ne doivent pas être confondus avec le livre des recettes ou le registre.
    return '<details class="ch-data"><summary>Voir les données</summary><div class="table-scroll"><table class="data-table"><caption class="sr-only">' + esc(caption) +
      "</caption><thead><tr>" + head.map(function (c, i) { return "<th" + (i ? ' class="num"' : "") + ' scope="col">' + esc(c) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.map(function (r) {
        return "<tr>" + r.map(function (c, i) { return i ? '<td class="num">' + esc(c) + "</td>" : '<th scope="row">' + esc(c) + "</th>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div></details>";
  }

  window.OF = window.OF || {};
  window.OF.charts = { balance: balance, bars: bars, stack: stack, timeline: timeline, legend: legend, table: table, monthLabel: monthLabel };
})();
