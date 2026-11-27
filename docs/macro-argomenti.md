# Borgo Vivo — macro argomenti (stato a v21)

Prototipo: city builder medievale, un solo file HTML (Three.js). Sorgente di riferimento: il repository GitHub `Grelde/borgo-vivo` (`src/`, build con `./build.sh`, gioco in `index.html`). I documenti `claude/borgo-vivo-v*.html` nel Progetto sono solo istantanee. La v21 unisce la linea "popolazione" (malattie, eredità, editti, scheda, legna per casa) con la linea "giardini puri" (35% di giardini che non diventano mai allevamento/bottega; solo le case col giardino della legna la raccolgono, le altre la comprano al mercato).

Struttura del file: CSS+markup, poi `const Sim=(function(){…})()` (simulazione, senza grafica) e un blocco di rendering (IIFE). Griglia 192×192 celle, 1 vecchio tile = 3×3 celle.

## 1. Mondo, zone e strade
Stato: zone Residenziale/Agricolo/Mercato/Forestale/Pascolo; sentieri a 4 livelli che nascono dai passaggi; strade costruite dal giocatore (durano molto di più); terreno con lago/fiume.
Da fare: mappe/terreni nuovi, ponti, colline, selciato, pendolarismo.

## 2. Case, giardini e specializzazioni
Stato: lotto casa+giardino, 4 livelli, 16 varianti, giardino che si espande, allevamento o bottega a ogni salita di livello. Dalla v20 il passaggio al livello 2+ richiede anche una scorta di legna da ardere (4 in autunno-inverno, 2 altrimenti).
Da fare: bilanciamento dei limiti per ruolo, specializzazioni nuove.

## 3. Economia, risorse e lavoro
Stato: trasporto fisico dei materiali, magazzini/centro, taglialegna, cava, miniera, guardaboschi, fattoria, ovile, mulino, granaio, mercato con baratto, stagioni, giorno/notte.
Da fare: bilanciamento (oggi la legna nelle case è abbondante: 270+ su fabbisogno 50), catene produttive nuove, tasse/monete.

## 4. Popolazione, famiglie e istruzione (v20)
Tempo: 1 anno di vita = 240 s; un'annata (4 stagioni) = 2400 s = 10 anni di vita. L'HUD dice "annata" per non confonderle.
Coerenza: i giovani adulti lasciano la casa affollata (raro, con pausa di 4 giorni) e cercano una casa con meno adulti; i morti insepolti pesano anche sulle malattie; la scuola ha un limite di 12 alunni; i bambini senza adulti vengono accolti da un'altra famiglia; le coppie con un solo adulto attirano chi cerca casa.
Malattie: febbre invernale (più rischio senza caldo), dissenteria (senza pozzo, morti insepolti), peste (epidemia ~1 ogni 2–3 annate, contagio per casa e tra case vicine). Fattori protettivi: pozzo, chiesa, ospizio con erborista (cura entro 45 celle: guarigione 2,2× e rischio morte ×0,4), quarantena. Dopo la guarigione c'è immunità temporanea. Un viandante malato alla locanda può innescare la peste.
Eredità: capofamiglia, posto di lavoro e mestiere passano al familiare adulto più anziano; i figli a 14 anni ereditano il mestiere di famiglia; chi eredita un mestiere ha la precedenza nei posti.
Felicità casa 0–100 (v22) = quattro bisogni: cibo (30), casa (25: caldo, legna, quiete, spazio), acqua (25: pozzo entro 30 celle), chiesa (20: solo dal livello 2; ai livelli bassi non conta e il punteggio si calcola sugli altri tre). Sopra 90 la casa migliora più in fretta; sotto 30 non nascono figli.
Felicità del singolo = quella della casa − malattia (15) − carattere. Sotto 35 lavora al 80%; sotto 25 per un giorno e mezzo se ne va dal paese (mai sotto gli 8 abitanti), lasciando eredità di ruolo/lavoro come alla morte. HUD: chip "Felicità" (media e numero di tristi).
Tratti negativi (~35% degli abitanti ne ha uno, i figli lo ereditano da un genitore con probabilità 35%): Pigro (lavora al 60%), Cagionevole (malattie ×2), Brontolone (−18 felicità), Litigioso (−6 a sé e −5 per ogni litigioso in casa, max 3). Visibili nella scheda e nel registro di nascita.
Legna da ardere: fabbisogno per casa mostrato in HUD (Legna case) e nel pannello casa.
Scheda abitante: clic su un abitante o sul suo nome nel pannello casa: età, istruzione, mestiere (ereditato o no), salute, casa, genitori/figli, storia datata; resta consultabile anche dopo la morte (registro `Sim.reg`).
Editti: nessun avanzamento case, blocco immigrazione, incentivo alle nascite, istruzione obbligatoria, quarantena (blocca anche mercato e viandanti), obbligo di legna.
Da fare: tratti positivi, effetti di criminalità/liti, feste e taverna per alzare la felicità, coppie/matrimoni espliciti, cognomi che passano per linea paterna, bilanciare le nascite (oggi i bambini sono molti), scheda con parenti più lontani, lutti e orfani nella storia.

## 5. Interfaccia e grafica
Stato: pannello di selezione, tooltip, editti a pergamena, scheda abitante a pergamena, bandiere caccia/pesca, modelli degli edifici (nuovo: Ospizio con croce rossa), rotazione con freccia d'ingresso; mobile (v18) con gesti a due dita e barra di conferma.
Corretto in v20: i pannelli dedicati di locanda e scuola non comparivano (il ramo generico "slots" li precedeva).
Da fare: verifica su telefono vero, minimappa, grafica degli edifici.

## 6. Pubblicazione e infrastruttura
Stato: pagina privata su claude.ai (ancora v17). Repository GitHub non creato. Per l'indirizzo pubblico: creare `borgo-vivo` su GitHub, attivare Pages, caricare `index.html`.
Da fare: dominio/indirizzo pubblico; bilanciare la legna (scorta ~500 contro fabbisogno ~55) e il numero di bambini.

## Limiti noti
- v20: la simulazione è stata provata in headless (4 annate, epidemia forzata, edicts) ma la parte grafica/UI (scheda, ospizio, pannelli) non è stata eseguita in un browser con WebGL: va provata aprendo il file.
- Valori di bilanciamento sono stime.
- Il trasferimento dei materiali del centro è un contatore, non un inventario fisico.
