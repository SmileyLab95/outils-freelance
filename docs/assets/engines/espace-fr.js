/*
 * Moteur : Espace entrepreneur (France). Fonctions pures sur les données de l'Espace (voir documentation/09).
 * Numérotation et émission, statuts, encaissements, livre des recettes, déclaration Urssaf, plafonds ; dépenses,
 * temps passé, prospects et trésorerie (documentation/36 à 39).
 * Les montants des documents viennent du moteur de facture commun (OFE.invoiceFR).
 */
(function (root, factory) {
  // Textes du moteur (documentation/60, § 3.1, décision D88) : dictionnaire de la langue de la section, chargé avant le
  // moteur dans la page (tools/espace-texts-<langue>.js) ; le français dans Node (tests, scripts).
  var dicts = root.OF_ESPACE_TEXTS || require("../tools/espace-texts-fr.js").OF_ESPACE_TEXTS;
  var locale = (root.OF && root.OF.locale) || "fr";
  var texts = Object.assign({}, dicts.fr, dicts[locale.slice(0, 2)], dicts[locale]);
  var api = factory(root.OFE ? root.OFE.invoiceFR : require("./invoice-fr.js"), texts);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.OFE = root.OFE || {}).espaceFR = api;
})(typeof self !== "undefined" ? self : this, function (INV, TX) {
  "use strict";
  /** Texte de la clé, avec les valeurs { nom: valeur } à la place des « {nom} » (même règle que tools/espace.js). */
  function L(key, vars) {
    var text = TX[key];
    if (text === undefined) { if (typeof console !== "undefined") console.error("Espace : texte manquant « " + key + " »"); return key; }
    return vars ? text.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : text;
  }

  /** « 1, 2 et 3 » : liste de numéros dans la langue de la section. */
  function listText(items) { return items.length > 1 ? items.slice(0, -1).join(", ") + L("eng.listAnd") + items[items.length - 1] : String(items[0]); }
  var MONTHS = L("eng.months").split("|");
  /** Libellés traduits des clés : { clé: L(préfixe + clé) } (l'ordre des clés est celui de la liste). */
  var labels = function (prefix, keys) { var o = {}; keys.forEach(function (k) { o[k] = L(prefix + k); }); return o; };
  /** Catégories facultatives des dépenses (documentation/55, § 3) : liste fermée ; une dépense sans catégorie est « non classée ». */
  var EXPENSE_CATEGORIES = labels("eng.expenseCategory.", ["logiciels", "materiel", "deplacements", "locaux", "telecom", "formation",
    "soustraitance", "marchandises", "assurances", "banque", "autres"]);
  var METHODS = labels("eng.method.", ["virement", "carte", "cheque", "especes", "prelevement", "autre"]);
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
  function checkIssue(documents, doc, client, opts) {
    var errors = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.date || "")) errors.push(L("eng.issue.date"));
    if (!client || !String(client.name || "").trim()) errors.push(L("eng.issue.client"));
    // Ligne commencée (désignation ou prix saisi, comme dans l'aperçu) : désignation, quantité et prix obligatoires.
    var started = [], incomplete = [];
    (doc.lines || []).forEach(function (l, i) {
      if (!(String(l.desc || "").trim() || isFinite(INV.amount(l.price)))) return;
      started.push(i + 1);
      if (!(String(l.desc || "").trim() && isFinite(INV.amount(l.price)) && isFinite(INV.amount(l.qty)))) incomplete.push(i + 1);
    });
    if (!started.length) errors.push(L("eng.issue.noLine"));
    else if (incomplete.length) {
      errors.push(incomplete.length > 1 ? L("eng.issue.incompleteMany", { lines: listText(incomplete) }) : L("eng.issue.incompleteOne", { line: incomplete[0] }));
    } else if (total(doc) <= 0) errors.push(L("eng.issue.positive"));
    else if (opts && opts.lineKinds && doc.nature === "mixte") {
      // Activité mixte : ventes et prestations distinctes sur la facture (BOFiP, BOI-BIC-DECLA-30-30, § 30).
      var unknown = started.filter(function (n) { return !has(INV.LINE_KINDS, doc.lines[n - 1].kind); });
      if (unknown.length) {
        errors.push(unknown.length > 1 ? L("eng.issue.kindMany", { lines: listText(unknown) }) : L("eng.issue.kindOne", { line: unknown[0] }));
      }
    }
    else if (doc.type === "avoir" && doc.originId) {
      var origin = documents.filter(function (d) { return d.id === doc.originId; })[0];
      if (origin && total(doc) > total(origin) - credited(documents, origin) + 0.005) {
        errors.push(L("eng.issue.creditOver", { number: origin.number,
          amount: String((total(origin) - credited(documents, origin)).toFixed(2)).replace(".", ",") }));
      }
    }
    var last = series(documents, doc.type, String(doc.date).slice(0, 4))[0];
    if (last && doc.date < last.date) {
      errors.push(L("eng.issue.chronology", { number: last.number, date: last.date.split("-").reverse().join("/") }));
    }
    return errors;
  }

  /** Émission : numéro, statut, coordonnées figées. Renvoie un nouveau document (l'original n'est pas modifié). */
  function issue(documents, doc, me, client, prefixes, now, numbering, opts) {
    var errors = checkIssue(documents, doc, client, opts);
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.date || "")) errors.push(L("eng.pay.date"));
    if (!isFinite(amount) || amount <= 0) errors.push(L("eng.pay.positive"));
    else if (amount > balance(doc, documents) + 0.005) errors.push(doc.type === "avoir" ? L("eng.pay.overRefund") : L("eng.pay.overReceipt"));
    if (!METHODS[payment.method]) errors.push(L("eng.pay.method"));
    return errors;
  }

  // ----- Livre des recettes et encaissements ---------------------------------

  function nature(doc) {
    var line = (doc.lines || []).filter(function (l) { return String(l.desc || "").trim(); })[0];
    var n = line ? String(line.desc).trim() : INV.NATURES[doc.nature] || INV.NATURES.services;
    var more = (doc.lines || []).filter(function (l) { return String(l.desc || "").trim(); }).length - 1;
    return more > 0 ? n + " (+ " + more + ")" : n;
  }

  // ----- Activité mixte (documentation/53-activite-mixte.md) ----------------------------------------------

  /** Activités d'un profil en activité mixte : la vente et une activité de services ; null sinon. */
  function mixedActivities(profile, rules) {
    var a = profile && profile.activity, b = profile && profile.activity2, list = rules && rules.micro_activities;
    if (!list || !a || !b || a === b || !has(list, a) || !has(list, b)) return null;
    if (a === "vente") return { vente: a, services: b };
    if (b === "vente") return { vente: b, services: a };
    return null;
  }

  /**
   * Part HT des ventes d'un document : 1 (biens), 0 (services), part des lignes « biens » dans le total HT d'un document
   * mixte (une ligne sans nature compte avec les prestations, au taux de cotisations le plus élevé).
   */
  function goodsShare(doc) {
    if (doc.nature === "biens") return 1;
    if (doc.nature !== "mixte") return 0;
    var t = INV.compute(doc);
    return t.ht > 0 ? Math.min(1, t.split.goods / t.ht) : 0;
  }

  /** Part des ventes d'un montant encaissé ou remboursé (arrondie au centime ; le reste va aux prestations). */
  function goodsPart(doc, amount) { return round2(amount * goodsShare(doc)); }

  /**
   * Encaissements (factures) et remboursements (avoirs, en négatif), par date, entre deux dates incluses. Profil en
   * activité mixte (profile et rules donnés) : chaque ligne porte aussi sa part de ventes (goods) et de prestations.
   */
  function ledger(documents, from, to, profile, rules) {
    var rows = [], split = !!mixedActivities(profile, rules);
    documents.forEach(function (doc) {
      if (doc.status === "draft" || (doc.type !== "facture" && doc.type !== "avoir")) return;
      var who = (doc.snapshot && doc.snapshot.client && doc.snapshot.client.name) || "";
      payments(doc).forEach(function (p) {
        if ((from && p.date < from) || (to && p.date > to)) return;
        var row = { date: p.date, client: who, nature: nature(doc), method: METHODS[p.method] || p.method,
                    amount: doc.type === "avoir" ? -round2(Number(p.amount)) : round2(Number(p.amount)),
                    ref: doc.number, docId: doc.id, note: p.note || "" };
        if (split) { row.goods = goodsPart(doc, row.amount); row.services = round2(row.amount - row.goods); }
        rows.push(row);
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
      var q = { key: p.key, label: p.label, start: p.start, end: p.end, count: list.length, open: today >= p.start && today <= p.end,
                total: round2(list.reduce(function (s, r) { return s + r.amount; }, 0)) };
      if ((rows || []).some(function (r) { return r.goods !== undefined; })) {
        q.goods = round2(list.reduce(function (s, r) { return s + (r.goods || 0); }, 0));
        q.services = round2(q.total - q.goods);
      }
      out.push(q);
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
      return { key: key, start: iso(y, mo, 1), end: iso(y, mo, lastDay(y, mo)), label: L("eng.period.month", { month: MONTHS[mo - 1], year: y }) };
    }
    if (q) {
      var yq = +q[1], n = +q[2], first = 3 * n - 2;
      return { key: key, start: iso(yq, first, 1), end: iso(yq, first + 2, lastDay(yq, first + 2)),
               label: n === 1 ? L("eng.period.quarterFirst", { n: n, year: yq }) : L("eng.period.quarter", { n: n, year: yq }) };
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

  /**
   * Taux de cotisations d'une période (ACRE si la période se termine avant la fin de l'ACRE), pour l'activité du profil
   * ou pour l'activité donnée. Activité mixte : formation professionnelle au plus élevé des taux des deux activités
   * (aucune règle publiée pour l'activité mixte : lecture la plus prudente, documentation/53).
   */
  function rates(profile, rules, periodEnd, activity) {
    var a = rules.micro_activities[activity || profile.activity];
    if (!a) return null;
    var acre = Number(profile.acre) || 0;
    var inAcre = acre && periodEnd <= acreEnd(profile.startDate);
    var m = mixedActivities(profile, rules);
    var cfp = m ? Math.max(rules.micro_activities[m.vente].cfp, rules.micro_activities[m.services].cfp) : a.cfp;
    return { social: inAcre ? a["acre_" + acre] : a.cotisations, cfp: cfp, vl: profile.vl ? a.versement_liberatoire : 0, acre: !!inAcre };
  }

  /** Chiffre d'affaires encaissé d'une période, par activité du profil : [{ activity, kind, revenue }]. */
  function revenueParts(documents, profile, rules, from, to) {
    var m = mixedActivities(profile, rules);
    if (!m) return [{ activity: profile.activity, kind: "", revenue: cashed(documents, from, to) }];
    var rows = ledger(documents, from, to, profile, rules);
    var goods = round2(rows.reduce(function (s, r) { return s + r.goods; }, 0));
    var services = round2(rows.reduce(function (s, r) { return s + r.services; }, 0));
    return [{ activity: m.vente, kind: "biens", revenue: goods }, { activity: m.services, kind: "services", revenue: services }];
  }

  /** Cotisations (et versement libératoire) d'un chiffre d'affaires réparti par activité, au taux de chaque activité. */
  function partsDue(parts, profile, rules, periodEnd) {
    return parts.map(function (x) {
      var r = rates(profile, rules, periodEnd, x.activity);
      var social = round2(x.revenue * (r.social + r.cfp)), vl = round2(x.revenue * r.vl);
      return { activity: x.activity, kind: x.kind, revenue: x.revenue, rates: r, social: social, vl: vl, total: round2(social + vl) };
    });
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
    var parts = partsDue(revenueParts(documents, profile, rules, p.start, p.end), profile, rules, p.end);
    var sum = function (k) { return round2(parts.reduce(function (s, x) { return s + x[k]; }, 0)); };
    var social = sum("social"), vl = sum("vl");
    return { period: p, due: ev.date, revenue: sum("revenue"), rates: rates(profile, rules, p.end), social: social, vl: vl, total: round2(social + vl),
             open: today <= p.end, parts: parts, mixed: parts.length > 1 };
  }

  /**
   * Plafond de la micro-entreprise et seuil de la franchise de TVA, sur l'année civile. Activité mixte : plafond global
   * de la vente, plafond des services sur la part des prestations ; franchise de TVA : chiffre d'affaires global au
   * seuil de la vente et part des prestations au seuil des services (BOFiP, BOI-TVA-DECLA-40-10-10, § 160) ; seuils
   * majorés de l'année en cours non donnés pour l'activité mixte (règle non lue, documentation/53).
   */
  function thresholds(documents, profile, rules, year) {
    var a = rules.micro_activities[profile.activity];
    var revenue = cashed(documents, year + "-01-01", year + "-12-31");
    if (!a) return { revenue: revenue };
    var m = mixedActivities(profile, rules);
    if (m) {
      var parts = revenueParts(documents, profile, rules, year + "-01-01", year + "-12-31");
      return { revenue: revenue, ceiling: rules.micro_activities[m.vente].plafond_ca, mixed: true,
               goods: parts[0].revenue, services: { revenue: parts[1].revenue, ceiling: rules.micro_activities[m.services].plafond_ca },
               vat: profile.vatRegime === "franchise" ? { mixed: true, base: rules.micro_activities[m.vente].tva_seuil,
                 servicesBase: rules.micro_activities[m.services].tva_seuil } : null };
    }
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
    var amountText = INV.compute(doc).noVat ? fmt.eur(total(doc)) : L("eng.mail.ttc", { amount: fmt.eur(total(doc)) });
    var bal = balance(doc, documents);
    var due = dueDate(doc);
    var iban = profile.iban ? (profile.bic ? L("eng.mail.ibanBic", { iban: profile.iban, bic: profile.bic, number: doc.number })
      : L("eng.mail.iban", { iban: profile.iban, number: doc.number })) : "";
    var parts = [], subject;
    if (kind === "reminder") {
      var late = due < today;
      subject = late ? L("eng.mail.subjectLate", { number: doc.number }) : L("eng.mail.subjectDue", { number: doc.number, due: fmt.date(due) });
      var R1 = { number: doc.number, date: fmt.date(doc.date), due: fmt.date(due), amount: fmt.eur(bal) };
      parts.push(late ? L("eng.mail.reminderLate", R1) : L("eng.mail.reminderSoon", R1));
      if (iban) parts.push(iban);
      parts.push(L("eng.mail.questions"));
    } else if (doc.type === "facture") {
      var st = state(doc, today, documents), credits = documents ? credited(documents, doc) : 0;
      var payable = (parseInt(doc.terms, 10) || 0) > 0 ? L("eng.mail.payableBy", { date: fmt.date(due) }) : L("eng.mail.payableNow");
      var first = L("eng.mail.invoice", { number: doc.number, date: fmt.date(doc.date), amount: amountText });
      if (st === "cancelled") first += L("eng.mail.cancelled");
      else if (bal <= 0.005) first += L("eng.mail.paid");
      else if (bal < total(doc) - 0.005) {
        var nCredits = (documents || []).filter(function (d) { return d.type === "avoir" && d.status !== "draft" && d.originId === doc.id; }).length;
        var already = paidAmount(doc) > 0
          ? (credits > 0 ? L("eng.mail.already.paymentsCredits") : L("eng.mail.already.payments"))
          : (nCredits > 1 ? L("eng.mail.already.credits") : L("eng.mail.already.credit"));
        first += L("eng.mail.remaining", { already: already, amount: fmt.eur(bal), payable: payable });
      } else first += L("eng.mail.payable", { payable: payable });
      parts.push(first);
      if (bal > 0.005 && iban) parts.push(iban);
      parts.push(L("eng.mail.questions"));
    } else if (doc.type === "devis") {
      var pct = Math.min(100, Math.max(0, Number(doc.depositPct) || 0));
      var until = INV.addDays(doc.date, Math.max(1, parseInt(doc.validity, 10) || 30));
      parts.push(L("eng.mail.quote", { number: doc.number, date: fmt.date(doc.date), amount: amountText, until: fmt.date(until) }) +
        (pct > 0 ? L("eng.mail.deposit", { pct: String(pct).replace(".", ","), amount: fmt.eur(round2(total(doc) * pct / 100)) }) : ""));
      parts.push(L("eng.mail.accept", { mention: INV.QUOTE_ACCEPTANCE }));
      parts.push(L("eng.mail.discuss"));
    } else {
      var origin = doc.originId ? (documents || []).filter(function (d) { return d.id === doc.originId; })[0] : null;
      var ref = origin ? L("eng.mail.ref", { number: origin.number, date: fmt.date(origin.date) }) : doc.origin && doc.origin.number ? doc.origin.number : "";
      parts.push(ref ? L("eng.mail.creditFor", { number: doc.number, date: fmt.date(doc.date), amount: amountText, ref: ref })
        : L("eng.mail.credit", { number: doc.number, date: fmt.date(doc.date), amount: amountText }));
      var sa = state(doc, today, documents);
      if (sa === "refund") parts.push(L("eng.mail.refundSoon", { amount: fmt.eur(bal) }));
      else if (sa === "refunded") {
        var lastPay = payments(doc).map(function (p) { return p.date; }).sort().pop();
        parts.push(L("eng.mail.refunded", { amount: fmt.eur(paidAmount(doc)), date: fmt.date(lastPay) }));
      } else if (origin) {
        var left = balance(origin, documents);
        parts.push(left > 0.005 ? L("eng.mail.deducted", { amount: fmt.eur(left) })
          : state(origin, today, documents) === "cancelled" ? L("eng.mail.deductedCancelled") : L("eng.mail.deductedPaid"));
      }
      parts.push(L("eng.mail.questions"));
    }
    if (kind !== "reminder") subject = TYPE_NAMES[doc.type] + " " + doc.number + (profile.name ? " – " + profile.name : "");
    return { subject: subject, body: L("eng.mail.hello") + "\n\n" + parts.join("\n\n") + "\n\n" + L("eng.mail.regards") + "\n" + (profile.name || "") };
  }
  var TYPE_NAMES = labels("eng.type.", ["facture", "devis", "avoir"]);

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
    var lines = (g.lines || []).map(function (l) {
      var out = { desc: String((l && l.desc) || ""), qty: amount(l && l.qty), price: amount(l && l.price) };
      if (l && has(INV.LINE_KINDS, l.kind)) out.kind = l.kind; // vente ou service (document mixte, documentation/53)
      return out;
    }).filter(function (l) { return l.desc.trim() || isFinite(l.price); });
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
  function purchasesRequired(profile, rule, rules) {
    if (!profile || !rule) return false;
    var list = rule.activities || [], m = rules ? mixedActivities(profile, rules) : null;
    return list.indexOf(profile.activity) > -1 || !!(m && list.indexOf(m.vente) > -1);
  }

  /**
   * Dépenses de la période, dans l'ordre chronologique (date, puis création) : { rows, total, cash } ; cash : total
   * réglé en espèces, à distinguer dans le registre des achats.
   */
  function expenseRows(expenses, from, to) {
    var rows = (expenses || []).filter(function (e) { return e && e.date && (!from || e.date >= from) && (!to || e.date <= to); })
      .map(function (e) {
        return { id: e.id, date: e.date, supplier: e.supplier || "", label: e.label || "", method: METHODS[e.method] || e.method || "",
                 cash: e.method === "especes", ref: e.ref || "", amount: round2(Number(e.amount) || 0), createdAt: e.createdAt || "",
                 category: EXPENSE_CATEGORIES[e.category] || "" };
      })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : (a.id < b.id ? -1 : 1)); });
    var sum = function (list) { return round2(list.reduce(function (s, r) { return s + r.amount; }, 0)); };
    return { rows: rows, total: sum(rows), cash: sum(rows.filter(function (r) { return r.cash; })) };
  }

  /** Contrôle d'une dépense saisie : messages d'erreur (vide si elle est valable). */
  function checkExpense(e) {
    var errors = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "")) errors.push(L("eng.exp.date"));
    if (!String(e.supplier || "").trim()) errors.push(L("eng.exp.supplier"));
    if (!(isFinite(e.amount) && Number(e.amount) > 0)) errors.push(L("eng.exp.amount"));
    if (!METHODS[e.method]) errors.push(L("eng.pay.method"));
    return errors;
  }

  function expensesCSV(rows) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    // Catégorie (documentation/55) en dernière colonne : les colonnes du registre des achats restent à leur place.
    var lines = [L("eng.csv.expenses")];
    rows.forEach(function (r) {
      lines.push([r.date.split("-").reverse().join("/"), q(r.supplier), q(r.label), String(r.amount.toFixed(2)).replace(".", ","), q(r.method), q(r.ref), q(r.category)].join(";"));
    });
    return lines.join("\r\n");
  }

  // ----- Immobilisations et amortissements (documentation/57-immobilisations.md) --------------------------------

  var ASSET_CATEGORIES = labels("eng.assetCategory.", ["materiel", "bureau", "logiciel", "transport", "autre"]);
  var ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  function utcDay(d) { var p = d.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
  /** Date AAAA-MM-JJ qui existe (pas de 31 avril). */
  function validDay(d) { return ISO_DATE.test(d || "") && new Date(utcDay(d)).toISOString().slice(0, 10) === d; }
  /** Nombre de jours de a à b, les deux compris. */
  function daysIncl(a, b) { return Math.round((utcDay(b) - utcDay(a)) / 86400000) + 1; }
  function yearDays(y) { return daysIncl(y + "-01-01", y + "-12-31"); }
  /** Début de l'amortissement : jour de la mise en service, à défaut jour de l'acquisition. */
  function assetStart(a) { return a.inServiceOn || a.acquiredOn; }
  var filled = function (v) { return v !== null && v !== undefined && v !== ""; };

  /** Erreurs de saisie d'un bien, avec le champ concerné. */
  function assetErrors(a, rules) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!String(a.label || "").trim()) add("label", L("eng.asset.label"));
    if (!ASSET_CATEGORIES[a.category]) add("category", L("eng.asset.category"));
    if (!validDay(a.acquiredOn)) add("acquiredOn", L("eng.asset.acquired"));
    if (filled(a.inServiceOn) && !validDay(a.inServiceOn)) add("inServiceOn", L("eng.asset.inServiceInvalid"));
    else if (filled(a.inServiceOn) && validDay(a.acquiredOn) && a.inServiceOn < a.acquiredOn) add("inServiceOn", L("eng.asset.inServiceBefore"));
    if (!(filled(a.cost) && isFinite(a.cost) && Number(a.cost) > 0)) add("cost", L("eng.asset.cost"));
    if (!(filled(a.years) && Number.isInteger(Number(a.years)) && Number(a.years) >= 1 && Number(a.years) <= 50)) add("years", L("eng.asset.years"));
    if (!(filled(a.proShare) && isFinite(a.proShare) && Number(a.proShare) >= 1 && Number(a.proShare) <= 100)) add("proShare", L("eng.asset.proShare"));
    if (filled(a.soldOn)) {
      if (!validDay(a.soldOn)) add("soldOn", L("eng.asset.soldInvalid"));
      else if (validDay(assetStart(a) || "") && a.soldOn < assetStart(a)) add("soldOn", L("eng.asset.soldBefore"));
      if (!(filled(a.salePrice) && isFinite(a.salePrice) && Number(a.salePrice) >= 0)) add("salePrice", L("eng.asset.salePrice"));
    } else if (filled(a.salePrice)) add("soldOn", L("eng.asset.soldOn"));
    // Voiture particulière acquise depuis 2021 : données de la carte grise nécessaires au plafond (documentation/57 § 8).
    var P = rules && rules.plafond_amortissement_vp;
    if (P && a.category === "transport" && a.vp === true && validDay(a.acquiredOn) && a.acquiredOn >= P.acquired_from) {
      if (!validDay(a.firstRegOn)) add("firstRegOn", L("eng.asset.firstReg"));
      if (!(filled(a.co2) && Number.isInteger(Number(a.co2)) && Number(a.co2) >= 0 && Number(a.co2) <= 999)) add("co2", L("eng.asset.co2"));
    }
    return errors;
  }
  function checkAsset(a, rules) { return assetErrors(a, rules).map(function (e) { return e.message; }); }

  /**
   * Plafond de l'amortissement déductible d'une voiture particulière (CGI, art. 39, 4 ; BOI-BIC-AMT-20-40-50 ; notices
   * 2032 et 2142 de 2026), règle plafond_amortissement_vp. null : pas un véhicule. status : « not_vp » (pas une voiture
   * particulière : pas de plafond), « before » (acquise avant 2021 : barème non repris), « missing » (carte grise
   * incomplète), « under » (prix au plus égal au plafond), « capped » (part déductible = annuité × plafond ÷ prix).
   */
  function vehicleCap(a, rules) {
    if (!a || a.category !== "transport") return null;
    if (a.vp !== true) return { status: "not_vp" };
    var P = rules && rules.plafond_amortissement_vp;
    if (!P || !validDay(a.acquiredOn) || a.acquiredOn < P.acquired_from) return { status: "before" };
    if (!validDay(a.firstRegOn) || !filled(a.co2) || !isFinite(a.co2)) return { status: "missing" };
    var wltp = a.firstRegOn >= P.wltp_from, co2 = Number(a.co2), cap = null;
    (wltp ? P.wltp : P.nedc).some(function (band) {
      var inBand = band.below !== undefined ? co2 < band.below : band.up_to !== undefined ? co2 <= band.up_to : true;
      if (inBand) cap = band.cap;
      return inBand;
    });
    var cost = Number(a.cost);
    return { status: cost > cap ? "capped" : "under", cap: cap, ratio: cost > cap ? cap / cost : 1, wltp: wltp, co2: co2 };
  }

  /**
   * Plan d'amortissement linéaire (BOI-BIC-AMT-20-10) : une ligne par année civile, du jour de la mise en service
   * (compris) ; première année au prorata des jours (jours exacts / jours de l'année) ; cumul arrondi au centime, total =
   * prix de revient ; bien cédé : année de cession au prorata jusqu'au jour de la cession (compris), puis plan arrêté.
   * Ligne : { year, days (null pour une année entière), yearDays, amount, cumulative, net, deductible }.
   */
  function assetPlan(a, rules) {
    var start = assetStart(a), cost = round2(Number(a.cost)), years = Number(a.years);
    var share = (filled(a.proShare) ? Number(a.proShare) : 100) / 100, sold = filled(a.soldOn) ? a.soldOn : null;
    // Voiture plafonnée : part déductible = annuité × plafond ÷ prix ; en partie privée (combinaison non lue), acquise avant
    // 2021 (barème non repris) ou carte grise incomplète : part à établir (null).
    var vc = rules ? vehicleCap(a, rules) : null, capped = !!vc && vc.status === "capped";
    var unknown = !!vc && (vc.status === "missing" || vc.status === "before");
    var deductibleOf = function (amount) {
      if (unknown || (capped && share < 1)) return null;
      return round2(amount * (capped ? vc.ratio : share));
    };
    var first = +start.slice(0, 4), y = first, rows = [], fraction = 0, cum = 0;
    while (cum < cost && rows.length < years + 2) {
      var from = y === first ? start : y + "-01-01";
      var to = sold && +sold.slice(0, 4) === y ? sold : y + "-12-31";
      if (sold && sold < from) break;
      var days = daysIncl(from, to), full = yearDays(y);
      fraction = Math.min(years, fraction + days / full);
      var next = round2(cost * fraction / years);  // fraction plafonnée à la durée : le dernier cumul vaut le prix de revient
      var amount = round2(next - cum);
      cum = next;
      rows.push({ year: y, days: days === full ? null : days, yearDays: full, amount: amount, cumulative: cum, net: round2(cost - cum),
                  deductible: deductibleOf(amount) });
      if (sold && +sold.slice(0, 4) === y) break;
      y++;
    }
    return rows;
  }

  /**
   * Plus-value ou moins-value de cession (documentation/57 § 9 ; BOI-BNC-BASE-30-20 et BOI-BNC-BASE-30-30-10, règle
   * plus_values_professionnelles). null : pas de cession. Résultat = prix de cession (net des frais) − valeur nette au
   * jour de la cession (amortissements linéaires sans limitation, même pour une voiture plafonnée) ; véhicule en partie
   * privé : résultat × part professionnelle. Répartition : moins-value à court terme ; plus-value d'un bien détenu depuis
   * moins de deux ans à court terme ; sinon à court terme jusqu'aux amortissements déduits, à long terme au-delà.
   * split « unknown » (montants à établir) : bien autre qu'un véhicule affecté en partie (« partial »), voiture plafonnée
   * ou dont la part déductible est à établir (« vehicle_cap »).
   */
  function assetDisposal(a, rules) {
    if (!a || !validDay(a.soldOn) || !filled(a.salePrice) || !isFinite(a.salePrice)) return null;
    var plan = assetPlan(a, rules), cumulative = plan.length ? plan[plan.length - 1].cumulative : 0;
    var net = round2(Number(a.cost) - cumulative), gross = round2(Number(a.salePrice) - net);
    var share = (filled(a.proShare) ? Number(a.proShare) : 100) / 100, vehicle = a.category === "transport";
    var held = a.soldOn >= addYears(a.acquiredOn, rules.plus_values_professionnelles.holding_years);   // addYears : section Prospects (29 février → 28)
    var vc = vehicleCap(a, rules), reason = null;
    if (share < 1 && !vehicle) reason = "partial";
    else if (vc && vc.status !== "not_vp" && vc.status !== "under") reason = "vehicle_cap";
    var result = vehicle ? round2(gross * share) : gross, shortTerm = null, longTerm = null;
    if (!reason) {
      // Détenu depuis deux ans au moins : court terme jusqu'aux amortissements déduits (une moins-value y reste en entier).
      if (!held) { shortTerm = result; longTerm = 0; }
      else { shortTerm = Math.min(result, round2(cumulative * share)); longTerm = round2(result - shortTerm); }
    }
    return { net: net, gross: gross, result: result, heldTwoYears: held, shortTerm: shortTerm, longTerm: longTerm,
             split: reason ? "unknown" : "ok", reason: reason };
  }

  /** Registre d'une année : biens présents dans l'année (acquis au plus tard cette année, non cédés avant), annuités, totaux. */
  function assetsYear(assets, year, rules) {
    var Y = String(year), rows = [];
    (assets || []).forEach(function (a) {
      if (!a || !validDay(a.acquiredOn) || a.acquiredOn.slice(0, 4) > Y || (filled(a.soldOn) && a.soldOn.slice(0, 4) < Y)) return;
      var plan = assetPlan(a, rules), row = plan.filter(function (r) { return String(r.year) === Y; })[0] || null;
      var done = plan.filter(function (r) { return String(r.year) <= Y; });
      var cumulative = done.length ? done[done.length - 1].cumulative : 0;
      var sold = !!(filled(a.soldOn) && a.soldOn.slice(0, 4) === Y);
      rows.push({ asset: a, row: row, amount: row ? row.amount : 0, deductible: row ? row.deductible : 0, cumulative: cumulative,
                  net: round2(Number(a.cost) - cumulative), sold: sold, disposal: sold && rules ? assetDisposal(a, rules) : null });
    });
    rows.sort(function (x, y) {
      var a = assetStart(x.asset), b = assetStart(y.asset);
      return a < b ? -1 : a > b ? 1 : String(x.asset.label).localeCompare(String(y.asset.label), "fr");
    });
    var sum = function (k, list) { return round2((list || rows).reduce(function (s, r) { return s + (r[k] || 0); }, 0)); };
    return { rows: rows, amount: sum("amount"), deductible: sum("deductible"), net: sum("net", rows.filter(function (r) { return !r.sold; })),
             count: rows.length, pending: rows.filter(function (r) { return r.deductible === null; }).length,
             disposals: disposalsOf(rows) };
  }
  /** Cessions de l'année : solde à court terme, plus-values à long terme, cessions à établir (dont en plus-value). */
  function disposalsOf(rows) {
    var list = rows.filter(function (r) { return r.disposal; }), known = list.filter(function (r) { return r.disposal.split === "ok"; });
    var sum = function (k) { return round2(known.reduce(function (s, r) { return s + r.disposal[k]; }, 0)); };
    return { count: list.length, shortTerm: sum("shortTerm"), longTerm: sum("longTerm"), pending: list.length - known.length,
             pendingGains: list.filter(function (r) { return r.disposal.split !== "ok" && r.disposal.result > 0; }).length };
  }

  /**
   * Recettes encaissées hors taxes d'une année (BOI-BIC-PVMV-40-10-10-20, §§ 230 et 500) : encaissements des factures moins
   * remboursements des avoirs, part de TVA retirée ; count : nombre d'encaissements (0 : année inconnue de l'Espace).
   */
  function receiptsHT(documents, year) {
    var Y = String(year), total = 0, count = 0;
    (documents || []).forEach(function (doc) {
      if (doc.status === "draft" || (doc.type !== "facture" && doc.type !== "avoir")) return;
      var net = 1 - vatPart(doc), sign = doc.type === "avoir" ? -1 : 1;
      payments(doc).forEach(function (p) {
        if (String(p.date).slice(0, 4) !== Y) return;
        total += sign * Number(p.amount) * net;
        count++;
      });
    });
    return { year: +Y, amount: round2(total), count: count };
  }
  /** Taux d'exonération d'une catégorie (article 151 septies, II) : 1 jusqu'au seuil, dégressif ensuite, 0 au-delà ; à 0,01 % près. */
  function rate151(c, receipts) {
    if (receipts <= c.full_up_to) return 1;
    if (receipts >= c.partial_below) return 0;
    return Math.round((c.partial_below - receipts) / c.divisor * 10000) / 10000;
  }
  /**
   * Condition des cinq ans d'activité (article 151 septies, documentation/57 § 11) : remplie pour l'année si les cinq ans
   * sont atteints au plus tard le 1er janvier suivant (activité exercée jusqu'au 31 décembre) ; unknown sans date lisible.
   */
  function fiveYears(startDate, year, rules) {
    if (!validDay(startDate)) return { status: "unknown", reachedOn: null };
    var reached = addYears(startDate, rules.plus_values_exoneration_151_septies.activity_years);
    return { status: reached <= (Number(year) + 1) + "-01-01" ? "met" : "not_met", reachedOn: reached };
  }
  /**
   * Exonération de l'article 151 septies estimée pour un BNC (documentation/57 § 10 et 11) : moyenne des encaissements HT
   * des deux années précédentes, taux, montants exonérés de la plus-value nette à court terme et à long terme de l'année.
   * kind null (montants null) : une des deux années n'a aucun encaissement enregistré, estimation à établir ; condition
   * des cinq ans non remplie (date de début d'activité connue) : kind "none", reason "activity", montants nuls.
   */
  function exemption151(documents, year, disposals, rules, startDate) {
    var X = rules.plus_values_exoneration_151_septies, Y = Number(year);
    var receipts = [receiptsHT(documents, Y - 2), receiptsHT(documents, Y - 1)];
    var st = Math.max(0, (disposals && disposals.shortTerm) || 0), lt = Math.max(0, (disposals && disposals.longTerm) || 0);
    var out = { years: [Y - 2, Y - 1], receipts: receipts, average: null, rate: null, kind: null, shortTerm: null, longTerm: null,
                base: { shortTerm: st, longTerm: lt }, activity: fiveYears(startDate, Y, rules), reason: null };
    if (out.activity.status === "not_met") {
      out.kind = "none"; out.reason = "activity"; out.rate = 0; out.shortTerm = 0; out.longTerm = 0;
      return out;
    }
    if (!receipts[0].count || !receipts[1].count) return out;
    out.average = round2((receipts[0].amount + receipts[1].amount) / 2);
    var C = X.services_bnc;
    out.kind = out.average <= C.full_up_to ? "full" : out.average < C.partial_below ? "partial" : "none";   // selon le seuil, pas le taux arrondi
    out.rate = rate151(C, out.average);
    out.shortTerm = round2(st * out.rate);
    out.longTerm = round2(lt * out.rate);
    return out;
  }

  /**
   * Messages d'un bien : « deductible » (500 € HT ou moins, catégorie admise : déduction possible en charge,
   * immobilisation_seuil_charges) ; « vehicle » (plafonds d'amortissement des véhicules non calculés) ; « partial »
   * (bien affecté en partie : mention au registre, part déductible seule).
   */
  function assetHints(a, rules) {
    var S = rules.immobilisation_seuil_charges, hints = [];
    if (S.categories.indexOf(a.category) > -1 && Number(a.cost) > 0 && Number(a.cost) <= S.amount) hints.push("deductible");
    if (a.category === "transport") hints.push("vehicle");
    if (filled(a.proShare) && Number(a.proShare) < 100) hints.push("partial");
    return hints;
  }

  /** Registre de l'année au format CSV (séparateur « ; », montants avec la virgule). */
  function assetsCSV(year) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var eur = function (n) { return filled(n) ? Number(n).toFixed(2).replace(".", ",") : ""; };
    var lines = [L("eng.csv.assets")];
    year.rows.forEach(function (r) {
      var a = r.asset;
      lines.push([q(a.label), q(ASSET_CATEGORIES[a.category]), frDay(a.acquiredOn), frDay(assetStart(a)), eur(a.cost), String(a.years),
        String(filled(a.proShare) ? a.proShare : 100).replace(".", ","), eur(r.amount), eur(r.cumulative), eur(r.net), eur(r.deductible),
        filled(a.soldOn) ? frDay(a.soldOn) : "", filled(a.soldOn) ? eur(a.salePrice) : "",
        r.disposal ? eur(r.disposal.shortTerm) : "", r.disposal ? eur(r.disposal.longTerm) : ""].join(";"));
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
    if (unit === "day") return q >= 2 ? L("eng.duration.days", { n: dec(q) }) : L("eng.duration.day", { n: dec(q) });
    var min = Math.round(q * 60), h = Math.floor(min / 60), rest = min % 60;
    if (!h) return L("eng.duration.minutes", { n: rest });
    return rest ? L("eng.duration.hoursMinutes", { h: h, m: String(rest).padStart(2, "0") }) : L("eng.duration.hours", { h: h });
  }

  /*
   * Chronomètre (documentation/37-temps-passe.md, § 8) : état { start, elapsed, day, stopped } sur l'appareil ;
   * start : instant du démarrage ou de la reprise (ms, null en pause ou à l'arrêt) ; elapsed : temps cumulé avant ;
   * day : jour du premier démarrage ; stopped : arrêté, durée à saisir.
   */
  var ISO_DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  /** État relu du stockage : null s'il est illisible. */
  function timerCheck(x) {
    if (!x || typeof x !== "object" || !ISO_DAY.test(x.day || "")) return null;
    var elapsed = Number(x.elapsed), start = x.start === null || x.start === undefined ? null : Number(x.start);
    if (!isFinite(elapsed) || elapsed < 0 || (start !== null && !isFinite(start))) return null;
    if (x.stopped && start !== null) return null;
    return { start: start, elapsed: elapsed, day: x.day, stopped: !!x.stopped };
  }
  /** Temps mesuré (ms) ; une horloge reculée ne le rend jamais négatif. */
  function timerElapsed(x, nowMs) {
    if (!x) return 0;
    return Math.max(0, x.elapsed + (x.start === null ? 0 : Math.max(0, nowMs - x.start)));
  }
  function timerStart(nowMs, day) { return { start: nowMs, elapsed: 0, day: day, stopped: false }; }
  function timerPause(x, nowMs) { return { start: null, elapsed: timerElapsed(x, nowMs), day: x.day, stopped: false }; }
  function timerResume(x, nowMs) { return { start: nowMs, elapsed: timerElapsed(x, nowMs), day: x.day, stopped: false }; }
  function timerStop(x, nowMs) { return { start: null, elapsed: timerElapsed(x, nowMs), day: x.day, stopped: true }; }
  /** Affichage du temps écoulé : « 1:05:09 », « 0:00:42 ». */
  function timerClock(ms) {
    var s = Math.floor(Math.max(0, ms) / 1000);
    return Math.floor(s / 3600) + ":" + String(Math.floor(s / 60) % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  /**
   * Durée à reporter dans la saisie : minutes arrondies (au moins 1), texte « 1h05 » (lu par parseDuration), jour du
   * démarrage, passage de minuit (today différent du jour du démarrage) et dépassement de 24 heures.
   */
  function timerDuration(x, nowMs, today) {
    var minutes = Math.max(1, Math.round(timerElapsed(x, nowMs) / 60000));
    return { minutes: minutes, input: Math.floor(minutes / 60) + "h" + String(minutes % 60).padStart(2, "0"), date: x.day,
             crossesDay: !!today && today !== x.day, over24: minutes > 24 * 60 };
  }

  /** Erreurs de saisie d'un temps, avec le champ concerné : date, task, unit, duration, clientId, rate. */
  function timeErrors(t) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date || "")) add("date", L("eng.time.date"));
    if (!String(t.task || "").trim()) add("task", L("eng.time.task"));
    var q = Number(t.quantity);
    if (!Object.prototype.hasOwnProperty.call(TIME_MAX, t.unit)) add("unit", L("eng.time.unit"));
    else if (!(isFinite(q) && q > 0)) add("duration", t.unit === "day" ? L("eng.time.durationDays") : L("eng.time.durationHours"));
    else if (q > TIME_MAX[t.unit]) add("duration", t.unit === "day" ? L("eng.time.maxDay") : L("eng.time.maxHours"));
    if (t.billable !== false && !t.clientId) add("clientId", L("eng.time.client"));
    if (t.rate !== null && t.rate !== undefined && t.rate !== "" && !(isFinite(Number(t.rate)) && Number(t.rate) >= 0)) add("rate", L("eng.time.rate"));
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
    var lines = [L("eng.csv.time")];
    rows.forEach(function (r) {
      lines.push([frDay(r.date), q(clientName(r.clientId)), q(r.task), dec(r.quantity), r.unit === "day" ? L("eng.csv.day") : L("eng.csv.hour"),
                  r.rate === null ? "" : r.rate.toFixed(2).replace(".", ","), r.amount === null ? "" : r.amount.toFixed(2).replace(".", ","),
                  r.billable ? L("eng.csv.yes") : L("eng.csv.no")].join(";"));
    });
    return lines.join("\r\n");
  }

  // ----- Prospects (documentation/38-prospects.md) ------------------------------------------------------------

  var STAGE_LABELS = labels("eng.stage.", ["new", "talks", "quote", "won", "lost"]);
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
    if (!String(p.name || "").trim()) add("name", L("eng.prospect.name"));
    if (String(p.email || "").trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(p.email).trim())) add("email", L("eng.prospect.email"));
    if (!blank(p.value) && !(isFinite(Number(p.value)) && Number(p.value) >= 0)) add("value", L("eng.prospect.value"));
    if (!blank(p.nextDate) && !isDay(p.nextDate)) add("nextDate", L("eng.prospect.nextDate"));
    if (!has(STAGE_LABELS, p.stage)) add("stage", L("eng.prospect.stage"));
    return errors;
  }

  /** Erreurs d'un échange noté : date (aujourd'hui au plus), sens (me ou them), résumé. */
  function exchangeErrors(x, today) {
    var errors = [], add = function (field, message) { errors.push({ field: field, message: message }); };
    if (!isDay(x.date)) add("date", L("eng.exchange.date"));
    else if (x.date > today) add("date", L("eng.exchange.future"));
    if (x.from !== "me" && x.from !== "them") add("from", L("eng.exchange.from"));
    if (!String(x.text || "").trim()) add("text", L("eng.exchange.text"));
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

  /**
   * Date de clôture d'une piste (documentation/55, § 7) : « Perdu » : closedAt ; « Gagné » : la plus ancienne de closedAt
   * (si « Gagné » a été choisi), des dates de décision de ses devis acceptés ou facturés et, pour un devis facturé sans
   * date de décision, de la date de la facture ; piste ouverte ou aucune date connue : null.
   */
  function prospectClosedAt(p, documents) {
    var stage = prospectStage(p, documents);
    if (stage === "lost") return isDay(p.closedAt) ? p.closedAt : null;
    if (stage !== "won") return null;
    var dates = [];
    if (p.stage === "won" && isDay(p.closedAt)) dates.push(p.closedAt);
    prospectQuotes(p, documents).forEach(function (q) {
      if (q.status === "draft" || !(q.status === "accepted" || q.invoiceId)) return;
      if (isDay(q.decidedAt)) { dates.push(q.decidedAt); return; }
      var inv = q.invoiceId ? (documents || []).filter(function (d) { return d && d.id === q.invoiceId; })[0] : null;
      if (inv && isDay(inv.date)) dates.push(inv.date);
    });
    return dates.length ? dates.sort()[0] : null;
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
    var lines = [L("eng.csv.prospects")];
    (prospects || []).forEach(function (p) {
      var v = prospectValue(p, documents);
      lines.push([q(p.name), q(p.contact), p.pro === false ? L("eng.prospect.person") : L("eng.prospect.pro"), q(p.email), q(p.phone), q(p.source),
                  STAGE_LABELS[prospectStage(p, documents)], v === null ? "" : v.toFixed(2).replace(".", ","), frDay(p.nextDate), q(p.nextAction),
                  frDay(lastContactFrom(p)), frDay(String(p.createdAt || "").slice(0, 10))].join(";"));
    });
    return lines.join("\r\n");
  }

  // ----- Trésorerie (documentation/39-tresorerie.md) ----------------------------------------------------------

  var EVERY = { month: 1, quarter: 3, year: 12 };
  var CHARGE_LABELS = labels("eng.every.", ["month", "quarter", "year", "once"]);
  /** Sens d'un mouvement prévu : sortie (charge) par défaut, entrée si flow vaut "in" (documentation/39, § 7). */
  var isIn = function (c) { return !!c && c.flow === "in"; };
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
    if (c.every === "once") return isDay(c.start) && c.start >= from && c.start <= to ? [c.start] : [];
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
    if (!String(c.label || "").trim()) add("label", L("eng.charge.label"));
    if (!(isFinite(Number(c.amount)) && Number(c.amount) > 0)) add("amount", L("eng.charge.amount"));
    if (!has(EVERY, c.every) && c.every !== "once") add("every", L("eng.charge.every"));
    if (!blank(c.flow) && c.flow !== "in" && c.flow !== "out") add("flow", L("eng.charge.flow"));
    if (!isDay(c.start)) add("start", c.every === "once" ? L("eng.charge.dateOnce") : L("eng.charge.dateNext"));
    else if (c.every !== "once" && !blank(c.end) && (!isDay(c.end) || c.end < c.start)) add("end", L("eng.charge.end"));
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
        var parts = revenueParts(docs, p, input.rules, d.period.start, d.period.end);
        var cash = round2(parts.reduce(function (s, x) { return s + x.revenue; }, 0));
        var amount = round2(partsDue(parts, p, input.rules, d.period.end).reduce(function (s, x) { return s + x.total; }, 0));
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
    var p = input.profile || {}, today = input.today, docs = input.documents || [];
    var n = Math.min(12, Math.max(1, Math.round(Number(input.months)) || 6)), prudent = input.scenario === "prudent";
    var until = monthEnd(addMonths(monthStart(today), n - 1)), items = [];
    var receipts = expectedReceipts(docs, today);
    if (prudent) {
      // Scénario prudent : factures déjà en retard non comptées ; les autres arrivent avec le retard moyen constaté
      // du client sur 12 mois (à défaut, le retard moyen de tous les clients ; documentation/39, § 7).
      var stats = paymentStats(docs, addMonths(today, -12), today);
      receipts = receipts.filter(function (r) { return !r.late; }).map(function (r) {
        if (r.amount < 0) return r;
        var c = stats.byClient[r.doc.clientId], delay = Math.round(c ? c.avgLate : stats.avgLate || 0);
        return delay > 0 ? Object.assign({}, r, { date: INV.addDays(r.date, delay), delay: delay }) : r;
      });
    }
    receipts = receipts.filter(function (r) { return r.date <= until; });
    receipts.forEach(function (r) {
      var who = (r.doc.snapshot && r.doc.snapshot.client && r.doc.snapshot.client.name) || "";
      items.push({ date: r.date, kind: r.amount < 0 ? "refund" : "receipt", amount: r.amount, late: r.late, docId: r.doc.id, delay: r.delay || 0,
                   label: (r.doc.type === "avoir" ? L("eng.forecast.refund", { number: r.doc.number }) : L("eng.forecast.invoice", { number: r.doc.number })) +
                     (who ? " (" + who + ")" : "") });
    });
    // Entrées prévues de chiffre d'affaires (mouvements prévus « revenue ») : comptées comme des encaissements.
    var plannedRevenue = [];
    (input.charges || []).forEach(function (c) {
      if (isIn(c) && c.revenue) chargeDates(c, today, until).forEach(function (d) { plannedRevenue.push({ date: d, amount: round2(Number(c.amount)) }); });
    });
    var mainActivity = p.activity;
    // Cotisations : encaissé de la période + encaissements attendus dans la période, à la date limite.
    if (totalRate(p, input.rules, today) !== null) {
      declarations(p, input.events).forEach(function (d) {
        if (d.due < today || d.due > until) return;
        var inPeriod = receipts.filter(function (r) { return r.date >= d.period.start && r.date <= d.period.end; });
        var parts = revenueParts(docs, p, input.rules, d.period.start, d.period.end).map(function (x) {
          // Encaissements attendus ajoutés à chaque activité (facture mixte : au prorata de ses lignes, comme un encaissement réel).
          var add = inPeriod.reduce(function (s, r) {
            var g = goodsPart(r.doc, r.amount);
            return s + (x.kind === "biens" ? g : x.kind === "services" ? r.amount - g : r.amount);
          }, 0);
          return { activity: x.activity, kind: x.kind, revenue: round2(x.revenue + add) };
        });
        // Chiffre d'affaires prévu : rattaché à l'activité principale du profil.
        var planned = plannedRevenue.filter(function (r) { return r.date >= d.period.start && r.date <= d.period.end; })
          .reduce(function (s, r) { return s + r.amount; }, 0);
        if (planned && parts.length) {
          var target = parts.filter(function (x) { return x.activity === mainActivity; })[0] || parts[0];
          target.revenue = round2(target.revenue + planned);
        }
        var amount = round2(partsDue(parts, p, input.rules, d.period.end).reduce(function (s, x) { return s + x.total; }, 0));
        if (amount) items.push({ date: d.due, kind: "urssaf", amount: -amount, label: d.period.key.indexOf("T") > -1 ? L("eng.forecast.urssafQuarter", { period: d.period.label })
          : L("eng.forecast.urssafMonth", { period: d.period.label }) });
      });
    }
    // TVA : réel normal, TVA du mois (exigible + attendue à l'encaissement) au calendrier du mois suivant ; réel simplifié, acomptes.
    if (p.vatRegime === "normal") {
      vatEvents(input.events, "normal").forEach(function (e) {
        if (e.date < today || e.date > until) return;
        var m = addMonths(monthStart(e.date), -1), end = monthEnd(m);
        var expected = receipts.filter(function (r) { return r.date >= m && r.date <= end && onCash(r.doc); })
          .reduce(function (s, r) { return s + r.amount * vatPart(r.doc); }, 0); // un remboursement d'avoir est déjà négatif
        var rate = Number(p.vatRate) > 0 ? Number(p.vatRate) : 20;
        expected += plannedRevenue.filter(function (r) { return r.date >= m && r.date <= end; })
          .reduce(function (s, r) { return s + r.amount * rate / (100 + rate); }, 0); // montant prévu TTC
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
        var amount = round2(Number(c.amount));
        items.push({ date: d, kind: isIn(c) ? "planned" : "charge", amount: isIn(c) ? amount : -amount, label: c.label, chargeId: c.id });
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
    return { start: start, today: today, until: until, scenario: prudent ? "prudent" : "prevu", items: items, months: months,
             negative: negative, calendarShort: lastEvent < until };
  }

  /**
   * Courbe du solde prévu : aujourd'hui (solde saisi), puis le solde de fin de chaque jour qui a un mouvement ;
   * point bas (le premier s'il y en a plusieurs) et solde final. null sans solde saisi.
   */
  function balanceCurve(f) {
    if (!f || f.start === null || f.start === undefined) return null;
    var bal = f.start, points = [{ date: f.today, balance: bal }];
    f.items.forEach(function (x, i) {
      bal = round2(bal + x.amount);
      var next = f.items[i + 1];
      if (!next || next.date !== x.date) points.push({ date: x.date, balance: bal });
    });
    var low = points.reduce(function (m, pt) { return pt.balance < m.balance ? pt : m; }, points[0]);
    return { points: points, low: low, end: bal };
  }
  /** Ce qui peut sortir aujourd'hui sans que le solde prévu passe sous le seuil : point bas − seuil, au moins 0. */
  function safeAmount(curve, threshold) {
    if (!curve) return null;
    return Math.max(0, round2(curve.low.balance - Math.max(0, Number(threshold) || 0)));
  }

  var daysBetween = function (a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); };
  var avg = function (list) { return list.length ? Math.round(list.reduce(function (s, v) { return s + v; }, 0) / list.length * 10) / 10 : null; };
  /**
   * Délais de paiement des factures soldées par un paiement entre from et to (date du dernier paiement) : délai moyen
   * depuis la date de la facture, retard moyen après l'échéance (un paiement en avance compte 0), part payée à l'heure ;
   * même calcul par client. Factures annulées par avoir exclues.
   */
  function paymentStats(documents, from, to) {
    var all = [], byClient = {};
    (documents || []).forEach(function (d) {
      if (!d || d.type !== "facture" || d.status === "draft" || state(d, to, documents) !== "paid") return;
      var last = payments(d).map(function (p) { return p.date; }).sort().pop();
      if (!last || last < from || last > to) return;
      var row = { days: Math.max(0, daysBetween(d.date, last)), late: Math.max(0, daysBetween(dueDate(d), last)) };
      all.push(row);
      (byClient[d.clientId] = byClient[d.clientId] || []).push(row);
    });
    var summary = function (rows) {
      return { count: rows.length, avgDays: avg(rows.map(function (r) { return r.days; })), avgLate: avg(rows.map(function (r) { return r.late; })),
               onTime: rows.length ? Math.round(rows.filter(function (r) { return r.late === 0; }).length / rows.length * 100) / 100 : null };
    };
    var out = summary(all);
    out.byClient = {};
    Object.keys(byClient).forEach(function (k) { out.byClient[k] = summary(byClient[k]); });
    return out;
  }

  var AGING = [["notDue", L("eng.aging.notDue"), -Infinity, 0], ["d30", L("eng.aging.d30"), 1, 30], ["d60", L("eng.aging.d60"), 31, 60],
               ["d90", L("eng.aging.d90"), 61, 90], ["more", L("eng.aging.more"), 91, Infinity]];
  /** Factures émises non soldées par ancienneté du retard ; les plus en retard d'abord. */
  function aging(documents, today) {
    var buckets = AGING.map(function (b) { return { key: b[0], label: b[1], amount: 0, count: 0 }; }), items = [];
    (documents || []).forEach(function (d) {
      if (!d || d.type !== "facture" || d.status === "draft") return;
      var st = state(d, today, documents);
      if (st !== "unpaid" && st !== "partial" && st !== "overdue") return;
      var due = dueDate(d), late = Math.max(0, daysBetween(due, today)), amount = balance(d, documents);
      var i = AGING.findIndex(function (b) { return late >= b[2] && late <= b[3]; });
      buckets[i].amount = round2(buckets[i].amount + amount);
      buckets[i].count++;
      items.push({ doc: d, amount: amount, due: due, lateDays: late, bucket: AGING[i][0] });
    });
    items.sort(function (a, b) { return b.lateDays - a.lateDays || (a.due < b.due ? -1 : 1); });
    var sum = function (list) { return round2(list.reduce(function (s, b) { return s + b.amount; }, 0)); };
    return { total: sum(buckets), late: sum(buckets.slice(1)), lateCount: buckets.slice(1).reduce(function (s, b) { return s + b.count; }, 0),
             buckets: buckets, items: items };
  }

  /** Par mois entre from et to : encaissements nets (remboursements d'avoirs déduits) et dépenses saisies. */
  function cashHistory(documents, expenses, from, to) {
    var rows = ledger(documents || [], from, to), out = [];
    for (var m = monthStart(from); m <= to; m = addMonths(m, 1)) {
      var end = monthEnd(m), inflow = 0;
      rows.forEach(function (r) { if (r.date >= m && r.date <= end) inflow += r.amount; });
      var outflow = expenseRows(expenses, m < from ? from : m, end < to ? end : to).total;
      out.push({ key: m.slice(0, 7), label: period(m.slice(0, 7)).label, in: round2(inflow), out: outflow, net: round2(inflow - outflow) });
    }
    return out;
  }

  /** Sorties régulières ramenées au mois (trimestre ÷ 3, année ÷ 12) ; charges terminées, ponctuelles et entrées exclues. */
  function monthlyCharges(charges, today) {
    return round2((charges || []).reduce(function (s, c) {
      if (!c || isIn(c) || !has(EVERY, c.every) || (c.end && c.end < today)) return s;
      return s + (Number(c.amount) || 0) / EVERY[c.every];
    }, 0));
  }
  /** Mois couverts par le disponible au rythme des charges mensuelles (une décimale) ; null sans charges. */
  function runway(available, monthly) {
    if (available === null || available === undefined || !(monthly > 0)) return null;
    return Math.max(0, Math.floor(available / monthly * 10) / 10);
  }
  /**
   * Point mort : chiffre d'affaires à encaisser chaque mois pour couvrir les charges mensuelles et les cotisations
   * (taux total de l'activité principale : cotisations, formation professionnelle, versement libératoire) ; null hors
   * micro-entreprise ou sans charges.
   */
  function breakEven(monthly, profile, rules, today) {
    var r = totalRate(profile || {}, rules, today);
    if (r === null || !(monthly > 0) || r >= 1) return null;
    return Math.ceil(monthly / (1 - r));
  }
  /** Devis acceptés pas encore facturés : nombre et montant TTC. */
  function quotesToInvoice(documents) {
    var list = (documents || []).filter(function (d) { return d && d.type === "devis" && d.status === "accepted" && !d.invoiceId; });
    return { count: list.length, amount: round2(list.reduce(function (s, d) { return s + total(d); }, 0)) };
  }

  var FLOW_KINDS = labels("eng.flow.", ["receipt", "refund", "urssaf", "vat", "charge", "planned"]);
  /** Export de la prévision : date, nature, libellé, montant et solde après le mouvement (si un solde est saisi). */
  function forecastCSV(f) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var eur = function (n) { return String(n.toFixed(2)).replace(".", ","); };
    var bal = f.start, lines = [L("eng.csv.forecast")];
    if (bal !== null) lines.push([f.today.split("-").reverse().join("/"), q(L("eng.csv.forecastStart")), q(""), "", eur(bal)].join(";"));
    f.items.forEach(function (x) {
      if (bal !== null) bal = round2(bal + x.amount);
      lines.push([x.date.split("-").reverse().join("/"), q(FLOW_KINDS[x.kind] || x.kind), q(x.label), eur(x.amount), bal === null ? "" : eur(bal)].join(";"));
    });
    return lines.join("\r\n");
  }

  function ledgerCSV(rows) {
    var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    var eur = function (n) { return String(n.toFixed(2)).replace(".", ","); };
    // Activité mixte : ventes et prestations dans deux colonnes (BOFiP, BOI-BIC-DECLA-30-30, § 30).
    var split = rows.some(function (r) { return r.goods !== undefined; });
    var lines = [split ? L("eng.csv.ledgerMixed") : L("eng.csv.ledger")];
    rows.forEach(function (r) {
      lines.push([r.date.split("-").reverse().join("/"), q(r.client), q(r.nature)].concat(split ? [eur(r.goods), eur(r.services)] : [])
        .concat([eur(r.amount), q(r.method), q(r.ref)]).join(";"));
    });
    return lines.join("\r\n");
  }

  return { text: L, METHODS: METHODS, EXPENSE_CATEGORIES: EXPENSE_CATEGORIES, DEFAULT_PREFIXES: DEFAULT_PREFIXES, PROFILE_FIELDS: PROFILE_FIELDS, COUNTRIES: COUNTRIES,
           EU_COUNTRIES: EU_COUNTRIES, countries: countries,
           total: total, payments: payments, paidAmount: paidAmount, credited: credited, balance: balance, dueDate: dueDate,
           series: series, seriesPrefix: seriesPrefix, nextNumber: nextNumber, continuation: continuation,
           checkIssue: checkIssue, issue: issue, state: state, email: email, fromGenerator: fromGenerator,
           checkPayment: checkPayment, ledger: ledger, ledgerQuarters: ledgerQuarters, cashed: cashed, period: period, acreEnd: acreEnd, rates: rates,
           mixedActivities: mixedActivities, goodsShare: goodsShare, revenueParts: revenueParts,
           nextDeclaration: nextDeclaration, thresholds: thresholds, clientTotals: clientTotals,
           invoiceFromQuote: invoiceFromQuote, creditFromInvoice: creditFromInvoice, duplicate: duplicate, ledgerCSV: ledgerCSV,
           purchasesRequired: purchasesRequired, expenseRows: expenseRows, checkExpense: checkExpense, expensesCSV: expensesCSV,
           parseDuration: parseDuration, durationLabel: durationLabel, checkTime: checkTime, timeErrors: timeErrors, timeState: timeState, lastRate: lastRate,
           timeInvoiceLines: timeInvoiceLines, timeInvoice: timeInvoice, timeSummary: timeSummary, unbilledByClient: unbilledByClient,
           ASSET_CATEGORIES: ASSET_CATEGORIES, assetErrors: assetErrors, checkAsset: checkAsset, assetStart: assetStart, assetPlan: assetPlan,
           assetsYear: assetsYear, assetHints: assetHints, assetsCSV: assetsCSV, vehicleCap: vehicleCap, assetDisposal: assetDisposal, receiptsHT: receiptsHT, exemption151: exemption151, fiveYears: fiveYears,
           timeCSV: timeCSV, timerCheck: timerCheck, timerElapsed: timerElapsed, timerStart: timerStart, timerPause: timerPause,
           timerResume: timerResume, timerStop: timerStop, timerClock: timerClock, timerDuration: timerDuration,
           STAGE_LABELS: STAGE_LABELS, OPEN_STAGES: OPEN_STAGES, prospectErrors: prospectErrors, exchangeErrors: exchangeErrors, prospectQuotes: prospectQuotes,
           minStage: minStage, prospectStage: prospectStage, prospectClosedAt: prospectClosedAt, prospectValue: prospectValue, pipeline: pipeline, followUps: followUps,
           lastContactFrom: lastContactFrom, addYears: addYears, retentionDue: retentionDue, optoutKeys: optoutKeys, prospectsCSV: prospectsCSV,
           CHARGE_LABELS: CHARGE_LABELS, chargeDates: chargeDates, chargeErrors: chargeErrors, expectedReceipts: expectedReceipts, vatPart: vatPart,
           vatExigible: vatExigible, owed: owed, forecast: forecast, balanceCurve: balanceCurve, safeAmount: safeAmount, paymentStats: paymentStats,
           addMonths: addMonths, aging: aging, cashHistory: cashHistory, monthlyCharges: monthlyCharges, runway: runway, quotesToInvoice: quotesToInvoice, breakEven: breakEven,
           FLOW_KINDS: FLOW_KINDS, forecastCSV: forecastCSV };
});
