/**
 * Optional add-ons that only work on top of a service.
 *
 * EasyNews and EasyNews+ read the EasyNews service's login: without that
 * service enabled, presets() drops them (AIOStreams would otherwise refuse the
 * whole save with "No credentials found for service easynews"). The "Additional
 * services & scrapers" dialog offers both add-ons but not the EasyNews service,
 * so a TorBox user who ticked them got a config with no EasyNews at all.
 * Picking one now brings its service along, which also makes the login fields
 * appear.
 */
export const SCRAPER_REQUIRED_SERVICE = Object.freeze({
  easynews: 'easynews',
  easynewsPlus: 'easynews',
});

/** The service a picked add-on needs, or '' when it stands alone. */
export function requiredServiceFor(scraperId) {
  return SCRAPER_REQUIRED_SERVICE[scraperId] || '';
}

/** `services` plus every service a picked add-on needs, in order, without duplicates. */
export function withScraperServices(services, scrapers) {
  const out = [...(Array.isArray(services) ? services : [])];
  for (const id of Array.isArray(scrapers) ? scrapers : []) {
    const service = requiredServiceFor(id);
    if (service && !out.includes(service)) out.push(service);
  }
  return out;
}
