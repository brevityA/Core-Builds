---
name: docsalot-cli
description: >
  Install and operate the Docsalot CLI for docs lifecycle workflows. Use this skill when users need terminal setup, authentication, pull/edit/push/publish flows, or troubleshooting Docsalot CLI commands.
---

# Docsalot CLI

Use this skill for terminal-first Docsalot workflows.

## When To Use

Use this skill when the user wants to:
- set up `docsalot` locally
- authenticate CLI (`auth login`, CI token login)
- initialize or create docs projects
- sync docs between local filesystem and Docsalot (`pull`, `push`, `publish`)
- troubleshoot common CLI errors

## Quick Decisions

| User Need | Action |
| --- | --- |
| First-time local login | Use `docsalot auth login` (interactive browser flow) |
| CI/non-interactive login | Use `docsalot auth login --token <token>` or `--from-stdin` |
| Start docs locally before remote | Use `docsalot docs init` |
| Create remote documentation project | Use `docsalot docs create` |
| Sync down current remote docs | Use `docsalot docs pull` |
| Upload local changes as new version | Use `docsalot docs push` |
| Publish latest or explicit version | Use `docsalot docs publish` |
| Need precise command details | Read `references/command-reference.md` |

## Default Workflow

1. Authenticate
2. Confirm access (`docsalot auth whoami --json`, `docsalot docs list --json`)
3. Pull existing docs or init new docs
4. Edit and preview locally
5. Push with clear message
6. Publish intentionally

## Operational Rules

- Treat API tokens as secrets.
- Prefer `--json` for automation and agent parsing.
- Do not guess `documentation-id`; fetch it via `docsalot docs list --json`.
- Prefer explicit commands over inferred state.

## Reference Files

- Install/auth: `references/install-and-auth.md`
- Core workflows: `references/workflows.md`
- Command catalog: `references/command-reference.md`
- Troubleshooting: `references/troubleshooting.md`

Load only the reference file needed for the current task.
