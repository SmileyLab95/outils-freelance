/*
 * Moteur : Espace entrepreneur du Royaume-Uni (documentation/61-espace-royaume-uni.md, § 2 et § 3.1, D97, D98).
 * Fabrique create(texts) : le cœur commun (engines/espace-core.js) avec le moteur de facture international
 * (engines/invoice-intl.js, comme le générateur public) et les règles britanniques de data/rules/uk.json :
 * comptabilité de caisse par année fiscale (6 avril–5 avril), recettes et dépenses rangées par case du formulaire
 * SA103S, synthèse des cases 9 à 22 et 28 ou 32, impôt et Class 4 du calculateur public (engines/tax-uk.js), acomptes
 * provisionnels (payments on account), Making Tax Digital (concerné ou non, périodes et totaux des mises à jour
 * trimestrielles : rien n'est envoyé à HMRC), indicateur du seuil de VAT sur 12 mois glissants, intérêts légaux de
 * retard des relances (Late Payment Act, calcul du calculateur public). Fonctions pures ; textes lus dans le
 * dictionnaire de la langue de la section (texts), formats britanniques. Testé par tests/unit/espace-uk.test.mjs
 * (critères K3 à K7).
 */
(function (root, factory) {
  var OFE = root.OFE || {};
  var api = factory(OFE.espaceCore || require("./espace-core.js"), OFE.invoiceIntl || require("./invoice-intl.js"),
                    OFE.taxUK || require("./tax-uk.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).espaceUK = api;
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
  /** Moyens de paiement d'un entrepreneur britannique (virement bancaire en premier). */
  var METHOD_KEYS = ["bank", "card", "platform", "cash", "cheque", "other"];
  /** Cases de dépenses du SA103S, dans l'ordre du formulaire (uk_sa103s_boxes). */
  var EXPENSE_BOXES = ["11", "12", "13", "14", "15", "16", "17", "18", "19"];

  /** Année fiscale (année de début) d'une date : du 6 avril au 5 avril suivant. */
  function taxYearOf(date) {
    var d = String(date || ""), y = +d.slice(0, 4);
    return d.slice(5) >= "04-06" ? y : y - 1;
  }

  function create(TX) {
    function L(key, vars) {
      var text = TX[key];
      if (text === undefined) { if (typeof console !== "undefined") console.error("Espace : texte manquant « " + key + " »"); return key; }
      return vars ? text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : text;
    }
    var country = {
      // Numéros : 2026-001 (factures, comme le générateur public), Q-2026-001 (quotes), CN-2026-001 (credit notes).
      prefixes: { facture: "", devis: "Q-", avoir: "CN-" },
      // Formats des exports et des messages : 20/11/2026, 1.5, 1234.50 ; montant avec sa devise : £1,234.50.
      fmt: { day: function (d) { var p = d.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }, dec: function (n) { return String(n); },
             amount: function (n) { return n.toFixed(2); },
             money: function (n) { return n.toLocaleString("en-GB", { style: "currency", currency: "GBP" }); } },
      locale: "en-GB",
      csvSep: ","   // exports lisibles par les tableurs britanniques
    };
    var C = CORE(INV, L, country);
    var METHODS = C.labels("eng.uk.method.", METHOD_KEYS);
    country.methods = METHODS;
    // Paiements de l'impôt dans la prévision (export) : acomptes (poa) et soldes (balancing), séparés comme dans le
    // calendrier (« Payment on account », « Self Assessment »), qui en a deux le même 31 janvier.
    country.flowKinds = { poa: L("eng.uk.flow.poa"), balancing: L("eng.uk.flow.balancing") };
    var clientOf = function (doc) { return (doc.snapshot && doc.snapshot.client && doc.snapshot.client.name) || ""; };
    var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o || {}, k); };
    var num = function (v) { return v !== null && v !== undefined && v !== "" && isFinite(Number(v)) ? Number(v) : null; };

    /** Année fiscale y (année de début) : dates de début et de fin, libellé « 2026/27 ». */
    function taxYear(y) {
      y = +y;
      return { year: y, start: y + "-04-06", end: (y + 1) + "-04-05", label: L("eng.uk.taxYear", { from: y, to: String(y + 1).slice(2) }) };
    }
    /** Année fiscale des règles chargées (tax_year_start de data/rules/uk.json). */
    var rulesYear = function (R) { return taxYearOf(R.tax_year_start); };

    /**
     * Livre des recettes en comptabilité de caisse (cash_basis_default ; notes du SA103S, case 9 : « the total amount of
     * income received ») : chaque encaissement d'une facture émise compte à sa date de réception ; chaque remboursement
     * versé sur un avoir compte à sa date et vient en déduction (D98). Une facture impayée ne compte pas.
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

    // ----- Périodes de Making Tax Digital (uk_mtd_itsa_update_periods) --------------------------------------------

    /**
     * Périodes des mises à jour trimestrielles de l'année fiscale y (kind : "standard", par défaut et seules proposées
     * en version 1, ou "calendar") : chacune couvre
     * l'année depuis son début (from) jusqu'à la fin de la période (to) ; date limite (deadline). Les mois et jours des
     * règles reçoivent leur année : la fin tombe l'année suivante si elle précède le début dans l'année civile, la date
     * limite l'année suivant la fin si elle la précède.
     */
    function mtdPeriods(y, rules, kind) {
      y = +y;
      return rules.uk_mtd_itsa_update_periods[kind === "calendar" ? "calendar" : "standard"].map(function (p, i) {
        var toYear = p.to < p.from ? y + 1 : y, deadlineYear = p.deadline > p.to ? toYear : toYear + 1;
        return { n: i + 1, from: y + "-" + p.from, to: toYear + "-" + p.to, deadline: deadlineYear + "-" + p.deadline };
      });
    }
    /** Trimestres de l'année fiscale y, chacun seul (pour le livre des recettes) : du lendemain de la fin du précédent. */
    function quarters(y, rules) {
      var prev = null;
      return mtdPeriods(y, rules).map(function (p) {
        var q = { n: p.n, from: prev ? IV.addDays(prev, 1) : p.from, to: p.to, deadline: p.deadline };
        prev = p.to;
        return q;
      });
    }
    /** Recettes nettes de chaque trimestre de l'année fiscale y. */
    function incomeQuarters(documents, y, rules) {
      return quarters(y, rules).map(function (q) {
        var r = income(documents, q.from, q.to);
        return { n: q.n, from: q.from, to: q.to, gross: r.gross, returns: r.returns, net: r.net };
      });
    }

    // ----- Dépenses par case du SA103S (uk_sa103s_boxes, uk_allowable_expenses) -----------------------------------

    /** Contrôle d'une dépense : date, fournisseur, montant positif, moyen de paiement, case 11 à 19 du SA103S. */
    function checkExpense(e) {
      var errors = [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) errors.push(L("eng.exp.date"));
      if (!String(e.supplier || "").trim()) errors.push(L("eng.exp.supplier"));
      if (!(isFinite(e.amount) && Number(e.amount) > 0)) errors.push(L("eng.exp.amount"));
      if (!METHODS[e.method]) errors.push(L("eng.pay.method"));
      if (EXPENSE_BOXES.indexOf(String(e.box)) < 0) errors.push(L("eng.uk.exp.box"));
      return errors;
    }
    /** Dépenses payées entre from et to (comptabilité de caisse), par case, dans l'ordre du formulaire ; total = case 20. */
    function expenseBoxes(expenses, from, to, rules) {
      var labels = rules.uk_sa103s_boxes.expenses, sums = {};
      (expenses || []).forEach(function (e) {
        if (!e || e.deletedAt || !e.date || e.date < from || e.date > to || EXPENSE_BOXES.indexOf(String(e.box)) < 0) return;
        sums[e.box] = round2((sums[e.box] || 0) + (Number(e.amount) || 0));
      });
      var rows = EXPENSE_BOXES.map(function (box) { return { box: box, label: labels[box], spent: sums[box] || 0 }; });
      return { rows: rows, total: round2(rows.reduce(function (s, r) { return s + r.spent; }, 0)) };
    }

    /**
     * Synthèse du SA103S pour l'année fiscale year (aide à la préparation, pas une déclaration ; uk_sa103s_boxes) :
     * 9 recettes encaissées (remboursements déduits), 10 autres recettes saisies, 11 à 19 dépenses, 20 total des
     * dépenses ; 21 bénéfice net = 9 + 10 − 20 s'il est positif, 22 perte sinon. Avec la trading income allowance
     * (tradingAllowance) : 10.1 = l'allocation, au plus trading_allowance et au plus les recettes (elle ne crée pas de
     * perte), cases 11 à 20 laissées vides. 28 (bénéfice fiscal) = 21 − 22, ou 21 − 10.1 avec l'allocation ; 32 sinon.
     */
    function summary(input) {
      var R = input.rules, ty = taxYear(input.year), inc = income(input.documents, ty.start, ty.end);
      var ex = expenseBoxes(input.expenses, ty.start, ty.end, R), allowance = !!input.tradingAllowance;
      var v = { "9": inc.net, "10": round2(Math.max(0, Number(input.otherIncome) || 0)) };
      var receipts = round2(v["9"] + v["10"]);
      v["10.1"] = allowance ? round2(Math.min(R.trading_allowance, Math.max(0, receipts))) : 0;
      ex.rows.forEach(function (r) { v[r.box] = allowance ? 0 : r.spent; });
      v["20"] = allowance ? 0 : ex.total;
      v["21"] = round2(Math.max(0, receipts - v["20"]));
      v["22"] = round2(Math.max(0, v["20"] - receipts));
      var adjusted = allowance ? round2(v["21"] - v["10.1"]) : round2(v["21"] - v["22"]);
      v["28"] = Math.max(0, adjusted);
      v["32"] = Math.max(0, -adjusted);
      return {
        year: ty.year, taxYear: ty, values: v, expenses: ex.rows, spent: ex.total, income: inc, receipts: receipts, tradingAllowance: allowance,
        profit: adjusted,
        // Pages complètes (SA103F) à partir de 90 000 £ de chiffre d'affaires (short_form_turnover_limit).
        fullPages: v["9"] >= R.uk_sa103s_boxes.short_form_turnover_limit,
        // Recettes jusqu'à 1 000 £ : exonérées par la trading income allowance (trading_allowance).
        withinAllowance: receipts <= R.trading_allowance,
        // Sans l'allocation, des dépenses inférieures à l'allocation possible donneraient un bénéfice plus élevé.
        allowanceHigher: !allowance && receipts > 0 && ex.total < Math.min(R.trading_allowance, receipts)
      };
    }
    var quote = function (t) { return '"' + String(t == null ? "" : t).replace(/"/g, '""') + '"'; };
    /** Export de la synthèse : une ligne par case du SA103S, montants identiques à l'écran. */
    function summaryCSV(s, rules) {
      var B = rules.uk_sa103s_boxes, lines = [C.csvHeader("eng.uk.csv.summary")];
      var label = function (k) { return B.income[k] || B.expenses[k] || B.tax_adjusted[k] || L("eng.uk.box." + k); };
      var order = ["9", "10"].concat(s.tradingAllowance ? ["10.1"] : EXPENSE_BOXES.concat(["20"]), ["21", "22", s.profit >= 0 ? "28" : "32"]);
      order.forEach(function (k) { lines.push([quote(k), quote(label(k)), C.amountText(s.values[k] || 0)].join(C.csvSep())); });
      return lines.join("\r\n");
    }
    /** Export du livre des recettes (lignes de income) : date de réception, client, document, moyen, nature, montant. */
    function incomeCSV(inc) {
      var lines = [C.csvHeader("eng.uk.csv.income")];
      inc.rows.forEach(function (r) {
        lines.push([C.dayText(r.date), quote(r.client), quote(r.number), quote(METHODS[r.method] || r.method),
                    quote(r.kind === "refund" ? L("eng.uk.csv.refund") : L("eng.uk.csv.receipt")),
                    C.amountText(r.kind === "refund" ? -r.amount : r.amount)].join(C.csvSep()));
      });
      return lines.join("\r\n");
    }
    /** Export des dépenses payées entre from et to, dans l'ordre des dates, avec leur case du SA103S. */
    function expensesCSV(expenses, from, to, rules) {
      var labels = rules.uk_sa103s_boxes.expenses, lines = [C.csvHeader("eng.uk.csv.expenses")];
      (expenses || []).filter(function (e) { return e && !e.deletedAt && e.date >= from && e.date <= to; })
        .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
        .forEach(function (e) {
          lines.push([C.dayText(e.date), quote(e.supplier), quote(e.label), quote(METHODS[e.method] || e.method), quote(e.ref),
                      quote(e.box ? e.box + " " + (labels[e.box] || "") : ""), C.amountText(Number(e.amount) || 0)].join(C.csvSep()));
        });
      return lines.join("\r\n");
    }

    /** Livre des encaissements au format commun (indicateurs, historique, prévision) : remboursements en négatif. */
    function ledger(documents, from, to) {
      return income(documents, from || "0000-01-01", to || "9999-12-31").rows.map(function (r) {
        return { date: r.date, client: r.client, method: METHODS[r.method] || r.method, amount: r.kind === "refund" ? -r.amount : r.amount,
                 ref: r.number, docId: r.docId, kind: r.kind };
      });
    }
    country.receipts = function (documents, from, to) { return ledger(documents, from, to); };
    country.expenseTotal = function (expenses, from, to) {
      return round2((expenses || []).filter(function (e) { return e && !e.deletedAt && e.date >= from && e.date <= to; })
        .reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0));
    };

    // ----- Making Tax Digital : concerné ou non, mises à jour trimestrielles --------------------------------------

    /**
     * Données d'une année fiscale tirées du profil : profile.taxYears[année] l'emporte sur les valeurs générales.
     * Champs : salary, expectedProfit, otherIncome (case 10), tradingAllowance, qualifyingIncome (revenu éligible de MTD
     * déclaré), propertyIncome (loyers bruts), priorBill (impôt de l'année précédente payé par Self Assessment),
     * noPoa (pas d'acompte demandé pour l'année), priorBalancing (solde de l'année précédente, dû le 31 janvier).
     */
    function yearData(profile, y) {
      var base = profile || {};
      return Object.assign({}, base, (base.taxYears || {})[String(y)] || {});
    }

    /**
     * Entrée dans Making Tax Digital (uk_mtd_itsa_qualifying_income) : pour chaque année de départ (6 avril 2026, 2027,
     * 2028), le revenu éligible de l'année fiscale de référence face au seuil de l'année de départ (mtd_itsa_threshold_*,
     * « more than »). Revenu éligible : celui que l'utilisateur a saisi (qualifyingIncome), sinon les recettes brutes de
     * l'activité enregistrées dans l'Espace pour cette année (cases 9 et 10) plus les loyers bruts saisis (propertyIncome),
     * si l'Espace a des recettes cette année-là ; complete : l'année est finie.
     */
    function mtdStatus(input) {
      var R = input.rules, map = R.uk_mtd_itsa_qualifying_income.income_year_for_start, today = input.today;
      return Object.keys(map).sort().map(function (start) {
        var y = +String(map[start]).slice(0, 4), ty = taxYear(y), d = yearData(input.profile, y), threshold = R["mtd_itsa_threshold_" + start];
        var entered = num(d.qualifyingIncome), amount = null, source = null;
        if (entered !== null) { amount = round2(Math.max(0, entered)); source = "entered"; }
        else {
          var inc = income(input.documents, ty.start, ty.end);
          if (inc.rows.length) {
            amount = round2(Math.max(0, inc.net) + Math.max(0, Number(d.otherIncome) || 0) + Math.max(0, num(d.propertyIncome) || 0));
            source = "records";
          }
        }
        return { start: +start, startDate: start + "-04-06", incomeYear: ty, threshold: isFinite(threshold) ? threshold : null,
                 amount: amount, source: source, complete: today > ty.end,
                 applies: amount === null || !isFinite(threshold) ? null : amount > threshold };
      });
    }
    /**
     * Mises à jour trimestrielles de l'année fiscale year (uk_mtd_itsa_update_periods) : pour chaque période, recettes
     * et dépenses par case depuis le début de l'année (« each update covers the tax year so far »), et la part du seul
     * trimestre (quarterFrom : début du trimestre seul) ; état d'après la date du jour et les dates du trimestre : open
     * (trimestre en cours), due (fini, date limite à venir), past (date limite passée), future. L'Espace n'envoie rien à
     * HMRC.
     */
    function mtdUpdates(input) {
      var R = input.rules, today = input.today, prev = null, own = quarters(input.year, R);
      return mtdPeriods(input.year, R).map(function (p, i) {
        var inc = income(input.documents, p.from, p.to), ex = expenseBoxes(input.expenses, p.from, p.to, R), start = own[i].from;
        var row = { n: p.n, from: p.from, to: p.to, quarterFrom: start, deadline: p.deadline, income: inc.net, expenses: ex.rows, spent: ex.total,
                    status: today < start ? "future" : today <= p.to ? "open" : today <= p.deadline ? "due" : "past" };
        row.quarterIncome = round2(inc.net - (prev ? prev.income : 0));
        row.quarterSpent = round2(ex.total - (prev ? prev.spent : 0));
        prev = row;
        return row;
      });
    }

    // ----- Seuil de VAT (vat_registration_threshold) : indicateur sur 12 mois glissants ---------------------------

    /**
     * Facturé sur les 12 derniers mois (du lendemain de la même date il y a un an à aujourd'hui), par date de facture,
     * hors taxe, avoirs déduits : indicateur du chiffre d'affaires taxable face au seuil d'immatriculation. La part des
     * clients marqués hors du Royaume-Uni (client.abroad) est donnée à part : elle peut ne pas compter si elle est hors
     * du champ de la VAT britannique (outside_scope_not_taxable_turnover) ; l'Espace ne l'exclut pas lui-même.
     */
    function vatTurnover(documents, clients, today, rules) {
      var from = IV.addDays(C.addMonths(today, -12), 1), abroad = {};
      (clients || []).forEach(function (c) { if (c && c.abroad) abroad[c.id] = true; });
      var total = 0, overseas = 0;
      (documents || []).forEach(function (d) {
        if (d.status === "draft" || (d.type !== "facture" && d.type !== "avoir") || !d.date || d.date < from || d.date > today) return;
        var ht = INV.compute(d).ht * (d.type === "avoir" ? -1 : 1);
        total += ht;
        if (abroad[d.clientId]) overseas += ht;
      });
      var threshold = rules.vat_registration_threshold;
      return { from: from, to: today, total: round2(total), overseas: round2(overseas), threshold: threshold,
               over: round2(total) > threshold, share: threshold > 0 ? round2(total) / threshold : 0 };
    }

    // ----- Impôt estimé et acomptes (même calcul que le calculateur public) ---------------------------------------

    /**
     * Impôt de l'année fiscale year : bénéfice fiscal (case 28, ou perte en case 32) prévu par l'utilisateur, sinon
     * bénéfice à date ramené à l'année au prorata des jours écoulés ; année finie : bénéfice réel. Puis
     * taxUK.soleTrader avec la région et le salaire du profil, comme le calculateur « Self-employed tax » (critère K5).
     * Seule l'année des règles chargées est calculée (available false sinon).
     */
    function estimatedTax(input) {
      var R = input.rules, y = +input.year, ty = taxYear(y), d = yearData(input.profile, y), today = input.today;
      if (y !== rulesYear(R)) return { available: false, year: y, taxYear: ty };
      var s = summary({ documents: input.documents, expenses: input.expenses, year: y, rules: R, otherIncome: d.otherIncome, tradingAllowance: d.tradingAllowance });
      var actual = s.profit, projected = actual, expected = num(d.expectedProfit);
      if (expected !== null) projected = expected;
      else if (today >= ty.start && today <= ty.end) {
        var days = C.daysBetween(ty.start, IV.addDays(ty.end, 1)), elapsed = C.daysBetween(ty.start, today) + 1;
        projected = round2(actual * days / elapsed);
      }
      var st = TAX.soleTrader({ profit: Math.max(0, projected), salary: Math.max(0, num(d.salary) || 0), region: d.region === "scotland" ? "scotland" : "ruk" }, R);
      return { available: true, year: y, taxYear: ty, actual: actual, projected: projected, tax: st, summary: s };
    }
    /** Acompte n (1 ou 2) déjà versé pour l'année fiscale year, saisi par l'utilisateur (profile.poaPaid). */
    function paidFor(profile, year, n) {
      var v = Number(((profile || {}).poaPaid || {})[year + "-" + n]);
      return isFinite(v) && v > 0 ? round2(v) : 0;
    }
    /**
     * Échéancier de l'impôt de l'année des règles (comme le calculateur public) : solde de l'année précédente saisi
     * (priorBalancing, au 31 janvier : sa_online_return_deadline de l'année précédente) ; deux acomptes de l'année
     * (payments_on_account_dates), chacun la moitié de l'impôt de l'année précédente (priorBill) sauf sous 1 000 £ ou
     * sans acompte demandé (noPoa) ; solde de l'année (sa_balancing_payment_deadline) = impôt estimé − acomptes ; premier
     * et second acomptes de l'année suivante (la moitié de l'impôt estimé, si payments on account requis), le 31 janvier
     * et le 31 juillet. Montant inconnu : null. paid : déjà versé (acomptes de l'année).
     */
    function taxSchedule(input) {
      var R = input.rules, est = estimatedTax(input);
      if (!est.available) return { available: false, year: est.year, rows: [] };
      var y = est.year, d = yearData(input.profile, y), prior = num(d.priorBill), rows = [];
      var priorYear = taxYear(y - 1), next = taxYear(y + 1), balancingDate = R.sa_balancing_payment_deadline;
      var priorBalancing = num(d.priorBalancing), priorDue = R["sa_online_return_deadline_" + (y - 1) + "_" + String(y).slice(2)];
      if (priorBalancing !== null && priorDue) rows.push({ date: priorDue, kind: "priorBalancing", year: priorYear, amount: round2(Math.max(0, priorBalancing)), paid: 0 });
      var poa = d.noPoa ? { required: false, each: 0 } : prior === null ? null : TAX.paymentsOnAccount(Math.max(0, prior), 0, R);
      R.payments_on_account_dates.forEach(function (date, i) {
        rows.push({ date: date, kind: "poa", n: i + 1, year: est.taxYear, amount: poa === null ? null : round2(poa.each), paid: paidFor(input.profile, y, i + 1) });
      });
      var bill = round2(est.tax.total), onAccount = poa === null ? null : round2(2 * poa.each);
      rows.push({ date: balancingDate, kind: "balancing", year: est.taxYear, amount: onAccount === null ? null : round2(bill - onAccount), paid: 0 });
      var nextPoa = est.tax.paymentsOnAccount;
      if (nextPoa.required) {
        rows.push({ date: balancingDate, kind: "poa", n: 1, year: next, amount: round2(nextPoa.each), paid: 0 });
        rows.push({ date: balancingDate.slice(0, 4) + "-07-31", kind: "poa", n: 2, year: next, amount: round2(nextPoa.each), paid: 0 });
      }
      return { available: true, year: y, bill: bill, poa: poa, rows: rows, estimate: est };
    }

    // ----- Trésorerie : estimations, présentées comme telles -----------------------------------------------------

    /**
     * Prévision : partie générale du cœur, avec les paiements de l'échéancier de l'impôt (taxSchedule) à leurs dates,
     * moins ce qui est déjà versé ; un montant inconnu n'est pas prévu (unknownTax). L'année fiscale suivant celle des
     * règles n'a pas de paiement prévu (missingTaxYears) quand son solde tomberait dans l'horizon.
     */
    function forecast(input) {
      var R = input.rules, ry = rulesYear(R), missing = [], unknown = [];
      var f = C.forecastWith(input, function (base) {
        var sch = taxSchedule({ documents: input.documents, expenses: input.expenses, profile: input.profile, rules: R, today: input.today, year: ry });
        var items = [];
        sch.rows.forEach(function (r) {
          if (r.date < input.today || r.date > base.until) return;
          if (r.amount === null) { unknown.push(r); return; }
          var due = round2(Math.max(0, r.amount - (r.paid || 0)));
          if (due > 0) items.push({ date: r.date, kind: r.kind === "poa" ? "poa" : "balancing", amount: -due,
            label: r.kind === "poa" ? L("eng.uk.forecast.poa", { n: r.n, year: r.year.label }) : L("eng.uk.forecast.balancing", { year: r.year.label }) });
        });
        // Année fiscale suivante : son solde (et le premier acompte de l'année d'après) tombe le 31 janvier suivant sa
        // fin, un an après celui de l'année des règles (sa_balancing_payment_deadline) ; barème pas encore dans les règles.
        var bal = R.sa_balancing_payment_deadline, nextBalancing = (+bal.slice(0, 4) + 1) + bal.slice(4);
        if (nextBalancing <= base.until) missing.push(taxYear(ry + 1));
        return items;
      });
      f.missingTaxYears = missing;
      f.unknownTax = unknown;
      return f;
    }
    /**
     * Déjà dû à la date du jour pour l'année fiscale en cours (année des règles) : impôt estimé × bénéfice à date ÷
     * bénéfice projeté, moins les acomptes versés pour l'année ; jamais négatif. Hors de l'année des règles : rien.
     */
    function owed(input) {
      var R = input.rules, y = taxYearOf(input.today);
      if (y !== rulesYear(R)) return { tax: null, total: 0 };
      var est = estimatedTax({ documents: input.documents, expenses: input.expenses, profile: input.profile, rules: R, today: input.today, year: y });
      var share = est.projected > 0 && est.actual > 0 ? Math.min(1, est.actual / est.projected) : 0;
      var accrued = round2(est.tax.total * share), paid = round2(paidFor(input.profile, y, 1) + paidFor(input.profile, y, 2));
      return { tax: { year: est.taxYear, accrued: accrued, paid: paid, actual: est.actual, projected: est.projected },
               total: round2(Math.max(0, accrued - paid)) };
    }
    /** Point mort : non calculé en version 1. */
    function breakEven() { return null; }
    /** Pas d'activité mixte au sens français. */
    function mixedActivities() { return null; }

    // ----- Intérêts légaux de retard (Late Payment of Commercial Debts (Interest) Act 1998) -----------------------

    /** Taux de référence du semestre où la dette est devenue exigible (lendemain de l'échéance), comme le calculateur public. */
    function referenceRate(due, rules) {
      var overdue = IV.addDays(due, 1);
      var row = (rules.late_payment_reference_rates || []).filter(function (r) { return overdue >= r.overdue_from && overdue <= r.overdue_to; })[0];
      return row ? { rate: row.bank_rate, known: true } : { rate: rules.boe_bank_rate, known: false };
    }
    /**
     * Intérêts légaux et indemnité fixe d'une facture en retard (taxUK.latePayment, comme le calculateur public) : sur
     * le reste dû, du lendemain de l'échéance à today. Pas en retard ou soldée : null. Le Late Payment Act ne vaut
     * qu'entre entreprises : l'écran ne le propose que pour un client professionnel.
     */
    function lateInterest(doc, documents, today, rules) {
      if (doc.type !== "facture" || doc.status === "draft") return null;
      var due = C.dueDate(doc), bal = C.balance(doc, documents);
      if (!(due < today) || bal <= 0.005) return null;
      var days = C.daysBetween(due, today), ref = referenceRate(due, rules), r = TAX.latePayment(bal, days, ref.rate, rules);
      return { due: due, from: IV.addDays(due, 1), days: days, amount: bal, referenceRate: ref.rate, known: ref.known, rate: r.rate,
               interest: round2(r.interest), daily: round2(r.daily), compensation: r.compensation, total: round2(r.interest + r.compensation) };
    }

    // ----- Courriels préremplis : envoi d'un document, relance d'une facture -------------------------------------

    var TYPE_NAMES = C.labels("eng.uk.type.", ["facture", "devis", "avoir"]);
    /**
     * Objet et texte d'un courriel sur un document émis. kind : "send" ou "reminder". fmt = { money, date, pct }.
     * Instructions de paiement : profile.payment. options.interest (relance d'un client professionnel en retard) : phrase
     * des intérêts légaux et de l'indemnité fixe, calculés par lateInterest (options.rules).
     */
    function email(kind, doc, documents, profile, today, fmt, options) {
      profile = profile || {};
      options = options || {};
      var money = fmt.money || fmt.eur, amountText = money(C.total(doc)), bal = C.balance(doc, documents), due = C.dueDate(doc);
      var pay = String(profile.payment || "").trim() ? L("eng.uk.mail.payment", { details: String(profile.payment).trim() }) : "";
      var parts = [], subject;
      if (kind === "reminder") {
        var late = due < today;
        subject = late ? L("eng.uk.mail.subjectLate", { number: doc.number }) : L("eng.uk.mail.subjectDue", { number: doc.number, due: fmt.date(due) });
        var R1 = { number: doc.number, date: fmt.date(doc.date), due: fmt.date(due), amount: money(bal) };
        parts.push(late ? L("eng.uk.mail.reminderLate", R1) : L("eng.uk.mail.reminderSoon", R1));
        var li = options.interest && options.rules ? lateInterest(doc, documents, today, options.rules) : null;   // null avant l'échéance
        if (li) parts.push(L("eng.uk.mail.lateInterest", { rate: fmt.pct(li.rate), from: fmt.date(li.from), daily: money(li.daily),
                                                          interest: money(li.interest), compensation: money(li.compensation) }));
        if (pay) parts.push(pay);
        parts.push(L("eng.uk.mail.questions"));
      } else if (doc.type === "facture") {
        var st = C.state(doc, today, documents), credits = documents ? C.credited(documents, doc) : 0;
        var payable = (parseInt(doc.terms, 10) || 0) > 0 ? L("eng.uk.mail.payableBy", { date: fmt.date(due) }) : L("eng.uk.mail.payableNow");
        var first = L("eng.uk.mail.invoice", { number: doc.number, date: fmt.date(doc.date), amount: amountText });
        if (st === "cancelled") first += L("eng.uk.mail.cancelled");
        else if (bal <= 0.005) first += L("eng.uk.mail.paid");
        else if (bal < C.total(doc) - 0.005) {
          var nCredits = (documents || []).filter(function (d) { return d.type === "avoir" && d.status !== "draft" && d.originId === doc.id; }).length;
          var already = C.paidAmount(doc) > 0
            ? (credits > 0 ? L("eng.uk.mail.already.paymentsCredits") : L("eng.uk.mail.already.payments"))
            : (nCredits > 1 ? L("eng.uk.mail.already.credits") : L("eng.uk.mail.already.credit"));
          first += L("eng.uk.mail.remaining", { already: already, amount: money(bal), payable: payable });
        } else first += L("eng.uk.mail.payable", { payable: payable });
        parts.push(first);
        if (bal > 0.005 && pay) parts.push(pay);
        parts.push(L("eng.uk.mail.questions"));
      } else if (doc.type === "devis") {
        var pct = Math.min(100, Math.max(0, Number(doc.depositPct) || 0));
        var until = IV.addDays(doc.date, Math.max(1, parseInt(doc.validity, 10) || 30));
        parts.push(L("eng.uk.mail.quote", { number: doc.number, date: fmt.date(doc.date), amount: amountText, until: fmt.date(until) }) +
          (pct > 0 ? L("eng.uk.mail.deposit", { pct: country.fmt.dec(pct), amount: money(round2(C.total(doc) * pct / 100)) }) : ""));
        parts.push(L("eng.uk.mail.accept"));
        parts.push(L("eng.uk.mail.discuss"));
      } else {
        var origin = doc.originId ? (documents || []).filter(function (d) { return d.id === doc.originId; })[0] : null;
        var ref = origin ? L("eng.uk.mail.ref", { number: origin.number, date: fmt.date(origin.date) }) : doc.origin && doc.origin.number ? doc.origin.number : "";
        parts.push(ref ? L("eng.uk.mail.creditFor", { number: doc.number, date: fmt.date(doc.date), amount: amountText, ref: ref })
          : L("eng.uk.mail.credit", { number: doc.number, date: fmt.date(doc.date), amount: amountText }));
        var sa = C.state(doc, today, documents);
        if (sa === "refund") parts.push(L("eng.uk.mail.refundSoon", { amount: money(bal) }));
        else if (sa === "refunded") {
          var lastPay = C.payments(doc).map(function (x) { return x.date; }).sort().pop();
          parts.push(L("eng.uk.mail.refunded", { amount: money(C.paidAmount(doc)), date: fmt.date(lastPay) }));
        } else if (origin) {
          var left = C.balance(origin, documents);
          parts.push(left > 0.005 ? L("eng.uk.mail.deducted", { amount: money(left) })
            : C.state(origin, today, documents) === "cancelled" ? L("eng.uk.mail.deductedCancelled") : L("eng.uk.mail.deductedPaid"));
        }
        parts.push(L("eng.uk.mail.questions"));
      }
      if (kind !== "reminder") subject = TYPE_NAMES[doc.type] + " " + doc.number + (profile.name ? " – " + profile.name : "");
      return { subject: subject, body: L("eng.uk.mail.hello") + "\n\n" + parts.join("\n\n") + "\n\n" + L("eng.uk.mail.regards") + "\n" + (profile.name || "") };
    }

    return Object.assign({}, C, {
      text: L, METHODS: METHODS, DEFAULT_PREFIXES: country.prefixes, EXPENSE_BOXES: EXPENSE_BOXES, taxYearOf: taxYearOf, taxYear: taxYear,
      rulesYear: rulesYear, income: income, mtdPeriods: mtdPeriods, quarters: quarters, incomeQuarters: incomeQuarters,
      checkExpense: checkExpense, expenseBoxes: expenseBoxes, summary: summary, summaryCSV: summaryCSV, incomeCSV: incomeCSV,
      expensesCSV: expensesCSV, ledger: ledger, yearData: yearData, mtdStatus: mtdStatus, mtdUpdates: mtdUpdates, vatTurnover: vatTurnover,
      estimatedTax: estimatedTax, paidFor: paidFor, taxSchedule: taxSchedule, forecast: forecast, owed: owed, breakEven: breakEven,
      mixedActivities: mixedActivities, referenceRate: referenceRate, lateInterest: lateInterest, email: email
    });
  }

  return { create: create, INV: INV, METHOD_KEYS: METHOD_KEYS, EXPENSE_BOXES: EXPENSE_BOXES, taxYearOf: taxYearOf };
});
