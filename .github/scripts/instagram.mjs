// Pubblica su Instagram le offerte nuove di data/offerte.js (immagine img/<ASIN>-ig.jpg).
// Gira su GitHub Actions. Azioni: pubblica (default), verifica, rinnova-token.
import { execSync } from 'node:child_process';
import vm from 'node:vm';
import fs from 'node:fs';

const TOKEN = process.env.INSTAGRAM_TOKEN || '';
const ACTION = (process.env.AZIONE || 'pubblica').trim();
const FORCE = (process.env.FORCE_ASIN || '').trim();
const DRY = process.env.DRY_RUN === '1';
const SITE = 'https://fuoriprezzo.it/';
const API = 'https://graph.instagram.com';

function load(src){
  const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(src, ctx);
  return { cfg: ctx.window.FP_CONFIG || {}, offers: ctx.window.FP_OFFERTE || [] };
}
const now = load(fs.readFileSync('data/offerte.js', 'utf8'));
let prev = { cfg: {}, offers: [] };
try { prev = load(execSync('git show HEAD~1:data/offerte.js', { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] })); } catch {}

async function ig(path, params = {}, method = 'GET'){
  const qs = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(`${API}/${path}${method === 'GET' ? '?' + qs : ''}`,
    method === 'GET' ? {} : { method, body: qs });
  const data = await res.json().catch(() => ({}));
  if (data.error || !res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

if (!DRY && !TOKEN) { console.log('Instagram non ancora configurato (manca il secret INSTAGRAM_TOKEN).'); process.exit(ACTION === 'pubblica' && !FORCE ? 0 : 1); }

if (ACTION === 'verifica') {
  const me = await ig('me', { fields: 'user_id,username' });
  console.log(`Collegato a Instagram come @${me.username}.`);
  process.exit(0);
}
if (ACTION === 'rinnova-token') {
  const r = await ig('refresh_access_token', { grant_type: 'ig_refresh_token' });
  const days = Math.round((r.expires_in || 0) / 86400);
  console.log(`Token rinnovato: valido per altri ${days} giorni.`);
  if (r.access_token && r.access_token !== TOKEN) {
    console.log('::warning::Instagram ha restituito un token diverso: va aggiornato il secret INSTAGRAM_TOKEN.');
  }
  process.exit(0);
}

const fresh = o => (!o.scadenza || new Date(o.scadenza) > new Date())
  && o.controllato && (Date.now() - new Date(o.controllato)) < 24 * 3600e3;
const pick = now.cfg.sceltaDelGiorno;
let toPost;
if (FORCE) toPost = now.offers.filter(o => FORCE === 'tutte' || o.asin === FORCE);
else {
  const before = new Set(prev.offers.map(o => o.asin));
  // Modalità prudente: su Instagram va solo la scelta del giorno, quando è nuova o cambia
  const changed = pick && (pick !== prev.cfg.sceltaDelGiorno || !before.has(pick));
  toPost = changed ? now.offers.filter(o => o.asin === pick) : [];
}
toPost = toPost.filter(o => fresh(o) && fs.existsSync(`img/${o.asin}-ig.jpg`));
if (!toPost.length) { console.log('Nessuna offerta nuova da pubblicare su Instagram.'); process.exit(0); }

const eur = v => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
const tz = { timeZone: 'Europe/Rome' };
const ora = d => new Intl.DateTimeFormat('it-IT', { ...tz, hour: '2-digit', minute: '2-digit' }).format(d);
const giorno = d => new Intl.DateTimeFormat('it-IT', { ...tz, day: 'numeric', month: 'long' }).format(d);
const TAGS = {
  elettronica: '#elettronica #tech #gadget', informatica: '#informatica #pc #tech', casa: '#casa #arredamento #home',
  cucina: '#cucina #elettrodomestici #kitchen', sport: '#sport #fitness #allenamento', giochi: '#giochi #giocattoli #boardgames',
  bellezza: '#bellezza #beauty #skincare', 'fai-da-te': '#faidate #diy #utensili'
};
function caption(o){
  const ref = o.prezzoRiferimento;
  const disc = ref ? Math.round((ref - o.prezzo) / ref * 100) : 0;
  const L = [];
  if (o.asin === pick) L.push('🔥 SCELTA DEL GIORNO', '');
  else if (o.etichetta) L.push(`⚡️ ${o.etichetta.toUpperCase()}`, '');
  L.push(o.titoloBreve || o.titolo, '');
  L.push(ref && disc > 0 ? `💶 ${eur(o.prezzo)} invece di ${eur(ref)} (−${disc}%)` : `💶 ${eur(o.prezzo)}`);
  if (ref && o.tipoRiferimento) L.push(`ℹ️ ${eur(ref)} è il ${o.tipoRiferimento}`);
  if (o.nota) L.push(`📉 ${o.nota}`);
  if (o.scadenza) { const s = new Date(o.scadenza); L.push(`⏳ L'offerta termina il ${giorno(s)} alle ${ora(s)}`); }
  if (o.valutazione) L.push(`⭐️ ${String(o.valutazione).replace('.', ',')}/5${o.recensioni ? ` su ${o.recensioni} recensioni` : ''}`);
  L.push('', '👉 Trovi l\'offerta col link in bio!', '');
  const c = new Date(o.controllato);
  L.push(`Prezzo verificato su Amazon.it il ${giorno(c)} alle ${ora(c)}: può cambiare in qualsiasi momento. #pubblicità Link affiliato Amazon: per te il prezzo non cambia.`, '');
  L.push(`#offerte #offerteamazon #amazon #sconti #risparmio #minimostorico #fuoriprezzo ${TAGS[o.categoria] || ''}`.trim());
  return L.join('\n');
}

if (DRY) { for (const o of toPost) console.log(caption(o) + '\n---'); process.exit(0); }

let failed = false;
for (const o of toPost) {
  const url = `${SITE}img/${o.asin}-ig.jpg`;
  try {
    // Aspetta che l'immagine sia online su fuoriprezzo.it (la pubblicazione del sito richiede qualche minuto)
    let ok = false;
    for (let i = 0; i < 40 && !ok; i++) {
      const r = await fetch(url, { method: 'HEAD' }).catch(() => null);
      ok = !!(r && r.ok);
      if (!ok) await sleep(15000);
    }
    if (!ok) throw new Error(`immagine non raggiungibile: ${url}`);
    const me = await ig('me', { fields: 'user_id' });
    // Al massimo un post ogni 20 ore
    if (!FORCE) {
      const last = await ig(`${me.user_id}/media`, { fields: 'timestamp', limit: '1' });
      const t = last.data?.[0]?.timestamp;
      if (t && Date.now() - new Date(t) < 12 * 3600e3) { console.log('Ultimo post meno di 12 ore fa: salto.'); continue; }
    }
    const box = await ig(`${me.user_id}/media`, { image_url: url, caption: caption(o) }, 'POST');
    for (let i = 0; i < 20; i++) {
      const st = await ig(box.id, { fields: 'status_code' });
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR') throw new Error('Instagram non ha accettato l\'immagine');
      await sleep(5000);
    }
    await ig(`${me.user_id}/media_publish`, { creation_id: box.id }, 'POST');
    console.log(`Pubblicata su Instagram: ${o.asin}`);
  } catch (e) { failed = true; console.error(`Errore per ${o.asin}: ${e.message}`); }
}
process.exit(failed ? 1 : 0);
