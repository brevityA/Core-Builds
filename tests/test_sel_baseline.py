import json
from pathlib import Path

ROOT = Path(__file__).parents[1]
BASELINE = ROOT / 'configurator/data/sel-baseline.json'


def test_sel_baseline_covers_required_architecture_fixtures():
    data = json.loads(BASELINE.read_text())
    assert set(data['targets']) >= {
        'standard', 'standard-4k', 'iqr', 'apex-mixed',
        'mixed-standard', 'mixed-apex-mixed'
    }
    for target in data['targets'].values():
        assert target['hash']
        assert target['policy']['preferredStreamExpressions']
        assert target['policy']['resultLimits']


def test_sel_baseline_fixture_paths_exist():
    data = json.loads(BASELINE.read_text())
    for target in data['targets'].values():
        assert (ROOT / target['fixture']).exists()
