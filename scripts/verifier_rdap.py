"""Vérifie les serveurs RDAP de la recherche de noms de domaine (documentation/33-noms-de-domaine.md).

L'outil interroge les registres depuis le navigateur du visiteur, à partir de la table `rdap_servers` de
data/rules/shared.json. Ce script contrôle cette table aux sources officielles :

1. le fichier d'amorçage de l'IANA (RFC 9224, https://data.iana.org/rdap/dns.json) : pour chaque extension, l'adresse
   de la table doit figurer parmi celles que l'IANA publie pour l'étiquette la plus longue qui correspond ;
2. le comportement réel de chaque registre : un nom enregistré répond 200, un nom libre 404 (RFC 7480, § 5.3), et la
   réponse autorise la lecture par un autre site (en-tête Access-Control-Allow-Origin, RFC 7480, § 5.6), sans quoi le
   navigateur ne pourrait pas lire le résultat.

Le script tourne dans GitHub Actions (.github/workflows/verifier-rdap.yml), chaque mois et à la demande : l'environnement
de travail habituel n'a pas accès à ces serveurs.

Usage : python3 scripts/verifier_rdap.py [--rapport] [extension ...]
  --rapport : affiche les résultats sans échouer (pour choisir les extensions ou relever les réponses réelles).
  extension : extensions à examiner en plus de celles de la table (ex. : io dev).
"""
import json
import secrets
import sys
import urllib.error
import urllib.request
from pathlib import Path

BOOTSTRAP = "https://data.iana.org/rdap/dns.json"
ORIGIN = "https://smileylab95.github.io"
RULES = Path(__file__).resolve().parent.parent / "data" / "rules" / "shared.json"
# Un nom enregistré par extension : le domaine du registre lui-même, ou nic.<extension> (que les registres des
# nouvelles extensions doivent exploiter), jamais celui d'un particulier.
REGISTERED = {
    "com": "verisign.com", "net": "verisign.net", "org": "pir.org", "fr": "afnic.fr", "eu": "eurid.eu",
    "uk": "nominet.uk", "co.uk": "bbc.co.uk", "ca": "cira.ca", "us": "nic.us", "io": "nic.io", "co": "nic.co",
    "be": "dnsbelgium.be", "ch": "switch.ch", "de": "denic.de",
}


def fetch(url, accept="application/rdap+json, application/json"):
    request = urllib.request.Request(url, headers={"Accept": accept, "Origin": ORIGIN, "User-Agent": "outils-freelance-verif/1"})
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


def iana_urls(services, tld):
    """URLs publiées pour l'étiquette la plus longue qui correspond (RFC 9224, § 4)."""
    labels = tld.split(".")
    for start in range(len(labels)):
        suffix = ".".join(labels[start:])
        for entry in services:
            if suffix in entry[0]:
                return suffix, entry[1]
    return None, []


def summary(body):
    """Ce que l'outil affiche d'un nom enregistré : dates et registraire (jamais les coordonnées du titulaire)."""
    try:
        data = json.loads(body)
    except ValueError:
        return {"json": False, "début": body[:200].decode("utf-8", "replace")}
    registrar = None
    for entity in data.get("entities", []):
        if "registrar" in entity.get("roles", []):
            for item in (entity.get("vcardArray") or [None, []])[1]:
                if item[0] == "fn":
                    registrar = item[3]
    return {
        "objectClassName": data.get("objectClassName"), "ldhName": data.get("ldhName"),
        "status": data.get("status"), "events": [(e.get("eventAction"), e.get("eventDate")) for e in data.get("events", [])],
        "registrar": registrar,
    }


def main(args):
    rapport = "--rapport" in args
    extra = [a.lower().lstrip(".") for a in args if not a.startswith("--")]
    table = json.loads(RULES.read_text(encoding="utf-8"))["values"].get("rdap_servers", {}).get("value", {})
    tlds = list(dict.fromkeys(list(table) + extra))
    problems = []

    status, _, body = fetch(BOOTSTRAP, accept="application/json")
    if status != 200:
        print(f"Amorçage IANA illisible ({status}) : {body[:200]!r}")
        return 1
    bootstrap = json.loads(body)
    print(f"Amorçage IANA : publication {bootstrap.get('publication')}, version {bootstrap.get('version')}")

    for tld in tlds:
        print(f"\n.{tld}")
        suffix, urls = iana_urls(bootstrap["services"], tld)
        print(f"  IANA ({suffix or 'absente'}) : {urls}")
        base = table.get(tld)
        if base:
            if base not in urls:
                problems.append(f".{tld} : la table indique {base}, l'IANA publie {urls}")
            print(f"  table : {base}")
        base = base or next((u for u in urls if u.startswith("https://")), None)
        if not base:
            if tld in table:
                problems.append(f".{tld} : aucun serveur RDAP")
            continue
        free = f"of-verif-{secrets.token_hex(5)}.{tld}"
        for name, expected in ((REGISTERED.get(tld, f"nic.{tld}"), 200), (free, 404)):
            code, headers, body = fetch(f"{base}domain/{name}")
            cors = header(headers, "Access-Control-Allow-Origin")
            print(f"  {name} : {code}, CORS {cors!r}, type {header(headers, 'Content-Type')!r}")
            if code == 200:
                print(f"    {json.dumps(summary(body), ensure_ascii=False)}")
            elif code != 404:
                print(f"    {body[:300]!r}")
            if tld in table:
                if code != expected:
                    problems.append(f".{tld} : {name} répond {code}, attendu {expected}")
                if cors not in ("*", ORIGIN):
                    problems.append(f".{tld} : {name} sans autorisation de lecture par un autre site ({cors!r})")

    print()
    for problem in problems:
        print(f"✗ {problem}")
    print(f"{len(tlds)} extension(s), {len(problems)} problème(s)")
    return 0 if rapport or not problems else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
