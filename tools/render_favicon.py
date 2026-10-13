"""Crea le icone del sito partendo da favicon.svg.

Uso: python3 tools/render_favicon.py
Genera favicon.ico (16, 32, 48), favicon-96.png, apple-touch-icon.png (180),
icon-192.png e icon-512.png. Le icone per telefono hanno lo sfondo del sito,
perché iOS e Android riempiono di nero le parti trasparenti.
"""
import io, pathlib
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SVG = (ROOT / 'favicon.svg').read_text()
BG = '#F7F5FC'


def render(pg, size, bg=None, pad=0.0):
    inner = size * (1 - 2 * pad)
    html = (f'<html><body style="margin:0;width:{size}px;height:{size}px;'
            f'background:{bg or "transparent"};display:grid;place-items:center">'
            f'<div style="width:{inner}px;height:{inner}px">'
            f'{SVG.replace("<svg ", "<svg width=\"100%\" height=\"100%\" ", 1)}'
            '</div></body></html>')
    pg.set_viewport_size({'width': size, 'height': size})
    pg.set_content(html)
    return Image.open(io.BytesIO(pg.screenshot(omit_background=bg is None))).convert('RGBA')


with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    big = render(pg, 256)
    big.save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    render(pg, 96).save(ROOT / 'favicon-96.png', optimize=True)
    render(pg, 180, BG, 0.12).convert('RGB').save(ROOT / 'apple-touch-icon.png', optimize=True)
    # 192 e 512: margine ampio così vanno bene anche come icone "maskable" di Android
    render(pg, 192, BG, 0.16).convert('RGB').save(ROOT / 'icon-192.png', optimize=True)
    render(pg, 512, BG, 0.16).convert('RGB').save(ROOT / 'icon-512.png', optimize=True)
    b.close()
print('Icone create.')
