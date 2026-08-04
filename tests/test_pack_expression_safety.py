"""Regression coverage for episode-pack availability policy."""

from validate_templates import validate_template


def test_legacy_pack_ese_is_a_validation_error(write_template, base_template):
    path = write_template(base_template(excludedStreamExpressions=[{
        "enabled": True,
        "expression": "/* CB | Kill Multi-Episode When Singles Exist */ (queryType == 'series') ? multiEpisode(streams) : []",
    }]))
    errors, _, _ = validate_template(path)
    assert any("legacy destructive pack ESE" in error for error in errors)


def test_late_pack_fallback_is_allowed(write_template, base_template):
    path = write_template(base_template(excludedStreamExpressions=[{
        "enabled": True,
        "expression": "/* CB | Late Pack Fallback — hide multi-episode files only when 3 playable singles remain */ (queryType == 'series' and not isAnime and count(negate(merge(multiEpisode(streams),seasonPack(streams,'seasonPack')),streams)) >= 3) ? multiEpisode(streams) : []",
    }]))
    errors, _, _ = validate_template(path)
    assert not any("legacy destructive pack ESE" in error for error in errors)
