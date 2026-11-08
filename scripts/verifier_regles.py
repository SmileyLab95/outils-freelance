"""Vérifie que les valeurs des règles d'un pays figurent sur leurs pages officielles, lues en direct.

Pour chaque règle de data/rules/<pays>.json (par défaut celles qui n'ont pas encore de date de vérification), le script
lit la source et les sources complémentaires (sites officiels de la liste de scripts/lire_source.py seulement), puis
cherche chaque nombre ou date de la valeur sous ses formes rédigées (« £12,570 », « 12 570 € », « 20% », « 55p »,
« 6 April 2026 », « 1er janvier »…), nombre entier délimité (« 8% » n'est pas trouvé dans « 48% »).

Statuts : OK (toutes les valeurs trouvées), MANQUE (au moins une valeur absente : à relire à la main, la page peut la
rédiger autrement), TEXTE (valeur sans nombre : à relire), NON OFFICIEL (aucune source officielle), ERREUR (aucune
source lisible). Un OK n'est qu'un indice : le contexte de chaque valeur reste à relire avant de dater la règle
(documentation/04-methode-de-travail.md).

Il tourne dans GitHub Actions (.github/workflows/verifier-regles.yml), à la demande : l'environnement de travail
habituel n'a pas accès à tous ces sites. Le rapport est imprimé à la fin du journal.

Usage : python3 scripts/verifier_regles.py <fr|uk|us|ca|shared> [--toutes] [--contexte] [--regles r1,r2]
  --toutes : toutes les règles, datées comprises (contrôle de veille) ;
  --contexte : le passage de la page autour de chaque valeur trouvée, pour la relire ;
  --regles : seulement ces règles.
"""
import hashlib
import json
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import lire_source as L  # noqa: E402

RULES = Path(__file__).resolve().parent.parent / "data" / "rules"
MOIS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
           "November", "December"]
MOIS_AP = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]
MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre",
           "novembre", "décembre"]
# Sites publics lus en plus de ceux de scripts/lire_source.py : tout domaine .gov (réservé aux administrations des
# États-Unis), sites des États américains en .us, parlements, tribunaux et organismes publics des provinces canadiennes
# des registres de noms de domaine et de leurs opérateurs (sources de référence des règles « shared »), régime
# Agirc-Arrco (sa propre réglementation).
PUBLICS = ("parliament.uk", "quebec.ca", "gov.mb.ca", "gnb.ca", "gov.nl.ca", "gov.nt.ca", "princeedwardisland.ca",
           "yukon.ca", "saskatchewan.ca", "nslegislature.ca", "assembly.nl.ca", "provincialcourt.bc.ca",
           "albertacourts.ca", "sasklawcourts.ca", "manitobacourts.mb.ca", "courts.ns.ca", "courts.pe.ca", "court.nl.ca",
           "yukoncourts.ca", "nwtcourts.ca", "wsib.ca", "worksafebc.com", "wcb.ab.ca", "wcbsask.com", "wcb.mb.ca",
           "wcb.ns.ca", "worksafenb.ca", "wcb.pe.ca", "workplacenl.ca", "wscc.nt.ca", "wcb.yk.ca", "oscn.net",
           "pacourts.us", "sccourts.org", "vermontjudiciary.org", "rfc-editor.org", "icann.org", "afnic.fr", "cira.ca",
           "registre.quebec", "nominet.uk", "theukdomain.uk", "registry.google", "get.app", "agirc-arrco.fr")
TAUX = ("rate", "brackets", "percent")
MONNAIES = ("GBP", "USD", "CAD", "EUR")


def _milliers(entier, sep):
    s = str(entier)
    groupes = []
    while len(s) > 3:
        groupes.insert(0, s[-3:])
        s = s[:-3]
    groupes.insert(0, s)
    return sep.join(groupes)


def formes_nombre(n):
    """Formes rédigées d'un nombre : « 12,570 », « 12 570 », « 12570 » ; « 3.65 », « 3,65 » ; « 3.5 » aussi en « 3.50 »."""
    n = round(float(n), 6)
    entier = int(abs(n))
    signe = "-" if n < 0 else ""
    dec = abs(n) - entier
    out = []
    if dec < 1e-9:
        for sep in (",", " ", ""):
            out.append(signe + _milliers(entier, sep))
        out += [signe + _milliers(entier, ",") + ".00", signe + _milliers(entier, " ") + ",00"]
    else:
        txt = ("%.6f" % abs(n)).rstrip("0").split(".")[1]
        variantes = {txt, txt.ljust(2, "0"), txt.ljust(3, "0")}
        for d in sorted(variantes):
            for sep, virgule in ((",", "."), ("", "."), (" ", ","), ("", ",")):
                out.append(signe + _milliers(entier, sep) + virgule + d)
    return list(dict.fromkeys(out))


def formes(valeur, unite, pays="uk", cle=""):
    """Liste de groupes de formes : chaque groupe est une valeur à trouver sous l'une de ses formes. Dans une valeur
    composée, un champ dont le nom évoque un taux (« rate », « taux », « fraction ») est cherché en pourcentage."""
    groupes = []
    if isinstance(valeur, bool) or valeur is None:
        return groupes
    if isinstance(valeur, (int, float)):
        # Fraction sans unité monétaire (abattements de 71 %, versement libératoire de 1,7 %…) : aussi en pourcentage.
        taux = (unite in TAUX or re.search(r"rate|taux|fraction|percent|pct|credit|share|factor|ratio", cle or "") is not None
                or (unite not in MONNAIES and 0 < abs(valeur) < 1))
        if taux and 0 < abs(valeur) <= 2:
            pct = formes_nombre(valeur * 100)
            if float(valeur * 100).is_integer():
                pct.append("%d.0" % round(valeur * 100))
            groupe = [p + s for p in pct for s in ("%", " %", " per cent", " percent", " pour cent")]
            # Un champ « rate » peut aussi être un coefficient (barème kilométrique : « d x 0,529 »).
            if unite not in TAUX:
                groupe += formes_nombre(valeur)
            groupes.append(groupe)
        elif valeur == 0:
            return groupes
        elif unite in MONNAIES and 0 < valeur < 1:
            c = formes_nombre(valeur * 100)
            groupes.append([x + s for x in c for s in ("p", " pence", "¢", " cents", " c")] + formes_nombre(valeur))
        else:
            groupes.append(formes_nombre(valeur))
        return groupes
    if isinstance(valeur, str):
        m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", valeur)
        if m:
            a, mo, j = int(m[1]), int(m[2]), int(m[3])
            en, ap, fr = MOIS_EN[mo - 1], MOIS_AP[mo - 1], MOIS_FR[mo - 1]
            jfr = "1er" if j == 1 else str(j)
            groupes.append(list(dict.fromkeys([f"{j} {en} {a}", f"{en} {j}, {a}", f"{ap} {j}, {a}", f"{jfr} {fr} {a}",
                                               f"{j} {fr} {a}", f"{j} {en}", f"{en} {j}", f"{ap} {j}", f"{jfr} {fr}"])))
        return groupes
    if isinstance(valeur, list):
        for x in valeur:
            groupes += formes(x, unite, pays, cle)
    elif isinstance(valeur, dict):
        for nom, x in valeur.items():
            if nom == "from" and x == 0:
                continue
            groupes += formes(x, unite, pays, nom)
    return groupes


def normaliser(txt):
    """Espaces insécables et fines en espaces, apostrophes droites : les pages et les formes se comparent ainsi."""
    return re.sub("[   ]", " ", txt).replace("’", "'")


def motif(forme):
    """Expression d'une forme délimitée : pas de chiffre collé avant ou après. Une date sans année (« 1er septembre »)
    ne doit pas non plus être suivie d'une année : « 1er septembre 2026 » n'est pas la date de 2027."""
    m = r"(?<![\d.,])" + re.escape(normaliser(forme)) + r"(?![\d]|[.,]\d)"
    if any(mois.lower() in forme.lower() for mois in MOIS_EN + MOIS_AP + MOIS_FR):
        m += r"(?!,?\s*\d{4}(?!\d))"
    return m


def trouve(forme, txt):
    """Vrai si la forme figure dans le texte comme nombre délimité (voir motif)."""
    return re.search(motif(forme), txt, flags=re.IGNORECASE) is not None


def contexte(forme, txt, largeur=70):
    """Passage autour de la première occurrence délimitée d'une forme, pour relire la valeur dans sa phrase."""
    m = re.search(motif(forme), txt, flags=re.IGNORECASE)
    return " ".join(txt[max(0, m.start() - largeur): m.end() + largeur].split()) if m else ""


def statut(regle, textes, pays="uk"):
    """(statut, valeurs manquantes) d'une règle, d'après les textes lus de ses sources officielles (None = illisible)."""
    lus = [t for t in textes if t is not None]
    groupes = formes(regle.get("value"), regle.get("unit"), pays)
    if not textes:
        return "NON OFFICIEL", []
    if not lus:
        return "ERREUR", []
    if not groupes:
        return "TEXTE", []
    tout = "\n".join(normaliser(t) for t in lus)
    manque = [g[0] for g in groupes if not any(trouve(f, tout) for f in g)]
    return ("MANQUE" if manque else "OK"), manque


def officiel(url):
    """Vrai pour une source officielle : liste de lire_source, domaines .gov et .us d'administrations, PUBLICS."""
    if L.autorise(url):
        return True
    m = re.match(r"https://([^/:]+)", url or "")
    hote = m.group(1).lower() if m else ""
    return bool(hote) and (hote.endswith(".gov") or re.search(r"\.(state\.[a-z]{2}\.us|legislature\.[a-z.]+)$", hote) is not None
                           or any(hote == d or hote.endswith("." + d) for d in PUBLICS))


def lire(url, cache):
    """Texte d'une page officielle (None si illisible), lu une seule fois par exécution."""
    if url in cache:
        return cache[url]
    texte, empreinte = None, ""
    try:
        demande = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (outils-freelance, verification de sources)",
                                                       "Accept-Language": "en-GB,en;q=0.9,fr-FR;q=0.8"})
        with urllib.request.urlopen(demande, timeout=25) as r:
            contenu, type_contenu, final = r.read(L.LIMITE), r.headers.get("Content-Type", ""), r.geturl()
        if r.status == 200 and contenu.strip() and officiel(final):
            texte = L.texte(contenu, type_contenu.lower(), final)[0]
            empreinte = hashlib.sha256(contenu).hexdigest()[:8]
    except (urllib.error.URLError, TimeoutError, ValueError, OSError):
        texte = None
    cache[url] = (texte, empreinte)
    return cache[url]


def main(argv):
    if not argv or argv[0] not in ("fr", "uk", "us", "ca", "shared"):
        sys.exit(__doc__)
    pays, toutes, avec_contexte = argv[0], "--toutes" in argv, "--contexte" in argv
    choisies = None
    if "--regles" in argv:
        choisies = set(argv[argv.index("--regles") + 1].split(","))
    regles = json.loads((RULES / f"{pays}.json").read_text(encoding="utf-8"))["values"]
    cache, lignes, compte = {}, [], {}
    retenues = {cle: regle for cle, regle in regles.items()
                if (cle in choisies if choisies is not None else toutes or not regle.get("verified_on"))}
    sources = {cle: [regle.get("source", "")] + [m.get("source", "") for m in regle.get("more_sources", [])]
               for cle, regle in retenues.items()}
    # Pages lues en parallèle (chacune une seule fois) : une page qui n'aboutit pas ne retarde pas les autres.
    a_lire = sorted({u for urls in sources.values() for u in urls if officiel(u)})
    with ThreadPoolExecutor(max_workers=8) as pool:
        for url, lu in zip(a_lire, pool.map(lambda u: lire(u, {}), a_lire)):
            cache[url] = lu
    for cle, regle in retenues.items():
        urls = sources[cle]
        officielles = [u for u in urls if officiel(u)]
        lus = [lire(u, cache) for u in officielles]
        st, manque = statut(regle, [t for t, _ in lus], pays)
        compte[st] = compte.get(st, 0) + 1
        empreintes = " ".join(e for _, e in lus if e)
        detail = (" manque : " + ", ".join(manque)) if manque else ""
        ligne = f"{st:<12} {cle}{detail}" + (f"  [{empreintes}]" if empreintes else "") \
            + ("" if officielles else "  (" + ", ".join(u.split('/')[2] for u in urls if u) + ")")
        if avec_contexte and st in ("OK", "MANQUE"):
            tout = "\n".join(normaliser(t) for t, _ in lus if t)
            for groupe in formes(regle.get("value"), regle.get("unit"), pays)[:8]:
                passage = next((contexte(f, tout) for f in groupe if trouve(f, tout)), "")
                if passage:
                    ligne += f"\n      {groupe[0]} : …{passage}…"
        lignes.append((st, ligne))
    ordre = ["ERREUR", "NON OFFICIEL", "MANQUE", "TEXTE", "OK"]
    print(f"\n===== Règles {pays} vérifiées le {date.today():%d/%m/%Y} : "
          + ", ".join(f"{s} {compte[s]}" for s in ordre if s in compte))
    for s in ordre:
        for st, ligne in lignes:
            if st == s:
                print(ligne)


if __name__ == "__main__":
    main(sys.argv[1:])
