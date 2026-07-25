/**
 * PATCH: Add Age Limits to Content Preferences step
 * 
 * Insert this into the Content Preferences (step 4) rendering in app.js,
 * after the existing content type options.
 */

// Add to S state (line ~82):
//   ageLimit: 'none',

// Add to SHARE_KEYS:
//   'ageLimit',

// Add to sanitizeSharedConfig boolean/string checks:
//   pick('ageLimit', v => ['none','G','PG','PG-13','R','NC-17'].includes(v));

// Add to eses() function (inside the debrid section, before the size limit check):
/*
  // Age rating filter (from TVFlix)
  if (S.ageLimit && S.ageLimit !== 'none') {
    const certMap = {
      'G':     ['G','TV-G','TV-Y','TV-Y7','TV-Y7-FV'],
      'PG':    ['G','PG','TV-G','TV-Y','TV-Y7','TV-Y7-FV','TV-PG'],
      'PG-13': ['G','PG','PG-13','TV-G','TV-Y','TV-Y7','TV-Y7-FV','TV-PG','TV-14'],
      'R':     ['G','PG','PG-13','R','TV-G','TV-Y','TV-Y7','TV-Y7-FV','TV-PG','TV-14','TV-MA'],
    };
    const certs = certMap[S.ageLimit];
    if (certs) {
      out.push({
        enabled: true,
        expression: `/* Age Limit — max ${S.ageLimit} */ certification(streams, ${certs.map(c=>"'"+c+"'").join(',')})`
      });
    }
  }
*/

// Add to Content Preferences rendering (after content type options):
/*
  <div class="pref-card" style="margin-top:12px">
    <div class="pref-body-inner">
      <div class="pref-title">🔞 Age Rating Limit</div>
      <div class="pref-desc">Filter content by age certification. Requires TMDB key.</div>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        ${[['none','No Limit'],['G','G'],['PG','PG'],['PG-13','PG-13'],['R','R'],['NC-17','NC-17']].map(([v,l])=>
          `<button data-action="set-age-limit" data-val="${v}" data-active="${S.ageLimit===v}" style="padding:5px 10px;border-radius:6px;border:1px solid ${S.ageLimit===v?'rgba(0,212,255,.4)':'rgba(255,255,255,.08)'};background:${S.ageLimit===v?'rgba(0,212,255,.1)':'transparent'};color:${S.ageLimit===v?'#00d4ff':'#6b7280'};font-size:.72rem;font-weight:700;cursor:pointer">${l}</button>`
        ).join('')}
      </div>
    </div>
  </div>
*/

// Add to event handler:
//   if (a === 'set-age-limit') { S.ageLimit = el.dataset.val; saveState(); render(); }
