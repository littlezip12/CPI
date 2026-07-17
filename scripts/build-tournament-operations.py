#!/usr/bin/env python3
"""Build CPI's universal tournament operations dashboard and alert packet."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
RELEASE = "7.47.0"
REGISTRY = ROOT / "data/tournaments/registry.json"
MANIFEST = ROOT / "data/tournaments/normalized/manifest.json"
HEALTH = ROOT / "data/tournaments/health/index.json"
CONFIG = ROOT / "config/tournament-operations.json"
PUBLIC_CHECKS = ROOT / "data/tournaments/operations/public-checks.json"
OUTPUT_ROOT = ROOT / "data/tournaments/operations"
OUTPUT = OUTPUT_ROOT / "index.json"
RUNTIME = OUTPUT_ROOT / "runtime.js"
ALERTS = OUTPUT_ROOT / "alerts.json"
ISSUE_BODY = OUTPUT_ROOT / "issue-body.md"


def load(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return {} if default is None else default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def check(code: str, severity: str, passed: bool, message: str, detail: str = "") -> dict[str, Any]:
    return {"code": code, "severity": severity, "passed": bool(passed), "message": message, "detail": detail}


def severity_for(checks: list[dict[str, Any]], mode: str) -> str:
    if mode == "historical_registered":
        return "historical"
    failed = [item for item in checks if not item["passed"]]
    if any(item["severity"] == "blocking" for item in failed):
        return "blocking"
    if any(item["severity"] == "warning" for item in failed):
        return "attention"
    return "ready"


def issue_markdown(payload: dict[str, Any]) -> str:
    alerts = payload.get("alerts", [])
    counts = payload.get("counts", {})
    lines = [
        "# CPI tournament operations",
        "",
        f"Generated: **{payload.get('generatedAt', 'unknown')}**",
        "",
        f"- Live divisions: **{counts.get('liveDivisions', 0)}**",
        f"- Ready: **{counts.get('ready', 0)}**",
        f"- Attention: **{counts.get('attention', 0)}**",
        f"- Blocking: **{counts.get('blocking', 0)}**",
        f"- Completed games: **{counts.get('completedGames', 0)}**",
        "",
    ]
    if not alerts:
        lines += ["✅ No live tournament divisions require action.", ""]
    else:
        lines += ["## Action required", ""]
        for alert in alerts:
            icon = "🚨" if alert.get("severity") == "blocking" else "⚠️"
            lines.append(f"- {icon} **{alert.get('eventName')} · {alert.get('divisionLabel')}** — {alert.get('message')}")
        lines.append("")
    lines += [
        "The CPI operations workflow does not blend sources and does not publish ranking changes automatically.",
        "",
        "[Open tournament operations](https://littlezip12.github.io/CPI/tournament-operations.html)",
    ]
    return "\n".join(lines) + "\n"


def main() -> int:
    registry = load(REGISTRY)
    manifest = load(MANIFEST, {"datasets": []})
    health = load(HEALTH, {"sources": []})
    config = load(CONFIG)
    public_checks = load(PUBLIC_CHECKS, {"events": []})
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    datasets = {(item.get("eventId"), item.get("divisionId")): item for item in manifest.get("datasets", [])}
    health_rows = {(item.get("eventId"), item.get("divisionId")): item for item in health.get("sources", [])}
    public_rows = {item.get("eventId"): item for item in public_checks.get("events", [])}
    live_ids = set(config.get("liveEventIds", []))

    divisions: list[dict[str, Any]] = []
    alerts: list[dict[str, Any]] = []
    event_summaries: list[dict[str, Any]] = []

    for event in registry.get("events", []):
        event_id = event.get("id")
        mode = "live" if event_id in live_ids or event.get("syncEnabled") else "historical_registered"
        event_divisions: list[dict[str, Any]] = []
        page = public_rows.get(event_id, {})
        page_ready = page.get("localStatus") == "ready"
        for division in event.get("divisions", []):
            key = (event_id, division.get("id"))
            dataset = datasets.get(key, {})
            health_row = health_rows.get(key, {})
            schedule = dict(health_row.get("schedule") or dataset.get("counts") or {})
            games = int(schedule.get("games") or 0)
            completed = int(schedule.get("completedGames") if "completedGames" in schedule else schedule.get("finalGames") or 0)
            scheduled = int(schedule.get("scheduledGames") or max(0, games - completed))
            partial = int(schedule.get("partialScores") or 0)
            zero_zero = int(schedule.get("zeroZeroPlaceholders") or 0)
            blockers = int(schedule.get("blockers") or 0)
            expected = int(division.get("expectedScheduleGames") or 0)
            source = dict(health_row.get("source") or {})
            health_status = health_row.get("healthStatus") or ("unbanked" if mode == "live" else "registered")
            phase = health_row.get("phase") or ("historical" if mode == "historical_registered" else "unbanked")

            checks: list[dict[str, Any]] = []
            if mode == "live":
                checks.append(check("dataset_banked", "blocking", bool(dataset) and games > 0, "Verified schedule is banked", "No normalized schedule is available."))
                checks.append(check("expected_game_count", "blocking", expected <= 0 or games == expected, "Schedule count matches the verified baseline", f"Expected {expected}, found {games}."))
                checks.append(check("source_status", "blocking", health_status not in {"error", "blocked", "unbanked"}, "Official source is readable or safely cached", f"Source health is {health_status}."))
                checks.append(check("source_freshness", "warning", health_status != "stale", "Source verification is current", source.get("warning") or "Last verified source is stale."))
                checks.append(check("data_blockers", "blocking", blockers == 0, "No blocking data defects", f"{blockers} blocking data defect(s)."))
                checks.append(check("partial_scores", "warning", partial == 0, "No partial scores", f"{partial} game(s) contain only one score."))
                checks.append(check("zero_zero", "warning", zero_zero == 0, "No blank 0–0 placeholders", f"{zero_zero} blank 0–0 placeholder(s)."))
                checks.append(check("public_page", "blocking", page_ready, "Public schedule page is wired", page.get("message") or "Public page is missing or incomplete."))
                if page.get("networkChecked"):
                    checks.append(check("public_network", "warning", page.get("networkStatus") == "ready", "Published page is reachable", page.get("networkMessage") or "Published page could not be verified."))
                checks.append(check("count_reconciles", "blocking", games == scheduled + completed, "Scheduled and completed counts reconcile", f"{games} total != {scheduled} scheduled + {completed} completed."))
            else:
                checks.append(check("registered", "info", True, "Tournament is registered for future onboarding"))
                checks.append(check("public_page", "blocking", page_ready, "Historical results page is wired", page.get("message") or "Historical results page is missing or incomplete."))

            status = severity_for(checks, mode)
            row = {
                "eventId": event_id,
                "eventName": event.get("name"),
                "eventKind": event.get("kind"),
                "eventPublicPath": event.get("publicPath"),
                "monitoringMode": mode,
                "divisionId": division.get("id"),
                "divisionLabel": division.get("label"),
                "ageGroup": division.get("ageGroup"),
                "gender": division.get("gender"),
                "division": division.get("division"),
                "divisionTier": division.get("divisionTier"),
                "operationalStatus": status,
                "phase": phase,
                "schedule": {
                    "expectedGames": expected or None,
                    "games": games,
                    "scheduledGames": scheduled,
                    "completedGames": completed,
                    "partialScores": partial,
                    "zeroZeroPlaceholders": zero_zero,
                    "blockers": blockers,
                    "reviewItems": int(schedule.get("reviewItems") or 0),
                },
                "source": {
                    "provider": source.get("provider") or ("Google Sheets" if division.get("sourceType") == "google_sheets_csv" else division.get("sourceType")),
                    "url": division.get("sourceUrl"),
                    "sheetName": division.get("sheetName"),
                    "mode": source.get("mode") or dataset.get("sourceMode"),
                    "lastSuccessfulAt": source.get("lastSuccessfulAt") or dataset.get("fetchedAt"),
                    "lastAttemptAt": source.get("lastAttemptAt"),
                    "healthStatus": health_status,
                    "warning": source.get("warning"),
                    "error": source.get("error"),
                },
                "publicPage": page,
                "checks": checks,
            }
            event_divisions.append(row)
            divisions.append(row)
            for item in checks:
                if item["passed"] or item["severity"] not in {"blocking", "warning"}:
                    continue
                alerts.append({
                    "eventId": event_id,
                    "eventName": event.get("name"),
                    "divisionId": division.get("id"),
                    "divisionLabel": division.get("label"),
                    "severity": item["severity"],
                    "code": item["code"],
                    "message": item["detail"] or item["message"],
                })

        statuses = [row["operationalStatus"] for row in event_divisions]
        event_summaries.append({
            "eventId": event_id,
            "eventName": event.get("name"),
            "eventKind": event.get("kind"),
            "monitoringMode": mode,
            "publicPath": event.get("publicPath"),
            "divisionCount": len(event_divisions),
            "ready": statuses.count("ready"),
            "attention": statuses.count("attention"),
            "blocking": statuses.count("blocking"),
            "historical": statuses.count("historical"),
            "scheduledGames": sum(row["schedule"]["scheduledGames"] for row in event_divisions),
            "completedGames": sum(row["schedule"]["completedGames"] for row in event_divisions),
        })

    live = [row for row in divisions if row["monitoringMode"] == "live"]
    payload = {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": now,
        "timezone": config.get("timezone"),
        "policy": config.get("policy", {}),
        "counts": {
            "events": len(event_summaries),
            "divisions": len(divisions),
            "liveEvents": sum(item["monitoringMode"] == "live" for item in event_summaries),
            "liveDivisions": len(live),
            "historicalEvents": sum(item["monitoringMode"] == "historical_registered" for item in event_summaries),
            "historicalDivisions": sum(row["monitoringMode"] == "historical_registered" for row in divisions),
            "ready": sum(row["operationalStatus"] == "ready" for row in live),
            "attention": sum(row["operationalStatus"] == "attention" for row in live),
            "blocking": sum(row["operationalStatus"] == "blocking" for row in live),
            "scheduledGames": sum(row["schedule"]["scheduledGames"] for row in live),
            "completedGames": sum(row["schedule"]["completedGames"] for row in live),
            "alerts": len(alerts),
        },
        "events": event_summaries,
        "divisions": divisions,
        "alerts": alerts,
    }
    alert_payload = {
        "schemaVersion": 1,
        "release": RELEASE,
        "generatedAt": now,
        "issueTitle": config.get("incidentIssueTitle"),
        "counts": {
            "total": len(alerts),
            "blocking": sum(item["severity"] == "blocking" for item in alerts),
            "warning": sum(item["severity"] == "warning" for item in alerts),
        },
        "alerts": alerts,
    }
    write_json(OUTPUT, payload)
    write_json(ALERTS, alert_payload)
    RUNTIME.write_text("window.CPI_TOURNAMENT_OPERATIONS = " + json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    ISSUE_BODY.write_text(issue_markdown(payload), encoding="utf-8")
    print("TOURNAMENT OPERATIONS BUILD COMPLETE")
    print(f" - {payload['counts']['events']} events and {payload['counts']['divisions']} registered divisions")
    print(f" - {payload['counts']['liveDivisions']} live JO divisions: {payload['counts']['ready']} ready, {payload['counts']['attention']} attention, {payload['counts']['blocking']} blocking")
    print(f" - {payload['counts']['historicalDivisions']} historical divisions registered for future onboarding")
    print(f" - {len(alerts)} operational alert(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
