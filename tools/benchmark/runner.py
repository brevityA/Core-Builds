#!/usr/bin/env python3
"""AIOStreams template benchmark runner.

Installs each contender's config on ONE AIOStreams instance with ONE debrid
account, queries the Stremio stream endpoint for every corpus title, and writes
a sanitized raw snapshot of the FULL result list to disk as evidence.

Design constraints baked in:
  * interleaved lanes  — every repeat run cycles ALL contenders before repeating,
    so debrid-cache/seeder drift hits every contender roughly equally.
  * rate limits        — fixed inter-request delay (--delay, default 1.5s) and a
    per-contender pause; no concurrency against the instance.
  * no invented data   — a contender that fails to install or errors is recorded
    with status="error" and the error text; it is never scored as zero.
  * no credentials     — every snapshot is passed through sanitize() before write.

Endpoints used (verified against AIOStreams v2.34.0 source):
  POST {instance}/api/v1/user                      -> { uuid, encryptedPassword }
  PUT  {instance}/api/v1/user                      (Basic auth) update config
  GET  {instance}/api/v1/status                    -> version/tag/channel/commit
  GET  {instance}/stremio/{uuid}/{encPw}/stream/{type}/{id}.json
  Header 'User-Agent: AIOStreams/<x>' makes the server attach `streamData`
  (provideStreamData), which carries service/cached/parsedFile/infohash detail.
  Sources: packages/server/src/app.ts, routes/api/user.ts, routes/stremio/stream.ts,
  packages/core/src/transformers/stremio.ts @ v2.34.0.

Credentials come ONLY from the env file (see README):
  AIOS_INSTANCE_URL, AIOS_CONFIG_PASSWORD, AIOS_LANE, TORBOX_API_KEY, ...

Usage:
  python3 tools/benchmark/runner.py --repeats 3 --lane torbox
  python3 tools/benchmark/runner.py --dry-run          # no network, prints plan
"""

from __future__ import annotations

import argparse
import base64
import copy
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
DEFAULT_CORPUS = HERE / "corpus" / "corpus-v1.json"
DEFAULT_CONTENDERS = HERE / "contenders.json"
DEFAULT_OUT = REPO / "reports" / "benchmark-snapshots"

UA = "AIOStreams/benchmark-harness-1.0"

# Service id -> env var holding that lane's API key.
LANE_ENV = {
    "torbox": "TORBOX_API_KEY",
    "realdebrid": "REALDEBRID_API_KEY",
    "alldebrid": "ALLDEBRID_API_KEY",
    "premiumize": "PREMIUMIZE_API_KEY",
    "debridlink": "DEBRIDLINK_API_KEY",
    "easydebrid": "EASYDEBRID_API_KEY",
    "offcloud": "OFFCLOUD_API_KEY",
}

# ── credential sanitisation ────────────────────────────────────────────────


class Sanitizer:
    """Redacts every known secret value (and secret-shaped strings) from evidence."""

    GENERIC = [
        (re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"), "<REDACTED-UUID>"),
        (re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{5,}\b"), "<REDACTED-JWT>"),
        (re.compile(r"(?i)(api[_-]?key|token|password|apikey|passkey|secret)=([^&\s\"']+)"), r"\1=<REDACTED>"),
        # Credentials embedded in URL PATH segments, not query strings. Debrid CDN
        # links look like https://host/dl/<32-hex-or-longer-token>/file.mkv, so a
        # key-based redaction never fires on them. Match long opaque path segments.
        (re.compile(r"(?i)\b(https?://[^\s\"'<>]*?/)"
                    r"(?:(?:api|dl|d|download|token|stream|unrestrict|resolve)/)"
                    r"([A-Za-z0-9_\-]{16,})"), r"\1<REDACTED-PATH-TOKEN>"),
        # Any remaining long high-entropy hex/base32 run inside a URL path.
        (re.compile(r"(?i)(https?://[^\s\"'<>]*?/)([0-9a-f]{32,})"), r"\1<REDACTED-PATH-TOKEN>"),
    ]
    SECRET_KEYS = {
        "apikey", "api_key", "token", "password", "accesskey", "access_key",
        "credentials", "encryptedpassword", "uuid", "tmdbapikey",
        "tmdbaccesstoken", "rpdbapikey", "url", "externalurl",
        # AIOStreams instance + service credential keys. Missing these meant a
        # real credential could reach a committed snapshot.
        "instancepassword", "stremiopassword", "instanceurl", "stremioaddonurl",
        "passkey", "secret", "clientsecret", "client_secret", "refreshtoken",
        "refresh_token", "accesstoken", "access_token", "sessionid", "cookie",
        "authorization", "auth", "privatekey", "private_key", "webhooksecret",
        # Per-service debrid credential key names used by the services schema.
        "debridlinkapikey", "realdebridapikey", "alldebridapikey",
        "premiumizeapikey", "torboxapikey", "easydebridapikey", "offcloudapikey",
        "putioclientid", "putiotoken", "pikpakusername", "pikpakpassword",
        "seedrencodedtoken", "tvdbapikey", "mdblistapikey", "traktrefreshtoken",
    }
    # Values shorter than this cannot be replaced by literal substring search
    # without corrupting ordinary prose, so they are escalated to a word-boundary
    # regex instead of being skipped entirely.
    SHORT_SECRET_FLOOR = 6

    def __init__(self, secrets: list[str]):
        uniq = {s for s in secrets if s}
        # Long secrets: plain substring replacement, longest first so that a
        # secret which contains another is redacted before its substring.
        self.secrets = sorted(
            {s for s in uniq if len(s) >= self.SHORT_SECRET_FLOOR}, key=len, reverse=True
        )
        # Short secrets: a bare str.replace() of e.g. "abc" would mangle unrelated
        # text, so bound them to token edges. Previously these were DROPPED, which
        # meant a short API key was emitted verbatim.
        self.short_patterns = [
            re.compile(rf"(?<![A-Za-z0-9]){re.escape(s)}(?![A-Za-z0-9])")
            for s in sorted(
                {s for s in uniq if len(s) < self.SHORT_SECRET_FLOOR}, key=len, reverse=True
            )
        ]

    def text(self, value: str) -> str:
        for s in self.secrets:
            value = value.replace(s, "<REDACTED-SECRET>")
        for pat in self.short_patterns:
            value = pat.sub("<REDACTED-SECRET>", value)
        for pat, repl in self.GENERIC:
            value = pat.sub(repl, value)
        return value

    def obj(self, node):
        if isinstance(node, dict):
            out = {}
            for k, v in node.items():
                # Redact on a secret-looking KEY regardless of the value's type.
                # The old check only covered str|dict, so a credential held in a
                # list (e.g. {"credentials": ["<key>"]}) was written out intact.
                if k.lower() in self.SECRET_KEYS:
                    if isinstance(v, str):
                        out[k] = "<REDACTED>"
                    elif isinstance(v, dict):
                        out[k] = "<REDACTED-OBJECT>"
                    elif isinstance(v, list):
                        out[k] = "<REDACTED-LIST>"
                    elif v is None or isinstance(v, bool):
                        out[k] = v  # carries no secret; keep for shape fidelity
                    else:
                        out[k] = "<REDACTED>"
                else:
                    out[k] = self.obj(v)
            return out
        if isinstance(node, list):
            return [self.obj(v) for v in node]
        if isinstance(node, str):
            return self.text(node)
        return node


# ── http ───────────────────────────────────────────────────────────────────


def http(method: str, url: str, *, body=None, headers=None, timeout=90):
    data = json.dumps(body).encode() if body is not None else None
    hdrs = {"User-Agent": UA, "Accept": "application/json"}
    if data:
        hdrs["Content-Type"] = "application/json"
    hdrs.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", "replace")
            return {
                "ok": True, "status": resp.status, "elapsed_ms": round((time.perf_counter() - started) * 1000),
                "body": json.loads(raw) if raw.strip().startswith(("{", "[")) else raw,
            }
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        return {"ok": False, "status": e.code, "elapsed_ms": round((time.perf_counter() - started) * 1000),
                "error": f"HTTP {e.code}", "body": raw[:2000]}
    except Exception as e:  # noqa: BLE001 - network failures are data, not crashes
        return {"ok": False, "status": None, "elapsed_ms": round((time.perf_counter() - started) * 1000),
                "error": f"{type(e).__name__}: {e}", "body": None}


# ── config assembly ────────────────────────────────────────────────────────



from template_processor import (  # noqa: E402
    apply_template_conditionals,
    default_inputs,
    has_unresolved_directives,
)

def _extract_config(doc, select: str | None = None) -> dict:
    """Normalise the four real-world template shapes into a plain config dict.

    Observed in the wild (all four benchmarked challengers differ):
      1. {"metadata":..., "config":...}          — our own + grabberhawk
      2. [ {"metadata":..., "config":...} ]      — single-element bundle (Tamtaro, Vidhin)
      3. {"templates":[ ... ]}                   — named bundle
      4. a BARE config object, no wrapper        — ang3lo-azevedo
    Shape 4 is why we must not simply assume a "config" key exists, and why the
    bare-object fallback checks for known config keys rather than guessing.
    """
    if isinstance(doc, list):
        if not doc:
            raise RuntimeError("template bundle is empty")
        doc = (
            doc[0]
            if select in (None, "first")
            else next(d for d in doc if (d.get("metadata") or {}).get("id") == select)
        )
    if isinstance(doc, dict) and isinstance(doc.get("templates"), list):
        bundle = doc["templates"]
        doc = (
            bundle[0]
            if select in (None, "first")
            else next(d for d in bundle if (d.get("metadata") or {}).get("id") == select)
        )
    if isinstance(doc, dict) and isinstance(doc.get("config"), dict):
        return copy.deepcopy(doc["config"])
    return copy.deepcopy(doc)


def resolve_template(doc, select: str | None = None, services: list[str] | None = None) -> dict:
    """Extract a config AND resolve any wizard directives it carries.

    Wizard templates (`__if` / `__switch` / `{{inputs.*}}`) are resolved by the
    AIOStreams FRONTEND only — `POST /api/v1/user` performs no substitution.
    Posting one raw installs literal placeholder strings, so the benchmark would
    score a broken config. We resolve using the template's own declared
    defaults, i.e. the config as its author ships it.
    """
    cfg = _extract_config(doc, select)
    top = doc[0] if isinstance(doc, list) and doc else doc
    inputs = default_inputs(top if isinstance(top, dict) else {})
    cfg = apply_template_conditionals(cfg, inputs, services or [])
    unresolved = has_unresolved_directives(cfg)
    if unresolved:
        raise RuntimeError(
            "template still has unresolved directives after processing "
            f"({len(unresolved)}): {unresolved[:5]} — refusing to post a config "
            "that would install literal placeholders."
        )
    return cfg


def load_local_template(path: str) -> dict:
    doc = json.loads((REPO / path).read_text())
    return _extract_config(doc)


def load_remote_template(url: str, select: str | None, services: list[str] | None = None) -> dict:
    r = http("GET", url, timeout=60)
    if not r["ok"]:
        raise RuntimeError(f"template fetch failed: {r.get('error')}")
    return resolve_template(r["body"], select, services)


def apply_lane(config: dict, lane: str, api_key: str) -> dict:
    """Enable exactly the benchmark lane and inject its key; disable all others."""
    services = config.get("services")
    if not isinstance(services, list) or not services:
        services = [{"id": lane, "enabled": True, "credentials": {}}]
    for svc in services:
        if svc.get("id") == lane:
            svc["enabled"] = True
            creds = svc.get("credentials") or {}
            creds["apiKey"] = api_key
            svc["credentials"] = creds
        else:
            svc["enabled"] = False
            svc["credentials"] = {}
    if not any(s.get("id") == lane for s in services):
        services.append({"id": lane, "enabled": True, "credentials": {"apiKey": api_key}})
    config["services"] = services
    return config


def _resolve_pointer(obj, pointer: str, *, create: bool = False):
    """Walk a JSON pointer to (parent_node, leaf_key).

    By default every intermediate key MUST already exist. The previous
    implementation used `setdefault(p, {})`, so a typo'd pointer in
    contenders.json silently grew a brand-new config subtree: the mutation
    "succeeded", the differ saw an extra field, and the variant was no longer
    single-variable — exactly the failure the single-variable proof exists to
    prevent.

    `create=True` opts in to building missing intermediates. It is only for
    variants that deliberately introduce a field absent from the control
    (e.g. `/failover`, which no Core Builds template sets), and it must be
    declared explicitly in the mutation so the intent is reviewable.
    """
    parts = [p for p in pointer.split("/") if p]
    if not parts:
        raise ValueError(f"empty JSON pointer {pointer!r}")
    node = obj
    for i, p in enumerate(parts[:-1]):
        if not isinstance(node, dict):
            raise ValueError(
                f"pointer {pointer!r}: segment {'/'.join(parts[:i]) or '/'} is "
                f"{type(node).__name__}, not an object"
            )
        if p not in node:
            if not create:
                raise ValueError(
                    f"pointer {pointer!r}: intermediate key {p!r} does not exist. "
                    "Fix the pointer, or set \"create\": true in the mutation if the "
                    "variant is meant to introduce it."
                )
            node[p] = {}
        node = node[p]
    if not isinstance(node, dict):
        raise ValueError(f"pointer {pointer!r}: parent is {type(node).__name__}, not an object")
    return node, parts[-1]


def apply_mutation(config: dict, mutation: dict) -> tuple[dict, str]:
    """Apply the ONE single-variable change of an experimental variant."""
    op = mutation["op"]
    if op == "set":
        create = bool(mutation.get("create", False))
        node, leaf = _resolve_pointer(config, mutation["pointer"], create=create)
        existed = leaf in node
        if not existed and not create:
            raise ValueError(
                f"set {mutation['pointer']}: key does not exist in the control config. "
                "Set \"create\": true if this variant is meant to introduce it."
            )
        before = node.get(leaf)
        if before == mutation["value"]:
            raise ValueError(
                f"set {mutation['pointer']}: value is already {before!r} — NO-OP, "
                "unattributable as a benchmark variable."
            )
        node[leaf] = mutation["value"]
        verb = "created" if not existed else "set"
        return config, f"{verb} {mutation['pointer']}: {before!r} -> {mutation['value']!r}"
    if op == "remove_preset":
        presets = config.get("presets", [])
        t = mutation["preset_type"]
        hits = [p for p in presets if p.get("type") == t]
        if not hits:
            raise ValueError(f"remove_preset: no preset of type {t!r} in this config")
        if not any(p.get("enabled", True) for p in hits):
            raise ValueError(f"remove_preset: preset {t!r} is already disabled — removing it is a NO-OP, "
                             f"which would make this variant unattributable")
        config["presets"] = [p for p in presets if p.get("type") != t]
        return config, f"removed {len(hits)} preset(s) of type {t}"
    if op == "add_preset":
        t = mutation["preset_type"]
        existing = [p for p in config.get("presets", []) if p.get("type") == t]
        if existing:  # already declared but disabled -> the single variable is "enable it"
            for p in existing:
                p["enabled"] = True
            return config, f"enabled existing preset {t} (was declared but disabled)"
        config.setdefault("presets", []).append(
            {"type": t, "instanceId": f"bench-{t}", "enabled": True,
             "options": {"name": t.title(), "timeout": 15000, "resources": ["stream"]}, "resources": ["stream"]}
        )
        return config, f"added preset {t}"
    if op == "demote_sort_key":
        crit = config.get("sortCriteria", {}).get("global", [])
        key, below = mutation["key"], mutation["below"]
        entry = next((c for c in crit if c.get("key") == key), None)
        if entry is None:
            # Was a silent NO-OP: the runner installed a config identical to the
            # control and the comparison produced meaningless data attributed to a
            # variable that was never changed. Every other op raises; so does this.
            raise ValueError(
                f"demote_sort_key: sort key {key!r} is not present in sortCriteria.global "
                f"(has: {[c.get('key') for c in crit]}) — NO-OP, unattributable."
            )
        if not any(c.get("key") == below for c in crit):
            raise ValueError(
                f"demote_sort_key: anchor key {below!r} is not present in sortCriteria.global "
                f"(has: {[c.get('key') for c in crit]}) — the demotion target is undefined."
            )
        before_order = [c.get("key") for c in crit]
        crit.remove(entry)
        idx = next(i for i, c in enumerate(crit) if c.get("key") == below)
        crit.insert(idx + 1, entry)
        if [c.get("key") for c in crit] == before_order:
            raise ValueError(
                f"demote_sort_key: {key!r} is already directly below {below!r} — NO-OP, "
                "unattributable."
            )
        config["sortCriteria"]["global"] = crit
        return config, f"demoted sort key {key} to just below {below}"
    raise ValueError(f"unknown mutation op {op!r}")


def build_config(c: dict, lane: str, api_key: str) -> tuple[dict, list[str]]:
    notes = []
    src = c["source"]
    if src == "local":
        config = load_local_template(c["path"])
        notes.append(f"loaded local template {c['path']}")
    elif src == "url":
        config = load_remote_template(c["url"], c.get("template_select"), [lane])
        notes.append(f"loaded remote template {c['url']}")
    elif src == "default":
        config = {}  # server fills every default from the UserData schema
        notes.append("no template: AIOStreams schema defaults")
    else:
        raise ValueError(f"unknown source {src!r}")
    if c.get("mutation"):
        config, note = apply_mutation(config, c["mutation"])
        notes.append("single-variable: " + note)
    config = apply_lane(config, lane, api_key)
    notes.append(f"lane={lane} enabled, all other services disabled")
    return config, notes


# ── instance interaction ───────────────────────────────────────────────────


def create_user(instance: str, config: dict, password: str) -> dict:
    return http("POST", f"{instance}/api/v1/user", body={"config": config, "password": password})


def stream_url(instance: str, uuid: str, enc_pw: str, entry: dict) -> str:
    if entry["type"] == "series":
        sid = f"{entry['imdb']}:{entry['season']}:{entry['episode']}"
    else:
        sid = entry["imdb"]
    return f"{instance}/stremio/{uuid}/{enc_pw}/stream/{entry['type']}/{urllib.parse.quote(sid, safe='')}.json"


def extract_results(payload) -> list[dict]:
    """Flatten AIOStreams' Stremio stream response into scoreable rows.

    Keeps: rank position, addon, service, cached flag, filename/title, resolution,
    quality, encode, visual/audio tags, languages, size, bitrate, infohash, type.
    """
    rows = []
    streams = (payload or {}).get("streams") or []
    for i, s in enumerate(streams):
        sd = s.get("streamData") or {}
        pf = sd.get("parsedFile") or {}
        svc = sd.get("service") or {}
        torrent = sd.get("torrent") or {}
        bh = s.get("behaviorHints") or {}
        rows.append({
            "rank": i + 1,
            "stream_type": sd.get("type"),
            "addon": sd.get("addon") or s.get("name"),
            "service_id": svc.get("id"),
            "cached": svc.get("cached"),
            "name_line": s.get("name"),
            "description": s.get("description"),
            "filename": sd.get("filename") or bh.get("filename"),
            "folder_name": sd.get("folderName"),
            "title": pf.get("title"),
            "year": pf.get("year"),
            "season": pf.get("season") if pf.get("season") is not None else (pf.get("seasons") or [None])[0],
            "episode": pf.get("episode"),
            "resolution": pf.get("resolution"),
            "quality": pf.get("quality"),
            "encode": pf.get("encode"),
            "visual_tags": pf.get("visualTags"),
            "audio_tags": pf.get("audioTags"),
            "audio_channels": pf.get("audioChannels"),
            "languages": pf.get("languages"),
            "release_group": pf.get("releaseGroup"),
            "size_bytes": sd.get("size") or bh.get("videoSize"),
            "duration_ms": sd.get("duration"),
            "indexer": sd.get("indexer"),
            "seeders": torrent.get("seeders"),
            "infohash": torrent.get("infoHash") or bh.get("bingeGroup"),
            "file_idx": torrent.get("fileIdx"),
            "regex_score": sd.get("regexScore"),
            "sel_score": sd.get("streamExpressionScore"),
            "sel_matched": sd.get("streamExpressionMatched"),
            "seadex": sd.get("seadex"),
            "is_error_row": sd.get("type") in ("error", "statistic"),
            # Playback URL is a credentialed debrid link. It is NEVER written to
            # the committed snapshot (Sanitizer redacts the `url` key); it is only
            # written to the gitignored *.local.json sidecar for spotcheck.py.
            "url": s.get("url"),
        })
    return rows


# ── main run loop ──────────────────────────────────────────────────────────


def main() -> int:

    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--corpus", default=str(DEFAULT_CORPUS))
    ap.add_argument("--contenders", default=str(DEFAULT_CONTENDERS))
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--lane", default=os.environ.get("AIOS_LANE", "torbox"))
    ap.add_argument("--repeats", type=int, default=3, help="repeat runs (>=3 required by the rubric)")
    ap.add_argument("--delay", type=float, default=1.5, help="seconds between stream requests (rate-limit courtesy)")
    ap.add_argument("--contender-pause", type=float, default=10.0)
    ap.add_argument("--only", action="append", help="restrict to contender id(s)")
    ap.add_argument("--dry-run", action="store_true", help="print the plan, touch no network")
    args = ap.parse_args()

    corpus = json.loads(Path(args.corpus).read_text())
    registry = json.loads(Path(args.contenders).read_text())
    contenders = [c for c in registry["contenders"] if c.get("lane", args.lane) == args.lane]
    if args.only:
        contenders = [c for c in contenders if c["id"] in args.only]
    titles = corpus["titles"]

    if args.repeats < 3:
        print("WARNING: rubric requires >=3 repeat runs; results will be marked incomplete", file=sys.stderr)

    print(f"plan: {len(contenders)} contenders x {len(titles)} titles x {args.repeats} repeats "
          f"= {len(contenders) * len(titles) * args.repeats} stream requests, lane={args.lane}")
    for c in contenders:
        print(f"  - [{c['role']:10s}] {c['id']}")
    if args.dry_run:
        print("\n--dry-run: stopping before any network call.")
        return 0

    instance = (os.environ.get("AIOS_INSTANCE_URL") or "").rstrip("/")
    password = os.environ.get("AIOS_CONFIG_PASSWORD")
    api_key = os.environ.get(LANE_ENV.get(args.lane, ""), "")
    missing = [n for n, v in [("AIOS_INSTANCE_URL", instance), ("AIOS_CONFIG_PASSWORD", password),
                              (LANE_ENV.get(args.lane, "?"), api_key)] if not v]
    if missing:
        print(f"ERROR: missing env: {', '.join(missing)}. See tools/benchmark/README.md", file=sys.stderr)
        return 2

    san = Sanitizer([api_key, password, instance])

    status = http("GET", f"{instance}/api/v1/status")
    instance_meta = (status.get("body") or {}).get("data", {}) if status["ok"] else {"error": status.get("error")}
    version = instance_meta.get("version", "UNKNOWN")
    print(f"instance version={version} tag={instance_meta.get('tag')} channel={instance_meta.get('channel')}")

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    outdir = Path(args.out) / f"run-{run_id}"
    outdir.mkdir(parents=True, exist_ok=True)

    # 1. install every contender ONCE, up front, so all repeats share identical installs.
    installs: dict[str, dict] = {}
    for c in contenders:
        try:
            config, notes = build_config(c, args.lane, api_key)
        except Exception as e:  # noqa: BLE001
            installs[c["id"]] = {"status": "install_failed", "error": f"config build: {type(e).__name__}: {e}"}
            print(f"  ! {c['id']}: config build failed: {e}")
            continue
        r = create_user(instance, config, password)
        if not r["ok"]:
            installs[c["id"]] = {"status": "install_failed", "error": r.get("error"),
                                 "detail": san.text(str(r.get("body"))[:500]), "notes": notes}
            print(f"  ! {c['id']}: install failed ({r.get('error')})")
        else:
            data = (r["body"] or {}).get("data", {})
            installs[c["id"]] = {"status": "installed", "uuid": data.get("uuid"),
                                 "enc_pw": data.get("encryptedPassword"), "notes": notes}
            print(f"  + {c['id']}: installed")
        time.sleep(args.delay)

    # 2. interleaved repeats: repeat -> contender -> title.
    manifest = {
        "run_id": run_id,
        "started_utc": datetime.now(timezone.utc).isoformat(),
        "lane": args.lane,
        "repeats": args.repeats,
        "corpus_id": corpus["corpus_id"],
        "corpus_version": corpus["version"],
        "instance_version": version,
        "instance_tag": instance_meta.get("tag"),
        "instance_channel": instance_meta.get("channel"),
        "instance_commit": instance_meta.get("commit"),
        "harness_version": "1.0.0",
        "interleaved": True,
        "contenders": {cid: {k: v for k, v in meta.items() if k not in ("uuid", "enc_pw")}
                       for cid, meta in installs.items()},
        "snapshots": [],
    }

    for rep in range(1, args.repeats + 1):
        for c in contenders:
            cid = c["id"]
            inst = installs[cid]
            if inst["status"] != "installed":
                manifest["snapshots"].append({"contender": cid, "repeat": rep, "status": "skipped_install_failed"})
                continue
            for entry in titles:
                url = stream_url(instance, inst["uuid"], inst["enc_pw"], entry)
                r = http("GET", url)
                snap = {
                    "contender": cid, "role": c["role"], "lane": args.lane, "repeat": rep,
                    "title_key": entry["key"], "bucket": entry["bucket"], "type": entry["type"],
                    "imdb": entry["imdb"], "season": entry.get("season"), "episode": entry.get("episode"),
                    "requested_utc": datetime.now(timezone.utc).isoformat(),
                    "instance_version": version,
                    "http_status": r["status"],
                    "elapsed_ms_full_list": r["elapsed_ms"],
                    "status": "ok" if r["ok"] else "error",
                    "error": None if r["ok"] else r.get("error"),
                }
                if r["ok"]:
                    snap["results"] = extract_results(r["body"])
                    snap["result_count"] = len(snap["results"])
                else:
                    snap["results"] = []
                    snap["result_count"] = None  # NOT zero: a failure is a failure
                    snap["error_body"] = san.text(str(r.get("body"))[:1000])

                fname = f"r{rep}__{cid}__{entry['key']}.json"
                # gitignored sidecar keeps the raw credentialed playback URLs so
                # spotcheck.py can probe them; only the sanitized file is committed.
                # Stamp the run identity so spotcheck can refuse a sidecar left
                # behind by an earlier run into a reused directory — those URLs are
                # expired and would be scored as dead links against this run.
                snap["run_id"] = run_id
                snap["captured_utc"] = datetime.now(timezone.utc).isoformat()
                (outdir / fname.replace(".json", ".local.json")).write_text(json.dumps(snap, indent=1) + "\n")
                (outdir / fname).write_text(json.dumps(san.obj(snap), indent=1) + "\n")
                manifest["snapshots"].append({"contender": cid, "repeat": rep, "title_key": entry["key"],
                                              "file": fname, "status": snap["status"],
                                              "result_count": snap["result_count"]})
                time.sleep(args.delay)
            print(f"  repeat {rep}: {cid} done")
            time.sleep(args.contender_pause)

    manifest["finished_utc"] = datetime.now(timezone.utc).isoformat()
    (outdir / "manifest.json").write_text(json.dumps(san.obj(manifest), indent=2) + "\n")
    print(f"\nwrote {len(manifest['snapshots'])} snapshot records to {outdir}")
    print(f"next: python3 tools/benchmark/score.py --run {outdir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
