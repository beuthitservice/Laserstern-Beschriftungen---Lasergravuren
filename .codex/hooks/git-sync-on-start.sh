#!/bin/sh

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

if ! git fetch --prune; then
  echo "Git-Synchronisierung: Abruf von origin fehlgeschlagen. Vor Änderungen bitte die Verbindung oder Anmeldung prüfen."
  exit 0
fi

upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null) || {
  echo "Git-Synchronisierung: Der aktuelle Branch hat keinen Upstream; nur Remote-Daten wurden abgerufen."
  exit 0
}

if [ -n "$(git status --porcelain)" ]; then
  echo "Git-Synchronisierung: Lokale Änderungen vorhanden; automatisches Aktualisieren wurde sicherheitshalber übersprungen."
  exit 0
fi

if ! git merge-base --is-ancestor HEAD "$upstream"; then
  echo "Git-Synchronisierung: Lokaler und entfernter Branch sind auseinander gelaufen; keine automatische Änderung vorgenommen."
  exit 0
fi

if git merge-base --is-ancestor "$upstream" HEAD; then
  echo "Git-Synchronisierung: Repository ist aktuell."
  exit 0
fi

if git merge --ff-only "$upstream"; then
  echo "Git-Synchronisierung: Repository wurde per Fast-Forward aktualisiert."
else
  echo "Git-Synchronisierung: Fast-Forward fehlgeschlagen; keine lokalen Änderungen wurden verworfen."
fi
