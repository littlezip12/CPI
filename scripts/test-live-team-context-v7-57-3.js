#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'live-team-context-v7-57-3.js'), 'utf8');

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    dump: () => Object.fromEntries(data)
  };
}

async function build(search = '', stored = {}, teams = []) {
  class MockBackend {
    constructor() {
      this.workspace = null;
      this.calls = [];
      this.client = {rpc: async (name, args = {}) => {
        this.calls.push([name, args]);
        if (name === 'live_list_user_teams') return {data: teams, error: null};
        if (name === 'live_team_workspace') {
          const team = teams.find(row => row.teamId === args.target_team_id);
          return {data: team ? {...team, rosterId:`roster-${team.teamId}`} : null, error: team ? null : new Error('denied')};
        }
        if (name === 'live_create_additional_team') return {data:{teamId:'new-team',teamName:args.requested_team_name,role:'owner'},error:null};
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
      this.workspace = null;
      return {teamId:'accepted-team',role:'scorer'};
    }
  }
  const localStorage = storage(stored);
  const context = {
    window: {WPILiveBackend: MockBackend, location:{search}},
    localStorage,
    URLSearchParams,
    console
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(source, context);
  return {MockBackend, localStorage, context};
}

(async () => {
  const teams = [
    {teamId:'team-a',teamName:'Team A',ageGroup:'14U',role:'owner'},
    {teamId:'team-b',teamName:'Team B',ageGroup:'16U',role:'admin'}
  ];

  let env = await build('?team=team-b', {}, teams);
  let backend = new env.MockBackend();
  let ws = await backend.bootstrap({teamName:'Fallback'});
  if (ws.teamId !== 'team-b') throw new Error('explicit team query was not selected');
  if (env.localStorage.getItem('wpi-live-selected-team-v7-57-3') !== 'team-b') throw new Error('selected team was not remembered');

  env = await build('', {'wpi-live-selected-team-v7-57-3':'team-b'}, teams);
  backend = new env.MockBackend();
  ws = await backend.bootstrap({teamName:'Fallback'});
  if (ws.teamId !== 'team-b') throw new Error('remembered team was not restored');

  env = await build('', {'wpi-live-selected-team-v7-57-3':'not-a-membership'}, teams);
  backend = new env.MockBackend();
  ws = await backend.bootstrap({teamName:'Fallback'});
  if (ws.teamId !== 'team-a') throw new Error('invalid remembered team did not fall back to an authorized membership');

  env = await build('', {}, []);
  backend = new env.MockBackend();
  ws = await backend.bootstrap({teamName:'First Team'});
  if (ws.teamId !== 'bootstrap-team') throw new Error('first-owner bootstrap fallback was not preserved');

  env = await build('', {}, teams);
  backend = new env.MockBackend();
  const accepted = await backend.acceptInvite('abc');
  if (accepted.teamId !== 'accepted-team') throw new Error('accept invite return value changed');
  if (env.localStorage.getItem('wpi-live-selected-team-v7-57-3') !== 'accepted-team') throw new Error('accepted invite did not select the joined team');

  console.log('WPI LIVE TEAM CONTEXT 7.57.3 TEST PASSED');
  console.log(' - explicit, remembered, fallback and invitation team selection behave correctly');
})();
