/* Signature d'email professionnelle (4 pays) : saisie, mentions requises selon la situation, aperçu, copie avec la mise
   en forme, en texte brut ou en HTML, téléchargement. Moteur OFE.signature, exigences lues dans les règles
   (email_signature) ; textes de la page (<script type="application/json" id="signature-data">).
   Spécification : documentation/43-signature-email.md. */
(function () {
  "use strict";
  var OF = window.OF, OFE = window.OFE, R = window.OF_RULES;
  var form = document.getElementById("sg-form"), dataEl = document.getElementById("signature-data");
  if (!form || !dataEl || !OFE || !OFE.signature || !R || !R.email_signature) return;
  var S = OFE.signature, L = JSON.parse(dataEl.textContent);
  var $ = function (id) { return document.getElementById(id); };
  var value = function (name) { var el = form.elements[name]; return el ? el.value : ""; };
  var fill = function (text, vars) { return text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }); };
  var current = null;
  // Pages en français : typographie du site (espaces insécables) appliquée au texte copié, pas seulement à l'aperçu ;
  // la fine insécable devient l'insécable, connue de toutes les messageries. Adresses web et emails inchangés.
  var typo = OFE.typoFR && OFE.typoFR.text ? function (t) { return OFE.typoFR.text(t).replace(/\u202f/g, "\u00a0"); } : null;
  function polish(sig) {
    if (!typo) return sig;
    sig.name = typo(sig.name); sig.sub = typo(sig.sub); sig.optout = typo(sig.optout); sig.legal = sig.legal.map(typo);
    sig.contacts.forEach(function (c) { if (!c.href || c.href.indexOf("tel:") === 0) c.text = typo(c.text); });
    return sig;
  }

  function input() {
    var capital = OF.num(value("capital"));
    return {
      status: value("status"), name: value("name"), role: value("role"), business: value("business"),
      address: value("address"), phone: value("phone"), email: value("email"), website: value("website"),
      linkedin: value("linkedin"), siren: value("siren"), activity: value("activity"), city: value("city"),
      form: value("form"), capital: isFinite(capital) && capital > 0 ? OF.money(capital, capital % 1 ? 2 : 0) : "",
      company_number: value("company_number"), uk_part: value("uk_part")
    };
  }

  /** Champs propres à une situation (data-for="ei societe") ou à une activité (data-activity="commerciale"). */
  function toggle(data) {
    form.querySelectorAll("[data-for], [data-activity]").forEach(function (el) {
      var situations = el.getAttribute("data-for"), activity = el.getAttribute("data-activity");
      el.hidden = (situations !== null && situations.split(" ").indexOf(data.status) < 0) ||
        (activity !== null && activity !== data.activity);
    });
  }

  /** Confirmation sur le bouton, comme OF.copy (libellé d'origine rétabli après 1,6 s). */
  function confirm(button) {
    if (!button.dataset.label) button.dataset.label = button.textContent;
    button.textContent = L.copied_button;
    button.classList.add("copied");
    clearTimeout(button._copyTimer);
    button._copyTimer = setTimeout(function () { button.textContent = button.dataset.label; button.classList.remove("copied"); }, 1600);
  }

  function render() {
    var data = input();
    toggle(data);
    current = polish(S.compose(data, R, L));
    var htmlCode = S.html(current, value("accent"));
    var preview = $("sg-preview");
    if (htmlCode) preview.innerHTML = htmlCode;
    else { preview.textContent = L.empty; }
    var list = $("sg-checks");
    list.textContent = "";
    if (!current.items.length) {
      var none = document.createElement("li");
      none.className = "is-none";
      none.textContent = L.none[data.status] || "";
      list.appendChild(none);
    }
    current.items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = item.ok ? "is-ok" : "is-todo";
      li.textContent = (item.ok ? L.ok : L.todo) + " " + L.items[item.key];
      list.appendChild(li);
    });
    var missing = current.items.filter(function (i) { return !i.ok; }).map(function (i) { return L.items[i.key]; });
    $("sg-summary").textContent = !current.items.length ? "" : missing.length ? fill(L.missing[missing.length === 1 ? 0 : 1], { n: missing.length }) : L.complete;
    $("sg-summary").className = "notice " + (missing.length ? "warn" : "ok");
    $("sg-summary").hidden = !current.items.length;
    $("sg-explain").textContent = L.explain[data.status] || "";
  }

  function status(text) { $("sg-message").textContent = text; }

  /** Copie avec la mise en forme : presse-papiers HTML, sinon sélection de l'aperçu (copie du navigateur). */
  function copyRich(button) {
    var htmlCode = S.html(current, value("accent")), plain = S.text(current);
    if (!htmlCode) return;
    var done = function () { confirm(button); status(L.copied); };
    var fallback = function () {
      var range = document.createRange(), sel = window.getSelection();
      range.selectNodeContents($("sg-preview"));
      sel.removeAllRanges();
      sel.addRange(range);
      try { document.execCommand("copy"); done(); } catch (e) { status(L.copy_failed); }
      sel.removeAllRanges();
    };
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write && window.isSecureContext) {
      navigator.clipboard.write([new window.ClipboardItem({
        "text/html": new Blob([htmlCode], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" })
      })]).then(done, fallback);
    } else fallback();
  }

  $("sg-copy").addEventListener("click", function () { copyRich(this); });
  $("sg-copy-text").addEventListener("click", function () { OF.copy(S.text(current), this); status(L.copied_text); });
  $("sg-copy-html").addEventListener("click", function () { OF.copy(S.html(current, value("accent")), this); status(L.copied_html); });
  $("sg-download").addEventListener("click", function () {
    var code = S.html(current, value("accent"));
    if (!code) return;
    OF.download('<!doctype html>\n<html lang="' + L.lang + '"><head><meta charset="utf-8"><title>' + S.esc(L.file_title) +
      "</title></head><body>\n" + code + "\n</body></html>\n", L.file + ".html", "text/html;charset=utf-8");
    status(L.downloaded);
  });

  OF.persistForm(form, L.store);
  form.addEventListener("input", render);
  form.addEventListener("change", render);
  render();
})();
