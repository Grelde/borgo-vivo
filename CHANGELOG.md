# Changelog

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
