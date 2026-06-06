# Security Policy

## Reporting a Vulnerability

If you discover a security issue — such as a template that inadvertently exposes API keys, a formatter that injects malicious expressions, or a guide that links to a compromised resource — please **do not open a public issue**.

Report it privately via:
- **GitHub private vulnerability report** — use the Security tab → Report a vulnerability
- **Ko-fi message** — [ko-fi.com/branding_brevity](https://ko-fi.com/branding_brevity)

We aim to acknowledge reports within 48 hours and resolve confirmed issues within 7 days.

## Scope

This repository contains AIOStreams template JSON files, formatters, and documentation. The primary security concerns are:

- API keys or credentials accidentally committed to template files
- ESE expressions or regex patterns that could be exploited on AIOStreams instances
- Links to malicious or compromised external resources

## Supported Versions

Only the latest release is actively maintained. Older template versions are not patched.
