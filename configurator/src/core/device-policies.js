/** Pure device/resolution policies for template generation. */

export function resolutionPolicy(input = {}) {
  const ex = ['144p', '240p', '360p'];
  const pool = input.streamPool || 'normal';
  const mr4k = pool === 'max' ? 75 : pool === 'large' ? 50 : 30;
  const mr1k = pool === 'max' ? 75 : pool === 'large' ? 50 : 35;
  const pr4k = pool === 'max' ? 30 : pool === 'large' ? 20 : 12;
  const pr1k = pool === 'max' ? 30 : pool === 'large' ? 20 : 15;
  // 1440p was missing from the 4K profile's preference list while NOT being
  // excluded, so upstream scored it -Infinity and sorted every 1440p result
  // dead last — below 720p. It belongs directly under 2160p in a 4K build.
  if (input.resolution === '4k') return { excludedResolutions:[...ex,'480p','576p'], includedResolutions:[], requiredResolutions:[], preferredResolutions:['2160p','1440p','1080p','720p','Unknown'], maxResults:mr4k, maxResultsPerResolution:pr4k };
  if (input.resolution === '1080p') return { excludedResolutions:ex, includedResolutions:[], requiredResolutions:['1080p','720p'], preferredResolutions:['1080p','720p','Unknown'], maxResults:mr1k, maxResultsPerResolution:pr1k };
  if (input.resolution === 'mixed' || input.pseArch === 'apex-mixed') return { excludedResolutions:ex, includedResolutions:[], requiredResolutions:[], preferredResolutions:['2160p','1080p','1440p','720p','576p','480p','Unknown'], maxResults:mr1k, maxResultsPerResolution:pr1k };
  return { excludedResolutions:ex, includedResolutions:[], requiredResolutions:[], preferredResolutions:['1080p','1440p','2160p','720p','576p','480p','Unknown'], maxResults:mr1k, maxResultsPerResolution:pr1k };
}

export function encodePolicy(input = {}, av1Safe = new Set()) {
  const av1Unsafe = !av1Safe.has(input.device);
  const vc1Unsafe = !['shield','windows'].includes(input.device);
  return {
    excludedEncodes: [...(av1Unsafe ? ['AV1'] : []), ...(vc1Unsafe ? ['VC-1'] : [])],
    preferredEncodes: av1Unsafe ? ['HEVC','AVC','Unknown'] : ['HEVC','AV1','AVC','Unknown'],
  };
}

export function audioPolicy(input = {}, forceLimited = new Set()) {
  const dev = input.device;
  const forcedLimited = forceLimited.has(dev);
  const limited = input.audio === 'limited' || forcedLimited;
  const dolby = input.audio === 'dolby';
  const wide = ['shield','windows'].includes(dev) || (input.audio === 'lossless' && !forcedLimited) || (dolby && !forcedLimited);
  if (dolby && forcedLimited) return { excludedAudioTags:['TrueHD','DTS-HD MA','DTS:X','DTS-HD','DTS-ES','FLAC'], preferredAudioTags:['Atmos','DD+','AAC','DD'], preferredAudioChannels:['5.1','2.0'] };
  if (dolby) return { excludedAudioTags:['DTS','DTS-HD MA','DTS:X','DTS-HD','DTS-ES'], preferredAudioTags:['TrueHD','Atmos','DD+','AAC','DD'], preferredAudioChannels:['7.1','5.1','2.0'] };
  const losslessCapable = ['shield','windows'].includes(dev);
  return {
    excludedAudioTags: (limited && !losslessCapable) ? ['TrueHD','DTS-HD MA','DTS:X','FLAC'] : [],
    preferredAudioTags: (limited && !losslessCapable) ? ['Atmos','DD+','AAC','DD','DTS'] : ['TrueHD','Atmos','DTS-HD MA','DTS:X','FLAC','DTS-HD','DD+','AAC','DTS','DD'],
    preferredAudioChannels: wide ? ['7.1','5.1','2.0'] : ['5.1','2.0'],
  };
}
