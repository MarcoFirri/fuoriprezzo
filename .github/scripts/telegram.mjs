// Pubblica sul canale Telegram le offerte nuove di data/offerte.js
// (e la scelta del giorno quando cambia). Gira su GitHub Actions a ogni aggiornamento delle offerte.
import { execSync } from 'node:child_process';
import vm from 'node:vm';
import fs from 'node:fs';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT = process.env.TELEGRAM_CHAT_ID || '';
const FORCE = (process.env.FORCE_ASIN || '').trim();
const ACTION = (process.env.AZIONE || 'pubblica').trim();
const MSG_ID = (process.env.MESSAGE_ID || '').trim();
const DRY = process.env.DRY_RUN === '1';
const SITE = 'https://fuoriprezzo.it/';

function load(src){
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { cfg: ctx.window.FP_CONFIG || {}, offers: ctx.window.FP_OFFERTE || [] };
}
const now = load(fs.readFileSync('data/offerte.js', 'utf8'));
let prev = { cfg: {}, offers: [] };
try { prev = load(execSync('git show HEAD~1:data/offerte.js', { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] })); } catch {}

const fresh = o => (!o.scadenza || new Date(o.scadenza) > new Date())
  && o.controllato && (Date.now() - new Date(o.controllato)) < 24 * 3600e3;

const pick = now.cfg.sceltaDelGiorno;
let toPost;
if (FORCE) {
  toPost = now.offers.filter(o => FORCE === 'tutte' || o.asin === FORCE);
} else {
  const before = new Set(prev.offers.map(o => o.asin));
  toPost = now.offers.filter(o => !before.has(o.asin));
  if (pick && pick !== prev.cfg.sceltaDelGiorno && !toPost.some(o => o.asin === pick)) {
    const o = now.offers.find(o => o.asin === pick);
    if (o) toPost.unshift(o);
  }
}
toPost = toPost.filter(fresh);
if (!toPost.length && ACTION === 'pubblica') { console.log('Nessuna offerta nuova da pubblicare.'); process.exit(0); }

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const eur = v => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
const tz = { timeZone: 'Europe/Rome' };
const ora = d => new Intl.DateTimeFormat('it-IT', { ...tz, hour: '2-digit', minute: '2-digit' }).format(d);
const giorno = d => new Intl.DateTimeFormat('it-IT', { ...tz, day: 'numeric', month: 'long' }).format(d);
const isToday = d => giorno(d) === giorno(new Date());

function message(o){
  const ref = o.prezzoRiferimento;
  const disc = ref ? Math.round((ref - o.prezzo) / ref * 100) : 0;
  const lines = [];
  if (o.asin === pick) lines.push('🔥 <b>SCELTA DEL GIORNO</b>', '');
  else if (o.etichetta) lines.push(`⚡️ <b>${esc(o.etichetta.toUpperCase())}</b>`, '');
  lines.push(`<b>${esc(o.titoloBreve || o.titolo)}</b>`, '');
  lines.push(ref && disc > 0
    ? `💶 <b>${eur(o.prezzo)}</b> invece di <s>${eur(ref)}</s>  (−${disc}%)`
    : `💶 <b>${eur(o.prezzo)}</b>`);
  if (ref && o.tipoRiferimento) lines.push(`ℹ️ ${eur(ref)} è il ${esc(o.tipoRiferimento)}`);
  if (o.nota) lines.push(`📉 ${esc(o.nota)}`);
  if (o.scadenza) {
    const s = new Date(o.scadenza);
    lines.push(`⏳ Termina ${isToday(s) ? 'oggi' : 'il ' + giorno(s)} alle ${ora(s)}`);
  }
  if (o.valutazione) lines.push(`⭐️ ${String(o.valutazione).replace('.', ',')}/5${o.recensioni ? ` · ${o.recensioni} recensioni` : ''}`);
  lines.push('');
  const c = new Date(o.controllato);
  lines.push(`<i>Prezzo controllato il ${giorno(c)} alle ${ora(c)}, può cambiare. Link affiliato Amazon: per te il prezzo non cambia.</i>`);
  return lines.join('\n');
}
function linkOf(o){
  const tag = now.cfg.tag ? `?tag=${encodeURIComponent(now.cfg.tag)}` : '';
  return `https://www.amazon.it/dp/${encodeURIComponent(o.asin)}${tag}`;
}
const buttons = o => ({ inline_keyboard: [
  [{ text: "🛒 Vai all'offerta su Amazon", url: linkOf(o) }],
  [{ text: '📊 Tutte le offerte su fuoriprezzo.it', url: SITE }]
]});
async function tg(method, payload){
  let body, headers = {};
  if (payload instanceof FormData) body = payload;
  else { body = JSON.stringify(payload); headers['Content-Type'] = 'application/json'; }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: 'POST', headers, body });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.description || `HTTP ${res.status}`);
  return data.result;
}
const pngOf = o => o.illustrazione ? o.illustrazione.replace(/\.svg$/, '.png') : '';

if (!DRY && (!TOKEN || !CHAT)) {
  console.log('Telegram non ancora configurato (mancano i secrets TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID).');
  process.exit(0);
}

if (ACTION === 'foto-canale') {
  const fd = new FormData();
  fd.append('chat_id', CHAT);
  fd.append('photo', new Blob([fs.readFileSync('img/telegram-logo.png')], { type: 'image/png' }), 'logo.png');
  await tg('setChatPhoto', fd);
  console.log('Foto del canale aggiornata.');
  process.exit(0);
}
if (ACTION === 'aggiungi-pulsanti') {
  const o = now.offers.find(x => x.asin === FORCE);
  if (!o || !MSG_ID) { console.error('Servono ASIN e numero del messaggio.'); process.exit(1); }
  await tg('editMessageReplyMarkup', { chat_id: CHAT, message_id: Number(MSG_ID), reply_markup: buttons(o) });
  console.log(`Pulsanti aggiunti al messaggio ${MSG_ID}.`);
  process.exit(0);
}

let failed = false;
for (const o of toPost) {
  const text = message(o);
  if (DRY) { console.log(text + '\n---'); continue; }
  try {
    const png = pngOf(o);
    if (png && fs.existsSync(png)) {
      const fd = new FormData();
      fd.append('chat_id', CHAT);
      fd.append('caption', text);
      fd.append('parse_mode', 'HTML');
      fd.append('reply_markup', JSON.stringify(buttons(o)));
      fd.append('photo', new Blob([fs.readFileSync(png)], { type: 'image/png' }), `${o.asin}.png`);
      await tg('sendPhoto', fd);
    } else {
      await tg('sendMessage', { chat_id: CHAT, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: buttons(o) });
    }
    console.log(`Pubblicata: ${o.asin}`);
  } catch (e) { failed = true; console.error(`Errore per ${o.asin}: ${e.message}`); }
}
process.exit(failed ? 1 : 0);
