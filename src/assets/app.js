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
     * Jauge de seuil : texte #id (« 85 % de 83 600 € », « 85% of £90,000 ») et barre #id-bar (orange au-delà de 85 %,
     * rouge au-delà du seuil). Sans valeur, « – » et barre vide. Renvoie la part du seuil atteinte (ou NaN).
     */
    gauge: function (id, value, limit) {
      var ratio = isFinite(value) && limit > 0 ? value / limit : NaN;
      var bar = document.getElementById(id + "-bar");
      bar.style.width = (isFinite(ratio) ? Math.min(100, Math.max(0, ratio * 100)) : 0) + "%";
      bar.className = ratio > 1 ? "over" : ratio > OF.gaugeNear ? "near" : "";
      // Jamais « 100 % » juste sous ou juste au-dessus du seuil : l'arrondi ne doit pas cacher de quel côté on est.
      var shown = Math.round(ratio * 100);
      if (ratio < 1) shown = Math.min(shown, 99); else if (ratio > 1) shown = Math.max(shown, 101);
      document.getElementById(id).textContent = isFinite(ratio)
        ? OF.fmt(shown) + (FRENCH ? " % de " : "% of ") + OF.money(limit, 0) : "–";
      return ratio;
    },
    /** Part du seuil à partir de laquelle une jauge passe à l'orange (« vous approchez du seuil »). */
    gaugeNear: 0.85,

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
      // Une valeur enregistrée qui ne correspond plus à aucun choix (option retirée) est ignorée : le choix par défaut
      // reste affiché, au lieu d'une liste vide et d'un calcul fait sur une autre valeur.
      var known = function (name, value) {
        return fields().some(function (r) { return r.type === "radio" && r.name === name && r.value === value; });
      };
      fields().forEach(function (el) {
        var name = el.name || el.id, value = saved[name];
        if (value === undefined) return;
        if (el.type === "checkbox") el.checked = !!value;
        else if (el.type === "radio") { if (known(el.name, value)) el.checked = el.value === value; }
        else if (el.tagName === "SELECT") {
          if (Array.prototype.some.call(el.options, function (o) { return o.value === value; })) el.value = value;
        }
        else el.value = value;
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

    /** Part arrondie au point de pourcentage supérieur (0,1725 → 0,18), sans bruit de virgule flottante : une part de
     *  0,11000000000000001 reste 0,11. */
    ceilShare: function (x) { return Math.ceil(Math.round(x * 1e6) / 1e4) / 100; },

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
    if (event.key !== "Escape" || (searchDialog && searchDialog.open)) return;   // la recherche se ferme seule (dialog)
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

  // Recherche des outils (documentation/32-design.md, § 4) : les outils sont ceux du panneau « Outils » de la page
  // (titre, accroche, description, étape) ; recherche sans accents ni majuscules, chaque mot doit se retrouver ; rien
  // n'est envoyé à un serveur. Ouverture : bouton [data-search], touche « / », Ctrl ou ⌘ + K.
  var searchDialog = document.getElementById("search-dialog");
  if (searchDialog && typeof searchDialog.showModal === "function") {
    var sInput = document.getElementById("search-input"), sList = document.getElementById("search-list");
    var sStatus = searchDialog.querySelector(".search-status"), sTexts = JSON.parse(searchDialog.getAttribute("data-texts"));
    var sEmpty = document.createElement("p");
    sEmpty.className = "search-empty";
    sEmpty.hidden = true;
    sList.parentNode.insertBefore(sEmpty, sList.nextSibling);
    var fold = function (text) { return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); };
    var escHtml = function (text) { return String(text).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var tools = Array.prototype.map.call(document.querySelectorAll(".nav-mega .nav-item"), function (a, i) {
      var col = a.closest(".mega-col"), stage = col ? col.querySelector(".mega-title span").textContent : "";
      var title = a.querySelector("b").textContent, blurb = a.getAttribute("data-blurb") || "";
      return { href: a.getAttribute("href"), title: title, blurb: blurb, stage: stage, popular: a.hasAttribute("data-popular"),
               icon: a.querySelector(".ico").innerHTML, order: i,
               t: fold(title), b: fold(blurb), d: fold(a.getAttribute("data-desc")), s: fold(stage) };
    });
    var found = [], current = -1, opener = null;
    // Pertinence : début d'un mot du titre, puis titre, accroche, étape, description ; 0 si un mot manque.
    var score = function (tool, words) {
      var total = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        var points = tool.t.indexOf(w) === 0 || tool.t.indexOf(" " + w) > -1 ? 6 : tool.t.indexOf(w) > -1 ? 4 :
          tool.b.indexOf(w) > -1 ? 3 : tool.s.indexOf(w) > -1 ? 2 : tool.d.indexOf(w) > -1 ? 1 : 0;
        if (!points) return 0;
        total += points;
      }
      return total;
    };
    var select = function (i) {
      current = i;
      Array.prototype.forEach.call(sList.children, function (li, n) { li.setAttribute("aria-selected", String(n === i)); });
      if (i > -1) { sInput.setAttribute("aria-activedescendant", "search-r" + i); sList.children[i].scrollIntoView({ block: "nearest" }); }
      else sInput.removeAttribute("aria-activedescendant");
    };
    var searchRender = function () {
      var words = fold(sInput.value).split(/[\s,;'’()-]+/).filter(Boolean);
      found = words.length ? tools.map(function (t) { return { tool: t, score: score(t, words) }; })
        .filter(function (x) { return x.score > 0; })
        .sort(function (a, b) { return b.score - a.score || a.tool.order - b.tool.order; })
        .slice(0, 8).map(function (x) { return x.tool; }) : tools.filter(function (t) { return t.popular; });
      sList.innerHTML = found.map(function (t, i) {
        return '<li role="option" id="search-r' + i + '" aria-selected="false"><span class="ico">' + t.icon + "</span><span><b>" +
          escHtml(t.title) + '</b><small><span class="r-stage">' + escHtml(t.stage) + "</span> · " + escHtml(t.blurb) + "</small></span></li>";
      }).join("");
      sList.hidden = !found.length;
      sEmpty.hidden = found.length > 0;
      sEmpty.textContent = sTexts.search_empty;
      sInput.setAttribute("aria-expanded", String(found.length > 0));
      select(found.length ? 0 : -1);
      sStatus.textContent = !words.length ? "" : found.length === 1 ? sTexts.search_result :
        found.length ? sTexts.search_results.replace("{n}", found.length) : sTexts.search_empty;
    };
    var go = function (i) { if (found[i]) window.location.href = found[i].href; };
    var openSearch = function (from) {
      if (searchDialog.open) return;
      opener = from || document.activeElement;
      closeMenus();
      sInput.value = "";
      searchRender();
      searchDialog.showModal();
      sInput.focus();
    };
    sInput.addEventListener("input", searchRender);
    sInput.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (found.length) select((current + (event.key === "ArrowDown" ? 1 : -1) + found.length) % found.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        go(current);
      } else if (event.key === "Escape") {
        // Dans un champ de recherche, Échap viderait d'abord le texte : ici, il ferme la fenêtre.
        event.preventDefault();
        searchDialog.close();
      }
    });
    sList.addEventListener("click", function (event) {
      var li = event.target.closest("li[role=option]");
      if (li) go(Array.prototype.indexOf.call(sList.children, li));
    });
    searchDialog.querySelector(".search-close").addEventListener("click", function () { searchDialog.close(); });
    // Clic sur le fond assombri (en dehors de la fenêtre) : fermeture.
    searchDialog.addEventListener("click", function (event) {
      if (event.target !== searchDialog) return;
      var r = searchDialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) searchDialog.close();
    });
    searchDialog.addEventListener("close", function () { if (opener && opener.focus) opener.focus(); });
    document.addEventListener("click", function (event) {
      var trigger = event.target.closest("[data-search]");
      if (trigger) openSearch(trigger);
    });
    document.addEventListener("keydown", function (event) {
      var target = event.target, typing = target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) ||
          ((event.ctrlKey || event.metaKey) && fold(event.key) === "k")) {
        event.preventDefault();
        openSearch(target);
      }
    });
  }

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
