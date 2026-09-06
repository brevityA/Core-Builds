import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Golden config snapshots — the whole generation pipeline (S → build() → buildFinal())
// exercised through the real app via the ?cb-e2e=1 hook, diffed against checked-in
// goldens. Any logic change that alters generated templates fails CI here; if the
// change is intentional, re-run with UPDATE_GOLDEN=1 and review the diff.
//
// The goldens are REGENERATED OUTPUT, not hand-written fixtures. Any change to
// the sort policy, the device policies or the host-capability gate changes them
// by design — refresh them in the same commit as the behaviour change.
//
//   UPDATE_GOLDEN=1 npx playwright test e2e/golden-configs.spec.mjs --project=desktop

const GOLDEN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'golden');
const UPDATE = !!process.env.UPDATE_GOLDEN;

// Every field the pipeline reads that could otherwise vary by browser/viewport.
const BASE = {
  service: 'torbox-pro',
  multiServices: ['torbox-pro'],
  device: 'generic',
  audio: 'limited',
  content: 'all',
  name: '',
  formatter: 'family-v4',
  matchMode: 'balanced',
  cacheMode: 'mixed',
  streamPool: 'normal',
  pseArch: 'standard',
  qualityFirst: false,
  resolutionFirst: false,
  foreignLangKill: true,
  exclude4K: false,
  excludeDV: false,
  langs: ['English'],
  langExclusive: false,
  sizeLimit: 'unlimited',
  p2pEnabled: false,
  instanceHost: 'elfhosted',
  subtitleLangs: ['en'],
  subtitleAddons: ['aiosubtitle'],
  catalogs: ['tmdb-addon'],
  proxyEnabled: false,
  proxiedServices: [],
  optionalScrapers: [],
  dedupMerge: false,
  preloadEnabled: true,
  autoPlayMethod: 'matchingFile',
  addonTimeout: 6000,
  patchCinemeta: false,
  installAIOMeta: false,
  ageLimit: 'none',
  libraryBoost: 'default',
  nzbFailover: false,
  nzbFailoverPosition: 'after-torrents',
  maxFailoverNzbs: 3,
  quickStart: false,
  simpleMode: false,
  outputProfile: 'auto',
  aiostreamsVersion: '2.31.1',
  tmdbToken: '',
  tmdbApiKey: '',
};

const MATRIX = [
  { name: 'torbox-1080p-standard', state: { resolution: '1080p' } },
  { name: 'torbox-4k-standard', state: { resolution: '4k' } },
  { name: 'torbox-4k-iqr', state: { resolution: '4k', pseArch: 'iqr' } },
  { name: 'torbox-4k-apex-mixed', state: { resolution: '4k', pseArch: 'apex-mixed' } },
  { name: 'torbox-mixed-standard', state: { resolution: 'mixed' } },
  { name: 'torbox-mixed-apex-mixed', state: { resolution: 'mixed', pseArch: 'apex-mixed' } },
  { name: 'torbox-ultrawide', state: { resolution: 'ultrawide', device: 'windows' } },
  { name: 'torbox-4k-samsung', state: { resolution: '4k', device: 'samsung' } },
  { name: 'alldebrid-1080p', state: { service: 'alldebrid', multiServices: ['alldebrid'], resolution: '1080p' } },
  { name: 'easynews-1080p', state: { service: 'easynews', multiServices: ['easynews'], resolution: '1080p' } },
  // Regression pin for the library contract: EasyNews alone CANNOT back the
  // AIOStreams Library preset (LibraryPreset.supportedServices @ v2.34.0),
  // but adding a debrid service makes it legal again.
  { name: 'easynews-torbox-multi-1080p', state: { service: 'multi', multiServices: ['easynews', 'torbox-pro'], resolution: '1080p' } },
  // ElfHosted disables P2P and HTTP streams, so the free lanes are pinned to a
  // host that actually serves them — otherwise the host gate (correctly) marks
  // the very stream types these fixtures exist to cover as excluded.
  { name: 'p2p-1080p', state: { service: 'p2p', multiServices: ['p2p'], p2pEnabled: true, resolution: '1080p', instanceHost: 'fortheweak' } },
  { name: 'http-1080p', state: { service: 'http', multiServices: ['http'], resolution: '1080p', instanceHost: 'fortheweak' } },
  { name: 'core-stable-torbox-1080p', profile: 'stable', state: { resolution: '1080p', simpleMode: true } },
  { name: 'core-stable-torbox-4k', profile: 'stable', state: { resolution: '4k', simpleMode: true } },
  { name: 'core-balanced-torbox-1080p', profile: 'balanced', state: { resolution: '1080p', outputProfile: 'balanced' } },
];

for (const combo of MATRIX) {
  test(`golden: ${combo.name}`, async ({ page }) => {
    await page.goto('/?cb-e2e=1');
    await page.waitForFunction(() => !!window.__coreBuilds, null, { timeout: 10000 });
    const state = { ...BASE, ...combo.state };
    const tpl = await page.evaluate(s => window.__coreBuilds.generate(s), state);
    expect(tpl, 'buildFinal() returned nothing').toBeTruthy();
    expect(tpl.config, 'generated template has no config').toBeTruthy();
    expect(tpl.metadata?.generatedAt, 'generatedAt must be stripped for golden stability').toBeUndefined();
    const expectedProfile = combo.profile || (state.pseArch === 'apex-mixed' ? 'labs' : state.pseArch === 'iqr' ? 'advanced' : 'balanced');
    expect(tpl.metadata?.coreBuildsProfile, 'generated output must identify its output profile').toBe(expectedProfile);
    for (const key of [
      'syncedExcludedStreamExpressionUrls',
      'syncedIncludedStreamExpressionUrls',
      'syncedPreferredStreamExpressionUrls',
      'syncedRankedStreamExpressionUrls',
    ]) {
      expect(tpl.config[key] || [], `${combo.name} must not emit ${key}`).toEqual([]);
    }

    if (state.aiostreamsVersion !== '2.31.1') {
      expect(tpl.config.presets.some(preset => preset.type === 'torbox-search'), `${combo.name} must not emit legacy TorBox Search outside the v2.31.1 lane`).toBe(false);
    }

    // Host-side contract (LibraryPreset.supportedServices @ v2.34.0, mirrored
    // independently in e2e/lib/aiostreams-contract.mjs): an enabled Library
    // preset with no usable service is a hard "400 on save" failure upstream.
    // Keep the two in lockstep on every fixture — easynews-only must omit the
    // preset; easynews+debrid must keep it.
    {
      const libPreset = tpl.config.presets.find(p => p.type === 'library');
      const enabledSvcIds = (tpl.config.services || []).filter(s => s.enabled).map(s => s.id);
      const LIBRARY_CAPABLE = ['alldebrid','debrider','debridlink','easydebrid','offcloud','premiumize','pikpak','realdebrid','torbox','torrin','nzbdav','altmount','stremthru_newz','aiostreams'];
      if (enabledSvcIds.some(id => LIBRARY_CAPABLE.includes(id))) {
        expect(Boolean(libPreset), `${combo.name}: an enabled debrid/engine service must keep the Library preset`).toBe(true);
      } else {
        expect(libPreset, `${combo.name}: no library-capable service — the preset must be omitted or the host rejects the save`).toBeUndefined();
      }
    }

    if (expectedProfile === 'stable') {
      expect(tpl.config.syncedRankedRegexUrls || []).toEqual([]);
      expect(tpl.config.syncedRankedStreamExpressionUrls || []).toEqual([]);
      expect(tpl.config.groups?.enabled).toBe(false);
      expect(tpl.config.dynamicAddonFetching?.enabled).toBe(false);
      expect(tpl.config.excludedStreamExpressions || []).toHaveLength(1);
      expect(tpl.config.resultLimits?.mode).toBe('independent');
      expect(tpl.config.hideErrors).toBe(false);
    }

    if (['p2p', 'http'].includes(state.service)) {
      const peerflix = tpl.config.presets.find(preset => preset.type === 'peerflix');
      expect(peerflix, `${combo.name} must include Peerflix`).toBeTruthy();
      expect(peerflix.options.useMultipleInstances, `${combo.name} Peerflix must satisfy AIOStreams' schema`).toBe(false);
    }

    const goldenPath = resolve(GOLDEN_DIR, `${combo.name}.json`);
    const json = JSON.stringify(tpl, null, 2) + '\n';

    if (UPDATE) {
      mkdirSync(GOLDEN_DIR, { recursive: true });
      writeFileSync(goldenPath, json);
      test.info().annotations.push({ type: 'info', description: `golden written: ${combo.name}.json` });
      return;
    }

    expect(existsSync(goldenPath), `missing golden ${combo.name}.json — generate with UPDATE_GOLDEN=1`).toBe(true);
    const expected = readFileSync(goldenPath, 'utf8');
    expect(json, `generated config drifted from golden "${combo.name}.json" — if intentional, re-run with UPDATE_GOLDEN=1 and review the diff`).toBe(expected);
  });
}
