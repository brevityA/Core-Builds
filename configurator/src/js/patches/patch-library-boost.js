/**
 * PATCH: Add Library Boost to Fine-Tune panel
 * 
 * Insert this into the Fine-Tune (Advanced Options) rendering in app.js,
 * in the sorting section.
 */

// Add to S state (line ~82):
//   libraryBoost: 'default',

// Add to SHARE_KEYS:
//   'libraryBoost',

// Add to sanitizeSharedConfig:
//   pick('libraryBoost', v => ['none','default','strong'].includes(v));

// Add to sort criteria generation in build():
// The 'default' mode is already handled — library key is already in the sort order.
// For 'strong' mode, move library key to the very front:

/*
  // In the sort criteria builder, add this before the return:
  const libBoost = S.libraryBoost || 'default';
  const libKey = libBoost === 'strong' ? [{key:'library',direction:'desc'}] : [];
  const libKeyMid = libBoost !== 'strong' ? [{key:'library',direction:'desc'}] : [];

  // Then use libKey at the start and libKeyMid in the middle of each sort scope
  // e.g., global: [...libKey, {key:'cached',...}, ...libKeyMid, ...rest]
*/

// Add to Fine-Tune panel UI (in the sorting section):
/*
  <div style="margin-top:12px">
    <div style="font-size:.72rem;font-weight:700;color:#8b949e;margin-bottom:6px">Library Boost</div>
    <div style="display:flex;gap:6px">
      ${[['none','No Boost','Library sorted normally'],['default','Default','Library first within each tier'],['strong','Strong','Library always at the very top']].map(([v,l,d])=>
        `<button data-action="set-library-boost" data-val="${v}" data-active="${(S.libraryBoost||'default')===v}" style="flex:1;padding:6px 8px;border-radius:7px;border:1px solid ${(S.libraryBoost||'default')===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${(S.libraryBoost||'default')===v?'rgba(0,212,255,.1)':'transparent'};color:${(S.libraryBoost||'default')===v?'#00d4ff':'#6b7280'};font-size:.7rem;font-weight:700;cursor:pointer;text-align:center;line-height:1.3">${l}<br><span style="font-size:.58rem;opacity:.7">${d}</span></button>`
      ).join('')}
    </div>
  </div>
*/

// Add to event handler:
//   if (a === 'set-library-boost') { S.libraryBoost = el.dataset.val; saveState(); render(); }
