/**
 * Shared SEL policy data — authoritative expression sets for each architecture.
 *
 * Extracted from golden E2E fixtures. Do not edit by hand; regenerate with
 * scripts/generate-sel-policy-data.mjs or update via the baseline workflow.
 *
 * No browser globals, no credentials, no UI state.
 */

/** Apex Mixed PSE stack — extracted from the 4K Apex Mixed nightly template. */
export const APEX_MIXED_PSES = [
  {
    "expression": "/* 4K */ resolution(streams, '2160p')",
    "enabled": true
  },
  {
    "expression": "/* 1080p */ resolution(streams, '1080p')",
    "enabled": true
  },
  {
    "expression": "/* 720p */ resolution(streams, '720p')",
    "enabled": true
  },
  {
    "expression": "/* Remux first */ quality(streams, 'Bluray REMUX', 'BluRay')",
    "enabled": true
  },
  {
    "expression": "/* Web-DL over WebRip */ quality(streams, 'WEB-DL', 'WEBRip')",
    "enabled": true
  },
  {
    "expression": "/* HDR / DV */ visualTag(streams, 'HDR+DV', 'DV', 'HDR10+', 'HDR10', 'HDR')",
    "enabled": true
  },
  {
    "expression": "/* HEVC / AV1 preferred */ encode(streams, 'HEVC', 'AV1')",
    "enabled": true
  },
  {
    "expression": "/* Cached priority */ cached(streams)",
    "enabled": true
  },
  {
    "expression": "/* Usenet + Debrid boost */ type(streams, 'usenet', 'debrid')",
    "enabled": true
  },
  {
    "expression": "/* Anime original audio */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(streams, 'Japanese', 'Multi') : []",
    "enabled": true
  },
  {
    "expression": "/* 4K Remux — adaptive bitrate (IQR ≥4, min/max 1-3, 15GB floor) */ count(resolution(quality(streams,'Bluray REMUX'),'2160p'))>=4 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'2160p'), q1(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate')) - 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate')), q3(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate')) + 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))), '15GB') : count(resolution(quality(streams,'Bluray REMUX'),'2160p'))>0 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'2160p'), min(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))*0.80, max(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))*1.20), '15GB') : []",
    "enabled": true
  },
  {
    "expression": "/* 4K WEB-DL HDR — adaptive bitrate + age decay (pow 0.95/d) */ count(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'))>=4 ? bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), q1(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')) - 1.5*iqr(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')), q3(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')) + 1.5*iqr(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))) : count(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'))>0 ? bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), min(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))*0.80, max(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))*1.20) : (count(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01)), median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1+0.4*max(0.3,1-daysSinceRelease*0.01)))))>=1 ? bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01))) : []",
    "enabled": true
  },
  {
    "expression": "/* 4K WEB-DL SDR — adaptive bitrate (no HDR tags) */ count(resolution(quality(streams,'WEB-DL'),'2160p'))>=4 ? bitrate(resolution(quality(streams,'WEB-DL'),'2160p'), q1(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate')) - 1.5*iqr(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate')), q3(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate')) + 1.5*iqr(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))) : count(resolution(quality(streams,'WEB-DL'),'2160p'))>0 ? bitrate(resolution(quality(streams,'WEB-DL'),'2160p'), min(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))*0.80, max(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))*1.20) : []",
    "enabled": true
  },
  {
    "expression": "/* 1080p Remux — adaptive bitrate + 8GB floor */ count(resolution(quality(streams,'Bluray REMUX'),'1080p'))>=4 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'1080p'), q1(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate')) - 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate')), q3(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate')) + 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate'))), '8GB') : count(resolution(quality(streams,'Bluray REMUX'),'1080p'))>0 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'1080p'), min(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate'))*0.80, max(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate'))*1.20), '8GB') : []",
    "enabled": true
  },
  {
    "expression": "/* Limit 4K Remux */ slice(resolution(quality(streams, 'Bluray REMUX'), '2160p'), 0, 3)",
    "enabled": true
  },
  {
    "expression": "/* Limit 4K Bluray */ slice(resolution(quality(streams, 'Bluray'), '2160p'), 0, 3)",
    "enabled": true
  },
  {
    "expression": "/* Limit 4K WEB-DL */ slice(resolution(quality(streams, 'WEB-DL'), '2160p'), 0, 3)",
    "enabled": true
  },
  {
    "expression": "/* Limit 1080p Remux */ slice(resolution(quality(streams, 'Bluray REMUX'), '1080p'), 0, 3)",
    "enabled": true
  },
  {
    "expression": "/* Limit 1080p Bluray */ slice(resolution(quality(streams, 'Bluray'), '1080p'), 0, 3)",
    "enabled": true
  },
  {
    "expression": "/* Limit 1080p WEB-DL */ slice(resolution(quality(streams, 'WEB-DL'), '1080p'), 0, 3)",
    "enabled": true
  },
  {
    "expression": "/* Limit 720p WEB-DL */ slice(resolution(quality(streams, 'WEB-DL'), '720p'), 0, 3)",
    "enabled": true
  },
  {
    "expression": "/* Limit 720p WEBRip */ slice(resolution(quality(streams, 'WEBRip'), '720p'), 0, 3)",
    "enabled": true
  },
  {
    "expression": "/*Codec Efficiency Booster*/ merge(encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'Bluray REMUX'),'1080p'),'HEVC','AV1'),encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'WEB-DL','WEBRip'),'1080p'),'HEVC','AV1'),encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'Bluray REMUX'),'720p'),'HEVC','AV1'),encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'WEB-DL','WEBRip'),'720p'),'HEVC','AV1'))",
    "enabled": true
  },
  {
    "expression": "/*IMAX pin*/ count(visualTag(streams, 'IMAX')) > 0 ? pin(visualTag(streams, 'IMAX'), 'top') : []",
    "enabled": true
  },
  {
    "expression": "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams), uncached(streams)), quality(streams, 'Bluray REMUX', 'Bluray', 'WEB-DL', 'WEBRip')), 'resolution', 5), negate(merge(library(streams), uncached(streams)), quality(streams, 'Bluray REMUX', 'Bluray', 'WEB-DL', 'WEBRip')))",
    "enabled": true
  },
  {
    "expression": "/* Audio channel priority */ audioTag(streams, 'Atmos', 'DTS:X', 'TrueHD', 'DTS-HD MA', 'FLAC')",
    "enabled": true
  },
  {
    "enabled": true,
    "expression": "/* 576p */ resolution(streams, '576p')"
  },
  {
    "expression": "/* 480p */ resolution(streams, '480p')",
    "enabled": true
  },
  {
    "expression": "/* 240p */ resolution(streams, '240p')",
    "enabled": true
  },
  {
    "enabled": true,
    "expression": "/* 576p Quality */ quality(streams, 'WEB-DL', 'WEBRip', 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')"
  },
  {
    "expression": "/* 480p Quality */ quality(streams, 'WEB-DL', 'WEBRip', 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')",
    "enabled": true
  },
  {
    "expression": "/* 240p Quality */ quality(streams, 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')",
    "enabled": true
  },
  {
    "enabled": true,
    "expression": "/* Limit 576p results */ slice(resolution(streams, '576p'), 0, 3)"
  },
  {
    "expression": "/* Limit 480p results */ slice(resolution(streams, '480p'), 0, 3)",
    "enabled": true
  },
  {
    "expression": "/* Limit 240p results */ slice(resolution(streams, '240p'), 0, 3)",
    "enabled": true
  }
];

export const SEL_POLICY_DATA = {
  "standard": {
    "preferredStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Language Preference — English */ language(streams,'English')"
      },
      {
        "enabled": true,
        "expression": "/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []"
      },
      {
        "enabled": true,
        "expression": "/* Elite 1080p REMUX Pin */ pin(releaseGroup(quality(resolution(streams,'BluRay REMUX'),'1080p'),'NTb','FLUX','KiNGS','NTG','BHDStudio','FraMeSToR','SiC','126811'),'top')"
      },
      {
        "enabled": true,
        "expression": "/* LQ Pin Bottom */ pin(releaseGroup(streams,'YIFY','RARBG','EVO','YTS','PSA','MeGusta','Tigole'),'bottom')"
      },
      {
        "enabled": true,
        "expression": "/* S-Tier 1080p BluRay REMUX */ quality(resolution(streams,'1080p'),'BluRay REMUX')"
      },
      {
        "enabled": true,
        "expression": "/* A-Tier 1080p WEB-DL */ quality(resolution(streams,'1080p'),'WEB-DL')"
      },
      {
        "enabled": true,
        "expression": "/* B-Tier 1080p WEBRip or BluRay */ quality(resolution(streams,'1080p'),'WEBRip','BluRay')"
      },
      {
        "enabled": true,
        "expression": "/* C-Tier Any 1080p */ resolution(streams,'1080p')"
      },
      {
        "enabled": true,
        "expression": "/* 720p WEB-DL Fallback */ quality(resolution(streams,'720p'),'WEB-DL','WEBRip')"
      },
      {
        "enabled": true,
        "expression": "/* 720p Any Fallback */ resolution(streams,'720p')"
      },
      {
        "enabled": true,
        "expression": "/* Codec Efficiency Booster */ encode(streams,'HEVC')"
      },
      {
        "enabled": true,
        "expression": "/* Boost Cached Usenet */ type(cached(streams),'usenet','stremio-usenet')"
      },
      {
        "enabled": true,
        "expression": "/*IMAX pin*/ count(visualTag(streams,'IMAX'))>0 ? pin(visualTag(streams,'IMAX'),'top') : []"
      },
      {
        "enabled": true,
        "expression": "/* QR Balance — HQ */ perGroup(quality(streams,'Bluray REMUX','Bluray','WEB-DL'),'resolution',3,'1080p','720p')"
      },
      {
        "enabled": true,
        "expression": "/* QR Balance — LQ */ perGroup(quality(streams,'WEBRip','HDTV','HDRip'),'resolution',2,'720p','480p')"
      },
      {
        "enabled": true,
        "expression": "/* Addon Diversity */ perGroup(cached(streams),'indexer',2)"
      }
    ],
    "includedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Protect Library & SeaDex */ passthrough(merge(library(streams), seadex(streams)), 'excluded')"
      },
      {
        "enabled": true,
        "expression": "/* Smart Play Pin */ pin(message(streams, 'includes', '🎯'), 'top')"
      },
      {
        "enabled": true,
        "expression": "/*Library*/ count(streams)==count(library(streams)) ? library(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*0Cached*/ count(merge(cached(streams),type(streams,'p2p','http','usenet','stremio-usenet')))==0 ? passthrough(streams,'title') : []"
      },
      {
        "enabled": true,
        "expression": "/*REPACK/PROPER Passthrough*/ count(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'))>0 ? passthrough(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'),'excluded','limit') : []"
      }
    ],
    "excludedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/*Per-Addon Flood Guard*/ merge(slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Meteor'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Comet'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'MediaFusion'),4),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Torrent Galaxy'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'EZTV'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'HdHub'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Knaben'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'TorrentsDB'),1))"
      },
      {
        "enabled": true,
        "expression": "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, 'English','Original','Multi','Dual Audio','Dubbed','Unknown')), streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*Usenet Propagation Guard*/ count(negate(age(type(streams,'usenet','stremio-usenet'),0,'2'),type(streams,'usenet','stremio-usenet')))>0?age(type(streams,'usenet','stremio-usenet'),0,'2'):[]"
      },
      {
        "enabled": true,
        "expression": "/*AI Upscale Exclusion*/ keyword(negate(merge(library(streams),seadex(streams)),streams),'all','topaz','ai-upscale','aiupscale','upscaled','neural','enhancedai')"
      },
      {
        "enabled": true,
        "expression": "/*Info & Other Unwanted*/ merge(type(streams,'info'),releaseGroup(type(streams,'usenet','stremio-usenet'),'sample'),type(keyword(streams,'all','-sample'),'usenet','stremio-usenet'),message(type(streams,'usenet','stremio-usenet'),'includes','🚫'))"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard CAM Kill */ quality(streams,'CAM','SCR','TS','TC','HC HD-Rip')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard External Kill */ type(streams,'external')"
      },
      {
        "enabled": true,
        "expression": "/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')"
      },
      {
        "enabled": true,
        "expression": "/*Extra SeaDex*/ count(seadex(streams,'best'))>1 or count(negate(seadex(streams,'best'),seadex(streams)))>1 ? merge(slice(negate(seadex(streams,'best'),seadex(streams)),1),slice(seadex(streams,'best'),1)) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Anime*/ (isAnime and originalLanguage == 'Japanese' and count(quality(resolution(cached(streams),'2160p'),'Bluray REMUX')) == 0 and count(seadex(resolution(streams,'2160p'))) == 0) ? negate(merge(library(streams),seadex(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Upscaled 4k*/ (queryType=='movie' or queryType=='series') and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))>=1) and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'))==0 ? negate(merge(seadex(streams),library(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Bluray*/ (queryType=='movie' or queryType=='series') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(seadex(resolution(streams,'2160p')))==0 ? negate(merge(seadex(streams),library(streams)),resolution(quality(streams,'Bluray'),'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 1080P Bluray*/ (queryType=='movie') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))==0) and count(seadex(resolution(streams,'1080p')))==0 ? negate(merge(seadex(streams),library(streams)),quality(resolution(streams,'1080p'),'Bluray')) : []"
      },
      {
        "enabled": true,
        "expression": "/* Adaptive Score Floor */ count(streamExpressionScore(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),-50+min(30,daysSinceRelease*0.1)))<5?[]:streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,-50+min(30,daysSinceRelease*0.1))"
      },
      {
        "enabled": true,
        "expression": "/* Low Seeder Cull */ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=3?[]:seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,0)"
      },
      {
        "enabled": true,
        "expression": "/*G's Low Bitrate*/ count(negate((isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))),cached(streams)))>10?(isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Low Seeders*/ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=5?[]:count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10)))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))>5?negate(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),1),merge(type(streams,'p2p'),type(uncached(streams),'debrid'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Final Limit — Quality Quota*/ count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip'))>12?quality(negate(merge(library(streams),seadex(streams)),streams),'HDRip','HC HD-Rip','DVDRip','HDTV','CAM','TS','TC','SCR'):count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip','HDRip','HC HD-Rip','DVDRip','HDTV'))>12?quality(streams,'CAM','TS','TC','SCR'):[]"
      },
    {
        "enabled": true,
        "expression": "/*Final Limit — Resolution Quota*/ count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>15?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>9?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>6?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),6))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>3?negate(merge(library(streams),seadex(streams)),merge(slice(type(uncached(streams),'debrid'),6),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),-1))):[]"
      },
      {
        "enabled": true,
        "expression": "/* Hard Resolution Kill */ resolution(streams,'2160p','1440p')"
      },
      {
        "enabled": true,
        "expression": "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))"
      },
      {
        "enabled": true,
        "expression": "/* Indexer Diversity */ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>20 ? negate(perGroup(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'indexer',2),negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http')))) : []"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached LQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Uncached */ negate(perGroup(uncached(streams),'resolution',3),uncached(streams))"
      },
      {
        "enabled": true,
        "expression": "/* P2P Kill */ type(streams,'p2p')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? multiEpisode(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide ambiguous season packs only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? seasonPack(streams,'onlySeasons') : []"
      }
    ],
    "rankedStreamExpressions": [],
    "resultLimits": {
      "global": 35,
      "resolution": 15,
      "mode": "conjunctive"
    },
    "dynamicAddonFetching": {
      "enabled": true,
      "condition": "count(cached(resolution(totalStreams,'1080p')))>=20 or totalTimeTaken>6000"
    }
  },
  "standard-4k": {
    "preferredStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Language Preference — English */ language(streams,'English')"
      },
      {
        "enabled": true,
        "expression": "/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []"
      },
      {
        "enabled": true,
        "expression": "/* Elite 4K REMUX Pin */ pin(releaseGroup(quality(resolution(streams,'BluRay REMUX'),'2160p'),'FraMeSToR','DON','FLUX','HIFI','playBD','BMF','QxR','EPSiLON','BLURANiUM','PmP'),'top')"
      },
      {
        "enabled": true,
        "expression": "/* Elite 1080p REMUX Pin */ pin(releaseGroup(quality(resolution(streams,'BluRay REMUX'),'1080p'),'NTb','FLUX','KiNGS','NTG','BHDStudio','FraMeSToR','SiC','126811'),'top')"
      },
      {
        "enabled": true,
        "expression": "/* LQ Pin Bottom */ pin(releaseGroup(streams,'YIFY','RARBG','EVO','YTS','PSA','MeGusta','Tigole'),'bottom')"
      },
      {
        "enabled": true,
        "expression": "/* S-Tier 4K BluRay REMUX */ quality(resolution(streams,'2160p'),'BluRay REMUX')"
      },
      {
        "enabled": true,
        "expression": "/* A-Tier 4K WEB-DL HDR */ visualTag(quality(resolution(streams,'2160p'),'WEB-DL'),'DV','HDR+DV','HDR10+','HDR10','HDR')"
      },
      {
        "enabled": true,
        "expression": "/* B-Tier 4K WEB-DL */ quality(resolution(streams,'2160p'),'WEB-DL')"
      },
      {
        "enabled": true,
        "expression": "/* C-Tier Any 4K */ resolution(streams,'2160p')"
      },
      {
        "enabled": true,
        "expression": "/* S-Tier 1080p BluRay REMUX */ quality(resolution(streams,'1080p'),'BluRay REMUX')"
      },
      {
        "enabled": true,
        "expression": "/* A-Tier 1080p WEB-DL */ quality(resolution(streams,'1080p'),'WEB-DL')"
      },
      {
        "enabled": true,
        "expression": "/* B-Tier 1080p WEBRip or BluRay */ quality(resolution(streams,'1080p'),'WEBRip','BluRay')"
      },
      {
        "enabled": true,
        "expression": "/* C-Tier Any 1080p */ resolution(streams,'1080p')"
      },
      {
        "enabled": true,
        "expression": "/* Codec Efficiency Booster */ encode(streams,'HEVC')"
      },
      {
        "enabled": true,
        "expression": "/*HDR/DV Priority*/ merge(visualTag(resolution(cached(negate(merge(library(streams),seadex(streams)),streams)),'2160p'),'DV','HDR10+','HDR+DV'),visualTag(resolution(cached(negate(merge(library(streams),seadex(streams)),streams)),'2160p'),'HDR10','HDR'))"
      },
      {
        "enabled": true,
        "expression": "/* Boost Cached Usenet */ type(cached(streams),'usenet','stremio-usenet')"
      },
      {
        "enabled": true,
        "expression": "/*IMAX pin*/ count(visualTag(streams,'IMAX'))>0 ? pin(visualTag(streams,'IMAX'),'top') : []"
      },
      {
        "enabled": true,
        "expression": "/* QR Balance — HQ */ perGroup(quality(streams,'Bluray REMUX','Bluray','WEB-DL'),'resolution',3,'2160p','1080p','720p')"
      },
      {
        "enabled": true,
        "expression": "/* QR Balance — LQ */ perGroup(quality(streams,'WEBRip','HDTV','HDRip'),'resolution',2,'1080p','720p','480p')"
      },
      {
        "enabled": true,
        "expression": "/* Addon Diversity */ perGroup(cached(streams),'indexer',2)"
      }
    ],
    "includedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Protect Library & SeaDex */ passthrough(merge(library(streams), seadex(streams)), 'excluded')"
      },
      {
        "enabled": true,
        "expression": "/* Smart Play Pin */ pin(message(streams, 'includes', '🎯'), 'top')"
      },
      {
        "enabled": true,
        "expression": "/*Library*/ count(streams)==count(library(streams)) ? library(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*0Cached*/ count(merge(cached(streams),type(streams,'p2p','http','usenet','stremio-usenet')))==0 ? passthrough(streams,'title') : []"
      },
      {
        "enabled": true,
        "expression": "/*REPACK/PROPER Passthrough*/ count(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'))>0 ? passthrough(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'),'excluded','limit') : []"
      }
    ],
    "excludedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/*Per-Addon Flood Guard*/ merge(slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Meteor'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Comet'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'MediaFusion'),4),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Torrent Galaxy'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'EZTV'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'HdHub'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Knaben'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'TorrentsDB'),1))"
      },
      {
        "enabled": true,
        "expression": "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, 'English','Original','Multi','Dual Audio','Dubbed','Unknown')), streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*Usenet Propagation Guard*/ count(negate(age(type(streams,'usenet','stremio-usenet'),0,'2'),type(streams,'usenet','stremio-usenet')))>0?age(type(streams,'usenet','stremio-usenet'),0,'2'):[]"
      },
      {
        "enabled": true,
        "expression": "/*AI Upscale Exclusion*/ keyword(negate(merge(library(streams),seadex(streams)),streams),'all','topaz','ai-upscale','aiupscale','upscaled','neural','enhancedai')"
      },
      {
        "enabled": true,
        "expression": "/*Info & Other Unwanted*/ merge(type(streams,'info'),releaseGroup(type(streams,'usenet','stremio-usenet'),'sample'),type(keyword(streams,'all','-sample'),'usenet','stremio-usenet'),message(type(streams,'usenet','stremio-usenet'),'includes','🚫'))"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard CAM Kill */ quality(streams,'CAM','SCR','TS','TC','HC HD-Rip')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard External Kill */ type(streams,'external')"
      },
      {
        "enabled": true,
        "expression": "/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')"
      },
      {
        "enabled": true,
        "expression": "/*Extra SeaDex*/ count(seadex(streams,'best'))>1 or count(negate(seadex(streams,'best'),seadex(streams)))>1 ? merge(slice(negate(seadex(streams,'best'),seadex(streams)),1),slice(seadex(streams,'best'),1)) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Anime*/ (isAnime and originalLanguage == 'Japanese' and count(quality(resolution(cached(streams),'2160p'),'Bluray REMUX')) == 0 and count(seadex(resolution(streams,'2160p'))) == 0) ? negate(merge(library(streams),seadex(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Upscaled 4k*/ (queryType=='movie' or queryType=='series') and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))>=1) and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'))==0 ? negate(merge(seadex(streams),library(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Bluray*/ (queryType=='movie' or queryType=='series') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(seadex(resolution(streams,'2160p')))==0 ? negate(merge(seadex(streams),library(streams)),resolution(quality(streams,'Bluray'),'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 1080P Bluray*/ (queryType=='movie') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))==0) and count(seadex(resolution(streams,'1080p')))==0 ? negate(merge(seadex(streams),library(streams)),quality(resolution(streams,'1080p'),'Bluray')) : []"
      },
      {
        "enabled": true,
        "expression": "/* Adaptive Score Floor */ count(streamExpressionScore(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),-50+min(30,daysSinceRelease*0.1)))<5?[]:streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,-50+min(30,daysSinceRelease*0.1))"
      },
      {
        "enabled": true,
        "expression": "/* Low Seeder Cull */ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=3?[]:seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,0)"
      },
      {
        "enabled": true,
        "expression": "/*G's Low Bitrate*/ count(negate((isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))),cached(streams)))>10?(isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Low Seeders*/ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=5?[]:count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10)))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))>5?negate(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),1),merge(type(streams,'p2p'),type(uncached(streams),'debrid'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Final Limit — Quality Quota*/ count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip'))>12?quality(negate(merge(library(streams),seadex(streams)),streams),'HDRip','HC HD-Rip','DVDRip','HDTV','CAM','TS','TC','SCR'):count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip','HDRip','HC HD-Rip','DVDRip','HDTV'))>12?quality(streams,'CAM','TS','TC','SCR'):[]"
      },
    {
        "enabled": true,
        "expression": "/*Final Limit — Resolution Quota*/ count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>15?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>9?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>6?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),6))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>3?negate(merge(library(streams),seadex(streams)),merge(slice(type(uncached(streams),'debrid'),6),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),-1))):[]"
      },
      {
        "enabled": true,
        "expression": "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))"
      },
      {
        "enabled": true,
        "expression": "/* Indexer Diversity */ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>20 ? negate(perGroup(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'indexer',2),negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http')))) : []"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached LQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Uncached */ negate(perGroup(uncached(streams),'resolution',3),uncached(streams))"
      },
      {
        "enabled": true,
        "expression": "/* P2P Kill */ type(streams,'p2p')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? multiEpisode(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide ambiguous season packs only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? seasonPack(streams,'onlySeasons') : []"
      }
    ],
    "rankedStreamExpressions": [],
    "resultLimits": {
      "global": 30,
      "resolution": 12,
      "mode": "conjunctive"
    },
    "dynamicAddonFetching": {
      "enabled": true,
      "condition": "count(cached(resolution(totalStreams,'2160p')))>=8 or totalTimeTaken>6000"
    }
  },
  "iqr": {
    "preferredStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Language Preference — English */ language(streams,'English')"
      },
      {
        "enabled": true,
        "expression": "/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []"
      },
      {
        "enabled": true,
        "expression": "/* Elite 4K REMUX Pin */ pin(releaseGroup(quality(resolution(streams,'BluRay REMUX'),'2160p'),'FraMeSToR','DON','FLUX','HIFI','playBD','BMF','QxR','EPSiLON','BLURANiUM','PmP'),'top')"
      },
      {
        "enabled": true,
        "expression": "/* Elite 1080p REMUX Pin */ pin(releaseGroup(quality(resolution(streams,'BluRay REMUX'),'1080p'),'NTb','FLUX','KiNGS','NTG','BHDStudio','FraMeSToR','SiC','126811'),'top')"
      },
      {
        "enabled": true,
        "expression": "/* LQ Pin Bottom */ pin(releaseGroup(streams,'YIFY','RARBG','EVO','YTS','PSA','MeGusta','Tigole'),'bottom')"
      },
      {
        "enabled": true,
        "expression": "/*S-Tier 4K REMUX — IQR Tukey fence*/ count(resolution(quality(streams,'BluRay REMUX'),'2160p'))>=4?size(bitrate(resolution(quality(streams,'BluRay REMUX'),'2160p'),q1(values(resolution(quality(streams,'BluRay REMUX'),'2160p'),'bitrate'))-1.5*iqr(values(resolution(quality(streams,'BluRay REMUX'),'2160p'),'bitrate')),q3(values(resolution(quality(streams,'BluRay REMUX'),'2160p'),'bitrate'))+1.5*iqr(values(resolution(quality(streams,'BluRay REMUX'),'2160p'),'bitrate'))),'15GB'):count(resolution(quality(streams,'BluRay REMUX'),'2160p'))>0?size(bitrate(resolution(quality(streams,'BluRay REMUX'),'2160p'),min(values(resolution(quality(streams,'BluRay REMUX'),'2160p'),'bitrate'))*0.80,max(values(resolution(quality(streams,'BluRay REMUX'),'2160p'),'bitrate'))*1.20),'15GB'):[]"
      },
      {
        "enabled": true,
        "expression": "/*A-Tier 4K WEB-DL HDR — IQR + linear decay*/ count(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'))>=4?bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),q1(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))-1.5*iqr(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')),q3(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))+1.5*iqr(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))):count(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'))>0?bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),min(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))*0.80,max(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))*1.20):(count(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01)),median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1+0.4*max(0.3,1-daysSinceRelease*0.01))))>=1?bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01))):[])"
      },
      {
        "enabled": true,
        "expression": "/*B-Tier 4K WEB-DL SDR — IQR + linear decay*/ count(resolution(quality(streams,'WEB-DL'),'2160p'))>=4?bitrate(resolution(quality(streams,'WEB-DL'),'2160p'),q1(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))-1.5*iqr(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate')),q3(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))+1.5*iqr(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))):count(resolution(quality(streams,'WEB-DL'),'2160p'))>0?bitrate(resolution(quality(streams,'WEB-DL'),'2160p'),min(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))*0.80,max(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))*1.20):(count(bitrate(resolution(quality(streams,'WEB-DL'),'2160p'),median(values(bitrate(resolution(quality(streams,'WEB-DL'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01)),median(values(bitrate(resolution(quality(streams,'WEB-DL'),'2160p'),'5Mbps'),'bitrate'))*(1+0.4*max(0.3,1-daysSinceRelease*0.01))))>=1?bitrate(resolution(quality(streams,'WEB-DL'),'2160p'),median(values(bitrate(resolution(quality(streams,'WEB-DL'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01))):[])"
      },
      {
        "enabled": true,
        "expression": "/*C-Tier 4K WEBRip HDR — IQR + linear decay*/ count(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'))>=4?bitrate(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),q1(values(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))-1.5*iqr(values(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')),q3(values(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))+1.5*iqr(values(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))):count(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'))>0?bitrate(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),min(values(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))*0.80,max(values(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))*1.20):(count(bitrate(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),median(values(bitrate(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01)),median(values(bitrate(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1+0.4*max(0.3,1-daysSinceRelease*0.01))))>=1?bitrate(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),median(values(bitrate(resolution(visualTag(quality(streams,'WEBRip'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01))):[])"
      },
      {
        "enabled": true,
        "expression": "/*D-Tier 4K WEBRip SDR — IQR*/ count(resolution(quality(streams,'WEBRip'),'2160p'))>=4?bitrate(resolution(quality(streams,'WEBRip'),'2160p'),q1(values(resolution(quality(streams,'WEBRip'),'2160p'),'bitrate'))-1.5*iqr(values(resolution(quality(streams,'WEBRip'),'2160p'),'bitrate')),q3(values(resolution(quality(streams,'WEBRip'),'2160p'),'bitrate'))+1.5*iqr(values(resolution(quality(streams,'WEBRip'),'2160p'),'bitrate'))):count(resolution(quality(streams,'WEBRip'),'2160p'))>0?bitrate(resolution(quality(streams,'WEBRip'),'2160p'),min(values(resolution(quality(streams,'WEBRip'),'2160p'),'bitrate'))*0.80,max(values(resolution(quality(streams,'WEBRip'),'2160p'),'bitrate'))*1.20):[]"
      },
      {
        "enabled": true,
        "expression": "/* E-Tier Any 4K */ resolution(streams,'2160p')"
      },
      {
        "enabled": true,
        "expression": "/*S-Tier 1080p REMUX — IQR Tukey fence*/ count(resolution(quality(streams,'BluRay REMUX'),'1080p'))>=4?size(bitrate(resolution(quality(streams,'BluRay REMUX'),'1080p'),q1(values(resolution(quality(streams,'BluRay REMUX'),'1080p'),'bitrate'))-1.5*iqr(values(resolution(quality(streams,'BluRay REMUX'),'1080p'),'bitrate')),q3(values(resolution(quality(streams,'BluRay REMUX'),'1080p'),'bitrate'))+1.5*iqr(values(resolution(quality(streams,'BluRay REMUX'),'1080p'),'bitrate'))),'8GB'):count(resolution(quality(streams,'BluRay REMUX'),'1080p'))>0?size(bitrate(resolution(quality(streams,'BluRay REMUX'),'1080p'),min(values(resolution(quality(streams,'BluRay REMUX'),'1080p'),'bitrate'))*0.80,max(values(resolution(quality(streams,'BluRay REMUX'),'1080p'),'bitrate'))*1.20),'8GB'):[]"
      },
      {
        "enabled": true,
        "expression": "/*A-Tier 1080p WEB-DL — IQR + linear decay*/ count(resolution(quality(streams,'WEB-DL'),'1080p'))>=4?bitrate(resolution(quality(streams,'WEB-DL'),'1080p'),q1(values(resolution(quality(streams,'WEB-DL'),'1080p'),'bitrate'))-1.5*iqr(values(resolution(quality(streams,'WEB-DL'),'1080p'),'bitrate')),q3(values(resolution(quality(streams,'WEB-DL'),'1080p'),'bitrate'))+1.5*iqr(values(resolution(quality(streams,'WEB-DL'),'1080p'),'bitrate'))):count(resolution(quality(streams,'WEB-DL'),'1080p'))>0?bitrate(resolution(quality(streams,'WEB-DL'),'1080p'),min(values(resolution(quality(streams,'WEB-DL'),'1080p'),'bitrate'))*0.80,max(values(resolution(quality(streams,'WEB-DL'),'1080p'),'bitrate'))*1.20):(count(bitrate(resolution(quality(streams,'WEB-DL'),'1080p'),median(values(bitrate(resolution(quality(streams,'WEB-DL'),'1080p'),'1Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01)),median(values(bitrate(resolution(quality(streams,'WEB-DL'),'1080p'),'1Mbps'),'bitrate'))*(1+0.4*max(0.3,1-daysSinceRelease*0.01))))>=1?bitrate(resolution(quality(streams,'WEB-DL'),'1080p'),median(values(bitrate(resolution(quality(streams,'WEB-DL'),'1080p'),'1Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01))):[])"
      },
      {
        "enabled": true,
        "expression": "/* B-Tier 1080p WEBRip or BluRay */ quality(resolution(streams,'1080p'),'WEBRip','BluRay')"
      },
      {
        "enabled": true,
        "expression": "/* C-Tier Any 1080p */ resolution(streams,'1080p')"
      },
      {
        "enabled": true,
        "expression": "/* Codec Efficiency Booster */ encode(streams,'HEVC')"
      },
      {
        "enabled": true,
        "expression": "/*HDR/DV Priority*/ merge(visualTag(resolution(cached(negate(merge(library(streams),seadex(streams)),streams)),'2160p'),'DV','HDR10+','HDR+DV'),visualTag(resolution(cached(negate(merge(library(streams),seadex(streams)),streams)),'2160p'),'HDR10','HDR'))"
      },
      {
        "enabled": true,
        "expression": "/* Boost Cached Usenet */ type(cached(streams),'usenet','stremio-usenet')"
      },
      {
        "enabled": true,
        "expression": "/*IMAX pin*/ count(visualTag(streams,'IMAX'))>0 ? pin(visualTag(streams,'IMAX'),'top') : []"
      },
      {
        "enabled": true,
        "expression": "/* QR Balance — HQ */ perGroup(quality(streams,'Bluray REMUX','Bluray','WEB-DL'),'resolution',3,'2160p','1080p','720p')"
      },
      {
        "enabled": true,
        "expression": "/* QR Balance — LQ */ perGroup(quality(streams,'WEBRip','HDTV','HDRip'),'resolution',2,'1080p','720p','480p')"
      },
      {
        "enabled": true,
        "expression": "/* Addon Diversity */ perGroup(cached(streams),'indexer',2)"
      },
      {
        "enabled": true,
        "expression": "/* Bitrate Anomaly Pin */ count(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))>=4?pin(bitrate(resolution(quality(streams,'Bluray REMUX'),'2160p'),0,q1(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))-1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))),'bottom'):[]"
      }
    ],
    "includedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Protect Library & SeaDex */ passthrough(merge(library(streams), seadex(streams)), 'excluded')"
      },
      {
        "enabled": true,
        "expression": "/* Smart Play Pin */ pin(message(streams, 'includes', '🎯'), 'top')"
      },
      {
        "enabled": true,
        "expression": "/*Library*/ count(streams)==count(library(streams)) ? library(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*0Cached*/ count(merge(cached(streams),type(streams,'p2p','http','usenet','stremio-usenet')))==0 ? passthrough(streams,'title') : []"
      },
      {
        "enabled": true,
        "expression": "/*REPACK/PROPER Passthrough*/ count(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'))>0 ? passthrough(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'),'excluded','limit') : []"
      }
    ],
    "excludedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/*Per-Addon Flood Guard*/ merge(slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Meteor'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Comet'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'MediaFusion'),4),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Torrent Galaxy'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'EZTV'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'HdHub'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Knaben'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'TorrentsDB'),1))"
      },
      {
        "enabled": true,
        "expression": "/*Score IQR Guard*/ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>=8 ? streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,q1(values(negate(merge(library(streams),seadex(streams)),streams),'seScore'))-1.5*iqr(values(negate(merge(library(streams),seadex(streams)),streams),'seScore'))) : []"
      },
      {
        "enabled": true,
        "expression": "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, 'English','Original','Multi','Dual Audio','Dubbed','Unknown')), streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*Usenet Propagation Guard*/ count(negate(age(type(streams,'usenet','stremio-usenet'),0,'2'),type(streams,'usenet','stremio-usenet')))>0?age(type(streams,'usenet','stremio-usenet'),0,'2'):[]"
      },
      {
        "enabled": true,
        "expression": "/*AI Upscale Exclusion*/ keyword(negate(merge(library(streams),seadex(streams)),streams),'all','topaz','ai-upscale','aiupscale','upscaled','neural','enhancedai')"
      },
      {
        "enabled": true,
        "expression": "/*Info & Other Unwanted*/ merge(type(streams,'info'),releaseGroup(type(streams,'usenet','stremio-usenet'),'sample'),type(keyword(streams,'all','-sample'),'usenet','stremio-usenet'),message(type(streams,'usenet','stremio-usenet'),'includes','🚫'))"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard CAM Kill */ quality(streams,'CAM','SCR','TS','TC','HC HD-Rip')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard External Kill */ type(streams,'external')"
      },
      {
        "enabled": true,
        "expression": "/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')"
      },
      {
        "enabled": true,
        "expression": "/*Extra SeaDex*/ count(seadex(streams,'best'))>1 or count(negate(seadex(streams,'best'),seadex(streams)))>1 ? merge(slice(negate(seadex(streams,'best'),seadex(streams)),1),slice(seadex(streams,'best'),1)) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Anime*/ (isAnime and originalLanguage == 'Japanese' and count(quality(resolution(cached(streams),'2160p'),'Bluray REMUX')) == 0 and count(seadex(resolution(streams,'2160p'))) == 0) ? negate(merge(library(streams),seadex(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Upscaled 4k*/ (queryType=='movie' or queryType=='series') and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))>=1) and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'))==0 ? negate(merge(seadex(streams),library(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Bluray*/ (queryType=='movie' or queryType=='series') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(seadex(resolution(streams,'2160p')))==0 ? negate(merge(seadex(streams),library(streams)),resolution(quality(streams,'Bluray'),'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 1080P Bluray*/ (queryType=='movie') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))==0) and count(seadex(resolution(streams,'1080p')))==0 ? negate(merge(seadex(streams),library(streams)),quality(resolution(streams,'1080p'),'Bluray')) : []"
      },
      {
        "enabled": true,
        "expression": "/* Adaptive Score Floor */ count(streamExpressionScore(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),-50+min(30,daysSinceRelease*0.1)))<5?[]:streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,-50+min(30,daysSinceRelease*0.1))"
      },
      {
        "enabled": true,
        "expression": "/* Low Seeder Cull */ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=3?[]:seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,0)"
      },
      {
        "enabled": true,
        "expression": "/*G's Low Bitrate*/ count(negate((isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))),cached(streams)))>10?(isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Low Seeders*/ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=5?[]:count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10)))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))>5?negate(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),1),merge(type(streams,'p2p'),type(uncached(streams),'debrid'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Final Limit — Quality Quota*/ count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip'))>12?quality(negate(merge(library(streams),seadex(streams)),streams),'HDRip','HC HD-Rip','DVDRip','HDTV','CAM','TS','TC','SCR'):count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip','HDRip','HC HD-Rip','DVDRip','HDTV'))>12?quality(streams,'CAM','TS','TC','SCR'):[]"
      },
    {
        "enabled": true,
        "expression": "/*Final Limit — Resolution Quota*/ count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>15?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>9?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>6?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),6))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>3?negate(merge(library(streams),seadex(streams)),merge(slice(type(uncached(streams),'debrid'),6),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),-1))):[]"
      },
      {
        "enabled": true,
        "expression": "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))"
      },
      {
        "enabled": true,
        "expression": "/* Indexer Diversity */ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>20 ? negate(perGroup(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'indexer',2),negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http')))) : []"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached LQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Uncached */ negate(perGroup(uncached(streams),'resolution',3),uncached(streams))"
      },
      {
        "enabled": true,
        "expression": "/* P2P Kill */ type(streams,'p2p')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? multiEpisode(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide ambiguous season packs only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? seasonPack(streams,'onlySeasons') : []"
      }
    ],
    "rankedStreamExpressions": [],
    "resultLimits": {
      "global": 30,
      "resolution": 12,
      "mode": "conjunctive"
    },
    "dynamicAddonFetching": {
      "enabled": true,
      "condition": "count(cached(resolution(totalStreams,'2160p')))>=8 or totalTimeTaken>6000"
    }
  },
  "apex-mixed": {
    "preferredStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Language Preference — English */ language(streams,'English')"
      },
      {
        "enabled": true,
        "expression": "/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []"
      },
      {
        "expression": "/* 4K */ resolution(streams, '2160p')",
        "enabled": true
      },
      {
        "expression": "/* 1080p */ resolution(streams, '1080p')",
        "enabled": true
      },
      {
        "expression": "/* 720p */ resolution(streams, '720p')",
        "enabled": true
      },
      {
        "expression": "/* Remux first */ quality(streams, 'Bluray REMUX', 'BluRay')",
        "enabled": true
      },
      {
        "expression": "/* Web-DL over WebRip */ quality(streams, 'WEB-DL', 'WEBRip')",
        "enabled": true
      },
      {
        "expression": "/* HDR / DV */ visualTag(streams, 'HDR+DV', 'DV', 'HDR10+', 'HDR10', 'HDR')",
        "enabled": true
      },
      {
        "expression": "/* HEVC / AV1 preferred */ encode(streams, 'HEVC', 'AV1')",
        "enabled": true
      },
      {
        "expression": "/* Cached priority */ cached(streams)",
        "enabled": true
      },
      {
        "expression": "/* Usenet + Debrid boost */ type(streams, 'usenet', 'debrid')",
        "enabled": true
      },
      {
        "expression": "/* Anime original audio */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(streams, 'Japanese', 'Multi') : []",
        "enabled": true
      },
      {
        "expression": "/* 4K Remux — adaptive bitrate (IQR ≥4, min/max 1-3, 15GB floor) */ count(resolution(quality(streams,'Bluray REMUX'),'2160p'))>=4 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'2160p'), q1(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate')) - 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate')), q3(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate')) + 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))), '15GB') : count(resolution(quality(streams,'Bluray REMUX'),'2160p'))>0 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'2160p'), min(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))*0.80, max(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))*1.20), '15GB') : []",
        "enabled": true
      },
      {
        "expression": "/* 4K WEB-DL HDR — adaptive bitrate + age decay (pow 0.95/d) */ count(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'))>=4 ? bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), q1(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')) - 1.5*iqr(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')), q3(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')) + 1.5*iqr(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))) : count(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'))>0 ? bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), min(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))*0.80, max(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))*1.20) : (count(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01)), median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1+0.4*max(0.3,1-daysSinceRelease*0.01)))))>=1 ? bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01))) : []",
        "enabled": true
      },
      {
        "expression": "/* 4K WEB-DL SDR — adaptive bitrate (no HDR tags) */ count(resolution(quality(streams,'WEB-DL'),'2160p'))>=4 ? bitrate(resolution(quality(streams,'WEB-DL'),'2160p'), q1(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate')) - 1.5*iqr(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate')), q3(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate')) + 1.5*iqr(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))) : count(resolution(quality(streams,'WEB-DL'),'2160p'))>0 ? bitrate(resolution(quality(streams,'WEB-DL'),'2160p'), min(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))*0.80, max(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))*1.20) : []",
        "enabled": true
      },
      {
        "expression": "/* 1080p Remux — adaptive bitrate + 8GB floor */ count(resolution(quality(streams,'Bluray REMUX'),'1080p'))>=4 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'1080p'), q1(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate')) - 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate')), q3(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate')) + 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate'))), '8GB') : count(resolution(quality(streams,'Bluray REMUX'),'1080p'))>0 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'1080p'), min(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate'))*0.80, max(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate'))*1.20), '8GB') : []",
        "enabled": true
      },
      {
        "expression": "/* Limit 4K Remux */ slice(resolution(quality(streams, 'Bluray REMUX'), '2160p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 4K Bluray */ slice(resolution(quality(streams, 'Bluray'), '2160p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 4K WEB-DL */ slice(resolution(quality(streams, 'WEB-DL'), '2160p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 1080p Remux */ slice(resolution(quality(streams, 'Bluray REMUX'), '1080p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 1080p Bluray */ slice(resolution(quality(streams, 'Bluray'), '1080p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 1080p WEB-DL */ slice(resolution(quality(streams, 'WEB-DL'), '1080p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 720p WEB-DL */ slice(resolution(quality(streams, 'WEB-DL'), '720p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 720p WEBRip */ slice(resolution(quality(streams, 'WEBRip'), '720p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/*Codec Efficiency Booster*/ merge(encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'Bluray REMUX'),'1080p'),'HEVC','AV1'),encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'WEB-DL','WEBRip'),'1080p'),'HEVC','AV1'),encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'Bluray REMUX'),'720p'),'HEVC','AV1'),encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'WEB-DL','WEBRip'),'720p'),'HEVC','AV1'))",
        "enabled": true
      },
      {
        "expression": "/*IMAX pin*/ count(visualTag(streams, 'IMAX')) > 0 ? pin(visualTag(streams, 'IMAX'), 'top') : []",
        "enabled": true
      },
      {
        "expression": "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams), uncached(streams)), quality(streams, 'Bluray REMUX', 'Bluray', 'WEB-DL', 'WEBRip')), 'resolution', 5), negate(merge(library(streams), uncached(streams)), quality(streams, 'Bluray REMUX', 'Bluray', 'WEB-DL', 'WEBRip')))",
        "enabled": true
      },
      {
        "expression": "/* Audio channel priority */ audioTag(streams, 'Atmos', 'DTS:X', 'TrueHD', 'DTS-HD MA', 'FLAC')",
        "enabled": true
      },
      {
        "enabled": true,
        "expression": "/* 576p */ resolution(streams, '576p')"
      },
      {
        "expression": "/* 480p */ resolution(streams, '480p')",
        "enabled": true
      },
      {
        "expression": "/* 240p */ resolution(streams, '240p')",
        "enabled": true
      },
      {
        "enabled": true,
        "expression": "/* 576p Quality */ quality(streams, 'WEB-DL', 'WEBRip', 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')"
      },
      {
        "expression": "/* 480p Quality */ quality(streams, 'WEB-DL', 'WEBRip', 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')",
        "enabled": true
      },
      {
        "expression": "/* 240p Quality */ quality(streams, 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')",
        "enabled": true
      },
      {
        "enabled": true,
        "expression": "/* Limit 576p results */ slice(resolution(streams, '576p'), 0, 3)"
      },
      {
        "expression": "/* Limit 480p results */ slice(resolution(streams, '480p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 240p results */ slice(resolution(streams, '240p'), 0, 3)",
        "enabled": true
      }
    ],
    "includedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Protect Library & SeaDex */ passthrough(merge(library(streams), seadex(streams)), 'excluded')"
      },
      {
        "enabled": true,
        "expression": "/* Smart Play Pin */ pin(message(streams, 'includes', '🎯'), 'top')"
      },
      {
        "enabled": true,
        "expression": "/*Library*/ count(streams)==count(library(streams)) ? library(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*0Cached*/ count(merge(cached(streams),type(streams,'p2p','http','usenet','stremio-usenet')))==0 ? passthrough(streams,'title') : []"
      },
      {
        "enabled": true,
        "expression": "/*REPACK/PROPER Passthrough*/ count(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'))>0 ? passthrough(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'),'excluded','limit') : []"
      }
    ],
    "excludedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/*Per-Addon Flood Guard*/ merge(slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Meteor'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Comet'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'MediaFusion'),4),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Torrent Galaxy'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'EZTV'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'HdHub'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Knaben'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'TorrentsDB'),1))"
      },
      {
        "enabled": true,
        "expression": "/*Score IQR Guard*/ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>=8 ? streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,q1(values(negate(merge(library(streams),seadex(streams)),streams),'seScore'))-1.5*iqr(values(negate(merge(library(streams),seadex(streams)),streams),'seScore'))) : []"
      },
      {
        "enabled": true,
        "expression": "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, 'English','Original','Multi','Dual Audio','Dubbed','Unknown')), streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*Usenet Propagation Guard*/ count(negate(age(type(streams,'usenet','stremio-usenet'),0,'2'),type(streams,'usenet','stremio-usenet')))>0?age(type(streams,'usenet','stremio-usenet'),0,'2'):[]"
      },
      {
        "enabled": true,
        "expression": "/*AI Upscale Exclusion*/ keyword(negate(merge(library(streams),seadex(streams)),streams),'all','topaz','ai-upscale','aiupscale','upscaled','neural','enhancedai')"
      },
      {
        "enabled": true,
        "expression": "/*Info & Other Unwanted*/ merge(type(streams,'info'),releaseGroup(type(streams,'usenet','stremio-usenet'),'sample'),type(keyword(streams,'all','-sample'),'usenet','stremio-usenet'),message(type(streams,'usenet','stremio-usenet'),'includes','🚫'))"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard CAM Kill */ quality(streams,'CAM','SCR','TS','TC','HC HD-Rip')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard External Kill */ type(streams,'external')"
      },
      {
        "enabled": true,
        "expression": "/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')"
      },
      {
        "enabled": true,
        "expression": "/*Extra SeaDex*/ count(seadex(streams,'best'))>1 or count(negate(seadex(streams,'best'),seadex(streams)))>1 ? merge(slice(negate(seadex(streams,'best'),seadex(streams)),1),slice(seadex(streams,'best'),1)) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Anime*/ (isAnime and originalLanguage == 'Japanese' and count(quality(resolution(cached(streams),'2160p'),'Bluray REMUX')) == 0 and count(seadex(resolution(streams,'2160p'))) == 0) ? negate(merge(library(streams),seadex(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Upscaled 4k*/ (queryType=='movie' or queryType=='series') and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))>=1) and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'))==0 ? negate(merge(seadex(streams),library(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Bluray*/ (queryType=='movie' or queryType=='series') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(seadex(resolution(streams,'2160p')))==0 ? negate(merge(seadex(streams),library(streams)),resolution(quality(streams,'Bluray'),'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 1080P Bluray*/ (queryType=='movie') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))==0) and count(seadex(resolution(streams,'1080p')))==0 ? negate(merge(seadex(streams),library(streams)),quality(resolution(streams,'1080p'),'Bluray')) : []"
      },
      {
        "enabled": true,
        "expression": "/* Adaptive Score Floor */ count(streamExpressionScore(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),-50+min(30,daysSinceRelease*0.1)))<5?[]:streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,-50+min(30,daysSinceRelease*0.1))"
      },
      {
        "enabled": true,
        "expression": "/* Low Seeder Cull */ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=3?[]:seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,0)"
      },
      {
        "enabled": true,
        "expression": "/*G's Low Bitrate*/ count(negate((isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))),cached(streams)))>10?(isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Low Seeders*/ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=5?[]:count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10)))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))>5?negate(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),1),merge(type(streams,'p2p'),type(uncached(streams),'debrid'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Final Limit — Quality Quota*/ count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip'))>12?quality(negate(merge(library(streams),seadex(streams)),streams),'HDRip','HC HD-Rip','DVDRip','HDTV','CAM','TS','TC','SCR'):count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip','HDRip','HC HD-Rip','DVDRip','HDTV'))>12?quality(streams,'CAM','TS','TC','SCR'):[]"
      },
    {
        "enabled": true,
        "expression": "/*Final Limit — Resolution Quota*/ count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>15?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>9?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>6?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),6))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>3?negate(merge(library(streams),seadex(streams)),merge(slice(type(uncached(streams),'debrid'),6),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),-1))):[]"
      },
      {
        "enabled": true,
        "expression": "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))"
      },
      {
        "enabled": true,
        "expression": "/* Indexer Diversity */ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>20 ? negate(perGroup(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'indexer',2),negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http')))) : []"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached LQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Uncached */ negate(perGroup(uncached(streams),'resolution',3),uncached(streams))"
      },
      {
        "enabled": true,
        "expression": "/* P2P Kill */ type(streams,'p2p')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? multiEpisode(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide ambiguous season packs only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? seasonPack(streams,'onlySeasons') : []"
      }
    ],
    "rankedStreamExpressions": [],
    "resultLimits": {
      "global": 30,
      "resolution": 12,
      "mode": "conjunctive"
    },
    "dynamicAddonFetching": {
      "enabled": true,
      "condition": "count(cached(resolution(totalStreams,'2160p')))>=8 or totalTimeTaken>6000"
    }
  },
  "mixed-standard": {
    "preferredStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Language Preference — English */ language(streams,'English')"
      },
      {
        "enabled": true,
        "expression": "/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []"
      },
      {
        "enabled": true,
        "expression": "/* LQ Pin Bottom */ pin(releaseGroup(streams,'YIFY','RARBG','EVO','YTS','PSA','MeGusta','Tigole'),'bottom')"
      },
      {
        "enabled": true,
        "expression": "/* S-Tier 4K BluRay REMUX */ quality(resolution(streams,'2160p'),'BluRay REMUX')"
      },
      {
        "enabled": true,
        "expression": "/* A-Tier 4K WEB-DL HDR */ visualTag(quality(resolution(streams,'2160p'),'WEB-DL'),'DV','HDR+DV','HDR10+','HDR10','HDR')"
      },
      {
        "enabled": true,
        "expression": "/* B-Tier 4K WEB-DL */ quality(resolution(streams,'2160p'),'WEB-DL')"
      },
      {
        "enabled": true,
        "expression": "/* C-Tier Any 4K */ resolution(streams,'2160p')"
      },
      {
        "enabled": true,
        "expression": "/* S-Tier 1080p BluRay REMUX */ quality(resolution(streams,'1080p'),'BluRay REMUX')"
      },
      {
        "enabled": true,
        "expression": "/* A-Tier 1080p WEB-DL */ quality(resolution(streams,'1080p'),'WEB-DL')"
      },
      {
        "enabled": true,
        "expression": "/* B-Tier 1080p WEBRip or BluRay */ quality(resolution(streams,'1080p'),'WEBRip','BluRay')"
      },
      {
        "enabled": true,
        "expression": "/* C-Tier Any 1080p */ resolution(streams,'1080p')"
      },
      {
        "enabled": true,
        "expression": "/* 720p WEB-DL Fallback */ quality(resolution(streams,'720p'),'WEB-DL','WEBRip')"
      },
      {
        "enabled": true,
        "expression": "/* 720p Any Fallback */ resolution(streams,'720p')"
      },
      {
        "enabled": true,
        "expression": "/* 576p/480p Niche Fallback */ resolution(streams,'576p','480p')"
      },
      {
        "enabled": true,
        "expression": "/* Codec Efficiency Booster */ encode(streams,'HEVC')"
      },
      {
        "enabled": true,
        "expression": "/*HDR/DV Priority*/ merge(visualTag(resolution(cached(negate(merge(library(streams),seadex(streams)),streams)),'2160p'),'DV','HDR10+','HDR+DV'),visualTag(resolution(cached(negate(merge(library(streams),seadex(streams)),streams)),'2160p'),'HDR10','HDR'))"
      },
      {
        "enabled": true,
        "expression": "/* Boost Cached Usenet */ type(cached(streams),'usenet','stremio-usenet')"
      },
      {
        "enabled": true,
        "expression": "/*IMAX pin*/ count(visualTag(streams,'IMAX'))>0 ? pin(visualTag(streams,'IMAX'),'top') : []"
      },
      {
        "enabled": true,
        "expression": "/* QR Balance — HQ */ perGroup(quality(streams,'Bluray REMUX','Bluray','WEB-DL'),'resolution',3,'2160p','1080p','720p')"
      },
      {
        "enabled": true,
        "expression": "/* QR Balance — LQ */ perGroup(quality(streams,'WEBRip','HDTV','HDRip'),'resolution',2,'1080p','720p','480p')"
      },
      {
        "enabled": true,
        "expression": "/* Addon Diversity */ perGroup(cached(streams),'indexer',2)"
      }
    ],
    "includedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Protect Library & SeaDex */ passthrough(merge(library(streams), seadex(streams)), 'excluded')"
      },
      {
        "enabled": true,
        "expression": "/* Smart Play Pin */ pin(message(streams, 'includes', '🎯'), 'top')"
      },
      {
        "enabled": true,
        "expression": "/*Library*/ count(streams)==count(library(streams)) ? library(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*0Cached*/ count(merge(cached(streams),type(streams,'p2p','http','usenet','stremio-usenet')))==0 ? passthrough(streams,'title') : []"
      },
      {
        "enabled": true,
        "expression": "/*REPACK/PROPER Passthrough*/ count(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'))>0 ? passthrough(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'),'excluded','limit') : []"
      }
    ],
    "excludedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/*Per-Addon Flood Guard*/ merge(slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Meteor'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Comet'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'MediaFusion'),4),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Torrent Galaxy'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'EZTV'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'HdHub'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Knaben'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'TorrentsDB'),1))"
      },
      {
        "enabled": true,
        "expression": "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, 'English','Original','Multi','Dual Audio','Dubbed','Unknown')), streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*Usenet Propagation Guard*/ count(negate(age(type(streams,'usenet','stremio-usenet'),0,'2'),type(streams,'usenet','stremio-usenet')))>0?age(type(streams,'usenet','stremio-usenet'),0,'2'):[]"
      },
      {
        "enabled": true,
        "expression": "/*AI Upscale Exclusion*/ keyword(negate(merge(library(streams),seadex(streams)),streams),'all','topaz','ai-upscale','aiupscale','upscaled','neural','enhancedai')"
      },
      {
        "enabled": true,
        "expression": "/*Info & Other Unwanted*/ merge(type(streams,'info'),releaseGroup(type(streams,'usenet','stremio-usenet'),'sample'),type(keyword(streams,'all','-sample'),'usenet','stremio-usenet'),message(type(streams,'usenet','stremio-usenet'),'includes','🚫'))"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard CAM Kill */ quality(streams,'CAM','SCR','TS','TC','HC HD-Rip')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard External Kill */ type(streams,'external')"
      },
      {
        "enabled": true,
        "expression": "/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')"
      },
      {
        "enabled": true,
        "expression": "/*Extra SeaDex*/ count(seadex(streams,'best'))>1 or count(negate(seadex(streams,'best'),seadex(streams)))>1 ? merge(slice(negate(seadex(streams,'best'),seadex(streams)),1),slice(seadex(streams,'best'),1)) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Anime*/ (isAnime and originalLanguage == 'Japanese' and count(quality(resolution(cached(streams),'2160p'),'Bluray REMUX')) == 0 and count(seadex(resolution(streams,'2160p'))) == 0) ? negate(merge(library(streams),seadex(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Upscaled 4k*/ (queryType=='movie' or queryType=='series') and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))>=1) and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'))==0 ? negate(merge(seadex(streams),library(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Bluray*/ (queryType=='movie' or queryType=='series') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(seadex(resolution(streams,'2160p')))==0 ? negate(merge(seadex(streams),library(streams)),resolution(quality(streams,'Bluray'),'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 1080P Bluray*/ (queryType=='movie') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))==0) and count(seadex(resolution(streams,'1080p')))==0 ? negate(merge(seadex(streams),library(streams)),quality(resolution(streams,'1080p'),'Bluray')) : []"
      },
      {
        "enabled": true,
        "expression": "/* Adaptive Score Floor */ count(streamExpressionScore(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),-50+min(30,daysSinceRelease*0.1)))<5?[]:streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,-50+min(30,daysSinceRelease*0.1))"
      },
      {
        "enabled": true,
        "expression": "/* Low Seeder Cull */ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=3?[]:seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,0)"
      },
      {
        "enabled": true,
        "expression": "/*G's Low Bitrate*/ count(negate((isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))),cached(streams)))>10?(isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Low Seeders*/ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=5?[]:count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10)))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))>5?negate(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),1),merge(type(streams,'p2p'),type(uncached(streams),'debrid'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Final Limit — Quality Quota*/ count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip'))>12?quality(negate(merge(library(streams),seadex(streams)),streams),'HDRip','HC HD-Rip','DVDRip','HDTV','CAM','TS','TC','SCR'):count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip','HDRip','HC HD-Rip','DVDRip','HDTV'))>12?quality(streams,'CAM','TS','TC','SCR'):[]"
      },
    {
        "enabled": true,
        "expression": "/*Final Limit — Resolution Quota*/ count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>15?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>9?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>6?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),6))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>3?negate(merge(library(streams),seadex(streams)),merge(slice(type(uncached(streams),'debrid'),6),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),-1))):[]"
      },
      {
        "enabled": true,
        "expression": "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))"
      },
      {
        "enabled": true,
        "expression": "/* Indexer Diversity */ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>20 ? negate(perGroup(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'indexer',2),negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http')))) : []"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached LQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Uncached */ negate(perGroup(uncached(streams),'resolution',3),uncached(streams))"
      },
      {
        "enabled": true,
        "expression": "/* P2P Kill */ type(streams,'p2p')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? multiEpisode(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide ambiguous season packs only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? seasonPack(streams,'onlySeasons') : []"
      }
    ],
    "rankedStreamExpressions": [],
    "resultLimits": {
      "global": 35,
      "resolution": 15,
      "mode": "conjunctive"
    },
    "dynamicAddonFetching": {
      "enabled": true,
      "condition": "count(cached(resolution(totalStreams,'1080p')))>=12 or count(cached(resolution(totalStreams,'2160p')))>=6 or totalTimeTaken>6000"
    }
  },
  "mixed-apex-mixed": {
    "preferredStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Language Preference — English */ language(streams,'English')"
      },
      {
        "enabled": true,
        "expression": "/* Sub-First Anime Booster */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(cached(streams), 'Japanese') : []"
      },
      {
        "expression": "/* 4K */ resolution(streams, '2160p')",
        "enabled": true
      },
      {
        "expression": "/* 1080p */ resolution(streams, '1080p')",
        "enabled": true
      },
      {
        "expression": "/* 720p */ resolution(streams, '720p')",
        "enabled": true
      },
      {
        "expression": "/* Remux first */ quality(streams, 'Bluray REMUX', 'BluRay')",
        "enabled": true
      },
      {
        "expression": "/* Web-DL over WebRip */ quality(streams, 'WEB-DL', 'WEBRip')",
        "enabled": true
      },
      {
        "expression": "/* HDR / DV */ visualTag(streams, 'HDR+DV', 'DV', 'HDR10+', 'HDR10', 'HDR')",
        "enabled": true
      },
      {
        "expression": "/* HEVC / AV1 preferred */ encode(streams, 'HEVC', 'AV1')",
        "enabled": true
      },
      {
        "expression": "/* Cached priority */ cached(streams)",
        "enabled": true
      },
      {
        "expression": "/* Usenet + Debrid boost */ type(streams, 'usenet', 'debrid')",
        "enabled": true
      },
      {
        "expression": "/* Anime original audio */ (queryType == 'anime.series' or queryType == 'anime.movie') ? language(streams, 'Japanese', 'Multi') : []",
        "enabled": true
      },
      {
        "expression": "/* 4K Remux — adaptive bitrate (IQR ≥4, min/max 1-3, 15GB floor) */ count(resolution(quality(streams,'Bluray REMUX'),'2160p'))>=4 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'2160p'), q1(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate')) - 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate')), q3(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate')) + 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))), '15GB') : count(resolution(quality(streams,'Bluray REMUX'),'2160p'))>0 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'2160p'), min(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))*0.80, max(values(resolution(quality(streams,'Bluray REMUX'),'2160p'),'bitrate'))*1.20), '15GB') : []",
        "enabled": true
      },
      {
        "expression": "/* 4K WEB-DL HDR — adaptive bitrate + age decay (pow 0.95/d) */ count(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'))>=4 ? bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), q1(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')) - 1.5*iqr(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')), q3(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate')) + 1.5*iqr(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))) : count(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'))>0 ? bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), min(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))*0.80, max(values(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'bitrate'))*1.20) : (count(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01)), median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1+0.4*max(0.3,1-daysSinceRelease*0.01)))))>=1 ? bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'), median(values(bitrate(resolution(visualTag(quality(streams,'WEB-DL'),'HDR+DV','DV','HDR10+','HDR10','HDR'),'2160p'),'5Mbps'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01))) : []",
        "enabled": true
      },
      {
        "expression": "/* 4K WEB-DL SDR — adaptive bitrate (no HDR tags) */ count(resolution(quality(streams,'WEB-DL'),'2160p'))>=4 ? bitrate(resolution(quality(streams,'WEB-DL'),'2160p'), q1(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate')) - 1.5*iqr(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate')), q3(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate')) + 1.5*iqr(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))) : count(resolution(quality(streams,'WEB-DL'),'2160p'))>0 ? bitrate(resolution(quality(streams,'WEB-DL'),'2160p'), min(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))*0.80, max(values(resolution(quality(streams,'WEB-DL'),'2160p'),'bitrate'))*1.20) : []",
        "enabled": true
      },
      {
        "expression": "/* 1080p Remux — adaptive bitrate + 8GB floor */ count(resolution(quality(streams,'Bluray REMUX'),'1080p'))>=4 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'1080p'), q1(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate')) - 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate')), q3(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate')) + 1.5*iqr(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate'))), '8GB') : count(resolution(quality(streams,'Bluray REMUX'),'1080p'))>0 ? size(bitrate(resolution(quality(streams,'Bluray REMUX'),'1080p'), min(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate'))*0.80, max(values(resolution(quality(streams,'Bluray REMUX'),'1080p'),'bitrate'))*1.20), '8GB') : []",
        "enabled": true
      },
      {
        "expression": "/* Limit 4K Remux */ slice(resolution(quality(streams, 'Bluray REMUX'), '2160p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 4K Bluray */ slice(resolution(quality(streams, 'Bluray'), '2160p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 4K WEB-DL */ slice(resolution(quality(streams, 'WEB-DL'), '2160p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 1080p Remux */ slice(resolution(quality(streams, 'Bluray REMUX'), '1080p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 1080p Bluray */ slice(resolution(quality(streams, 'Bluray'), '1080p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 1080p WEB-DL */ slice(resolution(quality(streams, 'WEB-DL'), '1080p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 720p WEB-DL */ slice(resolution(quality(streams, 'WEB-DL'), '720p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 720p WEBRip */ slice(resolution(quality(streams, 'WEBRip'), '720p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/*Codec Efficiency Booster*/ merge(encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'Bluray REMUX'),'1080p'),'HEVC','AV1'),encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'WEB-DL','WEBRip'),'1080p'),'HEVC','AV1'),encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'Bluray REMUX'),'720p'),'HEVC','AV1'),encode(resolution(quality(negate(merge(library(streams),seadex(streams)),cached(streams)),'WEB-DL','WEBRip'),'720p'),'HEVC','AV1'))",
        "enabled": true
      },
      {
        "expression": "/*IMAX pin*/ count(visualTag(streams, 'IMAX')) > 0 ? pin(visualTag(streams, 'IMAX'), 'top') : []",
        "enabled": true
      },
      {
        "expression": "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams), uncached(streams)), quality(streams, 'Bluray REMUX', 'Bluray', 'WEB-DL', 'WEBRip')), 'resolution', 5), negate(merge(library(streams), uncached(streams)), quality(streams, 'Bluray REMUX', 'Bluray', 'WEB-DL', 'WEBRip')))",
        "enabled": true
      },
      {
        "expression": "/* Audio channel priority */ audioTag(streams, 'Atmos', 'DTS:X', 'TrueHD', 'DTS-HD MA', 'FLAC')",
        "enabled": true
      },
      {
        "enabled": true,
        "expression": "/* 576p */ resolution(streams, '576p')"
      },
      {
        "expression": "/* 480p */ resolution(streams, '480p')",
        "enabled": true
      },
      {
        "expression": "/* 240p */ resolution(streams, '240p')",
        "enabled": true
      },
      {
        "enabled": true,
        "expression": "/* 576p Quality */ quality(streams, 'WEB-DL', 'WEBRip', 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')"
      },
      {
        "expression": "/* 480p Quality */ quality(streams, 'WEB-DL', 'WEBRip', 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')",
        "enabled": true
      },
      {
        "expression": "/* 240p Quality */ quality(streams, 'HDTV', 'HDRip', 'DVDRip', 'HC HD-Rip', 'CAM', 'TS', 'TC', 'SCR', 'Unknown')",
        "enabled": true
      },
      {
        "enabled": true,
        "expression": "/* Limit 576p results */ slice(resolution(streams, '576p'), 0, 3)"
      },
      {
        "expression": "/* Limit 480p results */ slice(resolution(streams, '480p'), 0, 3)",
        "enabled": true
      },
      {
        "expression": "/* Limit 240p results */ slice(resolution(streams, '240p'), 0, 3)",
        "enabled": true
      }
    ],
    "includedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/* Protect Library & SeaDex */ passthrough(merge(library(streams), seadex(streams)), 'excluded')"
      },
      {
        "enabled": true,
        "expression": "/* Smart Play Pin */ pin(message(streams, 'includes', '🎯'), 'top')"
      },
      {
        "enabled": true,
        "expression": "/*Library*/ count(streams)==count(library(streams)) ? library(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*0Cached*/ count(merge(cached(streams),type(streams,'p2p','http','usenet','stremio-usenet')))==0 ? passthrough(streams,'title') : []"
      },
      {
        "enabled": true,
        "expression": "/*REPACK/PROPER Passthrough*/ count(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'))>0 ? passthrough(keyword(negate(merge(library(streams),seadex(streams)),streams),'all','repack','proper'),'excluded','limit') : []"
      }
    ],
    "excludedStreamExpressions": [
      {
        "enabled": true,
        "expression": "/*Per-Addon Flood Guard*/ merge(slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Meteor'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Comet'),5),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'MediaFusion'),4),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Torrent Galaxy'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'EZTV'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'HdHub'),3),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'Knaben'),1),slice(addon(negate(merge(library(streams),seadex(streams)),cached(streams)),'TorrentsDB'),1))"
      },
      {
        "enabled": true,
        "expression": "/*Score IQR Guard*/ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>=8 ? streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,q1(values(negate(merge(library(streams),seadex(streams)),streams),'seScore'))-1.5*iqr(values(negate(merge(library(streams),seadex(streams)),streams),'seScore'))) : []"
      },
      {
        "enabled": true,
        "expression": "/* Bad Dual Audio Groups */ releaseGroup(streams,'alfaHD','BAT','BiOMA','BlackBit','BNd','Cory','EXTREME','FF','FOXX','G4RiS','GUEIRA','LCD','N3G4N','PD','PTHome','RiPER','RK','SiGLA','Tars','TM','tokar86a','TURG','vnlls','WTV','Yatogam1','YusukeFLA','ZigZag','ZNM')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Foreign Language Kill (movies/series only — anime exempt) */ (queryType == 'movie' or queryType == 'series') ? negate(merge(library(streams), seadex(streams), language(streams, 'English','Original','Multi','Dual Audio','Dubbed','Unknown')), streams) : []"
      },
      {
        "enabled": true,
        "expression": "/*Usenet Propagation Guard*/ count(negate(age(type(streams,'usenet','stremio-usenet'),0,'2'),type(streams,'usenet','stremio-usenet')))>0?age(type(streams,'usenet','stremio-usenet'),0,'2'):[]"
      },
      {
        "enabled": true,
        "expression": "/*AI Upscale Exclusion*/ keyword(negate(merge(library(streams),seadex(streams)),streams),'all','topaz','ai-upscale','aiupscale','upscaled','neural','enhancedai')"
      },
      {
        "enabled": true,
        "expression": "/*Info & Other Unwanted*/ merge(type(streams,'info'),releaseGroup(type(streams,'usenet','stremio-usenet'),'sample'),type(keyword(streams,'all','-sample'),'usenet','stremio-usenet'),message(type(streams,'usenet','stremio-usenet'),'includes','🚫'))"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard CAM Kill */ quality(streams,'CAM','SCR','TS','TC','HC HD-Rip')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Hard External Kill */ type(streams,'external')"
      },
      {
        "enabled": true,
        "expression": "/* CB | 3D Content Kill */ visualTag(streams,'3D','H-OU','H-SBS')"
      },
      {
        "enabled": true,
        "expression": "/*Extra SeaDex*/ count(seadex(streams,'best'))>1 or count(negate(seadex(streams,'best'),seadex(streams)))>1 ? merge(slice(negate(seadex(streams,'best'),seadex(streams)),1),slice(seadex(streams,'best'),1)) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Anime*/ (isAnime and originalLanguage == 'Japanese' and count(quality(resolution(cached(streams),'2160p'),'Bluray REMUX')) == 0 and count(seadex(resolution(streams,'2160p'))) == 0) ? negate(merge(library(streams),seadex(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Upscaled 4k*/ (queryType=='movie' or queryType=='series') and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))>=1) and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'))==0 ? negate(merge(seadex(streams),library(streams)),resolution(streams,'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 4k Bluray*/ (queryType=='movie' or queryType=='series') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and count(seadex(resolution(streams,'2160p')))==0 ? negate(merge(seadex(streams),library(streams)),resolution(quality(streams,'Bluray'),'2160p')) : []"
      },
      {
        "enabled": true,
        "expression": "/*Bad 1080P Bluray*/ (queryType=='movie') and count(quality(resolution(streams,'2160p'),'Bluray REMUX'))==0 and (count(quality(resolution(streams,'1080p'),'Bluray REMUX'))==0) and count(seadex(resolution(streams,'1080p')))==0 ? negate(merge(seadex(streams),library(streams)),quality(resolution(streams,'1080p'),'Bluray')) : []"
      },
      {
        "enabled": true,
        "expression": "/* Adaptive Score Floor */ count(streamExpressionScore(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),-50+min(30,daysSinceRelease*0.1)))<5?[]:streamExpressionScore(negate(merge(library(streams),seadex(streams)),streams),-1000000,-50+min(30,daysSinceRelease*0.1))"
      },
      {
        "enabled": true,
        "expression": "/* Low Seeder Cull */ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=3?[]:seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,0)"
      },
      {
        "enabled": true,
        "expression": "/*G's Low Bitrate*/ count(negate((isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))),cached(streams)))>10?(isAnime or 'Animation' in genres?bitrate(streams,1,'0.67Mbps'):merge(bitrate(quality(resolution(streams,'2160p'),'Bluray REMUX'),1,'25Mbps'),bitrate(quality(resolution(streams,'2160p'),'Bluray'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'WEB-DL','WEBRip'),1,'4.6Mbps'),bitrate(quality(resolution(streams,'2160p'),'HDTV'),1,'11.33Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray REMUX'),1,'13.6Mbps'),bitrate(quality(resolution(streams,'1080p'),'Bluray'),1,'6.77Mbps'),bitrate(quality(resolution(streams,'1080p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'1080p'),'HDTV'),1,'4.51Mbps'),bitrate(quality(resolution(streams,'720p'),'Bluray'),1,'3.43Mbps'),bitrate(quality(resolution(streams,'720p'),'WEB-DL','WEBRip'),1,'1.67Mbps'),bitrate(quality(resolution(streams,'720p'),'HDTV'),1,'2.28Mbps'),bitrate(streams,1,'0.67Mbps'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Low Seeders*/ count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))<=5?[]:count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q2(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'))))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,q1(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders')))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10)))>20?seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),0,max(1,percentile(values(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),'seeders'),10))):count(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),2))>5?negate(seeders(merge(type(streams,'p2p'),type(uncached(streams),'debrid')),1),merge(type(streams,'p2p'),type(uncached(streams),'debrid'))):[]"
      },
      {
        "enabled": true,
        "expression": "/*Final Limit — Quality Quota*/ count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip'))>12?quality(negate(merge(library(streams),seadex(streams)),streams),'HDRip','HC HD-Rip','DVDRip','HDTV','CAM','TS','TC','SCR'):count(quality(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'Bluray REMUX','Bluray','WEB-DL','WEBRip','HDRip','HC HD-Rip','DVDRip','HDTV'))>12?quality(streams,'CAM','TS','TC','SCR'):[]"
      },
    {
        "enabled": true,
        "expression": "/*Final Limit — Resolution Quota*/ count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>15?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'720p','576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>12?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>9?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),3))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>6?negate(merge(library(streams),seadex(streams)),merge(type(uncached(streams),'debrid'),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),6))):count(resolution(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'2160p','1440p','1080p','720p'))>3?negate(merge(library(streams),seadex(streams)),merge(slice(type(uncached(streams),'debrid'),6),slice(resolution(merge(type(streams,'usenet','stremio-usenet','http','p2p'),type(cached(streams),'debrid')),'576p','480p','360p','240p','144p','Unknown'),-1))):[]"
      },
      {
        "enabled": true,
        "expression": "/* DV-Only Kill */ negate(visualTag(streams,'DV'),merge(visualTag(streams,'HDR10+'),visualTag(streams,'HDR10'),visualTag(streams,'HDR'),visualTag(streams,'HLG'),visualTag(streams,'SDR')))"
      },
      {
        "enabled": true,
        "expression": "/* Indexer Diversity */ count(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))))>20 ? negate(perGroup(negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http'))),'indexer',2),negate(merge(library(streams),seadex(streams)),merge(cached(streams),type(streams,'p2p','http')))) : []"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached HQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'BluRay REMUX','BluRay','WEB-DL','WEBRip')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Cached LQ */ negate(perGroup(negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')),'resolution',5),negate(merge(library(streams),uncached(streams)),quality(streams,'HDTV','HDRip','DVDRip','HC HD-Rip','TC','SCR','CAM','TS','Unknown')))"
      },
      {
        "enabled": true,
        "expression": "/* Extra Uncached */ negate(perGroup(uncached(streams),'resolution',3),uncached(streams))"
      },
      {
        "enabled": true,
        "expression": "/* P2P Kill */ type(streams,'p2p')"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? multiEpisode(streams) : []"
      },
      {
        "enabled": true,
        "expression": "/* CB | Late Pack Fallback — hide ambiguous season packs only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? seasonPack(streams,'onlySeasons') : []"
      }
    ],
    "rankedStreamExpressions": [],
    "resultLimits": {
      "global": 35,
      "resolution": 15,
      "mode": "conjunctive"
    },
    "dynamicAddonFetching": {
      "enabled": true,
      "condition": "count(cached(resolution(totalStreams,'1080p')))>=12 or count(cached(resolution(totalStreams,'2160p')))>=6 or totalTimeTaken>6000"
    }
  }
};
