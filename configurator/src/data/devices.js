export const DEVICE_AUDIO_DEFAULTS = { samsung:'standard', 'firestick-hd':'limited', 'firestick-4kmax':'standard', shield:'lossless', lgtv:'standard', 'appletv-old':'standard', 'appletv-new':'standard', windows:'lossless', generic:'standard', roku:'limited', chromecast:'limited', sony:'standard', ipad:'limited', projector:'limited', onn:'limited', googletv:'limited', xiaomi:'standard', 'xiaomi-3rd':'standard' };
export const DEVICE_FORCE_LIMITED_AUDIO = new Set(['generic','samsung','firestick-hd','roku','chromecast','ipad','projector','onn','googletv','lgtv','sony','appletv-old','appletv-new']);
export const DEVICE_AV1_SAFE = new Set(['firestick-4kmax','googletv','onn','xiaomi','xiaomi-3rd','windows']);
export const DEVICE_DV_SAFE = new Set(['appletv-old','appletv-new','lgtv','firestick-4kmax','shield','googletv','chromecast','sony','xiaomi','xiaomi-3rd']);
export const POPULAR_DEVICE_IDS = new Set(['onn','shield','firestick-4kmax','googletv']);
