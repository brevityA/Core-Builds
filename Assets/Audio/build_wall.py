import math

def pts(seq): return " ".join(f"{x},{y}" for x,y in seq)

# ---- UNIFORM logo diamond: a square rotated 45deg, equal width & height ----
N=(256,166); E=(346,256); S=(256,346); W=(166,256)     # girdle (rotated square, official)
tN=(256,196); tE=(310,256); tS=(256,316); tW=(202,256) # table (inner rotated square)
culet=S
TABLE=pts([tN,tE,tS,tW])
GIRDLE=pts([N,E,S,W])
crown=[pts([[tN,tE,tS,tW][k], [tN,tE,tS,tW][(k+1)%4], [N,E,S,W][(k+1)%4], [N,E,S,W][k]]) for k in range(4)]
pav  =[pts([ [N,E,S,W][k], [N,E,S,W][(k+1)%4], culet]) for k in range(4)]

OUTER=pts([(256,64),(428,162),(428,350),(256,448),(84,350),(84,162)])
INNER=pts([(256,90),(400,172),(400,340),(256,418),(112,340),(112,172)])

crown_fill=["g_b1","g_b2","g_b3","g_b1"]
pav_fill  =["g_p1","g_p2","g_p3","g_p1"]

crown_svg="\n".join(
  f'<polygon points="{crown[k]}" fill="url(#{crown_fill[k]})" stroke="#eafdff" stroke-width="1.1" stroke-opacity=".8"/>'
  for k in range(4))
pav_svg="\n".join(
  f'<polygon points="{pav[k]}" fill="url(#{pav_fill[k]})" stroke="#ffffff" stroke-width="1.0" stroke-opacity=".55"/>'
  for k in range(4))
_tbl=[tN,tE,tS,tW]; _grd=[N,E,S,W]
facet_edges="\n".join(
  f'<line x1="{_tbl[k][0]}" y1="{_tbl[k][1]}" x2="{_grd[k][0]}" y2="{_grd[k][1]}" stroke="#eafdff" stroke-width="1.1" stroke-opacity=".7"/>'
  for k in range(4))

# One moving specular highlight (the key-light) — soft edge via gradient, NO blur filter
spec=f'''<ellipse class="gb" id="spec" cx="236" cy="208" rx="34" ry="44"
          fill="url(#specGrad)" opacity=".85" style="mix-blend-mode:screen"/>'''
spark_core=f'<circle cx="256" cy="256" r="26" fill="#ffffff" opacity=".12" filter="url(#soft2)"/>'
culet_tip=f'<circle cx="256" cy="356" r="12" fill="#ff6a3b" opacity=".8" filter="url(#soft2)"/>'
culet_glow=f'<circle cx="256" cy="360" r="20" fill="#c03a20" opacity=".4" filter="url(#soft2)"/>'

# Luminous halo: a large soft gradient (no blur filter -> fast & clean)
bloom=f'''
          <circle class="gb" id="bloom1" cx="256" cy="256" r="158" fill="url(#bloomGrad)"/>'''
# Soft volumetric god-rays (4 beams, unified color, moderate blur)
rays=f'''
          <g class="gb" id="rays" style="mix-blend-mode:screen" transform="translate(256,256)">
            <polygon points="0,0 -34,-300 0,-372 -34,-300" fill="url(#lg1)" opacity=".10" filter="url(#chromBlur)"/>
            <polygon points="0,0 34,-300 0,-372 34,-300" fill="#7eeeff" opacity=".06" filter="url(#chromBlur)"/>
            <polygon points="0,0 0,300 0,372 0,300" fill="url(#lgIrides)" opacity=".10" filter="url(#chromBlur)"/>
            <polygon points="0,0 -320,30 -372,0 -320,-30" fill="#a855f7" opacity=".075" filter="url(#chromBlur)"/>
          </g>'''

sheens="".join(f'<polygon points="{crown[k]}" fill="#ffffff" opacity="{o}"/>'
               for k,o in [(0,.20),(3,.16)])
table_sheen=f'<polygon points="{TABLE}" fill="#ffffff" opacity=".30"/>'

html=f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Core — Live Wallpaper (1080p)</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box;}}
  html,body{{width:100%;height:100%;overflow:hidden;background:#04070f;}}
  .stage{{position:fixed;inset:0;overflow:hidden;background:
    linear-gradient(180deg, #05070d 0%, #03050a 40%, #01030a 70%, #000206 100%);}}

  /* 5 faint, colored atmospheric fields bleeding brand light into the background */
  .nebula{{position:absolute;border-radius:50%;filter:blur(60px);mix-blend-mode:screen;opacity:.18;}}
  .neb-c  {{width:66vmax;height:66vmax;left:-16vmax;top:-18vmax;
            background:radial-gradient(circle, rgba(0,229,255,.14) 0%, rgba(0,212,255,.06) 38%, transparent 72%);}}
  .neb-v  {{width:62vmax;height:62vmax;right:-18vmax;bottom:-22vmax;
            background:radial-gradient(circle, rgba(168,85,247,.16) 0%, rgba(168,85,247,.07) 40%, transparent 72%);}}
  .neb-b  {{width:56vmax;height:56vmax;left:32%;top:40%;
            background:radial-gradient(circle, rgba(79,172,254,.12) 0%, rgba(79,172,254,.05) 42%, transparent 74%);}}
  .neb-m  {{width:52vmax;height:52vmax;right:-6vmax;top:-8vmax;
            background:radial-gradient(circle, rgba(232,58,154,.10) 0%, rgba(232,58,154,.04) 42%, transparent 74%);}}
  .neb-e  {{width:50vmax;height:50vmax;left:-10vmax;bottom:-10vmax;
            background:radial-gradient(circle, rgba(255,106,59,.09) 0%, rgba(255,106,59,.035) 42%, transparent 74%);}}

  .grid{{position:absolute;inset:-60%;
    background-image:linear-gradient(rgba(0,212,255,.010) 1px,transparent 1px),
                     linear-gradient(90deg,rgba(0,212,255,.010) 1px,transparent 1px);
    background-size:84px 84px;
    -webkit-mask-image:radial-gradient(circle at 50% 44%,#000 20%,transparent 62%);
    mask-image:radial-gradient(circle at 50% 44%,#000 20%,transparent 62%);}}

  .vignette{{position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(120% 105% at 50% 46%, transparent 52%, rgba(0,0,0,.55) 100%);}}

  .core-stage{{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);pointer-events:none;}}
  .core-svg{{width:470px;height:470px;overflow:visible;
    filter:drop-shadow(0 0 60px rgba(0,212,255,.28));}}

  .gb{{transform-box:fill-box;transform-origin:center;will-change:transform,opacity;}}
  .sweep{{position:absolute;left:50%;top:50%;width:116%;height:116%;
    transform:translate(-50%,-50%);
    background:conic-gradient(from 0deg,
      transparent 0deg, rgba(0,212,255,.05) 45deg, transparent 90deg,
      transparent 180deg, rgba(138,72,144,.04) 220deg, transparent 265deg);
    border-radius:50%;mix-blend-mode:screen;will-change:transform;}}

  .coreGlow{{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);
    width:min(108vmin,1080px);height:min(108vmin,1080px);border-radius:50%;
    background:
      radial-gradient(circle, rgba(255,255,255,.34) 0%, rgba(0,229,255,.17) 9%, rgba(0,229,255,0) 26%),
      radial-gradient(circle, rgba(0,212,255,.15) 0%, rgba(79,172,254,.09) 30%, rgba(168,85,247,.04) 55%, rgba(168,85,247,0) 66%),
      radial-gradient(circle, rgba(168,85,247,.08) 0%, rgba(232,58,154,.04) 40%, rgba(255,106,59,.02) 62%, rgba(255,106,59,0) 78%);
    mix-blend-mode:screen;pointer-events:none;will-change:transform,opacity;z-index:1;}}
  .floorLight{{position:absolute;left:50%;top:84%;width:min(74vmin,740px);height:min(22vmin,200px);
    transform:translate(-50%,-50%);
    background:radial-gradient(ellipse at 50% 0%, rgba(0,229,255,.14) 0%, rgba(79,172,254,.05) 45%, rgba(168,85,247,0) 74%);
    mix-blend-mode:screen;filter:blur(20px);pointer-events:none;will-change:transform,opacity;z-index:1;}}

  /* subtle background dust motes (GPU-friendly: transform/opacity only, no blur filter) */
  .dust{{position:absolute;border-radius:50%;will-change:transform,opacity;pointer-events:none;}}
  .d-c{{background:#c9f6ff;box-shadow:0 0 6px rgba(0,212,255,.7);}}
  .d-v{{background:#e6d6ff;box-shadow:0 0 6px rgba(168,85,247,.6);}}
</style>
</head>
<body>
  <div class="stage" id="stage">
    <div class="nebula neb-c" id="neb0"></div>
    <div class="nebula neb-v" id="neb1"></div>
    <div class="nebula neb-b" id="neb2"></div>
    <div class="nebula neb-m" id="neb3"></div>
    <div class="nebula neb-e" id="neb4"></div>
    <div class="grid" id="grid"></div>
    <canvas id="fxCanvas" style="position:absolute;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;mix-blend-mode:screen;"></canvas>
    <div id="dustLayer" style="position:absolute;inset:0;z-index:3;pointer-events:none;"></div>
    <div class="coreGlow" id="coreGlow"></div>
    <div class="floorLight" id="floorLight"></div>

    <div class="core-stage" id="coreStage">
      <div class="sweep" id="sweep"></div>
      <svg class="core-svg" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lg1" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0" stop-color="#00e5ff"/><stop offset="100" stop-color="#4facfe"/></linearGradient>
          <linearGradient id="lgD" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0" stop-color="#4facfe"/><stop offset=".35" stop-color="#22d3ff"/>
            <stop offset=".55" stop-color="#8a4890"/><stop offset=".8" stop-color="#e83a9a"/>
            <stop offset="1" stop-color="#c03a20"/></linearGradient>
          <linearGradient id="lgIrides" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0" stop-color="#00e5ff"/><stop offset=".3" stop-color="#4facfe"/>
            <stop offset=".5" stop-color="#a855f7"/><stop offset=".7" stop-color="#f472b6"/>
            <stop offset="1" stop-color="#ff6a3b"/></linearGradient>
          <radialGradient id="bloomGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#ffffff" stop-opacity=".85"/>
            <stop offset=".18" stop-color="#dffcff" stop-opacity=".55"/>
            <stop offset=".4" stop-color="#7eeeff" stop-opacity=".32"/>
            <stop offset=".62" stop-color="#a855f7" stop-opacity=".15"/>
            <stop offset=".82" stop-color="#4facfe" stop-opacity=".06"/>
            <stop offset="1" stop-color="#00d4ff" stop-opacity="0"/></radialGradient>
          <radialGradient id="specGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#ffffff" stop-opacity=".9"/>
            <stop offset=".5" stop-color="#dffcff" stop-opacity=".35"/>
            <stop offset="1" stop-color="#7eeeff" stop-opacity="0"/></radialGradient>
          <linearGradient id="g_b1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eafdff"/>
            <stop offset="1" stop-color="#22d3ff"/></linearGradient>
          <linearGradient id="g_b2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7eeeff"/>
            <stop offset="1" stop-color="#3f8fd0"/></linearGradient>
          <linearGradient id="g_b3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38bdf8"/>
            <stop offset="1" stop-color="#a855f7"/></linearGradient>
          <linearGradient id="g_p1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a855f7"/>
            <stop offset="1" stop-color="#e83a9a"/></linearGradient>
          <linearGradient id="g_p2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e83a9a"/>
            <stop offset="1" stop-color="#ff6a3b"/></linearGradient>
          <linearGradient id="g_p3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a3b"/>
            <stop offset="1" stop-color="#ff3a20"/></linearGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="7"/></filter>
          <filter id="soft2"><feGaussianBlur stdDeviation="4"/></filter>
          <filter id="chromBlur"><feGaussianBlur stdDeviation="6"/></filter>
        </defs>

        <!-- lit hex frame (hero) -->
        <g class="gb" id="frame">
          <polygon class="gb" id="frameGlowWide" points="{OUTER}" fill="none" stroke="#00e5ff"
                   stroke-width="50" stroke-linejoin="round" opacity=".14" filter="url(#soft)"/>
          <polygon class="gb" id="frameGlowMid" points="{OUTER}" fill="none" stroke="#00e5ff"
                   stroke-width="14" stroke-linejoin="round" opacity=".30" filter="url(#soft2)"/>
          <polygon class="gb" id="frameGlowCore" points="{OUTER}" fill="none" stroke="url(#lg1)"
                   stroke-width="12" stroke-linejoin="round" opacity=".98"/>
          <polygon points="{OUTER}" fill="none" stroke="#eafdff" stroke-width="3" stroke-linejoin="round" opacity=".95"/>
          <polygon points="{INNER}" fill="none" stroke="url(#lg1)" stroke-width="2.5" stroke-linejoin="round" opacity=".5"/>
          <polygon points="{INNER}" fill="none" stroke="#7eeeff" stroke-width="1.2" stroke-linejoin="round" opacity=".6"/>
        </g>

        <!-- logo diamond (hero) -->
        <g class="gb" id="bob">
          {rays}
          {bloom}
          <g class="gb" id="diamond">
            <polygon class="gb" id="dGlow" points="{GIRDLE}" fill="url(#lgD)" opacity=".35"/>
            {pav_svg}
            {crown_svg}
            {facet_edges}
            <polygon points="{TABLE}" fill="url(#g_b1)" stroke="#eafdff" stroke-width="1.4" stroke-opacity=".85"/>
            {table_sheen}
            {sheens}
            {spec}
            <polygon class="gb" id="sheen" points="{GIRDLE}" fill="url(#lgIrides)" opacity=".11" filter="url(#soft2)"/>
            <polygon class="gb" id="rim" points="{GIRDLE}" fill="none" stroke="url(#lgIrides)" stroke-width="2.2"
                     stroke-linejoin="round" opacity=".30" style="mix-blend-mode:screen" filter="url(#soft)"/>
            {spark_core}
            {culet_tip}
            {culet_glow}
          </g>
          <circle class="gb" id="ring1" cx="256" cy="256" r="140" fill="none" stroke="url(#lgIrides)" stroke-width="3.5"/>
          <circle class="gb" id="ring2" cx="256" cy="256" r="140" fill="none" stroke="url(#lgIrides)" stroke-width="3.5"/>
        </g>

      </svg>
    </div>
    <div class="vignette"></div>
  </div>

<script>
(function(){{
  var LOOP = 48;   // seconds, seamless
  var TAU = Math.PI*2;
  var stage = document.getElementById('stage');
  var el = {{}};
  ['neb0','neb1','neb2','neb3','neb4','coreGlow','floorLight','coreStage','grid','sweep','frame','frameGlowWide','frameGlowMid','frameGlowCore',
   'bob','diamond','dGlow','spec','sheen','rim','rays','bloom1','ring1','ring2'].forEach(function(id){{
     el[id]=document.getElementById(id);
  }});

  // ---- Unified easing tokens (consistent across the whole piece) ----
  function easeInOutSine(u){{ return 0.5-0.5*Math.cos(Math.PI*u); }}
  function easeOutQuart(u){{ var w=1-u; return 1-w*w*w*w; }}
  function easeInCubic(u){{ return u*u*u; }}
  // seamless full-cycle ease (returns to rest at u=0 and u=1)
  function ease(u){{ return u - (1/TAU)*Math.sin(TAU*u); }}

  var seed=42; function rnd(){{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }}

  var DW=document.documentElement.clientWidth, DH=document.documentElement.clientHeight;

  // ===== Subtle background dust motes (lightweight: ~36, transform/opacity only) =====
  var dust=[];
  var dcol=['d-c','d-v'];
  var dustLayer=document.getElementById('dustLayer');
  var DUST_N=36;
  for(var i=0;i<DUST_N;i++){{
    var d=document.createElement('div');
    d.className='dust '+dcol[i%2];
    var sz=1.2+rnd()*2.2;
    d.style.width=sz+'px'; d.style.height=sz+'px';
    d.style.left=(rnd()*100)+'%'; d.style.top=(rnd()*100)+'%';
    dustLayer.appendChild(d);
    dust.push({{el:d, ox:rnd()*100, oy:rnd()*100, ph:rnd()*LOOP,
               ax:14+rnd()*22, ay:10+rnd()*18, r:sz}});
  }}

  // ===== Canvas particle stream (single coherent, deterministic trail) =====
  var canvas=document.getElementById('fxCanvas');
  canvas.width=DW; canvas.height=DH;
  var ctx=canvas.getContext('2d');
  var coreX=DW/2, coreY=DH*0.46;
  var pcol=[[0,229,255],[79,172,254],[168,85,247]];   // unified cyan/blue/violet
  var gradCache={{}};
  function radialFor(cc,radius){{
    var key=cc.join(',')+'|'+radius;
    if(gradCache[key]) return gradCache[key];
    var g=ctx.createRadialGradient(0,0,0,0,0,radius);
    g.addColorStop(0,'rgba('+cc[0]+','+cc[1]+','+cc[2]+',1)');
    g.addColorStop(1,'rgba('+cc[0]+','+cc[1]+','+cc[2]+',0)');
    gradCache[key]=g;
    return g;
  }}

  // even-spaced beams (deterministic, not random)
  var emitters=[];
  var BEAMS=8, PER_BEAM=6, PLIFE=3.2;
  for(var b=0;b<BEAMS;b++){{
    var ang=(b/BEAMS)*TAU;
    var col=pcol[b % pcol.length];
    for(var k=0;k<PER_BEAM;k++){{
      var birth=((k/PER_BEAM)+(b%2)*0.12)*LOOP;
      var sp2=1.4+(b%3)*0.35;
      var sz=1.5+((b+k)%3)*0.5;
      emitters.push({{birth:birth, ang:ang, speed:sp2, col:col, sz:sz}});
    }}
  }}

  function ambientLevel(t){{
    var swell=0.6+0.4*Math.sin(Math.PI*(t/LOOP));
    var drift=0.5+0.5*Math.sin(TAU*t/8+0.7);
    return (0.6*swell + 0.4*drift);
  }}

  function drawParticles(t){{
    ctx.clearRect(0,0,DW,DH);
    ctx.globalCompositeOperation='lighter';
    var cx=coreX, cy=coreY;
    var ml=ambientLevel(t);
    for(var i=0;i<emitters.length;i++){{
      var p=emitters[i];
      var agew=((((t - p.birth) % LOOP)+LOOP)%LOOP);
      if(agew > PLIFE) continue;
      var life=agew/PLIFE;
      var fade=Math.sin(Math.PI*life);
      var dist=p.speed*agew*50;
      var x=cx+Math.cos(p.ang)*dist;
      var y=cy+Math.sin(p.ang)*dist;
      var r=p.sz*(1+life*1.6);
      var a=fade*0.5*ml;
      var cc=p.col;
      var g=ctx.createRadialGradient(x,y,0,x,y,r*3);
      g.addColorStop(0,'rgba('+cc[0]+','+cc[1]+','+cc[2]+','+a+')');
      g.addColorStop(1,'rgba('+cc[0]+','+cc[1]+','+cc[2]+',0)');
      ctx.fillStyle=g;
      ctx.beginPath(); ctx.arc(x,y,r*3,0,TAU); ctx.fill();
      var px=cx+Math.cos(p.ang)*(dist- r*6);
      var py=cy+Math.sin(p.ang)*(dist- r*6);
      var grad=ctx.createLinearGradient(px,py,x,y);
      grad.addColorStop(0,'rgba('+cc[0]+','+cc[1]+','+cc[2]+',0)');
      grad.addColorStop(1,'rgba('+cc[0]+','+cc[1]+','+cc[2]+','+a*0.6+')');
      ctx.strokeStyle=grad; ctx.lineWidth=r*0.9; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(x,y); ctx.stroke();
    }}
    ctx.globalCompositeOperation='source-over';
  }}

  function ring(elg,t,off){{
    var P=8;
    var u=(((t-off)%P)+P)%P/P;
    var w=Math.sin(Math.PI*u);
    elg.style.transform='scale('+(0.6+1.0*w)+')';
    elg.style.opacity=(0.5*w).toFixed(3);
  }}

  // ring "flare" envelope: peaks right as each ring fades OUT (u->1)
  // (rings at off 0 and 6, both period 8 -> flare fires at t=8,14,16,22,24,...)
  function smoothstep(a,b,x){{
    var s=Math.max(0,Math.min(1,(x-a)/(b-a)));
    return s*s*(3-2*s);
  }}
  function ringFlare(t){{
    var P=8;
    function env(off){{
      var u=(((t-off)%P)+P)%P/P;
      // A flare that peaks at u~0.85 and returns to 0 by u=1.0, so it never
      // straddles the ring's reset point (keeps the 48s loop seamless).
      if(u<0.68 || u>1.0) return 0;
      return Math.sin(Math.PI*(u-0.68)/0.32);   // 0@0.68 -> 1@0.84 -> 0@1.0
    }}
    return Math.max(env(0), env(6));
  }}

  // ---- Beat grid constants (120 BPM: 0.5s beat, downbeat at 0.375+4k) ----
  var DOWN=0.375, BEAT=4.0;
  function beatPhase(t){{ return TAU*(t-DOWN)/BEAT; }}   // peaks at every downbeat

  var pos = function(t){{
    var u=t/LOOP;

    // DVD-standby corner sweep (hero): whole icon glides TL->BR->TR->BL->TL over 24s
    var cxm=640, cym=230;
    var corners=[[-cxm,-cym],[+cxm,+cym],[+cxm,-cym],[-cxm,+cym]];
    var p=(t/LOOP)*4;
    var seg=Math.floor(p)%4;
    var su=p-Math.floor(p);
    var eu=su*su*(3-2*su);
    var A=corners[seg], B=corners[(seg+1)%4];
    var dx=A[0]+(B[0]-A[0])*eu;
    var dy=A[1]+(B[1]-A[1])*eu;
    el.coreStage.style.transform='translate(-50%,-50%) translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px)';
    coreX = DW/2 + dx;
    coreY = DH*0.46 + dy;

    // unified light-source pulse, peaking on each downbeat
    var lightPulse = 1 + 0.07*Math.cos(beatPhase(t));
    var gs=1+0.05*Math.sin(TAU*t/8+0.3);
    var go=0.7+0.28*Math.sin(TAU*t/8+0.3);
    el.coreGlow.style.transform='translate(-50%,-50%) translate('+dx.toFixed(1)+'px,'+dy.toFixed(1)+'px) scale('+(gs*lightPulse).toFixed(4)+')';
    el.coreGlow.style.opacity=(go*lightPulse).toFixed(3);
    el.floorLight.style.transform='translate(-50%,-50%) translate('+(dx*0.72).toFixed(1)+'px,'+(26+dy*0.45).toFixed(1)+'px)';
    el.floorLight.style.opacity=(0.6*lightPulse).toFixed(3);

    // colored background fields breathe with the beat-locked light, and
    // FLARE as the rings expand & fade out (ringFlare peaks at ring fade)
    // (periods 16/24/48 all divide 48 -> seamless at the wrap)
    var fl = ringFlare(t);
    for(var nb=0; nb<5; nb++){{
      var np=[24,48,16,24,48][nb];
      var nbPulse = 1 + 0.18*Math.sin(TAU*t/np + nb*1.3) * (0.5+0.5*lightPulse);
      // base nebula presence
      var base=0.10+0.05*nbPulse;
      // flare: a clear burst as a ring fades out (bright + swells outward)
      var flareAmt=0.48*fl*(0.8+0.2*Math.sin(nb*2.1));
      el['neb'+nb].style.opacity=Math.min(0.70, base+flareAmt).toFixed(3);
      el['neb'+nb].style.transform='scale('+((1+0.03*Math.sin(TAU*t/np + nb*0.9)) + 0.55*fl).toFixed(4)+')';
    }}

    // unified eased rotation for the ambient rotation systems
    var ea = ease(u)*360;
    el.sweep.style.transform='translate(-50%,-50%) rotate('+ ea.toFixed(2) +'deg)';
    el.rays.style.transform='translate(256,256) rotate('+ ea.toFixed(2) +'deg)';
    el.rays.style.opacity=((0.6+0.2*Math.sin(TAU*t/6+0.2))*lightPulse).toFixed(3);

    // grid: barely breathing, no drift
    el.grid.style.transform='rotate('+(1.2*Math.sin(TAU*u))+')scale(1.01)';

    // --- beat-locked spin: extremes land exactly on downbeats ---
    var frameR = 3*Math.sin(TAU*t/24 + 0.4);
    var breathe = 0.84 + 0.16*Math.sin(TAU*t/8 + 0.6);
    var bpa = beatPhase(t);
    var spinA = 34*Math.cos(bpa);     // hexagon: max at each downbeat
    var spinB = -27*Math.cos(bpa);    // diamond: opposite, locked to same beats
    el.frame.style.transform='rotate('+(frameR + spinA).toFixed(2)+'deg)';
    el.frameGlowWide.style.opacity=(0.10+0.04*breathe).toFixed(3);
    el.frameGlowMid.style.opacity=(0.22+0.08*breathe).toFixed(3);
    el.frameGlowCore.style.opacity=(0.90+0.08*breathe).toFixed(3);

    // diamond: gentle scale pulse + counter-rotation
    var pulse = 1 + 0.015*Math.sin(TAU*t/6 + 0.3);
    el.diamond.style.transform='scale('+pulse.toFixed(4)+') rotate('+spinB.toFixed(2)+'deg)';

    // diamond glow
    var glowScale = 1+0.10*(0.5-0.5*Math.cos(TAU*t/6+0.8));
    var glowO = 0.40+0.22*(0.5-0.5*Math.sin(TAU*t/6+0.8));
    el.dGlow.style.transform='scale('+glowScale.toFixed(4)+')';
    el.dGlow.style.opacity=glowO.toFixed(3);

    // halo breathes with light
    el.bloom1.style.transform='scale('+((1+0.14*Math.sin(TAU*t/6+0.3))*lightPulse).toFixed(4)+')';
    el.bloom1.style.opacity=((0.55+0.2*Math.sin(TAU*t/6+0.3))*lightPulse).toFixed(3);

    // fresnel rim
    el.rim.style.opacity=((0.26+0.10*Math.sin(TAU*t/6+0.4))*lightPulse).toFixed(3);
    el.rim.style.transform='scale('+((1+0.05*Math.sin(TAU*t/6+0.3))*lightPulse).toFixed(4)+')';

    // iridescent sheen sweeps across facets with eased motion
    el.sheen.style.transform='rotate('+ ea.toFixed(2) +'deg)';
    el.sheen.style.opacity=(0.11+0.08*Math.sin(TAU*t/6+0.4)).toFixed(3);

    // --- single orbiting key-light (the one specular accent) ---
    var keyAng = TAU*t/12 + 0.6;          // 12s orbit, divides 48 => seamless
    var keyR = 46, keyY = 34;
    el.spec.setAttribute('cx', (256 + keyR*Math.cos(keyAng)).toFixed(1));
    el.spec.setAttribute('cy', (256 + keyY*Math.sin(keyAng)).toFixed(1));
    el.spec.style.opacity=((0.55+0.20*lightPulse)).toFixed(3);
    el.spec.style.transform='scale('+(1+0.08*Math.sin(keyAng*2)).toFixed(4)+')';

    ring(el.ring1, t, 0);
    ring(el.ring2, t, 6);

    // subtle dust drift (slow, two-tone, seamless over LOOP)
    for(var i=0;i<dust.length;i++){{
      var d=dust[i];
      var P=[12,16,24][i%3];              // all divide 48 -> seamless at the wrap
      var tp=(t + d.ph) % P;
      var x=d.ox + d.ax*Math.sin(TAU*tp/P) + (d.ax*0.25)*Math.sin(TAU*tp/3 + d.ph*2);
      var y=d.oy + d.ay*Math.cos(TAU*tp/P*2) + (d.ay*0.25)*Math.cos(TAU*tp/3 + d.ph*3);
      var v=Math.sin(TAU*tp/P + d.ph*5);
      var o=0.10+0.30*v*v;                 // subtle: peak opacity ~0.4
      d.el.style.transform='translate('+(x-d.ox)+'px,'+(y-d.oy)+'px)';
      d.el.style.opacity=o.toFixed(3);
    }}

    drawParticles(t);
  }};

  window.__capture = false;
  var start=null; var base=0;
  function frame(ts){{
    if(start==null)start=ts;
    base=(ts-start)/1000;
    if(!window.__capture) pos(base % LOOP);
    requestAnimationFrame(frame);
  }}
  requestAnimationFrame(frame);

  window.__render = function(t){{ pos(t % LOOP); }};
  window.__loop = LOOP;
}})();
</script>
</body>
</html>
"""
open('core-wallpaper.html','w').write(html)
print("HTML written,", len(html), "bytes")
