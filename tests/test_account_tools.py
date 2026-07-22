from pathlib import Path

HTML = Path('account-tools/index.html').read_text()

def test_account_tool_is_read_only():
    assert 'addonCollectionGet' in HTML
    assert 'addonCollectionSet' not in HTML
    assert 'cannot change your account' in HTML

def test_account_tool_clears_password_and_exports_backup():
    assert "$('password').value=''" in HTML
    assert 'core-account-addons-backup.json' in HTML
    assert 'Local backup preview' in HTML
