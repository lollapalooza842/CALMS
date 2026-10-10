from PIL import Image, ImageDraw, ImageOps
import json, os
# which hat he wears: cowboy (the usual), sheriff, bowler or sombrero. KUWA_HAT=sheriff python3 kuwa.py, or run kuwa_hats.py for all
HAT=os.environ.get('KUWA_HAT','cowboy'); SFX='' if HAT=='cowboy' else '-'+HAT
h=lambda s:(int(s[1:3],16),int(s[3:5],16),int(s[5:7],16),255)
OL=h('#24130a'); HD=h('#3f2414'); HM=h('#5e3a1f'); HL=h('#7a4e2a')
BD=h('#6b4423'); BM=h('#8f6033'); BL=h('#ad7a44'); WD=h('#4a2b17'); WM=h('#5f3a1e')
TN=h('#c98f4a'); TD=h('#9a6a30'); C=h('#f3ddb0'); CD=h('#dcbf88')
A=h('#f0a81e'); AD=h('#c47a12'); K=h('#1a120c'); W=h('#fff6dc')
R=h('#b4362c'); RD=h('#7e221c'); RL=h('#cf5444')
S=96
# He is drawn a little smaller than his 96 x 96 cell (FIT, about his feet), so the brim of his hat and his wing tips
# keep a clear edge instead of running into the side of the cell and being cut off there.
FIT=float(os.environ.get('KUWA_FIT','0.85'))
def T(x,y): return (48+(x-48)*FIT, 96-(96-y)*FIT)
class Pen:
    """ImageDraw, with every coordinate passed through T()."""
    def __init__(s,im): s.d=ImageDraw.Draw(im)
    def _pts(s,pts): return [T(x,y) for x,y in pts]
    def _box(s,b): a=T(b[0],b[1]); c=T(b[2],b[3]); return [a[0],a[1],c[0],c[1]]
    def ellipse(s,b,**k): s.d.ellipse(s._box(b),**k)
    def rectangle(s,b,**k): s.d.rectangle(s._box(b),**k)
    def chord(s,b,a0,a1,**k): s.d.chord(s._box(b),a0,a1,**k)
    def arc(s,b,a0,a1,**k): s.d.arc(s._box(b),a0,a1,**k)
    def pieslice(s,b,a0,a1,**k): s.d.pieslice(s._box(b),a0,a1,**k)
    def polygon(s,pts,**k): s.d.polygon(s._pts(pts),**k)
    def line(s,pts,**k): s.d.line(s._pts(pts),**k)
    def point(s,xy,c=None,**k): s.d.point(T(*xy),c,**k)
class Cv:
    def __init__(s):
        s.im=Image.new('RGBA',(S,S),(0,0,0,0)); s.d=Pen(s.im)
    def E(s,box,f,ol=None,dy=0): s.d.ellipse([box[0],box[1]+dy,box[2],box[3]+dy],fill=f,outline=ol)
    def P(s,pts,f,ol=None,dy=0): s.d.polygon([(x,y+dy) for x,y in pts],fill=f,outline=ol)
    def L(s,pts,f,w=1,dy=0): s.d.line([(x,y+dy) for x,y in pts],fill=f,width=w)
    def pt(s,x,y,c): s.d.point((x,y),c)
    def outline(s):
        px=s.im.load(); add=[]
        for y in range(S):
            for x in range(S):
                if px[x,y][3]==0:
                    for ax,ay in ((1,0),(-1,0),(0,1),(0,-1)):
                        X,Y=x+ax,y+ay
                        if 0<=X<S and 0<=Y<S and px[X,Y][3]!=0: add.append((x,y)); break
        for x,y in add: px[x,y]=OL
mx=lambda pts:[(96-x,y) for x,y in pts]
def star5(c,cx,cy,r,f,dy):
    import math
    pts=[(cx+(r if k%2==0 else r*.45)*math.sin(k*math.pi/5),cy-(r if k%2==0 else r*.45)*math.cos(k*math.pi/5)) for k in range(10)]
    c.P(pts,f,OL,dy)
def hat(c,t,star=48,band=True):
    if HAT=='sheriff': return hat_sheriff(c,t,star)
    if HAT=='bowler': return hat_bowler(c,t,star)
    if HAT=='sombrero': return hat_sombrero(c,t,star)
    hat_cowboy(c,t,star)
def hat_sheriff(c,t,star):
    D,M,L_=h('#1f1a18'),h('#332c28'),h('#4c443e'); SV,SVD=h('#c8c8d0'),h('#8a8a94')
    c.E((1,16,95,35),D,OL,t); c.E((4,16,92,30),M,None,t); c.E((12,17,84,27),L_,None,t)
    c.P([(1,26),(0,18),(5,15),(10,22)],D,OL,t); c.P([(95,26),(96,18),(91,15),(86,22)],D,OL,t)
    c.P([(26,25),(29,5),(37,0),(48,4),(59,0),(67,5),(70,25),(60,28),(36,28)],M,OL,t)
    c.P([(50,5),(59,1),(66,6),(69,25),(60,27),(56,27)],D,None,t); c.P([(31,8),(37,3),(43,5),(35,11)],L_,None,t)
    c.P([(26,25),(27,19),(48,22),(69,19),(70,25),(60,28),(36,28)],SV,OL,t); c.L([(28,24),(48,27),(68,24)],SVD,1,t)
    if star is not None: star5(c,star,13,9,A,t); c.pt(star,13+t,W); c.pt(star-1,12+t,W)
def hat_bowler(c,t,star):
    D,M,L_=h('#1c1716'),h('#2e2826'),h('#4a423e'); B,BD_=h('#7e221c'),h('#5a1612')
    c.E((14,21,82,34),D,OL,t); c.E((17,21,79,30),M,None,t)
    c.P([(14,28),(11,22),(17,24)],D,OL,t); c.P([(82,28),(85,22),(79,24)],D,OL,t)
    c.d.chord([26,0+t,70,40+t],180,360,fill=M,outline=OL); c.d.rectangle([27,19+t,69,26+t],fill=M)
    c.d.chord([31,3+t,52,30+t],200,300,fill=L_)
    c.P([(26,20),(70,20),(70,26),(26,26)],B,OL,t); c.L([(27,25),(69,25)],BD_,1,t)
    if star is not None: c.E((star+10,21,star+14,25),h('#c98f4a'),OL,t)
def hat_sombrero(c,t,star):
    S_,SM,SD=h('#e8c274'),h('#c99a44'),h('#9a7030'); RR,GG=h('#b4362c'),h('#3f7a3a')
    c.E((-2,17,98,39),SD,OL,t); c.E((0,17,96,35),S_,None,t); c.E((10,19,86,31),SM,None,t)
    c.P([(-2,30),(-2,20),(4,17),(8,26)],SD,OL,t); c.P([(98,30),(98,20),(92,17),(88,26)],SD,OL,t)
    for k,x in enumerate(range(6,92,9)): c.pt(x,33+t+(k%2),RR); c.pt(x+1,33+t+(k%2),RR)
    c.P([(33,27),(38,6),(44,1),(52,1),(58,6),(63,27),(56,30),(40,30)],S_,OL,t)
    c.P([(50,2),(57,6),(62,26),(56,29),(53,29)],SM,None,t); c.P([(39,9),(43,4),(46,5),(41,14)],h('#f6dca0'),None,t)
    zz=[(34,22),(38,26),(42,22),(46,26),(50,22),(54,26),(58,22),(62,26)]
    c.P([(34,20),(62,20),(63,27),(33,27)],GG,OL,t); c.L(zz,RR,2,t)
def hat_cowboy(c,t,star=48):
    c.E((3,17,93,35),HD,OL,t); c.E((6,17,90,30),HM,None,t); c.E((14,18,82,27),HL,None,t)
    c.P([(3,26),(1,20),(6,17),(10,22)],HD,OL,t); c.P([(93,26),(95,20),(90,17),(86,22)],HD,OL,t)
    c.P([(27,25),(30,7),(38,2),(48,6),(58,2),(66,7),(69,25),(60,28),(36,28)],HM,OL,t)
    c.P([(50,7),(58,3),(65,8),(68,25),(60,27),(56,27)],HD,None,t)
    c.P([(32,9),(38,4),(44,6),(36,12)],HL,None,t)
    c.P([(27,25),(28,19),(48,22),(68,19),(69,25),(60,28),(36,28)],TN,OL,t)
    c.L([(29,24),(48,27),(67,24)],TD,1,t)
    if star is not None:
        sx=star-48
        c.E((43+sx,17,53+sx,27),A,OL,t)
        for (x,y) in [(48,19),(47,21),(48,21),(49,21),(45,22),(46,22),(47,22),(48,22),(49,22),(50,22),(51,22),(47,23),(48,23),(49,23),(46,24),(47,24),(49,24),(50,24)]: c.pt(x+sx,y+t,W)
def extras(c,extra):
    if extra=='bang':
        c.P([(84,38),(91,38),(89,54),(86,54)],R,OL); c.E((84,57,90,63),R,OL)
    def z(x,y,s): c.L([(x,y),(x+s,y),(x,y+s),(x+s,y+s)],HD,2)
    if extra in('z1','z2'): z(76,6,6)
    if extra=='z2': z(84,2,8) if False else z(86,-8+8,7)
    if extra and extra.startswith('dot'):
        n=int(extra[3])
        for i,(x,y,r) in enumerate([(80,12,2),(86,7,2),(91,2,3)][:n]): c.E((x-r,y-r+1,x+r,y+r+1),HD,OL)
FLY={'U':[(28,54),(16,44),(6,28),(1,30),(3,44),(9,52),(8,56),(16,60),(27,66)],
     'M':[(28,54),(12,50),(1,53),(2,59),(8,60),(7,64),(14,65),(15,68),(27,67)],
     'D':[(28,54),(16,58),(6,72),(5,82),(10,80),(12,84),(17,78),(20,80),(27,67)]}
FLYL={'U':[[(24,54),(8,36)],[(24,58),(8,48)]],'M':[[(24,56),(6,56)],[(24,60),(10,61)]],'D':[[(24,58),(9,76)],[(25,62),(15,78)]]}
_l=lambda A,B:[((a[0]+b[0])/2,(a[1]+b[1])/2) for a,b in zip(A,B)]
FLY['a']=_l(FLY['U'],FLY['M']); FLY['b']=_l(FLY['M'],FLY['D'])
FLYL['a']=[_l(x,y) for x,y in zip(FLYL['U'],FLYL['M'])]; FLYL['b']=[_l(x,y) for x,y in zip(FLYL['M'],FLYL['D'])]
def front(hdy=0,bob=0,gy=0,hatd=0,eyes='open',look=(0,0),brow=0,wing='down',feet='stand',sf=0,puff=0,extra=None):
    c=Cv(); o=hdy+bob+gy; b=bob+gy; t=o+hatd
    # feet
    if feet=='stand':
        for cx in (38,58):
            for k in (-5,0,5): c.P([(cx+k-2,86),(cx+k+2,86),(cx+k+2,91),(cx+k-2,91)],A,AD)
    elif feet=='tuck':
        for cx in (40,56):
            for k in (-3,0,3): c.P([(cx+k-1,86),(cx+k+1,86),(cx+k+1,92),(cx+k-1,92)],A,AD,b)
    if wing[:3]=='fly':
        k=wing[3]
        for m in (False,True):
            pts=FLY[k]; c.P(mx(pts) if m else pts,WD,OL,b)
            for ln in FLYL[k]: c.L(mx(ln) if m else ln,WM,1,b)
    # body
    c.E((22-puff,44,74+puff,89),BD,None,b); c.E((22-puff,43,71+puff,86),BM,None,b)
    nearw=4 if sf>0 else 0
    if wing[:3]!='fly':
        c.E((14-puff,52,32+nearw,84),WD,OL,b); c.L([(20,60),(19,76)],WM,1,b); c.L([(25,60),(24,79)],WM,1,b)
        if wing=='down':
            c.E((64+nearw,52,82+puff,84),WD,OL,b); c.L([(76,60),(77,76)],WM,1,b)
            if not nearw: c.L([(71,60),(72,79)],WM,1,b)
        elif wing=='up':
            c.P([(66,62),(74,58),(86,38+o-b),(90,30+o-b),(84,29+o-b),(78,40+o-b),(68,52)],WD,OL,b); c.L([(72,56),(84,36+o-b)],WM,1,b)
    # belly
    bs=sf*5//7
    c.E((33+bs,62,63+bs,89),CD,None,b); c.E((33+bs,61,62+bs,87),C,None,b)
    for (x,y) in [(41,74),(48,72),(55,74),(44,80),(52,80),(48,85)]:
        c.L([(x-2+bs,y),(x+bs,y+2),(x+2+bs,y)],TN,1,b)
    # head
    c.E((19,24,77,65),BD,None,o); c.E((19,23,74,62),BM,None,o); c.E((24,26,50,40),BL,None,o)
    # bandana
    ps=sf
    c.P([(22,58),(74,58),(76,64),(60+ps,70),(48+ps,84),(36+ps,70),(20,64)],R,OL,b)
    c.P([(22,58),(74,58),(75,61),(21,61)],RL,None,b)
    c.L([(36+ps,69),(48+ps,82),(60+ps,69)],RD,1,b); c.L([(42+ps,64),(48+ps,74)],RD,1,b); c.L([(54+ps,64),(48+ps,74)],RD,1,b)
    for (x,y) in [(30,65),(40+ps,67),(56+ps,67),(66,65),(48+ps,77)]: c.pt(x,y+b,C)
    c.P([(22,60),(12,63),(6,72),(12,70),(16,76),(20,66)],R,OL,b); c.L([(20,62),(12,69)],RD,1,b)
    c.E((18,57,26,65),RD,OL,b)
    # face
    bx=48+sf+(1 if sf else 0)                 # beak centre
    far=2 if sf else 0
    dl=(25+sf//2,31,bx,56); dr=(bx,31,71+ (3 if sf else 0)-far,56)
    for box in (dl,dr):
        c.E(box,CD,None,o); c.E((box[0]+1,box[1]+2,box[2]-1,box[3]),C,None,o)
    lx,ly=look
    ecs=[((dl[0]+dl[2])//2+1,8),((dr[0]+dr[2])//2,8-far-(1 if sf else 0))]
    for cx,rx in ecs:
        if eyes in('open','half'):
            c.E((cx-rx,37,cx+rx,53),AD,OL,o); c.E((cx-rx+2,39,cx+rx-2,51),A,None,o)
            py=ly+(2 if eyes=='half' else 0)
            c.E((cx-3+lx,42+py,cx+3+lx,48+py),K,None,o)
            c.d.rectangle([cx-3+lx,42+py+o,cx-2+lx,43+py+o],fill=W)
            if eyes=='half':
                c.d.chord([cx-rx,37+o,cx+rx,53+o],180,360,fill=BM,outline=OL); c.L([(cx-rx,45),(cx+rx,45)],OL,1,o)
        else:
            c.E((cx-rx,37,cx+rx,53),BM,OL,o); c.L([(cx-rx+1,47),(cx+rx-1,47)],OL,2,o); c.L([(cx-rx+3,50),(cx+rx-3,50)],BD,1,o)
    bd=brow; lo=dl[0]-3; ro=dr[2]+3
    c.P([(lo,29+bd),(lo+8,29+bd),(bx-1,39+bd),(bx-1,45+bd),(bx-8,43+bd),(lo,35+bd)],HD,OL,o)
    c.P([(ro,29+bd),(ro-8,29+bd),(bx+1,39+bd),(bx+1,45+bd),(bx+8,43+bd),(ro,35+bd)],HD,OL,o)
    c.L([(lo+2,31+bd),(bx-4,41+bd)],HM,1,o); c.L([(ro-2,31+bd),(bx+4,41+bd)],HM,1,o)
    q=bx-48
    c.P([(44+q,45),(52+q,45),(54+q,52),(49+q,61),(47+q,61),(42+q,52)],TN,OL,o)
    c.P([(48+q,52),(53+q,52),(49+q,60),(48+q,60)],TD,None,o); c.L([(46+q,47),(46+q,51)],C,1,o)
    if wing=='chin':
        c.P([(72,74),(80,64),(76,56),(62+q,57),(52+q,60),(52+q,65),(62+q,66),(66,72)],WD,OL,o); c.L([(74,62),(58+q,62)],WM,1,o)
    hat(c,t,star=48+sf+(3 if sf else 0))
    c.outline(); extras(c,extra); return c.im
SW={'rest':None,
    'U':[(40,60),(34,40),(22,20),(18,26),(24,34),(20,36),(28,46),(26,50),(52,60)],
    'M':[(38,56),(16,50),(3,54),(6,60),(14,60),(14,65),(24,65),(26,69),(54,62)],
    'D':[(38,58),(30,74),(26,93),(32,90),(36,94),(40,86),(44,88),(48,74),(54,60)]}
def side(bob=0,gy=0,wing='rest',feet='stand',eyes='open'):
    c=Cv(); b=bob+gy; o=b
    if feet=='stand':
        for cx in (44,58): c.P([(cx-3,86),(cx+8,86),(cx+8,91),(cx-3,91)],A,AD); c.L([(cx+2,87),(cx+2,90)],AD,1)
    else:
        c.P([(34,84),(46,86),(44,91),(32,89)],A,AD,b)
    c.P([(30,72),(12,84),(10,90),(18,90),(22,93),(36,84)],WD,OL,b); c.L([(28,78),(16,88)],WM,1,b)
    c.E((26,44,72,89),BD,None,b); c.E((26,43,70,86),BM,None,b)
    c.E((54,62,72,88),CD,None,b); c.E((55,62,71,86),C,None,b)
    for (x,y) in [(63,72),(66,78),(62,82)]: c.L([(x-2,y),(x,y+2),(x+2,y)],TN,1,b)
    c.E((22,24,74,65),BD,None,o); c.E((22,23,72,62),BM,None,o); c.E((26,26,48,40),BL,None,o)
    if wing=='rest':
        c.E((30,54,56,87),WD,OL,b); c.L([(38,62),(40,82)],WM,1,b); c.L([(45,62),(47,84)],WM,1,b)
    c.P([(26,57),(72,57),(73,63),(66,68),(63,80),(56,67),(25,63)],R,OL,b)
    c.P([(26,57),(72,57),(72,60),(25,60)],RL,None,b); c.L([(57,66),(63,78)],RD,1,b)
    for (x,y) in [(36,62),(48,63),(62,70)]: c.pt(x,y+b,C)
    c.P([(27,59),(16,62),(9,72),(15,70),(18,78),(24,66)],R,OL,b); c.L([(24,62),(15,69)],RD,1,b)
    c.E((21,56,29,64),RD,OL,b)
    c.E((46,31,74,56),CD,None,o); c.E((47,33,73,56),C,None,o)
    cx=62
    if eyes=='open':
        c.E((cx-7,37,cx+7,53),AD,OL,o); c.E((cx-5,39,cx+5,51),A,None,o); c.E((cx-1,42,cx+5,48),K,None,o)
        c.d.rectangle([cx-1,42+o,cx,43+o],fill=W)
    else:
        c.E((cx-7,37,cx+7,53),BM,OL,o); c.L([(cx-6,47),(cx+6,47)],OL,2,o)
    c.P([(44,30),(53,29),(73,40),(73,46),(65,44),(44,36)],HD,OL,o); c.L([(46,32),(70,42)],HM,1,o)
    c.P([(70,44),(79,47),(82,52),(78,60),(75,60),(71,55)],TN,OL,o); c.P([(76,53),(81,53),(78,59),(76,59)],TD,None,o)
    if wing!='rest':
        c.P(SW[wing],WD,OL,b)
        a,bb=SW[wing][0],SW[wing][2]; c.L([(a[0]+6,a[1]),( (a[0]+bb[0])//2+4,(a[1]+bb[1])//2)],WM,1,b)
    hat(c,o,star=None)
    c.E((66,18,74,27),A,OL,o); c.pt(70,22+o,W); c.pt(69,22+o,W); c.pt(70,21+o,W); c.pt(70,23+o,W); c.pt(71,22+o,W)
    c.outline(); return c.im
def back(bob=0):
    c=Cv(); b=bob; o=b
    for cx in (40,56): c.P([(cx-3,87),(cx+3,87),(cx+3,91),(cx-3,91)],A,AD)
    c.P([(40,82),(56,82),(55,93),(48,95),(41,93)],WD,OL,b); c.L([(45,84),(45,92)],WM,1,b); c.L([(51,84),(51,92)],WM,1,b)
    c.E((22,44,74,89),BD,None,b); c.E((22,43,71,86),BM,None,b)
    c.E((15,50,47,87),WD,OL,b); c.E((49,50,81,87),WD,OL,b)
    for x in (24,31,38): c.L([(x,60),(x+3,80)],WM,1,b)
    for x in (72,65,58): c.L([(x,60),(x-3,80)],WM,1,b)
    c.E((19,24,77,65),BD,None,o); c.E((19,23,74,62),BM,None,o); c.E((24,26,50,40),BL,None,o)
    for (x,y) in [(34,44),(48,42),(62,44),(41,50),(55,50),(48,55)]: c.L([(x-3,y),(x,y+3),(x+3,y)],BD,1,o)
    c.P([(22,58),(74,58),(76,64),(48,67),(20,64)],R,OL,b); c.P([(22,58),(74,58),(75,61),(21,61)],RL,None,b)
    c.P([(46,64),(36,80),(43,77),(46,82),(49,67)],R,OL,b); c.P([(50,64),(60,80),(53,77),(51,82),(48,67)],R,OL,b)
    c.E((43,58,53,68),RD,OL,b)
    hat(c,o,star=None)
    c.outline(); return c.im
F=front
flip=ImageOps.mirror
tags=[
 ('idle',[(F(),1800),(F(bob=1),700),(F(),1200),(F(eyes='closed'),110)]),
 ('think',[(F(wing='chin',look=(-2,-2)),600),(F(wing='chin',look=(-2,-2),extra='dot1'),350),(F(wing='chin',look=(-2,-2),extra='dot2'),350),(F(wing='chin',look=(-2,-2),extra='dot3'),700),(F(wing='chin',brow=2,extra='dot3'),600)]),
 ('rest',[(F(gy=4,puff=2,eyes='half',hatd=2,feet='none'),1500),(F(gy=4,bob=1,puff=3,eyes='half',hatd=2,feet='none'),1500),(F(gy=4,puff=2,eyes='half',hatd=2,feet='none'),1000),(F(gy=4,puff=2,eyes='closed',hatd=2,feet='none'),350)]),
 ('sleep',[(F(eyes='closed',hatd=13,hdy=2),900),(F(eyes='closed',hatd=13,hdy=3,bob=1,extra='z1'),900),(F(eyes='closed',hatd=13,hdy=3,bob=1,extra='z2'),900)]),
 ('approve',[(F(hdy=2),120),(F(),100),(F(wing='up'),120),(F(wing='up',hatd=-4),380),(F(wing='up'),120),(F(),500)]),
 ('alert',[(F(hdy=2),80),(F(brow=2,hdy=-2,extra='bang'),500),(F(brow=2),300)]),
 ('look',[(F(look=(-2,0)),100),(F(look=(2,0)),100),(F(look=(0,-2)),100),(F(look=(0,2)),100)]),
 ('fly',[(F(gy=-2,wing='flyU',feet='tuck'),110),(F(gy=-4,wing='flyM',feet='tuck'),90),(F(gy=-6,wing='flyD',feet='tuck'),130),(F(gy=-4,wing='flyM',feet='tuck'),90)]),
 ('fly-side',[(side(gy=-2,wing='U',feet='tuck'),110),(side(gy=-4,wing='M',feet='tuck'),90),(side(gy=-6,wing='D',feet='tuck'),130),(side(gy=-4,wing='M',feet='tuck'),90)]),
 ('turn',[(F(),400),(F(sf=7),400),(side(),400),(back(),400),(flip(side()),400),(flip(F(sf=7)),400)]),
 ('fly8',[(F(gy=g,wing='fly'+k,feet='tuck'),55) for k,g in [('U',-2),('a',-3),('M',-4),('b',-5),('D',-6),('b',-5),('M',-4),('a',-3)]]),
 ('bank',[(flip(F(sf=7,gy=g,wing='fly'+k,feet='tuck')),80) for k,g in [('U',-2),('M',-4),('D',-6),('M',-4)]]),
 ('gust',[(F(brow=2,wing='fly'+k),60) for k in ['U','a','M','b','D','b','M','a']]),
]
frames=[];meta=[];i=0
for name,fs in tags:
    a=i
    for im,dur in fs: frames.append((im,dur)); i+=1
    meta.append({"name":name,"from":a,"to":i-1,"direction":"forward"})
n=len(frames); COLS=8; rows=(n+COLS-1)//COLS
sheet=Image.new('RGBA',(S*COLS,S*rows),(0,0,0,0))
pos=[((k%COLS)*S,(k//COLS)*S) for k in range(n)]
for k,(im,dur) in enumerate(frames): sheet.paste(im,pos[k])
sheet.save('kuwa.png' if not SFX else os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','frontend','assets','img','kuwa'+SFX+'.png'),optimize=True)
if SFX: raise SystemExit
js={"frames":[{"filename":f"kuwa {k}.aseprite","frame":{"x":pos[k][0],"y":pos[k][1],"w":S,"h":S},"rotated":False,"trimmed":False,"spriteSourceSize":{"x":0,"y":0,"w":S,"h":S},"sourceSize":{"w":S,"h":S},"duration":dur} for k,(im,dur) in enumerate(frames)],
"meta":{"app":"https://www.aseprite.org/","image":"kuwa.png","format":"RGBA8888","size":{"w":S*COLS,"h":S*rows},"scale":"1","frameTags":meta}}
json.dump(js,open('kuwa.json','w'),indent=1)
sc=2
pv=Image.new('RGBA',(sheet.width*sc,sheet.height*sc),(0xf4,0xee,0xdf,255))
big=sheet.resize(pv.size,Image.NEAREST); pv.paste(big,(0,0),big); pv.save('kuwa_preview.png')
print(n,[(m['name'],m['from'],m['to']) for m in meta])
