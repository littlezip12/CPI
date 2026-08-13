#!/usr/bin/env node
const assert = require('assert');
global.window = {};
require('../js/live-tournament-feed-v7-58-5.js');
const feed = global.window.WpiLiveTournamentFeed;
assert(feed && feed.assessParticipant, 'feed matcher not exported');

const clubTeams = [
  {teamId:'a',active:true,ageGroup:'14U',gender:'Boys',competitiveSeason:'2026-2027',squadLabel:'A'},
  {teamId:'b',active:true,ageGroup:'14U',gender:'Boys',competitiveSeason:'2026-2027',squadLabel:'B'}
];
const workspaceA = {teamName:'Lamorinda A 14U Boys',teamDisplayLabel:'14U Boys A',ageGroup:'14U',gender:'Boys',competitiveSeason:'2026-2027',squadLabel:'A'};
const workspaceB = {...workspaceA,teamName:'Lamorinda B 14U Boys',teamDisplayLabel:'14U Boys B',squadLabel:'B'};
const ownIdentity = {club:{canonicalClubId:'club-lamorinda'}};
const resolved = {teamId:null,clubId:'club-lamorinda'};

function assess(name, workspace, teams=clubTeams) {
  return feed.assessParticipant({participant:{name},resolvedParticipant:resolved,workspace,resolvedWorkspace:ownIdentity,clubTeams:teams});
}
let row = assess('LAMORINDA A',workspaceA);
assert(row.score >= .85 && !row.ambiguous, 'A source must match A Live squad');
row = assess('LAMORINDA A',workspaceB);
assert.strictEqual(row.score,0,'A source must not match B Live squad');
row = assess('LAMORINDA B',workspaceB);
assert(row.score >= .85 && !row.ambiguous,'B source must match B Live squad');
row = assess('LAMORINDA',workspaceA);
assert(row.score < .6 && row.ambiguous,'club-only source must not auto-import when A/B both exist');
row = assess('LAMORINDA',workspaceA,[clubTeams[0]]);
assert(row.score >= .6 && !row.ambiguous,'club-only source can match when only one Live squad exists');
assert.strictEqual(feed.participantSquad('Lamorinda Gold'),'gold');
assert.strictEqual(feed.participantSquad('Lamorinda'),null);
console.log('WPI LIVE TOURNAMENT FEED 7.58.5 MATCHER TEST PASSED');
console.log(' - squad-qualified official rows map only to the matching Live squad');
console.log(' - club-only rows become identity review when multiple Live squads exist');
console.log(' - club-only rows remain usable when only one Live squad exists');
