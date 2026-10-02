export const OPTIONAL_SCRAPER_DEFS = [
  // Knaben and Zilean are not toggles: the builder adds both whenever a torrent debrid
  // service is configured (and neither can run without one), so a card could not change
  // the output either way.
  { id:'jackett', label:'Jackett', desc:'Connect your Jackett instance — searches 50+ indexers', presetType:'jackett', cat:'debrid', color:'#0ea5e9', credKey:'jackett' },
  { id:'prowlarr', label:'Prowlarr', desc:'Connect your Prowlarr instance — indexer management', presetType:'prowlarr', cat:'debrid', color:'#f97316', credKey:'prowlarr' },
  { id:'nzbnoob', label:'NZBnoob', desc:'Free Newznab indexer · 1,500-day retention', presetType:'newznab', cat:'usenet', color:'#22c55e', credKey:'nzbnoob', apiUrl:'https://nzbnoob.com/api' },
  { id:'althub', label:'altHUB', desc:'Newznab indexer · 900k+ NZBs', presetType:'newznab', cat:'usenet', color:'#3b82f6', credKey:'althub', apiUrl:'https://api.althub.co.za/api' },
  { id:'usenetcrawler', label:'Usenet Crawler', desc:'Newznab indexer · 5k free API/day', presetType:'newznab', cat:'usenet', color:'#a78bfa', credKey:'usenetcrawler', apiUrl:'https://www.usenet-crawler.com/api' },
  { id:'drunkenslug', label:'DrunkenSlug', desc:'Popular Newznab indexer', presetType:'newznab', cat:'usenet', color:'#f97316', credKey:'drunkenslug', apiUrl:'https://drunkenslug.com/api' },
  { id:'nzbfinder', label:'NZBFinder', desc:'Newznab indexer · generous free tier', presetType:'newznab', cat:'usenet', color:'#06b6d4', credKey:'nzbfinder', apiUrl:'https://nzbfinder.ws/api' },
  { id:'nzbhydra', label:'NZBHydra2', desc:'Usenet meta-search — aggregates all your indexers', presetType:'nzbhydra', cat:'usenet', color:'#10b981', credKey:'nzbhydra' },
  { id:'neko-bt', label:'NekoBT', desc:'nekoBT anime torrents · debrid-cached search', presetType:'neko-bt', cat:'debrid', color:'#f472b6' },
  { id:'sootio', label:'Sootio', desc:'Multi-indexer debrid scraper · 10 HTTP providers', presetType:'sootio', cat:'debrid', color:'#22d3ee' },
  { id:'webstreamr', label:'WebStreamr', desc:'HTTP streaming-site scraper · no debrid needed', presetType:'webstreamr', cat:'debrid', color:'#84cc16' },
  { id:'yastream', label:'YaStream', desc:'Asian catalogs + streams (kisskh, OneTouchTV, iDrama)', presetType:'yastream', cat:'debrid', color:'#eab308' },
  // ── Simple-toggle add-ons, audited against upstream required options. Removed 2026-10-02:
  // TorBox (addon), USA TV and Debridio Watchtower — upstream marks each removed, so any
  // config containing one is refused on save by every host. ──
  { id:'anime-kitsu', label:'Anime Kitsu', desc:'Anime catalog using Kitsu · meta catalogs', presetType:'anime-kitsu', cat:'catalog', color:'#f43f5e' },
  { id:'argentina-tv', label:'Argentina TV', desc:'Live Argentine channels · live streams', presetType:'argentina-tv', cat:'live', color:'#38bdf8' },
  { id:'bitmagnet', label:'Bitmagnet', desc:'Self-hosted BitTorrent DHT indexer · only on hosts that configure it (not ElfHosted, ATBP, Omni, Wizaardd)', presetType:'bitmagnet', cat:'debrid', color:'#a3e635' },
  { id:'brazuca-torrents', label:'Brazuca Torrents', desc:'Dubbed movies & series (Brazilian Portuguese) · direct P2P torrents', presetType:'brazuca-torrents', cat:'p2p', color:'#fb923c' },
  { id:'content-deep-dive', label:'Content Deep Dive', desc:'Cast, reviews, production insights · stream companion', presetType:'content-deep-dive', cat:'catalog', color:'#c4b5fd' },
  { id:'debridio-tmdb', label:'Debridio TMDB', desc:'TMDB catalogs via Debridio · meta catalogs', presetType:'debridio-tmdb', credKey:'debridio', cat:'catalog', color:'#fde047' },
  { id:'debridio-tvdb', label:'Debridio TVDB', desc:'TVDB catalogs via Debridio · meta catalogs', presetType:'debridio-tvdb', credKey:'debridio', cat:'catalog', color:'#86efac' },
  { id:'doctor-who-universe', label:'Doctor Who Universe', desc:'Doctor Who catalogs + streams', presetType:'doctor-who-universe', cat:'catalog', color:'#60a5fa' },
  { id:'easynews', label:'EasyNews', desc:'Usenet search · easynews service', presetType:'easynews', cat:'usenet', color:'#fbbf24' },
  { id:'easynewsPlus', label:'EasyNews+', desc:'EasyNews + search catalog · usenet+meta', presetType:'easynewsPlus', cat:'usenet', color:'#facc15' },
  { id:'jackettio', label:'Jackettio', desc:'Jackett aggregator (hosted) · debrid results', presetType:'jackettio', cat:'debrid', color:'#34d399' },
  { id:'opensubtitles', label:'OpenSubtitles', desc:'OpenSubtitles addon · subtitles', presetType:'opensubtitles', cat:'subtitles', color:'#f87171' },
  { id:'tmdb-collections', label:'TMDB Collections', desc:'Movie collection catalogs · meta catalogs', presetType:'tmdb-collections', cat:'catalog', color:'#a78bfa' },
  { id:'usa-tv-next', label:'USA TV Next', desc:'Next-gen US live TV · live streams', presetType:'usa-tv-next', cat:'live', color:'#22d3ee' },
];
