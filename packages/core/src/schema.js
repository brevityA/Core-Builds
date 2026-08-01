export function sanitizeAioEnumArrays(config = {}) {
  const autoAllowed=new Set(['service','addon','proxied','resolution','quality','encode','audioTags','visualTags','languages','releaseGroup','type','infoHash','size']);
  const autoAliases={audio:'audioTags',language:'languages',release_group:'releaseGroup',info_hash:'infoHash'};
  const out = { ...config };
  if(out.autoPlay){
    out.autoPlay = { ...out.autoPlay };
    const raw=Array.isArray(out.autoPlay.attributes)?out.autoPlay.attributes:[];
    const clean=[...new Set(raw.map(v=>autoAliases[String(v).trim()]||String(v).trim()).filter(v=>autoAllowed.has(v)))];
    out.autoPlay.attributes=clean.length?clean:['resolution','quality','releaseGroup'];
  }
  if(out.cacheAndPlay){
    out.cacheAndPlay = { ...out.cacheAndPlay };
    const raw=Array.isArray(out.cacheAndPlay.streamTypes)?out.cacheAndPlay.streamTypes:[];
    const mapped=raw.map(v=>{v=String(v).trim();if(['debrid','p2p','torrent'].includes(v))return'torrent';if(['stremio-usenet','nzb','usenet'].includes(v))return'usenet';return v;});
    out.cacheAndPlay.streamTypes=[...new Set(mapped.filter(v=>v==='usenet'||v==='torrent'))];
    if(!out.cacheAndPlay.streamTypes.length)out.cacheAndPlay.streamTypes=['usenet','torrent'];
  }
  return out;
}
