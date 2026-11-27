#!/bin/sh
# Assembla il gioco in un unico file e controlla la sintassi.
set -e
cd "$(dirname "$0")"
mkdir -p dist
cat src/sim.js src/render.js > dist/all.js
node --check dist/all.js
cat src/head.html src/sim.js src/render.js > dist/index.html
printf '\n</script>\n' >> dist/index.html
cp dist/index.html index.html
echo "OK: index.html ($(wc -c < index.html) byte)"
