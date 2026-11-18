// Sanitised synthetic streams for the configurator's formatter previews.
// Nothing here is a real release, account, URL or person.
export const PREVIEW_SAMPLE = Object.freeze({
  stream: {
    type: 'debrid', resolution: '2160p', title: 'Example Feature', year: 2024, quality: 'BluRay REMUX', encode: 'HEVC',
    size: 62_000_000_000, bitrate: 72_000_000, visualTags: ['DV', 'HDR10'], audioTags: ['TrueHD', 'Atmos'], audioChannels: ['7.1'],
    languageCodes: ['EN', 'FR'], subtitleCodes: ['EN'], releaseGroup: 'GROUP',
    filename: 'Example.Feature.2024.2160p.BluRay.REMUX.DV.HDR10.HEVC.TrueHD.7.1.Atmos-GROUP.mkv', nSeScore: 87,
  },
  service: { id: 'torbox', shortName: 'TB', name: 'TorBox', cached: true },
  addon: { name: 'Source A' },
});
