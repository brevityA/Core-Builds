/** Pure filtering policies for generated AIOStreams templates. */

const HIGH_RES = new Set(['4k', 'ultrawide', 'mixed']);

export function isHighResolution(input = {}) {
  return HIGH_RES.has(input.resolution) || input.pseArch === 'apex-mixed';
}

export function sizePolicy(input = {}) {
  const is4k = isHighResolution(input);
  const raw = Number(input.sizeLimit);
  const limited = input.sizeLimit && input.sizeLimit !== 'unlimited' && Number.isFinite(raw) && raw > 0;
  const maxBytes = limited ? raw * 1_000_000_000 : null;
  const cap = (hi) => limited ? Math.min(hi, maxBytes) : hi;
  const global = limited
    ? { movies:[0,maxBytes], series:[0,maxBytes] }
    : { movies:[1610612736,80000000000], series:[209715200,40000000000] };
  return {
    global,
    resolution: {
      ...(is4k ? { '2160p': { movies:[limited?0:1610612736,cap(150000000000)], series:[limited?0:209715200,cap(80000000000)] } } : {}),
      '1080p': { movies:[limited?0:524288000,cap(30000000000)], series:[limited?0:104857600,cap(20000000000)] },
      '720p': { movies:[limited?0:209715200,cap(12000000000)], series:[limited?0:52428800,cap(8000000000)] },
    },
  };
}

export function bitratePolicy(input = {}, hasTmdb = false) {
  const cap = Number.isFinite(Number(input.bandwidthMbps)) && Number(input.bandwidthMbps) > 0
    ? Math.floor(Number(input.bandwidthMbps) * 1_000_000 * 0.8)
    : 150_000_000;
  const is4k = isHighResolution(input);
  return {
    useMetadataRuntime: Boolean(hasTmdb),
    global: { movies:[Math.min(1000000,cap),cap], series:[Math.min(1000000,cap),cap] },
    resolution: {
      ...(is4k ? { '2160p': { movies:[Math.min(5000000,cap),Math.min(cap,150000000)], series:[Math.min(5000000,cap),Math.min(cap,150000000)] } } : {}),
      '1080p': { movies:[Math.min(2000000,cap),Math.min(cap,150000000)], series:[Math.min(2000000,cap),Math.min(cap,150000000)] },
      '720p': { movies:[Math.min(1000000,cap),Math.min(cap,150000000)], series:[Math.min(1000000,cap),Math.min(cap,150000000)] },
    },
  };
}

export function filterPolicy(input = {}, dependencies = {}) {
  return {
    size: sizePolicy(input),
    bitrate: bitratePolicy(input, dependencies.hasTmdb),
  };
}
