/* Calcul des pénalités de retard (art. L441-10) et de l'indemnité forfaitaire (art. D441-5) : taux officiels de chaque
   semestre lus dans les règles, retard découpé par semestre (moteur OFE.retardFR). Spécification :
   documentation/41-penalites-de-retard.md. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("pen-form");
  if (!form || !OFE || !OFE.retardFR || !R) return;
  var E = OFE.retardFR;
  var $ = function (id) { return document.getElementById(id); };
  var set = function (id, text) { if ($(id).textContent !== text) $(id).textContent = text; };
  var long = function (iso) { return OF.date(iso, { day: "numeric", month: "long", year: "numeric" }); };
  // Taux : « 8,25 % », « 12,40 % », « 10 % », jusqu'à trois décimales pour un taux saisi (« 12,345 % »).
  var pct2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  var pct = function (rate) {
    var n = Math.round(rate * 1e7) / 1e5;
    return (n === Math.round(n) ? OF.fmt(n) : pct2.format(n)) + " %";
  };
  var LABEL = { legal: "3 × taux légal", bce: "taux BCE + 10 points", cgv: "taux de vos conditions" };
  // Champ du taux de chaque choix ; pour « legal » et « bce », un taux saisi remplace le taux officiel.
  var FIELD = { legal: "p-legal", bce: "p-bce", cgv: "p-rate" };
  var PUBLISHER = { legal: "publié sur service-public.gouv.fr", bce: "publié par la Banque centrale européenne" };
  var TABLE = { legal: R.taux_interet_legal, bce: R.taux_bce_refinancement };
  var upper = function (text) { return text.charAt(0).toUpperCase() + text.slice(1); };

  /** Semestres sans taux officiel : avant le début des tables, ou pas encore publiés (fin décembre, fin juin). */
  function absent(method, list) {
    var start = Object.keys(TABLE[method]).sort()[0];
    var past = list.filter(function (s) { return s < start; }), next = list.filter(function (s) { return s >= start; });
    var parts = [];
    if (past.length) parts.push("nos taux officiels commencent au " + E.semesterLabel(start));
    if (next.length) parts.push("taux du " + next.map(E.semesterLabel).join(", du ") + " pas encore dans nos règles");
    return parts.join(" ; ");
  }

  /** Taux saisi en fraction : null si vide, NaN si illisible. */
  function typed(id) {
    var text = $(id).value.trim();
    return text === "" ? null : OF.num(text) / 100;
  }

  /** Semestres concernés : ceux du retard, sinon celui du lendemain de l'échéance (ou d'aujourd'hui). */
  function semesters(r, due) {
    if (r.periods.length) return r.periods.map(function (p) { return p.from; });
    return [due ? OF.addDays(due, 1) : OF.today()];
  }

  /** Aide sous le champ du taux : taux officiels des semestres concernés, ou taux manquant à saisir. */
  function hint(method, r, due, given) {
    var all = semesters(r, due).map(function (d) { return E.rates(R, d); });
    if (method === "cgv") {
      var low = all.filter(function (x) { return x.minPenalty !== null; })
        .map(function (x) { return pct(x.minPenalty) + " au " + E.semesterLabel(x.semester); });
      return low.length && low.length <= 3 ? "Au moins " + low.join(", ") + " (trois fois le taux d'intérêt légal)."
        : "Au moins trois fois le taux d'intérêt légal" + (low.length ? " de chaque semestre." : ".");
    }
    var known = [], unknown = [];
    all.forEach(function (x) {
      var rate = method === "legal" ? x.legal : x.bce;
      if (rate === null) unknown.push(x.semester);
      else known.push(pct(rate) + " au " + E.semesterLabel(x.semester));
    });
    var plural = known.length > 1;
    var official = !known.length ? "" : known.length > 3 ? "taux officiels de chaque semestre, détaillés dans le calcul"
      : "taux officiel" + (plural ? "s" : "") + " : " + known.join(", ");
    if (given) return "Taux saisi, appliqué à tout le retard" + (official ? " (" + official + ")" : "") + ". Effacez-le pour revenir au taux officiel.";
    if (unknown.length) return upper(absent(method, unknown)) + " : saisissez le taux (" + PUBLISHER[method] + ")." +
      (official ? " Autre" + (plural ? "s " : " ") + official + "." : "");
    return "Laissez vide pour appliquer " + (plural ? "les " : "le ") + official + ".";
  }

  /** Taux appliqué : « 8,25 % par an », « 12,15 % puis 12,40 % », ou « selon le semestre » au-delà de trois taux. */
  function rateText(r) {
    if (r.uniform) return pct(r.rate) + " par an";
    var list = [];
    r.periods.forEach(function (p) { if (p.rate !== null && p.rate !== list[list.length - 1]) list.push(p.rate); });
    if (!list.length) return "à saisir";
    return list.length <= 3 ? list.map(pct).join(" puis ") : "selon le semestre (détail ci-dessous)";
  }

  /** Formule : une ligne, ou une ligne par semestre et le total. */
  function formula(r, amount, method) {
    var line = function (p) { return OF.eur(amount) + " × " + pct(p.rate) + " × " + OF.fmt(p.days) + " jour" + (p.days > 1 ? "s" : "") + " ÷ 365 = " + OF.eur(p.penalties); };
    if (!isFinite(r.penalties) || !r.days) return ["Pénalités = montant TTC × taux annuel × jours de retard ÷ 365"];
    if (r.uniform) return [line({ rate: r.rate, days: r.days, penalties: r.penalties }) + " (" + LABEL[method] + ")"];
    return r.periods.map(function (p) { return "Du " + long(p.from) + " au " + long(p.to) + " : " + line(p); })
      .concat(["Total des pénalités (" + LABEL[method] + ", taux de chaque semestre) : " + OF.eur(r.penalties)]);
  }

  function compute() {
    var method = $("p-method").value;
    form.querySelectorAll("[data-method]").forEach(function (el) { el.hidden = el.getAttribute("data-method") !== method; });
    var amount = OF.num($("p-amount").value);
    var due = $("p-due").value;
    var paid = $("p-paid").value || OF.today();
    var rate = typed(FIELD[method]);
    var r = E.compute({ amount: amount, due: due, paid: paid, method: method, rate: rate, fee: $("p-fee").checked }, R);

    Object.keys(FIELD).forEach(function (m) {
      var el = $(FIELD[m]);
      if (m === method && r.error === "rate_invalid") el.setAttribute("aria-invalid", "true");
      else el.removeAttribute("aria-invalid");
    });
    set(FIELD[method] + "-hint", hint(method, r, due, typeof rate === "number" && isFinite(rate)));

    set("p-r-amount", OF.eur(amount));
    set("p-r-days", isFinite(r.days) ? OF.fmt(r.days) + " jour" + (r.days > 1 ? "s" : "") : "–");
    set("p-r-rate", !(r.days > 0) ? "–" : r.error ? "à saisir" : rateText(r));
    set("p-r-pen", OF.eur(r.penalties));
    set("p-r-fee", OF.eur(r.fee));

    if (!due) {
      set("p-total", "–");
      set("p-sub", "Indiquez la date d'échéance de la facture.");
    } else if (r.days === 0) {
      set("p-total", OF.eur(0));
      set("p-sub", "Pas de retard à cette date : aucune pénalité n'est due.");
    } else if (!isFinite(amount) || amount < 0) {
      set("p-total", "–");
      set("p-sub", "Indiquez le montant TTC de la facture.");
    } else if (r.error) {
      set("p-total", OF.eur(r.fee));
      set("p-sub", r.error === "rate_invalid" ? "Le taux saisi est illisible : écrivez un nombre, par exemple 12,4."
        : r.error === "rate_missing" ? "Saisissez le taux prévu dans vos conditions pour calculer les pénalités."
        : upper(absent(method, r.missing)) + " : saisissez le taux pour calculer les pénalités.");
    } else {
      set("p-total", OF.eur(r.total));
      set("p-sub", "Pénalités " + OF.eur(r.penalties) + " + indemnité " + OF.eur(r.fee) + ", en plus de la facture (" + OF.eur(amount) + ").");
    }

    // Taux des conditions inférieur au minimum légal : signalé, le calcul garde le taux saisi.
    var warn = r.below.length && r.days > 0
      ? "Ce taux est inférieur au minimum légal (trois fois le taux d'intérêt légal)" + (r.below.length <= 3
        ? " : " + r.below.map(function (b) { return pct(b.min) + " au " + E.semesterLabel(b.semester); }).join(", ")
        : " sur " + r.below.length + " semestres du retard") +
        ". Une clause qui prévoit un taux plus bas n'est pas conforme ; le calcul garde votre taux."
      : "";
    $("p-warn").hidden = !warn;
    set("p-warn", warn);

    // Une ligne par semestre (bloc séparé), puis le total.
    var lines = formula(r, amount, method), out = $("p-formula");
    if (out.textContent !== lines.join("")) {
      out.textContent = "";
      lines.forEach(function (text) {
        var line = document.createElement("span");
        line.className = "formula-line";
        line.textContent = text;
        out.appendChild(line);
      });
    }
  }

  OF.persistForm(form, "penalites");
  if (!$("p-due").value) $("p-due").value = OF.addDays(OF.today(), -45);
  form.addEventListener("input", compute);
  form.addEventListener("change", compute);
  compute();
})();
