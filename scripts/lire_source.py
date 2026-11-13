"""Lit une source officielle (page HTML, PDF ou classeur XLSX) et en affiche le texte, ou les passages autour des mots
cherchés.

Les règles du site sont vérifiées aux sources officielles avant d'être publiées (documentation/04-methode-de-travail.md).
L'environnement de travail habituel n'a pas accès à plusieurs de ces sites (CNIL, Légifrance…) : ce script tourne dans
GitHub Actions (.github/workflows/lire-source.yml), à la demande, et son résultat se lit dans le journal de l'exécution.
Il ne lit que les sites officiels (liste OFFICIELS et domaines .gov) et n'écrit rien dans le dépôt.

Usage : python3 scripts/lire_source.py <adresse> [mots à chercher, séparés par |, ou « * » pour tout le texte]
Un mot suivi de « +N » (par exemple « Disclosure of information +4000 ») affiche les N caractères qui suivent chaque
occurrence (au plus SUITE_MAX), pour lire en une fois une liste longue : un article et ses paragraphes.
« @entetes » parmi les mots envoie la demande avec l'origine du site (en-tête Origin) et affiche les en-têtes de la
réponse : Access-Control-Allow-Origin dit si un navigateur peut lire la source depuis le site (taux de change…).
"""
import hashlib
import html.parser
import io
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

# Sites officiels (et leurs sous-domaines) des quatre pays et de l'Union européenne, en plus des domaines en .gov
# (administrations américaines : IRS, Sécurité sociale, ministère du Travail, Réserve fédérale, Congrès, eCFR, États et
# villes ; voir autorise). « gouv.fr » est réservé aux services de l'État (Légifrance, impots.gouv.fr,
# entreprendre.service-public.gouv.fr…) ; Assurance maladie (ameli.fr) et France Travail pour la protection sociale ;
# Assemblée nationale et Sénat pour les textes de loi ; banques centrales pour les taux ; lois des provinces
# canadiennes : Ontario (ontario.ca), Québec (gouv.qc.ca, quebec.ca), Colombie-Britannique (gov.bc.ca), Alberta
# (alberta.ca) ; sites des autres gouvernements provinciaux et territoriaux ; lois publiées par les assemblées de
# Nouvelle-Écosse (nslegislature.ca), de Terre-Neuve-et-Labrador (assembly.nl.ca) et du Nunavut (nunavutlegislation.ca) ;
# gnwt.ca, domaine du gouvernement des Territoires du Nord-Ouest (lois publiées par le ministère de la Justice).
OFFICIELS = (
    "gouv.fr", "cnil.fr", "service-public.fr", "urssaf.fr", "ameli.fr", "francetravail.fr", "assemblee-nationale.fr",
    "senat.fr", "inpi.fr", "banque-france.fr", "europa.eu",
    "gov.uk", "legislation.gov.uk", "ico.org.uk", "bankofengland.co.uk",
    "canada.ca", "gc.ca", "revenuquebec.ca", "bankofcanada.ca", "ontario.ca", "gouv.qc.ca", "quebec.ca", "gov.bc.ca",
    "alberta.ca", "saskatchewan.ca", "gov.mb.ca", "gnb.ca", "novascotia.ca", "princeedwardisland.ca", "gov.nl.ca",
    "yukon.ca", "gov.nt.ca", "gnwt.ca", "gov.nu.ca", "nslegislature.ca", "assembly.nl.ca", "nunavutlegislation.ca",
    "iana.org", "fnfe-mpe.org",
)
LIMITE = 20_000_000          # octets lus au plus
PASSAGE = 600                # caractères affichés de part et d'autre d'un mot trouvé
PASSAGES_PAR_MOT = 8
SUITE_MAX = 20_000           # caractères affichés au plus après un mot suivi de « +N »
DEBUT = 8000                 # caractères affichés quand aucun mot n'est cherché
TOUT = 200_000               # caractères affichés au plus quand on demande tout le texte (« * »)
LIENS = 20                   # liens affichés au plus
LIENS_SOURCES = 60           # liens vers d'autres sites officiels affichés au plus avec « * »
ORIGINE = "https://smileylab95.github.io"  # origine des pages du site, envoyée avec « @entetes »
ENTETES = "@entetes"


def autorise(url):
    """Vrai si l'adresse est en https et sur un site officiel de la liste (ou un de ses sous-domaines), ou sur un
    domaine en .gov : ce domaine est réservé aux administrations américaines (fédérales, États, villes)."""
    parts = urllib.parse.urlsplit(url)
    host = (parts.hostname or "").lower()
    return parts.scheme == "https" and (host.endswith(".gov") or any(host == d or host.endswith("." + d) for d in OFFICIELS))


class _Texte(html.parser.HTMLParser):
    # Cellules de tableau séparées (« 24,500 | 23,500 » et non « 24,50023,500 »).
    BLOCS = {"p", "div", "br", "li", "tr", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "table",
             "dd", "dt"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.cache = [], 0
        self.liens, self.lien = [], None  # liens : [adresse, texte] ; lien : celui en cours de lecture

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self.cache += 1
        elif tag == "a" and dict(attrs).get("href"):
            self.lien = [dict(attrs)["href"], ""]
            self.liens.append(self.lien)
        elif tag in self.BLOCS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self.cache = max(0, self.cache - 1)
        elif tag == "a":
            self.lien = None
        elif tag in self.BLOCS:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.cache:
            self.parts.append(data)
            if self.lien is not None:
                self.lien[1] += data


XLSX = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"


def _xlsx(contenu):
    """Texte d'un classeur XLSX (jeux de données publics, tableaux de taux) : feuille par feuille, une ligne par rangée,
    cellules non vides séparées par « | ». Bibliothèque standard seulement ; les parties trop grosses sont refusées."""
    import xml.etree.ElementTree as ET
    import zipfile

    def balise(nom):
        return "{%s}%s" % (XLSX, nom)

    with zipfile.ZipFile(io.BytesIO(contenu)) as z:
        def lire(nom):
            if z.getinfo(nom).file_size > LIMITE:
                raise ValueError("partie trop grosse dans le classeur : " + nom)
            return ET.fromstring(z.read(nom))

        noms = z.namelist()
        partagees = []
        if "xl/sharedStrings.xml" in noms:
            partagees = ["".join(t.text or "" for t in si.iter(balise("t"))) for si in lire("xl/sharedStrings.xml").findall(balise("si"))]
        feuilles = sorted((n for n in noms if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n)),
                          key=lambda n: int(re.search(r"(\d+)\.xml$", n).group(1)))
        lignes = []
        for nom in feuilles:
            lignes.append("[" + nom.rsplit("/", 1)[1][:-4] + "]")
            for rangee in lire(nom).iter(balise("row")):
                cellules = []
                for c in rangee.findall(balise("c")):
                    v = c.find(balise("v"))
                    if c.get("t") == "s" and v is not None:
                        valeur = partagees[int(v.text)]
                    elif c.get("t") == "inlineStr":
                        valeur = "".join(t.text or "" for t in c.iter(balise("t")))
                    else:
                        valeur = v.text if v is not None else ""
                    if valeur and valeur.strip():
                        cellules.append(valeur.strip())
                if cellules:
                    lignes.append(" | ".join(cellules))
    return "\n".join(lignes)


def _est_xlsx(contenu):
    """Vrai si le contenu est une archive ZIP qui contient un classeur (xl/workbook.xml), quel que soit le type annoncé."""
    import zipfile
    try:
        with zipfile.ZipFile(io.BytesIO(contenu)) as z:
            return "xl/workbook.xml" in z.namelist()
    except zipfile.BadZipFile:
        return False


def texte(contenu, type_contenu, base=""):
    """Texte lisible d'une page HTML, d'un PDF ou d'un classeur XLSX, espaces et lignes vides resserrés, et liens de la
    page (adresse complète, texte) : un PDF ou un classeur n'en a pas ici."""
    liens = []
    if "pdf" in type_contenu or contenu[:5] == b"%PDF-":
        from pypdf import PdfReader  # installé par le workflow
        brut = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(contenu)).pages)
    elif _est_xlsx(contenu):
        brut = _xlsx(contenu)
    else:
        parser = _Texte()
        parser.feed(contenu.decode("utf-8", errors="replace"))
        brut = "".join(parser.parts)
        liens = [(urllib.parse.urljoin(base, href), " ".join(t.split())) for href, t in parser.liens]
    lignes = [" ".join(ligne.split()) for ligne in brut.splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lignes)).strip(), liens


def _motif(mot):
    """Motif d'un mot cherché : majuscules ignorées, apostrophe droite ou typographique indifférente."""
    return re.compile("".join("['’]" if c in "'’" else re.escape(c) for c in mot), flags=re.IGNORECASE)


def _mot_et_suite(mot):
    """« mot +N » (espace avant « + ») : le mot et le nombre de caractères à afficher après lui (PASSAGE sans suffixe,
    SUITE_MAX au plus) ; « 3+4 » reste un mot."""
    m = re.fullmatch(r"(.*\S)\s+\+(\d+)", mot)
    return (m.group(1), min(int(m.group(2)), SUITE_MAX)) if m else (mot, PASSAGE)


def options(mots):
    """Sépare l'option « @entetes » (majuscules ignorées) des mots cherchés : (afficher les en-têtes, mots restants)."""
    restants = [m for m in mots if m.lower() != ENTETES]
    return len(restants) != len(mots), restants


def entetes_lisibles(entetes):
    """Lignes « Nom : valeur » des en-têtes d'une réponse, triées par nom (majuscules ignorées)."""
    return [f"{nom} : {valeur}" for nom, valeur in sorted(entetes, key=lambda e: e[0].lower())]


def passages(txt, mots):
    """Passages autour de chaque mot cherché, chevauchements fusionnés."""
    out = []
    for mot in mots:
        mot, suite = _mot_et_suite(mot)
        motif = _motif(mot)
        zones = []
        for m in motif.finditer(txt):
            debut, fin = max(0, m.start() - PASSAGE), min(len(txt), m.end() + suite)
            if zones and debut <= zones[-1][1]:
                zones[-1][1] = fin
            else:
                zones.append([debut, fin])
        out.append((mot, len(motif.findall(txt)), [txt[a:b] for a, b in zones[:PASSAGES_PAR_MOT]]))
    return out


def liens_trouves(liens, mots):
    """Liens dont le texte contient un des mots cherchés (sans doublon), pour trouver l'adresse d'une page citée."""
    vus, out = set(), []
    for adresse, txt in liens:
        if adresse not in vus and any(_motif(mot).search(txt) for mot in mots):
            vus.add(adresse)
            out.append((txt, adresse))
    return out[:LIENS]


def liens_sources(liens, base):
    """Liens vers un autre site officiel que la page lue (Légifrance, EUR-Lex…), sans doublon : les textes qu'une
    fiche cite, pour en noter l'adresse exacte."""
    hote = (urllib.parse.urlsplit(base).hostname or "").lower()
    vus, out = set(), []
    for adresse, txt in liens:
        if autorise(adresse) and (urllib.parse.urlsplit(adresse).hostname or "").lower() != hote and adresse not in vus:
            vus.add(adresse)
            out.append((txt, adresse))
    return out[:LIENS_SOURCES]


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    url = sys.argv[1].strip()
    mots = [m.strip() for m in (sys.argv[2] if len(sys.argv) > 2 else "").split("|") if m.strip()]
    avec_entetes, mots = options(mots)
    if not autorise(url):
        sys.exit(f"Adresse refusée : seuls les sites officiels en https sont lus ({', '.join(OFFICIELS)}, domaines .gov).")
    demande = {"User-Agent": "Mozilla/5.0 (outils-freelance, verification de sources)",
               "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"}
    if avec_entetes:
        demande["Origin"] = ORIGINE
    request = urllib.request.Request(url, headers=demande)
    try:
        with urllib.request.urlopen(request, timeout=60) as reponse:
            contenu = reponse.read(LIMITE)
            final, statut, type_contenu = reponse.geturl(), reponse.status, reponse.headers.get("Content-Type", "")
            entetes = reponse.headers.items()
    except urllib.error.HTTPError as e:
        sys.exit(f"Réponse {e.code} pour {url}")
    except (urllib.error.URLError, TimeoutError) as e:
        sys.exit(f"Lecture impossible : {e}")
    if not autorise(final):
        sys.exit(f"Redirection vers une adresse non officielle refusée : {final}")
    if statut != 200 or not contenu.strip():
        sys.exit(f"Réponse {statut} sans contenu lisible pour {url} (le site filtre peut-être les lectures automatiques).")
    txt, liens = texte(contenu, type_contenu.lower(), final)
    print(f"Source : {url}")
    if final != url:
        print(f"Adresse finale : {final}")
    print(f"Lue le : {datetime.now(timezone.utc):%d/%m/%Y à %H:%M} UTC · réponse {statut} · {type_contenu or 'type inconnu'}")
    print(f"Taille : {len(contenu)} octets · texte : {len(txt)} caractères · SHA-256 : {hashlib.sha256(contenu).hexdigest()}")
    if avec_entetes:
        print(f"\n===== En-têtes de la réponse (demande envoyée avec Origin : {ORIGINE})")
        print("\n".join(entetes_lisibles(entetes)))
    if not mots or mots == ["*"]:
        limite = TOUT if mots else DEBUT
        print("\n" + txt[:limite] + ("\n[…]" if len(txt) > limite else ""))
        if mots:
            sources = liens_sources(liens, final)
            if sources:
                print("\n===== Liens vers d'autres sites officiels")
                for txt_lien, adresse in sources:
                    print(f"- {txt_lien} : {adresse}")
        return
    for mot, total, extraits in passages(txt, mots):
        print(f"\n===== « {mot} » : {total} occurrence(s)" + (f", {len(extraits)} passage(s) affiché(s)" if total else ""))
        for extrait in extraits:
            print("\n…" + extrait + "…")
    trouves = liens_trouves(liens, mots)
    if trouves:
        print("\n===== Liens dont le texte contient un mot cherché")
        for txt_lien, adresse in trouves:
            print(f"- {txt_lien} : {adresse}")


if __name__ == "__main__":
    main()
