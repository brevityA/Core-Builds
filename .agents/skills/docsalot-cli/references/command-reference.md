# Command Reference

## Global

```bash
docsalot --help
docsalot --version
docsalot <command> --json
```

## Auth

```bash
docsalot auth login
docsalot auth login --token <token>
docsalot auth login --from-stdin
docsalot auth login --no-open
docsalot auth logout
docsalot auth whoami

docsalot auth api-token set --token <token>
docsalot auth api-token set --from-stdin
docsalot auth api-token list
docsalot auth api-token remove [--id <token-id>]
```

## Docs

```bash
docsalot docs list
docsalot docs init [--name <name>] [--out <dir>]
docsalot docs create --name <name> [--subdomain <subdomain>] [--team-id <team-id>]
docsalot docs pull --documentation-id <documentation-id> [--out <dir>]
docsalot docs push --documentation-id <documentation-id> [--dir <dir>] [--message <msg>]
docsalot docs publish --documentation-id <documentation-id> [--version <n>]
docsalot docs preview [--dir <dir>] [--port <n>] [--host <host>]
```

## Skills

```bash
docsalot skills install [--path <skill-dir>]
```

## Embedded CLI Docs

```bash
docsalot cli-docs list
docsalot cli-docs read --path <topic-path>
docsalot cli-docs search "<query>"

# alias
docsalot man <topic-path>
docsalot man search "<query>"
```
