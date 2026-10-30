# Membangun spritesheet pet_angin2 (Burung Elang) dari angin_evol2_idle.png + angin_evol2_attack.png (PNG sudah transparan)
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
UP='/mnt/user-data/uploads/'; FW=FH=174; BOX=128; FEET=(FH+BOX)//2; COLS=7; M=2

def frames_of(name, bands, split=None):
    a=np.array(Image.open(UP+name).convert('RGBA'))
    m=a[...,3]>40
    lab,_=ndi.label(ndi.binary_dilation(m,iterations=3))
    comps=[]
    for i,s in enumerate(ndi.find_objects(lab)):
        if (lab[s]==i+1).sum()>4000: comps.append((i+1,s))
    out=[]  # (row, rgba_array, bottom_src_y, centroid_x_local)
    for r,(y0,y1) in enumerate(bands):
        row=[]
        for l,s in comps:
            if y0<=s[0].start<y1:
                row.append((s[1].start,l,s))
        row.sort()
        for x0,l,s in row:
            sub=a[s].copy(); mk=(lab[s]==l)
            pieces=[(sub,mk,s)]
            if split and (r,x0) in split:   # komponen menyatu: belah di lembah proyeksi
                cx=split[(r,x0)]
                pieces=[]
                for lo,hi in [(s[1].start,cx),(cx,s[1].stop)]:
                    mk2=mk.copy(); xs=np.arange(s[1].start,s[1].stop)
                    keep=(xs>=lo)&(xs<hi); mk2[:,~keep]=False
                    pieces.append((sub,mk2,s))
            for sb,mm,ss in pieces:
                q=sb.copy(); q[~mm,3]=0
                ys,xs=np.where(q[...,3]>40)
                x0_,x1_,y0_,y1_=xs.min(),xs.max()+1,ys.min(),ys.max()+1
                q=q[y0_:y1_,x0_:x1_]
                out.append(dict(row=r,img=q,bottom=ss[0].start+y1_,top=ss[0].start+y0_))
    return out

# cari lembah untuk komponen idle yang menyatu (baris 0, mulai x~713)
a=np.array(Image.open(UP+'angin_evol2_idle.png').convert('RGBA'))
prof=(a[0:800,:,3]>40).sum(axis=0)
seg=prof[900:1100]; cut=900+int(np.argmin(seg)); print('cut idle',cut,seg.min())
idle=frames_of('angin_evol2_idle.png',[(0,800),(800,1536)],split={(0,713):cut})
att=frames_of('angin_evol2_attack.png',[(0,520),(520,1020),(1020,1536)])
print('idle',len(idle),'attack',len(att))

def mass(f): return (f['img'][...,3]>128).sum()
# skala: muat frame terlebar/tertinggi; samakan ukuran idle & attack lewat pose serupa (idle baris2 terakhir vs attack terakhir)
ratio=np.sqrt(mass(idle[-1])/mass(att[-1])); print('rasio ukuran',ratio)
ratio=float(np.clip(ratio,0.85,1.15))
def scaled_dims(f,k): return f['img'].shape[1]*k, f['img'].shape[0]*k
rowref={}
for name,fs in (('i',idle),('a',att)):
    for r in set(f['row'] for f in fs):
        rowref[(name,r)]=float(np.median([f['bottom'] for f in fs if f['row']==r]))
# s dipilih agar semua frame muat: atas <= FEET-M, bawah <= FH-M, lebar <= FW-2M
def need(fs,name,k):
    s=1e9
    for f in fs:
        ref=rowref[(name,f['row'])]
        above=(ref-f['top'])*k; below=(f['bottom']-ref)*k; w=f['img'].shape[1]*k
        s=min(s,(FEET-M)/max(above,1e-6)*1, (FH-M-FEET)/max(below,1) if below>0 else 1e9, (FW-2*M)/w)
    return s
sI=need(idle,'i',1.0); sA=need(att,'a',ratio)
s_idle=min(sI,sA/ratio) if False else min(sI, sA*1.0)  # satu skala dasar untuk idle
s_base=min(sI,sA)           # skala idle (px output per px sumber)
s_att=s_base*ratio
print('s_base',s_base,'s_att',s_att)

def render(f,s,name):
    im=Image.fromarray(f['img'],'RGBA').convert('RGBa')
    nw,nh=max(1,round(im.width*s)),max(1,round(im.height*s))
    im=im.resize((nw,nh),Image.LANCZOS).convert('RGBA')
    ref=rowref[(name,f['row'])]
    # sumbu x: pusat massa alpha; sumbu y: layout sumber (baris acuan -> FEET)
    arr=np.array(im); ys,xs=np.where(arr[...,3]>40); w=arr[...,3].astype(float)
    cx=(w.sum(axis=0)*np.arange(arr.shape[1])).sum()/w.sum()
    px=int(round(FW/2-cx)); py=int(round(FEET-(ref-f['top'])*s))
    # geser/perkecil bila melebihi frame (margin M)
    fx0,fx1=xs.min(),xs.max()+1
    if fx1-fx0>FW-2*M:
        k=(FW-2*M)/(fx1-fx0); im=im.convert('RGBa').resize((max(1,round(im.width*k)),max(1,round(im.height*k))),Image.LANCZOS).convert('RGBA')
        arr=np.array(im); ys,xs=np.where(arr[...,3]>40); fx0,fx1=xs.min(),xs.max()+1
        w=arr[...,3].astype(float); cx=(w.sum(axis=0)*np.arange(arr.shape[1])).sum()/w.sum(); px=int(round(FW/2-cx))
    px=int(min(max(px,M-fx0),FW-M-fx1))
    big=Image.new('RGBA',(3*FW,3*FH),(0,0,0,0)); big.alpha_composite(im,(px+FW,py+FH))
    cv=big.crop((FW,FH,2*FW,2*FH)); a2=np.array(cv)
    ys,xs=np.where(a2[...,3]>8)
    clipped=(xs.min()<=0 or ys.min()<=0 or xs.max()>=FW-1 or ys.max()>=FH-1)
    return cv,clipped
frames=[];clip=[]
for f in idle: c,k=render(f,s_base,'i'); frames.append(c); clip.append(k)
for f in att: c,k=render(f,s_att,'a'); frames.append(c); clip.append(k)
print('frame terpotong:',[i for i,k in enumerate(clip) if k])
n=len(frames); rows=(n+COLS-1)//COLS
sheet=Image.new('RGBA',(COLS*FW,rows*FH),(0,0,0,0))
for k,f in enumerate(frames): sheet.paste(f,((k%COLS)*FW,(k//COLS)*FH))
sheet.save('/home/claude/work/pet_angin2.webp','WEBP',quality=92,alpha_quality=100,method=6)
for nm,col in (('dark',(40,52,70,255)),('light',(200,215,160,255))):
    bg=Image.new('RGBA',sheet.size,col); bg.alpha_composite(sheet); bg.convert('RGB').save(f'/home/claude/work/angin_{nm}.png')
print('sheet',sheet.size,'frames',n,'idle',len(idle),'cast',len(att))
