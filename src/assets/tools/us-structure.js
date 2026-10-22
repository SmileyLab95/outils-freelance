/*
 * Sole proprietor vs S corp (États-Unis) : impôts fédéraux et revenu disponible comparés (moteur OFE.structureUS).
 * Spécification : documentation/pays/us.md. Aucun salaire n'est proposé : la colonne S corp attend celui de
 * l'utilisateur.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("structure-form");
  if (!form || !OFE || !OFE.structureUS || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var money = function (x) { return OF.money(x, 0); };
  var NAMES = { "c-profit": "business profit", "c-salary": "salary", "c-extra": "extra costs" };
  var SOLE = ["c-p-profit", "c-p-se", "c-p-addmed", "c-p-qbi", "c-p-income", "c-p-keep"];
  var SCORP = ["c-s-salary", "c-s-k1", "c-s-payroll", "c-s-addmed", "c-s-qbi", "c-s-income", "c-s-extra", "c-s-keep"];
  var blank = function (ids) { ids.forEach(function (id) { set(id, "–"); }); };

  // Montant saisi : nombre positif ; vide : null ; illisible : signalé, nommé et non compté.
  function amount(id, bad) {
    var raw = $(id).value.trim(), n = OF.num(raw), invalid = raw !== "" && !(isFinite(n) && n >= 0);
    $(id).setAttribute("aria-invalid", String(invalid));
    if (invalid) bad.push(NAMES[id]);
    return invalid || raw === "" ? null : n;
  }

  function compute() {
    var bad = [], msgs = [];
    var profit = amount("c-profit", bad), salary = amount("c-salary", bad), extra = amount("c-extra", bad);
    var notice = $("c-notice");
    // Une saisie illisible : aucun résultat plutôt qu'un résultat faux.
    if (bad.length) {
      blank(SOLE); blank(SCORP);
      set("c-verdict", "–");
      set("c-sub", "Check the " + bad.join(", ") + ".");
      notice.textContent = "Check the " + bad.join(", ") + ": type numbers only, for example 120,000.";
      notice.className = "notice warn";
      return;
    }
    var r = OFE.structureUS.compare({ profit: profit || 0, salary: salary || 0, extraCosts: extra || 0,
      status: $("c-status").value, sstb: $("c-sstb").checked }, R), p = r.sole, s = r.scorp;
    set("c-p-profit", money(p.profit));
    set("c-p-se", money(p.se.total));
    set("c-p-addmed", money(p.additionalMedicare));
    set("c-p-qbi", money(p.qbiDeduction));
    set("c-p-income", money(p.incomeTax));
    set("c-p-keep", money(p.takeHome));
    var warn = false;
    if (salary === null) {
      blank(SCORP);
      set("c-verdict", "–");
      set("c-sub", "Enter the salary the S corp would pay you.");
      msgs.push("The S corp must pay you a reasonable salary for your work before any distribution: enter your own figure, based on what the business would pay someone else to do it.");
    } else if (s.error) {
      blank(SCORP);
      set("c-verdict", "–");
      set("c-sub", "The salary, its payroll taxes and the extra costs can't be more than the profit.");
      msgs.push("Lower the salary or the extra costs: with the employer payroll taxes, they're more than the business profit.");
      warn = true;
    } else {
      set("c-s-salary", money(s.salary));
      set("c-s-k1", money(s.k1));
      set("c-s-payroll", money(s.payroll));
      set("c-s-addmed", money(s.additionalMedicare));
      set("c-s-qbi", money(s.qbiDeduction));
      set("c-s-income", money(s.incomeTax));
      set("c-s-extra", money(s.extraCosts));
      set("c-s-keep", money(s.takeHome));
      var d = r.difference;
      set("c-verdict", Math.abs(d) < 1 ? "About the same" : (d > 0 ? "+" : "−") + money(Math.abs(d)) + " a year");
      set("c-sub", Math.abs(d) < 1 ? "Both options leave you about the same after federal taxes."
        : d > 0 ? "You'd keep " + money(d) + " more after federal taxes than as a sole proprietor."
        : "You'd keep " + money(-d) + " less after federal taxes than as a sole proprietor.");
      if (s.salary === 0 && s.k1 > 0) {
        msgs.push("A salary of $0 isn't reasonable if you work in the business: the IRS can treat your distributions as wages, with the payroll taxes due on them.");
        warn = true;
      } else {
        msgs.push("The S corp must pay you a reasonable salary for your work before any distribution: the IRS can treat distributions as wages if it's too low.");
      }
    }
    msgs.push("State taxes and fees aren't included.");
    notice.textContent = msgs.join(" ");
    notice.className = "notice" + (warn ? " warn" : "");
  }

  OF.persistForm(form, "structure");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
