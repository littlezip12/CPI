/* WPI 7.58.5 — Tournament Feed → Game-Day Validation.
 * Pure squad-safe identity helpers for official WPI schedule ingestion.
 */
(() => {
  "use strict";

  const clean = value => String(value || "")
    .toLowerCase()
    .replace(/&/g," and ")
    .replace(/[^a-z0-9]+/g," ")
    .replace(/\s+/g," ")
    .trim();

  const squadAliases = new Map([
    ["a","a"],["b","b"],["c","c"],["d","d"],
    ["black","black"],["gold","gold"],["blue","blue"],["red","red"],
    ["navy","navy"],["white","white"],["green","green"],["orange","orange"],
    ["silver","silver"],["purple","purple"],["gray","gray"],["grey","gray"]
  ]);

  function normalizeSquad(value) {
    const key = clean(value);
    return squadAliases.get(key) || key || null;
  }

  function participantSquad(name) {
    const tokens = clean(name).split(" ").filter(Boolean);
    if (!tokens.length) return null;
    const last = tokens[tokens.length-1];
    return squadAliases.get(last) || null;
  }

  function sameLiveTeamPeer(team, workspace) {
    if (!team || !workspace || team.active === false) return false;
    if (workspace.competitiveSeason && team.competitiveSeason && String(team.competitiveSeason) !== String(workspace.competitiveSeason)) return false;
    if (workspace.ageGroup && team.ageGroup && clean(team.ageGroup) !== clean(workspace.ageGroup)) return false;
    if (workspace.gender && team.gender && clean(team.gender) !== clean(workspace.gender)) return false;
    return true;
  }

  function clubPeerTeams(workspace, clubTeams) {
    return (Array.isArray(clubTeams) ? clubTeams : []).filter(team => sameLiveTeamPeer(team, workspace));
  }

  function assessParticipant({participant, resolvedParticipant, workspace, resolvedWorkspace, clubTeams}) {
    if (!participant || !workspace) return {score:0,ambiguous:false,reason:"missing_participant"};
    const ownTeamId = resolvedWorkspace?.team?.canonicalTeamId || workspace.canonicalWpiTeamId || null;
    const ownClubId = resolvedWorkspace?.club?.canonicalClubId || (resolvedWorkspace?.club?.slug ? `club-${resolvedWorkspace.club.slug}` : null);
    const participantTeamId = resolvedParticipant?.teamId || null;
    const participantClubId = resolvedParticipant?.clubId || null;

    if (ownTeamId && participantTeamId) {
      return ownTeamId === participantTeamId
        ? {score:1,ambiguous:false,reason:"canonical_team"}
        : {score:0,ambiguous:false,reason:"different_canonical_team"};
    }

    const sourceName = clean(participant.name);
    const fullName = clean(workspace.teamName);
    const displayName = clean(workspace.teamDisplayLabel || workspace.displayLabel);
    if (sourceName && (sourceName === fullName || (displayName && sourceName === displayName))) {
      return {score:1,ambiguous:false,reason:"exact_live_team_name"};
    }

    if (!ownClubId || !participantClubId || ownClubId !== participantClubId) {
      return {score:0,ambiguous:false,reason:"different_club"};
    }

    const liveSquad = normalizeSquad(workspace.squadLabel);
    const sourceSquad = participantSquad(participant.name);
    const peers = clubPeerTeams(workspace, clubTeams);
    const peerCount = Math.max(peers.length, 1);

    if (liveSquad && sourceSquad) {
      return liveSquad === sourceSquad
        ? {score:0.86,ambiguous:false,reason:"club_plus_matching_squad"}
        : {score:0,ambiguous:false,reason:"club_but_different_squad"};
    }

    if (peerCount > 1) {
      return {
        score:0.45,
        ambiguous:true,
        reason:sourceSquad ? "club_squad_not_resolved_to_live_team" : "club_only_multiple_live_squads"
      };
    }

    if (liveSquad && !sourceSquad) {
      return {score:0.68,ambiguous:false,reason:"club_only_single_live_squad"};
    }

    return {score:0.68,ambiguous:false,reason:"club_only_single_live_team"};
  }

  window.WpiLiveTournamentFeed = Object.freeze({
    normalizeSquad,
    participantSquad,
    clubPeerTeams,
    assessParticipant
  });
})();
