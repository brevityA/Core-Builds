import { test, expect } from '@playwright/test';

test('review screen produces a compact safe feedback report without credentials or URLs', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('cb_tut_seen', '1');
    localStorage.setItem('coreBuild', JSON.stringify({
      _schema: 4,
      multiServices: ['torbox-pro'],
      device: 'firestick-hd',
      resolution: '4k',
      content: 'live',
      audio: 'limited',
      cacheMode: 'cached',
      outputProfile: 'auto',
      aiostreamsVersion: '2.31.1',
    }));
    localStorage.setItem('coreBuildStep', '6');
  });
  await page.reload();
  await page.getByRole('button', { name: 'Resume' }).click();
  const feedbackButton = page.getByRole('button', { name: /need help\? copy a safe feedback report/i });
  await expect(feedbackButton).toBeVisible();
  await feedbackButton.click();
  await expect(page.locator('#feedbackReportModal')).toBeVisible();

  await page.locator('#feedbackTitleEpisode').fill('Example Title S02E03');
  await page.locator('#feedbackAddonStreams').selectOption('No');
  await page.locator('#feedbackVisibleError').fill('Error at https://example.invalid/private token=not-for-output');

  const preview = page.locator('#feedbackReportPreview');
  await expect(preview).toContainText('Device: Fire Stick');
  await expect(preview).toContainText('Exact title + episode: Example Title S02E03');
  await expect(preview).toContainText('Any addon returned streams: No');
  await expect(preview).toContainText('[redacted URL]');
  await expect(preview).toContainText('token=[redacted]');
  await expect(preview).not.toContainText('https://example.invalid/private');
  await expect(preview).not.toContainText('not-for-output');
});
