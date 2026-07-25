/**
 * PATCH: Expose NZB Failover in Fine-Tune panel
 * 
 * Insert this into the Fine-Tune (Advanced Options) rendering in app.js,
 * in the Usenet/services section.
 */

// Add to S state (line ~82):
//   nzbFailover: false,
//   nzbFailoverPosition: 'after-torrents',
//   maxFailoverNzbs: 3,

// Add to SHARE_KEYS:
//   'nzbFailover', 'nzbFailoverPosition', 'maxFailoverNzbs',

// Add to sanitizeSharedConfig:
//   pick('nzbFailoverPosition', v => ['before-torrents','after-torrents'].includes(v));
//   pick('maxFailoverNzbs', v => [1,2,3,5].includes(Number(v)));

// Add to build() output (in the config object):
/*
  ...(S.nzbFailover ? {
    nzbFailover: {
      enabled: true,
      position: S.nzbFailoverPosition === 'before-torrents' ? 'before' : 'after',
      maxFailoverNzbs: Number(S.maxFailoverNzbs) || 3,
    }
  } : {}),
*/

// Add to Fine-Tune panel UI (in the Usenet section, only shown when Usenet service selected):
/*
  ${S.multiServices.includes('easynews') || S.multiServices.includes('nzbgeek') || S.multiServices.includes('streamnzb') ? `
    <div style="margin-top:12px;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div>
          <div style="font-size:.78rem;font-weight:700;color:#e6edf3">NZB Failover</div>
          <div style="font-size:.68rem;color:#6b7280">Auto-retry failed Usenet streams with alternative NZBs</div>
        </div>
        <label class="toggle-sw"><input type="checkbox" data-action="toggle-nzb-failover" ${S.nzbFailover?'checked':''}><span class="toggle-track"></span></label>
      </div>
      ${S.nzbFailover ? `
        <div style="display:flex;gap:6px;margin-bottom:8px">
          ${[['before-torrents','Before Torrents'],['after-torrents','After Torrents']].map(([v,l])=>
            `<button data-action="set-nzb-failover-pos" data-val="${v}" data-active="${(S.nzbFailoverPosition||'after-torrents')===v}" style="flex:1;padding:6px 8px;border-radius:7px;border:1px solid ${(S.nzbFailoverPosition||'after-torrents')===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${(S.nzbFailoverPosition||'after-torrents')===v?'rgba(0,212,255,.1)':'transparent'};color:${(S.nzbFailoverPosition||'after-torrents')===v?'#00d4ff':'#6b7280'};font-size:.7rem;font-weight:700;cursor:pointer">${l}</button>`
          ).join('')}
        </div>
        <div style="display:flex;gap:6px">
          ${[[1,'1 NZB'],[2,'2 NZBs'],[3,'3 NZBs'],[5,'5 NZBs']].map(([v,l])=>
            `<button data-action="set-max-failover-nzbs" data-val="${v}" data-active="${(S.maxFailoverNzbs||3)===v}" style="flex:1;padding:6px 8px;border-radius:7px;border:1px solid ${(S.maxFailoverNzbs||3)===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${(S.maxFailoverNzbs||3)===v?'rgba(0,212,255,.1)':'transparent'};color:${(S.maxFailoverNzbs||3)===v?'#00d4ff':'#6b7280'};font-size:.7rem;font-weight:700;cursor:pointer">${l}</button>`
          ).join('')}
        </div>
      ` : ''}
    </div>
  ` : ''}
*/

// Add to event handler:
//   if (a === 'toggle-nzb-failover') { S.nzbFailover = !S.nzbFailover; saveState(); render(); }
//   if (a === 'set-nzb-failover-pos') { S.nzbFailoverPosition = el.dataset.val; saveState(); render(); }
//   if (a === 'set-max-failover-nzbs') { S.maxFailoverNzbs = Number(el.dataset.val); saveState(); render(); }
