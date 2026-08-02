export const HOST_BASE_URLS = { elfhosted:'https://aiostreams.elfhosted.com', fortheweak:'https://aiostreams.fortheweak.cloud', midnight:'https://aiostreamsfortheweebsstable.midnightignite.me', viren:'https://aiostreams.viren070.me', kuu:'https://aiostreams.stremio.ru', atbp:'https://aio.atbphosting.com', omni:'https://aiostreams.12312023.xyz', wizaardd:'https://aiostreams-stable.forthewizards.uk' };
export const HOST_LABEL_MAP = { elfhosted:'ElfHosted', fortheweak:"Yeb's / ForTheWeak", midnight:"Midnight's", viren:"Viren's Nightly", kuu:"Kuu's", atbp:'ATBP', omni:"Omni's (legacy)", wizaardd:'Wizaardd' };
export const HOST_META = {
  elfhosted:{channel:'stable',priority:1,blocksFree:true,supportsP2P:false,supportsHttp:false,supportsNuvioInstant:false}, fortheweak:{channel:'stable',priority:2,supportsP2P:true,supportsHttp:true,supportsNuvioInstant:true}, midnight:{channel:'stable',priority:3,supportsP2P:true,supportsHttp:true,supportsNuvioInstant:true},
  kuu:{channel:'stable',priority:4,supportsP2P:true,supportsHttp:true,supportsNuvioInstant:true}, atbp:{channel:'stable',priority:5,supportsP2P:true,supportsHttp:true,supportsNuvioInstant:true}, wizaardd:{channel:'stable',priority:6,supportsP2P:true,supportsHttp:true,supportsNuvioInstant:true},
  viren:{channel:'nightly',priority:20,supportsP2P:true,supportsHttp:true,supportsNuvioInstant:true}, omni:{channel:'stable',priority:30,supportsP2P:true,supportsHttp:true,supportsNuvioInstant:true}
};
export const MIN_AIOSTREAMS_VERSION = '2.31.1';
