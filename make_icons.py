# Monument Row icon: white obelisk on sky over lawn, gold sun
import math
from PIL import Image, ImageDraw

def make(size, fname):
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # sky
    for y in range(S):
        t = y / S
        if t < 0.62:
            c = (int(126 + 42 * (1 - t / 0.62)), int(195 + 21 * (1 - t / 0.62)), 232, 255)
        else:
            g = (t - 0.62) / 0.38
            c = (int(106 - 12 * g), int(168 - 18 * g), int(79 - 7 * g), 255)
        d.line([(0, y), (S, y)], fill=c)
    # gold sun
    r = S * 0.13
    d.ellipse([S * 0.68 - r, S * 0.14 - r, S * 0.68 + r, S * 0.14 + r], fill=(232, 200, 74, 255))
    # obelisk
    cx = S * 0.42
    base_w = S * 0.16
    top_w = S * 0.07
    top_y = S * 0.16
    base_y = S * 0.66
    d.polygon([(cx - base_w / 2, base_y), (cx - top_w / 2, top_y),
               (cx + top_w / 2, top_y), (cx + base_w / 2, base_y)], fill=(242, 239, 230, 255))
    # pyramidion
    d.polygon([(cx - top_w / 2, top_y), (cx, S * 0.10), (cx + top_w / 2, top_y)], fill=(232, 200, 74, 255))
    # shade side
    d.polygon([(cx, base_y), (cx + top_w / 2 * 0.2, top_y), (cx + top_w / 2, top_y),
               (cx + base_w / 2, base_y)], fill=(221, 216, 200, 255))
    # plinth
    d.rectangle([cx - base_w * 0.75, base_y, cx + base_w * 0.75, base_y + S * 0.045], fill=(200, 194, 178, 255))
    # reflecting pool
    d.rectangle([S * 0.16, S * 0.76, S * 0.84, S * 0.86], fill=(126, 195, 232, 255))
    d.rectangle([S * 0.16, S * 0.76, S * 0.84, S * 0.78], fill=(168, 216, 240, 255))
    img.save(fname)
    print("wrote", fname, S)

make(512, "icons/icon-512.png")
make(192, "icons/icon-192.png")
make(180, "icons/icon-180.png")
