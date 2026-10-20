#!/usr/bin/env python3
"""Génère les calendriers fiscaux de data/calendars/<pays>.json (septembre 2026 → janvier 2028).

Chaque échéance : date (AAAA-MM-JJ), kind (social, tax, vat, filing, info), tag, title, desc,
when (conditions sur les champs du formulaire de la page), est (date estimée), link (id de page).
Pour le Canada, tag, title et desc sont bilingues : {"en": …, "fr": …}.

Conventions de date :
- France : échéances Urssaf reportées au jour ouvré suivant (week-end, jour férié), comme le fait l'Urssaf ;
  autres dates nominales.
- États-Unis : date légale, déjà reportée au jour ouvré suivant (règle de l'IRS).
- Royaume-Uni : date nominale (HMRC ne reporte pas le 31 janvier).
- Canada : date nominale ; l'ARC accepte un paiement reçu le jour ouvrable suivant (indiqué sur la page).

À relancer chaque année après vérification des sources (voir documentation/pays/*.md).
Usage : python3 scripts/calendriers.py
"""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "calendars"
START, END = date(2026, 9, 1), date(2028, 1, 31)

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre",
        "novembre", "décembre"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
          "November", "December"]


def de(mot):
    """« de » ou « d' » devant un mot : « d'août », « de mars »."""
    return "d'" + mot if mot[0] in "aeiouéè" else "de " + mot


def last_day(y, m):
    nxt = date(y + (m == 12), m % 12 + 1, 1)
    return date.fromordinal(nxt.toordinal() - 1)


def months(start=START, end=END):
    """(année, mois) de start à end inclus."""
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        yield y, m
        y, m = (y + (m == 12), m % 12 + 1)


def add_months(y, m, n):
    t = y * 12 + (m - 1) + n
    return t // 12, t % 12 + 1


# Jours fériés en France (pour le report des échéances Urssaf).
FERIES = {date(2026, 1, 1), date(2026, 4, 6), date(2026, 5, 1), date(2026, 5, 8), date(2026, 5, 14), date(2026, 5, 25),
          date(2026, 7, 14), date(2026, 8, 15), date(2026, 11, 1), date(2026, 11, 11), date(2026, 12, 25),
          date(2027, 1, 1), date(2027, 3, 29), date(2027, 5, 1), date(2027, 5, 6), date(2027, 5, 8), date(2027, 5, 17),
          date(2027, 7, 14), date(2027, 8, 15), date(2027, 11, 1), date(2027, 11, 11), date(2027, 12, 25),
          date(2028, 1, 1)}


def jour_ouvre(d):
    """Reporte une date au jour ouvré suivant si elle tombe un week-end ou un jour férié."""
    while d.weekday() >= 5 or d in FERIES:
        d = date.fromordinal(d.toordinal() + 1)
    return d


def ev(day, kind, tag, title, desc, when=None, est=False, link=None, period=None):
    """period : période déclarée (« 2026-09 » ou « 2026-T3 »), lue par l'Espace entrepreneur."""
    e = {"date": day.isoformat() if isinstance(day, date) else day, "kind": kind, "tag": tag, "title": title, "desc": desc}
    if period:
        e["period"] = period
    if when:
        e["when"] = when
    if est:
        e["est"] = True
    if link:
        e["link"] = link
    return e


def keep(events):
    events = [e for e in events if START.isoformat() <= e["date"] <= END.isoformat()]
    return sorted(events, key=lambda e: (e["date"], e["title"] if isinstance(e["title"], str) else e["title"]["en"]))


# ---------------------------------------------------------------------------
# France (micro-entrepreneur et entreprise individuelle)
# ---------------------------------------------------------------------------

def france():
    E = []
    # Déclaration Urssaf mensuelle : chiffre d'affaires du mois M, avant la fin du mois M + 1.
    for y, m in months(date(2026, 8, 1), date(2027, 12, 1)):
        ny, nm = add_months(y, m, 1)
        E.append(ev(jour_ouvre(last_day(ny, nm)), "social", "Urssaf",
                    f"Déclaration Urssaf du chiffre d'affaires {de(MOIS[m - 1])} {y}",
                    "Déclarez et payez vos cotisations (et le versement libératoire si vous l'avez choisi) sur "
                    "autoentrepreneur.urssaf.fr, même si votre chiffre d'affaires est nul.",
                    {"periodicity": ["monthly"]}, link="tax", period=f"{y}-{m:02d}"))
    # Déclaration trimestrielle : avant la fin du mois qui suit le trimestre.
    for y, q in [(2026, 2), (2026, 3), (2026, 4), (2027, 1), (2027, 2), (2027, 3), (2027, 4)]:
        first = 3 * q - 2
        ny, nm = add_months(y, 3 * q, 1)
        E.append(ev(jour_ouvre(last_day(ny, nm)), "social", "Urssaf",
                    f"Déclaration Urssaf du {q}{'er' if q == 1 else 'e'} trimestre {y}",
                    f"Chiffre d'affaires encaissé {de(MOIS[first - 1])} à {MOIS[3 * q - 1]} {y}. Déclarez et payez "
                    "vos cotisations sur autoentrepreneur.urssaf.fr, même si votre chiffre d'affaires est nul.",
                    {"periodicity": ["quarterly"]}, link="tax", period=f"{y}-T{q}"))
    for y in (2026, 2027):
        E.append(ev(date(y, 9, 30), "info", "Option",
                    f"Option pour le versement libératoire de l'impôt en {y + 1} : date limite",
                    "Demande à faire auprès de l'Urssaf au plus tard le 30 septembre pour une application au "
                    "1er janvier, si votre revenu fiscal de référence le permet.", link="tax"))
        E.append(ev(date(y, 11, 30), "tax", "CFE", f"CFE {y} : adhésion au prélèvement à l'échéance",
                    "Dernier jour pour adhérer au prélèvement à l'échéance dans votre espace professionnel "
                    "impots.gouv.fr. L'avis de CFE y est publié début ou mi-novembre.",
                    {"created": ["off"]} if y == 2026 else None))
        E.append(ev(date(y, 12, 15), "tax", "CFE", f"Paiement de la CFE {y}",
                    "Cotisation foncière des entreprises, à payer en ligne depuis votre espace professionnel. "
                    "Exonération l'année de création et si votre chiffre d'affaires ne dépasse pas 5 000 €.",
                    {"created": ["off"]}))
    for y in (2027, 2028):
        E.append(ev(date(y, 1, 31), "info", "Option", f"Changer de rythme de déclaration Urssaf pour {y} : date limite",
                    "Pour passer d'une déclaration trimestrielle à mensuelle (ou l'inverse) dès le 1er janvier, envoyez "
                    "la demande par la messagerie de votre espace Urssaf avant le 31 janvier."))
    E.append(ev(date(2026, 12, 31), "tax", "CFE", "Déclaration initiale de CFE (formulaire 1447-C-SD)",
                "À déposer avant le 31 décembre de l'année de création de l'entreprise : elle sert à calculer votre "
                "CFE à partir de la deuxième année.", {"created": ["on"]}))
    E.append(ev(date(2027, 12, 15), "tax", "CFE", "Paiement de votre première CFE (2027)",
                "Première CFE après l'année de création, avec une réduction de moitié la deuxième année d'activité. "
                "Avis publié en novembre dans votre espace professionnel impots.gouv.fr.", {"created": ["on"]}))
    # TVA, régime réel simplifié : acomptes de juillet (55 %) et décembre (40 %), déclaration CA12 début mai.
    for d, label in [(date(2026, 12, 15), "Acompte de TVA de décembre 2026 (40 %)"),
                     (date(2027, 7, 15), "Acompte de TVA de juillet 2027 (55 %)"),
                     (date(2027, 12, 15), "Acompte de TVA de décembre 2027 (40 %)")]:
        E.append(ev(d, "vat", "TVA", label,
                    "Régime réel simplifié : acompte calculé sur la TVA de l'année précédente, à payer entre le 15 et "
                    "le 24 selon votre entreprise (date exacte dans votre espace professionnel).",
                    {"vat": ["simplified"]}, link="salestax"))
    E.append(ev(date(2027, 5, 4), "vat", "TVA", "Déclaration annuelle de TVA 2026 (CA12)",
                "Régime réel simplifié : déclaration et paiement du solde, au plus tard le 2e jour ouvré suivant "
                "le 1er mai.", {"vat": ["simplified"]}, est=True, link="salestax"))
    # TVA, régime réel normal : déclaration CA3 mensuelle.
    for y, m in months(date(2026, 8, 1), date(2027, 12, 1)):
        ny, nm = add_months(y, m, 1)
        E.append(ev(date(ny, nm, 15), "vat", "TVA", f"Déclaration de TVA {de(MOIS[m - 1])} {y} (CA3)",
                    "Régime réel normal : déclaration et paiement entre le 15 et le 24 selon votre entreprise "
                    "(date exacte dans votre espace professionnel).", {"vat": ["normal"]}, link="salestax"))
    # Impôt sur le revenu.
    E.append(ev(date(2027, 4, 15), "tax", "Impôt", "Ouverture de la déclaration de revenus 2026",
                "Déclarez votre chiffre d'affaires de micro-entrepreneur sur la déclaration complémentaire "
                "2042-C-PRO, même avec le versement libératoire.", est=True, link="tax"))
    E.append(ev(date(2027, 5, 20), "tax", "Impôt", "Déclaration de revenus 2026 : premières dates limites",
                "Les dates limites en ligne s'échelonnent de fin mai à début juin selon votre département ; elles "
                "sont publiées sur impots.gouv.fr au printemps.", est=True, link="tax"))
    # Facturation électronique.
    E.append(ev(date(2026, 9, 1), "info", "Réforme", "Facturation électronique : réception obligatoire",
                "Toutes les entreprises doivent pouvoir recevoir des factures électroniques via une plateforme agréée.",
                link="einvoicing"))
    E.append(ev(date(2027, 9, 1), "info", "Réforme", "Facturation électronique : émission obligatoire",
                "Les micro-entreprises, TPE et PME émettent leurs factures aux entreprises via une plateforme agréée "
                "et transmettent leur e-reporting.", link="einvoicing"))
    return keep(E)


# ---------------------------------------------------------------------------
# États-Unis (self-employed)
# ---------------------------------------------------------------------------

def united_states():
    E = []
    est = [("2026-09-15", "Q3 2026", "June 1 to August 31, 2026"), ("2027-01-15", "Q4 2026", "September 1 to December 31, 2026"),
           ("2027-04-15", "Q1 2027", "January 1 to March 31, 2027"), ("2027-06-15", "Q2 2027", "April 1 to May 31, 2027"),
           ("2027-09-15", "Q3 2027", "June 1 to August 31, 2027"), ("2028-01-18", "Q4 2027", "September 1 to December 31, 2027")]
    for d, q, period in est:
        E.append(ev(d, "tax", "Estimated tax", f"Estimated tax payment {q} (Form 1040-ES)",
                    f"Federal estimated tax for income earned {period}. Pay with IRS Direct Pay, EFTPS or your IRS "
                    "online account. Most states with an income tax use the same dates.",
                    {"estimated": ["on"]}, link="estimated-tax"))
    E.append(ev("2026-10-15", "filing", "Tax return", "Extended 2025 tax return due",
                "Last day to file your 2025 Form 1040 if you requested an extension.", {"extension": ["on"]}))
    E.append(ev("2027-02-01", "filing", "1099", "Send Form 1099-NEC to contractors and the IRS",
                "For each contractor you paid $2,000 or more in 2026 (the threshold was $600 for 2025 payments). "
                "January 31 falls on a Sunday, so the deadline moves to February 1.",
                {"contractors": ["on"]}))
    E.append(ev("2027-02-01", "info", "1099", "Your 1099-NEC and 1099-K forms should have arrived",
                "Clients and payment platforms must send them by this date. Check them against your own records "
                "before filing."))
    E.append(ev("2027-04-15", "filing", "Tax return", "2026 tax return and balance due (Form 1040, Schedule C and SE)",
                "File your return and pay any tax owed, or file Form 4868 for an automatic six-month extension to "
                "file (not to pay). Also the last day for 2026 IRA and HSA contributions.", link="tax"))
    E.append(ev("2027-10-15", "filing", "Tax return", "Extended 2026 tax return due",
                "Last day to file your 2026 Form 1040 with an extension. SEP-IRA contributions for 2026 can be made "
                "until this date.", {"extension": ["on"]}))
    return keep(E)


# ---------------------------------------------------------------------------
# Royaume-Uni (sole trader)
# ---------------------------------------------------------------------------

def united_kingdom():
    E = []
    for y in (2026, 2027):
        E.append(ev(date(y, 10, 5), "info", "Self Assessment", f"Register for Self Assessment ({y - 1}/{str(y)[2:]} tax year)",
                    f"If you started self-employment in the {y - 1}/{str(y)[2:]} tax year, tell HMRC by 5 October.",
                    {"newsa": ["on"]}))
        E.append(ev(date(y, 10, 31), "filing", "Self Assessment", f"Paper tax return deadline ({y - 1}/{str(y)[2:]})",
                    "Only if you file on paper. Online returns are due on 31 January."))
        E.append(ev(date(y, 12, 30), "filing", "Self Assessment", f"File online by today to pay through your tax code ({y - 1}/{str(y)[2:]})",
                    "If you owe less than £3,000 and also have PAYE income, HMRC can collect it through your tax code."))
    for y in (2027, 2028):
        ty = f"{y - 2}/{str(y - 1)[2:]}"
        E.append(ev(date(y, 1, 31), "filing", "Self Assessment", f"Online tax return and balancing payment ({ty})",
                    f"File your {ty} return online and pay what you still owe. Late filing costs £100 straight away.",
                    {"mtd": ["no", "2027"]} if y == 2028 else None, link="tax"))
        E.append(ev(date(y, 1, 31), "tax", "Payment on account", f"First payment on account ({y - 1}/{str(y)[2:]})",
                    "Half of last year's tax bill, paid in advance, if that bill was over £1,000 and less than 80% "
                    "was deducted at source.", {"poa": ["on"]}, link="tax"))
    E.append(ev(date(2027, 7, 31), "tax", "Payment on account", "Second payment on account (2026/27)",
                "The other half of your advance payment for the 2026/27 tax year.", {"poa": ["on"]}, link="tax"))
    E.append(ev(date(2027, 4, 5), "info", "Tax year", "End of the 2026/27 tax year",
                "Last day for 2026/27 pension contributions and ISA subscriptions to count for this tax year."))
    E.append(ev(date(2027, 4, 6), "info", "Making Tax Digital", "Making Tax Digital for Income Tax: qualifying income over £30,000",
                "Sole traders and landlords with qualifying income over £30,000 in 2025/26 must keep digital records "
                "and send quarterly updates from today.", {"mtd": ["2027"]}, link="mtd"))
    # Mises à jour trimestrielles MTD : 7 août, 7 novembre, 7 février, 7 mai.
    for d, period, groups in [("2026-11-07", "6 July to 5 October 2026", ["2026"]),
                              ("2027-02-07", "6 October 2026 to 5 January 2027", ["2026"]),
                              ("2027-05-07", "6 January to 5 April 2027", ["2026"]),
                              ("2027-08-07", "6 April to 5 July 2027", ["2026", "2027"]),
                              ("2027-11-07", "6 July to 5 October 2027", ["2026", "2027"])]:
        E.append(ev(d, "filing", "Making Tax Digital", "Making Tax Digital quarterly update",
                    f"Send your income and expenses for {period} from compatible software. No tax is paid with the update.",
                    {"mtd": groups}, link="mtd"))
    E.append(ev("2028-01-31", "filing", "Making Tax Digital", "Making Tax Digital: final declaration for 2026/27",
                "Replaces the Self Assessment return for those in Making Tax Digital since April 2026.",
                {"mtd": ["2026"]}, link="mtd"))
    # TVA : déclaration et paiement le 7 du deuxième mois après la fin du trimestre.
    for stagger, ends in [("1", (3, 6, 9, 12)), ("2", (1, 4, 7, 10)), ("3", (2, 5, 8, 11))]:
        for y, m in months(date(2026, 7, 1), date(2027, 11, 1)):
            if m not in ends:
                continue
            dy, dm = add_months(y, m, 2)
            E.append(ev(date(dy, dm, 7), "vat", "VAT", f"VAT return and payment (quarter ending {last_day(y, m).day} {MONTHS[m - 1]} {y})",
                        "Submit through Making Tax Digital software. Direct Debit payments are collected three working days later.",
                        {"vat": [stagger]}, link="salestax"))
    return keep(E)


# ---------------------------------------------------------------------------
# Canada (travailleur autonome)
# ---------------------------------------------------------------------------

def canada():
    E = []
    inst = {"en": "Instalments", "fr": "Acomptes"}
    for d in ["2026-09-15", "2026-12-15", "2027-03-15", "2027-06-15", "2027-09-15", "2027-12-15"]:
        E.append(ev(d, "tax", inst, {"en": "Income tax instalment", "fr": "Acompte provisionnel d'impôt"},
                    {"en": "Required if your net tax owing is over $3,000 ($1,800 in Quebec) this year and in one of the two "
                           "previous years. Quebec residents also pay provincial instalments to Revenu Québec.",
                     "fr": "Obligatoire si votre impôt net à payer dépasse 3 000 $ (1 800 $ au Québec) cette année et l'une "
                           "des deux années précédentes. Au Québec, des acomptes sont aussi versés à Revenu Québec."},
                    {"instalments": ["on"]}, link="tax"))
    E.append(ev("2027-03-01", "info", {"en": "RRSP", "fr": "REER"},
                {"en": "RRSP contribution deadline for 2026", "fr": "Date limite des cotisations REER pour 2026"},
                {"en": "Contributions made by today can be deducted on your 2026 return.",
                 "fr": "Les cotisations versées d'ici aujourd'hui sont déductibles de votre revenu 2026."}))
    E.append(ev("2027-04-30", "tax", {"en": "Income tax", "fr": "Impôt"},
                {"en": "Pay your 2026 balance owing (income tax and CPP)", "fr": "Paiement du solde d'impôt 2026 (impôt et RPC/RRQ)"},
                {"en": "Self-employed people file by June 15, but any balance owing is due today to avoid interest.",
                 "fr": "Les travailleurs autonomes produisent leur déclaration au plus tard le 15 juin, mais le solde est dû "
                       "aujourd'hui pour éviter les intérêts."}, link="tax"))
    E.append(ev("2027-06-15", "filing", {"en": "Income tax", "fr": "Impôt"},
                {"en": "2026 tax return deadline for the self-employed", "fr": "Déclaration de revenus 2026 des travailleurs autonomes"},
                {"en": "File your T1 with Form T2125 (and your TP-1 in Quebec).",
                 "fr": "Produisez votre T1 avec le formulaire T2125 (et votre TP-1 au Québec, avec l'annexe L)."}, link="tax"))
    gst = {"en": "GST/HST", "fr": "TPS/TVH"}
    gst_desc = {"en": "File and pay online with the CRA (with Revenu Québec for GST and QST in Quebec).",
                "fr": "Déclarez et payez en ligne auprès de l'ARC (de Revenu Québec pour la TPS et la TVQ au Québec)."}
    E.append(ev("2027-04-30", "vat", gst, {"en": "GST/HST annual return: payment due (2026)", "fr": "TPS/TVH annuelle 2026 : paiement"},
                {"en": "Annual filers with a December 31 year-end and business income: the tax is due today, the return by June 15.",
                 "fr": "Déclarants annuels avec exercice au 31 décembre et revenus d'entreprise : la taxe est due aujourd'hui, "
                       "la déclaration au plus tard le 15 juin."}, {"gst": ["annual"]}, link="salestax"))
    E.append(ev("2027-06-15", "vat", gst, {"en": "GST/HST annual return due (2026)", "fr": "Déclaration annuelle de TPS/TVH 2026"},
                gst_desc, {"gst": ["annual"]}, link="salestax"))
    q_names = {3: ("January to March", "janvier à mars"), 6: ("April to June", "avril à juin"),
               9: ("July to September", "juillet à septembre"), 12: ("October to December", "octobre à décembre")}
    for y, m in months(date(2026, 6, 1), date(2027, 12, 1)):
        dy, dm = add_months(y, m, 1)
        due = last_day(dy, dm)
        if m in q_names:
            en, fr = q_names[m]
            E.append(ev(due, "vat", gst, {"en": f"GST/HST quarterly return ({en} {y})", "fr": f"TPS/TVH trimestrielle ({fr} {y})"},
                        gst_desc, {"gst": ["quarterly"]}, link="salestax"))
            E.append(ev(due, "vat", gst, {"en": "GST/HST instalment (annual filers)", "fr": "Acompte de TPS/TVH (déclarants annuels)"},
                        {"en": "Required for annual filers whose net tax was $3,000 or more.",
                         "fr": "Obligatoire pour les déclarants annuels dont la taxe nette atteint 3 000 $."},
                        {"gst": ["annual"], "gstinst": ["on"]}, link="salestax"))
        E.append(ev(due, "vat", gst, {"en": f"GST/HST monthly return ({MONTHS[m - 1]} {y})",
                                     "fr": f"TPS/TVH mensuelle ({MOIS[m - 1]} {y})"},
                    gst_desc, {"gst": ["monthly"]}, link="salestax"))
    return keep(E)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for key, events in [("fr", france()), ("us", united_states()), ("uk", united_kingdom()), ("ca", canada())]:
        data = {"verified_on": "2026-10-20", "range": [START.isoformat(), END.isoformat()], "events": events}
        (OUT / f"{key}.json").write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"{key}: {len(events)} échéances")


if __name__ == "__main__":
    main()
