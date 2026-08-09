/* WPI 7.57.3 — secure multi-team context without modifying the validated 7.56.8 backend. */
(() => {
  "use strict";

  const STORAGE_KEY = "wpi-live-selected-team-v7-57-3";
  const Backend = window.WPILiveBackend;
  if (!Backend?.prototype || Backend.prototype.__wpiMultiTeam7573) return;
  Backend.prototype.__wpiMultiTeam7573 = true;

  function requestedTeamId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("team") || localStorage.getItem(STORAGE_KEY) || null;
  }

  function rememberTeam(teamId) {
    if (teamId) localStorage.setItem(STORAGE_KEY, String(teamId));
    else localStorage.removeItem(STORAGE_KEY);
  }

  Backend.prototype.listTeamMemberships = async function() {
    const {data, error} = await this.client.rpc("live_list_user_teams");
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  };

  Backend.prototype.workspaceForTeam = async function(teamId) {
    if (!teamId) throw new Error("Choose a team workspace.");
    const {data, error} = await this.client.rpc("live_team_workspace", {target_team_id:teamId});
    if (error) throw error;
    this.workspace = data;
    rememberTeam(data?.teamId || teamId);
    return data;
  };

  Backend.prototype.createAdditionalTeam = async function({name, ageGroup="14U", competitiveSeason="2026-2027"} = {}) {
    const {data, error} = await this.client.rpc("live_create_additional_team", {
      requested_team_name:String(name || "").trim(),
      requested_age_group:ageGroup || "14U",
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
      const selected = (wanted && teams.find(team => String(team.teamId) === String(wanted))) || teams[0];
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
    rememberTeam
  });
})();
