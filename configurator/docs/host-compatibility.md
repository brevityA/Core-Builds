# Host compatibility

Generated from `src/data/hosts.js` and `src/data/host-capabilities.js`. Run `npm run host-report` after changing either file.

- Minimum supported AIOStreams version: **2.32.0**
- Source audit date: **2026-10-22**
- Public hosts: **8**
- Compatibility issues: **0**

## Public hosts

| Host | Endpoint | Channel | AIOStreams | P2P | HTTP | Debrid | Nuvio Instant | Regex access | Restrictions |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| ElfHosted | https://aiostreams.elfhosted.com | stable | 2.36.0 | No | No | Yes | No | none | bitmagnet, torrentio, anime-kitsu, torrent-catalogs |
| Yeb's / ForTheWeak | https://aiostreams.fortheweak.cloud | stable | 2.36.0 | Yes | Yes | Yes | Yes | trusted | None |
| Midnight's | https://aiostreamsfortheweebsstable.midnightignite.me | stable | 2.36.0 | Yes | Yes | Yes | Yes | trusted | None |
| Kuu's | https://aiostreams.stremio.ru | stable | 2.36.0 | Yes | Yes | Yes | Yes | trusted | None |
| ATBP | https://aio.atbphosting.com | stable | 2.36.0 | Yes | Yes | Yes | Yes | all | bitmagnet |
| Wizaardd | https://aiostreams-stable.forthewizards.uk | stable | 2.36.0 | Yes | Yes | Yes | Yes | all | bitmagnet |
| Viren's Nightly | https://aiostreams.viren070.me | nightly | 2.36.0 | Yes | Yes | Yes | Yes | all | torrentio |
| Omni's (legacy) | https://aiostreams.12312023.xyz | stable | 2.35.9 | Yes | Yes | Yes | Yes | trusted | bitmagnet |

## Internal profiles

| Profile | Kind | Requires probe | Verification |
|---|---|---|---|
| ElfHosted (private / paid) | private | Yes | Verified by live status probe when available |
| TorBox-hosted AIOStreams | vendor | Yes | Unverified until probed |
| Self-hosted / Docker | self-hosted | Yes | Verified by live status probe when available |

## Regex policy

- `none`: only host-published allowlisted regex sources may be used.
- `trusted`: user-supplied regex is accepted under the host's trusted-regex policy.
- `all`: user-supplied regex is accepted without the trusted-regex restriction.

ElfHosted publishes one allowlisted regex source: `https://raw.githubusercontent.com/Vidhin05/Releases-Regex/main/English/regexes.json`.

## Version gates

| Feature | Minimum AIOStreams version |
|---|---:|
| `variants` | 2.33.0 |
| `activeVariants` | 2.33.0 |
| `variantSelectorLocation` | 2.33.2 |
| `anime-tosho-new` preset | 2.36.0 |
