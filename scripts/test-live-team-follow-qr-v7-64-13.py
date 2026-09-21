from pathlib import Path

root=Path(__file__).resolve().parents[1]
version=(root/'VERSION.md').read_text()
following=(root/'live-following.html').read_text()
following_js=(root/'js/live-following-v7-64-13.js').read_text()
login=(root/'live-login.html').read_text()
login_js=(root/'js/live-login-v7-64-13.js').read_text()
dashboard=(root/'live-dashboard.html').read_text()
share_js=(root/'js/live-team-share-v7-64-13.js').read_text()
css=(root/'css/live-following-v7-64-13.css').read_text()

assert version.startswith('# WPI 7.64.13 — Team Follow & QR Onboarding')
assert 'live-following-v7-64-13.js?v=7.64.13' in following
assert 'live-team-share-v7-64-13.js?v=7.64.13' in following
assert '+ Add another team' in following
assert '<h2>Find your team</h2>' in following
assert 'id="followSignInLink"' in following
assert 'Team Stats' in following_js
assert 'hasFilter?filtered.slice(0,60):[]' in following_js
assert 'followTeam' in following_js
assert 'backend.setTeamFollow(teamId,true)' in following_js
assert 'live-login-v7-64-13.js?v=7.64.13' in login
assert 'followTeam' in login_js
assert 'followingTarget()' in login_js
assert 'id="openTeamShareButton"' in dashboard
assert 'live-team-share-v7-64-13.js?v=7.64.13' in dashboard
assert 'live-following.html' in share_js and 'followTeam' in share_js
assert 'Download QR' in share_js and 'Copy link' in share_js and 'Print' in share_js
assert 'window.QRCode' in share_js
assert 'wpi-share-dialog' in css
print('WPI Live 7.64.13 Team Follow + QR onboarding checks passed.')
