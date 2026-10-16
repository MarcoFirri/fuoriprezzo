"""Spot pubblicitario di FuoriPrezzo con voce: img/<ASIN>-reel.mp4 (1080x1920, circa 20 secondi).
Gancio, chi siamo, l'offerta con il prezzo che scende, chiusura. Musica nostra (assets/musica/base.m4a),
effetti sonori sintetizzati qui e voce fuori campo letta da assets/voce/<ASIN>/01..05.m4a o .mp3
(registrata con la sintesi vocale; se manca la crea qui con pico2wave in italiano, o espeak-ng).
Sostituisce il reel di render_reel.py. Uso: python3 tools/render_spot.py ASIN   (serve ffmpeg; SENZA_VOCE=1 per farlo solo con musica ed effetti)"""
import json, os, subprocess, sys, tempfile, datetime, wave
from zoneinfo import ZoneInfo
import numpy as np
from playwright.sync_api import sync_playwright

FPS = 30
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
tmp = tempfile.mkdtemp()

# --- Voce: 5 frasi (gancio, chi siamo, offerta, nota, chiusura) ---
def durata(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))
U = ['zero','uno','due','tre','quattro','cinque','sei','sette','otto','nove','dieci','undici','dodici','tredici','quattordici','quindici','sedici','diciassette','diciotto','diciannove']
D10 = ['','','venti','trenta','quaranta','cinquanta','sessanta','settanta','ottanta','novanta']
def parole(n):  # numeri in lettere, fino a 9999
    if n < 20: return U[n]
    if n < 100:
        d, u = divmod(n, 10); w = D10[d]
        return (w[:-1] if u in (1, 8) else w) + (U[u] if u else '')
    if n < 1000:
        c, r = divmod(n, 100); w = ('cento' if c == 1 else U[c] + 'cento')
        return w + (parole(r) if r else '')
    m, r = divmod(n, 1000)
    return ('mille' if m == 1 else parole(m) + 'mila') + (parole(r) if r else '')
def euro(v, unita=True):
    e, c = divmod(round(v * 100), 100)
    return parole(e) + (' euro' if unita else '') + (f" e {parole(c)}" if c else '')
nome = (o.get('titoloBreve') or o['titolo']).split(' con ')[0]
frase3 = f"{nome}! " + (f"{o.get('tipoRiferimento', 'prezzo di riferimento').capitalize()} {euro(ref, False)}, " if ref else '') + f"oggi solo {euro(o['prezzo'])}!"
nota = o.get('nota', '').split(' (')[0]
FRASI = ['Fermo! Stai pagando troppo?', 'Su Fuori Prezzo solo offerte vere su Amazon, controllate una per una.',
         frase3, (nota + '.') if nota else 'Prezzo verificato su Amazon.', 'Segui Fuori Prezzo. Il link è in bio!']
voce_dir = f'assets/voce/{asin}'
clips = []
SENZA = [2.4, 3.6, 5.2, 3.2, 2.6]  # durata delle scene se non c'è voce
for i in range(5):
    f = next((x for x in (f'{voce_dir}/{i + 1:02d}.m4a', f'{voce_dir}/{i + 1:02d}.mp3') if os.path.exists(x)), None)
    if os.environ.get('SENZA_VOCE') or (not f and os.path.isdir(voce_dir)):
        clips.append((None, SENZA[i])); continue  # voce registrata a parte: una frase mancante resta solo scritta
    if f:  # voce registrata (es. ElevenLabs): tolgo i silenzi ai bordi e accelero appena
        g = f'{tmp}/v{i}.wav'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,atempo=1.06', g], check=True)
        f = g
    else:
        f = f'{tmp}/v{i}.wav'
        if subprocess.run(['which', 'pico2wave'], capture_output=True).returncode == 0:
            subprocess.run(['pico2wave', '-l', 'it-IT', '-w', f'{tmp}/raw{i}.wav', FRASI[i]], capture_output=True)
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{tmp}/raw{i}.wav', '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,atempo=1.22', f], capture_output=True)
        elif subprocess.run(['which', 'espeak-ng'], capture_output=True).returncode == 0:
            subprocess.run(['espeak-ng', '-v', 'mb-it4', '-s', '170', '-w', f, FRASI[i]], capture_output=True)
    clips.append((f, durata(f)) if os.path.exists(f) else (None, SENZA[i]))
print('voce:', *[f'{FRASI[i]} [{c[1]:.1f}s]' for i, c in enumerate(clips)], sep='\n  ')

# Scene agganciate alla voce: ogni scena dura quanto la sua frase più un respiro
gap = .25
t1 = .2                                   # gancio
t2 = t1 + clips[0][1] + gap               # chi siamo
t3 = t2 + clips[1][1] + gap               # offerta
t4 = t3 + clips[2][1] + .25               # nota (sempre sull'offerta)
t5 = t4 + max(clips[3][1], 2.4) + gap     # chiusura
END = t5 + max(clips[4][1], 2.2) + 1.6
starts = [t1, t2, t3, t4, t5]
tp = max(1.3, clips[2][1] * 0.55 if clips[2][0] else 1.3)  # il prezzo scende quando la voce dice "oggi"
D = lambda x: f'{x:.2f}s'

TAG = '<svg viewBox="0 0 40 40"><path d="M21.5 3.5h11a4 4 0 0 1 4 4v11a4 4 0 0 1-1.2 2.8L21.6 35a4 4 0 0 1-5.7 0L5 24.1a4 4 0 0 1 0-5.7L18.7 4.7a4 4 0 0 1 2.8-1.2z" fill="#FF4141"/><circle cx="29" cy="11" r="3" fill="#17112A"/><path d="M12 22l9-9" stroke="#17112A" stroke-width="3" stroke-linecap="round"/></svg>'
BRAND = f'<div class="brand">{TAG}<span>fuori<b>prezzo</b><i>.it</i></span></div>'
top = '🔥 Scelta del giorno' if data['cfg'].get('sceltaDelGiorno') == asin else (o.get('etichetta') or 'Offerta')
coriandoli = ''.join(f'<i style="left:{(k * 137) % 1000 + 40}px;background:{["#FFD43B", "#FF4141", "#fff", col][k % 4]};animation-delay:{t3 + tp + 1.3 + (k % 7) * .05:.2f}s;--dx:{(k * 53) % 300 - 150}px;--r:{(k * 97) % 720}deg"></i>' for k in range(36))

# Zone sicure: 250px sopra, 340px sotto (pulsanti di Instagram)
html = f"""<html><head><style>
body{{margin:0;font-family:'Inter Display','Inter',sans-serif}}
.r{{position:relative;width:1080px;height:1920px;overflow:hidden;background:#17112A;color:#F4F0FF}}
.sc{{position:absolute;inset:0;opacity:0}}
.big{{font-weight:900;letter-spacing:-.045em;line-height:.92}}
.brand{{display:inline-flex;align-items:center;gap:14px;background:#17112A;color:#fff;padding:12px 24px 12px 14px;border-radius:999px;font-weight:900;font-size:36px;letter-spacing:-.03em}}
.brand svg{{width:46px;height:46px}} .brand b{{color:#FF4141;font-weight:900}} .brand i{{font-style:normal;color:#A99FC2}}
.stripes{{position:absolute;inset:-200px;background:repeating-linear-gradient(-35deg,rgba(255,255,255,.05) 0 40px,transparent 40px 120px);animation:slide 4s linear infinite}}
.flash{{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:9}}
/* 1 - gancio */
.s1{{animation:show {D(t2 - t1)} {D(t1)} none;background:#FF4141}}
.s1 .stop{{position:absolute;left:0;right:0;top:330px;text-align:center;font-size:250px;color:#17112A;animation:slam .45s {D(t1)} cubic-bezier(.2,1.6,.4,1) both,shake .5s {D(t1 + .45)} both}}
.s1 .q{{position:absolute;left:70px;right:70px;top:760px;font-size:130px;color:#fff}}
.s1 .q span{{display:block;animation:up .35s both}}
.s1 .q span:nth-child(1){{animation-delay:{D(t1 + .6)}}} .s1 .q span:nth-child(2){{animation-delay:{D(t1 + .85)}}}
.s1 .q span:nth-child(3){{animation-delay:{D(t1 + 1.1)};color:#FFD43B;font-size:170px}}
.s1 .tag{{position:absolute;right:-60px;bottom:330px;width:420px;opacity:.25;animation:spin {D(t2 - t1)} {D(t1)} linear both}} .s1 .tag svg{{width:420px;height:420px}}
.f1{{animation:flash .35s {D(t2 - .1)} both}}
/* 2 - chi siamo */
.s2{{animation:show {D(t3 - t2)} {D(t2)} none;background:{col}}}
.s2 .brand{{position:absolute;left:50%;top:330px;transform:translateX(-50%) scale(1.7);animation:popc .5s {D(t2 + .1)} cubic-bezier(.3,1.6,.5,1) both}}
.s2 .claim{{position:absolute;left:60px;right:60px;top:560px;font-size:118px;color:#17112A;text-align:center}}
.s2 .claim span{{display:inline-block;animation:word .4s both}}
{''.join(f'.s2 .claim span:nth-child({k + 1}){{{{animation-delay:{D(t2 + .35 + k * .16)}}}}}' for k in range(6))}
.s2 .claim span.hl{{background:#17112A;color:#FFD43B;padding:0 18px;border-radius:18px;transform:rotate(-3deg)}}
.s2 .pts{{position:absolute;left:100px;right:100px;top:1110px;display:flex;flex-direction:column;gap:24px}}
.s2 .pts div{{background:#17112A;color:#fff;font-size:42px;font-weight:800;padding:24px 34px;border-radius:24px;animation:side .4s cubic-bezier(.2,1.4,.4,1) both}}
.s2 .pts div:nth-child(1){{animation-delay:{D(t2 + 1.4)}}} .s2 .pts div:nth-child(2){{animation-delay:{D(t2 + 1.9)}}} .s2 .pts div:nth-child(3){{animation-delay:{D(t2 + 2.4)}}}
.f2{{animation:flash .35s {D(t3 - .1)} both}}
/* 3 - offerta */
.s3{{animation:show {D(t5 - t3)} {D(t3)} none}}
.s3 .bg{{position:absolute;inset:0 0 auto 0;height:980px;border-radius:0 0 64px 64px;overflow:hidden;background:radial-gradient(circle at 30% 25%,color-mix(in oklab,{col} 45%,white),{col} 58%,color-mix(in oklab,{col} 80%,black));animation:drop .6s {D(t3)} cubic-bezier(.2,.8,.2,1) both}}
.s3 .rays{{position:absolute;left:50%;top:620px;width:1600px;height:1600px;margin:-800px 0 0 -800px;background:repeating-conic-gradient(rgba(255,255,255,.16) 0 10deg,transparent 10deg 20deg);border-radius:50%;animation:rot 12s linear infinite}}
.s3 .lbl{{position:absolute;left:56px;top:256px;background:#FF4141;color:#fff;font-weight:900;font-size:32px;letter-spacing:.05em;text-transform:uppercase;padding:14px 26px;border-radius:999px;animation:fade .4s {D(t3 + .3)} both}}
.s3 .ill{{position:absolute;left:50%;top:620px;width:720px;transform:translate(-50%,-50%);filter:drop-shadow(0 30px 34px rgba(23,17,42,.35));animation:zoomin .9s {D(t3 + .1)} cubic-bezier(.2,1.3,.3,1) both,bob 2.4s {D(t3 + 1)} ease-in-out infinite alternate}}
.s3 .shine{{position:absolute;top:0;bottom:0;width:180px;left:-300px;background:linear-gradient(100deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-18deg);animation:sweep .9s {D(t3 + 1.2)} ease-in both}}
.s3 .sticker{{position:absolute;right:60px;top:820px;z-index:3;background:#FFD43B;color:#17112A;font-weight:900;font-size:110px;letter-spacing:-.04em;padding:14px 34px;border-radius:30px;box-shadow:10px 10px 0 #0A0712;animation:stamp .5s {D(t3 + tp + 1.3)} cubic-bezier(.3,1.6,.5,1) both,wob 1s {D(t3 + tp + 1.9)} ease-in-out infinite alternate}}
.s3 .bot{{position:absolute;left:56px;right:56px;top:1030px;display:flex;flex-direction:column;gap:20px}}
.s3 .t{{font-weight:800;font-size:52px;line-height:1.08;letter-spacing:-.03em;animation:up .5s {D(t3 + .5)} both}}
.s3 .pr{{display:flex;align-items:flex-end;gap:28px;animation:shake .4s {D(t3 + tp + 1.3)} both}}
.s3 .now{{font-weight:900;font-size:150px;line-height:.85;letter-spacing:-.05em;color:#FF4141;font-variant-numeric:tabular-nums;animation:fade .3s {D(t3 + 1.1)} both}}
.s3 .was{{position:relative;font-size:52px;color:#A99FC2;padding-bottom:8px;animation:fade .4s {D(t3 + 1.1)} both}}
.s3 .was::after{{content:"";position:absolute;left:-4px;right:-4px;top:42%;height:6px;background:#FF4141;transform-origin:left;animation:strike .3s {D(t3 + tp + 1.1)} both}}
.s3 .ref{{font-size:34px;color:#A99FC2;animation:fade .5s {D(t3 + tp + 1.7)} both}}
.s3 .nota{{font-size:38px;font-weight:800;color:#17112A;background:#FFD43B;line-height:1.25;padding:18px 24px;border-radius:20px;animation:side .45s {D(t4)} cubic-bezier(.2,1.4,.4,1) both}}
.s3 .conf i{{position:absolute;top:900px;width:18px;height:30px;border-radius:4px;opacity:0;animation:conf 1.8s cubic-bezier(.2,.6,.4,1) both;z-index:4}}
.f3{{animation:flash .35s {D(t5 - .1)} both}}
/* 4 - chiusura */
.s4{{animation:show {D(END - t5)} {D(t5)} none;background:#17112A}}
.s4 .brand{{position:absolute;left:50%;top:430px;transform:translateX(-50%) scale(1.9);animation:popc .5s {D(t5 + .05)} cubic-bezier(.3,1.6,.5,1) both}}
.s4 .c{{position:absolute;left:60px;right:60px;top:680px;text-align:center;font-size:120px}}
.s4 .c span{{display:block;animation:up .4s both}} .s4 .c span:nth-child(1){{animation-delay:{D(t5 + .3)}}} .s4 .c span:nth-child(2){{animation-delay:{D(t5 + .55)};color:#FF4141;font-size:150px}}
.s4 .cta{{position:absolute;left:50%;top:1110px;transform:translateX(-50%);background:#FFD43B;color:#17112A;font-weight:900;font-size:54px;padding:26px 48px;border-radius:999px;white-space:nowrap;animation:popc .45s {D(t5 + .9)} cubic-bezier(.3,1.6,.5,1) both,pulse .6s {D(t5 + 1.4)} ease-in-out infinite alternate}}
.s4 .small{{position:absolute;left:70px;right:70px;top:1330px;text-align:center;font-size:28px;color:#A99FC2;line-height:1.4;animation:fade .5s {D(t5 + 1.1)} both}}
@keyframes show{{0%{{opacity:1}}100%{{opacity:1}}}}
@keyframes flash{{0%{{opacity:0}}30%{{opacity:.9}}100%{{opacity:0}}}}
@keyframes fade{{from{{opacity:0}}}}
@keyframes up{{from{{opacity:0;transform:translateY(70px)}}}}
@keyframes side{{from{{opacity:0;transform:translateX(-120%)}}}}
@keyframes word{{from{{opacity:0;transform:translateY(60px) scale(.6)}}}}
@keyframes slam{{from{{opacity:0;transform:scale(3)}}}}
@keyframes shake{{0%,100%{{transform:none}}20%{{transform:translate(-14px,6px)}}40%{{transform:translate(12px,-8px)}}60%{{transform:translate(-8px,4px)}}80%{{transform:translate(6px,-2px)}}}}
@keyframes popc{{from{{opacity:0;transform:translateX(-50%) scale(.2)}}}}
@keyframes zoomin{{from{{opacity:0;transform:translate(-50%,-50%) scale(.2) rotate(-25deg)}}}}
@keyframes bob{{to{{transform:translate(-50%,-53%) rotate(2deg)}}}}
@keyframes drop{{from{{transform:translateY(-100%)}}}}
@keyframes stamp{{from{{opacity:0;transform:scale(3) rotate(12deg)}}to{{transform:rotate(-6deg)}}}}
@keyframes wob{{from{{transform:rotate(-6deg)}}to{{transform:rotate(-2deg) scale(1.06)}}}}
@keyframes strike{{from{{transform:scaleX(0)}}}}
@keyframes spin{{from{{transform:rotate(-40deg)}}to{{transform:rotate(30deg)}}}}
@keyframes rot{{to{{transform:rotate(360deg)}}}}
@keyframes slide{{to{{transform:translateX(120px)}}}}
@keyframes sweep{{to{{left:1300px}}}}
@keyframes pulse{{to{{transform:translateX(-50%) scale(1.08)}}}}
@keyframes conf{{0%{{opacity:0;transform:translate(0,0) rotate(0)}}2%{{opacity:1}}100%{{opacity:0;transform:translate(var(--dx),-700px) rotate(var(--r))}}}}
</style></head><body><div class="r">
<div class="sc s1"><div class="stripes"></div><div class="tag">{TAG}</div><div class="stop big">FERMO!</div><div class="q big"><span>Stai</span><span>pagando</span><span>troppo?</span></div></div>
<div class="sc s2"><div class="stripes"></div>{BRAND}<div class="claim big"><span>Solo</span> <span class="hl">offerte</span> <span class="hl">vere</span> <span>su</span> <span>Amazon</span></div>
<div class="pts"><div>✅ Controllate una per una</div><div>📉 Sconto sul prezzo indicato da Amazon</div><div>⏱️ Data e ora di ogni verifica</div></div></div>
<div class="sc s3"><div class="bg"><div class="rays"></div><div class="shine"></div></div><div class="lbl">{top}</div>
<div class="ill">{ill}</div>{f'<div class="sticker">−{disc}%</div>' if disc > 0 else ''}
<div class="bot"><div class="t">{o.get('titoloBreve') or o['titolo']}</div>
<div class="pr"><span class="now" id="now">{eur(ref or o['prezzo'])}</span>{f'<span class="was">{eur(ref)}</span>' if ref else ''}</div>
{f'<div class="ref">Sconto calcolato su {eur(ref)} = {o.get("tipoRiferimento", "prezzo di riferimento")} indicato da Amazon</div>' if ref else ''}
{f'<div class="nota">📉 {o["nota"]}</div>' if o.get('nota') else ''}</div><div class="conf">{coriandoli}</div></div>
<div class="sc s4"><div class="stripes"></div>{BRAND}<div class="c big"><span>Ogni giorno</span><span>fuori prezzo</span></div><div class="cta">Segui · link in bio →</div>
<div class="small">Prezzo verificato su Amazon.it il {when}: può cambiare.<br>Link affiliato Amazon: per te il prezzo non cambia.</div></div>
<div class="flash f1"></div><div class="flash f2"></div><div class="flash f3"></div>
</div></body></html>"""

# Il prezzo "scende" da quello di riferimento a quello di oggi
P0, P1, T0, T1 = (ref or o['prezzo']), o['prezzo'], t3 + tp, t3 + tp + 1.2
def prezzo_a(t):
    if t <= T0: return P0
    if t >= T1: return P1
    k = (t - T0) / (T1 - T0); k = 1 - (1 - k) ** 3
    return P0 + (P1 - P0) * k

N = int(END * FPS)
with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': os.environ['PW_CHROMIUM']} if os.environ.get('PW_CHROMIUM') else {}))
    pg = b.new_page(viewport={'width': 1080, 'height': 1920})
    pg.set_content(html); pg.wait_for_timeout(300)
    pg.evaluate('document.getAnimations().forEach(a => a.pause())')
    for i in range(N):
        t = i / FPS
        pg.evaluate(f'document.getAnimations().forEach(a => a.currentTime = {t * 1000}); document.getElementById("now").textContent = {json.dumps(eur(prezzo_a(t)))}')
        pg.screenshot(path=f'{tmp}/{i:04d}.jpg', type='jpeg', quality=90)
    b.close()

# --- Effetti sonori sintetizzati: whoosh ai cambi scena, colpo sul gancio e sul timbro, "cassa" sul prezzo ---
SR = 48000
sfx = np.zeros(int((END + 1) * SR))
rng = np.random.default_rng(7)
def put(sig, at, g):
    i = int(at * SR); sfx[i:i + len(sig)] += sig[:len(sfx) - i] * g
def whoosh(d=.45):
    n = int(d * SR); x = rng.uniform(-1, 1, n); t = np.arange(n) / SR
    y = np.zeros(n); a = 0
    for k in range(n):  # passa-basso con taglio che sale e scende
        c = .02 + .25 * np.sin(np.pi * t[k] / d) ** 2; a += c * (x[k] - a); y[k] = a
    return y * np.sin(np.pi * t / d) ** 2 * 3
def hit():
    t = np.arange(int(.5 * SR)) / SR
    return np.sin(2 * np.pi * np.cumsum(45 + 140 * np.exp(-t * 25)) / SR) * np.exp(-t * 7) + rng.uniform(-1, 1, len(t)) * np.exp(-t * 40) * .4
def ding():
    t = np.arange(int(.9 * SR)) / SR
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in [(1318, 5), (1976, 7), (2637, 9)]) / 2
def tick():
    t = np.arange(int(.03 * SR)) / SR
    return np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 200)
put(hit(), t1, .9)
for at in (t2, t3, t5): put(whoosh(), at - .25, .7)
k = T0
while k < T1: put(tick(), k, .25); k += .08
put(ding(), T1, .55); put(hit(), t3 + tp + 1.3, .7)
sfx = np.tanh(sfx) * .8
sfx_wav = f'{tmp}/sfx.wav'
with wave.open(sfx_wav, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((sfx * 32767).astype('<i2').tobytes())

# --- Mix: musica in loop che si abbassa sotto la voce, voce in primo piano, effetti ---
MUSICA = 'assets/musica/base.m4a'
inp = ['-framerate', str(FPS), '-i', f'{tmp}/%04d.jpg', '-stream_loop', '-1', '-i', MUSICA, '-i', sfx_wav]
voci = [(f, starts[i]) for i, (f, _) in enumerate(clips) if f]
for f, _ in voci: inp += ['-i', f]
filt = [f'[1:a]volume=0.55,atrim=0:{END:.2f},afade=t=out:st={END - 1.2:.2f}:d=1.2[mus]']
for k, (f, at) in enumerate(voci):
    filt.append(f'[{3 + k}:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=90,acompressor=threshold=-18dB:ratio=3,volume=1.9,adelay={int(at * 1000)}|{int(at * 1000)}[v{k}]')
if voci:
    filt.append(''.join(f'[v{k}]' for k in range(len(voci))) + f'amix=inputs={len(voci)}:normalize=0,apad=whole_dur={END:.2f}[voce]')
    filt.append('[voce]asplit[voce1][voce2]')
    filt.append('[mus][voce1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[duck]')
    filt.append(f'[duck][voce2][2:a]amix=inputs=3:normalize=0,alimiter=limit=0.95,atrim=0:{END:.2f}[a]')
else:
    filt.append(f'[mus][2:a]amix=inputs=2:normalize=0,alimiter=limit=0.95,atrim=0:{END:.2f}[a]')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inp, '-filter_complex', ';'.join(filt), '-map', '0:v', '-map', '[a]',
                '-t', f'{END:.2f}', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '20', '-r', str(FPS),
                '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', f'img/{asin}-reel.mp4'], check=True)
for f in os.listdir(tmp): os.remove(os.path.join(tmp, f))
os.rmdir(tmp)
print('ok', asin, f'{END:.1f}s')
