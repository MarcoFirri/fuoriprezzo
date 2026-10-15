"""Reel "pubblicità" di FuoriPrezzo per un'offerta: img/<ASIN>-reel.mp4 (1080x1920, 15 secondi, con la base musicale di assets/musica).
Racconta il marchio (offerte vere, prezzi verificati) e poi mostra l'offerta. Sostituisce il reel standard di render_reel.py.
Uso: python3 tools/render_promo.py ASIN   (dalla cartella del sito; serve ffmpeg)"""
import json, os, subprocess, sys, tempfile, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

FPS, SECONDS = 30, 15
asin = sys.argv[1]
data = json.loads(subprocess.check_output(['node', '-e', """
const vm=require('vm'),fs=require('fs');const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data/offerte.js','utf8'),ctx);
console.log(JSON.stringify({cfg:ctx.window.FP_CONFIG,offers:ctx.window.FP_OFFERTE}))"""]))
o = next(x for x in data['offers'] if x['asin'] == asin)
CAT_COLORS = {'elettronica':'#FF6A4D','informatica':'#9C8CFF','casa':'#FFC93D','cucina':'#FF9356','sport':'#3DD9B6','giochi':'#62BDFF','bellezza':'#EC86FF','fai-da-te':'#ADDC45'}
col = CAT_COLORS.get(o['categoria'], '#FF6A4D')
ill = open(o['illustrazione']).read() if o.get('illustrazione') else ''
eur = lambda v: f"{v:,.2f} €".replace(',', 'X').replace('.', ',').replace('X', '.')
ref = o.get('prezzoRiferimento'); disc = round((ref - o['prezzo']) / ref * 100) if ref else 0
rome = ZoneInfo('Europe/Rome')
mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
chk = datetime.datetime.fromisoformat(o['controllato']).astimezone(rome)
when = f"{chk.day} {mesi[chk.month-1]} alle {chk:%H:%M}"
end = ''
if o.get('scadenza'):
    s = datetime.datetime.fromisoformat(o['scadenza']).astimezone(rome)
    end = f"⏳ Termina il {s.day} {mesi[s.month-1]} alle {s:%H:%M}"
TAG = '<svg viewBox="0 0 40 40"><path d="M21.5 3.5h11a4 4 0 0 1 4 4v11a4 4 0 0 1-1.2 2.8L21.6 35a4 4 0 0 1-5.7 0L5 24.1a4 4 0 0 1 0-5.7L18.7 4.7a4 4 0 0 1 2.8-1.2z" fill="#FF4141"/><circle cx="29" cy="11" r="3" fill="#17112A"/><path d="M12 22l9-9" stroke="#17112A" stroke-width="3" stroke-linecap="round"/></svg>'
BRAND = f'<div class="brand">{TAG}<span>fuori<b>prezzo</b><i>.it</i></span></div>'

# Scene: 0-3s domanda, 3-6s chi siamo, 6-12s l'offerta, 12-15s chiusura. Zone sicure: 250px sopra, 340px sotto.
html = f"""<html><head><style>
body{{margin:0;font-family:'Inter Display','Inter',sans-serif}}
.r{{position:relative;width:1080px;height:1920px;overflow:hidden;background:#17112A;color:#F4F0FF}}
.sc{{position:absolute;inset:0;opacity:0}}
.brand{{display:inline-flex;align-items:center;gap:14px;background:#17112A;color:#fff;padding:12px 24px 12px 14px;border-radius:999px;font-weight:900;font-size:36px;letter-spacing:-.03em}}
.brand svg{{width:46px;height:46px}} .brand b{{color:#FF4141;font-weight:900}} .brand i{{font-style:normal;color:#A99FC2}}
.big{{font-weight:900;letter-spacing:-.045em;line-height:.95}}
/* 1 - la domanda */
.s1{{animation:show 3s 0s both}}
.s1 .q{{position:absolute;left:70px;right:70px;top:620px;font-size:132px}}
.s1 .q span{{display:block;animation:up .5s both}} .s1 .q span:nth-child(2){{animation-delay:.35s;color:#FF4141}} .s1 .q span:nth-child(3){{animation-delay:.7s}}
.s1 .tag{{position:absolute;right:90px;top:330px;width:200px;animation:spin 3s linear both}}
.s1 .tag svg{{width:200px;height:200px}}
/* 2 - chi siamo */
.s2{{animation:show 3s 3s both;background:{col}}}
.s2 .brand{{position:absolute;left:50%;top:420px;transform:translateX(-50%) scale(1.6);animation:pop .5s 3.1s both}}
.s2 .claim{{position:absolute;left:70px;right:70px;top:700px;font-size:104px;color:#17112A;text-align:center;animation:up .6s 3.4s both}}
.s2 .pts{{position:absolute;left:110px;right:110px;top:1130px;display:flex;flex-direction:column;gap:26px}}
.s2 .pts div{{background:#17112A;color:#fff;font-size:42px;font-weight:800;padding:24px 34px;border-radius:24px;animation:up .45s both}}
.s2 .pts div:nth-child(1){{animation-delay:4.1s}} .s2 .pts div:nth-child(2){{animation-delay:4.5s}} .s2 .pts div:nth-child(3){{animation-delay:4.9s}}
/* 3 - l'offerta */
.s3{{animation:show 6s 6s both}}
.s3 .bg{{position:absolute;inset:0 0 auto 0;height:980px;border-radius:0 0 64px 64px;background:radial-gradient(circle at 30% 25%,color-mix(in oklab,{col} 45%,white),{col} 58%,color-mix(in oklab,{col} 80%,black));animation:drop .8s 6s cubic-bezier(.2,.8,.2,1) both}}
.s3 .lbl{{position:absolute;left:56px;top:256px;background:#FF4141;color:#fff;font-weight:900;font-size:32px;letter-spacing:.05em;text-transform:uppercase;padding:14px 26px;border-radius:999px;animation:pop .5s 6.4s both}}
.s3 .ill{{position:absolute;left:50%;top:620px;width:700px;transform:translate(-50%,-50%);filter:drop-shadow(0 30px 34px rgba(23,17,42,.3));animation:grow 1.2s 6.2s cubic-bezier(.2,.8,.2,1) both}}
.s3 .sticker{{position:absolute;right:60px;top:830px;background:#FFD43B;color:#17112A;font-weight:900;font-size:96px;letter-spacing:-.04em;padding:16px 34px;border-radius:30px;box-shadow:10px 10px 0 #0A0712;animation:stamp .6s 9s cubic-bezier(.3,1.6,.5,1) both}}
.s3 .bot{{position:absolute;left:56px;right:56px;top:1030px;display:flex;flex-direction:column;gap:20px}}
.s3 .t{{font-weight:800;font-size:52px;line-height:1.08;letter-spacing:-.03em;animation:up .6s 7s both}}
.s3 .pr{{display:flex;align-items:flex-end;gap:28px}}
.s3 .now{{font-weight:900;font-size:140px;line-height:.85;letter-spacing:-.05em;color:#FF4141;animation:pop .6s 8.4s cubic-bezier(.3,1.6,.5,1) both}}
.s3 .was{{position:relative;font-size:52px;color:#A99FC2;padding-bottom:8px;animation:fade .4s 7.6s both}}
.s3 .was::after{{content:"";position:absolute;left:-4px;right:-4px;top:42%;height:5px;background:#FF4141;transform-origin:left;animation:strike .4s 8s both}}
.s3 .ref{{font-size:30px;color:#A99FC2;animation:fade .5s 9.4s both}}
.s3 .nota{{font-size:34px;font-weight:700;color:#FFD43B;line-height:1.25;animation:up .5s 9.9s both}}
.s3 .end{{font-size:32px;font-weight:700;animation:up .5s 10.3s both}}
/* 4 - chiusura */
.s4{{animation:show 3s 12s both;background:#17112A}}
.s4 .brand{{position:absolute;left:50%;top:520px;transform:translateX(-50%) scale(1.8);animation:pop .5s 12.1s both}}
.s4 .c{{position:absolute;left:70px;right:70px;top:800px;text-align:center;font-size:96px;animation:up .6s 12.4s both}}
.s4 .c b{{color:#FF4141}}
.s4 .cta{{position:absolute;left:50%;top:1180px;transform:translateX(-50%);background:#FFD43B;color:#17112A;font-weight:900;font-size:50px;padding:24px 44px;border-radius:999px;white-space:nowrap;animation:pop .5s 12.9s both, pulse .8s 13.4s ease-in-out infinite alternate}}
.s4 .small{{position:absolute;left:70px;right:70px;top:1400px;text-align:center;font-size:28px;color:#A99FC2;line-height:1.4;animation:fade .5s 13.2s both}}
@keyframes show{{0%{{opacity:0}}4%{{opacity:1}}96%{{opacity:1}}100%{{opacity:0}}}}
@keyframes fade{{from{{opacity:0}}}}
@keyframes up{{from{{opacity:0;transform:translateY(50px)}}}}
@keyframes pop{{from{{opacity:0;transform:translateX(-50%) scale(.3)}}}}
@keyframes grow{{from{{opacity:0;transform:translate(-50%,-50%) scale(.55)}}}}
@keyframes drop{{from{{transform:translateY(-100%)}}}}
@keyframes stamp{{from{{opacity:0;transform:scale(2.4) rotate(8deg)}}to{{transform:rotate(-6deg)}}}}
@keyframes strike{{from{{transform:scaleX(0)}}}}
@keyframes spin{{from{{transform:rotate(-30deg) scale(.6)}}to{{transform:rotate(20deg) scale(1)}}}}
@keyframes pulse{{to{{transform:translateX(-50%) scale(1.07)}}}}
.s3 .lbl,.s3 .now{{transform-origin:left}}
.s3 .lbl{{animation-name:fade}} .s3 .now{{animation-name:fade}}
</style></head><body><div class="r">
<div class="sc s1"><div class="tag">{TAG}</div><div class="q big"><span>Stai</span><span>pagando</span><span>troppo?</span></div></div>
<div class="sc s2">{BRAND}<div class="claim big">Solo offerte vere su Amazon</div>
<div class="pts"><div>✅ Prezzi verificati su Amazon</div><div>📉 Sconto sul prezzo indicato da Amazon</div><div>⏱️ Data e ora di ogni verifica</div></div></div>
<div class="sc s3"><div class="bg"></div><div class="lbl">{'🔥 Scelta del giorno' if data['cfg'].get('sceltaDelGiorno') == asin else (o.get('etichetta') or 'Offerta')}</div>
<div class="ill">{ill}</div>{f'<div class="sticker">−{disc}%</div>' if disc > 0 else ''}
<div class="bot"><div class="t">{o.get('titoloBreve') or o['titolo']}</div>
<div class="pr"><span class="now">{eur(o['prezzo'])}</span>{f'<span class="was">{eur(ref)}</span>' if ref else ''}</div>
{f'<div class="ref">{eur(ref)} = {o.get("tipoRiferimento", "prezzo di riferimento")}</div>' if ref else ''}
{f'<div class="nota">📉 {o["nota"]}</div>' if o.get('nota') else ''}
{f'<div class="end">{end}</div>' if end else ''}</div></div>
<div class="sc s4">{BRAND}<div class="c big">Ogni giorno<br><b>fuori prezzo</b></div><div class="cta">Segui e trova il link in bio →</div>
<div class="small">Prezzo verificato su Amazon.it il {when}: può cambiare.<br>Link affiliato Amazon: per te il prezzo non cambia.</div></div>
</div></body></html>"""

frames = tempfile.mkdtemp()
with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': os.environ['PW_CHROMIUM']} if os.environ.get('PW_CHROMIUM') else {}))
    pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    pg.set_content(html); pg.wait_for_timeout(300)
    pg.evaluate('document.getAnimations().forEach(a => a.pause())')
    for i in range(FPS * SECONDS):
        pg.evaluate(f'document.getAnimations().forEach(a => a.currentTime = {i * 1000 / FPS})')
        pg.screenshot(path=f'{frames}/{i:04d}.jpg', type='jpeg', quality=90)
    b.close()

# Base musicale nostra (tools/musica.py); se manca, audio muto
MUSICA = 'assets/musica/base.m4a'
AUDIO = ['-i', MUSICA] if os.path.exists(MUSICA) else ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000']
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', f'{frames}/%04d.jpg',
                *AUDIO, '-shortest', '-af', f'afade=t=out:st={SECONDS - 1}:d=1',
                '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '20', '-r', str(FPS),
                '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', f'img/{asin}-reel.mp4'], check=True)
for f in os.listdir(frames): os.remove(os.path.join(frames, f))
os.rmdir(frames)
print('ok', asin)
