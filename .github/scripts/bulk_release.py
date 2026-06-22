#!/usr/bin/env python3
"""Bulk-create GitHub releases for versions documented in CHANGELOG.md.

Reads VERSIONS_INPUT, SINCE_VERSION, and DRY_RUN from environment.
"""

import json
import os
import re
import subprocess
import sys


def ver_tuple(v):
    return tuple(int(x) for x in v.split("."))


def parse_changelog(path="CHANGELOG.md"):
    """Return {version: notes} for every dated entry in CHANGELOG."""
    with open(path) as f:
        content = f.read()

    heading = re.compile(r"^## (\d+\.\d+(?:\.\d+)*) \(\d{4}-\d{2}-\d{2}\)", re.MULTILINE)
    matches = list(heading.finditer(content))

    result = {}
    for i, m in enumerate(matches):
        version = m.group(1)
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        notes = content[start:end].strip().strip("-").strip()
        result[version] = notes

    return result


def get_existing_releases():
    """Return set of tag names that already have a GitHub release."""
    out = subprocess.run(
        ["gh", "release", "list", "--limit", "200", "--json", "tagName"],
        capture_output=True, text=True, check=True,
    )
    return {r["tagName"] for r in json.loads(out.stdout)}


def get_existing_tags():
    """Return set of git tags that already exist in the repo."""
    out = subprocess.run(["git", "tag", "-l"], capture_output=True, text=True, check=True)
    return set(out.stdout.strip().splitlines())


def normalize_tag(tag):
    """Normalise legacy compact tags: 2.90 -> 2.9.0, 2.80 -> 2.8.0."""
    parts = tag.split(".")
    if len(parts) == 2 and len(parts[1]) == 2:
        return f"{parts[0]}.{parts[1][0]}.{parts[1][1]}"
    return tag


def create_release(version, notes, existing_tags, dry_run):
    if version not in existing_tags:
        print(f"  Tagging {version} at HEAD...")
        if not dry_run:
            subprocess.run(["git", "tag", version], check=True)
            subprocess.run(["git", "push", "origin", version], check=True)
    else:
        print(f"  Tag {version} already exists — reusing.")

    print(f"  Publishing release {version}...")
    if dry_run:
        print(f"  [DRY RUN] gh release create {version}")
        preview = notes[:200].replace("\n", " ")
        print(f"  Notes preview: {preview}...")
    else:
        subprocess.run(
            ["gh", "release", "create", version,
             "--title", version,
             "--notes", notes],
            check=True,
        )


def main():
    dry_run = os.environ.get("DRY_RUN", "false").lower() == "true"
    versions_input = os.environ.get("VERSIONS_INPUT", "all_missing").strip()
    since_version = os.environ.get("SINCE_VERSION", "2.5.1").strip()

    changelog = parse_changelog()
    existing_releases = get_existing_releases()
    existing_tags = get_existing_tags()

    existing_normalized = {normalize_tag(r) for r in existing_releases}

    print(f"CHANGELOG versions : {len(changelog)}")
    print(f"Existing releases  : {len(existing_releases)}")
    print()

    if versions_input == "all_missing":
        since = ver_tuple(since_version)
        target = sorted(
            [v for v in changelog if ver_tuple(v) >= since and v not in existing_normalized],
            key=ver_tuple,
        )
        print(f"Missing since {since_version} ({len(target)} versions):")
        for v in target:
            print(f"  {v}")
    else:
        target = [v.strip() for v in versions_input.split(",") if v.strip()]
        print(f"Requested versions: {target}")

    print()

    if not target:
        print("Nothing to create — all up to date.")
        return

    mode = "DRY RUN — " if dry_run else ""
    print(f"{mode}Creating {len(target)} release(s)...\n")

    errors = []
    for version in target:
        print(f"[{version}]")
        if version not in changelog:
            msg = f"{version} not found in CHANGELOG — skipped"
            print(f"  WARNING: {msg}")
            errors.append(msg)
            print()
            continue

        try:
            create_release(version, changelog[version], existing_tags, dry_run)
            if not dry_run:
                existing_tags.add(version)
        except subprocess.CalledProcessError as exc:
            msg = f"{version} failed: {exc}"
            print(f"  ERROR: {msg}")
            errors.append(msg)

        print()

    if errors:
        print("Errors:")
        for e in errors:
            print(f"  {e}")
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()
