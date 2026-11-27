# Borgo Vivo — regole di lavoro (valgono per ogni chat e ogni sessione)

Il repository GitHub `Grelde/borgo-vivo` è l'UNICA fonte di verità. Le chat sono parallele: i documenti `claude/borgo-vivo-v*.html` nel Progetto sono solo istantanee e possono essere indietro o divergenti.

## Prima di toccare qualsiasi cosa
1. Clona o aggiorna il repository (`git pull --rebase`) ed esegui `./scripts/stato.sh`.
2. Leggi `VERSION`, la prima voce di `CHANGELOG.md` e `git log -10`. Non basarti sulla memoria della chat né sui file del Progetto.
3. Se il remoto è avanti rispetto a quanto stai usando, riparti dal remoto.

## Decidere: aggiornare o nuova versione?
- **Correzione o ritocco** (bug, testo, bilanciamento, nessuna funzione nuova): resta nella versione corrente, aggiungi una riga al CHANGELOG sotto la voce in corso (es. `v21.1`) e incrementa il decimale in `VERSION` solo se il comportamento cambia.
- **Funzione nuova o cambio di regole di gioco**: nuova versione intera (`VERSION` = 22, nuova voce in testa al CHANGELOG).
- Se un'altra chat ha già pubblicato la stessa versione: NON sovrascrivere; unisci (merge) il lavoro e numera la versione successiva.

## Procedura di consegna (sempre tutta)
1. Modifica `src/*` (mai `index.html` a mano), poi `./build.sh`.
2. Esegui i test: `node tests/smoke-prebegin.js`, `node tests/smoke-render.js`, `node tests/specialization.js`; per la simulazione `node tests/population.js` e `node tests/legna.js` (lenti).
3. Aggiorna `VERSION`, `CHANGELOG.md` e, se cambia un argomento, `docs/macro-argomenti.md`.
4. Commit con messaggio chiaro, `git pull --rebase`, poi `git push`. Un commit per versione/modifica.
5. Verifica dopo il push: `git fetch && git log origin/main -1` deve mostrare il tuo commit, e `index.html` sul remoto deve coincidere con la build.
6. Solo dopo, se utile, copia un'istantanea nel Progetto (`claude/borgo-vivo-vNN.html`) usando un nome non esistente: non sovrascrivere mai istantanee altrui.
7. Dì all'utente cosa è stato pubblicato, la versione e cosa non è stato verificato in un browser.
