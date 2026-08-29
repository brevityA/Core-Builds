import { extractPresetOptions, diffContracts, compact } from '../contract.mjs';
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
  hotspots: { 'deduplicator.merge': 'object', groups: 'object' },
  sel: { functions: ['quality', 'resolution', 'cached', 'seadex', 'count', 'slice', 'perGroup'], constants: ['isAnime'] },
  formatterFields: ['filename', 'size', 'seScore'],
  formatters: ['tamtaro', 'gdrive'],
  sortCriteria: ['cached', 'resolution', 'quality', 'size', 'visualTag', 'streamExpressionScore'],
};

const { template, warnings } = generateTemplate(
  { ...defaultRecipe(), scrapers: ['torrentio', 'comet', 'ghost-scraper', 'seadex'] },
  fixture,
);

assert(template.config.presets.length === 3, 'drops unknown ghost-scraper');
assert(warnings.some((w) => w.includes('ghost-scraper')), 'warns on unknown preset');
assert(template.config.presets.every((p) => p.instanceId && p.instanceId.length === 3), 'instanceIds assigned');
assert(template.config.presets.find((p) => p.type === 'torrentio').options.useMultipleInstances === false, 'fills required option');
assert(typeof template.config.deduplicator.merge === 'object', 'merge is object not boolean');
assert(template.config.groups.groupings[0].addons.every((a) => a.length === 3), 'groups use instanceId');
assert(!template.config.services[0] || template.config.services[0].id === 'torbox', 'torbox service');

const stale = {
  presets: [
    { type: 'annatar', enabled: true, options: { name: 'Annatar' } },
    { type: 'easynewsPlusPlus', enabled: true, options: { name: 'EN++' } },
  ],
  services: [{ id: 'torbox', enabled: true }, { id: 'debrid0', enabled: true }],
  deduplicator: { enabled: true, merge: false },
  groups: [{ addons: ['Torrentio'], condition: 'true' }],
  excludedStreamExpressions: [{ name: 'old', expression: 'notAFunction(streams)' }],
};

const healed = healTemplate(stale, fixture);
assert(!healed.template.config.presets.some((p) => p.type === 'annatar'), 'removed dead preset');
assert(healed.template.config.presets.find((p) => p.type === 'easynewsPlusPlus').options.strictTitleMatching === false, 'filled strictTitleMatching');
assert(typeof healed.template.config.deduplicator.merge === 'object', 'healed merge shape');
assert(!healed.template.config.services.some((s) => s.id === 'debrid0'), 'dropped unknown service');
assert(!healed.template.config.excludedStreamExpressions.some((e) => e.name === 'old'), 'dropped unknown SEL');

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
assert(d.changes.some((c) => c.surface === 'preset.required' && c.items.some((i) => String(i).includes('strictTitleMatching'))), 'required option drift');
assert(d.severity === 'breaking', 'newly required option is breaking');

console.log('smoke ok — parser, generate, heal, diff');
