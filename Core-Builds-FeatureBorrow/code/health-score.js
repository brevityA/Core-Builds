/**
 * Template Health Score — unique to Core Builds.
 * 
 * Calculates a 0–100 score based on template quality.
 * No other tool in the ecosystem does this.
 */

/**
 * Calculate a health score for an AIOStreams config.
 * @param {Object} config - The config object (not the full template)
 * @returns {{ score: number, maxScore: number, breakdown: Array<{label: string, points: number, max: number, reason: string}> }}
 */
export function calculateHealthScore(config) {
  const breakdown = [];
  let score = 0;
  let maxScore = 0;

  // Helper
  const check = (label, max, points, reason) => {
    maxScore += max;
    score += Math.min(points, max);
    breakdown.push({ label, points: Math.min(points, max), max, reason });
  };

  // 1. Sort criteria coverage (max 20)
  const sortKeys = (config.sortCriteria?.global || []).map(k => k.key);
  if (sortKeys.length >= 6) check('Sort criteria', 20, 20, `${sortKeys.length} keys — excellent coverage`);
  else if (sortKeys.length >= 4) check('Sort criteria', 20, 15, `${sortKeys.length} keys — good`);
  else if (sortKeys.length >= 2) check('Sort criteria', 20, 10, `${sortKeys.length} keys — basic`);
  else check('Sort criteria', 20, 5, `${sortKeys.length} keys — consider adding more`);

  // 2. Resolution + cached in sort (max 5)
  const hasRes = sortKeys.includes('resolution');
  const hasCached = sortKeys.includes('cached');
  if (hasRes && hasCached) check('Sort essentials', 5, 5, 'Resolution + cached present');
  else if (hasRes || hasCached) check('Sort essentials', 5, 3, `Missing: ${hasRes ? '' : 'resolution'}${hasCached ? '' : 'cached'}`);
  else check('Sort essentials', 5, 0, 'Missing resolution and cached in sort');

  // 3. 0Cached ISE (max 15)
  const ises = config.includedStreamExpressions || [];
  const has0Cached = ises.some(e => e.expression && /0Cached/i.test(e.expression));
  if (has0Cached) check('0Cached ISE', 15, 15, 'Present — fallback when nothing cached');
  else check('0Cached ISE', 15, 0, 'Missing — no fallback for uncached content');

  // 4. ESE coverage (max 10)
  const eses = config.excludedStreamExpressions || [];
  if (eses.length >= 5) check('Exclusion rules', 10, 10, `${eses.length} ESEs — thorough filtering`);
  else if (eses.length >= 2) check('Exclusion rules', 10, 7, `${eses.length} ESEs — decent`);
  else if (eses.length >= 1) check('Exclusion rules', 10, 4, `${eses.length} ESE — minimal`);
  else check('Exclusion rules', 10, 0, 'No ESEs — no unwanted content filtering');

  // 5. Device-aware exclusions (max 10)
  const esesText = eses.map(e => e.expression || '').join(' ');
  const hasDeviceExclusions = /visualTag|encode|resolution.*2160p/.test(esesText);
  if (hasDeviceExclusions) check('Device awareness', 10, 10, 'Device-aware exclusions present');
  else check('Device awareness', 10, 5, 'No device-aware exclusions — may show incompatible streams');

  // 6. Formatter (max 10)
  const fmt = config.formatter || {};
  if (fmt.id === 'tamtaro' && fmt.definitions?.overrides?.tamtaro?.name) {
    check('Formatter', 10, 10, 'Custom formatter with override');
  } else if (fmt.id && fmt.id !== 'tamtaro') {
    check('Formatter', 10, 7, `Built-in formatter: ${fmt.id}`);
  } else {
    check('Formatter', 10, 3, 'No formatter configured');
  }

  // 7. Title matching (max 5)
  const tm = config.titleMatching || {};
  if (tm.mode === 'fuzzy' && tm.similarityThreshold && tm.similarityThreshold <= 0.9) {
    check('Title matching', 5, 5, `Fuzzy matching at ${tm.similarityThreshold} — good`);
  } else if (tm.mode === 'exact') {
    check('Title matching', 5, 1, 'Exact mode — will miss variations');
  } else {
    check('Title matching', 5, 3, 'Default matching');
  }

  // 8. Year matching (max 5)
  const ym = config.yearMatching || {};
  if (ym.strict === false) check('Year matching', 5, 5, 'Non-strict — allows remakes');
  else if (ym.strict === true) check('Year matching', 5, 2, 'Strict — may block valid releases');
  else check('Year matching', 5, 4, 'Default');

  // 9. Preset count (max 10)
  const presets = (config.presets || []).filter(p => p.enabled !== false);
  if (presets.length >= 4) check('Addon coverage', 10, 10, `${presets.length} enabled presets — excellent`);
  else if (presets.length >= 2) check('Addon coverage', 10, 7, `${presets.length} enabled presets — good`);
  else if (presets.length >= 1) check('Addon coverage', 10, 4, `${presets.length} enabled preset — minimal`);
  else check('Addon coverage', 10, 0, 'No enabled presets — no scrapers configured');

  // 10. Deduplicator (max 5)
  const dedup = config.deduplicator || {};
  if (dedup.cached && dedup.uncached) check('Deduplicator', 5, 5, `Cached: ${dedup.cached}, Uncached: ${dedup.uncached}`);
  else if (dedup.cached || dedup.uncached) check('Deduplicator', 5, 3, 'Partial dedup config');
  else check('Deduplicator', 5, 2, 'Default deduplication');

  // 11. Regex patterns (max 5)
  const ranked = config.rankedRegexPatterns || [];
  const excluded = config.excludedRegexPatterns || [];
  if (ranked.length >= 50) check('Regex scoring', 5, 5, `${ranked.length} ranked patterns — full scoring`);
  else if (ranked.length >= 10) check('Regex scoring', 5, 3, `${ranked.length} ranked patterns — partial`);
  else check('Regex scoring', 5, 1, `${ranked.length} ranked patterns — minimal`);

  return {
    score: Math.min(score, 100),
    maxScore: 100,
    breakdown,
    grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F',
    summary: score >= 90 ? 'Excellent template — well-configured'
      : score >= 75 ? 'Good template — a few improvements possible'
      : score >= 60 ? 'Decent template — consider adding more features'
      : score >= 40 ? 'Basic template — significant improvements recommended'
      : 'Minimal template — needs major configuration',
  };
}

/**
 * Generate a human-readable health report.
 * @param {Object} result - Output from calculateHealthScore()
 * @returns {string} Markdown-formatted report
 */
export function formatHealthReport(result) {
  const { score, grade, summary, breakdown } = result;
  let report = `## Template Health Score: ${score}/100 (${grade})\n\n${summary}\n\n`;
  report += `| Check | Score | Details |\n|-------|-------|--------|\n`;
  for (const b of breakdown) {
    const icon = b.points === b.max ? '✅' : b.points === 0 ? '❌' : '⚠️';
    report += `| ${icon} ${b.label} | ${b.points}/${b.max} | ${b.reason} |\n`;
  }
  return report;
}
