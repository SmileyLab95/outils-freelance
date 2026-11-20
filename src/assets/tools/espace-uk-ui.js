/*
 * Écrans de l'Espace entrepreneur propres au Royaume-Uni (documentation/61-espace-royaume-uni.md, § 2 et § 3, D97 et
 * D98). Module d'écrans d'un pays : la fabrique OFE.espaceUI.uk reçoit le contexte prêté par tools/espace.js et renvoie
 * ses crochets ; uk.engines déclare les moteurs de la section (moteur britannique, moteur de facture international avec
 * les paramètres du générateur public, formats, coordonnées). Écrans : recettes par année fiscale, dépenses par case du
 * SA103S, synthèse du SA103S, impôt et acomptes (payments on account), Making Tax Digital, seuil de VAT ; échéances,
 * trésorerie, prospection (règlement PECR). Chargé par la page de la section avant tools/espace.js.
 */
(function (root) {
  "use strict";
  var OFE = root.OFE = root.OFE || {};

  var uk = (OFE.espaceUI = OFE.espaceUI || {}).uk = function (ctx) {
    var L = ctx.L, field = ctx.field, OF = ctx.OF, TERMS = ctx.TERMS, profile = ctx.profile, E = ctx.E, R = ctx.R, D = ctx.data;
    var kpi = ctx.kpi, money = ctx.money, day = ctx.day, TODAY = ctx.TODAY;
    var $ = ctx.$, esc = ctx.esc, view = ctx.view, countText = ctx.countText, showError = ctx.showError;
    var persist = ctx.persist, now = ctx.now, S = ctx.S, DEC = ctx.DEC;
    var REGIONS = ["ruk", "scotland"], VAT_STAGGERS = ["none", "1", "2", "3"];
    var str = function (v) { return String(v == null ? "" : v).trim(); };
    // Année fiscale en cours (année de début : 2026 pour 2026/27) et année des règles chargées (barème, dates).
    var TY = String(E.taxYearOf(TODAY)), RY = String(E.rulesYear(R));
    var tyLabel = function (y) { return E.taxYear(y).label; };
    var BOXES = R.uk_sa103s_boxes, HELP = R.uk_allowable_expenses || {};

    /** Case à cocher d'un formulaire, avec son aide. */
    function check(name, label, on, hint) {
      var id = "ep-" + name;
      return '<div class="field full"><label class="check"><input type="checkbox" id="' + id + '" name="' + name + '"' + (on ? " checked" : "") +
        ' aria-describedby="' + id + '-hint"><span>' + esc(label) + '</span></label><span class="hint" id="' + id + '-hint">' + hint + "</span></div>";
    }

    // ----- Profil : région fiscale, coordonnées, numéro de VAT facultatif, coordonnées bancaires ---------------------

    function profileDefaults() { return { region: "ruk", vat: "none" }; }
    /** Champs du profil britannique, entre le nom et la numérotation ; coordonnées après le premier lancement. */
    function profileFields(p, first) {
      return field("region", L("uk.profile.region"), REGIONS.indexOf(p.region) > -1 ? p.region : "ruk",
          { options: REGIONS.map(function (r) { return [r, L("uk.region." + r)]; }), hint: L("uk.profile.regionHint") }) +
        (first ? "" :
          field("address", L("uk.profile.address"), p.address, { textarea: true, placeholder: L("uk.profile.addressPlaceholder") }) +
          field("email", L("profile.email"), p.email, { type: "email", half: true }) +
          field("phone", L("profile.phone"), p.phone, { type: "tel", half: true }) +
          field("vat", L("uk.profile.vat"), VAT_STAGGERS.indexOf(p.vat) > -1 ? p.vat : "none",
            { options: VAT_STAGGERS.map(function (v) { return [v, L("uk.vat." + v)]; }), hint: L("uk.profile.vatHint") }) +
          field("vatNumber", L("uk.profile.vatNumber"), p.vatNumber, { half: true, placeholder: "GB123456789", hint: L("uk.profile.vatNumberHint") }) +
          field("terms", L("uk.profile.terms"), p.terms == null ? 30 : p.terms, { options: TERMS, half: true }) +
          field("payment", L("uk.profile.payment"), p.payment, { textarea: true, placeholder: L("uk.profile.paymentPlaceholder"), hint: L("uk.profile.paymentHint") }) +
          field("late", L("uk.profile.late"), p.late, { placeholder: L("uk.profile.latePlaceholder") }) +
          check("lateInterest", L("uk.profile.lateInterest"), p.lateInterest, L("uk.profile.lateInterestHint")) +
          check("newsa", L("uk.profile.newsa"), p.newsa, L("uk.profile.newsaHint")));
    }
    function bindProfile() {}
    /** Lit les champs du pays dans p ; renvoie { message, field } si un champ est refusé (numéro de VAT sans immatriculation). */
    function readProfile(form, p, first) {
      var f = form.elements;
      p.region = REGIONS.indexOf(f.region.value) > -1 ? f.region.value : "ruk";
      if (first) return null;
      ["address", "email", "phone", "vatNumber", "payment", "late"].forEach(function (k) { p[k] = str(f[k].value); });
      p.vat = VAT_STAGGERS.indexOf(f.vat.value) > -1 ? f.vat.value : "none";
      p.lateInterest = !!f.lateInterest.checked;
      p.newsa = !!f.newsa.checked;
      p.terms = Number(f.terms.value);
      if (p.vatNumber && p.vat === "none") return { message: L("uk.profile.errVat"), field: "vat" };
      return null;
    }
    /** Champs du profil à compléter pour des factures conformes : l'adresse (invoice_requirements_sole_trader). */
    function profileMissing(p) { return str(p.address) ? [] : [L("uk.patch.address")]; }

    // ----- Clients : adresse, email, numéro de VAT facultatif, client hors du Royaume-Uni --------------------------

    function clientDefaults() { return {}; }
    function clientFields(c) {
      return field("address", L("uk.client.address"), c.address, { textarea: true }) +
        field("email", L("profile.email"), c.email, { type: "email", half: true }) +
        field("taxId", L("uk.client.taxId"), c.taxId, { half: true, hint: L("uk.client.taxIdHint") }) +
        check("abroad", L("uk.client.abroad"), c.abroad, L("uk.client.abroadHint"));
    }
    function bindClient() {}
    function readClient(form, c) {
      var f = form.elements;
      ["address", "email", "taxId"].forEach(function (k) { c[k] = str(f[k].value); });
      c.abroad = !!f.abroad.checked;
      return null;
    }

    // ----- Document : VAT (seulement pour une entreprise immatriculée), numéro de bon de commande -------------------

    // Choix de VAT du générateur public (même liste, même effet sur l'aperçu, critère K2) : pas immatriculé, taux normal,
    // réduit, zéro, hors du champ (aucune ligne de VAT, comme sans immatriculation).
    var VAT_CHOICES = ["none", "20", "5", "0", "outside"];
    /** Brouillon neuf : VAT au taux normal si le profil est immatriculé (vat_standard_rate), sinon aucune VAT. */
    function draftFields() {
      var registered = (profile().vat || "none") !== "none", rate = String(Math.round(R.vat_standard_rate * 100));
      return { tax: registered ? { option: rate, rate: +rate, label: "" } : { option: "none", rate: NaN, label: "" }, po: "" };
    }
    function retax() {}
    function kindCell() { return ""; }
    /** Choix de VAT d'un document : celui enregistré, sinon déduit du taux (documents d'avant ce choix). */
    function vatChoice(t) {
      if (VAT_CHOICES.indexOf(t.option) > -1) return t.option;
      var rate = OF.num(t.rate);
      return isFinite(rate) && VAT_CHOICES.indexOf(String(rate)) > -1 ? String(rate) : "none";
    }
    function docFields(d) {
      var t = d.tax || {};
      return '<div class="field"><label for="d-tax-rate">' + L("uk.doc.vat") + '</label><select id="d-tax-rate" name="taxRate">' +
          ctx.options(VAT_CHOICES.map(function (v) { return [v, L("uk.doc.vat." + v)]; }), vatChoice(t)) + "</select></div>" +
        (d.type === "facture" ? '<div class="field"><label for="d-po">' + L("uk.doc.po") + '</label><input type="text" id="d-po" name="po" value="' + esc(d.po || "") + '"></div>' : "");
    }
    function docNote() { return L("uk.doc.vatNote"); }
    function docInput(d, t) {
      d.tax = d.tax || { rate: NaN, label: "" };
      if (t.name === "taxRate") { d.tax = { option: t.value, rate: OF.num(t.value), label: "" }; return true; }
      if (t.name === "po") { d.po = t.value; return true; }
      return false;
    }
    function issueOptions() { return {}; }

    // ----- Outils des écrans : années fiscales, impression, montants -----------------------------------------------

    /** Années fiscales proposées : l'année en cours et celles des dates données, la plus récente d'abord. */
    function yearsOf(dates) {
      var y = {};
      y[TY] = true;
      dates.forEach(function (d) { if (d) y[String(E.taxYearOf(d))] = true; });
      return Object.keys(y).sort().reverse();
    }
    function yearTabs(base, years, year) {
      return '<div class="espace-filters espace-noprint" role="group" aria-label="' + L("uk.year") + '">' + years.map(function (y) {
        return '<a class="tab" href="' + base + "?annee=" + y + '"' + (y === year ? ' aria-current="true"' : "") + ">" + esc(tyLabel(y)) + "</a>";
      }).join("") + "</div>";
    }
    var pickYear = function (r, years) { return r.params.annee && years.indexOf(r.params.annee) > -1 ? r.params.annee : TY; };
    var paymentDates = function () {
      var dates = [];
      D().documents.forEach(function (d) { (d.payments || []).forEach(function (x) { dates.push(x.date); }); });
      return dates;
    };
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
    var listOf = function (items) { return (items || []).join(", "); };
    var pctText = function (rate) { return ctx.percent(Math.round(rate * 10000) / 100); };
    var amountField = function (name, label, value, hint) {
      return field(name, label, value === null || value === undefined || value === "" ? "" : String(Math.round(Number(value) * 100) / 100).replace(".", DEC),
        { half: true, inputmode: "decimal", placeholder: L("uk.tax.optional"), hint: hint });
    };
    /** Lit un montant facultatif : null si vide, NaN si illisible ou négatif. */
    var readAmount = function (raw) { raw = String(raw || "").trim(); if (!raw) return null; var n = OF.num(raw); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN; };
    /** Période « 6 Apr 2026 – 5 Jul 2026 ». */
    var span = function (from, to) { return L("uk.span", { from: day(from), to: day(to) }); };
    /** Trimestre de l'année fiscale en cours qui contient aujourd'hui (1 à 4). */
    var currentQuarter = function () { return E.quarters(TY, R).filter(function (q) { return TODAY >= q.from && TODAY <= q.to; })[0]; };

    // ----- Recettes en caisse par année fiscale (K3) ----------------------------------------------------------------

    /**
     * Livre des recettes : chaque paiement reçu à sa date de réception, chaque remboursement versé sur un avoir à sa date
     * (déduit, D98) ; totaux par trimestre de l'année fiscale (périodes de MTD) et pour l'année ; export et impression.
     */
    function viewIncome(r) {
      var years = yearsOf(paymentDates()), year = pickYear(r, years), ty = E.taxYear(year);
      var inc = E.income(D().documents, ty.start, ty.end), quarters = E.incomeQuarters(D().documents, year, R);
      var receipts = inc.rows.filter(function (x) { return x.kind === "receipt"; }).length, cq = year === TY ? currentQuarter() : null;
      var row = function (x) {
        var refund = x.kind === "refund";
        return '<tr><td class="c-date">' + day(x.date) + '</td><td class="c-client">' + esc(x.client) + '</td><td class="c-ref"><a href="#/documents/' + esc(x.docId) + '">' +
          esc(x.number) + "</a>" + (refund ? " " + L("uk.inc.refundMark") : "") + '</td><td class="c-method">' + esc(E.METHODS[x.method] || x.method) +
          '</td><td class="num">' + esc(money(refund ? -x.amount : x.amount)) + "</td></tr>";
      };
      view.innerHTML = '<div class="espace-head"><h2>' + L("uk.inc.title", { year: esc(ty.label) }) + '</h2><div class="espace-quick espace-noprint">' +
        '<a class="btn btn-ghost btn-sm" href="#/sa103s?annee=' + esc(year) + '">' + L("uk.sa.open") + "</a>" +
        '<button type="button" class="btn btn-ghost btn-sm" id="income-csv"' + (inc.rows.length ? "" : " disabled") + ">" + L("common.exportCsv") + "</button>" +
        printButton("income-print", !inc.rows.length) + "</div></div>" +
        '<div class="kpis kpis-4">' +
        kpi(L("uk.inc.gross"), money(inc.gross), countText(receipts, L("count.receipt.one"), L("count.receipt.many"))) +
        kpi(L("uk.inc.returns"), money(inc.returns), L("uk.inc.returnsSub")) +
        kpi(L("uk.inc.turnover"), money(inc.net), L("uk.box", { n: 9 })) +
        kpi(cq ? L("uk.inc.thisQuarter", { n: cq.n }) : L("uk.inc.lastQuarter"), money(quarters[cq ? cq.n - 1 : 3].net),
          span((cq || quarters[3]).from, (cq || quarters[3]).to)) + "</div>" +
        '<div class="card espace-card">' + yearTabs("#/recettes", years, year) +
        (inc.rows.length ? '<table class="ledger"><thead><tr><th>' + L("uk.inc.col.date") + "</th><th>" + L("ledger.col.client") + "</th><th>" + L("uk.inc.col.doc") +
          "</th><th>" + L("pay.method") + '</th><th class="num">' + L("ledger.col.amount") + "</th></tr></thead><tbody>" +
          quarters.map(function (q) {
            var list = inc.rows.filter(function (x) { return x.date >= q.from && x.date <= q.to; });
            return list.length ? list.map(row).join("") + '<tr class="ledger-subtotal"><td colspan="4">' + L("uk.inc.quarterTotal", { n: q.n, period: esc(span(q.from, q.to)) }) +
              '</td><td class="num">' + esc(money(q.net)) + "</td></tr>" : "";
          }).join("") + '</tbody><tfoot><tr><td colspan="4">' + L("uk.inc.yearTotal", { year: esc(ty.label) }) + '</td><td class="num">' + esc(money(inc.net)) + "</td></tr></tfoot></table>"
          : '<p class="muted">' + L("uk.inc.empty", { year: esc(ty.label) }) + "</p>") +
        '<p class="small muted">' + esc(R.uk_records_proof.cash_basis) + " " + L("uk.inc.refundNote") + "</p>" +
        '<p class="small muted">' + L("uk.inc.keep", { list: esc(listOf(R.uk_records_proof.proof)), years: R.uk_records_retention.years_after_filing_deadline }) + "</p></div>";
      if (!inc.rows.length) return;
      $("income-csv").addEventListener("click", function () {
        OF.download("﻿" + E.incomeCSV(inc), L("uk.inc.file", { year: ty.label.replace("/", "-") }), "text/csv;charset=utf-8");
      });
      bindPrint("income-print");
    }

    // ----- Dépenses par case du SA103S (K4) -------------------------------------------------------------------------

    function expense(id) { return D().expenses.filter(function (e) { return e.id === id; })[0] || null; }
    /** Libellé d'une case : « 18 Phone, fax, stationery and other office costs ». */
    var boxLabel = function (k) { return BOXES.expenses[k] ? k + " " + BOXES.expenses[k] : ""; };
    /** Aide d'une case (fiche HS222) : dépenses admises, puis non admises. */
    function boxHelp(k) {
      var h = HELP[k];
      if (!h) return esc(L("uk.exp.boxHint"));
      return esc(L("uk.exp.allowable", { list: h.allowable.join(" ") })) + " " + esc(L("uk.exp.notAllowable", { list: h.not_allowable.join(" ") }));
    }

    /** Dépenses de l'année fiscale (payées dans l'année), avec leur case du SA103S ; totaux par case. */
    function viewExpenses(r) {
      var years = yearsOf(D().expenses.map(function (e) { return e.date; })), year = pickYear(r, years), ty = E.taxYear(year);
      var list = D().expenses.filter(function (e) { return e && !e.deletedAt && e.date >= ty.start && e.date <= ty.end; })
        .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      var boxes = E.expenseBoxes(D().expenses, ty.start, ty.end, R), used = boxes.rows.filter(function (x) { return x.spent > 0; });
      var top = used.slice().sort(function (a, b) { return b.spent - a.spent; })[0];
      view.innerHTML = '<div class="espace-head"><h2>' + L("uk.exp.title", { year: esc(ty.label) }) + '</h2><div class="espace-quick espace-noprint">' +
        '<a class="btn btn-primary btn-sm" href="#/expenses/new">' + L("uk.exp.add") + "</a>" +
        '<a class="btn btn-ghost btn-sm" href="#/sa103s?annee=' + esc(year) + '">' + L("uk.sa.open") + "</a>" +
        '<button type="button" class="btn btn-ghost btn-sm" id="expenses-csv"' + (list.length ? "" : " disabled") + ">" + L("common.exportCsv") + "</button>" +
        printButton("expenses-print", !list.length) + "</div></div>" +
        '<div class="kpis kpis-4">' +
        kpi(L("uk.exp.spent"), money(boxes.total), countText(list.length, L("uk.count.expense.one"), L("uk.count.expense.many")) + " · " + L("uk.box", { n: 20 })) +
        kpi(L("uk.exp.boxes"), String(used.length), L("uk.exp.boxesSub")) +
        kpi(L("uk.exp.top"), top ? money(top.spent) : "–", top ? boxLabel(top.box) : L("uk.exp.none")) +
        kpi(L("uk.exp.thisMonth"), money(Math.round(list.filter(function (e) { return e.date.slice(0, 7) === TODAY.slice(0, 7); })
          .reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0) * 100) / 100), L("uk.exp.thisMonthSub")) + "</div>" +
        '<div class="card espace-card">' + yearTabs("#/depenses", years, year) +
        (list.length ? '<table class="ledger"><thead><tr><th>' + L("uk.exp.col.date") + "</th><th>" + L("uk.exp.col.supplier") + "</th><th>" + L("uk.exp.col.box") +
          "</th><th>" + L("pay.method") + '</th><th class="num">' + L("ledger.col.amount") + "</th></tr></thead><tbody>" +
          list.map(function (e) {
            return '<tr><td class="c-date">' + day(e.date) + '</td><td class="c-client"><a href="#/depenses/' + esc(e.id) + '">' + esc(e.supplier) + "</a>" +
              (e.label ? '<span class="small muted"> · ' + esc(e.label) + "</span>" : "") + "</td><td>" + esc(boxLabel(e.box)) + '</td><td class="c-method">' +
              esc(E.METHODS[e.method] || e.method) + '</td><td class="num">' + esc(money(Number(e.amount) || 0)) + "</td></tr>";
          }).join("") + '</tbody><tfoot><tr><td colspan="4">' + L("uk.exp.total", { year: esc(ty.label) }) + '</td><td class="num">' + esc(money(boxes.total)) + "</td></tr></tfoot></table>"
          : '<p class="muted">' + L("uk.exp.empty", { year: esc(ty.label) }) + "</p>") + "</div>" +
        (used.length ? '<section class="card espace-card"><h3>' + L("uk.exp.byBox") + '</h3><table class="ledger lines-table"><thead><tr><th>' + L("uk.exp.col.box") +
          '</th><th class="num">' + L("uk.exp.col.spent") + "</th></tr></thead><tbody>" +
          used.map(function (x) {
            return "<tr><td>" + esc(boxLabel(x.box)) + '</td><td class="num" data-label="' + esc(L("uk.exp.col.spent")) + '">' + esc(money(x.spent)) + "</td></tr>";
          }).join("") + "</tbody><tfoot><tr><td>" + L("uk.exp.box20") + '</td><td class="num" data-label="' + esc(L("uk.exp.col.spent")) + '">' +
          esc(money(boxes.total)) + "</td></tr></tfoot></table></section>" : "") +
        '<p class="small muted">' + esc(R.uk_records_proof.cash_basis) + " " + L("uk.exp.capital") + "</p>" +
        '<p class="small muted">' + L("uk.exp.keep", { list: esc(listOf(R.uk_records_proof.proof)), years: R.uk_records_retention.years_after_filing_deadline }) + "</p>";
      if (!list.length) return;
      $("expenses-csv").addEventListener("click", function () {
        OF.download("﻿" + E.expensesCSV(D().expenses, ty.start, ty.end, R), L("uk.exp.file", { year: ty.label.replace("/", "-") }), "text/csv;charset=utf-8");
      });
      bindPrint("expenses-print");
    }

    /** Fiche d'une dépense : date, montant, fournisseur, description, moyen de paiement, référence, case (avec son aide). */
    function viewExpenseForm(r) {
      var isNew = r.id === "nouveau";   // « #/expenses/new » (alias de « nouveau », D96)
      var x = isNew ? { date: TODAY, method: "card", box: "" } : expense(r.id);
      if (!x) { view.innerHTML = '<div class="espace-head"><h2>' + L("uk.exp.notFound") + '</h2></div><p><a href="#/depenses">' + L("uk.exp.back") + "</a></p>"; return; }
      var methods = Object.keys(E.METHODS).map(function (k) { return [k, E.METHODS[k]]; });
      var boxOptions = [["", L("uk.exp.chooseBox")]].concat(E.EXPENSE_BOXES.map(function (k) { return [k, boxLabel(k)]; }));
      view.innerHTML = '<div class="espace-head"><h2>' + (isNew ? L("uk.exp.new") : esc(x.supplier)) + "</h2></div>" +
        '<form class="card espace-card" id="expense-form" novalidate><div class="fields">' +
        field("date", L("uk.exp.col.date"), x.date, { type: "date", half: true, required: true }) +
        field("amount", L("ledger.col.amount"), x.amount == null ? "" : Number(x.amount).toFixed(2).replace(".", DEC), { half: true, required: true, inputmode: "decimal",
          placeholder: L("uk.exp.amountPlaceholder") }) +
        field("supplier", L("uk.exp.col.supplier"), x.supplier, { required: true, placeholder: L("uk.exp.supplierPlaceholder") }) +
        field("label", L("uk.exp.description"), x.label, { placeholder: L("uk.exp.descriptionPlaceholder") }) +
        field("box", L("uk.exp.col.box"), x.box || "", { options: boxOptions, hint: '<span id="box-help">' + boxHelp(x.box) + "</span>" }) +
        field("method", L("pay.method"), x.method, { options: methods, half: true }) +
        field("ref", L("uk.exp.ref"), x.ref, { half: true, placeholder: L("uk.exp.refPlaceholder") }) +
        '</div><p class="form-error" id="expense-error" role="alert" hidden></p><div class="espace-actions">' +
        '<button type="submit" class="btn btn-primary">' + L("common.save") + '</button><a class="btn btn-ghost" href="#/depenses?annee=' + esc(String(E.taxYearOf(x.date))) + '">' +
        L("common.cancel") + "</a>" + (isNew ? "" : '<button type="button" class="btn btn-ghost" id="expense-delete">' + L("line.remove") + "</button>") + "</div></form>";
      var form = $("expense-form");
      form.elements.box.addEventListener("change", function () { $("box-help").innerHTML = boxHelp(this.value); });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var f = form.elements;
        var next = { date: f.date.value, supplier: f.supplier.value.trim(), label: f.label.value.trim(), method: f.method.value, ref: f.ref.value.trim(),
                     amount: OF.num(f.amount.value), box: f.box.value };
        var errors = E.checkExpense(next), boxOk = E.EXPENSE_BOXES.indexOf(next.box) > -1;
        f.supplier.setAttribute("aria-invalid", String(!next.supplier));
        f.amount.setAttribute("aria-invalid", String(!(next.amount > 0)));
        f.box.setAttribute("aria-invalid", String(!boxOk));
        if (errors.length) {
          showError("expense-error", errors.join(" "));
          (!next.supplier ? f.supplier : !(next.amount > 0) ? f.amount : !boxOk ? f.box : f.date).focus();
          return;
        }
        showError("expense-error", "");
        next.amount = Math.round(next.amount * 100) / 100;
        var target = isNew ? { id: S.uid(), createdAt: now() } : x;
        Object.assign(target, next, { updatedAt: now() });
        if (isNew) D().expenses.push(target);
        persist(isNew ? L("uk.exp.saved") : L("uk.exp.updated")).then(function () { location.hash = "#/depenses?annee=" + E.taxYearOf(next.date); });
      });
      if (!isNew) $("expense-delete").addEventListener("click", function () {
        if (!confirm(L("uk.exp.confirmDelete"))) return;
        D().expenses = D().expenses.filter(function (e) { return e.id !== x.id; });
        persist(L("uk.exp.deleted")).then(function () { location.hash = "#/depenses?annee=" + E.taxYearOf(x.date); });
      });
    }

    // ----- Synthèse du SA103S (aide à la préparation, pas une déclaration) -----------------------------------------

    /** Données d'une année fiscale (profile.taxYears[année], valeurs générales du profil par défaut). */
    var yearData = function (year) { return E.yearData(profile(), year); };
    function summaryOf(year) {
      var d = yearData(year);
      return E.summary({ documents: D().documents, expenses: D().expenses, year: year, rules: R, otherIncome: d.otherIncome, tradingAllowance: d.tradingAllowance });
    }
    function viewSummary(r) {
      var years = yearsOf(paymentDates().concat(D().expenses.map(function (e) { return e.date; }))), year = pickYear(r, years);
      var s = summaryOf(year), v = s.values, ty = s.taxYear;
      var label = function (k) { return BOXES.income[k] || BOXES.expenses[k] || BOXES.tax_adjusted[k] || L("eng.uk.box." + k); };
      var order = ["9", "10"].concat(s.tradingAllowance ? ["10.1"] : E.EXPENSE_BOXES.filter(function (k) { return v[k]; }).concat(["20"]),
        ["21", "22", s.profit >= 0 ? "28" : "32"]);
      var notes = [];
      if (s.fullPages) notes.push(L("uk.sa.fullPages", { amount: money(BOXES.short_form_turnover_limit) }));
      if (s.withinAllowance && s.receipts > 0) notes.push(L("uk.sa.withinAllowance", { amount: money(R.trading_allowance) }));
      if (s.allowanceHigher) notes.push(L("uk.sa.allowanceHigher", { amount: money(R.trading_allowance), spent: money(s.spent) }));
      if (s.income.returns > 0) notes.push(L("uk.sa.refunds", { amount: money(s.income.returns) }));
      view.innerHTML = '<div class="espace-head"><h2>' + L("uk.sa.title", { year: esc(ty.label) }) + '</h2><div class="espace-quick espace-noprint">' +
        '<button type="button" class="btn btn-ghost btn-sm" id="sa-csv">' + L("common.exportCsv") + "</button>" + printButton("sa-print", false) + "</div></div>" +
        '<div class="card espace-card">' + yearTabs("#/sa103s", years, year) +
        '<table class="ledger"><thead><tr><th>' + L("uk.sa.col.box") + "</th><th>" + L("uk.sa.col.desc") + '</th><th class="num">' + L("ledger.col.amount") +
        "</th></tr></thead><tbody>" + order.map(function (k) {
          var strong = ["20", "21", "22", "28", "32"].indexOf(k) > -1;
          return "<tr" + (strong ? ' class="ledger-subtotal"' : "") + "><td>" + esc(k) + "</td><td>" + esc(label(k)) + '</td><td class="num">' + esc(money(v[k] || 0)) + "</td></tr>";
        }).join("") + "</tbody></table>" +
        (notes.length ? '<ul class="small prospect-rules">' + notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>" : "") +
        '<p class="small muted">' + L("uk.sa.notesHtml", { form: esc(tyLabel(String(BOXES.tax_year).slice(0, 4))) }) + "</p>" +
        '<p class="small muted">' + L("uk.sa.dataHtml") + "</p></div>";
      $("sa-csv").addEventListener("click", function () {
        OF.download("﻿" + E.summaryCSV(s, R), L("uk.sa.file", { year: ty.label.replace("/", "-") }), "text/csv;charset=utf-8");
      });
      bindPrint("sa-print");
    }

    // ----- Impôt, acomptes et seuil de VAT (K5, K7) ----------------------------------------------------------------

    var taxInput = function (year) { return { documents: D().documents, expenses: D().expenses, profile: profile(), rules: R, today: TODAY, year: year }; };
    /** Libellé d'une ligne de l'échéancier : acompte n de l'année, solde de l'année. */
    function scheduleLabel(row) {
      if (row.kind === "poa") return L("uk.tax.poa", { n: row.n, year: row.year.label });
      if (row.kind === "priorBalancing") return L("uk.tax.priorBalancing", { year: row.year.label });
      return L("uk.tax.balancing", { year: row.year.label });
    }
    /** Carte du seuil de VAT : facturé sur 12 mois glissants face au seuil, part des clients hors du Royaume-Uni. */
    function vatCard() {
      var v = E.vatTurnover(D().documents, D().clients, TODAY, R), registered = (profile().vat || "none") !== "none";
      if (registered) return '<section class="card espace-card" id="vat-card"><h3>' + L("uk.vatc.title") + '</h3><p class="small">' + L("uk.vatc.registered") + "</p></section>";
      var near = v.share >= OF.gaugeNear;
      return '<section class="card espace-card" id="vat-card"><h3>' + L("uk.vatc.title") + "</h3>" +
        '<div class="kpis kpis-2">' +
        kpi(L("uk.vatc.invoiced"), money(v.total), span(v.from, v.to), v.over ? "is-warn" : "") +
        kpi(L("uk.vatc.threshold"), money(v.threshold), L("uk.vatc.share", { pct: pctText(Math.min(v.share, 9.99)) })) + "</div>" +
        '<p class="notice' + (v.over ? " warn" : near ? "" : " ok") + '">' + esc(v.over ? L("uk.vatc.over", { amount: money(v.threshold) }) :
          near ? L("uk.vatc.near", { amount: money(v.threshold) }) : L("uk.vatc.below", { amount: money(v.threshold) })) + "</p>" +
        (v.overseas ? '<p class="small">' + L("uk.vatc.overseasHtml", { amount: esc(money(v.overseas)) }) + "</p>" : "") +
        '<p class="small muted">' + L("uk.vatc.how") + "</p></section>";
    }

    /**
     * Écran « Tax » : bénéfice de l'année fiscale, impôt et Class 4 estimés (calculateur public, K5), échéancier des
     * acomptes et soldes avec les acomptes versés, données du calcul, seuil de VAT (K7). Année sans barème : avis.
     */
    function viewTax() {
      var year = TY, p = profile(), ty = E.taxYear(year);
      if (year !== RY) {
        view.innerHTML = '<div class="espace-head"><h2>' + L("uk.tax.title", { year: esc(ty.label) }) + "</h2></div>" +
          '<p class="notice">' + L("uk.tax.noRules", { year: esc(ty.label), rules: esc(tyLabel(RY)) }) + "</p>" + vatCard();
        return;
      }
      var d = yearData(year), sch = E.taxSchedule(taxInput(year)), est = sch.estimate, st = est.tax;
      var paid = [1, 2].map(function (n) { return E.paidFor(p, year, n); });
      var next = sch.rows.filter(function (x) { return x.date >= TODAY && x.amount !== null && x.amount - (x.paid || 0) > 0; })[0] || null;
      var expected = d.expectedProfit !== undefined && d.expectedProfit !== null && d.expectedProfit !== "";
      view.innerHTML = '<div class="espace-head"><h2>' + L("uk.tax.title", { year: esc(ty.label) }) + '</h2><div class="espace-quick espace-noprint">' +
        '<a class="btn btn-ghost btn-sm" href="#/sa103s">' + L("uk.sa.open") + '</a><a class="btn btn-ghost btn-sm" href="#/mtd">' + L("uk.mtd.open") + "</a></div></div>" +
        '<div class="kpis kpis-4">' +
        kpi(L("uk.tax.profit"), money(est.projected), est.projected === est.actual ? L("uk.tax.profitActual") :
          expected ? L("uk.tax.profitExpected") : L("uk.tax.profitProjected", { actual: money(est.actual) })) +
        kpi(L("uk.tax.bill"), money(st.total), L("uk.tax.billSub", { it: money(st.incomeTax), ni: money(st.class4) }), "is-brand") +
        kpi(L("uk.tax.next"), next ? money(Math.round((next.amount - next.paid) * 100) / 100) : "–", next ? scheduleLabel(next) + " · " + day(next.date) : L("uk.tax.nextNone")) +
        kpi(L("uk.tax.paid"), money(paid[0] + paid[1]), L("uk.tax.paidSub", { year: esc(ty.label) })) + "</div>" +
        // Échéancier et acomptes versés.
        '<form class="card espace-card" id="paid-form" novalidate><h3>' + L("uk.tax.schedule") + "</h3>" +
        '<table class="ledger lines-table"><thead><tr><th>' + L("uk.tax.col.payment") + '</th><th class="num">' + L("uk.tax.col.amount") +
        '</th><th class="num">' + L("uk.tax.col.left") + "</th></tr></thead><tbody>" +
        sch.rows.map(function (x) {
          var known = x.amount !== null, left = known ? Math.max(0, Math.round((x.amount - (x.paid || 0)) * 100) / 100) : null;
          return "<tr><td>" + esc(scheduleLabel(x)) + ' <span class="small muted">' + day(x.date) + (x.date < TODAY ? " · " + L("uk.tax.past") : "") + "</span>" +
            '</td><td class="num" data-label="' + esc(L("uk.tax.col.amount")) + '">' + (known ? esc(money(x.amount)) : L("uk.tax.unknown")) +
            '</td><td class="num" data-label="' + esc(L("uk.tax.col.left")) + '">' + (known ? esc(money(left)) : "–") + "</td></tr>";
        }).join("") + "</tbody></table>" +
        (sch.poa === null ? '<p class="small notice">' + L("uk.tax.needPrior", { year: esc(tyLabel(String(+year - 1))) }) + "</p>" : "") +
        '<div class="fields">' + amountField("paid1", L("uk.tax.paidField", { n: 1, year: ty.label }), paid[0] || "", "") +
        amountField("paid2", L("uk.tax.paidField", { n: 2, year: ty.label }), paid[1] || "", "") + "</div>" +
        '<p class="form-error" id="paid-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-primary">' + L("uk.tax.savePaid") +
        "</button></div></form>" +
        // Données du calcul de l'année.
        '<form class="card espace-card" id="taxdata-form" novalidate><h3>' + L("uk.tax.data", { year: esc(ty.label) }) + '</h3><div class="fields">' +
        amountField("expectedProfit", L("uk.tax.expectedProfit"), d.expectedProfit, L("uk.tax.expectedProfitHint", { actual: esc(money(est.actual)) })) +
        amountField("salary", L("uk.tax.salary"), d.salary, L("uk.tax.salaryHint")) +
        amountField("otherIncome", L("uk.tax.otherIncome"), d.otherIncome, L("uk.tax.otherIncomeHint")) +
        amountField("priorBill", L("uk.tax.priorBill", { year: tyLabel(String(+year - 1)) }), d.priorBill, L("uk.tax.priorBillHint")) +
        amountField("priorBalancing", L("uk.tax.priorBalancingField", { year: tyLabel(String(+year - 1)) }), d.priorBalancing, L("uk.tax.priorBalancingHint")) +
        check("noPoa", L("uk.tax.noPoa", { year: ty.label }), d.noPoa, L("uk.tax.noPoaHint")) +
        check("tradingAllowance", L("uk.tax.tradingAllowance", { amount: money(R.trading_allowance) }), d.tradingAllowance, L("uk.tax.tradingAllowanceHint")) +
        '</div><p class="form-error" id="taxdata-error" role="alert" hidden></p><div class="espace-actions"><button type="submit" class="btn btn-primary">' +
        L("common.save") + "</button></div></form>" +
        // Méthode et règles.
        '<section class="card espace-card"><h3>' + L("uk.tax.how") + '</h3><ul class="small prospect-rules">' +
        "<li>" + L("uk.tax.howMethodHtml", { region: esc(L("uk.region." + (p.region === "scotland" ? "scotland" : "ruk"))) }) + "</li>" +
        "<li>" + L("uk.tax.howPoa", { amount: money(R.payments_on_account_threshold), pct: pctText(R.payments_on_account_source_deduction_test) }) + "</li>" +
        "<li>" + L("uk.tax.howLimits") + "</li></ul></section>" + vatCard();

      var pf = $("paid-form");
      pf.addEventListener("submit", function (e) {
        e.preventDefault();
        var values = [1, 2].map(function (n) { return readAmount(pf.elements["paid" + n].value); });
        var bad = values.map(function (v) { return v !== null && !isFinite(v); });
        [1, 2].forEach(function (n) { pf.elements["paid" + n].setAttribute("aria-invalid", String(bad[n - 1])); });
        if (bad.indexOf(true) > -1) { showError("paid-error", L("uk.tax.errAmount")); pf.elements["paid" + (bad.indexOf(true) + 1)].focus(); return; }
        showError("paid-error", "");
        var pr = D().profile, map = Object.assign({}, pr.poaPaid || {});
        values.forEach(function (v, i) { if (v) map[year + "-" + (i + 1)] = v; else delete map[year + "-" + (i + 1)]; });
        pr.poaPaid = map;
        pr.updatedAt = now();
        persist(L("uk.tax.paidSaved")).then(function () { ctx.render(true); });
      });
      var tf = $("taxdata-form"), NAMES = ["expectedProfit", "salary", "otherIncome", "priorBill", "priorBalancing"];
      tf.addEventListener("submit", function (e) {
        e.preventDefault();
        var values = {}, badName = null;
        NAMES.forEach(function (k) {
          var v = readAmount(tf.elements[k].value);
          tf.elements[k].setAttribute("aria-invalid", String(v !== null && !isFinite(v)));
          if (v !== null && !isFinite(v) && !badName) badName = k;
          values[k] = v;
        });
        if (badName) { showError("taxdata-error", L("uk.tax.errAmount")); tf.elements[badName].focus(); return; }
        showError("taxdata-error", "");
        saveYear(year, function (cur) {
          NAMES.forEach(function (k) { if (values[k] === null) delete cur[k]; else cur[k] = values[k]; });
          ["noPoa", "tradingAllowance"].forEach(function (k) { if (tf.elements[k].checked) cur[k] = true; else delete cur[k]; });
        }, L("uk.tax.dataSaved"));
      });
    }
    /** Enregistre les données d'une année fiscale (profile.taxYears[année]) modifiées par change(cur). */
    function saveYear(year, change, message) {
      var pr = D().profile, years = Object.assign({}, pr.taxYears || {}), cur = Object.assign({}, years[String(year)] || {});
      change(cur);
      years[String(year)] = cur;
      pr.taxYears = years;
      pr.updatedAt = now();
      persist(message).then(function () { ctx.render(true); });
    }

    // ----- Making Tax Digital : concerné ou non, mises à jour trimestrielles (K6) ---------------------------------

    /** Statut MTD du profil : la première année de départ où le revenu éligible dépasse le seuil, ou null. */
    function mtdFrom() {
      var st = E.mtdStatus({ documents: D().documents, profile: profile(), rules: R, today: TODAY });
      return { list: st, first: st.filter(function (x) { return x.applies === true; })[0] || null };
    }
    /**
     * Écran « Making Tax Digital » : pour chaque année de départ, le revenu éligible de l'année de référence face au seuil
     * (saisi, ou tiré des recettes de l'Espace) ; périodes de l'année fiscale en cours avec leurs dates limites, totaux
     * cumulés des recettes et des dépenses par case, à recopier dans un logiciel compatible : l'Espace n'envoie rien.
     */
    function viewMtd(r) {
      var m = mtdFrom(), ups = E.mtdUpdates({ documents: D().documents, expenses: D().expenses, year: TY, rules: R, today: TODAY });
      var pick = +r.params.maj >= 1 && +r.params.maj <= 4 ? +r.params.maj : (ups.filter(function (u) { return u.status === "due"; })[0] ||
        ups.filter(function (u) { return u.status === "open"; })[0] || ups[3]).n;
      var u = ups[pick - 1], used = u.expenses.filter(function (x) { return x.spent > 0; });
      var sourceText = function (x) {
        return x.source === "entered" ? L("uk.mtd.src.entered") : x.source === "records" ? (x.complete ? L("uk.mtd.src.records") : L("uk.mtd.src.soFar")) : L("uk.mtd.src.none");
      };
      // Année de référence pas finie : sous le seuil « pour l'instant » seulement.
      var result = function (x) {
        return x.applies === null ? L("uk.mtd.res.unknown") : x.applies ? L("uk.mtd.res.yes", { date: day(x.startDate) })
          : x.source === "records" && !x.complete ? L("uk.mtd.res.belowSoFar") : L("uk.mtd.res.no");
      };
      view.innerHTML = '<div class="espace-head"><h2>' + L("uk.mtd.title") + '</h2><div class="espace-quick espace-noprint">' +
        '<a class="btn btn-ghost btn-sm" href="#/tax">' + L("uk.tax.open") + "</a></div></div>" +
        '<p class="notice' + (m.first ? " warn" : "") + '">' + esc(m.first ? L("uk.mtd.applies", { date: day(m.first.startDate), year: m.first.incomeYear.label, amount: money(m.first.threshold) })
          : L("uk.mtd.notYet")) + "</p>" +
        '<section class="card espace-card"><h3>' + L("uk.mtd.who") + '</h3><table class="ledger lines-table"><thead><tr><th>' + L("uk.mtd.col.start") + "</th><th>" +
        L("uk.mtd.col.income") + '</th><th class="num">' + L("uk.mtd.col.threshold") + "</th><th>" + L("uk.mtd.col.result") + "</th></tr></thead><tbody>" +
        m.list.map(function (x) {
          return "<tr><td>" + day(x.startDate) + "</td><td>" + esc(x.incomeYear.label) + ": " + (x.amount === null ? "–" : esc(money(x.amount))) +
            ' <span class="small muted">' + esc(sourceText(x)) + '</span></td><td class="num" data-label="' + esc(L("uk.mtd.col.threshold")) + '">' +
            (x.threshold === null ? "–" : esc(money(x.threshold))) + '</td><td data-label="' + esc(L("uk.mtd.col.result")) + '">' + esc(result(x)) + "</td></tr>";
        }).join("") + "</tbody></table>" +
        '<form id="mtd-form" novalidate><div class="fields">' + m.list.map(function (x) {
          return amountField("q" + x.incomeYear.year, L("uk.mtd.field", { year: x.incomeYear.label }), yearData(x.incomeYear.year).qualifyingIncome, "");
        }).join("") + '</div><p class="small muted">' + L("uk.mtd.fieldHint") + '</p><p class="form-error" id="mtd-error" role="alert" hidden></p>' +
        '<div class="espace-actions"><button type="submit" class="btn btn-primary">' + L("common.save") + "</button></div></form>" +
        '<p class="small muted">' + L("uk.mtd.whoNote") + "</p></section>" +
        '<section class="card espace-card" id="mtd-updates"><h3>' + L("uk.mtd.updates", { year: esc(tyLabel(TY)) }) + "</h3>" +
        '<table class="ledger lines-table"><thead><tr><th>' + L("uk.mtd.col.period") + "</th><th>" + L("uk.mtd.col.deadline") + '</th><th class="num">' +
        L("uk.mtd.col.incomeSoFar") + '</th><th class="num">' + L("uk.mtd.col.spentSoFar") + "</th></tr></thead><tbody>" +
        ups.map(function (x) {
          return "<tr" + (x.n === pick ? ' class="ledger-subtotal"' : "") + '><td><a href="#/mtd?maj=' + x.n + '"' + (x.n === pick ? ' aria-current="true"' : "") + ">" +
            esc(L("uk.mtd.update", { n: x.n })) + "</a> " + '<span class="small muted">' + esc(span(x.from, x.to)) + "</span></td><td>" + day(x.deadline) +
            ' <span class="small muted">' + esc(L("uk.mtd.st." + x.status)) + '</span></td><td class="num" data-label="' + esc(L("uk.mtd.col.incomeSoFar")) + '">' +
            esc(money(x.income)) + '</td><td class="num" data-label="' + esc(L("uk.mtd.col.spentSoFar")) + '">' + esc(money(x.spent)) + "</td></tr>";
        }).join("") + "</tbody></table>" +
        "<h4>" + L("uk.mtd.detail", { n: u.n, period: esc(span(u.from, u.to)) }) + "</h4>" +
        '<table class="ledger lines-table"><thead><tr><th>' + L("uk.sa.col.desc") + '</th><th class="num">' + L("uk.mtd.col.soFar") + '</th><th class="num">' +
        L("uk.mtd.col.quarter") + "</th></tr></thead><tbody>" +
        "<tr><td>" + esc("9 " + BOXES.income["9"]) + '</td><td class="num" data-label="' + esc(L("uk.mtd.col.soFar")) + '">' + esc(money(u.income)) +
          '</td><td class="num" data-label="' + esc(L("uk.mtd.col.quarter")) + '">' + esc(money(u.quarterIncome)) + "</td></tr>" +
        used.map(function (x) {
          var prev = u.n > 1 ? ups[u.n - 2].expenses.filter(function (y) { return y.box === x.box; })[0].spent : 0;
          return "<tr><td>" + esc(boxLabel(x.box)) + '</td><td class="num" data-label="' + esc(L("uk.mtd.col.soFar")) + '">' + esc(money(x.spent)) +
            '</td><td class="num" data-label="' + esc(L("uk.mtd.col.quarter")) + '">' + esc(money(Math.round((x.spent - prev) * 100) / 100)) + "</td></tr>";
        }).join("") + "</tbody></table>" +
        '<p class="small muted">' + L("uk.mtd.updatesNote") + "</p></section>" +
        '<p class="small muted">' + L("uk.mtd.notSentHtml") + "</p>";
      var mf = $("mtd-form");
      mf.addEventListener("submit", function (e) {
        e.preventDefault();
        var bad = null, values = {};
        m.list.forEach(function (x) {
          var k = "q" + x.incomeYear.year, v = readAmount(mf.elements[k].value);
          mf.elements[k].setAttribute("aria-invalid", String(v !== null && !isFinite(v)));
          if (v !== null && !isFinite(v) && !bad) bad = k;
          values[x.incomeYear.year] = v;
        });
        if (bad) { showError("mtd-error", L("uk.tax.errAmount")); mf.elements[bad].focus(); return; }
        showError("mtd-error", "");
        var pr = D().profile, years = Object.assign({}, pr.taxYears || {});
        Object.keys(values).forEach(function (y) {
          var cur = Object.assign({}, years[y] || {});
          if (values[y] === null) delete cur.qualifyingIncome; else cur.qualifyingIncome = values[y];
          years[y] = cur;
        });
        pr.taxYears = years;
        pr.updatedAt = now();
        persist(L("uk.mtd.saved")).then(function () { ctx.render(true); });
      });
    }

    // ----- Tableau de bord : prochain paiement de l'impôt -----------------------------------------------------------

    /** Prochain paiement de l'échéancier (montant connu, moins le déjà versé), ou null. */
    function nextPayment() {
      if (TY !== RY && +TY !== +RY + 1) return null;
      var sch = E.taxSchedule(taxInput(RY));
      return sch.rows.filter(function (x) { return x.date >= TODAY && x.amount !== null && x.amount - (x.paid || 0) > 0; })[0] || null;
    }
    function dashboard() {
      var next = nextPayment(), m = mtdFrom(), reminders = "";
      // Mise à jour trimestrielle à envoyer (période finie, date limite à venir), si l'utilisateur est déjà dans MTD.
      var due = m.first && m.first.startDate <= TODAY ? E.mtdUpdates({ documents: D().documents, expenses: D().expenses, year: TY, rules: R, today: TODAY })
        .filter(function (u) { return u.status === "due"; })[0] : null;
      if (due) reminders += '<p class="notice espace-noprint">' + L("uk.dash.mtdDueHtml", { n: due.n, date: day(due.deadline) }) + "</p>";
      var v = E.vatTurnover(D().documents, D().clients, TODAY, R);
      if ((profile().vat || "none") === "none" && v.share >= OF.gaugeNear) {
        reminders += '<p class="notice' + (v.over ? " warn" : "") + ' espace-noprint">' + (v.over ? L("uk.dash.vatOverHtml", { amount: esc(money(v.total)) }) : L("uk.dash.vatNearHtml", { amount: esc(money(v.total)) })) + "</p>";
      }
      return {
        reminders: reminders,
        kpi: kpi(L("uk.dash.nextTax"), next ? money(Math.round((next.amount - next.paid) * 100) / 100) : "–",
          next ? scheduleLabel(next) + " · " + day(next.date) : L("uk.dash.nextTaxNone"), "is-brand"),
        note: '<p class="small muted espace-note">' + L("uk.dash.taxNoteHtml") + "</p>"
      };
    }

    // ----- Prospects : règlement PECR (articles 21, 22, 2 et 26) ---------------------------------------------------

    var PROSPECT_SOURCES = {
      reg22: "https://www.legislation.gov.uk/uksi/2003/2426/regulation/22",
      reg21: "https://www.legislation.gov.uk/uksi/2003/2426/regulation/21",
      reg2: "https://www.legislation.gov.uk/uksi/2003/2426/regulation/2",
      reg26: "https://www.legislation.gov.uk/uksi/2003/2426/regulation/26"
    };
    /**
     * Règles de prospection : emails et SMS aux abonnés individuels (particuliers, sole traders, partnerships : accord
     * préalable ou soft opt-in), aux sociétés (article 22 non applicable), appels (numéro présenté, opposition, registre
     * de l'article 26) ; pro : true (entreprise), false (particulier), undefined (les deux).
     */
    function prospectRules(pro) {
      var mail = R.uk_pecr_email, items = [];
      items.push("<li>" + L("uk.pros.emailHtml", { conditions: esc(mail.soft_opt_in.join("; ")) }) + "</li>");
      if (pro === undefined || pro) items.push("<li>" + L("uk.pros.companyHtml") + "</li>");
      items.push("<li>" + L("uk.pros.callsHtml", { days: R.uk_pecr_calls.register_grace_days }) + "</li>");
      items.push("<li>" + L("uk.pros.gdpr") + "</li>");
      return '<ul class="small prospect-rules">' + items.join("") + '</ul><p class="small muted">' + L("uk.pros.sourcesHtml", PROSPECT_SOURCES) + "</p>";
    }
    function optoutNote() { return L("uk.pros.optoutText"); }

    // ----- Échéances : calendrier britannique selon le profil --------------------------------------------------------

    /**
     * Valeurs du profil lues par les conditions du calendrier (« when »), mêmes choix que le calendrier public : Making
     * Tax Digital d'après le revenu éligible (mtdStatus : « 2026 », « 2027 » ou « no ») ; VAT selon l'immatriculation
     * du profil ; acomptes sauf si l'utilisateur a dit n'en avoir aucun ou que l'impôt de l'an dernier est sous 1 000 £ ;
     * inscription au Self Assessment si le profil le coche.
     */
    function deadlineValues() {
      var p = profile(), first = mtdFrom().first, d = yearData(RY), prior = d.priorBill;
      var lowPrior = prior !== undefined && prior !== null && prior !== "" && Number(prior) < R.payments_on_account_threshold;
      return { mtd: first && first.start <= 2027 ? String(first.start) : "no", vat: VAT_STAGGERS.indexOf(p.vat) > -1 ? p.vat : "none",
               poa: d.noPoa || lowPrior ? "off" : "on", newsa: p.newsa ? "on" : "off" };
    }
    // Catégories de la frise et de la liste : acomptes (rond de la couleur principale), Self Assessment (losange), VAT
    // (carré), Making Tax Digital et fin d'année fiscale (information).
    var DEADLINE_CLASSES = { "Payment on account": ["is-dl-urssaf", L("uk.dl.tag.poa")], "Self Assessment": ["is-dl-tax", L("uk.dl.tag.sa")],
                             "VAT": ["is-dl-vat", L("uk.dl.tag.vat")], "Making Tax Digital": ["is-dl-info", L("uk.dl.tag.mtd")], "Tax year": ["is-dl-info", L("uk.dl.tag.year")] };
    // Échéances dont la trésorerie estime le montant : acomptes et soldes (flux « poa » et « balancing » de la prévision).
    var DEADLINE_KINDS = { "Payment on account": "poa", "Self Assessment": "balancing" };
    function deadlineSummary(dl) {
      var v = deadlineValues(), pays = dl.soon.filter(function (e) { return e.amount !== null && DEADLINE_KINDS[e.tag]; });
      var total = Math.round(((dl.totals.poa || 0) + (dl.totals.balancing || 0)) * 100) / 100;
      var nextMtd = dl.events.filter(function (e) { return e.tag === "Making Tax Digital" && e.kind === "filing"; })[0];
      return {
        kpis: kpi(L("uk.dl.tax"), pays.length ? money(total) : "–", pays.length ? L("uk.dl.taxSub", { what: countText(pays.length, L("uk.count.payment.one"), L("uk.count.payment.many")) })
            : L("uk.dl.taxNone")) +
          kpi(L("uk.dl.mtd"), nextMtd ? day(nextMtd.date) : "–", nextMtd ? nextMtd.title : v.mtd === "no" ? L("uk.dl.mtdNo") : L("uk.dl.mtdNone")),
        priced: total,
        intro: L("uk.dl.introHtml", { mtd: v.mtd === "no" ? L("uk.dl.mtdOff") : L("uk.dl.mtdOn", { year: v.mtd }),
                                      vat: v.vat === "none" ? L("uk.dl.vatOff") : L("uk.dl.vatOn"), poa: v.poa === "on" ? L("uk.dl.poaOn") : L("uk.dl.poaOff") }),
        link: L("uk.dl.calendarLinkHtml")
      };
    }

    // ----- Trésorerie : impôt déjà dû, hypothèses ------------------------------------------------------------------

    var TREASURY_KINDS = { poa: L("eng.uk.flow.poa"), balancing: L("eng.uk.flow.balancing") };
    function treasuryOwed(o) {
      var t = o.tax, lines = [], notes = [];
      if (t && o.total > 0) lines.push("<li>" + L("uk.tr.owedHtml", { year: esc(t.year.label), profit: esc(money(t.actual)), paid: esc(money(t.paid)), amount: esc(money(o.total)) }) + "</li>");
      if (t && t.accrued > 0 && !t.paid) notes.push(L("uk.tr.notePaid"));
      return { lines: lines, notes: notes };
    }
    function breakEvenNone() { return L("uk.tr.breakEvenNone"); }
    function agingNote() { return L("uk.tr.agingHtml"); }
    function treasuryAssumptions(o, f) {
      var missing = (f && f.missingTaxYears) || [], unknown = (f && f.unknownTax) || [];
      return {
        main: "<li>" + L("uk.tr.a.scheduleHtml") + "</li>" +
          (unknown.length ? "<li>" + L("uk.tr.a.unknownHtml", { n: unknown.length }) + "</li>" : "") +
          (missing.length ? "<li>" + L("uk.tr.a.missing", { years: missing.map(function (t) { return t.label; }).join(", ") }) + "</li>" : "") +
          "<li>" + L("uk.tr.a.owed") + "</li>",
        last: "<li>" + L("uk.tr.a.notCountedHtml") + "</li>"
      };
    }

    return {
      tabs: { sa103s: "tax", mtd: "tax" },   // la synthèse du SA103S et Making Tax Digital se trouvent sous « Tax »
      // Adresses en anglais (D96) : adresse affichée → nom interne de l'écran ou de l'identifiant.
      aliases: { income: "recettes", expenses: "depenses", time: "temps", bill: "facturer", leads: "prospects", "cash-flow": "tresorerie",
                 deadlines: "echeances", settings: "reglages", "import": "importer", "new": "nouveau" },
      routes: {
        tax: viewTax,
        sa103s: viewSummary,
        mtd: viewMtd,
        recettes: viewIncome,
        depenses: function (r) { (r.id ? viewExpenseForm : viewExpenses)(r); }
      },
      dashboard: dashboard,
      profile: { defaults: profileDefaults, fields: profileFields, bind: bindProfile, read: readProfile, missing: profileMissing },
      client: { defaults: clientDefaults, fields: clientFields, bind: bindClient, read: readClient },
      doc: { serviceDate: false, draft: draftFields, retax: retax, fields: docFields, note: docNote, input: docInput, kindCell: kindCell, issueOptions: issueOptions },
      // Pas de durée de conservation fixée pour les pistes (UK GDPR : aussi longtemps que nécessaire) : pas de rappel.
      prospects: { retentionYears: function () { return null; }, retentionNote: function () { return ""; }, optoutNote: optoutNote, rules: prospectRules },
      deadlines: { values: deadlineValues, classes: DEADLINE_CLASSES, kinds: DEADLINE_KINDS, summary: deadlineSummary },
      treasury: { kinds: TREASURY_KINDS, owed: treasuryOwed, assumptions: treasuryAssumptions, breakEvenNone: breakEvenNone, agingNote: agingNote }
    };
  };

  /**
   * Moteurs de la section : moteur britannique ; moteur de facture international avec les paramètres du générateur
   * public (bloc #invoice-profile de la page, data/invoice-profiles/uk.json), pour un aperçu identique (critère K2) ;
   * formats de la section ; coordonnées passées à l'aperçu et à l'émission. Les relances d'un client professionnel en
   * retard mentionnent les intérêts légaux si le profil le demande (profile.lateInterest ; règles de la page).
   */
  uk.engines = function (TX, OF) {
    var IV = OFE.invoiceIntl, UK = OFE.espaceUK;
    if (!IV || !UK) return null;
    var E = UK.create(TX), el = document.getElementById("invoice-profile");
    var L = function (key) { return TX[key] !== undefined ? TX[key] : key; };
    var P = el ? JSON.parse(el.textContent) : { labels: {}, terms: [] };
    var CREDIT = Object.assign({}, P, { labels: Object.assign({}, P.labels, { invoice: L("uk.doc.creditTitle"), invoice_number: L("uk.doc.creditNumber") }) });
    var TYPES = { facture: "invoice", devis: "estimate", avoir: "invoice" };
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
    var pct = function (x) { return OF.fmt(Math.round(x * 10000) / 100) + "%"; };
    var email = E.email;
    E.email = function (kind, doc, documents, profile, today, fmt) {
      var client = (doc.snapshot && doc.snapshot.client) || {};
      return email(kind, doc, documents, profile, today, Object.assign({ pct: pct }, fmt),
                   { interest: !!(profile && profile.lateInterest) && client.pro !== false, rules: root.OF_RULES });
    };
    return {
      engine: E,
      invoice: { amount: IV.amount, addDays: IV.addDays, UNITS: { hour: " h", day: " d" }, compute: UK.INV.compute,
                 render: function (d, R, fmt) { return IV.render(toIntl(d), d.type === "avoir" ? CREDIT : P, fmt); } },
      fmt: { money: OF.money, eur: OF.money, num: OF.fmt, rate: OF.rate, date: function (iso) { return OF.date(iso, P.date_format); } },
      parties: {
        me: function (p) {
          return { name: p.name, address: p.address, email: p.email, phone: p.phone, taxId: p.vatNumber || "", logo: p.logo || "",
                   payment: p.payment || "", late: p.late || "" };
        },
        client: function (c) { return { name: c.name, address: c.address, email: c.email, taxId: c.taxId || "", pro: !!c.pro }; }
      }
    };
  };
})(typeof self !== "undefined" ? self : this);
