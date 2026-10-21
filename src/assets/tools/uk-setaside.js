/* How much to set aside for tax (UK) : part de chaque paiement à mettre de côté, à partir du moteur OFE.taxUK. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("uk-setaside-form");
  if (!form || !OFE || !OFE.taxUK || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var pct = function (x) { return OF.fmt(Math.round(x * 1000) / 10) + "%"; };
  var long = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  var LEVELS = [20000, 30000, 50000, 75000, 100000, 150000];
  var NAMES = { "u-income": "invoiced per month", "u-expenses": "business expenses", "u-salary": "salary", "u-payment": "payment received" };
  // Montants saisis : nombre positif, sinon 0 (comme la page américaine) ; un montant illisible est signalé et nommé.
  function amount(id, bad) {
    var raw = $(id).value.trim(), n = OF.num(raw), invalid = raw !== "" && !(isFinite(n) && n >= 0);
    $(id).setAttribute("aria-invalid", String(invalid));
    if (invalid) bad.push(NAMES[id]);
    return invalid || raw === "" ? 0 : n;
  }

  function compute() {
    var bad = [];
    var income = amount("u-income", bad), expenses = amount("u-expenses", bad), salary = amount("u-salary", bad), payment = amount("u-payment", bad);
    var region = $("u-region").value, vat = $("u-vat").checked, vatRate = R.vat_standard_rate;
    var revenue = income * 12, profit = Math.max(0, revenue - expenses * 12);
    var r = OFE.taxUK.soleTrader({ profit: profit, salary: salary, region: region }, R);
    // Part de chaque encaissement hors TVA à mettre de côté : impôt total ÷ chiffre d'affaires, arrondie au point
    // supérieur (comme la page américaine).
    var rounded = revenue > 0 ? OF.ceilShare(r.total / revenue) : 0;
    var error = bad.length ? " Check " + bad.join(", ") + ": type numbers only, for example 4,000. Counted as 0 until corrected." : "";
    set("u-share", revenue > 0 ? pct(rounded) : "–");
    set("u-sub", (revenue > 0
      ? "of every payment" + (vat ? ", excluding VAT" : "") + ": about " + OF.money(revenue * rounded / 12, 0) + " a month, " + OF.money(r.total, 0) + " for the year."
      : "Enter what you invoice in a typical month.") + error);
    // Libellé de l'impôt : la tranche n'a de sens que s'il y a de l'impôt ; entre 100 000 £ et 125 140 £, la
    // Personal Allowance diminue (le taux réel dépasse celui de la tranche).
    var income2 = salary + profit, taper = income2 > R.personal_allowance_taper_threshold && income2 < R.personal_allowance_nil_at;
    set("u-it-label", "Income tax" + (salary > 0 ? " on your profit" : "") +
      (r.incomeTax > 0 ? " (" + pct(r.marginal) + " band" + (taper ? ", Personal Allowance reduced" : "") + ")" : ""));
    set("u-it", OF.money(r.incomeTax, 0));
    set("u-ni", OF.money(r.class4, 0));
    set("u-total-label", salary > 0 ? "Total to pay through Self Assessment" : "Total tax for the year");
    set("u-total", OF.money(r.total, 0));
    set("u-poa", r.paymentsOnAccount.required ? OF.money(r.paymentsOnAccount.each, 0) + " each" : "Not required");
    var keep = revenue - expenses * 12 - r.total;
    set("u-keep", revenue > 0 ? OF.money(keep, 0) + " · " + OF.money(keep / 12, 0) + "/mo" : "–");

    // Répartition d'un paiement reçu : la TVA d'abord (si immatriculé), puis la part de l'impôt sur le reste.
    var net = vat ? payment / (1 + vatRate) : payment;
    $("u-pay-vat-row").hidden = !vat;
    set("u-payment-label", vat ? "A client just paid you, including VAT" : "A client just paid you");
    set("u-pay-vat", OF.money(payment - net));
    set("u-pay-tax", OF.money(net * rounded));
    set("u-pay-keep", OF.money(net * (1 - rounded)));

    var over = !vat && revenue > R.vat_registration_threshold, msgs = [];
    if (bad.length) msgs.push(error.trim());
    if (over) msgs.push("If this is all taxable turnover, you'd go over the " + OF.money(R.vat_registration_threshold, 0) + " VAT registration threshold and would have to register and charge VAT.");
    if (vat) msgs.push("VAT is taken out of each payment first: it's paid with your VAT return. The Flat Rate Scheme isn't covered.");
    msgs.push(r.paymentsOnAccount.required
      ? "First year? On " + long(R.sa_balancing_payment_deadline) + " you pay the whole year's tax plus the first payment on account: " + OF.money(r.total + r.paymentsOnAccount.each, 0) + " in total."
      : "Your bill is under " + OF.money(R.payments_on_account_threshold, 0) + " or mostly taxed at source: no payments on account.");
    var notice = $("u-notice");
    notice.textContent = msgs.join(" ");
    notice.className = "notice" + (bad.length || over ? " warn" : "");

    // Part du bénéfice à mettre de côté selon le bénéfice, pour la même région et le même salaire.
    $("u-levels").innerHTML = LEVELS.map(function (p) {
      var x = OFE.taxUK.soleTrader({ profit: p, salary: salary, region: region }, R);
      var current = profit >= p * 0.85 && profit < p * 1.18;
      return "<tr" + (current ? ' class="current"' : "") + "><td>" + OF.money(p, 0) + "</td><td>" + pct(x.effectiveRate) +
        "</td><td>" + OF.money(x.total / 12, 0) + "</td></tr>";
    }).join("");
  }

  OF.persistForm(form, "setaside");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
