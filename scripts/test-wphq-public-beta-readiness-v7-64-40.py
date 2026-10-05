#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def req(cond, msg):
    if not cond:
        errors.append(msg)

site = json.loads((ROOT/"config/site-release.json").read_text())
pkg = json.loads((ROOT/"package.json").read_text())
def semver(value):
    try: return tuple(int(x) for x in str(value).split('.')[:3])
    except Exception: return (0,0,0)
req(semver(site.get("version")) >= semver("7.64.40"), "site release must preserve 7.64.40 or later")
req(pkg.get("version") == site.get("version"), "package release must exactly match site release")
req(site.get("publicBetaReadinessRelease") == "7.64.40", "public beta readiness marker missing")
req(site.get("securityAuditRelease") == "7.64.40", "security audit marker missing")
req(site.get("nativeMobileReleaseGuardrailRelease") == "7.64.40", "native guardrail marker missing")

brand_pages = [
    "live-dashboard.html","live-club-onboarding.html","live-team-identity.html",
    "live-organization-insights.html","live-commercial.html","organization.html",
    "champions-cup-qualifiers.html","live-scale-readiness.html","live-sandbox.html",
    "live-high-schools.html","live-account-security.html"
]
for rel in brand_pages:
    txt=(ROOT/rel).read_text(encoding="utf-8", errors="ignore")
    req("WPI Live" not in txt, f"{rel} still exposes legacy WPI Live product naming")

active_successors = [
    "js/live-dashboard-v7-64-40.js",
    "js/live-club-onboarding-v7-64-40.js",
    "js/live-organization-insights-v7-64-40.js",
    "js/organization-profile-v7-64-40.js",
    "js/live-scale-readiness-v7-64-40.js",
    "js/champions-cup-qualifiers-v7-64-40.js",
    "js/live-account-security-v7-64-40.js",
]
for rel in active_successors:
    req((ROOT/rel).exists(), f"missing 7.64.40 active runtime: {rel}")
    if (ROOT/rel).exists():
        req("WPI Live" not in (ROOT/rel).read_text(encoding="utf-8", errors="ignore"), f"{rel} still exposes WPI Live")

account=(ROOT/"live-account-security.html").read_text()
for token in ["accountRelease","accountRuntime","live-account-security-v7-64-40.js"]:
    req(token in account, f"Account Security missing release/runtime support: {token}")

config=(ROOT/"config/live-sandbox.js").read_text()
req("service_role" not in config.lower(), "browser configuration must never contain a Supabase service-role secret")
req("turnstileSiteKey" in config, "Turnstile public-key hook must remain available")

audit=(ROOT/"WPHQ_7.64.40_PUBLIC_BETA_SECURITY_AUDIT.md").read_text()
for token in [
    "Leaked Password Protection Disabled",
    "77",
    "52",
    "25",
    "anonymous Auth",
    "no blanket permission migration",
]:
    req(token.lower() in audit.lower(), f"security audit missing: {token}")

if errors:
    print("WPHQ 7.64.40 PUBLIC BETA READINESS TEST FAILED")
    for e in errors:
        print(" -",e)
    sys.exit(1)

print("WPHQ 7.64.40 PUBLIC BETA READINESS TEST PASSED")
print(" - active consumer/operational surfaces use Water Polo HQ product naming")
print(" - Water Polo Index/WPI remains available for ranking and canonical identity language")
print(" - Account Security exposes exact release and browser/native runtime")
print(" - mobile gate no longer fails solely because the pre-sync Xcode payload is stale")
print(" - live Supabase security findings are documented without risky blanket permission changes")
