export const BADGE_ASSET_BASE = 'https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/tools/badges/assets';

const boundary = (value) => `(?:^|[^a-z0-9])(?:${value})(?:$|[^a-z0-9])`;
const contains = (value, exclude = '') =>
  `(?i)^${exclude ? `(?![\\s\\S]*(?:${exclude}))` : ''}[\\s\\S]*${boundary(value)}[\\s\\S]*$`;

export const THEMES = Object.freeze({
  neon: {
    id: 'neon',
    name: 'Core Neon',
    description: 'Category colour, dark glass fill, and a crisp Core glow.',
    tagAlpha: 'C7',
    borderAlpha: 'FF',
    textColor: '#FFFFFFFF',
  },
  mono: {
    id: 'mono',
    name: 'Monochrome',
    description: 'Neutral slate badges that keep the stream row quiet.',
    tagColor: '#E6121720',
    borderColor: '#FF6B7280',
    textColor: '#FFFFFFFF',
  },
  contrast: {
    id: 'contrast',
    name: 'High Contrast',
    description: 'Opaque black badges with white borders for maximum legibility.',
    tagColor: '#FF000000',
    borderColor: '#FFFFFFFF',
    textColor: '#FFFFFFFF',
  },
});

export const GROUPS = Object.freeze([
  { id:'resolution', name:'Resolution', short:'RES', description:'4K through SD resolution classes.', essential:true, color:'#8B5CF6' },
  { id:'quality', name:'Quality & source', short:'SRC', description:'Remux, disc, web, broadcast, and low-quality sources.', essential:true, color:'#00D4FF' },
  { id:'visual', name:'Visual', short:'HDR', description:'Dolby Vision, HDR variants, IMAX, bit depth, and 3D.', essential:true, color:'#F59E0B' },
  { id:'audio', name:'Audio', short:'AUD', description:'Lossless, object-based, Dolby, DTS, and common codecs.', essential:true, color:'#EC4899' },
  { id:'channels', name:'Channels', short:'CH', description:'Common audio channel layouts.', essential:true, color:'#14B8A6' },
  { id:'codec', name:'Video codec', short:'VID', description:'AV1, HEVC, AVC, VC-1, XviD, and DivX.', essential:true, color:'#3B82F6' },
  { id:'status', name:'Playback state', short:'PLAY', description:'Cached, uncached, library, P2P, and proxied state.', essential:false, color:'#22C55E' },
  { id:'ranking', name:'Release tiers', short:'TIER', description:'Matched Remux, BluRay, WEB, and penalty tiers.', essential:false, color:'#EAB308' },
  { id:'trust', name:'Trust & torrent', short:'TRUST', description:'SeaDex, premier groups, freeleech, and packs.', essential:false, color:'#A855F7' },
  { id:'editions', name:'Editions & special', short:'CUT', description:'Cuts, editions, fixes, and presentation variants.', essential:false, color:'#F97316' },
  { id:'network', name:'Streaming source', short:'NET', description:'Recognised streaming-service sources.', essential:false, color:'#06B6D4' },
  { id:'language', name:'Audio language', short:'LANG', description:'Common audio-language and dubbing indicators.', essential:false, color:'#10B981' },
  { id:'subtitles', name:'Subtitles', short:'SUB', description:'Common subtitle-language indicators.', essential:false, color:'#64748B' },
]);

const rawBadges = [
  // Resolution
  ['resolution','res-4k','4K','4K', contains('2160p|4k|uhd'), ['stream.resolution','match','^(?:2160p|4k|uhd)$']],
  ['resolution','res-1440p','1440p','1440P', contains('1440p|2k'), ['stream.resolution','match','^(?:1440p|2k)$']],
  ['resolution','res-1080p','1080p','1080P', contains('1080p|fhd|full[ ._-]?hd'), ['stream.resolution','match','^(?:1080p|fhd|full[ ._-]?hd)$']],
  ['resolution','res-720p','720p','720P', contains('720p'), ['stream.resolution','match','^720p$']],
  ['resolution','res-576p','576p','576P', contains('576p'), ['stream.resolution','match','^576p$']],
  ['resolution','res-480p','480p','480P', contains('480p'), ['stream.resolution','match','^480p$']],
  ['resolution','res-360p','360p','360P', contains('360p'), ['stream.resolution','match','^360p$']],
  ['resolution','res-240p','240p','240P', contains('240p'), ['stream.resolution','match','^240p$']],
  ['resolution','res-144p','144p','144P', contains('144p'), ['stream.resolution','match','^144p$']],

  // Quality / source. Lower tiers explicitly exclude their higher-tier overlaps.
  ['quality','src-remux','Remux','REMUX', contains('(?:bd|uhd)?[ ._-]?remux'), ['stream.quality','match','remux']],
  ['quality','src-bluray','BluRay','BLURAY', contains('blu[ ._-]?ray|b[dr][ ._-]?rip', '\\b(?:bd|uhd)?[ ._-]?remux\\b'), ['stream.quality','match','^(?:blu[ ._-]?ray|b[dr][ ._-]?rip)$']],
  ['quality','src-webdl','WEB-DL','WEB-DL', contains('web[ ._-]?dl|webdl'), ['stream.quality','match','^web[ ._-]?dl$']],
  ['quality','src-webrip','WEBRip','WEBRIP', contains('web[ ._-]?rip|webrip'), ['stream.quality','match','^web[ ._-]?rip$']],
  ['quality','src-hdtv','HDTV','HDTV', contains('hdtv'), ['stream.quality','match','^hdtv$']],
  ['quality','src-hdrip','HDRip','HDRIP', contains('hd[ ._-]?rip'), ['stream.quality','match','^hd[ ._-]?rip$']],
  ['quality','src-dvdrip','DVDRip','DVDRIP', contains('dvd[ ._-]?rip'), ['stream.quality','match','^dvd[ ._-]?rip$']],
  ['quality','src-dvd','DVD','DVD', contains('dvd', 'dvd[ ._-]?(?:rip|scr)'), ['stream.quality','match','^dvd$']],
  ['quality','src-cam','CAM','CAM', contains('cam(?:rip)?|hdcam'), ['stream.quality','match','^(?:cam(?:rip)?|hdcam)$']],
  ['quality','src-ts','Telesync','TS', contains('telesync|hdts|cam[ ._-]?ts'), ['stream.quality','match','^(?:telesync|hdts|ts)$']],

  // Visual
  ['visual','vis-dv','Dolby Vision','DOLBY VISION', contains('dolby[ ._-]?vision|dovi|dv'), ['stream.visualTags','match','dolby[ ._-]?vision|dovi|^dv$']],
  ['visual','vis-hdr10plus','HDR10+','HDR10+', contains('hdr[ ._-]?10[ ._-]?(?:\\+|plus|p)'), ['stream.visualTags','match','hdr[ ._-]?10[ ._-]?(?:\\+|plus|p)']],
  ['visual','vis-hdr10','HDR10','HDR10', contains('hdr[ ._-]?10', 'hdr[ ._-]?10[ ._-]?(?:\\+|plus|p)'), ['stream.visualTags','match','^hdr[ ._-]?10$']],
  ['visual','vis-hdr','HDR','HDR', contains('hdr', 'hdr[ ._-]?10|dolby[ ._-]?vision|dovi|\\bdv\\b'), ['stream.visualTags','match','^hdr$']],
  ['visual','vis-hlg','HLG','HLG', contains('hlg'), ['stream.visualTags','match','^hlg$']],
  ['visual','vis-sdr','SDR','SDR', contains('sdr|standard[ ._-]?range'), ['stream.visualTags','match','^(?:sdr|standard)$']],
  ['visual','vis-10bit','10-bit','10-BIT', contains('10[ ._-]?bit|hi10p'), ['stream.visualTags','match','10[ ._-]?bit|hi10p']],
  ['visual','vis-imax-enhanced','IMAX Enhanced','IMAX ENH', contains('imax[ ._-]?enhanced'), ['stream.editions','match','imax[ ._-]?enhanced']],
  ['visual','vis-imax','IMAX','IMAX', contains('imax', 'imax[ ._-]?enhanced'), ['stream.editions','match','^imax$']],
  ['visual','vis-3d','3D','3D', contains('3d|sbs|tab'), ['stream.visualTags','match','^(?:3d|sbs|tab)$']],
  ['visual','vis-upscaled','Upscaled','UPSCALED', contains('upscaled?|uprez|ai[ ._-]?enhanced'), ['stream.upscaled','true','']],

  // Audio
  ['audio','aud-atmos','Dolby Atmos','ATMOS', contains('atmos'), ['stream.audioTags','match','atmos']],
  ['audio','aud-truehd','TrueHD','TRUEHD', contains('true[ ._-]?hd'), ['stream.audioTags','match','true[ ._-]?hd']],
  ['audio','aud-ddplus','Dolby Digital+','DD+', contains('e[ ._-]?ac[ ._-]?3|ddp(?:[ ._-]?[0-9])?|dd\\+(?:[ ._-]?[0-9])?|dolby[ ._-]?digital[ ._-]?plus'), ['stream.audioTags','match','e[ ._-]?ac[ ._-]?3|ddp|dd\\+']],
  ['audio','aud-dd','Dolby Digital','DD', contains('ac[ ._-]?3|dolby[ ._-]?digital|dd', 'e[ ._-]?ac[ ._-]?3|ddp|dd\\+|digital[ ._-]?plus'), ['stream.audioTags','match','^(?:ac[ ._-]?3|dd)$']],
  ['audio','aud-dtsx','DTS:X','DTS:X', contains('dts[ ._:-]?x'), ['stream.audioTags','match','dts[ ._:-]?x']],
  ['audio','aud-dtshdma','DTS-HD MA','DTS-HD MA', contains('dts[ ._-]?hd[ ._-]?ma|dts[ ._-]?ma'), ['stream.audioTags','match','dts[ ._-]?(?:hd[ ._-]?)?ma']],
  ['audio','aud-dtshd','DTS-HD','DTS-HD', contains('dts[ ._-]?hd', 'dts[ ._-]?hd[ ._-]?ma|dts[ ._:-]?x'), ['stream.audioTags','match','^dts[ ._-]?hd$']],
  ['audio','aud-dts','DTS','DTS', contains('dts', 'dts[ ._-]?(?:hd|ma)|dts[ ._:-]?x'), ['stream.audioTags','match','^dts$']],
  ['audio','aud-flac','FLAC','FLAC', contains('flac'), ['stream.audioTags','match','^flac$']],
  ['audio','aud-pcm','PCM','PCM', contains('l?pcm'), ['stream.audioTags','match','^l?pcm$']],
  ['audio','aud-opus','Opus','OPUS', contains('opus'), ['stream.audioTags','match','^opus$']],
  ['audio','aud-aac','AAC','AAC', contains('aac'), ['stream.audioTags','match','^aac$']],
  ['audio','aud-mp3','MP3','MP3', contains('mp3'), ['stream.audioTags','match','^mp3$']],
  ['audio','aud-vorbis','Vorbis','VORBIS', contains('vorbis'), ['stream.audioTags','match','^vorbis$']],

  // Channels
  ['channels','ch-71','7.1 channels','7.1', contains('7[ .]1|8ch'), ['stream.audioChannels','match','^(?:7[ .]1|8ch)$']],
  ['channels','ch-61','6.1 channels','6.1', contains('6[ .]1|7ch'), ['stream.audioChannels','match','^(?:6[ .]1|7ch)$']],
  ['channels','ch-51','5.1 channels','5.1', contains('5[ .]1|6ch'), ['stream.audioChannels','match','^(?:5[ .]1|6ch)$']],
  ['channels','ch-20','2.0 channels','2.0', contains('2[ .]0|2ch|stereo'), ['stream.audioChannels','match','^(?:2[ .]0|2ch|stereo)$']],
  ['channels','ch-10','1.0 channel','1.0', contains('1[ .]0|1ch|mono'), ['stream.audioChannels','match','^(?:1[ .]0|1ch|mono)$']],

  // Video codecs
  ['codec','codec-av1','AV1','AV1', contains('av1'), ['stream.encode','match','^av1$']],
  ['codec','codec-hevc','HEVC / H.265','HEVC', contains('hevc|h[ ._-]?265|x265'), ['stream.encode','match','^(?:hevc|h[ ._-]?265|x265)$']],
  ['codec','codec-avc','AVC / H.264','AVC', contains('avc|h[ ._-]?264|x264'), ['stream.encode','match','^(?:avc|h[ ._-]?264|x264)$']],
  ['codec','codec-vc1','VC-1','VC-1', contains('vc[ ._-]?1'), ['stream.encode','match','^vc[ ._-]?1$']],
  ['codec','codec-xvid','XviD','XVID', contains('xvid'), ['stream.encode','match','^xvid$']],
  ['codec','codec-divx','DivX','DIVX', contains('divx'), ['stream.encode','match','^divx$']],

  // Playback state (AIO Enhanced is the reliable path for the first three).
  ['status','status-cached','Cached / instant','CACHED', contains('cached|instant|plays[ ._-]?fast', 'uncached|not[ ._-]?cached'), ['service.cached','true','']],
  ['status','status-uncached','Uncached','UNCACHED', contains('uncached|not[ ._-]?cached'), ['service.cached','false','']],
  ['status','status-library','Library','LIBRARY', contains('library'), ['stream.library','true','']],
  ['status','status-p2p','P2P','P2P', contains('p2p|torrent'), ['stream.type','match','^p2p$']],
  ['status','status-proxied','Proxied','PROXIED', contains('proxied|proxy'), ['stream.proxied','true','']],

  // Ranked stream-expression labels.
  ['ranking','tier-remux-t1','Remux T1','REMUX T1', contains('remux[ ._-]?t1'), ['stream.rseMatched','match','remux[ ._-]?t1']],
  ['ranking','tier-remux-t2','Remux T2','REMUX T2', contains('remux[ ._-]?t2'), ['stream.rseMatched','match','remux[ ._-]?t2']],
  ['ranking','tier-bluray-t1','BluRay T1','BLURAY T1', contains('blu[ ._-]?ray[ ._-]?t1'), ['stream.rseMatched','match','blu[ ._-]?ray[ ._-]?t1']],
  ['ranking','tier-bluray-t2','BluRay T2','BLURAY T2', contains('blu[ ._-]?ray[ ._-]?t2'), ['stream.rseMatched','match','blu[ ._-]?ray[ ._-]?t2']],
  ['ranking','tier-web-t1','WEB T1','WEB T1', contains('web[ ._-]?t1'), ['stream.rseMatched','match','web[ ._-]?t1']],
  ['ranking','tier-web-t2','WEB T2','WEB T2', contains('web[ ._-]?t2'), ['stream.rseMatched','match','web[ ._-]?t2']],
  ['ranking','tier-penalty','Penalty / bad','PENALTY', contains('bad|penalty|low[ ._-]?quality'), ['stream.rseMatched','match','bad|penalty|low[ ._-]?quality']],

  // Trust and torrent state.
  ['trust','trust-seadex-best','SeaDex Best','SEADEX BEST', contains('seadex[ ._-]?best|best[ ._-]?release'), ['stream.seadexBest','true','']],
  ['trust','trust-seadex','SeaDex','SEADEX', contains('seadex', 'seadex[ ._-]?best'), ['stream.seadex','true','']],
  ['trust','trust-premier','Premier group','PREMIER', contains('framestor|epsilon|flux|ntb|qxr|tigole|d[ ._-]?z0n3|hifi|don|huno|bmf'), ['stream.releaseGroup','match','framestor|epsilon|flux|ntb|qxr|tigole|d[ ._-]?z0n3|hifi|don|huno|bmf']],
  ['trust','trust-freeleech','Freeleech','FREELEECH', contains('freeleech'), ['stream.freeleech','true','']],
  ['trust','trust-season-pack','Season pack','SEASON PACK', contains('season[ ._-]?pack|complete[ ._-]?season'), ['stream.seasonPack','true','']],

  // Editions and special flags.
  ['editions','edition-director','Director’s Cut','DIRECTOR CUT', contains("director'?s?[ ._-]?cut|dir[ ._-]?cut"), ['stream.editions','match',"director'?s?[ ._-]?cut|dir[ ._-]?cut"]],
  ['editions','edition-extended','Extended','EXTENDED', contains('extended(?:[ ._-]?(?:cut|edition))?'), ['stream.editions','match','extended']],
  ['editions','edition-theatrical','Theatrical','THEATRICAL', contains('theatrical(?:[ ._-]?cut)?'), ['stream.editions','match','theatrical']],
  ['editions','edition-criterion','Criterion','CRITERION', contains('criterion'), ['stream.editions','match','criterion']],
  ['editions','edition-open-matte','Open Matte','OPEN MATTE', contains('open[ ._-]?matte'), ['stream.editions','match','open[ ._-]?matte']],
  ['editions','edition-hybrid','Hybrid','HYBRID', contains('hybrid'), ['stream.editions','match','hybrid']],
  ['editions','edition-repack','REPACK / PROPER','REPACK', contains('repack|proper'), ['stream.repack','true','']],
  ['editions','edition-remastered','Remastered','REMASTERED', contains('remaster(?:ed)?'), ['stream.remastered','true','']],
  ['editions','edition-uncensored','Uncensored','UNCENSORED', contains('uncensored'), ['stream.uncensored','true','']],
  ['editions','edition-unrated','Unrated','UNRATED', contains('unrated'), ['stream.unrated','true','']],
  ['editions','edition-blackwhite','Black & white','B&W', contains('black[ ._-]?(?:and|&)[ ._-]?white|authentic[ ._-]?bw'), ['stream.editions','match','black[ ._-]?(?:and|&)[ ._-]?white|authentic[ ._-]?bw']],

  // Streaming source/network.
  ['network','net-netflix','Netflix','NETFLIX', contains('netflix|nflx|nf'), ['stream.network','match','netflix|nflx|^nf$']],
  ['network','net-prime','Prime Video','PRIME VIDEO', contains('amazon[ ._-]?prime|prime[ ._-]?video|amzn'), ['stream.network','match','amazon|prime|amzn']],
  ['network','net-apple','Apple TV+','APPLE TV+', contains('apple[ ._-]?tv|atvp'), ['stream.network','match','apple[ ._-]?tv|atvp|itunes']],
  ['network','net-disney','Disney+','DISNEY+', contains('disney\\+?|dsnp'), ['stream.network','match','disney|dsnp']],
  ['network','net-max','Max','MAX', contains('hbo[ ._-]?max|hmax|\\bmax\\b'), ['stream.network','match','hbo[ ._-]?max|hmax|^max$']],
  ['network','net-hulu','Hulu','HULU', contains('hulu'), ['stream.network','match','hulu']],
  ['network','net-peacock','Peacock','PEACOCK', contains('peacock|pcok'), ['stream.network','match','peacock|pcok']],
  ['network','net-paramount','Paramount+','PARAMOUNT+', contains('paramount\\+?|pmtp|pamp'), ['stream.network','match','paramount|pmtp|pamp']],
  ['network','net-crunchyroll','Crunchyroll','CRUNCHYROLL', contains('crunchyroll|croll'), ['stream.network','match','crunchyroll|croll']],

  // Audio languages.
  ['language','lang-en','English audio','EN AUDIO', contains('english|\\beng\\b'), ['stream.languages','match','english|^eng$']],
  ['language','lang-es','Spanish audio','ES AUDIO', contains('spanish|castellano|\\bspa\\b'), ['stream.languages','match','spanish|castellano|^spa$']],
  ['language','lang-fr','French audio','FR AUDIO', contains('french|\\bfre\\b|\\bfra\\b'), ['stream.languages','match','french|^fre$|^fra$']],
  ['language','lang-de','German audio','DE AUDIO', contains('german|deutsch|\\bger\\b|\\bdeu\\b'), ['stream.languages','match','german|deutsch|^ger$|^deu$']],
  ['language','lang-it','Italian audio','IT AUDIO', contains('italian|italiano|\\bita\\b'), ['stream.languages','match','italian|italiano|^ita$']],
  ['language','lang-pt','Portuguese audio','PT AUDIO', contains('portuguese|português|\\bpor\\b'), ['stream.languages','match','portuguese|português|^por$']],
  ['language','lang-ja','Japanese audio','JA AUDIO', contains('japanese|\\bjpn\\b|\\bja\\b'), ['stream.languages','match','japanese|^jpn$|^ja$']],
  ['language','lang-ko','Korean audio','KO AUDIO', contains('korean|\\bkor\\b|\\bko\\b'), ['stream.languages','match','korean|^kor$|^ko$']],
  ['language','lang-multi','Multi audio','MULTI AUDIO', contains('multi[ ._-]?(?:audio)?|dual[ ._-]?audio'), ['stream.languages','match','multi|dual[ ._-]?audio']],
  ['language','lang-dubbed','Dubbed','DUBBED', contains('dubbed|dual[ ._-]?audio'), ['stream.dubbed','true','']],

  // Subtitle indicators. Emoji markers are used by AIO Enhanced where available.
  ['subtitles','sub-en','English subtitles','EN SUB', contains('english[ ._-]?sub|\\beng[ ._-]?sub'), ['stream.uSubtitleEmojis','match','🇬🇧|🇺🇸']],
  ['subtitles','sub-es','Spanish subtitles','ES SUB', contains('spanish[ ._-]?sub|\\bspa[ ._-]?sub'), ['stream.uSubtitleEmojis','match','🇪🇸']],
  ['subtitles','sub-fr','French subtitles','FR SUB', contains('french[ ._-]?sub|\\bfr[ ._-]?sub'), ['stream.uSubtitleEmojis','match','🇫🇷']],
  ['subtitles','sub-de','German subtitles','DE SUB', contains('german[ ._-]?sub|\\bde[ ._-]?sub'), ['stream.uSubtitleEmojis','match','🇩🇪']],
  ['subtitles','sub-it','Italian subtitles','IT SUB', contains('italian[ ._-]?sub|\\bit[ ._-]?sub'), ['stream.uSubtitleEmojis','match','🇮🇹']],
  ['subtitles','sub-pt','Portuguese subtitles','PT SUB', contains('portuguese[ ._-]?sub|\\bpt[ ._-]?sub'), ['stream.uSubtitleEmojis','match','🇵🇹|🇧🇷']],
  ['subtitles','sub-ja','Japanese subtitles','JA SUB', contains('japanese[ ._-]?sub|\\bja[ ._-]?sub'), ['stream.uSubtitleEmojis','match','🇯🇵']],
  ['subtitles','sub-ko','Korean subtitles','KO SUB', contains('korean[ ._-]?sub|\\bko[ ._-]?sub'), ['stream.uSubtitleEmojis','match','🇰🇷']],
  ['subtitles','sub-any','Subtitles present','SUBTITLES', contains('subbed|subtitles?|\\bsubs?\\b'), ['stream.subbed','true','']],
];

const groupById = new Map(GROUPS.map((group) => [group.id, group]));

export const BADGES = Object.freeze(rawBadges.map((entry, index) => {
  const [groupId, id, name, assetLabel, pattern, markerRule] = entry;
  const group = groupById.get(groupId);
  if (!group) throw new Error(`Unknown badge group: ${groupId}`);
  return Object.freeze({
    groupId,
    id,
    name,
    assetLabel,
    pattern,
    markerRule: Object.freeze(markerRule),
    markerCode: index + 1,
    defaultEnabled: group.essential,
    asset: `${id}.png`,
  });
}));

export const SAMPLE_RELEASES = Object.freeze([
  {
    id:'remux',
    label:'4K Remux',
    text:'Example.Movie.2026.2160p.UHD.BluRay.REMUX.DV.HDR10.TrueHD.Atmos.7.1.HEVC-FraMeSToR',
  },
  {
    id:'web',
    label:'1080p WEB-DL',
    text:'Example.Show.S02E03.1080p.NF.WEB-DL.DDP5.1.Atmos.H.264-FLUX',
  },
  {
    id:'anime',
    label:'Anime release',
    text:'[Group] Example Anime - 08 [1080p][WEB-DL][AV1][10bit][AAC 2.0][Japanese][English Subs]',
  },
  {
    id:'fallback',
    label:'Low-quality fallback',
    text:'Example.Movie.2026.720p.HDCAM.AC3.2.0.x264',
  },
]);

export function defaultBuilderState() {
  return {
    version: 1,
    mode: 'enhanced',
    theme: 'neon',
    selectedIds: BADGES.filter((badge) => badge.defaultEnabled).map((badge) => badge.id),
    groupOrder: GROUPS.map((group) => group.id),
    badgeOrder: BADGES.map((badge) => badge.id),
    groupColors: Object.fromEntries(GROUPS.map((group) => [group.id, group.color])),
    sample: SAMPLE_RELEASES[0].text,
  };
}
