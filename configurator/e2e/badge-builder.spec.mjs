import { test, expect } from '@playwright/test';

const STORAGE_KEY = 'nuvio-universal-builder-v3';
const TEST_BADGES = [
  { id:'test-4k', groupId:'resolution', name:'4K', pattern:'/4K|2160p/i', imageURL:'', tagColor:'#00e5ff', borderColor:'', textColor:'', tagStyle:'filled', isEnabled:true, type:'filter', markerCode:1, markerField:'stream.resolution', markerMode:'contains', markerValues:['2160p'] },
  { id:'test-hdr', groupId:'visual', name:'HDR', pattern:'/HDR/i', imageURL:'', tagColor:'#ff9800', borderColor:'', textColor:'', tagStyle:'filled', isEnabled:true, type:'filter', markerCode:2, markerField:'stream.visualTags', markerMode:'contains', markerValues:['HDR'] },
  { id:'test-remux', groupId:'quality', name:'Remux', pattern:'/REMUX/i', imageURL:'', tagColor:'#4caf50', borderColor:'', textColor:'', tagStyle:'filled', isEnabled:true, type:'filter', markerCode:3, markerField:'stream.quality', markerMode:'contains', markerValues:['Remux'] },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/tools/badges/');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

async function seedAndReload(page) {
  await page.evaluate(([key, badges]) => {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    saved.filters = badges;
    saved.nextMarkerCode = badges.length + 1;
    localStorage.setItem(key, JSON.stringify(saved));
  }, [STORAGE_KEY, TEST_BADGES]);
  await page.reload();
}

test('builds and previews an enhanced badge pack without exposing regex controls', async ({ page }) => {
  await expect(page.locator('[data-step="1"]').first()).toBeVisible();
  await expect(page.getByText('Match Pattern', { exact:false })).toHaveCount(0);
  await expect(page.locator('[data-mode="enhanced"]')).toHaveClass(/active/);

  await seedAndReload(page);
  await page.getByRole('button', { name:'Choose badges →' }).click();
  await page.getByRole('button', { name:/Preview.*export/i }).click();
  await expect(page.locator('#previewModeBadge')).toContainText('AIO Enhanced');
  await expect(page.locator('#badgeCountBadge')).toContainText(/\d+ badges/);
});

test('downloads a backup before returning a verified temporary import URL', async ({ page }) => {
  const importUrl = 'https://core-builds-cors-proxy.tlorenzato26.workers.dev/t/badgetest1';
  await page.route('https://core-builds-cors-proxy.tlorenzato26.workers.dev/**', async (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ url:importUrl }) });
    }
    return route.fulfill({ status:200, contentType:'application/json', body:'{"groups":[],"filters":[]}' });
  });

  await seedAndReload(page);
  await page.getByRole('button', { name:'Choose badges →' }).click();
  await page.getByRole('button', { name:/Preview.*export/i }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#createImportUrlBtn').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/backup\.json$/);
  await expect(page.locator('#importUrlOutput')).toHaveValue(importUrl, { timeout:10000 });
  await expect(page.locator('#importUrlStatus')).toContainText('Core Worker');
});

test('hands the companion formatter to the existing Configurator and consumes it once', async ({ page }) => {
  await seedAndReload(page);
  await page.getByRole('button', { name:'Choose badges →' }).click();
  await page.getByRole('button', { name:/Preview.*export/i }).click();

  await page.locator('#openConfiguratorBtn').click();

  const handoff = await page.evaluate(() => localStorage.getItem('cb-badge-builder-handoff-v1'));
  expect(handoff).toBeTruthy();
  const parsed = JSON.parse(handoff);
  expect(parsed.source).toBe('core-badge-builder');
  expect(parsed.formatter.name.length).toBeGreaterThan(100);
});
