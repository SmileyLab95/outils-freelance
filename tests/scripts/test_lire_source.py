"""Tests de scripts/lire_source.py (python3 -m unittest discover -s tests/scripts)."""
import contextlib
import io
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
import lire_source as L  # noqa: E402

PAGE = """<html><head><style>p{color:red}</style><script>var x = "opposition";</script></head><body>
<h1>Prospection</h1><p>Le droit d’opposition s’exerce sans frais.</p>
<ul><li><a href="/fr/utiliser-une-liste-repoussoir">Utiliser une liste <b>repoussoir</b> pour respecter l’opposition</a></li>
<li><a href="https://www.cnil.fr/fr/autre">Autre
   page</a> suivie d’un texte</li>
<li><a href="/fr/utiliser-une-liste-repoussoir">Liste repoussoir (doublon)</a></li></ul></body></html>"""


class LireSource(unittest.TestCase):
    def test_autorise(self):
        self.assertTrue(L.autorise("https://www.cnil.fr/fr/page"))
        self.assertTrue(L.autorise("https://bofip.impots.gouv.fr/bofip/1.html"))
        self.assertTrue(L.autorise("https://cnil.fr/"))
        self.assertTrue(L.autorise("https://entreprendre.service-public.gouv.fr/vosdroits/F23566"), "sites de l'État en gouv.fr")
        for url in ("https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/", "https://www.senat.fr/",
                    "https://www.assemblee-nationale.fr/dyn/17/textes", "https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp",
                    "https://www.bankofcanada.ca/rates/"):
            self.assertTrue(L.autorise(url), url)
        self.assertFalse(L.autorise("https://www2.opm.gov.exemple.com/"), "faux sous-domaine")
        self.assertFalse(L.autorise("https://gouv.fr.exemple.com/"))
        self.assertFalse(L.autorise("https://fauxgouv.fr/"))
        self.assertFalse(L.autorise("http://www.cnil.fr/"), "https seulement")
        self.assertFalse(L.autorise("https://cnil.fr.exemple.com/"), "faux sous-domaine")
        self.assertFalse(L.autorise("https://faux-cnil.fr/"), "nom qui se termine par un site officiel")
        self.assertFalse(L.autorise("https://exemple.com/?u=https://www.cnil.fr"))

    def test_texte_et_liens(self):
        txt, liens = L.texte(PAGE.encode("utf-8"), "text/html", "https://www.cnil.fr/fr/prospection")
        self.assertIn("Le droit d’opposition s’exerce sans frais.", txt)
        self.assertNotIn("color:red", txt)
        self.assertNotIn("var x", txt)
        self.assertEqual(liens[0], ("https://www.cnil.fr/fr/utiliser-une-liste-repoussoir",
                                    "Utiliser une liste repoussoir pour respecter l’opposition"))
        self.assertEqual(liens[1], ("https://www.cnil.fr/fr/autre", "Autre page"), "espaces resserrés, texte qui suit le lien exclu")
        trouves = L.liens_trouves(liens, ["repoussoir"])
        self.assertEqual(trouves, [("Utiliser une liste repoussoir pour respecter l’opposition",
                                    "https://www.cnil.fr/fr/utiliser-une-liste-repoussoir")], "sans doublon d'adresse")
        self.assertEqual(L.liens_trouves(liens, ["l'opposition"])[0][1], "https://www.cnil.fr/fr/utiliser-une-liste-repoussoir",
                         "apostrophe droite ou typographique")
        self.assertEqual(L.liens_trouves(liens, ["introuvable"]), [])

    def test_passages(self):
        txt = "a" * 2000 + " opposition " + "b" * 100 + " Opposition " + "c" * 2000
        mot, total, extraits = L.passages(txt, ["opposition"])[0]
        self.assertEqual((mot, total, len(extraits)), ("opposition", 2, 1), "deux mots proches : un seul passage")
        self.assertTrue(extraits[0].startswith("a") and extraits[0].endswith("c"))
        self.assertEqual(len(extraits[0]), L.PASSAGE * 2 + len(" opposition " + "b" * 100 + " Opposition ") - 2)
        self.assertEqual(L.passages("rien", ["opposition"]), [("opposition", 0, [])])

    def test_liens_sources(self):
        liens = [("https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038414258", "Code de commerce : article L441-1"),
                 ("https://entreprendre.service-public.gouv.fr/vosdroits/F31412", "Fiche voisine"),
                 ("https://exemple.com/", "Site privé"),
                 ("https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038414258", "Doublon"),
                 ("https://eur-lex.europa.eu/eli/dir/2011/83/oj", "Directive 2011/83/UE")]
        self.assertEqual(L.liens_sources(liens, "https://entreprendre.service-public.gouv.fr/vosdroits/F33527"), [
            ("Code de commerce : article L441-1", "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038414258"),
            ("Directive 2011/83/UE", "https://eur-lex.europa.eu/eli/dir/2011/83/oj")],
            "autres sites officiels seulement, sans la page lue ni site privé ni doublon")

    def test_main_tout_le_texte(self):
        long = "<p>" + "x" * (L.DEBUT + 10) + " fin du texte</p>"
        page = ("<html><body>" + long + '<a href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI1">Article L441-1</a>'
                "</body></html>").encode("utf-8")

        class Reponse(io.BytesIO):
            status, headers = 200, {"Content-Type": "text/html"}

            def geturl(self):
                return "https://www.cnil.fr/fr/page"

        def lire(mots):
            sortie = io.StringIO()
            with mock.patch.object(L.urllib.request, "urlopen", lambda *a, **k: Reponse(page)), \
                    mock.patch.object(sys, "argv", ["lire_source.py", "https://www.cnil.fr/fr/page", mots]), \
                    contextlib.redirect_stdout(sortie):
                L.main()
            return sortie.getvalue()

        tout = lire("*")
        self.assertIn("fin du texte", tout, "« * » : tout le texte, au-delà du début")
        self.assertIn("- Article L441-1 : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI1", tout)
        debut = lire("")
        self.assertNotIn("fin du texte", debut, "sans mot : le début seulement")
        self.assertIn("[…]", debut)
        self.assertNotIn("Liens vers d'autres sites officiels", debut)


if __name__ == "__main__":
    unittest.main()
