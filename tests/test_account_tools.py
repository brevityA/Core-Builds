from pathlib import Path

HTML = Path('account-tools/index.html').read_text()

def test_account_tool_has_api_endpoints():
    assert 'addonCollectionGet' in HTML
    assert 'addonCollectionSet' in HTML

def test_account_tool_clears_password_and_exports_backup():
    assert "$('password').value=''" in HTML
    assert 'stremio-backup-' in HTML

def test_account_tool_has_mutation_controls():
    assert 'undoBtn' in HTML
    assert 'restoreBtn' in HTML
    assert 'data-move' in HTML

def test_account_tool_has_undo_history_limit():
    assert 'undoStack.length>10' in HTML
