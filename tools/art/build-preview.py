"""Assemble the delivered PNGs for visual review; no gameplay code changes."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets'
im = Image.new('RGBA', (1600, 900), '#111e30')
d = ImageDraw.Draw(im)
FONT = 'C:/Windows/Fonts/arial.ttf'
BOLD = 'C:/Windows/Fonts/arialbd.ttf'
def text(x,y,s,size=20,color='#eaf2ff',bold=False):
    d.text((x,y),s,font=ImageFont.truetype(BOLD if bold else FONT,size),fill=color)
def box(rect,fill='#192d45',outline='#3b526b',radius=10):
    d.rounded_rectangle(rect,radius,fill,outline,2)
def asset(path,x,y,size=None):
    a=Image.open(OUT/path).convert('RGBA')
    if size: a=a.resize(size,Image.Resampling.NEAREST)
    im.alpha_composite(a,(x,y))

# Wireframe coordinates are authoritative. These backplates and all text are
# preview-only stand-ins for live Phaser UI; they are not production artwork.
asset('environment/warehouse-backdrop.png',0,0)
for r in [(24,18,374,104),(568,18,854,104),(1030,18,1246,104),(1264,18,1460,104),(1478,18,1576,104)]: box(r)
text(46,29,'СТАЖЁР',23,bold=True)
box((46,66,340,80),'#0e1c30','#0e1c30',5)
d.rounded_rectangle((46,66,150,80),5,fill='#25bcea')
text(247,42,'320 / 1000',14,'#a9c4dc')
asset('ui/icon-clock.png',588,40);text(646,32,'02:15',40,bold=True)
asset('ui/icon-money.png',1046,40);text(1100,39,'1 420 ₽',28,bold=True)
asset('ui/icon-star.png',1282,40);text(1336,39,'4.7',28,bold=True)
asset('ui/icon-pause.png',1506,40)

asset('ui/order-panel.png',24,126)
text(54,230,'ЗАКАЗ #1482',25,'#203149',bold=True)
names=['milk-carton','banana','toilet-paper','dumplings','kefir','apple','chocolate','dish-soap','rice','frozen-berries','shampoo','batteries']
labels=['Молоко','Бананы','Туалетная бумага','Пельмени','Кефир','Яблоко','Шоколад','Средство для посуды','Рис','Замороженные ягоды','Шампунь','Батарейки']
for j,(name,label,count) in enumerate(zip(names[:4],labels[:4],['1 / 1','0 / 2','0 / 1','0 / 1'])):
    y=292+j*102
    box((46,y,350,y+90),'#f6f0e6','#d8cebf',6)
    asset('products/'+name+'.png',51,y+10)
    text(122,y+15,label,17,'#203149',bold=True)
    text(122,y+47,count,21,'#26814a' if j==0 else '#6c6870')
text(54,730,'Собрано: 1 из 5',18,'#665f5b')
asset('ui/button-primary.png',49,780)
text(77,804,'ОТПРАВИТЬ ЗАКАЗ',23,bold=True)

# Five shelf modules scaled only for this preview to fit the 750x490 grid.
# Four rows remain aligned with the fixed prototype grid.
for c in range(5):
    x=420+c*150
    asset('environment/shelf-header.png',x,134,(150,48))
    text(x+20,149,['МОЛОЧНОЕ','ФРУКТЫ','БАКАЛЕЯ','СЛАДОСТИ','ДЛЯ ДОМА'][c],13,'#a9dfff',True)
    asset('environment/shelf-bay.png',x,190,(150,490))
grid=[0,1,8,6,7,4,5,3,9,10,0,1,8,6,11,4,5,3,9,2]
for i,k in enumerate(grid):
    c,r=i%5,i//5
    x,y=420+c*150,224+r*110
    asset('products/'+names[k]+'.png',x+43,y)
    label=labels[k]
    if len(label)>16: label={'Средство для посуды':'Для посуды','Замороженные ягоды':'Ягоды','Туалетная бумага':'Бумага'}.get(label,label)
    text(x+11,y+66,label,13,'#ccdae8')

box((420,706,1170,852),'#122339','#41556e',8)
text(440,720,'КОРЗИНА',18,bold=True)
text(440,745,'Нажмите товар, чтобы убрать',14,'#a9c4dc')
box((441,773,507,840),'#233b51','#3c6a72',4)
asset('products/milk-carton.png',442,774)
asset('character/worker-pick.png',824,718)
asset('character/cart.png',925,718)

asset('ui/phone-frame.png',1216,126)
text(1253,210,'ПОСЛЕДНИЙ ЗАКАЗ',21,bold=True)
box((1246,253,1544,468),'#1c3045','#34485d',9)
text(1268,275,'+248 ₽',40,'#5dcc7a',True)
for i in range(5): asset('ui/icon-star.png',1268+i*48,334)
text(1267,393,'Всё на месте!',21,'#eaf2ff',True)
text(1267,425,'Спасибо за свежие бананы.',17,'#c2d0df')
text(1253,509,'ВАШ РЕЙТИНГ',17,'#a9c4dc')
asset('ui/icon-star.png',1252,540);text(1304,540,'4.7',32,bold=True)
text(1253,615,'ДО СЛЕДУЮЩЕГО РАНГА',16,'#a9c4dc')
box((1253,654,1540,672),'#1c334f','#1c334f',6)
d.rounded_rectangle((1253,654,1345,672),6,fill='#25bcea')
text(1253,690,'320 / 1000 XP',17,'#a9c4dc')
text(1253,770,'Собирайте новый заказ',18)
im.convert('RGB').save(ROOT/'preview-batch-01.png')

# Contact sheet includes every delivered asset at natural size where practical.
sheet=Image.new('RGB',(1200,940),'#14273c')
sd=ImageDraw.Draw(sheet)
font=ImageFont.truetype(FONT,16)
def put(path,x,y,scale=1):
    a=Image.open(OUT/path).convert('RGBA')
    if scale!=1:a=a.resize((round(a.width*scale),round(a.height*scale)),Image.Resampling.NEAREST)
    sheet.paste(a,(x,y),a)
for i,name in enumerate(names):
    x=20+(i%6)*195;y=20+(i//6)*155
    put('products/'+name+'.png',x,y)
    put('products/'+name+'.png',x+66,y,1.5)
    sd.text((x,y+104),name,font=font,fill='white')
put('environment/shelf-bay.png',20,350)
put('environment/shelf-header.png',20,815)
put('character/worker-idle.png',260,350)
put('character/worker-pick.png',365,350)
put('character/cart.png',470,350)
for i,name in enumerate(['button-primary','button-primary-hover','button-primary-pressed']):put('ui/'+name+'.png',265,505+i*90)
for i,name in enumerate(['star','money','clock','pause']):put('ui/icon-'+name+'.png',270+i*70,800)
put('ui/order-panel.png',660,350,.7)
put('ui/phone-frame.png',920,350,.7)
put('environment/floor-strip.png',265,868,.6)
sheet.save(OUT/'contact-sheet-batch-01.png')
print('Built preview-batch-01.png and assets/contact-sheet-batch-01.png')
