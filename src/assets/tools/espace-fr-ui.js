/*
 * Écrans de l'Espace entrepreneur propres à la France (documentation/60-espace-etats-unis.md, § 3.2, décision D90) :
 * immobilisations et amortissements (documentation/57) ; tableau de bord (déclaration Urssaf, plafonds, registre des
 * achats) ; profil (activité, TVA, micro-entreprise, coordonnées). Module d'écrans d'un pays : la fabrique
 * OFE.espaceUI.fr reçoit le contexte prêté par tools/espace.js (textes, formats, champs, données, règles…) et renvoie ses
 * crochets ; routes : écrans en plus du cadre commun. Chargé par la page de la section avant tools/espace.js.
 */
(function (root) {
  "use strict";
  var OFE = root.OFE = root.OFE || {};
  (OFE.espaceUI = OFE.espaceUI || {}).fr = function (ctx) {
    var $ = ctx.$, L = ctx.L, esc = ctx.esc, money = ctx.money, day = ctx.day, percent = ctx.percent, DEC = ctx.DEC, field = ctx.field, options = ctx.options, kpi = ctx.kpi, countText = ctx.countText, showError = ctx.showError, persist = ctx.persist, now = ctx.now, isMicro = ctx.isMicro, profile = ctx.profile, view = ctx.view, amountText = ctx.amountText, E = ctx.E, R = ctx.R, S = ctx.S, OF = ctx.OF, TODAY = ctx.TODAY, YEAR = ctx.YEAR;
    var D = ctx.data, CAL = ctx.CAL, longDay = ctx.longDay, TERMS = ctx.TERMS, checkEndpoint = ctx.checkEndpoint;   // données de l'Espace : l'objet change à chaque chargement, d'où une fonction

    function asset(id) { return D().assets.filter(function (a) { return a.id === id; })[0] || null; }
    var ASSET_HINTS = { deductible: L("as.hint.deductible"), partial: L("as.hint.partial") };
    var assetNotes = '<p class="small muted">' + L("as.notes") + "</p>";

    function viewAssets(r) {
      var head = '<div class="espace-head"><h2>' + L("as.title") + "</h2>";
      if (isMicro()) {
        view.innerHTML = head + '</div><div class="card espace-card"><p>' + L("as.microHtml") + '</p><p><a href="#/depenses">' + L("exp.back") + "</a></p></div>";
        return;
      }
      var first = D().assets.reduce(function (m, a) { var y = E.assetStart(a).slice(0, 4); return y < m ? y : m; }, YEAR);
      var years = [];
      for (var y = +first; y <= +YEAR + 1; y++) years.push(String(y));
      var year = /^\d{4}$/.test(r.params.annee || "") && r.params.annee >= "1990" && r.params.annee <= "2100" ? r.params.annee : YEAR;
      if (years.indexOf(year) < 0) years.push(year);
      var res = E.assetsYear(D().assets, year, R);
      var Y = { year: esc(year) };
      view.innerHTML = head + '<div class="espace-quick espace-noprint"><a class="btn btn-primary btn-sm" href="#/immobilisations/nouveau">' + L("as.new") + "</a>" +
        '<button type="button" class="btn btn-ghost btn-sm" id="assets-csv"' + (res.rows.length ? "" : " disabled") + ">" + L("common.exportCsv") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-sm" id="assets-print"' + (res.rows.length ? "" : " disabled") + ">" + L("common.print") + "</button></div></div>" +
        '<div class="kpis kpis-4 espace-noprint">' + kpi(L("as.kpi.amount", { year: year }), money(res.amount), L("as.kpi.amountSub")) +
        kpi(L("as.kpi.deductible"), money(res.deductible), res.pending ? L("as.kpi.pending", { what: countText(res.pending, L("count.asset.one"), L("count.asset.many")) }) : L("as.kpi.deductibleSub")) +
        kpi(L("as.kpi.net"), money(res.net), L("as.kpi.netSub")) + kpi(L("as.kpi.count"), String(res.count), L("as.kpi.countSub", { year: year })) + "</div>" +
        '<div class="card espace-card"><div class="espace-filters espace-noprint" role="group" aria-label="' + L("common.year") + '">' +
        years.sort().reverse().map(function (y) { return '<a class="tab" href="#/immobilisations?annee=' + y + '"' + (y === year ? ' aria-current="true"' : "") + ">" + y + "</a>"; }).join("") + "</div>" +
        "<h3>" + L("as.register", Y) + "</h3>" +
        (res.rows.length ? '<div class="table-scroll" tabindex="0" role="region" aria-label="' + L("as.registerShort", Y) + '"><table class="ledger assets-table"><thead><tr><th>' + L("as.col.nature") +
          "</th><th>" + L("as.col.acquired") + '</th><th class="num">' + L("as.col.cost") + '</th><th class="num">' + L("as.col.years") + '</th><th class="num">' + L("as.col.annuity", Y) +
          '</th><th class="num">' + L("as.col.net") + '</th><th class="num">' + L("as.col.deductible") + "</th></tr></thead><tbody>" +
          res.rows.map(function (x) {
            var a = x.asset;
            return '<tr><td class="c-asset"><a href="#/immobilisations/' + esc(a.id) + '">' + esc(a.label) + "</a>" +
              (a.proShare != null && a.proShare !== "" && Number(a.proShare) < 100 ? '<span class="small muted">' + L("as.partial", { pct: esc(String(a.proShare).replace(".", DEC)) }) + "</span>" : "") +
              vehicleMention(a) +
              (x.sold ? '<span class="small muted">' + L("as.sold", { date: day(a.soldOn), amount: esc(money(a.salePrice)) }) +
                (x.disposal ? L("as.sep") + esc(disposalLabel(x.disposal.result)) + (x.disposal.split === "unknown" ? L("as.splitUnknown") :
                  x.disposal.longTerm ? L("as.split", { short: esc(money(x.disposal.shortTerm)), long: esc(money(x.disposal.longTerm)) }) :
                  x.disposal.result ? L("as.shortOnly") : "") : "") + "</span>" : "") + '</td><td class="c-date" data-label="' + L("as.col.acquired") + '">' + day(a.acquiredOn) +
              (a.inServiceOn && a.inServiceOn !== a.acquiredOn ? '<span class="small muted">' + L("as.inService", { date: day(a.inServiceOn) }) + "</span>" : "") +
              '</td><td class="num" data-label="' + L("as.col.cost") + '">' + esc(money(a.cost)) + '</td><td class="num" data-label="' + L("as.col.years") + '">' +
              esc(countText(a.years, L("count.year.one"), L("count.year.many"))) +
              '</td><td class="num" data-label="' + L("as.col.annuity", Y) + '">' + esc(money(x.amount)) + '</td><td class="num" data-label="' + L("as.col.net") + '">' + esc(money(x.net)) +
              '</td><td class="num" data-label="' + L("as.col.deductible") + '">' + deductibleCell(x.deductible) + "</td></tr>";
          }).join("") + '</tbody><tfoot><tr><td colspan="4">' + L("as.total", Y) + '</td><td class="num" data-label="' + L("as.col.annuities") + '">' + esc(money(res.amount)) +
          '</td><td class="num" data-label="' + L("as.col.net") + '">' + esc(money(res.net)) +
          '</td><td class="num" data-label="' + L("as.col.deductible") + '">' + esc(money(res.deductible)) + "</td></tr></tfoot></table></div>"
          : '<p class="muted">' + L("as.none", Y) + ' <a href="#/immobilisations/nouveau">' + L("as.add") + "</a></p>") +
        (res.disposals.count ? '<p class="asset-disposals">' + L("as.disposalsHtml", { year: esc(year), short: esc(money(res.disposals.shortTerm)), long: esc(money(res.disposals.longTerm)) }) +
          (res.disposals.pending ? L("as.disposalsPending", { what: countText(res.disposals.pending, L("count.disposal.one"), L("count.disposal.many")) }) : "") + ".</p>" : "") +
        exemptionBlock(year, res.disposals) +
        '<p class="small muted">' + L("as.registerNote") + "</p>" + assetNotes + "</div>";
      if (!res.rows.length) return;
      $("assets-csv").addEventListener("click", function () {
        OF.download("\ufeff" + E.assetsCSV(res), L("as.file", { year: year }), "text/csv;charset=utf-8");
      });
      $("assets-print").addEventListener("click", function () {
        document.body.classList.add("print-ledger");
        window.print();
        document.body.classList.remove("print-ledger");
      });
    }

    /**
     * Exonération des petites entreprises (article 151 septies du CGI, documentation/57 § 10) : règle, puis estimation pour
     * un BNC d'après les encaissements HT des deux années précédentes ; rien sans plus-value nette ni plus-value à établir.
     */
    function exemptionBlock(year, disposals) {
      if (!(disposals.shortTerm > 0 || disposals.longTerm > 0 || disposals.pendingGains)) return "";
      var X = R.plus_values_exoneration_151_septies, S = X.services_bnc, V = X.sales;
      var eur0 = function (n) { return OF.money(n, 0); }, rate = function (r) { return percent(Math.round(r * 10000) / 100); };
      var start = profile().startDate, x = E.exemption151(D().documents, year, disposals, R, start);
      var lines = [L("as.ex.rule", { years: X.activity_years, sFull: eur0(S.full_up_to), vFull: eur0(V.full_up_to), sPartial: eur0(S.partial_below), vPartial: eur0(V.partial_below) })];
      var A = x.activity, endOfYear = L("as.ex.endOfYear", { year: year });
      lines.push(A.status === "met" ? L("as.ex.met", { end: endOfYear, start: day(start) }) :
        A.status === "not_met" ? L("as.ex.notMet", { end: endOfYear, start: day(start), reached: day(A.reachedOn) }) :
        L("as.ex.noStart"));
      if (x.reason !== "activity") {   // condition des cinq ans non remplie : rien à estimer
        if (x.kind === null) {
          lines.push(L("as.ex.impossible", { years: x.receipts.filter(function (r) { return !r.count; }).map(function (r) { return r.year; }).join(L("as.ex.norIn")),
            both: x.years.join(L("as.ex.and")) }));
        } else {
          var amounts = L("as.ex.amounts", { short: money(x.shortTerm), long: money(x.longTerm) });
          lines.push(L("as.ex.estimate", { receipts: x.receipts.map(function (r) { return L("as.ex.receipt", { year: r.year, amount: money(r.amount) }); }).join(", "),
            average: money(x.average) }) +
            (x.kind === "full" ? L("as.ex.full", { amounts: amounts }) :
              x.kind === "partial" ? L("as.ex.partial", { rate: rate(x.rate), limit: eur0(S.partial_below), average: money(x.average), divisor: eur0(S.divisor), amounts: amounts }) :
              L("as.ex.none", { limit: eur0(S.partial_below) })) +
            L("as.ex.assumes"));
        }
        lines.push(L("as.ex.bic") + (disposals.pending ? L("as.ex.pendingNotCounted") : ""));
      }
      return '<div class="notice asset-exemption"><p>' + L("as.ex.titleHtml") +
        lines.map(function (l, i) { return (i ? "<p>" : "") + esc(l) + "</p>"; }).join("") + "</div>";
    }

    /** Mention du registre pour une voiture particulière plafonnée (documentation/57 § 8). */
    function vehicleMention(a) {
      var v = E.vehicleCap(a, R);
      return v && v.status === "capped" ? '<span class="small muted">' + L("as.vehicleCap", { amount: esc(OF.money(v.cap, 0)) }) + "</span>" : "";
    }
    /** Part déductible ; « à établir » quand l'Espace ne peut pas la calculer (voiture particulière, documentation/57 § 8). */
    function deductibleCell(n) { return n === null ? '<span class="muted">' + L("as.tbd") + "</span>" : esc(money(n)); }
    function readAsset(form) {
      var f = form.elements, num = function (v) { return String(v).trim() ? OF.num(v) : null; };
      var car = f.category.value === "transport";   // carte grise : seulement pour un véhicule (documentation/57 § 8)
      return { label: f.label.value.trim(), category: f.category.value, acquiredOn: f.acquiredOn.value, inServiceOn: f.inServiceOn.value || "",
               cost: num(f.cost.value), years: num(f.years.value), proShare: num(f.proShare.value), soldOn: f.soldOn.value || "", salePrice: num(f.salePrice.value),
               vp: car && f.vp.checked, firstRegOn: car ? f.firstRegOn.value || "" : "", co2: car ? num(f.co2.value) : null };
    }
    /**
     * Message d'un véhicule (documentation/57 § 8) : plafond de l'amortissement déductible des voitures particulières
     * (4 de l'article 39 du CGI), calculé depuis la règle plafond_amortissement_vp.
     */
    function vehicleHint(x) {
      var v = E.vehicleCap(x, R), euros = function (n) { return Number(n) % 1 ? money(n) : OF.money(n, 0); };
      if (!v) return "";
      if (v.status === "not_vp") return L("as.v.notVp");
      if (v.status === "before") return L("as.v.before");
      if (v.status === "missing") return L("as.v.missing");
      var what = L("as.v.what", { co2: v.co2, norm: v.wltp ? L("as.v.wltp") : L("as.v.nedc"), cap: euros(v.cap) });
      if (v.status === "under") return what + L("as.v.under");
      var share = x.proShare != null && x.proShare !== "" && Number(x.proShare) < 100;
      return what + L("as.v.fraction", { cap: euros(v.cap), cost: euros(x.cost) }) + (share ? L("as.v.private") : "");
    }

    /** Nature d'un résultat de cession : « plus-value de 1 295,89 € », « moins-value de 224,66 € », « ni plus-value ni moins-value ». */
    function disposalLabel(n) {
      return n > 0 ? L("as.d.gain", { amount: money(n) }) : n < 0 ? L("as.d.loss", { amount: money(-n) }) : L("as.d.neither");
    }
    /**
     * Cession d'un bien (documentation/57 § 9) : résultat, durée de détention, répartition entre court et long terme, ou
     * montants à établir ; rappel du régime (étalement, taux du long terme, exonération possible), depuis la règle
     * plus_values_professionnelles.
     */
    function disposalBlock(x) {
      var d = E.assetDisposal(x, R);
      if (!d) return "";
      var P = R.plus_values_professionnelles, pct = L("fmt.percent", { n: String(x.proShare).replace(".", DEC) });
      var partVehicle = x.category === "transport" && Number(x.proShare) < 100;
      var lines = [L("as.d.first", { date: day(x.soldOn), price: money(x.salePrice), net: money(d.net), result: (d.gross ? L("as.d.article") : "") + disposalLabel(d.gross) }) +
        (partVehicle && d.gross ? L("as.d.proPart", { amount: money(Math.abs(d.result)), pct: pct }) : "") + "."];
      if (d.reason === "partial") lines.push(L("as.d.partial"));
      else if (d.reason === "vehicle_cap") lines.push(L("as.d.vehicleCap"));
      else if (d.result < 0) lines.push(L("as.d.lossShort"));
      else if (d.result > 0 && !d.heldTwoYears) lines.push(L("as.d.gainShort", { years: P.holding_years }));
      else if (d.result > 0) lines.push(L("as.d.gainLong", { years: P.holding_years, short: money(d.shortTerm) }) + (d.longTerm ? L("as.d.andLong", { long: money(d.longTerm) }) : "") + ".");
      if (d.result) lines.push(L("as.d.regime", { spread: P.short_term_spread_years, rate: String(P.long_term_rate).replace(".", DEC) }) +
        (d.result > 0 ? L("as.d.exemption", { year: x.soldOn.slice(0, 4) }) : ""));
      return '<div class="notice asset-disposal">' + lines.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") + "</div>";
    }

    /** Plan d'amortissement et messages d'un bien (aperçu de la fiche) ; rien tant que la saisie n'est pas valide. */
    function assetPreview(x) {
      if (E.assetErrors(x, R).length) return '<p class="small muted">' + L("as.p.incomplete") + "</p>";
      var plan = E.assetPlan(x, R), hints = E.assetHints(x, R);
      return hints.map(function (h) { return '<p class="notice">' + esc(h === "vehicle" ? vehicleHint(x) : ASSET_HINTS[h]) + "</p>"; }).join("") +
        '<div class="table-scroll" tabindex="0" role="region" aria-label="' + L("as.p.title") + '"><table class="ledger asset-plan"><thead><tr><th>' + L("common.year") +
        '</th><th class="num">' + L("as.p.days") + '</th><th class="num">' + L("as.p.annuity") + '</th><th class="num">' + L("as.p.cumulative") + "</th>" +
        '<th class="num">' + L("as.col.net") + '</th><th class="num">' + L("as.col.deductible") + "</th></tr></thead><tbody>" + plan.map(function (row) {
          return '<tr><td class="c-date">' + row.year + '</td><td class="num" data-label="' + L("as.p.days") + '">' + (row.days === null ? L("as.p.fullYear") : row.days + " / " + row.yearDays) +
            '</td><td class="num" data-label="' + L("as.p.annuity") + '">' + esc(money(row.amount)) + '</td><td class="num" data-label="' + L("as.p.cumulative") + '">' + esc(money(row.cumulative)) +
            '</td><td class="num" data-label="' + L("as.col.net") + '">' + esc(money(row.net)) + '</td><td class="num" data-label="' + L("as.col.deductible") + '">' + deductibleCell(row.deductible) + "</td></tr>";
        }).join("") + "</tbody></table></div>" + disposalBlock(x);
    }

    /** Carte grise d'un véhicule : voiture particulière, première immatriculation, CO2 (affichés pour la catégorie « Véhicule »). */
    function vehicleFields(x) {
      var hide = x.category === "transport" ? "" : " hidden";
      var mark = function (html) { return html.replace('<div class="field', '<div' + hide + ' class="asset-vehicle field'); };
      return '<div' + hide + ' class="asset-vehicle field full"><label class="check"><input type="checkbox" id="ep-vp" name="vp"' + (x.vp ? " checked" : "") +
        "><span>" + L("as.f.vp") + "</span></label></div>" +
        mark(field("firstRegOn", L("as.f.firstReg"), x.firstRegOn || "", { type: "date", half: true, hint: L("as.f.firstRegHint") })) +
        mark(field("co2", L("as.f.co2"), x.co2 == null ? "" : String(x.co2), { half: true, inputmode: "numeric", hint: L("as.f.co2Hint") }));
    }

    function viewAssetForm(r) {
      if (isMicro()) { viewAssets(r); return; }
      var isNew = r.id === "nouveau";
      var x = isNew ? { category: "materiel", acquiredOn: TODAY, years: 3, proShare: 100 } : asset(r.id);
      if (!x) { view.innerHTML = '<div class="espace-head"><h2>' + L("as.notFound") + '</h2></div><p><a href="#/immobilisations">' + L("as.back") + "</a></p>"; return; }
      var cats = Object.keys(E.ASSET_CATEGORIES).map(function (k) { return [k, E.ASSET_CATEGORIES[k]]; });
      view.innerHTML = '<div class="espace-head"><h2>' + (isNew ? L("as.newTitle") : esc(x.label)) + "</h2></div>" +
        '<form class="card espace-card" id="asset-form" novalidate><div class="fields">' +
        field("label", L("as.f.label"), x.label, { required: true, placeholder: L("as.f.labelPlaceholder") }) +
        field("category", L("as.f.category"), x.category, { options: cats, half: true }) +
        vehicleFields(x) +
        field("cost", L("as.col.cost"), amountText(x.cost), { half: true, required: true, inputmode: "decimal", placeholder: L("as.f.costPlaceholder"), hint: L("as.f.costHint") }) +
        field("acquiredOn", L("as.f.acquired"), x.acquiredOn, { type: "date", half: true, required: true }) +
        field("inServiceOn", L("as.f.inService"), x.inServiceOn || "", { type: "date", half: true, hint: L("as.f.inServiceHint") }) +
        field("years", L("as.f.years"), x.years == null ? "" : String(x.years), { half: true, required: true, inputmode: "numeric",
          hint: L("as.f.yearsHint") }) +
        field("proShare", L("as.f.proShare"), x.proShare == null ? "100" : String(x.proShare).replace(".", DEC), { half: true, inputmode: "decimal",
          hint: L("as.f.proShareHint") }) +
        field("soldOn", L("as.f.soldOn"), x.soldOn || "", { type: "date", half: true }) +
        field("salePrice", L("as.f.salePrice"), amountText(x.salePrice), { half: true, inputmode: "decimal", hint: L("as.f.salePriceHint") }) +
        '</div><p class="form-error" id="asset-error" role="alert" hidden></p>' +
        "<h3>" + L("as.p.title") + '</h3><div id="asset-plan" aria-live="polite">' + assetPreview(x) + "</div>" + assetNotes +
        '<div class="espace-actions"><button type="submit" class="btn btn-primary">' + L("common.save") + '</button><a class="btn btn-ghost" href="#/immobilisations">' + L("common.cancel") + "</a>" +
        (isNew ? "" : '<button type="button" class="btn btn-ghost" id="asset-delete">' + L("line.remove") + "</button>") + "</div></form>";
      var form = $("asset-form");
      form.addEventListener("input", function () { $("asset-plan").innerHTML = assetPreview(readAsset(form)); });
      form.addEventListener("change", function () {
        var car = form.elements.category.value === "transport";
        form.querySelectorAll(".asset-vehicle").forEach(function (el) { el.hidden = !car; });
        $("asset-plan").innerHTML = assetPreview(readAsset(form));
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var next = readAsset(form), errors = E.assetErrors(next, R), bad = {};
        errors.forEach(function (er) { bad[er.field] = true; });
        ["label", "category", "acquiredOn", "inServiceOn", "cost", "years", "proShare", "soldOn", "salePrice", "firstRegOn", "co2"].forEach(function (k) {
          form.elements[k].setAttribute("aria-invalid", String(!!bad[k]));
        });
        showError("asset-error", errors.map(function (er) { return er.message; }).join(" "));
        if (errors.length) { form.elements[errors[0].field].focus(); return; }
        next.cost = Math.round(next.cost * 100) / 100;
        if (next.salePrice !== null) next.salePrice = Math.round(next.salePrice * 100) / 100;
        var target = isNew ? { id: S.uid(), createdAt: now() } : x;
        Object.assign(target, next, { updatedAt: now() });
        if (isNew) D().assets.push(target);
        persist(isNew ? L("as.added") : L("as.updated")).then(function () { location.hash = "#/immobilisations?annee=" + E.assetStart(next).slice(0, 4); });
      });
      if (!isNew) $("asset-delete").addEventListener("click", function () {
        if (!confirm(L("as.confirmDelete"))) return;
        D().assets = D().assets.filter(function (a) { return a.id !== x.id; });
        persist(L("as.deleted")).then(function () { location.hash = "#/immobilisations"; });
      });
    }

    function gauge(label, value, max, note) {
      var pct = max > 0 ? Math.min(100, value / max * 100) : 0;
      var cls = pct >= 100 ? "over" : pct >= 80 ? "near" : "";
      return '<div class="gauge"><div class="gauge-head"><span>' + esc(label) + "</span><b>" + esc(money(value)) + " / " + esc(money(max)) +
        '</b></div><div class="progress" role="progressbar" aria-label="' + esc(label) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
        Math.round(pct) + '"><div class="' + cls + '" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        (note ? '<p class="small muted" style="margin: 6px 0 0;">' + esc(note) + "</p>" : "") + "</div>";
    }
    function gauges(th) {
      var html = '<div class="card gauges">' + gauge(L("gauge.ceiling", { year: YEAR }), th.revenue, th.ceiling,
        th.revenue > th.ceiling ? L("gauge.ceilingOver") : "");
      if (th.services) {
        html += gauge(L("gauge.services", { year: YEAR }), th.services.revenue, th.services.ceiling,
          th.services.revenue > th.services.ceiling ? L("gauge.servicesOver") : "");
      }
      if (th.vat && th.vat.mixed) {
        // Activité mixte (BOFiP, BOI-TVA-DECLA-40-10-10, § 160) : deux seuils ; seuils majorés de l'année en cours non
        // précisés pour l'activité mixte (BOI-TVA-DECLA-40-10-10 et 40-10-20 lus le 10/11/2026) : non affirmés (documentation/53).
        var over = th.revenue > th.vat.base || th.services.revenue > th.vat.servicesBase;
        html += gauge(L("gauge.vatGlobal"), th.revenue, th.vat.base, "") +
          gauge(L("gauge.vatServices"), th.services.revenue, th.vat.servicesBase, over ? L("gauge.vatMixedOver") : "");
        html += '<p class="small muted" style="margin: 6px 0 0;">' + L("gauge.vatMixedNote") + "</p>";
      } else if (th.vat) {
        html += gauge(L("gauge.vat"), th.revenue, th.vat.base,
          th.revenue > th.vat.major ? L("gauge.vatMajorOver") :
          th.revenue > th.vat.base ? L("gauge.vatOver", { major: money(th.vat.major) }) : "");
      }
      return html + "</div>";
    }

    /** Vente de marchandises : registre des achats obligatoire (règle registre_achats) ; rappel tant que rien n'est saisi. */
    function purchasesReminder() {
      if (!E.purchasesRequired(profile(), R.registre_achats, R)) return "";
      if (E.expenseRows(D().expenses, YEAR + "-01-01", YEAR + "-12-31").rows.length) return "";
      return '<p class="notice espace-noprint">' + L("remind.purchasesHtml") + "</p>";
    }

    /**
     * Tableau de bord (documentation/55, § 2) : registre des achats à tenir, prochaine déclaration Urssaf en 4e
     * indicateur, jauges des plafonds de la micro-entreprise, note sur l'estimation des cotisations.
     */
    function dashboard() {
      var p = profile();
      var decl = E.nextDeclaration(D().documents, p, R, CAL, TODAY);
      var th = E.thresholds(D().documents, p, R, YEAR);
      var html = "";
      if (decl) {
        var pct = function (r) { return percent(Math.round(r * 1000) / 10); };
        html += '<p class="small muted espace-note">' + (decl.mixed
          // Activité mixte : chaque part au taux de son activité ; formation professionnelle au plus élevé des deux taux.
          ? L("decl.mixedEstimate", { sales: esc(money(decl.parts[0].revenue)), salesRate: pct(decl.parts[0].rates.social + decl.parts[0].rates.cfp),
              services: esc(money(decl.parts[1].revenue)), servicesRate: pct(decl.parts[1].rates.social + decl.parts[1].rates.cfp) }) +
            (decl.rates.acre ? L("decl.acre") : "") +
            (decl.rates.vl ? L("decl.vlMixed", { a: pct(decl.parts[0].rates.vl), b: pct(decl.parts[1].rates.vl) }) : "") +
            L("decl.mixedCfp")
          : L("decl.estimate", { rate: pct(decl.rates.social + decl.rates.cfp) }) + (decl.rates.acre ? L("decl.acre") : "") +
            (decl.rates.vl ? L("decl.vl", { rate: pct(decl.rates.vl) }) : "")) +
          L("decl.whereHtml") + "</p>";
      }
      return {
        reminders: purchasesReminder(),
        kpi: decl ? kpi(L("dash.declaration", { period: decl.period.label }), money(decl.revenue),
          L("dash.declarationSub", { due: longDay(decl.due), total: money(decl.total) }) + (decl.open ? L("dash.periodOpen") : ""), "is-brand") : "",
        afterKpis: isMicro() ? gauges(th) : "",
        note: html
      };
    }


    // ----- Profil : activité, TVA, micro-entreprise, coordonnées (documentation/55, § 2) -----------------------

    var ACTIVITIES = ["liberal_bnc", "cipav", "services_bic", "artisan", "vente", "real"].map(function (k) { return [k, L("activity." + k)]; });
    /** Seconde activité possible (activité mixte, documentation/53) : la vente avec une activité de services. */
    function activity2Options(activity) {
      var none = [["", L("activity.none")]];
      if (activity === "vente") return none.concat(ACTIVITIES.filter(function (a) { return a[0] !== "vente" && a[0] !== "real"; }));
      if (R.micro_activities[activity]) return none.concat(ACTIVITIES.filter(function (a) { return a[0] === "vente"; }));
      return none;
    }
    var VAT_REGIMES = ["franchise", "simplified", "normal"].map(function (k) { return [k, L("vat." + k)]; });
    /** Profil proposé au premier lancement : profession libérale en franchise de TVA, déclarations trimestrielles. */
    function profileDefaults() { return { activity: "liberal_bnc", vatRegime: "franchise", periodicity: "quarterly" }; }
    /** Champs du profil propres à la France, entre le nom et la numérotation ; coordonnées après le premier lancement. */
    function profileFields(p, first) {
      var micro = !!R.micro_activities[p.activity];
      return field("activity", L("profile.activity"), p.activity, { options: ACTIVITIES }) +
        field("vatRegime", L("profile.vatRegime"), p.vatRegime, { options: VAT_REGIMES, half: true }) +
        field("vatRate", L("profile.vatRate"), p.vatRate || 20, { options: [[20, "20 %"], [10, "10 %"], [5.5, "5,5 %"], [2.1, "2,1 %"]], half: true }) +
        field("startDate", L("profile.startDate"), p.startDate, { type: "date", half: true, hint: L("profile.startDateHint") }) +
        '<div class="micro-only full fields"' + (micro ? "" : " hidden") + ">" +
        field("activity2", L("profile.activity2"), p.activity2 || "", { options: activity2Options(p.activity), hint: L("profile.activity2Hint") }) +
        field("periodicity", L("profile.periodicity"), p.periodicity, { options: [["quarterly", L("profile.quarterly")], ["monthly", L("profile.monthly")]], half: true }) +
        field("acre", L("profile.acre"), p.acre || 0, { options: [[0, L("common.no")], [50, L("profile.acre50")], [25, L("profile.acre25")]], half: true }) +
        field("vl", L("profile.vl"), p.vl ? "1" : "0", { options: [["0", L("common.no")], ["1", L("common.yes")]], half: true }) +
        "</div>" +
        (first ? "" :
          field("status", L("profile.status"), p.status, { placeholder: L("profile.statusPlaceholder") }) +
          field("address", L("profile.address"), p.address, { textarea: true, placeholder: L("profile.addressPlaceholder") }) +
          field("siret", L("profile.siret"), p.siret, { half: true, placeholder: L("profile.siretPlaceholder") }) +
          field("vat", L("profile.vat"), p.vat, { half: true }) +
          field("endpoint", L("profile.endpoint"), p.endpoint, { placeholder: L("profile.endpointPlaceholder"), hint: L("profile.endpointHint") }) +
          field("email", L("profile.email"), p.email, { type: "email", half: true }) +
          field("phone", L("profile.phone"), p.phone, { type: "tel", half: true }) +
          field("iban", L("profile.iban"), p.iban, { half: true }) +
          field("bic", L("profile.bic"), p.bic, { half: true }) +
          field("terms", L("profile.terms"), p.terms == null ? 30 : p.terms, { options: TERMS, half: true }) +
          field("penalty", L("profile.penalty"), p.penalty || L("profile.penaltyDefault"), { half: true }));
    }
    /** Bascules du formulaire : champs de la micro-entreprise, seconde activité possible, taux de TVA hors franchise. */
    function bindProfile(form) {
      var toggle = function () {
        form.querySelector(".micro-only").hidden = !R.micro_activities[form.elements.activity.value];
        var second = form.elements.activity2, keep = second.value;
        second.innerHTML = options(activity2Options(form.elements.activity.value), keep);
        form.elements.vatRate.closest(".field").hidden = form.elements.vatRegime.value === "franchise";
      };
      form.elements.activity.addEventListener("change", toggle);
      form.elements.vatRegime.addEventListener("change", toggle);
      toggle();
    }
    /** Lit les champs du pays dans p ; renvoie { message, field } si un champ est refusé, sinon null. */
    function readProfile(form, p, first) {
      var f = form.elements;
      ["activity", "vatRegime", "periodicity", "startDate"].forEach(function (k) { p[k] = f[k].value; });
      p.vatRate = Number(f.vatRate.value);
      p.acre = Number(f.acre.value);
      p.vl = f.vl.value === "1";
      p.activity2 = E.mixedActivities({ activity: p.activity, activity2: f.activity2.value }, R) ? f.activity2.value : "";
      if (!first) {
        ["status", "address", "siret", "vat", "email", "phone", "iban", "bic", "penalty", "endpoint"].forEach(function (k) { p[k] = f[k].value.trim(); });
        var endpointError = checkEndpoint(p.endpoint, p.siret, L("profile.yourSiren"));
        if (endpointError) return { message: endpointError, field: "endpoint" };
        p.terms = Number(f.terms.value);
      }
      return null;
    }

    return {
      routes: { immobilisations: function (r) { (r.id ? viewAssetForm : viewAssets)(r); } },
      dashboard: dashboard,
      profile: { defaults: profileDefaults, fields: profileFields, bind: bindProfile, read: readProfile }
    };
  };
})(typeof self !== "undefined" ? self : this);
