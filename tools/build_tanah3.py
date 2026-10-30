# Membangun spritesheet pet_tanah3 dari Tanah_evol3_idle.jpg + Tanah_evol3_attack.jpg
import numpy as np, sys
from PIL import Image
from scipy import ndimage as ndi

UP='/mnt/user-data/uploads/'
FW=FH=174; BOX=128; FEET=(FH+BOX)//2   # kaki di y=151 (sesuai petOrigin game)
COLS=7

def cut_rgba(rgb, soft=False):
    a=rgb.astype(np.float32); mn=a.min(axis=2)
    dark=ndi.binary_closing(mn<175,iterations=2)
    core=ndi.binary_fill_holes(dark)
    if not soft:
        white=mn>=238
        lab,_=ndi.label(white)
        b=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
        bg=np.isin(lab,list(b))
        core|=ndi.binary_erosion(~bg,iterations=3)
    core=ndi.binary_erosion(core,iterations=2)
    al=np.clip((255-mn-6)/249,0,1); al[al<0.03]=0
    al2=np.clip(al*2,0,1)
    with np.errstate(divide='ignore',invalid='ignore'):
        fg=255-(255-a)/np.maximum(al2,1e-3)[...,None]
    fg=np.clip(fg,0,255)
    out=np.where(core[...,None],a,fg)
    alpha=np.where(core,1.0,al2)
    # core terhubung ke dunia luar -> pastikan tepi core halus
    alpha=np.where(core,1.0,alpha)
    return np.dstack([out,alpha*255]).astype(np.uint8), core

def tight(rgba,thr=128):
    ys,xs=np.where(rgba[...,3]>thr)
    return xs.min(),ys.min(),xs.max()+1,ys.max()+1

# ---------- IDLE: grid 6x4 ----------
idle_im=np.array(Image.open(UP+'Tanah_evol3_idle.jpg').convert('RGB'))
H,W=idle_im.shape[:2]; cw,ch=W/6,H/4
idle=[]
for r in range(4):
    for c in range(6):
        x0,x1=int(round(c*cw)),int(round((c+1)*cw)); y0,y1=int(round(r*ch)),int(round((r+1)*ch))
        rg,_=cut_rgba(idle_im[y0:y1,x0:x1]); idle.append(rg)

# ---------- ATTACK: 22 frame, dipotong manual per baris ----------
att_im=np.array(Image.open(UP+'Tanah_evol3_attack.jpg').convert('RGB'))
rows=[(0,470,[(21,321),(370,640),(721,944),(1006,1266),(1322,1589),(1626,1882),(1916,2236),(2255,2562)]),
      (470,940,[(17,415),(448,759),(815,1262),(1262,1567),(1609,1883),(1906,2220),(2252,2565)]),
      (940,1438,[(37,373),(409,745),(780,1115),(1145,1489),(1530,1860),(1905,2233),(2259,2552)])]
SOFT={3,9,12,13,15}   # glow, debu, kilau, debu: alpha lembut
att=[];meta=[]
i=0
for ri,(y0,y1,segs) in enumerate(rows):
    for k,(a,b) in enumerate(segs):
        pad=14
        xa=max(0,a-pad) if not (ri==1 and k==3) else a      # jangan ambil frame tetangga
        xb=min(att_im.shape[1],b+pad) if not (ri==1 and k==2) else b
        crop=att_im[y0:y1,xa:xb]
        rg,_=cut_rgba(crop,soft=(i in SOFT)); att.append(rg); meta.append((ri,i)); i+=1
print('frame idle',len(idle),'attack',len(att))

# ---------- skala ----------
ib=[tight(f) for f in idle]
iw=np.mean([b[2]-b[0] for b in ib]); ih=np.mean([b[3]-b[1] for b in ib])
s_idle=BOX/max(iw,ih)
# samakan ukuran karakter attack dengan idle lewat pose berdiri di akhir (frame 20/21)
ab=tight(att[-1]); aw=ab[2]-ab[0]; ah=ab[3]-ab[1]
ratio=0.5*(iw/aw+ih/ah)
s_att=s_idle*ratio
print('idle bbox rata2',iw,ih,'s_idle',s_idle,'| attack stand',aw,ah,'s_att',s_att)

def place(rg,s,anchor_bottom_src=None,base_src=None,thr=128,cx_mode='bbox'):
    im=Image.fromarray(rg,'RGBA').convert('RGBa')
    nw,nh=max(1,int(round(im.width*s))),max(1,int(round(im.height*s)))
    im=im.resize((nw,nh),Image.LANCZOS).convert('RGBA')
    arr=np.array(im); bx0,by0,bx1,by1=tight(arr,100)
    cx=(bx0+bx1)/2
    if base_src is None: bottom=by1           # kaki = dasar bbox
    else: bottom=by1+(base_src-anchor_bottom_src)*s*0  # placeholder
    return im,(bx0,by0,bx1,by1)

def compose(im,bb,bottom_y=FEET,dy=0):
    # muat ke dalam frame: perkecil jika melebihi, lalu geser agar tidak terpotong
    arr=np.array(im); ys,xs=np.where(arr[...,3]>8)
    fx0,fy0,fx1,fy1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    w,h=fx1-fx0,fy1-fy0; M=2
    f=min(1.0,(FW-2*M)/w,(FH-2*M)/h)
    if f<1.0:
        im=im.convert('RGBa').resize((max(1,int(im.width*f)),max(1,int(im.height*f))),Image.LANCZOS).convert('RGBA')
        bb=tuple(v*f for v in bb)
        arr=np.array(im); ys,xs=np.where(arr[...,3]>8); fx0,fy0,fx1,fy1=xs.min(),ys.min(),xs.max()+1,ys.max()+1
    cx=(bb[0]+bb[2])/2; px=int(round(FW/2-cx)); py=int(round(bottom_y-bb[3]+dy))
    px=int(min(max(px,M-fx0),FW-M-fx1)); py=int(min(max(py,M-fy0),FH-M-fy1))
    cv=Image.new('RGBA',(FW,FH),(0,0,0,0))
    # tempel dengan pemotongan aman
    big=Image.new('RGBA',(FW+2*FW,FH+2*FH),(0,0,0,0)); big.alpha_composite(im,(px+FW,py+FH))
    return big.crop((FW,FH,2*FW,2*FH))

frames=[]
# idle: kaki rata
for rg in idle:
    im,bb=place(rg,s_idle); frames.append(compose(im,bb))
# attack: baseline per baris (posisi relatif sumber dipertahankan)
bots=[tight(f,128)[3] for f in att]
rowbase={}
for ri in range(3):
    idx=[j for j,(r,_) in enumerate(meta) if r==ri]
    rowbase[ri]=float(np.median([bots[j] for j in idx]))
for j,rg in enumerate(att):
    ri=meta[j][0]
    im,bb=place(rg,s_att)
    lift=(rowbase[ri]-bots[j])*s_att     # >0 = frame melayang di atas garis tanah
    frames.append(compose(im,bb,bottom_y=FEET,dy=-lift))
print('rowbase',rowbase,'bots',bots)

n=len(frames); rowsN=(n+COLS-1)//COLS
sheet=Image.new('RGBA',(COLS*FW,rowsN*FH),(0,0,0,0))
for k,f in enumerate(frames): sheet.paste(f,((k%COLS)*FW,(k//COLS)*FH))
sheet.save('/home/claude/work/pet_tanah3.webp','WEBP',quality=92,alpha_quality=100,method=6)
# pratinjau di latar gelap
bgc=Image.new('RGBA',sheet.size,(40,52,70,255)); bgc.alpha_composite(sheet); bgc.convert('RGB').save('/home/claude/work/preview.png')
print('sheet',sheet.size,'frames',n)
import json; json.dump({'idle':len(idle),'cast':len(att),'n':n},open('/home/claude/work/info.json','w'))
