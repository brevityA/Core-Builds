/**
 * IQR Tukey-fence expression generator.
 *
 * Builds a three-tier adaptive bitrate expression:
 *   >= 4 peers → IQR Tukey fence (statistically sound)
 *   1-3 peers  → min/max ±20% (thin pool)
 *   0 peers    → linear decay window or empty
 *
 * No browser globals, no credentials, no UI state.
 */

export function iqrExpression(label, pool, floor, decay, decayFloor) {
  const b = `q1(values(${pool},'bitrate'))-1.5*iqr(values(${pool},'bitrate'))`;
  const t = `q3(values(${pool},'bitrate'))+1.5*iqr(values(${pool},'bitrate'))`;
  const iqrBranch = floor
    ? `size(bitrate(${pool},${b},${t}),'${floor}')`
    : `bitrate(${pool},${b},${t})`;
  const minmax = floor
    ? `size(bitrate(${pool},min(values(${pool},'bitrate'))*0.80,max(values(${pool},'bitrate'))*1.20),'${floor}')`
    : `bitrate(${pool},min(values(${pool},'bitrate'))*0.80,max(values(${pool},'bitrate'))*1.20)`;
  let expr = `/*${label}*/ count(${pool})>=4?${iqrBranch}:count(${pool})>0?${minmax}:`;
  if (decay) {
    const mFloor = decayFloor || '5Mbps';
    expr += `(count(bitrate(${pool},median(values(bitrate(${pool},'${mFloor}'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01)),median(values(bitrate(${pool},'${mFloor}'),'bitrate'))*(1+0.4*max(0.3,1-daysSinceRelease*0.01))))>=1?bitrate(${pool},median(values(bitrate(${pool},'${mFloor}'),'bitrate'))*(1-0.4*max(0.3,1-daysSinceRelease*0.01))):[])`;
  } else {
    expr += '[]';
  }
  return { enabled: true, expression: expr };
}
