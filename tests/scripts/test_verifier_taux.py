"""Tests de scripts/verifier_taux.py (python3 -m unittest discover -s tests/scripts) : réponses simulées des trois
sources, au format lu le 30/10/2026."""
import contextlib
import io
import json
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
import verifier_taux as V  # noqa: E402

SOURCES = json.loads(V.RULES.read_text(encoding="utf-8"))["values"]["fx_reference_sources"]["value"]
CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "text/csv"}


def ecb(currencies):
    head = "KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE,OBS_STATUS,TITLE_COMPL\n"
    rows = "".join(f'EXR.D.{c}.EUR.SP00.A,D,{c},EUR,SP00,A,2026-10-29,1.2345,A,"ECB reference exchange rate, {c}/Euro"\n'
                   for c in currencies)
    return (head + rows).encode()


def hmrc(currencies):
    head = "Country/Territories,Currency,Currency Code,Currency Units per £1,Start date,End date\n"
    return (head + "".join(f"Pays,Monnaie,{c},1.2345,01/10/2026,31/10/2026\n" for c in currencies)).encode()


def boc(currency, value="1.3960"):
    return json.dumps({"observations": [{"d": "2026-10-30", f"FX{currency}CAD": {"v": value}}]}).encode()


class VerifierTaux(unittest.TestCase):
    def run_with(self, answer):
        """Lance le contrôle du 30/10/2026 ; answer(url) renvoie (statut, en-têtes, corps). Renvoie (code, sortie, adresses)."""
        urls = []

        def fake(url):
            urls.append(url)
            return answer(url)

        out = io.StringIO()
        with mock.patch.object(V, "fetch", fake), contextlib.redirect_stdout(out):
            code = V.main(["2026-10-30"])
        return code, out.getvalue(), urls

    def good(self, url):
        if "ecb.europa.eu" in url:
            return 200, CORS, ecb([c for c in SOURCES["currencies"] if c != "EUR"])
        if "trade-tariff" in url:
            return 200, CORS, hmrc([c for c in SOURCES["currencies"] if c != "GBP"])
        currency = url.split("/observations/FX")[1][:3]
        return 200, {"Access-Control-Allow-Origin": "*"}, boc(currency)

    def test_tout_va_bien(self):
        code, out, urls = self.run_with(self.good)
        self.assertEqual(code, 0, out)
        self.assertIn("0 problème(s)", out)
        self.assertEqual(len(urls), 1 + 1 + 17, "BCE et HMRC en une demande, Banque du Canada par devise")
        self.assertIn("D.USD+GBP+CAD+", urls[0], "toutes les devises sauf l'euro, en une demande")
        self.assertIn("startPeriod=2026-10-16&endPeriod=2026-10-30", urls[0], "fenêtre de 14 jours")
        self.assertTrue(urls[1].endswith("monthly_csv_2026-10.csv"))
        self.assertFalse(any("FXCADCAD" in u for u in urls), "pas de taux du dollar canadien en dollars canadiens")

    def test_lecture_par_un_autre_site_refusee(self):
        def answer(url):
            status, headers, body = self.good(url)
            return (status, {"Content-Type": "text/xml"}, body) if "ecb" in url else (status, headers, body)
        code, out, _ = self.run_with(answer)
        self.assertEqual(code, 1)
        self.assertIn("BCE : lecture par un autre site non autorisée (None)", out)

    def test_devise_manquante_et_format_change(self):
        def answer(url):
            if "ecb" in url:
                return 200, CORS, ecb(["USD", "GBP"])
            if "trade-tariff" in url:
                return 200, CORS, b"Country,Code,Rate\nUSA,USD,1.3\n"
            if "FXJPYCAD" in url:
                return 200, CORS, json.dumps({"observations": []}).encode()
            if "FXKRWCAD" in url:
                return 200, CORS, b'{"seriesDetail": {}}'
            return self.good(url)
        code, out, _ = self.run_with(answer)
        self.assertEqual(code, 1)
        self.assertIn("BCE : aucun taux depuis le 2026-10-16 pour AUD, BRL, CAD", out)
        self.assertIn("HMRC : colonnes Currency Code", out)
        self.assertIn("Banque du Canada : aucun taux depuis le 2026-10-16 pour JPY", out)
        self.assertIn("Banque du Canada : format inattendu pour KRW", out)

    def test_erreur_du_serveur_et_rapport(self):
        def answer(url):
            return (503, {}, b"maintenance") if "trade-tariff" in url else self.good(url)
        code, out, _ = self.run_with(answer)
        self.assertEqual(code, 1)
        self.assertIn("HMRC : réponse 503", out)
        with mock.patch.object(V, "fetch", answer), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(V.main(["--rapport", "2026-10-30"]), 0, "--rapport n'échoue pas")

    def test_lectures(self):
        self.assertEqual(V.ecb_currencies(ecb(["USD"])), {"USD"})
        self.assertIsNone(V.ecb_currencies(b"a,b\n1,2\n"))
        self.assertEqual(V.hmrc_currencies(hmrc(["USD", "CHF"])), {"USD", "CHF"})
        self.assertTrue(V.boc_has_rate(boc("USD"), "USD"))
        self.assertFalse(V.boc_has_rate(boc("USD", "0"), "USD"), "taux nul refusé")
        self.assertIsNone(V.boc_has_rate(b"<html>", "USD"))


if __name__ == "__main__":
    unittest.main()
