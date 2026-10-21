#!/bin/sh
# Télécharge axe-core (moteur de règles d'accessibilité de Deque, licence MPL 2.0), en version fixée, pour l'audit
# WCAG 2.1 AA du parcours navigateur, dans le dossier donné (par défaut ~/.cache/axe-core).
# Usage : sh tests/e2e/installer-axe.sh [dossier]   puis   AXE_CORE=<dossier> node tests/e2e/verifier.mjs …
set -e
DIR="${1:-$HOME/.cache/axe-core}"
VERSION=4.14.0
mkdir -p "$DIR"
npm install --prefix "$DIR" --no-save --no-audit --no-fund --ignore-scripts "axe-core@$VERSION" >/dev/null
echo "axe-core $VERSION installé : $DIR"
