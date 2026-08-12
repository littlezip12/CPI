#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'live-team-context-v7-58-0.js'), 'utf8');

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
  };
}

async function build(search = '', stored = {}, teams = [], clubs = []) {
  class MockBackend {
    constructor() {
      this.workspace = null;
      this.calls = [];
      this.client = {rpc: async (name, args = {}) => {
        this.calls.push([name, args]);
        if (name === 'live_list_user_teams_v2') return {data:teams,error:null};
        if (name === 'live_list_user_clubs_v1') return {data:clubs,error:null};
        if (name === 'live_team_workspace_v2') {
          const team = teams.find(row => row.teamId === args.target_team_id);
          return {data:team ? {...team,rosterId:`roster-${team.teamId}`} : null,error:team ? null : new Error('denied')};
        }
        if (name === 'live_club_workspace_v1') {
          const club = clubs.find(row => row.clubId === args.target_club_id);
          return {data:club || null,error:club ? null : new Error('denied')};
        }
        if (name === 'live_create_additional_team_v2') {
          return {data:{teamId:'team-new',clubId:args.requested_club_id,teamName:args.requested_team_name,role:'owner'},error:null};
        }
        throw new Error(`unexpected rpc ${name}`);
      }};
    }
    async bootstrap(defaults = {}) {
      this.calls.push(['original_bootstrap', defaults]);
      this.workspace = {teamId:'bootstrap-team',teamName:defaults.teamName || 'Bootstrap',role:'owner'};
      return this.workspace;
    }
    async acceptInvite(token) {
      this.calls.push(['original_accept', {token}]);
      return {teamId:'accepted-team',role:'scorer'};
    }
  }
  const localStorage = storage(stored);
  const context = {
    window: {WPILiveBackend:MockBackend,location:{search}},
    localStorage,
    URLSearchParams,
    console,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(source, context);
  return {MockBackend,localStorage,context};
}

(async () => {
  const teams = [
    {teamId:'team-14',teamName:'Lamorinda A 14U Boys',teamDisplayLabel:'14U Boys A',clubId:'club-live-lamo',clubName:'Lamorinda',role:'owner'},
    {teamId:'team-16',teamName:'Lamorinda A 16U Boys',teamDisplayLabel:'16U Boys A',clubId:'club-live-lamo',clubName:'Lamorinda',role:'owner'},
    {teamId:'team-other',teamName:'Other Club 14U',clubId:'club-other',clubName:'Other',role:'admin'},
  ];
  const clubs = [{clubId:'club-live-lamo',clubName:'Lamorinda',role:'owner'}];

  let env = await build('?team=team-16', {}, teams, clubs);
  let backend = new env.MockBackend();
  let ws = await backend.bootstrap({teamName:'Fallback'});
  if (ws.teamId !== 'team-16') throw new Error('explicit stable team selection failed');
  if (env.localStorage.getItem('wpi-live-selected-team-v7-57-3') !== 'team-16') throw new Error('stable team selection was not remembered');

  env = await build('?view=club&club=club-live-lamo&team=team-other', {}, teams, clubs);
  backend = new env.MockBackend();
  ws = await backend.bootstrap({teamName:'Fallback'});
  if (ws.teamId !== 'team-14') throw new Error('club view did not select an authorized team inside the requested club');
  if (!env.context.window.WPILiveTeamContext.requestedClubView()) throw new Error('club view query was not exposed');
  if (env.context.window.WPILiveTeamContext.requestedClubId() !== 'club-live-lamo') throw new Error('club id query was not exposed');

  env = await build('', {'wpi-live-selected-team-v7-57-3':'team-16'}, teams, clubs);
  backend = new env.MockBackend();
  ws = await backend.bootstrap({teamName:'Fallback'});
  if (ws.teamId !== 'team-16') throw new Error('pre-7.58 remembered team selection was not preserved');

  env = await build('', {}, [], []);
  backend = new env.MockBackend();
  ws = await backend.bootstrap({teamName:'First Team'});
  if (ws.teamId !== 'bootstrap-team') throw new Error('first-owner bootstrap fallback regressed');

  env = await build('', {}, teams, clubs);
  backend = new env.MockBackend();
  const created = await backend.createAdditionalTeam({clubId:'club-live-lamo',name:'Lamorinda A 12U Boys',ageGroup:'12U',gender:'Boys',squadLabel:'A'});
  if (created.teamId !== 'team-new') throw new Error('club-scoped team creation did not return the created stable team');
  const call = backend.calls.find(row => row[0] === 'live_create_additional_team_v2');
  if (!call || call[1].requested_club_id !== 'club-live-lamo') throw new Error('team creation was not anchored to a stable club id');

  const accepted = await backend.acceptInvite('abc');
  if (accepted.teamId !== 'accepted-team') throw new Error('accept invite return value changed');
  if (env.localStorage.getItem('wpi-live-selected-team-v7-57-3') !== 'accepted-team') throw new Error('accepted invite did not select the joined team');

  console.log('WPI LIVE CLUB CONTEXT 7.58.0 TEST PASSED');
  console.log(' - stable team selection, club view scoping, creation, and invitation selection behave correctly');
})();
