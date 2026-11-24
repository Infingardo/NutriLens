# SPEC — compilare i campi da un testo incollato (v0.1.3)

Decisioni di Filippo, 24 novembre 2026. Strada A: niente OCR nell'app. Il
testo della tabella nutrizionale si copia dalla foto con le funzioni del
sistema (Testo live su iPhone e macOS, Google Lens su Android) e si incolla in
NutriLens.

## Principio

La lettura **propone**, l'utente **conferma**. Il pulsante compila i campi e
mostra da quale testo viene ogni valore. Non avvia la valutazione. Nel dubbio
un campo resta vuoto e viene segnalato: meglio un campo vuoto che un valore
sbagliato.

## Interfaccia

- Nella sezione "1. Etichetta": un'area di testo "Tabella nutrizionale
  (testo incollato)" e il pulsante "Compila i campi dal testo".
- Premendo il pulsante:
  1. **tutti** i 10 campi nutrizionali vengono svuotati, così non restano valori
     di un prodotto precedente. Nome, ingredienti, porzione e profili non
     cambiano;
  2. i campi riconosciuti vengono compilati;
  3. sotto il pulsante compare un riepilogo: per ogni campo compilato il valore e
     la riga di origine, poi gli avvisi, poi "Controlla i valori prima di
     valutare.";
  4. il risultato di una valutazione precedente viene nascosto, perché i dati
     sono cambiati.

## Riconoscimento

Il testo si legge riga per riga, senza distinguere maiuscole e minuscole.

**Righe con un nutriente.** Una riga appartiene a un nutriente se contiene una
di queste parole intere:

| Parola | Campo |
|---|---|
| `energia`, `valore energetico` | Energia (kcal) |
| `saturi` (non `monoinsaturi` né `polinsaturi`) | Saturi |
| `carboidrati` | Carboidrati |
| `zuccheri` | Zuccheri |
| `polioli`, `polialcoli` | Polioli |
| `fibre`, `fibra` | Fibre |
| `proteine` | Proteine |
| `sale` | Sale |
| `sodio` | Sale, convertito (vedi sotto) |
| `potassio` | Potassio |
| `fosforo` | Fosforo |

**I valori di un nutriente** sono i numeri dopo la parola, sulla stessa riga,
più quelli delle righe successive che iniziano con un numero, con `<`, `>`, `≤`, `≥`, `~` o
con "tracce". Ci si ferma alla prima riga che inizia con altro testo. Così
funziona sia con una riga per nutriente sia con una cella per riga. Le righe
di nutrienti non in tabella (grassi totali, monoinsaturi, amido, vitamine…)
chiudono il gruppo precedente e vengono ignorate.

**Numeri.** La virgola è il separatore decimale. Si ignorano i numeri seguiti
da `%` (assunzioni di riferimento). Il punto seguito da esattamente tre cifre
(per esempio `1.650`) è ambiguo tra migliaia e decimali: il campo resta vuoto
con un avviso.

**Unità.**
- Energia: solo valori in kcal. Se c'è solo il valore in kJ, il campo resta
  vuoto con un avviso (nessuna conversione). Nella forma `1650/395` con
  intestazione `kJ/kcal` si prende il secondo numero.
- Nutrienti in grammi: numero senza unità o in `g`. Con un'altra unità, il
  campo resta vuoto con un avviso.
- Potassio e fosforo: numero senza unità o in `mg`. Con un'altra unità, il
  campo resta vuoto con un avviso.

**Valori non esatti.** `<0,5`, `≤0,5`, `>0,5`, `≥0,5`, `~0,5`, "tracce": il
campo resta vuoto, con l'avviso che riporta il testo dell'etichetta. Lo stesso
per qualunque simbolo diverso da cifre, lettere, spazi e `, . / % * ( ) :`
(per esempio il trattino di un intervallo `0,5-1`).

**Più nutrienti nella stessa riga.** Se una riga contiene le parole di più
nutrienti (per esempio `Carboidrati 50 g, di cui zuccheri 20 g`), non si sa a
chi appartengono i numeri: i campi coinvolti restano vuoti con un avviso. Se la
riga non contiene numeri (una frase, come quella sul sodio sotto), viene
ignorata. Lo stesso vale se dopo il nutriente compare un'altra parola
seguita da numeri, anche se è un nutriente fuori tabella (`saturi 5 g,
monoinsaturi 3 g`, `Carboidrati 50 g amido 20 g`): il campo resta vuoto.
Le parole ammesse dopo il nutriente sono solo le unità (`kcal`, `kJ`, `g`,
`mg`…) e "tracce".

**Nutriente ripetuto.** Se la stessa parola compare in più righe con dei
numeri, il campo resta vuoto con un avviso. Le righe senza numeri non contano:
la frase "Il contenuto di sale è dovuto esclusivamente al sodio naturalmente
presente", frequente nelle etichette, non annulla il valore del sale.

**Sodio.** Se il sale non è indicato, sale = sodio × 2,5 (Reg. UE 1169/2011,
allegato I), con il sodio in g (i valori in mg si dividono per 1000). Il
riepilogo lo indica come "calcolato dal sodio". Se ci sono sia il sale sia il
sodio, vale il sale.

**Colonne.**
- Un valore: è il valore del campo.
L'**intestazione** sono le righe prima del primo nutriente.

- Un valore: è il valore del campo. Se però l'intestazione nomina sia "100 g"
  sia "porzione", un valore solo è ambiguo (una cella persa nella copia): il
  campo resta vuoto con un avviso.
- Due valori: si usa la colonna per 100 g, cioè la prima se nell'intestazione
  "100 g" compare prima di "porzione", la seconda nel caso opposto. Se
  l'intestazione non nomina entrambe, il campo resta vuoto con un avviso.
- Più di due valori: il campo resta vuoto con un avviso (formato ambiguo, per
  esempio etichette e numeri copiati in due blocchi separati).

**Valori riportati.** Se l'intestazione contiene "100 g", diventa "Per
100 g". Se contiene solo "porzione",
diventa "Per porzione". Altrimenti la scelta non cambia e un avviso chiede di
controllarla.

Tutti i numeri passano per l'arrotondamento a 9 decimali di `SPEC-soglie.md`.

## Cosa non cambia

Le regole di valutazione, le soglie, i controlli di validità e il pulsante
"Valuta alimento". La foto resta solo un'anteprima.

## Criteri di accettazione (tests/casi.json, casi P)

| Caso | Testo | Atteso |
|---|---|---|
| P01 | tabella UE su righe, due colonne (100 g, porzione), monoinsaturi e % RI | 8 campi dalla colonna 100 g, Per 100 g, monoinsaturi ignorati; poi con porzione 40 g, Ipertensione favorevole |
| P02 | una cella per riga, intestazione "per 100 g" | stessi campi, Per 100 g |
| P03 | due colonne con "per porzione" prima di "per 100 g" | si prende la seconda colonna |
| P04 | solo sodio, 0,3 g | Sale 0.75, "calcolato dal sodio" |
| P05 | sodio 120 mg | Sale 0.3 |
| P06 | sale "<0,5 g", zuccheri "tracce" | entrambi vuoti, avvisi con il testo |
| P07 | energia solo in kJ | Energia vuota, avviso kJ |
| P08 | etichette e numeri in due blocchi | nessun campo compilato in modo sbagliato, avviso |
| P09 | valori precedenti nei campi e un risultato visibile | campi non presenti nel testo svuotati, risultato nascosto |
| P10 | nessuna intestazione, una colonna | campi compilati, "Valori riportati" invariato con avviso |
| P11 | `1.650` come valore | campo vuoto con avviso |
| P12 | intestazione `kJ/kcal` e valori `1650/395` | Energia 395 |
| P13 | sale 0,8 g e in fondo la frase sul sodio naturalmente presente | Sale 0.8 |
| P14 | sale indicato due volte con numeri | Sale vuoto, avviso |
| P15 | `cal`, `µg`, `ml` come unità | campi vuoti, avviso "unità non prevista" |
| P16 | `Carboidrati 50 g, di cui zuccheri 20 g` su una riga | Carboidrati e Zuccheri vuoti, avviso |
| P17 | `di cui polioli 10 g, zuccheri 30 g` con due colonne in intestazione | Polioli e Zuccheri vuoti |
| P18 | solo sodio 0,3 g e la frase sul sodio in fondo | Sale 0.75 dal sodio |
| P19 | `saturi 5 g, monoinsaturi 3 g` con due colonne in intestazione | Saturi vuoto, avviso |
| P20 | `Carboidrati 50 g amido 20 g` | Carboidrati vuoto, avviso |
| P21 | `>0,5`, `≥0,5`, `~0,5`, `0,5-1` | campi vuoti, avviso |
