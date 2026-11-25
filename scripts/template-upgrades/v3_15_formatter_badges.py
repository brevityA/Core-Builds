#!/usr/bin/env python3
"""Replace regex-style `~` checks in shipped formatters and template formatters.

AIOStreams' formatter `~` is a case-insensitive *includes* for text and an
exact (case-insensitive) item match for lists. It never evaluates a regex, so
`::~(?i)(A|B)` matches nothing and those badges never showed. #845 fixed the
configurator's built-in formatters (configurator/src/data/formatters.js); this
applies the same, engine-verified forms to Formatters/*.json and every active
template. Legacy/ and Deprecated/ are frozen by design.

Idempotent. Templates whose text changes get one patch bump and a changelog
row. Run from the repo root:  python3 scripts/template-upgrades/v3_15_formatter_badges.py
"""
import glob
import json
import sys

ELITE = ['epsilon', 'framestor', 'qxr', 'tigole', 'ntb', 'flux', 'd-z0n3', 'playbd', 'hifi', 'don', 'huno', 'bmf']
DD_PLUS = 'stream.audioTags::~EAC3::or::stream.audioTags::~DDP::or::stream.audioTags::~DD+['
# Keys and values are the raw JSON text (backslashes doubled as stored).
REPLACEMENTS = {
    'stream.releaseGroup::~(?i)(' + '|'.join(ELITE) + ')[':
        '::or::'.join('stream.releaseGroup::=' + g for g in ELITE) + '[',
    'stream.visualTags::~(?i)(DV|HDR|HLG)[':
        'stream.visualTags::~dv::or::stream.visualTags::~hdr::or::stream.visualTags::~hdr10'
        '::or::stream.visualTags::~hdr10+::or::stream.visualTags::~hlg[',
    'stream.visualTags::~(?i)(SDR|HDR10)[': 'stream.visualTags::~sdr::or::stream.visualTags::~hdr10[',
    'stream.filename::~(?i)IMAX[': 'stream.filename::~imax[',
    'stream.filename::~(?i)(IMAX)[': 'stream.filename::~imax[',
    'stream.filename::~(?i)(Hybrid)[': 'stream.filename::~hybrid[',
    'stream.audioTags::~(?i)(EAC3|DDP|DD\\\\+)[': DD_PLUS,
    'stream.audioTags::~(?i)(EAC3|DDP|DD[\\\\+])[': DD_PLUS,
}
# HDR label chain: replacing 'HDR10' first and 'HDR' last re-wrote the HDR¹⁰ it had
# just produced ("🌟 🌟 HDR¹⁰", "✨ 🌟 HDR¹⁰⁺"). Replace 'HDR' first, then finish the
# HDR10+ / HDR10 labels from that output, so nothing is replaced twice.
HDR_OLD = "replace('HDR10+','✨ HDR¹⁰⁺')::replace('HDR10','🌟 HDR¹⁰')::replace('HLG','🌤️ HLG')::replace('HDR','🌟 HDR')"
HDR_NEW = "replace('HDR','🌟 HDR')::replace('🌟 HDR10+','✨ HDR¹⁰⁺')::replace('🌟 HDR10','🌟 HDR¹⁰')::replace('HLG','🌤️ HLG')"
REPLACEMENTS[HDR_OLD] = HDR_NEW
# The same chain in files that store emoji as JSON \u escapes.
REPLACEMENTS[json.dumps(HDR_OLD)[1:-1]] = json.dumps(HDR_NEW)[1:-1]
NOTE = ('Stream-card badges for elite release groups, HDR, IMAX, Hybrid and DD+ show again '
        '(their checks were written as regex, which the AIOStreams formatter never evaluates), '
        'and HDR10 / HDR10+ labels no longer show a doubled star.')
DATE = '2026-11-25'


def fix(text):
    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)
    return text


def main():
    changed = []
    for path in sorted(glob.glob('Formatters/*.json')):
        raw = open(path, encoding='utf-8').read()
        new = fix(raw)
        if new != raw:
            json.loads(new)
            open(path, 'w', encoding='utf-8').write(new)
            changed.append(path)
    for path in sorted(glob.glob('Templates/**/*.json', recursive=True)):
        if '/Legacy/' in path or '/Deprecated/' in path:
            continue
        raw = open(path, encoding='utf-8').read()
        new = fix(raw)
        if new == raw:
            continue
        data = json.loads(new)
        meta = data.get('metadata') if isinstance(data, dict) else None
        if isinstance(meta, dict) and isinstance(meta.get('version'), str):
            parts = meta['version'].split('.')
            parts[-1] = str(int(parts[-1]) + 1)
            meta['version'] = '.'.join(parts)
            if isinstance(meta.get('changelog'), list):
                meta['changelog'].insert(0, {'date': DATE, 'version': meta['version'], 'content': NOTE})
            new = json.dumps(data, indent=2, ensure_ascii=False) + ('\n' if raw.endswith('\n') else '')
        open(path, 'w', encoding='utf-8').write(new)
        changed.append(path)
    left_hdr = [p for p in glob.glob('Formatters/*.json') + glob.glob('Templates/**/*.json', recursive=True)
                if '/Legacy/' not in p and '/Deprecated/' not in p and HDR_OLD in json.dumps(json.load(open(p, encoding='utf-8')), ensure_ascii=False)]
    left = left_hdr + [p for p in glob.glob('Formatters/*.json') + glob.glob('Templates/**/*.json', recursive=True)
            if '/Legacy/' not in p and '/Deprecated/' not in p and '::~(?i)' in open(p, encoding='utf-8').read()]
    for p in changed:
        print('fixed', p)
    if left:
        print('still has ::~(?i):', *left, sep='\n  ')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
