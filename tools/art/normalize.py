"""Normalize generated PNG dimensions, retaining genuine source alpha."""
import sys
from pathlib import Path
from PIL import Image

src, dst, width, height, mode = sys.argv[1:]
size = (int(width), int(height))
im = Image.open(src).convert('RGBA')
if mode == 'sprite':
    # Ignore nearly invisible generated alpha dust when measuring the sprite.
    alpha = im.getchannel('A').point(lambda a: 0 if a < 32 else a)
    im.putalpha(alpha)
    bounds = alpha.getbbox()
    if bounds:
        im = im.crop(bounds)
    margin = 4 if size == (64, 64) else 3
    im.thumbnail((size[0] - margin * 2, size[1] - margin * 2), Image.Resampling.NEAREST)
    out = Image.new('RGBA', size)
    out.alpha_composite(im, ((size[0] - im.width) // 2, (size[1] - im.height) // 2))
elif mode == 'frame':
    alpha = im.getchannel('A').point(lambda a: 0 if a < 32 else a)
    im.putalpha(alpha)
    im = im.crop(alpha.getbbox())
    im = im.resize((size[0]-6, size[1]-6), Image.Resampling.NEAREST)
    out = Image.new('RGBA', size)
    out.alpha_composite(im, (3,3))
elif mode == 'tile':
    # Export a reflected repeat from the opaque generated texture: exact X seam.
    # Reflection preserves source pixels and avoids painting a corrective join.
    half = im.resize((size[0]//2, size[1]), Image.Resampling.NEAREST)
    out = Image.new('RGBA', size)
    out.paste(half, (0,0))
    out.paste(half.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (size[0]//2,0))
else:
    out = im.resize(size, Image.Resampling.NEAREST)
Path(dst).parent.mkdir(parents=True, exist_ok=True)
out.save(dst)
print(dst, out.size, 'alpha', out.getchannel('A').getextrema())
