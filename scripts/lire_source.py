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

# Sites officiels (et leurs sous-domaines) des quatre pays et de l'Union européenne.
OFFICIELS = (
    "cnil.fr", "legifrance.gouv.fr", "impots.gouv.fr", "service-public.fr", "urssaf.fr", "economie.gouv.fr",
    "inpi.fr", "banque-france.fr", "europa.eu", "gov.uk", "legislation.gov.uk", "ico.org.uk", "irs.gov", "ftc.gov",
    "canada.ca", "gc.ca", "revenuquebec.ca", "iana.org", "fnfe-mpe.org",
)
LIMITE = 20_000_000          # octets lus au plus
PASSAGE = 600                # caractères affichés de part et d'autre d'un mot trouvé
PASSAGES_PAR_MOT = 8
DEBUT = 8000                 # caractères affichés quand aucun mot n'est cherché


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

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg"):
            self.cache += 1
        elif tag in self.BLOCS:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg"):
            self.cache = max(0, self.cache - 1)
        elif tag in self.BLOCS:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.cache:
            self.parts.append(data)


def texte(contenu, type_contenu):
    """Texte lisible d'une page HTML ou d'un PDF ; espaces et lignes vides resserrés."""
    if "pdf" in type_contenu or contenu[:5] == b"%PDF-":
        from pypdf import PdfReader  # installé par le workflow
        brut = "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(contenu)).pages)
    else:
        parser = _Texte()
        parser.feed(contenu.decode("utf-8", errors="replace"))
        brut = "".join(parser.parts)
    lignes = [" ".join(ligne.split()) for ligne in brut.splitlines()]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lignes)).strip()


def passages(txt, mots):
    """Passages autour de chaque mot cherché (sans tenir compte des majuscules), chevauchements fusionnés."""
    out = []
    for mot in mots:
        zones = []
        for m in re.finditer(re.escape(mot), txt, flags=re.IGNORECASE):
            debut, fin = max(0, m.start() - PASSAGE), min(len(txt), m.end() + PASSAGE)
            if zones and debut <= zones[-1][1]:
                zones[-1][1] = fin
            else:
                zones.append([debut, fin])
        out.append((mot, len(re.findall(re.escape(mot), txt, flags=re.IGNORECASE)), [txt[a:b] for a, b in zones[:PASSAGES_PAR_MOT]]))
    return out


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
    txt = texte(contenu, type_contenu.lower())
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


if __name__ == "__main__":
    main()
