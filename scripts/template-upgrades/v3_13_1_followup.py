#!/usr/bin/env python3
"""Template suite 3.13.1 — two follow-ups to 3.13. Idempotent; run from the repo root.

1. SDR-first lines no longer score Dolby Vision. 3.13 dropped their HDR bonus but left DV at
   +120, which sits ahead of visualTag in the sort and so still ranked DV above SDR.
2. The hand-tuned Templates/Personal set gets the 3.13 changes that fit its different shape.
   Three of its own rules emptied the list for older shows: a 512 MB-1 GB episode floor, a
   hard kill on untagged ("Unknown") resolution, and an unconditional low-seeder cull.
"""
import glob, json, subprocess, sys

DATE = '2026-11-15'
DRY = '--dry-run' in sys.argv
POLICY = 'configurator/src/core/ranked-sel-policy.js'
ALL_RES = ['2160p', '1440p', '1080p', '720p', '576p', '480p', '360p', '240p', '144p', 'Unknown']
SD_MARK = '/* CB | SD Fallback'
FLOOD_GATE = 'count(cached(streams)) >= 10 ? '
SERIES_MIN = 31457280
SEED_GATE = 'count(cached(streams)) >= 5 ? '


def expr(e):
    return e['expression'] if isinstance(e, dict) else e


def bump(v):
    a = v.split('.'); a[-1] = str(int(a[-1]) + 1); return '.'.join(a)


def ranked(resolution, dv, limited_audio, hdr):
    js = (f"import('./{POLICY}').then(m=>process.stdout.write(JSON.stringify("
          f"m.rankedSelPolicy({{resolution:{json.dumps(resolution)}}},{{dv:{str(dv).lower()},limitedAudio:{str(limited_audio).lower()}}}))))")
    out = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js]))
    return out if hdr else [e for e in out if '/* RSE HDR */' not in e['expression']]


def save(f, raw, d, notes, done):
    m = d['metadata']
    m['version'] = bump(m['version'])
    m.setdefault('changelog', []).insert(0, {'date': DATE, 'version': m['version'], 'content': '; '.join(notes) + '.'})
    print('OK  ', f, m['version'], done)
    if not DRY:
        indent = 2 if '\n  "' in raw[:200] else 4
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(json.dumps(d, indent=indent, ensure_ascii=False) + ('\n' if raw.endswith('\n') else ''))


# 1. Fleet: no DV score on SDR-first lines.
for f in sorted(f for f in glob.glob('Templates/Torbox/**/*.json', recursive=True)
                if '/Deprecated/' not in f and '/Nightly/' not in f):
    raw = open(f, encoding='utf-8').read(); d = json.loads(raw); c = d['config']
    rse = c.get('rankedStreamExpressions') or []
    if (c.get('preferredVisualTags') or [''])[0] == 'SDR' and any('/* RSE Dolby Vision */' in expr(e) for e in rse):
        c['rankedStreamExpressions'] = [e for e in rse if '/* RSE Dolby Vision */' not in expr(e)]
        save(f, raw, d, ['Dolby Vision no longer earns a score on this SDR-first line (it outranked SDR, like the HDR bonus removed in the last version)'], ['dv score off'])

# 2. Personal set.
for f in sorted(glob.glob('Templates/Personal/*.json')):
    raw = open(f, encoding='utf-8').read(); d = json.loads(raw); c = d['config']
    eses = c.get('excludedStreamExpressions', [])
    done, notes = [], []

    # Untagged releases are most of what exists for DVD-era shows; they become a fallback instead.
    for e in eses:
        if isinstance(e, dict) and e['expression'].startswith('/*Hard 4K Kill*/') and ", 'Unknown'" in e['expression']:
            e['expression'] = e['expression'].replace(", 'Unknown'", ''); done.append('unknown unkilled')

    req = c.get('requiredResolutions') or []
    if req and not any(expr(e).startswith(SD_MARK) for e in eses):
        excl = [r for r in (c.get('excludedResolutions') or []) if r != '360p']
        excl += [r for r in ('144p', '240p') if r not in excl]
        hd_only = '2160p' not in req
        fallback = [r for r in ALL_RES if r not in req and r not in excl and not (hd_only and r in ('2160p', '1440p'))]
        q = lambda rs: ','.join(f"'{r}'" for r in rs)
        at = next((i for i, e in enumerate(eses) if 'Late Pack Fallback' in expr(e)), len(eses))
        eses.insert(at, {'enabled': True, 'expression':
            f"{SD_MARK} — SD and untagged releases only when fewer than 5 cached {'/'.join(req)} remain */ "
            f"count(cached(resolution(streams,{q(req)}))) >= 5 ? negate(merge(library(streams),seadex(streams)),resolution(streams,{q(fallback)})) : []"})
        c['requiredResolutions'] = []; c['excludedResolutions'] = excl
        done.append('sd fallback'); notes.append('SD and untagged releases now fill in when fewer than five cached HD results exist, instead of being removed outright (older shows such as Arthur returned nothing)')

    # Lower the global episode floor for SD, but keep the old floor where it was aimed: HD files.
    size = c.setdefault('size', {}); g = (size.get('global') or {}).get('series')
    if isinstance(g, list) and g and (g[0] or 0) > SERIES_MIN:
        old = g[0]; per = size.setdefault('resolution', {})
        for r in ('2160p', '1440p', '1080p'):
            per.setdefault(r, {}).setdefault('series', [old, g[1]])
        per.setdefault('720p', {}).setdefault('series', [157286400, g[1]])
        g[0] = SERIES_MIN
        done.append('size floor'); notes.append(f'episode size floor is 30 MB for SD and untagged files and 150 MB at 720p; 1080p and above keep the old {old // 1048576} MB floor')

    for e in eses:
        if not isinstance(e, dict): continue
        x = e['expression']
        if x.startswith('/*Low Seeders Uncached*/') and SEED_GATE not in x:
            e['expression'] = '/*Low Seeders Uncached*/ ' + SEED_GATE + x[len('/*Low Seeders Uncached*/'):].strip() + ' : []'
            done.append('seeder gate'); notes.append('the low-seeder cull on uncached results waits for five cached results (it removed every uncached copy of niche titles, including ones with no seeder count)')
        if x.startswith('/*Per-Addon Flood Guard*/') and FLOOD_GATE not in x:
            y = x.replace("cached(streams)),'Comet'),5)", "cached(streams)),'Comet'),10)").replace("cached(streams)),'Meteor'),5)", "cached(streams)),'Meteor'),3)")
            e['expression'] = y.replace('/*Per-Addon Flood Guard*/ merge(', '/*Per-Addon Flood Guard*/ ' + FLOOD_GATE + 'merge(', 1) + ' : []'
            done.append('flood gate'); notes.append('per-add-on caps (Comet 5→10, Meteor 5→3) apply only once 10 cached results exist')

    # Scores: the one existing entry compared a bare variable and matched nothing.
    rse = c.get('rankedStreamExpressions') or []
    if not any('/* RSE ' in expr(e) for e in rse):
        for e in rse:
            if isinstance(e, dict) and e['expression'].startswith("releaseGroup == "):
                groups = [p.split("'")[1] for p in e['expression'].split(' or ')]
                e['expression'] = '/* Personal favourite groups */ releaseGroup(streams,' + ','.join(f"'{g_}'" for g_ in groups) + ')'
        name = f.lower(); res = '4k' if '4k' in name else '1080p'
        vt = c.get('excludedVisualTags', []); sdr_first = (c.get('preferredVisualTags') or [''])[0] == 'SDR'
        c['rankedStreamExpressions'] = rse + ranked(res, 'DV' not in vt and not sdr_first, 'TrueHD' in c.get('excludedAudioTags', []), 'HDR' not in vt and not sdr_first)
        for scope, keys in (c.get('sortCriteria') or {}).items():
            names = [k['key'] for k in keys]
            anchor = 'streamExpressionMatched' if 'streamExpressionMatched' in names else 'quality'
            if 'streamExpressionScore' not in names and anchor in names:
                keys.insert(names.index(anchor) + 1, {'key': 'streamExpressionScore', 'direction': 'desc'})
        done.append('ranked'); notes.append('ranked expressions score resolution, source, audio and release group, and the favourite-groups entry is rewritten so it matches')

    if done:
        save(f, raw, d, notes, done)
    else:
        print('SKIP', f)
