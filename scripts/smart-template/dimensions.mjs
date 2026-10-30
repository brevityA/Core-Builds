// The questions the Core Builds smart template asks inside AIOStreams, and how
// each answer maps onto packages/core generateTemplate(). Shared by the compiler
// (compile.mjs) and the equivalence test, so both read the same matrix.
import { ALLOWED_AIO_NAMES } from '../../configurator/src/data/language-packs.js';

// AIOStreams service id → configurator service id → label. Selecting none in the
// AIOStreams wizard builds the free P2P lane.
export const SERVICES = [
  ['torbox', 'torbox-pro', 'TorBox'],
  ['realdebrid', 'realdebrid', 'Real-Debrid'],
  ['alldebrid', 'alldebrid', 'AllDebrid'],
  ['premiumize', 'premiumize', 'Premiumize'],
  ['debridlink', 'debridlink', 'Debrid-Link'],
  ['offcloud', 'offcloud', 'Offcloud'],
  ['easydebrid', 'easydebrid', 'EasyDebrid'],
  ['pikpak', 'pikpak', 'PikPak'],
  ['seedr', 'seedr', 'Seedr'],
  ['debrider', 'debrider', 'Debrider'],
  ['easynews', 'easynews', 'EasyNews'],
];
export const NO_SERVICE = 'p2p';

// Every device the Custom build offers, labelled as it labels them.
export const DEVICES = [
  ['generic', 'Standard / Not sure'], ['samsung', 'Samsung TV'], ['samsung-tizen', 'Samsung Tizen TV'],
  ['lgtv', 'LG TV webOS'], ['lg-webos', 'LG webOS TV'], ['sony', 'Sony Bravia'], ['sony-google-tv', 'Sony / Google TV'],
  ['tcl-google-tv', 'TCL Google TV'], ['hisense', 'Hisense TV'], ['generic-4k-hdr-tv', 'Generic 4K HDR TV'],
  ['appletv-old', 'Apple TV 4K Gen 1–2'], ['appletv-new', 'Apple TV 4K Gen 3'], ['firestick-hd', 'Fire Stick HD'],
  ['firestick-4kmax', 'Fire Stick 4K Max'], ['shield', 'Nvidia Shield'], ['googletv', 'Google TV Streamer'],
  ['chromecast', 'Chromecast with Google TV'], ['android-tv', 'Android TV / Google TV'], ['onn', 'onn 4K box'],
  ['xiaomi', 'Xiaomi Mi Box S (2nd Gen)'], ['xiaomi-3rd', 'Xiaomi Mi Box S (3rd Gen)'], ['roku', 'Roku'],
  ['windows', 'Windows PC'], ['android-mobile', 'Android phone / tablet'], ['ipad', 'iPad / iPhone'], ['projector', 'Projector'],
];

// Quick install's profiles, minus resolution and cache mode, which are their own questions here.
export const PROFILES = {
  balanced: { audio: 'standard', streamPool: 'normal', sizeLimit: '30', qualityFirst: false, resolutionFirst: true },
  fast: { audio: 'limited', streamPool: 'normal', sizeLimit: '20', qualityFirst: false, resolutionFirst: true },
  maximum: { audio: 'standard', streamPool: 'max', sizeLimit: 'unlimited', qualityFirst: true, resolutionFirst: false },
};

export const LANGUAGES = [...ALLOWED_AIO_NAMES];

// Switch nesting order: the service decides the most, the language the least.
// `ref` is what the template switches on; `values` are the answers as AIOStreams hands them over.
export const DIMS = [
  { id: 'service', ref: 'services', values: ['', ...SERVICES.map(([id]) => id)] },
  { id: 'resolution', ref: 'inputs.resolution', values: ['4k', '1080p', 'mixed'] },
  { id: 'profile', ref: 'inputs.profile', values: Object.keys(PROFILES) },
  { id: 'cachedOnly', ref: 'inputs.cachedOnly', values: [false, true] },
  { id: 'anime', ref: 'inputs.anime', values: [false, true] },
  { id: 'device', ref: 'inputs.device', values: DEVICES.map(([id]) => id) },
  { id: 'language', ref: 'inputs.language', values: LANGUAGES },
];

export const INPUTS = [
  { id: 'device', name: 'What do you watch on?', description: 'Sets the video and audio formats Core Builds prefers or avoids, such as Dolby Vision, AV1 and lossless audio.', type: 'select', required: true, default: 'generic', options: DEVICES.map(([value, label]) => ({ value, label })) },
  { id: 'resolution', name: 'Picture', description: '4K shows 2160p first with 1080p behind it. 1080p leaves 4K out. Mixed has no hard limit.', type: 'select', required: true, default: '4k', options: [{ value: '4k', label: '4K' }, { value: '1080p', label: '1080p' }, { value: 'mixed', label: 'Mixed' }] },
  { id: 'profile', name: 'What matters most', description: 'Fast keeps files small, Balanced suits most people, Maximum searches widest with no size limit.', type: 'select', required: true, default: 'balanced', options: [{ value: 'balanced', label: 'Balanced (recommended)' }, { value: 'fast', label: 'Fast' }, { value: 'maximum', label: 'Maximum' }] },
  { id: 'cachedOnly', name: 'Only streams that play straight away', description: 'Hides anything your service would still have to download first.', type: 'boolean', default: false },
  { id: 'language', name: 'Language you watch in', description: 'Releases in this language come first when everything else is equal. English and original-audio releases still show.', type: 'select', required: true, default: 'English', options: LANGUAGES.map(v => ({ value: v, label: v })) },
  { id: 'anime', name: 'Mostly anime', description: 'Adds anime sources such as Anime Tosho.', type: 'boolean', default: false },
];

/** generateTemplate() input for one set of answers and one AIOStreams service ('' = none). */
export function generatorInput(answers, serviceId) {
  const svc = SERVICES.find(([id]) => id === serviceId);
  return {
    service: svc ? svc[1] : NO_SERVICE,
    device: answers.device,
    resolution: answers.resolution,
    content: answers.anime ? 'anime' : 'all',
    langs: answers.language === 'English' ? ['English'] : [answers.language, 'English'],
    cacheMode: answers.cachedOnly ? 'cached' : 'mixed',
    ...PROFILES[answers.profile],
  };
}

/** Every combination, as [answers, serviceId], in DIMS order (service outermost). */
export function* combinations(dims = DIMS) {
  const idx = dims.map(() => 0);
  for (;;) {
    const vals = Object.fromEntries(dims.map((d, i) => [d.id, d.values[idx[i]]]));
    const { service, ...answers } = vals;
    yield [answers, service];
    let k = dims.length - 1;
    while (k >= 0 && ++idx[k] === dims[k].values.length) idx[k--] = 0;
    if (k < 0) return;
  }
}
