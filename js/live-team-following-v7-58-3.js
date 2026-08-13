/* WPI 7.58.3 — Multi-Team Access & Following.
 * Following is a separate read-only relationship. It never creates a
 * live_team_members row and never changes scorer/admin permission checks.
 */
(() => {
  "use strict";

  const Backend = window.WPILiveBackend;
  if (!Backend?.prototype || Backend.prototype.__wpiFollowing7583) return;
  Backend.prototype.__wpiFollowing7583 = true;

  const params = () => new URLSearchParams(window.location.search);
  const rememberTeam = teamId => window.WPILiveTeamContext?.rememberTeam?.(teamId);

  Backend.prototype.workspaceForTeam = async function(teamId) {
    if (!teamId) throw new Error("Choose a team workspace.");
    const {data, error} = await this.client.rpc("live_team_workspace_v4", {target_team_id:teamId});
    if (error) throw error;
    this.workspace = data;
    if (data?.relationship !== "following") rememberTeam(data?.teamId || teamId);
    return data;
  };

  const priorBootstrap = Backend.prototype.bootstrap;
  Backend.prototype.bootstrap = async function(defaults = {}) {
    const explicitTeamId = params().get("team");
    const allowFollowWorkspace = /(?:^|\/)live-game\.html$/.test(window.location.pathname || "");
    if (explicitTeamId && allowFollowWorkspace) {
      try {
        return await this.workspaceForTeam(explicitTeamId);
      } catch (error) {
        // A stale URL should still fall back to the user's permanent team.
        if (params().get("follow") === "1") throw error;
      }
    }
    return priorBootstrap.call(this, defaults);
  };

  Backend.prototype.followingOverview = async function() {
    const {data, error} = await this.client.rpc("live_following_overview_v1");
    if (error) throw error;
    return {
      teams:Array.isArray(data?.teams) ? data.teams : [],
      games:Array.isArray(data?.games) ? data.games : []
    };
  };

  Backend.prototype.setTeamFollow = async function(teamId, following = true) {
    const {data, error} = await this.client.rpc("live_set_team_follow_v1", {
      target_team_id:teamId,
      requested_follow:Boolean(following)
    });
    if (error) throw error;
    return data || {teamId,following:Boolean(following)};
  };

  Backend.prototype.listTeamFollowers = async function(teamId) {
    if (!teamId) return [];
    const {data, error} = await this.client.rpc("live_list_team_followers_v1", {target_team_id:teamId});
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  };

  // A followed-team game is intentionally read-only. Avoid requesting private
  // GroupMe delivery/configuration or scorer-control surfaces that Following
  // does not grant.
  const priorLoadGroupMeDestination = Backend.prototype.loadGroupMeDestination;
  Backend.prototype.loadGroupMeDestination = async function(teamId = this.workspace?.teamId) {
    if (this.workspace?.followingOnly) return null;
    return priorLoadGroupMeDestination.call(this, teamId);
  };

  const priorGroupMeDeliverySummary = Backend.prototype.groupMeDeliverySummary;
  Backend.prototype.groupMeDeliverySummary = async function(teamId = this.workspace?.teamId) {
    if (this.workspace?.followingOnly) return {sent:0,failed:0,pending:0,suppressed:0};
    return priorGroupMeDeliverySummary.call(this, teamId);
  };

  const priorLoadDeliveryStatuses = Backend.prototype.loadDeliveryStatuses;
  Backend.prototype.loadDeliveryStatuses = async function(gameId) {
    if (this.workspace?.followingOnly) return [];
    return priorLoadDeliveryStatuses.call(this, gameId);
  };

  const priorSubscribeToDeliveries = Backend.prototype.subscribeToDeliveries;
  Backend.prototype.subscribeToDeliveries = function(gameId, onDelivery) {
    if (this.workspace?.followingOnly) return () => {};
    return priorSubscribeToDeliveries.call(this, gameId, onDelivery);
  };

  const priorScorerControlStatus = Backend.prototype.scorerControlStatus;
  Backend.prototype.scorerControlStatus = async function(gameId) {
    if (this.workspace?.followingOnly) {
      const control = {
        activeUserId:null,
        activeDisplayName:null,
        activeKind:null,
        activeSessionId:null,
        controlVersion:0,
        canScore:false,
        canManage:false,
        canTransfer:false,
        callerSessionStatus:"following"
      };
      this.scorerControl = control;
      return control;
    }
    return priorScorerControlStatus.call(this, gameId);
  };
})();
