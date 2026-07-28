const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const targetWindow = {
  location: { search: '?team=mission-16u-boys', href: 'https://example.test/team.html?team=mission-16u-boys' },
  CPI_RANKINGS: JSON.parse(read('rankings.json')),
  CPI_CLUBS: JSON.parse(read('clubs.json'))
};
global.window = targetWindow;
global.document = { querySelector: () => null };
global.URLSearchParams = URLSearchParams;

for (const rel of [
  'data/tournaments/evidence/runtime.js',
  'data/tournaments/history/runtime.js',
  'data/tournaments/archive/runtime.js',
  'data/tournaments/jo-profile-runtime.js',
  'js/team-tournament-history-v7-53-1.js'
]) vm.runInThisContext(read(rel), { filename: rel });

const api = window.WPI_TEAM_TOURNAMENT_HISTORY;
if (!api || api.release !== '7.53.1') throw new Error('Unified team history API did not load');
const test = api._test;
const team = test.findRankedTeam('mission-16u-boys');
const profile = test.findJoProfile('mission-16u-boys');
if (!team || !profile) throw new Error('Mission 16U Boys profile match failed');
const evidence = window.CPI_TOURNAMENT_EVIDENCE.teams[team.canonicalTeamId];
const history = window.CPI_HISTORICAL_PROFILES.teams[team.canonicalTeamId];
const events = test.buildEvents(team, profile, evidence, history);
const names = events.map(item => item.name);
if (!names.includes('2026 Junior Olympics')) throw new Error('JO event is missing');
if (!names.some(name => name.includes('Futures Super Finals'))) throw new Error('Futures history is missing');
if (!names.some(name => name.includes('Quiksilver Cup'))) throw new Error('Quiksilver history is missing');
const archived = events.filter(item => item.kind === 'archive');
if (!archived.some(item => item.games.length >= 1)) throw new Error('Full archived game rows were not attached');
const html = test.renderUnifiedHistory(team, profile);
for (const token of ['Tournament history', 'Results, placements and game journeys', 'Open complete JO journey', 'Official source', 'Search the complete WPI tournament archive']) {
  if (!html.includes(token)) throw new Error(`Unified history HTML missing ${token}`);
}
if (html.includes('Normalized tournament evidence') || html.includes('Historical tournament archive')) throw new Error('Fragmented legacy headings leaked into unified history');

const kern = test.findJoProfile('kern-premier-18u-boys');
if (!kern || kern.profileType !== 'tournament_only') throw new Error('Kern Premier JO-only profile missing');
const kernHtml = test.renderUnifiedHistory(null, kern);
for (const token of ['Tournament history', '2026 Junior Olympics', 'Invitational', 'Copper', 'Open complete JO journey']) {
  if (!kernHtml.includes(token)) throw new Error(`JO-only unified history missing ${token}`);
}

console.log('TEAM TOURNAMENT HISTORY 7.53.1 TESTS PASSED');
console.log(` - ${events.length} Mission 16U Boys event cards include JO and completed archive history`);
console.log(' - Ranked and tournament-only profiles use the same unified history renderer');
