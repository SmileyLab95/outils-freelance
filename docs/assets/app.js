/* Outils Freelance : fonctions communes à toutes les pages. */
(function () {
  "use strict";

  var euro2 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  var euro0 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

  var OF = {
    /** Montant en euros : OF.eur(1234.5) → « 1 234,50 € » ; OF.eur(1234.5, 0) → « 1 235 € ». */
    eur: function (n, decimals) {
      if (!isFinite(n)) return "–";
      return (decimals === 0 ? euro0 : euro2).format(n);
    },
    fmt: function (n) { return isFinite(n) ? number.format(n) : "–"; },

    /** Lit un nombre saisi en français (« 1 234,5 », « 26 % »). Renvoie NaN si vide ou invalide. */
    num: function (value) {
      if (typeof value !== "string") value = value && value.value !== undefined ? value.value : String(value);
      var clean = value.replace(/[\s €%]/g, "").replace(",", ".");
      return clean === "" ? NaN : Number(clean);
    },

    /** Date du jour au format AAAA-MM-JJ (heure locale). */
    today: function () {
      var d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    },
    /** « 2026-10-18 » → objet Date à minuit (heure locale), ou null. */
    parseDate: function (iso) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
      return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
    },
    /** « 2026-10-18 » → « 18/10/2026 ». */
    frDate: function (iso) {
      var d = OF.parseDate(iso);
      return d ? d.toLocaleDateString("fr-FR") : "";
    },
    addDays: function (iso, days) {
      var d = OF.parseDate(iso);
      if (!d) return "";
      d.setDate(d.getDate() + days);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    },
    /** Nombre de jours de b moins a (dates ISO). */
    daysBetween: function (a, b) {
      var da = OF.parseDate(a), db = OF.parseDate(b);
      if (!da || !db) return NaN;
      return Math.round((db - da) / 86400000);
    },

    /** Stockage local tolérant (navigation privée, stockage bloqué). */
    load: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem("of:" + key);
        var value = raw ? JSON.parse(raw) : null;
        return value == null ? fallback : value;
      } catch (e) { return fallback; }
    },
    save: function (key, value) {
      try { window.localStorage.setItem("of:" + key, JSON.stringify(value)); } catch (e) { /* stockage indisponible */ }
    },

    /** Mémorise les champs [data-save] d'un formulaire et les restaure au chargement. */
    persistForm: function (form, key) {
      var saved = OF.load(key, {});
      form.querySelectorAll("[data-save]").forEach(function (el) {
        var name = el.name || el.id;
        if (saved[name] === undefined) return;
        if (el.type === "checkbox") el.checked = !!saved[name];
        else if (el.type === "radio") el.checked = el.value === saved[name];
        else el.value = saved[name];
      });
      form.addEventListener("input", function () {
        var data = {};
        form.querySelectorAll("[data-save]").forEach(function (el) {
          if (el.type === "radio") { if (el.checked) data[el.name] = el.value; return; }
          data[el.name || el.id] = el.type === "checkbox" ? el.checked : el.value;
        });
        OF.save(key, data);
      });
    },

    /** Copie un texte et confirme visuellement sur le bouton. */
    copy: function (text, button) {
      function done() {
        if (!button) return;
        // Garde le libellé d'origine, même en cas de double clic pendant la confirmation.
        if (!button.dataset.label) button.dataset.label = button.textContent;
        button.textContent = "Copié ✓";
        button.classList.add("copied");
        clearTimeout(button._copyTimer);
        button._copyTimer = setTimeout(function () { button.textContent = button.dataset.label; button.classList.remove("copied"); }, 1600);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(); });
      } else { fallback(); }
      function fallback() {
        var area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        try { document.execCommand("copy"); done(); } catch (e) { /* copie impossible */ }
        document.body.removeChild(area);
      }
    },

    /** Échappe le texte puis surligne les champs « [à remplir] » restants. */
    highlight: function (text) {
      var safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return safe.replace(/\[[^\]\n]+\]/g, function (m) { return '<span class="ph">' + m + "</span>"; });
    }
  };

  // Boutons « Copier » génériques : data-copy="#id-de-l-element"
  document.addEventListener("click", function (event) {
    var button = event.target.closest("[data-copy]");
    if (!button) return;
    var target = document.querySelector(button.getAttribute("data-copy"));
    if (target) OF.copy(target.innerText.trim(), button);
  });

  window.OF = OF;
})();
