/* Outils Freelance : fonctions communes à toutes les pages (formats, saisie, stockage, copie, menus). */
(function () {
  "use strict";

  // Langue et devise de la section, posées par le générateur sur <html lang> et <body data-currency>.
  var LOCALE = document.documentElement.lang || "fr-FR";
  var CURRENCY = (document.body && document.body.dataset.currency) || "EUR";
  var SECTION = (document.body && document.body.dataset.section) || "fr";
  var FRENCH = LOCALE.slice(0, 2) === "fr";
  // Les données de la section France gardent les clés d'origine ; les autres sections ont leur préfixe.
  var NS = SECTION === "fr" ? "" : SECTION + ":";

  var euro2 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  var euro0 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var money2 = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY });
  var money0 = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
  var number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
  var rateFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 3 });

  var OF = {
    locale: LOCALE,
    currency: CURRENCY,
    section: SECTION,

    /** Montant en euros : OF.eur(1234.5) → « 1 234,50 € » ; OF.eur(1234.5, 0) → « 1 235 € ». */
    eur: function (n, decimals) {
      if (!isFinite(n)) return "–";
      return (decimals === 0 ? euro0 : euro2).format(n);
    },
    /** Montant dans la devise de la section : « $1,234.50 », « £1,234.50 », « 1 234,50 $ ». */
    money: function (n, decimals) {
      if (!isFinite(n)) return "–";
      return (decimals === 0 ? money0 : money2).format(n);
    },
    fmt: function (n) { return isFinite(n) ? number.format(n) : "–"; },
    /** Taux en pourcentage, jusqu'à 3 décimales (9,975 pour la TVQ). */
    rate: function (n) { return isFinite(n) ? rateFormat.format(n) : "–"; },

    /**
     * Lit un nombre saisi (« 1 234,5 », « 1,234.50 », « $1,800 », « 26 % »). Renvoie NaN si vide ou invalide.
     * Avec les deux séparateurs, le dernier est la décimale. Avec un seul, un groupe de 3 chiffres après le
     * séparateur de milliers de la langue (virgule en anglais, point en français) est lu comme des milliers.
     */
    num: function (value) {
      if (typeof value !== "string") value = value && value.value !== undefined ? value.value : String(value);
      var clean = value.replace(/[\s€$£%]|CA|US/g, "");
      if (clean === "") return NaN;
      var comma = clean.lastIndexOf(","), dot = clean.lastIndexOf(".");
      if (comma > -1 && dot > -1) {
        clean = comma > dot ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/,/g, "");
      } else if (comma > -1) {
        clean = !FRENCH && /^-?\d{1,3}(,\d{3})+$/.test(clean) ? clean.replace(/,/g, "") : clean.replace(",", ".");
      } else if (dot > -1 && FRENCH && /^-?\d{1,3}(\.\d{3})+$/.test(clean)) {
        clean = clean.replace(/\./g, "");
      }
      return Number(clean);
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
    /** Date au format de la section : « 18/10/2026 », « 10/18/2026 », « 18 Oct 2026 »… */
    date: function (iso, options) {
      var d = OF.parseDate(iso);
      if (!d) return "";
      var text = d.toLocaleDateString(LOCALE, options);
      // En français, le premier du mois s'écrit « 1er » : « 1er septembre 2027 ».
      return FRENCH && options && options.month && options.month !== "numeric" && options.month !== "2-digit"
        ? text.replace(/(^|\s)1 (?=\D)/, "$11er ") : text;
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
        var raw = window.localStorage.getItem("of:" + NS + key);
        var value = raw ? JSON.parse(raw) : null;
        return value == null ? fallback : value;
      } catch (e) { return fallback; }
    },
    save: function (key, value) {
      try { window.localStorage.setItem("of:" + NS + key, JSON.stringify(value)); } catch (e) { /* stockage indisponible */ }
    },

    /** Mémorise les champs [data-save] d'un formulaire et les restaure au chargement. */
    persistForm: function (form, key) {
      var saved = OF.load(key, {});
      // form.elements inclut les champs placés hors du formulaire mais rattachés par l'attribut form="…".
      var fields = function () {
        return Array.prototype.filter.call(form.elements, function (el) { return el.hasAttribute("data-save"); });
      };
      fields().forEach(function (el) {
        var name = el.name || el.id;
        if (saved[name] === undefined) return;
        if (el.type === "checkbox") el.checked = !!saved[name];
        else if (el.type === "radio") el.checked = el.value === saved[name];
        else el.value = saved[name];
      });
      document.addEventListener("input", function (event) {
        if (event.target !== form && event.target.form !== form) return;
        var data = {};
        fields().forEach(function (el) {
          if (el.type === "radio") { if (el.checked) data[el.name] = el.value; return; }
          data[el.name || el.id] = el.type === "checkbox" ? el.checked : el.value;
        });
        OF.save(key, data);
      });
    },

    /** Copie un texte et confirme visuellement sur le bouton. */
    copy: function (text, button) {
      // Espaces fines insécables (typographie des pages) : remplacées par l'espace insécable, connue de toutes les
      // messageries, avant de coller le texte dans un email.
      text = String(text).replace(/\u202f/g, "\u00a0");
      function done() {
        if (!button) return;
        // Garde le libellé d'origine, même en cas de double clic pendant la confirmation.
        if (!button.dataset.label) button.dataset.label = button.textContent;
        button.textContent = FRENCH ? "Copié ✓" : "Copied ✓";
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

    /** Fait télécharger un fichier. Le lien temporaire est retiré aussitôt (il n'a pas de texte, il ne doit pas rester
     *  dans la page) ; l'adresse du fichier est libérée une minute plus tard (Safari peut d'abord demander confirmation). */
    download: function (content, name, type) {
      var link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([content], { type: type }));
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 60000);
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

  // Menus déroulants (catégories, choix du pays) et panneau de navigation mobile.
  var header = document.querySelector(".site-header");
  function closeMenus(except) {
    document.querySelectorAll(".nav-group.open").forEach(function (group) {
      if (group === except) return;
      group.classList.remove("open");
      group.querySelector(".nav-trigger").setAttribute("aria-expanded", "false");
    });
  }
  document.addEventListener("click", function (event) {
    var trigger = event.target.closest(".nav-trigger");
    if (trigger) {
      var group = trigger.parentElement;
      var open = !group.classList.contains("open");
      closeMenus(group);
      group.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", String(open));
      return;
    }
    var toggle = event.target.closest(".menu-toggle");
    if (toggle && header) {
      var expanded = header.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", String(expanded));
      document.documentElement.classList.toggle("no-scroll", expanded);
      return;
    }
    if (!event.target.closest(".nav-menu")) closeMenus();
  });
  // Clavier : le menu se ferme quand le focus le quitte ; Échap le ferme et rend le focus à son bouton, pour que le
  // focus ne reste pas sur un lien masqué.
  document.addEventListener("focusout", function (event) {
    var group = event.target.closest(".nav-group.open");
    if (group && !(event.relatedTarget && group.contains(event.relatedTarget))) closeMenus();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var open = document.activeElement && document.activeElement.closest(".nav-group.open");
    closeMenus();
    if (open) open.querySelector(".nav-trigger").focus();
    if (header && header.classList.contains("menu-open")) {
      header.classList.remove("menu-open");
      document.documentElement.classList.remove("no-scroll");
      var toggle = header.querySelector(".menu-toggle");
      if (toggle) { toggle.setAttribute("aria-expanded", "false"); toggle.focus(); }
    }
  });

  // Accueil mondial : met en avant le pays correspondant à la langue du navigateur.
  var langs = navigator.languages || [navigator.language || ""];
  var cards = document.querySelectorAll(".country-card[data-lang]");
  for (var i = 0; i < langs.length && cards.length; i++) {
    var wanted = String(langs[i]).toLowerCase();
    var match = Array.prototype.find.call(cards, function (c) { return c.dataset.lang.toLowerCase() === wanted; });
    if (match) { match.classList.add("suggested"); break; }
  }

  window.OF = OF;
})();
