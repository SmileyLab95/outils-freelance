/* Bureau à domicile (4 pays) : relie le formulaire au moteur OFE.homeOffice ; textes dans la page (#ho-data). */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("ho-form"), data = document.getElementById("ho-data");
  if (!form || !data || !OFE || !OFE.homeOffice || !R) return;
  var L = JSON.parse(data.textContent), H = OFE.homeOffice;
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var el = $(id); return el ? Math.max(0, OF.num(el.value) || 0) : 0; };
  var set = function (id, text) { $(id).textContent = text; };
  var money = function (x) { return OF.money(x); };
  var pct = function (x) { return OF.fmt(Math.round(x * 1000) / 10) + L.percent; };   // « 20% » ou « 20 % »
  var row = function (id, shown) { $(id).hidden = !shown; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };

  var COUNTRIES = {
    us: function () {
      var profit = $("ho-profit").value.trim();
      var r = H.us({ officeArea: num("ho-office"), homeArea: num("ho-home"), expenses: num("ho-expenses"),
                     profit: profit === "" ? null : OF.num(profit) }, R);
      var amount = r.best === "regular" ? r.regularAllowed : r.best === "simplified" ? r.simplifiedAllowed : 0;
      set("ho-big", money(amount));
      set("ho-sub", L.best[r.best]);
      set("ho-simplified", money(r.simplifiedAllowed));
      set("ho-simplified-detail", fill(L.simplified_detail, { area: OF.fmt(r.simplifiedArea) }));
      set("ho-regular", money(r.regularAllowed));
      set("ho-regular-detail", fill(L.regular_detail, { pct: pct(r.percentage) }));
      row("ho-carry-row", r.carryover > 0);
      set("ho-carry", money(r.carryover));
    },
    uk: function () {
      var r = H.uk({ hours: num("ho-hours"), months: num("ho-months"), costs: num("ho-costs"), rooms: num("ho-rooms"),
                     businessRooms: num("ho-business-rooms"), daysPerWeek: num("ho-days") }, R);
      set("ho-big", money(r.best === "flat" ? r.flatRate : r.best === "actual" ? r.actual : 0));
      set("ho-sub", L.best[r.best]);
      set("ho-flat", money(r.flatRate));
      set("ho-flat-detail", r.flatMonths ? fill(L.flat_detail, { months: r.flatMonths, rate: money(H.ukMonthlyRate(num("ho-hours"), R)) }) : L.flat_none);
      set("ho-actual", money(r.actual));
    },
    ca: function () {
      var r = H.ca({ eligible: $("ho-eligible").checked, workspaceArea: num("ho-workspace"), homeArea: num("ho-home"),
                     businessTime: num("ho-time"), expenses: num("ho-expenses"), netIncome: OF.num($("ho-income").value) || 0,
                     carryIn: num("ho-carry-in") }, R);
      var eligible = $("ho-eligible").checked;
      set("ho-big", money(r.deductible));
      set("ho-sub", !eligible ? L.sub.not_eligible : r.carryForward > 0 ? fill(L.sub.carried, { carry: money(r.carryForward) }) : L.sub.all);
      set("ho-share", pct(r.share));
      set("ho-current", money(r.current));
      set("ho-limit", money(r.limit));
      set("ho-carry", money(r.carryForward));
      $("ho-hero").classList.toggle("is-negative", !eligible);
    },
    fr: function () {
      var regime = $("ho-regime").value;
      var r = H.fr({ regime: regime, proArea: num("ho-pro"), totalArea: num("ho-total"), expenses: num("ho-expenses") }, R);
      Array.prototype.forEach.call(document.querySelectorAll("[data-reel]"), function (el) { el.hidden = regime !== "reel"; });
      set("ho-big", money(r.deductible));
      set("ho-sub", L.sub[r.reason]);
      set("ho-share", pct(r.share));
      $("ho-hero").classList.toggle("is-negative", r.reason === "abattement");
    }
  };

  function compute() { COUNTRIES[L.country](); }

  OF.persistForm(form, "home-office");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
