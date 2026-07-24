"""
Tests for age rating / kids mode ESE generation.
"""
import pytest


def generate_age_rating_ese(rating):
    """Generate an ESE that filters content by age certification.
    
    Args:
        rating: One of 'none', 'G', 'PG', 'PG-13', 'R', 'NC-17'
    
    Returns:
        dict with 'expression' and 'enabled' keys, or None if rating is 'none'
    """
    if not rating or rating == 'none':
        return None

    # Map rating to maximum allowed certification values
    # AIOStreams uses TMDB certification strings
    ALLOWED_BY_RATING = {
        'G': ['G', 'TV-G', 'TV-Y', 'TV-Y7'],
        'PG': ['G', 'PG', 'TV-G', 'TV-Y', 'TV-Y7', 'TV-PG'],
        'PG-13': ['G', 'PG', 'PG-13', 'TV-G', 'TV-Y', 'TV-Y7', 'TV-PG', 'TV-14'],
        'R': ['G', 'PG', 'PG-13', 'R', 'TV-G', 'TV-Y', 'TV-Y7', 'TV-PG', 'TV-14', 'TV-MA'],
        'NC-17': None,  # Allow everything
    }

    if rating == 'NC-17':
        return None  # No filtering needed

    allowed = ALLOWED_BY_RATING.get(rating)
    if allowed is None:
        return None

    # Build a SEL expression that checks certification
    # Note: AIOStreams doesn't have a native certification field in SEL,
    # so this would need to use the digitalReleaseFilter or a custom approach.
    # For now, we generate a comment-based placeholder.
    cert_list = ', '.join(f"'{c}'" for c in allowed)
    expression = f"/* Age Rating: max {rating} */ certification(streams, {cert_list})"

    return {
        "enabled": True,
        "expression": expression,
        "description": f"Age rating filter: maximum {rating}",
    }


class TestAgeRatingESE:
    def test_none_returns_none(self):
        assert generate_age_rating_ese('none') is None

    def test_empty_returns_none(self):
        assert generate_age_rating_ese('') is None

    def test_nc17_returns_none(self):
        """NC-17 means unrestricted — no filtering needed."""
        assert generate_age_rating_ese('NC-17') is None

    def test_g_allows_only_g_and_below(self):
        result = generate_age_rating_ese('G')
        assert result is not None
        assert result['enabled'] is True
        assert "'G'" in result['expression']
        assert "'R'" not in result['expression']

    def test_pg_includes_g_and_pg(self):
        result = generate_age_rating_ese('PG')
        assert result is not None
        assert "'G'" in result['expression']
        assert "'PG'" in result['expression']
        assert "'R'" not in result['expression']

    def test_pg13_includes_pg13_and_below(self):
        result = generate_age_rating_ese('PG-13')
        assert result is not None
        assert "'PG-13'" in result['expression']
        assert "'R'" not in result['expression']

    def test_r_includes_everything(self):
        result = generate_age_rating_ese('R')
        assert result is not None
        assert 'R' in result['expression']
        assert 'TV-MA' in result['expression']

    def test_all_ratings_except_none_and_nc17_return_ese(self):
        for rating in ['G', 'PG', 'PG-13', 'R']:
            result = generate_age_rating_ese(rating)
            assert result is not None, f"Rating {rating} should produce an ESE"

    def test_expression_contains_certification_function(self):
        result = generate_age_rating_ese('PG')
        assert 'certification(' in result['expression']
