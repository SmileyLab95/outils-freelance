/*
 * Espace entrepreneur et compte en ligne (documentation/23-serveur-et-connexion.md, § 5) : si cet appareil a ouvert
 * un compte, l'Espace se synchronise à l'ouverture, quelques secondes après chaque modification et au retour de la
 * connexion ; une ligne d'état indique « synchronisé », « hors connexion » ou les points à vérifier. Chargé seulement
 * dans la version en brouillon tant que les comptes ne sont pas ouverts.
 */
(function () {
  "use strict";
  var A = window.OFCompte, main = document.querySelector("#espace-app .espace-main");
  if (!A || !main) return;
  var DELAY = 3000, timer = null;
  var line = document.createElement("p");
  line.className = "espace-sync espace-noprint";
  line.id = "espace-sync";
  main.insertBefore(line, main.firstChild);
  var account = "../compte/";

  function show(text, link, kind) {
    line.textContent = text + (link ? " " : "");
    line.className = "espace-sync espace-noprint" + (kind ? " is-" + kind : "");
    if (link) {
      var a = document.createElement("a");
      a.href = account;
      a.textContent = link;
      line.appendChild(a);
    }
  }
  var time = function (iso) { return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); };

  function run() {
    clearTimeout(timer);
    timer = null;
    return A.state().then(function (st) {
      if (!st || !st.key) { show("Retrouvez cet Espace sur tous vos appareils :", "créer un compte"); return; }
      if (!navigator.onLine) { show("Hors connexion : vos modifications seront synchronisées au retour de la connexion."); return; }
      show("Synchronisation…");
      return A.sync().then(function (r) {
        return A.state().then(function (now) {
          var n = r.conflicts.length;
          show("Synchronisé à " + time(now.lastSync) + (n ? " · " + n + (n > 1 ? " points" : " point") + " à vérifier :" : " ·"),
            n ? "voir" : "mon compte", n ? "warn" : "ok");
        });
      }, function (e) {
        if (e.code === "unauthorized") show("Session expirée :", "se reconnecter pour synchroniser", "warn");
        else if (e.code === "network") show("Hors connexion : vos modifications seront synchronisées au retour de la connexion.");
        else show("Synchronisation interrompue :", "voir mon compte", "warn");
      });
    }, function () { line.hidden = true; });   // stockage indisponible : pas de compte possible sur cet appareil
  }

  window.addEventListener("of-espace-saved", function (e) {
    if (e.detail && e.detail.origin === "sync") return;
    clearTimeout(timer);
    timer = setTimeout(run, DELAY);
  });
  window.addEventListener("online", run);
  run();
})();
