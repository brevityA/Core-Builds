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
