export const HOST_BASE_URLS = { elfhosted:'https://aiostreams.elfhosted.com', fortheweak:'https://aiostreams.fortheweak.cloud', midnight:'https://aiostreamsfortheweebsstable.midnightignite.me', viren:'https://aiostreams.viren070.me', kuu:'https://aiostreams.stremio.ru', atbp:'https://aio.atbphosting.com', omni:'https://aiostreams.12312023.xyz', wizaardd:'https://aiostreams-stable.forthewizards.uk' };
export const HOST_LABEL_MAP = { elfhosted:'ElfHosted', fortheweak:"Yeb's / ForTheWeak", midnight:"Midnight's", viren:"Viren's Nightly", kuu:"Kuu's", atbp:'ATBP', omni:"Omni's (legacy)", wizaardd:'Wizaardd' };
export const HOST_META = {
  // aiostreamsVersion: the release each public host was running when last read
  // from its own /api/v1/status. A live probe always wins over this snapshot;
  // it exists so the host picker and the routing gate can be truthful offline
  // and when the browser probe is CORS-blocked.
  //
  // Re-audited 2026-09-22, every host, each against its own /api/v1/status.
  // Seven hosts run 2.34.1: the six stable hosts on the same build
  // (commit c1d044c2, built 2026-09-15) and Viren's nightly on its own
  // build (tag 2026.09.22.0018-nightly, commit 66f4330b). Omni's is the
  // only holdout, still on 2.33.2 (build 2026-08-11) — six weeks stale,
  // which is why it keeps the "(legacy)" label. No entry below is a
  // deliberate deviation this time: 2.34.1 is a real compatibility
  // target, so the registry records exactly what the fleet runs.
  // An entry drifting is normal: hosts upgrade on their own schedule.
  // Check /api/v1/status before trusting any line below.
  elfhosted:{channel:'stable',priority:1,blocksFree:true,supportsP2P:false,supportsHttp:false,supportsDebrid:true,supportsNuvioInstant:false,aiostreamsVersion:'2.34.1'}, fortheweak:{channel:'stable',priority:2,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.1'}, midnight:{channel:'stable',priority:3,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.1'},
  kuu:{channel:'stable',priority:4,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.1'}, atbp:{channel:'stable',priority:5,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.1'}, wizaardd:{channel:'stable',priority:6,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.1'},
  viren:{channel:'nightly',priority:20,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.34.1'}, omni:{channel:'stable',priority:30,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.33.2'}
};
export const MIN_AIOSTREAMS_VERSION = '2.32.0';
