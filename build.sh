#!/bin/sh
# Assembla il gioco in un unico file e controlla la sintassi.
set -e
cd "$(dirname "$0")"
mkdir -p dist
cat src/sim.js src/render.js > dist/all.js
node --check dist/all.js
printf '<!doctype html>\n<html lang="it">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">\n' > dist/index.html
cat src/head.html src/sim.js src/render.js >> dist/index.html
printf '\n</script>\n</html>\n' >> dist/index.html
cp dist/index.html index.html
echo "OK: index.html ($(wc -c < index.html) byte)"
