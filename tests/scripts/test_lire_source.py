"""Tests de scripts/lire_source.py (python3 -m unittest discover -s tests/scripts)."""
import os
import sys
import unittest

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


if __name__ == "__main__":
    unittest.main()
