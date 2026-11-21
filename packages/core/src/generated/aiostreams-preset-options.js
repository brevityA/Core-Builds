// DO NOT EDIT — generated from AIOStreams 113ab6bfd5888f494f78370e2b7fe5ee39897e1d
// Source: https://github.com/Viren070/AIOStreams/tree/113ab6bfd5888f494f78370e2b7fe5ee39897e1d
// Upstream version: 2.38.1
// Regenerate with: npm run sync:upstream   (see configurator/README.md)
/** Required options beyond name,timeout,resources,url for each preset at the pinned ref. */

export const AIO_PRESET_REQUIRED_OPTIONS = Object.freeze({
  "ai-companion": [
    "maxResults",
    "providerApiKey",
    "providerBaseUrl"
  ],
  "ai-search": [
    "geminiApiKey"
  ],
  "aiostreams": [
    "manifestUrl"
  ],
  "aiosubtitle": [
    "languages"
  ],
  "baguettio": [
    "userId"
  ],
  "custom": [
    "manifestUrl"
  ],
  "davex": [
    "manifestUrl"
  ],
  "dc-universe": [
    "catalogs"
  ],
  "debridio-ic4a": [
    "server"
  ],
  "debridio-tv": [
    "channels"
  ],
  "dmm-cast": [
    "installationUrl"
  ],
  "easynewsPlusPlus": [
    "strictTitleMatching"
  ],
  "marvel-universe": [
    "catalogs"
  ],
  "newznab": [
    "api"
  ],
  "opensubtitles-v3-plus": [
    "includeAiTranslated",
    "language",
    "movieHashPlusAutoAdjustment",
    "sources"
  ],
  "orion": [
    "orionApiKey"
  ],
  "peerflix": [
    "showTorrentLinks",
    "useMultipleInstances"
  ],
  "penguplay": [
    "manifestUrl"
  ],
  "rpdb-catalogs": [
    "catalogs"
  ],
  "star-wars-universe": [
    "catalogs"
  ],
  "streamfusion": [
    "streamFusionApiKey"
  ],
  "streaming-catalogs": [
    "catalogs"
  ],
  "stremio-gdrive": [
    "refreshToken"
  ],
  "subdl": [
    "hearingImpairment",
    "language",
    "subDlApiKey"
  ],
  "subhero": [
    "languages"
  ],
  "subsource": [
    "hearingImpairment",
    "language",
    "subSourceApiKey",
    "subtitleTypes"
  ],
  "torrentio": [
    "useMultipleInstances"
  ],
  "torrents-db": [
    "useMultipleInstances"
  ],
  "torznab": [
    "api"
  ],
  "usenet-streamer": [
    "manifestUrl"
  ],
  "xtream": [
    "password",
    "server",
    "username"
  ]
});

export function requiredOptionsForPreset(id) {
  return AIO_PRESET_REQUIRED_OPTIONS[String(id||"")] || [];
}

export function isSimpleTogglePreset(id) {
  return requiredOptionsForPreset(id).length === 0;
}
