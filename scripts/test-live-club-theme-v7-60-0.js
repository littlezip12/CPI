#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function styleStub(){
  const values = {};
  return {
    values,
    setProperty(name, value){ values[name]=String(value); },
    removeProperty(name){ delete values[name]; }
  };
}
function makeEnv(teamName, clubName='', clubId='') {
  const body = {
    dataset: {},
    className: 'wpi-live-sandbox-page is-live-game',
    style: styleStub(),
    addEventListener() {},
  };
  if (clubName) body.dataset.liveClubName = clubName;
  if (clubId) body.dataset.liveClubId = clubId;
  const elements = {
    teamName: { value: teamName, addEventListener() {} },
    scoreTeamName: { textContent: teamName }
  };
  class MutationObserver { constructor(cb){this.cb=cb;} observe(){} }
  const document = {
    body,
    readyState: 'complete',
    getElementById(id){ return elements[id] || null; },
    addEventListener() {}
  };
  const window = { MutationObserver };
  const sandbox = { window, document, MutationObserver, console };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('js/live-club-theme-registry-v7-60-0.js','utf8'), sandbox);
  vm.runInContext(fs.readFileSync('js/live-club-theme-v7-60-0.js','utf8'), sandbox);
  return sandbox;
}

let env = makeEnv('Lamorinda A 14U Boys');
assert.equal(env.document.body.dataset.liveClubTheme, 'active');
assert.equal(env.document.body.dataset.liveClubThemeId, 'lamorinda');
assert.equal(env.document.body.dataset.liveClubThemeClubId, 'club-lamorinda');
assert.equal(env.document.body.dataset.liveClubThemeRelease, '7.60.0');
assert.equal(env.document.body.dataset.liveClubThemeState, 'enabled');
assert.equal(env.document.body.style.values['--club-primary'], '#082F61');
assert.equal(env.document.body.style.values['--club-accent'], '#E0B83F');
assert.ok(env.document.body.style.values['--club-logo-image'].includes('lamorinda.webp'));
assert.equal(env.window.WPILiveClubTheme7600.counts.canonicalClubs, 182);
assert.equal(env.window.WPILiveClubTheme7600.counts.liveEnabled, 1);

// Known canonical clubs are not silently activated.
env = makeEnv('680 A 14U Boys');
assert.equal(env.document.body.dataset.liveClubTheme, undefined);
assert.equal(env.document.body.dataset.liveClubIdentityMatch, 'club-680');
assert.equal(env.document.body.dataset.liveClubThemeState, 'known-not-enabled');
assert.equal(env.window.WPILiveClubTheme7600.resolveTheme({teamName:'680 A 14U Boys'}), null);

// Longest canonical identity wins: Brentwood must never fall through to Lamorinda.
env = makeEnv('Lamorinda Brentwood 14U Boys');
assert.equal(env.document.body.dataset.liveClubTheme, undefined);
assert.equal(env.document.body.dataset.liveClubIdentityMatch, 'club-lamorinda-brentwood');
assert.equal(env.document.body.dataset.liveClubThemeState, 'known-not-enabled');

// Stable canonical club ID wins over display text when supplied by future club onboarding.
env = makeEnv('Whatever Team Label', '', 'club-lamorinda');
assert.equal(env.document.body.dataset.liveClubThemeClubId, 'club-lamorinda');
assert.equal(env.document.body.dataset.liveClubTheme, 'active');

// Runtime switching clears the active theme and variables rather than leaking brand state.
env.window.WPILiveClubTheme7600.applyTheme({teamName:'Unknown Polo 14U Boys'});
assert.equal(env.document.body.dataset.liveClubTheme, undefined);
assert.equal(env.document.body.dataset.liveClubThemeState, 'unmatched');
assert.equal(env.document.body.style.values['--club-primary'], undefined);

console.log('WPI LIVE 7.60.0 CLUB BRANDING PLATFORM RESOLVER TEST PASSED');
console.log(' - canonical club registry is synchronous/offline-safe');
console.log(' - Lamorinda remains the only Live-enabled production theme');
console.log(' - known non-enabled clubs stay on neutral WPI styling');
console.log(' - Lamorinda Brentwood remains a distinct identity and does not inherit Lamorinda theme');
console.log(' - canonical club IDs can drive future self-service club branding safely');
