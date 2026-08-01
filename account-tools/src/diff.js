export function diffSnapshots(snapshotA, snapshotB) {
  const addonsA = snapshotA.addons || [];
  const addonsB = snapshotB.addons || [];

  const urlsA = new Map(addonsA.map(a => [a.transportUrl, a]));
  const urlsB = new Map(addonsB.map(a => [a.transportUrl, a]));

  const added = [];
  const removed = [];
  const moved = [];

  for (const [url, addon] of urlsB) {
    if (!urlsA.has(url)) added.push(addon);
  }
  for (const [url, addon] of urlsA) {
    if (!urlsB.has(url)) removed.push(addon);
  }

  const shared = addonsA.filter(a => urlsB.has(a.transportUrl));
  for (const addon of shared) {
    const idxA = addonsA.findIndex(a => a.transportUrl === addon.transportUrl);
    const idxB = addonsB.findIndex(a => a.transportUrl === addon.transportUrl);
    if (idxA !== idxB) {
      moved.push({ addon, from: idxA, to: idxB });
    }
  }

  return {
    added,
    removed,
    moved,
    unchanged: shared.length - moved.length,
    totalA: addonsA.length,
    totalB: addonsB.length,
    hasDifferences: added.length > 0 || removed.length > 0 || moved.length > 0,
  };
}

export function formatDiff(diff) {
  const lines = [];
  lines.push(`Snapshot A: ${diff.totalA} addons`);
  lines.push(`Snapshot B: ${diff.totalB} addons`);
  lines.push('');

  if (diff.added.length > 0) {
    lines.push(`Added (${diff.added.length}):`);
    for (const a of diff.added) lines.push(`  + ${a.name || a.manifest?.name || a.transportUrl}`);
  }
  if (diff.removed.length > 0) {
    lines.push(`Removed (${diff.removed.length}):`);
    for (const a of diff.removed) lines.push(`  - ${a.name || a.manifest?.name || a.transportUrl}`);
  }
  if (diff.moved.length > 0) {
    lines.push(`Reordered (${diff.moved.length}):`);
    for (const m of diff.moved) lines.push(`  ~ ${m.addon.name || m.addon.manifest?.name}: ${m.from + 1} → ${m.to + 1}`);
  }
  if (!diff.hasDifferences) lines.push('No differences found.');

  return lines.join('\n');
}
