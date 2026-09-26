import {
  extractPresetOptions,
  extractModifiers,
  resolvedStringArrayDecl,
  diffContracts,
  compact,
} from '../contract.mjs';
import { generateTemplate, healTemplate, defaultRecipe } from '../generate.mjs';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const easynews = `
export class EasynewsPlusPlusPreset {
  static override get METADATA() {
    return {
      ID: 'easynewsPlusPlus',
      OPTIONS: [
        { id: 'name', type: 'string', required: true, default: 'Easynews++' },
        { id: 'timeout', type: 'number', required: true, default: 7000 },
        {
          id: 'strictTitleMatching',
          name: 'Strict Title Matching',
          type: 'boolean',
          required: true,
          default: false,
        },
      ],
    };
  }
}
`;

const opts = extractPresetOptions(easynews);
assert(opts.some((o) => o.id === 'strictTitleMatching' && o.required === true), 'parses required strictTitleMatching');
assert(opts.find((o) => o.id === 'strictTitleMatching').default === false, 'default false');

const modifierSource = `
const stringModifiers = {
  upper: (value) => value.toUpperCase(),
};
function replaceAll(value, search, replacement) {
  while (value.includes(search)) value = value.replace(search, replacement);
  return value;
}
const arrayModifiers = {
  unique: (value) => {
    const seen = new Set();
    return value.filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  },
};
const numberModifiers = {
  comma: (value) => value.toLocaleString(),
};
const booleanModifiers = {
  string: (value) => String(value),
};
function helper(literals, references, ctx) {
  return { literals, references, ctx };
}
`;
const modifierNames = extractModifiers(modifierSource);
assert(
  JSON.stringify(modifierNames) === JSON.stringify(['comma', 'string', 'unique', 'upper']),
  `formatter modifiers stay scoped to their tables: ${modifierNames.join(', ')}`,
);
assert(!modifierNames.includes('search') && !modifierNames.includes('ctx'), 'ignores function parameters');

const formatterConstants = `
export const GDRIVE_FORMATTER = 'gdrive';
export const TAMTARO_FORMATTER = 'tamtaro';
export const CUSTOM_FORMATTER = 'custom';
export const FORMATTERS = [
  GDRIVE_FORMATTER,
  TAMTARO_FORMATTER,
  CUSTOM_FORMATTER,
] as const;
`;
assert(
  JSON.stringify(resolvedStringArrayDecl(formatterConstants, 'FORMATTERS', {
    GDRIVE_FORMATTER: 'gdrive',
    TAMTARO_FORMATTER: 'tamtaro',
    CUSTOM_FORMATTER: 'custom',
  })) === JSON.stringify(['gdrive', 'tamtaro', 'custom']),
  'resolves formatter arrays declared through constants',
);

const fixture = {
  kind: 'merged',
  fingerprint: 'test',
  version: '2.33.2',
  presetIds: ['torrentio', 'comet', 'easynewsPlusPlus', 'seadex'],
  presets: [
    { id: 'torrentio', name: 'Torrentio', services: ['torbox', 'realdebrid'], requiredOptions: [{ id: 'useMultipleInstances', type: 'boolean', default: false }], options: [] },
    { id: 'comet', name: 'Comet', services: ['torbox'], requiredOptions: [], options: [] },
    { id: 'easynewsPlusPlus', name: 'Easynews++', services: ['easynews'], requiredOptions: [{ id: 'strictTitleMatching', type: 'boolean', default: false }], options: [] },
    { id: 'seadex', name: 'SeaDex', services: [], requiredOptions: [], options: [] },
  ],
  serviceIds: ['torbox', 'realdebrid', 'easynews'],
  schemaKeys: [
    'addonName', 'addonDescription', 'services', 'presets', 'formatter',
    'excludedResolutions', 'excludedAudioTags', 'excludedVisualTags', 'excludedQualities',
    'excludedStreamExpressions', 'preferredStreamExpressions', 'includedStreamExpressions',
    'rankedStreamExpressions', 'sortCriteria', 'deduplicator', 'groups', 'dynamicAddonFetching',
    'titleMatching', 'yearMatching', 'seasonEpisodeMatching', 'autoPlay',
    'precacheNextEpisode', 'preloadStreams', 'checkOwned', 'showChanges',
  ],
  hotspots: {
    'deduplicator.merge': 'object',
    groups: 'object',
    titleMatching: 'object',
    yearMatching: 'object',
    seasonEpisodeMatching: 'object',
    autoPlay: 'object',
    preloadStreams: 'object',
  },
  sel: { functions: ['quality', 'resolution', 'cached', 'uncached', 'type', 'seadex', 'count', 'slice', 'perGroup', 'negate'], constants: ['isAnime'] },
  formatterFields: ['filename', 'size', 'seScore'],
  formatterModifiers: ['upper'],
  formatterComparators: ['and'],
  formatters: ['gdrive', 'tamtaro'],
  sortCriteria: ['cached', 'resolution', 'quality', 'size', 'visualTag', 'streamExpressionScore'],
  autoPlayMethods: ['matchingFile', 'matchingIndex', 'firstFile'],
  autoPlayAttributes: ['resolution', 'quality', 'audioTags'],
};

const { template, warnings } = generateTemplate(
  { ...defaultRecipe(), scrapers: ['torrentio', 'comet', 'ghost-scraper', 'seadex'] },
  fixture,
);

assert(template.config.presets.length === 3, 'drops unknown ghost-scraper');
assert(warnings.some((w) => w.includes('ghost-scraper')), 'warns on unknown preset');
assert(template.config.presets.every((p) => p.instanceId && p.instanceId.length === 3), 'instanceIds assigned');
assert(template.config.presets.find((p) => p.type === 'torrentio').options.useMultipleInstances === false, 'fills required option');
assert(template.config.deduplicator.multiGroupBehaviour === 'aggressive', 'uses current deduplicator shape');
assert(template.config.deduplicator.uncached === 'per_service', 'keeps one uncached result per service');
assert(Array.isArray(template.config.deduplicator.smartDetectAttributes), 'includes smart-detect attributes');
assert(template.config.groups.groupings.length === 2, 'splits addons into sequential groups');
assert(template.config.groups.groupings.flatMap((g) => g.addons).every((a) => a.length === 3), 'groups use instanceId');
assert(template.config.groups.groupings[1].condition.includes('previousStreams'), 'group fallback uses current context');
assert(template.config.dynamicAddonFetching.condition.includes('totalStreams'), 'dynamic fetching uses current context');
assert(template.config.services.length > 0 && template.config.services[0].id === 'torbox', 'torbox service');
assert(template.metadata.source === 'external', 'uses a valid current template source');
assert(template.metadata.serviceRequired === false, 'service selection can be skipped');
assert(template.metadata.setToSaveInstallMenu === true, 'opens Save & Install after import');
assert(!('_regen' in template), 'keeps generated templates to metadata + config');
assert(template.config.formatter.id === 'gdrive', 'uses a built-in formatter without custom overrides');
assert(template.config.titleMatching.mode === 'contains', 'uses titleMatching.mode');
assert(template.config.titleMatching.similarityThreshold === 0.75, 'uses titleMatching.similarityThreshold');
assert(!('method' in template.config.titleMatching), 'does not emit legacy titleMatching.method');
assert(template.config.autoPlay.method === 'matchingFile', 'uses a supported autoplay method');
assert(Array.isArray(template.config.autoPlay.attributes), 'includes autoplay matching attributes');
assert(typeof template.config.preloadStreams === 'object', 'preloadStreams uses the current object shape');
assert(typeof template.config.preloadStreams.selector === 'string', 'preloadStreams includes a selector');
assert(typeof template.config.precacheSelector === 'string', 'includes the current precache selector');
assert(
  template.config.includedStreamExpressions.some((row) => row.expression.includes('0Cached')),
  'includes an uncached fallback when no cached stream exists',
);
assert(
  template.config.excludedStreamExpressions.some((row) =>
    row.expression.includes("negate(streams, perGroup(streams, 'resolution', 4))")
  ),
  'caps each resolution with the current perGroup signature',
);
for (const key of [
  'excludedStreamExpressions',
  'preferredStreamExpressions',
  'includedStreamExpressions',
  'rankedStreamExpressions',
]) {
  assert(template.config[key].every((row) => !('name' in row)), `${key} omits unsupported name keys`);
  assert(template.config[key].every((row) => row.expression.startsWith('/* ')), `${key} names live in comments`);
}

const stale = {
  presets: [
    { type: 'annatar', enabled: true, options: { name: 'Annatar' } },
    { type: 'easynewsPlusPlus', enabled: true, options: { name: 'EN++' } },
  ],
  services: [{ id: 'torbox', enabled: true }, { id: 'debrid0', enabled: true }],
  deduplicator: { enabled: true, merge: false },
  groups: [{ addons: ['Torrentio'], condition: 'true' }],
  titleMatching: { enabled: true, method: 'contains', similarity: 0.75 },
  autoPlay: { enabled: true, method: 'default' },
  preloadStreams: true,
  excludedStreamExpressions: [{ name: 'old', expression: 'notAFunction(streams)' }],
  preferredStreamExpressions: [{ name: 'Cached', expression: 'cached(streams)', enabled: true }],
};

const healed = healTemplate(
  {
    metadata: {
      name: 'Old regen',
      description: 'Old generated template',
      author: 'aios-regen',
      source: 'aios-regen',
      category: 'community',
    },
    config: stale,
  },
  fixture,
);
assert(healed.template.metadata.source === 'external', 'healed invalid legacy metadata source');
assert(!healed.template.config.presets.some((p) => p.type === 'annatar'), 'removed dead preset');
assert(healed.template.config.presets.find((p) => p.type === 'easynewsPlusPlus').options.strictTitleMatching === false, 'filled strictTitleMatching');
assert(typeof healed.template.config.deduplicator.merge === 'object', 'healed merge shape');
assert(!healed.template.config.services.some((s) => s.id === 'debrid0'), 'dropped unknown service');
assert(!healed.template.config.excludedStreamExpressions.some((e) => e.name === 'old'), 'dropped unknown SEL');
assert(healed.template.config.groups && healed.template.config.groups.groupings, 'healed groups array → object');
assert(healed.template.config.preloadStreams.enabled === true, 'healed preloadStreams boolean → object');
assert(healed.template.config.titleMatching.mode === 'contains', 'healed titleMatching.method → mode');
assert(healed.template.config.titleMatching.similarityThreshold === 0.75, 'healed titleMatching similarity key');
assert(!('method' in healed.template.config.titleMatching), 'removed legacy titleMatching method');
assert(healed.template.config.autoPlay.method === 'matchingFile', 'healed unsupported autoplay method');
assert(!('name' in healed.template.config.preferredStreamExpressions[0]), 'removed unsupported SEL name');
assert(
  healed.template.config.preferredStreamExpressions[0].expression.startsWith('/* Cached */'),
  'preserved SEL name as an expression comment',
);

const pinned = compact({
  ...fixture,
  kind: 'source',
  extractedAt: '2026-08-01T00:00:00Z',
  presetIds: ['torrentio', 'comet'],
  sel: { functions: ['quality'], constants: [] },
});
const live = compact({
  ...fixture,
  kind: 'source',
  extractedAt: '2026-08-29T00:00:00Z',
  presetIds: ['torrentio', 'comet', 'davex'],
  sel: { functions: ['quality', 'perGroup'], constants: [] },
  formatters: [...fixture.formatters, 'prism'],
  autoPlayMethods: [...fixture.autoPlayMethods, 'futureMethod'],
  presets: [
    ...fixture.presets,
    { id: 'davex', requiredOptions: [{ id: 'manifestUrl' }] },
  ],
});
live.presets.find((p) => p.id === 'easynewsPlusPlus').requiredOptions = [
  { id: 'strictTitleMatching' },
];
pinned.presets = fixture.presets.map((p) => ({ ...p, requiredOptions: p.id === 'easynewsPlusPlus' ? [] : p.requiredOptions }));

const d = diffContracts(pinned, live);
assert(d.drifted, 'detects drift');
assert(d.changes.some((c) => c.surface === 'presets' && c.items.includes('davex')), 'davex added');
assert(d.changes.some((c) => c.surface === 'sel.functions' && c.items.includes('perGroup')), 'perGroup added');
assert(d.changes.some((c) => c.surface === 'formatters' && c.items.includes('prism')), 'formatter added');
assert(d.changes.some((c) => c.surface === 'autoPlay.methods' && c.items.includes('futureMethod')), 'autoplay method added');
assert(d.changes.some((c) => c.surface === 'preset.required' && c.items.some((i) => String(i).includes('strictTitleMatching'))), 'required option drift');
assert(d.severity === 'breaking', 'newly required option is breaking');

console.log('smoke ok — parser, generate, heal, diff');
