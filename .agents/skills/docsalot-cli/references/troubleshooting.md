# Troubleshooting

## `auth whoami` fails

Re-authenticate and retry:

```bash
docsalot auth login
docsalot auth whoami --json
```

CI:

```bash
echo "$DOCSALOT_API_TOKEN" | docsalot auth login --from-stdin
```

## Missing `documentation-id`

Fetch IDs and use exact value:

```bash
docsalot docs list --json
```

If you only ran `docs init`, no remote documentation exists yet. Create one:

```bash
docsalot docs create --name "My Docs"
```

## Preview looks wrong

Ensure preview directory matches edited/pulled directory:

```bash
docsalot docs preview --dir docsalot-docs --port 3000
```

## Push/Publish failed

- Verify token and team/documentation access
- Re-run with `--json` to inspect machine-readable error
- Pull latest before retrying large updates

## Port conflict

```bash
docsalot docs preview --dir docsalot-docs --port 3001
```
