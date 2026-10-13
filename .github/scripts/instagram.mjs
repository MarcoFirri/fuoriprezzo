// Pubblica su Instagram post, reel e storie delle offerte di data/offerte.js.
// Cosa e quando lo decide instagram-piano.mjs, seguendo data/instagram-strategia.json e i limiti fissi.
// Gira su GitHub Actions (a ogni modifica delle offerte e ogni ora). Azioni: pubblica (default), verifica, rinnova-token.
import vm from 'node:vm';
import fs from 'node:fs';
import { decidi, leggiStrategia, sconto, FINE_PRUDENZA } from './instagram-piano.mjs';

const TOKEN = process.env.INSTAGRAM_TOKEN || '';
const ACTION = (process.env.AZIONE || 'pubblica').trim();
const FORCE = (process.env.FORCE_ASIN || '').trim();
const FORCE_FORMATO = (process.env.FORCE_FORMATO || '').trim();
const DRY = process.env.DRY_RUN === '1';
const SITE = 'https://fuoriprezzo.it/';
const API = 'https://graph.instagram.com';

function load(src){
  const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(src, ctx);
  return { cfg: ctx.window.FP_CONFIG || {}, offers: ctx.window.FP_OFFERTE || [] };
}
const now = load(fs.readFileSync('data/offerte.js', 'utf8'));
let strategia = leggiStrategia();
try { strategia = leggiStrategia(JSON.parse(fs.readFileSync('data/instagram-strategia.json', 'utf8'))); } catch {}

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

const pick = now.cfg.sceltaDelGiorno;
const FILE = { ig: a => `img/${a}-ig.jpg`, reel: a => `img/${a}-reel.mp4`, story: a => `img/${a}-story.jpg` };
const esiste = (asin, tipo) => fs.existsSync(FILE[tipo](asin));

const eur = v => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
const tz = { timeZone: 'Europe/Rome' };
const ora = d => new Intl.DateTimeFormat('it-IT', { ...tz, hour: '2-digit', minute: '2-digit' }).format(d);
const giorno = d => new Intl.DateTimeFormat('it-IT', { ...tz, day: 'numeric', month: 'long' }).format(d);
const TAGS = {
  elettronica: '#elettronica #tech #gadget', informatica: '#informatica #pc #tech', casa: '#casa #arredamento #home',
  cucina: '#cucina #elettrodomestici #kitchen', sport: '#sport #fitness #allenamento', giochi: '#giochi #giocattoli #boardgames',
  bellezza: '#bellezza #beauty #skincare', 'fai-da-te': '#faidate #diy #utensili'
};
// apertura = cosa si legge per primo (la strategia prova le varianti e tiene quella che rende di più)
function caption(o, apertura = 'scelta'){
  const ref = o.prezzoRiferimento;
  const disc = sconto(o);
  const prezzo = ref && disc > 0 ? `💶 ${eur(o.prezzo)} invece di ${eur(ref)} (−${disc}%)` : `💶 ${eur(o.prezzo)}`;
  const titolo = o.titoloBreve || o.titolo;
  const L = [];
  if (apertura === 'prezzo') L.push(prezzo, titolo, '');
  else if (apertura === 'nota' && o.nota) L.push(`📉 ${o.nota}`, titolo, '', prezzo);
  else {
    if (o.asin === pick) L.push('🔥 SCELTA DEL GIORNO', '');
    else if (o.etichetta) L.push(`⚡️ ${o.etichetta.toUpperCase()}`, '');
    L.push(titolo, '', prezzo);
  }
  if (apertura === 'prezzo' && o.asin === pick) L.push('🔥 Scelta del giorno');
  if (ref && o.tipoRiferimento) L.push(`ℹ️ ${eur(ref)} è il ${o.tipoRiferimento}`);
  if (o.nota && apertura !== 'nota') L.push(`📉 ${o.nota}`);
  if (o.scadenza) { const s = new Date(o.scadenza); L.push(`⏳ L'offerta termina il ${giorno(s)} alle ${ora(s)}`); }
  if (o.valutazione) L.push(`⭐️ ${String(o.valutazione).replace('.', ',')}/5${o.recensioni ? ` su ${o.recensioni} recensioni` : ''}`);
  L.push('', '👉 Trovi l\'offerta col link in bio!', '');
  const c = new Date(o.controllato);
  L.push(`Prezzo verificato su Amazon.it il ${giorno(c)} alle ${ora(c)}: può cambiare in qualsiasi momento. #pubblicità Link affiliato Amazon: per te il prezzo non cambia.`);
  L.push(`Codice Amazon: ${o.asin}`, '');
  L.push(`#offerte #offerteamazon #amazon #sconti #risparmio #minimostorico #fuoriprezzo ${TAGS[o.categoria] || ''}`.trim());
  return L.join('\n');
}

// Aspetta che il file sia online su fuoriprezzo.it (la pubblicazione del sito richiede qualche minuto)
async function online(url){
  for (let i = 0; i < 40; i++) {
    const r = await fetch(url, { method: 'HEAD' }).catch(() => null);
    if (r?.ok) return;
    await sleep(15000);
  }
  throw new Error(`file non raggiungibile: ${url}`);
}
async function pubblica(userId, params, attese = 20){
  const box = await ig(`${userId}/media`, params, 'POST');
  for (let i = 0; i < attese; i++) {
    const st = await ig(box.id, { fields: 'status_code' });
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('Instagram non ha accettato il file');
    if (i === attese - 1) throw new Error('Instagram non ha finito di elaborare il file in tempo');
    await sleep(5000);
  }
  return ig(`${userId}/media_publish`, { creation_id: box.id }, 'POST');
}
async function pubblicaFeed(userId, o, formato, apertura){
  const url = SITE + FILE[formato === 'reel' ? 'reel' : 'ig'](o.asin);
  await online(url);
  if (formato === 'reel') await pubblica(userId, { media_type: 'REELS', video_url: url, caption: caption(o, apertura), share_to_feed: 'true' }, 60);
  else await pubblica(userId, { image_url: url, caption: caption(o, apertura) });
  console.log(`Pubblicato su Instagram: ${o.asin} come ${formato}.`);
}
async function pubblicaStoria(userId, o){
  const url = SITE + FILE.story(o.asin);
  await online(url);
  await pubblica(userId, { media_type: 'STORIES', image_url: url });
  console.log(`Storia pubblicata: ${o.asin}.`);
}

const byAsin = a => now.offers.find(o => o.asin === a);

// Pubblicazione manuale (dal pulsante "Run workflow"): salta orari e strategia, non i controlli sui prezzi
if (FORCE) {
  const valide = now.offers.filter(o => (FORCE === 'tutte' || o.asin === FORCE)
    && (!o.scadenza || new Date(o.scadenza) > new Date()) && Date.now() - new Date(o.controllato) < 24 * 3600e3 && esiste(o.asin, 'ig'));
  if (!valide.length) { console.log('Nessuna offerta valida da pubblicare.'); process.exit(0); }
  if (DRY) { for (const o of valide) console.log(caption(o) + '\n---'); process.exit(0); }
  const me = await ig('me', { fields: 'user_id' });
  let failed = false;
  for (const o of valide) {
    const formato = FORCE_FORMATO === 'reel' && esiste(o.asin, 'reel') ? 'reel' : 'foto';
    try {
      if (FORCE_FORMATO === 'storia') await pubblicaStoria(me.user_id, o);
      else await pubblicaFeed(me.user_id, o, formato, 'scelta');
    } catch (e) { failed = true; console.error(`Errore per ${o.asin}: ${e.message}`); }
  }
  process.exit(failed ? 1 : 0);
}

let me = { user_id: null }, recenti = [], storie = [];
if (process.env.SIMULA || (DRY && !TOKEN)) ({ recenti = [], storie = [] } = JSON.parse(process.env.SIMULA || '{}'));
else {
  me = await ig('me', { fields: 'user_id' });
  recenti = (await ig(`${me.user_id}/media`, { fields: 'id,caption,timestamp,media_product_type', limit: '25' })).data || [];
  // Le storie servono solo dopo la fine della prudenza; se Instagram non le restituisce, nessuna storia
  if (Date.now() >= FINE_PRUDENZA) {
    try { storie = (await ig(`${me.user_id}/stories`, { fields: 'id,timestamp' })).data || []; }
    catch (e) { console.log(`Storie non leggibili (${e.message}): oggi niente storie.`); storie = Array(9).fill({ timestamp: new Date().toISOString() }); }
  }
}
const d = decidi({ now: new Date(process.env.ADESSO || Date.now()), offerte: now.offers, cfg: now.cfg, strategia, recenti, storie, file: esiste });
for (const m of d.motivi) console.log(m);
if (DRY) {
  if (d.feed) console.log('\n' + caption(byAsin(d.feed.asin), d.feed.apertura));
  process.exit(0);
}

let failed = false;
if (d.feed) {
  try { await pubblicaFeed(me.user_id, byAsin(d.feed.asin), d.feed.formato, d.feed.apertura); }
  catch (e) {
    failed = true; console.error(`Errore per ${d.feed.asin}: ${e.message}`);
    if (d.feed.formato === 'reel') {
      try { await pubblicaFeed(me.user_id, byAsin(d.feed.asin), 'foto', d.feed.apertura); failed = false; }
      catch (e2) { console.error(`Anche la foto non è andata: ${e2.message}`); }
    }
  }
}
if (d.storia && !d.prudente) {
  try { await pubblicaStoria(me.user_id, byAsin(d.storia)); }
  catch (e) { failed = true; console.error(`Errore nella storia di ${d.storia}: ${e.message}`); }
}
process.exit(failed ? 1 : 0);
