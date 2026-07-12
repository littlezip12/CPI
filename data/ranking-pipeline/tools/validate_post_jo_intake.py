#!/usr/bin/env python3
"""Validate normalized CPI post-JO results intake data.

Release: CPI 7.20

This script intentionally uses only the Python standard library.
It validates structure and obvious data issues. It does not publish rankings.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

REQUIRED_COLUMNS = [
    "source_batch_id",
    "group_key",
    "age",
    "gender",
    "division_name",
    "division_tier",
    "raw_team_name",
    "display_team_name",
    "club_key",
    "team_key",
    "team_designation",
    "final_placement",
    "wins",
    "losses",
    "ties",
    "games_played",
    "source_confidence",
    "review_flags",
    "notes",
]

VALID_TIERS = {"D1", "D2", "D3", "Unknown", ""}
VALID_CONFIDENCE = {"high", "medium", "low", "", "unknown"}
DEFAULT_GROUPS = {
    "12u-boys",
    "12u-girls",
    "14u-boys",
    "14u-girls",
    "16u-boys",
    "16u-girls",
    "18u-boys",
    "18u-girls",
}


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def default_intake_path() -> Path:
    return repo_root() / "data" / "ranking-pipeline" / "post-jo" / "input" / "post-jo-results-intake.csv"


def default_json_report_path() -> Path:
    return repo_root() / "data" / "ranking-pipeline" / "post-jo" / "validation" / "post-jo-validation-report.json"


def default_md_report_path() -> Path:
    return repo_root() / "data" / "ranking-pipeline" / "post-jo" / "validation" / "post-jo-validation-report.md"


def load_active_groups() -> set[str]:
    manifest = repo_root() / "data" / "ranking-pipeline" / "post-jo" / "age-gender-groups.json"
    if not manifest.exists():
        return set(DEFAULT_GROUPS)

    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return set(DEFAULT_GROUPS)

    groups: set[str] = set()
    if isinstance(data, dict):
        for key in ("groups", "activeGroups", "rankingGroups"):
            if isinstance(data.get(key), list):
                for item in data[key]:
                    if isinstance(item, str):
                        groups.add(item)
                    elif isinstance(item, dict):
                        value = item.get("groupKey") or item.get("key") or item.get("group_key")
                        if value:
                            groups.add(str(value))
    return groups or set(DEFAULT_GROUPS)


def read_csv(path: Path) -> Tuple[List[str], List[Dict[str, str]]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = list(reader.fieldnames or [])
        rows = [{key: (value or "").strip() for key, value in row.items()} for row in reader]
    return fieldnames, rows


def is_int(value: str) -> bool:
    if value == "":
        return True
    return bool(re.fullmatch(r"-?\d+", value.strip()))


def add_issue(issues: Dict[str, List[Dict[str, Any]]], severity: str, row_number: Optional[int], field: str, message: str) -> None:
    issues[severity].append(
        {
            "rowNumber": row_number,
            "field": field,
            "message": message,
        }
    )


def validate(path: Path) -> Dict[str, Any]:
    report: Dict[str, Any] = {
        "release": "7.20",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "inputPath": str(path),
        "status": "unknown",
        "rowCount": 0,
        "groupCounts": {},
        "divisionCounts": {},
        "sourceConfidenceCounts": {},
        "issues": {"errors": [], "warnings": [], "manualReview": []},
    }

    if not path.exists():
        add_issue(
            report["issues"],
            "errors",
            None,
            "input",
            f"Missing intake file. Copy post-jo-results-intake.template.csv to {path.name} and add results.",
        )
        report["status"] = "failed"
        return report

    fieldnames, rows = read_csv(path)
    report["rowCount"] = len(rows)

    missing_columns = [col for col in REQUIRED_COLUMNS if col not in fieldnames]
    for col in missing_columns:
        add_issue(report["issues"], "errors", None, col, "Required column is missing.")

    if missing_columns:
        report["status"] = "failed"
        return report

    active_groups = load_active_groups()
    group_counts: Counter[str] = Counter()
    division_counts: Counter[str] = Counter()
    confidence_counts: Counter[str] = Counter()
    team_key_counts: Counter[Tuple[str, str]] = Counter()
    name_counts: Counter[Tuple[str, str]] = Counter()

    for idx, row in enumerate(rows, start=2):
        group_key = row.get("group_key", "")
        team_key = row.get("team_key", "")
        display_name = row.get("display_team_name", "")
        final_placement = row.get("final_placement", "")
        division_tier = row.get("division_tier", "")
        confidence = row.get("source_confidence", "").lower()
        review_flags = row.get("review_flags", "")

        group_counts[group_key] += 1
        division_counts[f"{group_key}|{row.get('division_name', '')}|{division_tier}"] += 1
        confidence_counts[confidence or "blank"] += 1

        if group_key and team_key:
            team_key_counts[(group_key, team_key)] += 1
        if group_key and display_name:
            name_counts[(group_key, display_name.lower())] += 1

        if not group_key:
            add_issue(report["issues"], "errors", idx, "group_key", "Group key is blank.")
        elif group_key not in active_groups:
            add_issue(report["issues"], "warnings", idx, "group_key", f"Group key '{group_key}' is not in the active CPI group manifest.")

        if not row.get("source_batch_id", ""):
            add_issue(report["issues"], "warnings", idx, "source_batch_id", "Source batch ID is blank.")

        if not display_name:
            add_issue(report["issues"], "errors", idx, "display_team_name", "Display team name is blank.")

        if not team_key:
            add_issue(report["issues"], "manualReview", idx, "team_key", "Team key is blank; alias normalization is required.")

        if division_tier not in VALID_TIERS:
            add_issue(report["issues"], "warnings", idx, "division_tier", f"Unexpected division tier '{division_tier}'.")

        if confidence not in VALID_CONFIDENCE:
            add_issue(report["issues"], "warnings", idx, "source_confidence", f"Unexpected source confidence '{confidence}'.")

        for numeric_field in ["final_placement", "wins", "losses", "ties", "games_played"]:
            if not is_int(row.get(numeric_field, "")):
                add_issue(report["issues"], "errors", idx, numeric_field, f"Expected integer or blank; found '{row.get(numeric_field, '')}'.")

        if final_placement == "":
            add_issue(report["issues"], "manualReview", idx, "final_placement", "Final placement is blank.")

        if review_flags:
            add_issue(report["issues"], "manualReview", idx, "review_flags", f"Row contains review flags: {review_flags}")

    for (group_key, team_key), count in team_key_counts.items():
        if count > 1:
            add_issue(report["issues"], "manualReview", None, "team_key", f"Duplicate team key in {group_key}: {team_key} appears {count} times.")

    for (group_key, name), count in name_counts.items():
        if count > 1:
            add_issue(report["issues"], "warnings", None, "display_team_name", f"Duplicate display name in {group_key}: {name} appears {count} times.")

    report["groupCounts"] = dict(sorted(group_counts.items()))
    report["divisionCounts"] = dict(sorted(division_counts.items()))
    report["sourceConfidenceCounts"] = dict(sorted(confidence_counts.items()))

    if report["issues"]["errors"]:
        report["status"] = "failed"
    elif report["issues"]["manualReview"] or report["issues"]["warnings"]:
        report["status"] = "passed_with_review_items"
    else:
        report["status"] = "passed"

    return report


def write_reports(report: Dict[str, Any], json_path: Path, md_path: Path) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.parent.mkdir(parents=True, exist_ok=True)

    json_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# CPI Post-JO Intake Validation Report",
        "",
        f"Generated: {report['generatedAt']}",
        f"Status: **{report['status']}**",
        f"Rows: {report['rowCount']}",
        "",
        "## Group counts",
        "",
    ]
    if report["groupCounts"]:
        for group, count in report["groupCounts"].items():
            lines.append(f"- {group}: {count}")
    else:
        lines.append("- None")

    for severity, title in [("errors", "Errors"), ("warnings", "Warnings"), ("manualReview", "Manual review")]:
        lines.extend(["", f"## {title}", ""])
        issues = report["issues"].get(severity, [])
        if not issues:
            lines.append("- None")
            continue
        for issue in issues:
            row_text = f"row {issue['rowNumber']}" if issue.get("rowNumber") else "file"
            lines.append(f"- {row_text} / {issue['field']}: {issue['message']}")

    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate CPI post-JO intake CSV.")
    parser.add_argument("--intake", type=Path, default=default_intake_path(), help="Path to post-jo-results-intake.csv")
    parser.add_argument("--json-report", type=Path, default=default_json_report_path(), help="Path for JSON validation report")
    parser.add_argument("--md-report", type=Path, default=default_md_report_path(), help="Path for Markdown validation report")
    args = parser.parse_args()

    report = validate(args.intake)
    write_reports(report, args.json_report, args.md_report)

    print(f"Validation status: {report['status']}")
    print(f"JSON report: {args.json_report}")
    print(f"Markdown report: {args.md_report}")
    return 1 if report["status"] == "failed" else 0


if __name__ == "__main__":
    raise SystemExit(main())
