# Changelog

## v22 – 2026-11-27
Funzione nuova: felicità degli abitanti e tratti negativi.
- La **felicità** (ex "benessere") di ogni casa dipende ora da quattro bisogni: cibo (30), casa (25: caldo, legna, quiete, spazio), acqua (25) e chiesa (20, **solo dal livello 2**; ai livelli bassi il punteggio si calcola sugli altri tre). Il pannello casa e la scheda mostrano il dettaglio dei bisogni.
- Felicità per abitante: quella della casa, meno 15 se malato, meno il carattere. HUD: "Felicità" con media e numero di tristi.
- Conseguenze: sotto 35 si lavora all'80%; sotto 25 per un giorno e mezzo l'abitante **lascia il paese** (mai sotto gli 8 abitanti; ruolo e lavoro passano come alla morte).
- **Tratti negativi** (circa 35% degli abitanti, ereditabili dai genitori al 35%): Pigro (lavoro 60%), Cagionevole (malattie ×2), Brontolone (−18 felicità), Litigioso (−6 e abbassa la felicità dei familiari). Compaiono nella scheda e nel registro.
- Test: `tests/population.js` stampa felicità media, tristi, partenze e tratti.

## v21.3 – 2026-11-27
- Costruzione in parallelo: un cantiere con tutti i materiali ottiene subito almeno un costruttore, mentre gli altri abitanti continuano a portare materiali agli altri cantieri (prima si portava tutto e solo dopo si costruiva). Prova con 6 edifici: primo cantiere avviato dopo 28 s invece di 509 s, 6 edifici finiti entro 600 s invece di 3.

## v21.2 – 2026-11-27
- Correzione: taglialegna e cava restavano senza addetti perché ogni casa assegnava tutti i suoi adulti ai lavori di giardino/banco ("servizio"), e con molti bambini non restava nessun adulto libero. Ora, se un mestiere produttivo è scoperto, ogni casa lascia almeno un adulto libero per il lavoro.

## v21.1 – 2026-11-27
- Etichetta della versione accanto al titolo in alto a sinistra (letta da `VERSION` durante la build). `build.sh` genera anche `dist/artifact.html` per la pagina claude.ai.

## v21 – 2026-11-27
Unione di due linee sviluppate in chat parallele a partire dalla v19 (la v18 e la v19 non erano mai state caricate qui).
- Da v18: controlli touch/mobile (gesti a due dita, barra di conferma ✓/✕, layout adattivo).
- Da v19: sentieri a 4 livelli di usura.
- Popolazione: malattie (febbre, flusso, peste) con contagio, immunità e cura all'**Ospizio** (erborista entro 45 celle); epidemie; quarantena.
- Famiglie: mestiere ereditato dal capofamiglia (a 14 anni), eredità della casa, uscita dalla casa dei genitori, registro per ogni abitante.
- **Scheda** dell'abitante (nome, famiglia, nascita, genitori, figli, registro eventi).
- Editti (ora 6): vieta avanzamento, blocca immigrazione, bonus nascite, scuola obbligatoria, quarantena, obbligo di legna.
- Benessere (0–100) per casa; la **legna da ardere per casa** (fabbisogno 4 in autunno/inverno, 2 altrove) conta nel benessere.
- Tempo: 1 anno di vita = 240 s; "annata" = 10 anni di vita.
- Da altra chat: ~35% di case con giardino "puro" (non diventano allevamento né bottega); la legna la raccolgono le case col giardino della legna (almeno ~30%), le altre la comprano al mercato; l'editto di obbligo di legna fa raccogliere tutti; fix del pulsante musica (perdeva lo stato "on").
- Correzioni: pannelli di locanda e scuola oscurati dal ramo generico; `<meta viewport>` duplicato; test rimessi in funzione (finto DOM aggiornato).
- Note: bilanciamento da rivedere (legna in forte eccesso, molti bambini). Parte grafica/UI verificata solo con DOM finto, non in un browser WebGL.


## v17.1 – 2026-11-27
- Correzione per `index.html` standalone: mancava il reset `[hidden]` (aggiunto dalla piattaforma solo alla pagina pubblicata), quindi il pannello "Continua" restava sempre visibile, bloccava i clic e faceva avanzare i livelli a ogni clic. Aggiunti anche doctype, charset e viewport.

## v17 – 2026-11-27
- Il giardino ampliato di una casa segue la coltura del giardino (galline ora visibili nelle espansioni).
- Specializzazioni: a ogni salita di livello la casa può cambiare ruolo (allevamento, telaio, artigiano, sarto, panificio) con controllo di domanda e saturazione; ruoli in eccesso tornano al giardino.

## v16 – 2026-11-26
- Editti (📜): "Vieta l'avanzamento delle Case", "Blocca l'immigrazione", emissione e ritiro.
- Età per ogni abitante, nascite, crescita e morte; scuola con maestro; cimitero costruibile solo dal pannello della chiesa.
- Soglia di espansione del giardino a 3 celle piccole.

## Fino a v15 (sintesi)
- Griglia 192×192, zone, strade che nascono dai passaggi, trasporto fisico dei materiali, lavori e zone di lavoro, magazzini, fattorie, mercato con baratto, stagioni, locanda, filiera tessile, decorazioni, pozzo 2×2, rotazione edifici con ingresso, case con giardino a 4 livelli e 16 aspetti.
