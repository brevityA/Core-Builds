#!/usr/bin/env python3
"""Template suite 3.13 — right file first, faster to play, more uncached, better add-ons.

Idempotent: each change checks for its own marker and reports a skip instead of applying twice.
Run from the repo root:  python3 scripts/template-upgrades/v3_13_smarter.py [--dry-run]

Ranked expressions are produced by the configurator's own `rankedSelPolicy` (via node), so the
static fleet and generated configs score streams the same way.
"""
import glob, json, re, subprocess, sys

DATE = '2026-11-14'
DRY = '--dry-run' in sys.argv
CACHED_ONLY = ('/Flash/', '/Speed/TorBox/')  # instant-play lines: no uncached reserve by design
TIME_EXIT = ' or (totalTimeTaken >= 4500 and count(cached(totalStreams)) >= 5)'
UNCACHED = "type(uncached(streams),'debrid')"
# slice(x, 4) returns x minus its first four, so the quota now spares four uncached debrid results
# in every branch instead of none. Same shape as the quota's own last branch (slice(..., 6)); a
# seeders/perGroup reserve was tried first and pushed the expression past the 3,000-char host limit.
RESERVE = "slice(" + UNCACHED + ",4)"
POLICY = 'configurator/src/core/ranked-sel-policy.js'
FLOOD_GATE = 'count(cached(streams)) >= 10 ? '
ALL_RES = ['2160p', '1440p', '1080p', '720p', '576p', '480p', '360p', '240p', '144p', 'Unknown']
SD_MARK = '/* CB | SD Fallback'
SERIES_MIN = 31457280  # 30 MB: an 11-minute DVD-era kids' segment is often 50-150 MB


def ranked(resolution, dv, limited_audio, hdr):
    js = (f"import('./{POLICY}').then(m=>process.stdout.write(JSON.stringify("
          f"m.rankedSelPolicy({{resolution:{json.dumps(resolution)}}},{{dv:{str(dv).lower()},limitedAudio:{str(limited_audio).lower()}}}))))")
    out = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js]))
    if not hdr:
        out = [e for e in out if '/* RSE HDR */' not in e['expression']]
    return out


def expr(e):
    return e['expression'] if isinstance(e, dict) else e


def set_expr(lst, i, value):
    if isinstance(lst[i], dict):
        lst[i]['expression'] = value
    else:
        lst[i] = value


def bump(v):
    a = v.split('.')
    a[-1] = str(int(a[-1]) + 1)
    return '.'.join(a)


files = sorted(f for f in glob.glob('Templates/Torbox/**/*.json', recursive=True)
               if '/Deprecated/' not in f and '/Nightly/' not in f)
for f in files:
    raw = open(f, encoding='utf-8').read()
    d = json.loads(raw)
    c = d['config']
    done, skipped = [], []

    # 1. Add-ons — Comet carries most unique results, Meteor the fewest.
    eses = c.get('excludedStreamExpressions', [])
    for i, e in enumerate(eses):
        x = expr(e)
        if x.startswith('/*Per-Addon Flood Guard*/'):
            y = x.replace("cached(streams)),'Comet'),5)", "cached(streams)),'Comet'),10)")
            y = y.replace("cached(streams)),'Meteor'),5)", "cached(streams)),'Meteor'),3)")
            # Caps only matter when cached results are plentiful. On an older or niche title nearly
            # everything is uncached, and capping it per add-on throws away the only copies there are.
            if FLOOD_GATE not in y:
                y = y.replace('/*Per-Addon Flood Guard*/ merge(', '/*Per-Addon Flood Guard*/ ' + FLOOD_GATE + 'merge(', 1)
                if FLOOD_GATE in y:
                    y += ' : []'
            if y != x:
                set_expr(eses, i, y); done.append('flood caps')
    for p in c.get('presets', []):
        if p.get('type') == 'meteor' and (p.get('options', {}).get('timeout') or 0) > 4000:
            p['options']['timeout'] = 4000; done.append('meteor timeout')

    # 2. More uncached — keep a well-seeded HD reserve instead of dropping every uncached debrid result.
    for i, e in enumerate(eses):
        x = expr(e)
        if x.startswith('/*Final Limit — Resolution Quota*/'):
            if any(s in f for s in CACHED_ONLY):
                skipped.append('quota (cached-only line)')
            elif RESERVE in x:
                skipped.append('quota (already)')
            else:
                y = x.replace('merge(' + UNCACHED + ', ', 'merge(' + RESERVE + ', ')
                if y != x:
                    set_expr(eses, i, y); done.append('uncached reserve')

    # 1b. Zilean only searches debrid caches; with no debrid service enabled AIOStreams refuses the
    # whole save ("Zilean requires at least one usable service"). Found by adding the static fleet
    # to the save test: Speed EasyNews ships EasyNews-only with Zilean on.
    DEBRID = {'torbox', 'realdebrid', 'alldebrid', 'premiumize', 'debridlink', 'offcloud', 'easydebrid', 'pikpak', 'seedr', 'debrider'}
    if not any(sv.get('enabled') and sv.get('id') in DEBRID for sv in c.get('services', [])):
        for p in c.get('presets', []):
            if p.get('type') == 'zilean' and p.get('enabled'):
                p['enabled'] = False; done.append('zilean off')

    # 2b. Older and niche shows — a probe of public scrapers found Arthur S01E01 with 13 results,
    # all SD or untagged and 10 under 200 MB: requiredResolutions and the size floor left zero.
    req = c.get('requiredResolutions') or []
    if req and not any(expr(e).startswith(SD_MARK) for e in eses):
        excl = [r for r in (c.get('excludedResolutions') or []) if r != '360p']
        hd_only = '2160p' not in req  # 1080p lines keep their hard 4K kill
        fallback = [r for r in ALL_RES if r not in req and r not in excl and not (hd_only and r in ('2160p', '1440p'))]
        q = lambda rs: ','.join(f"'{r}'" for r in rs)
        entry = {'enabled': True, 'expression': f"{SD_MARK} — SD and untagged releases only when fewer than 5 {'/'.join(req)} remain */ "
                 f"count(resolution(streams,{q(req)})) >= 5 ? negate(merge(library(streams),seadex(streams)),resolution(streams,{q(fallback)})) : []"}
        at = next((i for i, e in enumerate(eses) if 'Late Pack Fallback' in expr(e)), len(eses))
        eses.insert(at, entry)
        c['requiredResolutions'] = []
        c['excludedResolutions'] = excl
        done.append('sd fallback')
    g = ((c.get('size') or {}).get('global') or {}).get('series')
    if isinstance(g, list) and g and (g[0] or 0) > SERIES_MIN:
        g[0] = SERIES_MIN; done.append('series size floor')
    ym = c.get('yearMatching') or {}
    if ym.get('useInitialAirDate'):
        # Upstream then compares every file to the premiere year ±2, so a 2011-tagged season of a
        # show that began in 1996 is dropped. Off, it matches each season's own air years.
        ym['useInitialAirDate'] = False; done.append('season air years')

    # 3. Faster — stop waiting once 4.5 s have passed and five cached results are in hand.
    daf = c.get('dynamicAddonFetching') or {}
    cond = daf.get('condition') or ''
    if daf.get('enabled') and cond and 'totalTimeTaken' not in cond:
        daf['condition'] = cond + TIME_EXIT; done.append('time exit')

    # 4. Right file first — an additive score inside each PSE tier.
    name = f.lower()
    res = 'mixed' if 'mixed' in name else 'ultrawide' if 'ultrawide' in name else '4k' if ('4k' in name) else '1080p'
    vt = c.get('excludedVisualTags', [])
    dv_kill = any(isinstance(e, dict) and e.get('enabled') and 'DV-Only' in expr(e)[:80] for e in eses)
    dv = 'DV' not in vt and not dv_kill and res != 'ultrawide' and 'mobile' not in name
    limited = 'TrueHD' in c.get('excludedAudioTags', [])
    if c.get('rankedStreamExpressions'):
        skipped.append('ranked (already)')
    else:
        c['rankedStreamExpressions'] = ranked(res, dv, limited, 'HDR' not in vt); done.append(f'ranked x{len(c["rankedStreamExpressions"])}')
    for scope, keys in (c.get('sortCriteria') or {}).items():
        names = [k['key'] for k in keys]
        # After the PSE tier where there is one; otherwise (4K Apex sorts on resolution and quality
        # alone) after quality, so the score breaks ties inside a resolution and source.
        anchor = 'streamExpressionMatched' if 'streamExpressionMatched' in names else 'quality'
        if 'streamExpressionScore' in names or anchor not in names:
            continue
        keys.insert(names.index(anchor) + 1, {'key': 'streamExpressionScore', 'direction': 'desc'})
        done.append('sort:' + scope)

    if not done:
        print('SKIP', f, skipped); continue
    m = d['metadata']
    m['version'] = bump(m['version'])
    notes = ['Inline ranked expressions score resolution, source, HDR, audio and release group so the best file leads each tier'
             + ('' if dv else ' (Dolby Vision not scored on this device)')]
    if 'uncached reserve' in done: notes.append('the final limit now keeps four uncached results instead of dropping all of them when cached ones are plentiful')
    if 'time exit' in done: notes.append('add-on fetching stops after 4.5 s once five cached results are in')
    if 'sd fallback' in done: notes.append('SD and untagged releases now fill in when fewer than five HD results exist (older shows such as Arthur returned none)')
    if 'series size floor' in done: notes.append('episode size floor lowered to 30 MB for short SD episodes')
    if 'season air years' in done: notes.append('year matching uses each season\'s air years instead of the premiere year')
    if 'flood caps' in done: notes.append('per-add-on caps (Comet 5→10, Meteor 5→3) apply only once 10 cached results exist')
    if 'zilean off' in done: notes.append('Zilean disabled: it needs a debrid service, and AIOStreams refused this EasyNews-only template on save')
    if 'meteor timeout' in done: notes.append('Meteor timeout 6 s→4 s')
    m.setdefault('changelog', []).insert(0, {'date': DATE, 'version': m['version'], 'content': '; '.join(notes) + '.'})
    print('OK  ', f, m['version'], done, skipped)
    if not DRY:
        indent = 2 if '\n  "' in raw[:200] else 4
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(json.dumps(d, indent=indent, ensure_ascii=False) + ('\n' if raw.endswith('\n') else ''))
