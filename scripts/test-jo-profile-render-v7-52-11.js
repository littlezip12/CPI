#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function loadJson(rel) { return JSON.parse(read(rel)); }
function loadRuntime(targetWindow) {
  global.window = targetWindow;
  vm.runInThisContext(read('data/tournaments/jo-profile-runtime.js'));
}

function renderTeam() {
  const root = { innerHTML: '' };
  const style = { setProperty() {} };
  const targetWindow = {
    location: { search: '?team=kern-premier-12u-boys', href: 'http://wpi/team.html?team=kern-premier-12u-boys' },
    CPI_RANKINGS: [],
    CPI_CLUBS: loadJson('clubs.json'),
    CPI_TOURNAMENT_EVIDENCE: { teams: {} },
    CPI_HISTORICAL_PROFILES: { teams: {} },
  };
  global.document = {
    querySelector(selector) {
      if (selector === '#teamProfile') return root;
      if (selector === '.team-profile-page') return { style };
      return null;
    },
    documentElement: { style },
  };
  loadRuntime(targetWindow);
  vm.runInThisContext(read('js/team-profile-v7-42.js'));
  for (const token of ['Kern Premier', 'Verified tournament result', '41st', '3-4', 'View complete JO game journey']) {
    requireCondition(root.innerHTML.includes(token), `Kern Premier team render missing ${token}`);
  }
  requireCondition(!root.innerHTML.includes('Team not found'), 'Kern Premier tournament profile rendered as not found');
}

function renderClub() {
  const root = { innerHTML: '' };
  const style = { setProperty() {} };
  const targetWindow = {
    location: { search: '?club=kern-premier', href: 'http://wpi/club.html?club=kern-premier' },
    CPI_RANKINGS: [],
    CPI_CLUBS: loadJson('clubs.json'),
    CPI_HISTORICAL_PROFILES: { clubs: {} },
  };
  global.document = {
    querySelector(selector) {
      if (selector === '#clubProfileApp') return root;
      if (selector === '.club-profile-page') return { style };
      return null;
    },
    documentElement: { style, dataset: {} },
    title: '',
  };
  loadRuntime(targetWindow);
  vm.runInThisContext(read('js/club-intelligence-v7-26.js'));
  for (const token of ['Kern Premier', 'Teams and final results', '12U Boys', '14U Boys', '16U Boys', '18U Boys', '18U Girls', '5 JO teams']) {
    requireCondition(root.innerHTML.includes(token), `Kern Premier club render missing ${token}`);
  }
}

renderTeam();
renderClub();
console.log('JO PROFILE RENDER 7.52.11 TESTS PASSED');
console.log(' - Kern Premier 12U Boys renders as a tournament-only team profile');
console.log(' - Kern Premier club page renders all five linked JO teams');
