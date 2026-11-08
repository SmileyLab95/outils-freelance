"""Tests de scripts/calendriers.py (python3 -m unittest discover -s tests/scripts) : échéances Urssaf du calendrier
français, relues le 08/11/2026 sur entreprendre.service-public.gouv.fr (F23257, A19087)."""
import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
import calendriers as C  # noqa: E402


class EcheanceUrssaf(unittest.TestCase):
    def test_report_au_jour_ouvre(self):
        self.assertEqual(C.echeance_urssaf(date(2027, 7, 31)), date(2027, 8, 2), "samedi 31/07/2027 → lundi 02/08")
        self.assertEqual(C.echeance_urssaf(date(2027, 4, 30)), date(2027, 4, 30), "vendredi : pas de report")
        self.assertEqual(C.echeance_urssaf(date(2027, 10, 31)), date(2027, 11, 2), "dimanche puis 1er novembre férié")

    def test_exception_du_31_octobre_2026(self):
        self.assertEqual(C.echeance_urssaf(date(2026, 10, 31)), date(2026, 10, 31), "A19087 : samedi maintenu")
        self.assertEqual(C.jour_ouvre(date(2026, 10, 31)), date(2026, 11, 2), "la règle générale reporterait au 2/11")


class CalendrierFrance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.events = C.france()

    def by_period(self, period):
        return [e["date"] for e in self.events if e.get("period") == period]

    def test_septembre_et_3e_trimestre_2026(self):
        self.assertEqual(self.by_period("2026-09"), ["2026-10-31"])
        self.assertEqual(self.by_period("2026-T3"), ["2026-10-31"])

    def test_changement_de_periodicite_avant_le_31_octobre(self):
        rythme = [(e["date"], e["title"]) for e in self.events if e["title"].startswith("Changer de rythme")]
        self.assertEqual([d for d, _ in rythme], ["2026-10-31", "2027-10-31"])
        self.assertIn("2027", rythme[0][1])
        self.assertIn("2028", rythme[1][1])

    def test_echeances_avant_les_informations_du_meme_jour(self):
        jour = [e["kind"] for e in self.events if e["date"] == "2026-10-31"]
        self.assertEqual(jour[-1], "info", jour)
        self.assertNotIn("info", jour[:-1])

    def test_cfe_sans_date_de_publication_non_sourcee(self):
        textes = " ".join(e["desc"] for e in self.events if e["tag"] == "CFE")
        self.assertNotIn("novembre dans", textes)
        self.assertNotIn("mi-novembre", textes)
        self.assertIn("avant-dernière année", textes)


if __name__ == "__main__":
    unittest.main()
