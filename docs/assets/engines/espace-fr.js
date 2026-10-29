/*
 * Moteur : Espace entrepreneur (France). Fonctions pures sur les données de l'Espace (voir documentation/09).
 * Numérotation et émission, statuts, encaissements, livre des recettes, déclaration Urssaf, plafonds ; dépenses,
 * temps passé, prospects et trésorerie (documentation/36 à 39).
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
  // Codes pays ISO 3166-1 alpha-2 (249) et États membres de l'Union européenne (27) ; noms affichés par Intl.DisplayNames.
  var COUNTRIES = ("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
    "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE " +
    "GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP " +
    "KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF " +
    "NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO " +
    "SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW").split(" ");
  var EU_COUNTRIES = "AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK".split(" ");
  /** Pays proposés pour un client de l'UE (hors France) ou hors de l'UE. */
  function countries(place) {
    return COUNTRIES.filter(function (c) { return place === "eu" ? c !== "FR" && EU_COUNTRIES.indexOf(c) > -1 : EU_COUNTRIES.indexOf(c) < 0; });
  }
  var round2 = function (n) { return Math.round(n * 100) / 100; };

  function lastDay(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }
  function iso(y, m, d) { return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }

  // ----- Montants ------------------------------------------------------------

  function total(doc) { return round2(INV.compute(doc).ttc); }
  /** Encaissements en vigueur : ceux marqués supprimés (deletedAt, schéma 2 synchronisé) ne comptent plus. */
  function payments(doc) { return (doc.payments || []).filter(function (p) { return p && !p.deletedAt; }); }
  function paidAmount(doc) {
    return round2(payments(doc).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0));
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
    // Ligne commencée (désignation ou prix saisi, comme dans l'aperçu) : désignation, quantité et prix obligatoires.
    var started = [], incomplete = [];
    (doc.lines || []).forEach(function (l, i) {
      if (!(String(l.desc || "").trim() || isFinite(INV.amount(l.price)))) return;
      started.push(i + 1);
      if (!(String(l.desc || "").trim() && isFinite(INV.amount(l.price)) && isFinite(INV.amount(l.qty)))) incomplete.push(i + 1);
    });
    if (!started.length) errors.push("Ajoutez au moins une ligne avec une désignation, une quantité et un prix.");
    else if (incomplete.length) {
      errors.push((incomplete.length > 1 ? "Complétez les lignes " + incomplete.slice(0, -1).join(", ") + " et " + incomplete[incomplete.length - 1]
        : "Complétez la ligne " + incomplete[0]) + " (désignation, quantité et prix unitaire hors taxes) ou supprimez-" + (incomplete.length > 1 ? "les." : "la."));
    } else if (total(doc) <= 0) errors.push("Le montant total doit être positif.");
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
      payments(doc).forEach(function (p) {
        if ((from && p.date < from) || (to && p.date > to)) return;
        rows.push({ date: p.date, client: who, nature: nature(doc), method: METHODS[p.method] || p.method,
                    amount: doc.type === "avoir" ? -round2(Number(p.amount)) : round2(Number(p.amount)),
                    ref: doc.number, docId: doc.id, note: p.note || "" });
      });
    });
    return rows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ref < b.ref ? -1 : 1); });
  }

  /**
   * Totaux du livre des recettes à la fin de chaque trimestre de l'année (BOFiP, BOI-BIC-DECLA-30-30, § 30 : le livre
   * est totalisé à la fin du trimestre et de l'année). Trimestres commencés à la date du jour, sauf ceux finis avant le
   * début d'activité ; un trimestre qui a des encaissements est toujours compté. open : trimestre en cours.
   */
  function ledgerQuarters(rows, year, today, startDate) {
    var out = [];
    for (var n = 1; n <= 4; n++) {
      var p = period(year + "-T" + n);
      var list = (rows || []).filter(function (r) { return r.date >= p.start && r.date <= p.end; });
      var started = today >= p.start && !(startDate && startDate > p.end);
      if (!list.length && !started) continue;
      out.push({ key: p.key, label: p.label, start: p.start, end: p.end, count: list.length, open: today >= p.start && today <= p.end,
                 total: round2(list.reduce(function (s, r) { return s + r.amount; }, 0)) });
    }
    return out;
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
    // Avoir : la facture d'origine ; devis : la piste (documentation/38-prospects.md), pour qu'un devis revu la suive.
    var extra = doc.type === "avoir" ? ["originId", "origin"] : doc.type === "devis" ? ["prospectId"] : [];
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
        var lastPay = payments(doc).map(function (p) { return p.date; }).sort().pop();
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
  // ----- Dépenses et registre des achats (documentation/36-depenses-et-registre-des-achats.md) ------------

  /** Le registre des achats est obligatoire pour l'activité du profil (règle registre_achats). */
  function purchasesRequired(profile, rule) {
    return !!(profile && rule && (rule.activities || []).indexOf(profile.activity) > -1);
  }

  /**
   * Dépenses de la période, dans l'ordre chronologique (date, puis création) : { rows, total, cash } ; cash : total
   * réglé en espèces, à distinguer dans le registre des achats.
   */
  function expenseRows(expenses, from, to) {
    var rows = (expenses || []).filter(function (e) { return e && e.date && (!from || e.date >= from) && (!to || e.date <= to); })
      .map(function (e) {
        return { id: e.id, date: e.date, supplier: e.supplier || "", label: e.label || "", method: METHODS[e.method] || e.method || "",
                 cash: e.method === "especes", ref: e.ref || "", amount: round2(Number(e.amount) || 0), createdAt: e.createdAt || "" };
      })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : (a.id < b.id ? -1 : 1)); });
    var sum = function (list) { return round2(list.reduce(function (s, r) { return s + r.amount; }, 0)); };
    return { rows: rows, total: sum(rows), cash: sum(rows.filter(function (r) { return r.cash; })) };
  }

  /** Contrôle d'une dépense saisie : messages d'erreur (vide si elle est valable). */
  function checkExpense(e) {
    var errors = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) errors.push("Indiquez la date de la dépense.");
    if (!String(e.supplier || "").trim()) errors.push("Indiquez le fournisseur.");
    if (!(isFinite(e.amount) && Number(e.amount) > 0)) errors.push("Indiquez un montant positif.");
    if (!METHODS[e.method]) errors.push("Choisissez le moyen de paiement.");
    return errors;
  }

  function expensesCSV(rows) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var lines = ["Date;Fournisseur;Nature;Montant;Moyen de paiement;Référence de la pièce"];
    rows.forEach(function (r) {
      lines.push([r.date.split("-").reverse().join("/"), q(r.supplier), q(r.label), String(r.amount.toFixed(2)).replace(".", ","), q(r.method), q(r.ref)].join(";"));
    });
    return lines.join("\r\n");
  }

  // ----- Temps passé (documentation/37-temps-passe.md) -------------------------------------------------------

  var TIME_MAX = { hour: 24, day: 1 };
  var NBSP = "\u00a0";
  var dec = function (n) { return String(round2(n)).replace(".", ","); };
  var frDay = function (d) { return String(d || "").split("-").reverse().join("/"); };
  var hasRate = function (t) { return t.rate !== null && t.rate !== undefined && t.rate !== "" && isFinite(Number(t.rate)); };
  var byDate = function (a, b) {
    return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || "") < (b.createdAt || "") ? -1 : (a.createdAt || "") > (b.createdAt || "") ? 1 : (a.id < b.id ? -1 : 1);
  };

  /** Durée saisie en heures (1,5 ; 1h30 ; 1 h 30 ; 1:30 ; 45 min) ou en jours (1 ; 0,5) ; NaN si illisible. */
  function parseDuration(text, unit) {
    var s = String(text == null ? "" : text).trim().toLowerCase().replace(/\s+/g, " "), m;
    var decimal = function (v) { return round2(Number(v.replace(",", "."))); };
    if (unit === "day") return (m = /^(\d+(?:[.,]\d+)?) ?(?:j|jours?)?$/.exec(s)) ? decimal(m[1]) : NaN;
    if (unit !== "hour") return NaN;
    if ((m = /^(\d+(?:[.,]\d+)?) ?(?:h|heures?)?$/.exec(s))) return decimal(m[1]);
    if ((m = /^(\d+) ?h ?(?:(\d{1,2}) ?(?:min|mn)?)?$/.exec(s)) || (m = /^(\d+):(\d{2})$/.exec(s))) {
      var min = m[2] ? +m[2] : 0;
      return min < 60 ? round2(+m[1] + min / 60) : NaN;
    }
    if ((m = /^(\d+) ?(?:min|mn)$/.exec(s))) return round2(+m[1] / 60);
    return NaN;
  }

  /** Durée lisible : « 1 h 05 », « 45 min », « 3 h » ; « 0,5 jour », « 2 jours ». */
  function durationLabel(quantity, unit) {
    var q = Number(quantity);
    if (!isFinite(q)) return "";
    if (unit === "day") return dec(q) + NBSP + (q >= 2 ? "jours" : "jour");
    var min = Math.round(q * 60), h = Math.floor(min / 60), rest = min % 60;
    if (!h) return rest + NBSP + "min";
    return h + NBSP + "h" + (rest ? NBSP + String(rest).padStart(2, "0") : "");
  }

  /** Erreurs de saisie d'un temps, avec le champ concerné : date, task, unit, duration, clientId, rate. */
  function timeErrors(t) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date || "")) add("date", "Indiquez la date.");
    if (!String(t.task || "").trim()) add("task", "Indiquez la tâche.");
    var q = Number(t.quantity);
    if (!Object.prototype.hasOwnProperty.call(TIME_MAX, t.unit)) add("unit", "Choisissez l'unité : heures ou jours.");
    else if (!(isFinite(q) && q > 0)) add("duration", t.unit === "day" ? "Indiquez la durée en jours : par exemple 1 ou 0,5." : "Indiquez la durée : par exemple 1,5 ou 1h30.");
    else if (q > TIME_MAX[t.unit]) add("duration", (t.unit === "day" ? "Une saisie compte une journée au plus" : "Une saisie compte 24 heures au plus") + " : saisissez chaque jour séparément.");
    if (t.billable !== false && !t.clientId) add("clientId", "Choisissez le client, ou décochez « Facturable » pour un temps interne.");
    if (t.rate !== null && t.rate !== undefined && t.rate !== "" && !(isFinite(Number(t.rate)) && Number(t.rate) >= 0)) add("rate", "Le taux doit être un montant positif.");
    return errors;
  }
  function checkTime(t) { return timeErrors(t).map(function (e) { return e.message; }); }

  /** État calculé d'un temps : internal (non facturable), unbilled (à facturer), draft (dans un brouillon), invoiced. */
  function timeState(t, documents) {
    if (t.billable === false) return "internal";
    var d = t.invoiceId ? (documents || []).filter(function (x) { return x && x.id === t.invoiceId; })[0] : null;
    if (!d) return "unbilled";
    return d.status === "draft" ? "draft" : "invoiced";
  }

  /** Dernier taux saisi pour ce client et cette unité (date, puis ordre de saisie), ou null. */
  function lastRate(entries, clientId, unit) {
    var list = (entries || []).filter(function (t) { return t && clientId && t.clientId === clientId && t.unit === unit && hasRate(t); }).sort(byDate);
    return list.length ? Number(list[list.length - 1].rate) : null;
  }

  /** Lignes de facture : une par tâche (tâche, unité et taux identiques regroupés, avec la période) ou une par saisie. */
  function timeInvoiceLines(entries, mode) {
    var list = (entries || []).filter(Boolean).slice().sort(byDate);
    var price = function (t) { return hasRate(t) ? Number(t.rate) : NaN; };
    if (mode === "entry") {
      return list.map(function (t) { return { desc: String(t.task || "").trim() + " — " + frDay(t.date), qty: round2(t.quantity), unit: t.unit, price: price(t) }; });
    }
    var groups = [], index = {};
    list.forEach(function (t) {
      var key = nameKey(t.task) + "|" + t.unit + "|" + (hasRate(t) ? Number(t.rate) : "");
      if (!index[key]) { index[key] = { task: String(t.task || "").trim(), unit: t.unit, price: price(t), qty: 0, first: t.date, last: t.date }; groups.push(index[key]); }
      var g = index[key];
      g.qty += Number(t.quantity) || 0;
      g.last = t.date;
    });
    return groups.map(function (g) {
      return { desc: g.task + " — " + (g.first === g.last ? frDay(g.first) : "du " + frDay(g.first) + " au " + frDay(g.last)),
               qty: round2(g.qty), unit: g.unit, price: g.price };
    });
  }

  /** Montant HT d'une liste de lignes (comme le moteur de facture : chaque ligne arrondie au centime). */
  var linesAmount = function (lines) {
    return round2(lines.reduce(function (s, l) { return s + (isFinite(l.price) ? round2(l.qty * l.price) : 0); }, 0));
  };

  /** Brouillon de facture à partir de temps : lignes et date de la prestation (dernière saisie reprise). */
  function timeInvoice(entries, mode) {
    var dates = (entries || []).filter(Boolean).map(function (t) { return t.date; }).sort();
    return { lines: timeInvoiceLines(entries, mode), serviceDate: dates[dates.length - 1] || "" };
  }

  /** Temps d'une période (le plus récent en haut) et totaux : heures, jours, part facturable, montant facturable. */
  function timeSummary(entries, documents, from, to) {
    var rows = (entries || []).filter(function (t) { return t && t.date && (!from || t.date >= from) && (!to || t.date <= to); })
      .sort(byDate).reverse().map(function (t) {
        return { id: t.id, date: t.date, clientId: t.clientId || "", task: t.task || "", unit: t.unit, quantity: round2(t.quantity),
                 rate: hasRate(t) ? Number(t.rate) : null, amount: hasRate(t) && t.billable !== false ? round2(t.quantity * t.rate) : null,
                 billable: t.billable !== false, state: timeState(t, documents) };
      });
    var sum = function (list, unit) { return round2(list.reduce(function (s, r) { return s + (r.unit === unit ? r.quantity : 0); }, 0)); };
    var billable = rows.filter(function (r) { return r.billable; });
    return { rows: rows, hours: sum(rows, "hour"), days: sum(rows, "day"),
             billable: { hours: sum(billable, "hour"), days: sum(billable, "day"),
                         amount: round2(billable.reduce(function (s, r) { return s + (r.amount || 0); }, 0)),
                         missingRate: billable.filter(function (r) { return r.rate === null; }).length } };
  }

  /** Temps à facturer, par client : saisies (les plus anciennes d'abord), heures, jours, montant de la facture par tâche. */
  function unbilledByClient(entries, documents) {
    var out = [], index = {};
    (entries || []).filter(function (t) { return t && t.clientId && timeState(t, documents) === "unbilled"; }).sort(byDate).forEach(function (t) {
      if (!index[t.clientId]) { index[t.clientId] = { clientId: t.clientId, entries: [] }; out.push(index[t.clientId]); }
      index[t.clientId].entries.push(t);
    });
    return out.map(function (c) {
      var s = timeSummary(c.entries, documents);
      return { clientId: c.clientId, entries: c.entries, hours: s.hours, days: s.days,
               amount: linesAmount(timeInvoiceLines(c.entries, "task")), missingRate: s.billable.missingRate };
    });
  }

  function timeCSV(rows, clientName) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var lines = ["Date;Client;Tâche;Durée;Unité;Taux HT;Montant HT;Facturable"];
    rows.forEach(function (r) {
      lines.push([frDay(r.date), q(clientName(r.clientId)), q(r.task), dec(r.quantity), r.unit === "day" ? "jour" : "heure",
                  r.rate === null ? "" : r.rate.toFixed(2).replace(".", ","), r.amount === null ? "" : r.amount.toFixed(2).replace(".", ","),
                  r.billable ? "oui" : "non"].join(";"));
    });
    return lines.join("\r\n");
  }

  // ----- Prospects (documentation/38-prospects.md) ------------------------------------------------------------

  var STAGE_LABELS = { new: "À contacter", talks: "En discussion", quote: "Devis envoyé", won: "Gagné", lost: "Perdu" };
  var STAGE_RANK = { new: 0, talks: 1, quote: 2, won: 3 };
  var OPEN_STAGES = ["new", "talks", "quote"];
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var isDay = function (d) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
    return !!m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= lastDay(+m[1], +m[2]);
  };
  var blank = function (v) { return v === null || v === undefined || v === ""; };

  /** Erreurs de saisie d'une fiche, avec le champ concerné : name, email, value, nextDate, stage. */
  function prospectErrors(p) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!String(p.name || "").trim()) add("name", "Indiquez le nom du prospect : entreprise ou personne.");
    if (String(p.email || "").trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(p.email).trim())) add("email", "L'email n'est pas valide.");
    if (!blank(p.value) && !(isFinite(Number(p.value)) && Number(p.value) >= 0)) add("value", "La valeur estimée doit être un montant positif, en euros.");
    if (!blank(p.nextDate) && !isDay(p.nextDate)) add("nextDate", "La date de relance n'est pas valide.");
    if (!has(STAGE_LABELS, p.stage)) add("stage", "Choisissez une étape.");
    return errors;
  }

  /** Erreurs d'un échange noté : date (aujourd'hui au plus), sens (me ou them), résumé. */
  function exchangeErrors(x, today) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!isDay(x.date)) add("date", "Indiquez la date de l'échange.");
    else if (x.date > today) add("date", "Un échange ne peut pas être daté dans le futur.");
    if (x.from !== "me" && x.from !== "them") add("from", "Indiquez qui a pris contact.");
    if (!String(x.text || "").trim()) add("text", "Résumez l'échange en quelques mots.");
    return errors;
  }

  /** Devis faits depuis une piste (brouillons compris), les plus anciens d'abord. */
  function prospectQuotes(p, documents) {
    return (documents || []).filter(function (d) { return d && d.type === "devis" && d.prospectId && d.prospectId === p.id; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.issuedAt || "") < String(b.issuedAt || "") ? -1 : 1; });
  }

  /** Étape que les devis et les échanges imposent, sans tenir compte du choix de l'utilisateur. */
  function minStage(p, documents) {
    var quotes = prospectQuotes(p, documents).filter(function (d) { return d.status !== "draft"; });
    if (quotes.some(function (d) { return d.status === "accepted" || d.invoiceId; })) return "won";
    if (quotes.length) return "quote";
    return (p.exchanges || []).some(function (x) { return x && !x.deletedAt; }) ? "talks" : "new";
  }

  /** Étape affichée : « Perdu » choisi reste ; sinon la plus avancée du choix et de minStage (« Gagné » choisi l'est déjà). */
  function prospectStage(p, documents) {
    if (p.stage === "lost") return "lost";
    var auto = minStage(p, documents), chosen = has(STAGE_RANK, p.stage) ? p.stage : "new";
    return STAGE_RANK[auto] > STAGE_RANK[chosen] ? auto : chosen;
  }

  /** Valeur : montant HT du dernier devis émis, sinon le montant estimé (ou null). */
  function prospectValue(p, documents) {
    var quotes = prospectQuotes(p, documents).filter(function (d) { return d.status !== "draft"; });
    if (quotes.length) return INV.compute(quotes[quotes.length - 1]).ht; // déjà arrondi au centime
    return blank(p.value) || !isFinite(Number(p.value)) ? null : round2(Number(p.value));
  }

  /** Nombre et valeur des pistes par étape, et des pistes ouvertes. */
  function pipeline(prospects, documents) {
    var out = { open: { count: 0, value: 0 } };
    Object.keys(STAGE_LABELS).forEach(function (k) { out[k] = { count: 0, value: 0 }; });
    (prospects || []).forEach(function (p) {
      var s = prospectStage(p, documents), v = prospectValue(p, documents) || 0;
      out[s].count++;
      out[s].value = round2(out[s].value + v);
      if (OPEN_STAGES.indexOf(s) > -1) { out.open.count++; out.open.value = round2(out.open.value + v); }
    });
    return out;
  }

  /** Pistes ouvertes dont la relance est due (aujourd'hui ou avant), la plus ancienne d'abord, puis par nom. */
  function followUps(prospects, documents, today) {
    return (prospects || []).filter(function (p) {
      return p.nextDate && p.nextDate <= today && OPEN_STAGES.indexOf(prospectStage(p, documents)) > -1;
    }).sort(function (a, b) {
      return a.nextDate < b.nextDate ? -1 : a.nextDate > b.nextDate ? 1 : String(a.name || "").localeCompare(String(b.name || ""), "fr");
    });
  }

  /** Date du dernier échange de sa part (le plus récent), ou "". */
  function lastContactFrom(p) {
    return (p.exchanges || []).reduce(function (last, x) {
      return x && !x.deletedAt && x.from === "them" && isDay(x.date) && x.date > last ? x.date : last;
    }, "");
  }

  /** Même jour n années plus tard ; un 29 février donne le 28 février d'une année non bissextile. */
  function addYears(date, n) {
    var y = +date.slice(0, 4) + n, m = +date.slice(5, 7), d = Math.min(+date.slice(8, 10), lastDay(y, m));
    return iso(y, m, d);
  }

  /**
   * Pistes non gagnées dont la durée de conservation est atteinte (CNIL : years ans après la collecte ou le dernier
   * contact émanant du prospect) : { prospect, since, due }.
   */
  function retentionDue(prospects, documents, today, years) {
    var out = [];
    (prospects || []).forEach(function (p) {
      if (prospectStage(p, documents) === "won") return;
      var since = lastContactFrom(p) || String(p.createdAt || "").slice(0, 10);
      if (!isDay(since)) return;
      var due = addYears(since, years);
      if (due <= today) out.push({ prospect: p, since: since, due: due });
    });
    return out;
  }

  /** Textes normalisés à hacher pour la liste d'opposition : "e:" email, "t:" téléphone, "n:" nom. */
  function optoutKeys(p) {
    var keys = [], email = String(p.email || "").trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+$/.test(email)) keys.push("e:" + email);
    var raw = String(p.phone || "").trim(), digits = raw.replace(/\(0\)/g, "").replace(/\D/g, ""), phone = "";
    if (digits.length >= 6) {
      var intl = raw.charAt(0) === "+" ? digits : digits.slice(0, 2) === "00" ? digits.slice(2) : null;
      phone = intl === null ? digits : intl.slice(0, 2) === "33" ? "0" + intl.slice(2) : "+" + intl;
      keys.push("t:" + phone);
    }
    var name = String(p.name || "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
    if (name) keys.push("n:" + name);
    return keys;
  }

  function prospectsCSV(prospects, documents) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var lines = ["Nom;Interlocuteur;Type;Email;Téléphone;Origine;Étape;Valeur HT;Prochaine relance;Prochaine action;Dernier contact de sa part;Créé le"];
    (prospects || []).forEach(function (p) {
      var v = prospectValue(p, documents);
      lines.push([q(p.name), q(p.contact), p.pro === false ? "Particulier" : "Professionnel", q(p.email), q(p.phone), q(p.source),
                  STAGE_LABELS[prospectStage(p, documents)], v === null ? "" : v.toFixed(2).replace(".", ","), frDay(p.nextDate), q(p.nextAction),
                  frDay(lastContactFrom(p)), frDay(String(p.createdAt || "").slice(0, 10))].join(";"));
    });
    return lines.join("\r\n");
  }

  // ----- Trésorerie (documentation/39-tresorerie.md) ----------------------------------------------------------

  var EVERY = { month: 1, quarter: 3, year: 12 };
  var CHARGE_LABELS = { month: "Chaque mois", quarter: "Chaque trimestre", year: "Chaque année" };
  /** Même jour n mois plus tard ; un jour qui n'existe pas devient le dernier jour du mois. */
  function addMonths(date, n) {
    var m = +date.slice(5, 7) - 1 + n, y = +date.slice(0, 4) + Math.floor(m / 12);
    m = ((m % 12) + 12) % 12 + 1;
    return iso(y, m, Math.min(+date.slice(8, 10), lastDay(y, m)));
  }
  var monthStart = function (d) { return d.slice(0, 8) + "01"; };
  var monthEnd = function (d) { return iso(+d.slice(0, 4), +d.slice(5, 7), lastDay(+d.slice(0, 4), +d.slice(5, 7))); };

  /** Échéances d'une charge régulière comprises entre from et to (bornes comprises). */
  function chargeDates(c, from, to) {
    var step = has(EVERY, c.every) ? EVERY[c.every] : 0, out = [];
    if (!step || !isDay(c.start)) return out;
    // Saute directement près de from (charge ancienne) sans dériver : chaque date part de la première échéance.
    var skip = Math.max(0, Math.floor(((+from.slice(0, 4) - +c.start.slice(0, 4)) * 12 + (+from.slice(5, 7) - +c.start.slice(5, 7))) / step) - 1);
    for (var i = skip; ; i++) {
      var d = addMonths(c.start, i * step);
      if (d > to || (c.end && d > c.end)) break;
      if (d >= from) out.push(d);
    }
    return out;
  }

  /** Erreurs de saisie d'une charge régulière : label, amount, every, start, end. */
  function chargeErrors(c) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!String(c.label || "").trim()) add("label", "Indiquez la charge : loyer, logiciel, assurance…");
    if (!(isFinite(Number(c.amount)) && Number(c.amount) > 0)) add("amount", "Indiquez un montant positif, en euros.");
    if (!has(EVERY, c.every)) add("every", "Choisissez la fréquence.");
    if (!isDay(c.start)) add("start", "Indiquez la date de la prochaine échéance.");
    else if (!blank(c.end) && (!isDay(c.end) || c.end < c.start)) add("end", "La dernière échéance doit être une date après la première.");
    return errors;
  }

  /** Factures émises non soldées, à leur échéance (en retard : aujourd'hui) ; avoirs à rembourser (sortie aujourd'hui). */
  function expectedReceipts(documents, today) {
    var out = [];
    (documents || []).forEach(function (d) {
      if (!d || d.status === "draft" || (d.type !== "facture" && d.type !== "avoir")) return;
      var st = state(d, today, documents);
      if (d.type === "facture" && (st === "unpaid" || st === "overdue" || st === "partial")) {
        var due = dueDate(d);
        out.push({ doc: d, amount: balance(d, documents), date: due < today ? today : due, late: due < today });
      } else if (d.type === "avoir" && st === "refund") {
        out.push({ doc: d, amount: -balance(d, documents), date: today, late: false });
      }
    });
    return out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : order(a.doc) < order(b.doc) ? -1 : 1; });
  }

  /** Part de TVA d'un montant encaissé sur ce document (TVA / TTC) ; 0 en franchise ou sans TVA française. */
  function vatPart(doc) {
    var c = INV.compute(doc);
    return c.ttc > 0 ? c.vat / c.ttc : 0;
  }
  /** TVA exigible à l'encaissement (prestations de services sans option pour les débits), sinon à la date de la facture. */
  var onCash = function (doc) { return doc.nature === "services" && !(doc.vat && doc.vat.debits); };

  /** TVA collectée exigible entre from et to : encaissements des services, factures de biens, mixtes ou au débit ; avoirs déduits. */
  function vatExigible(documents, from, to) {
    var sum = 0;
    (documents || []).forEach(function (d) {
      if (!d || d.status === "draft" || (d.type !== "facture" && d.type !== "avoir")) return;
      var sign = d.type === "avoir" ? -1 : 1;
      if (onCash(d)) {
        var part = vatPart(d);
        payments(d).forEach(function (p) { if (p.date >= from && p.date <= to) sum += sign * Number(p.amount) * part; });
      } else if (d.date >= from && d.date <= to) {
        sum += sign * INV.compute(d).vat;
      }
    });
    return round2(sum);
  }

  /** Déclarations Urssaf du profil (périodicité), avec leur période, dans l'ordre des dates limites. */
  function declarations(profile, events) {
    var periodicity = profile.periodicity === "monthly" ? "monthly" : "quarterly";
    return (events || []).filter(function (e) {
      return e.period && e.when && e.when.periodicity && e.when.periodicity.indexOf(periodicity) > -1;
    }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (e) { return { due: e.date, period: period(e.period) }; });
  }
  /** Taux total d'une période (cotisations, formation professionnelle, versement libératoire) ; null hors micro-entreprise. */
  function totalRate(profile, rules, end) {
    var r = rates(profile, rules, end);
    return r ? r.social + r.cfp + r.vl : null;
  }
  var vatEvents = function (events, regime) {
    return (events || []).filter(function (e) { return e.when && e.when.vat && e.when.vat.indexOf(regime) > -1; });
  };
  /** Acomptes du réel simplifié : juillet 55 %, décembre 40 % de la TVA due l'année précédente ; aucun sous 1 000 €. */
  var ADVANCES = { "07": 0.55, "12": 0.40 };
  var advanceAmount = function (month, vatLastYear) {
    return has(ADVANCES, month) && Number(vatLastYear) >= 1000 ? round2(Number(vatLastYear) * ADVANCES[month]) : 0;
  };

  /**
   * Déjà dû à la date du jour : cotisations sur l'encaissé des périodes dont la date limite n'est pas passée ; TVA
   * exigible non encore déclarée (réel normal) ou depuis le 1er janvier moins les acomptes échus (réel simplifié).
   */
  function owed(input) {
    var p = input.profile || {}, today = input.today, docs = input.documents || [];
    var urssaf = { total: 0, periods: [], computed: false };
    if (totalRate(p, input.rules, today) !== null) {
      urssaf.computed = true;
      declarations(p, input.events).forEach(function (d) {
        if (d.due < today || d.period.start > today) return;
        var cash = cashed(docs, d.period.start, d.period.end);
        var amount = round2(cash * totalRate(p, input.rules, d.period.end));
        urssaf.periods.push({ period: d.period, due: d.due, cashed: cash, amount: amount });
        urssaf.total = round2(urssaf.total + amount);
      });
    }
    var vat = { total: 0, regime: p.vatRegime || "franchise", advances: 0, advancesUnknown: false, previousYearDue: null };
    if (p.vatRegime === "normal") {
      // Mois dont la déclaration (CA3, le mois suivant) n'est pas encore passée : le mois en cours et peut-être le précédent.
      var prev = addMonths(monthStart(today), -1);
      var ca3 = vatEvents(input.events, "normal").filter(function (e) { return e.date.slice(0, 7) === today.slice(0, 7); })[0];
      var from = ca3 && ca3.date < today ? monthStart(today) : prev;
      vat.total = vatExigible(docs, from, today);
    } else if (p.vatRegime === "simplified") {
      var year = today.slice(0, 4), collected = vatExigible(docs, year + "-01-01", today);
      if (blank(p.vatLastYear) || !isFinite(Number(p.vatLastYear))) vat.advancesUnknown = true;
      else {
        Object.keys(ADVANCES).forEach(function (m) {
          if (today > monthEnd(year + "-" + m + "-01")) vat.advances = round2(vat.advances + advanceAmount(m, p.vatLastYear));
        });
      }
      vat.total = round2(Math.max(0, collected - vat.advances));
      // Solde de l'année précédente, payé avec la déclaration annuelle (CA12) de mai : signalé, non estimé.
      var ca12 = vatEvents(input.events, "simplified").filter(function (e) { return /CA12/.test(e.title || "") && e.date.slice(0, 4) === year; })[0];
      var ca12Date = ca12 ? ca12.date : year + "-05-01";
      vat.previousYearDue = today <= ca12Date ? ca12Date : null;
    }
    return { urssaf: urssaf, vat: vat, total: round2(urssaf.total + vat.total) };
  }

  /**
   * Prévision sur input.months mois (mois en cours compris) : encaissements attendus, cotisations et TVA aux dates du
   * calendrier, charges régulières ; solde de fin de chaque mois à partir du solde saisi (profile.cashBalance).
   */
  function forecast(input) {
    var p = input.profile || {}, today = input.today, docs = input.documents || [], n = input.months || 6;
    var until = monthEnd(addMonths(monthStart(today), n - 1)), items = [];
    var receipts = expectedReceipts(docs, today).filter(function (r) { return r.date <= until; });
    receipts.forEach(function (r) {
      var who = (r.doc.snapshot && r.doc.snapshot.client && r.doc.snapshot.client.name) || "";
      items.push({ date: r.date, kind: r.amount < 0 ? "refund" : "receipt", amount: r.amount, late: r.late, docId: r.doc.id,
                   label: (r.doc.type === "avoir" ? "Remboursement de l'avoir " : "Facture ") + r.doc.number + (who ? " (" + who + ")" : "") });
    });
    // Cotisations : encaissé de la période + encaissements attendus dans la période, à la date limite.
    if (totalRate(p, input.rules, today) !== null) {
      declarations(p, input.events).forEach(function (d) {
        if (d.due < today || d.due > until) return;
        var expected = receipts.filter(function (r) { return r.date >= d.period.start && r.date <= d.period.end; })
          .reduce(function (s, r) { return s + r.amount; }, 0);
        var amount = round2((cashed(docs, d.period.start, d.period.end) + expected) * totalRate(p, input.rules, d.period.end));
        if (amount) items.push({ date: d.due, kind: "urssaf", amount: -amount, label: "Cotisations Urssaf " + (d.period.key.indexOf("T") > -1 ? "du " : "de ") + d.period.label });
      });
    }
    // TVA : réel normal, TVA du mois (exigible + attendue à l'encaissement) au calendrier du mois suivant ; réel simplifié, acomptes.
    if (p.vatRegime === "normal") {
      vatEvents(input.events, "normal").forEach(function (e) {
        if (e.date < today || e.date > until) return;
        var m = addMonths(monthStart(e.date), -1), end = monthEnd(m);
        var expected = receipts.filter(function (r) { return r.date >= m && r.date <= end && onCash(r.doc); })
          .reduce(function (s, r) { return s + r.amount * vatPart(r.doc); }, 0); // un remboursement d'avoir est déjà négatif
        var amount = round2(vatExigible(docs, m, end) + expected);
        if (amount > 0) items.push({ date: e.date, kind: "vat", amount: -amount, label: e.title.replace(/^Déclaration de /, "") });
      });
    } else if (p.vatRegime === "simplified" && !blank(p.vatLastYear)) {
      vatEvents(input.events, "simplified").forEach(function (e) {
        if (e.date < today || e.date > until) return;
        var amount = advanceAmount(e.date.slice(5, 7), p.vatLastYear); // 0 hors juillet et décembre (déclaration CA12 de mai)
        if (amount) items.push({ date: e.date, kind: "vat", amount: -amount, label: e.title });
      });
    }
    (input.charges || []).forEach(function (c) {
      chargeDates(c, today, until).forEach(function (d) {
        items.push({ date: d, kind: "charge", amount: -round2(Number(c.amount)), label: c.label, chargeId: c.id });
      });
    });
    items.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var start = blank(p.cashBalance) || !isFinite(Number(p.cashBalance)) ? null : round2(Number(p.cashBalance));
    var bal = start, months = [], negative = null;
    for (var i = 0; i < n; i++) {
      var ms = addMonths(monthStart(today), i), me = monthEnd(ms);
      var list = items.filter(function (x) { return x.date >= ms && x.date <= me; });
      var inflow = round2(list.reduce(function (s, x) { return s + (x.amount > 0 ? x.amount : 0); }, 0));
      var outflow = round2(list.reduce(function (s, x) { return s - (x.amount < 0 ? x.amount : 0); }, 0));
      if (bal !== null) bal = round2(bal + inflow - outflow);
      if (bal !== null && bal < 0 && negative === null) negative = ms.slice(0, 7);
      months.push({ key: ms.slice(0, 7), label: period(ms.slice(0, 7)).label, start: ms, end: me, items: list, in: inflow, out: outflow, balance: bal });
    }
    var lastEvent = (input.events || []).reduce(function (m, e) { return e.date > m ? e.date : m; }, "");
    return { start: start, until: until, items: items, months: months, negative: negative, calendarShort: lastEvent < until };
  }

  function ledgerCSV(rows) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var lines = ["Date;Client;Nature;Montant;Moyen de paiement;Référence"];
    rows.forEach(function (r) {
      lines.push([r.date.split("-").reverse().join("/"), q(r.client), q(r.nature), String(r.amount.toFixed(2)).replace(".", ","), q(r.method), q(r.ref)].join(";"));
    });
    return lines.join("\r\n");
  }

  return { METHODS: METHODS, DEFAULT_PREFIXES: DEFAULT_PREFIXES, PROFILE_FIELDS: PROFILE_FIELDS, COUNTRIES: COUNTRIES,
           EU_COUNTRIES: EU_COUNTRIES, countries: countries,
           total: total, payments: payments, paidAmount: paidAmount, credited: credited, balance: balance, dueDate: dueDate,
           series: series, seriesPrefix: seriesPrefix, nextNumber: nextNumber, continuation: continuation,
           checkIssue: checkIssue, issue: issue, state: state, email: email, fromGenerator: fromGenerator,
           checkPayment: checkPayment, ledger: ledger, ledgerQuarters: ledgerQuarters, cashed: cashed, period: period, acreEnd: acreEnd, rates: rates,
           nextDeclaration: nextDeclaration, thresholds: thresholds, clientTotals: clientTotals,
           invoiceFromQuote: invoiceFromQuote, creditFromInvoice: creditFromInvoice, duplicate: duplicate, ledgerCSV: ledgerCSV,
           purchasesRequired: purchasesRequired, expenseRows: expenseRows, checkExpense: checkExpense, expensesCSV: expensesCSV,
           parseDuration: parseDuration, durationLabel: durationLabel, checkTime: checkTime, timeErrors: timeErrors, timeState: timeState, lastRate: lastRate,
           timeInvoiceLines: timeInvoiceLines, timeInvoice: timeInvoice, timeSummary: timeSummary, unbilledByClient: unbilledByClient,
           timeCSV: timeCSV,
           STAGE_LABELS: STAGE_LABELS, OPEN_STAGES: OPEN_STAGES, prospectErrors: prospectErrors, exchangeErrors: exchangeErrors, prospectQuotes: prospectQuotes,
           minStage: minStage, prospectStage: prospectStage, prospectValue: prospectValue, pipeline: pipeline, followUps: followUps,
           lastContactFrom: lastContactFrom, addYears: addYears, retentionDue: retentionDue, optoutKeys: optoutKeys, prospectsCSV: prospectsCSV,
           CHARGE_LABELS: CHARGE_LABELS, chargeDates: chargeDates, chargeErrors: chargeErrors, expectedReceipts: expectedReceipts, vatPart: vatPart,
           vatExigible: vatExigible, owed: owed, forecast: forecast };
});
