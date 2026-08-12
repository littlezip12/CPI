/* WPI 7.58.0 — Club Workspace Foundation.
 * Keeps the validated 7.56.8 backend intact while adding a Club -> Teams
 * context layer. Team switching only changes which stable team_id is loaded;
 * no roster/game/access/destination/history records are copied or migrated.
 */
(() => {
  "use strict";

  // Keep the established key so the user's last team survives the release.
  const STORAGE_KEY = "wpi-live-selected-team-v7-57-3";
  const Backend = window.WPILiveBackend;
  if (!Backend?.prototype || Backend.prototype.__wpiClubWorkspace7580) return;
  Backend.prototype.__wpiClubWorkspace7580 = true;

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function requestedTeamId() {
    return params().get("team") || localStorage.getItem(STORAGE_KEY) || null;
  }

  function requestedClubId() {
    return params().get("club") || null;
  }

  function requestedClubView() {
    return params().get("view") === "club";
  }

  function rememberTeam(teamId) {
    if (teamId) localStorage.setItem(STORAGE_KEY, String(teamId));
    else localStorage.removeItem(STORAGE_KEY);
  }

  Backend.prototype.listTeamMemberships = async function() {
    const {data, error} = await this.client.rpc("live_list_user_teams_v2");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  };

  Backend.prototype.listClubWorkspaces = async function() {
    const {data, error} = await this.client.rpc("live_list_user_clubs_v1");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  };

  Backend.prototype.clubWorkspace = async function(clubId) {
    if (!clubId) throw new Error("Choose a club workspace.");
    const {data, error} = await this.client.rpc("live_club_workspace_v1", {target_club_id:clubId});
    if (error) throw error;
    return data || null;
  };

  Backend.prototype.workspaceForTeam = async function(teamId) {
    if (!teamId) throw new Error("Choose a team workspace.");
    const {data, error} = await this.client.rpc("live_team_workspace_v2", {target_team_id:teamId});
    if (error) throw error;
    this.workspace = data;
    rememberTeam(data?.teamId || teamId);
    return data;
  };

  Backend.prototype.createAdditionalTeam = async function({
    clubId,
    name,
    ageGroup="14U",
    gender=null,
    squadLabel=null,
    competitiveSeason="2026-2027"
  } = {}) {
    if (!clubId) throw new Error("Choose a club before creating a team.");
    const {data, error} = await this.client.rpc("live_create_additional_team_v2", {
      requested_club_id:clubId,
      requested_team_name:String(name || "").trim(),
      requested_age_group:ageGroup || "14U",
      requested_gender:gender || null,
      requested_squad_label:String(squadLabel || "").trim() || null,
      requested_season:competitiveSeason || "2026-2027"
    });
    if (error) throw error;
    this.workspace = data;
    rememberTeam(data?.teamId || null);
    return data;
  };

  const originalBootstrap = Backend.prototype.bootstrap;
  Backend.prototype.bootstrap = async function(defaults = {}) {
    const teams = await this.listTeamMemberships().catch(() => []);
    if (teams.length) {
      const wanted = requestedTeamId();
      const clubId = requestedClubView() ? requestedClubId() : null;
      const wantedTeam = wanted && teams.find(team => String(team.teamId) === String(wanted));
      const selected = clubId
        ? ((wantedTeam && String(wantedTeam.clubId || "") === String(clubId) && wantedTeam)
          || teams.find(team => String(team.clubId || "") === String(clubId))
          || wantedTeam
          || teams[0])
        : (wantedTeam || teams[0]);
      return this.workspaceForTeam(selected.teamId);
    }
    const workspace = await originalBootstrap.call(this, defaults);
    rememberTeam(workspace?.teamId || null);
    return workspace;
  };

  const originalAcceptInvite = Backend.prototype.acceptInvite;
  Backend.prototype.acceptInvite = async function(token) {
    const data = await originalAcceptInvite.call(this, token);
    if (data?.teamId) rememberTeam(data.teamId);
    return data;
  };

  window.WPILiveTeamContext = Object.freeze({
    storageKey: STORAGE_KEY,
    selectedTeamId: requestedTeamId,
    requestedClubId,
    requestedClubView,
    rememberTeam
  });
})();
