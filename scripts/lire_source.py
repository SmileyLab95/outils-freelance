"""Lit une source officielle et en affiche le texte, ou les passages autour des mots cherchés.

Les règles du site sont vérifiées aux sources officielles avant d'être publiées (documentation/04-methode-de-travail.md).
L'environnement de travail habituel n'a pas accès à plusieurs de ces sites (CNIL, Légifrance…) : ce script tourne dans
GitHub Actions (.github/workflows/lire-source.yml), à la demande, et son résultat se lit dans le journal de l'exécution.
Il ne lit que les sites officiels de la liste OFFICIELS et n'écrit rien dans le dépôt.

Usage : python3 scripts/lire_source.py <adresse> [mots à chercher, séparés par |]
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

# Sites officiels (et leurs sous-domaines) des quatre pays et de l'Union européenne. « gouv.fr » est réservé aux
# services de l'État (Légifrance, impots.gouv.fr, entreprendre.service-public.gouv.fr…).
OFFICIELS = (
    "gouv.fr", "cnil.fr", "service-public.fr", "urssaf.fr",
    "inpi.fr", "banque-france.fr", "europa.eu", "gov.uk", "legislation.gov.uk", "ico.org.uk", "irs.gov", "ftc.gov",
    "canada.ca", "gc.ca", "revenuquebec.ca", "iana.org", "fnfe-mpe.org",
)
LIMITE = 20_000_000          # octets lus au plus
PASSAGE = 600                # caractères affichés de part et d'autre d'un mot trouvé
PASSAGES_PAR_MOT = 8
DEBUT = 8000                 # caractères affichés quand aucun mot n'est cherché
LIENS = 20                   # liens affichés au plus


def autorise(url):
    """Vrai si l'adresse est en https et sur un site officiel de la liste (ou un de ses sous-domaines)."""
    parts = urllib.parse.urlsplit(url)
    host = (parts.hostname or "").lower()
    return parts.scheme == "https" and any(host == d or host.endswith("." + d) for d in OFFICIELS)


class _Texte(html.parser.HTMLParser):
    BLOCS = {"p", "div", "br", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "table", "dd", "dt"}

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


def texte(contenu, type_contenu, base=""):
    """Texte lisible d'une page HTML ou d'un PDF, espaces et lignes vides resserrés, et liens de la page (adresse
    complète, texte) : un PDF n'en a pas ici."""
    liens = []
    if "pdf" in type_contenu or contenu[:5] == b"%PDF-":
        from pypdf import PdfReader  # installé par le workflow
        brut = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(contenu)).pages)
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


def passages(txt, mots):
    """Passages autour de chaque mot cherché, chevauchements fusionnés."""
    out = []
    for mot in mots:
        motif = _motif(mot)
        zones = []
        for m in motif.finditer(txt):
            debut, fin = max(0, m.start() - PASSAGE), min(len(txt), m.end() + PASSAGE)
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


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    url = sys.argv[1].strip()
    mots = [m.strip() for m in (sys.argv[2] if len(sys.argv) > 2 else "").split("|") if m.strip()]
    if not autorise(url):
        sys.exit(f"Adresse refusée : seuls les sites officiels en https sont lus ({', '.join(OFFICIELS)}).")
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (outils-freelance, verification de sources)",
                                                   "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"})
    try:
        with urllib.request.urlopen(request, timeout=60) as reponse:
            contenu = reponse.read(LIMITE)
            final, statut, type_contenu = reponse.geturl(), reponse.status, reponse.headers.get("Content-Type", "")
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
    if not mots:
        print("\n" + txt[:DEBUT] + ("\n[…]" if len(txt) > DEBUT else ""))
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
