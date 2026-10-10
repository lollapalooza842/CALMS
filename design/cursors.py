# Draws CALMS's pixel cursors (16x16 grids, shown at 32x32) as SVG and PNG.
from PIL import Image
OUT='frontend/assets/img/cursor/'  # run from the calms folder: python design/cursors.py
COL={'O':'#2A1C13','F':'#FFF3DA','B':'#D9A44E','S':'#B9873A','C':'#FFF3DA','W':'#2A1C13'}
ARROW=[
"O...............",
"OO..............",
"OFO.............",
"OFBO............",
"OFFBO...........",
"OFFFBO..........",
"OFFFFBO.........",
"OFFFFFBO........",
"OFFFFFFBO.......",
"OFFFFFOOOO......",
"OFFOFBO.........",
"OFO.OFBO........",
"OO..OFBO........",
"O....OFBO.......",
".....OFBO.......",
"......OO........"]
HAND=[
"....OO..........",
"...OFFO.........",
"...OFFO.........",
"...OFFO.........",
"...OFFOOO.......",
"...OFFOFFOOO....",
"...OFFOFFOFFOO..",
"OO.OFFOFFOFFOFO.",
"OFOOFFFFFFFFOFFO",
"OFFOFFFFFFFFFFFO",
".OFFFFFFFFFFFFFO",
"..OFFFFFFFFFFFFO",
"...OFFFFFFFFFFO.",
"....OBBBBBBBBO..",
"....OSSSSSSSSO..",
"....OOOOOOOOOO.."]
TEXT=[
"................",
"...CCCC.CCCC....",
"...CWWWCWWWC....",
"...CCCCWCCCC....",
"......CWC.......",
"......CWC.......",
"......CWC.......",
"......CWC.......",
"......CWC.......",
"......CWC.......",
"......CWC.......",
"......CWC.......",
"...CCCCWCCCC....",
"...CWWWCWWWC....",
"...CCCC.CCCC....",
"................"]
def svg(grid,name):
    rects=[]
    for y,row in enumerate(grid):
        for x,ch in enumerate(row):
            if ch in COL: rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{COL[ch]}"/>')
    open(OUT+name+'.svg','w').write('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16" shape-rendering="crispEdges">'+''.join(rects)+'</svg>\n')
    im=Image.new('RGBA',(16,16),(0,0,0,0))
    for y,row in enumerate(grid):
        for x,ch in enumerate(row):
            if ch in COL:
                h=COL[ch].lstrip('#'); im.putpixel((x,y),tuple(int(h[i:i+2],16) for i in (0,2,4))+(255,))
    im.resize((32,32),Image.NEAREST).save(OUT+name+'.png')
    return im
for i,(g,n) in enumerate([(ARROW,'arrow'),(HAND,'hand'),(TEXT,'text')]):
    svg(g,n)
