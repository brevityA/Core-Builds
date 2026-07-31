export function sanitizeAioEnumArrays(config = {}) {
  const autoAllowed=new Set(['service','addon','proxied','resolution','quality','encode','audioTags','visualTags','languages','releaseGroup','type','infoHash','size']);
  const autoAliases={audio:'audioTags',language:'languages',release_group:'releaseGroup',info_hash:'infoHash'};
  if(config.autoPlay){
    const raw=Array.isArray(config.autoPlay.attributes)?config.autoPlay.attributes:[];
    const clean=[...new Set(raw.map(v=>autoAliases[String(v).trim()]||String(v).trim()).filter(v=>autoAllowed.has(v)))];
    config.autoPlay.attributes=clean.length?clean:['resolution','quality','releaseGroup'];
  }
  if(config.cacheAndPlay){
    const raw=Array.isArray(config.cacheAndPlay.streamTypes)?config.cacheAndPlay.streamTypes:[];
    const mapped=raw.map(v=>{v=String(v).trim();if(['debrid','p2p','torrent'].includes(v))return'torrent';if(['stremio-usenet','nzb','usenet'].includes(v))return'usenet';return v;});
    config.cacheAndPlay.streamTypes=[...new Set(mapped.filter(v=>v==='usenet'||v==='torrent'))];
    if(!config.cacheAndPlay.streamTypes.length)config.cacheAndPlay.streamTypes=['usenet','torrent'];
  }
  return config;
}
