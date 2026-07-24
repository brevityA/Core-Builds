/**
 * Cinemeta Patching via Cinebye
 * 
 * After installing AIOMetadata, users need to hide Cinemeta.
 * This module patches Cinemeta via the Cinebye API.
 * 
 * Duck Tools/QuackStart does this automatically — Core Builds should too.
 */

const CINEBYE_URLS = [
  'https://cinebye.elfhosted.com',
  'https://cinebye.dinsden.top',
];

/**
 * Apply Cinemeta patches via Cinebye.
 * @param {string} authKey - Stremio auth key
 * @param {Object} options
 * @param {boolean} options.removeSearch - Hide Cinemeta search
 * @param {boolean} options.removeCatalogs - Hide Cinemeta catalogs
 * @param {boolean} options.removeMetadata - Hide Cinemeta metadata
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function patchCinemeta(authKey, options = {}) {
  const {
    removeSearch = true,
    removeCatalogs = true,
    removeMetadata = false, // Keep metadata as fallback
  } = options;

  const patches = [];
  if (removeSearch) patches.push('removeSearch');
  if (removeCatalogs) patches.push('removeCatalogs');
  if (removeMetadata) patches.push('removeMetadata');

  if (patches.length === 0) {
    return { success: true, message: 'No patches selected' };
  }

  // Try each Cinebye instance
  for (const baseUrl of CINEBYE_URLS) {
    try {
      const res = await fetch(`${baseUrl}/api/patch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authKey, patches }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          message: `Cinemeta patched: ${patches.join(', ')}`,
        };
      }
    } catch (e) {
      // Try next instance
      continue;
    }
  }

  return {
    success: false,
    message: 'Could not reach Cinebye — patch manually at cinebye.elfhosted.com',
  };
}

/**
 * Set addon order in Stremio account.
 * Order: Cinemeta → AIOMetadata → AIOStreams → other addons
 * @param {string} authKey - Stremio auth key
 * @param {string} aiometadataUrl - AIOMetadata manifest URL
 * @param {string} aiostreamsUrl - AIOStreams manifest URL
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function setAddonOrder(authKey, aiometadataUrl, aiostreamsUrl) {
  const SAPI = 'https://api.strem.io/api/';

  try {
    // Get current addons
    const getRes = await fetch(SAPI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'AddonCollectionGet', authKey, update: true }),
    });
    const getData = await getRes.json();

    if (!getData?.result?.addons) {
      return { success: false, message: 'Could not fetch addon list' };
    }

    const addons = getData.result.addons;

    // Find and reorder
    const cinemeta = addons.find(a => a.transportUrl?.includes('cinemeta'));
    const aiometadata = addons.find(a => a.transportUrl === aiometadataUrl);
    const aiostreams = addons.find(a => a.transportUrl === aiostreamsUrl);
    const others = addons.filter(a =>
      a !== cinemeta && a !== aiometadata && a !== aiostreams
    );

    // Build ordered list: Cinemeta first (hidden by Cinebye), then AIOMetadata, then AIOStreams
    const ordered = [];
    if (cinemeta) ordered.push(cinemeta);
    if (aiometadata) ordered.push(aiometadata);
    if (aiostreams) ordered.push(aiostreams);
    ordered.push(...others);

    // Save
    const setRes = await fetch(SAPI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'AddonCollectionSet', authKey, addons: ordered }),
    });
    const setData = await setRes.json();

    if (setData?.result) {
      return { success: true, message: 'Addon order set: Cinemeta → AIOMetadata → AIOStreams' };
    }
    return { success: false, message: 'Failed to save addon order' };
  } catch (e) {
    return { success: false, message: `Error: ${e.message}` };
  }
}

/**
 * Full stack install — the Duck Streams killer feature.
 * 
 * 1. Create AIOStreams config on host
 * 2. Push AIOStreams to Stremio
 * 3. Push AIOMetadata to Stremio
 * 4. Patch Cinemeta via Cinebye
 * 5. Set addon order
 * 6. Return success with summary
 */
export async function fullStackInstall(opts) {
  const {
    stremioEmail,
    stremioPassword,
    aiostreamsManifestUrl,
    aiometadataManifestUrl,
    patchCinemeta: doPatch = true,
    setOrder = true,
  } = opts;

  const steps = [];
  const errors = [];

  // Step 1: Login to Stremio
  const SAPI = 'https://api.strem.io/api/';
  let authKey;
  try {
    const loginRes = await fetch(SAPI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'Login', email: stremioEmail, password: stremioPassword, facebook: false }),
    });
    const loginData = await loginRes.json();
    authKey = loginData?.result?.authKey;
    if (!authKey) throw new Error(loginData?.error || 'Login failed');
    steps.push('✓ Logged in to Stremio');
  } catch (e) {
    errors.push(`Login failed: ${e.message}`);
    return { steps, errors, success: false };
  }

  // Step 2: Push AIOStreams
  try {
    const getRes = await fetch(SAPI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'AddonCollectionGet', authKey, update: true }),
    });
    const getData = await getRes.json();
    const existing = getData?.result?.addons || [];

    const already = existing.some(a => a.transportUrl === aiostreamsManifestUrl);
    if (!already) {
      const updated = [...existing, { transportName: 'http', transportUrl: aiostreamsManifestUrl, flags: {} }];
      await fetch(SAPI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'AddonCollectionSet', authKey, addons: updated }),
      });
      steps.push('✓ AIOStreams installed');
    } else {
      steps.push('✓ AIOStreams already installed');
    }
  } catch (e) {
    errors.push(`AIOStreams install failed: ${e.message}`);
  }

  // Step 3: Push AIOMetadata
  if (aiometadataManifestUrl) {
    try {
      const getRes = await fetch(SAPI, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'AddonCollectionGet', authKey, update: true }),
      });
      const getData = await getRes.json();
      const existing = getData?.result?.addons || [];

      const already = existing.some(a => a.transportUrl === aiometadataManifestUrl);
      if (!already) {
        const updated = [...existing, { transportName: 'http', transportUrl: aiometadataManifestUrl, flags: {} }];
        await fetch(SAPI, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'AddonCollectionSet', authKey, addons: updated }),
        });
        steps.push('✓ AIOMetadata installed');
      } else {
        steps.push('✓ AIOMetadata already installed');
      }
    } catch (e) {
      errors.push(`AIOMetadata install failed: ${e.message}`);
    }
  }

  // Step 4: Patch Cinemeta
  if (doPatch) {
    const patchResult = await patchCinemeta(authKey);
    if (patchResult.success) {
      steps.push('✓ Cinemeta patched (catalogs hidden)');
    } else {
      errors.push(patchResult.message);
    }
  }

  // Step 5: Set addon order
  if (setOrder && aiometadataManifestUrl) {
    const orderResult = await setAddonOrder(authKey, aiometadataManifestUrl, aiostreamsManifestUrl);
    if (orderResult.success) {
      steps.push('✓ Addon order set');
    } else {
      errors.push(orderResult.message);
    }
  }

  return {
    steps,
    errors,
    success: errors.length === 0,
    message: errors.length === 0
      ? 'Full stack installed! Reopen Stremio to see your new setup.'
      : `Completed with ${errors.length} error(s). Check details.`,
  };
}
