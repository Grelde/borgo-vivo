#!/bin/sh
# Controlla lo stato di Git PRIMA di lavorare: versione corrente, ultimo commit, se il remoto è avanti.
# Uso: ./scripts/stato.sh   (da eseguire all'inizio di ogni sessione)
cd "$(dirname "$0")/.."
git fetch origin --quiet 2>/dev/null || echo "ATTENZIONE: fetch non riuscito (rete?)"
BR=$(git rev-parse --abbrev-ref HEAD)
echo "Branch: $BR"
echo "VERSION (file): $(cat VERSION)"
echo "Ultima voce del CHANGELOG: $(grep -m1 '^## v' CHANGELOG.md)"
echo "Ultimo commit locale: $(git log -1 --format='%h %ad %s' --date=iso)"
if git rev-parse "origin/$BR" >/dev/null 2>&1; then
  AHEAD=$(git rev-list --count "origin/$BR..HEAD"); BEHIND=$(git rev-list --count "HEAD..origin/$BR")
  echo "Rispetto a origin/$BR: avanti $AHEAD, indietro $BEHIND"
  [ "$BEHIND" -gt 0 ] && echo ">> Il remoto ha novità: fai 'git pull --rebase' prima di modificare."
fi
echo "index.html aggiornato rispetto ai sorgenti? $( [ index.html -nt src/sim.js ] && [ index.html -nt src/render.js ] && [ index.html -nt src/head.html ] && echo sì || echo 'NO: lancia ./build.sh' )"
