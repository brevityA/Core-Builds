export const HOST_BASE_URLS = { elfhosted:'https://aiostreams.elfhosted.com', fortheweak:'https://aiostreams.fortheweak.cloud', midnight:'https://aiostreamsfortheweebsstable.midnightignite.me', viren:'https://aiostreams.viren070.me', kuu:'https://aiostreams.stremio.ru', atbp:'https://aio.atbphosting.com', omni:'https://aiostreams.12312023.xyz', wizaardd:'https://aiostreams-stable.forthewizards.uk' };
export const HOST_LABEL_MAP = { elfhosted:'ElfHosted', fortheweak:"Yeb's / ForTheWeak", midnight:"Midnight's", viren:"Viren's Nightly", kuu:"Kuu's", atbp:'ATBP', omni:"Omni's (legacy)", wizaardd:'Wizaardd' };
export const HOST_META = {
  // aiostreamsVersion: the release each public host was running when last read
  // from its own /api/v1/status (audit of 2026-09-06). A live probe always wins
  // over this snapshot; it exists so the host picker and the routing gate can
  // be truthful offline / when the browser probe is CORS-blocked.
  elfhosted:{channel:'stable',priority:1,blocksFree:true,supportsP2P:false,supportsHttp:false,supportsDebrid:true,supportsNuvioInstant:false,aiostreamsVersion:'2.34.0'}, fortheweak:{channel:'stable',priority:2,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, midnight:{channel:'stable',priority:3,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.33.2'},
  kuu:{channel:'stable',priority:4,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, atbp:{channel:'stable',priority:5,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, wizaardd:{channel:'stable',priority:6,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.33.2'},
  viren:{channel:'nightly',priority:20,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.0'}, omni:{channel:'stable',priority:30,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.33.2'}
};
export const MIN_AIOSTREAMS_VERSION = '2.32.0';
