/* Calendrier fiscal : échéances filtrées selon la situation, compte à rebours, export agenda (.ics) et Google Agenda.
   Données : #calendar-data (data/calendars/<pays>.json, injecté par build.py) ; textes : #calendar-ui. */
(function () {
  "use strict";
  var OF = window.OF;
  var form = document.getElementById("calendar-form");
  var dataEl = document.getElementById("calendar-data");
  var uiEl = document.getElementById("calendar-ui");
  if (!form || !dataEl || !uiEl) return;
  var DATA = JSON.parse(dataEl.textContent);
  var T = JSON.parse(uiEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (text, n) { return text.replace("{n}", OF.fmt(n)); };
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  // ?today=AAAA-MM-JJ permet de vérifier le calendrier à une date donnée.
  var forced = /[?&]today=(\d{4}-\d{2}-\d{2})/.exec(window.location.search);
  var today = forced ? forced[1] : OF.today();
  var visible = [];
  var LIMIT = 8, showAll = false;

  /** Valeurs du formulaire : « on » / « off » pour les cases, la valeur pour les listes. */
  function profile() {
    var p = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      p[el.name] = el.type === "checkbox" ? (el.checked ? "on" : "off") : el.value;
    });
    return p;
  }

  function matches(event, p) {
    var when = event.when || {};
    return Object.keys(when).every(function (k) { return p[k] === undefined || when[k].indexOf(p[k]) > -1; });
  }

  function countdown(days) {
    if (days === 0) return T.today;
    if (days === 1) return T.tomorrow;
    if (days > 1) return fill(T.in_days, days);
    return fill(T.days_ago, -days);
  }

  function google(e) {
    var start = e.date.replace(/-/g, ""), end = OF.addDays(e.date, 1).replace(/-/g, "");
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(e.title) +
      "&dates=" + start + "/" + end + "&details=" + encodeURIComponent(e.desc);
  }

  function render() {
    var p = profile();
    var showPast = $("cal-past").checked;
    var all = DATA.events.filter(function (e) { return matches(e, p); });
    var upcoming = all.filter(function (e) { return e.date >= today; });
    visible = showPast ? all : upcoming;
    var hidden = showPast || showAll ? 0 : Math.max(0, visible.length - LIMIT);
    if (hidden) visible = visible.slice(0, LIMIT);

    var next = upcoming[0];
    if (next) {
      var sameDay = upcoming.filter(function (e) { return e.date === next.date; });
      var days = OF.daysBetween(today, next.date);
      $("cal-next").textContent = OF.date(next.date, { day: "numeric", month: "long", year: "numeric" });
      $("cal-next-title").textContent = next.title + (sameDay.length > 1 ? " " + fill(T.and_more, sameDay.length - 1) : "");
      $("cal-next-left").textContent = cap(countdown(days));
    } else {
      $("cal-next").textContent = "–";
      $("cal-next-title").textContent = T.none;
      $("cal-next-left").textContent = "";
    }
    $("cal-count").textContent = fill(upcoming.length > 1 ? T.count : T.count_one, upcoming.length);

    var html = "", month = "";
    visible.forEach(function (e) {
      var m = e.date.slice(0, 7);
      if (m !== month) {
        html += (month ? "</ol></section>" : "") + '<section class="cal-month"><h3>' +
          esc(cap(OF.date(e.date, { month: "long", year: "numeric" }))) + '</h3><ol class="cal-list">';
        month = m;
      }
      var days = OF.daysBetween(today, e.date);
      var soon = days >= 0 && days <= 14;
      html += '<li class="cal-item' + (days < 0 ? " is-past" : "") + (soon ? " is-soon" : "") + '">' +
        '<div class="cal-day"><b>' + Number(e.date.slice(8)) + "</b><span>" + esc(OF.date(e.date, { weekday: "short" })) + "</span></div>" +
        '<div class="cal-body"><div class="cal-tags"><span class="cal-tag k-' + esc(e.kind) + '">' + esc(e.tag) + "</span>" +
        (e.est ? '<span class="cal-est">' + esc(T.estimated) + "</span>" : "") +
        '<span class="cal-left">' + esc(countdown(days)) + "</span></div>" +
        "<h4>" + esc(e.title) + "</h4><p>" + esc(e.desc) + "</p>" +
        '<div class="cal-actions">' + (e.link ? '<a href="' + esc(e.link) + '">' + esc(T.more) + "</a>" : "") +
        '<a href="' + esc(google(e)) + '" target="_blank" rel="noopener">' + esc(T.google) + "</a></div></div></li>";
    });
    html += month ? "</ol></section>" : '<p class="muted">' + esc(T.none) + "</p>";
    if (hidden) html += '<button type="button" class="btn btn-ghost cal-more" id="cal-more">' + esc(fill(T.show_more, hidden)) + "</button>";
    $("cal-list").innerHTML = html;
    if (hidden) $("cal-more").addEventListener("click", function () { showAll = true; render(); });
    $("cal-ics").disabled = !upcoming.length;
  }

  // ----- Export .ics (RFC 5545) : un événement d'une journée par échéance, rappel 3 jours avant. -----
  function icsText(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  function fold(line) {
    var out = [];
    while (line.length > 70) { out.push(line.slice(0, 70)); line = " " + line.slice(70); }
    out.push(line);
    return out.join("\r\n");
  }
  $("cal-ics").addEventListener("click", function () {
    var p = profile();
    var events = DATA.events.filter(function (e) { return matches(e, p) && e.date >= today; });
    if (!events.length) return;
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var section = document.body.getAttribute("data-section") || "site";
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//" + T.prodid + "//" + section + "//", "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:" + icsText(T.calendar_name)];
    events.forEach(function (e, i) {
      lines.push("BEGIN:VEVENT", "UID:" + section + "-" + e.date + "-" + i + "@outils-freelance", "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + e.date.replace(/-/g, ""), "DTEND;VALUE=DATE:" + OF.addDays(e.date, 1).replace(/-/g, ""),
        "SUMMARY:" + icsText(e.title), "DESCRIPTION:" + icsText(e.desc + (e.est ? " (" + T.estimated + ")" : "")),
        "TRANSP:TRANSPARENT",
        "BEGIN:VALARM", "TRIGGER:-P3D", "ACTION:DISPLAY", "DESCRIPTION:" + icsText(e.title), "END:VALARM", "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    OF.download(lines.map(fold).join("\r\n"), T.file + ".ics", "text/calendar");
    $("cal-ics-done").textContent = fill(events.length > 1 ? T.exported : T.exported_one, events.length);
  });

  OF.persistForm(form, "calendar");
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
