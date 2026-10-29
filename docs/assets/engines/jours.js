/*
 * Moteur : jours fériés, jours ouvrés et ouvrables d'une période, échéance d'un délai (documentation/42-jours-ouvres.md).
 * France : fêtes légales, Alsace-Moselle et outre-mer lues dans les règles (rules.jours_feries, fiche F2405) ; quatre
 * façons de compter (fiche F35697) : jours calendaires, francs, ouvrables, ouvrés. Fonctions pures, sans DOM.
 * Testé par tests/unit/jours.test.mjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).days = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DAY = 86400000;
  var MIN_YEAR = 2000, MAX_YEAR = 2100;   // liste des fêtes légales actuelle : pas d'historique des lois

  /** Date ISO → numéro du jour (UTC), NaN si illisible ou hors des années couvertes. */
  function day(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || "");
    if (!m || Number(m[1]) < MIN_YEAR || Number(m[1]) > MAX_YEAR) return NaN;
    var n = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY;
    return iso(n) === m[0] ? n : NaN;   // refuse le 31 février
  }
  function iso(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
  /** Jour de la semaine : 0 dimanche, 1 lundi… 6 samedi. */
  function weekday(n) { return new Date(n * DAY).getUTCDay(); }

  /** Dimanche de Pâques (calendrier grégorien ; algorithme de Meeus, Jones et Butcher). */
  function easter(year) {
    var a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31), date = (h + l - 7 * m + 114) % 31 + 1;
    return year + "-" + String(month).padStart(2, "0") + "-" + String(date).padStart(2, "0");
  }

  /**
   * Jours fériés d'une année pour un lieu (« metropole », « alsace_moselle » ou un territoire d'outre-mer des règles) :
   * [{ date, name }] triés par date ; [] si l'année n'est pas couverte.
   */
  function holidays(year, rules, zone) {
    var R = rules.jours_feries;
    if (!(year >= MIN_YEAR && year <= MAX_YEAR) || !R) return [];
    var paques = day(easter(year));
    var at = function (h) { return h.date ? year + "-" + h.date : iso(paques + h.paques); };
    var list = R.fetes_legales.slice();
    if (zone === "alsace_moselle") list = list.concat(R.alsace_moselle);
    var abolition = R.abolition_esclavage[zone];
    if (abolition) list.push({ name: R.abolition_nom, date: abolition });
    return list.map(function (h) { return { date: at(h), name: h.name }; })
      .sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : 0; });
  }

  /** Jours fériés de toutes les années d'une plage de numéros de jours, indexés par date ISO. */
  function holidayIndex(a, b, rules, zone) {
    var out = {};
    for (var y = Number(iso(a).slice(0, 4)); y <= Number(iso(b).slice(0, 4)); y++) {
      holidays(y, rules, zone).forEach(function (h) { out[h.date] = h.name; });
    }
    return out;
  }

  /**
   * Options : { rules, zone, workdays, workHolidays } ; workdays : jours travaillés (0 dimanche … 6 samedi), du lundi
   * au vendredi par défaut ; workHolidays : les jours fériés sont travaillés (comptés comme jours ouvrés).
   */
  function settings(opts) {
    var work = opts.workdays && opts.workdays.length ? opts.workdays : [1, 2, 3, 4, 5];
    return { rules: opts.rules, zone: opts.zone || "metropole", work: work, workHolidays: !!opts.workHolidays };
  }

  /**
   * Jours d'une période, bornes comprises : { calendar, ouvrables, ouvres, holidays: [{ date, name, weekday, off }] }.
   * ouvrables : du lundi au samedi, sauf les jours fériés ; ouvres : les jours travaillés, sauf les jours fériés (sauf
   * workHolidays) ; holidays : jours fériés de la période, off = tombe un jour travaillé et n'est pas travaillé.
   * null si une date est illisible ou si la fin précède le début.
   */
  function count(from, to, opts) {
    var a = day(from), b = day(to), o = settings(opts);
    if (isNaN(a) || isNaN(b) || b < a) return null;
    var index = holidayIndex(a, b, o.rules, o.zone), out = { calendar: b - a + 1, ouvrables: 0, ouvres: 0, holidays: [] };
    for (var n = a; n <= b; n++) {
      var date = iso(n), w = weekday(n), name = index[date], works = o.work.indexOf(w) >= 0;
      if (name) out.holidays.push({ date: date, name: name, weekday: w, off: works && !o.workHolidays });
      if (w !== 0 && !name) out.ouvrables++;
      if (works && (!name || o.workHolidays)) out.ouvres++;
    }
    return out;
  }

  /**
   * Échéance d'un délai de n jours à compter d'une date (le jour de départ n'est pas compté) :
   * { date, postponed, skipped } ; mode « calendaire » (tous les jours), « franc » (tous les jours, fin reportée au
   * premier jour qui n'est ni un samedi, ni un dimanche, ni un jour férié), « ouvrable » (du lundi au samedi, sauf
   * fériés), « ouvre » (jours travaillés, sauf fériés). skipped : jours non comptés (ouvrables, ouvrés) ou sautés par le
   * report (franc). null si la date est illisible, n n'est pas un entier de 0 à 3 650 ou le résultat sort des années.
   */
  function addDays(start, n, mode, opts) {
    var a = day(start), o = settings(opts);
    if (isNaN(a) || !(n >= 0 && n <= 3650 && Math.floor(n) === n)) return null;
    var limit = a + n * 7 + 400;   // borne large : 7 jours pour 1 dans le pire cas, plus une année de jours fériés
    if (isNaN(day(iso(limit)))) return null;
    var index = holidayIndex(a, limit, o.rules, o.zone), skipped = [];
    var counts = function (d) {
      var w = weekday(d), name = index[iso(d)];
      if (mode === "ouvrable") return w !== 0 && !name;
      return o.work.indexOf(w) >= 0 && (!name || o.workHolidays);
    };
    var d = a, postponed = false;
    if (mode === "calendaire" || mode === "franc") {
      d = a + n;
      while (mode === "franc" && n > 0 && (weekday(d) === 0 || weekday(d) === 6 || index[iso(d)])) {
        skipped.push(iso(d));
        d++;
        postponed = true;
      }
    } else if (mode === "ouvrable" || mode === "ouvre") {
      for (var k = 0; k < n;) {
        d++;
        if (counts(d)) k++;
        else skipped.push(iso(d));
      }
    } else return null;
    return { date: iso(d), postponed: postponed, skipped: skipped };
  }

  return { MIN_YEAR: MIN_YEAR, MAX_YEAR: MAX_YEAR, day: day, iso: iso, weekday: weekday, easter: easter,
    holidays: holidays, count: count, addDays: addDays };
});
