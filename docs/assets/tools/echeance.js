/* Date d'échéance d'une facture hors de France (Royaume-Uni, États-Unis, Canada) : conditions de paiement et règle du
   pays. Moteur OFE.dueDate (engines/echeance.js) ; textes de la page (<script type="application/json"
   id="echeance-data">). Spécification : documentation/44-date-echeance-international.md. */
(function () {
  "use strict";
  var OF = window.OF, R = window.OF_RULES, E = window.OFE && window.OFE.dueDate;
  var form = document.getElementById("ec-form"), dataEl = document.getElementById("echeance-data");
  if (!form || !dataEl || !R || !E) return;
  var L = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var value = function (id) { var el = $(id); return el ? el.value : ""; };
  var set = function (id, text) { var el = $(id); if (el) el.textContent = text; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var full = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  var long = function (iso) { return OF.date(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
  var upper = function (t) { return t.charAt(0).toUpperCase() + t.slice(1); };
  /** Singulier ou pluriel ([un, plusieurs]) ; en français, singulier jusqu'à 1. */
  var count = function (forms, n) { return fill(forms[(L.lang.slice(0, 2) === "fr" ? n <= 1 : n === 1) ? 0 : 1], { n: OF.fmt(n) }); };

  function notice(kind, text) {
    var el = $("ec-notice");
    el.className = "notice " + kind;
    el.textContent = text;
    el.hidden = !text;
  }

  /** Date d'échéance selon le pays : { due, late, kind, text } (due "" si elle ne peut pas être calculée). */
  function compute(date, terms, done) {
    if (L.country === "uk") {
      var agreed = terms === "none" ? "" : E.due(date, terms);
      var r = E.ukRelevantDay({ agreed: agreed, performed: done, notice: date, publicAuthority: value("ec-client") === "public" }, R);
      if (!r) return { due: "", text: L.need_date, kind: "warn" };
      var vars = { start: full(r.start), agreed: agreed ? full(agreed) : "", late: full(r.lateFrom) };
      return { due: r.due, late: r.lateFrom, kind: r.cap === "60" || r.cap === "30" ? "warn" : "ok",
        text: fill(L.uk[r.cap || "ok"], vars) };
    }
    if (terms === "none") {
      if (!done) return { due: "", text: L.need_done, kind: "warn" };
      var place = value("ec-place"), due = E.usDefault(done, place, R);
      return due ? { due: due, kind: "ok", text: fill(L.us_default, { law: L.laws[place], done: full(done) }) }
        : { due: "", kind: "warn", text: L.us_no_default };
    }
    return { due: E.due(date, terms), kind: "ok", text: L.country === "us" && R.freelance_default_payment.places.indexOf(value("ec-place")) >= 0
      ? fill(L.us_terms_law, { law: L.laws[value("ec-place")] }) : L.terms_note };
  }

  function render() {
    var date = value("ec-date"), terms = value("ec-terms"), done = value("ec-done");
    if (isNaN(E.day(date))) date = OF.today();
    if (isNaN(E.day(done))) done = "";
    form.querySelectorAll("[data-when-none]").forEach(function (el) { el.hidden = terms !== "none"; });
    var res = compute(date, terms, done);
    if (!res.due) {
      set("ec-due", "–"); set("ec-sub", "–"); set("ec-span", "–"); set("ec-late", "–");
      notice(res.kind, res.text);
      return;
    }
    var left = E.between(OF.today(), res.due), span = E.between(date, res.due);
    set("ec-due", full(res.due));
    set("ec-sub", upper(long(res.due)) + " · " + (left > 0 ? count(L.in_days, left) : left === 0 ? L.today : count(L.days_ago, -left)));
    set("ec-span", span >= 0 ? count(L.days, span) : count(L.before_invoice, -span));
    set("ec-late", full(res.late || E.addDays(res.due, 1)));
    notice(res.kind, res.text);
  }

  OF.persistForm(form, L.store);
  if (!$("ec-date").value) $("ec-date").value = OF.today();
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
