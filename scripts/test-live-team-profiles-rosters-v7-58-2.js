#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'live-team-profiles-rosters-v7-58-2.js'), 'utf8');

function build() {
  class MockBackend {
    constructor() {
      this.workspace = {teamId:'team-a',rosterId:'roster-a-v1',role:'owner'};
      this.calls = [];
      this.client = {rpc: async (name,args={}) => {
        this.calls.push([name,args]);
        if (name === 'live_team_workspace_v3') return {data:{teamId:args.target_team_id,rosterId:`${args.target_team_id}-roster-v3`,rosterVersion:3,competitiveSeason:'2026-2027'},error:null};
        if (name === 'live_update_team_profile_v1') return {data:{teamId:args.target_team_id,teamName:args.requested_team_name,teamDisplayLabel:args.requested_display_label,ageGroup:args.requested_age_group,gender:args.requested_gender,squadLabel:args.requested_squad_label,rosterId:'roster-a-v1'},error:null};
        if (name === 'live_list_team_roster_versions_v1') return {data:[{rosterId:'roster-a-v2',versionNumber:2},{rosterId:'roster-a-v1',versionNumber:1}],error:null};
        if (name === 'live_save_roster_version_v1') return {data:{teamId:args.target_team_id,rosterId:'roster-a-v2',rosterVersion:2,defaultLineupPlayerIds:['new-1'],defaultGoalieId:'new-1'},error:null};
        if (name === 'live_set_default_lineup_v1') return {data:{teamId:args.target_team_id,rosterId:args.target_roster_id,defaultLineupPlayerIds:args.requested_player_ids,defaultGoalieId:args.requested_goalie_id},error:null};
        throw new Error(`unexpected rpc ${name}`);
      }};
    }
    async workspaceForTeam(teamId) {
      this.calls.push(['legacy_workspace',{teamId}]);
      return {teamId,rosterId:'legacy'};
    }
    async createAdditionalTeam(options={}) {
      this.calls.push(['legacy_create',options]);
      return {teamId:'team-new',rosterId:'legacy-created'};
    }
  }
  const remembered = [];
  const context = {
    window:{
      WPILiveBackend:MockBackend,
      WPILiveTeamContext:{rememberTeam:id=>remembered.push(String(id))}
    },
    console
  };
  context.window.window=context.window;
  vm.createContext(context);
  vm.runInContext(source,context);
  return {MockBackend,remembered};
}

(async()=>{
  const {MockBackend,remembered}=build();
  const backend=new MockBackend();

  let ws=await backend.workspaceForTeam('team-b');
  if (ws.teamId!=='team-b' || ws.rosterId!=='team-b-roster-v3') throw new Error('team switch did not resolve the v3 season-aware workspace');
  let call=backend.calls.find(row=>row[0]==='live_team_workspace_v3');
  if (!call || call[1].target_team_id!=='team-b') throw new Error('workspace v3 was not scoped to the selected stable team id');

  ws=await backend.updateTeamProfile({teamId:'team-a',name:'Lamorinda A 14U Boys',displayLabel:'14U Boys A',ageGroup:'14U',gender:'Boys',squadLabel:'A'});
  if (ws.teamDisplayLabel!=='14U Boys A') throw new Error('team profile result did not stay team-specific');
  call=backend.calls.find(row=>row[0]==='live_update_team_profile_v1');
  if (!call || call[1].target_team_id!=='team-a' || call[1].requested_gender!=='Boys') throw new Error('profile save was not scoped to the selected team metadata');

  const versions=await backend.listRosterVersions('team-a');
  if (versions.length!==2 || versions[0].versionNumber!==2) throw new Error('roster version history did not load');

  ws=await backend.saveRosterVersion({teamId:'team-a',rosterId:'roster-a-v1',players:[{id:'p-1',cap:'#1',name:'Goalie'},{id:'p-2',cap:'2',name:'Field'}]});
  if (ws.rosterId!=='roster-a-v2' || ws.rosterVersion!==2) throw new Error('new roster version was not returned');
  call=backend.calls.find(row=>row[0]==='live_save_roster_version_v1');
  if (!call || call[1].expected_roster_id!=='roster-a-v1') throw new Error('roster save did not guard against stale roster context');
  if (call[1].requested_players[0].cap!=='1' || call[1].requested_players[0].clientPlayerId!=='p-1') throw new Error('roster payload did not preserve stable client player identity');

  ws=await backend.setDefaultLineup({teamId:'team-a',rosterId:'roster-a-v2',playerIds:['r1','r2','r3','r4','r5','r6','r7'],goalieId:'r1'});
  if (ws.defaultGoalieId!=='r1' || ws.defaultLineupPlayerIds.length!==7) throw new Error('default lineup did not stay team/roster scoped');
  call=backend.calls.find(row=>row[0]==='live_set_default_lineup_v1');
  if (!call || call[1].target_roster_id!=='roster-a-v2') throw new Error('default lineup did not target the active roster');

  const created=await backend.createAdditionalTeam({clubId:'club-a',name:'Lamorinda A 12U Boys'});
  if (created.teamId!=='team-new' || created.rosterVersion!==3) throw new Error('new team creation did not refresh through the season-aware workspace');

  if (!remembered.includes('team-b') || !remembered.includes('team-a') || !remembered.includes('team-new')) throw new Error('stable selected team context was not remembered after 7.58.2 operations');

  console.log('WPI LIVE MULTI-TEAM PROFILES & ROSTERS 7.58.2 TEST PASSED');
  console.log(' - team profile, roster versions, default lineup, and stable team context remain isolated');
})();
