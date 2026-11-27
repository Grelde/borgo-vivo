# Borgo Vivo — macro argomenti (stato a v17)

Prototipo: city builder medievale, un solo file HTML (Three.js). Sorgenti in `src/`, build con `./build.sh`. Griglia 192×192 celle, 1 vecchio tile = 3×3 celle.

## 1. Mondo, zone e strade
Stato: zone Residenziale/Agricolo/Mercato/Forestale/Pascolo; strade che nascono dai passaggi (sentiero → strada → sparisce con l'usura); strade costruite dal giocatore (durano molto di più); terreno con lago/fiume.
Da fare: mappe/terreni nuovi, ponti, colline, selciato, pendolarismo.

## 2. Case, giardini e specializzazioni
Stato: lotto casa+giardino, 4 livelli, 16 aspetti, giardino che si espande (soglia 3 celle piccole), espansioni = stessa coltura; a ogni livello la casa può diventare allevamento o bottega con controllo di domanda/saturazione.
Da fare: bilanciamento dei limiti per ruolo, specializzazioni nuove, resa grafica dei giardini ampliati.

## 3. Economia, risorse e lavoro
Stato: trasporto fisico dei materiali, magazzini/centro, taglialegna, cava, miniera, guardaboschi (zone di lavoro), fattoria, ovile, mulino, granaio, mercato con baratto, stagioni, giorno/notte.
Da fare: bilanciamento, nuove catene produttive, commercio con i viandanti, tasse/monete.

## 4. Popolazione, famiglie e istruzione
Stato: età, nascite, crescita, morte (240 s = 1 anno), scuola (dai 6 anni, maestro, "istruito" a 14), cimitero (solo dalla chiesa), editti (nessun avanzamento case, blocco immigrazione).
Da fare: verificare le morti in partite lunghe, malattie, eredità/ruoli, più editti.

## 5. Interfaccia e grafica
Stato: colonna comandi a destra, pannello di selezione, editti a pergamena, bandiere caccia/pesca, modelli degli edifici, rotazione con freccia d'ingresso.
Da fare: verifica in un browser vero, mobile, suoni, minimappa, grafica degli edifici.

## 6. Pubblicazione e infrastruttura
Stato: repository GitHub `Grelde/borgo-vivo` (privato); pagina privata su claude.ai.
Da fare: indirizzo pubblico (GitHub Pages), dominio.

## Limiti noti
- Nessun test in browser reale: render e bottoni verificati solo con test simulati.
- Valori di bilanciamento sono stime.
- Il trasferimento dei materiali del centro è un contatore, non un inventario fisico.
