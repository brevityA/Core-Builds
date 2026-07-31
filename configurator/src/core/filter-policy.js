/** Pure filtering policies for generated AIOStreams templates. */

const HIGH_RES = new Set(['4k', 'ultrawide', 'mixed']);

export function isHighResolution(input = {}) {
  return HIGH_RES.has(input.resolution) || input.pseArch === 'apex-mixed';
}

export function sizePolicy(input = {}) {
  const is4k = isHighResolution(input);
  const limited = input.sizeLimit && input.sizeLimit !== 'unlimited' && Number(input.sizeLimit) > 0;
  const maxBytes = limited ? Number(input.sizeLimit) * 1_000_000_000 : null;
  const global = limited
    ? { movies:[0,maxBytes], series:[0,maxBytes] }
    : { movies:[1610612736,80000000000], series:[209715200,40000000000] };
  return {
    global,
    resolution: {
      ...(is4k ? { '2160p': { movies:[1610612736,150000000000], series:[209715200,80000000000] } } : {}),
      '1080p': { movies:[524288000,30000000000], series:[104857600,20000000000] },
      '720p': { movies:[209715200,12000000000], series:[52428800,8000000000] },
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
    global: { movies:[1000000,cap], series:[1000000,cap] },
    resolution: {
      ...(is4k ? { '2160p': { movies:[5000000,Math.min(cap,150000000)], series:[5000000,Math.min(cap,150000000)] } } : {}),
      '1080p': { movies:[2000000,Math.min(cap,150000000)], series:[2000000,Math.min(cap,150000000)] },
      '720p': { movies:[1000000,Math.min(cap,150000000)], series:[1000000,Math.min(cap,150000000)] },
    },
  };
}

export function filterPolicy(input = {}, dependencies = {}) {
  return {
    size: sizePolicy(input),
    bitrate: bitratePolicy(input, dependencies.hasTmdb),
  };
}
