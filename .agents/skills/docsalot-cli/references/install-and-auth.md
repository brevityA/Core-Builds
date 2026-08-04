# Install and Authenticate

## Prerequisites

- Node.js `20+`
- npm
- Docsalot account with documentation access

## Install

```bash
npm install -g docsalot-cli
docsalot --version
```

## Authentication

Interactive login (recommended for local use):

```bash
docsalot auth login
docsalot auth whoami --json
```

CI/non-interactive login:

```bash
docsalot auth login --token <YOUR_TOKEN>
echo "$DOCSALOT_API_TOKEN" | docsalot auth login --from-stdin
```

## Verify Access

```bash
docsalot docs list --json
```

If this returns documentations, auth is valid.
