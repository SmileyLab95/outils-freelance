/*
 * Moteur : jours fériés, jours ouvrés et ouvrables d'une période, échéance d'un délai (documentation/42-jours-ouvres.md).
 * Jours fériés lus dans les règles : France, fêtes légales calculées à partir de Pâques, Alsace-Moselle et outre-mer
 * (rules.jours_feries, fiche F2405) ; Royaume-Uni et États-Unis, liste publiée par région et par année
 * (rules.public_holidays : GOV.UK, OPM), avec les jours de remplacement (substitute days, observed dates).
 * Quatre façons de compter (fiche F35697) : jours calendaires, francs, ouvrables, ouvrés. Fonctions pures, sans DOM.
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

  /** Années couvertes par les règles : { min, max } (liste publiée : ses années ; calcul : 2000 à 2100), ou null. */
  function years(rules) {
    if (rules.public_holidays) {
      var list = Object.keys(rules.public_holidays[zones(rules)[0]]).map(Number);   // clés numériques : ordre croissant
      return { min: list[0], max: list[list.length - 1] };
    }
    return rules.jours_feries ? { min: MIN_YEAR, max: MAX_YEAR } : null;
  }

  /** Lieux des règles : régions de la liste publiée, ou « metropole » et les lieux français. */
  function zones(rules) {
    if (rules.public_holidays) return Object.keys(rules.public_holidays);
    return ["metropole", "alsace_moselle"].concat(Object.keys(rules.jours_feries.abolition_esclavage));
  }

  /**
   * Jours fériés d'une année pour un lieu (France : « metropole », « alsace_moselle » ou un territoire d'outre-mer ;
   * Royaume-Uni, États-Unis : une région de la liste) : [{ date, name, substitute }] triés par date ; substitute : jour
   * qui en remplace un autre tombé un samedi ou un dimanche (liste publiée) ; [] si l'année n'est pas couverte.
   */
  function holidays(year, rules, zone) {
    var span = years(rules);
    if (!span || !(year >= span.min && year <= span.max)) return [];
    if (rules.public_holidays) {
      var region = rules.public_holidays[zone] || rules.public_holidays[zones(rules)[0]];
      return (region[year] || []).map(function (h) { return { date: h.date, name: h.title, substitute: !!h.substitute }; });
    }
    var R = rules.jours_feries;
    var paques = day(easter(year));
    var at = function (h) { return h.date ? year + "-" + h.date : iso(paques + h.paques); };
    var list = R.fetes_legales.slice();
    if (zone === "alsace_moselle") list = list.concat(R.alsace_moselle);
    var abolition = R.abolition_esclavage[zone];
    if (abolition) list.push({ name: R.abolition_nom, date: abolition });
    return list.map(function (h) { return { date: at(h), name: h.name, substitute: false }; })
      .sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : 0; });
  }

  /**
   * Recherche des jours fériés, année par année : le jour férié ({ date, name, substitute }), null pour un autre jour,
   * undefined si l'année n'est pas couverte par les règles.
   */
  function lookup(rules, zone) {
    var span = years(rules), cache = {};
    return function (n) {
      var date = iso(n), y = Number(date.slice(0, 4));
      if (!span || y < span.min || y > span.max) return undefined;
      if (!cache[y]) {
        cache[y] = {};
        holidays(y, rules, zone).forEach(function (h) { cache[y][h.date] = h; });
      }
      return cache[y][date] || null;
    };
  }

  /**
   * Options : { rules, zone, workdays, workHolidays } ; workdays : jours travaillés (0 dimanche … 6 samedi), du lundi
   * au vendredi par défaut ; workHolidays : les jours fériés sont travaillés (comptés comme jours ouvrés).
   */
  function settings(opts) {
    var work = opts.workdays && opts.workdays.length ? opts.workdays : [1, 2, 3, 4, 5];
    return { rules: opts.rules, zone: opts.zone, work: work, workHolidays: !!opts.workHolidays };   // sans lieu : le premier des règles
  }

  /**
   * Jours d'une période, bornes comprises : { calendar, ouvrables, ouvres, holidays: [{ date, name, substitute, weekday,
   * off }] }.
   * ouvrables : du lundi au samedi, sauf les jours fériés ; ouvres : les jours travaillés, sauf les jours fériés (sauf
   * workHolidays) ; holidays : jours fériés de la période, off = tombe un jour travaillé et n'est pas travaillé.
   * null si une date est illisible, si la fin précède le début ou si une année n'est pas couverte par les règles.
   */
  function count(from, to, opts) {
    var a = day(from), b = day(to), o = settings(opts);
    if (isNaN(a) || isNaN(b) || b < a) return null;
    var look = lookup(o.rules, o.zone), out = { calendar: b - a + 1, ouvrables: 0, ouvres: 0, holidays: [] };
    for (var n = a; n <= b; n++) {
      var w = weekday(n), h = look(n), works = o.work.indexOf(w) >= 0;
      if (h === undefined) return null;
      if (h) out.holidays.push({ date: h.date, name: h.name, substitute: h.substitute, weekday: w, off: works && !o.workHolidays });
      if (w !== 0 && !h) out.ouvrables++;
      if (works && (!h || o.workHolidays)) out.ouvres++;
    }
    return out;
  }

  /**
   * Échéance d'un délai de n jours à compter d'une date (le jour de départ n'est pas compté) :
   * { date, postponed, skipped } ; mode « calendaire » (tous les jours), « franc » (tous les jours, fin reportée au
   * premier jour qui n'est ni un samedi, ni un dimanche, ni un jour férié), « ouvrable » (du lundi au samedi, sauf
   * fériés), « ouvre » (jours travaillés, sauf fériés). skipped : jours non comptés (ouvrables, ouvrés) ou sautés par le
   * report (franc). null si la date est illisible, si n n'est pas un entier de 0 à 3 650, si le mode est inconnu, si le
   * résultat sort des années lisibles ou si un jour à examiner tombe une année que les règles ne couvrent pas.
   */
  function addDays(start, n, mode, opts) {
    var a = day(start), o = settings(opts);
    if (isNaN(a) || !(n >= 0 && n <= 3650 && Math.floor(n) === n) || ["calendaire", "franc", "ouvrable", "ouvre"].indexOf(mode) < 0) return null;
    var look = lookup(o.rules, o.zone), skipped = [], d = a, postponed = false, h;
    if (mode === "calendaire" || mode === "franc") {
      d = a + n;
      while (mode === "franc" && n > 0) {
        h = look(d);
        if (h === undefined) return null;
        if (weekday(d) !== 0 && weekday(d) !== 6 && !h) break;
        skipped.push(iso(d));
        d++;
        postponed = true;
      }
    } else {
      for (var k = 0; k < n;) {
        d++;
        h = look(d);
        if (h === undefined) return null;
        var w = weekday(d);
        if (mode === "ouvrable" ? w !== 0 && !h : o.work.indexOf(w) >= 0 && (!h || o.workHolidays)) k++;
        else skipped.push(iso(d));
      }
    }
    if (isNaN(day(iso(d)))) return null;
    return { date: iso(d), postponed: postponed, skipped: skipped };
  }

  return { MIN_YEAR: MIN_YEAR, MAX_YEAR: MAX_YEAR, day: day, iso: iso, weekday: weekday, easter: easter, years: years,
    zones: zones, holidays: holidays, count: count, addDays: addDays };
});
