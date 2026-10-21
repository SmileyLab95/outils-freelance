/* US quarterly estimated tax calculator: règle de sécurité (safe harbor), échéancier et export agenda (.ics). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("us-est-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var md = function (iso) { return OF.date(iso, { month: "short", day: "numeric", year: "numeric" }); };
  var last = null;

  function compute() {
    var status = $("e-status").value;
    var est = OFE.taxUS.estimate({ profit: OF.num($("e-profit").value) || 0, status: status, wages: OF.num($("e-wages").value) || 0 }, R);
    var withheld = OF.num($("e-withheld").value) || 0;
    var priorRaw = OF.num($("e-prior-tax").value);
    var prior = isFinite(priorRaw) ? priorRaw : null;
    var q = OFE.taxUS.quarterly(est.federal, withheld, prior, OF.num($("e-prior-agi").value) || 0, status, R);
    var paid = OF.num($("e-paid").value) || 0;
    var full = Math.max(0, est.federal - withheld);

    set("q-current", OF.money(est.federal, 0));
    set("q-rule-current", OF.money(est.federal * R.estimated_tax_safe_harbor_current_year_rate, 0));
    set("q-rule-prior-label", "Safe harbor: " + Math.round(q.priorRate * 100) + "% of 2025 tax");
    set("q-rule-prior", prior == null ? "enter 2025 tax" : OF.money(prior * q.priorRate, 0));
    set("q-required", OF.money(q.required, 0));
    set("q-full", OF.money(full, 0));

    if (!q.needed) {
      set("q-per", OF.money(0, 0));
      set("q-sub", "You expect to owe less than " + OF.money(R.estimated_tax_threshold, 0) +
        " after withholding: estimated payments are generally not required.");
    } else {
      set("q-per", OF.money(q.perQuarter, 0));
      set("q-sub", (q.rule === "prior" ? "Based on your 2025 tax (" + Math.round(q.priorRate * 100) + "% rule)."
        : "Based on 90% of your estimated 2026 tax.") + " Paying " + OF.money(full / 4, 0) +
        " per quarter would cover your whole 2026 federal tax.");
    }

    // Échéancier : le cumul dû à chaque échéance, moins ce qui a déjà été versé.
    var rows = q.dueDates.map(function (date, i) {
      var minimum = Math.max(0, q.required * (i + 1) / 4 - paid) - Math.max(0, q.required * i / 4 - paid);
      var cover = Math.max(0, full * (i + 1) / 4 - paid) - Math.max(0, full * i / 4 - paid);
      return { date: date, minimum: q.needed ? minimum : 0, cover: cover };
    });
    $("q-schedule").innerHTML = rows.map(function (r) {
      return "<tr><td>" + md(r.date) + "</td><td>" + OF.money(r.minimum, 0) + "</td><td>" + OF.money(r.cover, 0) + "</td></tr>";
    }).join("");
    last = rows;
  }

  // Export des échéances dans un fichier agenda (.ics), un événement d'une journée par échéance.
  $("q-ics").addEventListener("click", function () {
    if (!last) return;
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    var events = last.map(function (r, i) {
      var day = r.date.replace(/-/g, "");
      var next = OF.addDays(r.date, 1).replace(/-/g, "");
      return ["BEGIN:VEVENT", "UID:us-estimated-tax-2026-q" + (i + 1) + "@freelance-tools", "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + day, "DTEND;VALUE=DATE:" + next,
        "SUMMARY:Estimated tax payment Q" + (i + 1) + " (" + OF.money(r.minimum, 0) + " minimum)",
        "DESCRIPTION:Federal estimated tax due. Pay with IRS Direct Pay or EFTPS.",
        "BEGIN:VALARM", "TRIGGER:-P3D", "ACTION:DISPLAY", "DESCRIPTION:Estimated tax due in 3 days", "END:VALARM",
        "END:VEVENT"].join("\r\n");
    });
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Freelance Tools//Estimated tax//EN", "CALSCALE:GREGORIAN"]
      .concat(events, ["END:VCALENDAR"]).join("\r\n");
    OF.download(ics, "estimated-tax-2026.ics", "text/calendar");
  });

  OF.persistForm(form, "estimated");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
