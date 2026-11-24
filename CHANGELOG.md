# Changelog

## v0.1.3 — 2026-11-24

### Aggiunto
- **Compilare i campi da un testo incollato** (`SPEC-incolla.md`, decisioni di
  Filippo del 24/11/2026). Si copia il testo della tabella dalla foto con le
  funzioni del sistema (Testo live su iPhone e Mac, Google Lens su Android), lo
  si incolla e "Compila i campi dal testo" propone i valori. Non c'è OCR
  nell'app e nessuna nuova dipendenza.
  - **Propone, non valuta:** svuota i 10 campi nutrizionali e compila quelli
    riconosciuti, mostrando per ciascuno la riga di origine. Nasconde il
    risultato precedente. La valutazione resta un passo esplicito.
  - **Nel dubbio, vuoto:** restano vuoti, con un avviso:
    - i valori non esatti (`<`, `>`, `≤`, `≥`, `~`, "tracce") e gli intervalli;
    - l'energia solo in kJ e le unità non previste (`cal`, `µg`, `ml`…);
    - i numeri come `1.650`;
    - le righe con più nutrienti o con altri valori dopo il nutriente;
    - i nutrienti ripetuti con numeri;
    - più di due colonne, o due colonne senza un'intestazione che dica quale è
      per 100 g.
  - **Sodio:** sale = sodio × 2,5 (Reg. UE 1169/2011), solo se il sale non c'è.
  - **Colonne:** con due colonne si usa quella per 100 g.

### Invariato
- Regole di valutazione, soglie e controlli di validità: i casi C01–C27
  passano invariati.

### Test
- Casi P01–P21 con attesi ricavati a mano da `SPEC-incolla.md`; l'harness
  simula incolla → compila → (valuta). `node tests/harness.mjs check`: 48/48.
- Review cross-model (Claude → Codex, `verify-agent`, 4 round): convergente.
  Corretti 4 difetti che compilavano un valore sbagliato (unità non previste,
  righe con più nutrienti, `saturi … monoinsaturi …`, `>`/`≥`/`~`) e il sale
  non calcolato dal sodio in presenza della frase sul sodio.

### Non verificato
- Testo copiato davvero da una foto con Testo live o Google Lens: la sua
  impaginazione è l'incognita principale.

## v0.1.2 — 2026-11-24

### Corretto
- **Soglie e virgola mobile** (`SPEC-soglie.md`, decisione di Filippo del
  24/11/2026). Le soglie si confrontano con il valore decimale esatto: i valori
  riferiti alla porzione e i carboidrati netti vengono arrotondati a 9 decimali
  prima dei confronti. Prima, per esempio, 0,75 g/100 g × 40 g dava
  `0.30000000000000004` e il sale risultava "Da contestualizzare" invece di
  "Tendenzialmente favorevole".
  - Output che cambiano: solo i valori che cadono esattamente su una soglia.
    Su combinazioni sintetiche il difetto riguardava il sale e i carboidrati
    netti; nessun caso per saturi, energia e polioli.
  - Il testo di Malattia renale mostra potassio e fosforo senza residui (133.2
    invece di 133.20000000000002).
- **Pulizia delle cache.** All'attivazione il service worker elimina tutte le
  cache `nutrilens-*` diverse da quella corrente, invece di un nome scritto a
  mano.

### Invariato
- Soglie, classi, testi, profili, regola della celiachia e controlli di
  validità. `node tests/harness.mjs diff` contro la v0.1.1: cambiano solo
  C20, C22, C23, C25 (classe) e C26 (testo).
- Review cross-model (Claude → Codex, `verify-agent`, 2 round): convergente.
  R1-1 (overflow di `q()` con valori enormi) corretto, caso C27.

### Test
- Casi C20–C27 con attesi ricavati a mano da `SPEC-soglie.md`: valori
  esattamente sulla soglia e appena sopra, per sale e carboidrati netti, per
  100 g e per porzione. C20 non è più un difetto noto.

### Ancora noti
- **Aggiornamento solo alla chiusura** di tutte le schede (nessun
  `skipWaiting`).
- **Virgola decimale:** provata solo in Chromium con lingua `it`.
- **Valori non finiti dopo il calcolo** (review Codex, R2-1; presente anche
  nella v0.1.1). La porzione non viene controllata con `Number.isFinite`, e un
  prodotto di due valori enormi ma finiti puo' dare `Infinity`. Lo SPEC lascia
  invariati i controlli di validita': va deciso a parte.
- **Testo e classe vicino alla soglia.** 0,312 g di sale appare come "0.3 g"
  accanto a "Da contestualizzare": il testo arrotonda a 0,1, la classe usa il
  valore esatto.
- **Storico non ricalcolato:** le voci salvate con una versione precedente
  conservano la classe di allora.

## v0.1.1 — 2026-11-24

### Corretto
- **Valori numerici non interpretabili ignorati senza avviso.** Un valore
  digitato ma non leggibile dal browser (per esempio `12e`, `--3`) dava
  `value === ''` e veniva trattato come "non noto": la valutazione proseguiva
  come se il dato mancasse. Ora, se un campo numerico (nutrienti o porzione) ha
  `validity.badInput`, la valutazione si blocca. L'avviso nomina i campi
  interessati con la loro etichetta e il risultato precedente viene nascosto. I
  campi lasciati vuoti restano "non noti", come prima.
- **Aggiornamento del service worker.** Il nome della cache passa da
  `nutrilens-v01` a `nutrilens-v011`. Il fetch legge solo dalla cache corrente:
  prima `caches.match()` cercava in tutte le cache e poteva continuare a servire
  la `index.html` della v0.1. All'attivazione, `nutrilens-v01` viene eliminata.
  Difetto trovato nella review cross-model (Claude, round 1).
- L'intestazione mostra la versione `v0.1.1`.

### Invariato
- Regole cliniche, soglie, testi di valutazione, classi e profili: nessuna
  modifica. Verificato con `node tests/harness.mjs`: su 20 casi, la v0.1
  pubblicata e la v0.1.1 differiscono solo nei 4 casi di input non
  interpretabile.

### Decisioni
- **Celiachia: resta la regola pubblicata** (decisione di Filippo, 24 novembre
  2026). Il risultato e' sempre "Dati insufficienti", con l'invito a verificare
  la dichiarazione originale e le contaminazioni. Lo ZIP `NutriLens-v0.1.zip`
  dava invece "Tendenzialmente favorevole" quando gli ingredienti dichiaravano
  "senza glutine"; quella variante non viene ripresa. Caso C08.

### Test aggiunti
- `tests/harness.mjs` + `tests/casi.json`: 20 casi che eseguono lo script reale
  della pagina in un DOM simulato. Le classi attese sono scritte a mano dalle
  regole. `node tests/harness.mjs check`.
- `tests/PROTOCOLLO-BROWSER.md`: protocollo manuale in browser reale
  (aggiornamento dalla cache v0.1, offline, `badInput` digitato, storico), con
  gli esiti del 24 novembre 2026.

### Noti, non corretti (richiedono uno SPEC dedicato)
- **Soglie e virgola mobile.** 0,75 g/100 g × 40 g dovrebbe dare 0,3 g, ma il
  calcolo produce `0.30000000000000004`, che supera `<= 0.3`: risultato "Da
  contestualizzare" invece di "Tendenzialmente favorevole" (caso C20). Lo stesso
  vale potenzialmente per ogni soglia applicata dopo la scala per 100 g.
- **Aggiornamento solo alla chiusura.** Senza `skipWaiting`/`clients.claim`, la
  nuova versione si attiva solo dopo che tutte le schede della vecchia sono state
  chiuse; un semplice ricaricamento mostra ancora la v0.1. Confermato in browser.
- **Nome fisso della cache da eliminare.** L'eliminazione riguarda solo
  `nutrilens-v01` per nome; alla prossima versione va aggiornata a mano.
- **Virgola decimale.** In Chromium con lingua `it`, `1,5` viene letto come
  1,5. Safari, Firefox e Chromium con altre lingue non sono stati provati.

## v0.1 — 2026-11-24
Prototipo iniziale.
