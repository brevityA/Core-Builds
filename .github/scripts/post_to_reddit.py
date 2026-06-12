#!/usr/bin/env python3
"""Post scheduled Reddit content from posts/scheduled/ on the day it's due."""

import os
import sys
from datetime import date
from pathlib import Path

import praw
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEDULED_DIR = REPO_ROOT / "posts" / "scheduled"
POSTED_DIR = REPO_ROOT / "posts" / "posted"


def parse_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text
    try:
        end = text.index("---", 3)
    except ValueError:
        return {}, text
    meta = yaml.safe_load(text[3:end]) or {}
    body = text[end + 3:].strip()
    return meta, body


def build_frontmatter(meta: dict) -> str:
    return "---\n" + yaml.dump(meta, default_flow_style=False, allow_unicode=True) + "---\n"


def find_flair_id(sub, flair_text: str) -> str | None:
    try:
        for flair in sub.flair.link_templates.user_selectable():
            if flair.get("flair_text", "").lower() == flair_text.lower():
                return flair["flair_template_id"]
    except Exception:
        pass
    return None


def post_today() -> int:
    today = date.today().isoformat()

    if not SCHEDULED_DIR.exists():
        print("No scheduled/ directory found — nothing to post.")
        return 0

    files_due = [
        f for f in sorted(SCHEDULED_DIR.glob("*.md"))
        if (meta := parse_frontmatter(f.read_text(encoding="utf-8"))[0])
        and str(meta.get("scheduled", "")) == today
    ]

    if not files_due:
        print(f"No posts scheduled for {today}.")
        return 0

    reddit = praw.Reddit(
        client_id=os.environ["REDDIT_CLIENT_ID"],
        client_secret=os.environ["REDDIT_CLIENT_SECRET"],
        username=os.environ["REDDIT_USERNAME"],
        password=os.environ["REDDIT_PASSWORD"],
        user_agent=f"CoreBuilds-autoposter/1.0 by u/{os.environ['REDDIT_USERNAME']}",
    )

    posted = 0
    POSTED_DIR.mkdir(parents=True, exist_ok=True)

    for post_file in files_due:
        raw = post_file.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(raw)
        title = meta.get("title", post_file.stem)
        subreddit_name = meta.get("subreddit", "CoreBuilds")
        flair_text = meta.get("flair")

        try:
            sub = reddit.subreddit(subreddit_name)
            flair_id = find_flair_id(sub, flair_text) if flair_text else None

            kwargs = {"title": title, "selftext": body}
            if flair_id:
                kwargs["flair_id"] = flair_id

            submission = sub.submit(**kwargs)
            meta["reddit_url"] = submission.url

            dest = POSTED_DIR / post_file.name
            dest.write_text(build_frontmatter(meta) + "\n" + body + "\n", encoding="utf-8")
            post_file.unlink()

            print(f"Posted: {title}")
            print(f"  URL: {submission.url}")
            posted += 1

        except Exception as exc:
            print(f"ERROR posting {post_file.name}: {exc}", file=sys.stderr)

    return posted


if __name__ == "__main__":
    count = post_today()
    print(f"\nDone — {count} post(s) submitted.")
