"""Gera resources/app.ico (ícone do .exe e do instalador) com o "X" da marca, a partir dos paths de qml/Logo.qml.
Uso: python3 tools/make_appicon.py   (rode da pasta qt/)"""
import re
from PIL import Image, ImageDraw

BG, S = (22, 25, 31, 255), 1024

def tokens(d):
    return re.findall(r"[MLHVCZmlhvcz]|-?\d*\.?\d+(?:e-?\d+)?", d)

def subpaths(d):
    """Achata o path SVG (M L H V C Z absolutos) em polígonos, um por subpath."""
    t, i, cmd, out, cur, p = tokens(d), 0, None, [], [], (0.0, 0.0)
    num = lambda: float(t[i])
    while i < len(t):
        if re.match(r"[A-Za-z]", t[i]):
            cmd = t[i]; i += 1
            if cmd in "Zz":
                continue
        if cmd == "M":
            if cur: out.append(cur)
            p = (float(t[i]), float(t[i + 1])); i += 2; cur = [p]; cmd = "L"
        elif cmd == "L":
            p = (float(t[i]), float(t[i + 1])); i += 2; cur.append(p)
        elif cmd == "H":
            p = (float(t[i]), p[1]); i += 1; cur.append(p)
        elif cmd == "V":
            p = (p[0], float(t[i])); i += 1; cur.append(p)
        elif cmd == "C":
            c = [float(x) for x in t[i:i + 6]]; i += 6
            p0 = p
            for k in range(1, 13):
                u = k / 12; v = 1 - u
                cur.append((v**3 * p0[0] + 3 * v * v * u * c[0] + 3 * v * u * u * c[2] + u**3 * c[4],
                            v**3 * p0[1] + 3 * v * v * u * c[1] + 3 * v * u * u * c[3] + u**3 * c[5]))
            p = (c[4], c[5])
        else:
            raise ValueError(cmd)
    if cur: out.append(cur)
    return out

src = open("qml/Logo.qml", encoding="utf-8").read()
paths = re.findall(r'fillColor: "(#[0-9A-Fa-f]+)"; PathSvg \{ path: "([^"]+)"', src)
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
dr = ImageDraw.Draw(img)
dr.rounded_rectangle((0, 0, S - 1, S - 1), S * 0.22, fill=BG)
# o "X" da marca são os paths 3 a 6 (x de 11.4 a 31.3, y de 0 a 20); o 2º subpath do último é um furo
scale = S * 0.62 / 20
tx = lambda q: ((q[0] - 21.35) * scale + S / 2, (q[1] - 10) * scale + S / 2)
for color, d in paths[3:7]:
    rgb = tuple(int(color[k:k + 2], 16) for k in (1, 3, 5)) + (255,)
    for n, poly in enumerate(subpaths(d)):
        dr.polygon([tx(q) for q in poly], fill=rgb if n == 0 else BG)
img.resize((256, 256), Image.LANCZOS).save("resources/app.ico", sizes=[(256, 256), (64, 64), (48, 48), (32, 32), (16, 16)])
img.resize((256, 256), Image.LANCZOS).save("resources/app.png")
print("ok")
