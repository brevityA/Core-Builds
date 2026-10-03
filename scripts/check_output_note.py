#!/usr/bin/env python3
"""Require release notes to say when a release does not change generated configs.

Configurator 3.9 -> 3.10 -> 3.11 and 3.12 -> 3.13 produced byte-identical golden
configs, yet each release read as a config change. Users re-imported, AIOStreams
correctly reported "no changes", and the configurator looked broken. A release
is free to ship tools, docs or CI only; it must just say so.

Rule, checked against the PR base:
  - The PR adds a new newest version to configurator/src/data/changelog.js, and
  - no golden config under configurator/e2e/golden/ changed beyond its
    coreBuildsVersion / generatedAt stamps
  => the new entry must contain an item starting "Generated output unchanged — ".
  The inverse also fails: an entry that claims unchanged output while a golden
  moved is a false statement users would act on.

Usage: python3 scripts/check_output_note.py --base origin/main
"""
import argparse
import json
import re
import subprocess
import sys

CHANGELOG = "configurator/src/data/changelog.js"
GOLDEN_DIR = "configurator/e2e/golden"
NOTE = re.compile(r"^\s*generated output unchanged\s+—\s+", re.IGNORECASE)
STAMP_KEYS = ("coreBuildsVersion", "generatedAt")


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=False)


def newest_entry(js_text):
    """Return (version, [items]) of the first entry in changelog.js, or (None, [])."""
    m = re.search(r"\{\s*v:\s*'([^']+)'.*?items:\s*\[(.*?)\]\s*\}", js_text, re.DOTALL)
    if not m:
        return None, []
    items = re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2), re.DOTALL)
    return m.group(1), [i.replace("\\'", "'") for i in items]


def strip_stamps(doc):
    """Drop the per-release stamps so only real output differences remain."""
    if isinstance(doc, dict):
        meta = doc.get("metadata")
        if isinstance(meta, dict):
            doc = {**doc, "metadata": {k: v for k, v in meta.items() if k not in STAMP_KEYS}}
    return doc


def goldens_changed(base_docs, head_docs):
    """True when any golden was added, removed, or differs beyond its stamps."""
    if set(base_docs) != set(head_docs):
        return True
    return any(strip_stamps(base_docs[n]) != strip_stamps(head_docs[n]) for n in head_docs)


def evaluate(base_version, head_version, head_items, changed):
    """Return an error message, or None when the PR satisfies the rule."""
    if head_version is None or head_version == base_version:
        return None  # not a release PR
    says_unchanged = any(NOTE.match(i) for i in head_items)
    if not changed and not says_unchanged:
        return (f"v{head_version} adds a release but no golden config changed beyond its "
                f"version stamp. Add an item starting 'Generated output unchanged — ' so "
                f"users know re-importing does nothing.")
    if changed and says_unchanged:
        return (f"v{head_version} says 'Generated output unchanged' but golden configs "
                f"changed. Remove that item or explain the output change instead.")
    return None


def load_goldens(ref):
    names = git("ls-tree", "--name-only", f"{ref}:{GOLDEN_DIR}").stdout.split()
    docs = {}
    for n in names:
        if n.endswith(".json"):
            docs[n] = json.loads(git("show", f"{ref}:{GOLDEN_DIR}/{n}").stdout)
    return docs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    base = ap.parse_args().base
    if git("rev-parse", "--verify", f"{base}^{{commit}}").returncode != 0:
        print(f"check_output_note: base {base!r} not available; fetch it first", file=sys.stderr)
        return 2
    base_version, _ = newest_entry(git("show", f"{base}:{CHANGELOG}").stdout)
    head_version, head_items = newest_entry(open(CHANGELOG, encoding="utf-8").read())
    if head_version is None:
        print("check_output_note: could not parse the newest changelog entry", file=sys.stderr)
        return 2
    head_docs = {}
    for n in git("ls-files", GOLDEN_DIR).stdout.split():
        if n.endswith(".json"):
            head_docs[n.rsplit("/", 1)[1]] = json.load(open(n, encoding="utf-8"))
    changed = goldens_changed(load_goldens(base), head_docs)
    err = evaluate(base_version, head_version, head_items, changed)
    if err:
        print(f"::error::{err}")
        return 1
    print(f"check_output_note: OK (newest v{head_version}, base v{base_version}, "
          f"goldens {'changed' if changed else 'unchanged'})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
