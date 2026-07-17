#!/bin/sh

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

if [ -n "$(git status --porcelain)" ]; then
  echo '{"systemMessage":"Git-Hinweis: Dieses Projekt enthält lokale, noch nicht committete Änderungen. Sie sind auf den anderen Macs noch nicht verfügbar."}'
  exit 0
fi

upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null) || exit 0
ahead=$(git rev-list --count "$upstream"..HEAD 2>/dev/null) || exit 0

if [ "$ahead" -gt 0 ]; then
  echo "{\"systemMessage\":\"Git-Hinweis: Dieses Projekt enthält $ahead noch nicht gepushte(n) Commit(s). Andere Macs erhalten sie erst nach git push.\"}"
fi
