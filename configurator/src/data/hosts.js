export const HOST_BASE_URLS = { elfhosted:'https://aiostreams.elfhosted.com', fortheweak:'https://aiostreams.fortheweak.cloud', midnight:'https://aiostreamsfortheweebsstable.midnightignite.me', viren:'https://aiostreams.viren070.me', kuu:'https://aiostreams.stremio.ru', atbp:'https://aio.atbphosting.com', omni:'https://aiostreams.12312023.xyz', wizaardd:'https://aiostreams-stable.forthewizards.uk' };
export const HOST_LABEL_MAP = { elfhosted:'ElfHosted', fortheweak:"Yeb's / ForTheWeak", midnight:"Midnight's", viren:"Viren's Nightly", kuu:"Kuu's", atbp:'ATBP', omni:"Omni's", wizaardd:'Wizaardd' };
export const HOST_META = {
  // aiostreamsVersion: the release each public host was running when last read
  // from its own /api/v1/status. A live probe always wins over this snapshot;
  // it exists so the host picker and the routing gate can be truthful offline
  // and when the browser probe is CORS-blocked.
  //
  // Re-audited 2026-11-21, every host, each against its own /api/v1/status.
  // ElfHosted, ForTheWeak, Midnight's, Wizaardd and Viren's nightly run 2.38.1
  // (commit 113ab6bf); Kuu's and Omni's run 2.37.0; ATBP runs 2.36.0. All are at
  // or above the pinned contract (UPSTREAM.pin sameContractSince 2.36.0), so none
  // is legacy: Omni's dropped "(legacy)" and Anime builds route to it again.
  // The configurator's schema pin is 2.38.1 (UPSTREAM.pin);
  // these lines record what each host runs, not what the output targets.
  // An entry drifting is normal: hosts upgrade on their own schedule.
  // Check /api/v1/status before trusting any line below.
  elfhosted:{channel:'stable',priority:1,blocksFree:true,supportsP2P:false,supportsHttp:false,supportsDebrid:true,supportsNuvioInstant:false,aiostreamsVersion:'2.38.1'}, fortheweak:{channel:'stable',priority:2,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.38.1'}, midnight:{channel:'stable',priority:3,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.38.1'},
  kuu:{channel:'stable',priority:4,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.37.0'}, atbp:{channel:'stable',priority:5,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.36.0'}, wizaardd:{channel:'stable',priority:6,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.38.1'},
  viren:{channel:'nightly',priority:20,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.38.1'}, omni:{channel:'stable',priority:30,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.37.0'}
};
export const MIN_AIOSTREAMS_VERSION = '2.32.0';
