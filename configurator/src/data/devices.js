export const DEVICE_AUDIO_DEFAULTS = { samsung:'standard', 'firestick-hd':'limited', 'firestick-4kmax':'standard', shield:'lossless', lgtv:'standard', 'appletv-old':'standard', 'appletv-new':'standard', windows:'lossless', generic:'standard', 'android-mobile':'limited', 'android-tv':'limited', 'samsung-tizen':'limited', 'lg-webos':'limited', 'sony-google-tv':'limited', 'generic-4k-hdr-tv':'limited', roku:'limited', chromecast:'limited', sony:'standard', ipad:'limited', projector:'limited', onn:'limited', googletv:'limited', xiaomi:'standard', 'xiaomi-3rd':'standard', 'tcl-google-tv':'limited', hisense:'limited' };
export const DEVICE_FORCE_LIMITED_AUDIO = new Set(['generic','android-mobile','android-tv','samsung-tizen','lg-webos','sony-google-tv','generic-4k-hdr-tv','samsung','firestick-hd','roku','chromecast','ipad','projector','onn','googletv','lgtv','sony','appletv-old','appletv-new','tcl-google-tv','hisense']);
export const DEVICE_AV1_SAFE = new Set(['firestick-4kmax','googletv','onn','xiaomi','xiaomi-3rd','windows']);
export const DEVICE_DV_SAFE = new Set(['lg-webos','sony-google-tv','android-tv','appletv-old','appletv-new','lgtv','firestick-4kmax','shield','googletv','chromecast','sony','xiaomi','xiaomi-3rd']);
export const POPULAR_DEVICE_IDS = new Set(['onn','shield','firestick-4kmax','googletv','android-mobile','android-tv']);

/** Capability-based profiles for devices whose exact model is unknown. */
export const DEVICE_PROFILES = {
  'android-mobile': {
    id: 'android-mobile', label: 'Android Phone / Tablet', family: 'android-mobile',
    video: { maxResolution: '2160p', codecs: ['AVC','HEVC'], hdr: ['HDR10','HLG'], dolbyVision: 'conditional' },
    audio: { maxChannels: '2.0', passthrough: false, lossless: false, dolbyAtmos: 'conditional' },
    playback: { maxBitrate: 'adaptive', preferSmallFiles: true },
    warnings: ['Capabilities vary by Android model and playback app; AV1 and Dolby Vision are not assumed.'],
  },
  'android-tv': {
    id: 'android-tv', label: 'Android TV / Google TV', family: 'android-tv',
    video: { maxResolution: '2160p', codecs: ['AVC','HEVC','AV1'], hdr: ['HDR10','HLG'], dolbyVision: 'conditional' },
    audio: { maxChannels: '5.1', passthrough: 'conditional', lossless: false, dolbyAtmos: 'conditional' },
    playback: { maxBitrate: 'adaptive', preferSmallFiles: false },
    warnings: ['Exact codec, HDR, and passthrough support depends on the TV/box model and app.'],
  },
  'samsung-tizen': {
    id: 'samsung-tizen', label: 'Samsung Tizen TV', family: 'samsung-tizen',
    video: { maxResolution: '2160p', codecs: ['AVC','HEVC'], hdr: ['HDR10','HDR10+','HLG'], dolbyVision: false },
    audio: { maxChannels: '5.1', passthrough: 'conditional', lossless: false, dolbyAtmos: 'conditional' },
    playback: { maxBitrate: 'adaptive', preferSmallFiles: true },
    warnings: ['Samsung TVs do not support Dolby Vision; model-year codec support varies.'],
  },
  'lg-webos': {
    id: 'lg-webos', label: 'LG webOS TV', family: 'lg-webos',
    video: { maxResolution: '2160p', codecs: ['AVC','HEVC'], hdr: ['HDR10','HLG'], dolbyVision: 'conditional' },
    audio: { maxChannels: '5.1', passthrough: 'conditional', lossless: false, dolbyAtmos: 'conditional' },
    playback: { maxBitrate: 'adaptive', preferSmallFiles: true },
    warnings: ['Exact Dolby Vision and audio passthrough support depends on model year and sound system.'],
  },
  'sony-google-tv': {
    id: 'sony-google-tv', label: 'Sony / Google TV', family: 'sony-google-tv',
    video: { maxResolution: '2160p', codecs: ['AVC','HEVC','AV1'], hdr: ['HDR10','HLG'], dolbyVision: 'conditional' },
    audio: { maxChannels: '5.1', passthrough: 'conditional', lossless: false, dolbyAtmos: 'conditional' },
    playback: { maxBitrate: 'adaptive', preferSmallFiles: false },
    warnings: ['Capabilities vary by Sony model, Android version, and playback app.'],
  },
  'generic-4k-hdr-tv': {
    id: 'generic-4k-hdr-tv', label: 'Generic 4K HDR TV', family: 'generic-tv',
    video: { maxResolution: '2160p', codecs: ['AVC','HEVC'], hdr: ['HDR10','HLG'], dolbyVision: 'unknown' },
    audio: { maxChannels: '5.1', passthrough: false, lossless: false, dolbyAtmos: false },
    playback: { maxBitrate: 'adaptive', preferSmallFiles: true },
    warnings: ['Conservative profile for unknown TV hardware; use a model-specific profile when available.'],
  },
  'firestick-hd': {
    id: 'firestick-hd', label: 'Fire TV Stick HD', family: 'fire-tv',
    video: { maxResolution: '1080p', codecs: ['AVC','HEVC'], hdr: ['SDR'], dolbyVision: false },
    audio: { maxChannels: '5.1', passthrough: false, lossless: false, dolbyAtmos: false },
    playback: { maxBitrate: 'capped', preferSmallFiles: true },
    warnings: ['1080p SDR only. No AV1, no HDR/DV. Use Stream Fire Stick, not Apex.'],
  },
  'firestick-4kmax': {
    id: 'firestick-4kmax', label: 'Fire TV Stick 4K Max', family: 'fire-tv',
    video: { maxResolution: '2160p', codecs: ['AVC','HEVC','AV1'], hdr: ['HDR10','HLG'], dolbyVision: 'conditional' },
    audio: { maxChannels: '5.1', passthrough: 'conditional', lossless: false, dolbyAtmos: 'conditional' },
    playback: { maxBitrate: 'capped', preferSmallFiles: true },
    warnings: ['Start on 1080p Stream. 4K only with a bitrate cap — not Apex, not REMUX-first.'],
  },
  'tcl-google-tv': {
    id: 'tcl-google-tv', label: 'TCL Google TV', family: 'no-dv-tv',
    video: { maxResolution: '2160p', codecs: ['AVC','HEVC'], hdr: ['HDR10','HLG'], dolbyVision: false },
    audio: { maxChannels: '5.1', passthrough: false, lossless: false, dolbyAtmos: false },
    playback: { maxBitrate: 'adaptive', preferSmallFiles: true },
    warnings: ['Do not assume Dolby Vision on TCL panels. Use the Samsung / No-DV templates.'],
  },
  hisense: {
    id: 'hisense', label: 'Hisense TV', family: 'no-dv-tv',
    video: { maxResolution: '2160p', codecs: ['AVC','HEVC'], hdr: ['HDR10','HLG'], dolbyVision: false },
    audio: { maxChannels: '5.1', passthrough: false, lossless: false, dolbyAtmos: false },
    playback: { maxBitrate: 'adaptive', preferSmallFiles: true },
    warnings: ['Do not assume Dolby Vision on Hisense panels. Use the Samsung / No-DV templates.'],
  },
};
