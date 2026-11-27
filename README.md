# Borgo Vivo

City builder medievale in un unico file HTML (Three.js). Disegni i quartieri e gli edifici principali; strade e case nascono da sole.

## Struttura
- `src/head.html` – CSS, interfaccia e caricamento di Three.js
- `src/sim.js` – simulazione (senza grafica, testabile con Node)
- `src/render.js` – grafica 3D e pannelli
- `build.sh` – unisce tutto in `index.html` (il gioco completo, pronto per GitHub Pages)
- `tests/` – test di simulazione e smoke test del rendering
- `docs/macro-argomenti.md` – mappa del progetto per argomenti
- `CHANGELOG.md` – cosa cambia a ogni versione

## Sviluppo
```
./build.sh                       # genera index.html
node tests/smoke-render.js       # il rendering parte senza errori (usa dist/all.js)
node tests/life-school-edicts.js # nascite, scuola, cimitero, editti (lento)
node tests/specialization.js     # specializzazioni delle case
```
Dopo ogni modifica: `./build.sh`, aggiornare `CHANGELOG.md`, commit.

## Pubblicazione
`index.html` è già a posto per GitHub Pages (Settings → Pages → ramo `main`, cartella root; serve un repository pubblico o un piano che lo consenta).
