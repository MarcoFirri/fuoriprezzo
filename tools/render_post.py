"""Crea le immagini social di un'offerta: img/<ASIN>.png (Telegram, 1280x720) e img/<ASIN>-ig.jpg (Instagram, 1080x1350).
Uso: python3 tools/render_post.py ASIN   (dalla cartella del sito)"""
import json, subprocess, sys, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright

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
chk = datetime.datetime.fromisoformat(o['controllato']).astimezone(ZoneInfo('Europe/Rome'))
mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
when = f"{chk.day} {mesi[chk.month-1]} {chk.year} alle {chk:%H:%M}"
TAG = '<svg viewBox="0 0 40 40"><path d="M21.5 3.5h11a4 4 0 0 1 4 4v11a4 4 0 0 1-1.2 2.8L21.6 35a4 4 0 0 1-5.7 0L5 24.1a4 4 0 0 1 0-5.7L18.7 4.7a4 4 0 0 1 2.8-1.2z" fill="#FF4141"/><circle cx="29" cy="11" r="3" fill="#17112A"/><path d="M12 22l9-9" stroke="#17112A" stroke-width="3" stroke-linecap="round"/></svg>'
BRAND = f'<div class="brand">{TAG}<span>fuori<b>prezzo</b><i>.it</i></span></div>'
BASE = f"""body{{margin:0;font-family:'Inter Display','Inter',sans-serif}} .bg{{background:radial-gradient(circle at 30% 25%,color-mix(in oklab,{col} 45%,white),{col} 58%,color-mix(in oklab,{col} 80%,black))}}
.brand{{display:inline-flex;align-items:center;gap:14px;background:#17112A;color:#fff;padding:12px 24px 12px 14px;border-radius:999px;font-weight:900;font-size:34px;letter-spacing:-.03em}}
.brand svg{{width:44px;height:44px}} .brand b{{color:#FF4141;font-weight:900}} .brand i{{font-style:normal;color:#A99FC2}}"""

tg = f"""<html><head><style>{BASE}
.c{{width:1280px;height:720px;position:relative;overflow:hidden}} .c::before{{content:"";position:absolute;width:560px;height:560px;border-radius:50%;right:-120px;top:-180px;background:rgba(255,255,255,.18)}}
.ill{{position:absolute;left:50%;top:48%;width:760px;transform:translate(-50%,-50%);filter:drop-shadow(0 28px 30px rgba(23,17,42,.28))}} .brand{{position:absolute;left:44px;bottom:36px}}
</style></head><body><div class="c bg"><div class="ill">{ill}</div>{BRAND}</div></body></html>"""

ig = f"""<html><head><style>{BASE}
.p{{position:relative;width:1080px;height:1350px;display:flex;flex-direction:column;background:#17112A}}
.top{{position:relative;height:760px;overflow:hidden;border-radius:0 0 56px 56px}} .top::before{{content:"";position:absolute;width:520px;height:520px;border-radius:50%;right:-140px;top:-160px;background:rgba(255,255,255,.2)}}
.ill{{position:absolute;left:50%;top:52%;width:820px;transform:translate(-50%,-50%);filter:drop-shadow(0 30px 34px rgba(23,17,42,.3))}}
.top .brand{{position:absolute;left:48px;top:44px}}
.flag{{position:absolute;right:48px;top:44px;background:#FF4141;color:#fff;font-weight:900;font-size:30px;letter-spacing:.06em;text-transform:uppercase;padding:14px 24px;border-radius:999px}}
.sticker{{position:absolute;right:56px;top:700px;z-index:2;background:#FFD43B;color:#17112A;font-weight:900;font-size:76px;letter-spacing:-.04em;padding:14px 30px;border-radius:26px;transform:rotate(-6deg);box-shadow:8px 8px 0 #0A0712}}
.bot{{flex:1;padding:70px 56px 44px;color:#F4F0FF;display:flex;flex-direction:column;gap:18px}}
.t{{font-weight:800;font-size:46px;line-height:1.08;letter-spacing:-.03em;max-width:820px}}
.pr{{display:flex;align-items:flex-end;gap:26px;margin-top:6px}} .now{{font-weight:900;font-size:120px;line-height:.85;letter-spacing:-.05em;color:#FF4141}}
.was{{font-size:44px;color:#A99FC2;text-decoration:line-through;text-decoration-color:#FF4141;text-decoration-thickness:4px;padding-bottom:6px}}
.ref{{font-size:26px;color:#A99FC2}} .nota{{font-size:30px;font-weight:700;color:#FFD43B;line-height:1.25;max-width:900px}} .foot{{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:26px;color:#A99FC2;border-top:2px dashed #2F2744;padding-top:22px}} .foot b{{color:#FFD43B}}
</style></head><body><div class="p"><div class="top bg"><div class="ill">{ill}</div>{BRAND}{f'<div class="flag">{o["etichetta"]}</div>' if o.get('etichetta') else ''}</div>{f'<div class="sticker">−{disc}%</div>' if disc>0 else ''}
<div class="bot"><div class="t">{o.get('titoloBreve') or o['titolo']}</div>
<div class="pr"><span class="now">{eur(o['prezzo'])}</span>{f'<span class="was">{eur(ref)}</span>' if ref else ''}</div>
{f'<div class="ref">{eur(ref)} = {o.get("tipoRiferimento","prezzo di riferimento")}</div>' if ref else ''}
{f'<div class="nota">📉 {o["nota"]}</div>' if o.get('nota') else ''}
<div class="foot"><span>Prezzo verificato il {when}</span><b>Link in bio →</b></div></div></div></body></html>"""

with sync_playwright() as p:
    b = p.chromium.launch(**({'executable_path': __import__('os').environ['PW_CHROMIUM']} if __import__('os').environ.get('PW_CHROMIUM') else {}))
    for html, w, h, out, kw in [(tg, 1280, 720, f'img/{asin}.png', {}), (ig, 1080, 1350, f'img/{asin}-ig.jpg', {'type': 'jpeg', 'quality': 92})]:
        pg = b.new_page(viewport={'width': w, 'height': h}); pg.set_content(html); pg.wait_for_timeout(300)
        pg.screenshot(path=out, **kw); pg.close()
    b.close()
print('ok', asin)
