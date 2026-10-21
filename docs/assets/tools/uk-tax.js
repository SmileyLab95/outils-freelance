/* UK self-employed tax calculator : income tax + Class 4 NI (moteur OFE.taxUK), payments on account et échéancier. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("uk-tax-form");
  if (!form || !OFE || !R) return;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var pct = function (x) { return OF.fmt(Math.round(x * 1000) / 10) + "%"; };
  var long = function (iso) { return OF.date(iso, { day: "numeric", month: "short", year: "numeric" }); };

  function compute() {
    var profit = Math.max(0, OF.num($("t-profit").value) || 0);
    var salary = Math.max(0, OF.num($("t-salary").value) || 0);
    var region = $("t-region").value;
    var first = $("t-first").checked;

    // Impôt dû sur le bénéfice = impôt sur (salaire + bénéfice) − impôt déjà prélevé sur le salaire (moteur commun).
    var st = OFE.taxUK.soleTrader({ profit: profit, salary: salary, region: region }, R);
    var it = st.incomeTax, total = st.total, take = st.takeHome, poa = st.paymentsOnAccount;
    var ni = { main: st.class4Main, additional: st.class4Additional, total: st.class4 };

    set("r-total", OF.money(total, 0));
    set("r-sub", profit > 0
      ? "That's " + pct(total / profit) + " of your profit. Set aside about " + pct(OF.ceilShare(total / profit)) + " of what you earn."
      : "Enter your profit for the year.");
    set("r-profit", OF.money(profit, 0));
    set("r-it-label", "Income tax (" + pct(st.marginal) + " band)");
    set("r-it", OF.money(it, 0));
    set("r-ni", OF.money(ni.total, 0));
    set("r-take", OF.money(take, 0) + " · " + OF.money(take / 12, 0) + "/mo");

    var parts = [
      { label: "Take-home", value: Math.max(0, take), cls: "net" },
      { label: "Income tax", value: it, cls: "tax" },
      { label: "Class 4 NI", value: ni.total, cls: "cotis" }
    ].filter(function (p) { return p.value > 0; });
    var sum = parts.reduce(function (s, p) { return s + p.value; }, 0);
    $("r-bar").innerHTML = parts.map(function (p) {
      return '<span class="' + p.cls + '" style="width:' + (p.value / sum * 100) + '%"></span>';
    }).join("");
    $("r-legend").innerHTML = sum > 0 ? parts.map(function (p) {
      return '<li><i class="' + p.cls + '"></i>' + p.label + " <b>" + Math.round(p.value / sum * 100) + "%</b></li>";
    }).join("") : "";

    // Échéancier de la facture 2026/27 (solde au 31 janvier 2028) et des acomptes pour 2027/28.
    var balancing = R.sa_balancing_payment_deadline;
    var nextJuly = balancing.slice(0, 4) + "-07-31";
    var rows = [];
    if (first || !poa.required) {
      rows.push([balancing, "Your 2026/27 tax bill", total]);
    } else {
      rows.push([R.payments_on_account_dates[0], "1st payment on account (half of your 2025/26 bill)", null]);
      rows.push([R.payments_on_account_dates[1], "2nd payment on account (half of your 2025/26 bill)", null]);
      rows.push([balancing, "Balancing payment: 2026/27 bill minus payments on account", null]);
    }
    if (poa.required) {
      rows.push([balancing, "1st payment on account for 2027/28", poa.each]);
      rows.push([nextJuly, "2nd payment on account for 2027/28", poa.each]);
    }
    $("r-schedule").innerHTML = rows.map(function (r) {
      return "<tr><td>" + long(r[0]) + '</td><td class="text">' + r[1] + "</td><td>" + (r[2] == null ? "—" : OF.money(r[2], 0)) + "</td></tr>";
    }).join("");
    $("r-poa-note").textContent = !poa.required
      ? "Your bill is under " + OF.money(R.payments_on_account_threshold, 0) + " (or mostly taxed at source): no payments on account."
      : first ? "First year: on " + long(balancing) + " you pay your whole 2026/27 bill plus the first payment on account, " +
          OF.money(total + poa.each, 0) + " in total. Plan for it now."
      : "Payments on account for 2026/27 are based on your 2025/26 bill. From January 2028 they will be " + OF.money(poa.each, 0) + " each.";

    var steps = [
      ["Total income", salary + profit],
      ["Personal Allowance", -st.allowance],
      ["Taxable income", st.taxable]
    ];
    st.brackets.forEach(function (b) { steps.push([pct(b.rate) + " on " + OF.money(b.base, 0), b.tax]); });
    if (salary > 0) steps.push(["Minus income tax already paid on your salary", -st.salaryTax]);
    steps.push(["Income tax on your profit", it]);
    steps.push(["Class 4 NI at 6%", ni.main]);
    if (ni.additional > 0) steps.push(["Class 4 NI at 2%", ni.additional]);
    $("r-steps").innerHTML = steps.map(function (s) {
      return "<li><span>" + s[0] + "</span><b>" + (s[1] < 0 ? "− " + OF.money(-s[1], 0) : OF.money(s[1], 0)) + "</b></li>";
    }).join("");
  }

  OF.persistForm(form, "tax");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
