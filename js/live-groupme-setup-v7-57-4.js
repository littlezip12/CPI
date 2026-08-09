/* WPI 7.57.4 — self-service GroupMe setup backend adapter.
 * Extends the validated 7.56.8 backend without modifying its scoring/delivery code.
 */
(() => {
  "use strict";
  const Backend = window.WPILiveBackend;
  if (!Backend) return;

  function normalizeDestination(data = {}) {
    return {
      id: data.id || null,
      team_id: data.teamId || null,
      display_name: data.displayName || "WPI Score Updates",
      delivery_mode: data.deliveryMode === "topic" ? "topic" : "bot",
      groupme_group_id: data.groupId || null,
      groupme_group_name: data.groupName || null,
      groupme_topic_id: data.topicId || null,
      groupme_topic_name: data.topicName || null,
      enabled: Boolean(data.enabled),
      last_tested_at: data.lastTestedAt || null,
      last_test_status: data.lastTestStatus || "not_tested",
      last_test_error: data.lastTestError || null,
      updated_at: data.updatedAt || null
    };
  }

  Backend.prototype.prepareGroupMeDestination = async function(teamId, options = {}) {
    const { data, error } = await this.client.rpc("live_prepare_groupme_destination_v3", {
      target_team_id: teamId,
      destination_group_id: options.groupId || null,
      destination_group_name: options.groupName || null,
      destination_topic_id: options.topicId || null,
      destination_topic_name: options.topicName || null
    });
    if (error) throw error;
    this.destination = normalizeDestination(data || {});
    return this.destination;
  };

  Backend.prototype.activateGroupMeDestination = async function(teamId, destinationId) {
    const { data, error } = await this.client.rpc("live_activate_groupme_destination_v3", {
      target_team_id: teamId,
      target_destination_id: destinationId
    });
    if (error) throw error;
    this.destination = normalizeDestination(data || {});
    return this.destination;
  };

  Backend.prototype.pauseGroupMeDestination = async function(teamId, destinationId) {
    const { data, error } = await this.client.rpc("live_pause_groupme_destination_v3", {
      target_team_id: teamId,
      target_destination_id: destinationId
    });
    if (error) throw error;
    this.destination = normalizeDestination(data || {});
    return this.destination;
  };
})();
