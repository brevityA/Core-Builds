export const HOST_BASE_URLS = { elfhosted:'https://aiostreams.elfhosted.com', fortheweak:'https://aiostreams.fortheweak.cloud', midnight:'https://aiostreamsfortheweebsstable.midnightignite.me', viren:'https://aiostreams.viren070.me', kuu:'https://aiostreams.stremio.ru', atbp:'https://aio.atbphosting.com', omni:'https://aiostreams.12312023.xyz', wizaardd:'https://aiostreams-stable.forthewizards.uk' };
export const HOST_LABEL_MAP = { elfhosted:'ElfHosted', fortheweak:"Yeb's / ForTheWeak", midnight:"Midnight's", viren:"Viren's Nightly", kuu:"Kuu's", atbp:'ATBP', omni:"Omni's (legacy)", wizaardd:'Wizaardd' };
// `aiostreamsVersion` is the LAST-VERIFIED AIOStreams version each public host
// ran when checked (2026-09-05, via each `${base}/api/v1/status` -> data.version,
// recorded so the capability gate and the install pickers can be honest while
// offline). A live probe ALWAYS wins over this registry value; it exists so the
// gate is never silently more permissive than the real host.
export const HOST_META = {
  elfhosted:{channel:'stable',priority:1,blocksFree:true,supportsP2P:false,supportsHttp:false,supportsDebrid:true,supportsNuvioInstant:false,aiostreamsVersion:'2.34.0'}, fortheweak:{channel:'stable',priority:2,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, midnight:{channel:'stable',priority:3,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.33.2'},
  kuu:{channel:'stable',priority:4,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, atbp:{channel:'stable',priority:5,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, wizaardd:{channel:'stable',priority:6,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.33.2'},
  viren:{channel:'nightly',priority:20,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, omni:{channel:'stable',priority:30,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.33.2'}
};

/** Short per-host capability line for pickers, e.g. "Debrid only — no P2P/HTTP". */
export function hostCapabilitySummary(key) {
  const meta = HOST_META[key];
  if (!meta) return '';
  if (meta.supportsP2P === false && meta.supportsHttp === false && meta.supportsDebrid) return 'Debrid only — no P2P/HTTP';
  const caps = [];
  if (meta.supportsP2P) caps.push('P2P');
  if (meta.supportsHttp) caps.push('HTTP');
  if (meta.supportsDebrid) caps.push('Debrid');
  return caps.join('/');
}

export const MIN_AIOSTREAMS_VERSION = '2.32.0';
