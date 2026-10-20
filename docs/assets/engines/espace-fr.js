/*
 * Moteur : Espace entrepreneur (France). Fonctions pures sur les données de l'Espace (voir documentation/09).
 * Numérotation et émission, statuts, encaissements, livre des recettes, déclaration Urssaf, plafonds.
 * Les montants des documents viennent du moteur de facture commun (OFE.invoiceFR).
 */
(function (root, factory) {
  var api = factory(root.OFE ? root.OFE.invoiceFR : require("./invoice-fr.js"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).espaceFR = api;
})(typeof self !== "undefined" ? self : this, function (INV) {
  "use strict";

  var MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  var METHODS = { virement: "Virement", carte: "Carte bancaire", cheque: "Chèque", especes: "Espèces", prelevement: "Prélèvement", autre: "Autre" };
  var DEFAULT_PREFIXES = { facture: "F", devis: "D", avoir: "A" };
  var round2 = function (n) { return Math.round(n * 100) / 100; };

  function lastDay(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
  function iso(y, m, d) { return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }

  // ----- Montants ------------------------------------------------------------

  function total(doc) { return round2(INV.compute(doc).ttc); }
  function paidAmount(doc) {
    return round2((doc.payments || []).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0));
  }
  /** Total des avoirs émis sur une facture. */
  function credited(documents, invoice) {
    return round2((documents || []).reduce(function (s, d) {
      return d.type === "avoir" && d.status !== "draft" && d.originId === invoice.id ? s + total(d) : s;
    }, 0));
  }

  /**
   * Reste dû. Facture : total − encaissements − avoirs imputés. Avoir lié à une facture : la part de l'avoir à
   * rembourser parce que la facture avait déjà été payée au-delà de son nouveau montant, moins les remboursements faits.
   * Avoir sans facture d'origine : son montant moins les remboursements. Sans la liste des documents, total − encaissements.
   */
  function balance(doc, documents) {
    if (doc.type === "facture") return round2(total(doc) - paidAmount(doc) - (documents ? credited(documents, doc) : 0));
    if (doc.type === "avoir" && documents && doc.originId) {
      var origin = documents.filter(function (d) { return d.id === doc.originId; })[0];
      if (origin) {
        // Trop-perçu sur la facture, réparti entre ses avoirs dans l'ordre d'émission.
        var left = Math.max(0, paidAmount(origin) - (total(origin) - credited(documents, origin)));
        var avoirs = documents.filter(function (d) { return d.type === "avoir" && d.status !== "draft" && d.originId === origin.id; })
          .sort(function (a, b) { return order(a) < order(b) ? -1 : 1; });
        for (var i = 0; i < avoirs.length; i++) {
          var share = Math.min(total(avoirs[i]), left);
          if (avoirs[i].id === doc.id) return round2(Math.max(0, share - paidAmount(doc)));
          left -= share;
        }
        return 0;
      }
    }
    return round2(total(doc) - paidAmount(doc));
  }
  function dueDate(doc) { return INV.addDays(doc.date, Math.max(0, parseInt(doc.terms, 10) || 0)); }

  // ----- Numérotation et émission --------------------------------------------

  /** Clé d'ordre d'émission : date du document, puis date d'émission, puis rang du numéro. */
  function order(d) {
    var rank = /(\d+)$/.exec(d.number || "");
    return (d.date || "") + "|" + (d.issuedAt || "") + "|" + (rank ? String(+rank[1]).padStart(9, "0") : "");
  }

  /** Documents émis d'une série (type et année), du plus récent au plus ancien. */
  function series(documents, type, year) {
    return documents.filter(function (d) {
      return d.type === type && d.status !== "draft" && d.number && String(d.date).slice(0, 4) === String(year);
    }).sort(function (a, b) { return order(a) < order(b) ? 1 : -1; });
  }

  /** Préfixe d'une série commencée (celui de son dernier document émis), ou null si la série est vide. */
  function seriesPrefix(documents, type, year) {
    var last = series(documents, type, year)[0];
    if (!last) return null;
    var at = last.number.lastIndexOf(String(year) + "-");
    return at > -1 ? last.number.slice(0, at) : null;
  }

  /**
   * Prochain numéro de la série : F2026-001, F2026-002… (rang le plus élevé + 1). Une série commencée garde son
   * préfixe jusqu'à la fin de l'année ; le préfixe des réglages s'applique aux nouvelles séries. numbering
   * (facultatif) : { facture: { year, last } … }, dernier rang utilisé hors de l'Espace pour continuer une séquence.
   */
  function nextNumber(documents, type, year, prefixes, numbering) {
    var started = seriesPrefix(documents, type, year);
    var prefix = (started != null ? started : prefixes && prefixes[type] != null ? prefixes[type] : DEFAULT_PREFIXES[type]) + year + "-";
    var external = numbering && numbering[type];
    var max = external && String(external.year) === String(year) ? Math.max(0, parseInt(external.last, 10) || 0) : 0;
    documents.forEach(function (d) {
      if (d.type !== type || !d.number || d.number.indexOf(prefix) !== 0) return;
      var n = parseInt(d.number.slice(prefix.length), 10);
      if (n > max) max = n;
    });
    return prefix + String(max + 1).padStart(3, "0");
  }

  /**
   * Numérotation du générateur public à continuer dans l'Espace : son numéro a la forme <préfixe><année>-<rang>,
   * l'année est celle du document et aucun document de ce type n'est encore émis cette année dans l'Espace.
   * Renvoie { prefix, year, last, number } (number : celui que recevra le document) ou null.
   */
  function continuation(documents, type, number, year) {
    var m = /^([A-Za-z_\-\/]{0,12}?)(\d{4})-(\d{1,6})$/.exec(String(number || "").trim());
    if (!m || m[2] !== String(year) || +m[3] < 1 || String(+m[3]).padStart(3, "0") !== m[3]) return null;
    if (series(documents, type, year).length) return null;
    return { prefix: m[1], year: m[2], last: +m[3] - 1, number: m[1] + m[2] + "-" + m[3] };
  }

  /** Contrôles avant émission ; renvoie la liste des erreurs (vide si le document peut être émis). */
  function checkIssue(documents, doc, client) {
    var errors = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.date || "")) errors.push("Indiquez la date du document.");
    if (!client || !String(client.name || "").trim()) errors.push("Choisissez un client.");
    var lines = (doc.lines || []).filter(function (l) { return String(l.desc || "").trim() && isFinite(INV.amount(l.price)) && isFinite(INV.amount(l.qty)); });
    if (!lines.length) errors.push("Ajoutez au moins une ligne avec une désignation, une quantité et un prix.");
    else if (total(doc) <= 0) errors.push("Le montant total doit être positif.");
    else if (doc.type === "avoir" && doc.originId) {
      var origin = documents.filter(function (d) { return d.id === doc.originId; })[0];
      if (origin && total(doc) > total(origin) - credited(documents, origin) + 0.005) {
        errors.push("L'avoir ne peut pas dépasser le montant restant de la facture " + origin.number + " (" +
          String((total(origin) - credited(documents, origin)).toFixed(2)).replace(".", ",") + " €).");
      }
    }
    var last = series(documents, doc.type, String(doc.date).slice(0, 4))[0];
    if (last && doc.date < last.date) {
      errors.push("La date ne peut pas être antérieure à celle du dernier document émis de la série (" + last.number + " du " +
        last.date.split("-").reverse().join("/") + ") : la numérotation doit rester chronologique.");
    }
    return errors;
  }

  /** Émission : numéro, statut, coordonnées figées. Renvoie un nouveau document (l'original n'est pas modifié). */
  function issue(documents, doc, me, client, prefixes, now, numbering) {
    var errors = checkIssue(documents, doc, client);
    if (errors.length) return { errors: errors };
    var issued = JSON.parse(JSON.stringify(doc));
    issued.number = nextNumber(documents, doc.type, String(doc.date).slice(0, 4), prefixes, numbering);
    issued.status = doc.type === "devis" ? "sent" : "issued";
    issued.snapshot = { me: JSON.parse(JSON.stringify(me || {})), client: JSON.parse(JSON.stringify(client)) };
    issued.issuedAt = now;
    issued.updatedAt = now;
    return { doc: issued, errors: [] };
  }

  // ----- Statuts ---------------------------------------------------------------

  /**
   * Statut affiché. Facture : draft, unpaid, overdue, partial, paid, cancelled (annulée par avoir).
   * Devis : draft, sent, accepted, refused, invoiced. Avoir : draft, imputed (déduit d'une facture non payée),
   * refund (à rembourser), refunded.
   */
  function state(doc, today, documents) {
    if (doc.status === "draft") return "draft";
    if (doc.type === "devis") return doc.invoiceId ? "invoiced" : doc.status;
    var paid = paidAmount(doc), bal = balance(doc, documents);
    if (doc.type === "avoir") {
      if (bal > 0.005) return "refund";
      return paid > 0 ? "refunded" : "imputed";
    }
    var credit = documents ? credited(documents, doc) : 0;
    if (bal <= 0.005) return paid > 0.005 || credit < total(doc) - 0.005 ? "paid" : "cancelled";
    if (paid > 0 || credit > 0) return dueDate(doc) < today ? "overdue" : "partial";
    return dueDate(doc) < today ? "overdue" : "unpaid";
  }

  /** Contrôle d'un encaissement (ou d'un remboursement pour un avoir). */
  function checkPayment(doc, payment, documents) {
    var errors = [];
    var amount = Number(payment.amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.date || "")) errors.push("Indiquez la date de l'encaissement.");
    if (!isFinite(amount) || amount <= 0) errors.push("Le montant doit être supérieur à zéro.");
    else if (amount > balance(doc, documents) + 0.005) errors.push("Le montant dépasse le reste à " + (doc.type === "avoir" ? "rembourser" : "encaisser") + ".");
    if (!METHODS[payment.method]) errors.push("Choisissez le moyen de paiement.");
    return errors;
  }

  // ----- Livre des recettes et encaissements ---------------------------------

  function nature(doc) {
    var line = (doc.lines || []).filter(function (l) { return String(l.desc || "").trim(); })[0];
    var n = line ? String(line.desc).trim() : INV.NATURES[doc.nature] || INV.NATURES.services;
    var more = (doc.lines || []).filter(function (l) { return String(l.desc || "").trim(); }).length - 1;
    return more > 0 ? n + " (+ " + more + ")" : n;
  }

  /** Encaissements (factures) et remboursements (avoirs, en négatif), par date, entre deux dates incluses. */
  function ledger(documents, from, to) {
    var rows = [];
    documents.forEach(function (doc) {
      if (doc.status === "draft" || (doc.type !== "facture" && doc.type !== "avoir")) return;
      var who = (doc.snapshot && doc.snapshot.client && doc.snapshot.client.name) || "";
      (doc.payments || []).forEach(function (p) {
        if ((from && p.date < from) || (to && p.date > to)) return;
        rows.push({ date: p.date, client: who, nature: nature(doc), method: METHODS[p.method] || p.method,
                    amount: doc.type === "avoir" ? -round2(Number(p.amount)) : round2(Number(p.amount)),
                    ref: doc.number, docId: doc.id, note: p.note || "" });
      });
    });
    return rows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ref < b.ref ? -1 : 1); });
  }

  function cashed(documents, from, to) {
    return round2(ledger(documents, from, to).reduce(function (s, r) { return s + r.amount; }, 0));
  }

  // ----- Déclaration Urssaf -----------------------------------------------------

  /** Période d'une clé « 2026-09 » ou « 2026-T3 » : dates de début et de fin, libellé. */
  function period(key) {
    var m = /^(\d{4})-(\d{2})$/.exec(key), q = /^(\d{4})-T([1-4])$/.exec(key);
    if (m) {
      var y = +m[1], mo = +m[2];
      return { key: key, start: iso(y, mo, 1), end: iso(y, mo, lastDay(y, mo)), label: MONTHS[mo - 1] + " " + y };
    }
    if (q) {
      var yq = +q[1], n = +q[2], first = 3 * n - 2;
      return { key: key, start: iso(yq, first, 1), end: iso(yq, first + 2, lastDay(yq, first + 2)),
               label: n + (n === 1 ? "er" : "e") + " trimestre " + yq };
    }
    return null;
  }

  /** Fin de l'ACRE : dernier jour du 3e trimestre civil qui suit celui du début d'activité. */
  function acreEnd(startDate) {
    var m = /^(\d{4})-(\d{2})-\d{2}$/.exec(startDate || "");
    if (!m) return "";
    var y = +m[1], qIndex = Math.floor((+m[2] - 1) / 3) + 3; // 3 trimestres après celui du début
    y += Math.floor(qIndex / 4);
    var endMonth = (qIndex % 4) * 3 + 3;
    return iso(y, endMonth, lastDay(y, endMonth));
  }

  /** Taux de cotisations d'une période (ACRE si la période se termine avant la fin de l'ACRE). */
  function rates(profile, rules, periodEnd) {
    var a = rules.micro_activities[profile.activity];
    if (!a) return null;
    var acre = Number(profile.acre) || 0;
    var inAcre = acre && periodEnd <= acreEnd(profile.startDate);
    return { social: inAcre ? a["acre_" + acre] : a.cotisations, cfp: a.cfp, vl: profile.vl ? a.versement_liberatoire : 0, acre: !!inAcre };
  }

  /**
   * Prochaine déclaration Urssaf à faire : la première échéance du calendrier (à partir d'aujourd'hui) pour la
   * périodicité du profil, avec le chiffre d'affaires encaissé de la période et les cotisations estimées.
   */
  function nextDeclaration(documents, profile, rules, events, today) {
    if (!rules.micro_activities[profile.activity]) return null;
    var periodicity = profile.periodicity === "monthly" ? "monthly" : "quarterly";
    var ev = (events || []).filter(function (e) {
      return e.period && e.date >= today && e.when && e.when.periodicity && e.when.periodicity.indexOf(periodicity) > -1;
    }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
    if (!ev) return null;
    var p = period(ev.period);
    var revenue = cashed(documents, p.start, p.end);
    var r = rates(profile, rules, p.end);
    var social = round2(revenue * (r.social + r.cfp));
    var vl = round2(revenue * r.vl);
    return { period: p, due: ev.date, revenue: revenue, rates: r, social: social, vl: vl, total: round2(social + vl),
             open: today <= p.end };
  }

  /** Plafond de la micro-entreprise et seuil de la franchise de TVA, sur l'année civile. */
  function thresholds(documents, profile, rules, year) {
    var a = rules.micro_activities[profile.activity];
    var revenue = cashed(documents, year + "-01-01", year + "-12-31");
    if (!a) return { revenue: revenue };
    return { revenue: revenue, ceiling: a.plafond_ca, vat: profile.vatRegime === "franchise" ? { base: a.tva_seuil, major: a.tva_seuil_majore } : null };
  }

  /** Synthèse par client : encaissé et reste à encaisser. */
  function clientTotals(documents, clientId) {
    var cash = 0, due = 0;
    documents.forEach(function (d) {
      if (d.clientId !== clientId || d.status === "draft") return;
      if (d.type === "facture") { cash += paidAmount(d); due += Math.max(0, balance(d, documents)); }
      if (d.type === "avoir") cash -= paidAmount(d);
    });
    return { cashed: round2(cash), due: round2(due) };
  }

  // ----- Transformations ------------------------------------------------------

  var COPY_FIELDS = ["clientId", "lines", "vat", "nature", "terms", "penalty", "notes"];
  function copyFrom(source, fields) {
    var out = {};
    fields.forEach(function (k) { if (source[k] !== undefined) out[k] = JSON.parse(JSON.stringify(source[k])); });
    return out;
  }

  /** Facture brouillon à partir d'un devis. */
  function invoiceFromQuote(quote, today, id) {
    return Object.assign(copyFrom(quote, COPY_FIELDS), { id: id, type: "facture", status: "draft", date: today, serviceDate: today,
      quoteId: quote.id, payments: [] });
  }

  /** Avoir brouillon à partir d'une facture émise (mêmes lignes, référence de la facture). */
  function creditFromInvoice(invoice, today, id) {
    return Object.assign(copyFrom(invoice, COPY_FIELDS), { id: id, type: "avoir", status: "draft", date: today,
      originId: invoice.id, origin: { number: invoice.number, date: invoice.date }, payments: [] });
  }

  /** Copie modifiable d'un document (nouveau brouillon daté d'aujourd'hui). */
  function duplicate(doc, today, id) {
    var extra = doc.type === "avoir" ? ["originId", "origin"] : [];
    return Object.assign(copyFrom(doc, COPY_FIELDS.concat(["validity", "depositPct"], extra)), { id: id, type: doc.type, status: "draft",
      date: today, serviceDate: today, payments: [] });
  }

  // ----- Emails : envoi d'un document, relance d'une facture ---------------------------------

  /**
   * Objet et texte d'un email sur un document émis. kind : "send" (envoi du document) ou "reminder" (relance d'une
   * facture). fmt = { eur, date }. Un lien mailto: ne joint pas de fichier : l'utilisateur joint le PDF téléchargé.
   */
  function email(kind, doc, documents, profile, today, fmt) {
    profile = profile || {};
    var amountText = fmt.eur(total(doc)) + (INV.compute(doc).noVat ? "" : " TTC");
    var bal = balance(doc, documents);
    var due = dueDate(doc);
    var iban = profile.iban ? "Vous pouvez la régler par virement : IBAN " + profile.iban + (profile.bic ? ", BIC " + profile.bic : "") +
      ", en indiquant la référence " + doc.number + "." : "";
    var parts = [], subject;
    if (kind === "reminder") {
      var late = due < today;
      subject = "Facture " + doc.number + (late ? " : rappel de paiement" : " : échéance du " + fmt.date(due));
      parts.push(late
        ? "Sauf erreur de ma part, le règlement de la facture " + doc.number + " du " + fmt.date(doc.date) + ", arrivée à échéance le " +
          fmt.date(due) + ", ne m'est pas encore parvenu. Le montant restant dû est de " + fmt.eur(bal) + "."
        : "Je me permets de vous rappeler que la facture " + doc.number + " du " + fmt.date(doc.date) + ", d'un montant de " + fmt.eur(bal) +
          ", arrive à échéance le " + fmt.date(due) + ".");
      if (iban) parts.push(iban);
      parts.push("Je reste à votre disposition pour toute question.");
    } else if (doc.type === "facture") {
      var st = state(doc, today, documents), credits = documents ? credited(documents, doc) : 0;
      var payable = (parseInt(doc.terms, 10) || 0) > 0 ? "payable au plus tard le " + fmt.date(due) : "payable à réception";
      var first = "Veuillez trouver ci-joint la facture " + doc.number + " du " + fmt.date(doc.date) + ", d'un montant de " + amountText + ".";
      if (st === "cancelled") first += " Elle a été annulée par un avoir.";
      else if (bal <= 0.005) first += " Elle est déjà réglée : merci !";
      else if (bal < total(doc) - 0.005) {
        var nCredits = (documents || []).filter(function (d) { return d.type === "avoir" && d.status !== "draft" && d.originId === doc.id; }).length;
        var already = paidAmount(doc) > 0
          ? (credits > 0 ? "des règlements reçus et des avoirs émis" : "des règlements déjà reçus")
          : (nCredits > 1 ? "des avoirs émis" : "de l'avoir émis");
        first += " Compte tenu " + already + ", le montant restant dû est de " + fmt.eur(bal) + ", " + payable + ".";
      } else first += " Elle est " + payable + ".";
      parts.push(first);
      if (bal > 0.005 && iban) parts.push(iban);
      parts.push("Je reste à votre disposition pour toute question.");
    } else if (doc.type === "devis") {
      var pct = Math.min(100, Math.max(0, Number(doc.depositPct) || 0));
      var until = INV.addDays(doc.date, Math.max(1, parseInt(doc.validity, 10) || 30));
      parts.push("Veuillez trouver ci-joint le devis " + doc.number + " du " + fmt.date(doc.date) + ", d'un montant de " + amountText +
        ", valable jusqu'au " + fmt.date(until) + "." +
        (pct > 0 ? " Un acompte de " + String(pct).replace(".", ",") + " % (" + fmt.eur(round2(total(doc) * pct / 100)) + ") est demandé à la signature." : ""));
      parts.push("Pour l'accepter, il vous suffit de me le retourner daté et signé, avec la mention « " + INV.QUOTE_ACCEPTANCE + " ».");
      parts.push("Je reste à votre disposition pour en parler.");
    } else {
      var origin = doc.originId ? (documents || []).filter(function (d) { return d.id === doc.originId; })[0] : null;
      var ref = origin ? origin.number + " du " + fmt.date(origin.date) : doc.origin && doc.origin.number ? doc.origin.number : "";
      parts.push("Veuillez trouver ci-joint l'avoir " + doc.number + " du " + fmt.date(doc.date) + ", d'un montant de " + amountText +
        (ref ? ", relatif à la facture " + ref : "") + ".");
      var sa = state(doc, today, documents);
      if (sa === "refund") parts.push("La somme de " + fmt.eur(bal) + " vous sera remboursée prochainement.");
      else if (sa === "refunded") {
        var lastPay = (doc.payments || []).map(function (p) { return p.date; }).sort().pop();
        parts.push("La somme de " + fmt.eur(paidAmount(doc)) + " vous a été remboursée le " + fmt.date(lastPay) + ".");
      } else if (origin) {
        var left = balance(origin, documents);
        parts.push(left > 0.005 ? "Il vient en déduction de cette facture : le montant restant dû est désormais de " + fmt.eur(left) + "."
          : "Il vient en déduction de cette facture, qui est ainsi " + (state(origin, today, documents) === "cancelled" ? "annulée." : "soldée."));
      }
      parts.push("Je reste à votre disposition pour toute question.");
    }
    if (kind !== "reminder") subject = TYPE_NAMES[doc.type] + " " + doc.number + (profile.name ? " – " + profile.name : "");
    return { subject: subject, body: "Bonjour,\n\n" + parts.join("\n\n") + "\n\nBien cordialement,\n" + (profile.name || "") };
  }
  var TYPE_NAMES = { facture: "Facture", devis: "Devis", avoir: "Avoir" };

  // ----- Reprise d'un document du générateur public ------------------------------------------

  var nameKey = function (s) { return String(s || "").trim().replace(/\s+/g, " ").toLowerCase(); };
  var PROFILE_FIELDS = ["status", "address", "siret", "vat", "email", "phone", "iban", "bic", "logo"];
  var isISO = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || ""); };
  var str = function (v) { return String(v == null ? "" : v).trim(); };

  /**
   * Brouillon de l'Espace à partir du document du générateur public (objet construit par tools/facture.js).
   * Client : fiche existante du même nom (jamais modifiée), sinon nouvelle fiche. Profil : seuls ses champs vides sont
   * complétés. La TVA suit le profil et la fiche client, comme pour tout brouillon de l'Espace.
   * Renvoie { doc, client, newClient, profilePatch, paid, vatDiffers, continuation } ; rien n'est modifié ici.
   * ids = { doc, client } ; today = date du jour ; now = date-heure ISO.
   */
  function fromGenerator(g, profile, clients, documents, ids, today, now) {
    g = g || {};
    profile = profile || {};
    var gc = g.client || {}, gv = g.vat || {}, gme = g.me || {};
    var type = g.type === "devis" ? "devis" : "facture";
    var name = str(gc.name).replace(/\s+/g, " ");
    var same = (clients || []).filter(function (c) { return name && nameKey(c.name) === nameKey(name); })
      .sort(function (a, b) { return (a.archived ? 1 : 0) - (b.archived ? 1 : 0); });
    var existing = same[0] || null;
    var client = existing || (name ? { id: ids.client, name: name, address: str(gc.address), siren: str(gc.id), vat: str(gc.vat), email: "",
      pro: gc.pro !== false, place: ["fr", "eu", "world"].indexOf(gv.place) > -1 ? gv.place : "fr", delivery: str(gc.delivery), notes: "",
      archived: false, createdAt: now, updatedAt: now } : null);

    var franchise = profile.vatRegime ? profile.vatRegime === "franchise" : !!gv.franchise;
    var place = client && client.pro ? client.place || "fr" : "fr";
    var rate = Number(gv.rate) > 0 ? Number(gv.rate) : profile.vatRate || 20;
    var amount = function (v) { var n = INV.amount(v); return isFinite(n) ? n : NaN; };
    var lines = (g.lines || []).map(function (l) { return { desc: String((l && l.desc) || ""), qty: amount(l && l.qty), price: amount(l && l.price) }; })
      .filter(function (l) { return l.desc.trim() || isFinite(l.price); });
    if (!lines.length) lines = [{ desc: "", qty: 1, price: NaN }];
    var date = isISO(g.date) ? g.date : today;
    var terms = parseInt(g.terms, 10);
    var deposit = Number(g.depositPct);

    var doc = { id: ids.doc, type: type, status: "draft", date: date, serviceDate: type === "facture" && isISO(g.serviceDate) ? g.serviceDate : date,
      terms: terms >= 0 ? terms : profile.terms == null ? 30 : profile.terms,
      validity: parseInt(g.validity, 10) > 0 ? parseInt(g.validity, 10) : 30,
      depositPct: type === "devis" ? (isFinite(deposit) ? Math.min(100, Math.max(0, deposit)) : 30) : 0,
      nature: INV.NATURES[g.nature] ? g.nature : "services", clientId: client ? client.id : "", lines: lines,
      vat: { franchise: franchise, rate: franchise ? profile.vatRate || 20 : rate, place: place, debits: !franchise && place === "fr" && !!gv.debits },
      penalty: str(g.penalty) || profile.penalty || "", notes: String(g.notes || ""), payments: [], createdAt: now, updatedAt: now };

    var patch = {};
    PROFILE_FIELDS.forEach(function (k) { if (!str(profile[k]) && str(gme[k])) patch[k] = k === "logo" ? gme[k] : str(gme[k]); });

    // Seulement pour l'année en cours : le préfixe repris vaut pour les séries suivantes.
    var cont = date.slice(0, 4) === String(today).slice(0, 4) ? continuation(documents || [], type, g.number, date.slice(0, 4)) : null;
    if (cont) {
      var prefixes = profile.prefixes || {}, set = profile.numbering && profile.numbering[type];
      var taken = ["facture", "devis", "avoir"].some(function (t) {
        return t !== type && (prefixes[t] != null ? prefixes[t] : DEFAULT_PREFIXES[t]) === cont.prefix;
      });
      if (taken || (set && String(set.year) === cont.year && (parseInt(set.last, 10) || 0) > cont.last)) cont = null;
    }
    var paid = Number(g.paid);
    return { doc: doc, client: client, newClient: !existing && !!client, profilePatch: patch, paid: paid > 0 ? round2(paid) : 0,
             vatDiffers: !!profile.vatRegime && !!gv.franchise !== franchise, continuation: cont };
  }

  /** Livre des recettes au format CSV (séparateur « ; », virgule décimale, pour Excel en français). */
  function ledgerCSV(rows) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var lines = ["Date;Client;Nature;Montant;Moyen de paiement;Référence"];
    rows.forEach(function (r) {
      lines.push([r.date.split("-").reverse().join("/"), q(r.client), q(r.nature), String(r.amount.toFixed(2)).replace(".", ","), q(r.method), q(r.ref)].join(";"));
    });
    return lines.join("\r\n");
  }

  return { METHODS: METHODS, DEFAULT_PREFIXES: DEFAULT_PREFIXES, PROFILE_FIELDS: PROFILE_FIELDS,
           total: total, paidAmount: paidAmount, credited: credited, balance: balance, dueDate: dueDate,
           series: series, seriesPrefix: seriesPrefix, nextNumber: nextNumber, continuation: continuation,
           checkIssue: checkIssue, issue: issue, state: state, email: email, fromGenerator: fromGenerator,
           checkPayment: checkPayment, ledger: ledger, cashed: cashed, period: period, acreEnd: acreEnd, rates: rates,
           nextDeclaration: nextDeclaration, thresholds: thresholds, clientTotals: clientTotals,
           invoiceFromQuote: invoiceFromQuote, creditFromInvoice: creditFromInvoice, duplicate: duplicate, ledgerCSV: ledgerCSV };
});
