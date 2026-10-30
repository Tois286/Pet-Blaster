# Membangun spritesheet pet_angin3 (Garuda) dari angin_evol3_idle.png + angin_evol3_attack.png (PNG sudah transparan)
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
UP='/mnt/user-data/uploads/'; FW=FH=174; BOX=128; FEET=(FH+BOX)//2; COLS=7; M=2
ROWCUTS=[450,800,1100]   # batas baris berdasarkan titik pusat y (tata letak sumber tidak rata)

def frames_of(name, cuts):
    a=np.array(Image.open(UP+name).convert('RGBA'))
    m=a[...,3]>40
    lab,n=ndi.label(ndi.binary_dilation(m,iterations=3))
    objs=ndi.find_objects(lab)
    area=ndi.sum(np.ones_like(lab),lab,range(1,n+1))
    big=[i+1 for i in range(n) if area[i]>4000]
    # komponen kecil (kilau, serpihan) -> gabung ke frame besar terdekat
    cen={l:ndi.center_of_mass(lab==l) for l in range(1,n+1) if area[l-1]>60}
    owner={l:l for l in big}
    for l in cen:
        if l in owner: continue
        d=min(big,key=lambda b:np.hypot(cen[b][0]-cen[l][0],cen[b][1]-cen[l][1])); owner[l]=d
    out=[]
    for b in big:
        mk=np.isin(lab,[l for l,o in owner.items() if o==b])
        ys,xs=np.where(mk); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        q=a[y0:y1,x0:x1].copy(); q[~mk[y0:y1,x0:x1],3]=0
        al=q[...,3].astype(float); ww=al.sum()
        cy=(al.sum(axis=1)*np.arange(q.shape[0])).sum()/ww; cx=(al.sum(axis=0)*np.arange(q.shape[1])).sum()/ww
        row=int(np.searchsorted(cuts,y0+cy))
        out.append(dict(img=q,row=row,gx=x0+cx,cx=cx,cy=cy,h=q.shape[0],w=q.shape[1]))
    out.sort(key=lambda f:(f['row'],f['gx']))
    return out
idle=frames_of('angin_evol3_idle.png',ROWCUTS); att=frames_of('angin_evol3_attack.png',[500,1000])
print('idle',len(idle),[f['row'] for f in idle]); print('attack',len(att),[f['row'] for f in att])

mass=lambda f:(f['img'][...,3]>128).sum()
ratio=float(np.clip(np.sqrt(mass(idle[0])/mass(att[0])),0.85,1.15)); print('rasio',ratio)
def fit(fs,k):
    # skala maksimum agar semua frame muat (lebar dan tinggi total terhadap titik pusat)
    return min((FW-2*M)/(f['w']*k) for f in fs), min((FH-2*M)/((f['h'])*k) for f in fs)
s_base=min(*fit(idle,1.0),*fit(att,ratio)); s_att=s_base*ratio
# posisi y titik pusat: kaki median ke FEET, dibatasi agar semua frame muat
def ycent(fs,s):
    lo=max((M+f['cy']*s) for f in fs); hi=min((FH-M-(f['h']-f['cy'])*s) for f in fs)
    return lo,hi
loI,hiI=ycent(idle,s_base); loA,hiA=ycent(att,s_att)
lo,hi=max(loI,loA),min(hiI,hiA); print('rentang yc',lo,hi)
yc=min(max(FEET-np.median([(f['h']-f['cy']) for f in idle])*s_base,lo),hi) if lo<=hi else (lo+hi)/2
print('s_base',s_base,'s_att',s_att,'yc',yc)

def render(f,s):
    im=Image.fromarray(f['img'],'RGBA').convert('RGBa')
    im=im.resize((max(1,round(im.width*s)),max(1,round(im.height*s))),Image.LANCZOS).convert('RGBA')
    px=int(round(FW/2-f['cx']*s)); py=int(round(yc-f['cy']*s))
    arr=np.array(im); ys,xs=np.where(arr[...,3]>8)
    px=int(min(max(px,M-xs.min()),FW-M-xs.max()-1)); py=int(min(max(py,M-ys.min()),FH-M-ys.max()-1))
    big=Image.new('RGBA',(3*FW,3*FH),(0,0,0,0)); big.alpha_composite(im,(px+FW,py+FH))
    return big.crop((FW,FH,2*FW,2*FH))
frames=[render(f,s_base) for f in idle]+[render(f,s_att) for f in att]
n=len(frames); rows=(n+COLS-1)//COLS
sheet=Image.new('RGBA',(COLS*FW,rows*FH),(0,0,0,0))
for k,f in enumerate(frames): sheet.paste(f,((k%COLS)*FW,(k//COLS)*FH))
sheet.save('/home/claude/work/pet_angin3.webp','WEBP',quality=92,alpha_quality=100,method=6)
for nm,col in (('dark',(40,52,70,255)),('light',(200,215,160,255))):
    bg=Image.new('RGBA',sheet.size,col); bg.alpha_composite(sheet); bg.convert('RGB').save(f'/home/claude/work/angin3_{nm}.png')
print('sheet',sheet.size,'frames',n,'idle',len(idle),'cast',len(att))
