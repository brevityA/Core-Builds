export const OPTIONAL_SCRAPER_DEFS = [
  { id:'knaben', label:'Knaben', desc:'Proxy search across TPB, 1337x, Nyaa.si, and more', presetType:'knaben', cat:'debrid', color:'#e11d48' },
  { id:'zilean', label:'Zilean', desc:'DMM hashlist scraper — instant-cached results', presetType:'zilean', cat:'debrid', color:'#8b5cf6' },
  { id:'jackett', label:'Jackett', desc:'Connect your Jackett instance — searches 50+ indexers', presetType:'jackett', cat:'debrid', color:'#0ea5e9', credKey:'jackett' },
  { id:'prowlarr', label:'Prowlarr', desc:'Connect your Prowlarr instance — indexer management', presetType:'prowlarr', cat:'debrid', color:'#f97316', credKey:'prowlarr' },
  { id:'nzbnoob', label:'NZBnoob', desc:'Free Newznab indexer · 1,500-day retention', presetType:'newznab', cat:'usenet', color:'#22c55e', credKey:'nzbnoob', apiUrl:'https://nzbnoob.com', apiPath:'/api' },
  { id:'althub', label:'altHUB', desc:'Newznab indexer · 900k+ NZBs', presetType:'newznab', cat:'usenet', color:'#3b82f6', credKey:'althub', apiUrl:'https://api.althub.co.za', apiPath:'/api' },
  { id:'usenetcrawler', label:'Usenet Crawler', desc:'Newznab indexer · 5k free API/day', presetType:'newznab', cat:'usenet', color:'#a78bfa', credKey:'usenetcrawler', apiUrl:'https://usenet-crawler.com', apiPath:'/api' },
  { id:'drunkenslug', label:'DrunkenSlug', desc:'Popular Newznab indexer', presetType:'newznab', cat:'usenet', color:'#f97316', credKey:'drunkenslug', apiUrl:'https://api.drunkenslug.com', apiPath:'/api' },
  { id:'nzbfinder', label:'NZBFinder', desc:'Newznab indexer · generous free tier', presetType:'newznab', cat:'usenet', color:'#06b6d4', credKey:'nzbfinder', apiUrl:'https://nzbfinder.ws', apiPath:'/api' },
];
