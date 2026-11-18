/**
 * Core formatter collection: Compact, Detailed and Badges.
 *
 * Three stream-card styles built from one set of segments, so they share
 * wording, cache labels and the score display. Every field and modifier used
 * here exists in AIOStreams' formatter engine at the pinned release
 * (configurator/UPSTREAM.pin); tests/core-formatters.test.mjs renders each
 * style through that engine for complete, sparse and edge-case streams.
 *
 * Layout rules every style follows:
 *  - a value that is missing renders nothing: no empty brackets, no "Unknown";
 *  - a separator renders only between two values that are both present;
 *  - lines that end up empty are removed by AIOStreams itself;
 *  - cache state has three cases: cached, not cached, and unknown (no label),
 *    with P2P named for what it is rather than shown as "not cached".
 *
 * The score is stream.nSeScore: 0-100, relative to the best stream in the same
 * response, or null when the config produces no Stream Expression score (Core
 * Stable and Balanced clear rankedStreamExpressions, so there it never shows).
 */

export const CORE_SCORE_MODES = Object.freeze(['plain', 'bold', 'off']);
export const DEFAULT_CORE_SCORE_MODE = 'plain';

// Mathematical sans-serif bold digits (U+1D7EC-U+1D7F5). They look bold in
// fonts that include them; a client font without them shows boxes, which is
// why plain digits stay the default. This is not font weight.
const BOLD_DIGITS = '𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵';

const SEP = ' · ';

/** `{cond["text"||""]}` */
function when(cond, text) {
  return `{${cond}["${text}"||""]}`;
}

/**
 * Join segments with `sep`, printing a separator only between two segments
 * that are both present. AIOStreams evaluates chained ::or:: / ::and::
 * conditions left to right with no grouping, so `a::or::b::and::c` is
 * (a or b) and c. That is what the separator needs, provided every segment
 * condition tests a single field: a condition that is itself `x::and::y`
 * would regroup the chain. assertAtomic() enforces this.
 */
function assertAtomic(cond) {
  if (/::(?:and|or|xor|neq|equal|left|right)::/.test(cond)) throw new Error(`Segment condition must test one field: ${cond}`);
}

function joined(segments, sep = SEP) {
  segments.forEach(([cond]) => assertAtomic(cond));
  return segments.map(([cond, text], index) => {
    const before = segments.slice(0, index).map(([c]) => c);
    const separator = index > 0 ? when(`${before.join('::or::')}::and::${cond}`, sep) : '';
    return separator + when(cond, text);
  }).join('');
}

const RESOLUTION = "{stream.resolution::replace('2160p','4K')::replace('1440p','2K')}";

function scoreText(mode) {
  if (mode === 'bold') return `★ {stream.nSeScore::string::translate('0123456789','${BOLD_DIGITS}')}`;
  return '★ {stream.nSeScore}';
}

function scoreSegment(mode) {
  return mode === 'off' ? [] : [['stream.nSeScore::exists', scoreText(mode)]];
}

// Cache state as leading icons. `null` (unknown) gets no icon rather than a
// guess; P2P has no cache, so it is named instead of shown as "not cached".
const STATE_ICONS = [
  ['service.cached::istrue', '⚡'],
  ['service.cached::isfalse', '⏳'],
  ['stream.type::=p2p', '🧲'],
];

const VIDEO = [
  ['stream.quality::exists', '{stream.quality}'],
  ['stream.encode::exists', '{stream.encode}'],
  ['stream.visualTags::exists', "{stream.visualTags::join(' ')}"],
];

const LANGUAGES = [
  'stream.languageCodes::exists',
  '{stream.languageCodes::slice(0,3)::join(\' \')}{stream.languageCodes::length::>3[" …"||""]}',
];

function compact(score) {
  return {
    name: joined([
      ...STATE_ICONS,
      ['stream.resolution::exists', RESOLUTION],
      ['service.shortName::exists', '{service.shortName}'],
    ], ' ') + '\n' + joined(scoreSegment(score)),
    description: [
      joined([...VIDEO, ['stream.size::>0', '{stream.size::sbytes}']]),
      joined([
        ['stream.audioTags::exists', "{stream.audioTags::join(' ')}"],
        ['stream.audioChannels::exists', '{stream.audioChannels::first}'],
        LANGUAGES,
        ['stream.seasonPack::istrue', 'Pack'],
      ]),
    ].join('\n'),
  };
}

function detailed(score) {
  return {
    name: [
      joined([...STATE_ICONS, ['stream.resolution::exists', RESOLUTION]], ' '),
      joined([
        ['service.shortName::exists', '{service.shortName}'],
        ['service.cached::istrue', 'Cached'],
        ['service.cached::isfalse', 'Not cached'],
        ['stream.type::=p2p', 'P2P'],
      ]),
      joined(scoreSegment(score)),
    ].join('\n'),
    description: [
      joined([
        ['stream.title::exists', '{stream.title::truncate(42)}'],
        ['stream.year::exists', '{stream.year}'],
        ['stream.seasonEpisode::exists', "{stream.seasonEpisode::join('')}"],
        ['stream.seasonPack::istrue', 'Season pack'],
      ]),
      joined([...VIDEO, ['stream.bitrate::>0', '{stream.bitrate::sbitrate}']]),
      joined([
        ['stream.audioTags::exists', "{stream.audioTags::join(' ')}"],
        ['stream.audioChannels::exists', "{stream.audioChannels::join(' ')}"],
        LANGUAGES,
        ['stream.subtitleCodes::exists', "Subs {stream.subtitleCodes::slice(0,3)::join(' ')}"],
      ]),
      joined([
        ['stream.size::>0', '{stream.size::sbytes}'],
        ['stream.seeders::>0', '👤 {stream.seeders}'],
        ['stream.releaseGroup::exists', '{stream.releaseGroup}'],
        ['addon.name::exists', '{addon.name}'],
      ]),
      joined([['stream.filename::exists', '{stream.filename::truncate(64)}']]),
      joined([['stream.message::exists', 'ℹ {stream.message::truncate(80)}']]),
    ].join('\n'),
  };
}

function badges(score) {
  const tag = (cond, text) => [cond, `[${text}]`];
  return {
    name: [
      joined([tag('stream.resolution::exists', RESOLUTION)], ' '),
      joined([
        tag('service.cached::istrue', '⚡ {service.shortName::default(\'READY\')}'),
        tag('service.cached::isfalse', '⏳ {service.shortName::default(\'QUEUE\')}'),
        tag('stream.type::=p2p', 'P2P'),
      ], ' '),
    ].join('\n'),
    description: [
      joined([
        tag('stream.quality::exists', '{stream.quality::upper}'),
        tag('stream.encode::exists', '{stream.encode::upper}'),
        ['stream.visualTags::exists', "[{stream.visualTags::join('] [')::upper}]"],
      ], ' '),
      joined([
        ['stream.audioTags::exists', "[{stream.audioTags::join('] [')::upper}]"],
        tag('stream.audioChannels::exists', '{stream.audioChannels::first}'),
        ['stream.languageCodes::exists', '[{stream.languageCodes::slice(0,3)::join(\'] [\')}]{stream.languageCodes::length::>3[" […]"||""]}'],
      ], ' '),
      joined([
        tag('stream.size::>0', '{stream.size::sbytes}'),
        tag('stream.seasonPack::istrue', 'PACK'),
        tag('stream.seeders::>0', '👤 {stream.seeders}'),
        ...scoreSegment(score).map(([cond, text]) => tag(cond, text)),
      ], ' '),
    ].join('\n'),
  };
}

const BUILDERS = { compact, detailed, badges };

export const CORE_FORMATTER_STYLES = Object.freeze({
  'core-compact': Object.freeze({
    style: 'compact', label: 'Core Compact', badge: 'New', bc: '#14b8a6',
    desc: '2-line card · cache, resolution and service first · quality, size, audio and language below',
  }),
  'core-detailed': Object.freeze({
    style: 'detailed', label: 'Core Detailed', badge: 'New', bc: '#6366f1',
    desc: 'Up to 6 lines · title and episode · video, audio, size, group, source and file name for comparing releases',
  }),
  'core-badges': Object.freeze({
    style: 'badges', label: 'Core Badges', badge: 'New', bc: '#f59e0b',
    desc: 'Text labels in [brackets] · video, audio and delivery grouped by line · no images',
  }),
});

/** True for the formatter ids this module builds. */
export function isCoreFormatter(id) {
  return Object.hasOwn(CORE_FORMATTER_STYLES, id);
}

/**
 * The formatter's name and description templates for a style and score mode.
 * Unknown score modes fall back to the default rather than throwing, so an
 * old share link can never break a build.
 */
export function buildCoreFormatter(id, { score = DEFAULT_CORE_SCORE_MODE } = {}) {
  const meta = CORE_FORMATTER_STYLES[id];
  if (!meta) throw new Error(`Unknown core formatter: ${id}`);
  const mode = CORE_SCORE_MODES.includes(score) ? score : DEFAULT_CORE_SCORE_MODE;
  const { name, description } = BUILDERS[meta.style](mode);
  return { name, d: description };
}

/** FORMATTERS entries for the collection, built with the default score mode. */
export const CORE_FORMATTERS = Object.freeze(Object.entries(CORE_FORMATTER_STYLES).map(([id, meta]) => Object.freeze({
  id, label: meta.label, badge: meta.badge, bc: meta.bc, desc: meta.desc,
  ...buildCoreFormatter(id),
})));
