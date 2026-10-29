/* Jours ouvrés, jours fériés et délais (France, Royaume-Uni) : période (année, trimestre, mois ou dates), lieu, semaine
   de travail, congés ; échéance d'un délai. Moteur OFE.days, jours fériés lus dans les règles ; textes de la page
   (<script type="application/json" id="jours-data">). Spécification : documentation/42-jours-ouvres.md. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("jo-form"), delay = document.getElementById("jo-delay-form");
  var dataEl = document.getElementById("jours-data");
  if (!form || !delay || !dataEl || !OFE || !OFE.days || !R) return;
  var E = OFE.days, L = JSON.parse(dataEl.textContent), SPAN = E.years(R);
  var FRENCH = OF.locale.slice(0, 2) === "fr";
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { var el = $(id); if (el && el.textContent !== text) el.textContent = text; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  /** Forme au singulier ou au pluriel : en français, singulier jusqu'à 1 (« 0 jour ») ; en anglais, pour 1 seulement. */
  var pick = function (forms, n) { return forms[(FRENCH ? n <= 1 : n === 1) ? 0 : 1]; };
  var count = function (forms, n, vars) { return fill(pick(forms, n), Object.assign({ n: OF.fmt(n) }, vars || {})); };
  var full = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  var long = function (iso) { return OF.date(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
  var short = function (iso) { return OF.date(iso, { weekday: "short", day: "numeric", month: "short" }); };
  var upper = function (text) { return text.charAt(0).toUpperCase() + text.slice(1); };
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var lastDay = function (y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

  /** Jours travaillés cochés (0 dimanche … 6 samedi). */
  function workdays() {
    return [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return form.elements["w" + d].checked; });
  }

  function options() {
    return { rules: R, zone: $("jo-zone").value, workdays: workdays(), workHolidays: $("jo-work-holidays").checked };
  }

  /** Bornes de la période choisie, ou null si l'année est illisible ou hors des années couvertes. */
  function range() {
    var period = $("jo-period").value, y = Number($("jo-year").value);
    form.querySelectorAll("[data-when]").forEach(function (el) { el.hidden = period !== "dates"; });
    if (period === "dates") return { from: $("jo-from").value, to: $("jo-to").value };
    if (!(y >= SPAN.min && y <= SPAN.max && Math.floor(y) === y)) return null;
    var first = 1, last = 12;
    if (period[0] === "q") { first = (Number(period[1]) - 1) * 3 + 1; last = first + 2; }
    else if (period[0] === "m") first = last = Number(period.slice(1));
    return { from: y + "-" + pad(first) + "-01", to: y + "-" + pad(last) + "-" + pad(lastDay(y, last)) };
  }

  function period() {
    var o = options(), r = range(), c = r && E.count(r.from, r.to, o);
    var warn = !o.workdays.length ? L.no_workday : "";
    var body = $("jo-list").tBodies[0];
    if (!c) {
      ["jo-calendar", "jo-ouvrables", "jo-ouvres", "jo-off"].forEach(function (id) { set(id, "–"); });
      set("jo-billable", "–");
      set("jo-sub", fill($("jo-period").value === "dates" ? L.choose_dates : L.choose_year, SPAN));
      body.textContent = "";
    } else {
      var leave = OF.num($("jo-leave").value);
      if (!isFinite(leave)) leave = 0;
      if (leave < 0 || leave > c.ouvres) warn = (warn ? warn + " " : "") + fill(L.leave_range, { max: count(L.days, c.ouvres) });
      leave = Math.min(Math.max(leave, 0), c.ouvres);
      var off = c.holidays.filter(function (h) { return h.off; }).length;
      set("jo-calendar", count(L.days, c.calendar));
      set("jo-ouvrables", count(L.days, c.ouvrables));
      set("jo-ouvres", count(L.days, c.ouvres));
      set("jo-off", count(L.days, off));
      set("jo-billable", OF.fmt(c.ouvres - leave));
      set("jo-sub", count(L.period, c.ouvres, { from: full(r.from), to: full(r.to) }) + (off ? count(L.period_off, off) : "") +
        (leave ? count(L.period_leave, leave) : L.end));
      var rows = c.holidays.map(function (h) {
        var tr = document.createElement("tr");
        [upper(short(h.date)), h.name, h.off ? L.status[0] : o.workHolidays && o.workdays.indexOf(h.weekday) >= 0 ? L.status[1] : L.status[2]]
          .forEach(function (text) { var td = document.createElement("td"); td.className = "text"; td.textContent = text; tr.appendChild(td); });
        return tr;
      });
      body.textContent = "";
      if (!rows.length) {
        var tr = document.createElement("tr"), td = document.createElement("td");
        td.colSpan = 3; td.className = "text"; td.textContent = L.no_holiday;
        tr.appendChild(td); rows.push(tr);
      }
      rows.forEach(function (row) { body.appendChild(row); });
    }
    $("jo-warn").hidden = !warn;
    set("jo-warn", warn);
  }

  function deadline() {
    var start = $("jo-start").value || OF.today(), n = Number($("jo-n").value), mode = $("jo-mode").value;
    var r = $("jo-n").value.trim() === "" ? null : E.addDays(start, n, mode, options());
    if (!r) {
      set("jo-due", "–");
      set("jo-due-sub", fill(L.delay_invalid, SPAN));
      set("jo-explain", "–");
      return;
    }
    set("jo-due", full(r.date));
    set("jo-due-sub", fill(L.due, { date: upper(long(r.date)), start: full(start), n: OF.fmt(n), noun: pick(L.modes[mode], n) }));
    var skipped = r.skipped.length, list = r.skipped.slice(0, 6).map(short).join(L.sep || ", ");
    var last = r.skipped.length ? short(r.skipped[Math.min(skipped, 6) - 1]) : "";
    set("jo-explain", mode === "calendaire" ? L.explain_calendar
      : mode === "franc" ? (r.postponed ? count(L.explain_postponed, skipped, { nth: n === 1 ? "1er" : n + "e" }) : L.explain_not_postponed)
      : skipped ? count(L.explain_skipped, skipped, { list: list }) + (skipped > 6 ? L.etc : /\.$/.test(last) ? "" : ".")
      : L.explain_none);
  }

  function compute() { period(); deadline(); }

  var K = L.store || "jours";   // saisie propre à chaque pays (lieux et années différents)
  OF.persistForm(form, K);
  OF.persistForm(delay, K + "-delai");
  if (!$("jo-year").value) $("jo-year").value = OF.today().slice(0, 4);
  if (!$("jo-start").value) $("jo-start").value = OF.today();
  [form, delay].forEach(function (f) {
    f.addEventListener("input", compute);
    f.addEventListener("change", compute);
  });
  compute();
})();
