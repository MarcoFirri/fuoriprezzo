"""Crea il reel e la storia Instagram di un'offerta: img/<ASIN>-reel.mp4 (1080x1920, 12 secondi, con la base musicale di assets/musica)
e img/<ASIN>-story.jpg (1080x1920, l'ultima scena del reel). Usa l'illustrazione img/<ASIN>.svg.
Uso: python3 tools/render_reel.py ASIN   (dalla cartella del sito; serve ffmpeg)"""
import json, os, subprocess, sys, tempfile, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

FPS, SECONDS = 30, 12
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
chk = datetime.datetime.fromisoformat(o['controllato']).astimezone(rome)
mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
when = f"{chk.day} {mesi[chk.month-1]} alle {chk:%H:%M}"
end = ''
if o.get('scadenza'):
    s = datetime.datetime.fromisoformat(o['scadenza']).astimezone(rome)
    end = f"⏳ Termina il {s.day} {mesi[s.month-1]} alle {s:%H:%M}"
top = '🔥 Scelta del giorno' if data['cfg'].get('sceltaDelGiorno') == asin else (o.get('etichetta') or 'Offerta')
TAG = '<svg viewBox="0 0 40 40"><path d="M21.5 3.5h11a4 4 0 0 1 4 4v11a4 4 0 0 1-1.2 2.8L21.6 35a4 4 0 0 1-5.7 0L5 24.1a4 4 0 0 1 0-5.7L18.7 4.7a4 4 0 0 1 2.8-1.2z" fill="#FF4141"/><circle cx="29" cy="11" r="3" fill="#17112A"/><path d="M12 22l9-9" stroke="#17112A" stroke-width="3" stroke-linecap="round"/></svg>'

# Le zone in alto (~250px) e in basso (~340px) restano libere: lì Instagram mette i suoi pulsanti.
html = f"""<html><head><style>
body{{margin:0;font-family:'Inter Display','Inter',sans-serif}}
.r{{position:relative;width:1080px;height:1920px;overflow:hidden;background:#17112A;color:#F4F0FF}}
.bg{{position:absolute;inset:0 0 auto 0;height:980px;border-radius:0 0 64px 64px;background:radial-gradient(circle at 30% 25%,color-mix(in oklab,{col} 45%,white),{col} 58%,color-mix(in oklab,{col} 80%,black));animation:drop 1s cubic-bezier(.2,.8,.2,1) both}}
.bg::before{{content:"";position:absolute;width:620px;height:620px;border-radius:50%;right:-160px;top:-120px;background:rgba(255,255,255,.2)}}
.brand{{position:absolute;left:56px;top:250px;display:inline-flex;align-items:center;gap:14px;background:#17112A;color:#fff;padding:12px 24px 12px 14px;border-radius:999px;font-weight:900;font-size:36px;letter-spacing:-.03em;animation:fade .5s .3s both}}
.brand svg{{width:46px;height:46px}} .brand b{{color:#FF4141;font-weight:900}} .brand i{{font-style:normal;color:#A99FC2}}
.flag{{position:absolute;right:56px;top:256px;background:#FF4141;color:#fff;font-weight:900;font-size:30px;letter-spacing:.05em;text-transform:uppercase;padding:14px 24px;border-radius:999px;animation:pop .5s .6s both}}
.ill{{position:absolute;left:50%;top:620px;width:700px;transform:translate(-50%,-50%);filter:drop-shadow(0 30px 34px rgba(23,17,42,.3));animation:grow 1.4s .2s cubic-bezier(.2,.8,.2,1) both, float 4s 1.6s ease-in-out infinite alternate}}
.sticker{{position:absolute;right:60px;top:830px;z-index:2;background:#FFD43B;color:#17112A;font-weight:900;font-size:96px;letter-spacing:-.04em;padding:16px 34px;border-radius:30px;box-shadow:10px 10px 0 #0A0712;animation:stamp .6s 4.2s cubic-bezier(.3,1.6,.5,1) both}}
.bot{{position:absolute;left:56px;right:56px;top:1030px;display:flex;flex-direction:column;gap:20px}}
.t{{font-weight:800;font-size:52px;line-height:1.08;letter-spacing:-.03em;animation:up .7s 1.4s both}}
.pr{{display:flex;align-items:flex-end;gap:28px}}
.now{{font-weight:900;font-size:140px;line-height:.85;letter-spacing:-.05em;color:#FF4141;animation:pop .6s 3.6s cubic-bezier(.3,1.6,.5,1) both}}
.was{{position:relative;font-size:52px;color:#A99FC2;padding-bottom:8px;animation:fade .5s 2.6s both}}
.was::after{{content:"";position:absolute;left:-4px;right:-4px;top:42%;height:5px;background:#FF4141;transform-origin:left;animation:strike .4s 3.1s both}}
.ref{{font-size:30px;color:#A99FC2;animation:fade .5s 5.2s both}}
.nota{{font-size:34px;font-weight:700;color:#FFD43B;line-height:1.25;animation:up .6s 6.2s both}}
.end{{font-size:32px;font-weight:700;animation:up .6s 6.8s both}}
.foot{{margin-top:10px;display:flex;justify-content:space-between;align-items:center;font-size:28px;color:#A99FC2;border-top:2px dashed #2F2744;padding-top:24px;animation:fade .6s 8s both}}
.foot b{{color:#17112A;background:#FFD43B;padding:12px 22px;border-radius:999px;font-size:32px;animation:pulse 1s 8.6s ease-in-out infinite alternate}}
@keyframes drop{{from{{transform:translateY(-100%)}}}}
@keyframes fade{{from{{opacity:0}}}}
@keyframes up{{from{{opacity:0;transform:translateY(40px)}}}}
@keyframes pop{{from{{opacity:0;transform:scale(.3)}}}}
@keyframes grow{{from{{opacity:0;transform:translate(-50%,-50%) scale(.55)}}}}
@keyframes float{{to{{transform:translate(-50%,-53%) scale(1.03)}}}}
@keyframes stamp{{from{{opacity:0;transform:scale(2.4) rotate(8deg)}}to{{transform:rotate(-6deg)}}}}
@keyframes strike{{from{{transform:scaleX(0)}}}}
@keyframes pulse{{to{{transform:scale(1.07)}}}}
</style></head><body><div class="r"><div class="bg"></div>
<div class="brand">{TAG}<span>fuori<b>prezzo</b><i>.it</i></span></div><div class="flag">{top}</div>
<div class="ill">{ill}</div>{f'<div class="sticker">−{disc}%</div>' if disc > 0 else ''}
<div class="bot"><div class="t">{o.get('titoloBreve') or o['titolo']}</div>
<div class="pr"><span class="now">{eur(o['prezzo'])}</span>{f'<span class="was">{eur(ref)}</span>' if ref else ''}</div>
{f'<div class="ref">{eur(ref)} = {o.get("tipoRiferimento", "prezzo di riferimento")}</div>' if ref else ''}
{f'<div class="nota">📉 {o["nota"]}</div>' if o.get('nota') else ''}
{f'<div class="end">{end}</div>' if end else ''}
<div class="foot"><span>Prezzo verificato il {when}</span><b>Link in bio →</b></div></div></div></body></html>"""

frames = tempfile.mkdtemp()
with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': os.environ['PW_CHROMIUM']} if os.environ.get('PW_CHROMIUM') else {}))
    pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    pg.set_content(html); pg.wait_for_timeout(300)
    pg.evaluate('document.getAnimations().forEach(a => a.pause())')
    for i in range(FPS * SECONDS):
        pg.evaluate(f'document.getAnimations().forEach(a => a.currentTime = {i * 1000 / FPS})')
        pg.screenshot(path=f'{frames}/{i:04d}.jpg', type='jpeg', quality=90)
    pg.screenshot(path=f'img/{asin}-story.jpg', type='jpeg', quality=92)
    b.close()

# H.264 + audio AAC muto: i formati che Instagram accetta per reel e storie
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
