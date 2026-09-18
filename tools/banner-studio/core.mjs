/**
 * Banner Studio core logic — the single source of truth for the inline
 * `<script id="core">` fence in index.html.
 *
 * Banner Studio ships as ONE self-contained HTML file: it renders entirely
 * client-side and a saved copy must work from disk. That rules out
 * `<script type="module" src="core.mjs">` — `file://` module loads are blocked
 * by CORS, and module scope is not global scope, while the classic script that
 * follows the fence reads these symbols as globals (and the markup carries an
 * inline onclick handler that can only resolve against globals).
 *
 * So the fence is GENERATED from this file by scripts/sync-core.mjs, which CI
 * runs with --check. Edit here, never in the fence. Every export is a plain
 * `export const` / `export function`, so stripping the keyword is
 * semantics-preserving.
 *
 * Provenance: the bulk of this file is Banner Studio v3.1's own inline logic,
 * lifted verbatim from the fence rather than retyped — including the canvas
 * presets, the Custom brand, the seven gradient/blur DEF keys and the 17-key
 * sanitize() clamp table, all of which postdate the original extraction.
 * sanitize() parses shared links and localStorage, so a changed clamp bound
 * would silently corrupt saved designs; it is carried across unmodified.
 */
/* localStorage-safe polyfill: sandboxed iframes & storage-blocked browsers throw on
   any access; fall back to an in-memory store so the tool still boots & works. */
let _lsMem={};try{const __p='__cb_probe';localStorage.setItem(__p,'1');localStorage.removeItem(__p)}catch(e){try{Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>Object.prototype.hasOwnProperty.call(_lsMem,k)?_lsMem[k]:null,setItem:(k,v)=>{_lsMem[k]=String(v)},removeItem:k=>{delete _lsMem[k]},clear:()=>{_lsMem={}}}})}catch(e2){}}

// ── Reference measurements (source: the 700×444 Crave banner, component analysis) ──
// crave mark bbox x55–311 y200–250 → left margin 0.0786W · width 0.3657W · optical center 0.5068H
// Card cascade: 450×675 @1800×1200, start (0.859W, 0.1733H), step (−0.0511W, +0.1942H), tilt 14°, corner 0.0533·cardW.
// Clear-space rule follows common brand-guide practice for all-caps logotypes: ≥ 0.5× mark height on every side.
export const PRESETS={ref:[1800,1200,'Ref 3:2 (1800×1200)','catalog'],web169:[1920,1080,'Web 16:9 1920×1080','tv'],tv:[3840,2160,'TV 4K 16:9','tv'],uw:[2560,1080,'Ultrawide 21:9','tv'],xh:[1500,500,'X header 3:1','web'],yt:[2560,1440,'YouTube banner 16:9','web'],social:[1080,1350,'Social 4:5','social'],square:[1080,1080,'Square 1:1','social'],story:[1080,1920,'Story 9:16','social'],custom:[1920,1080,'Custom size…','custom']};
export const BRANDS={
 netflix:{label:'Netflix',accent:'#E50914',tint:'#E50914',bg:'#141414',logo:{mode:'vector',text:'NETFLIX'}},
 max:{label:'Max',accent:'#FFFFFF',tint:'#8f6bff',bg:'#12101c',logo:{mode:'text',text:'max',fam:'sys',weight:800,tracking:0.0}},
 disney:{label:'Disney+ ◦',accent:'#5B8DEF',tint:'#3f77ff',bg:'#0a1026',logo:{mode:'text',text:'DISNEY+',fam:'script',weight:700,tracking:0.02}},
 prime:{label:'Prime Video',accent:'#00A8E1',tint:'#00A8E1',bg:'#0f1720',logo:{mode:'text',text:'prime video',fam:'sys',weight:700,tracking:0.012}},
 paramount:{label:'Paramount+',accent:'#0064FF',tint:'#0064FF',bg:'#0a0d1a',logo:{mode:'text',text:'PARAMOUNT+',fam:'sys',weight:800,tracking:0.06}},
 hulu:{label:'hulu',accent:'#1CE783',tint:'#1CE783',bg:'#0b1410',logo:{mode:'text',text:'hulu',fam:'sys',weight:800,tracking:0.012}},
 apple:{label:'Apple TV+',accent:'#FFFFFF',tint:'#aeb6c4',bg:'#101114',logo:{mode:'text',text:'Apple TV+',fam:'sys',weight:600,tracking:0.012}},
 peacock:{label:'Peacock ◦',accent:'#FFFFFF',tint:'#7A3BFF',bg:'#150f22',logo:{mode:'text',text:'PEACOCK',fam:'sys',weight:800,tracking:0.08}},
 crave:{label:'Crave ◦',accent:'#A98ADB',tint:'#7F59BA',bg:'#14101d',logo:{mode:'text',text:'crave',fam:'sys',weight:800,tracking:0.025}},
 tubi:{label:'Tubi',accent:'#FFFFFF',tint:'#FFC832',bg:'#1a1508',logo:{mode:'text',text:'tubi',fam:'sys',weight:800,tracking:0.02}},
 crunchyroll:{label:'Crunchyroll',accent:'#F47521',tint:'#F47521',bg:'#16100a',logo:{mode:'text',text:'crunchyroll',fam:'sys',weight:800,tracking:0.0}},
 mgm:{label:'MGM+',accent:'#C9A227',tint:'#C9A227',bg:'#14120a',logo:{mode:'text',text:'MGM+',fam:'sys',weight:800,tracking:0.05}},
 starz:{label:'STARZ',accent:'#F7B500',tint:'#F7B500',bg:'#14100a',logo:{mode:'text',text:'STARZ',fam:'sys',weight:800,tracking:0.12}},
 amc:{label:'AMC+',accent:'#E5271B',tint:'#E5271B',bg:'#160e0d',logo:{mode:'text',text:'AMC+',fam:'sys',weight:800,tracking:0.05}},
 britbox:{label:'BritBox',accent:'#3D9BFF',tint:'#3D9BFF',bg:'#0b1119',logo:{mode:'text',text:'BritBox',fam:'sys',weight:800,tracking:0.02}},
 plex:{label:'Plex',accent:'#E5A00D',tint:'#E5A00D',bg:'#14110a',logo:{mode:'text',text:'Plex',fam:'sys',weight:800,tracking:0.0}},
 roku:{label:'Roku Channel',accent:'#FFFFFF',tint:'#7C3AED',bg:'#130f1e',logo:{mode:'text',text:'ROKU',fam:'sys',weight:800,tracking:0.08}},
 custom:{label:'Custom ◦',accent:'#00d4ff',tint:'#7C3AED',bg:'#0d1017',logo:{mode:'text',text:'YOUR BRAND',fam:'sys',weight:800,tracking:0.05}},
};
export const brandLabel=k=>k==='custom'?(typeof st==='object'&&st.customLabel?st.customLabel:'Custom'):BRANDS[k].label;

export const DEF={cardSize:0.25,rot:14,spreadY:0.1942,driftX:0.0511,radius:0.0533,glow:0.05,vignette:0.55,
  logoL:0.0786,logoW:0.3657,logoCY:0.5068,snap:true,maxCards:8,bgHex:'#1e2126',frame:12,kicker:'',pill:'',pillColor:null,pillPos:'tr',
  bgBlur:0,gradType:'radial',gradAngle:0,gradSpread:0.62,fillCount:6,customW:1920,customH:1080,customLabel:''};
export function layout(W,H,c,n){
  const cw=c.cardSize*W,ch=cw*1.5;
  return {cw,ch,W,H,x0:0.859*W,y0:(0.5-(n-1)*c.spreadY/2+0.1588)*H,
    stepY:c.spreadY*H,stepX:-c.driftX*W,
    rot:c.rot*Math.PI/180,rad:c.radius*cw,
    logo:{L:c.logoL*W,W:c.logoW*W,cy:c.logoCY*H}};
}
// collision-aware width cap using the mark's TRUE height/width ratio:
// clearance = 0.5×mark height (brand-guide rule), solved jointly with width.
export function maxLogoWidth(W,H,c,n,r){
  const L=layout(W,H,c,n);
  const cos=Math.abs(Math.cos(L.rot)),sin=Math.abs(Math.sin(L.rot));
  const ex=(L.cw/2)*cos+(L.ch/2)*sin, ey=(L.cw/2)*sin+(L.ch/2)*cos;
  const lx=L.logo.L;
  let w=0.55*W;
  for(let pass=0;pass<2;pass++){
    const clr=0.5*r*w;
    let cap=0.55*W;
    for(let i=0;i<n;i++){
      const cx=L.x0+i*L.stepX, cy=L.y0+i*L.stepY;
      if(Math.abs(cy-L.logo.cy)<ey+clr) cap=Math.min(cap,(cx-ex-clr-lx)/(1+0.5*r));
    }
    if(Math.abs(cap-w)<0.5){w=cap;break}
    w=cap;
  }
  return Math.max(0.12*W,w);
}
// browser canvas limits: keep exports inside ~16.7M px & 8192 side (iOS-safe)
export function reduceScale(w,h,s){
  for(let k=s;k>=1;k--){
    const W=w*k,H=h*k;
    if(W<=8192&&H<=8192&&W*H<=1.6e7) return {scale:k,reduced:k!==s};
  }
  return {scale:1,reduced:s>1};
}
export function fitCrop(sw,sh,tw,th){const ar=tw/th;let w=sw,h=sw/ar;if(h>sh){h=sh;w=sh*ar}return{sx:(sw-w)/2,sy:(sh-h)/2,sw:w,sh:h}}
export function hexRgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const v=parseInt(h,16);return[(v>>16)&255,(v>>8)&255,v&255]}
export function rgba(h,a){const[r,g,b]=hexRgb(h);return`rgba(${r},${g},${b},${a})`}
export function mix(h1,h2,t){const a=hexRgb(h1),b=hexRgb(h2);const m=a.map((x,i)=>Math.round(x+(b[i]-x)*t));return'#'+m.map(x=>x.toString(16).padStart(2,'0')).join('')}
export function rgbHex(r,g,b){return'#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')}
export function relLum(h){const c=hexRgb(h).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
export function contrast(h1,h2){const a=relLum(h1),b=relLum(h2);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
export function fnv(s){let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return x>>>0}
export function clamp(v,a,b,fb){v=+v;return Number.isFinite(v)?Math.min(b,Math.max(a,v)):fb}
export function sanitize(s){const o={...DEF};
  // Normalise rather than bail out. The early `return o` here handed back a
  // bare DEF, which carries no brand, preset or cards — so sanitize(null).cards
  // was undefined and any caller mapping over it threw. Feeding {} through the
  // same path yields the documented defaults for every key.
  if(!s||typeof s!=='object')s={};
  for(const k of['cardSize','rot','spreadY','driftX','radius','glow','vignette','logoL','logoW','logoCY','maxCards','bgBlur','gradAngle','gradSpread','fillCount','customW','customH'])
    o[k]=clamp(s[k],{rot:-24,spreadY:.1,maxCards:1,gradSpread:.1,fillCount:3,customW:320,customH:320}[k]??0,{cardSize:.34,rot:24,spreadY:.3,driftX:.1,radius:.09,glow:.16,vignette:1,logoL:.4,logoW:.55,logoCY:.9,maxCards:8,bgBlur:20,gradAngle:360,gradSpread:1,fillCount:8,customW:8192,customH:8192}[k]??999,DEF[k]);
  o.brand=BRANDS[s.brand]?s.brand:'netflix';o.preset=PRESETS[s.preset]?s.preset:'ref';
  // Per-brand background is the whole point of BS-P0-03: carrying `bg` on the
  // brand does nothing unless an unset background actually picks it up. An
  // explicit choice still wins, and every saved spec carries bgHex, so shared
  // links and stored designs are unaffected.
  o.bgHex=/^#[0-9a-fA-F]{6}$/.test(s.bgHex||'')?s.bgHex:(BRANDS[o.brand].bg||DEF.bgHex);
  o.fmt=s.fmt==='jpeg'?'jpeg':'png';o.scale=[1,2,3].includes(+s.scale)?+s.scale:1;
  o.mtype=['show','movie','mix'].includes(s.mtype)?s.mtype:'mix';
  o.guides=!!s.guides;o.snap=s.snap!==false;o.autoFill=s.autoFill!==false;
  o.accentOverride=/^#[0-9a-fA-F]{6}$/.test(s.accentOverride||'')?s.accentOverride:null;
  o.logoText=typeof s.logoText==='string'?s.logoText.slice(0,24):'';
  o.customLabel=typeof s.customLabel==='string'?s.customLabel.slice(0,24):'';
  o.gradType=['radial','linear'].includes(s.gradType)?s.gradType:'radial';
  o.cards=Array.isArray(s.cards)?s.cards.slice(0,o.maxCards||8).filter(c=>c&&typeof c.n==='string').map(c=>({n:c.n.slice(0,60),o:(c.o||'').startsWith('http')?c.o:'',m:(c.m||'').startsWith('http')?c.m:'',url:(c.url||'').startsWith('data:')||(c.url||'').startsWith('http')?c.url:'',type:c.type==='movie'?'movie':'show',hot:!!c.hot,dx:clamp(c.dx,-.5,.5,0),dy:clamp(c.dy,-.5,.5,0)})):[];
  o.kicker=typeof s.kicker==='string'?s.kicker.slice(0,30):'';
  o.pill=typeof s.pill==='string'?s.pill.slice(0,30):'';
  o.pillColor=/^#[0-9a-fA-F]{6}$/.test(s.pillColor||'')?s.pillColor:null;
  o.pillPos=['tl','tr','bl','br'].includes(s.pillPos)?s.pillPos:'tr';
  return o}

/* ── robustness layer v2.1 ─────────────────────────────── */
export const APP_VERSION='2.3.0';
export const SPEC_V=1, RING_MAX=50, CAPS={specBytes:1e6, logoBytes:3e6, hashChars:60000};
export function makeSpec(st){
  const sp={v:SPEC_V};
  for(const k of['brand','preset','fmt','scale','mtype','guides','snap','autoFill','trendingFirst',
    'cardSize','rot','spreadY','driftX','radius','glow','vignette','logoL','logoW','logoCY','maxCards',
    'bgHex','logoText','kicker','pill','pillColor','pillPos','bgBlur','gradType','gradAngle','gradSpread',
    'fillCount','customW','customH','customLabel'])if(st[k]!==undefined)sp[k]=st[k];
  if(st.accentOverride)sp.accentOverride=st.accentOverride;
  if(st.tintOverride)sp.tintOverride=st.tintOverride;
  sp.cards=(st.cards||[]).map(c=>{const e={n:c.n,o:c.o||'',m:c.m||'',type:c.type||'show',hot:!!c.hot,url:(c.url&&(c.url.startsWith('http')||c.url.startsWith('data:')))?c.url:''};if(c.dx)e.dx=c.dx;if(c.dy)e.dy=c.dy;return e});
  if(st._logoUrl&&st._logoUrl.startsWith('data:')&&st._logoUrl.length<60000)sp.customLogo=st._logoUrl;
  if(st._bgUrl&&st._bgUrl.startsWith('data:')&&st._bgUrl.length<60000)sp.customBg=st._bgUrl;
  return sp}
export function encSpec(sp){try{
  const j=JSON.stringify(sp), b=btoa(unescape(encodeURIComponent(j)));
  return 'b'+b.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}catch(e){return null}}
export function decSpec(s){
  if(typeof s!=='string'||s[0]!=='b')return null;
  const b64=s.slice(1).replace(/-/g,'+').replace(/_/g,'/');
  if(b64.length>CAPS.hashChars)return {__tooBig:1};
  try{const o=JSON.parse(decodeURIComponent(escape(atob(b64))));
    if(!o||typeof o!=='object'||o.v!==SPEC_V)return null;
    return o}catch(e){return null}}
export function ringAdd(arr,ent){const a=Array.isArray(arr)?arr.slice():[];
  a.push({t:Date.now(),kind:String(ent&&ent.kind||'info').slice(0,20),msg:String(ent&&ent.msg||'').slice(0,300)});
  while(a.length>RING_MAX)a.shift();return a}
/* one-click full-start kits (validated by preset-contract tests) */
export const READY={
  ref:{name:'Reference banner',desc:'Measured from the source artwork — exact anchors',
       spec:{brand:'netflix',preset:'ref',trendingFirst:true,snap:true,guides:false}},
  tv:{name:'TV wall · 4K',desc:'Max line-up sized for a living-room preview',
      spec:{brand:'max',preset:'tv',trendingFirst:true,guides:false}},
  social:{name:'Social 4:5 · Disney+',desc:'Movies-first set for the feed',
      spec:{brand:'disney',preset:'social',mtype:'movie',trendingFirst:true}},
  story:{name:'Story 9:16 · hulu',desc:'Vertical take with green-on-dark wordmark',
      spec:{brand:'hulu',preset:'story',trendingFirst:true}}
};

/* ── Audit additions (BS-P0-01/02/03, BS-P1-04/05/06) ────────────────────────
   Everything above this line is Banner Studio v3.1's own logic, carried over
   byte-for-byte apart from three P0 edits: per-brand `bg`, the Disney+ accent,
   and DEF.vignette. What follows is new and has no v3.1 counterpart. */

/** Minimum logo/background contrast before the tool flags the pairing. */
export const CONTRAST_MIN = 2.25;

/**
 * How much the clear-space clamp must actually move the mark before we tell
 * the user about it, as a fraction of canvas width.
 *
 * Was a flat 0.5 PIXELS, which fired on the shipped default: at 1800×1200 with
 * six cards the clamp trims 658.3px → 657.3px, i.e. 1.0px out of 658 (0.15%).
 * Nothing visibly moves, but the banner reported "width clamped for
 * clear-space" on first load (audit BS-P0-02). 0.0015·W is ~2.7px at 1800px
 * wide — below that the clamp is real but imperceptible, so saying so is noise.
 */
export const CLAMP_REPORT_EPSILON = 0.0015;

/**
 * Should the UI report the clear-space clamp?
 *
 * Separated from the clamp itself so the geometry stays exact while the
 * *reporting* threshold is perceptual.
 */
export function clampIsReportable(requestedW, actualW, canvasW) {
  return (requestedW - actualW) > CLAMP_REPORT_EPSILON * canvasW;
}

/**
 * Turn a measured ratio into pass/fail plus an actionable remedy.
 *
 * The old UI printed the number and, on failure, a bare "use white mark"
 * button — no explanation of why, and no alternative (audit BS-P0-01).
 * Callers render `advice` and offer `remedy` as a one-tap fix.
 */
export function contrastVerdict(ratio, { accent, bg } = {}) {
  const pass = ratio >= CONTRAST_MIN;
  if (pass) {
    return { pass, level: ratio >= 4.5 ? 'strong' : 'ok', ratio, advice: 'Mark is legible on this background.', remedy: null };
  }
  // Pick whichever of white/black actually recovers the most contrast.
  //
  // This always yields a passing remedy, and that is a theorem rather than a
  // hope. For any background luminance L in [0,1], white gives (1.05)/(L+0.05)
  // and black gives (L+0.05)/0.05; the two are equal at L = sqrt(1.05*0.05) −
  // 0.05, where both equal sqrt(1.05/0.05) ≈ 4.583. That is the global minimum
  // of max(white, black), so the best of the two can never drop below 4.58:1 —
  // comfortably above CONTRAST_MIN. tests/core.test.mjs pins this by brute
  // force over the RGB cube.
  //
  // An earlier draft carried a third `{ kind: 'background' }` branch for the
  // case where neither mark colour clears the floor. It was unreachable dead
  // code, and it was also wrong: it was labelled "Darken the background" while
  // proposing the *light* #f2f4f7 for dark accents. Removed rather than fixed.
  const white = bg ? contrast('#FFFFFF', bg) : 0;
  const black = bg ? contrast('#000000', bg) : 0;
  const useWhite = white >= black;
  const best = Math.max(white, black);
  return {
    pass, level: 'fail', ratio,
    advice: `${ratio.toFixed(2)}:1 is under the ${CONTRAST_MIN}:1 minimum — the mark will read as muddy against this background.`,
    remedy: { kind: 'accent', value: useWhite ? '#FFFFFF' : '#000000', label: `Use a ${useWhite ? 'white' : 'black'} mark (${best.toFixed(2)}:1)` },
  };
}

/**
 * Largest data-URL we will persist to localStorage or inline in a share link.
 * These used to be two DIFFERENT numbers (2e5 for storage, 6e4 for sharing),
 * which is why a logo could survive a reload but silently vanish from a shared
 * link (audit BS-P1-06). One number each, one behaviour, one message.
 */
export const ASSET_PERSIST_LIMIT = 200000;
export const ASSET_SHARE_LIMIT = 60000;

/**
 * Classify an uploaded asset so the UI can be honest at upload time rather
 * than silently dropping it on reload (audit BS-P1-06).
 */
export function assetPersistence(dataUrl) {
  const len = (dataUrl && String(dataUrl).length) || 0;
  if (!len) return { persists: false, shares: false, reason: 'no asset' };
  if (len < ASSET_SHARE_LIMIT) return { persists: true, shares: true, reason: '' };
  if (len < ASSET_PERSIST_LIMIT) {
    return { persists: true, shares: false, reason: 'Saved on this device, but too large to fit in a share link — use “Export design file” to move it.' };
  }
  return {
    persists: false, shares: false,
    reason: `Too large to save (${Math.round(len / 1024)} KB of a ${Math.round(ASSET_PERSIST_LIMIT / 1024)} KB budget) — it will be lost on reload. Use a smaller file, or export a design file.`,
  };
}

/**
 * Named multi-size sets, exported in one action. Built from the 4th element of
 * each PRESETS entry so a new canvas size joins a set by tagging itself, with
 * no second list to keep in step.
 *
 * `custom` is excluded from `all`: its dimensions come from the user, so it is
 * a canvas size rather than a fixed export target.
 */
export const EXPORT_SETS = Object.freeze({
  catalog: { label: 'Catalog cards', presets: Object.keys(PRESETS).filter(k => PRESETS[k][3] === 'catalog') },
  social:  { label: 'Social pack',   presets: Object.keys(PRESETS).filter(k => PRESETS[k][3] === 'social') },
  tv:      { label: 'TV & web',      presets: Object.keys(PRESETS).filter(k => PRESETS[k][3] === 'tv') },
  web:     { label: 'Header pack',   presets: Object.keys(PRESETS).filter(k => PRESETS[k][3] === 'web') },
  all:     { label: 'Everything',    presets: Object.keys(PRESETS).filter(k => PRESETS[k][3] !== 'custom') },
});

/**
 * Resolve an export request into the exact files that will be written, with
 * the final pixel dimensions after canvas-safety capping.
 *
 * Returning a plan instead of exporting inline is what makes "export matches
 * the preview at the chosen dimensions" testable without a browser
 * (audit BS-P1-04).
 */
export function planExport({ setKey = null, preset = 'ref', scale = 1, fmt = 'png', brand = 'netflix' } = {}) {
  const keys = setKey && EXPORT_SETS[setKey]
    ? EXPORT_SETS[setKey].presets.filter(k => PRESETS[k])
    : [PRESETS[preset] ? preset : 'ref'];

  return keys.map(key => {
    const [w, h, label] = PRESETS[key];
    const rs = reduceScale(w, h, scale);
    return {
      preset: key, label,
      width: w * rs.scale, height: h * rs.scale,
      requestedScale: scale, scale: rs.scale, capped: rs.reduced,
      format: fmt,
      filename: `bannerstudio_${brand}_${key}_${w * rs.scale}x${h * rs.scale}.${fmt === 'png' ? 'png' : fmt === 'svg' ? 'svg' : 'jpg'}`,
    };
  });
}

/**
 * Can this design be expressed as SVG?
 *
 * Vector and text wordmarks are analytically describable, so SVG is nearly
 * free (audit BS-P1-05). A bitmap logo or bitmap background is not, and we say
 * so rather than exporting a lying `.svg` with an embedded raster.
 */
export function svgAvailability(st) {
  if (st && st._logoUrl) return { available: false, reason: 'A custom bitmap logo cannot be expressed as vector — export PNG instead.' };
  if (st && st._bgUrl) return { available: false, reason: 'A background image cannot be expressed as vector — export PNG instead.' };
  return { available: true, reason: '' };
}

/** Per-card export plan: each poster at its native card aspect (2:3). */
export function planCardExports(st, { height = 900 } = {}) {
  const h = Math.max(120, Math.round(height));
  const w = Math.round(h * 2 / 3);
  return (st.cards || []).map((c, i) => ({
    index: i,
    name: c.n,
    width: w, height: h,
    filename: `bannerstudio_${st.brand}_card${String(i + 1).padStart(2, '0')}_${(c.n || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}.png`,
  }));
}
