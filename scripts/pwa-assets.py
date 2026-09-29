"""
PWA simgeleri, favicon ve iOS açılış ekranları (apple-touch-startup-image) üretir.

erqan.com logosundaki EQ monogramı burada vektörel olarak çizilir (src/components/brand.tsx
içindeki SVG ile aynı ölçüler). Marka rengi değişirse BLUE güncellenip yeniden çalıştırılır:

    pip install pillow && python3 scripts/pwa-assets.py
"""
from PIL import Image, ImageDraw, ImageFilter
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# EQ monogramı, erqan.com logosundan ölçülerek (322 birimlik kare) yeniden çizilir:
# 160,5 yarıçaplı halka (40 kalınlık), ortada 20 birim dikey boşluk, E çubuğu ve 45° Q kuyruğu.
K = 12  # süper örnekleme


def mark_mask():
    S = 322 * K
    m = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(m)
    s = lambda v: v * K
    d.ellipse((0, 0, s(321), s(321)), fill=255)
    d.ellipse((s(39.5), s(39.5), s(281.5), s(281.5)), fill=0)
    d.rectangle((s(150.5), 0, s(170.5), S), fill=0)
    d.rectangle((s(30), s(143), s(127.5), s(180)), fill=255)
    d.polygon([(s(220.5), s(221.5)), (s(321), s(322)), (s(269), s(322)), (s(194.5), s(247.5))], fill=255)
    return m


_a = mark_mask()
mark = Image.new("RGBA", _a.size, (255, 255, 255, 255))
mark.putalpha(_a)

BLUE = (15, 145, 227)  # #0F91E3, erqan.com ana rengi


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def background(size):
    # iOS simge dili: marka mavisinde, sol üstten hafif aydınlanan yumuşak degrade
    S = size
    top, bottom = lerp(BLUE, (255, 255, 255), 0.18), lerp(BLUE, (0, 0, 0), 0.16)
    bg = Image.new("RGB", (S, S))
    px = bg.load()
    for y in range(S):
        for x in range(S):
            t = (x * 0.35 + y) / (S * 1.35)
            px[x, y] = lerp(top, bottom, t)
    return bg


def icon(size, scale, radius=None, shadow=True):
    S = 1024
    bg = background(S).convert("RGBA")
    w = round(S * scale)
    m = mark.resize((w, round(w * mark.height / mark.width)), Image.LANCZOS)
    x, y = (S - m.width) // 2, (S - m.height) // 2
    if shadow:
        sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        alpha = m.split()[3].point(lambda a: a * 0.22)
        blk = Image.new("RGBA", m.size, (0, 30, 60, 255))
        blk.putalpha(alpha)
        sh.paste(blk, (x, y + 14), blk)
        bg = Image.alpha_composite(bg, sh.filter(ImageFilter.GaussianBlur(18)))
    bg.alpha_composite(m, (x, y))
    if radius:
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=round(S * radius), fill=255)
        bg.putalpha(mask)
    return bg.resize((size, size), Image.LANCZOS)


icons = f"{ROOT}/public/icons"
# Uygulama simgeleri tam kare (iOS ve Android köşeleri kendisi yuvarlar)
icon(512, 0.56).convert("RGB").save(f"{icons}/icon-512.png", optimize=True)
icon(192, 0.56).convert("RGB").save(f"{icons}/icon-192.png", optimize=True)
icon(180, 0.56).convert("RGB").save(f"{icons}/apple-touch-icon.png", optimize=True)
icon(512, 0.44).convert("RGB").save(f"{icons}/maskable-512.png", optimize=True)  # güvenli bölge %80
icon(96, 0.56, radius=0.225).save(f"{icons}/shortcut-96.png", optimize=True)
# Favicon: yuvarlatılmış köşeli
icon(64, 0.6, radius=0.225).save(f"{ROOT}/src/app/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

# iOS açılış ekranları (apple-touch-startup-image): ortada yuvarlatılmış simge, açık ve koyu
DEVICES = [  # (css genişlik, css yükseklik, piksel oranı)
    (440, 956, 3), (402, 874, 3), (420, 912, 3), (430, 932, 3), (393, 852, 3), (428, 926, 3),
    (390, 844, 3), (375, 812, 3), (414, 896, 3), (414, 896, 2), (375, 667, 2), (414, 736, 3),
]
big = icon(1024, 0.56, radius=0.225)
out = []
os.makedirs(f"{ROOT}/public/splash", exist_ok=True)
for w, h, r in DEVICES:
    W, H = w * r, h * r
    size = 112 * r
    ic = big.resize((size, size), Image.LANCZOS)
    for scheme, color in (("light", (242, 242, 247)), ("dark", (0, 0, 0))):
        img = Image.new("RGB", (W, H), color)
        img.paste(ic, ((W - size) // 2, (H - size) // 2), ic)
        name = f"splash-{w}x{h}@{r}x-{scheme}.png"
        img.save(f"{ROOT}/public/splash/{name}", optimize=True)
        out.append(
            {
                "url": f"/splash/{name}",
                "media": f"(device-width: {w}px) and (device-height: {h}px) and (-webkit-device-pixel-ratio: {r})"
                f" and (orientation: portrait) and (prefers-color-scheme: {scheme})",
            }
        )

with open(f"{ROOT}/src/app/splash-screens.json", "w") as f:
    json.dump(out, f, indent=1)
    f.write("\n")
print(f"{len(out)} açılış ekranı yazıldı")
