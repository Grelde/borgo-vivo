# Changelog

## v51 – 2026-11-28
Funzione nuova: tintoria (completa il punto 2 delle filiere: lino, canapa, corde, tessuti).
- **Coltura «tintorie»** (robbia e guado) fra le scelte della fattoria, accanto a grano, lino e canapa; i campi diventano rosati. I contadini portano le piante alla tintoria (senza tintoria raccolgono grano).
- **Tintoria** (sulla riva, 2 posti, 2 assi): 1 pianta + 1 pezza di tessuto del telaio (o della merceria) → 1 pezza tinta ogni 10 s. Scorta massima di piante 24.
- **Sarto:** con una pezza tinta cuce **3 abiti** invece di 2 (le pezze tinte hanno la precedenza).
- Salvataggi vecchi compatibili. Test: `tests/tintoria.js`.

## v50 – 2026-11-28
Funzione nuova: filiera del lino e della canapa (coltura nella fattoria, maceratoio, cordaio, corde).
- **Coltura per fattoria:** nel pannello della fattoria si sceglie Grano, Lino o Canapa (`b.crop`, salvata). Una fattoria a lino o canapa non dà grano alla famiglia; senza un maceratoio i contadini raccolgono comunque grano. I campi cambiano colore (blu lino, verde canapa).
- **Maceratoio** (sulla riva, 2 posti): i contadini portano gli steli, 1 stelo → 1 fibra ogni 8 s; scorta massima di steli 24.
- **Cordaio** (2 posti, 2 assi): 1 fibra di canapa → 3 corde ogni 9 s. Le corde vanno al magazzino (nuova merce, accettazione configurabile).
- **Telaio:** può lavorare anche la fibra di lino (1 fibra → 3 pezze di tessuto), senza ovile. La lana resta come prima.
- **Uso delle corde:** si vendono ai mercanti (Valmora 4, Porto Fiorito 7 denari) e rinforzano le riparazioni degli edifici (+50%, 1 corda per riparazione, non per le case).
- Salvataggi vecchi compatibili (fattorie senza coltura = grano, magazzini accettano le corde).
- Test: `tests/filiera-lino.js`.

## v49 – 2026-11-28
Funzione nuova: i cittadini guidano il giocatore per tutta la partita, e si può scegliere se farlo.
- **Scelta prima della partita:** nella schermata di lago/fiume, accanto alla difficoltà, «Consigli dei cittadini: sì» oppure «No, decido io». In partita il tasto 💬 nel pannello del titolo li accende e spegne; la scelta si salva con la partita.
- **Guida sempre presente:** per ogni titolo (8) c'è una frase. Ordine: allarmi (guerra, predoni) → consigli urgenti (fame, legna scarsa, epidemia, troppi malati senza ospizio, scontenti, legno o pietra finiti con cantieri in attesa, case piene, disoccupati, posti di lavoro vuoti, edifici logori senza attrezzi o senza fabbro, magazzino pieno, denari da spendere in rotte) → passi del titolo → nuovi progetti acquistabili → consigli a rotazione per titolo (cambiano ogni due giorni, con una frase di stagione).
- **Consigli spenti:** il pannello non dà suggerimenti; restano gli allarmi di guerra e predoni e i requisiti del Re (sono la regola del gioco, non un suggerimento). Le pergamene del messo restano sempre.
- Test: nuovo `tests/guida.js` (77 controlli: frase a ogni titolo e giorno, rotazione, consigli urgenti, consigli spenti con allarme di guerra).
- Non verificato in un browser WebGL: aspetto del tasto 💬 e della scelta nella schermata iniziale.

## v48 – 2026-11-28
Funzione nuova: la storia guida il giocatore (niente più livelli con obiettivi). Titoli del Re, progetti da comprare, predoni e guerra.
- **Niente più livelli.** Il pannello degli obiettivi è sostituito da una **guida narrata**: gli abitanti dicono cosa serve ("Servono legno e pietra… indicaci dove costruire il taglialegna"; poi la cava, il quartiere residenziale, ecc.). Sotto, in piccolo, "Il Re concederà il titolo di X quando:" con i requisiti e i conteggi. Su telefono il pannello si ripiega ma la frase della guida resta visibile.
- **Apertura:** dopo la scelta di lago o fiume compare una pergamena a voce degli abitanti: sono arrivati, hanno scelto te come guida, servono legno e pietra, poi indica dove costruire le case.
- **Titoli del Re** (8): Accampamento, Casale, Villaggio, Borgo, Borgo fortificato, Terra murata, Città, Capitale del Regno. Si ottengono con condizioni di stato (abitanti, edifici, assalti respinti, rotte aperte), non col tempo. A ogni titolo arriva **il messo del Re** con una pergamena (il gioco va in pausa) che annuncia il nuovo titolo e i progetti concessi.
- **Progetti del Re** (pulsante 🏛️, pergamena con i progetti per titolo): all'inizio sono disponibili solo quartiere residenziale, taglialegna, cava e strade; tutto il resto (pozzo, mercato, magazzino, chiesa, zone agricola/forestale/pascolo, botteghe, miniera, scuola, ospizio, locanda, merceria, telai, sala delle feste, piazza, decorazioni, torre e caserma) è un progetto da **comprare**. Si paga con risorse (legno, pietra) e, dal titolo di Terra murata, anche con **denari** (telai, sala delle feste, piazza, decorazioni). I progetti non scelti restano sempre acquistabili. La palette degli strumenti mostra solo ciò che si possiede (le categorie vuote spariscono); il cimitero (bottone della chiesa) è un progetto del Borgo.
- **Predoni** (dal titolo di Borgo): ogni 1,6-3 giorni una banda (2-6 uomini, secondo il titolo) arriva da un lato della mappa verso un magazzino, un granaio o una merceria, ruba legno, pietra e denari e fugge. Si ferma se almeno metà muore. Non uccidono abitanti né distruggono edifici.
- **Difesa:** nuova **Torre di guardia** (entro 24 celle tira 6 colpi al secondo al nemico più vicino; freccia visibile) e nuova **Caserma** (quando ci sono nemici manda fino a 3 soldati incontro a loro, uno ogni 5 s; finita la minaccia rientrano). Nessun addetto: non occupano abitanti.
- **Guerra del Re:** con il titolo di Città e abbastanza forza (110 abitanti, 3 case signorili, 3 rotte aperte) il Re dichiara guerra; tra 3 giorni arriva il suo esercito (10 uomini) e punta al centro del borgo. Se lo tiene abbastanza a lungo (assedio) il borgo perde il 40% di legno, pietra, ferro, assi e attrezzi e metà dei denari e il Re torna dopo 2 giorni (ondata più grande, +2). Se l'esercito è annientato, il giocatore diventa Re e il titolo è **Capitale del Regno** (pergamena finale). Durante la guerra i predoni non arrivano.
- **Salvataggi:** titolo, progetti, pergamene in attesa, predoni e guerra entrano nel salvataggio (stessi campi di `S`; `SAVE_FMT` resta 1). Un salvataggio della v47 si carica con il titolo che il borgo merita già e tutti i progetti dei titoli raggiunti e degli edifici già costruiti, senza pergamene e con i predoni rinviati di 3 giorni.
- **Modalità storia:** `Sim.init(seme,mode,difficoltà,{story:true})` (lo fa `begin()`); senza l'opzione (test) tutto è disponibile e non arrivano né messi né nemici, quindi i test esistenti non cambiano.
- Test: nuovo `tests/regno.js` (40 controlli: progetti e acquisti, titoli, predoni con e senza torri, caserma, guerra vinta e persa, salvataggi e salvataggi vecchi). `tests/save-render.js` adattato al titolo al posto del livello. Tutti i test passano.
- **Numeri di gioco da provare** (stima da simulazione con difese vicine al centro, nessuna partita vera): una torre non basta contro una banda del Borgo, due sì; contro l'esercito del Re bastano 3 torri e 1 caserma, 2 torri da sole perdono. Soglie dei titoli e prezzi dei progetti sono una prima ipotesi, da bilanciare giocando.
- Non verificato in un browser WebGL: pergamene, pannello Progetti, guida, modelli 3D di torre e caserma, truppe con barra della vita e frecce delle torri.

## v47 – 2026-11-28
Funzione nuova: manutenzione degli edifici con gli attrezzi del fabbro, secondo il livello di difficoltà scelto all'inizio.
- **Difficoltà (Facile, Normale, Difficile)** si sceglie nella schermata iniziale, prima di lago/fiume, e si salva con la partita (`S.diff`). I vecchi salvataggi ripartono in Facile.
- **Condizione 0-100** per ogni edificio finito (esclusi piazza, pozzo, fiori, statua, cimitero, banco, centro). Cala col tempo: 1,5 / 3 / 5 punti al giorno (Facile / Normale / Difficile).
- **Effetti:** sotto 60 si lavora all'85%, sotto 30 al 60%; a zero Facile lavora a metà ritmo, Normale al 15%, Difficile si ferma e l'edificio **crolla** (senza rimborso). Solo a Difficile crolla qualcosa.
- **Riparazione:** muratori e abitanti senza lavoro portano 1 attrezzo dal magazzino all'edificio più logoro (sotto 70) e lo riparano in 8 s (+30, i muratori +45). Le case usano gli attrezzi che hanno in dispensa. Senza attrezzi non si ripara: il fabbro diventa indispensabile.
- **Interfaccia:** riga «condizione» nel pannello dell'edificio, avviso quando un edificio è in rovina (sotto 25), nel pannello del villaggio edifici logori / riparazioni / difficoltà.
- Test: `tests/manutenzione.js`.

## v46 – 2026-11-27
Funzione nuova: regole dei cantieri (un costruttore alla volta finché mancano i materiali, costruzione che avanza con i materiali, il costruttore va a prenderli).
- **Un solo costruttore per cantiere finché mancano materiali.** Con tutti i materiali presenti si possono aggiungere fino a 3 costruttori, come prima. Il primo che arriva a un cantiere con materiali da usare ne diventa il costruttore.
- **La costruzione avanza man mano che arrivano i materiali:** l'avanzamento non supera mai la quota di materiali consegnati sul totale (legno, pietra e assi), e il cantiere si completa solo quando c'è tutto. Prima non si cominciava finché non era arrivato tutto.
- **Il costruttore va lui al magazzino:** quando ha usato i materiali presenti, prende un carico per il suo cantiere (a mani vuote al magazzino, poi col carico fino al cantiere) e torna a costruire. Se in magazzino non c'è nulla e nulla è in arrivo, dopo 8 s lascia il posto e riprende quando c'è materiale. Il viaggio conta come presenza sul cantiere, quindi nessun altro prende il suo posto.
- **Gli altri portano il materiale ai cantieri senza costruttore:** chi non costruisce (magazzinieri, aiutanti, adulti senza lavoro) serve prima i cantieri che non hanno ancora un costruttore, poi quelli che ne hanno già uno. Con più cantieri aperti: uno costruisce, gli altri portano il materiale agli altri cantieri, e chi porta il primo carico a un cantiere ne diventa il costruttore.
- Scheda dell'abitante: "Va al cantiere", "Costruisce", "Aspetta i materiali al cantiere", "Va al magazzino a prendere le assi/il legno/la pietra per il suo cantiere".
- Correzione ai carichi della v34: dopo la v35 le assi sono un materiale a parte, quindi il legno portato al cantiere è un **tronco** sulla spalla e il **fascio di assi** si vede solo per le assi vere.
- Test: nuovo `tests/cantieri.js` (massimo 1 costruttore su cantiere incompleto e 3 su completo, avanzamento mai oltre i materiali, viaggi del costruttore al magazzino, priorità ai cantieri senza costruttore, più cantieri completati); fallisce sul sim della v36. `tests/carichi.js` aggiornato. Tutti i test restano verdi, compresi `population` e `legna`.
- Effetto misurato su una partita di prova (seme fisso, quindi solo un'indicazione): dopo 12 giorni 85 abitanti e 19 case contro 71 e 17 della v36.1, e nel test di 10 giorni con 4 cantieri insieme 17-18 edifici completati contro 16. Il villaggio cresce più in fretta, quindi `tests/workshops.js` impiega circa il 30% in più (più abitanti da far camminare: nelle stesse condizioni 377 s contro 288 s); a parità di giorni simulati il costo per passo è circa il 10% più alto. Grafica non provata in un browser WebGL.
- Nota su `tests/workshops.js`: con queste regole il villaggio cresce circa il 7% di più (a parità di seme, 270 e 284 abitanti contro 252 e 266 al giorno 106) e le famiglie consumano più tessuto: la sartoria cuce meno (14 e 8 cicli contro 19 e 10 con seme fisso). In due esecuzioni non fissate sulla base v42.1 il controllo "la sartoria ha cucito" è fallito (0 cicli) mentre il telaio lavorava; con semi fissi non è successo, quindi è un caso limite sensibile al caso, non un blocco, ma è da tenere d'occhio. Tutti gli altri test restano verdi (`cantieri` ora è deterministico su 3 semi).

## v45.1 – 2026-11-27
Correzione: chi lavora al giardino della legna va davvero nel bosco a raccoglierla.
- **Problema (dalla v23):** il giardino della legna produceva da solo, quindi i familiari addetti restavano tutto il tempo in casa a "curare" un giardino che non serviva a nulla.
- **Ora:** la casa con il giardino della legna non produce legna in giardino. Chi se ne occupa (`duty`) esce di casa e va a raccogliere la legna nel bosco (prima nel folto, entro 64 celle, poi anche un albero isolato) e torna con un fascio da 3. Gli aiutanti che passano in un giardino della legna non la producono più "per magia". Le altre case continuano a comprarla al mercato.
- **Scorta:** la legna è il prodotto di queste case, quindi ne tengono fino a 24 (32 con l'editto "obbligo di legna"); le altre case restano a 12 (20 con l'editto). Quando la scorta è a meno di 2 pezzi dal limite gli addetti non vanno al bosco e restano a casa.
- **Prestazioni:** l'albero scelto è sempre lo stesso per una casa, quindi lo si ricorda; se non c'è un bosco raggiungibile (o il percorso fallisce) si riprova solo dopo 20-40 s. Senza questo il test `workshops` passava da 300 s a oltre 500 s.
- Testi: il ruolo dice "Va nel bosco a raccogliere la legna", "Raccoglie legna da ardere", "Porta la legna a casa"; il pannello casa e l'editto sono aggiornati.
- **Misura** (3 mappe, semi 7, 21, 33, 3 annate): i familiari delle case della legna passano il 19-28% del tempo di lavoro nel bosco (prima 0%), con 61-97 viaggi all'annata; il resto è banco e baratto, giardino e pause quando la scorta è piena. Nessuna casa al freddo, nessuna affamata (`tests/legna.js`: felicità 92-95; legna totale in casa 89-173 secondo la partita, più di prima perché le case della legna ne tengono 24).
- Test: tutti passano. `tests/festa.js` ha dato un fallimento su 6 esecuzioni (nessuno in piazza durante la festa) prima della correzione di prestazioni, poi 7 su 7 verdi come sul remoto puro; potrebbe dipendere dal seme casuale della v42.
- Limiti: la raccolta non consuma alberi; con poca domanda di legna il tempo nel bosco scende. Grafica non verificata in un browser WebGL.

## v45 – 2026-11-27
Funzione nuova: passaggi tra lotti che diventano giardino; bordi diagonali al posto della scaletta.
- **Passaggi inutilizzati:** ogni cella di passaggio tra due lotti (a contatto con un altro lotto) che per un anno intero nessuno ha calpestato viene aggiunta al giardino accanto (fino a 3 celle per volta, tetto 36 celle, dentro la zona residenziale, solo se le porte restano raggiungibili). Il giorno-ultimo-passaggio di ogni cella non è salvato: dopo un caricamento l'anno riparte da quel momento.
- **Taglio diagonale:** quando il bordo del giardino è a scaletta (almeno due gradini da una cella) viene sostituito da un taglio a 45° che passa per gli angoli rientranti. La **staccionata** corre in linea retta lungo la diagonale (tratti dritti uniti in una sola asse) e il **terreno** del giardino è disegnato come poligono, quindi non a quadretti; le celle d'angolo tagliate spostano un po' i loro oggetti verso l'interno e non ospitano il blocco 3×3.
- `Sim.lotOutline(b)` calcola il contorno (usato da staccionata e terreno); la vecchia diagonale dei triangoli e `fenceCells` restano solo per le altre strutture (recinto dell'ovile).
- Test: `tests/lanes.js` (oltre un anno di partita: gli ampliamenti arrivano), `tests/lotti.js` (contorni chiusi, area = celle − mezza cella per angolo tagliato, 50 lati diagonali nella prova). Grafica non verificata in un browser WebGL.

## v44 – 2026-11-27
Funzione nuova: mercanti, denari e rotte commerciali con le 4 città vicine, tramite la Merceria.
- **Denari:** nuova valuta del paese (chip "Denari" in alto; cassa iniziale 80). Il paese vende e compra a denari dalle carovane; un clic sul chip, o sul tasto 💰, apre il **registro delle rotte** (pergamena). Anche il pannello della Merceria mostra i denari e rimanda al registro.
- **La Merceria è il punto di scambio:** nessun edificio nuovo. Serve una Merceria completata con un merciaio (come per i ritiri delle famiglie); senza Merceria, senza merciaio o in quarantena il commercio è fermo e il registro dice perché.
- **4 città, una per lato della mappa, rotte da sbloccare con i denari** (con una Merceria costruita): **Valmora** a ovest (60 denari: vende tessuto, abiti, pesce; compra legno, pietra, pane), **Rocca Alta** a nord (150: vende ferro, attrezzi, pietra; compra pane, carne, abiti, legno), **Porto Fiorito** a est (300: vende assi, pesce, tessuto; compra ferro, attrezzi, pietra, assi), **Campomaggio** a sud (500: vende pane, carne, attrezzi; compra tessuto, abiti, ferro, assi, pesce). Prezzi per pezzo, ±10% a ogni visita.
- **Carovane:** per ogni rotta aperta arriva una carovana (cavallo e carro) dal bordo della mappa circa ogni giorno e mezzo, di giorno e di sera, al massimo 3 insieme. Percorre i sentieri fino alla Merceria, vi resta 8 s e riparte. Se non trova la strada il registro lo segnala. Non contano tra i 5 viandanti della locanda (i mercanti della locanda, che pagano il pasto in merci, restano come prima).
- **Compravendita automatica** (due interruttori nel registro, accesi di default). Il merciaio **vende** solo le eccedenze: legno sopra 60, pietra 45, ferro 24, assi 18 dal magazzino; attrezzi, pane, tessuto e abiti (scaffali della Merceria più scorte dei magazzini) oltre 14/20/14/12 pezzi **più** il fabbisogno delle case; pesce e carne dal granaio oltre 25 più il fabbisogno. **Compra** solo ciò che manca: legno sotto 30, pietra 20, ferro 10, assi 10 (solo con una falegnameria) per il magazzino; attrezzi, pane, tessuto e abiti sugli scaffali della Merceria (sotto 8/10/6/6 e solo se le case ne hanno bisogno, poi li ritirano le famiglie come prima); pesce e carne consegnati alle case che ne hanno bisogno. Le soglie non si sovrappongono, quindi non si compra e vende lo stesso bene. Al massimo 6 pezzi per merce a visita; a ogni visita si spende al massimo metà della cassa, per poter risparmiare per le rotte.
- **Salvataggio (v40):** denari, rotte, interruttori e registro entrano nel salvataggio; i salvataggi precedenti si caricano con cassa iniziale e rotte chiuse. Le carovane in cammino si salvano come i viandanti.
- Grafica: il cavallo delle carovane ha dietro un carro; pannello della Merceria con denari e link al registro; nessun modello nuovo.
- Test: nuovo `tests/commercio.js` (simulazione: sblocco rotte, carovane verso la Merceria, vendita dagli scaffali e dal magazzino, acquisti sugli scaffali, soglie, interruttori, quarantena, merciaio assente, salvataggio e vecchi salvataggi, Merceria demolita) e `tests/commercio-render.js` (pannello, registro, carovane con DOM finto). Grafica e registro non verificati in un browser WebGL.
- Limiti: le rotte si aprono ma non si chiudono; i prezzi non dipendono da stagione o domanda; le merci vendute si prelevano in modo astratto, senza carico fisico visibile; i denari non servono ancora ad altro (le famiglie ritirano alla Merceria gratis, e tasse, stipendi e costi di costruzione sono lavori futuri).

## v43.1 – 2026-11-27
Ritocco: passaggio tra un lotto e l'altro.
- Tra due lotti (casa o giardino, anche ampliato) resta sempre **almeno una cella libera**, anche in diagonale: gli abitanti possono passare tra un lotto e l'altro. Prima l'ampliamento riempiva lo spazio fino al giardino del vicino e le staccionate si toccavano.
- Il giardino non cresce più "fino al vicino": si ferma una cella prima. Resta invariato l'ampliamento verso strade e sentieri.
- I carretti sono solo grafica (non hanno percorso proprio): il passaggio è percorribile da tutti gli abitanti; non c'è un divieto separato per i carretti.
- `tests/lotti.js`: nessuna cella di lotto a contatto con un altro lotto (nella prova 0). Grafica non verificata in un browser WebGL.

## v43 – 2026-11-27
Cambio di regole: placement organico delle case, ispirato ai villaggi medievali (analisi in `docs/insediamenti-medievali.md`).
- **Toft e croft:** la casa si appoggia a un sentiero/strada con la porta verso di esso; il giardino non ha più una forma preimpostata ma **cresce** dietro e ai lati della casa con fronte stretto (la casa sta sul fronte, il cortile davanti è piccolo), segue lo spazio libero tra sentieri, alberi, acqua e altri lotti, resta in un pezzo solo e tocca la casa.
- **Dentro la zona residenziale:** nessuna cella di giardino, neppure negli ampliamenti verso la strada, esce dalla zona residenziale.
- **Vicino ai sentieri:** il giardino preferisce le celle accanto ai sentieri e poi si allarga fino a raggiungerli (come in v40.1, ma ora sempre nella zona).
- **Aspetto:** lieve rotazione casuale delle case (±6°).
- Le forme predefinite (L, U, anello, triangolo) non vengono più usate; il codice resta per ora ma è inattivo.
- `tests/lotti.js`: giardini connessi e non rettangolari, almeno il 70% delle celle dietro/ai lati della casa (nella prova 94%), nessuna cella fuori zona, ingresso verso la strada. Grafica non verificata in un browser WebGL.

## v42.1 – 2026-11-27
Correzione: il giardino ampliato resta recintato.
- **Bug:** gli ampliamenti giornalieri (v39.1/v40.1) allargavano il giardino ma il modello 3D non veniva ricostruito: le celle nuove restavano senza staccionata e senza piante. Ora ogni ampliamento ricostruisce la casa (nuovo hook `regarden`): la staccionata ricalca il nuovo contorno e le celle nuove hanno orto/prato come le altre.
- `tests/lotti.js`: ogni ampliamento notifica la grafica. Grafica non verificata in un browser WebGL.

## v42 – 2026-11-27
Funzione nuova: mappe organiche, diverse a ogni partita.
- **Seme casuale:** ogni nuova partita genera una valle nuova (prima il seme era sempre 7 e lago, fiume, boschi, cave e ferro stavano negli stessi punti). Il numero della valle compare in un avviso all'inizio; aggiungendo `?seme=1234` all'indirizzo si rivede una mappa già giocata. Lo stesso seme dà sempre la stessa mappa.
- **Lago:** posizione, grandezza, orientamento e frastagliatura della riva cambiano; con il 40% di probabilità c'è anche uno stagno.
- **Fiume:** direzione qualsiasi (non solo da nord a sud), meandri a due onde con rumore, larghezza variabile lungo il corso, sempre due guadi in punti diversi.
- **Boschi, rocce e ferro:** soglia e scala del rumore variano (valli più fitte o più aperte); 4-6 macchie di bosco, 2-3 di roccia e 2-3 di ferro in posti diversi a ogni mappa, con almeno una macchia di bosco e una di roccia a portata di mano e il ferro a media distanza.
- **Sempre giocabile:** una mappa viene scartata e rigenerata (di norma servono 2-3 tentativi, in media circa 20 ms) se l'acqua è troppo vicina alla partenza (lago 11 celle, fiume 9), se ce n'è troppo o troppo poca, o se mancano legno, pietra o ferro raggiungibili. Entro 8 celle dal centro non ci sono mai alberi, sassi, ferro né acqua. Il centro cittadino e i tre primi abitanti restano al centro della mappa.
- Test: nuovo `tests/mappe.js` (40 semi per lago e per fiume: mappe tutte distinte, acqua che cambia posto, risorse e area di partenza, guadi, riproducibilità, simulazione che parte); gli altri test restano verdi, `tests/workshops.js` supera comunque i 4 minuti (lo faceva già prima). La grafica del terreno non è stata guardata in un browser WebGL: il terreno usa gli stessi dati di prima, ma conviene aprire qualche valle e controllare a occhio rive, guadi e macchie.
- Limiti: la scelta lago/fiume resta quella della storia (non ci sono ancora colline, ponti o mari); le mappe sono tutte 64×64 vecchi tile, la partenza è sempre al centro; non c'è ancora un modo per scegliere il seme dal menu, solo dall'indirizzo.

## v41 – 2026-11-27
Funzione nuova: la festa di paese, che si indice dalla piazza.
- **Indizione:** clic sulla piazza con fontana (completata) e pulsante "Indici la festa di paese" (servono almeno 6 abitanti). Si può annullare durante i preparativi (il legno raccolto torna al magazzino, il cibo no).
- **Preparativi:** durano 6 giorni di gioco, una stagione, cioè "un paio di settimane" con la settimana di gioco di 3 giorni (costante `FEST.prep`). In questo tempo il paese raccoglie gradualmente **8 legni** dal magazzino e **16 pezzi di cibo** dalle case che ne hanno più di 2 (la scorta di famiglia non si tocca). Se alla scadenza i preparativi sono sotto il 50% la festa slitta di un giorno, fino a 3 volte; poi si fa comunque, più modesta.
- **Festa:** comincia il giorno della scadenza dopopranzo (da f=0,54) e dura fino alla notte. Gli abitanti (anche chi lavora, bambini compresi) vanno in piazza e restano 20-50 s attorno alla piazza; ognuno partecipa una volta a festa. Chi abita entro 45 celle ha **+12 di felicità** durante la festa e **+8 per 2 giorni** dopo, in proporzione ai preparativi (q = 0..1): sale la felicità media, e quindi l'attrattiva e l'arrivo di nuovi abitanti.
- **Pausa:** dopo una festa non se ne può indire un'altra per 12 giorni (due stagioni).
- **Grafica:** durante i preparativi compaiono la catasta di legna, poi i pali con le ghirlande e i tavoli col cibo; durante la festa un falò. Pannello della piazza con giorni mancanti, legno/cibo raccolti e partecipanti.
- Test: nuovo `tests/festa.js` (indizione, annullamento, raccolta, festa, partecipanti, felicità, pausa); gli altri test restano verdi. Grafica verificata solo con DOM finto, non in un browser WebGL (posizione di tavoli, falò e ghirlande da tarare a occhio).
- **Salvataggio (v40):** la festa (preparativi, raccolta, partecipanti) si salva con la partita; al caricamento il numero progressivo delle feste viene ricalcolato (`festSeq`), così una festa nuova non viene saltata dagli abitanti. Provato in `tests/festa.js`.
- Limiti: legno e cibo si prelevano in modo astratto (senza trasporto fisico); la festa non ha ancora effetti su nascite o criminalità; più piazze hanno ciascuna la propria festa.

## v40.1 – 2026-11-27
Ritocco: il giardino nasce attaccato alla strada e la riempie fino in fondo.
- **Alla nascita:** appena posata la casa il giardino si allarga subito verso le strade vicine, riempiendo tutto lo spazio libero fino alla strada (varchi fino a 5 celle, in qualsiasi direzione, anche a gradini che seguono una strada diagonale).
- **Crescita:** il giardino riempie lo spazio fino alla strada anche oltre le 24 celle (fino a 36); la produzione conta al massimo 24 celle.
- **Più forme, meno rettangoli:** se la forma estratta non trova posto se ne provano altre due prima di ripiegare; il rettangolo semplice è più raro (10% invece di 20%).
- `tests/lotti.js`: al massimo il 30% dei lotti può avere un varco libero in linea retta fino a una strada (nella prova 4 su 24). Grafica non verificata in un browser WebGL.

## v40 – 2026-11-27
Funzione nuova: salvataggio e caricamento della partita.
- **Posti di salvataggio** nella memoria del browser: un salvataggio **automatico** (ogni minuto, quando la scheda va in secondo piano e quando la pagina si chiude) e tre **posti manuali**. Pulsante 💾 accanto ai comandi della mappa (o **Ctrl+S**, che salva nel posto 1); per ogni posto si vede data di gioco, abitanti, livello e quando è stato salvato, con Salva / Carica / Elimina e conferma prima di sovrascrivere o sostituire la partita in corso.
- **Schermata iniziale:** se esiste un salvataggio compare "Continua la partita" (carica il più recente) e "Salvataggi". Iniziare una nuova partita con un automatico già presente chiede conferma, perché lo sostituirebbe entro un minuto (i posti 1-3 non cambiano).
- **Esporta / Importa in un file `.json`:** per portare la partita su un altro dispositivo (telefono compreso) o tenerne una copia fuori dal browser.
- **Che cosa si salva:** tutta la simulazione (mappa con alberi, rocce, strade e sentieri, zone, edifici con le loro regole, abitanti con mestiere, bravura e famiglia, registro anagrafico, viandanti, scorte, editti, stagione e calendario) più livello e obiettivi, telecamera e velocità. Non si salvano i modelli 3D: si ricostruiscono dal caricamento.
- **Sicurezza:** un salvataggio rovinato, incompleto o creato da una versione più recente viene rifiutato con un messaggio e la partita in corso resta intatta (la validazione avviene prima di toccare lo stato). Se la memoria del browser è piena compare un avviso che suggerisce di eliminare un posto o esportare in un file.
- **Compatibilità futura:** il file porta `fmt` (formato, oggi 1) e la versione del gioco. Ogni versione nuova che aggiunge campi allo stato deve dare loro un valore di riserva in `Sim.importState`, così i salvataggi vecchi restano caricabili; `fmt` si incrementa solo se il formato diventa illeggibile alle versioni precedenti.
- Codice: `Sim.exportState()` / `Sim.importState(d)` in `src/sim.js` (griglie compresse a run + base64, resto JSON); interfaccia in `src/render.js` (blocco "salvataggi") e `src/head.html`.
- Test: `tests/save.js` (ciclo esporta → importa → riesporta identico byte per byte, nessun numero non finito, 15 giorni di simulazione dopo il caricamento, 12 salvataggi rovinati rifiutati con la partita intatta, hook della grafica) e `tests/save-render.js` (posti, Ctrl+S, automatico alla chiusura, memoria piena, esportazione, nessun errore nei fotogrammi dopo il caricamento). Gli altri test restano verdi.
- Limiti: interfaccia (dialogo, pulsanti, download e scelta del file) verificata solo con DOM finto, non in un browser vero: va provata aprendo il gioco, anche da telefono. Un salvataggio pesa circa 2 KB per abitante (≈170 KB a 100 abitanti): il browser concede ~5 MB per sito, quindi quattro posti bastano fino a borghi di qualche centinaio di abitanti, oltre conviene esportare in un file. Nel salvataggio non c'è un seme casuale: dopo il caricamento gli eventi casuali (nascite, malattie, arrivi) seguono strade diverse da quelle della partita originale.

## v39.1 – 2026-11-27
Ritocco: giardini generici (fissi) più belli, senza uova; ampliamento più lungo.
- **Niente uova nel giardino generico:** un giardino fisso è orto e fiori, mai galline (né animali); le celle aggiunte sono prato fiorito con cespugli e alberelli, non righe di orto.
- **Più bellezza:** ogni giardino fisso aggiunge attrattiva alla zona (0,3 + 0,05 per cella oltre le 9, raggio 6 + celle/4): più è grande, più abbellisce.
- **Ampliamento fino alla strada:** il giardino raggiunge la strada anche con un varco fino a 3 celle (prima 2), crescendo da tutto il bordo; inoltre cresce piano piano ogni giorno (circa una volta su quattro), non solo al salto di livello.
- `tests/lotti.js`: i giardini fissi non hanno uova. Grafica non verificata in un browser WebGL.

## v39 – 2026-11-27
Ritocco (solo grafica): i carretti sono solo dei magazzinieri.
- Il carretto (pietre, tronchi, minerale) lo usano soltanto gli abitanti che lavorano in un Magazzino o nel centro cittadino (`isWhWorker` in `src/render.js`). Chi non lavora al magazzino (costruttori, aiutanti, cavatori, taglialegna) porta la pietra come sasso in braccio e il legno come tronco sulla spalla; il ferro resta un blocchetto. Le assi restano sulla spalla per tutti.
- Nessuna regola di gioco cambia. `tests/carichi.js` aggiornato: carretti solo con `wh=true`, nessun carretto agli altri, controllo anche in partita.
- Grafica non provata in un browser WebGL.

## v38 – 2026-11-27
Funzione nuova: la **Merceria**, il negozio dei prodotti lavorati.
- **Che cosa vende:** attrezzi (fucina), pane (forno), tessuto (telaio) e abiti (sartoria), cioè i prodotti degli edifici che non sono materie prime né prodotti dei giardini. Pesce e carne di pescatori e cacciatori restano consegne dirette alle case; il baratto dei banchi del mercato (prodotti dei giardini) non cambia.
- **Come funziona:** con un **merciaio** al lavoro, gli addetti delle botteghe portano la merce agli scaffali della merceria (fino a 40 pezzi per merce, a carichi da 6) invece di consegnarla alle case. Le famiglie entro 135 celle mandano un adulto a ritirare ciò che manca (commissione a piedi, 3 pezzi alla volta: attrezzi se ne hanno meno di 1, pane meno di 2, tessuto per le case con sartoria meno di 2, abiti dal livello 3 meno di 1). Il testo del ruolo dice "Compra pane alla merceria" e "Porta la merce alla merceria".
- **Sarto:** la sartoria prende il tessuto dai telai oppure dagli scaffali della merceria (se aperta).
- **Rete di sicurezza:** se la merceria non c'è, non ha addetti, è in quarantena o lo scaffale di quella merce è pieno, le botteghe consegnano alle case come nella v37: nessuna filiera si blocca. Chi vive a più di 135 celle dalla merceria non può ritirare; per loro valgono baratto al mercato e consegne dirette quando lo scaffale è pieno.
- **Costi e prezzo:** 10 legno, 6 pietra, 4 assi (senza falegnameria si pagano in legno); 2 posti (1 voluto); un po' piacevole (attrattiva +0,8 entro 18 celle). La merce si ritira gratis: il gioco non ha ancora una moneta, quindi "vendere" vuol dire per ora distribuire.
- Interfaccia: voce **Merceria** nel menu Botteghe, modello 3D (tettoia rossa, pezze di stoffa, insegna con rocchetto), pannello con addetti e scaffali.
- **Scorte:** la merce delle botteghe può arrivare agli scaffali anche dalle scorte di Magazzino e Granaio (v37), non solo da quella pronta in bottega.
- Test: `tests/merceria.js` (senza merceria, con merceria aperta, scaffale pieno, sarto che usa il tessuto degli scaffali, merceria chiusa); `tests/workshops-render.js` include la merceria; gli altri test restano verdi. Grafica non provata in un browser WebGL.
- Limiti: rese, scorte (40) e soglie di ritiro sono stime da tarare; la merce non ha prezzo né moneta; chi ritira fa una sola merce per viaggio; il merciaio non esce a consegnare, sta in bottega.

## v37.1 – 2026-11-27
Ritocco: movimento più sinuoso agli angoli.
- Agli angoli del percorso l'abitante taglia dolcemente la curva (raggio 0,6 celle, al massimo 0,3 celle fuori dal centro) invece di girare di scatto sul centro della cella; il corpo ruota gradualmente verso la direzione di marcia. L'ultima cella del percorso si raggiunge sempre esattamente.
- Misura (`tests/movimento.js`, 3 giorni): scatti di direzione oltre 1 rad da 217 a 84, rotazione massima per passo da 2,4 a 1,4 rad.
- `tests/smoke-render.js`: il DOM finto ora ha `querySelector`/`querySelectorAll` (rotto dalla v37). Grafica non provata in un browser WebGL: l'effetto visivo va guardato a occhio.

## v37 – 2026-11-27
Funzione nuova: Magazzino e Granaio con regole di accettazione e massimali configurabili.
- **Un totale di 1000 unità per edificio**, condiviso fra le merci accettate (prima: 80 per merce nel Magazzino, 60 di grano nel Granaio). Per ogni merce si decide se accettarla (casella) e con quale massimale (0-1000); i massimali sommati possono superare 1000, ma l'edificio non tiene mai più di 1000 in tutto.
- **Magazzino:** materiali da costruzione (legno, pietra, ferro, assi) e prodotti degli artigiani (attrezzi del fabbro, tessuto del tessitore, abiti del sarto). **Granaio:** cibo che non viene dai giardini (grano delle fattorie, farina, pane del forno, pesce e carne di pescatori e cacciatori). I prodotti dei giardini e delle botteghe dei giardini non vi entrano mai: depositano solo gli edifici veri.
- **Pannello:** selezionando un Magazzino o un Granaio completato compare "Cosa accettare" con una riga per merce (casella, quantità contenuta, massimale) e il totale occupato su 1000.
- **Flusso dei prodotti:** gli addetti di fucina, forno, telaio, sartoria, pescatore e cacciatore portano l'eccedenza (6 pezzi o più) al Magazzino/Granaio più vicino che accetta quella merce e ha posto; se nessuno la accetta resta nell'edificio e, a scorta piena, la produzione si ferma come prima. Gli stessi addetti consegnano alle case anche la merce in scorta (prima quella pronta in bottega).
- Il **centro cittadino** resta com'era (80 per materiale, non configurabile). Con un Magazzino spento per una merce, i produttori rispettano la capacità reale: scorte piene = gli addetti aiutano gli altri. La falegnameria produce assi solo se qualche edificio le accetta.
- HUD: legno e pietra mostrano la capacità effettiva (con 1000 per Magazzino il limite non è più 80). Il mucchio di tronchi e pietre del centro si scala su un massimo di 160 per restare leggibile.
- Test: `tests/storage.js` (regole base, accettazione per merce, massimali, totale condiviso, flusso degli artigiani acceso/spento); gli altri test restano verdi. Interfaccia non provata in un browser WebGL: il pannello usa il DOM e va guardato aprendo il gioco.
- Limiti: la suddivisione fra edifici è calcolata (le scorte restano un contatore per merce: il centro tiene ciò che non è stato trasferito, il resto si riempie per merce e per edificio in ordine di costruzione) e il prelievo dalle scorte per le consegne è astratto, non un trasporto dal magazzino; con i nuovi limiti da 1000 va ritarato il bilanciamento (taglialegna e cave si bloccano molto più tardi). La farina nel Granaio si aggiunge alla capacità dei mulini.

## v36.1 – 2026-11-27
Ritocco: nelle zone di Caccia e Pesca le bandiere sono sostituite da icone esplicative.
- Le bandiere arancioni e azzurre non ci sono più: al loro posto un'icona tonda sempre rivolta alla camera, **arco e freccia su fondo arancione = caccia**, **pesce su fondo azzurro = pesca**. Le celle colorate restano come prima (arancione boschi per la caccia, azzurro rive per la pesca).
- Testi aggiornati (messaggio del tasto zone 🏹 e suggerimento del pulsante). Nessun cambio di regole di gioco.
- Grafica verificata solo con test a DOM finto, non in un browser WebGL (dimensione e posizione delle icone da tarare a occhio).

## v36 – 2026-11-27
Funzione nuova: l'ovile nasce dentro la zona Pascolo, la zona crea un recinto e le pecore restano dentro.
- **Posa solo nel pascolo:** l'ovile (del giocatore o fondato da una famiglia) si può costruire solo con tutta l'impronta dentro una zona Pascolo; altrove la posa è rifiutata con il motivo ("L'ovile va costruito dentro una zona Pascolo: disegnala prima (tasto P)").
- **Recinto:** quando l'ovile è completato, la zona Pascolo contigua (impronta compresa, fino a 90 celle libere) diventa il suo recinto, con una staccionata che ne segue tutto il contorno e un varco davanti all'ingresso dell'ovile. Prima il pascolo era un insieme di celle sparse entro 9 celle dall'ovile, senza confini.
- **Pecore dentro:** nel recinto compaiono da 2 a 9 pecore (secondo il pascolo libero) che passeggiano di cella in cella solo tra le celle del recinto, mai fuori né sull'ovile. Il pastore porta le pecore a brucare in quelle celle e produce la lana come prima.
- Testi aggiornati (zona Pascolo, scheda e costo dell'ovile, messaggio quando il pascolo è finito: "allarga la zona Pascolo intorno all'ovile").
- Test: nuovo `tests/ovile.js` (posa rifiutata fuori dal pascolo, impronta e recinto contigui, 6000 passi di pecore senza uscite, pastore e lana). Gli altri test restano verdi. Recinto e pecore verificati solo con DOM finto, non in un browser WebGL.
- Limiti: il recinto è un confine visivo e fissato al completamento (se dopo si disegna altro pascolo accanto, non si allarga); i passanti non lo trattano come ostacolo. Se una strada o un ostacolo taglia il pascolo, il recinto comprende solo la parte contigua all'ovile.

## v35.1 – 2026-11-27
Ritocco: giardino triangolare con taglio diagonale.
- Il bordo del triangolo non è più a scaletta: la staccionata corre in linea retta a 45° da un angolo all'altro e taglia in diagonale le celle di bordo (le cellette di bordo spostano un po' i loro oggetti verso l'interno).
- Il blocco 3×3 di orto/animali/bottega non usa le celle tagliate; l'ampliamento non cresce oltre il taglio diagonale.
- `tests/lotti.js`: nei triangoli tutte le celle stanno dentro il taglio, che passa per almeno 4 celle ed è a 45°. Grafica non verificata in un browser WebGL.

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
