/**
 * PATCH: One-Click Full Setup preset (from Duck Tools QuackStart)
 * 
 * Adds a "Full Setup" preset on the splash page that:
 * 1. Selects TorBox Pro + Generic device + 4K + Standard audio
 * 2. Checks "Patch Cinemeta" and "Install AIOMetadata"
 * 3. Sets Quick Install mode
 * 4. Jumps straight to the install flow
 */

// Add to splash presets section (in splashHtml()):
/*
  {
    id: 'full-setup',
    label: '⚡ Full Setup',
    desc: 'AIOStreams + AIOMetadata + Cinemeta patch — one click',
    color: '#34d399',
    action: () => {
      S.service = 'torbox-pro';
      S.multiServices = ['torbox-pro'];
      S.device = 'generic';
      S.resolution = '4k';
      S.audio = 'standard';
      S.content = 'all';
      S.formatter = 'family-v4';
      S.matchMode = 'balanced';
      S.cacheMode = 'mixed';
      S.patchCinemeta = true;
      S.installAIOMeta = true;
      S.simpleMode = true;
      S.quickStart = true;
      saveState();
      showFastLane();
    }
  },
*/

// This preset appears alongside "4K Apex" and "1080p Stream" on the splash page.
// When clicked, it auto-fills all settings and opens Quick Install with
// Full Stack checkboxes pre-checked.
