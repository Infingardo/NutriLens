# Changelog

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
- **Celiachia: divergenza tra lo ZIP originale e la versione pubblicata.**
  Nello ZIP `NutriLens-v0.1.zip`, se gli ingredienti dichiarano "senza glutine"
  (senza negazione) il risultato e' "Tendenzialmente favorevole". Nella versione
  pubblicata su GitHub e' sempre "Dati insufficienti". La v0.1.1 mantiene la
  regola pubblicata. Quale sia quella voluta e' da decidere.
- **Aggiornamento solo alla chiusura.** Senza `skipWaiting`/`clients.claim`, la
  nuova versione si attiva solo dopo che tutte le schede della vecchia sono state
  chiuse; un semplice ricaricamento mostra ancora la v0.1. Confermato in browser.
- **Nome fisso della cache da eliminare.** L'eliminazione riguarda solo
  `nutrilens-v01` per nome; alla prossima versione va aggiornata a mano.
- **Virgola decimale.** In Chromium con lingua `it`, `1,5` viene letto come
  1,5. Safari, Firefox e Chromium con altre lingue non sono stati provati.

## v0.1 — 2026-11-24
Prototipo iniziale.
