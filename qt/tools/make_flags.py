"""Gera as bandeiras do seletor de servidor (resources/flags/<país>.png, 40×28 = 2× de 20×14, cantos 2 px).
Desenho simplificado, legível no tamanho pequeno. Uso: python3 tools/make_flags.py   (rode da pasta qt/)"""
import math
from PIL import Image, ImageDraw

W, H, SS = 40, 28, 8          # tamanho final e supersampling
w, h = W * SS, H * SS

def star(d, cx, cy, r, color, points=5, inner=0.4, rot=-math.pi / 2):
    pts = []
    for k in range(points * 2):
        rr = r if k % 2 == 0 else r * inner
        a = rot + k * math.pi / points
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.polygon(pts, fill=color)

def br(d):
    d.rectangle((0, 0, w, h), fill="#009c3b")
    d.polygon([(w * .08, h / 2), (w / 2, h * .1), (w * .92, h / 2), (w / 2, h * .9)], fill="#ffdf00")
    r = h * .26; d.ellipse((w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r), fill="#002776")
    d.arc((w / 2 - r * 1.3, h / 2 - r * .55, w / 2 + r * 1.3, h / 2 + r * 2.4), 220, 320, fill="white", width=int(h * .05))

def us(d):
    for i in range(13):
        d.rectangle((0, i * h / 13, w, (i + 1) * h / 13), fill="#b22234" if i % 2 == 0 else "white")
    cw, ch = w * .45, h * 7 / 13
    d.rectangle((0, 0, cw, ch), fill="#3c3b6e")
    for row in range(4):
        for col in range(5):
            x = cw * (col + .5 + (row % 2) * .5) / 5.5; y = ch * (row + .6) / 4.4
            star(d, x, y, h * .035, "white")

def de(d):
    for i, c in enumerate(["#000000", "#dd0000", "#ffce00"]):
        d.rectangle((0, i * h / 3, w, (i + 1) * h / 3), fill=c)

def se(d):
    d.rectangle((0, 0, w, h), fill="#006aa7")
    t = h * .2
    d.rectangle((w * .3125, 0, w * .3125 + t, h), fill="#fecc00")
    d.rectangle((0, h / 2 - t / 2, w, h / 2 + t / 2), fill="#fecc00")

def sg(d):
    d.rectangle((0, 0, w, h / 2), fill="#ef3340"); d.rectangle((0, h / 2, w, h), fill="white")
    r = h * .17; cx, cy = w * .2, h * .25
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill="white")
    d.ellipse((cx - r + r * .35, cy - r * .95, cx + r * 1.2, cy + r * .95), fill="#ef3340")
    for k in range(5):
        a = -math.pi / 2 + k * 2 * math.pi / 5
        star(d, cx + r * 1.05 + r * .55 * math.cos(a), cy + r * .55 * math.sin(a), r * .2, "white")

def jp(d):
    d.rectangle((0, 0, w, h), fill="white")
    r = h * .3; d.ellipse((w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r), fill="#bc002d")

def kr(d):
    d.rectangle((0, 0, w, h), fill="white")
    r = h * .25; cx, cy = w / 2, h / 2
    d.pieslice((cx - r, cy - r, cx + r, cy + r), 180, 360, fill="#cd2e3a")
    d.pieslice((cx - r, cy - r, cx + r, cy + r), 0, 180, fill="#0047a0")
    d.ellipse((cx - r, cy - r / 2, cx, cy + r / 2), fill="#cd2e3a")
    d.ellipse((cx, cy - r / 2, cx + r, cy + r / 2), fill="#0047a0")
    # trigramas: três barras curtas perpendiculares à diagonal, em cada canto
    for sx, sy in [(-1, -1), (1, 1), (1, -1), (-1, 1)]:
        ux, uy = sx * w, sy * h; L = math.hypot(ux, uy); ux, uy = ux / L, uy / L
        px, py = -uy, ux
        for k in range(3):
            dist = h * (.38 + k * .06)
            x, y = cx + ux * dist, cy + uy * dist
            half = h * .08
            d.line((x - px * half, y - py * half, x + px * half, y + py * half), fill="black", width=int(h * .035))

def au(d):
    d.rectangle((0, 0, w, h), fill="#012169")
    cw, ch = w / 2, h / 2
    d.line((0, 0, cw, ch), fill="white", width=int(h * .1)); d.line((cw, 0, 0, ch), fill="white", width=int(h * .1))
    d.line((0, 0, cw, ch), fill="#c8102e", width=int(h * .035)); d.line((cw, 0, 0, ch), fill="#c8102e", width=int(h * .035))
    d.rectangle((cw / 2 - h * .06, 0, cw / 2 + h * .06, ch), fill="white"); d.rectangle((0, ch / 2 - h * .06, cw, ch / 2 + h * .06), fill="white")
    d.rectangle((cw / 2 - h * .035, 0, cw / 2 + h * .035, ch), fill="#c8102e"); d.rectangle((0, ch / 2 - h * .035, cw, ch / 2 + h * .035), fill="#c8102e")
    star(d, cw / 2, h * .75, h * .11, "white", points=7, inner=.45)
    for (x, y, s) in [(.75, .25, .06), (.62, .5, .06), (.88, .45, .06), (.75, .82, .06), (.82, .6, .03)]:
        star(d, w * x, h * y, h * s, "white", points=7, inner=.45)

FLAGS = {"br": br, "us": us, "de": de, "se": se, "sg": sg, "jp": jp, "kr": kr, "au": au}
mask = Image.new("L", (w, h), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), 2 * SS, fill=255)
for name, fn in FLAGS.items():
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); fn(ImageDraw.Draw(im))
    im.putalpha(mask)
    im.resize((W, H), Image.LANCZOS).save("resources/flags/%s.png" % name, optimize=True)
print(len(FLAGS), "flags")
