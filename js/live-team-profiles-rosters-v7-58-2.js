/* WPI 7.58.2 — Multi-Team Profiles & Rosters.
 * Extends the validated connected backend without rewriting scoring delivery.
 * The selected stable team_id resolves its own current-season roster version,
 * profile metadata and default lineup.
 */
(() => {
  "use strict";

  const Backend = window.WPILiveBackend;
  if (!Backend?.prototype || Backend.prototype.__wpiProfilesRosters7582) return;
  Backend.prototype.__wpiProfilesRosters7582 = true;

  const rememberTeam = teamId => window.WPILiveTeamContext?.rememberTeam?.(teamId);

  Backend.prototype.workspaceForTeam = async function(teamId) {
    if (!teamId) throw new Error("Choose a team workspace.");
    const {data, error} = await this.client.rpc("live_team_workspace_v3", {target_team_id:teamId});
    if (error) throw error;
    this.workspace = data;
    rememberTeam(data?.teamId || teamId);
    return data;
  };

  const createAdditionalTeam7580 = Backend.prototype.createAdditionalTeam;
  if (typeof createAdditionalTeam7580 === "function") {
    Backend.prototype.createAdditionalTeam = async function(options = {}) {
      const created = await createAdditionalTeam7580.call(this, options);
      if (!created?.teamId) return created;
      return this.workspaceForTeam(created.teamId);
    };
  }

  Backend.prototype.updateTeamProfile = async function({
    teamId=this.workspace?.teamId,
    name,
    ageGroup,
    gender=null,
    squadLabel=null,
    displayLabel=null
  } = {}) {
    if (!teamId) throw new Error("Choose a team before saving its profile.");
    const {data, error} = await this.client.rpc("live_update_team_profile_v1", {
      target_team_id:teamId,
      requested_team_name:String(name || "").trim(),
      requested_age_group:ageGroup || "14U",
      requested_gender:String(gender || "").trim() || null,
      requested_squad_label:String(squadLabel || "").trim() || null,
      requested_display_label:String(displayLabel || "").trim() || null
    });
    if (error) throw error;
    this.workspace = data;
    rememberTeam(data?.teamId || teamId);
    return data;
  };

  Backend.prototype.listRosterVersions = async function(teamId=this.workspace?.teamId) {
    if (!teamId) return [];
    const {data, error} = await this.client.rpc("live_list_team_roster_versions_v1", {target_team_id:teamId});
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  };

  Backend.prototype.saveRosterVersion = async function({
    teamId=this.workspace?.teamId,
    rosterId=this.workspace?.rosterId,
    players=[]
  } = {}) {
    if (!teamId) throw new Error("Choose a team before saving its roster.");
    const normalized = (Array.isArray(players) ? players : []).map((player,index) => ({
      clientPlayerId:String(player?.clientPlayerId || player?.id || "").trim() || null,
      cap:String(player?.cap || "").trim().replace(/^#/, "").toUpperCase(),
      name:String(player?.name || "").trim(),
      sortOrder:Number.isFinite(Number(player?.sortOrder)) ? Number(player.sortOrder) : index
    }));
    const {data, error} = await this.client.rpc("live_save_roster_version_v1", {
      target_team_id:teamId,
      expected_roster_id:rosterId || null,
      requested_players:normalized
    });
    if (error) throw error;
    this.workspace = data;
    rememberTeam(data?.teamId || teamId);
    return data;
  };

  Backend.prototype.setDefaultLineup = async function({
    teamId=this.workspace?.teamId,
    rosterId=this.workspace?.rosterId,
    playerIds=[],
    goalieId=null
  } = {}) {
    if (!teamId || !rosterId) throw new Error("Load the current team roster before setting starters.");
    const {data, error} = await this.client.rpc("live_set_default_lineup_v1", {
      target_team_id:teamId,
      target_roster_id:rosterId,
      requested_player_ids:Array.isArray(playerIds) ? playerIds : [],
      requested_goalie_id:goalieId || null
    });
    if (error) throw error;
    this.workspace = data;
    rememberTeam(data?.teamId || teamId);
    return data;
  };
})();
