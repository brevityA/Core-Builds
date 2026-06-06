import urllib.request, urllib.error, datetime, re, sys

STABLE = {
    "ElfHosted":  "https://aiostreams.elfhosted.com/stremio/configure",
    "Yeb's":      "https://aiostreams.fortheweak.cloud/stremio/configure",
    "Midnight's": "https://aiostreamsfortheweebsstable.midnightignite.me/stremio/configure",
    "Kuu's":      "https://aiostreams.stremio.ru/stremio/configure",
    "ATBP":       "https://aio.atbphosting.com/stremio/configure",
    "Omni's":     "https://aiostreams.12312023.xyz/stremio/configure",
}

NIGHTLY = {
    "Yeb's Nightly":      "https://aiostreams-nightly.fortheweak.cloud/stremio/configure",
    "Midnight's Nightly": "https://aiostreamsfortheweebs.midnightignite.me/stremio/configure",
    "Kuu's Nightly":      "https://aiostreams-nightly.stremio.ru/stremio/configure",
    "Viren's Nightly":    "https://aiostreams.viren070.me/stremio/configure",
}


def check(url):
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": "CoreBuilds-StatusBot/1.0"}
        )
        code = urllib.request.urlopen(req, timeout=8).getcode()
        return "🟢 Online" if code == 200 else "🟡 Degraded"
    except urllib.error.HTTPError as e:
        return "🟡 Degraded" if e.code < 500 else "🔴 Offline"
    except Exception:
        return "🔴 Offline"


def build_table(instances):
    lines = ["| Instance | Status | URL |", "|---|---|---|"]
    for name, url in instances.items():
        status = check(url)
        clean_url = url.replace("https://", "").replace("/stremio/configure", "")
        lines.append(f"| **{name}** | {status} | [{clean_url}]({url}) |")
        print(f"  {status}  {name}")
    return "\n".join(lines)


def update_status_md(path="STATUS.md"):
    ts = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    print("\nChecking stable instances...")
    stable_table = build_table(STABLE) + f"\n\n*Last checked: {ts}*"

    print("\nChecking nightly instances...")
    nightly_table = build_table(NIGHTLY) + f"\n\n*Last checked: {ts}*"

    with open(path, "r") as f:
        content = f.read()

    content = re.sub(
        r"<!-- STATUS_STABLE_START -->.*?<!-- STATUS_STABLE_END -->",
        f"<!-- STATUS_STABLE_START -->\n{stable_table}\n<!-- STATUS_STABLE_END -->",
        content, flags=re.DOTALL
    )
    content = re.sub(
        r"<!-- STATUS_NIGHTLY_START -->.*?<!-- STATUS_NIGHTLY_END -->",
        f"<!-- STATUS_NIGHTLY_START -->\n{nightly_table}\n<!-- STATUS_NIGHTLY_END -->",
        content, flags=re.DOTALL
    )

    with open(path, "w") as f:
        f.write(content)

    print(f"\n✓ STATUS.md updated at {ts}")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "STATUS.md"
    update_status_md(path)
