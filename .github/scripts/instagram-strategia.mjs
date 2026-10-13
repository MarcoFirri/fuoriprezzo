// Aggiorna data/instagram-strategia.json in base ai risultati dei post Instagram (gira ogni giorno su GitHub Actions).
// Impara tre cose: formato (reel o foto), prima riga della didascalia, orario. Lascia sempre un po' di spazio alle prove.
// Nel file finiscono solo le scelte (pesi e orari), non i numeri dell'account.
import fs from 'node:fs';
import { leggiStrategia, STRATEGIA_BASE } from './instagram-piano.mjs';

const TOKEN = process.env.INSTAGRAM_TOKEN || '';
const API = 'https://graph.instagram.com';
const FILE = 'data/instagram-strategia.json';
const MIN_CAMPIONI = 3;              // post per variante prima di trarre conclusioni
const ORARI_CANDIDATI = [9, 11, 13, 15, 18, 19, 20, 21, 22];
const H = 3600e3;

async function ig(path, params = {}){
  const qs = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(`${API}/${path}?${qs}`);
  const data = await res.json().catch(() => ({}));
  if (data.error || !res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data;
}
const oraRoma = d => Number(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(d));
const r2 = v => Math.round(v * 100) / 100;

// Punteggio di un post: persone raggiunte + interazioni, con più peso a salvataggi e condivisioni
export const punteggio = i => (i.reach || 0) + 4 * ((i.saved || 0) + (i.shares || 0)) + 2 * (i.total_interactions || 0);

export function apertura(caption = ''){
  const prima = caption.trim().split('\n')[0] || '';
  if (prima.startsWith('💶')) return 'prezzo';
  if (prima.startsWith('📉')) return 'nota';
  return 'scelta';
}

function medie(post, chiave){
  const g = {};
  for (const p of post) (g[chiave(p)] ||= []).push(p.punti);
  return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { n: v.length, media: v.reduce((a, b) => a + b, 0) / v.length }]));
}

// Pesi proporzionali ai risultati, ma mai sotto "minimo": così si continua a provare anche la variante perdente
function pesi(varianti, stat, minimo){
  if (varianti.some(v => (stat[v]?.n || 0) < MIN_CAMPIONI)) return null;
  const tot = varianti.reduce((s, v) => s + stat[v].media, 0) || 1;
  let w = Object.fromEntries(varianti.map(v => [v, Math.max(minimo, stat[v].media / tot)]));
  const somma = Object.values(w).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(w).map(([k, v]) => [k, r2(v / somma)]));
}

export function nuovaStrategia(vecchia, post, oggi){
  const s = leggiStrategia(vecchia);
  const motivi = [];
  const nomi = { reel: 'i reel', foto: 'le foto', scelta: '"Scelta del giorno" in apertura', prezzo: 'il prezzo in apertura', nota: 'la nota sullo storico in apertura' };
  const confronto = (stat, a, b) => {
    const x = stat[a].media / (stat[b].media || 1);
    return x >= 1.15 ? `${nomi[a]} rendono circa ${x.toFixed(1).replace('.', ',')} volte ${nomi[b]}` : x <= 0.87 ? `${nomi[b]} rendono di più di ${nomi[a]}` : `${nomi[a]} e ${nomi[b]} rendono in modo simile`;
  };

  const f = medie(post, p => p.formato);
  const wf = pesi(['reel', 'foto'], f, 0.2);
  if (wf) { s.formati = wf; motivi.push(`Formati: ${confronto(f, 'reel', 'foto')} (${f.reel.n} reel, ${f.foto.n} foto): reel ${Math.round(wf.reel * 100)}%, foto ${Math.round(wf.foto * 100)}%.`); }
  else motivi.push(`Formati: servono almeno ${MIN_CAMPIONI} reel e ${MIN_CAMPIONI} foto per decidere (ora ${f.reel?.n || 0} e ${f.foto?.n || 0}).`);

  const a = medie(post, p => p.apertura);
  const wa = pesi(['scelta', 'prezzo', 'nota'], a, 0.15);
  if (wa) {
    s.aperture = wa;
    const best = Object.entries(wa).sort((x, y) => y[1] - x[1])[0][0];
    motivi.push(`Didascalie: va meglio ${nomi[best]}: lo uso nel ${Math.round(wa[best] * 100)}% dei post.`);
  } else motivi.push('Didascalie: ancora poche prove per ogni tipo di prima riga.');

  const o = medie(post, p => String(p.ora));
  const noti = Object.entries(o).filter(([, v]) => v.n >= 2).sort((x, y) => y[1].media - x[1].media).map(([h]) => +h);
  const migliori = [...noti, ...Object.keys(STRATEGIA_BASE.orari).map(Number)].filter((h, i, arr) => arr.indexOf(h) === i).slice(0, 2);
  // Un orario "di prova": quello meno provato finora (a parità, cambia ogni settimana)
  const settimana = Math.floor(new Date(oggi) / (7 * 24 * H));
  const prova = ORARI_CANDIDATI.filter(h => !migliori.includes(h))
    .sort((x, y) => (o[x]?.n || 0) - (o[y]?.n || 0) || ((x + settimana) % 9) - ((y + settimana) % 9))[0];
  s.orari = { [migliori[0]]: 0.4, [migliori[1]]: 0.4, [prova]: 0.2 };
  motivi.push(noti.length >= 2
    ? `Orari: i migliori finora sono le ${migliori[0]} e le ${migliori[1]}; ogni tanto provo le ${prova}.`
    : `Orari: ancora pochi dati, uso le ${migliori[0]} e le ${migliori[1]} e provo le ${prova}.`);

  return { ...vecchia, ...s, aggiornata: oggi, motivi };
}

// --- Esecuzione su GitHub Actions ---
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!TOKEN) { console.error('Manca il secret INSTAGRAM_TOKEN.'); process.exit(1); }
  const vecchia = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const me = await ig('me', { fields: 'user_id' });
  const media = (await ig(`${me.user_id}/media`, { fields: 'id,caption,timestamp,media_product_type', limit: '50' })).data || [];
  const post = [];
  for (const m of media) {
    const eta = Date.now() - new Date(m.timestamp);
    if (eta < 24 * H || eta > 45 * 24 * H) continue; // troppo nuovo per giudicarlo, o troppo vecchio
    const i = {};
    for (const metric of ['reach', 'saved', 'shares', 'total_interactions']) {
      try { i[metric] = (await ig(`${m.id}/insights`, { metric })).data?.[0]?.values?.[0]?.value ?? 0; } catch { i[metric] = 0; }
    }
    post.push({ formato: m.media_product_type === 'REELS' ? 'reel' : 'foto', apertura: apertura(m.caption), ora: oraRoma(new Date(m.timestamp)), punti: punteggio(i) });
  }
  const oggi = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(new Date());
  const nuova = nuovaStrategia(vecchia, post, oggi);
  const senzaData = x => JSON.stringify({ ...x, aggiornata: '', motivi: [] });
  if (senzaData(nuova) === senzaData(vecchia)) { console.log(`Strategia invariata (${post.length} post valutati).`); process.exit(0); }
  fs.writeFileSync(FILE, JSON.stringify(nuova, null, 2) + '\n');
  console.log(`Strategia aggiornata (${post.length} post valutati):\n- ${nuova.motivi.join('\n- ')}`);
}
