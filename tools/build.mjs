// Genera le pagine statiche per Google: home (contenuto di riserva), /offerta/<ASIN>/, /categoria/<slug>/,
// sitemap.xml e robots.txt. Uso: node tools/build.mjs (dalla cartella del sito). Va eseguito a ogni cambio di data/offerte.js.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const SITE = 'https://fuoriprezzo.it';
const TG = 'https://t.me/fuoriprezzo3';
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data/offerte.js', 'utf8'), ctx);
const CFG = ctx.window.FP_CONFIG, OFFERS = ctx.window.FP_OFFERTE;
const seo = JSON.parse(fs.readFileSync('data/seo.json', 'utf8'));
const CATS = seo.categorie;
const CAT = Object.fromEntries(CATS.map(c => [c.slug, c]));
const V = crypto.createHash('md5').update(
  ['data/offerte.js', 'assets/app.js', 'assets/style.css'].map(f => fs.readFileSync(f)).join('')).digest('hex').slice(0, 8);

const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const eur = v => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
const tz = { timeZone: 'Europe/Rome' };
const dataOra = d => new Intl.DateTimeFormat('it-IT', { ...tz, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
const now = new Date();
const expired = o => !!(o.scadenza && new Date(o.scadenza) < now);
const disc = o => o.prezzoRiferimento ? Math.round((o.prezzoRiferimento - o.prezzo) / o.prezzoRiferimento * 100) : 0;
const aff = o => `https://www.amazon.it/dp/${encodeURIComponent(o.asin)}${CFG.tag ? `?tag=${encodeURIComponent(CFG.tag)}` : ''}`;
const pageUrl = o => `/offerta/${o.asin.toLowerCase()}/`;
const short = o => o.titoloBreve || o.titolo;
const img = o => o.illustrazione ? '/' + o.illustrazione : '';
const ogImg = o => o.illustrazione ? `${SITE}/${o.illustrazione.replace(/\.svg$/, '.png')}` : `${SITE}/img/telegram-logo.png`;
const sorted = [...OFFERS].sort((a, b) => (expired(a) - expired(b)) || (disc(b) - disc(a)));

function head({ title, desc, url, image, type = 'website', jsonld = [] }){
  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
<meta name="theme-color" content="#E41E26">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="FuoriPrezzo">
<meta property="og:locale" content="it_IT">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}`;
}

const LOGO = `<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M21.5 3.5h11a4 4 0 0 1 4 4v11a4 4 0 0 1-1.2 2.8L21.6 35a4 4 0 0 1-5.7 0L5 24.1a4 4 0 0 1 0-5.7L18.7 4.7a4 4 0 0 1 2.8-1.2z" fill="currentColor"/><circle cx="29" cy="11" r="3" fill="var(--bg)"/><path d="M12 22l9-9" stroke="var(--bg)" stroke-width="3" stroke-linecap="round"/></svg>`;
const navChips = cur => `<a class="chip" href="/">Scelta del giorno</a>` + CATS.map(c =>
  `<a class="chip" href="/categoria/${c.slug}/" style="--c:${c.colore}"${cur === c.slug ? ' aria-current="page"' : ''}><span class="dot"></span>${esc(c.nome)}</a>`).join('');

function shell({ headHtml, body, cur }){
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${headHtml}
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=DM+Mono:wght@400;500&family=Figtree:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=${V}">
<script>try{var t=localStorage.getItem('fp-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body>
<header class="hdr">
  <div class="wrap">
    <div class="hdr-row">
      <a class="logo" href="/" aria-label="FuoriPrezzo, home">${LOGO}<span>fuori<span class="p">prezzo</span><span class="tld">.it</span></span></a>
      <a class="icon-btn tg" style="margin-left:auto" href="${TG}" target="_blank" rel="noopener" aria-label="Canale Telegram di FuoriPrezzo"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.4 3.6 2.9 10.7c-1.3.5-1.2 1.3-.2 1.6l4.7 1.5 1.8 5.6c.2.7.4.9.9.9.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.5Z"/></svg></a>
    </div>
    <nav class="cats" aria-label="Categorie">${navChips(cur)}</nav>
  </div>
</header>
<main>
${body}
</main>
<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <h4>FuoriPrezzo</h4>
        <p>Ogni giorno controlliamo i prezzi su Amazon.it e ti segnaliamo le offerte che valgono davvero. Guardiamo lo storico prezzi di Amazon e scriviamo sempre con quale prezzo è calcolato lo sconto.</p>
        <div class="disclosure">In qualità di Affiliato Amazon, FuoriPrezzo riceve un guadagno dagli acquisti idonei. Per te il prezzo non cambia.</div>
      </div>
      <div><h4>Categorie</h4><ul>${CATS.map(c => `<li><a href="/categoria/${c.slug}/">${esc(c.nome)}</a></li>`).join('')}</ul></div>
      <div><h4>Il sito</h4><ul><li><a href="/">Scelta del giorno</a></li>${PAGINE.map(pg => `<li><a href="/${pg.slug}/">${esc(pg.nome)}</a></li>`).join('')}<li><a href="/#come-funziona">Come funziona</a></li><li><a href="${TG}" target="_blank" rel="noopener">Canale Telegram</a></li><li><a href="/#privacy">Privacy e cookie</a></li></ul></div>
    </div>
    <div class="foot-word" aria-hidden="true">fuori<span>prezzo</span></div>
  </div>
  <div class="wrap foot-bottom"><span>© ${now.getFullYear()} fuoriprezzo.it</span><span>Prezzi e disponibilità possono cambiare dopo l'ultimo controllo. Vale il prezzo mostrato su Amazon.it al momento dell'acquisto.</span></div>
</footer>
<script>
/* Nasconde i prezzi controllati più di 24 ore fa, come nel resto del sito */
document.querySelectorAll('[data-checked]').forEach(function(el){
  var c=new Date(el.getAttribute('data-checked')), e=el.getAttribute('data-ends');
  var stale=(Date.now()-c>864e5)||(e&&new Date(e)<new Date());
  if(stale){ el.classList.add('is-stale'); }
});
</script>
</body>
</html>
`;
}

function staticCard(o){
  const c = CAT[o.categoria] || CATS[0], ex = expired(o);
  return `<article class="card${ex ? ' expired' : ''}" style="--c:${c.colore}" data-checked="${esc(o.controllato)}"${o.scadenza ? ` data-ends="${esc(o.scadenza)}"` : ''}>
    <a class="card-media" href="${pageUrl(o)}" aria-label="${esc(short(o))}">${img(o) ? `<img class="pimg" src="${img(o)}" alt="${esc(short(o))}" loading="lazy" width="400" height="320">` : ''}${disc(o) > 0 && !ex ? `<span class="sticker disc price-only">−${disc(o)}%</span>` : ''}${ex ? '<span class="exp-flag">Terminata</span>' : '<span class="exp-flag stale-only">Da verificare</span>'}</a>
    <h3><a href="${pageUrl(o)}" style="text-decoration:none">${esc(o.titolo)}</a></h3>
    ${ex ? '<div class="card-prices"><span class="card-price" style="font-size:19px">Offerta terminata</span></div>'
      : `<div class="card-prices price-only"><span class="card-price">${eur(o.prezzo)}</span>${o.prezzoRiferimento ? `<span class="was">${eur(o.prezzoRiferimento)}</span>` : ''}</div><div class="card-prices stale-only"><span class="card-price" style="font-size:19px">Verifica il prezzo</span></div>`}
    <a class="btn btn-hot btn-sm go" href="${aff(o)}" target="_blank" rel="nofollow sponsored noopener">Vedi su Amazon <span class="arr">→</span></a>
  </article>`;
}

// Riquadro di iscrizione al canale Telegram, uguale a quello della home
const tgBand = () => `<section class="wrap sec"><div class="tg-band">
  <div><h2>Le offerte arrivano prima su Telegram</h2><p>Iscriviti al canale: ogni nuova offerta e la scelta del giorno ti arrivano sul telefono appena le pubblichiamo.</p></div>
  <a class="btn tg-btn" href="${TG}" target="_blank" rel="noopener"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.4 3.6 2.9 10.7c-1.3.5-1.2 1.3-.2 1.6l4.7 1.5 1.8 5.6c.2.7.4.9.9.9.4 0 .6-.2.9-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.5Z"/></svg>Unisciti al canale <span class="arr">→</span></a>
</div></section>`;
const PAGINE = seo.pagine || [];

function crumbs(list){
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + url })) };
}

// ---------- pagine offerta ----------
fs.rmSync('offerta', { recursive: true, force: true });
for (const o of OFFERS) {
  const c = CAT[o.categoria] || CATS[0], ex = expired(o), d = disc(o), url = pageUrl(o);
  // Titoli entro ~60 caratteri: se il nome del prodotto è lungo si toglie " | FuoriPrezzo"
  const titleBase = ex ? `${short(o)}: offerta terminata` : `${short(o)} a ${eur(o.prezzo)}${d > 0 ? ` (−${d}%)` : ''}`;
  const title = titleBase.length + 14 <= 62 ? `${titleBase} | FuoriPrezzo` : titleBase;
  // Descrizioni entro ~155 caratteri: la nota si aggiunge solo se c'è spazio
  const verif = `Prezzo verificato il ${dataOra(new Date(o.controllato))}.`;
  const verifBreve = `Verificato il ${new Intl.DateTimeFormat('it-IT', { ...tz, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(o.controllato))}.`;
  const base = `${short(o)} a ${eur(o.prezzo)} su Amazon.it${o.prezzoRiferimento ? `, invece di ${eur(o.prezzoRiferimento)} (${o.tipoRiferimento})` : ''}.`;
  const desc = ex ? `L'offerta su ${short(o)} è terminata. Controlla il prezzo attuale su Amazon.it e le altre offerte verificate.`
    : [o.nota ? `${base} ${o.nota}. ${verif}` : '', `${base} ${verif}`, `${base} ${verifBreve}`].find(t => t && t.length <= 160) || base;
  const product = { '@context': 'https://schema.org', '@type': 'Product', name: o.titolo, sku: o.asin, url: SITE + url, image: ogImg(o), category: c.nome };
  if (!ex) product.offers = { '@type': 'Offer', price: o.prezzo.toFixed(2), priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: aff(o), ...(o.scadenza ? { priceValidUntil: o.scadenza.slice(0, 10) } : {}) };
  const others = sorted.filter(x => x.asin !== o.asin && !expired(x)).slice(0, 4);
  const body = `<section class="wrap">
  <nav class="eyebrow" aria-label="Percorso" style="padding-top:22px"><a href="/" style="color:inherit">Home</a> / <a href="/categoria/${c.slug}/" style="color:inherit">${esc(c.nome)}</a></nav>
  <div class="hero" style="padding-block:20px 32px" data-checked="${esc(o.controllato)}"${o.scadenza ? ` data-ends="${esc(o.scadenza)}"` : ''}>
    <div>
      <div class="eyebrow">${o.asin === CFG.sceltaDelGiorno && !ex ? '<span class="pulse"></span><strong>Scelta del giorno</strong>' : `<strong>${esc(c.nome)}</strong>`}${o.etichetta && !ex ? ` <span>${esc(o.etichetta)}</span>` : ''}</div>
      <h1 style="font-size:clamp(30px,4.4vw,52px)">${esc(short(o))}</h1>
      ${o.titoloBreve ? `<p class="note" style="margin:-8px 0 18px;font-size:14px">${esc(o.titolo)}</p>` : ''}
      ${ex ? `<div class="verdict meh"><span><b>Offerta terminata.</b> Il prezzo su Amazon potrebbe essere cambiato: controllalo prima di acquistare.</span></div>`
        : `<div class="price-only">
        <div class="price-row"><span class="price-big">${eur(o.prezzo)}</span>${o.prezzoRiferimento ? `<span class="price-side"><span class="was">${eur(o.prezzoRiferimento)}</span><small>${esc(o.tipoRiferimento)}</small></span>` : ''}${d > 0 ? `<span class="sticker lg">−${d}%</span>` : ''}</div>
        ${o.nota ? `<div class="verdict good"><span>${esc(o.nota)}.</span></div>` : ''}
        </div>
        <div class="verdict meh stale-only"><span><b>Prezzo da verificare.</b> L'ultimo controllo è di più di 24 ore fa: il prezzo attuale lo trovi su Amazon.</span></div>`}
      <div class="cta-row">
        <a class="btn btn-hot go" href="${aff(o)}" target="_blank" rel="nofollow sponsored noopener">${ex ? 'Vedi il prezzo attuale su Amazon' : "Vai all'offerta su Amazon"} <span class="arr">→</span></a>
      </div>
      <p class="note">Prezzo controllato su Amazon.it il ${dataOra(new Date(o.controllato))}. Prezzi e disponibilità possono cambiare: vale quello mostrato su Amazon al momento dell'acquisto.${o.valutazione ? ` Valutazione su Amazon: ${String(o.valutazione).replace('.', ',')} su 5${o.recensioni ? ` (${o.recensioni.toLocaleString('it-IT')} recensioni)` : ''}.` : ''} Link affiliato: per te il prezzo non cambia.</p>
    </div>
    <div class="hero-visual" style="--c:${c.colore}"><div class="blob"></div><div class="visual-icon">${img(o) ? `<img class="pimg" src="${img(o)}" alt="${esc(short(o))}" width="400" height="320">` : ''}</div></div>
  </div>
</section>
${tgBand()}
${others.length ? `<section class="wrap sec"><div class="sec-head"><div><h2>Altre offerte verificate</h2></div><a class="link-more" href="/">Tutte le offerte <span class="arr">→</span></a></div><div class="grid">${others.map(staticCard).join('')}</div></section>` : ''}`;
  fs.mkdirSync(`offerta/${o.asin.toLowerCase()}`, { recursive: true });
  fs.writeFileSync(`offerta/${o.asin.toLowerCase()}/index.html`, shell({
    cur: c.slug, body,
    headHtml: head({ title, desc, url, image: ogImg(o), type: 'product', jsonld: [product, crumbs([['Home', '/'], [c.nome, `/categoria/${c.slug}/`], [short(o), url]])] })
  }));
}

// ---------- pagine categoria ----------
fs.rmSync('categoria', { recursive: true, force: true });
for (const c of CATS) {
  const list = sorted.filter(o => o.categoria === c.slug);
  const live = list.filter(o => !expired(o));
  const url = `/categoria/${c.slug}/`;
  const body = `<section class="wrap">
  <div class="page-head" style="--c:${c.colore}"><div><h1>Offerte ${esc(c.nome)}</h1><p>${live.length ? `${live.length} ${live.length === 1 ? 'offerta attiva' : 'offerte attive'}` : 'Nuove offerte in arrivo'}</p></div></div>
  <div class="prose" style="padding-block:0 18px">${c.testo.map(p => `<p>${esc(p)}</p>`).join('')}</div>
  ${list.length ? `<div class="grid">${list.map(staticCard).join('')}</div>` : `<div class="empty">In questo momento non ci sono offerte ${esc(c.nome.toLowerCase())} verificate. Iscriviti al <a href="${TG}" target="_blank" rel="noopener">canale Telegram</a> per ricevere le prossime appena escono.</div>`}
</section>
${tgBand()}`;
  fs.mkdirSync(`categoria/${c.slug}`, { recursive: true });
  fs.writeFileSync(`categoria/${c.slug}/index.html`, shell({
    cur: c.slug, body,
    headHtml: head({ title: c.titolo, desc: c.descrizione, url, image: `${SITE}/img/telegram-logo.png`,
      jsonld: [crumbs([['Home', '/'], [c.nome, url]]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: c.titolo, url: SITE + url, description: c.descrizione }] })
  }));
}

// ---------- pagine speciali (offerte di oggi, Black Friday…): testi in data/seo.json, "pagine" ----------
for (const pg of PAGINE) fs.rmSync(pg.slug, { recursive: true, force: true });
for (const pg of PAGINE) {
  const live = sorted.filter(o => !expired(o));
  const url = `/${pg.slug}/`;
  const body = `<section class="wrap">
  <div class="page-head"><div><h1>${esc(pg.h1)}</h1><p>${live.length ? `${live.length} ${live.length === 1 ? 'offerta attiva' : 'offerte attive'}` : 'Nuove offerte in arrivo'}</p></div></div>
  <div class="prose" style="padding-block:0 18px">${pg.testo.map(p => `<p>${esc(p)}</p>`).join('')}</div>
  ${live.length ? `<div class="grid">${live.map(staticCard).join('')}</div>` : `<div class="empty">In questo momento non ci sono offerte verificate. Iscriviti al <a href="${TG}" target="_blank" rel="noopener">canale Telegram</a> per ricevere le prossime appena escono.</div>`}
</section>
${tgBand()}`;
  fs.mkdirSync(pg.slug, { recursive: true });
  fs.writeFileSync(`${pg.slug}/index.html`, shell({
    cur: pg.slug, body,
    headHtml: head({ title: pg.titolo, desc: pg.descrizione, url, image: `${SITE}/img/telegram-logo.png`,
      jsonld: [crumbs([['Home', '/'], [pg.nome, url]]), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: pg.titolo, url: SITE + url, description: pg.descrizione }] })
  }));
}

// ---------- home ----------
const pick = OFFERS.find(o => o.asin === CFG.sceltaDelGiorno && !expired(o));
const staticMain = `<section class="wrap" style="padding-block:28px">
  <h1 style="font-family:var(--font-display);font-size:clamp(30px,4vw,48px);letter-spacing:-.03em">${esc(seo.home.h1)}</h1>
  <p class="prose" style="padding:0">${esc(seo.home.intro)}</p>
  ${pick ? `<p><a href="${pageUrl(pick)}">Scelta del giorno: ${esc(short(pick))}</a></p>` : ''}
  <div class="grid">${sorted.filter(o => !expired(o)).slice(0, 12).map(staticCard).join('')}</div>
  <nav aria-label="Categorie"><ul>${PAGINE.map(pg => `<li><a href="/${pg.slug}/">${esc(pg.nome)}</a></li>`).join('')}${CATS.map(c => `<li><a href="/categoria/${c.slug}/">Offerte ${esc(c.nome)}</a></li>`).join('')}</ul></nav>
</section>`;
let index = fs.readFileSync('templates/index.html', 'utf8')
  .replace('{{SEO_HEAD}}', head({ title: seo.home.titolo, desc: seo.home.descrizione, url: '/', image: pick ? ogImg(pick) : `${SITE}/img/telegram-logo.png`,
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'FuoriPrezzo', url: SITE + '/', inLanguage: 'it-IT' },
             { '@context': 'https://schema.org', '@type': 'Organization', name: 'FuoriPrezzo', url: SITE + '/', logo: `${SITE}/img/telegram-logo.png`, sameAs: [TG, 'https://www.instagram.com/fuoriprezzo/'] }] }))
  .replace('{{STATIC_MAIN}}', staticMain)
  .replaceAll('{{V}}', V);
fs.writeFileSync('index.html', index);

// ---------- sitemap e robots ----------
const day = d => new Date(d).toISOString().slice(0, 10);
const latest = OFFERS.length ? OFFERS.map(o => o.controllato).sort().pop() : now.toISOString();
const urls = [['/', day(latest), '1.0'],
  ...PAGINE.map(pg => [`/${pg.slug}/`, day(latest), '0.8']),
  ...CATS.map(c => { const l = OFFERS.filter(o => o.categoria === c.slug).map(o => o.controllato).sort().pop(); return [`/categoria/${c.slug}/`, day(l || latest), '0.7']; }),
  ...OFFERS.map(o => [pageUrl(o), day(o.controllato), expired(o) ? '0.3' : '0.8'])];
fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d, p]) => `  <url><loc>${SITE}${u}</loc><lastmod>${d}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\nDisallow: /templates/\nDisallow: /tools/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Pagine generate: ${OFFERS.length} offerte, ${CATS.length} categorie, ${PAGINE.length} pagine speciali, sitemap con ${urls.length} indirizzi (v=${V}).`);
