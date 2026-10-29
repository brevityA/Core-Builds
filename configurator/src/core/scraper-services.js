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

/**
 * Custom build: apply the extras dialog to the service list.
 *
 * `autoServices` are the services a previous Apply added only because an
 * add-on needed them. They are dropped once no picked add-on needs them, so
 * unticking EasyNews+ also turns the EasyNews service back off. A service the
 * user chose themselves (in the service step) is never removed here.
 */
export function applyAddonServices({ services = [], autoServices = [], carouselPicks = [], scrapers = [], carousel = [] }) {
  const independent = services.filter(v => !carousel.includes(v) && !autoServices.includes(v));
  const auto = withScraperServices([], scrapers).filter(v => !independent.includes(v) && !carouselPicks.includes(v));
  return { services: [...new Set([...independent, ...carouselPicks, ...auto])], autoServices: auto };
}
