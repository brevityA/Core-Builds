// Core Streams card formatter. Reads what a release name says about the file
// (resolution, source, codec, HDR, audio, languages, group, edition), the way
// AIOStreams' parser does, and lays every video result out the same way:
//
//   name         ⚡ TorBox        description  🎞 BluRay REMUX · HEVC · DV · HDR10
//                4K                            🔊 TrueHD Atmos · 7.1 · 🌐 🇬🇧 🇫🇷
//                                              📦 58.20 GB · 👤 312 · 🔎 Torrentio · 1337x
//                                              🏷 FraMeSToR · Extended · REPACK
//                                              📄 The.Movie.2019.2160p.UHD.BluRay.REMUX….mkv
//
// Everything shown comes from the provider's own labels: a parsed tag is what
// the release claims, not a verified property of the file.

// Rights notices on these must reach the viewer word for word, so their cards
// are never rewritten.
const OPEN_MEDIA_SOURCES = new Set(['Public Domain Movies', 'Internet Archive', 'Blender Open Movies', 'Library of Congress']);

// Facts a provider gave as structured data (seeders, size, tracker, cached),
// kept beside the stream object so they never leak into the JSON response.
const streamFacts = new WeakMap();

export function setStreamFacts(stream, facts) {
  if (!stream || typeof stream !== 'object') return stream;
  streamFacts.set(stream, { ...(streamFacts.get(stream) || {}), ...facts });
  return stream;
}

export function getStreamFacts(stream) {
  return streamFacts.get(stream) || null;
}

const QUALITY = [
  ['BluRay REMUX', /\b(?:bd|blu[ .-]?ray|uhd)?[ .-]?remux\b/],
  ['BluRay', /\b(?:blu[ .-]?ray|bd(?:rip|25|50)?|br[ .-]?rip|uhd[ .-]?bd)\b/],
  ['WEB-DL', /\bweb[ .-]?dl\b|\b(?:amzn|nf|dsnp|hmax|atvp|pcok|hulu)[ .-]web\b|\bweb\b(?![ .-]?rip)/],
  ['WEBRip', /\bweb[ .-]?rip\b/],
  ['HDTV', /\b(?:hdtv|pdtv|dsr)\b/],
  ['DVD', /\bdvd(?:rip|r|9|5)?\b/],
  ['HDRip', /\bhd[ .-]?rip\b/],
  ['CAM', /\b(?:cam|hdcam|camrip)\b/],
  ['TS', /\b(?:ts|hdts|telesync)\b/],
  ['TC', /\b(?:tc|telecine)\b/],
  ['SCR', /\b(?:scr|screener|dvdscr)\b/],
];

const ENCODE = [
  ['AV1', /\bav1\b/],
  ['HEVC', /\b(?:x|h)[ .]?265\b|\bhevc\b/],
  ['AVC', /\b(?:x|h)[ .]?264\b|\bavc\b/],
  ['VP9', /\bvp9\b/],
  ['XviD', /\bxvid\b/],
  ['DivX', /\bdivx\b/],
];

const VISUAL = [
  ['DV', /\b(?:dv|dovi|dolby[ .-]?vision)\b/],
  ['HDR10+', /\bhdr10(?:\+|plus|p)(?=\W|$)/],
  ['HDR10', /\bhdr10\b(?!\+|plus|p)/],
  ['HDR', /\bhdr\b/],
  ['HLG', /\bhlg\b/],
  ['10bit', /\b10[ .-]?bit\b/],
  ['3D', /\b3d\b/],
];

// Codecs are often glued to their channel count ("AAC2.0", "DTS5.1"), so they
// end at the next letter rather than at a word boundary.
const AUDIO = [
  ['TrueHD', /\btrue[ .-]?hd(?![a-z])/],
  ['DTS:X', /\bdts[ .:-]?x(?![a-z])/],
  ['DTS-HD MA', /\bdts[ .-]?hd[ .-]?ma(?![a-z])/],
  ['DTS-HD', /\bdts[ .-]?hd(?![a-z])(?![ .-]?ma)/],
  ['DTS', /\bdts(?![a-z])(?![ .:-]?(?:x|hd)(?![a-z]))/],
  ['DD+', /\b(?:ddp|dd\+|e[ .-]?ac[ .-]?3)/],
  ['DD', /\b(?:dd|ac[ .-]?3)(?![a-z+])/],
  ['FLAC', /\bflac(?![a-z])/],
  ['AAC', /\baac(?![a-z])/],
  ['Opus', /\bopus(?![a-z])/],
  ['Atmos', /\batmos\b/],
];

const LANGUAGES = [
  ['Multi', /\bmulti\b/], ['Dual Audio', /\bdual[ .-]?audio\b/],
  ['English', /\beng(?:lish)?\b/], ['French', /\b(?:french|vff|vfq|truefrench)\b/],
  ['German', /\b(?:german|deutsch)\b/], ['Spanish', /\b(?:spanish|espa[nñ]ol|castellano|latino)\b/],
  ['Italian', /\b(?:italian|ita)\b/], ['Portuguese', /\b(?:portuguese|pt[ .-]?br|dublado)\b/],
  ['Russian', /\b(?:russian|rus)\b/], ['Hindi', /\bhindi\b/], ['Tamil', /\btamil\b/], ['Telugu', /\btelugu\b/],
  ['Japanese', /\b(?:japanese|jpn)\b/], ['Korean', /\b(?:korean|kor)\b/], ['Chinese', /\b(?:chinese|mandarin|cantonese)\b/],
  ['Arabic', /\barabic\b/], ['Turkish', /\bturkish\b/], ['Polish', /\b(?:polish|pl)\b/], ['Dutch', /\bdutch\b/],
];

const EDITIONS = [
  ["Director's Cut", /\bdirector'?s[ .-]?cut\b|\bdc\b/],
  ['Extended', /\bextended\b/],
  ['Unrated', /\bunrated\b/],
  ['Uncut', /\buncut\b/],
  ['Theatrical', /\btheatrical\b/],
  ['Remastered', /\bremaster(?:ed)?\b/],
  ['IMAX', /\bimax\b/],
  ['Criterion', /\bcriterion\b/],
];

const FLAG_RE = /(?:[\u{1F1E6}-\u{1F1FF}]{2})/gu;
const FILE_EXT_RE = /\.(?:mkv|mp4|m4v|avi|webm|mov|ts|m2ts|wmv)$/i;

function matchAll(table, text) {
  return table.filter(([, re]) => re.test(text)).map(([label]) => label);
}

function matchFirst(table, text) {
  const hit = table.find(([, re]) => re.test(text));
  return hit ? hit[0] : '';
}

export function resolutionLabel(height) {
  if (height >= 4320) return '8K';
  if (height >= 2160) return '4K';
  if (height > 0) return `${height}p`;
  return '';
}

// The group is the last "-NAME" before the extension ("…x265-FraMeSToR.mkv"),
// or a bracketed tag at the start or end ("[SubsPlease] …", "… [YTS.MX]").
function releaseGroup(release) {
  const name = String(release || '').trim().replace(FILE_EXT_RE, '');
  const dashed = name.match(/-([A-Za-z0-9][A-Za-z0-9_]{1,24})(?:\s*\[[^\]]*\])?$/);
  if (dashed && !/^(?:dl|rip|hd|web|\d+)$/i.test(dashed[1])) return dashed[1];
  const bracket = name.match(/^\[([^\]]{2,24})\]/) || name.match(/\[([A-Za-z][A-Za-z0-9.]{1,23})\]$/);
  return bracket ? bracket[1] : '';
}

// `inferHeight` is passed in so the formatter and the ranking read resolution
// with exactly the same rules.
export function parseRelease(text, inferHeight) {
  const raw = String(text || '');
  const lower = raw.toLowerCase().replace(/[_]/g, '.');
  const height = inferHeight({ title: raw });
  let quality = matchFirst(QUALITY, lower);
  if (quality === 'TS' && !/\b(?:hdts|telesync)\b/.test(lower) && /\.ts$/i.test(raw.trim())) quality = '';
  let visual = matchAll(VISUAL, lower);
  // "HDR" alone is implied by any named HDR format.
  if (visual.some((tag) => tag === 'DV' || tag.startsWith('HDR10') || tag === 'HLG')) visual = visual.filter((tag) => tag !== 'HDR');
  if (visual.includes('HDR10+')) visual = visual.filter((tag) => tag !== 'HDR10');
  let audio = matchAll(AUDIO, lower);
  if (audio.includes('DTS-HD MA') || audio.includes('DTS:X')) audio = audio.filter((tag) => tag !== 'DTS-HD' && tag !== 'DTS');
  if (audio.includes('DD+')) audio = audio.filter((tag) => tag !== 'DD');
  // "DDP5.1", "7.1ch", "AAC 2.0" — never a size such as "2.1 GB".
  const channels = (lower.match(/(?:^|\D)([257])[ .]([01])(?:ch)?(?!\d|\.\d|\s*[gm]i?b)/) || []).slice(1, 3).join('.');
  const flags = [...new Set(raw.match(FLAG_RE) || [])];
  return {
    height,
    resolution: resolutionLabel(height) || (/\b(?:dvd|sd|480p|xvid|divx)\b/.test(lower) ? 'SD' : ''),
    quality,
    encode: matchFirst(ENCODE, lower),
    visual,
    audio,
    channels,
    languages: matchAll(LANGUAGES, lower),
    flags,
    editions: matchAll(EDITIONS, lower),
    repack: /\b(?:repack|proper|rerip)\b/.test(lower),
  };
}

const SIZE_RE = /(?:💾\s*)?(\d+(?:\.\d+)?)\s*(TB|GB|GiB|MB|MiB)\b/i;

function sizeFromText(text) {
  const match = String(text || '').match(SIZE_RE);
  if (!match) return 0;
  const unit = match[2].toUpperCase();
  const factor = unit === 'TB' ? 1e12 : unit.startsWith('G') ? (unit === 'GIB' ? 2 ** 30 : 1e9) : (unit === 'MIB' ? 2 ** 20 : 1e6);
  return Math.round(Number(match[1]) * factor);
}

export function formatSize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)} TB`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GB`;
  return `${Math.round(value / 1e6)} MB`;
}

function trackerFromText(text) {
  const match = String(text || '').match(/⚙️?\s*([^\n👤💾🌐⚙]{2,40})/u);
  return match ? match[1].trim() : '';
}

function service(stream, facts) {
  if (facts?.cached) return { tag: 'torbox', label: '⚡ TorBox' };
  if (stream.infoHash) return { tag: 'p2p', label: '🧲 P2P' };
  return { tag: 'direct', label: '🌐 Direct' };
}

function clip(text, max) {
  const value = String(text || '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * Rewrite one result's card. Returns a new object; open-media results and
 * streams with no recorded facts come back unchanged.
 */
export function formatStream(stream, { inferHeight, inferSeeders }) {
  const facts = getStreamFacts(stream);
  // YouTube results play in the native player and carry no file to describe.
  if (!stream || !facts || stream.ytId || OPEN_MEDIA_SOURCES.has(facts.source)) return stream;
  const text = [stream.title, stream.description].filter((part) => typeof part === 'string').join('\n');
  const release = facts.release || text.split('\n')[0] || '';
  const filename = stream.behaviorHints?.filename || facts.filename || '';
  const parsed = parseRelease(`${release} ${filename} ${facts.label || ''}`, inferHeight);
  // Resolution reads the whole original card, as the ranking does: Torrentio,
  // for one, gives it only in its own name ("Torrentio\n4k").
  if (!parsed.height) {
    parsed.height = inferHeight(stream);
    parsed.resolution = resolutionLabel(parsed.height) || parsed.resolution;
  }
  // Providers such as Torrentio list audio languages as flags on a later line.
  if (!parsed.flags.length) parsed.flags = [...new Set(text.match(FLAG_RE) || [])];
  const size = Number(stream.behaviorHints?.videoSize) || Number(facts.size) || sizeFromText(text);
  const seeders = Number.isFinite(Number(facts.seeders)) && facts.seeders !== undefined ? Math.floor(Number(facts.seeders)) : inferSeeders(stream);
  const tracker = facts.tracker || trackerFromText(text);
  const svc = service(stream, facts);

  const video = [parsed.quality, parsed.encode, ...parsed.visual].filter(Boolean);
  const audio = [...parsed.audio, parsed.channels].filter(Boolean);
  const languages = parsed.flags.length ? parsed.flags.join(' ') : parsed.languages.join(', ');
  const group = releaseGroup(filename || release) || releaseGroup(release);
  const tags = [group, ...parsed.editions, parsed.repack ? 'REPACK' : '', facts.pack ? 'Season pack' : ''].filter(Boolean);
  const origin = [facts.source, tracker && tracker !== facts.source ? tracker : ''].filter(Boolean).join(' · ');

  const lines = [
    video.length ? `🎞 ${video.join(' · ')}` : '',
    audio.length || languages ? [audio.length ? `🔊 ${audio.join(' · ')}` : '', languages ? `🌐 ${languages}` : ''].filter(Boolean).join(' · ') : '',
    [formatSize(size) ? `📦 ${formatSize(size)}` : '', !facts.cached && stream.infoHash && seeders > 0 ? `👤 ${seeders}` : '', origin ? `🔎 ${origin}` : ''].filter(Boolean).join(' · '),
    tags.length ? `🏷 ${tags.join(' · ')}` : '',
    filename || release ? `📄 ${clip(filename || release, 160)}` : '',
  ].filter(Boolean);

  const { title: _title, description: _description, ...rest } = stream;
  const hints = { ...(stream.behaviorHints || {}) };
  // Autoplay of the next episode stays on the same kind of release, as
  // AIOStreams' binge groups do: same service, resolution, source, codec, HDR, group.
  hints.bingeGroup = ['core-streams', svc.tag, parsed.resolution || 'unknown', parsed.quality, parsed.encode, parsed.visual.join('+'), group]
    .filter(Boolean).join('|').slice(0, 120);
  return {
    ...rest,
    name: `${svc.label}\n${parsed.resolution || '—'}`,
    description: lines.join('\n') || `🔎 ${facts.source}`,
    behaviorHints: hints,
  };
}
