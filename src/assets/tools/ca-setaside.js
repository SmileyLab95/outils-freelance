/*
 * Combien mettre de côté pour l'impôt (Canada), bilingue : part de chaque paiement à mettre de côté (moteur
 * OFE.taxCA), taxes de vente d'un paiement selon la province du client. Libellés dans la page
 * (<script type="application/json" id="ca-setaside-data">). Spécification : documentation/pays/ca.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("ca-setaside-form");
  var dataEl = document.getElementById("ca-setaside-data");
  if (!form || !OFE || !OFE.taxCA || !R || !dataEl) return;
  var L = JSON.parse(dataEl.textContent);
  var P = R._meta.provinces;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var pct = function (x) { return OF.fmt(Math.round(x * 1000) / 10) + L.percent; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  // Énumération dans la langue de la page (« A, B and C », « A, B et C ») ; repli pour les navigateurs anciens.
  var list = function (items) {
    return window.Intl && Intl.ListFormat ? new Intl.ListFormat(OF.locale, { type: "conjunction" }).format(items) : items.join(", ");
  };
  var LEVELS = [30000, 50000, 75000, 100000, 150000];

  // Provinces et territoires, triés par nom dans la langue de la page ; la province du client peut être la même.
  var codes = Object.keys(P).sort(function (a, b) { return P[a][L.names].localeCompare(P[b][L.names], OF.locale); });
  var options = function (selected) {
    return codes.map(function (c) {
      return '<option value="' + c + '"' + (c === selected ? " selected" : "") + ">" + P[c][L.names] + "</option>";
    }).join("");
  };
  $("c-province").innerHTML = options(L.default_province);
  $("c-client").innerHTML = '<option value="same" selected>' + L.client_same + "</option>" + options(null);

  /**
   * Taxes de vente perçues par un travailleur autonome inscrit, au taux de la province du client (lieu de la
   * fourniture pour la plupart des services) : TVH, ou TPS + TVQ au Québec, ou TPS seule. La TVP (TVD au Manitoba)
   * ne vise qu'une liste de services énumérés (règle pst_on_professional_services) : elle n'est pas comptée.
   */
  function salesTaxes(code) {
    var t = P[code].sales_tax, N = L.sales_names;
    if (t.type === "HST") return [{ name: N.HST, rate: t.rate }];
    var taxes = [{ name: N.GST, rate: t.gst }];
    if (t.type === "GST+QST") taxes.push({ name: N.QST, rate: t.provincial });
    return taxes;
  }

  /**
   * Acomptes provisionnels : condition de l'année en cours (moteur) et rappel de celle des deux années précédentes ;
   * au Québec, la part de l'ARC et celle de Revenu Québec, chacune seulement si son seuil est dépassé.
   */
  function instalmentText(r, inst) {
    var year = +inst.dueDates[0].slice(0, 4);
    var dates = fill(L.dates_year, { list: list(inst.dueDates.map(function (iso) { return OF.date(iso, L.day_month); })), year: year });
    var vars = { threshold: OF.money(inst.threshold, 0), y1: year - 1, y2: year - 2, dates: dates, amount: OF.money(inst.federal, 0) };
    if (!inst.required) return fill(L.inst_not, vars);
    if (!r.quebec) return fill(L.inst_required, vars);
    var parts = [];
    if (inst.requiredFederal) parts.push(fill(L.inst_part_cra, { amount: OF.money(inst.federal, 0) }));
    if (inst.requiredQuebec) parts.push(fill(L.inst_part_rq, { amount: OF.money(inst.quebec, 0) }));
    vars.parts = list(parts);
    return fill(L.inst_required_qc, vars);
  }

  // Montants saisis : nombre positif, sinon 0 ; un montant illisible est signalé et nommé.
  function amount(id, bad) {
    var raw = $(id).value.trim(), n = OF.num(raw), invalid = raw !== "" && !(isFinite(n) && n >= 0);
    $(id).setAttribute("aria-invalid", String(invalid));
    if (invalid) bad.push(L.fields[id]);
    return invalid || raw === "" ? 0 : n;
  }

  function compute() {
    var bad = [];
    var income = amount("c-income", bad), expenses = amount("c-expenses", bad), payment = amount("c-payment", bad);
    var code = P[$("c-province").value] ? $("c-province").value : L.default_province;
    var client = P[$("c-client").value] ? $("c-client").value : code;
    var registered = $("c-registered").checked;
    var revenue = income * 12, profit = Math.max(0, revenue - expenses * 12);
    var r = OFE.taxCA.estimate({ profit: profit, province: code }, R, P);
    var inst = OFE.taxCA.instalments(r, R);
    var taxes = salesTaxes(client), names = list(taxes.map(function (t) { return t.name; }));
    var salesRate = taxes.reduce(function (s, t) { return s + t.rate; }, 0);

    // Part de chaque encaissement hors taxes de vente : impôt et cotisations de l'année ÷ chiffre d'affaires,
    // arrondie au point supérieur.
    var rounded = revenue > 0 ? OF.ceilShare(r.total / revenue) : 0;
    var error = bad.length ? " " + fill(L.check, { fields: list(bad) }) : "";
    set("c-share", revenue > 0 ? pct(rounded) : "–");
    set("c-sub", (revenue > 0
      ? fill(L.sub, { excl: registered ? L.excl : "", month: OF.money(revenue * rounded / 12, 0), year: OF.money(r.total, 0) })
      : L.sub_empty) + error);
    set("c-pension-label", r.quebec ? L.pension_qpp : L.pension_cpp);
    set("c-pension", OF.money(r.pensions.total + r.qpip, 0));
    set("c-federal-label", r.quebec ? L.federal_qc : L.federal);
    set("c-federal", OF.money(r.federal, 0));
    set("c-provincial-label", fill(L.provincial, { province: P[code][L.names] }));
    set("c-provincial", OF.money(r.provincial, 0));
    set("c-total", OF.money(r.total, 0));
    set("c-inst", inst.required ? fill(L.inst_value, { amount: OF.money(inst.federal + inst.quebec, 0) }) : L.inst_none);
    set("c-inst-detail", instalmentText(r, inst));
    var keep = revenue - expenses * 12 - r.total;
    set("c-keep", revenue > 0 ? OF.money(keep, 0) + " · " + OF.money(keep / 12, 0) + L.per_month : "–");

    // Répartition d'un paiement reçu : les taxes de vente d'abord (si inscrit), puis la part de l'impôt.
    var net = registered ? payment / (1 + salesRate) : payment;
    $("c-pay-sales-row").hidden = !registered;
    $("c-client-field").hidden = !registered;
    set("c-pay-sales-label", fill(L.sales_row, { taxes: names }));
    set("c-payment-label", registered ? fill(L.payment_label_tax, { taxes: names }) : L.payment_label);
    set("c-pay-sales", OF.money(payment - net));
    set("c-pay-tax", OF.money(net * rounded));
    set("c-pay-keep", OF.money(net * (1 - rounded)));

    var threshold = R.small_supplier_threshold, over = !registered && revenue > threshold, msgs = [];
    var pst = P[client].sales_tax.type === "GST+PST" || P[client].sales_tax.type === "GST+RST";
    if (bad.length) msgs.push(error.trim());
    if (over) msgs.push(fill(L.small_supplier, { threshold: OF.money(threshold, 0), taxes: list(salesTaxes(code).map(function (t) { return t.name; })) }));
    if (registered) msgs.push(fill(L.registered_note, { taxes: names }) + (pst ? " " + L.pst_note : ""));
    msgs.push(fill(L.balance, { date: OF.date(R.balance_due_date, L.long_date) }));
    var notice = $("c-notice");
    notice.textContent = msgs.join(" ");
    notice.className = "notice" + (bad.length || over ? " warn" : "");

    // Part du bénéfice selon le bénéfice, dans la même province ; la ligne la plus proche du bénéfice est signalée.
    var nearest = profit > 0 ? LEVELS.reduce(function (best, p) { return Math.abs(p - profit) < Math.abs(best - profit) ? p : best; }) : null;
    $("c-levels").innerHTML = LEVELS.map(function (p) {
      var x = OFE.taxCA.estimate({ profit: p, province: code }, R, P), current = p === nearest;
      return "<tr" + (current ? ' class="current"' : "") + "><td>" + OF.money(p, 0) +
        (current ? '<span class="sr-only"> ' + L.current_sr + "</span>" : "") + "</td><td>" + pct(x.effectiveRate) +
        "</td><td>" + OF.money(x.total / 12, 0) + "</td></tr>";
    }).join("");
  }

  OF.persistForm(form, "setaside");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
