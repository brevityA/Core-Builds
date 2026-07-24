/**
 * AIOMetadata Catalog Definitions
 * 
 * Used by the configurator to generate AIOMetadata config files
 * alongside AIOStreams templates.
 */

export const CATALOG_GROUPS = {
  streaming: {
    label: 'Streaming Services',
    desc: 'Netflix, Disney+, Prime Video, HBO Max, Apple TV+, Paramount+, Hulu',
    catalogs: [
      { id: 'tmdb-popular',       label: 'TMDB Popular',         group: 'home', default: true },
      { id: 'trakt-trending',     label: 'Trakt Trending',       group: 'home', default: true },
      { id: 'latest-digital',     label: 'Latest Digital',       group: 'home', default: true },
      { id: 'latest-airing',      label: 'Latest Airing',        group: 'home', default: true },
      { id: 'netflix',            label: 'Netflix',              group: 'home', default: true },
      { id: 'disney-plus',        label: 'Disney+',              group: 'home', default: true },
      { id: 'prime-video',        label: 'Prime Video',          group: 'home', default: true },
      { id: 'hbo-max',            label: 'HBO Max',              group: 'home', default: true },
      { id: 'apple-tv-plus',      label: 'Apple TV+',            group: 'home', default: true },
      { id: 'paramount-plus',     label: 'Paramount+',           group: 'home', default: true },
      { id: 'hulu',               label: 'Hulu',                 group: 'home', default: true },
    ]
  },
  genres: {
    label: 'Genre Catalogs',
    desc: 'Action, Comedy, Crime, Drama, Horror, Sci-Fi, Thriller, Animated, Documentaries',
    catalogs: [
      { id: 'genre-action',       label: 'Action',               group: 'browse', default: true },
      { id: 'genre-comedy',       label: 'Comedy',               group: 'browse', default: true },
      { id: 'genre-crime',        label: 'Crime',                group: 'browse', default: true },
      { id: 'genre-drama',        label: 'Drama',                group: 'browse', default: true },
      { id: 'genre-horror',       label: 'Horror',               group: 'browse', default: true },
      { id: 'genre-scifi',        label: 'Sci-Fi',               group: 'browse', default: true },
      { id: 'genre-thriller',     label: 'Thriller',             group: 'browse', default: true },
      { id: 'genre-animated',     label: 'Animated',             group: 'browse', default: true },
      { id: 'genre-documentaries',label: 'Documentaries',        group: 'browse', default: true },
    ]
  },
  anime: {
    label: 'Anime Catalogs',
    desc: 'MAL, AniList, AniDB, Crunchyroll, seasonal, decade catalogs',
    catalogs: [
      { id: 'mal-airing',        label: 'MAL Airing Now',        group: 'home', default: true },
      { id: 'anilist-trending',   label: 'AniList Trending',      group: 'home', default: true },
      { id: 'anidb-latest',       label: 'AniDB Latest Ended',    group: 'browse', default: true },
      { id: 'crunchyroll-latest', label: 'Crunchyroll Latest',    group: 'home', default: true },
      { id: 'mal-top-series',     label: 'MAL Top Series',        group: 'browse', default: true },
      { id: 'mal-top-movies',     label: 'MAL Top Movies',        group: 'browse', default: false },
      { id: 'seasonal',           label: 'Seasonal Anime',        group: 'home', default: true },
    ]
  },
  kids: {
    label: 'Kids & Family',
    desc: 'Age-appropriate content catalogs',
    catalogs: [
      { id: 'trending-kids',      label: 'Trending Kids',         group: 'home', default: false },
      { id: 'standup-comedy',     label: 'Stand-Up Comedy',       group: 'browse', default: false },
    ]
  },
  special: {
    label: 'Special Interest',
    desc: 'Mindfuck, History & War, Nature, Reality TV',
    catalogs: [
      { id: 'must-see-mindfuck',  label: 'Must-See Mindfuck',     group: 'browse', default: false },
      { id: 'history-war',        label: 'History & War',         group: 'browse', default: false },
      { id: 'top-nature',         label: 'Top Nature',            group: 'browse', default: false },
      { id: 'top-reality',        label: 'Top Reality TV',        group: 'browse', default: false },
    ]
  }
};

export const CATALOG_PROVIDERS = {
  tmdb: { label: 'TMDB', apiKeyUrl: 'https://www.themoviedb.org/settings/api', required: true },
  tvdb: { label: 'TVDB', apiKeyUrl: 'https://thetvdb.com/dashboard/account/apikey', required: false },
  mdblist: { label: 'MDBList', apiKeyUrl: 'https://mdblist.com/', required: false, watchTracking: true },
};

/**
 * Generate an AIOMetadata config object from user selections.
 * @param {Object} opts
 * @param {string[]} opts.selectedCatalogs - Array of catalog IDs to enable
 * @param {boolean} opts.includeAnime - Whether to include anime catalogs
 * @param {string} opts.tmdbApiKey - TMDB API key (optional)
 * @param {string} opts.tvdbApiKey - TVDB API key (optional)
 * @returns {Object} AIOMetadata config JSON
 */
export function generateAIOMetadataConfig(opts = {}) {
  const { selectedCatalogs = [], includeAnime = true, tmdbApiKey = '', tvdbApiKey = '' } = opts;

  const allCatalogs = [];
  for (const [groupKey, group] of Object.entries(CATALOG_GROUPS)) {
    if (groupKey === 'anime' && !includeAnime) continue;
    for (const cat of group.catalogs) {
      allCatalogs.push({
        id: cat.id,
        name: cat.label,
        enabled: selectedCatalogs.includes(cat.id) || (selectedCatalogs.length === 0 && cat.default),
        visible: selectedCatalogs.includes(cat.id) || (selectedCatalogs.length === 0 && cat.default),
        group: cat.group,
      });
    }
  }

  return {
    metadata: {
      name: 'Core Builds AIOMetadata',
      description: 'Auto-generated by Core Builds Configurator',
      version: '1.0.0',
    },
    catalogs: allCatalogs,
    apiKeys: {
      ...(tmdbApiKey ? { tmdb: tmdbApiKey } : {}),
      ...(tvdbApiKey ? { tvdb: tvdbApiKey } : {}),
    },
    settings: {
      aiSearch: false,
      mdblistWatchTracking: true,
    }
  };
}
