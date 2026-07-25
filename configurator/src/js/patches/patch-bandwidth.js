/**
 * PATCH: Bandwidth estimator in Fine-Tune panel
 * 
 * Adds a bandwidth selector that suggests stream pool size and max results.
 * From TVFlix Builder.
 */

// Add to S state:
//   bandwidth: 50,  // Mbps

// Add to SHARE_KEYS:
//   'bandwidth',

// Add to Fine-Tune panel UI (in the stream pool section):
/*
  <div style="margin-top:12px">
    <div style="font-size:.72rem;font-weight:700;color:#8b949e;margin-bottom:4px">Internet Speed</div>
    <div style="font-size:.62rem;color:#4b5563;margin-bottom:8px">Used to suggest stream pool size and bitrate limits</div>
    <div style="display:flex;gap:6px">
      ${[[25,'25 Mbps'],[50,'50 Mbps'],[100,'100 Mbps'],[200,'200 Mbps'],[500,'500+ Mbps']].map(([v,l])=>
        `<button data-action="set-bandwidth" data-val="${v}" data-active="${(S.bandwidth||50)===v}" style="flex:1;padding:6px 8px;border-radius:7px;border:1px solid ${(S.bandwidth||50)===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${(S.bandwidth||50)===v?'rgba(0,212,255,.1)':'transparent'};color:${(S.bandwidth||50)===v?'#00d4ff':'#6b7280'};font-size:.7rem;font-weight:700;cursor:pointer;text-align:center">${l}</button>`
      ).join('')}
    </div>
    ${(() => {
      const bw = S.bandwidth || 50;
      let suggestion = 'normal';
      if (bw >= 200) suggestion = 'max';
      else if (bw >= 100) suggestion = 'large';
      return `<div style="margin-top:6px;font-size:.65rem;color:#4b5563">Suggested pool: <b style="color:#00d4ff">${suggestion}</b> — ${bw < 50 ? 'smaller pool for faster results' : bw < 100 ? 'normal pool, good balance' : 'larger pool for better selection'}</div>`;
    })()}
  </div>
*/

// Add to event handler:
//   if (a === 'set-bandwidth') { S.bandwidth = Number(el.dataset.val); saveState(); render(); }
