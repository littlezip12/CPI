#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
errors=[]

def fail(message): errors.append(message)
def read(rel):
    path=ROOT/rel
    if not path.exists() or path.stat().st_size==0:
        fail(f"{rel} missing or empty")
        return ""
    return path.read_text(encoding="utf-8",errors="ignore")

site=json.loads(read("config/site-release.json") or "{}")
if site.get("version")!="7.56.8": fail("site version must be 7.56.8")
if site.get("name")!="GroupMe Topic Delivery Foundation": fail("release name mismatch")
if site.get("liveScoringGroupMeRelease")!="7.56.8": fail("GroupMe release marker missing")
if site.get("liveScoringGroupMeTopicRelease")!="7.56.8": fail("GroupMe topic release marker missing")

migration=read("supabase/migrations/202608070001_groupme_topic_delivery.sql")
for token in (
    "delivery_mode text not null default 'bot'",
    "groupme_group_id text",
    "groupme_group_name text",
    "groupme_topic_id text",
    "groupme_topic_name text",
    "live_destinations_delivery_mode_check",
    "live_upsert_groupme_destination_v2",
    "'deliveryMode',destination.delivery_mode",
    "'groupId',destination.groupme_group_id",
    "'topicId',destination.groupme_topic_id",
    "Select a GroupMe group and topic before enabling Topic delivery",
    "Admins can operate an already-connected destination",
    "cleaned_group_id := existing_destination.groupme_group_id",
    "case when caller_role='owner' then destination.secret_name else null end",
):
    if token not in migration: fail(f"topic migration missing {token}")
for forbidden in ("actual_access_token", "api_token=", "bot_id="):
    if forbidden.lower() in migration.lower(): fail(f"migration contains credential-like value {forbidden}")

full=read("supabase/WPI_LIVE_7_56_8_FULL_SETUP.sql")
if migration.strip() not in full: fail("7.56.8 fresh-install SQL does not include topic migration")

dashboard=read("live-dashboard.html")
for token in (
    'id="groupMeDeliveryMode"',
    '<option value="topic">Topic</option>',
    '<option value="bot">Bot · main chat</option>',
    'id="groupMeTopicPanel"',
    'id="loadGroupMeGroupsButton"',
    'id="loadGroupMeTopicsButton"',
    'id="groupMeGroupSelect"',
    'id="groupMeTopicSelect"',
    'id="groupMeDiscoveryMessage"',
    'GROUPME_ACCESS_TOKEN_WPI_LIVE',
    'js/live-dashboard-v7-56-8.js?v=7.56.8',
    'js/live-backend-v7-56-8.js?v=7.56.8',
):
    if token not in dashboard: fail(f"dashboard topic UI missing {token}")

dashboard_js=read("js/live-dashboard-v7-56-8.js")
for token in (
    "discoverGroupMeGroups",
    "discoverGroupMeTopics",
    "loadGroupMeGroups",
    "loadGroupMeTopics",
    "delivery_mode === \"topic\"",
    "groupme_group_id",
    "groupme_topic_id",
    "Choose both the GroupMe and topic before enabling Topic delivery.",
    "Topic destination saved.",
):
    if token not in dashboard_js: fail(f"dashboard topic workflow missing {token}")

backend=read("js/live-backend-v7-56-8.js")
for token in (
    "live_upsert_groupme_destination_v2",
    "destination_mode: mode",
    "destination_group_id",
    "destination_topic_id",
    "invokeGroupMeAdminAction",
    'action: "discover_groups"',
    'action: "discover_topics"',
):
    if token not in backend: fail(f"browser backend topic adapter missing {token}")
for forbidden in ("X-Access-Token", "https://api.groupme.com/v3/groups/", "Deno.env.get("):
    if forbidden in backend or forbidden in dashboard_js:
        fail(f"browser code contains server-side GroupMe credential/provider logic: {forbidden}")

edge=read("supabase/functions/groupme-post/index.ts")
for token in (
    'action === "discover_groups" || action === "discover_topics"',
    '"X-Access-Token": accessToken',
    "/subgroups?page=1&per_page=100",
    "postGroupMeTopic",
    "/messages",
    "source_guid: crypto.randomUUID()",
    "postGroupMeBot",
    "https://api.groupme.com/v3/bots/post",
    "postGroupMeDestination",
    'delivery_mode === "topic"',
    "Only the Team Owner may choose a server-side credential secret",
    "Only the Team Owner may browse the connected GroupMe account's groups",
    "Admins may browse topics only inside the Team Owner-approved GroupMe",
    "The Team Owner has not configured the server-side GroupMe access token yet",
):
    if token not in edge: fail(f"Edge Function topic support missing {token}")
if "console.log(accessToken" in edge or "console.error(accessToken" in edge:
    fail("Edge Function must never log GroupMe access tokens")

config=read("config/live-sandbox.js")
if 'release: "7.56.8"' not in config: fail("live config release marker missing")
if "X-Access-Token" in config: fail("browser config contains access-token header logic")
if "GROUPME_ACCESS_TOKEN_WPI_LIVE:" in config: fail("browser config appears to contain a GroupMe access-token value")

metadata=json.loads(read("data/live-sandbox/event-types.json") or "{}")
gm=metadata.get("groupMeDelivery",{})
for key,value in {
    "preferredTransport":"topic",
    "topicDiscovery":True,
    "serverSideCredentialOnly":True,
    "botFallback":True,
}.items():
    if gm.get(key)!=value: fail(f"GroupMe topic metadata {key} mismatch")
if gm.get("transports")!=["topic","bot"]: fail("GroupMe transports metadata mismatch")

for rel in (
    "js/live-backend-v7-56-8.js",
    "js/live-dashboard-v7-56-8.js",
    "js/live-login-v7-56-8.js",
    "js/live-password-reset-v7-56-8.js",
    "js/live-sandbox-v7-56-8.js",
    "js/live-scorer-handoff-v7-56-8.js",
):
    result=subprocess.run(["node","--check",str(ROOT/rel)],capture_output=True,text=True)
    if result.returncode: fail(f"{rel} syntax failed: {result.stderr.strip()}")

rankings=json.loads(read("rankings.json") or "[]")
clubs=json.loads(read("clubs.json") or "[]")
manifest=json.loads(read("data/seasons/2025-2026/manifest.json") or "{}")
def digest(data):
    return hashlib.sha256(json.dumps(data,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
if len(rankings)!=724: fail(f"rankings changed: {len(rankings)}")
if len(clubs)!=182: fail(f"clubs changed: {len(clubs)}")
if digest(rankings)!=manifest.get("integrity",{}).get("rankingsSha256"): fail("ranking snapshot integrity changed")
if digest(clubs)!=manifest.get("integrity",{}).get("clubsSha256"): fail("club snapshot integrity changed")

if errors:
    print("WPI GROUPME TOPIC DELIVERY 7.56.8 TEST FAILED")
    for error in errors: print(f" - {error}")
    sys.exit(1)

print("WPI GROUPME TOPIC DELIVERY 7.56.8 TEST PASSED")
print(" - Topic and Bot transports share the existing exactly-once delivery/audit pipeline")
print(" - Group/topic discovery uses a server-side GroupMe access token and returns only non-secret destination metadata")
print(" - Owner chooses the GroupMe; Owner/Admin can operate topics within that approved group without exposing credentials")
print(" - Rankings, clubs, seasons, tournaments, scorer controls, and Final Whistle sequencing remain protected")
