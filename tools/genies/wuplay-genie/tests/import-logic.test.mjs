import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Self-contained test module: import-logic functions extracted verbatim from
// catalogs.html so tests run without a DOM or third-party dependencies.
function buildTestModule() {
  const fns = {};

  // --- extracted verbatim from catalogs.html ---
  const IMPORT_SECRET_KEY = /^(?:profilekey|profile_key|deviceToken|accessToken|refreshToken|bearerToken|authorization|cookie|token|apiKey|api_key|secret)$/i;
  const IMPORT_SOURCE_KEY = /^(?:sourceProfile|source_profile)$/i;

  function isRecord(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  function importRoot(payload) {
    const candidates = ['data', 'sync', 'snapshot', 'profileData'];
    for (const key of candidates) {
      if (isRecord(payload?.[key]) && hasImportShape(payload[key])) return payload[key];
    }
    return payload;
  }

  function hasImportShape(v) {
    return isRecord(v) && ['profile', 'settings', 'addons', 'catalogs', 'layouts', 'screens', 'hubs', 'library', 'watchlists', 'savedCollections']
      .some(k => Object.prototype.hasOwnProperty.call(v, k));
  }

  function importNorm(v) {
    return String(v ?? '').toLowerCase()
      .replace(/\s*\((?:native preset|built-in|built in|preset)\)\s*/gi, ' ')
      .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

  function importNameVariants(v) {
    const raw = String(v ?? '');
    const base = raw.replace(/\s*\((?:native preset|built-in|built in|preset)\)\s*/gi, '').trim();
    return [...new Set([importNorm(raw), importNorm(base)])].filter(Boolean);
  }

  function importHubVariants(h) {
    const aliases = {
      streaming: ['streaming', 'streaming services', 'watch providers', 'watch_providers'],
      collections: ['collections', 'movie collections', 'movie_collections'],
      genres: ['genres'], studios: ['studios'], decades: ['decades'], anime: ['anime'], kids: ['kids']
    };
    return [...new Set([
      importNorm(h?.name), importNorm(h?.systemKey),
      ...(aliases[h?.systemKey] || []).map(importNorm)
    ])].filter(Boolean);
  }

  function importFindByName(items, variants, fields = ['name']) {
    const matches = (items || []).filter(item => fields.some(field => variants.includes(importNorm(item?.[field]))));
    return matches.length === 1 ? { item: matches[0] } : matches.length > 1 ? { ambiguous: matches } : { missing: true };
  }

  function importSecretScrub(value, stats = { removed: 0 }) {
    if (Array.isArray(value)) { value.forEach(v => importSecretScrub(v, stats)); return stats; }
    if (!isRecord(value)) return stats;
    for (const key of Object.keys(value)) {
      if (IMPORT_SECRET_KEY.test(key) || IMPORT_SOURCE_KEY.test(key) || /profile.*key/i.test(key)) {
        delete value[key]; stats.removed++; continue;
      }
      importSecretScrub(value[key], stats);
    }
    return stats;
  }

  function importDesiredView() { return 'poster_rows'; }

  function importSurface(root, planRows, showField, orderField, report, label) {
    const catalogs = Array.isArray(root.catalogs) ? root.catalogs : [];
    const selected = [];
    const seen = new Set();
    for (const wanted of planRows || []) {
      const found = importFindByName(catalogs, importNameVariants(wanted.name), ['name']);
      if (found.item) {
        const id = found.item.id !== undefined ? String(found.item.id) : found.item;
        if (!seen.has(id)) {
          seen.add(id); selected.push(found.item);
          report.matched.push({ requested: wanted.name, existing: found.item.name || wanted.name });
        }
      } else if (found.ambiguous) {
        report.ambiguous.push(wanted.name);
      } else {
        report.missing.push(wanted.name);
      }
    }
    selected.forEach((catalog, i) => { catalog[showField] = true; catalog[orderField] = i; });
    const selectedSet = new Set(selected);
    const remaining = catalogs.filter(c => !selectedSet.has(c) && c[showField] !== false)
      .sort((a, b) => Number(a[orderField] ?? 999999) - Number(b[orderField] ?? 999999));
    remaining.forEach((catalog, i) => { catalog[orderField] = selected.length + i; });
    report.note = `${label}: ${selected.length} existing catalog(s) placed first; other visible catalogs preserved.`;
    return selected;
  }

  function importReorderLayout(root, selected, layoutWords) {
    const layouts = Array.isArray(root.layouts) ? root.layouts : [];
    const layout = layouts.find(l => layoutWords.includes(importNorm(l?.layoutType)));
    if (!layout || !Array.isArray(layout.rows)) return 0;
    const rank = new Map(selected.map((catalog, i) => [String(catalog.id), i]));
    const chosen = layout.rows.filter(row => row?.catalogId !== undefined && rank.has(String(row.catalogId)))
      .sort((a, b) => rank.get(String(a.catalogId)) - rank.get(String(b.catalogId)));
    const chosenSet = new Set(chosen);
    const rest = layout.rows.filter(row => !chosenSet.has(row));
    layout.rows = [...chosen, ...rest].map((row, i) => Object.assign({}, row, { position: i }));
    return chosen.length;
  }

  function buildWuplayImport(payload, PLAN, state) {
    if (!isRecord(payload) || payload.format === 'wuplay-home-plan') {
      throw new Error('Select a JSON export from WuPlay, not a Genie plan file.');
    }
    const copy = JSON.parse(JSON.stringify(payload));
    const root = importRoot(copy);
    if (!hasImportShape(root)) throw new Error('This file does not look like a WuPlay data export.');
    const report = {
      home: { matched: [], missing: [], ambiguous: [], note: '' },
      discover: { matched: [], missing: [], ambiguous: [], note: '' },
      hubs: { matched: [], missing: [], ambiguous: [] },
      screens: { matched: [], missing: [], ambiguous: [] },
      layouts: { home: 0, discover: 0 }, settings: 'not requested', warnings: []
    };
    const p = PLAN || { home: [], discover: [], hubs: [], screens: [] };
    const kidsRequested = p.extrasKids ?? (state?.extras || []).includes(0);
    const homeSelected = importSurface(root, p.home, 'showHome', 'homeOrder', report.home, 'Home');
    const discoverSelected = importSurface(root, p.discover, 'showDiscover', 'discoverOrder', report.discover, 'Discover');
    report.layouts.home = importReorderLayout(root, homeSelected, ['home']);
    report.layouts.discover = importReorderLayout(root, discoverSelected, ['discover']);

    const hubs = Array.isArray(root.hubs) ? root.hubs : [];
    for (const wanted of p.hubs || []) {
      const found = importFindByName(hubs, importHubVariants(wanted), ['name', 'systemKey']);
      if (found.item) {
        found.item.detailViewType = importDesiredView();
        report.hubs.matched.push({ requested: wanted.name, existing: found.item.name || wanted.name });
      } else if (found.ambiguous) report.hubs.ambiguous.push(wanted.name);
      else report.hubs.missing.push(wanted.name);
    }

    const screens = Array.isArray(root.screens) ? root.screens : [];
    for (const wanted of p.screens || []) {
      const found = importFindByName(screens, [importNorm(wanted.name)], ['name']);
      if (found.item) report.screens.matched.push({ requested: wanted.name, existing: found.item.name || wanted.name });
      else if (found.ambiguous) report.screens.ambiguous.push(wanted.name);
      else report.screens.missing.push(wanted.name);
    }

    if (kidsRequested) {
      const target = isRecord(root.profile?.settings) ? root.profile.settings : isRecord(root.settings) ? root.settings : null;
      if (target) {
        target.ageFilter = { movie: { minAge: 7, maxAge: 13 }, series: { minAge: 7, maxAge: 13 }, includeUnrated: false };
        report.settings = 'ageFilter updated in the existing settings object';
      } else {
        report.settings = 'not changed — no existing settings object found';
        report.warnings.push('Kids safety was requested but no existing settings object was found; use the official configurator manually.');
      }
    }
    const scrub = importSecretScrub(copy);
    if (scrub.removed) report.warnings.push(`${scrub.removed} credential field(s) removed from the downloaded copy.`);
    report.warnings.push('WuPlay import may replace existing data categories. Keep your original export as a backup before uploading this file.');
    if (!report.home.matched.length && !report.discover.matched.length && !report.hubs.matched.length && !report.screens.matched.length && report.settings === 'not requested') {
      throw new Error('The export was readable, but none of this plan matched existing WuPlay records. Nothing was prepared.');
    }
    copy._genieMetadata = {
      generator: 'WuPlay Genie — Catalog Builder',
      generatedAt: new Date().toISOString(),
      compatibility: 'This file is a compatibility candidate prepared from an official WuPlay export. It has not been validated against a documented import schema. If WuPlay rejects it, use the untouched original export instead.',
      matchedHome: report.home.matched.length,
      matchedDiscover: report.discover.matched.length,
      matchedHubs: report.hubs.matched.length,
      matchedScreens: report.screens.matched.length
    };
    return { payload: copy, report };
  }

  return {
    isRecord, importRoot, hasImportShape, importNorm, importNameVariants,
    importHubVariants, importFindByName, importSecretScrub, importSurface,
    importReorderLayout, buildWuplayImport
  };
}

const M = buildTestModule();

// ── fake data factories ──

function fakeExport(overrides = {}) {
  return {
    profile: { name: 'Living Room', settings: { theme: 'dark' }, ...overrides.profile },
    catalogs: overrides.catalogs ?? [
      { id: 'cat-1', name: 'Trending Movies', showHome: true, homeOrder: 0, showDiscover: false, discoverOrder: null },
      { id: 'cat-2', name: 'Popular Movies', showHome: true, homeOrder: 1, showDiscover: false, discoverOrder: null },
      { id: 'cat-3', name: 'Top Rated', showHome: false, homeOrder: null, showDiscover: true, discoverOrder: 0 },
      { id: 'cat-4', name: 'Trending Shows', showHome: true, homeOrder: 2, showDiscover: false, discoverOrder: null },
    ],
    hubs: overrides.hubs ?? [
      { id: 'hub-1', name: 'Genres', systemKey: 'genres', detailViewType: 'poster_rows' },
      { id: 'hub-2', name: 'Streaming Services', systemKey: 'streaming', detailViewType: 'poster_rows' },
    ],
    screens: overrides.screens ?? [
      { id: 'scr-1', name: 'Kids', hubType: 'Kids', viewType: 'poster_rows' },
    ],
    layouts: overrides.layouts ?? [
      { layoutType: 'home', rows: [
        { catalogId: 'cat-1', position: 0 },
        { catalogId: 'cat-2', position: 1 },
        { catalogId: 'cat-4', position: 2 },
      ]},
      { layoutType: 'discover', rows: [
        { catalogId: 'cat-3', position: 0 },
      ]},
    ],
    library: overrides.library ?? [{ id: 'lib-1', title: 'Test Movie' }],
    watchlists: overrides.watchlists ?? [],
    savedCollections: overrides.savedCollections ?? [],
    unknownFutureField: overrides.unknownFutureField ?? { data: 'preserve me' },
  };
}

function fakePlan(overrides = {}) {
  return {
    home: overrides.home ?? [
      { name: 'Trending Movies', src: 'native' },
      { name: 'Trending Shows', src: 'native' },
    ],
    discover: overrides.discover ?? [
      { name: 'Top Rated', src: 'native' },
    ],
    hubs: overrides.hubs ?? [
      { name: 'Genres', systemKey: 'genres', builtin: true, cards: ['Action', 'Comedy'] },
    ],
    screens: overrides.screens ?? [
      { name: 'Kids', icon: '🧸', type: 'Hub: Kids', note: 'age' },
    ],
    extrasKids: overrides.extrasKids ?? false,
  };
}

// ════════════════════════════════════════════════════════════════
// Tests
// ════════════════════════════════════════════════════════════════

describe('official export detection', () => {
  test('recognises a valid export shape', () => {
    const payload = fakeExport();
    assert.ok(M.hasImportShape(payload));
  });

  test('rejects an empty object', () => {
    assert.ok(!M.hasImportShape({}));
  });

  test('rejects a non-object', () => {
    assert.ok(!M.hasImportShape('string'));
    assert.ok(!M.hasImportShape(42));
    assert.ok(!M.hasImportShape(null));
  });

  test('accepts export with only profile key', () => {
    assert.ok(M.hasImportShape({ profile: { name: 'Test' } }));
  });
});

describe('genie-plan rejection', () => {
  test('rejects a genie plan file', () => {
    const plan = { format: 'wuplay-home-plan', planVersion: 1, plan: {} };
    assert.throws(
      () => M.buildWuplayImport(plan, fakePlan(), {}),
      { message: /Genie plan file/ }
    );
  });

  test('accepts a real export', () => {
    const payload = fakeExport();
    const result = M.buildWuplayImport(payload, fakePlan(), {});
    assert.ok(result.payload);
    assert.ok(result.report);
  });
});

describe('wrapped export detection', () => {
  test('unwraps data wrapper', () => {
    const inner = fakeExport();
    const wrapped = { data: inner };
    const root = M.importRoot(wrapped);
    assert.equal(root, inner);
  });

  test('unwraps sync wrapper', () => {
    const inner = fakeExport();
    const wrapped = { sync: inner };
    const root = M.importRoot(wrapped);
    assert.equal(root, inner);
  });

  test('unwraps snapshot wrapper', () => {
    const inner = fakeExport();
    const wrapped = { snapshot: inner };
    const root = M.importRoot(wrapped);
    assert.equal(root, inner);
  });

  test('unwraps profileData wrapper', () => {
    const inner = fakeExport();
    const wrapped = { profileData: inner };
    const root = M.importRoot(wrapped);
    assert.equal(root, inner);
  });

  test('returns payload directly when no wrapper matches', () => {
    const payload = fakeExport();
    const root = M.importRoot(payload);
    assert.equal(root, payload);
  });
});

describe('catalog matching', () => {
  test('matches catalogs by exact name', () => {
    const payload = fakeExport();
    const plan = fakePlan({ home: [{ name: 'Trending Movies', src: 'native' }] });
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.report.home.matched.length, 1);
    assert.equal(result.report.home.matched[0].existing, 'Trending Movies');
  });

  test('matches catalogs case-insensitively', () => {
    const payload = fakeExport();
    const plan = fakePlan({ home: [{ name: 'trending movies', src: 'native' }] });
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.report.home.matched.length, 1);
  });

  test('strips (native preset) suffix for matching', () => {
    const payload = fakeExport();
    const plan = fakePlan({ home: [{ name: 'Trending Movies (native preset)', src: 'native' }] });
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.report.home.matched.length, 1);
  });
});

describe('ambiguous matches', () => {
  test('reports ambiguous when multiple catalogs share a normalised name', () => {
    const payload = fakeExport({
      catalogs: [
        { id: 'c1', name: 'Trending' },
        { id: 'c2', name: 'Trending' },
      ]
    });
    const plan = fakePlan({ home: [{ name: 'Trending', src: 'native' }], discover: [], hubs: [{ name: 'Genres', systemKey: 'genres', builtin: true, cards: [] }], screens: [] });
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.report.home.ambiguous.length, 1);
    assert.equal(result.report.home.matched.length, 0);
  });
});

describe('missing catalog handling', () => {
  test('reports missing catalogs', () => {
    const payload = fakeExport();
    const plan = fakePlan({ home: [{ name: 'Nonexistent Row', src: 'native' }], discover: [], hubs: [{ name: 'Genres', systemKey: 'genres', builtin: true, cards: [] }], screens: [] });
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.report.home.missing.length, 1);
    assert.ok(result.report.home.missing.includes('Nonexistent Row'));
  });

  test('throws when nothing matches at all', () => {
    const payload = fakeExport();
    const plan = fakePlan({
      home: [{ name: 'Nothing Here', src: 'native' }],
      discover: [],
      hubs: [{ name: 'Nonexistent Hub', systemKey: 'nope', builtin: false, cards: [] }],
      screens: [{ name: 'Nonexistent Screen', icon: '?', type: 'Hub: Nope' }],
    });
    assert.throws(
      () => M.buildWuplayImport(payload, plan, {}),
      { message: /none of this plan matched/ }
    );
  });
});

describe('existing layout-row reordering', () => {
  test('reorders layout rows to match plan order', () => {
    const payload = fakeExport();
    const plan = fakePlan({
      home: [
        { name: 'Trending Shows', src: 'native' },
        { name: 'Trending Movies', src: 'native' },
      ],
    });
    const result = M.buildWuplayImport(payload, plan, {});
    const homeLayout = result.payload.layouts.find(l => l.layoutType === 'home');
    assert.ok(homeLayout);
    // First two rows should be cat-4 (Trending Shows) then cat-1 (Trending Movies)
    assert.equal(homeLayout.rows[0].catalogId, 'cat-4');
    assert.equal(homeLayout.rows[1].catalogId, 'cat-1');
    assert.equal(homeLayout.rows[0].position, 0);
    assert.equal(homeLayout.rows[1].position, 1);
  });

  test('preserves unmatched layout rows after matched ones', () => {
    const payload = fakeExport();
    const plan = fakePlan({
      home: [{ name: 'Trending Movies', src: 'native' }],
    });
    const result = M.buildWuplayImport(payload, plan, {});
    const homeLayout = result.payload.layouts.find(l => l.layoutType === 'home');
    assert.ok(homeLayout.rows.length >= 2);
    assert.equal(homeLayout.rows[0].catalogId, 'cat-1');
  });
});

describe('hub matching', () => {
  test('matches hub by systemKey alias', () => {
    const payload = fakeExport();
    const plan = fakePlan({
      hubs: [{ name: 'Streaming Services', systemKey: 'streaming', builtin: true, cards: [] }],
    });
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.report.hubs.matched.length, 1);
  });

  test('updates detailViewType on matched hub', () => {
    const payload = fakeExport();
    const plan = fakePlan({
      hubs: [{ name: 'Genres', systemKey: 'genres', builtin: true, cards: [] }],
    });
    const result = M.buildWuplayImport(payload, plan, {});
    const hub = result.payload.hubs.find(h => h.systemKey === 'genres');
    assert.equal(hub.detailViewType, 'poster_rows');
  });

  test('reports missing hub', () => {
    const payload = fakeExport();
    const plan = fakePlan({
      hubs: [{ name: 'Custom Hub', systemKey: 'custom_thing', builtin: false, cards: [] }],
    });
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.report.hubs.missing.length, 1);
  });
});

describe('kids age-filter update', () => {
  test('sets ageFilter when kids requested and settings exist', () => {
    const payload = fakeExport();
    const plan = fakePlan({ extrasKids: true });
    const result = M.buildWuplayImport(payload, plan, { extras: [0] });
    assert.equal(result.report.settings, 'ageFilter updated in the existing settings object');
    assert.deepEqual(result.payload.profile.settings.ageFilter, {
      movie: { minAge: 7, maxAge: 13 },
      series: { minAge: 7, maxAge: 13 },
      includeUnrated: false
    });
  });

  test('preserves existing settings fields alongside ageFilter', () => {
    const payload = fakeExport();
    const plan = fakePlan({ extrasKids: true });
    const result = M.buildWuplayImport(payload, plan, { extras: [0] });
    assert.equal(result.payload.profile.settings.theme, 'dark');
  });

  test('warns when no settings object exists', () => {
    const payload = fakeExport({ profile: { name: 'Test' } });
    delete payload.profile.settings;
    const plan = fakePlan({ extrasKids: true });
    const result = M.buildWuplayImport(payload, plan, { extras: [0] });
    assert.ok(result.report.warnings.some(w => w.includes('no existing settings object')));
  });

  test('skips ageFilter when kids not requested', () => {
    const payload = fakeExport();
    const plan = fakePlan({ extrasKids: false });
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.report.settings, 'not requested');
    assert.ok(!result.payload.profile.settings.ageFilter);
  });
});

describe('credential-field removal', () => {
  test('removes profileKey from profile', () => {
    const payload = fakeExport({ profile: { name: 'Test', profileKey: 'abc123', settings: {} } });
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.profile.profileKey, undefined);
  });

  test('removes deviceToken', () => {
    const payload = fakeExport();
    payload.deviceToken = 'secret-token-value';
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.deviceToken, undefined);
  });

  test('removes accessToken', () => {
    const payload = fakeExport();
    payload.accessToken = 'secret-access';
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.accessToken, undefined);
  });

  test('removes authorization from nested objects', () => {
    const payload = fakeExport();
    payload.nested = { deep: { authorization: 'Bearer xyz' } };
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.nested.deep.authorization, undefined);
  });

  test('removes sourceProfile fields', () => {
    const payload = fakeExport();
    payload.sourceProfile = { key: 'leaked' };
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.sourceProfile, undefined);
  });

  test('removes profile_key variants', () => {
    const payload = fakeExport();
    payload.profile_key = 'abc123';
    payload.nested = { profileApiKey: 'xyz789' };
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.profile_key, undefined);
    assert.equal(result.payload.nested.profileApiKey, undefined);
  });

  test('reports count of removed credentials', () => {
    const payload = fakeExport({ profile: { name: 'Test', profileKey: 'abc123', settings: {} } });
    payload.deviceToken = 'tok';
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.ok(result.report.warnings.some(w => w.includes('credential field(s) removed')));
  });
});

describe('unknown-field preservation', () => {
  test('preserves unknown top-level fields', () => {
    const payload = fakeExport();
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.deepEqual(result.payload.unknownFutureField, { data: 'preserve me' });
  });

  test('preserves unknown fields inside catalogs', () => {
    const payload = fakeExport({
      catalogs: [{ id: 'cat-1', name: 'Trending Movies', unknownField: 42, showHome: true, homeOrder: 0 }]
    });
    const plan = fakePlan({ home: [{ name: 'Trending Movies', src: 'native' }], discover: [], hubs: [{ name: 'Genres', systemKey: 'genres', builtin: true, cards: [] }], screens: [] });
    const result = M.buildWuplayImport(payload, plan, {});
    const cat = result.payload.catalogs.find(c => c.id === 'cat-1');
    assert.equal(cat.unknownField, 42);
  });

  test('preserves library and watchlists', () => {
    const payload = fakeExport();
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.library.length, 1);
    assert.equal(result.payload.library[0].title, 'Test Movie');
  });
});

describe('original-input immutability', () => {
  test('does not mutate the original payload', () => {
    const payload = fakeExport();
    const original = JSON.stringify(payload);
    const plan = fakePlan();
    M.buildWuplayImport(payload, plan, {});
    assert.equal(JSON.stringify(payload), original);
  });

  test('does not mutate nested objects in the original', () => {
    const payload = fakeExport({ profile: { name: 'Test', profileKey: 'abc123', settings: { theme: 'dark' } } });
    const plan = fakePlan({ extrasKids: true });
    const originalProfile = JSON.stringify(payload.profile);
    M.buildWuplayImport(payload, plan, { extras: [0] });
    assert.equal(JSON.stringify(payload.profile), originalProfile);
  });
});

describe('importNorm', () => {
  test('normalises whitespace and case', () => {
    assert.equal(M.importNorm('  Trending  Movies  '), 'trending movies');
  });

  test('strips native-preset suffix', () => {
    assert.equal(M.importNorm('Popular Movies (native preset)'), 'popular movies');
  });

  test('strips built-in suffix', () => {
    assert.equal(M.importNorm('Continue Watching (built-in)'), 'continue watching');
  });
});

describe('compatibility-candidate metadata', () => {
  test('generated file includes _genieMetadata', () => {
    const payload = fakeExport();
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.ok(result.payload._genieMetadata);
    assert.equal(result.payload._genieMetadata.generator, 'WuPlay Genie — Catalog Builder');
    assert.ok(result.payload._genieMetadata.compatibility.includes('compatibility candidate'));
  });

  test('metadata includes match counts', () => {
    const payload = fakeExport();
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload._genieMetadata.matchedHome, 2);
    assert.equal(result.payload._genieMetadata.matchedDiscover, 1);
    assert.equal(result.payload._genieMetadata.matchedHubs, 1);
  });

  test('metadata has generatedAt timestamp', () => {
    const payload = fakeExport();
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.ok(result.payload._genieMetadata.generatedAt);
    assert.ok(!isNaN(Date.parse(result.payload._genieMetadata.generatedAt)));
  });
});

describe('data-replacement warning', () => {
  test('report always includes data-replacement warning', () => {
    const payload = fakeExport();
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.ok(result.report.warnings.some(w => w.includes('WuPlay import may replace existing data categories')));
  });
});

describe('expanded credential scrubbing', () => {
  test('removes apiKey field', () => {
    const payload = fakeExport();
    payload.apiKey = 'secret-api-key';
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.apiKey, undefined);
  });

  test('removes api_key field', () => {
    const payload = fakeExport();
    payload.nested = { api_key: 'secret' };
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.nested.api_key, undefined);
  });

  test('removes bearerToken field', () => {
    const payload = fakeExport();
    payload.bearerToken = 'bearer-secret';
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.bearerToken, undefined);
  });

  test('removes secret field', () => {
    const payload = fakeExport();
    payload.secret = 'top-secret';
    const plan = fakePlan();
    const result = M.buildWuplayImport(payload, plan, {});
    assert.equal(result.payload.secret, undefined);
  });
});

describe('importHubVariants', () => {
  test('includes systemKey aliases', () => {
    const variants = M.importHubVariants({ name: 'Streaming Services', systemKey: 'streaming' });
    assert.ok(variants.includes('streaming services'));
    assert.ok(variants.includes('streaming'));
    assert.ok(variants.includes('watch providers'));
  });
});
