# AIOStreams Instance Status

Live status for all known public AIOStreams instances. Checked every 30 minutes via GitHub Actions.

> ⚠️ **Green = host is reachable.** Does not guarantee the instance accepts new configs or that your template will import correctly. Always test with a fresh import.

---

## 🟢 Stable Instances

<!-- STATUS_STABLE_START -->
| Instance | Status | URL |
|---|---|---|
| **ElfHosted** | 🟢 Online | [aiostreams.elfhosted.com](https://aiostreams.elfhosted.com/stremio/configure) |
| **Yeb's** | 🟢 Online | [aiostreams.fortheweak.cloud](https://aiostreams.fortheweak.cloud/stremio/configure) |
| **Midnight's** | 🟢 Online | [aiostreamsfortheweebsstable.midnightignite.me](https://aiostreamsfortheweebsstable.midnightignite.me/stremio/configure) |
| **Kuu's** | 🟢 Online | [aiostreams.stremio.ru](https://aiostreams.stremio.ru/stremio/configure) |
| **ATBP** | 🟢 Online | [aio.atbphosting.com](https://aio.atbphosting.com/stremio/configure) |
| **Omni's** | 🟢 Online | [aiostreams.12312023.xyz](https://aiostreams.12312023.xyz/stremio/configure) |

*Last checked: 2026-07-21 02:05 UTC*
<!-- STATUS_STABLE_END -->

---

## 🌙 Nightly Instances

<!-- STATUS_NIGHTLY_START -->
| Instance | Status | URL |
|---|---|---|
| **Yeb's Nightly** | 🟢 Online | [aiostreams-nightly.fortheweak.cloud](https://aiostreams-nightly.fortheweak.cloud/stremio/configure) |
| **Midnight's Nightly** | 🟢 Online | [aiostreamsfortheweebs.midnightignite.me](https://aiostreamsfortheweebs.midnightignite.me/stremio/configure) |
| **Kuu's Nightly** | 🟢 Online | [aiostreams-nightly.stremio.ru](https://aiostreams-nightly.stremio.ru/stremio/configure) |
| **Viren's Nightly** | 🟢 Online | [aiostreams.viren070.me](https://aiostreams.viren070.me/stremio/configure) |

*Last checked: 2026-07-21 02:05 UTC*
<!-- STATUS_NIGHTLY_END -->

---

## 📋 Instance Notes

| Host | Notes |
|---|---|
| **ElfHosted** | Most stable. Public instance is debrid-only — perfect for Core Builds. No P2P/HTTP streams. |
| **Yeb's** | Run by an AIOStreams Discord admin. Reliable uptime, fast. |
| **Midnight's** | Run by the TorBox community manager. Optimised for TorBox setups. ⚠️ **Meteor Rewrite V2 Beta** — some features incomplete (Your Media not yet available). You may need to reconfigure or override your manifest. |
| **Viren's** | Developer's own instance. Nightly only — tracks main branch. |
| **Kuu's** | Community-run. Both stable and nightly available. |
| **ATBP** | Community-run. Good uptime track record. |
| **Omni's** | Community-run. |

---

## 🔗 Self-Hosting

Run your own private AIOStreams instance with Docker:

```bash
docker run -p 3000:3000 viren070/aiostreams
```

Full self-hosting docs: [docs.aiostreams.viren070.me](https://docs.aiostreams.viren070.me/getting-started/self-hosting/)

To enable the Core Builds Filtering System synced URLs on a self-hosted instance:

```env
WHITELISTED_SYNCED_URLS=https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Filtering/core-builds-eses.json,https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Filtering/core-builds-pses.json,https://raw.githubusercontent.com/brevityA/Core-Builds/refs/heads/main/Filtering/core-builds-ises.json
```

---

## ➕ Missing an Instance?

[Open an issue →](https://github.com/brevityA/Core-Builds/issues/new?title=Add+Instance:+&labels=instance)

---

*Status auto-updated every 30 minutes by GitHub Actions. Badges powered by [shields.io](https://shields.io).*
