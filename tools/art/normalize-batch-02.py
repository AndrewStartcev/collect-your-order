"""Mechanical export for Batch 02: alpha trim, fixed canvas and ground anchor."""
import sys, json
from pathlib import Path
from PIL import Image

source, dest, w, h, mode = sys.argv[1:]
w,h=int(w),int(h)
im=Image.open(source).convert('RGBA')
alpha=im.getchannel('A').point(lambda a: 0 if a<24 else a)
im.putalpha(alpha)
if mode=='character':
    im=im.crop(alpha.getbbox())
    # All poses share the same visible height and ground contact. Horizontal
    # registration follows the cap, not the changing extent of reaching arms.
    scale=396/im.height
    im=im.resize((round(im.width*scale),396),Image.Resampling.NEAREST)
    cap=[]
    for y in range(min(90,im.height)):
        for x in range(im.width):
            r,g,b,a=im.getpixel((x,y))
            if a>128 and r>90 and r>g*1.45 and r>b*1.25:cap.append(x)
    if not cap:raise ValueError('No red cap anchor found')
    center=sum(cap)/len(cap)
    x=round(145-center)
    if x<3 or x+im.width>w-3:
        raise ValueError(f'Pose exceeds canvas at registered scale: x={x}, width={im.width}')
    out=Image.new('RGBA',(w,h))
    out.alpha_composite(im,(x,409-im.height))
elif mode=='object':
    im=im.crop(alpha.getbbox())
    im.thumbnail((w-12,h-12),Image.Resampling.NEAREST)
    out=Image.new('RGBA',(w,h))
    out.alpha_composite(im,((w-im.width)//2,h-6-im.height))
elif mode=='shadow':
    # Preserve the generated soft alpha gradient; do not sharpen shadow pixels.
    im=Image.open(source).convert('RGBA')
    im=im.crop(im.getchannel('A').getbbox())
    im=im.resize((w-12,h-12),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',(w,h))
    out.alpha_composite(im,(6,6))
else:
    out=im.resize((w,h),Image.Resampling.NEAREST)
Path(dest).parent.mkdir(parents=True,exist_ok=True)
out.save(dest)
print(json.dumps({'file':dest,'size':out.size,'bounds':out.getchannel('A').getbbox(),'alpha':out.getchannel('A').getextrema()}))
