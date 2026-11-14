import { test, expect } from '@playwright/test';
import { buildCoreFormatter } from '../src/data/core-formatters.js';

// The Core formatter collection through the real app: chosen style and score
// display reach the generated config, survive an import round trip, leave
// unrelated settings alone, and the picker's score control is labelled,
// keyboard-operable and fits a narrow screen.

const STATE = {
  service: 'torbox-pro', multiServices: ['torbox-pro'], device: 'generic', resolution: '1080p', content: 'all',
  audio: 'limited', outputProfile: 'advanced', langs: ['English'], cacheMode: 'mixed', instanceHost: 'elfhosted',
};

async function open(page) {
  await page.goto('/?cb-e2e=1');
  await page.waitForFunction(() => !!window.__coreBuilds, null, { timeout: 10000 });
}

const overrides = tpl => tpl.config.formatter.definitions.overrides.tamtaro;

test('each style and score display reaches the generated config', async ({ page }) => {
  await open(page);
  for (const id of ['core-compact', 'core-detailed', 'core-badges']) {
    for (const score of ['plain', 'bold', 'off']) {
      const tpl = await page.evaluate(s => window.__coreBuilds.generate(s), { ...STATE, formatter: id, fmtScore: score });
      const expected = buildCoreFormatter(id, { score });
      expect(overrides(tpl), `${id}/${score}`).toEqual({ name: expected.name, description: expected.d });
      expect(tpl.config.formatter.id).toBe('tamtaro');
    }
  }
});

test('the same state builds the same config, and the score display changes only the formatter', async ({ page }) => {
  await open(page);
  const a = await page.evaluate(s => window.__coreBuilds.generate(s), { ...STATE, formatter: 'core-compact', fmtScore: 'plain' });
  const again = await page.evaluate(s => window.__coreBuilds.generate(s), { ...STATE, formatter: 'core-compact', fmtScore: 'plain' });
  expect(again).toEqual(a);
  const bold = await page.evaluate(s => window.__coreBuilds.generate(s), { ...STATE, formatter: 'core-compact', fmtScore: 'bold' });
  const strip = tpl => ({ ...tpl, config: { ...tpl.config, formatter: null } });
  expect(strip(bold)).toEqual(strip(a));
});

test('an exported Core style imports back as the same style and score display', async ({ page }) => {
  await open(page);
  for (const [formatter, fmtScore] of [['core-compact', 'bold'], ['core-badges', 'off'], ['core-detailed', 'plain']]) {
    const tpl = await page.evaluate(s => window.__coreBuilds.generate(s), { ...STATE, formatter, fmtScore });
    const st = await page.evaluate(t => window.__coreBuilds.importState(t), tpl);
    expect(st.formatter, formatter).toBe(formatter);
    expect(st.fmtScore, formatter).toBe(fmtScore);
  }
  // A library formatter still imports as itself and leaves the score display alone.
  const lib = await page.evaluate(s => window.__coreBuilds.generate(s), { ...STATE, formatter: 'family-v4' });
  const st = await page.evaluate(t => window.__coreBuilds.importState(t), lib);
  expect(st.formatter).toBe('family-v4');
  expect(st.fmtScore).toBeUndefined();
});

test('the score control is shown for Core styles only, labelled and keyboard-operable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await open(page);
  await page.evaluate(s => window.__coreBuilds.setState(s), { ...STATE, formatter: 'family-v4', fmtScore: 'plain' });
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'fmtHost';
    // Above the splash and any modal, so clicks reach the picker as a user's would.
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;overflow:auto;padding:16px;background:var(--th-bg)';
    host.innerHTML = window.__coreBuilds.renderFormatterPicker();
    document.body.prepend(host);
  });
  await expect(page.locator('#fmtHost .fmt-score')).toBeHidden();

  await page.locator('#fmtHost .fmt-scroll-card[data-fmt="core-compact"]').click();
  const control = page.locator('#fmtHost .fmt-score');
  await expect(control).toBeVisible();
  await expect(page.getByRole('group', { name: /Score display/ })).toBeVisible();
  await expect(page.locator('#fmtHost .fmt-scroll-card[data-fmt="core-compact"] .fmt-preview-note')).toContainText('Rendered by AIOStreams');

  const plain = page.getByRole('radio', { name: /Plain digits/ });
  const bold = page.getByRole('radio', { name: /Bold-looking digits/ });
  await expect(plain).toBeChecked();
  await plain.focus();
  await page.keyboard.press('ArrowRight');
  await expect(bold).toBeChecked();
  await expect(page.locator('#fmtHost .fmt-scroll-card[data-fmt="core-compact"] .fmt-live-n')).toContainText('𝟴𝟳');
  expect(await page.evaluate(() => window.__coreBuilds.generate({}).config.formatter.definitions.overrides.tamtaro.name)).toContain('translate(');

  const overflow = await control.evaluate(el => el.scrollWidth > el.clientWidth + 1);
  expect(overflow, 'score control fits a 360px screen').toBe(false);

  await page.locator('#fmtHost .fmt-scroll-card[data-fmt="family-v4"]').click();
  await expect(control).toBeHidden();
  expect(await page.evaluate(() => window.__coreBuilds.generate({}).config.formatter.definitions.overrides.tamtaro.name)).not.toContain('translate(');
});
