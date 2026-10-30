/*
 * Conversion de devises aux taux de référence officiels (quatre pays, deux langues) : taux de la BCE (France), taux
 * mensuel du HMRC (Royaume-Uni), taux de la Banque du Canada, ou taux saisi ; TVA dans la monnaie du pays et mention à
 * reporter sur la facture. Moteur OFE.currency ; adresses des sources et devises : règle fx_reference_sources ; taux
 * de TVA : règles du pays ; textes dans la page (<script type="application/json" id="currency-data">).
 * Le taux officiel n'est demandé qu'au clic, sans cookie ni adresse de la page. Spécification : documentation/49-devises.md.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("cx-form");
  var dataEl = document.getElementById("currency-data");
  if (!form || !dataEl || !OFE || !OFE.currency || !R || !R.fx_reference_sources) return;
  var C = OFE.currency, S = R.fx_reference_sources, L = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { $(id).textContent = text; };
  var fill = C.fill;
  var FRENCH = OF.locale.slice(0, 2) === "fr";
  var TIMEOUT = 10000;
  // Valeur d'une règle, éventuellement dans un objet (« tva_taux_metropole.normal »).
  var rule = function (path) { return path.split(".").reduce(function (v, k) { return v == null ? v : v[k]; }, R); };

  // Taux récupéré : { key (source, devise, date ou mois), value, per, text, date, start, end }, ou null.
  var fetched = null, pending = null;

  // Libellés des taux de TVA, lus dans les règles (« Taux normal (20 %) »).
  Array.prototype.forEach.call($("cx-vat") ? $("cx-vat").options : [], function (o) {
    if (o.dataset.label) o.textContent = fill(o.dataset.label, { rate: OF.rate(rule(o.value) * 100) });
  });

  var foreignFormats = {};
  function foreignMoney(n, cur) {
    if (!foreignFormats[cur]) foreignFormats[cur] = new Intl.NumberFormat(OF.locale, { style: "currency", currency: cur });
    return foreignFormats[cur].format(n);
  }
  // Taux tel que publié (« 1.1130 » → « 1,1130 » en français) ; taux saisi : jusqu'à 6 décimales.
  function rateText(text) { return FRENCH ? text.replace(".", ",") : text; }
  var manualFormat = new Intl.NumberFormat(OF.locale, { maximumFractionDigits: 6 });
  function longDate(iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); }
  function monthName(iso) { return OF.date(iso, { month: "long", year: "numeric" }); }

  function state() {
    var method = $("cx-method").value;
    return {
      amount: OF.num($("cx-amount").value),
      currency: $("cx-currency").value,
      direction: $("cx-direction").value,
      moment: $("cx-moment") ? $("cx-moment").value : null,
      date: $("cx-date").value,
      method: method,
      vat: $("cx-vat") && $("cx-vat").value ? rule($("cx-vat").value) * 100 : null
    };
  }

  // Clé du taux officiel pour la saisie : un taux récupéré pour une autre devise ou une autre date ne sert plus.
  function keyOf(s) {
    if (!C.validDate(s.date)) return null;
    return [L.source, s.currency, L.source === "hmrc" ? s.date.slice(0, 7) : s.date].join("|");
  }

  function notice(text, warn) {
    var n = $("cx-notice");
    n.textContent = text;
    n.className = "notice" + (warn ? " warn" : "");
  }

  function blank(sub) {
    set("cx-big", "–");
    set("cx-sub", sub);
    $("cx-table").hidden = true;
    $("cx-mention-box").hidden = true;
  }

  function labels(s) {
    var toHome = s.direction !== "to_foreign";
    set("cx-amount-label", toHome ? L.label_amount_to_home : L.label_amount_to_foreign);
    set("cx-big-label", toHome ? L.big_to_home : L.big_to_foreign);
    if ($("cx-date-label")) set("cx-date-label", L.label_date[s.moment || "default"]);
    var manual = s.method === "manual";
    $("cx-rate-field").hidden = !manual;
    $("cx-fetch-field").hidden = manual;
    set("cx-rate-label", fill(L.label_rate[L.manual_per], { cur: s.currency }));
  }

  // Taux à utiliser : saisi, ou récupéré pour cette devise et cette date. Renvoie { rate, named } ou { message }.
  function currentRate(s) {
    if (s.method === "manual") {
      var raw = $("cx-rate").value.trim(), value = C.parseRate(raw);
      $("cx-rate").setAttribute("aria-invalid", String(raw !== "" && value === null));
      if (raw === "") return { message: fill(L.msg.enter_rate, { cur: s.currency }) };
      if (value === null) return { message: L.msg.bad_rate, warn: true };
      return { rate: { value: value, per: L.manual_per, text: manualFormat.format(value), localized: true },
               named: fill(L.named_manual, { date: longDate(s.date) }) };
    }
    if (!fetched || fetched.key !== keyOf(s)) return { message: fill(L.msg.click, { source: L.source_name }) };
    return { rate: fetched, named: fill(L.named_official, { date: longDate(fetched.date || s.date), month: monthName(fetched.start || s.date) }) };
  }

  function compute() {
    var s = state();
    labels(s);
    var bad = $("cx-amount").value.trim() !== "" && !(s.amount > 0);
    $("cx-amount").setAttribute("aria-invalid", String(bad));
    $("cx-date").setAttribute("aria-invalid", String(!C.validDate(s.date)));
    if (!C.validDate(s.date)) { blank("–"); notice(L.msg.bad_date, true); return; }
    if (bad || !(s.amount > 0)) { blank("–"); notice(bad ? L.msg.bad_amount : L.msg.enter_amount, bad); return; }
    if (pending) return;
    var cr = currentRate(s);
    if (!cr.rate) { blank("–"); notice(cr.message, cr.warn); return; }
    var r = C.convert({ amount: s.amount, direction: s.direction, rate: cr.rate, vat: s.vat });
    if (r.error) { blank("–"); notice(L.msg.bad_rate, true); return; }
    show(s, cr, r);
  }

  function show(s, cr, r) {
    var cur = s.currency, toHome = s.direction !== "to_foreign";
    var line = fill(L.rate_line[cr.rate.per], { rate: cr.rate.localized ? cr.rate.text : rateText(cr.rate.text), cur: cur });
    var vars = {
      rate_line: line, named: cr.named, cur: cur,
      home: OF.money(r.home), home_vat: OF.money(r.homeVat), home_total: OF.money(r.homeTotal),
      foreign: foreignMoney(r.foreign, cur), foreign_vat: foreignMoney(r.foreignVat, cur), foreign_total: foreignMoney(r.foreignTotal, cur),
      vat: s.vat == null ? "" : OF.rate(s.vat), date: longDate(s.date)
    };
    set("cx-big", toHome ? vars.home : vars.foreign);
    set("cx-sub", fill(L.sub, vars));
    // Tableau : hors taxe, TVA et total dans les deux monnaies (une seule ligne sans TVA).
    $("cx-table").hidden = false;
    set("cx-col-foreign", cur);
    set("cx-row-net-label", s.vat == null ? L.rows.amount : L.rows.net);
    set("cx-net-foreign", vars.foreign);
    set("cx-net-home", vars.home);
    $("cx-row-vat").hidden = $("cx-row-total").hidden = s.vat == null;
    if (s.vat != null) {
      set("cx-row-vat-label", fill(L.rows.vat, vars));
      set("cx-vat-foreign", vars.foreign_vat);
      set("cx-vat-home", vars.home_vat);
      set("cx-total-foreign", vars.foreign_total);
      set("cx-total-home", vars.home_total);
    }
    // Mention à reporter (France : selon l'exigibilité ; ailleurs : avec ou sans TVA).
    var key = s.moment === "encaissement" && s.vat != null ? "cash" : s.vat != null ? "vat" : "novat";
    $("cx-mention-box").hidden = false;
    set("cx-mention", fill(L.mention[key], vars));
    var msgs = [];
    if (s.moment === "encaissement" && s.vat != null) msgs.push(fill(L.msg.cash_due, vars));
    if (s.vat == null && L.msg.no_vat) msgs.push(L.msg.no_vat);
    if (s.method !== "manual" && cr.rate.date && cr.rate.date !== s.date) msgs.push(fill(L.msg.earlier, { date: longDate(cr.rate.date) }));
    msgs.push(L.msg.always);
    notice(msgs.join(" "), false);
  }

  // ---- Lecture du taux officiel ----

  function get(url, json) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT) : null;
    return fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error("http " + res.status);
        return json ? res.json() : res.text();
      }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }

  function lookup(s) {
    var start = C.addDays(s.date, -S.window_days);
    if (L.source === "ecb" || L.source === "boc") {
      if (s.date > OF.today()) return Promise.resolve({ error: "future" });
      var ecb = L.source === "ecb";
      return get(ecb ? C.ecbUrl(S, s.currency, s.date) : C.bocUrl(S, s.currency, s.date), !ecb).then(function (body) {
        if (body === null) return { error: "none", start: start };
        var obs = ecb ? C.parseEcb(body, s.currency) : C.parseBoc(body, s.currency);
        if (obs === null) return { error: "format" };
        var o = C.latest(obs, s.date);
        return o ? { value: o.value, text: o.text, date: o.date, per: L.official_per } : { error: "none", start: start };
      });
    }
    return get(C.hmrcUrl(S, s.date), false).then(function (body) {
      if (body === null) return { error: "unpublished" };
      var h = C.parseHmrc(body, s.currency);
      if (!h) return { error: "format" };
      if (!(h.start <= s.date && s.date <= h.end)) return { error: "format" };
      return { value: h.value, text: h.text, start: h.start, end: h.end, per: L.official_per };
    });
  }

  $("cx-fetch").addEventListener("click", function () {
    var s = state();
    if (!C.validDate(s.date)) { compute(); return; }
    var key = keyOf(s), button = $("cx-fetch");
    pending = key;
    button.disabled = true;
    blank("–");
    notice(fill(L.msg.fetching, { source: L.source_name }), false);
    lookup(s).then(function (res) {
      if (pending !== key) return;
      if (res.error) {
        fetched = null;
        pending = null;
        blank("–");
        notice(fill(L.msg[res.error], { source: L.source_name, cur: s.currency, date: longDate(s.date), start: res.start ? longDate(res.start) : "", month: monthName(s.date) }), true);
        return;
      }
      res.key = key;
      fetched = res;
      pending = null;
      compute();
    }, function () {
      if (pending !== key) return;
      fetched = null;
      pending = null;
      blank("–");
      notice(fill(L.msg.network, { source: L.source_name }), true);
    }).then(function () { button.disabled = false; });
  });

  $("cx-copy").addEventListener("click", function () { OF.copy($("cx-mention").textContent, $("cx-copy")); });

  if (!$("cx-date").value) $("cx-date").value = OF.today();
  OF.persistForm(form, "currency");
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
