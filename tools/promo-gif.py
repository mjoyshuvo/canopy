# Joins the frames from tools/promo.mjs into media/promo/canopy-themes.gif.
# Usage: python3 tools/promo-gif.py <frames dir> <out.gif> <width>
import sys, glob, os
from PIL import Image
src, out, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
order = ['firefly-lake','silver-grass','apple-green','one-dark-pro','dracula','material']
def load(f):
    im = Image.open(f).convert('RGB'); h = round(im.height*width/im.width)
    return im.resize((width,h), Image.LANCZOS)
seq = []  # (image, ms)
themes = [[load(f) for f in sorted(glob.glob(f"{src}/{t}/*.png"))[::3]] for t in order]
for i, fr in enumerate(themes):
    if len(fr) == 1: seq.append((fr[0], 2200))
    else: seq += [(f, 170) for f in fr]
    nxt = themes[(i+1) % len(themes)][0]
    for k in range(1, 3): seq.append((Image.blend(fr[-1], nxt, k/3), 90))
frames = [im.quantize(colors=160, method=Image.MEDIANCUT, dither=Image.Dither.NONE) for im,_ in seq]
frames[0].save(out, save_all=True, append_images=frames[1:], duration=[d for _,d in seq], loop=0, optimize=True, disposal=1)
print(len(frames), os.path.getsize(out)/1e6, 'MB')
