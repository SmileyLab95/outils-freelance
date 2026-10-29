/* Jours ouvrés, jours fériés et délais (France) : période (année, trimestre, mois ou dates), lieu, semaine de travail,
   congés ; échéance d'un délai en jours ouvrés, ouvrables, francs ou calendaires. Moteur OFE.days, jours fériés lus dans
   les règles. Spécification : documentation/42-jours-ouvres.md. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("jo-form"), delay = document.getElementById("jo-delay-form");
  if (!form || !delay || !OFE || !OFE.days || !R) return;
  var E = OFE.days;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { if ($(id).textContent !== text) $(id).textContent = text; };
  var long = function (iso) { return OF.date(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
  var short = function (iso) { return OF.date(iso, { weekday: "short", day: "numeric", month: "short" }); };
  var days = function (n) { return OF.fmt(n) + " jour" + (n > 1 ? "s" : ""); };
  var upper = function (text) { return text.charAt(0).toUpperCase() + text.slice(1); };
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var lastDay = function (y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
  var ADJ = { ouvre: "ouvré", ouvrable: "ouvrable", franc: "franc", calendaire: "calendaire" };

  /** Jours travaillés cochés (0 dimanche … 6 samedi). */
  function workdays() {
    return [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return form.elements["w" + d].checked; });
  }

  function options() {
    return { rules: R, zone: $("jo-zone").value, workdays: workdays(), workHolidays: $("jo-work-holidays").checked };
  }

  /** Bornes de la période choisie, ou null. */
  function range() {
    var period = $("jo-period").value, y = Number($("jo-year").value);
    form.querySelectorAll("[data-when]").forEach(function (el) { el.hidden = period !== "dates"; });
    if (period === "dates") return { from: $("jo-from").value, to: $("jo-to").value };
    if (!(y >= E.MIN_YEAR && y <= E.MAX_YEAR && Math.floor(y) === y)) return null;
    var first = 1, last = 12;
    if (period[0] === "q") { first = (Number(period[1]) - 1) * 3 + 1; last = first + 2; }
    else if (period[0] === "m") first = last = Number(period.slice(1));
    return { from: y + "-" + pad(first) + "-01", to: y + "-" + pad(last) + "-" + pad(lastDay(y, last)) };
  }

  function period() {
    var o = options(), r = range(), c = r && E.count(r.from, r.to, o);
    var warn = !o.workdays.length ? "Cochez au moins un jour travaillé : sans jour coché, le calcul retient du lundi au vendredi." : "";
    var body = $("jo-list").tBodies[0];
    if (!c) {
      ["jo-calendar", "jo-ouvrables", "jo-ouvres", "jo-off"].forEach(function (id) { set(id, "–"); });
      set("jo-billable", "–");
      set("jo-sub", $("jo-period").value === "dates" ? "Choisissez deux dates de " + E.MIN_YEAR + " à " + E.MAX_YEAR + ", la seconde après la première."
        : "Choisissez une année de " + E.MIN_YEAR + " à " + E.MAX_YEAR + ".");
      body.textContent = "";
    } else {
      var leave = OF.num($("jo-leave").value);
      if (!isFinite(leave)) leave = 0;
      if (leave < 0 || leave > c.ouvres) warn = (warn ? warn + " " : "") + "Les congés doivent être compris entre 0 et " + days(c.ouvres) + " (les jours ouvrés de la période).";
      leave = Math.min(Math.max(leave, 0), c.ouvres);
      var off = c.holidays.filter(function (h) { return h.off; }).length;
      set("jo-calendar", days(c.calendar));
      set("jo-ouvrables", days(c.ouvrables));
      set("jo-ouvres", days(c.ouvres));
      set("jo-off", days(off));
      set("jo-billable", OF.fmt(c.ouvres - leave));
      set("jo-sub", "Du " + OF.date(r.from, { day: "numeric", month: "long", year: "numeric" }) + " au " +
        OF.date(r.to, { day: "numeric", month: "long", year: "numeric" }) + " : " + days(c.ouvres) + " ouvrés" +
        (off ? " (" + days(off) + " férié" + (off > 1 ? "s" : "") + " en moins)" : "") + (leave ? ", moins " + days(leave) + " de congés." : "."));
      var rows = c.holidays.map(function (h) {
        var tr = document.createElement("tr");
        [upper(short(h.date)), h.name, h.off ? "Non travaillé" : o.workHolidays && o.workdays.indexOf(h.weekday) >= 0 ? "Travaillé" : "Jour de repos"]
          .forEach(function (text) { var td = document.createElement("td"); td.className = "text"; td.textContent = text; tr.appendChild(td); });
        return tr;
      });
      body.textContent = "";
      if (!rows.length) {
        var tr = document.createElement("tr"), td = document.createElement("td");
        td.colSpan = 3; td.className = "text"; td.textContent = "Aucun jour férié sur la période.";
        tr.appendChild(td); rows.push(tr);
      }
      rows.forEach(function (tr) { body.appendChild(tr); });
    }
    $("jo-warn").hidden = !warn;
    set("jo-warn", warn);
  }

  function deadline() {
    var start = $("jo-start").value || OF.today(), n = Number($("jo-n").value), mode = $("jo-mode").value;
    var r = $("jo-n").value.trim() === "" ? null : E.addDays(start, n, mode, options());
    if (!r) {
      set("jo-due", "–");
      set("jo-due-sub", "Indiquez un nombre entier de jours, de 0 à 3 650, et une date de " + E.MIN_YEAR + " à " + E.MAX_YEAR + ".");
      set("jo-explain", "–");
      return;
    }
    set("jo-due", OF.date(r.date, { day: "numeric", month: "long", year: "numeric" }));
    set("jo-due-sub", upper(long(r.date)) + " : " + days(n) + " " + ADJ[mode] + (n > 1 ? "s" : "") + " à compter du " +
      OF.date(start, { day: "numeric", month: "long", year: "numeric" }) + ".");
    var skipped = r.skipped.length;
    set("jo-explain", mode === "calendaire" ? "Tous les jours comptent, sans report si le délai finit un week-end ou un jour férié."
      : mode === "franc" ? (r.postponed ? "Le " + (n === 1 ? "1er" : n + "e") + " jour tombe un samedi, un dimanche ou un jour férié : délai reporté de " + days(skipped) + "."
        : "Le délai ne finit ni un samedi, ni un dimanche, ni un jour férié : pas de report.")
      : skipped ? days(skipped) + " non compté" + (skipped > 1 ? "s" : "") + " (repos ou jours fériés) : " +
        r.skipped.slice(0, 6).map(short).join(", ") + (skipped > 6 ? ", etc." : "") + (/\.$/.test(short(r.skipped[Math.min(skipped, 6) - 1])) || skipped > 6 ? "" : ".")
      : "Aucun jour sauté.");
  }

  function compute() { period(); deadline(); }

  OF.persistForm(form, "jours");
  OF.persistForm(delay, "jours-delai");
  if (!$("jo-year").value) $("jo-year").value = OF.today().slice(0, 4);
  if (!$("jo-start").value) $("jo-start").value = OF.today();
  [form, delay].forEach(function (f) {
    f.addEventListener("input", compute);
    f.addEventListener("change", compute);
  });
  compute();
})();
