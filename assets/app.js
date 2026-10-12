(function(){
'use strict';

/* ===== Configurazione e categorie ===== */
const CFG = window.FP_CONFIG || {};
const TAG = CFG.tag || '';
const CATS = [
  {slug:'elettronica', name:'Elettronica', c:'#FF6A4D', icon:'headphones'},
  {slug:'informatica', name:'Informatica', c:'#9C8CFF', icon:'laptop'},
  {slug:'casa',        name:'Casa',        c:'#FFC93D', icon:'house'},
  {slug:'cucina',      name:'Cucina',      c:'#FF9356', icon:'pot'},
  {slug:'sport',       name:'Sport',       c:'#3DD9B6', icon:'dumbbell'},
  {slug:'giochi',      name:'Giochi',      c:'#62BDFF', icon:'gamepad'},
  {slug:'bellezza',    name:'Bellezza',    c:'#EC86FF', icon:'bottle'},
  {slug:'fai-da-te',   name:'Fai da te',   c:'#ADDC45', icon:'wrench'}
];
const CAT = Object.fromEntries(CATS.map(c=>[c.slug,c]));

/* ===== Icone ===== */
const ICONS = {
  headphones:'<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="6.5" rx="1.6"/><rect x="16.5" y="14" width="4.5" height="6.5" rx="1.6"/>',
  laptop:'<rect x="4" y="5" width="16" height="11" rx="1.6"/><path d="M2 19.5h20"/><path d="M8 9l2.5 2.5L8 14"/>',
  house:'<path d="M3 11l9-7 9 7"/><path d="M5 9.8V20h14V9.8"/><path d="M10 20v-6h4v6"/>',
  pot:'<path d="M4 10h16v5.5A4.5 4.5 0 0 1 15.5 20h-7A4.5 4.5 0 0 1 4 15.5z"/><path d="M2 10h2M20 10h2M9 6.5c0-1.2 1.2-1.2 1.2-2.5M13.8 6.5c0-1.2 1.2-1.2 1.2-2.5"/>',
  dumbbell:'<path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/>',
  gamepad:'<path d="M7 7h10a5 5 0 0 1 4.9 6l-.7 3.2a2.4 2.4 0 0 1-4 1.2L15 15.3H9l-2.2 2.1a2.4 2.4 0 0 1-4-1.2L2.1 13A5 5 0 0 1 7 7z"/><path d="M7.5 10v3.5M5.8 11.75h3.4"/><circle cx="16" cy="10.6" r=".6" fill="currentColor"/><circle cx="17.8" cy="12.8" r=".6" fill="currentColor"/>',
  bottle:'<rect x="7" y="9" width="10" height="12" rx="2.4"/><path d="M10 9V6h4v3M12 3v3M9.5 14h5"/>',
  wrench:'<path d="M14.7 6.3a4 4 0 0 0 5 5L11.2 19.8a2.2 2.2 0 0 1-3.1-3.1z"/><path d="M14.7 6.3l2.7-2.7a4 4 0 0 1 3 3l-2.7 2.7"/>',
  camera:'<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h10A1.5 1.5 0 0 1 16 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 3 16.5z"/><path d="M16 10.5l5-3v9l-5-3"/><circle cx="7" cy="9.5" r=".7" fill="currentColor"/>',
  bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  check:'<circle cx="12" cy="12" r="9.5"/><path d="M7.5 12.3l3 3 6-6.3"/>',
  info:'<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.5"/>',
  clock:'<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/>',
  chart:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
};
const icon = (n, cls='') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;
const smallIcon = n => icon(n).replace('<svg','<svg width="14" height="14"');

/* ===== Formati ===== */
const esc = s => String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const EUR = new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'});
const eur = v => EUR.format(v);
const longFmt = new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'});
const dayFmt = new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long'});
const timeFmt = new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit'});
const sameDay = (a,b) => a.toDateString()===b.toDateString();
function whenChecked(d){
  if(!d) return '';
  const now = new Date(), y = new Date(now); y.setDate(now.getDate()-1);
  if(sameDay(d,now)) return `oggi alle ${timeFmt.format(d)}`;
  if(sameDay(d,y)) return `ieri alle ${timeFmt.format(d)}`;
  return `il ${dayFmt.format(d)} alle ${timeFmt.format(d)}`;
}
function leftText(ms){
  const h = Math.floor(ms/3600000), m = Math.floor(ms%3600000/60000);
  return h>0 ? `${h} h ${m} min` : `${m} min`;
}
function hms(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  return [Math.floor(s/3600), Math.floor(s%3600/60), s%60].map(v=>String(v).padStart(2,'0')).join(':');
}

/* ===== Dati ===== */
const PRODUCTS = (window.FP_OFFERTE || []).map(o=>{
  const ref = o.prezzoRiferimento || null;
  const storico = o.storico || [];
  return {
    id:o.asin, asin:o.asin, cat:o.categoria, icon:o.icona||'', name:o.titolo, short:o.titoloBreve||o.titolo,
    price:o.prezzo, ref, refLabel:o.tipoRiferimento||'prezzo di riferimento', refShort:o.riferimentoBreve||'Prima',
    disc: ref ? Math.round((ref-o.prezzo)/ref*100) : 0,
    badge:o.badge||'', label:o.etichetta||'',
    ends: o.scadenza ? new Date(o.scadenza) : null,
    checked: o.controllato ? new Date(o.controllato) : null,
    rating:o.valutazione||null, reviews:o.recensioni||null,
    hist: storico.map(x=>x.prezzo), histDates: storico.map(x=>x.data)
  };
}).filter(p=>CAT[p.cat] && p.asin && p.price).map(p=>(p.icon = ICONS[p.icon] ? p.icon : CAT[p.cat].icon, p));
const BY_ID = Object.fromEntries(PRODUCTS.map(p=>[p.id,p]));
const expired = p => !!(p.ends && p.ends < new Date());
const DAY = 24*3600*1000;
// Un prezzo controllato più di 24 ore fa non viene mostrato: si invita a verificarlo su Amazon
const stale = p => !expired(p) && (!p.checked || Date.now() - p.checked > DAY);
const noPrice = p => expired(p) || stale(p);
const live = () => PRODUCTS.filter(p=>!noPrice(p));
const affLink = p => `https://www.amazon.it/dp/${encodeURIComponent(p.asin)}${TAG?`?tag=${encodeURIComponent(TAG)}`:''}`;
const linkAttrs = 'target="_blank" rel="nofollow sponsored noopener"';
function dealOfDay(){
  const chosen = BY_ID[CFG.sceltaDelGiorno];
  if(chosen && !noPrice(chosen)) return chosen;
  return [...live()].sort((a,b)=>b.disc-a.disc)[0] || null;
}
function sortList(list, mode){
  const l = [...list];
  if(mode==='prezzo') l.sort((a,b)=>a.price-b.price);
  else if(mode==='risparmio') l.sort((a,b)=>((b.ref||b.price)-b.price)-((a.ref||a.price)-a.price));
  else l.sort((a,b)=>b.disc-a.disc);
  const rank = p => expired(p) ? 2 : stale(p) ? 1 : 0;
  return l.sort((a,b)=>rank(a)-rank(b));
}
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ===== Confronto prezzi e storico ===== */
function compare(p){
  if(!p.ref) return '';
  const max = Math.max(p.ref, p.price);
  return `<div class="compare" role="img" aria-label="${esc(p.refShort)} ${eur(p.ref)}, oggi ${eur(p.price)}">
    <div class="cmp-row"><span>${esc(p.refShort)}</span><span class="cmp-bar"><i style="width:${(p.ref/max*100).toFixed(1)}%"></i></span><b>${eur(p.ref)}</b></div>
    <div class="cmp-row now"><span>Oggi</span><span class="cmp-bar"><i style="width:${Math.max(2,p.price/max*100).toFixed(1)}%"></i></span><b>${eur(p.price)}</b></div>
  </div>`;
}
function spark(p, {w=480, h=200}={}){
  const hist = p.hist, n = hist.length;
  const L=52, R=14, T=16, B=26;
  const lo = Math.min(...hist), hi = Math.max(...hist), span = (hi-lo)||1;
  const X = i => L + (w-L-R)*i/(n-1);
  const Y = v => T + (h-T-B)*(1-(v-lo)/span);
  const d = hist.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
  const gid = 'g'+p.id;
  const mi = hist.indexOf(lo);
  const lbl = s => { const dd = new Date(s+'T12:00:00'); return isNaN(dd) ? '' : dayFmt.format(dd); };
  let s = `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Prezzi registrati: minimo ${eur(lo)}, oggi ${eur(p.price)}">`;
  s += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hot);stop-opacity:.26"/><stop offset="1" style="stop-color:var(--hot);stop-opacity:0"/></linearGradient></defs>`;
  [hi,(hi+lo)/2,lo].forEach(v=>{
    s += `<line class="grid" x1="${L}" x2="${w-R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${Math.round(v)} €</text>`;
  });
  s += `<text x="${L}" y="${h-6}">${lbl(p.histDates[0])}</text><text x="${w-R}" y="${h-6}" text-anchor="end">oggi</text>`;
  s += `<path d="${d} L${X(n-1).toFixed(1)} ${h-B} L${X(0).toFixed(1)} ${h-B} Z" fill="url(#${gid})"/><path class="line" d="${d}" pathLength="1000"/>`;
  if(mi !== n-1) s += `<circle class="min-dot" cx="${X(mi)}" cy="${Y(lo)}" r="5"/>`;
  s += `<circle class="now-ring" cx="${X(n-1)}" cy="${Y(p.price)}" r="5"/><circle class="${mi===n-1?'min-dot':'now-dot'}" cx="${X(n-1)}" cy="${Y(p.price)}" r="5.5"/>`;
  return s + '</svg>';
}
const priceChart = p => p.hist.length >= 5 ? spark(p) : compare(p);

/* ===== Componenti ===== */
function card(p){
  const c = CAT[p.cat], ex = expired(p), np = noPrice(p);
  const right = ex ? 'Offerta terminata'
    : np ? `Ultimo controllo ${whenChecked(p.checked)}`
    : p.ends ? `Termina tra ${leftText(p.ends - new Date())}`
    : p.checked ? `Controllato ${whenChecked(p.checked)}` : '';
  return `<article class="card${np?' expired':''}" data-id="${esc(p.id)}" style="--c:${c.c}" tabindex="0" aria-label="${esc(p.short)}${np?'':`, ${eur(p.price)}`}">
    <div class="card-media">${icon(p.icon,'pi')}
      ${p.disc>0&&!np?`<span class="sticker disc">−${p.disc}%</span>`:''}
      ${p.badge&&!np?`<span class="min-badge">${icon('bolt')}${esc(p.badge)}</span>`:''}
      ${p.label&&!np?`<span class="deal-flag">${esc(p.label)}</span>`:''}
      ${np?`<span class="exp-flag">${ex?'Terminata':'Da verificare'}</span>`:''}
    </div>
    <h3>${esc(p.name)}</h3>
    <div class="card-prices">${np?`<span class="card-price" style="font-size:19px">Verifica il prezzo</span>`:`<span class="card-price">${eur(p.price)}</span>${p.ref?`<span class="was" title="${esc(p.refLabel)}">${eur(p.ref)}</span>`:''}`}</div>
    <div class="card-foot"><span>${p.ref&&!np?`${esc(p.refShort)}<br><b>${eur(p.ref)}</b>`:''}</span><span style="text-align:right">${right}</span></div>
    <a class="btn btn-hot btn-sm go" href="${affLink(p)}" ${linkAttrs}>Vedi su Amazon <span class="arr">→</span></a>
  </article>`;
}

function hero(p){
  const c = CAT[p.cat], ex = expired(p);
  return `<section class="wrap hero">
    <div>
      <div class="eyebrow"><span class="pulse"></span><strong>Scelta del giorno</strong><span>${longFmt.format(new Date())}</span></div>
      <h1>${esc(p.short)}</h1>
      ${p.rating?`<div class="rating">${icon('star')}<b>${String(p.rating).replace('.',',')}</b> su 5${p.reviews?` · ${p.reviews} recensioni su Amazon`:''}</div>`:''}
      <div class="price-row">
        <span class="price-big" id="hero-price" data-from="${p.ref||p.price}" data-to="${p.price}">${eur(p.price)}</span>
        ${p.ref?`<span class="price-side"><span class="was">${eur(p.ref)}</span><small>${esc(p.refLabel)}</small></span>`:''}
        ${p.disc>0?`<span class="sticker lg">−${p.disc}%</span>`:''}
      </div>
      <div class="chart-card">
        <div class="chart-head"><span><b>Prezzo a confronto</b> · dati Amazon.it</span>${p.badge?`<span class="tag-ok">${esc(p.badge)}</span>`:''}</div>
        ${priceChart(p)}
        <p class="src">Prezzo controllato ${whenChecked(p.checked)}. Può cambiare: vale quello mostrato su Amazon al momento dell'acquisto.</p>
      </div>
      <div class="cta-row">
        <a class="btn btn-hot mag go" href="${affLink(p)}" ${linkAttrs}>Prendilo su Amazon <span class="arr">→</span></a>
        <button class="btn btn-ghost mag" type="button" data-open="${esc(p.id)}">Dettagli prezzo</button>
        ${p.ends ? `<span class="timer" id="timer">${icon('clock').replace('<svg','<svg width="16" height="16"')}<span id="timer-txt">${ex?'Offerta terminata':`${esc(p.label||'Offerta')}: termina tra <b id="cd">${hms(p.ends-new Date())}</b>`}</span></span>` : ''}
      </div>
    </div>
    <div class="hero-visual" style="--c:${c.c}">
      <div class="blob"></div>
      <div class="visual-icon">${icon(p.icon)}</div>
      <svg class="badge-rot" viewBox="0 0 120 120" aria-hidden="true">
        <defs><path id="circ" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0"/></defs>
        <g class="ring-txt"><text><textPath href="#circ" textLength="286">SCELTA DEL GIORNO • SCELTA DEL GIORNO • </textPath></text></g>
        <circle class="core" cx="60" cy="60" r="30"/>
        <g class="core-ic" transform="translate(45 45) scale(1.25)"><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/></g>
      </svg>
      ${p.ref?`<div class="float-tag"><small>Risparmi oggi</small><strong>${eur(p.ref-p.price)}</strong></div>`:''}
    </div>
  </section>`;
}

function catTiles(){
  return `<div class="cat-grid">${CATS.map(c=>{
    const n = live().filter(p=>p.cat===c.slug).length;
    return `<a class="cat-tile" href="#cat-${c.slug}" style="--c:${c.c}">${icon(c.icon)}<div><strong>${c.name}</strong><span>${n ? `${n} ${n===1?'offerta':'offerte'} attive` : 'Offerte in arrivo'}</span></div></a>`;
  }).join('')}</div>`;
}
const howSection = () => `<section class="wrap sec" id="come-funziona">
  <div class="how">
    <h2>Come scegliamo le offerte</h2>
    <div class="how-steps">
      <div>${icon('radar')}<h3>Controlliamo i prezzi</h3><p>Ogni giorno verifichiamo su Amazon.it il prezzo dei prodotti in offerta, con data e ora del controllo.</p></div>
      <div>${icon('chart')}<h3>Li confrontiamo</h3><p>Lo sconto è calcolato sul prezzo più basso degli ultimi 30 giorni indicato da Amazon, non su un prezzo di listino gonfiato.</p></div>
      <div>${icon('star')}<h3>Scegliamo l'affare del giorno</h3><p>Ogni giorno mettiamo in evidenza l'offerta con il risparmio più grande e lo storico più convincente.</p></div>
    </div>
  </div>
</section>`;

function home(){
  const pick = dealOfDay();
  const list = sortList(PRODUCTS, 'sconto');
  const top = pick ? hero(pick) : `<section class="wrap prose"><h1>La nuova scelta del giorno arriva a breve</h1><p>Stiamo ricontrollando i prezzi su Amazon.it. Intanto guarda le offerte qui sotto.</p></section>`;
  return top + (list.length ? `
  <section class="wrap sec">
    <div class="sec-head"><div><h2>Le offerte di oggi</h2><p>Prezzi controllati su Amazon.it, con lo sconto calcolato sul prezzo più basso degli ultimi 30 giorni.</p></div><a class="link-more" href="#offerte">Vedi tutte <span class="arr">→</span></a></div>
    <div class="grid">${list.slice(0,8).map(card).join('')}</div>
  </section>` : '') + `
  <section class="wrap sec">
    <div class="sec-head"><div><h2>Sfoglia per categoria</h2><p>Nuove offerte ogni giorno in tutte le categorie.</p></div></div>
    ${catTiles()}
  </section>` + howSection();
}

const view = {sort:'sconto'};
const toolbar = () => `<div class="toolbar"><label for="sort">Ordina per
  <select id="sort"><option value="sconto">Sconto più alto</option><option value="risparmio">Risparmio in euro</option><option value="prezzo">Prezzo più basso</option></select></label></div>`;
function scopeList(scope){ return scope==='offerte' ? PRODUCTS : PRODUCTS.filter(p=>p.cat===scope); }
function listGrid(scope){
  const l = sortList(scopeList(scope), view.sort);
  if(l.length) return `<div class="grid">${l.map(card).join('')}</div>`;
  const c = CAT[scope];
  return `<div class="empty">Nessuna offerta${c?` di ${c.name.toLowerCase()}`:''} in questo momento. Ne aggiungiamo di nuove ogni giorno. <a href="#offerte">Vedi tutte le offerte</a></div>`;
}
function listPage(scope){
  const c = CAT[scope];
  const n = scopeList(scope).filter(p=>!expired(p)).length;
  const title = c ? c.name : 'Tutte le offerte';
  const head = c ? `<div class="ph-ic">${icon(c.icon)}</div>` : `<div class="ph-ic">${icon('bolt')}</div>`;
  return `<section class="wrap">
    <div class="page-head" style="--c:${c?c.c:'var(--sun)'}">${head}<div><h1>${title}</h1><p>${n} ${n===1?'offerta attiva':'offerte attive'}</p></div></div>
    ${toolbar()}<div id="list" data-scope="${scope}">${listGrid(scope)}</div>
  </section>`;
}
function searchPage(q){
  const t = q.toLowerCase();
  const list = PRODUCTS.filter(p=>p.name.toLowerCase().includes(t) || CAT[p.cat].name.toLowerCase().includes(t));
  return `<section class="wrap">
    <div class="page-head"><div><h1>Risultati per “${esc(q)}”</h1><p>${list.length} ${list.length===1?'prodotto trovato':'prodotti trovati'}</p></div></div>
    ${list.length?`<div class="grid">${sortList(list,'sconto').map(card).join('')}</div>`:`<div class="empty">Nessuna offerta trovata. Prova con un'altra parola o <a href="#offerte">guarda tutte le offerte</a>.</div>`}
  </section>`;
}
function privacyPage(){
  return `<section class="wrap"><div class="prose">
    <h1>Privacy e cookie</h1>
    <p>fuoriprezzo.it è un sito di segnalazione di offerte. Non richiede registrazione e non raccoglie dati personali tramite moduli.</p>
    <h2>Cookie e dati tecnici</h2>
    <p>Il sito non usa cookie di profilazione propri. Ricorda solo, nel tuo browser, se hai scelto il tema chiaro o scuro. Il sito è ospitato su GitHub Pages e usa i caratteri tipografici di Google Fonts: per mostrarti le pagine, questi servizi ricevono dati tecnici come l'indirizzo IP del tuo dispositivo.</p>
    <h2>Link ad Amazon</h2>
    <p>In qualità di Affiliato Amazon, fuoriprezzo.it riceve un guadagno dagli acquisti idonei. Quando clicchi un link verso Amazon.it, Amazon usa i propri cookie anche per attribuire l'acquisto al programma di affiliazione. Per te il prezzo non cambia. Il trattamento dei dati su Amazon è regolato dall'informativa di Amazon.</p>
    <h2>Prezzi</h2>
    <p>Prezzi e disponibilità sono quelli rilevati su Amazon.it alla data e all'ora indicate e possono cambiare in qualsiasi momento. Vale il prezzo mostrato su Amazon.it al momento dell'acquisto.</p>
  </div></section>`;
}

/* ===== Struttura fissa: menu, footer, ticker ===== */
const app = document.getElementById('app');
const nav = document.getElementById('nav');
nav.innerHTML = `<a class="chip" href="#home" data-r="home">Scelta del giorno</a><a class="chip hot" href="#offerte" data-r="offerte">${smallIcon('bolt')} Tutte le offerte</a>` +
  CATS.map(c=>`<a class="chip" href="#cat-${c.slug}" data-r="cat-${c.slug}" style="--c:${c.c}"><span class="dot"></span>${c.name}</a>`).join('');
document.getElementById('foot-cats').innerHTML = CATS.map(c=>`<li><a href="#cat-${c.slug}">${c.name}</a></li>`).join('');
document.getElementById('year').textContent = new Date().getFullYear();
(function ticker(){
  const deals = sortList(live(),'sconto').slice(0,10).map(p=>`<a href="${affLink(p)}" ${linkAttrs}><b>−${p.disc}%</b>${esc(p.short)} · ${eur(p.price)}</a>`);
  const msgs = ['Prezzi controllati ogni giorno su Amazon.it','Sconti calcolati sul prezzo più basso degli ultimi 30 giorni','Una nuova scelta del giorno ogni giorno'].map(m=>`<span>${smallIcon('bolt')}${m}</span>`);
  let items = [];
  deals.forEach((d,i)=>{ items.push(d); if(msgs[i]) items.push(msgs[i]); });
  msgs.slice(deals.length).forEach(m=>items.push(m));
  while(items.length < 8) items = items.concat(items);
  const html = items.join('');
  document.getElementById('ticker').innerHTML = html + html.replace(/<(a|span) /g,'<$1 aria-hidden="true" tabindex="-1" ');
})();

/* ===== Navigazione ===== */
function route(){
  const h = location.hash.slice(1) || 'home';
  document.getElementById('q').value = '';
  view.sort = 'sconto';
  let html;
  if(h.startsWith('cat-') && CAT[h.slice(4)]) html = listPage(h.slice(4));
  else if(h==='offerte') html = listPage('offerte');
  else if(h==='privacy') html = privacyPage();
  else html = home();
  app.innerHTML = html;
  app.firstElementChild?.classList.add('reveal');
  nav.querySelectorAll('.chip').forEach(a=>{
    const on = a.dataset.r===h || (a.dataset.r==='home' && (h==='home'||h==='come-funziona'));
    on ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current');
    if(on) a.scrollIntoView({block:'nearest',inline:'nearest'});
  });
  if(h==='come-funziona') document.getElementById('come-funziona')?.scrollIntoView({behavior:reduce?'auto':'smooth'});
  else window.scrollTo(0,0);
  afterRender();
}
window.addEventListener('hashchange', route);
app.addEventListener('change', e=>{
  if(e.target.id!=='sort') return;
  view.sort = e.target.value;
  const box = document.getElementById('list');
  if(box) box.innerHTML = listGrid(box.dataset.scope);
});
let qt;
document.getElementById('q').addEventListener('input', e=>{
  clearTimeout(qt);
  qt = setTimeout(()=>{
    const q = e.target.value.trim();
    if(q.length>=2){ app.innerHTML = searchPage(q); afterRender(); }
    else if(!q){ route(); }
  }, 160);
});

/* ===== Animazioni ===== */
let cdTimer;
function afterRender(){
  const el = document.getElementById('hero-price');
  if(el && !reduce && +el.dataset.from !== +el.dataset.to){
    const from=+el.dataset.from, to=+el.dataset.to, t0=performance.now(), dur=1400;
    const step = t => { const k=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-k,4); el.textContent = eur(from+(to-from)*e); if(k<1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  clearInterval(cdTimer);
  const cd = document.getElementById('cd'), pick = dealOfDay();
  if(cd && pick && pick.ends){
    cdTimer = setInterval(()=>{
      const left = pick.ends - new Date();
      if(left <= 0){ clearInterval(cdTimer); document.getElementById('timer-txt').textContent = 'Offerta terminata'; return; }
      cd.textContent = hms(left);
    }, 1000);
  }
}
const fine = matchMedia('(pointer: fine)').matches;
document.addEventListener('pointermove', e=>{
  if(reduce || !fine) return;
  const c = e.target.closest?.('.card');
  if(c){
    const r = c.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
    c.style.setProperty('--ry', ((x-.5)*7).toFixed(2)+'deg');
    c.style.setProperty('--rx', ((.5-y)*7).toFixed(2)+'deg');
    const m = c.querySelector('.card-media'), mr = m.getBoundingClientRect();
    m.style.setProperty('--mx', ((e.clientX-mr.left)/mr.width*100)+'%');
    m.style.setProperty('--my', ((e.clientY-mr.top)/mr.height*100)+'%');
  }
  const b = e.target.closest?.('.mag');
  if(b){
    const r = b.getBoundingClientRect();
    b.style.transform = `translate(${((e.clientX-r.left)/r.width-.5)*10}px,${((e.clientY-r.top)/r.height-.5)*8}px)`;
  }
});
document.addEventListener('pointerout', e=>{
  const c = e.target.closest?.('.card');
  if(c && !c.contains(e.relatedTarget)){ c.style.setProperty('--rx','0deg'); c.style.setProperty('--ry','0deg'); }
  const b = e.target.closest?.('.mag');
  if(b && !b.contains(e.relatedTarget)) b.style.transform = '';
});
function burst(x, y){
  if(reduce) return;
  const cols = ['var(--hot)','var(--sun)','var(--mint)','var(--ink)'];
  for(let i=0;i<14;i++){
    const s = document.createElement('span'), a = Math.random()*Math.PI*2, d = 50+Math.random()*70;
    s.className='bit'; s.style.left=x+'px'; s.style.top=y+'px'; s.style.background=cols[i%4];
    s.style.setProperty('--tx', Math.cos(a)*d+'px'); s.style.setProperty('--ty', Math.sin(a)*d-30+'px');
    document.body.appendChild(s); setTimeout(()=>s.remove(), 850);
  }
}
document.addEventListener('click', e=>{
  if(e.target.closest('.go')){ burst(e.clientX, e.clientY); return; }
  const op = e.target.closest('[data-open]');
  if(op){ openDrawer(op.dataset.open); return; }
  const c = e.target.closest('.card');
  if(c) openDrawer(c.dataset.id);
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && !drawer.hidden) closeDrawer();
  if(e.key==='Enter' && e.target.classList?.contains('card')) openDrawer(e.target.dataset.id);
});

/* ===== Scheda prodotto ===== */
const drawer = document.getElementById('drawer'), backdrop = document.getElementById('backdrop');
let lastFocus;
function openDrawer(id){
  const p = BY_ID[id]; if(!p) return;
  const c = CAT[p.cat], ex = expired(p), np = noPrice(p);
  document.getElementById('d-cat').textContent = c.name;
  if(np){
    document.getElementById('d-body').innerHTML = `
    <div class="d-media" style="--c:${c.c}">${icon(p.icon,'pi')}</div>
    <h2 id="d-title">${esc(p.name)}</h2>
    <div class="verdict meh">${icon('info')}<span><b>${ex?'Offerta terminata.':'Prezzo da verificare.'}</b> Ultimo controllo ${whenChecked(p.checked)}. Il prezzo attuale lo trovi su Amazon.</span></div>
    <a class="btn btn-hot mag go" href="${affLink(p)}" ${linkAttrs}>Vedi il prezzo su Amazon <span class="arr">→</span></a>
    <p class="note">Link affiliato: per te il prezzo non cambia.</p>`;
    return showDrawer();
  }
  const verdict = ex
    ? `<div class="verdict meh">${icon('info')}<span><b>Offerta terminata.</b> Il prezzo su Amazon potrebbe essere tornato più alto: controllalo prima di acquistare.</span></div>`
    : p.ref && p.price < p.ref
      ? `<div class="verdict good">${icon('check')}<span><b>Costa ${p.disc}% in meno</b> del ${esc(p.refLabel)} (${eur(p.ref)}). Risparmi ${eur(p.ref-p.price)}.</span></div>`
      : '';
  document.getElementById('d-body').innerHTML = `
    <div class="d-media" style="--c:${c.c}">${icon(p.icon,'pi')}${p.disc>0?`<span class="sticker disc">−${p.disc}%</span>`:''}${p.label&&!ex?`<span class="deal-flag" style="top:16px;right:16px">${esc(p.label)}</span>`:''}</div>
    <h2 id="d-title">${esc(p.name)}</h2>
    <div class="price-row"><span class="price-big" style="font-size:clamp(40px,8vw,56px)">${eur(p.price)}</span>${p.ref?`<span class="price-side"><span class="was">${eur(p.ref)}</span><small>${esc(p.refLabel)}</small></span>`:''}</div>
    ${verdict}
    ${p.ends && !ex ? `<p><span class="timer">${icon('clock').replace('<svg','<svg width="16" height="16"')}${esc(p.label||'Offerta')}: termina tra ${leftText(p.ends-new Date())}</span></p>` : ''}
    <div class="chart-card">${priceChart(p)}${p.hist.length<5?`<p class="src">Lo storico dei prezzi si completa con i controlli dei prossimi giorni.</p>`:''}</div>
    <div class="stats">
      <div class="stat now"><small>Oggi</small><b>${eur(p.price)}</b></div>
      ${p.ref?`<div class="stat"><small>${esc(p.refShort)}</small><b>${eur(p.ref)}</b></div><div class="stat min"><small>Risparmio</small><b>${eur(p.ref-p.price)}</b></div>`:''}
      ${p.rating?`<div class="stat"><small>Valutazione</small><b>${String(p.rating).replace('.',',')}<span style="font-size:15px;color:var(--muted)"> / 5</span></b></div>`:''}
    </div>
    <a class="btn btn-hot mag go" href="${affLink(p)}" ${linkAttrs}>Vai all'offerta su Amazon <span class="arr">→</span></a>
    <p class="note">Prezzo controllato su Amazon.it ${whenChecked(p.checked)}. Prezzi e disponibilità possono cambiare: vale quello mostrato su Amazon al momento dell'acquisto. Link affiliato: per te il prezzo non cambia.</p>`;
  showDrawer();
}
function showDrawer(){
  lastFocus = document.activeElement;
  drawer.hidden = false; backdrop.hidden = false; drawer.scrollTop = 0;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ drawer.classList.add('open'); backdrop.classList.add('open'); }));
  document.body.style.overflow = 'hidden';
  document.getElementById('d-close').focus({preventScroll:true});
}
function closeDrawer(){
  drawer.classList.remove('open'); backdrop.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(()=>{ drawer.hidden = true; backdrop.hidden = true; }, reduce?0:420);
  lastFocus?.focus?.({preventScroll:true});
}
document.getElementById('d-close').addEventListener('click', closeDrawer);
backdrop.addEventListener('click', closeDrawer);

/* ===== Tema ===== */
const root = document.documentElement;
try{ const t = localStorage.getItem('fp-theme'); if(t) root.dataset.theme = t; }catch(e){}
document.getElementById('theme').addEventListener('click', ()=>{
  const dark = root.dataset.theme ? root.dataset.theme==='dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try{ localStorage.setItem('fp-theme', root.dataset.theme); }catch(e){}
});

route();
})();
