"""Tests de scripts/verifier_regles.py (python3 -m unittest discover -s tests/scripts)."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
import verifier_regles as V  # noqa: E402


class Formes(unittest.TestCase):
    def test_nombres(self):
        self.assertEqual(V.formes(12570, "GBP"), [["12,570", "12 570", "12570", "12,570.00", "12 570,00"]])
        self.assertIn("3.50", V.formes(3.5, "GBP")[0], "deux décimales, comme sur les pages")
        self.assertIn("3,65", V.formes(3.65, "EUR")[0], "virgule décimale des pages françaises")
        self.assertIn("1 000 000", V.formes(1000000, "EUR")[0])

    def test_taux_et_centimes(self):
        self.assertEqual(V.formes(0.2, "rate")[0][:2], ["20%", "20 %"])
        self.assertIn("7.65%", V.formes(0.0765, "rate")[0])
        self.assertIn("25,6 %", V.formes(0.256, "rate")[0], "taux français")
        self.assertIn("55p", V.formes(0.55, "GBP")[0], "pence")
        self.assertIn("70 cents", V.formes(0.7, "USD")[0], "cents")
        self.assertEqual(V.formes(0, "rate"), [], "zéro : rien à chercher")
        self.assertIn("8.00%", V.formes(0.08, "rate")[0], "taux écrit avec deux décimales")
        self.assertIn("6.0%", V.formes(0.06, "rate")[0], "taux écrit avec une décimale")
        self.assertIn("110%", V.formes(1.1, "rate")[0], "coefficient de 110 %")
        self.assertIn("5.4%", V.formes({"max_credit": 0.054}, "USD")[0], "champ « credit »")
        abattements = V.formes({"vente": 0.71, "bnc": 0.34}, "object")
        self.assertIn("71 %", abattements[0], "fraction sans unité monétaire : en pourcentage")
        self.assertIn("0,71", abattements[0], "et telle quelle")
        bareme = V.formes([{"to": 5000, "rate": 0.37, "fixed": 0}], "EUR")
        self.assertIn("0,370", bareme[1], "coefficient du barème kilométrique, trois décimales")
        self.assertTrue(V.trouve("0,370", "3 CV et moins d x 0,370 4 CV"))
        penalites = V.formes({"fixed": 100, "after_6_months": {"rate": 0.05, "minimum": 300}}, "GBP")
        self.assertEqual([g[0] for g in penalites], ["100", "5%", "300"], "champ « rate » d'une règle en livres")

    def test_dates_et_structures(self):
        d = V.formes("2026-04-06", "date")[0]
        self.assertIn("6 April 2026", d)
        self.assertIn("April 6, 2026", d)
        self.assertIn("1er janvier 2027", V.formes("2027-01-01", "date")[0])
        self.assertIn("Sept. 15, 2026", V.formes("2026-09-15", "date")[0], "abréviations de l'IRS")
        self.assertEqual(V.formes("texte libre", "text"), [])
        tranches = V.formes([{"from": 0, "to": 37700, "rate": 0.2}], "brackets")
        self.assertEqual([g[0] for g in tranches], ["37,700", "20%"], "le 0 de départ n'est pas cherché")
        self.assertEqual(V.formes(True, "boolean"), [])


class Recherche(unittest.TestCase):
    def test_nombre_delimite(self):
        self.assertTrue(V.trouve("8%", "statutory interest is 8% plus base rate"))
        self.assertFalse(V.trouve("8%", "Top tax rate 48%"), "pas dans 48 %")
        self.assertFalse(V.trouve("50,000", "profits under £250,000"), "pas dans 250 000")
        self.assertFalse(V.trouve("3.5", "rate 3.50 a week"), "3.5 n'est pas trouvé dans 3.50")
        self.assertTrue(V.trouve("12 570", V.normaliser("jusqu'à 12 570 €")), "espace fine insécable")
        self.assertFalse(V.trouve("1er septembre", "effective depuis le 1er septembre 2026."), "date d'une autre année")
        self.assertFalse(V.trouve("September 1", "from September 1, 2026"), "date d'une autre année")
        self.assertTrue(V.trouve("31 January", "pay by 31 January each year"), "date sans année sur la page")
        self.assertTrue(V.trouve("5%", "a 5% penalty in 2026"), "taux suivi d'une année")
        self.assertEqual(V.statut({"value": "2027-09-01", "unit": "date"}, ["depuis le 1er septembre 2026"]),
                         ("MANQUE", ["1 September 2027"]))

    def test_contexte(self):
        self.assertEqual(V.contexte("8%", "Top rate 48%. Statutory interest is 8% plus base rate", 12), "interest is 8% plus base r", "12 caractères de part et d'autre")
        self.assertEqual(V.contexte("9%", "rate 8%"), "")

    def test_statut(self):
        regle = {"value": 12570, "unit": "GBP"}
        self.assertEqual(V.statut(regle, ["Personal Allowance £12,570"]), ("OK", []))
        self.assertEqual(V.statut(regle, ["Personal Allowance £12,500"]), ("MANQUE", ["12,570"]))
        self.assertEqual(V.statut(regle, [None, "… £12,570 …"]), ("OK", []), "une source illisible sur deux")
        self.assertEqual(V.statut(regle, [None]), ("ERREUR", []))
        self.assertEqual(V.statut(regle, []), ("NON OFFICIEL", []))
        self.assertEqual(V.statut({"value": "texte", "unit": "text"}, ["…"]), ("TEXTE", []))


class Officiel(unittest.TestCase):
    def test_sources(self):
        for url in ("https://www.gov.uk/income-tax-rates", "https://www.ssa.gov/oact/cola/cbb.html",
                    "https://www.courts.state.hi.us/", "https://www.pacourts.us/", "https://bills.parliament.uk/bills/4128",
                    "https://www.quebec.ca/entreprises", "https://www.irs.gov/x"):
            self.assertTrue(V.officiel(url), url)
        for url in ("https://taxfoundation.org/x", "https://www.taxjar.com/x", "https://irs.gov.exemple.com/",
                    "http://www.ssa.gov/", "https://www.ebglaw.com/x", ""):
            self.assertFalse(V.officiel(url), url)


if __name__ == "__main__":
    unittest.main()
