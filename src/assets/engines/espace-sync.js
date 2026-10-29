/*
 * Moteur : synchronisation de l'Espace entrepreneur entre appareils (comptes en ligne, étape 2).
 * Règles : documentation/12-specification-comptes.md, § 3.1. Fusion à trois versions (base commune, local, distant),
 * champ par champ ; suppressions marquées (deletedAt) ; un document émis l'emporte sur un brouillon ; encaissements
 * réunis ; numéros en double signalés. Fonctions pures, qui ne modifient pas leurs arguments ; le résultat ne dépend
 * pas du côté (local ou distant) d'où vient chaque version, pour que tous les appareils convergent.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).espaceSync = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SCHEMA = 2;
  // Champs qui décrivent le contenu d'un document (pour savoir si un brouillon a été modifié).
  var CONTENT = ["type", "clientId", "date", "serviceDate", "terms", "validity", "depositPct", "nature", "lines", "vat", "penalty", "notes",
                 "originId", "origin", "quoteId"];
  // Noms des champs dans les messages de conflit.
  var LABELS = { name: "nom", email: "email", address: "adresse", siren: "SIREN", vat: "TVA", phone: "téléphone", notes: "note",
                 lines: "lignes", date: "date", serviceDate: "date de prestation", terms: "délai de paiement", clientId: "client",
                 status: "statut", archived: "archivage", delivery: "adresse de livraison", place: "pays", country: "pays",
                 iban: "IBAN", bic: "BIC", siret: "SIRET", penalty: "pénalités", nature: "nature", validity: "validité",
                 depositPct: "acompte", prefixes: "préfixes", numbering: "numérotation", endpoint: "adresse électronique",
                 amount: "montant", method: "moyen de paiement", note: "note", invoiceId: "facture liée", pro: "type de client", logo: "logo",
                 supplier: "fournisseur", label: "nature", ref: "référence de la pièce",
                 task: "tâche", unit: "unité", quantity: "durée", rate: "taux", billable: "facturable",
                 contact: "interlocuteur", source: "origine", stage: "étape", value: "valeur estimée", nextDate: "date de relance",
                 nextAction: "prochaine action", prospectId: "piste", from: "sens de l'échange", text: "résumé", hashes: "empreintes",
                 every: "fréquence", start: "première échéance", end: "dernière échéance", cashBalance: "solde du compte",
                 cashDate: "date du solde", vatLastYear: "TVA de l'année précédente" };
  var labels = function (fields) { return fields.map(function (k) { return LABELS[k] || k; }).join(", "); };

  // ----- Comparaison et copie ------------------------------------------------------------------

  /** Texte canonique d'une valeur : clés triées ; undefined, null et NaN équivalents (comme après un passage en JSON). */
  function canonical(v) {
    if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
    if (v && typeof v === "object") {
      return "{" + Object.keys(v).filter(function (k) { return v[k] !== undefined; }).sort()
        .map(function (k) { return JSON.stringify(k) + ":" + canonical(v[k]); }).join(",") + "}";
    }
    return v === undefined ? "null" : JSON.stringify(v);
  }
  var same = function (a, b) { return canonical(a) === canonical(b); };
  var clone = function (v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
  function pick(o, fields) {
    var out = {};
    if (o) fields.forEach(function (k) { if (o[k] !== undefined) out[k] = o[k]; });
    return out;
  }
  function omit(o, fields) {
    var out = {};
    Object.keys(o || {}).forEach(function (k) { if (fields.indexOf(k) < 0) out[k] = o[k]; });
    return out;
  }
  /** Version gagnante en cas de conflit : la plus récente ; à égalité, un ordre fixe (même choix sur tous les appareils). */
  function aWins(a, b) {
    var ta = String(a.updatedAt || ""), tb = String(b.updatedAt || "");
    return ta !== tb ? ta > tb : canonical(a) >= canonical(b);
  }
  var later = function (x, y) { return String(x || "") >= String(y || "") ? x : y; };
  var earlier = function (x, y) { return String(x) <= String(y) ? x : y; };
  // Dates d'un événement survenu des deux côtés (suppression, même émission) : la première compte, sans conflit.
  var EARLIEST = ["deletedAt", "issuedAt"];

  /**
   * Schéma 1 → 2 : les suppressions deviennent des marques (deletedAt) ; aucune donnée à transformer. Les listes
   * absentes deviennent vides ; un encaissement sans identifiant (ancienne sauvegarde) en reçoit un, déduit de sa place,
   * le même sur tous les appareils. Des données d'un schéma plus récent sont refusées : cet appareil doit d'abord charger
   * la nouvelle version de l'Espace.
   */
  function migrate(data) {
    var out = clone(data) || {};
    if (Number(out.schema) > SCHEMA) {
      var error = new Error("Données d'une version plus récente de l'Espace : rechargez la page pour mettre l'Espace à jour.");
      error.code = "schema-newer";
      throw error;
    }
    out.schema = SCHEMA;
    out.profile = out.profile || null;
    out.clients = (Array.isArray(out.clients) ? out.clients : []).filter(Boolean);
    out.documents = (Array.isArray(out.documents) ? out.documents : []).filter(Boolean);
    out.expenses = (Array.isArray(out.expenses) ? out.expenses : []).filter(Boolean);
    out.timeEntries = (Array.isArray(out.timeEntries) ? out.timeEntries : []).filter(Boolean);
    out.prospects = (Array.isArray(out.prospects) ? out.prospects : []).filter(Boolean);
    out.optouts = (Array.isArray(out.optouts) ? out.optouts : []).filter(Boolean);
    out.charges = (Array.isArray(out.charges) ? out.charges : []).filter(Boolean);
    out.prospects.forEach(function (p) { p.exchanges = (Array.isArray(p.exchanges) ? p.exchanges : []).filter(Boolean); });
    out.documents.forEach(function (d) {
      d.payments = (Array.isArray(d.payments) ? d.payments : []).filter(Boolean);
      d.payments.forEach(function (pay, i) { if (typeof pay.id !== "string" || !pay.id) pay.id = d.id + "-p" + (i + 1); });
    });
    return out;
  }

  // ----- Fusion -----------------------------------------------------------------------------------

  /**
   * Fusion champ par champ de deux versions d'un objet depuis leur base commune (o, éventuellement absente).
   * skip : champs traités à part. Une suppression (ou une même émission) faite des deux côtés n'est pas un conflit :
   * la date la plus ancienne est gardée.
   */
  function mergeFields(o, a, b, skip) {
    o = o || {};
    var out = {}, conflicts = [], winA, keys = {};
    [o, a, b].forEach(function (x) { Object.keys(x).forEach(function (k) { keys[k] = true; }); });
    Object.keys(keys).sort().forEach(function (k) {
      if (k === "updatedAt" || (skip && skip.indexOf(k) > -1)) return;
      var va = a[k], vb = b[k], vo = o[k], v;
      if (same(va, vb)) v = va;
      else if (EARLIEST.indexOf(k) > -1 && va && vb) v = earlier(va, vb);
      else if (same(va, vo)) v = vb;
      else if (same(vb, vo)) v = va;
      else {
        if (winA === undefined) winA = aWins(a, b);
        v = winA ? va : vb;
        conflicts.push(k);
      }
      if (v !== undefined) out[k] = clone(v);
    });
    var updated = later(a.updatedAt, b.updatedAt);
    if (updated) out.updatedAt = updated;
    return { value: out, conflicts: conflicts };
  }

  /** Supprimé d'un côté et modifié de l'autre depuis la base : la modification l'emporte (marque retirée). */
  function resurrect(o, a, b, merged) {
    if (!merged.deletedAt || (a.deletedAt && b.deletedAt)) return false;
    var kept = a.deletedAt ? b : a;
    if (!o || same(omit(kept, ["updatedAt", "deletedAt"]), omit(o, ["updatedAt", "deletedAt"]))) return false;
    delete merged.deletedAt;
    return true;
  }

  // Effacé sur un appareil mais modifié sur un autre : message accordé selon l'élément.
  var REMOVED = { client: "Client effacé sur un appareil mais modifié sur un autre : il est conservé.",
                  document: "Brouillon effacé sur un appareil mais modifié sur un autre : il est conservé.",
                  payment: "Encaissement effacé sur un appareil mais modifié sur un autre : il est conservé.",
                  expense: "Dépense effacée sur un appareil mais modifiée sur un autre : elle est conservée.",
                  time: "Temps passé effacé sur un appareil mais modifié sur un autre : il est conservé.",
                  prospect: "Prospect effacé sur un appareil mais modifié sur un autre : il est conservé.",
                  exchange: "Échange effacé sur un appareil mais modifié sur un autre : il est conservé.",
                  optout: "Opposition effacée sur un appareil mais modifiée sur un autre : elle est conservée.",
                  charge: "Charge effacée sur un appareil mais modifiée sur un autre : elle est conservée." };
  var byId = function (list) { var m = {}; (list || []).forEach(function (x) { m[x.id] = x; }); return m; };

  /**
   * Réunion de deux listes (clients, documents, encaissements) par identifiant, depuis la base. Présent des deux côtés :
   * mergeOne. Créé d'un seul côté : ajouté. Présent dans la base mais effacé d'un côté (ancien schéma, sans marque) :
   * retiré s'il n'a pas changé de l'autre côté, gardé supprimé s'il y est marqué supprimé, sinon gardé et signalé ;
   * keep(x) vrai : toujours gardé (document émis). where : champs ajoutés aux signalements (document d'un encaissement).
   */
  function mergeList(kind, oList, aList, bList, ctx, mergeOne, keep, where) {
    var O = byId(oList), A = byId(aList), B = byId(bList), ids = {}, out = [];
    Object.keys(A).concat(Object.keys(B)).forEach(function (id) { ids[id] = true; });
    Object.keys(ids).sort().forEach(function (id) {
      var o = O[id], a = A[id], b = B[id];
      if (a && b) { out.push(mergeOne(o, a, b, ctx)); return; }
      var only = clone(a || b), always = keep && keep(only);
      if (!o) { out.push(only); return; }
      if (!always && only.deletedAt) { out.push(only); return; } // supprimé des deux côtés
      if (!always && same(only, o)) return;
      if (always) delete only.deletedAt;
      out.push(only);
      ctx.conflicts.push(Object.assign({ kind: kind, id: id, type: "removed-modified",
        message: always ? "Effacé sur un appareil mais émis : un document émis est conservé."
          : REMOVED[kind] }, where));
    });
    return out;
  }

  /** Encaissements d'un document : réunis, fusionnés champ par champ ; mêmes règles de suppression que les fiches. */
  function mergePayments(o, a, b, ctx, docId) {
    var where = { docId: docId };
    var mergeOne = function (po, pa, pb) {
      var res = mergeFields(po, pa, pb);
      if (resurrect(po, pa, pb, res.value)) ctx.conflicts.push({ kind: "payment", id: pa.id, docId: docId, type: "deleted-modified",
        message: "Encaissement supprimé sur un appareil mais modifié sur un autre : il est conservé." });
      if (res.conflicts.length) ctx.conflicts.push({ kind: "payment", id: pa.id, docId: docId, type: "field", fields: res.conflicts,
        message: "Encaissement modifié sur deux appareils : la version la plus récente est gardée (" + labels(res.conflicts) + ")." });
      return res.value;
    };
    return mergeList("payment", o, a, b, ctx, mergeOne, null, where)
      .sort(function (x, y) { return x.date === y.date ? (x.id < y.id ? -1 : 1) : (x.date < y.date ? -1 : 1); });
  }

  var content = function (d) { return pick(d, CONTENT); };
  var issued = function (d) { return !!d && d.status !== "draft"; };
  /** Émission d'un document (numéro et date-heure) : deux émissions distinctes du même brouillon n'ont pas la même. */
  var issuance = function (d) { return issued(d) ? d.number + "|" + d.issuedAt : ""; };
  /** Deux émissions qui produisent le même document (même numéro, même contenu, mêmes coordonnées figées). */
  var sameDocument = function (a, b) { return a.number === b.number && same(content(a), content(b)) && same(a.snapshot, b.snapshot); };
  var rekey = function (doc, id) { var c = clone(doc); c.id = id; return c; };

  /**
   * Copie d'un document dans un nouvel enregistrement. Document émis (keepIssue) : copié tel quel, un document émis ne
   * change pas. Brouillon : le lien vers le devis n'est pas repris, pour que le devis ne soit pas facturé une seconde
   * fois. copyOf : le document d'origine ; copyFrom (copie d'un brouillon seulement) : la version copiée, pour que les
   * modifications suivantes faites sur cette version rejoignent la même copie au lieu d'en créer une autre.
   */
  function copyOf(doc, keepIssue, ctx, from) {
    var copy = clone(omit(doc, keepIssue ? ["deletedAt", "copyFrom"] : ["number", "snapshot", "issuedAt", "deletedAt", "quoteId"]));
    copy.id = ctx.uid();
    if (!keepIssue) {
      copy.status = "draft";
      copy.payments = [];
      if (doc.updatedAt) copy.copyFrom = doc.updatedAt;
    }
    copy.copyOf = from;
    return copy;
  }
  var copyKey = { draft: function (d) { return d.copyOf && d.copyFrom ? "d|" + d.copyOf + "|" + d.copyFrom : ""; },
                  issued: function (d) { return d.copyOf && issued(d) ? "i|" + d.copyOf + "|" + issuance(d) : ""; } };

  var twice = function (n1, n2) {
    return "Le même brouillon a été émis sur deux appareils (" + (n1 === n2 ? "deux fois sous le n° " + n1 : "n° " + n1 + " et n° " + n2) +
      ") : les deux documents sont conservés ; annulez celui qui est en trop par un avoir.";
  };

  /**
   * Deux émissions différentes du même document : les deux ont pu être envoyées, aucune ne disparaît. kept garde
   * l'identifiant ; other devient un document émis distinct, avec ses encaissements (chacun a été saisi sur l'une des
   * deux émissions : un brouillon n'en a pas).
   */
  function split(kept, other, ctx) {
    var out = clone(kept);
    delete out.deletedAt;
    var copy = copyOf(other, true, ctx, kept.id);
    ctx.extra.push(copy);
    ctx.conflicts.push({ kind: "document", id: kept.id, type: "issued-twice", copyId: copy.id, numbers: [kept.number, other.number],
      message: twice(kept.number, other.number) });
    return out;
  }

  /**
   * Deux versions d'un document. ctx : { uid, conflicts, extra (documents à ajouter), copies (copies déjà faites, par
   * clé), rebase (versions à reporter sur une copie existante) }.
   */
  function mergeDocument(o, a, b, ctx) {
    if (issued(a) !== issued(b)) {
      // Émis d'un côté, brouillon de l'autre : l'émission est définitive.
      var done = issued(a) ? a : b, draft = issued(a) ? b : a;
      var out = clone(done);
      out.payments = mergePayments(o && o.payments, a.payments, b.payments, ctx, done.id);
      delete out.deletedAt;
      var base = o && !issued(o) ? o : null;
      // Sans base (premier lien), toute différence avec le document émis est gardée ; un brouillon supprimé n'est pas repris.
      var edited = !draft.deletedAt && (base ? !same(content(draft), content(base)) : true) && !same(content(draft), content(done));
      if (edited) {
        // Cette version du brouillon a déjà été copiée lors d'une synchronisation précédente : les modifications la rejoignent.
        var copyId = base && ctx.copies["d|" + done.id + "|" + base.updatedAt];
        if (copyId) ctx.rebase.push({ id: copyId, base: base, version: draft });
        else {
          var copy = copyOf(draft, false, ctx, done.id);
          ctx.extra.push(copy);
          copyId = copy.id;
        }
        ctx.conflicts.push({ kind: "document", id: done.id, type: "issued-draft", copyId: copyId,
          message: "Brouillon modifié sur un appareil alors qu'il était émis sur un autre : le document émis est gardé, vos modifications sont conservées dans un nouveau brouillon." });
      }
      return out;
    }
    if (issuance(a) !== issuance(b)) {
      // Deux émissions différentes. Celle de la base est déjà connue de tous : si un côté l'a encore, l'autre côté a
      // reçu entre-temps la séparation en deux documents (split) ; ce côté rejoint la copie qui porte son émission.
      var known = o && issued(o) ? issuance(o) : null;
      var stale = known === issuance(a) ? a : known === issuance(b) ? b : null;
      var fresh = stale === a ? b : a;
      var target = stale && ctx.copies["i|" + fresh.id + "|" + issuance(stale)];
      if (target) {
        ctx.rebase.push({ id: target, base: o, version: stale });
        ctx.conflicts.push({ kind: "document", id: fresh.id, type: "issued-twice", copyId: target, numbers: [fresh.number, stale.number],
          message: twice(fresh.number, stale.number) });
        return clone(fresh);
      }
      if (!sameDocument(a, b)) {
        // Sans copie connue : l'émission déjà partagée (fresh) garde l'identifiant ; sinon, la première émise.
        if (stale) return split(fresh, stale, ctx);
        var first = String(a.issuedAt) !== String(b.issuedAt) ? (String(a.issuedAt) < String(b.issuedAt) ? a : b) : (canonical(a) <= canonical(b) ? a : b);
        return split(first, first === a ? b : a, ctx);
      }
      // Même document émis deux fois : un seul, daté de la première émission (fusion ordinaire ci-dessous).
    }
    var res = mergeFields(o, a, b, ["payments"]);
    var doc = res.value;
    doc.payments = mergePayments(o && o.payments, a.payments, b.payments, ctx, doc.id);
    if (issued(doc)) {
      if (doc.deletedAt) {
        delete doc.deletedAt;
        ctx.conflicts.push({ kind: "document", id: doc.id, type: "issued-deleted", message: "Un document émis ne peut pas être supprimé : il est conservé." });
      }
    } else if (resurrect(o, a, b, doc)) {
      ctx.conflicts.push({ kind: "document", id: doc.id, type: "deleted-modified", message: "Brouillon supprimé sur un appareil mais modifié sur un autre : il est conservé." });
    }
    if (res.conflicts.length) ctx.conflicts.push({ kind: "document", id: doc.id, type: "field", fields: res.conflicts,
      message: "Modifié sur deux appareils : la version la plus récente est gardée (" + labels(res.conflicts) + ")." });
    return doc;
  }

  /**
   * Fiche client, dépense, temps passé, prospect ou opposition : fusion champ par champ ; même règle de suppression et
   * de modification croisées. skip : champs fusionnés à part (échanges d'un prospect).
   */
  function mergeRecord(kind, deleted, changed, skip) {
    return function (o, a, b, ctx) {
      var res = mergeFields(o, a, b, skip);
      if (resurrect(o, a, b, res.value)) ctx.conflicts.push({ kind: kind, id: res.value.id, type: "deleted-modified", message: deleted });
      if (res.conflicts.length) ctx.conflicts.push({ kind: kind, id: res.value.id, type: "field", fields: res.conflicts,
        message: changed + " (" + labels(res.conflicts) + ")." });
      return res.value;
    };
  }
  var mergeClient = mergeRecord("client", "Client supprimé sur un appareil mais modifié sur un autre : il est conservé.",
    "Fiche modifiée sur deux appareils : la version la plus récente est gardée");
  var mergeExpense = mergeRecord("expense", "Dépense supprimée sur un appareil mais modifiée sur un autre : elle est conservée.",
    "Dépense modifiée sur deux appareils : la version la plus récente est gardée");
  var mergeTime = mergeRecord("time", "Temps passé supprimé sur un appareil mais modifié sur un autre : il est conservé.",
    "Temps passé modifié sur deux appareils : la version la plus récente est gardée");
  var mergeCharge = mergeRecord("charge", "Charge supprimée sur un appareil mais modifiée sur un autre : elle est conservée.",
    "Charge modifiée sur deux appareils : la version la plus récente est gardée");
  var mergeOptout = mergeRecord("optout", "Opposition supprimée sur un appareil mais modifiée sur un autre : elle est conservée.",
    "Opposition modifiée sur deux appareils : la version la plus récente est gardée");
  var mergeFiche = mergeRecord("prospect", "Prospect supprimé sur un appareil mais modifié sur un autre : il est conservé.",
    "Prospect modifié sur deux appareils : la version la plus récente est gardée", ["exchanges"]);
  var mergeExchange = mergeRecord("exchange", "Échange supprimé sur un appareil mais modifié sur un autre : il est conservé.",
    "Échange modifié sur deux appareils : la version la plus récente est gardée");

  /** Prospect : fiche fusionnée champ par champ, échanges réunis par identifiant (comme les encaissements d'un document). */
  function mergeProspect(o, a, b, ctx) {
    var merged = mergeFiche(o, a, b, ctx), where = { prospectId: a.id };
    var mergeOne = function (xo, xa, xb) {
      var from = ctx.conflicts.length, value = mergeExchange(xo, xa, xb, ctx);
      ctx.conflicts.slice(from).forEach(function (c) { Object.assign(c, where); });
      return value;
    };
    merged.exchanges = mergeList("exchange", o && o.exchanges, a.exchanges, b.exchanges, ctx, mergeOne, null, where)
      .sort(function (x, y) { return x.date === y.date ? (x.id < y.id ? -1 : 1) : (x.date < y.date ? -1 : 1); });
    return merged;
  }

  /**
   * Liens entre devis et factures après fusion : un devis pointe vers une facture émise qui le reprend (la première
   * émise s'il y en a plusieurs), jamais vers un document supprimé ou absent.
   */
  function relink(documents) {
    var index = byId(documents);
    var alive = function (id) { return index[id] && !index[id].deletedAt; };
    var order = function (d) { return String(d.issuedAt || "") + "|" + d.id; };
    documents.filter(function (d) { return d.type === "facture" && issued(d) && d.quoteId && index[d.quoteId]; })
      .sort(function (x, y) { return order(x) < order(y) ? -1 : 1; })
      .forEach(function (inv) {
        var quote = index[inv.quoteId];
        if (!quote.invoiceId || !alive(quote.invoiceId) || !issued(index[quote.invoiceId])) quote.invoiceId = inv.id;
      });
    documents.forEach(function (q) {
      if (q.type === "devis" && q.invoiceId && !alive(q.invoiceId)) delete q.invoiceId;
    });
  }

  /** Documents émis du même type portant le même numéro (à régulariser par l'utilisateur). */
  function duplicates(documents) {
    var seen = {}, out = [];
    (documents || []).forEach(function (d) {
      if (!issued(d) || d.deletedAt || !d.number) return;
      var key = d.type + "|" + d.number;
      (seen[key] = seen[key] || []).push(d.id);
    });
    Object.keys(seen).sort().forEach(function (key) {
      if (seen[key].length > 1) out.push({ type: key.split("|")[0], number: key.split("|")[1], ids: seen[key].sort() });
    });
    return out;
  }

  /**
   * Fusion de l'état local et de l'état distant depuis leur dernière base commune (null au premier lien ; l'état
   * distant est null pour un compte encore vide). options : { uid: fonction qui crée un identifiant (copies de
   * documents) }. Les réglages de l'appareil restent locaux. Renvoie { data, conflicts } ; lève une erreur
   * (code « schema-newer ») si l'un des états vient d'une version plus récente.
   */
  function merge(base, local, remote, options) {
    base = migrate(base);
    local = migrate(local);
    remote = migrate(remote);
    var ctx = { uid: options.uid, conflicts: [], extra: [], copies: {}, rebase: [] };
    // Copies faites lors de synchronisations précédentes (même clé des deux côtés : le plus petit identifiant, partout le même).
    local.documents.concat(remote.documents).forEach(function (d) {
      [copyKey.draft(d), copyKey.issued(d)].forEach(function (key) {
        if (key && (!ctx.copies[key] || d.id < ctx.copies[key])) ctx.copies[key] = d.id;
      });
    });
    var profile = local.profile && remote.profile ? mergeFields(base.profile, local.profile, remote.profile)
      : { value: clone(local.profile || remote.profile), conflicts: [] };
    if (profile.conflicts.length) ctx.conflicts.push({ kind: "profile", type: "field", fields: profile.conflicts,
      message: "Profil modifié sur deux appareils : la version la plus récente est gardée (" + labels(profile.conflicts) + ")." });
    var clients = mergeList("client", base.clients, local.clients, remote.clients, ctx, mergeClient);
    var expenses = mergeList("expense", base.expenses, local.expenses, remote.expenses, ctx, mergeExpense);
    var timeEntries = mergeList("time", base.timeEntries, local.timeEntries, remote.timeEntries, ctx, mergeTime);
    var prospects = mergeList("prospect", base.prospects, local.prospects, remote.prospects, ctx, mergeProspect);
    var optouts = mergeList("optout", base.optouts, local.optouts, remote.optouts, ctx, mergeOptout);
    var charges = mergeList("charge", base.charges, local.charges, remote.charges, ctx, mergeCharge);
    var documents = mergeList("document", base.documents, local.documents, remote.documents, ctx, mergeDocument, issued);
    // Versions d'un appareil qui n'avait pas encore reçu une copie : reportées sur cette copie (fusion depuis la même base).
    for (var guard = 0; ctx.rebase.length && guard < 1000; guard++) {
      var job = ctx.rebase.shift();
      documents = documents.map(function (d) {
        return d.id === job.id ? mergeDocument(rekey(job.base, d.id), rekey(job.version, d.id), d, ctx) : d;
      });
    }
    documents = documents.concat(ctx.extra);
    relink(documents);
    duplicates(documents).forEach(function (dup) {
      ctx.conflicts.push({ kind: "document", type: "duplicate-number", number: dup.number, ids: dup.ids,
        message: "Le numéro " + dup.number + " a été attribué à " + dup.ids.length + " documents émis sur des appareils différents : à régulariser par un avoir et un nouveau document." });
    });
    return {
      data: { schema: SCHEMA, profile: profile.value, clients: clients, documents: documents, expenses: expenses, timeEntries: timeEntries,
              prospects: prospects, optouts: optouts, charges: charges,
              settings: clone(local.settings) || { lastExport: null }, savedAt: local.savedAt || null },
      conflicts: ctx.conflicts
    };
  }

  return { SCHEMA: SCHEMA, canonical: canonical, migrate: migrate, merge: merge, duplicates: duplicates };
});
