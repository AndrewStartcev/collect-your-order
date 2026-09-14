"""Verify Batch 01 with the narrowly scoped Batch 01.1 revision."""
from pathlib import Path
import json
from PIL import Image, ImageChops
ROOT=Path(__file__).resolve().parents[2]
manifest=json.loads((ROOT/'assets/batch-01-manifest.json').read_text(encoding='utf-8'))
checks=[]
for entry in manifest:
    p=ROOT/entry['path']
    im=Image.open(p)
    assert im.format=='PNG' and im.mode=='RGBA',p
    assert list(im.size)==[entry['w'],entry['h']],p
    alpha=im.getchannel('A')
    bounds=alpha.getbbox()
    if 'products/' in entry['path']:
        assert bounds and min(bounds[:2])>=3 and max(bounds[2:])<=61,(p,bounds)
        assert 52<=max(bounds[2]-bounds[0],bounds[3]-bounds[1])<=58,(p,bounds)
    if 'warehouse-backdrop' in entry['path']:
        assert alpha.getextrema()==(255,255),(p,alpha.getextrema())
    elif 'floor-strip' not in entry['path']:
        assert alpha.getextrema()[0]==0,p
    else:
        assert alpha.getextrema()==(255,255),(p,alpha.getextrema())
        assert ImageChops.difference(im.crop((0,0,1,128)),im.crop((511,0,512,128))).getbbox() is None,'floor seam'
    checks.append({'path':entry['path'],'size':list(im.size),'alpha':alpha.getextrema(),'bounds':bounds,'bytes':p.stat().st_size})
assert len(checks)==28,len(checks)
assert Image.open(ROOT/'preview-batch-01.png').size==(1600,900)
(ROOT/'assets/batch-01-qa.json').write_text(json.dumps({'result':'PASS','assets':checks},indent=2),encoding='utf-8')
print('PASS: 28 PNGs, dimensions, RGBA, product margins, opaque backdrop, floor seam, 1600x900 preview')
