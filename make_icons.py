import math
from PIL import Image, ImageDraw

def star_points(cx, cy, R, r, n=5, rot=-math.pi/2):
    pts = []
    for i in range(n*2):
        ang = rot + i*math.pi/n
        rad = R if i % 2 == 0 else r
        pts.append((cx + rad*math.cos(ang), cy + rad*math.sin(ang)))
    return pts

def make(size, pad_frac=0.0, fname=""):
    S = size
    img = Image.new("RGBA", (S, S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # dark stage background with rounded look (iOS rounds anyway); fill full for maskable
    d.rectangle([0,0,S,S], fill=(19,17,13,255))
    # warm vignette glow
    glow = Image.new("RGBA",(S,S),(0,0,0,0))
    gd = ImageDraw.Draw(glow)
    for i in range(8):
        a = int(16 - i*1.6)
        rr = int(S*0.30 + i*S*0.045)
        gd.ellipse([S/2-rr, S*0.34-rr, S/2+rr, S*0.34+rr], fill=(212,175,79,max(a,0)))
    img = Image.alpha_composite(img, glow)
    d = ImageDraw.Draw(img)
    cx, cy = S/2, S*0.46
    R = S*0.30
    r = R*0.40
    # gold star with darker outline
    d.polygon(star_points(cx, cy, R, r), fill=(212,175,79,255), outline=(90,66,22,255))
    # inner highlight star
    d.polygon(star_points(cx, cy, R*0.9, r*0.9), fill=(236,210,138,255))
    d.polygon(star_points(cx, cy, R*0.62, r*0.62), fill=(212,175,79,255))
    # "47" badge style word under star
    try:
        from PIL import ImageFont
        fs = int(S*0.13)
        font = ImageFont.truetype("georgia.ttf", fs)
    except Exception:
        font = None
    txt = "PREZ"
    if font:
        tb = d.textbbox((0,0), txt, font=font)
        tw, th = tb[2]-tb[0], tb[3]-tb[1]
        d.text(((S-tw)/2 - tb[0], S*0.78 - th/2 - tb[1]), txt, font=font, fill=(241,230,203,255))
    img.save(fname)
    print("wrote", fname, S)

make(512, fname="icons/icon-512.png")
make(192, fname="icons/icon-192.png")
make(180, fname="icons/icon-180.png")
