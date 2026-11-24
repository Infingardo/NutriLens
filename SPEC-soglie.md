# SPEC — confronto con le soglie (v0.1.2)

Decisione di Filippo, 24 novembre 2026. Corregge un difetto aritmetico; non
cambia le soglie né il loro significato.

## Regola

Ogni soglia si confronta con il **valore decimale esatto** che una persona
calcolerebbe a mano dai dati inseriti:

- valori "per 100 g": valore in etichetta × porzione / 100;
- valori "per porzione": il valore in etichetta;
- carboidrati netti: carboidrati − polioli, entrambi già riferiti alla porzione.

Esempio: 0,75 g di sale per 100 g × 40 g = 0,3 g esatti, quindi rientra in
"sale ≤ 0,3 g".

## Soglie (invariate)

| Profilo | Condizione | Classe |
|---|---|---|
| Controllo glicemico | netti ≤ 5 g e (polioli = 0 oppure solo eritritolo) | favorevole, altrimenti da contestualizzare |
| Ipertensione | sale ≤ 0,3 g | favorevole, altrimenti da contestualizzare |
| Dislipidemia | saturi ≤ 2 g | favorevole, altrimenti da contestualizzare |
| Controllo peso (spuntino) | energia ≤ 180 kcal | favorevole, altrimenti da contestualizzare |
| Colon irritabile | polioli ≥ 5 g | da contestualizzare, altrimenti dati insufficienti |
| Blocco dati | polioli > carboidrati | avviso, nessuna valutazione |

## Vincolo di implementazione

Il calcolo in virgola mobile non rappresenta esattamente i decimali (0,75 × 0,4
dà 0,30000000000000004). Per ottenere il valore decimale esatto, ogni valore
riferito alla porzione e i carboidrati netti vengono arrotondati a 9 decimali
prima dei confronti e della visualizzazione.

Conseguenza dichiarata: differenze inferiori a 0,000000001 (g, kcal o mg) non
contano. Nessuna etichetta riporta valori con quella precisione.

## Cosa non cambia

- Soglie, classi, testi e profili.
- L'arrotondamento a 0,1 nei testi (`n()`).
- I controlli di validità: porzione, valori negativi o non finiti, input non
  interpretabili.

## Effetto atteso sull'output

- Cambiano solo i casi in cui il valore esatto coincide con una soglia ma il
  calcolo in virgola mobile la superava. Una misura su combinazioni
  sintetiche ne ha trovati per il sale e per i carboidrati netti; nessuno per
  saturi, energia e polioli.
- Il testo di Malattia renale mostra potassio e fosforo arrotondati a 9
  decimali (per esempio 133,2 invece di 133,20000000000002).

## Criteri di accettazione (tests/casi.json)

| Caso | Input | Atteso |
|---|---|---|
| C20 | sale 0,75 g/100 g, porzione 40 g | Ipertensione favorevole |
| C21 | sale 0,78 g/100 g, porzione 40 g (= 0,312 g) | Ipertensione da contestualizzare |
| C22 | sale 6 g/100 g, porzione 5 g (= 0,3 g) | Ipertensione favorevole |
| C23 | per porzione: carboidrati 8,3, polioli 3,3, eritritolo | Controllo glicemico favorevole |
| C24 | per porzione: carboidrati 8,31, polioli 3,3, eritritolo (netti 5,01) | Controllo glicemico da contestualizzare |
| C25 | per 100 g: carboidrati 32,02, polioli 12,02, eritritolo, porzione 25 g | Controllo glicemico favorevole |
| C26 | potassio 333 mg/100 g, fosforo 50 mg/100 g, porzione 40 g | il testo riporta "Potassio: 133.2; fosforo: 20 mg" |
| C27 | per porzione: carboidrati = polioli = 1e300, eritritolo | Controllo glicemico favorevole (netti 0), come nella v0.1.1 |
