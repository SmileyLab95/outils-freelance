/*
 * Écrans de l'Espace entrepreneur propres à la France (documentation/60-espace-etats-unis.md, § 3.2, décision D90) :
 * immobilisations et amortissements (documentation/57) ; tableau de bord (déclaration Urssaf, plafonds, registre des
 * achats) ; profil (activité, TVA, micro-entreprise, coordonnées) ; fiche client (lieu, SIREN, TVA, adresse
 * électronique de facturation) ; éditeur de document (TVA selon le client, nature, biens ou services des lignes).
 * Facture électronique Factur-X d'un document émis (documentation/10). Livre des recettes et dépenses (registre
 * des achats, documentation/36). Règles de prospection de la CNIL et durée de conservation (documentation/38).
 * Échéances : calendrier selon le profil, cotisations et TVA estimées.
 * Module d'écrans d'un pays : la fabrique
 * OFE.espaceUI.fr reçoit le contexte prêté par tools/espace.js (textes, formats, champs, données, règles…) et renvoie ses
 * crochets ; routes : écrans en plus du cadre commun. Chargé par la page de la section avant tools/espace.js.
 */
(function (root) {
  "use strict";
  var OFE = root.OFE = root.OFE || {};
  (OFE.espaceUI = OFE.espaceUI || {}).fr = function (ctx) {
    var $ = ctx.$, L = ctx.L, esc = ctx.esc, money = ctx.money, day = ctx.day, percent = ctx.percent, DEC = ctx.DEC, field = ctx.field, options = ctx.options, kpi = ctx.kpi, countText = ctx.countText, showError = ctx.showError, persist = ctx.persist, now = ctx.now, isMicro = ctx.isMicro, profile = ctx.profile, view = ctx.view, amountText = ctx.amountText, E = ctx.E, R = ctx.R, S = ctx.S, OF = ctx.OF, TODAY = ctx.TODAY, YEAR = ctx.YEAR;
    var D = ctx.data, CAL = ctx.CAL, longDay = ctx.longDay, TERMS = ctx.TERMS, isMixed = ctx.isMixed;
    var FMT = ctx.FMT, client = ctx.client, parties = ctx.parties, docLabel = ctx.docLabel, loadLazy = ctx.loadLazy;
    var ST = ctx.ST, barList = ctx.barList, pct = ctx.pct, charts = ctx.charts;   // données de l'Espace : l'objet change à chaque chargement, d'où une fonction

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


    // ----- Clients : lieu, pays, SIREN, TVA, adresse électronique de facturation (documentation/55, § 2) ---------

    var regionNames = typeof Intl !== "undefined" && Intl.DisplayNames ? new Intl.DisplayNames([OF.locale], { type: "region" }) : null;
    /** Pays proposés selon le lieu du client, triés par nom ; le premier choix invite à choisir. */
    function countryOptions(place) {
      return [["", L("country.choose")]].concat(E.countries(place === "eu" ? "eu" : "world").map(function (code) {
        return [code, regionNames ? regionNames.of(code) : code];
      }).sort(function (a, b) { return a[1].localeCompare(b[1], OF.locale); }));
    }
    /**
     * Adresse de facturation électronique (annuaire) : vide (le SIREN est utilisé), ou le SIREN suivi éventuellement d'un
     * suffixe ; lettres, chiffres, - _ . seulement (règles BR-FR-21 et BR-FR-23 de la norme XP Z12-012).
     */
    function checkEndpoint(value, sirenOrSiret, whose) {
      if (!value) return "";
      var siren = String(sirenOrSiret || "").replace(/\s+/g, "").slice(0, 9);
      if (!/^[A-Za-z0-9_.-]{9,100}$/.test(value)) return L("endpoint.errChars");
      if (/^\d{9}$/.test(siren) && value.indexOf(siren) !== 0) return L("endpoint.errSiren", { whose: whose, siren: siren });
      return "";
    }

    /** Fiche client nouvelle : client établi en France. */
    function clientDefaults() { return { place: "fr" }; }
    /** Champs de la fiche client propres à la France, entre le type de client et les notes. */
    function clientFields(c) {
      return field("place", L("client.place"), c.place || "fr", { options: [["fr", L("client.place.fr")], ["eu", L("client.place.eu")], ["world", L("client.place.world")]], half: true }) +
        '<div class="full fields" id="client-country"' + (c.place && c.place !== "fr" ? "" : " hidden") + ">" +
        field("country", L("client.country"), c.country || "", { options: countryOptions(c.place), half: true }) + "</div>" +
        field("address", L("profile.address"), c.address, { textarea: true }) +
        field("siren", L("client.siren"), c.siren, { half: true, placeholder: L("client.sirenPlaceholder"), hint: L("client.sirenHint") }) +
        field("vat", L("profile.vat"), c.vat, { half: true }) +
        field("email", L("profile.email"), c.email, { type: "email", half: true }) +
        field("endpoint", L("profile.endpoint"), c.endpoint, { half: true, placeholder: L("client.endpointPlaceholder"), hint: L("client.endpointHint") }) +
        field("delivery", L("client.delivery"), c.delivery, { textarea: true });
    }
    /** Bascule du lieu : liste des pays (Union européenne ou monde) hors de France. */
    function bindClient(form) {
      form.elements.place.addEventListener("change", function () {
        var place = form.elements.place.value;
        $("client-country").hidden = place === "fr";
        if (place !== "fr") form.elements.country.innerHTML = options(countryOptions(place), form.elements.country.value);
      });
    }
    /** Lit les champs du pays dans c ; renvoie { message, field } si un champ est refusé, sinon null. */
    function readClient(form, c) {
      var f = form.elements;
      ["address", "siren", "vat", "email", "delivery", "endpoint"].forEach(function (k) { c[k] = f[k].value.trim(); });
      c.place = f.place.value;
      c.country = c.place === "fr" ? "" : f.country.value;
      var endpointError = c.place === "fr" ? checkEndpoint(c.endpoint, c.siren, L("fx.fill.clientSiren"))
        : c.endpoint && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.endpoint) ? L("client.errEndpointAbroad") : "";
      if (endpointError) return { message: endpointError, field: "endpoint" };
      return null;
    }


    // ----- Éditeur de document : TVA selon le client, nature, biens ou services des lignes (documentation/53) -----

    /** TVA d'un document : régime du profil et lieu du client professionnel. */
    function vatFor(c) {
      var p = profile();
      return { franchise: p.vatRegime === "franchise", rate: p.vatRate || 20, place: c && c.pro ? c.place || "fr" : "fr", debits: false };
    }
    /** Champs du pays d'un brouillon neuf : prestation de services, TVA du profil et du client. */
    function draftFields(c) { return { nature: "services", vat: vatFor(c) }; }
    /** Client du brouillon changé ou modifié : TVA selon son pays, taux choisi gardé. */
    function retax(d, c) { d.vat = Object.assign(vatFor(c), d.vat ? { rate: d.vat.rate } : {}); }
    var LINE_KINDS = [["", L("line.kind.none")], ["biens", L("line.kind.goods")], ["services", L("line.kind.services")]];
    /** Colonne « biens ou services » d'une ligne, pour une facture mixte ; vide sinon. */
    function kindCell(d, l, i) {
      if (d.nature !== "mixte") return "";
      return '<div class="field line-kind"><label for="ln-kind-' + i + '">' + L("line.kind") + '</label><select id="ln-kind-' + i + '" data-k="kind">' +
        options(LINE_KINDS, l.kind || "") + "</select></div>";
    }
    /** Nature du document et taux de TVA (redevable, client en France). */
    function docFields(d) {
      return '<div class="field"><label for="d-nature">' + L("draft.nature") + '</label><select id="d-nature" name="nature">' +
        options([["services", L("draft.nature.services")], ["biens", L("draft.nature.goods")], ["mixte", L("draft.nature.mixed")]], d.nature) + "</select></div>" +
        (d.vat.franchise || d.vat.place !== "fr" ? "" : '<div class="field"><label for="d-rate">' + L("draft.vatRate") + '</label><select id="d-rate" name="rate">' +
          options([[20, "20 %"], [10, "10 %"], [5.5, "5,5 %"], [2.1, "2,1 %"]], d.vat.rate) + "</select></div>");
    }
    /** Note sous l'éditeur : TVA d'un client dans l'Union européenne ou hors de l'Union, franchise en base. */
    function docNote(d) {
      if (d.vat.place === "eu") return L("draft.vatEu");
      if (d.vat.place === "world") return L("draft.vatWorld");
      if (d.vat.franchise) return L("draft.vatFranchise");
      return "";
    }
    /** Saisie d'un champ du pays ; « lines » quand les lignes sont à redessiner (nature changée), false si le champ est commun. */
    function docInput(d, t) {
      if (t.name === "rate") { d.vat.rate = Number(t.value); return true; }
      if (t.name === "nature") { d.nature = t.value; return "lines"; }
      return false;
    }
    /** Options d'émission du moteur : biens et services distingués en activité mixte. */
    function issueOptions() { return { lineKinds: isMixed() }; }


    // ----- Facture électronique (Factur-X) : documentation/10-etude-factur-x.md --------------------------------

    function facturxCard(d) {
      var avoir = d.type === "avoir";
      return '<section class="card espace-card"><h3>' + (avoir ? L("fx.titleCredit") : L("fx.titleInvoice")) + "</h3>" +
        '<p class="small muted">' + L("fx.intro") + "</p>" +
        '<div class="espace-actions"><button type="button" class="btn btn-ghost btn-sm" id="d-facturx">' + (avoir ? L("fx.downloadCredit") : L("fx.downloadInvoice")) +
        '</button><button type="button" class="btn btn-ghost btn-sm" id="d-facturx-xml">' + L("fx.xmlOnly") + "</button></div>" +
        '<div class="small fx-status" id="fx-status" role="status" aria-live="polite"></div></section>';
    }

    /**
     * Document à exporter : coordonnées figées à l'émission, complétées quand elles manquent par les identifiants actuels
     * du profil et de la fiche client (SIRET, SIREN, pays, email, adresses électroniques, adresse avec code postal et ville).
     * Les montants, les lignes et les noms ne changent jamais.
     */
    function exportDoc(d, FX) {
      var snap = d.snapshot || {}, me = Object.assign({}, snap.me), cl = Object.assign({}, snap.client);
      var p = profile(), c = client(d.clientId) || {}, done = [];
      var fill = function (target, key, value, label) {
        if (!String(target[key] || "").trim() && String(value || "").trim()) { target[key] = value; done.push(label); }
      };
      fill(me, "siret", p.siret, L("fx.fill.siret"));
      fill(me, "endpoint", p.endpoint, L("fx.fill.endpoint"));
      if (!FX.address(me).postcode && FX.address({ address: p.address }).postcode) { me.address = p.address; done.push(L("fx.fill.address")); }
      // Lieu du client : celui retenu pour la TVA du document, figé avec lui.
      var place = (d.vat && d.vat.place) || cl.place || "fr";
      if (!cl.place) cl.place = place;
      fill(cl, "id", c.siren, L("fx.fill.clientSiren"));
      fill(cl, "country", place !== "fr" ? c.country : "", L("fx.fill.clientCountry"));
      fill(cl, "email", c.email, L("fx.fill.clientEmail"));
      fill(cl, "endpoint", c.endpoint, L("fx.fill.clientEndpoint"));
      if (place === "fr" && !FX.address(cl).city && FX.address({ address: c.address }).city) { cl.address = c.address; done.push(L("fx.fill.clientAddress")); }
      return { doc: Object.assign({}, d, { snapshot: { me: me, client: cl } }), completed: done };
    }

    /** Logo (image enregistrée dans le profil) converti en JPEG sur fond blanc, ou null. */
    function logoJPEG(src) {
      if (!src) return Promise.resolve(null);
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () {
          if (!img.naturalWidth || !img.naturalHeight) { resolve(null); return; }
          var scale = Math.min(1, 480 / img.naturalWidth, 240 / img.naturalHeight);
          var w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          var paint = canvas.getContext("2d");
          paint.fillStyle = "#fff";
          paint.fillRect(0, 0, w, h);
          paint.drawImage(img, 0, 0, w, h);
          resolve({ jpeg: OFE.pdfa.base64(canvas.toDataURL("image/jpeg", 0.92).split(",")[1]), width: w, height: h });
        };
        img.onerror = function () { resolve(null); };
        img.src = src;
      });
    }

    function exportFacturX(d, xmlOnly, button) {
      var status = $("fx-status");
      button.disabled = true;
      status.textContent = L("fx.preparing");
      var loaded = false;
      loadLazy().then(function () {
        loaded = true;
        var FX = OFE.facturxFR, ex = exportDoc(d, FX), problems = FX.check(ex.doc);
        var base = String(d.number).replace(/[^A-Za-z0-9_-]/g, "-") + "-factur-x";
        var completed = ex.completed.length ? L("fx.completed", { list: ex.completed.join(", ") }) : "";
        if (problems.length) {
          status.innerHTML = '<p class="form-error">' + L("fx.toComply") + "</p><ul>" +
            problems.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul><p><a href="#/reglages">' + L("fx.completeProfile") + "</a>" +
            (client(d.clientId) ? ' · <a href="#/clients/' + esc(d.clientId) + '">' + L("fx.completeClient") + "</a>" : "") + "</p>";
          return;
        }
        if (xmlOnly) {
          OF.download(FX.xml(ex.doc, D().documents, R, FMT), base + ".xml", "application/xml");
          status.textContent = L("fx.xmlDone", { number: d.number }) + completed;
          return;
        }
        return logoJPEG(ex.doc.snapshot.me.logo).then(function (logo) {
          var out = OFE.facturxPDF.build(ex.doc, D().documents, R, FMT, { fonts: OFE.pdfFonts, icc: OFE.pdfSRGB, logo: logo, now: new Date().toISOString() });
          OF.download(out.bytes, base + ".pdf", "application/pdf");
          status.textContent = (d.type === "facture" ? L("fx.pdfDoneF", { label: docLabel(d) }) : L("fx.pdfDoneM", { label: docLabel(d) })) + completed +
            (out.missing.length ? L("fx.missingChars", { chars: out.missing.join(" ") }) : "");
        });
      }).catch(function (error) {
        if (window.console) console.error(error);
        status.textContent = loaded ? L("fx.failed", { error: error && error.message || L("fx.unknownError") }) : L("fx.loadFailed");
      }).then(function () { button.disabled = false; });
    }

    /** Cartes d'un document émis propres à la France : facture électronique d'une facture ou d'un avoir à un professionnel. */
    function issuedCards(d) {
      return (d.type === "facture" || d.type === "avoir") && (parties(d).client || {}).pro ? facturxCard(d) : "";
    }
    /** Boutons de la carte Factur-X, quand elle est affichée. */
    function bindIssued(d) {
      if (!$("d-facturx")) return;
      $("d-facturx").addEventListener("click", function () { exportFacturX(d, false, this); });
      $("d-facturx-xml").addEventListener("click", function () { exportFacturX(d, true, this); });
    }

    // ----- Livre des recettes (micro-entreprise, activité mixte, plafonds) -------------------------------------------------------------------------

    function viewLedger(r) {
      var years = {};
      years[YEAR] = true;
      D().documents.forEach(function (d) { (d.payments || []).forEach(function (p) { years[p.date.slice(0, 4)] = true; }); });
      var year = r.params.annee && years[r.params.annee] ? r.params.annee : YEAR;
      var rows = E.ledger(D().documents, year + "-01-01", year + "-12-31", profile(), R);
      var sum = rows.reduce(function (s, x) { return s + x.amount; }, 0);
      // Activité mixte : ventes et prestations distinctes (BOFiP, BOI-BIC-DECLA-30-30, § 30).
      var mixed = isMixed();
      var parts = function (x) {
        return mixed ? '<td class="num c-part" data-label="' + L("ledger.sales") + '">' + esc(money(x.goods)) + '</td><td class="num c-part" data-label="' + L("ledger.services") + '">' +
          esc(money(x.services)) + "</td>" : "";
      };
      var goodsSum = rows.reduce(function (s, x) { return s + (x.goods || 0); }, 0);
      view.innerHTML = '<div class="espace-head"><h2>' + L("ledger.title", { year: esc(year) }) + '</h2><div class="espace-quick espace-noprint">' +
        '<button type="button" class="btn btn-ghost btn-sm" id="ledger-csv"' + (rows.length ? "" : " disabled") + ">" + L("common.exportCsv") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-sm" id="ledger-print"' + (rows.length ? "" : " disabled") + ">" + L("common.print") + "</button></div></div>" +
        receiptsOverview(year) +
        '<div class="card espace-card"><div class="espace-filters espace-noprint" role="group" aria-label="' + L("common.year") + '">' +
        Object.keys(years).sort().reverse().map(function (y) { return '<a class="tab" href="#/recettes?annee=' + y + '"' + (y === year ? ' aria-current="true"' : "") + ">" + y + "</a>"; }).join("") + "</div>" +
        (rows.length ? "<table class=\"ledger\"><thead><tr><th>" + L("ledger.col.date") + "</th><th>" + L("ledger.col.client") + "</th><th>" + L("ledger.col.nature") +
          "</th><th>" + L("ledger.col.method") + "</th><th>" + L("ledger.col.ref") + "</th>" +
          (mixed ? '<th class="num">' + L("ledger.sales") + '</th><th class="num">' + L("ledger.services") + "</th>" : "") + '<th class="num">' + L("ledger.col.amount") + "</th></tr></thead><tbody>" +
          E.ledgerQuarters(rows, year, TODAY, profile().startDate).map(function (q) {
            return rows.filter(function (x) { return x.date >= q.start && x.date <= q.end; }).map(function (x) {
              return '<tr><td class="c-date">' + day(x.date) + '</td><td class="c-client">' + esc(x.client) + '</td><td class="c-nature">' + esc(x.nature) +
                '</td><td class="c-method">' + esc(x.method) + '</td><td class="c-ref"><a href="#/documents/' + esc(x.docId) + '">' + esc(x.ref) +
                '</a></td>' + parts(x) + '<td class="num">' + esc(money(x.amount)) + "</td></tr>";
            }).join("") + '<tr class="ledger-subtotal"><td colspan="5">' + L("ledger.quarterTotal", { quarter: esc(q.label) }) + (q.open ? L("chart.current") : "") + "</td>" + parts(q) +
              '<td class="num">' + esc(money(q.total)) + "</td></tr>";
          }).join("") + '</tbody><tfoot><tr><td colspan="5">' + L("ledger.yearTotal", { year: esc(year) }) + "</td>" +
            parts({ goods: Math.round(goodsSum * 100) / 100, services: Math.round((sum - goodsSum) * 100) / 100 }) +
            '<td class="num">' + esc(money(sum)) + "</td></tr></tfoot></table>"
          : '<p class="muted">' + L("ledger.empty", { year: esc(year) }) + "</p>") +
        '<p class="small muted">' + L("ledger.how") + " " + (mixed ? L("ledger.mixed") + " " : "") +
        L("ledger.keep", { years: R.conservation_pieces.commerce_annees }) + "</p></div>";
      charts(function () {
        var el = view.querySelector('[data-chart="receipts"]');
        if (!el) return;
        var rc = ST.receipts(D().documents, year, TODAY), refs = [];
        if (isMicro() && year === YEAR) {
          var th = E.thresholds(D().documents, profile(), R, year);
          refs.push({ value: th.ceiling, label: L("ledger.refCeiling"), cls: "is-ceiling" });
          if (th.vat) refs.push({ value: th.vat.base, label: L("gauge.vat"), cls: "is-vat" });
        }
        el.innerHTML = OF.charts.balance({ width: Math.floor(el.getBoundingClientRect().width) || 600, from: year + "-01-01", to: year + "-12-31", refs: refs,
          series: [{ name: L("chart.cashed"), points: rc.points, cls: "is-main", end: rc.end }], title: L("ledger.chartTitle", { year: year }),
          desc: L("ledger.chartDesc", { total: money(rc.total), refs: refs.length ? " ; " + refs.map(function (r) { return r.label + " : " + money(r.value); }).join(" ; ") : "" }) });
      });
      if (!rows.length) return;
      $("ledger-csv").addEventListener("click", function () {
        OF.download("﻿" + E.ledgerCSV(rows), L("ledger.file", { year: year }), "text/csv;charset=utf-8");
      });
      $("ledger-print").addEventListener("click", function () {
        document.body.classList.add("print-ledger");
        window.print();
        document.body.classList.remove("print-ledger");
      });
    }

    /** Livre des recettes : encaissé, trimestre, moyenne, projection et cumul face au plafond (documentation/55, § 2). */
    function receiptsOverview(year) {
      var rc = ST.receipts(D().documents, year, TODAY);
      if (!rc.total && year !== YEAR) return "";
      var th = isMicro() && year === YEAR ? E.thresholds(D().documents, profile(), R, year) : null;
      return '<div class="espace-noprint"><div class="kpis kpis-4">' +
        kpi(L("dash.cashedYear", { year: year }), money(rc.total), countText(rc.points.length - 1, L("count.receiptDay.one"), L("count.receiptDay.many"))) +
        (rc.quarter !== null ? kpi(L("ledger.cashedQuarter", { quarter: rc.quarterLabel }), money(rc.quarter), L("ledger.sinceQuarter")) : kpi(L("ledger.avgQuarter"), money(Math.round(rc.total / 4 * 100) / 100), L("ledger.wholeYear"))) +
        kpi(L("ledger.avgMonth"), rc.average === null ? "–" : money(rc.average), year === YEAR ? L("ledger.monthsElapsed") : L("ledger.over12")) +
        (rc.projection !== null ? kpi(L("ledger.projection"), money(rc.projection), L("ledger.projectionSub") +
          (th && rc.projection > th.ceiling ? L("ledger.overCeiling") : ""), th && rc.projection > th.ceiling ? "is-warn" : "")
          : kpi(L("pay.receipts"), String(rc.points.length - 1), L("ledger.daysWithReceipt"))) + "</div>" +
        '<section class="card espace-card"><div class="card-head"><h3>' + L("ledger.cumulative") + '</h3><span class="small muted">' + L("ledger.sinceJan1") +
        (th ? L("ledger.vsCeiling") + (th.vat ? L("ledger.andVat") : "") : "") + ".</span></div>" +
        '<div class="chart" data-chart="receipts"></div>' + OF.charts.legend([{ cls: "is-main", label: L("ledger.cumulLegend") }].concat(th ? [{ cls: "is-ceiling", label: L("ledger.ceilingLegend", { amount: money(th.ceiling) }) }] : [])
          .concat(th && th.vat ? [{ cls: "is-vat", label: L("ledger.vatLegend", { amount: money(th.vat.base) }) }] : [])) + "</section></div>";
    }

    /**
     * Indicateurs des dépenses : année passée entière, ou période choisie de l'année en cours (documentation/55, § 2 et
     * § 9) ; libellé, bornes, mois de la moyenne et du graphique.
     */
    function expensesFigures(year, key) {
      if (year === YEAR) {
        var x = ST.expensesPeriod(D().expenses, D().documents, TODAY, key, profile(), R);
        return Object.assign(x, { label: x.period.label, from: x.period.from, to: x.period.to,
          averageHint: { trimestre: L("exp.avg.quarter"), annee: L("ledger.monthsElapsed"), "12m": L("ledger.over12") }[x.period.key],
          chartIntro: x.period.key === "annee" ? L("docs.yearIntro", { year: YEAR }) : L("docs.last12Intro"),
          chartTitle: x.period.key === "annee" ? L("exp.chartYear", { year: YEAR }) : L("exp.chart12") });
      }
      return Object.assign(ST.expenses(D().expenses, D().documents, year, TODAY, profile(), R), { period: null, label: L("exp.inYear", { year: year }),
        from: year + "-01-01", to: year + "-12-31", averageHint: L("ledger.over12"), perExpense: null, chartIntro: L("docs.yearIntro", { year: year }), chartTitle: L("exp.chartYear", { year: year }) });
    }
    var EXPENSE_PERIOD_LABELS = { mois: L("period.mois"), trimestre: L("period.trimestre"), annee: L("period.annee"), "12m": L("period.12m") };

    /** Dépenses : période, indicateurs, graphique par mois, catégories et fournisseurs (documentation/55, § 2 et § 9). */
    function expensesOverview(year, key) {
      if (!D().expenses.some(function (e) { return e.date <= TODAY; })) return "";
      var xs = expensesFigures(year, key), top = xs.byCategory[0];
      var tools = '<div class="tr-tools espace-noprint">' + (xs.period ? '<div class="seg" role="group" aria-label="' + L("period.label") + '">' +
        ST.EXPENSE_PERIODS.map(function (k) {
          return '<a class="tab" href="#/depenses' + (k === "annee" ? "" : "?periode=" + k) + '"' + (k === xs.period.key ? ' aria-current="true"' : "") + ">" + EXPENSE_PERIOD_LABELS[k] + "</a>";
        }).join("") + "</div>" : "") + '<span class="small muted">' + L("period.range", { from: day(xs.from), to: day(xs.to) }) + "</span></div>";
      return '<div class="espace-noprint">' + tools + '<div class="kpis kpis-4">' +
        kpi(L("exp.kpiTotal", { period: xs.label }), money(xs.total), xs.count ? countText(xs.count, L("count.expense.one"), L("count.expense.many")) : L("exp.none")) +
        kpi(L("exp.kpiTop"), top ? money(top.amount) : "–", top ? top.name + " · " + pct(top.share) : L("exp.none")) +
        (xs.period && xs.period.key === "mois"
          ? kpi(L("exp.kpiAverage"), xs.perExpense === null ? "–" : money(xs.perExpense), xs.count ? L("exp.kpiAverageSub") : L("exp.none"))
          : kpi(L("ledger.avgMonth"), xs.average === null ? "–" : money(xs.average), xs.averageHint)) +
        kpi(L("exp.kpiRatio"), xs.ratio === null ? "–" : pct(xs.ratio), (xs.ratio === null ? L("exp.noReceipt") :
          L("exp.kpiRatioSub", { period: xs.label })) + (xs.abatement !== null ? L("exp.abatement", { pct: pct(xs.abatement) }) : "")) + "</div>" +
        '<div class="espace-cols tr-charts"><section class="card espace-card"><div class="card-head"><h3>' + L("exp.monthly") + '</h3><span class="small muted">' + esc(xs.chartIntro) + "</span></div>" +
        '<div class="chart" data-chart="expenses"></div>' + OF.charts.table(L("exp.monthly"), [L("chart.month"), L("exp.series")], xs.byMonth.map(function (m) { return [m.label, money(m.amount)]; })) +
        '</section><section class="card espace-card"><h3>' + L("exp.byCategory") + "</h3>" + barList(xs.byCategory) + "<h4>" + L("exp.suppliers") + "</h4>" + barList(xs.suppliers) +
        (xs.abatement !== null ? '<p class="small muted">' + L("exp.abatementNoteHtml", { pct: pct(xs.abatement) }) + "</p>" : "") +
        "</section></div></div>";
    }

    // ----- Dépenses et registre des achats ----------------------------------------------------------------

    function expense(id) { return D().expenses.filter(function (e) { return e.id === id; })[0] || null; }

    function viewExpenses(r) {
      var required = E.purchasesRequired(profile(), R.registre_achats, R);
      var years = {};
      years[YEAR] = true;
      D().expenses.forEach(function (e) { years[e.date.slice(0, 4)] = true; });
      var year = r.params.annee && years[r.params.annee] ? r.params.annee : YEAR;
      var res = E.expenseRows(D().expenses, year + "-01-01", year + "-12-31");
      view.innerHTML = '<div class="espace-head"><h2>' + (required ? L("exp.titlePurchases", { year: esc(year) }) : L("exp.title", { year: esc(year) })) + '</h2><div class="espace-quick espace-noprint">' +
        '<a class="btn btn-primary btn-sm" href="#/depenses/nouvelle">' + (required ? L("exp.addPurchase") : L("exp.add")) + "</a>" +
        (isMicro() ? "" : '<a class="btn btn-ghost btn-sm" href="#/immobilisations">' + L("exp.assets") + "</a>") +
        '<button type="button" class="btn btn-ghost btn-sm" id="expenses-csv"' + (res.rows.length ? "" : " disabled") + ">" + L("common.exportCsv") + "</button>" +
        '<button type="button" class="btn btn-ghost btn-sm" id="expenses-print"' + (res.rows.length ? "" : " disabled") + ">" + L("common.print") + "</button></div></div>" +
        expensesOverview(year, r.params.periode) +
        '<div class="card espace-card"><div class="espace-filters espace-noprint" role="group" aria-label="' + L("common.year") + '">' +
        Object.keys(years).sort().reverse().map(function (y) { return '<a class="tab" href="#/depenses?annee=' + y + '"' + (y === year ? ' aria-current="true"' : "") + ">" + y + "</a>"; }).join("") + "</div>" +
        (res.rows.length ? "<table class=\"ledger\"><thead><tr><th>" + L("ledger.col.date") + "</th><th>" + L("exp.col.supplier") + "</th><th>" + L("ledger.col.nature") +
          "</th><th>" + L("ledger.col.method") + "</th><th>" + L("exp.col.ref") + '</th><th class="num">' + L("ledger.col.amount") + "</th></tr></thead><tbody>" +
          res.rows.map(function (x) {
            return '<tr><td class="c-date">' + day(x.date) + '</td><td class="c-client"><a href="#/depenses/' + esc(x.id) + '">' + esc(x.supplier) + "</a></td><td>" +
              esc(x.label) + '</td><td class="c-method">' + esc(x.method) + '</td><td class="c-ref">' + esc(x.ref) + '</td><td class="num">' + esc(money(x.amount)) + "</td></tr>";
          }).join("") + '</tbody><tfoot><tr><td colspan="5">' + (required ? L("exp.totalPurchases", { year: esc(year) }) : L("exp.total", { year: esc(year) })) + '</td><td class="num">' + esc(money(res.total)) + "</td></tr>" +
          '<tr><td colspan="5">' + L("exp.cash") + '</td><td class="num">' + esc(money(res.cash)) + "</td></tr></tfoot></table>"
          : '<p class="muted">' + (required ? L("exp.emptyPurchasesHtml", { year: esc(year) }) : L("exp.emptyHtml", { year: esc(year) })) + "</p>") +
        '<p class="small muted">' + (required ? L("exp.registerRequired") : L("exp.registerOptional")) + "</p>" +
        (isMicro() ? '<p class="small muted">' + L("exp.microNote") + "</p>" : "") +
        '<p class="small muted">' + L("exp.keep", { years: R.conservation_pieces.commerce_annees }) + "</p></div>";
      charts(function () {
        var el = view.querySelector('[data-chart="expenses"]');
        if (!el) return;
        var xs = expensesFigures(year, r.params.periode);
        el.innerHTML = OF.charts.bars({ width: Math.floor(el.getBoundingClientRect().width) || 600,
          groups: xs.byMonth.map(function (m) { return { key: m.key, label: m.label, values: [m.amount], future: false }; }),
          series: [{ name: L("exp.series"), cls: "is-out" }], title: xs.chartTitle,
          desc: L("exp.chartDesc", { total: money(xs.byMonth.reduce(function (s, m) { return Math.round((s + m.amount) * 100) / 100; }, 0)) }) });
      });
      if (!res.rows.length) return;
      $("expenses-csv").addEventListener("click", function () {
        OF.download("\ufeff" + E.expensesCSV(res.rows), required ? L("exp.filePurchases", { year: year }) : L("exp.file", { year: year }), "text/csv;charset=utf-8");
      });
      $("expenses-print").addEventListener("click", function () {
        document.body.classList.add("print-ledger");
        window.print();
        document.body.classList.remove("print-ledger");
      });
    }

    function viewExpenseForm(r) {
      var isNew = r.id === "nouvelle";
      var x = isNew ? { date: TODAY, method: "carte" } : expense(r.id);
      if (!x) { view.innerHTML = '<div class="espace-head"><h2>' + L("exp.notFound") + '</h2></div><p><a href="#/depenses">' + L("exp.back") + "</a></p>"; return; }
      var methods = Object.keys(E.METHODS).map(function (k) { return [k, E.METHODS[k]]; });
      var required = E.purchasesRequired(profile(), R.registre_achats, R);
      view.innerHTML = '<div class="espace-head"><h2>' + (isNew ? (required ? L("exp.newPurchase") : L("exp.new")) : esc(x.supplier)) + "</h2></div>" +
        '<form class="card espace-card" id="expense-form" novalidate><div class="fields">' +
        field("date", L("ledger.col.date"), x.date, { type: "date", half: true, required: true }) +
        field("amount", L("exp.amount"), x.amount == null ? "" : Number(x.amount).toFixed(2).replace(".", DEC), { half: true, required: true, inputmode: "decimal", placeholder: L("exp.amountPlaceholder"),
          hint: L("exp.amountHint") }) +
        field("supplier", L("exp.col.supplier"), x.supplier, { required: true, placeholder: L("exp.supplierPlaceholder") }) +
        field("label", L("exp.label"), x.label, { placeholder: L("exp.labelPlaceholder") }) +
        field("method", L("pay.method"), x.method, { options: methods, half: true }) +
        field("ref", L("exp.ref"), x.ref, { half: true, placeholder: L("exp.refPlaceholder") }) +
        field("category", L("exp.category"), x.category || "", { half: true, options: [["", L("exp.uncategorized")]].concat(Object.keys(E.EXPENSE_CATEGORIES).map(function (k) {
          return [k, E.EXPENSE_CATEGORIES[k]]; })), hint: L("exp.categoryHint") }) +
        '</div><p class="form-error" id="expense-error" role="alert" hidden></p><div class="espace-actions">' +
        '<button type="submit" class="btn btn-primary">' + L("common.save") + '</button><a class="btn btn-ghost" href="#/depenses?annee=' + esc(String(x.date).slice(0, 4)) + '">' + L("common.cancel") + "</a>" +
        (isNew ? "" : '<button type="button" class="btn btn-ghost" id="expense-delete">' + L("line.remove") + "</button>") + "</div></form>";
      var form = $("expense-form");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var f = form.elements;
        var next = { date: f.date.value, supplier: f.supplier.value.trim(), label: f.label.value.trim(), method: f.method.value,
                     ref: f.ref.value.trim(), amount: OF.num(f.amount.value), category: E.EXPENSE_CATEGORIES[f.category.value] ? f.category.value : "" };
        var errors = E.checkExpense(next);
        f.supplier.setAttribute("aria-invalid", String(!next.supplier));
        f.amount.setAttribute("aria-invalid", String(!(next.amount > 0)));
        if (errors.length) { showError("expense-error", errors.join(" ")); (next.supplier ? (next.amount > 0 ? f.date : f.amount) : f.supplier).focus(); return; }
        showError("expense-error", "");
        next.amount = Math.round(next.amount * 100) / 100;
        var target = isNew ? { id: S.uid(), createdAt: now() } : x;
        Object.assign(target, next, { updatedAt: now() });
        if (isNew) D().expenses.push(target);
        persist(isNew ? L("exp.saved") : L("exp.updated")).then(function () { location.hash = "#/depenses?annee=" + next.date.slice(0, 4); });
      });
      if (!isNew) $("expense-delete").addEventListener("click", function () {
        if (!confirm(L("exp.confirmDelete"))) return;
        D().expenses = D().expenses.filter(function (e) { return e.id !== x.id; });
        persist(L("exp.deleted")).then(function () { location.hash = "#/depenses?annee=" + x.date.slice(0, 4); });
      });
    }


    // ----- Prospects : règles de la CNIL, durée de conservation (documentation/38-prospects.md) ----------------

    var CNIL = {
      email: "https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel",
      phone: "https://www.cnil.fr/fr/prospection-commerciale-par-telephone-hors-automate-dappel-quelles-sont-les-regles",
      optout: "https://www.cnil.fr/fr/comment-utiliser-une-liste-repoussoir-pour-respecter-lopposition-la-prospection"
    };
    /** Règles de la CNIL, en bref, selon le type de prospect (pro : vrai, faux, ou indéfini pour les deux). */
    function prospectRules(pro) {
      var t = R.prospection_telephone;
      var both = pro === undefined;
      var items = [];
      if (both || pro) items.push("<li>" + L("pros.rules.proHtml") + "</li>");
      if (both || !pro) {
        items.push("<li>" + L("pros.rules.personEmailHtml") + "</li>");
        items.push("<li>" + L("pros.rules.personPhoneHtml", { date: esc(longDay(t.depuis)) }) + "</li>");
      }
      items.push("<li>" + L("pros.rules.optout") + "</li>");
      items.push("<li>" + L("pros.rules.retention", { years: R.prospects_conservation.annees }) + "</li>");
      return '<ul class="small prospect-rules">' + items.join("") + '</ul><p class="small muted">' +
        L("pros.rules.sourcesHtml", { email: CNIL.email, phone: CNIL.phone, optout: CNIL.optout }) + "</p>";
    }
    /** Note de la liste d'opposition : ce qui est gardé, et pendant combien de temps (recommandation de la CNIL). */
    function optoutNote() { return L("pros.optoutText", { years: R.prospects_opposition.conservation_min_annees }); }
    /** Prospects à recontacter ou à supprimer : rappel du référentiel de la CNIL. */
    function retentionNote(years) { return L("pros.retentionText", { years: years }); }


    // ----- Échéances : calendrier fiscal selon le profil, cotisations et TVA (documentation/55, § 5.5) -----------

    /** Valeurs du profil lues par les conditions du calendrier (« when ») : périodicité, régime de TVA, année de création. */
    function deadlineValues() {
      var p = profile();
      return { periodicity: p.periodicity, vat: p.vatRegime, created: p.startDate && p.startDate.slice(0, 4) === YEAR ? "on" : "off" };
    }
    /** Échéances masquées : déclarations Urssaf de la micro-entreprise pour un autre régime. */
    function deadlineHidden(e) { return !isMicro() && e.tag === "Urssaf"; }
    // Catégorie d'une échéance pour la frise et la liste : forme et couleur (documentation/55, § 5.5).
    var DEADLINE_CLASSES = { Urssaf: ["is-dl-urssaf", L("dl.tag.urssaf")], TVA: ["is-dl-vat", L("dl.tag.vat")], CFE: ["is-dl-tax", L("dl.tag.tax")], "Impôt": ["is-dl-tax", L("dl.tag.tax")] };
    /** Écran des échéances : cotisations et TVA estimées, montant estimé total, introduction, lien vers le calendrier. */
    function deadlineSummary(dl) {
      var p = profile();
      var vatNote = p.vatRegime === "franchise" ? L("dl.vatFranchise") :
        p.vatRegime === "simplified" && (p.vatLastYear === undefined || p.vatLastYear === null || p.vatLastYear === "") ? L("dl.vatLastYear") : "";
      return {
        kpis: kpi(L("dl.contributions"), isMicro() ? money(dl.urssaf) : "–", isMicro() ? L("dl.contributionsSub") : L("dl.contributionsMicroOnly")) +
          kpi(L("dl.vatEstimated"), vatNote ? "–" : money(dl.vat), vatNote || L("dl.vatSub")),
        priced: dl.urssaf + dl.vat,
        intro: L("dl.allIntro", { periodicity: p.periodicity === "monthly" ? L("dl.monthly") : L("dl.quarterly"),
          vat: ({ franchise: L("dl.vat.franchise"), simplified: L("dl.vat.simplified"), normal: L("dl.vat.normal") }[p.vatRegime] || L("dl.vat.unknown")) }),
        link: L("dl.calendarLinkHtml")
      };
    }

    return {
      routes: {
        immobilisations: function (r) { (r.id ? viewAssetForm : viewAssets)(r); },
        recettes: viewLedger,
        depenses: function (r) { (r.id ? viewExpenseForm : viewExpenses)(r); }
      },
      dashboard: dashboard,
      profile: { defaults: profileDefaults, fields: profileFields, bind: bindProfile, read: readProfile },
      client: { defaults: clientDefaults, fields: clientFields, bind: bindClient, read: readClient },
      doc: { draft: draftFields, retax: retax, fields: docFields, note: docNote, input: docInput, kindCell: kindCell, issueOptions: issueOptions },
      issued: { cards: issuedCards, bind: bindIssued },
      prospects: { retentionYears: function () { return R.prospects_conservation.annees; }, retentionNote: retentionNote,
                   optoutNote: optoutNote, rules: prospectRules },
      deadlines: { values: deadlineValues, hidden: deadlineHidden, classes: DEADLINE_CLASSES, summary: deadlineSummary }
    };
  };
})(typeof self !== "undefined" ? self : this);
