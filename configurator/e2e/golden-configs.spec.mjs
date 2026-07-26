import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Golden config snapshots — the whole generation pipeline (S → build() → buildFinal())
// exercised through the real app via the ?cb-e2e=1 hook, diffed against checked-in
// goldens. Any logic change that alters generated templates fails CI here; if the
// change is intentional, re-run with UPDATE_GOLDEN=1 and review the diff.
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
  { name: 'p2p-1080p', state: { service: 'p2p', multiServices: ['p2p'], p2pEnabled: true, resolution: '1080p' } },
  { name: 'http-1080p', state: { service: 'http', multiServices: ['http'], resolution: '1080p' } },
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
