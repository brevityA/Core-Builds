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

// The three streams the side-by-side compare shows: the same inputs for every
// formatter, so differences come from the formatter alone.
export const COMPARE_SAMPLES = Object.freeze([
  Object.freeze({ key: '4k', label: '4K REMUX', value: PREVIEW_SAMPLE }),
  Object.freeze({ key: '1080p', label: '1080p WEB-DL', value: Object.freeze({
    stream: {
      type: 'debrid', resolution: '1080p', title: 'Example Feature', year: 2024, quality: 'WEB-DL', encode: 'AVC',
      size: 6_400_000_000, bitrate: 9_500_000, visualTags: [], audioTags: ['DD+'], audioChannels: ['5.1'],
      languageCodes: ['EN'], subtitleCodes: ['EN'], releaseGroup: 'GROUP',
      filename: 'Example.Feature.2024.1080p.WEB-DL.DDP5.1.H.264-GROUP.mkv', nSeScore: 64,
    },
    service: { id: 'torbox', shortName: 'TB', name: 'TorBox', cached: true },
    addon: { name: 'Source B' },
  }) }),
  Object.freeze({ key: 'uncached', label: '4K · not cached', value: Object.freeze({
    stream: {
      type: 'debrid', resolution: '2160p', title: 'Example Feature', year: 2024, quality: 'BluRay', encode: 'HEVC',
      size: 24_000_000_000, bitrate: 28_000_000, visualTags: ['HDR10'], audioTags: ['DTS-HD MA'], audioChannels: ['5.1'],
      languageCodes: ['EN'], subtitleCodes: [], releaseGroup: 'GROUP', seeders: 41,
      filename: 'Example.Feature.2024.2160p.BluRay.HDR10.HEVC.DTS-HD.MA.5.1-GROUP.mkv', nSeScore: 52,
    },
    service: { id: 'torbox', shortName: 'TB', name: 'TorBox', cached: false },
    addon: { name: 'Source C' },
  }) }),
]);
