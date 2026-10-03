export const HOST_BASE_URLS = { elfhosted:'https://aiostreams.elfhosted.com', fortheweak:'https://aiostreams.fortheweak.cloud', midnight:'https://aiostreamsfortheweebsstable.midnightignite.me', viren:'https://aiostreams.viren070.me', kuu:'https://aiostreams.stremio.ru', atbp:'https://aio.atbphosting.com', omni:'https://aiostreams.12312023.xyz', wizaardd:'https://aiostreams-stable.forthewizards.uk' };
export const HOST_LABEL_MAP = { elfhosted:'ElfHosted', fortheweak:"Yeb's / ForTheWeak", midnight:"Midnight's", viren:"Viren's Nightly", kuu:"Kuu's", atbp:'ATBP', omni:"Omni's", wizaardd:'Wizaardd' };
export const HOST_META = {
  // aiostreamsVersion: the release each public host was running when last read
  // from its own /api/v1/status. A live probe always wins over this snapshot;
  // it exists so the host picker and the routing gate can be truthful offline
  // and when the browser probe is CORS-blocked.
  //
  // Re-audited 2026-10-02, every host, each against its own /api/v1/status.
  // The whole fleet is on 2.35.x: ElfHosted, ForTheWeak, Midnight's, Kuu's and
  // Viren's nightly on 2.35.7 (stable commit 0832aa21; the nightly on its own
  // build, dd9a87c1), ATBP and Omni's on 2.35.5 (83775623), Wizaardd on 2.35.4
  // (0eccbc78). Omni's is no longer behind, so it no longer carries "(legacy)".
  // The configurator's schema pin is 2.35.7 (UPSTREAM.pin, #770);
  // these lines record what each host runs, not what the output targets.
  // An entry drifting is normal: hosts upgrade on their own schedule.
  // Check /api/v1/status before trusting any line below.
  elfhosted:{channel:'stable',priority:1,blocksFree:true,supportsP2P:false,supportsHttp:false,supportsDebrid:true,supportsNuvioInstant:false,aiostreamsVersion:'2.35.7'}, fortheweak:{channel:'stable',priority:2,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.35.7'}, midnight:{channel:'stable',priority:3,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.35.7'},
  kuu:{channel:'stable',priority:4,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.35.7'}, atbp:{channel:'stable',priority:5,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.35.5'}, wizaardd:{channel:'stable',priority:6,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.35.4'},
  viren:{channel:'nightly',priority:20,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.35.7'}, omni:{channel:'stable',priority:30,supportsP2P:true,supportsHttp:true,supportsDebrid:true,supportsNuvioInstant:true,aiostreamsVersion:'2.35.5'}
};
export const MIN_AIOSTREAMS_VERSION = '2.32.0';
