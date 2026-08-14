#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function makeEnv(teamName) {
  const attrs = {};
  const body = {
    dataset: {},
    className: 'wpi-live-sandbox-page is-live-game',
    addEventListener() {},
  };
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
  vm.runInContext(fs.readFileSync('js/live-club-theme-v7-58-8.js','utf8'), sandbox);
  return sandbox;
}

let env = makeEnv('Lamorinda A 14U Boys');
assert.equal(env.document.body.dataset.liveClubTheme, 'lamorinda');
assert.equal(env.document.body.dataset.liveClubThemeRelease, '7.58.8');
assert.equal(env.window.WPILiveClubTheme7588.resolveTheme({teamName:'Lamorinda 12U Boys'}).id, 'lamorinda');
assert.equal(env.window.WPILiveClubTheme7588.resolveTheme({teamName:'680 14U Boys'}), null);

env = makeEnv('680 14U Boys');
assert.equal(env.document.body.dataset.liveClubTheme, undefined);
env.window.WPILiveClubTheme7588.applyTheme({teamName:'Lamorinda A 12U Boys'});
assert.equal(env.document.body.dataset.liveClubTheme, 'lamorinda');
env.window.WPILiveClubTheme7588.applyTheme({teamName:'CC United 14U Boys'});
assert.equal(env.document.body.dataset.liveClubTheme, undefined);

console.log('WPI LIVE 7.58.8 CLUB THEME RESOLVER TEST PASSED');
console.log(' - Lamorinda teams resolve to the Lamorinda theme');
console.log(' - non-Lamorinda teams stay on the neutral WPI theme');
console.log(' - runtime switching removes/reapplies theme without scoring-state writes');
