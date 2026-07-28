#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const load = (rel) => JSON.parse(read(rel));
const requireCondition = (condition, message) => { if (!condition) throw new Error(message); };

function loadRuntime(windowObject, rel) {
  global.window = windowObject;
  vm.runInThisContext(read(rel));
}

function render(slug) {
  const root = { innerHTML: '', classList: { add() {} } };
  const style = { setProperty() {} };
  const windowObject = {
    location: { search: `?club=${slug}` },
    CPI_CLUBS: load('clubs.json'),
    CPI_RANKINGS: load('rankings.json'),
  };
  global.document = {
    title: '',
    documentElement: { style },
    querySelector(selector) {
      if (selector === '#clubProfileApp') return root;
      if (selector === '.club-profile-page') return { style };
      return null;
    },
  };
  loadRuntime(windowObject, 'data/tournaments/jo-profile-runtime.js');
  loadRuntime(windowObject, 'data/tournaments/history/runtime.js');
  vm.runInThisContext(read('js/club-profile-v7-53-0.js'));
  return root.innerHTML;
}

const kern = render('kern-premier');
for (const token of ['Kern Premier', 'Competitive snapshot', '4 ranked teams', '5 JO teams', '#36', 'Teams by age group', '2026 Junior Olympics', 'Partner with WPI']) {
  requireCondition(kern.includes(token), `Kern Premier render missing ${token}`);
}
for (const group of ['12U Boys', '14U Boys', '16U Boys', '18U Boys', '18U Girls']) {
  requireCondition(kern.includes(group), `Kern Premier render missing ${group}`);
}
requireCondition(kern.includes('Visit club website'), 'Kern Premier website action missing');
requireCondition(!kern.includes('No ranked team yet'), 'Kern Premier incorrectly renders as unranked');

const mission = render('mission');
for (const token of ['Mission WPC', '8 ranked teams', '#1 Mission A', 'Additional tournament history', 'Recent connected results', 'never influences WPI rankings']) {
  requireCondition(mission.includes(token), `Mission render missing ${token}`);
}

const noSite = render('99-alliance');
requireCondition(noSite.includes('99 Alliance'), '99 Alliance profile missing');
requireCondition(!noSite.includes('Visit club website'), 'No-site club received a website action');
requireCondition(noSite.includes('Digital presence'), 'No-site club lacks adaptive overview');

console.log('CLUB PROFILE RENDER 7.53.0 TESTS PASSED');
console.log(' - Kern Premier renders four ranked teams, five JO teams, and tournament history');
console.log(' - Mission renders a deep ranked portfolio plus additional event history');
console.log(' - Clubs without a public website adapt without a broken action');
