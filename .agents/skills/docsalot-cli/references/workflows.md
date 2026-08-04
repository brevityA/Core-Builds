# Core Workflows

## Create New Documentation

```bash
# 1) local scaffold
docsalot docs init --name "My Project Docs" --out init

# 2) preview
docsalot docs preview --dir init

# 3) create remote documentation
docsalot docs create --name "My Project Docs"

# 4) push initial content
docsalot docs push --documentation-id <documentation-id> --dir init --message "Initial import"

# 5) publish
docsalot docs publish --documentation-id <documentation-id>
```

Optional create flags:

```bash
docsalot docs create --name "My Project Docs" --subdomain my-project-docs --team-id <team-id>
```

## Maintain Existing Documentation

```bash
# sync remote -> local
docsalot docs pull --documentation-id <documentation-id> --out docsalot-docs

# preview local edits
docsalot docs preview --dir docsalot-docs --port 3000

# push local -> remote
docsalot docs push --documentation-id <documentation-id> --dir docsalot-docs --message "Update docs"

# publish latest
docsalot docs publish --documentation-id <documentation-id>
```

Publish specific version:

```bash
docsalot docs publish --documentation-id <documentation-id> --version <n>
```

## Safe Release Checklist

1. Preview locally before push.
2. Use clear push message for version intent.
3. Publish explicit version when precision matters.
4. Verify production docs URL after publish.
