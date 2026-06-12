# Reddit Content Calendar

Posts are managed as markdown files with YAML frontmatter.

## Directory layout

- `scheduled/` — posts with a date in the filename, ready to go. The auto-poster picks these up on the scheduled date.
- `posted/` — moved here automatically after posting. Contains a `reddit_url` field added to frontmatter.
- `drafts/` — work in progress, no date yet.

## File naming

```
YYYY-MM-DD-slug.md
```

Example: `2026-06-14-which-template.md`

## Frontmatter fields

```yaml
---
title: "Post title"
subreddit: CoreBuilds
scheduled: YYYY-MM-DD
flair: Guide          # optional — must match an existing subreddit flair
---
```

## Secrets required

Add these to the repository's GitHub Actions secrets:

- `REDDIT_CLIENT_ID` — from reddit.com/prefs/apps (script type app)
- `REDDIT_CLIENT_SECRET` — from the same app
- `REDDIT_USERNAME` — the posting account username
- `REDDIT_PASSWORD` — the posting account password

## Adding a post

1. Write the post in `drafts/` without a date prefix
2. When ready, move to `scheduled/` with the target date as the filename prefix
3. The workflow runs daily at 18:00 UTC and posts anything scheduled for that day
