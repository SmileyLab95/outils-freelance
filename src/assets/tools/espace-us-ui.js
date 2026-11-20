/*
 * Écrans de l'Espace entrepreneur propres aux États-Unis (documentation/60-espace-etats-unis.md, § 3.2 et § 3.3, D90 et
 * D92). Module d'écrans d'un pays : la fabrique OFE.espaceUI.us reçoit le contexte prêté par tools/espace.js et renvoie
 * ses crochets ; us.engines déclare les moteurs de la section (moteur américain, moteur de facture international avec
 * les paramètres du générateur public, formats, coordonnées). Lot 3d-3 : profil, client, document (taxe de vente,
 * aperçu identique au générateur, critère U2), tableau de bord (prochain acompte). Chargé par la page de la section
 * avant tools/espace.js.
 */
(function (root) {
  "use strict";
  var OFE = root.OFE = root.OFE || {};

  var us = (OFE.espaceUI = OFE.espaceUI || {}).us = function (ctx) {
    var L = ctx.L, field = ctx.field, OF = ctx.OF, TERMS = ctx.TERMS, profile = ctx.profile, E = ctx.E, R = ctx.R, D = ctx.data;
    var kpi = ctx.kpi, money = ctx.money, day = ctx.day, TODAY = ctx.TODAY, YEAR = ctx.YEAR;
    var $ = ctx.$, esc = ctx.esc, view = ctx.view, options = ctx.options, countText = ctx.countText, showError = ctx.showError;
    var persist = ctx.persist, now = ctx.now, S = ctx.S, DEC = ctx.DEC;
    var STATUSES = ["single", "married_filing_jointly", "married_filing_separately", "head_of_household"];
    var str = function (v) { return String(v == null ? "" : v).trim(); };

    // ----- Profil : coordonnées, EIN facultatif, instructions de paiement, situation familiale ------------------------

    /** Profil proposé au premier lancement : célibataire (situation familiale du calcul des acomptes). */
    function profileDefaults() { return { filingStatus: "single" }; }
    /** Champs du profil américain, entre le nom et la numérotation ; coordonnées après le premier lancement. */
    function profileFields(p, first) {
      return field("filingStatus", L("us.profile.filingStatus"), STATUSES.indexOf(p.filingStatus) > -1 ? p.filingStatus : "single",
          { options: STATUSES.map(function (s) { return [s, L("us.status." + s)]; }), hint: L("us.profile.filingStatusHint") }) +
        (first ? "" :
          field("address", L("us.profile.address"), p.address, { textarea: true, placeholder: L("us.profile.addressPlaceholder") }) +
          field("email", L("profile.email"), p.email, { type: "email", half: true }) +
          field("phone", L("profile.phone"), p.phone, { type: "tel", half: true }) +
          field("ein", L("us.profile.ein"), p.ein, { half: true, placeholder: "12-3456789", hint: L("us.profile.einHint") }) +
          field("terms", L("us.profile.terms"), p.terms == null ? 30 : p.terms, { options: TERMS, half: true }) +
          field("payment", L("us.profile.payment"), p.payment, { textarea: true, placeholder: L("us.profile.paymentPlaceholder"), hint: L("us.profile.paymentHint") }) +
          field("late", L("us.profile.late"), p.late, { placeholder: L("us.profile.latePlaceholder") }) +
          check("contractors", L("us.profile.contractors"), p.contractors, contractorsHint()) +
          check("extension", L("us.profile.extension"), p.extension, L("us.profile.extensionHint")));
    }
    /** Case à cocher du profil, avec son aide. */
    function check(name, label, on, hint) {
      var id = "ep-" + name;
      return '<div class="field full"><label class="check"><input type="checkbox" id="' + id + '" name="' + name + '"' + (on ? " checked" : "") +
        ' aria-describedby="' + id + '-hint"><span>' + esc(label) + '</span></label><span class="hint" id="' + id + '-hint">' + esc(hint) + "</span></div>";
    }
    /** Aide de la case « sous-traitants » : seuil de l'année en cours s'il est dans les règles (1099-NEC). */
    function contractorsHint() {
      var limit = R["form_1099_nec_threshold_" + YEAR];
      return limit ? L("us.profile.contractorsHintYear", { amount: money(limit), year: YEAR }) : L("us.profile.contractorsHint");
    }
    function bindProfile() {}
    /**
     * Lit les champs du pays dans p ; renvoie { message, field } si un champ est refusé. EIN : 9 chiffres (12-3456789) ;
     * un numéro au format d'un numéro de sécurité sociale (123-45-6789) est refusé : il n'a rien à faire sur une facture.
     */
    function readProfile(form, p, first) {
      var f = form.elements;
      p.filingStatus = STATUSES.indexOf(f.filingStatus.value) > -1 ? f.filingStatus.value : "single";
      if (first) return null;
      ["address", "email", "phone", "ein", "payment", "late"].forEach(function (k) { p[k] = str(f[k].value); });
      p.contractors = !!f.contractors.checked;
      p.extension = !!f.extension.checked;
      if (/^\d{3}-?\d{2}-?\d{4}$/.test(p.ein) && !/^\d{2}-?\d{7}$/.test(p.ein)) return { message: L("us.profile.errSsn"), field: "ein" };
      if (p.ein && !/^\d{2}-?\d{7}$/.test(p.ein)) return { message: L("us.profile.errEin"), field: "ein" };
      if (p.ein) p.ein = p.ein.replace(/^(\d{2})-?(\d{7})$/, "$1-$2");
      p.terms = Number(f.terms.value);
      return null;
    }
    /** Champs du profil à compléter pour des factures lisibles par le client : l'adresse. */
    function profileMissing(p) { return str(p.address) ? [] : [L("us.patch.address")]; }

    // ----- Clients : adresse, email, identifiant fiscal facultatif ----------------------------------------------------

    function clientDefaults() { return {}; }
    function clientFields(c) {
      return field("address", L("us.client.address"), c.address, { textarea: true }) +
        field("email", L("profile.email"), c.email, { type: "email", half: true }) +
        field("taxId", L("us.client.taxId"), c.taxId, { half: true, hint: L("us.client.taxIdHint") });
    }
    function bindClient() {}
    function readClient(form, c) {
      var f = form.elements;
      ["address", "email", "taxId"].forEach(function (k) { c[k] = str(f[k].value); });
      return null;
    }

    // ----- Document : taxe de vente saisie, numéro de bon de commande ----------------------------------------------

    /** Brouillon neuf : pas de taxe tant que l'utilisateur n'en saisit pas (elle dépend de l'État et de ce qui est vendu). */
    function draftFields() { return { tax: { rate: NaN, label: "" }, po: "" }; }
    function retax() {}
    function kindCell() { return ""; }
    function docFields(d) {
      var t = d.tax || {}, rate = OF.num(t.rate);
      return '<div class="field"><label for="d-tax-rate">' + L("us.doc.taxRate") + '</label><input type="text" id="d-tax-rate" name="taxRate" inputmode="decimal" value="' +
          (isFinite(rate) ? ctx.esc(OF.fmt(rate)) : "") + '"></div>' +
        '<div class="field"><label for="d-tax-label">' + L("us.doc.taxLabel") + '</label><input type="text" id="d-tax-label" name="taxLabel" placeholder="' +
          ctx.esc(L("us.doc.taxLabelPlaceholder")) + '" value="' + ctx.esc(t.label || "") + '"></div>' +
        (d.type === "facture" ? '<div class="field"><label for="d-po">' + L("us.doc.po") + '</label><input type="text" id="d-po" name="po" value="' + ctx.esc(d.po || "") + '"></div>' : "");
    }
    function docNote() { return L("us.doc.taxNote"); }
    function docInput(d, t) {
      d.tax = d.tax || { rate: NaN, label: "" };
      if (t.name === "taxRate") { d.tax.rate = OF.num(t.value); return true; }
      if (t.name === "taxLabel") { d.tax.label = t.value; return true; }
      if (t.name === "po") { d.po = t.value; return true; }
      return false;
    }
    function issueOptions() { return {}; }

    // ----- Recettes en caisse et dépenses par ligne de l'annexe C (documentation/60, § 2.1 et § 2.2 ; U3, U4) ---------

    var LINES = R.us_schedule_c_expense_lines, HELP = R.us_schedule_c_line_help || {};
    /** Années proposées : l'année en cours et celles des dates données, la plus récente d'abord. */
    function yearsOf(dates) {
      var y = {};
      y[YEAR] = true;
      dates.forEach(function (d) { if (d) y[String(d).slice(0, 4)] = true; });
      return Object.keys(y).sort().reverse();
    }
    function yearTabs(base, years, year) {
      return '<div class="espace-filters espace-noprint" role="group" aria-label="' + L("us.year") + '">' + years.map(function (y) {
        return '<a class="tab" href="' + base + "?annee=" + y + '"' + (y === year ? ' aria-current="true"' : "") + ">" + y + "</a>";
      }).join("") + "</div>";
    }
    function printButton(id, disabled) {
      return '<button type="button" class="btn btn-ghost btn-sm" id="' + id + '"' + (disabled ? " disabled" : "") + ">" + L("common.print") + "</button>";
    }
    function bindPrint(id) {
      $(id).addEventListener("click", function () {
        document.body.classList.add("print-ledger");
        window.print();
        document.body.classList.remove("print-ledger");
      });
    }
    /** Liste à puces d'une règle (pièces justificatives de us_supporting_documents). */
    var listOf = function (items) { return (items || []).join(", "); };

    /**
     * Livre des recettes en comptabilité de caisse : chaque paiement reçu à sa date de réception (ligne 1), chaque
     * remboursement fait sur un avoir à sa date (ligne 2) ; totaux par trimestre et par année ; export et impression.
     */
    function viewIncome(r) {
      var dates = [];
      D().documents.forEach(function (d) { (d.payments || []).forEach(function (x) { dates.push(x.date); }); });
      var years = yearsOf(dates), year = r.params.annee && years.indexOf(r.params.annee) > -1 ? r.params.annee : YEAR;
      var inc = E.income(D().documents, year + "-01-01", year + "-12-31"), quarters = E.incomeQuarters(D().documents, year);
      var receipts = inc.rows.filter(function (x) { return x.kind === "receipt"; }).length;
      var row = function (x) {
        var refund = x.kind === "refund";
        return '<tr><td class="c-date">' + day(x.date) + '</td><td class="c-client">' + esc(x.client) + '</td><td class="c-ref"><a href="#/documents/' + esc(x.docId) + '">' +
          esc(x.number) + "</a>" + (refund ? " " + L("us.inc.refundMark") : "") + '</td><td class="c-method">' + esc(E.METHODS[x.method] || x.method) +
          '</td><td class="num">' + esc(money(refund ? -x.amount : x.amount)) + "</td></tr>";
      };
      view.innerHTML = '<div class="espace-head"><h2>' + L("us.inc.title", { year: esc(year) }) + '</h2><div class="espace-quick espace-noprint">' +
        '<a class="btn btn-ghost btn-sm" href="#/schedule-c?annee=' + esc(year) + '">' + L("us.sc.open") + "</a>" +
        '<button type="button" class="btn btn-ghost btn-sm" id="income-csv"' + (inc.rows.length ? "" : " disabled") + ">" + L("common.exportCsv") + "</button>" +
        printButton("income-print", !inc.rows.length) + "</div></div>" +
        '<div class="kpis kpis-4">' +
        kpi(L("us.inc.gross"), money(inc.gross), countText(receipts, L("count.receipt.one"), L("count.receipt.many")) + " · " + L("us.inc.line", { n: 1 })) +
        kpi(L("us.inc.returns"), money(inc.returns), L("us.inc.line", { n: 2 })) +
        kpi(L("us.inc.net"), money(inc.net), L("us.inc.line", { n: 3 })) +
        kpi(year === YEAR ? L("us.inc.thisQuarter", { n: Math.floor((+TODAY.slice(5, 7) - 1) / 3) + 1 }) : L("us.inc.lastQuarter"),
          money(quarters[year === YEAR ? Math.floor((+TODAY.slice(5, 7) - 1) / 3) : 3].net), L("us.inc.quarterSub")) + "</div>" +
        '<div class="card espace-card">' + yearTabs("#/recettes", years, year) +
        (inc.rows.length ? '<table class="ledger"><thead><tr><th>' + L("us.inc.col.date") + "</th><th>" + L("ledger.col.client") + "</th><th>" + L("us.inc.col.doc") +
          "</th><th>" + L("pay.method") + '</th><th class="num">' + L("ledger.col.amount") + "</th></tr></thead><tbody>" +
          quarters.map(function (q) {
            var list = inc.rows.filter(function (x) { return x.date >= q.from && x.date <= q.to; });
            return list.length ? list.map(row).join("") + '<tr class="ledger-subtotal"><td colspan="4">' + L("us.inc.quarterTotal", { n: q.quarter, year: esc(year) }) +
              '</td><td class="num">' + esc(money(q.net)) + "</td></tr>" : "";
          }).join("") + '</tbody><tfoot><tr><td colspan="4">' + L("us.inc.yearTotal", { year: esc(year) }) + '</td><td class="num">' + esc(money(inc.net)) + "</td></tr></tfoot></table>"
          : '<p class="muted">' + L("us.inc.empty", { year: esc(year) }) + "</p>") +
        '<p class="small muted">' + esc(R.us_cash_method) + "</p>" +
        '<p class="small muted">' + L("us.inc.notesHtml") + "</p>" +
        '<p class="small muted">' + L("us.inc.keep", { list: esc(listOf((R.us_supporting_documents || {}).gross_receipts)), years: R.us_records_retention.general_years }) + "</p></div>";
      if (!inc.rows.length) return;
      $("income-csv").addEventListener("click", function () {
        OF.download("\ufeff" + E.incomeCSV(inc), L("us.inc.file", { year: year }), "text/csv;charset=utf-8");
      });
      bindPrint("income-print");
    }

    function expense(id) { return D().expenses.filter(function (e) { return e.id === id; })[0] || null; }
    /** Libellé d'une ligne de l'annexe C : « 18 Office expense ». */
    var lineLabel = function (k) { return LINES[k] ? k + " " + LINES[k] : ""; };

    /** Dépenses de l'année (payées dans l'année), avec leur ligne de l'annexe C ; totaux par ligne (repas : 50 %). */
    function viewExpenses(r) {
      var years = yearsOf(D().expenses.map(function (e) { return e.date; }));
      var year = r.params.annee && years.indexOf(r.params.annee) > -1 ? r.params.annee : YEAR;
      var list = D().expenses.filter(function (e) { return e && !e.deletedAt && String(e.date).slice(0, 4) === year; })
        .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      var lines = E.expenseLines(D().expenses, year, R), used = lines.rows.filter(function (x) { return x.spent > 0; });
      var spent = Math.round(list.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0) * 100) / 100;
      view.innerHTML = '<div class="espace-head"><h2>' + L("us.exp.title", { year: esc(year) }) + '</h2><div class="espace-quick espace-noprint">' +
        '<a class="btn btn-primary btn-sm" href="#/depenses/nouvelle">' + L("us.exp.add") + "</a>" +
        '<a class="btn btn-ghost btn-sm" href="#/schedule-c?annee=' + esc(year) + '">' + L("us.sc.open") + "</a>" +
        '<button type="button" class="btn btn-ghost btn-sm" id="expenses-csv"' + (list.length ? "" : " disabled") + ">" + L("common.exportCsv") + "</button>" +
        printButton("expenses-print", !list.length) + "</div></div>" +
        '<div class="kpis kpis-4">' +
        kpi(L("us.exp.spent"), money(spent), countText(list.length, L("us.count.expense.one"), L("us.count.expense.many"))) +
        kpi(L("us.exp.deductible"), money(lines.total), L("us.inc.line", { n: 28 })) +
        kpi(L("us.exp.lines"), String(used.length), L("us.exp.linesSub")) +
        kpi(L("us.exp.top"), used.length ? money(used.slice().sort(function (a, b) { return b.deductible - a.deductible; })[0].deductible) : "–",
          used.length ? lineLabel(used.slice().sort(function (a, b) { return b.deductible - a.deductible; })[0].line) : L("us.exp.none")) + "</div>" +
        '<div class="card espace-card">' + yearTabs("#/depenses", years, year) +
        (list.length ? '<table class="ledger"><thead><tr><th>' + L("us.exp.col.date") + "</th><th>" + L("us.exp.col.vendor") + "</th><th>" + L("us.exp.col.line") +
          "</th><th>" + L("pay.method") + '</th><th class="num">' + L("ledger.col.amount") + "</th></tr></thead><tbody>" +
          list.map(function (e) {
            return '<tr><td class="c-date">' + day(e.date) + '</td><td class="c-client"><a href="#/depenses/' + esc(e.id) + '">' + esc(e.supplier) + "</a>" +
              (e.label ? '<span class="small muted"> · ' + esc(e.label) + "</span>" : "") + "</td><td>" + esc(lineLabel(e.line)) + '</td><td class="c-method">' +
              esc(E.METHODS[e.method] || e.method) + '</td><td class="num">' + esc(money(Number(e.amount) || 0)) + "</td></tr>";
          }).join("") + '</tbody><tfoot><tr><td colspan="4">' + L("us.exp.total", { year: esc(year) }) + '</td><td class="num">' + esc(money(spent)) + "</td></tr></tfoot></table>"
          : '<p class="muted">' + L("us.exp.empty", { year: esc(year) }) + "</p>") + "</div>" +
        (used.length ? '<section class="card espace-card"><h3>' + L("us.exp.byLine") + '</h3><table class="ledger lines-table"><thead><tr><th>' + L("us.exp.col.line") +
          '</th><th class="num">' + L("us.exp.col.spent") + '</th><th class="num">' + L("us.exp.col.deductible") + "</th></tr></thead><tbody>" +
          used.map(function (x) {
            return "<tr><td>" + esc(lineLabel(x.line)) + '</td><td class="num" data-label="' + esc(L("us.exp.col.spent")) + '">' + esc(money(x.spent)) +
              '</td><td class="num" data-label="' + esc(L("us.exp.col.deductible")) + '">' + esc(money(x.deductible)) + "</td></tr>";
          }).join("") + '</tbody><tfoot><tr><td>' + L("us.inc.line", { n: 28 }) + '</td><td></td><td class="num" data-label="' + esc(L("us.exp.col.deductible")) + '">' +
          esc(money(lines.total)) + "</td></tr></tfoot></table>" +
          (used.some(function (x) { return x.line === "24b"; }) ? '<p class="small muted">' + esc(HELP["24b"] || "") + "</p>" : "") + "</section>" : "") +
        '<p class="small muted">' + esc(R.us_cash_method) + "</p>" +
        '<p class="small muted">' + L("us.exp.keep", { list: esc(listOf((R.us_supporting_documents || {}).expenses)), years: R.us_records_retention.general_years }) + "</p>";
      if (!list.length) return;
      $("expenses-csv").addEventListener("click", function () {
        OF.download("\ufeff" + E.expensesCSV(D().expenses, year, R), L("us.exp.file", { year: year }), "text/csv;charset=utf-8");
      });
      bindPrint("expenses-print");
    }

    /** Fiche d'une dépense : date, montant, fournisseur, description, moyen de paiement, référence, ligne (avec son aide). */
    function viewExpenseForm(r) {
      var isNew = r.id === "nouvelle";
      var x = isNew ? { date: TODAY, method: "card", line: "" } : expense(r.id);
      if (!x) { view.innerHTML = '<div class="espace-head"><h2>' + L("us.exp.notFound") + '</h2></div><p><a href="#/depenses">' + L("us.exp.back") + "</a></p>"; return; }
      var methods = Object.keys(E.METHODS).map(function (k) { return [k, E.METHODS[k]]; });
      var lineOptions = [["", L("us.exp.chooseLine")]].concat(Object.keys(LINES).map(function (k) { return [k, lineLabel(k)]; }));
      view.innerHTML = '<div class="espace-head"><h2>' + (isNew ? L("us.exp.new") : esc(x.supplier)) + "</h2></div>" +
        '<form class="card espace-card" id="expense-form" novalidate><div class="fields">' +
        field("date", L("us.exp.col.date"), x.date, { type: "date", half: true, required: true }) +
        field("amount", L("ledger.col.amount"), x.amount == null ? "" : Number(x.amount).toFixed(2).replace(".", DEC), { half: true, required: true, inputmode: "decimal",
          placeholder: L("us.exp.amountPlaceholder") }) +
        field("supplier", L("us.exp.col.vendor"), x.supplier, { required: true, placeholder: L("us.exp.vendorPlaceholder") }) +
        field("label", L("us.exp.description"), x.label, { placeholder: L("us.exp.descriptionPlaceholder") }) +
        field("line", L("us.exp.col.line"), x.line || "", { options: lineOptions, hint: '<span id="line-help">' + esc(HELP[x.line] || L("us.exp.lineHint")) + "</span>" }) +
        field("method", L("pay.method"), x.method, { options: methods, half: true }) +
        field("ref", L("us.exp.ref"), x.ref, { half: true, placeholder: L("us.exp.refPlaceholder") }) +
        '</div><p class="form-error" id="expense-error" role="alert" hidden></p><div class="espace-actions">' +
        '<button type="submit" class="btn btn-primary">' + L("common.save") + '</button><a class="btn btn-ghost" href="#/depenses?annee=' + esc(String(x.date).slice(0, 4)) + '">' +
        L("common.cancel") + "</a>" + (isNew ? "" : '<button type="button" class="btn btn-ghost" id="expense-delete">' + L("line.remove") + "</button>") + "</div></form>";
      var form = $("expense-form");
      form.elements.line.addEventListener("change", function () { $("line-help").textContent = HELP[this.value] || L("us.exp.lineHint"); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var f = form.elements;
        var next = { date: f.date.value, supplier: f.supplier.value.trim(), label: f.label.value.trim(), method: f.method.value, ref: f.ref.value.trim(),
                     amount: OF.num(f.amount.value), line: f.line.value };
        var errors = E.checkExpense(next, R);
        f.supplier.setAttribute("aria-invalid", String(!next.supplier));
        f.amount.setAttribute("aria-invalid", String(!(next.amount > 0)));
        f.line.setAttribute("aria-invalid", String(!LINES[next.line]));
        if (errors.length) {
          showError("expense-error", errors.join(" "));
          (!next.supplier ? f.supplier : !(next.amount > 0) ? f.amount : !LINES[next.line] ? f.line : f.date).focus();
          return;
        }
        showError("expense-error", "");
        next.amount = Math.round(next.amount * 100) / 100;
        var target = isNew ? { id: S.uid(), createdAt: now() } : x;
        Object.assign(target, next, { updatedAt: now() });
        if (isNew) D().expenses.push(target);
        persist(isNew ? L("us.exp.saved") : L("us.exp.updated")).then(function () { location.hash = "#/depenses?annee=" + next.date.slice(0, 4); });
      });
      if (!isNew) $("expense-delete").addEventListener("click", function () {
        if (!confirm(L("us.exp.confirmDelete"))) return;
        D().expenses = D().expenses.filter(function (e) { return e.id !== x.id; });
        persist(L("us.exp.deleted")).then(function () { location.hash = "#/depenses?annee=" + x.date.slice(0, 4); });
      });
    }

    // ----- Impôts : acomptes estimés, données du calcul, 1099 attendus (documentation/60, § 2.3 à § 2.5 ; U5 à U7) ---

    /** Données du calcul de l'année fiscale (profile.taxYears[année], valeurs générales du profil par défaut). */
    var taxInputs = function (year) { return E.taxInput({ documents: D().documents, expenses: D().expenses, profile: profile(), rules: R, today: TODAY }, year); };
    var pctText = function (rate) { return ctx.percent(Math.round(rate * 1000) / 10); };
    var amountField = function (name, label, value, hint) {
      return field(name, label, value === null || value === undefined || value === "" ? "" : String(Math.round(Number(value) * 100) / 100).replace(".", DEC),
        { half: true, inputmode: "decimal", placeholder: L("us.tax.optional"), hint: hint });
    };
    /** Lit un montant facultatif : null si vide, NaN si illisible ou négatif. */
    var readAmount = function (raw) { raw = String(raw || "").trim(); if (!raw) return null; var n = OF.num(raw); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN; };

    /**
     * Écran « Taxes » : bénéfice projeté, impôt fédéral estimé, acompte trimestriel requis (calculateur public, U6),
     * échéancier de l'année avec les acomptes versés, données du calcul de l'année, 1099-NEC attendus (U7).
     */
    function viewTaxes() {
      var year = +YEAR, t = taxInputs(year), est = E.estimatedTax(t), q = est.quarterly, p = profile();
      var dates = R["estimated_tax_due_dates_" + year] || null;
      var paid = [1, 2, 3, 4].map(function (n) { return E.paidFor(p, year, n); });
      var paidTotal = Math.round(paid.reduce(function (s, x) { return s + x; }, 0) * 100) / 100;
      var ty = (p.taxYears || {})[String(year)] || {};
      var f1099 = E.expected1099(D().documents, D().clients, String(year), R);
      var limit = R.estimated_tax_high_agi_threshold || {};
      view.innerHTML = '<div class="espace-head"><h2>' + L("us.tax.title", { year: year }) + '</h2><div class="espace-quick espace-noprint">' +
        '<a class="btn btn-ghost btn-sm" href="#/schedule-c">' + L("us.sc.open") + "</a></div></div>" +
        '<div class="kpis kpis-4">' +
        kpi(L("us.tax.profit"), money(est.projected), est.projected === est.actual ? L("us.tax.profitActual") :
          t.expectedProfit !== undefined && t.expectedProfit !== null && t.expectedProfit !== "" ? L("us.tax.profitExpected") : L("us.tax.profitProjected", { actual: money(est.actual) })) +
        kpi(L("us.tax.federal"), money(est.estimate.federal), L("us.tax.federalSub")) +
        kpi(L("us.tax.quarterly"), q.needed ? money(q.perQuarter) : "–", q.needed ? L("us.tax.quarterlySub", { required: money(q.required) })
          : L("us.dash.nextTaxNone", { amount: money(R.estimated_tax_threshold) }), "is-brand") +
        kpi(L("us.tax.paid"), money(paidTotal), L("us.tax.paidSub", { year: year })) + "</div>" +
        // Échéancier et acomptes versés.
        '<form class="card espace-card" id="paid-form" novalidate><h3>' + L("us.tax.schedule", { year: year }) + "</h3>" +
        (dates ? '<table class="ledger lines-table"><thead><tr><th>' + L("us.tax.col.payment") + '</th><th class="num">' + L("us.tax.col.due") +
          '</th><th class="num">' + L("us.tax.col.left") + "</th></tr></thead><tbody>" +
          dates.map(function (d, i) {
            var left = q.needed ? Math.max(0, Math.round((q.perQuarter - paid[i]) * 100) / 100) : 0;
            return "<tr><td>" + L("us.tax.payment", { n: i + 1, date: day(d) }) + (d < TODAY ? ' <span class="small muted">' + L("us.tax.past") + "</span>" : "") +
              '</td><td class="num" data-label="' + esc(L("us.tax.col.due")) + '">' + (q.needed ? esc(money(q.perQuarter)) : "–") +
              '</td><td class="num" data-label="' + esc(L("us.tax.col.left")) + '">' + (q.needed ? esc(money(left)) : "–") + "</td></tr>";
          }).join("") + "</tbody></table>" +
          '<div class="fields">' + dates.map(function (d, i) {
            return amountField("paid" + (i + 1), L("us.tax.paidField", { n: i + 1 }), paid[i] || "", "");
          }).join("") + "</div>" + (R.estimated_tax_q4_skip_rule ? '<p class="small muted">' + esc(R.estimated_tax_q4_skip_rule) + "</p>" : "")
          : '<p class="notice">' + L("us.dash.nextTaxNoDates", { year: year }) + "</p>") +
        '<p class="form-error" id="paid-error" role="alert" hidden></p>' +
        (dates ? '<div class="espace-actions"><button type="submit" class="btn btn-primary">' + L("us.tax.savePaid") + "</button></div>" : "") + "</form>" +
        // Données du calcul de l'année.
        '<form class="card espace-card" id="taxdata-form" novalidate><h3>' + L("us.tax.data", { year: year }) + '</h3><div class="fields">' +
        amountField("expectedProfit", L("us.tax.expectedProfit"), ty.expectedProfit, L("us.tax.expectedProfitHint", { actual: money(est.actual) })) +
        amountField("wages", L("us.tax.wages"), ty.wages, L("us.tax.wagesHint")) +
        amountField("withheld", L("us.tax.withheld"), ty.withheld, L("us.tax.withheldHint")) +
        amountField("priorTax", L("us.tax.priorTax"), ty.priorTax, L("us.tax.priorTaxHint")) +
        amountField("priorAgi", L("us.tax.priorAgi"), ty.priorAgi, L("us.tax.priorAgiHint")) +
        amountField("otherIncome", L("us.tax.otherIncome"), ty.otherIncome, L("us.tax.otherIncomeHint")) +
        amountField("homeOffice", L("us.tax.homeOffice"), ty.homeOffice, L("us.tax.homeOfficeHintHtml")) +
        '</div><p class="form-error" id="taxdata-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-primary">' +
        L("common.save") + "</button></div></form>" +
        // Méthode et règles.
        '<section class="card espace-card"><h3>' + L("us.tax.how") + '</h3><ul class="small prospect-rules">' +
        "<li>" + L("us.tax.howMethodHtml", { status: L("us.status." + (t.status || "single")) }) + "</li>" +
        "<li>" + L("us.tax.howSafeHarbor", { current: pctText(R.estimated_tax_safe_harbor_current_year_rate), prior: pctText(R.estimated_tax_safe_harbor_prior_year_rate),
          high: pctText(R.estimated_tax_safe_harbor_prior_year_rate_high_agi), limit: money(limit["default"]), limitMfs: money(limit.married_filing_separately) }) + "</li>" +
        "<li>" + L("us.tax.howThreshold", { amount: money(R.estimated_tax_threshold) }) + "</li>" +
        "<li>" + L("us.tax.howLimits") + "</li></ul></section>" +
        // Formulaires 1099-NEC attendus.
        '<section class="card espace-card" id="expected-1099"><h3>' + L("us.f1099.title", { year: year }) + "</h3>" +
        (f1099.threshold === null ? '<p class="muted">' + L("us.f1099.noThreshold", { year: year }) + "</p>" :
          '<p class="small">' + L("us.f1099.intro", { amount: money(f1099.threshold), date: f1099.dueDate ? day(f1099.dueDate) : "–" }) + "</p>" +
          (f1099.clients.length ? '<ul class="time-due">' + f1099.clients.map(function (c) {
            return '<li><span class="dl-main"><a href="#/clients/' + esc(c.clientId) + '"><b>' + esc(c.name) + '</b></a></span><span class="dl-side"><b>' + esc(money(c.total)) + "</b></span></li>";
          }).join("") + "</ul>" : '<p class="muted">' + L("us.f1099.none", { amount: money(f1099.threshold) }) + "</p>") +
          '<p class="small muted">' + esc(R.us_1099_nec_card_exclusion || "") + " " + L("us.f1099.taxable") + "</p>") + "</section>";

      if (dates) {
        var pf = $("paid-form");
        pf.addEventListener("submit", function (e) {
          e.preventDefault();
          var values = dates.map(function (d, i) { return readAmount(pf.elements["paid" + (i + 1)].value); });
          var bad = values.map(function (v) { return v !== null && !isFinite(v); });
          dates.forEach(function (d, i) { pf.elements["paid" + (i + 1)].setAttribute("aria-invalid", String(bad[i])); });
          if (bad.indexOf(true) > -1) { showError("paid-error", L("us.tax.errAmount")); pf.elements["paid" + (bad.indexOf(true) + 1)].focus(); return; }
          showError("paid-error", "");
          var pr = D().profile, map = Object.assign({}, pr.estimatedPaid || {});
          values.forEach(function (v, i) { if (v) map[year + "-" + (i + 1)] = v; else delete map[year + "-" + (i + 1)]; });
          pr.estimatedPaid = map;
          pr.updatedAt = now();
          persist(L("us.tax.paidSaved")).then(function () { ctx.render(true); });
        });
      }
      var tf = $("taxdata-form"), NAMES = ["expectedProfit", "wages", "withheld", "priorTax", "priorAgi", "otherIncome", "homeOffice"];
      tf.addEventListener("submit", function (e) {
        e.preventDefault();
        var values = {}, badName = null;
        NAMES.forEach(function (k) {
          var v = readAmount(tf.elements[k].value);
          tf.elements[k].setAttribute("aria-invalid", String(v !== null && !isFinite(v)));
          if (v !== null && !isFinite(v) && !badName) badName = k;
          values[k] = v;
        });
        if (badName) { showError("taxdata-error", L("us.tax.errAmount")); tf.elements[badName].focus(); return; }
        showError("taxdata-error", "");
        var pr = D().profile, years = Object.assign({}, pr.taxYears || {}), cur = Object.assign({}, years[String(year)] || {});
        NAMES.forEach(function (k) { if (values[k] === null) delete cur[k]; else cur[k] = values[k]; });
        years[String(year)] = cur;
        pr.taxYears = years;
        pr.updatedAt = now();
        persist(L("us.tax.dataSaved")).then(function () { ctx.render(true); });
      });
    }

    /** Synthèse de l'annexe C de l'année (aide à la préparation, pas une déclaration) : écran et export identiques (U5). */
    function viewScheduleC(r) {
      var dates = D().expenses.map(function (e) { return e.date; });
      D().documents.forEach(function (d) { (d.payments || []).forEach(function (x) { dates.push(x.date); }); });
      var years = yearsOf(dates), year = r.params.annee && years.indexOf(r.params.annee) > -1 ? r.params.annee : YEAR;
      var t = taxInputs(year);
      var s = E.scheduleC({ documents: D().documents, expenses: D().expenses, year: year, rules: R, otherIncome: t.otherIncome, homeOffice: t.homeOffice });
      var v = s.values, SUMMARY = ["1", "2", "3", "4", "5", "6", "7", "28", "29", "30", "31"];
      var order = ["1", "2", "3", "4", "5", "6", "7"].concat(Object.keys(LINES).filter(function (k) { return v[k]; }), ["28", "29", "30", "31"]);
      var label = function (k) { return LINES[k] || L("eng.us.line." + k); };
      view.innerHTML = '<div class="espace-head"><h2>' + L("us.sc.title", { year: esc(year) }) + '</h2><div class="espace-quick espace-noprint">' +
        '<button type="button" class="btn btn-ghost btn-sm" id="sc-csv">' + L("common.exportCsv") + "</button>" + printButton("sc-print", false) + "</div></div>" +
        '<div class="card espace-card">' + yearTabs("#/schedule-c", years, year) +
        '<table class="ledger"><thead><tr><th>' + L("us.sc.col.line") + "</th><th>" + L("us.sc.col.desc") + '</th><th class="num">' + L("ledger.col.amount") +
        "</th></tr></thead><tbody>" + order.map(function (k) {
          var strong = SUMMARY.indexOf(k) > -1 && ["3", "5", "7", "28", "29", "31"].indexOf(k) > -1;
          return "<tr" + (strong ? ' class="ledger-subtotal"' : "") + "><td>" + esc(k) + "</td><td>" + esc(label(k)) + '</td><td class="num">' + esc(money(v[k] || 0)) + "</td></tr>";
        }).join("") + "</tbody></table>" +
        '<p class="small muted">' + L("us.sc.notesHtml") + "</p></div>";
      $("sc-csv").addEventListener("click", function () {
        OF.download("\ufeff" + E.scheduleCCSV(s, R), L("us.sc.file", { year: year }), "text/csv;charset=utf-8");
      });
      bindPrint("sc-print");
    }

    // ----- Tableau de bord : prochain acompte d'impôt estimé (documentation/60, § 2.4) -------------------------------

    /**
     * Prochaine échéance d'acompte (dates sourcées de l'année fiscale en cours ou, en janvier, de la précédente) et son
     * montant : celui du calculateur public (estimatedTax), moins l'acompte déjà versé pour cette échéance ; null si les
     * dates de l'année ne sont pas encore dans les règles.
     */
    function nextPayment() {
      var input = { documents: D().documents, expenses: D().expenses, profile: profile(), rules: R, today: TODAY }, best = null;
      [+YEAR - 1, +YEAR].forEach(function (y) {
        (R["estimated_tax_due_dates_" + y] || []).forEach(function (d, i) {
          if (d >= TODAY && (!best || d < best.date)) best = { date: d, year: y, n: i + 1 };
        });
      });
      if (!best) return null;
      var est = E.estimatedTax(E.taxInput(input, best.year));
      best.needed = est.quarterly.needed;
      best.amount = Math.max(0, Math.round((est.quarterly.perQuarter - E.paidFor(profile(), best.year, best.n)) * 100) / 100);
      return best;
    }
    function dashboard() {
      var next = nextPayment();
      var sub = !next ? L("us.dash.nextTaxNoDates", { year: YEAR }) : !next.needed ? L("us.dash.nextTaxNone", { amount: money(R.estimated_tax_threshold) })
        : next.amount > 0 ? L("us.dash.nextTaxSub", { n: next.n, date: day(next.date) }) : L("us.dash.nextTaxPaid", { date: day(next.date) });
      return {
        kpi: kpi(L("us.dash.nextTax"), next && next.needed && next.amount > 0 ? money(next.amount) : "–", sub, "is-brand"),
        note: '<p class="small muted espace-note">' + L("us.dash.taxNoteHtml") + "</p>"
      };
    }

    // ----- Prospects : règles fédérales de prospection (documentation/60, § 3.3, sous-lot 3d-5, D95) -------------

    // Textes officiels lus (mêmes adresses que les sources des règles us_can_spam et us_telemarketing).
    var PROSPECT_SOURCES = {
      canSpam: "https://www.govinfo.gov/content/pkg/USCODE-2023-title15/html/USCODE-2023-title15-chap103.htm",
      rule316: "https://www.govinfo.gov/content/pkg/CFR-2025-title16-vol1/xml/CFR-2025-title16-vol1-part316.xml",
      tcpa: "https://www.govinfo.gov/content/pkg/USCODE-2023-title47/html/USCODE-2023-title47-chap5-subchapII-partI-sec227.htm",
      fcc: "https://www.govinfo.gov/content/pkg/CFR-2025-title47-vol3/xml/CFR-2025-title47-vol3-sec64-1200.xml",
      tsr: "https://www.govinfo.gov/content/pkg/CFR-2025-title16-vol1/xml/CFR-2025-title16-vol1-part310.xml"
    };
    var clock = us.clock;
    /**
     * Règles de prospection : email (loi CAN-SPAM, entreprises comprises), appel d'une entreprise ou d'un particulier
     * (règles de la FCC, exemption « entre entreprises » de la règle de vente par téléphone), appels et SMS automatisés,
     * règles des États non reprises ; pro : true (entreprise), false (particulier), undefined (les deux).
     */
    function prospectRules(pro) {
      var mail = R.us_can_spam, tel = R.us_telemarketing, both = pro === undefined, items = [];
      items.push("<li>" + L("us.pros.emailHtml", { days: mail.optout_mechanism_days, business: mail.optout_honor_business_days }) + "</li>");
      if (both || pro) items.push("<li>" + L("us.pros.phoneProHtml") + "</li>");
      if (both || !pro) {
        items.push("<li>" + L("us.pros.phonePersonHtml", { from: clock(tel.calling_hours[0]), to: clock(tel.calling_hours[1]), age: tel.registry_max_age_days,
          business: tel.dnc_honor_business_days, years: tel.dnc_keep_years }) + "</li>");
      }
      items.push("<li>" + L("us.pros.autodialHtml") + "</li>");
      items.push("<li>" + L("us.pros.states") + "</li>");
      return '<ul class="small prospect-rules">' + items.join("") + '</ul><p class="small muted">' + L("us.pros.sourcesHtml", PROSPECT_SOURCES) + "</p>";
    }
    /** Liste d'opposition : ce qui est gardé, délais fédéraux pour respecter une demande, conservation jusqu'au retrait. */
    function optoutNote() {
      return L("us.pros.optoutText", { email: R.us_can_spam.optout_honor_business_days, phone: R.us_telemarketing.dnc_honor_business_days,
        years: R.us_telemarketing.dnc_keep_years });
    }


    // ----- Échéances : calendrier fédéral selon le profil, acomptes estimés (documentation/60, § 2.6 et § 3.3) ----

    /**
     * Valeurs du profil lues par les conditions du calendrier (« when »), mêmes choix que le calendrier public : les
     * acomptes trimestriels sont toujours retenus (l'Espace les calcule, et leur montant dit s'ils sont requis) ;
     * formulaires 1099-NEC à envoyer et déclaration prolongée selon les cases du profil (non cochées par défaut).
     */
    function deadlineValues() {
      var p = profile();
      return { estimated: "on", contractors: p.contractors ? "on" : "off", extension: p.extension ? "on" : "off" };
    }
    // Catégories de la frise et de la liste (forme et couleur, mêmes formes qu'en France) : acomptes (rond de la couleur
    // principale), déclaration (losange), formulaires 1099 (carré).
    var DEADLINE_CLASSES = { "Estimated tax": ["is-dl-urssaf", L("us.dl.tag.estimated")], "Tax return": ["is-dl-tax", L("us.dl.tag.return")],
                             "1099": ["is-dl-vat", L("us.dl.tag.1099")] };
    // Échéances dont la trésorerie estime le montant : les acomptes (flux « tax » de la prévision).
    var DEADLINE_KINDS = { "Estimated tax": "tax" };
    /** Écran des échéances : acomptes estimés des 90 jours, prochaine déclaration, choix du profil, lien vers le calendrier. */
    function deadlineSummary(dl) {
      var p = profile();
      var payments = dl.soon.filter(function (e) { return e.tag === "Estimated tax"; });
      var ret = dl.events.filter(function (e) { return e.tag === "Tax return"; })[0];
      var total = dl.totals.tax || 0;
      return {
        kpis: kpi(L("us.dl.tax"), payments.length ? money(total) : "–", !payments.length ? L("us.dl.taxNone") :
            total > 0 ? L("us.dl.taxSub", { what: countText(payments.length, L("us.count.payment.one"), L("us.count.payment.many")) }) : L("us.dl.taxZero")) +
          kpi(L("us.dl.return"), ret ? day(ret.date) : "–", ret ? ret.title : L("us.dl.returnNone")),
        priced: total,
        intro: L("us.dl.introHtml", { contractors: p.contractors ? L("us.dl.contractorsOn") : L("us.dl.contractorsOff"),
                                      extension: p.extension ? L("us.dl.extensionOn") : L("us.dl.extensionOff") }),
        link: L("us.dl.calendarLinkHtml")
      };
    }


    // ----- Trésorerie : impôt fédéral déjà dû, hypothèses (documentation/60, § 3.3, D92) ---------------------------

    var TREASURY_KINDS = { tax: L("eng.us.flow.tax") };
    /** Déjà dû (estimé) : impôt fédéral sur le bénéfice réalisé dans l'année, acomptes versés déduits ; note s'il n'y en a aucun. */
    function treasuryOwed(o) {
      var t = o.tax, lines = [], notes = [];
      if (o.total > 0) lines.push("<li>" + L("us.tr.owedHtml", { year: t.year, profit: esc(money(t.actual)), paid: esc(money(t.paid)), amount: esc(money(o.total)) }) + "</li>");
      if (t.accrued > 0 && !t.paid) notes.push(L("us.tr.notePaid"));
      return { lines: lines, notes: notes };
    }
    /** Point mort non calculé dans cette version (documentation/60, § 3.3). */
    function breakEvenNone() { return L("us.tr.breakEvenNone"); }
    /** Factures en retard : pas de pénalité fédérale, frais de retard seulement s'ils sont convenus (règle late_fees_federal_rule). */
    function agingNote() { return L("us.tr.agingHtml"); }
    /** Hypothèses propres aux États-Unis : acomptes, années sans dates sourcées, déjà dû ; ce qui n'est pas compté. */
    function treasuryAssumptions(o, f) {
      var missing = (f && f.missingTaxYears) || [];
      return {
        main: "<li>" + L("us.tr.a.installmentsHtml") + "</li>" +
          (missing.length ? "<li>" + L("us.tr.a.missing", { years: missing.join(", ") }) + "</li>" : "") +
          "<li>" + L("us.tr.a.owed") + "</li>",
        last: "<li>" + L("us.tr.a.notCountedHtml") + "</li>"
      };
    }

    return {
      tabs: { "schedule-c": "taxes" },   // la synthèse de l'annexe C se trouve sous « Taxes »
      routes: {
        taxes: viewTaxes,
        "schedule-c": viewScheduleC,
        recettes: viewIncome,
        depenses: function (r) { (r.id ? viewExpenseForm : viewExpenses)(r); }
      },
      dashboard: dashboard,
      profile: { defaults: profileDefaults, fields: profileFields, bind: bindProfile, read: readProfile, missing: profileMissing },
      client: { defaults: clientDefaults, fields: clientFields, bind: bindClient, read: readClient },
      doc: { serviceDate: false, draft: draftFields, retax: retax, fields: docFields, note: docNote, input: docInput, kindCell: kindCell, issueOptions: issueOptions },
      // Pas de durée de conservation des pistes : aucune règle fédérale lue n'en fixe (pas de rappel de suppression).
      prospects: { retentionYears: function () { return null; }, retentionNote: function () { return ""; }, optoutNote: optoutNote, rules: prospectRules },
      deadlines: { values: deadlineValues, classes: DEADLINE_CLASSES, kinds: DEADLINE_KINDS, summary: deadlineSummary },
      // Pas de case « chiffre d'affaires à venir » (revenueLabel) : les acomptes suivent le bénéfice de l'écran Taxes ;
      // pas de réglage propre : les acomptes versés se saisissent dans Taxes.
      treasury: { kinds: TREASURY_KINDS, owed: treasuryOwed, assumptions: treasuryAssumptions, breakEvenNone: breakEvenNone, agingNote: agingNote }
    };
  };

  /** Heure « 08:00 » ou « 21:00 » des règles, à l'américaine : « 8 a.m. », « 9 p.m. », « 12 p.m. » (midi). */
  us.clock = function (hhmm) {
    var h = +String(hhmm).slice(0, 2), m = String(hhmm).slice(3, 5);
    return (h % 12 || 12) + (m && m !== "00" ? ":" + m : "") + (h < 12 ? " a.m." : " p.m.");
  };

  /**
   * Moteurs de la section (documentation/60, § 3.3, D92) : moteur américain ; moteur de facture international avec les
   * paramètres du générateur public (bloc #invoice-profile de la page, data/invoice-profiles/us.json), pour un aperçu
   * identique (critère U2) ; formats de la section ; coordonnées passées à l'aperçu et à l'émission.
   */
  us.engines = function (TX, OF) {
    var IV = OFE.invoiceIntl, US = OFE.espaceUS;
    if (!IV || !US) return null;
    var E = US.create(TX), el = document.getElementById("invoice-profile");
    var L = function (key) { return TX[key] !== undefined ? TX[key] : key; };
    var P = el ? JSON.parse(el.textContent) : { labels: {}, terms: [] };
    // Avoir : même mise en page qu'une facture, avec son titre et sans mention de paiement.
    var CREDIT = Object.assign({}, P, { labels: Object.assign({}, P.labels, { invoice: L("us.doc.creditTitle"), invoice_number: L("us.doc.creditNumber") }) });
    var TYPES = { facture: "invoice", devis: "estimate", avoir: "invoice" };
    /** Document de l'Espace (avec me et client) vu par le moteur international. */
    function toIntl(d) {
      var me = d.me || {}, credit = d.type === "avoir", tax = d.tax || {};
      return {
        type: TYPES[d.type] || "invoice", number: d.number || "", date: d.date, terms: d.type === "facture" ? d.terms : 0,
        validity: d.type === "devis" ? d.validity : "", po: d.po || "", paid: 0, depositPct: d.type === "devis" ? d.depositPct : 0,
        discountPct: d.discountPct || 0, tax: { rate: tax.rate, label: tax.label || "" },
        me: { name: me.name || "", address: me.address || "", email: me.email || "", phone: me.phone || "", taxId: me.taxId || "", extra: "", logo: me.logo || "" },
        client: d.client || {}, lines: (d.lines || []).map(function (l) { return { desc: l.desc, qty: l.qty, price: l.price }; }),
        payment: credit ? "" : me.payment || "", late: credit ? "" : me.late || "", notes: d.notes || ""
      };
    }
    return {
      engine: E,
      invoice: { amount: IV.amount, addDays: IV.addDays, UNITS: { hour: " h", day: " d" }, compute: US.INV.compute,
                 render: function (d, R, fmt) { return IV.render(toIntl(d), d.type === "avoir" ? CREDIT : P, fmt); } },
      fmt: { money: OF.money, eur: OF.money, num: OF.fmt, rate: OF.rate, date: function (iso) { return OF.date(iso, P.date_format); } },
      parties: {
        me: function (p) {
          return { name: p.name, address: p.address, email: p.email, phone: p.phone, taxId: p.ein || "", logo: p.logo || "",
                   payment: p.payment || "", late: p.late || "" };
        },
        client: function (c) { return { name: c.name, address: c.address, email: c.email, taxId: c.taxId || "", pro: !!c.pro }; }
      }
    };
  };
})(typeof self !== "undefined" ? self : this);
