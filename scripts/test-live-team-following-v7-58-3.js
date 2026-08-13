#!/usr/bin/env node
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','js','live-team-following-v7-58-3.js'),'utf8');

function build(pathname='/live-dashboard.html',search='') {
  class MockBackend {
    constructor(){
      this.workspace=null; this.calls=[];
      this.client={rpc:async(name,args={})=>{
        this.calls.push([name,args]);
        if(name==='live_team_workspace_v4') {
          const followed=args.target_team_id==='follow-team';
          return {data:{teamId:args.target_team_id,teamName:followed?'Lamorinda 12U Boys A':'Lamorinda 14U Boys A',role:followed?'viewer':'scorer',relationship:followed?'following':'member',followingOnly:followed},error:null};
        }
        if(name==='live_following_overview_v1') return {data:{teams:[{teamId:'follow-team',isFollowing:true}],games:[{id:'g1',teamId:'follow-team'}]},error:null};
        if(name==='live_set_team_follow_v1') return {data:{teamId:args.target_team_id,following:args.requested_follow},error:null};
        if(name==='live_list_team_followers_v1') return {data:[{userId:'u1'}],error:null};
        throw new Error(`unexpected rpc ${name}`);
      }};
    }
    async bootstrap(){ this.calls.push(['prior_bootstrap',{}]); this.workspace={teamId:'member-team',role:'scorer',relationship:'member'}; return this.workspace; }
    async loadGroupMeDestination(){ return {id:'private-destination'}; }
    async groupMeDeliverySummary(){ return {sent:2,failed:0,pending:0,suppressed:0}; }
    async loadDeliveryStatuses(){ return [{deliveryId:'d1'}]; }
    subscribeToDeliveries(){ return ()=>{}; }
    async scorerControlStatus(){ return {canScore:true,canManage:false}; }
  }
  const context={window:{WPILiveBackend:MockBackend,WPILiveTeamContext:{rememberTeam:()=>{}},location:{pathname,search}},URLSearchParams,console};
  context.window.window=context.window;
  vm.createContext(context); vm.runInContext(source,context);
  return {MockBackend,context};
}

(async()=>{
  let env=build('/live-dashboard.html','?team=follow-team');
  let backend=new env.MockBackend();
  let ws=await backend.bootstrap();
  if(ws.teamId!=='member-team') throw new Error('dashboard must not turn a followed team into the active management workspace');

  env=build('/live-game.html','?team=follow-team&follow=1');
  backend=new env.MockBackend();
  ws=await backend.bootstrap();
  if(ws.relationship!=='following' || ws.role!=='viewer') throw new Error('followed live-game route did not resolve read-only workspace');
  if(await backend.loadGroupMeDestination('follow-team')!==null) throw new Error('following exposed GroupMe destination');
  const summary=await backend.groupMeDeliverySummary('follow-team');
  if(summary.sent!==0 || summary.pending!==0) throw new Error('following exposed GroupMe delivery summary');
  if((await backend.loadDeliveryStatuses('g1')).length!==0) throw new Error('following exposed delivery audit');
  const control=await backend.scorerControlStatus('g1');
  if(control.canScore!==false || control.canManage!==false || control.callerSessionStatus!=='following') throw new Error('followed game did not stay read-only');

  const overview=await backend.followingOverview();
  if(overview.teams.length!==1 || overview.games.length!==1) throw new Error('following overview contract failed');
  const result=await backend.setTeamFollow('follow-team',false);
  if(result.following!==false) throw new Error('unfollow contract failed');
  if((await backend.listTeamFollowers('follow-team')).length!==1) throw new Error('manager follower list contract failed');

  console.log('WPI LIVE FOLLOWING 7.58.3 TEST PASSED');
  console.log(' - following stays separate, read-only, and private delivery/scorer surfaces remain hidden');
})();
