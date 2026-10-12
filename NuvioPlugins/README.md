# Core Builds Nuvio Providers

This directory contains local providers for Nuvio. **Core Builds AIOStreams
Proxy** fetches the AIOStreams stream-result JSON through the existing Core
Builds Cloudflare Worker. Configure it with your full AIOStreams manifest URL.

Nuvio already supports Stremio-compatible AIOStreams add-ons directly, so this
provider is an optional local-provider route—not a replacement you need for a
normal Nuvio setup.

## Install

After this folder is available on the branch you want to use, add its manifest
in Nuvio under **Settings → Plugins**:

```text
https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/NuvioPlugins/manifest.json
```

Refresh the plugin list, enable **Core Builds AIOStreams Proxy**, and open its
settings. Paste the full **HTTPS AIOStreams manifest URL** shown by your
AIOStreams instance. Nuvio masks this setting as a password. It must have the
`/stremio/<id>/<password>/manifest.json` shape so the provider can construct
the worker's scoped manifest-base request.

## What is proxied

The provider calls the Worker's existing route:

```text
GET /proxy/stream/{movie|series}/{id}.json?host=<AIOStreams manifest base>
```

Nuvio supplies TMDB IDs, which this provider formats as `tmdb:<id>` for movies
and `tmdb:<id>:<season>:<episode>` for TV episodes (URL-encoded in the path).
IMDb IDs already supplied by another compatible caller are passed through.

That route is already restricted by `cloudflare-worker/worker.js` to AIOStreams
stream-result paths. The plugin does **not** add an open proxy, and the Worker
does **not** relay video bytes. It returns AIOStreams' JSON stream list; Nuvio's
player then connects directly to each returned HTTPS media URL.

The manifest URL contains your AIOStreams access path and is sent to your Core
Builds Worker in the `host` query parameter. The worker's observability code
avoids logging request paths and URLs, but treat the manifest URL as a secret
and do not share it. The plugin makes no request if the URL is not HTTPS or
isn't an AIOStreams `/stremio/.../...` manifest path.

Requests use Nuvio's 8-second `fetchWithTimeout` helper and the Worker's
bounded custom-host lane. If your AIOStreams instance is self-hosted, it must be on a public HTTPS
hostname accepted by the Worker's existing custom-host checks; localhost, IP
literal, private/reserved names, and explicit ports are rejected. Native Nuvio
clients do not apply browser CORS rules; Nuvio Web may require its origin to be
allowed by the Worker.

## Development

```sh
npm test --prefix NuvioPlugins
node --check NuvioPlugins/providers/core-aiostreams-proxy.js
```

Tests mock the Worker response and verify the generated movie/episode route,
HTTPS filtering, manifest validation, and timeout-helper use. They do not call
your live Worker or AIOStreams instance. Before relying on it, install it in
Nuvio's in-app Plugin Tester and try one movie and one episode.
