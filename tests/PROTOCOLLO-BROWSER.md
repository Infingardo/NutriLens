# Protocollo di test in browser reale

`tests/harness.mjs` non copre tre cose: il service worker, lo storico
persistente tra un caricamento e l'altro, e `validity.badInput`, che nasce solo
digitando davvero (assegnare `input.value` da codice non lo produce).

## Preparazione

```bash
mkdir -p /tmp/nl/v01 /tmp/nl/serve
git show main:index.html > /tmp/nl/v01/index.html   # idem per sw.js, manifest.json, icon.svg
cp /tmp/nl/v01/* /tmp/nl/serve/
python3 -m http.server 8765 --bind 127.0.0.1 --directory /tmp/nl/serve
```

Usa un profilo pulito del browser (nessun service worker registrato su
`localhost:8765`). Per leggere lo stato, dalla console:

```js
({header: document.querySelector('header small').textContent,
  controller: navigator.serviceWorker.controller?.scriptURL ?? null,
  caches: await caches.keys(),
  storico: JSON.parse(localStorage.getItem('nutrilens') || '[]').length})
```

## Passi ed esiti attesi

| # | Passo | Atteso |
|---|---|---|
| 1 | Apri `http://localhost:8765/`, attendi, ricarica | header `v0.1`, controller presente, cache `[nutrilens-v01]` |
| 2 | Carica l'esempio → Valuta → Salva | storico = 1 |
| 3 | Copia la v0.1.1 in `/tmp/nl/serve/`, ricarica | header **ancora `v0.1`**, SW nuovo `waiting`, cache `[v01, v011]` |
| 4 | Chiudi **tutte** le schede dell'app e riapri | header `v0.1.1`, cache **solo `[nutrilens-v011]`**, storico = 1 |
| 5 | Ferma il server, ricarica | la pagina funziona offline, header `v0.1.1` |
| 6 | Attiva Ipertensione; esempio → Valuta | risultato visibile; Ipertensione "Dati insufficienti" (sale vuoto) |
| 7 | Digita `12e` in Sale → Valuta | `badInput=true`; alert "Valori non interpretabili: Sale (g)"; risultato nascosto |
| 8 | Digita `4e` in Porzione e `--3` in Sale → Valuta | alert che nomina entrambi i campi; nessun risultato |
| 9 | Svuota Sale, scrivi `40` in Porzione → Valuta | nessun alert; risultato visibile; Ipertensione "Dati insufficienti" |
| 10 | Digita `1,5` in Sale → Valuta | dipende dal browser: o viene letto 1,5, o `badInput` e quindi alert (mai ignorato in silenzio) |
| 11 | Salva → ricarica | storico = 2, entrambe le voci visibili |
| 12 | Cancella storico (conferma) | `localStorage` vuoto, "Nessun alimento salvato." |

## Esito del 24 novembre 2026

Ambiente: browser integrato dell'app Claude desktop (Chromium), `navigator.language = it`, server Python locale.

| # | Esito |
|---|---|
| 1 | ok: `v0.1`, controller `sw.js`, `[nutrilens-v01]` |
| 2 | ok: storico 1 ("Controllo glicemico: Da contestualizzare") |
| 3 | ok: header `v0.1`, `waiting: installed`, `[nutrilens-v01, nutrilens-v011]` |
| 4 | ok: header `v0.1.1`, `[nutrilens-v011]`, storico 1 conservato |
| 5 | ok: server giu', pagina `v0.1.1` servita dalla cache, 10 campi renderizzati |
| 6 | ok |
| 7 | ok: `value=""`, `badInput=true`, alert "Valori non interpretabili: Sale (g)", output nascosto |
| 8 | ok: alert "Valori non interpretabili: Sale (g), Porzione consumata (g)" |
| 9 | ok: nessun alert, "Ipertensione · Dati insufficienti / Sale non noto." |
| 10 | Chromium/it: `1,5` letto come `1.5`, nessun `badInput`; Ipertensione "Da contestualizzare" (1,5 g) |
| 11 | ok: storico 2 dopo il ricaricamento |
| 12 | ok |

Nota operativa: in un campo numerico con contenuto non valido, `cmd+A` non
seleziona il testo. Per svuotarlo usa Fine + Backspace.

Non coperti: Safari, Firefox, iOS/Android, PWA installata sulla schermata home.

## v0.1.2 — 24 novembre 2026

Stesso ambiente. Server con la v0.1.1, poi sostituita con la v0.1.2.

| Passo | Esito |
|---|---|
| v0.1.1: sale 0,75 g/100 g, porzione 40 g → Valuta → Salva | difetto riprodotto: "0.3 g" con "Da contestualizzare"; storico 1 |
| Copia la v0.1.2, ricarica | header ancora `v0.1.1`, SW nuovo `installed` in attesa, cache `[v011, v012]` |
| Chiudi tutte le schede, riapri | header `v0.1.2`, cache solo `[nutrilens-v012]`, storico 1 conservato |
| C20: sale 0,75 g/100 g × 40 g | "Tendenzialmente favorevole" |
| C21: sale 0,78 g/100 g × 40 g | "Da contestualizzare" |
| C23: netti 8,3 − 3,3, eritritolo | "Tendenzialmente favorevole", "5 g di carboidrati al netto" |
| C26: potassio 333, fosforo 50 mg/100 g × 40 g | "Potassio: 133.2; fosforo: 20 mg" |

Osservazioni, non corrette:
- le voci gia' salvate nello storico non vengono ricalcolate: quella salvata
  con la v0.1.1 resta "Da contestualizzare";
- C21 mostra "0.3 g" accanto a "Da contestualizzare": il testo arrotonda a
  0,1 g (0,312 → 0,3) mentre la classe usa il valore esatto.
