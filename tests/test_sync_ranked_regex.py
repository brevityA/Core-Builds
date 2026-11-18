"""scripts/sync_ranked_regex.py derivation rules (pure; no network).

Hosts compare the whole /pattern/flags string. On 2026-10-22 Vidhin05 dropped the
/i flag from FLUX; the sync compared bodies only, so every copy kept /i, --check
passed, and allowlisted hosts refused every build carrying FLUX.
"""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sync_ranked_regex', ROOT / 'scripts' / 'sync_ranked_regex.py')
srr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(srr)


def e(name, pattern):
    return {'name': name, 'pattern': pattern, 'score': 0}


def sync(items, old, new):
    old_map = srr.build_old_map(old)
    new_lookup, _ = srr.build_new_lookup(new)
    new_norm_set = {srr.norm(x['pattern']) for x in new}
    changes = set()
    touched = srr.sync_list(items, old_map, new_lookup, new_norm_set, new, changes)
    return touched, changes


def test_flags_only_change_is_synced():
    items = [{'name': 'FLUX', 'pattern': '/\\b(FLUX)\\b/i', 'score': 20}]
    touched, changes = sync(items, [e('FLUX', '/\\b(FLUX)\\b/i')], [e('FLUX', '/\\b(FLUX)\\b/')])
    assert touched and changes == {'FLUX'}
    assert items[0]['pattern'] == '/\\b(FLUX)\\b/'
    assert items[0]['score'] == 20, 'only the pattern text is refreshed'


def test_unchanged_pattern_is_left_alone():
    items = ['/\\b(FLUX)\\b/']
    touched, _ = sync(items, [e('FLUX', '/\\b(FLUX)\\b/')], [e('FLUX', '/\\b(FLUX)\\b/')])
    assert not touched and items == ['/\\b(FLUX)\\b/']


def test_check_needs_exact_wrapped_match_but_body_for_unwrapped():
    new = [e('FLUX', '/\\b(FLUX)\\b/')]
    exact = {x['pattern'] for x in new}
    norms = {srr.norm(x['pattern']) for x in new}
    assert srr.in_snapshot('/\\b(FLUX)\\b/', exact, norms)
    assert not srr.in_snapshot('/\\b(FLUX)\\b/i', exact, norms), 'a stale flag is a stale copy'
    assert srr.in_snapshot('\\b(FLUX)\\b', exact, norms), 'an unwrapped body has no flags to differ'


def test_every_generator_const_is_in_scope():
    # PREFERRED_REGEX_1080P and packages/core were outside the sync until 2026-10-22.
    assert 'PREFERRED_REGEX_1080P' in srr.APP_CONST_NAMES
    assert any(p.name == 'generate-template.js' for p, _, _ in srr.JS_EMBEDS)
