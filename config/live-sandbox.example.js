/* WPI 7.57.15 WPI Live pilot configuration example.
 * The Supabase project URL and publishable key are browser-safe only when Row Level Security is enabled.
 * Never place a secret key, service-role key, GroupMe bot ID, GroupMe access token, password, or other secret in this file.
 *
 * Activation:
 *   mode: "connected"
 *   supabaseUrl: "https://YOUR_PROJECT.supabase.co"
 *   supabasePublishableKey: "sb_publishable_..."
 */
window.WPI_LIVE_SANDBOX_CONFIG = Object.freeze({
  release: "7.57.15",
  environment: "pilot",
  mode: "connected",
  supabaseUrl: "",
  supabasePublishableKey: "",
  allowLocalDemo: false,
  autoBootstrapTeam: true,
  defaultTeamName: "Lamorinda A 14U Boys",
  defaultTeamSlug: "lamorinda-a-14u-boys",
  defaultAgeGroup: "14U",
  competitiveSeason: "2026-2027",
  groupMeDelivery: "connected",
  defaultVisibility: "team_private"
});
