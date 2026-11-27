# Changelog

## v35 – 2026-11-27
Funzione nuova: edifici lavorativi, assi di legno e ovile con pastori.
- **Assi di legno:** terzo materiale di cantiere (chip "Assi" in alto, costo con swatch giallo). La **Falegnameria** trasforma 1 legno in 2 assi ogni 6 s per falegname (scorta max 24; non consuma l'ultimo legno se il magazzino è sotto 10, salvo cantieri che aspettano assi). Servono a scuola, ospizio, chiesa, mulino, locanda, magazzino (e alle nuove botteghe, taverna e sala). **Senza falegnameria le assi si pagano in legno** (2 legni per asse), quindi nessun cantiere si blocca; il costo si fissa quando si piazza l'edificio.
- **Bottega del muratore:** i muratori portano i materiali ai cantieri e costruiscono il 60% più in fretta.
- **Botteghe vere, più produttive di quelle dei giardini** (ogni addetto lavora a cicli dentro l'edificio, la merce resta in magazzino e un addetto la porta alle case che ne hanno più bisogno entro 135 celle): **Fucina del fabbro** (1 ferro → 3 attrezzi ogni 10 s), **Forno del panettiere** (1 farina → 3 pane ogni 8 s), **Telaio del tessitore** (1 lana → 2 tessuto ogni 9 s), **Sartoria** (1 tessuto → 2 abiti ogni 10 s), **Capanna del pescatore** (2 pesci ogni 7 s; serve acqua vicina; non d'inverno col ghiaccio), **Capanna del cacciatore** (2 carne ogni 8 s; serve un bosco fitto; dimezzata d'inverno). La bottega di un giardino produce 1 pezzo ogni ~30 s: l'edificio rende da 3 a 7 volte tanto.
- **Ovile costruibile dal giocatore**, con pastori (prima nasceva solo dalle famiglie, senza addetti propri): il pastore porta le pecore al pascolo e produce la lana per il telaio. Servono celle di zona Pascolo libere intorno. Gli ovili fondati dalle famiglie restano serviti dai loro membri.
- **Taverna** (taverniere: +4 felicità entro 36 celle) e **Sala delle feste** (musicante: +6 entro 45 celle), solo se hanno addetti.
- **Effetti in casa:** con attrezzi in casa il giardino rende il 10% in più; dal livello 3 gli abiti danno +3 di felicità.
- Interfaccia: nuova categoria **Botteghe** nel menu; modelli 3D per ogni edificio; pannelli con addetti, merce pronta e motivo se non producono; il cantiere mostra le assi portate.
- Test: `tests/workshops.js` (simulazione: assi, muratori, fucina, forno, ovile+telaio+sartoria, pesca, caccia, taverna e sala) e `tests/workshops-render.js` (modelli e pannelli con DOM finto); gli altri test restano verdi. Grafica non provata in un browser WebGL.
- Limiti: le materie prime delle botteghe si prelevano in modo astratto (ferro e farina dalle scorte, lana dagli ovili entro 135 celle, tessuto dai telai) senza trasporto fisico; rese e scorte sono stime da tarare.

## v34.1 – 2026-11-27
Ritocco (solo grafica): sentieri curvi.
- I sentieri nati dal passaggio degli abitanti non si disegnano più come segmenti dritti a gradini tra celle: le celle in fila si ammorbidiscono (media coi vicini, due passate) e ogni tratto è una curva con tangente continua; capi e incroci restano fermi. Le diagonali ridondanti vengono ignorate.
- Valido per tutti e quattro i livelli. Le strade tracciate dal giocatore restano come prima. Nessuna regola di gioco cambia (`curveOn` in `src/render.js`).
- Provato su un percorso a gradini in un canvas reale (gradini → linea morbida, angolo arrotondato); nel gioco intero non provato in un browser WebGL.

## v34 – 2026-11-27
Funzione nuova (solo grafica e testi): carichi visibili per chi costruisce e per chi lavora al magazzino.
- **Chi costruisce va al magazzino a prendere i materiali:** la regola c'era già (magazzinieri, aiutanti e adulti senza lavoro vanno a mani vuote al magazzino, prelevano e portano il carico al cantiere); ora si vede. Nella scheda il ruolo dice "Va al magazzino a prendere il legno/la pietra per il cantiere" e poi "Porta il legno/la pietra al cantiere".
- **Carichi diversi:** il legno per un cantiere si porta come **assi** (fascio di tre tavole sulla spalla); il legno appena tagliato come **tronco** sulla spalla; la pietra per un cantiere e quella raccolta alla cava come **carretto di pietre**, spinto davanti con le ruote che girano; la pietra che il cavatore porta alla cava è un **sasso** in braccio; molto legno (3-4 pezzi) o il trasferimento tra magazzini va in un **carretto di tronchi**, il ferro in un **carretto di minerale**. Gli altri carichi (verdura, acqua, grano, legna da ardere ecc.) restano il blocchetto colorato di prima.
- **Stessa grafica per tutti:** il modello lo sceglie `loadKind()` dal carico e da ciò che l'abitante sta facendo, quindi magazzinieri e costruttori hanno gli stessi carichi. I pezzi nel carretto sono quelli raccolti (1-4); per cantiere e trasferimento il carretto è pieno.
- Nessuna regola di gioco cambia (`sim.js` cambia solo i testi di `roleText`). I modelli si creano alla prima volta che servono, per non appesantire chi non porta nulla.
- Nuovo test `tests/carichi.js`: tabella dei carichi e, su una partita di 6 giorni, controllo che sia i magazzinieri sia gli altri costruttori vadano al magazzino a mani vuote e portino al cantiere assi o carretto di pietre. Grafica non provata in un browser WebGL (i test di render usano un THREE finto): da guardare aprendo il gioco; misure e posizioni del carretto e delle assi sono stime da ritoccare a vista.

## v33 – 2026-11-27
Funzione nuova: lotti organici (casa + giardino non più rettangoli).
- **Forme del giardino:** a lato, a L, a ferro di cavallo, intorno alla casa (anello) o triangolare; la casa resta un rettangolo da 3×3 a 6×4. Il giardino iniziale ha 9-24 celle, forma specchiata/ruotata a caso.
- **Ingresso:** una cella libera accanto al lotto, di preferenza accanto alla casa e sulla/verso la strada già tracciata.
- **Ampliamento del giardino:** cresce da qualunque cella di bordo verso strada o vicini (fino a 3 celle), sempre entro 24 celle totali.
- **Produzione proporzionale alla grandezza:** il raccolto sale del 25% per ogni cella oltre le 9 (giardino da 24 celle = 4,75× uno da 9).
- **Grafica:** il blocco 3×3 (o 2×2 in scala, o 1 cella) più centrale regge orto/animali/bottega, le altre celle sono come gli ampliamenti; la staccionata ricalca la forma, si interrompe lungo la casa e davanti al cancello. Pannello: forma e celle del giardino.
- Test: `tests/lotti.js` riscritto (connessione, porta adiacente, 9-24 celle, varietà di forme, ingresso verso la strada). Grafica non verificata in un browser WebGL.

## v32 – 2026-11-27
Funzione nuova: bravura nei mestieri.
- Chi lavora in un edificio prende quel mestiere (come prima) e ne accumula **esperienza**: un livello ogni 1800 s di lavoro (circa 1,2 per annata), da Apprendista (0) a Maestro (4). Chi eredita il mestiere di famiglia parte da Praticante (1).
- Ogni livello dà **+12% di resa** nel proprio mestiere (taglio, cava, aratura, pascolo, piantagione, mulino); il maestro della scuola istruisce più in fretta.
- **Preferenza nei posti:** nell'assegnazione dei lavori chi è bravo in un mestiere è più portato a riprenderlo (bonus per livello) e meno propenso ad accettarne un altro; gli altri abitanti, di conseguenza, vengono scelti meno per quell'edificio finché c'è uno specialista libero. La bravura si conserva se si cambia mestiere.
- Scheda: sezione "Bravura" con livello e avanzamento; registro: "Diventa esperto/provetto/maestro...". Pannello Abitanti: bravura media e numero di maestri.
- Misura (`tests/population.js`, 4 annate): bravura media 0,9 dopo 2 annate e 1,3-1,4 dopo 3-4 (il ricambio generazionale la tiene bassa), nessun maestro in quella prova. Limiti: la preferenza agisce solo quando un posto si libera (nessuno viene spostato di mestiere in corso d'opera); l'infermeria e la locanda non hanno ancora un bonus di resa. Grafica non provata in un browser WebGL.

## v31.1 – 2026-11-27
Ritocco: mercato più affollato, banchi più piccoli.
- **Banchi 2×2 celle** (prima 3×3): il modello 3D è rimpicciolito (86%) e ora è chiaramente più piccolo di una casa.
- **Mercato più fitto:** i banchi si posano cella per cella (prima su una griglia a passo 2) e vicino al centro del mercato, con poca casualità: nella prova (`tests/mercato.js`, 40 giorni, 26 banchi) sono affiancati, senza spazio vuoto tra l'uno e l'altro. Restano posati solo dove c'è un accesso raggiungibile e senza bloccare l'ingresso di una casa.
- Nuovo test `tests/mercato.js` (tutti 2×2, nessuna cella occupata due volte, distanza media dal banco più vicino). `tests/legna.js` e gli altri test veloci invariati. Grafica non provata in un browser WebGL.

## v31 – 2026-11-27
Cambio di regole: vicinanza tra casa, lavoro e servizi.
- **Scontento da pendolarismo:** chi lavora a più di 30 celle da casa perde felicità (0,4 per cella oltre la soglia, al massimo 25).
- **Traslochi più comodi:** chi cerca casa (giovani adulti che escono dalla famiglia, nuovi arrivati) preferisce le case vicine al lavoro (o ai posti di lavoro liberi), al pozzo e alla chiesa (dal livello 2). Un adulto non capofamiglia che lavora lontano, o vive senza pozzo o chiesa vicini, può trasferirsi in una casa con posto libero più comoda (vantaggio minimo 2,5 punti, pausa di 4 giorni).
- Pannello Abitanti: "Casa e lavoro" (distanza media, quanti lavorano lontano). Scheda: distanza casa-lavoro con avviso.
- Misura (`tests/population.js`, 4 annate, stessa mappa con e senza traslochi): distanza media a fine prova 27 contro 30 celle; l'effetto dei traslochi è modesto perché poche case hanno posto libero. L'effetto principale è lo scontento. Grafica non provata in un browser WebGL.

## v30 – 2026-11-27
Cambio di regole: il CAP degli abitanti dipende dall'attrattiva.
- **CAP = posti delle case + bonus di attrattiva.** Attrattiva A = (felicità media/100) ÷ (1 + adulti senza lavoro/10): direttamente proporzionale alla felicità, inversamente al numero di adulti non impiegati (sani, né in un mestiere né in servizio). Bonus = A × 0,3 × posti delle case.
- Se i posti delle case sono finiti, i nuovi arrivati per attrattiva si sistemano in case già occupate, fino a +2 oltre il limite (sovraffollamento: meno spazio nella felicità, più malattie).
- Pannello Abitanti: "Posti nelle case", "Bonus di attrattiva", "Adulti senza lavoro", "Attrattiva"; `Abitanti x/y` usa il CAP totale.
- Misura (`tests/population.js`, 4 annate): bonus di soli 2-6 posti perché in quella mappa restano molti adulti senza lavoro (36-98): dare lavoro alza l'attrattiva. Le costanti `ATT_U` e `ATT_K` sono da tarare. Grafica non provata in un browser WebGL.

## v29 – 2026-11-27
Funzione nuova: case e giardini di dimensioni diverse; l'ingresso guarda la strada.
- **Case** da 3×3 fino a 6×4 celle (anche ruotate, quindi 4×6): le più piccole sono le più frequenti. Il modello 3D si allunga su un lato; se la lunghezza è 5 o 6 si affiancano due moduli (casa a schiera).
- **Giardini** che nascono da 3×3 a 4×4 e, salendo di livello, si allargano verso la strada fino a un massimo di **4×6 (24 celle)**. Il giardino con le piante, la bottega o la legna sta nell'angolo; le altre celle hanno lo stesso aspetto degli ampliamenti, e la staccionata le racchiude tutte.
- Casa e giardino sono due rettangoli affiancati e occupano solo le loro celle (prima un unico blocco 3×3 + 3×3).
- **Ingresso verso la strada:** se accanto alla casa (a due celle dal lato) c'è una strada o un sentiero, la porta si apre su quel lato, e il punto di costruzione viene preferito se la porta può guardare una strada. Con più lati vince quello con più strada.
- Pannello casa: mostra la dimensione della casa e il numero di celle del giardino (massimo 24).
- Test: `tests/lotti.js` (dimensioni nei limiti, nessuna cella occupata due volte, porta accanto alla casa, ingresso verso la strada nell'80% dei casi con una strada accanto: nella prova 16 su 17; l'unico caso contrario aveva la cella di porta sul lato della strada già occupata). Grafica verificata solo con DOM finto, non in un browser WebGL.

## v28 – 2026-11-27
Funzione nuova (solo interfaccia): **pannello dettagli Abitanti e Felicità**.
- Cliccando il chip **Abitanti** o il chip **Felicità** del cruscotto (anche da tastiera, Invio o Spazio) si apre una pergamena con due schede, che si aggiorna mentre il gioco gira. Si chiude con Chiudi, Esc o un clic fuori; se è aperta anche la scheda di un abitante, Esc chiude prima quella.
- **Abitanti:** totali su posti, bambini, adulti, istruiti, malati (☣ in epidemia), occupati; ripartizione per età, per mestiere e per livello di casa; nascite, viandanti diventati abitanti, partenze per infelicità, morti in tutto e per causa, trasferimenti tra case; elenco di tutti gli abitanti per famiglia con età, mestiere e felicità (clic sul nome = scheda abitante).
- **Felicità:** media, scontenti, malati, brontoloni e litigiosi; distribuzione in cinque fasce; media dei quattro bisogni delle case (cibo, casa, acqua, chiesa) con barre; quante case hanno ciascun problema (cibo, acqua, freddo, legna, rumore, sovraffollamento, chiesa lontana); un suggerimento sul bisogno più debole; i dieci più scontenti con il motivo.
- Nessuna regola di gioco cambia (`sim.js` invariato). Nuovo test `tests/pop-panel.js` (due schede su una partita vera: contenuto, lista completa, nomi resi innocui, aggiornamento e chiusura). Grafica verificata solo con DOM finto, non in un browser WebGL.

## v27 – 2026-11-27
Funzione nuova: botteghe del giardino ben visibili e aperte anche in un secondo momento.
- **Grafica:** il giardino che diventa bottega ha ora un piccolo laboratorio riconoscibile, con insegna colorata: **fabbro** (tettoia, fucina con fuoco, incudine su ceppo, martello, insegna ruggine), **panettiere** (forno a cupola con fuoco e camino, tavolo con pagnotte, insegna dorata), **tessitore** (telaio con tessuti colorati, balle di lana, insegna blu), **sarto** (tenda a strisce rosse e crema, manichino, rotoli di stoffa, insegna rossa). L'orto perde una fila per fare posto; pecore e galline si spostano.
- **Regole:** un giardino normale (non fisso, non della legna) può diventare bottega **anche dopo**, ogni giorno con probabilità 25%, appena la casa ha il livello e compare la filiera: fabbro dal livello 3 con una miniera, tessitore dal livello 3 con un ovile, sarto dal livello 4 se c'è un tessitore, panettiere dal livello 4 con un mulino. Prima la scelta avveniva solo nel momento del miglioramento.
- Pannello casa: indica il mestiere (fabbro, panettiere, tessitore, sarto) e, per chi non è ancora bottega, da quale livello e con quale filiera potrà diventarlo.
- Test: `tests/shops.js` (nessuna bottega prima del livello giusto né nei giardini fissi o della legna; dopo miniera, ovile e mulino compaiono fabbri, tessitori, sarti e panettieri). Grafica verificata solo con DOM finto, non in un browser WebGL.

## v26 – 2026-11-27
Funzione nuova: istruzione utile, chiesa nella giornata, giorno più lungo.
- **Istruzione:** chi sa leggere e scrivere lavora il 25% meglio (raccolta, giardino) e consuma meno cibo (25% dei pasti non toglie nulla dalla scorta). La scheda lo dice.
- **Chiesa nella giornata:** dal livello 2 (non più dal 4) ogni abitante va in chiesa una volta al giorno la sera, dopo il pozzo (dal livello 3). Chi ha pregato negli ultimi 2 giorni ha +6 di felicità.
- **Giorno più lungo:** `DAY` passa da 100 a 150 s, per dare tempo a scuola, pozzo, chiesa e cammino. Invecchiamento (`AGEY` 360 s per anno di vita, annata = 3600 s = 10 anni) e durata delle malattie seguono il giorno; produzione dei giardini, rischi di morte, malattie, contagio e immigrazione sono riportati ai ritmi per giorno di prima (`TK`). Le stagioni durano quindi 900 s a velocità 1.
- Test: `population.js` e `legna.js` usano `Sim.YEARL`. Confronto 4 annate, stessa mappa: popolazione finale 209 → 207, morti 84 → 80 (di fame 42 → 27), felicità media 68 → 78, partenze 13 → 4. Grafica non provata in un browser WebGL.

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
