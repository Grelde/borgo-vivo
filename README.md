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
- `VERSION` – numero della versione corrente
- `scripts/stato.sh` – controllo dello stato Git da fare all'inizio di ogni sessione
- `CLAUDE.md` – regole di lavoro e procedura di consegna

## Sviluppo
```
./build.sh                       # genera index.html
node tests/smoke-render.js       # il rendering parte senza errori (usa dist/all.js)
node tests/life-school-edicts.js # nascite, scuola, cimitero, editti (lento)
node tests/specialization.js     # specializzazioni delle case
node tests/save.js               # salvataggio: ciclo esporta/importa e salvataggi rovinati (lento)
node tests/save-render.js        # salvataggio lato interfaccia (richiede ./build.sh)
node tests/population.js         # malattie, eredità, editti (lento)
node tests/legna.js              # legna e giardini puri (lento)
node tests/commercio.js          # merceria, rotte e carovane (lento)
node tests/commercio-render.js   # grafica del commercio (DOM finto)
node tests/regno.js              # titoli del Re, progetti, predoni, caserma, guerra, salvataggi
node tests/guida.js              # guida dei cittadini: frasi per titolo, consigli urgenti, consigli spenti
```
Dopo ogni modifica: `./build.sh`, aggiornare `CHANGELOG.md`, commit.

## Pubblicazione
`index.html` è già a posto per GitHub Pages (Settings → Pages → ramo `main`, cartella root; serve un repository pubblico o un piano che lo consenta).
