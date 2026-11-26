// Plain-language help for refusals AIOStreams sends back when a config is saved (v3.46).
//
// The raw message stays on screen underneath; this adds what it means and what to
// do next, for the refusals Core Builds has met before. Unknown messages get no
// help rather than a guess. Each entry's `re` is matched against the host's text.
//
// Addon-manifest failures and stream-proxy refusals have their own recovery
// screens in app.js (renderAddonFetchFallback, streamProxySaveError) and are
// handled before this is consulted.
export const AIO_ERROR_HELP = [
  {
    id: 'regex-allowlist',
    re: /(regex(es)?|patterns?)\b[^.]*\bnot allowed|forbidden url/i,
    title: 'The host refused a release-name filter',
    help: 'This host only accepts filters from its approved list, and its copy of that list is out of date. Pick another host under AIOStreams host, or try again later.',
  },
  {
    id: 'removed-addon',
    re: /has been removed|no longer hosted|is no longer (supported|available)/i,
    title: 'One add-on in this setup was retired',
    help: 'AIOStreams no longer supports one of these add-ons. Rebuild with this version of the configurator, which leaves retired add-ons out, and install again.',
  },
  {
    id: 'needs-service',
    re: /requires at least one usable service|no credentials found/i,
    title: 'A source needs a service you haven\'t added',
    help: 'One of the selected sources only works with a debrid service and its key. Add the key, or turn that source off under Additional services & scrapers.',
  },
  {
    id: 'empty-group',
    re: /every group must have at least one addon/i,
    title: 'An add-on group came out empty',
    help: 'This is a build problem, not something you did. Use Report an issue so it can be fixed; Export JSON keeps your settings in the meantime.',
  },
  {
    id: 'auth',
    re: /invalid (password|credentials)|incorrect password|wrong password|unauthori[sz]ed|\b401\b|user not found|uuid not found/i,
    title: 'Wrong password or config ID',
    help: 'The host didn\'t accept the password or config ID. For a new setup, leave the host on Auto; to update an existing one, check the password you saved when you first installed it.',
  },
  {
    id: 'rate-limit',
    re: /too many requests|rate.?limit|\b429\b/i,
    title: 'The host is busy',
    help: 'Wait a minute and press Retry, or pick another host.',
  },
  {
    id: 'too-large',
    re: /payload too large|request entity too large|\b413\b/i,
    title: 'This setup is too big for AIOStreams',
    help: 'AIOStreams accepts up to 100 KB per config. Turn off some add-ons or catalogs and try again.',
  },
  {
    id: 'network',
    re: /failed to fetch|fetch failed|networkerror|network error|econn|timed? ?out|timeout|aborted/i,
    title: 'Couldn\'t reach the host',
    help: 'Check your connection and press Retry. If it keeps happening, set the host to Auto so another one is tried.',
  },
  {
    id: 'schema',
    re: /invalid input|zoderror|validation (error|failed)|expected [a-z]+, received/i,
    title: 'The host didn\'t understand part of this setup',
    help: 'This usually means the host runs a different AIOStreams version than this build targets. Pick another host, or use Report an issue.',
  },
];

/** { id, title, help } for a known refusal, or null. */
export function explainAioError(message) {
  const text = String(message || '');
  if (!text) return null;
  const hit = AIO_ERROR_HELP.find(e => e.re.test(text));
  return hit ? { id: hit.id, title: hit.title, help: hit.help } : null;
}
