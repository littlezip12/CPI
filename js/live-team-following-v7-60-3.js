/* WPI 7.60.3 — Cross-club Following backend layer.
 * Dashboard-compatible Live-team following plus stable public team-family follows.
 * Following remains read-only and never enters operational permission checks.
 */
(() => {
  "use strict";
  const Backend = window.WPILiveBackend;
  if (!Backend?.prototype || Backend.prototype.__wpiFollowing7603) return;
  Backend.prototype.__wpiFollowing7603 = true;

  Backend.prototype.followingOverview = async function() {
    const {data,error} = await this.client.rpc("live_following_overview_v2");
    if (error) throw error;
    const allGames = Array.isArray(data?.games) ? data.games : [];
    return {
      teams:Array.isArray(data?.teams) ? data.teams : [],
      familyFollows:Array.isArray(data?.familyFollows) ? data.familyFollows : [],
      games:allGames.filter(game => game?.relationship === "following"),
      allGames
    };
  };

  Backend.prototype.setTeamFollow = async function(teamId, following=true) {
    const {data,error} = await this.client.rpc("live_set_team_follow_v2", {
      target_team_id:teamId,requested_follow:Boolean(following)
    });
    if (error) throw error;
    return data || {teamId,following:Boolean(following)};
  };

  Backend.prototype.setPublicTeamFamilyFollow = async function(team, following=true) {
    const {data,error} = await this.client.rpc("live_set_public_team_follow_v1", {
      requested_family_key:team?.familyKey || team?.canonicalWpiTeamFamilyKey,
      requested_wpi_club_id:team?.clubId || team?.canonicalWpiClubId,
      requested_display_name:team?.displayName || team?.canonicalDisplayName || team?.teamName || "WPI team",
      requested_age_group:team?.ageGroup || null,
      requested_gender:team?.gender || null,
      requested_squad_label:team?.squadDescriptor || team?.squadLabel || null,
      requested_follow:Boolean(following)
    });
    if (error) throw error;
    return data;
  };
})();
