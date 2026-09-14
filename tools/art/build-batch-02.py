"""Batch 02 composition review; production game and accepted UI stay untouched."""
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'assets'
im=Image.open(ASSETS/'environment/warehouse-backdrop.png').convert('RGBA')
def place(path,x,y,w=None,h=None):
    sprite=Image.open(ASSETS/path).convert('RGBA')
    if w is not None:
        sprite=sprite.resize((w,h),Image.Resampling.NEAREST)
    im.alpha_composite(sprite,(x,y))

# No UI: the review explicitly asks whether the world stands on its own.
# Three close broad bays, rather than five thin cabinets.
bay_x=[275,625,975]
for x in bay_x:
    place('environment-v2/shelf-base-shadow.png',x,705,350,83)
    place('environment-v2/shelf-bay-large.png',x,190,350,517)
    place('environment-v2/shelf-header-large.png',x,123,350,70)

products=['milk-carton','kefir','banana','apple','rice','chocolate',
          'toilet-paper','dumplings','frozen-berries','dish-soap','shampoo','batteries']
for col,x in enumerate(bay_x):
    for row in range(4):
        for slot in range(2):
            name=products[(col*4+row*2+slot)%len(products)]
            # Display-only scaling of the existing PNGs, not replacement art.
            place('products/'+name+'.png',x+59+slot*137,217+row*117,88,88)

place('environment-v2/foreground-floor-strip.png',0,640)
place('character-v2/cart-shadow.png',793,787,410,95)
place('character-v2/cart-large.png',785,590,410,284)
# 396 visible source pixels * 300/420 = 283 visible preview pixels.
place('character-v2/idle-01.png',582,574,229,300)
im.convert('RGB').save(ASSETS/'preview-batch-02.png')
print('Saved assets/preview-batch-02.png (1600x900); no UI or gameplay edits')
