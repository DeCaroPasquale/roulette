# Roulette Chiara

Un calcolatore gratuito e open source per roulette **europea** (uno zero) e **americana** (doppio zero). Rende visibili matematica, rischio ed esposizione di una puntata e affianca un ranking statistico trasparente costruito dallo storico inserito dall'utente.

## Costo: €0

Il progetto è costruito per non richiedere alcun pagamento:

- HTML, CSS e JavaScript puri: nessuna dipendenza da installare;
- nessun backend, database, login, API, chiave segreta o servizio AI;
- nessuna pubblicità, analytics, cookie di profilazione o link affiliato;
- tutto il calcolo avviene nel browser dell'utente;
- può essere pubblicato gratuitamente come repository pubblico su GitHub Pages.

> Nota: un dominio personale può avere un costo presso un registrar, ma non serve. Con GitHub Pages si può usare l'indirizzo gratuito `https://<utente>.github.io/<repository>/`.

## Funzionalità incluse

- Selettore tra roulette europea (`0`, 37 esiti) e americana (`0` + `00`, 38 esiti).
- Tavolo interattivo con pieni, puntate esterne, split, strade, carré, sestine e puntate sullo zero.
- Combinazioni di puntate correttamente sovrapposte: il motore calcola il risultato **netto** per ciascun esito possibile.
- Aggiornamento immediato di copertura, probabilità di utile netto, vincita/perdita massima, valore atteso e perdita attesa su più giri.
- Budget locale di riferimento e messaggi che evidenziano l'esposizione.
- Annullamento dell'ultima modifica, azzeramento protetto e azioni disabilitate finché non sono applicabili.
- Scheda precisa della giocata, esportabile sia in SVG sia in PNG senza inviare dati a nessun servizio.
- Simulazione didattica di 1.000 giri, separata dalle probabilità teoriche.
- Inserimento rapido dei risultati tramite tastierino, storico cronologico, annullamento e azzeramento.
- Ranking attivato dopo almeno 10 esiti: evidenzia sul tavolo gli 8 numeri con quota del modello più alta.
- Segnali per rosso/nero, pari/dispari, basso/alto, dozzine, colonne e zona degli zeri.
- Motore locale e deterministico che combina frequenza (26%), recenza (34%), transizioni (25%) e vicinanza sulla ruota (15%).
- Verifica retrospettiva *walk-forward*: ogni pronostico di prova usa esclusivamente gli esiti già disponibili in quel momento e viene confrontato con la selezione casuale.
- Interfaccia responsive, utilizzabile con tastiera, con focus visibile e supporto alla riduzione del movimento.
- Test automatici per formule fondamentali e requisiti UX/accessibilità.

## Principio matematico

Per una roulette corretta ogni giro è indipendente. Una sequenza passata non rende più probabile un numero, un colore o una colonna nel giro successivo.

Per esempio, dopo il rosso, nella roulette europea il nero resta al **48,65%** (`18/37`), esattamente come il rosso; lo zero resta al **2,70%**. Il ranking può assegnare quote del modello differenti in base alla sequenza inserita, ma quelle quote misurano il peso relativo dei segnali storici: non sostituiscono le probabilità fisiche e non garantiscono il prossimo esito.

## Come usare il ranking statistico

1. Scegli la variante corretta, europea o americana.
2. Inserisci i numeri nell'ordine in cui escono; con la roulette americana puoi inserire anche `00`.
3. Dopo il decimo esito premi **Calcola il ranking**.
4. Leggi gli 8 numeri evidenziati e i segnali esterni. Ogni nuova uscita aggiorna automaticamente l'analisi.
5. Consulta il backtest: un risultato vicino o inferiore alla base casuale indica che, sul campione disponibile, il ranking non ha mostrato un vantaggio osservabile.

Il motore non tenta di ricostruire algoritmi proprietari di applicazioni terze. Offre lo stesso tipo di flusso operativo — storico minimo, ranking percentuale, tavolo evidenziato e aggiornamento continuo — con una formula locale, leggibile e testabile.

| Variante | Esiti | Margine standard del banco |
| --- | ---: | ---: |
| Europea | 37 | 2,70% |
| Americana | 38 | 5,26% |

La specifica puntata americana **Primi cinque** (`0, 00, 1, 2, 3`) ha un margine del banco del 7,89% per via del payout 6:1. Il valore atteso mostrato dall'app è la media teorica su tutti gli esiti possibili; non descrive l'esito di una singola partita.

## Avvio in locale

Non è richiesto `npm install`.

```bash
cd roulette-calculator
python3 -m http.server 4173
```

Apri quindi `http://localhost:4173` nel browser.

Per eseguire i test matematici (serve solo Node.js):

```bash
npm test
```

## Pubblicazione gratuita con GitHub Pages

1. Crea un nuovo repository **pubblico** su GitHub, ad esempio `roulette-chiara`.
2. Copia questi file nel repository e inviali sul branch `main`.
3. In GitHub apri **Settings → Pages**.
4. In **Build and deployment**, scegli **Deploy from a branch**.
5. Seleziona `main` e la cartella `/(root)`, quindi salva.
6. GitHub pubblicherà il progetto a `https://<tuo-utente>.github.io/roulette-chiara/`.

Non occorrono workflow, Actions, database né servizi a pagamento. GitHub indica che Pages è disponibile per repository pubblici con GitHub Free e che ospita direttamente file statici HTML, CSS e JavaScript.

## Struttura

```text
roulette-calculator/
├── index.html              # Interfaccia statica
├── styles.css              # Design responsive, senza librerie esterne
├── app.js                  # Interazioni, esportazione PNG e stato locale
├── math.js                 # Motore probabilistico testabile
├── manifest.webmanifest    # Metadati dell'app web
├── tests/
│   ├── math.test.mjs       # Test del motore probabilistico
│   ├── ux-audit.test.mjs   # Audit statico UX e accessibilità
│   └── color-contrast.test.mjs # Contrasto dei colori principali
├── package.json            # Solo comando npm test; nessuna dipendenza
├── LICENSE                 # MIT
└── README.md
```

## Privacy e gioco responsabile

L'app non effettua richieste di rete: nessuna puntata, budget o simulazione lascia il browser. Il salvataggio facoltativo delle preferenze usa esclusivamente `localStorage` del browser.

Il progetto è informativo ed educativo. Non facilita scommesse con denaro reale e il ranking non costituisce una garanzia o un vantaggio matematico. Imposta un limite prima di iniziare, non usare denaro necessario alle spese essenziali e non inseguire le perdite.

## Licenza

[MIT](LICENSE). Puoi usare, modificare e pubblicare il progetto mantenendo l'avviso di licenza.
