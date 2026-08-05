/* WPI 7.56.1 — connected live backend adapter.
 * Browser-safe publishable keys only. Secret keys and GroupMe bot IDs belong in Supabase Edge Function secrets.
 */
(() => {
  "use strict";

  const SUPABASE_ESM = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8/+esm";
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function secondsFromClock(minutes, seconds) {
    return Math.max(0, (Number(minutes) || 0) * 60 + (Number(seconds) || 0));
  }

  function statusForDatabase(status) {
    if (status === "ended") return "final";
    if (["live", "between_quarters", "between_periods"].includes(status)) return "live";
    if (status === "scheduled") return "scheduled";
    return "setup";
  }

  class WPILiveBackend {
    constructor(config, client) {
      this.config = config;
      this.client = client;
      this.workspace = null;
      this.user = null;
      this.gameChannel = null;
    }

    static isConfigured(config = {}) {
      return config.mode === "connected" && Boolean(config.supabaseUrl && config.supabasePublishableKey);
    }

    static async connect(config = {}) {
      if (!WPILiveBackend.isConfigured(config)) return null;
      const module = await import(SUPABASE_ESM);
      const client = module.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
        global: { headers: { "x-wpi-live-release": "7.56.1" } }
      });
      return new WPILiveBackend(config, client);
    }

    async session() {
      const { data, error } = await this.client.auth.getSession();
      if (error) throw error;
      this.user = data.session?.user || null;
      return data.session || null;
    }

    async signIn(email, password) {
      const result = await this.client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      this.user = result.data.user;
      return result.data;
    }

    async signUp(email, password, options = {}) {
      const result = await this.client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: options.emailRedirectTo,
          data: { display_name: options.displayName || "" }
        }
      });
      if (result.error) throw result.error;
      return result.data;
    }

    async requestPasswordReset(email, redirectTo) {
      const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
    }

    async updatePassword(password) {
      const { data, error } = await this.client.auth.updateUser({ password });
      if (error) throw error;
      return data;
    }

    async signOut() {
      await this.client.auth.signOut();
    }

    async registrationStatus() {
      const { data, error } = await this.client.rpc("live_registration_status");
      if (error) throw error;
      return data || { bootstrapAvailable: false, inviteRequired: true };
    }

    async bootstrap(defaults = {}) {
      const session = await this.session();
      if (!session) throw new Error("Sign in is required.");
      const { data, error } = await this.client.rpc("live_bootstrap_workspace", {
        requested_team_name: defaults.teamName || "Lamorinda A 14U Boys",
        requested_slug: defaults.teamSlug || "lamorinda-a-14u-boys",
        requested_age_group: defaults.ageGroup || "14U",
        requested_season: defaults.competitiveSeason || "2026-2027"
      });
      if (error) throw error;
      this.workspace = data;
      return data;
    }

    async loadRoster(rosterId = this.workspace?.rosterId) {
      if (!rosterId) return [];
      const { data, error } = await this.client
        .from("live_players")
        .select("id,client_player_id,cap_number,display_name,sort_order,active,created_by")
        .eq("roster_id", rosterId)
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []).map(player => ({
        id: player.client_player_id || player.id,
        remoteId: player.id,
        cap: player.cap_number,
        name: player.display_name,
        createdByUserId: player.created_by || null
      }));
    }

    async listGames(teamId = this.workspace?.teamId) {
      if (!teamId) return [];
      const { data, error } = await this.client
        .from("live_games")
        .select("id,client_game_id,team_name_snapshot,opponent_name,scheduled_at,venue,status,team_score,opponent_score,current_quarter,updated_at,ended_at,state_snapshot")
        .eq("team_id", teamId)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    }

    async loadGameState(gameId) {
      const { data, error } = await this.client
        .from("live_games")
        .select("id,state_snapshot,updated_at")
        .eq("id", gameId)
        .single();
      if (error) throw error;
      return { remoteGameId: data.id, state: data.state_snapshot, updatedAt: data.updated_at };
    }

    async createInvite(teamId, email, role = "scorer") {
      const { data, error } = await this.client.rpc("live_create_team_invite", {
        target_team_id: teamId,
        invite_email: email,
        invite_role: role
      });
      if (error) throw error;
      return data;
    }

    async acceptInvite(token) {
      const { data, error } = await this.client.rpc("live_accept_team_invite", { invite_token: token });
      if (error) throw error;
      this.workspace = null;
      return data;
    }

    async syncState(state) {
      if (!this.workspace) await this.bootstrap({
        teamName: state.setup?.teamName,
        ageGroup: state.setup?.ageGroup,
        competitiveSeason: "2026-2027"
      });
      const session = await this.session();
      if (!session) throw new Error("Session expired. Sign in again.");

      const workspace = this.workspace;
      if (!["owner", "admin", "scorer"].includes(workspace.role)) {
        throw new Error("Viewer accounts are read-only and cannot save live scoring changes.");
      }
      const rosterRows = (state.setup?.roster || [])
        .filter(player => String(player.cap || "").trim() && String(player.name || "").trim())
        .map((player, index) => ({
          roster_id: workspace.rosterId,
          client_player_id: player.id,
          cap_number: String(player.cap).trim(),
          display_name: String(player.name).trim(),
          active: true,
          sort_order: index,
          created_by: player.createdByUserId || session.user.id,
          updated_by: session.user.id,
          updated_at: new Date().toISOString()
        }));

      if (rosterRows.length) {
        const { error } = await this.client.from("live_players").upsert(rosterRows, { onConflict: "roster_id,client_player_id" });
        if (error) throw error;
      }

      const { data: remotePlayers, error: playersError } = await this.client
        .from("live_players")
        .select("id,client_player_id")
        .eq("roster_id", workspace.rosterId)
        .eq("active", true);
      if (playersError) throw playersError;
      const playerMap = new Map((remotePlayers || []).map(player => [player.client_player_id, player.id]));
      const localPlayerIds = new Set(rosterRows.map(player => player.client_player_id));
      const removedRemoteIds = (remotePlayers || []).filter(player => !localPlayerIds.has(player.client_player_id)).map(player => player.id);
      if (removedRemoteIds.length) {
        const { error } = await this.client.from("live_players").update({ active:false }).in("id", removedRemoteIds);
        if (error) throw error;
      }

      const defaultLineupIds = (state.setup?.defaultLineup || []).map(id => playerMap.get(id)).filter(Boolean);
      const defaultGoalieId = playerMap.get(state.setup?.defaultGoalieId) || null;
      const { error: teamUpdateError } = await this.client.from("live_teams").update({
        name: state.setup.teamName,
        age_group: state.setup.ageGroup || "14U",
        default_lineup_player_ids: defaultLineupIds,
        default_goalie_id: defaultGoalieId,
        updated_at: new Date().toISOString()
      }).eq("id", workspace.teamId);
      if (teamUpdateError) throw teamUpdateError;

      const gamePayload = {
        environment: state.environment === "production" ? "production" : "sandbox",
        team_id: workspace.teamId,
        roster_id: workspace.rosterId,
        competitive_season: "2026-2027",
        client_game_id: state.game.id,
        source_mode: state.setup.source === "tournament" ? "tournament_sheet" : "manual",
        team_name_snapshot: state.setup.teamName,
        opponent_name: state.setup.opponentName,
        scheduled_at: state.setup.gameDateTime ? new Date(state.setup.gameDateTime).toISOString() : null,
        venue: state.setup.venue || null,
        age_group: state.setup.ageGroup || "14U",
        quarter_length_seconds: Math.max(60, Number(state.setup.quarterLength || 7) * 60),
        status: statusForDatabase(state.game.status),
        visibility: state.setup.visibility || "team_private",
        message_frequency: state.setup.messageFrequency || "major",
        messages_paused: Boolean(state.game.messagesPaused),
        current_quarter: Number(state.game.quarter || 1),
        current_time_remaining_seconds: secondsFromClock(state.game.clockMinutes, state.game.clockSeconds),
        team_score: Number(state.game.teamScore || 0),
        opponent_score: Number(state.game.opponentScore || 0),
        phase: state.game.phase || "regulation",
        overtime_length_minutes: Number(state.game.overtimeLength || 2),
        overtime_multiple_periods: state.game.overtimeMultiplePeriods !== false,
        created_by: state.game.createdByUserId || session.user.id,
        updated_by: session.user.id,
        started_at: state.game.startedAt || null,
        ended_at: state.game.endedAt || null,
        state_snapshot: state,
        last_synced_at: new Date().toISOString(),
        sync_version: Date.now(),
        updated_at: new Date().toISOString()
      };

      const { data: game, error: gameError } = await this.client
        .from("live_games")
        .upsert(gamePayload, { onConflict: "team_id,client_game_id" })
        .select("id")
        .single();
      if (gameError) throw gameError;

      const lineupRows = Object.entries(state.game.lineups || {}).map(([quarter, localIds]) => ({
        game_id: game.id,
        quarter: Number(quarter),
        period_label: Number(quarter) > 4 ? `OT${Number(quarter)-4}` : `Q${quarter}`,
        player_ids: localIds.map(id => playerMap.get(id)).filter(Boolean),
        goalie_id: playerMap.get(state.game.lineupGoalies?.[quarter]) || null,
        created_by: session.user.id,
        updated_by: session.user.id,
        updated_at: new Date().toISOString()
      }));
      if (lineupRows.length) {
        const { error } = await this.client.from("live_lineups").upsert(lineupRows, { onConflict: "game_id,quarter" });
        if (error) throw error;
      }

      const eventRows = (state.game.events || []).map((event, index) => ({
        game_id: game.id,
        client_event_id: event.id,
        sequence: Number(event.sequence || index + 1),
        event_type: event.type,
        event_label: event.label || event.type,
        player_id: playerMap.get(event.playerId) || null,
        secondary_player_id: playerMap.get(event.secondaryPlayerId) || null,
        quarter: Number(event.quarter || 1),
        time_remaining_seconds: (() => {
          const parts = String(event.timeRemaining || "0:00").split(":");
          return Math.max(0, (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0));
        })(),
        team_score_delta: Number(event.teamDelta || 0),
        opponent_score_delta: Number(event.opponentDelta || 0),
        team_score_after: Number(event.scoreAfter?.team ?? state.game.teamScore ?? 0),
        opponent_score_after: Number(event.scoreAfter?.opponent ?? state.game.opponentScore ?? 0),
        note: event.note || null,
        message_text: (state.game.messages || []).find(message => message.eventId === event.id)?.text || null,
        status: event.status === "voided" ? "voided" : "active",
        phase: event.phase || state.game.phase || "regulation",
        shootout_team: event.shootoutTeam || null,
        shootout_round: event.shootoutRound || null,
        shooter_label: event.shooterLabel || null,
        metrics: {
          category: event.category || null,
          teamShotDelta: Number(event.teamShotDelta || 0),
          opponentShotDelta: Number(event.opponentShotDelta || 0),
          opponentFieldBlockDelta: Number(event.opponentFieldBlockDelta || 0),
          opponentSaveDelta: Number(event.opponentSaveDelta || 0),
          saveDelta: Number(event.saveDelta || 0),
          fieldBlockDelta: Number(event.fieldBlockDelta || 0),
          correctedTeamScore: event.correctedTeamScore ?? null,
          correctedOpponentScore: event.correctedOpponentScore ?? null
        },
        created_by: event.createdByUserId || session.user.id,
        updated_by: session.user.id,
        updated_at: new Date().toISOString(),
        created_at: event.createdAt || new Date().toISOString(),
        voided_by: event.status === "voided" ? session.user.id : null,
        voided_at: event.status === "voided" ? new Date().toISOString() : null
      }));
      if (eventRows.length) {
        const { error } = await this.client.from("live_events").upsert(eventRows, { onConflict: "game_id,client_event_id" });
        if (error) throw error;
      }

      if (state.game.status === "ended") {
        const analytics = state.analyticsSnapshot || {};
        const recap = state.recapDrafts || {};
        const { error } = await this.client.from("live_game_recaps").upsert({
          game_id: game.id,
          playful_text: recap.playful || null,
          straight_text: recap.straight || null,
          coach_text: recap.coach || null,
          selected_style: recap.selectedStyle || null,
          approved_text: recap.approvedText || null,
          analytics_snapshot: analytics,
          updated_at: new Date().toISOString()
        }, { onConflict: "game_id" });
        if (error) throw error;
      }

      return { remoteGameId: game.id, syncedAt: new Date().toISOString() };
    }

    subscribeToGame(gameId, onRemoteState) {
      if (this.gameChannel) this.client.removeChannel(this.gameChannel);
      this.gameChannel = this.client
        .channel(`wpi-live-game-${gameId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_games", filter: `id=eq.${gameId}` }, payload => {
          const snapshot = payload.new?.state_snapshot;
          if (snapshot) onRemoteState(snapshot, payload.new);
        })
        .subscribe();
      return () => {
        if (this.gameChannel) this.client.removeChannel(this.gameChannel);
        this.gameChannel = null;
      };
    }

    async waitForHealthySession(attempts = 3) {
      for (let i = 0; i < attempts; i += 1) {
        const session = await this.session();
        if (session) return session;
        await sleep(250 * (i + 1));
      }
      return null;
    }
  }

  window.WPILiveBackend = WPILiveBackend;
})();
