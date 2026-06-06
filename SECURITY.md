# 🔒 Security & Privacy Information

The **Core Builds** templates are designed with user privacy and account security as a top priority. When configuring third-party services like Real-Debrid and TorBox through AIOStreams, it is critical that traffic is routed safely to prevent account bans and protect personal data.

Here is how the Core Builds handle your streaming security:

## 🛡️ Real-Debrid & MediaFlow Proxy Integration
In May 2026, widespread "infringing file" errors and IP bans began occurring for users running cross-service configurations. To combat this, the **Dual Core (Safe Edition)** templates implement strict traffic rules:
* **Proxy-Locked Traffic:** All Real-Debrid API and streaming traffic is hardcoded to route through the MediaFlow proxy. 
* **IP Ban Prevention:** Because AIOStreams merges caches from multiple services, routing RD through a centralized proxy ensures Real-Debrid only ever sees a single IP address, preventing automated bans for simultaneous multi-network usage.
* **Automated Scrubbing:** The `excludedStreamExpressions` block acts as a localized firewall, stripping broken WEB-DL/WEBRip links from RD results before they ever hit your player, preventing account flags for requesting taken-down files.

## ⚡ TorBox & Usenet Privacy
The **Single-Service (TorBox Exclusive)** builds rely entirely on TorBox's Usenet caching architecture. 
* **Zero P2P Swarms:** Unlike standard torrenting, downloading cached Usenet files via TorBox does not expose your IP address to a public peer-to-peer swarm.
* **SSL/TLS Encryption:** All streams pulled from TorBox are delivered via 256-bit encrypted connections, ensuring your ISP cannot inspect the contents of your streaming traffic.

## 🔑 API Keys & Local Data Handling
* **No Telemetry:** The `.json` templates provided in this repository are purely configuration files. They do not contain analytics, tracking scripts, or telemetry. They never "phone home" to this repository.
* **API Key Safety:** Your TorBox and Real-Debrid API keys are handled entirely by your AIOStreams instance. If you are self-hosting AIOStreams, your keys never leave your local network. If you are using a trusted cloud instance (like ForTheWeak), your keys are handled server-side according to their specific privacy policies.

## 🐛 Reporting a Vulnerability
If you discover a security flaw in how the Core Builds handle routing, or if a new update to AIOStreams breaks the proxy integration, please do not open a public issue. 

Instead, please send a direct message via the [Ko-fi support link](https://ko-fi.com/branding_brevity) so the routing rules can be patched immediately before the vulnerability is publicly disclosed.
