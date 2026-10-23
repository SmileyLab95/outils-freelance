/*
 * Recherche de noms de domaine (documentation/33-noms-de-domaine.md) : relie le formulaire au moteur OFE.domain.
 * Textes dans la page (#dn-data) ; serveurs RDAP et statuts dans les règles (window.OF_RULES). Les noms partent du
 * navigateur vers les registres, au clic seulement, sans cookie ni page d'origine ; rien n'est mémorisé.
 */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, RULES = window.OF_RULES || {};
  var form = document.getElementById("dn-form"), data = document.getElementById("dn-data");
  if (!form || !data || !OFE || !OFE.domain || !RULES.rdap_servers) return;
  var D = OFE.domain, L = JSON.parse(data.textContent), SERVERS = RULES.rdap_servers;
  var DROPPING = RULES.rdap_status_dropping || [], HTTPS_ONLY = RULES.domain_https_only || [];
  var TIMEOUT = 8000, PARALLEL = 4;
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var plural = new Intl.PluralRules(OF.locale);
  var count = function (forms, n) { return fill(forms[plural.select(n)] || forms.other, { n: n }); };
  var run = 0;   // numéro de la recherche affichée : les réponses d'une recherche précédente sont ignorées

  // Cases des extensions, à partir des listes de la page (data-default, cochées ; data-extra, proposées).
  var list = function (name) { return (form.getAttribute("data-" + name) || "").split(" ").filter(Boolean); };
  var MAIN = form.getAttribute("data-main");
  function chips(container, tlds, checked) {
    tlds.forEach(function (tld) {
      var label = document.createElement("label"), box = document.createElement("input"), text = document.createElement("span");
      label.className = "dn-chip";
      box.type = "checkbox"; box.name = "tld"; box.value = tld; box.checked = checked;
      text.textContent = "." + tld;
      label.appendChild(box); label.appendChild(text);
      container.appendChild(label);
    });
  }
  chips($("dn-default"), list("default"), true);
  chips($("dn-extra"), list("extra"), false);
  $("dn-more-count").textContent = list("extra").length;
  var boxes = function () { return Array.prototype.slice.call(form.querySelectorAll('input[name="tld"]')); };
  var chosen = function () { return boxes().filter(function (b) { return b.checked; }).map(function (b) { return b.value; }); };

  /** Interroge le registre : { state, reason, created, expires, registrar, dropping } (voir OFE.domain.interpret). */
  function lookup(name, tld) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT) : null;
    return fetch(D.rdapUrl(SERVERS, name, tld), {
      headers: { Accept: "application/rdap+json, application/json" }, credentials: "omit", referrerPolicy: "no-referrer",
      cache: "no-store", signal: ctrl ? ctrl.signal : undefined,
    }).then(function (res) {
      if (res.status !== 200) return D.interpret(res.status, null, DROPPING);
      return res.json().then(function (body) { return D.interpret(200, body, DROPPING); },
                             function () { return D.interpret(200, null, DROPPING); });
    }, function () { return D.interpret(0, null, DROPPING); })
      .then(function (r) { clearTimeout(timer); return r; });
  }

  /** Date d'un évènement dans le fuseau du visiteur : « 2 juin 1995 », « June 2, 1995 ». */
  function day(stamp) {
    var d = new Date(stamp);
    var iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    return OF.date(iso, { day: "numeric", month: "long", year: "numeric" });
  }

  var ICONS = { pending: "hourglass", free: "circle-check", taken: "circle-x", dropping: "hourglass", unknown: "circle-question-mark" };
  function icon(name) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    svg.setAttribute("class", "i"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
    use.setAttribute("href", "#i-" + name);
    svg.appendChild(use);
    return svg;
  }

  function row(name, tld) {
    var li = document.createElement("li"), head = document.createElement("div"), domain = document.createElement("b"),
        state = document.createElement("span"), detail = document.createElement("p");
    li.className = "dn-row";
    head.className = "dn-head";
    domain.className = "dn-name"; domain.textContent = name + "." + tld;
    state.className = "dn-state";
    detail.className = "dn-detail";
    head.appendChild(document.createElement("span")); head.appendChild(domain); head.appendChild(state);
    li.appendChild(head); li.appendChild(detail);
    show(li, "pending", L.state.pending, "");
    return li;
  }

  function show(li, kind, label, detail, note) {
    li.setAttribute("data-state", kind);
    var mark = li.querySelector(".dn-head > span:first-child");
    mark.className = "dn-mark";
    mark.replaceChildren(icon(ICONS[kind]));
    li.querySelector(".dn-state").textContent = label;
    li.querySelector(".dn-detail").textContent = detail;
    var old = li.querySelector(".dn-note");
    if (old) old.remove();
    if (note) {
      var p = document.createElement("p");
      p.className = "dn-note"; p.textContent = note;
      li.appendChild(p);
    }
  }

  // noted : conditions déjà affichées dans cette recherche (chacune une seule fois, .uk et .co.uk ont la même).
  function result(li, tld, r, noted) {
    if (r.state === "free") {
      var notes = [L.notes[tld], HTTPS_ONLY.indexOf(tld) >= 0 ? L.https_only : ""].filter(function (note) { return note && !noted[note]; });
      notes.forEach(function (note) { noted[note] = true; });
      return show(li, "free", L.state.free, L.free_detail, notes.join(" "));
    }
    if (r.state === "taken") {
      var parts = [];
      if (r.created) parts.push(fill(L.since, { date: day(r.created) }));
      if (r.expires) parts.push(fill(L.expires, { date: day(r.expires) }));
      if (r.registrar) parts.push(fill(L.registrar, { name: r.registrar }));
      return r.dropping ? show(li, "dropping", L.state.dropping, [L.dropping_detail].concat(parts).join(" · "))
                        : show(li, "taken", L.state.taken, parts.join(" · "));
    }
    show(li, "unknown", L.state.unknown, L.unknown[r.reason] || L.unknown.error);
  }

  function error(message) {
    var input = $("dn-name"), box = $("dn-name-error");
    input.setAttribute("aria-invalid", String(!!message));
    box.textContent = message || "";
    box.hidden = !message;
    if (message) input.focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var n = D.normalize($("dn-name").value, Object.keys(SERVERS));
    if (n.error) { error(L.errors[n.error]); return; }
    error("");
    var tlds = chosen();
    // Extension tapée : cochée et vérifiée en premier ; si elle est dans « Plus d'extensions », le volet s'ouvre pour
    // que la case cochée reste visible.
    if (n.tld && tlds.indexOf(n.tld) < 0) {
      boxes().forEach(function (b) {
        if (b.value !== n.tld) return;
        b.checked = true;
        var more = b.closest("details");
        if (more) more.open = true;
      });
      tlds.unshift(n.tld);
    }
    if (!tlds.length) { $("dn-tld-error").hidden = false; $("dn-default").querySelector("input").focus(); return; }
    $("dn-tld-error").hidden = true;

    var messages = [];
    if (n.changed) messages.push(fill(L.changed, { label: n.label }));
    if (n.unknownTld) messages.push(fill(L.unknown_tld, { tld: n.unknownTld }));
    $("dn-message").textContent = messages.join(" ");
    $("dn-message").hidden = !messages.length;

    // Noms vérifiés : le nom sur chaque extension choisie, puis les variantes sur l'extension principale de la section
    // et le .com, s'ils sont cochés (sinon sur la première extension cochée).
    var jobs = [], ideas = D.variants(n.label, { activity: $("dn-activity").value, city: $("dn-city").value });
    var main = $("dn-list"), alt = $("dn-variants");
    main.replaceChildren(); alt.replaceChildren();
    tlds.forEach(function (tld) { var li = row(n.label, tld); main.appendChild(li); jobs.push([n.label, tld, li]); });
    var altTlds = [MAIN, "com"].filter(function (tld, i, all) { return all.indexOf(tld) === i && tlds.indexOf(tld) >= 0; });
    if (!altTlds.length) altTlds = [tlds[0]];
    ideas.forEach(function (name) {
      altTlds.forEach(function (tld) { var li = row(name, tld); alt.appendChild(li); jobs.push([name, tld, li]); });
    });
    alt.hidden = $("dn-variants-title").hidden = !ideas.length;
    $("dn-results").hidden = false;
    $("dn-summary").textContent = L.searching;

    var mine = ++run, tally = { free: 0, taken: 0, unknown: 0 }, noted = {};
    D.pool(jobs, PARALLEL, function (job) {
      if (mine !== run) return null;   // recherche remplacée : les noms restants ne sont pas envoyés
      return lookup(job[0], job[1]).then(function (r) {
        if (mine !== run) return;
        result(job[2], job[1], r, noted);
        tally[r.state === "taken" ? "taken" : r.state === "free" ? "free" : "unknown"]++;
      });
    }).then(function () {
      if (mine !== run) return;
      $("dn-summary").textContent = fill(L.summary, { free: count(L.count.free, tally.free), taken: count(L.count.taken, tally.taken),
                                                      unknown: count(L.count.unknown, tally.unknown) });
    });
  });
})();
