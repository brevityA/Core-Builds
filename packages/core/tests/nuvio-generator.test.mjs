import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateTemplate } from '../src/generate-template.js';

const P2P_HOST = { id: 'fortheweak', supportsP2P: true, supportsNuvioInstant: true, supportsDebrid: true, supportsHttp: true };
const ELFHOSTED = { id: 'elfhosted', supportsP2P: false, supportsNuvioInstant: false, supportsDebrid: true, supportsHttp: false };

describe('generateTemplate — nuvio-torbox-instant route', () => {
  it('generates a complete template with P2P enabled and no debrid', () => {
    const result = generateTemplate(
      { route: 'nuvio-torbox-instant', device: 'shield', resolution: '4k', host: P2P_HOST },
      { host: P2P_HOST }
    );
    assert.ok(result.metadata);
    assert.ok(result.config);
    assert.ok(result.config.presets.length > 0);
    assert.ok(result.config.services.every(s => s.enabled === false));
    assert.ok(result.config.services.every(s => Object.keys(s.credentials).length === 0));
    assert.equal(result.config.minSeeders, 1);
    assert.ok(result.metadata.description.includes('Nuvio'));
    assert.equal(result.metadata.category, 'P2P');
  });

  it('contains no TorBox API key anywhere in the output', () => {
    const result = generateTemplate(
      { route: 'nuvio-torbox-instant', device: 'generic', resolution: '1080p', host: P2P_HOST },
      { host: P2P_HOST }
    );
    const json = JSON.stringify(result);
    assert.ok(!json.includes('apiKey'), 'output must not contain apiKey');
    assert.ok(!json.includes('torbox-search'), 'output must not contain torbox-search preset');
  });

  it('includes default Nuvio addons', () => {
    const result = generateTemplate(
      { route: 'nuvio-torbox-instant', device: 'generic', resolution: '1080p', host: P2P_HOST },
      { host: P2P_HOST }
    );
    const presetTypes = result.config.presets.map(p => p.type);
    assert.ok(presetTypes.includes('torrentio'));
    assert.ok(presetTypes.includes('comet'));
    assert.ok(presetTypes.includes('mediafusion'));
    assert.ok(presetTypes.includes('meteor'));
    assert.ok(presetTypes.includes('stremthruTorz'));
  });

  it('includes optional scrapers when requested', () => {
    const result = generateTemplate(
      { route: 'nuvio-torbox-instant', device: 'generic', resolution: '1080p', host: P2P_HOST, optionalScrapers: ['eztv', 'knaben', 'torrent-galaxy'] },
      { host: P2P_HOST }
    );
    const presetTypes = result.config.presets.map(p => p.type);
    assert.ok(presetTypes.includes('eztv'));
    assert.ok(presetTypes.includes('knaben'));
    assert.ok(presetTypes.includes('torrent-galaxy'));
  });

  it('excludes debrid-only addons', () => {
    const result = generateTemplate(
      { route: 'nuvio-torbox-instant', device: 'generic', resolution: '1080p', host: P2P_HOST, optionalScrapers: ['debridio'] },
      { host: P2P_HOST }
    );
    const presetTypes = result.config.presets.map(p => p.type);
    assert.ok(!presetTypes.includes('debridio'));
    assert.ok(!presetTypes.includes('debrider'));
    assert.ok(!presetTypes.includes('easynewsPlusPlus'));
    assert.ok(!presetTypes.includes('easynews-search'));
  });

  it('rejects ElfHosted host', () => {
    assert.throws(
      () => generateTemplate(
        { route: 'nuvio-torbox-instant', device: 'generic', resolution: '1080p', host: ELFHOSTED },
        { host: ELFHOSTED }
      ),
      /does not support Nuvio/
    );
  });

  it('rejects host with missing capability flags', () => {
    assert.throws(
      () => generateTemplate(
        { route: 'nuvio-torbox-instant', device: 'generic', resolution: '1080p', host: { id: 'unknown' } },
        {}
      ),
      /does not support Nuvio/
    );
  });

  it('preserves device and resolution policy', () => {
    const result = generateTemplate(
      { route: 'nuvio-torbox-instant', device: 'samsung', resolution: '1080p', host: P2P_HOST },
      { host: P2P_HOST }
    );
    const eseTexts = result.config.excludedStreamExpressions.map(e => e.expression);
    assert.ok(eseTexts.some(e => e.includes('Hard Resolution Kill')));
    assert.ok(eseTexts.some(e => e.includes('DV-Only Kill')));
    assert.ok(result.config.excludedResolutions.length > 0 || result.config.preferredResolutions.length > 0);
  });

  it('output is deterministic', () => {
    const a = generateTemplate(
      { route: 'nuvio-torbox-instant', device: 'shield', resolution: '4k', host: P2P_HOST },
      { host: P2P_HOST }
    );
    const b = generateTemplate(
      { route: 'nuvio-torbox-instant', device: 'shield', resolution: '4k', host: P2P_HOST },
      { host: P2P_HOST }
    );
    assert.deepStrictEqual(a, b);
  });

  it('accepts host from options when not in input', () => {
    const result = generateTemplate(
      { route: 'nuvio-torbox-instant', device: 'generic', resolution: '1080p' },
      { host: P2P_HOST }
    );
    assert.ok(result.metadata);
    assert.ok(result.config.presets.length > 0);
  });
});
