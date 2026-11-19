/*
 * Moteur : Espace entrepreneur des États-Unis (documentation/60-espace-etats-unis.md, § 2 et § 3.1, lot 2e).
 * Fabrique create(texts) : le cœur commun (engines/espace-core.js) avec le moteur de facture international
 * (engines/invoice-intl.js, comme le générateur public) et les règles américaines de data/rules/us.json :
 * comptabilité de caisse (Pub. 538), livre des recettes (lignes 1 et 2 de l'annexe C), dépenses par ligne de l'annexe C
 * (repas à 50 %), synthèse de l'annexe C (lignes 1 à 31), acomptes trimestriels (engines/tax-us.js, comme le
 * calculateur public) et formulaires 1099-NEC attendus. Fonctions pures ; textes lus dans le dictionnaire de la langue
 * de la section (texts), formats américains. Testé par tests/unit/espace-us.test.mjs (critères U3 à U7).
 */
(function (root, factory) {
  var OFE = root.OFE || {};
  var api = factory(OFE.espaceCore || require("./espace-core.js"), OFE.invoiceIntl || require("./invoice-intl.js"),
                    OFE.taxUS || require("./tax-us.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).espaceUS = api;
})(typeof self !== "undefined" ? self : this, function (CORE, IV, TAX) {
  "use strict";

  /** Moteur de facture vu par le cœur : totaux du moteur international (type interne facture, devis, avoir). */
  var PROFILE = { labels: {} };
  var round2 = function (n) { return Math.round(n * 100) / 100; };
  var INV = {
    amount: IV.amount, addDays: IV.addDays, LINE_KINDS: {},
    compute: function (doc) {
      var t = IV.compute({ type: doc.type === "devis" ? "estimate" : "invoice", lines: doc.lines, discountPct: doc.discountPct, tax: doc.tax || {} },
                         PROFILE);
      return { ttc: t.total, ht: round2(t.subtotal - t.discount), tax: t.tax, taxes: t.taxes, rows: t.rows, noVat: t.noVat };
    }
  };
  /** Moyens de paiement ; card et platform passent par un intermédiaire et figurent sur un 1099-K, pas sur un 1099-NEC. */
  var METHOD_KEYS = ["ach", "check", "wire", "card", "platform", "cash", "other"];
  var NOT_ON_1099_NEC = ["card", "platform"];

  function create(TX) {
    function L(key, vars) {
      var text = TX[key];
      if (text === undefined) { if (typeof console !== "undefined") console.error("Espace : texte manquant « " + key + " »"); return key; }
      return vars ? text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : text;
    }
    var country = {
      // Numéros comme le générateur public : 2026-001, E-2026-001 ; avoirs (credit memos) : CM-2026-001.
      prefixes: { facture: "", devis: "E-", avoir: "CM-" },
      // Formats des exports et des messages : 10/18/2026, 1.5, 1234.50.
      fmt: { day: function (d) { var p = d.split("-"); return p[1] + "/" + p[2] + "/" + p[0]; }, dec: function (n) { return String(n); },
             amount: function (n) { return n.toFixed(2); } }
    };
    var C = CORE(INV, L, country);
    var METHODS = C.labels("eng.us.method.", METHOD_KEYS);
    country.methods = METHODS;
    var inYear = function (d, year) { return String(d || "").slice(0, 4) === String(year); };
    var clientOf = function (doc) { return (doc.snapshot && doc.snapshot.client && doc.snapshot.client.name) || ""; };

    /**
     * Livre des recettes en comptabilité de caisse (documentation/60, § 2.1 ; Pub. 538) : chaque encaissement d'une
     * facture émise compte à sa date de réception (ligne 1) ; chaque remboursement fait sur un avoir compte à sa date en
     * ligne 2 (D87). Une facture impayée ne compte pas, et ne donne droit à aucune déduction (us_bad_debts_cash_method).
     */
    function income(documents, from, to) {
      var rows = [];
      (documents || []).forEach(function (doc) {
        if (doc.status === "draft" || (doc.type !== "facture" && doc.type !== "avoir")) return;
        C.payments(doc).forEach(function (p) {
          if (!p.date || p.date < from || p.date > to) return;
          rows.push({ date: p.date, docId: doc.id, number: doc.number, client: clientOf(doc), clientId: doc.clientId, amount: round2(Number(p.amount) || 0),
                      method: p.method, kind: doc.type === "avoir" ? "refund" : "receipt" });
        });
      });
      rows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      var gross = round2(rows.reduce(function (s, r) { return r.kind === "receipt" ? s + r.amount : s; }, 0));
      var returns = round2(rows.reduce(function (s, r) { return r.kind === "refund" ? s + r.amount : s; }, 0));
      return { rows: rows, gross: gross, returns: returns, net: round2(gross - returns) };
    }
    /** Totaux par trimestre civil de l'année (encaissé, remboursé, net). */
    function incomeQuarters(documents, year) {
      return [1, 2, 3, 4].map(function (q) {
        var from = year + "-" + String(3 * q - 2).padStart(2, "0") + "-01", to = year + "-" + String(3 * q).padStart(2, "0") + "-" + (q === 1 || q === 4 ? "31" : "30");
        var r = income(documents, from, to);
        return { quarter: q, from: from, to: to, gross: r.gross, returns: r.returns, net: r.net };
      });
    }

    // ----- Dépenses par ligne de l'annexe C (us_schedule_c_expense_lines) ----------------------------------------

    /** Contrôle d'une dépense : date, fournisseur, montant positif, moyen de paiement, ligne de la partie II (pas la ligne 30). */
    function checkExpense(e, rules) {
      var errors = [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) errors.push(L("eng.exp.date"));
      if (!String(e.supplier || "").trim()) errors.push(L("eng.exp.supplier"));
      if (!(isFinite(e.amount) && Number(e.amount) > 0)) errors.push(L("eng.exp.amount"));
      if (!METHODS[e.method]) errors.push(L("eng.pay.method"));
      if (!Object.prototype.hasOwnProperty.call(rules.us_schedule_c_expense_lines, e.line)) errors.push(L("eng.us.exp.line"));
      return errors;
    }
    /**
     * Dépenses de l'année par ligne (payées dans l'année : comptabilité de caisse). Ligne 24b : le coût réel des repas est
     * saisi ; la part déductible est de 50 % dans la plupart des cas (us_meals_deduction_rate). Les lignes sont dans
     * l'ordre du formulaire ; total = ligne 28.
     */
    function expenseLines(expenses, year, rules) {
      var lines = rules.us_schedule_c_expense_lines, sums = {};
      (expenses || []).forEach(function (e) {
        if (!e || e.deletedAt || !inYear(e.date, year) || !Object.prototype.hasOwnProperty.call(lines, e.line)) return;
        sums[e.line] = round2((sums[e.line] || 0) + (Number(e.amount) || 0));
      });
      var rows = Object.keys(lines).map(function (line) {
        var spent = sums[line] || 0;
        return { line: line, label: lines[line], spent: spent, deductible: line === "24b" ? round2(spent * rules.us_meals_deduction_rate) : spent };
      });
      return { rows: rows, total: round2(rows.reduce(function (s, r) { return s + r.deductible; }, 0)) };
    }

    /**
     * Synthèse de l'annexe C (aide à la préparation, pas une déclaration) : 1 encaissé, 2 remboursements, 3 = 1 − 2,
     * 4 coût des ventes (hors version 1 : 0), 5 = 3 − 4, 6 autres recettes saisies, 7 = 5 + 6, 8 à 27b dépenses, 28 =
     * total des dépenses, 29 = 7 − 28, 30 bureau à domicile saisi, 31 = 29 − 30 (note de us_schedule_c_expense_lines).
     */
    function scheduleC(input) {
      var y = input.year, inc = income(input.documents, y + "-01-01", y + "-12-31"), ex = expenseLines(input.expenses, y, input.rules);
      var v = { 1: inc.gross, 2: inc.returns };
      v[3] = round2(v[1] - v[2]);
      v[4] = 0;
      v[5] = round2(v[3] - v[4]);
      v[6] = round2(Number(input.otherIncome) || 0);
      v[7] = round2(v[5] + v[6]);
      ex.rows.forEach(function (r) { v[r.line] = r.deductible; });
      v[28] = ex.total;
      v[29] = round2(v[7] - v[28]);
      v[30] = round2(Math.max(0, Number(input.homeOffice) || 0));
      v[31] = round2(v[29] - v[30]);
      return { year: y, values: v, expenses: ex.rows, income: inc };
    }
    /** Export de la synthèse : une ligne par ligne de l'annexe C, montants identiques à l'écran. */
    function scheduleCCSV(s, rules) {
      var q = function (t) { return '"' + String(t == null ? "" : t).replace(/"/g, '""') + '"'; };
      var order = ["1", "2", "3", "4", "5", "6", "7"].concat(Object.keys(rules.us_schedule_c_expense_lines), ["28", "29", "30", "31"]);
      var lines = [L("eng.us.csv.scheduleC")];
      order.forEach(function (k) {
        var label = rules.us_schedule_c_expense_lines[k] || L("eng.us.line." + k);
        lines.push([k, q(label), C.amountText(s.values[k] || 0)].join(";"));
      });
      return lines.join("\r\n");
    }

    // ----- Acomptes trimestriels (même calcul que le calculateur public) ------------------------------------------

    /**
     * Bénéfice de l'année : prévu par l'utilisateur, sinon bénéfice à date (ligne 31 provisoire) ramené à l'année au
     * prorata des jours écoulés ; année passée : bénéfice réel. Puis taxUS.estimate et taxUS.quarterly, avec les mêmes
     * données que le calculateur « Quarterly estimated tax » (critère U6).
     */
    function estimatedTax(input) {
      var R = input.rules, year = String(input.year), today = input.today;
      var actual = scheduleC({ documents: input.documents, expenses: input.expenses, year: year, rules: R,
                               otherIncome: input.otherIncome, homeOffice: input.homeOffice }).values[31];
      var projected = actual;
      if (isFinite(input.expectedProfit) && input.expectedProfit !== null && input.expectedProfit !== "") projected = Number(input.expectedProfit);
      else if (today.slice(0, 4) === year) {
        var start = Date.UTC(+year, 0, 1), end = Date.UTC(+year + 1, 0, 1), now = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
        var elapsed = Math.round((now - start) / 864e5) + 1, days = Math.round((end - start) / 864e5);
        projected = round2(actual * days / elapsed);
      }
      var est = TAX.estimate({ profit: projected, status: input.status, wages: input.wages || 0 }, R);
      var prior = isFinite(input.priorTax) && input.priorTax !== null && input.priorTax !== "" ? Number(input.priorTax) : null;
      var q = TAX.quarterly(est.federal, input.withheld || 0, prior, input.priorAgi || 0, est.status, R);
      var next = (q.dueDates || []).filter(function (d) { return d >= today; })[0] || null;
      return { actual: actual, projected: projected, estimate: est, quarterly: q, next: next };
    }

    // ----- Formulaires 1099-NEC attendus ------------------------------------------------------------------------

    /**
     * Clients professionnels qui ont versé dans l'année au moins le seuil de déclaration (form_1099_nec_threshold_<année>),
     * hors paiements par carte ou par plateforme (1099-K). Le client (payeur) dépose le formulaire ; le revenu est
     * imposable avec ou sans formulaire. Seuil inconnu pour l'année : threshold null, aucune liste.
     */
    function expected1099(documents, clients, year, rules) {
      var threshold = rules["form_1099_nec_threshold_" + year];
      if (!isFinite(threshold)) return { threshold: null, dueDate: null, clients: [] };
      var totals = {};
      income(documents, year + "-01-01", year + "-12-31").rows.forEach(function (r) {
        if (r.kind !== "receipt" || NOT_ON_1099_NEC.indexOf(r.method) > -1 || !r.clientId) return;
        totals[r.clientId] = round2((totals[r.clientId] || 0) + r.amount);
      });
      var list = (clients || []).filter(function (c) { return c && c.pro !== false && (totals[c.id] || 0) >= threshold; })
        .map(function (c) { return { clientId: c.id, name: c.name, total: totals[c.id] }; })
        .sort(function (a, b) { return b.total - a.total; });
      return { threshold: threshold, dueDate: rules["form_1099_nec_due_date_" + year + "_payments"] || null, clients: list };
    }

    return Object.assign({}, C, {
      text: L, METHODS: METHODS, DEFAULT_PREFIXES: country.prefixes, income: income, incomeQuarters: incomeQuarters,
      checkExpense: checkExpense, expenseLines: expenseLines, scheduleC: scheduleC, scheduleCCSV: scheduleCCSV,
      estimatedTax: estimatedTax, expected1099: expected1099
    });
  }

  return { create: create, INV: INV, METHOD_KEYS: METHOD_KEYS, NOT_ON_1099_NEC: NOT_ON_1099_NEC };
});
