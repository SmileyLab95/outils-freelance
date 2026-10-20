"""Valide les fichiers factur-x.xml d'un dossier avec les fichiers officiels Factur-X (distribués par la bibliothèque de
référence factur-x) : schéma XSD du profil EN 16931, schematron EN 16931 et schematron des règles françaises BR-FR.
Les schematrons (XSLT 2.0) sont exécutés ici, en local, avec Saxon : rien n'est envoyé sur un serveur.

Prérequis : pip install factur-x saxonche   (outils de test, non publiés avec le site)
Usage : python3 tests/facturx/valider.py <dossier> [--controle]
  --controle : vérifie aussi que le validateur rejette des variantes volontairement fausses du jeu d'essai.
"""
import re
import sys
import tempfile
from pathlib import Path

import facturx
from lxml import etree
from saxonche import PySaxonProcessor

ROOT = Path(facturx.__file__).parent / "xsd_and_schematron"
SCHEMATRONS = {
    "EN 16931": ROOT / "facturx-en16931" / "FACTUR-X_EN16931.xslt",
    "BR-FR": ROOT / "cii-schematron-fr-ctc" / "BR-FR-Flux2-Schematron-CII.xslt",
}
SVRL = {"svrl": "http://purl.oclc.org/dsdl/svrl"}


def schematron(executables, path):
    """Erreurs (flag fatal ou error, ou sans flag) et avertissements de chaque schematron."""
    errors, warnings = [], []
    for name, exe in executables.items():
        report = etree.fromstring(exe.transform_to_string(source_file=str(path)).encode("utf-8"))
        for node in report.xpath("//svrl:failed-assert | //svrl:successful-report", namespaces=SVRL):
            text = " ".join("".join(node.xpath("svrl:text//text()", namespaces=SVRL)).split())
            item = f"{name} {node.get('id') or ''} : {text}"
            (warnings if node.get("flag") in ("warning", "information") else errors).append(item)
    return errors, warnings


# Variantes fausses : (fichier du jeu d'essai, description, remplacement) ; chacune doit être rejetée.
MUTATIONS = [
    ("franchise.xml", "note PMT absente (BR-FR-05)", lambda x: re.sub(r"<ram:IncludedNote><ram:Content>Indemnité[^<]*</ram:Content>"
                                                                       r"<ram:SubjectCode>PMT</ram:SubjectCode></ram:IncludedNote>", "", x)),
    ("franchise.xml", "numéro avec espace (BR-FR-02)", lambda x: x.replace("<ram:ID>F2026-001</ram:ID>", "<ram:ID>F 2026-001</ram:ID>", 1)),
    ("franchise.xml", "total faux (BR-CO-15)", lambda x: x.replace("<ram:GrandTotalAmount>1800.00", "<ram:GrandTotalAmount>1900.00")),
    ("franchise.xml", "ordre des éléments (XSD)", lambda x: x.replace("<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>", "")
     .replace("<ram:SpecifiedTradePaymentTerms>", "<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode><ram:SpecifiedTradePaymentTerms>")),
    ("franchise.xml", "BT-49 absent (BR-FR-12)", lambda x: re.sub(r"(<ram:BuyerTradeParty>.*?)<ram:URIUniversalCommunication>.*?"
                                                                  r"</ram:URIUniversalCommunication>", r"\1", x, flags=re.S)),
    ("franchise.xml", "franchise sans identifiant fiscal (BR-E-02)", lambda x: re.sub(r"<ram:SpecifiedTaxRegistration><ram:ID schemeID=\"FC\">"
                                                                                       r"\d+</ram:ID></ram:SpecifiedTaxRegistration>", "", x)),
    ("hors-ue.xml", "catégorie O avec numéro de TVA (BR-O-02)", lambda x: x.replace(
        "</ram:URIUniversalCommunication></ram:SellerTradeParty>",
        "</ram:URIUniversalCommunication><ram:SpecifiedTaxRegistration><ram:ID schemeID=\"VA\">FR40123456789</ram:ID>"
        "</ram:SpecifiedTaxRegistration></ram:SellerTradeParty>")),
    ("autoliquidation-ue.xml", "autoliquidation sans numéro de TVA du client (BR-AE-02)",
     lambda x: re.sub(r"<ram:SpecifiedTaxRegistration><ram:ID schemeID=\"VA\">DE\d+</ram:ID></ram:SpecifiedTaxRegistration>", "", x)),
]


def controle(executables, folder):
    """Chaque variante fausse doit être rejetée ; renvoie le nombre de variantes acceptées à tort."""
    missed = 0
    with tempfile.TemporaryDirectory() as tmp:
        for name, label, mutate in MUTATIONS:
            source = (folder / name).read_text(encoding="utf-8")
            bad = mutate(source)
            path = Path(tmp) / "variante.xml"
            path.write_text(bad, encoding="utf-8")
            rejected = bad != source and (bool(schematron(executables, path)[0]) or not xsd_ok(path))
            print(("✓ rejetée : " if rejected else "✗ ACCEPTÉE : ") + label)
            missed += not rejected
    return missed


def xsd_ok(path):
    try:
        facturx.xml_check_xsd(path.read_bytes(), flavor="factur-x", level="en16931")
        return True
    except Exception:
        return False


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    folder = Path(args[0] if args else "facturx-xml")
    files = sorted(folder.glob("*.xml"))
    failures = 0
    with PySaxonProcessor(license=False) as proc:
        xslt = proc.new_xslt30_processor()
        executables = {name: xslt.compile_stylesheet(stylesheet_file=str(path)) for name, path in SCHEMATRONS.items()}
        for f in files:
            problems = []
            try:
                facturx.xml_check_xsd(f.read_bytes(), flavor="factur-x", level="en16931")
            except Exception as e:  # message détaillé de la bibliothèque
                problems.append("XSD : " + " ".join(str(e).split()))
            errors, warnings = schematron(executables, f)
            problems += errors
            print(("✗ " if problems else "✓ ") + f.name)
            for p in problems:
                print("   " + p[:400])
            for w in warnings:
                print("   (avertissement) " + w[:300])
            failures += bool(problems)
        print(f"\n{len(files) - failures}/{len(files)} fichiers conformes (XSD, EN 16931 et règles françaises).")
        missed = controle(executables, folder) if "--controle" in sys.argv else 0
    sys.exit(1 if failures or missed or not files else 0)


if __name__ == "__main__":
    main()
