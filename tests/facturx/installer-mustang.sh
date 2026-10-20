#!/bin/sh
# Télécharge le validateur Factur-X de référence Mustang (Mustang-CLI, licence Apache 2.0, avec veraPDF pour le
# PDF/A) et ses dépendances depuis Maven Central (miroir Google), dans le dossier donné (par défaut ~/.cache/mustang).
# Usage : sh tests/facturx/installer-mustang.sh [dossier]   puis   MUSTANG_LIB=<dossier>/lib python3 tests/facturx/valider.py …
set -e
DIR="${1:-$HOME/.cache/mustang}"
VERSION=2.26.0
mkdir -p "$DIR"
cat > "$DIR/settings.xml" <<XML
<settings><mirrors><mirror><id>google</id><mirrorOf>*</mirrorOf>
<url>https://maven-central.storage-download.googleapis.com/maven2/</url></mirror></mirrors></settings>
XML
cat > "$DIR/pom.xml" <<XML
<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion>
<groupId>local</groupId><artifactId>validateur</artifactId><version>1</version>
<dependencies><dependency><groupId>org.mustangproject</groupId><artifactId>Mustang-CLI</artifactId>
<version>$VERSION</version></dependency></dependencies></project>
XML
cd "$DIR"
mvn -q -s settings.xml -Dmaven.repo.local="$DIR/repo" dependency:copy-dependencies -DoutputDirectory=lib
echo "Mustang $VERSION installé : $DIR/lib"
