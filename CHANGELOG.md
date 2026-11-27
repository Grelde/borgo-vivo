# Changelog

## v25 – 2026-11-27
Funzione nuova: **livello 5 (Palazzo)**. La qualità della zona decide il salto dal livello 4 al 5.
- Una Casa signorile (livello 4) diventa **Palazzo** (livello 5) solo se la zona ha qualità **ottima**: attrattiva 3 o più (la scritta "Ottima" del pannello). Restano richiesti, come sempre, i requisiti dei livelli precedenti (cibo, acqua, legna, chiesa, scuola vicina). Chiese, pozzi, piazze, statue e aiuole alzano la qualità; cave, miniere e taglialegna la abbassano.
- Palazzo: 7 abitanti, costo di miglioramento legno 8 e pietra 14, due modelli 3D (torri d'angolo con cono di ardesia e mastio; oppure ali con salone centrale e torrette).
- Cibo: per i livelli 3 e 4 servono 3 tipi di cibo (non 4): il numero cresce fino a 3.
- Pannello casa: nuovo indicatore "Zona" dal livello 4 e requisito nell'elenco "Per migliorare". Obiettivi dei livelli: le case di livello 5 contano anche per quelle di livello 2 e per le "due case signorili".
- Test: `tests/tier.js` verifica anche che nessuna casa passi al livello 5 senza qualità di zona (mappa lago, seme 7, 30 giorni con pozzo, chiesa, scuola, piazza: le case a livello 4 restano sotto 3 di attrattiva, quelle a livello 5 sono tutte sopra 3,6). Grafica verificata solo con DOM finto, non in un browser WebGL.

## v24 – 2026-11-27
Cambio di regole: requisiti per far salire di livello le case (cumulativi: ogni livello richiede anche quelli precedenti).
- **Capanna → Casa (livello 1):** almeno 1 tipo di cibo, acqua (pozzo entro 30 celle) e scorta di legna da ardere.
- **Casa → due piani (livello 2):** in più la chiesa vicina (54 celle) e 2 tipi di cibo.
- **Due piani → signorile (livello 3):** in più una scuola vicina (45 celle, nuova costante `SCHOOL_R`) e 3 tipi di cibo.
- Non bloccano più la salita: quiete della zona, attrezzo di ferro e caldo d'inverno (la legna resta richiesta). Il costo in materiali resta.
- Pannello casa: elenco "Per migliorare" e indicatori (Cibo con il numero di tipi, Scuola dal livello 3) aggiornati; suggerimenti di chiesa e scuola aggiornati.
- Grafica: quando il giardino si amplia, la staccionata segue il contorno di tutto il giardino (base + ampliamenti) e non resta più chiusa sul quadrato originale; le celle aggiunte hanno lo stesso aspetto del giardino base (orto a file, fiori nei giardini fissi), senza piastra di terra.
- Test: `tests/tier.js` (nessun salto senza i requisiti; senza scuola nessuna casa supera il livello 3). Grafica verificata solo con DOM finto e con un controllo geometrico della staccionata, non in un browser WebGL.

## v23 – 2026-11-27
Funzione nuova: la legna da ardere è una specializzazione del giardino. Sostituisce la "legnaia in giardino" della v22.1.
- Ogni giardino ha **una sola coltura**: orto, galline, allevamento oppure **legna da ardere**. Il giardino della legna non produce ortaggi né uova, e non diventa mai allevamento né bottega.
- Circa il 12% delle case (una ogni 8) ha il giardino della legna. Compare solo se esiste una zona mercato, dopo le prime due case, che coltivano cibo: la famiglia vive di baratto e parte con una piccola scorta di ortaggi. Prima era circa il 30%, ma con una sola merce che serve poco i giardini della legna restavano senza cibo.
- La legna la produce il giardino (come le altre colture): non c'è più la commissione verso gli alberi. Chi non ha il giardino della legna la compra al mercato. Pesca e caccia restano attività secondarie, indipendenti dal giardino, e la casa senza specializzazione ha attività secondaria "nessuna".
- **Cucina tutto l'anno**: fuori dall'inverno ogni casa brucia 1 legna ogni 2 giorni (d'inverno 1 al giorno come prima, per il caldo). Le case comprano legna al mercato in tutte le stagioni. Serve a dare ai giardini della legna una domanda che li sfami.
- Editto "obbligo di legna": ora raddoppia la scorta di legna voluta da ogni famiglia (che la compra al mercato); i giardini della legna ne accumulano fino a 20. Non fa più raccogliere nessuno.
- Grafica: il giardino della legna ha catasta con tettoia, ceppo con ascia, tronchi sparsi e alberelli al posto di orto o galline (anche nelle celle di ampliamento); il pannello casa riporta "legna da ardere" come giardino. Tolta la legnaia aggiunta in v22.1.
- Misura (`tests/legna.js`, mappa lago, seme 7, 3 annate): 4 case su 27 con il giardino della legna, di cui al massimo 1 affamata; felicità media 88-89 (prima della modifica 94-95); legna totale 50-117 (prima circa 270-312); nessuna casa al freddo. Parte grafica/UI verificata solo con DOM finto, non in un browser WebGL.
- Note: nella prima annata molte case sono sotto la scorta di legna voluta (la flag "Legna" è spesso spenta); la felicità media resta qualche punto sotto la v22.1.

## v22.1 – 2026-11-27
Ritocco grafico (nessuna regola di gioco cambia).
- **Giardino fisso** (il ~35% di giardini che non diventano allevamento né bottega): staccionata chiara, bordo di fiori e un alberello da frutta, così si riconosce dall'alto. Il pannello casa dice "giardino fisso".
- **Casa col giardino della legna**: legnaia con tettoia e ceppo con ascia dentro il giardino (l'orto perde una fila per fare posto). Il pannello casa riporta "legnaia in giardino".
- Nessun guadagno dalla vendita della legna: resta baratto.

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
