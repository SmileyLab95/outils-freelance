"""Vérifie les sources de taux de change de la conversion de devises (documentation/49-devises.md).

L'outil interroge, depuis le navigateur du visiteur, la BCE (France), le HMRC (Royaume-Uni) et la Banque du Canada,
aux adresses de la règle `fx_reference_sources` de data/rules/shared.json. Ce script contrôle, pour chaque source :

1. la réponse (200) et l'autorisation de lecture par un autre site (en-tête Access-Control-Allow-Origin), sans quoi le
   navigateur ne pourrait pas lire le taux ;
2. le format (colonnes ou champs que lit le moteur engines/currency.js) et la présence d'un taux pour chaque devise de
   la liste, dans la fenêtre de jours de la règle (BCE, Banque du Canada) ou dans le fichier du mois (HMRC).

Il tourne dans GitHub Actions (.github/workflows/verifier-taux.yml), chaque mois et à la demande : l'environnement de
travail habituel n'a pas accès à ces serveurs.

Usage : python3 scripts/verifier_taux.py [--rapport] [AAAA-MM-JJ]
  --rapport : affiche les résultats sans échouer.
  AAAA-MM-JJ : date du contrôle (aujourd'hui par défaut).
"""
import csv
import io
import json
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ORIGIN = "https://smileylab95.github.io"
RULES = Path(__file__).resolve().parent.parent / "data" / "rules" / "shared.json"
HOME = {"ecb": "EUR", "hmrc": "GBP", "boc": "CAD"}


def fetch(url):
    request = urllib.request.Request(url, headers={"Origin": ORIGIN, "User-Agent": "outils-freelance-verif/1"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, dict(response.headers), response.read()
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), error.read()
    except Exception as error:  # réseau, délai, certificat
        return None, {}, str(error).encode()


def header(headers, name):
    for key, value in headers.items():
        if key.lower() == name.lower():
            return value
    return None


def fill(template, **values):
    for key, value in values.items():
        template = template.replace("{" + key + "}", str(value))
    return template


def positive(text):
    try:
        return float(text) > 0
    except (TypeError, ValueError):
        return False


def ecb_currencies(body):
    """Devises qui ont au moins un taux dans un CSV de la BCE ; None si les colonnes du moteur manquent."""
    rows = list(csv.DictReader(io.StringIO(body.decode("utf-8-sig"))))
    if not rows or not {"CURRENCY", "TIME_PERIOD", "OBS_VALUE"} <= set(rows[0]):
        return None
    return {r["CURRENCY"] for r in rows if positive(r["OBS_VALUE"])}


def hmrc_currencies(body):
    """Devises qui ont un taux dans le CSV mensuel du HMRC ; None si les colonnes du moteur manquent."""
    rows = list(csv.DictReader(io.StringIO(body.decode("utf-8-sig"))))
    needed = {"Currency Code", "Currency Units per £1", "Start date", "End date"}
    if not rows or not needed <= {k.strip() for k in rows[0]}:
        return None
    return {r["Currency Code"].strip() for r in rows if positive(r["Currency Units per £1"])}


def boc_has_rate(body, currency):
    """Vrai si la réponse de Valet contient au moins un taux de la série FX<devise>CAD ; None si le format a changé."""
    try:
        data = json.loads(body)
    except ValueError:
        return None
    if not isinstance(data, dict) or not isinstance(data.get("observations"), list):
        return None
    key = f"FX{currency}CAD"
    return any(isinstance(o.get(key), dict) and positive(o[key].get("v")) for o in data["observations"])


def check(problems, name, url, status, headers):
    cors = header(headers, "Access-Control-Allow-Origin")
    print(f"  {url}\n    {status}, CORS {cors!r}, type {header(headers, 'Content-Type')!r}")
    if status != 200:
        problems.append(f"{name} : réponse {status} pour {url}")
        return False
    if cors not in ("*", ORIGIN):
        problems.append(f"{name} : lecture par un autre site non autorisée ({cors!r}) pour {url}")
    return True


def main(args):
    rapport = "--rapport" in args
    days = [a for a in args if not a.startswith("--")]
    today = date.fromisoformat(days[0]) if days else date.today()
    sources = json.loads(RULES.read_text(encoding="utf-8"))["values"]["fx_reference_sources"]["value"]
    start = (today - timedelta(days=sources["window_days"])).isoformat()
    problems = []

    print("BCE")
    foreign = [c for c in sources["currencies"] if c != HOME["ecb"]]
    url = fill(sources["ecb"], currency="+".join(foreign), start=start, end=today.isoformat())
    status, headers, body = fetch(url)
    if check(problems, "BCE", url, status, headers):
        found = ecb_currencies(body)
        if found is None:
            problems.append("BCE : colonnes CURRENCY, TIME_PERIOD ou OBS_VALUE absentes")
        else:
            missing = sorted(set(foreign) - found)
            print(f"    {len(found)} devise(s) avec un taux" + (f", manquantes : {missing}" if missing else ""))
            if missing:
                problems.append(f"BCE : aucun taux depuis le {start} pour {', '.join(missing)}")

    print("HMRC")
    foreign = [c for c in sources["currencies"] if c != HOME["hmrc"]]
    url = fill(sources["hmrc"], year=today.year, month=today.month)
    status, headers, body = fetch(url)
    if check(problems, "HMRC", url, status, headers):
        found = hmrc_currencies(body)
        if found is None:
            problems.append("HMRC : colonnes Currency Code, Currency Units per £1, Start date ou End date absentes")
        else:
            missing = sorted(set(foreign) - found)
            print(f"    {len(found)} devise(s) avec un taux" + (f", manquantes : {missing}" if missing else ""))
            if missing:
                problems.append(f"HMRC : aucun taux du mois pour {', '.join(missing)}")

    print("Banque du Canada")
    for currency in (c for c in sources["currencies"] if c != HOME["boc"]):
        url = fill(sources["boc"], currency=currency, start=start, end=today.isoformat())
        status, headers, body = fetch(url)
        if not check(problems, "Banque du Canada", url, status, headers):
            continue
        has = boc_has_rate(body, currency)
        if has is None:
            problems.append(f"Banque du Canada : format inattendu pour {currency} (champ observations absent)")
        elif not has:
            problems.append(f"Banque du Canada : aucun taux depuis le {start} pour {currency}")

    print()
    for problem in problems:
        print(f"✗ {problem}")
    print(f"3 source(s), {len(problems)} problème(s)")
    return 0 if rapport or not problems else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
