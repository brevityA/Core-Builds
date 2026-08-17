/**
 * Complete AIOStreams template generator.
 *
 * Replaces the monolithic build() from app.js with a pure function that takes
 * explicit parameters instead of reading from a global state object.
 *
 * No DOM, browser state, network, or persistence dependencies.
 * No Math.random(), Date.now(), or other non-deterministic calls.
 */

import { templateInput, hasTmdbCredentials } from './input.js';
import { resolutionPolicy, encodePolicy, audioPolicy } from './device-policy.js';
import { sortPolicy } from './sort-policy.js';
import { sizePolicy, bitratePolicy } from './filter-policy.js';
import { addonPolicy, assertAddonPolicy } from './addon-policy.js';
import { getSelPolicy } from './sel-policy.js';
import { rankedSelPolicy } from './ranked-sel-policy.js';
import { SCORE_IQR_GUARD } from './sel-iqr-policy.js';
import { generateAgeRatingESE } from './agerating.js';
import { sanitizeAioEnumArrays } from './schema.js';
import { OPTIONAL_SCRAPER_DEFS } from './scrapers.js';
import { requireNuvioInstantHost } from './nuvio-hosts.js';
import { NUVIO_ADDONS } from './nuvio-torbox-instant.js';
import { applyOutputProfile, resolveOutputProfile } from './output-profile-policy.js';

const EXCLUDED_REGEX = ["/(\\bAI[ ._-]?(Upscaled?|Enhanced|Remaster(ed)?)?\\b)|(\\b(AIUS|RW|GuyZo|BR-GuyZo)\\b)|(\\b((Upscale)?Re-?graded?)\\b)|(\\b(The[ ._-]?Upscaler)\\b)|(\\b(AI[ ._-]?Enhanced?|UPS(UHD)?|Upscaled?([ ._-]?UHD)?|UpRez)\\b)/i","/(?<=\\b[12]\\d{3}\\b).*\\b(Extras|Bonus|Extended[ ._-]Clip)\\b/i","/(?<=\\bS\\d+\\b).*\\b(Extras|Bonus|Extended[ ._-]Clip)\\b/i","/(?<=\\b[12]\\d{3}\\b).*\\b(Sing[-_. ]Along)\\b/i","/^(?!.*\\b((?<!HD[._ -]|HD)DVD|BDRip|720p|MKV|XviD|WMV|d3g|(BD)?REMUX|^(?=.*1080p)(?=.*HEVC)|[xh][-_. ]?26[45]|German.*[DM]L|((?<=\\d{4}).*German.*([DM]L)?)(?=.*\\b(AVC|HEVC|VC[-_. ]?1|MVC|MPEG[-_. ]?2)\\b))\\b)(((?=.*\\b(Blu[-_. ]?ray|BD|HD[-_. ]?DVD)\\b)(?=.*\\b(AVC|HEVC|VC[-_. ]?1|MVC|MPEG[-_. ]?2|BDMV|ISO)\\b))|^((?=.*\\b(((?=.*\\b((.*_)?COMPLETE.*|Dis[ck])\\b)(?=.*(Blu[-_. ]?ray|HD[-_. ]?DVD)))|3D[-_. ]?BD|BR[-_. ]?DISK|Full[-_. ]?Blu[-_. ]?ray|^((?=.*((BD|UHD)[-_. ]?(25|50|66|100|ISO)))))))).*$/i","/[.]heb\\b|\\[eztvx?[ ._-]?(io|re|to)?\\]|\\[(rarbg|rartv|TGx)\\]|[.]VAV\\b|\\b(ORARBG)\\b/i","/[.]heb\\b|\\[eztvx?[ ._-]?(io|re|to)?\\]|\\[(rarbg|rartv|TGx)\\]/i"];

const PREFERRED_REGEX_4K = [{"name":"Radarr Remux T1","pattern":"/^(?=.*(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)(?=.*\\b(3L|ATELiER|BiZKiT|BLURANiUM|BMF|CiNEPHiLES|FraMeSToR|PiRAMiDHEAD|PmP|WiLDCAT|ZQ)\\b).*/i"},{"name":"Sonarr Remux T1","pattern":"/^(?=.*(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p)(?=.*\\b(BLURANiUM|BMF|FraMeSToR|PmP)\\b).*/i"},{"name":"Radarr UHD Bluray T1","pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|UHD|4K))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*\\b(?:CtrlHD|MainFrame|W4NK3R)\\b).*/i"},{"name":"Radarr UHD Bluray T1 — DON","pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|UHD|4K))(?!.*(?:(?:[_. ]|\\d{4}p-|\\bHybrid-)(?:(?:BD|UHD)[-_. ]?)?Remux\\b|(?:(?:BD|UHD)[-_. ]?)?Remux[_. ]\\d{4}p))(?!.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)))(?!.*(WebRip|Web-Rip|WEBMux))(?=.*(?:\\b(?:DON)\\b)).*/"},{"name":"Anime BD T1","pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[(Moxie|smol|SoM)\\]|-(Moxie|smol|SoM)\\b|\\b(DemiHuman|FLE|Flugel|LYS1TH3A)\\b)).*/i"},{"name":"Anime BD T1 [sam]","pattern":"/^(?=.*(BluRay|Blu-Ray|HD-?DVD|BDMux|BD(?!$)|bd(?:720|1080|2160)|(?<=[-_. (\\[])bd(?=[-_. )\\]])|DVD|DVDRip|NTSC|PAL|xvidvd))(?=.*(\\[sam\\]|-sam\\b)).*/"},{"name":"FraMeSToR","pattern":"/\\b(FraMeSToR)\\b/"}];

const PREFERRED_REGEX_1080P = [{"name":"Web T1","pattern":"/^(?=.*(WEB[-_. ]DL(?:mux)?|WEBDL|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?[ .]?5[. ]1)|(?:720|1080|2160)p[-. ]WEB[-. ]|[-. ]WEB[-. ](?:720|1080|2160)p|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|WebRip|Web-Rip|WEBMux))(?=.*\\b(?:APEX|FLUX|KiNGS|TOMMY)\\b).*/"},{"name":"126811","pattern":"/\\b(126811)\\b/i"},{"name":"FLUX","pattern":"/\\b(FLUX)\\b/i"},{"name":"SiC","pattern":"/\\b(SiC)\\b/"},{"name":"BHDStudio","pattern":"/\\b(BHDStudio)\\b/i"}];

export { EXCLUDED_REGEX, PREFERRED_REGEX_4K, PREFERRED_REGEX_1080P };

const DEVICE_VISUAL_TAGS = {
  'appletv-old': ['DV','HDR+DV','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'appletv-new': ['DV','HDR+DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'lgtv': ['DV','HDR+DV','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'sony': ['DV','HDR+DV','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'samsung': ['HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'firestick-hd': ['HDR10','HDR','HLG','SDR'],
  'firestick-4kmax': ['DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'chromecast': ['DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'googletv': ['DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'xiaomi': ['DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'xiaomi-3rd': ['DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'onn': ['HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'shield': ['DV','HDR+DV','HDR10','HDR','10bit','SDR','IMAX'],
  'ipad': ['DV','HDR+DV','HDR10','HDR','10bit','SDR'],
  'roku': ['HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'projector': ['HDR10','HDR','HLG','10bit','SDR','IMAX'],
  'generic': ['HDR10','HDR','HLG','10bit','SDR','IMAX'],
};
const FULL_HDR_TAGS = ['HDR+DV','DV','HDR10+','HDR10','HDR','HLG','10bit','SDR','IMAX'];
const DV_ONLY_KILL_DEVICES = new Set(['generic','samsung','firestick-hd','roku','projector','onn']);

function visualTagsFor(device, resolution, architecture) {
  if (DEVICE_VISUAL_TAGS[device]) return [...DEVICE_VISUAL_TAGS[device]];
  if (device === 'windows' || resolution === '4k' || resolution === 'ultrawide' || resolution === 'mixed' || architecture === 'apex-mixed') return [...FULL_HDR_TAGS];
  return ['HDR10','HDR','HLG','10bit','SDR','IMAX'];
}

function buildDefaultName(input) {
  const res = input.resolution, svc = input.service, dev = input.device;
  const is4k = res === '4k', isUW = res === 'ultrawide';
  const resSuffix = input.architecture === 'apex-mixed' ? ' Apex Mixed' : is4k ? ' 4K' : isUW ? ' Ultrawide' : res === 'mixed' ? ' Mixed' : '';
  const devLabel = {'samsung':'Samsung TV','xiaomi':'Xiaomi','xiaomi-3rd':'Xiaomi','firestick-hd':'Fire Stick','firestick-4kmax':'Fire Stick 4K','appletv-old':'Apple TV','appletv-new':'Apple TV','shield':'Shield','googletv':'Google TV','roku':'Roku','chromecast':'Chromecast','sony':'Sony TV','lgtv':'LG TV','ipad':'iPad','projector':'Projector','onn':'ONN'}[dev] || '';
  const svcName = {'torbox-pro':'TorBox','torbox-ess':'TorBox Essential','alldebrid':'AllDebrid','realdebrid':'Real-Debrid','premiumize':'Premiumize','debridlink':'Debrid-Link','offcloud':'Offcloud','easynews':'EasyNews','p2p':'P2P','http':'HTTP','debridio':'Debridio','debrider':'Debrider'}[svc] || '';
  if (svc === 'multi') {
    const names = {'alldebrid':'AllDebrid','realdebrid':'RD','premiumize':'Premiumize','debridlink':'DL','offcloud':'Offcloud','easynews':'EasyNews','torbox-pro':'TorBox','torbox-ess':'TB Essential','debridio':'Debridio','debrider':'Debrider','easydebrid':'EasyDebrid','pikpak':'PikPak','seedr':'Seedr'};
    const PRIMARY = ['torbox-pro','torbox-ess','alldebrid','realdebrid','premiumize','debridlink','easynews','offcloud','debridio','debrider','easydebrid','pikpak','seedr'];
    const mainSvcs = (input.multiServices || []).filter(s => PRIMARY.includes(s));
    const svcStr = mainSvcs.length <= 3 ? mainSvcs.map(s => names[s] || s).join(' + ') : mainSvcs.slice(0,2).map(s => names[s] || s).join(' + ') + ` +${mainSvcs.length - 2}`;
    return `Core Nexus${resSuffix}${devLabel ? ' · ' + devLabel : ''} — ${svcStr}`.trim();
  }
  return `Core Nexus${resSuffix}${devLabel ? ' · ' + devLabel : ''}${svcName ? ' — ' + svcName : ''}`.trim();
}

function buildSubtitlePresets(input) {
  const addons = input.subtitleAddons || ['aiosubtitle'];
  const langs = input.subtitleLangs || ['en'];
  const out = [];
  if (addons.includes('aiosubtitle')) out.push({ type:'aiosubtitle', instanceId:'aio-sub-1', enabled:true, options:{ name:'AIOSubtitle', timeout:4000, languages:langs } });
  if (addons.includes('opensubtitles-v3-plus')) out.push({ type:'opensubtitles-v3-plus', instanceId:'osub-v3-1', enabled:true, options:{ name:'OpenSubtitles v3+', timeout:5000, language:langs, sources:'all', includeAiTranslated:false, movieHashPlusAutoAdjustment:false } });
  if (addons.includes('subdl')) {
    // AIOStreams SubDL accepts up to five uppercase provider language codes.
    const subdlLanguages = [...new Set(langs.map(lang => String(lang).trim().toUpperCase()).filter(Boolean))].slice(0, 5);
    out.push({ type:'subdl', instanceId:'subdl-1', enabled:true, options:{ name:'SubDL', timeout:5000, resources:['subtitles'], language:subdlLanguages, hearingImpairment:'hiInclude', ...(input.credentials?.subdl ? { subDlApiKey:input.credentials.subdl } : {}) } });
  }
  return out;
}

function buildCatalogPresets(input) {
  const cats = input.catalogs || ['tmdb-addon'];
  const out = [];
  if (cats.includes('tmdb-addon')) out.push({ type:'tmdb-addon', instanceId:'tmdb-cat-1', enabled:true, options:{ name:'TMDB', timeout:5000 }, resources:['catalog','meta'], category:'meta_catalogs' });
  if (cats.includes('streaming-catalogs')) out.push({ type:'streaming-catalogs', instanceId:'strm-cat-1', enabled:true, options:{ name:'Streaming Catalogs', timeout:5000 }, resources:['catalog'], category:'meta_catalogs' });
  if (cats.includes('anime-catalogs')) out.push({ type:'anime-catalogs', instanceId:'ani-cat-1', enabled:true, options:{ name:'Anime Catalogs', timeout:5000 }, resources:['catalog'], category:'meta_catalogs' });
  if (cats.includes('rpdb-catalogs')) out.push({ type:'rpdb-catalogs', instanceId:'rpdb-cat-1', enabled:true, options:{ name:'RPDB Catalogs', timeout:5000 }, resources:['catalog'], category:'meta_catalogs' });
  if (cats.includes('torrent-catalogs')) out.push({ type:'torrent-catalogs', instanceId:'torr-cat-1', enabled:true, options:{ name:'Torrent Catalogs', timeout:5000 }, resources:['catalog'], category:'meta_catalogs' });
  return out;
}

const NUVIO_OPTIONAL_SCRAPERS = new Set(['eztv', 'knaben', 'torrent-galaxy']);

function buildNuvioPresets(input) {
  const optionalScrapers = (input.optionalScrapers || []).filter(s => NUVIO_OPTIONAL_SCRAPERS.has(s));
  return [
    { type:'torrentio', instanceId:'tio-p2p-1', enabled:true, options:{ name:'Torrentio', timeout:7000, useMultipleInstances:false }, resources:['stream'] },
    { type:'comet', instanceId:'nx-fix-01', enabled:true, options:{ name:'Comet', timeout:7000, resources:['stream'], mediaTypes:['movie','series','anime'], scrapeDebridAccountTorrents:false } },
    { type:'mediafusion', instanceId:'nx-mf-01', enabled:true, options:{ name:'MediaFusion', timeout:7000, resources:['stream'], mediaTypes:['movie','series','anime'] } },
    { type:'meteor', instanceId:'nx-fix-02', enabled:true, options:{ name:'Meteor', timeout:6000, yourMedia:{ sources:['torrent','webdl','usenet'], showStreams:true, enabled:true }, usenet:{ enabled:true, customSearchEngines:true }, url:'https://meteorfortheweebs.midnightignite.me', resources:['stream'] } },
    { type:'stremthruTorz', instanceId:'67c', enabled:true, options:{ name:'StremThru Torz', timeout:5000, includeP2P:true, useMultipleInstances:false }, resources:['stream'] },
    ...(optionalScrapers.includes('eztv') ? [{ type:'eztv', instanceId:'nx-ez-01', enabled:true, options:{ name:'EZTV', timeout:5000 }, resources:['stream'] }] : []),
    ...(optionalScrapers.includes('knaben') ? [{ type:'knaben', instanceId:'tam-knaben', enabled:true, options:{ name:'Knaben', timeout:6000, mediaTypes:[], useMultipleInstances:false }, resources:['stream'] }] : []),
    ...(optionalScrapers.includes('torrent-galaxy') ? [{ type:'torrent-galaxy', instanceId:'nx-tg-01', enabled:true, options:{ name:'Torrent Galaxy', timeout:5000 }, resources:['stream'] }] : []),
    ...buildSubtitlePresets(input),
    ...buildCatalogPresets(input)
  ];
}

function buildNuvioServices() {
  return [
    {id:'realdebrid', enabled:false, credentials:{}},
    {id:'alldebrid', enabled:false, credentials:{}},
    {id:'premiumize', enabled:false, credentials:{}},
    {id:'debridlink', enabled:false, credentials:{}},
    {id:'torbox', enabled:false, credentials:{}},
    {id:'offcloud', enabled:false, credentials:{}},
    {id:'easydebrid', enabled:false, credentials:{}},
    {id:'pikpak', enabled:false, credentials:{}},
    {id:'seedr', enabled:false, credentials:{}},
    {id:'easynews', enabled:false, credentials:{}},
    {id:'putio', enabled:false, credentials:{}},
    {id:'debrider', enabled:false, credentials:{}},
    {id:'nzbdav', enabled:false, credentials:{}}, {id:'altmount', enabled:false, credentials:{}}, {id:'stremthru_newz', enabled:false, credentials:{}},
    {id:'stremio_nntp', enabled:false, credentials:{}}, {id:'aiostreams', enabled:false, credentials:{}}
  ];
}

function buildPresets(input) {
  const svc = input.service;
  const creds = input.credentials || {};
  const multiServices = input.multiServices || [];
  const optionalScrapers = input.optionalScrapers || [];
  const content = input.content || 'all';
  const isMulti = svc === 'multi', isP2P = svc === 'p2p', isEasynews = svc === 'easynews', isHttp = svc === 'http', isDebridio = svc === 'debridio', isUsenet = svc === 'usenet';
  const hasDebridio = isDebridio || (isMulti && multiServices.includes('debridio'));
  const multiHasEasynews = isMulti && multiServices.includes('easynews');
  const hasExtraHttp = isMulti && multiServices.includes('http') && !isHttp;
  const isNzbgeek = isMulti && multiServices.includes('nzbgeek');
  const isStreamnzb = isMulti && multiServices.includes('streamnzb');
  const useStore = ['alldebrid','realdebrid','premiumize','debridlink','offcloud','easydebrid','pikpak','seedr'].includes(svc) || (isMulti && multiServices.some(s => ['alldebrid','realdebrid','premiumize','debridlink','offcloud','easydebrid','pikpak','seedr'].includes(s)));

  if (isHttp) return [
    // v2.33+: Sootio validates as debrid/usenet-only — pure-HTTP/p2p routes can't satisfy it
    { type:'sootio', instanceId:'sootio-core-builds', enabled:false, options:{ name:'Sootio', timeout:5000 }, resources:['stream'] },
    { type:'peerflix', instanceId:'pflx-1', enabled:true, options:{ name:'Peerflix', timeout:7000, showTorrentLinks:false, useMultipleInstances:false }, resources:['stream'] },
    { type:'webstreamr', instanceId:'wsr-1', enabled:false, options:{ name:'WebStreamr', timeout:7000 }, resources:['stream'] },
    { type:'nuvio-streams', instanceId:'nvs-1', enabled:false, options:{ name:'Nuvio Streams', timeout:7000 }, resources:['stream'] },
    { type:'flix-streams', instanceId:'flx-1', enabled:false, options:{ name:'Flix-Streams', timeout:7000 }, resources:['stream'] },
    { type:'hdhub', instanceId:'hdhub-1', enabled:true, options:{ name:'HdHub', timeout:5000, resources:['stream'], mediaTypes:['movie','series','anime'] } },
    ...buildSubtitlePresets(input),
    ...buildCatalogPresets(input)
  ];

  if (isUsenet) {
    const usenetList = [
      { type:'library', instanceId:'lib-1', enabled:true, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } },
      { type:'easynewsPlusPlus', instanceId:'en-ppp-1', enabled:true, options:{ name:'EasyNews++', timeout:6000 }, resources:['stream'] },
      { type:'easynews-search', instanceId:'en-srch-1', enabled:true, options:{ name:'EasyNews Search', timeout:5000, apiVersion:'3.0' }, resources:['stream'] },
      ...(creds.nzbgeek ? [{ type:'newznab', instanceId:'nzbgeek-1', enabled:true, options:{ name:'NZBGeek', api:{ url:'https://api.nzbgeek.info/api', apiKey:creds.nzbgeek }, timeout:6000, mediaTypes:['movie','series','anime'], searchMode:'auto', seasonEpisodeStrategy:'episode', paginate:true, useMultipleInstances:false } }] : []),
      ...optionalScrapers.filter(sid => OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid && x.presetType === 'newznab')).map(sid => {
        const d = OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid);
        return { type:'newznab', instanceId:`${d.id}-1`, enabled:true, options:{ name:d.label, api:{ url:d.apiUrl, apiKey:creds[d.credKey] || '' }, timeout:6000, mediaTypes:['movie','series','anime'], searchMode:'auto', seasonEpisodeStrategy:'episode', paginate:true, useMultipleInstances:false } };
      }),
      ...optionalScrapers.filter(sid => OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid && x.presetType === 'nzbhydra')).map(sid => {
        const d = OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid);
        return { type:'nzbhydra', instanceId:'nzbhydra-1', enabled:true, options:{ name:'NZBHydra2', api:{ url:creds.nzbhydra || '', apiKey:creds.nzbhydraApiKey || '' }, timeout:8000, mediaTypes:['movie','series','anime'], searchMode:'auto', seasonEpisodeStrategy:'episode', paginate:true, useMultipleInstances:false } };
      }),
      ...buildSubtitlePresets(input),
      ...buildCatalogPresets(input)
    ];
    return usenetList;
  }

  const storeLabels = {'alldebrid':'StremThru AllDebrid','realdebrid':'StremThru RD','premiumize':'StremThru Premiumize','debridlink':'StremThru Debrid-Link','offcloud':'StremThru Offcloud','easydebrid':'StremThru EasyDebrid','pikpak':'StremThru PikPak','seedr':'StremThru Seedr'};
  const debridServices = ['alldebrid','realdebrid','premiumize','debridlink','offcloud','easydebrid','pikpak','seedr'];
  const multiHasTorbox = isMulti && (multiServices.includes('torbox-pro') || multiServices.includes('torbox-ess'));
  const storeSlot = isMulti
    ? [...(multiHasTorbox ? [{ type:'stremthruTorz', instanceId:'67c', enabled:true, options:{ name:'StremThru Torz', timeout:5000, includeP2P:false, useMultipleInstances:false }, resources:['stream'] }] : []), ...multiServices.filter(s => debridServices.includes(s)).map((s, i) => ({ type:'stremthruStore', instanceId:`68${String.fromCharCode(97+i)}`, enabled:true, options:{ name:storeLabels[s] || 'StremThru Store', timeout:5000, useMultipleInstances:false }, resources:['stream'] }))]
    : useStore ? [{ type:'stremthruStore', instanceId:'68a', enabled:true, options:{ name:storeLabels[svc] || 'StremThru Store', timeout:5000, useMultipleInstances:false }, resources:['stream'] }]
    : svc === 'hybrid' ? [{ type:'stremthruTorz', instanceId:'67c', enabled:true, options:{ name:'StremThru Torz', timeout:5000, includeP2P:false, useMultipleInstances:false }, resources:['stream'] }, { type:'stremthruStore', instanceId:'68a', enabled:true, options:{ name:'StremThru RD', timeout:5000, useMultipleInstances:false }, resources:['stream'] }]
    : isP2P || isEasynews || isDebridio || isUsenet ? []
    : [{ type:'stremthruTorz', instanceId:'67c', enabled:true, options:{ name:'StremThru Torz', timeout:5000, includeP2P:false, useMultipleInstances:false }, resources:['stream'] }];

  const list = [
    { type:'library', instanceId:'lib-1', enabled:!isP2P, options:{ name:'Library', timeout:3000, resources:['stream','catalog','meta'], mediaTypes:[], showRefreshActions:['catalog'], skipProcessing:false, hideStreams:false, useMultipleInstances:false } },
    ...(isP2P ? [{ type:'torrentio', instanceId:'tio-p2p-1', enabled:true, options:{ name:'Torrentio', timeout:7000, useMultipleInstances:false }, resources:['stream'] }] : []),
    { type:'zilean', instanceId:'nx-fix-04', enabled:true, options:{ name:'Zilean', timeout:4000, resources:['stream'] } },
    { type:'seadex', instanceId:'tam-seadex', enabled:content !== 'live' && !isP2P, options:{ name:'SeaDex', timeout:4000, mediaTypes:['anime'] }, resources:['stream'] },  // p2p-only: v2.33 hard-rejects "SeaDex requires at least one usable service",
    ...storeSlot,
    ...(isEasynews || multiHasEasynews || isUsenet ? [
      { type:'easynewsPlusPlus', instanceId:'en-ppp-1', enabled:true, options:{ name:'EasyNews++', timeout:6000 }, resources:['stream'] },
      { type:'easynews-search', instanceId:'en-srch-1', enabled:true, options:{ name:'EasyNews Search', timeout:5000, apiVersion:'3.0' }, resources:['stream'] },
    ] : []),
    ...(isNzbgeek && creds.nzbgeek ? [
      { type:'newznab', instanceId:'nzbgeek-1', enabled:true, options:{ name:'NZBGeek', api:{ url:'https://api.nzbgeek.info/api', apiKey:creds.nzbgeek }, timeout:6000, mediaTypes:['movie','series','anime'], searchMode:'auto', seasonEpisodeStrategy:'episode', paginate:true, useMultipleInstances:false } },
    ] : []),
    ...(isStreamnzb ? [
      { type:'streamnzb', instanceId:'nx-snzb-01', enabled:true, options:{ name:'StreamNZB', timeout:5000, ...(creds.streamnzb ? { url:creds.streamnzb } : { url:'' }), mediaTypes:['movie','series','anime'] } },
    ] : []),
    ...(hasDebridio && creds.debridio ? [
      { type:'debridio', instanceId:'dbio-1', enabled:true, options:{ name:'Debridio', timeout:7000, ...(creds.debridio ? { apiKey:creds.debridio } : {}) }, resources:['stream'] },
    ] : []),
    ...(multiServices.includes('debrider') && creds.debrider ? [
      { type:'debrider', instanceId:'dbr-1', enabled:true, options:{ name:'Debrider', timeout:7000, ...(creds.debrider ? { apiKey:creds.debrider } : {}) }, resources:['stream'] },
    ] : []),
    ...optionalScrapers.filter(sid => OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid && !x.credKey && !x.apiUrl)).map(sid => {
      if (sid === 'knaben') return null;
      if (sid === 'zilean') return null;
      return null;
    }).filter(Boolean),
    ...optionalScrapers.filter(sid => OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid && x.credKey && !x.apiUrl && x.presetType !== 'nzbhydra')).map(sid => {
      const d = OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid);
      if (d.id === 'jackett') return creds.jackettUrl ? { type:'jackett', instanceId:'jackett-1', enabled:true, options:{ name:'Jackett', jackettUrl:creds.jackettUrl, timeout:10000, ...(creds.jackett ? { apiKey:creds.jackett } : {}) }, resources:['stream'] } : null;  // v2.33: jackettUrl is REQUIRED — no URL, no preset
      if (d.id === 'prowlarr') return creds.prowlarrUrl ? { type:'prowlarr', instanceId:'prowlarr-1', enabled:true, options:{ name:'Prowlarr', prowlarrUrl:creds.prowlarrUrl, timeout:10000, ...(creds.prowlarr ? { apiKey:creds.prowlarr } : {}) }, resources:['stream'] } : null;  // v2.33: prowlarrUrl REQUIRED
      return null;
    }).filter(Boolean),
    ...optionalScrapers.filter(sid => OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid && x.presetType === 'nzbhydra')).map(sid => {
      return { type:'nzbhydra', instanceId:'nzbhydra-1', enabled:true, options:{ name:'NZBHydra2', api:{ url:creds.nzbhydra || '', apiKey:creds.nzbhydraApiKey || '' }, timeout:8000, mediaTypes:['movie','series','anime'], searchMode:'auto', seasonEpisodeStrategy:'episode', paginate:true, useMultipleInstances:false } };
    }),
    ...optionalScrapers.filter(sid => OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid && x.presetType === 'newznab')).map(sid => {
      const d = OPTIONAL_SCRAPER_DEFS.find(x => x.id === sid);
      return { type:'newznab', instanceId:`${d.id}-1`, enabled:true, options:{ name:d.label, api:{ url:d.apiUrl, apiKey:creds[d.credKey] || '' }, timeout:6000, mediaTypes:['movie','series','anime'], searchMode:'auto', seasonEpisodeStrategy:'episode', paginate:true, useMultipleInstances:false } };
    }),
    ...(hasExtraHttp ? [
      { type:'webstreamr', instanceId:'wsr-1', enabled:false, options:{ name:'WebStreamr', timeout:7000 }, resources:['stream'] },
      { type:'nuvio-streams', instanceId:'nvs-1', enabled:false, options:{ name:'Nuvio Streams', timeout:7000 }, resources:['stream'] },
      { type:'flix-streams', instanceId:'flx-1', enabled:false, options:{ name:'Flix-Streams', timeout:7000 }, resources:['stream'] },
    ] : []),
    { type:'meteor', instanceId:'nx-fix-02', enabled:true, options:{ name:'Meteor', timeout:6000, yourMedia:{ sources:['torrent','webdl','usenet'], showStreams:true, enabled:true }, usenet:{ enabled:true, customSearchEngines:true }, url:'https://meteorfortheweebs.midnightignite.me', resources:['stream'] } },
    { type:'comet', instanceId:'nx-fix-01', enabled:true, options:{ name:'Comet', timeout:7000, resources:['stream'], mediaTypes:['movie','series','anime'], scrapeDebridAccountTorrents:true } },
    { type:'mediafusion', instanceId:'nx-mf-01', enabled:true, options:{ name:'MediaFusion', timeout:7000, resources:['stream'], mediaTypes:['movie','series','anime'] } },
    { type:'hdhub', instanceId:'hdhub-1', enabled:isP2P, options:{ name:'HdHub', timeout:5000, resources:['stream'], mediaTypes:['movie','series','anime'], ...(!isP2P && (multiHasTorbox || svc === 'torbox-pro' || svc === 'torbox-ess') ? {tb_only:true} : {}) } },
    { type:'eztv', instanceId:'nx-ez-01', enabled:true, options:{ name:'EZTV', timeout:5000 }, resources:['stream'] },
    { type:'torrent-galaxy', instanceId:'nx-tg-01', enabled:true, options:{ name:'Torrent Galaxy', timeout:5000 }, resources:['stream'] },
    { type:'knaben', instanceId:'tam-knaben', enabled:true, options:{ name:'Knaben', timeout:6000, mediaTypes:[], useMultipleInstances:false }, resources:['stream'] },
    { type:'torrents-db', instanceId:'nx-tdb-1', enabled:false, options:{ name:'TorrentsDB', timeout:5000, useMultipleInstances:false }, resources:['stream'] },
    ...(content === 'anime' || content === 'all' || content === 'mixed' ? [
      { type:'animetosho', instanceId:'nx-at-01', enabled:content === 'anime', options:{ name:'AnimeTosho', timeout:5000, mediaTypes:['anime'] }, resources:['stream'] },
      { type:'neko-bt', instanceId:'neko-bt-core-builds', enabled:false, options:{ name:'NekoBT', timeout:5000, mediaTypes:['anime'] }, resources:['stream'] },
    ] : []),
    { type:'sootio', instanceId:'sootio-core-builds', enabled:false, options:{ name:'Sootio', timeout:5000 }, resources:['stream'] },  // p2p-only: v2.33 rejects Sootio (no usable service/HTTP provider); the HTTP/Usenet branches enable their own,
    ...(isP2P ? [{ type:'peerflix', instanceId:'pflx-1', enabled:true, options:{ name:'Peerflix', timeout:7000, showTorrentLinks:false, useMultipleInstances:false }, resources:['stream'] }] : []),
    ...buildSubtitlePresets(input),
    ...buildCatalogPresets(input)
  ];
  // The legacy built-in torbox-search preset was removed in AIOStreams v2.32
  // (TorBox Search API shut down); emitting it fails saves on v2.32+ hosts.
  return list;
}

function buildServices(input) {
  const svc = input.service, isMulti = svc === 'multi', m = input.multiServices || [];
  const creds = input.credentials || {};
  const cred = id => creds[id] ? {apiKey: creds[id]} : {};
  return [
    {id:'realdebrid', enabled: svc==='realdebrid' || svc==='hybrid' || (isMulti && m.includes('realdebrid')), credentials:cred('realdebrid')},
    {id:'alldebrid', enabled: svc==='alldebrid' || (isMulti && m.includes('alldebrid')), credentials:cred('alldebrid')},
    {id:'premiumize', enabled: svc==='premiumize' || (isMulti && m.includes('premiumize')), credentials:cred('premiumize')},
    {id:'debridlink', enabled: svc==='debridlink' || (isMulti && m.includes('debridlink')), credentials:cred('debridlink')},
    {id:'torbox', enabled: svc==='torbox-pro' || svc==='torbox-ess' || svc==='hybrid' || (isMulti && (m.includes('torbox-pro')||m.includes('torbox-ess'))), credentials:cred('torbox')},
    {id:'offcloud', enabled: svc==='offcloud' || (isMulti && m.includes('offcloud')), credentials:cred('offcloud')},
    {id:'easydebrid', enabled: svc==='easydebrid' || (isMulti && m.includes('easydebrid')), credentials:cred('easydebrid')},
    {id:'pikpak', enabled: svc==='pikpak' || (isMulti && m.includes('pikpak')), credentials:cred('pikpak')},
    {id:'seedr', enabled: svc==='seedr' || (isMulti && m.includes('seedr')), credentials:cred('seedr')},
    {id:'easynews', enabled: svc==='easynews' || svc==='usenet' || (isMulti && m.includes('easynews')), credentials: (svc==='easynews' || svc==='usenet' || (isMulti && m.includes('easynews'))) && creds.easynews ? { username:creds.easynews, password:creds.easynewsPass||'' } : {}},
    {id:'stremio_nntp', enabled: svc==='usenet', credentials:{}}, {id:'aiostreams', enabled: svc==='usenet', credentials:{}},
    {id:'putio', enabled: false, credentials:{}},
    {id:'debrider', enabled: svc==='debrider' || (isMulti && m.includes('debrider')), credentials:cred('debrider')},
    {id:'nzbdav', enabled: false, credentials:{}}, {id:'altmount', enabled: false, credentials:{}}, {id:'stremthru_newz', enabled: false, credentials:{}},
    
  ];
}

// Pack and multi-episode results are valid fallbacks for a requested episode.
//
// These expressions must be appended *after* quality, cache, P2P, and result-cap
// ESEs. An earlier version removed packs before later filters could remove the
// supposedly better single-episode candidates, which could leave a request with
// no playable streams at all. AIOStreams' season/episode matcher already checks
// whether a pack contains the requested episode.
function lateEpisodePackFallbackEses() {
  return [
    { enabled:true, expression:"/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? multiEpisode(streams) : []" },
    { enabled:true, expression:"/* CB | Late Pack Fallback — hide ambiguous season packs only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? seasonPack(streams,'onlySeasons') : []" },
  ];
}

function buildEses(input) {
  const out = [];
  const dev = input.device, is1080 = input.resolution === '1080p';
  const isFree = input.service === 'p2p' || input.service === 'http';
  const langs = input.langs || ['English'];
  const content = input.content || 'all';
  const multiServices = input.multiServices || [];

  if (input.service === 'http') {
    out.push({ enabled:true, expression:"/* CB | Hard YouTube Kill */ type(streams,'youtube','external')" });
    if (is1080) out.push({ enabled:true, expression:"/* Hard Resolution Kill */ resolution(streams,'2160p','1440p')" });
    if (input.exclude4K && !is1080) out.push({ enabled:true, expression:"/* Exclude 4K / UHD */ resolution(streams,'2160p','1440p')" });
    if (input.excludeDV) out.push({ enabled:true, expression:"/* Exclude Dolby Vision */ visualTag(streams,'DV','HDR+DV')" });
    { const ae = generateAgeRatingESE(input.ageLimit); if (ae) out.push(ae); }
    return out;
  }

  if (input.service === 'p2p') {
    out.push({ enabled:true, expression:"/* CB | Hard YouTube Kill */ type(streams,'youtube','external')" }, { enabled:true, expression:"/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')" });
    out.push({ enabled:true, expression:"/* Auto-Hide SD */ count(resolution(streams,'1080p'))>=5 and count(resolution(streams,'720p'))>=5 ? resolution(streams,'480p','360p','SD') : []" });
    out.push({ enabled:true, expression:"/* Auto-Hide 720p */ count(resolution(streams,'1080p'))>=15 or count(resolution(streams,'2160p'))>=15 ? resolution(streams,'720p') : []" });
    if (input.foreignLangKill !== false && content !== 'anime') {
      const langArgs = [...new Set([...langs,'Original','Multi','Dual Audio','Dubbed','Unknown'])].map(l=>`'${l}'`).join(',');
      out.push({ enabled:true, expression:`/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, ${langArgs})), streams) : []` });
    }
    if (content !== 'anime') out.push({ enabled:true, expression: "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')" });
    if (is1080) out.push({ enabled:true, expression:"/* Hard Resolution Kill */ resolution(streams,'2160p','1440p')" });
    if (DV_ONLY_KILL_DEVICES.has(dev)) out.push({ enabled:true, expression: "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))" });
    if (input.exclude4K && !is1080) out.push({ enabled:true, expression:"/* Exclude 4K / UHD */ resolution(streams,'2160p','1440p')" });
    if (input.excludeDV) out.push({ enabled:true, expression:"/* Exclude Dolby Vision */ visualTag(streams,'DV','HDR+DV')" });
    if (input.sizeLimit && input.sizeLimit !== 'unlimited') {
      out.push({ enabled:true, expression:`/* Size Limit — max ${input.sizeLimit}GB */ size(streams,'1B','${input.sizeLimit}GB')` });
    }
    { const ae = generateAgeRatingESE(input.ageLimit); if (ae) out.push(ae); }
    out.push(...lateEpisodePackFallbackEses());
    return out;
  }

  out.push({ enabled:true, expression: "/*Per-Addon Flood Guard*/ merge(slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Meteor'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Comet'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'MediaFusion'),4),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Torrent Galaxy'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'EZTV'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'HdHub'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Knaben'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'TorrentsDB'),1))" });
  const usesIqrPolicy = input.architecture === 'iqr' && ['4k', '1080p'].includes(input.resolution);
  if (usesIqrPolicy || input.architecture === 'apex-mixed') out.push({ ...SCORE_IQR_GUARD });
  if (content !== 'anime') out.push({ enabled:true, expression: "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')" });
  if (input.foreignLangKill !== false && content !== 'anime') {
    const langArgs = [...new Set([...langs,'Original','Multi','Dual Audio','Dubbed','Unknown'])].map(l=>`'${l}'`).join(',');
    out.push({ enabled:true, expression:`/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, ${langArgs})), streams) : []` });
  }
  out.push(
    { enabled:true, expression: "/*Usenet Propagation Guard*/ count(negate(age(type(streams,'usenet','stremio-usenet'),0,'2'),type(streams,'usenet','stremio-usenet')))>0?age(type(streams,'usenet','stremio-usenet'),0,'2'):[]" },
    { enabled:true, expression:"/*AI Upscale Exclusion*/ keyword(negate(merge(library(streams),seadex(streams)),streams),'all','topaz','ai-upscale','aiupscale','upscaled','neural','enhancedai')" },
    { enabled:true, expression:"/*Info & Other Unwanted*/ merge(type(streams,'info'),releaseGroup(type(streams,'usenet','stremio-usenet'),'sample'),type(keyword(streams,'all','-sample'),'usenet','stremio-usenet'),message(type(streams,'usenet','stremio-usenet'),'includes','🚫'))" },
    { enabled:true, expression:"/* CB | Hard CAM Kill */ quality(streams,'CAM','SCR','TS','TC','HC HD-Rip')" },
    { enabled:true, expression:"/* CB | Hard External Kill */ type(streams,'external')" },
    { enabled:true, expression:"/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')" },
    { enabled:true, expression:"/*Extra SeaDex*/ count(seadex(streams,'best'))>1 or count(negate(seadex(streams,'best'),seadex(streams)))>1 ? merge(slice(negate(seadex(streams,'best'),seadex(streams)),1),slice(seadex(streams,'best'),1)) : []" },
    { enabled:true, expression:"/*Bad 4k Anime*/ (isAnime and originalLanguage == 'Japanese' and count(quality(resolution(cached(streams),'2160p'),'Bluray REMUX')) == 0 and count(seadex(resolution(streams,'2160p'))) == 0) ? negate(merge(library(streams),seadex(streams)),resolution(streams,'2160p')) : []" },
    { enabled:true, expression:"/*Upscaled 4k*/ (queryType=='movie' or queryType=='series') and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))>=1) and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'))==0 ? negate(merge(seadex(streams),library(streams)),resolution(streams,'2160p')) : []" },
    { enabled:true, expression:"/*Bad 4k Bluray*/ (queryType=='movie' or queryType=='series') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(seadex(resolution(streams,'2160p')))==0 ? negate(merge(seadex(streams),library(streams)),resolution(quality(streams,'Bluray'),'2160p')) : []" },
    { enabled:true, expression:"/*Bad 1080P Bluray*/ (queryType=='movie') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))==0) and count(seadex(resolution(streams,'1080p')))==0 ? negate(merge(seadex(streams),library(streams)),quality(resolution(streams,'1080p'),'Bluray')) : []" },
    { enabled:true, expression:"/* Adaptive Score Floor */ count(streamExpressionScore(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),-50+min(30,daysSinceRelease*0.1)))<5?[]:streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,-50+min(30,daysSinceRelease*0.1))" },
    { enabled:true, expression:"/* Low Seeder Cull */ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=3?[]:seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,0)" },
    ...(!isFree && (multiServices.includes('realdebrid') || input.service === 'realdebrid') ? [{ enabled:true, expression:"/* RD Copyright */ service(keyword(streams,'all','web-dl','webrip','bdrip','hdrip','dvdrip','bluray.x264','hdtv.x264','hdtv.xvid','web.x264','web.h264'),'realdebrid')" }] : []),
    { enabled:true, expression:"/*G's Low Bitrate*/ count(negate((isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))),cached(streams)))>10?(isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))):[]" },
    { enabled:true, expression:"/*Low Seeders*/ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=5?[]:count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10)))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))>5?negate(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),1),merge(type(streams,'p2p'),type(uncached(streams),'debrid'))):[]" },
    { enabled:true, expression:"/*Final Limit — Quality Quota*/ count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip'))>12?quality(negate(merge(library(streams),seadex(streams)),streams),'HDRip','HC HD-Rip','DVDRip','HDTV','CAM','TS','TC','SCR'):count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip','HDRip','HC HD-Rip','DVDRip','HDTV'))>12?quality(streams,'CAM','TS','TC','SCR'):[]" },
    { enabled:true, expression:"/*Final Limit — Resolution Quota*/ count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>15?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>9?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>6?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),6))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>3?negate(merge(library(streams),seadex(streams)),merge(slice(type(uncached(streams),'debrid'),6),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),-1))):[]" }
  );
  if (is1080) out.push({ enabled:true, expression:"/* Hard Resolution Kill */ resolution(streams,'2160p','1440p')" });
  if (DV_ONLY_KILL_DEVICES.has(dev)) out.push({ enabled:true, expression: "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))" });
  const hasRD = input.service==='realdebrid' || input.service==='hybrid' || (input.service==='multi' && multiServices.includes('realdebrid'));
  if (hasRD) out.push({ enabled:true, expression:"/*RD Copyright (per DMM)*/ service(keyword(streams,'all','web-dl','webrip','bdrip','hdrip','dvdrip','bluray.x264','hdtv.x264','hdtv.xvid','web.x264','web.h264'),'realdebrid')" });
  out.push({ enabled:true, expression:"/* Indexer Diversity */ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>20 ? negate(perGroup(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'indexer',2),negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http')))) : []" });
  const cacheMode = input.cacheMode || 'mixed';
  if (cacheMode !== 'uncached') out.push({ enabled:true, expression: "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')))" }, { enabled:true, expression: "/* Extra Cached LQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')))" });
  if (cacheMode !== 'cached') out.push({ enabled:true, expression: "/* Extra Uncached */ negate(perGroup(uncached(streams),'resolution',3),uncached(streams))" });
  if (cacheMode === 'cached')   out.push({ enabled:true, expression:"/* Cached Only — hard kill uncached */ uncached(streams)" });
  if (cacheMode === 'uncached') out.push({ enabled:true, expression:"/* Uncached Only — hard kill cached */ cached(streams)" });
  if (!input.p2pEnabled && !multiServices.includes('p2p')) out.push({ enabled:true, expression:"/* P2P Kill */ type(streams,'p2p')" });
  if (input.exclude4K && !is1080) out.push({ enabled:true, expression:"/* Exclude 4K / UHD */ resolution(streams,'2160p','1440p')" });
  if (input.excludeDV) out.push({ enabled:true, expression:"/* Exclude Dolby Vision */ visualTag(streams,'DV','HDR+DV')" });
  if (input.sizeLimit && input.sizeLimit !== 'unlimited') {
    out.push({ enabled:true, expression:`/* Size Limit — max ${input.sizeLimit}GB */ size(streams,'1B','${input.sizeLimit}GB')` });
  }
  const ageEse = generateAgeRatingESE(input.ageLimit);
  if (ageEse) out.push(ageEse);
  out.push(...lateEpisodePackFallbackEses());
  return out;
}

function buildPses(input, deviceAv1Safe, deviceDvSafe, deviceForceLimitedAudio) {
  const out = [];
  const res = input.resolution, dev = input.device;
  const dv = deviceDvSafe.has(dev);
  const supportsAv1 = deviceAv1Safe.has(dev);
  const codecExpr = supportsAv1 ? "/* Codec Efficiency Booster */ encode(streams,'HEVC','AV1')" : "/* Codec Efficiency Booster */ encode(streams,'HEVC')";
  const pinLQ = { enabled:true, expression:"/* LQ Pin Bottom */ pin(releaseGroup(streams,'YIFY','RARBG','EVO','YTS','PSA','MeGusta','Tigole'),'bottom')" };
  const langs = input.langs || [];

  if (langs.length) {
    out.push({ enabled:true, expression:`/* Language Preference — ${langs.join('/')} */ language(streams,${langs.map(l=>`'${l}'`).join(',')})` });
  }
  out.push({ enabled:true, expression:"/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []" });
  if (input.audio === 'dolby') {
    out.push({ enabled:true, expression:"/* Dolby Priority for Sonos/Bose */ audioTag(streams,'Atmos','TrueHD','DDP','DD+')" });
  }

  if (input.service === 'http') {
    out.push({ enabled:true, expression:"/* Resolution Preference */ resolution(streams,'1080p','720p','480p')" });
    return out;
  }

  if (input.service === 'p2p') {
    out.push(pinLQ);
    if (res === '4k' || res === 'mixed') {
      out.push({ enabled:true, expression:"/* S-Tier 4K */ resolution(streams,'2160p')" }, { enabled:true, expression:"/* A-Tier 1080p */ resolution(streams,'1080p')" }, { enabled:true, expression:codecExpr });
    } else {
      out.push({ enabled:true, expression:"/* S-Tier 1080p */ resolution(streams,'1080p')" }, { enabled:true, expression:"/* A-Tier 720p Fallback */ resolution(streams,'720p')" }, { enabled:true, expression:codecExpr });
    }
    out.push({ enabled:true, expression:"/* Seeder Priority */ seeders(streams,5,99999)" });
    return out;
  }

  const forceLimitedAudio = input.audio === 'limited' || deviceForceLimitedAudio.has(dev);
  const sel = getSelPolicy({ architecture: input.architecture || 'standard', resolution: res, dv, audio: input.audio, forceLimitedAudio, supportsAv1 });
  out.push(...sel.preferredStreamExpressions);
  return out;
}

function generateNuvioTemplate(input, options = {}) {
  const host = input.host || options.host || {};
  requireNuvioInstantHost(host);

  const deviceAv1Safe = options.deviceAv1Safe || new Set();
  const deviceDvSafe = options.deviceDvSafe || new Set();
  const deviceForceLimitedAudio = options.deviceForceLimitedAudio || new Set();
  const formatters = options.formatters || [];

  const p2pInput = { ...input, service: 'p2p', credentials: {} };
  const normalizedInput = templateInput(p2pInput);
  const hasTmdb = hasTmdbCredentials(normalizedInput);
  const rc = resolutionPolicy(normalizedInput);
  const ec = encodePolicy(normalizedInput, deviceAv1Safe);
  const ac = audioPolicy(normalizedInput, deviceForceLimitedAudio);

  const globalTimeout = Number(input.addonTimeout) || 6000;
  const normalizedPresets = assertAddonPolicy(addonPolicy(normalizedInput, buildNuvioPresets(input), { defaultTimeout: globalTimeout }));
  const activePresets = normalizedPresets.presets;

  const dev = input.device;
  const is1080 = input.resolution === '1080p';
  const name = (input.name || '').trim() || `Core Nexus${input.resolution === '4k' ? ' 4K' : ''} — Nuvio TorBox Instant`;

  const eses = [];
  eses.push({ enabled:true, expression:"/* CB | Hard YouTube Kill */ type(streams,'youtube','external')" });
  eses.push({ enabled:true, expression:"/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')" });
  eses.push({ enabled:true, expression:"/* Auto-Hide SD */ count(resolution(streams,'1080p'))>=5 and count(resolution(streams,'720p'))>=5 ? resolution(streams,'480p','360p','SD') : []" });
  eses.push({ enabled:true, expression:"/* Auto-Hide 720p */ count(resolution(streams,'1080p'))>=15 or count(resolution(streams,'2160p'))>=15 ? resolution(streams,'720p') : []" });
  if (input.foreignLangKill !== false) {
    const langArgs = [...new Set([...(input.langs || ['English']),'Original','Multi','Dual Audio','Dubbed','Unknown'])].map(l=>`'${l}'`).join(',');
    eses.push({ enabled:true, expression:`/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, ${langArgs})), streams) : []` });
  }
  eses.push({ enabled:true, expression: "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')" });
  if (is1080) eses.push({ enabled:true, expression:"/* Hard Resolution Kill */ resolution(streams,'2160p','1440p')" });
  if (DV_ONLY_KILL_DEVICES.has(dev)) eses.push({ enabled:true, expression: "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))" });
  if (input.sizeLimit && input.sizeLimit !== 'unlimited') {
    eses.push({ enabled:true, expression:`/* Size Limit — max ${input.sizeLimit}GB */ size(streams,'1B','${input.sizeLimit}GB')` });
  }
  { const ae = generateAgeRatingESE(input.ageLimit); if (ae) eses.push(ae); }
  eses.push(...lateEpisodePackFallbackEses());

  const pses = [];
  const langs = input.langs || [];
  if (langs.length) pses.push({ enabled:true, expression:`/* Language Preference — ${langs.join('/')} */ language(streams,${langs.map(l=>`'${l}'`).join(',')})` });
  pses.push({ enabled:true, expression:"/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []" });
  const dv = deviceDvSafe.has(dev);
  const supportsAv1 = deviceAv1Safe.has(dev);
  const codecExpr = supportsAv1 ? "/* Codec Efficiency Booster */ encode(streams,'HEVC','AV1')" : "/* Codec Efficiency Booster */ encode(streams,'HEVC')";
  const pinLQ = { enabled:true, expression:"/* LQ Pin Bottom */ pin(releaseGroup(streams,'YIFY','RARBG','EVO','YTS','PSA','MeGusta','Tigole'),'bottom')" };
  pses.push(pinLQ);
  if (input.resolution === '4k' || input.resolution === 'mixed') {
    pses.push({ enabled:true, expression:"/* S-Tier 4K */ resolution(streams,'2160p')" }, { enabled:true, expression:"/* A-Tier 1080p */ resolution(streams,'1080p')" }, { enabled:true, expression:codecExpr });
  } else {
    pses.push({ enabled:true, expression:"/* S-Tier 1080p */ resolution(streams,'1080p')" }, { enabled:true, expression:"/* A-Tier 720p Fallback */ resolution(streams,'720p')" }, { enabled:true, expression:codecExpr });
  }
  pses.push({ enabled:true, expression:"/* Seeder Priority */ seeders(streams,5,99999)" });

  const _f = input.formatter === 'custom' && input.customFormatter
    ? input.customFormatter
    : formatters.find(f => f.id === (input.formatter || 'family-v4')) || formatters[0] || { name:'', d:'' };

  const cfg = {
    trusted: false, showChanges: true,
    addonName: name,
    addonLogo: 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/core_icon.svg',
    addonDescription: name,
    preferredQualities: ['BluRay REMUX','BluRay','WEB-DL','WEBRip','HDRip','HDTV'],
    excludedLanguages: [], includedLanguages: [],
    requiredLanguages: [...new Set([...(input.langs||['English']),'Original','Dual Audio','Multi','Dubbed','Unknown'])],
    preferredLanguages: [...new Set([...(input.langs||['English']),'Original','Dual Audio','Multi','Dubbed'])],
    preferredAudioTags: ac.preferredAudioTags,
    syncedRankedRegexUrls: ['https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json'],
    rankedRegexPatterns: [],
    excludedRegexPatterns: [...EXCLUDED_REGEX],
    addonCategoryColors: {Mix:'indigo',P2P:'orange',Subs:'purple'},
    mergedCatalogs: [], rpdbApiKey: 't0-free-rpdb', posterService: 'rpdb', enhanceResults: true,
    usePosterRedirectApi: true, usePosterServiceForMeta: true,
    ...(input.tmdbToken ? { tmdbAccessToken: input.tmdbToken } : {}),
    ...(input.tmdbApiKey ? { tmdbApiKey: input.tmdbApiKey } : {}),
    sortCriteria: sortPolicy({ ...input, service: 'p2p' }),
    deduplicator: { enabled:true, excludeAddons:[], multiGroupBehaviour:'aggressive', keys:['filename','infoHash','smartDetect'], cached:'disabled', uncached:'disabled', p2p:'per_addon', smartDetectAttributes:['size','resolution','quality','visualTags','audioTags','audioChannels','languages','encode','edition','network','remastered','bitrate','releaseGroup'], smartDetectRounding:10, libraryBehaviour:'ignore', tiebreakers:[{type:'torrent_seeders',position:'before_addon'},{type:'usenet_age',position:'before_addon'}] },
    formatter: { id:'tamtaro', definitions:{ overrides:{ tamtaro:{ name: _f.name, description: _f.d } } } },
    proxy: { id:'mediaflow', proxiedAddons:[], proxiedServices:[] },
    resultLimits: { global: rc.maxResults, resolution: rc.maxResultsPerResolution, mode: 'conjunctive' },
    size: sizePolicy(normalizedInput),
    bitrate: bitratePolicy(normalizedInput, hasTmdb),
    hideErrors: true, hideErrorsForResources: ['addon_catalog','catalog','subtitles'],
    digitalReleaseFilter: { enabled:hasTmdb, tolerance:7, requestTypes:['movie','series','anime'], addons:[] },
    autoPlay: { enabled:true, method:input.autoPlayMethod||'matchingFile', attributes:['resolution','quality','audioTags'] },
    precacheNextEpisode: false,
    preloadStreams: { enabled:false },
    cacheAndPlay: { enabled:false },
    nzbFailover: { enabled:false },
    areYouStillThere: { enabled:false },
    checkOwned: false, externalDownloads: false, autoRemoveDownloads: false,
    presets: activePresets,
    services: buildNuvioServices(),
    excludedResolutions: rc.excludedResolutions, includedResolutions: rc.includedResolutions, requiredResolutions: rc.requiredResolutions, preferredResolutions: rc.preferredResolutions,
    excludedQualities: [], includedQualities: [], requiredQualities: [],
    excludedEncodes: ec.excludedEncodes, preferredEncodes: ec.preferredEncodes,
    excludedAudioTags: ac.excludedAudioTags, preferredAudioChannels: ac.preferredAudioChannels,
    preferredVisualTags: visualTagsFor(input.device, input.resolution, input.architecture),
    enableSeadex: true, seadexBestOnly: false,
    excludeCached: false, excludeCachedFromAddons: [], excludeCachedFromServices: [], excludeCachedFromStreamTypes: [],
    excludeUncached: false, excludeUncachedFromAddons: [], excludeUncachedFromServices: [], excludeUncachedFromStreamTypes: [],
    excludeUncachedMode: 'or', excludedStreamSources: ['YouTube','AI Enhanced'],
    minSeeders: 1,
    preferredRegexPatterns: [],
    maxResults: rc.maxResults, maxResultsPerResolution: rc.maxResultsPerResolution,
    excludedStreamExpressions: eses,
    includedStreamExpressions: [
      { enabled:true, expression:"/* Protect Library & SeaDex */ passthrough(merge(library(streams), seadex(streams)), 'excluded')" },
      { enabled:true, expression:"/* Smart Play Pin */ pin(message(streams, 'includes', '🎯'), 'top')" },
      { enabled:true, expression:"/*Library*/ count(streams)==count(library(streams)) ? library(streams) : []" },
      { enabled:true, expression:"/*0Cached*/ count(merge(cached(streams),type(streams,'p2p','http','usenet','stremio-usenet')))==0 ? passthrough(streams,'title') : []" },
    ],
    preferredStreamExpressions: pses,
    dynamicAddonFetching: (function(){ const timeout = 6000;
      if (input.resolution === '4k') return { enabled:true, condition:`count(resolution(totalStreams,'2160p'))>=8 or totalTimeTaken>${timeout}` };
      return { enabled:true, condition:`count(resolution(totalStreams,'1080p'))>=20 or totalTimeTaken>${timeout}` };
    })(),
    titleMatching: { enabled:hasTmdb, mode:'contains', similarityThreshold:0.75, requestTypes:[], addons:[] },
    yearMatching: { enabled:hasTmdb, strict:false, useInitialAirDate:true, tolerance:2, requestTypes:[], addons:[] },
    seasonEpisodeMatching: { enabled:true, strict:false, requestTypes:[], addons:[] },
    groups: (function(){
      const skip = new Set(['Library','AIOSubtitle','OpenSubtitles','AIOStreams']);
      const active = activePresets.filter(p => p.enabled !== false && p.instanceId && !skip.has(p.options?.name || ''));
      const ids = active.map(p => p.instanceId);
      if (ids.length < 2) return { enabled:false, groupings:[] };
      const mid = Math.ceil(ids.length / 2);
      return { enabled:true, behaviour:'sequential', groupings:[
        { name:'Primary', addons:ids.slice(0, mid), condition:'true' },
        { name:'Secondary', addons:ids.slice(mid), condition:`count(totalStreams)<5 and totalTimeTaken<${6000}` },
      ]};
    })(),
  };

  const metadataId = options.metadata?.id || 'core-nuvio-000000';
  const result = {
    metadata: {
      id: metadataId, name,
      description: 'Connect TorBox in Nuvio Connected Services. Do not enter a TorBox API key in AIOStreams.',
      source: 'external', author: 'Branding-Brevity', version: '0.1.0', category: 'P2P',
      serviceRequired: false, setToSaveInstallMenu: true,
      sourceUrl: 'https://github.com/brevityA/Core-Builds',
      changelogUrl: 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/CHANGELOG.md',
      ...(options.metadata?.coreBuildsVersion ? { coreBuildsVersion: options.metadata.coreBuildsVersion } : {}),
      ...(options.metadata?.generatedAt ? { generatedAt: options.metadata.generatedAt } : {}),
    },
    config: sanitizeAioEnumArrays(cfg)
  };

  return result;
}

/**
 * Generate a complete AIOStreams template.
 *
 * @param {object} rawInput - All template parameters (service, device, resolution, etc.)
 * @param {object} [options] - Adapter-injected options
 * @param {object} [options.metadata] - Override metadata (coreBuildsVersion, generatedAt, id)
 * @param {Set} [options.deviceAv1Safe] - Set of AV1-capable device IDs
 * @param {Set} [options.deviceDvSafe] - Set of DV-capable device IDs
 * @param {Set} [options.deviceForceLimitedAudio] - Set of force-limited-audio device IDs
 * @param {Array} [options.formatters] - Formatter definitions array
 * @param {Array} [options.rankedRegexCommon] - Common ranked regex patterns
 * @param {Array} [options.rankedRegexUhd] - UHD-specific ranked regex patterns
 * @returns {{ metadata: object, config: object }} Complete AIOStreams template
 */
export function generateTemplate(rawInput = {}, options = {}) {
  const input = {
    ...rawInput,
    service: String(rawInput.service || 'torbox-pro'),
    device: String(rawInput.device || 'generic'),
    resolution: String(rawInput.resolution || '1080p'),
    architecture: String(rawInput.architecture || rawInput.pseArch || 'standard'),
    audio: String(rawInput.audio || 'standard'),
    content: String(rawInput.content || 'all'),
    matchMode: String(rawInput.matchMode || 'balanced'),
    cacheMode: String(rawInput.cacheMode || 'mixed'),
    streamPool: String(rawInput.streamPool || 'normal'),
    bandwidthMbps: Number(rawInput.bandwidthMbps) || 0,
    tmdbToken: String(rawInput.tmdbToken || '').trim(),
    tmdbApiKey: String(rawInput.tmdbApiKey || '').trim(),
    credentials: rawInput.credentials || {},
    langs: rawInput.langs || ['English'],
    multiServices: rawInput.multiServices || [],
    optionalScrapers: rawInput.optionalScrapers || [],
    formatter: rawInput.formatter || 'family-v4',
    outputProfile: String(rawInput.outputProfile || 'auto'),
    aiostreamsVersion: String(rawInput.aiostreamsVersion || '2.31.1'),
    simpleMode: Boolean(rawInput.simpleMode),
    quickStart: Boolean(rawInput.quickStart),
  };

  if (rawInput.route === 'nuvio-torbox-instant') {
    // Nuvio has its own specialised topology, but still inherits the global
    // no-synced-expression rule. Apply the non-destructive Advanced policy.
    return applyOutputProfile(
      generateNuvioTemplate(input, options),
      'advanced',
      { ...input, pseArch: input.architecture, outputProfile: 'advanced' },
    );
  }

  const deviceAv1Safe = options.deviceAv1Safe || new Set();
  const deviceDvSafe = options.deviceDvSafe || new Set();
  const deviceForceLimitedAudio = options.deviceForceLimitedAudio || new Set();
  const formatters = options.formatters || [];
  const rankedRegexCommon = options.rankedRegexCommon || [];
  const rankedRegexUhd = options.rankedRegexUhd || [];

  const normalizedInput = templateInput(input);
  const hasTmdb = hasTmdbCredentials(normalizedInput);
  const rc = resolutionPolicy(normalizedInput);
  const ec = encodePolicy(normalizedInput, deviceAv1Safe);
  const ac = audioPolicy(normalizedInput, deviceForceLimitedAudio);

  const useBase = !!(input.baseUuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(input.baseUuid).trim()));

  const globalTimeout = Number(input.addonTimeout) || 6000;
  const normalizedPresets = assertAddonPolicy(addonPolicy(normalizedInput, buildPresets(input), { defaultTimeout: globalTimeout }));
  const activePresets = normalizedPresets.presets;

  const name = (input.name || '').trim() || buildDefaultName(input);
  const isFree = input.service === 'p2p' || input.service === 'http';
  const isHighRes = input.resolution === '4k' || input.resolution === 'ultrawide' || input.resolution === 'mixed' || input.architecture === 'apex-mixed';

  const standaloneOnly = useBase ? {} : {
    preferredQualities: ['BluRay REMUX','BluRay','WEB-DL','WEBRip','HDRip','HDTV'],
    excludedLanguages: [], includedLanguages: [], requiredLanguages: [...new Set([...(input.langs||['English']),'Original','Dual Audio','Multi','Dubbed','Unknown'])], preferredLanguages: [...new Set([...(input.langs||['English']),'Original','Dual Audio','Multi','Dubbed'])],
    preferredAudioTags: ac.preferredAudioTags,
    syncedRankedRegexUrls: ['https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json'],
    rankedRegexPatterns: isFree ? [] : (isHighRes ? [...rankedRegexCommon,...rankedRegexUhd] : [...rankedRegexCommon]).map(r => ({...r})),
    excludedRegexPatterns: [...EXCLUDED_REGEX],
    addonCategoryColors: {Mix:'indigo',Debrid:'emerald',Usenet:'lime',HTTP:'cyan',P2P:'orange',Subs:'purple'},
    mergedCatalogs: [], rpdbApiKey: 't0-free-rpdb', posterService: 'rpdb', enhanceResults: true,
    usePosterRedirectApi: true, usePosterServiceForMeta: true,
    ...(input.tmdbToken ? { tmdbAccessToken: input.tmdbToken } : {}),
    ...(input.tmdbApiKey ? { tmdbApiKey: input.tmdbApiKey } : {}),
    sortCriteria: sortPolicy(input),
    deduplicator: (function(){ return { enabled:true, excludeAddons:[], multiGroupBehaviour: input.matchMode === 'relaxed' ? 'conservative' : 'aggressive', keys:isFree?['filename','infoHash','smartDetect']:['filename','infoHash','smartDetect'], cached: isFree ? 'disabled' : (input.matchMode === 'relaxed' ? 'per_service' : 'single_result'), uncached: isFree ? 'disabled' : 'per_service', p2p:'per_addon', smartDetectAttributes:['size','resolution','quality','visualTags','audioTags','audioChannels','languages','encode','edition','network','remastered','bitrate','releaseGroup'], smartDetectRounding: input.matchMode === 'strict' ? 5 : 10, libraryBehaviour: isFree ? 'ignore' : 'prefer', tiebreakers:[{type:'torrent_seeders',position:'before_addon'},{type:'usenet_age',position:'before_addon'}], ...(input.dedupMerge ? { merge: { enabled: true, failoverVariants: true, fields: [] } } : {}) }; })(),
    formatter: (function(){ const _f = input.formatter === 'custom' && input.customFormatter ? input.customFormatter : formatters.find(f => f.id === (input.formatter||'family-v4')) || formatters[0] || { name:'', d:'' }; return { id:'tamtaro', definitions:{ overrides:{ tamtaro:{ name: _f.name, description: _f.d } } } }; })(),
    proxy: { id:'mediaflow', proxiedAddons:[], proxiedServices: input.proxyEnabled ? (input.proxiedServices?.length ? [...input.proxiedServices] : []) : [] },
    resultLimits: { global: rc.maxResults, resolution: rc.maxResultsPerResolution, mode: 'conjunctive' },
    size: sizePolicy(normalizedInput),
    bitrate: bitratePolicy(normalizedInput, hasTmdb),
    hideErrors: true, hideErrorsForResources: ['addon_catalog','catalog','subtitles'],
    digitalReleaseFilter: { enabled:hasTmdb, tolerance:7, requestTypes:['movie','series','anime'], addons:[] },
    autoPlay: { enabled:true, method:input.autoPlayMethod||'matchingFile', attributes:['resolution','quality','audioTags'] },
    precacheNextEpisode: true,
    precacheSelector: "count(cached(streams)) == 0 ? slice(uncached(type(streams, 'debrid', 'usenet')), 0, 1) : []",
    precacheSingleStream: true,
    preloadStreams: { enabled:input.preloadEnabled!==false, selector:"slice(perGroup(cached(streams), 'resolution', 2), 0, 4)", singleStream:true },
    cacheAndPlay: { enabled:true, streamTypes:['usenet','torrent'] },
    nzbFailover: input.nzbFailover ? { enabled:true, position:input.nzbFailoverPosition==='before-torrents'?'first':'last', maxFailoverNzbs:Number(input.maxFailoverNzbs)||3 } : { enabled:false },
    areYouStillThere: { enabled:false },
    checkOwned: false, externalDownloads: false, autoRemoveDownloads: false,
    presets: activePresets, services: buildServices(input),
  };

  const cfg = {
    trusted: false, showChanges: true,
    addonName: name, addonLogo: 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Assets/core_icon.svg', addonDescription: name,
    ...standaloneOnly,
    excludedResolutions: rc.excludedResolutions, includedResolutions: rc.includedResolutions, requiredResolutions: rc.requiredResolutions, preferredResolutions: rc.preferredResolutions,
    excludedQualities: [], includedQualities: [], requiredQualities: [],
    excludedEncodes: ec.excludedEncodes, preferredEncodes: ec.preferredEncodes,
    excludedAudioTags: ac.excludedAudioTags, preferredAudioChannels: ac.preferredAudioChannels, preferredVisualTags: visualTagsFor(input.device, input.resolution, input.architecture),
    enableSeadex: input.content !== 'live', seadexBestOnly: input.content === 'anime',
    excludeCached: !isFree && input.cacheMode === 'uncached', excludeCachedFromAddons: [], excludeCachedFromServices: [], excludeCachedFromStreamTypes: [],
    excludeUncached: !isFree && input.cacheMode === 'cached', excludeUncachedFromAddons: [], excludeUncachedFromServices: [], excludeUncachedFromStreamTypes: [],
    excludeUncachedMode: 'or', excludedStreamSources: ['YouTube','AI Enhanced'],
    ...(input.service==='p2p' ? { minSeeders:1 } : {}),
    preferredRegexPatterns: isFree ? [] : (isHighRes ? PREFERRED_REGEX_4K : PREFERRED_REGEX_1080P),
    maxResults: rc.maxResults, maxResultsPerResolution: rc.maxResultsPerResolution,
    excludedStreamExpressions: buildEses(input),
    includedStreamExpressions: [
      { enabled:true, expression:"/* Protect Library & SeaDex */ passthrough(merge(library(streams), seadex(streams)), 'excluded')" },
      { enabled:true, expression:"/* Smart Play Pin */ pin(message(streams, 'includes', '🎯'), 'top')" },
      { enabled:true, expression:"/*Library*/ count(streams)==count(library(streams)) ? library(streams) : []" },
      ...(hasTmdb ? [{ enabled:true, expression:"/*digitalRelease Bypass*/ queryType=='movie' or queryType=='anime.movie' ? (count(passthrough(quality(streams,'CAM','TS','TC','SCR','WEBRip'),'digitalRelease'))>15 ? passthrough(quality(streams,'CAM','TS','TC','SCR','WEBRip'),'digitalRelease') : passthrough(streams,'digitalRelease')) : []" }] : []),
      { enabled:true, expression:"/*0Cached*/ count(merge(cached(streams),type(streams,'p2p','http','usenet','stremio-usenet')))==0 ? passthrough(streams,'title') : []" },
      { enabled:true, expression:"/*REPACK/PROPER Passthrough*/ count(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'))>0 ? passthrough(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'),'excluded','limit') : []" },
      ...(input.langExclusive && input.langs?.length ? [{
        enabled: true,
        expression: `/* Language Exclusive — only ${(input.langs||['English']).join('/')} */ language(streams,${[...new Set([...(input.langs||['English']),'Original','Multi','Dual Audio','Dubbed','Unknown'])].map(l=>`'${l}'`).join(',')})`
      }] : [])
    ],
    preferredStreamExpressions: buildPses(input, deviceAv1Safe, deviceDvSafe, deviceForceLimitedAudio),
    // Must stay in step with the configurator's rses(): package-equivalence.test.mjs diffs this
    // output against the Configurator goldens, and an omission here shows up as a sort-key
    // mismatch rather than a missing feature.
    rankedStreamExpressions: (input.service === 'http' || input.service === 'p2p') ? [] : rankedSelPolicy(input, {
      dv: deviceDvSafe.has(input.device),
      limitedAudio: input.audio === 'limited' || deviceForceLimitedAudio.has(input.device),
    }),
    dynamicAddonFetching: (function(){ const pool=input.streamPool||'normal', timeout=pool==='max'?10000:pool==='large'?8000:6000, wrap=expr=>isFree?expr:`cached(${expr})`;
      if(input.resolution==='4k'){ const c4k=pool==='max'?25:pool==='large'?15:8; return{enabled:true,condition:`count(${wrap("resolution(totalStreams,'2160p')")})>=${c4k} or totalTimeTaken>${timeout}`}; }
      if(input.resolution==='ultrawide'){ return{enabled:true,condition:`count(${wrap("resolution(totalStreams,'1080p')")})>=15 or count(${wrap("resolution(totalStreams,'2160p')")})>=5 or totalTimeTaken>${timeout}`}; }
      if(input.resolution==='mixed'||input.architecture==='apex-mixed'){ const c1m=pool==='max'?35:pool==='large'?22:12, c4m=pool==='max'?20:pool==='large'?12:6; return{enabled:true,condition:`count(${wrap("resolution(totalStreams,'1080p')")})>=${c1m} or count(${wrap("resolution(totalStreams,'2160p')")})>=${c4m} or totalTimeTaken>${timeout}`}; }
      const c1k=pool==='max'?45:pool==='large'?30:20; return{enabled:true,condition:`count(${wrap("resolution(totalStreams,'1080p')")})>=${c1k} or totalTimeTaken>${timeout}`}; })(),
    titleMatching: { enabled:hasTmdb, mode:'contains', similarityThreshold:0.75, requestTypes:[], addons:[] },
    yearMatching: { enabled:hasTmdb, strict:false, useInitialAirDate:true, tolerance:2, requestTypes:[], addons:[] },
    seasonEpisodeMatching: { enabled:true, strict:false, requestTypes:[], addons:[] },
    groups: (function(){
      const pool=input.streamPool||'normal', timeout=pool==='max'?10000:pool==='large'?8000:6000;
      const threshold=isFree?5:(input.resolution==='4k'?4:input.resolution==='ultrawide'?12:8);
      const wrap=isFree?'totalStreams':'cached(totalStreams)';
      const skip=new Set(['Library','AIOSubtitle','OpenSubtitles','AIOStreams']);
      const active=activePresets.filter(p=>p.enabled!==false&&p.instanceId&&!skip.has(p.options?.name||''));
      const ids=active.map(p=>p.instanceId);
      if(ids.length<2) return {enabled:false,groupings:[]};
      const mid=Math.ceil(ids.length/2);
      const g1=ids.slice(0,mid), g2=ids.slice(mid);
      const groupings=[{name:'Primary',addons:g1,condition:'true'}];
      if(g2.length) groupings.push({name:'Secondary',addons:g2,condition:`count(${wrap})<${threshold} and totalTimeTaken<${timeout}`});
      return {enabled:true,behaviour:'sequential',groupings};
    })(),
  };

  const metadataId = options.metadata?.id || 'core-custom-000000';
  const result = {
    metadata: {
      id: metadataId,
      name,
      description: 'Custom template generated by Core Builds Configurator.',
      source: 'external',
      author: 'Branding-Brevity',
      version: '0.1.0',
      category: (input.service==='p2p'?'P2P':input.service==='http'?'HTTP':'Debrid'),
      serviceRequired: false,
      setToSaveInstallMenu: true,
      sourceUrl: 'https://github.com/brevityA/Core-Builds',
      changelogUrl: 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/CHANGELOG.md',
      ...(options.metadata?.coreBuildsVersion ? { coreBuildsVersion: options.metadata.coreBuildsVersion } : {}),
      ...(options.metadata?.generatedAt ? { generatedAt: options.metadata.generatedAt } : {}),
    },
    config: cfg
  };

  if (useBase) {
    result.parentConfig = {
      uuid: String(input.baseUuid).trim(),
      password: input.basePassword || '',
      mergeStrategies: {
        presets: 'extend', services: 'inherit', filters: 'override',
        sorting: 'inherit', formatter: 'inherit', branding: 'override',
        proxy: 'inherit', metadata: 'inherit', misc: 'inherit'
      }
    };
  }

  result.config = sanitizeAioEnumArrays(result.config);

  const profileContext = {
    outputProfile: input.outputProfile,
    simpleMode: input.simpleMode,
    quickStart: input.quickStart,
    pseArch: input.architecture,
    service: input.service,
    multiServices: input.multiServices,
    optionalScrapers: input.optionalScrapers,
    resolution: input.resolution,
    content: input.content,
    langs: input.langs,
    langExclusive: Boolean(input.langExclusive),
    sizeLimit: input.sizeLimit,
    bandwidthMbps: input.bandwidthMbps,
    cacheMode: input.cacheMode,
    aiostreamsVersion: input.aiostreamsVersion,
  };
  return applyOutputProfile(result, resolveOutputProfile(profileContext), profileContext);
}
