#!/usr/bin/env node
// Harness riproducibile per la logica di NutriLens. Niente dipendenze: Node >= 18.
// Esegue lo <script> vero di index.html dentro un DOM minimo simulato, applica i
// casi di tests/casi.json e confronta il risultato con le classi attese, scritte a mano.
//
//   node tests/harness.mjs check                 # ./index.html contro casi.json (exit 1 se fallisce)
//   node tests/harness.mjs run  <index.html>     # output JSON di tutti i casi
//   node tests/harness.mjs diff <a.html> <b.html> # casi in cui due versioni danno risultati diversi
//
// Casi con "incolla": testo nell'area paste, clic su parse, poi controllo dei campi (SPEC-incolla.md).
// Limiti: il DOM e' simulato. validity.badInput viene impostato dal test, non
// prodotto digitando: quel comportamento si verifica nel browser (tests/PROTOCOLLO-BROWSER.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CASI = JSON.parse(fs.readFileSync(path.join(HERE, 'casi.json'), 'utf8'));

function env(html, store) {
  const els = new Map();
  const mk = (id, init = {}) => {
    const e = {
      id, value: '', checked: false, hidden: false, innerHTML: '', validity: { badInput: false }, files: [], src: '', ...init,
      insertAdjacentHTML(_pos, h) {
        this.innerHTML += h;
        for (const m of h.matchAll(/<input([^>]*)>/g)) {
          const id2 = (m[1].match(/id="([^"]+)"/) || [])[1];
          if (id2) mk(id2, { checked: /\bchecked\b/.test(m[1]) });
        }
      },
    };
    els.set(id, e);
    return e;
  };
  const statico = html.slice(0, html.indexOf('<script>'));
  for (const m of statico.matchAll(/<(\w+)([^>]*?)\bid="([^"]+)"([^>]*)>/g)) {
    const attrs = m[2] + m[4];
    mk(m[3], { value: (attrs.match(/\bvalue="([^"]*)"/) || [])[1] ?? '', hidden: /\bhidden\b/.test(attrs) });
  }
  els.get('basis').value = '100';
  els.get('context').value = 'Spuntino';
  const alerts = [];
  const document = { getElementById: (id) => els.get(id) ?? null };
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new Function('document', 'localStorage', 'alert', 'confirm', 'navigator', 'location', script)(
    document, localStorage, (m) => alerts.push(String(m)), () => true, {}, { protocol: 'file:' });
  return { els, alerts };
}

function applica(e, c) {
  const { els } = e;
  for (const id of ['kcal', 'carb', 'sugar', 'poly', 'fiber', 'protein', 'sat', 'salt', 'pot', 'phos']) {
    els.get(id).value = c.valori?.[id] === undefined ? '' : String(c.valori[id]);
    els.get(id).validity.badInput = false;
  }
  els.get('basis').value = c.base ?? '100';
  els.get('portion').value = c.porzione === undefined ? '40' : String(c.porzione);
  els.get('portion').validity.badInput = false;
  els.get('context').value = c.contesto ?? 'Spuntino';
  els.get('ingredients').value = c.ingredienti ?? '';
  els.get('name').value = c.nome ?? '';
  for (const p of ['gly', 'bp', 'lip', 'weight', 'renal', 'cel', 'ibs']) els.get('p' + p).checked = (c.profili ?? []).includes(p);
  for (const id of c.badInput ?? []) { els.get(id).value = ''; els.get(id).validity.badInput = true; }
}

function leggi(e) {
  const out = e.els.get('output'), res = e.els.get('results').innerHTML;
  const risultati = [...res.matchAll(/<article class="(\w+)"><b>([^<]+) · ([^<]+)<\/b><p>([\s\S]*?)<\/p><\/article>/g)]
    .map((m) => ({ classe: m[1], profilo: m[2], etichetta: m[3], testo: m[4] }));
  return { alerts: [...e.alerts], output_visibile: !out.hidden, intestazione: (res.match(/^<p>([\s\S]*?)<\/p>/) || [])[1] ?? null, risultati };
}

const PROFILI = { gly: 'Controllo glicemico', bp: 'Ipertensione', lip: 'Dislipidemia', weight: 'Controllo peso', renal: 'Malattia renale', cel: 'Celiachia', ibs: 'Colon irritabile' };

function esegui(file) {
  const html = fs.readFileSync(file, 'utf8');
  const out = {};
  for (const c of CASI.casi) {
    const store = new Map();
    let e = env(html, store);
    if (c.prima) { applica(e, CASI.casi.find((x) => x.id === c.prima)); e.els.get('run').onclick(); e.alerts.length = 0; }
    applica(e, c);
    let r;
    if (c.incolla !== undefined) {
      // SPEC-incolla: compila dai dati incollati, poi (se richiesto) valuta
      e.els.get('paste').value = c.incolla;
      e.els.get('parse').onclick();
      const campi = { basis: e.els.get('basis').value };
      for (const id of ['kcal', 'carb', 'sugar', 'poly', 'fiber', 'protein', 'sat', 'salt', 'pot', 'phos']) campi[id] = e.els.get(id).value;
      const dopo = leggi(e);
      if (c.valuta_dopo) e.els.get('run').onclick();
      r = { ...leggi(e), campi, info: e.els.get('parseinfo').innerHTML, output_visibile_dopo_incolla: dopo.output_visibile };
    } else {
      e.els.get('run').onclick();
      r = leggi(e);
    }
    if (c.storico) {
      e.els.get('save').onclick();
      const salvati = JSON.parse(store.get('nutrilens') || '[]');
      const e2 = env(html, store); // "ricarica" della pagina con lo stesso localStorage
      const escHtml = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
      r.storico = { salvati: salvati.length, nome: salvati[0]?.name, sintesi: salvati[0]?.summary, dopo_ricarica: e2.els.get('history').innerHTML.includes('<b>' + escHtml(salvati[0]?.name ?? '§') + '</b>') };
      e2.els.get('clear').onclick();
      r.storico.dopo_cancella = e2.els.get('history').innerHTML;
    }
    out[c.id] = r;
  }
  return out;
}

function verifica(c, r) {
  const err = [];
  const a = c.atteso;
  if (a.alert) {
    if (!r.alerts.some((m) => m.includes(a.alert))) err.push(`alert atteso contenente «${a.alert}», ottenuti ${JSON.stringify(r.alerts)}`);
    if (r.output_visibile) err.push('output visibile dopo un alert bloccante');
    for (const s of a.alert_contiene ?? []) if (!r.alerts.some((m) => m.includes(s))) err.push(`l'alert non nomina «${s}»`);
  } else {
    if (r.alerts.length) err.push(`alert inattesi: ${JSON.stringify(r.alerts)}`);
    for (const [p, cl] of Object.entries(a.classi ?? {})) {
      const x = r.risultati.find((y) => y.profilo === PROFILI[p]);
      if (!x) err.push(`${p}: assente`);
      else if (x.classe !== cl) err.push(`${p}: atteso ${cl}, ottenuto ${x.classe}`);
    }
    for (const [p, s] of Object.entries(a.testo_contiene ?? {})) {
      const x = r.risultati.find((y) => y.profilo === PROFILI[p]);
      if (!x?.testo.includes(s)) err.push(`${p}: il testo non contiene «${s}»`);
    }
  }
  for (const [k, v] of Object.entries(a.campi ?? {})) if (r.campi?.[k] !== v) err.push(`campo ${k}: atteso ${JSON.stringify(v)}, ottenuto ${JSON.stringify(r.campi?.[k])}`);
  for (const s of a.info_contiene ?? []) if (!r.info?.includes(s)) err.push(`il riepilogo non contiene «${s}»`);
  for (const s of a.info_non_contiene ?? []) if (r.info?.includes(s)) err.push(`il riepilogo contiene «${s}»`);
  if (a.output_nascosto && r.output_visibile_dopo_incolla) err.push('risultato precedente ancora visibile dopo la compilazione');
  if (a.storico) for (const [k, v] of Object.entries(a.storico)) if (r.storico?.[k] !== v) err.push(`storico.${k}: atteso ${JSON.stringify(v)}, ottenuto ${JSON.stringify(r.storico?.[k])}`);
  return err;
}

const [cmd, a1, a2] = process.argv.slice(2);
if (cmd === 'run') {
  console.log(JSON.stringify(esegui(a1), null, 1));
} else if (cmd === 'diff') {
  const A = esegui(a1), B = esegui(a2);
  let n = 0;
  for (const id of Object.keys(A)) {
    if (JSON.stringify(A[id]) !== JSON.stringify(B[id])) {
      n++;
      console.log(`\n## ${id}\n- ${a1}: ${JSON.stringify(A[id])}\n- ${a2}: ${JSON.stringify(B[id])}`);
    }
  }
  console.log(`\n${n} casi diversi su ${Object.keys(A).length}`);
} else if (cmd === 'check') {
  const file = a1 ?? path.join(HERE, '..', 'index.html');
  const R = esegui(file);
  let fail = 0, noti = 0;
  for (const c of CASI.casi) {
    const err = verifica(c, R[c.id]);
    const tag = !err.length ? (c.noto ? 'RISOLTO?' : 'ok  ') : (c.noto ? 'NOTO' : 'FAIL');
    console.log(`${tag} ${c.id} — ${c.descrizione}`);
    for (const x of err) console.log(`       ${x}`);
    if (err.length && c.noto) { noti++; console.log(`       difetto noto: ${c.noto}`); }
    else if (err.length) fail++;
  }
  console.log(`\n${CASI.casi.length - fail - noti}/${CASI.casi.length} casi superati, ${noti} difetti noti, ${fail} falliti (${file})`);
  process.exit(fail ? 1 : 0);
} else {
  console.error('uso: node tests/harness.mjs check [index.html] | run <index.html> | diff <a.html> <b.html>');
  process.exit(2);
}
