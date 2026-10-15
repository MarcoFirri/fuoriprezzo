// Il "cervello" della pubblicazione Instagram: decide cosa pubblicare adesso (niente, un post/reel, una storia).
// Non chiama Instagram: riceve i dati e restituisce una decisione, così si può provare senza pubblicare.
// La strategia (data/instagram-strategia.json) cambia ogni giorno in base ai risultati; i LIMITI qui sotto no.

// Limitazione dell'account fino all'11/11/2026: solo la scelta del giorno, un'offerta (post + reel) ogni 12 ore,
// al massimo una storia al giorno (storie attive da subito: deciso da Marco il 13/10/2026).
export const FINE_PRUDENZA = new Date('2026-11-12T00:00:00+01:00');
const LIMITI = {
  prudente: { postAlGiorno: 1, distanzaOre: 12, storieAlGiorno: 1 },
  normale: { postAlGiorno: 2, distanzaOre: 6, storieAlGiorno: 3 }
};
const SILENZIO = [0, 7]; // dalle 0 alle 7:59 non si pubblica
export const STRATEGIA_BASE = {
  formati: { reel: 0.5, foto: 0.5 },
  aperture: { scelta: 0.34, prezzo: 0.33, nota: 0.33 },
  orari: { 13: 0.4, 19: 0.4, 21: 0.2 },
  postAlGiorno: 1,
  storieAlGiorno: 1,
  orarioStoriaRicordo: 20
};

const H = 3600e3;
const oraRoma = d => Number(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', hourCycle: 'h23' }).format(d));
const giornoRoma = d => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(d);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Numero pseudo-casuale stabile (stesso giorno + stessa chiave = stesso risultato in tutte le esecuzioni)
function caso(chiave){
  let h = 2166136261;
  for (const c of chiave) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}
export function scegli(pesi, chiave){
  const voci = Object.entries(pesi).filter(([, p]) => p > 0);
  const tot = voci.reduce((s, [, p]) => s + p, 0);
  let r = caso(chiave) * tot;
  for (const [k, p] of voci) { if ((r -= p) < 0) return k; }
  return voci.at(-1)?.[0];
}

export function leggiStrategia(raw){
  const s = { ...STRATEGIA_BASE, ...(raw || {}) };
  const ok = o => o && typeof o === 'object' && Object.values(o).some(v => v > 0);
  for (const k of ['formati', 'aperture', 'orari']) if (!ok(s[k])) s[k] = STRATEGIA_BASE[k];
  s.orari = Object.fromEntries(Object.entries(s.orari).filter(([h]) => +h > SILENZIO[1] && +h <= 23));
  if (!ok(s.orari)) s.orari = STRATEGIA_BASE.orari;
  return s;
}

// Riconosce l'offerta di un post già pubblicato dalla didascalia
export function asinDelPost(caption, offerte){
  const m = /Codice Amazon: ([A-Z0-9]{10})/.exec(caption || '');
  if (m) return m[1];
  const o = offerte.find(o => o.titoloBreve && (caption || '').includes(o.titoloBreve));
  return o?.asin || null;
}

/**
 * @param now Date
 * @param offerte, cfg  da data/offerte.js
 * @param strategia  da leggiStrategia()
 * @param recenti   [{timestamp, caption, media_product_type}] ultimi post del profilo
 * @param storie    [{timestamp}] storie delle ultime 24 ore
 * @param file      funzione asin, tipo ('ig'|'reel'|'story') → true se il file esiste
 */
export function decidi({ now, offerte, cfg, strategia, recenti, storie, file }){
  const prudente = now < FINE_PRUDENZA;
  const L = LIMITI[prudente ? 'prudente' : 'normale'];
  const out = { prudente, feed: null, storia: null, motivi: [] };
  const ora = oraRoma(now), oggi = giornoRoma(now);
  if (ora >= SILENZIO[0] && ora <= SILENZIO[1]) { out.motivi.push(`Sono le ${ora}: di notte non si pubblica.`); return out; }

  const valida = o => (!o.scadenza || new Date(o.scadenza) > now) && o.controllato && (now - new Date(o.controllato)) < 24 * H;
  const pick = cfg.sceltaDelGiorno;
  const pubblicati = new Set(recenti.map(m => asinDelPost(m.caption, offerte)).filter(Boolean));

  // --- Post o reel nel profilo ---
  // Ogni offerta esce come post + reel insieme (scelta di Marco, 15/10/2026, anche durante la prudenza): i limiti contano le offerte, non i reel
  const contano = recenti.filter(m => m.media_product_type !== 'REELS');
  const ultimo = contano.map(m => new Date(m.timestamp)).sort((a, b) => b - a)[0];
  const in24 = contano.filter(m => now - new Date(m.timestamp) < 24 * H).length;
  const maxGiorno = Math.min(L.postAlGiorno, clamp(strategia.postAlGiorno | 0, 1, 2));
  let candidati = offerte.filter(o => valida(o) && !pubblicati.has(o.asin) && file(o.asin, 'ig'));
  if (prudente) candidati = candidati.filter(o => o.asin === pick);
  // Orario del giorno: scelto dalla strategia, uguale per tutte le esecuzioni della giornata
  const orario = +scegli(strategia.orari, `${oggi}-orario-${in24}`);
  // Urgente = l'offerta finisce prima dell'orario scelto (più un'ora di margine)
  const scade = o => !!o.scadenza && new Date(o.scadenza) - now < Math.max(0, orario - ora) * H + H;
  if (!prudente) candidati.sort((a, b) => scade(b) - scade(a) || (b.asin === pick) - (a.asin === pick) || sconto(b) - sconto(a));
  const o = candidati[0];
  const urgente = o && scade(o);

  if (!o) out.motivi.push(prudente ? 'Nessuna scelta del giorno valida e non ancora pubblicata.' : 'Nessuna offerta valida e non ancora pubblicata.');
  else if (ultimo && now - ultimo < L.distanzaOre * H) out.motivi.push(`Ultimo post ${Math.floor((now - ultimo) / H)} ore fa: ne servono almeno ${L.distanzaOre}.`);
  else if (in24 >= maxGiorno) out.motivi.push(`Già ${in24} post nelle ultime 24 ore (massimo ${maxGiorno}).`);
  else if (ora < orario && !urgente) out.motivi.push(`Oggi l'orario scelto è alle ${orario}: aspetto.`);
  else {
    let formato = 'entrambi';
    if (formato !== 'foto' && !file(o.asin, 'reel')) formato = 'foto';
    let apertura = scegli(strategia.aperture, `${oggi}-${o.asin}-apertura`);
    if (apertura === 'nota' && !o.nota) apertura = 'scelta';
    if (apertura === 'prezzo' && !(sconto(o) > 0)) apertura = 'scelta';
    out.feed = { asin: o.asin, formato, apertura };
    out.motivi.push(`Pubblico ${o.asin} come ${formato} (apertura "${apertura}")${urgente && ora < orario ? ', subito perché l\'offerta sta per finire' : ` alle ${ora}`}.`);
  }

  // --- Storie (solo dopo la fine della prudenza) ---
  const maxStorie = Math.min(L.storieAlGiorno, clamp(strategia.storieAlGiorno | 0, 0, 3));
  if (!maxStorie) return out;
  const ultimaStoria = storie.map(s => new Date(s.timestamp)).sort((a, b) => b - a)[0];
  const storieOggi = storie.length;
  if (storieOggi >= maxStorie) return out;
  if (out.feed && file(out.feed.asin, 'story')) {
    out.storia = out.feed.asin; // la storia accompagna il nuovo post
  } else if (ora === clamp(strategia.orarioStoriaRicordo | 0, 9, 23) && (!ultimaStoria || now - ultimaStoria > 4 * H)) {
    const p = offerte.find(x => x.asin === pick && valida(x) && file(x.asin, 'story'));
    if (p) out.storia = p.asin; // promemoria serale della scelta del giorno
  }
  if (out.storia) out.motivi.push(`Storia per ${out.storia} (${storieOggi + 1} di ${maxStorie} oggi).`);
  return out;
}

export function sconto(o){
  const ref = o.prezzoRiferimento;
  return ref ? Math.round((ref - o.prezzo) / ref * 100) : 0;
}
