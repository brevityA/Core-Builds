// DO NOT EDIT — generated from AIOStreams d3ea9bbaa48d757b31e1277186fcfaeeff41a4cc
// Source: https://github.com/Viren070/AIOStreams/tree/d3ea9bbaa48d757b31e1277186fcfaeeff41a4cc
// Upstream version: 2.33.2
// Regenerate with: npm run sync:upstream   (see configurator/README.md)
/** Every preset id PresetManager.fromId() resolves at the pinned ref. */

export const AIO_PRESET_IDS = Object.freeze(["custom","torznab","newznab","aiostreams","torrentio","comet","meteor","mediafusion","stremthruTorz","stremthruStore","sootio","zilean","knaben","library","eztv","torrent-galaxy","bitmagnet","seadex","animetosho","neko-bt","prowlarr","jackett","nzbhydra","stremio-gdrive","jackettio","peerflix","orion","torrents-db","streamfusion","baguettio","fkstream","debridio","torbox","torbox-search","easynews-search","easynews","easynewsPlus","easynewsPlusPlus","usenet-streamer","streamnzb","davex","dmm-cast","nuvio-streams","webstreamr","hdhub","flix-streams","astream","brazuca-torrents","yastream","streamasia","usa-tv","usa-tv-next","argentina-tv","debridio-tv","debridio-watchtower","tmdb-addon","debridio-tmdb","debridio-tvdb","debridio-ic4a","streaming-catalogs","anime-catalogs","torrent-catalogs","rpdb-catalogs","tmdb-collections","anime-kitsu","marvel-universe","star-wars-universe","dc-universe","doctor-who-universe","opensubtitles","opensubtitles-v3-plus","subsource","subdl","subhero","aiosubtitle","ai-companion","ai-search","more-like-this","content-deep-dive"]);


export const AIO_PRESET_ID_SET = Object.freeze(new Set(AIO_PRESET_IDS));

/** True when AIOStreams at the pinned ref can resolve this preset type. */
export function isKnownPresetId(id) {
  return AIO_PRESET_ID_SET.has(String(id || ""));
}
