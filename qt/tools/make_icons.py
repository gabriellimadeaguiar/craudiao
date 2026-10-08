"""Gera os ícones de app dos jogos (128 px, cantos arredondados) a partir das capas em resources/games.
Uso: python3 tools/make_icons.py   (rode da pasta qt/)"""
import re
from PIL import Image, ImageDraw

SIZE, RADIUS, SS = 128, 30, 4
APP_ICONS = {"dota2": "dota-2.png", "fortnite": "fortnite.png", "ow2": "overwatch-2.png"}

src = open("qml/Logic.js", encoding="utf-8").read()
catalog = dict(re.findall(r'^\s+(\w+):\s+\{ name: "[^"]+", img: G \+ "([^"]+)"', src, re.M))
mask = Image.new("L", (SIZE * SS, SIZE * SS), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE * SS - 1, SIZE * SS - 1), RADIUS * SS, fill=255)
mask = mask.resize((SIZE, SIZE), Image.LANCZOS)
for gid, img in catalog.items():
    im = Image.open("resources/games/" + APP_ICONS.get(gid, img)).convert("RGB")
    w, h = im.size
    s = min(w, h)
    # capa vertical: recorte quadrado do terço de cima, onde fica o título/arte principal
    top = 0 if h <= w else int((h - s) * 0.2)
    im = im.crop(((w - s) // 2, top, (w - s) // 2 + s, top + s)).resize((SIZE, SIZE), Image.LANCZOS)
    im.putalpha(mask)
    im.save("resources/icons/%s.png" % gid, optimize=True)
    print(gid)
