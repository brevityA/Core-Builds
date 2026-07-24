/**
 * Template Versioning — unique to Core Builds.
 * 
 * Generated templates include version metadata.
 * The configurator checks if the user's template is outdated
 * and offers a one-click upgrade with diff.
 */

export const CURRENT_TEMPLATE_VERSION = '2.78.0';

/**
 * Add version metadata to a generated template.
 * @param {Object} template - The full template object
 * @returns {Object} Template with version metadata
 */
export function addVersionMetadata(template) {
  if (!template.metadata) template.metadata = {};
  template.metadata.coreBuildsVersion = CURRENT_TEMPLATE_VERSION;
  template.metadata.generatedAt = new Date().toISOString();
  template.metadata.generatedBy = 'Core Builds Configurator';
  return template;
}

/**
 * Check if a template is outdated.
 * @param {Object} template - The full template object
 * @returns {{ outdated: boolean, current: string, installed: string, daysOld: number|null }}
 */
export function checkTemplateVersion(template) {
  const installed = template?.metadata?.coreBuildsVersion;
  const generatedAt = template?.metadata?.generatedAt;

  if (!installed) {
    return {
      outdated: true,
      current: CURRENT_TEMPLATE_VERSION,
      installed: 'unknown',
      daysOld: null,
      message: 'No version metadata — template may be very old',
    };
  }

  const daysOld = generatedAt
    ? Math.floor((Date.now() - new Date(generatedAt).getTime()) / 86400000)
    : null;

  const installedParts = installed.split('.').map(Number);
  const currentParts = CURRENT_TEMPLATE_VERSION.split('.').map(Number);

  let outdated = false;
  for (let i = 0; i < Math.max(installedParts.length, currentParts.length); i++) {
    const a = installedParts[i] || 0;
    const b = currentParts[i] || 0;
    if (b > a) { outdated = true; break; }
    if (a > b) break;
  }

  return {
    outdated,
    current: CURRENT_TEMPLATE_VERSION,
    installed,
    daysOld,
    message: outdated
      ? `Template v${installed} is outdated — v${CURRENT_TEMPLATE_VERSION} available`
      : `Template v${installed} is up to date`,
  };
}

/**
 * Generate a changelog diff between two versions.
 * @param {string} fromVersion - Installed version
 * @param {string} toVersion - Current version
 * @returns {string[]} List of changes
 */
export function getVersionChangelog(fromVersion, toVersion) {
  // In production, this would read from CHANGELOG data
  // For now, return a placeholder
  return [
    `Upgrading from v${fromVersion} to v${toVersion}`,
    'Check the full changelog at github.com/brevityA/Core-Builds',
  ];
}

/**
 * Show an "Update available" banner in the UI.
 * @param {Object} versionCheck - Output from checkTemplateVersion()
 * @returns {string} HTML for the banner
 */
export function updateBannerHtml(versionCheck) {
  if (!versionCheck.outdated) return '';

  return `
    <div style="padding:12px 16px;border-radius:10px;background:rgba(0,212,255,.06);border:1px solid rgba(0,212,255,.2);margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <span style="font-size:1.2rem">🔄</span>
      <div style="flex:1">
        <div style="font-size:.82rem;font-weight:700;color:#00d4ff">Update Available</div>
        <div style="font-size:.74rem;color:#8b949e">${versionCheck.message}${versionCheck.daysOld ? ` (${versionCheck.daysOld} days old)` : ''}</div>
      </div>
      <button data-action="update-template" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(0,212,255,.3);background:rgba(0,212,255,.08);color:#00d4ff;font-size:.76rem;font-weight:700;cursor:pointer">
        Update →
      </button>
    </div>`;
}
